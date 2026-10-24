import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {calculateBilling,toCents} from './billing.mjs';
export const sandbox='https://api-m.sandbox.paypal.com';
export function validateDraft(data,analysis){
 if(!analysis||analysis.agreementStatus!=='CONFIRMED'||analysis.currency!=='USD')throw Error('Invoice: analyze a confirmed USD agreement first.');
 if(data.reviewed!==true||!Array.isArray(analysis.pendingIssues)||analysis.pendingIssues.length)throw Error('Invoice: clarify open issues in the conversation and analyze again before invoicing.');
 if(!Array.isArray(analysis.billingItems)||analysis.calculation?.version!==1)throw Error('Invoice: itemized pricing is required. Analyze again.');
 const verified=calculateBilling(analysis.billingItems,{currency:analysis.currency,agreementStatus:analysis.modelAgreementStatus,modelReportedAmount:analysis.modelReportedAmount,pendingIssues:analysis.pendingIssues,explicitTotal:analysis.explicitTotal??null});
 if(!verified.canInvoice||verified.amount!==analysis.amount||data.amount!==verified.amount||data.service!==verified.service)throw Error('Invoice: the draft does not match the independently calculated items.');
 const requiredIds=analysis.billingItems.filter(i=>i.status==='ACCEPTED').map(i=>i.id);
 if(!Array.isArray(data.reviewedItemIds)||data.reviewedItemIds.length!==requiredIds.length||new Set(data.reviewedItemIds).size!==requiredIds.length||!requiredIds.every(id=>data.reviewedItemIds.includes(id)))throw Error('Invoice: review every included item before creating an invoice.');
 if(typeof data.service!=='string'||!data.service.trim()||data.service.length>1000)throw Error('Invoice: service must contain 1–1,000 characters.');
 if(typeof data.amount!=='string'||! /^(?:0|[1-9]\d{0,7})\.\d{2}$/.test(data.amount)||Number(data.amount)<=0)throw Error('Invoice: enter a positive USD amount with two decimal places.');
 // Only sandbox-generated personal accounts. Never accept an arbitrary real address.
 if(typeof data.recipient!=='string'||!/^sb-[a-z0-9]+@personal\.example\.com$/i.test(data.recipient))throw Error('Invoice: use a generated sandbox personal account (sb-…@personal.example.com).');
 return {service:data.service.trim(),amount:data.amount,currency:'USD',recipient:data.recipient.toLowerCase()};
}
export function invoiceBody(record){return {detail:{invoice_number:record.invoiceNumber,currency_code:'USD',note:'Synthetic sandbox demonstration only. No real service or funds.',payment_term:{term_type:'DUE_ON_RECEIPT'}},primary_recipients:[{billing_info:{email_address:record.draft.recipient}}],items:[{name:'Design service',description:record.draft.service,quantity:'1',unit_amount:{currency_code:'USD',value:record.draft.amount}}],configuration:{allow_tip:false,partial_payment:{allow_partial_payment:false}}};}
export async function paypalApi(path,body){
 const id=process.env.PAYPAL_CLIENT_ID?.trim(),secret=process.env.PAYPAL_CLIENT_SECRET?.trim();
 if(!id||!secret)throw Error('Invoice: PayPal sandbox credentials are not configured. Restart with both env files.');
 const auth=await fetch(sandbox+'/v1/oauth2/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
 if(!auth.ok){await auth.body?.cancel();throw Error(`Invoice: sandbox authentication failed (HTTP ${auth.status}).`);}
 const token=await auth.json();if(!token.access_token)throw Error('Invoice: sandbox authentication returned no token.');
 const r=await fetch(sandbox+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
 const text=await r.text();let data;try{data=text?JSON.parse(text):{};}catch{throw Error('Invoice: unreadable PayPal response. Query status before retrying.');}
 if(!r.ok){const name=String(data.name||'API_ERROR').replace(/[^A-Z0-9_]/g,'').slice(0,60);throw Error(`Invoice: PayPal HTTP ${r.status} (${name}). Query status before retrying.`);}
 return data;
}
export function verifyInvoice(remote,record){
 const d=record.draft,items=remote.items;
 const equalMoney=value=>{if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value))return false;const [whole,fraction='']=value.split('.');return toCents(whole+'.'+fraction.padEnd(2,'0'))===toCents(d.amount);};
 if(remote.id!==record.invoiceId||remote.detail?.invoice_number!==record.invoiceNumber||remote.amount?.currency_code!=='USD'||!equalMoney(remote.amount?.value)||remote.primary_recipients?.length!==1||remote.primary_recipients[0]?.billing_info?.email_address?.toLowerCase()!==d.recipient||(remote.additional_recipients?.length||0)>0||items?.length!==1||items[0].description!==d.service||Number(items[0].quantity)!==1||items[0].unit_amount?.currency_code!=='USD'||!equalMoney(items[0].unit_amount?.value)||remote.configuration?.allow_tip===true||remote.configuration?.partial_payment?.allow_partial_payment===true)throw Error('Invoice: remote invoice differs from the confirmed snapshot. Sending is blocked.');
}
export function createInvoiceStore({directory=new URL('../work/app-invoices/',import.meta.url),api=paypalApi,beforeSend=async()=>{}}={}){
 const locks=new Set();
 const file=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invoice: invalid operation ID.');return new URL(id+'.json',directory);};
 const load=async id=>{try{return JSON.parse(await readFile(file(id),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const save=async r=>{const target=file(r.operationId),temp=new URL(r.operationId+'.tmp',directory);await writeFile(temp,JSON.stringify(r,null,2));await rename(temp,target);};
 async function exclusive(id,fn){if(locks.has(id))throw Error('Invoice: an operation is already running. Please wait.');locks.add(id);try{return await fn();}finally{locks.delete(id);}}
 async function query(r){
  if(!r.invoiceId)return {...r,status:'CREATE_UNCERTAIN',message:'Creation was attempted but no invoice ID was saved. Do not create again. Reconcile invoice number in the merchant dashboard.'};
  const remote=await api('/v2/invoicing/invoices/'+r.invoiceId);verifyInvoice(remote,r);r.status=remote.status;r.checkedAt=new Date().toISOString();r.sendBlockedReason=null;if(r.status==='DRAFT')try{await beforeSend(r);}catch(e){r.sendBlockedReason=e.message?.startsWith('Statement:')?e.message:'Statement: confirmation could not be verified. Sending is blocked.';}
  const href=remote.detail?.metadata?.recipient_view_url||remote.links?.find(x=>x.rel==='payer-view')?.href;
  r.paymentUrl=null;if(href){const u=new URL(href);if(u.protocol==='https:'&&u.hostname==='www.sandbox.paypal.com'&&!u.username&&!u.password)r.paymentUrl=u.href;}
  await save(r);return r;
 }
 return {
  async canRetryCreation(id){if(locks.has(id))return false;return (await load(id))===null;},
  create(id,draft,analysis){return exclusive(id,async()=>{const old=await load(id);if(old)return query(old);const normalized=validateDraft(draft,analysis);await mkdir(directory,{recursive:true});const r={operationId:id,environment:'SANDBOX',invoiceNumber:'CHAT-'+randomUUID().replaceAll('-','').slice(0,16),draft:normalized,billingVersion:1,explicitTotal:analysis.explicitTotal??null,billingItems:analysis.billingItems,calculation:analysis.calculation,reviewedItemIds:draft.reviewedItemIds,statementConfirmation:draft.statementConfirmation?{...draft.statementConfirmation,recordedAt:new Date().toISOString()}:null,manualEdits:{service:false,amount:false},status:'CREATE_UNCERTAIN',createdAt:new Date().toISOString()};await writeFile(file(id),JSON.stringify(r,null,2),{flag:'wx'});
   const remote=await api('/v2/invoicing/invoices',invoiceBody(r));let invoiceId=remote.id;if(!invoiceId){const href=remote.href||remote.links?.find(x=>x.rel==='self')?.href;if(href){const u=new URL(href);if(u.origin===sandbox&&/^\/v2\/invoicing\/invoices\/INV2-[A-Z0-9-]+$/.test(u.pathname))invoiceId=u.pathname.split('/').at(-1);}}
   if(!/^INV2-[A-Z0-9-]+$/.test(invoiceId||''))throw Error('Invoice: creation result is uncertain. Do not retry creation; reconcile in the merchant dashboard.');r.invoiceId=invoiceId;await save(r);return query(r);
  });},
  status(id){return exclusive(id,async()=>{const r=await load(id);if(!r)throw Error('Invoice: no saved operation found.');return query(r);});},
  send(id,confirmation){return exclusive(id,async()=>{let r=await load(id);if(!r?.invoiceId)throw Error('Invoice: create and verify a draft first.');if(confirmation.sendConfirmed!==true||confirmation.invoiceId!==r.invoiceId||confirmation.recipient!==r.draft.recipient||confirmation.amount!==r.draft.amount)throw Error('Invoice: confirm the exact saved invoice, recipient and amount before sending.');r=await query(r);if(r.status!=='DRAFT')return r;await beforeSend(r);if(r.billingVersion!==1)throw Error('Invoice: this older draft has no itemized review. Sending is blocked.');const recalculated=calculateBilling(r.billingItems,{currency:'USD',agreementStatus:'CONFIRMED',modelReportedAmount:r.draft.amount,explicitTotal:r.explicitTotal??null});if(!recalculated.canInvoice||recalculated.amount!==r.draft.amount||recalculated.service!==r.draft.service)throw Error('Invoice: the draft does not match the independently calculated items.');if(r.sendAttemptedAt)throw Error('Invoice: a send was already attempted. Query status or reconcile in the merchant dashboard; automatic retry is blocked.');r.sendAttemptedAt=new Date().toISOString();await save(r);await api('/v2/invoicing/invoices/'+r.invoiceId+'/send',{send_to_recipient:true,send_to_invoicer:false});return query(r);});}
 };
}
