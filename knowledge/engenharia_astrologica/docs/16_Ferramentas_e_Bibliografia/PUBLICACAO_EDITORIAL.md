# Publicação editorial do acervo

O acervo é um caderno de estudos e não perde fichas por estarem em elaboração. Cada ficha possui um estado editorial visível:

- `draft`: rascunho de estudo, ainda em desenvolvimento;
- `review`: texto estruturado e em revisão editorial;
- `complete`: ficha cuja revisão declarada está concluída para a edição vigente.

Esses estados não distinguem a validade espiritual, histórica ou simbólica de uma tradição. Eles descrevem apenas o estado de elaboração documental desta edição.

## Duas modalidades legítimas

### Edição de estudo

Pode incluir todo o corpus, inclusive `draft` e `review`, desde que a interface, exportação ou catálogo preserve e mostre o estado editorial de cada ficha. Nunca a anuncie como “catálogo integral concluído”.

```powershell
python -X utf8 tools\audit_editorial_metadata.py --strict
python -X utf8 tools\validate_publication.py --edition study `
  --output knowledge\build\editorial_publication_manifest.json `
  --summary knowledge\build\editorial_publication_report.md
```

O manifesto é o contrato para a camada de apresentação: `visible_editorial_states_required` deve permanecer `true`, e os totais por estado devem ser expostos na edição publicada.

### Catálogo integral concluído

Esta modalidade só é permitida se a auditoria estrita passar **e** todas as fichas forem `complete`. O comando falha intencionalmente caso exista qualquer `draft` ou `review`; não transforma nem oculta fichas automaticamente.

```powershell
python -X utf8 tools\validate_publication.py --edition catalog `
  --output knowledge\build\editorial_publication_manifest.json `
  --summary knowledge\build\editorial_publication_report.md
```

## Sequência antes de publicar

1. Execute a auditoria estrita e corrija somente as pendências que ela apontar.
2. Gere o manifesto da modalidade desejada.
3. Para uma edição de estudo, verifique visualmente que o consumidor do acervo mostra o selo `draft`, `review` ou `complete` junto da ficha ou em sua abertura.
4. Para um catálogo integral, mantenha o comando `--edition catalog` como gate de CI/release; saída diferente de zero bloqueia a publicação.
5. Compile o banco pesquisável após a decisão editorial:

```powershell
python -X utf8 tools\build_knowledge_db.py --strict --output knowledge\build\engenharia_astrologica.sqlite
```

O gate é documental e reversível: ele não reescreve YAML, não remove escolas nem suprime divergências. Ele impede apenas uma declaração editorial que os próprios estados ainda não sustentam.
