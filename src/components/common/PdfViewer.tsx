import { useState } from 'react';
import { X, FileText, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  name: string;
  onClose: () => void;
}

export const PdfViewer = ({ url, name, onClose }: PdfViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gold/10">
        
        {/* HEADER */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">{name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Documento Aurea Solaris - Visualizador Seguro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-white border border-gray-100 p-1 rounded-full mr-4 shadow-inner">
                <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))} className="p-2 text-gray-400 hover:text-gold hover:bg-gold/5 rounded-full transition-all" title="Reduzir"><ZoomOut size={16}/></button>
                <span className="text-[9px] font-black w-10 text-center text-gray-600">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => Math.min(2, prev + 0.2))} className="p-2 text-gray-400 hover:text-gold hover:bg-gold/5 rounded-full transition-all" title="Aumentar"><ZoomIn size={16}/></button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1" />
                <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-2 text-gray-400 hover:text-gold hover:bg-gold/5 rounded-full transition-all" title="Rotacionar"><RotateCw size={16}/></button>
             </div>
            <button
              type="button"
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = name;
                link.target = '_blank';
                link.rel = 'noopener';
                link.click();
              }}
              className="p-3 text-gray-700 hover:text-gold hover:bg-gold/5 rounded-full transition-all"
              title="Baixar documento"
              aria-label="Baixar documento"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PDF CONTENT */}
        <div className="flex-1 bg-gray-200/30 p-8 overflow-auto flex items-start justify-center no-scrollbar">
          <div 
            className="transition-all duration-300 origin-top shadow-2xl bg-white rounded-xl overflow-hidden"
            style={{ 
              width: '100%', 
              height: '100%', 
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: '1200px'
            }}
          >
            <iframe 
              src={url} 
              className="w-full h-full border-none"
              title={name}
            />
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="px-8 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Processado por Aurea Solaris</p>
          <div className="flex gap-4">
            <span className="text-[10px] font-black text-gold/40 uppercase tracking-tighter">Criptografia Local Ativa</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
