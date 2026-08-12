
-- SQL Migration Script for Supabase
-- Run this in the Supabase SQL Editor

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  athlete_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Athletes Table
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
  is_tournament_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Isometric Strength Table
CREATE TABLE IF NOT EXISTS isometric_strength (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CMJ Table
CREATE TABLE IF NOT EXISTS cmj (
  id TEXT PRIMARY KEY, 
  athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
  date VARCHAR(255) NOT NULL, 
  height REAL, 
  power REAL, 
  depth REAL, 
  rsi REAL, 
  flight_time REAL, 
  weight REAL,
  average_force REAL DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop Jump Table
CREATE TABLE IF NOT EXISTS drop_jump (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VO2max Table
CREATE TABLE IF NOT EXISTS vo2max (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bioimpedance Table
CREATE TABLE IF NOT EXISTS bioimpedance (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Speed Table
CREATE TABLE IF NOT EXISTS speed (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. General Strength Table
CREATE TABLE IF NOT EXISTS general_strength (
  id TEXT PRIMARY KEY, 
  athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE, 
  date VARCHAR(255) NOT NULL, 
  exercise TEXT, 
  load REAL, 
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Wellness Table
CREATE TABLE IF NOT EXISTS wellness (
  id TEXT PRIMARY KEY,
  athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
  date VARCHAR(255) NOT NULL,
  fatigue INTEGER,
  sleep INTEGER,
  sleep_quality INTEGER,
  stress INTEGER,
  soreness INTEGER,
  mood INTEGER,
  cognitive_load INTEGER,
  travel_fatigue INTEGER,
  readiness_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Workouts Table
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
  trainer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Prescribed Exercises Table
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
  pain_level INTEGER,
  order_index INTEGER DEFAULT 0
);

-- 12. Performed Sets Table
CREATE TABLE IF NOT EXISTS performed_sets (
  id TEXT PRIMARY KEY,
  exercise_id TEXT REFERENCES prescribed_exercises(id) ON DELETE CASCADE,
  reps INTEGER,
  weight REAL,
  rpe INTEGER
);

-- 13. External Sessions Table
CREATE TABLE IF NOT EXISTS external_sessions (
  id TEXT PRIMARY KEY,
  athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
  date VARCHAR(255) NOT NULL,
  type TEXT,
  duration_minutes INTEGER,
  rpe INTEGER,
  notes TEXT,
  load REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default Coach User
INSERT INTO users (id, username, password, role) 
VALUES ('coach-1', 'Leandro', '1234', 'coach') 
ON CONFLICT (username) DO NOTHING;

-- Migration to add average_force to cmj if not exists
ALTER TABLE cmj ADD COLUMN IF NOT EXISTS average_force REAL DEFAULT 0;
