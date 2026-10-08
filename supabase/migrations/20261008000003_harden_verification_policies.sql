-- ====================================================================
-- HIRWA SPARSH — PHASE 1 STEP 3: VERIFICATION SECURITY HARDENING
-- Secures verification data against unauthorized manipulation.
-- ====================================================================

DO $$
BEGIN

-- 1. Hardened Verifications
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verifications') THEN
    EXECUTE 'ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view verifications" ON public.verifications;';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read on verifications" ON public.verifications;';
    
    EXECUTE 'CREATE POLICY "Verifications read" ON public.verifications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.trees t WHERE t.id = verifications.tree_id AND public.is_project_accessible(t.project_id)) OR public.is_admin());';
END IF;

-- 2. Hardened Spectral Anomalies
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spectral_anomalies') THEN
    EXECUTE 'ALTER TABLE public.spectral_anomalies ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view spectral_anomalies" ON public.spectral_anomalies;';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can manage spectral_anomalies" ON public.spectral_anomalies;';
    
    EXECUTE 'CREATE POLICY "Spectral anomalies read" ON public.spectral_anomalies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = spectral_anomalies.project_id AND public.is_project_accessible(p.id)) OR public.is_admin());';
END IF;

-- 3. Hardened Drone Surveys
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drone_surveys') THEN
    EXECUTE 'ALTER TABLE public.drone_surveys ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view drone_surveys" ON public.drone_surveys;';
    
    EXECUTE 'CREATE POLICY "Drone surveys read" ON public.drone_surveys FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = drone_surveys.project_id AND public.is_project_accessible(p.id)) OR public.is_admin());';
END IF;

END $$;
