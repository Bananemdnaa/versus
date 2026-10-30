# Registers the Discord slash commands /versus and /rules (/regeln in German Discord) for the Versus app.
# They are answered by supabase/functions/discord-interactions. Run again after changing a command here.
# Usage: powershell -ExecutionPolicy Bypass -File tools/discord-commands.ps1
# The Client Secret (Developer Portal → OAuth2) is asked for here and never stored.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$id = '1565782186832039987'
$sec = Read-Host 'Client Secret (Developer Portal -> OAuth2)' -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${id}:$plain"))
$tok = Invoke-RestMethod -Method Post -Uri 'https://discord.com/api/v10/oauth2/token' -Headers @{ Authorization = "Basic $basic" } `
  -Body @{ grant_type = 'client_credentials'; scope = 'applications.commands.update' } -ContentType 'application/x-www-form-urlencoded'
$h = @{ Authorization = "Bearer $($tok.access_token)" }

# integration_types 0 = server install, 1 = user install; contexts 0 = server, 1 = DM with the app, 2 = other DMs and group calls
$cmds = @(
  [ordered]@{ name = 'versus'; type = 1; integration_types = @(0, 1); contexts = @(0, 1, 2)
    description = 'Start Versus: quick games for your voice channel'; description_localizations = @{ de = 'Versus starten: schnelle Spiele für deinen Sprachkanal' } },
  [ordered]@{ name = 'rules'; name_localizations = @{ de = 'regeln' }; type = 1; integration_types = @(0, 1); contexts = @(0, 1, 2)
    description = "Show a game's short rules"; description_localizations = @{ de = 'Kurzregeln eines Spiels zeigen' }
    options = @([ordered]@{ type = 3; name = 'game'; name_localizations = @{ de = 'spiel' }; description = 'Which game'; description_localizations = @{ de = 'Welches Spiel' }; required = $true; autocomplete = $true }) }
)
# one by one (not all at once): Discord keeps the activity's own start command untouched that way
foreach ($c in $cmds) {
  $json = $c | ConvertTo-Json -Depth 6 -Compress
  $r = Invoke-RestMethod -Method Post -Uri "https://discord.com/api/v10/applications/$id/commands" -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($json)) -ContentType 'application/json; charset=utf-8'
  Write-Output "registered /$($r.name)"
}
