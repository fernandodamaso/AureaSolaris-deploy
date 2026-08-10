import { useState, useMemo, useEffect } from 'react';
import { Star, Moon, Sun, Activity, Ear, Radio, Leaf, FileText, UploadCloud, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { SectionTitle } from './common/UIComponents';
import { useAstroData } from '../hooks/useAstroData';
import { useAgendaContext } from '../context/AgendaContext';
import { calcHyleg, calcTemperament } from '../utils/astro-dignity';
import { getMedicalPlanetInfo, getLunarAlchemyAdvice, MEDICAL_ASTROLOGY } from '../utils/AstromedicinaUtils';
import { readConfirmedBirthInput } from '../utils/confirmedBirthInput';

export const SaudeView = () => {
  const { profiles, activeProfileId, getPlanetaryHour, getPlanetaryDayRegent } = useAgendaContext();
  
  // Local state to allow viewing health data for family members without changing global active profile
  const [viewingProfileId, setViewingProfileId] = useState(activeProfileId);
  const viewingProfile = useMemo(() => profiles.find(p => p.id === viewingProfileId) || profiles[0], [profiles, viewingProfileId]);

  // Health Memory State
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadHealthMemory(viewingProfileId);
  }, [viewingProfileId]);

  const loadHealthMemory = async (profileId: string) => {
    try {
      const data = await invoke<any[]>('load_health_memory', { profileId });
      setHealthHistory(data || []);
    } catch (e) {
      console.error('Failed to load health memory:', e);
    }
  };

  const saveHealthMemory = async (memory: any[]) => {
    try {
      await invoke('save_health_memory', { profileId: viewingProfileId, memory });
    } catch (e) {
      console.error('Failed to save health memory:', e);
    }
  };

  const handleUploadExam = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Documentos Médicos', extensions: ['pdf'] }]
      });

      if (selected && !Array.isArray(selected)) {
        setIsUploading(true);
        // 1. Extract Text
        const extRes = await fetch('http://127.0.0.1:9876/extract_pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: selected })
        });
        
        if (!extRes.ok) throw new Error('Falha ao extrair texto do PDF');
        const extData = await extRes.json();
        const extractedText = extData.text;

        // 2. Send to Hermes for analysis
        const hermesPrompt = `Atue como Hermes, sábio astromédico e alquimista. Acabei de receber este laudo/exame médico. Analise-o brevemente e traduza para mim o que significa. Relacione com vitalidade geral. Não faça diagnósticos definitivos, apenas aconselhe hermeticamente.\n\nCONTEÚDO DO LAUDO:\n${extractedText.substring(0, 3000)}`;
        
        const chatRes = await fetch('http://127.0.0.1:9876/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: hermesPrompt }],
            context: 'Usuário enviou um exame para análise.'
          })
        });

        let hermesAnalysis = 'Análise hermética indisponível no momento.';
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          hermesAnalysis = chatData.reply || hermesAnalysis;
        }

        // 3. Save to Memory
        const fileName = selected.split(/[\\/]/).pop() || 'Exame.pdf';
        const newRecord = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          fileName,
          analysis: hermesAnalysis,
          rawText: extractedText.substring(0, 500) // save a snippet
        };

        const updated = [newRecord, ...healthHistory];
        setHealthHistory(updated);
        await saveHealthMemory(updated);
      }
    } catch (err) {
      console.error('Upload falhou:', err);
      alert('Falha ao processar o exame. Verifique se o backend Python está rodando e o arquivo é um PDF válido.');
    } finally {
      setIsUploading(false);
    }
  };

  const now = new Date();
  const planetaryHour = getPlanetaryHour(now);
  const dayRegent = getPlanetaryDayRegent(now);

  const birthData = useMemo(() => readConfirmedBirthInput(viewingProfile), [viewingProfile]);
  const { data, loading: loadingNatal, error: natalError } = useAstroData(birthData, Boolean(birthData));

  const hyleg = useMemo(() => data?.planets ? calcHyleg(data.planets) : null, [data]);
  const temperament = useMemo(() => {
    const ascDegree = data?.planets?.ASC?.degree;
    const moonPhase = data?.moon_phase?.phase;
    if (!data?.planets || !Number.isFinite(ascDegree) || !moonPhase) return null;
    return calcTemperament(data.planets, ascDegree, moonPhase);
  }, [data]);

  const natalMoonSign = data?.planets?.Moon?.sign ?? null;
  const lunarAdvice = natalMoonSign ? getLunarAlchemyAdvice(natalMoonSign) : null;
  const natalUnavailableMessage = !birthData
    ? 'Indisponível: complete os dados de nascimento no perfil.'
    : loadingNatal
      ? 'Calculando com o motor local...'
      : natalError
        ? 'Cálculo indisponível; nenhum valor será estimado.'
        : 'Indisponível: o recibo natal não contém dados suficientes.';

  const hourPlanetInfo = getMedicalPlanetInfo(planetaryHour.name);
  const dayPlanetInfo = getMedicalPlanetInfo(dayRegent.name);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in max-w-5xl mx-auto">
      
      {/* Header: Seletor de Perfil */}
      <div className="flex justify-between items-center bg-[#171c31] p-6 rounded-2xl border border-gold/20 shadow-lg">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Activity className="text-gold" size={24} />
            Saúde & Alquimia
          </h2>
          <p className="text-xs text-gold/70 mt-1 tracking-wide">
            Astromedicina, Frequências e Curas Vibracionais
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Mapa Base:</span>
          <select 
            value={viewingProfileId}
            onChange={(e) => setViewingProfileId(e.target.value)}
            className="bg-[#21283d] text-white border border-gray-600 rounded-lg px-4 py-2 text-sm outline-none focus:border-gold/50 cursor-pointer"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!birthData && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          A constituição natal astromédica está indisponível. Informe data, hora, local, coordenadas e fuso IANA no perfil antes de calcular.
        </div>
      )}
      {birthData && natalError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
          O cálculo natal está indisponível. {natalError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: O Momento Alquímico (Trânsitos Atuais) */}
        <div className="lg:col-span-1 space-y-6">
          <SectionTitle>I. Vitalidade do Momento</SectionTitle>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
            {/* Influência Lunar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Moon size={12} /> Lua no Mapa Natal
                </h4>
                {natalMoonSign && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">Lua em {natalMoonSign}</span>
                )}
              </div>
              <p className="text-[12px] text-gray-700 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                {lunarAdvice || (
                  !birthData
                    ? 'Indisponível até informar dados completos de nascimento no perfil.'
                    : loadingNatal
                      ? 'Calculando a Lua natal com o motor local...'
                      : natalError
                        ? 'Cálculo indisponível; nenhum valor será estimado.'
                        : 'Indisponível: o motor não devolveu a Lua natal auditável.'
                )}
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* Apotecário Alquímico - Hora Atual */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sun size={12} /> Apotecário Alquímico
                </h4>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-100">
                  Hora de {planetaryHour.name} ({planetaryHour.icon})
                </span>
              </div>
              
              {hourPlanetInfo ? (
                <div className="space-y-4">
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2">Ervas & Banhos Recomendados Agora</p>
                    <div className="flex flex-wrap gap-2">
                      {hourPlanetInfo.herbs.map((h, i) => (
                        <span key={i} className="text-[11px] text-amber-700 bg-amber-100/50 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 border border-amber-200/50">
                          <Leaf size={10} /> {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                    <strong className="text-gray-800">Uso Hermético:</strong> {hourPlanetInfo.remedy}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Sintonizando alquimia...</p>
              )}
            </div>
          </div>

          <SectionTitle>II. Cura Vibracional</SectionTitle>
          <div className="bg-[#FCF9F1] rounded-2xl p-6 border border-gold/20 shadow-sm space-y-5">
            <h4 className="text-[10px] font-bold text-gold uppercase tracking-widest flex items-center gap-1.5">
              <Ear size={12} /> Frequências de Harmonização
            </h4>
            <p className="text-[11px] text-gray-600 font-medium">
              Baseado na tensão energética do dia regido por {dayRegent.name} e hora de {planetaryHour.name}, utilize estas frequências durante a meditação ou sono:
            </p>
            <div className="space-y-3">
               {dayPlanetInfo && (
                 <div className="p-3 bg-white rounded-lg border border-gold/10 flex items-center justify-between shadow-sm">
                   <div>
                     <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Frequência Regente (Dia)</p>
                     <p className="text-[11px] text-gray-800 font-bold flex items-center gap-2"><Radio size={12} className="text-gold"/> {dayPlanetInfo.frequency}</p>
                   </div>
                 </div>
               )}
               {hourPlanetInfo && (
                 <div className="p-3 bg-white rounded-lg border border-gold/10 flex items-center justify-between shadow-sm">
                   <div>
                     <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Foco de Radiestesia (Hora)</p>
                     <p className="text-[11px] text-gray-800 font-bold flex items-center gap-2"><Activity size={12} className="text-blue-400"/> Limpeza: {hourPlanetInfo.chakra}</p>
                   </div>
                 </div>
               )}
            </div>
          </div>
          
          <SectionTitle>III. Arquivo Clínico & Laudos</SectionTitle>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={12} /> Histórico de Exames (Hermes)
              </h4>
              <button 
                onClick={handleUploadExam}
                disabled={isUploading}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                {isUploading ? 'Analisando...' : 'Enviar Laudo (PDF)'}
              </button>
            </div>
            
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {healthHistory.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-4">
                  Nenhum exame analisado ainda. Faça o upload do seu primeiro laudo para Hermes criar seu histórico.
                </p>
              ) : (
                healthHistory.map((record) => (
                  <div key={record.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-700">{record.fileName}</span>
                      <span className="text-[9px] font-bold text-gray-400">{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 leading-relaxed max-h-32 overflow-y-auto">
                      <strong className="text-indigo-600 block mb-1">Análise de Hermes:</strong>
                      {record.analysis}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Astromedicina Natal (Constituição) */}
        <div className="lg:col-span-2 space-y-6">
          <SectionTitle>III. Constituição Natal Astromédica</SectionTitle>

          {/* Hyleg e Temperamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Star size={100} />
              </div>
              <h5 className="text-[10px] font-black uppercase text-emerald-700 tracking-[0.2em] mb-1">Doador da Vida (Hyleg)</h5>
              {hyleg ? (
                <>
                  <p className="text-xl font-bold text-emerald-900 mb-2">{hyleg.planetPt} em {hyleg.signPt}</p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed font-medium max-w-[85%]">
                    Representa a raiz da sua força vital inata. Proteger os órgãos regidos por {hyleg.planetPt} é essencial para sua longevidade energética.
                  </p>
                </>
              ) : (
                <p className="text-xs text-emerald-600">{natalUnavailableMessage}</p>
              )}
            </div>

            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-center">
              <h5 className="text-[10px] font-black uppercase text-amber-700 tracking-[0.2em] mb-1 flex items-center gap-2">
                Humor Dominante 
                <span className="text-[14px]">
                  {temperament?.dominante === 'Colerico' || temperament?.dominante === 'Colérico' ? '🔥' : 
                   temperament?.dominante === 'Sanguineo' || temperament?.dominante === 'Sanguíneo' ? '💨' :
                   temperament?.dominante === 'Melancolico' || temperament?.dominante === 'Melancólico' ? '🌍' : '💧'}
                </span>
              </h5>
              {temperament ? (
                <>
                  <p className="text-xl font-bold text-amber-900 mb-2">{temperament.dominante}</p>
                  <div className="grid grid-cols-4 gap-2 text-center mt-2">
                    <div className="bg-red-100/50 rounded-lg p-2"><p className="text-[9px] text-red-600 font-bold uppercase">Fogo</p><p className="text-sm font-bold text-red-800">{temperament.colerico}%</p></div>
                    <div className="bg-sky-100/50 rounded-lg p-2"><p className="text-[9px] text-sky-600 font-bold uppercase">Ar</p><p className="text-sm font-bold text-sky-800">{temperament.sanguineo}%</p></div>
                    <div className="bg-amber-100/50 rounded-lg p-2"><p className="text-[9px] text-amber-600 font-bold uppercase">Terra</p><p className="text-sm font-bold text-amber-800">{temperament.melancolico}%</p></div>
                    <div className="bg-blue-100/50 rounded-lg p-2"><p className="text-[9px] text-blue-600 font-bold uppercase">Água</p><p className="text-sm font-bold text-blue-800">{temperament.fleumatico}%</p></div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-amber-600">{natalUnavailableMessage}</p>
              )}
            </div>
          </div>

          {/* Mapeamento Planetário dos Órgãos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <Star size={14} className="text-gold" />
                Mapeamento Somático e Chakras
              </h4>
            </div>
            
            <div className="divide-y divide-gray-100">
              {['Sol', 'Lua', 'Mercúrio', 'Vênus', 'Marte', 'Júpiter', 'Saturno'].map(planet => {
                const info = MEDICAL_ASTROLOGY[planet];
                if (!info) return null;
                const natPos = data?.planets?.[planet === 'Sol' ? 'Sun' : planet === 'Lua' ? 'Moon' : planet === 'Mercúrio' ? 'Mercury' : planet === 'Vênus' ? 'Venus' : planet === 'Marte' ? 'Mars' : planet === 'Júpiter' ? 'Jupiter' : 'Saturn'];
                
                return (
                  <div key={planet} className="p-5 hover:bg-gray-50/50 transition-colors flex gap-6">
                    <div className="w-24 shrink-0 flex flex-col items-center justify-center bg-[#FCF9F1] rounded-xl p-3 border border-gold/10">
                      <span className="text-2xl mb-1 text-gold">
                        {planet === 'Sol' ? '☉' : planet === 'Lua' ? '☽' : planet === 'Mercúrio' ? '☿' : planet === 'Vênus' ? '♀' : planet === 'Marte' ? '♂' : planet === 'Júpiter' ? '♃' : '♄'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{planet}</span>
                      {natPos && <span className="text-[9px] font-bold text-gray-400 mt-1">{natPos.signPt}</span>}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Órgãos Regidos</p>
                          <p className="text-[11px] text-gray-800 font-medium">{info.organ}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Chakra (Centro de Força)</p>
                          <p className="text-[11px] text-indigo-700 font-bold bg-indigo-50 inline-block px-2 py-0.5 rounded-sm">{info.chakra}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-50">
                        <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider mb-1">Sintomas de Desequilíbrio Astrológico</p>
                        <p className="text-[11px] text-gray-500 italic">{info.imbalance}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
