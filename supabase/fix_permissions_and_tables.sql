-- ====================================================================
-- GREEN ENLIGHTENMENT: COMPLETE SCHEMA REPAIR & PERMISSIONS SCRIPT
-- Project: qvikwdginymvjbrrlvkk.supabase.co
-- ====================================================================

-- 1. Grant Schema Usages
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Create Missing Tables If Not Exists
CREATE TABLE IF NOT EXISTS public.treebank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'photo',
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.selfies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  target_trees INTEGER DEFAULT 50,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.carbon_offsets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  co2_kg NUMERIC NOT NULL DEFAULT 0,
  calculation_method TEXT DEFAULT 'IPCC_Pantropical_Tier2',
  certificate_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adoptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adopter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  donation_amount NUMERIC DEFAULT 0,
  adoption_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.eco_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_icon TEXT,
  points_awarded INTEGER DEFAULT 50,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.field_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  notes TEXT,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS on all tables
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantation_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_adopters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_health_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treebank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_offsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

-- 4. Create Public & Authenticated Read Policies
-- TREES
DROP POLICY IF EXISTS "Public can view trees" ON public.trees;
CREATE POLICY "Public can view trees" ON public.trees FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert trees" ON public.trees;
CREATE POLICY "Users can insert trees" ON public.trees FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;
CREATE POLICY "Users can update own trees" ON public.trees FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- PROFILES
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- GROWTH UPDATES
DROP POLICY IF EXISTS "Public can view growth updates" ON public.growth_updates;
CREATE POLICY "Public can view growth updates" ON public.growth_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert growth updates" ON public.growth_updates;
CREATE POLICY "Authenticated users can insert growth updates" ON public.growth_updates FOR INSERT WITH CHECK (true);

-- CHALLENGES
DROP POLICY IF EXISTS "Public can view challenges" ON public.challenges;
CREATE POLICY "Public can view challenges" ON public.challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view challenge participants" ON public.challenge_participants;
CREATE POLICY "Public can view challenge participants" ON public.challenge_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (true);

-- TEAMS
DROP POLICY IF EXISTS "Public can view teams" ON public.teams;
CREATE POLICY "Public can view teams" ON public.teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can view team members" ON public.team_members;
CREATE POLICY "Public can view team members" ON public.team_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
CREATE POLICY "Users can join teams" ON public.team_members FOR INSERT WITH CHECK (true);

-- PLANTATION PROJECTS & DRIVES
DROP POLICY IF EXISTS "Public can view plantation projects" ON public.plantation_projects;
CREATE POLICY "Public can view plantation projects" ON public.plantation_projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view project evidence" ON public.project_evidence;
CREATE POLICY "Public can view project evidence" ON public.project_evidence FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view plantation drives" ON public.plantation_drives;
CREATE POLICY "Public can view plantation drives" ON public.plantation_drives FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view drive participants" ON public.drive_participants;
CREATE POLICY "Public can view drive participants" ON public.drive_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join drives" ON public.drive_participants;
CREATE POLICY "Users can join drives" ON public.drive_participants FOR INSERT WITH CHECK (true);

-- TREE HEALTH & ADOPTERS
DROP POLICY IF EXISTS "Public can view tree health updates" ON public.tree_health_updates;
CREATE POLICY "Public can view tree health updates" ON public.tree_health_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert tree health updates" ON public.tree_health_updates;
CREATE POLICY "Users can insert tree health updates" ON public.tree_health_updates FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can view tree adopters" ON public.tree_adopters;
CREATE POLICY "Public can view tree adopters" ON public.tree_adopters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can adopt trees" ON public.tree_adopters;
CREATE POLICY "Users can adopt trees" ON public.tree_adopters FOR INSERT WITH CHECK (true);

-- TREEBANK & SELFIES & EVENTS
DROP POLICY IF EXISTS "Public can view treebank" ON public.treebank;
CREATE POLICY "Public can view treebank" ON public.treebank FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert treebank" ON public.treebank FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can view selfies" ON public.selfies;
CREATE POLICY "Public can view selfies" ON public.selfies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert selfies" ON public.selfies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can view community events" ON public.community_events;
CREATE POLICY "Public can view community events" ON public.community_events FOR SELECT USING (true);

-- 5. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('trees', 'trees', true),
  ('tree-photos', 'tree-photos', true),
  ('treebank', 'treebank', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can view storage objects" ON storage.objects;
CREATE POLICY "Public can view storage objects" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can upload storage objects" ON storage.objects;
CREATE POLICY "Anyone can upload storage objects" ON storage.objects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own storage objects" ON storage.objects;
CREATE POLICY "Users can update own storage objects" ON storage.objects FOR UPDATE USING (true);
