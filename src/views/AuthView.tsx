import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { SecurityAcademicBackground } from '../components/BackgroundPatterns';
import { ViewType } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  School,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  X,
  AlertTriangle,
  KeyRound,
  Sparkles,
  Info,
  Check,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'login' | 'register' | 'reset-password';
  onNavigate: (view: ViewType, subSection?: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'login', onNavigate }) => {
  const {
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    isConfigured,
    isPasswordRecoveryMode,
    setIsPasswordRecoveryMode,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'reset-password'>(
    isPasswordRecoveryMode ? 'reset-password' : initialMode
  );

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Interaction feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Reset password form state (when in recovery mode)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Update mode if password recovery hash is detected
  useEffect(() => {
    if (isPasswordRecoveryMode) {
      setMode('reset-password');
    }
  }, [isPasswordRecoveryMode]);

  // Password validation criteria
  const passwordCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordStrong =
    passwordCriteria.length &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial;

  // Fill requested demo credentials into inputs for authentic Supabase login
  const handleFillDemo = () => {
    setEmail('demo.student@studentsafevault.demo');
    setPassword('Demo@12345');
    setErrorMessage(null);
  };

  // 1. Handle Student Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setVerificationPending(false);

    // Validate fields
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!isPasswordStrong) {
      setErrorMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    if (!agreePrivacy) {
      setErrorMessage('You must agree to the Student Safe Vault Privacy Policy to register.');
      return;
    }

    setLoading(true);

    try {
      const { error, needsEmailVerification } = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        collegeName: collegeName.trim() || undefined,
      });

      if (error) {
        setErrorMessage(error.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      if (needsEmailVerification) {
        setVerificationPending(true);
        setSuccessMessage(
          'Account created successfully! We have sent a verification email to your address. Please verify your email before logging in.'
        );
      } else {
        setSuccessMessage('Registration successful! Redirecting to your student dashboard...');
        setTimeout(() => {
          onNavigate('student-dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Student Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { error, isVerified } = await signIn({
        email: email.trim(),
        password,
      });

      if (error) {
        const errorMsg = error.message || '';
        const lowerMsg = errorMsg.toLowerCase();
        if (
          lowerMsg.includes('invalid login credentials') ||
          lowerMsg.includes('invalid_grant')
        ) {
          setErrorMessage(
            'Invalid login credentials. Please check your email and password. (If logging in as the demo student, ensure the demo account has been created in your Supabase project).'
          );
        } else if (
          lowerMsg.includes('email not confirmed') ||
          lowerMsg.includes('unconfirmed')
        ) {
          setErrorMessage(
            'Email not yet verified. Please check your inbox and confirm your email address.'
          );
        } else if (
          lowerMsg.includes('rate limit') ||
          lowerMsg.includes('too many requests')
        ) {
          setErrorMessage(
            'Too many requests. Please wait a few moments before trying again.'
          );
        } else if (
          lowerMsg.includes('network') ||
          lowerMsg.includes('failed to fetch') ||
          lowerMsg.includes('connection')
        ) {
          setErrorMessage(
            'Unable to reach authentication server. Please check your internet connection.'
          );
        } else {
          setErrorMessage(errorMsg || 'Invalid login credentials.');
        }
        setLoading(false);
        return;
      }

      // Check email confirmation
      if (!isVerified) {
        setErrorMessage(
          'Email not yet verified. Please check your inbox and verify your email address to access your private student locker.'
        );
        setLoading(false);
        return;
      }

      setSuccessMessage('Authentication successful! Opening your student safe vault...');
      setTimeout(() => {
        onNavigate('student-dashboard');
      }, 1000);
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
        setErrorMessage('Network connection error. Please verify your internet connection.');
      } else {
        setErrorMessage(errMsg || 'An unexpected error occurred during sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password Modal Submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const targetEmail = forgotEmail.trim() || email.trim();
    if (!targetEmail) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await sendPasswordReset(targetEmail);
      if (error) {
        setForgotError(error.message);
      } else {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to dispatch reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  // 4. Handle Password Update (after recovery link clicked)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setResetSuccess(true);
        setTimeout(() => {
          setIsPasswordRecoveryMode(false);
          setMode('login');
        }, 2500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecurityAcademicBackground className="flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="w-full max-w-lg my-auto space-y-6">
        {/* Supabase Configuration Alert (Shown if .env credentials are missing) */}
        {!isConfigured && (
          <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs shadow-xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Supabase Integration Setup Required</span>
            </div>
            <p className="leading-relaxed text-amber-200/90">
              Authentication integration is ready, but your live Supabase credentials have not been configured yet.
            </p>
            <div className="p-2.5 bg-black/40 rounded-xl font-mono text-[11px] text-amber-100 space-y-1">
              <div>1. Open <strong className="text-white">.env</strong> in your project root.</div>
              <div>2. Set <strong className="text-white">VITE_SUPABASE_URL</strong> and <strong className="text-white">VITE_SUPABASE_ANON_KEY</strong>.</div>
              <div>3. Run the SQL in <strong className="text-white">supabase/migrations/20261003_init_auth_and_profiles.sql</strong> in your Supabase SQL editor.</div>
            </div>
          </div>
        )}

        {/* 1. Website Logo displayed above card */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer hover:opacity-95 transition-opacity inline-block"
            title="Return to Student Safe Vault Home"
          >
            <Logo size="lg" variant="dark" />
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            {mode === 'login'
              ? 'Access your sovereign student credentials and locker'
              : mode === 'register'
              ? 'Register your encrypted institutional student safe vault'
              : 'Set a new secure master password for your safe vault'}
          </p>
        </div>

        {/* 2. Clean White Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-7 sm:p-9 text-slate-800 transition-all duration-300 relative">
          {/* Mode Switcher Tabs (Only if not in password reset mode) */}
          {mode !== 'reset-password' && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white text-navy-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Student Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white text-navy-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register Safe Vault
              </button>
            </div>
          )}

          {/* Error Message Toast */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success Message Toast */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-400 hover:text-emerald-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VERIFICATION PENDING SUCCESS SCREEN */}
          {verificationPending ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-royal-50 text-royal-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Mail className="w-7 h-7 text-royal-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-navy-950">Verify Your Email Address</h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                  We sent a confirmation link to <strong className="text-slate-900">{email}</strong>. Please check your inbox and verify your email to unlock your private safe locker.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationPending(false);
                    setMode('login');
                  }}
                  className="w-full py-2.5 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Return to Student Login
                </button>
              </div>
            </div>
          ) : mode === 'reset-password' ? (
            /* PASSWORD RECOVERY FORM */
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-base font-bold text-navy-950">Reset Master Access Key</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a new strong password for your student safe vault.
                </p>
              </div>

              {resetSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center space-y-2">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="font-bold">Password Updated Successfully!</p>
                  <p className="text-slate-600">Redirecting to login...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-white bg-royal-600 hover:bg-royal-500 disabled:opacity-50 transition-colors shadow-md"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </>
              )}
            </form>
          ) : mode === 'register' ? (
            /* ========================================================================= */
            /* STUDENT REGISTRATION FORM */
            /* ========================================================================= */
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Benjamin Chen"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Student Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.chen@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Phone Number (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-019-9042"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* College Name (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  College / University Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <School className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Master Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Checklist */}
                {password.length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                    <div className="font-semibold text-slate-700 mb-1">Password Requirements:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> At least 8 chars
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.hasUpper ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> Uppercase (A-Z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.hasLower ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> Lowercase (a-z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> Number (0-9)
                      </span>
                      <span className={`flex items-center gap-1.5 col-span-2 ${passwordCriteria.hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> Special character (!@#$%^&*)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Agreement to Privacy Policy */}
              <div className="text-xs pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="w-4 h-4 text-royal-600 border-slate-300 rounded focus:ring-royal-500 mt-0.5"
                  />
                  <span className="leading-snug">
                    I agree to the <strong className="text-navy-950">Privacy Policy</strong> and student data sovereignty protections. I acknowledge email verification is required.
                  </span>
                </label>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-royal-600 to-royal-700 hover:from-royal-500 hover:to-royal-600 disabled:opacity-50 shadow-lg shadow-royal-600/30 hover:shadow-royal-500/40 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Creating Student Vault...' : 'Create Student Safe Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* ========================================================================= */
            /* STUDENT LOGIN FORM */
            /* ========================================================================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                      setForgotSuccess(false);
                      setForgotError(null);
                    }}
                    className="text-xs font-semibold text-royal-600 hover:text-royal-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Account Quick-Fill Helper Button (Requested demo account) */}
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-royal-600 border-slate-300 rounded focus:ring-royal-500"
                  />
                  <span>Trust this student device</span>
                </label>

                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="inline-flex items-center gap-1 text-[11px] text-royal-700 bg-royal-50 hover:bg-royal-100 px-2 py-1 rounded-md font-semibold border border-royal-200 transition-colors"
                  title="Fills demo.student@studentsafevault.demo credentials"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Fill Demo Account</span>
                </button>
              </div>

              {/* Submit Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-royal-600 to-royal-700 hover:from-royal-500 hover:to-royal-600 disabled:opacity-50 shadow-lg shadow-royal-600/30 hover:shadow-royal-500/40 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Safe Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Bottom Switch Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>

            {mode === 'login' ? (
              <p>
                No locker yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-royal-600 hover:text-royal-700 hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                Have a vault?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-royal-600 hover:text-royal-700 hover:underline"
                >
                  Login
                </button>
              </p>
            ) : null}
          </div>
        </div>

        {/* Security Reassurance Footnote */}
        <div className="flex items-center justify-center gap-4 text-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-royal-400" />
            Supabase Auth & Row-Level Security
          </span>
          <span>•</span>
          <span>Zero Plaintext Storage</span>
        </div>
      </div>

      {/* 3. FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-royal-100 text-royal-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Reset Master Access Key</h3>
            </div>

            {forgotSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Recovery Link Dispatched
                </div>
                <p>
                  Instructions have been sent to <strong>{forgotEmail || email}</strong>. Click the link in your email to choose a new password.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-3 w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Enter your student email address. We will dispatch a password-reset link to restore access to your safe vault.
                </p>

                {forgotError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                    {forgotError}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-royal-600 hover:bg-royal-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </SecurityAcademicBackground>
  );
};

export default AuthView;
