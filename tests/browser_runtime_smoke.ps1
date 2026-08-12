param(
    [string]$RuntimePath = '',
    [int]$ApiPort = 0,
    [int]$CdpPort = 0
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
New-Item -ItemType Directory -Path $dataDir, $chromeProfile | Out-Null
$occupied = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { [int]$_.LocalPort })
if ($ApiPort -eq 0) { $ApiPort = 9877..9899 | Where-Object { $_ -notin $occupied } | Select-Object -First 1 }
if ($CdpPort -eq 0) { $CdpPort = 9900..9922 | Where-Object { $_ -notin $occupied -and $_ -ne $ApiPort } | Select-Object -First 1 }
if ($null -eq $ApiPort -or $null -eq $CdpPort) { throw 'Não há duas portas livres de loopback.' }

function Stop-Tree([int]$RootPid) {
    $processes = @(Get-CimInstance Win32_Process)
    $ids = [Collections.Generic.HashSet[int]]::new(); [void]$ids.Add($RootPid)
    do {
        $changed = $false
        foreach ($process in $processes) {
            if ($ids.Contains([int]$process.ParentProcessId) -and $ids.Add([int]$process.ProcessId)) { $changed = $true }
        }
    } while ($changed)
    foreach ($id in @($ids | Sort-Object -Descending)) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
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
    if ($Event.Method -eq 'Runtime.exceptionThrown' -or
        ($Event.Method -eq 'Runtime.consoleAPICalled' -and @('error', 'assert') -contains [string]$Event.params.type)) {
        $detail = [string]$Event.Method
        [void]$script:consoleErrors.Add($detail)
    }
}

$runtime = $null; $chrome = $null; $socket = $null
$oldPort = $env:ASTRO_API_PORT; $oldData = $env:AUREA_DATA_DIR
try {
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

    $chrome = Start-Process -FilePath $chromePath -ArgumentList @(
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync',
        '--no-service-autorun', '--remote-allow-origins=*', "--remote-debugging-port=$CdpPort",
        "--user-data-dir=$chromeProfile", 'about:blank'
    ) -PassThru -WindowStyle Hidden
    $target = $null
    for ($i = 0; $i -lt 40 -and $null -eq $target; $i++) {
        try {
            $targets = (Invoke-WebRequest "http://127.0.0.1:$CdpPort/json/list" -UseBasicParsing).Content | ConvertFrom-Json
            foreach ($candidate in $targets) {
                if ([string]$candidate.type -eq 'page' -and -not [string]::IsNullOrWhiteSpace([string]$candidate.webSocketDebuggerUrl)) {
                    $target = $candidate; break
                }
            }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if ($null -eq $target) { throw 'Chrome não publicou um alvo CDP.' }
    $socket = [Net.WebSockets.ClientWebSocket]::new()
    $socket.Options.SetRequestHeader('Origin', "http://127.0.0.1:$CdpPort")
    [void]$socket.ConnectAsync([Uri][string]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $script:commandId = 0; $script:consoleErrors = [Collections.Generic.List[string]]::new()
    [void](Send-Cdp 'Runtime.enable'); [void](Send-Cdp 'Page.enable')
    [void](Send-Cdp 'Page.navigate' @{ url = "$baseUrl/" })
    $loaded = $false
    while (-not $loaded) { $event = Receive-Cdp 30000; Record-CdpError $event; $loaded = $event.Method -in @('Page.loadEventFired', 'Page.frameStoppedLoading') }
    Start-Sleep -Milliseconds 3000
    $domId = Send-Cdp 'Runtime.evaluate' @{ expression = 'document.documentElement.outerHTML'; returnByValue = $true }
    $html = $null
    while ($null -eq $html) { $event = Receive-Cdp 10000; Record-CdpError $event; if ($event.id -eq $domId) { $html = [string]$event.result.result.value } }
    foreach ($landmark in @('AUREA SOLARIS', 'ENTRAR', 'INSCREVER-SE')) {
        if (-not $html.ToUpperInvariant().Contains($landmark)) { throw "Landmark ausente no DOM: $landmark" }
        Write-Output "LANDMARK $landmark=present"
    }
    if ($script:consoleErrors.Count) { throw "Erros de console CDP: $($script:consoleErrors -join ', ')" }
    Write-Output "RESULT api_port=$ApiPort cdp_port=$CdpPort health=$($health.StatusCode) root=$($root.StatusCode) openapi=$($openapi.StatusCode) cdp_console_errors=0"
} finally {
    if ($null -ne $socket -and $socket.State -eq [Net.WebSockets.WebSocketState]::Open) { [void]$socket.CloseAsync([Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [Threading.CancellationToken]::None).GetAwaiter().GetResult() }
    if ($null -ne $chrome) { Stop-Tree $chrome.Id }; if ($null -ne $runtime) { Stop-Tree $runtime.Id }
    if ($null -eq $oldPort) { Remove-Item Env:ASTRO_API_PORT -ErrorAction SilentlyContinue } else { $env:ASTRO_API_PORT = $oldPort }
    if ($null -eq $oldData) { Remove-Item Env:AUREA_DATA_DIR -ErrorAction SilentlyContinue } else { $env:AUREA_DATA_DIR = $oldData }
    if ([IO.Directory]::Exists($tempRoot)) { [IO.Directory]::Delete($tempRoot, $true) }
}
