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
    <div className="flex h-[40px] items-center px-3 border-b border-gold/10 bg-white">
      <div className="flex-1 overflow-x-auto pb-[2px]">
        <div className="flex space-x-1">
          {openTabs.map((tabId) => (
            <div
              key={tabId}
              className={`flex h-[36px] items-center px-3 rounded-t-md ${
                tabId === activeTabId
                  ? 'border-b-2 border-gold bg-white'
                  : 'border-b border-transparent hover:bg-gray-50'
              }`}
              onClick={() => handleTabClick(tabId)}
            >
              <span className="truncate max-w-[120px]">
                {getEntryTitle(tabId)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabClose(tabId);
                }}
                className="ml-2 flex h-[18px] w-[18px] items-center justify-center rounded hover:bg-gray-200"
                aria-label="Fechar aba"
              >
                <svg className="h-[10px] w-[10px] stroke-current" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={handleNewTab}
            className="flex h-[36px] w-[36px] items-center justify-center rounded hover:bg-gray-50"
          >
            <svg className="h-[18px] w-[18px] stroke-current" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6M6 10h8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiarioTabs;