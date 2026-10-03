import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type CertificateCategory =
  | 'Academic Certificates'
  | 'Marksheets'
  | 'Transfer Certificate'
  | 'Identity Certificates'
  | 'Income Certificate'
  | 'Caste Certificate'
  | 'Other Certificates';

export const CERTIFICATE_CATEGORIES: CertificateCategory[] = [
  'Academic Certificates',
  'Marksheets',
  'Transfer Certificate',
  'Identity Certificates',
  'Income Certificate',
  'Caste Certificate',
  'Other Certificates',
];

export interface CertificateItem {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  category: CertificateCategory;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CertificatesContextType {
  certificates: CertificateItem[];
  recycleBinCertificates: CertificateItem[];
  loading: boolean;
  hasPin: boolean;
  isUnlocked: boolean;
  isLockedOut: boolean;
  lockedUntil: Date | null;
  remainingAttempts: number;
  autoLockSecondsRemaining: number;
  setupPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  verifyPin: (pin: string) => Promise<{ success: boolean; error?: string; remainingAttempts?: number; lockedUntil?: Date }>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  requestRecoveryCode: () => Promise<{ success: boolean; recoveryCode?: string; expiresAt?: string; error?: string }>;
  resetPinWithRecoveryCode: (code: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  lockSection: () => void;
  uploadCertificate: (file: File, category: CertificateCategory) => Promise<{ data?: CertificateItem; error: Error | null }>;
  getSignedPreviewUrl: (cert: CertificateItem) => Promise<{ url?: string; error: Error | null }>;
  downloadCertificate: (cert: CertificateItem) => Promise<{ error: Error | null }>;
  renameCertificate: (certId: string, newName: string) => Promise<{ error: Error | null }>;
  changeCategory: (certId: string, newCategory: CertificateCategory) => Promise<{ error: Error | null }>;
  moveToRecycleBin: (certId: string) => Promise<{ error: Error | null }>;
  restoreFromRecycleBin: (certId: string) => Promise<{ error: Error | null }>;
  permanentlyDelete: (certId: string) => Promise<{ error: Error | null }>;
  emptyRecycleBin: () => Promise<{ error: Error | null }>;
  refreshCertificates: () => Promise<void>;
}

const CertificatesContext = createContext<CertificatesContextType | undefined>(undefined);

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const INITIAL_DEMO_CERTS: CertificateItem[] = [
  {
    id: 'cert-demo-1',
    user_id: 'demo-student',
    name: 'Bachelor_Degree_Convocation_Certificate.pdf',
    original_name: 'Bachelor_Degree_Convocation_Certificate.pdf',
    storage_path: 'demo-student/bachelor-degree.pdf',
    file_type: 'application/pdf',
    file_size: 1950000,
    category: 'Academic Certificates',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-06-15T10:00:00Z',
    updated_at: '2026-06-15T10:00:00Z',
  },
  {
    id: 'cert-demo-2',
    user_id: 'demo-student',
    name: 'Official_National_Identity_Aadhaar_Card.pdf',
    original_name: 'Official_National_Identity_Aadhaar_Card.pdf',
    storage_path: 'demo-student/identity-cert.pdf',
    file_type: 'application/pdf',
    file_size: 920000,
    category: 'Identity Certificates',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-05-10T11:20:00Z',
    updated_at: '2026-05-10T11:20:00Z',
  },
  {
    id: 'cert-demo-3',
    user_id: 'demo-student',
    name: 'Institutional_Transfer_Migration_Certificate.pdf',
    original_name: 'Institutional_Transfer_Migration_Certificate.pdf',
    storage_path: 'demo-student/transfer-cert.pdf',
    file_type: 'application/pdf',
    file_size: 1450000,
    category: 'Transfer Certificate',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-04-12T09:40:00Z',
    updated_at: '2026-04-12T09:40:00Z',
  },
];

async function sha256Hex(str: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(str + '_ssv_vault_salt_2026_');
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const CertificatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'demo-student';

  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [recycleBinCertificates, setRecycleBinCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  const [autoLockSecondsRemaining, setAutoLockSecondsRemaining] = useState<number>(300);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());

  const lockSection = useCallback(() => {
    setIsUnlocked(false);
    setAutoLockSecondsRemaining(300);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const recordActivity = useCallback(() => {
    if (!isUnlocked) return;
    lastActivityTimeRef.current = Date.now();
    setAutoLockSecondsRemaining(300);

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      lockSection();
    }, INACTIVITY_TIMEOUT_MS);
  }, [isUnlocked, lockSection]);

  useEffect(() => {
    if (!isUnlocked) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    lastActivityTimeRef.current = Date.now();
    setAutoLockSecondsRemaining(300);

    inactivityTimerRef.current = setTimeout(() => {
      lockSection();
    }, INACTIVITY_TIMEOUT_MS);

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setAutoLockSecondsRemaining(remaining);
      if (remaining <= 0) {
        lockSection();
      }
    }, 1000);

    const handleEvent = () => recordActivity();
    window.addEventListener('mousemove', handleEvent);
    window.addEventListener('mousedown', handleEvent);
    window.addEventListener('keydown', handleEvent);
    window.addEventListener('touchstart', handleEvent);
    window.addEventListener('scroll', handleEvent);

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      window.removeEventListener('mousemove', handleEvent);
      window.removeEventListener('mousedown', handleEvent);
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('touchstart', handleEvent);
      window.removeEventListener('scroll', handleEvent);
    };
  }, [isUnlocked, recordActivity, lockSection]);

  useEffect(() => {
    lockSection();
  }, [user?.id, lockSection]);

  const checkPinStatus = useCallback(async () => {
    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase.rpc('get_pin_status');
        if (!error && data) {
          setHasPin(Boolean(data.has_pin));
          setRemainingAttempts(data.remaining_attempts ?? 5);
          if (data.is_locked && data.locked_until) {
            const until = new Date(data.locked_until);
            if (until.getTime() > Date.now()) {
              setIsLockedOut(true);
              setLockedUntil(until);
            } else {
              setIsLockedOut(false);
              setLockedUntil(null);
            }
          } else {
            setIsLockedOut(false);
            setLockedUntil(null);
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase get_pin_status RPC error, using local fallback:', err);
      }
    }

    const localPinKey = `cert_pin_${userId}`;
    const localPin = localStorage.getItem(localPinKey);
    setHasPin(Boolean(localPin));

    const localLockKey = `cert_lock_${userId}`;
    const lockDataStr = localStorage.getItem(localLockKey);
    if (lockDataStr) {
      try {
        const lockData = JSON.parse(lockDataStr);
        if (lockData.lockedUntil && new Date(lockData.lockedUntil).getTime() > Date.now()) {
          setIsLockedOut(true);
          setLockedUntil(new Date(lockData.lockedUntil));
          setRemainingAttempts(0);
        } else {
          setIsLockedOut(false);
          setLockedUntil(null);
          setRemainingAttempts(lockData.failedAttempts ? Math.max(0, 5 - lockData.failedAttempts) : 5);
        }
      } catch {
        setIsLockedOut(false);
      }
    } else {
      setIsLockedOut(false);
      setRemainingAttempts(5);
    }
  }, [user, userId]);

  const refreshCertificates = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const active = data.filter((c: CertificateItem) => !c.is_deleted);
          const recycle = data.filter((c: CertificateItem) => c.is_deleted);
          setCertificates(active);
          setRecycleBinCertificates(recycle);
          setLoading(false);
          return;
        }
      }

      const localKey = `certificates_${userId}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const parsed: CertificateItem[] = JSON.parse(saved);
          setCertificates(parsed.filter((c) => !c.is_deleted));
          setRecycleBinCertificates(parsed.filter((c) => c.is_deleted));
        } catch {
          setCertificates(INITIAL_DEMO_CERTS);
          setRecycleBinCertificates([]);
        }
      } else {
        localStorage.setItem(localKey, JSON.stringify(INITIAL_DEMO_CERTS));
        setCertificates(INITIAL_DEMO_CERTS);
        setRecycleBinCertificates([]);
      }
    } catch (err) {
      console.error('Error loading certificates:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userId]);

  useEffect(() => {
    checkPinStatus();
    refreshCertificates();
  }, [checkPinStatus, refreshCertificates]);

  const persistLocalCertificates = (all: CertificateItem[]) => {
    const localKey = `certificates_${userId}`;
    localStorage.setItem(localKey, JSON.stringify(all));
    setCertificates(all.filter((c) => !c.is_deleted));
    setRecycleBinCertificates(all.filter((c) => c.is_deleted));
  };

  const setupPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!/^\d{6}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 6 numeric digits.' };
    }
    const weakPins = [
      '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
      '123456', '654321', '012345', '543210', '121212', '123123',
    ];
    if (weakPins.includes(pin)) {
      return { success: false, error: 'PIN is too weak. Avoid sequential or repeated digits.' };
    }

    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase.rpc('setup_certificate_pin', { p_pin: pin });
        if (error) throw error;
        if (data && !data.success) {
          return { success: false, error: data.error };
        }
        setHasPin(true);
        setIsUnlocked(true);
        return { success: true };
      } catch (err: unknown) {
        console.warn('Supabase setup_certificate_pin error, falling back to local:', err);
      }
    }

    const hash = await sha256Hex(pin);
    localStorage.setItem(`cert_pin_${userId}`, hash);
    localStorage.removeItem(`cert_lock_${userId}`);
    setHasPin(true);
    setIsUnlocked(true);
    return { success: true };
  };

  const verifyPin = async (pin: string): Promise<{ success: boolean; error?: string; remainingAttempts?: number; lockedUntil?: Date }> => {
    if (isLockedOut && lockedUntil && lockedUntil.getTime() > Date.now()) {
      return {
        success: false,
        error: 'Vault is temporarily locked due to multiple incorrect attempts.',
        lockedUntil,
      };
    }

    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase.rpc('verify_certificate_pin', { p_pin: pin });
        if (error) throw error;
        if (data) {
          if (data.success) {
            setIsUnlocked(true);
            setIsLockedOut(false);
            setLockedUntil(null);
            setRemainingAttempts(5);
            return { success: true };
          } else {
            if (data.is_locked && data.locked_until) {
              const until = new Date(data.locked_until);
              setIsLockedOut(true);
              setLockedUntil(until);
              setRemainingAttempts(0);
              return { success: false, error: data.error, lockedUntil: until, remainingAttempts: 0 };
            } else {
              setRemainingAttempts(data.remaining_attempts ?? 4);
              return { success: false, error: data.error, remainingAttempts: data.remaining_attempts };
            }
          }
        }
      } catch (err) {
        console.warn('Supabase verify_certificate_pin error, falling back to local:', err);
      }
    }

    const localHash = localStorage.getItem(`cert_pin_${userId}`);
    if (!localHash) {
      return { success: false, error: 'No PIN has been configured yet.' };
    }

    const inputHash = await sha256Hex(pin);
    const lockKey = `cert_lock_${userId}`;
    const rawLock = localStorage.getItem(lockKey);
    let attempts = 0;
    if (rawLock) {
      try {
        attempts = JSON.parse(rawLock).failedAttempts || 0;
      } catch {
        attempts = 0;
      }
    }

    if (inputHash === localHash) {
      localStorage.removeItem(lockKey);
      setIsUnlocked(true);
      setIsLockedOut(false);
      setLockedUntil(null);
      setRemainingAttempts(5);
      return { success: true };
    } else {
      attempts += 1;
      if (attempts >= 5) {
        const until = new Date(Date.now() + 15 * 60 * 1000);
        localStorage.setItem(lockKey, JSON.stringify({ failedAttempts: attempts, lockedUntil: until.toISOString() }));
        setIsLockedOut(true);
        setLockedUntil(until);
        setRemainingAttempts(0);
        return {
          success: false,
          error: '5 consecutive failed attempts. Vault locked for 15 minutes.',
          lockedUntil: until,
          remainingAttempts: 0,
        };
      } else {
        localStorage.setItem(lockKey, JSON.stringify({ failedAttempts: attempts }));
        setRemainingAttempts(5 - attempts);
        return {
          success: false,
          error: `Incorrect PIN. ${5 - attempts} attempt(s) remaining.`,
          remainingAttempts: 5 - attempts,
        };
      }
    }
  };

  const changePin = async (currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    const vResult = await verifyPin(currentPin);
    if (!vResult.success) {
      return { success: false, error: vResult.error || 'Current PIN verification failed.' };
    }
    return setupPin(newPin);
  };

  const requestRecoveryCode = async (): Promise<{ success: boolean; recoveryCode?: string; expiresAt?: string; error?: string }> => {
    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase.rpc('request_pin_recovery_code');
        if (error) throw error;
        if (data && data.success) {
          return {
            success: true,
            recoveryCode: data.recovery_code,
            expiresAt: data.expires_at,
          };
        }
      } catch (err) {
        console.warn('Supabase request_pin_recovery_code error, using local fallback:', err);
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    localStorage.setItem(`cert_recovery_${userId}`, JSON.stringify({ code, expiresAt, attempts: 0 }));

    return {
      success: true,
      recoveryCode: code,
      expiresAt,
    };
  };

  const resetPinWithRecoveryCode = async (code: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!/^\d{6}$/.test(newPin)) {
      return { success: false, error: 'New PIN must be exactly 6 digits.' };
    }

    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase.rpc('verify_and_reset_pin', {
          p_recovery_code: code,
          p_new_pin: newPin,
        });
        if (error) throw error;
        if (data && !data.success) {
          return { success: false, error: data.error };
        }
        setIsLockedOut(false);
        setLockedUntil(null);
        setRemainingAttempts(5);
        setHasPin(true);
        setIsUnlocked(true);
        return { success: true };
      } catch (err) {
        console.warn('Supabase verify_and_reset_pin error, using local fallback:', err);
      }
    }

    const raw = localStorage.getItem(`cert_recovery_${userId}`);
    if (!raw) return { success: false, error: 'No recovery code found. Please request a new one.' };

    const rec = JSON.parse(raw);
    if (new Date(rec.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'Recovery code expired. Please request a new one.' };
    }

    if (rec.code !== code) {
      rec.attempts = (rec.attempts || 0) + 1;
      localStorage.setItem(`cert_recovery_${userId}`, JSON.stringify(rec));
      return { success: false, error: 'Invalid recovery code.' };
    }

    const hash = await sha256Hex(newPin);
    localStorage.setItem(`cert_pin_${userId}`, hash);
    localStorage.removeItem(`cert_lock_${userId}`);
    localStorage.removeItem(`cert_recovery_${userId}`);
    setIsLockedOut(false);
    setLockedUntil(null);
    setRemainingAttempts(5);
    setHasPin(true);
    setIsUnlocked(true);
    return { success: true };
  };

  const uploadCertificate = async (
    file: File,
    category: CertificateCategory
  ): Promise<{ data?: CertificateItem; error: Error | null }> => {
    if (!isUnlocked) {
      return { error: new Error('Vault is locked. PIN verification required to upload certificates.') };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: new Error('Certificate exceeds maximum permitted size of 5 MB (5,242,880 bytes).') };
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return { error: new Error('Only PDF, JPG, JPEG, and PNG certificate formats are allowed.') };
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}_${sanitizedName}`;

    try {
      if (isSupabaseConfigured && user) {
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: inserted, error: insertError } = await supabase
          .from('certificates')
          .insert({
            user_id: user.id,
            name: file.name,
            original_name: file.name,
            storage_path: storagePath,
            file_type: file.type || 'application/pdf',
            file_size: file.size,
            category,
            is_deleted: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newCert = inserted as CertificateItem;
        setCertificates((prev) => [newCert, ...prev]);
        return { data: newCert, error: null };
      }

      const newCert: CertificateItem = {
        id: `cert-${Date.now()}`,
        user_id: userId,
        name: file.name,
        original_name: file.name,
        storage_path: storagePath,
        file_type: file.type || 'application/pdf',
        file_size: file.size,
        category,
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const localAll = [...certificates, ...recycleBinCertificates, newCert];
      persistLocalCertificates(localAll);
      return { data: newCert, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const getSignedPreviewUrl = async (cert: CertificateItem): Promise<{ url?: string; error: Error | null }> => {
    if (!isUnlocked) {
      return { error: new Error('PIN verification required to preview certificates.') };
    }

    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase.storage
          .from('certificates')
          .createSignedUrl(cert.storage_path, 60);

        if (error) throw error;
        return { url: data.signedUrl, error: null };
      }

      return {
        url: `data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og...`,
        error: null,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const downloadCertificate = async (cert: CertificateItem): Promise<{ error: Error | null }> => {
    if (!isUnlocked) {
      return { error: new Error('PIN verification required to download certificates.') };
    }

    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase.storage
          .from('certificates')
          .download(cert.storage_path);

        if (error) throw error;

        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = cert.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return { error: null };
      }

      const blob = new Blob([`Protected Certificate: ${cert.name}\nCategory: ${cert.category}\nVerified: Student Safe Vault SHA-256`], {
        type: cert.file_type,
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cert.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const renameCertificate = async (certId: string, newName: string): Promise<{ error: Error | null }> => {
    if (!isUnlocked) {
      return { error: new Error('PIN verification required.') };
    }

    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('certificates')
          .update({ name: newName, updated_at: new Date().toISOString() })
          .eq('id', certId);

        if (error) throw error;
      }

      setCertificates((prev) =>
        prev.map((c) => (c.id === certId ? { ...c, name: newName, updated_at: new Date().toISOString() } : c))
      );

      const localAll = [...certificates.map((c) => (c.id === certId ? { ...c, name: newName } : c)), ...recycleBinCertificates];
      persistLocalCertificates(localAll);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const changeCategory = async (certId: string, newCategory: CertificateCategory): Promise<{ error: Error | null }> => {
    if (!isUnlocked) {
      return { error: new Error('PIN verification required.') };
    }

    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('certificates')
          .update({ category: newCategory, updated_at: new Date().toISOString() })
          .eq('id', certId);

        if (error) throw error;
      }

      setCertificates((prev) =>
        prev.map((c) => (c.id === certId ? { ...c, category: newCategory, updated_at: new Date().toISOString() } : c))
      );

      const localAll = [...certificates.map((c) => (c.id === certId ? { ...c, category: newCategory } : c)), ...recycleBinCertificates];
      persistLocalCertificates(localAll);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const moveToRecycleBin = async (certId: string): Promise<{ error: Error | null }> => {
    if (!isUnlocked) {
      return { error: new Error('PIN verification required to manage certificates.') };
    }

    const now = new Date().toISOString();
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('certificates')
          .update({ is_deleted: true, deleted_at: now })
          .eq('id', certId);

        if (error) throw error;
      }

      const target = certificates.find((c) => c.id === certId);
      if (target) {
        const updated = { ...target, is_deleted: true, deleted_at: now };
        setCertificates((prev) => prev.filter((c) => c.id !== certId));
        setRecycleBinCertificates((prev) => [updated, ...prev]);

        const localAll = [...certificates.filter((c) => c.id !== certId), updated, ...recycleBinCertificates];
        persistLocalCertificates(localAll);
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const restoreFromRecycleBin = async (certId: string): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('certificates')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', certId);

        if (error) throw error;
      }

      const target = recycleBinCertificates.find((c) => c.id === certId);
      if (target) {
        const restored = { ...target, is_deleted: false, deleted_at: null };
        setRecycleBinCertificates((prev) => prev.filter((c) => c.id !== certId));
        setCertificates((prev) => [restored, ...prev]);

        const localAll = [...certificates, restored, ...recycleBinCertificates.filter((c) => c.id !== certId)];
        persistLocalCertificates(localAll);
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const permanentlyDelete = async (certId: string): Promise<{ error: Error | null }> => {
    try {
      const target = recycleBinCertificates.find((c) => c.id === certId) || certificates.find((c) => c.id === certId);
      if (isSupabaseConfigured && user && target) {
        await supabase.storage.from('certificates').remove([target.storage_path]);
        const { error } = await supabase.from('certificates').delete().eq('id', certId);
        if (error) throw error;
      }

      setCertificates((prev) => prev.filter((c) => c.id !== certId));
      setRecycleBinCertificates((prev) => prev.filter((c) => c.id !== certId));

      const localAll = [...certificates.filter((c) => c.id !== certId), ...recycleBinCertificates.filter((c) => c.id !== certId)];
      persistLocalCertificates(localAll);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const emptyRecycleBin = async (): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user && recycleBinCertificates.length > 0) {
        const paths = recycleBinCertificates.map((c) => c.storage_path);
        await supabase.storage.from('certificates').remove(paths);
        const ids = recycleBinCertificates.map((c) => c.id);
        const { error } = await supabase.from('certificates').delete().in('id', ids);
        if (error) throw error;
      }

      setRecycleBinCertificates([]);
      const localKey = `certificates_${userId}`;
      localStorage.setItem(localKey, JSON.stringify(certificates));
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  return (
    <CertificatesContext.Provider
      value={{
        certificates,
        recycleBinCertificates,
        loading,
        hasPin,
        isUnlocked,
        isLockedOut,
        lockedUntil,
        remainingAttempts,
        autoLockSecondsRemaining,
        setupPin,
        verifyPin,
        changePin,
        requestRecoveryCode,
        resetPinWithRecoveryCode,
        lockSection,
        uploadCertificate,
        getSignedPreviewUrl,
        downloadCertificate,
        renameCertificate,
        changeCategory,
        moveToRecycleBin,
        restoreFromRecycleBin,
        permanentlyDelete,
        emptyRecycleBin,
        refreshCertificates,
      }}
    >
      {children}
    </CertificatesContext.Provider>
  );
};

export const useCertificates = () => {
  const context = useContext(CertificatesContext);
  if (!context) {
    throw new Error('useCertificates must be used within a CertificatesProvider');
  }
  return context;
};
