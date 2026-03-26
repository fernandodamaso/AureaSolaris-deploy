import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit3, Image as ImageIcon, ZoomIn, ZoomOut, Star, Trash2, ListTodo, ArrowUpRight, Mail, Cloud, FolderOpen, Undo2, Redo2, Download } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { sendEmail, saveToGoogleDrive } from '../utils/exportUtils';
import { AssetPicker } from './mesa/AssetPicker';

type HistoryAction = {
  type: 'addNode' | 'deleteNode' | 'moveNode' | 'resizeNode' | 'addEdge' | 'deleteEdge' | 'updateNode';
  payload: any;
  timestamp: number;
};

const MAX_HISTORY = 50;

export const MesaCriacao = () => {
  const boardId = useRef(`board_${Date.now()}`);
  const currentUser = useRef('user_local');

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragNode, setDragNode] = useState<any>(null);
  const [resizeNode, setResizeNode] = useState<{id: any, corner: string} | null>(null);
  const [drawingEdge, setDrawingEdge] = useState<any>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const nodesRef = useRef<any[]>(nodes);
  const edgesRef = useRef<any[]>(edges);
  const nodeRefs = useRef<Map<any, HTMLDivElement>>(new Map());
  const edgeRefs = useRef<Map<any, SVGLineElement>>(new Map());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const pushHistory = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > MAX_HISTORY) {
        return newStack.slice(newStack.length - MAX_HISTORY);
      }
      return newStack;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    switch (action.type) {
      case 'addNode':
        setNodes(prev => prev.filter(n => n.id !== action.payload.node.id));
        break;
      case 'deleteNode':
        setNodes(prev => [...prev, action.payload.node]);
        if (action.payload.edges) {
          setEdges(prev => [...prev, ...action.payload.edges]);
        }
        break;
      case 'moveNode':
      case 'resizeNode':
        setNodes(prev => prev.map(n => n.id === action.payload.nodeId ? { ...n, ...action.payload.oldState } : n));
        break;
      case 'addEdge':
        setEdges(prev => prev.filter(e => e.id !== action.payload.edge.id));
        break;
      case 'deleteEdge':
        setEdges(prev => [...prev, action.payload.edge]);
        break;
      case 'updateNode':
        setNodes(prev => prev.map(n => n.id === action.payload.nodeId ? action.payload.oldState : n));
        break;
    }

    setRedoStack(prev => [...prev, action]);
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    switch (action.type) {
      case 'addNode':
        setNodes(prev => [...prev, action.payload.node]);
        break;
      case 'deleteNode':
        setNodes(prev => prev.filter(n => n.id !== action.payload.node.id));
        if (action.payload.edges) {
          setEdges(prev => prev.filter(e => !action.payload.edges.some((ae: any) => ae.id === e.id)));
        }
        break;
      case 'moveNode':
      case 'resizeNode':
        setNodes(prev => prev.map(n => n.id === action.payload.nodeId ? { ...n, ...action.payload.newState } : n));
        break;
      case 'addEdge':
        setEdges(prev => [...prev, action.payload.edge]);
        break;
      case 'deleteEdge':
        setEdges(prev => prev.filter(e => e.id !== action.payload.edge.id));
        break;
      case 'updateNode':
        setNodes(prev => prev.map(n => n.id === action.payload.nodeId ? action.payload.newState : n));
        break;
    }

    setUndoStack(prev => [...prev, action]);
  }, [redoStack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addHistory = (action: string) => {
    const event = new CustomEvent('aurea-vision', { detail: { action, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), id: Date.now() } });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fallback para localStorage para recuperação imediata na navegação
        const local = localStorage.getItem('aurea_mesa_temp');
        if (local) {
          const parsed = JSON.parse(local);
          setNodes(parsed.nodes || []);
          setEdges(parsed.edges || []);
          return;
        }

        // TODO: não implementado - comando 'load_board' não existe no backend
        const data = await safeInvoke<any>('load_board').catch(() => null);
        if (data && data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
        } else {
          const initial = [{ id: 1, type: 'text', x: 200, y: 150, w: 160, h: 90, text: 'Alecrim e Flores Brancas', color: '#ffffff' }];
          setNodes(initial);
          addHistory('Mesa inicializada');
        }
      } catch (e) { /* ignore */ }
    };
    loadData();
  }, []);

  // Auto-save mechanism (debounced)
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    
    // Salva no localStorage imediatamente para navegação interna
    localStorage.setItem('aurea_mesa_temp', JSON.stringify({ nodes, edges }));

    const timer = setTimeout(() => {
      safeInvoke('save_board', { nodes, edges }).catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const exportJSON = async () => {
    try {
      const data = { nodes, edges, version: '1.0', timestamp: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      // eslint-disable-next-line react-hooks/purity
      downloadFile(blob, `aurea_board_${Date.now()}.json`);
      addHistory('Mesa exportada (JSON)');
    } catch (e) {
      console.error('Falha ao exportar JSON:', e);
    }
  };

  const exportSVG = () => {
    const svgElement = document.querySelector('.mesa-svg-container');
    if (!svgElement) return;
    
    // Clonar para não afetar a UI
    const clone = svgElement.cloneNode(true) as HTMLElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    // eslint-disable-next-line react-hooks/purity
    downloadFile(blob, `aurea_board_${Date.now()}.svg`);
    addHistory('Mesa exportada (SVG)');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Funções de exportação para email e Google Drive
  const exportForEmail = () => {
    const content = nodes.map((n: any) => `- ${n.text}`).join('\n');
    const subject = 'Mesa de Criação - Aurea Solaris';
    const body = `Minha Mesa de Criação:\n\n${content}\n\n---\nExportado em ${new Date().toLocaleDateString('pt-BR')}`;
    sendEmail(subject, body);
    addHistory('Mesa enviada por email');
  };

  const exportForDrive = () => {
    const content = nodes.map((n: any) => `- ${n.text}`).join('\n');
    const fullContent = `# Mesa de Criação\n\n${content}\n\n---\nExportado do Aurea Solaris em ${new Date().toLocaleDateString('pt-BR')}`;
    saveToGoogleDrive(fullContent, 'mesa_criacao.md');
    addHistory('Mesa salva no Google Drive');
  };

  const updateLine = (edgeId: number, n1: any, n2: any) => {
    const line = edgeRefs.current.get(edgeId);
    if (line) {
      line.setAttribute('x1', (n1.x + n1.w / 2).toString());
      line.setAttribute('y1', (n1.y + n1.h / 2).toString());
      line.setAttribute('x2', (n2.x + n2.w / 2).toString());
      line.setAttribute('y2', (n2.y + n2.h / 2).toString());
    }
  };

  const onPointerMoveBoard = (e: any) => {
    if (dragNode !== null && zoom > 0) {
      const node = nodesRef.current.find((n: any) => n.id === dragNode);
      if (node) {
        node.x += e.movementX / zoom;
        node.y += e.movementY / zoom;

        const snappedX = Math.round(node.x / 10) * 10;
        const snappedY = Math.round(node.y / 10) * 10;
        
        const displayX = snapToGrid ? snappedX : node.x;
        const displayY = snapToGrid ? snappedY : node.y;

        const el = nodeRefs.current.get(dragNode);
        if (el) {
          el.style.transform = `translate(${displayX}px, ${displayY}px)`;
        }

        edgesRef.current.forEach((edge: any) => {
          if (edge.from === dragNode || edge.to === dragNode) {
            const n1 = nodesRef.current.find((n: any) => n.id === edge.from);
            const n2 = nodesRef.current.find((n: any) => n.id === edge.to);
            if (n1 && n2) updateLine(edge.id, n1, n2);
          }
        });
      }
    }
    if (resizeNode !== null && zoom > 0) {
      const node = nodesRef.current.find((n: any) => n.id === resizeNode.id);
      if (node) {
        const dx = e.movementX / zoom;
        const dy = e.movementY / zoom;
        const minSize = 60;
        
        if (resizeNode.corner === 'se') {
          node.w = Math.max(minSize, node.w + dx);
          node.h = Math.max(minSize, node.h + dy);
        } else if (resizeNode.corner === 'sw') {
          node.w = Math.max(minSize, node.w - dx);
          node.x += dx;
          node.h = Math.max(minSize, node.h + dy);
        } else if (resizeNode.corner === 'ne') {
          node.w = Math.max(minSize, node.w + dx);
          node.h = Math.max(minSize, node.h - dy);
          node.y += dy;
        } else if (resizeNode.corner === 'nw') {
          node.w = Math.max(minSize, node.w - dx);
          node.x += dx;
          node.h = Math.max(minSize, node.h - dy);
          node.y += dy;
        }
        
        const el = nodeRefs.current.get(resizeNode.id);
        if (el) {
          el.style.width = `${node.w}px`;
          el.style.height = `${node.h}px`;
          if (node.type !== 'sticker') {
            el.style.transform = `translate(${node.x}px, ${node.y}px)`;
          }
        }
        
        edgesRef.current.forEach((edge: any) => {
          if (edge.from === resizeNode.id || edge.to === resizeNode.id) {
            const n1 = nodesRef.current.find((n: any) => n.id === edge.from);
            const n2 = nodesRef.current.find((n: any) => n.id === edge.to);
            if (n1 && n2) updateLine(edge.id, n1, n2);
          }
        });
      }
    }
    if (drawingEdge) setDrawingEdge({ ...drawingEdge, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
    if (e.buttons === 1 && !dragNode && !resizeNode && !drawingEdge) setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };

  const startEdge = (id: any, e: any) => {
    e.stopPropagation();
    const node = nodesRef.current.find((n: any) => n.id === id);
    if (!node) return;
    setDrawingEdge({ id1: id, x1: node.x + node.w / 2, y1: node.y + node.h / 2, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
  };

  const finishEdge = (id: any) => {
    if (drawingEdge && drawingEdge.id1 !== id) {
      const edge = { id: Date.now(), from: drawingEdge.id1, to: id, owner: currentUser.current };
      const newEdges = [...edges, edge];
      setEdges(newEdges);
      pushHistory({ type: 'addEdge', payload: { edge }, timestamp: Date.now() });
    }
    setDrawingEdge(null);
  };

  return (
    <div 
      className="absolute inset-0 bg-[#FCF9F1] overflow-hidden cursor-grab active:cursor-grabbing z-0" 
      data-board-id={boardId.current}
      onPointerMove={onPointerMoveBoard} 
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
        }
      }}
      onPointerUp={() => { 
        if (dragNode !== null) {
          const node = nodesRef.current.find((n: any) => n.id === dragNode);
          if (node) {
            const oldState = { x: node.x, y: node.y };
            if (snapToGrid) {
              node.x = Math.round(node.x / 10) * 10;
              node.y = Math.round(node.y / 10) * 10;
            }
            const newState = { x: node.x, y: node.y };
            if (oldState.x !== newState.x || oldState.y !== newState.y) {
              pushHistory({ type: 'moveNode', payload: { nodeId: dragNode, oldState, newState }, timestamp: Date.now() });
            }
            setNodes([...nodesRef.current]);
          }
        }
        if (resizeNode !== null) {
          const node = nodesRef.current.find((n: any) => n.id === resizeNode.id);
          if (node) {
            pushHistory({ type: 'resizeNode', payload: { nodeId: resizeNode.id, oldState: { w: node.w, h: node.h }, newState: { w: node.w, h: node.h } }, timestamp: Date.now() });
            setNodes([...nodesRef.current]);
          }
        }
        setDragNode(null); 
        setResizeNode(null);
        setDrawingEdge(null); 
      }} 
      style={{ touchAction: 'none' }}
    >
      
      {/* BACKGROUND DOT GRID */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle, #c5a059 1px, transparent 1px)`, 
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`, 
          opacity: 0.15, 
          transform: `translate(${pan.x}px, ${pan.y}px)` 
        }} 
      />
      
      {/* TOOLBAR (Reduced Size) */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-[70] toolbar font-sans animate-in slide-in-from-left-2 duration-500">
        {/* Header com ícones cósmicos */}
        <div className="bg-[#FCF9F1] rounded-xl border border-gold/20 p-2">
          <div className="text-[8px] tracking-[3px] text-gold/40 text-center mb-1">✦ ☉ ✦</div>
        </div>
        
        <div className="bg-[#FCF9F1] rounded-xl border border-gold/20 p-1.5 flex flex-col gap-1">
            <button title="Post-it" onClick={() => { const node = {id:Date.now(), type:'text', x:100, y:100, w:180, h:100, text:'', color:'#fff', owner: currentUser.current}; const nn = [...nodes, node]; setNodes(nn); pushHistory({ type: 'addNode', payload: { node }, timestamp: Date.now() }); addHistory('Post-it adicionado'); }} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Plus size={16}/></button>
           <button title="Caixa de Texto" onClick={() => { const node = {id:Date.now(), type:'plain-text', x:120, y:120, w:160, h:40, text:'Novo Pensamento', color:'transparent', owner: currentUser.current}; const nn = [...nodes, node]; setNodes(nn); pushHistory({ type: 'addNode', payload: { node }, timestamp: Date.now() }); addHistory('Caixa de texto criada'); }} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Edit3 size={16}/></button>
           <button title="Lista de Tarefas" onClick={() => { const node = {id:Date.now(), type:'checklist', x:140, y:140, w:200, h:160, items:[{text:'Item 1', done:false}], color:'#fff', owner: currentUser.current}; const nn = [...nodes, node]; setNodes(nn); pushHistory({ type: 'addNode', payload: { node }, timestamp: Date.now() }); addHistory('Checklist criado'); }} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ListTodo size={16}/></button>
           <button title="Adesivo Estelar" onClick={() => { const node = {id:Date.now(), type:'sticker', x:160, y:160, w:80, h:80, symbol:'☽', color:'transparent', owner: currentUser.current}; const nn = [...nodes, node]; setNodes(nn); pushHistory({ type: 'addNode', payload: { node }, timestamp: Date.now() }); addHistory('Símbolo adicionado'); }} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Star size={16}/></button>
           <button title="Imagem" onClick={() => { const url = prompt('URL da Imagem:'); if(url) { const node = {id:Date.now(), type:'image', x:150, y:150, w:200, h:140, url, color:'#fff', owner: currentUser.current}; const nn = [...nodes, node]; setNodes(nn); pushHistory({ type: 'addNode', payload: { node }, timestamp: Date.now() }); addHistory('Imagem anexada'); } }} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ImageIcon size={16}/></button>
           <div className="w-full h-px bg-gold/10 my-0.5" />
           <button title="Importar do Servidor" onClick={() => setShowAssetPicker(true)} className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><FolderOpen size={16}/></button>
         </div>
        
        <div className="bg-[#FCF9F1] rounded-xl border border-gold/20 p-1.5 flex flex-col gap-1">
           <button title="Desfazer (Ctrl+Z)" onClick={undo} disabled={undoStack.length === 0} className={`p-2 rounded-lg transition-all ${undoStack.length === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:text-gold hover:bg-gold/5'}`}><Undo2 size={16}/></button>
           <button title="Refazer (Ctrl+Shift+Z)" onClick={redo} disabled={redoStack.length === 0} className={`p-2 rounded-lg transition-all ${redoStack.length === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:text-gold hover:bg-gold/5'}`}><Redo2 size={16}/></button>
           <div className="w-full h-px bg-gold/10 my-0.5" />
           <button title="Atrair ao Grid" onClick={() => setSnapToGrid(!snapToGrid)} className={`p-2 rounded-lg transition-all ${snapToGrid ? 'bg-gold text-white' : 'text-gray-500 hover:bg-gold/5'}`}><div className="w-3 h-3 border-2 border-current border-dashed rounded-sm opacity-60" /></button>
           <button title="Exportar JSON" onClick={exportJSON} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ArrowUpRight size={16}/></button>
           <button title="Exportar SVG" onClick={exportSVG} className="p-2 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Download size={16}/></button>
           <button title="Enviar por Email" onClick={exportForEmail} className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Mail size={16}/></button>
           <button title="Salvar no Google Drive" onClick={exportForDrive} className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"><Cloud size={16}/></button>
        </div>
        
        {/* ZOOM CONTROLS */}
        <div className="bg-[#FCF9F1] rounded-xl border border-gold/20 p-1.5 flex flex-col items-center gap-1">
           <button onClick={() => setZoom(z => Math.min(z+0.2, 3))} className="p-1.5 text-gold/60 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ZoomIn size={14}/></button>
           <span className="text-[7px] font-bold py-0.5 text-gray-400 tracking-tighter">{Math.round(zoom*100)}%</span>
           <button onClick={() => setZoom(z => Math.max(z-0.2, 0.4))} className="p-1.5 text-gold/60 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ZoomOut size={14}/></button>
        </div>
      </div>

      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="w-full h-full absolute top-0 left-0 pointer-events-none mesa-svg-container">
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          {edges.map((edge: any) => {
            const n1 = nodes.find((n: any)=>n.id===edge.from);
            const n2 = nodes.find((n: any)=>n.id===edge.to);
            if(!n1 || !n2) return null;
            return <line 
              ref={el => { if (el) edgeRefs.current.set(edge.id, el); }}
              key={edge.id} 
              x1={n1.x + n1.w/2} y1={n1.y + n1.h/2} x2={n2.x + n2.w/2} y2={n2.y + n2.h/2} 
              stroke="#c5a059" strokeWidth="1.5" opacity="0.15" 
              className="transition-opacity hover:opacity-60"
            />;
          })}
          {drawingEdge && <line x1={drawingEdge.x1} y1={drawingEdge.y1} x2={drawingEdge.x2} y2={drawingEdge.y2} stroke="#c5a059" strokeWidth="2" strokeDasharray="4" opacity="0.4" />}
        </svg>
        {nodes.map((node: any) => (
          <div 
            ref={el => { if (el) nodeRefs.current.set(node.id, el); }}
            key={node.id} 
            className={`canvas-node group absolute shadow-xl border rounded-[1.25rem] z-10 flex flex-col pointer-events-auto border-gold/5 hover:border-gold/20 hover:shadow-2xl bg-white`} 
            data-node-owner={node.owner || 'unknown'}
            style={{ 
              transform: `translate(${node.x}px, ${node.y}px)`, 
              backgroundColor: node.color, 
              width: node.w, 
              height: node.h 
            }} 
            onPointerUp={() => finishEdge(node.id)}
          >
             <div className="cursor-move p-3 flex justify-between items-center bg-black/5 shrink-0" onPointerDown={(e) => {e.stopPropagation(); setDragNode(node.id); (e.target as HTMLElement).setPointerCapture(e.pointerId)}}>
               <Star size={10} className="text-gold/40"/>
               <div className="flex gap-2 items-center">
                 <div className="w-3.5 h-3.5 bg-white border border-gray-100 rounded-lg cursor-pointer hover:scale-125 transition-all shadow-sm" onClick={() => setNodes(nodes.map(n=>n.id===node.id?{...n, color:'#fff'}:n))} />
                 <div className="w-3.5 h-3.5 bg-[#FCF9F1] border border-gold/10 rounded-lg cursor-pointer hover:scale-125 transition-all shadow-sm" onClick={() => setNodes(nodes.map(n=>n.id===node.id?{...n, color:'#FCF9F1'}:n))} />
                  <Trash2 size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500 transition-all ml-1" onClick={() => { const deletedNode = nodes.find(n=>n.id===node.id); const deletedEdges = edges.filter(e=>e.from===node.id || e.to===node.id); setNodes(nodes.filter(n=>n.id!==node.id)); setEdges(edges.filter(e=>e.from!==node.id && e.to!==node.id)); pushHistory({ type: 'deleteNode', payload: { node: deletedNode, edges: deletedEdges }, timestamp: Date.now() }); }} />
               </div>
             </div>
             {node.type === 'image' ? (
                <div className="flex-1 overflow-hidden"><img src={node.url || ''} className="w-full h-full object-cover pointer-events-none" alt="" /></div>
             ) : node.type === 'sticker' ? (
                <div className="flex-1 flex items-center justify-center text-4xl select-none leading-none" onPointerDown={e => e.stopPropagation()}>{node.symbol}</div>
             ) : node.type === 'checklist' ? (
                <div className="flex-1 p-5 space-y-2 overflow-y-auto no-scrollbar">
                  {(node.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={item.done} 
                        onChange={() => {
                          const newItems = [...node.items];
                          newItems[idx].done = !newItems[idx].done;
                          setNodes(nodes.map(n => n.id === node.id ? { ...n, items: newItems } : n));
                        }}
                        className="w-4 h-4 accent-gold"
                      />
                      <input 
                        className={`flex-1 bg-transparent text-[12px] font-bold outline-none ${item.done ? 'line-through opacity-40' : 'text-gray-700'}`}
                        value={item.text}
                        onChange={(e) => {
                          const newItems = [...node.items];
                          newItems[idx].text = e.target.value;
                          setNodes(nodes.map(n => n.id === node.id ? { ...n, items: newItems } : n));
                        }}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newItems = [...(node.items || []), { text: '', done: false }];
                      setNodes(nodes.map(n => n.id === node.id ? { ...n, items: newItems } : n));
                    }}
                    className="text-[10px] font-black uppercase text-gold/60 hover:text-gold mt-2 tracking-widest"
                  >
                    + Item
                  </button>
                </div>
             ) : node.type === 'plain-text' ? (
                <textarea className="flex-1 bg-transparent p-5 resize-none outline-none font-sans text-[12px] font-black text-gray-800 no-scrollbar overflow-hidden tracking-tight" value={node.text} onChange={e => setNodes(nodes.map(n=>n.id===node.id?{...n, text:e.target.value}:n))} onPointerDown={e => e.stopPropagation()} />
             ) : (
                <textarea className="flex-1 bg-transparent p-3 resize-none outline-none font-sans text-[12px] leading-relaxed text-gray-700 no-scrollbar font-medium placeholder:italic placeholder:opacity-30" value={node.text} onChange={e => setNodes(nodes.map(n=>n.id===node.id?{...n, text:e.target.value}:n))} onPointerDown={e => e.stopPropagation()} placeholder="Transcrição de ideia..." />
             )}
             
             {/* CONNECTORS - Visible on Hover */}
             <div className="hook-dot -right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" onPointerDown={(e) => startEdge(node.id, e)} />
             <div className="hook-dot -left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" onPointerDown={(e) => startEdge(node.id, e)} />
             
             {/* RESIZE HANDLES - Visible on Hover */}
             <div className="resize-handle resize-se -right-1.5 -bottom-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-se-resize w-3 h-3 bg-gold/30 hover:bg-gold/60 rounded-bl-sm" onPointerDown={(e) => { e.stopPropagation(); setResizeNode({id: node.id, corner: 'se'}); (e.target as HTMLElement).setPointerCapture(e.pointerId); }} />
             <div className="resize-handle resize-sw -left-1.5 -bottom-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-sw-resize w-3 h-3 bg-gold/30 hover:bg-gold/60 rounded-br-sm" onPointerDown={(e) => { e.stopPropagation(); setResizeNode({id: node.id, corner: 'sw'}); (e.target as HTMLElement).setPointerCapture(e.pointerId); }} />
             <div className="resize-handle resize-ne -right-1.5 -top-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-ne-resize w-3 h-3 bg-gold/30 hover:bg-gold/60 rounded-bl-sm" onPointerDown={(e) => { e.stopPropagation(); setResizeNode({id: node.id, corner: 'ne'}); (e.target as HTMLElement).setPointerCapture(e.pointerId); }} />
             <div className="resize-handle resize-nw -left-1.5 -top-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-nw-resize w-3 h-3 bg-gold/30 hover:bg-gold/60 rounded-br-sm" onPointerDown={(e) => { e.stopPropagation(); setResizeNode({id: node.id, corner: 'nw'}); (e.target as HTMLElement).setPointerCapture(e.pointerId); }} />
           </div>
        ))}
      </div>
      
      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <AssetPicker
          onClose={() => setShowAssetPicker(false)}
          onImport={(item) => {
            const node = {
              id: Date.now(),
              type: item.type === 'astro' ? 'text' : item.type === 'calendar' ? 'text' : item.type === 'task' ? 'checklist' : 'text',
              x: 200 + Math.random() * 200,
              y: 200 + Math.random() * 200,
              w: 260,
              h: item.type === 'task' ? 160 : 120,
              text: `[${item.type.toUpperCase()}] ${item.title}\n\n${item.preview}`,
              color: item.type === 'astro' ? '#FFF8E1' : item.type === 'calendar' ? '#E8F5E9' : item.type === 'task' ? '#F3E5F5' : '#E3F2FD',
              items: item.type === 'task' ? [{ text: item.title, done: item.data?.completed || false }] : undefined,
              owner: currentUser.current,
            };
            setNodes(prev => [...prev, node]);
            pushHistory({ type: 'addNode', payload: { node }, timestamp: Date.now() });
            setShowAssetPicker(false);
            addHistory(`Importado: ${item.title}`);
          }}
        />
      )}

    </div>
  );
};

/*
  COLLABORATION_READY:
  Para implementar colaboração em tempo real via WebSocket:
  
  1. Criar hook useCollaboration(boardId) que:
     - Estabelece conexão WebSocket com servidor
     - Sincroniza estado via pushHistory
     - Escuta eventos de outros usuários:
       - node:created, node:updated, node:deleted
       - edge:created, edge:deleted
       - cursor:moved (para indicadores de posição)
     - Transmite mudanças locais para servidor
  
  2. No componente MesaCriacao, substituir pushHistory por:
     - pushHistoryAndBroadcast(action) que também envia via WebSocket
  
  3. Adicionar indicadores visuais de presença:
     - Cursores coloridos de outros usuários
     - Borda colorida nos nodes com data-node-owner
  
  4. Servidor pode usar: socket.io, WebSocket nativo, ou Supabase Realtime
  
  5. Estrutura de mensagem sugerida:
     {
       type: 'action',
       boardId: string,
       userId: string,
       action: HistoryAction,
       timestamp: number
     }
*/
