# Constituição do Aurea Solaris

Este é o documento-base para pessoas, IDEs e LLMs. Em caso de conflito, ele prevalece sobre telas, planos antigos e código legado.

O roteiro canônico de execução está em [ROADMAP.md](ROADMAP.md). Ele define dependências, verticais de entrega e o que fica fora de escopo em cada etapa.

## Missão

O Aurea Solaris é um caderno vivo local-first para astrologia, estudo e organização pessoal. Caderno espacial (tipo Miro) e caderno de estudo são duas visões dos mesmos itens e relações; não são produtos nem cópias separadas.

## Dois domínios, duas responsabilidades

1. **Conhecimento astrológico editorial**: conceitos, fontes, afirmações, tradições/escolas, cálculos documentados e relações. É plural, rastreável e não pertence a um perfil individual.
2. **Espaço privado da pessoa**: perfil, consentimento, mapas autorizados, diário, notas, tarefas, agenda, preferências, método interpretativo e memória aprovada do Hermes. Cada registro tem proprietário e nunca deve vazar para outra pessoa ou para o banco editorial.

Uma afirmação pode divergir de outra. O sistema preserva autor, tradição, fonte, trecho, revisão, incerteza e relação de concordância/contradição. Nunca elimina uma tradição apenas para simplificar a interface.

## Precisão astrológica

Precisão e confiabilidade são inegociáveis. Todo cálculo preserva instante UTC, fuso IANA, local, zodíaco, ayanamsa quando aplicável, casas, orbes, pontos, versão de efemérides/motor e hash de entrada. Não há fallback silencioso que invente posições, nodos, retrogradação ou aspectos. Mudanças do motor exigem testes de referência, versionamento e relatório de diferença.

## Hermes

Hermes é tutor e parceiro de estudo: explica o raciocínio, distingue cálculo/fonte/inferência/opinião, corrige com respeito e cita as fontes. Ele consulta primeiro o conhecimento curado; pesquisa externa só dentro de fontes e consentimentos configurados. Memórias sobre o método da pessoa são propostas revisáveis e só se tornam persistentes após aprovação. Hermes nunca cria tarefas, eventos ou registros privados silenciosamente.

Hermes é uma identidade de produto independente do modelo de IA. O ChatGPT pode ser o provedor inicial, mas cada conta pode escolher ou trocar o servidor/modelo autorizado. A troca nunca migra senhas, tokens, histórico integral ou dados privados para o novo provedor. O método, as memórias aprovadas, as anotações, as fontes e o conhecimento produzido pertencem ao Aurea e à pessoa, não ao agente usado em uma conversa.

## Enciclopédia e biblioteca pessoal

A **Enciclopédia Visual** é a Engenharia Astrológica incorporada ao Aurea Solaris: uma biblioteca de referência interna, consultável apenas pelo aplicativo, com fontes, tradições e relações visuais preservadas. Ela não substitui a vivência ou as anotações da pessoa.

O motor e a Enciclopédia obedecem a um contrato normativo explícito: a regra computável sempre identifica escola, variante, parâmetros e fonte; notas divergentes, curiosidades, etimologias, mitos e camadas não canônicas continuam estudáveis, mas não podem aparecer como default silencioso do cálculo.

Cada conta também possui uma biblioteca pessoal: livros, PDFs, artigos, links e sites cadastrados pela própria pessoa. Arquivos de saúde, como exames, são anexos privados de alta sensibilidade e só são lidos, resumidos ou usados por Hermes após solicitação explícita. Uma pessoa pode estudar todas as escolas em comparação — como Vivi — ou configurar suas próprias preferências sem que o produto apague as demais fontes.

## Escala de produto

Hoje, o Aurea é um aplicativo de computador local, projetado primeiro para a tela de um notebook como o Galaxy Book 4 Ultra. A arquitetura deve permanecer responsiva e preparada para tablet/mobile no futuro, mas não comprometer a clareza e profundidade da experiência desktop. O mesmo instalador deve poder atender pessoas distintas: cada conta possui dados, preferências, integrações, consentimentos e memória Hermes isolados.

## Privacidade e acesso

O aplicativo é local-first hoje e poderá ser online depois sem mudar estes princípios. Senhas não são armazenadas em texto aberto. Segredos e tokens não ficam no frontend, em `localStorage`, em prompts ou em arquivos versionados; ficam em cofre criptografado local até existir infraestrutura de segredos no modo online. Login, sessão, dono do dado, permissões, backup, exportação e exclusão são requisitos de fundação.

## Agenda, saúde e autonomia

Agenda, tarefas, janelas astrológicas e diário compartilham o fluxo `mapa → janela → intenção → plano → tarefa/evento → reflexão → aprendizado`. Google Calendar e adaptadores externos são opcionais, não fonte de verdade. Saúde/astrologia médica é estudo e observação, nunca diagnóstico, prescrição ou substituto de cuidado profissional.

## Regra para toda mudança

Antes de criar uma tela ou recurso, declare o objeto que ela representa, sua fonte de verdade, como a pessoa revisa/desfaz/exporta e como Hermes explica origem e incerteza. Documentação, migrações e testes fazem parte da entrega.
