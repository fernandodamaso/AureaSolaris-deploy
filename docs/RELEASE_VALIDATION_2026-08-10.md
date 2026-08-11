# Validação do instalador — 10/08/2026

## Pacote validado

- Repositório: `C:\Users\vivic\Documents\Codex\AureaSolaris`
- Formato suportado: NSIS `.exe`
- Arquivo: `src-tauri\target\release\bundle\nsis\Aurea Solaris_0.1.0_x64-setup.exe`
- SHA-256: `FC140D3592203E3605EFC10C36A0D749A0ABE82474701DD7C99679511E2EB3C1`
- Tamanho: 26.456.645 bytes

O MSI antigo não representa este release. O build oficial usa NSIS até o pipeline WiX ser tratado separadamente.

## Correções incorporadas ao release

- Vite usa `--configLoader runner` no build para não depender da leitura de diretórios ancestrais bloqueados.
- `build.bat` recompila o sidecar antes de cada instalador e interrompe o release se isso falhar.
- `backports.tarfile==1.2.0` foi fixado e empacotado.
- `tzdata==2025.2` foi fixado e empacotado para resolver fusos IANA no executável Windows.
- O pacote Tauri inclui exatamente o sidecar recém-gerado.

## Resultado técnico

- TypeScript/Vite: passou, 2.343 módulos transformados.
- Testes frontend: 5 arquivos e 33 testes passaram.
- Testes do motor: 3 testes passaram, incluindo rejeição de fuso não especificado.
- Rust/Tauri release: passou.
- NSIS: passou.
- Instalação silenciosa isolada em `work\install-test`: código de saída 0.
- Sidecar executado a partir da pasta instalada: saudável, motor `swisseph`, porta 9876.

Fixture técnica, sem dados pessoais:

- instante local: `01/01/2000 12:00`;
- fuso: `America/Sao_Paulo`;
- coordenadas: São Paulo, usadas apenas como fixture;
- UTC resolvido: `2000-01-01T14:00:00Z`;
- offset histórico: `-120` minutos;
- saída: 13 corpos, 12 cúspides e 9 aspectos;
- recibo: `calculation-receipt.v1`;
- hash da entrada: `6d4a8ebcba919bc57d40bfa724ab0aed28cf21e9caaa5f3a01bdeed5310371f9`;
- efeméride declarada: Swiss Ephemeris.

## Validação visual da interface compilada

A mesma compilação frontend foi servida localmente e inspecionada no navegador:

- entrada e criação de identidade exibem estados de validação;
- perfil sem nascimento mostra “Sem cálculo astronômico auditável” e não desenha mapa;
- ação Atualizar fica indisponível com causa visível;
- Caderno Vivo abre como superfície própria;
- Agenda abre e o modal de compromisso nasce da ação correspondente;
- Hermes só abre por ação explícita;
- painel de proveniência distingue cálculo, regra, fonte, inferência e anotação pessoal.

Foi usado um perfil temporário chamado `Teste de Interface`, somente no armazenamento isolado do navegador local. Nenhum dado natal fictício foi criado.

## Pendência manual final

O ambiente não conseguiu enumerar/capturar janelas nativas do Windows. Portanto, ainda é necessário abrir o instalador no Windows normal e confirmar visualmente:

1. abertura e fechamento da janela;
2. layout em 100% e 125% de escala;
3. navegação Astrologia → Caderno Vivo → Agenda;
4. abertura/fechamento do Hermes;
5. cálculo após informar dados reais confirmados;
6. reinício preservando os dados;
7. desinstalação.

Essa pendência não invalida o build técnico, mas impede declarar a Etapa 1 totalmente encerrada.
# Release 0.1.1 — correção do Motor e Mandala

Gerada em 11/08/2026 para corrigir o sidecar que encerrava antes de abrir a API local, a data UTC em fusos que atravessam a meia-noite e rótulos derivados indevidos na Mandala.

- instalador: `src-tauri/target/release/bundle/nsis/Aurea Solaris_0.1.1_x64-setup.exe`;
- SHA-256 do instalador: `E4EAAFB894E74B291AB09B9D92805B521DAC8620F10DC97F185CA94DE3C3FFA6`;
- sidecar: `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`;
- SHA-256 do sidecar: `EF698F141E1A6CB5BEB3F3B5593175EC1ACED65EA39189969B34573E4D755DA5`;
- tamanho do sidecar: 22.545.555 bytes;
- snapshot editorial: `knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite`;
- SHA-256 do snapshot editorial: `6B0959FECEAC5BF6626A82E0ABC842A467F1FFC08DC74669A59676FBC5F26706`;
- TypeScript, 45 testes de interface, 11 testes Python e build Tauri: aprovados;
- smoke do sidecar empacotado: saúde local, 12 casas e recibo natal aprovados em porta isolada;
- pendência de aceite: abrir a janela nativa desta versão e verificar Mandala + Hermes com os dados confirmados da pessoa.
