# Aurea Solaris

## 🌟 O que é o Aurea Solaris?

O **Aurea Solaris** é um aplicativo de desktop que combina **astrologia**, **gestão pessoal** e **inteligência artificial** em uma única ferramenta. Ele foi pensado para ajudá-lo a organizar sua vida cotidiana enquanto considera influências astrológicas, oferecendo uma experiência única e personalizada.

Imagine ter um assistente virtual que não apenas ajuda com tarefas e finanças, mas também entende o momento astrológico do seu dia e oferece orientações de acordo com as estrelas. É isso que o Aurea Solaris faz — conectando tecnologia moderna com sabedoria ancestral.

### 🎯 Para que serve?

- **Organização pessoal**: Agenda inteligente que adapta suas tarefas conforme as horas planetárias
- **Astrologia prática**: Mapas natais, trânsitos e cálculos astrológicos em tempo real
- **Gestão financeira**: Controle simplificado de receitas, despesas e metas financeiras
- **Saúde e bem-estar**: Acompanhamento de hábitos saudáveis e vitalidade
- **Banco de ideias**: Um canvas infinito para conectar conceitos e criar projetos
- **Diário inteligente**: Registro diário com insights baseados no seu mapa astral

---

## 🛠️ Tecnologias Utilizadas

O Aurea Solaris foi construído com tecnologias modernas e robustas:

| Tecnologia | Função |
|------------|--------|
| **Tauri 2.0 (Rust)** | Framework para aplicações desktop nativas, rápido e leve |
| **React 19.1** | Biblioteca para interfaces interativas e responsivas |
| **TypeScript 5.8** | JavaScript tipado para código mais seguro e manutenível |
| **Vite 7** | Ferramenta de build rápida e moderna |
| **Tailwind CSS v4** | Framework CSS para estilização ágil (via `@tailwindcss/vite`) |
| **Python 3** | Motor de cálculos astrológicos precisos (biblioteca Kerykeion) |

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter os seguintes programas instalados:

### Programas Necessários

| Programa | Versão Mínima | Como Instalar |
|----------|---------------|---------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Rust** | Qualquer versão estável | [rustup.rs](https://rustup.rs) |
| **Python** | 3.10+ | [python.org](https://python.org) |
| **Tauri CLI** | v2 | `cargo install tauri-cli` |

### Dependências Python

O motor de astrologia utiliza a biblioteca **Kerykeion**:

```bash
pip install kerykeion
```

---

## 🚀 Como Rodar o Projeto

### ⚡ TESTE RÁPIDO (Para você!)

**Clique duas vezes neste arquivo na sua Área de Trabalho:**

```
📁 AureaSolaris-Dev.bat
```

Isso vai:
1. ✅ Verificar dependências
2. ✅ Iniciar o servidor Vite
3. ✅ Abrir automaticamente `http://localhost:1420/` no navegador

---

### Opção 2: Dentro do Projeto

Execute `start-dev.bat` na pasta do projeto:

```batch
start-dev.bat
```

### Opção 3: Via Terminal

```bash
npm start
```

O servidor estará em `http://localhost:1420/`

---

### Comandos Disponíveis

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `📁 AureaSolaris-Dev.bat` | **ONE-CLICK** - Inicia + abre navegador | **USE ESTE!** |
| `npm start` | Inicia servidor Vite | Terminal |
| `npm run dev` | Vite com hot reload | Desenvolvimento |
| `npm run build` | Verifica TypeScript + build | Pre-deploy |
| `npm run tauri dev` | App desktop completa | Com Tauri |
| `npm run lint` | Verifica código | Pre-commit |
| `npm test` | Executa testes | Verificação |

---

### 🔧 Se der Problema

**Porta já em uso?**
```bash
npx kill-port 1420
npm start
```

**Erro de TypeScript?**
```bash
npm run build
```

---

## 🏗️ Arquitetura do Projeto

O Aurea Solaris possui uma arquitetura em **3 camadas** que trabalham em harmonia:

```
┌─────────────────────────────────────────────────┐
│              CAMADA 1: FRONTEND                  │
│         React + TypeScript + Tailwind            │
│    (Interface visual e interação do usuário)     │
└─────────────────┬───────────────────────────────┘
                  │ Comunicação IPC
┌─────────────────▼───────────────────────────────┐
│              CAMADA 2: NATIVA                    │
│            Tauri (Rust)                          │
│    (Sistema de arquivos, APIs, persistência)     │
└─────────────────┬───────────────────────────────┘
                  │ Subprocesso Python
┌─────────────────▼───────────────────────────────┐
│              CAMADA 3: MOTOR                     │
│              Python                              │
│   (Cálculos astrológicos com Kerykeion)          │
└─────────────────────────────────────────────────┘
```

### Como as Camadas se Comunicam

1. **Frontend → Backend**: A interface React envia comandos via `invoke()` para o Rust
2. **Backend Rust**: Gerencia arquivos, chama APIs externas, executa subprocessos
3. **Rust → Python**: Chama o `astro_engine.py` para cálculos astrológicos complexos
4. **Python → Rust → Frontend**: Resultados são retornados pela cadeia para exibição

---

## 🔐 Variáveis de Ambiente

O projeto utiliza variáveis de ambiente para configurações sensíveis. Elas devem ser definidas nos arquivos `.env` ou `.env.local`:

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `OPENROUTER_API_KEY` | Chave de API para serviços de IA em nuvem | Para agentes IA online |
| `TODOIST_TOKEN` | Token de acesso ao Todoist | Para integração com tarefas |
| `TELEGRAM_TOKEN` | Token do bot do Telegram | Para notificações |
| `TELEGRAM_CHAT_ID` | ID do chat para mensagens | Para notificações |
| `EMAIL_SENDER` | Email remetente | Para funcionalidades de email |
| `EMAIL_PASSWORD` | Senha de app do email | Para funcionalidades de email |
| `GOOGLE_CLIENT_ID` | Client ID OAuth2 do Google | Para Google Calendar/Drive |

**Nota**: O Ollama local funciona automaticamente em `http://localhost:11434` se estiver instalado.

---

## 📁 Estrutura de Pastas

```
AureaSolaris/
├── src/                    # Frontend React
│   ├── components/         # Componentes e Views
│   ├── context/            # Estado global (AgendaContext)
│   ├── hooks/              # Lógica especializada
│   └── utils/              # Utilitários
├── src-tauri/              # Backend Rust
├── docs/                   # Documentação
├── Laboratorio_Stark/      # Área experimental
├── astro_engine.py         # Motor de astrologia
├── de421.bsp              # Efemérides NASA
└── .env                   # Configurações
```

Para uma explicação detalhada de cada pasta e arquivo, consulte o guia completo: [docs/estrutura-do-projeto.md](docs/estrutura-do-projeto.md)

---

## Cálculos Astrológicos

O Aurea Solaris utiliza o motor `kerykeion` (Python) para cálculos astrológicos de alta precisão:

- **Efemérides:** Swiss Ephemeris (de421.bsp)
- **Sistema de casas:** Configurável (Regiomontanus, Placidus, Koch, etc.)
- **Corpos:** 10 planetas + Chiron + North Node + Lilith + Part of Fortune + Vertex
- **Aspectos:** Todos os aspectos maiores e menores com orbs configuráveis
- **Horas planetárias:** Baseadas na ordem caldéia
- **Fase lunar:** Cálculo real via ephemeris

Para validar a precisão, o mapa natal de referência está em `natal_charts/viviane.json`.

---

## 🤖 Agentes de Inteligência Artificial

O diferencial do Aurea Solaris é sua equipe de 5 agentes de IA, cada um com personalidade e função específica:

### 🧙‍♂️ Dr. Strange — O Supervisor Macro

- **Atua**: Globalmente, como visão geral do sistema
- **Personalidade**: Sábio e conciso, conecta padrões entre astrologia e ações do dia
- **Função**: Oferece perspectivas macro, ligando horas celestes às suas atividades

### 🎩 Alfred — O Mordomo Produtivo

- **Atua**: Agenda, Saúde e Hub Central
- **Personalidade**: Organizado, direto e impecável
- **Função**: Gerencia tarefas, compromissos e bem-estar com eficiência britânica

### 🦆 Uncle Duck — O Consultor Financeiro

- **Atua**: Gestão de Ouro (Finanças)
- **Personalidade**: Pragmático, ávido por lucros e direto
- **Função**: Analisa gastos, sugere economias e monitora investimentos

### 🐒 Rafiki — O Astrólogo Técnico

- **Atua**: Astrologia e Diário
- **Personalidade**: Preciso, técnico, dados concretos
- **Função**: Traduz dados brutos do motor astrológico em conselhos práticos e orientações

### ⚙️ Stark — O Monitor Técnico

- **Atua**: Painel de Controle
- **Personalidade**: Altamente técnico, direto e conciso
- **Função**: Monitora a estabilidade do sistema e integridade da ponte entre tecnologias

---

## 📱 Views Modulares

A interface é dividida em módulos especializados que você pode acessar conforme sua necessidade:

1. **Mesa de Criação** — Canvas infinito para conectar ideias e projetos
2. **Astrologia** — Mapas natais, trânsitos e horas planetárias
3. **Saúde & Vitalidade** — Controle de bem-estar e hábitos
4. **Agenda Preditiva** — Cronograma inteligente baseado nas estrelas
5. **Gestão de Ouro** — Finanças pessoais simplificadas
6. **Painel de Controle** — Configurações e monitoramento do sistema
7. **Alfred Hub** — Central de tarefas e links rápidos
8. **Diário (Memórias)** — Registro diário com insights
9. **Escola do Rafiki** — Módulo educacional interativo

---

## 📚 Documentação

### Navigation Hub
- **[docs/index.md](docs/index.md)** — All documentation organized by domain (English)

### Quick Reference
- **[docs/quick-reference.md](docs/quick-reference.md)** — Fast lookup for common tasks

### Domain Documentation (English)
- [Agents System](docs/agents-system.md) — Personas, configuration, models
- [Tauri IPC API](docs/tauri-ipc-api.md) — All backend commands
- [Astrology Engine](docs/astrology-engine.md) — Python calculations
- [Google Calendar](docs/google-calendar.md) — Calendar integration
- [Data Persistence](docs/data-persistence.md) — Storage mechanisms
- [Setup Guide](docs/setup-guide.md) — Installation instructions

### Portuguese Documentation
- [Estrutura do Projeto](docs/estrutura-do-projeto.md) — Guia completo de pastas e arquivos

### Legacy (Preserved)
- [Arquitetura Técnica](docs/arquitetura.md) — ⚠️ Original (see domain docs above)

---

## 🔒 Segurança

- Nunca compartilhe seus arquivos `.env` ou `.env.local`
- As chaves de API são armazenadas localmente e nunca enviadas ao repositório
- A pasta `.factory/` contém configurações do sistema de agentes e deve ser mantida

---

## 💡 Para Agentes de IA

Se você é um agente de IA trabalhando neste projeto, siga estas dicas:

### Navegação Rápida

- **Precisa modificar um componente UI?** → `src/components/` + leia `docs/estrutura-do-projeto.md`
- **Precisa alterar uma API Tauri?** → `src-tauri/src/lib.rs` + leia `docs/arquitetura.md`
- **Precisa modificar cálculos astrológicos?** → `astro_engine.py`
- **Precisa ajustar configurações?** → Arquivos na raiz (`package.json`, `vite.config.ts`)
- **Precisa entender os agentes?** → `AGENTS.md` + `docs/arquitetura.md`

### Regras Importantes

1. **Linguagem acessível**: Explique conceitos técnicos de forma simples para o usuário
2. **Documentação首先**: Toda mudança no código DEVE atualizar a documentação correspondente
3. **Português**: Mantenha toda documentação em Português

### Arquivos de Referência

- `AGENTS.md` — Diretrizes principais do projeto
- `docs/arquitetura.md` — Arquitetura técnica detalhada
- `docs/estrutura-do-projeto.md` — Mapeamento de pastas e responsabilidades
- `.factory/library/` — Conhecimento acumulado do projeto

---

## 📄 Licença

Este é um projeto pessoal. Todos os direitos reservados.

---

<p align="center">
  <em>Aurea Solaris — Onde a tecnologia encontra as estrelas ✨</em>
</p>
