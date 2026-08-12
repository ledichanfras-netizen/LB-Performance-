
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("--- Contagem de Registros ---");
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of tables.rows) {
      const tableName = row.table_name;
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${tableName}"`);
      console.log(`${tableName}: ${countRes.rows[0].count} registros`);
    }
  } catch (e) {
    console.error("Erro ao verificar dados:", e);
  } finally {
    await client.end();
  }
}

checkData();
