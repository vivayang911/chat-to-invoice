// Reference-only repair. No item, amount, quantity, state or source text can change.
export function acceptanceRepairTargets(items,messages){
 if(!Array.isArray(items))return [];
 return items.filter(item=>item?.status==='ACCEPTED'&&Array.isArray(item.acceptanceEvidence)&&item.acceptanceEvidence.length===0).map(item=>{
  const sourceIds=[...(item.priceEvidence||[]),...(item.quantityEvidence||[])];
  const latest=Math.max(...sourceIds.map(id=>messages.findIndex(m=>m.id===id)));
  const candidates=messages.filter((m,index)=>index>=latest&&m.speaker==='buyer'&&/(?:\b(?:accept|agree|confirm|yes|okay|ok|choose|want|need)\b|接受|同意|确认|可以|好的|是的|需要|选择|就要)/i.test(m.text)&&!/(?:\b(?:if|unless|cancel|not|no)\b|don.t|如果|要是|除非|取消|不要|不同意|不接受)/i.test(m.text)).map(m=>m.id);
  return {itemId:item.id,description:item.description,quantity:item.quantity,unitAmount:item.unitAmount,priceSourceIds:item.priceEvidence,quantitySourceIds:item.quantityEvidence,candidateBuyerIds:candidates};
 });
}
export function applyAcceptanceRepair(items,targets,reply){
 const fail=()=>{throw Error('The model could not establish buyer acceptance from the original messages. Clarify the agreement and analyze again.');};
 if(!reply||Array.isArray(reply)||Object.keys(reply).length!==1||!reply.acceptanceEvidence||Array.isArray(reply.acceptanceEvidence)||typeof reply.acceptanceEvidence!=='object')fail();
 const refs=reply.acceptanceEvidence,ids=targets.map(x=>x.itemId);
 if(Object.keys(refs).length!==ids.length||Object.keys(refs).some(id=>!ids.includes(id)))fail();
 for(const target of targets){const values=refs[target.itemId];if(!Array.isArray(values)||!values.length||values.length>20||!values.every(id=>target.candidateBuyerIds.includes(id)))fail();}
 return items.map(item=>ids.includes(item.id)?{...item,acceptanceEvidence:[...new Set(refs[item.id])]}:item);
}
