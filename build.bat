@echo off
setlocal
set "PROJECT_ROOT=%~dp0"

pushd "%PROJECT_ROOT%"

if not exist ".aurea-build-venv\Scripts\python.exe" (
    echo ERRO: ambiente de build do motor nao encontrado.
    echo Crie .aurea-build-venv e instale requirements-api.txt antes do release.
    popd
    exit /b 1
)

echo [1/4] Gerando a interface web compilada...
call npm.cmd run build
if errorlevel 1 (
    echo ERRO: falha ao gerar a interface web compilada.
    popd
    exit /b 1
)
if not exist "dist\index.html" (
    echo ERRO: dist\index.html nao foi gerado; o empacotamento foi interrompido.
    popd
    exit /b 1
)

echo [2/4] Gerando o sidecar empacotado...
".aurea-build-venv\Scripts\python.exe" -m PyInstaller --clean --noconfirm build_sidecar.spec
if errorlevel 1 (
    echo ERRO: falha ao gerar o motor astrologico.
    popd
    exit /b 1
)
if not exist "dist\astro-engine-x86_64-pc-windows-msvc.exe" (
    echo ERRO: o executavel do sidecar nao foi gerado.
    popd
    exit /b 1
)

copy /Y "dist\astro-engine-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe" >nul
if errorlevel 1 (
    echo ERRO: falha ao preparar o motor para o instalador.
    popd
    exit /b 1
)
if not exist "src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe" (
    echo ERRO: o executavel do sidecar nao foi copiado.
    popd
    exit /b 1
)

echo [3/4] Validando o executavel empacotado em ambiente isolado...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $exe = (Resolve-Path 'src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe').Path; $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-packaged-smoke-' + [guid]::NewGuid().ToString('N')); $dataDir = Join-Path $tempRoot 'data'; $stdout = Join-Path $tempRoot 'stdout.log'; $stderr = Join-Path $tempRoot 'stderr.log'; New-Item -ItemType Directory -Path $dataDir -Force | Out-Null; $port = 9877; while (($port -le 9899) -and (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) { $port++ }; if ($port -gt 9899) { throw 'Nenhuma porta livre no intervalo 9877-9899.' }; $previousPort = $env:ASTRO_API_PORT; $previousDataDir = $env:AUREA_DATA_DIR; $existingProcessIds = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $exe } | Select-Object -ExpandProperty ProcessId); $env:ASTRO_API_PORT = [string]$port; $env:AUREA_DATA_DIR = $dataDir; $process = Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden; try { $ready = $false; for ($attempt = 0; $attempt -lt 30; $attempt++) { Start-Sleep -Milliseconds 500; if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break } }; if (-not $ready) { throw 'O executavel empacotado nao abriu a porta isolada.' }; $base = 'http://127.0.0.1:' + [string]$port; $health = Invoke-WebRequest -Uri ($base + '/health') -UseBasicParsing -TimeoutSec 10; $healthJson = $health.Content | ConvertFrom-Json; if (($health.StatusCode -ne 200) -or ($healthJson.engine -ne 'swisseph')) { throw ('Health invalido: ' + $health.Content) }; $root = Invoke-WebRequest -Uri ($base + '/') -UseBasicParsing -TimeoutSec 10; if (($root.StatusCode -ne 200) -or ($root.Content -notmatch 'Aurea Solaris')) { throw 'A raiz nao serviu a interface compilada.' }; $openapi = Invoke-WebRequest -Uri ($base + '/openapi.json') -UseBasicParsing -TimeoutSec 10; if (($openapi.StatusCode -ne 200) -or ($openapi.Content -notmatch '/browser/command')) { throw 'OpenAPI nao contem /browser/command.' }; Write-Host ('SMOKE PASS port=' + $port + ' health=200 engine=swisseph root=200 openapi=200'); } finally { $targetProcesses = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $exe -and $existingProcessIds -notcontains $_.ProcessId }); foreach ($targetProcess in $targetProcesses) { Stop-Process -Id $targetProcess.ProcessId -Force -ErrorAction SilentlyContinue }; if ($process -and (-not $process.HasExited)) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }; if ($null -eq $previousPort) { Remove-Item Env:ASTRO_API_PORT -ErrorAction SilentlyContinue } else { $env:ASTRO_API_PORT = $previousPort }; if ($null -eq $previousDataDir) { Remove-Item Env:AUREA_DATA_DIR -ErrorAction SilentlyContinue } else { $env:AUREA_DATA_DIR = $previousDataDir }; Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue; }"
if errorlevel 1 (
    echo ERRO: o smoke test do executavel empacotado falhou.
    popd
    exit /b 1
)

rem NSIS is the supported Windows installer. MSI/WiX is optional and must not
rem invalidate a successful application build when the external WiX tool fails.
echo [4/4] Gerando o aplicativo e o instalador NSIS...
call npm.cmd run tauri -- build --bundles nsis
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %BUILD_EXIT_CODE%
