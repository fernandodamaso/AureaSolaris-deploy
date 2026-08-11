# Certificação do Motor Astrológico

## Objetivo inegociável

O Aurea Solaris deve alcançar **paridade verificável de cálculo** com Astro.com, Astro-Seek e Solar Fire para a mesma entrada e a mesma configuração. Paridade não significa telas iguais: significa que posições, casas, ângulos, aspectos e metadados reproduzíveis ficam dentro das tolerâncias aprovadas, ou que toda diferença possui causa documentada.

Até os critérios deste documento passarem, o produto deve se apresentar como **motor auditável em validação**, nunca como “equivalente” ou “certificado” por essas referências.

## Regra de comparação

As referências podem divergir entre si por configuração. Cada caso registra obrigatoriamente data/hora civil, fuso IANA e offset quando necessário, latitude/longitude, zodíaco/ayanamsa, geocêntrico/topocêntrico, sistema de casas, corpos habilitados, política de aspectos/orbes e versão/modo de efeméride. Nunca comparar resultados com configurações implícitas.

## Escopo da certificação v1

| Área | Resultado exigido |
|---|---|
| Tempo | Conversão civil → UTC reproduzível; IANA obrigatório; erro em horário inexistente; escolha explícita em horário ambíguo. |
| Posições | Sol, Lua, planetas, nodos e corpos adicionais habilitados. |
| Casas e ângulos | ASC, MC, DSC, IC e 12 cúspides nos sistemas suportados. |
| Aspectos | Ângulo, orbe, aplicativo/separativo e política declarada. |
| Proveniência | Recibo com entrada, hash, UTC, versão do motor/efeméride e parâmetros. |
| Regressão | Fixtures versionadas, relatório automático e bloqueio de release em regressão. |

Fora da v1: interpretação, sinastria, progressões, retorno solar e PDF. Eles só podem ser certificados depois da base natal/transit.

## Estrutura canônica

```text
tests/engine_reference/
  README.md
  fixture.schema.json
  fixtures/*.json
  run_reference_checks.py
  reports/                 # artefatos ignorados pelo Git
```

Uma fixture é evidência, não opinião: fonte, data de coleta, configuração integral, resultado de referência, tolerâncias e aprovação. Nunca registrar senha, chave, URL privada, sessão autenticada ou nascimento de terceiro sem consentimento.

## Plano de implementação

### C0 — congelar a base do cálculo

1. Fixar no recibo nome/versão do motor, biblioteca, modo de efeméride, zodíaco, ayanamsa, casas e política de aspectos.
2. Empacotar as efemérides escolhidas e registrar checksum/versão no release. Modo menos preciso deve ser declarado; release certificado deve falhar se não for aprovado.
3. Exigir no natal data, hora, coordenadas e fuso IANA; nunca inferir cidade, fuso ou DST.
4. Rejeitar horário inexistente e exigir offset em horário ambíguo.

**Saída:** recibo `calculation-receipt.v1` estável e teste de contrato.

### C1 — corpus de referência aprovado

1. Criar pelo menos 20 casos sintéticos ou consentidos, sem dados identificáveis.
2. Cobrir datas contemporâneas, históricas, bordas DST/fuso e latitudes altas.
3. Registrar resultados exportados ou transcritos manualmente de Astro.com, Astro-Seek e Solar Fire, sempre com configurações visíveis.
4. Marcar cada valor como `approved`, `pending_reference` ou `rejected`; o runner nunca trata pendência como sucesso.
5. Guardar prova com restrição de licença fora do repositório; no fixture ficam hash e metadados.

**Saída:** corpus revisado pela responsável do produto.

### C2 — posições planetárias

1. Comparar longitude eclíptica bruta antes de signo/grau.
2. Tolerância inicial: até **1 segundo de arco** (`0,000277778°`) com efeméride/modo equivalentes; qualquer valor maior exige justificativa no caso.
3. Relatar esperado, obtido, delta em graus/segundos de arco, modo de efeméride e veredito.
4. Falhar se corpo obrigatório estiver ausente ou houver fallback não declarado.

### C3 — casas, ângulos e limites geográficos

1. Executar Regiomontanus, Placidus, Koch, Campanus, Equal e Whole Sign (os suportados).
2. Comparar ASC, MC e cúspides; tolerância inicial de até **2 segundos de arco**, salvo limitação documentada da referência.
3. Cobrir duas latitudes altas onde certos sistemas não têm solução. Erro explícito é aceitável; casas inventadas, nunca.
4. Validar convenção leste/oeste e ordem das cúspides.

### C4 — aspectos e pontos derivados

1. Validar aspectos a partir de posições aprovadas, em precisão bruta.
2. Comparar conjunto de aspectos somente após fixar orbes e corpos.
3. Testar aplicação/separação perto do limiar de orbe.
4. Testar nós verdadeiro/médio, Lilith e Parte da Fortuna somente com definição declarada.

### C5 — trânsitos e instantes

1. Testar trânsitos em instantes UTC fixos, nunca pelo relógio atual.
2. Permitir “agora” apenas com recibo declarando `engine_clock_utc`.
3. Exigir mapa natal certificado antes de trânsito pessoal.

### C6 — relatório e gate de release

1. Gerar `reports/<run-id>.json` e resumo Markdown com aprovados, diferenças e pendências.
2. Falhar release com fixture reprovada, referência obrigatória ausente, efeméride não aprovada, recibo incompleto ou regressão acima da tolerância.
3. Só aplicar selo **Motor certificado v1** quando a execução completa passar em ambiente limpo.
4. Toda mudança de motor, efeméride, orbe, casas, fuso ou serialização exige nova execução e versão.

## Ordem atual

1. **Em curso:** C0, contrato de recibo e estrutura de fixtures.
2. **Próximo:** C1, reunir e aprovar corpus configurado.
3. **Depois:** C2 → C5, comparar e corrigir deltas.
4. **Por último:** C6, integrar no build Windows e alterar o rótulo da interface para certificado apenas se passar.

Não pular C1: sem resultados de referência com configuração conhecida, não existe comparação científica nem direito de afirmar equivalência.

## Critérios de conclusão

O objetivo “tão bom quanto Astro.com, Astro-Seek e Solar Fire” só pode ser concluído quando todas as fixtures obrigatórias estiverem aprovadas/rastreáveis, as tolerâncias C2–C5 passarem, houver execução limpa por release, o Windows contiver efemérides compatíveis, a UI distinguir cálculo certificado de auditável e um relatório de diferenças revisado acompanhar a versão.

## Procedimento para outra IA

1. Leia `AGENTS.md`, `docs/CONSTITUICAO.md`, `docs/AI_WORKING_GUIDE.md` e este documento.
2. Não altere tolerância, fixture aprovada ou versão do motor sem relatório.
3. Não faça scraping de referências nem use sessão/credenciais da pessoa; use resultados fornecidos, exportações autorizadas ou coleta manual documentada.
4. Rode `python tests/engine_reference/run_reference_checks.py` e os testes existentes antes de tocar no motor.
5. Em falha, preserve resultado, recibo e delta; corrija a causa, não apague a fixture.
