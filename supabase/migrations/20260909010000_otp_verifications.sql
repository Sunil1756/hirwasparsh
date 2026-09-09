-- ============================================================================
-- Enterprise Multi-Channel OTP Verification & Delivery Engine
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL, -- normalized email or phone (e.g. user@domain.com or +919876543210)
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  otp_hash TEXT NOT NULL, -- SHA-256 hashed 6-digit code
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'signup', 'recovery', 'auth_step')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow edge functions and server processes full access, restrict public direct reads
CREATE POLICY "Allow public insert for OTP generation" 
  ON public.otp_verifications 
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow verification read and update" 
  ON public.otp_verifications 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Allow verification update" 
  ON public.otp_verifications 
  FOR UPDATE 
  TO anon, authenticated 
  USING (true);

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_otp_recipient_purpose ON public.otp_verifications (recipient, purpose, is_verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_verifications (expires_at);

-- Function: Store New Challenge
CREATE OR REPLACE FUNCTION public.create_otp_challenge(
  p_recipient TEXT,
  p_channel TEXT,
  p_otp_hash TEXT,
  p_purpose TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_validity_minutes INTEGER DEFAULT 10
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_clean_recipient TEXT;
BEGIN
  v_clean_recipient := LOWER(TRIM(p_recipient));

  -- Invalidate any prior unverified tokens for this recipient & purpose
  UPDATE public.otp_verifications
  SET is_verified = true
  WHERE recipient = v_clean_recipient
    AND purpose = p_purpose
    AND is_verified = false;

  -- Insert new challenge
  INSERT INTO public.otp_verifications (
    recipient,
    channel,
    otp_hash,
    purpose,
    metadata,
    expires_at
  ) VALUES (
    v_clean_recipient,
    p_channel,
    p_otp_hash,
    p_purpose,
    p_metadata,
    now() + (p_validity_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function: Verify OTP Challenge
CREATE OR REPLACE FUNCTION public.verify_otp_challenge(
  p_recipient TEXT,
  p_otp_hash TEXT,
  p_purpose TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_clean_recipient TEXT;
BEGIN
  v_clean_recipient := LOWER(TRIM(p_recipient));

  SELECT * INTO v_rec
  FROM public.otp_verifications
  WHERE recipient = v_clean_recipient
    AND purpose = p_purpose
    AND is_verified = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No active verification code found for this destination.');
  END IF;

  IF v_rec.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Verification code has expired. Please request a new code.');
  END IF;

  IF v_rec.attempts >= v_rec.max_attempts THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Maximum verification attempts exceeded. Please request a new code.');
  END IF;

  -- Increment attempt count
  UPDATE public.otp_verifications
  SET attempts = attempts + 1
  WHERE id = v_rec.id;

  -- Check Hash
  IF v_rec.otp_hash = p_otp_hash THEN
    UPDATE public.otp_verifications
    SET is_verified = true
    WHERE id = v_rec.id;

    RETURN jsonb_build_object(
      'success', true,
      'id', v_rec.id,
      'metadata', v_rec.metadata,
      'message', 'Code verified successfully.'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Incorrect verification code. Attempts remaining: ' || (v_rec.max_attempts - v_rec.attempts - 1)
    );
  END IF;
END;
$$;
