
-- 1) Remove anonymous insert on trees
DROP POLICY IF EXISTS "Anonymous can insert trees" ON public.trees;

-- 2) Replace overly-permissive trees UPDATE policy to prevent self-approval
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;

CREATE POLICY "Users can update own trees (non-privileged fields)"
ON public.trees
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Block changes to privileged columns by non-admins via a trigger
CREATE OR REPLACE FUNCTION public.guard_tree_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator') THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
     OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence
     OR NEW.ai_analysis IS DISTINCT FROM OLD.ai_analysis
     OR NEW.ai_detected_species IS DISTINCT FROM OLD.ai_detected_species
     OR NEW.ai_scientific_name IS DISTINCT FROM OLD.ai_scientific_name
     OR NEW.ai_species_confidence IS DISTINCT FROM OLD.ai_species_confidence THEN
    RAISE EXCEPTION 'Only admins or moderators can modify verification, approval, or AI fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_tree_privileged_columns_trigger ON public.trees;
CREATE TRIGGER guard_tree_privileged_columns_trigger
BEFORE UPDATE ON public.trees
FOR EACH ROW
EXECUTE FUNCTION public.guard_tree_privileged_columns();

-- Allow admins/moderators to update any tree
CREATE POLICY "Admins and moderators can update any tree"
ON public.trees
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 3) Create private selfies bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for selfies (private): users manage own folder; admins/mods can read all
CREATE POLICY "Users can upload own selfies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'selfies' AND ((storage.foldername(name))[1] = auth.uid()::text
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')));

CREATE POLICY "Users can update own selfies"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own selfies"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Lock down the public treebank bucket: scope writes to user's own folder
CREATE POLICY "Users can upload own treebank files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'treebank' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own treebank files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'treebank' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own treebank files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'treebank' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can read treebank files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'treebank');
