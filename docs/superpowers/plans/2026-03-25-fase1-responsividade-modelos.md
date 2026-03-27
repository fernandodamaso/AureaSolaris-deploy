# Fase 1: Responsividade dos Chats + Modelos Custo-Benefício Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar streaming de respostas em tempo real, renderização rica de mensagens, sistema inteligente de roteamento de modelos de IA com controle de custos, e melhorias de UX para o sistema de chat dos agentes do Aurea Solaris.

**Architecture:** 
- Backend Rust emite eventos Tauri a cada chunk recebido do Ollama/OpenRouter via comandos `ollama_chat_stream` e `openrouter_chat_stream`
- Frontend escuta eventos Tauri com hook `useChatStream` e atualiza estado reativamente
- Mensagens são renderizadas com markdown, syntax highlighting e botão copiar código
- Sistema de roteamento de modelos seleciona modelo ideal por agente baseado em complexidade da tarefa com fallback automático
- Controle de custos em tempo real com orçamento mensal por agente

**Tech Stack:**
- `@tauri-apps/api` — `listen()`, `emit()` para streaming
- `react-markdown` + `remark-gfm` + `react-syntax-highlighter` — renderização rica
- TypeScript (frontend), Rust (backend Tauri)
- localStorage + JSON persistência para configuração de modelos e custos

---

## Task Map (arquivos)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src-tauri/src/lib.rs` | Comandos `ollama_chat_stream`, `openrouter_chat_stream`, `ollama_chat` (modelo dinâmico), `openrouter_chat_with_fallback` |
| `src/hooks/useChatStream.ts` | **NOVO** — Lógica de streaming (listen, emit, buffering) |
| `src/components/chat/ChatMessage.tsx` | **NOVO** — Componente de mensagem com markdown + copy button |
| `src/components/chat/TypingIndicator.tsx` | **NOVO** — Indicador de digitação animado |
| `src/components/AgentChat.tsx` | Refatoração: usar `useChatStream`, `ChatMessage`, `TypingIndicator`, melhorias de UX |
| `src/services/ModelRouter.ts` | **NOVO** — Serviço central de roteamento de modelos |
| `src/types/modelConfig.ts` | **NOVO** — Tipos TypeScript para configuração de modelos |
| `src/components/ControlePanel.tsx` | Atualizar AgentConfigModal e adicionar dashboard de custos |
| `src/utils/tauri.ts` | Adicionar `safeListen` e atualizar mocks para novos comandos |
| `package.json` | Novas dependências |
| `src/__tests__/agents/modelRouter.test.ts` | Testes unitários para ModelRouter |
| `src/__tests__/agents/useChatStream.test.ts` | Testes unitários para hook de streaming |
| `src/__tests__/components/ChatMessage.test.ts` | Testes unitários para componente de mensagem |
| `src/__tests__/integration/streaming.test.tsx` | Testes de integração para streaming |

---