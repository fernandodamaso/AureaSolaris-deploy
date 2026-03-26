import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Send, ChevronDown, Clock, Trash2, List } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { useAstrologyData } from '../hooks/useAstrologyData';
import { useAgendaContext } from '../context/AgendaContext';
import { useFinancas } from '../context/FinancasContext';

interface ChatSession {
  chatId: string;
  agent: string;
  date: string;
  messageCount: number;
  preview: string;
}

export const AgentChat = ({ agent }: { agent: string }) => {
   const [messages, setMessages] = useState<any[]>([]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   
   // Session management
   const [chatId, setChatId] = useState<string>('');
   const [sessions, setSessions] = useState<ChatSession[]>([]);
   const [showSessions, setShowSessions] = useState(false);
   
   // Scroll management
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const messagesContainerRef = useRef<HTMLDivElement>(null);
   const [showScrollBtn, setShowScrollBtn] = useState(false);
   
   // Hooks para dados contextuais
   const { liveData, transits, getPlanetaryHour } = useAstrologyData();
   const { tasks, profiles, activeProfileId } = useAgendaContext();
   const { stats: financeStats, goals } = useFinancas();

   // Generate a new chat ID
   const generateChatId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

   // Scroll to bottom
   const scrollToBottom = useCallback(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, []);

   // Check if user has scrolled up
   const handleScroll = () => {
     const container = messagesContainerRef.current;
     if (!container) return;
     const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
     setShowScrollBtn(!isAtBottom);
   };

   // Auto-scroll on new messages
   useEffect(() => {
     if (!showScrollBtn) scrollToBottom();
   }, [messages, loading, scrollToBottom, showScrollBtn]);

    // Load sessions list
    const loadSessions = async () => {
      console.log('[AgentChat] Loading sessions for:', agent);
      const result = await safeInvoke<ChatSession[]>('list_chat_sessions', { agent });
      console.log('[AgentChat] Sessions loaded:', result?.length || 0);
      if (result) setSessions(result);
    };

   // Load a specific session
   const loadSession = async (sessionId: string) => {
     const history = await safeInvoke<any[]>('load_history', { agent, chat_id: sessionId });
     setChatId(sessionId);
     setMessages(history || []);
     setShowSessions(false);
   };

   // Create new chat session
   const newChat = () => {
     const newId = generateChatId();
     setChatId(newId);
     setMessages([]);
     setShowSessions(false);
   };

   // Delete a session
    const deleteSession = async (sessionId: string, e: React.MouseEvent<HTMLButtonElement>) => {
     e.stopPropagation();
     await safeInvoke('delete_chat_session', { agent, chat_id: sessionId });
     if (sessionId === chatId) newChat();
     loadSessions();
   };

    // Load initial session or latest
    useEffect(() => {
      const init = async () => {
        await loadSessions();
        // Try to load the default session (no chatId = legacy)
        const history = await safeInvoke<any[]>('load_history', { agent, chat_id: chatId || null });
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          newChat();
        }
      };
      init();
    }, [agent]);

    // Save history on change
    useEffect(() => {
      if (messages.length > 0) {
        safeInvoke('save_history', { agent, history: messages, chat_id: chatId || null }).catch(console.error);
        console.log('[AgentChat] Saved history for:', agent, 'chatId:', chatId || null, 'messages:', messages.length);
      }
    }, [messages, agent, chatId]);

   // Refresh sessions list when opening dropdown
   useEffect(() => {
     if (showSessions) loadSessions();
   }, [showSessions]);

    // Build context for ALL agents (not just Rafiki)
    const buildAgentContext = () => {
      const planetaryHour = getPlanetaryHour();
      const activeProfile = profiles.find(p => p.id === activeProfileId);
      const pendingTasks = tasks.filter((t: any) => !t.completed && !t.is_completed);
      const completedTasks = tasks.filter((t: any) => t.completed || t.is_completed);
      
      const formatDegree = (deg: number) => {
        const d = Math.floor(deg);
        const m = Math.floor((deg - d) * 60);
        return `${d}°${m}'`;
      };
      
      const planets = liveData?.planets || {};
      const actualAspects = liveData?.aspects || [];
      
      const retrogradePlanets = Object.entries(planets)
        .filter(([_, v]: any) => v?.retrograde)
        .map(([k]) => k);
      
      const planetPositions = Object.entries(planets)
        .map(([k, v]: any) => {
          const sign = v?.sign || 'Unknown';
          const pos = v?.pos_in_sign || 0;
          const retro = v?.retrograde ? ' (R)' : '';
          return `${k}: ${formatDegree(pos)} ${sign}${retro}`;
        })
        .join('\n') || 'Sintonizando esferas...';
      
      const skyAspects = actualAspects.map(a => `${a.p1} ${a.symbol} ${a.p2} (${a.type}) orb ${a.orb.toFixed(1)}°`).join('\n') || 'Nenhum aspecto maior no céu';
      const transitAspects = transits.map(t => `${t.p} ${t.icon} ${t.n} (${t.type})`).join('\n') || 'Nenhum aspecto pessoal ativo';
      
      const taskSummary = pendingTasks.length > 0 
        ? `Pendentes: ${pendingTasks.length} | Completas: ${completedTasks.length}\nPrimeiras pendentes: ${pendingTasks.slice(0, 3).map((t: any) => t.content || t.title).join('; ')}`
        : `Nenhuma tarefa pendente. Completas: ${completedTasks.length}`;
      
      return `
═══════════════════════════════════════════════════
CONTEXTO DO SISTEMA AUREA SOLARIS
═══════════════════════════════════════════════════

--- DATA E HORA ---
Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Hora Local: ${new Date().toLocaleTimeString('pt-BR')}

--- HORA PLANETÁRIA ---
Regente atual: ${planetaryHour.icon} ${planetaryHour.name}
Momento: ${planetaryHour.time}

--- PERFIL DO USUÁRIO ---
Nome: ${activeProfile?.name || 'Desconhecido'}

--- POSIÇÕES PLANETÁRIAS NO CÉU ---
${planetPositions}

--- ASPECTOS NO CÉU (MUNDANOS) ---
${skyAspects}

--- ASPECTOS PESSOAIS (TRÂNSITOS VS NATAL) ---
${transitAspects}

--- PLANETAS RETROGRADOS ---
${retrogradePlanets.length > 0 ? retrogradePlanets.join(', ') : 'Nenhum'}

--- TAREFAS ---
${taskSummary}

--- FINANÇAS ---
Saldo: R$ ${financeStats.balance.toLocaleString('pt-BR')}
Entradas: R$ ${financeStats.incomes.toLocaleString('pt-BR')} | Saídas: R$ ${financeStats.expenses.toLocaleString('pt-BR')}
Metas ativas: ${goals.length}${goals.length > 0 ? '\nMetas: ' + goals.map(g => `${g.name} (${g.current}/${g.target})`).join(', ') : ''}

═══════════════════════════════════════════════════
`;
    };

    const buildSystemPrompt = () => {
      const context = buildAgentContext();
      const basePrompt = `Responda de forma extremamente concisa, direta e útil. Sem introduções vazias. Você tem acesso ao contexto completo do sistema abaixo.`;
      
      if (agent === 'Rafiki') {
        return `${basePrompt} Você é Rafiki, o tradutor poético e cirúrgico do motor astrológico. Use o contexto técnico para dar orientações práticas baseadas nas estrelas. Seja místico porém pragmático. Pode sugerir criação de tarefas e ações baseadas no momento astrológico.

${context}`;
      }
      
      if (agent === 'Alfred') {
        return `${basePrompt} Você é Alfred, o mordomo impecável. Foco em produtividade, organização e execução impecável. Use os dados de tarefas e horário planetário para sugerir ações prioritárias.

${context}`;
      }

      if (agent === 'Uncle Duck') {
        return `${basePrompt} Você é Uncle Duck. Consultor financeiro pragmático e focado em lucros e economia de ouro. Analise dados financeiros e sugira ações.

${context}`;
      }

      if (agent === 'Stark') {
        return `${basePrompt} Você é Stark. Monitor técnico do sistema. Sarcástico, focado em estabilidade, logs e performance. Monitora a saúde do sistema.

${context}`;
      }

      if (agent === 'Dr. Strange') {
        return `${basePrompt} Você é Dr. Strange. Supervisor macro que conecta os astros ao estado global do sistema. Você vê TUDO: astrologia, tarefas, finanças, saúde, horários. Conecte padrões entre os dados e dê visão estratégica.

${context}`;
      }

      return `${basePrompt}\n\n${context}`;
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        
        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setError(null);
        setShowScrollBtn(false);
        
        try {
            const systemMsg = { role: 'system', content: buildSystemPrompt() };
            const aiMode = localStorage.getItem('ai_master_switch') || 'ollama';
            
            let response: string | null = null;
            if (aiMode === 'ollama') {
                 response = await safeInvoke<string>('ollama_chat', { 
                     messages: [systemMsg, ...newMessages.slice(-8)]
                 });
            } else {
                 const savedConfig = localStorage.getItem(`agent_config_${agent}`);
                 const config = savedConfig ? JSON.parse(savedConfig) : {};
                 const model = config.model || 'openai/gpt-4o-mini';
                 
                 response = await safeInvoke<string>('openrouter_chat', { 
                     model: model,
                     messages: [systemMsg, ...newMessages.slice(-8)]
                 });
            }
            
            if (response) {
                setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            }
        } catch (e: any) {
            setError(e.toString());
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden animate-in slide-in-from-right duration-500 chat-panel">
            {/* Símbolos cósmicos decorativos */}
            <div className="text-center text-[9px] tracking-[6px] text-gold/30 py-1 select-none shrink-0">✦ ✧ ✦</div>
            
            {/* Header with session management */}
            <div className="p-3 border-b border-gold/10 bg-gradient-to-r from-white to-[#FCF9F1] shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                            <MessageSquare size={13} />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold">{agent}</h3>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider">Sintonizado</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={newChat} title="Novo Chat" className="p-2 text-gray-400 hover:text-gold hover:bg-gold/5 rounded-lg transition-all">
                            <Plus size={14} />
                        </button>
                        <button onClick={() => setShowSessions(!showSessions)} title="Histórico de Chats" className="p-2 text-gray-400 hover:text-gold hover:bg-gold/5 rounded-lg transition-all relative">
                            <List size={14} />
                            {sessions.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gold text-white text-[7px] font-black rounded-full flex items-center justify-center">{sessions.length}</span>}
                        </button>
                    </div>
                </div>
                
                {/* Sessions dropdown */}
                {showSessions && (
                    <div className="mt-2 bg-white rounded-lg border border-gray-100 shadow-lg max-h-[200px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
                        {sessions.length === 0 ? (
                            <p className="p-4 text-[10px] text-gray-400 text-center italic">Nenhuma sessão salva</p>
                        ) : (
                            sessions.map((s) => (
                                <div 
                                    key={s.chatId} 
                                    onClick={() => loadSession(s.chatId)}
                                    className={`flex items-center justify-between p-3 hover:bg-gold/5 cursor-pointer border-b border-gray-50 last:border-none transition-all ${s.chatId === chatId ? 'bg-gold/5' : ''}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-700 truncate">{s.preview}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Clock size={8} className="text-gray-300" />
                                            <span className="text-[8px] text-gray-400">{s.date}</span>
                                            <span className="text-[8px] text-gold/50">{s.messageCount} msgs</span>
                                        </div>
                                    </div>
                                    <button onClick={(e) => deleteSession(s.chatId, e)} className="p-1 text-gray-300 hover:text-red-400 transition-all ml-2">
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar relative"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-40">
                        <div className="w-10 h-10 rounded-full border border-dashed border-gold/30 mb-3 flex items-center justify-center">
                            <Plus size={18} className="text-gold/50" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold/60">Inicie a sintonia</p>
                        <p className="text-[9px] text-gray-400 mt-1">Clique em + para nova conversa</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={`${chatId}-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[88%] p-3 rounded-lg text-[11px] font-medium leading-relaxed ${
                            m.role === 'user' 
                                ? 'bg-gold/10 text-gray-700' 
                                : 'bg-[#FCF9F1] text-gray-600'
                        }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-[#FCF9F1] p-3 rounded-lg">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}
                {error && <div className="text-[10px] text-red-400 font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</div>}
                <div ref={messagesEndRef} />
                
                {/* Scroll to bottom button */}
                {showScrollBtn && (
                    <button 
                        onClick={scrollToBottom}
                        className="sticky bottom-2 left-1/2 -translate-x-1/2 p-1.5 bg-white border border-gold/20 rounded-full text-gold hover:bg-gold/10 transition-all animate-in fade-in"
                    >
                        <ChevronDown size={14} />
                    </button>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gold/10 shrink-0">
                <div className="relative flex items-center">
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={`Falar com ${agent}...`}
                        className="w-full bg-[#FCF9F1] border border-gold/10 rounded-lg py-2.5 pl-3 pr-10 text-[11px] placeholder:text-gray-400 focus:outline-none focus:border-gold/30 transition-all font-medium"
                    />
                    <button 
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="absolute right-1.5 p-1.5 text-gold hover:bg-gold/10 rounded-lg transition-all disabled:opacity-30"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
