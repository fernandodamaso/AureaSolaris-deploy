export interface DiaryEntry {
  id: string;            // crypto.randomUUID()
  title: string;
  content: string;       // TipTap JSON (stringified)
  folderId: string;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  wordCount: number;
}

export interface DiaryFolder {
  id: string;
  name: string;
  icon: string;          // emoji
  order: number;
  createdAt: string;
}

export interface DiaryTabState {
  openTabIds: string[];
  activeTabId: string | null;
}
