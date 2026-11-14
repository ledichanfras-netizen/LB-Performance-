BEGIN;
ALTER TABLE lb_billing.subscriptions ADD COLUMN IF NOT EXISTS athlete_id text REFERENCES public.athletes(id);
ALTER TABLE lb_billing.subscriptions ALTER COLUMN user_id DROP NOT NULL;
-- Link existing financial histories by registered identity, never by name.
UPDATE lb_billing.subscriptions s SET athlete_id=u.athlete_id
FROM public.users u
WHERE s.user_id=u.id AND u.role='athlete' AND u.athlete_id IS NOT NULL
AND EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=u.athlete_id)
AND s.athlete_id IS NULL
AND (SELECT count(*) FROM lb_billing.subscriptions x JOIN public.users xu ON xu.id=x.user_id WHERE xu.role='athlete' AND xu.athlete_id=u.athlete_id)=1
AND NOT EXISTS(SELECT 1 FROM lb_billing.subscriptions x WHERE x.athlete_id=u.athlete_id);
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscription_athlete ON lb_billing.subscriptions(athlete_id) WHERE athlete_id IS NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='lb_billing.subscriptions'::regclass AND conname='subscriptions_athlete_id_fkey') THEN
  ALTER TABLE lb_billing.subscriptions ADD CONSTRAINT subscriptions_athlete_id_fkey FOREIGN KEY(athlete_id) REFERENCES public.athletes(id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='lb_billing.subscriptions'::regclass AND conname='billing_subscription_subject') THEN
  ALTER TABLE lb_billing.subscriptions ADD CONSTRAINT billing_subscription_subject CHECK(user_id IS NOT NULL OR athlete_id IS NOT NULL);
 END IF;
END $$;
COMMIT;
