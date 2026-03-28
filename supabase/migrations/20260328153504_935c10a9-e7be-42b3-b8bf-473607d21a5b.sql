
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
