import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createSaveBatch } from './saveBatch';

test('batched saves preserve values, operation order, and atomic rollback', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE records(id text PRIMARY KEY, name text, active boolean, amount real)');
    let calls = 0;
    const batch = createSaveBatch({query: async sql => {calls++; return db.exec(sql);}});
    const name = "O'Brien\\test'); DROP TABLE records; -- $1";
    await db.exec('BEGIN');
    await batch.query('INSERT INTO records VALUES ($1,$2,$3,$4)', ['a',name,true,1.5]);
    await batch.query('DELETE FROM records WHERE id=$1',['a']);
    await batch.query('INSERT INTO records VALUES ($1,$2,$3,$4)', ['a',name,false,null]);
    await batch.flush();
    await db.exec('COMMIT');
    assert.equal(calls,1);
    assert.deepEqual((await db.query('SELECT * FROM records')).rows,[{id:'a',name,active:false,amount:null}]);
    await db.exec('BEGIN');
    await batch.query('DELETE FROM records WHERE id=$1',['a']);
    await batch.query('INSERT INTO records VALUES ($1,$2,$3,$4)', ['b','ok',true,1]);
    await batch.query('INSERT INTO records VALUES ($1,$2,$3,$4)', ['b','duplicate',true,1]);
    await assert.rejects(batch.flush());
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT id FROM records')).rows[0].id,'a');
  } finally {await db.close();}
});

test('save batching rejects missing parameters and nonprimitive values',async()=>{
  const batch=createSaveBatch({query:async()=>{throw Error('must not execute');}});
  await assert.rejects(batch.query('INSERT INTO records VALUES ($2)',['a']));
  await assert.rejects(batch.query('INSERT INTO records VALUES ($1)',[{}]));
});
