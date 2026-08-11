# Aurea Solaris — Arquitetura

## Visão Geral

Aurea Solaris é um app desktop construído com **Tauri 2** (Rust backend + React frontend) e um **sidecar Python FastAPI** para cálculos astrológicos de precisão profissional. A arquitetura segue o princípio "menos é mais" — uma única IA (Hermes) substituiu os 5 agentes anteriores.

## Stack

```
┌─────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite)            │
│  • 7 páginas via useState routing               │
│  • Sidebar + Header + HermesChat (FAB)           │
│  • Design system: gold/navy, Montserrat/Inter    │
├─────────────────────────────────────────────────┤
│  Backend Rust (Tauri 2 — lib.rs)                 │
│  • 21+ comandos IPC: Diário, Calendário, Astrologia │
│  • Sidecar管理: inicia Python via HTTP           │
│  • AppState: reqwest client compartilhado        │
│  • Tray Icon: minimiza para bandeja              │
├─────────────────────────────────────────────────┤
│  Sidecar Python (FastAPI — main_api.py :9876)    │
│  • Swiss Ephemeris (swisseph) — cálculo direto   │
│  • Kerykeion — fallback quando SWE indisponível  │
│  • Endpoints: /health, /natal, /transit          │
│  • Cálculos: planetas, casas, aspectos, orbs     │
│  • Part of Fortune noturno, iluminação cosseno   │
├─────────────────────────────────────────────────┤
│  Obsidian Vault (C:\Users\vivic\Documents\       │
│  AureaSolarisDiary)                              │
│  • Diário pessoal em markdown                    │
│  • Sincroniza com Obsidian (abre/edita lá)       │
│  • Separado do vault de trabalho (Lightfarm)     │
└─────────────────────────────────────────────────┘
```

## Fluxo de Dados

```
User clica no app
  → React renderiza página
  → Usuário interage
  → Frontend chama safeInvoke('comando', dados)
    → Tauri IPC → lib.rs processa
      → Se astrologia: HTTP POST localhost:9876/natal
      → Se diário: lê/escreve vault Obsidian
      → Se Calendar externo: HTTP API externa
    → Resultado volta ao frontend
  → React atualiza estado
```

## Princípios de Design

1. **Astrologia guia tudo** — o mapa natal é o coração, trânsitos orientam decisões
2. **UX > Features** — menos é mais, eficiência e usabilidade
3. **Dados locais** — tudo fica na máquina do usuário
4. **Hermes é tudo** — um assistente que assume todos os papéis (professor, secretário, diarista)
5. **Obsidian como hub** — markdown é o formato universal, Obsidian é a interface de edição

## Comandos Rust (lib.rs)

### Diário (10 comandos)
- `diary_create_entry`, `diary_update_entry`, `diary_delete_entry`
- `diary_list_entries`, `diary_get_entry`
- `diary_create_folder`, `diary_list_folders`, `diary_delete_folder`
- `diary_save_tabs`, `diary_load_tabs`

### Obsidian (5 comandos)
- `obsidian_diary_list_entries`, `obsidian_diary_read_entry`
- `obsidian_diary_save_entry`, `obsidian_diary_delete_entry`
- `obsidian_diary_get_vault_path`

### Mesa de Criação (2 comandos)
- `save_board`, `load_board`

### Integrações (4+ comandos)
- `run_astro_engine` — chama sidecar Python
- `add_google_event`, `delete_google_event`, `list_google_calendar_events`
- `get_google_events` — alias para listagem de eventos

### Sistema (3 comandos)
- `get_sys_info`, `get_key`, `save_app_setting`

## Motor Astrológico (astro_engine.py)

Refatorado em 2026-06-11. Características:
- **Swiss Ephemeris** para precisão profissional
- **Kerykeion** como fallback
- **Orbs dinâmicos** por planeta com multiplicadores por tipo de aspecto
- **Part of Fortune noturno** (formula diferente para dia/noite)
- **Iluminação cosseno** (Duffet) em vez de média aritmética
- **Cálculo direto de trânsitos** (sem loops de interpolação)
- **LRU cache** para performance
- **Pre-calculated house ranges** para busca binária

## Frontend — Componentes

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| App.tsx | src/App.tsx | Shell principal, sidebar, header, routing |
| AstrologiaPage | AstrologiaBoard.tsx | Mapa natal + mandala SVG |
| DiarioView | DiarioView.tsx | Diário com sidebar + editor |
| MesaCriacao | MesaCriacao.tsx | Board tipo Miro (post-its, texto, imagens) |
| AgendaView | agenda/AgendaView.tsx | Calendário + tarefas locais |
| SaudeView | SaudeView.tsx | Saúde e vitalidade |
| FinancasView | FinancasView.tsx | Gestão financeira |
| HermesChat | HermesChat.tsx | Chat flutuante com Hermes |
| ProfileEditor | ProfileEditor.tsx | Editor de perfil do usuário |

## Rodando

```bash
# Terminal 1: Sidecar Python
cd C:\AureaSolaris
python main_api.py

# Terminal 2: App Tauri
cd C:\AureaSolaris
npm run tauri dev

# Ou usar o script de inicio automático:
# C:\AureaSolaris\start_aurea.bat
```

## Atalho de Inicialização

O app inicia automaticamente com o Windows via atalho em:
`C:\Users\vivic\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\Aurea Solaris.lnk`
