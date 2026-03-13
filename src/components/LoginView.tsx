import { useState } from 'react';
import { 
  ShieldCheck, Key, 
  ChevronRight, Sparkles, Star,
  Lock, ArrowRight, Eye, EyeOff
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar?: string;
  connections?: any[];
  password?: string;
  natal?: any;
}

interface LoginViewProps {
  profiles: Profile[];
  onLogin: (profileId: string, password?: string) => void;
  onSignUp: (name: string, password?: string) => void;
}

export const LoginView = ({ profiles, onLogin, onSignUp }: LoginViewProps) => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [newName, setNewName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!selectedProfile) return;
    onLogin(selectedProfile.id, password);
  };

  const handleSignUp = () => {
    if (!newName.trim()) return;
    onSignUp(newName, password);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#FCF9F1] flex items-center justify-center overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#FCF9F1_100%)]" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-lg p-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo/Icon */}
        <div className="flex flex-col items-center mb-12 text-center">
           <div className="relative mb-6">
              <div className="absolute inset-0 bg-gold/10 blur-xl rounded-full" />
              <div className="relative p-6 bg-white border border-gold/20 rounded-full shadow-lg">
                 <ShieldCheck size={48} className="text-gold" />
              </div>
           </div>
           <h1 className="text-3xl font-black uppercase tracking-[0.5em] text-gray-800 mb-2">Aurea Solaris</h1>
           <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8860B]/60 italic">Protocolo de Identidade Ativa</p>
        </div>

        {/* Tab Switcher */}
        {!selectedProfile && (
          <div className="flex bg-gold/5 p-1 rounded-full mb-10 border border-gold/10">
            <button 
              onClick={() => { setMode('signIn'); setSelectedProfile(null); }} 
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'signIn' ? 'bg-[#333333] text-white shadow-md' : 'text-gray-400 hover:text-gold'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setMode('signUp'); setSelectedProfile(null); }} 
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'signUp' ? 'bg-[#333333] text-white shadow-md' : 'text-gray-400 hover:text-gold'}`}
            >
              Inscrever-se
            </button>
          </div>
        )}

        {!selectedProfile ? (
          mode === 'signIn' ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-2">Selecionar Identidade</h2>
               <div className="grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                  {profiles.map(profile => (
                    <button 
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className="group relative flex items-center gap-4 bg-white border border-gold/5 p-6 rounded-2xl hover:bg-[#FCF9F1] hover:border-gold/30 transition-all text-left shadow-sm"
                    >
                       <div className="w-14 h-14 bg-[#FCF9F1] border border-gold/10 flex items-center justify-center rounded-xl overflow-hidden group-hover:border-gold/30 transition-all shadow-inner">
                          {profile.avatar ? (
                            <img src={profile.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Sparkles size={24} className="text-gold/30" />
                          )}
                       </div>
                       <div className="flex-1">
                          <p className="text-[15px] font-black text-gray-800 tracking-widest uppercase">{profile.name}</p>
                          <p className="text-[9px] font-bold text-[#B8860B]/50 uppercase tracking-tighter">Sua Identidade Ativa</p>
                       </div>
                       <ChevronRight size={18} className="text-gold/20 group-hover:text-gold transition-all" />
                    </button>
                  ))}
                  {profiles.length === 0 && (
                    <div className="bg-white/50 border border-dashed border-gold/20 p-12 rounded-[2rem] text-center">
                        <p className="text-gray-400 text-[11px] font-black uppercase italic tracking-widest leading-relaxed">
                          Nenhuma identidade detectada.<br/>Inicie seu protocolo na aba "Inscrever-se".
                        </p>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-2">Iniciar Nova Jornada</h2>
               <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 block pl-1">Nome de Batismo</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Viviane Solaris"
                      className="w-full bg-white border border-gold/10 p-5 rounded-2xl text-gray-800 font-bold outline-none focus:border-gold/40 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 block pl-1">Chave de Proteção (Senha)</label>
                    <div className="relative">
                       <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/30" size={18} />
                       <input 
                         type={showPassword ? "text" : "password"} 
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full bg-white border border-gold/10 p-5 pl-14 rounded-2xl text-gray-800 font-bold outline-none focus:border-gold/40 transition-all shadow-sm"
                       />
                    </div>
                  </div>
                  <button 
                    onClick={handleSignUp}
                    className="w-full py-6 bg-[#333333] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] hover:bg-gold transition-all shadow-xl flex items-center justify-center gap-3"
                  >
                     Selar Identidade <ArrowRight size={16} />
                  </button>
               </div>
            </div>
          )
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-6 mb-8 bg-gold/5 p-4 rounded-[2rem] border border-gold/10">
                <button onClick={() => setSelectedProfile(null)} className="p-3 bg-white hover:bg-gold/5 rounded-full text-gold transition-all shadow-sm">
                   <Lock size={20} />
                </button>
                <div className="flex-1">
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#B8860B]/60">Autenticando</p>
                   <h2 className="text-xl font-black uppercase tracking-[0.1em] text-gray-800">{selectedProfile.name}</h2>
                </div>
             </div>

             <div className="space-y-6">
                <div className="relative">
                   <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 block pl-1">Chave de Proteção</label>
                   <div className="relative">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/30" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-gold/10 p-5 pl-14 rounded-2xl text-gray-800 font-bold outline-none focus:border-gold/40 transition-all shadow-sm"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gold transition-all"
                      >
                         {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                      </button>
                   </div>
                </div>

                <button 
                  onClick={handleLogin}
                  className="w-full py-6 bg-[#333333] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] hover:bg-gold transition-all shadow-xl flex items-center justify-center gap-3"
                >
                   Acessar Dashboard <ArrowRight size={16} />
                </button>
             </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-16 text-center">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
              <Star size={12} className="text-gold/20" /> Stark Protocol v2.8 <span className="w-1 h-1 bg-gold/30 rounded-full" /> Local Encryption <Star size={12} className="text-gold/20" />
           </p>
        </div>
      </div>
    </div>
  );
};
