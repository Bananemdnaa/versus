# Raises the Versus version everywhere at once: ?v=N in index.html, V.VERSION and the service worker cache name.
# Usage: powershell -File bump.ps1          (next version)
#        powershell -File bump.ps1 -To 30   (a specific version)
param([int]$To = 0)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$indexPath = Join-Path $root 'index.html'
$swPath = Join-Path $root 'sw.js'
$index = [IO.File]::ReadAllText($indexPath, $utf8)
$sw = [IO.File]::ReadAllText($swPath, $utf8)

if ($index -notmatch 'V\.VERSION = (\d+)') { throw 'V.VERSION not found in index.html' }
$old = [int]$Matches[1]
$new = if ($To -gt 0) { $To } else { $old + 1 }

$index = [regex]::Replace($index, '\?v=\d+', "?v=$new")
$index = [regex]::Replace($index, 'V\.VERSION = \d+', "V.VERSION = $new")
$sw = [regex]::Replace($sw, "versus-v\d+", "versus-v$new")

[IO.File]::WriteAllText($indexPath, $index, $utf8)
[IO.File]::WriteAllText($swPath, $sw, $utf8)
$n = ([regex]::Matches($index, '\?v=' + $new)).Count
Write-Output "Versus $old -> $new ($n files in index.html, sw.js cache versus-v$new)"
