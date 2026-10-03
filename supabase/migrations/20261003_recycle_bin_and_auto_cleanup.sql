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
