// Isolated HTTP simulation. No live model or PayPal calls.
const {chromium}=require('./browser-runtime.cjs')();
(async()=>{
 const {createApp}=await import('../src/server.mjs');let calls=0;
 const app=createApp({port:4198,analyzeChat:async()=>{calls++;throw Error('Unexpected analysis');},invoices:{}});
 await new Promise(r=>app.listen(4198,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();await page.route('**/api/model',route=>route.abort('failed'));
  await page.goto('http://127.0.0.1:4198/?lang=zh&sample=EMPTY');await page.waitForFunction(()=>document.getElementById('modelProvider').textContent.includes('无法确认'));
  await page.selectOption('#sample','E01');if(!await page.locator('#consent').isDisabled())throw Error('Refresh enabled unverified provider consent');
  await page.click('#analyze');if(calls)throw Error('Unverified provider caused a model request');
  await page.unroute('**/api/model');await page.reload();await page.waitForFunction(()=>!document.getElementById('consent').disabled);
  const metadata=await (await page.request.get('http://127.0.0.1:4198/api/model')).json();if(Object.hasOwn(metadata,'key')||Object.hasOwn(metadata,'endpoint'))throw Error('Metadata exposed private configuration');
  if(!(await page.locator('#modelProvider').innerText()).includes(metadata.model))throw Error('Displayed provider differs from server');
  console.log(JSON.stringify({unavailableProviderBlocksConsent:true,refreshDoesNotBypass:true,metadataContainsNoKeys:true,displayMatchesServer:true,realModelCalls:calls,realPayPalCalls:0}));
 }finally{await browser.close();await new Promise(r=>app.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
