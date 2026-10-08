import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ImtpReportPages from '../src/components/ImtpReportPages';
import { imtpChange, imtpValue, previousImtp } from '../src/utils/imtpAnalysis';
import { createSaveBatch } from './saveBatch';

test('IMTP absence never creates a zero result or a false longitudinal decline', () => {
  for (const value of [null,undefined,'',0,NaN]) {
    assert.equal(imtpValue(value),null);
    assert.equal(imtpChange(value,100),null);
  }
  assert.equal(imtpChange(110,100),10);
  const current={id:'now',date:'2026-10-07',peakForce:100};
  const past={id:'past',date:'2026-09-07',peakForce:90};
  const future={id:'future',date:'2026-11-07',peakForce:120};
  assert.equal(previousImtp(current,[future,current,past])?.id,'past');
  const html=renderToStaticMarkup(React.createElement(ImtpReportPages,{athlete:{name:'Teste',modality:'Tênis'} as any,data:current,history:[past,future]}));
  assert.match(html,/Não Informado/);
  assert.match(html,/Não comparável/);
  assert.match(html,/Força em 100 ms/);
  assert.doesNotMatch(html,/-100|4.500|PERFIL DE FORÇA/);
});

test('IMTP force epochs and nullable values survive batched database saves and schema replay',async()=>{
  const db=new PGlite();
  try {
    await db.exec('CREATE TABLE imtp(id text PRIMARY KEY,peak_force real,rfd_100 real)');
    const schema=await readFile(new URL('./imtp-force-schema.sql',import.meta.url),'utf8');
    await db.exec(schema);await db.exec(schema);
    const batch=createSaveBatch({query: sql=>db.exec(sql)});
    await db.exec('BEGIN');
    await batch.query('INSERT INTO imtp(id,peak_force,rfd_100,force_100,force_200,force_300) VALUES($1,$2,$3,$4,$5,$6)',['test',83.67,null,67.32,68.03,72.56]);
    await batch.flush();await db.exec('COMMIT');
    const row=(await db.query('SELECT * FROM imtp')).rows[0] as any;
    assert.equal(row.rfd_100,null);assert.equal(row.force_100,67.32);assert.equal(row.force_200,68.03);assert.equal(row.force_300,72.56);
    await batch.query('INSERT INTO imtp(id,force_100) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET force_100=$2',['test',null]);
    await batch.flush();assert.equal((await db.query('SELECT force_100 FROM imtp')).rows[0].force_100,null);
  }finally{await db.close();}
});
