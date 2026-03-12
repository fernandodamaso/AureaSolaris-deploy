import React from 'react';
import { Sparkles, Star, FileText, CheckCircle } from 'lucide-react';

export const NavItem = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
  <button onClick={onClick} title={label} className={`w-full flex items-center gap-4 px-5 py-3 rounded-lg transition-all duration-300 text-[11px] font-bold uppercase tracking-widest ${active ? 'bg-[#FCF9F1] text-[#B8860B] border border-gold/10' : 'text-gray-500 hover:text-[#333333] hover:bg-gray-50'}`}>
    <span className={active ? 'text-[#B8860B]' : 'opacity-40'}>{icon}</span>
    {!collapsed && <span className="truncate">{label}</span>}
  </button>
);

export const SectionTitle = ({ children, rightAction }: { children: React.ReactNode, rightAction?: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b border-[#B8860B]/10 pb-2 mb-6">
    <h4 className="font-sans text-[10px] uppercase tracking-[0.25em] text-[#B8860B] font-bold">{children}</h4>
    {rightAction}
  </div>
);

export const Card = ({ title, children, icon, className = "" }: { title: string, children: React.ReactNode, icon?: React.ReactNode, className?: string }) => (
  <div className={`panel-light p-6 ${className}`}>
    <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold mb-5 opacity-40 flex items-center gap-2 text-dark">{icon}{title}</h4>
    {children}
  </div>
);

export const Advice = ({ agent, content, icon }: { agent: string, content: string, icon?: React.ReactNode }) => (
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

export const StarRow = ({ icon, name, sign, deg }: { icon: string, name: string, sign: string, deg: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-none group hover:bg-[#FCF9F1] transition-colors rounded-lg px-2">
    <div className="flex items-center gap-4 w-1/3">
      <span className="text-xl text-[#B8860B]">{icon}</span>
      <span className="text-[13px] text-gray-800 font-semibold">{name}</span>
    </div>
    <div className="w-1/3 text-center text-[12px] text-gray-500 font-medium">{sign}</div>
    <div className="w-1/3 text-right text-[11px] text-gray-400 font-mono tracking-tighter">{deg}</div>
  </div>
);

export const FileItem = ({ name, date, onClick }: { name: string, date: string, onClick?: () => void }) => (
  <div onClick={onClick} className="flex justify-between items-center py-3.5 border-b border-gray-100 last:border-none group cursor-pointer hover:bg-gray-50 rounded-xl px-3 transition-all">
    <div className="flex items-center gap-3 text-[13px] text-[#333333] font-medium">
      <div className="p-2 bg-red-50 text-red-400 rounded-lg"><FileText size={14} /></div> {name}
    </div>
    <div className="text-[9px] font-bold uppercase text-gray-400">{date}</div>
  </div>
);

export const RoutineItem = ({ name, time }: { name: string, time: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-none px-2 group hover:bg-[#FCF9F1] transition-all">
    <div className="flex items-center gap-4 text-[13px] text-gray-700 font-medium">
      <div className="w-2 h-2 rounded-full bg-[#B8860B]"></div> {name}
    </div>
    <span className="text-[10px] font-bold text-[#B8860B] bg-[#FCF9F1] px-2 py-1 rounded-lg border border-gold/10">{time}</span>
  </div>
);

export const AspectRow = ({ aspect, desc, bg = 'bg-[#FCF9F1]' }: { aspect: string, desc: string, bg?: string }) => (
  <div className={`flex items-center justify-between p-4 ${bg} rounded-2xl border border-white shadow-sm transition-all hover:shadow-md cursor-default`}>
    <span className="text-[12px] font-bold text-[#333333] tracking-widest uppercase">{aspect}</span>
    <span className="text-[11px] italic text-gray-500 text-right max-w-[60%]">{desc}</span>
  </div>
);

export const FamilyItem = ({ name, data }: { name: string, data: string }) => (
  <div className="p-5 panel-light text-center hover:border-gold transition-all cursor-pointer shadow-sm">
    <p className="font-sans text-[12px] font-bold text-gray-800 mb-2 uppercase tracking-widest">{name}</p>
    <p className="font-sans text-[10px] font-bold text-[#B8860B] bg-[#FCF9F1] py-1.5 rounded-lg">{data}</p>
  </div>
);

export const TodoRow = ({ label, checked }: { label: string, checked: boolean }) => (
  <div className="flex items-center gap-4 p-4 panel-light hover:border-gold/30 transition-all cursor-pointer group shadow-sm">
    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${checked ? 'bg-[#B8860B] border-[#B8860B] text-white' : 'border-gray-200 text-transparent group-hover:border-[#B8860B]/50'}`}>
      <CheckCircle size={14} />
    </div>
    <span className={`text-[13px] font-medium ${checked ? 'line-through text-gray-400' : 'text-[#333333]'}`}>{label}</span>
  </div>
);

export const StatBox = ({ label, val }: { label: string, val: string }) => (
  <div className="panel-light p-8 text-center shadow-sm">
    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#B8860B] mb-2">{label}</p>
    <p className="font-sans text-2xl font-bold text-gray-800">{val}</p>
  </div>
);
