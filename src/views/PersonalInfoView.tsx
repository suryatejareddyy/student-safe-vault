import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, UserProfile } from '../context/AuthContext';
import {
  User,
  School,
  Mail,
  Phone,
  Calendar,
  MapPin,
  IdCard,
  Building,
  GraduationCap,
  BookOpen,
  Camera,
  Trash2,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  FileCheck2,
} from 'lucide-react';

interface PersonalInfoViewProps {
  onBackToDashboard?: () => void;
  startInEditMode?: boolean;
}

export const PersonalInfoView: React.FC<PersonalInfoViewProps> = ({
  onBackToDashboard,
  startInEditMode = false,
}) => {
  const { user, profile, updateProfile, uploadAvatar, removeAvatar } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(startInEditMode);
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State initialized from profile / user metadata
  const [formData, setFormData] = useState({
    // Personal Details
    full_name: profile?.full_name || user?.user_metadata?.full_name || '',
    student_id: profile?.student_id || '',
    dob: profile?.dob || '',
    gender: profile?.gender || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || user?.user_metadata?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || 'United States',
    emergency_contact: profile?.emergency_contact || '',

    // College & Academic Details
    college_name: profile?.college_name || user?.user_metadata?.college_name || '',
    college_address: profile?.college_address || '',
    course_degree: profile?.course_degree || '',
    department_branch: profile?.department_branch || '',
    current_year: profile?.current_year || '',
    semester: profile?.semester || '',
    admission_number: profile?.admission_number || '',
    graduation_year: profile?.graduation_year || '',
    academic_email: profile?.academic_email || '',
  });

  // Keep form data synchronized if profile loads or updates from Supabase
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        full_name: profile.full_name || '',
        student_id: profile.student_id || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'United States',
        emergency_contact: profile.emergency_contact || '',

        college_name: profile.college_name || '',
        college_address: profile.college_address || '',
        course_degree: profile.course_degree || '',
        department_branch: profile.department_branch || '',
        current_year: profile.current_year || '',
        semester: profile.semester || '',
        admission_number: profile.admission_number || '',
        graduation_year: profile.graduation_year || '',
        academic_email: profile.academic_email || '',
      });
    }
  }, [profile, isEditing, user]);

  // Accurate Age Calculation accounting for whether the birthday has occurred this year
  const calculatedAge = useMemo(() => {
    if (!formData.dob) return null;
    const birthDate = new Date(formData.dob);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    // Prevent future birth dates
    if (birthDate > today) return 'Invalid (Future Date)';

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // If birthday has not yet occurred this current year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 0 ? `${age} years old` : null;
  }, [formData.dob]);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Form Validation
  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!formData.full_name.trim()) {
      setErrorMessage('Full name is required.');
      return false;
    }

    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      if (birthDate > today) {
        setErrorMessage('Date of birth cannot be in the future.');
        return false;
      }
    }

    if (formData.phone && !/^[0-9+\-\s()]{7,20}$/.test(formData.phone.trim())) {
      setErrorMessage('Please enter a valid phone number format (e.g. +1 555-019-9042).');
      return false;
    }

    if (formData.postal_code && !/^[A-Za-z0-9\s\-]{3,10}$/.test(formData.postal_code.trim())) {
      setErrorMessage('Please enter a valid postal or ZIP code.');
      return false;
    }

    return true;
  };

  // Save Changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await updateProfile({
        full_name: formData.full_name.trim(),
        student_id: formData.student_id.trim() || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        country: formData.country.trim() || 'United States',
        emergency_contact: formData.emergency_contact.trim() || null,

        college_name: formData.college_name.trim() || null,
        college_address: formData.college_address.trim() || null,
        course_degree: formData.course_degree.trim() || null,
        department_branch: formData.department_branch.trim() || null,
        current_year: formData.current_year.trim() || null,
        semester: formData.semester.trim() || null,
        admission_number: formData.admission_number.trim() || null,
        graduation_year: formData.graduation_year.trim() || null,
        academic_email: formData.academic_email.trim() || null,
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to update personal information.');
      } else {
        setSuccessMessage('Personal information updated and encrypted successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel Editing
  const handleCancel = () => {
    setErrorMessage(null);
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        student_id: profile.student_id || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'United States',
        emergency_contact: profile.emergency_contact || '',

        college_name: profile.college_name || '',
        college_address: profile.college_address || '',
        course_degree: profile.course_degree || '',
        department_branch: profile.department_branch || '',
        current_year: profile.current_year || '',
        semester: profile.semester || '',
        admission_number: profile.admission_number || '',
        graduation_year: profile.graduation_year || '',
        academic_email: profile.academic_email || '',
      });
    }
    setIsEditing(false);
  };

  // Profile Picture Upload Handler (Max 5 MB, JPG/PNG)
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setErrorMessage(null);

    const { error } = await uploadAvatar(file);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Profile picture updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setAvatarLoading(false);
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setAvatarLoading(true);
    const { error } = await removeAvatar();
    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Profile picture removed.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setAvatarLoading(false);
  };

  const studentInitials = (formData.full_name || 'Student')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Check if profile is mostly blank for empty state badge
  const isProfileEmpty = !formData.student_id && !formData.course_degree && !formData.dob;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Profile Picture / Avatar with Private Upload Controls */}
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-tr from-navy-950 via-royal-900 to-royal-600 text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-royal-200">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={formData.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{studentInitials}</span>
              )}
            </div>

            {/* Upload Overlay Button */}
            <label
              htmlFor="avatar-file-input"
              className="absolute -bottom-1.5 -right-1.5 p-2 bg-royal-600 hover:bg-royal-500 text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-110"
              title="Upload Photo (Max 5MB JPG/PNG)"
            >
              {avatarLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <input
                id="avatar-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleAvatarFileSelect}
                disabled={avatarLoading}
              />
            </label>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-navy-950">
                {formData.full_name || 'Student Profile'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-royal-100 text-royal-700 border border-royal-200">
                {profile?.role === 'admin' ? 'Administrator' : 'Student Locker'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {formData.college_name || 'Academic Institution'} • {formData.email}
            </p>
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 pt-0.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-center">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-royal-600/20 hover:shadow-royal-500/30 transition-all flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean Empty State Banner if student has incomplete profile */}
      {isProfileEmpty && !isEditing && (
        <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Your academic record profile is incomplete</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Add your Student ID, Date of Birth, and Degree details to unlock full digital credential verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm"
          >
            Complete Profile Now
          </button>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* ========================================================================= */}
        {/* SECTION A: PERSONAL DETAILS */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-royal-50 text-royal-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy-950">
                A. Personal Details & Confidential Records
              </h2>
              <p className="text-xs text-slate-500">
                Encrypted identity parameters and emergency student contact.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Alex Benjamin Chen"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.full_name || '—'}
                </div>
              )}
            </div>

            {/* Student ID / Roll Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Student ID / Roll Number
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="e.g. STU-2026-9042"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white font-mono"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-semibold text-slate-900">
                  {formData.student_id || 'Not specified'}
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  name="dob"
                  max={new Date().toISOString().split('T')[0]} // Block future dates
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 flex items-center justify-between">
                  <span>{formData.dob || 'Not specified'}</span>
                  {calculatedAge && !calculatedAge.includes('Invalid') && (
                    <span className="text-[11px] font-bold text-royal-600 bg-royal-50 px-2 py-0.5 rounded-md">
                      {calculatedAge}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Automatically Calculated Age (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Calculated Age
              </label>
              <div className="p-3 bg-royal-50/60 rounded-xl border border-royal-100 text-xs sm:text-sm font-bold text-royal-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-royal-600" />
                <span>{calculatedAge || 'Provide Date of Birth above'}</span>
              </div>
            </div>

            {/* Gender (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              {isEditing ? (
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.gender || 'Not specified'}
                </div>
              )}
            </div>

            {/* Student Registered Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Student Email
              </label>
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 truncate flex items-center justify-between">
                <span>{formData.email}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                  Verified
                </span>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 555-019-9042"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.phone || 'Not specified'}
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Emergency Contact <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                  placeholder="e.g. Sarah Chen (+1 555-019-8234)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.emergency_contact || 'Not specified'}
                </div>
              )}
            </div>

            {/* Street Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                House Number & Street Address
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. 742 Evergreen Academic Way, Apt 4B"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.address || 'Not specified'}
                </div>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. San Francisco"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.city || 'Not specified'}
                </div>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                State / Province
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. California"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.state || 'Not specified'}
                </div>
              )}
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Postal / ZIP Code
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="e.g. 94107"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white font-mono"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-semibold text-slate-900">
                  {formData.postal_code || 'Not specified'}
                </div>
              )}
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Country
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. United States"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.country || 'Not specified'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION B: COLLEGE & ACADEMIC DETAILS */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy-950">
                B. College & Academic Information
              </h2>
              <p className="text-xs text-slate-500">
                Institutional enrollment, department affiliation, and degree milestones.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* College or University Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                College / University Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="college_name"
                  value={formData.college_name}
                  onChange={handleChange}
                  placeholder="e.g. Global Institute of Technology"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.college_name || 'Not specified'}
                </div>
              )}
            </div>

            {/* Course or Degree */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Course or Degree Program
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="course_degree"
                  value={formData.course_degree}
                  onChange={handleChange}
                  placeholder="e.g. B.Tech Computer Science & AI"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.course_degree || 'Not specified'}
                </div>
              )}
            </div>

            {/* College Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                College Campus Address
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="college_address"
                  value={formData.college_address}
                  onChange={handleChange}
                  placeholder="e.g. 100 University Avenue, Science Quadrangle"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.college_address || 'Not specified'}
                </div>
              )}
            </div>

            {/* Department or Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department or Branch
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="department_branch"
                  value={formData.department_branch}
                  onChange={handleChange}
                  placeholder="e.g. Department of Informatics"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.department_branch || 'Not specified'}
                </div>
              )}
            </div>

            {/* Current Year of Study */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Year of Study
              </label>
              {isEditing ? (
                <select
                  name="current_year"
                  value={formData.current_year}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year (Freshman)">1st Year (Freshman)</option>
                  <option value="2nd Year (Sophomore)">2nd Year (Sophomore)</option>
                  <option value="3rd Year (Junior)">3rd Year (Junior)</option>
                  <option value="4th Year (Senior)">4th Year (Senior)</option>
                  <option value="Postgraduate / Master's">Postgraduate / Master's</option>
                  <option value="Doctoral / PhD">Doctoral / PhD</option>
                </select>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.current_year || 'Not specified'}
                </div>
              )}
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Semester
              </label>
              {isEditing ? (
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                >
                  <option value="">Select Semester</option>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5">Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                </select>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.semester || 'Not specified'}
                </div>
              )}
            </div>

            {/* Admission Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admission / Enrollment Number
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="admission_number"
                  value={formData.admission_number}
                  onChange={handleChange}
                  placeholder="e.g. ADM-2023-8841"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white font-mono"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-semibold text-slate-900">
                  {formData.admission_number || 'Not specified'}
                </div>
              )}
            </div>

            {/* Expected Graduation Year */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expected Graduation Year
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="graduation_year"
                  value={formData.graduation_year}
                  onChange={handleChange}
                  placeholder="e.g. 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                  {formData.graduation_year || 'Not specified'}
                </div>
              )}
            </div>

            {/* Academic Institutional Email (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Campus Academic Email <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="academic_email"
                  value={formData.academic_email}
                  onChange={handleChange}
                  placeholder="e.g. alex.chen@git.edu"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 truncate">
                  {formData.academic_email || 'Not specified'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Save Bar when in Edit Mode */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save & Encrypt Changes</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PersonalInfoView;
