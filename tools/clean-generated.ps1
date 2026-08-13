# Conservative cleanup for known generated paths. Default mode reports only.
param(
    [switch]$Apply,
    [string]$RepositoryRoot
)

$ErrorActionPreference = 'Stop'

if ($RepositoryRoot) {
    $RepoRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path.TrimEnd('\')
} else {
    $RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
}

$ProtectedRoots = @(
    '.aurea-build-venv',
    'src-tauri\binaries',
    'knowledge',
    'natal_charts',
    'src-tauri\memory',
    'data',
    'backups',
    'tests'
)

$ProtectedExtensions = @('.sqlite', '.db', '.stronghold', '.vault')

$FixedAllowlist = @(
    'dist',
    'build',
    'work\cargo-target-dev',
    'src-tauri\target'
)

$DynamicDirectoryNames = @('__pycache__', '.pytest_cache')

function Get-RelativePath([string]$FullPath) {
    $normalized = $FullPath.TrimEnd('\')
    if (-not $normalized.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }
    if ($normalized.Length -eq $RepoRoot.Length) {
        return ''
    }
    return $normalized.Substring($RepoRoot.Length + 1)
}

function Test-IsReparsePoint([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }
    $item = Get-Item -LiteralPath $Path -Force
    return ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
}

function Test-IsUnderProtectedRoot([string]$RelativePath) {
    if ([string]::IsNullOrEmpty($RelativePath)) {
        return $true
    }
    $normalized = $RelativePath -replace '/', '\'
    foreach ($protected in $ProtectedRoots) {
        if (
            $normalized.Equals($protected, [StringComparison]::OrdinalIgnoreCase) -or
            $normalized.StartsWith("$protected\", [StringComparison]::OrdinalIgnoreCase)
        ) {
            return $true
        }
    }
    return $false
}

function Test-HasProtectedExtension([string]$Path) {
    foreach ($extension in $ProtectedExtensions) {
        if ($Path.EndsWith($extension, [StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

function Test-ContainsNestedReparsePoint([string]$Path) {
    if (Test-IsReparsePoint $Path) {
        return $true
    }
    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }
    $item = Get-Item -LiteralPath $Path -Force
    if (-not $item.PSIsContainer) {
        return $false
    }
    foreach ($child in Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue) {
        if (($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            return $true
        }
        if ($child.PSIsContainer) {
            if (Test-ContainsNestedReparsePoint $child.FullName) {
                return $true
            }
        }
    }
    return $false
}

function Get-PathBytes([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return 0
    }
    if (Test-ContainsNestedReparsePoint $Path) {
        throw "Reparse point detected under allowlisted path: $Path"
    }
    $item = Get-Item -LiteralPath $Path -Force
    if (-not $item.PSIsContainer) {
        return [int64]$item.Length
    }
    $total = [int64]0
    foreach ($child in Get-ChildItem -LiteralPath $Path -Force -Recurse -File -ErrorAction SilentlyContinue) {
        if (($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Reparse point detected under allowlisted path: $($child.FullName)"
        }
        $total += [int64]$child.Length
    }
    return $total
}

function Test-IsAllowedCandidate([string]$FullPath) {
    $relative = Get-RelativePath $FullPath
    if ($null -eq $relative) {
        return $false
    }
    if ([string]::IsNullOrEmpty($relative)) {
        return $false
    }
    if (Test-IsUnderProtectedRoot $relative) {
        return $false
    }
    if (Test-HasProtectedExtension $FullPath) {
        return $false
    }

    $normalized = $relative -replace '/', '\'
    foreach ($allowed in $FixedAllowlist) {
        if ($normalized.Equals($allowed, [StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    $leaf = Split-Path -Leaf $normalized
    foreach ($dynamicName in $DynamicDirectoryNames) {
        if ($leaf.Equals($dynamicName, [StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

function Get-AllowlistCandidates {
    $candidates = [System.Collections.Generic.List[string]]::new()

    foreach ($relative in $FixedAllowlist) {
        [void]$candidates.Add((Join-Path $RepoRoot $relative))
    }

    $queue = [System.Collections.Generic.Queue[string]]::new()
    $queue.Enqueue($RepoRoot)
    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $relative = Get-RelativePath $current
        if ($null -eq $relative) {
            continue
        }
        if (-not [string]::IsNullOrEmpty($relative) -and (Test-IsUnderProtectedRoot $relative)) {
            continue
        }
        foreach ($child in Get-ChildItem -LiteralPath $current -Force -ErrorAction SilentlyContinue) {
            if (-not $child.PSIsContainer) {
                continue
            }
            if (($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                continue
            }
            $leaf = $child.Name
            foreach ($dynamicName in $DynamicDirectoryNames) {
                if ($leaf.Equals($dynamicName, [StringComparison]::OrdinalIgnoreCase)) {
                    [void]$candidates.Add($child.FullName)
                }
            }
            $queue.Enqueue($child.FullName)
        }
    }

    return ($candidates | Sort-Object -Unique)
}

function Write-CandidateLine([string]$Path, [bool]$Exists, [int64]$Bytes, [string]$Action) {
    Write-Output ("PATH={0} EXISTS={1} BYTES={2} ACTION={3}" -f $Path, $(if ($Exists) { 'True' } else { 'False' }), $Bytes, $Action)
}

$candidates = Get-AllowlistCandidates
foreach ($candidate in $candidates) {
    $canonical = (Resolve-Path -LiteralPath $candidate -ErrorAction SilentlyContinue)
    if ($null -eq $canonical) {
        Write-CandidateLine $candidate $false 0 'REPORT'
        continue
    }
    $canonicalPath = $canonical.Path
    if (-not (Test-IsAllowedCandidate $canonicalPath)) {
        continue
    }

    $exists = Test-Path -LiteralPath $canonicalPath
    $bytes = 0
    $refused = $false
    if ($exists) {
        try {
            $bytes = Get-PathBytes $canonicalPath
        } catch {
            $refused = $true
            $bytes = 0
        }
    }

    if ($Apply -and $exists -and -not $refused) {
        if (-not (Test-IsAllowedCandidate $canonicalPath)) {
            Write-CandidateLine $canonicalPath $exists $bytes 'REPORT'
            continue
        }
        if (Test-ContainsNestedReparsePoint $canonicalPath) {
            Write-CandidateLine $canonicalPath $exists $bytes 'REPORT'
            continue
        }
        $item = Get-Item -LiteralPath $canonicalPath -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            Write-CandidateLine $canonicalPath $exists $bytes 'REPORT'
            continue
        }
        if ($item.PSIsContainer) {
            Remove-Item -LiteralPath $canonicalPath -Recurse -Force
        } else {
            Remove-Item -LiteralPath $canonicalPath -Force
        }
        Write-CandidateLine $canonicalPath $true $bytes 'DELETE'
    } else {
        Write-CandidateLine $canonicalPath $exists $bytes 'REPORT'
    }
}
