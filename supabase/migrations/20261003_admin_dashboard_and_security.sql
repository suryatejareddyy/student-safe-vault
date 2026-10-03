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
