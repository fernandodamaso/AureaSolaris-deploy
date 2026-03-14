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

# Aurea Solaris - Visão Geral do Projeto e Arquitetura

## Estrutura do Projeto

Aurea Solaris é um aplicativo de desktop construído com a stack **Tauri (Rust) + React (TypeScript) + Vite + Tailwind CSS**, em harmonia com um motor local em Python para cálculos astrológicos precisos. Abaixo mapeamos a árvore de diretórios e arquitetura central do repositório:

```text
c:\AureaSolaris\
├── src/                        # 🎨 Frontend (Interface do Usuário com React & TS)
│   ├── components/             # Módulos principais e blocos de construção UI
│   │   ├── agenda/             # Componentes da Agenda Preditiva
│   │   ├── common/             # Componentes de UI reusáveis (Botões, Títulos, Entradas)
│   │   ├── AgentChat.tsx       # Componente de Chat Multi-Agente Dinâmico
│   │   ├── AlfredHubView.tsx   # Painel consolidado do Alfred
│   │   ├── AstrologiaBoard.tsx # Mapa Natal e trânsitos celestes
│   │   ├── ControlePanel.tsx   # Configurações do sistema (Stark)
│   │   ├── FinancasView.tsx    # Gestão de Ouro (Uncle Duck)
│   │   ├── MesaCriacao.tsx     # Canvas interativo infinito
│   │   └── ...                 # Outros painéis Modulares (Saúde, Memórias, Login etc.)
│   ├── context/                # 🧠 Gerenciamento de Estado Global do React
│   │   └── AgendaContext.tsx   # Provedor global para dados da agenda e perfis
│   ├── hooks/                  # ⚓ Lógica Especializada (React Hooks)
│   │   ├── useAgendaTasks.ts   # Lógica para gerir fluxos de tarefas
│   │   ├── useAstrologyData.ts # Processamento de horas planetárias e regência
│   │   └── useFinancasData.ts  # Tratamento do fluxo financeiro
│   ├── utils/                  # 🛠️ Ferramentas utilitárias
│   │   └── tauri.ts            # Ponte de comunicação (IPC) segura com o Backend Tauri
│   ├── assets/                 # SVGs, ícones e mídias estáticas
│   ├── App.tsx                 # Ponto central de roteamento, controle mestre global e chamadas ao Dr. Strange
│   └── styles.css / App.css    # Estilização raiz com suporte principal via Tailwind
│
├── src-tauri/                  # 🦀 Backend Nativo (Rust) e Ponte do Sistema Operacional
│   ├── src/
│   │   ├── main.rs             # Bootstrapper do ambiente e daemon do Tauri
│   │   └── lib.rs              # Definição e empacotamento das APIs Tauri (persistência de chat, etc)
│   └── tauri.conf.json         # Configuração nativa de janelas, ícones e permissões
│
├── Motores Analíticos (Python / Dados Base)
│   ├── astro_engine.py         # Motor de processamento cosmológico (Python)
│   ├── de421.bsp               # Efemérides da NASA (Swiss Ephemeris)
│   └── astro_data.json         # Cache de dados planetários
│
├── Laboratorio_Stark/          # 🧪 Área designada a scripts e inovações sistêmicas (Playground)
├── .agents/                    # 🤖 Regras de Sistema e Contextos Específicos dos Agentes IA
├── package.json & vite.config  # Configurações de empacotamento do NPM/Vite
└── README.md                   # Documentação inicial do repositório
```

---

## Módulos Core do Frontend

O Frontend é o pilar de interação e é dividido em Views Modulares:
1. **Mesa de Criação:** Um canvas infinito interativo com nós conceituais conectáveis.
2. **Astrologia:** Cálculo de mapas natais, horas planetárias em tempo real e regência planetária.
3. **Saúde & Vitalidade:** Gestão plena de bem-estar corporal.
4. **Agenda Preditiva:** Cronograma adaptável às estrelas.
5. **Gestão de Ouro (Finanças):** Administração financeira e controle de gastos/receitas.
6. **Painel de Controle:** Configurações globais e estado geral do sistema.
7. **Alfred Central Hub:** Agrupamento rápido de tarefas, links e necessidades corriqueiras.
8. **Diário (Memórias):** Registro diário com percepções integradas.

---

## Integração Inteligente Multi-Agentes (Diretrizes e Personas)

O diferencial arquitetônico está enraizado na injeção modular de Agentes IA (via OpenRouter e Ollama Local), interligados no `AgentChat.tsx` e injetados de acordo com o módulo visualizado.

**A Diretriz Global e Inquebrável:**
Todos os agentes devem ser **altamente confiáveis, concisos, diretos ao ponto e evitar verbosidade excessiva.**

### 1. Dr. Strange (Supervisor Macro)
- **Local:** Onipresente (Atuando globalmente via botão no `App.tsx`).
- **Função:** Fornece uma visão macro do sistema, ligando as horas celestes do `useAstrologyData` às ações atuais na UI.
- **Personalidade:** Sábio, de poucas e precisas palavras. Conecta padrões.

### 2. Alfred
- **Local:** `SaudeView.tsx`, `AgendaView.tsx`, `AlfredHubView.tsx`.
- **Papel:** Mordomo e gerente impecável de ordem e produtividade familiar. Reto e direto.

### 3. Uncle Duck
- **Local:** `FinancasView.tsx` (Gestão de Ouro).
- **Papel:** Ávido por lucros, pragmático e direto. Roda via IA para interpretar dados financeiros.

### 4. Rafiki
- **Local:** `AstrologiaBoard.tsx`, `DiarioView.tsx`.
- **Papel:** Poético mas cirúrgico. Traduz o motor em python `astro_engine.py` de maneira espiritual para ações concretas.

### 5. Stark
- **Local:** `ControlePanel.tsx`.
- **Papel:** Monitoramento da estabilidade entre a ponte Tauri (Rust) e a interface (React). Altamente técnico e conciso.
