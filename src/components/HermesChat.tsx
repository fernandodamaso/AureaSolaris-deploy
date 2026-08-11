import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import { parseConfirmedBirthDate, readCertifiedCalculation } from '../utils/certifiedCalculation';
import {
  appendHermesMessage,
  getHermesThreadContext,
  HermesStoredMessage,
  openHermesThread,  proposeHermesMemory,  sendChatMessage, sendChatMessageStream,
} from '../services/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function storedMessageToChat(message: HermesStoredMessage): ChatMessage | null {
  if (message.role === 'user') return { role: 'user', content: message.content };
  if (message.role === 'hermes' || message.role === 'system') {
    return { role: 'assistant', content: message.content };
  }
  return null;
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
  const taskSection = `--- TAREFAS ---
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
- Privacidade: esta conversa usa somente o serviço local. Um provedor externo só pode receber dados após autorização explícita da pessoa para aquela conversa.
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

function summarizeSystemPrompt(full: string): string {
  if (!full) return '';
  // If already short, return as-is
  if (full.length <= 1200) return full;
  // Prefer cutting at a nearby newline for readability
  const snippet = full.slice(0, 1200);
  const lastNewline = snippet.lastIndexOf('\n');
  const cut = lastNewline > 200 ? snippet.slice(0, lastNewline) : snippet;
  return cut + '\n\n[...resumo do contexto. Ative "Ver contexto" para o prompt completo]';
}

export const HermesChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const ctx = useGlobalContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState('Memoria local: aguardando perfil.');
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [systemPromptSummary, setSystemPromptSummary] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(true);
  const assistantIndexRef = useRef<number | null>(null);
  const [useFullPrompt, setUseFullPrompt] = useState<boolean>(false);
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

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const profile = ctx.agenda.activeProfile;
    setThreadId(null);
    setInitialized(false);

    if (!profile) {
      setMemoryStatus('Memoria local indisponivel: entre em um perfil.');
      return () => {
        cancelled = true;
      };
    }

    const topicKey = `hermes:profile:${profile.id}:geral`;
    const title = `Hermes - ${profile.name}`;

    const openPersistentThread = async () => {
      setMemoryStatus('Abrindo memoria local...');
      const opened = await openHermesThread({
        ownerId: profile.id,
        topicKey,
        title,
      });
      const context = await getHermesThreadContext({
        ownerId: profile.id,
        threadId: opened.thread.id,
        limit: 50,
      });

      if (cancelled) return;
      const restoredMessages = context.messages
        .map(storedMessageToChat)
        .filter((message): message is ChatMessage => Boolean(message));
      setThreadId(opened.thread.id);
      setMemoryStatus(
        restoredMessages.length
          ? `Memoria local ativa: ${restoredMessages.length} mensagens recuperadas.`
          : 'Memoria local ativa: novo fio de estudo.',
      );
      if (restoredMessages.length) {
        setMessages(restoredMessages);
      }
      // build and cache the system prompt once after restoring context
      try {
        const prompt = buildSystemPrompt(ctx);
        setSystemPrompt(prompt);
        try {
          setSystemPromptSummary(summarizeSystemPrompt(prompt));
        } catch {
          setSystemPromptSummary(null);
        }
      } catch (err) {
        // ignore; fallback to on-demand build during send
        setSystemPrompt(null);
        setSystemPromptSummary(null);
      }
      setInitialized(true);
    };

    openPersistentThread().catch(error => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      setMemoryStatus(`Memoria local indisponivel: ${message}`);
    });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    ctx.agenda.activeProfile?.id,
    ctx.agenda.activeProfile?.name,
  ]);

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

    // Monta o contexto local necessário. O backend recusa qualquer provedor
    // externo até existir consentimento explícito para a conversa.
    const ownerId = ctx.agenda.activeProfile?.id;
    const currentThreadId = threadId;

    try {
      if (ownerId && currentThreadId) {
        appendHermesMessage({
          ownerId,
          threadId: currentThreadId,
          role: 'user',
          content: text,
          provenanceKind: 'personal_statement',
        }).catch(() => {
          setMemoryStatus('Memoria local indisponivel: a sua mensagem nao foi gravada.');
        });
      }

      // Choose which prompt to use. If the user requested full prompt for
      // the next message, use it and reset the flag; otherwise prefer the
      // summarized prompt for speed.
      let promptToUse: string;
      if (useFullPrompt) {
        promptToUse = (systemPrompt as string) ?? buildSystemPrompt(ctx);
        setUseFullPrompt(false);
      } else {
        promptToUse = (systemPromptSummary as string) ?? (systemPrompt as string) ?? buildSystemPrompt(ctx);
      }
      const contextMessages = newMessages.slice(-6).map(message => ({ role: message.role, content: message.content }));
      if (streamingEnabled) {
        // create assistant placeholder message
        const withPlaceholder = [...newMessages, { role: 'assistant', content: '' } as ChatMessage];
        assistantIndexRef.current = withPlaceholder.length - 1;
        setMessages(withPlaceholder);
        const t0 = Date.now();
        let finalText = '';
        await new Promise<void>((resolve, reject) => {
          sendChatMessageStream(
            contextMessages,
            promptToUse,
            (chunk) => {
              finalText += chunk;
              setMessages(prev => {
                const copy = prev.slice();
                const idx = assistantIndexRef.current ?? (copy.length - 1);
                if (idx >= 0 && idx < copy.length) {
                  copy[idx] = { ...copy[idx], content: finalText };
                }
                return copy;
              });
            },
            () => {
              const latency = Date.now() - t0;
              setLastLatencyMs(latency);
              setMemoryStatus(`Memoria local ativa: ultima troca gravada. (resposta em ${Math.round(latency)} ms)`);
              // persist the final assistant message
              if (ownerId && currentThreadId) {
                appendHermesMessage({
                  ownerId,
                  threadId: currentThreadId,
                  role: 'hermes',
                  content: finalText,
                  provenanceKind: 'hermes_inference',
                }).then(() => setMemoryStatus('Memoria local ativa: ultima troca gravada.')).catch(() => setMemoryStatus('Memoria local indisponivel: a resposta nao foi gravada.'));
              }
              resolve();
            },
            (err) => {
              reject(err);
            }
          );
        });
      } else {
        const t0 = Date.now();
        const reply = await sendChatMessage(
          contextMessages,
          undefined,
          promptToUse,
        );
        const latency = Date.now() - t0;
        setLastLatencyMs(latency);
        setMemoryStatus(`Memoria local ativa: ultima troca gravada. (resposta em ${Math.round(latency)} ms)`);

        if (ownerId && currentThreadId) {
          appendHermesMessage({
            ownerId,
            threadId: currentThreadId,
            role: 'hermes',
            content: reply,
            provenanceKind: 'hermes_inference',
          }).then(() => {
            setMemoryStatus('Memoria local ativa: ultima troca gravada.');
          }).catch(() => {
            setMemoryStatus('Memoria local indisponivel: a resposta nao foi gravada.');
          });
        }
        setMessages([...newMessages, { role: 'assistant', content: reply } as ChatMessage]);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível contatar o serviço local do Hermes.';
      if (ownerId && currentThreadId) {
        await appendHermesMessage({
          ownerId,
          threadId: currentThreadId,
          role: 'system',
          content: message,
          provenanceKind: 'system_notice',
        }).catch(() => {
          setMemoryStatus('Memoria local indisponivel: nao foi possivel gravar o aviso.');
        });
      }
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ ${message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const proposeHermesMemoryFromMessage = async (message: ChatMessage) => {
    const ownerId = ctx.agenda.activeProfile?.id;
    const currentThreadId = threadId;
    if (!ownerId || !currentThreadId || message.role !== 'assistant') return;

    setMemoryStatus('Propondo memória Hermes...');
    try {
      await proposeHermesMemory({
        ownerId,
        content: message.content,
        memoryType: 'study_note',
        evidenceNote: `Memória proposta a partir da conversa Hermes no tópico ${currentThreadId}.`,
        topicKey: `hermes:profile:${ownerId}:geral`,
        sourceThreadId: currentThreadId,
        confidence: 'inferred',
      });
      setMemoryStatus('Memória Hermes proposta com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha ao propor memoria';
      setMemoryStatus(`Memória local indisponível: ${message}`);
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
    <div className="hermes-panel fixed inset-x-3 bottom-3 z-50 flex h-[min(620px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl aurea-modal animate-in slide-in-from-bottom-10 fade-in sm:inset-x-auto sm:bottom-6 sm:right-6">
      {/* Header */}
      <div className="aurea-shell-dark px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <Sparkles size={16} className="text-[var(--aurea-gold)]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider">Hermes</p>
            <p className="text-[8px] text-[var(--aurea-gold)]/70 uppercase tracking-widest">
              {ctx.agenda.activeProfile ? `${ctx.agenda.activeProfile.name} · ${ctx.astro.planetaryHour?.icon || '🌙'} ${ctx.astro.planetaryHour?.name || ''}` : 'Assistente Pessoal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStreamingEnabled(s => !s)}
            className={`rounded px-2 py-1 text-sm font-medium transition ${streamingEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-800'}`}
            title={streamingEnabled ? 'Streaming: ligado' : 'Streaming: desligado'}
          >
            {streamingEnabled ? 'Streaming' : 'No Stream'}
          </button>
          <button
            type="button"
            onClick={() => setUseFullPrompt(true)}
            className="rounded px-2 py-1 text-sm font-medium bg-yellow-400 text-stone-900 hover:bg-yellow-500 transition"
            title="Enviar prompt completo na próxima mensagem"
          >
            Modo Completo
          </button>
          <button
            onClick={onClose}
            className="rounded p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Fechar Hermes"
            title="Fechar Hermes"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context bar — mostra dados resumidos */}
      <div className="aurea-shell-dark px-3 py-2 border-t border-white/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--aurea-text-on-dark)] shrink-0">
        <span>Regra temporal: {ctx.astro.planetaryHour?.name || 'indisponível'}</span>
        <span>|</span>
        <span>Céu: {certifiedTransit ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Mapa natal: {certifiedNatal ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Trânsitos pessoais: conexão pendente</span>
        <span>|</span>
        <span>📋 {ctx.agenda.tasks.filter((t: any) => !t.completed && !t.is_completed).length} pendentes</span>
        <span>|</span>
        {lastLatencyMs !== null && (
          <span title={`Última resposta em ${Math.round(lastLatencyMs)} ms`} className="font-mono">Última resposta: {(lastLatencyMs / 1000).toFixed(2)}s</span>
        )}
        <span>|</span>
        <span>{memoryStatus}</span>
      </div>

      <div className="border-b border-gray-100 bg-[var(--aurea-surface)] px-3 py-2">
        <button
          type="button"
          onClick={() => setShowProvenance(value => !value)}
          className="text-[10px] font-bold uppercase tracking-wide text-[#596a76] transition hover:text-[var(--aurea-gold-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)] focus-visible:ring-offset-2"
          aria-expanded={showProvenance}
        >
          {showProvenance ? 'Ocultar contexto e proveniência' : 'Ver contexto e proveniência'}
        </button>
        {showProvenance && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wide">
        <span className={calculationReady ? 'rounded bg-emerald-100 px-1.5 py-1 text-emerald-800' : 'rounded bg-amber-100 px-1.5 py-1 text-amber-800'} title={calculationReady ? 'Valores recebidos do motor' : 'Nenhum valor verificável foi recebido do motor'}>Cálculo {calculationReady ? 'recebido' : 'indisponível'}</span>
        <span className="rounded bg-amber-100 px-1.5 py-1 text-amber-800" title="Uma regra só é usada quando a escola estiver declarada">Regra: não selecionada</span>
        <span className="rounded bg-sky-100 px-1.5 py-1 text-sky-800" title="Nenhuma fonte editorial foi carregada nesta conversa">Fonte: não selecionada</span>
        <span className="rounded bg-violet-100 px-1.5 py-1 text-violet-800" title="As hipóteses devem vir marcadas na resposta">Inferência Hermes</span>
        <span className="rounded bg-stone-200 px-1.5 py-1 text-stone-700" title="Apenas conteúdo fornecido pela pessoa entra como contexto">Anotação pessoal</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="messages-area flex-1 overflow-y-auto p-4 space-y-3 bg-[rgb(15,23,42)]">
        {messages.length === 0 && !loading && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-[0.95rem] leading-relaxed text-[#f8fafc]">
            Hermes está pronto para conversar. Envie uma pergunta para iniciar a investigação.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-bubble ${m.role === 'user' ? 'user-bubble text-right' : 'assistant-bubble text-left'}`}>
              <div>{m.content}</div>
              {m.role === 'assistant' && ctx.agenda.activeProfile && threadId && (
                <div className="message-action flex justify-end">
                  <button
                    type="button"
                    onClick={() => void proposeHermesMemoryFromMessage(m)}
                    className="rounded-full border border-[var(--aurea-gold)] bg-[var(--aurea-gold)/10] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--aurea-gold)] transition hover:bg-[var(--aurea-gold)/20]"
                  >
                    Salvar como memória
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="message-bubble assistant-bubble px-3 py-2 rounded-3xl">
              <div className="flex items-center gap-2 text-[0.8rem] text-[#e7e7ea]">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--aurea-gold)]" />
                Hermes está pensando...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--aurea-line)] bg-[var(--aurea-surface)] shrink-0">
        <div className="flex gap-2">
          <input
            className="aurea-input flex-1 rounded-xl px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)]"
            placeholder="Pergunte ao Hermes..."
            aria-label="Pergunte ao Hermes"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="aurea-button-primary flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-all hover:bg-[var(--aurea-gold)] hover:text-[var(--aurea-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
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
