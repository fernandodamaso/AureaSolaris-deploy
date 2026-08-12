import { useState, useEffect } from 'react';
import { X, FileText, Star, Calendar, ListTodo, BookOpen, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { safeInvoke } from '../../utils/tauri';
import { listDiaryEntries } from '../../utils/diary';
import type { DiaryEntryResponse } from '../../types/diario';

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
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'notes', label: 'Notas', icon: <FileText size={12} /> },
    { id: 'astro', label: 'Astro', icon: <Star size={12} /> },
    { id: 'calendar', label: 'Calendário', icon: <Calendar size={12} /> },
    { id: 'tasks', label: 'Tarefas', icon: <ListTodo size={12} /> },
    { id: 'lessons', label: 'Lições', icon: <BookOpen size={12} /> },
    { id: 'chats', label: 'Chats', icon: <MessageSquare size={12} /> },
  ];

  useEffect(() => {
    setLoading(true);
    setItems([]);

    const loadData = async () => {
      try {
        if (activeTab === 'notes') {
          // 1. List notes from diary (without folder filter to return all)
          const res = await listDiaryEntries();
          let mapped: AssetItem[] = [];
          if (res && res.length > 0) {
            mapped = res.map((e: DiaryEntryResponse) => ({
              id: e.id,
              type: 'note',
              title: e.title || 'Sem Título',
              preview: e.content ? e.content.substring(0, 100) + '...' : 'Sem conteúdo',
              data: e
            }));
          } else {
            // Fallback to Obsidian
            const obsRes = await safeInvoke<any[]>('obsidian_diary_list_entries');
            if (obsRes) {
              mapped = obsRes.map(e => ({
                id: e.id || e.title,
                type: 'note',
                title: e.title || 'Sem Título',
                preview: e.content ? e.content.substring(0, 100) + '...' : 'Sem conteúdo',
                data: e
              }));
            }
          }
          setItems(mapped);

        } else if (activeTab === 'astro') {
          // 2. List Profiles and family connections for Astrological Maps
          const profilesRaw = localStorage.getItem('aurea_profiles');
          const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];
          const mapped: AssetItem[] = [];

          profiles.forEach((p: any) => {
            mapped.push({
              id: `astro-profile-${p.id}`,
              type: 'astro',
              title: `Mapa Natal de ${p.name}`,
              preview: `Nascimento: ${p.natal?.birthDate || p.birthDate || 'Não informado'} às ${p.natal?.birthTime || p.birthTime || '?'}. Lat: ${p.natal?.lat || '-'}, Lon: ${p.natal?.lon || '-'}`,
              data: p
            });

            if (p.connections && Array.isArray(p.connections)) {
              p.connections.forEach((conn: any, idx: number) => {
                mapped.push({
                  id: `astro-conn-${p.id}-${idx}`,
                  type: 'astro',
                  title: `Mapa de ${conn.name} (${p.name})`,
                  preview: `Nascimento: ${conn.birthData?.date || conn.birthDate || 'Não informado'} às ${conn.birthData?.time || conn.birthTime || '?'}.`,
                  data: conn
                });
              });
            }
          });

          setItems(mapped);

        } else if (activeTab === 'calendar') {
          // 3. List browser-local agenda events. External calendar sync is not enabled.
          const eventsRaw = localStorage.getItem('aurea_events');
          const events = eventsRaw ? JSON.parse(eventsRaw) : [];
          const mapped: AssetItem[] = (Array.isArray(events) ? events : []).map((event: any) => ({
            id: event.id || `cal-${Date.now()}-${Math.random()}`,
            type: 'calendar',
            title: event.title || 'Compromisso',
            preview: event.start ? new Date(event.start).toLocaleString('pt-BR') : 'Sem data',
            data: event,
          }));
          setItems(mapped);

        } else if (activeTab === 'tasks') {
          // 4. List local tasks
          const tasksRaw = localStorage.getItem('aurea_tasks');
          const tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
          const mapped: AssetItem[] = (Array.isArray(tasks) ? tasks : []).map((t: any) => ({
            id: t.id || `task-${Date.now()}`,
            type: 'task',
            title: t.content || 'Tarefa sem título',
            preview: t.is_completed || t.completed ? '✓ Concluída' : '⏳ Pendente',
            data: t
          }));
          setItems(mapped);
        } else if (activeTab === 'lessons') {
          // 5. List Hermetic lessons
          const lessonsRaw = localStorage.getItem('aurea_Hermes_lessons');
          const lessons = lessonsRaw ? JSON.parse(lessonsRaw) : [];
          const mapped: AssetItem[] = lessons.map((l: any) => ({
            id: l.id || `lesson-${Date.now()}`,
            type: 'lesson',
            title: l.title || 'Lição sem título',
            preview: `Categoria: ${l.category || 'Geral'}. ${l.content ? l.content.substring(0, 100) + '...' : ''}`,
            data: l
          }));
          setItems(mapped);

        } else if (activeTab === 'chats') {
          // 6. List Hermes Chat sessions
          const res = await safeInvoke<any[]>('list_chat_sessions', { agent: 'Hermes' });
          if (res && Array.isArray(res)) {
            const mapped: AssetItem[] = res.map((s: any) => ({
              id: s.chatId || `chat-${Date.now()}`,
              type: 'chat',
              title: `Chat Session: ${s.chatId}`,
              preview: `${s.preview || 'Sessão aberta'} (${s.date || 'Hoje'})`,
              data: s
            }));
            setItems(mapped);
          }
        }
      } catch (err) {
        console.error(`Error loading assets for tab ${activeTab}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <Loader2 size={24} className="animate-spin text-gold" />
              <p className="text-[10px] font-black uppercase tracking-widest">Carregando itens...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item encontrado</p>
              <p className="text-[9px] mt-2 text-gray-400">Crie conteúdo em outras seções do app primeiro</p>
            </div>
          ) : (
            items.map(item => (
              <button key={item.id} onClick={() => onImport(item)}
                className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl text-left hover:border-gold/20 hover:shadow-sm transition-all group">
                <div className={`p-2.5 rounded-lg ${
                  item.type === 'note' ? 'bg-blue-50 text-blue-500' :
                  item.type === 'astro' ? 'bg-amber-50 text-amber-500' :
                  item.type === 'calendar' ? 'bg-green-50 text-green-500' :
                  item.type === 'task' ? 'bg-purple-50 text-purple-500' :
                  item.type === 'lesson' ? 'bg-rose-50 text-rose-500' :
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
