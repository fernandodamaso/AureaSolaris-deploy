import { useState, useEffect } from 'react';
import { 
  Search, FileText, ExternalLink,
  Edit3, Package, BookOpen, MessageSquare, Clock, User, ChevronRight, Cpu, Archive
} from 'lucide-react';
import { Card } from './common/UIComponents';
import { PdfViewer } from './common/PdfViewer';
import { useAgendaContext } from '../context/AgendaContext';

export const AlfredHubView = () => {
  const { documents, safeInvoke } = useAgendaContext() as any;
  const [notes] = useState<any[]>([]);
  const [diaryEntries] = useState<any[]>([]);
  const [chatHistories, setChatHistories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'docs' | 'notes' | 'chats'>('docs');
  const [selectedPdf, setSelectedPdf] = useState<any>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAllChats = async () => {
      let combined: any[] = [];
      const agents = ['Rafiki', 'Alfred', 'Stark', 'Uncle Duck'];
      for (const agent of agents) {
        const sessions = await safeInvoke('list_chat_sessions', { agent });
        const archives = await safeInvoke('list_archived_chats', { agent });
        if (sessions) combined = [...combined, ...sessions.map((s: any) => ({ ...s, isArchived: false }))];
        if (archives) combined = [...combined, ...archives.map((a: any) => ({ ...a, isArchived: true }))];
      }
      setChatHistories(combined);
    };

    fetchAllChats();
  }, []);

  const loadFullChat = async (item: any) => {
    setActiveItem(item);
    if (activeTab === 'chats') {
       const fullHistory = await safeInvoke('load_archived_chat', { filename: item.name });
       if (fullHistory) {
         setActiveItem({ ...item, messages: fullHistory, title: `Sessão ${item.date}` });
       }
    }
  };

  const restoreChat = async (item: any) => {
    await safeInvoke('restore_chat', { agent: item.agent, filename: item.name });
    // Atualiza o hash para refletir a navegação (sem reload da página)
    window.location.hash = `#/${item.agent.toLowerCase().replace(' ', '-')}`;
    // Recarrega a lista de chats após um pequeno delay
    setChatHistories(prev => prev.map(c => 
      c.name === item.name ? { ...c, isArchived: false } : c
    ));
  };

  const filteredItems = () => {
    if (activeTab === 'docs') return documents.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === 'notes') return [...notes, ...diaryEntries].filter((n: any) => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === 'chats') return chatHistories.filter((c: any) => c.agent.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return [];
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in max-w-6xl mx-auto px-4 font-sans text-gray-800">
      
      {/* 1. HEADER LOGÍSTICA */}
      <div className="flex justify-between items-center bg-white/40 p-6 rounded-lg border border-gold/10 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center text-gold shadow-sm">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Alfred Central Hub</h2>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Logística & Registros</h3>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <nav className="flex bg-white/50 p-1 rounded-xl border border-gray-100">
             <button onClick={() => { setActiveTab('docs'); setActiveItem(null); }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'docs' ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-gray-600'}`}>Docs</button>
             <button onClick={() => { setActiveTab('notes'); setActiveItem(null); }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'notes' ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-gray-600'}`}>Notas</button>
             <button onClick={() => { setActiveTab('chats'); setActiveItem(null); }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'chats' ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-gray-600'}`}>Conversas</button>
          </nav>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-gold/30 transition-all w-48 shadow-inner"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: LISTAGEM */}
        <Card title={activeTab === 'docs' ? 'Documentos' : activeTab === 'notes' ? 'Histórico de Notas' : 'Diálogos Salvos'} icon={activeTab === 'docs' ? <FileText size={14}/> : activeTab === 'notes' ? <Edit3 size={14}/> : <MessageSquare size={14}/>}>
          <div className="space-y-3 mt-4 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
            {activeTab === 'docs' ? (
              <>
                {documents.map((pdf: any) => (
                  <div key={pdf.id} className="p-4 bg-white border border-gray-50 rounded-xl flex justify-between items-center group hover:border-gold/20 transition-all shadow-xs cursor-pointer" onClick={() => setSelectedPdf(pdf)}>
                    <div className="flex gap-4 items-center">
                      <div className="p-2 bg-red-50 rounded-lg text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all"><FileText size={14}/></div>
                      <div>
                        <p className="text-[12px] font-black text-gray-800 leading-none mb-1">{pdf.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{pdf.size || 'N/A'}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-gray-200 group-hover:text-gold transition-all" />
                  </div>
                ))}
                <div className="p-8 text-center opacity-20 border border-dashed border-gray-100 rounded-xl mt-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Imports via Gestão de Ouro</p>
                </div>
              </>
            ) : (
              <>
                {filteredItems().map((item: any) => (
                  <div key={item.id || item.name} onClick={() => loadFullChat(item)} className={`p-4 rounded-xl border transition-all cursor-pointer group shadow-sm ${activeItem?.id === item.id ? 'bg-gold/5 border-gold/20' : 'bg-white border-gray-50 hover:border-gold/10'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[11px] font-black text-gray-800 uppercase tracking-wider line-clamp-1">{activeTab === 'chats' ? `Chat com ${item.agent}` : item.title}</h5>
                        {item.isArchived && <span className="text-[7px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase">Arquivado</span>}
                      </div>
                      <span className="text-[8px] font-black text-gold/40 uppercase tracking-widest">{item.date}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium line-clamp-1 italic">{item.lastMsg || item.preview || item.content}</p>
                    {item.messageCount > 0 && <span className="text-[8px] text-gold/30 font-bold mt-1 block">{item.messageCount} mensagens</span>}
                  </div>
                ))}
                {filteredItems().length === 0 && (
                   <p className="text-center py-10 text-gray-300 text-[10px] font-black uppercase tracking-widest opacity-40">Nenhum registro encontrado...</p>
                )}
              </>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {!activeItem && activeTab !== 'docs' ? (
            <div className="bg-white rounded-2xl border border-gold/10 shadow-xl overflow-hidden min-h-[600px] flex flex-col items-center justify-center text-center p-12 text-gray-300">
               <BookOpen size={64} className="mb-6 opacity-10" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selecione um item para visualizar o histórico</p>
            </div>
          ) : activeTab === 'docs' ? (
            <div className="bg-white rounded-2xl border border-gold/10 shadow-xl overflow-hidden min-h-[600px] flex flex-col items-center justify-center text-center p-12 text-gray-300">
               <FileText size={64} className="mb-6 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selecione um documento para visualizar</p>
            </div>
          ) : activeTab === 'notes' ? (
            <div className="bg-white rounded-[3rem] border border-gold/10 shadow-xl overflow-hidden min-h-[600px] flex flex-col animate-in fade-in zoom-in-95">
              <div className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <BookOpen size={14} className="text-gold" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-800">Modo de Leitura (Consolidado)</h4>
                </div>
                <div className="text-[9px] font-black text-gold/40 border-l border-gold/10 pl-4 tracking-widest">REGISTRO #{activeItem?.id}</div>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar p-16 lg:p-24 bg-white">
                <div className="max-w-xl mx-auto w-full">
                  <h2 className="text-3xl font-black text-gray-800 mb-8 tracking-tight uppercase italic border-b border-gold/5 pb-6">{activeItem?.title}</h2>
                  <div className="flex items-center gap-4 mb-12">
                     <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-black text-[9px]">VS</div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Publicado em {activeItem?.date}</p>
                  </div>
                  <div className="text-[16px] font-medium leading-[2.2] text-gray-600 font-serif whitespace-pre-wrap">
                    {activeItem?.content}
                  </div>
                </div>
              </div>

               <div className="px-10 py-6 border-t border-gray-50 bg-gray-50/50 flex justify-center">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] italic">As crônicas são imutáveis na memória solar.</p>
               </div>
            </div>
          ) : (
             <div className="bg-[#FCF9F1] rounded-[3rem] border border-gold/10 shadow-xl overflow-hidden min-h-[600px] flex flex-col animate-in fade-in">
                <div className="px-10 py-8 border-b border-gold/5 flex justify-between items-center bg-white/80 backdrop-blur-md">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold shadow-sm"><MessageSquare size={18}/></div>
                      <div>
                         <p className="text-[12px] font-black text-gray-800 uppercase tracking-tight">Sessão: {activeItem?.agent}</p>
                         <p className="text-[9px] text-gold/60 font-medium uppercase tracking-[0.2em]">{activeItem?.title}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white px-4 py-2 rounded-full border border-gray-50">
                      <Clock size={12}/> {activeItem?.date}
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-6">
                   {activeItem?.messages.map((m: any, i: number) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] p-6 rounded-lg text-[13px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-white border border-gold/10 text-gray-800 rounded-tr-none' : 'bg-gold/10 border border-gold/5 text-gray-700 rounded-tl-none'}`}>
                            <div className="flex items-center gap-2 mb-2 opacity-30">
                               {m.role === 'user' ? <User size={10}/> : <Cpu size={10}/>}
                               <span className="text-[8px] font-black uppercase tracking-widest">{m.role === 'user' ? 'Viviane' : activeItem?.agent}</span>
                            </div>
                            <p className="font-medium">{m.content}</p>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="p-8 bg-white/50 border-t border-gold/5 flex justify-center gap-4">
                   {!activeItem?.isArchived ? (
                     <>
                       <button 
                         onClick={async () => {
                           await safeInvoke('archive_chat', { agent: activeItem.agent });
                           setActiveItem(null);
                         }}
                         className="flex items-center gap-3 px-6 py-3 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                       >
                           <Archive size={12}/> Arquivar
                       </button>
                       <button 
                         onClick={() => restoreChat(activeItem)}
                         className="flex items-center gap-3 px-8 py-3 bg-[#333333] text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-gold transition-all shadow-md group"
                       >
                           Continuar esta Conversa <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </>
                   ) : (
                     <button 
                       onClick={() => restoreChat(activeItem)}
                       className="flex items-center gap-3 px-8 py-3 bg-[#333333] text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-gold transition-all shadow-md group"
                     >
                         Restaurar & Continuar <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                   )}
                 </div>
             </div>
          )}
        </div>
      </div>

      {/* PDF VIEWER POPUP */}
      {selectedPdf && (
        <PdfViewer 
          url={selectedPdf.path === '#' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : selectedPdf.path} 
          name={selectedPdf.name} 
          onClose={() => setSelectedPdf(null)} 
        />
      )}
    </div>
  );
};
