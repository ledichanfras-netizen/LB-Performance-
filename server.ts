import {workoutExecutionRouter} from './server/workoutExecution';
import {workoutHistoryRouter,workoutFromRows} from './server/workoutHistory';
import {assertCompleteSnapshots} from './server/snapshotContract';
import {loadPerformanceContext,performancePrompt} from './server/performanceContext';
import { realizedTonnage } from './src/utils/sessionMetrics';
import { prepareBackupImport } from './server/backupImport';
import { validateSportsPayload, SportsValidationError } from './server/sportsValidation';
import { sportsDeletionRouter } from './server/sportsDeletion';
import { sportsReadScope } from './server/readScope';
import {gymPrinciples} from './src/utils/periodizationIntelligence';
import {externalSessionDetailsSQL,saveExternalSession} from './server/externalSessionDetails';
import {externalSessionFromRow,externalSessionColumns} from './src/utils/externalSessions';
import {secureLogin} from './server/secureLogin';
import { ensureAbalakovTable, saveAbalakovAssessments } from './server/abalakov';
import { readFollowUpType, followUpType } from './src/utils/followUp';
import { reassessmentRouter } from './server/reassessment';
import { readReassessmentPlan } from './src/utils/reassessment';
import { SyncConflict, lockAthleteSnapshots, readSavedRevisions, syncRevision, archiveMissingWorkoutsSQL } from './server/workoutSync';
import { normalizeBirthDate } from './src/utils/birthDate';
import { createSaveBatch } from './server/saveBatch';
import { exerciseMetadata, restorePerformedMetrics } from "./server/exerciseMetadata";
import express from 'express';
import { billingRouter } from './server/billing';
import { resolveSupervisedAccount } from './server/supervisor';
import { requireAIAccess } from './server/aiPolicy';
import { liveMembership } from './server/liveMembership';
import { accountRouter } from './server/accounts';
import { saveStudentData } from './server/studentSave';
import { hasSportsAccess } from './server/entitlement';
import { validateScopedSave, attachSavedAthletes } from './server/saveScope';
import { scopedDelete, mayAccessAthlete, ScopeDenied } from './server/scope';
import compression from 'compression';
import { pool, db } from './src/db/index.ts';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
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

const CACHE_FILE = path.join(__dirname, 'local_athletes_cache.json');

async function getCachedAthletes(): Promise<any[]> {
  if(process.env.ACCOUNTS_ENABLED==='true' && isDbConnected)return [];
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((a: any) => a && a.id && !a.id.startsWith('featured-') && !a.id.startsWith('model-'));
    }
  } catch (e) {}
  return [];
}

async function setCachedAthletes(incoming: any[]): Promise<void> {
  if(process.env.ACCOUNTS_ENABLED==='true' && isDbConnected)return;
  try {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    const cleanIncoming = incoming.filter((a: any) => a && a.id && !a.id.startsWith('featured-') && !a.id.startsWith('model-'));
    if (cleanIncoming.length === 0) return;
    const existing = await getCachedAthletes();
    const map = new Map<string, any>();
    for (const a of existing) {
      if (a && a.id && !a.id.startsWith('featured-') && !a.id.startsWith('model-')) map.set(a.id, a);
    }
    for (const a of cleanIncoming) {
      if (a && a.id) {
        const old = map.get(a.id);
        if (old) {
          map.set(a.id, {
            ...old,
            ...a,
            wellness: a.wellness !== undefined ? a.wellness : old.wellness,
            workouts: a.workouts !== undefined ? a.workouts : old.workouts,
            externalSessions: a.externalSessions !== undefined ? a.externalSessions : old.externalSessions,
            assessments: {
              ...(old.assessments || {}),
              ...(a.assessments || {})
            }
          });
        } else {
          map.set(a.id, a);
        }
      }
    }
    const merged = Array.from(map.values()).filter((a: any) => a && a.id && !a.id.startsWith('featured-') && !a.id.startsWith('model-'));
    await fs.writeFile(CACHE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Cache] Falha ao gravar cache local de atletas:', e);
  }
}

async function removeWorkoutFromCache(workoutId: string): Promise<boolean> {
  try {
    const list = await getCachedAthletes();
    let changed = false;
    for (const ath of list) {
      if (Array.isArray(ath.workouts)) {
        const len = ath.workouts.length;
        ath.workouts = ath.workouts.filter((w: any) => w.id !== workoutId);
        if (ath.workouts.length !== len) changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(CACHE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
    return changed;
  } catch (e) {
    return false;
  }
}

async function removeWellnessFromCache(wellnessId: string): Promise<boolean> {
  try {
    const list = await getCachedAthletes();
    let changed = false;
    for (const ath of list) {
      if (Array.isArray(ath.wellness)) {
        const len = ath.wellness.length;
        ath.wellness = ath.wellness.filter((w: any) => w.id !== wellnessId);
        if (ath.wellness.length !== len) changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(CACHE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
    return changed;
  } catch (e) {
    return false;
  }
}

async function removeSessionFromCache(sessionId: string): Promise<boolean> {
  try {
    const list = await getCachedAthletes();
    let changed = false;
    for (const ath of list) {
      if (Array.isArray(ath.externalSessions)) {
        const len = ath.externalSessions.length;
        ath.externalSessions = ath.externalSessions.filter((s: any) => s.id !== sessionId);
        if (ath.externalSessions.length !== len) changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(CACHE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
    return changed;
  } catch (e) {
    return false;
  }
}

async function removeAssessmentFromCache(type: string, assessmentId: string): Promise<boolean> {
  try {
    const list = await getCachedAthletes();
    let changed = false;
    for (const ath of list) {
      if (ath.assessments && Array.isArray(ath.assessments[type])) {
        const len = ath.assessments[type].length;
        ath.assessments[type] = ath.assessments[type].filter((item: any) => item.id !== assessmentId);
        if (ath.assessments[type].length !== len) changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(CACHE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
    return changed;
  } catch (e) {
    return false;
  }
}

async function removeAthleteFromCache(athleteId: string): Promise<boolean> {
  try {
    const list = await getCachedAthletes();
    const updated = list.filter((a: any) => a.id !== athleteId);
    if (updated.length !== list.length) {
      await fs.writeFile(CACHE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

process.on('uncaughtException', (err: any) => {
  console.error('[UNCAUGHT EXCEPTION]', err?.message || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(p)) return p;
  }
  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) return p;
  }
  return 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const app = express();
const port = getPort();
const host = getHost();

app.use(compression());

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.url}`);
  }
  next();
});

// Database pool is configured via src/db/index.ts (Cloud SQL Object Method)

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
    followUpType: followUpType(athlete.followUpType),
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
  if (!process.env.SQL_HOST && !process.env.DATABASE_URL) return;
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
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS reassessment_plan JSONB');
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

let isDbConnected = Boolean(process.env.SQL_HOST || process.env.DATABASE_URL);

pool.on('error', (err) => {
  console.error('Erro no cliente PostgreSQL inativo:', err?.message || err);
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const apiRouter = express.Router();

// Auth Middleware
const authMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if((decoded as any).supervision===true){
      try{
        if(process.env.ACCOUNTS_ENABLED!=='true' || process.env.SCOPED_SPORTS_ENABLED!=='true')return res.status(403).json({error:'Supervisão indisponível.'});
        const account=await resolveSupervisedAccount(pool,decoded,req.method,req.path);
        if(process.env.BILLING_ENFORCE==='true' && !await hasSportsAccess(pool,account as any))return res.status(402).json({error:'O treinador está sem acesso ativo.'});
        req.account=account;req.user={...(decoded as any),id:account!.user_id,role:'coach',athleteId:null,organizationId:account!.organization_id};
        return next();
      }catch{return res.status(403).json({error:'Supervisão somente leitura: vínculo ou sessão indisponível.'});}
    }
    const claims = decoded as any;
    if(claims.accountMode!=='scoped' || typeof claims.organizationId!=='string')return res.status(401).json({error:'Faça login novamente pelo acesso seguro.'});
    try {
      // A missing, inactive or revoked membership always invalidates the session.
      const account=await liveMembership(pool,claims);
      if(process.env.BILLING_ENFORCE==='true' && !req.originalUrl.startsWith('/api/billing/') && !await hasSportsAccess(pool,account))return res.status(402).json({error:'Assinatura vencida ou não liberada.'});
      req.account=account;claims.role=account.role;claims.athleteId=account.athlete_id;claims.organizationId=account.organization_id;claims.platformAdmin=account.platform_admin;
    } catch (e:any) {
      return res.status(e.message==='INVALID_SESSION'?401:503).json({error:e.message==='INVALID_SESSION'?'Sessão desativada ou atualizada. Entre novamente pelo convite de acesso.':'Não foi possível verificar a sessão. Tente novamente.'});
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const scopedAccountRouter = accountRouter(pool, JWT_SECRET);
apiRouter.use('/accounts', scopedAccountRouter);
apiRouter.use('/billing', billingRouter(pool, authMiddleware));
apiRouter.use('/athletes', authMiddleware, workoutExecutionRouter(pool), workoutHistoryRouter(pool), reassessmentRouter(pool));

// Minimal readiness check; diagnostics and credentials are never public.
apiRouter.get('/health',async(_req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{const query={text:'SELECT 1',query_timeout:3000};await pool.query(query);return res.json({status:'ok'});}
 catch{return res.status(503).json({status:'unavailable'});}
});

apiRouter.get('/test', (req, res) => {
  res.send('Server is alive');
});

// Auth Routes
apiRouter.post('/auth/login', secureLogin(pool, JWT_SECRET));

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
    sportsReadScope((req as any).account);
    if (!isDbConnected || (!process.env.SQL_HOST && !process.env.DATABASE_URL)) return res.status(503).json({error:'Dados temporariamente indisponíveis. Seu histórico não foi substituído.'});

    console.log(`[SERVIÇO] Buscando atletas no banco local... ${isAthlete ? `(Atleta: ${athleteId})` : '(Todos)'}`);
    
    const pagedHistory=req.query.history==='paged';
    // Condições WHERE para otimização
    const scoped = sportsReadScope((req as any).account);
    const scopedIds="SELECT athlete_id FROM lb_accounts.athlete_scopes WHERE organization_id=$1 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=lb_accounts.athlete_scopes.athlete_id)" + (isAthlete ? " AND athlete_id=$2" : "");
    const whereClause = scoped ? `WHERE athlete_id IN (${scopedIds})` : isAthlete && athleteId ? 'WHERE athlete_id = $1' : '';
    const params = scoped ? (isAthlete ? [scoped.organization_id,athleteId] : [scoped.organization_id]) : isAthlete && athleteId ? [athleteId] : [];

    let athletesRes, wellnessRes, workoutsRes, exercisesRes, performedSetsRes, 
        strengthRes, cmjRes, abalakovRes, vo2Res, bioRes, speedRes, externalRes, dropJumpRes, imtpRes;

    let readClient:any=null;
    let discardReadClient=false;
    try {
      if(pagedHistory){readClient=await pool.connect();await readClient.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await readClient.query("SET LOCAL statement_timeout='15000ms'");}
      const reads=readClient||pool;
      const dbQueries = await Promise.all([
        reads.query(`SELECT * FROM athletes ${scoped ? `WHERE id IN (${scopedIds})` : isAthlete && athleteId ? 'WHERE id = $1' : ''} ORDER BY name ASC`, params),
        reads.query(`SELECT * FROM wellness ${whereClause} ORDER BY date DESC`, params),
        pagedHistory ? reads.query(`SELECT athlete_id,count(*)::integer AS history_count FROM workouts ${whereClause} AND archived_at IS NULL GROUP BY athlete_id`,params) : reads.query(`SELECT * FROM workouts ${whereClause} ORDER BY date DESC`, params),
        pagedHistory ? Promise.resolve({rows:[]}) : reads.query(`SELECT * FROM prescribed_exercises ${scoped ? `WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id IN (${scopedIds}))` : isAthlete && athleteId ? 'WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1)' : ''} ORDER BY order_index ASC, id ASC`, params),
        pagedHistory ? Promise.resolve({rows:[]}) : reads.query(`SELECT * FROM performed_sets ${scoped ? `WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id IN (${scopedIds})))` : isAthlete && athleteId ? 'WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE athlete_id = $1))' : ''}`, params),
        reads.query(`SELECT * FROM isometric_strength ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM cmj ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM vo2max ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM bioimpedance ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM speed ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM external_sessions ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM drop_jump ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM imtp ${whereClause} ORDER BY date DESC`, params),
        reads.query(`SELECT * FROM abalakov ${whereClause} ORDER BY date DESC`, params)
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
      abalakovRes = dbQueries[13];
      if(readClient)await readClient.query('COMMIT');
    } catch (dbError: any) {
      if(readClient)try{await readClient.query('ROLLBACK');}catch{discardReadClient=true;}
      return res.status(503).json({error:'Não foi possível consultar os dados autorizados. Tente novamente.'});
    } finally {readClient?.release(discardReadClient);}

    const cleanAthleteRows = (athletesRes.rows || []).filter(a => {
      if (!a || !a.id || a.id === 'meta-custom-library-exercises') return false;
      if (isAthlete && athleteId && (a.id === athleteId || a.id === athleteId.replace('user-', ''))) return true;
      return !a.id.startsWith('featured-') && !a.id.startsWith('model-');
    });

    // An empty authorized result is authoritative; never load a global fallback.

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
    const workoutsByAth = groupById(pagedHistory?[]:workoutsRes.rows.filter((w:any) => !w.archived_at));
    const historyCounts=new Map(workoutsRes.rows.map((w:any)=>[w.athlete_id,Number(w.history_count)]));
    const strengthByAth = groupById(strengthRes.rows);
    const cmjByAth = groupById(cmjRes.rows);
    const abalakovByAth = groupById(abalakovRes.rows);
    const vo2ByAth = groupById(vo2Res.rows);
    const bioByAth = groupById(bioRes.rows);
    const speedByAth = groupById(speedRes.rows);
    const externalByAth = groupById(externalRes.rows);
    const dropJumpByAth = groupById(dropJumpRes.rows);
    const imtpByAth = groupById(imtpRes.rows);

    const athletes = cleanAthleteRows.map(a => {
      const parsedFields = parseBackupAthleteFields(a);
      return {
        id: a.id,
        name: a.name,
        photoUrl: a.photo_url || a.photoUrl || parsedFields.photoUrl || undefined,
        dob: normalizeBirthDate(a.dob),
            syncRevision: syncRevision(a.updated_at),
            historyComplete: !pagedHistory,
            historyWorkoutCount: pagedHistory?(historyCounts.get(a.id)??0):undefined,
            reassessmentPlan: readReassessmentPlan(a.reassessment_plan),
        gender: a.gender || 'M',
        modality: a.modality,
        competitiveLevel: a.competitive_level,
        position: a.position,
        goal: a.goal,
        weeklyFrequency: a.weekly_frequency,
        followUpType: readFollowUpType(a),
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
      externalSessions: (externalByAth[a.id] || []).map((es: any) => ({
        ...externalSessionFromRow(es)
      })),
      workouts: (workoutsByAth[a.id] || []).map((wk:any)=>workoutFromRows(wk,exByWorkout[wk.id]||[],(exByWorkout[wk.id]||[]).flatMap((ex:any)=>setsByEx[ex.id]||[]))),
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
        abalakov: (abalakovByAth[a.id] || []).map((c: any) => ({
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
            force100: im.force_100, force200: im.force_200, force300: im.force_300,
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

apiRouter.post('/backup/import',authMiddleware,async(req:any,res)=>{
 try{
  const incoming=Array.isArray(req.body)?req.body:req.body?.athletes;
  const preview=await prepareBackupImport(pool,req.account,incoming);
  if(req.body?.dryRun===true||preview.importCount===0)return res.json({success:true,importCount:preview.importCount,preservedCount:preview.preservedCount,preview:req.body?.dryRun===true});
  req.body=preview.athletes;
  return saveAthletesHandler(req,res);
 }catch(error){return res.status(error instanceof ScopeDenied?403:error instanceof SportsValidationError?400:503).json({error:error instanceof SportsValidationError?error.message:'Não foi possível importar os cadastros autorizados.'});}
});

const saveAthletesHandler = async (req:any, res:any) => {
  const athletes = req.body;
  try{sportsReadScope(req.account);validateSportsPayload(athletes);if(req.account.role==='coach')assertCompleteSnapshots(athletes);}catch(error){return res.status(error instanceof ScopeDenied?403:400).json({error:error instanceof Error?error.message:'Dados inválidos.'});}

  if ((req as any).account?.role === 'athlete') {
    try {return res.json(await saveStudentData(pool,(req as any).account,athletes));}
    catch (error:any) {if(error instanceof SportsValidationError)return res.status(400).json({error:error.message});if(error instanceof SyncConflict)return res.status(409).json({error:error.message,code:'SYNC_CONFLICT'});console.error('[StudentSave]',error.code || error.name);return res.status(error instanceof ScopeDenied?403:503).json({error:error instanceof ScopeDenied?'Este registro não pertence ao aluno.':'Não foi possível salvar agora. Seus registros permanecem no dispositivo; tente sincronizar novamente.'});}
  }
  
  // Tentar reconectar de forma assíncrona se não estiver conectado, sem bloquear a requisição atual
  if (!isDbConnected && (process.env.SQL_HOST || process.env.DATABASE_URL)) {
    pool.connect().then(client => {
      client.release();
      isDbConnected = true;
      console.log("Reconexão assíncrona bem-sucedida durante /salvar");
      ensureColumns();
    }).catch(err => {
      // Ignorar erro em background para não poluir o console excessivamente
    });
  }

  if ((!process.env.SQL_HOST && !process.env.DATABASE_URL) || !isDbConnected) return res.status(503).json({error:'Banco indisponível. O registro ainda não foi salvo.'});

  console.log(`Recebida solicitação de salvamento para ${athletes.length} atletas.`);
  const client = await pool.connect().catch(()=>null);
  if(!client)return res.status(503).json({error:"Banco indisponível. Tente salvar novamente."});
  let discardClient = false;
  try {
    console.log(`Iniciando transação para salvar ${athletes.length} atletas...`);
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '30s'; SET LOCAL lock_timeout = '10s'; SET LOCAL idle_in_transaction_session_timeout = '15s'");
    if ((req as any).account) await validateScopedSave(client,(req as any).account,athletes);
    await lockAthleteSnapshots(client, athletes);
    const writes = createSaveBatch(client);
    for (const athlete of athletes) {
      console.log(`Salvando atleta: ${athlete.name} (${athlete.id})`);
      await writes.query(
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
        await writes.query(`DELETE FROM wellness WHERE athlete_id = $1 AND id NOT IN (${wlPlaceholders})`, [athlete.id, ...incomingWlIds]);
      } else {
        await writes.query('DELETE FROM wellness WHERE athlete_id = $1', [athlete.id]);
      }
      for (const w of (athlete.wellness || [])) {
        if (!w.id) w.id = `wl-${Date.now()}-${Math.random()}`;
        await writes.query(
          'INSERT INTO wellness (id, athlete_id, date, fatigue, sleep, stress, soreness, mood, cognitive_load, readiness_score, travel_fatigue, sleep_quality, menstrual_phase, menstrual_symptoms, hrv, sleep_hours_formatted, sleep_start_time, wake_up_time, calculated_sleep_hours, is_match_day, emotional_readiness, psychological_readiness, psychology_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) ON CONFLICT (id) DO UPDATE SET date = $3, fatigue = $4, sleep = $5, stress = $6, soreness = $7, mood = $8, cognitive_load = $9, readiness_score = $10, travel_fatigue = $11, sleep_quality = $12, menstrual_phase = $13, menstrual_symptoms = $14, hrv = $15, sleep_hours_formatted = $16, sleep_start_time = $17, wake_up_time = $18, calculated_sleep_hours = $19, is_match_day = $20, emotional_readiness = $21, psychological_readiness = $22, psychology_notes = $23',
          [
            w.id,
            athlete.id,
            w.date,
            w.fatigue ?? 0,
            safeNum(w.sleep, 0),
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
        await writes.query(`DELETE FROM external_sessions WHERE athlete_id = $1 AND id NOT IN (${sesPlaceholders})`, [athlete.id, ...incomingSesIds]);
      } else {
        await writes.query('DELETE FROM external_sessions WHERE athlete_id = $1', [athlete.id]);
      }
      for (const es of (athlete.externalSessions || [])) {
        if (!es.id) es.id = `es-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await saveExternalSession(writes,athlete.id,es);
      }

      console.log(`Salvando treinos para ${athlete.name}...`);
      const incomingWorkoutIds = (athlete.workouts || []).map((wk: any) => wk.id).filter((id: any) => id);
      
      // Archive omitted workouts instead of deleting their prescription/history.
      await writes.query(archiveMissingWorkoutsSQL, [athlete.id,JSON.stringify(incomingWorkoutIds)]);

      for (const wk of (athlete.workouts || [])) {
        wk.totalLoad=realizedTonnage(wk.exercises||[]);
        if (!wk.id) wk.id = `wk-${Date.now()}-${Math.random()}`;
        const cleanDate = wk.date ? (typeof wk.date === 'string' ? wk.date.split('T')[0] : new Date(wk.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
        await writes.query(
          'INSERT INTO workouts (id, athlete_id, date, name, phase, status, rpe, total_load, duration_minutes, monotony, strain, feedback, trainer_notes, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET date = $3, name = $4, phase = $5, status = $6, rpe = $7, total_load = $8, duration_minutes = $9, monotony = $10, strain = $11, feedback = $12, trainer_notes = $13, updated_at = CURRENT_TIMESTAMP',
          [wk.id, athlete.id, cleanDate, wk.name ?? null, wk.phase ?? null, wk.status ?? null, wk.rpe ?? null, realizedTonnage(wk.exercises || []), wk.durationMinutes ?? null, wk.monotony ?? null, wk.strain ?? null, wk.feedback ?? null, wk.trainerNotes ?? null]
        );

        // Deep sync for exercises: delete orphans
        const currentExIds = (wk.exercises || []).map((e: any) => e.id).filter((id: any) => id);
        if (currentExIds.length > 0) {
          const exPlaceholders = currentExIds.map((_, idx) => `$${idx + 2}`).join(', ');
          await writes.query(`DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id = $1 AND id NOT IN (${exPlaceholders}))`, [wk.id, ...currentExIds]);
          await writes.query(`DELETE FROM prescribed_exercises WHERE workout_id = $1 AND id NOT IN (${exPlaceholders})`, [wk.id, ...currentExIds]);
        } else {
          await writes.query('DELETE FROM performed_sets WHERE exercise_id IN (SELECT id FROM prescribed_exercises WHERE workout_id = $1)', [wk.id]);
          await writes.query('DELETE FROM prescribed_exercises WHERE workout_id = $1', [wk.id]);
        }
        const exercisesList = (wk.exercises || []);
        for (let idx = 0; idx < exercisesList.length; idx++) {
          const ex = exercisesList[idx];
          if (!ex.id) ex.id = `ex-${Date.now()}-${Math.random()}`;
          const exOrderIndex = idx;
          await writes.query(
            'INSERT INTO prescribed_exercises (id, workout_id, name, muscle_group, sets, reps, weight, rest, notes, pain_level, reps_type, order_index, video_url, image_url, prescription_meta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO UPDATE SET name = $3, muscle_group = $4, sets = $5, reps = $6, weight = $7, rest = $8, notes = $9, pain_level = $10, reps_type = $11, order_index = $12, video_url = $13, image_url = $14, prescription_meta = $15',
            [ex.id, wk.id, ex.name ?? null, ex.muscleGroup ?? null, ex.sets ?? null, ex.reps ?? null, ex.weight ?? null, ex.rest ?? null, ex.notes ?? null, ex.painLevel ?? null, ex.repsType ?? 'reps', exOrderIndex, ex.videoUrl ?? null, ex.imageUrl ?? null, exerciseMetadata(ex)]
          );

          // Sync performed sets
          const currentSetIds = (ex.performedSets || []).map((s: any) => s.id).filter((id: any) => id);
          if (currentSetIds.length > 0) {
            const setPlaceholders = currentSetIds.map((_, idx) => `$${idx + 2}`).join(', ');
            await writes.query(`DELETE FROM performed_sets WHERE exercise_id = $1 AND id NOT IN (${setPlaceholders})`, [ex.id, ...currentSetIds]);
          } else {
            await writes.query('DELETE FROM performed_sets WHERE exercise_id = $1', [ex.id]);
          }
          for (const s of (ex.performedSets || [])) {
              if (!s.id) s.id = `s-${Date.now()}-${Math.random()}`;
              await writes.query(
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
          await writes.query(
            'INSERT INTO isometric_strength (id, athlete_id, date, half_squat_kgf, quadriceps_r, quadriceps_l, hamstrings_r, hamstrings_l, iq_ratio_r, iq_ratio_l, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET date = $3, half_squat_kgf = $4, quadriceps_r = $5, quadriceps_l = $6, hamstrings_r = $7, hamstrings_l = $8, iq_ratio_r = $9, iq_ratio_l = $10, observations = $11', 
            [asm.id, athlete.id, asm.date, asm.halfSquatKgf ?? 0, asm.quadricepsR ?? 0, asm.quadricepsL ?? 0, asm.hamstringsR ?? 0, asm.hamstringsL ?? 0, asm.iqRatioR ?? 0, asm.iqRatioL ?? 0, asm.observations || '']
          );
        }
        
        const cmj = athlete.assessments.cmj || [];
        console.log(`[API] ${cmj.length} saltos CMJ.`);
        for (const asm of cmj) {
          if (!asm.id) asm.id = `cmj-${Date.now()}-${Math.random()}`;
          await writes.query(
            'INSERT INTO cmj (id, athlete_id, date, height, power, depth, rsi, flight_time, weight, average_force, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET date = $3, height = $4, power = $5, depth = $6, rsi = $7, flight_time = $8, weight = $9, average_force = $10, observations = $11', 
            [asm.id, athlete.id, asm.date, asm.height ?? 0, asm.power ?? 0, asm.depth ?? 0, asm.rsi ?? 0, asm.flightTime ?? 0, asm.weight ?? 0, asm.averageForce ?? 0, asm.observations || '']
          );
        }

        await saveAbalakovAssessments(writes, athlete);

        const vo2 = athlete.assessments.vo2max || [];
        console.log(`[API] ${vo2.length} testes de VO2max.`);
        for (const asm of vo2) {
          if (!asm.id) asm.id = `vo2-${Date.now()}-${Math.random()}`;
          await writes.query(
            'INSERT INTO vo2max (id, athlete_id, date, vo2max, max_heart_rate, threshold_heart_rate, max_speed, threshold_speed, vam, rec_10s, rec_30s, rec_60s, max_ventilation, score, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO UPDATE SET date = $3, vo2max = $4, max_heart_rate = $5, threshold_heart_rate = $6, max_speed = $7, threshold_speed = $8, vam = $9, rec_10s = $10, rec_30s = $11, rec_60s = $12, max_ventilation = $13, score = $14, observations = $15', 
            [asm.id, athlete.id, asm.date, asm.vo2max ?? 0, asm.maxHeartRate ?? 0, asm.thresholdHeartRate ?? 0, asm.maxSpeed ?? 0, asm.thresholdSpeed ?? 0, asm.vam ?? 0, asm.rec10s ?? 0, asm.rec30s ?? 0, asm.rec60s ?? 0, asm.maxVentilation ?? 0, asm.score ?? 0, asm.observations || '']
          );
        }

        const bio = athlete.assessments.bioimpedance || [];
        console.log(`[API] ${bio.length} bioimpedâncias.`);
        for (const asm of bio) {
          if (!asm.id) asm.id = `bio-${Date.now()}-${Math.random()}`;
          await writes.query(
            'INSERT INTO bioimpedance (id, athlete_id, date, weight, fat_percentage, muscle_mass, visceral_fat, hydration, basal_metabolism, metabolic_age, bone_mass, physique_rating, fat_arm_r, fat_arm_l, fat_leg_r, fat_leg_l, fat_trunk, muscle_arm_r, muscle_arm_l, muscle_leg_r, muscle_leg_l, muscle_trunk, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) ON CONFLICT (id) DO UPDATE SET date = $3, weight = $4, fat_percentage = $5, muscle_mass = $6, visceral_fat = $7, hydration = $8, basal_metabolism = $9, metabolic_age = $10, bone_mass = $11, physique_rating = $12, fat_arm_r = $13, fat_arm_l = $14, fat_leg_r = $15, fat_leg_l = $16, fat_trunk = $17, muscle_arm_r = $18, muscle_arm_l = $19, muscle_leg_r = $20, muscle_leg_l = $21, muscle_trunk = $22, observations = $23',
            [asm.id, athlete.id, asm.date, asm.weight ?? 0, asm.fatPercentage ?? 0, asm.muscleMass ?? 0, asm.visceralFat ?? 0, asm.hydration ?? 0, asm.basalMetabolism ?? 0, asm.metabolicAge ?? 0, asm.boneMass ?? 0, asm.physiqueRating ?? 0, asm.fatArmR ?? 0, asm.fatArmL ?? 0, asm.fatLegR ?? 0, asm.fatLegL ?? 0, asm.fatTrunk ?? 0, asm.muscleArmR ?? 0, asm.muscleArmL ?? 0, asm.muscleLegR ?? 0, asm.muscleLegL ?? 0, asm.muscleTrunk ?? 0, asm.observations || '']
          );
        }

        const speed = athlete.assessments.speed || [];
        console.log(`[API] ${speed.length} testes de velocidade.`);
        for (const asm of speed) {
          if (!asm.id) asm.id = `spd-${Date.now()}-${Math.random()}`;
          await writes.query(
            'INSERT INTO speed (id, athlete_id, date, time_5m, time_10m, time_20m, time_30m, speed_5m, speed_10m, speed_20m, speed_30m, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO UPDATE SET date = $3, time_5m = $4, time_10m = $5, time_20m = $6, time_30m = $7, speed_5m = $8, speed_10m = $9, speed_20m = $10, speed_30m = $11, observations = $12', 
            [asm.id, athlete.id, asm.date, asm.time5m ?? 0, asm.time10m ?? 0, asm.time20m ?? 0, asm.time30m ?? 0, asm.speed5m ?? 0, asm.speed10m ?? 0, asm.speed20m ?? 0, asm.speed30m ?? 0, asm.observations || '']
          );
        }

        const dropJump = athlete.assessments.dropJump || [];
        console.log(`[API] ${dropJump.length} saltos Drop Jump.`);
        for (const asm of dropJump) {
          if (!asm.id) asm.id = `dj-${Date.now()}-${Math.random()}`;
          await writes.query(
            'INSERT INTO drop_jump (id, athlete_id, date, weight, drop_height, jump_height, flight_time, contact_time, mean_force, mean_power, stiffness, rsi, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET date = $3, weight = $4, drop_height = $5, jump_height = $6, flight_time = $7, contact_time = $8, mean_force = $9, mean_power = $10, stiffness = $11, rsi = $12, observations = $13', 
            [asm.id, athlete.id, asm.date, asm.weight ?? 0, asm.dropHeight ?? 30, asm.jumpHeight ?? 0, asm.flightTime ?? 0, asm.contactTime ?? 0, asm.meanForce ?? 0, asm.meanPower ?? 0, asm.stiffness ?? 0, asm.rsi ?? 0, asm.observations || '']
          );
        }

        const imtp = athlete.assessments.imtp || [];
        console.log(`[API] ${imtp.length} testes IMTP.`);
        for (const asm of imtp) {
          if (!asm.id) asm.id = `im-${Date.now()}-${Math.random()}`;
          await writes.query(
            'INSERT INTO imtp (id, athlete_id, date, weight, peak_force, relative_peak_force, time_to_peak_force, mean_force, rfd_peak, rfd_100, rfd_200, rfd_300, impulse_peak, impulse_100, impulse_200, impulse_300, ai_details, observations, force_100, force_200, force_300) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) ON CONFLICT (id) DO UPDATE SET date = $3, weight = $4, peak_force = $5, relative_peak_force = $6, time_to_peak_force = $7, mean_force = $8, rfd_peak = $9, rfd_100 = $10, rfd_200 = $11, rfd_300 = $12, impulse_peak = $13, impulse_100 = $14, impulse_200 = $15, impulse_300 = $16, ai_details = $17, observations = $18, force_100 = $19, force_200 = $20, force_300 = $21', 
            [
              asm.id, 
              athlete.id, 
              asm.date, 
              asm.weight ?? null,
              asm.peakForce ?? null, 
              asm.relativePeakForce ?? null, 
              asm.timeToPeakForce ?? null, 
              asm.meanForce ?? null, 
              asm.rfdPeak ?? null, 
              asm.rfd100 ?? null, 
              asm.rfd200 ?? null, 
              asm.rfd300 ?? null, 
              asm.impulsePeak ?? null, 
              asm.impulse100 ?? null, 
              asm.impulse200 ?? null, 
              asm.impulse300 ?? null, 
              asm.aiDetails ? JSON.stringify(asm.aiDetails) : null, 
              asm.observations || '',
              asm.force100 ?? null, asm.force200 ?? null, asm.force300 ?? null
            ]
          );
        }
      }
    }

    await writes.flush();
    if ((req as any).account) await attachSavedAthletes(client,(req as any).account,athletes);
    const syncRevisions = await readSavedRevisions(client, athletes);
    await client.query('COMMIT');
    console.log('Dados salvos com sucesso!');
    await setCachedAthletes(athletes.map((a:any)=>({...a,syncRevision:syncRevisions[a.id]}))).catch(e=>console.warn('[Cache]',e.message));
    res.json({ message: 'Dados sincronizados com sucesso!', syncRevisions });
  } catch (error: any) {
    discardClient = true;
    console.error("[ScopedSave]",error.code || error.message);
    if (client && error.message !== 'Query read timeout') {
      try {
        await client.query('ROLLBACK');
      } catch (rollError: any) {
        console.error('Erro ao executar ROLLBACK:', rollError.message);
      }
    }
    if (error instanceof SyncConflict) return res.status(409).json({error:error.message,code:'SYNC_CONFLICT'});
    if ((req as any).account) return res.status(error instanceof ScopeDenied ? 403 : error instanceof SportsValidationError ? 400 : 503).json({error:error instanceof SportsValidationError?error.message:'Não foi possível salvar os dados autorizados.'});
    return res.status(503).json({error:'Não foi possível confirmar o salvamento.'});
  } finally {
    client.release(discardClient);
  }
};
apiRouter.post('/salvar',authMiddleware,saveAthletesHandler);

// Deletions have no unscoped fallback.
apiRouter.use(sportsDeletionRouter(pool,authMiddleware));

const aiScopeGuard = async (req:any,res:any,next:any) => {
  if(!req.account)return next();
  if(req.account.role!=='coach')return res.status(403).json({error:'Ação restrita ao treinador.'});
  if(req.path==='/ai-search-exercises')return next();
  const id=req.body?.athleteId || req.body?.athleteContext?.id || req.body?.athlete?.id;
  try{
    if(typeof id!=='string' || !await mayAccessAthlete(pool,req.account,id))return res.status(403).json({error:'Selecione um atleta autorizado para usar IA.'});
    next();
  }catch{return res.status(503).json({error:'Não foi possível validar o atleta.'});}
};

// AI endpoints under apiRouter
apiRouter.post('/generate-workouts', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
  const { prompt } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Workouts] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    const response = await generateContentWithRetry({ 
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        systemInstruction: gymPrinciples+" Você é o IA Co-Pilot de Periodização Esportiva de Alto Rendimento da LB Sports. Sua tarefa é criar um programa de periodização estritamente alinhado com o cronograma de datas e as diretrizes do treinador fornecidas. REGRAS CRÍTICAS: 1) O campo 'date' de cada sessão DEVE ser EXATAMENTE uma das datas (YYYY-MM-DD) listadas no cronograma fornecido. NUNCA gere datas antigas, do passado ou fora do cronograma. 2) Incorpore integralmente e com prioridade máxima a DESCRIÇÃO DO TREINADOR na escolha dos exercícios, métodos e nomes das sessões. 3) Responda com linguagem profissional de Head Coach de performance esportiva, sem menção a IA ou algoritmos.",
        responseMimeType: "application/json",
        maxOutputTokens: 32768,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "A data correspondente do cronograma fornecido (formato YYYY-MM-DD)" },
              name: { type: Type.STRING, description: "Nome técnico estruturado do treino" },
              objective: {type:Type.STRING},
              rationale: {type:Type.STRING},
              estimatedDurationMinutes: {type:Type.NUMBER},
              phase: { type: Type.STRING, description: "Fase de treinamento (Preparação Geral, Preparação Específica, ou Polimento / Tapering)" },
              exercises: {
                type: Type.ARRAY,
                minItems: 1,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    capacity: {type:Type.STRING},
                    method: {type:Type.STRING},
                    role: {type:Type.STRING,enum:["Dose principal","Complemento","Microdose","Preparação"]},
                    recoverySeconds: {type:Type.NUMBER},
                    notes: {type:Type.STRING},
                    name: { type: Type.STRING, description: "Nome do exercício" },
                    muscleGroup: { type: Type.STRING, description: "Grupo muscular ou valência física trabalhada" },
                    sets: { type: Type.INTEGER, description: "Número de séries" },
                    reps: { type: Type.STRING, description: "Repetições (Ex: '8-10', 'Até a falha', '20s')" },
                    weight: { type: Type.STRING, description: "Sugestão de Carga/Intensidade (Ex: '70% 1RM', 'Carga Moderada', 'Peso do corpo', '35kg')" }
                  },
                  required: ["name", "muscleGroup", "sets", "reps", "weight", "capacity", "method", "role", "recoverySeconds", "notes"]
                }
              }
            },
            required: ["date", "name", "phase", "exercises", "objective", "rationale", "estimatedDurationMinutes"]
          }
        }
      }
    });

    const resultText = response.text || "";
    const finishReason = response.candidates?.[0]?.finishReason;
    console.log('[AI Workouts] Resposta gerada', {finishReason, characters: resultText.length});
    res.json({ result: resultText, finishReason });
  } catch (error: any) {
    console.error("[AI Workouts] Erro chamando Gemini no backend:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar treinos por IA no servidor." });
  }
});

apiRouter.post('/generate-imtp-ai', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
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

apiRouter.post('/generate-postural-ai', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
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

apiRouter.post('/generate-ai-modeling', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
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

apiRouter.post('/analyze-performance', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
  const athleteId=req.body?.athleteId;
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Analysis] GEMINI_API_KEY not configured on the server.");
    return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor." });
  }

  try {
    const context=await loadPerformanceContext(pool,(req as any).account,athleteId);
    const prompt=performancePrompt(context);
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
            injuryRiskScore: { type: Type.NUMBER, nullable: true },
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

    const result = JSON.parse(response.text || "{}");
    // A language model cannot produce a validated individual injury probability.
    result.injuryRiskScore = null;
    res.json({ result: JSON.stringify(result) });
  } catch (error: any) {
    console.error("[AI Analysis] Erro chamando Gemini no backend para análise:", error);
    res.status(500).json({ error: error.message || "Falha ao gerar análise de performance por IA no servidor." });
  }
});

apiRouter.post('/ai-search-exercises', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
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

apiRouter.post('/ai-prescribe-workout', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
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

  const prompt = `${gymPrinciples}\nGere uma prescrição de treino técnico de altíssima performance para a LB Sports, baseada estritamente em evidências científicas biomecânicas de elite e na metodologia de Treinamento Baseado em Velocidade (VBT).

Fatores Atuais do Atleta:
- Perfil/Nível: ${athleteData || 'Atleta geral de rendimento'}
- Objetivo de Performance: ${objective || 'Desenvolvimento atlético integral'}
- Histórico de lesões/Restrições: ${restrictions || 'Nenhuma restrição relatada'}
- Tempo disponível para a sessão: ${timeAvailable || '60 minutos'}
- Equipamentos disponíveis na sessão: ${equipment || 'Estrutura completa de academia'}
- Fase de periodização recomendada: ${periodizationPhase || 'Preparação Geral'}

${libraryPromptPart}

Critérios Científicos Exigidos:
1. Ordem do treino: preserve a ordem indicada pelo treinador; sem ordem indicada, organize pela prioridade, técnica e fadiga da modalidade. Potência/pliometria não são obrigatórias nem sempre vêm primeiro.
2. VBT: use alvos numéricos apenas quando houver medição e referência válida para o exercício. Sem isso, use intenção de movimento e critérios técnicos. Não invente velocidade ou 1RM.
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

apiRouter.post('/ai-chat', authMiddleware, requireAIAccess, aiScopeGuard, async (req, res) => {
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

    await ensureAbalakovTable(client);

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
      'impulse_peak', 'impulse_100', 'impulse_200', 'impulse_300', 'force_100', 'force_200', 'force_300'
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
    await client.query('ALTER TABLE workouts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ');
    await client.query(`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS prescription_meta JSONB NOT NULL DEFAULT '{}'::jsonb;`);
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
    
    await client.query(externalSessionDetailsSQL);

    // Administrative accounts are provisioned explicitly; never reset passwords on startup.

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
  
  // Respeita estritamente o NODE_ENV para permitir o funcionamento correto do Vite em desenvolvimento
  const isProd = process.env.NODE_ENV === 'production';
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

  app.listen(port, host, () => {
    console.log(`[SERVIÇO] Servidor Iniciado`);
    console.log(`[SERVIÇO] Host: ${host} | Porta: ${port}`);
    console.log(`[SERVIÇO] Modo: ${isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  });
}

startServer();
