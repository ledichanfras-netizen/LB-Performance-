import test from 'node:test';
import assert from 'node:assert/strict';
import { metricDay, metricDateLabel, metricTimeline } from '../src/utils/metricTimeline.ts';

test('date-only and API timestamps stay on the same calendar day', () => {
  const day = metricDay('2026-07-30');
  assert.equal(metricDay('2026-07-30T00:00:00.000Z'), day);
  assert.equal(metricDay('30/07/2026'), day);
  assert.equal(metricDateLabel(day!, true), '30/07/2026');
  assert.equal(metricDateLabel(day!), '30/07');
});

test('rejects invalid dates instead of putting malformed labels on the axis', () => {
  for (const value of ['', 'invalid', '2026-02-30', '2026-13-01']) assert.equal(metricDay(value), null);
  assert.notEqual(metricDay('2024-02-29'), null);
});

test('sorts chronologically across years and groups the best attempt per calendar day', () => {
  const result = metricTimeline([
    { date: '2026-01-01T00:00:00.000Z', value: 35 },
    { date: '2025-12-31', value: 30 },
    { date: '2026-01-01', value: 38.1 },
    { date: 'bad', value: 40 },
    { date: '2026-01-02', value: NaN },
    { date: '2026-01-03', value: 0 },
  ]);
  assert.deepEqual(result.map(x => [metricDateLabel(x.time, true), x.value, x.count]), [
    ['31/12/2025', 30, 1], ['01/01/2026', 38.1, 2],
  ]);
});
