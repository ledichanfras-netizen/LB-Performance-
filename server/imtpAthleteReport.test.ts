import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { imtpAthleteReport } from '../src/utils/imtpAthleteReport';
import ImtpReportPages from '../src/components/ImtpReportPages';
import type { Imtp } from '../src/types';

const row = (values: Partial<Imtp>): Imtp => ({ id: 'now', athleteId: 'athlete', date: '2026-11-06', peakForce: 100, ...values });

test('athlete IMTP guidance describes measured changes without diagnosing a deficit', () => {
  const report = imtpAthleteReport(row({ peakForce: 110, force100: 45 }), row({ id: 'before', peakForce: 100, force100: 50 }));
  assert.match(report.showed, /110 kgf/);
  assert.match(report.comparison, /\+10%/);
  assert.match(report.comparison, /-10%/);
  assert.match(report.focus, /início do esforço/);
  assert.match(report.maintain, /força máxima/);
  assert.doesNotMatch(report.maintain, /força em 100 ms/);
});

test('first, missing and disjoint IMTP measurements never invent progress or strengths', () => {
  assert.match(imtpAthleteReport(row({})).comparison, /ponto de partida/);
  const absent = imtpAthleteReport(row({ peakForce: 0 }), row({ peakForce: 100 }));
  assert.match(absent.showed, /Não informado/);
  assert.doesNotMatch(absent.comparison, /-100/);
  assert.match(absent.maintain, /não permitem apontar um ponto forte/);
  const disjoint = imtpAthleteReport(row({ peakForce: 0, force200: 70 }), row({ peakForce: 100 }));
  assert.match(disjoint.comparison, /em comum/);
});

test('IMTP page two has the approved athlete sections and preserves coach observations as text', () => {
  const html = renderToStaticMarkup(React.createElement(ImtpReportPages, {
    athlete: { name: 'Teste' } as any,
    data: row({ observations: '<script>nota</script>' }), history: [],
  }));
  const pageTwo = html.slice(html.indexOf('Seu Resultado e Próximos Passos'));
  for (const label of ['O que o teste mostrou', 'O que isso significa para você', 'Seu foco agora', 'Manter', 'Desenvolver', 'Qual é o próximo passo?']) assert.ok(pageTwo.includes(label), label);
  assert.match(pageTwo, /&lt;script&gt;nota&lt;\/script&gt;/);
  assert.doesNotMatch(pageTwo, /MESMO PROTOCOLO|COMPARABILIDADE|KPI|PARECER TÉCNICO|PILAR 0/);
});
