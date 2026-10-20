import test from 'node:test';
import assert from 'node:assert/strict';
import type { Athlete } from '../src/types';
import { dashboardSummary, sessionLoad } from '../src/utils/dashboardSummary';
const fixture = (patch: Partial<Athlete> = {}) => ({ workouts: [], wellness: [], externalSessions: [], ...patch }) as Athlete;

test('week follows recorded calendar dates, excludes future sessions and previous week', () => {
  const athlete = fixture({ workouts: [
    { id:'old', date:'2026-10-18', status:'completed', rpe:10, durationMinutes:90 },
    { id:'done', date:'2026-10-19T00:00:00.000Z', status:'completed', rpe:7, durationMinutes:50 },
    { id:'today', date:'2026-10-20', status:'planned' },
    { id:'future', date:'2026-10-21', status:'planned' },
  ] as any });
  const result = dashboardSummary(athlete,'2026-10-20');
  assert.equal(result.completedCount,1); assert.equal(result.scheduledCount,2);
  assert.equal(result.previousPending,0); assert.equal(result.load,350);
});

test('does not fabricate loads or show an old readiness as today', () => {
  const result = dashboardSummary(fixture({
    wellness: [{ date:'2026-10-19', readinessScore:90 }] as any,
    workouts: [{date:'2026-10-19',status:'completed',rpe:8}] as any,
  }),'2026-10-20');
  assert.equal(result.todayWellness,undefined); assert.equal(result.load,null);
  assert.equal(result.loadCoverage,0); assert.equal(result.pendingRpe,0);
  assert.equal(sessionLoad({rpe:0,durationMinutes:40}),0);
  assert.equal(sessionLoad({rpe:NaN,durationMinutes:40}),null);
});

test('combines external and completed training load; exposes incomplete coverage and PSE', () => {
  const result = dashboardSummary(fixture({
    externalSessions: [{date:'2026-10-20',rpe:5,durationMinutes:60,load:300}] as any,
    workouts: [{date:'2026-10-20',status:'completed',durationMinutes:30}] as any,
    wellness: [{date:'2026-10-20T00:00:00.000Z',readinessScore:65}] as any,
  }),'2026-10-20');
  assert.equal(result.externalCount,1); assert.equal(result.sessionCount,2);
  assert.equal(result.load,300); assert.equal(result.loadCoverage,1);
  assert.equal(result.pendingRpe,1); assert.equal(result.todayWellness?.readinessScore,65);
});
