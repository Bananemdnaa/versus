(function () {
  const N = 10;
  const FLEET = [{ n: 'Schlachtschiff', l: 5 }, { n: 'Kreuzer', l: 4 }, { n: 'Zerstörer', l: 3 }, { n: 'U-Boot', l: 3 }, { n: 'Schnellboot', l: 2 }];
  const COLS = 'ABCDEFGHIJ';
  const mk = () => ({ ships: [], at: Array(N * N).fill(-1), shots: Array(N * N).fill(0) });
  // shots: 0 unknown, 1 miss, 2 hit, 3 sunk, 4 water next to a sunk ship
  function cellsFor(i, len, horiz) {
    const r = (i / N) | 0, c = i % N, out = [];
    for (let k = 0; k < len; k++) { const rr = horiz ? r : r + k, cc = horiz ? c + k : c; if (rr >= N || cc >= N) return null; out.push(rr * N + cc); }
    return out;
  }
  function around(i) {
    const r = (i / N) | 0, c = i % N, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc); }
    return out;
  }
  function free(at, cells) { return cells && cells.every(i => at[i] < 0 && around(i).every(j => at[j] < 0)); }
  function randomPlacement() {
    for (let tries = 0; tries < 200; tries++) {
      const at = Array(N * N).fill(-1), placed = [];
      let ok = true;
      for (let k = 0; k < FLEET.length && ok; k++) {
        let done = false;
        for (let a = 0; a < 300 && !done; a++) {
          const cells = cellsFor(V.rand(N * N), FLEET[k].l, Math.random() < 0.5);
          if (free(at, cells)) { cells.forEach(i => at[i] = k); placed[k] = cells; done = true; }
        }
        ok = done;
      }
      if (ok) return placed;
    }
  }
  function applyFleet(pl, placed) {
    pl.at.fill(-1);
    pl.ships = placed.map((cells, k) => { cells.forEach(i => pl.at[i] = k); return { l: FLEET[k].l, n: FLEET[k].n, cells, hits: 0 }; });
  }

  // ---------- AI ----------
  function nb4(i) { const r = (i / N) | 0, c = i % N, o = []; if (r) o.push(i - N); if (r < N - 1) o.push(i + N); if (c) o.push(i - 1); if (c < N - 1) o.push(i + 1); return o; }
  function aiShot(level, tgt) {
    const sh = tgt.shots;
    const unknown = []; for (let i = 0; i < N * N; i++) if (!sh[i]) unknown.push(i);
    const hits = []; for (let i = 0; i < N * N; i++) if (sh[i] === 2) hits.push(i);
    // Leicht: mostly blind shots, sometimes next to a hit. Mittel: shoots around hits until the ship is sunk.
    // Schwer: follows the line of a ship and searches in a chessboard pattern. Profi: probability map.
    if (level === 3) return density(tgt, unknown, hits);
    if (level === 0) {
      if (hits.length && Math.random() < 0.55) { const c = hits.flatMap(nb4).filter(i => !sh[i]); if (c.length) return V.pick(c); }
      return V.pick(unknown);
    }
    if (hits.length) {
      if (level === 2 && hits.length >= 2) {
        const rows = new Set(hits.map(i => (i / N) | 0)), cols = new Set(hits.map(i => i % N));
        const ends = [];
        if (rows.size === 1) { const r = [...rows][0], cs = hits.map(i => i % N); const lo = Math.min(...cs) - 1, hi = Math.max(...cs) + 1; if (lo >= 0) ends.push(r * N + lo); if (hi < N) ends.push(r * N + hi); }
        else if (cols.size === 1) { const c = [...cols][0], rs = hits.map(i => (i / N) | 0); const lo = Math.min(...rs) - 1, hi = Math.max(...rs) + 1; if (lo >= 0) ends.push(lo * N + c); if (hi < N) ends.push(hi * N + c); }
        const e = ends.filter(i => !sh[i]); if (e.length) return V.pick(e);
      }
      const c = hits.flatMap(nb4).filter(i => !sh[i]); if (c.length) return V.pick(c);
    }
    if (level === 2) { const par = unknown.filter(i => (((i / N) | 0) + i % N) % 2 === 0); if (par.length) return V.pick(par); }
    return V.pick(unknown);
  }
  function density(tgt, unknown, hits) {
    const sh = tgt.shots, w = Array(N * N).fill(0);
    const lens = tgt.ships.filter(s => s.hits < s.l).map(s => s.l);
    for (const len of lens) for (let i = 0; i < N * N; i++) for (const h of [true, false]) {
      const cells = cellsFor(i, len, h); if (!cells) continue;
      if (cells.some(c => sh[c] === 1 || sh[c] === 3 || sh[c] === 4)) continue;
      const nh = cells.filter(c => sh[c] === 2).length;
      if (hits.length && !nh) continue;
      const wt = hits.length ? Math.pow(nh, 2) * 10 : 1;
      cells.forEach(c => { if (!sh[c]) w[c] += wt; });
    }
    let best = -1, list = [];
    for (const i of unknown) { if (w[i] > best) { best = w[i]; list = [i]; } else if (w[i] === best) list.push(i); }
    return V.pick(list.length ? list : unknown);
  }


  V.css(`
  .bs{display:flex;flex-wrap:wrap;gap:18px 26px;justify-content:center;align-items:flex-start;width:100%}
  .bsside{display:flex;flex-direction:column;gap:10px;align-items:center;width:min(100%,440px)}
  .bsside.small{width:min(100%,250px)}
  .bsside h4{margin:0;font-family:var(--f-d);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .bsb{display:grid;grid-template-columns:repeat(11,1fr);gap:2px;width:100%;user-select:none;-webkit-user-select:none;touch-action:manipulation}
  .bsb.place{touch-action:none}
  .bsb .lb{font-size:10px;color:var(--dim);display:grid;place-items:center;aspect-ratio:1;font-family:var(--f-d)}
  .bsb .q{aspect-ratio:1;border-radius:3px;background:#112040;position:relative}
  .bsb.tgt .q.f{cursor:crosshair}
  .bsb.tgt .q.f:hover{background:#1c3768;box-shadow:inset 0 0 0 1px var(--cy)}
  .bsb .q.ship{background:#4a5c96}
  .bsb.place .q.ship{cursor:grab}
  .bsb .q.pv{background:rgba(93,255,157,.6)} .bsb .q.pvbad{background:rgba(255,93,115,.6)}
  .bsb .q.miss::after,.bsb .q.auto::after{content:'';position:absolute;inset:38%;border-radius:50%;background:#6874aa}
  .bsb .q.auto::after{background:#2c3863}
  .bsb .q.hit{background:var(--bad);animation:boom .35s ease-out}
  .bsb .q.hit::after{content:'';position:absolute;inset:30%;border-radius:50%;background:#ffe0e5}
  .bsb .q.sunk{background:#7a2433}
  .bsb .q.sunk::after{content:'';position:absolute;inset:30%;border-radius:50%;background:#ff8a9a}
  .bsb .q.new{box-shadow:inset 0 0 0 2px #fff}
  @keyframes boom{0%{transform:scale(1.5);box-shadow:0 0 20px var(--bad)}100%{transform:none}}
  .fleet{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
  .fleet>*{font-size:12px;padding:5px 9px;border-radius:9px;border:1px solid var(--line);background:var(--panel);display:inline-flex;gap:7px;align-items:center;color:var(--fg)}
  .fleet i{display:inline-flex;gap:2px} .fleet i b{width:7px;height:7px;background:#4a5c96;border-radius:2px}
  .fleet .dead{opacity:.4;text-decoration:line-through} .fleet .dead i b{background:var(--bad)}
  .dock{display:flex;flex-wrap:wrap;gap:8px 10px;justify-content:center;width:100%;touch-action:none;user-select:none;-webkit-user-select:none}
  .dship{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:7px 9px;border-radius:8px;border:1px solid var(--line);background:var(--panel);cursor:grab;transition:border-color .15s,opacity .15s,transform .15s}
  .dship .bar{display:flex;gap:2px}
  .dship .bar i{width:var(--cs,20px);height:var(--cs,20px);background:#4a5c96;border-radius:3px}
  .dship small{font-size:11px;color:var(--muted);line-height:1}
  .dship.sel{border-color:var(--cy);box-shadow:0 0 0 1px var(--cy) inset}
  .dship.sel .bar i{background:#6377bd}
  .dship.lift{opacity:.35;transform:scale(.95)}
  .dship.done{opacity:.45} .dship.done .bar i{background:var(--good)}
  .dship:active{cursor:grabbing}
  .phint{font-size:13px;color:var(--muted);text-align:center;margin:0;max-width:40ch}
  .bstools{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .bstools .btn{height:40px;padding:0 14px}
  .bstools.busy{opacity:.5;pointer-events:none}
  .passcard{width:min(100%,440px);min-height:340px;position:relative}`);

  V.register({
    id: 'ships', name: 'Schiffe versenken', cat: 'Klassiker', order: 2, accent: '#4f8bff',
    // "Gegenüber sitzen": the screen turns to player 2 on their turn (each player gets their own boards with text)
    turnBoard: true,
    short: 'Versteckte Flotten, gezielte Schüsse.',
    desc: 'Versteck deine Flotte und finde die Schiffe des Gegners zuerst. Treffer heißt: nochmal schießen.',
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Schiff legen oder drehen, schießen'], ['R', 'Nächstes Schiff drehen'], ['Z', 'Flotte zufällig verteilen'], ['F', 'Fertig']],
    levelInfo: ['Anfänger: schießt meist blind, auch nach einem Treffer.', 'Schießt blind und dann rund um jeden Treffer.', 'Folgt der Richtung eines getroffenen Schiffs und sucht im Schachbrettmuster.', 'Rechnet bei jedem Schuss für jedes Feld die Wahrscheinlichkeit aus.'],
    icon: `<svg viewBox="0 0 48 48" fill="none"><rect x="3" y="3" width="42" height="42" rx="6" fill="#112040"/><path d="M3 17h42M3 31h42M17 3v42M31 3v42" stroke="#1f3566" stroke-width="1.5"/><path d="M7 38h22l-3 4H10z" fill="#4a5c96"/><path d="M13 38v-4h8v4" fill="#4a5c96"/><circle cx="35" cy="12" r="5" fill="#ff5d73"/><circle cx="35" cy="12" r="2" fill="#ffe0e5"/><circle cx="24" cy="23" r="1.8" fill="#6874aa"/><circle cx="12" cy="11" r="1.8" fill="#6874aa"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat ein Meer mit 10×10 Feldern und versteckt darin seine Flotte. Ihr schießt abwechselnd auf das Meer des Gegners. Wer zuerst <b>alle gegnerischen Schiffe versenkt</b>, gewinnt.' },
      { t: 'Deine Flotte', d: 'Du hast 5 Schiffe: Schlachtschiff (5 Felder), Kreuzer (4), Zerstörer (3), U-Boot (3) und Schnellboot (2). Schiffe liegen waagerecht oder senkrecht und dürfen sich <b>nicht berühren</b>, auch nicht über Eck.', demo: V.mini(['sssss..s..', '.......s..', '.ss....s..', '..........', '....sss...'], {}, { w: 300 }) },
      { t: 'Platzieren', d: '<b>Zieh</b> die Schiffe von unten aufs Meer. Grün heißt: passt, rot heißt: geht nicht. <b>Antippen</b> eines gelegten Schiffs dreht es, ziehen verschiebt es, zurück ins Dock ziehen nimmt es weg. Am PC geht auch: Schiff unten anklicken, dann ein Feld anklicken; R dreht. <b>Zufällig</b> verteilt alles automatisch.' },
      { t: 'Schießen', d: 'Tippe auf ein Feld im gegnerischen Meer. Ein Punkt heißt <b>Wasser</b>, dann ist der Gegner dran. Rot heißt <b>Treffer</b>: Du darfst sofort noch einmal schießen.', demo: V.mini(['..m.......', '....#.....', '....#..m..', '.m........'], {}, { w: 300 }) },
      { t: 'Versenkt', d: 'Sind alle Felder eines Schiffs getroffen, ist es versenkt. Weil Schiffe sich nicht berühren dürfen, werden die Felder rundherum automatisch als Wasser markiert.', demo: V.mini(['...mmmm...', '...m%%m...', '...mmmm...', '..........'], {}, { w: 300 }) },
      { t: 'Zu zweit und online', d: 'Zu zweit an einem Gerät kommt nach jedem Zug ein Wechsel-Bildschirm: Gerät weitergeben und nicht hinschauen. Online liegt deine Flotte nur auf dem Server, dein Gegner kann sie nicht sehen. Tipp: Hast du einen Treffer, schieß auf die Nachbarfelder, bis du die Richtung kennst.' }
    ],
    start(ctx) {
      const mode = ctx.mode, local = mode === 'local', online = mode === 'online', watch = mode === 'watch', ai = mode === 'ai';
      const me = online ? ctx.mySide : ai ? 3 - ctx.aiSide : watch ? 1 : 0;
      const P = { 1: mk(), 2: mk() };
      const shots = { 1: 0, 2: 0 };
      let turn = 1, over = false, busy = false, lastMsg = '', lastShot = -1;
      const st = ctx.stage;
      const posName = i => COLS[i % N] + (((i / N) | 0) + 1);

      function board(cls) {
        const b = V.el('div', 'bsb ' + (cls || ''));
        b.appendChild(V.el('div', 'lb'));
        for (let c = 0; c < N; c++) b.appendChild(V.el('div', 'lb', COLS[c]));
        for (let r = 0; r < N; r++) {
          b.appendChild(V.el('div', 'lb', r + 1));
          for (let c = 0; c < N; c++) { const q = V.el('div', 'q'); q.dataset.i = r * N + c; b.appendChild(q); }
        }
        b.q = [...b.querySelectorAll('.q')];
        return b;
      }
      function paint(b, pl, showShips, target) {
        b.q.forEach((q, i) => {
          const s = pl.shots[i];
          q.className = 'q' + (showShips && pl.at[i] >= 0 && s < 2 ? ' ship' : '') + (s === 1 ? ' miss' : s === 2 ? ' hit' : s === 3 ? ' sunk' : s === 4 ? ' auto' : '') + (target && !s ? ' f' : '') + (i === lastShot && b.dataset.last === '1' ? ' new' : '');
        });
      }
      function fleetEl(pl) {
        return `<div class="fleet">${pl.ships.map(s => `<span class="${s.hits >= s.l ? 'dead' : ''}">${s.n}<i>${'<b></b>'.repeat(s.l)}</i></span>`).join('')}</div>`;
      }
      // the opponent's fleet online: lengths are known, positions only once a ship is sunk
      function unknownFleet(pl) { pl.known = false; pl.ships = FLEET.map(f => ({ l: f.l, n: f.n, cells: null, hits: 0 })); }
      function setFleet(pl, placed) { applyFleet(pl, placed); pl.known = true; }

      // ---------- placement: drag from the dock, tap to rotate, drag to move, drag back to remove ----------
      function placeFor(side, done) {
        st.innerHTML = '';
        let horiz = true, sel = 0, hover = -1, drag = null, justDragged = false;
        const placed = Array(FLEET.length).fill(null);
        ctx.turn(side, `${local ? ctx.who(side) + ', versteck' : 'Versteck'} deine Flotte`);
        const wrap = V.el('div', 'bs'), sd = V.el('div', 'bsside');
        const b = board('place'), dock = V.el('div', 'dock'), tools = V.el('div', 'bstools');
        const hint = V.el('p', 'phint', V.coarse ? 'Zieh die Schiffe aufs Meer. Antippen dreht ein Schiff, zurück ins Dock ziehen nimmt es weg.' : 'Zieh die Schiffe aufs Meer oder wähl unten eins und klick ein Feld an. Klick auf ein gelegtes Schiff dreht es.');
        tools.innerHTML = `<button class="btn" data-a="rot"></button><button class="btn" data-a="rnd">Zufällig</button><button class="btn ghost" data-a="clr">Leeren</button><button class="btn primary" data-a="ok">Fertig</button>`;
        sd.append(b, dock, hint, tools); wrap.appendChild(sd); st.appendChild(wrap);
        const at = skip => { const a = Array(N * N).fill(-1); placed.forEach((cells, k) => cells && k !== skip && cells.forEach(i => a[i] = k)); return a; };
        const horizOf = cells => cells.length < 2 || cells[1] - cells[0] === 1;
        const nextFree = () => placed.findIndex(p => !p);
        // ship k with its off-th cell under `cell`, pushed back onto the board if it would stick out
        function anchor(cell, k, off, h) {
          const len = FLEET[k].l; let r = (cell / N) | 0, c = cell % N;
          if (h) c = Math.max(0, Math.min(N - len, c - off)); else r = Math.max(0, Math.min(N - len, r - off));
          return cellsFor(r * N + c, len, h);
        }
        function refreshBoard() {
          const skip = drag && drag.moved ? drag.k : -1, a = at(skip);
          b.q.forEach((q, i) => q.className = 'q' + (a[i] >= 0 ? ' ship' : ''));
          let pv = null;
          if (drag && drag.moved && drag.cell >= 0) pv = anchor(drag.cell, drag.k, drag.off, drag.horiz);
          else if (!drag && hover >= 0 && sel >= 0 && !placed[sel]) pv = anchor(hover, sel, 0, horiz);
          if (pv) { const ok = free(a, pv); pv.forEach(i => b.q[i].classList.add(ok ? 'pv' : 'pvbad')); }
        }
        function refreshDock() {
          const cs = Math.max(14, Math.min(24, Math.round((b.q[0].getBoundingClientRect().width || 28) * 0.72)));
          dock.style.setProperty('--cs', cs + 'px');
          dock.innerHTML = FLEET.map((f, k) => `<button class="dship${placed[k] ? ' done' : ''}${k === sel && !placed[k] ? ' sel' : ''}${drag && drag.moved && drag.k === k ? ' lift' : ''}" data-k="${k}" aria-label="${f.n}"><span class="bar">${'<i></i>'.repeat(f.l)}</span><small>${f.n}</small></button>`).join('');
          tools.querySelector('[data-a=rot]').textContent = horiz ? 'Drehen (waagerecht)' : 'Drehen (senkrecht)';
        }
        const refresh = () => { refreshBoard(); refreshDock(); };
        function placedFx(cells) { cells.forEach((c, n) => b.q[c].animate([{ transform: 'scale(1.35)', filter: 'brightness(1.8)' }, { transform: 'none' }], { duration: 320, delay: n * 40, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' })); }
        function say() { const n = nextFree(); ctx.status(n < 0 ? 'Alles platziert. Tippe auf Fertig.' : `Jetzt: ${FLEET[n].n} (${FLEET[n].l} Felder)`); }
        function put(k, cells) {
          placed[k] = cells; V.sfx.place();
          if (sel === k || placed[sel]) sel = nextFree();
          refresh(); placedFx(cells); say();
        }
        function rotate(k, off) {
          const cells = placed[k], h = !horizOf(cells), a = at(k);
          for (const o of [off, 0, FLEET[k].l - 1]) {
            const nc = anchor(cells[off], k, o, h);
            if (nc && nc.includes(cells[off]) && free(a, nc)) { placed[k] = nc; V.sfx.tick(); refresh(); placedFx(nc); return; }
          }
          V.sfx.bad(); V.fx.shake(b, true); ctx.status('Zum Drehen ist hier kein Platz.');
        }
        function startDrag(e, k, off, h) { drag = { k, off, horiz: h, x0: e.clientX, y0: e.clientY, moved: false, cell: -1, pid: e.pointerId }; }
        b.addEventListener('pointerdown', e => {
          const q = e.target.closest('.q'); if (!q) return;
          const i = +q.dataset.i, a = at(-1);
          if (a[i] >= 0) { e.preventDefault(); const k = a[i]; startDrag(e, k, placed[k].indexOf(i), horizOf(placed[k])); }
        });
        dock.addEventListener('pointerdown', e => {
          const d = e.target.closest('.dship'); if (!d) return;
          const k = +d.dataset.k; if (placed[k]) return;
          e.preventDefault();
          const bar = d.querySelector('.bar').getBoundingClientRect();
          const off = Math.max(0, Math.min(FLEET[k].l - 1, Math.floor((e.clientX - bar.left) / (bar.width / FLEET[k].l))));
          startDrag(e, k, off, horiz);
        });
        const move = e => {
          if (!drag || e.pointerId !== drag.pid) return;
          if (!drag.moved) {
            if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
            drag.moved = true; refreshDock();
          }
          const el = document.elementFromPoint(e.clientX, e.clientY), q = el && el.closest ? el.closest('.bsb.place .q') : null;
          const cell = q ? +q.dataset.i : -1;
          if (cell !== drag.cell) { drag.cell = cell; refreshBoard(); }
        };
        const up = e => {
          if (!drag || e.pointerId !== drag.pid) return;
          const d = drag; drag = null;
          if (!d.moved) return;
          justDragged = true; setTimeout(() => { justDragged = false; }, 0);
          if (d.cell >= 0) {
            const cells = anchor(d.cell, d.k, d.off, d.horiz);
            if (free(at(d.k), cells)) return put(d.k, cells);
            V.sfx.bad(); V.fx.shake(b, true); ctx.status('Da passt das Schiff nicht hin. Schiffe dürfen sich nicht berühren.');
          } else {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.closest && el.closest('.dock') && placed[d.k]) { placed[d.k] = null; sel = d.k; V.sfx.tick(); say(); }
          }
          refresh();
        };
        const cancel = () => { if (drag) { drag = null; refresh(); } };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
        const unbind = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); };
        ctx.onCleanup(unbind);
        // taps and clicks (also Enter from the keyboard cursor)
        b.addEventListener('click', e => {
          if (justDragged) return;
          const q = e.target.closest('.q'); if (!q) return;
          const i = +q.dataset.i, a = at(-1);
          if (a[i] >= 0) return rotate(a[i], placed[a[i]].indexOf(i));
          if (sel < 0 || placed[sel]) sel = nextFree();
          if (sel < 0) return;
          const cells = anchor(i, sel, 0, horiz);
          if (!free(a, cells)) { hover = i; refreshBoard(); V.sfx.bad(); ctx.status('Da passt das Schiff nicht hin. Schiffe dürfen sich nicht berühren.'); return; }
          put(sel, cells);
        });
        dock.addEventListener('click', e => {
          if (justDragged) return;
          const d = e.target.closest('.dship'); if (!d) return;
          const k = +d.dataset.k;
          if (placed[k]) placed[k] = null;
          sel = k; V.sfx.tick(); refresh(); say();
        });
        b.addEventListener('mousemove', e => { if (drag) return; const q = e.target.closest('.q'); const h = q ? +q.dataset.i : -1; if (h !== hover) { hover = h; refreshBoard(); } });
        b.addEventListener('mouseleave', () => { hover = -1; refreshBoard(); });
        b.addEventListener('contextmenu', e => { e.preventDefault(); horiz = !horiz; refresh(); });
        ctx.nav(() => b.q, { start: () => 44, onFocus: (el, i) => { if (hover !== i) { hover = i; refreshBoard(); } } });
        ctx.keys(e => {
          const k = e.key.toLowerCase();
          if (k === 'r') { horiz = !horiz; refresh(); V.sfx.tick(); return true; }
          if (k === 'z') { tools.querySelector('[data-a=rnd]').click(); return true; }
          if (k === 'f') { tools.querySelector('[data-a=ok]').click(); return true; }
          return false;
        });
        tools.onclick = e => {
          const a = e.target.closest('button'); if (!a) return;
          if (a.dataset.a === 'rot') { horiz = !horiz; refresh(); }
          if (a.dataset.a === 'rnd') { randomPlacement().forEach((c, k) => placed[k] = c); sel = -1; V.sfx.place(); refresh(); ctx.status('Alles platziert. Verschieb oder dreh Schiffe, oder tippe auf Fertig.'); }
          if (a.dataset.a === 'clr') { placed.fill(null); sel = 0; refresh(); say(); }
          if (a.dataset.a === 'ok') {
            if (placed.some(p => !p)) { V.sfx.bad(); ctx.status('Platziere zuerst alle 5 Schiffe.'); return; }
            const r = done(placed.map(c => c.slice()));
            if (r && r.then) {
              tools.classList.add('busy');
              r.then(() => { unbind(); ctx.keys(null); }, err => { tools.classList.remove('busy'); V.sfx.bad(); ctx.status(err.message); });
            } else { unbind(); ctx.keys(null); }
          }
        };
        refresh(); say();
      }

      function passTo(side, text, cb) {
        st.innerHTML = '';
        ctx.turn(side, 'Gerät weitergeben');
        const card = V.el('div', 'passcard');
        card.innerHTML = `<div class="pass"><div class="eye">${V.IC.users}</div><h3>Gib das Gerät an ${ctx.who(side)}</h3><p>${text}</p><button class="btn primary" data-enter>Ich bin ${ctx.name(side)}, weiter</button></div>`;
        card.querySelector('button').onclick = cb;
        st.appendChild(card);
      }

      // ---------- battle ----------
      let tb = null, ob = null, tFleet = null;
      function viewer() { return local ? turn : me; }
      function renderBattle() {
        st.innerHTML = '';
        const v = viewer(), foe = 3 - v;
        const wrap = V.el('div', 'bs');
        const a = V.el('div', 'bsside'); a.innerHTML = `<h4>Meer von ${ctx.who(foe)}</h4>`;
        tb = board('tgt'); tb.dataset.last = '1'; a.appendChild(tb);
        tFleet = V.el('div'); a.appendChild(tFleet);
        const bside = V.el('div', 'bsside small'); bside.innerHTML = `<h4>${local || watch ? 'Flotte von ' + ctx.who(v) : 'Deine Flotte'}</h4>`;
        ob = board(); bside.appendChild(ob);
        wrap.append(a, bside); st.appendChild(wrap);
        ctx.nav(() => tb ? tb.q : [], { start: () => 44 });
        tb.addEventListener('click', e => {
          const q = e.target.closest('.q'); if (!q || over || busy || ctx.isAI(turn) || turn !== v) return;
          const i = +q.dataset.i; if (P[foe].shots[i]) return;
          if (!online) return shoot(i);
          busy = true; ctx.status(`Schuss auf ${posName(i)} <span class="thinking"></span>`);
          ctx.net.shot(i).then(r => { busy = false; shoot(i, r, true); }, err => { busy = false; V.sfx.bad(); ctx.status(err.message); });
        });
        refresh();
      }
      function refresh() {
        const v = viewer(), foe = 3 - v;
        ob.dataset.last = turn === foe ? '1' : '0';
        tb.dataset.last = turn === v ? '1' : '0';
        paint(tb, P[foe], over || watch, true);
        paint(ob, P[v], true, false);
        tFleet.innerHTML = fleetEl(P[foe]);
      }
      // given = the server's answer online (only needed when the target fleet is unknown here)
      function fire(shooter, i, given) {
        const tgt = P[3 - shooter];
        shots[shooter]++;
        if (tgt.known === false) {
          if (given.r === 'miss') { tgt.shots[i] = 1; return { r: 'miss' }; }
          if (given.r === 'hit') { tgt.shots[i] = 2; return { r: 'hit' }; }
          const cells = given.cells || [i];
          let k = tgt.ships.findIndex(s => !s.cells && s.l === cells.length); if (k < 0) k = tgt.ships.findIndex(s => s.hits < s.l);
          const s = tgt.ships[k]; s.cells = cells; s.hits = s.l;
          cells.forEach(c => { tgt.at[c] = k; tgt.shots[c] = 3; });
          cells.forEach(c => around(c).forEach(j => { if (!tgt.shots[j]) tgt.shots[j] = 4; }));
          return { r: 'sunk', n: s.n, k };
        }
        const k = tgt.at[i];
        if (k < 0) { tgt.shots[i] = 1; return { r: 'miss' }; }
        const s = tgt.ships[k]; s.hits++; tgt.shots[i] = 2;
        if (s.hits < s.l) return { r: 'hit' };
        s.cells.forEach(c => tgt.shots[c] = 3);
        s.cells.forEach(c => around(c).forEach(j => { if (!tgt.shots[j]) tgt.shots[j] = 4; }));
        return { r: 'sunk', n: s.n, k };
      }
      function shoot(i, given, own) {
        busy = true; lastShot = i;
        if (!own) ctx.moved(turn, given || { i });
        const res = fire(turn, i, given);
        const pos = posName(i);
        if (res.r === 'miss') { V.sfx.miss(); lastMsg = `${pos}: Wasser`; }
        else if (res.r === 'hit') { V.sfx.hit(); lastMsg = `${pos}: <span class="c${turn}">Treffer!</span>`; }
        else { V.sfx.hit(); V.sfx.goal(); lastMsg = `${pos}: <span class="c${turn}">${res.n} versenkt!</span>`; }
        refresh();
        const shotBoard = turn === viewer() ? tb : ob, q = shotBoard && shotBoard.q[i];
        if (q) {
          if (res.r === 'miss') { V.fx.ringAt(q, '#6ff3ff', 60); V.fx.burstAt(q, '#6874aa', 5, 26); }
          else if (res.r === 'hit') { V.fx.burstAt(q, '#ff5d73', 12, 60); V.fx.floatAt(q, 'Treffer!', '#ff5d73'); V.fx.shake(shotBoard, true); }
          else {
            P[3 - turn].ships[res.k].cells.forEach((c, n) => ctx.later(() => { V.fx.burstAt(shotBoard.q[c], n % 2 ? '#ffd84f' : '#ff5d73', 12, 80); }, n * 70));
            V.fx.floatAt(q, 'Versenkt!', '#ffd84f'); V.fx.shake(shotBoard); V.fx.flash('#ff5d73');
          }
        }
        if (P[3 - turn].ships.every(s => s.hits >= s.l)) { over = true; refresh(); ctx.status(lastMsg); ctx.end(turn, `${shots[turn]} Schüsse`); return; }
        if (res.r !== 'miss') { busy = false; ctx.later(nextTurn, 0); return; }
        ctx.status(lastMsg);
        ctx.later(() => {
          turn = 3 - turn; busy = false;
          if (local) passTo(turn, 'Du bist dran mit Schießen.', () => { lastMsg = ''; renderBattle(); nextTurn(); });
          else { refresh(); nextTurn(); }
        }, ctx.isAI(turn) ? 750 : (local ? 900 : 650));
      }
      function nextTurn() {
        if (over) return;
        const pre = lastMsg ? lastMsg + ' · ' : '';
        const again = !!lastMsg && !lastMsg.includes('Wasser');
        if (ctx.isAI(turn)) {
          ctx.turn(turn, false);
          const tgtBoard = () => (turn === viewer() ? tb : ob);
          ctx.aiTurn({
            quick: again,
            think: () => {
              const left = P[me].ships.filter(x => x.hits < x.l).length, mine = P[ctx.aiSide].ships.filter(x => x.hits < x.l).length;
              return { move: aiShot(ctx.level, P[3 - turn]), mood: (mine - left) / 3 };
            },
            targets: m => [tgtBoard().q[typeof m === 'number' ? m : m.i]],
            decoys: () => ob.q.filter((q, i) => !P[me].shots[i]),
            decode: r => (r && Number.isInteger(r.i) && r.i >= 0 && r.i < N * N && !P[3 - turn].shots[r.i] && ['miss', 'hit', 'sunk'].includes(r.r) ? r : null),
            apply: m => (typeof m === 'number' ? shoot(m) : shoot(m.i, m)),
            say: m => (typeof m === 'number' ? '' : posName(m.i))
          });
        } else {
          ctx.turn(turn, pre + (local ? ctx.who(turn) + ' schießt' : 'Du schießt') + (again ? ' nochmal' : ''));
        }
      }
      function battle() { turn = 1; lastMsg = ''; renderBattle(); nextTurn(); }

      // online: wait until both fleets are on the server, then shoot
      function waitForOpponent() {
        const s = ctx.net.state();
        if (s && s.fleets_ready) return battle();
        st.innerHTML = '';
        const wrap = V.el('div', 'bs'), sd = V.el('div', 'bsside small');
        sd.innerHTML = '<h4>Deine Flotte</h4>';
        const b = board(); sd.appendChild(b); wrap.appendChild(sd); st.appendChild(wrap);
        paint(b, P[me], true, false);
        ctx.turn(3 - me, `Warte auf die Flotte von ${ctx.who(3 - me)} <span class="thinking"></span>`);
        ctx.net.whenReady(() => { V.sfx.goal(); battle(); });
      }

      if (local) placeFor(1, p1 => { setFleet(P[1], p1); passTo(2, 'Jetzt versteckst du deine Flotte. Spieler 1 schaut weg.', () => placeFor(2, p2 => { setFleet(P[2], p2); passTo(1, 'Die Schlacht beginnt. Du schießt zuerst.', battle); })); });
      else if (ai) { setFleet(P[ctx.aiSide], randomPlacement()); if (ctx.auto) { setFleet(P[me], randomPlacement()); battle(); } else placeFor(me, placed => { setFleet(P[me], placed); V.sfx.goal(); battle(); }); }
      else if (online) {
        unknownFleet(P[3 - me]);
        const s = ctx.net.state() || {};
        if (s.my_fleet) { setFleet(P[me], s.my_fleet); waitForOpponent(); }
        else placeFor(me, placed => ctx.net.fleet(placed).then(() => { setFleet(P[me], placed); V.sfx.goal(); waitForOpponent(); }));
      } else if (watch) {
        const go = s => { const f = s.fleets || {}; setFleet(P[1], f['1']); setFleet(P[2], f['2']); battle(); };
        const s = ctx.net.state() || {};
        if (s.fleets_ready && s.fleets) go(s);
        else { ctx.status('Die Spieler platzieren noch ihre Flotten <span class="thinking"></span>'); ctx.net.whenReady(go); }
      }
    }
  });
})();
