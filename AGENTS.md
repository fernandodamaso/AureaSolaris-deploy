# AGENTS.md — Aurea Solaris

Este arquivo orienta pessoas, IDEs e agentes de IA. Leia-o antes de alterar código, dados, documentação ou configuração. Em caso de conflito, prevalecem segurança e privacidade; depois [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md); depois este arquivo. Planos antigos e telas existentes não definem o produto.

Para a rota operacional compacta, leia [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) depois deste arquivo e consulte apenas o domínio necessário.

## Propósito e runtime atual

O Aurea Solaris é um ambiente privado para estudo astrológico, organização pessoal e reflexão. A implementação executável atual da Private Web V1 é:

- interface React/Vite em `apps/web`;
- API autenticada FastAPI em `services/api`;
- autenticação, dados privados e isolamento por proprietário em Supabase;
- motor astrológico certificado e efemérides sob a fronteira da API.

O antigo produto desktop/local foi aposentado. Registros históricos podem descrevê-lo, mas nenhum código novo, comando, teste ou documentação operacional atual deve depender dele. A normalização documental mais ampla pós-remoção pertence ao trabalho seguinte de documentação web-first.

O Caderno Vivo mantém a ideia de quadro visual e caderno como visões relacionadas. A Enciclopédia Visual incorpora o acervo da Engenharia Astrológica como referência interna e preserva fontes, escolas, divergências e versões. Finanças continua fora do escopo atual.

**Axioma editorial:** rigor significa atribuição e contexto, não higienização. Nenhuma fonte, citação, genealogia ou cálculo pode ser inventado.

## Dados e limites de confiança

1. **Conhecimento editorial astrológico** — conteúdo impessoal: documentos, fontes, citações, conceitos, claims, tradições, relações, versões e artefatos editoriais. Deve preservar proveniência e divergências.
2. **Dados privados por pessoa** — perfis, dados de nascimento, recibos de cálculo e demais registros privados do produto. Na Web V1, esses registros ficam no domínio privado autenticado e são sempre owner-scoped.

Não misture dados privados ao corpus editorial. Não apague ou deduplique conteúdo editorial sem preservar origem e decisão de revisão.

## Regras inegociáveis

- **Precisão astrológica:** cálculos registram UTC, fuso IANA, local, zodíaco, ayanamsa quando aplicável, sistema de casas, orbes, pontos, versão de efeméride/motor e hash de entrada. Sem fallback silencioso. Mudanças do motor exigem testes de referência e relatório de diferenças.
- **Privacidade:** nunca versionar senha, chave de API, token, JWT, cookie, segredo de banco ou credencial de provedor. Não registrar valores de autorização nem corpos privados em logs.
- **Isolamento:** identidade de proprietário vem do token autenticado e das políticas RLS, nunca de um `owner_id` arbitrário enviado pelo cliente.
- **Saúde:** anexos e exames são privados e só são processados após ação explícita. Astrologia médica é estudo/observação, nunca diagnóstico ou prescrição.
- **Ações revisáveis:** Hermes não cria memória, tarefa, evento, interpretação permanente ou ação externa silenciosamente.
- **Dados locais históricos:** nunca inspecionar, semear, migrar, apagar ou alterar diretórios, bancos SQLite ou backups reais de uma pessoa fora do repositório. FDM-734 é exclusivamente uma remoção Git-tracked.

## Forma de trabalhar no repositório

- Trate o repositório aberto como unidade de trabalho. Use caminhos relativos; não codifique caminhos pessoais de máquina.
- Antes de alterações amplas, examine Git/refs e preserve mudanças existentes. Não use reset/checkout destrutivo nem force refs para trás.
- Faça mudanças pequenas, testáveis e documentadas. Não misture trabalho de produto não relacionado.
- Não use `npm audit fix --force` nem atualizações de dependência em massa sem revisão.
- Para mudanças no Web V1, valide frontend, API, contratos gerados, schema/RLS e E2E proporcionalmente ao risco.
- Antes de concluir, confira o diff completo, arquivos adicionados/removidos, CI e pendências reais. Todo arquivo intencional deve estar commitado.
- Peça autorização antes de ações externas/destrutivas não cobertas pelo escopo já aprovado. Nunca invente conclusão de teste, fonte ou cálculo.

## Mapa de código atual

| Área | Pontos de entrada |
| --- | --- |
| Composição React | `apps/web/src/app/AppProviders.tsx`, `apps/web/src/App.tsx` |
| Interface/componentes | `apps/web/src/components/` |
| Autenticação | `apps/web/src/auth/` |
| Identidade/perfil | `apps/web/src/features/identity/`, `apps/web/src/profile/` |
| Agenda | `apps/web/src/features/agenda/` |
| Astrologia no frontend | `apps/web/src/features/astrology/`, `apps/web/src/hooks/` |
| Web API | `services/api/src/aurea_api/`, `services/api/api/index.py` |
| Motor certificado | `services/api/src/aurea_api/domain/astrology/`, `services/api/ephe/` |
| Schema/RLS | `supabase/migrations/`, `supabase/tests/` |
| Corpus editorial | `knowledge/engenharia_astrologica/` |
| E2E descartável | `tools/run_e2e.py`, `tools/e2e_api.py`, `apps/web/e2e/` |
| Operações/deploy | `docs/operations/`, `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py` |

Os arquivos raiz `astro_engine.py` e `engine_governance.py` são imports finos de compatibilidade para contratos de cálculo/transição; não são um runtime de aplicação.

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

`tools/run_e2e.py` cria infraestrutura descartável e recusa o caminho histórico de dados pessoais quando consegue resolvê-lo. Não altere esse limite de segurança para fazer um teste passar.

## Comunicação de agentes

Informe de forma breve: objetivo, arquivos afetados, risco para dados, validação, commit e pendências. Explique decisões e erros em linguagem clara. Nunca presuma que a pessoa responsável precisa diagnosticar logs brutos sozinha.
