-- =========================================================================
-- GREEN ENLIGHTENMENT: PURGE FAKE GIBBERISH AND SEED DEMO PROJECTS
-- Target Supabase Project: https://qvikwdginymvjbrrlvkk.supabase.co
-- =========================================================================

BEGIN;

-- 1. PURGE FAKE GIBBERISH PROJECT: 'dwedwedw' (ID: 97e4d118-29ea-43a8-b69a-82d16fe34bc9)
-- Created before Gate 1 validation; contains gibberish name & location.
DELETE FROM public.project_boundaries WHERE project_id = '97e4d118-29ea-43a8-b69a-82d16fe34bc9';
DELETE FROM public.trees WHERE project_id = '97e4d118-29ea-43a8-b69a-82d16fe34bc9';
DELETE FROM public.audit_logs WHERE project_id = '97e4d118-29ea-43a8-b69a-82d16fe34bc9';
DELETE FROM public.verifications WHERE project_id = '97e4d118-29ea-43a8-b69a-82d16fe34bc9';
DELETE FROM public.plantation_projects WHERE id = '97e4d118-29ea-43a8-b69a-82d16fe34bc9';
DELETE FROM public.projects WHERE id = '97e4d118-29ea-43a8-b69a-82d16fe34bc9';

-- 2. PURGE SEED DEMO PROJECT: 'Sahyadri Bio-Reserve' (ID: b1111111-2222-3333-4444-555555555555)
-- Run this if you want only genuine field-created projects (like 'sahyadri2k26') in your database.
-- UNCOMMENT the lines below to purge the seed demo project:
/*
DELETE FROM public.trees WHERE project_id = 'b1111111-2222-3333-4444-555555555555';
DELETE FROM public.project_boundaries WHERE project_id = 'b1111111-2222-3333-4444-555555555555';
DELETE FROM public.audit_logs WHERE project_id = 'b1111111-2222-3333-4444-555555555555';
DELETE FROM public.verifications WHERE project_id = 'b1111111-2222-3333-4444-555555555555';
DELETE FROM public.plantation_projects WHERE id = 'b1111111-2222-3333-4444-555555555555';
DELETE FROM public.projects WHERE id = 'b1111111-2222-3333-4444-555555555555';
*/

COMMIT;
