$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $projectRoot '.aurea-build-venv\Scripts\python.exe'
$packagedRuntime = Join-Path $projectRoot 'src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe'
$distIndex = Join-Path $projectRoot 'dist\index.html'

if (Test-Path -LiteralPath $venvPython) {
    $runtimeExecutable = $venvPython
    $runtimeArguments = @((Join-Path $projectRoot 'main_api.py'))
} elseif (Test-Path -LiteralPath $packagedRuntime) {
    $runtimeExecutable = $packagedRuntime
    $runtimeArguments = @()
} else {
    throw "Nenhum runtime local do Aurea foi encontrado. Prepare .aurea-build-venv ou use o sidecar empacotado em $packagedRuntime."
}
$npmAvailable = [bool](Get-Command npm.cmd -ErrorAction SilentlyContinue)

# A pessoa só precisa clicar no launcher depois que a interface foi preparada.
# Em um checkout de desenvolvimento, fazemos a primeira compilação uma vez;
# depois o runtime usa apenas o Python compilado e o Chrome.
if (-not (Test-Path -LiteralPath $distIndex)) {
    if (-not $npmAvailable) {
        throw "A interface compilada não foi encontrada. Execute npm install e npm run build uma vez neste computador."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
        Push-Location $projectRoot
        try { npm.cmd install } finally { Pop-Location }
    }
    Write-Host '[INFO] Preparando a interface compilada para o primeiro uso...'
    Push-Location $projectRoot
    try { npm.cmd run build } finally { Pop-Location }
    if (-not (Test-Path -LiteralPath $distIndex)) {
        throw 'A interface não foi compilada corretamente.'
    }
}

function Test-PortBusy([int]$port) {
    $tcp = New-Object Net.Sockets.TcpClient
    try {
        $tcp.Connect('127.0.0.1', $port)
        return $true
    } catch {
        return $false
    } finally {
        $tcp.Dispose()
    }
}

function Get-FreePort([int]$first, [int]$last) {
    for ($port = $first; $port -le $last; $port++) {
        if (-not (Test-PortBusy $port)) { return $port }
    }
    throw "Não foi encontrada uma porta local livre entre $first e $last."
}

$apiPort = 9876
$apiUrl = "http://127.0.0.1:$apiPort"
$apiReady = $false
try {
    $openapi = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$apiUrl/openapi.json" | ConvertFrom-Json
    $apiReady = $openapi.paths.PSObject.Properties.Name -contains '/browser/command'
} catch {
    $apiReady = $false
}
if (-not $apiReady) {
    if (Test-PortBusy $apiPort) {
        $apiPort = Get-FreePort 9877 9899
        $apiUrl = "http://127.0.0.1:$apiPort"
        Write-Host "[INFO] A porta padrão está ocupada; usando a porta local livre $apiPort."
    }
    Write-Host "[INFO] Iniciando o serviço local na porta $apiPort..."
    $env:ASTRO_API_PORT = [string]$apiPort
    Start-Process -FilePath $runtimeExecutable -ArgumentList $runtimeArguments -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null
} else {
    Write-Host '[INFO] Serviço local compatível já estava ativo.'
}

$uiUrl = "$apiUrl/"
Write-Host '[INFO] Aguardando o serviço local e a interface compilada...'
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $health = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$apiUrl/health"
        $openapi = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$apiUrl/openapi.json" | ConvertFrom-Json
        $ui = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri $uiUrl
        if ($health.StatusCode -eq 200 -and $openapi.paths.PSObject.Properties.Name -contains '/browser/command' -and $ui.StatusCode -eq 200 -and $ui.Content -match 'Aurea Solaris') {
            $ready = $true
            break
        }
    } catch {
        # O serviço leva alguns segundos na primeira execução.
    }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    throw "O serviço local não respondeu no tempo esperado: $apiUrl"
}

Write-Host "[OK] Abrindo Aurea Solaris compilado no Chrome: $uiUrl"
if (Get-Command chrome.exe -ErrorAction SilentlyContinue) {
    Start-Process -FilePath 'chrome.exe' -ArgumentList @('--new-window', $uiUrl) | Out-Null
} else {
    Start-Process $uiUrl | Out-Null
}
