import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import type { BirthData } from '../types/private-profile';
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

function resolveActiveSubject(ctx: ReturnType<typeof useGlobalContext>) {
  const owner = ctx.agenda.activeProfile;
  const subject = ctx.agenda.mapSubjects?.find(candidate =>
    candidate.ownerProfileId === owner?.id && candidate.id === ctx.agenda.activeSubjectId
  );
  return {
    owner,
    subject,
    source: subject?.source ?? owner,
    name: subject?.name ?? owner?.name ?? 'Mapa não selecionado',
  };
}

export function buildSystemPrompt(ctx: ReturnType<typeof useGlobalContext>): string {
  const { astro, system } = ctx;
  const { owner, subject, source, name } = resolveActiveSubject(ctx);
  const birthSource = (source?.birthData ?? source?.natal ?? {}) as BirthData;
  const birthDate = source?.birthDate ?? birthSource.birthDate ?? birthSource.date;
  const birthTime = source?.birthTime ?? birthSource.birthTime ?? birthSource.time;
  const birthPlace = source?.birthCity ?? birthSource.birthCity ?? birthSource.location;
  const birthTimezone = source?.birthTimezone ?? birthSource.birthTimezone ?? birthSource.timezone;

  const certifiedNatal = readCertifiedCalculation(source?.certifiedNatalCalculation, 'natal');
  const certifiedTransit = readCertifiedCalculation(astro.liveData, 'transit');

  const natalSection = certifiedNatal
    ? `MAPA NATAL — VALORES CALCULADOS
Recibo: ${certifiedNatal.meta.receipt.input_hash}
UTC: ${certifiedNatal.meta.receipt.resolved_time.utc}
Fuso IANA: ${certifiedNatal.meta.receipt.resolved_time.iana_timezone}
Motor: ${certifiedNatal.meta.receipt.engine.name} ${certifiedNatal.meta.receipt.engine.version}
Posições: ${formatCalculatedPositions(certifiedNatal.planets) || 'O recibo não trouxe posições legíveis.'}`
    : 'MAPA NATAL — indisponível: este sujeito não possui cálculo certificado no contexto recebido.';

  const skySection = certifiedTransit
    ? `CÉU ATUAL — VALORES CALCULADOS
Recibo: ${certifiedTransit.meta.receipt.input_hash}
UTC: ${certifiedTransit.meta.receipt.resolved_time.utc}
Fuso IANA: ${certifiedTransit.meta.receipt.resolved_time.iana_timezone}
Motor: ${certifiedTransit.meta.receipt.engine.name} ${certifiedTransit.meta.receipt.engine.version}
Posições: ${formatCalculatedPositions(certifiedTransit.planets) || 'O recibo não trouxe posições legíveis.'}`
    : 'CÉU ATUAL — indisponível: nenhum cálculo certificado foi recebido.';

  return `HERMES — tutor de estudo do Aurea Solaris

ESCOPO DA CONVERSA
Titular autenticado: ${owner?.name ?? 'indisponível'}
Mapa em foco: ${name}
Tipo de mapa: ${subject?.kind === 'connection' ? 'conexão autorizada' : subject?.kind === 'profile' ? 'mapa do titular' : 'não identificado'}
Nascimento informado: ${birthDate ?? 'data indisponível'} · ${birthTime ?? 'hora indisponível'} · ${birthPlace ?? 'local indisponível'} · ${birthTimezone ?? 'fuso indisponível'}

CONTRATO DE VERDADE
- Responda em português, com clareza e sem inventar dados, fontes, escolas ou cálculos.
- Separe explicitamente: Valor calculado; Regra interpretativa; Fonte; Inferência de Hermes; Anotação pessoal.
- Um valor calculado só pode repetir o que veio de um recibo auditável.
- Uma regra interpretativa só pode ser aplicada quando a escola/tradição e a fonte tiverem sido recuperadas.
- Se não houver fonte editorial no contexto, escreva “Fonte: não selecionada” e não improvise uma interpretação.
- Toda hipótese sua deve ser rotulada “Inferência de Hermes” e apresentada como possibilidade de estudo.
- Não crie memória, tarefa, evento ou registro. Apenas proponha uma ação revisável quando a pessoa pedir.
- Não use tarefas, dados de saúde, numerologia, horas planetárias ou anotações que não estejam neste contexto.
- Mantenha a resposta concisa e adequada à pergunta.

${natalSection}

${skySection}

TRÂNSITOS PESSOAIS — indisponíveis até existir vínculo auditável entre o mapa natal em foco e o céu calculado.
BASE EDITORIAL — nenhuma fonte foi recuperada para esta conversa.
ESTADO LOCAL — ${system.status}.`;
}

export const HermesChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const ctx = useGlobalContext();
  const activeOwner = ctx.agenda.activeProfile;
  const activeSubject = ctx.agenda.mapSubjects?.find(subject =>
    subject.ownerProfileId === activeOwner?.id && subject.id === ctx.agenda.activeSubjectId
  );
  const activeSubjectName = activeSubject?.name ?? activeOwner?.name ?? 'Mapa não selecionado';
  const activeSubjectSource = activeSubject?.source ?? activeOwner;
  const activeTopicKey = activeOwner && activeSubject
    ? `hermes:owner:${activeOwner.id}:subject:${activeSubject.id}`
    : null;
  const certifiedNatal = readCertifiedCalculation(
    activeSubjectSource?.certifiedNatalCalculation,
    'natal',
  );
  const certifiedTransit = readCertifiedCalculation(ctx.astro.liveData, 'transit');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState('Memoria local: aguardando perfil.');
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(true);
  const [provider, setProvider] = useState<'openai' | 'hermes_gateway'>('openai');
  const [externalConsent, setExternalConsent] = useState(false);
  const assistantIndexRef = useRef<number | null>(null);
  const [useFullPrompt, setUseFullPrompt] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<(overrideText?: string) => Promise<void>>(async () => {});
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

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
        void sendMessageRef.current(detail.prompt);
      }
    };
    window.addEventListener('send-hermes-msg', handleExternal);
    return () => window.removeEventListener('send-hermes-msg', handleExternal);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const profile = ctxRef.current.agenda.activeProfile;
    setThreadId(null);
    setInitialized(false);

    if (!profile) {
      setMemoryStatus('Memoria local indisponivel: entre em um perfil.');
      return () => {
        cancelled = true;
      };
    }

    const topicKey = activeTopicKey ?? `hermes:owner:${profile.id}:subject:${profile.id}`;
    const title = `Hermes — ${activeSubjectName}`;

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
      setMessages(restoredMessages);
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
    activeOwner?.id,
    activeTopicKey,
    activeSubjectName,
  ]);

  // Mensagem de boas-vindas com contexto
  useEffect(() => {
    if (!initialized && isOpen) {
      const profile = activeOwner;
      const hasCertifiedNatal = Boolean(readCertifiedCalculation(
        activeSubjectSource?.certifiedNatalCalculation,
        'natal',
      ));
      const hasCertifiedTransit = Boolean(readCertifiedCalculation(ctxRef.current.astro.liveData, 'transit'));

      const welcome = profile
        ? `Olá! O estudo em foco é **${activeSubjectName}**.\n\n` +
          `📊 **Mapa natal:** ${hasCertifiedNatal ? 'cálculo certificado com recibo disponível.' : 'indisponível até receber um cálculo certificado com recibo.'}\n` +
          `🔭 **Céu atual:** ${hasCertifiedTransit ? 'cálculo certificado com recibo disponível.' : 'indisponível até o motor fornecer recibo auditável.'}\n` +
          `✨ **Trânsitos pessoais:** indisponíveis até a conexão entre cálculos certificados estar disponível.\n` +
          `📚 **Fonte editorial:** ainda não selecionada para esta conversa.\n\n` +
          `Posso explicar um cálculo recebido ou ajudar a estruturar uma investigação. Sempre vou separar cálculo, fonte, regra e inferência.`
        : 'Olá! Eu sou o Hermes. Antes de interpretar um mapa, configure data, hora, local, coordenadas e fuso de nascimento. 🌙';

      setMessages([{ role: 'assistant', content: welcome }]);
      setInitialized(true);
    }
  }, [isOpen, initialized, activeOwner, activeSubjectName, activeSubjectSource]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (overrideText?: string) => {
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
    const ownerId = activeOwner?.id;
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
      let promptToUse = buildSystemPrompt(ctxRef.current);
      if (useFullPrompt) {
        setUseFullPrompt(false);
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
            },
            externalConsent,
            provider,
          );
        });
      } else {
        const t0 = Date.now();
        const reply = await sendChatMessage(
          contextMessages,
          undefined,
          promptToUse,
          externalConsent,
          provider,
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
  }, [
    activeOwner?.id,
    externalConsent,
    input,
    provider,
    streamingEnabled,
    threadId,
    useFullPrompt,
  ]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

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
        topicKey: activeTopicKey ?? `hermes:owner:${ownerId}:subject:${ownerId}`,
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

  const calculationReady = Boolean(certifiedTransit);

  return (
    <aside className="hermes-panel fixed inset-x-3 bottom-3 z-50 flex h-[min(620px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl aurea-modal animate-in slide-in-from-bottom-10 fade-in sm:inset-x-auto sm:bottom-6 sm:right-6" aria-label={`Hermes — estudo de ${activeSubjectName}`}>
      {/* Header */}
      <div className="aurea-shell-dark px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <Sparkles size={16} className="text-[var(--aurea-gold)]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider">Hermes</p>
            <p className="text-[8px] text-[var(--aurea-gold)]/70 uppercase tracking-widest">
              {activeOwner ? `Mapa em foco · ${activeSubjectName}` : 'Assistente de estudo'}
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
        <span>Céu: {certifiedTransit ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Mapa natal: {certifiedNatal ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Trânsitos pessoais: conexão pendente</span>
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
                    Propor memória
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
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-[var(--aurea-text-muted)]">
          <label className="flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wide">Provedor</span>
            <select
              value={provider}
              onChange={event => setProvider(event.target.value as 'openai' | 'hermes_gateway')}
              className="rounded border border-[var(--aurea-line)] bg-[var(--aurea-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--aurea-text)]"
              aria-label="Provedor do Hermes"
            >
              <option value="openai">ChatGPT / OpenAI</option>
              <option value="hermes_gateway">Hermes Gateway</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={externalConsent}
              onChange={event => setExternalConsent(event.target.checked)}
            />
            <span>Permito enviar esta conversa ao provedor selecionado</span>
          </label>
        </div>
        <div className="flex gap-2">
          <input
            className="aurea-input flex-1 rounded-xl px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)]"
            placeholder="Pergunte ao Hermes..."
            aria-label="Pergunte ao Hermes"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && externalConsent && sendMessage()}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || !externalConsent}
            className="aurea-button-primary flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-all hover:bg-[var(--aurea-gold)] hover:text-[var(--aurea-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Enviar mensagem ao Hermes"
            title="Enviar"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
