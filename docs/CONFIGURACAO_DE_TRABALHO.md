# Configuração de trabalho — Aurea Solaris

Este documento define a configuração recomendada para desenvolver e manter a **Private Web V1** sem confundir ferramentas locais de engenharia com o produto final hospedado.

## Decisão atual

O Aurea Solaris é web-first:

- React/Vite em `apps/web`;
- FastAPI autenticada em `services/api`;
- Vercel hospeda web e API;
- Supabase fornece Auth, Postgres e RLS;
- Railway não faz parte da Web V1.

O antigo produto desktop/local e seu empacotamento nativo estão aposentados. Não reinstale toolchains nativos ou reintroduza caminhos de execução históricos apenas porque aparecem em commits ou documentos antigos.

## Repositórios

- Trabalhe em `vivicabsb-eng/AureaSolaris`, fonte de verdade para desenvolvimento, branches, PRs, CI e merges.
- `fernandodamaso/AureaSolaris-deploy` é somente espelho de implantação por SHA exato; não use como checkout de desenvolvimento.
- Uma promoção acontece apenas quando um issue/contrato autoriza mover o espelho para um SHA previamente validado.
- Se upstream e espelho diferirem porque a promoção ainda não aconteceu, preserve essa diferença até existir autorização explícita de deploy.

## Ferramentas locais

A configuração mínima de engenharia é independente do sistema operacional, desde que as versões e comandos do repositório funcionem:

- Node.js 22 + npm para o frontend;
- Python 3.12 para a API, validações e ferramentas;
- Docker + Supabase CLI para schema/RLS e E2E descartável;
- Git para histórico, branches e recuperação;
- um editor/IDE ou coding agent com acesso somente ao workspace necessário.

Ferramentas locais são auxiliares. Elas não alteram o fato de que a aplicação liberada roda em Vercel/Supabase.

## Bootstrap

Na raiz do repositório:

```bash
npm ci
python -m pip install -e "./services/api[dev]"
python -m pip install -r knowledge/engenharia_astrologica/requirements.txt
```

Para frontend local:

```bash
npm run dev:web
```

Para o gate completo, com Docker e Supabase CLI:

```bash
npm run quality:gate
```

Para E2E isolado:

```bash
python tools/run_e2e.py
```

O E2E cria infraestrutura e identidades sintéticas descartáveis. Não use dados pessoais reais, bancos históricos, backups ou credenciais de produção como conveniência de teste.

## Configuração de ambientes e segredos

- Variáveis públicas do browser usam somente o contrato `VITE_*` documentado em `.env.example`.
- Credenciais do banco e outros segredos permanecem server-side e nos mecanismos seguros dos provedores.
- Não grave segredos em Git, comandos compartilhados, screenshots, logs, Linear, PRs ou documentação.
- Preview e produção têm fronteiras separadas; não copie configuração sensível de um ambiente para o outro.

Runbook: [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md).

## Como usar agentes

Agentes podem planejar, editar, testar, revisar, operar provedores e concluir o ciclo Git dentro do issue aprovado. O contrato FDM-695 evita gates humanos redundantes para:

- configuração rotineira de provedores;
- promoção do deployment mirror para um SHA exato aprovado;
- deployments previstos pelo issue;
- migrations já aprovadas pelo contrato;
- review/fix loops de PR;
- merge limpo após validação final.

Essa autonomia não autoriza ação destrutiva fora do escopo, manipulação de dados reais, revelação/provisionamento de credenciais pelo chat, escolha ambígua de identidade/ambiente ou continuação quando o estado real do provedor contradiz o contrato.

## Regras de acesso

1. Abra somente o workspace/repositório necessário ao trabalho.
2. Preserve mudanças existentes e confirme refs antes de mutações Git/provedor.
3. Mantenha `.env`, dados privados, backups e tokens fora do Git.
4. Use dados e identidades sintéticas para testes automatizados.
5. Revise o diff completo e resultados de CI antes do merge.
6. Para produção, prove SHA upstream, SHA do espelho, SHA do deployment, aliases e saúde; não confie apenas no nome de uma branch ou domínio.

## Recuperação

Incidentes de aplicação seguem [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md). Rollback de web/API deve restaurar uma combinação conhecida e compatível sem executar ações destrutivas sobre dados privados. Segredos comprometidos são rotacionados/revogados no provedor; aplicação pode ser temporariamente desabilitada por controles do provedor até a recuperação ser verificada.