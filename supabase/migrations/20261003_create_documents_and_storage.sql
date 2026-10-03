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
