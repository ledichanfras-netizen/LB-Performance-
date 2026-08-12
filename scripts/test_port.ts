
import net from 'net';

const host = 'dpg-d6gfc3p4tr6s73b7bsug-a.oregon-postgres.render.com';
const port = 5432;

const client = net.connect(port, host, () => {
  console.log('Connected to host!');
  client.end();
});

client.on('error', (err) => {
  console.error('Connection failed:', err.message);
});

client.setTimeout(5000, () => {
  console.log('Connection timed out');
  client.destroy();
});
