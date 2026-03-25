# Environment - Aurea Solaris

Variaveis de ambiente, dependencias externas e notas de configuracao.

**O que pertence aqui:** Variaveis de ambiente necessarias, APIs externas, dependencias, notas de configuracao.
**O que NAO pertence aqui:** Portas e comandos de servicos (use .factory/services.yaml).

---

## Variaveis de Ambiente

As seguintes variaveis sao usadas pelo projeto (definidas em `.env` e `.env.local`):

### APIs de IA/LLM
| Variavel | Descricao | Onde Usado |
|----------|-----------|------------|
| `OPENROUTER_API_KEY` | Chave de API para OpenRouter (provedor de LLM em nuvem) | `src-tauri/src/lib.rs` - comando `openrouter_chat` |
| `OLLAMA_HOST` | URL do servidor Ollama local (padrao: `http://localhost:11434`) | `src-tauri/src/lib.rs` - comando `ollama_chat` |

### APIs de Integracao
| Variavel | Descricao | Onde Usado |
|----------|-----------|------------|
| `TODOIST_TOKEN` | Token de acesso a API do Todoist | `src-tauri/src/lib.rs` - comando `get_todoist_tasks` |
| `TELEGRAM_TOKEN` | Token do bot do Telegram | `src-tauri/src/lib.rs` - comando `send_telegram_message` |
| `TELEGRAM_CHAT_ID` | ID do chat do Telegram para envio de mensagens | `src-tauri/src/lib.rs` - comando `send_telegram_message` |

### APIs de Email (Opcional)
| Variavel | Descricao | Onde Usado |
|----------|-----------|------------|
| `EMAIL_SENDER` | Email do remetente | Funcionalidade de email |
| `EMAIL_PASSWORD` | Senha/app password do email | Funcionalidade de email |
| `EMAIL_RECEIVER` | Email do destinatario | Funcionalidade de email |

### Google APIs (Opcional)
| Variavel | Descricao | Onde Usado |
|----------|-----------|------------|
| `GOOGLE_CLIENT_ID` | Client ID OAuth2 para Google Calendar/Drive | `src-tauri/src/lib.rs` - comandos `google_drive_connect`, `add_google_event` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chave para Google Generative AI | Integracoes opcionais |

**Nota:** O arquivo `.env.local` tem prioridade sobre `.env` para variaveis sobrepostas.

---

## Dependencias do Sistema

### Requisitos Obrigatorios
| Software | Versao | Justificativa |
|----------|--------|---------------|
| Node.js | v18+ | Runtime para Vite e ferramentas frontend |
| npm | Qualquer | Gerenciador de pacotes JavaScript |
| Rust/Cargo | Qualquer | Compilador para backend Tauri |
| Tauri CLI | v2 | Ferramenta de build para apps desktop |
| Python | 3.x | Motor de astrologia (`astro_engine.py`) |

### Dependencias Python
| Biblioteca | Funcao |
|------------|--------|
| `kerykeion` | Calculos astrológicos (mapas natais, trânsitos) |
| `swisseph` | Efemerides da NASA (Swiss Ephemeris) |

### Dependencias Node.js (package.json)
| Pacote | Funcao |
|--------|--------|
| `@tauri-apps/api` | API do Tauri para frontend |
| `@tauri-apps/cli` | CLI do Tauri para build |
| `@tauri-apps/plugin-dialog` | Plugin de diálogos nativos |
| `@tauri-apps/plugin-fs` | Plugin de sistema de arquivos |
| `@tauri-apps/plugin-opener` | Plugin para abrir URLs |
| `react` / `react-dom` | Framework de UI (v19.1) |
| `@tailwindcss/vite` | Integracao Tailwind v4 com Vite |
| `lucide-react` | Biblioteca de icones |

---

## Dados de Efemerides

| Arquivo | Descricao | Tamanho |
|---------|-----------|---------|
| `de421.bsp` | Efemerides da NASA (Swiss Ephemeris) 1900-2050 | ~16MB |

**Importante:** Este arquivo ja esta no repositorio. Nao e necessario baixar novamente.

---

## Arquivos de Cache/Dados Locais

| Arquivo | Descricao |
|---------|-----------|
| `astro_data.json` | Cache de dados astrais processados |
| `cache/` | Diretorio de cache generico |

---

## Notas de Configuracao

1. **Windows:** O projeto usa `python.exe` explicitamente nos comandos Tauri
2. **Caminhos:** No Windows, o app_data_dir geralmente fica em `%APPDATA%/aurea-solaris/`
3. **Memória:** O historico de chat e dados sao salvos em `memory/` dentro do app_data_dir
4. **Ollama:** Se usando Ollama local, certifique-se que esta rodando na porta 11434
