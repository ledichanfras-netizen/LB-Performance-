-- Supabase Schema for LB Sports Athlete Performance Tracking

-- Athletes Table
CREATE TABLE IF NOT EXISTS athletes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F')),
    modality TEXT,
    competitive_level TEXT,
    position TEXT,
    goal TEXT,
    weekly_frequency INTEGER,
    injury_history TEXT,
    is_tournament_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wellness Table
CREATE TABLE IF NOT EXISTS wellness (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    fatigue INTEGER NOT NULL,
    sleep INTEGER NOT NULL,
    stress INTEGER NOT NULL,
    soreness INTEGER NOT NULL,
    mood INTEGER NOT NULL,
    cognitive_load INTEGER NOT NULL,
    readiness_score NUMERIC,
    travel_fatigue INTEGER,
    sleep_quality INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External Sessions Table
CREATE TABLE IF NOT EXISTS external_sessions (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    rpe INTEGER NOT NULL,
    notes TEXT,
    load NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts Table
CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    phase TEXT,
    status TEXT CHECK (status IN ('planned', 'completed', 'in_progress')),
    rpe INTEGER,
    total_load NUMERIC,
    duration_minutes INTEGER,
    monotony NUMERIC,
    strain NUMERIC,
    feedback TEXT,
    trainer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescribed Exercises Table
CREATE TABLE IF NOT EXISTS prescribed_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    muscle_group TEXT,
    sets INTEGER,
    reps TEXT,
    weight TEXT,
    rest TEXT,
    notes TEXT,
    pain_level INTEGER,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performed Sets Table
CREATE TABLE IF NOT EXISTS performed_sets (
    id TEXT PRIMARY KEY,
    exercise_id TEXT REFERENCES prescribed_exercises(id) ON DELETE CASCADE,
    reps INTEGER NOT NULL,
    weight NUMERIC NOT NULL,
    rpe INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bioimpedance Table
CREATE TABLE IF NOT EXISTS bioimpedance (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC,
    fat_percentage NUMERIC,
    muscle_mass NUMERIC,
    visceral_fat NUMERIC,
    hydration NUMERIC,
    basal_metabolism NUMERIC,
    metabolic_age NUMERIC,
    bone_mass NUMERIC,
    physique_rating NUMERIC,
    fat_arm_r NUMERIC,
    fat_arm_l NUMERIC,
    fat_leg_r NUMERIC,
    fat_leg_l NUMERIC,
    fat_trunk NUMERIC,
    muscle_arm_r NUMERIC,
    muscle_arm_l NUMERIC,
    muscle_leg_r NUMERIC,
    muscle_leg_l NUMERIC,
    muscle_trunk NUMERIC,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Isometric Strength Table
CREATE TABLE IF NOT EXISTS isometric_strength (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    half_squat_kgf NUMERIC,
    quadriceps_r NUMERIC,
    quadriceps_l NUMERIC,
    hamstrings_r NUMERIC,
    hamstrings_l NUMERIC,
    iq_ratio_r NUMERIC,
    iq_ratio_l NUMERIC,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMJ Table
CREATE TABLE IF NOT EXISTS cmj (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    height NUMERIC,
    power NUMERIC,
    depth NUMERIC,
    rsi NUMERIC,
    flight_time NUMERIC,
    weight NUMERIC,
    average_force NUMERIC DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop Jump Table
CREATE TABLE IF NOT EXISTS drop_jump (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC DEFAULT 0,
    drop_height NUMERIC DEFAULT 30,
    jump_height NUMERIC DEFAULT 0,
    flight_time NUMERIC DEFAULT 0,
    contact_time NUMERIC DEFAULT 0,
    mean_force NUMERIC DEFAULT 0,
    mean_power NUMERIC DEFAULT 0,
    stiffness NUMERIC DEFAULT 0,
    rsi NUMERIC DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VO2max Table
CREATE TABLE IF NOT EXISTS vo2max (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    vo2max NUMERIC,
    max_heart_rate INTEGER,
    threshold_heart_rate INTEGER,
    max_speed NUMERIC,
    threshold_speed NUMERIC,
    vam NUMERIC,
    rec_10s INTEGER,
    rec_30s INTEGER,
    rec_60s INTEGER,
    max_ventilation NUMERIC,
    score NUMERIC,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speed Table
CREATE TABLE IF NOT EXISTS speed (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_5m NUMERIC,
    time_10m NUMERIC,
    time_20m NUMERIC,
    time_30m NUMERIC,
    speed_5m NUMERIC,
    speed_10m NUMERIC,
    speed_20m NUMERIC,
    speed_30m NUMERIC,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- General Strength Table
CREATE TABLE IF NOT EXISTS general_strength (
    id TEXT PRIMARY KEY,
    athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    exercise TEXT NOT NULL,
    load NUMERIC NOT NULL,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table (for authentication via Express API)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    athlete_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default coach user
INSERT INTO users (id, username, password, role) 
VALUES ('coach-1', 'Leandro', 'techno10', 'coach') 
ON CONFLICT (username) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE performed_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bioimpedance ENABLE ROW LEVEL SECURITY;
ALTER TABLE isometric_strength ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmj ENABLE ROW LEVEL SECURITY;
ALTER TABLE vo2max ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_strength ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create Policies (Simplified for now, allowing anon access since app uses anon key)
-- In a production environment with Supabase Auth, these would be restricted to authenticated users.
CREATE POLICY "Allow anon read access" ON athletes FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON athletes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON athletes FOR UPDATE USING (true);

-- Repeat for other tables to ensure the app continues to work while RLS is enabled
CREATE POLICY "Allow anon read access" ON wellness FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON wellness FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON wellness FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON external_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON external_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON external_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON workouts FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON workouts FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON prescribed_exercises FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON prescribed_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON prescribed_exercises FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON performed_sets FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON performed_sets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON performed_sets FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON bioimpedance FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON bioimpedance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON bioimpedance FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON isometric_strength FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON isometric_strength FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON isometric_strength FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON cmj FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON cmj FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON cmj FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON vo2max FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON vo2max FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON vo2max FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON speed FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON speed FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON speed FOR UPDATE USING (true);

CREATE POLICY "Allow anon read access" ON general_strength FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON general_strength FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON general_strength FOR UPDATE USING (true);

-- Users table should be more restricted even for anon
CREATE POLICY "Allow anon read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON users FOR UPDATE USING (true);

-- Migration to add average_force to cmj if not exists
ALTER TABLE cmj ADD COLUMN IF NOT EXISTS average_force NUMERIC DEFAULT 0;

-- Performance Indexes for Foreign Keys and Date Sorting
CREATE INDEX IF NOT EXISTS idx_wellness_athlete_date ON wellness (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_external_sessions_athlete_date ON external_sessions (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_athlete_date ON workouts (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_workout ON prescribed_exercises (workout_id);
CREATE INDEX IF NOT EXISTS idx_performed_sets_exercise ON performed_sets (exercise_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_athlete ON users (athlete_id);

