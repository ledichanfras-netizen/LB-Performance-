import { EnrichedExercise } from "./exercises";

const make = (id:string,name:string,category:string,quality:string,equipment:string,tags:string[],reps="4",sets=3,rest="2-3min"):EnrichedExercise => ({
  id,name,category,muscleGroup: category==="MMSS"?"MMSS":category==="Core"?"Core":"MMII",
  defaultReps:reps,defaultWeight:"Ajustar por RPE/velocidade",defaultSets:sets,recommendedRest:rest,
  physicalQuality:quality,equipment,tags,sports:["Geral","Futebol","Futsal","Vôlei","Vôlei de Praia","Tênis","Corrida"],
  difficulty:"Intermediário",isFavorite:false
});

export const LB_METHOD_EXERCISES: EnrichedExercise[] = [
  make("lbm-01","IMTP Pull Explosivo","MMII","Força Rápida / TDF","Rack + Barra",["isométr","explos","tdf","imtp"],"3-5s",3,"2-3min"),
  make("lbm-02","Isometria Explosiva Meio Agachamento","MMII","Força Rápida / TDF","Rack + Barra",["isométr","explos","tdf","agach"],"3-5s",3,"2-3min"),
  make("lbm-03","Isometria Explosiva Split Squat","MMII","Força Rápida / Assimetria","Rack / Cinto",["isométr","explos","unilateral","assimetr"],"3-5s",3,"2min"),
  make("lbm-04","Trap Bar Jump","Potência","Potência Balística","Trap Bar",["potência","balíst","jump","salto"],"3-5",4,"2-3min"),
  make("lbm-05","Jump Squat com Barra","Potência","Potência Balística","Barra Olímpica",["potência","balíst","jump","salto"],"3-5",4,"2-3min"),
  make("lbm-06","Jump Squat com Halteres","Potência","Potência Balística","Halteres",["potência","balíst","jump","salto"],"3-5",4,"2-3min"),
  make("lbm-07","Pogo Jump Bilateral","Potência","Força Reativa / CAE","Peso Corporal",["pliometr","pogo","stiffness","reativ","cae"],"10-20",3,"60-90s"),
  make("lbm-08","Pogo Jump Unilateral","Potência","Força Reativa / CAE","Peso Corporal",["pliometr","pogo","stiffness","reativ","unilateral"],"8-12",3,"60-90s"),
  make("lbm-09","Drop Jump Baixo","Potência","Força Reativa / CAE","Caixa",["drop","jump","pliometr","rsi","reativ"],"3-5",4,"2min"),
  make("lbm-10","Depth Jump","Potência","Potência / CAE","Caixa",["depth","jump","pliometr","potência"],"3-5",3,"2-3min"),
  make("lbm-11","Salto Horizontal Bilateral","Potência","Potência Horizontal","Peso Corporal",["salto","jump","horizontal","potência"],"3-5",3,"2min"),
  make("lbm-12","Salto Horizontal Unilateral","Potência","Potência / Assimetria","Peso Corporal",["salto","unilateral","assimetr","potência"],"3-5",3,"2min"),
  make("lbm-13","Arremesso Medicine Ball Rotacional","Potência","Potência Rotacional","Medicine Ball",["arremesso","balíst","rotacional","potência"],"4-6",3,"90s"),
  make("lbm-14","Arremesso Medicine Ball Scoop","Potência","Potência Balística","Medicine Ball",["arremesso","balíst","potência"],"4-6",3,"90s"),
  make("lbm-15","High Pull","Potência","Força Rápida / Potência","Barra Olímpica",["lpo","explos","tdf","potência"],"3-5",4,"2-3min"),
  make("lbm-16","Hang Power Clean","Potência","Potência","Barra Olímpica",["lpo","explos","potência"],"2-4",4,"2-3min"),
  make("lbm-17","Agachamento Isométrico em Pino","MMII","Força Máxima","Rack + Barra",["isométr","força","agach"],"3-5s",4,"2-4min"),
  make("lbm-18","Mid-Thigh Pull Isométrico","MMII","Força Máxima / Impulso","Rack + Barra",["isométr","força","impulso","imtp"],"3-5s",4,"2-4min"),
  make("lbm-19","Bulgarian Split Squat","MMII","Força Unilateral","Banco + Halteres",["unilateral","búlgar","split","assimetr"],"5-8",3,"2min"),
  make("lbm-20","Step Up Alto","MMII","Força Unilateral","Caixa + Halteres",["unilateral","step","assimetr"],"5-8",3,"90-120s"),
  make("lbm-21","Single Leg RDL","MMII","Força Unilateral","Halter / Barra",["unilateral","single","posterior","assimetr"],"5-8",3,"90-120s"),
  make("lbm-22","Nordic Hamstring","MMII","Força Excêntrica","Banco / Parceiro",["posterior","hamstring","excêntr","preventivo"],"3-6",3,"2min"),
  make("lbm-23","Spanish Squat Isométrico","MMII","Isometria / Quadríceps","Faixa / Cinta",["isométr","quadríceps","joelho"],"20-45s",3,"60-90s"),
  make("lbm-24","Sóleo Isométrico Sentado","MMII","Stiffness / Isometria","Máquina / Smith",["isométr","sóleo","stiffness","tornozelo"],"20-45s",3,"60-90s"),
  make("lbm-25","Sprint 10 m Aceleração","Velocidade","Aceleração","Campo / Quadra",["sprint","acelera","velocidade","tiro"],"1 ação",6,"2-3min"),
  make("lbm-26","Sprint 20 m Máximo","Velocidade","Velocidade","Campo / Quadra",["sprint","velocidade","tiro"],"1 ação",5,"3min"),
  make("lbm-27","Flying Sprint 20 m","Velocidade","Velocidade Máxima","Campo / Pista",["sprint","velocidade","flying"],"1 ação",4,"4min"),
  make("lbm-28","Resisted Sprint com Trenó","Velocidade","Aceleração / Força Horizontal","Trenó",["sprint","acelera","resistido","força"],"10-20m",5,"2-3min"),
  make("lbm-29","Pallof Press","Core","Anti-rotação","Cabo / Elástico",["core","anti-rotação","estabilidade"],"8-12",3,"60s"),
  make("lbm-30","Landmine Rotacional","Core","Potência Rotacional","Landmine",["core","rotacional","potência","balíst"],"5-8",3,"90s"),
  make("lbm-31","Copenhagen Plank","Core","Adutores / Prevenção","Banco",["core","copenhagen","adutor","preventivo"],"15-30s",3,"60s"),
  make("lbm-32","Intervalado vVO2 30:30","Velocidade","Capacidade Aeróbia","Esteira / Pista",["corrida","interval","aerób","vvo2"],"8-20min",1,"30s"),
  make("lbm-33","Intervalado 4x4 min","Velocidade","Capacidade Aeróbia","Esteira / Pista",["corrida","interval","aerób","vo2"],"4min",4,"3min"),
  make("lbm-34","Bike Intervalada VO2","Velocidade","Capacidade Aeróbia","Bike Ergometer",["bike","erg","interval","aerób"],"2-4min",4,"2-3min")
];
