/** Editor array order is authoritative when saving; stored positions order reads. */
export function indexExercises<T extends object>(exercises:T[]):(T & {order_index:number})[]{
 return exercises.map((exercise,index)=>({...exercise,order_index:index}));
}
export function orderedExercises<T extends {order_index?:unknown;orderIndex?:unknown}>(exercises:T[]):(T & {order_index:number})[]{
 const position=(exercise:T,index:number)=>{
  const raw=exercise.order_index ?? exercise.orderIndex;
  const value=raw===null||raw===undefined||raw===''?NaN:Number(raw);
  return Number.isInteger(value)&&value>=0?value:index;
 };
 return indexExercises(exercises.map((exercise,index)=>({exercise,index})).sort((a,b)=>position(a.exercise,a.index)-position(b.exercise,b.index)||a.index-b.index).map(item=>item.exercise));
}
