import test from 'node:test';import assert from 'node:assert/strict';
import {acceptanceRepairTargets,applyAcceptanceRepair} from './acceptance-evidence.mjs';
import {validateBillingItems} from './billing.mjs';
const messages=[{id:'M1',speaker:'seller',text:'Logo USD 5 each.'},{id:'M2',speaker:'buyer',text:'I accept two logos.'},{id:'M3',speaker:'seller',text:'Confirmed.'}];
const item={id:'B1',description:'Logo',status:'ACCEPTED',quantity:2,unitAmount:'5.00',priceBasis:'PER_UNIT',priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:[]};
test('reference repair changes only missing acceptance references and preserves every billing fact',()=>{
 const targets=acceptanceRepairTargets([item],messages);assert.deepEqual(targets[0].candidateBuyerIds,['M2']);const patched=applyAcceptanceRepair([item],targets,{acceptanceEvidence:{B1:['M2']}});assert.deepEqual({...patched[0],acceptanceEvidence:[]},item);assert.deepEqual(item.acceptanceEvidence,[]);assert.equal(validateBillingItems(patched,messages)[0].quantity,2);
 for(const reply of [{acceptanceEvidence:{B1:['M3']}},{acceptanceEvidence:{B1:['M99']}},{acceptanceEvidence:{B1:[]}},{acceptanceEvidence:{B2:['M2']}},{acceptanceEvidence:{B1:['M2']},amount:'10.00'},{billingItems:[item]}])assert.throws(()=>applyAcceptanceRepair([item],targets,reply));
});
test('repair cannot promote pending rows, use conditional replies or accept a revised price early',()=>{
 assert.deepEqual(acceptanceRepairTargets([{...item,status:'PENDING'}],messages),[]);
 const conditional=messages.map(m=>m.id==='M2'?{...m,text:'I accept only if delivery is included.'}:m);assert.deepEqual(acceptanceRepairTargets([item],conditional)[0].candidateBuyerIds,[]);
 const revised=[...messages,{id:'M4',speaker:'seller',text:'New quote USD 7.'}];assert.deepEqual(acceptanceRepairTargets([{...item,unitAmount:'7.00',priceEvidence:['M4']}],revised)[0].candidateBuyerIds,[]);
 const alternatives=[{id:'M1',speaker:'seller',text:'Logo USD 5 or package USD 8.'},{id:'M2',speaker:'buyer',text:'Okay.'}];const patched=applyAcceptanceRepair([item],acceptanceRepairTargets([item],alternatives),{acceptanceEvidence:{B1:['M2']}});assert.throws(()=>validateBillingItems(patched,alternatives),/ambiguous acknowledgement/);
});
