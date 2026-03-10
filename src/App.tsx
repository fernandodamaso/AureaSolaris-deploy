import { useState } from "react";
import { User, Sparkles, LayoutDashboard, Compass, Settings, Wallet, Calendar, PlusCircle, Activity, ChevronRight } from "lucide-react";
import "./styles.css";

function App() {
  const [activeTab, setActiveTab] = useState("Mesa de Criação");
  const [strangeOpen, setStrangeOpen] = useState(false);

  const navItems = [
    { id: "Mesa de Criação", label: "Mesa de Criação", icon: <LayoutDashboard size={20} /> },
    { id: "Astrologia", label: "Astrologia", icon: <Compass size={20} /> },
    { id: "Painel de Controle", label: "Controle", icon: <Settings size={20} /> },
    { id: "Finanças", label: "Finanças", icon: <Wallet size={20} /> },
    { id: "Agenda", label: "Agenda", icon: <Calendar size={20} /> },
  ];

  // Identifica se a página atual exige o layout 70/30 (Conteúdo / Chat do Agente)
  const isAgentPage = ["Astrologia", "Painel de Controle", "Finanças", "Agenda"].includes(activeTab);

  return (
    <main className="flex h-screen bg-mystic-bg text-mystic-text font-sans overflow-hidden">

      {/* Navegação Lateral: 16rem foca no bege linho */}
      <aside className="w-64 bg-mystic-sidebar flex flex-col pt-12 pb-8 h-full rounded-r-[var(--radius-2xl)] shadow-lg z-20 shrink-0">
        <div className="flex flex-col items-center mb-16">
          <h1 className="text-2xl font-medium text-mystic-text tracking-widest uppercase mb-4">Aurea</h1>
          <div className="w-8 h-1 rounded-full bg-mystic-accent"></div>
        </div>

        <nav className="w-full flex-1 flex flex-col gap-3 px-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[var(--radius-xl)] transition-all duration-500 font-medium text-sm tracking-wide ${activeTab === item.id
                  ? "bg-mystic-bg text-mystic-accent shadow-sm"
                  : "text-mystic-text/70 hover:bg-mystic-bg/50 hover:text-mystic-text"
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Perfil: "Janela de Contexto da Viviane" */}
        <div className="px-6 mt-auto">
          <button
            onClick={() => setActiveTab("Perfil")}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-[var(--radius-xl)] bg-white/50 border border-white hover:bg-white hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-mystic-sidebar flex items-center justify-center text-mystic-accent shadow-sm">
              <User size={18} />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm font-semibold text-mystic-text leading-none">Viviane</span>
              <span className="text-[10px] text-mystic-accent uppercase tracking-widest font-bold">Base de Contexto</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Container Flexível de Conteúdo */}
      <section className="flex-1 flex overflow-hidden p-6 gap-6 relative">

        {/* Conteúdo Principal (Central Scrollable) */}
        <div className={`h-full overflow-y-auto bg-white rounded-[var(--radius-3xl)] shadow-sm border border-black/5 p-12 transition-all duration-500 ${isAgentPage ? "w-[70%]" : "w-full"}`}>

          <header className="mb-12 flex justify-between items-end border-b border-black/5 pb-6">
            <div>
              <h2 className="text-4xl font-light tracking-tight text-mystic-text mb-2">{activeTab}</h2>
              {activeTab === "Perfil" && <p className="text-mystic-text/60">Sua Janela de Contexto Base (O que os agentes sabem sobre você).</p>}
              {activeTab === "Mesa de Criação" && <p className="text-mystic-text/60">Painel de exploração 100% livre (100% de largura).</p>}
              {activeTab === "Finanças" && <p className="text-mystic-text/60">Consultoria offline de baixo risco com Uncle Duck.</p>}
            </div>
            {activeTab === "Astrologia" && (
              <button className="flex items-center gap-2 text-sm bg-mystic-bg text-mystic-accent font-medium px-6 py-3 rounded-[var(--radius-xl)] hover:shadow-md transition-all">
                <PlusCircle size={18} /> Cadastrar Pessoa
              </button>
            )}
          </header>

          {/* Dynamic Views */}
          {activeTab === "Painel de Controle" && (
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-mystic-sidebar rounded-[var(--radius-xl)] p-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-mystic-text/50 mb-6">Laboratório do Stark</h3>
                <div className="flex items-center gap-3 text-sm text-mystic-text bg-white p-4 rounded-[var(--radius-xl)] shadow-sm mb-4">
                  C:\AureaSolaris\Laboratorio_Stark
                </div>
                <p className="text-xs text-mystic-text/60">Comando Rust restrito fisicamente a este diretório.</p>
              </div>
              <div className="bg-mystic-sidebar rounded-[var(--radius-xl)] p-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-mystic-text/50 mb-6">Hardware Health</h3>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-white p-4 rounded-[var(--radius-xl)] text-center shadow-sm">
                    <span className="block text-2xl font-bold text-green-600 mb-1">12%</span>
                    <span className="text-xs font-bold text-mystic-text/50 uppercase">CPU</span>
                  </div>
                  <div className="flex-1 bg-white p-4 rounded-[var(--radius-xl)] text-center shadow-sm">
                    <span className="block text-2xl font-bold text-red-500 mb-1">82%</span>
                    <span className="text-xs font-bold text-mystic-text/50 uppercase">RAM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Finanças" && (
            <div className="bg-[#2C7A7B] text-white rounded-[var(--radius-2xl)] p-12 shadow-xl shadow-[#2C7A7B]/20">
              <h3 className="text-2xl font-light mb-4">Conselhos de Baixo Risco</h3>
              <p className="opacity-90 leading-relaxed font-light text-lg">
                Seus gastos recentes indicam uma excelente curva de poupança. Recomendo alocar 20% do excedente deste mês em reserva de oportunidade. O processamento do Ollama não encontrou divergências nos extratos.
              </p>
            </div>
          )}

          {activeTab === "Astrologia" && (
            <div className="flex justify-center my-16">
              {/* SVG Placeholder Mandala Clean */}
              <svg width="300" height="300" viewBox="0 0 100 100" className="opacity-80">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#B8860B" strokeWidth="0.5" strokeDasharray="2 2" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#B8860B" strokeWidth="0.8" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#B8860B" strokeWidth="0.2" />
                <path d="M50 2 L50 98 M2 50 L98 50 M16 16 L84 84 M16 84 L84 16" stroke="#B8860B" strokeWidth="0.2" />
                <circle cx="50" cy="50" r="8" fill="#F5F1E6" stroke="#B8860B" strokeWidth="1" />
              </svg>
            </div>
          )}

          {activeTab === "Agenda" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4 p-6 bg-blue-50 text-blue-900 rounded-[var(--radius-xl)] border border-blue-100">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1 block">Google Calendar</span>
                  <p className="font-medium">Reunião de Alinhamento (14:00)</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-orange-50 text-orange-900 rounded-[var(--radius-xl)] border border-orange-100">
                <div className="w-2 h-2 mt-2 rounded-full bg-orange-500"></div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-1 block">Todoist + Rafiki (Astrologia)</span>
                  <p className="font-medium">Lua entra em Virgem: Revisar documentos importantes até amanhã.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Coluna 30%: Chat do Agente (Apenas em páginas de Agente) */}
        {isAgentPage && (
          <div className="w-[30%] h-full bg-mystic-sidebar rounded-[var(--radius-3xl)] flex flex-col overflow-hidden shadow-inner border border-black/5">
            <div className="p-8 border-b border-black/5 bg-white/40">
              <h3 className="text-lg font-medium text-mystic-text">Interação</h3>
              <p className="text-xs text-mystic-text/50 mt-1">Chat direto com a Persona via IPC</p>
            </div>
            <div className="flex-1 p-6 flex flex-col justify-end">
              {/* Espaço do Chat Scrollable vai aqui */}
              <div className="w-full bg-white rounded-[var(--radius-xl)] p-2 shadow-sm border border-black/5 flex items-center pr-4 mt-4">
                <input type="text" placeholder="Escreva algo..." className="bg-transparent border-none outline-none flex-1 px-4 py-3 text-sm" />
                <ChevronRight className="text-mystic-accent" size={20} />
              </div>
            </div>
          </div>
        )}

      </section>

      {/* Agente Strange: Floating Action Button (FAB) */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end z-50">
        {strangeOpen && (
          <div className="mb-6 w-80 bg-white rounded-[var(--radius-2xl)] shadow-2xl border border-mystic-accent/20 p-6 transform origin-bottom-right transition-all">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-mystic-accent" size={20} />
              <h3 className="font-medium">Dr. Strange Report</h3>
            </div>
            <p className="text-sm text-mystic-text/70 mb-4 font-light">
              O sistema está fluindo conforme os princípios primordiais. O fluxo astrológico sugere cautela na execução de rotinas intensas nas próximas horas.
            </p>
            <div className="w-full bg-mystic-bg/50 rounded-[var(--radius-xl)] p-2 flex items-center pr-3 border border-black/5">
              <input type="text" placeholder="Consultar oráculo macro..." className="bg-transparent border-none outline-none flex-1 px-3 py-2 text-xs" />
              <ChevronRight className="text-mystic-accent" size={16} />
            </div>
          </div>
        )}
        <button
          onClick={() => setStrangeOpen(!strangeOpen)}
          className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-300 ${strangeOpen ? 'bg-mystic-text text-white' : 'bg-mystic-accent text-white hover:scale-105 hover:shadow-mystic-accent/40'}`}
          title="Dr. Strange"
        >
          <Sparkles size={24} />
        </button>
      </div>

    </main>
  );
}

export default App;
