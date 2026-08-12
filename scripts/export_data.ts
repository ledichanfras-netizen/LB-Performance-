
import { Pool } from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const SOURCE_DB_URL = process.env.DATABASE_URL;

async function exportData() {
  console.log('📦 Iniciando exportação de dados do banco antigo...');

  if (!SOURCE_DB_URL) {
    console.error('❌ Erro: DATABASE_URL não encontrada.');
    return;
  }

  const pool = new Pool({ 
    connectionString: SOURCE_DB_URL, 
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  const tables = [
    'users',
    'athletes',
    'wellness',
    'workouts',
    'prescribed_exercises',
    'performed_sets',
    'isometric_strength',
    'cmj',
    'vo2max',
    'bioimpedance',
    'speed',
    'general_strength',
    'external_sessions'
  ];

  const backup: any = {};

  try {
    for (const table of tables) {
      console.log(`Reading table: ${table}...`);
      try {
        const { rows } = await pool.query(`SELECT * FROM ${table}`);
        backup[table] = rows;
        console.log(`✅ ${rows.length} records found in ${table}.`);
      } catch (e: any) {
        console.warn(`⚠️ Table ${table} could not be read: ${e.message}`);
        backup[table] = [];
      }
    }

    await fs.writeFile('old_database_backup.json', JSON.stringify(backup, null, 2));
    console.log('\n✨ Exportação concluída! Arquivo: old_database_backup.json');
    
    const totalRecords = Object.values(backup).reduce((acc: number, val: any) => acc + val.length, 0);
    if (totalRecords === 0) {
      console.warn('⚠️ Nenhum dado foi encontrado no banco de origem.');
    }

  } catch (error: any) {
    console.error('❌ Erro crítico na exportação:', error.message);
  } finally {
    await pool.end();
  }
}

exportData();
