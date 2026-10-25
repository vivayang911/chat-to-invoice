// Local comparison only. Production routing is unchanged. Synthetic fixtures only.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as quotaWait} from 'node:timers/promises';
import {analyze,parseChat} from '../src/analysis.mjs';
import {evaluationCases} from '../src/evaluation-cases.mjs';
import {evaluationChecks} from '../src/evaluation-checks.mjs';
async function keyFrom(file,name){try{const text=await readFile(new URL('../work/'+file,import.meta.url),'utf8');const line=text.split(/\r?\n/).find(s=>s.trim().startsWith(name+'='));return line?line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,''):null;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
const providers=[{id:'agnes',model:'agnes-3.0-flash',url:'https://apihub.agnes-ai.com/v1/chat/completions',key:await keyFrom('agnes-model.env','AGNES_API_KEY')},{id:'glm',model:'glm-4.7-flash',url:'https://open.bigmodel.cn/api/paas/v4/chat/completions',key:await keyFrom('ai-model.env','ZHIPU_API_KEY')},{id:'groq',model:'qwen/qwen3.8-27b',url:'https://api.groq.com/openai/v1/chat/completions',key:await keyFrom('groq-model.env','GROQ_API_KEY'),casePauseMs:1000}];
const args=process.argv.slice(2),providerOption=args.find(a=>a.startsWith('--provider=')),selectedProvider=providerOption?.split('=')[1];if(selectedProvider&&!providers.some(p=>p.id===selectedProvider))throw Error('Unknown provider');const ids=args.filter(a=>!a.startsWith('--provider='));if(ids.some(id=>!evaluationCases.some(c=>c.id===id)))throw Error('Unknown case');
const cases=(ids.length?ids:['E07','E11','E19','E20']).map(id=>evaluationCases.find(c=>c.id===id));
const runId=new Date().toISOString().replace(/[:.]/g,'-'),directory=new URL('../work/model-comparison-'+runId+'/',import.meta.url);await mkdir(directory,{recursive:true});
const realFetch=globalThis.fetch,originalKey=process.env.AGNES_API_KEY,results=[];
try{for(const provider of providers.filter(p=>!selectedProvider||p.id===selectedProvider)){if(!provider.key||provider.key.startsWith('replace_')){results.push({provider:provider.id,model:provider.model,status:'KEY_NOT_CONFIGURED'});continue;}
 let rateLimited=false,nextRequestAt=0;
 for(const fixture of cases){if(rateLimited){results.push({provider:provider.id,model:provider.model,caseId:fixture.id,status:'SKIPPED_AFTER_RATE_LIMIT'});continue;}
 let requests=0,stages=[],returnedModels=[],httpDiagnostics=[];const started=Date.now();
 globalThis.fetch=async(url,options)=>{
  if(String(url)!=='https://apihub.agnes-ai.com/v1/chat/completions')throw Error('COMPARISON_ENDPOINT_NOT_ALLOWED');
  if(provider.id==='groq'&&nextRequestAt>Date.now())await quotaWait(nextRequestAt-Date.now(),undefined,{signal:options.signal});
  requests++;const body=JSON.parse(options.body);body.model=provider.model;
  if(provider.id==='glm'){delete body.chat_template_kwargs;body.thinking={type:'disabled'};}
  if(provider.id==='groq'){delete body.chat_template_kwargs;body.reasoning_effort='none';}
  const response=await realFetch(provider.url,{...options,redirect:'error',headers:{...options.headers,Authorization:'Bearer '+provider.key},body:JSON.stringify(body)});
  const quotaHeaders={};for(const name of ['retry-after','x-ratelimit-limit-requests','x-ratelimit-limit-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens','x-ratelimit-reset-requests','x-ratelimit-reset-tokens']){const value=response.headers.get(name);if(value&&/^[a-zA-Z0-9., :+-]+$/.test(value))quotaHeaders[name]=value.slice(0,100);}
  if(!response.ok){let errorData;try{errorData=await response.clone().json();}catch{}const message=String(errorData?.error?.message||'');httpDiagnostics.push({request:requests,httpStatus:response.status,quotaHeaders,errorCode:String(errorData?.error?.code||'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80),quotaType:/tokens per day|TPD/i.test(message)?'TOKENS_PER_DAY':/tokens per minute|TPM/i.test(message)?'TOKENS_PER_MINUTE':/requests per minute|RPM/i.test(message)?'REQUESTS_PER_MINUTE':'UNDETERMINED'});return response;}
  httpDiagnostics.push({request:requests,httpStatus:response.status,quotaHeaders});
  if(provider.id==='groq'){const reset=quotaHeaders['x-ratelimit-reset-tokens']||'';const parts=[...reset.matchAll(/([0-9.]+)(ms|h|m|s)/g)];const milliseconds=parts.reduce((sum,m)=>sum+Number(m[1])*({ms:1,s:1000,m:60000,h:3600000}[m[2]]),0);if(milliseconds>0&&milliseconds<=60000)nextRequestAt=Date.now()+milliseconds+1000;}
  const data=await response.json();if(data.model){returnedModels.push(data.model);if(data.model!==provider.model)throw Error('MODEL_ROUTING_MISMATCH');}
  return {ok:response.ok,status:response.status,headers:response.headers,body:response.body,json:async()=>data};
 };
 process.env.AGNES_API_KEY='local-comparison-routing-only';let record;
 try{const messages=parseChat(fixture.chat),extracted=await analyze(messages,{language:fixture.language||'en',strategy:'direct',onResponse:async raw=>{stages.push(raw.stage);await writeFile(new URL(provider.id+'-'+fixture.id+'-'+raw.stage+'.json',directory),JSON.stringify(raw,null,2));}});const checks=evaluationChecks(fixture,extracted);record={provider:provider.id,model:provider.model,caseId:fixture.id,status:Object.values(checks).every(Boolean)?'AUTOMATED_CHECKS_PASSED_REVIEW_REQUIRED':'REVIEW_REQUIRED',checks,extracted};}
 catch(error){record={provider:provider.id,model:provider.model,caseId:fixture.id,status:'REQUEST_OR_VALIDATION_FAILED',error:error.message};if(/HTTP 429/.test(error.message))rateLimited=true;}
 record={...record,latencyMs:Date.now()-started,requests,stages,httpDiagnostics,firstResponseOnly:requests===1,returnedModels};results.push(record);await writeFile(new URL(provider.id+'-'+fixture.id+'.json',directory),JSON.stringify(record,null,2));console.log(JSON.stringify({provider:provider.id,model:provider.model,caseId:fixture.id,status:record.status,error:record.error,latencyMs:record.latencyMs,requests,stages}));if(fixture!==cases.at(-1)&&!rateLimited)await new Promise(r=>setTimeout(r,provider.casePauseMs??3000));
 }
}}finally{globalThis.fetch=realFetch;if(originalKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=originalKey;}
const summary={runId,caseIds:cases.map(c=>c.id),samePromptAndValidator:true,productionModelChanged:false,realPayPalCalls:0,results,limitation:'One sample per authored case; pipeline comparison, not an accuracy benchmark. Provider-specific thinking-disabled controls differ. Only configured selected providers were called; production routing remains unchanged. Groq requests wait for the returned token-reset interval (up to 60 seconds), with a one-second minimum case gap. Reported latency includes quota waits.'};
await writeFile(new URL('summary.json',directory),JSON.stringify(summary,null,2));console.log(JSON.stringify({savedDirectory:directory.pathname,results:results.map(({provider,caseId,status,latencyMs,requests})=>({provider,caseId,status,latencyMs,requests}))}));
