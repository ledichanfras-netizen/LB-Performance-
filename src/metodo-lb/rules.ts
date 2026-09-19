import type {
  LbAssessmentContext,
  LbAssessmentMetric,
  LbDecision,
  LbInterpretation,
} from './domain';

export interface LbValidationIssue {
  field: string;
  message: string;
}

export const canCompareToBaseline = (
  context: Pick<LbAssessmentContext, 'qualityFlag' | 'comparableToBaseline'>,
): boolean =>
  context.qualityFlag !== 'NON_COMPARABLE' &&
  context.qualityFlag !== 'REPEAT' &&
  context.comparableToBaseline;

export const validMetricsForAggregation = (
  metrics: LbAssessmentMetric[],
): LbAssessmentMetric[] => metrics.filter((metric) => metric.isValid);

export const validateAssessmentContext = (
  context: LbAssessmentContext,
): LbValidationIssue[] => {
  const issues: LbValidationIssue[] = [];

  if (!context.protocolVersion.trim()) {
    issues.push({
      field: 'protocolVersion',
      message: 'Registre a versão do protocolo para proteger a comparabilidade longitudinal.',
    });
  }

  if (
    context.qualityFlag === 'NON_COMPARABLE' &&
    context.comparableToBaseline
  ) {
    issues.push({
      field: 'comparableToBaseline',
      message: 'Dado NÃO COMPARÁVEL não pode ser comparado automaticamente ao baseline.',
    });
  }

  return issues;
};

export const validateInterpretation = (
  interpretation: LbInterpretation,
): LbValidationIssue[] => {
  const issues: LbValidationIssue[] = [];

  if (
    interpretation.confidence === 'LOW' &&
    !interpretation.mainLimitation?.trim()
  ) {
    issues.push({
      field: 'mainLimitation',
      message: 'Confiança baixa exige registrar a principal limitação.',
    });
  }

  return issues;
};

export const validateDecision = (
  decision: LbDecision,
): LbValidationIssue[] => {
  const issues: LbValidationIssue[] = [];

  if (decision.rationale.trim().length < 10) {
    issues.push({
      field: 'rationale',
      message: 'A decisão precisa de justificativa explícita.',
    });
  }

  if (!decision.reviewTrigger.trim()) {
    issues.push({
      field: 'reviewTrigger',
      message: 'Toda decisão precisa de um gatilho de revisão.',
    });
  }

  return issues;
};
