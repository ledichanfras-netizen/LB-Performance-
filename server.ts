import express from 'express';
import compression from 'compression';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

function safeNum(val: any, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(',', '.').replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

const aiGenClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper function to call generateContent with automatic retries, exponential backoff, and robust model fallback
async function generateContentWithRetry(params: any, retries = 2, delayMs = 1000) {
  // Fallback chain of robust, production-grade models that are actively supported
  const models = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    let attempt = 1;
    while (attempt <= retries) {
      try {
        console.log(`[Gemini API] Tentando modelo: ${model} (Tentativa ${attempt}/${retries})`);
        const finalParams = {
          ...params,
          model: model
        };
        const response = await aiGenClient.models.generateContent(finalParams);
        console.log(`[Gemini API] Sucesso com o modelo: ${model}`);
        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`[Gemini API - Modelo ${model} - Tentativa ${attempt}/${retries} falhou]:`, error?.message || error);
        
        if (attempt < retries) {
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          console.log(`[Gemini API] Retentando o modelo ${model} em ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        attempt++;
      }
    }
    console.log(`[Gemini API] Modelo ${model} falhou após ${retries} tentativas. Avançando para o próximo modelo da cadeia de fallback...`);
  }
  
  // If we exhausted all fallbacks, throw the last error
  throw lastError || new Error("Falha inesperada no processamento da IA de treino.");
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nkxsqhkxgwpjdcmcetav.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_N62oQfMBES5KX1YK8VKV8w_gbC7lmHv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(compression());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 3000, // Falhar em 3s para liberar para Supabase
  idleTimeoutMillis: 10000,
  statement_timeout: 4000,
  query_timeout: 4000,
  max: 10,
});

const safeParseJson = (val: any, defaultVal: any = []) => {
  if (!val) return defaultVal;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      console.error("[SafeParseJson] Error parsing JSON string:", val, e);
      return defaultVal;
    }
  }
  return val;
};

const getSafeDateTime = (dateStr: any): number => {
  if (!dateStr) return 0;
  if (dateStr instanceof Date) return dateStr.getTime();
  const str = String(dateStr).trim();
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(str)) {
    const sep = str.includes('/') ? '/' : '-';
    const parts = str.split(sep);
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  const t = Date.parse(str);
  return isNaN(t) ? 0 : t;
};

const parseBackupAthleteFields = (a: any) => {
  let injuryHistory = a.injury_history || '';
  let injuries = safeParseJson(a.injuries, []);
  let trainingDays = safeParseJson(a.training_days, [1, 3, 5]);
  let academyDays = Array.isArray(a.academy_days) ? a.academy_days : safeParseJson(a.academy_days, null);
  let courtDays = Array.isArray(a.court_days) ? a.court_days : safeParseJson(a.court_days, null);
  let periodizationStart = a.periodization_start || a.periodizationStart || undefined;
  let periodizationEnd = a.periodization_end || a.periodizationEnd || undefined;
  let dropJumpBackup = [];
  let imtpBackup = [];
  let posturalBackup = [];
  let matches = [];
  let photoUrl = a.photo_url || a.photoUrl || undefined;

  if (a.injury_history && typeof a.injury_history === 'string' && a.injury_history.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(a.injury_history);
      if (parsed && typeof parsed === 'object') {
        if (parsed.hasOwnProperty('legacy') || parsed.hasOwnProperty('injuries')) {
          injuryHistory = parsed.legacy || '';
          if (!injuries || injuries.length === 0) {
            injuries = parsed.injuries || [];
          }
          if ((!a.training_days || a.training_days.length === 0) && parsed.trainingDays) {
            trainingDays = parsed.trainingDays || [1, 3, 5];
          }
        }
        if (parsed.hasOwnProperty('periodizationStart') && parsed.periodizationStart) {
          periodizationStart = parsed.periodizationStart;
        }
        if (parsed.hasOwnProperty('periodizationEnd') && parsed.periodizationEnd) {
          periodizationEnd = parsed.periodizationEnd;
        }
        if (parsed.hasOwnProperty('academyDays') && Array.isArray(parsed.academyDays)) {
          academyDays = parsed.academyDays;
        }
        if (parsed.hasOwnProperty('courtDays') && Array.isArray(parsed.courtDays)) {
          courtDays = parsed.courtDays;
        }
        if (parsed.hasOwnProperty('dropJumpBackup') && Array.isArray(parsed.dropJumpBackup)) {
          dropJumpBackup = parsed.dropJumpBackup;
        }
        if (parsed.hasOwnProperty('imtpBackup') && Array.isArray(parsed.imtpBackup)) {
          imtpBackup = parsed.imtpBackup;
        }
        if (parsed.hasOwnProperty('posturalBackup') && Array.isArray(parsed.posturalBackup)) {
          posturalBackup = parsed.posturalBackup;
        }
        if (parsed.hasOwnProperty('matches') && Array.isArray(parsed.matches)) {
          matches = parsed.matches;
        }
        if (parsed.photoUrl) {
          photoUrl = parsed.photoUrl;
        }
      }
    } catch (e) {
      console.error("[SafeParseJson] Error parsing backup in injury_history:", e);
    }
  }
  
  if (academyDays === null || academyDays === undefined) {
    academyDays = Array.isArray(trainingDays) && trainingDays.length > 0 ? trainingDays : [1, 3, 5];
  }
  if (courtDays === null || courtDays === undefined) {
    courtDays = [2, 4];
  }

  return { injuryHistory, injuries, trainingDays, academyDays, courtDays, periodizationStart, periodizationEnd, dropJumpBackup, imtpBackup, posturalBackup, matches, photoUrl };
};

const serializeBackupAthleteFields = (athlete: any) => {
  const dropJump = athlete.assessments?.dropJump || athlete.dropJumpBackup || [];
  const imtp = athlete.assessments?.imtp || athlete.imtpBackup || [];
  const postural = athlete.assessments?.postural || athlete.posturalBackup || [];
  return JSON.stringify({
    legacy: athlete.injuryHistory || '',
    injuries: athlete.injuries || [],
    trainingDays: athlete.trainingDays || [1, 3, 5],
    academyDays: athlete.academyDays || [],
    courtDays: athlete.courtDays || [],
    periodizationStart: athlete.periodizationStart || '',
    periodizationEnd: athlete.periodizationEnd || '',
    dropJumpBackup: dropJump,
    imtpBackup: imtp,
    posturalBackup: postural,
    matches: athlete.matches || [],
    photoUrl: athlete.photoUrl || athlete.photo_url || ''
  });
};

// Auto-migration helper to ensure columns exist
async function ensureColumns() {
  if (!process.env.DATABASE_URL) return;
  const client = await pool.connect();
  try {
    console.log("Verificando integridade das tabelas...");
    
    // Bioimpedance
    const bioCols = [
      'basal_metabolism', 'metabolic_age', 'bone_mass', 'physique_rating',
      'fat_arm_r', 'fat_arm_l', 'fat_leg_r', 'fat_leg_l', 'fat_trunk',
      'muscle_arm_r', 'muscle_arm_l', 'muscle_leg_r', 'muscle_leg_l', 'muscle_trunk'
    ];
    for (const col of bioCols) {
      await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS ${col} REAL`).catch(() => {});
    }

    // VO2max
    await client.query('ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_ventilation REAL').catch(() => {});

    // Prescribed Exercises
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS rest VARCHAR(50)').catch(() => {});
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS notes TEXT').catch(() => {});
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS pain_level INTEGER').catch(() => {});
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS reps_type VARCHAR(50)').catch(() => {});
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0').catch(() => {});
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS video_url TEXT').catch(() => {});
    await client.query('ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS image_url TEXT').catch(() => {});
    
    // Users
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT \'free\'').catch(() => {});

    // Wellness
    await client.query('ALTER TABLE wellness ALTER COLUMN sleep TYPE REAL USING sleep::real').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS readiness_score INTEGER').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS travel_fatigue INTEGER').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_quality INTEGER').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS menstrual_phase TEXT').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS menstrual_symptoms JSONB').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS hrv REAL').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_hours_formatted TEXT').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_start_time TEXT').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS wake_up_time TEXT').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS calculated_sleep_hours REAL').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS is_match_day BOOLEAN').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS emotional_readiness INTEGER').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS psychological_readiness INTEGER').catch(() => {});
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS psychology_notes TEXT').catch(() => {});

    // Athletes
    await client.query('ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_competitive_level_check').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS photo_url TEXT').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_tournament_mode BOOLEAN DEFAULT FALSE').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS periodization_start TEXT').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS periodization_end TEXT').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS training_days JSONB').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS injuries JSONB').catch(() => {});

  } catch (e: any) {
    console.error("Erro na auto-migração:", e.message);
  } finally {
    client.release();
  }
}

let isDbConnected = false;

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente PostgreSQL inativo:', err?.message || err);
  isDbConnected = false;
});

// Verificação periódica de conexão
setInterval(async () => {
  if (process.env.DATABASE_URL) {
    try {
      const client = await pool.connect();
      client.release();
      if (!isDbConnected) {
        console.log("Conexão com o banco de dados restabelecida.");
        isDbConnected = true;
        await ensureColumns();
      }
    } catch (err: any) {
      const maskedUrl = process.env.DATABASE_URL.substring(0, 15) + "...";
      if (isDbConnected) {
        console.error(`Conexão com o banco de dados perdida. URL: ${maskedUrl} Erro:`, err.message || err);
        isDbConnected = false;
      }
    }
  } else {
    console.error("DATABASE_URL não configurada no ambiente.");
  }
}, 30000);

// Initial check
if (process.env.DATABASE_URL) {
  pool.connect().then(client => {
    client.release();
    isDbConnected = true;
    console.log("Banco de dados conectado.");
    ensureColumns();
  }).catch(err => {
    console.error("Erro inicial de conexão com o banco:", err.message);
  });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const apiRouter = express.Router();

// Auth Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Health check
apiRouter.get('/health', async (req, res) => {
  const dbUrl = process.env.DATABASE_URL || '';
  let host = 'NOT_SET';
  try {
    if (dbUrl) host = new URL(dbUrl).host;
  } catch (e) {}

  let supabase_test = 'pending';
  try {
    const { data, error } = await supabase.from('athletes').select('count', { count: 'exact', head: true });
    supabase_test = error ? `error: ${error.message}` : `ok (count: ${data || 0})`;
  } catch (e: any) {
    supabase_test = `exception: ${e.message}`;
  }
  
  res.json({ 
    status: 'ok', 
    database_configured: !!process.env.DATABASE_URL,
    db_connected: isDbConnected,
    db_host: host,
    supabase_configured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    supabase_test,
    is_stale_host: host === 'db.zycnwaqswrunzptyeaso.supabase.co',
    env: {
      supabase_url: (process.env.VITE_SUPABASE_URL || '').substring(0, 15) + '...',
      node_env: process.env.NODE_ENV,
    }
  });
});

apiRouter.get('/test', (req, res) => {
  res.send('Server is alive');
});

// Auth Routes
apiRouter.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const trimmedUsername = (username || '').trim();
  const trimmedPassword = (password || '').trim();

  console.log(`[LOGIN] Tentativa: usuário=[${trimmedUsername}]`);

  // 1. Hardcoded fallback
  if (trimmedUsername.toLowerCase() === 'leandro' && trimmedPassword === 'techno10') {
    console.log(`[LOGIN] SUCESSO: Hardcoded Coach [${trimmedUsername}]`);
    try {
      const token = jwt.sign({ username: 'Leandro', role: 'coach', plan: 'pro' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ role: 'coach', token, plan: 'pro' });
    } catch (jwtErr: any) {
      console.error("[LOGIN] Erro ao gerar JWT:", jwtErr.message);
      return res.status(500).json({ error: "Erro interno na geração do token." });
    }
  }

  try {
    // 2. Local Database
    if (process.env.DATABASE_URL && isDbConnected) {
      try {
        console.log(`[LOGIN] Buscando no banco local: [${trimmedUsername}]`);
        const userRes = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          let isMatch = false;
          if (user.password && user.password.startsWith('$2a$')) {
            isMatch = await bcrypt.compare(trimmedPassword, user.password);
          } else if (user.password) {
            isMatch = user.password === trimmedPassword;
            if (isMatch) {
              const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
              await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
            }
          }

          if (isMatch) {
            console.log(`[LOGIN] SUCESSO: [${trimmedUsername}] (Banco Local)`);
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role, athleteId: user.athlete_id, plan: user.plan || 'free' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ role: user.role, athleteId: user.athlete_id, token, plan: user.plan || 'free' });
          }
        }

        const athletesRes = await pool.query('SELECT * FROM athletes WHERE LOWER(TRIM(name)) = LOWER($1)', [trimmedUsername]);
        if (athletesRes.rows.length > 0) {
          const athlete = athletesRes.rows[0];
          if (athlete.dob) {
            // Handle both string and Date object
            const dobStr = typeof athlete.dob === 'string' ? athlete.dob : athlete.dob.toISOString().split('T')[0];
            const dobParts = dobStr.split('-');
            if (dobParts.length === 3) {
              const dobDDMMYYYY = `${dobParts[2]}${dobParts[1]}${dobParts[0]}`;
              if (dobDDMMYYYY === trimmedPassword.replace(/\D/g, '')) {
                console.log(`[LOGIN] SUCESSO: [${trimmedUsername}] (DOB Local)`);
                const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
                await pool.query(
                  'INSERT INTO users (id, username, password, role, athlete_id, plan) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
                  [`user-${athlete.id}`, trimmedUsername, hashedPassword, 'athlete', athlete.id, 'free']
                ).catch(e => console.warn("Auto-reg falhou:", e.message));
                const token = jwt.sign({ id: `user-${athlete.id}`, username: trimmedUsername, role: 'athlete', athleteId: athlete.id, plan: 'free' }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ role: 'athlete', athleteId: athlete.id, token, plan: 'free' });
              }
            }
          }
        }
      } catch (localDbErr: any) {
        console.error("[LOGIN] Erro no Banco Local:", localDbErr.message);
      }
    }

    // 3. Supabase Fallback
    console.log(`[LOGIN] Buscando no Supabase: [${trimmedUsername}]`);
    try {
      const { data: sbUser, error: sbUserError } = await supabase
        .from('users')
        .select('*')
        .ilike('username', trimmedUsername)
        .maybeSingle();

      if (sbUser) {
        let isMatch = false;
        if (sbUser.password && sbUser.password.startsWith('$2a$')) {
          isMatch = await bcrypt.compare(trimmedPassword, sbUser.password);
        } else if (sbUser.password) {
          isMatch = sbUser.password === trimmedPassword;
        }

        if (isMatch) {
          console.log(`[LOGIN] SUCESSO: [${trimmedUsername}] (Supabase Users)`);
          const token = jwt.sign({ id: sbUser.id, username: sbUser.username, role: sbUser.role, athleteId: sbUser.athlete_id, plan: sbUser.plan || 'free' }, JWT_SECRET, { expiresIn: '24h' });
          return res.json({ role: sbUser.role, athleteId: sbUser.athlete_id, token, plan: sbUser.plan || 'free' });
        }
      }

      let sbAthlete: any = null;
      const { data: directAth } = await supabase
        .from('athletes')
        .select('*')
        .ilike('name', trimmedUsername)
        .maybeSingle();

      if (directAth) {
        sbAthlete = directAth;
      } else {
        const { data: listAth } = await supabase
          .from('athletes')
          .select('*')
          .ilike('name', `%${trimmedUsername}%`);
        if (listAth && listAth.length > 0) {
          sbAthlete = listAth.find(a => (a.name || '').trim().toLowerCase() === trimmedUsername.toLowerCase()) || listAth[0];
        }
      }

      if (sbAthlete && sbAthlete.dob) {
        // Supabase often returns dates as ISO strings from its client
        const dobStr = typeof sbAthlete.dob === 'string' ? sbAthlete.dob : sbAthlete.dob.toISOString().split('T')[0];
        const dobParts = dobStr.split('-');
        if (dobParts.length === 3) {
          const dobDDMMYYYY = `${dobParts[2]}${dobParts[1]}${dobParts[0]}`;
          if (dobDDMMYYYY === trimmedPassword.replace(/\D/g, '')) {
            console.log(`[LOGIN] SUCESSO: [${trimmedUsername}] (DOB Supabase)`);
            const token = jwt.sign({ id: `user-${sbAthlete.id}`, username: trimmedUsername, role: 'athlete', athleteId: sbAthlete.id, plan: 'free' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ role: 'athlete', athleteId: sbAthlete.id, token, plan: 'free' });
          }
        }
      }
    } catch (sbErr: any) {
      console.error("[LOGIN] Erro Supabase:", sbErr.message);
    }

    console.warn(`[LOGIN] FALHA: Credenciais inválidas para [${trimmedUsername}]`);
    res.status(401).json({ error: 'Credenciais inválidas. Verifique usuário e senha.' });
  } catch (error: any) {
    console.error(`[LOGIN] ERRO FATAL:`, error.message);
    res.status(500).json({ error: "Erro de processamento no servidor. Tente novamente." });
  }
});

// API Routes - PROTECTED
apiRouter.get('/ler', authMiddleware, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  const user = (req as any).user;
  const isAthlete = user.role === 'athlete';
  const athleteId = user.athleteId;

  try {
    const loadFromSupabase = async () => {
        console.log(`[SERVIÇO] Carregando dados via Supabase Fallback... ${isAthlete ? `(Atleta: ${athleteId})` : '(Todos)'}`);

        const fetchTableSafely = async (tableName: string) => {
          try {
            let q = supabase.from(tableName).select('*');
            if (isAthlete && athleteId) {
              q = q.eq('athlete_id', athleteId);
            }
            const { data, error } = await q;
            if (error) {
              console.warn(`[SERVIÇO] Alerta ao carregar tabela '${tableName}' do Supabase:`, error.message);
              return [];
            }
            return data || [];
          } catch (err: any) {
            console.warn(`[SERVIÇO] Exceção ao carregar tabela '${tableName}' do Supabase:`, err.message || err);
            return [];
          }
        };

        let query = supabase
          .from('athletes')
          .select(`
            *,
            wellness (*),
            external_sessions (*),
            workouts (
              *,
              prescribed_exercises (
                *,
                performed_sets (*)
              )
            )
          `);

        if (isAthlete && athleteId) {
          query = query.eq('id', athleteId);
        }

        const { data: athletes, error } = await query.order('name', { ascending: true });

        if (error) {
          console.error("[SERVIÇO] Erro Supabase Fallback:", error.message);
          throw new Error(`Supabase Fallback failed: ${error.message}`);
        }

        const [
          bioimpedanceData,
          isometricStrengthData,
          cmjData,
          dropJumpData,
          vo2maxData,
          speedData,
          imtpData
        ] = await Promise.all([
          fetchTableSafely('bioimpedance'),
          fetchTableSafely('isometric_strength'),
          fetchTableSafely('cmj'),
          fetchTableSafely('drop_jump'),
          fetchTableSafely('vo2max'),
          fetchTableSafely('speed'),
          fetchTableSafely('imtp')
        ]);

        const mapByAthleteId = (rows: any[]) => {
          const grouped: Map<string, any[]> = new Map();
          rows.forEach(item => {
            if (item && item.athlete_id) {
              const list = grouped.get(item.athlete_id) || [];
              list.push(item);
              grouped.set(item.athlete_id, list);
            }
          });
          return grouped;
        };

        const bioMap = mapByAthleteId(bioimpedanceData);
        const strengthMap = mapByAthleteId(isometricStrengthData);
        const cmjMap = mapByAthleteId(cmjData);
        const dropJumpMap = mapByAthleteId(dropJumpData);
        const vo2maxMap = mapByAthleteId(vo2maxData);
        const speedMap = mapByAthleteId(speedData);
        const imtpMap = mapByAthleteId(imtpData);

        return (athletes || []).map((a: any) => {
          const parsedFields = parseBackupAthleteFields(a);
          return {
            ...a,
            photoUrl: a.photo_url || a.photoUrl || parsedFields.photoUrl || undefined,
            gender: a.gender || 'M',
            weeklyFrequency: a.weekly_frequency,
            competitiveLevel: a.competitive_level,
            injuryHistory: parsedFields.injuryHistory,
            isTournamentMode: a.is_tournament_mode,
            periodizationStart: a.periodization_start || parsedFields.periodizationStart || undefined,
            periodizationEnd: a.periodization_end || parsedFields.periodizationEnd || undefined,
            trainingDays: parsedFields.trainingDays,
            academyDays: parsedFields.academyDays,
            courtDays: parsedFields.courtDays,
            injuries: parsedFields.injuries,
            matches: parsedFields.matches || [],
            wellness: (a.wellness || []).map((w: any) => ({
              ...w,
              sleep: w.calculated_sleep_hours !== undefined && w.calculated_sleep_hours !== null ? Number(w.calculated_sleep_hours) : (typeof w.sleep === 'number' ? w.sleep : parseFloat(w.sleep) || 0),
              cognitiveLoad: w.cognitive_load,
              readinessScore: w.readiness_score,
              travelFatigue: w.travel_fatigue,
              sleepQuality: w.sleep_quality,
              menstrualPhase: w.menstrual_phase || "Nenhuma",
              menstrualSymptoms: Array.isArray(w.menstrual_symptoms)
                ? w.menstrual_symptoms
                : typeof w.menstrual_symptoms === 'string'
                ? JSON.parse(w.menstrual_symptoms)
                : [],
              hrv: w.hrv,
              sleepHoursFormatted: w.sleep_hours_formatted,
              sleepStartTime: w.sleep_start_time || w.sleepStartTime,
              wakeUpTime: w.wake_up_time || w.wakeUpTime,
              calculatedSleepHours: w.calculated_sleep_hours ?? w.calculatedSleepHours,
              isMatchDay: w.is_match_day ?? w.isMatchDay ?? false,
              emotionalReadiness: w.emotional_readiness ?? w.emotionalReadiness,
              psychologicalReadiness: w.psychological_readiness ?? w.psychologicalReadiness,
              psychologyNotes: w.psychology_notes || w.psychologyNotes
            })),
            externalSessions: (a.external_sessions || []).map((es: any) => ({
              ...es,
              durationMinutes: es.duration_minutes
            })),
            workouts: (a.workouts || []).map((wk: any) => ({
              ...wk,
              durationMinutes: wk.duration_minutes,
              totalLoad: wk.total_load,
              trainerNotes: wk.trainer_notes,
              exercises: (wk.prescribed_exercises || []).map((ex: any) => ({ 
                ...ex, 
                muscleGroup: ex.muscle_group,
                painLevel: ex.pain_level,
                repsType: ex.reps_type || 'reps',
                videoUrl: ex.video_url || '',
                imageUrl: ex.image_url || '',
                performedSets: (ex.performed_sets || []).map((s: any) => ({
                  ...s,
                  isCompleted: s.is_completed ?? false
                }))
              })).sort((x: any, y: any) => (x.order_index || 0) - (y.order_index || 0))
            })),
            assessments: {
              bioimpedance: (bioMap.get(a.id) || []).map((b: any) => ({ ...b, fatPercentage: b.fat_percentage, muscleMass: b.muscle_mass, visceralFat: b.visceral_fat, hydration: b.hydration, basalMetabolism: b.basal_metabolism, metabolicAge: b.metabolic_age, boneMass: b.bone_mass, physiqueRating: b.physique_rating, fatArmR: b.fat_arm_r, fatArmL: b.fat_arm_l, fatLegR: b.fat_leg_r, fatLegL: b.fat_leg_l, fatTrunk: b.fat_trunk, muscleArmR: b.muscle_arm_r, muscleArmL: b.muscle_arm_l, muscleLegR: b.muscle_leg_r, muscleLegL: b.muscle_leg_l, muscleTrunk: b.muscle_trunk }))
                .sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
              isometricStrength: (strengthMap.get(a.id) || []).map((s: any) => ({ ...s, halfSquatKgf: s.half_squat_kgf, quadricepsR: s.quadriceps_r, quadricepsL: s.quadriceps_l, hamstringsR: s.hamstrings_r, hamstringsL: s.hamstrings_l, iqRatioR: s.iq_ratio_r, iqRatioL: s.iq_ratio_l }))
                .sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
              cmj: (cmjMap.get(a.id) || []).map((c: any) => ({ ...c, rsi: c.rsi, flightTime: c.flight_time, weight: c.weight, averageForce: c.average_force ?? c.averageForce ?? 0 }))
                .sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
              dropJump: (() => {
                const dbDj = (dropJumpMap.get(a.id) || []).map((dj: any) => ({
                  ...dj,
                  id: dj.id,
                  date: dj.date,
                  weight: dj.weight ?? 0,
                  dropHeight: dj.drop_height !== undefined ? dj.drop_height : dj.dropHeight,
                  jumpHeight: dj.jump_height !== undefined ? dj.jump_height : dj.jumpHeight,
                  flightTime: dj.flight_time !== undefined ? dj.flight_time : dj.flightTime,
                  contactTime: dj.contact_time !== undefined ? dj.contact_time : dj.contactTime,
                  meanForce: dj.mean_force !== undefined ? dj.mean_force : dj.meanForce,
                  meanPower: dj.mean_power !== undefined ? dj.mean_power : dj.meanPower,
                  stiffness: dj.stiffness !== undefined ? dj.stiffness : dj.stiffness,
                  rsi: dj.rsi,
                  observations: dj.observations
                }));
                const bkDj = parsedFields.dropJumpBackup || [];
                const mergedMap = new Map();
                for (const item of bkDj) {
                  if (item && item.id) mergedMap.set(item.id, item);
                }
                for (const item of dbDj) {
                  if (item && item.id) mergedMap.set(item.id, item);
                }
                return Array.from(mergedMap.values()).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
              })(),
              vo2max: (vo2maxMap.get(a.id) || []).map((v: any) => ({ ...v, vam: v.vam, maxSpeed: v.max_speed, maxHeartRate: v.max_heart_rate, thresholdHeartRate: v.threshold_heart_rate, thresholdSpeed: v.threshold_speed, rec10s: v.rec_10s, rec30s: v.rec_30s, rec60s: v.rec_60s, maxVentilation: v.max_ventilation }))
                .sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
              speed: (speedMap.get(a.id) || []).map((sp: any) => ({ ...sp, time5m: sp.time_5m, time10m: sp.time_10m, time20m: sp.time_20m, time30m: sp.time_30m, speed5m: sp.speed_5m, speed10m: sp.speed_10m, speed20m: sp.speed_20m, speed30m: sp.speed_30m }))
                .sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
              imtp: (() => {
                const dbIm = (imtpMap.get(a.id) || []).map((im: any) => ({
                  ...im,
                  id: im.id,
                  date: im.date,
                  weight: im.weight,
                  peakForce: im.peak_force,
                  relativePeakForce: im.relative_peak_force,
                  timeToPeakForce: im.time_to_peak_force,
                  meanForce: im.mean_force,
                  rfdPeak: im.rfd_peak,
                  rfd100: im.rfd_100,
                  rfd200: im.rfd_200,
                  rfd300: im.rfd_300,
                  impulsePeak: im.impulse_peak,
                  impulse100: im.impulse_100,
                  impulse200: im.impulse_200,
                  impulse300: im.impulse_300,
                  aiDetails: im.ai_details ? (typeof im.ai_details === 'string' ? JSON.parse(im.ai_details) : im.ai_details) : undefined,
                  observations: im.observations
                }));
                const bkIm = parsedFields.imtpBackup || [];
                const mergedMap = new Map();
                for (const item of bkIm) {
                  if (item && item.id) mergedMap.set(item.id, item);
                }
                for (const item of dbIm) {
                  if (item && item.id) mergedMap.set(item.id, item);
                }
                return Array.from(mergedMap.values()).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
              })(),
              postural: (() => {
                const bkPostural = parsedFields.posturalBackup || [];
                return [...bkPostural].sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
              })()
            }
          };
        });
    };

    if (!isDbConnected || !process.env.DATABASE_URL) {
      console.warn("[SERVIÇO] Local DB Off. Redirecionando para Supabase...");
      const formatted = await loadFromSupabase();
      return res.json(formatted);
    }

    console.log(`[SERVIÇO] Buscando atletas no banco local... ${isAthlete ? `(Atleta: ${athleteId})` : '(Todos)'}`);
    
    // Condições WHERE para otimização
    const whereClause = isAthlete && athleteId ? 'WHERE athlete_id = $1' : '';
    const params = isAthlete && athleteId ? [athleteId] : [];

    let athletesRes, wellnessRes, workoutsRes, exercisesRes, performedSetsRes, 
        strengthRes, cmjRes, vo2Res, bioRes, speedRes, externalRes, dropJumpRes, imtpRes;

    try {
      const dbQueries = await Promise.all([
        pool.query(`SELECT * FROM athletes ${isAthlete && athleteId ? 'WHERE id = $1' : ''} ORDER BY name ASC`, params),
        pool.query(`SELECT * FROM wellness ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM workouts ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM prescribed_exercises ${isAthlete && athleteId ? 'WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1)' : ''}`, params),
        pool.query(`SELECT * FROM performed_sets ${isAthlete && athleteId ? 'WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1))' : ''}`, params),
        pool.query(`SELECT * FROM isometric_strength ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM cmj ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM vo2max ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM bioimpedance ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM speed ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM external_sessions ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM drop_jump ${whereClause} ORDER BY date DESC`, params),
        pool.query(`SELECT * FROM imtp ${whereClause} ORDER BY date DESC`, params)
      ]);
      
      athletesRes = dbQueries[0];
      wellnessRes = dbQueries[1];
      workoutsRes = dbQueries[2];
      exercisesRes = dbQueries[3];
      performedSetsRes = dbQueries[4];
      strengthRes = dbQueries[5];
      cmjRes = dbQueries[6];
      vo2Res = dbQueries[7];
      bioRes = dbQueries[8];
      speedRes = dbQueries[9];
      externalRes = dbQueries[10];
      dropJumpRes = dbQueries[11];
      imtpRes = dbQueries[12];
    } catch (dbError: any) {
      console.warn("[SERVIÇO] Falha ao ler dados de Postgres local (Acionando Fallback para Supabase):", dbError.message);
      const formatted = await loadFromSupabase();
      return res.json(formatted);
    }

    // SE NÃO HOUVER ATLETAS NO BANCO LOCAL, TENTAR SUPABASE
    if (athletesRes.rows.length === 0) {
      console.warn("[SERVIÇO] Banco local conectado mas está VAZIO. Tentando Supabase...");
      const formatted = await loadFromSupabase();
      return res.json(formatted);
    }

    const groupById = (rows: any[], key = 'athlete_id') => {
      const grouped: any = {};
      rows.forEach(r => {
        if (!grouped[r[key]]) grouped[r[key]] = [];
        grouped[r[key]].push(r);
      });
      return grouped;
    };

    const setsByEx = groupById(performedSetsRes.rows, 'exercise_id');
    const exByWorkout = groupById(exercisesRes.rows, 'workout_id');
    const wellnessByAth = groupById(wellnessRes.rows);
    const workoutsByAth = groupById(workoutsRes.rows);
    const strengthByAth = groupById(strengthRes.rows);
    const cmjByAth = groupById(cmjRes.rows);
    const vo2ByAth = groupById(vo2Res.rows);
    const bioByAth = groupById(bioRes.rows);
    const speedByAth = groupById(speedRes.rows);
    const externalByAth = groupById(externalRes.rows);
    const dropJumpByAth = groupById(dropJumpRes.rows);
    const imtpByAth = groupById(imtpRes.rows);

    const athletes = athletesRes.rows.map(a => {
      const parsedFields = parseBackupAthleteFields(a);
      return {
        id: a.id,
        name: a.name,
        photoUrl: a.photo_url || a.photoUrl || parsedFields.photoUrl || undefined,
        dob: a.dob,
        gender: a.gender || 'M',
        modality: a.modality,
        competitiveLevel: a.competitive_level,
        position: a.position,
        goal: a.goal,
        weeklyFrequency: a.weekly_frequency,
        injuryHistory: parsedFields.injuryHistory,
        isTournamentMode: a.is_tournament_mode,
        periodizationStart: a.periodization_start || parsedFields.periodizationStart || undefined,
        periodizationEnd: a.periodization_end || parsedFields.periodizationEnd || undefined,
        trainingDays: parsedFields.trainingDays,
        academyDays: parsedFields.academyDays,
        courtDays: parsedFields.courtDays,
        injuries: parsedFields.injuries,
        matches: parsedFields.matches || [],
      wellness: (wellnessByAth[a.id] || []).map((w: any) => ({
        ...w,
        cognitiveLoad: w.cognitive_load,
        readinessScore: w.readiness_score,
        travelFatigue: w.travel_fatigue,
        sleepQuality: w.sleep_quality,
        menstrualPhase: w.menstrual_phase || "Nenhuma",
        menstrualSymptoms: Array.isArray(w.menstrual_symptoms)
          ? w.menstrual_symptoms
          : typeof w.menstrual_symptoms === 'string'
          ? JSON.parse(w.menstrual_symptoms)
          : [],
        hrv: w.hrv,
        sleepHoursFormatted: w.sleep_hours_formatted,
        sleepStartTime: w.sleep_start_time || w.sleepStartTime,
        wakeUpTime: w.wake_up_time || w.wakeUpTime,
        calculatedSleepHours: w.calculated_sleep_hours ?? w.calculatedSleepHours,
        isMatchDay: w.is_match_day ?? w.isMatchDay ?? false,
        emotionalReadiness: w.emotional_readiness ?? w.emotionalReadiness,
        psychologicalReadiness: w.psychological_readiness ?? w.psychologicalReadiness,
        psychologyNotes: w.psychology_notes || w.psychologyNotes
      })),
      externalSessions: (externalByAth[a.id] || []).map((es: any) => ({
        ...es,
        durationMinutes: es.duration_minutes
      })),
      workouts: (workoutsByAth[a.id] || []).map((wk: any) => ({
        ...wk,
        durationMinutes: wk.duration_minutes,
        totalLoad: wk.total_load,
        trainerNotes: wk.trainer_notes,
        exercises: (exByWorkout[wk.id] || []).map((ex: any) => ({ 
          ...ex, 
          muscleGroup: ex.muscle_group,
          painLevel: ex.pain_level,
          rest: ex.rest,
          notes: ex.notes,
          repsType: ex.reps_type || 'reps',
          performedSets: (setsByEx[ex.id] || []).map((s: any) => ({
            ...s,
            isCompleted: s.is_completed ?? false
          }))
        })).sort((x: any, y: any) => (x.order_index || 0) - (y.order_index || 0))
      })),
      assessments: {
        bioimpedance: (bioByAth[a.id] || []).map((b: any) => ({
            ...b, 
            fatPercentage: b.fat_percentage,
            muscleMass: b.muscle_mass,
            visceralFat: b.visceral_fat,
            hydration: b.hydration,
            basalMetabolism: b.basal_metabolism,
            metabolicAge: b.metabolic_age,
            boneMass: b.bone_mass,
            physiqueRating: b.physique_rating,
            fatArmR: b.fat_arm_r,
            fatArmL: b.fat_arm_l,
            fatLegR: b.fat_leg_r,
            fatLegL: b.fat_leg_l,
            fatTrunk: b.fat_trunk,
            muscleArmR: b.muscle_arm_r,
            muscleArmL: b.muscle_arm_l,
            muscleLegR: b.muscle_leg_r,
            muscleLegL: b.muscle_leg_l,
            muscleTrunk: b.muscle_trunk
        })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
        isometricStrength: (strengthByAth[a.id] || []).map((s: any) => ({
            ...s, 
            iqRatioR: s.iq_ratio_r, 
            iqRatioL: s.iq_ratio_l, 
            quadricepsR: s.quadriceps_r, 
            quadricepsL: s.quadriceps_l, 
            hamstringsR: s.hamstrings_r, 
            hamstringsL: s.hamstrings_l,
            halfSquatKgf: s.half_squat_kgf
        })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
        cmj: (cmjByAth[a.id] || []).map((c: any) => ({
            ...c, 
            flightTime: c.flight_time,
            rsi: c.rsi,
            weight: c.weight,
            averageForce: c.average_force ?? c.averageForce ?? 0
        })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
        dropJump: (() => {
          const dbDj = (dropJumpByAth[a.id] || []).map((dj: any) => ({
            ...dj,
            id: dj.id,
            date: dj.date,
            weight: dj.weight ?? 0,
            dropHeight: dj.drop_height !== undefined ? dj.drop_height : dj.dropHeight,
            jumpHeight: dj.jump_height !== undefined ? dj.jump_height : dj.jumpHeight,
            flightTime: dj.flight_time !== undefined ? dj.flight_time : dj.flightTime,
            contactTime: dj.contact_time !== undefined ? dj.contact_time : dj.contactTime,
            meanForce: dj.mean_force !== undefined ? dj.mean_force : dj.meanForce,
            meanPower: dj.mean_power !== undefined ? dj.mean_power : dj.meanPower,
            stiffness: dj.stiffness !== undefined ? dj.stiffness : dj.stiffness,
            rsi: dj.rsi,
            observations: dj.observations
          }));
          const bkDj = parsedFields.dropJumpBackup || [];
          const mergedMap = new Map();
          for (const item of bkDj) {
            if (item && item.id) mergedMap.set(item.id, item);
          }
          for (const item of dbDj) {
            if (item && item.id) mergedMap.set(item.id, item);
          }
          return Array.from(mergedMap.values()).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
        })(),
        vo2max: (vo2ByAth[a.id] || []).map((v: any) => ({
            ...v, 
            maxSpeed: v.max_speed,
            maxHeartRate: v.max_heart_rate,
            thresholdHeartRate: v.threshold_heart_rate,
            thresholdSpeed: v.threshold_speed,
            vam: v.vam,
            rec10s: v.rec_10s,
            rec30s: v.rec_30s,
            rec60s: v.rec_60s,
            maxVentilation: v.max_ventilation,
            score: v.score
        })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
        speed: (speedByAth[a.id] || []).map((sp: any) => ({
            ...sp,
            time5m: sp.time_5m,
            time10m: sp.time_10m,
            time20m: sp.time_20m,
            time30m: sp.time_30m,
            speed5m: sp.speed_5m,
            speed10m: sp.speed_10m,
            speed20m: sp.speed_20m,
            speed30m: sp.speed_30m
        })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
        imtp: (() => {
          const dbIm = (imtpByAth[a.id] || []).map((im: any) => ({
            ...im,
            id: im.id,
            date: im.date,
            weight: im.weight,
            peakForce: im.peak_force,
            relativePeakForce: im.relative_peak_force,
            timeToPeakForce: im.time_to_peak_force,
            meanForce: im.mean_force,
            rfdPeak: im.rfd_peak,
            rfd100: im.rfd_100,
            rfd200: im.rfd_200,
            rfd300: im.rfd_300,
            impulsePeak: im.impulse_peak,
            impulse100: im.impulse_100,
            impulse200: im.impulse_200,
            impulse300: im.impulse_300,
            aiDetails: im.ai_details ? (typeof im.ai_details === 'string' ? JSON.parse(im.ai_details) : im.ai_details) : undefined,
            observations: im.observations
          }));
          const bkIm = parsedFields.imtpBackup || [];
          const mergedMap = new Map();
          for (const item of bkIm) {
            if (item && item.id) mergedMap.set(item.id, item);
          }
          for (const item of dbIm) {
            if (item && item.id) mergedMap.set(item.id, item);
          }
          return Array.from(mergedMap.values()).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
        })(),
        postural: (() => {
          const bkPostural = parsedFields.posturalBackup || [];
          return [...bkPostural].sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
        })()
      }
    }; });

    res.json(athletes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/salvar', authMiddleware, async (req, res) => {
  const athletes = req.body;
  
  // Tentar reconectar de forma assíncrona se não estiver conectado, sem bloquear a requisição atual
  if (!isDbConnected && process.env.DATABASE_URL) {
    pool.connect().then(client => {
      client.release();
      isDbConnected = true;
      console.log("Reconexão assíncrona bem-sucedida durante /salvar");
      ensureColumns();
    }).catch(err => {
      // Ignorar erro em background para não poluir o console excessivamente
    });
  }

  // Definimos o helper para encapsular a lógica de salvamento via REST Proxy
  const doSupabaseProxyFallback = async () => {
    const maskedUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + "..." : "NÃO DEFINIDA";
    console.warn(`Express API: Utilizando o Supabase REST Proxy para sincronizar os dados (${maskedUrl})...`);
    
    try {
      for (const athlete of athletes) {
        // Helper para upsert resiliente que remove colunas que falham (caso o schema esteja desatualizado)
        const safeUpsert = async (table: string, data: any) => {
          const isArray = Array.isArray(data);
          let attemptData = isArray ? data.map((item: any) => ({ ...item })) : { ...data };
          let lastError;
          for (let i = 0; i < 12; i++) {
            const { error } = await supabase.from(table).upsert(attemptData);
            if (!error) return { error: null };
            lastError = error;

            console.warn(`[SafeSync] Tentativa ${i + 1} de salvar na tabela '${table}' falhou. Erro: ${error.message} (Código: ${error.code})`);

            const isMissingCol = error.code === '42703' || error.code === 'PGRST204' ||
                               (error.message && (error.message.includes('column') || error.message.includes('Column')) &&
                                                 (error.message.includes('not found') || error.message.includes('cache')));

            if (isMissingCol) {
               const match = error.message.match(/find the ['"]([a-z0-9_]+)['"] column/i) ||
                             error.message.match(/['"]([a-z0-9_]+)['"]\s+column/i) ||
                             error.message.match(/column\s+['"]([a-z0-9_]+)['"]/i) ||
                             error.message.match(/column\s+([a-z0-9_]+)/i);

               if (match && match[1] && match[1] !== table) {
                 const col = match[1];
                 console.warn(`[SafeSync] Removendo coluna inexistente '${col}' da tabela '${table}' e tentando novamente.`);
                 if (isArray) {
                   for (const item of attemptData) {
                     delete item[col];
                   }
                 } else {
                   delete attemptData[col];
                 }
                 continue;
               } else {
                 const commonMissingCols = [
                   'photo_url', 'photoUrl', 'injuries', 'training_days', 'is_tournament_mode',
                   'periodization_start', 'periodization_end', 'weekly_frequency',
                   'pain_level', 'rest', 'notes',
                   'ai_details', 'observations', 'cognitive_load', 'travel_fatigue', 'sleep_quality',
                   'sleep_start_time', 'wake_up_time', 'calculated_sleep_hours', 'is_match_day',
                   'emotional_readiness', 'psychological_readiness', 'psychology_notes',
                   'menstrual_phase', 'menstrual_symptoms', 'hrv', 'sleep_hours_formatted'
                 ];
                 let removed = false;
                 for (const col of commonMissingCols) {
                   if (error.message.includes(col)) {
                     console.warn(`[SafeSync] Heurística: Removendo '${col}' de '${table}' por correspondência de texto.`);
                     if (isArray) {
                       for (const item of attemptData) {
                         if (item[col] !== undefined) {
                           delete item[col];
                           removed = true;
                         }
                       }
                     } else {
                       if (attemptData[col] !== undefined) {
                         delete attemptData[col];
                         removed = true;
                       }
                     }
                     if (removed) break;
                   }
                 }
                 if (removed) continue;
               }
            }
            break;
          }
          return { error: lastError };
        };

        // Upsert do atleta base
        const { error: aErr } = await safeUpsert('athletes', {
          id: athlete.id,
          name: athlete.name,
          photo_url: athlete.photoUrl || athlete.photo_url || null,
          dob: athlete.dob || new Date().toISOString().split('T')[0],
          gender: athlete.gender || 'M',
          modality: athlete.modality || '',
          competitive_level: athlete.competitiveLevel || 'amador',
          position: athlete.position || '',
          injury_history: serializeBackupAthleteFields(athlete),
          goal: athlete.goal || 'Performance',
          weekly_frequency: athlete.weeklyFrequency || athlete.weekly_frequency || (athlete.trainingDays?.length || 3),
          is_tournament_mode: athlete.isTournamentMode ?? false,
          periodization_start: athlete.periodizationStart ?? null,
          periodization_end: athlete.periodizationEnd ?? null,
          training_days: athlete.trainingDays || [],
          injuries: athlete.injuries || [],
          updated_at: new Date().toISOString()
        });
        if (aErr) throw aErr;

        if (athlete.id === 'meta-custom-library-exercises') {
          continue; // Meta-atleta não possui wellness, treinos ou avaliações adicionais
        }

        // Upsert Wellness
        if (athlete.wellness) {
           const incomingWlIds = (athlete.wellness || []).map((w: any) => w.id).filter((id: any) => id);
           if (incomingWlIds.length > 0) {
             const { error: delErr } = await supabase.from('wellness').delete().eq('athlete_id', athlete.id).not('id', 'in', `(${incomingWlIds.join(',')})`);
             if (delErr) {
               console.error(`[Supabase Proxy] Erro ao deletar wellness órfãos do atleta ${athlete.id}:`, delErr);
               throw delErr;
             }
           } else {
             const { error: delErr } = await supabase.from('wellness').delete().eq('athlete_id', athlete.id);
             if (delErr) throw delErr;
           }
           if (athlete.wellness.length > 0) {
             const { error: upErr } = await safeUpsert('wellness', athlete.wellness.map((w: any) => ({
               id: w.id || `wl-${Date.now()}-${Math.random()}`,
               athlete_id: athlete.id,
               date: w.date,
               fatigue: safeNum(w.fatigue, 0),
               sleep: Math.round(safeNum(w.sleep, 0)),
               stress: safeNum(w.stress, 0),
               soreness: w.soreness ?? 0,
               mood: w.mood ?? 0,
               cognitive_load: w.cognitiveLoad ?? 0,
               readiness_score: w.readinessScore ?? 0,
               travel_fatigue: w.travelFatigue ?? 0,
               sleep_quality: w.sleepQuality ?? 0,
                menstrual_phase: w.menstrualPhase || 'Nenhuma',
                menstrual_symptoms: w.menstrualSymptoms || [],
                hrv: w.hrv ?? null,
                sleep_hours_formatted: w.sleepHoursFormatted || null,
                sleep_start_time: w.sleepStartTime || null,
                wake_up_time: w.wakeUpTime || null,
                calculated_sleep_hours: w.calculatedSleepHours !== undefined && w.calculatedSleepHours !== null ? safeNum(w.calculatedSleepHours, 0) : safeNum(w.sleep, 0),
                is_match_day: w.isMatchDay ?? false,
                emotional_readiness: w.emotionalReadiness ?? null,
                psychological_readiness: w.psychologicalReadiness ?? null,
                psychology_notes: w.psychologyNotes || null
             })));
             if (upErr) throw upErr;
           }
        }

        // Upsert Sessions
        if (athlete.externalSessions) {
           const incomingSessIds = (athlete.externalSessions || []).map((es: any) => es.id).filter((id: any) => id);
           if (incomingSessIds.length > 0) {
             const { error: delErr } = await supabase.from('external_sessions').delete().eq('athlete_id', athlete.id).not('id', 'in', `(${incomingSessIds.join(',')})`);
             if (delErr) {
               console.error(`[Supabase Proxy] Erro ao deletar sessões órfãs do atleta ${athlete.id}:`, delErr);
               throw delErr;
             }
           } else {
             const { error: delErr } = await supabase.from('external_sessions').delete().eq('athlete_id', athlete.id);
             if (delErr) throw delErr;
           }
           if (athlete.externalSessions.length > 0) {
             const { error: upErr } = await safeUpsert('external_sessions', athlete.externalSessions.map((es: any) => {
               const dur = es.durationMinutes ?? es.duration_minutes ?? 0;
               const rpeVal = es.rpe ?? 0;
               const calculatedLoad = es.load ?? (dur * rpeVal);
               return {
                 id: es.id || `es-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                 athlete_id: athlete.id,
                 date: es.date,
                 type: es.type || 'tecnico',
                 duration_minutes: dur,
                 rpe: rpeVal,
                 notes: es.notes || '',
                 load: calculatedLoad
               };
             }));
             if (upErr) throw upErr;
           }
        }

        // Upsert Workouts
        const incomingWkIds = (athlete.workouts || []).map((wk: any) => wk.id).filter((id: any) => id);
        const { data: existingWks } = await supabase.from('workouts').select('id').eq('athlete_id', athlete.id);
        const toDeleteWkIds = (existingWks || []).filter(w => !incomingWkIds.includes(w.id)).map(w => w.id);
        if (toDeleteWkIds.length > 0) {
          for (const idToDelete of toDeleteWkIds) {
            const { data: exercises } = await supabase.from('prescribed_exercises').select('id').eq('workout_id', idToDelete);
            if (exercises && exercises.length > 0) {
              const { error: setDelErr } = await supabase.from('performed_sets').delete().in('exercise_id', exercises.map(e => e.id));
              if (setDelErr) throw setDelErr;
              const { error: exDelErr } = await supabase.from('prescribed_exercises').delete().eq('workout_id', idToDelete);
              if (exDelErr) throw exDelErr;
            }
            const { error: wkDelErr } = await supabase.from('workouts').delete().eq('id', idToDelete);
            if (wkDelErr) throw wkDelErr;
          }
        }

        if (athlete.workouts?.length > 0) {
           for (const wk of athlete.workouts) {
             if (!wk.id) wk.id = `wk-${Date.now()}-${Math.random()}`;
             const { error: wkUpErr } = await safeUpsert('workouts', {
               id: wk.id,
               athlete_id: athlete.id,
               date: wk.date,
               name: wk.name || 'Treino',
               phase: wk.phase ?? null,
               status: wk.status ?? 'planned',
               rpe: wk.rpe ?? 0,
               total_load: wk.totalLoad ?? 0,
               duration_minutes: wk.durationMinutes ?? 0,
               monotony: wk.monotony ?? 0,
               strain: wk.strain ?? 0,
               feedback: wk.feedback ?? null,
               trainer_notes: wk.trainerNotes ?? null
             });
             if (wkUpErr) throw wkUpErr;

             if (wk.exercises?.length > 0) {
               const { data: existingEx } = await supabase.from('prescribed_exercises').select('id').eq('workout_id', wk.id);
               const currentExIds = wk.exercises.map((e: any) => e.id);
               const toDeleteExIds = (existingEx || []).filter(e => !currentExIds.includes(e.id)).map(e => e.id);
               if (toDeleteExIds.length > 0) {
                 const { error: setDelErr } = await supabase.from('performed_sets').delete().in('exercise_id', toDeleteExIds);
                 if (setDelErr) throw setDelErr;
                 const { error: exDelErr } = await supabase.from('prescribed_exercises').delete().in('id', toDeleteExIds);
                 if (exDelErr) throw exDelErr;
               }

               const exercisesList = wk.exercises || [];
               for (let idx = 0; idx < exercisesList.length; idx++) {
                 const ex = exercisesList[idx];
                 if (!ex.id) ex.id = `ex-${Date.now()}-${Math.random()}`;
                 const { error: exUpErr } = await safeUpsert('prescribed_exercises', {
                   id: ex.id,
                   workout_id: wk.id,
                   name: ex.name || 'Exercício',
                   muscle_group: ex.muscleGroup ?? null,
                   sets: parseInt(ex.sets) || 0,
                   reps: ex.reps ?? '0',
                   weight: ex.weight ?? '0',
                   rest: ex.rest ?? null,
                   notes: ex.notes ?? null,
                   pain_level: ex.painLevel ? Math.round(Number(ex.painLevel)) : null,
                   reps_type: ex.repsType ?? 'reps',
                   order_index: idx,
                   video_url: ex.videoUrl ?? null,
                   image_url: ex.imageUrl ?? null
                 });
                 if (exUpErr) throw exUpErr;

                 if (ex.performedSets) {
                   const { data: existingSets } = await supabase.from('performed_sets').select('id').eq('exercise_id', ex.id);
                   const currentSetIds = ex.performedSets.map((s: any) => s.id).filter((id: any) => id);
                   const toDeleteSetIds = (existingSets || []).filter(s => !currentSetIds.includes(s.id)).map(s => s.id);
                   if (toDeleteSetIds.length > 0) {
                     const { error: setDelErr } = await supabase.from('performed_sets').delete().in('id', toDeleteSetIds);
                     if (setDelErr) throw setDelErr;
                   }
                   if (ex.performedSets.length > 0) {
                     const { error: setUpErr } = await safeUpsert('performed_sets', ex.performedSets.map((s: any) => ({
                       id: s.id || `s-${Date.now()}-${Math.random()}`,
                       exercise_id: ex.id,
                       reps: s.reps ?? 0,
                       weight: s.weight ?? 0,
                       rpe: s.rpe ?? 0,
                        is_completed: s.isCompleted ?? false
                     })));
                     if (setUpErr) throw setUpErr;
                   }
                 }
               }
             } else {
               const { data: exercises } = await supabase.from('prescribed_exercises').select('id').eq('workout_id', wk.id);
               if (exercises && exercises.length > 0) {
                 const { error: setDelErr } = await supabase.from('performed_sets').delete().in('exercise_id', exercises.map(e => e.id));
                 if (setDelErr) throw setDelErr;
                 const { error: exDelErr } = await supabase.from('prescribed_exercises').delete().eq('workout_id', wk.id);
                  if (exDelErr) throw exDelErr;
                }
              }
            }
         }

         // Upsert Assessments
         if (athlete.assessments) {
          const { bioimpedance, isometricStrength, cmj, dropJump, vo2max, speed, imtp } = athlete.assessments;
          const assessmentTables = [
            { table: 'bioimpedance', items: bioimpedance },
            { table: 'isometric_strength', items: isometricStrength },
            { table: 'cmj', items: cmj },
            { table: 'drop_jump', items: dropJump },
            { table: 'vo2max', items: vo2max },
            { table: 'speed', items: speed },
            { table: 'imtp', items: imtp }
          ];

          for (const { table, items } of assessmentTables) {
             if (items) {
               const incomingIds = (items || []).map(i => i.id).filter(id => id);
                try {
                  if (incomingIds.length > 0) {
                    const { error: delErr } = await supabase.from(table).delete().eq('athlete_id', athlete.id).not('id', 'in', `(${incomingIds.join(',')})`);
                    if (delErr) {
                      console.error(`[Supabase Proxy] Erro ao deletar assessments órfãos do atleta ${athlete.id} na tabela ${table}:`, delErr);
                      throw delErr;
                    }
                  } else {
                    const { error: delErr } = await supabase.from(table).delete().eq('athlete_id', athlete.id);
                    if (delErr) throw delErr;
                  }
                } catch (err: any) {
                  console.warn(`[Supabase Proxy] Erro ao limpar ${table}. Pode ser que a tabela não exista ainda.`, err.message);
                }
             }
          }

          if (bioimpedance?.length > 0) {
            const { error: bioUpErr } = await supabase.from('bioimpedance').upsert(bioimpedance.map((b: any) => ({
              id: b.id || `bio-${Date.now()}-${Math.random()}`,
              date: b.date,
              weight: b.weight ?? 0,
              fat_percentage: b.fatPercentage ?? 0,
              muscle_mass: b.muscleMass ?? 0,
              visceral_fat: b.visceralFat ?? 0,
              hydration: b.hydration ?? 0,
              basal_metabolism: b.basalMetabolism ?? 0,
              metabolic_age: b.metabolicAge ?? 0,
              bone_mass: b.boneMass ?? 0,
              physique_rating: b.physiqueRating ?? 0,
              fat_arm_r: b.fatArmR ?? 0,
              fat_arm_l: b.fatArmL ?? 0,
              fat_leg_r: b.fatLegR ?? 0,
              fat_leg_l: b.fatLegL ?? 0,
              fat_trunk: b.fatTrunk ?? 0,
              muscle_arm_r: b.muscleArmR ?? 0,
              muscle_arm_l: b.muscleArmL ?? 0,
              muscle_leg_r: b.muscleLegR ?? 0,
              muscle_leg_l: b.muscleLegL ?? 0,
              muscle_trunk: b.muscleTrunk ?? 0,
              observations: b.observations || '',
              athlete_id: athlete.id
            })));
            if (bioUpErr) throw bioUpErr;
          }
          if (isometricStrength?.length > 0) {
            const { error: strUpErr } = await supabase.from('isometric_strength').upsert(isometricStrength.map((s: any) => ({
              id: s.id || `str-${Date.now()}-${Math.random()}`,
              date: s.date,
              half_squat_kgf: s.halfSquatKgf ?? 0,
              quadriceps_r: s.quadricepsR ?? 0,
              quadriceps_l: s.quadricepsL ?? 0,
              hamstrings_r: s.hamstringsR ?? 0,
              hamstrings_l: s.hamstringsL ?? 0,
              iq_ratio_r: s.iqRatioR ?? 0,
              iq_ratio_l: s.iqRatioL ?? 0,
              observations: s.observations || '',
              athlete_id: athlete.id
            })));
            if (strUpErr) throw strUpErr;
          }
          if (cmj?.length > 0) {
            const cmjPayload = cmj.map((c: any) => ({
              id: c.id || `cmj-${Date.now()}-${Math.random()}`,
              date: c.date,
              height: c.height ?? 0,
              power: c.power ?? 0,
              depth: c.depth ?? 0,
              rsi: c.rsi ?? 0,
              flight_time: c.flightTime ?? 0,
              weight: c.weight ?? 0,
              average_force: c.averageForce ?? 0,
              observations: c.observations || '',
              athlete_id: athlete.id
            }));
            const { error: cmjUpErr } = await supabase.from('cmj').upsert(cmjPayload);
            if (cmjUpErr) {
              console.warn("[API] Falha ao upsert CMJ com average_force no Supabase, tentando sem a coluna:", cmjUpErr.message);
              const fallbackPayload = cmjPayload.map(({ average_force, ...rest }: any) => rest);
              const { error: fallbackErr } = await supabase.from('cmj').upsert(fallbackPayload);
              if (fallbackErr) throw fallbackErr;
            }
          }
          if (vo2max?.length > 0) {
            const { error: vo2UpErr } = await supabase.from('vo2max').upsert(vo2max.map((v: any) => ({
              id: v.id || `vo2-${Date.now()}-${Math.random()}`,
              date: v.date,
              vo2max: v.vo2max ?? 0,
              max_heart_rate: v.maxHeartRate ?? 0,
              threshold_heart_rate: v.thresholdHeartRate ?? 0,
              max_speed: v.maxSpeed ?? 0,
              threshold_speed: v.thresholdSpeed ?? 0,
              vam: v.vam ?? 0,
              rec_10s: v.rec10s ?? 0,
              rec_30s: v.rec30s ?? 0,
              rec_60s: v.rec60s ?? 0,
              max_ventilation: v.maxVentilation ?? 0,
              score: v.score ?? 0,
              observations: v.observations || '',
              athlete_id: athlete.id
            })));
            if (vo2UpErr) throw vo2UpErr;
          }
          if (speed?.length > 0) {
            const { error: spdUpErr } = await supabase.from('speed').upsert(speed.map((sp: any) => ({
              id: sp.id || `spd-${Date.now()}-${Math.random()}`,
              date: sp.date,
              time_5m: sp.time5m ?? 0,
              time_10m: sp.time10m ?? 0,
              time_20m: sp.time20m ?? 0,
              time_30m: sp.time30m ?? 0,
              speed_5m: sp.speed5m ?? 0,
              speed_10m: sp.speed10m ?? 0,
              speed_20m: sp.speed20m ?? 0,
              speed_30m: sp.speed30m ?? 0,
              observations: sp.observations || '',
              athlete_id: athlete.id
            })));
            if (spdUpErr) throw spdUpErr;
          }
          if (dropJump?.length > 0) {
            try {
              const { error: djUpErr } = await supabase.from('drop_jump').upsert(dropJump.map((dj: any) => ({
                id: dj.id || `dj-${Date.now()}-${Math.random()}`,
                date: dj.date,
                weight: dj.weight ?? 0,
                drop_height: dj.dropHeight ?? 30,
                jump_height: dj.jumpHeight ?? 0,
                flight_time: dj.flightTime ?? 0,
                contact_time: dj.contactTime ?? 0,
                mean_force: dj.meanForce ?? 0,
                mean_power: dj.meanPower ?? 0,
                stiffness: dj.stiffness ?? 0,
                rsi: dj.rsi ?? 0,
                observations: dj.observations || '',
                athlete_id: athlete.id
              })));
              if (djUpErr) throw djUpErr;
            } catch (err: any) {
              console.warn('[Supabase Proxy] Erro ao salvar drop_jump assessments:', err.message);
            }
          }
          if (imtp?.length > 0) {
            try {
              const { error: imUpErr } = await supabase.from('imtp').upsert(imtp.map((im: any) => ({
                id: im.id || `im-${Date.now()}-${Math.random()}`,
                date: im.date,
                weight: im.weight,
                peak_force: im.peakForce ?? 0,
                relative_peak_force: im.relativePeakForce ?? 0,
                time_to_peak_force: im.timeToPeakForce ?? 0,
                mean_force: im.meanForce ?? 0,
                rfd_peak: im.rfdPeak ?? 0,
                rfd_100: im.rfd100 ?? 0,
                rfd_200: im.rfd200 ?? 0,
                rfd_300: im.rfd300 ?? 0,
                impulse_peak: im.impulsePeak ?? 0,
                impulse_100: im.impulse100 ?? 0,
                impulse_200: im.impulse200 ?? 0,
                impulse_300: im.impulse300 ?? 0,
                ai_details: im.aiDetails ? JSON.stringify(im.aiDetails) : null,
                observations: im.observations || '',
                athlete_id: athlete.id
              })));
              if (imUpErr) throw imUpErr;
            } catch (err: any) {
              console.warn('[Supabase Proxy] Erro ao salvar imtp assessments:', err.message);
            }
          }
        }
      }
      return res.json({ message: 'Dados sincronizados via Supabase Proxy com sucesso' });
    } catch (err: any) {
      console.error("Falha ao salvar via Supabase Proxy:", err.message);
      throw err;
    }
  };

  if (!process.env.DATABASE_URL || !isDbConnected) {
    try {
      return await doSupabaseProxyFallback();
    } catch (err: any) {
      return res.status(503).json({ 
        error: `Sincronização indisponível: ${err.message}`,
        details: err.message
      });
    }
  }
  
  console.log(`Recebida solicitação de salvamento para ${athletes.length} atletas.`);
  const client = await pool.connect();
  try {
    console.log(`Iniciando transação para salvar ${athletes.length} atletas...`);
    await client.query('BEGIN');
    
    for (const athlete of athletes) {
      console.log(`Salvando atleta: ${athlete.name} (${athlete.id})`);
      await client.query(
        'INSERT INTO athletes (id, name, photo_url, dob, gender, modality, competitive_level, position, injury_history, goal, weekly_frequency, is_tournament_mode, periodization_start, periodization_end, training_days, injuries) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (id) DO UPDATE SET name = $2, photo_url = $3, dob = $4, gender = $5, modality = $6, competitive_level = $7, position = $8, injury_history = $9, goal = $10, weekly_frequency = $11, is_tournament_mode = $12, periodization_start = $13, periodization_end = $14, training_days = $15, injuries = $16, updated_at = CURRENT_TIMESTAMP',
        [
          athlete.id,
          athlete.name,
          athlete.photoUrl || athlete.photo_url || null,
          athlete.dob || new Date().toISOString().split('T')[0],
          athlete.gender || 'M',
          athlete.modality || '',
          athlete.competitiveLevel || 'amador',
          athlete.position || '',
          serializeBackupAthleteFields(athlete),
          athlete.goal || 'Performance',
          athlete.weeklyFrequency || athlete.weekly_frequency || (athlete.trainingDays?.length || 3),
          athlete.isTournamentMode ?? false,
          athlete.periodizationStart ?? null,
          athlete.periodizationEnd ?? null,
          JSON.stringify(athlete.trainingDays || []),
          JSON.stringify(athlete.injuries || [])
        ]
      );
      
      console.log(`Salvando wellness para ${athlete.name}...`);
      const incomingWlIds = (athlete.wellness || []).map((w: any) => w.id).filter((id: any) => id);
      if (incomingWlIds.length > 0) {
        const wlPlaceholders = incomingWlIds.map((_, idx) => `$${idx + 2}`).join(', ');
        await client.query(`DELETE FROM wellness WHERE athlete_id = $1 AND id NOT IN (${wlPlaceholders})`, [athlete.id, ...incomingWlIds]);
      } else {
        await client.query('DELETE FROM wellness WHERE athlete_id = $1', [athlete.id]);
      }
      for (const w of (athlete.wellness || [])) {
        if (!w.id) w.id = `wl-${Date.now()}-${Math.random()}`;
        await client.query(
          'INSERT INTO wellness (id, athlete_id, date, fatigue, sleep, stress, soreness, mood, cognitive_load, readiness_score, travel_fatigue, sleep_quality, menstrual_phase, menstrual_symptoms, hrv, sleep_hours_formatted, sleep_start_time, wake_up_time, calculated_sleep_hours, is_match_day, emotional_readiness, psychological_readiness, psychology_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) ON CONFLICT (id) DO UPDATE SET date = $3, fatigue = $4, sleep = $5, stress = $6, soreness = $7, mood = $8, cognitive_load = $9, readiness_score = $10, travel_fatigue = $11, sleep_quality = $12, menstrual_phase = $13, menstrual_symptoms = $14, hrv = $15, sleep_hours_formatted = $16, sleep_start_time = $17, wake_up_time = $18, calculated_sleep_hours = $19, is_match_day = $20, emotional_readiness = $21, psychological_readiness = $22, psychology_notes = $23',
          [
            w.id,
            athlete.id,
            w.date,
            w.fatigue ?? 0,
            Math.round(safeNum(w.sleep, 0)),
            w.stress ?? 0,
            w.soreness ?? 0,
            w.mood ?? 0,
            w.cognitiveLoad ?? 0,
            w.readinessScore ? Math.round(w.readinessScore) : 0,
            w.travelFatigue ?? 0,
            w.sleepQuality ?? 0,
            w.menstrualPhase || 'Nenhuma',
            w.menstrualSymptoms ? JSON.stringify(w.menstrualSymptoms) : '[]',
            w.hrv ?? null,
            w.sleepHoursFormatted || null,
            w.sleepStartTime || null,
            w.wakeUpTime || null,
            w.calculatedSleepHours !== undefined && w.calculatedSleepHours !== null ? safeNum(w.calculatedSleepHours, 0) : safeNum(w.sleep, 0),
            w.isMatchDay ?? false,
            w.emotionalReadiness ?? null,
            w.psychologicalReadiness ?? null,
            w.psychologyNotes || null
          ]
        );
      }

      console.log(`Salvando sessões externas para ${athlete.name}...`);
      const incomingSesIds = (athlete.externalSessions || []).map((es: any) => es.id).filter((id: any) => id);
      if (incomingSesIds.length > 0) {
        const sesPlaceholders = incomingSesIds.map((_, idx) => `$${idx + 2}`).join(', ');
        await client.query(`DELETE FROM external_sessions WHERE athlete_id = $1 AND id NOT IN (${sesPlaceholders})`, [athlete.id, ...incomingSesIds]);
      } else {
        await client.query('DELETE FROM external_sessions WHERE athlete_id = $1', [athlete.id]);
      }
      for (const es of (athlete.externalSessions || [])) {
        if (!es.id) es.id = `es-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const dur = es.durationMinutes ?? es.duration_minutes ?? 0;
        const rpeVal = es.rpe ?? 0;
        const calculatedLoad = es.load ?? (dur * rpeVal);
        await client.query(
          'INSERT INTO external_sessions (id, athlete_id, date, type, duration_minutes, rpe, notes, load) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET date = $3, type = $4, duration_minutes = $5, rpe = $6, notes = $7, load = $8',
          [es.id, athlete.id, es.date, es.type || 'tecnico', dur, rpeVal, es.notes || '', calculatedLoad]
        );
      }

      console.log(`Salvando treinos para ${athlete.name}...`);
      const incomingWorkoutIds = (athlete.workouts || []).map((wk: any) => wk.id).filter((id: any) => id);
      
      // DEEP SYNC WORKOUTS: Delete workouts that are NO LONGER in the incoming list for this athlete
      if (incomingWorkoutIds.length > 0) {
        // Delete prescribed_exercises and performed_sets first (though CASCADE should handle it, we do it for safety)
        const wkPlaceholders = incomingWorkoutIds.map((_, idx) => `$${idx + 2}`).join(', ');
        await client.query(`DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1 AND id NOT IN (${wkPlaceholders})))`, [athlete.id, ...incomingWorkoutIds]);
        await client.query(`DELETE FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1 AND id NOT IN (${wkPlaceholders}))`, [athlete.id, ...incomingWorkoutIds]);
        await client.query(`DELETE FROM workouts WHERE athlete_id = $1 AND id NOT IN (${wkPlaceholders})`, [athlete.id, ...incomingWorkoutIds]);
      } else {
        // If athlete now has ZERO workouts, delete all existing ones
        await client.query('DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1))', [athlete.id]);
        await client.query('DELETE FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1)', [athlete.id]);
        await client.query('DELETE FROM workouts WHERE athlete_id = $1', [athlete.id]);
      }

      for (const wk of (athlete.workouts || [])) {
        if (!wk.id) wk.id = `wk-${Date.now()}-${Math.random()}`;
        await client.query(
          'INSERT INTO workouts (id, athlete_id, date, name, phase, status, rpe, total_load, duration_minutes, monotony, strain, feedback, trainer_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET date = $3, name = $4, phase = $5, status = $6, rpe = $7, total_load = $8, duration_minutes = $9, monotony = $10, strain = $11, feedback = $12, trainer_notes = $13, updated_at = CURRENT_TIMESTAMP',
          [wk.id, athlete.id, wk.date, wk.name ?? null, wk.phase ?? null, wk.status ?? null, wk.rpe ?? null, wk.totalLoad ?? null, wk.durationMinutes ?? null, wk.monotony ?? null, wk.strain ?? null, wk.feedback ?? null, wk.trainerNotes ?? null]
        );

        // Deep sync for exercises: delete orphans
        const currentExIds = (wk.exercises || []).map((e: any) => e.id).filter((id: any) => id);
        if (currentExIds.length > 0) {
          const exPlaceholders = currentExIds.map((_, idx) => `$${idx + 2}`).join(', ');
          await client.query(`DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id = $1 AND id NOT IN (${exPlaceholders}))`, [wk.id, ...currentExIds]);
          await client.query(`DELETE FROM prescribed_exercises WHERE workout_id = $1 AND id NOT IN (${exPlaceholders})`, [wk.id, ...currentExIds]);
        } else {
          await client.query('DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id = $1)', [wk.id]);
          await client.query('DELETE FROM prescribed_exercises WHERE workout_id = $1', [wk.id]);
        }
        const exercisesList = (wk.exercises || []);
        for (let idx = 0; idx < exercisesList.length; idx++) {
          const ex = exercisesList[idx];
          if (!ex.id) ex.id = `ex-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO prescribed_exercises (id, workout_id, name, muscle_group, sets, reps, weight, rest, notes, pain_level, reps_type, order_index, video_url, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO UPDATE SET name = $3, muscle_group = $4, sets = $5, reps = $6, weight = $7, rest = $8, notes = $9, pain_level = $10, reps_type = $11, order_index = $12, video_url = $13, image_url = $14',
            [ex.id, wk.id, ex.name ?? null, ex.muscleGroup ?? null, ex.sets ?? null, ex.reps ?? null, ex.weight ?? null, ex.rest ?? null, ex.notes ?? null, ex.painLevel ?? null, ex.repsType ?? 'reps', idx, ex.videoUrl ?? null, ex.imageUrl ?? null]
          );

          // Sync performed sets
          const currentSetIds = (ex.performedSets || []).map((s: any) => s.id).filter((id: any) => id);
          if (currentSetIds.length > 0) {
            const setPlaceholders = currentSetIds.map((_, idx) => `$${idx + 2}`).join(', ');
            await client.query(`DELETE FROM performed_sets WHERE exercise_id = $1 AND id NOT IN (${setPlaceholders})`, [ex.id, ...currentSetIds]);
          } else {
            await client.query('DELETE FROM performed_sets WHERE exercise_id = $1', [ex.id]);
          }
          for (const s of (ex.performedSets || [])) {
              if (!s.id) s.id = `s-${Date.now()}-${Math.random()}`;
              await client.query(
                'INSERT INTO performed_sets (id, exercise_id, reps, weight, rpe, is_completed) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET reps = $3, weight = $4, rpe = $5, is_completed = $6',
                [s.id, ex.id, s.reps ?? null, s.weight ?? null, s.rpe ?? null, s.isCompleted ?? false]
              );
          }
        }
      }

      if (athlete.assessments) {
        console.log(`[API] Salvando avaliações para ${athlete.name}...`);
        const strength = athlete.assessments.isometricStrength || [];
        console.log(`[API] ${strength.length} testes de força.`);
        for (const asm of strength) {
          if (!asm.id) asm.id = `str-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO isometric_strength (id, athlete_id, date, half_squat_kgf, quadriceps_r, quadriceps_l, hamstrings_r, hamstrings_l, iq_ratio_r, iq_ratio_l, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET date = $3, half_squat_kgf = $4, quadriceps_r = $5, quadriceps_l = $6, hamstrings_r = $7, hamstrings_l = $8, iq_ratio_r = $9, iq_ratio_l = $10, observations = $11', 
            [asm.id, athlete.id, asm.date, asm.halfSquatKgf ?? 0, asm.quadricepsR ?? 0, asm.quadricepsL ?? 0, asm.hamstringsR ?? 0, asm.hamstringsL ?? 0, asm.iqRatioR ?? 0, asm.iqRatioL ?? 0, asm.observations || '']
          );
        }
        
        const cmj = athlete.assessments.cmj || [];
        console.log(`[API] ${cmj.length} saltos CMJ.`);
        for (const asm of cmj) {
          if (!asm.id) asm.id = `cmj-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO cmj (id, athlete_id, date, height, power, depth, rsi, flight_time, weight, average_force, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET date = $3, height = $4, power = $5, depth = $6, rsi = $7, flight_time = $8, weight = $9, average_force = $10, observations = $11', 
            [asm.id, athlete.id, asm.date, asm.height ?? 0, asm.power ?? 0, asm.depth ?? 0, asm.rsi ?? 0, asm.flightTime ?? 0, asm.weight ?? 0, asm.averageForce ?? 0, asm.observations || '']
          );
        }

        const vo2 = athlete.assessments.vo2max || [];
        console.log(`[API] ${vo2.length} testes de VO2max.`);
        for (const asm of vo2) {
          if (!asm.id) asm.id = `vo2-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO vo2max (id, athlete_id, date, vo2max, max_heart_rate, threshold_heart_rate, max_speed, threshold_speed, vam, rec_10s, rec_30s, rec_60s, max_ventilation, score, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO UPDATE SET date = $3, vo2max = $4, max_heart_rate = $5, threshold_heart_rate = $6, max_speed = $7, threshold_speed = $8, vam = $9, rec_10s = $10, rec_30s = $11, rec_60s = $12, max_ventilation = $13, score = $14, observations = $15', 
            [asm.id, athlete.id, asm.date, asm.vo2max ?? 0, asm.maxHeartRate ?? 0, asm.thresholdHeartRate ?? 0, asm.maxSpeed ?? 0, asm.thresholdSpeed ?? 0, asm.vam ?? 0, asm.rec10s ?? 0, asm.rec30s ?? 0, asm.rec60s ?? 0, asm.maxVentilation ?? 0, asm.score ?? 0, asm.observations || '']
          );
        }

        const bio = athlete.assessments.bioimpedance || [];
        console.log(`[API] ${bio.length} bioimpedâncias.`);
        for (const asm of bio) {
          if (!asm.id) asm.id = `bio-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO bioimpedance (id, athlete_id, date, weight, fat_percentage, muscle_mass, visceral_fat, hydration, basal_metabolism, metabolic_age, bone_mass, physique_rating, fat_arm_r, fat_arm_l, fat_leg_r, fat_leg_l, fat_trunk, muscle_arm_r, muscle_arm_l, muscle_leg_r, muscle_leg_l, muscle_trunk, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) ON CONFLICT (id) DO UPDATE SET date = $3, weight = $4, fat_percentage = $5, muscle_mass = $6, visceral_fat = $7, hydration = $8, basal_metabolism = $9, metabolic_age = $10, bone_mass = $11, physique_rating = $12, fat_arm_r = $13, fat_arm_l = $14, fat_leg_r = $15, fat_leg_l = $16, fat_trunk = $17, muscle_arm_r = $18, muscle_arm_l = $19, muscle_leg_r = $20, muscle_leg_l = $21, muscle_trunk = $22, observations = $23',
            [asm.id, athlete.id, asm.date, asm.weight ?? 0, asm.fatPercentage ?? 0, asm.muscleMass ?? 0, asm.visceralFat ?? 0, asm.hydration ?? 0, asm.basalMetabolism ?? 0, asm.metabolicAge ?? 0, asm.boneMass ?? 0, asm.physiqueRating ?? 0, asm.fatArmR ?? 0, asm.fatArmL ?? 0, asm.fatLegR ?? 0, asm.fatLegL ?? 0, asm.fatTrunk ?? 0, asm.muscleArmR ?? 0, asm.muscleArmL ?? 0, asm.muscleLegR ?? 0, asm.muscleLegL ?? 0, asm.muscleTrunk ?? 0, asm.observations || '']
          );
        }

        const speed = athlete.assessments.speed || [];
        console.log(`[API] ${speed.length} testes de velocidade.`);
        for (const asm of speed) {
          if (!asm.id) asm.id = `spd-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO speed (id, athlete_id, date, time_5m, time_10m, time_20m, time_30m, speed_5m, speed_10m, speed_20m, speed_30m, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO UPDATE SET date = $3, time_5m = $4, time_10m = $5, time_20m = $6, time_30m = $7, speed_5m = $8, speed_10m = $9, speed_20m = $10, speed_30m = $11, observations = $12', 
            [asm.id, athlete.id, asm.date, asm.time5m ?? 0, asm.time10m ?? 0, asm.time20m ?? 0, asm.time30m ?? 0, asm.speed5m ?? 0, asm.speed10m ?? 0, asm.speed20m ?? 0, asm.speed30m ?? 0, asm.observations || '']
          );
        }

        const dropJump = athlete.assessments.dropJump || [];
        console.log(`[API] ${dropJump.length} saltos Drop Jump.`);
        for (const asm of dropJump) {
          if (!asm.id) asm.id = `dj-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO drop_jump (id, athlete_id, date, weight, drop_height, jump_height, flight_time, contact_time, mean_force, mean_power, stiffness, rsi, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET date = $3, weight = $4, drop_height = $5, jump_height = $6, flight_time = $7, contact_time = $8, mean_force = $9, mean_power = $10, stiffness = $11, rsi = $12, observations = $13', 
            [asm.id, athlete.id, asm.date, asm.weight ?? 0, asm.dropHeight ?? 30, asm.jumpHeight ?? 0, asm.flightTime ?? 0, asm.contactTime ?? 0, asm.meanForce ?? 0, asm.meanPower ?? 0, asm.stiffness ?? 0, asm.rsi ?? 0, asm.observations || '']
          );
        }

        const imtp = athlete.assessments.imtp || [];
        console.log(`[API] ${imtp.length} testes IMTP.`);
        for (const asm of imtp) {
          if (!asm.id) asm.id = `im-${Date.now()}-${Math.random()}`;
          await client.query(
            'INSERT INTO imtp (id, athlete_id, date, weight, peak_force, relative_peak_force, time_to_peak_force, mean_force, rfd_peak, rfd_100, rfd_200, rfd_300, impulse_peak, impulse_100, impulse_200, impulse_300, ai_details, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT (id) DO UPDATE SET date = $3, weight = $4, peak_force = $5, relative_peak_force = $6, time_to_peak_force = $7, mean_force = $8, rfd_peak = $9, rfd_100 = $10, rfd_200 = $11, rfd_300 = $12, impulse_peak = $13, impulse_100 = $14, impulse_200 = $15, impulse_300 = $16, ai_details = $17, observations = $18', 
            [
              asm.id, 
              athlete.id, 
              asm.date, 
              asm.weight ?? null,
              asm.peakForce ?? 0, 
              asm.relativePeakForce ?? 0, 
              asm.timeToPeakForce ?? 0, 
              asm.meanForce ?? 0, 
              asm.rfdPeak ?? 0, 
              asm.rfd100 ?? 0, 
              asm.rfd200 ?? 0, 
              asm.rfd300 ?? 0, 
              asm.impulsePeak ?? 0, 
              asm.impulse100 ?? 0, 
              asm.impulse200 ?? 0, 
              asm.impulse300 ?? 0, 
              asm.aiDetails ? JSON.stringify(asm.aiDetails) : null, 
              asm.observations || ''
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Dados salvos com sucesso!');
    res.json({ message: 'Dados sincronizados com sucesso!' });
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollError: any) {
        console.error('Erro ao executar ROLLBACK:', rollError.message);
      }
    }
    console.error('Erro ao salvar dados no banco Postgres (Acionando fallback automático para Supabase Proxy):', error);
    
    try {
      return await doSupabaseProxyFallback();
    } catch (fallbackError: any) {
      console.error('Falha crônica tanto em Postgres quanto no fallback Supabase REST Proxy:', fallbackError);
      res.status(500).json({ 
        error: `Erro ao sincronizar. Postgres original: ${error.message}. Fallback Supabase REST: ${fallbackError.message}`, 
        detail: error.detail || fallbackError.message 
      });
    }
  } finally {
    client.release();
  }
});

// Deletion endpoints
apiRouter.delete('/atletas/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const dbConfigured = !!process.env.DATABASE_URL;

  const runSupabaseDeleteFallback = async () => {
    console.log(`[API] Executando Fallback Supabase para excluir atleta: ${id}`);
    try {
      // Delete user reference or user account first to avoid foreign key issues
      await supabase.from('users').delete().eq('athlete_id', id);

      await supabase.from('wellness').delete().eq('athlete_id', id);
      await supabase.from('external_sessions').delete().eq('athlete_id', id);
      await supabase.from('bioimpedance').delete().eq('athlete_id', id);
      await supabase.from('isometric_strength').delete().eq('athlete_id', id);
      await supabase.from('cmj').delete().eq('athlete_id', id);
      await supabase.from('drop_jump').delete().eq('athlete_id', id);
      await supabase.from('vo2max').delete().eq('athlete_id', id);
      await supabase.from('speed').delete().eq('athlete_id', id);
      await supabase.from('general_strength').delete().eq('athlete_id', id);
      await supabase.from('imtp').delete().eq('athlete_id', id);
      
      const { data: workouts } = await supabase.from('workouts').select('id').eq('athlete_id', id);
      if (workouts && workouts.length > 0) {
        const wkIds = workouts.map(w => w.id);
        const { data: exercises } = await supabase.from('prescribed_exercises').select('id').in('workout_id', wkIds);
        if (exercises && exercises.length > 0) {
          const exIds = exercises.map(e => e.id);
          await supabase.from('performed_sets').delete().in('exercise_id', exIds);
          await supabase.from('prescribed_exercises').delete().in('workout_id', wkIds);
        }
        await supabase.from('workouts').delete().eq('athlete_id', id);
      }
      const { error: athDelErr } = await supabase.from('athletes').delete().eq('id', id);
      if (athDelErr) throw athDelErr;
      
      console.log(`[API] Atleta ${id} excluído com sucesso via Supabase Fallback.`);
      return res.json({ message: 'Atleta excluído com sucesso via Supabase' });
    } catch (sbError: any) {
      console.error(`[API] Erro ao excluir atleta ${id} via Supabase Fallback:`, sbError.message);
      return res.status(500).json({ error: sbError.message });
    }
  };

  if (!dbConfigured || !isDbConnected) {
    return await runSupabaseDeleteFallback();
  }

  try {
    // Nullify pointer in users
    await pool.query('UPDATE users SET athlete_id = NULL WHERE athlete_id = $1', [id]);
    
    // Manual deep delete for all related records
    await pool.query('DELETE FROM wellness WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM external_sessions WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM bioimpedance WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM isometric_strength WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM cmj WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM drop_jump WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM vo2max WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM speed WHERE athlete_id = $1', [id]);
    await pool.query('DELETE FROM general_strength WHERE athlete_id = $1', [id]);
    
    // Workouts manual sub-cascade
    await pool.query('DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1))', [id]);
    await pool.query('DELETE FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1)', [id]);
    await pool.query('DELETE FROM workouts WHERE athlete_id = $1', [id]);
    
    // Delete target athlete
    await pool.query('DELETE FROM athletes WHERE id = $1', [id]);
    
    console.log(`[API] Atleta ${id} excluído com sucesso via Postgres.`);
    res.json({ message: 'Atleta excluído com sucesso' });
  } catch (error: any) {
    console.warn(`[API] Erro ao excluir atleta ${id} via Postgres (Tentando Fallback Supabase...):`, error.message);
    await runSupabaseDeleteFallback();
  }
});

apiRouter.delete('/workouts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`[API] Solicitando exclusão do treino: ${id}`);
  
  if (!process.env.DATABASE_URL || !isDbConnected) {
    try {
      const { data: exercises, error: fetchExErr } = await supabase
        .from('prescribed_exercises')
        .select('id')
        .eq('workout_id', id);
        
      if (!fetchExErr && exercises && exercises.length > 0) {
        const exIds = exercises.map(ex => ex.id);
        const { error: setDelErr } = await supabase.from('performed_sets').delete().in('exercise_id', exIds);
        if (setDelErr) console.warn('[Supabase Fallback] Erro ao deletar sets do treino:', setDelErr.message);
        
        const { error: exDelErr } = await supabase.from('prescribed_exercises').delete().eq('workout_id', id);
        if (exDelErr) console.warn('[Supabase Fallback] Erro ao deletar exercises do treino:', exDelErr.message);
      }
      
      const { error: wkDelErr } = await supabase.from('workouts').delete().eq('id', id);
      if (wkDelErr) throw wkDelErr;
      
      console.log(`[API] Treino ${id} excluído via Supabase Fallback.`);
      return res.json({ message: 'Treino excluído com sucesso via Supabase' });
    } catch (error: any) {
      console.error(`[API] Erro ao excluir treino ${id} via Supabase Fallback:`, error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  try {
    const result1 = await pool.query('DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id = $1)', [id]);
    const result2 = await pool.query('DELETE FROM prescribed_exercises WHERE workout_id = $1', [id]);
    const result3 = await pool.query('DELETE FROM workouts WHERE id = $1', [id]);
    console.log(`[API] Treino ${id} excluído via Postgres. Sets: ${result1.rowCount}, Ex: ${result2.rowCount}, Wk: ${result3.rowCount}`);
    res.json({ message: 'Treino excluído com sucesso' });
  } catch (error: any) {
    console.warn(`[API] Erro ao excluir treino ${id} via Postgres (Tentando Supabase Fallback...):`, error.message);
    try {
      const { data: exercises } = await supabase.from('prescribed_exercises').select('id').eq('workout_id', id);
      if (exercises && exercises.length > 0) {
        const exIds = exercises.map(ex => ex.id);
        await supabase.from('performed_sets').delete().in('exercise_id', exIds);
        await supabase.from('prescribed_exercises').delete().eq('workout_id', id);
      }
      const { error: wkDelErr } = await supabase.from('workouts').delete().eq('id', id);
      if (wkDelErr) throw wkDelErr;
      res.json({ message: 'Treino excluído com sucesso via Supabase' });
    } catch (sbError: any) {
      res.status(500).json({ error: sbError.message });
    }
  }
});

apiRouter.delete('/wellness/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!process.env.DATABASE_URL || !isDbConnected) {
    try {
      const { error } = await supabase.from('wellness').delete().eq('id', id);
      if (error) throw error;
      return res.json({ message: 'Check-in excluído com sucesso via Supabase' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  try {
    await pool.query('DELETE FROM wellness WHERE id = $1', [id]);
    res.json({ message: 'Check-in excluído com sucesso' });
  } catch (error: any) {
    console.warn(`[API] Erro ao excluir wellness ${id} via Postgres (Tentando Supabase Fallback...):`, error.message);
    try {
      const { error: sbErr } = await supabase.from('wellness').delete().eq('id', id);
      if (sbErr) throw sbErr;
      res.json({ message: 'Check-in excluído com sucesso via Supabase' });
    } catch (sbError: any) {
      res.status(500).json({ error: sbError.message });
    }
  }
});

apiRouter.delete('/sessions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!process.env.DATABASE_URL || !isDbConnected) {
    try {
      const { error } = await supabase.from('external_sessions').delete().eq('id', id);
      if (error) throw error;
      return res.json({ message: 'Sessão excluída com sucesso via Supabase' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  try {
    await pool.query('DELETE FROM external_sessions WHERE id = $1', [id]);
    res.json({ message: 'Sessão excluída com sucesso' });
  } catch (error: any) {
    console.warn(`[API] Erro ao excluir sessão ${id} via Postgres (Tentando Supabase Fallback...):`, error.message);
    try {
      const { error: sbErr } = await supabase.from('external_sessions').delete().eq('id', id);
      if (sbErr) throw sbErr;
      res.json({ message: 'Sessão excluída com sucesso via Supabase' });
    } catch (sbError: any) {
      res.status(500).json({ error: sbError.message });
    }
  }
});

apiRouter.delete('/assessments/:type/:id', authMiddleware, async (req, res) => {
  const { type, id } = req.params;
  const tableMap: Record<string, string> = {
    'bioimpedance': 'bioimpedance',
    'isometricStrength': 'isometric_strength',
    'generalStrength': 'general_strength',
    'cmj': 'cmj',
    'dropJump': 'drop_jump',
    'vo2max': 'vo2max',
    'speed': 'speed',
    'imtp': 'imtp'
  };

  const tableName = tableMap[type];
  if (!tableName) return res.status(400).json({ error: 'Tipo de avaliação inválido.' });

  if (!process.env.DATABASE_URL || !isDbConnected) {
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return res.json({ message: 'Avaliação excluída com sucesso via Supabase' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  try {
    await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    res.json({ message: 'Avaliação excluída com sucesso' });
  } catch (error: any) {
    console.warn(`[API] Erro ao excluir avaliação ${tableName} ${id} via Postgres (Tentando Supabase Fallback...):`, error.message);
    try {
      const { error: sbErr } = await supabase.from(tableName).delete().eq('id', id);
      if (sbErr) throw sbErr;
      res.json({ message: 'Avaliação excluída com sucesso via Supabase' });
    } catch (sbError: any) {
      res.status(500).json({ error: sbError.message });
    }
  }
});

// AI endpoints under apiRouter
apiRouter.post('/generate-workouts', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Workouts] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    const response = await generateContentWithRetry({ 
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "A data correspondente do cronograma fornecido (formato YYYY-MM-DD)" },
              name: { type: Type.STRING, description: "Nome técnico estruturado do treino" },
              phase: { type: Type.STRING, description: "Fase de treinamento (Preparação Geral, Preparação Específica, ou Polimento / Tapering)" },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nome do exercício" },
                    muscleGroup: { type: Type.STRING, description: "Grupo muscular ou valência física trabalhada" },
                    sets: { type: Type.INTEGER, description: "Número de séries" },
                    reps: { type: Type.STRING, description: "Repetições (Ex: '8-10', 'Até a falha', '20s')" },
                    weight: { type: Type.STRING, description: "Sugestão de Carga/Intensidade (Ex: '70% 1RM', 'Carga Moderada', 'Peso do corpo', '35kg')" }
                  },
                  required: ["name", "muscleGroup", "sets", "reps", "weight"]
                }
              }
            },
            required: ["date", "name", "phase", "exercises"]
          }
        }
      }
    });

    const resultText = response.text || "";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("[AI Workouts] Erro chamando Gemini no backend:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar treinos por IA no servidor." });
  }
});

apiRouter.post('/generate-imtp-ai', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI IMTP] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            benchmarks: { type: Type.STRING },
            classification: {
              type: Type.OBJECT,
              properties: {
                peakForceClass: { type: Type.STRING },
                relativeForceClass: { type: Type.STRING },
                rfdClass: { type: Type.STRING },
                efficiencyClass: { type: Type.STRING },
              },
              required: ["peakForceClass", "relativeForceClass", "rfdClass", "efficiencyClass"]
            },
            diagnostico: { type: Type.STRING },
            priorities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  method: { type: Type.STRING },
                  parameters: { type: Type.STRING },
                  exercises: { type: Type.STRING },
                  kpi: { type: Type.STRING }
                },
                required: ["title", "method", "parameters", "exercises", "kpi"]
              }
            },
            versionTechnical: { type: Type.STRING },
            versionAthlete: { type: Type.STRING },
            projections: {
              type: Type.OBJECT,
              properties: {
                shortTerm: { type: Type.STRING },
                mediumTerm: { type: Type.STRING },
                longTerm: { type: Type.STRING }
              },
              required: ["shortTerm", "mediumTerm", "longTerm"]
            }
          },
          required: ["benchmarks", "classification", "diagnostico", "priorities", "versionTechnical", "versionAthlete", "projections"]
        }
      }
    });

    const resultText = response.text || "";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("[AI IMTP] Erro chamando Gemini no backend:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar laudo IMTP por IA no servidor." });
  }
});

apiRouter.post('/generate-postural-ai', authMiddleware, async (req, res) => {
  const { painZones, presetType, notes, photoAnterior, photoLateral, photoPosterior } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Postural] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    let presetExplanation = "";
    if (presetType === "cabeça_protusa") {
      presetExplanation = "O atleta apresenta um desalinhamento acentuado de cabeça protusa (Forward Head Posture), com projeção anterior da coluna cervical, frequentemente associado a tensão nos suboccipitais e fraqueza dos flexores profundos do pescoço.";
    } else if (presetType === "ombros_assimetricos") {
      presetExplanation = "O atleta apresenta assimetria de ombros (um ombro visivelmente mais elevado que o outro) e ombros protusos (enrolados para a frente), sugerindo encurtamento do peitoral menor e trapézio superior, com fraqueza do trapézio inferior e serrátil anterior.";
    } else if (presetType === "hiperlordose") {
      presetExplanation = "O atleta apresenta hiperlordose lombar acentuada com anteversão pélvica anterior (Anterior Pelvic Tilt), padrão clássico de síndrome cruzada inferior, com encurtamento de flexores do quadril e eretores espinhais, combinados com inibição de glúteos e reto abdominal.";
    } else if (presetType === "joelhos_valgos") {
      presetExplanation = "O atleta apresenta valgo dinâmico/estático acentuado nos joelhos (joelhos apontando para dentro), com possível pronação excessiva dos pés, sugerindo fraqueza crônica de glúteo médio e rotadores externos do quadril.";
    } else if (presetType === "postura_ideal") {
      presetExplanation = "O atleta apresenta um alinhamento postural excelente e simétrico nas vistas anterior, lateral e posterior, sem desvios significativos visíveis.";
    } else {
      presetExplanation = "Avaliação postural customizada com base nas fotos fornecidas e nos dados relatados.";
    }

    const promptText = `Você é um fisioterapeuta esportivo de elite, especialista em biomecânica e avaliação postural kinantropométrica de atletas de alto rendimento.
Sua missão é realizar uma avaliação postural detalhada de nível elite e fornecer um plano corretivo preciso.

As seguintes informações de entrada foram fornecidas:
- Zona(s) de dor relatadas pelo atleta: ${Array.isArray(painZones) ? painZones.join(', ') : 'Nenhuma dor relatada'}
- Tipo de desvio postural simulado ou real: ${presetExplanation}
- Observações/queixas adicionais: ${notes || 'Nenhuma observação adicional.'}

Se fotos reais foram fornecidas em anexo, por favor use a sua capacidade de visão computacional multimodal para identificar se há desvios reais nelas e cruzar com as zonas de dor indicadas.

Você deve retornar obrigatoriamente um objeto JSON com a seguinte estrutura de correção detalhada:
1. desvios: lista de desvios identificados, cada um contendo 'regiao' (ex: "Coluna Cervical"), 'desvio' (ex: "Cabeça Protusa"), 'gravidade' (que deve ser 'Leve', 'Moderado' ou 'Severo') e 'compensacao' (explicação biomecânica das tensões ou fraquezas).
2. conclusao: um resumo profissional clínico do padrão do atleta.
3. exerciciosMobilidade: lista de 2 a 3 exercícios específicos de mobilidade e liberação miofascial com 'nome', 'series', 'tempo' (ex: "3 séries de 45 segundos") e 'instrucoes' passo a passo.
4. exerciciosFortalecimento: lista de 2 a 3 exercícios específicos de fortalecimento e ativação neuromuscular com 'nome', 'series', 'reps' (ex: "3 séries de 12 repetições") e 'instrucoes'.
5. ergonomia: lista de 3 conselhos de hábitos ergonômicos e posturais para o dia a dia e nos treinos.

Assegure que os termos clínicos e nomes de exercícios sejam em português brasileiro (PT-BR) e de alta precisão técnica.`;

    const parts: any[] = [{ text: promptText }];

    // Helper to extract base64 clean data
    const parseBase64 = (dataUrl: string) => {
      if (!dataUrl) return null;
      const parts = dataUrl.split(',');
      const mime = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const base64 = parts[1] || parts[0];
      return { data: base64, mimeType: mime };
    };

    if (photoAnterior) {
      const img = parseBase64(photoAnterior);
      if (img) parts.push({ inlineData: img });
    }
    if (photoLateral) {
      const img = parseBase64(photoLateral);
      if (img) parts.push({ inlineData: img });
    }
    if (photoPosterior) {
      const img = parseBase64(photoPosterior);
      if (img) parts.push({ inlineData: img });
    }

    const contents = [{ role: 'user', parts }];

    const response = await generateContentWithRetry({
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            desvios: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  regiao: { type: Type.STRING },
                  desvio: { type: Type.STRING },
                  gravidade: { type: Type.STRING }, // 'Leve', 'Moderado', 'Severo'
                  compensacao: { type: Type.STRING }
                },
                required: ["regiao", "desvio", "gravidade", "compensacao"]
              }
            },
            conclusao: { type: Type.STRING },
            exerciciosMobilidade: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  series: { type: Type.STRING },
                  tempo: { type: Type.STRING },
                  instrucoes: { type: Type.STRING }
                },
                required: ["nome", "series", "tempo", "instrucoes"]
              }
            },
            exerciciosFortalecimento: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  series: { type: Type.STRING },
                  reps: { type: Type.STRING },
                  instrucoes: { type: Type.STRING }
                },
                required: ["nome", "series", "reps", "instrucoes"]
              }
            },
            ergonomia: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["desvios", "conclusao", "exerciciosMobilidade", "exerciciosFortalecimento", "ergonomia"]
        }
      }
    });

    const resultText = response.text || "";
    res.json({ result: JSON.parse(resultText) });
  } catch (error: any) {
    console.error("[AI Postural] Erro chamando Gemini no backend:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar análise postural por IA no servidor." });
  }
});

apiRouter.post('/generate-ai-modeling', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Modeling] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            athleteProfileSummary: { type: Type.STRING },
            modelingAnalysis: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  attribute: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["attribute", "description"]
              }
            },
            criticalGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gap: { type: Type.STRING },
                  impact: { type: Type.STRING },
                  action: { type: Type.STRING }
                },
                required: ["gap", "impact", "action"]
              }
            },
            targetMetrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING },
                  currentValue: { type: Type.STRING },
                  targetValue: { type: Type.STRING },
                  rationale: { type: Type.STRING }
                },
                required: ["metric", "currentValue", "targetValue", "rationale"]
              }
            },
            coachStrategy: { type: Type.STRING }
          },
          required: ["athleteProfileSummary", "modelingAnalysis", "strengths", "criticalGaps", "targetMetrics", "coachStrategy"]
        }
      }
    });

    const resultText = response.text || "";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("[AI Modeling] Erro chamando Gemini no backend:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar modelagem de performance por IA no servidor." });
  }
});

apiRouter.post('/analyze-performance', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Analysis] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            performanceScore: { type: Type.NUMBER },
            readinessScore: { type: Type.NUMBER },
            injuryRiskScore: { type: Type.NUMBER },
            radarData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  A: { type: Type.NUMBER },
                  fullMark: { type: Type.NUMBER }
                },
                required: ["subject", "A", "fullMark"]
              }
            },
            summary: { type: Type.STRING },
            detailedAnalysis: { type: Type.STRING },
            alerts: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            conclusion: { type: Type.STRING }
          },
          required: ["status", "performanceScore", "readinessScore", "injuryRiskScore", "radarData", "summary", "detailedAnalysis", "alerts", "recommendations", "conclusion"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("[AI Analysis] Erro chamando Gemini no backend para análise:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar análise de performance por IA no servidor." });
  }
});

apiRouter.post('/ai-search-exercises', authMiddleware, async (req, res) => {
  const { query } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  const systemInstructions = `Você é um Cientista de Esporte de Elite, Biomecanista de Desempenho e Preparador Olímpico da LB Sports. Sua tarefa é analisar o termo de busca em linguagem natural do usuário e retornar EXATAMENTE entre 6 e 8 IDs de exercícios que sejam os mais relevantes, adequados e cientificamente indicados de acordo com a nossa biblioteca interna de alto rendimento.

Biblioteca principal de referência (IDs de Elite):
- "lib-1": Agachamento Traseiro (Back Squat) - Força Máxima, membros inferiores, padrão de Agachar Bilateral.
- "lib-2": Flexão Nórdica (Nordic Hamstring) - Força Excêntrica excêntrica do posterior, preventivo crítico para LCA e posterior de coxa.
- "lib-3": Adução de Copenhagen (Copenhagen Adduction) - Estabilidade pélvica, adutores de quadril, preventivo de pubalgia.
- "lib-4": Salto Contramovimento (CMJ) - Potência vertical, ciclo alongamento-encurtamento (Slow SSC).
- "lib-5": Sprints com Trenó de Resistência - Aceleração horizontal, força específica de corrida, potência.
- "lib-6": RDL (Romanian Deadlift) - Dobradiça de Quadril Bilateral, força e hipertrofia da cadeia posterior.
- "lib-7": Drop Jump (Foco em RSI) - Potência reativa pura, rigidez de tendão (Fast SSC), monitoramento Hawkin Dynamics.
- "lib-8": Supino Reto com Barra - Empurrar Horizontal Bilateral, força máxima e potência de membros superiores.
- "lib-9": Remada Curvada Pronada - Puxar Horizontal Bilateral, força de costas, estabilidade escapular.
- "lib-10": Pallof Press - Core Antirrotação, estabilização lombo-pélvica dinâmica.
- "lib-11": Leg Press 45º - Força geral de membros inferiores, empurrar bilateral seguro.
- "lib-12": Clean & Jerk (Arremesso) - Potência balística olímpica global, extensão tripla (tornozelo, joelho e quadril).
- "lib-13": Flexão de Braços (Push-Up) - Empurrar Horizontal Bilateral de peso corporal, resistência de força, ativação de serrátil.
- "lib-14": Barra Fixa Pronada (Pull-Up) - Puxar Vertical Bilateral de peso corporal, força relativa.
- "lib-15": Corda Naval (Battle Rope Slams) - Resistência anaeróbia lática, potência de braços e core.
- "lib-16": Kettlebell Swing - Dobradiça de quadril balística, potência e transferência dinâmica de extensão de quadril.
- "lib-17": Arremesso de Medicine Ball - Potência rotacional de tronco e aceleração de core.
- "lib-18": Caminhada do Fazendeiro (Farmer Walk) - Core Antiflexão Lateral, força de pegada, estabilidade postural dinâmica.
- "lib-19": Agachamento Unilateral no BOSU - Instabilidade proprioceptiva, reabilitação inicial de tornozelo/joelho (Evidência baixa para força máxima).
- "lib-20": Deslocamento Lateral com Cones - Agilidade lateral de mudança de direção (COD), desaceleração e velocidade de reação.

Regras de Seleção:
- Se a busca solicitar controle motor ou preventivo de joelho/LCA, priorize "lib-2".
- Se solicitar preventivo de púbis ou adutores, priorize "lib-3".
- Se solicitar potência reativa ou elasticidade, use "lib-7".
- Se solicitar potência vertical pura, use "lib-4".
- Retorne uma lista JSON de IDs correspondentes baseada nas necessidades expressas (ex: "lib-2", "lib-3").`;

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: `Termo de busca: "${query}". Retorne os IDs selecionados de forma estrita em JSON.` }] }],
      config: {
        systemInstruction: systemInstructions,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exerciseIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 6 a 8 IDs de exercícios selecionados da biblioteca"
            },
            reasoning: {
              type: Type.STRING,
              description: "Breve justificativa científica e biomecânica para a seleção geral baseada no termo pesquisado, focada na fisiologia esportiva da LB Sports"
            }
          },
          required: ["exerciseIds", "reasoning"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json({ result: JSON.parse(resultText) });
  } catch (error: any) {
    console.error("[AI Search Exercises] Erro no backend:", error);
    res.status(500).json({ error: error.message || "Falha na busca inteligente por IA." });
  }
});

apiRouter.post('/ai-prescribe-workout', authMiddleware, async (req, res) => {
  const { athleteData, objective, restrictions, timeAvailable, equipment, periodizationPhase, library } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  let libraryPromptPart = "";
  if (Array.isArray(library) && library.length > 0) {
    libraryPromptPart = `Você deve sugerir de 5 a 8 exercícios altamente específicos e estruturados de forma coerente. Dê PREFERÊNCIA ABSOLUTA aos exercícios cadastrados na Biblioteca do Treinador listados abaixo quando aplicável, especificando seus IDs:
` + library.map((ex: any) => `- "${ex.name}" (ID: ${ex.id}) | Grupo Muscular/Valência: ${ex.muscleGroup || ex.category || ''} ${ex.description ? `| Justificativa/Notas: ${ex.description}` : ''}`).join('\n') + `

ATENÇÃO: Você PODE criar e prescrever novos exercícios específicos que NÃO estão na lista acima caso considere que são mais adequados, específicos ou necessários para o atleta e seu esporte. Quando prescrever um exercício novo fora da biblioteca, retorne o campo "exerciseId" vazio ("").`;
  } else {
    libraryPromptPart = `Você deve sugerir de 5 a 8 exercícios altamente específicos e estruturados de forma coerente. Dê preferência absoluta aos exercícios da nossa biblioteca de elite quando aplicável, especificando seus IDs:
- "Agachamento Traseiro (Back Squat)" (ID: lib-1) - Usar para Força Máxima Bilateral. RPE 8-9.5, VBT: 0.45 - 0.60 m/s.
- "Flexão Nórdica (Nordic Hamstring)" (ID: lib-2) - Usar para Força Excêntrica e prevenção de lesão de LCA/Posterior. 3-4 séries de 4-6 reps de alta qualidade.
- "Adução de Copenhagen (Copenhagen Adduction)" (ID: lib-3) - Usar para pubalgia e estabilidade de adutores. Unilateral.
- "Salto Contramovimento (CMJ)" (ID: lib-4) - Usar para Potência Vertical e Slow SSC. 3-4 séries de 4-5 saltos.
- "Sprints com Trenó de Resistência" (ID: lib-5) - Usar para aceleração horizontal, potência de arrasto.
- "RDL (Romanian Deadlift)" (ID: lib-6) - Usar para cadeia posterior e padrão de dobradiça.
- "Drop Jump (Foco em RSI)" (ID: lib-7) - Usar para potência reativa, rigidez de tornozelo e Fast SSC.
- "Supino Reto com Barra" (ID: lib-8) - Usar para empurrar horizontal bilateral.
- "Remada Curvada Pronada" (ID: lib-9) - Usar para puxar horizontal bilateral.
- "Pallof Press" (ID: lib-10) - Core antirrotação.
- "Leg Press 45º" (ID: lib-11) - Empurrar bilateral seguro.
- "Clean & Jerk (Arremesso)" (ID: lib-12) - Força explosiva global, extensão tripla.
- "Flexão de Braços (Push-Up)" (ID: lib-13) - Empurrar horizontal.
- "Barra Fixa Pronada (Pull-Up)" (ID: lib-14) - Puxar vertical.
- "Corda Naval (Battle Rope Slams)" (ID: lib-15) - Potência e condicionamento anaeróbio de braços.
- "Kettlebell Swing" (ID: lib-16) - Potência balística de quadril.
- "Arremesso de Medicine Ball" (ID: lib-17) - Potência rotacional.
- "Caminhada do Fazendeiro (Farmer Walk)" (ID: lib-18) - Estabilidade postural, core.
- "Agachamento Unilateral no BOSU" (ID: lib-19) - Evitar para atletas de potência máxima (usar somente se houver reabilitação ativa).
- "Deslocamento Lateral com Cones" (ID: lib-20) - Agilidade lateral e COD.`;
  }

  const prompt = `Gere uma prescrição de treino técnico de altíssima performance para a LB Sports, baseada estritamente em evidências científicas biomecânicas de elite e na metodologia de Treinamento Baseado em Velocidade (VBT).

Fatores Atuais do Atleta:
- Perfil/Nível: ${athleteData || 'Atleta geral de rendimento'}
- Objetivo de Performance: ${objective || 'Desenvolvimento atlético integral'}
- Histórico de lesões/Restrições: ${restrictions || 'Nenhuma restrição relatada'}
- Tempo disponível para a sessão: ${timeAvailable || '60 minutos'}
- Equipamentos disponíveis na sessão: ${equipment || 'Estrutura completa de academia'}
- Fase de periodização recomendada: ${periodizationPhase || 'Preparação Geral'}

${libraryPromptPart}

Critérios Científicos Exigidos:
1. Ordem do Treino: Potência e Pliometria sempre primeiro (ex: CMJ, Drop Jumps), seguidos de Força Máxima (ex: Back Squat), seguidos por exercícios unilaterais ou isolados, e finalizando com preventivos/core (ex: Flexão Nórdica, Copenhagen, Pallof Press).
2. Velocidade Alvo (VBT): Para exercícios de força principal (como Back Squat ou Supino), forneça a faixa de velocidade recomendada (ex: "0.45 - 0.60 m/s" para Força Máxima, "0.80 - 1.00 m/s" para Força-Velocidade).
3. Notas de Execução: Forneça avisos de feedback biomecânico de elite (ex: contraindicar valgo dinâmico, focar na fase excêntrica controlada, aplicar máxima velocidade intencional).

Retorne o plano de treino estritamente em formato JSON estruturado com uma análise científica explicativa de cada decisão de prescrição. Do NOT mention artificial intelligence, LLMs, or algorithms. Expose the results as a human Head Coach of elite performance.`;

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            workoutName: { type: Type.STRING, description: "Nome técnico do treino (ex: 'S&C - Potência e Prevenção de LCA')" },
            phase: { type: Type.STRING, description: "Fase de treinamento recomendada" },
            scientificRationale: { type: Type.STRING, description: "Justificativa fisiológica e biomecânica para a montagem geral do treino" },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  exerciseId: { type: Type.STRING, description: "ID correspondente se for da biblioteca (ex: 'lib-1'), ou vazio se for novo" },
                  name: { type: Type.STRING, description: "Nome do exercício" },
                  muscleGroup: { type: Type.STRING, description: "Grupo muscular ou valência física trabalhada" },
                  sets: { type: Type.INTEGER, description: "Número de séries sugeridas (2-4)" },
                  reps: { type: Type.STRING, description: "Repetições ou tempo de execução (ex: '6', '10', '30s')" },
                  weight: { type: Type.STRING, description: "Intensidade sugerida (ex: '75% 1RM', 'Carga moderada', 'BW')" },
                  rest: { type: Type.STRING, description: "Intervalo de descanso (ex: '2 min', '90s')" },
                  notes: { type: Type.STRING, description: "Nota científica de execução e cuidados específicos para este atleta" }
                },
                required: ["name", "muscleGroup", "sets", "reps", "weight", "rest", "notes"]
              }
            }
          },
          required: ["workoutName", "phase", "scientificRationale", "exercises"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json({ result: JSON.parse(resultText) });
  } catch (error: any) {
    console.error("[AI Prescribe Workout] Erro no backend:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar prescrição automática por IA." });
  }
});

apiRouter.post('/ai-chat', authMiddleware, async (req, res) => {
  const { messages, athleteContext } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Chat] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Mensagens inválidas fornecidas." });
  }

  const systemInstructions = `Você é um Cientista de Esporte de Elite, Médico do Esporte, Fisioterapeuta Biomecanista e Preparador Físico de nível Olímpico / Mundial da LB Sports.

SEU PAPEL E DIRETRIZES:
1. Você conversa diretamente com o Treinador / Preparador Físico / Fisioterapeuta em tom altamente técnico, pragmaticamente fundamentado em evidências científicas (IOC, NSCA, ACSM, BJSM, Haff, Gabbett, Stone, etc.).
2. Responda em Português do Brasil (PT-BR) com clareza, formatação impecável em Markdown (listas, negritos, tabelas quando útil, tópicos bem estruturados).
3. NUNCA mencione que você é um "modelo de linguagem", "IA", "LLM", "robô" ou "algoritmo". Apresente-se e atue exclusivamente como o Centro de Inteligência de Performance & Medicina Esportiva LB Sports.
4. Quando fornecido o CONTEXTO DO ATLETA, use rigorosamente esses dados específicos (exames médicos, lesões, histórico, testes IMTP/CMJ, cargas, wellness, hidratação) para personalizar suas respostas. Se houver contradições ou riscos de lesão, alerte proativamente o treinador.
5. Ao discutir intervenções, forneça parâmetros práticos de dosagem: séries, repetições, velocidade VBT (m/s), RPE/PSE, intervalo de descanso e critérios claros de retorno ao jogo (Return to Play - RTP).

CONTEXTO DO ATLETA ATUAL:
${athleteContext || 'Nenhum atleta selecionado no momento (discussão conceitual de fisiologia e metodologia).'}
`;

  try {
    // Transform messages array into contents structure for GoogleGenAI SDK
    const contents = messages.map((m: any) => {
      const parts: any[] = [{ text: m.content || "" }];
      
      if (Array.isArray(m.images) && m.images.length > 0) {
        m.images.forEach((imgStr: string) => {
          if (imgStr && typeof imgStr === 'string') {
            const dataParts = imgStr.split(',');
            const mime = imgStr.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
            const base64 = dataParts[1] || dataParts[0];
            parts.push({
              inlineData: {
                data: base64,
                mimeType: mime
              }
            });
          }
        });
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    const response = await generateContentWithRetry({
      contents,
      config: {
        systemInstruction: systemInstructions,
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    });

    const resultText = response.text || "Desculpe, não consegui processar a resposta no momento.";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("[AI Chat] Erro no backend:", error);
    res.status(500).json({ error: error.message || "Falha na comunicação com o assistente de IA." });
  }
});

apiRouter.all('*', (req, res) => {
  console.warn(`API Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API Route not found: ${req.method} ${req.originalUrl}` });
});

app.use('/api', apiRouter);

async function runSetup(retries = 1) {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL não configurada. O banco de dados não estará disponível.");
    return;
  }

  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.host === 'db.zycnwaqswrunzptyeaso.supabase.co') {
      console.error("\n--- ERRO CRÍTICO DE CONFIGURAÇÃO ---");
      console.error("O host 'db.zycnwaqswrunzptyeaso.supabase.co' é conhecido por falhar.");
      console.error("Verifique se você não deveria estar usando 'db.nkxsqhkxgwpjdcmcetav.supabase.co' ou seu ID de projeto atual.");
      console.error("------------------------------------\n");
    }
  } catch (e) {
    // Ignore URL parsing errors here, they will be caught by pool.connect()
  }
  
  let client;
  try {
    // Tentar conectar com timeout curto para não travar o boot
    console.log(`Tentando conectar ao banco de dados (Tentativa ${4 - retries}/3)...`);
    client = await pool.connect();
    isDbConnected = true;
    console.log("Conexão estabelecida com sucesso. Iniciando configuração de tabelas...");
    
    console.log("Iniciando criação de tabelas e modificação de colunas...");

    // Users table for persistent cloud login
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        athlete_id TEXT,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        dob VARCHAR(255) NOT NULL,
        gender VARCHAR(1) DEFAULT 'M',
        modality TEXT,
        competitive_level TEXT,
        position TEXT,
        injury_history TEXT,
        goal TEXT,
        weekly_frequency INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS gender VARCHAR(1) DEFAULT 'M';`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS modality TEXT;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS competitive_level TEXT;`);
    await client.query(`ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_competitive_level_check;`).catch(() => {});
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS position TEXT;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS injury_history TEXT;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS goal TEXT;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_tournament_mode BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS periodization_start TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS periodization_end TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS training_days JSONB;`).catch(() => {});
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS injuries JSONB;`).catch(() => {});
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS isometric_strength (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        half_squat_kgf REAL, 
        quadriceps_r REAL, 
        quadriceps_l REAL, 
        hamstrings_r REAL, 
        hamstrings_l REAL,
        iq_ratio_r REAL,
        iq_ratio_l REAL,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS half_squat_kgf REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS quadriceps_r REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS quadriceps_l REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS hamstrings_r REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS hamstrings_l REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS iq_ratio_r REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS iq_ratio_l REAL;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await client.query(`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS cmj (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        height REAL, 
        power REAL, 
        depth REAL, 
        rsi REAL, 
        flight_time REAL, 
        weight REAL,
        average_force REAL,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS height REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS power REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS depth REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS rsi REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS flight_time REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS weight REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS average_force REAL;`);
    await client.query(`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS vo2max (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        vo2max REAL, 
        max_heart_rate REAL,
        threshold_heart_rate REAL,
        max_speed REAL, 
        threshold_speed REAL,
        vam REAL,
        rec_10s REAL,
        rec_30s REAL,
        rec_60s REAL,
        max_ventilation REAL,
        score REAL,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS vo2max REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_speed REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_heart_rate REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS threshold_heart_rate REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS threshold_speed REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS vam REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS rec_10s REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS rec_30s REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS rec_60s REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_ventilation REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS score REAL;`);
    await client.query(`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS bioimpedance (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        weight REAL, 
        fat_percentage REAL, 
        muscle_mass REAL,
        visceral_fat REAL,
        hydration REAL,
        basal_metabolism REAL,
        metabolic_age REAL,
        bone_mass REAL,
        physique_rating REAL,
        fat_arm_r REAL,
        fat_arm_l REAL,
        fat_leg_r REAL,
        fat_leg_l REAL,
        fat_trunk REAL,
        muscle_arm_r REAL,
        muscle_arm_l REAL,
        muscle_leg_r REAL,
        muscle_leg_l REAL,
        muscle_trunk REAL,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS weight REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_percentage REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_mass REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS visceral_fat REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS hydration REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS basal_metabolism REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS metabolic_age REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS bone_mass REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS physique_rating REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_arm_r REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_arm_l REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_leg_r REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_leg_l REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_trunk REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_arm_r REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_arm_l REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_leg_r REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_leg_l REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_trunk REAL;`);
    await client.query(`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS speed (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        time_5m REAL, 
        time_10m REAL, 
        time_20m REAL, 
        time_30m REAL, 
        speed_5m REAL, 
        speed_10m REAL, 
        speed_20m REAL, 
        speed_30m REAL, 
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS time_5m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS time_10m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS time_20m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS time_30m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS speed_5m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS speed_10m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS speed_20m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS speed_30m REAL;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await client.query(`ALTER TABLE speed ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS drop_jump (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        weight REAL, 
        drop_height REAL, 
        jump_height REAL, 
        flight_time REAL, 
        contact_time REAL, 
        mean_force REAL, 
        mean_power REAL, 
        stiffness REAL, 
        rsi REAL, 
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS weight REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS drop_height REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS jump_height REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS flight_time REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS contact_time REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS mean_force REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS mean_power REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS stiffness REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS rsi REAL;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await client.query(`ALTER TABLE drop_jump ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS imtp (
        id TEXT PRIMARY KEY, 
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
        date VARCHAR(255) NOT NULL, 
        weight REAL,
        peak_force REAL,
        relative_peak_force REAL,
        time_to_peak_force REAL,
        mean_force REAL,
        rfd_peak REAL,
        rfd_100 REAL,
        rfd_200 REAL,
        rfd_300 REAL,
        impulse_peak REAL,
        impulse_100 REAL,
        impulse_200 REAL,
        impulse_300 REAL,
        ai_details TEXT,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`).catch((e) => console.warn("Erro ao criar imtp:", e.message));
    
    const imtpCols = [
      'weight', 'peak_force', 'relative_peak_force', 'time_to_peak_force', 'mean_force',
      'rfd_peak', 'rfd_100', 'rfd_200', 'rfd_300',
      'impulse_peak', 'impulse_100', 'impulse_200', 'impulse_300'
    ];
    for (const col of imtpCols) {
      await client.query(`ALTER TABLE imtp ADD COLUMN IF NOT EXISTS ${col} REAL;`).catch(() => {});
    }
    await client.query(`ALTER TABLE imtp ADD COLUMN IF NOT EXISTS ai_details TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE imtp ADD COLUMN IF NOT EXISTS observations TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE imtp ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});

    await client.query(`CREATE TABLE IF NOT EXISTS general_strength (
        id TEXT PRIMARY KEY,
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
        date VARCHAR(255) NOT NULL,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`).catch((e) => console.warn("Erro ao criar general_strength:", e.message));

    await client.query(`CREATE TABLE IF NOT EXISTS wellness (
        id TEXT PRIMARY KEY,
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
        date VARCHAR(255) NOT NULL,
        fatigue INTEGER,
        sleep REAL,
        stress INTEGER,
        soreness INTEGER,
        mood INTEGER,
        cognitive_load INTEGER,
        readiness_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE wellness ALTER COLUMN sleep TYPE REAL USING sleep::real;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS readiness_score INTEGER;`);
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS travel_fatigue INTEGER;`);
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;`);
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS menstrual_phase TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS menstrual_symptoms JSONB;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS hrv REAL;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_hours_formatted TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_start_time TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS wake_up_time TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS calculated_sleep_hours REAL;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS is_match_day BOOLEAN;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS emotional_readiness INTEGER;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS psychological_readiness INTEGER;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS psychology_notes TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE wellness ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await client.query(`CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
        date VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        phase VARCHAR(100),
        status VARCHAR(50),
        rpe INTEGER,
        total_load REAL,
        duration_minutes INTEGER,
        monotony REAL,
        strain REAL,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await client.query(`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS trainer_notes TEXT;`);

    await client.query(`CREATE TABLE IF NOT EXISTS prescribed_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
        name VARCHAR(255),
        muscle_group VARCHAR(100),
        sets INTEGER,
        reps VARCHAR(50),
        weight VARCHAR(50),
        rest VARCHAR(50),
        notes TEXT,
        pain_level INTEGER,
        reps_type VARCHAR(50),
        order_index INTEGER DEFAULT 0,
        video_url TEXT,
        image_url TEXT
    );`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS rest VARCHAR(50);`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS notes TEXT;`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS pain_level INTEGER;`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS reps_type VARCHAR(50);`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS video_url TEXT;`);
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS image_url TEXT;`);
    
    // Convert key columns to TEXT to handle any length generated by AI
    await client.query(`ALTER TABLE prescribed_exercises ALTER COLUMN reps TYPE TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE prescribed_exercises ALTER COLUMN weight TYPE TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE prescribed_exercises ALTER COLUMN rest TYPE TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE prescribed_exercises ALTER COLUMN muscle_group TYPE TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE workouts ALTER COLUMN name TYPE TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE workouts ALTER COLUMN phase TYPE TEXT;`).catch(() => {});

    await client.query(`CREATE TABLE IF NOT EXISTS performed_sets (
        id TEXT PRIMARY KEY,
        exercise_id TEXT REFERENCES prescribed_exercises(id) ON DELETE CASCADE,
        reps INTEGER,
        weight REAL,
        rpe INTEGER
    );`);
    await client.query(`ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;`).catch(() => {});

    await client.query(`CREATE TABLE IF NOT EXISTS external_sessions (
        id TEXT PRIMARY KEY,
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
        date VARCHAR(255) NOT NULL,
        type TEXT,
        duration_minutes INTEGER,
        rpe INTEGER,
        notes TEXT,
        load REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    
    // Create default coach user if not exists
    await client.query(`
      INSERT INTO users (id, username, password, role, plan) 
      VALUES ('coach-1', 'Leandro', 'techno10', 'coach', 'pro') 
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, plan = EXCLUDED.plan
    `);

    // Create performance indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wellness_athlete_date ON wellness (athlete_id, date DESC);`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_external_sessions_athlete_date ON external_sessions (athlete_id, date DESC);`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workouts_athlete_date ON workouts (athlete_id, date DESC);`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_workout ON prescribed_exercises (workout_id);`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_performed_sets_exercise ON performed_sets (exercise_id);`).catch(() => {});

    console.log("Banco de dados configurado com sucesso!");
  } catch (error: any) {
    
    if (error.code === 'EAI_AGAIN' || error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      console.error("\n--- ERRO CRÍTICO DE CONEXÃO (DNS) ---");
      console.error("Não foi possível resolver o endereço do banco de dados.");
      const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'desconhecido';
      console.error(`Host tentado: ${host}`);
      console.error("\nESTE ENDEREÇO NÃO EXISTE OU O PROJETO FOI DELETADO NO SUPABASE.");
      console.error("AÇÃO NECESSÁRIA:");
      console.error("1. Vá ao painel do Render (Dashboard).");
      console.error("2. Selecione seu Web Service -> Environment.");
      console.error("3. Atualize a variável DATABASE_URL com o novo ID do projeto Supabase.");
      console.error("------------------------------------\n");
    } else {
      console.error("Erro ao configurar banco de dados:", error.message);
    }

    if (retries > 0) {
      console.log(`Aguardando 5 segundos antes de tentar novamente (${retries} restantes)...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return runSetup(retries - 1);
    }
  } finally {
    if (client) client.release();
  }
}

async function startServer() {
  // Configuração do banco em segundo plano para não travar o início do servidor
  runSetup().catch(e => console.error("Falha na configuração inicial do banco de dados:", e));
  
  const distPath = path.join(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');
  console.log(`Diretório atual (__dirname): ${__dirname}`);
  console.log(`Caminho esperado do index.html: ${indexPath}`);
  
  // Tentar detectar se estamos em produção baseado no NODE_ENV ou na existência da pasta dist
  let isProd = process.env.NODE_ENV === 'production';
  
  // Se não estiver explicitamente em produção, mas a pasta dist existir, assumimos produção
  try {
    await fs.access(indexPath);
    if (!isProd) {
      console.log("Pasta 'dist' detectada. Forçando modo PRODUÇÃO.");
      isProd = true;
    }
  } catch (e) {
    if (isProd) {
      console.warn("Aviso: NODE_ENV é 'production' mas a pasta 'dist' não foi encontrada.");
    }
  }

  console.log(`Modo de execução: ${isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
  
  if (!isProd) {
    console.log("Iniciando Vite Middleware...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        
        const envScript = `
          <script>
            window.ENV = {
              VITE_SUPABASE_URL: "${supabaseUrl}",
              VITE_SUPABASE_ANON_KEY: "${supabaseAnonKey}"
            };
          </script>
        `;
        template = template.replace('<head>', `<head>\n${envScript}`);
        
        res.status(200).set({ 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log(`Servindo arquivos estáticos de: ${distPath}`);
    
    // Serve static assets EXCEPT index.html since we handle index.html below
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.includes('sw.js') || filePath.includes('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
    // Rota catch-all para o SPA com injeção de variáveis de ambiente
    app.get('*', async (req, res) => {
      try {
        await fs.access(indexPath);
        let html = await fs.readFile(indexPath, 'utf-8');
        const envScript = `
          <script>
            window.ENV = {
              VITE_SUPABASE_URL: "${supabaseUrl}",
              VITE_SUPABASE_ANON_KEY: "${supabaseAnonKey}"
            };
          </script>
        `;
        html = html.replace('<head>', `<head>\n${envScript}`);
        res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }).send(html);
      } catch (err) {
        // Se dist/index.html ainda não estiver pronto, mostra carregamento temporário que auto-recarrega
        res.status(202).set({
          'Content-Type': 'text/html',
          'Refresh': '3'
        }).send(`
          <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #334155; max-width: 500px; margin: 80px auto; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #0f172a; border-radius: 50%; margin: 0 auto 20px auto; animation: spin 1s linear infinite;"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <h1 style="color: #0f172a; font-size: 1.5rem; margin-bottom: 10px; font-weight: 800;">LBHUB - Inicializando...</h1>
            <p style="font-size: 0.95rem; color: #64748b; line-height: 1.5;">O sistema está carregando e otimizando os arquivos do painel. Por favor, aguarde alguns segundos.</p>
            <p style="margin-top: 15px; font-size: 0.8rem; color: #94a3b8;">A página será recarregada automaticamente...</p>
          </div>
        `);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[SERVIÇO] Servidor Iniciado`);
    console.log(`[SERVIÇO] Porta: ${port}`);
    console.log(`[SERVIÇO] Modo: ${isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  });
}

startServer();
