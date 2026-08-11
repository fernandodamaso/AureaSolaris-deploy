# Biblioteca Visual do Aurea Solaris

A Biblioteca Visual é a porta de acesso, dentro do próprio Aurea, ao corpus da Engenharia Astrológica.

Estado atual em 11 de agosto de 2026:

- a interface do aplicativo já expõe uma página própria de Biblioteca;
- o corpus editorial foi vendorizado no repositório em `knowledge/engenharia_astrologica/`;
- o snapshot embutido para consulta rápida está em `knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite`;
- na primeira inicialização, o snapshot é importado de forma idempotente e rastreável para o `knowledge.sqlite` do runtime.

Princípios:

- a Biblioteca preserva tradições, divergências, notas de escopo e proveniência;
- material canônico e material não consensual podem coexistir, desde que corretamente rotulados;
- curiosidades, etimologias, lendas, camadas históricas e diferenças entre escolas continuam parte do estudo;
- o motor do produto deve distinguir consenso técnico, variante de escola, hipótese interpretativa e nota histórica.

Regra operacional:

- o importador cria um manifesto com SHA-256, preserva os documentos YAML e usa identificadores ligados ao snapshot; ele não sobrescreve uma versão editorial anterior;
- `knowledge.sqlite` é a camada prioritária de consulta depois da instalação. O snapshot embutido é apenas contingência para uma instalação antiga sem carga canônica.
