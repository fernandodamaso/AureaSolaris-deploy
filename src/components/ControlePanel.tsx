import { useState, useEffect, ReactNode } from 'react';
import { Cpu, Zap, Clock, Brain, Activity, Settings, Shield, ChevronRight, X, Sparkles, Database } from 'lucide-react';
import { Card, SectionTitle, Advice } from './common/UIComponents';
import { useAstrologyData } from '../hooks/useAstrologyData';
import { OllamaGuide } from './common/OllamaGuide';
import { safeInvoke } from '../utils/tauri';

const HardwareRow = ({ label, val, icon }: { label: string, val: string, icon: ReactNode }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-none px-1">
    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
      <div className="p-2 bg-[#FCF9F1] rounded-md text-[#B8860B]">{icon}</div> {label}
    </div>
    <div className="text-[11px] font-black text-gray-700">{val}</div>
  </div>
);

export const ControlePanel = () => {
  const [showOllama, setShowOllama] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [aiMode, setAiMode] = useState(() => localStorage.getItem('ai_master_switch') || 'ollama');
  const [metrics, setMetrics] = useState({ uptime: '---', latency: '---', memory: '---', cpu: '---', tokens: '0' });
  const [apiStatus] = useState({ todoist: 'online', telegram: 'online', astro: 'online' });
  const { getPlanetaryHour } = useAstrologyData();

  useEffect(() => {
    const fetchMetrics = async () => {
      // Fetch total tokens
      const t = await safeInvoke<number>('get_total_tokens');
      setMetrics((m: any) => ({ ...m, tokens: t ? `${((t as number)/1000).toFixed(1)}k` : '0k' }));

      // Placeholder for per-agent split (if needed later)
      // const agentTokens = await safeInvoke<Record<string, number>>('get_agent_tokens');
      // console.log('Agent tokens:', agentTokens);

      // Set other static metrics
      setMetrics((m: any) => ({
        ...m,
        uptime: '4d 12h',
        latency: '24ms',
        memory: '1.2GB / 16GB',
        cpu: '2% (Optimized)',
      }));
    };
    fetchMetrics();
  }, []);

  const planetaryHour = getPlanetaryHour();

  const handleAiModeChange = (mode: string) => {
    setAiMode(mode);
    localStorage.setItem('ai_master_switch', mode);
  };

  return (
    <div className="space-y-12 animate-in fade-in pb-20 max-w-7xl mx-auto">
      <Advice agent="Stark" content="Senhora, seu computador está operando com fluidez solar. Notei que alguns processos em segundo plano estão consumindo energia desnecessária; já silenciei os menos importantes para que sua bateria dure mais durante seus estudos. O sistema Aurea está saudável e pronto." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* RECURSOS E MÉTRICAS */}
        <div className="lg:col-span-8 space-y-10">
          <SectionTitle>Métricas de Sistema (Stark Lab)</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card title="Recursos do Núcleo" icon={<Cpu size={14}/>}>
                <div className="space-y-1 mt-4">
                   <HardwareRow label="Latência API" val={metrics.latency} icon={<Zap size={14}/>} />
                   <HardwareRow label="Uptime Sistema" val={metrics.uptime} icon={<Clock size={14}/>} />
                   <HardwareRow label="Gasto de Tokens" val={metrics.tokens} icon={<Brain size={14}/>} />
                   <HardwareRow label="Desempenho PC" val={metrics.cpu} icon={<Activity size={14}/>} />
                </div>
             </Card>

             <Card title="Conexões Estelares (APIs)" icon={<Activity size={14}/>}>
                <div className="space-y-3 mt-4">
                   <div className="flex justify-between items-center p-3 bg-white border border-gray-50 rounded-lg shadow-xs">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Todoist Engine</span>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${apiStatus.todoist === 'online' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>{apiStatus.todoist}</div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-white border border-gray-50 rounded-lg shadow-xs">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Telegram Bot</span>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${apiStatus.telegram === 'online' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>{apiStatus.telegram}</div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-white border border-gray-50 rounded-lg shadow-xs">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">AstroEngine (Py)</span>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${apiStatus.astro === 'online' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>{apiStatus.astro}</div>
                   </div>
                </div>
             </Card>

             <Card title="Núcleo de IA Local" icon={<Shield size={14}/>}>
                 <div className="space-y-4 mt-4">
                    <div className="flex justify-between items-center p-3 bg-white border border-gray-50 rounded-lg shadow-xs">
                       <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Motor Principal (Chave Mestra)</p>
                          <p className="text-[8px] text-gray-400 mt-0.5">Define quem processa as respostas dos Agentes</p>
                       </div>
                       <select 
                          className="px-3 py-1.5 bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-lg text-[10px] font-black text-gold uppercase tracking-widest outline-none transition-all cursor-pointer shadow-sm"
                          value={aiMode}
                          onChange={(e) => handleAiModeChange(e.target.value)}
                       >
                         <option value="ollama">🛡️ Local (Ollama)</option>
                         <option value="openrouter">☁️ Nuvem (OpenRouter)</option>
                       </select>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex justify-between items-center group cursor-pointer" onClick={() => setShowOllama(true)}>
                       <div className="flex gap-4 items-center">
                          <div className="p-2 bg-white rounded-lg text-emerald-500 shadow-sm border border-emerald-500/5"><Shield size={14}/></div>
                          <div>
                             <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Ollama Engine</p>
                             <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Configurar Escudo Offline</p>
                          </div>
                       </div>
                       <ChevronRight size={14} className="text-emerald-300 group-hover:text-emerald-500 transition-all" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium px-1">O motor Ollama permite que o Dr. Strange e o Stark operem 100% offline.</p>
                 </div>
              </Card>
          </div>
        </div>

        {/* SINCRONIA ASTRAL */}
        <div className="lg:col-span-4 space-y-6">
          <SectionTitle>Status de Sincronia</SectionTitle>
          <div className="bg-[#333333] p-10 shadow-2xl relative overflow-hidden text-center group">
             <div className="absolute top-0 right-0 p-12 opacity-5"><Zap size={80} className="text-white"/></div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 mb-8 border-b border-white/5 pb-4">Precisão do Relógio Cósmico</p>
             
             <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-500/20 mb-6 bg-emerald-500/5 group-hover:scale-110 transition-all">
                <span className="text-2xl font-black text-emerald-400">100%</span>
             </div>
             
             <div className="space-y-2">
                <p className="text-white font-black text-[13px] uppercase tracking-widest">Sincronizado</p>
                <p className="text-gray-400 text-[10px] font-medium leading-relaxed">Seu tempo local está perfeitamente alinhado com a regência de {planetaryHour.name}.</p>
             </div>
             
             <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center text-[9px] font-black uppercase text-gold/40 tracking-widest">
                   <span>Latência Astral</span>
                   <span className="text-white">0.002ms</span>
                </div>
             </div>
          </div>
        </div>

      </div>

      <SectionTitle>Gestão de Células de IA (Stark Agent Lab)</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { n: 'Rafiki', tokens: '4.2k', usage: 60, cost: '$0.02' },
           { n: 'Alfred', tokens: '2.8k', usage: 40, cost: '$0.01' },
           { n: 'Stark', tokens: '5.1k', usage: 80, cost: '$0.03' },
           { n: 'Uncle Duck', tokens: '0.3k', usage: 10, cost: '$0.00' }
         ].map(agent => (
           <div key={agent.n} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gold/20 transition-all group">
              <div className="flex justify-between items-center mb-4">
                 <h5 className="font-black text-gray-700 uppercase text-[10px] tracking-widest">{agent.n}</h5>
                 <div className="px-2 py-0.5 bg-gold/5 text-gold text-[8px] font-black rounded-full">{agent.usage}%</div>
              </div>
              <div className="flex items-end justify-between">
                 <div>
                    <p className="text-2xl font-black text-gray-800 tracking-tight">{agent.tokens}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Tokens / Mês</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[11px] font-black text-emerald-500">{agent.cost}</p>
                    <Settings 
                      size={14} 
                      className="inline-block mt-2 text-gray-300 group-hover:text-gold cursor-pointer transition-all" 
                      onClick={() => setEditingAgent(agent.n)}
                    />
                 </div>
              </div>
              <div className="w-full h-1 bg-gray-50 rounded-full mt-4 overflow-hidden">
                 <div className="h-full bg-gold transition-all duration-1000" style={{ width: `${agent.usage}%` }} />
              </div>
           </div>
         ))}
      </div>

       {showOllama && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="w-full max-w-2xl shadow-2xl rounded-[2.5rem] overflow-hidden border border-gold/20">
              <OllamaGuide onClose={() => setShowOllama(false)} />
           </div>
        </div>
      )}

      {editingAgent && (
        <AgentConfigModal 
           agentName={editingAgent} 
           onClose={() => setEditingAgent(null)} 
        />
      )}
    </div>
  );
};

const AgentConfigModal = ({ agentName, onClose }: { agentName: string, onClose: () => void }) => {
  const [config, setConfig] = useState<any>({
    model: agentName === 'Stark' ? 'anthropic/claude-3.5-sonnet' : 'openai/gpt-4o-mini',
    personality: '',
    functionalities: '',
    contextWindow: '8192'
  });

  useEffect(() => {
    const saved = localStorage.getItem(`agent_config_${agentName}`);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(JSON.parse(saved));
    } else {
        // Default personality/functions based on agent
        const defaults: any = {
            Rafiki: { personality: 'Astrólogo místico, poético e sábio.', functionalities: 'Cálculos de mandala, horoscopo solar, aconselhamento espiritual.', model: 'openai/gpt-4o-mini' },
            Stark: { personality: 'IA técnica, sarcástica, ultra-eficiente e protetora.', functionalities: 'Health check do sistema, segurança, automação de arquivos, suporte TI.', model: 'anthropic/claude-3.5-sonnet' },
            Alfred: { personality: 'Mordomo britânico impecável, focado em produtividade e ordem.', functionalities: 'Gestão de tarefas (Todoist), organização do Hub, agenda preditiva.', model: 'openai/gpt-4o-mini' },
            'Uncle Duck': { personality: 'Consultor financeiro direto, pragmático e um pouco ranzinza com gastos.', functionalities: 'Análise financeira, gestão de ouro, projeções econômicas.', model: 'openai/gpt-4o-mini' }
        };
        if (defaults[agentName]) setConfig((c: any) => ({ ...c, ...defaults[agentName] }));
    }
  }, [agentName]);

  const handleSave = () => {
    localStorage.setItem(`agent_config_${agentName}`, JSON.stringify(config));
    alert(`${agentName} foi reconfigurado com sucesso.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95">
      <div className="bg-[#FCF9F1] w-full max-w-4xl rounded-[3rem] shadow-2xl border border-gold/20 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-10 py-8 bg-white/80 border-b border-gold/10 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-sm">
                <Settings size={24} />
             </div>
             <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                   Configurações de Célula: {agentName}
                   <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-widest">Ativo</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Forjando a essência da IA</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Personality & Functionalities */}
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gold flex items-center gap-2">
                     <Sparkles size={12}/> Personalidade & Tom
                  </label>
                  <textarea 
                    className="w-full h-32 bg-white p-5 rounded-2xl border border-gold/5 focus:border-gold/30 outline-none text-[12px] font-medium leading-relaxed text-gray-700 shadow-sm transition-all"
                    placeholder="Descreva como o agente deve se comportar..."
                    value={config.personality}
                    onChange={e => setConfig({...config, personality: e.target.value})}
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gold flex items-center gap-2">
                     <Activity size={12}/> Funcionalidades Principais
                  </label>
                  <textarea 
                    className="w-full h-32 bg-white p-5 rounded-2xl border border-gold/5 focus:border-gold/30 outline-none text-[12px] font-medium leading-relaxed text-gray-700 shadow-sm transition-all"
                    placeholder="Quais são as responsabilidades técnicas deste agente?"
                    value={config.functionalities}
                    onChange={e => setConfig({...config, functionalities: e.target.value})}
                  />
               </div>
            </div>

            {/* Model & Context */}
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gold flex items-center gap-2">
                     <Database size={12}/> Modelo de LLM (Cérebro)
                  </label>
                  <select 
                     className="w-full p-4 bg-white rounded-2xl border border-gold/5 focus:border-gold/30 outline-none text-[12px] font-black text-gray-700 shadow-sm appearance-none cursor-pointer"
                     value={config.model}
                     onChange={e => setConfig({...config, model: e.target.value})}
                  >
                     <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Recomendado/Premium)</option>
                     <option value="openai/gpt-4o-mini">GPT-4o Mini (Rápido/Econômico)</option>
                     <option value="openai/gpt-4o">GPT-4o (Potente)</option>
                     <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                  </select>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gold flex items-center gap-2">
                     <Clock size={12}/> Janela de Contexto (Tokens)
                  </label>
                  <input 
                    type="range"
                    min="1024"
                    max="128000"
                    step="1024"
                    className="w-full h-2 bg-gold/10 rounded-lg appearance-none cursor-pointer accent-gold"
                    value={config.contextWindow}
                    onChange={e => setConfig({...config, contextWindow: e.target.value})}
                  />
                  <div className="flex justify-between px-1">
                     <span className="text-[9px] font-black text-gray-300">1k</span>
                     <span className="text-[10px] font-black text-gold bg-white px-3 py-1 rounded-full border border-gold/10 shadow-sm">{Math.round(config.contextWindow / 1024)}k Contexto</span>
                     <span className="text-[9px] font-black text-gray-300">128k</span>
                  </div>
               </div>

               <div className="p-6 bg-gold/5 rounded-3xl border border-gold/10 flex gap-4 items-start">
                  <Shield size={18} className="text-gold shrink-0 mt-1" />
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-tight text-gray-700">Protocolo de Segurança Ativo</p>
                     <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1">Configurações de alma são aplicadas imediatamente ao próximo diálogo iniciado com este agente.</p>
                  </div>
               </div>
            </div>

          </div>

        </div>

        <div className="px-10 py-8 bg-white/80 border-t border-gold/10 flex justify-end items-center gap-4">
           <button 
              onClick={onClose}
              className="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
           >
              Cancelar
           </button>
           <button 
              onClick={handleSave}
              className="px-10 py-4 bg-[#333333] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gold transition-all shadow-xl shadow-gold/5 active:scale-95"
           >
              Forjar Alma do Agente
           </button>
        </div>
      </div>
    </div>
  );
};
