import {rootCertificates} from 'node:tls';
import {readFileSync} from 'node:fs';
import {X509Certificate} from 'node:crypto';
import type {PoolConfig} from 'pg';
const isLocal=(host:string)=>['localhost','127.0.0.1','::1','[::1]'].includes(host)||host.startsWith('/');
const isSupabase=(host:string)=>host.endsWith('.supabase.co')||host.endsWith('.supabase.com');
/** Authenticate remote databases. URL ssl parameters must not override verification. */
export async function databaseConnectionOptions(env:NodeJS.ProcessEnv):Promise<PoolConfig>{
 const parsed=env.DATABASE_URL&&!env.SQL_HOST?new URL(env.DATABASE_URL):null;
 const host=env.SQL_HOST||parsed?.hostname||'localhost';
 let connectionString:string|undefined;
 if(parsed){for(const key of ['sslmode','sslrootcert','sslcert','sslkey','ssl','uselibpqcompat'])parsed.searchParams.delete(key);connectionString=parsed.toString();}
 let ca=env.DATABASE_SSL_CA?.replace(/\\n/g,'\n');
 if(!isLocal(host)&&!ca&&isSupabase(host)){
  ca=readFileSync(new URL('./certs/supabase-prod-ca-2021.pem',import.meta.url),'utf8');
  const fingerprint=new X509Certificate(ca).fingerprint256.replaceAll(':','').toLowerCase();
  if(fingerprint!=='807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa')throw new Error('A autoridade pública do banco foi alterada. Verifique o certificado.');
 }
 if(ca){const certificate=new X509Certificate(ca);if(!certificate.ca||Date.parse(certificate.validTo)<Date.now())throw new Error('Certificado da autoridade do banco inválido ou expirado.');}
 return {...(connectionString?{connectionString}:{host,user:env.SQL_USER,password:env.SQL_PASSWORD,database:env.SQL_DB_NAME}),ssl:isLocal(host)?false:{rejectUnauthorized:true,...(ca?{ca:[...rootCertificates,ca]}:{})},max:10,connectionTimeoutMillis:15000};
}
