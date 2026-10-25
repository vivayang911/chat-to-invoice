// Minimal Groq probe. No chat data, provider keys or payment requests in output.
import {writeFile} from 'node:fs/promises';
const started=Date.now(),model='qwen/qwen3.8-27b';
try{
 const key=process.env.GROQ_API_KEY?.trim();if(!key||key.startsWith('replace_'))throw Error('KEY_NOT_CONFIGURED');
 const headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const list=await fetch('https://api.groq.com/openai/v1/models',{headers,redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!list.ok)throw Error('MODEL_LIST_HTTP_'+list.status);
 const data=await list.json();if(!data.data?.some(m=>m.id===model)){console.log(JSON.stringify({status:'MODEL_NOT_AVAILABLE',requestedModel:model,availableTextCandidates:data.data?.map(m=>m.id).filter(id=>/qwen|llama|gpt-oss/.test(id))}));process.exitCode=1;}else{
 const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(30000),body:JSON.stringify({model,reasoning_effort:'none',temperature:0,max_tokens:128,messages:[{role:'user',content:'Reply with exactly API_OK and nothing else.'}]})});
 const result=await response.json();const report={status:response.ok&&result.choices?.[0]?.message?.content?.trim()==='API_OK'?'MODEL_CHECK_SUCCESS':'MODEL_CHECK_FAILED',httpStatus:response.status,requestedModel:model,returnedModel:result.model,expectedReplyMatched:result.choices?.[0]?.message?.content?.trim()==='API_OK',errorCode:response.ok?undefined:String(result.error?.code||'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g,''),latencyMs:Date.now()-started};await writeFile('work/groq-model-check-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.status!=='MODEL_CHECK_SUCCESS')process.exitCode=1;
 }
}catch(e){console.log(JSON.stringify({status:'MODEL_CHECK_FAILED',errorType:e.name,errorCode:/^[A-Z_]+(?:\d+)?$/.test(e.message)?e.message:'NETWORK_OR_RESPONSE_ERROR',latencyMs:Date.now()-started}));process.exitCode=1;}
