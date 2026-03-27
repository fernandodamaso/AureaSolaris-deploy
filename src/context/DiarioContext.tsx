import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DiaryEntry, DiaryFolder, DiaryTabState } from '../types/diario';
import { safeInvoke } from '../utils/tauri';

interface DiarioContextType {
  // State
  folders: DiaryFolder[];
  entries: DiaryEntry[];
  openTabs: string[];
  activeTabId: string | null;
  selectedFolderId: string;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  activeEntry: DiaryEntry | null;

  // Actions
  loadInitialData: () => Promise<void>;
  createEntry: (title: string, folderId: string) => Promise<DiaryEntry>;
  updateEntry: (id: string, changes: { title?: string; content?: string; folderId?: string }) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  createFolder: (name: string, icon: string) => Promise<DiaryFolder>;
  deleteFolder: (id: string) => Promise<void>;
  selectFolder: (id: string) => Promise<void>;
  openTab: (entryId: string) => void;
  closeTab: (entryId: string) => void;
  setActiveTab: (entryId: string) => void;
  toggleSidebar: () => void;
}

const DiarioContext = createContext<DiarioContextType | undefined>(undefined);

const DEFAULT_FOLDER_ID = 'general';

export const DiarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [entryCache, setEntryCache] = useState<Map<string, DiaryEntry>>(new Map());
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(DEFAULT_FOLDER_ID);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeEntry = useMemo(() => {
    if (!activeTabId) return null;
    return entryCache.get(activeTabId) ?? entries.find(e => e.id === activeTabId) ?? null;
  }, [activeTabId, entryCache, entries]);

  const persistTabs = useCallback(async (tabs: string[], activeId: string | null) => {
    await safeInvoke('diary_save_tabs', { open_ids: tabs, active_id: activeId });
  }, []);

  const loadEntryIntoCache = useCallback(async (entryId: string) => {
    if (entryCache.has(entryId)) return;
    const entry = await safeInvoke<DiaryEntry>('diary_get_entry', { id: entryId });
    if (entry) {
      setEntryCache(prev => new Map(prev).set(entryId, entry));
    }
  }, [entryCache]);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const folderList = await safeInvoke<DiaryFolder[]>('diary_list_folders');
      if (folderList) setFolders(folderList);

      const tabState = await safeInvoke<DiaryTabState>('diary_load_tabs');
      if (tabState) {
        setOpenTabs(tabState.openTabIds);
        setActiveTabId(tabState.activeTabId);
      }

      const entryList = await safeInvoke<DiaryEntry[]>('diary_list_entries', { folder_id: selectedFolderId });
      if (entryList) setEntries(entryList);

      // Pre-load entries for open tabs
      const idsToLoad = tabState?.openTabIds ?? [];
      for (const id of idsToLoad) {
        await loadEntryIntoCache(id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolderId, loadEntryIntoCache]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const createEntry = useCallback(async (title: string, folderId: string): Promise<DiaryEntry> => {
    const entry = await safeInvoke<DiaryEntry>('diary_create_entry', { title, folder_id: folderId });
    if (!entry) throw new Error('Failed to create entry');
    setEntries(prev => [entry, ...prev]);
    setEntryCache(prev => new Map(prev).set(entry.id, entry));
    const newTabs = openTabs.includes(entry.id) ? openTabs : [...openTabs, entry.id];
    setOpenTabs(newTabs);
    setActiveTabId(entry.id);
    persistTabs(newTabs, entry.id);
    return entry;
  }, [openTabs, persistTabs]);

  const updateEntry = useCallback(async (id: string, changes: { title?: string; content?: string; folderId?: string }) => {
    const payload: Record<string, string> = { id };
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.content !== undefined) payload.content = changes.content;
    if (changes.folderId !== undefined) payload.folder_id = changes.folderId;
    const updated = await safeInvoke<DiaryEntry>('diary_update_entry', payload);
    if (!updated) return;
    setEntries(prev => prev.map(e => e.id === id ? updated : e));
    setEntryCache(prev => new Map(prev).set(id, updated));
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    await safeInvoke('diary_delete_entry', { id });
    setEntries(prev => prev.filter(e => e.id !== id));
    setEntryCache(prev => { const m = new Map(prev); m.delete(id); return m; });
    if (openTabs.includes(id)) {
      const newTabs = openTabs.filter(t => t !== id);
      setOpenTabs(newTabs);
      const newActive = activeTabId === id
        ? (newTabs.length > 0 ? newTabs[newTabs.length - 1] : null)
        : activeTabId;
      setActiveTabId(newActive);
      persistTabs(newTabs, newActive);
    }
  }, [openTabs, activeTabId, persistTabs]);

  const createFolder = useCallback(async (name: string, icon: string): Promise<DiaryFolder> => {
    const folder = await safeInvoke<DiaryFolder>('diary_create_folder', { name, icon });
    if (!folder) throw new Error('Failed to create folder');
    setFolders(prev => [...prev, folder]);
    return folder;
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await safeInvoke('diary_delete_folder', { id });
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolderId === id) {
      setSelectedFolderId(DEFAULT_FOLDER_ID);
      const entryList = await safeInvoke<DiaryEntry[]>('diary_list_entries', { folder_id: DEFAULT_FOLDER_ID });
      if (entryList) setEntries(entryList);
    }
  }, [selectedFolderId]);

  const selectFolder = useCallback(async (id: string) => {
    setSelectedFolderId(id);
    const entryList = await safeInvoke<DiaryEntry[]>('diary_list_entries', { folder_id: id });
    if (entryList) setEntries(entryList);
  }, []);

  const openTab = useCallback((entryId: string) => {
    const newTabs = openTabs.includes(entryId) ? openTabs : [...openTabs, entryId];
    setOpenTabs(newTabs);
    setActiveTabId(entryId);
    loadEntryIntoCache(entryId);
    persistTabs(newTabs, entryId);
  }, [openTabs, loadEntryIntoCache, persistTabs]);

  const closeTab = useCallback((entryId: string) => {
    const newTabs = openTabs.filter(t => t !== entryId);
    const newActive = activeTabId === entryId
      ? (newTabs.length > 0 ? newTabs[newTabs.length - 1] : null)
      : activeTabId;
    setOpenTabs(newTabs);
    setActiveTabId(newActive);
    if (newActive) loadEntryIntoCache(newActive);
    persistTabs(newTabs, newActive);
  }, [openTabs, activeTabId, loadEntryIntoCache, persistTabs]);

  const setActiveTab = useCallback((entryId: string) => {
    setActiveTabId(entryId);
    loadEntryIntoCache(entryId);
    persistTabs(openTabs, entryId);
  }, [openTabs, loadEntryIntoCache, persistTabs]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <DiarioContext.Provider value={{
      folders, entries, openTabs, activeTabId, selectedFolderId,
      isLoading, sidebarCollapsed, activeEntry,
      loadInitialData, createEntry, updateEntry, deleteEntry,
      createFolder, deleteFolder, selectFolder,
      openTab, closeTab, setActiveTab, toggleSidebar,
    }}>
      {children}
    </DiarioContext.Provider>
  );
};

export const useDiario = () => {
  const context = useContext(DiarioContext);
  if (!context) throw new Error("useDiario must be used within a DiarioProvider");
  return context;
};
