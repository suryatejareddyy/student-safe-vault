import React, { useState } from 'react';
import { Logo } from './Logo';
import { 
  Menu, 
  X, 
  ShieldCheck, 
  LayoutDashboard, 
  Sparkles, 
  HelpCircle, 
  Info, 
  LogIn, 
  UserPlus, 
  ShieldAlert 
} from 'lucide-react';

export type ViewType = 'home' | 'login' | 'register' | 'student-dashboard' | 'admin-dashboard';

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType, subSection?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: ViewType, subSection?: string) => {
    onNavigate(view, subSection);
    setMobileMenuOpen(false);
  };

  const isDarkNav = currentView === 'home' || currentView === 'login' || currentView === 'register';

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 backdrop-blur-md border-b ${
        isDarkNav
          ? 'bg-navy-950/85 border-slate-800/80 text-white'
          : 'bg-white/90 border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex-shrink-0 cursor-pointer py-1" onClick={() => handleNav('home')}>
            <Logo 
              size="md" 
              variant={isDarkNav ? 'dark' : 'light'} 
            />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => handleNav('home')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === 'home'
                  ? isDarkNav
                    ? 'text-white bg-slate-800/80 shadow-sm'
                    : 'text-royal-600 bg-royal-50 font-semibold'
                  : isDarkNav
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Home
            </button>

            <button
              onClick={() => handleNav('student-dashboard')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                currentView === 'student-dashboard'
                  ? isDarkNav
                    ? 'text-white bg-royal-700/80'
                    : 'text-royal-600 bg-royal-50 font-semibold'
                  : isDarkNav
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-royal-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleNav('home', 'features')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isDarkNav
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Features
            </button>

            <button
              onClick={() => handleNav('home', 'about')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isDarkNav
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              About
            </button>

            <button
              onClick={() => handleNav('home', 'help')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isDarkNav
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Help
            </button>

            {/* Quick link to Admin Portal for review */}
            <button
              onClick={() => handleNav('admin-dashboard')}
              className={`px-3 py-1.5 ml-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${
                currentView === 'admin-dashboard'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isDarkNav
                  ? 'border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-400/50 hover:bg-slate-800/60'
                  : 'border-slate-300 text-slate-500 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50'
              }`}
              title="Admin Verification Portal"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Portal</span>
            </button>
          </nav>

          {/* Desktop Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => handleNav('login')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                currentView === 'login'
                  ? 'bg-royal-600 text-white shadow-md shadow-royal-600/20'
                  : isDarkNav
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700/60'
                  : 'text-slate-700 hover:text-royal-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>

            <button
              onClick={() => handleNav('register')}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 shadow-md shadow-royal-600/30 hover:shadow-royal-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-500 ${
                isDarkNav
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden px-4 pt-2 pb-6 border-t ${
            isDarkNav
              ? 'bg-navy-950 border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-800 shadow-lg'
          }`}
        >
          <div className="flex flex-col space-y-2 pt-2">
            <button
              onClick={() => handleNav('home')}
              className={`text-left px-3 py-2.5 rounded-lg text-base font-medium ${
                currentView === 'home'
                  ? 'bg-royal-600 text-white'
                  : isDarkNav ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('student-dashboard')}
              className={`text-left px-3 py-2.5 rounded-lg text-base font-medium flex items-center gap-2 ${
                currentView === 'student-dashboard'
                  ? 'bg-royal-600 text-white'
                  : isDarkNav ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-royal-400" />
              Student Dashboard
            </button>
            <button
              onClick={() => handleNav('home', 'features')}
              className={`text-left px-3 py-2.5 rounded-lg text-base font-medium ${
                isDarkNav ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => handleNav('home', 'about')}
              className={`text-left px-3 py-2.5 rounded-lg text-base font-medium ${
                isDarkNav ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              About
            </button>
            <button
              onClick={() => handleNav('home', 'help')}
              className={`text-left px-3 py-2.5 rounded-lg text-base font-medium ${
                isDarkNav ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Help & FAQ
            </button>
            <button
              onClick={() => handleNav('admin-dashboard')}
              className="text-left px-3 py-2.5 rounded-lg text-base font-medium text-amber-400 hover:bg-slate-800 flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Admin Portal
            </button>

            <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2.5">
              <button
                onClick={() => handleNav('login')}
                className="w-full text-center py-2.5 rounded-lg text-base font-semibold border border-slate-700 text-white hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                onClick={() => handleNav('register')}
                className="w-full text-center py-2.5 rounded-lg text-base font-semibold text-white bg-royal-600 hover:bg-royal-500 shadow-md flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Sign Up / Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
