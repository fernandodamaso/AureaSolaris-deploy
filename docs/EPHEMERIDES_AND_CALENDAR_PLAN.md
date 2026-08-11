# Efemérides visuais e calendário — plano canônico

Atualizado em 10/08/2026. Este plano detalha a parte temporal do Aurea Solaris sem mudar a ordem do `ROADMAP.md`.

## Decisão de produto

Sim, o Aurea Solaris terá:

1. efemérides calculadas e consultáveis visualmente;
2. calendário interno privado;
3. seleção explícita dos eventos astrológicos que a pessoa quer guardar;
4. exportação seletiva para calendários pessoais;
5. sincronização externa gradual, somente depois da fundação de segurança.

As efemérides pertencem ao **Motor Astrológico**. A Agenda pertence ao **Universo Pessoal**. Um evento calculado não vira compromisso pessoal sem uma ação visível da pessoa.

## Estado existente

- `POST /transit` calcula o céu de um instante com posições, velocidades, retrogradação, fase lunar e recibo.
- `MandalaChart.tsx` já consegue representar um anel de trânsitos, mas a tela ainda não o alimenta.
- `AgendaView.tsx` mostra uma semana, tarefas e compromissos.
- `AgendaContext.tsx` ainda usa integrações externas diretamente e não persiste a agenda local como fonte de verdade.
- `private/0001_initial.sql` já contém `plan_item`, que será a base da agenda privada.
- Não existe endpoint de intervalo temporal, linha do tempo de efemérides ou exportação `.ics`.

## Regra de proveniência

Cada item deve exibir um tipo visual inequívoco:

- **Calculado:** posição, aspecto exato, ingresso, estação, lunação ou janela produzida pelo Motor, com recibo.
- **Regra:** critério interpretativo de uma escola, com fonte.
- **Inferência Hermes:** hipótese ou síntese, nunca apresentada como cálculo.
- **Escolha pessoal:** intenção, lembrete, compromisso ou anotação criada/aprovada pela pessoa.
- **Sincronizado:** cópia vinculada a um provedor externo, com estado e última sincronização.

## Arquitetura de dados

### Consulta temporária

Uma consulta de efemérides não é salva automaticamente. Ela contém:

- intervalo UTC e fuso IANA de exibição;
- corpos e tipos de eventos habilitados;
- configuração astrológica versionada;
- eventos calculados;
- recibo do lote e recibo/evento quando necessário.

### Evento salvo

Ao usar “Salvar na agenda”, criar um `plan_item` privado com:

- `owner_id` obrigatório;
- `item_type`, título, início, fim, dia inteiro e estado;
- `timezone_id` IANA e instantes UTC;
- `astro_context_json` contendo apenas referência técnica, hash e configuração;
- vínculo opcional com perfil/mapa autorizado;
- auditoria de criação, revisão e remoção.

Antes de ativar isso, ampliar a migração de `plan_item` com `timezone_id`, `all_day`, `external_version`, `sync_status`, `deleted_at` e UID estável.

## Motor — endpoint de intervalo

Criar `POST /ephemeris/window`.

Entrada mínima:

```json
{
  "starts_at": "2026-08-10T00:00:00Z",
  "ends_at": "2026-08-17T00:00:00Z",
  "display_timezone": "America/Sao_Paulo",
  "bodies": ["Sun", "Moon", "Mercury", "Venus", "Mars"],
  "event_types": ["ingress", "station", "lunation", "exact_aspect"],
  "zodiac": "tropical"
}
```

Saída mínima:

- eventos ordenados, com início/fim ou instante exato;
- corpos envolvidos, longitude e velocidade relevantes;
- tolerância numérica declarada;
- configuração e versão da efeméride;
- `input_hash` e recibo auditável.

Eventos exatos devem ser resolvidos no Motor por busca de raiz/refinamento. O frontend não pode criar horários “exatos” por amostragem aproximada.

## Interface visual

Dentro da Agenda haverá duas visões sobre o tempo:

### Agenda

- dia, semana e mês;
- tarefas, compromissos, lembretes e eventos astrológicos salvos;
- filtro por pessoa/mapa autorizado;
- estados locais, exportados, sincronizados, conflitantes e indisponíveis.

### Efemérides

- linha do tempo por dia/semana/mês;
- filtros por corpos e tipos de evento;
- fase lunar, ingressos, estações e aspectos exatos;
- posição e velocidade sob demanda;
- detalhe que nasce do evento clicado e mostra primeiro o bloco **Calculado**;
- ações “Estudar no Caderno”, “Perguntar ao Hermes” e “Salvar na agenda”.

Hermes pode explicar ou propor um título/intenção. Ele não salva, exporta ou sincroniza sem revisão e ação explícita.

## Exportação `.ics` — primeira integração

A primeira integração externa será unidirecional e seletiva:

1. pessoa seleciona eventos da Agenda;
2. Aurea mostra uma prévia do que sairá;
3. arquivo `.ics` recebe UID estável, `DTSTAMP`, `DTSTART`, `DTEND`, timezone e categoria;
4. diálogo nativo escolhe o destino;
5. sucesso e erro ficam visíveis e auditáveis.

Por padrão, não exportar:

- data/local/coordenadas de nascimento;
- mapa natal ou recibo completo;
- notas, diário, memórias ou inferências do Hermes;
- nomes de outras pessoas vinculadas.

Pode existir uma opção consciente para incluir uma referência curta como “Lua Nova” ou “Mercúrio estacionário”, sem contexto privado.

Validar o arquivo em Google Calendar, Outlook e Apple Calendar.

## Sincronização externa — fases

1. **ICS seletivo:** sem conta conectada e sem conflito remoto.
2. **Importação somente leitura:** eventos externos aparecem identificados, sem virar automaticamente dados do Aurea.
3. **Copiar para o Aurea:** ação explícita cria um `plan_item` privado e preserva referência externa.
4. **Publicar cópia externa:** OAuth seguro, escopos mínimos, prévia e confirmação.
5. **Bidirecional:** somente com `external_id`, versão/ETag, cursor incremental, idempotência, tombstones, recorrência e resolução de conflito.

O banco privado do Aurea continua sendo a fonte de verdade. Google, Outlook, Apple e outros são adaptadores.

## Ordem de implementação

### T0 — correção de contrato atual

- remover da Agenda a ideia de que Google é a fonte primária;
- não usar `selectedDay.toISOString()` como horário do compromisso;
- marcar regência planetária simplificada como regra, nunca como cálculo;
- desativar criação externa silenciosa quando a integração não estiver configurada.

### T1 — fundação local

- ativar `private.sqlite` e repositório `plan_item` por `owner_id`;
- migrar tarefas/eventos com backup e relatório;
- implementar hora, término, fuso, dia inteiro e estados visuais.

### T2 — efemérides do Motor

- endpoint de intervalo;
- testes unitários e fixtures de eventos exatos;
- recibos e limites de tolerância;
- comparação com referências aprovadas.

### T3 — vertical visual

- abas Agenda/Efemérides;
- linha do tempo, filtros, detalhe e seleção;
- salvar evento escolhido;
- abrir no Caderno Vivo e no Hermes com proveniência.

### T4 — exportação

- gerador e validador ICS;
- prévia e diálogo nativo;
- testes nos três calendários de referência.

### T5 — integrações

- importação somente leitura;
- depois OAuth/cofre e publicação explícita;
- bidirecional apenas após testes de conflito e privacidade.

## Critérios de aceite

- consultar uma semana não cria dados privados;
- todo horário pode ser reconstituído a partir de UTC + fuso IANA;
- evento exato possui recibo e tolerância;
- só a seleção explícita vira `plan_item`;
- reiniciar o aplicativo reabre a mesma Agenda;
- ICS exportado preserva data/hora nos calendários de referência;
- nenhuma informação natal ou anotação privada sai por padrão;
- cálculo, regra, Hermes, anotação e sincronização são distinguíveis em menos de dois segundos.

## Fora do primeiro incremento

- sincronização bidirecional automática;
- publicação sem prévia;
- recomendações de “melhor data” apresentadas como fato;
- cálculo aproximado no frontend;
- criação autônoma de eventos pelo Hermes.
