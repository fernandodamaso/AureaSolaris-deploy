import React from 'react';

interface DiarioTabsProps {
  openTabs: string[];
  activeTabId: string | null;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  createEntry: (title: string, folderId: string) => Promise<any>;
  entries: any[]; // Using any for now to avoid type issues, should be DiaryEntry[]
}

const DiarioTabs: React.FC<DiarioTabsProps> = ({
  openTabs,
  activeTabId,
  setActiveTab,
  closeTab,
  createEntry,
  entries
}) => {
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    closeTab(tabId);
    // If we closed the active tab, activate another one
    if (tabId === activeTabId) {
      const newActiveId = openTabs.find(id => id !== tabId);
      if (newActiveId !== undefined) {
        setActiveTab(newActiveId);
      }
      // If no tabs left, activeTabId will be undefined/null which is handled elsewhere
    }
  };

  const handleNewTab = () => {
    // Create a new entry with default title and general folder
    createEntry('Nova Nota', 'general');
  };

  // Helper to get entry title or placeholder
  const getEntryTitle = (entryId: string): string => {
    const entry = entries.find(e => e.id === entryId);
    return entry ? entry.title : 'Nota Sem Título';
  };

  return (
    <div className="flex h-[var(--spacing-lg)] items-center px-[var(--spacing-sm)] border-b border-[var(--color-accent)]/10 bg-[var(--color-bg-secondary)]">
      <div className="flex-1 overflow-x-auto pb-[var(--spacing-xs)]">
        <div className="flex space-x-[var(--spacing-xs)]">
          {openTabs.map((tabId) => (
            <div
              key={tabId}
              className={`flex h-[var(--spacing-lg)] items-center px-[var(--spacing-sm)] rounded-t-[var(--radius-md)] ${
                tabId === activeTabId
                  ? 'border-b-[var(--spacing-sm)] border-[var(--color-accent)] bg-[var(--color-bg-secondary)]'
                  : 'border-b-[var(--spacing-xs)] border-transparent hover:bg-[var(--color-bg-secondary)]/50'
              }`}
              onClick={() => handleTabClick(tabId)}
            >
              <span className="truncate max-w-[120px] text-[var(--font-size-xs)]">
                {getEntryTitle(tabId)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabClose(tabId);
                }}
                className="ml-[var(--spacing-xs)] flex h-[var(--spacing-sm)] w-[var(--spacing-sm)] items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-secondary)]/50"
                aria-label="Fechar aba"
              >
                <svg className="h-[var(--spacing-xs)] w-[var(--spacing-xs)] stroke-current" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={handleNewTab}
            className="flex h-[var(--spacing-lg)] w-[var(--spacing-lg)] items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)]/50"
          >
            <svg className="h-[var(--spacing-sm)] w-[var(--spacing-sm)] stroke-current" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6M6 10h8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiarioTabs;