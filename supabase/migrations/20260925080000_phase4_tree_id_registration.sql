-- ====================================================================
-- PHASE 4: GREEN ENLIGHTENMENT UNIQUE TREE IDENTIFIERS (TASK 18)
-- Format: GE-YYYY-NNNNNN (e.g. GE-2026-000001)
-- ====================================================================

-- 1. Create global sequential counter for Green Enlightenment trees
CREATE SEQUENCE IF NOT EXISTS public.ge_tree_code_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

-- 2. Add tree_code column to public.trees if not exists
ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS tree_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS qr_token TEXT;

-- 3. Create stored procedure to generate formatted GE tree code
CREATE OR REPLACE FUNCTION public.generate_ge_tree_code()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
  v_code TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_seq := nextval('public.ge_tree_code_seq');
  v_code := 'GE-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 4. Automatic trigger to populate tree_code on INSERT
CREATE OR REPLACE FUNCTION public.trigger_populate_tree_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tree_code IS NULL OR trim(NEW.tree_code) = '' THEN
    NEW.tree_code := public.generate_ge_tree_code();
  END IF;
  IF NEW.qr_token IS NULL OR trim(NEW.qr_token) = '' THEN
    NEW.qr_token := 'qr_' || encode(gen_random_bytes(12), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_tree_code ON public.trees;
CREATE TRIGGER trg_populate_tree_code
  BEFORE INSERT ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_populate_tree_code();

-- 5. Indexes for fast Tree Code & QR lookups
CREATE INDEX IF NOT EXISTS idx_trees_tree_code ON public.trees(tree_code);
CREATE INDEX IF NOT EXISTS idx_trees_qr_token ON public.trees(qr_token);
