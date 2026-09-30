
-- Step 1: Real Auth & Organization Model Fixes
-- 1. Fixes the RLS vulnerability where ANY active project was globally accessible.
-- 2. Wires up Auth so that NGO signups automatically provision a strict Organization Tenant.

-- Fix 1: Organization Tenant Provisioning on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func
DECLARE
  v_account_type TEXT;
  v_org_name TEXT;
  v_new_org_id UUID;
BEGIN
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  v_org_name := NEW.raw_user_meta_data->>'organization_name';

  -- Create user profile
  INSERT INTO public.profiles (id, full_name, account_type, organization_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_account_type,
    v_org_name
  );

  -- If NGO/CSR/Govt, auto-provision their Tenant Organization and add as Owner
  IF v_account_type IN ('ngo', 'csr', 'government', 'school') AND v_org_name IS NOT NULL THEN
    INSERT INTO public.organizations (name, type, is_verified)
    VALUES (v_org_name, v_account_type, false)
    RETURNING id INTO v_new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, member_role, status)
    VALUES (v_new_org_id, NEW.id, 'owner', 'active');
  END IF;

  RETURN NEW;
END;
$func;

-- Fix 2: Strict Project Isolation (Organization A cannot see Organization B's data)
CREATE OR REPLACE FUNCTION public.is_project_accessible(check_proj_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func
DECLARE
  v_proj RECORD;
BEGIN
  IF check_proj_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT organization_id, created_by, status INTO v_proj
  FROM public.projects
  WHERE id = check_proj_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admin always has access
  IF public.is_admin(check_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Project creator
  IF check_user_id IS NOT NULL AND v_proj.created_by = check_user_id THEN
    RETURN TRUE;
  END IF;

  -- Member of owning organization
  IF v_proj.organization_id IS NOT NULL AND public.is_org_member(v_proj.organization_id, check_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Removed the vulnerability: IF v_proj.status = 'active' THEN RETURN TRUE;
  -- Projects are strictly private to the organization unless explicitly shared.

  RETURN FALSE;
END;
$func;
