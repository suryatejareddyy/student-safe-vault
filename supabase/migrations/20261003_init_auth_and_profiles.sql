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
