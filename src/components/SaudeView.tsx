import React from 'react';
import { FileText, Star, Heart, Brain, Activity } from 'lucide-react';
import { Card, SectionTitle, Advice, FileItem, RoutineItem, TodoRow } from './common/UIComponents';

export const SaudeView = () => (
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
