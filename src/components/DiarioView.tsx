import React, { useState } from 'react';
import { DiarioSidebar } from './diario/DiarioSidebar';
import DiarioTabs from './diario/DiarioTabs';
import DiarioEditor from './diario/DiarioEditor';
import { useDiario } from '../context/DiarioContext';
import { ChevronLeft, Plus } from 'lucide-react';

export const DiarioView = () => {
  const {
    folders,
    entries,
    openTabs,
    activeTabId,
    selectedFolderId,
    sidebarCollapsed,
    activeEntry,
    createEntry,
    createFolder,
    selectFolder,
    openTab,
    closeTab,
    setActiveTab,
    toggleSidebar,
    updateEntry,
    isLoading
  } = useDiario();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), '📁');
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const handleCreateEntry = async () => {
    await createEntry('Nova Nota', selectedFolderId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex flex-col items-center justify-center py-12 space-y-[var(--spacing-sm)]">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--color-accent)]/20 animate-spin"></div>
            <div className="absolute inset-0 rounded-full border-[var(--color-accent)] border-t-[var(--color-accent)] border-r-[var(--color-accent)] border-b-[var(--color-accent)/3] border-l-[var(--color-accent)/3] animate-[spin_3s_linear_infinite]"></div>
          </div>
          <span className="ml-3 text-[var(--color-text-secondary)] font-medium">Carregando suas memórias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-[var(--spacing-lg)] py-[var(--spacing-md)] bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-[var(--spacing-md)]">
          <button 
            onClick={toggleSidebar}
            className="p-[var(--spacing-sm)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)]/50 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
            title="Menu"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[var(--font-size-lg)] font-black uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
            Diário
          </h1>
        </div>
        <div className="flex items-center gap-[var(--spacing-sm)]">
          <button 
            onClick={handleCreateEntry}
            className="p-[var(--spacing-sm)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)]/50 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
            title="Nova nota"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Sidebar */}
        <DiarioSidebar 
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          folders={folders}
          selectedFolderId={selectedFolderId}
          selectFolder={selectFolder}
          entries={filteredEntries}
          openTab={openTab}
          isAddingFolder={isAddingFolder}
          newFolderName={newFolderName}
          setIsAddingFolder={setIsAddingFolder}
          setNewFolderName={setNewFolderName}
          handleCreateFolder={handleCreateFolder}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {/* Tabs and Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs Bar */}
          <DiarioTabs 
            openTabs={openTabs}
            activeTabId={activeTabId}
            setActiveTab={setActiveTab}
            closeTab={closeTab}
            createEntry={createEntry}
            entries={entries}
          />

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {activeTabId ? (
              <DiarioEditor 
                entry={activeEntry}
                updateEntry={updateEntry}
                onSave={(_entry) => {
                  // Entry is already saved via updateEntry in onUpdate callback
                  // This is just for additional handling if needed
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-[var(--spacing-lg)] text-center">
                <div className="flex flex-col items-center space-y-[var(--spacing-sm)]">
                  <div className="flex items-center justify-center">
                    <svg className="h-12 w-12 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s1-7 5-7 5 7 5 7M2 12s1 7 5 7 5-7 5-7" />
                    </svg>
                  </div>
                  <p className="text-[var(--color-text-secondary)] mb-[var(--spacing-xs)]">Selecione uma nota para começar a escrever</p>
                  <button 
                    onClick={handleCreateEntry}
                    className="px-[var(--spacing-md)] py-[var(--spacing-xs)] bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)]/30 rounded-[var(--radius-sm)] text-[var(--font-size-xs)] transition-colors"
                  >
                    Criar primeira nota
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};