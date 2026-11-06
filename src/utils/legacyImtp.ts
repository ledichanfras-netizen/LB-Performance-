import type { Athlete, Imtp } from '../types';
export const legacyImtpNeedsReview=(row:any)=>String(row?.id||'').startsWith('imtp-mig-')&&row?.legacyReviewRequired!==false;
/** Preserve old stored results verbatim, but identify provenance before using them. */
export function migrateLegacyImtp(a:Athlete):Athlete{
 const assessments=a.assessments||{} as Athlete['assessments'];
 const imtp=assessments.imtp||[];
 if(imtp.length)return a;
 const migrated=(assessments.isometricStrength||[]).filter(s=>typeof s.halfSquatKgf==='number'&&Number.isFinite(s.halfSquatKgf)&&s.halfSquatKgf>0).map(s=>({
  id:`imtp-mig-${s.id}`,date:s.date,peakForce:s.halfSquatKgf,
  observations:'Registro legado de meio agachamento: somente a força originalmente registrada foi migrada. Confirmar protocolo antes de comparar.',
  legacyReviewRequired:true
 } as Imtp));
 return migrated.length?{...a,assessments:{...assessments,imtp:migrated}}:a;
}
/** A safe report/analysis view; original metrics remain available in the stored record. */
export function verifiedImtpView(row:Imtp):Imtp{
 if(!legacyImtpNeedsReview(row))return row;
 return {id:row.id,date:row.date,peakForce:row.peakForce,observations:'Registro migrado pendente de revisão. Métricas derivadas não confirmadas.',aiDetails:row.aiDetails} as Imtp;
}
