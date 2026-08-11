export type DiaryStatus = 'idea' | 'draft' | 'done';

export interface DiaryEntry {
  id: string;            // crypto.randomUUID()
  title: string;
  content: string;       // Markdown plain text
  folderId: string;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  wordCount: number;
  status: DiaryStatus;   // Kanban status: idea | draft | done
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

export interface DiaryAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const DIARY_STATUS_CONFIG: Record<DiaryStatus, { label: string; emoji: string; color: string }> = {
  idea: { label: 'Ideias', emoji: '💡', color: '#f59e0b' },
  draft: { label: 'Escrevendo', emoji: '✍️', color: '#3b82f6' },
  done: { label: 'Concluído', emoji: '✅', color: '#10b981' },
};
