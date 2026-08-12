
import { Client } from 'pg';

const SOURCE_DB_URL = 'postgresql://lbhub_user:0RC18wUQTstfMwFRKNgDCkja0s8HZnHu@dpg-d6gfc3p4tr6s73b7bsug-a.oregon-postgres.render.com/lbhub?ssl=true';

async function test() {
  const client = new Client({ 
    connectionString: SOURCE_DB_URL, 
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to source with Client and ?ssl=true...');
    await client.connect();
    const res = await client.query('SELECT current_database()');
    console.log('Connected to:', res.rows[0].current_database);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await client.end();
  }
}

test();
