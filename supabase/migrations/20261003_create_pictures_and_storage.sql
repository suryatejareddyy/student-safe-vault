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
