-- ====================================================================
-- HIRWA SPARSH — PHASE 1 STEP 3: STORAGE RLS SECURITY HARDENING
-- Secures evidence and project-documents buckets against unauthorized access.
-- ====================================================================

-- Helper function to resolve access for evidence uploads based on their path
CREATE OR REPLACE FUNCTION public.is_evidence_path_accessible(file_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  proj_id UUID;
  path_parts TEXT[];
BEGIN
  path_parts := string_to_array(file_name, '/');
  -- In secureStorageService.ts, evidence path is: evidence/{targetId}/{evidenceType}/{filename}
  -- Wait, the name in storage.objects is relative to the bucket.
  -- So name is: evidence/{targetId}/... or just {targetId}/... ?
  -- If path given to upload() is "evidence/...", then name is "evidence/...".
  
  IF array_length(path_parts, 1) < 2 THEN
    RETURN FALSE;
  END IF;

  -- If it starts with 'evidence', targetId is [2]. If not, it might be [1].
  IF path_parts[1] = 'evidence' THEN
    target_id := path_parts[2]::UUID;
  ELSE
    target_id := path_parts[1]::UUID;
  END IF;

  -- If target_id is a project
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = target_id) THEN
    RETURN public.is_project_accessible(target_id);
  END IF;

  -- If target_id is a tree
  SELECT project_id INTO proj_id FROM public.trees WHERE id = target_id;
  IF FOUND THEN
    RETURN public.is_project_accessible(proj_id);
  END IF;

  RETURN FALSE;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN FALSE;
END;
$$;

-- Helper function to resolve access for project documents
CREATE OR REPLACE FUNCTION public.is_project_document_accessible(file_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  path_parts TEXT[];
BEGIN
  path_parts := string_to_array(file_name, '/');
  -- Path is: projects/{projectId}/{documentType}/{filename}
  
  IF array_length(path_parts, 1) < 2 THEN
    RETURN FALSE;
  END IF;

  IF path_parts[1] = 'projects' THEN
    target_id := path_parts[2]::UUID;
  ELSE
    target_id := path_parts[1]::UUID;
  END IF;

  RETURN public.is_project_accessible(target_id);
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN FALSE;
END;
$$;

-- 1. Hardened Evidence Bucket Policies
DROP POLICY IF EXISTS "Evidence read policy" ON storage.objects;
CREATE POLICY "Evidence read policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (public.is_evidence_path_accessible(name) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Evidence upload policy" ON storage.objects;
CREATE POLICY "Evidence upload policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND (public.is_evidence_path_accessible(name) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Evidence modify policy" ON storage.objects;
CREATE POLICY "Evidence update policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (public.is_evidence_path_accessible(name) OR public.is_admin())
  );
CREATE POLICY "Evidence delete policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (public.is_evidence_path_accessible(name) OR public.is_admin())
  );

-- 2. Hardened Project Documents Bucket Policies
DROP POLICY IF EXISTS "Project documents read policy" ON storage.objects;
CREATE POLICY "Project documents read policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (public.is_project_document_accessible(name) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Project documents upload policy" ON storage.objects;
CREATE POLICY "Project documents upload policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND (public.is_project_document_accessible(name) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Project documents modify policy" ON storage.objects;
CREATE POLICY "Project documents update policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (public.is_project_document_accessible(name) OR public.is_admin())
  );
CREATE POLICY "Project documents delete policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (public.is_project_document_accessible(name) OR public.is_admin())
  );
