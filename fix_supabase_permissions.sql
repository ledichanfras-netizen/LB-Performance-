-- Native JWT: execute server access hardening, never open anonymous athlete access.
-- Native JWT authorization is enforced by the Express server using PostgreSQL.
-- These tables must not be directly accessible with Supabase client roles.
BEGIN;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.athletes FROM PUBLIC, anon, authenticated;
ALTER TABLE public.bioimpedance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bioimpedance FROM PUBLIC, anon, authenticated;
ALTER TABLE public.cmj ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cmj FROM PUBLIC, anon, authenticated;
ALTER TABLE public.drop_jump ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.drop_jump FROM PUBLIC, anon, authenticated;
ALTER TABLE public.external_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.external_sessions FROM PUBLIC, anon, authenticated;
ALTER TABLE public.general_strength ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.general_strength FROM PUBLIC, anon, authenticated;
ALTER TABLE public.imtp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.imtp FROM PUBLIC, anon, authenticated;
ALTER TABLE public.isometric_strength ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.isometric_strength FROM PUBLIC, anon, authenticated;
ALTER TABLE public.performed_sets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.performed_sets FROM PUBLIC, anon, authenticated;
ALTER TABLE public.prescribed_exercises ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.prescribed_exercises FROM PUBLIC, anon, authenticated;
ALTER TABLE public.speed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.speed FROM PUBLIC, anon, authenticated;
ALTER TABLE public.vo2max ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vo2max FROM PUBLIC, anon, authenticated;
ALTER TABLE public.wellness ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.wellness FROM PUBLIC, anon, authenticated;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.workouts FROM PUBLIC, anon, authenticated;
COMMIT;
