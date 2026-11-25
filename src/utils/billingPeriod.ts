export const billingDurations = {monthly:'Mensal',quarterly:'Trimestral',half_year:'Semestral',yearly:'Anual',periodization:'Por periodização'} as const;
export type BillingDuration=keyof typeof billingDurations;
export const durationMonths:Partial<Record<BillingDuration,number>>={monthly:1,quarterly:3,half_year:6,yearly:12};
export function validBillingDate(v:unknown):v is string {
 return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
}
export function shiftBillingDate(v:string,days:number){const d=new Date(v+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function billingPeriod(start:string,duration:BillingDuration,end?:string){
 if(!validBillingDate(start)||!Object.hasOwn(billingDurations,duration))throw Error('Informe início e duração válidos.');
 let finish=end;
 if(duration!=='periodization'){
  const d=new Date(start+'T12:00:00Z'),anchor=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+durationMonths[duration]!);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(anchor,last));finish=shiftBillingDate(d.toISOString().slice(0,10),-1);
 }
 if(!validBillingDate(finish)||finish<start)throw Error('Informe o término da periodização, igual ou posterior ao início.');
 const days=Math.round((Date.parse(finish+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000)+1;
 if(days>366)throw Error('O período deve ter até 366 dias.');
 return {start,end:finish,days,months:durationMonths[duration]||null};
}
export function formatBrazilianDate(v:string|null|undefined){
 if(!v)return '';
 const iso=v.length===10?v:new Date(v).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 if(!validBillingDate(iso))return '';
 const [y,m,d]=iso.split('-');
 return `${d}/${m}/${y}`;
}
export function parseBrazilianDate(v:unknown):string|null{
 if(typeof v!=='string')return null;
 const trimmed=v.trim();
 if(validBillingDate(trimmed))return trimmed;
 const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
 if(!m)return null;
 const iso=`${m[3]}-${m[2]}-${m[1]}`;
 return validBillingDate(iso)?iso:null;
}
export function maskBrazilianDate(raw:string){
 const digits=raw.replace(/\D/g,'').slice(0,8);
 if(digits.length<=2)return digits;
 if(digits.length<=4)return `${digits.slice(0,2)}/${digits.slice(2)}`;
 return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
}

