
-- Create trees table
CREATE TABLE public.trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  tree_name TEXT NOT NULL,
  species TEXT NOT NULL,
  plantation_date DATE NOT NULL,
  height_cm NUMERIC NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  photo_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  ai_confidence NUMERIC,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

-- Anyone can read trees
CREATE POLICY "Anyone can view trees" ON public.trees FOR SELECT USING (true);

-- Authenticated users can insert their own trees
CREATE POLICY "Authenticated users can insert trees" ON public.trees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own trees
CREATE POLICY "Users can update own trees" ON public.trees FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow anonymous inserts (for users not logged in)
CREATE POLICY "Anonymous can insert trees" ON public.trees FOR INSERT TO anon WITH CHECK (user_id IS NULL);

--- END OF MIGRATION: 20260325053452_2489d722-38ae-48b5-a20f-f7dbb0e23235.sql ---


-- Drop the duplicate and recreate
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;
CREATE POLICY "Users can update own trees" ON public.trees FOR UPDATE TO authenticated USING (auth.uid() = user_id);

--- END OF MIGRATION: 20260325054827_458594f9-ab95-422d-a4d3-347fe931e51c.sql ---


-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  trees_planted INTEGER NOT NULL DEFAULT 0,
  green_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update profile stats when a tree is inserted
CREATE OR REPLACE FUNCTION public.update_profile_on_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET trees_planted = trees_planted + 1,
        green_points = green_points + 20,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tree_planted
  AFTER INSERT ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_on_tree();

--- END OF MIGRATION: 20260326194919_d7d4503f-0e10-41af-936a-441dd0588c91.sql ---

CREATE POLICY "Anyone can read profiles for leaderboard" ON public.profiles FOR SELECT TO public USING (true);

--- END OF MIGRATION: 20260326200656_95f8b406-d0e7-43e1-8a3b-e5287989053e.sql ---


-- Plantation Drives table
CREATE TABLE public.plantation_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  organizer_name text NOT NULL,
  location text NOT NULL,
  latitude double precision,
  longitude double precision,
  event_date date NOT NULL,
  target_trees integer NOT NULL DEFAULT 100,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plantation_drives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drives" ON public.plantation_drives FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create drives" ON public.plantation_drives FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update own drives" ON public.plantation_drives FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Drive participants
CREATE TABLE public.drive_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid NOT NULL REFERENCES public.plantation_drives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(drive_id, user_id)
);

ALTER TABLE public.drive_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read participants" ON public.drive_participants FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can join drives" ON public.drive_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave drives" ON public.drive_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add drive_id to trees table
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS drive_id uuid REFERENCES public.plantation_drives(id) ON DELETE SET NULL;

-- Tree health updates
CREATE TABLE public.tree_health_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_status text NOT NULL DEFAULT 'healthy',
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tree_health_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read health updates" ON public.tree_health_updates FOR SELECT TO public USING (true);
CREATE POLICY "Tree owners can add updates" ON public.tree_health_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add ai_detected_species to trees
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_detected_species text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_scientific_name text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_species_confidence numeric;

--- END OF MIGRATION: 20260328153504_935c10a9-e7be-42b3-b8bf-473607d21a5b.sql ---


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

--- END OF MIGRATION: 20260330191421_6e893301-7052-4195-ba1c-78c16d7f3cd0.sql ---


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

--- END OF MIGRATION: 20260401172725_7315e27f-113c-4d0a-894f-a2de2d22542c.sql ---


-- Challenges table
CREATE TABLE public.challenges (
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

CREATE POLICY "Anyone can read challenges" ON public.challenges FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can create challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update challenges" ON public.challenges FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Challenge participants table
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trees_planted INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read participants" ON public.challenge_participants FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can join challenges" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.challenge_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can leave challenges" ON public.challenge_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

--- END OF MIGRATION: 20260402133132_31a0baa1-4054-4d6f-aeda-af7e5a9ea57a.sql ---


-- 1) Remove anonymous insert on trees
DROP POLICY IF EXISTS "Anonymous can insert trees" ON public.trees;

-- 2) Replace overly-permissive trees UPDATE policy to prevent self-approval
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;

CREATE POLICY "Users can update own trees (non-privileged fields)"
ON public.trees
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Block changes to privileged columns by non-admins via a trigger
CREATE OR REPLACE FUNCTION public.guard_tree_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator') THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
     OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence
     OR NEW.ai_analysis IS DISTINCT FROM OLD.ai_analysis
     OR NEW.ai_detected_species IS DISTINCT FROM OLD.ai_detected_species
     OR NEW.ai_scientific_name IS DISTINCT FROM OLD.ai_scientific_name
     OR NEW.ai_species_confidence IS DISTINCT FROM OLD.ai_species_confidence THEN
    RAISE EXCEPTION 'Only admins or moderators can modify verification, approval, or AI fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_tree_privileged_columns_trigger ON public.trees;
CREATE TRIGGER guard_tree_privileged_columns_trigger
BEFORE UPDATE ON public.trees
FOR EACH ROW
EXECUTE FUNCTION public.guard_tree_privileged_columns();

-- Allow admins/moderators to update any tree
CREATE POLICY "Admins and moderators can update any tree"
ON public.trees
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 3) Create private selfies bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for selfies (private): users manage own folder; admins/mods can read all
CREATE POLICY "Users can upload own selfies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'selfies' AND ((storage.foldername(name))[1] = auth.uid()::text
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')));

CREATE POLICY "Users can update own selfies"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own selfies"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Lock down the public treebank bucket: scope writes to user's own folder
CREATE POLICY "Users can upload own treebank files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'treebank' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own treebank files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'treebank' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own treebank files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'treebank' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can read treebank files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'treebank');

--- END OF MIGRATION: 20260419115044_1a2c5ae1-b5b3-4ee8-9be3-4d0c2e421ecc.sql ---


-- 1. Tighten trees UPDATE policy: owners cannot touch privileged fields
DROP POLICY IF EXISTS "Users can update own trees (non-privileged fields)" ON public.trees;

CREATE POLICY "Users can update own trees (non-privileged fields)"
ON public.trees
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

-- The guard_tree_privileged_columns trigger already prevents non-admin field changes;
-- ensure it is attached
DROP TRIGGER IF EXISTS trees_guard_privileged_columns ON public.trees;
CREATE TRIGGER trees_guard_privileged_columns
BEFORE UPDATE ON public.trees
FOR EACH ROW
EXECUTE FUNCTION public.guard_tree_privileged_columns();

-- 2. Restrict public profile reads: require authentication for full row access,
-- keep leaderboard usable but no longer anonymous
DROP POLICY IF EXISTS "Anyone can read profiles for leaderboard" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. Restrict listing on public 'treebank' bucket — allow direct file fetch only
-- by removing broad SELECT and replacing with a no-list-friendly policy.
-- We keep object access via signed/public URLs working (those bypass listing policy
-- checks for public buckets), but block enumerating the bucket contents.
DO $$
BEGIN
  -- Drop common permissive policies that enable listing
  EXECUTE (
    SELECT string_agg(format('DROP POLICY IF EXISTS %I ON storage.objects;', polname), ' ')
    FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polcmd = 'r'
      AND pg_get_expr(polqual, polrelid) ILIKE '%treebank%'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Allow only owners (uploaders) to list their own folder; public files are still
-- accessible by direct URL via the storage CDN since the bucket is public.
CREATE POLICY "Owners can list own treebank files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'treebank'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

--- END OF MIGRATION: 20260419121212_17b9e3bc-15a7-4d71-bab4-7222dbbf21ff.sql ---

-- 1. Trees: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view trees" ON public.trees;
CREATE POLICY "Authenticated users can view trees"
ON public.trees
FOR SELECT
TO authenticated
USING (true);

-- 2. Growth updates: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can read growth updates" ON public.growth_updates;
CREATE POLICY "Authenticated users can read growth updates"
ON public.growth_updates
FOR SELECT
TO authenticated
USING (true);

-- 3. Growth updates: prevent farming on other users' trees
DROP POLICY IF EXISTS "Owners can insert growth updates" ON public.growth_updates;
CREATE POLICY "Owners can insert growth updates for their own trees"
ON public.growth_updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.trees t
    WHERE t.id = growth_updates.tree_id
      AND t.user_id = auth.uid()
  )
);

-- Prevent duplicate growth updates for the same tree/day/user
ALTER TABLE public.growth_updates
  DROP CONSTRAINT IF EXISTS unique_tree_day_user;
ALTER TABLE public.growth_updates
  ADD CONSTRAINT unique_tree_day_user UNIQUE (tree_id, update_day, user_id);

-- 4. User roles: restrictive policy to ensure only admins can insert/modify roles
CREATE POLICY "Only admins can modify roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

--- END OF MIGRATION: 20260505044933_0598f716-d322-4bde-9ba0-3f6dc2231171.sql ---


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

--- END OF MIGRATION: 20260505045816_937e5c2c-a5a0-4a37-91bd-97d8046fe2f1.sql ---


ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS qr_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS ai_validation_score numeric;

UPDATE public.trees SET qr_token = gen_random_uuid()::text WHERE qr_token IS NULL;

CREATE OR REPLACE FUNCTION public.set_tree_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tree_qr_token ON public.trees;
CREATE TRIGGER trg_set_tree_qr_token
BEFORE INSERT ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.set_tree_qr_token();

DROP TRIGGER IF EXISTS trg_award_points_on_approval ON public.trees;
CREATE TRIGGER trg_award_points_on_approval
BEFORE UPDATE ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_approval();

DROP TRIGGER IF EXISTS trg_guard_tree_privileged ON public.trees;
CREATE TRIGGER trg_guard_tree_privileged
BEFORE UPDATE ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.guard_tree_privileged_columns();

CREATE TABLE IF NOT EXISTS public.tree_adopters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'adopter' CHECK (role IN ('adopter','guardian')),
  current_photo_url text,
  selfie_photo_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tree_id, user_id)
);

ALTER TABLE public.tree_adopters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read adopters" ON public.tree_adopters;
CREATE POLICY "Anyone authenticated can read adopters"
ON public.tree_adopters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can adopt trees" ON public.tree_adopters;
CREATE POLICY "Users can adopt trees"
ON public.tree_adopters FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their adoption" ON public.tree_adopters;
CREATE POLICY "Users can remove their adoption"
ON public.tree_adopters FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.find_nearby_trees(
  _lat double precision,
  _lng double precision,
  _max_meters double precision DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  tree_name text,
  species text,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  qr_token text,
  photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT t.id, t.tree_name, t.species, t.user_id, t.latitude, t.longitude,
      (6371000 * 2 * asin(sqrt(
        power(sin(radians((t.latitude - _lat) / 2)), 2) +
        cos(radians(_lat)) * cos(radians(t.latitude)) *
        power(sin(radians((t.longitude - _lng) / 2)), 2)
      )))::double precision AS distance_meters,
      t.qr_token,
      t.photo_url
    FROM public.trees t
    WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      AND t.admin_status != 'rejected'
  ) sub
  WHERE distance_meters <= _max_meters
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearby_trees(double precision, double precision, double precision) TO authenticated;

--- END OF MIGRATION: 20260507124356_37908ed6-be32-49c1-ac09-feef269083b6.sql ---


CREATE OR REPLACE FUNCTION public.find_nearby_trees(
  _lat double precision,
  _lng double precision,
  _max_meters double precision DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  tree_name text,
  species text,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  qr_token text,
  photo_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT t.id, t.tree_name, t.species, t.user_id, t.latitude, t.longitude,
      (6371000 * 2 * asin(sqrt(
        power(sin(radians((t.latitude - _lat) / 2)), 2) +
        cos(radians(_lat)) * cos(radians(t.latitude)) *
        power(sin(radians((t.longitude - _lng) / 2)), 2)
      )))::double precision AS distance_meters,
      t.qr_token,
      t.photo_url
    FROM public.trees t
    WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      AND t.admin_status != 'rejected'
  ) sub
  WHERE distance_meters <= _max_meters
  ORDER BY distance_meters ASC;
$$;

--- END OF MIGRATION: 20260507124425_cd621d08-404c-490a-9297-690e9cc47e55.sql ---


REVOKE EXECUTE ON FUNCTION public.set_tree_qr_token() FROM PUBLIC, anon, authenticated;

--- END OF MIGRATION: 20260507124445_6c89bada-3d24-4598-af50-48d7061e3ddd.sql ---


-- Restrict column-level access to sensitive fields for authenticated users.

-- PROFILES: expose only leaderboard-safe columns
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, trees_planted, green_points, team_id, created_at, updated_at) ON public.profiles TO authenticated;

-- TREES: expose only non-sensitive columns to authenticated users.
-- Withheld: selfie_photo_url, device_fingerprint, photo_hash, qr_token, exif_timestamp, flagged_reason
REVOKE SELECT ON public.trees FROM authenticated;
GRANT SELECT (
  id, user_id, tree_name, species, height_cm, location, latitude, longitude,
  plantation_date, photo_url, before_photo_url, description, drive_id,
  created_at, updated_at, admin_status, verification_status,
  ai_detected_species, ai_scientific_name, ai_confidence, ai_species_confidence,
  ai_validation_score, ai_analysis, points_awarded
) ON public.trees TO authenticated;

-- TREE_ADOPTERS: withhold biometric selfie_photo_url
REVOKE SELECT ON public.tree_adopters FROM authenticated;
GRANT SELECT (id, tree_id, user_id, role, created_at, latitude, longitude, current_photo_url)
  ON public.tree_adopters TO authenticated;

-- Admin/moderator RPC to fetch full tree rows including sensitive columns
CREATE OR REPLACE FUNCTION public.admin_get_trees(_limit int DEFAULT 50, _status text DEFAULT NULL)
RETURNS SETOF public.trees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.trees
    WHERE _status IS NULL OR admin_status = _status
    ORDER BY created_at DESC
    LIMIT _limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_trees(int, text) TO authenticated;

-- Owner RPC to fetch own trees with qr_token (for growth-update QR verification)
CREATE OR REPLACE FUNCTION public.get_my_trees_with_token()
RETURNS TABLE(
  id uuid,
  tree_name text,
  species text,
  plantation_date date,
  admin_status text,
  qr_token text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, tree_name, species, plantation_date, admin_status, qr_token, latitude, longitude, created_at
  FROM public.trees
  WHERE user_id = auth.uid()
    AND admin_status = 'approved'
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_trees_with_token() TO authenticated;

--- END OF MIGRATION: 20260701095420_4e5f9f6e-c7ab-46d2-962d-4ac2a8ada485.sql ---


REVOKE EXECUTE ON FUNCTION public.admin_get_trees(int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_trees_with_token() FROM PUBLIC, anon;

--- END OF MIGRATION: 20260701095439_18c91fbf-55bd-400a-9f26-d883574df17c.sql ---


-- tree_adopters: owner + admin/mod only
DROP POLICY IF EXISTS "Anyone authenticated can read adopters" ON public.tree_adopters;
CREATE POLICY "Owners and admins can read adopters"
  ON public.tree_adopters
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- growth_updates: owner + admin/mod + viewers of approved trees
DROP POLICY IF EXISTS "Authenticated users can read growth updates" ON public.growth_updates;
CREATE POLICY "Owners admins and approved tree viewers can read growth updates"
  ON public.growth_updates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id = growth_updates.tree_id
        AND t.admin_status = 'approved'
    )
  );

-- Belt & braces: re-revoke sensitive columns from public roles at the column level.
REVOKE SELECT (selfie_photo_url, device_fingerprint, photo_hash, qr_token, exif_timestamp, flagged_reason)
  ON public.trees FROM anon, authenticated;

REVOKE SELECT (selfie_photo_url) ON public.tree_adopters FROM anon, authenticated;

--- END OF MIGRATION: 20260706105155_7c3dc6d7-725c-4947-8b19-717cc3246f31.sql ---


DROP POLICY IF EXISTS "Authenticated users can read treebank files" ON storage.objects;
CREATE POLICY "Authenticated users can read treebank files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'treebank');

--- END OF MIGRATION: 20260706105230_2b63d25f-6ba5-42a9-beae-aafb24980786.sql ---


-- Grant admin role now if the user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'sunilgondalwad923@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Extend the new-user handler to auto-grant admin to that email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF lower(NEW.email) = 'sunilgondalwad923@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

--- END OF MIGRATION: 20260706110307_23a3f889-d16f-4c30-9f3d-c524deb6a712.sql ---


-- 1. growth_updates: restrict to owner + admin/moderator
DROP POLICY IF EXISTS "Owners admins and approved tree viewers can read growth updates" ON public.growth_updates;
CREATE POLICY "Owners and staff can read growth updates"
ON public.growth_updates
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. treebank storage: replace blanket authenticated read with folder-owner + staff
DROP POLICY IF EXISTS "Authenticated users can read treebank files" ON storage.objects;
CREATE POLICY "Owners and staff can read treebank files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'treebank'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- 3. trees: revoke sensitive column reads from anon/authenticated
REVOKE SELECT (
  selfie_photo_url,
  device_fingerprint,
  photo_hash,
  qr_token,
  exif_timestamp,
  flagged_reason,
  ai_validation_score,
  points_awarded
) ON public.trees FROM anon, authenticated;

--- END OF MIGRATION: 20260707093915_696436e6-b3a3-4cd2-8cfb-f8ea000f2974.sql ---


CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid REFERENCES public.trees(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  actor_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can read audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_tree_id_idx ON public.admin_audit_log (tree_id);

CREATE OR REPLACE FUNCTION public.log_tree_admin_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _email text;
BEGIN
  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status THEN
    SELECT email INTO _email FROM auth.users WHERE id = _actor;
    INSERT INTO public.admin_audit_log (
      tree_id, action, previous_status, new_status, actor_id, actor_email
    ) VALUES (
      NEW.id, NEW.admin_status, OLD.admin_status, NEW.admin_status, _actor, _email
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_tree_admin_status_change
AFTER UPDATE OF admin_status ON public.trees
FOR EACH ROW
EXECUTE FUNCTION public.log_tree_admin_status_change();

--- END OF MIGRATION: 20260707094026_0c96a0ef-26cb-4dde-88d5-38c4ad69ff53.sql ---


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

--- END OF MIGRATION: 20260707094409_c951873d-fb38-4119-9b4f-11a811940401.sql ---


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.tree_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  delegate_id UUID NOT NULL,
  delegate_email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tree_delegations_dates_chk CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tree_delegations TO authenticated;
GRANT ALL ON public.tree_delegations TO service_role;

ALTER TABLE public.tree_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or delegate can view"
  ON public.tree_delegations FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = delegate_id);

CREATE POLICY "Owner can create delegation for own tree"
  ON public.tree_delegations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM public.trees WHERE id = tree_id AND user_id = auth.uid())
  );

CREATE POLICY "Owner can update own delegations"
  ON public.tree_delegations FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own delegations"
  ON public.tree_delegations FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_tree_delegations_updated_at
  BEFORE UPDATE ON public.tree_delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tree_delegations_delegate ON public.tree_delegations(delegate_id, status);
CREATE INDEX idx_tree_delegations_tree ON public.tree_delegations(tree_id);

--- END OF MIGRATION: 20260709193028_6050e686-3bef-45d5-b757-1965b100369f.sql ---


ALTER TABLE public.growth_updates ADD COLUMN IF NOT EXISTS photo_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_growth_updates_photo_hash ON public.growth_updates(photo_hash);

--- END OF MIGRATION: 20260709193310_0ab44cfb-ec1f-4635-bfa4-d9f3f0a69c99.sql ---

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

--- END OF MIGRATION: 20260716194637_5f9b2b59-f22a-4e74-b913-f87ab6bfdee6.sql ---

REVOKE EXECUTE ON FUNCTION public.notify_delegate_on_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_streak() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_tree_rejection() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

--- END OF MIGRATION: 20260716194658_6e9452a1-2743-47a0-985e-d65207cc0bed.sql ---

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
      COALESCE(NEW.flagged_reason, 'A reviewer rejected your submission.'),
      jsonb_build_object('tree_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_tree_rejection() FROM PUBLIC, anon, authenticated;

--- END OF MIGRATION: 20260716194909_7a432310-e4cf-4739-b377-d81fab45e600.sql ---

create or replace function public.get_platform_stats()
returns table(trees bigint, volunteers bigint, verified_trees bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.trees),
    (select count(*) from public.profiles),
    (select count(*) from public.trees where admin_status = 'approved')
$$;

revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to anon, authenticated, service_role;

--- END OF MIGRATION: 20260817091020_28b30106-aafa-43e4-a9cb-eb76338aed41.sql ---


CREATE TABLE public.plantation_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  organization_name text not null,
  organization_type text not null default 'ngo',
  contact_email text,
  contact_phone text,
  location text not null,
  latitude double precision,
  longitude double precision,
  boundary jsonb not null default '[]'::jsonb,
  target_trees integer not null default 0,
  species text[] not null default '{}',
  plantation_date date not null,
  bulk_data jsonb not null default '[]'::jsonb,
  bulk_rows integer not null default 0,
  status text not null default 'draft',
  ai_score numeric,
  ai_report text,
  verified_trees integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantation_projects TO authenticated;
GRANT ALL ON public.plantation_projects TO service_role;
ALTER TABLE public.plantation_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their projects" ON public.plantation_projects
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view all projects" ON public.plantation_projects
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'government'));
CREATE POLICY "Staff can update projects" ON public.plantation_projects
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER update_plantation_projects_updated_at BEFORE UPDATE ON public.plantation_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.project_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.plantation_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null default 'field',
  photo_url text,
  latitude double precision,
  longitude double precision,
  captured_at timestamptz,
  notes text,
  ai_status text,
  ai_score numeric,
  ai_analysis text,
  survival_percent numeric,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_evidence TO authenticated;
GRANT ALL ON public.project_evidence TO service_role;
ALTER TABLE public.project_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their project evidence" ON public.project_evidence
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view project evidence" ON public.project_evidence
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'government'));

--- END OF MIGRATION: 20260817092830_f16146ef-a9e7-477d-b5fc-21637f0b2a90.sql ---

