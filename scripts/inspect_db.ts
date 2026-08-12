
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function inspect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("--- Tabelas no Banco ---");
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of tables.rows) {
      const tableName = row.table_name;
      console.log(`\nTabela: public.${tableName}`);
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName]);
      console.table(columns.rows);
    }
  } catch (e) {
    console.error("Erro ao inspecionar:", e);
  } finally {
    await client.end();
  }
}

inspect();
