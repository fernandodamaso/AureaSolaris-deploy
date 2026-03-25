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
- [ ] Corrigir `MandalaView.tsx` — mapear `data.planets` em vez de `data` diretamente
- [ ] Corrigir `useAstroData.ts` — passar `data.planets` para o componente
- [ ] Testar: Mandala mostra planetas no SVG ao selecionar "Céu Sagrado"
- [ ] Testar: Mandala mostra mapa natal ao selecionar "Meu Mapa Natal"
- **Arquivos:** `src/components/MandalaView.tsx`, `src/hooks/useAstroData.ts`

### 1b. Sistema de Sessões de Chat
- [ ] Adicionar `chatId` (UUID) ao estado do `AgentChat`
- [ ] Botão "+" para criar nova sessão de chat
- [ ] Lista de sessões anteriores (dropdown ou sidebar)
- [ ] Backend: `save_history` e `load_history` aceitam `chatId`
- [ ] Backend: `list_chat_sessions` para listar sessões de um agente
- [ ] Persistência: cada sessão salva em `memory/{agent}_{chatId}.json`
- [ ] Testar: criar novo chat, enviar mensagens, navegar, voltar e ver histórico
- **Arquivos:** `src/components/AgentChat.tsx`, `src-tauri/src/lib.rs`

### 1c. Botão Scroll-to-Bottom nos Chats
- [ ] Adicionar `ref` no container de mensagens
- [ ] Botão flutuante "↓" aparece quando scroll não está no final
- [ ] Auto-scroll ao receber nova mensagem
- [ ] Testar: mensagens longas, scroll manual, botão funciona
- **Arquivos:** `src/components/AgentChat.tsx`

---

## Fase 2 — Dr. Strange Refatorado

### Problema atual
O Strange só envia hora planetária, página atual e nome do perfil. Não vê tarefas, finanças, astrologia detalhada.

### Implementação
- [ ] Construir contexto completo: astrologia + aspectos + trânsitos + tarefas + finanças + saúde
- [ ] System prompt do Strange inclui todos os dados do sistema
- [ ] Respostas do Strange incluem botões de ação (criar tarefa, ir para página)
- [ ] Strange pode sugerir ações baseadas em horas planetárias e aspectos
- [ ] Strange tem acesso ao estado global (quantas tarefas pendentes, saldo, etc.)
- [ ] Testar: Strange responde com conhecimento do estado real do sistema
- **Arquivos:** `src/App.tsx`

---

## Fase 3 — Mesa de Criação Funcional

### Diagnóstico
O código existe mas pode ter problemas de renderização ou import quebrado.

### Implementação
- [ ] Verificar se `exportUtils.ts` está importado corretamente
- [ ] Testar: criar post-it, texto, checklist, sticker, imagem
- [ ] Testar: arrastar nodes, conectar edges, zoom, pan
- [ ] Testar: salvar e carregar board (persistência)
- [ ] Testar: exportar JSON, SVG, email
- [ ] Integrar Rafiki: botão para Rafiki sugerir nodes baseado em astrologia
- [ ] Integrar com Agenda: criar tarefa a partir de checklist na Mesa
- **Arquivos:** `src/components/MesaCriacao.tsx`, `src/utils/exportUtils.ts`

---

## Fase 4 — Contexto Global dos Agentes

### Problema atual
Cada agente vê só seus dados. Nenhum tem visão completa.

### Implementação
- [ ] Criar `src/context/GlobalContext.tsx` que agrega:
  - Dados astrológicos (planetas, aspectos, trânsitos, hora planetária)
  - Tarefas (pendentes, completas, métricas)
  - Finanças (saldo, entradas, saídas, metas)
  - Saúde (hábitos do dia, documentos)
  - Documentos e notas
  - Mandala (dados ativos)
- [ ] Todos os agentes recebem o contexto global (filtrado por relevância)
- [ ] Agentes podem criar tarefas via resposta (botão "Criar Tarefa")
- [ ] Agentes podem adicionar transações via resposta
- [ ] Agentes podem agendar eventos via resposta
- [ ] Registrar em `main.tsx` como provider
- [ ] Testar: perguntar ao Rafiki sobre finanças, ele responde com dados reais
- **Arquivos:** novo `src/context/GlobalContext.tsx`, `src/components/AgentChat.tsx`, `src/main.tsx`

---

## Fase 5 — Editor de Perfil Melhorado

### Problema atual
Campo de mapa natal é textarea livre. Sem parsing, sem preview.

### Implementação
- [ ] Formulário estruturado: data de nascimento, hora, localização
- [ ] Busca de cidade (lista de cidades principais ou API)
- [ ] Parsing automático do mapa natal via `astro_engine.py`
- [ ] Preview do mapa natal inline (mini mandala)
- [ ] Campos para preferências de agente (tom de voz, modelo IA)
- [ ] Salvar perfil no localStorage + persistência via Tauri
- [ ] Testar: criar perfil, ver mapa gerado, alterar preferências
- **Arquivos:** `src/App.tsx` (ProfilePopup) ou novo `src/components/ProfileEditor.tsx`

---

## Fase 6 — Google Calendar OAuth2 Real (PRIORIDADE ALTA)

### Problema atual
`add_google_event`, `delete_google_event`, `get_google_events` são stubs.

### Implementação
- [ ] Criar projeto no Google Cloud Console (manual, fora do código)
- [ ] Ativar Google Calendar API
- [ ] Configurar OAuth2 credentials (Desktop app)
- [ ] Implementar fluxo OAuth2 no Tauri:
  - [ ] Abrir browser para consentimento
  - [ ] Receber callback com authorization code
  - [ ] Trocar code por access_token + refresh_token
  - [ ] Salvar tokens em `memory/google_tokens.json`
- [ ] Implementar `get_google_events` real (GET calendars/primary/events)
- [ ] Implementar `add_google_event` real (POST calendars/primary/events)
- [ ] Implementar `delete_google_event` real (DELETE calendars/primary/events)
- [ ] Adicionar `oauth2` e `google-calendar` ao Cargo.toml se necessário
- [ ] Tratar refresh de token automático
- [ ] Testar: listar eventos, criar evento, deletar evento
- **Arquivos:** `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`

---

## Fase 7 — Aba de Ensino do Rafiki

### Problema atual
Não existe mais. A aba "Mandala Visual" existe mas sem conteúdo educativo.

### Implementação
- [ ] Nova sub-aba "Aprenda com Rafiki" dentro de Astrologia
- [ ] Conteúdo estático: signos, casas, planetas, aspectos (textos + imagens)
- [ ] Exercícios interativos:
  - [ ] Identificar aspectos entre planetas
  - [ ] Prever regente do dia
  - [ ] Completar tabela de dignidades
- [ ] Integração com chat: botão "Perguntar ao Rafiki" em cada seção
- [ ] Progresso do aluno salvo em localStorage
- [ ] Testar: navegar entre aulas, fazer exercícios, perguntar ao Rafiki
- **Arquivos:** `src/components/AstrologiaBoard.tsx`, novo `src/components/RafikiEscola.tsx`

---

## Fase 8 — Tipagem TypeScript e Qualidade

- [ ] Tipar `AgentChat.tsx` — `ChatMessage`, `ChatSession`
- [ ] Tipar `AgendaContext.tsx` — remover `any` de profiles, tasks, documents
- [ ] Tipar `App.tsx` — `strangeMsgs`, handlers
- [ ] Tipar `FinancasContext.tsx` — Transaction, Goal já tipados ✓
- [ ] Tipar `useAstrologyData.ts` — LiveAstroData já tipado ✓
- [ ] Tipar `MesaCriacao.tsx` — Node, Edge types
- [ ] Configurar CSP no `tauri.conf.json`
- [ ] Adicionar `minWidth: 1024, minHeight: 768` na janela
- [ ] Configurar vitest para testes básicos

---

## Fase 9 — Performance e Observabilidade

- [ ] Memoizar `buildRafikiContext` com `useMemo`
- [ ] Isolar timer de hora planetária (não re-renderizar App inteiro)
- [ ] Adicionar diff-check antes de `setLiveData` em `useAstrologyData`
- [ ] Logs estruturados no frontend (console com formato JSON)
- [ ] Métricas: latência de IPC, tempo de engine, tempo de resposta IA

---

## Fase 10 — Integração Final

- [ ] Testar fluxo completo: Login → Astrologia → Mandala → Rafiki → Agenda → Finanças → Strange
- [ ] Testar persistência: fechar e reabrir app, dados mantidos
- [ ] Testar novos chats: criar, navegar, histórico preservado
- [ ] Testar Google Calendar: CRUD real de eventos
- [ ] Testar Todoist: sincronização bidirecional
- [ ] Empacotamento Windows: `npm run tauri build`
- [ ] Demonstra

---

## Diagnóstico de Problemas Conhecidos

| Problema | Local | Causa | Fase |
|----------|-------|-------|------|
| Mandala não renderiza | `MandalaView.tsx:62` | `Object.entries(data)` em vez de `Object.entries(data.planets)` | 1a |
| Chat não mantém sessões | `AgentChat.tsx` | Chave fixa por agente, sem chatId | 1b |
| Sem scroll-to-bottom | `AgentChat.tsx` | Não implementado | 1c |
| Strange sem contexto | `App.tsx:92-98` | Contexto hardcoded, sem dados reais | 2 |
| Mesa pode quebrar | `MesaCriacao.tsx:4` | Import de `exportUtils` pode falhar | 3 |
| Agentes isolados | Todos os chats | Cada um vê só seus dados | 4 |
| Perfil básico | `App.tsx:134-246` | Sem parsing de natal, sem preview | 5 |
| Calendar é stub | `lib.rs:358-389` | OAuth2 não implementado | 6 |
| Sem ensino Rafiki | `AstrologiaBoard.tsx` | Aba removida | 7 |
| `any` espalhado | Vários | Tipagem incompleta | 8 |
| Re-renders desnecessários | `useAstrologyData.ts` | Sem memoização | 9 |

---

## Glossário
| Termo | Significado |
|-------|------------|
| **IPC** | Inter-Process Communication — comunicação entre React e Rust |
| **OAuth2** | Protocolo de autenticação para APIs do Google |
| **Session** | Sessão de chat — conversa separada com um agente |
| **Contexto Global** | Dados agregados de todos os módulos para os agentes |
| **Mandala** | Visualização SVG do mapa astrológico |
| **Trânsitos** | Aspectos entre planetas atuais e mapa natal |
