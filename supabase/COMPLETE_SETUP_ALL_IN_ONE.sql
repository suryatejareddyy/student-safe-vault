-- ====================================================================
-- STUDENT SAFE VAULT - COMPLETE ALL-IN-ONE SETUP SCRIPT
-- Execute in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ysimedohqvcfdufpktcb/sql/new
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ====================================================================
-- PART: 20261003_init_auth_and_profiles.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - SUPABASE AUTH & PROFILES SCHEMA MIGRATION
-- Migration Date: 2026-10-03
-- Purpose: Profiles table, Row-Level Security (RLS), User Creation Trigger,
--          Role Security, and Demo Student Account Provisioning.
-- ====================================================================

-- 1. Create the `profiles` table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  college_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Comment on table and columns
COMMENT ON TABLE public.profiles IS 'Student and user profiles for Student Safe Vault.';
COMMENT ON COLUMN public.profiles.id IS 'Links directly to auth.users.id.';
COMMENT ON COLUMN public.profiles.role IS 'Security role: student (default) or admin. Cannot be escalated via client updates.';
COMMENT ON COLUMN public.profiles.is_demo IS 'Flag indicating a demonstration student account with sample data.';

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies

-- Policy 1: Authenticated users can view ONLY their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Authenticated users can update ONLY their own profile
-- CRITICAL SECURITY: Users cannot alter their own `role` or `is_demo` flags.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent role elevation: the updated role must match the existing role in the database
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    -- Prevent altering demo flag
    AND is_demo = (SELECT p.is_demo FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Policy 3: Insertion is handled securely by the database trigger (SECURITY DEFINER)
-- We also allow authenticated user to insert their own profile in fallback scenarios
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'student' -- Enforce student role on client insertions
  );

-- 4. Automatic Profile Creation Trigger on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_college_name TEXT;
  v_is_demo BOOLEAN;
BEGIN
  -- Extract metadata safely supplied during supabase.auth.signUp()
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Student User');
  v_phone := new.raw_user_meta_data->>'phone';
  v_college_name := new.raw_user_meta_data->>'college_name';
  v_is_demo := COALESCE((new.raw_user_meta_data->>'is_demo')::BOOLEAN, FALSE);

  -- Insert profile with enforced 'student' role. Never grant admin from metadata!
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    college_name,
    role,
    is_demo,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    v_full_name,
    new.email,
    v_phone,
    v_college_name,
    'student', -- Always defaulted to 'student'
    v_is_demo,
    TIMEZONE('utc'::TEXT, NOW()),
    TIMEZONE('utc'::TEXT, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    college_name = EXCLUDED.college_name,
    updated_at = TIMEZONE('utc'::TEXT, NOW());

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Updated_at timestamp maintenance trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 6. DEMO STUDENT ACCOUNT PROVISIONING INSTRUCTIONS
-- ====================================================================
-- Requested Demo Credentials:
-- Email:    demo.student@studentsafevault.demo
-- Password: Demo@12345
--
-- How to create the demo account in Supabase:
--
-- Method A (Recommended via Supabase Dashboard):
-- 1. Go to your Supabase Project -> Authentication -> Users.
-- 2. Click "Add User" -> "Create User".
-- 3. Enter Email: demo.student@studentsafevault.demo
-- 4. Enter Password: Demo@12345
-- 5. Set "Auto Confirm User?" to TRUE (Checked) so email verification is immediately satisfied.
-- 6. In User Metadata (raw_user_meta_data), add:
--    {
--      "full_name": "Demo Student",
--      "phone": "+1 555-019-9000",
--      "college_name": "Demonstration Institute of Technology",
--      "is_demo": true
--    }
--
-- Method B (Via SQL Editor if pgcrypto extension is active):
-- Run the following script in the Supabase SQL Editor:
/*
DO $$
DECLARE
  demo_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.student@studentsafevault.demo') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token
    )
    VALUES (
      demo_user_id,
      '00000000-0000-0000-0000-000000000000',
      'demo.student@studentsafevault.demo',
      crypt('Demo@12345', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo Student","phone":"+1 555-019-9000","college_name":"Demonstration Institute of Technology","is_demo":true}',
      NOW(),
      NOW(),
      'authenticated',
      ''
    );
  END IF;
END $$;
*/


-- ====================================================================
-- PART: 20261003_add_personal_info_and_storage.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - PERSONAL & ACADEMIC INFO + AVATAR STORAGE
-- Migration Date: 2026-10-03
-- Purpose: Add personal details and academic fields to public.profiles,
--          create private avatars storage bucket with user-scoped RLS.
-- ====================================================================

-- 1. Add Personal Information Columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States',
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- 2. Add College & Academic Details Columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS college_address TEXT,
  ADD COLUMN IF NOT EXISTS course_degree TEXT,
  ADD COLUMN IF NOT EXISTS department_branch TEXT,
  ADD COLUMN IF NOT EXISTS current_year TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS admission_number TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year TEXT,
  ADD COLUMN IF NOT EXISTS academic_email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Comment on new columns for database clarity
COMMENT ON COLUMN public.profiles.dob IS 'Student date of birth; used to compute student age.';
COMMENT ON COLUMN public.profiles.student_id IS 'Unique student institutional roll or identification number.';
COMMENT ON COLUMN public.profiles.course_degree IS 'Degree program (e.g. B.Tech Computer Science).';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Private storage path or signed URL for student profile photo.';

-- 4. Verify Row Level Security is active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Ensure existing UPDATE policy preserves student role protection
-- (Re-affirming that role and is_demo cannot be elevated by students)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_demo = (SELECT p.is_demo FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ====================================================================
-- 6. PRIVATE AVATARS STORAGE BUCKET & RLS POLICIES
-- ====================================================================

-- Create private bucket for student avatars (if storage schema exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false, -- Private bucket: access requires user authentication
  5242880, -- 5 MB maximum file size limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg'];

-- Storage RLS Policy 1: Authenticated students can view ONLY their own avatar
DROP POLICY IF EXISTS "Students can view own avatar" ON storage.objects;
CREATE POLICY "Students can view own avatar"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS Policy 2: Authenticated students can upload ONLY to their own folder
DROP POLICY IF EXISTS "Students can upload own avatar" ON storage.objects;
CREATE POLICY "Students can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS Policy 3: Authenticated students can update/replace ONLY their own avatar
DROP POLICY IF EXISTS "Students can update own avatar" ON storage.objects;
CREATE POLICY "Students can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS Policy 4: Authenticated students can delete ONLY their own avatar
DROP POLICY IF EXISTS "Students can delete own avatar" ON storage.objects;
CREATE POLICY "Students can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ====================================================================
-- PART: 20261003_create_documents_and_storage.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - DOCUMENTS TABLE & SECURE STORAGE MIGRATION
-- Migration Date: 2026-10-03
-- Purpose: Create public.documents table with RLS, soft-delete metadata,
--          and private Supabase Storage bucket with user-scoped policies.
-- ====================================================================

-- 1. Create the `documents` table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- 5 MB limit
  category TEXT NOT NULL CHECK (
    category IN (
      'Identity Documents',
      'Academic Certificates',
      'Marksheets',
      'College Documents',
      'Applications and Forms',
      'Personal Documents',
      'Other'
    )
  ),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Comments on table and columns
COMMENT ON TABLE public.documents IS 'Encrypted document metadata for Student Safe Vault.';
COMMENT ON COLUMN public.documents.user_id IS 'Links to authenticated student user ID.';
COMMENT ON COLUMN public.documents.storage_path IS 'Path within the private documents bucket.';
COMMENT ON COLUMN public.documents.file_size IS 'Size in bytes, restricted to maximum 5 MB.';
COMMENT ON COLUMN public.documents.is_deleted IS 'Soft-delete flag for 30-day Recycle Bin buffer.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_active ON public.documents(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(user_id, category);

-- 2. Enable Row-Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated students can view ONLY their own documents
DROP POLICY IF EXISTS "Students can view own documents" ON public.documents;
CREATE POLICY "Students can view own documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Authenticated students can insert ONLY their own documents
DROP POLICY IF EXISTS "Students can insert own documents" ON public.documents;
CREATE POLICY "Students can insert own documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Authenticated students can update ONLY their own documents
DROP POLICY IF EXISTS "Students can update own documents" ON public.documents;
CREATE POLICY "Students can update own documents"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Authenticated students can permanently delete ONLY their own documents
DROP POLICY IF EXISTS "Students can delete own documents" ON public.documents;
CREATE POLICY "Students can delete own documents"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Automatic updated_at Trigger
DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 4. PRIVATE DOCUMENTS STORAGE BUCKET & RLS POLICIES
-- ====================================================================

-- Create private bucket for student documents (if storage schema exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket: access requires authenticated signed URLs
  5242880, -- 5 MB maximum file size limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

-- Storage RLS Policy 1: Authenticated students can view/download ONLY their own documents
DROP POLICY IF EXISTS "Students can view own documents storage" ON storage.objects;
CREATE POLICY "Students can view own documents storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS Policy 2: Authenticated students can upload ONLY into their own folder
DROP POLICY IF EXISTS "Students can upload own documents storage" ON storage.objects;
CREATE POLICY "Students can upload own documents storage"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS Policy 3: Authenticated students can update ONLY their own files
DROP POLICY IF EXISTS "Students can update own documents storage" ON storage.objects;
CREATE POLICY "Students can update own documents storage"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS Policy 4: Authenticated students can delete ONLY their own files
DROP POLICY IF EXISTS "Students can delete own documents storage" ON storage.objects;
CREATE POLICY "Students can delete own documents storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ====================================================================
-- PART: 20261003_create_certificates_and_pins.sql
-- ====================================================================

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


-- ====================================================================
-- PART: 20261003_create_pictures_and_storage.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - PICTURES GALLERY & SECURE STORAGE MIGRATION
-- Migration Date: 2026-10-03
-- Purpose: Create public.pictures table with RLS, album categories,
--          5 MB validation, and private Supabase Storage bucket 'pictures'.
-- ====================================================================

-- 1. Create public.pictures table
CREATE TABLE IF NOT EXISTS public.pictures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/jpg')),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- 5 MB limit
  album TEXT NOT NULL CHECK (
    album IN (
      'Personal',
      'College Events',
      'ID Photos',
      'Academic',
      'Memories',
      'Other'
    )
  ),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

COMMENT ON TABLE public.pictures IS 'Private student photo gallery metadata with album classification.';
COMMENT ON COLUMN public.pictures.album IS 'Album category: Personal, College Events, ID Photos, Academic, Memories, Other';
COMMENT ON COLUMN public.pictures.file_size IS 'Size in bytes, restricted to maximum 5 MB (5,242,880 bytes).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pictures_user_id ON public.pictures(user_id);
CREATE INDEX IF NOT EXISTS idx_pictures_active ON public.pictures(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_pictures_album ON public.pictures(user_id, album);

-- 2. Enable Row-Level Security
ALTER TABLE public.pictures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Students can view own pictures ON public.pictures;
CREATE POLICY Students can view own pictures
  ON public.pictures FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS Students can insert own pictures ON public.pictures;
CREATE POLICY Students can insert own pictures
  ON public.pictures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS Students can update own pictures ON public.pictures;
CREATE POLICY Students can update own pictures
  ON public.pictures FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS Students can delete own pictures ON public.pictures;
CREATE POLICY Students can delete own pictures
  ON public.pictures FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at Trigger
DROP TRIGGER IF EXISTS set_pictures_updated_at ON public.pictures;
CREATE TRIGGER set_pictures_updated_at
  BEFORE UPDATE ON public.pictures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 3. PRIVATE PICTURES STORAGE BUCKET & RLS POLICIES
-- ====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pictures',
  'pictures',
  false, -- Private bucket
  5242880, -- 5 MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Students can view own pictures storage" ON storage.objects;
CREATE POLICY "Students can view own pictures storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can upload own pictures storage" ON storage.objects;
CREATE POLICY "Students can upload own pictures storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can update own pictures storage" ON storage.objects;
CREATE POLICY "Students can update own pictures storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can delete own pictures storage" ON storage.objects;
CREATE POLICY "Students can delete own pictures storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ====================================================================
-- PART: 20261003_recycle_bin_and_auto_cleanup.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - RECYCLE BIN & AUTOMATIC 30-DAY CLEANUP MIGRATION
-- Migration Date: 2026-10-03
-- Purpose:
--   1. Add expires_at column and triggers to documents, certificates, pictures.
--   2. Create public.recycle_bin_cleanup_logs audit table with RLS.
--   3. Create public.recycle_bin_items unified view for cross-section recycling.
--   4. Create SECURITY DEFINER RPC functions:
--      - purge_expired_recycle_bin_items() [Server-side automatic 30-day cleanup]
--      - permanently_delete_recycle_bin_item() [Single item permanent purge]
--      - empty_student_recycle_bin() [Purge all student deleted items]
--      - restore_recycle_bin_item() [Restore soft-deleted item]
--   5. Provide pg_cron / scheduled job setup instructions.
-- ====================================================================

-- 1. ADD expires_at COLUMNS (Default = deleted_at + 30 days)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.pictures
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Trigger function to automatically maintain deleted_at and expires_at
CREATE OR REPLACE FUNCTION public.sync_recycle_bin_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND (OLD.is_deleted IS NULL OR OLD.is_deleted = FALSE) THEN
    NEW.deleted_at := COALESCE(NEW.deleted_at, TIMEZONE('utc'::TEXT, NOW()));
    NEW.expires_at := NEW.deleted_at + INTERVAL '30 days';
  ELSIF NEW.is_deleted = FALSE AND OLD.is_deleted = TRUE THEN
    NEW.deleted_at := NULL;
    NEW.expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_recycle_sync ON public.documents;
CREATE TRIGGER trg_documents_recycle_sync
  BEFORE INSERT OR UPDATE OF is_deleted ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recycle_bin_timestamps();

DROP TRIGGER IF EXISTS trg_certificates_recycle_sync ON public.certificates;
CREATE TRIGGER trg_certificates_recycle_sync
  BEFORE INSERT OR UPDATE OF is_deleted ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recycle_bin_timestamps();

DROP TRIGGER IF EXISTS trg_pictures_recycle_sync ON public.pictures;
CREATE TRIGGER trg_pictures_recycle_sync
  BEFORE INSERT OR UPDATE OF is_deleted ON public.pictures
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recycle_bin_timestamps();

-- Populate existing deleted items if any had NULL expires_at
UPDATE public.documents
SET expires_at = deleted_at + INTERVAL '30 days'
WHERE is_deleted = TRUE AND expires_at IS NULL AND deleted_at IS NOT NULL;

UPDATE public.certificates
SET expires_at = deleted_at + INTERVAL '30 days'
WHERE is_deleted = TRUE AND expires_at IS NULL AND deleted_at IS NOT NULL;

UPDATE public.pictures
SET expires_at = deleted_at + INTERVAL '30 days'
WHERE is_deleted = TRUE AND expires_at IS NULL AND deleted_at IS NOT NULL;

-- 2. CREATE RECYCLE BIN CLEANUP & AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.recycle_bin_cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('document', 'certificate', 'picture')),
  file_name TEXT NOT NULL,
  storage_bucket TEXT NOT NULL CHECK (storage_bucket IN ('documents', 'certificates', 'pictures')),
  storage_path TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL,
  expired_at TIMESTAMPTZ NOT NULL,
  purged_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  status TEXT NOT NULL DEFAULT 'purged',
  details TEXT
);

COMMENT ON TABLE public.recycle_bin_cleanup_logs IS 'Audit log of items permanently removed or auto-cleaned after the 30-day retention period.';

ALTER TABLE public.recycle_bin_cleanup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own cleanup logs" ON public.recycle_bin_cleanup_logs;
CREATE POLICY "Students can view own cleanup logs"
  ON public.recycle_bin_cleanup_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cleanup_logs_user_id ON public.recycle_bin_cleanup_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_purged_at ON public.recycle_bin_cleanup_logs(purged_at);

-- 3. UNIFIED RECYCLE BIN ITEMS VIEW
CREATE OR REPLACE VIEW public.recycle_bin_items AS
SELECT 
  d.id,
  d.user_id,
  'document'::TEXT AS item_type,
  d.name,
  d.original_name,
  d.category AS original_category_or_album,
  d.storage_path,
  'documents'::TEXT AS storage_bucket,
  d.file_type,
  d.file_size,
  d.deleted_at,
  COALESCE(d.expires_at, d.deleted_at + INTERVAL '30 days') AS expires_at,
  CASE 
    WHEN COALESCE(d.expires_at, d.deleted_at + INTERVAL '30 days') <= TIMEZONE('utc'::TEXT, NOW()) THEN 'expired'
    ELSE 'retained'
  END AS cleanup_status,
  ROUND(EXTRACT(EPOCH FROM (COALESCE(d.expires_at, d.deleted_at + INTERVAL '30 days') - TIMEZONE('utc'::TEXT, NOW()))) / 86400)::INT AS days_remaining
FROM public.documents d
WHERE d.is_deleted = TRUE
UNION ALL
SELECT 
  c.id,
  c.user_id,
  'certificate'::TEXT AS item_type,
  c.name,
  c.original_name,
  c.category AS original_category_or_album,
  c.storage_path,
  'certificates'::TEXT AS storage_bucket,
  c.file_type,
  c.file_size,
  c.deleted_at,
  COALESCE(c.expires_at, c.deleted_at + INTERVAL '30 days') AS expires_at,
  CASE 
    WHEN COALESCE(c.expires_at, c.deleted_at + INTERVAL '30 days') <= TIMEZONE('utc'::TEXT, NOW()) THEN 'expired'
    ELSE 'retained'
  END AS cleanup_status,
  ROUND(EXTRACT(EPOCH FROM (COALESCE(c.expires_at, c.deleted_at + INTERVAL '30 days') - TIMEZONE('utc'::TEXT, NOW()))) / 86400)::INT AS days_remaining
FROM public.certificates c
WHERE c.is_deleted = TRUE
UNION ALL
SELECT 
  p.id,
  p.user_id,
  'picture'::TEXT AS item_type,
  p.name,
  p.original_name,
  p.album AS original_category_or_album,
  p.storage_path,
  'pictures'::TEXT AS storage_bucket,
  p.file_type,
  p.file_size,
  p.deleted_at,
  COALESCE(p.expires_at, p.deleted_at + INTERVAL '30 days') AS expires_at,
  CASE 
    WHEN COALESCE(p.expires_at, p.deleted_at + INTERVAL '30 days') <= TIMEZONE('utc'::TEXT, NOW()) THEN 'expired'
    ELSE 'retained'
  END AS cleanup_status,
  ROUND(EXTRACT(EPOCH FROM (COALESCE(p.expires_at, p.deleted_at + INTERVAL '30 days') - TIMEZONE('utc'::TEXT, NOW()))) / 86400)::INT AS days_remaining
FROM public.pictures p
WHERE p.is_deleted = TRUE;

COMMENT ON VIEW public.recycle_bin_items IS 'Unified cross-section view of soft-deleted assets across documents, certificates, and pictures.';

-- 4. SERVER-SIDE RPC FUNCTIONS (SECURITY DEFINER)

-- Function 4A: Restore Soft-Deleted Item
CREATE OR REPLACE FUNCTION public.restore_recycle_bin_item(p_item_id UUID, p_item_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rows_affected INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Authentication required.');
  END IF;

  IF p_item_type = 'document' THEN
    UPDATE public.documents
    SET is_deleted = FALSE, deleted_at = NULL, expires_at = NULL, updated_at = NOW()
    WHERE id = p_item_id AND user_id = v_user_id AND is_deleted = TRUE;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  ELSIF p_item_type = 'certificate' THEN
    -- Restore to certificates. Restored certificate continues to be protected by certificate PIN
    UPDATE public.certificates
    SET is_deleted = FALSE, deleted_at = NULL, expires_at = NULL, updated_at = NOW()
    WHERE id = p_item_id AND user_id = v_user_id AND is_deleted = TRUE;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  ELSIF p_item_type = 'picture' THEN
    UPDATE public.pictures
    SET is_deleted = FALSE, deleted_at = NULL, expires_at = NULL, updated_at = NOW()
    WHERE id = p_item_id AND user_id = v_user_id AND is_deleted = TRUE;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid item type.');
  END IF;

  IF v_rows_affected = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Item not found in Recycle Bin or ownership verification failed.');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'item_id', p_item_id,
    'item_type', p_item_type,
    'message', 'Item restored to active status in its original section.'
  );
END;
$$;

-- Function 4B: Permanently Delete Single Item
CREATE OR REPLACE FUNCTION public.permanently_delete_recycle_bin_item(p_item_id UUID, p_item_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_storage_path TEXT;
  v_file_name TEXT;
  v_deleted_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_bucket TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Authentication required.');
  END IF;

  IF p_item_type = 'document' THEN
    SELECT storage_path, name, deleted_at, expires_at
      INTO v_storage_path, v_file_name, v_deleted_at, v_expires_at
      FROM public.documents
      WHERE id = p_item_id AND user_id = v_user_id AND is_deleted = TRUE;
    v_bucket := 'documents';

  ELSIF p_item_type = 'certificate' THEN
    SELECT storage_path, name, deleted_at, expires_at
      INTO v_storage_path, v_file_name, v_deleted_at, v_expires_at
      FROM public.certificates
      WHERE id = p_item_id AND user_id = v_user_id AND is_deleted = TRUE;
    v_bucket := 'certificates';

  ELSIF p_item_type = 'picture' THEN
    SELECT storage_path, name, deleted_at, expires_at
      INTO v_storage_path, v_file_name, v_deleted_at, v_expires_at
      FROM public.pictures
      WHERE id = p_item_id AND user_id = v_user_id AND is_deleted = TRUE;
    v_bucket := 'pictures';

  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid item type.');
  END IF;

  IF v_storage_path IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Item not found in Recycle Bin or access denied.');
  END IF;

  -- 1. Remove physical file from private storage
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = v_bucket AND name = v_storage_path;
  EXCEPTION WHEN OTHERS THEN
    -- Continue if storage object removal fails or is already gone
    NULL;
  END;

  -- 2. Remove row from database table
  IF p_item_type = 'document' THEN
    DELETE FROM public.documents WHERE id = p_item_id AND user_id = v_user_id;
  ELSIF p_item_type = 'certificate' THEN
    DELETE FROM public.certificates WHERE id = p_item_id AND user_id = v_user_id;
  ELSIF p_item_type = 'picture' THEN
    DELETE FROM public.pictures WHERE id = p_item_id AND user_id = v_user_id;
  END IF;

  -- 3. Record audit trail in cleanup logs
  INSERT INTO public.recycle_bin_cleanup_logs (
    user_id, item_id, item_type, file_name, storage_bucket,
    storage_path, deleted_at, expired_at, status, details
  ) VALUES (
    v_user_id, p_item_id, p_item_type, v_file_name, v_bucket,
    v_storage_path, COALESCE(v_deleted_at, NOW()), COALESCE(v_expires_at, NOW()),
    'manually_purged', 'Permanently deleted by user from Recycle Bin.'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'item_id', p_item_id,
    'item_type', p_item_type,
    'message', 'Item and physical storage file permanently purged.'
  );
END;
$$;

-- Function 4C: Empty User's Recycle Bin
CREATE OR REPLACE FUNCTION public.empty_student_recycle_bin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rec RECORD;
  v_purged_docs INT := 0;
  v_purged_certs INT := 0;
  v_purged_pics INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Authentication required.');
  END IF;

  -- Process documents
  FOR v_rec IN (SELECT id, storage_path, name, deleted_at, expires_at FROM public.documents WHERE user_id = v_user_id AND is_deleted = TRUE) LOOP
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'documents' AND name = v_rec.storage_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.documents WHERE id = v_rec.id;
    INSERT INTO public.recycle_bin_cleanup_logs (
      user_id, item_id, item_type, file_name, storage_bucket, storage_path, deleted_at, expired_at, status, details
    ) VALUES (
      v_user_id, v_rec.id, 'document', v_rec.name, 'documents', v_rec.storage_path, COALESCE(v_rec.deleted_at, NOW()), COALESCE(v_rec.expires_at, NOW()), 'manually_emptied', 'Purged via Empty Recycle Bin.'
    );
    v_purged_docs := v_purged_docs + 1;
  END LOOP;

  -- Process certificates
  FOR v_rec IN (SELECT id, storage_path, name, deleted_at, expires_at FROM public.certificates WHERE user_id = v_user_id AND is_deleted = TRUE) LOOP
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'certificates' AND name = v_rec.storage_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.certificates WHERE id = v_rec.id;
    INSERT INTO public.recycle_bin_cleanup_logs (
      user_id, item_id, item_type, file_name, storage_bucket, storage_path, deleted_at, expired_at, status, details
    ) VALUES (
      v_user_id, v_rec.id, 'certificate', v_rec.name, 'certificates', v_rec.storage_path, COALESCE(v_rec.deleted_at, NOW()), COALESCE(v_rec.expires_at, NOW()), 'manually_emptied', 'Purged via Empty Recycle Bin.'
    );
    v_purged_certs := v_purged_certs + 1;
  END LOOP;

  -- Process pictures
  FOR v_rec IN (SELECT id, storage_path, name, deleted_at, expires_at FROM public.pictures WHERE user_id = v_user_id AND is_deleted = TRUE) LOOP
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'pictures' AND name = v_rec.storage_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.pictures WHERE id = v_rec.id;
    INSERT INTO public.recycle_bin_cleanup_logs (
      user_id, item_id, item_type, file_name, storage_bucket, storage_path, deleted_at, expired_at, status, details
    ) VALUES (
      v_user_id, v_rec.id, 'picture', v_rec.name, 'pictures', v_rec.storage_path, COALESCE(v_rec.deleted_at, NOW()), COALESCE(v_rec.expires_at, NOW()), 'manually_emptied', 'Purged via Empty Recycle Bin.'
    );
    v_purged_pics := v_purged_pics + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'purged_documents', v_purged_docs,
    'purged_certificates', v_purged_certs,
    'purged_pictures', v_purged_pics,
    'total_purged', v_purged_docs + v_purged_certs + v_purged_pics
  );
END;
$$;

-- Function 4D: Server-Side Automatic 30-Day Cleanup Job
CREATE OR REPLACE FUNCTION public.purge_expired_recycle_bin_items()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_rec RECORD;
  v_docs_purged INT := 0;
  v_certs_purged INT := 0;
  v_pics_purged INT := 0;
  v_now TIMESTAMPTZ := TIMEZONE('utc'::TEXT, NOW());
BEGIN
  -- 1. Expired documents (> 30 days)
  FOR v_rec IN (
    SELECT id, user_id, storage_path, name, deleted_at, expires_at
    FROM public.documents
    WHERE is_deleted = TRUE
      AND (expires_at <= v_now OR (deleted_at IS NOT NULL AND deleted_at <= v_now - INTERVAL '30 days'))
  ) LOOP
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'documents' AND name = v_rec.storage_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.documents WHERE id = v_rec.id;
    INSERT INTO public.recycle_bin_cleanup_logs (
      user_id, item_id, item_type, file_name, storage_bucket, storage_path, deleted_at, expired_at, purged_at, status, details
    ) VALUES (
      v_rec.user_id, v_rec.id, 'document', v_rec.name, 'documents', v_rec.storage_path,
      COALESCE(v_rec.deleted_at, v_now - INTERVAL '30 days'),
      COALESCE(v_rec.expires_at, v_now),
      v_now, 'auto_expired', 'Automatically purged after 30-day retention window.'
    );
    v_docs_purged := v_docs_purged + 1;
  END LOOP;

  -- 2. Expired certificates (> 30 days)
  FOR v_rec IN (
    SELECT id, user_id, storage_path, name, deleted_at, expires_at
    FROM public.certificates
    WHERE is_deleted = TRUE
      AND (expires_at <= v_now OR (deleted_at IS NOT NULL AND deleted_at <= v_now - INTERVAL '30 days'))
  ) LOOP
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'certificates' AND name = v_rec.storage_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.certificates WHERE id = v_rec.id;
    INSERT INTO public.recycle_bin_cleanup_logs (
      user_id, item_id, item_type, file_name, storage_bucket, storage_path, deleted_at, expired_at, purged_at, status, details
    ) VALUES (
      v_rec.user_id, v_rec.id, 'certificate', v_rec.name, 'certificates', v_rec.storage_path,
      COALESCE(v_rec.deleted_at, v_now - INTERVAL '30 days'),
      COALESCE(v_rec.expires_at, v_now),
      v_now, 'auto_expired', 'Automatically purged after 30-day retention window.'
    );
    v_certs_purged := v_certs_purged + 1;
  END LOOP;

  -- 3. Expired pictures (> 30 days)
  FOR v_rec IN (
    SELECT id, user_id, storage_path, name, deleted_at, expires_at
    FROM public.pictures
    WHERE is_deleted = TRUE
      AND (expires_at <= v_now OR (deleted_at IS NOT NULL AND deleted_at <= v_now - INTERVAL '30 days'))
  ) LOOP
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'pictures' AND name = v_rec.storage_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.pictures WHERE id = v_rec.id;
    INSERT INTO public.recycle_bin_cleanup_logs (
      user_id, item_id, item_type, file_name, storage_bucket, storage_path, deleted_at, expired_at, purged_at, status, details
    ) VALUES (
      v_rec.user_id, v_rec.id, 'picture', v_rec.name, 'pictures', v_rec.storage_path,
      COALESCE(v_rec.deleted_at, v_now - INTERVAL '30 days'),
      COALESCE(v_rec.expires_at, v_now),
      v_now, 'auto_expired', 'Automatically purged after 30-day retention window.'
    );
    v_pics_purged := v_pics_purged + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'purged_documents', v_docs_purged,
    'purged_certificates', v_certs_purged,
    'purged_pictures', v_pics_purged,
    'total_purged', v_docs_purged + v_certs_purged + v_pics_purged,
    'executed_at', v_now
  );
END;
$$;

-- ====================================================================
-- 5. SCHEDULED CRON JOB INSTRUCTIONS (pg_cron)
-- ====================================================================
-- If pg_cron is enabled in your Supabase project (Project Settings > Database > Extensions > pg_cron):
-- Run the following query in the SQL Editor to schedule automatic nightly cleanup at 02:00 AM UTC:
--
-- SELECT cron.schedule(
--   'nightly-recycle-bin-cleanup',
--   '0 2 * * *',
--   $$ SELECT public.purge_expired_recycle_bin_items(); $$
-- );
--
-- If pg_cron is not enabled, you can invoke the function via a Supabase Edge Function
-- with a CRON trigger or call the RPC endpoint from an external scheduler like GitHub Actions.


-- ====================================================================
-- PART: 20261003_create_events_and_reminders.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - IMPORTANT DATES & EMAIL REMINDERS MIGRATION
-- Migration Date: 2026-10-03
-- Purpose:
--   1. Create public.events table for tracking academic and personal dates.
--   2. Create public.event_reminders table for multi-interval reminder scheduling.
--   3. Create public.student_reminder_preferences for global notification settings.
--   4. Enable Row Level Security (RLS) on all tables with student isolation.
--   5. Create SECURITY DEFINER RPC functions for concurrency-safe reminder dispatch.
-- ====================================================================

-- 1. IMPORTANT DATES / EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'Exams',
      'Assignments',
      'Project Deadlines',
      'Certificate Renewals',
      'Fees',
      'Birthdays',
      'Personal Events'
    )
  ),
  event_date DATE NOT NULL,
  event_time TIME NOT NULL DEFAULT '09:00:00',
  location TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  email_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

COMMENT ON TABLE public.events IS 'Important student dates, academic deadlines, exams, and milestones.';
COMMENT ON COLUMN public.events.category IS 'Event category: Exams, Assignments, Project Deadlines, Certificate Renewals, Fees, Birthdays, Personal Events';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_completed ON public.events(user_id, is_completed);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own events" ON public.events;
CREATE POLICY "Students can view own events"
  ON public.events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own events" ON public.events;
CREATE POLICY "Students can insert own events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own events" ON public.events;
CREATE POLICY "Students can update own events"
  ON public.events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can delete own events" ON public.events;
CREATE POLICY "Students can delete own events"
  ON public.events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at Trigger for events
DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 2. EVENT REMINDERS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (
    reminder_type IN ('7_days', '3_days', '1_day', 'on_date', 'custom')
  ),
  custom_hours_before INT CHECK (custom_hours_before IS NULL OR custom_hours_before > 0),
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (
    status IN ('Scheduled', 'Sent', 'Failed', 'Cancelled')
  ),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  CONSTRAINT unique_event_reminder_type UNIQUE (event_id, reminder_type)
);

COMMENT ON TABLE public.event_reminders IS 'Scheduled email reminder tasks per event with delivery status tracking.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON public.event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON public.event_reminders(status, remind_at);

-- Enable RLS
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own reminders" ON public.event_reminders;
CREATE POLICY "Students can view own reminders"
  ON public.event_reminders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own reminders" ON public.event_reminders;
CREATE POLICY "Students can insert own reminders"
  ON public.event_reminders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own reminders" ON public.event_reminders;
CREATE POLICY "Students can update own reminders"
  ON public.event_reminders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can delete own reminders" ON public.event_reminders;
CREATE POLICY "Students can delete own reminders"
  ON public.event_reminders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at Trigger for event_reminders
DROP TRIGGER IF EXISTS set_reminders_updated_at ON public.event_reminders;
CREATE TRIGGER set_reminders_updated_at
  BEFORE UPDATE ON public.event_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 3. STUDENT REMINDER PREFERENCES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.student_reminder_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_reminder_types TEXT[] NOT NULL DEFAULT ARRAY['1_day', 'on_date']::TEXT[],
  preferred_timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

COMMENT ON TABLE public.student_reminder_preferences IS 'Global email reminder and timezone preferences for each student.';

ALTER TABLE public.student_reminder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own preferences" ON public.student_reminder_preferences;
CREATE POLICY "Students can view own preferences"
  ON public.student_reminder_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own preferences" ON public.student_reminder_preferences;
CREATE POLICY "Students can insert own preferences"
  ON public.student_reminder_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own preferences" ON public.student_reminder_preferences;
CREATE POLICY "Students can update own preferences"
  ON public.student_reminder_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: When event is marked completed, cancel pending reminders
CREATE OR REPLACE FUNCTION public.sync_event_completion_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
    -- Cancel any scheduled reminders
    UPDATE public.event_reminders
    SET status = 'Cancelled', updated_at = NOW()
    WHERE event_id = NEW.id AND status = 'Scheduled';
  ELSIF NEW.is_completed = FALSE AND OLD.is_completed = TRUE THEN
    -- Re-schedule reminders whose remind_at is still in the future
    UPDATE public.event_reminders
    SET status = 'Scheduled', updated_at = NOW()
    WHERE event_id = NEW.id AND status = 'Cancelled' AND remind_at > NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_completion_reminders ON public.events;
CREATE TRIGGER trg_event_completion_reminders
  AFTER UPDATE OF is_completed ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_completion_reminders();

-- ====================================================================
-- 4. SERVER-SIDE RPC FUNCTIONS (SECURITY DEFINER)
-- ====================================================================

-- Function 4A: Fetch Due Event Reminders (Concurrency-safe with FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.fetch_due_event_reminders(p_limit INT DEFAULT 50)
RETURNS TABLE (
  reminder_id UUID,
  event_id UUID,
  user_id UUID,
  student_email TEXT,
  student_name TEXT,
  event_title TEXT,
  event_description TEXT,
  event_category TEXT,
  event_date DATE,
  event_time TIME,
  event_location TEXT,
  reminder_type TEXT,
  remind_at TIMESTAMPTZ,
  retry_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS reminder_id,
    e.id AS event_id,
    e.user_id,
    u.email::TEXT AS student_email,
    COALESCE(p.full_name, split_part(u.email, '@', 1))::TEXT AS student_name,
    e.title AS event_title,
    e.description AS event_description,
    e.category AS event_category,
    e.event_date,
    e.event_time,
    e.location AS event_location,
    r.reminder_type,
    r.remind_at,
    r.retry_count
  FROM public.event_reminders r
  JOIN public.events e ON e.id = r.event_id
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN public.student_reminder_preferences pref ON pref.user_id = e.user_id
  WHERE r.status = 'Scheduled'
    AND r.remind_at <= TIMEZONE('utc'::TEXT, NOW())
    AND e.is_completed = FALSE
    AND e.email_reminders_enabled = TRUE
    AND (pref.email_notifications_enabled IS NULL OR pref.email_notifications_enabled = TRUE)
  ORDER BY r.remind_at ASC
  LIMIT p_limit
  FOR UPDATE OF r SKIP LOCKED;
END;
$$;

-- Function 4B: Mark Event Reminder Sent
CREATE OR REPLACE FUNCTION public.mark_event_reminder_sent(p_reminder_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.event_reminders
  SET status = 'Sent',
      sent_at = TIMEZONE('utc'::TEXT, NOW()),
      error_message = NULL,
      updated_at = TIMEZONE('utc'::TEXT, NOW())
  WHERE id = p_reminder_id;

  RETURN jsonb_build_object('success', TRUE, 'reminder_id', p_reminder_id);
END;
$$;

-- Function 4C: Mark Event Reminder Failed
CREATE OR REPLACE FUNCTION public.mark_event_reminder_failed(p_reminder_id UUID, p_error TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retry_count INT;
BEGIN
  SELECT retry_count INTO v_retry_count FROM public.event_reminders WHERE id = p_reminder_id;

  -- If failed more than 3 times, mark as permanently Failed, otherwise keep Scheduled with backoff
  IF v_retry_count >= 3 THEN
    UPDATE public.event_reminders
    SET status = 'Failed',
        error_message = p_error,
        retry_count = retry_count + 1,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_reminder_id;
  ELSE
    UPDATE public.event_reminders
    SET status = 'Scheduled',
        error_message = p_error,
        retry_count = retry_count + 1,
        remind_at = NOW() + INTERVAL '10 minutes', -- Retry after 10 minutes
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_reminder_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'reminder_id', p_reminder_id);
END;
$$;

-- Function 4D: Schedule Reminders for an Event
CREATE OR REPLACE FUNCTION public.schedule_event_reminders(
  p_event_id UUID,
  p_reminder_types TEXT[],
  p_custom_hours INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event RECORD;
  v_type TEXT;
  v_event_ts TIMESTAMPTZ;
  v_remind_ts TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Authentication required.');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found or access denied.');
  END IF;

  -- Calculate event combined timestamp in UTC
  -- Assuming event_date and event_time represent local wall clock at event timezone
  v_event_ts := (v_event.event_date || ' ' || v_event.event_time)::TIMESTAMP AT TIME ZONE v_event.timezone;

  -- Delete existing scheduled reminders for this event that are not in the new list
  DELETE FROM public.event_reminders
  WHERE event_id = p_event_id
    AND status = 'Scheduled'
    AND reminder_type != ALL(p_reminder_types);

  -- Insert or update reminders
  FOREACH v_type IN ARRAY p_reminder_types LOOP
    IF v_type = '7_days' THEN
      v_remind_ts := v_event_ts - INTERVAL '7 days';
    ELSIF v_type = '3_days' THEN
      v_remind_ts := v_event_ts - INTERVAL '3 days';
    ELSIF v_type = '1_day' THEN
      v_remind_ts := v_event_ts - INTERVAL '1 day';
    ELSIF v_type = 'on_date' THEN
      -- On the event date at 08:00 AM in the event timezone
      v_remind_ts := (v_event.event_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE v_event.timezone;
    ELSIF v_type = 'custom' AND p_custom_hours IS NOT NULL THEN
      v_remind_ts := v_event_ts - (p_custom_hours || ' hours')::INTERVAL;
    ELSE
      CONTINUE;
    END IF;

    -- Upsert reminder
    INSERT INTO public.event_reminders (
      event_id, user_id, reminder_type, custom_hours_before, remind_at, status
    ) VALUES (
      p_event_id, v_user_id, v_type,
      CASE WHEN v_type = 'custom' THEN p_custom_hours ELSE NULL END,
      v_remind_ts,
      'Scheduled'
    )
    ON CONFLICT (event_id, reminder_type) DO UPDATE SET
      remind_at = EXCLUDED.remind_at,
      custom_hours_before = EXCLUDED.custom_hours_before,
      status = CASE WHEN event_reminders.status = 'Sent' THEN 'Sent' ELSE 'Scheduled' END,
      updated_at = NOW();
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'event_id', p_event_id);
END;
$$;


-- ====================================================================
-- PART: 20261003_admin_dashboard_and_security.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - STEP 8: SECURE ADMIN DASHBOARD & RBAC MIGRATION
-- Migration Date: 2026-10-03
-- Purpose:
--   1. Add account status (active/disabled) and tracking to profiles.
--   2. Create public.admin_audit_logs for audit logging.
--   3. Server-side role verification: public.is_admin() & public.is_account_active().
--   4. Server-enforced account suspension on vault assets.
--   5. Secure administrative RPCs for real statistics, paginated student management,
--      and account status toggling.
--   6. Server-side initial administrator bootstrap for ksuryatejareddy0309@gmail.com.
-- ====================================================================

-- 1. Add account status columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

COMMENT ON COLUMN public.profiles.status IS 'Account status: active or disabled. Server-enforced.';
COMMENT ON COLUMN public.profiles.disabled_at IS 'Timestamp when the student account was disabled by an administrator.';
COMMENT ON COLUMN public.profiles.disabled_reason IS 'Administrative explanation for account suspension.';

-- 2. Create the Administrative Audit Logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_email TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

COMMENT ON TABLE public.admin_audit_logs IS 'Immutable audit logs for administrative oversight actions.';

-- Index for performant querying of audit logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);

-- 3. Server-side helper functions for RBAC and Account Status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_account_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$;

-- 4. Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 5. Update profiles RLS: Allow Admins to View Profiles for Administrative Directory
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- 6. Enforce Account Suspension across Vault Assets (Server-Side)
-- If account status is 'disabled', student is blocked from accessing documents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Active users access own documents" ON public.documents;
    CREATE POLICY "Active users access own documents"
      ON public.documents
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id AND public.is_account_active())
      WITH CHECK (auth.uid() = user_id AND public.is_account_active());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificates' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Active users access own certificates" ON public.certificates;
    CREATE POLICY "Active users access own certificates"
      ON public.certificates
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id AND public.is_account_active())
      WITH CHECK (auth.uid() = user_id AND public.is_account_active());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pictures' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Active users access own pictures" ON public.pictures;
    CREATE POLICY "Active users access own pictures"
      ON public.pictures
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id AND public.is_account_active())
      WITH CHECK (auth.uid() = user_id AND public.is_account_active());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Active users access own events" ON public.events;
    CREATE POLICY "Active users access own events"
      ON public.events
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id AND public.is_account_active())
      WITH CHECK (auth.uid() = user_id AND public.is_account_active());
  END IF;
END $$;

-- 7. Update handle_new_user() trigger for secure initial admin bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_college_name TEXT;
  v_is_demo BOOLEAN;
  v_role TEXT := 'student';
BEGIN
  -- Check if user matches the designated administrator email
  IF LOWER(new.email) = 'ksuryatejareddy0309@gmail.com' THEN
    v_role := 'admin';
  END IF;

  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Student User');
  v_phone := new.raw_user_meta_data->>'phone';
  v_college_name := new.raw_user_meta_data->>'college_name';
  v_is_demo := COALESCE((new.raw_user_meta_data->>'is_demo')::BOOLEAN, FALSE);

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    college_name,
    role,
    status,
    is_demo,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    v_full_name,
    new.email,
    v_phone,
    v_college_name,
    v_role,
    'active',
    v_is_demo,
    TIMEZONE('utc'::TEXT, NOW()),
    TIMEZONE('utc'::TEXT, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    college_name = EXCLUDED.college_name,
    updated_at = TIMEZONE('utc'::TEXT, NOW());

  RETURN NEW;
END;
$$;

-- 8. Assign Initial Admin Procedure (Safe Bootstrap)
CREATE OR REPLACE FUNCTION public.assign_initial_admin(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Elevate role to admin for the specified authorized email
  UPDATE public.profiles
  SET role = 'admin', updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'updated_profiles', v_count,
    'admin_email', p_email
  );
END;
$$;

-- Execute initial promotion if ksuryatejareddy0309@gmail.com already exists in the profiles table
DO $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin', updated_at = NOW()
  WHERE LOWER(email) = 'ksuryatejareddy0309@gmail.com';
END $$;

-- 9. Administrative RPC: Get Dashboard Statistics (Real Database Data)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_students INT := 0;
  v_total_verified INT := 0;
  v_new_today INT := 0;
  v_new_this_week INT := 0;
  v_new_this_month INT := 0;
  v_active_accounts INT := 0;
  v_disabled_accounts INT := 0;
  v_daily_trends JSONB;
  v_recent_signups JSONB;
BEGIN
  -- Strict Server-Side Authorization Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator role required.';
  END IF;

  -- 1. Total student count (excluding admin users)
  SELECT COUNT(*) INTO v_total_students
  FROM public.profiles
  WHERE role = 'student';

  -- 2. Total verified accounts (joined with auth.users)
  SELECT COUNT(*) INTO v_total_verified
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.role = 'student' AND u.email_confirmed_at IS NOT NULL;

  -- 3. New registrations today (UTC)
  SELECT COUNT(*) INTO v_new_today
  FROM public.profiles
  WHERE role = 'student' AND created_at >= TIMEZONE('utc'::TEXT, CURRENT_DATE);

  -- 4. New registrations this week (last 7 days)
  SELECT COUNT(*) INTO v_new_this_week
  FROM public.profiles
  WHERE role = 'student' AND created_at >= TIMEZONE('utc'::TEXT, NOW() - INTERVAL '7 days');

  -- 5. New registrations this month (last 30 days)
  SELECT COUNT(*) INTO v_new_this_month
  FROM public.profiles
  WHERE role = 'student' AND created_at >= TIMEZONE('utc'::TEXT, NOW() - INTERVAL '30 days');

  -- 6. Active vs. Disabled accounts
  SELECT COUNT(*) INTO v_active_accounts
  FROM public.profiles
  WHERE role = 'student' AND status = 'active';

  SELECT COUNT(*) INTO v_disabled_accounts
  FROM public.profiles
  WHERE role = 'student' AND status = 'disabled';

  -- 7. Daily registration trends (last 14 days)
  SELECT COALESCE(jsonb_agg(d.trend_item), '[]'::jsonb)
  INTO v_daily_trends
  FROM (
    SELECT jsonb_build_object(
      'date', to_char(calendar_day, 'YYYY-MM-DD'),
      'label', to_char(calendar_day, 'Mon DD'),
      'count', COUNT(p.id)
    ) AS trend_item
    FROM generate_series(
      CURRENT_DATE - INTERVAL '13 days',
      CURRENT_DATE,
      '1 day'::interval
    ) AS calendar_day
    LEFT JOIN public.profiles p
      ON p.role = 'student'
      AND date_trunc('day', p.created_at) = calendar_day
    GROUP BY calendar_day
    ORDER BY calendar_day ASC
  ) d;

  -- 8. 5 Most recent student signups
  SELECT COALESCE(jsonb_agg(s.signup_item), '[]'::jsonb)
  INTO v_recent_signups
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'college_name', p.college_name,
      'created_at', p.created_at,
      'is_verified', (u.email_confirmed_at IS NOT NULL),
      'status', p.status
    ) AS signup_item
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE p.role = 'student'
    ORDER BY p.created_at DESC
    LIMIT 5
  ) s;

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'total_verified', v_total_verified,
    'new_today', v_new_today,
    'new_this_week', v_new_this_week,
    'new_this_month', v_new_this_month,
    'active_accounts', v_active_accounts,
    'disabled_accounts', v_disabled_accounts,
    'daily_trends', v_daily_trends,
    'recent_signups', v_recent_signups,
    'generated_at', NOW()
  );
END;
$$;

-- 10. Administrative RPC: Search, Filter, Sort & Paginate Registered Students
CREATE OR REPLACE FUNCTION public.get_registered_students(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'All',
  p_verified TEXT DEFAULT 'All',
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count INT := 0;
  v_students JSONB;
BEGIN
  -- Strict Server-Side Authorization Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator role required.';
  END IF;

  -- Count total matching records
  SELECT COUNT(*) INTO v_total_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE p.role = 'student'
    AND (
      p_search IS NULL OR p_search = '' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      p.college_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_status = 'All' OR p.status = LOWER(p_status)
    )
    AND (
      p_verified = 'All' OR
      (p_verified = 'Verified' AND u.email_confirmed_at IS NOT NULL) OR
      (p_verified = 'Unverified' AND u.email_confirmed_at IS NULL)
    )
    AND (p_date_from IS NULL OR p.created_at >= p_date_from)
    AND (p_date_to IS NULL OR p.created_at <= p_date_to);

  -- Fetch paginated slice with minimal administrative attributes
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_students
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'college_name', p.college_name,
      'student_id', p.student_id,
      'created_at', p.created_at,
      'is_verified', (u.email_confirmed_at IS NOT NULL),
      'status', p.status,
      'disabled_at', p.disabled_at,
      'disabled_reason', p.disabled_reason
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE p.role = 'student'
      AND (
        p_search IS NULL OR p_search = '' OR
        p.full_name ILIKE '%' || p_search || '%' OR
        p.email ILIKE '%' || p_search || '%' OR
        p.college_name ILIKE '%' || p_search || '%'
      )
      AND (
        p_status = 'All' OR p.status = LOWER(p_status)
      )
      AND (
        p_verified = 'All' OR
        (p_verified = 'Verified' AND u.email_confirmed_at IS NOT NULL) OR
        (p_verified = 'Unverified' AND u.email_confirmed_at IS NULL)
      )
      AND (p_date_from IS NULL OR p.created_at >= p_date_from)
      AND (p_date_to IS NULL OR p.created_at <= p_date_to)
    ORDER BY
      CASE WHEN p_sort_by = 'full_name' AND p_sort_dir = 'asc' THEN p.full_name END ASC,
      CASE WHEN p_sort_by = 'full_name' AND p_sort_dir = 'desc' THEN p.full_name END DESC,
      CASE WHEN p_sort_by = 'email' AND p_sort_dir = 'asc' THEN p.email END ASC,
      CASE WHEN p_sort_by = 'email' AND p_sort_dir = 'desc' THEN p.email END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc' THEN p.created_at END ASC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN p.created_at END DESC,
      p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) s;

  RETURN jsonb_build_object(
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset,
    'students', v_students
  );
END;
$$;

-- 11. Administrative RPC: Toggle Student Account Status (Disable / Enable)
CREATE OR REPLACE FUNCTION public.toggle_student_account_status(
  p_student_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
  v_target_email TEXT;
  v_old_status TEXT;
BEGIN
  -- Strict Server-Side Authorization Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator role required.';
  END IF;

  -- Prevent admin from disabling themselves
  IF p_student_id = auth.uid() THEN
    RAISE EXCEPTION 'Security Policy: Administrators cannot disable their own account.';
  END IF;

  -- Validate status value
  IF p_status NOT IN ('active', 'disabled') THEN
    RAISE EXCEPTION 'Invalid status value. Must be "active" or "disabled".';
  END IF;

  -- Fetch admin email and student current status
  SELECT email INTO v_admin_email FROM public.profiles WHERE id = auth.uid();
  SELECT email, status INTO v_target_email, v_old_status FROM public.profiles WHERE id = p_student_id;

  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Student account not found with ID %.', p_student_id;
  END IF;

  -- Update target student profile
  UPDATE public.profiles
  SET
    status = p_status,
    disabled_at = CASE WHEN p_status = 'disabled' THEN TIMEZONE('utc'::TEXT, NOW()) ELSE NULL END,
    disabled_reason = CASE WHEN p_status = 'disabled' THEN COALESCE(p_reason, 'Administrative suspension') ELSE NULL END,
    updated_at = TIMEZONE('utc'::TEXT, NOW())
  WHERE id = p_student_id;

  -- Record audit log
  INSERT INTO public.admin_audit_logs (
    admin_id,
    admin_email,
    target_user_id,
    target_user_email,
    action,
    reason,
    details
  )
  VALUES (
    auth.uid(),
    v_admin_email,
    p_student_id,
    v_target_email,
    CASE WHEN p_status = 'disabled' THEN 'disable_account' ELSE 'enable_account' END,
    p_reason,
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', p_status,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'student_id', p_student_id,
    'email', v_target_email,
    'new_status', p_status
  );
END;
$$;

-- 12. Administrative RPC: Get Audit Logs
CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logs JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator role required.';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_logs
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'admin_id', admin_id,
      'admin_email', admin_email,
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'action', action,
      'reason', reason,
      'details', details,
      'created_at', created_at
    ) AS row_data
    FROM public.admin_audit_logs
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) l;

  RETURN jsonb_build_object(
    'logs', v_logs
  );
END;
$$;


-- ====================================================================
-- PART: 20261003_create_demo_student.sql
-- ====================================================================

-- ====================================================================
-- STUDENT SAFE VAULT - DEMO STUDENT ACCOUNT PROVISIONING
-- Purpose:
--   1. Create the official Demo Student in Supabase Auth (auth.users).
--   2. Configure pre-confirmed email (email_confirmed_at = NOW()).
--   3. Create the corresponding identity record in auth.identities.
--   4. Provision the student profile in public.profiles.
--   5. Idempotent: Skips if account already exists.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_demo_email TEXT := 'demo.student@studentsafevault.demo';
  v_demo_password TEXT := 'Demo@12345';
  v_user_id UUID;
BEGIN
  -- 1. Check if demo user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_demo_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_demo_email,
      crypt(v_demo_password, gen_salt('bf', 10)),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'full_name', 'Demo Student',
        'college_name', 'Demonstration Institute of Technology',
        'is_demo', true
      ),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_demo_email),
      'email',
      v_demo_email,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Demo user successfully created in auth.users with ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'Demo user % already exists with ID: %', v_demo_email, v_user_id;
  END IF;

  -- 2. Provision or verify profile in public.profiles (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      phone,
      college_name,
      role,
      status,
      is_demo,
      student_id,
      course_degree,
      current_year
    ) VALUES (
      v_user_id,
      'Demo Student',
      v_demo_email,
      '+1 555-019-9000',
      'Demonstration Institute of Technology',
      'student',
      'active',
      TRUE,
      'STU-DEMO-2026',
      'B.Sc. Computer Science',
      '3rd Year'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      college_name = EXCLUDED.college_name,
      is_demo = TRUE,
      status = 'active';

    RAISE NOTICE 'Demo student profile updated in public.profiles for ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'Note: public.profiles table does not exist yet. Profile will be automatically linked upon first login.';
  END IF;

END $$;

