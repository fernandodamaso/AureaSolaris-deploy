# 🌟 Aurea Solaris — Plano de Simplificação

## Diagnóstico Atual

O projeto hoje tem **40 comandos Rust**, **9 rotas no frontend**, **29 componentes**, e **5 Contexts**.
Muita coisa funciona, mas muita coisa é peso morto. Aqui está o mapa completo:

### O que FUNCIONA (de verdade)
| Módulo | Status | Observação |
|--------|--------|------------|
| Motor Astrológico (Python sidecar) | ✅ | Reformado, orbs dinâmicos, trânsitos diretos |
| Mapa Natal (mandala SVG) | ✅ | useAstrologyData → run_astro_engine |
| Trânsitos | ✅ | useTransitData → get_transit_positions |
| Perfil do usuário (natal) | ✅ | LoginView + ProfileEditor |
| Agenda local | ✅ | Tarefas locais persistidas + eventos do Google |
| Diário (10 comandos) | ✅ | CRUD completo, pastas, abas |
| Saúde | ✅ | 100% localStorage, gráficos |
| Mesa de Criação | ✅ | Canvas + nodes + persistência |

### O que ESTÁ QUEBRADO
| Problema | Impacto |
|----------|---------|
| `restore_chat` chamado mas não existe no Rust | Botão quebrado no AlfredHub |
| `MemoriasView` com path hardcoded `C:\Users\vivic\...` | Não funciona em outra máquina |
| `AlfredHubView` aba "Notes" retorna array vazio | Placeholder sem dados |

### O que é PESO MORTO (nunca chamado)
| Código morto | Linhas |
|-------------|--------|
| `ollama_chat_stream` + `openrouter_chat_stream` | ~149 linhas |
| `send_telegram_message` | ~30 linhas |
| `run_agm_engine` | ~54 linhas |
| `save_asset` + `list_lab_files` | ~35 linhas |
| Componentes nunca importados: `MandalaView.tsx`, `AstrologyMap.tsx`, `BaseComponents.tsx` | ~620 linhas |
| Hooks de teste: `useFinancasData.ts`, `useTransitData.ts` | ~100 linhas |
| **Total de código morto** | **~1000 linhas** |

---

## 🔪 O PLANO: Dois Pilares

### Pilar 1: ASTROLOGIA
O que fica:
- ✅ Motor Python (sidecar FastAPI) — já reformado
- ✅ `run_astro_engine` / `get_transit_positions` — já funcionam
- ✅ Mapa natal (mandala SVG) — já funciona
- ✅ Trânsitos — já funciona
- ✅ Perfil do usuário — já funciona
- ✅ `RafikiEscola` (tutor de astrologia) — usa IA local

O que MUDA:
- 🔄 Usar **Hermes** em vez de OpenRouter/Ollama para interpretações astrológicas
- 🔄 Remover `run_agm_engine` (nunca chamado)

### Pilar 2: PRODUTIVIDADE
O que fica:
- ✅ Agenda local de tarefas — persistência via localStorage
- ✅ Agenda view — já funciona
- ✅ Diário (10 comandos) — já funciona
- ✅ Finanças — já funciona (localStorage)
- ✅ Saúde — já funciona (localStorage)

O que MUDA:
- 🔄 **Garantir que o Google Calendar seja mantido como adaptador opcional**
- 🔄 Usar **Hermes** para resumos, planejamento e lembretes

### O que SAI (AI Agents / Peso Morto)
- ❌ `openrouter_chat` / `openrouter_chat_stream` → Hermes substitui
- ❌ `ollama_chat` / `ollama_chat_stream` → Hermes substitui
- ❌ `send_telegram_message` → Hermes gateway já faz isso
- ❌ `save_history` / `load_history` / `list_chat_sessions` / `delete_chat_session` → Hermes já tem memória persistente
- ❌ `archive_chat` / `list_archived_chats` / `load_archived_chat` → Hermes session_search
- ❌ `get_total_tokens` → Hermes já rastreia tokens
- ❌ Componentes: `AgentChat.tsx`, `AlfredHubView.tsx` → Hermes substitui
- Removido `ControlePanel`; status do sistema via Hermes
- ❌ `MesaCriacao` (parte de AI chat) → Mantém o canvas, remove o chat
- ❌ `MandalaView.tsx`, `AstrologyMap.tsx`, `BaseComponents.tsx` → nunca usados
- ❌ `useFinancasData.ts`, `useTransitData.ts` → superseded

---

## 📋 Fases de Execução

### FASE 1: Limpar o Backend Rust (~2h)
1. **Remover** 8 comandos mortos: `ollama_chat_stream`, `openrouter_chat_stream`, `openrouter_chat`, `ollama_chat`, `send_telegram_message`, `run_agm_engine`, `save_asset`, `list_lab_files`
2. **Remover** todos os structs auxiliares: `OpenRouter*`, `Ollama*`, `Telegram*`
3. **Remover** `AppState.api_keys` (não precisa mais de API keys para IA)
4. **Registrar** `list_google_calendar_events` no `invoke_handler`
5. **Registrar** `restore_chat` (ou remover o botão do frontend)
6. **Limpar** `known_keys` do `.env` (remover OPENROUTER_API_KEY, TELEGRAM_*)
7. **Resultado**: De ~40 comandos para **~20 comandos** limpos

### FASE 2: Limpar o Frontend (~2h)
1. **Remover** `AgentChat.tsx`, `AlfredHubView.tsx`
2. **Remover** `MandalaView.tsx`, `AstrologyMap.tsx`, `BaseComponents.tsx`
3. **Remover** `useFinancasData.ts`, `useTransitData.ts`
4. **Remover** `ControlePanel` do produto atual; manter apenas informações do sistema via sidecar se necessário
5. **Remover** aba de chat da `MesaCriacao` (manter canvas)
6. **Remover** `DiarioContext` → mover para `useMemo` + localStorage (simplificar)
7. **Corrigir** `MemoriasView` (path dinâmico via Tauri)
8. **Resultado**: De ~29 componentes para **~15 componentes** limpos

### FASE 3: Integrar Hermes (~1h)
1. **Chat astrológico**: Em vez de OpenRouter/Ollama, o app chama Hermes via Telegram ou API local
2. **Resumos diários**: Hermes já entrega briefing às 08:00 — app pode ler do Telegram
3. **Lembretes**: Hermes cronjob já existe — app pode criar tarefas locais via Hermes
4. **Resultado**: IA agora roda via Hermes (já instalado, já configurado, já com memória)

### FASE 4: Consolidar Rotas (~1h)
**Rotas finais (6 páginas):**
```
/login          → LoginView ( perfil + natal )
/astrologia     → Mapa natal + mandala + trânsitos
/agenda         → Tarefas locais + Google Calendar
/diario         → Diário pessoal
/financas       → Finanças (localStorage)
/saude          → Saúde (localStorage)
```

**Removidas:**
- `/controle` → info do sistema (já aparece em /config do sidecar)
- `/hub` → AlfredHub (chat sessions) → Hermes substitui
- `/memorias` → arquivos de chat → Hermes substitui
- `/mesa-criacao` → manter SÓ o canvas, sem chat IA

### FASE 5: Simplificar Infraestrutura (~1h)
1. **Remover** dependências npm: `react-markdown`, `react-syntax-highlighter` (só usados no chat)
2. **Remover** dependências Rust desnecessárias: `sysinfo`, `sys-info`
3. **Remover** `dotenvy` do Rust (lê .env no Python, não no Rust)
4. **Simplificar** `start_aurea.bat` → não precisa mais de API keys
5. **Resultado**: Menos dependências = build mais rápido = menos pontos de falha

---

## 📊 Antes vs Depois

| Métrica | Antes | Depois |
|---------|-------|--------|
| Comandos Rust | 40 | ~20 |
| Componentes React | 29 | ~15 |
| Rotas | 9 | 6 |
| Dependências npm | ~40 | ~30 |
| Dependências Rust | 12 | ~8 |
| Código morto | ~1000 linhas | 0 |
| Bugs conhecidos | 3 | 0 |
| IA | OpenRouter + Ollama | Hermes (já instalado) |
| Telegram | Bot próprio | Hermes gateway (já funciona) |

---

## ⏱️ Tempo Estimado Total: ~7 horas de trabalho

Cada fase pode ser executada independentemente. Posso começar por qualquer uma que você preferir.

**Recomendação:** Começar pela **Fase 1** (limpar backend) porque é onde mais peso morto existe e dá a maior sensação de limpeza imediata.
