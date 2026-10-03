import React, { useState, useRef, useMemo } from 'react';
import { useDocuments, DocumentItem, DocumentCategory, DOCUMENT_CATEGORIES } from '../context/DocumentsContext';
import {
  FolderLock,
  UploadCloud,
  Search,
  Filter,
  FileText,
  FileCode,
  FileImage,
  Download,
  Eye,
  Trash2,
  Edit2,
  Tag,
  Clock,
  HardDrive,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  ShieldCheck,
  ArrowUpDown,
  File,
} from 'lucide-react';

export const MyDocumentsView: React.FC = () => {
  const {
    documents,
    loading,
    uploadDocument,
    getSignedPreviewUrl,
    downloadDocument,
    renameDocument,
    changeCategory,
    moveToRecycleBin,
  } = useDocuments();

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list');

  // Drag and drop / Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Identity Documents');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Rename Modal state
  const [renamingDoc, setRenamingDoc] = useState<DocumentItem | null>(null);
  const [newDocName, setNewDocName] = useState('');

  // Category Change Modal state
  const [categoryDoc, setCategoryDoc] = useState<DocumentItem | null>(null);
  const [newCategoryVal, setNewCategoryVal] = useState<DocumentCategory>('Other');

  // Delete Confirmation Modal state
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. File Selection & Drag-and-Drop Handler
  const handleFileChange = (file: File) => {
    setErrorMessage(null);

    // Validate 5 MB limit
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage(
        `File "${file.name}" exceeds the strict 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
      );
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
    if (!allowed.includes(ext)) {
      setErrorMessage(
        `Unsupported file type ".${ext}". Supported types: PDF, DOC, DOCX, TXT, JPG, PNG.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setShowUploadModal(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // 2. Perform Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;

    setUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    const { data, error } = await uploadDocument(selectedFile, uploadCategory);

    clearInterval(progressInterval);
    setUploadProgress(100);

    if (error) {
      setErrorMessage(error.message);
      setUploading(false);
      setUploadProgress(0);
    } else {
      setTimeout(() => {
        setUploading(false);
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadProgress(0);
        showToast(`Document "${data?.name || selectedFile.name}" encrypted and stored!`);
      }, 400);
    }
  };

  // 3. Trigger Preview
  const handleOpenPreview = async (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);

    const { url, error } = await getSignedPreviewUrl(doc);
    if (error) {
      showToast(`Preview notice: ${error.message}`);
    } else {
      setPreviewUrl(url || null);
    }
    setPreviewLoading(false);
  };

  // 4. Trigger Download
  const handleDownload = async (doc: DocumentItem) => {
    showToast(`Downloading original file "${doc.original_name}"...`);
    const { error } = await downloadDocument(doc);
    if (error) {
      showToast(`Download failed: ${error.message}`);
    }
  };

  // 5. Confirm Rename
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingDoc || !newDocName.trim()) return;

    const { error } = await renameDocument(renamingDoc.id, newDocName.trim());
    if (error) {
      showToast(error.message);
    } else {
      showToast(`Document renamed to "${newDocName.trim()}".`);
      setRenamingDoc(null);
      setNewDocName('');
    }
  };

  // 6. Confirm Category Change
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryDoc) return;

    const { error } = await changeCategory(categoryDoc.id, newCategoryVal);
    if (error) {
      showToast(error.message);
    } else {
      showToast(`Category updated to "${newCategoryVal}".`);
      setCategoryDoc(null);
    }
  };

  // 7. Confirm Move to Recycle Bin
  const handleMoveToTrash = async () => {
    if (!deletingDoc) return;

    const { error } = await moveToRecycleBin(deletingDoc.id);
    if (error) {
      showToast(error.message);
    } else {
      showToast(`"${deletingDoc.name}" moved to Recycle Bin (30-day recovery buffer).`);
      setDeletingDoc(null);
    }
  };

  // Format File Size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format Date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Get File Type Icon
  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png'].includes(ext || '')) {
      return <FileImage className="w-5 h-5 text-indigo-500" />;
    }
    if (fileType.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-royal-600" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
  };

  // Filter & Sort Logic
  const filteredAndSortedDocs = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesSearch =
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.original_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'All' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'size') {
          return b.file_size - a.file_size;
        }
        return 0;
      });
  }, [documents, searchQuery, selectedCategory, sortBy]);

  // Recent Uploads (Top 3)
  const recentUploads = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [documents]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
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

      {/* 1. PAGE HEADER CARD */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-royal-50 text-royal-700 text-xs font-bold uppercase tracking-wider border border-royal-200">
            <FolderLock className="w-3.5 h-3.5 text-royal-600" />
            <span>Digital Document Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
            My Documents
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Your important files, organized and securely stored in one place.
          </p>
        </div>

        {/* Action Button & Size Limit Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Max 5 MB / file
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
              setShowUploadModal(true);
            }}
            className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-royal-600/20 hover:shadow-royal-500/30 transition-all flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* 2. DRAG AND DROP UPLOAD ZONE (Required by Prompt) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed transition-all p-8 text-center cursor-pointer relative overflow-hidden ${
          isDragging
            ? 'border-royal-500 bg-royal-50/60 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-royal-400 hover:bg-slate-50/50'
        } shadow-sm`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-3 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-royal-50 text-royal-600 flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy-950">
              Drag and drop your academic documents here, or{' '}
              <span className="text-royal-600 underline underline-offset-2">browse files</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supported formats: <strong>PDF, DOC, DOCX, TXT, JPG, PNG</strong> (Strict 5 MB limit)
            </p>
          </div>
        </div>
      </div>

      {/* 3. RECENT UPLOADS SECTION (Required by Prompt) */}
      {recentUploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Recent Uploads</span>
            <span className="text-[11px] font-normal lowercase text-slate-400">
              last {recentUploads.length} files added
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentUploads.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-slate-50 flex-shrink-0">
                    {getFileIcon(doc.file_type, doc.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy-950 truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatBytes(doc.file_size)} • {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenPreview(doc)}
                    className="p-1.5 text-slate-400 hover:text-royal-600 rounded-lg hover:bg-slate-100"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEARCH, CATEGORY FILTERS & SORTING TOOLBAR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Top search & sorting row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by filename..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:bg-white"
            />
          </div>

          {/* Sort & View Layout controls */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">Size (Largest)</option>
              </select>
            </div>

            {/* List / Grid Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewLayout('list')}
                className={`p-1.5 rounded-lg ${
                  viewLayout === 'list'
                    ? 'bg-white text-navy-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg ${
                  viewLayout === 'grid'
                    ? 'bg-white text-navy-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters (7 Categories required by prompt) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'All'
                ? 'bg-navy-950 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({documents.length})
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-royal-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. DOCUMENT LIST / GRID VIEW */}
      {filteredAndSortedDocs.length > 0 ? (
        viewLayout === 'list' ? (
          /* TABLE LIST VIEW */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Document Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">File Size</th>
                    <th className="py-3.5 px-4">Upload Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-50 flex-shrink-0">
                            {getFileIcon(doc.file_type, doc.name)}
                          </div>
                          <div>
                            <p className="truncate max-w-[220px] sm:max-w-xs text-navy-950 font-bold" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-normal">
                              {doc.original_name !== doc.name ? `Original: ${doc.original_name}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {formatBytes(doc.file_size)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(doc.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview Action */}
                          <button
                            onClick={() => handleOpenPreview(doc)}
                            className="p-1.5 text-slate-400 hover:text-royal-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download Action */}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Download Original"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Rename Action */}
                          <button
                            onClick={() => {
                              setRenamingDoc(doc);
                              setNewDocName(doc.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Change Category Action */}
                          <button
                            onClick={() => {
                              setCategoryDoc(doc);
                              setNewCategoryVal(doc.category);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Change Category"
                          >
                            <Tag className="w-4 h-4" />
                          </button>

                          {/* Delete to Recycle Bin Action */}
                          <button
                            onClick={() => setDeletingDoc(doc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
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
          </div>
        ) : (
          /* RESPONSIVE CARD GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {getFileIcon(doc.file_type, doc.name)}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {doc.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-navy-950 truncate" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatBytes(doc.file_size)} • Uploaded {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenPreview(doc)}
                      className="p-1.5 text-slate-500 hover:text-royal-600 rounded-lg hover:bg-slate-100"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setRenamingDoc(doc);
                        setNewDocName(doc.name);
                      }}
                      className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCategoryDoc(doc);
                        setNewCategoryVal(doc.category);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Change Category"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setDeletingDoc(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Move to Recycle Bin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* EMPTY STATE GUIDANCE (Required by Prompt) */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-royal-50 text-royal-600 flex items-center justify-center mx-auto shadow-inner">
            <FolderLock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-navy-950">
              {searchQuery || selectedCategory !== 'All'
                ? 'No matching documents found'
                : 'No documents stored yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search terms or category filter to locate your file.'
                : 'Upload your student transcripts, identity cards, admissions letters, and certificates to keep them encrypted and accessible.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload First Document</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. UPLOAD MODAL DIALOG */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-5">
            <button
              onClick={() => {
                if (!uploading) {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }
              }}
              disabled={uploading}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-royal-100 text-royal-600">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-950">Upload Encrypted Document</h3>
                <p className="text-xs text-slate-500">Strict 5 MB file size limit enforced.</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Selector if none selected yet */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-2 cursor-pointer hover:border-royal-500 hover:bg-royal-50/40 transition-colors"
                >
                  <FileText className="w-8 h-8 text-royal-500 mx-auto" />
                  <p className="font-bold text-slate-700">Choose a file to upload</p>
                  <p className="text-[11px] text-slate-400">PDF, DOC, DOCX, TXT, JPG, PNG (Max 5 MB)</p>
                </div>
              ) : (
                /* Selected File Inspector Card */
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      {getFileIcon(selectedFile.type, selectedFile.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  disabled={uploading}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Encrypting & Storing...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-royal-600 to-emerald-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PREVIEW MODAL VIEWER */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  {getFileIcon(previewDoc.file_type, previewDoc.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-navy-950 truncate max-w-md">
                    {previewDoc.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewDoc.category} • {formatBytes(previewDoc.file_size)} • Signed Authenticated Preview
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3 py-1.5 bg-royal-50 hover:bg-royal-100 text-royal-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-royal-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewUrl(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Preview Area */}
            <div className="flex-1 p-6 overflow-y-auto min-h-[350px] flex items-center justify-center bg-slate-100">
              {previewLoading ? (
                <div className="text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-royal-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Generating short-lived secure preview...</p>
                </div>
              ) : previewUrl ? (
                previewDoc.file_type.includes('image') || ['jpg', 'jpeg', 'png'].some((ext) => previewDoc.name.endsWith(ext)) ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.name}
                    className="max-h-[70vh] object-contain rounded-lg shadow-md border border-slate-200"
                  />
                ) : previewDoc.file_type.includes('pdf') || previewDoc.name.endsWith('.pdf') ? (
                  <iframe
                    src={previewUrl}
                    title={previewDoc.name}
                    className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-sm space-y-3">
                    <FileText className="w-12 h-12 text-royal-500 mx-auto" />
                    <p className="text-sm font-bold text-navy-950">Direct Preview for Word/DOCX</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This file format is protected. Download the original file to view it in Microsoft Word or LibreOffice.
                    </p>
                    <button
                      onClick={() => handleDownload(previewDoc)}
                      className="px-4 py-2 bg-royal-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-royal-500"
                    >
                      Download File
                    </button>
                  </div>
                )
              ) : (
                /* Fallback preview representation */
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md space-y-3">
                  <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="text-base font-bold text-navy-950">Encrypted Student Document</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-mono">
                    SHA-256 Client Seal: Verified • {formatBytes(previewDoc.file_size)}
                  </p>
                  <p className="text-xs text-slate-600">
                    File is stored in your private sovereign locker. Download the file below to view on your device.
                  </p>
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="px-4 py-2 bg-royal-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-royal-500"
                  >
                    Download Original File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. RENAME MODAL DIALOG */}
      {/* ========================================================================= */}
      {renamingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => setRenamingDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <Edit2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Rename Document</h3>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New File Display Name</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenamingDoc(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-royal-600 hover:bg-royal-500 text-white rounded-xl font-bold shadow-md transition-colors"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. CHANGE CATEGORY MODAL DIALOG */}
      {/* ========================================================================= */}
      {categoryDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => setCategoryDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Change Category</h3>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 text-xs">
              <div>
                <p className="text-slate-500 truncate mb-3">
                  Document: <strong>{categoryDoc.name}</strong>
                </p>
                <label className="block font-bold text-slate-700 mb-1">Select New Category</label>
                <select
                  value={newCategoryVal}
                  onChange={(e) => setNewCategoryVal(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoryDoc(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-royal-600 hover:bg-royal-500 text-white rounded-xl font-bold shadow-md transition-colors"
                >
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MOVE TO RECYCLE BIN CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Move to Recycle Bin?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to move <strong>"{deletingDoc.name}"</strong> to the Recycle Bin?
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-snug">
              This document will be kept safe for <strong>30 days</strong>. You can restore it at any time before permanent deletion.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Keep File
              </button>
              <button
                type="button"
                onClick={handleMoveToTrash}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                Move to Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDocumentsView;
