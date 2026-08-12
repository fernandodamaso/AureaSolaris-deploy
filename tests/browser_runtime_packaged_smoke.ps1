param(
    [Parameter(Mandatory)] [string]$RuntimePath,
    [int]$ApiPort = 0
)

$ErrorActionPreference = 'Stop'
$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
. (Join-Path $PSScriptRoot 'browser_runtime_process_tree.ps1')
$RuntimePath = if ([IO.Path]::IsPathRooted($RuntimePath)) { $RuntimePath } else { Join-Path $repoRoot $RuntimePath }
$RuntimePath = (Resolve-Path -LiteralPath $RuntimePath).Path
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-packaged-smoke-' + [guid]::NewGuid().ToString('N'))
$dataDir = Join-Path $tempRoot 'data'
$stdout = Join-Path $tempRoot 'stdout.log'
$stderr = Join-Path $tempRoot 'stderr.log'
$runtime = $null
$oldPort = $env:ASTRO_API_PORT
$oldData = $env:AUREA_DATA_DIR
$cleanupFailures = [Collections.Generic.List[string]]::new()

function Invoke-CleanupStep([string]$Name, [scriptblock]$Action) {
    try { & $Action; Write-Output "CLEANUP $Name=ok" }
    catch {
        $detail = "CLEANUP $Name=failed error=$($_.Exception.Message)"
        Write-Output $detail
        [void]$cleanupFailures.Add($detail)
    }
}

try {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    if ($ApiPort -eq 0) {
        $ApiPort = 9877
        while ($ApiPort -le 9899 -and (Get-NetTCPConnection -LocalPort $ApiPort -State Listen -ErrorAction SilentlyContinue)) { $ApiPort++ }
    }
    if ($ApiPort -gt 9899) { throw 'Nenhuma porta livre no intervalo 9877-9899.' }
    $env:ASTRO_API_PORT = [string]$ApiPort
    $env:AUREA_DATA_DIR = $dataDir
    # PyInstaller one-file executables use a short-lived extraction parent.
    # Keep an exact, owned PowerShell root alive around that child so the
    # process-tree identity remains available through cleanup.
    $escapedRuntime = $RuntimePath.Replace("'", "''")
    $escapedRoot = $repoRoot.Replace("'", "''")
    $launchCommand = "& { Start-Process -FilePath '$escapedRuntime' -WorkingDirectory '$escapedRoot' -WindowStyle Hidden | Out-Null; Start-Sleep -Seconds 120 }"
    $runtime = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $launchCommand) -WorkingDirectory $repoRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
    $base = "http://127.0.0.1:$ApiPort"
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try {
            $health = Invoke-WebRequest "$base/health" -UseBasicParsing -TimeoutSec 1
            $root = Invoke-WebRequest "$base/" -UseBasicParsing -TimeoutSec 1
            $openapi = Invoke-WebRequest "$base/openapi.json" -UseBasicParsing -TimeoutSec 1
            if ($health.StatusCode -eq 200 -and $root.StatusCode -eq 200 -and $openapi.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Sidecar não ficou pronto em $base." }
    $healthJson = $health.Content | ConvertFrom-Json
    if ($healthJson.engine -ne 'swisseph') { throw "Motor inesperado: $($healthJson.engine)" }
    if ($root.Content -notmatch 'Aurea Solaris') { throw 'A raiz não serviu a interface compilada.' }
    if ($openapi.Content -notmatch '/browser/command') { throw 'OpenAPI não contém /browser/command.' }
    Write-Output "SMOKE PASS port=$ApiPort health=200 engine=swisseph root=200 openapi=200"
} finally {
    Invoke-CleanupStep 'runtime-tree' { if ($null -ne $runtime) { Stop-Tree $runtime } }
    Invoke-CleanupStep 'ASTRO_API_PORT-restore' {
        if ($null -eq $oldPort) { Remove-Item Env:ASTRO_API_PORT -ErrorAction SilentlyContinue }
        else { $env:ASTRO_API_PORT = $oldPort }
    }
    Invoke-CleanupStep 'AUREA_DATA_DIR-restore' {
        if ($null -eq $oldData) { Remove-Item Env:AUREA_DATA_DIR -ErrorAction SilentlyContinue }
        else { $env:AUREA_DATA_DIR = $oldData }
    }
    Invoke-CleanupStep 'owned-port-free' {
        $remaining = @(Get-NetTCPConnection -LocalPort $ApiPort -State Listen -ErrorAction SilentlyContinue)
        if ($remaining.Count) { throw "Porta ainda em uso: $ApiPort" }
    }
    Invoke-CleanupStep 'temp-root-remove' {
        if ([IO.Directory]::Exists($tempRoot)) { [IO.Directory]::Delete($tempRoot, $true) }
    }
    Invoke-CleanupStep 'temp-root-residue' { if ([IO.Directory]::Exists($tempRoot)) { throw "Pasta temporária ainda existe: $tempRoot" } }
    if ($cleanupFailures.Count) { throw "Falhas de limpeza:`n$($cleanupFailures -join "`n")" }
}
