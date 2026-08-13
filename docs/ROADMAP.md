# Roadmap de Implementação — Aurea Solaris

Este é o roteiro canônico de construção. Ele une a Constituição, a auditoria dos dois projetos e o mapa de implementação do produto. Em conflito com planos antigos, este documento e a Constituição prevalecem.

## Regra de ordem

Não construir o produto horizontalmente como telas e protótipos isolados. Construir verticais completas, úteis, verificáveis e persistentes.

Motor verificado → fato matemático → conhecimento com fonte → Hermes com contexto → anotação revisável → Caderno Vivo → reabertura idêntica.

O Motor fornece fatos calculados e versionados. A Enciclopédia fornece fontes, escolas, divergências e regras. Hermes fornece linguagem, raciocínio e propostas revisáveis. O Caderno Vivo preserva o estudo e seus links. O Universo Pessoal guarda dados privados por pessoa.

Isso impede o erro central: IA inventar cálculo e interpretar uma invenção.

## Estado atual

- O instalador Windows NSIS foi regenerado em 10/08/2026 com o motor isolado, reinstalado em uma pasta de teste e validado por cálculo real; a inspeção visual direta da janela desktop ainda precisa ser confirmada fora da limitação de captura deste ambiente.
- O Motor passou a exigir data, hora, coordenadas e fuso IANA para um mapa natal, e devolve um recibo com entrada canonizada, hash, UTC, parâmetros e versões; a certificação por casos de referência ainda é pendência.
- O login local não usa mais senha em texto aberto; Argon2id, sessão, recuperação e cofre ainda são pendências.
- `private.sqlite` e `knowledge.sqlite` já são criados no runtime com migrações verificadas e backup. O HermesChat já abre/reabre um fio por pessoa, persiste mensagens classificadas e recupera o contexto; telas legadas de Mesa/Diário/agenda ainda não foram migradas.
- A antiga área vazia de “Escola de Astrologia” foi substituída por uma entrada explícita para o Caderno Vivo; Mesa e página ainda não são duas visões do mesmo objeto.
- Os novos fluxos de perfil, conexão, mapa e contexto global não criam posições, coordenadas, fuso ou mapa natal fictícios. Registros legados incompletos permanecem indisponíveis até serem completados.

## Plano operacional — ordem obrigatória

Esta sequência prevalece sobre a numeração histórica das fases abaixo. As fases seguintes descrevem a arquitetura-alvo; o trabalho só avança quando os critérios de aceite da etapa ativa forem atendidos.

### Escopo ativo — acesso `local-owner` no Chrome

**Objetivo:** abrir o aplicativo local no Chrome sem tela de login, preservando o proprietário privado correto, dados isolados por `owner_id` e um modo explícito de compatibilidade com senha.

**Em escopo (plano `docs/superpowers/plans/2026-08-12-skip-login-local-owner.md`):** modo padrão `local-owner`; resolução fail-closed de um único proprietário habilitado; token de sessão de vida do processo da API; `AUREA_REQUIRE_LOGIN=1` para `require-login`; fronteira de requisição loopback; boot tipado no frontend.

**Fora deste escopo (trabalho futuro separado, não implementado):** cadastro de senha para proprietário criado automaticamente sem senha; recuperação ou redefinição de senha; seleção ou alternância entre múltiplos proprietários; migração, renomeação ou adoção automática de dados órfãos.

### Etapa 1 — Estabilizar a experiência Chrome

**Objetivo:** a experiência no Chrome só mostra o que foi informado, calculado ou explicitamente indisponível.

1. Padronizar os campos de data em `DD/MM/AAAA`, sem autoformatação destrutiva e com validação ao sair do campo/salvar.
2. Remover valores natais, coordenadas, fuso e dados de perfil fictícios dos caminhos de criação, carregamento, conexão e contexto do Hermes.
3. Impedir qualquer cálculo de mapa quando faltarem data, hora, local, coordenadas e fuso IANA confirmados; mostrar o motivo e a ação de correção.
4. Definir a hierarquia de superfícies: modal acima do conteúdo, Hermes abre por ação explícita e Caderno Vivo é uma superfície própria, aberta a partir de mapa, tema ou pergunta — nunca um painel que apareça sem causa.
5. Padronizar estados de interação: repouso, hover, foco, ativo, carregando, sucesso, indisponível e erro.
6. Rodar verificação TypeScript, testes e build da aplicação web local; validar manualmente no Chrome.

**Critérios de aceite:** digitar uma data incompleta não muda seu conteúdo; perfil sem nascimento não produz mapa; conexão sem local, coordenadas ou fuso confirmados não ganha valores-padrão; o mapa renderizado apresenta a origem técnica; Caderno e Hermes têm abertura/fechamento previsíveis; o Chrome usa o mesmo comportamento.

**Concluída em 11/08:** os fluxos sem dados natais fictícios, recibo auditável do motor, estados básicos de interação e passagem da tela falsa de estudo para o Caderno Vivo foram verificados. Hermes agora usa um provedor selecionado e consentido, sem depender nem sondar Ollama. O produto canônico é o site local no Chrome; instaladores não são critério de aceite desta etapa.

### Etapa 2 — Fundação de segurança e dados

**Estado:** em fechamento. A base privada já usa Argon2id no servidor local, sessões locais protegidas e isolamento por `owner_id`; a migração do conteúdo legado permanece explícita e reversível.

1. Criar `knowledge.sqlite` e `private.sqlite` a partir das migrações aprovadas, sem migrar ou apagar dados legados automaticamente.
2. Criar backup verificável e relatório de contagens antes de importar perfis, mapas, Mesa, Diário, agenda e arquivos privados.
3. Concluir autenticação local com Argon2id, sessão, logout e recuperação segura; guardar integrações apenas por `secret_ref` no cofre local.
4. Isolar cada registro privado por `owner_id`; remover segredos e dados privados de `localStorage`, prompts, logs e repositório.
5. Implementar “Tudo é Mente”: histórico de estudo durável, memória contextual com evidências, retomada por pessoa/tema, revisão/apagamento pela pessoa e alertas de contradição citados contra a Engenharia Astrológica.

**Critérios de aceite:** migração pode ser desfeita a partir do backup; nenhum segredo entra nos dois bancos em texto; consultas privadas não atravessam o proprietário; memórias podem ser inspecionadas, corrigidas e retiradas da recuperação; contradições sempre indicam afirmação, fonte e escola.

**Incremento entregue:** `local_storage.py` cria as duas bases, aplica migrações imutáveis, verifica integridade, recusa checksums alterados/versões futuras e faz backup antes de atualizar o esquema. Novas contas do banco privado são protegidas por Argon2id; login e rotas privadas exigem sessão local. A migração privada `0005_hermes_mind.sql` acrescenta conversas, proveniência de mensagens, evidências de memória, contexto e revisão de contradições com isolamento por `owner_id`. A API local abre/lista/registra/reabre mensagens por pessoa/tema e permite propor, aprovar, revogar ou esquecer memórias com evidência. O HermesChat e a tela Memórias já usam esse contrato. Antes de encerrar a etapa faltam o cofre de tokens por `secret_ref`, a migração explícita de Mesa/Diário/Agenda e o avaliador de contradições citado contra a Engenharia. Contrato operacional em `docs/data-persistence.md`, `docs/HERMES_MIND_ARCHITECTURE.md` e `docs/HERMES_MIND_API.md`.

### Etapa 3 — Motor astrológico certificado

**Objetivo de produto:** alcançar paridade verificável com Astro.com, Astro-Seek e Solar Fire quando a entrada e a configuração forem equivalentes. O motor não pode reivindicar esse patamar antes de passar o protocolo em `docs/ENGINE_CERTIFICATION_PLAN.md`.

1. Fixar efemérides, versão do motor, sistema de casas, zodíaco, ayanamsa quando aplicável, orbes e pontos habilitados.
2. Registrar UTC, fuso IANA, coordenadas, parâmetros, saída e hash de entrada em cada cálculo.
3. Criar casos de referência e relatório de diferenças; bloquear a apresentação de resultado se o motor não responder com proveniência completa.

**Critérios de aceite:** os casos de referência passam, a interface mostra a trilha do cálculo e não há cálculo aproximado silencioso.

**Andamento em 11/08:** C0 está implementado: recibo, UTC, fuso IANA, coordenadas, casas e parâmetros são obrigatórios e rastreáveis. C1 foi iniciado com schema e runner que recusam certificar resultados sem referência aprovada. A próxima ação depende de exportações autorizadas e configuradas de Astro.com, Astro-Seek ou Solar Fire; o sistema não inventará esses valores nem fará scraping autenticado.

### Etapa 4 — Alpha 1: estudar um planeta

Pessoa → nascimento confirmado → mapa certificado → planeta/casa/aspecto selecionado → fato matemático → fontes/escolas → Hermes com citações → “Anotar isto” → nó ligado no Caderno Vivo → reabrir igual.

**Critérios de aceite:** cálculo, regra interpretativa, fonte, inferência Hermes e anotação pessoal permanecem visualmente distintos e rastreáveis.

### Etapa 5 — Caderno Vivo

Mesa e página passam a ser duas visões dos mesmos itens: cartões, notas, checklist, imagens, arquivos, referências, respostas Hermes e relações. Cada objeto pode ser aberto, revisado, desfeito, exportado e reencontrado.

### Etapa 6 — Enciclopédia Visual

Importar a Engenharia Astrológica por manifesto, preservando variantes, autores, escolas, fontes, divergências, hashes e documentos brutos. Oferecer busca por conceito, autor, escola e fonte sem apagar leituras divergentes.

### Etapa 7 — Agenda, trânsitos, saúde e Hermes pessoal

Somente depois da base anterior: efemérides visuais, janelas astrológicas, agenda privada, tarefas, exportação seletiva de eventos, saúde como estudo, biblioteca pessoal e memórias do Hermes propostas/revisáveis/aprovadas.

Ordem interna aprovada para tempo e calendário:

1. Consulta visual de efemérides calculadas pelo Motor, sem persistir automaticamente.
2. Agenda local em `private.sqlite` como fonte de verdade por pessoa.
3. Ação explícita “Salvar na agenda” para promover somente eventos escolhidos.
4. Exportação seletiva `.ics`, com prévia e sem dados natais ou notas privadas por padrão.
5. Importação externa somente leitura; escrita e sincronização bidirecional apenas depois de cofre, consentimento, idempotência, conflitos e exclusões estarem resolvidos.

Contrato completo: `docs/EPHEMERIDES_AND_CALENDAR_PLAN.md`.

> As seções “Fase 0” a “Fase 6” abaixo detalham a arquitetura de cada domínio e não substituem esta ordem operacional.

## Fase 0 — Fundação confiável

Objetivo: construir sem insegurança ou ambiguidade de dados.

1. Congelar e registrar o estado atual no Git; preservar Engenharia Astrológica como fonte durante a migração.
2. Implementar SQLite local com migrações imutáveis: base editorial e base privada por pessoa, owner_id, relações, auditoria, backup e exportação.
3. Concluir login local: Argon2id, sessão, cofre local para tokens por secret_ref e redefinição de senha segura.
4. Retirar dados pessoais, tokens e caminhos fixos de localStorage, prompts, Git e UI.
5. Fechar permissões Tauri, CSP, acesso a arquivos e logs; definir retenção de anexos de saúde e biblioteca pessoal.
6. Criar o design system mínimo usado pelas telas reais: botão, entrada, seleção, abas, painel, modal, toast, tooltip, painel redimensionável e tokens visuais.

Não fazer ainda: nuvem, mobile, Gmail, finanças, múltiplas integrações e automação externa.

## Fase 1 — Motor astrológico certificado

Objetivo: fatos reproduzíveis, nunca estimativas silenciosas.

- Fixar efemérides, versão do motor, casas, zodíaco, ayanamsa quando aplicável, orbes e pontos habilitados.
- Registrar UTC, fuso IANA, coordenadas, entrada, saída e hash de cálculo.
- Calcular posições, casas, ângulos, aspectos, velocidade, retrogradação, aplicativo/separativo, dignidades e pontos adicionais com filtros explícitos.
- Sem fallback impreciso para mapa natal: se o motor falhar, mostrar erro e não desenhar mapa.
- Criar testes de referência contra resultados documentados de ferramentas confiáveis e relatório de diferenças.
- Corrigir a falha reproduzida de corpos secundários.

Pronto quando: entradas incompletas não geram mandala, os casos de referência passam e todo resultado explica como foi calculado.

## Fase 2 — Vertical 01: estudar um planeta (Alpha 1)

Esta é a primeira entrega realmente utilizável.

Pessoa → dados confirmados → mapa natal certificado → clique em planeta/casa/aspecto → fatos matemáticos → fontes e escolas relacionadas → Hermes explica com contexto → Anotar isto → nó no Caderno Vivo com backlink → salvar e reabrir.

Entregas:

- cadastro de pessoa, nascimento e mapa versionado;
- mandala interativa: signos, casas, planetas, ângulos, aspectos, tooltip, seleção, detalhe e filtros;
- objeto selecionado único para toda interface;
- fatos astrológicos separados de conhecimento interpretativo;
- Hermes V1 com contexto estruturado, fontes, incerteza e proposta de anotação;
- Caderno Vivo V1: texto, nota, cartão, imagem, conexão, grupo, pan/zoom, desfazer/refazer e persistência;
- visual espacial e visual linear como duas visões da mesma entidade.

Fora do Alpha 1: agenda preditiva, saúde avançada, sinastia, revoluções, progressões, publicação, integrações externas e memória autônoma de Hermes.

## Fase 3 — Enciclopédia Visual e pesquisa

1. Importar Engenharia Astrológica por cópia e manifesto: YAML, Markdown, variantes, templates e documentos do_not_delete.
2. Preservar documento bruto, origem, hash, versão, autor, fonte, escola, citação, incerteza, concordância e contradição.
3. Criar busca por conceitos, autores, escolas e fontes; preferências pessoais filtram sem apagar o acervo.
4. Vertical 04: busca → conceito → autores/escolas/divergências → mapa relacionado → Hermes com citações → Caderno Vivo.

## Fase 4 — Verticais de estudo e tempo

- Vertical 02: mapa → aspecto → cálculo → fontes → Hermes → caderno.
- Vertical 03: data → céu atual → aspecto natal → aplicativo/separativo → Hermes → agenda → caderno.
- Previsão: trânsitos primeiro; depois progressões, revoluções e profecções como técnicas independentes e filtráveis.
- Agenda preditiva: janela astrológica → intenção → plano → tarefa/evento → reflexão. O banco privado é a fonte de verdade; Calendar e adaptadores externos são opcionais.

## Fase 5 — Universo pessoal e Hermes pessoal

- pessoas e mapas autorizados;
- diário, tarefas, agenda, arquivos, biblioteca pessoal e exames privados;
- Drive vinculado por pasta autorizada; Gmail fora do escopo;
- memória Hermes: proposta → revisão → aprovação, com método interpretativo e preferências;
- troca de provedor/modelo por conta sem transferência automática de segredos ou memória privada;
- Vertical 05: nota antiga → Hermes identifica relações → abre fonte/mapa → nova anotação com backlinks.

## Fase 6 — Publicação e futuro online

Visão de página, templates, paginação, impressão, PDF, atlas anual e compartilhamento com permissões explícitas. Só depois, sincronização online, permissões por papel e adaptação tablet/mobile.

## Modelo de objetos

Base editorial: SourceDocument, Source, Author, AstrologySchool, AstrologyConcept, Claim, InterpretiveRule, SchoolPosition, Relation, EngineVersion.

Base privada: User, Person, BirthData, Chart, ChartObject, Notebook, NotebookNode, NotebookEdge, Note, Attachment, HermesThread, HermesMessage, HermesMemory, Event, Task, JournalEntry, LibraryItem, Consent, AuditEvent.

NotebookNode suporta texto, nota, imagem, checklist, referência astrológica, resposta Hermes, referência de conceito, pessoa e arquivo. Não reduzir tudo a uma tabela de notas.

## Critério de avanço

Uma fase só avança com migração/backup, testes proporcionais, revisão de privacidade, documentação atualizada e demonstração ponta a ponta. Nenhuma tela bonita compensa um cálculo sem proveniência ou dado pessoal sem proteção.
