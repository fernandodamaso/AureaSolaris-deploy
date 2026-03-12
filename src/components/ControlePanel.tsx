import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Clock, Brain, Activity, Settings, X } from 'lucide-react';
import { Card, SectionTitle } from './common/UIComponents';

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

  useEffect(() => {
    // Mocking real metrics
    setMetrics({
      uptime: '4d 12h',
      latency: '24ms',
      memory: '1.2GB / 16GB',
      cpu: '4% (Aurea Idle)'
    });
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
      <div className="grid grid-cols-2 gap-4">
         {['Rafiki', 'Alfred', 'Stark', 'Uncle Duck'].map(n => (
           <div key={n} onClick={() => setEditing(n)} className="p-5 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-gold/30 transition-all shadow-xs group">
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
                <button onClick={() => setEditing(null)} className="px-8 py-3 bg-[#333333] text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-gold transition-all shadow-md">Gravar Alma</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
