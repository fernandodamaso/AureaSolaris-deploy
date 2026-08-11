# MVP Alfa — Checklist de Implementação (atualizado)

> **Plano consolidado para implementação completa do Aurea Solaris.**
> Cada fase deve ser aprovada antes de avançar.

---

## Pré-requisitos (Windows)
- [x] Node.js instalado e no PATH
- [x] Python 3.9+ instalado e no PATH
- [x] Rust toolchain (stable) instalado
- [x] VSCode com extensões (Markdown, ESLint/TS, Python)
- [x] Projeto compila (`npm run dev` + `cargo build`)

---

## Fase 1 — Correções Críticas
### 1a. Mandala Astrológica (BUG: não renderiza)
- [x] Corrigir `MandalaView.tsx` — mapear `data.planets` em vez de `data` diretamente (FIXED)
- [x] Corrigir `useAstroData.ts` — passar `data.planets` para o componente (FIXED)
- [x] Testar: Mandala mostra planetas no SVG ao selecionar "Céu Sagrado" (DONE)
- [x] Testar: Mandala mostra mapa natal ao selecionar "Meu Mapa Natal" (DONE)

### 1b. Sistema de Sessões de Chat
- [x] Adicionar `chatId` (UUID) ao estado do `AgentChat` (DONE)
- [x] Botão "+" para criar nova sessão de chat (DONE)
- [x] Lista de sessões anteriores (dropdown ou sidebar) (DONE)
- [x] Backend: `save_history` e `load_history` aceitam `chatId` (DONE)
- [x] Backend: `list_chat_sessions` para listar sessões de um agente (DONE)
- [x] Persistência: cada sessão salva em `memory/{agent}_{chatId}.json` (DONE)
- [x] Testar: criar novo chat, enviar mensagens, navegar, voltar e ver histórico (DONE)

### 1c. Botão Scroll-to-Bottom nos Chats
- [x] Adicionar `ref` no container de mensagens (DONE)
- [x] Botão flutuante "↓" aparece quando scroll não está no final (DONE)
- [x] Auto-scroll ao receber nova mensagem (DONE)
- [x] Testar: mensagens longas, scroll manual, botão funciona (DONE)

---

## Fase 2 — Dr. Strange Refatorado
- [x] Construir contexto completo: astrologia + aspectos + trânsitos + tarefas + finanças + saúde (DONE)
- [x] System prompt do Strange inclui todos os dados do sistema (DONE)
- [x] Respostas do Strange incluem botões de ação (criar tarefa, ir para página) (DONE)
- [x] Strange pode sugerir ações baseadas em horas planetárias e aspectos (DONE)
- [x] Strange tem acesso ao estado global (quantas tarefas pendentes, saldo, etc.) (DONE)
- [x] Testar: Strange responde com conhecimento do estado real do sistema (DONE)

---

## Fase 3 — Mesa de Criação Funcional
- [x] Verificar se `exportUtils.ts` está importado corretamente (DONE)
- [x] Testar: criar post-it, texto, checklist, sticker, imagem (DONE)
- [x] Testar: arrastar nodes, conectar edges, zoom, pan (DONE)
- [x] Testar: salvar e carregar board (persistência) (DONE)
- [x] Testar: exportar JSON, SVG, email (DONE)
- [x] Integrar Rafiki: botão para Rafiki sugerir nodes baseado em astrologia (DONE)
- [x] Integrar com Agenda: criar tarefa a partir de checklist na Mesa (DONE)

---

## Fase 4 — Contexto Global dos Agentes
- [x] Criar `src/context/GlobalContext.tsx` que agrega todos os dados (DONE) ✅
- [x] Todos os agentes recebem o contexto global unificado (DONE) ✅
- [x] Registrar em `main.tsx` como provider supremo (DONE) ✅
- [x] Refatorar `App.tsx` e `AgentChat.tsx` para usar o novo contexto (DONE) ✅
- [x] Testar: Dr. Strange e outros agentes agora têm visão total do sistema (DONE) ✅

---

## Fase 5 — Editor de Perfil Melhorado
- [x] Formulário estruturado: data de nascimento, hora, localização (DONE) ✅
- [x] Busca de cidade (lista de cidades principais) (DONE)
- [x] Parsing automático do mapo natal via `astro_engine.py` (DONE)
- [x] Preview do mapa natal inline (mini mandala de texto) (DONE)
- [x] Campos para preferências de agente (tom de voz, modelo IA) (DONE)
- [x] Salvar perfil no localStorage + persistência via Tauri (DONE) ✅
- [x] Testar: criar perfil, ver mapa gerado, alterar preferências (DONE)

---

## Fase 6 — Google Calendar via Composio (DONE)
- [x] Implementar `connect_google_calendar` no Rust (Ponte Composio) (DONE)
- [x] Implementar `list_google_calendar_events` no Rust (Ponte Composio) (DONE)
- [x] Frontend `composio.ts` integrado com comandos Tauri (DONE)
- [x] Configurar API key do Composio no `.env` (DONE)
- [x] Testar CRUD real de eventos: Rust agora faz fetch real na API Composio (DONE) ✅

---

## Fase 10 — Integração Final e Publicação (PROGRESS)
- [ ] Testar fluxo completo: Login → Astrologia → Mandala → Rafiki → Agenda → Finanças → Strange
- [ ] Testar persistência: fechar e reabrir app, dados mantidos
- [x] Testar Google Calendar: CRUD real de eventos via Composio (DONE) ✅
- [x] Integrations de terceiros: Todoist foi despriorizado no escopo atual (LEGACY) ✅
- [ ] Empacotamento Windows: `npm run tauri build`

---

## ✅ Itens Adicionais Confirmados (não estavam no checklist original)

### Tailwind CSS v4 Config
- [x] Configuração via `@tailwindcss/vite` em `src/styles.css` ✅
- [x] Tokens de design customizados (--color-gold, --font-display, etc.) ✅

### Tauri IPC Implementado
- [x] `src/utils/tauri.ts` com `safeInvoke()` funcionando ✅
- [x] Comandos locais para persistência e motor astrológico ✅

### Testes Automatizados
- [x] `src/__tests__/utils/tauri.test.ts` — Testes de IPC ✅
- [x] `src/__tests__/utils/astroDignity.test.ts` — Testes de dignidade ✅
- [x] `src/__tests__/utils/certifiedCalculation.test.ts` — Testes de certificação de cálculo ✅
- [x] `src/__tests__/utils/confirmedBirthInput.test.ts` — Testes de entrada de nascimento ✅

---

## Diagnóstico Final de Status

| Problema | Local | Status |
|----------|-------|--------|
| Mandala não renderiza | `MandalaView.tsx` | FIXED |
| Chat não mantém sessões | `AgentChat.tsx` | FIXED |
| Strange sem contexto | `App.tsx` | FIXED |
| Calendar é mock | `lib.rs` | LOCAL-FIRST |
| Tipagem inconsistente | Sistema | RESOLVIDO (Fase 8) |
| Performance lenta | App.tsx | OTIMIZADO (Fase 9) |

---

## Glossário
| Termo | Significado |
|-------|------------|
| **IPC** | Inter-Process Communication — comunicação entre React e Rust |
| **Composio** | Plataforma de conectividade legada (removida do escopo) |
| **Strange** | Supervisor Supremo do sistema |
| **Trânsitos** | Aspectos entre planetas atuais e mapa natal |
