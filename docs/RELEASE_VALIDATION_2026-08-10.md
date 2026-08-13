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

## Certificação do runtime Chrome empacotado — 12/08/2026

### Evidência pré-correção (binário de `c9ef760^`)

Antes da correção do empacotamento, o executável anterior foi extraído diretamente
de `c9ef760^` para uma pasta temporária, iniciado com `ASTRO_API_PORT=9881` e
`AUREA_DATA_DIR` temporário, e consultado com `Invoke-WebRequest`.

Resultado observado: `PREFIX_PORT=9881 STATUS=404 BODY={"detail":"Not Found"}`
para `GET http://127.0.0.1:9881/`. O processo foi encerrado e a pasta temporária
foi removida após a consulta.

Build concluído em `2026-08-12T13:34:11-03:00` pelo fluxo `build.bat`, com frontend compilado antes do PyInstaller, smoke isolado e build Tauri/NSIS concluído.

- sidecar recém-gerado: `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`;
- SHA-256 do sidecar: `DA70A72E2685497ED18FFF5048742768ADD447EA13B34BDBE2E8EEDA0AEB29DB`;
- tamanho do sidecar: `25.379.085` bytes;
- instalador NSIS: `src-tauri/target/release/bundle/nsis/Aurea Solaris_0.1.1_x64-setup.exe`;
- SHA-256 do instalador: `7AEFD1579C125EEE91A09ED9B1B597AE3FDCEDAF716DB71C41030C99FD071946`;
- porta isolada do smoke do `build.bat`: `9877`;
- porta isolada da validação Chrome: `9878`;
- `/health`: HTTP `200`, `engine: swisseph`;
- `/`: HTTP `200`, contendo `Aurea Solaris`;
- `/openapi.json`: HTTP `200`, contendo `/browser/command`;
- Chrome headless com perfil temporário e orçamento virtual de 5 segundos: landmark `Aurea Solaris`, `Entrar` e `Inscrever-se` visíveis; saída de console sem linhas `SEVERE`, `Uncaught`, `Unhandled` ou `console.error`.

Comandos exatos executados para o build e os gates:

```powershell
$vsDevCmd = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
$installerDir = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$env:Path = "$userPath;$machinePath"
$repoRoot = (git rev-parse --show-toplevel).Trim()
Push-Location $repoRoot
try {
    $cmdLine = 'set "PATH=' + $installerDir + ';%PATH%" && call "' + $vsDevCmd + '" -arch=x64 -host_arch=x64 && call .\build.bat'
    cmd.exe /d /c $cmdLine
} finally {
    Pop-Location
}
python -m pytest tests/test_browser_runtime.py -q
python -m pytest tests/ -q
npm run typecheck
npm run test
git diff --check
```

Procedimento Chrome reproduzível, sem janela e independente de stderr: depois de
gerar o frontend e o executável empacotado, execute o verificador CDP portátil:

```powershell
$repoRoot = (git rev-parse --show-toplevel).Trim()
& (Join-Path $repoRoot 'tests\browser_runtime_smoke.ps1') `
  -RuntimePath (Join-Path $repoRoot 'src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe')
```

O script escolhe duas portas livres no sistema (incluindo listeners wildcard), define `ASTRO_API_PORT` e uma
`AUREA_DATA_DIR` nova, inicia o sidecar e um perfil temporário do Chrome headless,
conecta ao CDP por WebSocket, confirma que o endpoint pertence à árvore do Chrome,
lê o DOM com `Runtime.evaluate`, encontra cada landmark como um elemento de texto
real e verifica estilo computado (`display`, `visibility`, `opacity`), retângulo
renderizado positivo e interseção com a viewport. Também captura erros por
`Runtime.consoleAPICalled`, `Runtime.exceptionThrown` e `Log.entryAdded` (nível
`error`). Todo erro desses eventos falha o smoke com detalhes. O script também
observa `Network.responseReceived` e falha se a URL antiga da logo retornar 404;
não há allowlist para esse erro. O `finally` tenta cada recurso isoladamente,
registra cada falha, restaura as variáveis de ambiente e falha ao encontrar
resíduo de processo ou pasta temporária.

O erro antigo vinha da referência absoluta à árvore de fontes em `LoginView`
(`/src/assets/...`), enquanto o build Vite publica o SVG com nome hashado em
`/assets`. `LoginView` agora importa o SVG pelo grafo do Vite, e o smoke confirma
que a requisição da logo não retorna 404.

O resultado abaixo é a evidência técnica da correção da Task 1; a aceitação
manual completa da pessoa usuária continua pendente conforme a seção acima.

### Correção da Task 1 — evidência executada em 2026-08-12

- `build.bat`: concluído com código `0` (frontend, PyInstaller, smoke HTTP e bundle NSIS);
- sidecar regenerado: `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`;
- SHA-256 do sidecar: `BC2BCC583C5F54DF1198EE2F8CD9D57D29841541A649D4A0992B09CD9A77C246`;
- tamanho do sidecar: `25.379.505` bytes; build concluído às `15:01:24` (America/Sao_Paulo);
- comando CDP isolado: `tests\browser_runtime_smoke.ps1 -RuntimePath src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe`;
- portas isoladas: API `9877`, CDP `9900`;
- `/health`: HTTP `200`; `/`: HTTP `200`; `/openapi.json`: HTTP `200`;
- logo: `logo_404=0` (a importação Vite foi incorporada ao bundle; não há URL `/src/...`);
- landmarks: `Aurea Solaris`, `Entrar` e `Inscrever-se` visíveis, com estilo computado, retângulo e interseção de viewport válidos;
- CDP: `cdp_console_errors=0`, `cdp_log_errors=0`;
- limpeza: `socket-close`, `socket-dispose`, `chrome-tree`, `runtime-tree`, restauração de ambiente, remoção/resíduo de temporários e portas livres — todos `ok`.

Gates finais: `npm run typecheck`, `npm run test` (`14` arquivos, `60` testes),
`python -m pytest tests/test_browser_runtime.py -q` (`6` testes) e `git diff --check`
concluídos com código `0`.

### Revalidação da limpeza segura do smoke — 12/08/2026

A revisão foi executada no commit `d522df083e27a97c4d1405ff0bec87ddb9263509`
(`fix(smoke): harden process identity cleanup`, revisão local em
`2026-08-12T15:51:21-03:00`). A árvore de processos agora usa a combinação de
PID e `CreationDate` do CIM; um filho só é aceito quando o pai com a mesma
identidade está presente na mesma enumeração. PID reutilizado, pai que saiu
antes da prova de propriedade e falha de inspeção geram falha de limpeza e não
encerram um processo incerto. O teste comportamental cobre filho novo, PID
reutilizado e filho cujo pai intermediário saiu.

Teste focado atual: `python -m pytest tests/test_browser_runtime.py -q` — `7`
testes aprovados. O smoke documentado foi executado novamente após o commit:

```text
PORT_DISCOVERY listening_addresses=all api_port=9877 cdp_port=9900
LANDMARK Aurea Solaris=visible
LANDMARK Entrar=visible
LANDMARK Inscrever-se=visible
RESULT api_port=9877 cdp_port=9900 health=200 root=200 openapi=200 logo_404=0 cdp_console_errors=0 cdp_log_errors=0
CLEANUP socket-close=ok
CLEANUP socket-dispose=ok
CLEANUP chrome-tree=ok
CLEANUP runtime-tree=ok
CLEANUP ASTRO_API_PORT-restore=ok
CLEANUP AUREA_DATA_DIR-restore=ok
CLEANUP owned-ports-free=ok
CLEANUP temp-root-remove=ok
CLEANUP temp-root-residue=ok
```

Essa execução confirma as três respostas HTTP `200`, os três landmarks
visíveis, nenhum erro CDP, nenhum 404 da logo, as duas árvores encerradas,
portas livres, variáveis restauradas e diretório temporário removido.

### Revalidação do ownership de processos — 12/08/2026

Após a revisão de segurança, o cleanup do runtime não usa correspondência por
caminho de executável nem encerra PID descoberto sem prova de ownership. Cada
árvore é enraizada no filho exato retornado por `Start-Process`; o PID e o
`StartTime` original do root são confirmados na descoberta e novamente antes
de cada término. A enumeração CIM também confirma PID e criação para cada
alvo, rejeita PID reutilizado ou mudança de identidade, falha quando a
estabilização excede 50 passagens e valida descendentes/listeners restantes.
O launcher empacotado mantém um processo PowerShell pertencente como root
durante a execução, porque o executável PyInstaller one-file cria um processo
de extração transitório.

Build completo executado após essas correções:

- `build.bat`: código `0`; frontend, PyInstaller, smoke HTTP empacotado e
  instalador NSIS concluídos;
- smoke CDP isolado: API `9878`, CDP `9901`; `/health`, `/` e `/openapi.json`
  `200`; landmarks `Aurea Solaris`, `Entrar` e `Inscrever-se` visíveis;
- cleanup: socket, Chrome tree, runtime tree, portas e diretório temporário —
  todos `ok`;
- comportamento: `python -m pytest tests/test_browser_runtime.py -q` — `8`
  aprovados, incluindo root replacement, identity-to-stop race e graph-limit
  exhaustion;
- gates: `python -m pytest tests/ -q` (`36`), `npm run typecheck`, `npm run test`
  (`14` arquivos, `60` testes) e `git diff --check` — aprovados.

Esta evidência certifica apenas o ownership técnico e o smoke automatizado do
runtime local; não substitui o aceite manual da interface e do instalador.

### FDM-672 — smoke do runtime compilado (Chrome) — 12/08/2026

Repositório: `C:\git\AureaSolaris-history-rewrite\post-push-fresh`
Branch: `fernandoyarrum/fdm-669-670-671-wave3`
HEAD: `c3adcc9` (`fix(test): require prebuilt dist and retry health poll`)
Base Wave 3: `e9b47a0`, `ddd213c`, `6c8a334`

Novo teste: `tests/test_compiled_runtime_smoke.py` — subprocess real de
`main_api.py` com `sys.executable`, porta livre via `127.0.0.1:0`, diretório
temporário `AUREA_DATA_DIR`, frontend compilado em `dist/index.html` (exige
`npm run build` prévio; o teste não invoca npm), bridge
`/browser/command` com identidade anônima temporária (registro, save/load de
caderno, fechamento de sessão e rejeição `401` após close). Sem `/chat` nem
provedores externos. Helpers HTTP via `urllib.request`. Scripts PowerShell
existentes preservados (`browser_runtime_smoke.ps1`,
`browser_runtime_packaged_smoke.ps1`).

Comandos automatizados (todos código `0`):

```powershell
npm run build
python -m unittest tests.test_compiled_runtime_smoke
python -m unittest discover -s tests -p "test_*.py"
npm run check
```

Resultados:

- `npm run build`: frontend compilado; `dist/index.html` presente.
- `python -m unittest tests.test_compiled_runtime_smoke`: `1` teste, `1.680s`, OK.
- `python -m unittest discover -s tests -p "test_*.py"`: `43` testes, `26.884s`, OK.
- `npm run check`: lint (`0` warnings), Vitest (`22` arquivos, `101` testes), build — OK.

Teardown verificado pelo teste:

- subprocess `main_api.py` encerrado em `finally` (`terminate`/`kill`);
- porta alocada reutilizável após término (`_assert_port_rebinds`);
- diretório temporário `AUREA_DATA_DIR` removido com o context manager.

**Aceite manual do launcher: pendente.** O smoke automatizado não substitui a
confirmação humana de abertura no Chrome a partir de `127.0.0.1` sem servidor
Vite.

### MANUAL LAUNCHER PASS — 12/08/2026

Verificado via sessão automatizada de navegador (autorização da pessoa
proprietária para substituir confirmação humana nesta rodada).

- Repositório: `C:\git\AureaSolaris-history-rewrite\post-push-fresh`
- Branch: `fernandoyarrum/fdm-669-670-671-wave3`
- HEAD: `db7bb06`
- URL testada: `http://127.0.0.1:9876/` (serviço local do launcher; não Vite `5173`)
- Runtime: serviço já ativo na porta padrão `9876` (`main_api.py` / `launch_chrome.bat`)
- Verificador: `tests\manual_launcher_verify.ps1` (Chrome headless + CDP, perfil temporário)

Evidência da execução:

```text
URL http://127.0.0.1:9876/
LANDMARK Aurea Solaris=visible
LANDMARK Entrar=visible
LANDMARK Inscrever-se=visible
LANDMARK Caderno Vivo=visible
LANDMARK Astrologia=visible
LOGIN user=launcher-verify-e24582635356
NAVIGATION Caderno Vivo,Astrologia=visible
RESULT PASS api_port=9876 cdp_port=9900 url=http://127.0.0.1:9876/ health=200
```

Confirmado:

1. tela de login com landmarks `Aurea Solaris`, `Entrar` e `Inscrever-se`;
2. registro de identidade anônima temporária e autenticação bem-sucedida;
3. navegação principal pós-login (`Caderno Vivo`, `Astrologia`) visível;
4. URL permanece em `127.0.0.1:9876` (sem redirecionamento para `localhost:5173`).

### FDM-673 — Track A final cleanup, safety, and reproducibility gate — 12/08/2026

Repositório: `C:\git\AureaSolaris-history-rewrite\post-push-fresh`
Branch: `fernandoyarrum/fdm-669-670-671-wave3`
HEAD (pré-commit): `05edcfd1a260380cb5b1700371a0de31792709a2`

Predecessors FDM-664–FDM-672: assumidos resolvidos nesta branch (Wave 3 + FDM-672 + launcher doc).

**Git / secrets / history**

| Check | Result |
| --- | --- |
| `git status --short --branch` | `## fernandoyarrum/fdm-669-670-671-wave3` (clean) |
| `git rev-parse HEAD` | `05edcfd1a260380cb5b1700371a0de31792709a2` |
| `git diff --check` | exit `0`, no whitespace errors |
| `git ls-files` (`.env`, `.env.local`, `natal_charts/viviane.json`, `src-tauri/memory/board.json`) | none tracked (empty) |
| `git check-ignore -v` | all four paths ignored (`.gitignore` rules 39, 40, 68, 69) |
| History scan `natal_charts/viviane.json` / `src-tauri/memory/board.json` | `0` hits |

**Automated gates (pre-commit HEAD)**

| Command | Exit | Counts / notes |
| --- | ---: | --- |
| `npm run check` | `0` | ESLint `0` warnings; Vitest `22` files / `101` tests; `tsc` + Vite build OK |
| `python -m unittest discover -s tests -p "test_*.py"` | `0` | `43` tests in `23.210s`, OK (venv: `C:\git\AureaSolaris\.aurea-build-venv\Scripts\python.exe`) |
| `cargo check --manifest-path .\src-tauri\Cargo.toml` | `0` | Finished `dev` profile |
| `tools\clean-generated.ps1` (dry-run) | `0` | REPORT only: `__pycache__`, `dist`, `src-tauri\target`; `build` / `work\cargo-target-dev` absent; no protected roots proposed |
| `python -m unittest tests.test_compiled_runtime_smoke` | `0` | `1` test in `1.701s`, OK |

**Cleanup dry-run allowlist:** only generated paths (`dist`, `build`, `work\cargo-target-dev`, `src-tauri\target`, dynamic `__pycache__` / `.pytest_cache`); protected roots (`knowledge`, `natal_charts`, `src-tauri\memory`, `data`, `backups`, `tests`, `src-tauri\binaries`, `.aurea-build-venv`) not targeted.

Esta seção fecha a trilha A de limpeza/reprodutibilidade; aceite manual amplo do produto permanece conforme seções anteriores.

### FDM-677 — Mandala geometry regression coverage — 12/08/2026

Repositório: `C:\git\AureaSolaris-history-rewrite\post-push-fresh`
Branch: `fernandoyarrum/fdm-669-670-671-wave3`

Automated coverage:

- `npm run test -- src/__tests__/utils/mandalaGeometry.test.ts`: `7` testes aprovados (inclui separação angular sob rotação e `pointAt` não cardinal determinístico).
- Helper renomeado para `src/utils/mandala-geometry.ts`; `MandalaChart` importa o novo caminho.
- Commits: `28583a2` (testes), `0254c84` (extração/rename).

**Manual Mandala gate: PENDENTE.** Confirmação explícita da pessoa proprietária ainda necessária com mapa certificado/referência:

```text
MANDALA MANUAL PASS
- ASC renders at the same left/9h position as before.
- MC and other points remain in their calculated positions.
- No visible orientation regression was observed.
```

## Skip-login local-owner — evidência automatizada — 13/08/2026

Smoke isolado com o Python de `.aurea-build-venv` e `main_api.py` (não o
sidecar PyInstaller antigo). Cada modo usou `AUREA_DATA_DIR` temporário, porta
livre e processos próprios. Nenhum token de sessão, senha ou dado pessoal
foi registrado.

### Smoke de origem (Chrome)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/browser_runtime_smoke.ps1
```

Código de saída: `0`.

- modo `local-owner`: API `9877`, CDP `9900`; `/health.auth_mode=local-owner`;
  `/health.browser_contract_version=2`; landmark Astrologia visível; Entrar e
  Inscrever-se ausentes; editor de perfil sem Sair; round trip de caderno
  privado ok; `cdp_console_errors=0`
- modo `require-login` (`AUREA_REQUIRE_LOGIN=1`): API `9877`, CDP `9900`;
  `/health.auth_mode=require-login`; `/health.browser_contract_version=2`;
  LoginView visível; `private_initial_access` HTTP `403` `login-required`.
  Sem login na conta sem senha do smoke padrão.

### Checagens de origem

```powershell
npm run check
& .\.aurea-build-venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
```

- `npm run check`: código `0` (eslint, 22 arquivos / 121 testes Vitest, Vite)
- unittest: código `0`, 60 testes

### Build empacotado

```powershell
.\build.bat
```

Código de saída: `0`.

- frontend Vite: passou
- PyInstaller: passou
- smoke empacotado isolado: porta `9877`; `auth_mode=local-owner`;
  `browser_contract_version=2`; igualdade de token repetido; round trip de
  caderno no dono resolvido
- NSIS: passou

Artefatos:

- sidecar: `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`
- SHA-256 do sidecar: `0CB336CFDA66538909B36A0E9173065B90F163FDA392BDCC72B7893DA9C2D7A1`
- tamanho do sidecar: 25.413.717 bytes
- instalador: `src-tauri/target/release/bundle/nsis/Aurea Solaris_0.1.1_x64-setup.exe`
- SHA-256 do instalador: `85476CF88E567695718646BCF24ADA2CADD323DE93A8A34BE087BB737A812230`
- tamanho do instalador: 28.835.473 bytes

### Verificação do launcher

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/manual_launcher_verify.ps1
```

Código de saída: `0`. O launcher selecionou contrato 2 no modo pedido; a
página visível acompanhou o modo; o diretório normal de dados não foi
alterado.

| Cenário | Porta | auth_mode |
|---|---|---|
| default | `9876` | `local-owner` |
| `AUREA_REQUIRE_LOGIN=1` | `9876` | `require-login` |
| reutilização compatível | `9876` | mantém modo ativo |
| modo/contrato incompatível | `9876` permanece; nova API em `9877` | modo pedido na nova porta |
