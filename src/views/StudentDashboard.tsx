import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { ViewType } from '../components/Navbar';
import { AcademicWatermark } from '../components/BackgroundPatterns';
import { useAuth } from '../context/AuthContext';
import { useDocuments, DocumentItem } from '../context/DocumentsContext';
import { useCertificates } from '../context/CertificatesContext';
import { usePictures } from '../context/PicturesContext';
import { useImportantDates } from '../context/ImportantDatesContext';
import { PersonalInfoView } from './PersonalInfoView';
import { MyDocumentsView } from './MyDocumentsView';
import { SecureCertificatesView } from './SecureCertificatesView';
import { PicturesGalleryView } from './PicturesGalleryView';
import { RecycleBinView } from './RecycleBinView';
import { ImportantDatesView } from './ImportantDatesView';
import {
  LayoutDashboard,
  User,
  FolderLock,
  Award,
  Image as ImageIcon,
  Calendar,
  Trash2,
  HelpCircle,
  LogOut,
  UploadCloud,
  Share2,
  FileText,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Shield,
  ShieldCheck,
  HardDrive,
  Plus,
  RefreshCw,
  ChevronRight,
  Menu,
  X,
  BadgeCheck,
  Camera,
  CalendarPlus,
  FileBadge,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

interface StudentDashboardProps {
  initialTab?: string;
  onNavigate: (view: ViewType, subSection?: string) => void;
}

interface CertificateItem {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialId: string;
  hash: string;
  status: 'Verified' | 'Pending';
}

interface PictureItem {
  id: string;
  title: string;
  category: string;
  date: string;
  size: string;
  aspect: string;
  bgColor: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  initialTab = 'dashboard',
  onNavigate,
}) => {
  const { user, profile, signOut } = useAuth();
  const {
    documents,
    recycleBinDocuments,
    getSignedPreviewUrl,
    downloadDocument,
    restoreFromRecycleBin,
    emptyRecycleBin,
    moveToRecycleBin,
    permanentlyDelete: permanentlyDeleteDoc,
  } = useDocuments();

  const {
    certificates,
    recycleBinCertificates,
    restoreFromRecycleBin: restoreCert,
    permanentlyDelete: permanentlyDeleteCert,
    emptyRecycleBin: emptyCertRecycleBin,
  } = useCertificates();

  const {
    pictures,
    recycleBinPictures,
    restoreFromRecycleBin: restorePic,
    permanentlyDelete: permanentlyDeletePic,
    emptyRecycleBin: emptyPicRecycleBin,
  } = usePictures();

  const { events } = useImportantDates();
  const activeEvents = events.filter((e) => !e.is_completed);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayStart = new Date(todayStr + 'T00:00:00Z').getTime();

  const eventsDueToday = events.filter((e) => e.event_date === todayStr && !e.is_completed);

  const eventsDueThisWeek = events.filter((e) => {
    if (e.is_completed) return false;
    const evTime = new Date(e.event_date + 'T00:00:00Z').getTime();
    const diff = Math.round((evTime - todayStart) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });

  const upcomingExamsDeadlines = events.filter(
    (e) => !e.is_completed && ['Exams', 'Assignments', 'Project Deadlines'].includes(e.category)
  );

  const nextReminder = React.useMemo(() => {
    const all = events.flatMap((e) =>
      (e.reminders || [])
        .filter((r) => r.status === 'Scheduled' && new Date(r.remind_at).getTime() > Date.now())
        .map((r) => ({ ...r, eventTitle: e.title, eventCategory: e.category, eventDate: e.event_date }))
    );
    all.sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime());
    return all[0] || null;
  }, [events]);

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [personalInfoEditRequested, setPersonalInfoEditRequested] = useState<boolean>(false);
  const [recycleBinFilter, setRecycleBinFilter] = useState<'All' | 'Documents' | 'Certificates' | 'Pictures'>('All');

  // Authenticated Student Details
  const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Alex Chen';
  const studentCollege = profile?.college_name || user?.user_metadata?.college_name || 'Global Institute of Technology';
  const studentEmail = profile?.email || user?.email || 'alex.chen@university.edu';
  const studentInitials = studentName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const isDemoAccount = profile?.is_demo || Boolean(user?.user_metadata?.is_demo);

  // Total Recycle Bin Count across all 3 asset types
  const totalRecycleCount = recycleBinDocuments.length + recycleBinCertificates.length + recycleBinPictures.length;

  // Unified Recycle Bin List
  const unifiedRecycleItems = [
    ...recycleBinDocuments.map((d) => ({
      id: d.id,
      type: 'document' as const,
      name: d.name,
      category: d.category,
      file_size: d.file_size,
      deleted_at: d.deleted_at,
    })),
    ...recycleBinCertificates.map((c) => ({
      id: c.id,
      type: 'certificate' as const,
      name: c.name,
      category: c.category,
      file_size: c.file_size,
      deleted_at: c.deleted_at,
    })),
    ...recycleBinPictures.map((p) => ({
      id: p.id,
      type: 'picture' as const,
      name: p.name,
      category: p.album,
      file_size: p.file_size,
      deleted_at: p.deleted_at,
    })),
  ].sort((a, b) => new Date(b.deleted_at || 0).getTime() - new Date(a.deleted_at || 0).getTime());

  // Expiring soon count (<= 7 days remaining of 30-day retention)
  const expiringSoonCount = unifiedRecycleItems.filter((item) => {
    if (!item.deleted_at) return false;
    const deletedTime = new Date(item.deleted_at).getTime();
    const expiresTime = deletedTime + 30 * 24 * 60 * 60 * 1000;
    const msLeft = expiresTime - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    return daysLeft <= 7;
  }).length;

  const filteredRecycleItems = unifiedRecycleItems.filter((item) => {
    if (recycleBinFilter === 'All') return true;
    if (recycleBinFilter === 'Documents') return item.type === 'document';
    if (recycleBinFilter === 'Certificates') return item.type === 'certificate';
    if (recycleBinFilter === 'Pictures') return item.type === 'picture';
    return true;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Working Logout Handler
  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Signed out of Student Safe Vault successfully.');
      setTimeout(() => {
        onNavigate('home');
      }, 500);
    } catch {
      showToast('Signed out.');
      onNavigate('home');
    }
  };

  // Responsive Sidebar Menu Items (9 items required by prompt)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Personal Information', icon: User },
    { id: 'documents', label: 'My Documents', icon: FolderLock, count: documents.length },
    { id: 'certificates', label: 'Secure Certificates', icon: Award, count: certificates.length },
    { id: 'pictures', label: 'Pictures', icon: ImageIcon, count: pictures.length },
    { id: 'dates', label: 'Important Dates', icon: Calendar, count: activeEvents.length },
    { id: 'recycle-bin', label: 'Recycle Bin', icon: Trash2, count: totalRecycleCount },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-950 text-white border border-royal-500/60 shadow-2xl rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MOBILE HEADER BAR */}
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

      {/* RESPONSIVE SIDEBAR NAVIGATION */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-navy-950 text-slate-300 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Sidebar Logo Header */}
          <div className="p-6 border-b border-slate-800/80 cursor-pointer" onClick={() => onNavigate('home')}>
            <Logo size="md" variant="dark" />
          </div>

          {/* Student Status Badge & Profile Picture in Sidebar */}
          <div
            onClick={() => {
              setActiveTab('profile');
              setSidebarOpen(false);
            }}
            className="px-6 py-4 bg-slate-900/60 border-b border-slate-800/50 flex items-center gap-3 cursor-pointer hover:bg-slate-900 transition-colors"
            title="Click to view My Personal Information"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-royal-600 to-blue-400 text-white font-bold flex items-center justify-center text-sm shadow-md flex-shrink-0 border border-royal-400/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={studentName} className="w-full h-full object-cover" />
              ) : (
                <span>{studentInitials || 'ST'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">{studentName}</div>
              <div className="text-[11px] text-royal-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                <span>{isDemoAccount ? 'Demo Student Account' : 'Student Locker'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Link Items */}
          <nav className="p-4 space-y-1.5 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1">
              Vault Menu
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setPersonalInfoEditRequested(false);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-royal-600 text-white shadow-md shadow-royal-900/40 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-royal-800 text-royal-100'
                          : item.id === 'recycle-bin' && item.count > 0
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-900'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer & Working Logout Button */}
          <div className="p-4 border-t border-slate-800/80 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-rose-900/40 transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout</span>
            </button>

            <div className="px-3 py-2 rounded-lg bg-navy-900/70 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Zero-knowledge client vault</span>
            </div>
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
        <AcademicWatermark className="absolute top-1/4 right-8 w-96 h-96 text-slate-300 pointer-events-none" />

        {/* ========================================================================= */}
        {/* VIEW 1: MY PERSONAL INFORMATION */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <PersonalInfoView
            onBackToDashboard={() => setActiveTab('dashboard')}
            startInEditMode={personalInfoEditRequested}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MY DOCUMENTS (Fully Functional Secure Storage View) */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && <MyDocumentsView />}

        {/* ========================================================================= */}
        {/* VIEW 3: STUDENT DASHBOARD OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Demo Account Indicator */}
            {isDemoAccount && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Demonstration Account:</strong> Logged in as <code className="font-mono bg-amber-100 px-1 rounded">{studentEmail}</code> with demonstration records.
                  </span>
                </div>
              </div>
            )}

            {/* NAVY-BLUE WELCOME BANNER WITH STUDENT AVATAR & NAME */}
            <div className="rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-royal-950 border border-slate-800 text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Profile Picture */}
                  <div
                    onClick={() => setActiveTab('profile')}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-royal-600 text-white font-black text-xl sm:text-2xl flex items-center justify-center border-2 border-white/20 shadow-md flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    title="Edit Personal Information & Photo"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={studentName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{studentInitials}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-royal-900/80 text-royal-300 text-xs font-semibold uppercase tracking-wider border border-royal-700/50">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Verified Student Vault
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Welcome back, {studentName}!
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm">
                      {studentCollege} • Roll No: <strong>{profile?.student_id || 'STU-2026-9042'}</strong> • {studentEmail}
                    </p>
                  </div>
                </div>

                {/* Storage Quota Meter */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 gap-6">
                    <span className="flex items-center gap-1 font-semibold">
                      <HardDrive className="w-3.5 h-3.5 text-royal-400" />
                      Encrypted Storage
                    </span>
                    <span className="font-bold text-white">1.8 GB / 5.0 GB (36%)</span>
                  </div>
                  <div className="w-48 sm:w-56 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-royal-500 to-emerald-400 rounded-full w-[36%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* EXPIRING SOON RECYCLE BIN BANNER */}
            {expiringSoonCount > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-50/50 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-navy-950 flex items-center gap-2">
                      <span>Recycle Bin Items Expiring Soon</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                        {expiringSoonCount} {expiringSoonCount === 1 ? 'item' : 'items'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      You have {expiringSoonCount} {expiringSoonCount === 1 ? 'item' : 'items'} approaching the 30-day retention limit (expiring within 7 days). Review and restore them before they are permanently purged.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('recycle-bin')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                >
                  <span>Review Recycle Bin</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* FIVE QUICK ACTION BUTTONS */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Quick Vault Actions
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Upload Document -> Switches to Documents */}
                <button
                  onClick={() => setActiveTab('documents')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-royal-500 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <div className="p-2.5 rounded-lg bg-royal-50 text-royal-600 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-navy-950">Upload Document</span>
                </button>

                {/* 2. Add Personal Information */}
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setPersonalInfoEditRequested(true);
                  }}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-royal-500 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-navy-950">Add Personal Info</span>
                </button>

                {/* 3. Upload Picture */}
                <button
                  onClick={() => setActiveTab('pictures')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-royal-500 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-navy-950">Upload Picture</span>
                </button>

                {/* 4. Secure Certificate */}
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-royal-500 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                    <FileBadge className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-navy-950">Secure Certificate</span>
                </button>

                {/* 5. Add Important Date */}
                <button
                  onClick={() => setActiveTab('dates')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-royal-500 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group col-span-2 sm:col-span-1"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-navy-950">Add Important Date</span>
                </button>
              </div>
            </div>

            {/* REAL METRIC CARDS (Documents, Pictures, Certificates, Deadlines, Recycle Bin) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total Active Documents (Real count from useDocuments) */}
              <div
                onClick={() => setActiveTab('documents')}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</span>
                  <div className="p-2 bg-royal-50 text-royal-600 rounded-lg">
                    <FolderLock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-navy-950">{documents.length}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Encrypted & Active</p>
                </div>
              </div>

              {/* Total Pictures */}
              <div
                onClick={() => setActiveTab('pictures')}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pictures</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-navy-950">{pictures.length}</p>
                  <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Private Gallery</p>
                </div>
              </div>

              {/* Protected Certificates */}
              <div
                onClick={() => setActiveTab('certificates')}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Certificates</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-navy-950">{certificates.length}</p>
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Digitally Sealed</p>
                </div>
              </div>

              {/* Upcoming Important Dates */}
              <div
                onClick={() => setActiveTab('dates')}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deadlines</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-navy-950">{activeEvents.length}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Active Alerts</p>
                </div>
              </div>

              {/* Recycle Bin Count (Real count from all 3 contexts) */}
              <div
                onClick={() => setActiveTab('recycle-bin')}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recycle Bin</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-navy-950">{totalRecycleCount}</p>
                  <p className="text-[11px] text-rose-600 font-semibold mt-0.5">30-Day Buffer</p>
                </div>
              </div>
            </div>

            {/* SPLIT SECTION: RECENT DOCUMENTS & UPCOMING REMINDERS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recently Uploaded Documents (Real database records) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <FolderLock className="w-5 h-5 text-royal-600" />
                    <h2 className="text-base font-bold text-navy-950">Recently Uploaded Documents</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="text-xs font-bold text-royal-600 hover:text-royal-700 flex items-center gap-1"
                  >
                    <span>View All ({documents.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {documents.length > 0 ? (
                    documents.slice(0, 4).map((doc) => (
                      <div
                        key={doc.id}
                        className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-xl px-2 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-lg bg-royal-50 text-royal-600 flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {doc.category} • {(doc.file_size / 1024).toFixed(0)} KB •{' '}
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={async () => {
                              showToast(`Fetching signed download for "${doc.original_name}"...`);
                              await downloadDocument(doc);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              await moveToRecycleBin(doc.id);
                              showToast(`Moved "${doc.name}" to Recycle Bin.`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No documents uploaded yet.{' '}
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="text-royal-600 font-bold hover:underline"
                      >
                        Upload your first file
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Reminders & Important Deadlines */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-navy-950">Upcoming Reminders</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('dates')}
                    className="text-xs font-semibold text-royal-600 hover:underline flex items-center gap-1"
                  >
                    <span>Open Calendar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {nextReminder && (
                  <div className="p-3 rounded-xl bg-royal-50 border border-royal-200/70 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-royal-600 animate-pulse flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-navy-950">Next Email Alert: </span>
                        <span className="text-slate-600 font-medium truncate">{nextReminder.eventTitle}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-royal-700 bg-white px-2 py-0.5 rounded shadow-xs whitespace-nowrap">
                      {new Date(nextReminder.remind_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {activeEvents.length > 0 ? (
                    activeEvents.slice(0, 4).map((evt) => {
                      const isToday = evt.event_date === todayStr;
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setActiveTab('dates')}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:bg-slate-100/70 hover:border-royal-300 transition-all cursor-pointer space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">{evt.title}</p>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                isToday
                                  ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300'
                                  : evt.category === 'Exams'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isToday ? 'TODAY' : evt.category}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(evt.event_date + 'T00:00:00Z').toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                timeZone: 'UTC',
                              })}
                              {evt.event_time ? ` at ${evt.event_time}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {evt.reminders?.length ? `${evt.reminders.length} reminder(s)` : 'No reminder'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                      <p>No upcoming dates or reminders scheduled.</p>
                      <button
                        onClick={() => setActiveTab('dates')}
                        className="text-royal-600 font-bold hover:underline"
                      >
                        Add your first academic date
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: SECURE CERTIFICATES (PIN-Protected Vault) */}
        {/* ========================================================================= */}
        {activeTab === 'certificates' && <SecureCertificatesView />}

        {/* ========================================================================= */}
        {/* VIEW 5: PICTURES (Private Photo Gallery) */}
        {/* ========================================================================= */}
        {activeTab === 'pictures' && <PicturesGalleryView />}

        {/* ========================================================================= */}
        {/* VIEW 6: IMPORTANT DATES & EMAIL REMINDERS (Interactive Calendar & Reminders) */}
        {/* ========================================================================= */}
        {activeTab === 'dates' && <ImportantDatesView />}

        {/* ========================================================================= */}
        {/* VIEW 7: UNIFIED RECYCLE BIN (Documents, Certificates, Pictures) */}
        {/* ========================================================================= */}
        {activeTab === 'recycle-bin' && <RecycleBinView />}

        {/* ========================================================================= */}
        {/* VIEW 8: HELP & SUPPORT */}
        {/* ========================================================================= */}
        {activeTab === 'help' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-navy-950">Student Safe Vault Help & Assistance</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guides on file recovery, document encryption, and academic verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h3 className="text-sm font-bold text-navy-950">How are my uploaded documents protected?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Documents are stored in a private Supabase Storage bucket with Row-Level Security policies. Only signed, short-lived URLs generated for your authenticated account ID can preview or download them.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h3 className="text-sm font-bold text-navy-950">Can other students see my documents?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    No. Every student has an isolated storage directory restricted to their Supabase user UUID. Direct public access is completely blocked.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h3 className="text-sm font-bold text-navy-950">How does the 30-day Recycle Bin work?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When you delete a document, it is moved to the Recycle Bin with a 30-day countdown timer. You can restore it to its original category with one click at any time.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h3 className="text-sm font-bold text-navy-950">Need direct student support?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Contact our student privacy team at <strong>support@studentsafevault.edu</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default StudentDashboard;
