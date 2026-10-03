import React, { useState, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  FileCheck,
  UploadCloud,
  Search,
  Eye,
  Download,
  Trash2,
  Edit2,
  Tag,
  AlertTriangle,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import {
  useCertificates,
  CertificateItem,
  CertificateCategory,
  CERTIFICATE_CATEGORIES,
} from '../context/CertificatesContext';

export const SecureCertificatesView: React.FC = () => {
  const {
    certificates,
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
  } = useCertificates();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');

  // Modal states
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Active items for modals
  const [previewCert, setPreviewCert] = useState<CertificateItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [renameCert, setRenameCert] = useState<CertificateItem | null>(null);
  const [newCertName, setNewCertName] = useState<string>('');
  const [categoryCert, setCategoryCert] = useState<CertificateItem | null>(null);
  const [newSelectedCategory, setNewSelectedCategory] = useState<CertificateCategory>('Academic Certificates');
  const [deleteConfirmCert, setDeleteConfirmCert] = useState<CertificateItem | null>(null);

  // PIN Form inputs
  const [pinInput, setPinInput] = useState<string>('');
  const [pinConfirmInput, setPinConfirmInput] = useState<string>('');
  const [pinCurrentInput, setPinCurrentInput] = useState<string>('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState<string>('');
  const [recoveryNewPinInput, setRecoveryNewPinInput] = useState<string>('');
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<CertificateCategory>('Academic Certificates');
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Format countdown minutes and seconds
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Filter & Sort
  const filteredCertificates = certificates
    .filter((cert) => {
      const matchesSearch = cert.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || cert.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.file_size - a.file_size;
      return 0;
    });

  // Category counts
  const categoryCounts = CERTIFICATE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = certificates.filter((c) => c.category === cat).length;
    return acc;
  }, {});

  // Handlers
  const handleOpenUnlock = () => {
    setPinError(null);
    setPinInput('');
    if (!hasPin) {
      setShowSetupModal(true);
    } else {
      setShowPinModal(true);
    }
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const result = await verifyPin(pinInput);
    if (result.success) {
      setShowPinModal(false);
      setPinInput('');
      showToast('Vault unlocked successfully! 5-minute session started.');
    } else {
      setPinError(result.error || 'Incorrect PIN.');
    }
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pinInput !== pinConfirmInput) {
      setPinError('PIN entries do not match. Please re-enter.');
      return;
    }
    const result = await setupPin(pinInput);
    if (result.success) {
      setShowSetupModal(false);
      setPinInput('');
      setPinConfirmInput('');
      showToast('6-digit security PIN configured! Vault unlocked.');
    } else {
      setPinError(result.error || 'Failed to setup PIN.');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pinInput !== pinConfirmInput) {
      setPinError('New PIN entries do not match.');
      return;
    }
    const result = await changePin(pinCurrentInput, pinInput);
    if (result.success) {
      setShowChangePinModal(false);
      setPinCurrentInput('');
      setPinInput('');
      setPinConfirmInput('');
      showToast('Security PIN changed successfully!');
    } else {
      setPinError(result.error || 'Failed to change PIN.');
    }
  };

  const handleRequestRecoveryCode = async () => {
    setPinError(null);
    const result = await requestRecoveryCode();
    if (result.success && result.recoveryCode) {
      setIssuedRecoveryCode(result.recoveryCode);
      showToast('One-time recovery code generated. Valid for 15 minutes.');
    } else {
      setPinError(result.error || 'Failed to generate recovery code.');
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const result = await resetPinWithRecoveryCode(recoveryCodeInput, recoveryNewPinInput);
    if (result.success) {
      setShowRecoveryModal(false);
      setRecoveryCodeInput('');
      setRecoveryNewPinInput('');
      setIssuedRecoveryCode(null);
      showToast('PIN reset successfully! Vault unlocked.');
    } else {
      setPinError(result.error || 'Failed to reset PIN.');
    }
  };

  // Preview
  const handlePreview = async (cert: CertificateItem) => {
    if (!isUnlocked) {
      handleOpenUnlock();
      return;
    }
    setPreviewCert(cert);
    setPreviewLoading(true);
    setPreviewUrl(null);
    const res = await getSignedPreviewUrl(cert);
    if (res.url) {
      setPreviewUrl(res.url);
    } else {
      showToast('Failed to load secure preview.');
    }
    setPreviewLoading(false);
  };

  // Download
  const handleDownload = async (cert: CertificateItem) => {
    if (!isUnlocked) {
      handleOpenUnlock();
      return;
    }
    showToast(`Downloading "${cert.name}"...`);
    const res = await downloadCertificate(cert);
    if (res.error) {
      showToast(`Download failed: ${res.error.message}`);
    } else {
      showToast(`Downloaded "${cert.name}" successfully.`);
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please choose a certificate file to upload.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);

    const res = await uploadCertificate(uploadFile, uploadCategory);
    setUploadLoading(false);

    if (res.error) {
      setUploadError(res.error.message);
    } else {
      setShowUploadModal(false);
      setUploadFile(null);
      showToast(`Certificate "${uploadFile.name}" secured successfully!`);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-950 text-white border border-royal-500/60 shadow-2xl rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-navy-900 to-royal-800 text-white shadow-md flex-shrink-0">
              <Shield className="w-7 h-7 text-royal-300" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-royal-50 text-royal-700 text-[11px] font-bold uppercase tracking-wider border border-royal-200">
                <Lock className="w-3 h-3" />
                PIN-Protected Sovereign Storage
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight">
                Your Certificates, Extra Protected
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                Academic credentials, verified marksheets, and official government certificates are protected by zero-knowledge salted PIN hashing. Access requires active session authorization.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isUnlocked ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <Unlock className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Unlocked ({formatCountdown(autoLockSecondsRemaining)})</span>
                </div>
                <button
                  onClick={lockSection}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Lock Vault Now"
                >
                  <Lock className="w-4 h-4 text-slate-600" />
                  <span>Lock Vault</span>
                </button>
                <button
                  onClick={() => {
                    setPinError(null);
                    setShowChangePinModal(true);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <KeyRound className="w-4 h-4 text-slate-600" />
                  <span>Change PIN</span>
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Certificate</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Vault Locked</span>
                </div>
                {hasPin ? (
                  <button
                    onClick={handleOpenUnlock}
                    className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Enter PIN to Access</span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenUnlock}
                    className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Set Up 6-Digit PIN</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* LOCKED STATE BANNER */}
      {!isUnlocked && (
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-royal-950 rounded-2xl p-8 sm:p-12 text-center text-white border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-royal-600/20 border border-royal-500/40 flex items-center justify-center text-royal-300 shadow-inner">
            <Lock className="w-10 h-10 text-royal-400" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Certificate Vault is Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Certificate previews, downloads, and file uploads are guarded by double-verified PIN authentication. Auto-locks after 5 minutes of inactivity.
            </p>
          </div>

          {isLockedOut ? (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-900/60 border border-rose-500/60 text-rose-200 text-xs space-y-2">
              <div className="flex items-center justify-center gap-2 font-bold text-rose-100">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Temporary Lockout Active</span>
              </div>
              <p>
                Too many incorrect attempts. Vault locked until{' '}
                <strong>{lockedUntil ? new Date(lockedUntil).toLocaleTimeString() : '15 minutes'}</strong>.
              </p>
              <button
                onClick={() => {
                  setPinError(null);
                  setShowRecoveryModal(true);
                }}
                className="text-xs font-bold text-royal-300 hover:underline pt-1 block mx-auto"
              >
                Recover PIN with One-Time Code
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleOpenUnlock}
                className="w-full sm:w-auto px-6 py-3 bg-royal-600 hover:bg-royal-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{hasPin ? 'Unlock Vault with PIN' : 'Configure Security PIN'}</span>
              </button>
              {hasPin && (
                <button
                  onClick={() => {
                    setPinError(null);
                    setShowRecoveryModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold rounded-xl transition-all text-xs"
                >
                  Forgot PIN?
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* UNLOCKED VAULT CONTENT */}
      {isUnlocked && (
        <div className="space-y-6">
          {/* SEARCH, CATEGORIES, CONTROLS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search certificates by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              {/* Sort & View toggles */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="size">Size (Largest)</option>
                  </select>
                </div>

                <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-xs text-royal-600' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-xs text-royal-600' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'All'
                    ? 'bg-navy-950 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>All Categories</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {certificates.length}
                </span>
              </button>

              {CERTIFICATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-royal-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedCategory === cat ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {categoryCounts[cat] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CERTIFICATES LIST / GRID */}
          {filteredCertificates.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-2xl border border-slate-200 p-6 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          PIN Protected
                        </span>
                      </div>

                      <div className="mt-4 space-y-1">
                        <h3 className="text-sm font-bold text-navy-950 line-clamp-2" title={cert.name}>
                          {cert.name}
                        </h3>
                        <p className="text-xs text-royal-600 font-semibold">{cert.category}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Uploaded:</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(cert.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">File Size:</span>
                          <span className="font-mono text-slate-800">
                            {(cert.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">File Format:</span>
                          <span className="uppercase text-[10px] font-bold text-slate-600">
                            {cert.file_type.split('/').pop() || 'PDF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePreview(cert)}
                          className="p-2 rounded-lg bg-royal-50 hover:bg-royal-100 text-royal-700 transition-colors"
                          title="Preview Certificate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(cert)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Download Certificate"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setRenameCert(cert);
                            setNewCertName(cert.name);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCategoryCert(cert);
                            setNewSelectedCategory(cert.category);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                          title="Change Category"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCert(cert)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Certificate Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Uploaded</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-navy-950 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span className="truncate max-w-xs">{cert.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-royal-600">{cert.category}</td>
                        <td className="py-3.5 px-4 font-mono">{(cert.file_size / 1024).toFixed(0)} KB</td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(cert.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Protected
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handlePreview(cert)}
                              className="p-1.5 rounded-lg hover:bg-royal-50 text-royal-600"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(cert)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setRenameCert(cert);
                                setNewCertName(cert.name);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCategoryCert(cert);
                                setNewSelectedCategory(cert.category);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                              title="Change Category"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmCert(cert)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                              title="Move to Recycle Bin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3 shadow-sm">
              <FileCheck className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">No protected certificates found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All'
                  ? 'No certificates match your search filters.'
                  : 'Start securing your graduation certificates, marksheets, and official credentials now.'}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 px-4 py-2 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload First Certificate</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ENTER PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-royal-50 text-royal-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Enter Vault PIN</h3>
              <p className="text-xs text-slate-500">
                Please enter your 6-digit security PIN to unlock access to protected credentials.
              </p>
            </div>

            <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {pinError}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>{remainingAttempts} attempt(s) remaining</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setShowRecoveryModal(true);
                  }}
                  className="text-royal-600 font-bold hover:underline"
                >
                  Forgot PIN?
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  Unlock Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SETUP PIN MODAL */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-royal-50 text-royal-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Set Up 6-Digit Vault PIN</h3>
              <p className="text-xs text-slate-500">
                Choose a strong 6-digit PIN. Never use repetitive or sequential numbers (e.g. 123456 or 000000).
              </p>
            </div>

            <form onSubmit={handleSetupPinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Create 6-Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinConfirmInput}
                  onChange={(e) => setPinConfirmInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {pinError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length !== 6 || pinConfirmInput.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  Save & Secure PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE PIN MODAL */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowChangePinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-royal-50 text-royal-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Change Security PIN</h3>
              <p className="text-xs text-slate-500">
                Enter your current PIN followed by your new 6-digit PIN.
              </p>
            </div>

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinCurrentInput}
                  onChange={(e) => setPinCurrentInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.3em] font-mono text-lg py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New 6-Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.3em] font-mono text-lg py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinConfirmInput}
                  onChange={(e) => setPinConfirmInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.3em] font-mono text-lg py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {pinError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinCurrentInput.length !== 6 || pinInput.length !== 6 || pinConfirmInput.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PIN RECOVERY MODAL */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setShowRecoveryModal(false);
                setIssuedRecoveryCode(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Recover Vault Access</h3>
              <p className="text-xs text-slate-500">
                Generate a one-time verification recovery code to reset your PIN.
              </p>
            </div>

            {!issuedRecoveryCode ? (
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  A 6-digit recovery code will be authorized for your authenticated student account. Codes expire in 15 minutes.
                </div>
                <button
                  onClick={handleRequestRecoveryCode}
                  className="w-full py-2.5 bg-royal-600 hover:bg-royal-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  Generate One-Time Recovery Code
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPinSubmit} className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <p className="font-bold">One-Time Recovery Code:</p>
                  <p className="font-mono text-xl text-emerald-950 tracking-widest my-1">{issuedRecoveryCode}</p>
                  <p className="text-[10px] text-emerald-700">Enter this code below along with your new 6-digit PIN.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enter Recovery Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={recoveryCodeInput}
                    onChange={(e) => setRecoveryCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="6-digit code"
                    className="w-full text-center tracking-widest font-mono text-lg py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New 6-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={recoveryNewPinInput}
                    onChange={(e) => setRecoveryNewPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-widest font-mono text-lg py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>

                {pinError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    {pinError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setIssuedRecoveryCode(null);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryCodeInput.length !== 6 || recoveryNewPinInput.length !== 6}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    Verify & Reset PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: UPLOAD CERTIFICATE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-royal-100 text-royal-700">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-950">Secure New Certificate</h3>
                <p className="text-xs text-slate-500">Stored in encrypted private storage with PIN authorization.</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-royal-500 bg-royal-50/50'
                    : uploadFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-royal-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />

                <UploadCloud className="w-8 h-8 mx-auto text-royal-600 mb-2" />
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{uploadFile.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(uploadFile.size / 1024).toFixed(0)} KB • Click to change file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700">Click or drag certificate here</p>
                    <p className="text-[11px] text-slate-400">
                      PDF, JPG, JPEG, or PNG • Strict 5 MB maximum limit
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Certificate Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as CertificateCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                >
                  {CERTIFICATE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {uploadError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !uploadFile}
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Seal Certificate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: PREVIEW MODAL */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <FileCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-navy-950 truncate" title={previewCert.name}>
                    {previewCert.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {previewCert.category} • {(previewCert.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewCert)}
                  className="px-3 py-1.5 bg-royal-600 hover:bg-royal-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
              {previewLoading ? (
                <div className="text-white text-xs flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-royal-400" />
                  <span>Authorizing encrypted preview...</span>
                </div>
              ) : previewUrl ? (
                previewCert.file_type.includes('image') ? (
                  <img
                    src={previewUrl}
                    alt={previewCert.name}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    title={previewCert.name}
                    className="w-full h-full rounded-lg bg-white"
                  />
                )
              ) : (
                <div className="text-white text-xs">Preview unavailable.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: RENAME MODAL */}
      {renameCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-navy-950">Rename Certificate</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Certificate Name</label>
              <input
                type="text"
                value={newCertName}
                onChange={(e) => setNewCertName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRenameCert(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newCertName.trim()) {
                    await renameCertificate(renameCert.id, newCertName.trim());
                    showToast('Certificate renamed successfully.');
                    setRenameCert(null);
                  }
                }}
                className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: CHANGE CATEGORY MODAL */}
      {categoryCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-navy-950">Change Category</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Category</label>
              <select
                value={newSelectedCategory}
                onChange={(e) => setNewSelectedCategory(e.target.value as CertificateCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              >
                {CERTIFICATE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCategoryCert(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await changeCategory(categoryCert.id, newSelectedCategory);
                  showToast('Category updated successfully.');
                  setCategoryCert(null);
                }}
                className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Update Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: DELETE CONFIRMATION MODAL */}
      {deleteConfirmCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Move to Recycle Bin?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to move <strong>"{deleteConfirmCert.name}"</strong> to the Recycle Bin? It will remain safely recoverable for 30 days while retaining PIN protection.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmCert(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Keep Certificate
              </button>
              <button
                onClick={async () => {
                  await moveToRecycleBin(deleteConfirmCert.id);
                  showToast(`Moved "${deleteConfirmCert.name}" to Recycle Bin.`);
                  setDeleteConfirmCert(null);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                Move to Recycle Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureCertificatesView;
