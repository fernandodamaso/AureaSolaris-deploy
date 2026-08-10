import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DiaryEntry, DiaryFolder } from '../types/diario';
import { safeInvoke } from '../utils/tauri';

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
        const folderList = await safeInvoke<DiaryFolder[]>('diary_list_folders');
        if (folderList) setFolders(folderList);
        const entryList = await safeInvoke<DiaryEntry[]>('diary_list_entries', { folder_id: DEFAULT_FOLDER });
        if (entryList) setEntries(entryList);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selectFolder = useCallback(async (id: string) => {
    setSelectedFolderId(id);
    setActiveEntryId(null);
    setActiveEntry(null);
    const entryList = await safeInvoke<DiaryEntry[]>('diary_list_entries', { folder_id: id });
    if (entryList) setEntries(entryList);
  }, []);

  const selectEntry = useCallback(async (id: string) => {
    setActiveEntryId(id);
    const entry = await safeInvoke<DiaryEntry>('diary_get_entry', { id });
    if (entry) setActiveEntry(entry);
  }, []);

  const createEntry = useCallback(async () => {
    const entry = await safeInvoke<DiaryEntry>('diary_create_entry', {
      title: 'Nova Nota',
      folder_id: selectedFolderId,
    });
    if (entry) {
      setEntries(prev => [entry, ...prev]);
      setActiveEntryId(entry.id);
      setActiveEntry(entry);
    }
  }, [selectedFolderId]);

  const updateEntry = useCallback(async (id: string, changes: { title?: string; content?: string }) => {
    const payload: Record<string, string> = { id };
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.content !== undefined) payload.content = changes.content;
    const updated = await safeInvoke<DiaryEntry>('diary_update_entry', payload);
    if (updated) {
      setActiveEntry(updated);
      setEntries(prev => prev.map(e => (e.id === id ? updated : e)));
      return true;
    }
    return false;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    await safeInvoke('diary_delete_entry', { id });
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
    const folder = await safeInvoke<DiaryFolder>('diary_create_folder', { name, icon: '📁' });
    if (folder) setFolders(prev => [...prev, folder]);
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await safeInvoke('diary_delete_folder', { id });
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolderId === id) {
      setSelectedFolderId(DEFAULT_FOLDER);
      const entryList = await safeInvoke<DiaryEntry[]>('diary_list_entries', { folder_id: DEFAULT_FOLDER });
      if (entryList) setEntries(entryList);
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
