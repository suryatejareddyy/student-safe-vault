import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Lock, GraduationCap, Heart, ExternalLink, HelpCircle, FileText } from 'lucide-react';
import { ViewType } from './Navbar';

interface FooterProps {
  onNavigate: (view: ViewType, subSection?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-navy-950 border-t border-slate-800 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: Logo & Mission (spans 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="cursor-pointer" onClick={() => onNavigate('home')}>
              <Logo size="lg" variant="dark" />
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Student Safe Vault is the sovereign digital locker engineered exclusively for students, researchers, and academic institutions. All records are shielded by zero-knowledge client architecture.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-royal-900/60 text-royal-300 border border-royal-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-royal-400" />
                Zero-Knowledge Privacy
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                End-to-End Encrypted
              </span>
            </div>
          </div>

          {/* Column 2: Digital Vault Features */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Locker Features</h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard', 'documents')}
                  className="hover:text-royal-400 transition-colors text-left"
                >
                  Document Storage
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard', 'certificates')}
                  className="hover:text-royal-400 transition-colors text-left"
                >
                  Secure Certificates
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard', 'profile')}
                  className="hover:text-royal-400 transition-colors text-left"
                >
                  Personal Information
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard', 'pictures')}
                  className="hover:text-royal-400 transition-colors text-left"
                >
                  Student Identity Pictures
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard', 'dates')}
                  className="hover:text-royal-400 transition-colors text-left"
                >
                  Important Academic Dates
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard', 'recycle-bin')}
                  className="hover:text-royal-400 transition-colors text-left"
                >
                  30-Day Recycle Bin
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Navigation */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Portals</h4>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-royal-400 transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('student-dashboard')} className="hover:text-royal-400 transition-colors">
                  Student Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-royal-400 transition-colors">
                  Student Sign In
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('register')} className="hover:text-royal-400 transition-colors">
                  Student Registration
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin-dashboard')} className="text-amber-400/90 hover:text-amber-300 transition-colors font-medium">
                  Administrator Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Trust & Academic Security */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Institutional Trust</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed for universities, colleges, and high schools. Compliant with student data protection principles and academic credential verification standards.
            </p>
            <div className="pt-2 text-xs text-slate-500">
              <p>Frontend Mockup v1.0.0</p>
              <p className="mt-1">Navy & Royal Blue Theme</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Student Safe Vault. All academic rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Your Documents. Your Privacy. Your Future.</span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Vault Protected
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
