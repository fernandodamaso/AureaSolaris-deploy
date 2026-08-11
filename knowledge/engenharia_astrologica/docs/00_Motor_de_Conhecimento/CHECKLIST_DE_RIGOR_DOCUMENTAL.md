# Checklist de rigor documental das fichas YAML

Este é o contrato operacional das **fichas de conhecimento** em `docs/`. Ele
não substitui a taxonomia, o roteiro de estudos ou a lista global de conteúdos
do projeto: define apenas o mínimo verificável antes de uma ficha ser usada
como fonte editorial.

## Antes de criar ou revisar uma ficha

- Confirmar que a ficha é realmente um conceito publicável e possui `id` único,
  `nome` legível e `status` (`draft`, `review` ou `complete`).
- Declarar `tradicao_primaria` ou `tradicoes` com a escola, período ou recorte
  pertinente — por exemplo: `helenística`, `medieval`, `psicológica moderna` ou
  `historiográfica`. Não usar “ocidental” sozinho quando uma tradição mais
  precisa puder ser identificada.
- Para um registro neutro de navegação ou dados, a única exceção é declarar
  `exige_tradicao: false` **e** explicar `justificativa_sem_tradicao`.
- Separar reconstrução histórica, regra técnica, leitura contemporânea e
  hipótese simbólica. Divergências entre escolas devem ser nomeadas, não
  conciliadas silenciosamente.

## Referências e pendências

Use preferencialmente uma lista estruturada. Cada item precisa identificar, no
mínimo, autor e obra; edição/tradução, localizador e URL são incluídos quando
existirem.

```yaml
referencias:
  - autor: "Nome"
    obra: "Título da obra"
    edicao_ou_traducao: "Edição ou tradutor, se aplicável"
    localizador: "Livro, capítulo, página ou seção"
    ano: 2024
    url: "https://..."
    natureza: "primária | secundária | técnica"
```

Os buckets transitórios `primarias`, `secundarias` e `tecnicas` continuam
aceitos pelo auditor, desde que contenham citações textuais identificáveis. Uma
lista de nomes de autores em `origens_e_divergencias` não substitui
`referencias`.

- Registrar em `pendencias_de_fonte` qualquer fonte a confirmar, edição a
  localizar ou atribuição ainda sem prova.
- Nunca marcar `complete` uma ficha que tenha `pendencias_de_fonte` não vazias.
- `complete` exige pelo menos uma referência formal e tradição declarada.
- Não preservar conteúdo de exemplo ou `atlas_simbolico.placeholder: true` ao
  promover uma ficha.

## Sentido dos status

- `draft`: material em elaboração; pode ter lacunas explicitadas.
- `review`: conteúdo pronto para conferência, com as incertezas e pendências
  declaradas; não equivale a publicação final.
- `complete`: ficha verificável para consulta editorial. Sem pendências de
  fonte, sem placeholders e com tradição e referências formais.

## Rotina segura de auditoria

```powershell
python tools/audit_editorial_metadata.py
python tools/audit_editorial_metadata.py --strict
python tools/build_knowledge_db.py --strict --output <caminho-temporario>.sqlite
```

O primeiro comando cria o diagnóstico sem alterar YAMLs. O segundo falha se
houver bloqueios de publicação; o terceiro verifica que o corpus continua
compilável em um banco isolado.

### Lista-alvo para rebaixamento seguro de `complete`

Para identificar **somente** fichas ainda marcadas `complete` sem referência
formal, gere a lista atual no momento da revisão:

```powershell
python tools/audit_editorial_metadata.py --targets-complete-without-references
```

Não aplique uma alteração em massa a partir de uma contagem antiga. Para cada
caminho retornado:

1. Confirme que ele ainda está `complete` e que `referencias` não contém ao
   menos uma citação formal.
2. Se a fonte não puder ser adicionada agora, altere **apenas** `status` para
   `draft`; preserve o texto e seus metadados existentes.
3. Adicione a lacuna concreta em `pendencias_de_fonte`.
4. Execute novamente o comando de lista; a ficha só sai do alvo após ganhar
   referência formal e voltar a passar por revisão.

Assim, o rebaixamento é reversível, limitado à lista auditada e não transforma
uma lacuna documental em apagamento de conteúdo.
