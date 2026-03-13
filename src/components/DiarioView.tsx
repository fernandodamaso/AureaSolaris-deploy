import { useState } from 'react';
import { 
  Save, Bold, Italic, Type, AlignLeft, List, ChevronLeft
} from 'lucide-react';
import { useAgendaContext } from '../context/AgendaContext';

export const DiarioView = () => {
  const { addDocument } = useAgendaContext() as any;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      addDocument({
        id: Date.now().toString(),
        title,
        type: 'diary',
        date: new Date().toLocaleDateString('pt-BR'),
        size: `${Math.ceil(content.length / 1024)} KB`,
        content
      });
      // Simulate save delay
      await new Promise(r => setTimeout(r, 600));
      alert('Sua crônica foi consolidada no Alfred Hub.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FCF9F1] animate-in fade-in slide-in-from-bottom-4">
      {/* Editor Header */}
      <header className="px-12 py-8 flex justify-between items-center border-b border-gold/10 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-gold/40 hover:text-gold transition-colors cursor-pointer group">
             <ChevronLeft size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Retornar</span>
          </div>
          <div className="w-px h-6 bg-gold/10 mx-2" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-800">Câmara de Escrita</h2>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1.5 shadow-sm">
             <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-all"><Bold size={16}/></button>
             <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-all"><Italic size={16}/></button>
             <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-all"><Type size={16}/></button>
             <div className="w-px h-5 bg-gray-100 mx-2" />
             <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-all"><AlignLeft size={16}/></button>
             <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gold transition-all"><List size={16}/></button>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-[#333333] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gold transition-all flex items-center gap-3 shadow-lg disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? 'Consolidando...' : 'Publicar Crônica'}
          </button>
        </div>
      </header>

      {/* Surface Editor */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-12 lg:p-24 bg-white/30">
        <div className="max-w-3xl mx-auto w-full">
          <input 
            type="text" 
            placeholder="Título da sua Crônica..." 
            className="w-full text-5xl font-black text-gray-800 border-none outline-none mb-12 placeholder:text-gray-100 tracking-tighter leading-tight uppercase italic bg-transparent"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          
          <div className="flex items-center gap-5 mb-16 border-b border-gold/5 pb-8">
            <div className="w-12 h-12 rounded-full bg-gold text-white flex items-center justify-center font-black text-xs shadow-lg">VS</div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-800">Viviane Solaris</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Escriba de Aurea • {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <textarea 
            placeholder="Deixe sua alma fluir nas palavras..."
            className="w-full text-[20px] font-medium leading-[2.4] text-gray-600 border-none outline-none resize-none placeholder:text-gray-100 min-h-[800px] font-serif bg-transparent"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>
      </div>
      
      {/* Footer Info */}
      <footer className="px-12 py-4 border-t border-gold/5 bg-white/20 text-[9px] font-black uppercase tracking-[0.3em] text-gray-300 text-center">
        As palavras são sementes no solo da memória.
      </footer>
    </div>
  );
};
