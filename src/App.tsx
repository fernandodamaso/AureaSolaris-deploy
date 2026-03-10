import { useState } from "react";
import { User, Sparkles, LayoutDashboard, Compass, Settings, Wallet, Calendar, PlusCircle } from "lucide-react";
import "./styles.css";

function App() {
  const [activeTab, setActiveTab] = useState("Brainstorming");

  const navItems = [
    { id: "Brainstorming", label: "Brainstorming", icon: <LayoutDashboard size={20} /> },
    { id: "Astrologia", label: "Astrologia", icon: <Compass size={20} /> },
    { id: "Painel de Controle", label: "Painel de Controle", icon: <Settings size={20} /> },
    { id: "Finanças", label: "Finanças", icon: <Wallet size={20} /> },
    { id: "Agenda", label: "Agenda", icon: <Calendar size={20} /> },
  ];

  return (
    <main className="flex h-screen bg-celestial-bg text-celestial-text font-body overflow-hidden relative selection:bg-white/20">

      {/* Menu Lateral Estilo Celestial */}
      <aside className="w-72 bg-black/40 border-r border-celestial-muted flex flex-col items-center py-8 shadow-2xl backdrop-blur-sm z-10">

        {/* Header da Sidebar */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-full border border-celestial-muted mb-4 flex items-center justify-center relative overflow-hidden group hover:border-white transition-colors">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-white font-light text-2xl tracking-widest">SO</span>
          </div>
          <h1 className="text-xl text-white tracking-[0.2em] font-light">AUREA SOLARIS</h1>
        </div>

        {/* Navegação Principal */}
        <nav className="w-full flex-1 flex flex-col gap-1 px-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 font-light text-sm tracking-wide ${activeTab === item.id
                  ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border border-transparent"
                }`}
            >
              <span className={activeTab === item.id ? "text-white" : "text-neutral-500"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Rodapé da Sidebar: Identidade/Login (Canto Inferior Esquerdo) */}
        <div className="w-full px-6 mt-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-celestial-muted hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
              <User size={16} className="text-neutral-400" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm text-white font-medium">Vivica</span>
              <span className="text-xs text-neutral-500">Autenticada</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Conteúdo Central */}
      <section className="flex-1 flex flex-col p-10 overflow-y-auto relative z-0">
        <header className="mb-10 border-b border-celestial-muted pb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-light text-white tracking-wide">{activeTab}</h2>
            <p className="text-sm text-neutral-500 mt-2 font-light tracking-wide">
              {activeTab === "Brainstorming" && "Painel de ideação infinito (Miro-like) local."}
              {activeTab === "Astrologia" && "Mapas natais, transitos do céu e cruzamentos (Rafiki)."}
              {activeTab === "Painel de Controle" && "Saúde do sistema, tokens e arquivos (Stark)."}
              {activeTab === "Finanças" && "Relatórios financeiros 100% offline via Ollama (Uncle Duck)."}
              {activeTab === "Agenda" && "Google Calendar & Todoist gerenciados por IA (Alfred)."}
            </p>
          </div>
          {activeTab === "Astrologia" && (
            <button className="flex items-center gap-2 text-sm text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10">
              <PlusCircle size={16} /> Add Pessoa (Mapa)
            </button>
          )}
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 bg-black/20 rounded-2xl border border-celestial-muted p-8 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Decorações Cósmicas de Fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          {activeTab === "Painel de Controle" && (
            <div className="text-center bg-black/40 p-8 rounded-2xl border border-red-900/50 shadow-2xl backdrop-blur-md">
              <p className="text-xl font-medium text-red-500 mb-3 tracking-widest uppercase">Laboratório Stark</p>
              <p className="text-neutral-400 font-light">
                Stark só possui acesso isolado ao diretório: <br />
                <code className="bg-black border border-neutral-800 px-3 py-1.5 rounded text-neutral-300 mt-4 inline-block font-mono text-sm">C:\AureaSolaris\Laboratorio_Stark</code>
              </p>
            </div>
          )}

          {activeTab !== "Painel de Controle" && (
            <div className="flex flex-col items-center text-center opacity-40">
              <div className="w-32 h-32 rounded-full border-[0.5px] border-white/20 flex flex-col items-center justify-center mb-6 relative">
                <div className="absolute inset-2 rounded-full border-[0.5px] border-white/10 border-dashed"></div>
                <div className="absolute inset-6 rounded-full border-[0.5px] border-white/5"></div>
                <Sparkles size={24} className="text-white/50" />
              </div>
              <p className="font-light tracking-wide">Construindo as funcionalidades nativas...</p>
            </div>
          )}
        </div>
      </section>

      {/* Botão Flutuante: Dr. Strange (Canto Inferior Direito) */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300 z-50 group"
        title="Dr. Strange (Dicas e Correções)"
      >
        <Sparkles size={24} className="text-black group-hover:rotate-12 transition-transform" />
      </button>

    </main>
  );
}

export default App;
