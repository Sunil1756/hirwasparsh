
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.tree_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  delegate_id UUID NOT NULL,
  delegate_email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tree_delegations_dates_chk CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tree_delegations TO authenticated;
GRANT ALL ON public.tree_delegations TO service_role;

ALTER TABLE public.tree_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or delegate can view"
  ON public.tree_delegations FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = delegate_id);

CREATE POLICY "Owner can create delegation for own tree"
  ON public.tree_delegations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM public.trees WHERE id = tree_id AND user_id = auth.uid())
  );

CREATE POLICY "Owner can update own delegations"
  ON public.tree_delegations FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own delegations"
  ON public.tree_delegations FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_tree_delegations_updated_at
  BEFORE UPDATE ON public.tree_delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tree_delegations_delegate ON public.tree_delegations(delegate_id, status);
CREATE INDEX idx_tree_delegations_tree ON public.tree_delegations(tree_id);
