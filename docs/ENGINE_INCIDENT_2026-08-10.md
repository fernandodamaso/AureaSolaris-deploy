# Incidente do Motor e da Mandala — 10/08/2026

## Sintoma observado

Na versão instalada, a Mandala não era gerada e Hermes também aparecia como
indisponível. Na interface, Mercúrio podia receber o rótulo `Lento` sem que a
velocidade viesse do motor, e o rótulo `Feral` aparecia como se fosse fato
calculado.

## Causas confirmadas

1. `main_api.py`, que é o ponto de entrada empacotado no sidecar, não chamava
   `uvicorn.run(...)`. O executável terminava normalmente antes de abrir a
   porta local 9876. Por isso Mandala e Hermes não alcançavam o gateway.
2. O Julian Day natal e de trânsito combinava a **data civil local** com a
   **hora UTC**. Quando o fuso cruzava meia-noite UTC, as posições eram
   calculadas no dia errado.
3. `MandalaPage` descartava `speed` ao adaptar a resposta e `MandalaChart`
   substituía velocidade ausente por zero. Zero era então rotulado como
   `Lento`.
4. `Feral` era uma classificação interpretativa sem escola/fonte selecionada,
   apresentada na superfície de fatos do motor.

## Correção aplicada

- O sidecar agora inicia FastAPI explicitamente e continua limitado a
  `127.0.0.1`.
- Natal e trânsito derivam ano, mês, dia e hora do mesmo `utc_dt` que consta
  no recibo.
- A Mandala preserva velocidade e casa do recibo; velocidade ausente é
  indisponível, nunca zero.
- `Feral` foi retirado da interface e do utilitário. Estados de proximidade
  solar continuam disponíveis, mas são derivados de posições certificadas.
- A interface aguarda de forma limitada a inicialização do sidecar e aceita
  Mandala somente com recibo natal válido, pontos essenciais e 12 casas com
  graus finitos.

## Verificação executada

- `tests/test_engine_utc_boundary.py`: 2 testes, cobrindo a virada
  America/Sao_Paulo → UTC para natal e trânsito.
- `test_transit.py`: 3 testes existentes aprovados.
- `npm.cmd test`: 8 arquivos / 42 testes aprovados.
- TypeScript sem erros (`tsc --noEmit`).
- O sidecar PyInstaller foi regenerado e testado em porta isolada: health
  `swisseph`, mapa natal com 12 casas, recibo `natal` e UTC reproduzível.

## Limite de certificação

Esta correção remove um erro de data e um defeito de inicialização; ela não
confere ainda o selo de paridade com Astro.com, Astro-Seek ou Solar Fire. Esse
selo continua condicionado às fixtures externas aprovadas em
`docs/ENGINE_CERTIFICATION_PLAN.md`.
