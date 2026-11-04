const fields=['capacity','method','prescriptionRole','trainingMode','metricType','distanceMeters','targetIntensity','recoverySeconds','defaultExecutionTime','fieldUnit','workRestRatio','totalDistanceMeters','executionMethod','clusterReps','intraSetRest','blockGroupId','blockTag','blockType','blockRole','blockRest','isStructuredRunning','runningBlocks','conditioningProtocol','aerobic'];
export function exerciseMetadata(ex:any){
 const result:Record<string,unknown>={};
 for(const key of ['lateralType','sidePrescriptions','startingSide'])if(ex[key]!==undefined)result[key]=ex[key];
 if(ex.sidePrescriptions){
  for(const side of ['left','right']){const p=ex.sidePrescriptions[side];if(!p || !Number.isInteger(p.sets)||p.sets<1||p.sets>25||typeof p.reps!=='string'||p.reps.length>100||typeof p.weight!=='string'||p.weight.length>100)throw Error('Prescrição por lado inválida.');}
 }
 if(ex.startingSide!==undefined&&!['left','right'].includes(ex.startingSide))throw Error('Lado inicial inválido.');
 for(const key of fields)if(ex[key]!==undefined)result[key]=ex[key];
 if(ex.aerobic){const p=ex.aerobic;
  if(!['warmup','base','recovery'].includes(p.goal)||!['time','distance'].includes(p.target)||!Number.isFinite(p.minutes)||p.minutes<0||p.minutes>1440||!Number.isFinite(p.distanceKm)||p.distanceKm<0||p.distanceKm>500||(p.target==='time'?p.minutes:p.distanceKm)<=0)throw Error('Prescrição aeróbia inválida.');
 }
 if(Array.isArray(ex.performedSets))result.performedMetrics=ex.performedSets.map((s:any)=>{const m:Record<string,unknown>={id:s.id};for(const k of ['distance','timeSeconds','intensity','speedKmh','inclinePercent'])if(s[k]!==undefined&&s[k]!==null){if(!Number.isFinite(s[k])||s[k]<0)throw Error('Métrica realizada inválida.');m[k]=s[k];}return m;});
 const json=JSON.stringify(result);if(json.length>50000)throw Error('Protocolo muito grande.');
 if(ex.conditioningProtocol){const p=ex.conditioningProtocol;
  if(!['field','treadmill','bike'].includes(p.environment)||!Array.isArray(p.blocks)||p.blocks.length<1||p.blocks.length>20)throw Error('Protocolo inválido.');
  for(const b of p.blocks)if(!b||(b.phase!==undefined&&!['warmup','work','cooldown'].includes(b.phase))||!Number.isInteger(b.repetitions)||b.repetitions<1||b.repetitions>100||!['meters','seconds'].includes(b.unit)||!Array.isArray(b.stages)||!b.stages.length||b.stages.length>20||b.stages.some((v:any)=>typeof v!=='number'||!Number.isFinite(v)||v<=0||v>100000)||!Number.isFinite(b.pauseSeconds)||b.pauseSeconds<0||b.pauseSeconds>3600||!Number.isFinite(b.blockPauseSeconds)||b.blockPauseSeconds<0||b.blockPauseSeconds>3600)throw Error('Protocolo inválido.');
 }
 return json;
}

export function restorePerformedMetrics(ex:any,sets:any[]){
 const metrics=ex.prescription_meta?.performedMetrics||[];
 return sets.map(s=>({...s,timeSeconds:s.timeSeconds??s.time_seconds,...(metrics.find((m:any)=>m.id===s.id)||{}),isCompleted:s.isCompleted??s.is_completed??false}));
}
