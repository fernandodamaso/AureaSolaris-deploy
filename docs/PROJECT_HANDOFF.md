# Handoff Canônico — Aurea Solaris

Atualizado em 10/08/2026. Este arquivo permite retomar o projeto sem depender de conversa anterior.

## Projeto correto

O único repositório ativo é `C:\Users\vivic\Documents\Codex\AureaSolaris`.

Não usar `C:\AureaSolaris`: era caminho antigo em scripts. Não usar `C:\Users\vivic\Documents\Codex\2026-08-10\referenced-chatgpt-conversation-this-is-an\outputs\aurea-solaris`: era o protótipo web errado, fora do produto real.

## Fontes de verdade

1. `AGENTS.md` — regras e arquitetura.
2. `docs/CONSTITUICAO.md` — dados, precisão, Hermes e privacidade.
3. `docs/ROADMAP.md` — ordem de execução e estado.
4. `docs/ENGINE_CERTIFICATION_PLAN.md` — paridade com referências e gates.
5. `docs/EPHEMERIDES_AND_CALENDAR_PLAN.md` — efemérides visuais, Agenda e exportação/sincronização.
6. `docs/HERMES_MIND_ARCHITECTURE.md` — contrato canônico de memória e contradições do Hermes.
7. `docs/PHASE2_STORAGE_FOUNDATION.md` — estado real da fundação SQLite.
8. `docs/RELEASE_VALIDATION_2026-08-10.md` — pacote Windows e evidências de validação.
9. `src-tauri/migrations/` e `docs/data/DOMINIOS_DE_DADOS.md` — modelo de dados futuro.

## Arquitetura preservada

- Motor: fatos calculados antes da interpretação; recibo ou indisponibilidade, nunca fallback.
- Conhecimento: fontes, autores, escolas e divergências separados.
- Universo Pessoal: privado por pessoa e separado da base editorial.
- Caderno Vivo: lugar real de estudo; a antiga Escola virou porta para ele. Mesa espacial e página futura devem ler os mesmos objetos.
- Hermes: separa cálculo, regra, fonte, inferência e anotação; memória passa por proposta/revisão/aprovação.
- Tudo é Mente: a continuidade dos estudos pertence à pessoa. O esquema já existe, mas chat, Caderno e painel ainda precisam ser ligados ao banco antes de a memória ser anunciada como funcional.

## Estado atual

### Entregue

- Data manual `DD/MM/AAAA` e validação não destrutiva.
- Novos mapas exigem data, hora, local, latitude, longitude e fuso IANA.
- Sem posições natais, coordenadas ou fuso inventados em novos fluxos.
- Motor rejeita natal incompleto, resolve DST/fuso e gera recibo com hash/versões/parâmetros.
- Mandala exige recibo auditável e o mostra.
- O sidecar tem ponto de inicialização explícito; os cálculos usam a data UTC resolvida, inclusive em fusos que atravessam a meia-noite UTC.
- Velocidade ausente não é rotulada como “Lento”. “Feral” é regra Tradicional auditável, nunca um fato calculado, nunca aplicada ao Sol e só exibida com posições certificadas.
- Hermes não anuncia mapa inexistente como disponível.
- Caderno Vivo abre/cria estudos por tema ou a partir da Mandala.
- Scripts principais usam caminhos relativos.
- O release recompila o sidecar, empacota fusos IANA e gera o instalador NSIS de forma reproduzível.
- O instalador anterior foi aplicado em `work/install-test`; o motor instalado passou saúde e cálculo natal com recibo em uma validação técnica anterior. Uma nova geração ainda é necessária para levar a correção de inicialização do sidecar à instalação.
- A interface compilada foi validada visualmente nos fluxos sem dados, Caderno, Agenda e proveniência do Hermes.
- `private.sqlite` e `knowledge.sqlite` são inicializados pelo sidecar com migrações imutáveis, integridade e backup. Ainda não são a fonte de verdade das telas.
- A API local inicial de “Tudo é Mente” já abre/lista threads e registra/reabre mensagens isoladas por pessoa e tema. A interface Hermes ainda não usa essas threads, portanto memória contextual não deve ser anunciada como pronta.

### Ainda não concluído

- Certificação comparativa com Astro.com, Astro-Seek e Solar Fire.
- Confirmar manualmente a janela nativa do instalador em Windows normal; a captura desktop deste ambiente não funciona.
- Gerar e validar o pacote Windows com a correção da inicialização do sidecar e confirmar Mandala + Hermes na instalação.
- Migração segura dos domínios legados para SQLite e remoção posterior do `localStorage`.
- Conectar a memória “Tudo é Mente” ao Hermes, Caderno Vivo e painel de revisão/apagamento.
- Visão linear do Caderno sobre os mesmos objetos da mesa.
- Enciclopédia Visual e vertical completa planeta → conhecimento → Hermes → Caderno.

## Estado do motor

**Permitido:** “auditável em validação”.  
**Proibido ainda:** “equivalente/certificado como Astro.com, Astro-Seek ou Solar Fire”.

## Comandos de retomada

```powershell
cmd /c node_modules\.bin\tsc.cmd --noEmit
python -m py_compile astro_engine.py main_api.py
python test_transit.py
cargo check --manifest-path .\src-tauri\Cargo.toml
python tests/engine_reference/run_reference_checks.py
```

O build de produção usa o carregador alternativo do Vite e passou neste ambiente. O comando canônico do pacote Windows é:

```powershell
cmd /c build.bat
```

Ele recompila o motor isolado, copia o sidecar correto e gera o NSIS. Não substituir por um binário antigo em `src-tauri/binaries`.

## Próxima ação autorizada

Gerar e validar o Motor/Mandala no pacote instalado. Em seguida, migrar consentidamente o perfil para uma conta privada e conectar a conversa Hermes à API de threads por tema; só depois acrescentar proposta, revisão e remoção explícita de memórias. O plano de Efemérides/Agenda permanece aprovado, mas a persistência da Agenda só migra após essa base privada; a certificação C1 continua exigindo corpus de referência configurado e aprovado.
