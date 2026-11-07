# Static pre-release check for Versus. Runs in a few seconds, needs only Python and git.
# Usage: py -3 tools/check.py            (compares against origin/main)
#        py -3 tools/check.py --base HEAD~3
# Exit code 1 if there is an error that should block the release; warnings only inform.
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.stdout.reconfigure(encoding='utf-8')
base = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else 'origin/main'

errors, warns, infos = [], [], []
def read(p):
    with open(p, encoding='utf-8-sig') as f: return f.read()
def git(*a):
    r = subprocess.run(['git', *a], capture_output=True, text=True, encoding='utf-8')
    return r.stdout if r.returncode == 0 else ''

index = read('index.html')
sw = read('sw.js')

# ---------- 1. scripts and styles in index.html ----------
refs = re.findall(r'(?:src|href)="((?:js|css)/[^"?]+)(\?v=(\d+))?"', index)
for path, _, _ in refs:
    if not os.path.isfile(path): errors.append(f'index.html lädt {path}, die Datei fehlt')
listed = {p for p, _, _ in refs}
for f in sorted(os.listdir('js/games')):
    if f.endswith('.js') and f'js/games/{f}' not in listed:
        errors.append(f'js/games/{f} hat keinen <script>-Eintrag in index.html')
dups = {p for p, _, _ in refs if [r[0] for r in refs].count(p) > 1}
for p in sorted(dups): errors.append(f'{p} wird in index.html mehrfach geladen')

# ---------- 2. version ----------
m = re.search(r'V\.VERSION = (\d+)', index)
ver = m.group(1) if m else None
if not ver: errors.append('V.VERSION fehlt in index.html')
vs = {v for _, _, v in refs if v}
if len(vs) > 1: errors.append(f'?v= ist uneinheitlich in index.html: {sorted(vs)} (bump.ps1 benutzen)')
missing_v = [p for p, _, v in refs if not v and not p.startswith('js/vendor/')]
for p in missing_v: warns.append(f'{p} hat kein ?v= (Spieler bekommen alte Kopien aus dem Cache)')
mc = re.search(r"versus-v(\d+)", sw)
if not mc or mc.group(1) != ver: errors.append(f'sw.js-Cache versus-v{mc and mc.group(1)} passt nicht zu V.VERSION {ver}')
if ver and vs and ver not in vs: errors.append(f'V.VERSION {ver} passt nicht zu ?v={sorted(vs)}')

# ---------- 3. games: ids, SEO pages ----------
ids = {}  # file -> id
for f in sorted(os.listdir('js/games')):
    if not f.endswith('.js'): continue
    src = read(f'js/games/{f}')
    m = re.search(r"V\.register\(\{\s*id:\s*'([^']+)'", src)
    if m: ids[f] = m.group(1)
    else: warns.append(f'js/games/{f}: keine V.register-ID gefunden')
seen = {}
for f, i in ids.items():
    if i in seen: errors.append(f'Spiel-ID "{i}" doppelt: {seen[i]} und {f}')
    seen[i] = f
try:
    rules = json.loads(read('games/rules.json'))
    have = {g['id'] for g in rules.get('de', [])} & {g['id'] for g in rules.get('en', [])}
    for i in sorted(set(ids.values()) - have):
        warns.append(f'Spiel "{i}" hat noch keine SEO-Seite/Sitemap: powershell -File tools/pages.ps1')
    for i in sorted(have - set(ids.values())):
        warns.append(f'games/rules.json kennt "{i}", das Spiel gibt es nicht mehr: tools/pages.ps1 neu laufen lassen')
except Exception as e:
    warns.append(f'games/rules.json nicht lesbar: {e}')

# ---------- 4. migrations ----------
migs = sorted(f for f in os.listdir('supabase/migrations') if f.endswith('.sql'))
stamps = [f[:14] for f in migs]
for s in sorted({s for s in stamps if stamps.count(s) > 1}): errors.append(f'Migrations-Zeitstempel {s} doppelt')
for f in migs:
    if not re.match(r'^\d{14}_[a-z0-9_]+\.sql$', f): warns.append(f'Migration {f}: Name nicht im Format YYYYMMDDhhmmss_name.sql')

# ---------- 5. what changed since base (committed + open) ----------
have_base = bool(git('rev-parse', '--verify', '--quiet', base))
if not have_base: warns.append(f'{base} nicht gefunden (git fetch?), Diff-Prüfungen übersprungen')
if have_base:
    behind = git('rev-list', '--count', f'HEAD..{base}').strip()
    if behind not in ('', '0'):
        errors.append(f'{base} hat {behind} Commit(s), die hier fehlen (andere Session gepusht?): zuerst mergen, '
                      'Version danach über der von dort (bump.ps1)')
rng = f'{base}...HEAD'  # three dots: only what this branch added since the common ancestor
committed = git('diff', '--name-only', rng).split() if have_base else []
status = [l for l in git('status', '--porcelain', '--untracked-files=all').splitlines() if l.strip()]
open_files = [l[3:].strip('"') for l in status]
changed = sorted(set(committed) | set(open_files))

new_migs = [f for f in changed if f.startswith('supabase/migrations/') and f.endswith('.sql')]
for f in new_migs: infos.append(f'Migration im Bündel: {f} (führst du selbst aus; vor dem Push, wenn der Client sie braucht)')
if any(f.startswith('itch/') for f in changed): warns.append('itch/ geändert: versus-itch.zip neu bauen und hochladen')
if have_base and git('diff', rng, '--', 'sw.js').find('versus-v') >= 0:
    infos.append('Version wurde in diesem Bündel schon erhöht: bump.ps1 nicht nochmal')
if open_files:
    warns.append('Nicht committet (gehört das zum Bündel oder zu einer anderen Session?): ' + ', '.join(open_files))

# added lines: conflict markers, debugger, console.log
diff = (git('diff', '-U0', rng) if have_base else '') + git('diff', '-U0', 'HEAD')
cur = None
for line in diff.splitlines():
    if line.startswith('+++ '): cur = line[6:] if line.startswith('+++ b/') else None; continue
    if not cur or not line.startswith('+') or 'vendor/' in cur: continue
    t = line[1:]
    if re.match(r'^(<{7}|={7}|>{7})( |$)', t): errors.append(f'Konfliktmarker in {cur}: {t[:40]}')
    if cur.endswith('.js') and re.search(r'\bdebugger\b', t): errors.append(f'debugger in {cur}')
    if cur.endswith('.js') and re.search(r'\bconsole\.log\(', t): warns.append(f'console.log in {cur}: {t.strip()[:70]}')
# untracked files are not in git diff: scan them whole
for f in open_files:
    if f.endswith('.js') and os.path.isfile(f) and f in [l[3:] for l in status if l.startswith('??')]:
        src = read(f)
        if re.search(r'^(<{7}|>{7}) ', src, re.M): errors.append(f'Konfliktmarker in {f}')
        if re.search(r'\bdebugger\b', src): errors.append(f'debugger in {f}')
        if re.search(r'\bconsole\.log\(', src): warns.append(f'console.log in {f}')

# German texts without English: rough hint for changed files (the real check is V.i18n.missing() in the browser)
if any(f.startswith('js/') and f.endswith('.js') and 'lang/' not in f for f in changed) and 'js/lang/en.js' not in changed:
    warns.append('JS geändert, aber js/lang/en.js nicht: neue deutsche Texte ohne Übersetzung? (im Browser V.i18n.missing() prüfen)')

# ---------- 6. which games to play in test.html ----------
core = [f for f in changed if f in ('js/ai.js', 'js/kit.js', 'js/play.js', 'js/core.js', 'js/app.js', 'js/tutor.js')]
games = sorted({ids[os.path.basename(f)] for f in changed if f.startswith('js/games/') and os.path.basename(f) in ids})
if core: infos.append('Gemeinsamer Code geändert (' + ', '.join(core) + '): test.html mit ALLEN Spielen laufen lassen')
elif games: infos.append('test.html?games=' + ','.join(games))
ui = [f for f in changed if f.startswith('css/') or f in ('js/app.js', 'js/play.js', 'js/online.js', 'js/account.js') or f.startswith('js/games/')]
if ui: infos.append('Sichtbare Änderungen: Handy 375 px und PC 1280 px prüfen (' + ', '.join(ui[:6]) + (' …' if len(ui) > 6 else '') + ')')

# ---------- report ----------
print(f'Versus-Check · Version {ver} · {len(changed)} geänderte Dateien seit {base}')
for title, xs, mark in (('Fehler', errors, '✗'), ('Warnungen', warns, '!'), ('Hinweise', infos, '·')):
    if xs:
        print(f'\n{title}:')
        for x in dict.fromkeys(xs): print(f'  {mark} {x}')
print('\n' + ('NICHT BEREIT' if errors else 'Statische Prüfung OK'))
sys.exit(1 if errors else 0)
