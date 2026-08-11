# Hermes Mind API — primeiro contrato local

Esta vertical persiste o histórico explícito de estudo antes de qualquer recuperação automática ou chamada a um provedor de IA. Todos os endpoints são locais, servidos pelo sidecar em `127.0.0.1`, e exigem `owner_id` válido.

## Operações disponíveis

- `POST /hermes/accounts` — cria a conta privada durante uma migração explícita, recebendo somente verificador, sal e algoritmo derivados; nunca recebe senha em texto.
- `POST /hermes/threads/open` — abre a conversa ativa de uma pessoa por `topic_key`, ou cria uma nova. Corpo: `owner_id`, `topic_key`, `title?`.
- `GET /hermes/threads?owner_id=…&limit=…` — lista somente as conversas não apagadas daquela pessoa.
- `POST /hermes/threads/{thread_id}/messages` — grava uma mensagem com `role`, `content` e `provenance_kind` obrigatórios. Opcionalmente recebe hash de recibo e referências já conhecidas.
- `GET /hermes/threads/{thread_id}/context?owner_id=…&limit=…` — reabre o tema e suas mensagens recentes em ordem cronológica.
- `POST /hermes/memories/propose` — cria uma memória em estado `proposed`, opcionalmente ligada à thread e à mensagem que a evidenciam.
- `GET /hermes/memories?owner_id=…&status=…&limit=…` — lista memórias não apagadas somente daquele proprietário.
- `POST /hermes/memories/{memory_id}/review` — aceita `approve`, `revoke` ou `forget`; aprovar uma inferência a transforma em `confirmed`, esquecer a retira da recuperação normal.

## Limites de segurança

- Uma conta privada deve existir antes de abrir uma conversa; a API não inventa proprietários.
- Um `thread_id` de outra pessoa responde como inexistente; a API não confirma sua existência.
- `provenance_kind` só aceita `personal_statement`, `personal_note`, `calculated_fact`, `source_excerpt`, `hermes_inference` ou `system_notice`.
- Health e diagnóstico informam apenas estado técnico do banco, nunca conteúdo de conversas.
- Estas rotas não chamam modelo de IA, não deduzem memórias e não enviam dados para fora do computador.

## Estado e próximo incremento

O HermesChat já conecta o perfil ativo a uma conta local, abre/reabre o fio geral da pessoa e restaura mensagens classificadas. A API de memória já permite proposta, aprovação, revogação e esquecimento com evidência e isolamento por proprietário.

Ainda faltam o painel visual para a pessoa revisar suas memórias, autenticação local Argon2id com sessão/logout e cofre de integrações, migração explícita das telas legadas para `private.sqlite` e a recuperação editorial com detecção de contradições citadas contra `knowledge.sqlite`. Nenhuma memória deve ser promovida automaticamente.
