
-- 1. Replace public SELECT policies with authenticated-only
DROP POLICY IF EXISTS "Anyone can read health updates" ON public.tree_health_updates;
CREATE POLICY "Authenticated can read health updates"
  ON public.tree_health_updates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read challenges" ON public.challenges;
CREATE POLICY "Authenticated can read challenges"
  ON public.challenges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read participants" ON public.challenge_participants;
CREATE POLICY "Authenticated can read challenge participants"
  ON public.challenge_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read participants" ON public.drive_participants;
CREATE POLICY "Authenticated can read drive participants"
  ON public.drive_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read team members" ON public.team_members;
CREATE POLICY "Authenticated can read team members"
  ON public.team_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read teams" ON public.teams;
CREATE POLICY "Authenticated can read teams"
  ON public.teams FOR SELECT TO authenticated USING (true);

-- 2. Revoke anon SELECT on those tables (defense in depth)
REVOKE SELECT ON public.tree_health_updates FROM anon;
REVOKE SELECT ON public.challenges FROM anon;
REVOKE SELECT ON public.challenge_participants FROM anon;
REVOKE SELECT ON public.drive_participants FROM anon;
REVOKE SELECT ON public.team_members FROM anon;
REVOKE SELECT ON public.teams FROM anon;

-- 3. Revoke public/anon EXECUTE on the audit-log trigger function
REVOKE EXECUTE ON FUNCTION public.log_tree_admin_status_change() FROM PUBLIC, anon, authenticated;
