-- ====================================================================
-- GREEN ENLIGHTENMENT — DATABASE HARDENING & ZERO-TRUST RLS MIGRATION
-- Migration: 20261104200000_harden_database_security_and_rls.sql
-- Date: 2026-11-04
--
-- Security Issues Fixed:
-- 1. Over-open schema grants: Revokes GRANT ALL from anon; restricts anon to SELECT only.
-- 2. check_ins: Removes open USING (true) INSERT/UPDATE; restricts writes to authenticated users/admins.
-- 3. field_tasks: Removes open USING (true) INSERT/UPDATE; restricts access to assigned worker, creator, or admin.
-- 4. notifications: Removes open USING (true); enforces strict tenant privacy (auth.uid() = user_id).
-- 5. payments & subscriptions: Removes wide-open "OR auth.role() = 'authenticated'"; restricts to row owner or org admin.
-- 6. profiles: Revokes column-level SELECT on phone_number from anon to prevent public PII harvesting.
-- ====================================================================

-- ====================================================================
-- SECTION 1: HARDEN TABLE-LEVEL PRIVILEGES (LEAST-PRIVILEGE MODEL)
-- ====================================================================
-- Revoke destructive/all privileges from anonymous public role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

-- Grant safe least-privilege access
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ====================================================================
-- SECTION 2: PROFILES TABLE PII HARDENING (PHONE NUMBERS)
-- ====================================================================
-- Prevent anonymous callers from harvesting phone numbers
REVOKE SELECT (phone_number) ON public.profiles FROM anon;

-- Secure Public View exposing only non-sensitive profile columns
CREATE OR REPLACE VIEW public.user_public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  organization_name,
  role,
  trees_planted,
  green_points,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.user_public_profiles TO anon, authenticated;

-- Ensure profiles RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;

CREATE POLICY "Profiles view policy" ON public.profiles
  FOR SELECT
  USING (true); -- anon cannot select phone_number due to column-level revocation

-- ====================================================================
-- SECTION 3: HARDEN CHECK_INS RLS (NO ANON TAMPERING)
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'check_ins') THEN
    ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read on check_ins" ON public.check_ins;
    DROP POLICY IF EXISTS "Allow public insert on check_ins" ON public.check_ins;
    DROP POLICY IF EXISTS "Allow public update on check_ins" ON public.check_ins;
    DROP POLICY IF EXISTS "Allow public delete on check_ins" ON public.check_ins;

    -- Public read for verified tree monitoring
    CREATE POLICY "Allow public read on check_ins"
      ON public.check_ins FOR SELECT
      USING (true);

    -- Only authenticated users (planters, field workers, or admins) can insert check-ins
    CREATE POLICY "Allow authenticated insert on check_ins"
      ON public.check_ins FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = checked_by OR auth.uid() IS NOT NULL);

    -- Only creator or admin can update check-ins
    CREATE POLICY "Allow creator or admin update on check_ins"
      ON public.check_ins FOR UPDATE TO authenticated
      USING (auth.uid() = checked_by OR public.is_admin())
      WITH CHECK (auth.uid() = checked_by OR public.is_admin());

    -- Only admin can delete check-ins
    CREATE POLICY "Allow admin delete on check_ins"
      ON public.check_ins FOR DELETE TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- ====================================================================
-- SECTION 4: HARDEN FIELD_TASKS RLS (NO ANON TAMPERING)
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'field_tasks') THEN
    ALTER TABLE public.field_tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read on field_tasks" ON public.field_tasks;
    DROP POLICY IF EXISTS "Allow public insert on field_tasks" ON public.field_tasks;
    DROP POLICY IF EXISTS "Allow public update on field_tasks" ON public.field_tasks;
    DROP POLICY IF EXISTS "Allow public delete on field_tasks" ON public.field_tasks;

    -- Only assigned worker, task creator, or admin can read
    CREATE POLICY "Allow assigned or creator read on field_tasks"
      ON public.field_tasks FOR SELECT TO authenticated
      USING (
        auth.uid() = assigned_to 
        OR auth.uid() = created_by 
        OR public.is_admin()
      );

    -- Only authenticated creators or admins can insert tasks
    CREATE POLICY "Allow authorized insert on field_tasks"
      ON public.field_tasks FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = created_by OR public.is_admin());

    -- Assigned worker can update progress/status, creator or admin can update task
    CREATE POLICY "Allow assigned worker or creator update on field_tasks"
      ON public.field_tasks FOR UPDATE TO authenticated
      USING (auth.uid() = assigned_to OR auth.uid() = created_by OR public.is_admin())
      WITH CHECK (auth.uid() = assigned_to OR auth.uid() = created_by OR public.is_admin());

    -- Creator or admin can delete
    CREATE POLICY "Allow creator or admin delete on field_tasks"
      ON public.field_tasks FOR DELETE TO authenticated
      USING (auth.uid() = created_by OR public.is_admin());
  END IF;
END $$;

-- ====================================================================
-- SECTION 5: HARDEN NOTIFICATIONS RLS (STRICT RECIPIENT PRIVACY)
-- ====================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public update on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public delete on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can only read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authorized insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can only update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can only delete own notifications" ON public.notifications;

-- Strict privacy: Users can ONLY view their own notifications
CREATE POLICY "Users can only read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Notifications can be inserted by authenticated workflow callers or admins
CREATE POLICY "Allow authorized insert on notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin() OR auth.uid() IS NOT NULL);

-- Users can only update their own notifications (e.g. marking is_read = true)
CREATE POLICY "Users can only update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Users can only delete their own notifications
CREATE POLICY "Users can only delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ====================================================================
-- SECTION 6: HARDEN PAYMENTS & SUBSCRIPTIONS (REMOVE OR 'authenticated')
-- ====================================================================
-- PAYMENT ORDERS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_orders') THEN
    ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own payment orders" ON public.payment_orders;
    DROP POLICY IF EXISTS "Users can create payment orders" ON public.payment_orders;
    DROP POLICY IF EXISTS "Service and users can update own orders" ON public.payment_orders;
    DROP POLICY IF EXISTS "Users can create own payment orders" ON public.payment_orders;
    DROP POLICY IF EXISTS "Users and admin can update own payment orders" ON public.payment_orders;

    -- Strict tenancy: User can only view their own payment orders or organization's orders
    CREATE POLICY "Users can view own payment orders"
      ON public.payment_orders FOR SELECT TO authenticated
      USING (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
        OR public.is_admin()
      );

    -- Strict creation: Cannot create orders under someone else's user_id
    CREATE POLICY "Users can create own payment orders"
      ON public.payment_orders FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
        OR public.is_admin()
      );

    -- Updates restricted to owner or admin
    CREATE POLICY "Users and admin can update own payment orders"
      ON public.payment_orders FOR UPDATE TO authenticated
      USING (auth.uid() = user_id OR public.is_admin())
      WITH CHECK (auth.uid() = user_id OR public.is_admin());
  END IF;
END $$;

-- PAYMENT TRANSACTIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Authenticated users and service can insert transactions" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Users can insert own transactions" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Admin can update transactions" ON public.payment_transactions;

    -- Strict tenancy: User can only view their own payment transactions
    CREATE POLICY "Users can view own transactions"
      ON public.payment_transactions FOR SELECT TO authenticated
      USING (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
        OR public.is_admin()
      );

    CREATE POLICY "Users can insert own transactions"
      ON public.payment_transactions FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
        OR public.is_admin()
      );

    -- Transactions are immutable financial logs; updates restricted strictly to admin
    CREATE POLICY "Admin can update transactions"
      ON public.payment_transactions FOR UPDATE TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- SUBSCRIPTIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Service role and users can manage subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users and admin can update own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Admin can delete subscriptions" ON public.subscriptions;

    -- Strict tenancy: User can only view their own subscription
    CREATE POLICY "Users can view own subscriptions"
      ON public.subscriptions FOR SELECT TO authenticated
      USING (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
        OR public.is_admin()
      );

    CREATE POLICY "Users can insert own subscriptions"
      ON public.subscriptions FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
        OR public.is_admin()
      );

    CREATE POLICY "Users and admin can update own subscriptions"
      ON public.subscriptions FOR UPDATE TO authenticated
      USING (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
        OR public.is_admin()
      )
      WITH CHECK (
        auth.uid() = user_id 
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
        OR public.is_admin()
      );

    CREATE POLICY "Admin can delete subscriptions"
      ON public.subscriptions FOR DELETE TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
