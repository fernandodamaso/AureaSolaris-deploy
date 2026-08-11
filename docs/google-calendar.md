# Google Calendar — documento legado

Este arquivo não é mais fonte de verdade. Consulte `EPHEMERIDES_AND_CALENDAR_PLAN.md`.

Decisões vigentes:

- a Agenda privada do Aurea Solaris será a fonte de verdade;
- Google Calendar será apenas um adaptador externo;
- nenhuma chave ou token pode usar prefixo `VITE_` ou chegar ao frontend;
- a primeira integração será exportação seletiva `.ics`;
- OAuth e escrita externa só entram depois de `private.sqlite`, cofre local, consentimento e resolução de conflitos;
- comandos atuais de Google Calendar são legados e não definem a arquitetura futura.

Não reimplementar `src/services/composio.ts` nem adicionar `VITE_COMPOSIO_API_KEY`.
