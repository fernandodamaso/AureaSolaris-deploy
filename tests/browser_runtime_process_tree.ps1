function Convert-CimCreationDateToUtc([object]$Value) {
    if ($Value -is [DateTime]) {
        return ([DateTime]::SpecifyKind([DateTime]$Value, [DateTimeKind]::Local)).ToUniversalTime()
    }
    try {
        return ([Management.ManagementDateTimeConverter]::ToDateTime([string]$Value)).ToUniversalTime()
    } catch {
        throw "Não foi possível interpretar CreationDate do processo: $($_.Exception.Message)"
    }
}

function New-ProcessIdentity([object]$CimProcess) {
    if ($null -eq $CimProcess.ProcessId -or $null -eq $CimProcess.ParentProcessId -or
        [string]::IsNullOrWhiteSpace([string]$CimProcess.CreationDate)) {
        throw 'A inspeção CIM não retornou a identidade completa de um processo.'
    }
    $startTimeUtc = Convert-CimCreationDateToUtc $CimProcess.CreationDate
    [pscustomobject]@{
        Pid = [int]$CimProcess.ProcessId
        ParentPid = [int]$CimProcess.ParentProcessId
        StartTimeUtc = $startTimeUtc
        StartTimeTicks = $startTimeUtc.Ticks
        Key = "{0}/{1}" -f [int]$CimProcess.ProcessId, $startTimeUtc.Ticks
    }
}

function Get-ProcessSnapshot {
    $processes = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop)
    $snapshot = foreach ($process in $processes) {
        New-ProcessIdentity $process
    }
    return @($snapshot)
}

function Stop-ProcessIdentity([object]$Identity) {
    Stop-Process -Id $Identity.Pid -Force -ErrorAction Stop
}

function Stop-Tree {
    param(
        [Parameter(Mandatory)] [object]$RootProcess,
        [scriptblock]$GetSnapshot = { Get-ProcessSnapshot },
        [scriptblock]$StopIdentity = { param($Identity) Stop-ProcessIdentity $Identity }
    )

    $rootPid = [int]$RootProcess.Id
    $failures = [Collections.Generic.List[string]]::new()
    $known = @{}
    $knownPids = @{}
    $unsafePids = [Collections.Generic.HashSet[int]]::new()
    $uncertainOwnership = [Collections.Generic.HashSet[string]]::new()
    $emptyPasses = 0
    $stableGraphPasses = 0
    $rootKey = $null
    $expectedRootTicks = $null
    $rootStopAttempted = $false
    try {
        $ticksProperty = $RootProcess.PSObject.Properties['StartTimeTicks']
        if ($null -ne $ticksProperty -and $null -ne $ticksProperty.Value) {
            $expectedRootTicks = [long]$ticksProperty.Value
        } else {
            $utcProperty = $RootProcess.PSObject.Properties['StartTimeUtc']
            if ($null -ne $utcProperty -and $null -ne $utcProperty.Value) {
                $expectedRootTicks = ([DateTime]$utcProperty.Value).ToUniversalTime().Ticks
            } else {
                $startProperty = $RootProcess.PSObject.Properties['StartTime']
                if ($null -eq $startProperty -or $null -eq $startProperty.Value) {
                    throw 'O processo raiz não fornece StartTime.'
                }
                $expectedRootTicks = ([DateTime]$startProperty.Value).ToUniversalTime().Ticks
            }
        }
        # Process.StartTime and CIM CreationDate can differ by a few 100 ns
        # ticks on Windows. The first CIM identity becomes the exact key used
        # for all subsequent comparisons; only this representation jitter is
        # tolerated, never a different PID/start identity.
    } catch {
        throw "Não foi possível confirmar a identidade original do processo raiz ${rootPid}: $($_.Exception.Message)"
    }
    $completed = $false

    for ($attempt = 0; $attempt -lt 50; $attempt++) {
        try {
            $snapshot = @(& $GetSnapshot)
        } catch {
            [void]$failures.Add("Não foi possível inspecionar a árvore de processos: $($_.Exception.Message)")
            break
        }

        $byPid = @{}
        foreach ($identity in $snapshot) {
            $byPid[[string]$identity.Pid] = $identity
        }

        if ($null -eq $byPid[[string]$rootPid] -and -not $rootStopAttempted) {
            [void]$failures.Add("Não foi possível confirmar a identidade do processo raiz: $rootPid/$expectedRootTicks")
            break
        }

        $currentRoot = $byPid[[string]$rootPid]
        if ($null -ne $currentRoot -and $null -eq $rootKey) {
            $tickDelta = [Math]::Abs([long]$currentRoot.StartTimeTicks - $expectedRootTicks)
            if ($tickDelta -gt 10) {
                [void]$failures.Add("PID reutilizado; não vou encerrar o processo $rootPid.")
                break
            }
            $rootKey = $currentRoot.Key
        } elseif ($null -ne $currentRoot -and $currentRoot.Key -ne $rootKey) {
            [void]$failures.Add("PID reutilizado; não vou encerrar o processo $rootPid.")
            break
        }
        if ($null -ne $currentRoot -and -not $known.ContainsKey($rootKey)) {
            $known[$rootKey] = $currentRoot
            $knownPids[[string]$rootPid] = $rootKey
        }

        # A child is proven only when its current parent is present in this same
        # snapshot and has an identity already proven to belong to the root.
        # If the parent exited before this observation, ownership is unknown.
        $discovered = 0
        foreach ($identity in $snapshot) {
            if ($known.ContainsKey($identity.Key)) { continue }
            if ($unsafePids.Contains([int]$identity.Pid)) { continue }
            if ($knownPids.ContainsKey([string]$identity.Pid) -and
                $knownPids[[string]$identity.Pid] -ne $identity.Key) {
                [void]$unsafePids.Add([int]$identity.Pid)
                [void]$failures.Add("PID reutilizado; não vou encerrar o processo $($identity.Pid).")
                continue
            }
            $parent = $byPid[[string]$identity.ParentPid]
            if ($null -ne $parent -and $known.ContainsKey($parent.Key)) {
                $known[$identity.Key] = $identity
                $knownPids[[string]$identity.Pid] = $identity.Key
                $discovered++
            } elseif ($knownPids.ContainsKey([string]$identity.ParentPid)) {
                if ($uncertainOwnership.Add($identity.Key)) {
                    [void]$failures.Add("Não foi possível provar a propriedade do processo $($identity.Pid): o processo pai conhecido não está disponível com a mesma identidade.")
                }
            } elseif ($knownPids.ContainsKey([string]$identity.Pid)) {
                [void]$failures.Add("PID reutilizado; não vou encerrar o processo $($identity.Pid).")
            }
        }

        if ($discovered -eq 0) { $stableGraphPasses++ } else { $stableGraphPasses = 0 }

        # Stop deepest known identities first. Every target is matched by PID
        # and creation time immediately before Stop-Process is called.
        $targets = foreach ($identity in $known.Values) {
            if ($identity.Key -eq $rootKey -and $stableGraphPasses -lt 2) { continue }
            $current = $byPid[[string]$identity.Pid]
            if ($null -ne $current) {
                if ($current.Key -ne $identity.Key) {
                    [void]$failures.Add("PID reutilizado; não vou encerrar o processo $($identity.Pid).")
                } else {
                    $depth = 0
                    $parent = $byPid[[string]$current.ParentPid]
                    while ($null -ne $parent -and $known.ContainsKey($parent.Key) -and $depth -lt 100) {
                        $depth++
                        $parent = $byPid[[string]$parent.ParentPid]
                    }
                    [pscustomobject]@{ Identity = $identity; Depth = $depth }
                }
            }
        }
        foreach ($target in @($targets | Sort-Object -Property Depth -Descending)) {
            try {
                # Refresh ownership immediately before every stop. A PID or
                # creation-time change here is a cleanup failure, never a
                # reason to stop the replacement process.
                $preStopSnapshot = @(& $GetSnapshot)
                $preStopByPid = @{}
                foreach ($identity in $preStopSnapshot) { $preStopByPid[[string]$identity.Pid] = $identity }
                $preStopRoot = $preStopByPid[[string]$rootPid]
                if ($null -eq $preStopRoot -or $preStopRoot.Key -ne $rootKey) {
                    [void]$failures.Add("A identidade do processo raiz mudou antes da limpeza; não vou encerrar o processo $rootPid.")
                    continue
                }
                $preStopTarget = $preStopByPid[[string]$target.Identity.Pid]
                if ($null -eq $preStopTarget) { continue }
                if ($preStopTarget.Key -ne $target.Identity.Key) {
                    [void]$unsafePids.Add([int]$target.Identity.Pid)
                    [void]$failures.Add("PID reutilizado antes da limpeza; não vou encerrar o processo $($target.Identity.Pid).")
                    continue
                }
                if ($target.Identity.Key -eq $rootKey) { $rootStopAttempted = $true }
                & $StopIdentity $target.Identity
            } catch {
                try {
                    $afterStop = @(& $GetSnapshot | Where-Object { $_.Pid -eq $target.Identity.Pid })
                    if (-not $afterStop.Count) { continue }
                    if ($afterStop[0].Key -ne $target.Identity.Key) {
                        [void]$failures.Add("PID reutilizado durante a limpeza; não vou encerrar o processo $($target.Identity.Pid).")
                    } else {
                        [void]$failures.Add("Falha ao encerrar processo $($target.Identity.Pid): $($_.Exception.Message)")
                    }
                } catch {
                    [void]$failures.Add("Não foi possível validar a falha ao encerrar processo $($target.Identity.Pid): $($_.Exception.Message)")
                }
            }
        }

        try {
            $postStopSnapshot = @(& $GetSnapshot)
        } catch {
            [void]$failures.Add("Não foi possível confirmar a árvore após a limpeza: $($_.Exception.Message)")
            break
        }
        $postStopByPid = @{}
        foreach ($identity in $postStopSnapshot) { $postStopByPid[[string]$identity.Pid] = $identity }
        $remaining = @($known.Values | Where-Object {
                $current = $postStopByPid[[string]$_.Pid]
                $null -ne $current -and $current.Key -eq $_.Key
            })
        $unprovenPostStop = @($postStopSnapshot | Where-Object {
            $knownPids.ContainsKey([string]$_.ParentPid) -and
            ($null -eq $postStopByPid[[string]$_.ParentPid] -or
                $knownPids[[string]$_.ParentPid] -ne $postStopByPid[[string]$_.ParentPid].Key)
        })
        if ($unprovenPostStop.Count) {
            foreach ($identity in $unprovenPostStop) {
                if ($uncertainOwnership.Add($identity.Key)) {
                    [void]$failures.Add("Não foi possível provar que o descendente $($identity.Pid) deixou a árvore pertencente.")
                }
            }
        }
        if (-not $remaining.Count -and -not $unprovenPostStop.Count) {
            $emptyPasses++
            if ($emptyPasses -ge 2) { $completed = $true; break }
        } else {
            $emptyPasses = 0
        }
        Start-Sleep -Milliseconds 100
    }

    if (-not $completed) {
        [void]$failures.Add('A árvore de processos não estabilizou antes do limite de 50 inspeções; a limpeza não foi considerada bem-sucedida.')
    }

    try {
        $finalSnapshot = @(& $GetSnapshot)
    } catch {
        [void]$failures.Add("Não foi possível validar a limpeza da árvore de processos: $($_.Exception.Message)")
        $finalSnapshot = @()
    }
    $finalByPid = @{}
    foreach ($identity in $finalSnapshot) { $finalByPid[[string]$identity.Pid] = $identity }
    foreach ($identity in $known.Values) {
        $current = $finalByPid[[string]$identity.Pid]
        if ($null -ne $current -and $current.Key -eq $identity.Key) {
            [void]$failures.Add("Processo ainda ativo: $($identity.Pid)")
        } elseif ($null -ne $current -and $current.Key -ne $identity.Key) {
            [void]$failures.Add("PID reutilizado durante a limpeza; não foi possível provar a propriedade do processo $($identity.Pid).")
        }
    }
    foreach ($identity in $finalSnapshot) {
        if ($knownPids.ContainsKey([string]$identity.Pid) -and
            $knownPids[[string]$identity.Pid] -ne $identity.Key) {
            [void]$failures.Add("PID reutilizado durante a validação final; não foi possível provar a propriedade do processo $($identity.Pid).")
            continue
        }
        if ($knownPids.ContainsKey([string]$identity.ParentPid)) {
            $parent = $finalByPid[[string]$identity.ParentPid]
            if ($null -ne $parent -and $knownPids[[string]$identity.ParentPid] -eq $parent.Key) {
                [void]$failures.Add("Descendente de processo pertencente ainda ativo: $($identity.Pid).")
            } else {
                [void]$failures.Add("Não foi possível provar que o descendente $($identity.Pid) deixou a árvore pertencente.")
            }
        }
    }
    if ($failures.Count) { throw ($failures -join "`n") }
}
