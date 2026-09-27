
-- Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_trees INTEGER NOT NULL DEFAULT 5,
  duration_days INTEGER NOT NULL DEFAULT 30,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read challenges" ON public.challenges;
CREATE POLICY "Anyone can read challenges" ON public.challenges FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated can create challenges" ON public.challenges;
CREATE POLICY "Authenticated can create challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Creators can update challenges" ON public.challenges;
CREATE POLICY "Creators can update challenges" ON public.challenges FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Challenge participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trees_planted INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read participants" ON public.challenge_participants;
CREATE POLICY "Anyone can read participants" ON public.challenge_participants FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated can join challenges" ON public.challenge_participants;
CREATE POLICY "Authenticated can join challenges" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own participation" ON public.challenge_participants;
CREATE POLICY "Users can update own participation" ON public.challenge_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave challenges" ON public.challenge_participants;
CREATE POLICY "Users can leave challenges" ON public.challenge_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);
