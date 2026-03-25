import { useState, useEffect } from 'react';
import { 
  X, Save, User, 
  Sparkles, CalendarDays, 
  Eye, EyeOff, Key, Palette
} from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface ProfileEditorProps {
  profile: any;
  onSave: (updates: any) => void;
  onClose: () => void;
  onLogout: () => void;
}

const BRAZILIAN_CITIES = [
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
  { name: 'Belo Horizonte', lat: -19.9167, lon: -43.9345 },
  { name: 'Brasília', lat: -15.7975, lon: -47.8919 },
  { name: 'Salvador', lat: -12.9714, lon: -38.5124 },
  { name: 'Curitiba', lat: -25.4284, lon: -49.2733 },
  { name: 'Recife', lat: -8.0476, lon: -34.8770 },
  { name: 'Porto Alegre', lat: -30.0346, lon: -51.2177 },
  { name: 'Manaus', lat: -3.1190, lon: -60.0217 },
  { name: 'Fortaleza', lat: -3.7172, lon: -38.5433 },
];

export const ProfileEditor = ({ profile, onSave, onClose, onLogout }: ProfileEditorProps) => {
  const [name, setName] = useState(profile.name || '');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');
  const [birthTime, setBirthTime] = useState(profile.birthTime || '');
  const [birthCity, setBirthCity] = useState(profile.birthCity || 'São Paulo');
  const [context, setContext] = useState(profile.context || '');
  const [dialogStyle, setDialogStyle] = useState(profile.dialogStyle || 'Inteligente e Poética');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [natalPreview, setNatalPreview] = useState<string>('');
  const [loadingNatal, setLoadingNatal] = useState(false);

  // Calculate natal preview when birth data changes
  useEffect(() => {
    if (!birthDate || !birthTime) return;
    const calculatePreview = async () => {
      setLoadingNatal(true);
      try {
        const [y, m, d] = birthDate.split('-').map(Number);
        const [h, min] = birthTime.split(':').map(Number);
        const city = BRAZILIAN_CITIES.find(c => c.name === birthCity) || BRAZILIAN_CITIES[0];
        
        const payload = JSON.stringify({
          year: y, month: m, day: d,
          hour: h + (min / 60),
          lat: city.lat, lon: city.lon
        });
        
        const result = await safeInvoke<string>('run_astro_engine', { payload });
        if (result) {
          const data = JSON.parse(result);
          if (data.planets) {
            const summary = Object.entries(data.planets)
              .slice(0, 6)
              .map(([name, info]: [string, any]) => `${name}: ${info.pos_in_sign?.toFixed(0) || 0}° ${info.sign || '?'}`)
              .join(' | ');
            setNatalPreview(summary);
          }
        }
      } catch (e) {
        setNatalPreview('Erro ao calcular mapa');
      } finally {
        setLoadingNatal(false);
      }
    };
    const timer = setTimeout(calculatePreview, 800);
    return () => clearTimeout(timer);
  }, [birthDate, birthTime, birthCity]);

  const handleSave = () => {
    const city = BRAZILIAN_CITIES.find(c => c.name === birthCity) || BRAZILIAN_CITIES[0];
    
    // Build natal data for the system
    let natal = profile.natal;
    if (birthDate && birthTime) {
      // Store birth data for future calculations
      natal = {
        ...profile.natal,
        birthDate,
        birthTime,
        birthCity,
        lat: city.lat,
        lon: city.lon,
      };
    }

    onSave({
      name,
      birthDate,
      birthTime,
      birthCity,
      context,
      dialogStyle,
      natal,
      ...(password ? { password } : {}),
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 animate-in fade-in font-sans"
      onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#FCF9F1] rounded-[2.5rem] p-8 w-full max-w-5xl shadow-2xl border border-gold/30 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gold/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-2xl text-gold"><User size={24}/></div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-gray-800">Sua Identidade</h2>
              <p className="text-[9px] font-bold text-gold uppercase tracking-widest">Configurações do Perfil</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all">
            <X size={20}/>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT: Identity */}
          <div className="col-span-5 space-y-6">
            
            {/* Avatar + Name */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-white shadow-xl border-4 border-white overflow-hidden flex items-center justify-center text-gold/20">
                  <User size={48} />
                </div>
                <button className="absolute bottom-1 right-1 p-2 bg-gold text-white rounded-full shadow-lg hover:scale-110 transition-all">
                  <Sparkles size={12} />
                </button>
              </div>
              <div className="w-full">
                <label className="text-[9px] font-black uppercase text-gray-400 pl-2 tracking-widest block mb-2">Nome</label>
                <input 
                  className="w-full bg-white p-4 rounded-2xl border border-gold/10 font-bold text-gray-800 outline-none focus:border-gold/30 transition-all" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Birth Data - Structured */}
            <div className="bg-white/60 p-6 rounded-[1.5rem] border border-gold/10 space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gold flex items-center gap-2">
                <CalendarDays size={12}/> Dados de Nascimento
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Data</label>
                  <input 
                    type="date"
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-[12px] font-bold text-gray-800 outline-none focus:border-gold/30"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Hora</label>
                  <input 
                    type="time"
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-[12px] font-bold text-gray-800 outline-none focus:border-gold/30"
                    value={birthTime}
                    onChange={e => setBirthTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Cidade</label>
                <select 
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-[12px] font-bold text-gray-800 outline-none focus:border-gold/30 cursor-pointer"
                  value={birthCity}
                  onChange={e => setBirthCity(e.target.value)}
                >
                  {BRAZILIAN_CITIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Natal Preview */}
              <div className="bg-[#FCF9F1] p-4 rounded-xl border border-gold/10">
                <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-2">Preview do Mapa Natal</p>
                {loadingNatal ? (
                  <p className="text-[10px] text-gold animate-pulse italic">Calculando posições...</p>
                ) : natalPreview ? (
                  <p className="text-[11px] font-bold text-gray-700 leading-relaxed">{natalPreview}</p>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">Preencha data e hora para ver o mapa</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Preferences + Security */}
          <div className="col-span-7 space-y-6">
            
            {/* Context */}
            <div>
              <label className="text-[9px] font-black uppercase text-gray-400 pl-2 tracking-widest block mb-2">Contexto Pessoal</label>
              <textarea 
                className="w-full h-28 bg-white p-4 rounded-2xl outline-none border border-gold/10 resize-none text-[13px] text-gray-600 font-medium leading-relaxed focus:border-gold/30 transition-all" 
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Conte sobre você: rotina, filhos, estudos, foco atual..."
              />
            </div>

            {/* Dialog Style */}
            <div>
              <label className="text-[9px] font-black uppercase text-gray-400 pl-2 tracking-widest block mb-2 flex items-center gap-2">
                <Palette size={10}/> Estilo de Diálogo
              </label>
              <select 
                className="w-full bg-white p-4 rounded-2xl border border-gold/10 text-[13px] font-bold outline-none cursor-pointer focus:border-gold/30 transition-all"
                value={dialogStyle}
                onChange={e => setDialogStyle(e.target.value)}
              >
                <option>Inteligente e Poética</option>
                <option>Direta e Técnica</option>
                <option>Mística e Oracular</option>
                <option>Maternal e Acolhedora</option>
              </select>
            </div>

            {/* Security */}
            <div className="bg-white/40 p-6 rounded-[1.5rem] border border-gold/5 shadow-inner space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2 pb-3 border-b border-gray-100">
                <Key size={12}/> Segurança & Acesso
              </h4>
              <div>
                <label className="text-[8px] font-black uppercase text-red-400/60 tracking-widest block mb-1">Senha</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white p-4 rounded-2xl border border-gold/5 font-bold text-gray-800 outline-none focus:border-gold/30 transition-all pr-12" 
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gold transition-all"
                  >
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Email de Recuperação</label>
                <input className="w-full bg-white p-4 rounded-2xl border border-gold/5 font-bold text-gray-800 text-[12px] outline-none focus:border-gold/30 transition-all" placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-between items-center border-t border-gold/10 pt-6">
          <button 
            onClick={onLogout} 
            className="px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
          >
            <X size={12} /> Sair
          </button>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-3 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-gray-600 transition-all">Cancelar</button>
            <button onClick={handleSave} className="px-10 py-3 bg-[#333333] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gold transition-all shadow-lg flex items-center gap-2">
              <Save size={12} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
