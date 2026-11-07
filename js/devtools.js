// Versus: Einblick ins Backend, nur für Dev-Konten (profiles.dev, im Admin-Panel vom Owner gesetzt).
// Ein kleiner DEV-Knopf unten links öffnet ein schlichtes Panel mit:
//   KI      – was die KI bei jedem Zug gerechnet hat (Suchtiefe, Knoten, Zeit, Bewertung der Züge, gewählter Zug)
//   Server  – jeder Server-Aufruf (RPC) mit Dauer, Argumenten, Antwort oder Fehler
//   Online  – Realtime-Signale (Pokes) und Abfragen der laufenden Partie
//   Fehler  – JS-Fehler, abgelehnte Promises, console.warn/error
//   Zustand – Version, Konto, Einstellungen, laufende Partie, Speicher; dazu Server-Sicht (dev_peek)
//   Devs    – alle Dev-Konten mit Online-Status und Spiel (dev_list); Name antippen öffnet das Profil
//   Tests   – Werkzeuge, um Fehler zu provozieren: langsames oder kein Netz, KI spielt für dich, Selbsttest
//   Bugs    – Bug-Schnappschuss (Text + alles aus den anderen Tabs) an den Server; alle Dev-Konten sehen die Meldungen
// Wächter laufen nebenbei: KI antwortet nicht (8 s), Ruckler über 250 ms außerhalb der KI, Fehler lassen den Knopf rot blinken.
// Tastenkürzel am PC: Strg+Umschalt+B öffnet direkt die Bug-Meldung.
// Gesammelt wird nur, solange ein Dev-Konto angemeldet ist; für alle anderen ist das Modul nur ein paar leere Haken.
(function () {
  'use strict';

  const MAX = 150;
  const logs = { ai: [], rpc: [], net: [], err: [] };
  const D = V.dev = { active: false, lag: 0, offline: false, autoMe: false };
  let aiEnd = 0;
  let panel = null, btn = null, tab = 'ai', dirty = false, peek = null, devs = null, devErr = '', aiN = 0, cur = null;

  const now = () => performance.now();
  const clock = () => { const d = new Date(); return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0'); };
  // short readable form of any value (moves, RPC arguments, answers)
  function short(x, n = 140) {
    let s;
    try { s = typeof x === 'string' ? x : JSON.stringify(x, (k, v) => v instanceof Element ? '<' + v.tagName.toLowerCase() + '>' : typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v); }
    catch (e) { s = String(x); }
    if (s === undefined) s = String(x);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = v => typeof v !== 'number' ? String(v) : Math.abs(v) > 90000 ? (v > 0 ? 'GEWINN' : 'VERLUST') : (v > 0 ? '+' : '') + Math.round(v * 100) / 100;
  function push(kind, e) {
    if (!D.active) return;
    const a = logs[kind]; e.at = clock(); a.unshift(e); if (a.length > MAX) a.length = MAX;
    if (panel && tab === kind) { dirty = true; queueDraw(); }
    if (kind === 'err') { if (panel && tab === 'err') seenErr = a.length; badge(); }
  }

  // ---------- KI ----------
  // play.js opens a turn for every AI move (aiTurn and ctx.think); the helpers in ai.js and single games
  // (e.g. Stockfish in chess) add their lines to the open turn, play.js closes it with the chosen move.
  D.begin = info => {
    if (!D.active) return null;
    const t = { n: ++aiN, info, lines: [], t0: now() };
    cur = t;
    push('ai', t);
    // watchdog: an AI that has not answered after 8 s is almost always a bug (no legal move found, a Promise that never settles)
    const dog = setTimeout(() => { if (t.ms == null) push('err', { what: 'KI hängt', msg: `#${t.n} ${info.game || ''} (Stufe ${info.level}, Seite ${info.side}) antwortet seit 8 s nicht` }); }, 8000);
    return {
      done(res, say) {
        clearTimeout(dog); aiEnd = now();
        t.ms = Math.round(now() - t.t0);
        if (res) { t.move = res.move; t.mood = res.mood; try { t.say = say ? say(res.move) : ''; } catch (e) { } }
        if (cur === t) cur = null;
        if (panel && tab === 'ai') { dirty = true; queueDraw(); }
      },
      fail(e) {
        clearTimeout(dog); aiEnd = now();
        t.ms = Math.round(now() - t.t0); t.error = String(e && e.message || e); if (cur === t) cur = null;
        push('err', { what: 'KI-Fehler', msg: `#${t.n} ${info.game || ''}: ${t.error}`, stack: e && e.stack });
      }
    };
  };
  // one line of what an AI helper did; without an open turn (e.g. hints, the AI of a table host) it gets its own entry
  D.ai = (what, data) => {
    if (!D.active) return;
    if (cur) { cur.lines.push({ what, data }); if (panel && tab === 'ai') { dirty = true; queueDraw(); } }
    else push('ai', { n: ++aiN, info: { loose: true }, lines: [{ what, data }] });
  };
  D.note = (what, data) => D.ai(what, data);

  function aiLine(l) {
    const d = l.data || {};
    const top = (arr, f) => (arr || []).map(f).join('  |  ');
    switch (l.what) {
      case 'search':
        return `Alpha-Beta: Tiefe ${d.depth}/${d.maxDepth}${d.timeout ? ' (Zeit um)' : ''}, ${d.nodes} Knoten, ${d.ms} ms, Wert ${num(d.score)}\n    Bester Zug: ${short(d.move, 80)}` +
          (d.root && d.root.length ? `\n    Wurzelzüge (Tiefe ${d.depth}, ≤ = nur Schranke): ` + top(d.root, x => short(x.m, 40) + ' ' + (x.exact ? '' : '≤') + num(x.v)) : '') +
          (d.path && d.path.length ? `\n    Pro Tiefe: ` + d.path.map(p => `${p.d}:${short(p.m, 24)} ${num(p.v)}`).join('  ') : '');
      case 'searchAll':
        return `Alle Züge bewertet: Tiefe ${d.depth}, ${d.count} Züge, ${d.nodes} Knoten, ${d.ms} ms${d.timeout ? ' (Zeit um, Rest nur geschätzt)' : ''}\n    Beste: ` + top(d.top, x => short(x.m, 40) + ' ' + num(x.v));
      case 'pickSoft':
        return `Weiche Wahl: Temperatur ${d.temp}, ${d.best ? 'bester Zug genommen' : 'NICHT der beste Zug'} (Wert ${num(d.chosenV)} statt ${num(d.bestV)}${d.p != null ? ', Chance ' + Math.round(d.p * 100) + ' %' : ''})`;
      case 'weak':
        return d.random ? `Anfänger: ZUFALLSZUG (Quote ${Math.round(d.rate * 100)} %): ${short(d.move, 60)}` : `Anfänger: kein Zufallszug (Quote ${Math.round(d.rate * 100)} %)`;
      case 'mcts':
        return `Monte Carlo: ${d.iters}/${d.max} Simulationen, ${d.ms} ms${d.timeout ? ' (Zeit um)' : ''}, Gewinnchance ${Math.round(d.rate * 100)} %\n    Meistbesucht: ` + top(d.top, x => `${short(x.m, 36)} ${x.n}× ${Math.round(x.r * 100)} %`);
      case 'Stockfish':
        return `Stockfish: ${d.elo ? 'Elo ' + d.elo : 'Skill ' + d.skill}, ${d.movetime} ms Bedenkzeit (${d.ms} ms echt), Tiefe ${d.depth}/${d.seldepth}, ${d.score}, ${d.nodes} Knoten (${d.nps}/s)\n    Bester Zug ${d.best}, Hauptvariante: ${d.pv}`;
      default:
        return `${l.what}: ${short(d, 400)}`;
    }
  }
  function aiText() {
    if (!logs.ai.length) return 'Noch keine KI-Züge. Starte eine Partie gegen die KI.';
    return logs.ai.map(t => {
      const i = t.info || {};
      const head = i.loose ? `#${t.n} (außerhalb eines KI-Zugs)` :
        `#${t.n} ${i.game || ''} · Stufe ${['Leicht', 'Mittel', 'Schwer', 'Profi'][i.level] || i.level}${i.fit ? ' (Passend: ' + i.fit + ')' : ''} · Seite ${i.side} (${i.who || 'KI'})${i.quick ? ' · Folgezug' : ''}${i.kind ? ' · ' + i.kind : ''}` +
        (t.ms != null ? ` · ${t.ms} ms gesamt` : ' · rechnet …');
      const body = t.lines.map(l => '  ' + aiLine(l)).join('\n');
      const end = t.error ? `  FEHLER: ${t.error}` : t.move !== undefined ? `  → Zug: ${t.say ? t.say + '  ' : ''}${short(t.move, 120)}${t.mood != null ? `  (Stimmung ${num(t.mood)})` : ''}` : '';
      return `[${t.at}] ${head}\n${body}${body && end ? '\n' : ''}${end}`;
    }).join('\n\n');
  }

  // ---------- Server ----------
  // wraps the Supabase client once it exists (cloud.js calls D.wrap), so every RPC lands here
  D.wrap = sb => {
    if (!sb || sb.__devWrapped) return;
    sb.__devWrapped = true;
    const rpc = sb.rpc.bind(sb);
    sb.rpc = (name, args, o) => {
      const q = rpc(name, args, o);
      if (!D.active) return q;
      const t0 = now(), e = { name, args };
      // Tests tab: "Netz aus" answers like a dropped connection without sending anything, "Verzögerung" waits first
      const real = q.then.bind(q);
      const then = D.offline && !/^dev_/.test(name) ? (ok, bad) => new Promise(r => setTimeout(r, 300)).then(() => { throw new TypeError('Failed to fetch (Dev: Netz aus)'); }).then(ok, bad)
        : D.lag ? (ok, bad) => new Promise(r => setTimeout(r, D.lag)).then(() => real(ok, bad)) : real;
      // the query builder is a thenable: hook into the first then without changing the result
      q.then = (ok, bad) => then(r => {
        e.ms = Math.round(now() - t0);
        if (r && r.error) e.error = r.error.message || short(r.error); else e.data = r ? r.data : r;
        push('rpc', e);
        return ok ? ok(r) : r;
      }, err => { e.ms = Math.round(now() - t0); e.error = String(err && err.message || err); push('rpc', e); if (bad) return bad(err); throw err; });
      return q;
    };
    if (sb.functions && sb.functions.invoke) {
      const inv = sb.functions.invoke.bind(sb.functions);
      sb.functions.invoke = async (name, o) => {
        if (!D.active) return inv(name, o);
        const t0 = now(), e = { name: 'fn:' + name, args: o && o.body ? Object.keys(o.body) : null };
        try { const r = await inv(name, o); e.ms = Math.round(now() - t0); if (r && r.error) e.error = r.error.message; else e.data = r && r.data; push('rpc', e); return r; }
        catch (err) { e.ms = Math.round(now() - t0); e.error = String(err && err.message || err); push('rpc', e); throw err; }
      };
    }
  };
  let hideTouch = true;
  function rpcText() {
    const list = logs.rpc.filter(e => !(hideTouch && e.name === 'touch'));
    if (!list.length) return 'Noch keine Server-Aufrufe.';
    return list.map(e => `[${e.at}] ${e.error ? '✗' : '✓'} ${e.name}  ${e.ms} ms\n    an:  ${short(e.args || {}, 300)}\n    ${e.error ? 'FEHLER: ' + e.error : 'aus: ' + short(e.data, 500)}`).join('\n');
  }

  // ---------- Online ----------
  D.net = (what, data) => push('net', { what, data });
  function netText() {
    if (!logs.net.length) return 'Noch nichts. Hier landen Realtime-Pokes (gesendet/empfangen, Kanal verbunden) und die Abfragen einer Online-Partie.';
    return logs.net.map(e => `[${e.at}] ${e.what}  ${e.data === undefined ? '' : short(e.data, 400)}`).join('\n');
  }

  // ---------- Fehler ----------
  addEventListener('error', ev => push('err', { what: 'Fehler', msg: ev.message, where: (ev.filename || '').split('/').pop() + ':' + ev.lineno + ':' + ev.colno, stack: ev.error && ev.error.stack }));
  addEventListener('unhandledrejection', ev => push('err', { what: 'Promise', msg: String(ev.reason && ev.reason.message || ev.reason), stack: ev.reason && ev.reason.stack }));
  ['warn', 'error'].forEach(k => {
    const orig = console[k].bind(console);
    console[k] = (...a) => { try { push('err', { what: 'console.' + k, msg: a.map(x => x instanceof Error ? x.message : short(x, 300)).join(' '), stack: a.find(x => x instanceof Error)?.stack }); } catch (e) { } orig(...a); };
  });
  // stutter: long tasks outside an AI move (the AI blocks the main thread on purpose)
  try {
    new PerformanceObserver(l => l.getEntries().forEach(x => {
      if (!D.active || x.duration < 250 || cur || x.startTime < aiEnd + 50) return;
      push('err', { what: 'Ruckler', msg: `${Math.round(x.duration)} ms blockiert${D.game ? ' in ' + D.game.id : ''}` });
    })).observe({ entryTypes: ['longtask'] });
  } catch (e) { }
  function errText() {
    if (!logs.err.length) return 'Keine Fehler seit dem Laden der Seite. 🎉';
    return logs.err.map(e => `[${e.at}] ${e.what}: ${e.msg}${e.where ? '  (' + e.where + ')' : ''}${e.stack ? '\n    ' + String(e.stack).split('\n').slice(0, 4).join('\n    ') : ''}`).join('\n\n');
  }

  // ---------- Zustand ----------
  D.game = null; // play.js sets the running match here (id, mode, level, sides ...)
  function stateText() {
    const C = V.cloud, out = [];
    out.push(`Version ${V.VERSION} · Sprache ${V.lang || 'de'} · ${V.coarse ? 'Touch' : 'Maus'} · ${innerWidth}×${innerHeight} @${devicePixelRatio} · ${navigator.onLine ? 'online' : 'OFFLINE'}`);
    out.push(`Service Worker: ${navigator.serviceWorker && navigator.serviceWorker.controller ? 'aktiv' : 'keiner'}`);
    if (C) {
      const u = C.user();
      out.push(`Konto: ${u ? u.username + (u.anon ? ' (Gast)' : '') : '–'} · Status ${short(C.state())} · Rolle ${C.role() || '–'}`);
      out.push(`my_info: ${short(C.info(), 1200)}`);
    }
    out.push(`Laufende Partie: ${D.game ? short(D.game, 600) : '–'}`);
    out.push(`Einstellungen: ${short(V.settings || {}, 800)}`);
    let size = 0; const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), n = (localStorage.getItem(k) || '').length; size += n; keys.push([k, n]); } } catch (e) { }
    keys.sort((a, b) => b[1] - a[1]);
    out.push(`localStorage: ${Math.round(size / 1024)} KB · ` + keys.slice(0, 12).map(([k, n]) => `${k} ${n < 1024 ? n + ' B' : Math.round(n / 1024) + ' KB'}`).join(', '));
    out.push('');
    out.push(peek ? 'Server-Sicht (dev_peek):\n' + JSON.stringify(peek, null, 1) : 'Server-Sicht: „Server laden“ antippen (Profil-Zeile, laufende und letzte Partien mit Zügen und Claims, Tische, Elo).');
    return out.join('\n');
  }

  // ---------- Devs ----------
  function devsHtml() {
    if (devErr) return `<pre>${esc(devErr)}</pre>`;
    if (!devs) return '<pre>Lädt …</pre>';
    if (!devs.length) return '<pre>Keine Dev-Konten.</pre>';
    const ago = t => { if (!t) return '–'; const s = (Date.now() - new Date(t)) / 1000; return s < 120 ? 'gerade' : s < 3600 ? Math.round(s / 60) + ' min' : s < 86400 ? Math.round(s / 3600) + ' h' : Math.round(s / 86400) + ' T'; };
    return `<table class="dvt"><tr><th></th><th>Name</th><th>Spiel</th><th>Zuletzt</th><th>Info</th></tr>` + devs.map(d => `<tr>
      <td>${d.online ? '🟢' : '⚪'}</td><td><a data-dp="${esc(d.username)}">${esc(d.username)}</a>${d.me ? ' (du)' : ''}</td>
      <td>${esc(d.game || '–')}</td><td>${ago(d.seen)}</td>
      <td>${[d.role, d.stealth ? 'unsichtbar' : '', d.hidden ? 'ausgeblendet' : '', d.guest ? 'Gast' : '', d.live ? d.live + ' laufend' : '', d.played != null ? d.played + ' Partien' : ''].filter(Boolean).map(esc).join(' · ')}</td></tr>`).join('') + '</table>';
  }
  async function loadDevs() {
    devs = null; devErr = ''; draw();
    try { devs = await V.cloud.rpc('dev_list'); }
    catch (e) { devErr = 'dev_list ging nicht: ' + e.message + '\n(Migration supabase/migrations/20261202000000_dev_insight.sql im SQL-Editor ausführen.)'; }
    if (tab === 'devs') draw();
  }
  async function loadPeek() {
    peek = { lädt: true }; draw();
    try { peek = await V.cloud.rpc('dev_peek'); } catch (e) { peek = { fehler: e.message, tipp: 'Migration 20261202000000_dev_insight.sql ausführen' }; }
    if (tab === 'state') draw();
  }

  // ---------- Tests: Fehler provozieren ----------
  const LAGS = [[0, 'normal'], [1500, 'langsam 1,5 s'], [4000, 'sehr langsam 4 s'], [-1, 'aus']];
  function testsHtml() {
    const g = D.game, mv = g && g.moves;
    const net = D.offline ? -1 : D.lag;
    return `<pre>Netz (alle Server-Aufrufe; zum Testen von Verbindungsbalken, Wiederholen, Zeitüberschreitung im Online-Duell):</pre>
      <p>${LAGS.map(([v, l]) => `<button data-lag="${v}" class="${net === v ? 'on' : ''}">${l}</button>`).join(' ')}</p>
      <pre>KI:</pre>
      <p><label><input type="checkbox" id="dvauto"${D.autoMe ? ' checked' : ''}> KI spielt auch für dich (nur gegen die KI, ab deinem nächsten Zug; so laufen ganze Partien bis zum Ende durch)</label></p>
      <p><button id="dvself">Selbsttest ${g ? esc(g.id) : 'aller Spiele'}: 3 Partien KI gegen KI</button> <small>(öffnet test.html in neuem Tab, meldet Fehler, Hänger und Ergebnisse)</small></p>
      <pre>Partie:</pre>
      <p><button id="dvmoves"${mv ? '' : ' disabled'}>Züge kopieren${mv ? ' (' + mv.length + ')' : ''}</button> <small>${g ? esc(g.id + ' · ' + g.mode + (g.ended ? ' · beendet' : '')) : 'keine laufende Partie'}${g && !mv ? ' · Züge werden nur bei Brettspielen ohne Zufall aufgezeichnet' : ''}</small></p>
      <pre>Cache:</pre>
      <p><button id="dvfresh">Service Worker und Cache löschen, neu laden</button> <small>(schließt „alte Version im Cache“ als Ursache aus)</small></p>`;
  }
  function wireTests(body) {
    body.querySelectorAll('[data-lag]').forEach(b => b.onclick = () => { const v = +b.dataset.lag; D.offline = v < 0; D.lag = v > 0 ? v : 0; push('net', { what: 'Dev: Netz ' + (D.offline ? 'aus' : D.lag ? D.lag + ' ms Verzögerung' : 'normal') }); draw(); });
    body.querySelector('#dvauto').onchange = e => { D.autoMe = e.target.checked; };
    body.querySelector('#dvself').onclick = () => { const g = D.game; open('test.html?rounds=3' + (g ? '&games=' + g.id + '&level=' + (g.level || 0) : ''), '_blank'); };
    body.querySelector('#dvmoves').onclick = e => copy(JSON.stringify(D.game && D.game.moves), e.target);
    body.querySelector('#dvfresh').onclick = async () => {
      try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { }
      try { for (const k of await caches.keys()) await caches.delete(k); } catch (e) { }
      location.reload();
    };
  }

  // ---------- Bugs: Schnappschuss melden ----------
  // everything the other tabs know, as one JSON for the server (dev_report) or the clipboard
  function snapshot() {
    const C = V.cloud;
    return {
      v: V.VERSION, at: new Date().toISOString(), lang: V.lang || 'de', ua: navigator.userAgent, screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`,
      touch: !!V.coarse, online: navigator.onLine, net: D.offline ? 'aus' : D.lag || 0, user: C && C.user() ? C.user().username : null,
      view: (document.querySelector('.view') || {}).className || '', settings: V.settings || {},
      game: D.game ? (() => { const t = short(D.game, 60000); try { return JSON.parse(t); } catch (e) { return t; } })() : null,
      ai: aiText().split('\n\n').slice(0, 8),
      err: logs.err.slice(0, 40).map(e => ({ at: e.at, what: e.what, msg: e.msg, where: e.where, stack: e.stack ? String(e.stack).split('\n').slice(0, 6).join('\n') : undefined })),
      rpc: logs.rpc.filter(e => e.name !== 'touch').slice(0, 40).map(e => ({ at: e.at, name: e.name, ms: e.ms, args: short(e.args || {}, 300), out: e.error ? 'FEHLER: ' + e.error : short(e.data, 300) })),
      realtime: logs.net.slice(0, 40).map(e => e.at + ' ' + e.what + ' ' + (e.data === undefined ? '' : short(e.data, 200)))
    };
  }
  let reports = null, repErr = '', repOpen = null, draft = '';
  function bugsHtml() {
    const ago = t => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<p><textarea id="dvtxt" rows="3" placeholder="Was ist passiert? Was hättest du erwartet?" style="width:100%;box-sizing:border-box;font:inherit;background:#0d1520;color:#cde;border:1px solid #345;border-radius:4px;padding:5px">${esc(draft)}</textarea></p>
      <p><button id="dvsend">Senden mit Schnappschuss</button> <button id="dvsnap">Nur Schnappschuss kopieren</button> <small id="dvmsg">${D.game ? 'Partie ' + esc(D.game.id) + ' kommt mit. ' : ''}Mit dabei: Partie und Züge, letzte KI-Züge, Fehler, Server-Aufrufe, Online, Gerät.</small></p>
      <pre>Meldungen aller Dev-Konten:${repErr ? '\n' + esc(repErr) : reports ? '' : ' lädt …'}</pre>` +
      (reports && reports.length ? `<table class="dvt">` + reports.map(r => `<tr class="${r.done ? 'dvdone' : ''}"><td>${ago(r.at)}</td><td>${esc(r.name || '?')}</td><td>${esc(r.game || '–')} · v${esc(r.v || '?')}${r.errs ? ' · <b style="color:#f66">' + r.errs + ' Fehler</b>' : ''}</td>
        <td>${esc(r.txt)}</td><td style="white-space:nowrap"><button data-rs="${r.id}">${repOpen && repOpen.id === r.id ? 'zu' : 'Schnappschuss'}</button> <button data-rd="${r.id}" data-v="${r.done ? 0 : 1}">${r.done ? 'wieder offen' : 'erledigt'}</button></td></tr>` +
        (repOpen && repOpen.id === r.id ? `<tr><td colspan="5"><button data-rc="${r.id}">Kopieren</button><pre>${esc(JSON.stringify(repOpen.snap, null, 1))}</pre></td></tr>` : '')).join('') + '</table>' : reports && !repErr ? '<pre>Noch keine Meldungen.</pre>' : '');
  }
  async function loadReports() {
    repErr = '';
    try { reports = await V.cloud.rpc('dev_reports'); } catch (e) { reports = []; repErr = 'dev_reports ging nicht: ' + e.message + ' (Migration 20261203000000_dev_reports.sql ausführen)'; }
    if (tab === 'bugs') draw();
  }
  function wireBugs(body) {
    const ta = body.querySelector('#dvtxt'), msg = body.querySelector('#dvmsg');
    ta.oninput = () => { draft = ta.value; };
    body.querySelector('#dvsnap').onclick = e => copy(JSON.stringify(snapshot(), null, 1), e.target);
    body.querySelector('#dvsend').onclick = async e => {
      const txt = ta.value.trim(); if (txt.length < 3) { msg.textContent = 'Bitte kurz beschreiben, was passiert ist.'; return; }
      e.target.disabled = true; msg.textContent = 'Sendet …';
      // the report itself must get through even with the simulated dead network
      const off = D.offline; D.offline = false;
      try { await V.cloud.rpc('dev_report', { txt, game: D.game ? D.game.id : null, snap: snapshot() }); draft = ''; msg.textContent = 'Gesendet.'; loadReports(); }
      catch (x) { msg.textContent = 'Ging nicht: ' + x.message; e.target.disabled = false; }
      finally { D.offline = off; }
    };
    body.querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => {
      const id = +b.dataset.rs;
      if (repOpen && repOpen.id === id) { repOpen = null; return draw(); }
      try { repOpen = { id, snap: await V.cloud.rpc('dev_report_snap', { rid: id }) }; } catch (x) { repOpen = { id, snap: { fehler: x.message } }; }
      draw();
    });
    body.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => copy(JSON.stringify(repOpen.snap, null, 1), b));
    body.querySelectorAll('[data-rd]').forEach(b => b.onclick = async () => { try { await V.cloud.rpc('dev_report_done', { rid: +b.dataset.rd, done: b.dataset.v === '1' }); } catch (x) { } loadReports(); });
  }
  function copy(s, el) {
    (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(() => {
      if (!el) return; const t = el.textContent; el.textContent = 'Kopiert'; setTimeout(() => { el.textContent = t; }, 1200);
    }, () => { });
  }

  // ---------- Panel ----------
  const TABS = [['ai', 'KI'], ['rpc', 'Server'], ['net', 'Online'], ['err', 'Fehler'], ['state', 'Zustand'], ['devs', 'Devs'], ['tests', 'Tests'], ['bugs', 'Bugs']];
  const text = () => ({ ai: aiText, rpc: rpcText, net: netText, err: errText, state: stateText }[tab] || (() => ''))();
  let drawT = 0;
  function queueDraw() { if (!panel || drawT) return; drawT = setTimeout(() => { drawT = 0; if (dirty) draw(); }, 250); }
  function draw() {
    dirty = false;
    if (!panel) return;
    panel.querySelectorAll('[data-dt]').forEach(b => b.classList.toggle('on', b.dataset.dt === tab));
    const ex = panel.querySelector('#dvx');
    ex.innerHTML = tab === 'rpc' ? `<label><input type="checkbox" id="dvtouch"${hideTouch ? ' checked' : ''}> touch ausblenden</label>` :
      tab === 'state' ? '<button id="dvpeek">Server laden</button>' : tab === 'devs' ? '<button id="dvdevs">Neu laden</button>' : '';
    const body = panel.querySelector('#dvb');
    const keep = body.scrollTop;
    body.innerHTML = tab === 'devs' ? devsHtml() : tab === 'tests' ? testsHtml() : tab === 'bugs' ? bugsHtml() : `<pre>${esc(text())}</pre>`;
    if (tab === 'tests') wireTests(body);
    if (tab === 'bugs') wireBugs(body);
    body.scrollTop = tab === 'ai' || tab === 'rpc' || tab === 'net' || tab === 'err' ? keep : 0;
    const t = q => panel.querySelector(q);
    if (t('#dvtouch')) t('#dvtouch').onchange = e => { hideTouch = e.target.checked; draw(); };
    if (t('#dvpeek')) t('#dvpeek').onclick = loadPeek;
    if (t('#dvdevs')) t('#dvdevs').onclick = loadDevs;
    body.querySelectorAll('[data-dp]').forEach(a => a.onclick = () => { if (V.online && V.online.profile) { V.online.profile(a.dataset.dp); close(); } });
    badge();
  }
  function badge() { if (!btn) return; const n = logs.err.length; btn.querySelector('i').textContent = n ? n : ''; btn.classList.toggle('hot', n > seenErr); }
  let seenErr = 0;
  function openPanel() {
    if (panel) return close();
    panel = document.createElement('div'); panel.className = 'dvp'; panel.setAttribute('translate', 'no');
    panel.innerHTML = `<div class="dvh">${TABS.map(([k, l]) => `<button data-dt="${k}">${l}</button>`).join('')}<span id="dvx"></span>
      <span class="dvr"><button id="dvcp" title="Kopieren">Kopieren</button><button id="dvclr" title="Leeren">Leeren</button><button id="dvz">✕</button></span></div><div class="dvb" id="dvb"></div>`;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-dt]').forEach(b => b.onclick = () => { tab = b.dataset.dt; if (tab === 'err') seenErr = logs.err.length; draw(); if (tab === 'devs' && !devs) loadDevs(); if (tab === 'bugs') loadReports(); });
    panel.querySelector('#dvz').onclick = close;
    panel.querySelector('#dvclr').onclick = () => { if (logs[tab]) logs[tab].length = 0; if (tab === 'err') seenErr = 0; if (tab === 'state') peek = null; draw(); };
    panel.querySelector('#dvcp').onclick = e => copy(tab === 'devs' ? (devs || []).map(d => short(d, 400)).join('\n') : tab === 'bugs' || tab === 'tests' ? JSON.stringify(snapshot(), null, 1) : text(), e.target);
    if (tab === 'err') seenErr = logs.err.length;
    draw();
    if (tab === 'devs') loadDevs();
    if (tab === 'bugs') loadReports();
  }
  // Strg+Umschalt+B: straight to the bug report
  addEventListener('keydown', e => {
    if (!D.active || !(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key.toLowerCase() !== 'b') return;
    e.preventDefault(); tab = 'bugs'; if (!panel) openPanel(); else { draw(); loadReports(); }
    const ta = panel && panel.querySelector('#dvtxt'); if (ta) ta.focus();
  });
  function close() { if (panel) { panel.remove(); panel = null; } }

  const CSS = `.dvbtn{position:fixed;left:6px;bottom:calc(6px + env(safe-area-inset-bottom));z-index:99998;font:700 11px/1 monospace;padding:6px 7px;border-radius:6px;border:1px solid #6cf;background:#012c;color:#6cf;cursor:pointer;opacity:.75}
.dvbtn:hover{opacity:1}.dvbtn.hot{border-color:#f66;color:#f66;opacity:1;animation:dvblink 1s ease-in-out 3}@keyframes dvblink{50%{background:#f663}}
.dvb p{margin:4px 0 8px}.dvb small{color:#89a}.dvb button:disabled{opacity:.4}.dvb button.on{background:#6cf;color:#012}.dvdone td{opacity:.45}.dvb label{display:flex;gap:6px;align-items:flex-start}.dvbtn i{font-style:normal;color:#f66;margin-left:4px}
.dvp{position:fixed;left:6px;right:6px;bottom:calc(36px + env(safe-area-inset-bottom));max-width:760px;height:min(62vh,560px);z-index:99999;display:flex;flex-direction:column;background:#0a0f18f2;color:#cde;border:1px solid #6cf;border-radius:8px;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 8px 30px #000a}
.dvh{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:6px;border-bottom:1px solid #345}
.dvh button,.dvb button{font:inherit;background:#123;color:#cde;border:1px solid #345;border-radius:4px;padding:3px 7px;cursor:pointer}
.dvh button.on{background:#6cf;color:#012;border-color:#6cf}.dvr{margin-left:auto;display:flex;gap:4px}#dvx label{display:flex;gap:4px;align-items:center}
.dvb{flex:1;overflow:auto;padding:6px 8px}.dvb pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit}
.dvt{border-collapse:collapse;width:100%}.dvt td,.dvt th{text-align:left;padding:3px 6px;border-bottom:1px solid #234;vertical-align:top}.dvt a{color:#6cf;cursor:pointer;text-decoration:underline}`;
  function show(on) {
    if (on === D.active && (!on || btn)) return;
    D.active = on;
    if (on) {
      if (!document.getElementById('dvcss')) { const s = document.createElement('style'); s.id = 'dvcss'; s.textContent = CSS; document.head.appendChild(s); }
      btn = document.createElement('button'); btn.className = 'dvbtn'; btn.setAttribute('translate', 'no'); btn.innerHTML = 'DEV<i></i>'; btn.title = 'Dev-Einblick (Backend, KI)';
      btn.onclick = openPanel; document.body.appendChild(btn);
    } else {
      close(); if (btn) btn.remove(); btn = null;
      Object.values(logs).forEach(a => a.length = 0); devs = null; peek = null; reports = null; D.offline = false; D.lag = 0; D.autoMe = false;
    }
  }
  const check = () => { const i = V.cloud && V.cloud.info(); show(!!(i && i.dev)); };
  D.refresh = check;
  addEventListener('load', () => { if (V.cloud) { V.cloud.on(check); check(); } });
})();
