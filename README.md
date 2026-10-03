# Student Safe Vault - Student Digital Locker

A modern, responsive digital locker website engineered for students, built with a premium navy-blue, royal-blue, and white theme.

## 🛡️ Functional Architecture

### 1. Student Dashboard
- **Welcome Banner**: Displays personalized greeting `"Welcome back, [Student Name]!"`, profile picture/avatar, roll number, and storage quota meter (`1.8 GB / 5.0 GB Used`).
- **Real Metric Cards**:
  - Total Documents
  - Pictures
  - Protected Certificates
  - Upcoming Deadlines
  - Recycle Bin (30-day buffer)
- **Recently Uploaded Documents & Upcoming Reminders**:
  - Live document actions (Preview, Download, Delete to Recycle Bin).
  - Urgency indicators for upcoming examination deadlines and fee payments.
- **Five Quick-Action Buttons**:
  1. **Upload Document**: Opens client-encrypted document upload dialog.
  2. **Add Personal Information**: Navigates to the Personal Information editor.
  3. **Upload Picture**: Opens student picture gallery and upload tool.
  4. **Secure Certificate**: Digitally seals degrees and certificates with cryptographic SHA-256 hashes.
  5. **Add Important Date**: Adds deadline reminders with category and due date tracking.
- **Responsive Navigation Sidebar**:
  - Dashboard
  - Personal Information
  - My Documents
  - Secure Certificates
  - Pictures
  - Important Dates
  - Recycle Bin
  - Help
  - Logout (with session clearance)

---

### 2. My Personal Information
Dedicated profile management organized into two distinct sections:

- **Section A: Personal Details**:
  - Full Legal Name (required)
  - Student ID / Roll Number
  - Date of Birth (validated: past dates only, future dates blocked)
  - Automatically Calculated Age (accounts for whether the student's birthday has occurred in the current calendar year)
  - Gender (optional)
  - Registered Student Email (linked to verified account)
  - Phone Number (validated format)
  - House Number & Street Address
  - City, State, Postal / ZIP Code, Country
  - Emergency Contact details
- **Section B: College & Academic Details**:
  - College / University Name
  - College Campus Address
  - Course or Degree Program (e.g. B.Tech Computer Science & AI)
  - Department or Branch (e.g. Department of Informatics)
  - Current Year of Study (Freshman, Sophomore, Junior, Senior, Postgraduate)
  - Current Semester (Semesters 1 through 8)
  - Admission / Enrollment Number
  - Expected Graduation Year
  - Campus Academic Email
- **Profile Picture (Avatar) Management**:
  - Upload photo in JPG, JPEG, or PNG format.
  - Strict 5 MB maximum file size limit validation.
  - Private Supabase Storage bucket (`avatars`) with user-scoped RLS policies.
  - Replace or remove existing photo anytime.
- **Data Persistence**:
  - View vs. Edit mode toggle.
  - Cancel reverts unsaved changes without altering persisted data.
  - Persists directly to Supabase `public.profiles` table and preserves data on page refresh.

---

### 3. My Documents Section
A fully functional, encrypted digital storage vault for student documents:
- **7 Prescribed Categories**:
  - `Identity Documents` (Passports, National IDs, Driver's Licenses)
  - `Academic Certificates` (Degrees, Diplomas)
  - `Marksheets` (Grade sheets, Transcripts)
  - `College Documents` (Bonafide, ID cards, Fee receipts)
  - `Applications and Forms` (Scholarship forms, Internship letters)
  - `Personal Documents` (Medical, Resumes, Recommendations)
  - `Other` (General student files)
- **File Upload & Constraints**:
  - Drag-and-drop zone and click-to-browse file selector.
  - Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG.
  - Strict 5 MB (5,242,880 bytes) size limit enforced on both client and database level.
  - Filename sanitization (`replace(/[^a-zA-Z0-9._-]/g, '_')`) and isolated storage paths (`documents/{user_id}/{timestamp}_{filename}`).
- **Preview & Download**:
  - Secure short-lived signed URLs (never public URLs) for previewing PDFs and images in modal.
  - Blob-based authenticated download preserving the original human-readable filename.
- **Organization & Search**:
  - Search by file name.
  - Filter pills for all 7 categories with real-time count badges.
  - Sorting: Newest, Oldest, Name (A-Z), File Size (Largest).
  - Grid view & List view display toggle.
  - Rename document and change category dialogs.
- **Recycle Bin Integration**:
  - Soft deletion (`is_deleted = true`, `deleted_at = NOW()`).
  - 30-day buffer countdown indicator.
  - Restore documents back to the active vault.
  - Permanent deletion and "Empty Recycle Bin" options.
  - Dynamic badge counters on the sidebar and dashboard metric cards.

---

### 4. Secure Certificates (PIN-Protected Sovereign Vault)
- **Extra Protected Area**: Accessible via sidebar under "Secure Certificates".
- **6-Digit PIN Security**:
  - Double-entry validation on setup.
  - Rejects weak PINs (repetitive digits, consecutive sequences).
  - Salted hash stored server-side via PostgreSQL `pgcrypto` (`crypt(pin, gen_salt('bf', 10))`).
  - Server-side verification via `SECURITY DEFINER` RPC (`public.verify_certificate_pin`).
  - Rate limiting & lockout: 5 consecutive failures triggers a 15-minute lockout.
  - Auto-lock after 5 minutes of inactivity (`useIdleTimer` tracking).
  - Immediate lock on logout or session change with complete sensitive state wipe.
- **PIN Recovery Process**:
  - Authenticated student can generate a one-time 6-digit recovery code (`public.request_pin_recovery_code`).
  - Single-use, 15-minute expiration, rate-limited attempts.
  - Reset PIN with recovery code (`public.verify_and_reset_pin`).
- **File Management**:
  - Formats: PDF, JPG, JPEG, PNG up to 5 MB per certificate.
  - 7 Prescribed Categories: Academic Certificates, Marksheets, Transfer Certificate, Identity Certificates, Income Certificate, Caste Certificate, Other Certificates.
  - Actions: Upload, Signed Preview (60s), Download, Rename, Change Category, Move to Recycle Bin.
  - Private Supabase Storage bucket `certificates` with path-based RLS (`certificates/{user_id}/*`).

---

### 5. Pictures & Photo Gallery
- **Private Photo Gallery**: Dedicated gallery accessible via sidebar.
- **6 Organized Albums**:
  - `Personal`
  - `College Events`
  - `ID Photos`
  - `Academic`
  - `Memories`
  - `Other`
- **Upload & Storage**:
  - Multiple image upload with per-file progress indicators.
  - Formats: JPG, JPEG, PNG up to 5 MB per image.
  - Private Supabase Storage bucket `pictures` with RLS (`pictures/{user_id}/*`).
- **Gallery Features**:
  - Thumbnail grid with filename, album tag, size, and date.
  - **Full-Screen Lightbox Modal**: High-resolution image preview with interactive Next (`>`) and Previous (`<`) navigation controls and keyboard arrow support.
  - Direct download preserving original filename.
  - Rename picture, change album, and move to Recycle Bin.

---

### 6. Unified Recycle Bin (30-Day Recovery Buffer)
- **Dedicated Recycle Bin Page (`src/views/RecycleBinView.tsx`)**:
  - Gathers soft-deleted items across Documents, Certificates, and Pictures in one unified interface.
  - Heading: "Recycle Bin" with total count and "Empty Recycle Bin" action.
  - Search bar: Instant keyword filtering across file names and categories/albums.
  - Filter tabs: "All Items", "Documents", "Secure Certificates", "Pictures" with dynamic counts.
  - Sorting: Deletion Date (Newest/Oldest), Expiring Soonest, File Name (A-Z / Z-A).
  - Layout switcher: Responsive List View and Card Grid View.
- **30-Day Retention & Expiry Countdown**:
  - Displays original file name, item type badge, original category or album, file size, deletion date, and exact auto-purge expiry date.
  - Live countdown badge: Highlights files with `≤ 7 days` remaining in warning red/amber.
- **Dashboard Proactive Warning Banner**:
  - Prominently warns students when deleted items have `≤ 7 days` remaining before automatic erasure.
- **Sovereign Restoration**:
  - Restoring a document returns it to My Documents in its original category.
  - Restoring a certificate returns it to Secure Certificates (where it strictly remains PIN-protected and requires 6-digit PIN entry to unlock).
  - Restoring a picture returns it to Pictures under its original album.
- **Permanent Deletion & Safety**:
  - Irreversible single-item purge with warning modal: Removes the physical file from private Supabase Storage and deletes the database record.
  - Empty Recycle Bin modal: Purges all soft-deleted items belonging exclusively to the authenticated student.
  - In-flight action tracking: Disables buttons and shows spinners to prevent repeated clicks.

---

### 7. Important Dates & Real Email Reminders (Step 7)
- **Interactive Calendar & Event Management (`src/views/ImportantDatesView.tsx`)**:
  - Event CRUD: Title, description, category, date, time, optional location, and timezone.
  - 7 Prescribed Academic Categories: `Exams`, `Assignments`, `Project Deadlines`, `Certificate Renewals`, `Fees`, `Birthdays`, `Personal Events`.
  - **Two Interactive Display Views**:
    - **Month Calendar Grid**: Interactive grid with day numbers, event dots color-coded by category, day selection popover, and month navigation.
    - **List & Card View**: Detailed event cards with countdown status badges (*Due Today*, *Upcoming*, *Completed*), location pills, and inline actions.
  - Completion toggle (`is_completed`): Automatically marks events completed, strikethrough styling, and cancels pending email alerts.
  - Search & filtering: Real-time search across title/description/location, category filters with count badges, and sorting (Soonest First, Latest First, Title A-Z).
- **Multi-Interval Email Reminders**:
  - Checkboxes for standard reminder intervals per event:
    - 7 days before (`7_days`)
    - 3 days before (`3_days`)
    - 1 day before (`1_day`)
    - On the event date (`on_date`)
    - Custom reminder time (`custom`)
  - Unique database constraint `(event_id, reminder_type)` prevents duplicate alerts.
  - Student Reminder Preferences modal: Global toggle (`email_reminders_enabled`) and timezone selector.
- **Real Email Delivery via Supabase Edge Function (`supabase/functions/send-event-reminders/index.ts`)**:
  - Edge Function querying due reminders with row-locking (`FOR UPDATE SKIP LOCKED`) to prevent race conditions.
  - Dispatches branded HTML emails using the **Resend API**.
  - Delivery status lifecycle: `Scheduled` -> `Sent` / `Failed` with error messages and retry attempts tracked.
  - **Zero frontend secrets**: Resend API key and service-role keys are strictly server-side environment variables in the Edge Function runtime.
- **Dashboard Integration**:
  - Upcoming Reminders card showing events due today, upcoming exams/deadlines, next scheduled email reminder timestamp, and quick-link to the full calendar.

---

### 8. Secure Admin Dashboard & Server-Side RBAC (Step 8)
- **Role-Based Access Control (RBAC)**:
  - Database function `public.is_admin()` verifies that `auth.uid()` possesses `role = 'admin'` and `status = 'active'`.
  - Non-admin student users attempting to access admin RPC functions are blocked directly by PostgreSQL exceptions (`RAISE EXCEPTION 'Access Denied: Administrator role required.'`).
  - Frontend route guard redirects non-admin users to their student dashboard with an alert notification banner.
- **Initial Administrator Provisioning**:
  - Secure bootstrap: designated administrator email `ksuryatejareddy0309@gmail.com` is configured in `supabase/migrations/20261003_admin_dashboard_and_security.sql` and `public.handle_new_user()` trigger.
  - Can also be explicitly elevated via SQL Editor:
    ```sql
    SELECT public.assign_initial_admin('ksuryatejareddy0309@gmail.com');
    ```
  - Students cannot self-elevate roles; client-side role updates are rejected by database RLS and triggers.
- **Real Database Statistics & Registration Analytics (`public.get_admin_dashboard_stats`)**:
  - Total registered students (excluding administrators).
  - Total verified accounts with percentage match.
  - New registrations today, this week (last 7 days), and this month (last 30 days).
  - Active vs. Disabled account counts.
  - Interactive SVG Bar Chart for 14-day daily registration trends with hover tooltips.
  - Interactive Doughnut Chart showing Verified vs. Pending email confirmation distribution.
  - Recent sign-up activity stream.
- **Registered Students Management Table (`public.get_registered_students`)**:
  - Searchable by student full name, email, or institution.
  - Filterable by Account Status (`All`, `Active`, `Disabled`), Email Verification (`All`, `Verified`, `Unverified`), and Registration Date.
  - Sortable by Student Name, Email, or Creation Date.
  - Server-side pagination (`limit`, `offset`, total count).
  - Data minimization: Only administrative metadata is exposed (no file paths, locker assets, or security PINs).
- **Server-Enforced Account Status Management (`public.toggle_student_account_status`)**:
  - Authorized administrators can suspend (`disabled`) or reactivate (`active`) student accounts.
  - Confirmation dialog modal prompts for an administrative explanation before toggling status.
  - When an account is disabled, server-side RLS policies immediately block access to documents, certificates, pictures, and events.
  - Client-side sessions are automatically terminated upon detection of suspended status.
  - Administrators cannot disable their own account.
- **Administrative Security Audit Trail (`public.admin_audit_logs`)**:
  - Records timestamp, administrator email, target student email, action taken (`disable_account` / `enable_account`), and explanation.
  - Viewable in the dedicated "Security Audit Trail" tab.
- **Strict Privacy by Design**:
  - Administrators have zero access to students' private files, certificates, pictures, or PIN hashes.

---

### 9. Database Schema & Storage Migrations
1. [`supabase/migrations/20261003_init_auth_and_profiles.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_init_auth_and_profiles.sql): Base auth, trigger, and profiles RLS.
2. [`supabase/migrations/20261003_add_personal_info_and_storage.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_add_personal_info_and_storage.sql): Personal/academic columns and private `avatars` bucket.
3. [`supabase/migrations/20261003_create_documents_and_storage.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_create_documents_and_storage.sql): Documents table and private `documents` bucket.
4. [`supabase/migrations/20261003_create_certificates_and_pins.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_create_certificates_and_pins.sql): `pgcrypto` salted PIN hashes, lockout RPC functions, recovery code functions, `certificates` table, and private `certificates` bucket.
5. [`supabase/migrations/20261003_create_pictures_and_storage.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_create_pictures_and_storage.sql): Pictures table, album constraints, and private `pictures` bucket.
6. [`supabase/migrations/20261003_recycle_bin_and_auto_cleanup.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_recycle_bin_and_auto_cleanup.sql):
   - Adds `expires_at` column and automatic 30-day synchronization triggers.
   - Creates `public.recycle_bin_cleanup_logs` audit trail table with RLS.
   - Creates `public.recycle_bin_items` unified database view.
   - Server-side `SECURITY DEFINER` RPC functions for purge, delete, empty, and restore.
7. [`supabase/migrations/20261003_create_events_and_reminders.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_create_events_and_reminders.sql):
   - Creates `public.events`, `public.event_reminders`, and `public.student_reminder_preferences`.
   - Enables Row Level Security (RLS) on all 3 tables with student isolation (`auth.uid() = user_id`).
   - Trigger `sync_event_completion_reminders` cancels/restores reminders on event completion toggle.
   - Concurrency-safe RPC `fetch_due_event_reminders()` with `FOR UPDATE SKIP LOCKED`.
   - RPCs `mark_event_reminder_sent()` and `mark_event_reminder_failed()` for audit logs.
8. [`supabase/migrations/20261003_admin_dashboard_and_security.sql`](file:///c:/Users/hp/Desktop/Buildion/supabase/migrations/20261003_admin_dashboard_and_security.sql):
   - Adds `status`, `disabled_at`, `disabled_reason` to `public.profiles`.
   - Creates `public.admin_audit_logs` table with admin-only RLS.
   - Role verification functions `public.is_admin()` and `public.is_account_active()`.
   - Server-enforced account suspension on `documents`, `certificates`, `pictures`, and `events`.
   - Secure RPCs `get_admin_dashboard_stats()`, `get_registered_students()`, `toggle_student_account_status()`, `get_admin_audit_logs()`, and `assign_initial_admin()`.

---

### 10. Real Email Reminder Worker Configuration (Resend + Edge Function)
To enable real email dispatch for scheduled reminders:

#### A. Set Edge Function Secrets
In your Supabase CLI or project dashboard (Project Settings > Edge Functions > Secrets):
```bash
supabase secrets set RESEND_API_KEY="re_123456789_abcdefg"
supabase secrets set SENDER_EMAIL="Student Safe Vault <reminders@yourverifieddomain.com>"
```
*(Never expose `RESEND_API_KEY` in frontend `.env` files.)*

#### B. Deploy Edge Function
```bash
supabase functions deploy send-event-reminders --no-verify-jwt
```

#### C. Schedule Edge Function via `pg_cron` (Every 15 minutes)
In the Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'dispatch-event-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <service-role-key>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

### 11. Automated 30-Day Recycle Bin Scheduling (`pg_cron`)
```sql
SELECT cron.schedule(
  'nightly-recycle-bin-cleanup',
  '0 2 * * *',
  $$ SELECT public.purge_expired_recycle_bin_items(); $$
);
```

---

### 12. Storage Security Policies
Private storage buckets (`avatars`, `documents`, `certificates`, `pictures`) enforce strict owner isolation:
- `bucket_id = '<bucket_name>' AND (storage.foldername(name))[1] = auth.uid()::text`

Direct public access is blocked. Files can only be retrieved via short-lived authenticated signed URLs.

---

## 🚀 Running the Project

### Development Server
```bash
cmd.exe /c "npm run dev"
```

### Production Build
```bash
cmd.exe /c "npm run build"
```
Output is located in `dist/`.

### Run Automated Security, Retention, Reminders & Admin RBAC Tests
```bash
cmd.exe /c "node test_vault_security.mjs"
cmd.exe /c "node test_recycle_bin.mjs"
cmd.exe /c "node C:\Users\hp\.gemini\antigravity\brain\de8ea1f3-2b5a-4a35-9e29-087ec52a4c32\scratch\test_important_dates.mjs"
cmd.exe /c "node C:\Users\hp\.gemini\antigravity\brain\de8ea1f3-2b5a-4a35-9e29-087ec52a4c32\scratch\test_admin_security.mjs"
```
