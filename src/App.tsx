import { useState } from "react";
import "./styles.css";

function App() {
  const [activeTab, setActiveTab] = useState("Strange");

  return (
    <main className="flex h-screen bg-tarot-bg text-tarot-dark font-body overflow-hidden">
      {/* Menu Lateral Estilo Tarô */}
      <aside className="w-64 bg-[#efebe1] border-r border-[#dcd7c9] flex flex-col items-center py-8 shadow-sm">
        <div className="w-16 h-16 rounded-full border-2 border-tarot-accent mb-4 flex items-center justify-center">
          {/* Espaço para uma Mandala central logo */}
          <span className="text-tarot-accent font-tarot text-2xl">AS</span>
        </div>
        <h1 className="text-xl font-tarot text-tarot-dark tracking-widest mb-10">Aurea Solaris</h1>

        <nav className="w-full flex-1 flex flex-col gap-2 px-4">
          {["Strange", "Rafiki", "Stark", "Uncle Duck", "Alfred"].map((agent) => (
            <button
              key={agent}
              onClick={() => setActiveTab(agent)}
              className={`w-full text-left px-4 py-3 rounded-md transition-all duration-300 font-medium ${activeTab === agent
                  ? "bg-tarot-accent text-white shadow-md transform scale-105"
                  : "text-tarot-dark hover:bg-[#e0dbcd]"
                }`}
            >
              {agent}
            </button>
          ))}
        </nav>
      </aside>

      {/* Conteúdo Central */}
      <section className="flex-1 flex flex-col p-8">
        <header className="mb-8">
          <h2 className="text-3xl font-tarot">Agente {activeTab}</h2>
          <p className="text-sm text-gray-500 mt-2">Área de Roteamento (Em Construção)</p>
        </header>

        <div className="flex-1 bg-white rounded-lg shadow-sm border border-[#e0dbcd] p-6 flex flex-col items-center justify-center">
          {activeTab === "Stark" && (
            <div className="text-center">
              <p className="text-lg font-bold text-red-600 mb-2">⚠️ Laboratório de Segurança ⚠️</p>
              <p>Stark só possui acesso a <code className="bg-gray-100 px-2 py-1 rounded">C:\AureaSolaris\Laboratorio_Stark</code></p>
            </div>
          )}
          {activeTab !== "Stark" && (
            <p className="opacity-50">Interface de conversação offline conectada ao Rust...</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
