// ====================================================================
// SUPABASE EDGE FUNCTION: send-event-reminders
// Purpose: Check due event reminders and dispatch branded emails via Resend.
// Triggered by: Supabase Cron, pg_cron, or external HTTP webhook.
// ====================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DueReminder {
  reminder_id: string;
  event_id: string;
  user_id: string;
  student_email: string;
  student_name: string;
  event_title: string;
  event_description: string | null;
  event_category: string;
  event_date: string;
  event_time: string;
  event_location: string | null;
  reminder_type: string;
  remind_at: string;
  retry_count: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const senderEmail = Deno.env.get('SENDER_EMAIL') || 'Student Safe Vault <onboarding@resend.dev>';
  const appUrl = Deno.env.get('APP_URL') || 'https://studentsafevault.edu';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase credentials missing in Edge Function environment.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({
        warning: 'RESEND_API_KEY is not configured yet in Supabase Secrets.',
        configured: false,
        message: 'To enable live email delivery, add RESEND_API_KEY to your Supabase Project Secrets.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch due reminders with row lock to avoid parallel duplicate dispatch
    const { data: dueReminders, error: fetchError } = await supabase.rpc('fetch_due_event_reminders', {
      p_limit: 50,
    });

    if (fetchError) {
      console.error('Error fetching due reminders:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reminders = (dueReminders as DueReminder[]) || [];
    if (reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No due reminders to process at this time.', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ reminder_id: string; status: string; recipient: string; error?: string }> = [];

    // 2. Iterate and send emails via Resend
    for (const reminder of reminders) {
      const reminderLabel =
        reminder.reminder_type === '7_days'
          ? '7 Days Notice'
          : reminder.reminder_type === '3_days'
          ? '3 Days Notice'
          : reminder.reminder_type === '1_day'
          ? '1 Day Notice'
          : reminder.reminder_type === 'on_date'
          ? 'Due Today'
          : 'Scheduled Reminder';

      const emailSubject = `[Reminder: ${reminder.event_category}] ${reminder.event_title} (${reminderLabel})`;

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; margin: 0; }
    .logo-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #93c5fd; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: #dbeafe; color: #1e40af; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #edf2f7; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-val { color: #0f172a; font-weight: 700; text-align: right; }
    .description { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 28px; background: #fafafa; padding: 16px; border-radius: 8px; border-left: 3px solid #3b82f6; }
    .cta-btn { display: inline-block; width: 100%; text-align: center; padding: 14px 20px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-sizing: border-box; }
    .footer { padding: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #ffffff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="logo-text">STUDENT SAFE VAULT</h1>
      <div class="logo-sub">Academic Calendar & Alert Service</div>
    </div>
    <div class="content">
      <div class="badge">${reminder.event_category} • ${reminderLabel}</div>
      <h2 class="title">${reminder.event_title}</h2>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Event Date:</span>
          <span class="info-val">${reminder.event_date}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-val">${reminder.event_time}</span>
        </div>
        ${
          reminder.event_location
            ? `<div class="info-row">
                <span class="info-label">Location:</span>
                <span class="info-val">${reminder.event_location}</span>
              </div>`
            : ''
        }
        <div class="info-row">
          <span class="info-label">Student:</span>
          <span class="info-val">${reminder.student_name}</span>
        </div>
      </div>

      ${
        reminder.event_description
          ? `<div class="description">${reminder.event_description}</div>`
          : ''
      }

      <a href="${appUrl}" class="cta-btn" target="_blank">Open Student Safe Vault</a>
    </div>
    <div class="footer">
      This is an automated notification from your personal Student Safe Vault.<br>
      To adjust your notification preferences, open your vault settings.
    </div>
  </div>
</body>
</html>
      `;

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [reminder.student_email],
            subject: emailSubject,
            html: htmlBody,
          }),
        });

        if (resendRes.ok) {
          await supabase.rpc('mark_event_reminder_sent', { p_reminder_id: reminder.reminder_id });
          sentCount++;
          results.push({ reminder_id: reminder.reminder_id, status: 'Sent', recipient: reminder.student_email });
        } else {
          const errText = await resendRes.text();
          console.error(`Resend API Error for reminder ${reminder.reminder_id}:`, errText);
          await supabase.rpc('mark_event_reminder_failed', {
            p_reminder_id: reminder.reminder_id,
            p_error: errText.substring(0, 500),
          });
          failedCount++;
          results.push({
            reminder_id: reminder.reminder_id,
            status: 'Failed',
            recipient: reminder.student_email,
            error: errText,
          });
        }
      } catch (err: any) {
        console.error(`Failed to send email for reminder ${reminder.reminder_id}:`, err);
        await supabase.rpc('mark_event_reminder_failed', {
          p_reminder_id: reminder.reminder_id,
          p_error: String(err?.message || err).substring(0, 500),
        });
        failedCount++;
        results.push({
          reminder_id: reminder.reminder_id,
          status: 'Failed',
          recipient: reminder.student_email,
          error: String(err?.message || err),
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: 'completed',
        total_due: reminders.length,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unhandled Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
