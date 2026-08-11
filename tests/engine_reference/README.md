# Certificação comparativa do Motor Astrológico

Esta pasta é a base verificável para comparar o motor com exportações de uma
fonte externa escolhida e revisada por uma pessoa. Ela não produz nem aceita
posições esperadas inventadas.

## Estados das fixtures

- `pending_reference`: descreve uma entrada de cálculo, mas **não executa uma
  comparação**. Serve para registrar o caso que ainda precisa de uma exportação
  externa aprovada.
- `approved_reference`: pode certificar o motor somente quando contém
  fornecedor, URL ou identificador da exportação, instante da captura,
  revisor, data de aprovação e valores esperados.
- `rejected_reference`: preserva uma referência descartada, sem usá-la como
  evidência.

O exemplo presente está deliberadamente em `pending_reference`; ele não traz
posições, casas ou aspectos copiados de Astro.com, Astro-Seek, Solar Fire ou
qualquer outra fonte.

## Executar

Na raiz do repositório:

```powershell
python tests/engine_reference/run_reference_checks.py
```

O comando informa e ignora explicitamente fixtures pendentes ou rejeitadas. Em
integração de certificação, exigir ao menos uma comparação aprovada:

```powershell
python tests/engine_reference/run_reference_checks.py --require-approved
```

Esse modo falha enquanto não houver uma fixture aprovada que passe. Portanto,
uma execução verde no modo comum **não** equivale a certificação.

## Adicionar uma referência aprovada

1. Gere uma exportação externa usando exatamente a data, hora civil, fuso IANA,
   offset UTC quando aplicável, latitude, longitude, zodíaco e sistema de casas
   da fixture.
2. Guarde localmente, de modo permitido, a exportação ou o identificador que
   permite conferi-la. Não inclua dados pessoais sem autorização.
3. Copie apenas os valores presentes na exportação para `reference.expected` e
   preencha `provider`, `reference_url_or_id`, `captured_at`, `approved_by` e
   `approved_at`.
4. Mude o estado para `approved_reference`, execute o runner comum e depois
   `--require-approved`.
5. Revise qualquer diferença antes de mudar tolerâncias. Tolerâncias não devem
   mascarar divergências de fuso, efeméride, zodíaco ou sistema de casas.

O contrato da fixture está em [`fixture.schema.json`](fixture.schema.json). O
runner compara graus com distância circular, cúspides de casa e conjunto de
aspectos, incluindo orbe e estado aplicativo quando esses campos são
fornecidos.
