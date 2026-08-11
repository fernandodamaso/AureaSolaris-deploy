# User Testing - Aurea Solaris

Superficie de teste e estrategia de validacao.

---

## Superficie de Teste

### Tipo de Aplicacao
| Aspecto | Descricao |
|---------|-----------|
| Tipo | Aplicacao Desktop (Tauri) |
| Plataforma | Windows (primario), suporte multiplataforma |
| Frontend | React SPA em janela nativa |
| Backend | Rust (Tauri) + Python (astrologia) |
| Testes existentes | Nenhum (projeto sem suite de testes configurada) |

### Componentes Testaveis

| Componente | Tipo | Onde Testar |
|------------|------|-------------|
| Views React | UI | Janela do app Tauri |
| Hooks React | Logica | Testes unitários (futuro) |
| Comandos Tauri | Backend | IPC invoke direto |
| Motor Python | Script | `python astro_engine.py` |
| Agentes de IA | Integracao | Chat via UI (requer API keys) |

---

## Custo de Recursos

### Requisitos de Sistema

| Recurso | Estimativa | Notas |
|---------|------------|-------|
| Memoria RAM | ~300-500MB | Tauri app + React + Python engine |
| CPU | Leve | Aplicacao reativa, sem processamento em background |
| Disco | ~100MB | Incluindo efemerides (~16MB) |
| Rede | Requerida | Para APIs de IA (OpenRouter) |

### Servicos Externos

| Servico | Requisito | Impacto |
|---------|-----------|---------|
| OpenRouter | API Key obrigatória | Agentes de IA cloud |
| Ollama | Local (opcional) | Agentes de IA local (privacidade) |
| Telegram | Token (opcional) | Notificacoes |

---

## Estrategia de Testes

### Testes Manuais (Atuais)

#### IPC Bridge (Tauri)
```bash
# No console do browser (DevTools):
await window.__TAURI__.core.invoke('get_sys_info')
await window.__TAURI__.core.invoke('run_astro_engine')
```

#### Motor Python
```bash
# No terminal:
python astro_engine.py '{"year": 2024, "month": 1, "day": 1}'
```

#### Views React
- Iniciar app: `npm run tauri dev`
- Navegar por cada view
- Verificar renderização e interações

### Testes Recomendados (Futuro)

| Tipo | Ferramenta | Prioridade |
|------|------------|------------|
| Unit Tests | Vitest | Alta |
| Component Tests | React Testing Library | Media |
| E2E Tests | Playwright/Puppeteer | Media |
| IPC Tests | Mock Tauri API | Alta |

---

## Cenarios de Teste Principais

### Autenticacao/Login
- [ ] Login com credenciais validas
- [ ] Login com credenciais invalidas
- [ ] Persistencia de sessão

### Views Modulares
- [ ] Navegação entre todas as 8 views
- [ ] Renderização correta de cada view
- [ ] Responsividade da UI

### Agentes de IA
- [ ] Chat com Dr. Strange (global)
- [ ] Chat com Alfred (Saude/Agenda)
- [ ] Chat com Uncle Duck (Financas)
- [ ] Chat com Rafiki (Astrologia)
- [ ] Chat com Stark (Controle)
- [ ] Persistencia de historico de chat
- [ ] Arquivamento de conversas

### Motor de Astrologia
- [ ] Calculo de mapa natal
- [ ] Calculo de horas planetárias
- [ ] Regência planetária
- [ ] Cache de dados (astro_data.json)

### Mesa de Criacao
- [ ] Criar nos/conceitos
- [ ] Conectar nos
- [ ] Arrastar/mover elementos
- [ ] Salvar estado (save_board)
- [ ] Carregar estado (load_board)

### Integracoes
- [ ] Sincronização de tarefas locais
- [ ] Envio de mensagem Telegram
- [ ] Sincronização de dados

---

## Notas para Validacao

### Testar IPC
1. Via React DevTools: `window.__TAURI__.core.invoke()`
2. Via console do browser
3. Via logs no terminal do Tauri

### Testar Motor Python
```bash
# Testar calculo basico
python astro_engine.py '{"action": "natal", "year": 1990, "month": 6, "day": 15, "hour": 10, "minute": 30, "city": "São Paulo"}'

# Verificar saida JSON
echo $?
```

### Testar Agentes
- Requer `OPENROUTER_API_KEY` configurada
- Ou `OLLAMA_HOST` apontando para servidor local
- Testar em cada view com persona correspondente

### Debug
- **Frontend:** React DevTools + Console do browser
- **Backend:** Logs do Tauri no terminal
- **Python:** stdout/stderr do subprocesso
- **IPC:** Logs em `safeInvoke()` wrapper

---

## Limitacoes Conhecidas

| Limite | Descricao | Workaround |
|--------|-----------|------------|
| Sem testes automatizados | Projeto nao possui suite de testes | Testes manuais |
| Dependencia externa | Agentes requerem API keys | Configurar .env.local |
| Plataforma | Desenvolvido/testado em Windows | Cross-platform Tauri |
| Efemerides | Arquivo statico (1900-2050) | Atualizar periodicamente
