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
