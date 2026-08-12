import { safeInvoke } from './tauri';
import type {
  CadernoBoardData,
  CadernoBoardDeleteResponse,
  CadernoBoardIdRequest,
  CadernoBoardMeta,
  CadernoBoardSaveRequest,
  CadernoBoardSaveResponse,
} from '../types/caderno';

export function listBoards(): Promise<CadernoBoardMeta[] | null> {
  return safeInvoke<CadernoBoardMeta[]>('list_boards');
}

export function loadBoard(request: CadernoBoardIdRequest): Promise<CadernoBoardData | null> {
  return safeInvoke<CadernoBoardData>('load_board', request);
}

export function saveBoard(request: CadernoBoardSaveRequest): Promise<CadernoBoardSaveResponse | null> {
  return safeInvoke<CadernoBoardSaveResponse>('save_board', request);
}

export function deleteBoard(request: CadernoBoardIdRequest): Promise<CadernoBoardDeleteResponse | null> {
  return safeInvoke<CadernoBoardDeleteResponse>('delete_board', request);
}
