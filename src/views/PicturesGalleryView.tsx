import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  Edit2,
  FolderSymlink,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Camera,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import {
  usePictures,
  PictureItem,
  PictureAlbum,
  PICTURE_ALBUMS,
} from '../context/PicturesContext';

export const PicturesGalleryView: React.FC = () => {
  const {
    pictures,
    loading,
    uploading,
    uploadProgress,
    uploadPictures,
    getSignedPreviewUrl,
    downloadPicture,
    renamePicture,
    changeAlbum,
    moveToRecycleBin,
  } = usePictures();

  // Search, Album, Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState<boolean>(false);

  // Edit / Delete dialogs
  const [renamePic, setRenamePic] = useState<PictureItem | null>(null);
  const [newPicName, setNewPicName] = useState<string>('');
  const [albumPic, setAlbumPic] = useState<PictureItem | null>(null);
  const [newSelectedAlbum, setNewSelectedAlbum] = useState<PictureAlbum>('Personal');
  const [deleteConfirmPic, setDeleteConfirmPic] = useState<PictureItem | null>(null);

  // Upload modal state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadAlbum, setUploadAlbum] = useState<PictureAlbum>('Personal');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered and sorted pictures
  const filteredPictures = pictures
    .filter((pic) => {
      const matchesSearch = pic.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAlbum = selectedAlbum === 'All' || pic.album === selectedAlbum;
      return matchesSearch && matchesAlbum;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.file_size - a.file_size;
      return 0;
    });

  // Album counts
  const albumCounts = PICTURE_ALBUMS.reduce<Record<string, number>>((acc, album) => {
    acc[album] = pictures.filter((p) => p.album === album).length;
    return acc;
  }, {});

  // Lightbox opening and URL loading
  const openLightbox = useCallback(async (index: number) => {
    const targetPic = filteredPictures[index];
    if (!targetPic) return;
    setLightboxIndex(index);
    setLightboxLoading(true);
    setLightboxUrl(null);
    const res = await getSignedPreviewUrl(targetPic);
    if (res.url) {
      setLightboxUrl(res.url);
    } else {
      showToast('Could not load high-resolution image preview.');
    }
    setLightboxLoading(false);
  }, [filteredPictures, getSignedPreviewUrl]);

  // Navigate next/prev in lightbox
  const showNextImage = useCallback(() => {
    if (lightboxIndex === null || filteredPictures.length <= 1) return;
    const nextIdx = (lightboxIndex + 1) % filteredPictures.length;
    openLightbox(nextIdx);
  }, [lightboxIndex, filteredPictures.length, openLightbox]);

  const showPrevImage = useCallback(() => {
    if (lightboxIndex === null || filteredPictures.length <= 1) return;
    const prevIdx = (lightboxIndex - 1 + filteredPictures.length) % filteredPictures.length;
    openLightbox(prevIdx);
  }, [lightboxIndex, filteredPictures.length, openLightbox]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') showNextImage();
      if (e.key === 'ArrowLeft') showPrevImage();
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, showNextImage, showPrevImage]);

  // Handle Multi-file Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadErrors(['Please select at least one picture to upload.']);
      return;
    }
    setUploadErrors([]);
    const { successCount, errors } = await uploadPictures(selectedFiles, uploadAlbum);
    if (errors.length > 0) {
      setUploadErrors(errors);
    }
    if (successCount > 0) {
      showToast(`Successfully uploaded ${successCount} picture(s) to "${uploadAlbum}"!`);
      if (errors.length === 0) {
        setShowUploadModal(false);
        setSelectedFiles([]);
      }
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const incoming = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...incoming]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-950 text-white border border-royal-500/60 shadow-2xl rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
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
              <Camera className="w-7 h-7 text-royal-300" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-royal-50 text-royal-700 text-[11px] font-bold uppercase tracking-wider border border-royal-200">
                <Layers className="w-3 h-3" />
                Private Photo Gallery
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight">
                My Pictures
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                Official student passport photos, admit card identification, and campus memories stored securely with private user-scoped isolation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 hidden sm:inline-block">
              Max 5 MB / Image
            </span>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadErrors([]);
                setShowUploadModal(true);
              }}
              className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg self-start sm:self-auto"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Pictures</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH, ALBUM FILTER, SORT */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pictures by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
            />
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 self-end sm:self-auto">
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
        </div>

        {/* Album pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setSelectedAlbum('All')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedAlbum === 'All'
                ? 'bg-navy-950 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>All Pictures</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {pictures.length}
            </span>
          </button>

          {PICTURE_ALBUMS.map((album) => (
            <button
              key={album}
              onClick={() => setSelectedAlbum(album)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedAlbum === album
                  ? 'bg-royal-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{album}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedAlbum === album ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {albumCounts[album] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* GALLERY GRID */}
      {filteredPictures.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPictures.map((pic, idx) => (
            <div
              key={pic.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Thumbnail Container */}
              <div className="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center">
                {pic.localPreviewUrl ? (
                  <img
                    src={pic.localPreviewUrl}
                    alt={pic.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-navy-950 via-slate-800 to-royal-950 flex flex-col items-center justify-center p-4 text-white">
                    <ImageIcon className="w-10 h-10 text-royal-400/80 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded">
                      {pic.album}
                    </span>
                  </div>
                )}

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 bg-navy-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => openLightbox(idx)}
                    className="p-2.5 rounded-full bg-white text-navy-950 hover:bg-royal-50 transition-colors shadow-lg"
                    title="View Full Size (Lightbox)"
                  >
                    <Eye className="w-4 h-4 text-royal-600" />
                  </button>
                  <button
                    onClick={async () => {
                      showToast(`Downloading "${pic.name}"...`);
                      await downloadPicture(pic);
                      showToast(`Downloaded "${pic.name}".`);
                    }}
                    className="p-2.5 rounded-full bg-white text-navy-950 hover:bg-royal-50 transition-colors shadow-lg"
                    title="Download Picture"
                  >
                    <Download className="w-4 h-4 text-slate-800" />
                  </button>
                </div>

                {/* Album tag badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/50 text-white backdrop-blur-sm border border-white/20">
                    {pic.album}
                  </span>
                </div>
              </div>

              {/* Metadata & Actions */}
              <div className="p-4 space-y-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-navy-950 truncate" title={pic.name}>
                    {pic.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{(pic.file_size / 1024).toFixed(0)} KB</span>
                    <span>{new Date(pic.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Encrypted
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRenamePic(pic);
                        setNewPicName(pic.name);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setAlbumPic(pic);
                        setNewSelectedAlbum(pic.album);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      title="Move to another Album"
                    >
                      <FolderSymlink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmPic(pic)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                      title="Move to Recycle Bin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3 shadow-sm">
          <Camera className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No pictures in this album</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedAlbum !== 'All'
              ? 'No pictures match your search filters.'
              : 'Upload official portraits, smart card photos, and college activity photos.'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-2 px-4 py-2 bg-royal-600 hover:bg-royal-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Picture</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FULL SCREEN LIGHTBOX MODAL WITH NEXT / PREV NAVIGATION */}
      {/* ========================================================================= */}
      {lightboxIndex !== null && filteredPictures[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between text-white pb-3 border-b border-white/10 max-w-5xl">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-royal-400" />
              <div>
                <p className="text-sm font-bold truncate max-w-xs sm:max-w-md">
                  {filteredPictures[lightboxIndex].name}
                </p>
                <p className="text-[11px] text-slate-400">
                  Album: {filteredPictures[lightboxIndex].album} • {(filteredPictures[lightboxIndex].file_size / 1024).toFixed(0)} KB • {lightboxIndex + 1} of {filteredPictures.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const pic = filteredPictures[lightboxIndex];
                  showToast(`Downloading "${pic.name}"...`);
                  await downloadPicture(pic);
                  showToast(`Downloaded "${pic.name}".`);
                }}
                className="px-3 py-1.5 bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Close Lightbox (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Center Image with Navigation Buttons */}
          <div className="flex-1 w-full max-w-5xl flex items-center justify-between my-4 relative">
            {/* Prev Button */}
            {filteredPictures.length > 1 && (
              <button
                onClick={showPrevImage}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all absolute left-2 z-10 hover:scale-110"
                title="Previous Image (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Main Preview */}
            <div className="w-full h-full flex items-center justify-center p-4">
              {lightboxLoading ? (
                <div className="text-white text-xs flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-royal-400" />
                  <span>Loading full size photo...</span>
                </div>
              ) : lightboxUrl ? (
                <img
                  src={lightboxUrl}
                  alt={filteredPictures[lightboxIndex].name}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="text-slate-400 text-xs">Preview unavailable.</div>
              )}
            </div>

            {/* Next Button */}
            {filteredPictures.length > 1 && (
              <button
                onClick={showNextImage}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all absolute right-2 z-10 hover:scale-110"
                title="Next Image (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2">
            {filteredPictures.map((pic, idx) => (
              <button
                key={pic.id}
                onClick={() => openLightbox(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  idx === lightboxIndex ? 'border-royal-500 scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                {pic.localPreviewUrl ? (
                  <img src={pic.localPreviewUrl} alt={pic.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-white">
                    {idx + 1}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MULTI-IMAGE UPLOAD MODAL */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
                setUploadErrors([]);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-royal-100 text-royal-700">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-950">Upload Pictures</h3>
                <p className="text-xs text-slate-500">Multiple image selection supported (JPG, JPEG, PNG up to 5 MB).</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Drop area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDropFiles}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-royal-500 bg-royal-50/50'
                    : selectedFiles.length > 0
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-royal-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      setSelectedFiles((prev) => [...prev, ...filesArray]);
                    }
                  }}
                />

                <UploadCloud className="w-8 h-8 mx-auto text-royal-600 mb-2" />
                {selectedFiles.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedFiles.length} file(s) selected
                    </p>
                    <p className="text-[11px] text-slate-500">Click to add more pictures</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700">Click or drag photos here</p>
                    <p className="text-[11px] text-slate-400">
                      Supports multiple JPG, JPEG, and PNG images up to 5 MB each
                    </p>
                  </div>
                )}
              </div>

              {/* Selected Files preview list */}
              {selectedFiles.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700 px-2 py-1 bg-white rounded-lg border border-slate-200">
                      <span className="truncate max-w-[240px] font-semibold">{file.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Album selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Destination Album</label>
                <select
                  value={uploadAlbum}
                  onChange={(e) => setUploadAlbum(e.target.value as PictureAlbum)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                >
                  {PICTURE_ALBUMS.map((album) => (
                    <option key={album} value={album}>
                      {album}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload errors */}
              {uploadErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs space-y-1">
                  {uploadErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
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
                  disabled={uploading || selectedFiles.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RENAME PICTURE */}
      {/* ========================================================================= */}
      {renamePic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-navy-950">Rename Picture</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Picture Name</label>
              <input
                type="text"
                value={newPicName}
                onChange={(e) => setNewPicName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRenamePic(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newPicName.trim()) {
                    await renamePicture(renamePic.id, newPicName.trim());
                    showToast('Picture renamed.');
                    setRenamePic(null);
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

      {/* ========================================================================= */}
      {/* MODAL 4: CHANGE ALBUM */}
      {/* ========================================================================= */}
      {albumPic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-navy-950">Move to Another Album</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Album</label>
              <select
                value={newSelectedAlbum}
                onChange={(e) => setNewSelectedAlbum(e.target.value as PictureAlbum)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              >
                {PICTURE_ALBUMS.map((album) => (
                  <option key={album} value={album}>
                    {album}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setAlbumPic(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await changeAlbum(albumPic.id, newSelectedAlbum);
                  showToast(`Moved to "${newSelectedAlbum}".`);
                  setAlbumPic(null);
                }}
                className="px-5 py-2.5 bg-royal-600 hover:bg-royal-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Move Album
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteConfirmPic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Move to Recycle Bin?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to move <strong>"{deleteConfirmPic.name}"</strong> to the Recycle Bin? It will remain safely recoverable for 30 days.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmPic(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await moveToRecycleBin(deleteConfirmPic.id);
                  showToast(`Moved "${deleteConfirmPic.name}" to Recycle Bin.`);
                  setDeleteConfirmPic(null);
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

export default PicturesGalleryView;
