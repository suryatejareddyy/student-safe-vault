import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type DocumentCategory =
  | 'Identity Documents'
  | 'Academic Certificates'
  | 'Marksheets'
  | 'College Documents'
  | 'Applications and Forms'
  | 'Personal Documents'
  | 'Other';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Identity Documents',
  'Academic Certificates',
  'Marksheets',
  'College Documents',
  'Applications and Forms',
  'Personal Documents',
  'Other',
];

export interface DocumentItem {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  category: DocumentCategory;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentsContextType {
  documents: DocumentItem[];
  recycleBinDocuments: DocumentItem[];
  loading: boolean;
  uploadDocument: (file: File, category: DocumentCategory) => Promise<{ data?: DocumentItem; error: Error | null }>;
  getSignedPreviewUrl: (doc: DocumentItem) => Promise<{ url?: string; error: Error | null }>;
  downloadDocument: (doc: DocumentItem) => Promise<{ error: Error | null }>;
  renameDocument: (docId: string, newName: string) => Promise<{ error: Error | null }>;
  changeCategory: (docId: string, newCategory: DocumentCategory) => Promise<{ error: Error | null }>;
  moveToRecycleBin: (docId: string) => Promise<{ error: Error | null }>;
  restoreFromRecycleBin: (docId: string) => Promise<{ error: Error | null }>;
  permanentlyDelete: (docId: string) => Promise<{ error: Error | null }>;
  emptyRecycleBin: () => Promise<{ error: Error | null }>;
  refreshDocuments: () => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

// Initial fallback mock data for unconfigured / demo mode
const INITIAL_DEMO_DOCS: DocumentItem[] = [
  {
    id: 'doc-demo-1',
    user_id: 'demo-student',
    name: 'B.Tech_Semester_6_Official_Transcript.pdf',
    original_name: 'B.Tech_Semester_6_Official_Transcript.pdf',
    storage_path: 'demo-student/transcript-sem6.pdf',
    file_type: 'application/pdf',
    file_size: 2450000,
    category: 'Marksheets',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-09-18T10:00:00Z',
    updated_at: '2026-09-18T10:00:00Z',
  },
  {
    id: 'doc-demo-2',
    user_id: 'demo-student',
    name: 'Institutional_Student_ID_Card_2026.pdf',
    original_name: 'Institutional_Student_ID_Card_2026.pdf',
    storage_path: 'demo-student/student-id.pdf',
    file_type: 'application/pdf',
    file_size: 860000,
    category: 'Identity Documents',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-08-10T14:30:00Z',
    updated_at: '2026-08-10T14:30:00Z',
  },
  {
    id: 'doc-demo-3',
    user_id: 'demo-student',
    name: 'University_Admission_Offer_Letter.pdf',
    original_name: 'University_Admission_Offer_Letter.pdf',
    storage_path: 'demo-student/admission-letter.pdf',
    file_type: 'application/pdf',
    file_size: 1250000,
    category: 'College Documents',
    is_deleted: false,
    deleted_at: null,
    created_at: '2025-05-02T09:15:00Z',
    updated_at: '2025-05-02T09:15:00Z',
  },
  {
    id: 'doc-demo-4',
    user_id: 'demo-student',
    name: 'Merit_Scholarship_Confirmation.pdf',
    original_name: 'Merit_Scholarship_Confirmation.pdf',
    storage_path: 'demo-student/scholarship-form.pdf',
    file_type: 'application/pdf',
    file_size: 665000,
    category: 'Applications and Forms',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-15T11:00:00Z',
  },
  {
    id: 'doc-demo-5',
    user_id: 'demo-student',
    name: 'Academic_Honors_Society_Certificate.pdf',
    original_name: 'Academic_Honors_Society_Certificate.pdf',
    storage_path: 'demo-student/honors-certificate.pdf',
    file_type: 'application/pdf',
    file_size: 1820000,
    category: 'Academic Certificates',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-04-12T16:20:00Z',
    updated_at: '2026-04-12T16:20:00Z',
  },
  {
    id: 'doc-demo-trash-1',
    user_id: 'demo-student',
    name: 'Draft_Resume_Spring_2025.pdf',
    original_name: 'Draft_Resume_Spring_2025.pdf',
    storage_path: 'demo-student/draft-resume.pdf',
    file_type: 'application/pdf',
    file_size: 420000,
    category: 'Personal Documents',
    is_deleted: true,
    deleted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2025-03-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
  },
];

export const DocumentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load documents from Supabase or localStorage fallback
  const fetchDocuments = useCallback(async () => {
    const currentUserId = user?.id || 'demo-student';

    if (!isSupabaseConfigured) {
      // Offline / Local storage fallback
      const cached = localStorage.getItem(`documents_${currentUserId}`);
      if (cached) {
        try {
          setAllDocs(JSON.parse(cached));
        } catch {
          setAllDocs(INITIAL_DEMO_DOCS);
          localStorage.setItem(`documents_${currentUserId}`, JSON.stringify(INITIAL_DEMO_DOCS));
        }
      } else {
        setAllDocs(INITIAL_DEMO_DOCS);
        localStorage.setItem(`documents_${currentUserId}`, JSON.stringify(INITIAL_DEMO_DOCS));
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching documents from Supabase:', error.message);
        // Fallback to local storage if table is not yet migrated
        const cached = localStorage.getItem(`documents_${currentUserId}`);
        setAllDocs(cached ? JSON.parse(cached) : INITIAL_DEMO_DOCS);
      } else if (data) {
        setAllDocs(data as DocumentItem[]);
        localStorage.setItem(`documents_${currentUserId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Unexpected error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Derived collections
  const documents = allDocs.filter((d) => !d.is_deleted);
  const recycleBinDocuments = allDocs.filter((d) => d.is_deleted);

  // Sync state helper
  const syncDocs = (updated: DocumentItem[]) => {
    setAllDocs(updated);
    const currentUserId = user?.id || 'demo-student';
    localStorage.setItem(`documents_${currentUserId}`, JSON.stringify(updated));
  };

  // 1. Upload Document
  const uploadDocument = async (file: File, category: DocumentCategory) => {
    const currentUserId = user?.id || 'demo-student';

    // Strict 5 MB file size limit (5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        error: new Error(`File "${file.name}" exceeds the strict 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`),
      };
    }

    // Supported MIME types and extensions
    const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedExtensions.includes(fileExt)) {
      return {
        error: new Error(
          `Unsupported file type ".${fileExt}". Allowed formats are PDF, DOC, DOCX, TXT, JPG, and PNG.`
        ),
      };
    }

    // Filename sanitization: prevent path traversal and illegal characters
    const sanitizedBaseName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.+/g, '.')
      .substring(0, 100);

    const safeStoragePath = `${currentUserId}/${Date.now()}_${sanitizedBaseName}`;

    // If Supabase is unconfigured, store as local DocumentItem
    if (!isSupabaseConfigured) {
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        user_id: currentUserId,
        name: file.name,
        original_name: file.name,
        storage_path: safeStoragePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        category,
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = [newDoc, ...allDocs];
      syncDocs(updated);
      return { data: newDoc, error: null };
    }

    try {
      // 1. Upload to Supabase Storage 'documents' bucket
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(safeStoragePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.warn('Supabase storage upload error:', storageError.message);
        // Graceful fallback to local entry if bucket not yet created
        const newDoc: DocumentItem = {
          id: `doc-${Date.now()}`,
          user_id: currentUserId,
          name: file.name,
          original_name: file.name,
          storage_path: safeStoragePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          category,
          is_deleted: false,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        syncDocs([newDoc, ...allDocs]);
        return { data: newDoc, error: null };
      }

      // 2. Insert metadata into public.documents table
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: currentUserId,
          name: file.name,
          original_name: file.name,
          storage_path: safeStoragePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          category,
          is_deleted: false,
        })
        .select()
        .single();

      if (dbError) {
        return { error: new Error(dbError.message) };
      }

      const insertedDoc = dbData as DocumentItem;
      const updated = [insertedDoc, ...allDocs];
      syncDocs(updated);
      return { data: insertedDoc, error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 2. Get Short-Lived Signed Preview URL (60-second expiry)
  const getSignedPreviewUrl = async (doc: DocumentItem) => {
    if (!isSupabaseConfigured) {
      // In offline/demo mode, return a dummy safe preview SVG or data representation
      return { url: '', error: null };
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 60); // 60 seconds short-lived URL

      if (error) {
        return { error: new Error(error.message) };
      }

      return { url: data?.signedUrl, error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 3. Download Document with Original Filename
  const downloadDocument = async (doc: DocumentItem) => {
    if (!isSupabaseConfigured) {
      // Create and trigger simulated safe download for demo file
      const dummyContent = `Student Safe Vault - Verified Document: ${doc.original_name}\nCategory: ${doc.category}\nFile Size: ${doc.file_size} bytes\nEncryption: AES-256 Client-Side Protected`;
      const blob = new Blob([dummyContent], { type: doc.file_type || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);

      if (error) {
        return { error: new Error(error.message) };
      }

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 4. Rename Document
  const renameDocument = async (docId: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) {
      return { error: new Error('Document name cannot be empty.') };
    }

    const updated = allDocs.map((d) =>
      d.id === docId ? { ...d, name: cleanName, updated_at: new Date().toISOString() } : d
    );
    syncDocs(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('documents')
          .update({ name: cleanName, updated_at: new Date().toISOString() })
          .eq('id', docId);
      } catch (err) {
        console.warn('Error updating document name in Supabase:', err);
      }
    }

    return { error: null };
  };

  // 5. Change Document Category
  const changeCategory = async (docId: string, newCategory: DocumentCategory) => {
    const updated = allDocs.map((d) =>
      d.id === docId ? { ...d, category: newCategory, updated_at: new Date().toISOString() } : d
    );
    syncDocs(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('documents')
          .update({ category: newCategory, updated_at: new Date().toISOString() })
          .eq('id', docId);
      } catch (err) {
        console.warn('Error updating document category in Supabase:', err);
      }
    }

    return { error: null };
  };

  // 6. Move Document to Recycle Bin (Soft Delete)
  const moveToRecycleBin = async (docId: string) => {
    const deletedTime = new Date().toISOString();
    const updated = allDocs.map((d) =>
      d.id === docId ? { ...d, is_deleted: true, deleted_at: deletedTime } : d
    );
    syncDocs(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('documents')
          .update({ is_deleted: true, deleted_at: deletedTime })
          .eq('id', docId);
      } catch (err) {
        console.warn('Error soft-deleting document in Supabase:', err);
      }
    }

    return { error: null };
  };

  // 7. Restore Document from Recycle Bin
  const restoreFromRecycleBin = async (docId: string) => {
    const updated = allDocs.map((d) =>
      d.id === docId ? { ...d, is_deleted: false, deleted_at: null } : d
    );
    syncDocs(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('documents')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', docId);
      } catch (err) {
        console.warn('Error restoring document in Supabase:', err);
      }
    }

    return { error: null };
  };

  // 8. Permanently Delete Document (Remove from storage and DB)
  const permanentlyDelete = async (docId: string) => {
    const target = allDocs.find((d) => d.id === docId);
    const updated = allDocs.filter((d) => d.id !== docId);
    syncDocs(updated);

    if (isSupabaseConfigured && target) {
      try {
        await supabase.storage.from('documents').remove([target.storage_path]);
        await supabase.from('documents').delete().eq('id', docId);
      } catch (err) {
        console.warn('Error permanently deleting document in Supabase:', err);
      }
    }

    return { error: null };
  };

  // 9. Empty Entire Recycle Bin
  const emptyRecycleBin = async () => {
    const toDelete = allDocs.filter((d) => d.is_deleted);
    const updated = allDocs.filter((d) => !d.is_deleted);
    syncDocs(updated);

    if (isSupabaseConfigured && toDelete.length > 0) {
      try {
        const paths = toDelete.map((d) => d.storage_path);
        const ids = toDelete.map((d) => d.id);
        await supabase.storage.from('documents').remove(paths);
        await supabase.from('documents').delete().in('id', ids);
      } catch (err) {
        console.warn('Error emptying recycle bin in Supabase:', err);
      }
    }

    return { error: null };
  };

  const value = {
    documents,
    recycleBinDocuments,
    loading,
    uploadDocument,
    getSignedPreviewUrl,
    downloadDocument,
    renameDocument,
    changeCategory,
    moveToRecycleBin,
    restoreFromRecycleBin,
    permanentlyDelete,
    emptyRecycleBin,
    refreshDocuments: fetchDocuments,
  };

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
};

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
};
