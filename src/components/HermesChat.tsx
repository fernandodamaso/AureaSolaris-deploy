import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import { parseConfirmedBirthDate, readCertifiedCalculation } from '../utils/certifiedCalculation';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function reduceToSingle(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = Math.floor(n / 10) + (n % 10);
  }
  return n;
}

function numerologyMeaning(n: number): string {
  const meanings: Record<number, string> = {
    1: 'Início, liderança, independência, vontade',
    2: 'Cooperação, diplomacia, dualidade, paciência',
    3: 'Criação, expressão, comunicação, alegria',
    4: 'Estabilidade, estrutura, trabalho, fundação',
    5: 'Mudança, liberdade, aventura, transformação',
    6: 'Harmonia, responsabilidade, amor, família',
    7: 'Espiritualidade, introspecção, saber, mistério',
    8: 'Poder material, abundância, realização, karma',
    9: 'Completação, sabedoria, humanitarismo, ciclos',
    11: 'Iluminação, intuição elevada, visão espiritual',
    22: 'Mestre construtor, grandes realizações, servicio',
    33: 'Mestre professor, compaixão universal, cura'
  };
  return meanings[n] || '';
}

function numerologyCycle(n: number): string {
  const cycles: Record<number, string> = {
    1: 'Ano de novos começos e plantio de sementes',
    2: 'Ano de cooperação e construção de parcerias',
    3: 'Ano de expressão criativa e comunicação',
    4: 'Ano de trabalho duro e fundação',
    5: 'Ano de mudanças e transformações',
    6: 'Ano de responsabilidades familiares e amor',
    7: 'Ano de introspecção e espiritualidade',
    8: 'Ano de abundância e realização material',
    9: 'Ano de conclusão e desapego'
  };
  return cycles[n] || '';
}

/**
 * Monta o system prompt completo do Hermes com TODOS os dados do sistema.
 * Inclui: perfil, mapa natal, trânsitos, tarefas, finanças, saúde, contexto temporal.
 */
function formatCalculatedPositions(positions: Record<string, unknown>): string {
  return Object.entries(positions)
    .map(([name, value]) => {
      if (!value || typeof value !== 'object') return null;
      const position = value as Record<string, unknown>;
      const degree = position.pos_in_sign ?? position.sign_longitude;
      const sign = typeof position.sign === 'string' ? position.sign : null;
      const house = Number.isFinite(position.house) ? ` (casa ${position.house})` : '';
      const retrograde = position.retrograde ? ' retrógrado' : '';
      if (!Number.isFinite(degree) || !sign) return null;
      return `${name}: ${(degree as number).toFixed(1)}° ${sign}${house}${retrograde}`;
    })
    .filter((line): line is string => Boolean(line))
    .join(' | ');
}

export function buildSystemPrompt(ctx: ReturnType<typeof useGlobalContext>): string {
  const { astro, agenda, system } = ctx;
  const profile = agenda.activeProfile;

  // ── Dados de nascimento ──
  const birthSection = profile
    ? `--- NASCIMENTO ---
Nome: ${profile.name}
Data: ${profile.birthDate || 'Não informado'}
Hora: ${profile.birthTime || 'Não informado'}
Cidade: ${profile.birthCity || 'Não informado'}
${profile.context ? `Contexto pessoal: ${profile.context}` : ''}
${profile.dialogStyle ? `Estilo de diálogo preferido: ${profile.dialogStyle}` : ''}`
    : '--- NASCIMENTO --- Nenhum perfil configurado. Peça ao usuário seus dados de nascimento.';

  // ── Mapa natal (posições planetárias raw) ──
  const certifiedNatal = readCertifiedCalculation(
    (profile as (typeof profile & { certifiedNatalCalculation?: unknown }) | null)?.certifiedNatalCalculation,
    'natal',
  );
  const natalRaw = certifiedNatal?.planets;
  let natalSection = '--- MAPA NATAL --- Dados não calculados ainda.';
  if (natalRaw && typeof natalRaw === 'object') {
    const entries = Object.entries(natalRaw)
      .filter(([k]) => !['ASC', 'MC', 'DSC', 'IC'].includes(k) || true)
      .map(([k, v]) => {
        if (typeof v === 'number') {
          const signs = ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
            'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'];
          const idx = Math.floor(((v % 360) + 360) % 360 / 30);
          const deg = ((v % 30) + 30) % 30;
          return `${k}: ${deg.toFixed(1)}° ${signs[idx] || '?'}`;
        }
        if (typeof v === 'object' && v !== null) {
          const obj = v as any;
          const pos = obj.pos_in_sign ?? obj.longitude;
          const sign = typeof obj.sign === 'string' ? obj.sign : null;
          const house = obj.house ? ` (casa ${obj.house})` : '';
          const retro = obj.retrograde ? ' ℞' : '';
          return Number.isFinite(pos) && sign ? `${k}: ${pos.toFixed(1)}° ${sign}${house}${retro}` : null;
        }
        return `${k}: ${v}`;
      });
    natalSection = `--- MAPA NATAL ---
${entries.join('\n')}`;
  }

  // ── Trânsitos atuais ──
  const certifiedNatalSection = certifiedNatal
    ? `--- MAPA NATAL (VALOR CALCULADO) ---
Recibo: ${certifiedNatal.meta.receipt.input_hash}
UTC: ${certifiedNatal.meta.receipt.resolved_time.utc}
Fuso IANA: ${certifiedNatal.meta.receipt.resolved_time.iana_timezone}
Motor: ${certifiedNatal.meta.receipt.engine.name} ${certifiedNatal.meta.receipt.engine.version}
Posições: ${formatCalculatedPositions(certifiedNatal.planets) || 'Indisponíveis: recibo sem posições legíveis.'}`
    : '--- MAPA NATAL --- Indisponível: nenhum cálculo natal certificado com recibo auditável foi recebido.';
  natalSection = certifiedNatalSection;

  const transitSection = certifiedNatal
    ? '--- TRÂNSITOS PESSOAIS --- Indisponíveis: a conexão entre o mapa natal certificado e o cálculo de trânsitos ainda não foi recebida.'
    : '--- TRÂNSITOS PESSOAIS --- Indisponíveis sem um mapa natal certificado com recibo auditável.';

  // ── Céu agora ──
  const certifiedTransit = readCertifiedCalculation(astro.liveData, 'transit');
  const certifiedTransitPositions = certifiedTransit ? formatCalculatedPositions(certifiedTransit.planets) : '';
  const certifiedAspects = certifiedTransit && Array.isArray((certifiedTransit as any).aspects)
    ? (certifiedTransit as any).aspects.slice(0, 8).map((aspect: any) =>
        `${aspect.p1} ${aspect.symbol || aspect.aspect} ${aspect.p2} (orb ${Number.isFinite(aspect.orb) ? aspect.orb.toFixed(1) : '?'}°)`,
      )
    : [];
  const certifiedRetrogrades = certifiedTransit
    ? Object.entries(certifiedTransit.planets)
        .filter(([name, position]) => !['ASC', 'MC', 'DSC', 'IC'].includes(name) && Boolean((position as any)?.retrograde))
        .map(([name]) => name)
    : [];
  const certifiedSkySection = certifiedTransit
    ? `--- CÉU AGORA (VALOR CALCULADO) ---
Recibo: ${certifiedTransit.meta.receipt.input_hash}
UTC: ${certifiedTransit.meta.receipt.resolved_time.utc}
Fuso IANA: ${certifiedTransit.meta.receipt.resolved_time.iana_timezone}
Motor: ${certifiedTransit.meta.receipt.engine.name} ${certifiedTransit.meta.receipt.engine.version}
Posições atuais: ${certifiedTransitPositions || 'Indisponíveis: recibo sem posições legíveis.'}
Aspectos ativos: ${certifiedAspects.length ? certifiedAspects.join(' | ') : 'Não recebidos neste cálculo.'}
Retrogradações: ${certifiedRetrogrades.length ? certifiedRetrogrades.join(', ') : 'Nenhuma recebida.'}`
    : '--- CÉU AGORA --- Indisponível: nenhum cálculo de trânsito certificado com recibo auditável foi recebido.';

  const skySection = certifiedSkySection;

  // ── Tarefas ──
  const pendingTasks = agenda.tasks.filter((t: any) => !t.completed && !t.is_completed);
  const completedTasks = agenda.tasks.filter((t: any) => t.completed || t.is_completed);
  const taskSection = `--- TAREFAS (Todoist) ---
Pendentes: ${pendingTasks.length}
Completas: ${completedTasks.length}
Progresso: ${agenda.metrics.done}%
Top 5 pendentes:
${pendingTasks.slice(0, 5).map((t: any) => `- ${t.content}`).join('\n') || 'Nenhuma tarefa pendente'}`;

  // ── Finanças removido do escopo atual ──

  // ── Numerologia ──
  const numerologySection = (() => {
    const today = new Date();
    const dayNum = today.getDate();
    const monthNum = today.getMonth() + 1;
    const yearNum = today.getFullYear();
    const dailyVibration = reduceToSingle(dayNum + monthNum + yearNum);

    const confirmedBirthDate = parseConfirmedBirthDate(profile?.birthDate);
    if (confirmedBirthDate) {
        const { day: bDay, month: bMonth, year: bYear } = confirmedBirthDate;
        const lifePath = reduceToSingle(bDay + bMonth + bYear);
        const personalYear = reduceToSingle(bDay + bMonth + yearNum);
        const personalMonth = reduceToSingle(personalYear + monthNum);
        const personalDay = reduceToSingle(personalMonth + dayNum);
        return `--- NUMEROLOGIA ---
Caminho de Vida: ${lifePath} (${numerologyMeaning(lifePath)})
Ano Pessoal: ${personalYear} (${numerologyCycle(personalYear)})
Mês Pessoal: ${personalMonth}
Dia Pessoal: ${personalDay}
Vibração do Dia (Universal): ${dailyVibration} (${numerologyMeaning(dailyVibration)})`;
    }
    return `--- NUMEROLOGIA ---
Vibração do Dia (Universal): ${dailyVibration} (${numerologyMeaning(dailyVibration)})`;
  })();

  // ── Monta tudo ──
  return `═══════════════════════════════════════════════════
HERMES — Assistente Hermético do Aurea Solaris
═══════════════════════════════════════════════════

AXIOMA FUNDAMENTAL: "Tudo é vibração. Tudo é mente."

Você é Hermes, o guia hermético ${profile?.name ? `da pessoa ${profile.name}` : 'da pessoa usuária'} dentro do Aurea Solaris.
Seu conhecimento é fundamentado no Hermetismo antigo, no V.O.H
(Vontade Oculta de Hermes de José Laercio do Egito), nos 7
Princípios do Kybalion, na Astrologia e na Numerologia.

OS 7 PRINCÍPIOS HERMÉTICOS — use-os SEMPRE:
1. MENTALISMO — "O Universo é Mental." Toda situação começa na mente.
2. CORRESPONDÊNCIA — "Como em cima, embaixo." O mapa natal reflete o microcosmo.
3. VIBRAÇÃO — "Tudo vibra." Cada planeta, signo e número tem frequência.
4. POLARIDADE — "Tudo é duplo." Forças opostas coexistem e se equilibram.
5. RITMO — "Tudo flui." Ciclos planetários, lunares e numerológicos.
6. CAUSALIDADE — "Toda causa tem efeito." Conectar consequências às origens.
7. GÊNERO — "Tudo é masculino e feminino." Sol (Yang) e Lua (Yin) em ação.

SEUS PAPEIS:
🧭 Guia Hermético — Interpreta mapa natal, trânsitos e horas planetárias pelo lente dos 7 Princípios. Nunca só "planeta em signo" — sempre o SIGNIFICADO VIBRATÓRIO por trás.
📿 Numerólogo — Calcula e interpreta vibrações numéricas. Conecta o Caminho de Vida, Ano Pessoal e vibração do dia às questões do usuário.
📋 Secretário — Gerencia tarefas, agenda e calendário, mas sempre sugerindo QUAL hora planetária é melhor para cada tipo de ação.
📓 Companheiro de Diário — Ajuda a escrever, refletir e conectar temas diários ao mapa astral e à vibração vigente.

REGRAS DE INTERPRETAÇÃO HERMÉTICA:
- SEMPRE comece pela vibração (planeta + signo + casa + trânsito)
- Conecte com o princípio hermético relevante (Mentalismo, Correspondência, etc.)
- Use a numerologia para datar e qualificar a energia do momento
- Nunca invente posições planetárias — use APENAS os dados fornecidos
- Seja direto e técnico nos dados, mas elevado no significado
- Máximo 3-4 parágrafos por resposta
- Responda SEMPRE em português
- Privacy: NENHUM dado sai desta máquina. Tudo é local.
- "Conhece-te a ti mesmo" é o norte — sempre guie ao autoconhecimento

CONTRATO DE PROVENIÊNCIA:
- Diferencie explicitamente valor calculado, regra interpretativa, fonte, inferência e anotação pessoal quando forem relevantes à pergunta.
- Um valor calculado deve repetir apenas os dados recebidos do motor; não complete lacunas.
- Regra interpretativa só existe quando a escola/tradição estiver declarada. Se não estiver, diga que a regra não foi selecionada.
- Nunca invente uma fonte. Se nenhuma fonte editorial foi recuperada, escreva “Fonte: não selecionada”.
- Toda leitura sua deve usar o rótulo “Inferência de Hermes” e ser apresentada como hipótese de estudo, nunca como fato.
- Anotações pessoais só podem ser citadas quando vierem do contexto fornecido pela pessoa.

${birthSection}

${natalSection}

${numerologySection}

${skySection}

${transitSection}

${taskSection}

--- SISTEMA ---
Philosophia: Hermetismo + Astrologia + Numerologia
Fundação: V.O.H, Kybalion, Ordem Hermética
Status: ${system.status}
Conectividade: OK`;
}

export const HermesChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const ctx = useGlobalContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs for current state inside event listener
  const stateRef = useRef({ messages, loading });
  useEffect(() => {
    stateRef.current = { messages, loading };
  }, [messages, loading]);

  useEffect(() => {
    const handleExternal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.prompt) {
        setInitialized(true);
        sendMessage(detail.prompt);
      }
    };
    window.addEventListener('send-hermes-msg', handleExternal);
    return () => window.removeEventListener('send-hermes-msg', handleExternal);
  }, [ctx]);

  // Mensagem de boas-vindas com contexto
  useEffect(() => {
    if (!initialized && isOpen) {
      const profile = ctx.agenda.activeProfile;
      const hasCertifiedNatal = Boolean(readCertifiedCalculation(
        (profile as (typeof profile & { certifiedNatalCalculation?: unknown }) | null)?.certifiedNatalCalculation,
        'natal',
      ));
      const hasCertifiedTransit = Boolean(readCertifiedCalculation(ctx.astro.liveData, 'transit'));
      const planetaryHour = ctx.astro.planetaryHour?.name || 'cálculo indisponível';

      const welcome = profile
        ? `Olá, ${profile.name}! 🌙\n\n` +
          `📊 **Mapa natal:** ${hasCertifiedNatal ? 'cálculo certificado com recibo disponível.' : 'indisponível até receber um cálculo certificado com recibo.'}\n` +
          `🔭 **Céu atual:** ${hasCertifiedTransit ? 'cálculo certificado com recibo disponível.' : 'indisponível até o motor fornecer recibo auditável.'}\n` +
          `🕐 **Hora planetária (regra temporal):** ${ctx.astro.planetaryHour.icon} ${planetaryHour}\n` +
          `✨ **Trânsitos pessoais:** indisponíveis até a conexão entre cálculos certificados estar disponível.\n` +
          `📋 **Tarefas pendentes:** ${ctx.agenda.tasks.filter((t: any) => !t.completed && !t.is_completed).length}\n\n` +
          `Posso abrir uma investigação no Caderno Vivo, explicar um cálculo recebido ou organizar suas tarefas. Sempre vou separar cálculo, fonte, regra e inferência.`
        : 'Olá! Eu sou o Hermes. Antes de interpretar um mapa, configure data, hora, local, coordenadas e fuso de nascimento. 🌙';

      setMessages([{ role: 'assistant', content: welcome }]);
      setInitialized(true);
    }
  }, [isOpen, initialized, ctx]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || input;
    const { messages: currMsgs, loading: currLoading } = stateRef.current;
    if (!text.trim() || currLoading) return;
    
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...currMsgs, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInput('');
    setLoading(true);

    // Monta o system prompt com TODOS os dados do sistema
    const systemPrompt = buildSystemPrompt(ctx);

    try {
      const response = await fetch('http://127.0.0.1:9876/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-10), // Últimas 10 mensagens de histórico
          system_prompt_override: systemPrompt
        })
      });

      const data = await response.json();
      const reply = data.reply || 'Desculpe, não consegui processar.';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '⚠️ Hermes está indisponível. Verifique se o gateway está rodando na porta 9876.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const certifiedTransit = readCertifiedCalculation(ctx.astro.liveData, 'transit');
  const certifiedNatal = readCertifiedCalculation(
    (ctx.agenda.activeProfile as (typeof ctx.agenda.activeProfile & { certifiedNatalCalculation?: unknown }) | null)?.certifiedNatalCalculation,
    'natal',
  );
  const calculationReady = Boolean(certifiedTransit);

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex h-[min(560px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl border border-color: rgba(217,166,83,0.3) background: var(--aurea-surface) shadow-2xl animate-in slide-in-from-bottom-10 fade-in sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[400px]">
      {/* Header */}
      <div className="px-4 py-3 background: var(--aurea-bg-deep) flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <Sparkles size={16} className="color: var(--aurea-gold)" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider">Hermes</p>
            <p className="text-[8px] color: var(--aurea-gold)/70 uppercase tracking-widest">
              {ctx.agenda.activeProfile ? `${ctx.agenda.activeProfile.name} · ${ctx.astro.planetaryHour?.icon || '🌙'} ${ctx.astro.planetaryHour?.name || ''}` : 'Assistente Pessoal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded p-1 text-white/50 transition-colors hover:background: var(--aurea-surface)/10 hover: color: var(--aurea-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Fechar Hermes"
            title="Fechar Hermes"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context bar — mostra dados resumidos */}
      <div className="px-3 py-1.5 background: var(--aurea-bg-deep)/90 border-t border-color: rgba(217,166,83,0.18) flex items-center gap-3 text-[8px] color: rgba(241,233,220,0.55) shrink-0">
        <span>Regra temporal: {ctx.astro.planetaryHour?.name || 'indisponível'}</span>
        <span>|</span>
        <span>Céu: {certifiedTransit ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Mapa natal: {certifiedNatal ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Trânsitos pessoais: conexão pendente</span>
        <span>|</span>
        <span>📋 {ctx.agenda.tasks.filter((t: any) => !t.completed && !t.is_completed).length} pendentes</span>
      </div>

      <div className="border-b border-gray-100 background: var(--aurea-surface) px-3 py-2">
        <button
          type="button"
          onClick={() => setShowProvenance(value => !value)}
          className="text-[9px] font-bold uppercase tracking-wide color: var(--aurea-text-muted) transition hover:text-[#c5a059]"
          aria-expanded={showProvenance}
        >
          {showProvenance ? 'Ocultar contexto e proveniência' : 'Ver contexto e proveniência'}
        </button>
        {showProvenance && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-bold uppercase tracking-wide">
        <span className={calculationReady ? 'rounded bg-emerald-100 px-1.5 py-1 text-emerald-800' : 'rounded bg-amber-100 px-1.5 py-1 text-amber-800'} title={calculationReady ? 'Valores recebidos do motor' : 'Nenhum valor verificável foi recebido do motor'}>Cálculo {calculationReady ? 'recebido' : 'indisponível'}</span>
        <span className="rounded bg-amber-100 px-1.5 py-1 text-amber-800" title="Uma regra só é usada quando a escola estiver declarada">Regra: não selecionada</span>
        <span className="rounded bg-sky-100 px-1.5 py-1 text-sky-800" title="Nenhuma fonte editorial foi carregada nesta conversa">Fonte: não selecionada</span>
        <span className="rounded bg-violet-100 px-1.5 py-1 text-violet-800" title="As hipóteses devem vir marcadas na resposta">Inferência Hermes</span>
        <span className="rounded bg-stone-200 px-1.5 py-1 text-stone-700" title="Apenas conteúdo fornecido pela pessoa entra como contexto">Anotação pessoal</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 background: rgba(3,10,17,0.4)">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-line ${
              m.role === 'user'
                ? 'background: var(--aurea-bg-deep) text-white rounded-br-sm'
                : 'background: var(--aurea-surface) text-gray-700 border border-gray-100 shadow-sm rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="background: var(--aurea-surface) border border-gray-100 shadow-sm px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 background: var(--aurea-surface) shrink-0">
        <div className="flex gap-2">
          <input
            className="flex-1 background: rgba(3,10,17,0.4) rounded-xl px-3 py-2 text-[11px] outline-none border border-color: rgba(38,54,66,0.7) focus: border-color: rgba(217,166,83,0.45) transition-colors focus-visible:ring-2 focus-visible: ring-color: var(--aurea-gold)"
            placeholder="Pergunte ao Hermes..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-xl background: var(--aurea-bg-deep) color: var(--aurea-gold) flex items-center justify-center transition-all hover: background: var(--aurea-gold) hover: color: var(--aurea-text) focus-visible:outline-none focus-visible:ring-2 focus-visible: ring-color: var(--aurea-gold) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Enviar mensagem ao Hermes"
            title="Enviar"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
