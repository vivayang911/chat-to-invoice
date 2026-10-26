import {publicModelConfiguration} from '../src/model-provider.mjs';
import {evaluationChecks} from '../src/evaluation-checks.mjs';
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
  const checks=evaluationChecks(fixture,extracted);
  // Scope exclusions are reviewed manually: mentioning an explicit exclusion is acceptable.
  entry={id:fixture.id,name:fixture.name,synthetic:true,apiRequested:true,status:Object.values(checks).every(Boolean)?'AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED':'REVIEW_REQUIRED',checks,extracted,input:messages,expected:fixture,latencyMs:Date.now()-started,checkedAt:new Date().toISOString()};
 }catch(e){entry={id:fixture.id,name:fixture.name,synthetic:true,apiRequested:true,status:'REQUEST_OR_VALIDATION_FAILED',error:e.message,latencyMs:Date.now()-started,checkedAt:new Date().toISOString()};}
 results.push(entry);await writeFile(new URL(fixture.id+'.json',directory),JSON.stringify(entry,null,2));
 console.log(JSON.stringify({id:entry.id,status:entry.status,checks:entry.checks,error:entry.error,latencyMs:entry.latencyMs}));
}
const complete=results.length===evaluationCases.length;
const allPassed=results.every(x=>x.status==='AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED');
await writeFile(new URL('summary.json',directory),JSON.stringify({runId,pauseMs,model:publicModelConfiguration().model,contract:'ITEMIZED_BILLING_V1',strategy:process.env.ANALYSIS_STRATEGY||'direct',criteria:'final gate, source references, and explicit component coverage; no proof of semantic correctness',releaseGate:complete&&allPassed?'AUTOMATED_GATE_PASSED_MANUAL_REVIEW_REQUIRED':'BLOCKED_OR_INCOMPLETE',completeSuite:complete,results,limitation:'One synthetic run per case. Automated checks do not establish semantic correctness or production accuracy. No invoice or payment requests.'},null,2));
console.log(JSON.stringify({savedDirectory:directory.pathname,total:results.length,automatedPassed:results.filter(x=>x.status==='AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED').length}));

// A diagnostic report is always saved, but a blocked/incomplete gate must fail CI.
if(!complete||!allPassed)process.exitCode=1;
