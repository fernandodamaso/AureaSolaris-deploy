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
      <div className="flex flex-col bg-[#FCF9F1] min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full border-4 border-b-gold h-8 w-8"></div>
          <span className="ml-3 text-gray-600 font-medium">Carregando suas memórias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#FCF9F1] min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-colors"
            title="Menu"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[18px] font-black uppercase tracking-[0.2em] text-gray-800">
            Diário
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCreateEntry}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-colors"
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-400 mb-4">Selecione uma nota para começar a escrever</p>
                <button 
                  onClick={handleCreateEntry}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Criar primeira nota
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};