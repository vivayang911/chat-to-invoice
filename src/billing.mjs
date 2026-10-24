const fail=message=>{throw Error('The billing check failed: '+message);};
export function toCents(value){
 if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,7})\.\d{2}$/.test(value))fail('invalid decimal amount');
 return BigInt(value.replace('.',''));
}
export function fromCents(value){return `${value/100n}.${String(value%100n).padStart(2,'0')}`;}
// Read a complete numeric token, never a prefix of a negative, exponent,
// malformed grouping or over-precision decimal. Only normalize clear formats.
export function quotedAmounts(text){
 const tokens=text.match(/[+\-−]?\s*(?:\d[\d,.]*|\.\d+)(?:[eE][+\-]?\d+)?/g)||[];
 return tokens.flatMap(token=>{
  let value=token.trim().replace(/^[+]\s*/,'').replace(/[,.]$/,'');
  if(!/^(?:(?:0|[1-9]\d*)|(?:[1-9]\d{0,2}(?:,\d{3})+))(?:\.\d{1,2})?$/.test(value))return [];
  value=value.replaceAll(',','');const [whole,fraction='']=value.split('.');
  return whole.length<=8?[whole+'.'+fraction.padEnd(2,'0')]:[];
 });
}
// Format-only compatibility for non-billable rows. Never promote a pending item,
// change a price/quantity, invent a source, or relax accepted-item validation.
export function normalizeNonBillableShape(items){
 const corrections=[];
 if(!Array.isArray(items))return {items,corrections};
 const normalized=items.map(item=>{
  if(!item||!['PENDING','CANCELLED'].includes(item.status))return item;
  const copy={...item};
  if(copy.priceBasis===null){copy.priceBasis='UNKNOWN';corrections.push(item.id+': priceBasis null → UNKNOWN');}
  for(const field of ['priceEvidence','quantityEvidence','acceptanceEvidence'])if(copy[field]===null){copy[field]=[];corrections.push(item.id+': '+field+' null → []');}
  return copy;
 });
 return {items:normalized,corrections};
}
export function validateBillingItems(items,messages){
 if(!Array.isArray(items)||items.length>12)fail('itemized pricing is required');
 const ids=new Set();
 return items.map(item=>{
  if(!item||!/^B[1-9]\d?$/.test(item.id)||ids.has(item.id))fail('invalid or duplicate item ID');ids.add(item.id);
  if(typeof item.description!=='string'||!item.description.trim()||item.description.length>200)fail('invalid item description');
  if(!['ACCEPTED','PENDING','CANCELLED'].includes(item.status))fail('invalid item state');
  if(!['PER_UNIT','ONE_OFF','UNKNOWN'].includes(item.priceBasis))fail('unknown pricing basis must be explicit');
  if(item.quantity!==null&&(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>9999))fail('invalid quantity');
  if(item.unitAmount!==null&&toCents(item.unitAmount)<=0n)fail('unit price must be positive');
  for(const field of ['priceEvidence','quantityEvidence','acceptanceEvidence']){
   if(!Array.isArray(item[field])||item[field].length>20||!item[field].every(id=>typeof id==='string'&&messages.some(m=>m.id===id)))fail('unknown source message');
  }
  let matchingPriceIds=[];
  if(item.unitAmount!==null){
   if(!item.priceEvidence.length)fail('price needs original evidence');
   matchingPriceIds=item.priceEvidence.filter(id=>quotedAmounts(messages.find(m=>m.id===id).text).some(n=>toCents(n)===toCents(item.unitAmount)));
   if(!matchingPriceIds.length)fail('quoted unit price is not present in its cited source');
  }
  if(item.status==='ACCEPTED'&&(!item.acceptanceEvidence.length||!item.acceptanceEvidence.every(id=>messages.find(m=>m.id===id).speaker==='buyer')))fail('accepted item needs buyer evidence');
  if(item.status==='ACCEPTED'&&item.unitAmount!==null&&!item.acceptanceEvidence.some(id=>{
   const accepted=messages.findIndex(m=>m.id===id&&m.speaker==='buyer');
   return accepted>=0&&matchingPriceIds.some(source=>messages.findIndex(m=>m.id===source)<=accepted);
  }))fail('buyer acceptance predates the cited price');
  if(item.status==='ACCEPTED'&&item.quantity!==null&&!item.quantityEvidence.length)fail('quantity needs evidence');
  if(item.priceBasis==='ONE_OFF'&&item.quantity!==null&&item.quantity!==1)fail('a one-off fee must have quantity one');
  return {id:item.id,description:item.description.trim(),status:item.status,quantity:item.quantity,unitAmount:item.unitAmount,priceBasis:item.priceBasis,priceEvidence:[...new Set(item.priceEvidence)],quantityEvidence:[...new Set(item.quantityEvidence)],acceptanceEvidence:[...new Set(item.acceptanceEvidence)]};
 });
}
export function calculateBilling(items,{currency,agreementStatus,modelReportedAmount,pendingIssues=[],explicitTotal=null}){
 if(!Array.isArray(items)||new Set(items.map(i=>i.id)).size!==items.length)fail('duplicate calculation items');
 for(const item of items){
  if(item.quantity!==null&&(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>9999))fail('invalid calculation quantity');
  if(item.unitAmount!==null&&toCents(item.unitAmount)<=0n)fail('invalid calculation unit price');
  if(!['ONE_OFF','PER_UNIT','UNKNOWN'].includes(item.priceBasis))fail('invalid calculation pricing basis');
  if(item.priceBasis==='ONE_OFF'&&item.quantity!==null&&item.quantity!==1)fail('one-off fee cannot be multiplied');
 }
 let total=0n;const blockers=[];const accepted=items.filter(i=>i.status==='ACCEPTED');const lines=[];
 if(currency!=='USD')blockers.push('CURRENCY_UNKNOWN');
 if(!Array.isArray(pendingIssues)||pendingIssues.length)blockers.push('OPEN_ISSUES');
 if(agreementStatus!=='CONFIRMED')blockers.push('UNCONFIRMED_REQUEST');
 if(items.some(i=>i.status==='PENDING'))blockers.push('PENDING_ITEMS');
 if(!accepted.length)blockers.push('NO_ACCEPTED_ITEMS');
 for(const item of accepted){
  if(item.quantity===null||item.unitAmount===null||item.priceBasis==='UNKNOWN'){blockers.push('UNRESOLVED_ITEM:'+item.id);lines.push({id:item.id,amount:null});continue;}
  const amount=toCents(item.unitAmount)*BigInt(item.quantity);total+=amount;lines.push({id:item.id,amount:fromCents(amount)});
 }
 if(total>9999999999n)blockers.push('TOTAL_TOO_LARGE');
 const complete=!blockers.some(x=>x.startsWith('UNRESOLVED_ITEM:'));
 const candidate=complete&&accepted.length?fromCents(total):null;
 if(agreementStatus==='CONFIRMED'&&candidate!==null&&modelReportedAmount!==null&&candidate!==modelReportedAmount)blockers.push('MODEL_TOTAL_MISMATCH');
 if(explicitTotal!==null&&candidate!==null&&toCents(explicitTotal)!==toCents(candidate))blockers.push('EXPLICIT_TOTAL_MISMATCH');
 const service=accepted.map(i=>`${i.description} × ${i.quantity??'?'}${i.unitAmount?' @ '+i.unitAmount+(currency==='USD'?' USD':' (currency unconfirmed)'):''}`).join('; ');
 if(service.length>1000)blockers.push('SERVICE_TOO_LONG');
 return {version:1,method:'INTEGER_CENTS',lines,acceptedSubtotal:candidate,amount:blockers.length?null:candidate,service:service||null,blockers,canInvoice:blockers.length===0};
}
export function attachBilling(result,rawItems,messages){
 const billingItems=validateBillingItems(rawItems,messages);
 const calculation=calculateBilling(billingItems,{currency:result.currency,agreementStatus:result.agreementStatus,modelReportedAmount:result.amount,pendingIssues:result.pendingIssues,explicitTotal:result.explicitTotal??null});
 return {...result,modelReportedAmount:result.amount,modelAgreementStatus:result.agreementStatus,billingItems,calculation,amount:calculation.amount,agreementStatus:calculation.canInvoice?'CONFIRMED':'NEEDS_CONFIRMATION',service:calculation.service};
}
