
-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'college',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members
CREATE TABLE public.team_members (
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
CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update teams" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Anyone can read team members" ON public.team_members FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can join teams" ON public.team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
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

CREATE TRIGGER on_growth_update_insert
  BEFORE INSERT ON public.growth_updates
  FOR EACH ROW EXECUTE FUNCTION public.award_growth_points();

-- Add team_id to profiles for quick lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Realtime for growth_updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
