import { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Image as ImageIcon, ZoomIn, ZoomOut, Star, Trash2, ListTodo, ArrowUpRight, Mail, Cloud, FolderOpen } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { sendEmail, saveToGoogleDrive } from '../utils/exportUtils';
import { AssetPicker } from './mesa/AssetPicker';

export const MesaCriacao = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragNode, setDragNode] = useState<any>(null);
  const [drawingEdge, setDrawingEdge] = useState<any>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  
  // Ref-based performance: store values that change rapidly
  const nodesRef = useRef<any[]>(nodes);
  const edgesRef = useRef<any[]>(edges);
  const nodeRefs = useRef<Map<any, HTMLDivElement>>(new Map());
  const edgeRefs = useRef<Map<any, SVGLineElement>>(new Map());

  // Move history to parent via a custom event or let it be handled by Strange
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

        const data = await safeInvoke<any>('load_board');
        if (data && data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
        } else {
          const initial = [{ id: 1, type: 'text', x: 200, y: 150, w: 220, h: 120, text: 'Alecrim e Flores Brancas', color: '#ffffff' }];
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

        // Snapping suave de 10px
        const snappedX = Math.round(node.x / 10) * 10;
        const snappedY = Math.round(node.y / 10) * 10;
        
        const displayX = snapToGrid ? snappedX : node.x;
        const displayY = snapToGrid ? snappedY : node.y;

        const el = nodeRefs.current.get(dragNode);
        if (el) {
          el.style.transform = `translate(${displayX}px, ${displayY}px)`;
        }

        // Update connected edges
        edgesRef.current.forEach((edge: any) => {
          if (edge.from === dragNode || edge.to === dragNode) {
            const n1 = nodesRef.current.find((n: any) => n.id === edge.from);
            const n2 = nodesRef.current.find((n: any) => n.id === edge.to);
            if (n1 && n2) updateLine(edge.id, n1, n2);
          }
        });
      }
    }
    if (drawingEdge) setDrawingEdge({ ...drawingEdge, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
    if (e.buttons === 1 && !dragNode && !drawingEdge) setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };

  const startEdge = (id: any, e: any) => {
    e.stopPropagation();
    const node = nodesRef.current.find((n: any) => n.id === id);
    if (!node) return;
    setDrawingEdge({ id1: id, x1: node.x + node.w / 2, y1: node.y + node.h / 2, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
  };

  const finishEdge = (id: any) => {
    if (drawingEdge && drawingEdge.id1 !== id) {
      // eslint-disable-next-line react-hooks/purity
      const newEdges = [...edges, { id: Date.now(), from: drawingEdge.id1, to: id }];
      setEdges(newEdges);
    }
    setDrawingEdge(null);
  };

  return (
    <div className="absolute inset-0 bg-[#F5F1E6] overflow-hidden cursor-grab active:cursor-grabbing z-0" 
      onPointerMove={onPointerMoveBoard} 
      onPointerDown={(e) => {
        // Clear focus if clicking the board
        if (e.target === e.currentTarget) {
          // Additional click-outside logic could go here
        }
      }}
      onPointerUp={() => { 
        if (dragNode !== null) {
          // Final Sync: Ref -> State
          const node = nodesRef.current.find((n: any) => n.id === dragNode);
          if (node) {
            if (snapToGrid) {
              node.x = Math.round(node.x / 10) * 10;
              node.y = Math.round(node.y / 10) * 10;
            }
            setNodes([...nodesRef.current]);
          }
        }
        setDragNode(null); 
        setDrawingEdge(null); 
      }} 
      style={{ touchAction: 'none' }}>
      
      {/* BACKGROUND DOT GRID */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle, #B8860B 1px, transparent 1px)`, 
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`, 
          opacity: 0.15, 
          transform: `translate(${pan.x}px, ${pan.y}px)` 
        }} 
      />
      
      {/* TOOLBAR (Reduced Size) */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-[70] toolbar font-sans animate-in slide-in-from-left-2 duration-500">
        <div className="bg-white/95 backdrop-blur-xl p-1.5 rounded-xl border border-gold/10 shadow-xl flex flex-col gap-1.5">
            <button title="Post-it" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'text', x:100, y:100, w:220, h:160, text:'', color:'#fff'}]; setNodes(nn); addHistory('Post-it adicionado'); }} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Plus size={18}/></button>
           <button title="Caixa de Texto" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'plain-text', x:120, y:120, w:200, h:50, text:'Novo Pensamento', color:'transparent'}]; setNodes(nn); addHistory('Caixa de texto criada'); }} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Edit3 size={18}/></button>
           <button title="Lista de Tarefas" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'checklist', x:140, y:140, w:240, h:200, items:[{text:'Item 1', done:false}], color:'#fff'}]; setNodes(nn); addHistory('Checklist criado'); }} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ListTodo size={18}/></button>
           <button title="Adesivo Estelar" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'sticker', x:160, y:160, w:80, h:80, symbol:'☽', color:'transparent'}]; setNodes(nn); addHistory('Símbolo adicionado'); }} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><Star size={18}/></button>
           <button title="Imagem" onClick={() => { const url = prompt('URL da Imagem:'); if(url) { const nn = [...nodes, {id:Date.now(), type:'image', x:150, y:150, w:300, h:200, url, color:'#fff'}]; setNodes(nn); addHistory('Imagem anexada'); } }} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ImageIcon size={18}/></button>
           <div className="w-full h-px bg-gray-100 my-0.5" />
           <button title="Importar do Servidor" onClick={() => setShowAssetPicker(true)} className="p-2.5 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><FolderOpen size={18}/></button>
         </div>
        
        <div className="bg-white/95 backdrop-blur-xl p-1.5 rounded-xl border border-gold/10 shadow-xl flex flex-col gap-1.5">
           <button title="Atrair ao Grid" onClick={() => setSnapToGrid(!snapToGrid)} className={`p-2.5 rounded-lg transition-all ${snapToGrid ? 'bg-gold text-white' : 'text-gray-500 hover:bg-gold/5'}`}><div className="w-4 h-4 border-2 border-current border-dashed rounded-sm opacity-60" /></button>
           <button title="Exportar JSON" onClick={exportJSON} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ArrowUpRight size={18}/></button>
           <button title="Exportar SVG" onClick={exportSVG} className="p-2.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ImageIcon size={18}/></button>
           <button title="Enviar por Email" onClick={exportForEmail} className="p-2.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Mail size={18}/></button>
           <button title="Salvar no Google Drive" onClick={exportForDrive} className="p-2.5 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"><Cloud size={18}/></button>
        </div>
        
        {/* ZOOM CONTROLS */}
        <div className="bg-white/95 backdrop-blur-xl p-1.5 rounded-xl border border-gold/10 shadow-xl flex flex-col items-center gap-1">
           <button onClick={() => setZoom(z => Math.min(z+0.2, 3))} className="p-2 text-gold/60 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ZoomIn size={16}/></button>
           <span className="text-[8px] font-black py-0.5 text-gray-400 tracking-tighter">{Math.round(zoom*100)}%</span>
           <button onClick={() => setZoom(z => Math.max(z-0.2, 0.4))} className="p-2 text-gold/60 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ZoomOut size={16}/></button>
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
              stroke="#B8860B" strokeWidth="1.5" opacity="0.15" 
              className="transition-opacity hover:opacity-60"
            />;
          })}
          {drawingEdge && <line x1={drawingEdge.x1} y1={drawingEdge.y1} x2={drawingEdge.x2} y2={drawingEdge.y2} stroke="#B8860B" strokeWidth="2" strokeDasharray="4" opacity="0.4" />}
        </svg>
        {nodes.map((node: any) => (
          <div 
            ref={el => { if (el) nodeRefs.current.set(node.id, el); }}
            key={node.id} 
            className={`canvas-node group absolute shadow-xl border rounded-[1.25rem] z-10 flex flex-col pointer-events-auto border-gold/5 hover:border-gold/20 hover:shadow-2xl bg-white`} 
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
                 <Trash2 size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500 transition-all ml-1" onClick={() => { setNodes(nodes.filter(n=>n.id!==node.id)); setEdges(edges.filter(e=>e.from!==node.id && e.to!==node.id)); }} />
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
                <textarea className="flex-1 bg-transparent p-5 resize-none outline-none font-sans text-[15px] font-black text-gray-800 no-scrollbar overflow-hidden tracking-tight" value={node.text} onChange={e => setNodes(nodes.map(n=>n.id===node.id?{...n, text:e.target.value}:n))} onPointerDown={e => e.stopPropagation()} />
             ) : (
                <textarea className="flex-1 bg-transparent p-5 resize-none outline-none font-sans text-[13px] leading-relaxed text-gray-700 no-scrollbar font-bold placeholder:italic placeholder:opacity-30" value={node.text} onChange={e => setNodes(nodes.map(n=>n.id===node.id?{...n, text:e.target.value}:n))} onPointerDown={e => e.stopPropagation()} placeholder="Transcrição de ideia..." />
             )}
             
             {/* CONNECTORS - Visible on Hover */}
             <div className="hook-dot -right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" onPointerDown={(e) => startEdge(node.id, e)} />
             <div className="hook-dot -left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" onPointerDown={(e) => startEdge(node.id, e)} />
          </div>
        ))}
      </div>
      
      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <AssetPicker
          onClose={() => setShowAssetPicker(false)}
          onImport={(item) => {
            const newNode = {
              id: Date.now(),
              type: item.type === 'astro' ? 'text' : item.type === 'calendar' ? 'text' : item.type === 'task' ? 'checklist' : 'text',
              x: 200 + Math.random() * 200,
              y: 200 + Math.random() * 200,
              w: 260,
              h: item.type === 'task' ? 160 : 120,
              text: `[${item.type.toUpperCase()}] ${item.title}\n\n${item.preview}`,
              color: item.type === 'astro' ? '#FFF8E1' : item.type === 'calendar' ? '#E8F5E9' : item.type === 'task' ? '#F3E5F5' : '#E3F2FD',
              items: item.type === 'task' ? [{ text: item.title, done: item.data?.completed || false }] : undefined,
            };
            setNodes(prev => [...prev, newNode]);
            setShowAssetPicker(false);
            addHistory(`Importado: ${item.title}`);
          }}
        />
      )}
    </div>
  );
};
