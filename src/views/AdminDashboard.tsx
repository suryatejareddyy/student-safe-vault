import React, { useState, useMemo } from 'react';
import { Logo } from '../components/Logo';
import { ViewType } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useAdmin, RegisteredStudent } from '../context/AdminContext';
import {
  Users,
  ShieldCheck,
  UserPlus,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  LogOut,
  Lock,
  EyeOff,
  Menu,
  X,
  FileKey,
  Shield,
  ShieldX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  BarChart3,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: ViewType, subSection?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, profile, isAdmin } = useAuth();
  const {
    stats,
    students,
    totalStudentsCount,
    currentPage,
    pageSize,
    totalPages,
    searchQuery,
    statusFilter,
    verificationFilter,
    dateRangeFilter,
    sortBy,
    sortDir,
    auditLogs,
    loading,
    actionLoading,
    error,
    setSearchQuery,
    setStatusFilter,
    setVerificationFilter,
    setDateRangeFilter,
    setSort,
    setCurrentPage,
    refreshStats,
    refreshStudents,
    refreshAuditLogs,
    toggleAccountStatus,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'audit'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status toggle confirmation modal state
  const [targetStudent, setTargetStudent] = useState<RegisteredStudent | null>(null);
  const [toggleReason, setToggleReason] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Chart hover state
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Safe Guard: If not admin, render restricted notice with immediate redirection button
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-navy-950 text-white flex flex-col items-center justify-center p-6 relative">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Administrator Access Restricted</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your authenticated account is enrolled under the{' '}
              <strong className="text-royal-400 font-semibold">{profile?.role || 'student'}</strong> role.
            </p>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl text-left border border-slate-800 space-y-2 text-[11px] text-slate-300">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Role-Based Security Policy</span>
            </div>
            <p className="leading-normal">
              • All student registrations strictly default to the <code>student</code> role.<br />
              • Admin privileges cannot be acquired through registration or client requests.<br />
              • Access to administrative queries and RPC functions is blocked at the database layer.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate('student-dashboard')}
              className="flex-1 py-2.5 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Go to Student Locker
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle open confirmation dialog
  const openToggleModal = (student: RegisteredStudent) => {
    setTargetStudent(student);
    setToggleReason(
      student.status === 'active'
        ? 'Violation of institutional terms or suspicious activity'
        : 'Student identity verified by administrator'
    );
    setModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!targetStudent) return;
    const nextStatus = targetStudent.status === 'active' ? 'disabled' : 'active';
    const res = await toggleAccountStatus(targetStudent.id, nextStatus, toggleReason);
    if (res.success) {
      showToast(
        `Student account "${targetStudent.full_name}" has been ${
          nextStatus === 'disabled' ? 'disabled' : 're-enabled'
        }.`
      );
      setModalOpen(false);
      setTargetStudent(null);
    } else {
      showToast(`Action failed: ${res.error || 'Server error'}`);
    }
  };

  // Compute Verification Percentage
  const verificationRate = useMemo(() => {
    if (!stats || stats.total_students === 0) return 0;
    return Math.round((stats.total_verified / stats.total_students) * 100);
  }, [stats]);

  // Max count for chart scaling
  const maxTrendCount = useMemo(() => {
    if (!stats?.daily_trends?.length) return 5;
    const max = Math.max(...stats.daily_trends.map((t) => t.count));
    return max === 0 ? 5 : Math.ceil(max * 1.25);
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row relative font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-950 text-white border border-amber-500/60 shadow-2xl rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-navy-950 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div onClick={() => onNavigate('home')} className="cursor-pointer">
          <Logo size="sm" variant="dark" />
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 1. NAVY-BLUE SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-navy-950 text-slate-300 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo with Admin Console Badge */}
          <div className="p-6 border-b border-slate-800 cursor-pointer" onClick={() => onNavigate('home')}>
            <Logo size="md" variant="dark" />
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Administrative Console</span>
            </div>
          </div>

          {/* Admin Identity */}
          <div className="p-4 mx-4 my-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/30">
              ADM
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">Administrator Portal</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@studentsafevault.edu'}</div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1">
              Admin Navigation
            </div>

            <button
              onClick={() => {
                setActiveTab('overview');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-royal-600 text-white shadow-md shadow-royal-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Metrics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('students');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'students'
                  ? 'bg-royal-600 text-white shadow-md shadow-royal-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Student Registry</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {stats?.total_students || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('audit');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'audit'
                  ? 'bg-royal-600 text-white shadow-md shadow-royal-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileKey className="w-4 h-4" />
                <span>Security Audit Trail</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {auditLogs.length}
              </span>
            </button>
          </nav>

          {/* Strict Privacy Notice in Sidebar */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-navy-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <EyeOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Zero File Inspection</span>
              </div>
              <p className="leading-snug text-slate-400">
                Administrators cannot view private student documents, certificates, pictures, or locker PINs.
              </p>
            </div>

            <button
              onClick={() => onNavigate('home')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Exit Admin Portal</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Main Admin Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-royal-100 text-royal-700 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-royal-600" />
              <span>Institutional Oversight & Student Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950">Student Safe Vault Administration</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Real-time student registry, verification analytics, and server-enforced account management.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={async () => {
                await refreshStats();
                await refreshStudents();
                await refreshAuditLogs();
                showToast('Synchronized live administrative metrics.');
              }}
              className="px-3 py-2 bg-white border border-slate-300 hover:border-royal-500 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              title="Refresh database statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-royal-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onNavigate('student-dashboard')}
              className="px-4 py-2 bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Student View
            </button>
          </div>
        </div>

        {/* STRICT PRIVACY ENFORCEMENT BANNER */}
        <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-navy-950 to-navy-900 text-white border border-slate-800 flex items-start gap-3 shadow-md">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400 text-sm">Privacy Guarantee Architecture</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
                ZERO-KNOWLEDGE
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Administrators have operational access strictly to student account verification and institutional email status. In adherence to privacy standards, <strong>private documents, certificates, personal photographs, and PINs are cryptographically client-sealed and inaccessible to administrators.</strong>
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW & REAL DATABASE ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Real Database Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Registered Students */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                  <div className="p-2 bg-royal-50 text-royal-600 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-navy-950">{stats?.total_students ?? 0}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Registered accounts</p>
                </div>
              </div>

              {/* Card 2: Verified Accounts */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Accounts</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-navy-950">{stats?.total_verified ?? 0}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{verificationRate}% verification rate</span>
                  </div>
                </div>
              </div>

              {/* Card 3: New Registrations (Today / Week / Month) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Registrations</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-navy-950">{stats?.new_this_week ?? 0}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>{stats?.new_today ?? 0}</strong> today • <strong>{stats?.new_this_month ?? 0}</strong> this month
                  </p>
                </div>
              </div>

              {/* Card 4: Active vs Disabled Accounts */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats?.active_accounts ?? 0}</span>
                    <span className="text-xs text-slate-400">active</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-lg font-bold text-rose-600">{stats?.disabled_accounts ?? 0}</span>
                    <span className="text-xs text-slate-400">disabled</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Enforced on database</p>
                </div>
              </div>
            </div>

            {/* REAL CHARTS & REGISTRATION TRENDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Registration Trends Bar Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-navy-950">Daily Student Registrations</h3>
                    <p className="text-xs text-slate-500">Signup velocity over the last 14 days</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last 14 Days</span>
                  </div>
                </div>

                {stats?.daily_trends && stats.daily_trends.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {/* SVG Bar Chart */}
                    <div className="h-48 w-full flex items-end justify-between gap-1.5 sm:gap-2 px-2 pt-6 pb-2 border-b border-slate-200 relative">
                      {stats.daily_trends.map((point, idx) => {
                        const heightPercent = Math.max(8, Math.round((point.count / maxTrendCount) * 100));
                        const isHovered = hoveredTrendIndex === idx;
                        return (
                          <div
                            key={point.date}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                            onMouseEnter={() => setHoveredTrendIndex(idx)}
                            onMouseLeave={() => setHoveredTrendIndex(null)}
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div className="absolute -top-10 bg-navy-950 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                                {point.label}: {point.count} student(s)
                              </div>
                            )}

                            {/* Bar */}
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                                point.count > 0
                                  ? isHovered
                                    ? 'bg-royal-500 shadow-md shadow-royal-200'
                                    : 'bg-gradient-to-t from-royal-700 to-royal-500'
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                            />

                            {/* Value label on top of bar if count > 0 */}
                            {point.count > 0 && (
                              <span className="text-[10px] font-bold text-royal-700 mb-1">{point.count}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart X-Axis Labels */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 font-medium">
                      <span>{stats.daily_trends[0]?.label}</span>
                      <span>{stats.daily_trends[Math.floor(stats.daily_trends.length / 2)]?.label}</span>
                      <span>{stats.daily_trends[stats.daily_trends.length - 1]?.label}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No trend activity recorded yet in this window.
                  </div>
                )}
              </div>

              {/* Verified vs Unverified Doughnut Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-navy-950">Verification Breakdown</h3>
                    <p className="text-xs text-slate-500">Verified institutional vs pending accounts</p>
                  </div>

                  {stats && stats.total_students > 0 ? (
                    <div className="pt-6 flex flex-col items-center">
                      {/* Circular Progress Gauge */}
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {/* Background Circle */}
                          <path
                            className="text-slate-100"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Progress Circle */}
                          <path
                            className="text-emerald-500 transition-all duration-1000 ease-out"
                            strokeDasharray={`${verificationRate}, 100`}
                            strokeWidth="3.8"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-black text-navy-950">{verificationRate}%</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Verified</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="w-full space-y-2 mt-6 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                          <span className="flex items-center gap-2 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Verified Email
                          </span>
                          <span className="font-bold">{stats.total_verified}</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-amber-900">
                          <span className="flex items-center gap-2 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            Pending Verification
                          </span>
                          <span className="font-bold">{stats.total_students - stats.total_verified}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No student records available.
                    </div>
                  )}
                </div>

                <div className="pt-2 text-[11px] text-slate-400 text-center">
                  Calculated from live database auth records
                </div>
              </div>
            </div>

            {/* Recent Signups Activity */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-navy-950">Recent Sign-up Activity</h3>
                  <p className="text-xs text-slate-500">Latest students registered on the platform</p>
                </div>
                <button
                  onClick={() => setActiveTab('students')}
                  className="text-xs font-semibold text-royal-600 hover:underline flex items-center gap-1"
                >
                  <span>View All Students</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {stats?.recent_signups && stats.recent_signups.length > 0 ? (
                  stats.recent_signups.map((su) => (
                    <div
                      key={su.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-royal-100 text-royal-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {su.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-navy-950">{su.full_name}</span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                su.is_verified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {su.is_verified ? 'Verified' : 'Pending Verification'}
                            </span>
                            {su.status === 'disabled' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {su.email} {su.college_name ? `• ${su.college_name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        {new Date(su.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">No signups recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: REGISTERED STUDENTS MANAGEMENT TABLE */}
        {/* ========================================================================= */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-navy-950">Student Accounts Registry</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Search, filter, review verification compliance, and manage student account statuses.
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Showing <strong>{students.length}</strong> of <strong>{totalStudentsCount}</strong> student records
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, email, or college..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  {(['All', 'active', 'disabled'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                        statusFilter === st ? 'bg-white text-navy-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'All' ? 'All Statuses' : st}
                    </button>
                  ))}
                </div>

                {/* Verification Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  {(['All', 'Verified', 'Unverified'] as const).map((vf) => (
                    <button
                      key={vf}
                      onClick={() => setVerificationFilter(vf)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                        verificationFilter === vf ? 'bg-white text-navy-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {vf}
                    </button>
                  ))}
                </div>

                {/* Date Range Filter */}
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
                >
                  <option value="All">All Dates</option>
                  <option value="today">Registered Today</option>
                  <option value="this_week">Registered This Week</option>
                  <option value="this_month">Registered This Month</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th
                      onClick={() => setSort('full_name', sortDir === 'asc' ? 'desc' : 'asc')}
                      className="py-3 px-4 cursor-pointer hover:text-royal-600 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Student Name</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => setSort('email', sortDir === 'asc' ? 'desc' : 'asc')}
                      className="py-3 px-4 cursor-pointer hover:text-royal-600 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Email Address</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => setSort('created_at', sortDir === 'asc' ? 'desc' : 'asc')}
                      className="py-3 px-4 cursor-pointer hover:text-royal-600 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Registered On</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Administrative Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin text-royal-600 mb-2" />
                        <span>Loading student registry...</span>
                      </td>
                    </tr>
                  ) : students.length > 0 ? (
                    students.map((stu) => {
                      const isSelf = stu.email === user?.email;
                      const isActive = stu.status === 'active';
                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-navy-950">
                            <div>
                              <span>{stu.full_name}</span>
                              {stu.college_name && (
                                <p className="text-[10px] text-slate-400 font-normal">{stu.college_name}</p>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {stu.email}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(stu.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                stu.is_verified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {stu.is_verified ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Verified</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Unverified</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              />
                              <span className="capitalize">{stu.status}</span>
                            </span>
                            {stu.status === 'disabled' && stu.disabled_reason && (
                              <p className="text-[9px] text-rose-600 mt-0.5 line-clamp-1" title={stu.disabled_reason}>
                                {stu.disabled_reason}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isSelf ? (
                              <span className="text-[10px] text-slate-400 italic">Self Account</span>
                            ) : (
                              <button
                                onClick={() => openToggleModal(stu)}
                                disabled={actionLoading}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                                  isActive
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isActive ? 'Disable Account' : 'Re-enable Account'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-600">No student accounts found.</p>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search terms or filter criteria.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                {totalStudentsCount} total registered students)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === p
                              ? 'bg-royal-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages || loading}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: ADMINISTRATIVE AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-navy-950">Security Audit Trail</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable chronological log of administrative account status changes and security actions.
                </p>
              </div>

              <button
                onClick={refreshAuditLogs}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action === 'disable_account'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-navy-950">
                          Target: {log.target_user_email || 'Student User'}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span>
                        Performed by: <code className="text-slate-800 font-mono font-semibold">{log.admin_email}</code>
                      </span>
                      {log.reason && (
                        <span>
                          • Reason: <em className="text-slate-700">"{log.reason}"</em>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <FileKey className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No administrative security actions recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CONFIRMATION DIALOG MODAL FOR DISABLING / RE-ENABLING ACCOUNTS */}
      {modalOpen && targetStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setModalOpen(false);
                setTargetStudent(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  targetStudent.status === 'active'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {targetStudent.status === 'active' ? (
                  <UserX className="w-6 h-6" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-950">
                  {targetStudent.status === 'active'
                    ? 'Disable Student Account?'
                    : 'Re-enable Student Account?'}
                </h3>
                <p className="text-xs text-slate-500">Security Confirmation Dialog</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Student:</strong> {targetStudent.full_name}
              </div>
              <div className="font-mono text-[11px] text-slate-600">
                <strong>Email:</strong> {targetStudent.email}
              </div>
              <div>
                <strong>Current Status:</strong>{' '}
                <span className="capitalize font-bold text-slate-800">{targetStudent.status}</span>
              </div>
            </div>

            {targetStudent.status === 'active' ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Notice:</strong> Disabling this account immediately revokes the student's ability to access documents, certificates, pictures, and reminders. Their session will be terminated upon next request.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Re-enabling this account will restore the student's full access to their digital locker and stored credentials.
                </p>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-700">Administrative Reason (Audit Log)</label>
              <textarea
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder="Enter explanation for this administrative status change..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setTargetStudent(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmToggle}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 ${
                  targetStudent.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {targetStudent.status === 'active' ? 'Confirm Disable' : 'Confirm Re-enable'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
