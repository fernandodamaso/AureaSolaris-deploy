# Engenharia Astrológica vendorizada no Aurea Solaris

Este diretório reúne a cópia editorial atualmente usada como base interna de estudo no Aurea Solaris.

- origem do snapshot local: revisão consolidada em 11 de agosto de 2026;
- corpus incluído: `docs/`, `tools/`, `knowledge/` e `canonical_map.yaml`;
- snapshot de consulta embutido no app: `knowledge/build/editorial_current.sqlite`;
- objetivo: manter o material de estudo unido ao projeto Aurea, com rastreabilidade e sem depender de uma pasta solta fora do repositório.

Observações:

- a importação canônica para `knowledge.sqlite` do runtime ainda continua uma etapa distinta;
- enquanto isso, a Biblioteca do app pode consultar o snapshot editorial embutido;
- a pasta externa legada no Desktop não é mais a referência preferencial deste repositório.

## Estado editorial e publicação

O acervo preserva fichas em `draft`, `review` e `complete`. Isto é um estado de documentação, não um juízo sobre a legitimidade de uma tradição. Há duas modalidades de publicação: a **edição de estudo**, que mantém os estados visíveis, e o **catálogo integral concluído**, bloqueado enquanto qualquer ficha não estiver `complete`.

Consulte [a política de publicação](docs/16_Ferramentas_e_Bibliografia/PUBLICACAO_EDITORIAL.md) e execute `tools/validate_publication.py` antes de qualquer release editorial.
