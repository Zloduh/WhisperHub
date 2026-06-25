param(
    [string] $Path = 'D:\SteamLibrary\steamapps\common\Path of Exile 2\logs\Client.txt',
    [ValidateRange(1, 2160)]
    [int] $LookbackMinutes = 1440,
    [ValidateRange(1, 500)]
    [int] $MaxSamples = 80,
    [switch] $Json
)

$ErrorActionPreference = 'Stop'

function Get-Poe2LogCategory {
    param([string] $Message)

    if ($Message -match '^\[INFO Client [0-9]+\] [#$%]') {
        return 'chat'
    }

    if ($Message -match '(?i)(Device Removed|0x887a|TriggerDeviceDestroyed|Restarting device|Stopping device|TriggerDeviceCreate|TriggerDeviceReset)') {
        return 'render_device'
    }

    if ($Message -match '(?i)(Starting device: DirectX12|Starting device: Vulkan)') {
        return 'renderer_transition'
    }

    if ($Message -match '(?i)(Insufficient VRAM|Shader uses incorrect vertex layout|Pipeline generation failed|Failed to create effect graph node|File Not Found: Metadata/Effects)') {
        return 'render_asset'
    }

    if ($Message -match '(?i)(Irrecoverable Exception|exception|crash|fatal|assert)') {
        return 'crash_exception'
    }

    if ($Message -match '(?i)(Abnormal disconnect|unexpected disconnection|failed to connect|connection failed|timeout|lost connection)') {
        return 'network_disconnect'
    }

    if ($Message -match '(?i)(Unable to load steam stats|EShop CallForAction|PaymentPackages|call for action)') {
        return 'eshop_steam_noise'
    }

    if ($Message -match '(?i)(Got Instance Details from login server|Connecting to instance server|Connect time to instance server|Client-Safe Instance ID|InstanceClientSetSelfPartyInvitationSecurityCode|Async connecting to .*login\.pathofexile2\.com|Connected to .*login\.pathofexile2\.com)') {
        return 'instance_routine'
    }

    if ($Message -match '\[WINDOW\] (Lost|Gained) focus') {
        return 'window_focus'
    }

    if ($Message -match '(?i)(\[STARTUP\]|\[ENGINE\]|\[D3D12\]|\[VULKAN\]|\[STREAMLINE\]|\[SOUND\]|\[TEXTURE\]|\[SHADER\]|\[MESH\]|\[MAT\]|\[GRAPH\]|\[PARTICLE\]|\[TRAILS\]|\[VIDEO\])') {
        return 'startup_normal'
    }

    if ($Message -match '\[(CRIT|WARN) Client') {
        return 'generic_warn_crit'
    }

    return 'other'
}

if (-not (Test-Path -LiteralPath $Path)) {
    throw "POE2 client log not found: $Path"
}

$since = (Get-Date).AddMinutes(-1 * $LookbackMinutes)
$records = New-Object System.Collections.Generic.List[object]

Get-Content -LiteralPath $Path | ForEach-Object {
    if ($_ -notmatch '^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})\s+\d+\s+\S+\s+(\[[^\]]+\])\s+(.*)$') {
        return
    }

    $timestamp = [datetime]::ParseExact($matches[1], 'yyyy/MM/dd HH:mm:ss', $null)
    if ($timestamp -lt $since) {
        return
    }

    $header = $matches[2]
    $message = $matches[3]
    $level = if ($header -match '^\[([^ ]+) Client') { $matches[1] } else { 'UNKNOWN' }
    $gameProcessId = if ($header -match '^\\[[^ ]+ Client ([0-9]+)\\]') { $matches[1] } else { '' }
    $category = Get-Poe2LogCategory -Message "$header $message"

    $records.Add([pscustomobject]@{
        timestamp = $timestamp.ToString('o')
        level = $level
        processId = $gameProcessId
        category = $category
        message = $message
        line = [string]$_
    })
}

$highSignalCategories = @('render_device', 'renderer_transition', 'render_asset', 'crash_exception', 'network_disconnect')
$summary = @(
    $records |
        Group-Object category |
        Sort-Object Count -Descending |
        ForEach-Object {
            [pscustomobject]@{
                category = $_.Name
                count = $_.Count
            }
        }
)

$samples = @(
    $records |
        Where-Object { $_.category -in $highSignalCategories } |
        Sort-Object timestamp -Descending |
        Select-Object -First $MaxSamples |
        Select-Object timestamp, level, processId, category, message, line
)

$result = [pscustomobject]@{
    status = 'ok'
    path = $Path
    generatedAt = (Get-Date).ToString('o')
    lookbackMinutes = $LookbackMinutes
    total = $records.Count
    summary = $summary
    highSignalSamples = $samples
}

if ($Json) {
    $result | ConvertTo-Json -Depth 4
    exit 0
}

Write-Host 'POE2 client log classification'
Write-Host "Log:      $Path"
Write-Host "Lookback: $LookbackMinutes minute(s)"
Write-Host "Records:  $($records.Count)"
Write-Host ''
$summary | Format-Table -AutoSize
Write-Host ''
Write-Host 'Recent high-signal samples'
$samples | Select-Object timestamp, level, category, message | Format-Table -Wrap
