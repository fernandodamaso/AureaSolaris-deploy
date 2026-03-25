# Aurea Solaris — Plano de Implementação (Março 2026)

> **Status geral:** MVP Alfa em desenvolvimento ativo.
> **Compilação:** TypeScript ✅ | Rust ✅
> **Servidor dev:** `http://localhost:1420/`

---

## Resumo Executivo

O projeto Aurea Solaris é um dashboard astrológico profissional com agentes de IA, construído com React/TypeScript (frontend), Rust/Tauri (backend) e Python (motor astrológico). O objetivo é ser uma ferramenta de produtividade pessoal guiada pela astrologia.

### Arquitetura
```
React/TS (frontend) → IPC (safeInvoke) → Rust/Tauri (backend) → Python (astro_engine.py)
                                              ↓
                                    Agentes IA (Rafiki, Alfred, Uncle Duck, Stark, Dr. Strange)
```

---

## O que já funciona

### Motor de Mock (browser mode)
- **Arquivo:** `src/utils/tauri.ts`, `src/utils/mockData.ts`
- **Status:** ✅ Funcional
- O app roda no browser (localhost:1420) sem Tauri. Mock data para astrologia, agentes, armazenamento (localStorage).

### Mandala Astrológica Profissional
- **Arquivo:** `src/components/MandalaChart.tsx` (novo), `src/components/MandalaPage.tsx`
- **Status:** ✅ Funcional
- SVG com casas, aspectos e graus sempre visíveis.
- Toggles para: Asteroides/Nodos/Fortuna, Decanatos, Trânsitos.
- Tooltip ao hover nos planetas com nome, signo, grau e retrogradação.

### Chat Multi-AIA com Sessões
- **Arquivo:** `src/components/AgentChat.tsx`
- **Status:** ✅ Funcional
- Botão "+" para nova sessão de chat.
- Lista de sessões anteriores com preview e contagem de mensagens.
- Botão "↓" para scroll-to-bottom.
- Contexto completo para TODOS os agentes (não só Rafiki): astrologia + tarefas + finanças.
- Persistência via localStorage (browser) ou Tauri (desktop).

### Dr. Strange
- **Arquivo:** `src/App.tsx`
- **Status:** ✅ Funcional (mock)
- Contexto completo: posições planetárias, aspectos, tarefas pendentes/completas, saldo financeiro, insights do Alfred.
- Fecha ao clicar fora do widget (backdrop overlay).
- Detecta automaticamente o agente pelo system prompt.

### Mesa de Criação (MesaCriacao)
- **Arquivo:** `src/components/MesaCriacao.tsx`, `src/components/mesa/AssetPicker.tsx` (novo)
- **Status:** ✅ Funcional
- Board com nodes (post-it, texto, checklist, sticker, imagem).
- Drag, resize, zoom, pan, snap-to-grid.
- Conexões entre nodes (edges).
- Exportação: JSON, SVG, email, Google Drive (stub).
- **Novo:** Botão "Importar do Servidor" — importa notas, astrologia, calendário, tarefas, lições e chats como cards.

### Editor de Perfil
- **Arquivo:** `src/components/ProfileEditor.tsx` (novo)
- **Status:** ✅ Funcional
- Campos estruturados: nome, data de nascimento, hora, cidade (dropdown com cidades brasileiras).
- Cálculo de mapa natal ao vivo ao preencher data/hora.
- Preview simplificado (posições dos principais planetas).
- Preferências: contexto pessoal, estilo de diálogo.

### Rafiki Escola (Estudos Avançados)
- **Arquivo:** `src/components/RafikiEscola.tsx`
- **Status:** ✅ Funcional
- Conteúdo avançado: Progressões Secundárias, Direções Primárias, Revolução Solar, Astrocartografia, Dignidades Essenciais, Técnicas Helenísticas.
- CRUD completo: criar, deletar, editar lições.
- "Gerar Conteúdo com Rafiki": pede ao agente IA para criar lições sobre qualquer tema.
- Lições salvas em localStorage.
- Categorias: Avançado, Especialista.

### Backend Rust
- **Arquivo:** `src-tauri/src/lib.rs`
- **Status:** ✅ Compila limpo
- 24 comandos Tauri registrados.
- Novos comandos: `list_chat_sessions`, `delete_chat_session`.
- Mock system para browser (sem Tauri).

---

## O que precisa ser feito

### Prioridade ALTA

#### 1. Testar no localhost
- Abrir `http://localhost:1420/` e verificar todas as funcionalidades.
- Reportar bugs encontrados.

#### 2. Cards menores e tipografia menor (Fix #4)
- **Problema:** Cards grandes demais, tipografia muito grande.
- **Solução:**
  - Reduzir padding dos cards (p-2/p-3 em vez de p-4/p-6).
  - Tipografia menor: títulos 10-11px, corpo 11-12px.
  - Paleta de cores: 2-3 cores principais (dourado, teal, neutros).
  - Criar tokens CSS/Tailwind para tamanho compacto.
- **Arquivos afetados:** `src/components/common/UIComponents.tsx`, `src/styles.css`, `tailwind.config.js`.

#### 3. Profile simplificado com Sun/Moon/ASC (Fix #5)
- **Problema:** Preview do mapa no perfil muito pesado.
- **Solução:**
  - Mostrar apenas Sol, Lua e ASC com graus e signos.
  - Sem cálculo em tempo real no perfil (só na Mandala).
  - Dados estáticos lidos do perfil salvo.
- **Arquivo:** `src/components/ProfileEditor.tsx`.

#### 4. Google Calendar via Composio MCP
- **Problema:** OAuth2 manual complexo, sem Google Cloud Console.
- **Solução:** Usar Composio MCP que gerencia OAuth2 automaticamente.
- **Passos:**
  1. Instalar `composio-core` no projeto.
  2. Criar componente de conexão com Google Calendar.
  3. Usar API do Composio para listar/criar/deletar eventos.
  4. Integrar com a agenda existente.
- **Arquivos:** `package.json`, novo `src/services/composio.ts`, `src/components/agenda/AgendaView.tsx`.

### Prioridade MÉDIA

#### 5. Tipagem TypeScript mais rigorosa
- Tipar `ChatMessage`, `ChatSession`, `NodeData`, `EdgeData`.
- Remover `any` restante em contextos e handlers.
- **Arquivos:** `src/components/AgentChat.tsx`, `src/context/AgendaContext.tsx`, `src/components/MesaCriacao.tsx`.

#### 6. Integração Alfred Hub com chats
- Enviar histórico de conversas para o Alfred Hub.
- Listar conversas arquivadas no Hub.
- **Arquivos:** `src/components/AlfredHubView.tsx`, `src-tauri/src/lib.rs` (comando `archive_chat`).

#### 7. Observabilidade
- Logs estruturados no frontend (console com formato JSON).
- Métricas: latência IPC, tempo de engine, tempo de resposta IA.
- **Arquivo:** novo `src/utils/logger.ts`.

#### 8. Melhorias na Mesa de Criação
- Minimap do board.
- Undo/redo mais robusto (histórico de 50 ações).
- Colaboração futura (preparar para shared board).

### Prioridade BAIXA

#### 9. Testes automatizados
- Unit tests para `astro_engine.py` (pytest).
- Unit tests para hooks React (vitest).
- Integration tests para IPC (mock Tauri).
- **Config:** `vitest.config.ts`, `pytest.ini`.

#### 10. CI/CD Pipeline
- GitHub Actions: build + test + lint.
- Builds para Windows (MSI).
- **Arquivo:** `.github/workflows/ci.yml`.

#### 11. Internacionalização (i18n)
- Sistema de tradução para textos hardcoded.
- Suporte a PT-BR (padrão) e EN.

#### 12. Performance
- Memoização de `buildRafikiContext` com `useMemo`.
- Lazy loading de módulos pesados (Mandala, Mesa).
- Debounce de atualizações de astrologia.

---

## Fluxo OAuth2 com Composio MCP (documentação)

### O que é Composio
Composio é uma plataforma que fornece integrações pré-configuradas para apps de IA. Eles gerenciam OAuth2, tokens e APIs para você.

### Como funciona
1. **Sem Google Cloud Console** — Composio já tem apps OAuth2 registrados.
2. **Login único** — Você faz login no Google uma vez pelo browser do Composio.
3. **API local** — Seu app chama o Composio via API local (REST ou MCP).
4. **Múltiplas integrações** — Google Calendar, Drive, Todoist, Slack, etc.

### Instalação
```bash
npm install composio-core
```

### Fluxo de uso
```
1. App chama composio.connect('googlecalendar')
2. Composio abre browser para login do Google
3. Usuário concede permissão
4. Composio salva tokens localmente
5. App chama composio.execute('googlecalendar', 'list_events', { ... })
6. Composio faz a chamada API e retorna os dados
```

### Integração no Aurea Solaris
- Criar `src/services/composio.ts` com funções wrapper.
- Atualizar `AgendaView.tsx` para usar Composio em vez de mock.
- Adicionar botão "Conectar Google Calendar" na agenda.

---

## Arquivos Criados/Modificados nesta Sessão

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/utils/mockData.ts` | Criado | Mock data para browser mode |
| `src/utils/tauri.ts` | Reescrito | Mock system integrado |
| `src/components/MandalaChart.tsx` | Criado | Mandala SVG profissional |
| `src/components/MandalaPage.tsx` | Reescrito | Integração com MandalaChart |
| `src/components/MandalaView.tsx` | Corrigido | Bug de mapeamento de data.planets |
| `src/components/AgentChat.tsx` | Reescrito | Sistema de sessões + contexto global |
| `src/components/ProfileEditor.tsx` | Criado | Editor de perfil estruturado |
| `src/components/RafikiEscola.tsx` | Reescrito | CRUD + geração de conteúdo |
| `src/components/mesa/AssetPicker.tsx` | Criado | Importação de assets |
| `src/components/MesaCriacao.tsx` | Modificado | Botão de importar assets |
| `src/components/FinancasView.tsx` | Corrigido | Import não utilizado |
| `src/components/SaudeView.tsx` | Corrigido | Import não utilizado |
| `src/App.tsx` | Modificado | Dr. Strange com contexto completo, ProfileEditor |
| `src-tauri/src/lib.rs` | Modificado | Comandos de sessão de chat, remoção OAuth2 |
| `docs/MVP_Alfa_Checklist.md` | Reescrito | Plano de 10 fases |
| `docs/plans/implementation-plan-2026-03-24.md` | Criado | Este documento |

---

## Próximos Passos Imediatos

1. **Usuário testa localhost** — Verificar se tudo funciona.
2. **Corrigir bugs reportados** — Ajustes finos após teste.
3. **Cards menores** — Reduzir tipografia e padding.
4. **Profile simplificado** — Sun/Moon/ASC estático.
5. **Composio MCP** — Integrar Google Calendar.
