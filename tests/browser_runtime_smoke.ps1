param(
    [string]$RuntimePath = '',
    [int]$ApiPort = 0,
    [int]$CdpPort = 0,
    [switch]$PortSelectionOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
if ([string]::IsNullOrWhiteSpace($RuntimePath)) {
    $RuntimePath = Join-Path $repoRoot 'src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe'
} elseif (-not [IO.Path]::IsPathRooted($RuntimePath)) {
    $RuntimePath = Join-Path $repoRoot $RuntimePath
}
$RuntimePath = (Resolve-Path -LiteralPath $RuntimePath).Path
$chromeCandidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($null -eq $chromePath) { throw 'Chrome não foi encontrado nos caminhos padrão.' }

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-browser-smoke-' + [guid]::NewGuid().ToString('N'))
$dataDir = Join-Path $tempRoot 'data'
$chromeProfile = Join-Path $tempRoot 'chrome-profile'
$apiPortRange = 9877..9899
$cdpPortRange = 9900..9922

function Get-ListeningPorts {
    @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { [int]$_.LocalPort })
}
function Select-FreePort([int[]]$Candidates, [int[]]$OccupiedPorts) {
    foreach ($candidate in $Candidates) {
        if ($OccupiedPorts -notcontains $candidate) { return $candidate }
    }
    return $null
}
function Assert-PortFree([int]$Port) {
    if ((Get-ListeningPorts) -contains $Port) { throw "A porta $Port já está em uso." }
}

function Stop-Tree([System.Diagnostics.Process]$RootProcess) {
    $rootPid = $RootProcess.Id
    $expectedStart = $null
    try { $expectedStart = $RootProcess.StartTime } catch { return }
    $currentRoot = Get-Process -Id $rootPid -ErrorAction SilentlyContinue
    if ($null -eq $currentRoot) { return }
    if ($currentRoot.StartTime -ne $expectedStart) {
        throw "PID reutilizado; não vou encerrar o processo $rootPid."
    }
    $processes = @(Get-CimInstance Win32_Process)
    $ids = [Collections.Generic.HashSet[int]]::new(); [void]$ids.Add($rootPid)
    do {
        $changed = $false
        foreach ($process in $processes) {
            if ($ids.Contains([int]$process.ParentProcessId) -and $ids.Add([int]$process.ProcessId)) { $changed = $true }
        }
    } while ($changed)
    foreach ($id in @($ids | Sort-Object -Descending)) {
        if ($null -ne (Get-Process -Id $id -ErrorAction SilentlyContinue)) {
            Stop-Process -Id $id -Force -ErrorAction Stop
        }
    }
    $remaining = @($ids | Where-Object { $null -ne (Get-Process -Id $_ -ErrorAction SilentlyContinue) })
    if ($remaining.Count) { throw "Processos ainda ativos: $($remaining -join ', ')" }
}
function Send-Cdp([string]$Method, [hashtable]$Params = @{}) {
    $script:commandId++
    $payload = @{ id = $script:commandId; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 10
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    [void]$socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true,
        [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    return $script:commandId
}
function Receive-Cdp([int]$TimeoutMs) {
    $buffer = New-Object byte[] 65536; $message = [Text.StringBuilder]::new()
    do {
        $task = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None)
        if (-not $task.Wait($TimeoutMs)) { $socket.Abort(); throw [TimeoutException]::new('CDP timeout') }
        $result = $task.Result
        [void]$message.Append([Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
    } while (-not $result.EndOfMessage)
    return $message.ToString() | ConvertFrom-Json
}
function Record-CdpError($Event) {
    if ($Event.Method -eq 'Network.responseReceived' -and
        [int]$Event.params.response.status -eq 404 -and
        [string]$Event.params.response.url -match '/src/assets/brand/logo/aurea-symbol\.svg(?:$|\?)') {
        $script:logo404Count++
    } elseif ($Event.Method -eq 'Log.entryAdded' -and [string]$Event.params.entry.level -eq 'error') {
        $entry = $Event.params.entry
        $detail = "Log.entryAdded: level=$([string]$entry.level) source=$([string]$entry.source) text=$([string]$entry.text) url=$([string]$entry.url)"
        [void]$script:logErrors.Add($detail)
    } elseif ($Event.Method -eq 'Runtime.exceptionThrown' -or
        ($Event.Method -eq 'Runtime.consoleAPICalled' -and @('error', 'assert') -contains [string]$Event.params.type)) {
        $detail = "$([string]$Event.Method): $($Event | ConvertTo-Json -Compress -Depth 8)"
        [void]$script:consoleErrors.Add($detail)
    }
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

$runtime = $null; $chrome = $null; $socket = $null
$oldPort = $env:ASTRO_API_PORT; $oldData = $env:AUREA_DATA_DIR
$script:cleanupFailures = [Collections.Generic.List[string]]::new()
if ($PortSelectionOnly) {
    $occupied = Get-ListeningPorts
    $selected = Select-FreePort $apiPortRange $occupied
    if ($null -eq $selected) { throw 'Não há porta livre no intervalo da API.' }
    Write-Output "PORT_SELECTION api_port=$selected"
    exit 0
}
try {
    $occupied = Get-ListeningPorts
    if ($ApiPort -eq 0) { $ApiPort = Select-FreePort $apiPortRange $occupied }
    if ($CdpPort -eq 0) { $CdpPort = Select-FreePort ($cdpPortRange | Where-Object { $_ -ne $ApiPort }) $occupied }
    if ($ApiPort -notin $apiPortRange -or $CdpPort -notin $cdpPortRange -or $ApiPort -eq $CdpPort) {
        throw 'As portas devem ser API 9877-9899 e CDP 9900-9922, e devem ser distintas.'
    }
    Assert-PortFree $ApiPort
    Assert-PortFree $CdpPort
    Write-Output "PORT_DISCOVERY listening_addresses=all api_port=$ApiPort cdp_port=$CdpPort"
    New-Item -ItemType Directory -Path $dataDir, $chromeProfile | Out-Null
    $env:ASTRO_API_PORT = [string]$ApiPort; $env:AUREA_DATA_DIR = $dataDir
    $runtime = Start-Process -FilePath $RuntimePath -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden
    $baseUrl = "http://127.0.0.1:$ApiPort"
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $health = Invoke-WebRequest "$baseUrl/health" -UseBasicParsing -TimeoutSec 1
            $root = Invoke-WebRequest "$baseUrl/" -UseBasicParsing -TimeoutSec 1
            $openapi = Invoke-WebRequest "$baseUrl/openapi.json" -UseBasicParsing -TimeoutSec 1
            if ($health.StatusCode -eq 200 -and $root.StatusCode -eq 200 -and $openapi.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Sidecar não ficou pronto em $baseUrl." }

    Assert-PortFree $CdpPort
    $chrome = Start-Process -FilePath $chromePath -ArgumentList @(
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync',
        '--no-service-autorun', '--remote-allow-origins=*', "--remote-debugging-port=$CdpPort",
        "--user-data-dir=$chromeProfile", 'about:blank'
    ) -PassThru -WindowStyle Hidden
    $chromeTree = @($chrome.Id); $cdpOwned = $false
    for ($i = 0; $i -lt 20; $i++) {
        $processes = @(Get-CimInstance Win32_Process)
        $changed = $true
        while ($changed) {
            $changed = $false
            foreach ($process in $processes) {
                if ($chromeTree -contains [int]$process.ParentProcessId -and $chromeTree -notcontains [int]$process.ProcessId) {
                    $chromeTree += [int]$process.ProcessId; $changed = $true
                }
            }
        }
        $cdpListeners = @(Get-NetTCPConnection -LocalPort $CdpPort -State Listen -ErrorAction SilentlyContinue)
        if ($cdpListeners.Count -gt 0) {
            if (@($cdpListeners | Where-Object { $chromeTree -notcontains [int]$_.OwningProcess }).Count -gt 0) {
                throw "A porta CDP $CdpPort foi ocupada por um processo não criado pelo smoke."
            }
            $cdpOwned = $true
            break
        }
        Start-Sleep -Milliseconds 100
    }
    if (-not $cdpOwned) { throw "Chrome não abriu a porta CDP $CdpPort." }
    $target = $null
    for ($i = 0; $i -lt 40 -and $null -eq $target; $i++) {
        try {
            $version = (Invoke-WebRequest "http://127.0.0.1:$CdpPort/json/version" -UseBasicParsing).Content | ConvertFrom-Json
            $versionUri = [Uri][string]$version.webSocketDebuggerUrl
            if ($versionUri.Host -ne '127.0.0.1' -or $versionUri.Port -ne $CdpPort) { throw 'Endpoint CDP inesperado.' }
            $targets = (Invoke-WebRequest "http://127.0.0.1:$CdpPort/json/list" -UseBasicParsing).Content | ConvertFrom-Json
            foreach ($candidate in $targets) {
                $targetUri = $null
                $targetUri = if (-not [string]::IsNullOrWhiteSpace([string]$candidate.webSocketDebuggerUrl)) { [Uri][string]$candidate.webSocketDebuggerUrl }
                if ([string]$candidate.type -eq 'page' -and $null -ne $targetUri -and $targetUri.Host -eq '127.0.0.1' -and $targetUri.Port -eq $CdpPort) {
                    $target = $candidate; break
                }
            }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if ($null -eq $target) { throw 'Chrome não publicou um alvo CDP.' }
    $socket = [Net.WebSockets.ClientWebSocket]::new()
    $socket.Options.SetRequestHeader('Origin', "http://127.0.0.1:$CdpPort")
    [void]$socket.ConnectAsync([Uri][string]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $script:ApiPort = $ApiPort
    $script:commandId = 0; $script:consoleErrors = [Collections.Generic.List[string]]::new(); $script:logErrors = [Collections.Generic.List[string]]::new(); $script:logo404Count = 0
    [void](Send-Cdp 'Runtime.enable'); [void](Send-Cdp 'Log.enable'); [void](Send-Cdp 'Network.enable'); [void](Send-Cdp 'Page.enable')
    [void](Send-Cdp 'Page.navigate' @{ url = "$baseUrl/" })
    $loaded = $false
    while (-not $loaded) { $event = Receive-Cdp 30000; Record-CdpError $event; $loaded = $event.Method -in @('Page.loadEventFired', 'Page.frameStoppedLoading') }
    Start-Sleep -Milliseconds 3000
    $landmarkJson = @('Aurea Solaris', 'Entrar', 'Inscrever-se') | ConvertTo-Json -Compress
    $landmarkExpression = @'
(() => {
  const requested = __LANDMARKS__;
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  const describe = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const opacity = Number.parseFloat(style.opacity);
    const intersectsViewport = rect.right > 0 && rect.bottom > 0 &&
      rect.left < window.innerWidth && rect.top < window.innerHeight;
    return {
      tag: element.tagName,
      text: normalize(element.textContent || ''),
      display: style.display,
      visibility: style.visibility,
      opacity,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      intersectsViewport,
      qualifies: style.display !== 'none' &&
        style.visibility !== 'hidden' && style.visibility !== 'collapse' &&
        opacity > 0 && rect.width > 0 && rect.height > 0 && intersectsViewport,
    };
  };
  return requested.map((label) => {
    const elements = Array.from(document.querySelectorAll('*'))
      .filter((element) => normalize(element.textContent || '') === label)
      .map(describe);
    return { label, elements, visible: elements.some((element) => element.qualifies) };
  });
})()
'@.Replace('__LANDMARKS__', $landmarkJson)
    $landmarkId = Send-Cdp 'Runtime.evaluate' @{ expression = $landmarkExpression; returnByValue = $true }
    $landmarkResults = $null
    while ($null -eq $landmarkResults) {
        $event = Receive-Cdp 10000
        Record-CdpError $event
        if ($event.id -eq $landmarkId) {
            if ($null -ne $event.result.exceptionDetails) { throw "Falha ao avaliar landmarks: $($event.result.exceptionDetails | ConvertTo-Json -Compress -Depth 8)" }
            $landmarkResults = @($event.result.result.value)
        }
    }
    foreach ($landmark in $landmarkResults) {
        if (-not $landmark.visible) {
            $details = $landmark.elements | ConvertTo-Json -Compress -Depth 8
            throw "Landmark não está visível: $($landmark.label); elementos=$details"
        }
        Write-Output "LANDMARK $($landmark.label)=visible"
    }
    if ($script:logo404Count -gt 0) { throw "A logo retornou HTTP 404 ($($script:logo404Count) ocorrência(s))." }
    if ($script:consoleErrors.Count -or $script:logErrors.Count) {
        $details = @($script:consoleErrors + $script:logErrors) -join "`n"
        throw "Erros CDP não permitidos:`n$details"
    }
    Write-Output "RESULT api_port=$ApiPort cdp_port=$CdpPort health=$($health.StatusCode) root=$($root.StatusCode) openapi=$($openapi.StatusCode) logo_404=$($script:logo404Count) cdp_console_errors=$($script:consoleErrors.Count) cdp_log_errors=$($script:logErrors.Count)"
} finally {
    Invoke-CleanupStep 'socket-close' {
        if ($null -ne $socket -and $socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
            [void]$socket.CloseAsync([Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [Threading.CancellationToken]::None).GetAwaiter().GetResult()
        }
    }
    Invoke-CleanupStep 'socket-dispose' { if ($null -ne $socket) { $socket.Dispose() } }
    Invoke-CleanupStep 'chrome-tree' { if ($null -ne $chrome) { Stop-Tree $chrome } }
    Invoke-CleanupStep 'runtime-tree' { if ($null -ne $runtime) { Stop-Tree $runtime } }
    Invoke-CleanupStep 'ASTRO_API_PORT-restore' {
        if ($null -eq $oldPort) {
            if (Test-Path Env:ASTRO_API_PORT) { Remove-Item Env:ASTRO_API_PORT -ErrorAction Stop }
        } else { $env:ASTRO_API_PORT = $oldPort }
    }
    Invoke-CleanupStep 'AUREA_DATA_DIR-restore' {
        if ($null -eq $oldData) {
            if (Test-Path Env:AUREA_DATA_DIR) { Remove-Item Env:AUREA_DATA_DIR -ErrorAction Stop }
        } else { $env:AUREA_DATA_DIR = $oldData }
    }
    Invoke-CleanupStep 'temp-root-remove' { if ([IO.Directory]::Exists($tempRoot)) { [IO.Directory]::Delete($tempRoot, $true) } }
    Invoke-CleanupStep 'temp-root-residue' { if ([IO.Directory]::Exists($tempRoot)) { throw "Pasta temporária ainda existe: $tempRoot" } }
    Invoke-CleanupStep 'owned-ports-free' {
        $residualPorts = @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
            Where-Object { $_.LocalPort -in @($ApiPort, $CdpPort) })
        if ($residualPorts.Count) { throw "Portas ainda em uso: $($residualPorts.LocalPort -join ', ')" }
    }
    if ($script:cleanupFailures.Count) { throw "Falhas de limpeza:`n$($script:cleanupFailures -join "`n")" }
}
