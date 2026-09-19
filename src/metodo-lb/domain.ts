export type LbQualityFlag =
  | 'VALID'
  | 'CAUTION'
  | 'NON_COMPARABLE'
  | 'REPEAT';

export type LbConfidence = 'HIGH' | 'MODERATE' | 'LOW';

export type LbDecisionClass =
  | 'MAINTAIN'
  | 'MONITOR'
  | 'INVESTIGATE'
  | 'INTERVENE'
  | 'REFER_STOP';

export type LbChangeStatus =
  | 'OBSERVED'
  | 'DETECTABLE'
  | 'IMPORTANT'
  | 'INCONCLUSIVE';

export type LbTransferStatus =
  | 'SUPPORT'
  | 'PARTIAL'
  | 'SUSTAINED'
  | 'INCONCLUSIVE';

export interface LbAssessmentMetric {
  metricCode: string;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  trialNo?: number;
  isValid: boolean;
}

export interface LbAssessmentContext {
  protocolVersion: string;
  qualityFlag: LbQualityFlag;
  comparableToBaseline: boolean;
  device?: string;
  operator?: string;
  notes?: string;
  context?: Record<string, unknown>;
}

export interface LbInterpretation {
  comparator?: string;
  noiseReference?: string;
  context?: string;
  convergence?: string;
  confidence: LbConfidence;
  mainLimitation?: string;
  missingData?: string;
  conclusion?: string;
}

export interface LbDecision {
  decisionClass: LbDecisionClass;
  priority?: string;
  rationale: string;
  costOfActing?: string;
  costOfNotActing?: string;
  reviewTrigger: string;
  alternativeDiscarded?: string;
}

export interface LbPrescriptionHypothesis {
  targetCapacity: string;
  hypothesis: string;
  method?: string;
  dose?: string;
  qualityCriterion?: string;
  progressionCriterion?: string;
}

export interface LbReassessment {
  changeStatus: LbChangeStatus;
  observedChange?: string;
  relevance?: string;
  hypothesisSupported?: boolean;
  nextDecision?: string;
}

export interface LbTransferEvidence {
  status: LbTransferStatus;
  capacityEvidence?: string;
  bridgeTaskEvidence?: string;
  sportActionEvidence?: string;
  competitionEvidence?: string;
  limitation?: string;
}
