# 🤖 Mapa de Navegação AI — Guia Rápido para Agentes

> **Use este índice para encontrar onde trabalhar em segundos.** Este mapa é para você, agente de IA, que precisa navegar rapidamente pelo projeto.

## Navegação Rápida: "Se você precisa fazer X, vá para Y"

### 🎨 Componentes e Interface do Usuário
| Se você precisa... | Vá para... |
|-------------------|------------|
| Modificar um componente de tela (UI) | `src/components/` — cada arquivo é uma view modular |
| Alterar botões, inputs ou elementos reutilizáveis | `src/components/common/UIComponents.tsx` |
| Modificar o chat dos agentes de IA | `src/components/AgentChat.tsx` |
| Alterar o painel de controle (Stark) | `src/components/ControlePanel.tsx` |
| Modificar a área de finanças (Uncle Duck) | `src/components/FinancasView.tsx` |
| Alterar o mapa astral | `src/components/AstrologiaBoard.tsx` |
| Modificar a agenda/predictive scheduler | `src/components/agenda/` e `src/hooks/useAgendaTasks.ts` |
| Modificar o diario (VS Code style editor) | `src/components/diario/` - contém DiarioView, DiarioSidebar, DiarioTabs, DiarioEditor |
| Ver roteamento principal da aplicação | `src/App.tsx` |

### 🦀 APIs do Backend Tauri (Rust)
| Se você precisa... | Vá para... |
|-------------------|------------|
| Adicionar ou modificar comando Tauri | `src-tauri/src/lib.rs` — procure `#[tauri::command]` |
| Usar invoke no frontend | `src/utils/tauri.ts` — função `safeInvoke()` |
| Alterar configurações nativas (janela, ícones) | `src-tauri/tauri.conf.json` |
| Modificar persistência de chat | Comandos `save_history`, `load_history`, `archive_chat` em `lib.rs` |
| Alterar integrações (Telegram, Todoist) | Comandos `send_telegram_message`, `get_todoist_tasks` em `lib.rs` |

### 🔮 Motor de Astrologia (Python)
| Se você precisa... | Vá para... |
|-------------------|------------|
| Modificar cálculos astrológicos | `astro_engine.py` — usa biblioteca `kerykeion` |
| Alterar efemérides NASA | `de421.bsp` — dados de posição planetária |
| Ver cache de dados astrais | `astro_data.json` |
| Modificar integração Rust-Python | Comando `run_astro_engine` em `src-tauri/src/lib.rs` |
| Saber mais sobre a arquitetura do motor | `docs/arquitetura.md` seção "Motor de Astrologia" |

### 📅 Google Calendar (Composio MCP)
| Se você precisa... | Vá para... |
|-------------------|------------|
| Modificar serviço de calendário | `src/services/composio.ts` |
| Alterar tipos de eventos | `src/types/googleCalendar.ts` |
| Ver integração na agenda | `src/components/agenda/AgendaView.tsx` |
| Configurar API key Composio | Variável `VITE_COMPOSIO_API_KEY` no `.env` |

### 🤖 Agentes de IA (Personas)
| Se você precisa... | Vá para... |
|-------------------|------------|
| Modificar prompt/system de um agente | `src/components/AgentChat.tsx` — configuração de personas |
| Alterar modelos IA (OpenRouter/Ollama) | `src/components/AgentChat.tsx` — seção `model` e `safeInvoke` |
| Ver qual agente atua em qual view | Consulte as personas abaixo e `docs/arquitetura.md` |
| Adicionar novo agente | Crie entrada em `AgentChat.tsx` + atualize `docs/arquitetura.md` |
| Regras de comportamento dos agentes | Seção "Personas dos Agentes" abaixo |

### ⚙️ Configuração do Sistema
| Se você precisa... | Vá para... |
|-------------------|------------|
| Alterar configuração do app Tauri | `src-tauri/tauri.conf.json` |
| Modificar dependências frontend | `package.json` |
| Alterar variáveis de ambiente | `.env` ou `.env.local` |
| Configurar Vite (build, proxy) | `vite.config.ts` |
| Configurar ESLint | `eslint.config.js` |
| Executar testes | `npm test` (Vitest) ou `npm run test:watch` para modo contínuo |

### 📚 Documentação de Referência
| Se você precisa... | Consulte... |
|-------------------|------------|
| Visão completa da estrutura de pastas | `docs/estrutura-do-projeto.md` |
| Arquitetura técnica e fluxos | `docs/arquitetura.md` |
| Guia rápido do projeto (README) | `README.md` |
| Conhecimento para agentes (variáveis, arquitetura, testes) | `.factory/library/` |

---

## ⚠️ Regras Globais para Agentes de IA

> **🚨 OBRIGATÓRIO — SEMPRE atualize a documentação.**
> Todo arquivo que você criar, modificar ou deletar DEVE ter sua documentação atualizada. Não é opcional. Não é "fazer depois". É **agora, na mesma sessão de trabalho**. Se você mudou um componente, atualize os docs. Se adicionou um arquivo, atualize os docs. Sempre.

### 🎓 Regra Didática — Explique como se eu estivesse aprendendo
> **Você está conversando com alguém que está aprendendo tecnologia.** Ao explicar conceitos técnicos (React, Tauri, Python, APIs), use analogias simples, evite jargão desnecessário, e quando usar termos técnicos, explique o que significam. Exemplo: em vez de "O hook useAstrologyData faz fetch dos dados", diga "O useAstrologyData é como um assistente que busca informações sobre os planetas e entrega para a tela." **Concisos, mas educativos.**

### 📝 Regra de Documentação — Código muda, docs atualizam
> **Toda mudança no código DEVE atualizar a documentação correspondente. Sem exceção. Sempre.**
>
> **Antes de fazer commit de qualquer alteração**, verifique se os docs foram atualizados. Se você criou um arquivo novo e não atualizou os docs, **não finalize** -- volte e atualize primeiro.

| Tipo de mudança | Documento para atualizar |
|-----------------|-------------------------|
| Novo componente UI ou alteração visual | `docs/estrutura-do-projeto.md` |
| Novo comando Tauri ou alteração na ponte IPC | `docs/arquitetura.md` |
| Mudança no motor de astrologia Python | `docs/arquitetura.md` |
| Nova persona/agemte de IA | `docs/arquitetura.md` e `AGENTS.md` |
| Nova pasta ou reestruturação | `docs/estrutura-do-projeto.md` e `README.md` |
| Mudança de configuração (variáveis, .env) | `README.md` e `docs/estrutura-do-projeto.md` |
| Novos testes ou infraestrutura de testes | `docs/estrutura-do-projeto.md` e `README.md` |

---

## Personas dos Agentes — Resumo Rápido

| Agente | O que faz | Onde atua | Personalidade |
|--------|-----------|-----------|---------------|
| **Dr. Strange** | Supervisor macro, conecta astros às ações | Global (`App.tsx`) | Sábio, conciso, conecta padrões |
| **Alfred** | Mordomo de produtividade e organização | Saúde, Agenda, AlfredHub | Direto, impecável, prático |
| **Uncle Duck** | Consultor financeiro ávido por lucros | Finanças (`FinancasView.tsx`) | Pragmático, objetivo, focado em resultado |
| **Rafiki** | Tradutor poético do motor astrológico | Astrologia, Diário | Poético mas cirúrgico, espiritual |
| **Stark** | Monitor técnico da ponte Tauri-React | Controle (`ControlePanel.tsx`) | Técnico, sarcástico, conciso |

> 💡 **Dica:** Para detalhes completos de cada persona, veja `docs/arquitetura.md` seção "Sistema de Agentes de IA".

---

# Aurea Solaris — Módulos Core e Integração Multi-Agentes

> Para a arquitetura técnica completa, comandos Tauri e fluxos de dados, consulte [`docs/arquitetura.md`](docs/arquitetura.md).

## Módulos Core do Frontend

O Frontend é dividido em Views Modulares:
1. **Mesa de Criação:** Canvas infinito interativo com nós conceituais conectáveis (`MesaCriacao.tsx`).
2. **Astrologia:** Mapas natais, horas planetárias em tempo real e mandala zodiacal (`AstrologiaBoard.tsx`, `MandalaPage.tsx`, `MandalaView.tsx`).
3. **Saúde & Vitalidade:** Gestão plena de bem-estar corporal (`SaudeView.tsx`).
4. **Agenda Preditiva:** Cronograma adaptável às estrelas (`agenda/AgendaView.tsx`).
5. **Gestão de Ouro (Finanças):** Administração financeira e controle de gastos/receitas (`FinancasView.tsx`).
6. **Painel de Controle:** Configurações globais e estado geral do sistema (`ControlePanel.tsx`).
7. **Alfred Central Hub:** Agrupamento rápido de tarefas, links e necessidades corriqueiras (`AlfredHubView.tsx`).
8. **Diário (Memórias):** Registro diário com percepções integradas - agora com editor estilo VS Code, sidebar de pastas e abas para múltiplas notas (`src/components/diario/`):
   - `DiarioView.tsx` - Container principal
   - `DiarioSidebar.tsx` - Navegação de pastas e notas
   - `DiarioTabs.tsx` - Barra de abas para notas abertas
   - `DiarioEditor.tsx` - Editor rich text com TipTap
   - `MemoriasView.tsx` - View tradicional de memórias (mantida para compatibilidade)
9. **Escola do Rafiki:** Módulo educacional interativo (`RafikiEscola.tsx`).

---

## Integração Inteligente Multi-Agentes (Diretrizes e Personas)

O diferencial arquitetônico está enraizado na injeção modular de Agentes IA (via OpenRouter e Ollama Local), interligados no `AgentChat.tsx` e injetados de acordo com o módulo visualizado.

**A Diretriz Global e Inquebrável:**
Todos os agentes devem ser **altamente confiáveis, concisos, diretos ao ponto e evitar verbosidade excessiva.**

### Personas dos Agentes

| Agente | Local | Função | Personalidade |
|--------|-------|--------|---------------|
| **Dr. Strange** | `App.tsx` (global) | Visão macro, conecta horas celestes às ações na UI | Sábio, conciso, conecta padrões |
| **Alfred** | `SaudeView.tsx`, `agenda/AgendaView.tsx`, `AlfredHubView.tsx` | Mordomo de produtividade e organização | Direto, impecável, formal mas prestativo |
| **Uncle Duck** | `FinancasView.tsx` | Consultoria financeira focada em lucros | Pragmático, ávido por lucros, objetivo |
| **Rafiki** | `AstrologiaBoard.tsx`, `MandalaPage.tsx`, `DiarioView.tsx` | Traduz dados astrológicos em conselhos práticos | Preciso, técnico, dados concretos |
| **Stark** | `ControlePanel.tsx` | Monitora estabilidade da ponte Tauri-React | Técnico, sarcástico, conciso |

> Para detalhes completos de cada persona (modelos, prompts, escopo), veja [`docs/arquitetura.md`](docs/arquitetura.md) seção "Sistema de Agentes de IA".

---

> **📖 Para visão completa da arquitetura, comandos Tauri disponíveis, fluxos de dados e sistema de persistência, consulte [`docs/arquitetura.md`](docs/arquitetura.md).**
