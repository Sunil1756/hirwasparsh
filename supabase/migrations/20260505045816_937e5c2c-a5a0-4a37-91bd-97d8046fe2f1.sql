
-- 1. Restrict challenge_participants UPDATE: prevent trees_planted tampering
DROP POLICY IF EXISTS "Users can update own participation" ON public.challenge_participants;

CREATE OR REPLACE FUNCTION public.guard_challenge_participants_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trees_planted IS DISTINCT FROM OLD.trees_planted
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.challenge_id IS DISTINCT FROM OLD.challenge_id THEN
    RAISE EXCEPTION 'Cannot modify trees_planted, user_id, or challenge_id directly';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_challenge_participants_update_trg ON public.challenge_participants;
CREATE TRIGGER guard_challenge_participants_update_trg
BEFORE UPDATE ON public.challenge_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_challenge_participants_update();

-- (No user-facing UPDATE policy: only triggers/admins via service role can change trees_planted)

-- 2. plantation_drives: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read drives" ON public.plantation_drives;
CREATE POLICY "Authenticated users can read drives"
ON public.plantation_drives FOR SELECT TO authenticated USING (true);

-- 3. Remove trees and growth_updates from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.trees;
ALTER PUBLICATION supabase_realtime DROP TABLE public.growth_updates;

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon and authenticated
-- Trigger functions don't need direct execute privilege
REVOKE EXECUTE ON FUNCTION public.award_growth_points() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.guard_tree_privileged_columns() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.award_points_on_approval() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.guard_challenge_participants_update() FROM anon, authenticated, public;
-- has_role is intentionally callable by authenticated (used in RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
