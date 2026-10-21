import test from 'node:test';
import assert from 'node:assert/strict';
import { readinessForDisplay, readinessNumber } from '../src/utils/readinessDisplay';
import { calculateReadiness } from '../src/utils';
import type { WellnessEntry } from '../src/types';
const sample = (patch: Record<string,unknown>) => ({ id:'w-1',date:'2026-10-20',fatigue:0,stress:0,soreness:0,mood:8,cognitiveLoad:0,sleep:7.66,sleepQuality:8,...patch }) as WellnessEntry;
test('renders persisted numeric strings and preserves zero responses and scores',()=>{
 const entry=readinessForDisplay(sample({readinessScore:'92',fatigue:'0',soreness:'0'}));
 assert.equal(entry.readinessScore,92);assert.equal(entry.fatigue,0);assert.equal(entry.soreness,0);
 assert.equal(readinessForDisplay(sample({readinessScore:'0'})).readinessScore,0);
});
test('supports snake_case and recalculates missing score from complete recorded answers',()=>{
 const entry=sample({readinessScore:null,readiness_score:'91'});
 assert.equal(readinessForDisplay(entry).readinessScore,91);
 assert.equal(readinessForDisplay(sample({})).readinessScore,calculateReadiness(sample({})));
});
test('does not turn blanks, nulls or incomplete answers into a fabricated readiness',()=>{
 for (const value of ['', ' ',null,undefined,'NaN',-1,101])assert.equal(readinessNumber(value,100),undefined);
 assert.equal(readinessNumber('7,5',24),7.5);
 assert.equal(readinessForDisplay(sample({mood:undefined,readinessScore:undefined})).readinessScore,undefined);
});
