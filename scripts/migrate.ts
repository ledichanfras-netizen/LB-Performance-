
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SOURCE_DB_URL = process.env.DATABASE_URL;
const TARGET_DB_URL = process.env.SUPABASE_DATABASE_URL; // Should be the postgres connection string

async function migrate() {
  console.log('🚀 Iniciando migração para Supabase...');

  if (!SOURCE_DB_URL) {
    console.error('❌ Erro: DATABASE_URL (origem) não encontrada no ambiente.');
    return;
  }

  const sourcePool = new Pool({ connectionString: SOURCE_DB_URL, ssl: { rejectUnauthorized: false } });
  const targetPool = new Pool({ 
    connectionString: TARGET_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    // 1. Criar estrutura no Target
    console.log('--- Criando tabelas no Supabase ---');
    const migrationSql = await fs.readFile(path.join(process.cwd(), 'supabase_migration.sql'), 'utf8');
    await targetPool.query(migrationSql);
    console.log('✅ Estrutura criada com sucesso.');

    // 2. Tabelas para migrar (ordem importa por causa de FKs)
    const tables = [
      'users',
      'athletes',
      'isometric_strength',
      'cmj',
      'drop_jump',
      'vo2max',
      'bioimpedance',
      'speed',
      'general_strength',
      'wellness',
      'workouts',
      'prescribed_exercises',
      'performed_sets',
      'external_sessions'
    ];

    for (const table of tables) {
      console.log(`--- Migrando tabela: ${table} ---`);
      
      // Verificar se a tabela existe na origem
      try {
        const { rows } = await sourcePool.query(`SELECT * FROM ${table}`);
        if (rows.length === 0) {
          console.log(`ℹ️ Tabela ${table} está vazia ou não existe na origem. Pulando...`);
          continue;
        }

        console.log(`📦 Encontrados ${rows.length} registros em ${table}.`);

        for (const row of rows) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const columns = keys.join(', ');
          
          const query = `
            INSERT INTO ${table} (${columns}) 
            VALUES (${placeholders}) 
            ON CONFLICT (id) DO NOTHING
          `;
          
          await targetPool.query(query, values);
        }
        console.log(`✅ Tabela ${table} migrada.`);
      } catch (e: any) {
        console.warn(`⚠️ Erro ao acessar tabela ${table} na origem: ${e.message}`);
      }
    }

    console.log('\n✨ Migração concluída com sucesso!');
    console.log('👉 Agora você pode atualizar a DATABASE_URL nas configurações do AI Studio.');

  } catch (error: any) {
    console.error('❌ Erro crítico durante a migração:', error.message);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

migrate();
