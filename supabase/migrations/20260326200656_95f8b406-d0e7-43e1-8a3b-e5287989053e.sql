DROP POLICY IF EXISTS "Anyone can read profiles for leaderboard" ON public.profiles;
CREATE POLICY "Anyone can read profiles for leaderboard" ON public.profiles FOR SELECT TO public USING (true);