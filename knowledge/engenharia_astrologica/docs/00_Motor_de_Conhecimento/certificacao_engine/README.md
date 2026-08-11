# Certificação Comparativa do Engine

## Propósito

Esta camada explicativa da **Biblioteca de Engenharia Astrológica** descreve o que são as fixtures de certificação, por que existem e como o motor as utiliza. Ela **não** mantém schema próprio nem promete tabelas futuras: a implementação operacional vive em `tests/engine_reference/`, e o plano canônico de certificação está em `docs/ENGINE_CERTIFICATION_PLAN.md`.

## Princípio

> A Biblioteca explica e preserva o **porquê**.  
> O motor calcula.  
> Fixtures testam.  
> Divergências ficam visíveis — sem fingir equivalência ou apagar escolas.

Nenhuma alteração no motor é considerada completa enquanto não passar por:
1. Invariantes de domínio dos corpos
2. Fixtures de referência aprovadas
3. Recibo certificado reproduzível

## O que são fixtures?

São **evidências de teste**: pares de entrada + resultado de referência, obtidos de capturas autorizadas em fontes comparativas de cálculo. Elas servem para medir gap numérico entre o engine e referências externas, **não** como conteúdo interpretativo do acervo.

## Onde está o quê

| Recurso | Local | Função |
|---------|-------|--------|
| Fixtures, schema JSON, runner, relatórios | `tests/engine_reference/` | Fonte operacional de certificação |
| Plano canônico de certificação e release | `docs/ENGINE_CERTIFICATION_PLAN.md` | Metodologia, tolerâncias, critérios de aprovação |
| Esta camada | `knowledge/.../certificacao_engine/` | Explicação editorial do porquê das fixtures |

## Filosofia

- **Astro.com, Astro-Seek e Solar Fire** são **referências comparativas de cálculo**, não “fontes da verdade” para técnicas ou interpretação.
- **Nenhuma fixture real é criada com valores inventados.** Enquanto não houver captura autorizada, a fixture fica `pending_reference`, nunca `approved`.
- Divergências entre o engine e as referências são registradas como `intentional_divergence` quando houver justificativa editorial; não são apagadas nem silenciadas.

## Tolerâncias

A biblioteca distingue claramente dois níveis:

1. **Verificação editorial preliminar** — tolerância ampla (`0.1°` longitude, `0.2°` cúspides) usada para detectar gaps grosseiros durante desenvolvimento.
2. **Selo de paridade** — exige precisão de segundos de arco, conforme definido em `docs/ENGINE_CERTIFICATION_PLAN.md`. A tolerância ampla **não** é selo de paridade.

## Integração com `knowledge.sqlite`

O `knowledge.sqlite` já está instalado e compilado pelo projeto. As fixtures **não** são conteúdo interpretativo do acervo; são evidências de teste. Quando a integração com o SQLite for implementada, elas serão armazenadas como tabelas de teste (`engine_fixtures`, `engine_reference_runs`, `engine_certification_tests`), não como conteúdo editorial.

## Histórico

| Data | Engine version | Fixtures aprovadas | Gap encontrado | Decisão |
|------|----------------|--------------------|----------------|---------|
| — | — | — | — | — |
