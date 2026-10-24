const {createRequire}=require('node:module');
const path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const req=createRequire(path.join(process.env.CODEX_NODE_MODULES||'C:/Users/P15v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright/package.json'));
const {chromium}=require('./browser-runtime.cjs')();
(async()=>{
 const {createApp}=await import('../src/server.mjs'),{createStatementStore}=await import('../src/statements.mjs'),{createInvoiceStore}=await import('../src/invoices.mjs');
 const fixture=JSON.parse(await fs.readFile('src/fixtures/E01.json','utf8'));
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'invoice-acceptance-')),port=4192;
 let remote,creates=0,sends=0,reads=0,app;const errors=[];
 const api=async(url,body)=>{
  if(url.endsWith('/send')){sends++;remote.status='SENT';return {};}
  if(body){creates++;remote={id:'INV2-LOCAL-ACCEPTANCE',...structuredClone(body),status:'DRAFT',amount:{currency_code:'USD',value:'100.00'}};return {id:remote.id};}
  reads++;return structuredClone(remote);
 };
 const start=async()=>{const statements=createStatementStore({directory:pathToFileURL(path.join(dir,'statements')+path.sep)}),invoices=createInvoiceStore({directory:pathToFileURL(path.join(dir,'invoices')+path.sep),api,beforeSend:r=>statements.verifySavedInvoice(r)});app=createApp({port,statements,invoices,analyzeChat:async()=>structuredClone(fixture.billingResult)});await new Promise(r=>app.listen(port,'127.0.0.1',r));};
 await start();const browser=await chromium.launch({headless:true});try{
  const sellerContext=await browser.newContext(),buyerContext=await browser.newContext(),seller=await sellerContext.newPage(),buyer=await buyerContext.newPage();for(const p of [seller,buyer])p.on('pageerror',e=>errors.push(e.message));
  await seller.goto(`http://127.0.0.1:${port}/`);if(await seller.locator('html').getAttribute('lang')!=='en'||await seller.locator('#uiLanguage').inputValue()!=='en')throw Error('Submission first visit is not English');await seller.uncheck('#autoTrack');await seller.check('#consent');await seller.click('#analyze');await seller.waitForFunction(()=>!document.getElementById('result').hidden);
  await seller.fill('#recipient','sb-testing@personal.example.com');await seller.check('#review');await seller.click('#confirm');await seller.waitForFunction(()=>!document.getElementById('sharedStatement').hidden);
  if(await seller.locator('#createInvoice').isEnabled())throw Error('Unconfirmed statement allowed creation');
  await seller.click('#sellerAccept');await seller.waitForFunction(()=>!document.getElementById('queryStatement').disabled);if(await seller.locator('#createInvoice').isEnabled())throw Error('Seller alone allowed creation');
  await buyer.goto(await seller.locator('#buyerUrl').inputValue());await buyer.waitForFunction(()=>!document.getElementById('customerStatement').hidden);await buyer.check('#customerReview');await buyer.click('#customerConfirm');await buyer.waitForFunction(()=>document.getElementById('customerConfirm').disabled);
  await new Promise(r=>app.close(r));await start();await seller.reload();await seller.waitForFunction(()=>!document.getElementById('createInvoice').disabled);
  await seller.click('#createInvoice');await seller.waitForFunction(()=>document.getElementById('paymentBadge').textContent==='DRAFT');if(creates!==1||sends!==0)throw Error('Draft created/sent unexpectedly');
  await seller.reload();await seller.waitForFunction(()=>document.getElementById('paymentBadge').textContent==='DRAFT');if(creates!==1||await seller.locator('#sendInvoice').isEnabled())throw Error('Reload duplicated draft or skipped consent');
  await seller.check('#sendConsent');await seller.click('#sendInvoice');await seller.waitForFunction(()=>document.getElementById('paymentBadge').textContent==='SENT');if(sends!==1)throw Error('Send count mismatch');
  // Simulated external provider state only. No hosted payment or real API request.
  remote.status='PAID';await seller.click('#refreshInvoice');await seller.waitForFunction(()=>document.getElementById('paymentBadge').textContent==='PAID');await seller.reload();await seller.waitForFunction(()=>document.getElementById('paymentBadge').textContent==='PAID');
  await seller.setViewportSize({width:390,height:844});if(await seller.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
  if(creates!==1||sends!==1||errors.length)throw Error(JSON.stringify({creates,sends,errors}));
  console.log(JSON.stringify({mode:'ISOLATED_PROVIDER_SIMULATION',defaultEnglishVerified:true,model:'SAVED_SYNTHETIC_FIXTURE',separateBrowserContexts:true,serverRestartBeforeCreation:true,statementRecovery:true,draftRecovery:true,separateSendConsent:true,paidQueryAndReload:true,mobileNoOverflow:true,creates,sends,reads,realModelCalls:0,realPayPalCalls:0,errors},null,2));
 }finally{await browser.close();await new Promise(r=>app.close(r));await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
