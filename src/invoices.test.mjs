import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createInvoiceStore,validateDraft,invoiceBody,verifyInvoice} from './invoices.mjs';
import {calculateBilling,attachBilling} from './billing.mjs';
const billingItems=[{id:'B1',description:'One logo, two revisions',status:'ACCEPTED',unitAmount:'100.00',quantity:1,priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']}];
const calculation=calculateBilling(billingItems,{currency:'USD',agreementStatus:'CONFIRMED',modelReportedAmount:'100.00'});
const analysis={agreementStatus:'CONFIRMED',modelAgreementStatus:'CONFIRMED',modelReportedAmount:'100.00',currency:'USD',amount:'100.00',service:calculation.service,pendingIssues:[],billingItems,calculation};
const draft={service:analysis.service,amount:'100.00',recipient:'sb-testing@personal.example.com',reviewed:true,resolved:true,reviewedItemIds:['B1']};
test('retry is allowed only before a creation attempt has been saved',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chat-invoice-'));const directory=pathToFileURL(dir+'/');let requests=0;
 const store=createInvoiceStore({directory,api:async()=>{requests++;throw Error('Response lost');}});
 try{const id=randomUUID();assert.equal(await store.canRetryCreation(id),true);await assert.rejects(store.create(id,{...draft,recipient:'real@example.com'},analysis));assert.equal(await store.canRetryCreation(id),true);assert.equal(requests,0);const pending=store.create(id,draft,analysis);assert.equal(await store.canRetryCreation(id),false);await assert.rejects(pending);assert.equal(await store.canRetryCreation(id),false);assert.equal(requests,1);}finally{await rm(dir,{recursive:true,force:true});}
});
test('reject incomplete review, ambiguous agreement, real recipient and invalid amounts',()=>{
 for(const data of [{...draft,reviewed:false},{...draft,recipient:'buyer@gmail.com'},{...draft,amount:100},{...draft,amount:'-1.00'},{...draft,service:'x'.repeat(1001)}])assert.throws(()=>validateDraft(data,analysis));
 assert.throws(()=>validateDraft(draft,{...analysis,agreementStatus:'NEEDS_CONFIRMATION'}));assert.throws(()=>validateDraft({...draft,resolved:false},{...analysis,pendingIssues:['Extra poster']}));assert.equal(validateDraft(draft,analysis).currency,'USD');
});
test('server rejects a changed total, changed service, missing item reviews and missing ledger',()=>{
 for(const change of [{amount:'0.01'},{amount:'101.00'},{service:'Different work'},{reviewedItemIds:[]},{reviewedItemIds:['B1','B99']}])assert.throws(()=>validateDraft({...draft,...change},analysis));
 assert.throws(()=>validateDraft(draft,{...analysis,calculation:undefined}));
 assert.throws(()=>validateDraft(draft,{...analysis,billingItems:[{...billingItems[0],quantity:null,priceBasis:'UNKNOWN'}]}));
});
test('persist and deduplicate creation across store restarts; require exact send confirmation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chat-invoice-'));const directory=pathToFileURL(dir+'/');let creates=0,sends=0,remote;
 const api=async(path,body)=>{if(path.endsWith('/send')){sends++;remote.status='SENT';return {};}if(body){creates++;remote={id:'INV2-TEST-123',detail:body.detail,primary_recipients:body.primary_recipients,items:body.items,amount:{currency_code:'USD',value:'100.00'},status:'DRAFT'};return {id:remote.id};}return structuredClone(remote);};
 try{let store=createInvoiceStore({directory,api});const id=randomUUID();let saved=await store.create(id,draft,analysis);assert.equal(saved.status,'DRAFT');store=createInvoiceStore({directory,api});await store.create(id,draft,undefined);assert.equal(creates,1);
 await assert.rejects(store.send(id,{sendConfirmed:true,invoiceId:saved.invoiceId,recipient:draft.recipient,amount:'1.00'}));assert.equal(sends,0);
 saved=await store.send(id,{sendConfirmed:true,invoiceId:saved.invoiceId,recipient:draft.recipient,amount:'100.00'});assert.equal(saved.status,'SENT');await store.send(id,{sendConfirmed:true,invoiceId:saved.invoiceId,recipient:draft.recipient,amount:'100.00'});assert.equal(sends,1);
 remote.amount.value='101.00';await assert.rejects(store.status(id),/differs/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('uncertain creation never repeats POST and survives restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chat-invoice-'));const directory=pathToFileURL(dir+'/');let posts=0;const api=async()=>{posts++;throw Error('Lost response');};
 try{const id=randomUUID();await assert.rejects(createInvoiceStore({directory,api}).create(id,draft,analysis));const saved=await createInvoiceStore({directory,api}).create(id,draft,analysis);assert.equal(posts,1);assert.equal(saved.status,'CREATE_UNCERTAIN');}finally{await rm(dir,{recursive:true,force:true});}
});
test('uncertain send is not repeated when PayPal still reports DRAFT',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chat-invoice-'));const directory=pathToFileURL(dir+'/');let remote,sends=0;
 const api=async(path,body)=>{if(path.endsWith('/send')){sends++;throw Error('Lost response');}if(body){remote={id:'INV2-TEST-123',detail:body.detail,primary_recipients:body.primary_recipients,items:body.items,amount:{currency_code:'USD',value:'100.00'},status:'DRAFT'};return remote;}return remote;};
 try{const id=randomUUID(),store=createInvoiceStore({directory,api});const saved=await store.create(id,draft,analysis);const confirmation={sendConfirmed:true,invoiceId:saved.invoiceId,recipient:draft.recipient,amount:'100.00'};await assert.rejects(store.send(id,confirmation));await assert.rejects(store.send(id,confirmation),/already attempted/);assert.equal(sends,1);}finally{await rm(dir,{recursive:true,force:true});}
});
test('status exposes withdrawn confirmation and send remains blocked without any send request',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chat-invoice-'));const directory=pathToFileURL(dir+'/');let remote,sends=0,withdrawn=false;
 const api=async(path,body)=>{if(path.endsWith('/send')){sends++;return {};}if(body){remote={id:'INV2-TEST-STATUS',detail:body.detail,primary_recipients:body.primary_recipients,items:body.items,amount:{currency_code:'USD',value:'100.00'},status:'DRAFT'};return {id:remote.id};}return structuredClone(remote);};
 const store=createInvoiceStore({directory,api,beforeSend:async()=>{if(withdrawn)throw Error('Statement: confirmations changed. Sending is blocked.');}});
 try{const id=randomUUID();const saved=await store.create(id,draft,analysis);assert.equal(saved.sendBlockedReason,null);withdrawn=true;assert.match((await store.status(id)).sendBlockedReason,/confirmations changed/);await assert.rejects(store.send(id,{sendConfirmed:true,invoiceId:saved.invoiceId,recipient:draft.recipient,amount:draft.amount}),/confirmations changed/);assert.equal(sends,0);}finally{await rm(dir,{recursive:true,force:true});}
});


test('checking resolved cannot override unresolved model issues at the financial boundary',()=>{
 assert.throws(()=>validateDraft({...draft,resolved:true},{...analysis,pendingIssues:['Extra poster not agreed.']}),/clarify open issues/);
});


test('PayPal itemization preserves scope, revisions, quantities and one-off extras; rejects equal-total tampering',()=>{
 const rows=[{...billingItems[0]},{...billingItems[0],id:'B2',description:'Three added posters',unitAmount:'50.00',quantity:3,priceBasis:'PER_UNIT'},{...billingItems[0],id:'B3',description:'Added text package, one-off fee',unitAmount:'60.00'}];
 const c=calculateBilling(rows,{currency:'USD',agreementStatus:'CONFIRMED',modelReportedAmount:'310.00'});
 const record={invoiceFormatVersion:2,billingItems:rows,invoiceNumber:'CHAT-ITEMS',invoiceId:'INV2-ITEMS',draft:{...draft,service:c.service,amount:'310.00'}};
 const body=invoiceBody(record);assert.equal(body.items.length,3);assert.equal(body.items[0].description,'One logo, two revisions');assert.equal(body.items[1].quantity,'3');assert.equal(body.items[1].unit_amount.value,'50.00');assert.equal(body.items[2].quantity,'1');
 const remote={...structuredClone(body),id:record.invoiceId,amount:{currency_code:'USD',value:'310.00'}};assert.doesNotThrow(()=>verifyInvoice(remote,record));
 for(const modify of [r=>{r.items[0].unit_amount.value='110.00';r.items[2].unit_amount.value='50.00';},r=>r.items.pop(),r=>r.items.push(structuredClone(r.items[0])),r=>r.items[1].quantity='2',r=>r.items[0].description='One logo, no revisions',r=>r.items[0].name='Different work',r=>r.items[1].quantity='3e0',r=>r.items[1].unit_amount.currency_code='EUR']){const changed=structuredClone(remote);modify(changed);assert.throws(()=>verifyInvoice(changed,record),/differs/);}
 const normalized=structuredClone(remote);normalized.items[1].quantity='3.00000';normalized.items[1].unit_amount.value='50';assert.doesNotThrow(()=>verifyInvoice(normalized,record));
 assert.throws(()=>invoiceBody({...record,draft:{...record.draft,amount:'300.00'}}),/snapshot/);
 const legacy={...record,invoiceFormatVersion:undefined};assert.equal(invoiceBody(legacy).items.length,1);
});

test('changed PayPal line details block send before any send POST',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'itemized-send-'));let remote,sends=0;
 const api=async(path,body)=>{if(path.endsWith('/send')){sends++;return {};}if(body){remote={...structuredClone(body),id:'INV2-LINES',status:'DRAFT',amount:{currency_code:'USD',value:'100.00'}};return {id:remote.id};}return structuredClone(remote);};
 try{const store=createInvoiceStore({directory:pathToFileURL(dir+'/'),api}),id=randomUUID(),saved=await store.create(id,draft,analysis);assert.equal(saved.invoiceFormatVersion,2);remote.items[0].description='Logo with zero revisions';await assert.rejects(store.send(id,{sendConfirmed:true,invoiceId:saved.invoiceId,recipient:draft.recipient,amount:draft.amount}),/differs/);assert.equal(sends,0);}finally{await rm(dir,{recursive:true,force:true});}
});


test('offsetting taxes and discounts cannot hide changes behind an unchanged total',()=>{
 const record={invoiceFormatVersion:2,billingItems,invoiceNumber:'CHAT-ADJUSTMENTS',invoiceId:'INV2-ADJUSTMENTS',draft};
 const remote={...invoiceBody(record),id:record.invoiceId,amount:{currency_code:'USD',value:'100.00'}};
 for(const modify of [r=>{r.items[0].tax={percent:'10',amount:{currency_code:'USD',value:'10.00'}};r.items[0].discount={amount:{currency_code:'USD',value:'10.00'}};},r=>r.amount.breakdown={item_total:{currency_code:'USD',value:'100.00'},shipping:{currency_code:'USD',value:'5.00'},discount:{invoice_discount:{amount:{currency_code:'USD',value:'5.00'}}}},r=>r.items[0].discount={percent:'bogus'}]){const changed=structuredClone(remote);modify(changed);assert.throws(()=>verifyInvoice(changed,record),/differs/);}
 const zero=structuredClone(remote);zero.items[0].discount={percent:'0.00',amount:{currency_code:'USD',value:'0.00'}};zero.amount.breakdown={tax_total:{currency_code:'USD',value:'0.00'}};assert.doesNotThrow(()=>verifyInvoice(zero,record));
});

test('unsupported PayPal unit price is rejected before saving or issuing a creation request',async()=>{
 const rows=[{...billingItems[0],unitAmount:'1000000.01'}],c=calculateBilling(rows,{currency:'USD',agreementStatus:'CONFIRMED',modelReportedAmount:'1000000.01'});
 const a={...analysis,billingItems:rows,calculation:c,amount:c.amount,service:c.service,modelReportedAmount:c.amount},d={...draft,amount:c.amount,service:c.service};
 const dir=await mkdtemp(join(tmpdir(),'invoice-limit-'));let requests=0;
 try{const store=createInvoiceStore({directory:pathToFileURL(dir+'/'),api:async()=>{requests++;}}),id=randomUUID();await assert.rejects(store.create(id,d,a),/unit price exceeds/);assert.equal(requests,0);assert.equal(await store.canRetryCreation(id),true);}finally{await rm(dir,{recursive:true,force:true});}
});


test('audited program arithmetic survives invoice validation, but customer totals and open issues still block',()=>{
 const rows=[{...billingItems[0],id:'B1',description:'Steel cups',quantity:500,unitAmount:'5.00',priceBasis:'PER_UNIT',priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']},{...billingItems[0],id:'B2',description:'Ceramic cups',quantity:100,unitAmount:'8.00',priceBasis:'PER_UNIT',priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']},{...billingItems[0],id:'B3',description:'Logo on every cup',quantity:600,unitAmount:'1.00',priceBasis:'PER_UNIT',priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']}];
 const messages=[{id:'M1',speaker:'seller',text:'Steel USD 5, ceramic USD 8, logo USD 1 each.'},{id:'M2',speaker:'buyer',text:'I accept 500 steel, 100 ceramic, with logos on all 600 cups.'}];
 const raw={agreementStatus:'CONFIRMED',amount:'4400.00',currency:'USD',pendingIssues:[]};const a=attachBilling(raw,rows,messages);assert.equal(a.amount,'3900.00');assert.equal(a.modelReportedAmount,'4400.00');assert.equal(a.calculation.arithmeticCorrection.programTotal,'3900.00');const d={...draft,service:a.service,amount:a.amount,reviewedItemIds:['B1','B2','B3']};assert.equal(validateDraft(d,a).amount,'3900.00');
 const conflict=attachBilling({...raw,explicitTotal:'4400.00'},rows,messages);assert.equal(conflict.amount,null);assert.ok(conflict.calculation.blockers.includes('EXPLICIT_TOTAL_MISMATCH'));assert.equal(conflict.calculation.arithmeticCorrection,undefined);
 const open=attachBilling({...raw,pendingIssues:['Delivery not settled']},rows,messages);assert.equal(open.amount,null);assert.equal(open.calculation.arithmeticCorrection,undefined);
 assert.throws(()=>validateDraft(d,{...a,calculation:{...a.calculation,arithmeticCorrection:{...a.calculation.arithmeticCorrection,programTotal:'4400.00'}}}),/audit/);
});
