import React, { useState } from 'react';
import { Clock, MapPin, Calendar, Save, UserPlus, X } from 'lucide-react';

interface BirthFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
}

export const BirthForm = ({ onSave, onClose }: BirthFormProps) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      name, 
      date, 
      time, 
      location
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl border border-gold/10 font-sans relative overflow-hidden">
      {/* DECORATIVE ELEMENT */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/5 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold shadow-sm">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Rafiki Astrologia</h2>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">Novo Perfil de Nascimento</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Nome do Ente</label>
            <div className="relative">
              <input 
                required
                className="w-full bg-gray-50/50 p-4 pl-6 rounded-2xl border border-gray-100 font-bold text-gray-800 focus:border-gold/30 outline-none transition-all placeholder:text-gray-200"
                placeholder="Ex: Gabriel Solaris"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Data de Nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/30" size={18} />
                <input 
                  type="date"
                  required
                  className="w-full bg-gray-50/50 p-4 pl-12 rounded-2xl border border-gray-100 font-bold text-gray-800 focus:border-gold/30 outline-none transition-all"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Hora Exata</label>
              <div className="relative">
                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/30" size={18} />
                <input 
                  type="time"
                  required
                  className="w-full bg-gray-50/50 p-4 pl-12 rounded-2xl border border-gray-100 font-bold text-gray-800 focus:border-gold/30 outline-none transition-all"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Cidade/Local</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/30" size={18} />
              <input 
                required
                className="w-full bg-gray-50/50 p-4 pl-12 rounded-2xl border border-gray-100 font-bold text-gray-800 focus:border-gold/30 outline-none transition-all placeholder:text-gray-200"
                placeholder="Ex: São Paulo, SP"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
             <button type="button" onClick={onClose} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-gray-600 transition-all border border-gray-100 rounded-2xl">
               Cancelar
             </button>
             <button type="submit" className="flex-2 py-4 bg-[#333333] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-gold transition-all shadow-lg flex items-center justify-center gap-3 px-12">
               <Save size={16} /> Mapear Destino
             </button>
          </div>
        </form>

        <p className="mt-8 text-[10px] font-bold text-gray-300 uppercase tracking-widest italic text-center">
          Os cálculos usarão o motor Swiss Ephemeris para precisão absoluta.
        </p>
      </div>
    </div>
  );
};
