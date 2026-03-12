import React, { useState, useEffect } from 'react';
import { Card, SectionTitle, Advice } from './common/UIComponents';
import { useAstrologyData } from '../hooks/useAstrologyData';

const HardwareRow = ({ label, val, icon }: { label: string, val: string, icon: React.ReactNode }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-none px-1">
    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
      <div className="p-2 bg-[#FCF9F1] rounded-md text-[#B8860B]">{icon}</div> {label}
    </div>
    <div className="text-[11px] font-black text-gray-700">{val}</div>
  </div>
);

export const ControlePanel = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ uptime: '---', latency: '---', memory: '---', cpu: '---' });
  const [logs, setLogs] = useState<any[]>([]);
  const { getPlanetaryHour } = useAstrologyData();

  useEffect(() => {
    setMetrics({
      uptime: '4d 12h',
      latency: '24ms',
      memory: '1.2GB / 16GB',
      cpu: '2% (Optimized)'
    });
    setLogs([
      { id: 1, text: 'Sincronização com Todoist: Estável', type: 'success' },
      { id: 2, text: 'Cache de transações otimizado', type: 'success' },
      { id: 3, text: 'Backup de Identidade Mestre concluído', type: 'info' }
    ]);
  }, []);

  const planetaryHour = getPlanetaryHour();

  return (
    <div className="space-y-12 animate-in fade-in pb-20 max-w-7xl mx-auto">
      <Advice agent="Stark" content="Sistemas operando em 104% da capacidade nominal. A rede neural Aurea está perfeitamente sincronizada com os ciclos planetários. Recomendo: otimizar núcleos de produtividade na próxima Lua Nova." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* RECURSOS E MÉTRICAS */}
        <div className="lg:col-span-8 space-y-10">
          <SectionTitle>Métricas de Sistema (Stark Lab)</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card title="Recursos do Núcleo" icon={<Cpu size={14}/>}>
                <div className="space-y-1 mt-4">
                   <HardwareRow label="Latência API" val={metrics.latency} icon={<Zap size={14}/>} />
                   <HardwareRow label="Uptime Sistema" val={metrics.uptime} icon={<Clock size={14}/>} />
                   <HardwareRow label="Uso de Memória" val={metrics.memory} icon={<Brain size={14}/>} />
                   <HardwareRow label="Carregamento CPU" val={metrics.cpu} icon={<Activity size={14}/>} />
                </div>
             </Card>

             <Card title="Logs de Integridade" icon={<Activity size={14}/>}>
                <div className="space-y-3 mt-4">
                   {logs.map((log: any) => (
                     <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : 'bg-gold'}`} />
                        <span className="text-[11px] font-bold text-gray-600">{log.text}</span>
                     </div>
                   ))}
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

      <SectionTitle>Painel de Controle (Alma dos Agentes)</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
         {['Rafiki', 'Alfred', 'Stark', 'Uncle Duck'].map(n => (
           <div key={n} onClick={() => setEditing(n)} className="p-5 bg-white border border-gray-100 rounded-none cursor-pointer hover:border-gold/30 transition-all shadow-xs group">
              <div className="flex justify-between items-center mb-2">
                 <h5 className="font-black text-gray-700 uppercase text-[10px] tracking-[0.2em]">{n}</h5>
                 <Settings size={12} className="text-gray-300 group-hover:text-gold transition-all" />
              </div>
              <p className="text-[11px] text-gray-400 font-bold opacity-60">Moldar diretrizes comportamentais.</p>
           </div>
         ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/5backdrop-blur-xs px-4 font-sans animate-in fade-in zoom-in-95">
           <div className="bg-white rounded-xl p-8 w-full max-w-xl shadow-2xl border border-gold/10">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-sans text-[12px] font-black uppercase tracking-[0.3em] text-gray-700">Forjar Alma: {editing}</h3>
                 <X onClick={() => setEditing(null)} className="cursor-pointer text-gray-300 hover:text-red-500 transition-colors" size={18}/>
              </div>
              <textarea className="w-full h-64 bg-gray-50 p-5 rounded-lg outline-none focus:border-gold/20 border border-gray-100 text-[12px] leading-relaxed font-sans font-bold text-gray-600" defaultValue={`Instruções mestras para ${editing}...`} />
              <div className="flex justify-end mt-6">
                <button onClick={() => setEditing(null)} className="px-8 py-3 bg-[#333333] text-white rounded-none font-black text-[9px] uppercase tracking-widest hover:bg-gold transition-all shadow-md">Gravar Alma</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
