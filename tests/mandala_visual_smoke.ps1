# Automated Mandala smoke for FDM-677 — attaches to an already-running Aurea API on 127.0.0.1
# Uses skip-login local-owner access and the opt-in mock natal (?mockNatal=1).
param(
    [int]$ApiPort = 9876,
    [int]$CdpPort = 0
)

$ErrorActionPreference = 'Stop'
$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
. (Join-Path $PSScriptRoot 'browser_runtime_process_tree.ps1')

$chromeCandidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($null -eq $chromePath) { throw 'Chrome não encontrado.' }

function Get-ListeningPorts {
    @(Get-NetTCPConnection -State Listen -ErrorAction Stop | ForEach-Object { [int]$_.LocalPort })
}
function Select-FreePort([int[]]$Candidates, [int[]]$OccupiedPorts) {
    foreach ($candidate in $Candidates) {
        if ($OccupiedPorts -notcontains $candidate) { return $candidate }
    }
    return $null
}

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-mandala-smoke-' + [guid]::NewGuid().ToString('N'))
$chromeProfile = Join-Path $tempRoot 'chrome-profile'
$cdpPortRange = 9900..9922
$occupied = Get-ListeningPorts
if ($CdpPort -eq 0) { $CdpPort = Select-FreePort $cdpPortRange $occupied }
if ($null -eq $CdpPort) { throw 'Sem porta CDP livre.' }
if ($occupied -contains $CdpPort) { throw "Porta CDP $CdpPort ocupada." }

$baseUrl = "http://127.0.0.1:$ApiPort"
$health = Invoke-WebRequest "$baseUrl/health" -UseBasicParsing -TimeoutSec 5
if ($health.StatusCode -ne 200) { throw "API não saudável em $baseUrl" }

$bootBody = @{ command = 'private_initial_access'; args = @{} } | ConvertTo-Json -Compress
$boot = Invoke-RestMethod -Method Post -Uri "$baseUrl/browser/command" -Body $bootBody -ContentType 'application/json'
$ownerId = [string]$boot.result.ownerId
if ([string]$boot.result.kind -ne 'local-owner' -or [string]::IsNullOrWhiteSpace($ownerId)) {
    throw 'private_initial_access não devolveu dono local autenticado.'
}

function Send-Cdp([string]$Method, [hashtable]$Params = @{}) {
    $script:commandId++
    $payload = @{ id = $script:commandId; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 12
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
        [void]$script:consoleErrors.Add("$([string]$Event.Method): $($Event | ConvertTo-Json -Compress -Depth 6)")
    } elseif ($Event.Method -eq 'Log.entryAdded' -and [string]$Event.params.entry.level -eq 'error') {
        $entry = $Event.params.entry
        [void]$script:logErrors.Add("Log.entryAdded: $($entry.text)")
    }
}
function Wait-ForCdpResult([int]$Id, [int]$TimeoutMs = 15000) {
    $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
    while ([DateTime]::UtcNow -lt $deadline) {
        $event = Receive-Cdp 2000
        Record-CdpError $event
        if ($event.id -eq $Id) {
            if ($null -ne $event.result.exceptionDetails) {
                throw "CDP evaluate failed: $($event.result.exceptionDetails | ConvertTo-Json -Compress -Depth 6)"
            }
            return $event.result.result
        }
    }
    throw "CDP command $Id timed out"
}

$chrome = $null; $socket = $null
$script:commandId = 0
$script:consoleErrors = [Collections.Generic.List[string]]::new()
$script:logErrors = [Collections.Generic.List[string]]::new()
$cleanupFailures = [Collections.Generic.List[string]]::new()
$screenshotPath = Join-Path $tempRoot 'mandala-smoke.png'

try {
    New-Item -ItemType Directory -Path $chromeProfile -Force | Out-Null
    $chrome = Start-Process -FilePath $chromePath -ArgumentList @(
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--disable-extensions', '--remote-allow-origins=*', '--window-size=1440,900',
        "--remote-debugging-port=$CdpPort",
        "--user-data-dir=$chromeProfile", 'about:blank'
    ) -PassThru -WindowStyle Hidden
    $chromeRootPid = [int]$chrome.Id
    $chromeKnown = @{}
    $cdpOwned = $false
    for ($i = 0; $i -lt 30; $i++) {
        $snapshot = @(Get-ProcessSnapshot)
        $byPid = @{}; foreach ($identity in $snapshot) { $byPid[[string]$identity.Pid] = $identity }
        foreach ($identity in $snapshot) {
            if ($chromeKnown.ContainsKey($identity.Key)) { continue }
            $parent = $byPid[[string]$identity.ParentPid]
            if ($null -ne $parent -and $chromeKnown.ContainsKey($parent.Key)) { $chromeKnown[$identity.Key] = $identity }
        }
        $root = $snapshot | Where-Object { $_.Pid -eq $chromeRootPid } | Select-Object -First 1
        if ($null -ne $root) { $chromeKnown[$root.Key] = $root }
        $listeners = @(Get-NetTCPConnection -LocalPort $CdpPort -State Listen -ErrorAction SilentlyContinue)
        if ($listeners.Count -gt 0) { $cdpOwned = $true; break }
        Start-Sleep -Milliseconds 100
    }
    if (-not $cdpOwned) { throw "Chrome CDP $CdpPort não abriu." }

    $target = $null
    for ($i = 0; $i -lt 40 -and $null -eq $target; $i++) {
        try {
            $targets = (Invoke-WebRequest "http://127.0.0.1:$CdpPort/json/list" -UseBasicParsing).Content | ConvertFrom-Json
            foreach ($candidate in $targets) {
                if ([string]$candidate.type -eq 'page' -and $candidate.webSocketDebuggerUrl) {
                    $target = $candidate; break
                }
            }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if ($null -eq $target) { throw 'Sem alvo CDP.' }

    $socket = [Net.WebSockets.ClientWebSocket]::new()
    $socket.Options.SetRequestHeader('Origin', "http://127.0.0.1:$CdpPort")
    [void]$socket.ConnectAsync([Uri][string]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    [void](Send-Cdp 'Runtime.enable'); [void](Send-Cdp 'Log.enable'); [void](Send-Cdp 'Page.enable')
    [void](Send-Cdp 'Emulation.setDeviceMetricsOverride' @{
        width = 1440
        height = 900
        deviceScaleFactor = 1
        mobile = $false
    })
    [void](Send-Cdp 'Page.navigate' @{ url = "$baseUrl/?mockNatal=1" })
    $loaded = $false
    while (-not $loaded) {
        $event = Receive-Cdp 30000
        Record-CdpError $event
        $loaded = $event.Method -in @('Page.loadEventFired', 'Page.frameStoppedLoading')
    }
    Start-Sleep -Seconds 2

    $authCheckExpr = @'
(() => ({
  loginVisible: Boolean(document.querySelector('input[type="password"]')),
  mandalaHeader: Array.from(document.querySelectorAll('h1')).some((h) => (h.textContent || '').includes('Mandala')),
  astrologiaNav: Boolean(document.querySelector('[title="Astrologia"]')),
  alertText: (document.querySelector('[role="alert"]')?.textContent || '').trim(),
}))()
'@
    $authId = Send-Cdp 'Runtime.evaluate' @{ expression = $authCheckExpr; returnByValue = $true }
    $authCheck = Wait-ForCdpResult $authId 10000
    if ($authCheck.value.loginVisible -or -not $authCheck.value.mandalaHeader) {
        throw "Autenticação não completou: loginVisible=$($authCheck.value.loginVisible) mandalaHeader=$($authCheck.value.mandalaHeader) alert=$($authCheck.value.alertText)"
    }
    $mandalaReady = $false
    for ($attempt = 0; $attempt -lt 60 -and -not $mandalaReady; $attempt++) {
        Start-Sleep -Seconds 1
        $readyExpr = @'
(() => {
  const shell = document.querySelector('.mandala-chart-shell');
  const svgs = shell ? Array.from(shell.querySelectorAll('svg')) : [];
  const chart = svgs.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  const width = chart ? chart.getBoundingClientRect().width : 0;
  return {
    shell: Boolean(shell),
    svg: Boolean(chart) && width > 100,
    header: Boolean(Array.from(document.querySelectorAll('h1')).some((h) => (h.textContent || '').includes('Mandala'))),
  };
})()
'@
        $readyId = Send-Cdp 'Runtime.evaluate' @{ expression = $readyExpr; returnByValue = $true }
        $ready = Wait-ForCdpResult $readyId 10000
        if ($ready.value.shell -and $ready.value.svg) { $mandalaReady = $true }
    }
    if (-not $mandalaReady) { Write-Output 'MANDALA_SMOKE warning=chart_not_ready_after_wait' }

    $inspectExpr = @'
(() => {
  const shell = document.querySelector('.mandala-chart-shell');
  const svgs = shell ? Array.from(shell.querySelectorAll('svg')) : [];
  const svg = svgs.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] || null;
  const header = Array.from(document.querySelectorAll('h1')).find((h) => (h.textContent || '').includes('Mandala'));
  const alerts = Array.from(document.querySelectorAll('[role="alert"], .text-red-500, .text-amber-900')).map((el) => (el.textContent || '').trim()).filter(Boolean);
  const errorBanner = Array.from(document.querySelectorAll('*')).find((el) => (el.textContent || '').startsWith('⚠️'));
  const loadingSpinner = Array.from(document.querySelectorAll('*')).some((el) => (el.textContent || '').includes('Sintonizando Esferas Celestes'));
  const missingBirth = Array.from(document.querySelectorAll('*')).some((el) => (el.textContent || '').includes('faltam dados de nascimento confirmados'));
  const noData = Array.from(document.querySelectorAll('*')).some((el) => (el.textContent || '').trim() === 'Nenhum dado astrológico disponível para este mapa.');
  const svgInfo = svg ? {
    width: svg.getBoundingClientRect().width,
    height: svg.getBoundingClientRect().height,
    childCount: svg.childNodes.length,
    circleCount: svg.querySelectorAll('circle').length,
    lineCount: svg.querySelectorAll('line').length,
    pathCount: svg.querySelectorAll('path').length,
  } : null;
  const ascLabel = Array.from(document.querySelectorAll('text, tspan, span, div')).find((el) => /^ASC$/i.test((el.textContent || '').trim()));
  let ascPosition = null;
  if (ascLabel && svg) {
    const rect = ascLabel.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    ascPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      svgCenterX: svgRect.left + svgRect.width / 2,
      svgCenterY: svgRect.top + svgRect.height / 2,
      leftOfCenter: (rect.left + rect.width / 2) < (svgRect.left + svgRect.width / 2),
    };
  }
  return {
    mandalaHeaderVisible: Boolean(header),
    mandalaHeaderText: header ? header.textContent : null,
    shellPresent: Boolean(shell),
    svgPresent: Boolean(svg),
    svgInfo,
    missingBirthBanner: missingBirth,
    noDataMessage: noData,
    alerts,
    errorBanner: errorBanner ? (errorBanner.textContent || '').trim() : null,
    loadingSpinner,
    ascPosition,
    bodySnippet: (document.body.innerText || '').slice(0, 500),
  };
})()
'@
    $inspectId = Send-Cdp 'Runtime.evaluate' @{ expression = $inspectExpr; returnByValue = $true }
    $inspect = Wait-ForCdpResult $inspectId 20000

    $shotId = Send-Cdp 'Page.captureScreenshot' @{ format = 'png'; captureBeyondViewport = $true }
    $shotData = $null
    $shotDeadline = [DateTime]::UtcNow.AddMilliseconds(10000)
    while ([DateTime]::UtcNow -lt $shotDeadline -and -not $shotData) {
        $event = Receive-Cdp 2000
        Record-CdpError $event
        if ($event.id -eq $shotId) {
            $shotData = [string]$event.result.data
            break
        }
    }
    if ($shotData) {
        [IO.File]::WriteAllBytes($screenshotPath, [Convert]::FromBase64String($shotData))
        $evidenceDir = Join-Path $repoRoot 'docs/evidence'
        New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
        $evidencePath = Join-Path $evidenceDir 'mandala-smoke-fdm677.png'
        Copy-Item -LiteralPath $screenshotPath -Destination $evidencePath -Force
        Write-Output "MANDALA_SMOKE evidence_copy=$evidencePath"
    }

    $pass = $inspect.value.shellPresent -and $inspect.value.svgPresent -and
        ($inspect.value.svgInfo.width -gt 100) -and ($inspect.value.svgInfo.childCount -gt 0) -and
        -not $inspect.value.missingBirthBanner -and -not $inspect.value.noDataMessage

    Write-Output "MANDALA_SMOKE api_port=$ApiPort cdp_port=$CdpPort owner_id=$ownerId"
    Write-Output "MANDALA_SMOKE local_owner=ok auth_alert=$($authCheck.value.alertText)"
    Write-Output "MANDALA_SMOKE shell_present=$($inspect.value.shellPresent)"
    Write-Output "MANDALA_SMOKE svg_present=$($inspect.value.svgPresent)"
    Write-Output "MANDALA_SMOKE svg_width=$($inspect.value.svgInfo.width)"
    Write-Output "MANDALA_SMOKE svg_children=$($inspect.value.svgInfo.childCount)"
    Write-Output "MANDALA_SMOKE svg_circles=$($inspect.value.svgInfo.circleCount)"
    Write-Output "MANDALA_SMOKE svg_lines=$($inspect.value.svgInfo.lineCount)"
    Write-Output "MANDALA_SMOKE error_banner=$($inspect.value.errorBanner)"
    Write-Output "MANDALA_SMOKE loading_spinner=$($inspect.value.loadingSpinner)"
    Write-Output "MANDALA_SMOKE no_data_message=$($inspect.value.noDataMessage)"
    Write-Output "MANDALA_SMOKE mandala_header=$($inspect.value.mandalaHeaderText)"
    if ($inspect.value.ascPosition) {
        Write-Output "MANDALA_SMOKE asc_left_of_center=$($inspect.value.ascPosition.leftOfCenter)"
    } else {
        Write-Output "MANDALA_SMOKE asc_left_of_center=unmeasured"
    }
    Write-Output "MANDALA_SMOKE cdp_console_errors=$($script:consoleErrors.Count)"
    Write-Output "MANDALA_SMOKE cdp_log_errors=$($script:logErrors.Count)"
    Write-Output "MANDALA_SMOKE screenshot=$screenshotPath"
    Write-Output "MANDALA_SMOKE pass=$pass"
    if ($script:consoleErrors.Count -gt 0) { $script:consoleErrors | ForEach-Object { Write-Output "MANDALA_SMOKE_CONSOLE $_" } }
    if (-not $pass) { throw 'Mandala automated smoke failed.' }
} finally {
    if ($null -ne $socket) {
        try { $socket.CloseAsync([Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [Threading.CancellationToken]::None).GetAwaiter().GetResult() } catch {}
        try { $socket.Dispose() } catch {}
    }
    if ($null -ne $chrome) {
        try { Stop-Tree $chrome } catch { [void]$cleanupFailures.Add($_.Exception.Message) }
    }
    if (Test-Path -LiteralPath $tempRoot) {
        try { Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction Stop } catch { [void]$cleanupFailures.Add($_.Exception.Message) }
    }
    if ($cleanupFailures.Count -gt 0) { Write-Output "MANDALA_SMOKE cleanup_warnings=$($cleanupFailures -join '; ')" }
}
