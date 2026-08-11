# Tudo é Mente — memória contextual do Hermes

Atualizado em 10/08/2026. Esta é uma decisão canônica do Aurea Solaris.

**Estado de implementação:** o modelo e as migrações existem; a persistência e a recuperação pelo chat ainda serão implementadas na primeira vertical da Fase 2. Até lá, o Hermes não pode alegar que recordará uma conversa após a tela ser fechada.

## Princípio

Tudo o que a pessoa organiza e estuda no Aurea pode formar o contexto durável do Hermes. Uma conversa sobre a sinastria de duas pessoas deve poder ser retomada depois sem recomeçar do zero. Essa continuidade pertence ao Aurea Solaris e à pessoa, não ao provedor de IA.

Memória não significa misturar categorias. O Hermes deve preservar e apresentar separadamente:

1. valor astronômico calculado, acompanhado do recibo do Motor;
2. afirmação da Engenharia Astrológica, acompanhada de fonte, autor e escola;
3. fala, nota ou preferência pessoal;
4. inferência do Hermes, identificada como inferência;
5. divergência ou contradição encontrada entre os itens anteriores.

## O que deverá persistir

- conversas, mensagens e o tema ativo;
- pessoas, mapas e relações mencionadas no estudo, respeitando `owner_id` e consentimento;
- notas e objetos do Caderno Vivo usados como evidência;
- referências a cálculos por hash de recibo, nunca posições copiadas sem origem;
- memórias destiladas, com evidência, estado, confiança e data de uso;
- alertas de contradição e a decisão posterior da pessoa.

O histórico explícito de estudo será preservado e indexado automaticamente. Conclusões produzidas pelo Hermes não viram verdade pessoal silenciosamente: nascem como inferência ou memória proposta. Correções e instruções da pessoa podem ser confirmadas e passam a prevalecer no método pessoal sem alterar a base editorial.

## Recuperação de contexto

Antes de responder, o Hermes deve:

1. identificar proprietário, tema, pessoas e mapas do pedido atual;
2. recuperar somente conversas, notas e memórias desse proprietário;
3. recuperar cálculos auditáveis pertinentes;
4. consultar conceitos, afirmações, fontes, escolas e divergências da Engenharia Astrológica;
5. detectar possíveis contradições;
6. montar uma resposta na qual cada categoria de proveniência permaneça visível.

Uma retomada de sinastria deve localizar o fio anterior pelas duas pessoas, mapas, técnica e tema, mesmo que as palavras usadas na nova pergunta sejam diferentes.

## Contradições

Uma discordância não apaga a memória da pessoa. O Hermes apresenta:

- qual pensamento ou memória entrou em tensão;
- qual afirmação da base diverge;
- fonte, autor, escola e localização da afirmação;
- se é contradição direta, qualificação ou diferença entre escolas;
- opções: manter a visão pessoal, revisar a memória, seguir a fonte, comparar escolas ou marcar como não aplicável.

Sem uma afirmação editorial rastreável, o Hermes não pode declarar que a Engenharia Astrológica contradiz algo.

## Apagar e corrigir

“Esquecer isto” remove imediatamente o item da recuperação e cria um evento de auditoria sem repetir o conteúdo apagado. A remoção definitiva deve abranger índices derivados e respeitar uma política transparente de expiração de backups. Enquanto a limpeza física de backups não estiver implementada, a interface não deve prometer destruição irrecuperável.

A pessoa pode inspecionar, corrigir, fundir, arquivar, exportar e apagar suas memórias. O Hermes nunca apaga conhecimento editorial compartilhado ao apagar uma memória pessoal.

## Modelo de dados entregue na Fase 2

A migração `src-tauri/migrations/private/0005_hermes_mind.sql` cria:

- `hermes_thread`;
- `hermes_message` com `provenance_kind`;
- campos contextuais e de origem em `hermes_memory`;
- `hermes_memory_evidence`;
- `hermes_contradiction_review`;
- índices e vínculos que impedem associação entre proprietários diferentes.

Referências a `knowledge.sqlite` são IDs estáveis e snapshots citáveis, pois as bases privada e editorial continuam fisicamente separadas.

Essas tabelas ainda não são usadas por `HermesChat`, `MesaCriacao` ou `MemoriasView`; conectá-las é o próximo incremento obrigatório.

## Próximos incrementos obrigatórios

1. CRUD privado com consultas sempre filtradas por `owner_id`.
2. Registro de conversa do Hermes e reabertura por tema.
3. Indexação local de pessoas, mapas, conceitos e notas.
4. Recuperação híbrida com limite e explicação das evidências usadas.
5. Comparador de afirmações contra `knowledge.sqlite`.
6. painel “Memória do Hermes” para revisar, corrigir e esquecer.
7. limpeza de índices e política verificável de retenção de backups.

Nenhum desses passos autoriza envio de dados pessoais a um provedor externo sem escolha e consentimento visíveis.
