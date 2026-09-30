-- Migration: Quarantine Fake Projects & Enforce Admin Approval
-- Description: Locks down the plantation_projects table so clients cannot self-verify.

CREATE OR REPLACE FUNCTION public.enforce_project_quarantine()
RETURNS TRIGGER AS $$
DECLARE
  is_staff BOOLEAN;
BEGIN
  -- Check if the current user is an admin or moderator
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
  ) INTO is_staff;

  -- If the action is triggered by the service_role (backend admin operations), allow it
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Handle INSERTS (New Project Creation)
  IF TG_OP = 'INSERT' THEN
    IF NOT is_staff THEN
      -- Force quarantine status
      NEW.status := 'pending_verification';
      
      -- Do not allow them to claim verified trees upfront
      NEW.verified_trees := 0;
      
      -- Optional: Clear any fake AI scores they tried to inject
      -- NEW.ai_score := NULL;
    END IF;
  END IF;

  -- Handle UPDATES (Modifying an existing Project)
  IF TG_OP = 'UPDATE' THEN
    IF NOT is_staff THEN
      -- Prevent self-verification: If they try to change the status, reject the change
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status := OLD.status; -- Revert to what it was
      END IF;

      -- Prevent artificially inflating verified trees
      IF NEW.verified_trees IS DISTINCT FROM OLD.verified_trees THEN
        NEW.verified_trees := OLD.verified_trees; -- Revert to what it was
      END IF;
      
      -- If they alter critical metadata (target trees, location, boundary) after it was active,
      -- we demote it back to pending_verification so an admin must re-review it.
      IF OLD.status = 'verified_active' AND (
         NEW.target_trees IS DISTINCT FROM OLD.target_trees OR
         NEW.location IS DISTINCT FROM OLD.location
      ) THEN
         NEW.status := 'pending_verification';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to intercept INSERTS and UPDATES before they are saved
DROP TRIGGER IF EXISTS trigger_enforce_project_quarantine ON public.plantation_projects;
CREATE TRIGGER trigger_enforce_project_quarantine
  BEFORE INSERT OR UPDATE ON public.plantation_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_quarantine();
