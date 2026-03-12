import React, { useState, useEffect } from 'react';
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
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-[#B8860B]/10 shadow-lg">
      <div className="p-5 bg-[#FCF9F1] flex justify-between items-center border-b border-[#B8860B]/10">
        <span className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
          <MessageSquare size={14} className="text-[#B8860B]" /> {agent}
        </span>
        <Plus size={14} className="cursor-pointer text-gray-400 hover:text-[#B8860B] transition-all" onClick={async () => { if(confirm('Arquivar conversa ativa?')) { await safeInvoke('archive_chat', { agent }); setMessages([{ role: 'assistant', content: "Novo ciclo iniciado." }]); } }} />
      </div>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto no-scrollbar bg-white font-sans">
        {messages.map((m, i) => (
          <div key={i} className={`p-4 rounded-2xl text-[13px] max-w-[90%] shadow-sm ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border border-[#B8860B]/20 rounded-tr-none text-gray-800 font-medium' : 'bg-gray-50 mr-auto border border-gray-100 rounded-tl-none text-gray-600'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-[10px] opacity-40 animate-pulse text-center">Processando...</div>}
      </div>
      <div className="p-4 bg-[#FCF9F1] border-t border-gray-100 flex gap-2">
        <input className="flex-1 bg-white rounded-xl px-4 py-2 text-[12px] outline-none border border-gray-200" placeholder="Mensagem..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} className="p-2.5 bg-[#333333] text-white rounded-xl hover:bg-[#B8860B] transition-all"><Send size={14}/></button>
      </div>
    </div>
  );
};
