
-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'government');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: anyone can read roles (for UI), only admins can manage
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add multi-photo and admin approval columns to trees
ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS exif_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_hash TEXT;

-- 3. Drop old trigger that auto-awards points on tree insert
DROP TRIGGER IF EXISTS on_tree_planted ON public.trees;
DROP FUNCTION IF EXISTS public.update_profile_on_tree();

-- 4. Create function to award points on admin approval only
CREATE OR REPLACE FUNCTION public.award_points_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when admin_status changes to 'approved'
  IF NEW.admin_status = 'approved' AND (OLD.admin_status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles
    SET trees_planted = trees_planted + 1,
        green_points = green_points + 10,
        updated_at = now()
    WHERE id = NEW.user_id;
    
    -- Set points on the tree record
    NEW.points_awarded := 10;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tree_approved
  BEFORE UPDATE ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_approval();

-- 5. Add growth_updates table for 7/30/90 day tracking
CREATE TABLE public.growth_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  update_day INTEGER NOT NULL,
  photo_url TEXT,
  ai_health_status TEXT DEFAULT 'pending',
  notes TEXT,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read growth updates" ON public.growth_updates
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert growth updates" ON public.growth_updates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for trees so admin sees live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.trees;
