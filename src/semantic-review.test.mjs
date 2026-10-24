import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze,parseChat} from './analysis.mjs';
const messages=parseChat('seller: Retouch one photo for USD 20.\nbuyer: Okay. What about adding a background?\nseller: A background adds USD 5.');
const photo={id:'B1',description:'One retouched photo',status:'PENDING',quantity:1,unitAmount:'20.00',priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:[]};
const extra={id:'B2',description:'Background',status:'PENDING',quantity:1,unitAmount:'5.00',priceBasis:'ONE_OFF',priceEvidence:['M3'],quantityEvidence:['M3'],acceptanceEvidence:[]};
const initial={billingItems:[photo,extra],agreementStatus:'NEEDS_CONFIRMATION',amount:null,currency:'USD',service:null,pendingIssues:['The additional background has not been accepted.'],evidence:[{field:'agreementStatus',messageId:'M3'},{field:'currency',messageId:'M1'},{field:'pendingIssues',messageId:'M3'}]};
const corrected={...initial,billingItems:[{...photo,status:'ACCEPTED',acceptanceEvidence:['M2']},extra],service:'One retouched photo',evidence:[...initial.evidence,{field:'service',messageId:'M1'}]};
test('one source-bound semantic review may restore a missed acknowledgement but not authorize a pending extra',async()=>{
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{for(const mode of ['correct','unchanged','invented-price']){let calls=0;globalThis.fetch=async()=>{calls++;const response=calls===1?initial:mode==='unchanged'?initial:mode==='invented-price'?{...corrected,billingItems:[{...corrected.billingItems[0],unitAmount:'900.00'},extra]}:corrected;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(response)}}]})};};
 if(mode==='correct'){const result=await analyze(messages);assert.equal(result.calculation.acceptedSubtotal,'20.00');assert.equal(result.amount,null);assert.equal(result.billingItems[1].status,'PENDING');assert.equal(result.requestDiagnostics.semanticReviewRequested,true);}else await assert.rejects(analyze(messages));assert.equal(calls,2);}
 }finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('one full source re-extraction can recover malformed JSON or missing structure, with normal price checks intact',async()=>{
 const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{for(const mode of ['bad-json','missing-items','still-invalid']){let calls=0;globalThis.fetch=async()=>{calls++;const first=mode==='bad-json'?'{':JSON.stringify({...fixture.billingResult,billingItems:undefined});const content=calls===1?first:mode==='still-invalid'?first:JSON.stringify(fixture.billingResult);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content}}]})};};
 if(mode==='still-invalid')await assert.rejects(analyze(fixture.messages));else{const result=await analyze(fixture.messages);assert.equal(result.amount,'100.00');assert.equal(result.requestDiagnostics.semanticReviewRequested,true);}assert.equal(calls,2);}
 }finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});
test('lossless decimal padding retains quoted value; numeric and excessive precision amounts remain rejected',async()=>{
 const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{for(const price of ['100',100,'100.001']){const raw={...fixture.billingResult,billingItems:fixture.billingResult.billingItems.map(i=>({...i,unitAmount:price}))};globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})});if(typeof price==='string'&&price==='100'){const result=await analyze(fixture.messages);assert.equal(result.amount,'100.00');assert.ok(result.formatCorrections.some(c=>c.includes('decimal string padded')));}else await assert.rejects(analyze(fixture.messages));}
 }finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('a model-confirmed amount cannot bypass an unsupported final customer total',async()=>{
 const messages=parseChat('seller: One logo costs USD 100.\nbuyer: I accept total USD 1e3.');
 const raw={agreementStatus:'CONFIRMED',amount:'100.00',currency:'USD',service:'One logo',pendingIssues:[],billingItems:[{id:'B1',description:'One logo',status:'ACCEPTED',quantity:1,unitAmount:'100.00',priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M2']}],evidence:['agreementStatus','amount','currency','service'].map(field=>({field,messageId:field==='agreementStatus'?'M2':'M1'}))};
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})});const result=await analyze(messages);assert.equal(result.amount,null);assert.equal(result.calculation.canInvoice,false);assert.ok(result.safetyCorrections.includes('UNRESOLVED_EXPLICIT_TOTAL'));assert.ok(result.evidence.some(e=>e.field==='pendingIssues'&&e.quote===messages[1].text));}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});
