
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
