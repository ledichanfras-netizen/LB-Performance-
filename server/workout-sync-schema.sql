-- Nullable archive marker keeps replaced prescriptions and execution records recoverable.
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
