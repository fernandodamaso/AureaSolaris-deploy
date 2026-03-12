import { useState, useEffect } from 'react';
import { Plus, Edit3, Image as ImageIcon, ZoomIn, ZoomOut, Star, Trash2, Clock, ListTodo, ArrowUpRight, Sparkles, RotateCcw } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

export const MesaCriacao = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragNode, setDragNode] = useState<any>(null);
  const [drawingEdge, setDrawingEdge] = useState<any>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [advice, setAdvice] = useState('Organize seus pensamentos sob a luz solar.');

  const addHistory = (action: string) => {
    const entry = { id: Date.now(), time: new Date().toLocaleTimeString('pt-BR'), action };
    setHistory(prev => [entry, ...prev].slice(0, 10));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await safeInvoke<any>('load_board');
        if (data) {
          if (data.nodes) setNodes(data.nodes);
          if (data.edges) setEdges(data.edges);
          if (data.history) setHistory(data.history);
        } else {
          setNodes([{ id: 1, type: 'text', x: 200, y: 150, w: 220, h: 120, text: 'Alecrim e Flores Brancas', color: '#ffffff' }]);
          addHistory('Mesa inicializada');
        }
      } catch (e) {}
    };
    loadData();
  }, []);

  const saveBoard = async (ns: any[], es: any[] = edges, hist: any[] = history) => {
    try { await safeInvoke('save_board', { nodes: ns, edges: es, history: hist }); } catch(e) {}
  };

  const onPointerMoveBoard = (e: any) => {
    if (dragNode !== null && zoom > 0) {
      setNodes(nodes.map(n => {
        if (n.id === dragNode) {
          let nx = n.x + (e.movementX / zoom);
          let ny = n.y + (e.movementY / zoom);
          if (snapToGrid) {
            nx = Math.round(nx / 20) * 20;
            ny = Math.round(ny / 20) * 20;
          }
          return { ...n, x: nx, y: ny };
        }
        return n;
      }));
    }
    if (drawingEdge) setDrawingEdge({ ...drawingEdge, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
    if (e.buttons === 1 && !dragNode && !drawingEdge) setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };

  const startEdge = (id: any, e: any) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setDrawingEdge({ id1: id, x1: node.x + node.w / 2, y1: node.y + node.h / 2, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
  };

  const finishEdge = (id: any) => {
    if (drawingEdge && drawingEdge.id1 !== id) {
      const newEdges = [...edges, { id: Date.now(), from: drawingEdge.id1, to: id }];
      setEdges(newEdges);
      saveBoard(nodes, newEdges);
    }
    setDrawingEdge(null);
  };

  return (
    <div className="absolute inset-0 bg-[#F5F1E6] overflow-hidden cursor-grab active:cursor-grabbing z-0" onPointerMove={onPointerMoveBoard} onPointerUp={() => { setDragNode(null); setDrawingEdge(null); saveBoard(nodes, edges); }} style={{ touchAction: 'none' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#B8860B 0.8px, transparent 0.8px)', backgroundSize: `${40 * zoom}px ${40 * zoom}px`, opacity: 0.1, transform: `translate(${pan.x % (40 * zoom)}px, ${pan.y % (40 * zoom)}px)` }}></div>
      
      {/* TOOLBAR */}
      <div className="absolute top-10 left-10 flex flex-col gap-4 z-[70] toolbar font-sans animate-in slide-in-from-left-4 duration-500">
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-gold/10 shadow-2xl flex flex-col gap-2">
           <button title="Post-it" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'text', x:100, y:100, w:220, h:160, text:'', color:'#fff'}]; setNodes(nn); addHistory('Post-it adicionado'); saveBoard(nn); }} className="p-3.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-xl transition-all shadow-sm"><Plus size={22}/></button>
           <button title="Caixa de Texto" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'plain-text', x:120, y:120, w:200, h:50, text:'Novo Pensamento', color:'transparent'}]; setNodes(nn); addHistory('Caixa de texto criada'); saveBoard(nn); }} className="p-3.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-xl transition-all shadow-sm"><Edit3 size={20}/></button>
           <button title="Lista de Tarefas" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'checklist', x:140, y:140, w:240, h:200, items:[{text:'Item 1', done:false}], color:'#fff'}]; setNodes(nn); addHistory('Checklist criado'); saveBoard(nn); }} className="p-3.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-xl transition-all shadow-sm"><ListTodo size={20}/></button>
           <button title="Adesivo Estelar" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'sticker', x:160, y:160, w:80, h:80, symbol:'☽', color:'transparent'}]; setNodes(nn); addHistory('Símbolo adicionado'); saveBoard(nn); }} className="p-3.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-xl transition-all shadow-sm"><Star size={20}/></button>
           <button title="Imagem" onClick={() => { const url = prompt('URL da Imagem:'); if(url) { const nn = [...nodes, {id:Date.now(), type:'image', x:150, y:150, w:300, h:200, url, color:'#fff'}]; setNodes(nn); addHistory('Imagem anexada'); saveBoard(nn); } }} className="p-3.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-xl transition-all shadow-sm"><ImageIcon size={20}/></button>
        </div>
        
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-gold/10 shadow-2xl flex flex-col gap-2">
           <button title="Atrair ao Grid" onClick={() => setSnapToGrid(!snapToGrid)} className={`p-3.5 rounded-xl transition-all shadow-sm ${snapToGrid ? 'bg-gold text-white' : 'text-gray-500 hover:bg-gold/5'}`}><div className="w-5 h-5 border-2 border-current border-dashed rounded-sm opacity-60" /></button>
           <button title="Exportar Mesa" onClick={() => alert('Exportação em processamento floral...')} className="p-3.5 text-gray-500 hover:text-gold hover:bg-gold/5 rounded-xl transition-all shadow-sm"><ArrowUpRight size={20}/></button>
        </div>
        
        {/* ZOOM CONTROLS */}
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-gold/10 shadow-2xl flex flex-col items-center gap-1">
           <button onClick={() => setZoom(z => Math.min(z+0.2, 3))} className="p-3 text-gold/60 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ZoomIn size={18}/></button>
           <span className="text-[10px] font-black py-1 text-gray-400 tracking-tighter">{Math.round(zoom*100)}%</span>
           <button onClick={() => setZoom(z => Math.max(z-0.2, 0.4))} className="p-3 text-gold/60 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"><ZoomOut size={18}/></button>
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div className="bg-[#333333]/95 backdrop-blur-xl p-5 rounded-[2rem] border border-white/5 shadow-2xl max-h-56 overflow-y-auto w-52 no-scrollbar animate-in fade-in slide-in-from-top-2">
             <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-gold/80 mb-4 flex items-center gap-2 border-b border-white/5 pb-2"><Clock size={10}/> Registros</h5>
             <div className="space-y-3">
                {history.map(h => (
                   <div key={h.id} className="text-[10px] text-gray-400 font-bold pl-3 border-l-2 border-gold/30 py-0.5">
                     <span className="text-white block tracking-tight leading-tight">{h.action}</span>
                     <span className="opacity-40 text-[8px] uppercase">{h.time}</span>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>

      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="w-full h-full absolute top-0 left-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          {edges.map(edge => {
            const n1 = nodes.find(n=>n.id===edge.from);
            const n2 = nodes.find(n=>n.id===edge.to);
            if(!n1 || !n2) return null;
            return <line key={edge.id} x1={n1.x + n1.w/2} y1={n1.y + n1.h/2} x2={n2.x + n2.w/2} y2={n2.y + n2.h/2} stroke="#B8860B" strokeWidth="1.5" opacity="0.2" />;
          })}
          {drawingEdge && <line x1={drawingEdge.x1} y1={drawingEdge.y1} x2={drawingEdge.x2} y2={drawingEdge.y2} stroke="#B8860B" strokeWidth="2" strokeDasharray="4" opacity="0.4" />}
        </svg>
        {nodes.map(node => (
          <div key={node.id} className={`canvas-node absolute shadow-xl border rounded-2xl z-10 flex flex-col pointer-events-auto transition-all group border-gold/5 hover:border-gold/20 hover:shadow-2xl overflow-hidden`} style={{ transform: `translate(${node.x}px, ${node.y}px)`, backgroundColor: node.color, width: node.w, height: node.h }} onPointerUp={() => finishEdge(node.id)}>
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
             <div className="hook-dot -right-1.5 top-1/2 -translate-y-1/2" onPointerDown={(e) => startEdge(node.id, e)} />
             <div className="hook-dot -left-1.5 top-1/2 -translate-y-1/2" onPointerDown={(e) => startEdge(node.id, e)} />
          </div>
        ))}
      </div>
      
      {/* AGENT ADVICE PANEL */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[70] w-full max-w-xl px-4 pointer-events-none">
         <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-gold/20 shadow-2xl pointer-events-auto flex items-center gap-6 animate-in slide-in-from-bottom-6">
            <div className="w-12 h-12 bg-[#333333] rounded-full flex items-center justify-center shrink-0 shadow-lg border-2 border-gold/30">
               <Sparkles size={20} className="text-gold" />
            </div>
            <div className="flex-1">
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/60 mb-1">Visão do Arquiteto</p>
               <p className="text-[13px] font-bold text-gray-700 leading-tight italic">"{advice}"</p>
            </div>
            <button onClick={() => setAdvice('As conexões que você desenha hoje são os portais de amanhã.')} className="p-3 hover:bg-gold/5 rounded-full transition-all text-gold/40 hover:text-gold"><RotateCcw size={16}/></button>
         </div>
      </div>
    </div>
  );
};
