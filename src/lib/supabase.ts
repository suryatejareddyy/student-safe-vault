import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean and validate URL/Key
const cleanUrl = rawUrl.trim();
const cleanAnonKey = rawAnonKey.trim();

// Check if valid URL format and not default placeholder
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured: boolean =
  Boolean(cleanUrl && cleanAnonKey) &&
  isValidUrl(cleanUrl) &&
  !cleanUrl.includes('your-project-ref') &&
  !cleanAnonKey.includes('your-anon-publishable-key');

// Fallback URL for client initialization to avoid hard-crash when env vars are unpopulated
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(
  isSupabaseConfigured ? cleanUrl : fallbackUrl,
  isSupabaseConfigured ? cleanAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'student_safe_vault_auth_token',
    },
  }
);
