export type CadernoNodeType = 'sticky' | 'text' | 'checklist' | 'image' | 'shape';

export interface CadernoNode {
  id: number;
  type: CadernoNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  url?: string;
  items?: { text: string; done: boolean }[];
  studyContent?: string;
  studyCreatedAt?: number;
  studyUpdatedAt?: number;
}

export interface CadernoEdge {
  id: number;
  from: number;
  to: number;
}

export interface CadernoBoard {
  id: string;
  name: string;
  updatedAt: number;
  nodes: CadernoNode[];
  edges: CadernoEdge[];
}

export interface CadernoBoardMeta {
  id: string;
  name: string;
  updated_at?: number;
  updatedAt?: number;
  owner_id?: string;
  nodes?: CadernoNode[];
}

export interface CadernoBoardData {
  nodes: CadernoNode[];
  edges: CadernoEdge[];
  name?: string;
  updated_at?: number;
  owner_id?: string;
}

export interface CadernoBoardIdRequest {
  boardId: string;
}

export interface CadernoBoardSaveRequest extends CadernoBoardIdRequest {
  name: string;
  nodes: CadernoNode[];
  edges: CadernoEdge[];
}

export type CadernoBoardSaveResponse = number;
export type CadernoBoardDeleteResponse = boolean | void;
