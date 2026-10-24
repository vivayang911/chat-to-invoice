import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createInvoiceStore,validateDraft,invoiceBody,verifyInvoice} from './invoices.mjs';
import {calculateBilling} from './billing.mjs';
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
