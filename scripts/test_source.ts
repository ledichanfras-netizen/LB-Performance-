
import { Pool } from 'pg';

const SOURCE_DB_URL = 'postgresql://lbhub_user:0RC18wUQTstfMwFRKNgDCkja0s8HZnHu@dpg-d6gfc3p4tr6s73b7bsug-a.oregon-postgres.render.com/lbhub';

async function test() {
  const pool = new Pool({ 
    connectionString: SOURCE_DB_URL, 
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    console.log('Testing connection to source with ssl: { rejectUnauthorized: false }...');
    const pool1 = new Pool({ 
      connectionString: SOURCE_DB_URL, 
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
    const res1 = await pool1.query('SELECT current_database()');
    console.log('Connected to:', res1.rows[0].current_database);
    await pool1.end();
  } catch (e) {
    console.error('Connection failed (config 1):', e);
  }

  try {
    console.log('Testing connection to source with ssl: true...');
    const pool2 = new Pool({ 
      connectionString: SOURCE_DB_URL, 
      ssl: true,
      connectionTimeoutMillis: 10000
    });
    const res2 = await pool2.query('SELECT current_database()');
    console.log('Connected to:', res2.rows[0].current_database);
    await pool2.end();
  } catch (e) {
    console.error('Connection failed (config 2):', e);
  }
}

test();
