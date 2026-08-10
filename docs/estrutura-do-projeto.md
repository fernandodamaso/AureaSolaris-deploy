# Aurea Solaris — Estrutura do Projeto

## Árvore de Arquivos

```
C:\AureaSolaris\
├── 📄 main_api.py              ← Sidecar FastAPI (porta 9876)
├── 📄 requirements-api.txt     ← Dependências Python
├── 📄 start_aurea.bat          ← Script de inicialização
├── 📄 astro_engine.py          ← Motor astrológico (Swiss Ephemeris)
├── 📄 package.json             ← Node.js deps (React, Vite, Tauri)
│
├── 📁 src/                     ← Frontend React
│   ├── App.tsx                 ← Shell principal (sidebar + routing)
│   ├── styles.css              ← Estilos globais + utilitários
│   ├── main.tsx                ← Entry point React
│   │
│   ├── 📁 components/
│   │   ├── common/
│   │   │   └── UIComponents.tsx    ← NavItem, botões reutilizáveis
│   │   ├── agenda/
│   │   │   └── AgendaView.tsx      ← Calendário + tarefas Todoist
│   │   ├── diario/
│   │   │   ├── DiarioSidebar.tsx   ← Pastas + lista de notas
│   │   │   ├── DiarioEditor.tsx    ← Editor de texto com auto-save
│   │   │   └── DiarioTabs.tsx      ← Barra de abas
│   │   ├── AstrologiaBoard.tsx     ← Mapa natal + mandala SVG
│   │   ├── DiarioView.tsx          ← Container do diário
│   │   ├── MesaCriacao.tsx         ← Board tipo Miro
│   │   ├── HermesChat.tsx          ← Chat flutuante com Hermes
│   │   ├── SaudeView.tsx           ← Saúde e vitalidade
│   │   └── Removido do escopo atual
│   │   ├── MemoriasView.tsx        ← Memórias (placeholder)
│   │   ├── LoginView.tsx           ← Tela de login/perfis
│   │   ├── ProfileEditor.tsx       ← Editor de perfil
│   │   └── MandalaChart.tsx        ← Renderizador SVG da mandala
│   │
│   ├── 📁 context/
│   │   ├── GlobalContext.tsx        ← Contexto global (agenda, astro)
│   │   ├── DiarioContext.tsx        ← Contexto do diário
│   │   └── AgendaContext.tsx        ← Contexto da agenda
│   │
│   ├── 📁 utils/
│   │   ├── tauri.ts                 ← safeInvoke wrapper
│   │   ├── astro-calc.ts            ← Cálculos astrológicos (TS)
│   │   └── transitAspects.ts        ← Aspectos de trânsito
│   │
│   ├── 📁 types/
│   │   └── diario.ts                ← Tipos do diário
│   │
│   └── 📁 __tests__/
│       └── components/
│           ├── DiarioView.test.tsx   ← Testes do diário
│           └── UIComponents.test.tsx ← Testes de UI
│
├── 📁 src-tauri/                ← Backend Rust
│   ├── Cargo.toml               ← Deps Rust (tauri, reqwest, serde)
│   ├── tauri.conf.json          ← Config Tauri (janela, tray, permissões)
│   ├── icons/                   ← Ícones do app
│   └── src/
│       └── lib.rs               ← Backend completo (21+ comandos IPC)
│
├── 📁 docs/                     ← Documentação
│   ├── arquitetura.md           ← Arquitetura do sistema
│   ├── estrutura-do-projeto.md  ← Este arquivo
│   └── astrologia.md            ← Regras astrológicas
│
└── 📁 public/                   ← Assets estáticos
    └── aurea-solaris.svg        ← Logo do app
```

## O que cada pasta faz

### `src/` — Frontend
O coração visual do app. React com TypeScript, estilizado com Tailwind + CSS variables. Routing manual via `useState` (sem React Router). Design system ouro/navy com fontes Montserrat e Inter.

### `src-tauri/` — Backend
Rust com Tauri 2. Gerencia janela, tray icon, sidecar Python, e expõe comandos IPC para o frontend. AppState compartilha um `reqwest::Client` global.

### `main_api.py` — Sidecar Python
FastAPI que roda na porta 9876. Iniciado automaticamente pelo Rust. Expõe `/health`, `/natal`, `/transit`. O motor astrológico real está em `astro_engine.py`, importado por este servidor.

### `astro_engine.py` — Motor Astrológico
1024 linhas de cálculo profissional. Swiss Ephemeris para precisão, Kerykeion como fallback. Refatorado em 2026-06-11 com orbs dinâmicos, Part of Fortune noturno, iluminação cosseno.

### `docs/` — Documentação
Arquitetura, estrutura, regras astrológicas. Fonte da verdade para qualquer IA que trabalhe no projeto.

## Convencões

- **Componentes** em `components/` — um arquivo por componente, nome em PascalCase
- **Contextos** em `context/` — um arquivo por domínio (diário, agenda, global)
- **Utilitários** em `utils/` — funções puras, sem side effects
- **Testes** em `__tests__/components/` — espelham a estrutura de components
- **Docs** em `docs/` — um arquivo por tema, em markdown
