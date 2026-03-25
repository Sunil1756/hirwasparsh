
-- Drop the duplicate and recreate
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;
CREATE POLICY "Users can update own trees" ON public.trees FOR UPDATE TO authenticated USING (auth.uid() = user_id);
