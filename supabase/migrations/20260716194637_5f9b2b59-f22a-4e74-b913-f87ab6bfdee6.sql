-- 1) Account type on profiles for signup selector
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('individual', 'ngo', 'school_college');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date;

-- 2) Update handle_new_user to honor account_type + organization_name from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _acct public.account_type;
BEGIN
  BEGIN
    _acct := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'individual');
  EXCEPTION WHEN others THEN
    _acct := 'individual';
  END;

  INSERT INTO public.profiles (id, full_name, account_type, organization_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _acct,
    NULLIF(NEW.raw_user_meta_data->>'organization_name', '')
  );

  IF lower(NEW.email) = 'sunilgondalwad923@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Notifications table (delegates get notified, streak alerts, rejection notices)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

-- 4) Trigger: notify delegate when a tree_delegation is created
CREATE OR REPLACE FUNCTION public.notify_delegate_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tree_name text;
BEGIN
  IF NEW.delegate_user_id IS NOT NULL THEN
    SELECT tree_name INTO _tree_name FROM public.trees WHERE id = NEW.tree_id;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.delegate_user_id,
      'delegation_assigned',
      'You''ve been delegated a tree',
      COALESCE(_tree_name, 'A tree') || ' has been delegated to your care.',
      jsonb_build_object('tree_id', NEW.tree_id, 'delegation_id', NEW.id,
                         'start_date', NEW.start_date, 'end_date', NEW.end_date)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_delegate_on_assignment ON public.tree_delegations;
CREATE TRIGGER trg_notify_delegate_on_assignment
AFTER INSERT ON public.tree_delegations
FOR EACH ROW EXECUTE FUNCTION public.notify_delegate_on_assignment();

-- 5) Streak update on growth_updates insert
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _last date;
  _cur int;
  _longest int;
  _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
    INTO _last, _cur, _longest
  FROM public.profiles WHERE id = NEW.user_id;

  IF _last IS NULL OR _last < _today - INTERVAL '1 day' THEN
    _cur := 1;
  ELSIF _last = _today - INTERVAL '1 day' THEN
    _cur := COALESCE(_cur, 0) + 1;
  END IF;
  -- same day: no change

  _longest := GREATEST(COALESCE(_longest, 0), _cur);

  UPDATE public.profiles
     SET current_streak = _cur,
         longest_streak = _longest,
         last_activity_date = _today,
         updated_at = now()
   WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_streak ON public.growth_updates;
CREATE TRIGGER trg_update_user_streak
AFTER INSERT ON public.growth_updates
FOR EACH ROW EXECUTE FUNCTION public.update_user_streak();

-- 6) Notify user when their tree is rejected
CREATE OR REPLACE FUNCTION public.notify_on_tree_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_status = 'rejected' AND OLD.admin_status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'tree_rejected',
      'Your tree submission was rejected',
      COALESCE(NEW.rejection_reason, 'A reviewer rejected your submission.'),
      jsonb_build_object('tree_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_tree_rejection ON public.trees;
CREATE TRIGGER trg_notify_on_tree_rejection
AFTER UPDATE OF admin_status ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.notify_on_tree_rejection();
