# Builds one page per game for search engines: games/<name>/ (English) and de/spiele/<name>/ (German),
# the two overviews, sitemap.xml, games/rules.json (for the Discord command /rules) and the <noscript> game list in index.html.
# The texts (names, descriptions, rules and their translations) come from the app itself, read with headless Chrome.
# Usage: powershell -ExecutionPolicy Bypass -File tools/pages.ps1   (again after adding a game or changing its texts)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$base = 'https://bananemdnaa.github.io/versus/'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$chrome = @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Chrome or Edge not found' }

# ---------- 1. read the games from the app (same scripts as index.html, without booting the menus) ----------
$index = [IO.File]::ReadAllText((Join-Path $root 'index.html'), $utf8)
$scripts = [regex]::Matches($index, '<script src="(js/[^"]+)"></script>') | ForEach-Object { '<script src="' + $_.Groups[1].Value + '"></script>' }
$probe = Join-Path $root '_pages.html'
$extract = @'
<script>
  // every text goes through the page once, so the English dictionary translates it like in the app
  V.games.sort((a, b) => V.CATS.indexOf(a.cat) - V.CATS.indexOf(b.cat) || (a.order || 0) - (b.order || 0));
  const box = document.getElementById('box');
  const put = s => { const d = document.createElement('div'); d.innerHTML = s || ''; box.appendChild(d); return d; };
  const all = V.games.map(g => ({ g, name: put(g.name), short: put(g.short), desc: put(g.desc), cat: put(g.cat), tut: (g.tutorial || []).map(s => [put(s.t), put(s.d)]) }));
  setTimeout(() => {
    const txt = e => e.textContent.replace(/\s+/g, ' ').trim();
    const games = all.map(x => ({
      id: x.g.id, name: txt(x.name), short: txt(x.short), desc: txt(x.desc), cat: txt(x.cat), action: x.g.cat === 'Action',
      party: !!x.g.party, ai: !x.g.noAI, online: !!(x.g.online || x.g.table), icon: x.g.icon || '',
      tut: x.tut.map(([t, d]) => ({ t: txt(t), d: txt(d) })).filter(s => s.d)
    }));
    // base64, so umlauts survive the console
    document.getElementById('out').textContent = btoa(unescape(encodeURIComponent(JSON.stringify(games))));
  }, 400);
</script>
'@
[IO.File]::WriteAllText($probe, "<!doctype html><html><head><meta charset=`"utf-8`"><style id=`"game-css`"></style></head><body><div id=`"box`"></div><pre id=`"out`"></pre>`n" + ($scripts -join "`n") + "`n" + $extract + '</body></html>', $utf8)
$prof = Join-Path $env:TEMP 'versus-pages-chrome'
function Read-Games($lang) {
  $ErrorActionPreference = 'Continue'  # Chrome writes harmless warnings to stderr
  $url = 'file:///' + ($probe -replace '\\', '/') + '?lang=' + $lang
  $dom = & $chrome --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --virtual-time-budget=8000 --dump-dom $url 2>$null | Out-String
  $m = [regex]::Match($dom, '<pre id="out">([A-Za-z0-9+/=]+)</pre>')
  if (-not $m.Success) { throw "No games read for '$lang'" }
  $list = ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($m.Groups[1].Value)))
  $out = New-Object System.Collections.ArrayList
  foreach ($x in $list) { foreach ($y in @($x)) { [void]$out.Add($y) } }
  return ,$out.ToArray()
}
try { $ge = Read-Games 'en'; $gd = Read-Games 'de'; $GAMES = @{ en = $ge; de = $gd } } finally { Remove-Item $probe -ErrorAction SilentlyContinue }
Write-Output ("Read {0} games" -f $GAMES.en.Count)

# ---------- 2. texts of the pages ----------
$TX = @{
  en = @{
    dir = 'games'; locale = 'en_GB'; og = 'itch/art/social-1200x630.png'
    players = { param($g) if ($g.party) { '2 to 4 players' } else { '2 players' } }
    title = { param($g, $p) "$($g.name) online – free for $p | Versus" }
    meta = { param($g, $p) "$($g.short) Play $($g.name) free in your browser: on one device, against the AI or online with friends. No ads, no download." }
    play = 'Play now'; how = 'How to play'; ways = 'Ways to play'; more = 'More games'; free = 'Free · no ads'
    ai = 'Against the AI · 4 levels'; local = 'Two players on one device'; localAction = 'Both players on the same screen'; online = 'Online with friends'
    noDl = 'Runs in the browser on phones and computers, no download and no sign-up needed to start.'
    allTitle = 'All games – play free online for 2 to 4 players | Versus'; allH = 'All 32 games'
    allMeta = '32 quick games for 2 to 4 players: Chess, Connect 4, Poker, Ludo, Battleship and more. Free, no ads, in your browser.'
    allLead = 'Quick games for two to four players: on one device, against the AI or online with friends. Free and without ads.'
    other = 'Deutsch'; legal = 'Legal notice'; terms = 'Terms of service'; home = 'Open Versus'
  }
  de = @{
    dir = 'de/spiele'; locale = 'de_DE'; og = 'icons/og.png'
    players = { param($g) if ($g.party) { '2 bis 4 Spieler' } else { 'zu zweit' } }
    title = { param($g, $p) "$($g.name) online spielen – kostenlos, $p | Versus" }
    meta = { param($g, $p) "$($g.short) $($g.name) kostenlos im Browser spielen: am selben Handy, gegen die KI oder online mit Freunden. Ohne Werbung, ohne Download." }
    play = 'Jetzt spielen'; how = 'So wird gespielt'; ways = 'So kannst du spielen'; more = 'Weitere Spiele'; free = 'Gratis · ohne Werbung'
    ai = 'Gegen die KI · 4 Stufen'; local = 'Zu zweit an einem Gerät'; localAction = 'Beide am selben Bildschirm'; online = 'Online mit Freunden'
    noDl = 'Läuft im Browser am Handy und am Computer, ohne Download und ohne Anmeldung zum Loslegen.'
    allTitle = 'Alle Spiele – kostenlos online für 2 bis 4 Spieler | Versus'; allH = 'Alle 32 Spiele'
    allMeta = '32 schnelle Spiele für 2 bis 4: Schach, 4 Gewinnt, Poker, Ludo, Schiffe versenken und mehr. Gratis, ohne Werbung, im Browser.'
    allLead = 'Schnelle Spiele für zwei bis vier: am selben Handy, gegen die KI oder online mit Freunden. Kostenlos und ohne Werbung.'
    other = 'English'; legal = 'Impressum & Datenschutz'; terms = 'Nutzungsbedingungen'; home = 'Versus öffnen'
  }
}
function Esc($s) { [System.Net.WebUtility]::HtmlEncode([string]$s) }
# js/play.js (pageUrl, for shared results) builds the same names, change both together
function Slug($s) {
  $s = $s.ToLower().Replace('ä', 'ae').Replace('ö', 'oe').Replace('ü', 'ue').Replace('ß', 'ss')
  return (($s -replace "['’]", '') -replace '[^a-z0-9]+', '-').Trim('-')
}
$slug = @{ en = @{}; de = @{} }
foreach ($l in 'en', 'de') { foreach ($g in $GAMES[$l]) { $slug[$l][$g.id] = Slug $g.name } }
$cssT = @'
@font-face{font-family:SairaC;src:url(UP/fonts/saira-condensed-800.woff2) format('woff2');font-weight:800;font-display:swap}
@font-face{font-family:Saira;src:url(UP/fonts/saira.woff2) format('woff2');font-weight:100 900;font-display:swap}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;color:#e8e9f3;font:500 17px/1.6 Saira,system-ui,sans-serif;background:radial-gradient(60% 50% at 0 0,rgba(255,79,216,.22),transparent 70%),radial-gradient(60% 50% at 100% 100%,rgba(255,216,79,.12),transparent 70%),#08090f;background-attachment:fixed}
a{color:#ff4fd8}
.wrap{max-width:880px;margin:0 auto;padding:20px 18px 60px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}
.logo{font:800 italic 30px/1 SairaC,system-ui,sans-serif;text-transform:uppercase;text-decoration:none;color:#eef0ff}
.logo i{color:#ff4fd8}.logo b{color:#ffd84f;font-style:italic}
.lang{color:#9ca2cc;font-size:15px}
.hero{display:flex;gap:22px;align-items:center;flex-wrap:wrap}
.icon{width:120px;height:120px;flex:none;border-radius:22px;background:#11132a;border:1px solid #262a52;padding:16px}
.icon svg{width:100%;height:100%;display:block}
h1{margin:0;font:800 italic clamp(36px,7vw,56px)/1 SairaC,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.01em}
h2{font:800 italic 26px/1.1 SairaC,system-ui,sans-serif;text-transform:uppercase;margin:40px 0 12px;color:#ffd84f}
h3{font-size:18px;margin:18px 0 4px;color:#fff}
p{margin:0 0 10px}
.short{font-size:20px;color:#c9cbe8;margin:6px 0 12px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chips span{padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font:800 italic 13px/1.4 SairaC,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#c9cbe8}
.play{display:inline-block;margin:26px 0 6px;padding:14px 30px;background:#ff4fd8;color:#08090f;text-decoration:none;font:800 italic 24px/1 SairaC,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em;box-shadow:5px 5px 0 #ffd84f;transform:skew(-6deg)}
.play:hover{box-shadow:7px 7px 0 #ffd84f}
.desc{font-size:18px;margin-top:22px}
ul.ways{padding-left:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;padding:0;list-style:none}
.grid a{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:#11132a;border:1px solid #262a52;color:#e8e9f3;text-decoration:none;font-weight:600;line-height:1.2}
.grid a:hover{border-color:#ff4fd8}
.grid i{width:36px;height:36px;flex:none}.grid svg{width:100%;height:100%;display:block}
.grid small{display:block;color:#9ca2cc;font-weight:500;font-size:13px;margin-top:2px}
footer{margin-top:50px;color:#9ca2cc;font-size:14px;display:flex;gap:16px;flex-wrap:wrap}
footer a{color:#9ca2cc}
'@

function Head($l, $title, $meta, $path, $altPath) {
  $script:up = '../' * ($path.TrimEnd('/').Split('/').Count)
  $o = if ($l -eq 'en') { 'de' } else { 'en' }
  $enPath = if ($l -eq 'en') { $path } else { $altPath }; $dePath = if ($l -eq 'de') { $path } else { $altPath }
  return @"
<!doctype html>
<html lang="$l">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>$(Esc $title)</title>
<meta name="description" content="$(Esc $meta)">
<link rel="canonical" href="$base$path">
<link rel="alternate" hreflang="en" href="$base$enPath">
<link rel="alternate" hreflang="de" href="$base$dePath">
<link rel="alternate" hreflang="x-default" href="$base$enPath">
<meta name="theme-color" content="#08090f">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Versus">
<meta property="og:url" content="$base$path">
<meta property="og:title" content="$(Esc $title)">
<meta property="og:description" content="$(Esc $meta)">
<meta property="og:image" content="$base$($TX[$l].og)">
<meta property="og:locale" content="$($TX[$l].locale)">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="$($script:up)favicon.svg" type="image/svg+xml">
<style>$($cssT.Replace('UP/', $script:up))</style>
"@
}
function Top($l, $altPath) {
  $o = if ($l -eq 'en') { 'de' } else { 'en' }
  return "<div class=`"wrap`"><header><a class=`"logo`" href=`"$($script:up)$($TX[$l].dir)/`"><i>Ver</i>/<b>sus</b></a><a class=`"lang`" href=`"$($script:up)$altPath`" hreflang=`"$o`">$($TX[$l].other)</a></header>"
}
function Foot($l) {
  return "<footer><a href=`"$($script:up)?lang=$l`">$($TX[$l].home)</a><a href=`"$($script:up)$($TX[$l].dir)/`">$($TX[$l].allH)</a><a href=`"https://bananemdnsa.itch.io/versus`">itch.io</a><a href=`"$($script:up)rechtliches.html?lang=$l`">$($TX[$l].legal)</a><a href=`"$($script:up)terms.html?lang=$l`">$($TX[$l].terms)</a></footer></div>"
}
function Grid($l, $skip) {
  $items = foreach ($g in $GAMES[$l]) { if ($g.id -ne $skip) { "<li><a href=`"$($script:up)$($TX[$l].dir)/$($slug[$l][$g.id])/`"><i aria-hidden=`"true`">$($g.icon)</i><span>$(Esc $g.name)<small>$(Esc $g.cat)</small></span></a></li>" } }
  return '<ul class="grid">' + ($items -join '') + '</ul>'
}
function Save($rel, $html) {
  $file = Join-Path $root ($rel -replace '/', '\')
  New-Item -ItemType Directory -Force (Split-Path $file -Parent) | Out-Null
  [IO.File]::WriteAllText($file, $html, $utf8)
}

# ---------- 3. write the pages ----------
foreach ($old in 'games', 'de') { $d = Join-Path $root $old; if (Test-Path $d) { Remove-Item $d -Recurse -Force } }
$urls = New-Object System.Collections.ArrayList
foreach ($l in 'en', 'de') {
  $t = $TX[$l]; $o = if ($l -eq 'en') { 'de' } else { 'en' }
  foreach ($g in $GAMES[$l]) {
    $p = & $t.players $g
    $path = "$($t.dir)/$($slug[$l][$g.id])/"; $alt = "$($TX[$o].dir)/$($slug[$o][$g.id])/"
    $chips = @($p) + $(if ($g.ai) { @('AI') } else { @() }) + $(if ($g.online) { @('Online') } else { @() }) + @($t.free)
    if ($l -eq 'de') { $chips = $chips | ForEach-Object { if ($_ -eq 'AI') { 'KI' } else { $_ } } }
    $ways = @(); if ($g.ai) { $ways += $t.ai }; $ways += $(if ($g.action) { $t.localAction } else { $t.local }); if ($g.online) { $ways += $t.online }
    $tut = ($g.tut | ForEach-Object { "<h3>$(Esc $_.t)</h3><p>$(Esc $_.d)</p>" }) -join "`n"
    $ld = [ordered]@{ '@context' = 'https://schema.org'; '@type' = 'VideoGame'; name = $g.name; description = $g.desc; url = "$base$path"; inLanguage = $l
      genre = $g.cat; gamePlatform = 'Web browser'; applicationCategory = 'Game'; operatingSystem = 'Any'
      numberOfPlayers = [ordered]@{ '@type' = 'QuantitativeValue'; minValue = 2; maxValue = $(if ($g.party) { 4 } else { 2 }) }
      playMode = @('MultiPlayer') + $(if ($g.ai) { @('SinglePlayer') } else { @() })
      offers = [ordered]@{ '@type' = 'Offer'; price = 0; priceCurrency = 'EUR' }; image = "$base$($t.og)" } | ConvertTo-Json -Depth 4 -Compress
    $html = (Head $l (& $t.title $g $p) (& $t.meta $g $p) $path $alt) + "<script type=`"application/ld+json`">$($ld.Replace('</', '<\/'))</script>`n</head>`n<body>" + (Top $l $alt) + @"
<main>
<div class="hero"><div class="icon" aria-hidden="true">$($g.icon)</div><div><h1>$(Esc $g.name)</h1><p class="short">$(Esc $g.short)</p><div class="chips">$(($chips | ForEach-Object { "<span>$(Esc $_)</span>" }) -join '')</div></div></div>
<a class="play" href="$($script:up)?game=$($g.id)&amp;lang=$l">▶ $($t.play)</a>
<p class="desc">$(Esc $g.desc)</p>
<h2>$($t.ways)</h2>
<ul class="ways">$(($ways | ForEach-Object { "<li>$(Esc $_)</li>" }) -join '')</ul>
<p>$($t.noDl)</p>
<h2>$($t.how)</h2>
$tut
<a class="play" href="$($script:up)?game=$($g.id)&amp;lang=$l">▶ $($t.play)</a>
<h2>$($t.more)</h2>
$(Grid $l $g.id)
</main>
"@ + (Foot $l) + "`n</body>`n</html>`n"
    Save "$path/index.html" $html
    [void]$urls.Add($path)
  }
  # overview of all games
  $path = "$($t.dir)/"; $alt = "$($TX[$o].dir)/"
  $html = (Head $l $t.allTitle $t.allMeta $path $alt) + "</head>`n<body>" + (Top $l $alt) + @"
<main>
<h1>$($t.allH)</h1>
<p class="short">$($t.allLead)</p>
<a class="play" href="$($script:up)?lang=$l">▶ $($t.play)</a>
$(Grid $l '')
</main>
"@ + (Foot $l) + "`n</body>`n</html>`n"
  Save "$path/index.html" $html
  [void]$urls.Add($path)
}

# ---------- 4. sitemap and the crawlable list in index.html ----------
$today = (Get-Date).ToString('yyyy-MM-dd')
$sm = '<?xml version="1.0" encoding="UTF-8"?>' + "`n" + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n" +
  (((@('') + $urls) | ForEach-Object { "  <url><loc>$base$_</loc><lastmod>$today</lastmod></url>" }) -join "`n") + "`n</urlset>`n"
[IO.File]::WriteAllText((Join-Path $root 'sitemap.xml'), $sm, $utf8)
$links = '<noscript><!-- games -->' + (($GAMES.en | ForEach-Object { "<a href=`"games/$($slug.en[$_.id])/`">$(Esc $_.name)</a>" }) -join ' ') + ' · ' +
  (($GAMES.de | ForEach-Object { "<a href=`"de/spiele/$($slug.de[$_.id])/`">$(Esc $_.name)</a>" }) -join ' ') + '<!-- /games --></noscript>'
if ($index -match '<noscript><!-- games -->.*?<!-- /games --></noscript>') { $index = [regex]::Replace($index, '<noscript><!-- games -->.*?<!-- /games --></noscript>', [Text.RegularExpressions.MatchEvaluator] { param($m) $links }) }
else { $index = $index.Replace('</body>', $links + "`n</body>") }
[IO.File]::WriteAllText((Join-Path $root 'index.html'), $index, $utf8)

# ---------- 5. games/rules.json: names and rules for the Discord command /rules (supabase/functions/discord-interactions) ----------
$rules = [ordered]@{}
foreach ($l in 'en', 'de') {
  $rules[$l] = @($GAMES[$l] | ForEach-Object {
    [ordered]@{ id = $_.id; name = $_.name; short = $_.short; desc = $_.desc; cat = $_.cat; players = $(if ($_.party) { '2-4' } else { '2' })
      url = "$base$($TX[$l].dir)/$($slug[$l][$_.id])/"; tut = @($_.tut | ForEach-Object { [ordered]@{ t = $_.t; d = $_.d } }) }
  })
}
[IO.File]::WriteAllText((Join-Path $root 'games\rules.json'), ($rules | ConvertTo-Json -Depth 6 -Compress), $utf8)
Write-Output ("Wrote {0} pages, sitemap.xml, games/rules.json and the game links in index.html" -f $urls.Count)
