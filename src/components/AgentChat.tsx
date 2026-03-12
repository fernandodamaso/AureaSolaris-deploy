import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

export const AgentChat = ({ agent }: { agent: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const h = await safeInvoke<any[]>('load_history', { agent });
      if (h && h.length > 0) setMessages(h);
      else setMessages([{ role: 'assistant', content: `Saudações, Viviane. ${agent} pronto para atuar.` }]);
    };
    load();
  }, [agent]);

  const handleSend = async () => {
    if(!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const updated = [...messages, userMsg];
    setMessages(updated); setInput(''); setLoading(true);

    let response = '';
    try {
      if (agent === 'Uncle Duck') {
        let res = await safeInvoke<string>('ollama_chat', { prompt: input });
        if (!res) {
          res = await safeInvoke<string>('openrouter_chat', { 
            model: 'openai/gpt-4o-mini', 
            messages: [{ role: 'system', content: 'Você é Uncle Duck, consultor financeiro. O sistema local falhou, então você está operando via nuvem.' }, ...updated] 
          });
        }
        response = res || 'Sistema offline.';
      } else {
        const model = agent === 'Stark' ? 'anthropic/claude-3.5-sonnet' : 'openai/gpt-4o-mini';
        const systemPrompt = 
          agent === 'Rafiki' ? 'Você é Rafiki, um astrólogo místico e sábio. Seja poético.' :
          agent === 'Stark' ? 'Você é Dr. Stark, IA técnica e sarcástica.' :
          agent === 'Alfred' ? 'Você é Alfred, consultor de produtividade.' :
          `Você é ${agent} no sistema Aurea Solaris.`;

        const res = await safeInvoke<string>('openrouter_chat', { 
          model, 
          messages: [{ role: 'system', content: systemPrompt }, ...updated] 
        });
        response = res || 'A conexão falhou.';
      }

      if (response) {
        const final = [...updated, { role: 'assistant', content: response }];
        setMessages(final);
        await safeInvoke('save_history', { agent, history: final });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-[#B8860B]/10 shadow-md">
      <div className="p-4 bg-[#FCF9F1] flex justify-between items-center border-b border-[#B8860B]/10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-700">
          <MessageSquare size={12} className="text-[#B8860B]" /> {agent}
        </span>
        <Plus size={12} className="cursor-pointer text-gray-400 hover:text-[#B8860B] transition-all" onClick={async () => { if(confirm('Arquivar conversa ativa?')) { await safeInvoke('archive_chat', { agent }); setMessages([{ role: 'assistant', content: "Novo ciclo iniciado." }]); } }} />
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar bg-white font-sans">
        {messages.map((m, i) => (
          <div key={i} className={`p-3.5 rounded-xl text-[12px] max-w-[90%] shadow-xs transition-all ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border border-[#B8860B]/15 rounded-tr-none text-gray-800 font-bold' : 'bg-gray-50 mr-auto border border-gray-100 rounded-tl-none text-gray-600 font-medium'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-[9px] font-bold opacity-30 animate-pulse text-center uppercase tracking-widest">Processando...</div>}
      </div>
      <div className="p-3 bg-white border-t border-gray-50 flex gap-2">
        <input className="flex-1 bg-gray-50 rounded-lg px-4 py-2 text-[11px] outline-none border border-gray-100 focus:border-gold/20 transition-all font-medium" placeholder="Digite uma mensagem..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} className="p-2.5 bg-[#333333] text-white rounded-lg hover:bg-gold transition-all shadow-sm"><Send size={12}/></button>
      </div>
    </div>
  );
};
