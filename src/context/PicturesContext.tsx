import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type PictureAlbum =
  | 'Personal'
  | 'College Events'
  | 'ID Photos'
  | 'Academic'
  | 'Memories'
  | 'Other';

export const PICTURE_ALBUMS: PictureAlbum[] = [
  'Personal',
  'College Events',
  'ID Photos',
  'Academic',
  'Memories',
  'Other',
];

export interface PictureItem {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  album: PictureAlbum;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  localPreviewUrl?: string;
}

export interface UploadProgressInfo {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface PicturesContextType {
  pictures: PictureItem[];
  recycleBinPictures: PictureItem[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: UploadProgressInfo[];
  uploadPictures: (files: File[], album: PictureAlbum) => Promise<{ successCount: number; errors: string[] }>;
  getSignedPreviewUrl: (pic: PictureItem) => Promise<{ url?: string; error: Error | null }>;
  downloadPicture: (pic: PictureItem) => Promise<{ error: Error | null }>;
  renamePicture: (picId: string, newName: string) => Promise<{ error: Error | null }>;
  changeAlbum: (picId: string, newAlbum: PictureAlbum) => Promise<{ error: Error | null }>;
  moveToRecycleBin: (picId: string) => Promise<{ error: Error | null }>;
  restoreFromRecycleBin: (picId: string) => Promise<{ error: Error | null }>;
  permanentlyDelete: (picId: string) => Promise<{ error: Error | null }>;
  emptyRecycleBin: () => Promise<{ error: Error | null }>;
  refreshPictures: () => Promise<void>;
}

const PicturesContext = createContext<PicturesContextType | undefined>(undefined);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const INITIAL_DEMO_PICTURES: PictureItem[] = [
  {
    id: 'pic-demo-1',
    user_id: 'demo-student',
    name: 'Official_Student_Passport_Photo_2026.png',
    original_name: 'Official_Student_Passport_Photo_2026.png',
    storage_path: 'demo-student/passport-photo.png',
    file_type: 'image/png',
    file_size: 1450000,
    album: 'ID Photos',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-08-12T10:00:00Z',
    updated_at: '2026-08-12T10:00:00Z',
  },
  {
    id: 'pic-demo-2',
    user_id: 'demo-student',
    name: 'Campus_SmartCard_Badge_Portrait.jpg',
    original_name: 'Campus_SmartCard_Badge_Portrait.jpg',
    storage_path: 'demo-student/badge-portrait.jpg',
    file_type: 'image/jpeg',
    file_size: 980000,
    album: 'ID Photos',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-08-14T11:20:00Z',
    updated_at: '2026-08-14T11:20:00Z',
  },
  {
    id: 'pic-demo-3',
    user_id: 'demo-student',
    name: 'Annual_Hackathon_Champion_Team.jpg',
    original_name: 'Annual_Hackathon_Champion_Team.jpg',
    storage_path: 'demo-student/hackathon.jpg',
    file_type: 'image/jpeg',
    file_size: 3850000,
    album: 'College Events',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-03-28T14:40:00Z',
    updated_at: '2026-03-28T14:40:00Z',
  },
  {
    id: 'pic-demo-4',
    user_id: 'demo-student',
    name: 'Dean_Award_Ceremony_Presentation.png',
    original_name: 'Dean_Award_Ceremony_Presentation.png',
    storage_path: 'demo-student/dean-ceremony.png',
    file_type: 'image/png',
    file_size: 2950000,
    album: 'Academic',
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-05-10T16:15:00Z',
    updated_at: '2026-05-10T16:15:00Z',
  },
];

export const PicturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'demo-student';

  const [pictures, setPictures] = useState<PictureItem[]>([]);
  const [recycleBinPictures, setRecycleBinPictures] = useState<PictureItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo[]>([]);

  const refreshPictures = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase
          .from('pictures')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const active = data.filter((p: PictureItem) => !p.is_deleted);
          const recycle = data.filter((p: PictureItem) => p.is_deleted);
          setPictures(active);
          setRecycleBinPictures(recycle);
          setLoading(false);
          return;
        }
      }

      const localKey = `pictures_${userId}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const parsed: PictureItem[] = JSON.parse(saved);
          setPictures(parsed.filter((p) => !p.is_deleted));
          setRecycleBinPictures(parsed.filter((p) => p.is_deleted));
        } catch {
          setPictures(INITIAL_DEMO_PICTURES);
          setRecycleBinPictures([]);
        }
      } else {
        localStorage.setItem(localKey, JSON.stringify(INITIAL_DEMO_PICTURES));
        setPictures(INITIAL_DEMO_PICTURES);
        setRecycleBinPictures([]);
      }
    } catch (err) {
      console.error('Error fetching pictures:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userId]);

  useEffect(() => {
    refreshPictures();
  }, [refreshPictures]);

  const persistLocalPictures = (all: PictureItem[]) => {
    const localKey = `pictures_${userId}`;
    localStorage.setItem(localKey, JSON.stringify(all));
    setPictures(all.filter((p) => !p.is_deleted));
    setRecycleBinPictures(all.filter((p) => p.is_deleted));
  };

  const uploadPictures = async (
    files: File[],
    album: PictureAlbum
  ): Promise<{ successCount: number; errors: string[] }> => {
    if (files.length === 0) return { successCount: 0, errors: ['No files selected.'] };

    setUploading(true);
    const initialProgress = files.map((f) => ({
      fileName: f.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    const errors: string[] = [];
    let successCount = 0;
    const uploadedItems: PictureItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`"${file.name}" exceeds 5 MB maximum size limit.`);
        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'error', error: 'Exceeds 5 MB limit' } : item))
        );
        continue;
      }

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported image format. Only JPG, JPEG, and PNG are allowed.`);
        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'error', error: 'Unsupported format' } : item))
        );
        continue;
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${Date.now()}_${sanitizedName}`;

      try {
        if (isSupabaseConfigured && user) {
          const { error: uploadError } = await supabase.storage
            .from('pictures')
            .upload(storagePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) throw uploadError;

          const { data: inserted, error: insertError } = await supabase
            .from('pictures')
            .insert({
              user_id: user.id,
              name: file.name,
              original_name: file.name,
              storage_path: storagePath,
              file_type: file.type || 'image/jpeg',
              file_size: file.size,
              album,
              is_deleted: false,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          uploadedItems.push(inserted as PictureItem);
        } else {
          const localPreviewUrl = URL.createObjectURL(file);
          const newItem: PictureItem = {
            id: `pic-${Date.now()}-${i}`,
            user_id: userId,
            name: file.name,
            original_name: file.name,
            storage_path: storagePath,
            file_type: file.type || 'image/jpeg',
            file_size: file.size,
            album,
            is_deleted: false,
            deleted_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            localPreviewUrl,
          };
          uploadedItems.push(newItem);
        }

        successCount++;
        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, progress: 100, status: 'completed' } : item))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to upload "${file.name}": ${msg}`);
        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'error', error: msg } : item))
        );
      }
    }

    if (uploadedItems.length > 0) {
      if (isSupabaseConfigured && user) {
        setPictures((prev) => [...uploadedItems, ...prev]);
      } else {
        const localAll = [...uploadedItems, ...pictures, ...recycleBinPictures];
        persistLocalPictures(localAll);
      }
    }

    setUploading(false);
    return { successCount, errors };
  };

  const getSignedPreviewUrl = async (pic: PictureItem): Promise<{ url?: string; error: Error | null }> => {
    if (pic.localPreviewUrl) {
      return { url: pic.localPreviewUrl, error: null };
    }

    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase.storage
          .from('pictures')
          .createSignedUrl(pic.storage_path, 60);

        if (error) throw error;
        return { url: data.signedUrl, error: null };
      }

      return {
        url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
        error: null,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const downloadPicture = async (pic: PictureItem): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase.storage
          .from('pictures')
          .download(pic.storage_path);

        if (error) throw error;

        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = pic.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return { error: null };
      }

      const blob = new Blob([`Image File: ${pic.name}
Album: ${pic.album}`], {
        type: pic.file_type,
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pic.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const renamePicture = async (picId: string, newName: string): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('pictures')
          .update({ name: newName, updated_at: new Date().toISOString() })
          .eq('id', picId);

        if (error) throw error;
      }

      setPictures((prev) =>
        prev.map((p) => (p.id === picId ? { ...p, name: newName, updated_at: new Date().toISOString() } : p))
      );

      const localAll = [...pictures.map((p) => (p.id === picId ? { ...p, name: newName } : p)), ...recycleBinPictures];
      persistLocalPictures(localAll);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const changeAlbum = async (picId: string, newAlbum: PictureAlbum): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('pictures')
          .update({ album: newAlbum, updated_at: new Date().toISOString() })
          .eq('id', picId);

        if (error) throw error;
      }

      setPictures((prev) =>
        prev.map((p) => (p.id === picId ? { ...p, album: newAlbum, updated_at: new Date().toISOString() } : p))
      );

      const localAll = [...pictures.map((p) => (p.id === picId ? { ...p, album: newAlbum } : p)), ...recycleBinPictures];
      persistLocalPictures(localAll);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const moveToRecycleBin = async (picId: string): Promise<{ error: Error | null }> => {
    const now = new Date().toISOString();
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('pictures')
          .update({ is_deleted: true, deleted_at: now })
          .eq('id', picId);

        if (error) throw error;
      }

      const target = pictures.find((p) => p.id === picId);
      if (target) {
        const updated = { ...target, is_deleted: true, deleted_at: now };
        setPictures((prev) => prev.filter((p) => p.id !== picId));
        setRecycleBinPictures((prev) => [updated, ...prev]);

        const localAll = [...pictures.filter((p) => p.id !== picId), updated, ...recycleBinPictures];
        persistLocalPictures(localAll);
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const restoreFromRecycleBin = async (picId: string): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('pictures')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', picId);

        if (error) throw error;
      }

      const target = recycleBinPictures.find((p) => p.id === picId);
      if (target) {
        const restored = { ...target, is_deleted: false, deleted_at: null };
        setRecycleBinPictures((prev) => prev.filter((p) => p.id !== picId));
        setPictures((prev) => [restored, ...prev]);

        const localAll = [...pictures, restored, ...recycleBinPictures.filter((p) => p.id !== picId)];
        persistLocalPictures(localAll);
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const permanentlyDelete = async (picId: string): Promise<{ error: Error | null }> => {
    try {
      const target = recycleBinPictures.find((p) => p.id === picId) || pictures.find((p) => p.id === picId);
      if (isSupabaseConfigured && user && target) {
        await supabase.storage.from('pictures').remove([target.storage_path]);
        const { error } = await supabase.from('pictures').delete().eq('id', picId);
        if (error) throw error;
      }

      setPictures((prev) => prev.filter((p) => p.id !== picId));
      setRecycleBinPictures((prev) => prev.filter((p) => p.id !== picId));

      const localAll = [...pictures.filter((p) => p.id !== picId), ...recycleBinPictures.filter((p) => p.id !== picId)];
      persistLocalPictures(localAll);
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const emptyRecycleBin = async (): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured && user && recycleBinPictures.length > 0) {
        const paths = recycleBinPictures.map((p) => p.storage_path);
        await supabase.storage.from('pictures').remove(paths);
        const ids = recycleBinPictures.map((p) => p.id);
        const { error } = await supabase.from('pictures').delete().in('id', ids);
        if (error) throw error;
      }

      setRecycleBinPictures([]);
      const localKey = `pictures_${userId}`;
      localStorage.setItem(localKey, JSON.stringify(pictures));
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  return (
    <PicturesContext.Provider
      value={{
        pictures,
        recycleBinPictures,
        loading,
        uploading,
        uploadProgress,
        uploadPictures,
        getSignedPreviewUrl,
        downloadPicture,
        renamePicture,
        changeAlbum,
        moveToRecycleBin,
        restoreFromRecycleBin,
        permanentlyDelete,
        emptyRecycleBin,
        refreshPictures,
      }}
    >
      {children}
    </PicturesContext.Provider>
  );
};

export const usePictures = () => {
  const context = useContext(PicturesContext);
  if (!context) {
    throw new Error('usePictures must be used within a PicturesProvider');
  }
  return context;
};
