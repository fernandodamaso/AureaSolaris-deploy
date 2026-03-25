import { useState } from 'react';
import { X, FileText, Star, Calendar, ListTodo, BookOpen, MessageSquare, ChevronRight } from 'lucide-react';

interface AssetItem {
  id: string;
  type: 'note' | 'astro' | 'calendar' | 'task' | 'lesson' | 'chat';
  title: string;
  preview: string;
  data: any;
}

interface AssetPickerProps {
  onClose: () => void;
  onImport: (item: AssetItem) => void;
}

export const AssetPicker = ({ onClose, onImport }: AssetPickerProps) => {
  const [activeTab, setActiveTab] = useState<string>('notes');
  
  // Gather assets from localStorage (mock data from other parts of the app)
  const getAssets = (type: string): AssetItem[] => {
    switch (type) {
      case 'notes': {
        const docs = JSON.parse(localStorage.getItem('aurea_documents') || '[]');
        return docs.map((d: any) => ({
          id: d.id,
          type: 'note' as const,
          title: d.name || d.title || 'Nota',
          preview: d.content?.substring(0, 80) || d.size || 'Documento',
          data: d,
        }));
      }
      case 'astro': {
        // Load from mock or real astro data
        const astroItems: AssetItem[] = [
          { id: 'astro_current', type: 'astro', title: 'Mapa Atual (Céu)', preview: 'Posições planetárias em tempo real', data: { source: 'astro_engine' } },
          { id: 'astro_natal', type: 'astro', title: 'Meu Mapa Natal', preview: 'Sol em Sagitário 29° • Lua em Libra 16° • ASC Aquário 21°', data: { source: 'natal' } },
        ];
        return astroItems;
      }
      case 'calendar': {
        return [
          { id: 'cal_1', type: 'calendar' as const, title: 'Sessão UDV', preview: 'Hoje às 20:00', data: { type: 'event', time: '20:00' } },
          { id: 'cal_2', type: 'calendar' as const, title: 'Almoço em Família', preview: 'Hoje às 12:00', data: { type: 'event', time: '12:00' } },
          { id: 'cal_3', type: 'calendar' as const, title: 'Consulta Astrológica', preview: 'Amanhã às 14:00', data: { type: 'event', time: '14:00' } },
        ];
      }
      case 'tasks': {
        return [
          { id: 'task_1', type: 'task' as const, title: 'Estudar trânsitos de Netuno', preview: 'Pendente', data: { completed: false } },
          { id: 'task_2', type: 'task' as const, title: 'Revisão mensal de finanças', preview: 'Pendente', data: { completed: false } },
          { id: 'task_3', type: 'task' as const, title: 'Sessão UDV às 20h', preview: 'Pendente', data: { completed: false } },
        ];
      }
      case 'lessons': {
        const lessons = JSON.parse(localStorage.getItem('aurea_rafiki_lessons') || '[]');
        return lessons.map((l: any) => ({
          id: l.id,
          type: 'lesson' as const,
          title: l.title,
          preview: l.content?.substring(0, 80) || 'Lição de astrologia',
          data: l,
        }));
      }
      case 'chats': {
        // Gather from mock chat sessions
        const chatItems: AssetItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('aurea_mock_') && !key.includes('legacy') && !key.includes('board')) {
            const agent = key.replace('aurea_mock_', '').split('_')[0];
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (data.length > 0) {
              chatItems.push({
                id: key,
                type: 'chat' as const,
                title: `Chat com ${agent}`,
                preview: data[data.length - 1]?.content?.substring(0, 60) || 'Conversa',
                data: { agent, messages: data },
              });
            }
          }
        }
        return chatItems;
      }
      default:
        return [];
    }
  };

  const tabs = [
    { id: 'notes', label: 'Notas', icon: <FileText size={12} /> },
    { id: 'astro', label: 'Astro', icon: <Star size={12} /> },
    { id: 'calendar', label: 'Calendário', icon: <Calendar size={12} /> },
    { id: 'tasks', label: 'Tarefas', icon: <ListTodo size={12} /> },
    { id: 'lessons', label: 'Lições', icon: <BookOpen size={12} /> },
    { id: 'chats', label: 'Chats', icon: <MessageSquare size={12} /> },
  ];

  const assets = getAssets(activeTab);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gold/20 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gold">Importar para a Mesa</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Selecione um item para adicionar como card na mesa</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-300 hover:text-red-400 rounded-xl transition-all"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 bg-gray-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-gold shadow-sm border border-gold/10' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Asset list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {assets.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item encontrado</p>
              <p className="text-[9px] mt-2 text-gray-400">Crie conteúdo em outras seções do app primeiro</p>
            </div>
          ) : (
            assets.map(item => (
              <button key={item.id} onClick={() => onImport(item)}
                className="w-full flex items-center gap-4 p-4 bg-white border border-gray-50 rounded-xl text-left hover:border-gold/20 hover:shadow-sm transition-all group">
                <div className={`p-2.5 rounded-lg ${
                  item.type === 'note' ? 'bg-blue-50 text-blue-400' :
                  item.type === 'astro' ? 'bg-amber-50 text-amber-500' :
                  item.type === 'calendar' ? 'bg-green-50 text-green-500' :
                  item.type === 'task' ? 'bg-purple-50 text-purple-500' :
                  item.type === 'lesson' ? 'bg-rose-50 text-rose-400' :
                  'bg-gray-50 text-gray-400'
                }`}>
                  {tabs.find(t => t.id === activeTab)?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-gray-800 truncate">{item.title}</p>
                  <p className="text-[9px] text-gray-400 font-medium truncate">{item.preview}</p>
                </div>
                <ChevronRight size={14} className="text-gray-200 group-hover:text-gold transition-all" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
