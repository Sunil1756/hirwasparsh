
-- 1. Tighten trees UPDATE policy: owners cannot touch privileged fields
DROP POLICY IF EXISTS "Users can update own trees (non-privileged fields)" ON public.trees;

CREATE POLICY "Users can update own trees (non-privileged fields)"
ON public.trees
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

-- The guard_tree_privileged_columns trigger already prevents non-admin field changes;
-- ensure it is attached
DROP TRIGGER IF EXISTS trees_guard_privileged_columns ON public.trees;
CREATE TRIGGER trees_guard_privileged_columns
BEFORE UPDATE ON public.trees
FOR EACH ROW
EXECUTE FUNCTION public.guard_tree_privileged_columns();

-- 2. Restrict public profile reads: require authentication for full row access,
-- keep leaderboard usable but no longer anonymous
DROP POLICY IF EXISTS "Anyone can read profiles for leaderboard" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. Restrict listing on public 'treebank' bucket — allow direct file fetch only
-- by removing broad SELECT and replacing with a no-list-friendly policy.
-- We keep object access via signed/public URLs working (those bypass listing policy
-- checks for public buckets), but block enumerating the bucket contents.
DO $$
BEGIN
  -- Drop common permissive policies that enable listing
  EXECUTE (
    SELECT string_agg(format('DROP POLICY IF EXISTS %I ON storage.objects;', polname), ' ')
    FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polcmd = 'r'
      AND pg_get_expr(polqual, polrelid) ILIKE '%treebank%'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Allow only owners (uploaders) to list their own folder; public files are still
-- accessible by direct URL via the storage CDN since the bucket is public.
CREATE POLICY "Owners can list own treebank files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'treebank'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
