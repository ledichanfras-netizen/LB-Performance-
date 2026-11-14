import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ReportHistory from '../src/components/ReportHistory';
import ReportGuidance from '../src/components/ReportGuidance';
test('compact history keeps unique latest measured results and marks missing values without inventing zeros',()=>{
 const html=renderToStaticMarkup(React.createElement(ReportHistory,{asOf:'2026-11-14',rows:[{id:'future',date:'2027-01-01',rsi:9},{id:'now',date:'2026-11-14',rsi:2},{id:'now',date:'2026-11-14',rsi:2},{id:'old',date:'2026-10-01'}],columns:[{label:'RSI',key:'rsi'}]}));
 assert.equal((html.match(/14\/11\/2026/g)||[]).length,1);assert.match(html,/Não informado/);assert.ok(html.indexOf('14/11/2026')<html.indexOf('01/10/2026'));assert.doesNotMatch(html,/>0</);assert.doesNotMatch(html,/01\/01\/2027/);
});
test('guidance separates trainer and family and preserves trainer observations as plain text',()=>{
 const html=renderToStaticMarkup(React.createElement(ReportGuidance,{coach:'Comparar avaliações',athlete:'Acompanhar a evolução',priorities:['Manter o protocolo'],followUp:'<script>observação</script>'}));
 assert.match(html,/Para o treinador/);assert.match(html,/Para o atleta e a família/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
