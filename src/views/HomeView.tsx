import React, { useState } from 'react';
import { SecurityAcademicBackground, AcademicWatermark } from '../components/BackgroundPatterns';
import { Logo } from '../components/Logo';
import { ViewType } from '../components/Navbar';
import {
  User,
  FolderLock,
  Award,
  Image as ImageIcon,
  Calendar,
  Trash2,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  KeyRound,
  FileCheck2,
  EyeOff,
  Clock,
  Layers,
  HelpCircle,
  School,
  ExternalLink,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: ViewType, subSection?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const featureCards = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description:
        'Securely store student identity records, government & institutional IDs, emergency contacts, and academic profiles behind biometric-ready encryption.',
      icon: User,
      badge: 'Confidential',
      highlightColor: 'from-blue-500/20 to-royal-600/10',
      iconColor: 'text-royal-400',
      borderColor: 'border-royal-500/30',
      action: () => onNavigate('student-dashboard', 'profile'),
    },
    {
      id: 'document-storage',
      title: 'Document Storage',
      description:
        'Store university transcripts, semester mark sheets, admit cards, recommendation letters, and syllabi organized into smart auto-indexed folders.',
      icon: FolderLock,
      badge: 'Auto-Organized',
      highlightColor: 'from-sky-500/20 to-blue-600/10',
      iconColor: 'text-sky-400',
      borderColor: 'border-sky-500/30',
      action: () => onNavigate('student-dashboard', 'documents'),
    },
    {
      id: 'secure-certificates',
      title: 'Secure Certificates',
      description:
        'Preserve degrees, diplomas, course completion certifications, and awards with tamper-evident digital verification seals and verification QR codes.',
      icon: Award,
      badge: 'Tamper-Evident',
      highlightColor: 'from-amber-500/20 to-royal-600/10',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      action: () => onNavigate('student-dashboard', 'certificates'),
    },
    {
      id: 'student-pictures',
      title: 'Pictures & Photos',
      description:
        'Safely store high-resolution passport photos, institutional ID portraits, project exhibition moments, and convocation memories in a protected gallery.',
      icon: ImageIcon,
      badge: 'Private Gallery',
      highlightColor: 'from-indigo-500/20 to-blue-600/10',
      iconColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/30',
      action: () => onNavigate('student-dashboard', 'pictures'),
    },
    {
      id: 'important-dates',
      title: 'Important Dates',
      description:
        'Never miss exam fee deadlines, scholarship application cutoffs, semester re-registration dates, or credential renewal deadlines with intelligent tracking.',
      icon: Calendar,
      badge: 'Smart Reminders',
      highlightColor: 'from-emerald-500/20 to-royal-600/10',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      action: () => onNavigate('student-dashboard', 'dates'),
    },
    {
      id: 'recycle-bin',
      title: 'Recycle Bin',
      description:
        'Accidentally deleted a document? Retrieve soft-deleted transcripts and photos within a 30-day safety grace period before permanent cryptographic wiping.',
      icon: Trash2,
      badge: '30-Day Recovery',
      highlightColor: 'from-rose-500/20 to-royal-600/10',
      iconColor: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      action: () => onNavigate('student-dashboard', 'recycle-bin'),
    },
  ];

  const faqs = [
    {
      q: 'How does Student Safe Vault protect my confidential records?',
      a: 'Student Safe Vault operates on a zero-knowledge architecture. Every document is encrypted client-side using military-grade AES-256 before transit. Only your authenticated credentials hold the decryption keys.',
    },
    {
      q: 'Can administrators or university staff view my private files?',
      a: 'No. The administrator portal strictly monitors account verification, active enrollment status, and security compliance. Administrators never have access to private locker contents or decrypted files.',
    },
    {
      q: 'What happens if I accidentally delete an important certificate?',
      a: 'Every deleted item is transferred to your personal Recycle Bin with a 30-day countdown timer. You can restore your files with a single click at any time before permanent deletion.',
    },
    {
      q: 'Which file formats are supported for document storage?',
      a: 'Student Safe Vault supports PDF, DOCX, PNG, JPG, JPEG, and scanned academic credentials up to 50MB per file with automatic optical previewing.',
    },
  ];

  return (
    <SecurityAcademicBackground>
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Top Pill Announcement */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-royal-950/80 border border-royal-700/60 shadow-lg shadow-royal-900/40 text-royal-300 text-xs sm:text-sm font-medium backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-royal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-royal-500"></span>
            </span>
            <span>Next-Generation Academic Digital Locker</span>
            <span className="text-slate-500">•</span>
            <span className="text-white font-semibold flex items-center gap-1">
              Zero-Knowledge Vault
            </span>
          </div>

          {/* Core Headline Required by Prompt */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12]">
            Your Documents. <br />
            <span className="bg-gradient-to-r from-blue-400 via-royal-400 to-indigo-300 bg-clip-text text-transparent">
              Your Privacy.
            </span>{' '}
            <br />
            Your Future.
          </h1>

          {/* Subtitle Description */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The encrypted institutional vault engineered specifically for students. Consolidate your transcripts, certificates, identity cards, and academic achievements in one secure sovereign locker.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-royal-600 via-blue-600 to-royal-700 hover:from-royal-500 hover:to-blue-500 shadow-xl shadow-royal-600/30 hover:shadow-royal-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-slate-100 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 backdrop-blur-sm transition-all flex items-center justify-center gap-2.5 shadow-md"
            >
              <KeyRound className="w-4 h-4 text-royal-400" />
              <span>Student Login</span>
            </button>

            <button
              onClick={() => onNavigate('student-dashboard')}
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-base font-semibold text-royal-300 hover:text-white bg-royal-950/40 hover:bg-royal-900/60 border border-royal-800/60 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Explore Locker Preview</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-800/80">
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl font-black text-white">256-Bit</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1">AES Encryption</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl font-black text-white">100%</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1">Zero-Knowledge</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl font-black text-white">Instant</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1">Credential Share</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl font-black text-white">30 Days</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1">Recycle Recovery</span>
            </div>
          </div>
        </div>

        {/* Decorative Watermark Silhouette */}
        <AcademicWatermark className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] text-royal-500" />
      </section>

      {/* 2. CORE FEATURES SECTION (6 Features required by prompt) */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-royal-900/60 text-royal-400 text-xs font-semibold uppercase tracking-wider border border-royal-700/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            Locker Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Everything A Student Needs, Guarded In One Vault
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Tailored specifically for modern academic journeys, from undergraduate admissions to doctoral dissertations.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {featureCards.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={feat.action}
                className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-navy-900/90 border border-slate-800 hover:border-royal-500/60 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-royal-900/30 flex flex-col justify-between cursor-pointer overflow-hidden"
              >
                {/* Ambient Card Background Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-royal-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* Top Bar with Icon and Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 ${feat.iconColor} group-hover:scale-110 group-hover:bg-royal-950 transition-all`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 group-hover:border-royal-600/50 group-hover:text-royal-300 transition-colors">
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-royal-300 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>

                {/* Bottom CTA Link */}
                <div className="relative z-10 pt-6 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-royal-400 group-hover:text-royal-300">
                  <span>Explore Module</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. ABOUT & PRIVACY GUARANTEE */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-navy-900 via-slate-900 to-navy-900 border border-slate-800 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-royal-900/60 text-royal-400 text-xs font-semibold uppercase tracking-wider border border-royal-700/40">
                <School className="w-3.5 h-3.5" />
                The Academic Sovereign Vault
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Designed for Students, Not for Data Harvesters.
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Traditional cloud drives mix student essays with personal photos, lack academic verification seals, and monetize telemetry. <strong>Student Safe Vault</strong> was architected from the ground up for university credentials.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">
                    <strong className="text-white">Zero Administrative Surveillance:</strong> University staff cannot inspect your personal documents or sensitive certificates.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">
                    <strong className="text-white">Tamper-Proof Verification:</strong> Generate verifiable cryptographic links to share marksheets directly with graduate recruiters.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">
                    <strong className="text-white">Lifelong Alumni Access:</strong> Your safe vault remains active even after graduating from your university.
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Vault Mockup Badge */}
            <div className="flex justify-center">
              <div className="relative p-8 rounded-2xl bg-navy-950/90 border border-royal-700/40 shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                  <Logo size="md" variant="dark" />
                  <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold">
                    STATUS: SECURE
                  </span>
                </div>
                <div className="py-6 space-y-4">
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-royal-950 text-royal-400">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">Degree_Transcript_2026.pdf</p>
                        <p className="text-[10px] text-slate-400">SHA-256 Verified • Encrypted</p>
                      </div>
                    </div>
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-royal-950 text-royal-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">Deans_Honor_Roll_Certificate.pdf</p>
                        <p className="text-[10px] text-slate-400">Digitally Stamped</p>
                      </div>
                    </div>
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div className="text-center pt-2">
                  <button
                    onClick={() => onNavigate('student-dashboard')}
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-royal-600 hover:bg-royal-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Launch Student Safe Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HELP & FAQ SECTION */}
      <section id="help" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-royal-900/60 text-royal-400 text-xs font-semibold uppercase tracking-wider border border-royal-700/40">
            <HelpCircle className="w-3.5 h-3.5" />
            Support & Answers
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-sm">
            Everything you need to know about security, certificates, and privacy protections.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-base font-semibold text-white hover:text-royal-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-royal-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FINAL GET STARTED CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-royal-900/40 to-navy-950 border border-royal-700/50 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Take Charge of Your Academic Records Today
            </h2>
            <p className="text-slate-300 text-base max-w-xl mx-auto">
              Create your sovereign student locker in under 2 minutes. Free for all enrolled students.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-royal-600 hover:bg-royal-500 shadow-lg shadow-royal-600/30 transition-all"
              >
                Register Safe Vault
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                Existing Student Sign In
              </button>
            </div>
          </div>
        </div>
      </section>
    </SecurityAcademicBackground>
  );
};

export default HomeView;
