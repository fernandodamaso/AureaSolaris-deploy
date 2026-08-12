import { safeInvoke } from './tauri';
import type { DiaryEntryResponse, DiaryFolderResponse, DiaryStatus } from '../types/diario';

export interface DiaryCreateFolderRequest {
  name: string;
  icon: string;
}

export interface DiaryCreateEntryRequest {
  title: string;
  folder_id: string;
  status?: DiaryStatus;
}

export interface DiaryUpdateEntryRequest {
  id: string;
  title?: string;
  content?: string;
  folder_id?: string;
  status?: DiaryStatus;
}

export type DiaryMutationResult = boolean | void;

export function listDiaryFolders(): Promise<DiaryFolderResponse[] | null> {
  return safeInvoke<DiaryFolderResponse[]>('diary_list_folders');
}

export function createDiaryFolder(
  request: DiaryCreateFolderRequest,
): Promise<DiaryFolderResponse | null> {
  return safeInvoke<DiaryFolderResponse>('diary_create_folder', request);
}

export function deleteDiaryFolder(id: string): Promise<DiaryMutationResult | null> {
  return safeInvoke<DiaryMutationResult>('diary_delete_folder', { id });
}

export function listDiaryEntries(folderId?: string): Promise<DiaryEntryResponse[] | null> {
  return folderId === undefined
    ? safeInvoke<DiaryEntryResponse[]>('diary_list_entries')
    : safeInvoke<DiaryEntryResponse[]>('diary_list_entries', { folder_id: folderId });
}

export function getDiaryEntry(id: string): Promise<DiaryEntryResponse | null> {
  return safeInvoke<DiaryEntryResponse>('diary_get_entry', { id });
}

export function createDiaryEntry(
  request: DiaryCreateEntryRequest,
): Promise<DiaryEntryResponse | null> {
  return safeInvoke<DiaryEntryResponse>('diary_create_entry', request);
}

export function updateDiaryEntry(
  request: DiaryUpdateEntryRequest,
): Promise<DiaryEntryResponse | null> {
  return safeInvoke<DiaryEntryResponse>('diary_update_entry', request);
}

export function deleteDiaryEntry(id: string): Promise<DiaryMutationResult | null> {
  return safeInvoke<DiaryMutationResult>('diary_delete_entry', { id });
}
