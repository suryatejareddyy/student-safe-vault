import React, { useState, useEffect } from 'react';
import { Navbar, ViewType } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { AuthView } from './views/AuthView';
import { StudentDashboard } from './views/StudentDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  Home, 
  LogIn, 
  UserPlus, 
  GraduationCap, 
  ShieldAlert, 
  Compass, 
  ChevronUp, 
  ChevronDown,
  ShieldCheck,
  User,
  LogOut,
  AlertCircle
} from 'lucide-react';

const MainApp: React.FC = () => {
  const {
    user,
    session,
    profile,
    loading,
    isAdmin,
    accountDisabledError,
    clearAccountDisabledError,
    isEmailVerified,
    isPasswordRecoveryMode,
    signOut,
  } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [studentInitialTab, setStudentInitialTab] = useState<string>('dashboard');
  const [demoSwitcherOpen, setDemoSwitcherOpen] = useState(true);
  const [authBannerNotice, setAuthBannerNotice] = useState<string | null>(null);

  // If password recovery link was clicked, switch directly to auth recovery view
  useEffect(() => {
    if (isPasswordRecoveryMode) {
      setCurrentView('login');
    }
  }, [isPasswordRecoveryMode]);

  // Protected Route Guard: Redirect unauthenticated students away from student-dashboard
  useEffect(() => {
    if (!loading && currentView === 'student-dashboard' && !user) {
      setAuthBannerNotice('Access Denied: Please sign in to your student account to access the private locker.');
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, user, loading]);

  // Protected Route Guard: Redirect unauthorized users away from admin-dashboard
  useEffect(() => {
    if (!loading && currentView === 'admin-dashboard') {
      if (!user) {
        setAuthBannerNotice('Access Denied: Please sign in with an authorized administrator account.');
        setCurrentView('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (!isAdmin) {
        setAuthBannerNotice('Access Restricted: Your account does not have administrator privileges. Redirected to student locker.');
        setCurrentView('student-dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentView, user, isAdmin, loading]);

  // Account Disabled Alert
  useEffect(() => {
    if (accountDisabledError) {
      setAuthBannerNotice(accountDisabledError);
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [accountDisabledError]);

  const handleNavigate = (view: ViewType, subSection?: string) => {
    // If trying to access student dashboard while not logged in
    if (view === 'student-dashboard' && !user) {
      setAuthBannerNotice('Protected Locker: Please sign in to access your student safe vault.');
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If trying to access admin dashboard
    if (view === 'admin-dashboard') {
      if (!user) {
        setAuthBannerNotice('Access Denied: Please sign in with an authorized administrator account.');
        setCurrentView('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!isAdmin) {
        setAuthBannerNotice('Access Restricted: Your account does not have administrator privileges.');
        setCurrentView('student-dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setAuthBannerNotice(null);
    setCurrentView(view);

    if (view === 'student-dashboard' && subSection) {
      setStudentInitialTab(subSection);
    } else if (view === 'home' && subSection) {
      setTimeout(() => {
        const el = document.getElementById(subSection);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-950 font-sans">
      {/* Protected Route Banner Alert */}
      {authBannerNotice && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-3 text-xs sm:text-sm flex items-center justify-between z-50">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{authBannerNotice}</span>
          </div>
          <button onClick={() => setAuthBannerNotice(null)} className="text-rose-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Global Navigation Bar on Home and Auth pages */}
      {(currentView === 'home' || currentView === 'login' || currentView === 'register') && (
        <Navbar currentView={currentView} onNavigate={handleNavigate} />
      )}

      {/* Primary Page Router */}
      <div className="flex-1">
        {currentView === 'home' && <HomeView onNavigate={handleNavigate} />}

        {currentView === 'login' && (
          <AuthView initialMode="login" onNavigate={handleNavigate} />
        )}

        {currentView === 'register' && (
          <AuthView initialMode="register" onNavigate={handleNavigate} />
        )}

        {currentView === 'student-dashboard' && (
          <StudentDashboard
            initialTab={studentInitialTab}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard onNavigate={handleNavigate} />
        )}
      </div>

      {/* Global Footer on Home and Auth pages */}
      {(currentView === 'home' || currentView === 'login' || currentView === 'register') && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Quick Interactive Prototype Demo View Switcher */}
      <aside 
        aria-label="Frontend Prototype View Switcher" 
        className="fixed bottom-4 left-4 z-50 select-none print:hidden"
      >
        <div className="bg-navy-950/95 text-white border border-royal-700/60 shadow-2xl rounded-2xl p-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-1.5 pb-2 border-b border-slate-800 text-[11px] font-bold text-royal-300">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Prototype View Switcher</span>
            </div>
            <button
              onClick={() => setDemoSwitcherOpen(!demoSwitcherOpen)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
              title={demoSwitcherOpen ? 'Minimize Switcher' : 'Expand Switcher'}
            >
              {demoSwitcherOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {demoSwitcherOpen && (
            <div className="pt-2 space-y-2">
              {/* User Session Status */}
              <div className="px-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Session:</span>
                {user ? (
                  <span className="text-emerald-400 font-semibold truncate max-w-[150px]">
                    ● {profile?.full_name || user.email}
                  </span>
                ) : (
                  <span className="text-slate-400">Unauthenticated</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => handleNavigate('home')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    currentView === 'home'
                      ? 'bg-royal-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => handleNavigate('login')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    currentView === 'login'
                      ? 'bg-royal-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>

                <button
                  onClick={() => handleNavigate('register')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    currentView === 'register'
                      ? 'bg-royal-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>

                <button
                  onClick={() => handleNavigate('student-dashboard')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    currentView === 'student-dashboard'
                      ? 'bg-royal-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-royal-400" />
                  <span>Student Locker</span>
                </button>

                <button
                  onClick={() => handleNavigate('admin-dashboard')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    currentView === 'admin-dashboard'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin View</span>
                </button>

                {user && (
                  <button
                    onClick={async () => {
                      await signOut();
                      handleNavigate('home');
                    }}
                    className="px-2 py-1.5 rounded-lg font-semibold text-rose-400 hover:text-rose-300 bg-slate-900 hover:bg-slate-800 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

import { DocumentsProvider } from './context/DocumentsContext';
import { CertificatesProvider } from './context/CertificatesContext';
import { PicturesProvider } from './context/PicturesContext';
import { ImportantDatesProvider } from './context/ImportantDatesContext';
import { AdminProvider } from './context/AdminContext';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AdminProvider>
        <DocumentsProvider>
          <CertificatesProvider>
            <PicturesProvider>
              <ImportantDatesProvider>
                <MainApp />
              </ImportantDatesProvider>
            </PicturesProvider>
          </CertificatesProvider>
        </DocumentsProvider>
      </AdminProvider>
    </AuthProvider>
  );
};

export default App;
