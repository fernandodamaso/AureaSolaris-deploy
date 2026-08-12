import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MousePointer2, Square, StickyNote, Type, CheckSquare, Image as ImageIcon,
  ZoomIn, ZoomOut, Undo2, Redo2, Download, FolderOpen,
  Check, AlertCircle, Sparkles, Move, Link2,
  ChevronLeft, Pencil, X, BookOpen
} from 'lucide-react';
import { saveBoard } from '../../utils/board';
import type { CadernoBoard, CadernoEdge, CadernoNode } from '../../types/caderno';
import type { AureaTask } from '../../context/AgendaContext';
import { AssetPicker } from './AssetPicker';
import { StudyPanel } from './StudyPanel';
import { NodeCard, STICKY_COLORS } from './NodeCard';
import { useBoardHistory } from './useBoardHistory';
import { useBoardKeyboard, type BoardTool } from './useBoardKeyboard';

const GRID_SIZE = 20;

const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
const timestampId = () => Date.now();

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

export const MesaCanvas = ({
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
  const [tool, setTool] = useState<BoardTool>('select');
  const [selected, setSelected] = useState<number | null>(initialStudyNodeId);
  const [studyPanelOpen, setStudyPanelOpen] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0]);

  const [dragNode, setDragNode] = useState<{ id: number; prev: { x: number; y: number } } | null>(null);
  const [resizeNode, setResizeNode] = useState<{ id: number; prev: { w: number; h: number } } | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<number | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

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

  const { undoStack, redoStack, pushHistory, undo, redo } = useBoardHistory(setNodes, setEdges);

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

  const deleteNode = useCallback((id: number) => {
    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    const affectedEdges = edgesRef.current.filter(e => e.from === id || e.to === id);
    pushHistory({ type: 'deleteNode', payload: { node, edges: affectedEdges } });
    setNodes(p => p.filter(n => n.id !== id));
    setEdges(p => p.filter(e => e.from !== id && e.to !== id));
  }, [pushHistory]);

  const { spaceHeld } = useBoardKeyboard({
    undo,
    redo,
    selected,
    selectedEdgeId,
    setSelected,
    setSelectedEdgeId,
    setTool,
    setConnectSourceId,
    setFocusNodeId,
    pushHistory,
    deleteNode,
    setEdges,
    edgesRef,
  });

  const canvasRef = useRef<HTMLDivElement | null>(null);

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

  const onCanvasPointerDown = () => {
    if (tool === 'select' || spaceHeld) {
      isPanning.current = true;
      setSelected(null);
      setFocusNodeId(null);
    }
  };

  const onCanvasClick = () => {
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

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ boardName, nodes, edges }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${boardName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    showToast('Board exportado como JSON');
  };

  const tools: { id: BoardTool; icon: React.ReactNode; label: string; key?: string }[] = [
    { id: 'select',    icon: <MousePointer2 size={16} />, label: 'Cursor',    key: 'V' },
    { id: 'sticky',    icon: <StickyNote    size={16} />, label: 'Post-it',   key: 'N' },
    { id: 'text',      icon: <Type          size={16} />, label: 'Texto',     key: 'T' },
    { id: 'checklist', icon: <CheckSquare   size={16} />, label: 'Lista',     key: 'C' },
    { id: 'shape',     icon: <Square        size={16} />, label: 'Forma',     key: '' },
    { id: 'connect',   icon: <Link2         size={16} />, label: 'Conectar',  key: '' },
    { id: 'image',     icon: <ImageIcon     size={16} />, label: 'Imagem',    key: '' },
  ];

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
              items: item.type === 'task' ? [{ text: item.title, done: Boolean((item.data as AureaTask).completed || (item.data as AureaTask).is_completed) }] : undefined,
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
