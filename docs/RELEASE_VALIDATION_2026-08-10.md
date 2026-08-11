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

## Revalidação do sidecar commitado — 11/08/2026

O executável commitado em `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe` foi executado em porta e diretório de dados temporários isolados.

- SHA-256 conferido: `EF698F141E1A6CB5BEB3F3B5593175EC1ACED65EA39189969B34573E4D755DA5`;
- health: `ok`, motor `swisseph`, porta isolada `19876`;
- fixture natal: `2000-01-01 12:00`, `America/Sao_Paulo`, offset explícito `-120`, São Paulo, sistema `Regiomontanus`;
- resultado: 13 corpos, 12 casas e 9 aspectos;
- recibo: `calculation-receipt.v1`, tipo `natal`, UTC `2000-01-01T14:00:00Z`;
- hash da entrada desta requisição: `81853654a5e859fb80bab8408ff79f226caedb35423839771892d4fdf9981e2e`;
- motor declarado no recibo: `aurea-solaris-astro-engine 2026.08.audit-1`.

A verificação foi concluída com sucesso contra o binário commitado. O hash `6d4a...` registrado na evidência histórica corresponde a uma requisição anterior com parâmetros diferentes (Placidus e offset omitido), portanto não é o hash da requisição acima.

## Build limpo do instalador — 11/08/2026

`build.bat` foi executado a partir do commit limpo `4fc14f7` e terminou com código `0`.

- TypeScript/Vite: aprovado, 2348 módulos transformados;
- PyInstaller: aprovado;
- Rust/Tauri release: aprovado;
- NSIS: aprovado, instalador gerado em `src-tauri/target/release/bundle/nsis/Aurea Solaris_0.1.1_x64-setup.exe`;
- sidecar gerado e copiado pelo script: SHA-256 `880FF72239511B7FA10E3D1C4C0DD2BD588C854298F407599D26B1518964AB76`, 24.475.831 bytes;
- instalador gerado: SHA-256 `9E51F8DEF0619BA05B1A1A17B9C6B656298143443B4B131ABD49D425D1E4FFC7`, 27.937.675 bytes;
- smoke do sidecar gerado: health `ok`, `swisseph`, 13 corpos, 12 casas, 9 aspectos, recibo natal válido e UTC `2000-01-01T14:00:00Z`.

O ambiente local de build estava sem `argon2-cffi`, embora a dependência já estivesse declarada em `requirements-api.txt`; ela foi instalada no `.aurea-build-venv` antes da execução final. O primeiro executável gerado sem essa dependência não iniciava. Após a instalação declarada, o build e o smoke passaram. Os bytes do PyInstaller variam entre execuções (hashes diferentes e comportamento funcional equivalente), portanto a comparação de release foi feita pelo contrato de execução e pelo smoke certificado.
