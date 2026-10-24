import {test} from 'node:test';import assert from 'node:assert/strict';import {parseChat} from './analysis.mjs';import {explicitBuyerTotal,uncoveredFinancialTail} from './source-coverage.mjs';
test('latest explicitly accepted total is source bound and never inferred from older negotiation',()=>{
 const chat=parseChat('seller: Video USD 80.\nbuyer: I accept USD 6.75 extra, total USD 86.75.');assert.equal(explicitBuyerTotal(chat).amount,'86.75');assert.equal(explicitBuyerTotal(chat).messageId,'M2');
 assert.equal(explicitBuyerTotal([...chat,{id:'M3',speaker:'buyer',text:'Actually, change the order.'}]),null);
 assert.equal(explicitBuyerTotal([{id:'M1',speaker:'buyer',text:'I accept only if the total USD 86.75 includes delivery.'}]),null);
 assert.equal(explicitBuyerTotal([{id:'M1',speaker:'buyer',text:'我接受总价310USD。'}]).amount,'310.00');
});
test('a truncated ledger cannot silently ignore later financial messages',()=>{
 const messages=parseChat('seller: Video USD 80.\nbuyer: I accept.\nseller: A caption costs USD 6.75.\nbuyer: I accept it, total USD 86.75.');
 const result={billingItems:[{priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M2']}],evidence:[]};assert.deepEqual(uncoveredFinancialTail(result,messages),['M3','M4']);
 assert.deepEqual(uncoveredFinancialTail({...result,evidence:[{messageId:'M4'}]},messages),[]);
});
