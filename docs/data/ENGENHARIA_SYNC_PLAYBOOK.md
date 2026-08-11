# Playbook de sincronização: Engenharia Astrológica → Aurea Solaris

Status: draft operacional instalado em 11 de agosto de 2026.

Este playbook define como o corpus editorial da Engenharia Astrológica entra no Aurea Solaris sem deriva silenciosa, preservando:

- editabilidade humana;
- snapshots reproduzíveis;
- manifesto de hashes e contagens;
- separação entre base editorial, snapshot importado e `knowledge.sqlite`;
- distinção entre regra normativa, nota de estudo e camada moderna/opcional.

## 1. Papéis de cada camada

### 1.1 Engenharia Astrológica

É a fonte editorial-mãe.

Função:

- revisão de conteúdo;
- maturação histórica;
- registro de divergências entre escolas;
- preservação de etimologias, curiosidades, mitos, notas esotéricas, medicina astrológica, magia, camadas kármicas e sistêmicas, desde que rotuladas.

Regra:

- grandes revisões textuais nascem aqui primeiro.

### 1.2 Snapshot importável

É uma cópia congelada da base editorial em um estado verificável.

Função:

- servir de ponte entre o caderno editorial e a importação do Aurea;
- registrar exatamente o que foi aprovado para ingestão;
- permitir auditoria, rollback e comparação entre versões.

Regra:

- snapshot não substitui a fonte editorial;
- snapshot não é editado manualmente depois de emitido;
- qualquer correção substancial volta para a Engenharia Astrológica e gera novo snapshot.

### 1.3 `knowledge.sqlite`

É a base operacional/canônica consultável pelo produto.

Função:

- armazenar documentos, afirmações, tradições, versões, relações, proveniência e resultados de importação;
- sustentar cálculo, explicação e auditoria do motor.

Regra:

- `knowledge.sqlite` nunca é tratado como editor primário;
- toda carga deve apontar para manifesto, snapshot e contrato normativo;
- nenhuma regra computacional entra sem escola, variante e proveniência.

## 2. Regras-mãe de não-deriva

1. O Aurea não pode “melhorar” silenciosamente o corpus importado.
2. Nenhum texto importado vira regra de motor sem mapeamento explícito para escola, variante e uso computacional.
3. Nota editorial, curiosidade, mito, etimologia, lenda, simbolismo moderno, correspondência mágica ou camada psicológica nunca substituem automaticamente uma regra histórica.
4. Quando duas tradições divergem, o dado entra como divergência explícita; nunca como fusão invisível.
5. Se o snapshot e o banco divergirem sem nova importação registrada, o estado é inválido para auditoria.
6. Toda importação precisa ser reconstruível a partir de:
   - caminho de origem;
   - hash do snapshot;
   - manifesto;
   - contrato normativo vigente;
   - versão do importador;
   - contagens antes/depois.

## 3. Estrutura mínima recomendada

### 3.1 Fora do repositório ou em área controlada

- `Engenharia Astrológica/` → corpus editorial vivo

### 3.2 Dentro do Aurea Solaris

- `docs/astrology-knowledge-contract.md` → contrato normativo legível
- `docs/data/knowledge_contract_aurea_solaris.yaml` → contrato normativo legível por máquina
- `docs/data/ENGENHARIA_SYNC_PLAYBOOK.md` → este playbook
- `docs/data/engenharia_import_manifest_template.yaml` → modelo de manifesto
- `knowledge.sqlite` → base operacional

Opcional quando o fluxo de importação existir:

- `data/imports/engenharia_astrologica/<snapshot-id>/manifest.yaml`
- `data/imports/engenharia_astrologica/<snapshot-id>/checksums.txt`
- `data/imports/engenharia_astrologica/<snapshot-id>/import-report.json`

## 4. Fluxo oficial de sincronização

### Etapa A — revisão editorial

1. Revisar conteúdo na Engenharia Astrológica.
2. Validar integridade estrutural.
3. Resolver contradições editoriais reais ou marcá-las explicitamente.
4. Distinguir:
   - regra histórica;
   - divergência entre escolas;
   - nota moderna/opcional;
   - curiosidade/etimologia/lenda;
   - pendência de fonte.

### Etapa B — congelamento do snapshot

1. Escolher um estado editorial aprovado.
2. Gerar `snapshot_id` estável, por exemplo:
   - `engenharia-astrologica-2026-08-11-a`
3. Registrar manifesto com:
   - origem;
   - data/hora;
   - contagens;
   - hashes;
   - contrato aplicado;
   - observações editoriais.
4. Congelar os arquivos incluídos.

### Etapa C — pré-importação no Aurea

1. Conferir se o contrato normativo vigente ainda é o correto.
2. Comparar manifesto novo com o manifesto anterior.
3. Detectar:
   - arquivos novos;
   - arquivos removidos;
   - arquivos alterados;
   - mudanças de contagem;
   - hashes divergentes.
4. Bloquear a importação se houver:
   - hash faltando;
   - snapshot incompleto;
   - quebra de contrato;
   - divergência não explicada entre manifesto e carga.

### Etapa D — importação para `knowledge.sqlite`

1. Criar registro de importação.
2. Salvar manifesto bruto.
3. Salvar snapshot id, hash global e contagens.
4. Ingerir documentos sem destruir a versão anterior silenciosamente.
5. Associar cada documento a:
   - caminho original;
   - tipo de arquivo;
   - hash;
   - snapshot;
   - data de importação;
   - tradição declarada;
   - estado editorial.
6. Emitir relatório final.

### Etapa E — pós-importação

1. Validar contagens esperadas.
2. Validar amostras críticas:
   - signos;
   - planetas;
   - casas;
   - aspectos;
   - técnicas preditivas;
   - estrelas fixas;
   - lotes/partes;
   - camadas modernas rotuladas.
3. Registrar o resultado.
4. Só então liberar o snapshot como “ativo” para consulta do produto.

## 5. Manifesto: o que deve existir

Toda sincronização aprovada precisa de um manifesto legível por máquina.

Campos mínimos:

- `snapshot_id`
- `source_project`
- `source_root`
- `captured_at`
- `editorial_branch_or_context`
- `contract_version`
- `file_count`
- `document_count`
- `hash_algorithm`
- `root_hash`
- `files[]` com caminho relativo, hash e tamanho
- `editorial_summary`
- `validation_summary`
- `notes`

Contagens desejáveis:

- quantidade de arquivos;
- quantidade de fichas;
- quantidade por domínio;
- quantidade por `status`;
- quantidade com `pendencias_de_fonte`;
- quantidade de divergências explicitamente marcadas.

## 6. Hashes e contagens

### 6.1 Regras

- o algoritmo de hash deve ser único por manifesto;
- `root_hash` precisa depender da lista ordenada de arquivos e seus hashes;
- mudança textual em qualquer ficha altera o snapshot;
- mudança de contagem sem justificativa bloqueia promoção automática.

### 6.2 O que comparar entre snapshots

- total de arquivos;
- total de fichas válidas;
- total por pasta;
- total por `status`;
- total de pendências;
- hashes dos arquivos críticos.

## 7. Editabilidade sem perder rastreabilidade

Sim: o material pode continuar sendo editado dentro do Aurea Solaris.

Mas a regra operacional é:

- editar documentação e contrato no Aurea é permitido;
- editar o corpus editorial-fonte continua preferencialmente na Engenharia Astrológica;
- editar `knowledge.sqlite` manualmente não é o caminho canônico;
- quando uma revisão nascer dentro do Aurea, ela deve ser tratada como proposta editorial até voltar para a fonte-mãe ou gerar snapshot novo aprovado.

## 8. Política de promoção para regra de motor

Um conteúdo só pode subir de “estudo/documentação” para “regra computacional” quando tiver:

1. tradição identificada;
2. escopo técnico claro;
3. divergências relevantes marcadas;
4. parâmetros calculáveis;
5. restrições explicitáveis no motor;
6. fonte suficiente para auditoria.

Se qualquer item faltar, o dado continua em:

- documentação;
- nota editorial;
- hipótese em revisão;
- ou camada opcional não normativa.

## 9. Casos que devem bloquear importação automática

- snapshot sem manifesto;
- manifesto sem hashes;
- hashes sem lista completa de arquivos;
- contagens incompatíveis com a carga;
- documento sem caminho de origem;
- regra computacional sem tradição/variante;
- substituição silenciosa de uma leitura tradicional por uma moderna;
- remoção massiva sem relatório de impacto;
- divergência histórica achatada em um único valor sem nota.

## 10. Rollback

Rollback deve apontar para:

- `snapshot_id` anterior;
- manifesto anterior;
- relatório da importação anterior;
- contrato vigente à época.

Rollback não é “editar o banco no susto”; é reativar um snapshot auditável anterior.

## 11. Checklist operacional resumido

Antes de importar:

- contrato vigente conferido;
- snapshot emitido;
- manifesto preenchido;
- hashes gerados;
- contagens revisadas;
- divergências relevantes marcadas;
- pendências críticas conhecidas.

Depois de importar:

- contagens conferem;
- relatório emitido;
- snapshot ativo registrado;
- sem deriva entre manifesto e banco.

## 12. Relação com o contrato primário

Este playbook operacionaliza o contrato em:

- [../astrology-knowledge-contract.md](../astrology-knowledge-contract.md)
- [knowledge_contract_aurea_solaris.yaml](knowledge_contract_aurea_solaris.yaml)

O contrato diz o que o motor pode ou não pode assumir.

Este playbook diz como o corpus chega ao motor sem corromper essa regra.
