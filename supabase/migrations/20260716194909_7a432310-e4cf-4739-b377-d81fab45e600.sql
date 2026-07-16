CREATE OR REPLACE FUNCTION public.notify_on_tree_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_status = 'rejected' AND OLD.admin_status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'tree_rejected',
      'Your tree submission was rejected',
      COALESCE(NEW.flagged_reason, 'A reviewer rejected your submission.'),
      jsonb_build_object('tree_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_tree_rejection() FROM PUBLIC, anon, authenticated;