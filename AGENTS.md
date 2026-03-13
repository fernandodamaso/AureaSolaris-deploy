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
