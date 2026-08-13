$ErrorActionPreference = 'Stop'
$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()

$launcherPath = Join-Path $repoRoot 'launch_chrome.ps1'
$python = Join-Path $repoRoot '.aurea-build-venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw "Python do runtime não encontrado: $python"
}
if (-not (Test-Path -LiteralPath $launcherPath)) {
    throw "Launcher não encontrado: $launcherPath"
}

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-launcher-verify-' + [guid]::NewGuid().ToString('N'))
$normalDataDir = Join-Path $env:LOCALAPPDATA 'Aurea Solaris\data'
$oldPort = $env:ASTRO_API_PORT
$oldData = $env:AUREA_DATA_DIR
$oldLogin = $env:AUREA_REQUIRE_LOGIN
$global:AureaVerifyOwnedPids = [Collections.Generic.HashSet[int]]::new()
$global:AureaVerifySpawnedPids = [Collections.Generic.HashSet[int]]::new()
$global:AureaVerifyOpenedUrl = $null
$script:failures = [Collections.Generic.List[string]]::new()
$script:cleanupFailures = [Collections.Generic.List[string]]::new()
$script:preexistingListenerKeys = [Collections.Generic.HashSet[string]]::new()

function Get-DataDirFingerprint([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return 'ABSENT' }
    $items = @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
        Sort-Object FullName |
        ForEach-Object { '{0}|{1}|{2}' -f $_.FullName, $_.Length, $_.LastWriteTimeUtc.Ticks })
    if ($items.Count -eq 0) { return 'EMPTY' }
    return ($items -join "`n")
}

function Get-RangeListeners {
    return @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -ge 9876 -and $_.LocalPort -le 9899 } |
        ForEach-Object { [pscustomobject]@{ Port = [int]$_.LocalPort; Pid = [int]$_.OwningProcess } })
}

function Get-ListeningPids([int]$Port) {
    return @(Get-RangeListeners | Where-Object { $_.Port -eq $Port } | Select-Object -ExpandProperty Pid -Unique)
}

function Test-PortBusy([int]$Port) {
    return ((Get-ListeningPids $Port).Count -gt 0)
}

function Listener-Key($Listener) {
    return ('{0}:{1}' -f $Listener.Port, $Listener.Pid)
}

function Invoke-CleanupStep([string]$Name, [scriptblock]$Action) {
    try {
        & $Action
        Write-Output "CLEANUP $Name=ok"
    } catch {
        $detail = "CLEANUP $Name=failed error=$($_.Exception.Message)"
        Write-Output $detail
        [void]$script:cleanupFailures.Add($detail)
    }
}

function Register-OwnedPid([int]$ProcessId) {
    if ($ProcessId -le 0) { return }
    [void]$global:AureaVerifyOwnedPids.Add($ProcessId)
}

function Stop-OwnedPid([int]$ProcessId) {
    if ($ProcessId -le 0) { return }
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $proc) { return }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Wait-Health([string]$Url, [int]$TimeoutSec = 40) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $lastError = $null
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri "$Url/health"
            if ($response.StatusCode -eq 200) {
                return ($response.Content | ConvertFrom-Json)
            }
        } catch {
            $lastError = $_.Exception.Message
            Start-Sleep -Milliseconds 250
        }
    }
    throw "API não ficou pronta em $Url/health. Último erro: $lastError"
}

function Get-Health([string]$Url) {
    $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri "$Url/health"
    if ($response.StatusCode -ne 200) { throw "Health HTTP $($response.StatusCode) em $Url" }
    return ($response.Content | ConvertFrom-Json)
}

function Clear-OptionalEnv([string]$Name) {
    if (Test-Path -LiteralPath "Env:$Name") { Remove-Item -LiteralPath "Env:$Name" }
}

function Set-LauncherEnv {
    param(
        [string]$DataDir,
        [string]$RequireLogin = ''
    )
    $env:AUREA_DATA_DIR = $DataDir
    if ($RequireLogin -eq '1') {
        $env:AUREA_REQUIRE_LOGIN = '1'
    } else {
        Clear-OptionalEnv 'AUREA_REQUIRE_LOGIN'
    }
}

function Start-FixtureApi {
    param(
        [int]$Port,
        [string]$DataDir,
        [string]$RequireLogin = ''
    )
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    $env:ASTRO_API_PORT = [string]$Port
    $env:AUREA_DATA_DIR = $DataDir
    if ($RequireLogin -eq '1') {
        $env:AUREA_REQUIRE_LOGIN = '1'
    } else {
        Clear-OptionalEnv 'AUREA_REQUIRE_LOGIN'
    }
    $proc = Microsoft.PowerShell.Management\Start-Process -FilePath $python -ArgumentList @(
        (Join-Path $repoRoot 'main_api.py')
    ) -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden
    Register-OwnedPid ([int]$proc.Id)
    $null = Wait-Health "http://127.0.0.1:$Port"
    foreach ($listenId in @(Get-ListeningPids $Port)) { Register-OwnedPid $listenId }
    return $proc
}

function Start-OldContractStub([int]$Port) {
    $stubPath = Join-Path $tempRoot 'old_contract_stub.py'
    @'
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/health":
            payload = json.dumps({
                "status": "ok",
                "auth_mode": "local-owner",
                "browser_contract_version": 1,
            }).encode("utf-8")
            content_type = "application/json"
        elif path == "/openapi.json":
            payload = json.dumps({"paths": {"/browser/command": {"post": {}}}}).encode("utf-8")
            content_type = "application/json"
        elif path == "/":
            payload = b"<!doctype html><html><body>Aurea Solaris</body></html>"
            content_type = "text/html; charset=utf-8"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

if __name__ == "__main__":
    port = int(os.environ["ASTRO_API_PORT"])
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
'@ | Set-Content -LiteralPath $stubPath -Encoding UTF8
    $env:ASTRO_API_PORT = [string]$Port
    $proc = Microsoft.PowerShell.Management\Start-Process -FilePath $python -ArgumentList @($stubPath) -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden
    Register-OwnedPid ([int]$proc.Id)
    $null = Wait-Health "http://127.0.0.1:$Port"
    foreach ($listenId in @(Get-ListeningPids $Port)) { Register-OwnedPid $listenId }
    return $proc
}

function Wait-PortFree([int]$Port, [int]$TimeoutSec = 10) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-PortBusy $Port)) { return }
        Start-Sleep -Milliseconds 150
    }
    throw "A porta $Port continuou ocupada após encerrar os processos deste caso."
}

function Stop-TestOwnedListeners {
    foreach ($ownedId in @($global:AureaVerifyOwnedPids)) {
        Stop-OwnedPid $ownedId
    }
    foreach ($listener in @(Get-RangeListeners)) {
        $key = Listener-Key $listener
        if ($script:preexistingListenerKeys.Contains($key)) { continue }
        Stop-OwnedPid $listener.Pid
    }
}

function Reset-OwnedRuntimes {
    Stop-TestOwnedListeners
    $global:AureaVerifyOwnedPids.Clear()
    $global:AureaVerifySpawnedPids.Clear()
    $global:AureaVerifyOpenedUrl = $null
    Wait-PortFree 9876
}

function global:Start-Process {
    param(
        [Parameter(Position = 0)]
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory,
        [object]$WindowStyle,
        [switch]$PassThru
    )
    $isUrl = $FilePath -match '^https?://'
    $isChrome = $FilePath -match '(?i)(^|\\)chrome(\.exe)?$'
    if ($isUrl -or $isChrome) {
        if ($isUrl) {
            $global:AureaVerifyOpenedUrl = $FilePath
        } else {
            $global:AureaVerifyOpenedUrl = (
                @($ArgumentList | Where-Object { $_ -match '^https?://' }) | Select-Object -Last 1
            )
        }
        return
    }
    $startParams = @{
        FilePath = $FilePath
        PassThru = $true
    }
    if ($PSBoundParameters.ContainsKey('ArgumentList') -and $null -ne $ArgumentList -and $ArgumentList.Count) {
        $startParams.ArgumentList = $ArgumentList
    }
    if ($WorkingDirectory) { $startParams.WorkingDirectory = $WorkingDirectory }
    if ($PSBoundParameters.ContainsKey('WindowStyle')) { $startParams.WindowStyle = $WindowStyle }
    $proc = Microsoft.PowerShell.Management\Start-Process @startParams
    if ($null -ne $proc) {
        [void]$global:AureaVerifyOwnedPids.Add([int]$proc.Id)
        [void]$global:AureaVerifySpawnedPids.Add([int]$proc.Id)
    }
    if ($PassThru) { return $proc }
}

function Invoke-AureaLauncher {
    param(
        [string]$DataDir,
        [string]$RequireLogin = ''
    )
    $global:AureaVerifyOpenedUrl = $null
    $global:AureaVerifySpawnedPids.Clear()
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    Set-LauncherEnv -DataDir $DataDir -RequireLogin $RequireLogin
    & $launcherPath
    if ([string]::IsNullOrWhiteSpace([string]$global:AureaVerifyOpenedUrl)) {
        throw 'O launcher não tentou abrir uma URL.'
    }
    $openedPort = ([Uri]$global:AureaVerifyOpenedUrl).Port
    foreach ($listenId in @(Get-ListeningPids $openedPort)) { Register-OwnedPid $listenId }
    return [string]$global:AureaVerifyOpenedUrl
}

function Assert-Case([string]$Name, [scriptblock]$Body) {
    try {
        & $Body
        Write-Output "PASS $Name"
    } catch {
        $detail = "FAIL ${Name}: $($_.Exception.Message)"
        Write-Output $detail
        [void]$script:failures.Add($detail)
    }
}

function Stop-CasePids([int[]]$ProcessIds) {
    foreach ($ownedId in @($ProcessIds)) { Stop-OwnedPid $ownedId }
}

$normalFingerprint = Get-DataDirFingerprint $normalDataDir
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

try {
    foreach ($listener in @(Get-RangeListeners)) {
        [void]$script:preexistingListenerKeys.Add((Listener-Key $listener))
    }
    $occupied9876 = @(Get-ListeningPids 9876)
    if ($occupied9876.Count) {
        throw "A porta 9876 já está em uso (PID(s): $($occupied9876 -join ', ')). Este verificador não encerra um API preexistente. Liberar a porta e repetir."
    }

    Assert-Case 'default environment expects local-owner' {
        Reset-OwnedRuntimes
        $dataDir = Join-Path $tempRoot 'default-data'
        $url = Invoke-AureaLauncher -DataDir $dataDir
        $health = Get-Health $url.TrimEnd('/')
        if ($health.auth_mode -ne 'local-owner') {
            throw "auth_mode=$($health.auth_mode), esperado local-owner em $url"
        }
        if ([int]$health.browser_contract_version -ne 2) {
            throw "browser_contract_version=$($health.browser_contract_version), esperado 2"
        }
        Stop-CasePids (@($global:AureaVerifySpawnedPids) + @(Get-ListeningPids (([Uri]$url).Port)))
        Wait-PortFree (([Uri]$url).Port)
        Wait-PortFree 9876
    }

    Assert-Case 'AUREA_REQUIRE_LOGIN=1 expects require-login' {
        Reset-OwnedRuntimes
        $dataDir = Join-Path $tempRoot 'require-login-data'
        $url = Invoke-AureaLauncher -DataDir $dataDir -RequireLogin '1'
        $health = Get-Health $url.TrimEnd('/')
        if ($health.auth_mode -ne 'require-login') {
            throw "auth_mode=$($health.auth_mode), esperado require-login em $url"
        }
        if ([int]$health.browser_contract_version -ne 2) {
            throw "browser_contract_version=$($health.browser_contract_version), esperado 2"
        }
        Stop-CasePids (@($global:AureaVerifySpawnedPids) + @(Get-ListeningPids (([Uri]$url).Port)))
        Wait-PortFree (([Uri]$url).Port)
        Wait-PortFree 9876
    }

    Assert-Case 'compatible existing API is reused' {
        Reset-OwnedRuntimes
        $fixtureDir = Join-Path $tempRoot 'reuse-fixture'
        $launcherDir = Join-Path $tempRoot 'reuse-launcher'
        $fixture = Start-FixtureApi -Port 9876 -DataDir $fixtureDir
        $listenBefore = @(Get-ListeningPids 9876)
        $url = Invoke-AureaLauncher -DataDir $launcherDir
        if ($global:AureaVerifySpawnedPids.Count -ne 0) {
            throw "O launcher iniciou $($global:AureaVerifySpawnedPids.Count) runtime(s) novo(s) em vez de reutilizar 9876."
        }
        if (([Uri]$url).Port -ne 9876) {
            throw "URL aberta $url não reutilizou http://127.0.0.1:9876/"
        }
        $health = Get-Health 'http://127.0.0.1:9876'
        if ($health.auth_mode -ne 'local-owner' -or [int]$health.browser_contract_version -ne 2) {
            throw "API reutilizada incompatível: auth_mode=$($health.auth_mode) contract=$($health.browser_contract_version)"
        }
        $still = @(Get-ListeningPids 9876)
        foreach ($listenId in $listenBefore) {
            if ($still -notcontains $listenId) {
                throw "O processo original da porta 9876 (PID $listenId) não continuou em escuta."
            }
        }
        Stop-CasePids $listenBefore
        Wait-PortFree 9876
    }

    Assert-Case 'wrong-mode API is not reused' {
        Reset-OwnedRuntimes
        $fixtureDir = Join-Path $tempRoot 'wrong-mode-fixture'
        $launcherDir = Join-Path $tempRoot 'wrong-mode-launcher'
        $fixture = Start-FixtureApi -Port 9876 -DataDir $fixtureDir -RequireLogin '1'
        $listenBefore = @(Get-ListeningPids 9876)
        $fixtureHealth = Get-Health 'http://127.0.0.1:9876'
        if ($fixtureHealth.auth_mode -ne 'require-login') {
            throw "Fixture de modo errado não subiu em require-login: $($fixtureHealth.auth_mode)"
        }
        $url = Invoke-AureaLauncher -DataDir $launcherDir
        $openedPort = ([Uri]$url).Port
        if ($openedPort -eq 9876) {
            throw "O launcher reutilizou a API require-login na porta 9876 em vez de iniciar o modo local-owner."
        }
        if ($openedPort -lt 9877 -or $openedPort -gt 9899) {
            throw "Porta selecionada $openedPort está fora de 9877-9899."
        }
        $still = @(Get-ListeningPids 9876)
        foreach ($listenId in $listenBefore) {
            if ($still -notcontains $listenId) {
                throw "O launcher encerrou o API preexistente da porta 9876 (PID $listenId)."
            }
        }
        $leftBehind = Get-Health 'http://127.0.0.1:9876'
        if ($leftBehind.auth_mode -ne 'require-login') {
            throw "O API da porta 9876 mudou de modo: $($leftBehind.auth_mode)"
        }
        $selected = Get-Health $url.TrimEnd('/')
        if ($selected.auth_mode -ne 'local-owner' -or [int]$selected.browser_contract_version -ne 2) {
            throw "Processo selecionado incompatível em $url : auth_mode=$($selected.auth_mode) contract=$($selected.browser_contract_version)"
        }
        Stop-CasePids ($listenBefore + @($global:AureaVerifySpawnedPids) + @(Get-ListeningPids $openedPort))
        Wait-PortFree 9876
        Wait-PortFree $openedPort
    }

    Assert-Case 'old contract API is not accepted as compatible' {
        Reset-OwnedRuntimes
        $launcherDir = Join-Path $tempRoot 'old-contract-launcher'
        $stub = Start-OldContractStub -Port 9876
        $listenBefore = @(Get-ListeningPids 9876)
        $stubHealth = Get-Health 'http://127.0.0.1:9876'
        if ([int]$stubHealth.browser_contract_version -eq 2) {
            throw 'O stub de contrato antigo reportou versão 2.'
        }
        $url = Invoke-AureaLauncher -DataDir $launcherDir
        $openedPort = ([Uri]$url).Port
        if ($openedPort -eq 9876) {
            throw "O launcher aceitou o contrato antigo na porta 9876 como compatível."
        }
        if ($openedPort -lt 9877 -or $openedPort -gt 9899) {
            throw "Porta selecionada $openedPort está fora de 9877-9899."
        }
        $still = @(Get-ListeningPids 9876)
        foreach ($listenId in $listenBefore) {
            if ($still -notcontains $listenId) {
                throw "O launcher encerrou o stub preexistente da porta 9876 (PID $listenId)."
            }
        }
        $selected = Get-Health $url.TrimEnd('/')
        if ([int]$selected.browser_contract_version -ne 2 -or $selected.auth_mode -ne 'local-owner') {
            throw "Processo selecionado incompatível em $url"
        }
        Stop-CasePids ($listenBefore + @($global:AureaVerifySpawnedPids) + @(Get-ListeningPids $openedPort))
        Wait-PortFree 9876
        Wait-PortFree $openedPort
    }

    Assert-Case 'launcher opens the URL of the compatible process it selected' {
        Reset-OwnedRuntimes
        $fixtureDir = Join-Path $tempRoot 'open-url-fixture'
        $launcherDir = Join-Path $tempRoot 'open-url-launcher'
        $fixture = Start-FixtureApi -Port 9876 -DataDir $fixtureDir
        $url = Invoke-AureaLauncher -DataDir $launcherDir
        $expected = 'http://127.0.0.1:9876/'
        if ($url -ne $expected) {
            throw "URL aberta '$url', esperado '$expected' para o processo compatível selecionado."
        }
        $health = Get-Health 'http://127.0.0.1:9876'
        if ($health.auth_mode -ne 'local-owner' -or [int]$health.browser_contract_version -ne 2) {
            throw "A URL aberta não aponta para o processo compatível."
        }
        if ($global:AureaVerifySpawnedPids.Count -ne 0) {
            throw 'O launcher deveria ter aberto a URL do processo já compatível, sem iniciar outro.'
        }
        Stop-CasePids @(Get-ListeningPids 9876)
        Wait-PortFree 9876
    }

    $afterFingerprint = Get-DataDirFingerprint $normalDataDir
    if ($afterFingerprint -ne $normalFingerprint) {
        throw "O diretório normal de dados foi alterado: $normalDataDir"
    }
    Write-Output "PASS normal data directory unchanged"

    if ($script:failures.Count) {
        throw "Falhas do verificador:`n$($script:failures -join "`n")"
    }
    Write-Output 'RESULT PASS'
} finally {
    Invoke-CleanupStep 'owned-runtimes' { Stop-TestOwnedListeners }
    Invoke-CleanupStep 'ASTRO_API_PORT-restore' {
        if ($null -eq $oldPort) { Clear-OptionalEnv 'ASTRO_API_PORT' }
        else { $env:ASTRO_API_PORT = $oldPort }
    }
    Invoke-CleanupStep 'AUREA_DATA_DIR-restore' {
        if ($null -eq $oldData) { Clear-OptionalEnv 'AUREA_DATA_DIR' }
        else { $env:AUREA_DATA_DIR = $oldData }
    }
    Invoke-CleanupStep 'AUREA_REQUIRE_LOGIN-restore' {
        if ($null -eq $oldLogin) { Clear-OptionalEnv 'AUREA_REQUIRE_LOGIN' }
        else { $env:AUREA_REQUIRE_LOGIN = $oldLogin }
    }
    Invoke-CleanupStep 'temp-root-remove' {
        for ($i = 0; $i -lt 20 -and [IO.Directory]::Exists($tempRoot); $i++) {
            try { [IO.Directory]::Delete($tempRoot, $true) } catch {
                if ($i -eq 19) { throw }
                Start-Sleep -Milliseconds 250
            }
        }
    }
    Invoke-CleanupStep 'temp-root-residue' {
        if ([IO.Directory]::Exists($tempRoot)) { throw "Pasta temporária ainda existe: $tempRoot" }
    }
    if ($script:cleanupFailures.Count) {
        throw "Falhas de limpeza:`n$($script:cleanupFailures -join "`n")"
    }
}
