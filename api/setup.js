
import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        dob VARCHAR(255) NOT NULL,
        injury_history TEXT
      );
    `;

    // Dynamic column migrations for athletes table
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS gender VARCHAR(10);`;
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS modality VARCHAR(255);`;
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS competitive_level VARCHAR(255);`;
    try {
      await sql`ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_competitive_level_check;`;
    } catch (err) {}
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS position VARCHAR(255);`;
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS goal VARCHAR(255);`;
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER;`;
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_tournament_mode BOOLEAN;`;

    await sql`
      CREATE TABLE IF NOT EXISTS wellness (
        id TEXT PRIMARY KEY,
        athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
        date VARCHAR(255) NOT NULL,
        fatigue INTEGER,
        sleep INTEGER,
        stress INTEGER,
        soreness INTEGER,
        mood INTEGER,
        cognitive_load INTEGER,
        readiness_score INTEGER,
        travel_fatigue INTEGER,
        sleep_quality INTEGER
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS workouts (
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
        trainer_notes TEXT
      );
    `;

    // Dynamic workouts migrations
    await sql`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS trainer_notes TEXT;`;

    await sql`
      CREATE TABLE IF NOT EXISTS prescribed_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
        name VARCHAR(255),
        muscle_group VARCHAR(100),
        sets INTEGER,
        reps VARCHAR(50),
        weight VARCHAR(50),
        rest VARCHAR(50),
        notes TEXT,
        pain_level INTEGER
      );
    `;

    // Dynamic prescribed_exercises migrations
    await sql`ALTER TABLE prescribed_exercises ADD COLUMN IF NOT EXISTS pain_level INTEGER;`;

    await sql`
      CREATE TABLE IF NOT EXISTS performed_sets (
        id SERIAL PRIMARY KEY,
        exercise_id TEXT REFERENCES prescribed_exercises(id) ON DELETE CASCADE,
        reps INTEGER,
        weight REAL,
        rpe INTEGER
      );
    `;

    await sql`CREATE TABLE IF NOT EXISTS bioimpedance (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, weight REAL, fat_percentage REAL, muscle_mass REAL, visceral_fat REAL, hydration REAL, observations TEXT);`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS basal_metabolism REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS metabolic_age REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS bone_mass REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS physique_rating REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_arm_r REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_arm_l REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_leg_r REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_leg_l REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS fat_trunk REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_arm_r REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_arm_l REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_leg_r REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_leg_l REAL;`;
    await sql`ALTER TABLE bioimpedance ADD COLUMN IF NOT EXISTS muscle_trunk REAL;`;

    await sql`CREATE TABLE IF NOT EXISTS isometric_strength (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, half_squat_kgf REAL, quadriceps_r REAL, quadriceps_l REAL, hamstrings_r REAL, hamstrings_l REAL, rfd_peak REAL, observations TEXT);`;
    await sql`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS iq_ratio_r REAL;`;
    await sql`ALTER TABLE isometric_strength ADD COLUMN IF NOT EXISTS iq_ratio_l REAL;`;

    await sql`CREATE TABLE IF NOT EXISTS general_strength (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, exercise VARCHAR(255), "load" REAL, observations TEXT);`;
    
    await sql`CREATE TABLE IF NOT EXISTS cmj (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, height REAL, power REAL, depth REAL, rsi REAL, observations TEXT);`;
    await sql`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS flight_time REAL;`;
    await sql`ALTER TABLE cmj ADD COLUMN IF NOT EXISTS weight REAL;`;

    await sql`CREATE TABLE IF NOT EXISTS vo2max (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, vo2max REAL, max_heart_rate REAL, threshold_heart_rate REAL, max_ventilation REAL, threshold_ventilation REAL, max_load REAL, threshold_load REAL, vam REAL, rec10s REAL, rec30s REAL, rec60s REAL, score REAL, observations TEXT);`;
    await sql`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_speed REAL;`;
    await sql`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS threshold_speed REAL;`;
    await sql`ALTER TABLE vo2max ADD COLUMN IF NOT EXISTS max_ventilation REAL;`;

    await sql`CREATE TABLE IF NOT EXISTS external_sessions (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, "type" VARCHAR(100), duration_minutes INTEGER, rpe INTEGER, notes TEXT, "load" REAL);`;
    await sql`CREATE TABLE IF NOT EXISTS speed (id TEXT PRIMARY KEY, athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, date VARCHAR(255) NOT NULL, time_5m REAL, time_10m REAL, time_20m REAL, time_30m REAL, speed_5m REAL, speed_10m REAL, speed_20m REAL, speed_30m REAL, observations TEXT);`;
    
    return response.status(200).json({ message: "Esquema atualizado com sucesso!" });
  } catch (error) {
    return response.status(500).json({ error: `Erro ao criar tabelas: ${error.message}` });
  }
}
