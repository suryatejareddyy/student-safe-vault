-- ====================================================================
-- STUDENT SAFE VAULT - SECURE CERTIFICATES & SERVER-SIDE PIN SECURITY
-- Migration Date: 2026-10-03
-- Purpose:
--   1. Enable pgcrypto for salted cryptographic PIN hashing.
--   2. Create public.certificate_pins with brute-force lockout tracking.
--   3. Create SECURITY DEFINER RPC functions for server-side PIN setup,
--      verification, rate limiting, and recovery codes.
--   4. Create public.certificates table with RLS and 5 MB check.
--   5. Provision private Supabase Storage bucket 'certificates' with RLS.
-- ====================================================================

-- Enable pgcrypto extension for crypt() and gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Table for PIN storage and security metadata
CREATE TABLE IF NOT EXISTS public.certificate_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  recovery_code_hash TEXT,
  recovery_code_expires_at TIMESTAMPTZ,
  recovery_attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

COMMENT ON TABLE public.certificate_pins IS 'Stores salted PIN hashes and rate-limit lockout metadata. Direct SELECT blocked.';

-- Enable RLS on certificate_pins (no direct client SELECT/INSERT/UPDATE allowed; handled via RPCs)
ALTER TABLE public.certificate_pins ENABLE ROW LEVEL SECURITY;

-- 2. SERVER-SIDE RPC FUNCTIONS (SECURITY DEFINER)

-- Function A: Get PIN Status (never exposes pin_hash or recovery_code_hash)
CREATE OR REPLACE FUNCTION public.get_pin_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS 
DECLARE
  v_user_id UUID := auth.uid();
  v_rec RECORD;
  v_is_locked BOOLEAN := FALSE;
  v_remaining_attempts INT := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_rec FROM public.certificate_pins WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_pin', FALSE,
      'is_locked', FALSE,
      'locked_until', NULL,
      'remaining_attempts', 5
    );
  END IF;

  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
    v_is_locked := TRUE;
    v_remaining_attempts := 0;
  ELSE
    -- If lock has expired, reset failed attempts
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= NOW() THEN
      UPDATE public.certificate_pins
      SET failed_attempts = 0, locked_until = NULL
      WHERE user_id = v_user_id;
      v_rec.failed_attempts := 0;
    END IF;
    v_remaining_attempts := GREATEST(0, 5 - v_rec.failed_attempts);
  END IF;

  RETURN jsonb_build_object(
    'has_pin', TRUE,
    'is_locked', v_is_locked,
    'locked_until', v_rec.locked_until,
    'remaining_attempts', v_remaining_attempts
  );
END;
;

-- Function B: Setup or Update PIN
CREATE OR REPLACE FUNCTION public.setup_certificate_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS 
DECLARE
  v_user_id UUID := auth.uid();
  v_hash TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate 6-digit numeric format
  IF p_pin !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PIN must be exactly 6 digits.');
  END IF;

  -- Reject trivial/weak sequences
  IF p_pin IN ('000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
               '123456', '654321', '012345', '543210', '121212', '123123') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PIN is too weak. Avoid sequential or repeated numbers.');
  END IF;

  -- Salted Blowfish hash with pgcrypto
  v_hash := crypt(p_pin, gen_salt('bf', 10));

  INSERT INTO public.certificate_pins (user_id, pin_hash, failed_attempts, locked_until, updated_at)
  VALUES (v_user_id, v_hash, 0, NULL, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    pin_hash = v_hash,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW();

  RETURN jsonb_build_object('success', TRUE, 'message', 'PIN configured successfully.');
END;
;

-- Function C: Verify PIN (With 5-attempt rate-limiting and 15-minute lockout)
CREATE OR REPLACE FUNCTION public.verify_certificate_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS 
DECLARE
  v_user_id UUID := auth.uid();
  v_rec RECORD;
  v_match BOOLEAN;
  v_new_failed INT;
  v_lock_time TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_rec FROM public.certificate_pins WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'No PIN set up yet.');
  END IF;

  -- Check lockout
  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'is_locked', TRUE,
      'locked_until', v_rec.locked_until,
      'error', 'Vault locked due to multiple incorrect attempts. Please try again later or recover PIN.'
    );
  END IF;

  -- Check if PIN matches salted hash
  v_match := (crypt(p_pin, v_rec.pin_hash) = v_rec.pin_hash);

  IF v_match THEN
    -- Reset failure counter
    UPDATE public.certificate_pins
    SET failed_attempts = 0, locked_until = NULL
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'success', TRUE,
      'session_valid_minutes', 5
    );
  ELSE
    v_new_failed := v_rec.failed_attempts + 1;

    IF v_new_failed >= 5 THEN
      v_lock_time := NOW() + INTERVAL '15 minutes';
      UPDATE public.certificate_pins
      SET failed_attempts = v_new_failed, locked_until = v_lock_time
      WHERE user_id = v_user_id;

      RETURN jsonb_build_object(
        'success', FALSE,
        'is_locked', TRUE,
        'locked_until', v_lock_time,
        'remaining_attempts', 0,
        'error', '5 consecutive failed attempts. Vault locked for 15 minutes.'
      );
    ELSE
      UPDATE public.certificate_pins
      SET failed_attempts = v_new_failed
      WHERE user_id = v_user_id;

      RETURN jsonb_build_object(
        'success', FALSE,
        'is_locked', FALSE,
        'remaining_attempts', (5 - v_new_failed),
        'error', format('Incorrect PIN. %s attempt(s) remaining.', 5 - v_new_failed)
      );
    END IF;
  END IF;
END;
;

-- Function D: Request PIN Recovery Code (One-time, 15-minute expiration)
CREATE OR REPLACE FUNCTION public.request_pin_recovery_code()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS 
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_code_hash TEXT;
  v_expires TIMESTAMPTZ := NOW() + INTERVAL '15 minutes';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate 6-digit random code
  v_code := lpad(floor(random() * 900000 + 100000)::TEXT, 6, '0');
  v_code_hash := crypt(v_code, gen_salt('bf', 8));

  UPDATE public.certificate_pins
  SET recovery_code_hash = v_code_hash,
      recovery_code_expires_at = v_expires,
      recovery_attempts = 0
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'expires_at', v_expires,
    'recovery_code', v_code
  );
END;
;

-- Function E: Verify Recovery Code and Reset PIN
CREATE OR REPLACE FUNCTION public.verify_and_reset_pin(p_recovery_code TEXT, p_new_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS 
DECLARE
  v_user_id UUID := auth.uid();
  v_rec RECORD;
  v_match BOOLEAN;
  v_new_hash TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_rec FROM public.certificate_pins WHERE user_id = v_user_id;

  IF NOT FOUND OR v_rec.recovery_code_hash IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'No recovery code was requested.');
  END IF;

  IF v_rec.recovery_code_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Recovery code has expired. Please request a new one.');
  END IF;

  IF v_rec.recovery_attempts >= 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Too many failed recovery attempts. Please request a new code.');
  END IF;

  v_match := (crypt(p_recovery_code, v_rec.recovery_code_hash) = v_rec.recovery_code_hash);

  IF NOT v_match THEN
    UPDATE public.certificate_pins
    SET recovery_attempts = recovery_attempts + 1
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid recovery code.');
  END IF;

  -- Validate new PIN
  IF p_new_pin !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'New PIN must be exactly 6 digits.');
  END IF;

  IF p_new_pin IN ('000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
                   '123456', '654321', '012345', '543210') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'New PIN is too weak.');
  END IF;

  v_new_hash := crypt(p_new_pin, gen_salt('bf', 10));

  UPDATE public.certificate_pins
  SET pin_hash = v_new_hash,
      failed_attempts = 0,
      locked_until = NULL,
      recovery_code_hash = NULL,
      recovery_code_expires_at = NULL,
      recovery_attempts = 0,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', TRUE, 'message', 'PIN has been reset successfully.');
END;
;

-- ====================================================================
-- 3. SECURE CERTIFICATES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- 5 MB limit
  category TEXT NOT NULL CHECK (
    category IN (
      'Academic Certificates',
      'Marksheets',
      'Transfer Certificate',
      'Identity Certificates',
      'Income Certificate',
      'Caste Certificate',
      'Other Certificates'
    )
  ),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

COMMENT ON TABLE public.certificates IS 'PIN-protected credentials and verified certificates for Student Safe Vault.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_active ON public.certificates(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_certificates_category ON public.certificates(user_id, category);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS Students can view own certificates ON public.certificates;
CREATE POLICY Students can view own certificates
  ON public.certificates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS Students can insert own certificates ON public.certificates;
CREATE POLICY Students can insert own certificates
  ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS Students can update own certificates ON public.certificates;
CREATE POLICY Students can update own certificates
  ON public.certificates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS Students can delete own certificates ON public.certificates;
CREATE POLICY Students can delete own certificates
  ON public.certificates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at Trigger
DROP TRIGGER IF EXISTS set_certificates_updated_at ON public.certificates;
CREATE TRIGGER set_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 4. PRIVATE CERTIFICATES STORAGE BUCKET & RLS POLICIES
-- ====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  false, -- Strictly private bucket
  5242880, -- 5 MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Students can view own certificates storage" ON storage.objects;
CREATE POLICY "Students can view own certificates storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can upload own certificates storage" ON storage.objects;
CREATE POLICY "Students can upload own certificates storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can update own certificates storage" ON storage.objects;
CREATE POLICY "Students can update own certificates storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can delete own certificates storage" ON storage.objects;
CREATE POLICY "Students can delete own certificates storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
