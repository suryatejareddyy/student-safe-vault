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
