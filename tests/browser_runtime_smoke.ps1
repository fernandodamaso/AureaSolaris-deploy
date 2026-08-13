param(
    [string]$RuntimePath = '',
    [string[]]$RuntimeArguments = @(),
    [int]$ApiPort = 0,
    [int]$CdpPort = 0,
    [switch]$PortSelectionOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
. (Join-Path $PSScriptRoot 'browser_runtime_process_tree.ps1')

$venvPython = Join-Path $repoRoot '.aurea-build-venv\Scripts\python.exe'
$apiScript = Join-Path $repoRoot 'main_api.py'
if ([string]::IsNullOrWhiteSpace($RuntimePath)) {
    if (-not (Test-Path -LiteralPath $venvPython)) {
        throw "Python do runtime não encontrado: $venvPython"
    }
    if (-not (Test-Path -LiteralPath $apiScript)) {
        throw "main_api.py não encontrado: $apiScript"
    }
    $RuntimePath = (Resolve-Path -LiteralPath $venvPython).Path
    $RuntimeArguments = @($apiScript)
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

$distIndex = Join-Path $repoRoot 'dist\index.html'
if (-not (Test-Path -LiteralPath $distIndex)) {
    throw 'dist/index.html não foi encontrado. Execute npm run build antes do smoke de origem.'
}

$apiPortRange = 9877..9899
$cdpPortRange = 9900..9922
$inspectExpression = @'
(() => {
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
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
  const visibleByTitle = (title) =>
    Array.from(document.querySelectorAll('[title="' + title + '"]')).some(qualifies);
  const visibleButton = (label) =>
    Array.from(document.querySelectorAll('button')).some((element) =>
      normalize(element.textContent) === label && qualifies(element));
  const visibleText = (label) =>
    Array.from(document.querySelectorAll('p,h1,h2,span,button')).some((element) =>
      normalize(element.textContent) === label && qualifies(element));
  return {
    astrologia: visibleByTitle('Astrologia'),
    entrar: visibleButton('Entrar'),
    inscrever: visibleButton('Inscrever-se'),
    loginProtocol: visibleText('Protocolo de Identidade Ativa'),
    sair: visibleButton('Sair')
  };
})()
'@

function Get-ListeningPorts {
    try {
        @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
            ForEach-Object { [int]$_.LocalPort })
    } catch {
        throw "Não foi possível inspecionar portas TCP em escuta: $($_.Exception.Message)"
    }
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

function Send-Cdp([string]$Method, [hashtable]$Params = @{}) {
    $script:commandId++
    $payload = @{ id = $script:commandId; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 10
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    [void]$script:socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true,
        [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    return $script:commandId
}
function Receive-Cdp([int]$TimeoutMs) {
    $buffer = New-Object byte[] 65536; $message = [Text.StringBuilder]::new()
    do {
        $task = $script:socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None)
        if (-not $task.Wait($TimeoutMs)) { $script:socket.Abort(); throw [TimeoutException]::new('CDP timeout') }
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
    } elseif ($script:ignoreLoginRequired403 -and
        $Event.Method -eq 'Log.entryAdded' -and
        [string]$Event.params.entry.level -eq 'error' -and
        [string]$Event.params.entry.source -eq 'network' -and
        [string]$Event.params.entry.url -match '/browser/command' -and
        [string]$Event.params.entry.text -match '403') {
        return
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
function Invoke-CdpEvaluate([string]$Expression) {
    $evalId = Send-Cdp 'Runtime.evaluate' @{ expression = $Expression; returnByValue = $true }
    while ($true) {
        $event = Receive-Cdp 10000
        Record-CdpError $event
        if ($event.id -eq $evalId) {
            if ($null -ne $event.result.exceptionDetails) {
                throw "Falha ao avaliar a página: $($event.result.exceptionDetails | ConvertTo-Json -Compress -Depth 6)"
            }
            return $event.result.result.value
        }
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

function Invoke-BrowserCommand {
    param(
        [string]$BaseUrl,
        [string]$Command,
        [hashtable]$CommandArgs = @{},
        [string]$Token = '',
        [string]$RawBody = ''
    )
    $uri = "$BaseUrl/browser/command"
    $body = if (-not [string]::IsNullOrWhiteSpace($RawBody)) {
        $RawBody
    } else {
        @{ command = $Command; args = $CommandArgs } | ConvertTo-Json -Compress -Depth 8
    }
    $params = @{
        Uri = $uri
        Method = 'POST'
        ContentType = 'application/json'
        Body = $body
        UseBasicParsing = $true
        TimeoutSec = 10
    }
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $params.Headers = @{ 'X-Aurea-Browser-Session' = $Token }
    }
    try {
        $resp = Invoke-WebRequest @params
        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json } catch { }
        return [pscustomobject]@{ StatusCode = [int]$resp.StatusCode; Json = $json }
    } catch {
        $status = 0
        $content = ''
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $content = [string]$_.ErrorDetails.Message
        }
        $response = $_.Exception.Response
        if ($null -ne $response) {
            $status = [int]$response.StatusCode
            if ([string]::IsNullOrWhiteSpace($content)) {
                try {
                    $stream = $response.GetResponseStream()
                    if ($null -ne $stream) {
                        $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8)
                        $content = $reader.ReadToEnd()
                        $reader.Dispose()
                    }
                } catch { }
            }
        }
        if ($status -eq 0) { throw "Falha HTTP em ${Command}: $($_.Exception.Message)" }
        $json = $null
        if ($content) { try { $json = $content | ConvertFrom-Json } catch { } }
        return [pscustomobject]@{ StatusCode = $status; Json = $json }
    }
}

function Start-OwnedApiProcess {
    param([string]$StdoutPath, [string]$StderrPath)
    $escapedRuntime = $RuntimePath.Replace("'", "''")
    $escapedRoot = $repoRoot.Replace("'", "''")
    $escapedStdout = $StdoutPath.Replace("'", "''")
    $escapedStderr = $StderrPath.Replace("'", "''")
    $argumentList = ''
    if ($RuntimeArguments.Count) {
        $escapedArgs = @($RuntimeArguments | ForEach-Object { $_.Replace("'", "''") })
        $quoted = ($escapedArgs | ForEach-Object { "'$_'" }) -join ', '
        $argumentList = " -ArgumentList @($quoted)"
    }
    $redirect = " -RedirectStandardOutput '$escapedStdout' -RedirectStandardError '$escapedStderr'"
    $launchCommand = "& { Start-Process -FilePath '$escapedRuntime'$argumentList -WorkingDirectory '$escapedRoot'$redirect -WindowStyle Hidden | Out-Null; Start-Sleep -Seconds 120 }"
    return Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $launchCommand) -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden
}

function Invoke-IsolatedChromeSmoke {
    param(
        [Parameter(Mandatory)] [ValidateSet('local-owner', 'require-login')] [string]$ExpectedAuthMode,
        [int]$PreferredApiPort = 0,
        [int]$PreferredCdpPort = 0
    )

    $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-browser-smoke-' + [guid]::NewGuid().ToString('N'))
    $dataDir = Join-Path $tempRoot 'data'
    $chromeProfile = Join-Path $tempRoot 'chrome-profile'
    $apiStdout = Join-Path $tempRoot 'api-stdout.log'
    $apiStderr = Join-Path $tempRoot 'api-stderr.log'
    $runtime = $null
    $chrome = $null
    $script:socket = $null
    $oldPort = $env:ASTRO_API_PORT
    $oldData = $env:AUREA_DATA_DIR
    $oldLogin = $env:AUREA_REQUIRE_LOGIN
    $script:cleanupFailures = [Collections.Generic.List[string]]::new()
    $selectedApi = 0
    $selectedCdp = 0
    $testError = $null

    try {
        $occupied = Get-ListeningPorts
        $selectedApi = if ($PreferredApiPort -ne 0) { $PreferredApiPort } else { Select-FreePort $apiPortRange $occupied }
        $cdpCandidates = @($cdpPortRange | Where-Object { $_ -ne $selectedApi })
        $selectedCdp = if ($PreferredCdpPort -ne 0) { $PreferredCdpPort } else { Select-FreePort $cdpCandidates $occupied }
        if ($selectedApi -notin $apiPortRange -or $selectedCdp -notin $cdpPortRange -or $selectedApi -eq $selectedCdp) {
            throw 'As portas devem ser API 9877-9899 e CDP 9900-9922, e devem ser distintas.'
        }
        Assert-PortFree $selectedApi
        Assert-PortFree $selectedCdp
        Write-Output "MODE $ExpectedAuthMode"
        Write-Output "PORT_DISCOVERY listening_addresses=all api_port=$selectedApi cdp_port=$selectedCdp"
        New-Item -ItemType Directory -Path $dataDir, $chromeProfile | Out-Null

        $env:ASTRO_API_PORT = [string]$selectedApi
        $env:AUREA_DATA_DIR = $dataDir
        if ($ExpectedAuthMode -eq 'require-login') {
            $env:AUREA_REQUIRE_LOGIN = '1'
        } elseif (Test-Path Env:AUREA_REQUIRE_LOGIN) {
            Remove-Item Env:AUREA_REQUIRE_LOGIN
        }

        $runtime = Start-OwnedApiProcess -StdoutPath $apiStdout -StderrPath $apiStderr
        Write-Output "OWNED_API_PID=$($runtime.Id)"
        $baseUrl = "http://127.0.0.1:$selectedApi"
        $ready = $false
        $health = $null
        $root = $null
        $openapi = $null
        for ($i = 0; $i -lt 40; $i++) {
            try {
                $health = Invoke-WebRequest "$baseUrl/health" -UseBasicParsing -TimeoutSec 1
                $root = Invoke-WebRequest "$baseUrl/" -UseBasicParsing -TimeoutSec 1
                $openapi = Invoke-WebRequest "$baseUrl/openapi.json" -UseBasicParsing -TimeoutSec 1
                if ($health.StatusCode -eq 200 -and $root.StatusCode -eq 200 -and $openapi.StatusCode -eq 200) { $ready = $true; break }
            } catch { Start-Sleep -Milliseconds 500 }
        }
        if (-not $ready) { throw "API isolada não ficou pronta em $baseUrl." }

        $healthJson = $health.Content | ConvertFrom-Json
        if ([string]$healthJson.auth_mode -ne $ExpectedAuthMode) {
            throw "auth_mode=$($healthJson.auth_mode), esperado $ExpectedAuthMode"
        }
        if ([int]$healthJson.browser_contract_version -ne 2) {
            throw "browser_contract_version=$($healthJson.browser_contract_version), esperado 2"
        }
        Write-Output "HEALTH auth_mode=$($healthJson.auth_mode) browser_contract_version=$($healthJson.browser_contract_version)"

        if ($ExpectedAuthMode -eq 'local-owner') {
            $boot = Invoke-BrowserCommand -BaseUrl $baseUrl -Command 'private_initial_access'
            if ($boot.StatusCode -ne 200) { throw "private_initial_access status=$($boot.StatusCode)" }
            $kind = [string]$boot.Json.result.kind
            $ownerId = [string]$boot.Json.result.ownerId
            $token = [string]$boot.Json.browser_session_token
            if ($kind -ne 'local-owner' -or [string]::IsNullOrWhiteSpace($ownerId) -or [string]::IsNullOrWhiteSpace($token)) {
                throw 'private_initial_access não devolveu dono local autenticado'
            }
            $saveBody = '{"command":"save_board","args":{"boardId":"smoke-board","name":"Smoke","nodes":[{"id":"n1"}],"edges":[]}}'
            $saved = Invoke-BrowserCommand -BaseUrl $baseUrl -Command 'save_board' -Token $token -RawBody $saveBody
            if ($saved.StatusCode -ne 200) { throw "save_board status=$($saved.StatusCode)" }
            $loaded = Invoke-BrowserCommand -BaseUrl $baseUrl -Command 'load_board' -CommandArgs @{ boardId = 'smoke-board' } -Token $token
            if ($loaded.StatusCode -ne 200) { throw "load_board status=$($loaded.StatusCode)" }
            if ([string]$loaded.Json.result.owner_id -ne $ownerId) { throw 'load_board não devolveu o mesmo proprietário' }
            $loadedNodes = @($loaded.Json.result.nodes)
            if ($loadedNodes.Count -ne 1 -or [string]$loadedNodes[0].id -ne 'n1') {
                throw 'load_board não devolveu o caderno gravado'
            }
            Write-Output "BOARD_ROUNDTRIP status=ok owner_kind=$kind"
        } else {
            $denied = Invoke-BrowserCommand -BaseUrl $baseUrl -Command 'private_initial_access'
            if ($denied.StatusCode -ne 403) { throw "private_initial_access status=$($denied.StatusCode), esperado 403" }
            $code = [string]$denied.Json.detail.code
            $message = [string]$denied.Json.detail.message
            if ($code -ne 'login-required') { throw "private_initial_access code=$code, esperado login-required" }
            if ([string]::IsNullOrWhiteSpace($message) -or $message -notmatch 'Login local') {
                throw 'private_initial_access nao devolveu a mensagem documentada de login-required'
            }
            Write-Output "PRIVATE_INITIAL_ACCESS status=403 code=$code"
        }

        Assert-PortFree $selectedCdp
        $chrome = Start-Process -FilePath $chromePath -ArgumentList @(
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
            '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync',
            '--no-service-autorun', '--remote-allow-origins=*', "--remote-debugging-port=$selectedCdp",
            "--user-data-dir=$chromeProfile", 'about:blank'
        ) -PassThru -WindowStyle Hidden
        Write-Output "OWNED_CHROME_PID=$($chrome.Id)"
        $chromeRootPid = [int]$chrome.Id
        $chromeInitial = @(Get-ProcessSnapshot)
        $chromeRootIdentity = $chromeInitial | Where-Object { $_.Pid -eq $chromeRootPid } | Select-Object -First 1
        if ($null -eq $chromeRootIdentity) { throw "Não foi possível confirmar a identidade do processo raiz do Chrome: $chromeRootPid" }
        $chromeKnown = @{}
        $chromeKnown[$chromeRootIdentity.Key] = $chromeRootIdentity
        $cdpOwned = $false
        for ($i = 0; $i -lt 20; $i++) {
            $snapshot = @(Get-ProcessSnapshot)
            $byPid = @{}
            foreach ($identity in $snapshot) { $byPid[[string]$identity.Pid] = $identity }
            foreach ($identity in $snapshot) {
                if ($chromeKnown.ContainsKey($identity.Key)) { continue }
                $parent = $byPid[[string]$identity.ParentPid]
                if ($null -ne $parent -and $chromeKnown.ContainsKey($parent.Key)) {
                    $chromeKnown[$identity.Key] = $identity
                }
            }
            $cdpListeners = @(Get-NetTCPConnection -LocalPort $selectedCdp -State Listen -ErrorAction Stop)
            if ($cdpListeners.Count -gt 0) {
                foreach ($listener in $cdpListeners) {
                    $owner = $byPid[[string][int]$listener.OwningProcess]
                    if ($null -eq $owner -or -not $chromeKnown.ContainsKey($owner.Key)) {
                        throw "A porta CDP $selectedCdp foi ocupada por um processo cuja identidade não pertence à árvore do Chrome."
                    }
                }
                $cdpOwned = $true
                break
            }
            Start-Sleep -Milliseconds 100
        }
        if (-not $cdpOwned) { throw "Chrome não abriu a porta CDP $selectedCdp." }
        $target = $null
        for ($i = 0; $i -lt 40 -and $null -eq $target; $i++) {
            try {
                $version = (Invoke-WebRequest "http://127.0.0.1:$selectedCdp/json/version" -UseBasicParsing).Content | ConvertFrom-Json
                $versionUri = [Uri][string]$version.webSocketDebuggerUrl
                if ($versionUri.Host -ne '127.0.0.1' -or $versionUri.Port -ne $selectedCdp) { throw 'Endpoint CDP inesperado.' }
                $targets = (Invoke-WebRequest "http://127.0.0.1:$selectedCdp/json/list" -UseBasicParsing).Content | ConvertFrom-Json
                foreach ($candidate in $targets) {
                    $targetUri = $null
                    $targetUri = if (-not [string]::IsNullOrWhiteSpace([string]$candidate.webSocketDebuggerUrl)) { [Uri][string]$candidate.webSocketDebuggerUrl }
                    if ([string]$candidate.type -eq 'page' -and $null -ne $targetUri -and $targetUri.Host -eq '127.0.0.1' -and $targetUri.Port -eq $selectedCdp) {
                        $target = $candidate; break
                    }
                }
            } catch { Start-Sleep -Milliseconds 250 }
        }
        if ($null -eq $target) { throw 'Chrome não publicou um alvo CDP.' }
        $script:socket = [Net.WebSockets.ClientWebSocket]::new()
        $script:socket.Options.SetRequestHeader('Origin', "http://127.0.0.1:$selectedCdp")
        [void]$script:socket.ConnectAsync([Uri][string]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
        $script:commandId = 0
        $script:consoleErrors = [Collections.Generic.List[string]]::new()
        $script:logErrors = [Collections.Generic.List[string]]::new()
        $script:logo404Count = 0
        $script:ignoreLoginRequired403 = ($ExpectedAuthMode -eq 'require-login')
        [void](Send-Cdp 'Runtime.enable'); [void](Send-Cdp 'Log.enable'); [void](Send-Cdp 'Network.enable'); [void](Send-Cdp 'Page.enable')
        [void](Send-Cdp 'Page.navigate' @{ url = "$baseUrl/" })
        $loaded = $false
        while (-not $loaded) { $event = Receive-Cdp 30000; Record-CdpError $event; $loaded = $event.Method -in @('Page.loadEventFired', 'Page.frameStoppedLoading') }

        $state = $null
        $deadline = (Get-Date).AddSeconds(25)
        do {
            $state = Invoke-CdpEvaluate $inspectExpression
            if ($ExpectedAuthMode -eq 'local-owner' -and [bool]$state.astrologia) { break }
            if ($ExpectedAuthMode -eq 'require-login' -and [bool]$state.entrar -and [bool]$state.loginProtocol) { break }
            Start-Sleep -Milliseconds 400
        } while ((Get-Date) -lt $deadline)
        if ($null -eq $state) { throw 'Não foi possível inspecionar a página.' }

        if ($ExpectedAuthMode -eq 'local-owner') {
            if (-not [bool]$state.astrologia) { throw 'Landmark Astrologia/main-shell não está visível.' }
            if ([bool]$state.entrar) { throw 'Entrar deveria estar ausente no modo local-owner.' }
            if ([bool]$state.inscrever) { throw 'Inscrever-se deveria estar ausente no modo local-owner.' }
            Write-Output 'LANDMARK Astrologia=visible'
            Write-Output 'LANDMARK Entrar=absent'
            Write-Output 'LANDMARK Inscrever-se=absent'
            $null = Invoke-CdpEvaluate @'
(() => {
  const buttons = Array.from(document.querySelectorAll('aside button'));
  const named = buttons.find((button) => /aurea/i.test(button.textContent || ''));
  const target = named || buttons[buttons.length - 1];
  if (target) target.click();
  return { clicked: Boolean(target) };
})()
'@
            Start-Sleep -Milliseconds 500
            $editor = Invoke-CdpEvaluate $inspectExpression
            if ([bool]$editor.sair) { throw 'O editor de perfil local-owner contém o botão Sair.' }
            Write-Output 'PROFILE_EDITOR Sair=absent'
        } else {
            if (-not [bool]$state.loginProtocol -or -not [bool]$state.entrar) {
                throw 'LoginView não está visível no modo require-login.'
            }
            if ([bool]$state.astrologia) { throw 'O shell Astrologia não deveria aparecer sem login.' }
            Write-Output 'LOGINVIEW visible'
            Write-Output 'LANDMARK Entrar=visible'
        }

        if ($script:logo404Count -gt 0) { throw "A logo retornou HTTP 404 ($($script:logo404Count) ocorrência(s))." }
        if ($script:consoleErrors.Count -or $script:logErrors.Count) {
            $details = @($script:consoleErrors + $script:logErrors) -join "`n"
            throw "Erros CDP não permitidos:`n$details"
        }
        Write-Output "RESULT MODE=$ExpectedAuthMode PASS api_port=$selectedApi cdp_port=$selectedCdp health=200 root=$($root.StatusCode) openapi=$($openapi.StatusCode) logo_404=$($script:logo404Count) cdp_console_errors=$($script:consoleErrors.Count) cdp_log_errors=$($script:logErrors.Count)"
    } catch {
        $testError = $_
        throw
    } finally {
        Invoke-CleanupStep 'socket-close' {
            if ($null -ne $script:socket -and $script:socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
                $closeCancellation = [Threading.CancellationTokenSource]::new()
                try {
                    $closeTask = $script:socket.CloseAsync(
                        [Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
                        'done',
                        $closeCancellation.Token)
                    if (-not $closeTask.Wait(2000)) {
                        throw [TimeoutException]::new('Tempo limite ao fechar a conexão CDP.')
                    }
                    [void]$closeTask.GetAwaiter().GetResult()
                } finally {
                    $closeCancellation.Cancel()
                    $closeCancellation.Dispose()
                    if ($script:socket.State -notin @([Net.WebSockets.WebSocketState]::Closed, [Net.WebSockets.WebSocketState]::Aborted)) {
                        $script:socket.Abort()
                    }
                }
            }
        }
        Invoke-CleanupStep 'socket-dispose' { if ($null -ne $script:socket) { $script:socket.Dispose() } }
        Invoke-CleanupStep 'chrome-tree' {
            if ($null -eq $chrome) { return }
            $rootPid = [int]$chrome.Id
            $started = $chrome.StartTime
            try {
                $chrome.Refresh()
                if (-not $chrome.HasExited) { Stop-Tree $chrome }
            } catch {
                $current = Get-Process -Id $rootPid -ErrorAction SilentlyContinue
                if ($null -ne $current -and $current.StartTime -eq $started) {
                    Stop-Process -Id $rootPid -Force -ErrorAction Stop
                }
            }
            $deadline = (Get-Date).AddSeconds(5)
            do {
                $current = Get-Process -Id $rootPid -ErrorAction SilentlyContinue
                if ($null -eq $current -or $current.StartTime -ne $started) { return }
                Start-Sleep -Milliseconds 100
            } while ((Get-Date) -lt $deadline)
            throw "Chrome raiz $rootPid ainda em execução"
        }
        Invoke-CleanupStep 'runtime-tree' {
            if ($null -eq $runtime) { return }
            $runtime.Refresh()
            if ($runtime.HasExited) { return }
            Stop-Tree $runtime
        }
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
        Invoke-CleanupStep 'AUREA_REQUIRE_LOGIN-restore' {
            if ($null -eq $oldLogin) {
                if (Test-Path Env:AUREA_REQUIRE_LOGIN) { Remove-Item Env:AUREA_REQUIRE_LOGIN -ErrorAction Stop }
            } else { $env:AUREA_REQUIRE_LOGIN = $oldLogin }
        }
        Invoke-CleanupStep 'owned-ports-free' {
            $residualPorts = @()
            for ($i = 0; $i -lt 50; $i++) {
                $residualPorts = @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
                    Where-Object { $_.LocalPort -in @($selectedApi, $selectedCdp) })
                if (-not $residualPorts.Count) { break }
                Start-Sleep -Milliseconds 100
            }
            if ($residualPorts.Count) { throw "Portas ainda em uso: $($residualPorts.LocalPort -join ', ')" }
        }
        if ($null -ne $testError) {
            foreach ($logName in @('api-stdout.log', 'api-stderr.log')) {
                $logPath = Join-Path $tempRoot $logName
                if (Test-Path -LiteralPath $logPath) {
                    $tail = @(Get-Content -LiteralPath $logPath -Tail 30 -ErrorAction SilentlyContinue)
                    if ($tail.Count) { Write-Output "API_LOG $logName $($tail -join ' | ')" }
                }
            }
        }
        Invoke-CleanupStep 'temp-root-remove' {
            for ($i = 0; $i -lt 20 -and [IO.Directory]::Exists($tempRoot); $i++) {
                try { [IO.Directory]::Delete($tempRoot, $true) } catch { if ($i -eq 19) { throw }; Start-Sleep -Milliseconds 250 }
            }
        }
        Invoke-CleanupStep 'temp-root-residue' { if ([IO.Directory]::Exists($tempRoot)) { throw "Pasta temporária ainda existe: $tempRoot" } }
        if ($script:cleanupFailures.Count) {
            $cleanupText = $script:cleanupFailures -join "`n"
            if ($null -ne $testError) {
                throw "TESTE: $($testError.Exception.Message)`nFalhas de limpeza:`n$cleanupText"
            }
            throw "Falhas de limpeza:`n$cleanupText"
        }
    }
}

if ($PortSelectionOnly) {
    $occupied = Get-ListeningPorts
    $selected = Select-FreePort $apiPortRange $occupied
    if ($null -eq $selected) { throw 'Não há porta livre no intervalo da API.' }
    Write-Output "PORT_SELECTION api_port=$selected"
    exit 0
}

Invoke-IsolatedChromeSmoke -ExpectedAuthMode 'local-owner' -PreferredApiPort $ApiPort -PreferredCdpPort $CdpPort
Invoke-IsolatedChromeSmoke -ExpectedAuthMode 'require-login'
Write-Output 'RESULT BOTH_MODES=PASS'
