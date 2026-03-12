import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Image as ImageIcon, ZoomIn, ZoomOut, Star, Trash2, Clock } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

export const MesaCriacao = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragNode, setDragNode] = useState<any>(null);
  const [drawingEdge, setDrawingEdge] = useState<any>(null);

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
    if (dragNode !== null) {
      const updated = nodes.map(n => n.id === dragNode ? { ...n, x: n.x + (e.movementX / zoom), y: n.y + (e.movementY / zoom) } : n);
      setNodes(updated);
    }
    if (drawingEdge) setDrawingEdge({ ...drawingEdge, x2: (e.clientX - pan.x) / zoom, y2: (e.clientY - pan.y) / zoom });
    if (e.buttons === 1 && !dragNode && !drawingEdge) setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };

  const startEdge = (id: any, e: any) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    setDrawingEdge({ id1: id, x1: node.x + node.w / 2, y1: node.y + node.h / 2, x2: node.x + node.w / 2, y2: node.y + node.h / 2 });
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
      <div className="absolute top-10 left-10 flex flex-col gap-4 z-[70] toolbar font-sans">
        <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-gold/10 shadow-xl flex flex-col gap-1">
           <button title="Post-it" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'text', x:100, y:100, w:220, h:120, text:'', color:'#fff'}]; setNodes(nn); addHistory('Post-it adicionado'); saveBoard(nn); }} className="p-3 text-gray-500 hover:text-gold hover:bg-gray-50 rounded-lg transition-all"><Plus size={20}/></button>
           <button title="Caixa de Texto" onClick={() => { const nn = [...nodes, {id:Date.now(), type:'plain-text', x:120, y:120, w:200, h:40, text:'Novo Texto', color:'transparent'}]; setNodes(nn); addHistory('Caixa de texto criada'); saveBoard(nn); }} className="p-3 text-gray-500 hover:text-gold hover:bg-gray-50 rounded-lg transition-all"><Edit3 size={20}/></button>
           <button title="Imagem" onClick={() => { const url = prompt('URL da Imagem:'); if(url) { const nn = [...nodes, {id:Date.now(), type:'image', x:150, y:150, w:300, h:200, url, color:'#fff'}]; setNodes(nn); addHistory('Imagem anexada'); saveBoard(nn); } }} className="p-3 text-gray-500 hover:text-gold hover:bg-gray-50 rounded-lg transition-all"><ImageIcon size={20}/></button>
        </div>
        <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-gold/10 shadow-xl flex flex-col items-center">
           <button onClick={() => setZoom(z => Math.min(z+0.2, 3))} className="p-3 text-gray-500 hover:text-gold"><ZoomIn size={18}/></button>
           <span className="text-[9px] font-bold py-1 text-gray-800">{Math.round(zoom*100)}%</span>
           <button onClick={() => setZoom(z => Math.max(z-0.2, 0.4))} className="p-3 text-gray-500 hover:text-gold"><ZoomOut size={18}/></button>
        </div>
        {history.length > 0 && (
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-gold/10 shadow-xl max-h-48 overflow-y-auto w-48 no-scrollbar">
             <h5 className="text-[9px] font-bold uppercase tracking-widest text-[#B8860B] mb-3 flex items-center gap-2"><Clock size={10}/> Histórico</h5>
             <div className="space-y-2">
                {history.map(h => (
                   <div key={h.id} className="text-[9px] text-gray-400 font-medium border-l border-gold/20 pl-2 py-0.5">
                     <span className="text-gray-600 block">{h.action}</span>
                     {h.time}
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
            return <line key={edge.id} x1={n1.x + n1.w/2} y1={n1.y + n1.h/2} x2={n2.x + n2.w/2} y2={n2.y + n2.h/2} stroke="#B8860B" strokeWidth="1" opacity="0.3" />;
          })}
          {drawingEdge && <line x1={drawingEdge.x1} y1={drawingEdge.y1} x2={drawingEdge.x2} y2={drawingEdge.y2} stroke="#B8860B" strokeWidth="1" strokeDasharray="4" opacity="0.5" />}
        </svg>
        {nodes.map(node => (
          <div key={node.id} className={`canvas-node absolute shadow-lg border rounded-xl z-10 flex flex-col pointer-events-auto transition-shadow hover:shadow-xl group border-gold/5`} style={{ transform: `translate(${node.x}px, ${node.y}px)`, backgroundColor: node.color, width: node.w, height: node.h }} onPointerUp={() => finishEdge(node.id)}>
             <div className="cursor-move p-2.5 flex justify-between items-center" onPointerDown={(e) => {e.stopPropagation(); setDragNode(node.id); (e.target as HTMLElement).setPointerCapture(e.pointerId)}}>
               <Star size={8} className="text-gold opacity-30"/>
               <div className="flex gap-2">
                 <div className="w-3 h-3 bg-white border border-gray-100 rounded-full cursor-pointer hover:scale-110" onClick={() => setNodes(nodes.map(n=>n.id===node.id?{...n, color:'#fff'}:n))} />
                 <div className="w-3 h-3 bg-[#FCF9F1] border border-gold/20 rounded-full cursor-pointer hover:scale-110" onClick={() => setNodes(nodes.map(n=>n.id===node.id?{...n, color:'#FCF9F1'}:n))} />
                 <Trash2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500" onClick={() => { setNodes(nodes.filter(n=>n.id!==node.id)); setEdges(edges.filter(e=>e.from!==node.id && e.to!==node.id)); }} />
               </div>
             </div>
             {node.type === 'image' ? (
                <div className="flex-1 overflow-hidden rounded-b-xl"><img src={node.url || ''} className="w-full h-full object-cover pointer-events-none" alt="" /></div>
             ) : node.type === 'plain-text' ? (
                <textarea className="flex-1 bg-transparent p-4 pt-0 resize-none outline-none font-sans text-[14px] font-bold text-gray-800 no-scrollbar overflow-hidden" value={node.text} onChange={e => setNodes(nodes.map(n=>n.id===node.id?{...n, text:e.target.value}:n))} onPointerDown={e => e.stopPropagation()} />
             ) : (
                <textarea className="flex-1 bg-transparent p-4 pt-0 resize-none outline-none font-sans text-[12px] leading-relaxed text-gray-700 no-scrollbar font-medium" value={node.text} onChange={e => setNodes(nodes.map(n=>n.id===node.id?{...n, text:e.target.value}:n))} onPointerDown={e => e.stopPropagation()} placeholder="Ideia..." />
             )}
             <div className="hook-dot -right-1.5 top-1/2 -translate-y-1/2" onPointerDown={(e) => startEdge(node.id, e)} />
             <div className="hook-dot -left-1.5 top-1/2 -translate-y-1/2" onPointerDown={(e) => startEdge(node.id, e)} />
          </div>
        ))}
      </div>
    </div>
  );
};
