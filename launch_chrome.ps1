param(
    [switch]$MockNatal,
    [switch]$TestUser,
    [switch]$Reset
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $projectRoot '.aurea-build-venv\Scripts\python.exe'
$packagedRuntime = Join-Path $projectRoot 'src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe'
$distIndex = Join-Path $projectRoot 'dist\index.html'

if ($Reset -and -not $TestUser) {
    throw '-Reset so funciona com -TestUser'
}

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

$expectedAuthMode = if ($env:AUREA_REQUIRE_LOGIN -eq '1') { 'require-login' } else { 'local-owner' }

function Get-AureaHealthPayload([string]$url) {
    try {
        $healthResponse = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$url/health"
        if ($healthResponse.StatusCode -ne 200) { return $null }
        return $healthResponse.Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Test-AureaHealthContract($health, [string]$expectedAuthMode, [bool]$requireTestUser = $false) {
    if ($null -eq $health) { return $false }
    if ([string]$health.auth_mode -ne $expectedAuthMode) { return $false }
    $version = $health.browser_contract_version
    if ($null -eq $version) { return $false }
    try {
        if ([int]$version -ne 2) { return $false }
    } catch {
        return $false
    }
    if ($requireTestUser -and -not $health.test_user) { return $false }
    return $true
}

function Test-AureaApiReusable([string]$url, [string]$expectedAuthMode, [bool]$requireTestUser = $false) {
    $health = Get-AureaHealthPayload $url
    if (-not (Test-AureaHealthContract $health $expectedAuthMode $requireTestUser)) { return $false }
    try {
        $openapi = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$url/openapi.json" | ConvertFrom-Json
        if ($openapi.paths.PSObject.Properties.Name -notcontains '/browser/command') { return $false }
        $ui = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$url/"
        return ($ui.StatusCode -eq 200 -and $ui.Content -match 'Aurea Solaris')
    } catch {
        return $false
    }
}

function Stop-StartedRuntime($process, [int]$port) {
    if ($null -ne $process) {
        try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch { }
    }
    $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        try { Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue } catch { }
    }
}

function Start-AureaRuntime([string]$apiUrl, [int]$apiPort, [hashtable]$runtimeEnv) {
    $startedRuntime = $null
    foreach ($entry in $runtimeEnv.GetEnumerator()) {
        Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
    }
    Write-Host "[INFO] Iniciando o serviço local na porta $apiPort..."
    $startedRuntime = Start-Process -FilePath $runtimeExecutable -ArgumentList $runtimeArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    $ready = $false
    $contractMismatch = $false
    $requireTestUser = ($runtimeEnv['AUREA_TEST_USER'] -eq '1')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($null -ne $startedRuntime) {
            $health = Get-AureaHealthPayload $apiUrl
            if ($null -ne $health -and -not (Test-AureaHealthContract $health $expectedAuthMode $requireTestUser)) {
                $contractMismatch = $true
                break
            }
        }
        if (Test-AureaApiReusable $apiUrl $expectedAuthMode $requireTestUser) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if ($contractMismatch) {
        Stop-StartedRuntime $startedRuntime $apiPort
        throw "O runtime local iniciou com um contrato incompatível (esperado auth_mode=$expectedAuthMode e browser_contract_version=2). Recompile ou atualize o runtime e tente de novo: $apiUrl"
    }
    if (-not $ready) {
        Stop-StartedRuntime $startedRuntime $apiPort
        throw "O serviço local não respondeu no tempo esperado: $apiUrl"
    }
    return $startedRuntime
}

function Open-AureaChrome([string]$uiUrl, [string]$chromeProfile = '') {
    Write-Host "[OK] Abrindo Aurea Solaris compilado no Chrome: $uiUrl"
    if (Get-Command chrome.exe -ErrorAction SilentlyContinue) {
        if ($chromeProfile) {
            Start-Process -FilePath 'chrome.exe' -ArgumentList @('--new-window', "--user-data-dir=$chromeProfile", $uiUrl) | Out-Null
        } else {
            Start-Process -FilePath 'chrome.exe' -ArgumentList @('--new-window', $uiUrl) | Out-Null
        }
    } elseif ($chromeProfile) {
        throw 'O perfil isolado do usuário de teste exige o Chrome instalado.'
    } else {
        Start-Process $uiUrl | Out-Null
    }
}

if ($TestUser) {
    $testRoot = Join-Path $env:LOCALAPPDATA 'Aurea Solaris\test-user'
    $testData = Join-Path $testRoot 'data'
    $chromeProfile = Join-Path $testRoot 'chrome-profile'

    if ($Reset) {
        # A prior -TestUser session may still hold SQLite handles for the old sandbox.
        Stop-StartedRuntime $null 9878
        for ($port = 9879; $port -le 9899; $port++) {
            Stop-StartedRuntime $null $port
        }
        if (Test-Path -LiteralPath $testRoot) {
            Remove-Item -LiteralPath $testRoot -Recurse -Force
        }
    }

    & $venvPython (Join-Path $projectRoot 'tools\seed_test_user.py') --data-dir $testData
    if ($LASTEXITCODE -ne 0) {
        throw 'O seed do usuário de teste falhou.'
    }

    $env:AUREA_DATA_DIR = $testData
    $env:AUREA_TEST_USER = '1'

    $apiPort = 9878
    $apiUrl = "http://127.0.0.1:$apiPort"
    $startedRuntime = $null
    $apiReady = (-not $Reset) -and (Test-AureaApiReusable $apiUrl $expectedAuthMode $true)
    if ($apiReady) {
        Write-Host '[INFO] Serviço local do usuário de teste já estava ativo.'
    } else {
        if (Test-PortBusy $apiPort) {
            $apiPort = Get-FreePort 9879 9899
            $apiUrl = "http://127.0.0.1:$apiPort"
            Write-Host "[INFO] A porta 9878 está ocupada; usando a porta local livre $apiPort."
        }
        $null = Start-AureaRuntime $apiUrl $apiPort @{
            AUREA_DATA_DIR = $testData
            AUREA_TEST_USER = '1'
            ASTRO_API_PORT = [string]$apiPort
        }
    }

    $uiUrl = "$apiUrl/"
    Open-AureaChrome $uiUrl $chromeProfile
    Write-Host '[INFO] Usuário de teste isolado. Para zerar tudo: .\launch_chrome.ps1 -TestUser -Reset'
    return
}

$apiPort = 9876
$apiUrl = "http://127.0.0.1:$apiPort"
$startedRuntime = $null
$apiReady = Test-AureaApiReusable $apiUrl $expectedAuthMode
if ($apiReady) {
    Write-Host '[INFO] Serviço local compatível já estava ativo.'
} else {
    if (Test-PortBusy $apiPort) {
        $apiPort = Get-FreePort 9877 9899
        $apiUrl = "http://127.0.0.1:$apiPort"
        Write-Host "[INFO] A porta padrão está ocupada; usando a porta local livre $apiPort."
    }
    $null = Start-AureaRuntime $apiUrl $apiPort @{
        ASTRO_API_PORT = [string]$apiPort
    }
}

$uiUrl = if ($MockNatal) { "$apiUrl/?mockNatal=1" } else { "$apiUrl/" }
Open-AureaChrome $uiUrl
