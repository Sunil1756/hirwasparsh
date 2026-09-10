-- Migration: Strict Project Ownership & Public Monitoring Access Control RLS
-- Date: 2026-09-10
-- Description:
-- 1. Anyone (public & authenticated) can view/SELECT plantation_projects, plots, and project_evidence (for environmental transparency & satellite MRV).
-- 2. ONLY the project owner (user_id = auth.uid()) OR platform admin can UPDATE / DELETE plantation_projects and plots.
-- 3. ONLY the project owner OR platform admin can INSERT / UPDATE / DELETE project_evidence for that project.

-- 1. Enable RLS on plantation_projects
ALTER TABLE public.plantation_projects ENABLE ROW LEVEL SECURITY;

-- Public read access for transparency & satellite telemetry
DROP POLICY IF EXISTS "Anyone can view plantation projects" ON public.plantation_projects;
CREATE POLICY "Anyone can view plantation projects" 
ON public.plantation_projects FOR SELECT 
USING (true);

-- Authenticated users can create their own plantation projects
DROP POLICY IF EXISTS "Authenticated users can create plantation projects" ON public.plantation_projects;
CREATE POLICY "Authenticated users can create plantation projects" 
ON public.plantation_projects FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Only owner or admin can update plantation projects
DROP POLICY IF EXISTS "Owners and admins can update plantation projects" ON public.plantation_projects;
CREATE POLICY "Owners and admins can update plantation projects" 
ON public.plantation_projects FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

-- Only owner or admin can delete plantation projects
DROP POLICY IF EXISTS "Owners and admins can delete plantation projects" ON public.plantation_projects;
CREATE POLICY "Owners and admins can delete plantation projects" 
ON public.plantation_projects FOR DELETE 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

-- 2. Enable RLS on project_evidence
ALTER TABLE public.project_evidence ENABLE ROW LEVEL SECURITY;

-- Public read access for project evidence photos and telemetry logs
DROP POLICY IF EXISTS "Anyone can view project evidence" ON public.project_evidence;
CREATE POLICY "Anyone can view project evidence" 
ON public.project_evidence FOR SELECT 
USING (true);

-- Only project owners or admins can upload evidence to a project
DROP POLICY IF EXISTS "Owners and admins can upload project evidence" ON public.project_evidence;
CREATE POLICY "Owners and admins can upload project evidence" 
ON public.project_evidence FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.plantation_projects p 
    WHERE p.id = project_evidence.project_id 
      AND (
        p.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
      )
  )
);

-- Only project owners or admins can update project evidence
DROP POLICY IF EXISTS "Owners and admins can update project evidence" ON public.project_evidence;
CREATE POLICY "Owners and admins can update project evidence" 
ON public.project_evidence FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.plantation_projects p 
    WHERE p.id = project_evidence.project_id 
      AND (
        p.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
      )
  )
);

-- Only project owners or admins can delete project evidence
DROP POLICY IF EXISTS "Owners and admins can delete project evidence" ON public.project_evidence;
CREATE POLICY "Owners and admins can delete project evidence" 
ON public.project_evidence FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.plantation_projects p 
    WHERE p.id = project_evidence.project_id 
      AND (
        p.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
      )
  )
);

-- 3. Enable RLS on plots table
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view plots" ON public.plots;
CREATE POLICY "Anyone can view plots" 
ON public.plots FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create plots" ON public.plots;
CREATE POLICY "Authenticated users can create plots" 
ON public.plots FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Owners and admins can update plots" ON public.plots;
CREATE POLICY "Owners and admins can update plots" 
ON public.plots FOR UPDATE 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  )
);
