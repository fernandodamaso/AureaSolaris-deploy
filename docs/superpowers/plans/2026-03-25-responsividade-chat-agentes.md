# Responsividade dos Chats — Etapa 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o sistema de chat dos agentes de uma experiência "envia e espera" para uma interface fluida com streaming em tempo real, renderização rica e UX responsiva.

**Architecture:** Backend Rust emite eventos Tauri (`emit`/`emit_to`) a cada chunk recebido do Ollama/OpenRouter. Frontend escuta com `listen()` do `@tauri-apps/api/event` e atualiza o estado reativamente. Markdown é renderizado com `react-markdown` + `remark-gfm` + `react-syntax-highlighter`. Histórico usa virtualização com `react-virtuoso`.

**Tech Stack:**
- `@tauri-apps/api` — `listen()`, `emit()` para streaming
- `react-markdown` — renderização de markdown
- `remark-gfm` — tabelas, strikethrough, autolinks
- `react-syntax-highlighter` — code blocks com tema
- `react-virtuoso` — virtualização de mensagens longas
- `eventsource-parser` — parsing SSE (fallback browser mode)

---

## Task Map (arquivos)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src-tauri/src/lib.rs` | Comandos `ollama_chat_stream`, `openrouter_chat_stream` com emissão de eventos |
| `src/components/AgentChat.tsx` | Refatoração: hook `useChatStream`, renderização markdown, UX |
| `src/hooks/useChatStream.ts` | **NOVO** — Lógica de streaming (listen, emit, buffering) |
| `src/components/chat/ChatMessage.tsx` | **NOVO** — Componente de mensagem com markdown + copy button |
| `src/components/chat/TypingIndicator.tsx` | **NOVO** — Indicador de digitação animado |
| `src/utils/tauri.ts` | Adicionar `safeListen()` e mock de streaming |
| `package.json` | Novas dependências |

---

## Task 1: Streaming Backend — Comandos Rust com Event Emissão

**Objetivo:** Criar comandos `ollama_chat_stream` e `openrouter_chat_stream` que fazem streaming HTTP e emitem chunks via Tauri events.

**Files:**
- Modify: `src-tauri/src/lib.rs` (~linhas 53-84 e 108-159)
- Modify: `src-tauri/Cargo.toml` (adicionar `futures-util` ou `tokio-util` se necessário)

- [ ] **Step 1: Adicionar dependência `tokio-stream` no Cargo.toml**

```toml
# src-tauri/Cargo.toml — adicionar ao [dependencies]
tokio = { version = "1", features = ["full"] }
```

Nota: `reqwest` já suporta streaming com `.bytes_stream()`. O Tauri 2 já inclui `emit` nativamente. Não precisa de dependências extras se `reqwest` já tem feature `stream` — verificar se `rustls-tls` já habilita.

- [ ] **Step 2: Implementar `ollama_chat_stream`**

```rust
#[tauri::command]
async fn ollama_chat_stream(window: tauri::Window, messages: Vec<OpenRouterMessage>) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Falha ao criar cliente: {}", e))?;

    let req_body = serde_json::json!({
        "model": "llama3.2",
        "messages": messages,
        "stream": true
    });

    let res = client.post("http://localhost:11434/api/chat")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de rede Ollama: {}", e))?;

    if !res.status().is_success() {
        let err = res.text().await.unwrap_or_default();
        return Err(format!("Erro Ollama: {}", err));
    }

    let mut full_content = String::new();
    let mut stream = res.bytes_stream();

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Erro no stream: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

        // Ollama envia NDJSON: uma linha JSON por chunk
        for line in text.lines() {
            if line.trim().is_empty() { continue; }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(content) = json["message"]["content"].as_str() {
                    full_content.push_str(content);
                    let _ = window.emit("chat-stream-chunk", serde_json::json!({
                        "content": content,
                        "done": false
                    }));
                }
                if json["done"].as_bool() == Some(true) {
                    let _ = window.emit("chat-stream-chunk", serde_json::json!({
                        "content": "",
                        "done": true
                    }));
                }
            }
        }
    }

    Ok(full_content)
}
```

- [ ] **Step 3: Implementar `openrouter_chat_stream`**

```rust
#[tauri::command]
async fn openrouter_chat_stream(window: tauri::Window, model: String, messages: Vec<OpenRouterMessage>) -> Result<String, String> {
    dotenvy::from_filename(".env").ok();
    let api_key = std::env::var("OPENROUTER_API_KEY")
        .map_err(|_| "OPENROUTER_API_KEY não encontrada".to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Falha ao criar cliente: {}", e))?;

    let req_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    let res = client.post("https://openrouter.ai/api/v1/chat/completions")
        .bearer_auth(api_key)
        .header("HTTP-Referer", "https://github.com/aurea-solaris")
        .header("X-Title", "Aurea Solaris")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de rede OpenRouter: {}", e))?;

    if !res.status().is_success() {
        let err = res.text().await.unwrap_or_default();
        return Err(format!("Erro OpenRouter: {}", err));
    }

    let mut full_content = String::new();
    let mut stream = res.bytes_stream();

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Erro no stream: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

        // OpenRouter SSE: "data: {...}\n\n"
        for line in text.lines() {
            let line = line.trim();
            if !line.starts_with("data: ") { continue; }
            let data = &line[6..];
            if data == "[DONE]" {
                let _ = window.emit("chat-stream-chunk", serde_json::json!({
                    "content": "", "done": true
                }));
                continue;
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                    full_content.push_str(content);
                    let _ = window.emit("chat-stream-chunk", serde_json::json!({
                        "content": content, "done": false
                    }));
                }
            }
        }
    }

    Ok(full_content)
}
```

- [ ] **Step 4: Adicionar `futures-util` ao Cargo.toml e registrar handlers**

```toml
# Cargo.toml [dependencies]
futures-util = "0.3"
```

Registrar no `tauri::Builder`:
```rust
ollama_chat_stream,
openrouter_chat_stream,
```

- [ ] **Step 5: Compilar e verificar**

```bash
cd src-tauri && cargo check
```

Expected: compilação sem erros.

---

## Task 2: Frontend Streaming Hook — `useChatStream`

**Objetivo:** Criar hook React que escuta eventos Tauri e gerencia estado de streaming.

**Files:**
- Create: `src/hooks/useChatStream.ts`
- Modify: `src/utils/tauri.ts` (adicionar `safeListen`)

- [ ] **Step 1: Adicionar `safeListen` em `src/utils/tauri.ts`**

```typescript
import { listen, type UnlistenFn, type Event } from '@tauri-apps/api/event';

export async function safeListen<T>(
  event: string,
  handler: (event: Event<T>) => void
): Promise<UnlistenFn | null> {
  if (isTauri()) {
    return await listen<T>(event, handler);
  }
  // Browser mock: simular streaming
  return null;
}
```

- [ ] **Step 2: Criar `src/hooks/useChatStream.ts`**

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';
import { safeListen } from '../utils/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';

interface StreamChunk {
  content: string;
  done: boolean;
}

interface UseChatStreamReturn {
  streamingContent: string;
  isStreaming: boolean;
  startStream: (messages: any[], mode: 'ollama' | 'openrouter', model?: string) => Promise<string>;
  cancelStream: () => void;
}

export function useChatStream(): UseChatStreamReturn {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  const cancelStream = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    setIsStreaming(false);
    if (resolveRef.current) {
      resolveRef.current(streamingContent);
      resolveRef.current = null;
    }
  }, [streamingContent]);

  const startStream = useCallback(async (
    messages: any[],
    mode: 'ollama' | 'openrouter',
    model?: string
  ): Promise<string> => {
    setStreamingContent('');
    setIsStreaming(true);

    // Register listener BEFORE invoking command (race condition prevention)
    unlistenRef.current = await safeListen<StreamChunk>('chat-stream-chunk', (event) => {
      const { content, done } = event.payload;
      if (content) {
        setStreamingContent(prev => prev + content);
      }
      if (done) {
        setIsStreaming(false);
        if (unlistenRef.current) {
          unlistenRef.current();
          unlistenRef.current = null;
        }
      }
    });

    return new Promise<string>((resolve) => {
      resolveRef.current = resolve;

      const invokeStream = async () => {
        try {
          let fullResponse: string | null;
          if (mode === 'ollama') {
            fullResponse = await safeInvoke<string>('ollama_chat_stream', { messages });
          } else {
            fullResponse = await safeInvoke<string>('openrouter_chat_stream', { model, messages });
          }
          // Fallback: se o stream não emitiu eventos, usar resposta completa
          if (fullResponse && !streamingContent) {
            setStreamingContent(fullResponse);
          }
          resolve(fullResponse || streamingContent);
        } catch (e) {
          // Fallback para modo sem streaming
          console.warn('[useChatStream] Stream falhou, tentando sem stream', e);
          try {
            let fallback: string | null;
            if (mode === 'ollama') {
              fallback = await safeInvoke<string>('ollama_chat', { messages });
            } else {
              fallback = await safeInvoke<string>('openrouter_chat', { model, messages });
            }
            setStreamingContent(fallback || '');
            resolve(fallback || '');
          } catch (e2) {
            resolve('');
          }
        } finally {
          setIsStreaming(false);
        }
      };
      invokeStream();
    });
  }, []);

  return { streamingContent, isStreaming, startStream, cancelStream };
}
```

- [ ] **Step 3: Adicionar mock de streaming em `handleCommand` do `tauri.ts`**

```typescript
case 'ollama_chat_stream':
case 'openrouter_chat_stream': {
  // Simular streaming no browser mode
  const messages = args?.messages || [];
  const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
  let agent = 'Rafiki';
  if (systemMsg.includes('Dr. Strange')) agent = 'Dr. Strange';
  else if (systemMsg.includes('Alfred')) agent = 'Alfred';
  else if (systemMsg.includes('Uncle Duck')) agent = 'Uncle Duck';
  else if (systemMsg.includes('Stark')) agent = 'Stark';
  return getAgentResponse(agent) as T;
}
```

---

## Task 3: Componente `ChatMessage` — Markdown + Copy Button

**Objetivo:** Extrair renderização de mensagem para componente dedicado com markdown, syntax highlighting e botão copiar código.

**Files:**
- Create: `src/components/chat/ChatMessage.tsx`
- Modify: `package.json` (adicionar libs)

- [ ] **Step 1: Instalar dependências**

```bash
npm install react-markdown remark-gfm react-syntax-highlighter
npm install -D @types/react-syntax-highlighter
```

- [ ] **Step 2: Criar `src/components/chat/ChatMessage.tsx`**

```tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: string;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      title="Copiar código"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ content, role, timestamp }) => {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="max-w-[85%] p-3 rounded-lg text-[12px] font-medium leading-relaxed shadow-sm bg-gold text-white rounded-tr-none">
        <p className="whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <span className="block text-[9px] text-white/50 mt-1 text-right">{timestamp}</span>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[85%] p-3 rounded-lg text-[12px] leading-relaxed shadow-sm bg-white border border-gray-100 text-gray-700 rounded-tl-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (match) {
              return (
                <div className="relative group my-2 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                    <span>{match[1]}</span>
                    <CopyButton text={codeString} />
                  </div>
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0 0 8px 8px',
                      fontSize: '11px',
                      padding: '12px',
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 bg-gray-100 text-gold rounded text-[11px] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full text-[10px] border-collapse border border-gray-200">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-gray-200 px-2 py-1 bg-gray-50 font-bold text-left">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-gray-200 px-2 py-1">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-gold/30 pl-3 italic text-gray-500 my-2">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {timestamp && (
        <span className="block text-[9px] text-gray-300 mt-1 text-right">{timestamp}</span>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

---

## Task 4: Componente `TypingIndicator` — Indicador de Geração

**Objetivo:** Indicador visual sofisticado que mostra "digitando" durante streaming, com animação e feedback de progresso.

**Files:**
- Create: `src/components/chat/TypingIndicator.tsx`

- [ ] **Step 1: Criar `TypingIndicator.tsx`**

```tsx
import React from 'react';

interface TypingIndicatorProps {
  agent: string;
  contentSoFar?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ agent, contentSoFar }) => {
  const hasContent = contentSoFar && contentSoFar.length > 0;

  return (
    <div className="flex justify-start animate-in fade-in">
      <div className="bg-white border border-gray-100 p-3 rounded-lg rounded-tl-none shadow-sm">
        {hasContent ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gold font-bold animate-pulse">
              {agent} está escrevendo
            </span>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-gold rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-gold rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1 h-1 bg-gold rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[9px] text-gray-400">Pensando...</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Task 5: Refatorar `AgentChat.tsx` — Integrar Streaming + Markdown

**Objetivo:** Reescrever o `sendMessage` para usar `useChatStream`, substituir renderização de mensagens por `ChatMessage`, adicionar `TypingIndicator`.

**Files:**
- Modify: `src/components/AgentChat.tsx` (~linhas 1-404)

- [ ] **Step 1: Imports e hook**

Substituir imports no topo do arquivo:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Send, ChevronDown, Clock, Trash2, List, StopCircle } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { useAstrologyData } from '../hooks/useAstrologyData';
import { useAgendaContext } from '../context/AgendaContext';
import { useFinancas } from '../context/FinancasContext';
import { useChatStream } from '../hooks/useChatStream';
import { ChatMessage } from './chat/ChatMessage';
import { TypingIndicator } from './chat/TypingIndicator';
```

- [ ] **Step 2: Substituir `sendMessage` por versão streaming**

```tsx
const { streamingContent, isStreaming, startStream, cancelStream } = useChatStream();

// Adicionar estado para mensagem temporária durante stream
const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);

const sendMessage = async () => {
  if (!input.trim() || isStreaming) return;

  const userMsg = { role: 'user', content: input, timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  const newMessages = [...messages, userMsg];
  setMessages(newMessages);
  setInput('');
  setError(null);
  setShowScrollBtn(false);

  try {
    const systemMsg = { role: 'system', content: buildSystemPrompt() };
    const aiMode = localStorage.getItem('ai_master_switch') || 'ollama';
    const payload = [systemMsg, ...newMessages.slice(-8)];

    const savedConfig = localStorage.getItem(`agent_config_${agent}`);
    const config = savedConfig ? JSON.parse(savedConfig) : {};
    const model = config.model || 'openai/gpt-4o-mini';

    const mode = aiMode === 'ollama' ? 'ollama' : 'openrouter';
    const fullResponse = await startStream(payload, mode, model);

    if (fullResponse) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  } catch (e: any) {
    setError(e.toString());
  }
};
```

- [ ] **Step 3: Substituir renderização de mensagens**

Substituir o bloco `{messages.map(...)}` (linhas ~346-356):

```tsx
{messages.map((m, i) => (
  <div key={`${chatId}-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
    <ChatMessage content={m.content} role={m.role} timestamp={m.timestamp} />
  </div>
))}
{/* Streaming message em tempo real */}
{isStreaming && streamingContent && (
  <div className="flex justify-start animate-in fade-in">
    <ChatMessage content={streamingContent} role="assistant" />
  </div>
)}
{/* Typing indicator */}
{isStreaming && !streamingContent && (
  <TypingIndicator agent={agent} />
)}
```

- [ ] **Step 4: Adicionar botão cancelar no input**

No `<div className="relative flex items-center">` (linha ~384), adicionar botão de parar quando streaming:

```tsx
{isStreaming ? (
  <button
    onClick={cancelStream}
    className="absolute right-2 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
    title="Parar geração"
  >
    <StopCircle size={16} />
  </button>
) : (
  <button
    onClick={sendMessage}
    disabled={!input.trim()}
    className="absolute right-2 p-2 text-gold hover:bg-gold hover:text-white rounded-lg transition-all disabled:opacity-30"
  >
    <Send size={16} />
  </button>
)}
```

- [ ] **Step 5: Desabilitar input durante streaming**

```tsx
<input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && !isStreaming && sendMessage()}
  placeholder={isStreaming ? `${agent} está respondendo...` : `Falar com ${agent}...`}
  disabled={isStreaming}
  className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-4 pr-12 text-[12px] placeholder:text-gray-300 focus:outline-none focus:border-gold/30 transition-all font-medium disabled:bg-gray-50 disabled:cursor-not-allowed"
/>
```

- [ ] **Step 6: Debounce no save_history**

Evitar salvar a cada chunk do stream. Usar ref para controlar:

```tsx
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (messages.length > 0) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      safeInvoke('save_history', { agent, history: messages, chat_id: chatId || null })
        .catch(console.error);
    }, 1000); // 1s debounce
  }
  return () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };
}, [messages, agent, chatId]);
```

- [ ] **Step 7: Verificar build e lint**

```bash
npm run lint && npm run build
```

---

## Task 6: Erros Amigáveis + UX de Feedback

**Objetivo:** Melhorar tratamento de erros, adicionar toast de status e mensagens claras para falhas comuns (Ollama offline, timeout, rate limit).

**Files:**
- Modify: `src/components/AgentChat.tsx` (seção de error handling)
- Modify: `src/hooks/useChatStream.ts` (fallback robusto)

- [ ] **Step 1: Função de erro amigável**

Adicionar em `AgentChat.tsx`:

```tsx
const getFriendlyError = (error: any): string => {
  const msg = error?.toString() || '';
  if (msg.includes('Ollama') || msg.includes('localhost:11434')) {
    return 'Ollama está offline. Inicie com: ollama serve';
  }
  if (msg.includes('OPENROUTER_API_KEY')) {
    return 'Chave OpenRouter não configurada. Verifique o .env';
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return 'Tempo esgotado. O modelo demorou para responder.';
  }
  if (msg.includes('429') || msg.includes('rate')) {
    return 'Limite de requisições atingido. Aguarde um momento.';
  }
  if (msg.includes('network') || msg.includes('rede')) {
    return 'Erro de conexão. Verifique sua internet.';
  }
  return `Erro: ${msg.substring(0, 100)}`;
};
```

- [ ] **Step 2: Substituir exibição de erro (linha ~368)**

```tsx
{error && (
  <div className="mx-4 mb-2">
    <div className="flex items-center gap-2 text-[10px] text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100">
      <span className="flex-1">{getFriendlyError(error)}</span>
      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Adicionar retry em falha de stream**

No `useChatStream.ts`, após catch do fallback:

```typescript
// No catch do invokeStream, já existe fallback para ollama_chat/openrouter_chat
// Adicionar log para debugging:
console.warn('[useChatStream] Streaming falhou, usando modo síncrono:', e);
```

---

## Task 7: Virtualização de Histórico (Performance)

**Objetivo:** Quando houver muitas mensagens (>50), usar virtualização para não travar o scroll.

**Files:**
- Modify: `src/components/AgentChat.tsx`
- Install: `react-virtuoso`

- [ ] **Step 1: Instalar react-virtuoso**

```bash
npm install react-virtuoso
```

- [ ] **Step 2: Substituir container de mensagens**

Quando `messages.length > 50`, usar `Virtuoso`:

```tsx
import { Virtuoso } from 'react-virtuoso';

// Dentro do componente, na seção de mensagens:
{messages.length > 50 ? (
  <Virtuoso
    ref={virtuosoRef as any}
    data={messages}
    className="flex-1"
    followOutput="smooth"
    itemContent={(index, m) => (
      <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} px-4 py-2 animate-in fade-in`}>
        <ChatMessage content={m.content} role={m.role} timestamp={m.timestamp} />
      </div>
    )}
  />
) : (
  // Renderização normal para <50 mensagens
  messages.map((m, i) => (
    <div key={`${chatId}-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
      <ChatMessage content={m.content} role={m.role} timestamp={m.timestamp} />
    </div>
  ))
)}
```

- [ ] **Step 3: Lazy loading de sessões antigas (paginação)**

No `list_chat_sessions` do Rust, adicionar parâmetros `offset` e `limit`. No frontend, carregar mais sessões ao scrollar o dropdown.

```tsx
// Adicionar em AgentChat.tsx
const [sessionsOffset, setSessionsOffset] = useState(0);
const SESSIONS_PAGE_SIZE = 20;

const loadMoreSessions = async () => {
  const more = await safeInvoke<ChatSession[]>('list_chat_sessions', {
    agent,
    offset: sessionsOffset,
    limit: SESSIONS_PAGE_SIZE
  });
  if (more && more.length > 0) {
    setSessions(prev => [...prev, ...more]);
    setSessionsOffset(prev => prev + more.length);
  }
};
```

- [ ] **Step 4: Verificar build final**

```bash
npm run lint && npm run build && npm test
```

---

## Ordem de Execução Recomendada

```
Task 1 (Backend streaming) ──► Task 2 (Hook frontend) ──► Task 3 (ChatMessage)
                                                                  │
                                                          Task 4 (TypingIndicator)
                                                                  │
                                                          Task 5 (Integração AgentChat)
                                                                  │
                                                    ┌─────────────┴─────────────┐
                                                    ▼                           ▼
                                            Task 6 (Erros UX)          Task 7 (Virtualização)
```

Tasks 1 e 2 são **bloqueantes** — precisam estar prontas antes de Task 5.
Task 3 e 4 são **independentes** — podem ser feitas em paralelo.
Task 6 e 7 são **opcionais por iteração** — podem vir em sprint separada.

## Dependências NPM Resumo

```json
{
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0",
  "react-syntax-highlighter": "^15.6.1",
  "react-virtuoso": "^4.12.0"
}
```

```toml
# Cargo.toml adicionar
futures-util = "0.3"
```
