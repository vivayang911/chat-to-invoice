// Synthetic data only. Sequential calls to the production model adapter; no PayPal imports.
import {mkdir,writeFile} from 'node:fs/promises';
import {analyze,parseChat} from '../src/analysis.mjs';
import {evaluationCases} from '../src/evaluation-cases.mjs';
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const directory=new URL(`../work/evaluation-${runId}/`,import.meta.url);
await mkdir(directory,{recursive:true});
const results=[];
// Pace sequential acceptance calls to avoid a burst against a shared provider quota.
const pauseMs=Number(process.env.MODEL_EVAL_PAUSE_MS??3000);
if(!Number.isInteger(pauseMs)||pauseMs<0||pauseMs>30000)throw Error('MODEL_EVAL_PAUSE_MS must be an integer between 0 and 30000.');
const selected=process.argv.slice(2);if(selected.some(id=>!evaluationCases.some(x=>x.id===id)))throw Error('Unknown evaluation case ID.');for(const fixture of evaluationCases.filter(x=>!selected.length||selected.includes(x.id))){
 if(results.length&&pauseMs)await new Promise(resolve=>setTimeout(resolve,pauseMs));
 const started=Date.now();let entry;
 try{
  const messages=parseChat(fixture.chat),extracted=await analyze(messages,{language:fixture.language||'en',strategy:process.env.ANALYSIS_STRATEGY||'direct',onResponse:raw=>writeFile(new URL(fixture.id+'-'+raw.stage+'-response.json',directory),JSON.stringify(raw,null,2))});
  const expected=fixture.billingExpected||fixture;
  const checks={amount:extracted.amount===expected.amount,status:extracted.agreementStatus===(expected.status||fixture.status),currency:extracted.currency===fixture.currency,pending:fixture.pendingOptional===true||(extracted.pendingIssues.length>0)===fixture.pending,itemizedCalculation:extracted.calculation?.version===1,invoiceGate:extracted.calculation?.canInvoice===expected.canInvoice};
  if(fixture.revisions)checks.revisions=/(?:two|2)\s+revision/i.test(extracted.service||'');
  if(fixture.intermediateAcceptance)checks.intermediateAcceptanceCited=extracted.evidence.some(e=>e.messageId==='M5')||extracted.billingItems.some(item=>item.acceptanceEvidence.includes('M5'));
  if(fixture.excludeUnacceptedText)checks.noUnacceptedTextInService=!/文字|text|characters/i.test(extracted.service||'')||/不含|不包括|未包含|不包含|除外|未计入|待确认|excluding/i.test(extracted.service||'');
  if(fixture.requiredPriceEvidence)checks.contributingPricesCited=fixture.requiredPriceEvidence.every(ids=>extracted.evidence.some(e=>e.field==='amount'&&ids.includes(e.messageId))||extracted.billingItems.some(item=>item.status==='ACCEPTED'&&item.priceEvidence.some(id=>ids.includes(id))));
  if(fixture.requiredComponents)for(const component of fixture.requiredComponents)checks['component_'+component.name]=extracted.billingItems.some(item=>new RegExp(component.pattern,'i').test(item.description)&&item.unitAmount===component.unitAmount);
  if(fixture.id==='E09')checks.noCollectibleItems=extracted.amount===null&&extracted.service===null&&!extracted.billingItems.some(i=>i.status==='ACCEPTED');
  if(['E13','E14'].includes(fixture.id)){
   const accepted=extracted.billingItems.filter(item=>item.status==='ACCEPTED');
   checks.exactSettledComponents=accepted.length===3&&[['logo',1,'100.00'],['poster|海报',fixture.id==='E13'?3:1,'50.00'],['text|characters|文字|文本|字符',1,'60.00']].every(([pattern,quantity,price])=>accepted.some(item=>new RegExp(pattern,'i').test(item.description)&&item.quantity===quantity&&item.unitAmount===price));
  }
  if(fixture.id==='E12')checks.correctIntermediateStates=extracted.billingItems.some(i=>/poster|海报/i.test(i.description)&&i.status==='ACCEPTED'&&i.acceptanceEvidence.includes('M5'))&&extracted.billingItems.some(i=>/text|characters|文字|文本|字符/i.test(i.description)&&i.status==='PENDING');
  if(fixture.id==='E11')checks.changedPosterStillPending=extracted.billingItems.some(i=>/poster|海报/i.test(i.description)&&i.status==='PENDING');
  if(fixture.acceptedLineAmounts)checks.exactAcceptedLines=JSON.stringify(extracted.calculation.lines.map(line=>line.amount).sort())===JSON.stringify([...fixture.acceptedLineAmounts].sort());
  // Scope exclusions are reviewed manually: mentioning an explicit exclusion is acceptable.
  entry={id:fixture.id,name:fixture.name,synthetic:true,apiRequested:true,status:Object.values(checks).every(Boolean)?'AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED':'REVIEW_REQUIRED',checks,extracted,input:messages,expected:fixture,latencyMs:Date.now()-started,checkedAt:new Date().toISOString()};
 }catch(e){entry={id:fixture.id,name:fixture.name,synthetic:true,apiRequested:true,status:'REQUEST_OR_VALIDATION_FAILED',error:e.message,latencyMs:Date.now()-started,checkedAt:new Date().toISOString()};}
 results.push(entry);await writeFile(new URL(fixture.id+'.json',directory),JSON.stringify(entry,null,2));
 console.log(JSON.stringify({id:entry.id,status:entry.status,checks:entry.checks,error:entry.error,latencyMs:entry.latencyMs}));
}
const complete=results.length===evaluationCases.length;
const allPassed=results.every(x=>x.status==='AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED');
await writeFile(new URL('summary.json',directory),JSON.stringify({runId,pauseMs,model:'agnes-3.0-flash',contract:'ITEMIZED_BILLING_V1',strategy:process.env.ANALYSIS_STRATEGY||'direct',criteria:'final gate, source references, and explicit component coverage; no proof of semantic correctness',releaseGate:complete&&allPassed?'AUTOMATED_GATE_PASSED_MANUAL_REVIEW_REQUIRED':'BLOCKED_OR_INCOMPLETE',completeSuite:complete,results,limitation:'One synthetic run per case. Automated checks do not establish semantic correctness or production accuracy. No invoice or payment requests.'},null,2));
console.log(JSON.stringify({savedDirectory:directory.pathname,total:results.length,automatedPassed:results.filter(x=>x.status==='AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED').length}));

// A diagnostic report is always saved, but a blocked/incomplete gate must fail CI.
if(!complete||!allPassed)process.exitCode=1;
