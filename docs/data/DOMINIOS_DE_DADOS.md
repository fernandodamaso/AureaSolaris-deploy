# Domínios de dados: conhecimento e vida privada

> Status: arquitetura aprovada para implementação. Este documento não migra nem elimina dados existentes.

## Decisão fundamental

O Aurea Solaris usa **dois bancos SQLite independentes**, com finalidades e regras de acesso distintas:

| Banco | Finalidade | Pode conter | Não pode conter |
|---|---|---|---|
| `knowledge.sqlite` | Base astrológica canônica, plural e auditável | Fontes, documentos brutos, conceitos, afirmações, escolas/tradições, relações, citações e versões de importação | Senhas, tokens, diário, notas, saúde, agenda, conversas ou impressões pessoais |
| `private.sqlite` | Espaço confidencial de cada pessoa | Perfis, mapas privados, preferências, agenda, tarefas, notas, diário, método pessoal, memória do Hermes e consentimentos | Tokens em texto, senhas em texto, cópia integral de fonte astrológica pública/compartilhável |

Essa separação traduz a regra do produto: **a astrologia é conhecimento estudável e verificável; a interpretação, a vivência e o método pertencem à pessoa que escreve e estuda**.

## Localização e proteção

- Os dois arquivos ficam no diretório de dados do aplicativo, nunca dentro do repositório nem em `localStorage`.
- `knowledge.sqlite` é versionado por *proveniência* (documentos, hashes, importações), não por sobrescrita silenciosa.
- `private.sqlite` é protegido no dispositivo. No modo padrão `local-owner`, a API resolve um proprietário inequívoco e emite sessão de processo; no modo `require-login` (`AUREA_REQUIRE_LOGIN=1`), a abertura exige autenticação por senha.
- Senha: somente verificador derivado com Argon2id e sal único. Nunca guardar senha, PIN ou resposta de recuperação em texto.
- Segredos de integrações (Google, Todoist, chaves de IA) ficam em cofre do sistema/Stronghold; o banco privado guarda apenas `secret_ref` e escopos concedidos.
- Backup privado é opt-in, cifrado e apresentado como conteúdo sensível. Logs não podem registrar conteúdo de notas, chats, tokens ou dados natais.

## Modelo de acesso

1. O modo padrão no Chrome é `local-owner`: a API resolve um único proprietário habilitado quando inequívoco, emite um token de sessão na memória do processo (sem expiração por tempo; invalidado ao reiniciar a API) e abre o shell principal sem tela de login. O modo `require-login` (`AUREA_REQUIRE_LOGIN=1`) exige autenticação por senha, com sessão autenticada e logout como hoje. A variável de ambiente não recupera senha desconhecida; cadastro de senha para um proprietário criado automaticamente sem senha é trabalho futuro separado.
2. Todo registro do banco privado pertence a um `owner_id`; consultas não podem atravessar essa fronteira.
3. O Hermes recebe somente o contexto necessário à pergunta, dentro do perfil ativo e das permissões explicitamente concedidas.
4. Uma memória ou alteração proposta pelo Hermes nasce como `proposed`; a pessoa revisa e aprova antes de ela influenciar interpretações futuras.
5. A base de conhecimento pode sustentar respostas para qualquer perfil, sempre com fonte, escola/tradição, grau de confiança e data/versão.

## Hermes e provedores de IA

Hermes é a camada estável de memória, ferramentas e regras do Aurea. Um provedor de IA (por exemplo, ChatGPT/OpenAI, outro servidor compatível ou modelo local) é apenas o motor de conversa escolhido por uma conta. A configuração do provedor guarda somente uma referência ao segredo no cofre, nunca uma chave no banco ou no frontend. Respostas gravadas pelo Hermes registram provedor, modelo, data, fontes e permissões usadas; memórias interpretativas permanecem `proposed` até aprovação humana. Assim, trocar de provedor não altera nem aprisiona a base de conhecimento e a memória privada.

## Conteúdo astrológico: plural, não achatado

Cada afirmação em `knowledge.sqlite` aponta para fonte e tradição. Afirmações incompatíveis convivem como registros distintos; não são apagadas nem tratadas como uma verdade única. O mecanismo de cálculo registra, em cada resultado, efeméride, versão do motor, zodíaco, sistema de casas, orbe e configurações utilizadas.

O material da Engenharia Astrológica será importado após um manifesto de hashes e contagens. YAML, Markdown e versões divergentes entram como documentos/fontes distintos, preservando caminho original e hash. Só depois de validação de integridade uma cópia poderá ser arquivada; nunca destruída automaticamente.

O contrato normativo instalado em [../astrology-knowledge-contract.md](../astrology-knowledge-contract.md) e em [knowledge_contract_aurea_solaris.yaml](knowledge_contract_aurea_solaris.yaml) define como esse acervo vira regra computável sem apagar divergências. Enquanto não existir editor/importador bidirecional aprovado, a revisão editorial continua editável no repositório e no caderno-fonte, e a sincronização com `knowledge.sqlite` deve ocorrer por manifesto e snapshot explícitos.

O procedimento operacional dessa sincronização está em [ENGENHARIA_SYNC_PLAYBOOK.md](ENGENHARIA_SYNC_PLAYBOOK.md), junto do modelo de manifesto em [engenharia_import_manifest_template.yaml](engenharia_import_manifest_template.yaml).

## Conteúdo privado: autoria e consentimento

- **Mapas natais e pessoas cadastradas:** pertencem ao perfil que os criou. A pessoa cadastrada pode ter nível de visibilidade e consentimento próprio.
- **Notas, diário, cards e estudos:** pertencem ao autor (`owner_id`) e podem referenciar conceitos/afirmações do conhecimento sem copiar a fonte inteira.
- **Método de interpretação:** é uma preferência/hipótese pessoal, versionada, com autoria e estado de revisão. Não altera a base astrológica canônica.
- **Memória do Hermes:** contém observações minimizadas, fonte de evidência, escopo, estado de aprovação e possibilidade de revogação. Não é uma instrução invisível nem uma "verdade" sobre a pessoa.
- **Agenda e tarefas:** são privadas e podem receber links para janelas astrológicas calculadas, mantendo separada a origem do cálculo da decisão pessoal.

## Migração do estado atual

O estado atual usa `localStorage` para perfis, preferências e inclusive campos sensíveis. A migração deverá:

1. criar os dois bancos e uma conta local inicial;
2. importar dados não secretos para `private.sqlite` com relatório de contagens;
3. remover senhas/tokens dos objetos de perfil e transferir integrações autorizadas ao cofre;
4. pedir nova senha local e reconexão das integrações, sem tentar reutilizar segredo exposto;
5. manter um backup cifrado e verificável antes de limpar o armazenamento legado;
6. só então apagar as chaves legadas, mediante confirmação da pessoa usuária.

Nenhuma migration pode importar automaticamente um token, uma senha ou conteúdo de chat para a base de conhecimento.

## Arquivos de referência

- Esquema do conhecimento: `src-tauri/migrations/knowledge/0001_initial.sql`
- Esquema privado: `src-tauri/migrations/private/0001_initial.sql`
- Constituição do produto: `docs/CONSTITUICAO.md`
- Contrato primário do conhecimento: `docs/astrology-knowledge-contract.md`
