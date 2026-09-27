
-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'college',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies
DROP POLICY IF EXISTS "Anyone can read teams" ON public.teams;
CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated can create teams" ON public.teams;
CREATE POLICY "Authenticated can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Creators can update teams" ON public.teams;
CREATE POLICY "Creators can update teams" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Team members policies
DROP POLICY IF EXISTS "Anyone can read team members" ON public.team_members;
CREATE POLICY "Anyone can read team members" ON public.team_members FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated can join teams" ON public.team_members;
CREATE POLICY "Authenticated can join teams" ON public.team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members can leave teams" ON public.team_members;
CREATE POLICY "Members can leave teams" ON public.team_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Growth update points trigger
CREATE OR REPLACE FUNCTION public.award_growth_points()
RETURNS TRIGGER AS $$
DECLARE
  pts INTEGER;
  tree_status TEXT;
BEGIN
  -- Check the tree is approved
  SELECT admin_status INTO tree_status FROM public.trees WHERE id = NEW.tree_id;
  IF tree_status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Determine points based on update_day
  IF NEW.update_day = 7 THEN pts := 5;
  ELSIF NEW.update_day = 30 THEN pts := 10;
  ELSIF NEW.update_day = 90 THEN pts := 20;
  ELSE pts := 0;
  END IF;

  IF pts > 0 THEN
    NEW.points_awarded := pts;
    UPDATE public.profiles
    SET green_points = green_points + pts, updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_growth_update_insert ON public.growth_updates;
CREATE TRIGGER on_growth_update_insert BEFORE INSERT ON public.growth_updates
  FOR EACH ROW EXECUTE FUNCTION public.award_growth_points();

-- Add team_id to profiles for quick lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Realtime for growth_updates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'growth_updates') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_updates;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'teams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
  END IF;
END $$;
