import React, { useState } from 'react';
import {
  Moon, Sun, Layout, Calendar, PieChart,
  Settings, MessageSquare, Plus, Trash2,
  Zap, User, Home, Star, Edit3, Eye,
  BookOpen, Sparkles, ChevronRight, X, Link2,
  Maximize2, DollarSign, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, List, Cpu, Database, Key,
  Users, Activity, Thermometer, Monitor, HardDrive
} from 'lucide-react';
import "./styles.css"; // Ensure Tailwind base is loaded

// --- ESTILOS GLOBAIS (Scroll Invisível) ---
const globalStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

const COLORS = {
  bg: 'bg-[#FCF9F1]',
  sidebar: 'bg-[#F5F1E6]',
  accent: 'text-[#B8860B]',
  accentBg: 'bg-[#B8860B]',
  border: 'border-[#E5E1D3]',
  card: 'bg-white'
};

// --- COMPONENTES DE DESIGN ---
const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="20" stroke="#B8860B" strokeWidth="2" />
    <circle cx="50" cy="50" r="35" stroke="#B8860B" strokeWidth="0.5" strokeDasharray="4 4" />
    {[...Array(8)].map((_, i) => (
      <line key={i} x1="50" y1="25" x2="50" y2="10" stroke="#B8860B" strokeWidth="2" transform={`rotate(${i * 45} 50 50)`} />
    ))}
  </svg>
);

const Mandala = () => (
  <div className="relative w-64 h-64 flex items-center justify-center opacity-70">
    <svg className="w-full h-full" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" stroke="#B8860B" strokeWidth="0.5" fill="none" />
      <circle cx="50" cy="50" r="32" stroke="#B8860B" strokeWidth="0.2" fill="none" />
      {[...Array(12)].map((_, i) => (
        <React.Fragment key={i}>
          <line x1="50" y1="2" x2="50" y2="50" stroke="#B8860B" strokeWidth="0.1" transform={`rotate(${i * 30} 50 50)`} opacity="0.3" />
          <text x="50" y="8" fontSize="3" fill="#B8860B" transform={`rotate(${i * 30 + 15} 50 50)`} textAnchor="middle">
            {['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'][i]}
          </text>
        </React.Fragment>
      ))}
    </svg>
    <div className="absolute w-2 h-2 bg-[#B8860B] rounded-full blur-[1px] animate-pulse" />
  </div>
);

const App = () => {
  const [currentPage, setCurrentPage] = useState('mesa-criacao');
  const [isStrangeOpen, setIsStrangeOpen] = useState(false);
  const [user, setUser] = useState({
    name: 'Viviane',
    role: 'Administradora',
    context: 'Puerpério. Foco em organização suave e estudos de Astrologia/Tarot.',
    hobbies: 'Tarot Rider Waite, Meditação UDV'
  });

  const renderPage = () => {
    switch (currentPage) {
      case 'mesa-criacao': return <MesaCriacao />;
      case 'astrologia': return <AstrologiaPage />;
      case 'agenda': return <AgendaPage />;
      case 'financas': return <FinancasPage />;
      case 'controle': return <ControlePage />;
      case 'perfil': return <ProfilePage user={user} />;
      default: return <MesaCriacao />;
    }
  };

  return (
    <div className={`flex h-screen w-full font-sans ${COLORS.bg} text-[#333] overflow-hidden`}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside className={`w-64 ${COLORS.sidebar} border-r ${COLORS.border} flex flex-col p-6`}>
        <div className="flex items-center gap-3 mb-12 cursor-pointer" onClick={() => setCurrentPage('mesa-criacao')}>
          <Logo />
          <div>
            <h1 className="text-xs font-bold tracking-widest uppercase text-[#B8860B]">Aurea Solaris</h1>
            <p className="text-[8px] opacity-40 uppercase">Multidimensional</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem icon={<Edit3 size={16} />} label="Mesa de Criação" active={currentPage === 'mesa-criacao'} onClick={() => setCurrentPage('mesa-criacao')} />
          <NavItem icon={<Star size={16} />} label="Astrologia" active={currentPage === 'astrologia'} onClick={() => setCurrentPage('astrologia')} />
          <NavItem icon={<Calendar size={16} />} label="Agenda" active={currentPage === 'agenda'} onClick={() => setCurrentPage('agenda')} />
          <NavItem icon={<PieChart size={16} />} label="Finanças" active={currentPage === 'financas'} onClick={() => setCurrentPage('financas')} />
          <NavItem icon={<Settings size={16} />} label="Painel de Controle" active={currentPage === 'controle'} onClick={() => setCurrentPage('controle')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-[#E5E1D3]">
          <button onClick={() => setCurrentPage('perfil')} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 transition-all text-left">
            <div className="w-8 h-8 rounded-full bg-white border border-[#E5E1D3] flex items-center justify-center"><User size={14} className="text-[#B8860B]" /></div>
            <div>
              <p className="text-[11px] font-bold">{user.name}</p>
              <p className="text-[8px] opacity-40 uppercase">Perfil Master</p>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative p-8 h-full overflow-hidden w-full">
        <header className="flex justify-between items-center mb-8 shrink-0">
          <h2 className="text-xl font-light tracking-[0.2em] uppercase">{currentPage.replace('-', ' ')}</h2>
          <div className="text-[9px] font-bold opacity-30 tracking-widest">AUREA SOLARIS V5.0</div>
        </header>

        <section className="flex-1 overflow-hidden w-full relative">
          {renderPage()}
        </section>

        {/* STRANGE WIDGET */}
        <div className="fixed bottom-8 right-8 z-50">
          {isStrangeOpen && (
            <div className="absolute bottom-16 right-0 w-80 h-[480px] bg-white rounded-[2.5rem] shadow-2xl border border-[#E5E1D3] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-black p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2"><Eye size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">Dr. Strange</span></div>
                <button onClick={() => setIsStrangeOpen(false)}><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FCF9F1]/50 no-scrollbar">
                <StrangeReport title="Macro Report" content="Todos os agentes reportam estabilidade. Alfred sincronizou Todoist." />
                <div className="p-4 bg-white border border-[#B8860B]/20 rounded-2xl italic text-[10px] leading-relaxed">
                  "Viviane, o céu de hoje pede foco na Mesa de Criação. Rafiki sugere que a Lua em Gêmeos trará novos insights para o batismo."
                </div>
              </div>
              <div className="p-4 bg-white border-t flex gap-2">
                <input type="text" placeholder="Falar com Strange..." className="flex-1 text-[10px] p-2 bg-gray-50 rounded-full outline-none" />
                <button className="p-2 bg-black text-white rounded-full"><Sparkles size={14} /></button>
              </div>
            </div>
          )}
          <button onClick={() => setIsStrangeOpen(!isStrangeOpen)} className="w-14 h-14 bg-[#B8860B] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all">
            {isStrangeOpen ? <X size={24} /> : <Eye size={28} />}
          </button>
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTES DE PÁGINAS ---

const AstrologiaPage = () => (
  <div className="grid grid-cols-3 gap-8 h-full overflow-hidden w-full">
    <div className="col-span-2 space-y-10 pr-4 overflow-y-auto no-scrollbar pb-20 h-full">
      {/* Header Compacto */}
      <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3] flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Moon size={32} className="text-[#B8860B]" />
          <div><p className="text-[8px] font-bold opacity-30 uppercase">Fase</p><p className="text-xs font-bold">Lua Crescente</p></div>
        </div>
        <div className="flex gap-4">
          <PlanetMini icon="☉" label="Sol" sign="Psc" />
          <PlanetMini icon="☿" label="Mer" sign="Ari" />
          <PlanetMini icon="♀" label="Ven" sign="Tau" />
          <PlanetMini icon="♂" label="Mar" sign="Gem" />
          <PlanetMini icon="♃" label="Jup" sign="Gem" />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[3rem] border border-[#E5E1D3]">
        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-8">Mandala do Agora</h4>
        <Mandala />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Pílulas de Aprendizado">
          <ul className="text-[11px] space-y-3 italic text-gray-600">
            <li>• Dignidade Planetária: O estado de exílio.</li>
            <li>• Os 4 Elementos no Temperamento.</li>
            <li>• A importância das Casas Angulares.</li>
          </ul>
        </Card>
        <Card title="Trânsitos Cruzados">
          <div className="text-[10px] space-y-2">
            <p className="flex justify-between"><span>Saturno (T) ☍ Vênus (N)</span> <span className="text-[#B8860B]">Ativo</span></p>
            <p className="opacity-50 italic">Foco em estruturação de valores e parcerias.</p>
          </div>
        </Card>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[10px] font-bold uppercase opacity-30">Círculo Familiar</h4>
          <button className="text-[10px] font-bold text-[#B8860B] uppercase tracking-widest flex items-center gap-1"><Plus size={12} /> Adicionar</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FamilyItem name="Fernando" signs="Sagitário ☉" />
          <FamilyItem name="Aurora" signs="Capricórnio ☉" />
          <FamilyItem name="Benício" signs="Leão ☉" />
        </div>
      </div>

      <Advice agent="Rafiki" content="A Lua em Gêmeos favorece o estudo teórico. Não tente aplicar tudo ao mapa hoje, apenas absorva a técnica." />
    </div>

    <div className="col-span-1 h-full"><AgentChat agent="Rafiki" color="#B8860B" /></div>
  </div>
);

const AgendaPage = () => (
  <div className="grid grid-cols-3 gap-8 h-full overflow-hidden w-full">
    <div className="col-span-2 space-y-10 pr-4 overflow-y-auto no-scrollbar pb-20 h-full">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
          <h4 className="text-[10px] font-bold uppercase opacity-30 mb-6 flex items-center gap-2"><Calendar size={14} /> Google Calendar</h4>
          <div className="space-y-3">
            <CalendarItem time="10:00" title="Meditação" />
            <CalendarItem time="15:00" title="Estudo Tarot" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
          <h4 className="text-[10px] font-bold uppercase opacity-30 mb-6 flex items-center gap-2"><List size={14} /> Todoist</h4>
          <div className="space-y-3">
            <TodoTask label="Comprar Alecrim" checked={false} />
            <TodoTask label="Revisar Mapa Aurora" checked={true} />
          </div>
        </div>
      </div>
      <Advice agent="Alfred" content="Viviane, consegui bloquear 40 minutos para você após o almoço. O sistema está em modo silencioso." />
    </div>
    <div className="col-span-1 h-full"><AgentChat agent="Alfred" color="#4A5568" /></div>
  </div>
);

const FinancasPage = () => (
  <div className="grid grid-cols-3 gap-8 h-full overflow-hidden w-full">
    <div className="col-span-2 space-y-8 pr-4 overflow-y-auto no-scrollbar pb-20 h-full">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Saldo" val="R$ 14.250" />
        <StatCard label="Entradas" val="R$ 8.400" green />
        <StatCard label="Saídas" val="R$ 3.120" red />
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
        <h4 className="text-[10px] font-bold uppercase opacity-30 mb-6">Tabela de Gastos Recentes</h4>
        <table className="w-full text-[11px] text-left">
          <thead className="opacity-40 font-bold"><tr><th className="pb-4">DATA</th><th className="pb-4">DESCRIÇÃO</th><th className="pb-4 text-right">VALOR</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="py-3">12/03</td><td className="py-3">Curso Astrologia</td><td className="py-3 text-right">-R$ 89,00</td></tr>
            <tr><td className="py-3">10/03</td><td className="py-3">Projeto Solar</td><td className="py-3 text-right text-green-600">+R$ 2.400,00</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-[#2C7A7B] text-white p-8 rounded-[3rem]">
        <h4 className="text-[10px] font-bold uppercase opacity-60 mb-6">Dicas de Investimento (Uncle Duck)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <p className="text-[11px] font-bold mb-1">Tesouro Selic</p>
            <p className="text-[9px] opacity-70 italic">Liquidez diária para sua reserva.</p>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <p className="text-[11px] font-bold mb-1">CDB 102% CDI</p>
            <p className="text-[9px] opacity-70 italic">Proteção e rentabilidade estável.</p>
          </div>
        </div>
      </div>
      <Advice agent="Uncle Duck" content="Quá! O saldo está positivo, mas evite gastos impulsivos com Mercúrio em Áries." />
    </div>
    <div className="col-span-1 h-full"><AgentChat agent="Uncle Duck" color="#2C7A7B" /></div>
  </div>
);

const ControlePage = () => (
  <div className="grid grid-cols-3 gap-8 h-full overflow-hidden w-full">
    <div className="col-span-2 space-y-10 pr-4 overflow-y-auto no-scrollbar pb-20 h-full">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
          <h4 className="text-[10px] font-bold uppercase opacity-30 mb-6 flex items-center gap-2"><Cpu size={14} /> Saúde do Computador</h4>
          <div className="space-y-4 text-[11px]">
            <div className="flex justify-between"><span>CPU Temp</span> <span className="font-bold text-green-500">42°C</span></div>
            <div className="flex justify-between"><span>Uso de RAM</span> <span className="font-bold">12.4 GB</span></div>
            <div className="flex justify-between"><span>Espaço Livre</span> <span className="font-bold">450 GB</span></div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
          <h4 className="text-[10px] font-bold uppercase opacity-30 mb-6 flex items-center gap-2"><Database size={14} /> Tokens & APIs</h4>
          <div className="space-y-4 text-[11px]">
            <div className="flex justify-between"><span>GPT-4o usage</span> <span className="font-bold text-[#B8860B]">$1.24</span></div>
            <div className="flex justify-between"><span>Gemini 1.5</span> <span className="font-bold">$0.08</span></div>
            <div className="flex justify-between"><span>Todoist API</span> <span className="text-green-500 font-bold uppercase">Ativa</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-[#E5E1D3]">
        <h4 className="text-[10px] font-bold uppercase opacity-30 mb-8 flex items-center gap-2"><Users size={14} /> Configuração de Agentes</h4>
        <div className="grid grid-cols-2 gap-4">
          <AgentCard name="Rafiki" llm="GPT-4o-mini" ctx="Astrologia" />
          <AgentCard name="Alfred" llm="Gemini 1.5" ctx="Rotina" />
          <AgentCard name="Stark" llm="Claude 3.5" ctx="Sistemas" />
          <AgentCard name="Uncle Duck" llm="GPT-4o-mini" ctx="Finanças" />
        </div>
      </div>
      <Advice agent="Stark" content="Sistema operacional operando em 98% de eficiência. Nenhuma vulnerabilidade detectada." />
    </div>
    <div className="col-span-1 h-full"><AgentChat agent="Stark" color="#C53030" /></div>
  </div>
);

const MesaCriacao = () => (
  <div className="w-full h-full bg-[#F9F7F0] rounded-[3.5rem] border border-[#E5E1D3] relative overflow-hidden group shadow-inner">
    <div className="absolute top-8 left-8 flex gap-3 z-10 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-[#E5E1D3]">
      <div className="p-2 text-gray-400 hover:text-[#B8860B] cursor-pointer"><Plus size={18} /></div>
      <div className="p-2 text-gray-400 hover:text-[#B8860B] cursor-pointer"><Link2 size={18} /></div>
      <div className="p-2 text-gray-400 hover:text-[#B8860B] cursor-pointer"><Maximize2 size={18} /></div>
    </div>
    <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />
    <div className="absolute top-32 left-32 p-8 w-64 bg-[#FFF9E6] shadow-xl border border-[#E5E1D3] transform rotate-[-1deg] cursor-move active:scale-95 transition-all">
      <p className="text-[11px] italic leading-relaxed text-gray-700">Ideias para o batismo: Alecrim, Flores Brancas e Luz de Velas.</p>
    </div>
    <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.4em] opacity-20">Ambiente Criativo Infinito</p>
  </div>
);

const ProfilePage = ({ user }) => (
  <div className="w-full h-full overflow-y-auto no-scrollbar space-y-10 animate-in fade-in pb-20 pr-4">
    <div className="bg-white p-12 rounded-[4rem] border border-[#E5E1D3] flex items-center gap-8">
      <div className="w-32 h-32 rounded-full bg-[#F5F1E6] border-2 border-[#B8860B] flex items-center justify-center text-[#B8860B]"><User size={48} /></div>
      <div>
        <h3 className="text-3xl font-light tracking-widest">{user.name}</h3>
        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Administradora Geral • UDV • Puerpério</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-8">
      <Card title="Hobbies & Personalidade">
        <p className="text-[11px] leading-relaxed text-gray-600 mb-4">{user.hobbies}</p>
        <p className="text-[11px] leading-relaxed italic text-gray-500">"Prática no dia a dia, mística nas questões abstratas."</p>
      </Card>
      <div className="bg-[#B8860B]/5 p-8 rounded-[3rem] border border-[#B8860B]/20">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#B8860B] mb-4">Janela de Contexto</h4>
        <textarea className="w-full h-40 bg-white p-5 rounded-2xl border border-[#E5E1D3] text-[11px] leading-relaxed outline-none" defaultValue={user.context} />
      </div>
    </div>
  </div>
);

// --- COMPONENTES ATÔMICOS ---

const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-xs font-medium uppercase tracking-widest ${active ? 'bg-white shadow-md text-black font-bold' : 'text-gray-500 hover:bg-white/40'}`}>
    <span className={active ? 'text-[#B8860B]' : ''}>{icon}</span>
    {label}
  </button>
);

const AgentChat = ({ agent, color }) => (
  <div className="flex flex-col h-full bg-white rounded-[3rem] border border-[#E5E1D3] overflow-hidden shadow-sm">
    <div className="p-5 flex items-center gap-3 text-white" style={{ backgroundColor: color }}>
      <MessageSquare size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">{agent}</span>
    </div>
    <div className="flex-1 p-6 space-y-4 bg-[#FCF9F1]/20 overflow-y-auto no-scrollbar italic text-[11px] text-gray-500">
      "Estou monitorando esta seção, Viviane. Como posso ajudar com {agent === 'Rafiki' ? 'os trânsitos' : agent === 'Stark' ? 'o sistema' : 'o financeiro'}?"
    </div>
    <div className="p-6 border-t bg-white flex items-center pr-4">
      <input type="text" placeholder={`Falar com ${agent}...`} className="w-full text-[10px] p-3.5 rounded-2xl bg-gray-50 border-none outline-none" />
      <ChevronRight className="text-gray-400" size={16} />
    </div>
  </div>
);

const Advice = ({ agent, content }) => (
  <div className="bg-white rounded-[3rem] p-8 border-l-8 border-[#B8860B] shadow-sm flex items-start gap-6">
    <div className="p-3 bg-gray-50 rounded-full text-[#B8860B]"><Sparkles size={20} /></div>
    <div>
      <h4 className="text-[9px] font-bold uppercase opacity-30 mb-1">Conselho do {agent}</h4>
      <p className="text-[11px] italic text-gray-600 leading-loose">"{content}"</p>
    </div>
  </div>
);

const PlanetMini = ({ icon, label, sign }) => (
  <div className="text-center min-w-[50px]">
    <p className="text-lg text-[#B8860B] mb-1">{icon}</p>
    <p className="text-[8px] font-bold uppercase opacity-30">{label}</p>
    <p className="text-[9px] font-bold">{sign}</p>
  </div>
);

const TransitItem = ({ aspect, p1, p2, effect, color }) => (
  <div className="p-3 bg-gray-50 rounded-2xl border border-[#E5E1D3]">
    <div className="flex justify-between items-center mb-1"><span className={`text-[9px] font-bold uppercase tracking-widest ${color}`}>{aspect}</span><span className="text-[8px] opacity-40">{p1} ☍ {p2}</span></div>
    <p className="text-[9px] italic text-gray-500">{effect}</p>
  </div>
);

const FamilyItem = ({ name, signs }) => (
  <div className="p-4 bg-gray-50 rounded-2xl border border-[#E5E1D3] text-center">
    <p className="text-[10px] font-bold mb-1">{name}</p>
    <p className="text-[9px] opacity-50 uppercase tracking-tighter">{signs}</p>
  </div>
);

const CalendarItem = ({ time, title }) => (
  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-[#E5E1D3]">
    <span className="text-[9px] font-bold opacity-30 w-10">{time}</span>
    <span className="text-[11px] font-medium">{title}</span>
  </div>
);

const TodoTask = ({ label, checked }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
    <div className={`w-4 h-4 rounded-full border ${checked ? 'bg-[#B8860B] border-[#B8860B]' : 'border-gray-300'}`}>{checked && <CheckCircle size={10} className="text-white mx-auto" />}</div>
    <span className={`text-[11px] ${checked ? 'line-through opacity-40' : ''}`}>{label}</span>
  </div>
);

const StatCard = ({ label, val, green, red }) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E1D3] shadow-sm flex-1">
    <p className="text-[9px] font-bold uppercase opacity-30 mb-2">{label}</p>
    <p className={`text-xl font-light ${green ? 'text-green-600' : red ? 'text-red-500' : ''}`}>{val}</p>
  </div>
);

const TokenCard = ({ label, tokens, cost }) => (
  <div className="p-4 bg-gray-50 rounded-2xl border border-[#E5E1D3]">
    <p className="text-[9px] font-bold uppercase opacity-30 mb-2">{label}</p>
    <p className="text-lg font-light">{tokens}</p>
    <p className="text-[9px] text-[#B8860B] font-bold mt-1">Gasto: {cost}</p>
  </div>
);

const AgentCard = ({ name, llm, ctx }) => (
  <div className="p-4 bg-gray-50 rounded-2xl border border-[#E5E1D3] flex justify-between items-center group hover:bg-white transition-all">
    <div><p className="text-[11px] font-bold uppercase tracking-widest">{name}</p><p className="text-[9px] opacity-40 italic">{ctx}</p></div>
    <div className="text-right"><p className="text-[8px] font-bold opacity-30">LLM</p><p className="text-[10px] font-bold text-[#B8860B]">{llm}</p></div>
  </div>
);

const HardwareRow = ({ icon, label, val, color }) => (
  <div className="flex items-center justify-between py-2 border-b border-[#E5E1D3]/30 last:border-none">
    <div className="flex items-center gap-2 opacity-50">{icon} <span className="text-[9px] font-bold uppercase">{label}</span></div>
    <span className={`text-[11px] font-bold ${color || ''}`}>{val}</span>
  </div>
);

const ProfileInput = ({ label, value, isTextArea }) => (
  <div>
    <label className="text-[9px] font-bold uppercase opacity-30 mb-2 block">{label}</label>
    {isTextArea ? <textarea className="w-full p-4 bg-gray-50 rounded-xl text-[11px]" defaultValue={value} /> : <input className="w-full p-4 bg-gray-50 rounded-xl text-[11px]" defaultValue={value} />}
  </div>
);

const Card = ({ title, children, icon }) => (
  <div className="bg-white rounded-[3rem] p-8 border border-[#E5E1D3] shadow-sm">
    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-6 opacity-30 flex items-center gap-2">{icon}{title}</h4>
    {children}
  </div>
);

const ToolbarBtn = ({ icon, label }) => (
  <div className="flex flex-col items-center group cursor-pointer p-2">
    <span className="text-gray-400 group-hover:text-[#B8860B]">{icon}</span>
    <span className="text-[7px] font-bold opacity-40 uppercase mt-1">{label}</span>
  </div>
);

const StrangeReport = ({ title, content }) => (
  <div className="p-4 bg-white border border-[#E5E1D3] rounded-2xl">
    <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{title}</p>
    <p className="text-[10px] leading-relaxed opacity-60 italic">{content}</p>
  </div>
);

export default App;
