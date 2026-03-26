import { useState, useEffect } from 'react';
import { BookOpen, Star, Sparkles, ChevronRight, MessageSquare, Plus, Trash2, Wand2, ChevronDown, X } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface Lesson {
  id: string;
  title: string;
  icon: string;
  category: string;
  content: string;
  custom?: boolean;
  quiz?: { question: string; options: string[]; answer: number }[];
}

const DEFAULT_LESSONS: Lesson[] = [
  {
    id: 'progressoes-secundarias',
    title: 'Progressões Secundárias',
    icon: '⏩',
    category: 'Avançado',
    content: `As Progressões Secundárias (SP) são um método de previsão astrológica onde cada dia após o nascimento equivale a um ano de vida.

CÁLCULO:
- Dia 1 após nascimento = Ano 1 de vida
- Dia 2 após nascimento = Ano 2 de vida
- E assim por diante

INTERPRETAÇÃO:
- A SP do Sol mostra a evolução da consciência e propósito de vida
- A SP da Lua indica ciclos emocionais e mudanças internas
- Progressão de planetas retrógrados pode indicar revisão de temas passados

ASPECTOS PROGRESSADOS:
- Quando um planeta progressado forma aspecto com um planeta natal, esse tema se ativa
- Conjunção SP do Sol com Netuno: despertar espiritual, confusão criativa
- Quadratura SP de Saturno com Vênus: teste em relacionamentos e valores

IDADES CRÍTICAS:
- SP Lua conjunta ao ASC (aprox. 27-28 anos): crise de identidade, renascimento
- SP Sol conjunta a Saturno (aprox. 29-30 anos): amadurecimento profissional
- SP Lua conjunta a Netuno: períodos de vulnerabilidade emocional`,
  },
  {
    id: 'direcoes-primarias',
    title: 'Direções Primárias',
    icon: '🔄',
    category: 'Avançado',
    content: `As Direções Primárias (DP) movem os pontos do mapa natal baseados na rotação da Terra. 1° de arco = 1 ano de vida.

MÉTODO:
- Calcula-se o arco direcional (direção primária)
- Aplica-se esse arco a todos os planetas e pontos do mapa
- Os aspectos formados indicam eventos

APLICAÇÕES:
- Previsão de eventos importantes (casamento, carreira, saúde)
- Timing preciso de ativações planetárias
- Análise de ciclos de vida

DIREÇÃO DO SOL:
- DP Sol em aspecto com Júpiter: período de expansão, sucesso
- DP Sol em aspecto com Saturno: reestruturação, limitações
- DP Sol em aspecto com Marte: ação, conflito, cirurgia

DIREÇÃO DA LUA:
- DP Lua em aspecto com Vênus: amor, beleza, criatividade
- DP Lua em aspecto com Saturno: restrições emocionais

CONSIDERAÇÕES:
- Usar em conjunto com Progressões Secundárias para maior precisão
- Orbes mais restritas que as técnicas de trânsitos`,
  },
  {
    id: 'revolucao-solar',
    title: 'Revolução Solar',
    icon: '☉',
    category: 'Avançado',
    content: `A Revolução Solar (RS) é um mapa calculado para o exato momento em que o Sol retorna à sua posição natal.

CÁLCULO:
- Momento exato do retorno solar (geralmente anual)
- Local: onde você estiver no momento do retorno
- Cria um mapa independente que se sobrepõe ao natal

INTERPRETAÇÃO:
- A casa onde cai o Sol da RS mostra o tema principal do ano
- O regente do ASC da RS mostra o "tom" do ano
- Planetas em casas angulares são mais ativos

TÉCNICAS AVANÇADAS:
- RS sobre o mapa natal: ativações específicas
- Trânsitos sobre a RS: timing de eventos dentro do ano
- Direção do regente da RS

EXEMPLO PRÁTICO:
Se o Sol da RS cai na 10ª casa: foco em carreira, reputação pública
Se o regente do ASC da RS é Vênus: tema de relacionamentos e valores
Se Marte está angular na RS: ano de ação, competição, possíveis conflitos`,
  },
  {
    id: 'astrocartografia',
    title: 'Astrocartografia',
    icon: '🗺️',
    category: 'Especialista',
    content: `A Astrocartografia mostra como a energia planetária se distribui geograficamente no planeta.

LINHAS PLANETÁRIAS:
- Cada planeta tem linhas que cruzam o globo
- Perto da linha de um planeta, sua energia se intensifica
- Linhas de planetas benéficos (Júpiter, Vênus) indicam locais favoráveis
- Linhas de planetas desafiadores (Saturno, Marte) indicam crescimento

INTERPRETAÇÃO DE LINHAS:
- Linha do Sol: protagonismo, expressão criativa, calor
- Linha da Lua: lar, nutrição, ciclos emocionais
- Linha de Mercúrio: comunicação, estudos, comércio
- Linha de Vênus: amor, arte, prazer, harmonia
- Linha de Marte: ação, conflito, energia física
- Linha de Júpiter: expansão, sorte, crescimento
- Linha de Saturno: disciplina, limitações, karma

CASAS ANGULARES:
- ASC na linha: identidade local forte
- MC na linha: carreira e público proeminentes
- IC na linha: foco em casa e família
- DESC na linha: parcerias e relações`,
  },
  {
    id: 'dignidades-essenciais',
    title: 'Dignidades Essenciais e Debilidades',
    icon: '⚖️',
    category: 'Avançado',
    content: `As dignidades essenciais indicam a força de um planeta baseada no signo onde está.

HIERARQUIA:
1. Domicílio (dignidade máxima): planeta no signo que rege
2. Exaltação (alta dignidade): planeta em signo de exaltação
3. Peregrino (neutro): sem dignidade especial
4. Detrimento (debilidade): planeta no signo oposto ao domicílio
5. Queda (grande debilidade): planeta no signo oposto à exaltação

TABELA COMPLETA:
Sol: Domicílio em Leão, Exaltação em Áries, Detrimento em Aquário, Queda em Libra
Lua: Domicílio em Câncer, Exaltação em Touro, Detrimento em Capricórnio, Queda em Escorpião
Mercúrio: Domicílio em Gêmeos/Virgem, Exaltação em Virgem, Detrimento em Sagitário/Peixes, Queda em Peixes
Vênus: Domicílio em Touro/Libra, Exaltação em Peixes, Detrimento em Escorpião/Áries, Queda em Virgem
Marte: Domicílio em Áries/Escorpião, Exaltação em Capricórnio, Detrimento em Libra/Touro, Queda em Câncer
Júpiter: Domicílio em Sagitário/Peixes, Exaltação em Câncer, Detrimento em Gêmeos/Virgem, Queda em Capricórnio
Saturno: Domicílio em Capricórnio/Aquário, Exaltação em Libra, Detrimento em Câncer/Leão, Queda em Áries

APLICAÇÃO PRÁTICA:
Um planeta em domicílio funciona com toda a sua força natural
Um planeta em queda precisa de esforço consciente para expressar suas qualidades`,
  },
  {
    id: 'tecnicas-hellenisticas',
    title: 'Técnicas Helenísticas: Lotes e Aversiones',
    icon: '🏛️',
    category: 'Especialista',
    content: `A astrologia helenística (séc. I a.C. - VII d.C.) trouxe técnicas únicas que ainda são valiosas.

LOTES (ou Partes):
- São pontos calculados no mapa (como o Parte de Fortuna)
- Fórmula: ASC + (ponto A) - (ponto B)
- Indicam áreas de "destino" ou temas importantes

LOTE DE FORTUNA (Parte de Fortuna):
- Dia: ASC + Lua - Sol
- Noite: ASC + Sol - Lua
- Indica: recursos materiais, corpo, saúde, sorte

LOTE DE ESPÍRITO:
- Dia: ASC + Sol - Lua
- Noite: ASC + Lua - Sol
- Indica: mente, alma, propósito espiritual

AVISO/AVVERSIO:
- Quando um planeta está na 12ª casa a partir de outro, não "vê" o outro
- Essa "avversio" (aversão) indica separação ou desconexão
- Planetas em aversão não podem cooperar harmoniosamente

SIGNIFICADORES:
- Almuten: planeta mais forte do ponto (por dignidade)
- Hyleg: planeta vitalício (determina saúde e longevidade)
- Alcocoden: regente do Hyleg (companheiro de vida)`,
  },
];

export const RafikiEscola = () => {
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('aurea_rafiki_lessons');
    return saved ? JSON.parse(saved) : DEFAULT_LESSONS;
  });
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Avançado');
  const [generating, setGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Avançado');

  // Persist lessons
  useEffect(() => {
    localStorage.setItem('aurea_rafiki_lessons', JSON.stringify(lessons));
  }, [lessons]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLessons(prev => prev.filter(l => l.id !== id));
    if (selectedLesson?.id === id) setSelectedLesson(null);
  };

  const handleAddLesson = () => {
    if (!newTitle.trim()) return;
    const lesson: Lesson = {
      id: `custom_${Date.now()}`,
      title: newTitle,
      icon: '📝',
      category: newCategory,
      content: 'Nova lição criada. Edite o conteúdo aqui.',
      custom: true,
    };
    setLessons(prev => [...prev, lesson]);
    setNewTitle('');
    setShowNewLesson(false);
    setSelectedLesson(lesson);
  };

  const handleGenerateContent = async () => {
    if (!generatePrompt.trim()) return;
    setGenerating(true);
    try {
      const systemMsg = { role: 'system', content: `Você é Rafiki, o mestre de astrologia avançada. Crie conteúdo educacional completo sobre o tema solicitado. Use formatação clara com seções, exemplos práticos e técnicas específicas. Escreva em português brasileiro.` };
      const userMsg = { role: 'user', content: `Crie uma lição completa e avançada de astrologia sobre: ${generatePrompt}. Inclua: conceito, cálculo, interpretação, exemplos práticos e aplicações.` };
      
      const response = await safeInvoke<string>('openrouter_chat', {
        model: 'openai/gpt-4o-mini',
        messages: [systemMsg, userMsg]
      });

      if (response) {
        const lesson: Lesson = {
          id: `generated_${Date.now()}`,
          title: generatePrompt,
          icon: '✨',
          category: newCategory,
          content: response,
          custom: true,
        };
        setLessons(prev => [...prev, lesson]);
        setSelectedLesson(lesson);
        setGeneratePrompt('');
      }
    } catch (e) {
      console.error('Erro ao gerar conteúdo:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (questionIdx: number, answerIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }));
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setShowResults(false);
  };

  const categories = [...new Set(lessons.map(l => l.category))];

  if (selectedLesson) {
    return (
      <div className="animate-in slide-in-from-right-5 duration-500">
        <button 
          onClick={() => { setSelectedLesson(null); resetQuiz(); }}
          className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-gold hover:text-gold/70 transition-all flex items-center gap-2"
        >
          ← Voltar às lições
        </button>
        
        <div className="bg-white rounded-[2rem] border border-gold/10 shadow-xl p-8 lg:p-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{selectedLesson.icon}</span>
              <div>
                <p className="text-[9px] font-black uppercase text-gold/50 tracking-widest">{selectedLesson.category}{selectedLesson.custom ? ' • Personalizado' : ''}</p>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">{selectedLesson.title}</h2>
              </div>
            </div>
            {selectedLesson.custom && (
              <button onClick={() => handleDelete(selectedLesson.id, {} as any)} className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Excluir lição">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className="text-[13px] text-gray-700 leading-[2] font-medium whitespace-pre-wrap mb-10">
            {selectedLesson.content}
          </div>

          {selectedLesson.quiz && selectedLesson.quiz.length > 0 && (
            <div className="border-t border-gold/10 pt-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold mb-6 flex items-center gap-2">
                <Sparkles size={14}/> Teste seus conhecimentos
              </h3>
              <div className="space-y-6">
                {selectedLesson.quiz.map((q, qi) => (
                  <div key={qi} className="bg-[#FCF9F1] p-6 rounded-lg border border-gold/10">
                    <p className="text-[12px] font-bold text-gray-800 mb-4">{qi + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <button key={oi} onClick={() => handleAnswer(qi, oi)} disabled={showResults}
                          className={`w-full text-left p-3 rounded-xl text-[11px] font-medium transition-all border ${
                            quizAnswers[qi] === oi 
                              ? showResults 
                                ? oi === q.answer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-gold/10 border-gold/30 text-gold'
                              : showResults && oi === q.answer ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-white border-gray-100 text-gray-600 hover:border-gold/20'
                          }`}
                        >{opt}{showResults && oi === q.answer && ' ✓'}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!showResults ? (
                <button onClick={() => setShowResults(true)} disabled={Object.keys(quizAnswers).length < (selectedLesson.quiz?.length || 0)}
                  className="mt-6 px-8 py-3 bg-[#333333] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gold transition-all disabled:opacity-30">
                  Verificar respostas
                </button>
              ) : (
                <button onClick={resetQuiz} className="mt-6 px-8 py-3 bg-white border border-gold/20 text-gold rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gold/5 transition-all">
                  Tentar novamente
                </button>
              )}
            </div>
          )}
          
          <div className="mt-8 p-4 bg-gold/5 rounded-xl border border-gold/10 flex items-center gap-3">
            <MessageSquare size={14} className="text-gold" />
            <p className="text-[10px] text-gray-500 font-medium">
              Dúvidas? Abra o chat do <span className="font-black text-gold">Rafiki</span> e pergunte sobre este tema!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-5 duration-500 space-y-6">
      <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-gold/10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-lg text-gold"><BookOpen size={24}/></div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Escola de Astrologia</h2>
              <p className="text-xl font-black text-gray-800 tracking-tight">Rafiki — Estudos Avançados</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewLesson(true)} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-gold hover:border-gold/20 transition-all shadow-sm" title="Nova lição">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Generate content */}
      <div className="bg-white/60 p-5 rounded-lg border border-gold/10 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 size={14} className="text-gold" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gold">Gerar Conteúdo com Rafiki</span>
        </div>
        <div className="flex gap-3">
          <input
            value={generatePrompt}
            onChange={e => setGeneratePrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerateContent()}
            placeholder="Ex: Trânsitos de Plutão na 8ª casa, Sinastria avançada..."
            className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-[12px] font-medium outline-none focus:border-gold/30 transition-all"
          />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none cursor-pointer">
            <option>Avançado</option>
            <option>Especialista</option>
          </select>
          <button onClick={handleGenerateContent} disabled={generating || !generatePrompt.trim()}
            className="px-5 py-2.5 bg-[#333333] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold transition-all disabled:opacity-30">
            {generating ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      </div>

      {/* New lesson modal */}
      {showNewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-gold/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-gold">Nova Lição</h3>
              <X size={18} className="text-gray-300 cursor-pointer hover:text-red-400" onClick={() => setShowNewLesson(false)} />
            </div>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus placeholder="Título da lição"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-gold/30 mb-4" />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[12px] font-bold outline-none cursor-pointer mb-6">
              <option>Avançado</option>
              <option>Especialista</option>
            </select>
            <button onClick={handleAddLesson}
              className="w-full py-3 bg-[#333333] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold transition-all">
              Criar Lição
            </button>
          </div>
        </div>
      )}

      {/* Lessons by category */}
      {categories.map(cat => (
        <div key={cat}>
          <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
            className="flex items-center gap-2 mb-3 cursor-pointer group">
            <ChevronDown size={12} className={`text-gold/40 transition-transform ${expandedCategory === cat ? 'rotate-0' : '-rotate-90'}`} />
            <Star size={10} className="text-gold/40" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-gold transition-colors">{cat}</span>
            <span className="text-[8px] text-gray-300 ml-2">({lessons.filter(l => l.category === cat).length})</span>
          </button>
          {expandedCategory === cat && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {lessons.filter(l => l.category === cat).map(lesson => (
                <div key={lesson.id}
                  onClick={() => { setSelectedLesson(lesson); resetQuiz(); }}
                  className="group relative p-5 bg-white border border-gray-50 rounded-lg text-left hover:border-gold/20 hover:shadow-lg transition-all cursor-pointer">
                  {lesson.custom && (
                    <button onClick={(e) => handleDelete(lesson.id, e)}
                      className="absolute top-3 right-3 p-1.5 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{lesson.icon}</span>
                    <ChevronRight size={14} className="text-gray-200 group-hover:text-gold transition-all" />
                  </div>
                  <h4 className="text-[12px] font-black text-gray-800 mb-1">{lesson.title}</h4>
                  <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                    {lesson.quiz ? `${lesson.quiz.length} questões` : 'Leitura'}{lesson.custom ? ' • Custom' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
