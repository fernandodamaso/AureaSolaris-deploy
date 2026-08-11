# Validação da limpeza — 11/08/2026

Esta limpeza remove implementações abandonadas, planos concluídos, dependências
sem uso e saídas locais reproduzíveis. Ela não remove conteúdo editorial nem
dados privados da pessoa usuária.

## Acervo astrológico protegido

O acervo incorporado no commit `3a06cd2` foi identificado antes da limpeza e
permanece em `knowledge/engenharia_astrologica/`, junto dos contratos e do
playbook em `docs/` e `docs/data/`.

- árvore Git antes da limpeza: `eef99d1a24f0112e5a43abb1fccee7cc7756b870`;
- arquivos rastreados no acervo: `613`;
- snapshot editorial: `knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite`;
- tamanho do snapshot: `7.966.720` bytes;
- SHA-256 do snapshot: `6B0959FECEAC5BF6626A82E0ABC842A467F1FFC08DC74669A59676FBC5F26706`.

O espelho ignorado em `docs/knowledge/` foi removido porque duplicava a fonte
canônica acima.

## Instalador preservado

Antes de limpar `src-tauri/target/`, o instalador `0.1.1` foi copiado para a
pasta local ignorada `backups/release/` e comparado byte a byte por SHA-256.

- arquivo: `backups/release/Aurea Solaris_0.1.1_x64-setup.exe`;
- tamanho: `27.937.675` bytes;
- SHA-256: `9E51F8DEF0619BA05B1A1A17B9C6B656298143443B4B131ABD49D425D1E4FFC7`;
- verificação da cópia: aprovada.

O instalador é recuperável nessa pasta local, mas não faz parte do Git.

## Recuperação

Arquivos rastreados removidos continuam recuperáveis pelo histórico Git
anterior ao commit desta limpeza. Ambientes Python, dependências Node, alvos
Cargo e bancos intermediários removidos são reproduzíveis pelos comandos de
build e importação documentados.
