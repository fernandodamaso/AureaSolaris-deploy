# AGENTS.md — Aurea Solaris

Este arquivo orienta pessoas, IDEs e agentes de IA. Leia-o antes de alterar código, dados, documentação ou configuração. Em caso de conflito, prevalecem segurança e privacidade; depois [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md); depois este arquivo. Planos antigos, evidências históricas e telas existentes não redefinem o produto atual.

Para a rota operacional compacta, leia [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) depois deste arquivo e consulte apenas o domínio necessário.

## Produto e runtime atuais

A **Private Web V1** é o único runtime ativo da aplicação:

- interface React/Vite em `apps/web`;
- API autenticada FastAPI em `services/api`;
- Vercel hospeda os projetos web e API;
- Supabase fornece Auth, Postgres e RLS para dados privados da Web V1;
- o motor astrológico certificado e as efemérides ficam sob a fronteira da API.

O escopo liberado da Web V1 inclui autenticação, perfil/onboarding, perfil natal persistido, Mandala/dashboard, cálculos natais e de trânsitos certificados e seus recibos persistidos.

Railway não faz parte da Web V1. O antigo produto desktop/local, o empacotamento nativo e o armazenamento SQLite de produto foram aposentados como caminhos executáveis. Evidências históricas podem descrevê-los, mas nenhum código, comando, teste ou documentação operacional atual deve depender deles.

`tools/run_e2e.py` é infraestrutura de teste descartável. Ele não é um runtime local para uso da pessoa e nunca deve ser apontado para dados pessoais reais ou bancos históricos.

## Repositórios e deploy

- `vivicabsb-eng/AureaSolaris` é o repositório de desenvolvimento e a fonte de verdade do código.
- `fernandodamaso/AureaSolaris-deploy` é um espelho **somente de implantação**, atualizado apenas para um SHA exato já validado.
- Não desenvolva diretamente no espelho e não trate uma diferença entre os dois `main` como drift automático: ela pode representar uma promoção ainda não autorizada.
- Antes de promover ou aceitar uma implantação, prove separadamente o SHA upstream, o SHA autorizado no espelho, o SHA registrado pelo deployment Vercel, os aliases canônicos e a saúde de web/API.
- Runbooks atuais ficam em `docs/operations/`; incidentes e rollback ficam em [`docs/operations/INCIDENT_AND_ROLLBACK.md`](docs/operations/INCIDENT_AND_ROLLBACK.md).

FDM-695 definiu autonomia operacional: dentro de um issue/contrato já aprovado, configuração rotineira de provedores, atualização exata do espelho, deployments previstos, migrations aprovadas, ciclos de review/fix de PR e merge limpo após verificação não devem ganhar gates humanos artificiais. Pare e peça decisão humana apenas diante de ação destrutiva não aprovada, risco real a dados pessoais, necessidade de revelar/fornecer credencial, ambiguidade material de identidade/ambiente ou contradição entre o estado real dos provedores e o contrato.

## Dados e limites de confiança

1. **Conhecimento editorial astrológico** — conteúdo impessoal: documentos, fontes, citações, conceitos, claims, tradições, relações, versões e artefatos editoriais. Deve preservar proveniência e divergências.
2. **Dados privados por pessoa** — perfil, dados de nascimento, recibos de cálculo e demais registros privados do produto. Na Web V1, ficam no Supabase/Postgres e são sempre owner-scoped.

Não misture dados privados ao corpus editorial. Não apague ou deduplique conteúdo editorial sem preservar origem e decisão de revisão.

A identidade de proprietário vem do token autenticado validado pela API e das políticas RLS, nunca de um `owner_id` arbitrário enviado pelo cliente. Toda expansão multiusuário preserva essa regra, queries owner-scoped, RLS em tabelas privadas e relações que não atravessem proprietários.

## Regras inegociáveis

- **Precisão astrológica:** cálculos registram UTC, fuso IANA, local, zodíaco, ayanamsa quando aplicável, sistema de casas, orbes, pontos, versão de efeméride/motor e hash de entrada. Sem fallback silencioso. Mudanças do motor exigem testes de referência e relatório de diferenças.
- **Privacidade:** nunca versionar senha, chave de API, token, JWT, cookie, segredo de banco ou credencial de provedor. Não registrar valores de autorização nem corpos privados em logs.
- **Isolamento:** dados privados são owner-scoped na API e protegidos também por RLS. Credenciais privilegiadas do servidor não entram no navegador.
- **Saúde:** anexos e exames, quando fizerem parte de escopos futuros, permanecem privados e só são processados após ação explícita. Astrologia médica é estudo/observação, nunca diagnóstico ou prescrição.
- **Ações revisáveis:** Hermes não cria memória, tarefa, evento, interpretação permanente ou ação externa silenciosamente.
- **Dados históricos locais:** nunca inspecionar, semear, migrar, apagar ou alterar diretórios, bancos SQLite ou backups reais de uma pessoa fora de um contrato explícito e separado de migração de dados.

## Forma de trabalhar no repositório

- Trate o repositório aberto como unidade de trabalho. Use caminhos relativos; não codifique caminhos pessoais de máquina.
- Antes de alterações amplas, examine Git/refs e preserve mudanças existentes. Não use reset/checkout destrutivo nem force refs para trás.
- Faça mudanças pequenas, testáveis e documentadas. Não misture trabalho de produto não relacionado.
- Não use `npm audit fix --force` nem atualizações de dependência em massa sem revisão.
- Para mudanças no Web V1, valide frontend, API, contratos gerados, schema/RLS e E2E proporcionalmente ao risco.
- Antes de concluir, confira o diff completo, arquivos adicionados/removidos, CI e pendências reais. Todo arquivo intencional deve estar commitado.
- Nunca invente conclusão de teste, fonte, cálculo, SHA ou estado de provedor.

## Mapa de código atual

| Área | Pontos de entrada |
| --- | --- |
| Composição React | `apps/web/src/app/AppProviders.tsx`, `apps/web/src/App.tsx` |
| Interface/componentes | `apps/web/src/components/` |
| Autenticação | `apps/web/src/auth/` |
| Identidade/perfil | `apps/web/src/features/identity/`, `apps/web/src/profile/` |
| Agenda | `apps/web/src/features/agenda/` |
| Astrologia no frontend | `apps/web/src/features/astrology/`, `apps/web/src/hooks/` |
| Cliente HTTP | `apps/web/src/api/` |
| Web API | `services/api/src/aurea_api/`, `services/api/api/index.py` |
| Motor certificado | `services/api/src/aurea_api/domain/astrology/`, `services/api/ephe/` |
| Schema/RLS | `supabase/migrations/`, `supabase/tests/` |
| Corpus editorial | `knowledge/engenharia_astrologica/` |
| E2E descartável | `tools/run_e2e.py`, `tools/e2e_api.py`, `apps/web/e2e/` |
| Operações/deploy | `docs/operations/`, `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py` |

Os arquivos raiz `astro_engine.py` e `engine_governance.py` são imports finos de compatibilidade para contratos de cálculo/transição; não são runtime de aplicação.

## Comandos usuais

Execute a partir da raiz:

```bash
npm ci
npm run check:web
python -m pip install -e "./services/api[dev]"
python -m pip install -r knowledge/engenharia_astrologica/requirements.txt
python -m pytest services/api/tests -q
```

Com Docker e Supabase CLI:

```bash
npm run quality:gate
python tools/run_e2e.py
```

O E2E cria infraestrutura descartável e identidades sintéticas. Não altere essa fronteira para fazer um teste passar.

## Comunicação de agentes

Informe de forma breve: objetivo, arquivos afetados, risco para dados, validação, commit/PR e pendências reais. Para operações hospedadas, registre somente evidência sanitizada como IDs, aliases, estados, contagens e SHAs; nunca valores secretos.