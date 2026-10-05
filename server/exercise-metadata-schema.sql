ALTER TABLE public.prescribed_exercises ADD COLUMN IF NOT EXISTS prescription_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
