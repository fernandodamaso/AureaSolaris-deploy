# AI Working Guide — Aurea Solaris

Este é o contexto operacional compacto para agentes. Não leia todo o repositório por padrão.

## Ordem de leitura

1. `AGENTS.md` — regras obrigatórias e fronteiras de segurança.
2. `docs/CONSTITUICAO.md` — decisões normativas de produto/dados.
3. Este guia — runtime, roteamento e validação atuais.
4. Somente o documento do domínio necessário.

Se houver conflito: segurança/privacidade → Constituição → `AGENTS.md` → este guia → referência de domínio.

## Runtime executável atual

A **Private Web V1** é o único runtime ativo de aplicação:

- React/Vite: `apps/web`;
- FastAPI autenticada: `services/api`;
- Vercel: hospedagem dos projetos web e API;
- Supabase: Auth, Postgres e RLS dos dados privados;
- motor/efemérides certificados: fronteira `services/api`.

A Web V1 liberada cobre autenticação, perfil/onboarding, perfil natal persistido, Mandala/dashboard, cálculos natais e de trânsitos certificados e recibos persistidos.

Railway não faz parte da Web V1. O runtime desktop/local anterior foi aposentado; menções históricas não são instruções de execução. `tools/run_e2e.py` é infraestrutura descartável de teste, não um runtime local para uso da pessoa.

## Repositórios e promoção

`vivicabsb-eng/AureaSolaris` é a fonte de verdade de desenvolvimento. `fernandodamaso/AureaSolaris-deploy` é somente um espelho de implantação por SHA exato.

Não faça desenvolvimento no espelho. Uma diferença entre o `main` upstream e o `main` do espelho pode ser intencional quando o candidato ainda não foi promovido. Para validar produção, relacione explicitamente:

1. SHA atual do upstream;
2. SHA autorizado no espelho;
3. SHA registrado nos deployments Vercel web/API;
4. aliases canônicos e respostas de saúde.

## Roteamento de tarefas

| Tarefa | Comece aqui |
| --- | --- |
| React/telas/componentes | `apps/web/src/App.tsx`, `apps/web/src/components/` |
| Bootstrap/navegação | `apps/web/src/app/` |
| Auth | `apps/web/src/auth/` |
| Perfil/identidade | `apps/web/src/features/identity/`, `apps/web/src/profile/` |
| Agenda | `apps/web/src/features/agenda/` |
| Astrologia frontend | `apps/web/src/features/astrology/`, `apps/web/src/hooks/` |
| Cliente HTTP | `apps/web/src/api/` |
| Web API/auth/rotas | `services/api/src/aurea_api/` |
| Motor certificado | `services/api/src/aurea_api/domain/astrology/`, `services/api/ephe/` |
| Schema/RLS | `supabase/`, `docs/data/WEB_V1_SCHEMA.md` |
| Persistência/fronteiras | `docs/data-persistence.md`, `docs/data/DOMINIOS_DE_DADOS.md` |
| Corpus/import editorial | `knowledge/engenharia_astrologica/`, `tools/import_engenharia_to_aurea.py` |
| E2E local descartável | `tools/run_e2e.py`, `tools/e2e_api.py`, `apps/web/e2e/` |
| Preview/produção | `docs/operations/`, `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py` |
| Incidente/rollback | `docs/operations/INCIDENT_AND_ROLLBACK.md` |

## Dados e isolamento

O browser usa Supabase diretamente para autenticação. Operações privadas de perfil, dados de nascimento, recibos e cálculos passam pela API autenticada. A API deriva a identidade do token, faz queries owner-scoped e usa o Postgres da Web V1; RLS permanece como defesa adicional.

Conhecimento editorial e dados privados são domínios separados. Não copie dados pessoais para o corpus editorial nem trate artefatos editoriais como registros de uma conta.

Toda expansão multiusuário deve preservar `user_id`, owner scoping, RLS e relações que não atravessem proprietários. Mudanças nessa fronteira exigem prova com duas identidades sintéticas.

## CI e E2E

Os checks estáveis da CI incluem qualidade do frontend, qualidade/API, schema/RLS descartável e E2E Web V1. A classificação em `.github/python-test-classification.txt` deve listar cada `tests/test_*.py` sobrevivente exatamente uma vez.

Para o gate completo do repositório, com Docker e Supabase CLI:

```bash
npm run quality:gate
```

Para o browser E2E isolado:

```bash
python tools/run_e2e.py
```

O harness cria infraestrutura Supabase descartável, identidades sintéticas, API e preview Vite em portas livres. Nunca redirecione esse harness para dados pessoais reais ou bancos históricos para contornar uma falha.

## Vercel e ambientes hospedados

- Preview valida o candidato antes da promoção; produção representa o SHA atualmente promovido pelo deployment mirror.
- Web e API precisam apontar para candidatos compatíveis e para o ambiente Supabase correto.
- Validação privilegiada mantém credenciais fora de código, argumentos, logs e PRs.
- Não substitua prova de SHA/deployment por um alias sem proveniência.
- `scripts/verify_preview.sh` e os runbooks em `docs/operations/` são as referências para aceitação hospedada.
- Rollback e disablement seguem `docs/operations/INCIDENT_AND_ROLLBACK.md` e não incluem ações destrutivas sobre dados privados.

## Autonomia operacional

Dentro de um issue já aprovado, configuração rotineira de provedores, atualização exata do deployment mirror, deployments previstos, migrations aprovadas, PR review/fix loops e merge limpo após verificação devem ser executados sem gates humanos redundantes.

Interrompa apenas diante de ação destrutiva não aprovada, risco real a dados pessoais, necessidade de revelar/fornecer credencial, ambiguidade material de ambiente/identidade ou contradição factual entre provedores e contrato.

## Loop obrigatório

1. Verifique refs e estado dos provedores antes de alterar.
2. Leia o menor conjunto de arquivos necessário.
3. Faça uma mudança focada.
4. Atualize contrato/teste/documentação operacional afetada.
5. Rode o gate proporcional ao risco e corrija falhas reais.
6. Revise o diff completo e procure segredos/referências obsoletas.
7. Registre commit, CI/deployment evidence e pendências reais.

Nunca invente valores astrológicos/fontes, versionar segredos, misturar dados privados e editoriais ou silenciar um erro de cálculo com fallback.

## Cálculos certificados

Todo cálculo deve preservar UTC, timezone IANA, localização, configuração, versão de motor/efeméride e hash de entrada. Um resultado só é certificado quando o recibo e os checks de referência relevantes são válidos.