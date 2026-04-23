-- Add advanced AI verification fields to trees table
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_health_status text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_health_recommendation text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_co2_absorption numeric;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_is_native boolean;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_environmental_context text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_growth_stage text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS ai_fraud_indicators text[];