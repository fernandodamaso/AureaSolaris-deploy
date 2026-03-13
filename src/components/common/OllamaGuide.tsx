import { useState } from 'react';
import { Download, Terminal, Play, ShieldCheck, Check, ChevronRight, ExternalLink, Cpu } from 'lucide-react';

export const OllamaGuide = ({ onClose }: { onClose?: () => void }) => {
  const [step, setStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "Protocolo de Download",
      desc: "Baixe o executável oficial do Ollama para Windows. Ele servirá como o núcleo de hardware para a sua IA local.",
      icon: <Download size={20} />,
      action: "Baixar Ollama",
      link: "https://ollama.com/download/windows"
    },
    {
      id: 2,
      title: "Instalação & Warmup",
      desc: "Execute o instalador e aguarde a finalização. Uma vez instalado, o Ollama rodará silenciosamente no seu 'system tray'.",
      icon: <Play size={20} />,
    },
    {
      id: 3,
      title: "Injeção de Modelo",
      desc: "Abra seu terminal (PowerShell ou CMD) e digite o comando abaixo para baixar o modelo Llama 3 (ou seu preferido).",
      icon: <Terminal size={20} />,
      command: "ollama run llama3"
    },
    {
      id: 4,
      title: "Escudo Ativo",
      desc: "Com o Ollama rodando, o Aurea Solaris detectará automaticamente o motor local. Seus dados financeiros agora estão protegidos por criptografia de hardware local.",
      icon: <ShieldCheck size={20} />,
    }
  ];

  return (
    <div className="bg-white border border-gold/10 overflow-hidden flex flex-col h-full max-h-[80vh]">
      <div className="bg-[#333333] p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12"><Cpu size={120} className="text-white"/></div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-gold mb-3">Stark Intelligence Protocol</h2>
        <h3 className="text-xl font-black text-white tracking-tight">Ativação de IA Local (Ollama)</h3>
        <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">Privacidade Absoluta: Seus dados nunca saem da sua rede local.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
        {steps.map((s) => (
          <div key={s.id} className={`flex gap-6 transition-all duration-500 ${step >= s.id ? 'opacity-100' : 'opacity-20 translate-y-4'}`}>
            <div className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all ${step > s.id ? 'bg-emerald-500 border-emerald-500 text-white' : step === s.id ? 'border-gold text-gold shadow-[0_0_15px_rgba(184,134,11,0.2)]' : 'border-gray-100 text-gray-300'}`}>
              {step > s.id ? <Check size={20} /> : s.icon}
            </div>
            <div className="flex-1 pt-1">
              <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-800 mb-2">{s.title}</h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4">{s.desc}</p>
              
              {s.link && step === s.id && (
                <a href={s.link} target="_blank" rel="noreferrer" onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-white text-[9px] font-black uppercase tracking-widest hover:bg-gold/90 transition-all shadow-md">
                  {s.action} <ExternalLink size={12} />
                </a>
              )}

              {s.command && step === s.id && (
                <div className="bg-gray-50 p-4 border border-gray-100 rounded-lg flex justify-between items-center group">
                  <code className="text-[11px] font-mono font-bold text-gray-600">{s.command}</code>
                  <button onClick={() => setStep(4)} className="text-[9px] font-black uppercase tracking-widest text-gold hover:underline">Copiar & Concluir</button>
                </div>
              )}

              {s.id === 2 && step === s.id && (
                <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#333333] text-white text-[9px] font-black uppercase tracking-widest hover:bg-gold transition-all shadow-md">
                   Prosseguir <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Aguardando Conexão Local</span>
         </div>
         {onClose && (
           <button onClick={onClose} className="text-[9px] font-black uppercase text-gray-800 tracking-widest border-b border-gray-800 hover:text-gold hover:border-gold transition-all">Fechar Guia</button>
         )}
      </div>
    </div>
  );
};
