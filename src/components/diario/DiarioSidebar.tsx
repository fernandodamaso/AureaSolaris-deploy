import React, { useMemo } from 'react';
import { Folder, FolderOpen, Plus, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface DiarioSidebarProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  folders: any[]; // Using any for now to avoid type issues, should be DiaryFolder[]
  selectedFolderId: string;
  selectFolder: (id: string) => Promise<void>;
  entries: any[]; // Using any for now to avoid type issues, should be DiaryEntry[]
  openTab: (entryId: string) => void;
  isAddingFolder: boolean;
  newFolderName: string;
  setIsAddingFolder: React.Dispatch<React.SetStateAction<boolean>>;
  setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
  handleCreateFolder: () => Promise<void>;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DiarioSidebar: React.FC<DiarioSidebarProps> = ({
  sidebarCollapsed,
  toggleSidebar,
  folders,
  selectedFolderId,
  selectFolder,
  entries,
  openTab,
  isAddingFolder,
  newFolderName,
  setIsAddingFolder,
  setNewFolderName,
  handleCreateFolder,
  searchQuery,
  onSearchChange
}) => {
  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(entry => entry.title.toLowerCase().includes(query));
  }, [entries, searchQuery]);



  if (sidebarCollapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-4 bg-white border-r border-gray-100">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-colors"
          title="Expandir"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex flex-col gap-[var(--spacing-sm)] mt-[var(--spacing-md)]">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => selectFolder(folder.id)}
              className={`p-[var(--spacing-sm)] rounded-[var(--radius-md)] transition-colors ${
                selectedFolderId === folder.id
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title={folder.name}
            >
              {selectedFolderId === folder.id ? (
                <FolderOpen className="w-5 h-5" />
              ) : (
                <Folder className="w-5 h-5" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col bg-white border-r border-gray-100">
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-colors"
          title="Recolher"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <input
            type="text"
            placeholder="buscar..."
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full pl-[var(--spacing-sm)] pr-[var(--spacing-sm)] py-[var(--spacing-xs)] text-[var(--font-size-xs)] bg-gray-50 border-none rounded-[var(--radius-sm)] placeholder-gray-300 focus:outline-none focus:ring-2 focus-ring-[var(--color-accent)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-2">
            📁 PASTAS
          </h3>
          <div className="space-y-0.5">
            {filteredEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => openTab(entry.id)}
                className="w-full flex items-center gap-[var(--spacing-sm)] px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-[var(--font-size-xs)] rounded-[var(--radius-sm)] hover:bg-gray-50 text-gray-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-gray-300" />
                <span className="flex-1 truncate">{entry.title}</span>
              </button>
            ))}

            {isAddingFolder ? (
              <div className="flex items-center gap-[var(--spacing-sm)] px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                <Folder className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setIsAddingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder="Nome da pasta"
                  autoFocus
                  className="flex-1 text-sm bg-transparent border-b border-[var(--color-accent)] focus:outline-none"
                />
              </div>
            ) : (
              <button
                onClick={() => setIsAddingFolder(true)}
                className="w-full flex items-center gap-[var(--spacing-sm)] px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-[var(--font-size-xs)] text-gray-400 hover:text-gold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Pasta</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 pt-0">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-2">
            📝 NOTAS EM {folders.find(f => f.id === selectedFolderId)?.name.toUpperCase() || 'GERAL'}
          </h3>
          <div className="space-y-0.5">
            {filteredEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => openTab(entry.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-gray-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-gray-300" />
                <span className="flex-1 truncate">{entry.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};