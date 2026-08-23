# Domínios de dados: conhecimento editorial e vida privada

> Status: contrato atual da Private Web V1. Este documento não autoriza migração, inspeção ou alteração de dados locais históricos.

## Decisão fundamental

O Aurea Solaris mantém **dois domínios de confiança**, com finalidades e regras de acesso diferentes:

| Domínio | Fonte de verdade atual | Pode conter | Não pode conter |
| --- | --- | --- | --- |
| Conhecimento astrológico editorial | Corpus governado no repositório + snapshot editorial empacotado para a API | Fontes, documentos, conceitos, claims, escolas/tradições, relações, citações, hashes, versões e decisões de revisão | Senhas, tokens, perfis, dados natais privados, recibos privados ou conteúdo pessoal |
| Dados privados da Web V1 | Supabase Auth + Postgres + RLS, acessados pela API autenticada | Perfil, dados de nascimento, recibos de cálculo e demais registros privados aprovados pelo produto | Credenciais privilegiadas, segredos em texto, cópia indiscriminada do corpus editorial |

Essa separação traduz a regra do produto: **astrologia editorial é conhecimento impessoal, plural e verificável; os dados e a vivência pertencem à pessoa autenticada**.

## Domínio privado Web V1

A identidade nasce no Supabase Auth. O navegador usa essa identidade para chamar FastAPI; a API valida o token, deriva o proprietário e executa operações owner-scoped no Postgres.

A proteção é deliberadamente redundante:

1. a API nunca confia em um `owner_id` arbitrário fornecido pelo cliente;
2. cada tabela privada possui `user_id` associado ao usuário autenticado;
3. repositories filtram leituras/gravações pelo proprietário;
4. RLS limita leitura e escrita a `auth.uid() = user_id`;
5. relações entre registros privados preservam o mesmo proprietário;
6. credenciais de servidor não são entregues ao browser.

O schema atual está em [`WEB_V1_SCHEMA.md`](WEB_V1_SCHEMA.md) e cobre `profiles`, `birth_profiles` e `calculation_receipts`.

## Escopo privado atual

Na Private Web V1, o domínio privado sustenta:

- autenticação e identidade de conta;
- perfil/onboarding;
- perfil natal persistido;
- Mandala/dashboard que usa o perfil persistido;
- recibos owner-scoped para cálculos natais e de trânsitos certificados.

Recursos privados futuros — por exemplo notas, diário, agenda, memória aprovada do Hermes ou anexos — devem entrar sob a mesma fronteira de propriedade. Eles não são implicitamente parte do schema atual só porque aparecem em visão de produto ou documentação histórica.

## Expansão multiusuário

A arquitetura não depende de existir apenas uma conta. Mais usuários preservam as mesmas invariantes:

- cada registro privado continua tendo um único proprietário autenticado;
- queries continuam owner-scoped;
- RLS continua habilitado e fail-closed;
- relações entre tabelas não podem atravessar proprietários;
- testes usam duas ou mais identidades sintéticas para provar que A não lê, altera nem referencia registros de B.

Nunca crie um proprietário global compartilhado como atalho para escala.

## Domínio editorial

O corpus da Engenharia Astrológica permanece orientado a proveniência. Cada claim relevante preserva fonte, tradição/escola, variante, contexto, revisão e relação com afirmações compatíveis ou divergentes.

O contrato normativo instalado em [`../astrology-knowledge-contract.md`](../astrology-knowledge-contract.md) e em [`knowledge_contract_aurea_solaris.yaml`](knowledge_contract_aurea_solaris.yaml) define como o acervo pode virar regra computável sem apagar divergências.

O procedimento operacional de sincronização editorial está em [`ENGENHARIA_SYNC_PLAYBOOK.md`](ENGENHARIA_SYNC_PLAYBOOK.md), com o modelo de manifesto em [`engenharia_import_manifest_template.yaml`](engenharia_import_manifest_template.yaml).

O snapshot editorial empacotado pela API é uma representação governada desse domínio para consulta/execução. Ele não é o banco privado da aplicação e não recebe dados de uma pessoa usuária.

## Cálculo e proveniência

O motor certificado mantém uma terceira responsabilidade lógica: transformar entradas privadas autorizadas em resultados astrológicos reproduzíveis sem modificar o conhecimento editorial. Cada recibo privado registra os metadados de cálculo necessários — configuração, motor/efeméride, instante/fuso e hash de entrada — e permanece propriedade da pessoa que solicitou o cálculo.

O fato de um cálculo usar conhecimento/efemérides compartilhados não torna os inputs ou resultados privados parte do corpus editorial.

## Dados históricos locais

O produto desktop/local e sua persistência foram aposentados. Bancos, backups ou diretórios reais que ainda existam em máquinas de pessoas são **dados históricos privados**, não fonte de verdade da Web V1 e não material de teste.

Agentes, CI, E2E, deployments e runbooks atuais não devem inspecionar, semear, limpar, migrar ou alterar esses dados. Uma eventual migração para Web V1 exige um issue/contrato separado com consentimento, owner mapping, backup verificável, validação, rollback e regras explícitas de segredo/dados.

## Infraestrutura de teste

`tools/run_e2e.py` cria um ambiente local descartável com Supabase, identidades sintéticas, API e browser test. Ele existe para provar os contratos da Web V1 sem tocar dados privados reais.

A infraestrutura descartável não cria um segundo runtime de produto nem uma segunda fonte de verdade.

## Operações e recuperação

- Deploy de aplicação usa Vercel; Railway não faz parte da Web V1.
- Configuração de Auth/Postgres/RLS usa Supabase e migrations versionadas.
- Rollback de aplicação restaura web/API compatíveis e não executa rollback destrutivo de dados.
- Rotação de segredos acontece nos cofres/ambientes dos provedores, sem registrar valores em Git, logs ou tickets.

Referências: [`../operations/SUPABASE_RUNBOOK.md`](../operations/SUPABASE_RUNBOOK.md) e [`../operations/INCIDENT_AND_ROLLBACK.md`](../operations/INCIDENT_AND_ROLLBACK.md).