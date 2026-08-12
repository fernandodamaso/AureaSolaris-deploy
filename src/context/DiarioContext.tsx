import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DiaryEntry, DiaryEntryResponse, DiaryFolder, DiaryFolderResponse } from '../types/diario';
import {
  createDiaryEntry,
  createDiaryFolder,
  deleteDiaryEntry,
  deleteDiaryFolder,
  getDiaryEntry,
  listDiaryEntries,
  listDiaryFolders,
  updateDiaryEntry,
} from '../utils/diary';

interface DiarioContextType {
  folders: DiaryFolder[];
  entries: DiaryEntry[];
  selectedFolderId: string;
  activeEntryId: string | null;
  activeEntry: DiaryEntry | null;
  isLoading: boolean;

  selectFolder: (id: string) => Promise<void>;
  selectEntry: (id: string) => Promise<void>;
  createEntry: () => Promise<void>;
  updateEntry: (id: string, changes: { title?: string; content?: string }) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

const DiarioContext = createContext<DiarioContextType | undefined>(undefined);
const DEFAULT_FOLDER = 'general';

const normalizeEntry = (raw: DiaryEntry | DiaryEntryResponse): DiaryEntry => ({
  id: raw.id,
  title: raw.title || 'Nota sem título',
  content: raw.content || '',
  folderId: 'folderId' in raw ? raw.folderId : raw.folder_id,
  createdAt: 'createdAt' in raw ? raw.createdAt : raw.created_at,
  updatedAt: 'updatedAt' in raw ? raw.updatedAt : raw.updated_at,
  wordCount: 'wordCount' in raw ? raw.wordCount : raw.word_count,
  status: raw.status || 'idea',
});

const normalizeFolder = (raw: DiaryFolder | DiaryFolderResponse): DiaryFolder => ({
  id: raw.id,
  name: raw.name,
  icon: raw.icon || '📁',
  order: raw.order ?? 0,
  createdAt: 'createdAt' in raw ? raw.createdAt : raw.created_at,
});

export const DiarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState(DEFAULT_FOLDER);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<DiaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data on mount
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const folderList = await listDiaryFolders();
        if (folderList) setFolders(folderList.map(normalizeFolder));
        const entryList = await listDiaryEntries(DEFAULT_FOLDER);
        if (entryList) setEntries(entryList.map(normalizeEntry));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selectFolder = useCallback(async (id: string) => {
    setSelectedFolderId(id);
    setActiveEntryId(null);
    setActiveEntry(null);
    const entryList = await listDiaryEntries(id);
    if (entryList) setEntries(entryList.map(normalizeEntry));
  }, []);

  const selectEntry = useCallback(async (id: string) => {
    setActiveEntryId(id);
    const entry = await getDiaryEntry(id);
    if (entry) setActiveEntry(normalizeEntry(entry));
  }, []);

  const createEntry = useCallback(async () => {
    const entry = await createDiaryEntry({
      title: 'Nova Nota',
      folder_id: selectedFolderId,
    });
    if (entry) {
      const normalized = normalizeEntry(entry);
      setEntries(prev => [normalized, ...prev]);
      setActiveEntryId(entry.id);
      setActiveEntry(normalized);
    }
  }, [selectedFolderId]);

  const updateEntry = useCallback(async (id: string, changes: { title?: string; content?: string }) => {
    const updated = await updateDiaryEntry({ id, ...changes });
    if (updated) {
      const normalized = normalizeEntry(updated);
      setActiveEntry(normalized);
      setEntries(prev => prev.map(e => (e.id === id ? normalized : e)));
      return true;
    }
    return false;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    await deleteDiaryEntry(id);
    setEntries(prev => {
      const newEntries = prev.filter(e => e.id !== id);
      if (activeEntryId === id) {
        if (newEntries.length > 0) {
          const nextEntry = newEntries[0];
          setActiveEntryId(nextEntry.id);
          setActiveEntry(nextEntry);
        } else {
          setActiveEntryId(null);
          setActiveEntry(null);
        }
      }
      return newEntries;
    });
  }, [activeEntryId]);

  const createFolder = useCallback(async (name: string) => {
    const folder = await createDiaryFolder({ name, icon: '📁' });
    if (folder) setFolders(prev => [...prev, normalizeFolder(folder)]);
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await deleteDiaryFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolderId === id) {
      setSelectedFolderId(DEFAULT_FOLDER);
      const entryList = await listDiaryEntries(DEFAULT_FOLDER);
      if (entryList) setEntries(entryList.map(normalizeEntry));
    }
  }, [selectedFolderId]);

  const value = useMemo(
    () => ({
      folders, entries, selectedFolderId, activeEntryId, activeEntry, isLoading,
      selectFolder, selectEntry, createEntry, updateEntry, deleteEntry,
      createFolder, deleteFolder,
    }),
    [folders, entries, selectedFolderId, activeEntryId, activeEntry, isLoading,
      selectFolder, selectEntry, createEntry, updateEntry, deleteEntry,
      createFolder, deleteFolder],
  );

  return <DiarioContext.Provider value={value}>{children}</DiarioContext.Provider>;
};

export const useDiario = () => {
  const ctx = useContext(DiarioContext);
  if (!ctx) throw new Error('useDiario must be used within DiarioProvider');
  return ctx;
};
