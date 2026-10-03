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
