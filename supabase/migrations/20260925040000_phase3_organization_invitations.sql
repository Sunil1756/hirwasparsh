-- ====================================================================
-- PHASE 3: MULTI-TENANT ORGANIZATION INVITATIONS & ROLES (TASK 11)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_phone TEXT,
  member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('admin', 'manager', 'field_worker', 'viewer', 'member')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(invited_email);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_org_invitations_updated_at ON public.organization_invitations;
CREATE TRIGGER set_org_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- RLS Policies
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can manage invitations" ON public.organization_invitations
  FOR ALL TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Public can view invitation by token" ON public.organization_invitations;
CREATE POLICY "Public can view invitation by token" ON public.organization_invitations
  FOR SELECT USING (true);
