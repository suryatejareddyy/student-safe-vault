import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  Award,
  Image as ImageIcon,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  X,
  HardDrive,
  AlertCircle,
  HelpCircle,
  FolderLock,
  ChevronRight,
} from 'lucide-react';
import { useDocuments, DocumentItem } from '../context/DocumentsContext';
import { useCertificates, CertificateItem } from '../context/CertificatesContext';
import { usePictures, PictureItem } from '../context/PicturesContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type RecycleBinItemType = 'document' | 'certificate' | 'picture';

export interface UnifiedRecycleItem {
  id: string;
  type: RecycleBinItemType;
  name: string;
  originalName: string;
  categoryOrAlbum: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  deletedAt: string;
  expiresAt: string;
  daysRemaining: number;
}

export const RecycleBinView: React.FC = () => {
  const {
    recycleBinDocuments,
    restoreFromRecycleBin: restoreDocument,
    permanentlyDelete: permanentlyDeleteDocument,
    emptyRecycleBin: emptyDocumentRecycleBin,
  } = useDocuments();

  const {
    recycleBinCertificates,
    restoreFromRecycleBin: restoreCertificate,
    permanentlyDelete: permanentlyDeleteCertificate,
    emptyRecycleBin: emptyCertificateRecycleBin,
  } = useCertificates();

  const {
    recycleBinPictures,
    restoreFromRecycleBin: restorePicture,
    permanentlyDelete: permanentlyDeletePicture,
    emptyRecycleBin: emptyPictureRecycleBin,
  } = usePictures();

  // Search, Filter, Sort, View Layout
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Documents' | 'Certificates' | 'Pictures'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'expiring-soon'>('newest');
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list');

  // Confirmation Modals
  const [itemToDelete, setItemToDelete] = useState<UnifiedRecycleItem | null>(null);
  const [itemToRestore, setItemToRestore] = useState<UnifiedRecycleItem | null>(null);
  const [showEmptyConfirmModal, setShowEmptyConfirmModal] = useState<boolean>(false);

  // In-flight Action States (prevents repeated clicks)
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isEmptingBin, setIsEmptingBin] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert raw items into UnifiedRecycleItem array
  const unifiedItems: UnifiedRecycleItem[] = useMemo(() => {
    const calcExpiry = (deletedAtStr?: string | null) => {
      const deletedTime = deletedAtStr ? new Date(deletedAtStr).getTime() : Date.now();
      const expiresTime = deletedTime + 30 * 24 * 60 * 60 * 1000;
      const msLeft = expiresTime - Date.now();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      return {
        expiresAt: new Date(expiresTime).toISOString(),
        daysRemaining: daysLeft,
      };
    };

    const docItems: UnifiedRecycleItem[] = recycleBinDocuments.map((d) => {
      const { expiresAt, daysRemaining } = calcExpiry(d.deleted_at);
      return {
        id: d.id,
        type: 'document',
        name: d.name,
        originalName: d.original_name || d.name,
        categoryOrAlbum: d.category,
        fileSize: d.file_size,
        fileType: d.file_type,
        storagePath: d.storage_path,
        deletedAt: d.deleted_at || new Date().toISOString(),
        expiresAt,
        daysRemaining,
      };
    });

    const certItems: UnifiedRecycleItem[] = recycleBinCertificates.map((c) => {
      const { expiresAt, daysRemaining } = calcExpiry(c.deleted_at);
      return {
        id: c.id,
        type: 'certificate',
        name: c.name,
        originalName: c.original_name || c.name,
        categoryOrAlbum: c.category,
        fileSize: c.file_size,
        fileType: c.file_type,
        storagePath: c.storage_path,
        deletedAt: c.deleted_at || new Date().toISOString(),
        expiresAt,
        daysRemaining,
      };
    });

    const picItems: UnifiedRecycleItem[] = recycleBinPictures.map((p) => {
      const { expiresAt, daysRemaining } = calcExpiry(p.deleted_at);
      return {
        id: p.id,
        type: 'picture',
        name: p.name,
        originalName: p.original_name || p.name,
        categoryOrAlbum: p.album,
        fileSize: p.file_size,
        fileType: p.file_type,
        storagePath: p.storage_path,
        deletedAt: p.deleted_at || new Date().toISOString(),
        expiresAt,
        daysRemaining,
      };
    });

    return [...docItems, ...certItems, ...picItems];
  }, [recycleBinDocuments, recycleBinCertificates, recycleBinPictures]);

  // Counts
  const totalCount = unifiedItems.length;
  const docCount = recycleBinDocuments.length;
  const certCount = recycleBinCertificates.length;
  const picCount = recycleBinPictures.length;

  // Items expiring within 7 days
  const expiringSoonCount = useMemo(() => {
    return unifiedItems.filter((item) => item.daysRemaining <= 7).length;
  }, [unifiedItems]);

  // Filter & Sort
  const filteredAndSortedItems = useMemo(() => {
    return unifiedItems
      .filter((item) => {
        // Type filter
        if (typeFilter === 'Documents' && item.type !== 'document') return false;
        if (typeFilter === 'Certificates' && item.type !== 'certificate') return false;
        if (typeFilter === 'Pictures' && item.type !== 'picture') return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchOrig = item.originalName.toLowerCase().includes(q);
          const matchCat = item.categoryOrAlbum.toLowerCase().includes(q);
          if (!matchName && !matchOrig && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
        }
        if (sortBy === 'expiring-soon') {
          return a.daysRemaining - b.daysRemaining;
        }
        if (sortBy === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name-desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [unifiedItems, typeFilter, searchQuery, sortBy]);

  // Format Helper
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  // Perform Restore Action
  const handleConfirmRestore = async () => {
    if (!itemToRestore) return;
    const item = itemToRestore;
    setItemToRestore(null);
    setProcessingId(item.id);

    try {
      let res: { error: Error | null } = { error: null };

      // Optional RPC call if Supabase is connected
      if (isSupabaseConfigured) {
        try {
          const { error: rpcErr } = await supabase.rpc('restore_recycle_bin_item', {
            p_item_id: item.id,
            p_item_type: item.type,
          });
          if (rpcErr) {
            console.warn('RPC restore failed, using fallback:', rpcErr.message);
          }
        } catch (e) {
          console.warn('RPC restore exception:', e);
        }
      }

      if (item.type === 'document') {
        res = await restoreDocument(item.id);
      } else if (item.type === 'certificate') {
        res = await restoreCertificate(item.id);
      } else if (item.type === 'picture') {
        res = await restorePicture(item.id);
      }

      if (res.error) {
        showToast(`Failed to restore "${item.name}": ${res.error.message}`, 'error');
      } else {
        if (item.type === 'certificate') {
          showToast(`Restored "${item.name}" to Secure Certificates. PIN verification required to view.`, 'success');
        } else if (item.type === 'picture') {
          showToast(`Restored "${item.name}" to Pictures (${item.categoryOrAlbum} album).`, 'success');
        } else {
          showToast(`Restored "${item.name}" to My Documents (${item.categoryOrAlbum}).`, 'success');
        }
      }
    } catch (err: any) {
      showToast(`Error restoring file: ${err?.message || err}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Perform Permanent Delete Action
  const handleConfirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    const item = itemToDelete;
    setItemToDelete(null);
    setProcessingId(item.id);

    try {
      let res: { error: Error | null } = { error: null };

      // Server-side RPC verification
      if (isSupabaseConfigured) {
        try {
          const { error: rpcErr } = await supabase.rpc('permanently_delete_recycle_bin_item', {
            p_item_id: item.id,
            p_item_type: item.type,
          });
          if (rpcErr) {
            console.warn('RPC permanent delete failed, using context purge:', rpcErr.message);
          }
        } catch (e) {
          console.warn('RPC permanent delete exception:', e);
        }
      }

      if (item.type === 'document') {
        res = await permanentlyDeleteDocument(item.id);
      } else if (item.type === 'certificate') {
        res = await permanentlyDeleteCertificate(item.id);
      } else if (item.type === 'picture') {
        res = await permanentlyDeletePicture(item.id);
      }

      if (res.error) {
        showToast(`Could not permanently delete "${item.name}": ${res.error.message}`, 'error');
      } else {
        showToast(`Permanently purged "${item.name}" from private vault storage.`, 'success');
      }
    } catch (err: any) {
      showToast(`Error permanently deleting item: ${err?.message || err}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Perform Empty Entire Recycle Bin Action
  const handleConfirmEmptyRecycleBin = async () => {
    setShowEmptyConfirmModal(false);
    setIsEmptingBin(true);

    try {
      // Optional Server RPC call
      if (isSupabaseConfigured) {
        try {
          const { error: rpcErr } = await supabase.rpc('empty_student_recycle_bin');
          if (rpcErr) {
            console.warn('RPC empty_student_recycle_bin failed:', rpcErr.message);
          }
        } catch (e) {
          console.warn('RPC empty_student_recycle_bin exception:', e);
        }
      }

      // Context batch cleanup
      const [resDoc, resCert, resPic] = await Promise.all([
        emptyDocumentRecycleBin(),
        emptyCertificateRecycleBin(),
        emptyPictureRecycleBin(),
      ]);

      const errors: string[] = [];
      if (resDoc.error) errors.push(`Documents: ${resDoc.error.message}`);
      if (resCert.error) errors.push(`Certificates: ${resCert.error.message}`);
      if (resPic.error) errors.push(`Pictures: ${resPic.error.message}`);

      if (errors.length > 0) {
        showToast(`Some items could not be deleted: ${errors.join(', ')}`, 'error');
      } else {
        showToast(`Recycle Bin completely emptied across all sections.`, 'success');
      }
    } catch (err: any) {
      showToast(`Error emptying Recycle Bin: ${err?.message || err}`, 'error');
    } finally {
      setIsEmptingBin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white shadow-2xl rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3 animate-fade-in border ${
            toastType === 'error'
              ? 'bg-rose-950 border-rose-600'
              : toastType === 'warning'
              ? 'bg-amber-950 border-amber-600'
              : 'bg-navy-950 border-royal-500'
          }`}
        >
          {toastType === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          ) : toastType === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )}
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight">Recycle Bin</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Recover deleted items or permanently remove files you no longer need.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action: Empty Recycle Bin */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={() => setShowEmptyConfirmModal(true)}
            disabled={totalCount === 0 || isEmptingBin}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              totalCount === 0 || isEmptingBin
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-sm hover:shadow'
            }`}
            title={totalCount === 0 ? 'Recycle Bin is already empty' : 'Permanently remove all deleted files'}
          >
            {isEmptingBin ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                <span>Emptying Bin...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Empty Recycle Bin</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 30-DAY RETENTION & EXPIRY POLICY BANNER */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-blue-100/80 text-blue-700 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-navy-950">
              30-Day Safe Recovery Buffer
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Items moved to the Recycle Bin are held for 30 days before being automatically purged from vault storage. Restoring returns them to their exact original sections.
            </p>
          </div>
        </div>

        {expiringSoonCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-100/90 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap self-start sm:self-center">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span>{expiringSoonCount} {expiringSoonCount === 1 ? 'item expires' : 'items expire'} within 7 days</span>
          </div>
        )}
      </div>

      {/* 3. CONTROLS: SEARCH, TYPE FILTERS, SORTING & VIEW TOGGLES */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name or category..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown & View Mode Switcher */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Sort Menu */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none font-medium cursor-pointer"
              >
                <option value="newest">Deletion Date (Newest)</option>
                <option value="oldest">Deletion Date (Oldest)</option>
                <option value="expiring-soon">Expiring Soonest</option>
                <option value="name-asc">File Name (A - Z)</option>
                <option value="name-desc">File Name (Z - A)</option>
              </select>
            </div>

            {/* List / Grid Toggles */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                onClick={() => setViewLayout('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === 'list'
                    ? 'bg-white shadow-xs text-royal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === 'grid'
                    ? 'bg-white shadow-xs text-royal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none border-t border-slate-100 pt-3">
          <button
            onClick={() => setTypeFilter('All')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              typeFilter === 'All'
                ? 'bg-navy-950 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>All Items</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('Documents')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              typeFilter === 'Documents'
                ? 'bg-royal-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {docCount}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('Certificates')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              typeFilter === 'Certificates'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Secure Certificates</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {certCount}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('Pictures')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              typeFilter === 'Pictures'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Pictures</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {picCount}
            </span>
          </button>
        </div>
      </div>

      {/* 4. ITEMS LIST / GRID */}
      {filteredAndSortedItems.length > 0 ? (
        viewLayout === 'list' ? (
          /* RESPONSIVE TABLE VIEW */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Item Name & Type</th>
                    <th className="py-3.5 px-4">Original Location</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4">Deleted Date</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedItems.map((item) => {
                    const isProcessing = processingId === item.id || isEmptingBin;
                    const isExpiringSoon = item.daysRemaining <= 7;

                    return (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-xl flex-shrink-0 ${
                                item.type === 'certificate'
                                  ? 'bg-amber-50 text-amber-600'
                                  : item.type === 'picture'
                                  ? 'bg-indigo-50 text-indigo-600'
                                  : 'bg-royal-50 text-royal-600'
                              }`}
                            >
                              {item.type === 'certificate' ? (
                                <Award className="w-5 h-5" />
                              ) : item.type === 'picture' ? (
                                <ImageIcon className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                    item.type === 'certificate'
                                      ? 'bg-amber-100 text-amber-800'
                                      : item.type === 'picture'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-royal-100 text-royal-800'
                                  }`}
                                >
                                  {item.type === 'certificate'
                                    ? 'Secure Certificate'
                                    : item.type === 'picture'
                                    ? 'Picture'
                                    : 'Document'}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-navy-950 truncate max-w-xs sm:max-w-md mt-0.5" title={item.name}>
                                {item.name}
                              </p>
                              {item.type === 'certificate' && (
                                <p className="text-[10px] text-amber-700 flex items-center gap-1 mt-0.5 font-medium">
                                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                                  <span>Restoring requires PIN verification to view</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.categoryOrAlbum}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                          {formatBytes(item.fileSize)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {formatDate(item.deletedAt)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                isExpiringSoon
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{item.daysRemaining} days left</span>
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {formatDate(item.expiresAt)}
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Restore Button */}
                            <button
                              onClick={() => setItemToRestore(item)}
                              disabled={isProcessing}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                                isProcessing
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-royal-600 hover:bg-royal-500 text-white'
                              }`}
                              title="Restore to original section"
                            >
                              {processingId === item.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Restore</span>
                            </button>

                            {/* Permanently Delete Button */}
                            <button
                              onClick={() => setItemToDelete(item)}
                              disabled={isProcessing}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isProcessing
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* RESPONSIVE GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedItems.map((item) => {
              const isProcessing = processingId === item.id || isEmptingBin;
              const isExpiringSoon = item.daysRemaining <= 7;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`p-3 rounded-xl flex-shrink-0 ${
                          item.type === 'certificate'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : item.type === 'picture'
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : 'bg-royal-50 text-royal-600 border border-royal-200'
                        }`}
                      >
                        {item.type === 'certificate' ? (
                          <Award className="w-6 h-6" />
                        ) : item.type === 'picture' ? (
                          <ImageIcon className="w-6 h-6" />
                        ) : (
                          <FileText className="w-6 h-6" />
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            item.type === 'certificate'
                              ? 'bg-amber-100 text-amber-800'
                              : item.type === 'picture'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-royal-100 text-royal-800'
                          }`}
                        >
                          {item.type === 'certificate'
                            ? 'Certificate'
                            : item.type === 'picture'
                            ? 'Picture'
                            : 'Document'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isExpiringSoon
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.daysRemaining} days left
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-navy-950 line-clamp-1" title={item.name}>
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Category: <span className="font-semibold text-slate-700">{item.categoryOrAlbum}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span className="font-mono font-medium text-slate-700">{formatBytes(item.fileSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deleted Date:</span>
                        <span className="font-medium text-slate-700">{formatDate(item.deletedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auto-Purge Expiry:</span>
                        <span className="font-medium text-slate-700">{formatDate(item.expiresAt)}</span>
                      </div>
                    </div>

                    {item.type === 'certificate' && (
                      <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[10px] text-amber-800 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>Protected by 6-digit PIN on restore.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setItemToDelete(item)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Forever</span>
                    </button>

                    <button
                      onClick={() => setItemToRestore(item)}
                      disabled={isProcessing}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                        isProcessing
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-royal-600 hover:bg-royal-500 text-white'
                      }`}
                    >
                      {processingId === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* EMPTY STATE */
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Trash2 className="w-8 h-8 text-slate-300" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-navy-950">
              {searchQuery || typeFilter !== 'All' ? 'No Matching Items Found' : 'Recycle Bin is Empty'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery || typeFilter !== 'All'
                ? 'Try adjusting your search keywords or resetting your type filters.'
                : 'Deleted documents, secure certificates, and gallery pictures will appear here for 30 days before being permanently removed.'}
            </p>
          </div>
          {(searchQuery || typeFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('All');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIRM RESTORE MODAL */}
      {/* ========================================================================= */}
      {itemToRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4 animate-scale-up">
            <button
              onClick={() => setItemToRestore(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-royal-600">
              <div className="p-2.5 rounded-xl bg-royal-50">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Restore File?</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to restore <strong>"{itemToRestore.name}"</strong>?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p>
                  • <strong>Destination:</strong>{' '}
                  {itemToRestore.type === 'document'
                    ? 'My Documents'
                    : itemToRestore.type === 'certificate'
                    ? 'Secure Certificates'
                    : 'Pictures Gallery'}
                </p>
                <p>
                  • <strong>Category / Album:</strong> {itemToRestore.categoryOrAlbum}
                </p>
                {itemToRestore.type === 'certificate' && (
                  <p className="text-amber-700 font-medium">
                    • <strong>Security Note:</strong> The restored certificate will remain PIN-protected and will require your 6-digit PIN to access.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setItemToRestore(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM PERMANENT DELETE MODAL */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4 animate-scale-up">
            <button
              onClick={() => setItemToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Permanently Delete File?</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                This operation will permanently erase <strong>"{itemToDelete.name}"</strong> from your private vault storage bucket.
              </p>
              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-rose-900 font-medium space-y-1">
                <p className="flex items-center gap-1 font-bold text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Warning: This action cannot be undone.</span>
                </p>
                <p className="text-[11px] text-rose-800">
                  The physical file and database metadata will be permanently expunged immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRM EMPTY RECYCLE BIN MODAL */}
      {/* ========================================================================= */}
      {showEmptyConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4 animate-scale-up">
            <button
              onClick={() => setShowEmptyConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Empty Entire Recycle Bin?</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                You are about to permanently delete all <strong>{totalCount} item(s)</strong> currently in your Recycle Bin:
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-navy-950">{docCount}</div>
                  <div className="text-[10px] text-slate-500">Documents</div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-navy-950">{certCount}</div>
                  <div className="text-[10px] text-slate-500">Certificates</div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-navy-950">{picCount}</div>
                  <div className="text-[10px] text-slate-500">Pictures</div>
                </div>
              </div>
              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>Attention:</strong> All physical storage blobs belonging to your student account will be permanently erased. This operation cannot be reversed.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEmptyConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Keep Files
              </button>
              <button
                onClick={handleConfirmEmptyRecycleBin}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Empty Recycle Bin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBinView;
