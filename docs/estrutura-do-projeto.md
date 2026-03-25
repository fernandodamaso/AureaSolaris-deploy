# Guia Didático: Estrutura de Pastas do Aurea Solaris

> **Para que serve este documento?**  
> Este guia explica, de forma simples e completa, cada pasta e arquivo importante do projeto Aurea Solaris.  
> Se você está começando agora, leia esta página do início ao fim — vai entender onde está tudo e por que existe.

---

## 📊 Diagrama Visual da Estrutura

```text
AureaSolaris/
│
├── 📁 src/                          # 🎨 FRONTEND — O que o usuário vê e interage
│   ├── components/                  # 🧩 Tela principal de cada módulo
│   │   ├── agenda/                  # 📅 Componentes da Agenda Preditiva
│   │   ├── common/                  # 🔄 Componentes reutilizáveis (ver seção detalhada abaixo)
│   │   ├── agenda/                  # 📅 Subcomponentes da Agenda (AgendaView.tsx)
│   │   ├── mesa/                    # 🎨 Subcomponentes da Mesa (AssetPicker.tsx)
│   │   ├── AgentChat.tsx            # 💬 Chat com os 5 agentes de IA
│   │   ├── AlfredHubView.tsx        # 🎩 Central de tarefas do Alfred
│   │   ├── AstrologiaBoard.tsx      # 🌟 Mapa natal e trânsitos celestes
│   │   ├── AstrologyMap.tsx         # 🗺️ Mapa astrológico interativo
│   │   ├── ControlePanel.tsx        # ⚙️ Painel de controle (Stark)
│   │   ├── DiarioView.tsx           # 📓 Diário com insights astrológicos
│   │   ├── FinancasView.tsx         # 💰 Gestão de Ouro (Uncle Duck)
│   │   ├── ImportFinancialView.tsx  # 📥 Importação de dados financeiros
│   │   ├── LoginView.tsx            # 🔐 Tela de login
│   │   ├── MandalaChart.tsx         # 📊 Gráfico/chart da mandala zodiacal
│   │   ├── MandalaPage.tsx          # 🔮 Wrapper da mandala (alimenta MandalaView com dados reais)
│   │   ├── MandalaView.tsx          # 🔮 SVG interativo da mandala zodiacal
│   │   ├── MemoriasView.tsx         # 🧠 Módulo de memórias
│   │   ├── MesaCriacao.tsx          # 🎨 Canvas infinito para criar ideias
│   │   ├── ProfileEditor.tsx        # 👤 Editor de perfil do usuário
│   │   ├── RafikiEscola.tsx         # 🐒 Módulo educacional do Rafiki
│   │   └── SaudeView.tsx            # 💪 Controle de saúde e vitalidade
│   │
│   ├── context/                     # 🧠 Estado global do React
│   │   ├── AgendaContext.tsx        # 📋 Provedor de dados da agenda e perfis
│   │   ├── SaudeContext.tsx         # 💪 Provedor de dados de saúde e hábitos
│   │   └── FinancasContext.tsx      # 💰 Provedor de dados financeiros
│   │
│   ├── hooks/                       # ⚓ Lógica reutilizável (React Hooks)
│   │   ├── useAgendaTasks.ts        # 📋 Re-exporta o AgendaContext
│   │   ├── useAstroData.ts          # ⭐ Dados astrológicos (hook simplificado com loading/error)
│   │   ├── useAstrologyData.ts      # 🌙 Horas planetárias, trânsitos, previsão com datas reais
│   │   └── useFinancasData.ts       # 💵 Lógica financeira: transações, metas, reservas
│   │
│   ├── utils/                       # 🛠️ Funções auxiliares
│   │   ├── tauri.ts                 # 🌉 Ponte de comunicação com o Rust (IPC)
│   │   ├── exportUtils.ts           # 📤 Funções de exportação (PDF, Email, Drive, JSON, Markdown)
│   │   └── mockData.ts              # 🧪 Dados fictícios para desenvolvimento e testes
│   │
│   ├── assets/                      # 🖼️ Imagens, ícones e mídias estáticas
│   ├── App.tsx                      # 🚀 Ponto central — roteamento e controle mestre
│   ├── App.css                      # 🎨 Estilos do componente App
│   ├── main.tsx                     # ▶️ Ponto de entrada do React
│   ├── styles.css                   # 🎨 Estilos globais com Tailwind
│   └── vite-env.d.ts                # 📝 Declarações de tipo do Vite
│
├── 📁 src-tauri/                    # 🦀 BACKEND NATIVO — Ponte com o sistema operacional
│   ├── src/                         # 📝 Código Rust
│   │   ├── main.rs                  # ▶️ Inicialização do Tauri
│   │   └── lib.rs                   # 🔌 Definição dos comandos Tauri (APIs IPC)
│   ├── capabilities/                # 🔐 Permissões do Tauri
│   ├── gen/                         # 🤖 Código gerado automaticamente
│   ├── icons/                       # 🖼️ Ícones da aplicação
│   ├── memory/                      # 💾 Armazenamento local de memória
│   ├── target/                      # 🏗️ Build do Rust (compilação)
│   ├── Cargo.toml                   # 📦 Dependências Rust (equivalente ao package.json)
│   ├── Cargo.lock                   # 🔒 Versões exatas das dependências Rust
│   ├── tauri.conf.json              # ⚙️ Configuração da janela, ícones e permissões
│   └── build.rs                     # 🔨 Script de build do Rust
│
├── 📁 public/                       # 🌐 Arquivos estáticos servidos diretamente
│   └── (ícones, favicon, etc.)
│
├── 📁 docs/                         # 📚 Documentação do projeto
│   ├── estrutura-do-projeto.md      # 📖 Este guia que você está lendo
│   ├── arquitetura.md               # 🏗️ Referência técnica da arquitetura
│   ├── ui-tips-agm.md               # 🎨 Dicas de UI para o AntiGravity Module
│   ├── design-system.md             # 🎨 Sistema de Design e Tokens
│   ├── components.md                # 🧩 Documentação de Componentes Reutilizáveis
│   ├── accessibility.md             # 🌈 Padrões de Acessibilidade
│   ├── MVP_Alfa_Checklist.md        # ✅ Checklist de progresso do MVP Alfa
│   └── plans/                       # 📋 Planos e documentação de fases
│
├── 📁 .agent/                       # 🤖 Regras e habilidades dos agentes de IA
│   ├── rules/                       # 📏 Regras de comportamento (ex: ui-preservation.md)
│   └── skills/                      # 🎯 Habilidades especializadas dos agentes
│
├── 📁 .factory/                     # 🏭 Infraestrutura do sistema de agentes
│   ├── library/                     # 📚 Base de conhecimento para agentes
│   ├── services.yaml                # 🔧 Manifesto de serviços e comandos
│   ├── init.sh                      # ▶️ Script de inicialização
│   └── missions/                    # 🎯 Dados das missões em execução
│
├── 📁 Laboratorio_Stark/            # 🧪 Área experimental — playground de testes
│
├── 📁 cache/                        # 💾 Cache de dados temporários
│
├── 📁 dist/                         # 📦 Build de produção do frontend
│
├── 📁 node_modules/                 # 📦 Dependências Node.js (não versionado)
│
├── 📄 astro_engine.py               # 🐍 Motor de cálculos astrológicos (Python)
├── 📄 de421.bsp                     # 🌍 Efemérides da NASA (Swiss Ephemeris)
├── 📄 astro_data.json               # 💾 Cache de dados planetários
├── 📄 package.json                  # 📦 Dependências e scripts do Node.js
├── 📄 package-lock.json             # 🔒 Versões exatas das dependências Node
├── 📄 vite.config.ts                # ⚙️ Configuração do bundler Vite
├── 📄 tsconfig.json                 # ⚙️ Configuração do TypeScript
├── 📄 tsconfig.node.json            # ⚙️ TypeScript para scripts Node
├── 📄 index.html                    # 🌐 Ponto de entrada HTML
├── 📄 .env                          # 🔑 Variáveis de ambiente
├── 📄 .env.local                    # 🔑 Variáveis locais (não versionado)
├── 📄 .gitignore                    # 🚫 O que o Git ignora
├── 📄 README.md                     # 📖 Documentação inicial do repositório
├── 📄 AGENTS.md                     # 🤖 Diretrizes para agentes de IA
├── 📄 eslint.config.js              # 🔍 Configuração do linter ESLint
└── 📄 launch_aurea.bat              # ▶️ Script de inicialização (Windows)
```

---

## 📁 Explicação Detalhada de Cada Pasta

### `src/` — Frontend (React + TypeScript)

**O que é?**  
Esta é a pasta principal do frontend. Aqui fica todo o código que o usuário vê e interage — botões, telas, menus, gráficos. É construído com React (uma biblioteca para criar interfaces) e TypeScript (JavaScript com tipagem para evitar erros).

**Para que serve?**  
Criar a interface visual do aplicativo. Cada pasta dentro de `src/` tem uma responsabilidade específica.

**Por que existe?**  
Separa a interface do usuário da lógica de negócios e do backend. Assim, você pode mudar a aparência sem quebrar os cálculos, e vice-versa.

---

#### `src/components/` — Telas e Módulos Visuais

**O que é?**  
Aqui ficam os componentes React — cada arquivo `.tsx` é uma "peça" da interface. Alguns são telas completas (views), outros são partes reutilizáveis.

**Para que serve?**  
Cada view modular do aplicativo tem seu próprio arquivo:
- `AgentChat.tsx` — Chat com os 5 agentes de IA (obedece à Chave Mestra Ollama/OpenRouter)
- `AlfredHubView.tsx` — Central de tarefas e links rápidos
- `AstrologiaBoard.tsx` — Mapa natal e visualização de trânsitos
- `AstrologyMap.tsx` — Mapa astrológico interativo
- `ControlePanel.tsx` — Configurações do sistema e Chave Mestra de IA (Stark supervisiona)
- `DiarioView.tsx` — Diário com insights astrológicos
- `FinancasView.tsx` — Controle financeiro (Uncle Duck)
- `ImportFinancialView.tsx` — Importação de dados financeiros
- `LoginView.tsx` — Tela de autenticação
- `MandalaChart.tsx` — Gráfico/chart interativo da mandala zodiacal
- `MandalaPage.tsx` — Wrapper que alimenta MandalaView com dados reais
- `MandalaView.tsx` — Visualização em mandala SVG interativa
- `MemoriasView.tsx` — Registro de memórias
- `MesaCriacao.tsx` — Canvas infinito para conectar ideias
- `ProfileEditor.tsx` — Editor de perfil do usuário
- `RafikiEscola.tsx` — Módulo educacional do agente Rafiki
- `SaudeView.tsx` — Acompanhamento de saúde (Alfred)

**Subpastas:**
- `agenda/` — Componentes específicos da Agenda Preditiva (`AgendaView.tsx`)
- `mesa/` — Componentes auxiliares da Mesa de Criação (`AssetPicker.tsx`)
- `common/` — Componentes reutilizáveis (ver seção detalhada abaixo)

**Por que existe?**  
Separa cada módulo visual em seu próprio arquivo, facilitando manutenção e reutilização.

---

#### `src/components/common/` — Componentes Reutilizáveis

**O que é?**  
Componentes genéricos usados em múltiplas views. Não são telas completas — são "peças de LEGO" que se combinam para montar interfaces.

**O que tem?**
- `UIComponents.tsx` — Botões, NavItems e elementos de interface básicos
- `BaseComponents.tsx` — Componentes base para layouts e containers
- `BirthForm.tsx` — Formulário de dados de nascimento (nome, data, hora, local)
- `Mandala.tsx` — Componente de mandala reutilizável (versão base)
- `OllamaGuide.tsx` — Guia/configuração do Ollama local
- `PdfViewer.tsx` — Visualizador de arquivos PDF

---

#### `src/context/` — Estado Global

**O que é?**  
O `AgendaContext.tsx` é um "provedor de contexto" do React. Ele armazena dados que precisam ser acessados em qualquer parte da interface.

**Para que serve?**  
Evita que cada componente precise buscar os mesmos dados individualmente. Por exemplo, a agenda e os perfis de usuário ficam aqui e são compartilhados entre todas as views.

**Por que existe?**  
Sem isso, você teria que passar dados manualmente por todos os componentes (prop drilling), o que é confuso e propenso a erros.

---

#### `src/hooks/` — Lógica Especializada

**O que é?**  
Hooks são funções reutilizáveis que encapsulam lógica complexa. Cada hook tem uma responsabilidade específica:

| Hook | Para que serve |
|------|---------------|
| `useAgendaTasks.ts` | Re-exporta os dados do AgendaContext para uso em componentes |
| `useAstroData.ts` | Busca dados astrológicos básicos com estados de loading/error |
| `useAstrologyData.ts` | Calcula horas planetárias, trânsitos e regência planetária com datas reais |
| `useFinancasData.ts` | Gerencia transações financeiras: receitas, despesas, metas e reservas |

**Por que existe?**  
Separa a lógica de negócios da interface. Assim, os componentes ficam mais limpos e a lógica pode ser reutilizada.

---

#### `src/utils/` — Funções Auxiliares

**O que é?**  
Pasta para funções utilitárias que são usadas em vários lugares.

**O que tem?**  
- `tauri.ts` — A **ponte de comunicação** entre o React (frontend) e o Rust (backend). Usa `safeInvoke()` para chamar comandos do Tauri de forma segura.
- `exportUtils.ts` — Funções de exportação para diferentes formatos (PDF, Email, Google Drive, JSON, Markdown).
- `mockData.ts` — Dados fictícios usados durante o desenvolvimento e testes.

**Por que existe?**  
Centraliza a comunicação com o backend em um único lugar. Se a API mudar, você só precisa editar este arquivo.

---

#### `src/assets/` — Mídia Estática

**O que é?**  
Imagens, ícones SVG, fontes e outros arquivos estáticos usados pela interface.

**Para que serve?**  
Guardar recursos visuais que não mudam dinamicamente.

---

### `src-tauri/` — Backend Nativo (Rust)

**O que é?**  
O backend da aplicação, construído em Rust via Tauri. É a "ponte" entre o frontend e o sistema operacional.

**Para que serve?**  
- Acessa arquivos locais
- Gerencia janelas e ícones
- Executa subprocessos (como o motor Python)
- Persiste dados (chat, configurações)
- Define permissões de segurança

**O que tem?**
- `src/lib.rs` — Definição de todos os **comandos Tauri** (APIs IPC). Cada comando é uma função Rust anotada com `#[tauri::command]`.
- `src/main.rs` — Inicialização do aplicativo
- `tauri.conf.json` — Configurações: tamanho da janela, ícones, permissões
- `Cargo.toml` — Dependências Rust (como o `package.json` do Node.js)

**Por que existe?**  
Tauri permite criar apps desktop nativos (rápidos e leves) usando web technologies. O Rust cuida da parte pesada e segura.

---

### `public/` — Arquivos Estáticos

**O que é?**  
Pasta para arquivos que são servidos diretamente pelo servidor de desenvolvimento, sem processamento.

**Para que serve?**  
Favicon, manifest, ícones do Progressive Web App.

---

### `docs/` — Documentação

**O que é?**  
Pasta dedicada à documentação do projeto, escrita em Markdown.

**O que tem?**
- `estrutura-do-projeto.md` — Este guia
- `arquitetura.md` — Referência técnica detalhada (agentes, IPC, motor Python)
- `ui-tips-agm.md` — Guia de melhorias de interface para o AntiGravity Module
- `design-system.md` — Definição de tokens (cores, fontes) e guia visual
- `components.md` — Catálogo de componentes de UI reutilizáveis
- `accessibility.md` — Padrões e regras de acessibilidade do sistema
- `MVP_Alfa_Checklist.md` — Checklist de progresso do MVP Alfa
- `plans/` — Planos e documentação de fases do projeto

**Por que existe?**  
Documentação centralizada facilita a navegação tanto para humanos quanto para agentes de IA.

---

### `.agent/` — Regras dos Agentes de IA

**O que é?**  
Pasta que faz parte da arquitetura multi-agente do projeto. Contém regras e habilidades que os agentes de IA usam.

**O que tem?**
- `rules/` — Regras de comportamento e contexto (ex: `ui-preservation.md`)
- `skills/` — Habilidades especializadas dos agentes (brainstorming, planning, etc.)

**Por que existe?**  
Permite que os agentes de IA (Dr. Strange, Alfred, Uncle Duck, Rafiki, Stark) se comportem de acordo com seu papel, com contexto específico para cada situação.

---

### `.factory/` — Infraestrutura de Agentes

**O que é?**  
Sistema de infraestrutura que gerencia missões, serviços e conhecimento dos agentes.

**O que tem?**
- `library/` — Base de conhecimento acumulado (arquivos Markdown com informações do projeto)
- `services.yaml` — Manifesto que define como iniciar e parar serviços
- `init.sh` — Script de inicialização
- `missions/` — Dados das missões em andamento

**Por que existe?**  
Fornece a estrutura necessária para que os agentes de IA possam trabalhar de forma organizada, com acesso a conhecimento prévio e serviços controlados.

**⚠️ Cuidado:** Nunca renomeie, delete ou mova esta pasta. Ela é essencial para o funcionamento do sistema de agentes.

---

### `Laboratorio_Stark/` — Área Experimental

**O que é?**  
Uma "sandbox" onde você pode testar scripts, protótipos e ideias sem afetar o código principal.

**Para que serve?**  
Experimentar novas funcionalidades, testar bibliotecas, criar provas de conceito.

**Por que existe?**  
Separa o código experimental do código de produção, mantendo o projeto organizado.

---

### `cache/` — Dados Temporários

**O que é?**  
Pasta para armazenar dados que podem ser regenerados — caches, logs temporários, resultados intermediários.

**Para que serve?**  
Economizar tempo evitando recálculos desnecessários.

---

## 📄 Explicação dos Arquivos Raiz

### `package.json`

**O que é?**  
O "cartão de identidade" do projeto Node.js. Lista nome, versão, dependências e scripts.

**Para que serve?**  
- Define dependências (`dependencies` e `devDependencies`)
- Define scripts úteis (`npm run dev`, `npm run build`, `npm run lint`)
- É o que o `npm install` usa para instalar tudo

**Arquivos relacionados:** `package-lock.json` (versões exatas), `tsconfig.json` (configuração TypeScript)

---

### `vite.config.ts`

**O que é?**  
Configuração do **Vite**, a ferramenta que empacota (bundle) o código frontend.

**Para que serve?**  
- Define plugins (React, Tailwind)
- Configura o servidor de desenvolvimento
- Define opções de build para produção

---

### `astro_engine.py`

**O que é?**  
O **motor de cálculos astrológicos**, escrito em Python. Usa a biblioteca **Kerykeion** e as efemérides da NASA.

**Para que serve?**  
- Calcula posições planetárias (`calculate_natal`)
- Gera dados para a agenda (`get_agenda_data`)
- Produz o arquivo `astro_data.json` com os resultados

**Como é chamado?**  
Pelo backend Rust (`src-tauri/src/lib.rs`) via subprocesso Python. O Rust passa os dados (data, hora, localização) e recebe o JSON com os resultados.

**Dependências:**
- `kerykeion` — Biblioteca de astrologia (`pip install kerykeion`)
- `de421.bsp` — Efemérides da NASA (arquivo de dados astronômicos)

---

### `de421.bsp`

**O que é?**  
Arquivo de efemérides da NASA contendo dados orbitais dos planetas.

**Para que serve?**  
Base de cálculo para as posições planetárias usadas pelo motor de astrologia.

**Por que existe?**  
Sem esses dados, o motor não conseguiria calcular posições planetárias precisas.

---

### `astro_data.json`

**O que é?**  
Cache dos resultados mais recentes do motor de astrologia.

**Para que serve?**  
O motor Python escreve aqui os cálculos realizados. O frontend pode ler este arquivo para exibir dados sem recalcular.

---

### `tsconfig.json` e `tsconfig.node.json`

**O que são?**  
Configurações do TypeScript — definem como o código TypeScript é compilado para JavaScript.

---

### `index.html`

**O que é?**  
O arquivo HTML principal que o navegador abre. Contém o `<div id="root">` onde o React monta a interface.

---

### `.env` e `.env.local`

**O que são?**  
Arquivos de variáveis de ambiente — chaves de API, tokens, configurações sensíveis.

**⚠️ Segurança:** Nunca commite estes arquivos! O `.gitignore` já os exclui.

---

### `launch_aurea.bat`

**O que é?**  
Script de inicialização para Windows — executa os comandos necessários para iniciar o projeto.

---

## 🗺️ Mapa de Responsabilidades

**Quero mudar...** → **Vou editar...**

| O que você quer alterar | Onde mexer |
|------------------------|------------|
| Aparência de um botão | `src/components/common/UIComponents.tsx` |
| Uma view completa (ex: Finanças) | `src/components/FinancasView.tsx` |
| Adicionar um novo agente de IA | `src/components/AgentChat.tsx` + `docs/arquitetura.md` |
| Cálculos astrológicos | `astro_engine.py` |
| Comunicação com o backend | `src/utils/tauri.ts` |
| Comando Tauri (API Rust) | `src-tauri/src/lib.rs` |
| Estado global da agenda | `src/context/AgendaContext.tsx` |
| Lógica de tarefas | `src/hooks/useAgendaTasks.ts` |
| Lógica financeira | `src/hooks/useFinancasData.ts` |
| Horas planetárias | `src/hooks/useAstrologyData.ts` |
| Configurações do app | `src-tauri/tauri.conf.json` |
| Variáveis de ambiente | `.env` ou `.env.local` |
| Regras dos agentes | `.agent/rules/` e `.agent/skills/` |
| Conhecimento dos agentes | `.factory/library/` |
| Serviços do sistema | `.factory/services.yaml` |
| Testes experimentais | `Laboratorio_Stark/` |
| Scripts de build/dev | `package.json` (seção `scripts`) |
| Estilos globais | `src/styles.css` e `src/App.css` |
| Nova dependência Node | `package.json` (execute `npm install`) |
| Nova dependência Python | `pip install <nome>` |
| Nova dependência Rust | `src-tauri/Cargo.toml` (execute `cargo build`) |

---

## 📋 Regra de Atualização de Documentação

> **Esta regra é OBRIGATÓRIA para todos os agentes de IA que trabalham neste projeto.**

### Quando atualizar a documentação?

Sempre que você fizer **qualquer mudança no código** que afete a estrutura, comportamento ou configuração do projeto, você DEVE atualizar a documentação correspondente:

| Tipo de mudança | O que atualizar |
|----------------|----------------|
| Nova pasta ou arquivo | `docs/estrutura-do-projeto.md` |
| Nova view/componente | `docs/estrutura-do-projeto.md` + `AGENTS.md` |
| Novo comando Tauri | `docs/arquitetura.md` |
| Novo agente de IA | `docs/arquitetura.md` + `AGENTS.md` |
| Mudança de arquitetura | `docs/arquitetura.md` |
| Nova variável de ambiente | `README.md` + `docs/arquitetura.md` |
| Mudança de dependências | `README.md` (seção pré-requisitos) |
| Nova funcionalidade | `README.md` (seção apropriada) |

### Como atualizar?

1. Abra o arquivo de documentação correspondente
2. Localize a seção relevante
3. Atualize com precisão — não invente, baseie-se no código real
4. Mantenha o idioma Português e a linguagem didática
5. Verifique que os nomes de arquivos e pastas correspondem ao código

### Por que esta regra existe?

Documentação desatualizada é pior que sem documentação. Quando um agente de IA (ou um humano) confia em docs erradas, comete erros. Manter a documentação sincronizada garante que todos — humanos e agentes — trabalhem com informações corretas.

---

## 🔍 Dicas Rápidas de Navegação

**Precisa modificar...**
- Um componente visual? → `src/components/` → abra o arquivo `.tsx` correspondente
- Cálculos astrológicos? → `astro_engine.py` → edite a função desejada
- Comunicação com Rust? → `src/utils/tauri.ts` → função `invoke()`
- Estado global? → `src/context/AgendaContext.tsx`
- Regras dos agentes? → `.agent/rules/`
- Documentação? → `docs/`

**Novo no projeto?**  
Leia nesta ordem:
1. `README.md` — visão geral
2. `docs/estrutura-do-projeto.md` — este guia
3. `AGENTS.md` — diretrizes para agentes
4. `docs/arquitetura.md` — detalhes técnicos

---

<p align="center">
  <em>Última atualização: 24 de Março de 2026 — Aurea Solaris ✨</em>
</p>
