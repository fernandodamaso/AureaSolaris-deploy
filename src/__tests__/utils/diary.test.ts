import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeInvoke } from '../../utils/tauri';
import {
  createDiaryEntry,
  createDiaryFolder,
  deleteDiaryEntry,
  deleteDiaryFolder,
  getDiaryEntry,
  listDiaryEntries,
  listDiaryFolders,
  updateDiaryEntry,
} from '../../utils/diary';
import type { DiaryEntryResponse, DiaryFolderResponse } from '../../types/diario';

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(),
}));

const mockedSafeInvoke = vi.mocked(safeInvoke);

const folder: DiaryFolderResponse = {
  id: 'folder-1',
  name: 'Estudos',
  icon: '📁',
  order: 1,
  created_at: '2026-08-12T10:00:00Z',
};

const entry: DiaryEntryResponse = {
  id: 'entry-1',
  title: 'Nota',
  content: 'Conteúdo',
  folder_id: 'folder-1',
  created_at: '2026-08-12T10:00:00Z',
  updated_at: '2026-08-12T10:00:00Z',
  word_count: 1,
  status: 'draft',
};

describe('diary operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists folders with the typed response', async () => {
    mockedSafeInvoke.mockResolvedValue([folder]);

    await expect(listDiaryFolders()).resolves.toEqual([folder]);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_list_folders');
  });

  it('creates a folder with the IPC payload', async () => {
    mockedSafeInvoke.mockResolvedValue(folder);

    await expect(createDiaryFolder({ name: 'Estudos', icon: '📁' })).resolves.toEqual(folder);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_create_folder', { name: 'Estudos', icon: '📁' });
  });

  it('deletes a folder with its id', async () => {
    mockedSafeInvoke.mockResolvedValue(true);

    await expect(deleteDiaryFolder('folder-1')).resolves.toBe(true);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_delete_folder', { id: 'folder-1' });
  });

  it('lists all entries without adding a filter payload', async () => {
    mockedSafeInvoke.mockResolvedValue([entry]);

    await expect(listDiaryEntries()).resolves.toEqual([entry]);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_list_entries');
  });

  it('lists entries with the folder_id payload', async () => {
    mockedSafeInvoke.mockResolvedValue([entry]);

    await expect(listDiaryEntries('folder-1')).resolves.toEqual([entry]);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_list_entries', { folder_id: 'folder-1' });
  });

  it('gets an entry by id', async () => {
    mockedSafeInvoke.mockResolvedValue(entry);

    await expect(getDiaryEntry('entry-1')).resolves.toEqual(entry);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_get_entry', { id: 'entry-1' });
  });

  it('creates an entry with the IPC payload', async () => {
    mockedSafeInvoke.mockResolvedValue(entry);

    await expect(
      createDiaryEntry({ title: 'Nota', folder_id: 'folder-1', status: 'draft' }),
    ).resolves.toEqual(entry);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_create_entry', {
      title: 'Nota',
      folder_id: 'folder-1',
      status: 'draft',
    });
  });

  it('updates only the supplied entry fields', async () => {
    mockedSafeInvoke.mockResolvedValue(entry);

    await expect(
      updateDiaryEntry({
        id: 'entry-1',
        title: 'Título novo',
        content: 'Texto novo',
        folder_id: 'folder-2',
        status: 'done',
      }),
    ).resolves.toEqual(entry);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_update_entry', {
      id: 'entry-1',
      title: 'Título novo',
      content: 'Texto novo',
      folder_id: 'folder-2',
      status: 'done',
    });
  });

  it('does not add omitted fields to a partial update payload', async () => {
    mockedSafeInvoke.mockResolvedValue(entry);

    await expect(updateDiaryEntry({ id: 'entry-1', title: 'Título parcial' })).resolves.toEqual(entry);
    expect(mockedSafeInvoke).toHaveBeenCalledTimes(1);
    const [command, payload] = mockedSafeInvoke.mock.calls[0];
    expect(command).toBe('diary_update_entry');
    expect(payload).toStrictEqual({
      id: 'entry-1',
      title: 'Título parcial',
    });
    expect(payload).not.toHaveProperty('content');
    expect(payload).not.toHaveProperty('folder_id');
    expect(payload).not.toHaveProperty('status');
  });

  it('deletes an entry with its id', async () => {
    mockedSafeInvoke.mockResolvedValue(true);

    await expect(deleteDiaryEntry('entry-1')).resolves.toBe(true);
    expect(mockedSafeInvoke).toHaveBeenCalledWith('diary_delete_entry', { id: 'entry-1' });
  });

  it('preserves safeInvoke null results and rejected errors', async () => {
    const error = new Error('diary unavailable');
    mockedSafeInvoke.mockResolvedValue(null);
    await expect(listDiaryFolders()).resolves.toBeNull();

    mockedSafeInvoke.mockRejectedValue(error);
    await expect(listDiaryFolders()).rejects.toBe(error);
  });
});
