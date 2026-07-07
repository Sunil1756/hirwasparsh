
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
