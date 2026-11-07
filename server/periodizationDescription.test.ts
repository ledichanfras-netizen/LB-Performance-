import test from 'node:test';
import assert from 'node:assert/strict';
import { descriptionRequest, improveDescriptionHandler } from './periodizationDescription';
import { parseDescriptionSuggestion } from '../src/utils/periodizationDescription';
import { improvePeriodizationDescription } from '../src/services/periodizationDescription';
import { setSupervisionToken } from '../src/utils/supervisionSession';

const input = { athleteId: 'synthetic-athlete', description: 'Potência e aceleração. Sem treino pesado perto do jogo.', modality: 'Futebol', goal: 'Performance', startDate: '2026-11-09', endDate: '2026-11-30', academyDays: [1, 3, 5], courtDays: [2, 4], progressionMethod: 'auto' };
const suggestion = { description: 'Priorizar potência e aceleração, evitando treinos pesados próximos aos jogos.', questions: ['Em quais dias acontecem os jogos?'] };
function response() {
  return { statusCode: 200, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; return this; } };
}

test('description validation rejects invalid planning context and sends only approved fields', () => {
  assert.deepEqual(descriptionRequest({ ...input, assessments: { private: true }, token: 'not-for-model' }), input);
  for (const change of [{ description: '' }, { description: 'x'.repeat(6001) }, { startDate: '2026-02-30' }, { endDate: '2026-11-01' }, { academyDays: [7] }, { academyDays: [1, 1] }, { academyDays: [], courtDays: [] }, { progressionMethod: 'invented' }, { modality: {} }]) {
    assert.throws(() => descriptionRequest({ ...input, ...change }));
  }
});

test('enhancement requests a faithful rewrite with questions, without writing or generating workouts', async () => {
  let calls = 0;
  const res = response();
  await improveDescriptionHandler(async params => {
    calls++;
    const submitted = JSON.parse(params.contents[0].parts[0].text);
    assert.equal(submitted.description, input.description);
    assert.equal(submitted.athleteId, undefined);
    assert.equal(submitted.assessments, undefined);
    assert.deepEqual(submitted.academyDays, input.academyDays);
    assert.match(params.config.systemInstruction, /Preserve integralmente/);
    assert.match(params.config.systemInstruction, /Não invente/);
    assert.match(params.config.systemInstruction, /conflito ou ambiguidade/);
    assert.equal(params.config.httpOptions.timeout, 15000);
    return { text: JSON.stringify(suggestion), candidates: [{ finishReason: 'STOP' }] };
  })({ body: input }, res);
  assert.equal(calls, 1); assert.equal(res.statusCode, 200); assert.deepEqual(res.body, suggestion);
});

test('invalid requests never call the model and failed/truncated suggestions never report success', async () => {
  const bad = response();
  await improveDescriptionHandler(async () => { throw Error('must not call'); })({ body: { ...input, description: ' ' } }, bad);
  assert.equal(bad.statusCode, 400);
  for (const generate of [async () => { throw Error('provider unavailable'); }, async () => ({ text: JSON.stringify(suggestion), candidates: [{ finishReason: 'MAX_TOKENS' }] }), async () => ({ text: '{}', candidates: [{ finishReason: 'STOP' }] }), async () => ({ text: 'invalid json', candidates: [{ finishReason: 'STOP' }] })]) {
    const res = response(); await improveDescriptionHandler(generate)({ body: input }, res);
    assert.equal(res.statusCode, 503); assert.match(res.body.error, /preservado/);
  }
  for (const result of [{ ...suggestion, questions: ['x'.repeat(301)] }, { ...suggestion, questions: [12] }, { ...suggestion, description: ' ' }, { ...suggestion, questions: Array(7).fill('q') }]) assert.throws(() => parseDescriptionSuggestion(result));
});

test('client uses the effective session and accepts only a validated suggestion', async () => {
  const fetchOriginal = globalThis.fetch;
  setSupervisionToken('synthetic-session');
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/improve-periodization-description');
      assert.equal((options!.headers as any).Authorization, 'Bearer synthetic-session');
      assert.equal(JSON.parse(options!.body as string).description, input.description);
      return new Response(JSON.stringify(suggestion), { status: 200 });
    };
    assert.deepEqual(await improvePeriodizationDescription(input.description, input, new AbortController().signal), suggestion);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'IA não liberada' }), { status: 403 });
    await assert.rejects(improvePeriodizationDescription(input.description, input, new AbortController().signal), /IA não liberada/);
    globalThis.fetch = async () => new Response('{}', { status: 200 });
    await assert.rejects(improvePeriodizationDescription(input.description, input, new AbortController().signal), /incompleta/);
  } finally { globalThis.fetch = fetchOriginal; setSupervisionToken(null); }
});
