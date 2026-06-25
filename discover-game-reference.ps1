param(
    [switch] $Json,
    [ValidateSet('poe2')]
    [string] $Game = 'poe2'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$profilePath = Join-Path $repoRoot "games/$Game.yaml"

function Read-GameProfile {
    param([Parameter(Mandatory = $true)][string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Game profile not found: $Path"
    }

    $profile = [ordered]@{
        id = $null
        name = $null
        steamAppId = $null
        steamAppName = $null
        logCandidates = @()
    }

    $lines = Get-Content -LiteralPath $Path
    $section = $null
    $currentCandidate = $null
    $currentLocator = $null

    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) {
            continue
        }

        if ($trimmed -match '^id:\s*(.+)$') {
            $profile.id = $Matches[1].Trim('"')
            continue
        }

        if ($trimmed -match '^name:\s*(.+)$') {
            $profile.name = $Matches[1].Trim('"')
            continue
        }

        if ($trimmed -match '^(install_locators|log_candidates):\s*$') {
            $section = $Matches[1]
            $currentCandidate = $null
            $currentLocator = $null
            continue
        }

        if ($trimmed -match '^[a-zA-Z_]+:\s*$') {
            $section = $null
            continue
        }

        if ($section -eq 'install_locators') {
            if ($trimmed -match '^-\s+type:\s*(.+)$') {
                $currentLocator = @{ type = $Matches[1].Trim('"') }
                continue
            }

            if ($null -ne $currentLocator -and $trimmed -match '^app_id:\s*(.+)$') {
                $value = $Matches[1].Trim('"')
                if ($value -ne 'TBD') {
                    $profile.steamAppId = $value
                }
                continue
            }

            if ($null -ne $currentLocator -and $trimmed -match '^app_name:\s*(.+)$') {
                $profile.steamAppName = $Matches[1].Trim('"')
                continue
            }
        }

        if ($section -eq 'log_candidates') {
            if ($trimmed -match '^-\s+type:\s*(.+)$') {
                $currentCandidate = @{
                    type = $Matches[1].Trim('"')
                    path = $null
                    label = $null
                    status = $null
                }
                $profile.logCandidates += $currentCandidate
                continue
            }

            if ($null -ne $currentCandidate -and $trimmed -match '^path:\s*(.+)$') {
                $currentCandidate.path = $Matches[1].Trim('"')
                continue
            }

            if ($null -ne $currentCandidate -and $trimmed -match '^label:\s*(.+)$') {
                $currentCandidate.label = $Matches[1].Trim('"')
                continue
            }

            if ($null -ne $currentCandidate -and $trimmed -match '^status:\s*(.+)$') {
                $currentCandidate.status = $Matches[1].Trim('"')
                continue
            }
        }
    }

    return [pscustomobject]$profile
}

function Read-VdfKeyValues {
    param([Parameter(Mandatory = $true)][string] $Path)

    $content = Get-Content -Raw -LiteralPath $Path
    $matches = [regex]::Matches($content, '"(?<key>[^"]+)"\s+"(?<value>[^"]*)"')
    $values = @{}

    foreach ($match in $matches) {
        $values[$match.Groups['key'].Value] = $match.Groups['value'].Value
    }

    return $values
}

function Get-SteamRoots {
    $candidates = @(
        'C:\Program Files (x86)\Steam',
        'C:\Program Files\Steam',
        'D:\Steam',
        'D:\SteamLibrary'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'steamapps')) {
            [pscustomobject]@{
                path = $candidate
                source = 'common-path'
            }
        }
    }
}

function Get-SteamLibraries {
    param([Parameter(Mandatory = $true)][string[]] $SteamRoots)

    $libraries = New-Object System.Collections.Generic.List[object]

    foreach ($root in $SteamRoots) {
        $libraries.Add([pscustomobject]@{ path = $root; source = 'steam-root' })
        $libraryFile = Join-Path $root 'steamapps/libraryfolders.vdf'
        if (-not (Test-Path -LiteralPath $libraryFile)) {
            continue
        }

        $content = Get-Content -Raw -LiteralPath $libraryFile
        $pathMatches = [regex]::Matches($content, '"path"\s+"(?<path>[^"]+)"')
        foreach ($match in $pathMatches) {
            $path = $match.Groups['path'].Value -replace '\\\\', '\'
            if (Test-Path -LiteralPath (Join-Path $path 'steamapps')) {
                $libraries.Add([pscustomobject]@{ path = $path; source = $libraryFile })
            }
        }
    }

    $libraries | Sort-Object path -Unique
}

function Find-SteamApp {
    param(
        [Parameter(Mandatory = $true)][object[]] $Libraries,
        [string] $AppId,
        [string] $AppName
    )

    foreach ($library in $Libraries) {
        $manifestRoot = Join-Path $library.path 'steamapps'
        $manifests = Get-ChildItem -LiteralPath $manifestRoot -Filter 'appmanifest_*.acf' -ErrorAction SilentlyContinue

        foreach ($manifest in $manifests) {
            $values = Read-VdfKeyValues -Path $manifest.FullName
            $manifestAppId = $values['appid']
            $manifestName = $values['name']
            $installDir = $values['installdir']

            $appIdMatches = -not [string]::IsNullOrWhiteSpace($AppId) -and $manifestAppId -eq $AppId
            $nameMatches = -not [string]::IsNullOrWhiteSpace($AppName) -and $manifestName -eq $AppName

            if ($appIdMatches -or $nameMatches) {
                $installPath = Join-Path (Join-Path $manifestRoot 'common') $installDir
                return [pscustomobject]@{
                    found = $true
                    appId = $manifestAppId
                    appName = $manifestName
                    installDir = $installDir
                    installPath = $installPath
                    manifest = $manifest.FullName
                    library = $library.path
                }
            }
        }
    }

    return [pscustomobject]@{ found = $false }
}

$profile = Read-GameProfile -Path $profilePath
$steamRoots = @(Get-SteamRoots)
$libraries = @(Get-SteamLibraries -SteamRoots @($steamRoots.path))
$app = Find-SteamApp -Libraries $libraries -AppId $profile.steamAppId -AppName $profile.steamAppName

if (-not $Json) {
    Write-Host "GameScope Local discovery report: $Game"
    Write-Host "Profile: $profilePath"
    Write-Host "Steam roots found: $($steamRoots.Count)"
    Write-Host "Steam libraries found: $($libraries.Count)"

    if (-not $app.found) {
        Write-Host 'Game install: not found through Steam metadata.'
        Write-Host 'Fallback locators are future work: running process path, registry uninstall, manual path.'
        exit 1
    }

    Write-Host "Game install: found"
    Write-Host "App ID:       $($app.appId)"
    Write-Host "App name:     $($app.appName)"
    Write-Host "Install dir:  $($app.installDir)"
    Write-Host "Install path: $($app.installPath)"
    Write-Host "Manifest:     $($app.manifest)"
    Write-Host ''
    Write-Host 'Log candidates:'
} elseif (-not $app.found) {
    # If JSON is true and app is not found, we still want to continue and output JSON indicating not found
}

$missing = $false
$logResults = @()

foreach ($candidate in $profile.logCandidates) {
    if ($candidate.type -ne 'relative_to_install') {
        if (-not $Json) {
            Write-Host "- $($candidate.label): skipped unsupported candidate type $($candidate.type)"
        }
        $logResults += [pscustomobject]@{
            label = $candidate.label
            type = $candidate.type
            found = $false
            error = "unsupported candidate type"
        }
        continue
    }

    if ($app.found) {
        $candidatePath = Join-Path $app.installPath $candidate.path
        if (Test-Path -LiteralPath $candidatePath) {
            $item = Get-Item -LiteralPath $candidatePath
            if (-not $Json) {
                Write-Host "- $($candidate.label): found ($($item.Length) bytes, last write $($item.LastWriteTime))"
                Write-Host "  path: $candidatePath"
            }
            $logResults += [pscustomobject]@{
                label = $candidate.label
                type = $candidate.type
                path = $candidatePath
                found = $true
                sizeBytes = $item.Length
                lastWrite = $item.LastWriteTime.ToString('o')
            }
        }
        else {
            if (-not $Json) {
                Write-Host "- $($candidate.label): missing"
                Write-Host "  path: $candidatePath"
            }
            $logResults += [pscustomobject]@{
                label = $candidate.label
                type = $candidate.type
                path = $candidatePath
                found = $false
            }
            $missing = $true
        }
    }
}

if ($Json) {
    $result = [pscustomobject]@{
        status = if ($app.found) { 'ok' } else { 'not_found' }
        game = $Game
        profileName = $profile.name
        install = if ($app.found) {
            [pscustomobject]@{
                appId = $app.appId
                appName = $app.appName
                installDir = $app.installDir
                installPath = $app.installPath
            }
        } else { $null }
        logs = $logResults
    }
    $result | ConvertTo-Json -Depth 5
    if ($missing -or -not $app.found) { exit 1 } else { exit 0 }
}

Write-Host ''
Write-Host 'Discovery is read-only. No collector config was generated or applied.'

if ($missing) {
    exit 1
}

exit 0
