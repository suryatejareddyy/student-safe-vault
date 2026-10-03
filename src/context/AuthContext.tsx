import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  college_name?: string | null;
  role: 'student' | 'admin';
  status?: 'active' | 'disabled';
  disabled_at?: string | null;
  disabled_reason?: string | null;
  is_demo: boolean;
  created_at?: string;
  updated_at?: string;

  // Personal Information
  student_id?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  emergency_contact?: string | null;

  // College and Academic Details
  college_address?: string | null;
  course_degree?: string | null;
  department_branch?: string | null;
  current_year?: string | null;
  semester?: string | null;
  admission_number?: string | null;
  graduation_year?: string | null;
  academic_email?: string | null;

  // Profile Picture
  avatar_url?: string | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  collegeName?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  isEmailVerified: boolean;
  isPasswordRecoveryMode: boolean;
  setIsPasswordRecoveryMode: (val: boolean) => void;
  isAdmin: boolean;
  accountDisabledError: string | null;
  clearAccountDisabledError: () => void;
  signUp: (params: SignUpParams) => Promise<{ error: AuthError | Error | null; needsEmailVerification: boolean }>;
  signIn: (params: SignInParams) => Promise<{ error: AuthError | Error | null; isVerified: boolean }>;
  signOut: () => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | Error | null }>;
  updateProfile: (fields: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  uploadAvatar: (file: File) => Promise<{ url?: string; error: Error | null }>;
  removeAvatar: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState<boolean>(false);
  const [accountDisabledError, setAccountDisabledError] = useState<string | null>(null);

  // Check if role is admin and account is active
  const isAdmin = useMemo(() => {
    return Boolean(profile?.role === 'admin' && profile?.status !== 'disabled');
  }, [profile]);

  const clearAccountDisabledError = () => {
    setAccountDisabledError(null);
  };

  // Check if email has been verified
  const isEmailVerified = useMemo(() => {
    if (!user) return false;
    return Boolean(user.email_confirmed_at);
  }, [user]);

  // Fetch or construct profile from database
  const fetchProfile = async (userId: string, userEmail: string, metaData?: any) => {
    // Check localStorage cache for profile data first (to preserve changes across reloads)
    const localProfileCache = localStorage.getItem(`profile_${userId}`);
    let cachedProfile: Partial<UserProfile> = {};
    if (localProfileCache) {
      try {
        cachedProfile = JSON.parse(localProfileCache);
      } catch (e) {
        // ignore parse error
      }
    }

    if (!isSupabaseConfigured) {
      // In unconfigured mode, provide a safe fallback profile merged with cached edits
      setProfile({
        id: userId,
        full_name: cachedProfile.full_name || metaData?.full_name || 'Alex Chen',
        email: userEmail || 'alex.chen@university.edu',
        phone: cachedProfile.phone ?? metaData?.phone ?? '+1 555-019-9042',
        college_name: cachedProfile.college_name ?? metaData?.college_name ?? 'Global Institute of Technology',
        role: 'student',
        is_demo: metaData?.is_demo || false,
        student_id: cachedProfile.student_id ?? 'STU-2026-9042',
        dob: cachedProfile.dob ?? '2004-05-14',
        gender: cachedProfile.gender ?? 'Male',
        address: cachedProfile.address ?? '742 Evergreen Academic Way, Apt 4B',
        city: cachedProfile.city ?? 'San Francisco',
        state: cachedProfile.state ?? 'California',
        postal_code: cachedProfile.postal_code ?? '94107',
        country: cachedProfile.country ?? 'United States',
        emergency_contact: cachedProfile.emergency_contact ?? 'Sarah Chen (+1 555-019-8234)',
        college_address: cachedProfile.college_address ?? '100 University Avenue, Science Quadrangle',
        course_degree: cachedProfile.course_degree ?? 'B.Tech - Artificial Intelligence & Computer Science',
        department_branch: cachedProfile.department_branch ?? 'Department of Informatics',
        current_year: cachedProfile.current_year ?? '4th Year (Senior)',
        semester: cachedProfile.semester ?? 'Semester 7',
        admission_number: cachedProfile.admission_number ?? 'ADM-2023-8841',
        graduation_year: cachedProfile.graduation_year ?? '2026',
        academic_email: cachedProfile.academic_email ?? 'alex.chen@git.edu',
        avatar_url: cachedProfile.avatar_url ?? null,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch user profile from profiles table:', error.message);
      }

      if (data) {
        if (data.status === 'disabled') {
          console.warn('Student account is suspended by an administrator.');
          setAccountDisabledError(
            data.disabled_reason
              ? `Your student account has been disabled by an administrator. Reason: ${data.disabled_reason}`
              : 'Your student account has been disabled by an administrator. Please contact support@studentsafevault.edu.'
          );
          setProfile(null);
          setUser(null);
          setSession(null);
          localStorage.removeItem(`profile_${userId}`);
          localStorage.removeItem('student_safe_vault_auth_token');
          await supabase.auth.signOut();
          return;
        }

        setProfile(data as UserProfile);
        localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
      } else {
        // Fallback to metadata if trigger has not finished or table is being set up
        const fallback: UserProfile = {
          id: userId,
          full_name: cachedProfile.full_name || metaData?.full_name || user?.user_metadata?.full_name || 'Student User',
          email: userEmail,
          phone: cachedProfile.phone ?? metaData?.phone ?? user?.user_metadata?.phone ?? null,
          college_name: cachedProfile.college_name ?? metaData?.college_name ?? user?.user_metadata?.college_name ?? 'Academic Institution',
          role: 'student',
          is_demo: metaData?.is_demo || false,
          student_id: cachedProfile.student_id ?? null,
          dob: cachedProfile.dob ?? null,
          gender: cachedProfile.gender ?? null,
          address: cachedProfile.address ?? null,
          city: cachedProfile.city ?? null,
          state: cachedProfile.state ?? null,
          postal_code: cachedProfile.postal_code ?? null,
          country: cachedProfile.country ?? 'United States',
          emergency_contact: cachedProfile.emergency_contact ?? null,
          college_address: cachedProfile.college_address ?? null,
          course_degree: cachedProfile.course_degree ?? null,
          department_branch: cachedProfile.department_branch ?? null,
          current_year: cachedProfile.current_year ?? null,
          semester: cachedProfile.semester ?? null,
          admission_number: cachedProfile.admission_number ?? null,
          graduation_year: cachedProfile.graduation_year ?? null,
          academic_email: cachedProfile.academic_email ?? null,
          avatar_url: cachedProfile.avatar_url ?? null,
        };
        setProfile(fallback);
        localStorage.setItem(`profile_${userId}`, JSON.stringify(fallback));

        // Auto-provision profile in database if missing and Supabase is configured
        if (isSupabaseConfigured) {
          try {
            await supabase.from('profiles').insert([
              {
                id: userId,
                full_name: fallback.full_name,
                email: fallback.email,
                phone: fallback.phone,
                college_name: fallback.college_name,
                role: 'student',
                status: 'active',
                is_demo: fallback.is_demo,
                student_id: fallback.student_id,
              },
            ]);
          } catch {
            // Ignore if table does not exist yet
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
    }
  };

  // Restore session on initial load and handle auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Check if user previously logged into a local demo/offline session
      const savedOfflineUser = localStorage.getItem('student_safe_vault_offline_session');
      if (savedOfflineUser) {
        try {
          const parsed = JSON.parse(savedOfflineUser);
          setUser(parsed);
          fetchProfile(parsed.id, parsed.email, parsed.user_metadata);
        } catch {
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    // Check if current URL contains recovery fragment
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      setIsPasswordRecoveryMode(true);
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchProfile(initSession.user.id, initSession.user.email || '', initSession.user.user_metadata);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Error fetching initial session:', err);
      setLoading(false);
    });

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecoveryMode(true);
      }

      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user.email || '', newSession.user.user_metadata);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 1. Student Sign Up
  const signUp = async ({
    email,
    password,
    fullName,
    phone,
    collegeName,
  }: SignUpParams) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase is not yet configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        ),
        needsEmailVerification: false,
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/#email-verified`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone || null,
            college_name: collegeName || null,
            role: 'student', // Client requests student role; DB trigger strictly enforces this
            is_demo: false,
          },
        },
      });

      if (error) {
        return { error, needsEmailVerification: false };
      }

      const needsEmailVerification = !data.user?.email_confirmed_at;
      return { error: null, needsEmailVerification };
    } catch (err: any) {
      return { error: err, needsEmailVerification: false };
    }
  };

  // 2. Student Sign In
  const signIn = async ({ email, password }: SignInParams) => {
    const cleanEmail = (email || '').trim();

    if (!isSupabaseConfigured) {
      if (
        (cleanEmail.toLowerCase() === 'demo.student@studentsafevault.demo' || cleanEmail.toLowerCase() === 'alex.chen@university.edu') &&
        password === 'Demo@12345'
      ) {
        const demoUser = {
          id: 'demo-student-uuid-2026',
          email: 'demo.student@studentsafevault.demo',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          user_metadata: {
            full_name: 'Demo Student',
            college_name: 'Demonstration Institute of Technology',
            phone: '+1 555-019-9000',
            is_demo: true,
          },
        } as any;
        setUser(demoUser);
        localStorage.setItem('student_safe_vault_offline_session', JSON.stringify(demoUser));
        await fetchProfile(demoUser.id, demoUser.email, demoUser.user_metadata);
        return { error: null, isVerified: true };
      }
      return {
        error: new Error(
          'Invalid credentials. To use the local offline demo account, use email "demo.student@studentsafevault.demo" and password "Demo@12345", or connect your Supabase project in .env.'
        ),
        isVerified: false,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error, isVerified: false };
      }

      const verified = Boolean(data.user?.email_confirmed_at);
      if (data.user) {
        // Pre-check if account is disabled by administrator
        try {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('status, disabled_reason')
            .eq('id', data.user.id)
            .single();

          if (profileRow && profileRow.status === 'disabled') {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setProfile(null);
            const reasonMsg = profileRow.disabled_reason
              ? `Your student account has been disabled by an administrator. Reason: ${profileRow.disabled_reason}`
              : 'Your student account has been disabled by an administrator. Please contact support@studentsafevault.edu.';
            setAccountDisabledError(reasonMsg);
            return { error: new Error(reasonMsg), isVerified: false };
          }
        } catch {
          // Table may not exist yet or query failed
        }

        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user.email || '', data.user.user_metadata);
      }

      return { error: null, isVerified: verified };
    } catch (err: any) {
      return { error: err, isVerified: false };
    }
  };

  // 3. Sign Out
  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsPasswordRecoveryMode(false);
      localStorage.removeItem('student_safe_vault_auth_token');
      localStorage.removeItem('student_safe_vault_offline_session');
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 4. Send Password Reset Email
  const sendPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase is not configured. Please add your credentials to the .env file.'
        ),
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/#type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 5. Update Password after reset
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase is not configured.'),
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (!error) {
        setIsPasswordRecoveryMode(false);
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 6. Update Student Profile (Personal & Academic Info)
  const updateProfile = async (fields: Partial<UserProfile>) => {
    const targetUserId = user?.id || profile?.id;
    if (!targetUserId) {
      return { error: new Error('No authenticated student found to update.') };
    }

    // Never allow updating role or id from client
    const { id, role, is_demo, created_at, ...cleanFields } = fields;

    // Optimistically update local profile state
    const updatedProfile = {
      ...(profile || {}),
      ...cleanFields,
      id: targetUserId,
      email: profile?.email || user?.email || '',
      role: profile?.role || 'student',
      is_demo: profile?.is_demo || false,
    } as UserProfile;

    setProfile(updatedProfile);
    localStorage.setItem(`profile_${targetUserId}`, JSON.stringify(updatedProfile));

    if (!isSupabaseConfigured) {
      // In offline/demo mode, changes are safely saved to local storage
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...cleanFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 7. Profile Picture Upload (Private Supabase Storage with local preview fallback)
  const uploadAvatar = async (file: File) => {
    const targetUserId = user?.id || profile?.id;
    if (!targetUserId) {
      return { error: new Error('Please sign in to upload a profile picture.') };
    }

    // Validate file size <= 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { error: new Error('File size exceeds the 5 MB limit. Please select a smaller photo.') };
    }

    // Validate MIME type (JPG, JPEG, PNG)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { error: new Error('Invalid file type. Only JPG, JPEG, and PNG images are supported.') };
    }

    // If Supabase is not configured or in preview, generate local Data URL
    if (!isSupabaseConfigured) {
      return new Promise<{ url?: string; error: Error | null }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          updateProfile({ avatar_url: base64Url });
          resolve({ url: base64Url, error: null });
        };
        reader.onerror = () => {
          resolve({ error: new Error('Failed to read image file.') });
        };
        reader.readAsDataURL(file);
      });
    }

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${targetUserId}/avatar.${fileExt}`;

      // Upload to private 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        // If bucket does not exist yet or fails, fallback to local data URL gracefully
        console.warn('Storage upload error (fallback to local preview):', uploadError.message);
        return new Promise<{ url?: string; error: Error | null }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Url = reader.result as string;
            updateProfile({ avatar_url: base64Url });
            resolve({ url: base64Url, error: null });
          };
          reader.readAsDataURL(file);
        });
      }

      // Generate signed URL valid for 1 year (since it's a private bucket)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      const avatarUrl = signedData?.signedUrl || filePath;
      await updateProfile({ avatar_url: avatarUrl });
      return { url: avatarUrl, error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 8. Remove Avatar
  const removeAvatar = async () => {
    const targetUserId = user?.id || profile?.id;
    if (!targetUserId) {
      return { error: new Error('No user found.') };
    }

    try {
      if (isSupabaseConfigured) {
        // Attempt removing avatar file from storage
        await supabase.storage.from('avatars').remove([`${targetUserId}/avatar.png`, `${targetUserId}/avatar.jpg`, `${targetUserId}/avatar.jpeg`]);
      }
      await updateProfile({ avatar_url: null });
      return { error: null };
    } catch (err: any) {
      await updateProfile({ avatar_url: null });
      return { error: null };
    }
  };

  // 9. Refresh user profile
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || '', user.user_metadata);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isConfigured: isSupabaseConfigured,
    isEmailVerified,
    isPasswordRecoveryMode,
    setIsPasswordRecoveryMode,
    isAdmin,
    accountDisabledError,
    clearAccountDisabledError,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
