import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePrescriptionSets } from '../src/utils/prescriptionSets';
import type { PrescribedExercise } from '../src/types';

const oldRows = Array.from({length:5},(_,i)=>({id:`old-${i}`,reps:12,weight:80,rpe:0,isCompleted:false}));
const exercise: PrescribedExercise = {id:'stiff',name:'Stiff Unilateral',muscleGroup:'MMII',sets:3,reps:'8',weight:'20',performedSets:oldRows};

test('an edited prescription of three sets replaces five pending rows, without mutating the old workout',()=>{
 const result=reconcilePrescriptionSets(exercise,'planned');
 assert.equal(result.performedSets?.length,3);
 assert.deepEqual(result.performedSets?.map(s=>[s.reps,s.weight,s.isCompleted]),[[8,20,false],[8,20,false],[8,20,false]]);
 assert.equal(exercise.performedSets?.length,5);
 assert.equal(exercise.performedSets?.[0].weight,80);
 assert.equal(reconcilePrescriptionSets(result,'planned').performedSets?.[0].id,result.performedSets?.[0].id);
});

test('increasing the prescription fills all missing rows with the latest targets',()=>{
 const result=reconcilePrescriptionSets({...exercise,sets:5,performedSets:oldRows.slice(0,2)},'planned');
 assert.equal(result.performedSets?.length,5);
 assert.equal(new Set(result.performedSets?.map(s=>s.id)).size,5);
 assert.ok(result.performedSets?.every(s=>s.reps===8&&s.weight===20&&!s.isCompleted));
});

test('changing reps and per-set weights updates pending targets even if the count did not change',()=>{
 const result=reconcilePrescriptionSets({...exercise,reps:'6',weight:'20/25/30',performedSets:oldRows.slice(0,3)});
 assert.deepEqual(result.performedSets?.map(s=>s.weight),[20,25,30]);
 assert.ok(result.performedSets?.every(s=>s.reps===6));
});

test('a replacement without old rows starts with its own prescription and no execution flags',()=>{
 const result=reconcilePrescriptionSets({...exercise,name:'Novo exercício',reps:'10',weight:'BW',performedSets:undefined});
 assert.equal(result.performedSets?.length,3);
 assert.ok(result.performedSets?.every(s=>s.reps===10&&s.weight===0&&s.rpe===0&&!s.isCompleted));
 assert.ok(result.performedSets?.every(s=>!s.id.startsWith('old-')));
});

test('completed sessions retain all recorded rows and values even when the prescription count differs',()=>{
 const completed={...exercise,performedSets:oldRows.map(s=>({...s,isCompleted:true,weight:0,reps:0,rpe:9}))};
 assert.equal(reconcilePrescriptionSets(completed,'completed'),completed);
 assert.equal(completed.performedSets.length,5);
});

test('reducing targets never erases already completed sets beyond the new count',()=>{
 const recorded={...oldRows[4],isCompleted:true,reps:7,weight:31,rpe:8};
 const result=reconcilePrescriptionSets({...exercise,performedSets:[...oldRows.slice(0,4),recorded]});
 assert.equal(result.performedSets?.length,4);
 assert.deepEqual(result.performedSets?.[3],recorded);
});

test('in-progress typed results, including zero and unchecked surplus rows, are retained',()=>{
 const typed={...oldRows[0],reps:0,weight:0,rpe:0};
 const result=reconcilePrescriptionSets({...exercise,performedSets:[typed,...oldRows.slice(1)]},'in_progress');
 assert.equal(result.performedSets?.length,5);
 assert.deepEqual(result.performedSets?.[0],typed);
});

test('special cluster prescriptions use their prescribed repetitions',()=>{
 const result=reconcilePrescriptionSets({...exercise,executionMethod:'cluster',clusterReps:'2+2+2'});
 assert.equal(result.performedSets?.[0].reps,6);
});

test('conditioning blocks retain their own repetitions and distance/time targets',()=>{
 const result=reconcilePrescriptionSets({...exercise,sets:2,trainingMode:'conditioning',conditioningProtocol:{blocks:[{unit:'meters',stages:[20,30],repetitions:4},{unit:'seconds',stages:[15,15],repetitions:3}]} as any});
 assert.deepEqual(result.performedSets?.map(s=>[s.reps,s.distance,s.timeSeconds]),[[4,200,0],[3,0,90]]);
});
