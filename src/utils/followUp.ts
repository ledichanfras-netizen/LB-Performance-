/** Missing values keep existing registrations in performance follow-up. */
export type FollowUpType = 'athlete' | 'assessment-only';
export function followUpType(value: unknown): FollowUpType {
  return value === 'assessment-only' ? 'assessment-only' : 'athlete';
}
export function readFollowUpType(record: {followUpType?: unknown; injury_history?: unknown}): FollowUpType {
  if (record.followUpType !== undefined) return followUpType(record.followUpType);
  try {return followUpType(JSON.parse(String(record.injury_history || '{}')).followUpType);} catch {return 'athlete';}
}
export const isAssessmentOnly = (record: {followUpType?: unknown}) => followUpType(record.followUpType) === 'assessment-only';
