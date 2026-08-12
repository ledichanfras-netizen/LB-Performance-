
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  console.log('DATABASE_URL Host:', url.host);
} else {
  console.log('DATABASE_URL is not set.');
}
