import { useState, useEffect, useRef } from 'react';
import { 
  X, Save, User, 
  CalendarDays, 
  Key, Palette, Camera
} from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface ProfileEditorProps {
  profile: any;
  onSave: (updates: any) => void;
  onClose: () => void;
  onLogout: () => void;
}

const BRAZILIAN_CITIES = [
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, timezone: 'America/Sao_Paulo' },
  { name: 'Belo Horizonte', lat: -19.9167, lon: -43.9345, timezone: 'America/Sao_Paulo' },
  { name: 'Brasília', lat: -15.7975, lon: -47.8919, timezone: 'America/Sao_Paulo' },
  { name: 'Salvador', lat: -12.9714, lon: -38.5124, timezone: 'America/Bahia' },
  { name: 'Curitiba', lat: -25.4284, lon: -49.2733, timezone: 'America/Sao_Paulo' },
  { name: 'Recife', lat: -8.0476, lon: -34.8770, timezone: 'America/Recife' },
  { name: 'Porto Alegre', lat: -30.0346, lon: -51.2177, timezone: 'America/Sao_Paulo' },
  { name: 'Manaus', lat: -3.1190, lon: -60.0217, timezone: 'America/Manaus' },
  { name: 'Fortaleza', lat: -3.7172, lon: -38.5433, timezone: 'America/Fortaleza' },
];

function formatBirthDate(isoDate?: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate;
}

function parseBirthDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

export const ProfileEditor = ({ profile, onSave, onClose, onLogout }: ProfileEditorProps) => {
  const [name, setName] = useState(profile.name || '');
  const [birthDateInput, setBirthDateInput] = useState(() => formatBirthDate(profile.birthDate));
  const [birthDateError, setBirthDateError] = useState('');
  const [birthTime, setBirthTime] = useState(profile.birthTime || '');
  const [birthCity, setBirthCity] = useState(profile.birthCity || '');
  const [context, setContext] = useState(profile.context || '');
  const [dialogStyle, setDialogStyle] = useState(profile.dialogStyle || 'Inteligente e Poética');
  const [natalPreview, setNatalPreview] = useState<string>('');
  const [loadingNatal, setLoadingNatal] = useState(false);
  const [avatar, setAvatar] = useState<string>(profile.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const birthDate = parseBirthDate(birthDateInput);

  // Calculate natal preview when birth data changes
  useEffect(() => {
    if (!birthDate || !birthTime || !birthCity) {
      setNatalPreview('');
      setLoadingNatal(false);
      return;
    }
    const calculatePreview = async () => {
      setLoadingNatal(true);
      try {
        const [y, m, d] = birthDate.split('-').map(Number);
        const [h, min] = birthTime.split(':').map(Number);
        const city = BRAZILIAN_CITIES.find(c => c.name === birthCity);
        if (!city) {
          setNatalPreview('Selecione uma cidade com coordenadas verificadas.');
          return;
        }
        
        const payload = { year: y, month: m, day: d, hour: h + (min / 60), lat: city.lat, lon: city.lon, timezone: city.timezone };
        let result: string | null = null;
        
        // Try direct HTTP to sidecar first (works in both Tauri and browser dev mode)
        try {
          const res = await fetch('http://127.0.0.1:9876/natal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) result = await res.text();
        } catch { /* sidecar not reachable, fall through to Tauri invoke */ }
        
        // Fallback to Tauri invoke if direct HTTP failed
        if (!result) {
          result = await safeInvoke<string>('run_astro_engine', { payload: JSON.stringify(payload) });
        }
        
        if (result) {
          const data = JSON.parse(result);
          if (data.planets) {
            const summary = Object.entries(data.planets)
              .filter(([name]) => !['ASC', 'MC', 'DSC', 'IC', 'Chiron'].includes(name))
              .slice(0, 6)
              .map(([name, info]: [string, any]) => {
                const deg = Math.floor(info.pos_in_sign ?? 0);
                const min = Math.round(((info.pos_in_sign ?? 0) % 1) * 60);
                return `${name}: ${deg}°${min > 0 ? `${String(min).padStart(2, '0')}'` : ''} ${info.sign_full || info.sign || '?'}`;
              })
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (birthDateInput.trim() && !birthDate) {
      setBirthDateError('Use a data no formato DD/MM/AAAA. O conteúdo digitado não foi alterado.');
      return;
    }
    setBirthDateError('');
    if ((birthDate || birthTime) && (!birthDate || !birthTime)) {
      alert('Informe data e hora de nascimento antes de salvar o mapa.');
      return;
    }
    const city = BRAZILIAN_CITIES.find(c => c.name === birthCity);
    if ((birthDate || birthTime) && !city) {
      alert('Selecione a cidade de nascimento. O Aurea não presume coordenadas.');
      return;
    }
    
    // Build natal data for the system
    let natal = profile.natal;
    if (birthDate && birthTime && city) {
      // Store birth data for future calculations
      natal = {
        ...profile.natal,
        birthDate,
        birthTime,
        birthCity,
        lat: city.lat,
        lon: city.lon,
        timezone: city.timezone,
      };
    }

    onSave({
      avatar,
      name,
      birthDate,
      birthTime,
      birthCity,
      birthTimezone: city?.timezone,
      context,
      dialogStyle,
      natal,
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 animate-in fade-in font-sans"
      onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#FCF9F1] rounded-2xl p-8 w-full max-w-5xl shadow-2xl border border-gold/30 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gold/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-lg text-gold"><User size={24}/></div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-gray-800">Sua Identidade</h2>
              <p className="text-[9px] font-bold text-gold uppercase tracking-widest">Configurações do Perfil</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all">
            <X size={20}/>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT: Identity */}
          <div className="col-span-5 space-y-6">
            
            {/* Avatar + Name */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div 
                  className="w-28 h-28 rounded-full bg-white shadow-xl border-4 border-white overflow-hidden flex items-center justify-center text-gold/20 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-gold text-white rounded-full shadow-lg hover:scale-110 transition-all"
                >
                  <Camera size={12} />
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="w-full">
                <label className="text-[9px] font-black uppercase text-gray-400 pl-2 tracking-widest block mb-2">Nome</label>
                <input 
                  className="w-full bg-white p-4 rounded-lg border border-gold/10 font-bold text-gray-800 outline-none focus:border-gold/30 transition-all" 
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
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday"
                    maxLength={10}
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-[12px] font-bold text-gray-800 outline-none focus:border-gold/30"
                    value={birthDateInput}
                    aria-invalid={Boolean(birthDateError)}
                    aria-describedby={birthDateError ? 'profile-birth-date-error' : undefined}
                    onChange={e => { setBirthDateInput(e.target.value); setBirthDateError(''); }}
                    onBlur={() => {
                      if (birthDateInput.trim() && !parseBirthDate(birthDateInput)) {
                        setBirthDateError('Use DD/MM/AAAA. O conteúdo digitado foi preservado.');
                      }
                    }}
                    placeholder="DD/MM/AAAA"
                  />
                  {birthDateError && <p id="profile-birth-date-error" role="alert" className="mt-1 text-[10px] font-bold text-red-600">{birthDateError}</p>}
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Hora</label>
                  <input 
                    type="time"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-[12px] font-bold text-gray-800 outline-none focus:border-gold/30"
                    value={birthTime}
                    onChange={e => setBirthTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Cidade</label>
                <select 
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-[12px] font-bold text-gray-800 outline-none focus:border-gold/30 cursor-pointer"
                  value={birthCity}
                  onChange={e => setBirthCity(e.target.value)}
                >
                  <option value="">Selecione a cidade...</option>
                  {BRAZILIAN_CITIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-[9px] font-semibold text-gray-500">
                  Fuso IANA: <span className="font-mono text-gray-700">{BRAZILIAN_CITIES.find(c => c.name === birthCity)?.timezone || 'selecione a cidade'}</span>
                </p>
              </div>

              {/* Natal Preview */}
              <div className="bg-[#FCF9F1] p-4 rounded-lg border border-gold/10">
                <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-2">Preview do Mapa Natal</p>
                {loadingNatal ? (
                  <p className="text-[10px] text-gold animate-pulse italic">Calculando posições...</p>
                ) : natalPreview ? (
                  <p className="text-[11px] font-bold text-gray-700 leading-relaxed">{natalPreview}</p>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">Preencha data, hora e cidade para calcular o mapa</p>
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
                className="w-full h-28 bg-white p-4 rounded-lg outline-none border border-gold/10 resize-none text-[13px] text-gray-600 font-medium leading-relaxed focus:border-gold/30 transition-all" 
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Conte sobre você: rotina, filhos, estudos, foco atual..."
              />
            </div>

            {/* Agent Preferences */}
            <div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 pl-2 tracking-widest block mb-1 flex items-center gap-2">
                  <Palette size={10}/> Tom de Voz
                </label>
                <select 
                  className="w-full bg-white p-3 rounded-lg border border-gold/10 text-[12px] font-bold outline-none cursor-pointer focus:border-gold/30 transition-all"
                  value={dialogStyle}
                  onChange={e => setDialogStyle(e.target.value)}
                >
                  <option>Inteligente e Poética</option>
                  <option>Direta e Técnica</option>
                  <option>Mística e Oracular</option>
                  <option>Maternal e Acolhedora</option>
                </select>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white/40 p-6 rounded-[1.5rem] border border-gold/5 shadow-inner space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2 pb-3 border-b border-gray-100">
                <Key size={12}/> Segurança & Acesso
              </h4>
              <p className="text-[11px] leading-relaxed text-gray-500">A senha é definida somente no acesso inicial. Alteração de senha e recuperação serão liberadas junto ao cofre local criptografado.</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-between items-center border-t border-gold/10 pt-6">
          <button 
            onClick={onLogout} 
            className="px-6 py-3 bg-red-500/10 text-red-500 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
          >
            <X size={12} /> Sair
          </button>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-3 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-gray-600 transition-all">Cancelar</button>
            <button onClick={handleSave} className="px-10 py-3 bg-[#333333] text-white rounded-lg font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gold transition-all shadow-lg flex items-center gap-2">
              <Save size={12} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
