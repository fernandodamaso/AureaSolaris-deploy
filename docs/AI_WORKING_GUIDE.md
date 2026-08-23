# AI Working Guide — Aurea Solaris

Este é o contexto operacional compacto para agentes. Não leia todo o repositório por padrão.

## Ordem de leitura

1. `AGENTS.md` — regras obrigatórias e fronteiras de segurança.
2. `docs/CONSTITUICAO.md` — decisões normativas de produto/dados.
3. Este guia — runtime, roteamento e validação atuais.
4. Somente o documento do domínio necessário.

Se houver conflito: segurança/privacidade → Constituição → `AGENTS.md` → este guia → referência de domínio.

## Runtime executável atual

A Private Web V1 é o único runtime ativo de aplicação:

- React/Vite: `apps/web`;
- FastAPI autenticada: `services/api`;
- Supabase: autenticação, persistência privada e RLS;
- motor/efemérides certificados: fronteira `services/api`.

O runtime desktop/local anterior foi removido. Menções em evidências históricas não são instruções de execução. A revisão documental abrangente pós-remoção pertence ao próximo item de documentação web-first.

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
| Corpus/import editorial | `knowledge/engenharia_astrologica/`, `tools/import_engenharia_to_aurea.py` |
| E2E local descartável | `tools/run_e2e.py`, `tools/e2e_api.py`, `apps/web/e2e/` |
| Preview/produção | `docs/operations/`, `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py` |

## CI e E2E

Os checks estáveis da CI são:

| Check | Contrato |
| --- | --- |
| `Frontend Quality` | lint, testes e build do workspace web |
| `Python Quality` | testes raiz ainda suportados: engine, importer, E2E helpers e verificadores |
| `E2E` | build Web V1 + Chromium + `python tools/run_e2e.py` em infraestrutura descartável |

A classificação em `.github/python-test-classification.txt` deve listar cada `tests/test_*.py` sobrevivente exatamente uma vez.

Para o gate integrado local:

```bash
python tools/run_e2e.py
```

O harness cria um projeto Supabase local descartável, identidade sintética, API e preview Vite em portas livres. Não usa o banco privado real da pessoa. Nunca redirecione o harness para dados pessoais reais para contornar falhas.

Para o gate completo do repositório, com Docker e Supabase CLI:

```bash
npm run quality:gate
```

## Vercel e ambientes hospedados

- Vercel Preview valida commits não mesclados; produção representa o estado promovido do deployment mirror.
- Validação privilegiada deve manter credenciais fora do código, logs e PRs.
- Não substitua prova de SHA/deployment por um alias sem proveniência.
- `scripts/verify_preview.sh` e os runbooks em `docs/operations/` são as referências para aceitação hospedada.
- O E2E local descartável complementa a validação hospedada; nenhum deles autoriza tocar dados pessoais reais.

## Loop obrigatório

1. Verifique refs/estado antes de alterar.
2. Leia o menor conjunto de arquivos necessário.
3. Faça uma mudança focada.
4. Atualize contrato/teste/documentação operacional afetada.
5. Rode o gate proporcional ao risco.
6. Revise o diff completo e procure segredos/stale references.
7. Registre commit, CI/deployment evidence e pendências reais.

Nunca invente valores astrológicos/fontes, versionar segredos, misturar dados privados e editoriais ou silenciar um erro de cálculo com fallback.

## Cálculos certificados

Todo cálculo deve preservar UTC, timezone IANA, localização, configuração, versão de motor/efeméride e hash de entrada. Um resultado só é certificado quando o recibo e os checks de referência relevantes são válidos.
