
DROP POLICY IF EXISTS "Authenticated users can read treebank files" ON storage.objects;
CREATE POLICY "Authenticated users can read treebank files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'treebank');
