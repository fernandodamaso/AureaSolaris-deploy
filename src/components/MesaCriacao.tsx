import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MousePointer2, Square, StickyNote, Type, CheckSquare, Image as ImageIcon,
  ZoomIn, ZoomOut, Undo2, Redo2, Download, FolderOpen,
  Plus, Check, AlertCircle, Sparkles, Move, Link2,
  ChevronLeft, Pencil, X, MoreHorizontal, BookOpen
} from 'lucide-react';
import { listBoards, loadBoard, saveBoard } from '../utils/board';
import type { CadernoBoard, CadernoBoardMeta, CadernoEdge, CadernoNode } from '../types/caderno';
import { AssetPicker } from './mesa/AssetPicker';
import { StudyPanel } from './mesa/StudyPanel';
import { BoardManager } from './BoardManager';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Tool = 'select' | 'sticky' | 'text' | 'checklist' | 'image' | 'connect' | 'shape';

export type CadernoIntent =
  | { type: 'browse' }
  | { type: 'create-study'; topic: string; seedNote?: string }
  | { type: 'open-study'; boardId: string; nodeId: number };

type MesaCriacaoProps = {
  intent?: CadernoIntent | null;
  onIntentHandled?: () => void;
};

type HistoryAction = {
  type: 'addNode' | 'deleteNode' | 'moveNode' | 'resizeNode' | 'updateNode' | 'addEdge' | 'deleteEdge';
  payload: any;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const STICKY_COLORS = ['#FFFDE7', '#E3F2FD', '#F3E5F5', '#E8F5E9', '#FCE4EC', '#FFF3E0', '#E0F7FA', '#EDE9FE'];
const MAX_HISTORY = 50;
const GRID_SIZE = 20;
const LS_ACTIVE = 'aurea_active_board';
const activeBoardKey = () => `${LS_ACTIVE}:${localStorage.getItem('aurea_active_id') || 'anonymous'}`;

const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
const uid = () => `board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const timestampId = () => Date.now();

// ─────────────────────────────────────────────────────────────
// Toast hook
// ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, ok = true) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, ok });
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  return { toast, show };
}

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT — Board Manager or Canvas
// ─────────────────────────────────────────────────────────────
export const MesaCriacao = ({ intent = null, onIntentHandled }: MesaCriacaoProps) => {
  const [activeBoard, setActiveBoard] = useState<CadernoBoard | null>(null);
  const [requestedStudyNodeId, setRequestedStudyNodeId] = useState<number | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  // Uma entrada contextual deve abrir a lista ou o novo caderno pedido, nunca
  // redirecionar silenciosamente para outro caderno que estava aberto antes.
  const shouldRestoreLastBoard = useRef(intent === null);
  const hasHandledIntent = useRef(false);

  const openBoard = useCallback(async (meta: CadernoBoardMeta, studyNodeId: number | null = null) => {
    try {
      const data = await loadBoard({ boardId: meta.id });
      const board: CadernoBoard = {
        id: meta.id,
        name: meta.name,
        updatedAt: meta.updated_at || meta.updatedAt || Date.now(),
        nodes: data?.nodes || [],
        edges: data?.edges || []
      };
      localStorage.setItem(activeBoardKey(), board.id);
      setRequestedStudyNodeId(studyNodeId);
      setActiveBoard(board);
    } catch (error) {
      console.error('Failed to load board', error);
      setIntentError('Não foi possível abrir este caderno. Seus outros cadernos permanecem preservados.');
    }
  }, []);

  const createContextualStudy = useCallback(async (topic: string, seedNote?: string) => {
    const name = `Estudo — ${topic}`;
    const newId = uid();
    const starterNote: CadernoNode = {
      id: Date.now(),
      type: 'sticky',
      x: 120,
      y: 120,
      w: 320,
      h: 180,
      color: STICKY_COLORS[0],
      text: seedNote || `Tema do estudo\n${topic}\n\nRegistre aqui sua pergunta, observação ou a próxima conexão.`,
    };

    try {
      await saveBoard({ boardId: newId, name, nodes: [starterNote], edges: [] });
      await openBoard({ id: newId, name, updated_at: Date.now() });
    } catch (error) {
      console.error('Failed to create contextual study', error);
      setIntentError('Não foi possível criar o estudo agora. Nenhum caderno existente foi alterado.');
    }
  }, [openBoard]);

  // Restore last active board from Tauri
  useEffect(() => {
    if (!shouldRestoreLastBoard.current) return;
    const lastId = localStorage.getItem(activeBoardKey());
    if (lastId) {
      loadBoard({ boardId: lastId }).then(data => {
        if (data && data.nodes) {
          // Find the name from the list
          listBoards().then(list => {
             const meta = list?.find(b => b.id === lastId);
             if (meta) {
               setActiveBoard({ id: lastId, name: meta.name, updatedAt: meta.updated_at || meta.updatedAt || Date.now(), nodes: data.nodes, edges: data.edges });
             } else {
               localStorage.removeItem(activeBoardKey());
             }
          });
        } else {
          localStorage.removeItem(activeBoardKey());
        }
      }).catch(() => localStorage.removeItem(activeBoardKey()));
    }
  }, []);

  useEffect(() => {
    if (!intent || hasHandledIntent.current) return;
    hasHandledIntent.current = true;

    const handleIntent = async () => {
      if (intent.type === 'create-study') {
        await createContextualStudy(intent.topic, intent.seedNote);
      } else if (intent.type === 'open-study') {
        const list = await listBoards();
        const meta = list?.find(item => item.id === intent.boardId);
        if (meta) {
          await openBoard(meta, intent.nodeId);
        } else {
          setIntentError('O caderno deste estudo não foi encontrado. Nenhum dado foi alterado.');
        }
      }
      onIntentHandled?.();
    };

    void handleIntent();
  }, [createContextualStudy, intent, onIntentHandled]);

  const closeBoard = async (updatedBoard: CadernoBoard) => {
    await saveBoard({
      boardId: updatedBoard.id,
      name: updatedBoard.name,
      nodes: updatedBoard.nodes,
      edges: updatedBoard.edges
    });
    setRequestedStudyNodeId(null);
    setActiveBoard(null);
    localStorage.removeItem(activeBoardKey());
  };

  if (activeBoard) {
    return (
      <MesaCanvas
        board={activeBoard}
        initialStudyNodeId={requestedStudyNodeId}
        onBack={closeBoard}
      />
    );
  }

  return <BoardManager onOpen={openBoard} intentError={intentError} />;
};

// ─────────────────────────────────────────────────────────────
// MESA CANVAS — the actual board editor
// ─────────────────────────────────────────────────────────────
const MesaCanvas = ({
  board,
  initialStudyNodeId,
  onBack,
}: {
  board: CadernoBoard;
  initialStudyNodeId: number | null;
  onBack: (b: CadernoBoard) => void;
}) => {
  const [nodes, setNodes] = useState<CadernoNode[]>(board.nodes);
  const [edges, setEdges] = useState<CadernoEdge[]>(board.edges);
  const [boardName, setBoardName] = useState(board.name);
  const [editingName, setEditingName] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>('select');
  const [selected, setSelected] = useState<number | null>(initialStudyNodeId);
  const [studyPanelOpen, setStudyPanelOpen] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0]);

  const [dragNode, setDragNode] = useState<{ id: number; prev: { x: number; y: number } } | null>(null);
  const [resizeNode, setResizeNode] = useState<{ id: number; prev: { w: number; h: number } } | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<number | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);
  const { toast, show: showToast } = useToast();

  const nodesRef = useRef<CadernoNode[]>([]);
  const edgesRef = useRef<CadernoEdge[]>([]);
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const edgeRefs = useRef<Map<number, SVGLineElement>>(new Map());
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersion = useRef(0);
  const isPanning = useRef(false);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { if (editingName) setTimeout(() => nameInputRef.current?.focus(), 30); }, [editingName]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialStudyNodeId !== null && nodes.some(node => node.id === initialStudyNodeId)) {
        setSelected(initialStudyNodeId);
        setStudyPanelOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialStudyNodeId, nodes]);

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const version = ++saveVersion.current;
    const stateTimer = setTimeout(() => setSaveState('saving'), 0);
    saveTimer.current = setTimeout(() => {
      void saveBoard({ boardId: board.id, name: boardName, nodes, edges }).then(savedAt => {
        if (version !== saveVersion.current) return;
        setSaveState(typeof savedAt === 'number' ? 'saved' : 'error');
      });
      }, 800);
    return () => {
      clearTimeout(stateTimer);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges, boardName, board.id]);

  // ── History ────────────────────────────────────────────────
  const pushHistory = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const s = [...prev, action];
      return s.length > MAX_HISTORY ? s.slice(-MAX_HISTORY) : s;
    });
    setRedoStack([]);
  }, []);

  const deleteNode = useCallback((id: number) => {
    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    const affectedEdges = edgesRef.current.filter(e => e.from === id || e.to === id);
    pushHistory({ type: 'deleteNode', payload: { node, edges: affectedEdges } });
    setNodes(p => p.filter(n => n.id !== id));
    setEdges(p => p.filter(e => e.from !== id && e.to !== id));
  }, [pushHistory]);

  const applyAction = useCallback((action: HistoryAction, direction: 'undo' | 'redo') => {
    const isUndo = direction === 'undo';
    switch (action.type) {
      case 'addNode':
        if (isUndo) {
          setNodes(n => n.filter(x => x.id !== action.payload.node.id));
        } else {
          setNodes(n => [...n, action.payload.node]);
        }
        break;
      case 'deleteNode':
        if (isUndo) {
          setNodes(n => [...n, action.payload.node]);
          setEdges(e => [...e, ...(action.payload.edges || [])]);
        } else {
          setNodes(n => n.filter(x => x.id !== action.payload.node.id));
          setEdges(e => e.filter(x => x.from !== action.payload.node.id && x.to !== action.payload.node.id));
        }
        break;
      case 'addEdge':
        if (isUndo) {
          setEdges(e => e.filter(x => x.id !== action.payload.edge.id));
        } else {
          setEdges(e => [...e, action.payload.edge]);
        }
        break;
      case 'deleteEdge':
        if (isUndo) {
          setEdges(e => [...e, action.payload.edge]);
        } else {
          setEdges(e => e.filter(x => x.id !== action.payload.edge.id));
        }
        break;
      case 'moveNode':
      case 'resizeNode':
      case 'updateNode': {
        const state = isUndo ? action.payload.prev : action.payload.next;
        setNodes(n => n.map(x => x.id === action.payload.id ? { ...x, ...state } : x));
        break;
      }
    }
  }, []);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (!prev.length) return prev;
      const action = prev[prev.length - 1];
      applyAction(action, 'undo');
      setRedoStack(r => [...r, action]);
      return prev.slice(0, -1);
    });
  }, [applyAction]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const action = prev[prev.length - 1];
      applyAction(action, 'redo');
      setUndoStack(u => [...u, action]);
      return prev.slice(0, -1);
    });
  }, [applyAction]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  const [spaceHeld, setSpaceHeld] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (!typing && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (!typing && (e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) { e.preventDefault(); redo(); }
      if (!typing) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedEdgeId !== null) {
            const edge = edgesRef.current.find(item => item.id === selectedEdgeId);
            if (edge) {
              pushHistory({ type: 'deleteEdge', payload: { edge } });
              setEdges(items => items.filter(item => item.id !== edge.id));
            }
            setSelectedEdgeId(null);
          } else if (selected !== null) {
            deleteNode(selected);
            setSelected(null);
          }
        }
        if (e.key === 'v') setTool('select');
        if (e.key === 'n') { setTool('sticky'); }
        if (e.key === 't') setTool('text');
        if (e.key === 'c') setTool('checklist');
        if (e.key === ' ') {
          e.preventDefault();
          setSpaceHeld(true);
        }
        if (e.key === 'Escape') {
          setSelected(null);
          setSelectedEdgeId(null);
          setConnectSourceId(null);
          setTool('select');
          setFocusNodeId(null);
          setSpaceHeld(false);
        }
      }
    };
    const up = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceHeld(false); };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', up);
    };
  }, [undo, redo, selected, selectedEdgeId, pushHistory]);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // ── Node helpers ───────────────────────────────────────────
  const centerPos = () => {
    const canvas = canvasRef.current;
    const rect = canvas
      ? canvas.getBoundingClientRect()
      : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    return {
      x: snap((cx - pan.x) / zoom - 100),
      y: snap((cy - pan.y) / zoom - 60),
    };
  };

  const addNode = (partial: Partial<CadernoNode>) => {
    const { x, y } = centerPos();
    const node: CadernoNode = { id: Date.now(), type: 'sticky', x, y, w: 200, h: 160, text: '', color: stickyColor, ...partial };
    setNodes(p => [...p, node]);
    pushHistory({ type: 'addNode', payload: { node } });
    setSelected(node.id);
    setFocusNodeId(node.id);
    setTool('select');
  };

  const updateNode = (id: number, patch: Partial<CadernoNode>) => {
    const prev = nodesRef.current.find(n => n.id === id);
    if (!prev) return;
    setNodes(p => p.map(n => n.id === id ? { ...n, ...patch } : n));
  };

  // Wheel: must be non-passive so we can preventDefault on touchpad gestures.
  useEffect(() => {
    const canvas = document.getElementById('aurea-board-canvas');
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const inInput = !!target.closest('input, textarea, select');
      if (inInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Normalize delta for touchpads: some browsers report line/page units.
      const modeFactor = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerWidth / 0.75 : 1;
      const dx = e.deltaX * modeFactor;
      const dy = e.deltaY * modeFactor;

      if (ctrl) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.93;
        setZoom(z => Math.min(3, Math.max(0.15, z * zoomFactor)));
        return;
      }

      e.preventDefault();
      setPan(p => ({ x: p.x - dx, y: p.y - dy }));
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragNode !== null) {
      const node = nodesRef.current.find(n => n.id === dragNode.id);
      if (node) {
        node.x += e.movementX / zoom;
        node.y += e.movementY / zoom;
        const el = nodeRefs.current.get(dragNode.id);
        if (el) el.style.transform = `translate(${snap(node.x)}px, ${snap(node.y)}px)`;
        edgesRef.current.forEach(edge => {
          if (edge.from === dragNode.id || edge.to === dragNode.id) {
            const n1 = nodesRef.current.find(n => n.id === edge.from);
            const n2 = nodesRef.current.find(n => n.id === edge.to);
            const line = edgeRefs.current.get(edge.id);
            if (n1 && n2 && line) {
              line.setAttribute('x1', String(n1.x + n1.w / 2));
              line.setAttribute('y1', String(n1.y + n1.h / 2));
              line.setAttribute('x2', String(n2.x + n2.w / 2));
              line.setAttribute('y2', String(n2.y + n2.h / 2));
            }
          }
        });
      }
    }
    if (resizeNode !== null) {
      const node = nodesRef.current.find(n => n.id === resizeNode.id);
      if (node) {
        node.w = Math.max(120, node.w + e.movementX / zoom);
        node.h = Math.max(80, node.h + e.movementY / zoom);
        const el = nodeRefs.current.get(resizeNode.id);
        if (el) { el.style.width = `${node.w}px`; el.style.height = `${node.h}px`; }
      }
    }
    if (isPanning.current && e.buttons === 1 && dragNode === null && resizeNode === null) {
      setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    }
  };

  const onPointerUp = () => {
    if (dragNode !== null) {
      const node = nodesRef.current.find(n => n.id === dragNode.id);
      if (node) {
        node.x = snap(node.x); node.y = snap(node.y);
        if (node.x !== dragNode.prev.x || node.y !== dragNode.prev.y) {
          pushHistory({ type: 'moveNode', payload: { id: node.id, prev: dragNode.prev, next: { x: node.x, y: node.y } } });
        }
        setNodes([...nodesRef.current]);
      }
    }
    if (resizeNode !== null) {
      const node = nodesRef.current.find(n => n.id === resizeNode.id);
      if (node) {
        if (node.w !== resizeNode.prev.w || node.h !== resizeNode.prev.h) {
          pushHistory({ type: 'resizeNode', payload: { id: node.id, prev: resizeNode.prev, next: { w: node.w, h: node.h } } });
        }
        setNodes([...nodesRef.current]);
      }
    }
    setDragNode(null);
    setResizeNode(null);
    isPanning.current = false;
  };

  const onCanvasPointerDown = (_e: React.PointerEvent) => {
    if (tool === 'select' || spaceHeld) {
      isPanning.current = true;
      setSelected(null);
      setFocusNodeId(null);
    }
  };

  const onCanvasClick = (_e: React.MouseEvent) => {
    if (tool === 'sticky')    { addNode({ type: 'sticky', color: stickyColor }); return; }
    if (tool === 'text')      { addNode({ type: 'text', w: 200, h: 50, color: 'transparent', text: '' }); return; }
    if (tool === 'checklist') { addNode({ type: 'checklist', w: 240, h: 180, items: [{ text: '', done: false }], color: '#ffffff' }); return; }
    if (tool === 'shape')     { addNode({ type: 'shape', w: 180, h: 100, color: '#EDE9FE', text: '' }); return; }
    if (tool === 'image')     { setShowImageModal(true); return; }
  };

  const connectNode = (id: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (connectSourceId === null) {
      setConnectSourceId(id);
      setSelected(id);
      setSelectedEdgeId(null);
      showToast('Agora clique no cartão que deseja conectar.');
      return;
    }

    if (connectSourceId === id) {
      setConnectSourceId(null);
      showToast('Conexão cancelada.');
      return;
    }

    const alreadyConnected = edgesRef.current.some(edge =>
      (edge.from === connectSourceId && edge.to === id) || (edge.from === id && edge.to === connectSourceId),
    );
    if (alreadyConnected) {
      setConnectSourceId(null);
      showToast('Esses cartões já estão conectados.', false);
      return;
    }

    const edge: CadernoEdge = { id: timestampId(), from: connectSourceId, to: id };
    setEdges(items => [...items, edge]);
    pushHistory({ type: 'addEdge', payload: { edge } });
    setConnectSourceId(null);
    setSelectedEdgeId(edge.id);
    showToast('Conexão criada. Use Delete para removê-la.');
  };

  const deleteEdge = (id: number) => {
    const edge = edgesRef.current.find(item => item.id === id);
    if (!edge) return;
    pushHistory({ type: 'deleteEdge', payload: { edge } });
    setEdges(items => items.filter(item => item.id !== id));
    setSelectedEdgeId(null);
    showToast('Conexão removida.');
  };

  // ── Export ─────────────────────────────────────────────────
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ boardName, nodes, edges }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${boardName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    showToast('Board exportado como JSON');
  };

  // ── Tool palette ───────────────────────────────────────────
  const tools: { id: Tool; icon: React.ReactNode; label: string; key?: string }[] = [
    { id: 'select',    icon: <MousePointer2 size={16} />, label: 'Cursor',    key: 'V' },
    { id: 'sticky',    icon: <StickyNote    size={16} />, label: 'Post-it',   key: 'N' },
    { id: 'text',      icon: <Type          size={16} />, label: 'Texto',     key: 'T' },
    { id: 'checklist', icon: <CheckSquare   size={16} />, label: 'Lista',     key: 'C' },
    { id: 'shape',     icon: <Square        size={16} />, label: 'Forma',     key: '' },
    { id: 'connect',   icon: <Link2         size={16} />, label: 'Conectar',  key: '' },
    { id: 'image',     icon: <ImageIcon     size={16} />, label: 'Imagem',    key: '' },
  ];

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  const canvasCursor =
    spaceHeld ? 'grab' : tool === 'select' ? (dragNode ? 'grabbing' : 'default') : 'crosshair';

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#F8F8F7', fontFamily: 'Inter, system-ui, sans-serif', userSelect: 'none' }}>

      {/* ── Top toolbar ── */}
      <div className="relative z-50 shrink-0 flex min-w-max items-center gap-3 overflow-x-auto px-3 py-2 no-scrollbar"
        style={{ background: '#ffffff', borderBottom: '1px solid #EBEBEB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

        {/* Back button */}
        <button
          onClick={() => onBack({ ...board, name: boardName, nodes, edges, updatedAt: Date.now() })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold color: var(--aurea-text-muted) hover:color: var(--aurea-text) hover:bg-gray-100 transition-all"
        >
          <ChevronLeft size={14} /> Boards
        </button>

        <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

        {/* Board name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            value={boardName}
            onChange={e => setBoardName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false); }}
            className="text-sm font-semibold text-gray-800 outline-none border-b-2 bg-transparent px-1"
            style={{ borderColor: '#1A1A1A', minWidth: 120 }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-gray-600 transition-all group"
          >
            {boardName}
            <Pencil size={11} className="text-gray-300 group-hover:color: var(--aurea-text-muted) transition-all" />
          </button>
        )}

        <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

        <button
          type="button"
          onClick={() => setStudyPanelOpen(open => !open)}
          aria-pressed={studyPanelOpen}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:color: var(--aurea-text)"
          title={studyPanelOpen ? 'Ocultar a área de escrita' : 'Mostrar Board e estudo lado a lado'}
        >
          <BookOpen size={14} aria-hidden="true" />
          {studyPanelOpen ? 'Board + estudo' : 'Abrir estudo'}
        </button>

        <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={undoStack.length === 0} title="Desfazer (Ctrl+Z)"
          className="p-1.5 rounded-lg transition-all hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed">
          <Undo2 size={14} className="text-gray-600" />
        </button>
        <button onClick={redo} disabled={redoStack.length === 0} title="Refazer (Ctrl+Y)"
          className="p-1.5 rounded-lg transition-all hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed">
          <Redo2 size={14} className="text-gray-600" />
        </button>

        <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

        {/* Tool palette */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl" style={{ background: '#F4F4F2', border: '1px solid #E8E8E8' }}>
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setConnectSourceId(null);
                setSelectedEdgeId(null);
              }}
              title={t.label + (t.key ? ` (${t.key})` : '')}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: tool === t.id ? '#ffffff' : 'transparent',
                color: tool === t.id ? '#111' : '#888',
                boxShadow: tool === t.id ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {t.icon}
              <span className="text-[8px] font-medium leading-none tracking-tight">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Color palette — shown when sticky/shape is active */}
        {(tool === 'sticky' || tool === 'shape') && (
          <>
            <div className="w-px h-5" style={{ background: '#EBEBEB' }} />
            <div className="flex items-center gap-1">
              {STICKY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setStickyColor(c)}
                  aria-label={`Selecionar cor ${c}`}
                  aria-pressed={stickyColor === c}
                  className="w-5 h-5 rounded-full transition-all hover:scale-110"
                  style={{ background: c, border: stickyColor === c ? '2px solid #333' : '1.5px solid #D8D8D8' }}
                />
              ))}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        <button onClick={() => setShowAssetPicker(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium color: var(--aurea-text-muted) hover:bg-gray-100 transition-all">
          <FolderOpen size={13} /> Importar
        </button>
        <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium color: var(--aurea-text-muted) hover:bg-gray-100 transition-all">
          <Download size={13} /> Exportar
        </button>

        <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

        {/* Zoom */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg" style={{ background: '#F4F4F2', border: '1px solid #E8E8E8' }}>
          <button onClick={() => setZoom(z => Math.max(0.15, z - 0.1))} className="p-1 rounded hover:background: var(--aurea-surface) transition-all" title="Diminuir (-)">
            <ZoomOut size={13} className="color: var(--aurea-text-muted)" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="text-[11px] font-bold text-gray-600 hover:color: var(--aurea-text) transition-all w-10 text-center"
            title="Resetar zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1 rounded hover:background: var(--aurea-surface) transition-all" title="Aumentar (+)">
            <ZoomIn size={13} className="color: var(--aurea-text-muted)" />
          </button>
          <div className="w-px h-3 mx-1" style={{ background: '#E8E8E8' }} />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="px-1.5 py-0.5 rounded text-[10px] font-bold color: var(--aurea-text-muted) hover:background: var(--aurea-surface) transition-all" title="Aumentar zoom">
            +
          </button>
          <button onClick={() => setZoom(z => Math.max(0.15, z - 0.1))} className="px-1.5 py-0.5 rounded text-[10px] font-bold color: var(--aurea-text-muted) hover:background: var(--aurea-surface) transition-all" title="Diminuir zoom">
            -
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="relative flex min-h-0 flex-1">
      <div
        id="aurea-board-canvas"
        ref={canvasRef}
        className="relative min-w-0 flex-1 overflow-hidden"
        style={{ cursor: canvasCursor }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onCanvasPointerDown}
        onClick={onCanvasClick}
      >
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #C8C8C8 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          opacity: 0.5,
        }} />

        {/* SVG edges */}
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {edges.map(edge => {
              const n1 = nodes.find(n => n.id === edge.from);
              const n2 = nodes.find(n => n.id === edge.to);
              if (!n1 || !n2) return null;
              return (
                <g key={edge.id} className="pointer-events-auto">
                  <line
                    ref={el => { if (el) edgeRefs.current.set(edge.id, el); }}
                    x1={n1.x + n1.w / 2} y1={n1.y + n1.h / 2}
                    x2={n2.x + n2.w / 2} y2={n2.y + n2.h / 2}
                    stroke={selectedEdgeId === edge.id ? '#4A9EFF' : '#9CA3AF'}
                    strokeWidth={selectedEdgeId === edge.id ? 2.5 : 1.5}
                    strokeDasharray={selectedEdgeId === edge.id ? 'none' : '5 4'}
                  />
                  {/* Clickable delete area */}
                  <line
                    x1={n1.x + n1.w / 2} y1={n1.y + n1.h / 2}
                    x2={n2.x + n2.w / 2} y2={n2.y + n2.h / 2}
                    stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }}
                    onClick={event => {
                      event.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelected(null);
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Nodes */}
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
          {nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selected === node.id}
              tool={tool}
              autoFocus={focusNodeId === node.id}
              onFocused={() => setFocusNodeId(null)}
              onSelect={() => { setSelected(node.id); setFocusNodeId(null); }}
              onOpenStudy={() => { setSelected(node.id); setStudyPanelOpen(true); }}
              onDragStart={e => {
                if (tool !== 'select') return;
                e.stopPropagation();
                isPanning.current = false;
                setDragNode({ id: node.id, prev: { x: node.x, y: node.y } });
                setSelected(node.id);
                setSelectedEdgeId(null);
              }}
              onResizeStart={e => {
                e.stopPropagation();
                isPanning.current = false;
                setResizeNode({ id: node.id, prev: { w: node.w, h: node.h } });
              }}
              onDelete={() => { deleteNode(node.id); setSelected(null); }}
              onUpdate={patch => updateNode(node.id, patch)}
              onConnect={e => connectNode(node.id, e)}
              nodeRef={el => { if (el) nodeRefs.current.set(node.id, el); }}
            />
          ))}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Sparkles size={24} style={{ color: '#D0D0D0' }} className="mb-3" />
            <p className="text-sm font-medium" style={{ color: '#C0C0C0' }}>Board vazio</p>
            <p className="text-xs mt-1" style={{ color: '#D0D0D0' }}>Escolha uma ferramenta ou pressione N</p>
          </div>
        )}

        {/* Connection guidance */}
        {tool === 'connect' && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-blue-200 background: var(--aurea-surface)/95 px-4 py-2 text-[11px] font-semibold text-blue-700 box-shadow: 0 1px 2px rgba(0,0,0,0.25)" aria-live="polite">
            {connectSourceId === null ? 'Conectar: clique no primeiro cartão.' : 'Agora clique no cartão de destino — Esc cancela.'}
          </div>
        )}

        {selectedEdgeId !== null && (
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-xl border border-blue-200 background: var(--aurea-surface) px-3 py-2 text-[11px] font-semibold color: var(--aurea-text) box-shadow: 0 1px 2px rgba(0,0,0,0.25)">
            Conexão selecionada
            <button
              type="button"
              onClick={() => deleteEdge(selectedEdgeId)}
              className="rounded-md px-2 py-1 text-red-600 transition hover:background: rgba(239,68,68,0.08)"
            >
              Remover
            </button>
          </div>
        )}

        {/* Status bar */}
        {nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #EBEBEB', color: '#AAAAAA', backdropFilter: 'blur(4px)' }}>
            <Move size={10} />
            {nodes.length} card{nodes.length !== 1 ? 's' : ''} · Scroll para navegar · Ctrl+Scroll para zoom
          </div>
        )}
      </div>

      {studyPanelOpen && (
        <StudyPanel
          node={nodes.find(node => node.id === selected) || null}
          boardName={boardName}
          saveState={saveState}
          onUpdate={patch => {
            if (selected !== null) updateNode(selected, patch);
          }}
          onExpandBoard={() => setStudyPanelOpen(false)}
        />
      )}
      </div>

      {/* ── Image modal ── */}
      {showImageModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowImageModal(false)}>
          <div className="background: var(--aurea-surface) rounded-2xl p-6 w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold color: var(--aurea-text)">Inserir imagem</h3>
                <p className="text-xs color: var(--aurea-text-muted) mt-0.5">Cole a URL de uma imagem (PNG, JPG, WebP, GIF)</p>
              </div>
              <button onClick={() => setShowImageModal(false)} className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg transition-all"><X size={16} /></button>
            </div>
            <input
              autoFocus type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={imageUrlInput}
              onChange={e => setImageUrlInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && imageUrlInput.trim()) {
                  addNode({ type: 'image', url: imageUrlInput.trim(), w: 260, h: 180, color: '#fff', text: imageUrlInput.trim() });
                  setShowImageModal(false); setImageUrlInput('');
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all mb-4"
              style={{ border: '1px solid #E0E0E0', background: '#FAFAFA' }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowImageModal(false); setImageUrlInput(''); }} className="px-4 py-2 text-sm color: var(--aurea-text-muted) hover:color: var(--aurea-text) transition-all rounded-lg hover:bg-gray-100">Cancelar</button>
              <button
                onClick={() => {
                  if (imageUrlInput.trim()) {
                    addNode({ type: 'image', url: imageUrlInput.trim(), w: 260, h: 180, color: '#fff', text: imageUrlInput.trim() });
                    setShowImageModal(false); setImageUrlInput('');
                  }
                }}
                disabled={!imageUrlInput.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-30 transition-all"
                style={{ background: '#1A1A1A' }}
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssetPicker && (
        <AssetPicker
          onClose={() => setShowAssetPicker(false)}
          onImport={item => {
            addNode({
              type: item.type === 'task' ? 'checklist' : 'sticky',
              w: 240, h: 160,
              text: item.type !== 'task' ? `${item.title}\n\n${item.preview}` : undefined,
              items: item.type === 'task' ? [{ text: item.title, done: !!item.data?.completed }] : undefined,
              color: item.type === 'astro' ? '#FFFDE7' : item.type === 'calendar' ? '#E3F2FD' : STICKY_COLORS[0],
            });
            setShowAssetPicker(false);
            showToast(`Importado: ${item.title}`);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-xl box-shadow: 0 10px 30px rgba(0,0,0,0.4) text-xs font-semibold animate-in slide-in-from-bottom-3 fade-in"
          style={{ background: toast.ok ? '#1A1A1A' : '#EF4444', color: '#fff' }}>
          {toast.ok ? <Check size={12} /> : <AlertCircle size={12} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// NODE CARD — clean, Figma/Miro-inspired
// ─────────────────────────────────────────────────────────────
interface NodeCardProps {
  node: CadernoNode;
  selected: boolean;
  tool: Tool;
  autoFocus: boolean;
  onFocused: () => void;
  onSelect: () => void;
  onOpenStudy: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent) => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<CadernoNode>) => void;
  onConnect: (e: React.PointerEvent) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node, selected, tool, autoFocus, onFocused, onSelect,
  onDragStart, onResizeStart, onDelete, onUpdate, onOpenStudy,
  onConnect, nodeRef,
}) => {
  const isText      = node.type === 'text';
  const isChecklist = node.type === 'checklist';
  const isImage     = node.type === 'image';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imgError, setImgError] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Auto-focus textarea when a new node is created
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
      onFocused();
    }
  }, [autoFocus, onFocused]);

  const bg    = isText ? 'transparent' : (node.color || '#FFFDE7');
  const isTransparent = isText;

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    transform: `translate(${node.x}px, ${node.y}px)`,
    width: node.w,
    height: node.h,
    background: bg,
    borderRadius: isText ? 6 : 12,
    border: isTransparent
      ? 'none'
      : selected
        ? '1.5px solid #4A9EFF'
        : '1px solid rgba(0,0,0,0.08)',
    boxShadow: isTransparent ? 'none' : selected
      ? '0 0 0 3px rgba(74,158,255,0.15), 0 4px 16px rgba(0,0,0,0.10)'
      : '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
    cursor: tool === 'connect' ? 'crosshair' : 'default',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'box-shadow 0.12s, border-color 0.12s',
  };

  return (
    <div
      ref={nodeRef}
      style={cardStyle}
      className="group"
      onPointerDown={e => {
        if (tool === 'connect') { onConnect(e); return; }
        onSelect();
      }}
      onDoubleClick={event => {
        event.stopPropagation();
        onOpenStudy();
      }}
    >
      {/* ── Header (drag zone + controls) ── */}
      {!isText && (
        <div
          className="shrink-0 flex items-center justify-between px-2 py-1.5 transition-opacity"
          style={{
            background: 'rgba(0,0,0,0.025)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            cursor: 'grab',
            opacity: selected ? 1 : 0,
          }}
          onPointerDown={onDragStart}
        >
          {/* Color dot */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="w-3 h-3 rounded-full border border-white/80 box-shadow: 0 1px 2px rgba(0,0,0,0.25) hover:scale-125 transition-all"
              style={{ background: node.color === 'transparent' ? '#E0E0E0' : (node.color || '#FFFDE7') }}
              onClick={() => setShowColorPicker(p => !p)}
            />
            {showColorPicker && (
              <div
                className="absolute top-6 left-0 z-50 background: var(--aurea-surface) rounded-xl shadow-xl border flex gap-1.5 p-2"
                style={{ border: '1px solid #EBEBEB' }}
              >
                {[...STICKY_COLORS, '#ffffff', '#F1F5F9'].map(c => (
                  <button
                    key={c}
                    onClick={() => { onUpdate({ color: c }); setShowColorPicker(false); }}
                    className="w-5 h-5 rounded-full hover:scale-110 transition-all"
                    style={{ background: c, border: node.color === c ? '2px solid #333' : '1.5px solid #D0D0D0' }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onOpenStudy(); }}
              className="flex h-5 w-5 items-center justify-center rounded color: var(--aurea-text-muted) transition-all hover:background: var(--aurea-surface) hover:text-amber-700"
              title="Abrir estudo deste card"
              aria-label="Abrir estudo deste card"
            >
              <BookOpen size={10} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onDelete(); }}
              className="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-all hover:background: rgba(239,68,68,0.08) hover:text-red-400"
              title="Excluir card"
              aria-label="Excluir card"
            >
              <X size={10} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {isImage ? (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {imgError ? (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <ImageIcon size={24} style={{ color: '#D0D0D0' }} />
                <p className="text-[10px] text-gray-300 font-medium">Imagem não carregou</p>
                <input
                  className="text-[10px] text-blue-400 underline bg-transparent outline-none w-full text-center"
                  value={node.url || ''}
                  onChange={e => { onUpdate({ url: e.target.value }); setImgError(false); }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                  placeholder="Editar URL..."
                />
              </div>
            ) : (
              <img
                src={node.url}
                alt=""
                className="w-full h-full object-contain pointer-events-none"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        ) : isChecklist ? (
          <div className="flex-1 px-3 pb-3 pt-2 overflow-y-auto space-y-1.5 no-scrollbar">
            {(node.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group/item">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const items = [...(node.items || [])];
                    items[idx].done = !items[idx].done;
                    onUpdate({ items });
                  }}
                  className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{ borderColor: item.done ? '#4A9EFF' : '#D0D0D0', background: item.done ? '#4A9EFF' : 'transparent' }}
                >
                  {item.done && <Check size={9} color="#fff" strokeWidth={3} />}
                </button>
                <input
                  className={`flex-1 text-[12px] bg-transparent outline-none transition-colors ${item.done ? 'line-through text-gray-300' : 'color: var(--aurea-text)'}`}
                  style={{ fontFamily: 'inherit' }}
                  value={item.text}
                  onChange={e => {
                    const items = [...(node.items || [])];
                    items[idx].text = e.target.value;
                    onUpdate({ items });
                  }}
                  onClick={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  placeholder="Item..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const items = [...(node.items || [])];
                      items.splice(idx + 1, 0, { text: '', done: false });
                      onUpdate({ items });
                    }
                    if (e.key === 'Backspace' && !item.text && (node.items || []).length > 1) {
                      e.preventDefault();
                      const items = (node.items || []).filter((_, i) => i !== idx);
                      onUpdate({ items });
                    }
                  }}
                />
                <button
                  className="w-4 h-4 flex items-center justify-center opacity-0 group-hover/item:opacity-100 text-gray-200 hover:text-red-400 transition-all"
                  onClick={e => {
                    e.stopPropagation();
                    const items = (node.items || []).filter((_, i) => i !== idx);
                    onUpdate({ items: items.length ? items : [{ text: '', done: false }] });
                  }}
                >
                  <X size={9} />
                </button>
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-[11px] font-medium text-gray-300 hover:color: var(--aurea-text-muted) transition-all mt-1"
              onClick={e => {
                e.stopPropagation();
                const items = [...(node.items || []), { text: '', done: false }];
                onUpdate({ items });
              }}
            >
              <Plus size={11} /> Adicionar
            </button>
          </div>
        ) : isText ? (
          /* Plain text: no header, full area */
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              className="w-full h-full bg-transparent resize-none outline-none text-[13px] font-medium text-gray-800 leading-relaxed"
              style={{ padding: '6px 8px', fontFamily: 'inherit', cursor: 'text' }}
              value={node.text || ''}
              onChange={e => onUpdate({ text: e.target.value })}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              placeholder="Clique para escrever..."
            />
            {/* Drag handle for text nodes */}
            <div
              className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-all"
              style={{ background: 'rgba(0,0,0,0.05)' }}
              onPointerDown={onDragStart}
            >
              <MoreHorizontal size={10} className="color: var(--aurea-text-muted)" />
            </div>
            {/* Text delete */}
            {selected && (
              <button
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded flex items-center justify-center text-gray-200 hover:text-red-400 hover:background: rgba(239,68,68,0.08) transition-all"
                onClick={e => { e.stopPropagation(); onDelete(); }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ) : (
          /* sticky / shape */
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent resize-none outline-none text-[13px] text-gray-800 leading-relaxed"
            style={{ padding: '10px 14px', fontFamily: 'inherit', cursor: 'text' }}
            value={node.text || ''}
            onChange={e => onUpdate({ text: e.target.value })}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            placeholder="Escreva aqui..."
          />
        )}
      </div>

      {/* ── Connection dots — visible on hover or in connect mode ── */}
      {(tool === 'connect' || selected) && !isText && (
        <>
          {[
            { style: { top: -5, left: '50%', transform: 'translateX(-50%)' } },
            { style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
            { style: { left: -5, top: '50%', transform: 'translateY(-50%)' } },
            { style: { right: -5, top: '50%', transform: 'translateY(-50%)' } },
          ].map((pos, i) => (
            <div
              key={i}
              onPointerDown={e => {
                e.stopPropagation();
                onConnect(e);
              }}
              style={{
                position: 'absolute',
                ...pos.style,
                width: 10, height: 10,
                borderRadius: '50%',
                background: '#fff',
                border: '1.5px solid #4A9EFF',
                cursor: 'crosshair',
                zIndex: 20,
              }}
            />
          ))}
        </>
      )}

      {/* ── Resize handle ── */}
      {selected && !isText && (
        <div
          style={{ position: 'absolute', bottom: -4, right: -4, width: 10, height: 10, borderRadius: 2, background: '#4A9EFF', cursor: 'se-resize', zIndex: 20 }}
          onPointerDown={e => { e.stopPropagation(); onResizeStart(e); }}
        />
      )}
    </div>
  );
};
