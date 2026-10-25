import {renderFeeTable} from './fee-table.mjs';
import {t,language} from './ui-language.mjs';
import {acknowledgeStatement} from './statement-recovery.mjs';
import {statementExpired} from './statement-state.mjs';
const $=id=>document.getElementById(id);
import {sampleSets} from './samples.mjs';
const samples=sampleSets[language];
function renderMessages(){
 const box=$('chatMessages');box.replaceChildren();
 for(const [i,line] of $('chat').value.split('\n').filter(Boolean).entries()){
  const match=/^(seller|buyer):\s*(.*)$/i.exec(line);if(!match)continue;
  const seller=match[1]==='seller';const row=document.createElement('div');row.className='message '+(seller?'seller':'buyer');
  const meta=document.createElement('div');meta.className='messageMeta';meta.textContent=t(`${seller?'You · Seller':'Jordan · Customer'} · M${i+1}`);
  const bubble=document.createElement('div');bubble.className='bubble';bubble.textContent=match[2];
  const edit=document.createElement('button');edit.className='editMessage';edit.textContent=t('Edit');edit.type='button';edit.setAttribute('aria-label',t(`Edit message M${i+1}`));
  edit.addEventListener('click',()=>{const input=document.createElement('textarea');input.value=match[2];input.maxLength=5000;const save=document.createElement('button');save.textContent=t('Save message');save.className='secondary';save.addEventListener('click',()=>{if(invoiceBusy||invoice||statementBusy||savedOperation())return;const value=input.value.trim().replace(/\r?\n/g,' ');if(!value)return;const lines=$('chat').value.split('\n').filter(Boolean);lines[i]=`${match[1]}: ${value}`;const next=lines.join('\n');if(next.length>20000){$('notice').textContent=t('Conversation is limited to 20,000 characters.');return;}$('chat').value=next;$('chat').dispatchEvent(new Event('input'));});bubble.replaceChildren(input,save);edit.hidden=true;});
  const portrait=document.createElement('img');portrait.className='messageAvatar';portrait.src=seller?'/seller-avatar.svg':'/buyer-avatar.svg';portrait.alt=seller?'Seller avatar':'Customer avatar';portrait.width=32;portrait.height=32;
  const body=document.createElement('div');body.className='messageBody';body.append(meta,bubble,edit);row.append(portrait,body);box.append(row);
 }if(statementSnapshot&&!['REVOKED','CHANGES_REQUESTED','UNKNOWN'].includes(statementSnapshot.statement.status)){const card=document.createElement('div');card.className='chatStatement';const title=document.createElement('strong');title.textContent=t('Fee statement ready for customer confirmation');const summary=document.createElement('p');summary.textContent=statementSnapshot.statement.draft.amount+' USD';const link=document.createElement('a');link.href=$('buyerUrl').value;link.target='_blank';link.rel='noopener noreferrer';link.textContent=t('Review and confirm itemized statement');card.append(title,summary,link);box.append(card);}box.scrollTop=box.scrollHeight;
}
$('addMessage').addEventListener('click',()=>{
 const text=$('messageText').value.trim().replace(/\r?\n/g,' ');if(!text){$('messageText').focus();return;}
 const next=[$('chat').value,`${$('speaker').value}: ${text}`].filter(Boolean).join('\n');if(next.length>20000||next.split('\n').length>150){$('notice').textContent=t('Maximum 20,000 characters and 150 messages.');return;}
 $('chat').value=next;$('messageText').value='';$('chat').dispatchEvent(new Event('input'));
});
$('speaker').addEventListener('change',()=>{$('composerAvatar').src=$('speaker').value==='seller'?'/seller-avatar.svg':'/buyer-avatar.svg';$('composerAvatar').alt=$('speaker').value==='seller'?'Seller':'Customer';});
let result=null,previous=null,requestVersion=0,version=0,busy=false;
let confirmedVersion=-1, invoice=null, invoiceBusy=false;
let autoTimer=null,statementSnapshot=null,ledgerSnapshots=[],statementBusy=false,statementActionBusy=false;
const checkpointKey='chatInvoiceStatementSession';
let checkpointReady=false;
function clearCheckpoint(){try{sessionStorage.removeItem(checkpointKey);}catch{}}
function saveCheckpoint(){if(!checkpointReady||!statementSnapshot||!result||savedOperation())return;try{sessionStorage.setItem(checkpointKey,JSON.stringify({schema:1,result,chat:$('chat').value,snapshot:statementSnapshot,buyerUrl:$('buyerUrl').value,reviewed:$('review').checked,resolved:$('resolved').checked}));}catch{$('reviewState').textContent=language==='zh'?'浏览器无法暂存确认单，请保持当前页面打开。':'Browser session storage is unavailable. Keep this page open.';}}
const pendingWithdrawals=new Map();
let withdrawalFlight=null;
function flushWithdrawals(){if(withdrawalFlight)return withdrawalFlight;withdrawalFlight=(async()=>{for(const [id,token] of pendingWithdrawals){await statementApi('act',{id,token,action:'revoke'});if(pendingWithdrawals.get(id)===token)pendingWithdrawals.delete(id);}})().finally(()=>{withdrawalFlight=null;});return withdrawalFlight;}
function queueAnalysis(){clearTimeout(autoTimer);if($('autoTrack').checked&&$('consent').checked&&!invoice)autoTimer=setTimeout(()=>{if(busy){queueAnalysis();return;}$('analyze').click();},1200);}
$('consent').addEventListener('change',()=>{if($('consent').checked)queueAnalysis();else{clearTimeout(autoTimer);requestVersion++;invalidate();result=null;$('result').hidden=true;$('empty').hidden=false;refresh();}});
$('autoTrack').addEventListener('change',()=>{if($('autoTrack').checked)queueAnalysis();else clearTimeout(autoTimer);}); 
function invalidate(){if(checkpointReady)clearCheckpoint();const old=statementSnapshot;statementSnapshot=null;if(old?.token){pendingWithdrawals.set(old.id,old.token);flushWithdrawals().catch(()=>{$('notice').textContent=t('Could not withdraw the old statement. Reconnect before continuing.');});}$('sharedStatement').hidden=true;renderMessages();confirmedVersion=-1;version++;$('review').checked=false;$('resolved').checked=false;$('reviewState').textContent=t('This version is not confirmed. Review again after editing the chat or draft.');}
function refresh(){
  const current=result&&result.chat===$('chat').value;
  const validAmount=/^(?:0|[1-9]\d{0,7})\.\d{2}$/.test($('amount').value)&&Number($('amount').value)>0;
  $('previewService').textContent=t(current?$('service').value||'Service scope needs confirmation':'Awaiting analysis and review');
  renderFeeTable($('previewItems'),current?result.extracted.billingItems||[]:[],t,result?.extracted.currency??null);
  $('previewAmount').textContent=t(current&&validAmount&&result.extracted.currency==='USD'?`$${$('amount').value} USD`:'—');
  $('confirm').disabled=statementBusy||statementActionBusy||Boolean(invoice)||Boolean(savedOperation())||!current||busy||!result?.extracted.calculation?.canInvoice||$('amount').value!==result.extracted.calculation.amount||$('service').value!==result.extracted.calculation.service||!allBillingItemsReviewed()||result.extracted.agreementStatus!=='CONFIRMED'||!$('service').value.trim()||$('service').value.length>1000||!validAmount||result.extracted.currency!=='USD'||!/^sb-[a-z0-9]+@personal\.example\.com$/i.test($('recipient').value.trim())||!$('recipient').checkValidity()||!$('consent').checked||!$('review').checked||(result.extracted.pendingIssues.length&&!$('resolved').checked);
  $('finishChat').disabled=$('confirm').disabled;
  $('createInvoice').disabled=$('confirm').disabled||confirmedVersion!==version||invoiceBusy||Boolean(invoice)||Boolean(savedOperation())||!statementSnapshot||statementSnapshot.statement?.status!=='CONFIRMED'||statementExpired(statementSnapshot.statement);
  $('sendInvoice').disabled=invoiceBusy||!invoice||invoice.status!=='DRAFT'||Boolean(invoice.sendAttemptedAt)||Boolean(invoice.sendBlockedReason)||!$('sendConsent').checked;
  $('refreshInvoice').disabled=invoiceBusy;
  $('queryStatement').disabled=statementActionBusy||!statementSnapshot;
  if(statementSnapshot){const saved=statementSnapshot.statement,expired=statementExpired(saved);$('sellerAccept').disabled=statementActionBusy||Boolean(saved.sellerConfirmedAt)||expired||!['AWAITING_CONFIRMATION','CONFIRMED'].includes(saved.status);if(expired)$('partyState').textContent=t('EXPIRED');}
  const frozen=invoiceBusy||Boolean(invoice)||Boolean(savedOperation())||statementBusy;for(const id of ['sample','speaker','messageText','addMessage','recipient','review','resolved','consent','autoTrack'])$(id).disabled=frozen;for(const button of document.querySelectorAll('.editMessage'))button.disabled=frozen;
  $('analyze').disabled=busy||frozen;
  $('newNegotiation').disabled=invoiceBusy;
  $('counter').textContent=t(`${$('chat').value.length.toLocaleString()} / 20,000`);
  $('serviceMark').textContent=t(result?'Built from included items':'');
  $('amountMark').textContent=t(result?'Program-calculated total':'');
}
function load(){clearTimeout(autoTimer);previous=null;ledgerSnapshots=[];$('ledgerEntries').replaceChildren();$('ledgerHistory').hidden=true;requestVersion++;invalidate();$('chat').value=samples[$('sample').value];renderMessages();result=null;$('result').hidden=true;$('empty').hidden=false;$('notice').textContent=t('Synthetic example loaded. Analysis sends it to Agnes AI.');refresh();}
$('sample').addEventListener('change',load);
$('chat').addEventListener('input',()=>{queueAnalysis();renderMessages();requestVersion++;invalidate();if(result){$('notice').textContent=t('Chat changed. The previous analysis is no longer valid. Analyze again.');$('result').hidden=true;$('empty').hidden=false;}refresh();});
for(const id of ['service','amount','recipient'])$(id).addEventListener('input',()=>{invalidate();refresh();});
for(const id of ['review','resolved'])$(id).addEventListener('change',()=>{const reviewed=$('review').checked,resolved=$('resolved').checked;invalidate();$('review').checked=reviewed;$('resolved').checked=resolved;refresh();});
$('analyze').addEventListener('click',async()=>{
 clearTimeout(autoTimer);if(busy)return;if(!$('consent').checked){$('notice').textContent=t('Please confirm that you have removed personal data and consent to model processing.');return;}
 const chat=$('chat').value,token=++requestVersion;previous=result||previous;result=null;invalidate();busy=true;$('analyze').disabled=true;$('analyze').textContent=t('Analyzing conversation…');$('result').hidden=true;$('empty').hidden=false;$('notice').textContent=t('Waiting for the live model. This may take up to 90 seconds.');refresh();
 try{await flushWithdrawals();const response=await fetch('/api/analyze',{signal:AbortSignal.timeout(100000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat,consent:true,language,strategy:$('analysisMode').value})});const data=await response.json();if(!response.ok)throw Error(data.error);if(token!==requestVersion){$('notice').textContent=t('Chat changed during analysis. This result was discarded. Analyze again.');return;}result={...data,chat};render();$('notice').textContent=t(`Completed · ${(data.latencyMs/1000).toFixed(1)} sec · ${data.model}. Human review required.`);}
 catch(e){result=null;$('result').hidden=true;$('empty').hidden=false;$('notice').textContent=t(token===requestVersion?e.message:'Input changed. Analyze again.');}finally{busy=false;$('analyze').disabled=false;$('analyze').textContent=t('Analyze agreement');refresh();}
});
function render(){renderEventHistory();recordLedgerUpdate();renderBillingItems();renderNegotiationPairs();const e=result.extracted;$('empty').hidden=true;$('result').hidden=false;$('service').value=e.service||'';$('amount').value=e.amount||'';$('currency').value=e.currency||t('Unknown');const blockers=[...(e.currency!=='USD'?['Currency is missing or unsupported. Confirm USD explicitly in the conversation.']:[]),...(!e.amount?['No confirmed billable amount.']:[]),...(!e.service?['No confirmed service scope.']:[])];$('agreement').textContent=t(blockers.length?'Invoice blocked: '+blockers.join(' '):e.agreementStatus==='CONFIRMED'?'Accepted agreement found · Review scope and open issues':'Agreement needs clarification · Preview confirmation is blocked');$('agreement').classList.toggle('warning',e.agreementStatus!=='CONFIRMED'||blockers.length>0);
 $('issues').replaceChildren();for(const issue of e.pendingIssues.length?e.pendingIssues:[t('No open issues reported by the model. Please still review the original chat.')]){const li=document.createElement('li');li.textContent=issue;$('issues').append(li);}$('resolved').parentElement.hidden=true;
 $('evidence').replaceChildren();const labels={amount:t('Amount'),currency:t('Currency'),service:t('Service scope'),agreementStatus:t('Acceptance'),pendingIssues:t('Open issues')};for(const ev of e.evidence){const q=document.createElement('div');q.className='quote';const b=document.createElement('b');b.textContent=t(`${labels[ev.field]} · ${ev.messageId}`);const quoteText=document.createElement('div');quoteText.textContent=ev.quote;q.append(b,quoteText);$('evidence').append(q);}
 const before=previous?.extracted.calculation?.acceptedSubtotal,after=e.calculation?.acceptedSubtotal;$('changes').hidden=!previous;$('changes').textContent=t('Accepted subtotal change')+': '+(before??'—')+' → '+(after??'—')+' USD\n'+t('Pending changes are excluded. Editing the conversation invalidates the final statement.');refresh();}
async function statementApi(action,payload){const response=await fetch('/api/statements/'+action,{signal:AbortSignal.timeout(15000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw Error(data.error||'Statement request failed.');return data;}
function showStatement(statement){
 if(!statementSnapshot||statement.id!==statementSnapshot.id)return;
 statementSnapshot.statement=statement;$('sharedStatement').hidden=false;saveCheckpoint();
 renderFeeTable($('statementItems'),statement.items,t);renderMessages();
 $('statementDetails').textContent=t('Statement version')+' '+statement.version+'\n'+statement.items.map(i=>`${i.description} · ${i.quantity} × ${i.unitAmount} USD`).join('\n')+'\n'+t('Total')+': '+statement.draft.amount+' USD\n'+statement.draft.recipient;
 $('sellerAccept').disabled=Boolean(statement.sellerConfirmedAt)||statement.expired||['REVOKED','CHANGES_REQUESTED'].includes(statement.status);
 $('partyState').textContent=t('Seller')+': '+(statement.sellerConfirmedAt?t('Confirmed'):t('Waiting'))+' · '+t('Customer')+': '+(statement.buyerConfirmedAt?t('Confirmed'):t('Waiting'))+'\n'+t(statement.status)+(statement.feedback?'\n'+statement.feedback:'');refresh();
}
$('finishChat').addEventListener('click',()=>{refresh();if(!$('finishChat').disabled)$('confirm').click();});
$('confirm').addEventListener('click',async()=>{
 refresh();if($('confirm').disabled)return;const requestAt=version,op=result.operationId;const old=statementSnapshot;if(old?.token)pendingWithdrawals.set(old.id,old.token);statementSnapshot=null;confirmedVersion=-1;$('sharedStatement').hidden=true;statementBusy=true;refresh();
 try{await flushWithdrawals();const data=await statementApi('create',{operationId:op,service:$('service').value,amount:$('amount').value,recipient:$('recipient').value.trim(),reviewed:$('review').checked,resolved:$('resolved').checked,reviewedItemIds:reviewedBillingIds()});
 if(version!==requestAt){await statementApi('act',{id:op,token:data.sellerToken,action:'revoke'});return;}
 confirmedVersion=version;statementSnapshot={id:op,token:data.sellerToken,statement:data.statement};
 const link=new URL('/confirm',location.origin);link.searchParams.set('lang',language);link.hash=new URLSearchParams({id:op,token:data.buyerToken}).toString();$('buyerLink').href=link.href;$('buyerUrl').value=link.href;showStatement(data.statement);$('reviewState').textContent=t('Statement saved. Ask the customer to review the separate confirmation page.');
 }catch(e){$('reviewState').textContent=t(e.message);}finally{statementBusy=false;refresh();}
});
async function updateStatement(action){const current=statementSnapshot;if(!current||statementActionBusy)return;statementActionBusy=true;refresh();try{const call=async(method,extra={})=>(await statementApi(method,{id:current.id,token:current.token,...extra})).statement;const outcome=action==='confirm'?await acknowledgeStatement(call,{action:'confirm',fingerprint:current.statement.fingerprint},'seller'):{statement:await call('status')};if(statementSnapshot===current){showStatement(outcome.statement);if(outcome.recovered&&!outcome.actionConfirmed)$('partyState').textContent=t('The response was lost. Latest status retrieved; review it before retrying.');}}catch(e){if(statementSnapshot===current){current.statement={...current.statement,status:'UNKNOWN'};$('partyState').textContent=t(e.message);}}finally{statementActionBusy=false;refresh();}}
$('sellerAccept').addEventListener('click',()=>{if(!$('sellerAccept').disabled)updateStatement('confirm');});
$('queryStatement').addEventListener('click',()=>updateStatement('status'));
setInterval(()=>{if(statementSnapshot&&statementExpired(statementSnapshot.statement))refresh();},1000);


load();
function displayInvoice(saved){
 clearCheckpoint();invoice=saved;const otherStored=storedOperation()&&storedOperation()!==saved.operationId;$('newNegotiation').hidden=Boolean(otherStored)||!['PAID','CANCELLED'].includes(saved.status);$('invoiceArea').hidden=false;$('sendConsent').checked=false;
 if(otherStored){const link=new URL('/',location.origin);link.searchParams.set('operation',storedOperation());link.searchParams.set('lang',language);$('previousInvoiceLink').href=link.href;$('previousInvoiceNotice').hidden=false;}
 $('previewControls').hidden=true;$('invoiceHeading').textContent=t('Saved invoice');
 $('paymentBadge').textContent=t(saved.status);
 $('paymentBadge').classList.toggle('paid',saved.status==='PAID');
 $('savedAmount').textContent=t(`$${saved.draft.amount} USD`);
 const meanings={PAID:'Payment confirmed by PayPal. No further payment is needed.',DRAFT:'Draft created. Review the saved details before sending.',SENT:'Invoice sent. Waiting for the buyer to pay.',CANCELLED:'This invoice was canceled.',PARTIALLY_PAID:'Part of this invoice has been paid. Review the remaining balance in PayPal.'};
 $('paymentMeaning').textContent=t(meanings[saved.status]||'Latest status returned by PayPal. Review the details below.');
 $('sendConsent').parentElement.hidden=saved.status!=='DRAFT';$('sendInvoice').hidden=saved.status!=='DRAFT';
 $('reviewState').textContent=t('A PayPal invoice operation is saved below. Its confirmed snapshot is separate from the editable preview.');
 $('invoiceStatus').textContent=t(`${saved.status} · ${saved.invoiceId||'Invoice ID not yet known'}\n${saved.invoiceNumber||''}${saved.checkedAt?' · Checked '+new Date(saved.checkedAt).toLocaleString(language==='zh'?'zh-CN':'en-US'):''}${saved.message?'\n'+saved.message:''}`);
 if(saved.sendBlockedReason)$('paymentMeaning').textContent=t(saved.sendBlockedReason);
 $('invoiceSnapshot').textContent=t(`Saved snapshot (independent of edits above): ${saved.draft.service} · $${saved.draft.amount} USD · ${saved.draft.recipient}`);
 $('paymentLink').hidden=!saved.paymentUrl||!['SENT','UNPAID','PARTIALLY_PAID','PAYMENT_PENDING'].includes(saved.status);if(saved.paymentUrl)$('paymentLink').href=saved.paymentUrl;
 refresh();
}
async function invoiceRequest(action,payload){
 if(invoiceBusy)return;invoiceBusy=true;refresh();$('invoiceNotice').textContent=t(action==='create'?'Creating a sandbox draft. Do not close or repeat the request.':action==='send'?'Sending the saved sandbox invoice…':'Querying PayPal…');
 try{if(action==='create'||action==='send')await flushWithdrawals();const r=await fetch('/api/invoices/'+action,{signal:AbortSignal.timeout(100000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok){const error=Error(data.error);error.safeToRetryCreation=data.safeToRetryCreation===true;throw error;}displayInvoice(data.invoice);$('invoiceNotice').textContent=t(action==='send'?'Send request completed. The status above comes from PayPal. No payment was initiated by this app.':'Saved invoice status retrieved. No payment initiated.');}
 catch(e){$('invoiceNotice').textContent=t(e instanceof TypeError?'Connection lost. The result is unknown. Query the saved invoice status before retrying.':e.message); // Keep the operation ID even if the network result is uncertain.
  if(!invoice&&e.safeToRetryCreation&&savedOperation()===payload.operationId){
   try{if(storedOperation()===payload.operationId)localStorage.removeItem('chatInvoiceOperation');const url=new URL(location.href);if(url.searchParams.get('operation')===payload.operationId){url.searchParams.delete('operation');history.replaceState(null,'',url);}}catch{}
   $('invoiceArea').hidden=true;$('previewControls').hidden=false;$('invoiceHeading').textContent=t('Invoice preview');invalidate();$('invoiceNotice').textContent=t(e.message+' No creation attempt was saved. Correct the details, analyze again if needed, and review before retrying.');
   const remaining=savedOperation();if(remaining){$('invoiceArea').hidden=false;$('previewControls').hidden=true;setTimeout(()=>invoiceRequest('status',{operationId:remaining}),0);}
  }else if(invoice){displayInvoice({...invoice,status:'STATUS UNKNOWN',checkedAt:null,paymentUrl:null,message:'The last request failed. Query saved status before any retry.'});$('paymentMeaning').textContent=t('Could not verify the saved invoice. Query again before taking any action.');
  }else if(!invoice){$('invoiceArea').hidden=false;$('paymentBadge').textContent=t('STATUS UNKNOWN');$('paymentMeaning').textContent=t('Could not verify the saved invoice. Query again before taking any action.');$('invoiceStatus').textContent=t('Result unknown. Query saved status before any retry.');}
 }finally{invoiceBusy=false;refresh();}
}
function storedOperation(){try{return localStorage.getItem('chatInvoiceOperation');}catch{return null;}}
function savedOperation(){const selected=new URL(location.href).searchParams.get('operation');return selected&&/^[a-f0-9-]{36}$/.test(selected)?selected:storedOperation();}
$('createInvoice').addEventListener('click',()=>{
 refresh();if($('createInvoice').disabled)return;
 const operationId=result.operationId;
 try{localStorage.setItem('chatInvoiceOperation',operationId);}catch{$('invoiceNotice').textContent=t('Browser storage is unavailable. Enable it before creating an invoice.');return;}
 invoiceRequest('create',{operationId,service:$('service').value,amount:$('amount').value,recipient:$('recipient').value.trim(),reviewed:$('review').checked,resolved:$('resolved').checked,reviewedItemIds:reviewedBillingIds(),statementToken:statementSnapshot.token});
});
$('refreshInvoice').addEventListener('click',()=>{const operationId=savedOperation();if(operationId)invoiceRequest('status',{operationId});});
$('sendConsent').addEventListener('change',refresh);
$('sendInvoice').addEventListener('click',()=>{refresh();if($('sendInvoice').disabled)return;invoiceRequest('send',{operationId:invoice.operationId,invoiceId:invoice.invoiceId,recipient:invoice.draft.recipient,amount:invoice.draft.amount,sendConfirmed:true});});
const recoveryId=new URL(location.href).searchParams.get('operation');
if(recoveryId&&/^[a-f0-9-]{36}$/.test(recoveryId)&&!storedOperation()){try{localStorage.setItem('chatInvoiceOperation',recoveryId);}catch{}}
if(savedOperation()){
 $('previewControls').hidden=true;$('invoiceHeading').textContent=t('Saved invoice');$('invoiceArea').hidden=false;$('sendConsent').parentElement.hidden=true;$('sendInvoice').hidden=true;
 $('invoiceStatus').textContent=t('Recovering the saved invoice. No creation, sending or payment will be requested.');$('createInvoice').disabled=true;
 invoiceRequest('status',{operationId:savedOperation()});
}

function renderNegotiationPairs(){
 const box=$('negotiationPairs');box.replaceChildren();const messages=result.messages||[];
 for(let i=0;i<messages.length;i++){
  const message=messages[i];if(message.speaker!=='seller'||!/(?:\d+(?:\.\d+)?\s*(?:USD|美元)|USD\s*\d+)/i.test(message.text))continue;
  const card=document.createElement('div');card.className='quote';
  const label=document.createElement('b');label.textContent=t('Seller quote')+' · '+message.id;
  const source=document.createElement('div');source.textContent=message.text;card.append(label,source);
  const reply=messages[i+1];if(reply?.speaker==='buyer'){const replyLabel=document.createElement('b');replyLabel.textContent=t('Next buyer reply')+' · '+reply.id;const replyText=document.createElement('div');replyText.textContent=reply.text;card.append(replyLabel,replyText);}
  box.append(card);
 }$('negotiationHistory').hidden=!box.childElementCount;
}
function reviewedBillingIds(){return $('review').checked?(result?.extracted.billingItems||[]).filter(i=>i.status==='ACCEPTED').map(i=>i.id):[];}
function allBillingItemsReviewed(){const items=result?.extracted.billingItems?.filter(i=>i.status==='ACCEPTED')||[];const reviewed=reviewedBillingIds();return items.length>0&&items.every(i=>reviewed.includes(i.id));}
function renderBillingItems(){
 const box=$('billingItems');box.replaceChildren();const extracted=result.extracted;
 const items=extracted.billingItems||[],calculation=extracted.calculation,unit=extracted.currency==='USD'?'USD':t('Currency is not confirmed.');
 if(!calculation){$('billingCalculation').textContent=t('Itemized pricing is missing. Analyze again.');return;}
 for(const item of items){
  const card=document.createElement('article');card.className='billingCard';
  const title=document.createElement('strong');title.textContent=item.id+' · '+item.description;
  const state=document.createElement('span');state.className='billingState';state.textContent=t(item.status);
  const arithmetic=document.createElement('p');arithmetic.className='billingMath';
  const line=calculation.lines.find(line=>line.id===item.id);
  arithmetic.textContent=`${item.unitAmount??'?'} ${unit} × ${item.quantity??'?'} = ${line?.amount??'—'} ${unit} · ${t(item.priceBasis)}`;
  const sources=document.createElement('details'),summary=document.createElement('summary');summary.textContent=t('Price, quantity and acceptance sources');sources.append(summary);
  for(const [field,label] of [['priceEvidence','Price source'],['quantityEvidence','Quantity source'],['acceptanceEvidence','Acceptance source']]){
   const heading=document.createElement('b');heading.textContent=t(label);sources.append(heading);
   for(const id of item[field]){const quote=document.createElement('p');quote.textContent=id+' · '+(result.messages?.find(m=>m.id===id)?.text||t('Original chat is not restored.'));sources.append(quote);}
  }
  card.append(title,state,arithmetic,sources);
  if(item.status!=='ACCEPTED'){const excluded=document.createElement('p');excluded.className='muted';excluded.textContent=t('Excluded from the invoice total.');card.append(excluded);}
  box.append(card);
 }
 const reasons={EXPLICIT_TOTAL_MISMATCH:'The calculated total differs from the final total accepted by the customer. Correct the conversation and analyze again.',OPEN_ISSUES:'Open issues remain. Clarify them in the conversation and analyze again before invoicing.',CURRENCY_UNKNOWN:'Currency is not confirmed.',UNCONFIRMED_REQUEST:'The current request is not fully agreed.',PENDING_ITEMS:'Financial items remain pending. Clarify or decline them in the conversation before invoicing.',NO_ACCEPTED_ITEMS:'No accepted billable items.',MODEL_TOTAL_MISMATCH:'The model total differs from the item calculation. Invoicing is blocked.',TOTAL_TOO_LARGE:'The total exceeds the supported range.',SERVICE_TOO_LONG:'The item summary is too long.'};
 $('billingCalculation').textContent=t('Program-calculated accepted subtotal')+': '+(calculation.acceptedSubtotal??'—')+' '+unit+'\n'+(calculation.canInvoice?t('Arithmetic check passed. Human review is still required.'):calculation.blockers.map(code=>t(reasons[code]||'An accepted item has an unknown quantity, price or pricing basis.')).join('\n'));
 $('billingCalculation').classList.toggle('warning',!calculation.canInvoice);
}

function recordLedgerUpdate(){
 const e=result.extracted,amount=e.calculation?.acceptedSubtotal;
 const snapshot={amount,currency:e.currency,items:e.billingItems.map(i=>({description:i.description,status:i.status,quantity:i.quantity,unitAmount:i.unitAmount})),messages:(result.messages||[]).length};
 const prior=ledgerSnapshots.at(-1);if(prior&&JSON.stringify(prior)===JSON.stringify(snapshot))return;
 ledgerSnapshots.push(snapshot);const card=document.createElement('article');card.className='quote';
 const title=document.createElement('b');title.textContent=(prior?t('Change in accepted charges'):t('First ledger snapshot'))+' · M'+snapshot.messages;
 const value=document.createElement('p');let delta='—';if(prior?.amount&&amount&&prior.currency===snapshot.currency&&snapshot.currency==='USD'){const cents=v=>BigInt(v.replace('.',''));const n=cents(amount)-cents(prior.amount),abs=n<0n?-n:n;delta=(n<0n?'−':'+')+(abs/100n)+'.'+String(abs%100n).padStart(2,'0');}
 const unit=snapshot.currency==='USD'?'USD':t('Currency is not confirmed.');value.textContent=(prior?`${prior.amount??'—'} → ${amount??'—'} ${unit} (${delta})`:`${amount??'—'} ${unit}`);
 const detail=document.createElement('details'),label=document.createElement('summary');label.textContent=t('Current items');detail.append(label);
 for(const item of snapshot.items){const line=document.createElement('p');line.textContent=`${item.description} · ${item.quantity??'?'} × ${item.unitAmount??'?'} ${unit} · ${t(item.status)}`;detail.append(line);}
 card.append(title,value,detail);$('ledgerEntries').prepend(card);$('ledgerHistory').hidden=false;
}


$('newNegotiation').addEventListener('click',()=>{
 if(invoiceBusy||!invoice||!['PAID','CANCELLED'].includes(invoice.status)||(storedOperation()&&storedOperation()!==invoice.operationId))return;
 const link=new URL('/',location.origin);link.searchParams.set('operation',invoice.operationId);link.searchParams.set('lang',language);$('previousInvoiceLink').href=link.href;$('previousInvoiceNotice').hidden=false;
 try{localStorage.removeItem('chatInvoiceOperation');}catch{return;}
 const url=new URL(location.href);url.searchParams.delete('operation');history.replaceState(null,'',url);
 invoice=null;statementSnapshot=null;$('invoiceArea').hidden=true;$('previewControls').hidden=false;$('invoiceHeading').textContent=t('Final fee statement');$('recipient').value='';$('invoiceNotice').textContent='';load();
});

$('analysisMode').addEventListener('change',()=>{requestVersion++;previous=result||previous;result=null;invalidate();$('result').hidden=true;$('empty').hidden=false;queueAnalysis();refresh();});
function renderEventHistory(){
 const events=result?.extracted.negotiationEvents||[];$('eventHistory').hidden=!events.length;$('eventEntries').replaceChildren();
 for(const event of events){const card=document.createElement('div');card.className='quote';const label=document.createElement('b');label.textContent=event.messageId+' · '+t({QUOTE:'Price offered',ACCEPT:'Quote accepted',REQUEST:'New request',CHANGE:'Agreement changed',CANCEL:'Canceled',OTHER:'Other message'}[event.kind]||event.kind)+(event.quoteMessageIds.length?' → '+event.quoteMessageIds.join(', '):'');const summary=document.createElement('p');summary.textContent=event.summary;const source=document.createElement('p');source.textContent=result.messages?.find(m=>m.id===event.messageId)?.text||'';card.append(label,summary,source);$('eventEntries').append(card);}
}

// Restore only a generated statement in this tab. Server status remains authoritative.
async function restoreCheckpoint(){
 checkpointReady=true;if(savedOperation()){clearCheckpoint();return;}
 let cached;try{const raw=sessionStorage.getItem(checkpointKey);if(!raw)return;cached=JSON.parse(raw);
 const {snapshot,result:analysis,chat,buyerUrl}=cached,link=new URL(buyerUrl),fragment=new URLSearchParams(link.hash.slice(1));
 if(cached.schema!==1||typeof chat!=='string'||chat.length>20000||analysis?.chat!==chat||analysis?.operationId!==snapshot?.id||!/^[a-f0-9-]{36}$/.test(snapshot.id)||!/^[a-f0-9]{64}$/.test(snapshot.token)||snapshot.statement?.id!==snapshot.id||!analysis.extracted?.calculation||!Array.isArray(analysis.extracted.billingItems)||!Array.isArray(analysis.extracted.evidence)||!Array.isArray(analysis.extracted.pendingIssues)||cached.reviewed!==true||link.origin!==location.origin||link.pathname!=='/confirm'||link.username||link.password||fragment.get('id')!==snapshot.id||!/^[a-f0-9]{64}$/.test(fragment.get('token')))throw Error('Invalid session checkpoint');
 }catch{clearCheckpoint();$('notice').textContent=language==='zh'?'暂存确认单不可用，请重新核对聊天并生成。':'The saved statement session is invalid. Review the conversation again.';return;}
 statementBusy=true;try{
 result=cached.result;$('chat').value=cached.chat;renderMessages();render();$('consent').checked=true;$('review').checked=cached.reviewed;$('resolved').checked=cached.resolved;$('recipient').value=cached.snapshot.statement.draft.recipient;
 confirmedVersion=version;statementSnapshot={...cached.snapshot,statement:{...cached.snapshot.statement,status:'UNKNOWN',sellerConfirmedAt:null,buyerConfirmedAt:null}};
 const link=new URL(cached.buyerUrl);link.searchParams.set('lang',language);$('buyerLink').href=link.href;$('buyerUrl').value=link.href;
 showStatement(statementSnapshot.statement);$('notice').textContent=language==='zh'?'正在核对暂存确认单的服务端状态…':'Checking the saved statement with the server…';
 const {statement}=await statementApi('status',{id:statementSnapshot.id,token:statementSnapshot.token});
 const original=cached.snapshot.statement;
 if(statement.role!=='seller'||statement.fingerprint!==original.fingerprint||statement.version!==original.version||JSON.stringify(statement.draft)!==JSON.stringify(original.draft)||JSON.stringify(statement.items)!==JSON.stringify(original.items)){clearCheckpoint();statementSnapshot=null;confirmedVersion=-1;$('sharedStatement').hidden=true;throw Error(language==='zh'?'确认单版本不匹配，请重新核对。':'The saved statement version does not match. Review again.');}
 showStatement(statement);$('notice').textContent=language==='zh'?'已恢复原确认单并查询最新状态，未代替双方确认或创建账单。':'Statement restored and current status retrieved. No confirmation or invoice was created.';
 }catch(e){$('notice').textContent=(language==='zh'?'暂存确认单尚未核实，请点击查询确认状态。':'The saved statement is unverified. Query its status before continuing. ')+e.message;
 }finally{statementBusy=false;refresh();}
}
restoreCheckpoint();
