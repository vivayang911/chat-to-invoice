// Synthetic live-model UI acceptance; payment endpoints are deliberately unavailable.
const {chromium}=require('./browser-runtime.cjs')();
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 if(process.env.MODEL_PROVIDER!=='groq')throw Error('Select Groq explicitly for this live acceptance.');
 const {createApp}=await import('../src/server.mjs'),{createStatementStore}=await import('../src/statements.mjs'),{evaluationCases}=await import('../src/evaluation-cases.mjs');
 const fixture=evaluationCases.find(c=>c.id==='E19'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'groq-web-'));
 let paymentAttempts=0;const invoices={create:async()=>{paymentAttempts++;throw Error('Invoice: payment writes disabled in live model UI acceptance.');},send:async()=>{paymentAttempts++;throw Error('Invoice: sending disabled.');},status:async()=>{throw Error('Invoice: no saved operation found.');},canRetryCreation:async()=>true};
 const app=createApp({port:4199,statements:createStatementStore({directory:pathToFileURL(directory+path.sep)}),invoices});await new Promise(r=>app.listen(4199,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}),errors=[];let report;
 try{
  const sellerContext=await browser.newContext(),buyerContext=await browser.newContext(),seller=await sellerContext.newPage(),buyer=await buyerContext.newPage();for(const page of [seller,buyer])page.on('pageerror',e=>errors.push(e.message));
  await seller.goto('http://127.0.0.1:4199/?lang=zh&sample=EMPTY');await seller.waitForFunction(()=>!document.getElementById('consent').disabled);
  if(!(await seller.locator('#modelProvider').innerText()).includes('qwen/qwen3.8-27b'))throw Error('Groq provider not displayed');
  await seller.uncheck('#autoTrack');
  for(const line of fixture.chat.split('\n')){const match=/^(seller|buyer):\s*(.*)$/.exec(line);await seller.selectOption('#speaker',match[1]);await seller.fill('#messageText',match[2]);await seller.click('#addMessage');}
  await seller.check('#consent');const analyzed=seller.waitForResponse(r=>r.url().endsWith('/api/analyze'),{timeout:105000});await seller.click('#analyze');const response=await analyzed,result=await response.json();
  if(!response.ok()||result.model!=='qwen/qwen3.8-27b'||result.extracted.amount!=='12.00'||!result.extracted.calculation.canInvoice)throw Error('Live model failed expected cup ledger: '+(result.error||result.extracted?.amount));
  await seller.waitForFunction(()=>!document.getElementById('result').hidden);
  await seller.fill('#recipient','sb-liveuitest@personal.example.com');await seller.check('#review');await seller.click('#finishChat');await seller.waitForFunction(()=>!document.getElementById('sharedStatement').hidden);
  if(await seller.locator('#createInvoice').isEnabled())throw Error('Unconfirmed statement allowed invoice');
  if(await seller.locator('#statementItems tbody tr').count()!==3)throw Error('Statement lost priced components');
  await seller.click('#sellerAccept');await seller.waitForFunction(()=>!document.getElementById('queryStatement').disabled);if(await seller.locator('#createInvoice').isEnabled())throw Error('Seller alone unlocked invoice');
  await buyer.goto(await seller.locator('#buyerUrl').inputValue());await buyer.waitForFunction(()=>!document.getElementById('customerStatement').hidden);
  if(await buyer.locator('#customerItems tbody tr').count()!==3)throw Error('Customer lost components');await buyer.check('#customerReview');await buyer.click('#customerConfirm');await buyer.waitForFunction(()=>document.getElementById('customerConfirm').disabled);await seller.click('#queryStatement');await seller.waitForFunction(()=>!document.getElementById('createInvoice').disabled);
  await fs.mkdir('evidence',{recursive:true});await seller.screenshot({path:'evidence/groq-live-seller-confirmed-20261026.png',fullPage:true});
  await buyer.locator('details summary').click();await buyer.fill('#changeRequest','Please change the quantity.');await buyer.click('#requestChange');await buyer.waitForFunction(()=>!document.getElementById('reloadStatement').disabled);await seller.click('#queryStatement');await seller.waitForFunction(()=>document.getElementById('createInvoice').disabled);
  if(paymentAttempts||errors.length)throw Error('Unexpected payment call or browser error');
  report={date:'2026-10-26',mode:'LIVE_GROQ_SYNTHETIC_UI_NO_PAYPAL',model:result.model,caseId:fixture.id,amount:result.extracted.amount,latencyMs:result.latencyMs,items:result.extracted.billingItems,checks:{chineseBlankChat:true,providerDisplayed:true,threePricedComponents:true,sellerAloneBlocked:true,bothConfirmationsUnlock:true,customerChangeBlocks:true},paymentAttempts,realPayPalCalls:0,errors};
  await fs.writeFile('work/groq-live-ui-20261026.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,items:undefined}));
 }finally{await browser.close();await new Promise(r=>app.close(r));if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('groq-web-'))throw Error('Unexpected cleanup directory');await fs.rm(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

