export interface LbFeatureFlags {
  coreWorkflow: boolean;
  interpretation: boolean;
  decision: boolean;
  prescription: boolean;
  monitoring: boolean;
  reassessment: boolean;
  transfer: boolean;
  premiumReports: boolean;
}

const enabled = (value: unknown): boolean =>
  String(value ?? '').trim().toLowerCase() === 'true';

export const lbFeatureFlags: LbFeatureFlags = {
  coreWorkflow: enabled(import.meta.env.VITE_LB_CORE_WORKFLOW),
  interpretation: enabled(import.meta.env.VITE_LB_INTERPRETATION),
  decision: enabled(import.meta.env.VITE_LB_DECISION),
  prescription: enabled(import.meta.env.VITE_LB_PRESCRIPTION),
  monitoring: enabled(import.meta.env.VITE_LB_MONITORING),
  reassessment: enabled(import.meta.env.VITE_LB_REASSESSMENT),
  transfer: enabled(import.meta.env.VITE_LB_TRANSFER),
  premiumReports: enabled(import.meta.env.VITE_LB_PREMIUM_REPORTS),
};

export const isLbMethodEnabled = (): boolean => lbFeatureFlags.coreWorkflow;
