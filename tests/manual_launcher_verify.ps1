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
if ($null -eq $chromePath) { throw 'Chrome não foi encontrado.' }

$baseUrl = "http://127.0.0.1:$ApiPort"
$health = Invoke-WebRequest "$baseUrl/health" -UseBasicParsing -TimeoutSec 3
$root = Invoke-WebRequest "$baseUrl/" -UseBasicParsing -TimeoutSec 3
if ($health.StatusCode -ne 200 -or $root.StatusCode -ne 200) {
    throw "Serviço indisponível em $baseUrl"
}

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-launcher-verify-' + [guid]::NewGuid().ToString('N'))
$chromeProfile = Join-Path $tempRoot 'chrome-profile'
$cdpPortRange = 9900..9922

function Get-ListeningPorts {
    @(Get-NetTCPConnection -State Listen -ErrorAction Stop | ForEach-Object { [int]$_.LocalPort })
}
function Select-FreePort([int[]]$Candidates, [int[]]$OccupiedPorts) {
    foreach ($candidate in $Candidates) {
        if ($OccupiedPorts -notcontains $candidate) { return $candidate }
    }
    return $null
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
function Invoke-CdpEval([string]$Expression) {
    $id = Send-Cdp 'Runtime.evaluate' @{ expression = $Expression; returnByValue = $true; awaitPromise = $true }
    while ($true) {
        $event = Receive-Cdp 15000
        if ($event.id -eq $id) {
            if ($null -ne $event.result.exceptionDetails) {
                throw "CDP evaluate failed: $($event.result.exceptionDetails | ConvertTo-Json -Compress -Depth 8)"
            }
            return $event.result.result.value
        }
    }
}
function Wait-PageLoad {
    $loaded = $false
    while (-not $loaded) {
        $event = Receive-Cdp 30000
        $loaded = $event.Method -in @('Page.loadEventFired', 'Page.frameStoppedLoading')
    }
    Start-Sleep -Milliseconds 1500
}
function Assert-LandmarksVisible([string[]]$Labels) {
    $landmarkJson = $Labels | ConvertTo-Json -Compress
    $expr = @'
(() => {
  const requested = __LANDMARKS__;
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  const qualifies = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const opacity = Number.parseFloat(style.opacity);
    const intersectsViewport = rect.right > 0 && rect.bottom > 0 &&
      rect.left < window.innerWidth && rect.top < window.innerHeight;
    return style.display !== 'none' &&
      style.visibility !== 'hidden' && style.visibility !== 'collapse' &&
      opacity > 0 && rect.width > 0 && rect.height > 0 && intersectsViewport;
  };
  return requested.map((label) => {
    const elements = Array.from(document.querySelectorAll('*'))
      .filter((element) => normalize(element.textContent || '').includes(label))
      .filter(qualifies);
    return { label, visible: elements.length > 0 };
  });
})()
'@.Replace('__LANDMARKS__', $landmarkJson)
    $results = @(Invoke-CdpEval $expr)
    foreach ($landmark in $results) {
        if (-not $landmark.visible) { throw "Landmark não visível: $($landmark.label)" }
        Write-Output "LANDMARK $($landmark.label)=visible"
    }
}

$chrome = $null; $socket = $null
$script:cleanupFailures = [Collections.Generic.List[string]]::new()
try {
    $occupied = Get-ListeningPorts
    if ($CdpPort -eq 0) { $CdpPort = Select-FreePort $cdpPortRange $occupied }
    if ($null -eq $CdpPort) { throw 'Sem porta CDP livre.' }
    New-Item -ItemType Directory -Path $chromeProfile | Out-Null

    $chrome = Start-Process -FilePath $chromePath -ArgumentList @(
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--remote-allow-origins=*', "--remote-debugging-port=$CdpPort",
        "--user-data-dir=$chromeProfile", 'about:blank'
    ) -PassThru -WindowStyle Hidden

    $target = $null
    for ($i = 0; $i -lt 40 -and $null -eq $target; $i++) {
        try {
            $targets = (Invoke-WebRequest "http://127.0.0.1:$CdpPort/json/list" -UseBasicParsing).Content | ConvertFrom-Json
            foreach ($candidate in $targets) {
                if ([string]$candidate.type -eq 'page') { $target = $candidate; break }
            }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if ($null -eq $target) { throw 'Chrome CDP indisponível.' }

    $socket = [Net.WebSockets.ClientWebSocket]::new()
    [void]$socket.ConnectAsync([Uri][string]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $script:commandId = 0
    [void](Send-Cdp 'Runtime.enable'); [void](Send-Cdp 'Page.enable')
    [void](Send-Cdp 'Page.navigate' @{ url = "$baseUrl/" })
    Wait-PageLoad

    $pageUrl = [string](Invoke-CdpEval 'location.href')
    if ($pageUrl -notmatch '^http://127\.0\.0\.1:' + $ApiPort) {
        throw "URL inesperada: $pageUrl (esperado 127.0.0.1:$ApiPort)"
    }
    Write-Output "URL $pageUrl"

    Assert-LandmarksVisible @('Aurea Solaris', 'Entrar', 'Inscrever-se')

    $token = [guid]::NewGuid().ToString('N').Substring(0, 12)
    $testName = "launcher-verify-$token"
    $testPassword = "Aurea!Test-$token-12"

    [void](Invoke-CdpEval @"
(() => {
  const clickByText = (text) => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find((el) => el.textContent.replace(/\s+/g, ' ').trim() === text);
    if (!btn) throw new Error('Botão não encontrado: ' + text);
    btn.click();
    return true;
  };
  return clickByText('Inscrever-se');
})()
"@)
    Start-Sleep -Milliseconds 800

    [void](Invoke-CdpEval @"
(() => {
  const setValue = (selector, value) => {
    const input = document.querySelector(selector);
    if (!input) throw new Error('Input não encontrado: ' + selector);
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    native.set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return input.value;
  };
  setValue('input[placeholder*=\"Viviane\"]', '$testName');
  const passwordInputs = Array.from(document.querySelectorAll('input[type=\"password\"], input[placeholder*=\"•\"]'));
  if (!passwordInputs.length) throw new Error('Campo de senha não encontrado');
  const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  native.set.call(passwordInputs[0], '$testPassword');
  passwordInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  passwordInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()
"@)
    Start-Sleep -Milliseconds 500

    [void](Invoke-CdpEval @"
(() => {
  const btn = Array.from(document.querySelectorAll('button'))
    .find((el) => el.textContent.replace(/\s+/g, ' ').trim().includes('Selar Identidade'));
  if (!btn) throw new Error('Botão Selar Identidade não encontrado');
  btn.click();
  return true;
})()
"@)

    $authed = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 1000
        try {
            Assert-LandmarksVisible @('Caderno Vivo', 'Astrologia')
            $authed = $true
            break
        } catch {
            if ($i -eq 19) { throw }
        }
    }
    if (-not $authed) { throw 'Navegação principal não carregou após login.' }

    $finalUrl = [string](Invoke-CdpEval 'location.href')
    if ($finalUrl -notmatch '^http://127\.0\.0\.1:' + $ApiPort) {
        throw "URL pós-login inesperada: $finalUrl"
    }

    Write-Output "LOGIN user=$testName"
    Write-Output "NAVIGATION Caderno Vivo,Astrologia=visible"
    Write-Output "RESULT PASS api_port=$ApiPort cdp_port=$CdpPort url=$finalUrl health=$($health.StatusCode)"
} finally {
    if ($null -ne $socket -and $socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
        try { $socket.Abort() } catch {}
        try { $socket.Dispose() } catch {}
    }
    if ($null -ne $chrome) {
        try { Stop-Tree $chrome } catch {}
    }
    if ([IO.Directory]::Exists($tempRoot)) {
        try { [IO.Directory]::Delete($tempRoot, $true) } catch {}
    }
}
