# Google Calendar — integração futura

Fonte canônica: `EPHEMERIDES_AND_CALENDAR_PLAN.md`.

## Contrato

1. `private.sqlite` guarda os eventos privados do Aurea Solaris.
2. Exportação `.ics` é seletiva, unidirecional e não exige credenciais.
3. Importação externa começa somente leitura.
4. Tokens OAuth ficam em cofre local e são referenciados por `secret_ref`; nunca entram no React, em `localStorage`, em variáveis `VITE_`, prompts ou logs.
5. Criar, alterar ou excluir no Google exige ação explícita, prévia e estado visual de sucesso/erro.
6. Sincronização bidirecional exige UID externo estável, versão/ETag, cursor incremental, idempotência, tombstones, recorrência, fuso IANA e resolução de conflito.

Os comandos Tauri atuais (`get_google_events`, `add_google_event`, `delete_google_event`) são legado em contenção. Não ampliar esse caminho antes da fundação de dados e segurança.
