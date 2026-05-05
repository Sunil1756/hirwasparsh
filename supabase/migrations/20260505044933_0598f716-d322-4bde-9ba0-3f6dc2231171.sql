-- 1. Trees: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view trees" ON public.trees;
CREATE POLICY "Authenticated users can view trees"
ON public.trees
FOR SELECT
TO authenticated
USING (true);

-- 2. Growth updates: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can read growth updates" ON public.growth_updates;
CREATE POLICY "Authenticated users can read growth updates"
ON public.growth_updates
FOR SELECT
TO authenticated
USING (true);

-- 3. Growth updates: prevent farming on other users' trees
DROP POLICY IF EXISTS "Owners can insert growth updates" ON public.growth_updates;
CREATE POLICY "Owners can insert growth updates for their own trees"
ON public.growth_updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.trees t
    WHERE t.id = growth_updates.tree_id
      AND t.user_id = auth.uid()
  )
);

-- Prevent duplicate growth updates for the same tree/day/user
ALTER TABLE public.growth_updates
  DROP CONSTRAINT IF EXISTS unique_tree_day_user;
ALTER TABLE public.growth_updates
  ADD CONSTRAINT unique_tree_day_user UNIQUE (tree_id, update_day, user_id);

-- 4. User roles: restrictive policy to ensure only admins can insert/modify roles
CREATE POLICY "Only admins can modify roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));