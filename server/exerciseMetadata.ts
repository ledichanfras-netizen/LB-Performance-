const fields=['trainingMode','metricType','distanceMeters','targetIntensity','recoverySeconds','defaultExecutionTime','fieldUnit','workRestRatio','totalDistanceMeters','executionMethod','clusterReps','intraSetRest','blockGroupId','blockTag','blockType','blockRole','blockRest','isStructuredRunning','runningBlocks','conditioningProtocol'];
export function exerciseMetadata(ex:any){
 const result:Record<string,unknown>={};
 for(const key of fields)if(ex[key]!==undefined)result[key]=ex[key];
 const json=JSON.stringify(result);if(json.length>50000)throw Error('Protocolo muito grande.');
 if(ex.conditioningProtocol){const p=ex.conditioningProtocol;
  if(!['field','treadmill','bike'].includes(p.environment)||!Array.isArray(p.blocks)||p.blocks.length<1||p.blocks.length>20)throw Error('Protocolo inválido.');
  for(const b of p.blocks)if(!b||(b.phase!==undefined&&!['warmup','work','cooldown'].includes(b.phase))||!Number.isInteger(b.repetitions)||b.repetitions<1||b.repetitions>100||!['meters','seconds'].includes(b.unit)||!Array.isArray(b.stages)||!b.stages.length||b.stages.length>20||b.stages.some((v:any)=>typeof v!=='number'||!Number.isFinite(v)||v<=0||v>100000)||!Number.isFinite(b.pauseSeconds)||b.pauseSeconds<0||b.pauseSeconds>3600||!Number.isFinite(b.blockPauseSeconds)||b.blockPauseSeconds<0||b.blockPauseSeconds>3600)throw Error('Protocolo inválido.');
 }
 return json;
}
