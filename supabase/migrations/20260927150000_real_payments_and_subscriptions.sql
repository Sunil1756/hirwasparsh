-- Migration: Real Razorpay Multi-Gateway Payments, Invoicing & Subscriptions Engine
-- Date: 2026-09-27
-- Description: Creates payment_orders, payment_transactions, and subscriptions tables with RLS and audit tracking.

-- 1. Payment Orders Table
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    order_id TEXT UNIQUE NOT NULL,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('monthly', 'annual')),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
    base_amount NUMERIC NOT NULL,
    gst_rate NUMERIC NOT NULL DEFAULT 18.0,
    gst_amount NUMERIC NOT NULL DEFAULT 0.0,
    total_amount NUMERIC NOT NULL,
    amount_paise BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'cancelled', 'expired')),
    gateway TEXT NOT NULL DEFAULT 'razorpay' CHECK (gateway IN ('razorpay', 'corporate_po', 'bank_transfer', 'stripe')),
    gstin TEXT,
    billing_name TEXT,
    billing_email TEXT,
    po_reference_number TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Payment Transactions Table (Captures real Razorpay/Gateway signatures & settlements)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES public.payment_orders(order_id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    payment_id TEXT UNIQUE NOT NULL,
    signature TEXT,
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'qr', 'card', 'netbanking', 'corporate_po', 'bank_transfer')),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'authorized', 'failed', 'refunded')),
    customer_email TEXT,
    customer_name TEXT,
    customer_contact TEXT,
    card_network TEXT,
    card_last4 TEXT,
    upi_vpa TEXT,
    bank_name TEXT,
    invoice_number TEXT,
    invoice_url TEXT,
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Subscriptions Table (Active SaaS licenses and capabilities)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('starter_pilot', 'ngo_pro', 'csr_enterprise', 'enterprise_dedicated')),
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'expired')),
    billing_cycle TEXT NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('monthly', 'annual')),
    currency TEXT NOT NULL DEFAULT 'INR',
    price_paid NUMERIC NOT NULL DEFAULT 0.0,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_subscription_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    max_hectares NUMERIC DEFAULT 5.0,
    max_trees INTEGER DEFAULT 1000,
    license_key TEXT UNIQUE,
    vertex_ai_endpoint TEXT,
    features_unlocked JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Payment Orders
CREATE POLICY "Users can view own payment orders"
    ON public.payment_orders FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Users can create payment orders"
    ON public.payment_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Service and users can update own orders"
    ON public.payment_orders FOR UPDATE
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- RLS Policies for Payment Transactions
CREATE POLICY "Users can view own transactions"
    ON public.payment_transactions FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users and service can insert transactions"
    ON public.payment_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- RLS Policies for Subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Service role and users can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON public.payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON public.payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
