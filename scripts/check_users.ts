
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("--- Usuários ---");
    const res = await client.query(`SELECT * FROM public.users`);
    console.table(res.rows);
  } catch (e) {
    console.error("Erro ao verificar usuários:", e);
  } finally {
    await client.end();
  }
}

checkUsers();
