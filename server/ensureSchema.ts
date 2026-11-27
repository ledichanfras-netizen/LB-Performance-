import { ensureAbalakovTable } from './abalakov';
import { externalSessionDetailsSQL } from './externalSessionDetails';

type Queryable = {
  query: (sql: string, params?: any[]) => Promise<any>;
  connect?: () => Promise<{ query: (sql: string, params?: any[]) => Promise<any>; release: (discard?: boolean) => void }>;
};

async function runStatement(client: { query: (sql: string, params?: any[]) => Promise<any> }, sql: string) {
  try {
    await client.query(sql);
  } catch (err: any) {
    console.warn('[Schema]', err?.code || '', err?.message || err);
  }
}

async function loadExistingSchema(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  const columnsByTable = new Map<string, Map<string, string>>();
  const checkConstraints = new Set<string>();
  let hasAbalakov = false;

  try {
    const res = await client.query(
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'"
    );
    for (const row of res.rows || []) {
      const table = String(row.table_name);
      if (table === 'abalakov') hasAbalakov = true;
      let cols = columnsByTable.get(table);
      if (!cols) {
        cols = new Map<string, string>();
        columnsByTable.set(table, cols);
      }
      cols.set(String(row.column_name), String(row.data_type || '').toLowerCase());
    }
  } catch {
    return null;
  }

  try {
    const constraintsRes = await client.query(
      `SELECT t.relname AS table_name, c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND c.contype = 'c'`
    );
    for (const row of constraintsRes.rows || []) {
      checkConstraints.add(`${row.table_name}:${row.constraint_name}:${String(row.def || '').toLowerCase()}`);
    }
  } catch {
    // Ignore constraint inspection failure; DDL checks below remain safe.
  }

  return { columnsByTable, checkConstraints, hasAbalakov };
}

export async function ensureSportsSchema(poolOrClient: Queryable): Promise<void> {
  const leased = typeof poolOrClient.connect === 'function' ? await poolOrClient.connect() : null;
  const client = leased ?? poolOrClient;
  try {
    const existing = await loadExistingSchema(client);
    const hasCol = (table: string, col: string) => Boolean(existing?.columnsByTable.get(table)?.has(col));
    const colType = (table: string, col: string) => existing?.columnsByTable.get(table)?.get(col);
    const ensureCol = async (table: string, col: string, ddl: string) => {
      if (hasCol(table, col)) return;
      await runStatement(client, ddl);
    };

    const bioCols = [
      'basal_metabolism', 'metabolic_age', 'bone_mass', 'physique_rating',
      'fat_arm_r', 'fat_arm_l', 'fat_leg_r', 'fat_leg_l', 'fat_trunk',
      'muscle_arm_r', 'muscle_arm_l', 'muscle_leg_r', 'muscle_leg_l', 'muscle_trunk'
    ];
    for (const col of bioCols) {
      await ensureCol('bioimpedance', col, `ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS ${col} REAL`);
    }

    await ensureCol('vo2max', 'max_ventilation', 'ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_ventilation REAL');

    await ensureCol('prescribed_exercises', 'rest', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS rest VARCHAR(50)');
    await ensureCol('prescribed_exercises', 'notes', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS notes TEXT');
    await ensureCol('prescribed_exercises', 'pain_level', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS pain_level INTEGER');
    await ensureCol('prescribed_exercises', 'reps_type', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS reps_type VARCHAR(50)');
    await ensureCol('prescribed_exercises', 'order_index', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0');
    await ensureCol('prescribed_exercises', 'video_url', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS video_url TEXT');
    await ensureCol('prescribed_exercises', 'image_url', 'ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS image_url TEXT');
    await ensureCol('prescribed_exercises', 'prescription_meta', "ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS prescription_meta JSONB NOT NULL DEFAULT '{}'::jsonb");

    for (const col of ['reps', 'weight', 'rest', 'muscle_group']) {
      if (colType('prescribed_exercises', col) !== 'text') {
        await runStatement(client, `ALTER TABLE prescribed_exercises ALTER COLUMN ${col} TYPE TEXT`);
      }
    }

    await ensureCol('performed_sets', 'is_completed', 'ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE');

    await ensureCol('users', 'plan', "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'");

    if (colType('wellness', 'sleep') && colType('wellness', 'sleep') !== 'real') {
      await runStatement(client, 'ALTER TABLE wellness ALTER COLUMN sleep TYPE REAL USING sleep::real');
    }
    await ensureCol('wellness', 'readiness_score', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS readiness_score INTEGER');
    await ensureCol('wellness', 'travel_fatigue', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS travel_fatigue INTEGER');
    await ensureCol('wellness', 'sleep_quality', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_quality INTEGER');
    await ensureCol('wellness', 'menstrual_phase', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS menstrual_phase TEXT');
    await ensureCol('wellness', 'menstrual_symptoms', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS menstrual_symptoms JSONB');
    await ensureCol('wellness', 'hrv', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS hrv REAL');
    await ensureCol('wellness', 'sleep_hours_formatted', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_hours_formatted TEXT');
    await ensureCol('wellness', 'sleep_start_time', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_start_time TEXT');
    await ensureCol('wellness', 'wake_up_time', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS wake_up_time TEXT');
    await ensureCol('wellness', 'calculated_sleep_hours', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS calculated_sleep_hours REAL');
    await ensureCol('wellness', 'is_match_day', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS is_match_day BOOLEAN');
    await ensureCol('wellness', 'emotional_readiness', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS emotional_readiness INTEGER');
    await ensureCol('wellness', 'psychological_readiness', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS psychological_readiness INTEGER');
    await ensureCol('wellness', 'psychology_notes', 'ALTER TABLE wellness ADD COLUMN IF NOT EXISTS psychology_notes TEXT');

    await ensureCol('athletes', 'reassessment_plan', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS reassessment_plan JSONB');
    if (existing && [...existing.checkConstraints].some(c => c.startsWith('athletes:athletes_competitive_level_check:'))) {
      await runStatement(client, 'ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_competitive_level_check');
    }
    await ensureCol('athletes', 'photo_url', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS photo_url TEXT');
    await ensureCol('athletes', 'is_tournament_mode', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_tournament_mode BOOLEAN DEFAULT FALSE');
    await ensureCol('athletes', 'periodization_start', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS periodization_start TEXT');
    await ensureCol('athletes', 'periodization_end', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS periodization_end TEXT');
    await ensureCol('athletes', 'training_days', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS training_days JSONB');
    await ensureCol('athletes', 'injuries', 'ALTER TABLE athletes ADD COLUMN IF NOT EXISTS injuries JSONB');

    await ensureCol('workouts', 'created_at', 'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await ensureCol('workouts', 'updated_at', 'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await ensureCol('workouts', 'trainer_notes', 'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS trainer_notes TEXT');
    await ensureCol('workouts', 'missed_reason', 'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS missed_reason TEXT');
    await ensureCol('workouts', 'archived_at', 'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ');
    for (const col of ['name', 'phase', 'status']) {
      if (colType('workouts', col) !== 'text') {
        await runStatement(client, `ALTER TABLE workouts ALTER COLUMN ${col} TYPE TEXT`);
      }
    }
    if (!existing || [...existing.checkConstraints].some(c => c.startsWith('workouts:') && c.includes('status'))) {
      await runStatement(client, 'ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_status_check');
      await runStatement(
        client,
        `DO $$ DECLARE r RECORD; BEGIN
          FOR r IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'public'
              AND t.relname = 'workouts'
              AND c.contype = 'c'
              AND pg_get_constraintdef(c.oid) ILIKE '%status%'
          LOOP
            EXECUTE format('ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS %I', r.conname);
          END LOOP;
        END $$;`
      );
    }

    const imtpCols = [
      'weight', 'peak_force', 'relative_peak_force', 'time_to_peak_force', 'mean_force',
      'rfd_peak', 'rfd_100', 'rfd_200', 'rfd_300',
      'impulse_peak', 'impulse_100', 'impulse_200', 'impulse_300',
      'force_100', 'force_200', 'force_300'
    ];
    for (const col of imtpCols) {
      await ensureCol('imtp', col, `ALTER TABLE imtp ADD COLUMN IF NOT EXISTS ${col} REAL`);
    }
    await ensureCol('imtp', 'ai_details', 'ALTER TABLE imtp ADD COLUMN IF NOT EXISTS ai_details TEXT');
    await ensureCol('imtp', 'observations', 'ALTER TABLE imtp ADD COLUMN IF NOT EXISTS observations TEXT');
    await ensureCol('imtp', 'created_at', 'ALTER TABLE imtp ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    if (
      !hasCol('external_sessions', 'activity') ||
      !hasCol('external_sessions', 'session_time') ||
      !hasCol('external_sessions', 'distance_km') ||
      !hasCol('external_sessions', 'competition_id')
    ) {
      for (const stmt of externalSessionDetailsSQL.split(';').map(s => s.trim()).filter(Boolean)) {
        await runStatement(client, stmt);
      }
    }

    if (!existing?.hasAbalakov) {
      try {
        await ensureAbalakovTable(client);
      } catch (err: any) {
        if (err?.code === '42601') {
          await runStatement(
            client,
            `CREATE TABLE IF NOT EXISTS public.abalakov (
              id TEXT PRIMARY KEY,
              athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
              date VARCHAR(255) NOT NULL,
              height REAL, power REAL, depth REAL, rsi REAL, flight_time REAL,
              weight REAL, average_force REAL, observations TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
          );
          await runStatement(client, 'CREATE INDEX IF NOT EXISTS idx_abalakov_athlete_date ON public.abalakov(athlete_id,date DESC)');
        } else {
          console.warn('[Schema] abalakov:', err?.code || '', err?.message || err);
        }
      }
    }
  } finally {
    leased?.release();
  }
}

let schemaReadyPromise: Promise<void> | null = null;

export function ensureSportsSchemaOnce(pool: Queryable): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureSportsSchema(pool).catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

export function resetSportsSchemaCache(): void {
  schemaReadyPromise = null;
}
