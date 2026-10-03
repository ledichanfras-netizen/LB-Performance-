import type { Pool } from 'pg';
import { createHash } from 'node:crypto';
export async function allowAccountAttempt(pool:Pick<Pool,'query'>,kind:'login'|'accept',identity:string,now=Date.now()){
 const key=createHash('sha256').update(`${kind}:${identity}`).digest('hex');
 const bucket=Math.floor(now/900000);
 const result=await pool.query(`INSERT INTO lb_accounts.rate_limits(key,bucket,attempts) VALUES($1,$2,1)
 ON CONFLICT(key) DO UPDATE SET bucket=EXCLUDED.bucket,
 attempts=CASE WHEN lb_accounts.rate_limits.bucket=EXCLUDED.bucket THEN lb_accounts.rate_limits.attempts+1 ELSE 1 END
 RETURNING attempts`,[key,bucket]);
 return result.rows[0].attempts <= (kind==='login'?20:10);
}
