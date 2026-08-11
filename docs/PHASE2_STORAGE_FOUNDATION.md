# Fase 2 — fundação local de dados e segurança

Atualizado em 10/08/2026.

## Estado

**Em andamento.** A infraestrutura de bancos, migrações e backup foi iniciada. Ela ainda não é a fonte de verdade das telas e nenhum dado legado foi importado automaticamente.

## Implementado

- `private.sqlite` para dados pessoais e `knowledge.sqlite` para conteúdo editorial;
- migrações imutáveis com checksum e recusa de versão futura desconhecida;
- `foreign_keys`, WAL, sincronização completa, espera de concorrência e verificação de integridade;
- backup automático antes de alteração de esquema;
- backup manual verificado com tamanho e SHA-256;
- diagnóstico local pela API;
- empacotamento do SQLite e das migrações no sidecar Windows;
- agenda preparada para fuso, evento de dia inteiro, UID, versão externa, conflito e exclusão;
- esquema de memória contextual “Tudo é Mente”, evidências, proveniência e revisão de contradições;
- API local inicial de threads do Hermes: abrir/reabrir por pessoa e tema, listar, registrar mensagens com proveniência e recuperar contexto em ordem cronológica;
- endpoint de criação explícita de conta privada com verificador derivado, sem senha em texto;
- proteção estrutural no esquema contra vínculos do Hermes entre proprietários diferentes.

Ainda não implementado: a conexão da interface de conversa a essa API, criação/migração consentida de contas privadas, memórias propostas e aprovadas, comparação real com `knowledge.sqlite`, painel de revisão/esquecimento e conexão do Caderno Vivo. A existência da API não deve ser apresentada como memória Hermes já operante.

## Invariantes

1. Não importar, alterar ou apagar o legado durante a inicialização.
2. Fazer inventário e backup verificável antes de qualquer importação.
3. Toda consulta privada deve receber e impor `owner_id`.
4. Segredos ficam em cofre do sistema; o banco guarda apenas `secret_ref`.
5. O banco editorial não recebe dados pessoais.
6. Cálculos são referenciados por recibo; inferências não são gravadas como fatos.
7. Uma migração aplicada nunca é reescrita.

## Localização em runtime

O aplicativo desktop passa seu diretório privado ao sidecar por `AUREA_DATA_DIR`. Dentro dele ficam:

- `data/private.sqlite`;
- `data/knowledge.sqlite`;
- `backups/before-schema/`;
- `backups/manual/`.

O caminho efetivo deve ser consultado pela camada nativa; não deve ser fixado no código da interface.

## Endpoints diagnósticos atuais

- `GET /health`: saúde do Motor e integridade resumida dos bancos;
- `GET /storage/diagnostic`: integridade, versões aplicadas e estado da importação legada;
- `POST /storage/backup/private`: cria backup verificado e devolve recibo.

Esses endpoints são locais. Eles não autorizam acesso de rede externo.

## Testes existentes

`tests/test_local_storage.py` cobre criação vazia, ausência de importação automática, checksum imutável, recusa de downgrade, backup manual, backup pré-migração, preservação de linhas e isolamento entre proprietários para a memória do Hermes.

## Próxima sequência

1. inventariar chaves legadas e produzir relatório de contagens, sem escrever no novo banco;
2. implementar restauração verificada a partir de backup;
3. concluir Argon2id, sessão, logout, recuperação e cofre;
4. criar repositórios privados com `owner_id` obrigatório;
5. migrar um domínio por vez, começando por perfil/nascimento, com prévia e confirmação;
6. retirar os dados migrados do `localStorage` somente após comparação e aceite;
7. migrar o perfil com prévia e consentimento, criando a conta privada com verificador derivado, então conectar a conversa Hermes às threads já isoladas por pessoa;
8. salvar respostas como inferências, com proposta explícita antes de qualquer memória recuperável;
9. conectar Caderno Vivo e memória do Hermes ao banco;
10. implementar exclusão e retenção de backups de forma transparente.

## Gate de conclusão

A Fase 2 só termina quando a restauração for demonstrada, nenhum segredo estiver em texto aberto, todas as consultas privadas forem isoladas por proprietário e cada domínio legado tiver relatório de antes/depois e rollback testado.
