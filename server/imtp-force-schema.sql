-- Nullable measurements: no defaults and no fabrication of historical values.
ALTER TABLE public.imtp ADD COLUMN IF NOT EXISTS force_100 REAL;
ALTER TABLE public.imtp ADD COLUMN IF NOT EXISTS force_200 REAL;
ALTER TABLE public.imtp ADD COLUMN IF NOT EXISTS force_300 REAL;
