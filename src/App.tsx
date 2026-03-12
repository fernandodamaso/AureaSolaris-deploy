import React, { useState, useEffect } from 'react';
import {
  Moon, Calendar, PieChart,
  Settings, MessageSquare, Plus, Trash2,
  User, Star, Edit3, Eye, Clock,
  Sparkles, X,
  CheckCircle, Activity,
  FileText, BookOpen, Save, Brain,
  ZoomIn, ZoomOut, Send, Heart,
  Archive, Upload, Image as ImageIcon,
  FileJson, PanelLeftClose, PanelLeftOpen,
  ListTodo, TrendingUp, Zap, Cpu,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import "./styles.css";

// --- UTILITÁRIO TAURI SEGURO ---
async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) return await invoke<T>(cmd, args);
    return null;
  } catch (err) {
    console.error(`[safeInvoke Error] ${cmd}:`, err);
    return null;
  }
}

// --- CONSTANTES ---
const PLANET_ICONS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇'
};

const AGENT_ICONS: Record<string, string> = { Rafiki: '🌟', Alfred: '📜', Stark: '🚀', 'Uncle Duck': '🦆', Strange: '👁️' };

// --- ESTILOS GLOBAIS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  .font-sans { font-family: 'Inter', sans-serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .glass-panel { background: rgba(252, 249, 241, 0.95); backdrop-filter: blur(16px); }
  .paper-bg { background-color: #FCF9F1; }
  .panel-light { background-color: #ffffff; border: 1px solid rgba(184, 134, 11, 0.08); border-radius: 12px; }
  .text-gold { color: #B8860B; }
  .bg-gold { background-color: #B8860B; }
  
  .layout-grid { display: grid; height: 100vh; width: 100vw; overflow: hidden; background: #F5F1E6; gap: 16px; padding: 16px; transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .main-area { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background: #FCF9F1; box-shadow: 0 4px 20px rgba(0,0,0,0.02); border: 1px solid rgba(184, 134, 11, 0.05); position: relative; }

  .hook-dot { position: absolute; width: 8px; height: 8px; background: #B8860B; border: 1.5px solid white; border-radius: 50%; opacity: 0; transition: 0.2s; cursor: crosshair; z-index: 40; }
  .canvas-node:hover .hook-dot { opacity: 1; }
  .hook-dot:hover { transform: scale(1.5); box-shadow: 0 0 8px rgba(184,134,11,0.3); }
`;

// --- COMPONENTES ATÔMICOS ---

const NavItem = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
  <button onClick={onClick} title={label} className={`w-full flex items-center gap-4 px-5 py-3 rounded-lg transition-all duration-300 text-[11px] font-bold uppercase tracking-widest ${active ? 'bg-[#FCF9F1] text-[#B8860B] border border-gold/10' : 'text-gray-500 hover:text-[#333333] hover:bg-gray-50'}`}>
    <span className={active ? 'text-[#B8860B]' : 'opacity-40'}>{icon}</span>
    {!collapsed && <span className="truncate">{label}</span>}
  </button>
);

const SectionTitle = ({ children, rightAction }: { children: React.ReactNode, rightAction?: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b border-[#B8860B]/10 pb-2 mb-6">
    <h4 className="font-sans text-[10px] uppercase tracking-[0.25em] text-[#B8860B] font-bold">{children}</h4>
    {rightAction}
  </div>
);

const Card = ({ title, children, icon, className = "" }: { title: string, children: React.ReactNode, icon?: React.ReactNode, className?: string }) => (
  <div className={`panel-light p-6 ${className}`}>
    <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold mb-5 opacity-40 flex items-center gap-2 text-dark">{icon}{title}</h4>
    {children}
  </div>
);

const Advice = ({ agent, content, icon }: { agent: string, content: string, icon?: React.ReactNode }) => (
  <div className="bg-white rounded-3xl p-6 border border-[#B8860B]/20 shadow-sm flex items-start gap-5 relative overflow-hidden mb-8">
    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#B8860B]" />
    <div className="p-3 bg-[#FCF9F1] rounded-xl text-[#B8860B] shrink-0">{icon || <Sparkles size={18} />}</div>
    <div className="flex-1">
      <h4 className="text-[9px] font-bold uppercase text-gray-400 mb-1 tracking-widest flex items-center gap-2">
        <Star size={10} className="text-[#B8860B]"/> Conselho do {agent}
      </h4>
      <p className="text-[13px] text-gray-700 leading-relaxed font-medium italic">"{content}"</p>
    </div>
  </div>
);


const StarRow = ({ icon, name, sign, deg }: { icon: string, name: string, sign: string, deg: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-none group hover:bg-[#FCF9F1] transition-colors rounded-lg px-2">
    <div className="flex items-center gap-4 w-1/3">
      <span className="text-xl text-[#B8860B]">{icon}</span>
      <span className="text-[13px] text-gray-800 font-semibold">{name}</span>
    </div>
    <div className="w-1/3 text-center text-[12px] text-gray-500 font-medium">{sign}</div>
    <div className="w-1/3 text-right text-[11px] text-gray-400 font-mono tracking-tighter">{deg}</div>
  </div>
);

const FileItem = ({ name, date, onClick }: { name: string, date: string, onClick?: () => void }) => (
  <div onClick={onClick} className="flex justify-between items-center py-3.5 border-b border-gray-100 last:border-none group cursor-pointer hover:bg-gray-50 rounded-xl px-3 transition-all">
    <div className="flex items-center gap-3 text-[13px] text-[#333333] font-medium">
      <div className="p-2 bg-red-50 text-red-400 rounded-lg"><FileText size={14} /></div> {name}
    </div>
    <div className="text-[9px] font-bold uppercase text-gray-400">{date}</div>
  </div>
);

const RoutineItem = ({ name, time }: { name: string, time: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-none px-2 group hover:bg-[#FCF9F1] transition-all">
    <div className="flex items-center gap-4 text-[13px] text-gray-700 font-medium">
      <div className="w-2 h-2 rounded-full bg-[#B8860B]"></div> {name}
    </div>
    <span className="text-[10px] font-bold text-[#B8860B] bg-[#FCF9F1] px-2 py-1 rounded-lg border border-gold/10">{time}</span>
  </div>
);

const AspectRow = ({ aspect, desc, bg = 'bg-[#FCF9F1]' }: { aspect: string, desc: string, bg?: string }) => (
  <div className={`flex items-center justify-between p-4 ${bg} rounded-2xl border border-white shadow-sm transition-all hover:shadow-md cursor-default`}>
    <span className="text-[12px] font-bold text-[#333333] tracking-widest uppercase">{aspect}</span>
    <span className="text-[11px] italic text-gray-500 text-right max-w-[60%]">{desc}</span>
  </div>
);

const Mandala = ({ planets = [] }: { planets?: any[] }) => (
  <div className={`relative w-full max-w-[500px] aspect-square flex items-center justify-center opacity-90 group mx-auto`}>
    <svg viewBox="0 0 100 100" className="w-full h-full transition-transform duration-[12s] group-hover:rotate-[20deg]">
      <circle cx="50" cy="50" r="48" stroke="#B8860B" strokeWidth="0.3" fill="none" opacity="0.4" />
      <circle cx="50" cy="50" r="35" stroke="#B8860B" strokeWidth="0.1" fill="none" />
      {[...Array(12)].map((_, i) => (
        <g key={i} transform={`rotate(${i * 30} 50 50)`}>
          <line x1="50" y1="2" x2="50" y2="12" stroke="#B8860B" strokeWidth="0.2" opacity="0.5" />
          <text x="50" y="8" fontSize="3.5" fill="#B8860B" textAnchor="middle" transform={`rotate(${i * -30} 50 8)`} className="font-bold opacity-60">
            {['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'][i]}
          </text>
        </g>
      ))}
      {planets.map((p, i) => {
          const angle = p.degree ? (p.degree - 90) : (i * 40 - 90);
          const r = p.isNode ? 42 : 38;
          const x = 50 + r * Math.cos(angle * Math.PI / 180);
          const y = 50 + r * Math.sin(angle * Math.PI / 180);
          return (
            <g key={i}>
               <text x={x} y={y} fontSize="4" fill="#B8860B" textAnchor="middle" fontWeight="bold">{p.icon}</text>
            </g>
          );
      })}
    </svg>
    <div className="absolute w-2 h-2 bg-[#B8860B] rounded-full animate-pulse shadow-[0_0_20px_#B8860B]" />
  </div>
);

const FamilyItem = ({ name, data }: { name: string, data: string }) => (
  <div className="p-5 panel-light text-center hover:border-gold transition-all cursor-pointer shadow-sm">
    <p className="font-sans text-[12px] font-bold text-gray-800 mb-2 uppercase tracking-widest">{name}</p>
    <p className="font-sans text-[10px] font-bold text-[#B8860B] bg-[#FCF9F1] py-1.5 rounded-lg">{data}</p>
  </div>
);

const TodoRow = ({ label, checked }: { label: string, checked: boolean }) => (
  <div className="flex items-center gap-4 p-4 panel-light hover:border-gold/30 transition-all cursor-pointer group shadow-sm">
    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${checked ? 'bg-[#B8860B] border-[#B8860B] text-white' : 'border-gray-200 text-transparent group-hover:border-[#B8860B]/50'}`}>
      <CheckCircle size={14} />
    </div>
    <span className={`text-[13px] font-medium ${checked ? 'line-through text-gray-400' : 'text-[#333333]'}`}>{label}</span>
  </div>
);

const StatBox = ({ label, val }: { label: string, val: string }) => (
  <div className="panel-light p-8 text-center shadow-sm">
    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#B8860B] mb-2">{label}</p>
    <p className="font-sans text-2xl font-bold text-gray-800">{val}</p>
  </div>
);

const AgentChat = ({ agent }: { agent: string }) => {
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

// --- PÁGINAS ---

const AstrologiaPage = () => {
  const [liveData, setLiveData] = useState<any>(null);
  const NATAL = { Sun: 269.6, Moon: 196.2, ASC: 321.8 }; // Graus aproximados

  useEffect(() => {
    const fetch = async () => {
      try {
        let res = await safeInvoke<string>('run_astro_engine');
        if (!res) {
          const path = "C:\\AureaSolaris\\astro_data.json";
          res = await safeInvoke<string>('read_text_file', { path });
        }
        if (res) {
          try {
            const parsed = JSON.parse(res);
            if (parsed && !parsed.error) setLiveData(parsed);
          } catch(e) {}
        }
      } catch(e) {}
    };
    fetch();
  }, []);

  const planets = liveData ? Object.entries(liveData).filter(([n]) => PLANET_ICONS[n]).map(([n, d]: [string, any]) => ({ icon: PLANET_ICONS[n], degree: d.degree })) : [];

  const getAspect = (d1: number, d2: number) => {
    const diff = Math.abs(d1 - d2) % 360;
    const dist = diff > 180 ? 360 - diff : diff;
    if (dist < 8) return { type: 'Conj.', desc: 'Conjunção (Foco e Intensidade)' };
    if (Math.abs(dist - 180) < 8) return { type: 'Opos.', desc: 'Oposição (Tensão e Polaridade)' };
    if (Math.abs(dist - 120) < 8) return { type: 'Trig.', desc: 'Trígono (Harmonia e Fluidez)' };
    if (Math.abs(dist - 90) < 6) return { type: 'Quad.', desc: 'Quadrado (Desafio e Atômico)' };
    if (Math.abs(dist - 60) < 4) return { type: 'Sext.', desc: 'Sextil (Oportunidade)' };
    return null;
  };

  const transits = liveData ? [
    { p: 'Sun', n: 'Sun', ...getAspect(liveData.Sun?.degree || 0, NATAL.Sun) },
    { p: 'Jupiter', n: 'Moon', ...getAspect(liveData.Jupiter?.degree || 0, NATAL.Moon) },
    { p: 'Saturn', n: 'ASC', ...getAspect(liveData.Saturn?.degree || 0, NATAL.ASC) }
  ].filter(t => t.type) : [];

  return (
    <div className="space-y-12 pb-32 animate-in fade-in">
      <Advice agent="Rafiki" content={liveData ? `O céu diz: ${liveData.Sun?.sign} iluminando seu caminho. Foco em ${liveData.Mercury?.sign} para comunicação.` : "Rafiki sintonizando as esferas..."} />
      
      <div className="panel-light p-16 text-center relative flex flex-col items-center shadow-sm">
        <SectionTitle>A Roda do Tempo (Eixo Central)</SectionTitle>
        <Mandala planets={planets} />
      </div>

      <Card title="As Estrelas Cantam (Efemérides)">
         <div className="grid grid-cols-2 gap-x-12">
            {Object.entries(PLANET_ICONS).map(([name, icon]) => (
               <StarRow key={name} icon={icon} name={name} sign={liveData?.[name]?.sign || '---'} deg={`${Math.floor(liveData?.[name]?.pos_in_sign || 0)}°`} />
            ))}
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="space-y-8">
            <SectionTitle>Trânsitos sobre Seu Mapa (Natal)</SectionTitle>
            <div className="space-y-4">
               {transits.length > 0 ? transits.map((t: any, i) => (
                 <AspectRow key={i} aspect={`${t.p} (T) ${t.type} ${t.n} (N)`} desc={t.desc || ''} bg={t.type === 'Trig.' || t.type === 'Sext.' ? 'bg-green-50/20' : t.type === 'Quad.' || t.type === 'Opos.' ? 'bg-red-50/20' : 'bg-[#FCF9F1]'} />
               )) : <p className="text-[12px] text-gray-400 italic p-4">Nenhum trânsito maior ativo no momento.</p>}
            </div>
         </div>
         <Card title="Pílulas de Sabedoria Astral">
            <div className="space-y-6">
               <div className="p-6 bg-[#FCF9F1] border border-gold/10 rounded-2xl shadow-sm">
                  <h5 className="text-[10px] font-bold uppercase text-[#B8860B] mb-2 tracking-widest">Dignidades Essenciais</h5>
                  <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                    {liveData?.Venus?.sign === 'Touro' || liveData?.Venus?.sign === 'Libra' ? "Vênus está em domicílio, favorecendo as artes e o equilíbrio hoje." : "A posição de Vênus pede atenção às relações e valores materiais."}
                  </p>
               </div>
               <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <h5 className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-widest">Ciclo Lunar</h5>
                  <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                    {liveData?.Moon?.sign === 'Câncer' || liveData?.Moon?.sign === 'Touro' ? "Lua em posição forte: as emoções fluem com proteção." : `Lua em ${liveData?.Moon?.sign || 'sincronizando'}... foco na introspecção.`}
                  </p>
               </div>
            </div>
         </Card>
      </div>
      <div className="space-y-6">
          <SectionTitle rightAction={<button className="p-2 bg-white rounded-lg border border-gold/20 hover:bg-gold/5 transition-all"><Plus size={14} className="text-gold"/></button>}>Círculo Familiar</SectionTitle>
          <div className="grid grid-cols-3 gap-5">
             <FamilyItem name="Fernando" data="☉ Sag • ☾ Cân" />
             <FamilyItem name="Aurora" data="☉ Cap • ☾ Tou" />
             <FamilyItem name="Benício" data="☉ Leão • ☾ Pei" />
          </div>
      </div>
    </div>
  );
};

const SaudePage = () => (
  <div className="space-y-12 pb-32 animate-in fade-in max-w-5xl mx-auto">
    <Advice agent="Alfred" content="Viviane, monitorei seu ciclo de puerpério. Marte na sua 6ª casa natal sugere risco de fadiga cervical; priorize o descanso hoje." />
    
    <SectionTitle>A. Fluxo de Vitalidade & Laudos</SectionTitle>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <Card title="Arquivo de Laudos & Dietas" icon={<FileText size={18}/>}>
          <div className="space-y-1 mt-4">
             <FileItem name="Hemograma_Vivi_Mar.pdf" date="10 Mar" />
             <FileItem name="Dieta_Nutri_Puerperio.pdf" date="05 Mar" />
             <button className="w-full py-4 mt-4 border border-dashed border-[#B8860B]/20 text-[#B8860B] text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] transition-all">Upload Novo Documento</button>
          </div>
       </Card>
       <Card title="Astrologia Médica (Hyleg)" icon={<Star size={18}/>}>
          <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 mb-4">
             <h5 className="text-[10px] font-bold uppercase text-emerald-700 mb-2">Sol em Sagitário (Doador)</h5>
             <p className="text-[13px] text-emerald-800 leading-relaxed font-medium">Júpiter atua como Alcocoden, garantindo regeneração rápida, mas sensível a excessos.</p>
          </div>
       </Card>
    </div>

    <SectionTitle>B. Rotina & Hábitos de Cura</SectionTitle>
    <Card title="Hábitos Diários" icon={<Heart size={18}/>}>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-4">
          <div className="space-y-4">
             <RoutineItem name="Vitamina D (Aurora)" time="08:00" />
             <RoutineItem name="Probiótico (Benício)" time="08:30" />
          </div>
          <div className="space-y-3 pt-4 md:pt-0">
             <TodoRow label="Meditação UDV (30min)" checked={true} />
             <TodoRow label="Ingestão de Água (3L)" checked={false} />
          </div>
       </div>
    </Card>

    <SectionTitle>C. Pílulas de Autocuidado</SectionTitle>
    <div className="panel-light p-10 bg-white shadow-sm border-gold/5">
       <ul className="text-[14px] text-gray-700 space-y-6 font-medium">
          <li className="flex gap-4 items-start"><span className="p-2 bg-[#FCF9F1] rounded-lg text-gold"><Brain size={16}/></span> <div><strong>Alquimia Lunar</strong>: Chá de Camomila ativa a energia lunar receptiva necessária para o equilíbrio emocional agora.</div></li>
          <li className="flex gap-4 items-start"><span className="p-2 bg-[#FCF9F1] rounded-lg text-gold"><Activity size={16}/></span> <div><strong>Fisiologia Astral</strong>: O Sol em Sagitário rege a região lombar; realize alongamentos suaves para circular o fogo interno.</div></li>
       </ul>
    </div>
  </div>
);

const AgendaPage = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalText, setModalText] = useState('');
  
  useEffect(() => {
    const load = async () => {
      const tRes = await safeInvoke<string>('get_todoist_tasks');
      if (tRes) try { setTasks(JSON.parse(tRes)); } catch(e) {}
    };
    load();
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const ASTRO_EVENTS: Record<string, string> = {
    "2026-03-14": "Lua Cheia em Virgem",
    "2026-03-20": "Equinócio de Outono",
    "2026-03-29": "Lua Nova em Áries"
  };

  const handleAddTask = async () => {
    if(!modalText.trim()) return;
    await safeInvoke('add_todoist_task', { content: modalText });
    setShowTaskModal(false); setModalText('');
    // Refresh
    const tRes = await safeInvoke<string>('get_todoist_tasks');
    if (tRes) try { setTasks(JSON.parse(tRes)); } catch(e) {}
  };

  const handleAddEvent = async () => {
     if(!modalText.trim()) return;
     await safeInvoke('add_google_event', { title: modalText, start: selectedDay.toISOString() });
     setShowEventModal(false); setModalText('');
  };

  return (
    <div className="space-y-12 pb-32 animate-in fade-in max-w-5xl mx-auto">
      <Advice agent="Alfred" content="Agenda sincronizada. Nota: Mercúrio termina a fase de sombra em breve. Planeje com precisão." />
      
      <div className="flex justify-between items-center px-2">
         <SectionTitle>Calendário de Ciclos (Semanal)</SectionTitle>
         <div className="flex gap-2">
            <button onClick={prevWeek} className="p-2 hover:bg-[#FCF9F1] rounded-lg text-gold border border-gold/10 transition-all"><ChevronLeft size={16}/></button>
            <button onClick={nextWeek} className="p-2 hover:bg-[#FCF9F1] rounded-lg text-gold border border-gold/10 transition-all"><ChevronRight size={16}/></button>
         </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mt-4 text-center">
         {['DOM','SEG','TER','QUA','QUI','SEX','SAB'].map(d => <div key={d} className="text-[10px] font-bold text-gray-400 uppercase pb-2 tracking-[0.2em]">{d}</div>)}
         {weekDays.map(d => {
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDay.toDateString();
            const dateStr = d.toISOString().split('T')[0];
            const astro = ASTRO_EVENTS[dateStr];
            return (
               <div key={d.getTime()} onClick={() => setSelectedDay(d)} className={`aspect-[4/5] flex flex-col items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-[#333333] text-white border-[#333333] shadow-lg scale-105 z-10' : isToday ? 'bg-white text-gray-800 border-gold shadow-sm' : 'bg-white text-gray-800 border-gray-100 hover:border-gold/30'}`}>
                  <span className={`text-[11px] font-bold uppercase ${isSelected ? 'opacity-60' : 'text-gray-400'}`}>{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  <span className="text-[18px] font-bold leading-none">{d.getDate()}</span>
                  <div className="flex flex-col gap-1 items-center min-h-[16px]">
                    {astro && <span className="text-[10px] text-emerald-500 font-bold" title={astro}>✦</span>}
                    {d.getDate() === 5 && <span className="text-[10px] text-gold">☽</span>}
                  </div>
               </div>
            );
         })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <Card title={`Compromissos - ${selectedDay.toLocaleDateString('pt-BR')}`} icon={<Clock size={18}/>}>
            <div className="space-y-4 mt-4">
               {ASTRO_EVENTS[selectedDay.toISOString().split('T')[0]] && (
                 <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 items-center">
                    <Sparkles size={16} className="text-emerald-500"/>
                    <p className="text-[13px] font-bold text-emerald-800">{ASTRO_EVENTS[selectedDay.toISOString().split('T')[0]]}</p>
                 </div>
               )}
               {selectedDay.toDateString() === new Date().toDateString() ? (
                 <div className="p-4 bg-[#FCF9F1] border border-gold/10 rounded-xl flex justify-between items-center">
                    <div><p className="text-[13px] font-bold text-gray-800 tracking-tight">Sessão UDV</p><p className="text-[10px] text-[#B8860B] uppercase font-bold tracking-widest">Atenção Plena, 20:00</p></div>
                    <Clock size={16} className="text-gold opacity-40"/>
                 </div>
               ) : (
                 <p className="text-[12px] text-gray-400 italic text-center py-6">Nenhum evento mapeado para este ciclo.</p>
               )}
               <button onClick={() => setShowEventModal(true)} className="w-full py-4 mt-2 border border-dashed border-gold/20 text-gold text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] transition-all">+ Novo Evento Google</button>
            </div>
         </Card>
         <Card title="Células de Tarefas (Todoist)" icon={<ListTodo size={18}/>}>
            <div className="space-y-3 mt-4">
               {tasks.slice(0, 6).map(t => <TodoRow key={t.id} label={t.content} checked={t.completed || t.is_completed} />)}
               <button onClick={() => setShowTaskModal(true)} className="w-full py-4 mt-2 border border-dashed border-gray-200 text-gray-400 text-[10px] font-bold uppercase rounded-xl hover:text-gold hover:border-gold transition-all">+ Adicionar Tarefa</button>
            </div>
         </Card>
      </div>

      {/* MODALS */}
      {(showEventModal || showTaskModal) && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl border border-gold/20">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{showEventModal ? 'Novo Evento Google' : 'Nova Tarefa Todoist'}</h4>
                 <X size={18} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { setShowEventModal(false); setShowTaskModal(false); setModalText(''); }} />
              </div>
              <input autoFocus className="w-full p-4 bg-[#FCF9F1] border border-gold/10 rounded-xl outline-none text-[14px] text-gray-800 font-medium mb-6" placeholder={showEventModal ? "Título do evento..." : "O que precisa ser feito?"} value={modalText} onChange={e => setModalText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (showEventModal ? handleAddEvent() : handleAddTask())} />
              <div className="flex gap-4">
                 <button onClick={() => { setShowEventModal(false); setShowTaskModal(false); setModalText(''); }} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all">Cancelar</button>
                 <button onClick={showEventModal ? handleAddEvent : handleAddTask} className="flex-1 py-4 bg-[#333333] text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-gold transition-all">Gravar Ciclo</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const FinancasPage = () => (
  <div className="space-y-12 pb-32 animate-in fade-in">
    <Advice agent="Uncle Duck" content="Quá! Patrimônio crescendo 1.2% este mês. Recomendo aporte no CDI dia 18 para aproveitar o timing astral." />
    
    <div className="grid grid-cols-3 gap-8">
       <StatBox label="Saldo Mestre" val="R$ 42.100" />
       <StatBox label="Entradas (Mês)" val="+ R$ 8.400" />
       <StatBox label="Saídas (Mês)" val="- R$ 3.120" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card title="Registros e Extratos" icon={<FileJson size={18}/>}>
            <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-50"><span className="text-[13px] font-medium text-gray-700">Curso de Astrologia Tradicional</span><span className="text-red-500 font-bold">-R$ 89,00</span></div>
                <button className="w-full py-4 mt-3 border border-dashed border-gold/30 text-gold text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] flex items-center justify-center gap-2 transition-all"><Upload size={14}/> Importar Extrato</button>
            </div>
        </Card>
        <Card title="Astrologia do Ouro (Timing de Rafiki)">
            <div className="space-y-4">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col gap-3">
                    <h5 className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 uppercase tracking-widest"><TrendingUp size={16}/> Datas de Alta</h5>
                    <div className="flex justify-between text-[13px] font-bold text-emerald-800"><span>18 Mar (Vênus △ Júp)</span><span className="text-emerald-600 uppercase">Excelente</span></div>
                </div>
            </div>
        </Card>
    </div>
  </div>
);

const HardwareRow = ({ label, val, icon }: { label: string, val: string, icon: React.ReactNode }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-none px-1">
    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      <div className="p-2 bg-[#FCF9F1] rounded-lg text-[#B8860B]">{icon}</div> {label}
    </div>
    <div className="text-[12px] font-bold text-gray-800">{val}</div>
  </div>
);

const ControlePage = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ uptime: '---', latency: '---', memory: '---', cpu: '---' });

  useEffect(() => {
    const check = async () => {
      // Mocking real metrics for now as the backend commands are simple
      setMetrics({
        uptime: '4d 12h',
        latency: '24ms',
        memory: '1.2GB / 16GB',
        cpu: '4% (Aurea Idle)'
      });
    };
    check();
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in pb-20">
      <SectionTitle>Métricas de Sistema (Stark Lab)</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card title="Recursos do Núcleo" icon={<Cpu size={14}/>}>
            <div className="space-y-1">
               <HardwareRow label="Latência API" val={metrics.latency} icon={<Zap size={14}/>} />
               <HardwareRow label="Uptime Sistema" val={metrics.uptime} icon={<Clock size={14}/>} />
               <HardwareRow label="Uso de Memória" val={metrics.memory} icon={<Brain size={14}/>} />
               <HardwareRow label="Carregamento CPU" val={metrics.cpu} icon={<Activity size={14}/>} />
            </div>
         </Card>
      </div>

      <SectionTitle>Painel de Controle (Alma dos Agentes)</SectionTitle>
      <div className="grid grid-cols-2 gap-6">
         {['Rafiki', 'Alfred', 'Stark', 'Uncle Duck'].map(n => (
           <div key={n} onClick={() => setEditing(n)} className="p-7 bg-white border border-gray-100 rounded-3xl cursor-pointer hover:border-gold transition-all shadow-sm group">
              <div className="flex justify-between items-center mb-3">
                 <h5 className="font-bold text-gray-800 tracking-tight uppercase text-[12px]">{n}</h5>
                 <Settings size={14} className="text-gray-300 group-hover:text-gold transition-all" />
              </div>
              <p className="text-[12px] text-gray-400 font-medium">Clique para moldar o comportamento e diretrizes comportamentais.</p>
           </div>
         ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 font-sans">
           <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 border border-gold/20">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                 <h3 className="font-sans text-xl font-bold uppercase tracking-widest text-gray-800">Forjar Alma: {editing}</h3>
                 <X onClick={() => setEditing(null)} className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors"/>
              </div>
              <textarea className="w-full h-80 bg-gray-50 p-6 rounded-3xl outline-none focus:border-gold/50 border border-gray-100 text-[14px] leading-relaxed font-sans font-medium" defaultValue={`Instruções mestras para ${editing}...`} />
              <div className="flex justify-end mt-8"><button onClick={() => setEditing(null)} className="px-12 py-4 bg-[#333333] text-white rounded-full font-bold text-[11px] uppercase tracking-widest hover:bg-gold transition-all shadow-xl">Gravar Alma</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

const DiarioPage = () => {
  const [activeNote, setActiveNote] = useState(0);
  const [text, setText] = useState("");
  const notes = [
    {id: 1, title: "Sessão UDV: O Retorno ao Sol", date: "12 Mar"},
    {id: 2, title: "Insights do Puerpério", date: "10 Mar"},
    {id: 3, title: "Estudos Tarot Rider", date: "05 Mar"},
  ];

  return (
    <div className="flex h-full gap-8 pb-40 animate-in fade-in pt-4 font-sans">
       <div className="w-80 shrink-0 flex flex-col gap-6">
          <SectionTitle rightAction={<Plus size={14} className="text-gold cursor-pointer hover:scale-110 transition-all"/>}>Histórico</SectionTitle>
          <div className="space-y-3 overflow-y-auto no-scrollbar">
             {notes.map((n, i) => (
               <div key={n.id} onClick={() => setActiveNote(i)} className={`p-5 border transition-all cursor-pointer rounded-3xl ${activeNote === i ? 'bg-[#FCF9F1] border-gold/30 shadow-md scale-[1.02]' : 'bg-white border-gray-100 hover:border-gold/20'}`}>
                  <p className="text-[13px] font-bold text-gray-800 mb-1">{n.title}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{n.date}</p>
               </div>
             ))}
          </div>
       </div>
       <div className="flex-1 flex flex-col gap-6">
          <div className="flex justify-between items-center bg-white p-7 rounded-3xl border border-[#B8860B]/10 shadow-sm font-sans">
             <input className="text-3xl font-bold text-gray-800 bg-transparent outline-none flex-1 font-sans px-4" defaultValue={notes[activeNote]?.title} />
             <div className="flex gap-4">
                <button className="flex items-center gap-2 px-10 py-4 bg-[#333333] text-white rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-[#B8860B] transition-all shadow-lg"><Save size={18}/> Salvar Nota</button>
             </div>
          </div>
          <div className="flex-1 bg-white rounded-3xl p-12 border border-gray-100 shadow-inner overflow-hidden flex flex-col relative font-sans">
             <div className="absolute top-0 left-0 w-2 h-full bg-[#FCF9F1]" />
             <textarea className="flex-1 w-full bg-transparent outline-none text-[18px] leading-[2.6] text-gray-700 font-medium no-scrollbar resize-none font-sans" placeholder="No silêncio profundo, as estrelas disseram..." value={text} onChange={e => setText(e.target.value)} />
          </div>
       </div>
    </div>
  );
};

const MesaCriacao = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragNode, setDragNode] = useState<any>(null);
  const [drawingEdge, setDrawingEdge] = useState<any>(null);

  const addHistory = (action: string) => {
    const entry = { id: Date.now(), time: new Date().toLocaleTimeString('pt-BR'), action };
    setHistory(prev => [entry, ...prev].slice(0, 10)); // Keep last 10
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

const MemoriasPage = () => {
  const [activeAgent, setActiveAgent] = useState('Rafiki');
  const [archives, setArchives] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const all: any[] = [];
      for (const agent of Object.keys(AGENT_ICONS)) {
        const h = await safeInvoke<string[]>('list_archived_chats', { agent });
        if (h) h.forEach(name => all.push({ agent, name, date: name.split('_')[1]?.split('.')[0] || 'Antiga' }));
      }
      setArchives(all.sort((a,b) => b.name.localeCompare(a.name)));
    };
    load();
  }, []);

  const openArchive = async (arc: any) => {
    const path = `C:\\Users\\vivic\\AppData\\Roaming\\aurea-solaris\\memory\\archives\\${arc.name}`;
    const raw = await safeInvoke<string>('read_text_file', { path });
    if (raw) try { setSelectedChat(JSON.parse(raw)); } catch(e) { setSelectedChat([]); }
  };

  const agents = [{ name: 'Rafiki', icon: <Star size={16}/> }, { name: 'Alfred', icon: <Calendar size={16}/> }, { name: 'Uncle Duck', icon: <PieChart size={16}/> }, { name: 'Stark', icon: <Zap size={16}/> }, { name: 'Strange', icon: <Eye size={16}/> }];
  
  return (
    <div className="w-full h-full flex gap-8 animate-in fade-in pb-10 pt-6 font-sans">
      <aside className="w-80 panel-light rounded-[2.5rem] flex flex-col overflow-hidden shrink-0 shadow-sm">
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          <SectionTitle>Arquivos de Memória</SectionTitle>
          <div className="space-y-4">
             {archives.filter(a => a.agent === activeAgent || !activeAgent).map((arc, i) => (
               <div key={i} onClick={() => openArchive(arc)} className="p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:border-gold transition-all">
                  <p className="text-[12px] font-bold text-gray-800">{arc.name}</p>
                  <p className="text-[9px] text-gold uppercase font-bold">{arc.date}</p>
               </div>
             ))}
          </div>
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-4 px-2">Trocar Agente</h4>
            <div className="space-y-1">
              {agents.map(a => (
                <button key={a.name} onClick={() => setActiveAgent(a.name)} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${activeAgent === a.name ? 'bg-[#FCF9F1] text-gold font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {a.icon} <span className="text-[13px]">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 panel-light rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-lg">
        <div className="p-8 border-b border-gray-100 bg-[#FCF9F1] flex justify-between items-center shrink-0">
          <h3 className="font-sans text-[16px] font-bold uppercase tracking-widest text-[#333333]">Fluxo Dimensional: {activeAgent}</h3>
        </div>
        <div className="flex-1 p-10 overflow-y-auto no-scrollbar space-y-6 bg-white">
             {selectedChat.length > 0 ? selectedChat.map((m: any, i: number) => (
                <div key={i} className={`p-6 rounded-3xl border border-gray-100 text-[13px] text-gray-600 font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border-[#B8860B]/20' : 'bg-gray-50 mr-auto'}`}>
                  <span className="block text-[9px] font-bold uppercase opacity-30 mb-2">{String(m.role)}</span>
                  {String(m.content)}
                </div>
             )) : (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                  <Archive size={48} />
                  <p className="text-[11px] font-bold uppercase tracking-widest">Nenhuma conversa selecionada</p>
               </div>
             )}
        </div>
      </main>
    </div>
  );
};

// --- ESTRUTURA PRINCIPAL ---

export default function App() {
  const [currentPage, setCurrentPage] = useState('astrologia');
  const [isStrangeOpen, setIsStrangeOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [strangeMsgs, setStrangeMsgs] = useState<any[]>([]);
  const [strangeInput, setStrangeInput] = useState('');
  const [loadingStrange, setLoadingStrange] = useState(false);

  const hasChat = !['mesa-criacao', 'diario', 'memorias'].includes(currentPage);
  const isMesa = currentPage === 'mesa-criacao';

  useEffect(() => {
    const load = async () => {
      const h = await safeInvoke<any[]>('load_history', { agent: 'Strange' });
      if (h) setStrangeMsgs(h);
      else setStrangeMsgs([{ role: 'assistant', content: 'Olho de Agamotto detecta estabilidade dimensional.' }]);
    };
    load();
  }, []);

  const handleStrange = async () => {
    if (!strangeInput.trim() || loadingStrange) return;
    const ut = [...strangeMsgs, { role: 'user', content: strangeInput }];
    setStrangeMsgs(ut);
    setStrangeInput('');
    setLoadingStrange(true);

    try {
      const res = await safeInvoke<string>('openrouter_chat', {
        model: 'google/gemini-2.0-pro-exp-02-05',
        messages: [
          { role: 'system', content: 'Você é Dr. Strange, o mestre supremo do sistema Aurea Solaris. Você vê múltiplos futuros e padrões. Responda de forma sábia, breve e mística.' },
          ...ut
        ]
      });
      if (res) {
        const f = [...ut, { role: 'assistant', content: res }];
        setStrangeMsgs(f);
        await safeInvoke('save_history', { agent: 'Strange', history: f });
      }
    } catch (err) {
      console.error("Strange error:", err);
    }
    setLoadingStrange(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'astrologia': return <AstrologiaPage />;
      case 'saude': return <SaudePage />;
      case 'agenda': return <AgendaPage />;
      case 'financas': return <FinancasPage />;
      case 'controle': return <ControlePage />;
      case 'diario': return <DiarioPage />;
      case 'mesa-criacao': return <MesaCriacao />;
      case 'memorias': return <MemoriasPage />;
      default: return <AstrologiaPage />;
    }
  };

  const ProfilePopup = () => (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 animate-in fade-in font-sans">
       <div className="bg-[#FCF9F1] rounded-[3rem] p-12 w-full max-w-4xl shadow-2xl border border-gold/30">
          <SectionTitle rightAction={<X onClick={() => setIsProfileOpen(false)} className="cursor-pointer text-gray-400 hover:text-red-500"/>}>Identidade Mestre (Configurações)</SectionTitle>
          <div className="grid grid-cols-2 gap-12 mt-8">
             <div className="space-y-6">
                <div><label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Nome Mestre</label><input className="w-full bg-white p-4 rounded-2xl border border-gold/10 font-bold text-gray-800" defaultValue="Viviane" /></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Contexto Pessoal</label><textarea className="w-full h-32 bg-white p-4 rounded-2xl outline-none border border-gold/10 resize-none text-[13px] text-gray-600 font-medium leading-relaxed" defaultValue="Puerpério. Filhos 2m e 2a. Estudo UDV. Foco em equilíbrio total." /></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Estilo de Diálogo</label><select className="w-full bg-white p-4 rounded-2xl border border-gold/10 text-[13px] font-bold outline-none cursor-pointer"><option>Inteligente e Poética</option></select></div>
             </div>
             <div className="space-y-6 flex flex-col">
                <div className="flex-1 flex flex-col">
                    <label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Mapa Natal (Bulk Text)</label>
                    <textarea className="flex-1 w-full bg-white p-6 rounded-2xl font-mono text-[12px] border border-gold/10 resize-none leading-relaxed text-gray-800 shadow-inner mt-1" defaultValue="Sun in Sagittarius 29°37'\nMoon in Libra 16°17'\nASC in Aquarius 21°51'" />
                </div>
                <button className="w-full py-5 bg-[#333333] text-white rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-gold shadow-xl transition-all">Gravar Alma Master</button>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="layout-grid font-sans overflow-hidden" style={{ gridTemplateColumns: `${isSidebarCollapsed ? '80px' : '260px'} 1fr ${hasChat ? '360px' : '0px'}` }}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside className="bg-white rounded-[2.5rem] border border-[#B8860B]/10 shadow-xl shrink-0 z-30 flex flex-col relative overflow-hidden transition-all duration-300">
        <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
          <div className="cursor-pointer hover:rotate-12 transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
          </div>
          {!isSidebarCollapsed && <h1 className="text-[13px] font-bold tracking-widest text-[#B8860B] uppercase">Aurea Solaris</h1>}
        </div>
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto no-scrollbar pb-6 pt-4">
          <NavItem icon={<Edit3 size={18} />} label="Mesa de Criação" active={currentPage === 'mesa-criacao'} onClick={() => setCurrentPage('mesa-criacao')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Star size={18} />} label="Astrologia" active={currentPage === 'astrologia'} onClick={() => setCurrentPage('astrologia')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Activity size={18} />} label="Saúde & Vitalidade" active={currentPage === 'saude'} onClick={() => setCurrentPage('saude')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Calendar size={18} />} label="Agenda Preditiva" active={currentPage === 'agenda'} onClick={() => setCurrentPage('agenda')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<PieChart size={18} />} label="Gestão de Ouro" active={currentPage === 'financas'} onClick={() => setCurrentPage('financas')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Settings size={18} />} label="Painel de Controle" active={currentPage === 'controle'} onClick={() => setCurrentPage('controle')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<BookOpen size={18} />} label="Meu Diário" active={currentPage === 'diario'} onClick={() => setCurrentPage('diario')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Archive size={18} />} label="Logs & Memórias" active={currentPage === 'memorias'} onClick={() => setCurrentPage('memorias')} collapsed={isSidebarCollapsed} />
        </nav>
        <div className="p-4 pt-2 border-t border-gray-100 shrink-0">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FCF9F1] hover:bg-white border border-transparent transition-all group shadow-sm">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-white text-[#B8860B] flex items-center justify-center shrink-0"><User size={16} /></div>
            {!isSidebarCollapsed && <div className="text-left overflow-hidden"><p className="text-[11px] font-bold uppercase truncate text-gray-800 leading-none">Viviane</p></div>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-area">
        {!isMesa && (
          <header className="px-12 py-8 flex justify-between items-center glass-panel shrink-0 border-b border-gold/10 z-20">
            <h2 className="text-2xl font-bold tracking-[0.2em] uppercase text-gray-800">{currentPage.replace('-', ' ')}</h2>
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span className="flex items-center gap-2.5 text-[#B8860B] bg-[#FCF9F1] px-4 py-2 rounded-xl border border-gold/10"><Moon size={16} /> Minguante</span>
              <span onClick={() => setCurrentPage('agenda')} className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-gray-800 font-bold cursor-pointer hover:border-gold transition-all"><Clock size={14} /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </header>
        )}
        <div className={`flex-1 relative ${isMesa ? '' : 'px-12 pt-10 overflow-y-auto no-scrollbar pb-40'}`}>
          {renderPage()}
        </div>
      </main>

      {/* CHAT DIREITO */}
      <aside className={`h-full shrink-0 z-10 transition-all duration-500 overflow-hidden ${hasChat ? 'w-[360px] opacity-100' : 'w-0 opacity-0'}`}>
          {currentPage === 'astrologia' && <AgentChat agent="Rafiki" />}
          {currentPage === 'saude' && <AgentChat agent="Alfred" />}
          {currentPage === 'agenda' && <AgentChat agent="Alfred" />}
          {currentPage === 'financas' && <AgentChat agent="Uncle Duck" />}
          {currentPage === 'controle' && <AgentChat agent="Stark" />}
      </aside>

      {/* STRANGE FAB */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-6 pointer-events-none">
        {isStrangeOpen && (
          <div className="w-[420px] h-[650px] bg-white rounded-[3.5rem] shadow-2xl border border-gold/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 pointer-events-auto">
            <div className="p-8 bg-[#FCF9F1] border-b border-gold/10 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-full text-[#B8860B] shadow-sm"><Eye size={24}/></div>
                  <div><p className="text-[14px] font-bold uppercase tracking-widest text-gray-800 leading-tight">Dr. Strange</p><p className="text-[9px] font-bold text-[#B8860B] uppercase tracking-widest leading-none">Supervisor Macro</p></div>
               </div>
               <X onClick={() => setIsStrangeOpen(false)} className="cursor-pointer text-gray-400 hover:text-red-500 p-2 rounded-full transition-all"/>
            </div>
            <div className="flex-1 p-8 space-y-6 overflow-y-auto no-scrollbar bg-white">
               {strangeMsgs.map((m, i) => (
                  <div key={i} className={`p-6 rounded-3xl border border-gray-100 text-[13px] text-gray-600 font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border-[#B8860B]/20' : 'bg-gray-50 mr-auto'}`}>
                    {m.content}
                  </div>
               ))}
               {loadingStrange && <div className="text-[10px] opacity-40 animate-pulse text-center">Consultando linhas temporais...</div>}
            </div>
            <div className="p-6 bg-[#FCF9F1] border-t border-gray-100">
               <div className="flex items-center gap-3 bg-white p-2 rounded-full border border-gold/10 shadow-sm">
                  <input className="flex-1 bg-transparent text-[#333333] font-medium text-[13px] px-5 outline-none" placeholder="Consultar o Olho..." value={strangeInput} onChange={e => setStrangeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStrange()} />
                  <button onClick={handleStrange} className="p-3 bg-[#333333] text-white rounded-full hover:bg-[#B8860B] transition-all"><Sparkles size={18}/></button>
               </div>
            </div>
          </div>
        )}
        <button onClick={() => setIsStrangeOpen(!isStrangeOpen)} className="pointer-events-auto w-20 h-20 rounded-full shadow-2xl bg-white border-4 border-[#B8860B]/30 flex items-center justify-center hover:scale-110 transition-all"><Eye size={40} className="text-[#B8860B]"/></button>
      </div>

      {isProfileOpen && <ProfilePopup />}
    </div>
  );
}
