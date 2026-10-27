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
    if (level === 0) {
      if (hits.length && Math.random() < 0.5) { const c = hits.flatMap(nb4).filter(i => !sh[i]); if (c.length) return V.pick(c); }
      return V.pick(unknown);
    }
    if (level === 3) return density(tgt, unknown, hits);
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
  .bsb .lb{font-size:10px;color:var(--dim);display:grid;place-items:center;aspect-ratio:1;font-family:var(--f-d)}
  .bsb .q{aspect-ratio:1;border-radius:3px;background:#112040;position:relative}
  .bsb.tgt .q.f{cursor:crosshair}
  .bsb.tgt .q.f:hover{background:#1c3768;box-shadow:inset 0 0 0 1px var(--cy)}
  .bsb .q.ship{background:#4a5c96}
  .bsb .q.pv{background:rgba(93,255,157,.55)} .bsb .q.pvbad{background:rgba(255,93,115,.55)}
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
  .fleet .cur{border-color:var(--cy);box-shadow:0 0 0 1px var(--cy) inset} .fleet .ok i b{background:var(--good)}
  .bstools{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .bstools .btn{height:40px;padding:0 14px}
  .passcard{width:min(100%,440px);min-height:340px;position:relative}`);

  V.register({
    id: 'ships', name: 'Schiffe versenken', cat: 'Klassiker', order: 2, accent: '#4f8bff',
    short: 'Versteckte Flotten, gezielte Schüsse.',
    desc: 'Versteck deine Flotte und finde die Schiffe des Gegners zuerst. Treffer heißt: nochmal schießen.',
    sides: { 1: 'Flotte Pink', 2: 'Flotte Gelb' },
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Schiff legen oder schießen'], ['R', 'Schiff drehen'], ['Z', 'Flotte zufällig verteilen'], ['F', 'Fertig']],
    levelInfo: ['Schießt meistens blind.', 'Jagt angeschossene Schiffe gezielt.', 'Sucht im Schachbrettmuster und verfolgt Treffer.', 'Rechnet für jedes Feld die Wahrscheinlichkeit aus.'],
    icon: `<svg viewBox="0 0 48 48" fill="none"><rect x="3" y="3" width="42" height="42" rx="6" fill="#112040"/><path d="M3 17h42M3 31h42M17 3v42M31 3v42" stroke="#1f3566" stroke-width="1.5"/><path d="M7 38h22l-3 4H10z" fill="#4a5c96"/><path d="M13 38v-4h8v4" fill="#4a5c96"/><circle cx="35" cy="12" r="5" fill="#ff5d73"/><circle cx="35" cy="12" r="2" fill="#ffe0e5"/><circle cx="24" cy="23" r="1.8" fill="#6874aa"/><circle cx="12" cy="11" r="1.8" fill="#6874aa"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat ein Meer mit 10×10 Feldern und versteckt darin seine Flotte. Ihr schießt abwechselnd auf das Meer des Gegners. Wer zuerst <b>alle gegnerischen Schiffe versenkt</b>, gewinnt.' },
      { t: 'Deine Flotte', d: 'Du hast 5 Schiffe: Schlachtschiff (5 Felder), Kreuzer (4), Zerstörer (3), U-Boot (3) und Schnellboot (2). Schiffe liegen waagerecht oder senkrecht und dürfen sich <b>nicht berühren</b>, auch nicht über Eck.', demo: V.mini(['sssss..s..', '.......s..', '.ss....s..', '..........', '....sss...'], {}, { w: 300 }) },
      { t: 'Platzieren', d: 'Tippe auf ein Feld, um das ausgewählte Schiff dort hinzulegen. <b>Drehen</b> wechselt zwischen waagerecht und senkrecht, am PC geht das auch mit der Taste R oder einem Rechtsklick. Tippst du auf ein gelegtes Schiff, nimmst du es wieder hoch. <b>Zufällig</b> verteilt alles automatisch.' },
      { t: 'Schießen', d: 'Tippe auf ein Feld im gegnerischen Meer. Ein Punkt heißt <b>Wasser</b>, dann ist der Gegner dran. Rot heißt <b>Treffer</b>: Du darfst sofort noch einmal schießen.', demo: V.mini(['..m.......', '....#.....', '....#..m..', '.m........'], {}, { w: 300 }) },
      { t: 'Versenkt', d: 'Sind alle Felder eines Schiffs getroffen, ist es versenkt. Weil Schiffe sich nicht berühren dürfen, werden die Felder rundherum automatisch als Wasser markiert.', demo: V.mini(['...mmmm...', '...m%%m...', '...mmmm...', '..........'], {}, { w: 300 }) },
      { t: 'Zu zweit an einem Gerät', d: 'Im 2-Spieler-Modus kommt nach jedem Zug ein Wechsel-Bildschirm. Gib das Gerät weiter und schau nicht hin, wenn der andere seine Flotte sieht. Tipp: Hast du einen Treffer, schieß auf die Nachbarfelder, bis du die Richtung kennst.' }
    ],
    start(ctx) {
      const local = ctx.mode === 'local';
      const human = local ? 0 : 3 - ctx.aiSide;
      const P = { 1: mk(), 2: mk() };
      const shots = { 1: 0, 2: 0 };
      let turn = 1, over = false, busy = false, keyFn = null, lastMsg = '', lastShot = -1;
      const st = ctx.stage;
      ctx.onCleanup(() => { if (keyFn) window.removeEventListener('keydown', keyFn); });

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
      const label = s => local ? ctx.name(s) : (s === human ? 'Du' : 'KI');

      // ---------- placement ----------
      function placeFor(side, done) {
        st.innerHTML = '';
        const pl = P[side];
        let horiz = true, cur = 0;
        const placed = Array(FLEET.length).fill(null);
        ctx.turn(side, `${local ? ctx.who(side) + ', versteck' : 'Versteck'} deine Flotte`);
        const wrap = V.el('div', 'bs'), sd = V.el('div', 'bsside');
        const b = board(), fl = V.el('div', 'fleet'), tools = V.el('div', 'bstools');
        tools.innerHTML = `<button class="btn" data-a="rot">Drehen</button><button class="btn" data-a="rnd">Zufällig</button><button class="btn ghost" data-a="clr">Leeren</button><button class="btn primary" data-a="ok">Fertig</button>`;
        sd.append(b, fl, tools); wrap.appendChild(sd); st.appendChild(wrap);
        const at = () => { const a = Array(N * N).fill(-1); placed.forEach((cells, k) => cells && cells.forEach(i => a[i] = k)); return a; };
        let hover = -1;
        function refresh() {
          const a = at();
          b.q.forEach((q, i) => q.className = 'q' + (a[i] >= 0 ? ' ship' : ''));
          if (hover >= 0 && cur >= 0) {
            const cells = cellsFor(hover, FLEET[cur].l, horiz);
            const ok = free(a, cells);
            (cells || clip(hover, FLEET[cur].l, horiz)).forEach(i => b.q[i].classList.add(ok ? 'pv' : 'pvbad'));
          }
          fl.innerHTML = FLEET.map((f, k) => `<button data-k="${k}" class="${k === cur ? 'cur' : ''} ${placed[k] ? 'ok' : ''}">${f.n}<i>${'<b></b>'.repeat(f.l)}</i></button>`).join('');
          fl.querySelectorAll('button').forEach(x => x.onclick = () => { const k = +x.dataset.k; if (placed[k]) placed[k] = null; cur = k; refresh(); });
          tools.querySelector('[data-a=rot]').textContent = horiz ? 'Drehen (waagerecht)' : 'Drehen (senkrecht)';
        }
        function clip(i, len, h) { const out = []; const r = (i / N) | 0, c = i % N; for (let k = 0; k < len; k++) { const rr = h ? r : r + k, cc = h ? c + k : c; if (rr < N && cc < N) out.push(rr * N + cc); } return out; }
        b.addEventListener('mousemove', e => { const q = e.target.closest('.q'); const h = q ? +q.dataset.i : -1; if (h !== hover) { hover = h; refresh(); } });
        b.addEventListener('mouseleave', () => { hover = -1; refresh(); });
        b.addEventListener('contextmenu', e => { e.preventDefault(); horiz = !horiz; refresh(); });
        b.addEventListener('click', e => {
          const q = e.target.closest('.q'); if (!q) return;
          const i = +q.dataset.i, a = at();
          if (a[i] >= 0) { placed[a[i]] = null; cur = a[i]; hover = i; refresh(); return; }
          if (cur < 0) return;
          const cells = cellsFor(i, FLEET[cur].l, horiz);
          if (!free(a, cells)) { hover = i; refresh(); V.sfx.bad(); ctx.status('Da passt das Schiff nicht hin. Schiffe dürfen sich nicht berühren.'); return; }
          placed[cur] = cells; V.sfx.place();
          cur = placed.findIndex(p => !p);
          hover = -1; refresh();
          cells.forEach((c, n) => { b.q[c].animate([{ transform: 'scale(1.35)', filter: 'brightness(1.8)' }, { transform: 'none' }], { duration: 320, delay: n * 40, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' }); });
          ctx.status(cur < 0 ? 'Alles platziert. Tippe auf Fertig.' : `Jetzt: ${FLEET[cur].n} (${FLEET[cur].l} Felder)`);
        });
        ctx.nav(() => b.q, { start: () => 44, onFocus: (el, i) => { if (hover !== i) { hover = i; refresh(); } } });
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
          if (a.dataset.a === 'rnd') { randomPlacement().forEach((c, k) => placed[k] = c); cur = -1; V.sfx.place(); refresh(); ctx.status('Alles platziert. Tippe auf Fertig oder verschiebe Schiffe.'); }
          if (a.dataset.a === 'clr') { placed.fill(null); cur = 0; refresh(); }
          if (a.dataset.a === 'ok') {
            if (placed.some(p => !p)) { V.sfx.bad(); ctx.status('Platziere zuerst alle 5 Schiffe.'); return; }
            ctx.keys(null);
            applyFleet(pl, placed); V.sfx.goal(); done();
          }
        };
        refresh();
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
      function viewer() { return local ? turn : human; }
      function renderBattle() {
        st.innerHTML = '';
        const me = viewer(), foe = 3 - me;
        const wrap = V.el('div', 'bs');
        const a = V.el('div', 'bsside'); a.innerHTML = `<h4>Meer von ${label(foe)}</h4>`;
        tb = board('tgt'); tb.dataset.last = '1'; a.appendChild(tb);
        tFleet = V.el('div'); a.appendChild(tFleet);
        const bside = V.el('div', 'bsside small'); bside.innerHTML = `<h4>${local ? 'Flotte von ' + label(me) : 'Deine Flotte'}</h4>`;
        ob = board(); bside.appendChild(ob);
        wrap.append(a, bside); st.appendChild(wrap);
        ctx.nav(() => tb ? tb.q : [], { start: () => 44 });
        tb.addEventListener('click', e => {
          const q = e.target.closest('.q'); if (!q || over || busy || ctx.isAI(turn) || turn !== me) return;
          const i = +q.dataset.i; if (P[foe].shots[i]) return;
          shoot(i);
        });
        refresh();
      }
      function refresh() {
        const me = viewer(), foe = 3 - me;
        ob.dataset.last = turn === foe ? '1' : '0';
        tb.dataset.last = turn === me ? '1' : '0';
        paint(tb, P[foe], over, true);
        paint(ob, P[me], true, false);
        tFleet.innerHTML = fleetEl(P[foe]);
      }
      function fire(shooter, i) {
        const tgt = P[3 - shooter], k = tgt.at[i];
        shots[shooter]++;
        if (k < 0) { tgt.shots[i] = 1; return { r: 'miss' }; }
        const s = tgt.ships[k]; s.hits++; tgt.shots[i] = 2;
        if (s.hits < s.l) return { r: 'hit' };
        s.cells.forEach(c => tgt.shots[c] = 3);
        s.cells.forEach(c => around(c).forEach(j => { if (!tgt.shots[j]) tgt.shots[j] = 4; }));
        return { r: 'sunk', n: s.n };
      }
      function shoot(i) {
        busy = true; lastShot = i;
        const res = fire(turn, i);
        const pos = COLS[i % N] + (((i / N) | 0) + 1);
        if (res.r === 'miss') { V.sfx.miss(); lastMsg = `${pos}: Wasser`; }
        else if (res.r === 'hit') { V.sfx.hit(); lastMsg = `${pos}: <span class="c${turn}">Treffer!</span>`; }
        else { V.sfx.hit(); V.sfx.goal(); lastMsg = `${pos}: <span class="c${turn}">${res.n} versenkt!</span>`; }
        refresh();
        const shotBoard = turn === viewer() ? tb : ob, q = shotBoard && shotBoard.q[i];
        if (q) {
          if (res.r === 'miss') { V.fx.ringAt(q, '#6ff3ff', 60); V.fx.burstAt(q, '#6874aa', 5, 26); }
          else if (res.r === 'hit') { V.fx.burstAt(q, '#ff5d73', 12, 60); V.fx.floatAt(q, 'Treffer!', '#ff5d73'); V.fx.shake(shotBoard, true); }
          else {
            const tgt = P[3 - turn], k = tgt.at[i];
            tgt.ships[k].cells.forEach((c, n) => ctx.later(() => { V.fx.burstAt(shotBoard.q[c], n % 2 ? '#ffd84f' : '#ff5d73', 12, 80); }, n * 70));
            V.fx.floatAt(q, 'Versenkt!', '#ffd84f'); V.fx.shake(shotBoard); V.fx.flash('#ff5d73');
          }
        }
        if (P[3 - turn].ships.every(s => s.hits >= s.l)) { over = true; refresh(); ctx.status(lastMsg); ctx.end(turn, `${shots[turn]} Schüsse`); return; }
        if (res.r !== 'miss') { busy = false; ctx.later(nextTurn, 0); return; }
        ctx.status(lastMsg);
        ctx.later(() => {
          turn = 3 - turn; busy = false;
          if (local) passTo(turn, 'Du bist dran mit Schießen.', () => { lastMsg = ''; renderBattle(); nextTurn(); });
          else nextTurn();
        }, ctx.isAI(turn) ? 750 : (local ? 900 : 650));
      }
      function nextTurn() {
        if (over) return;
        const pre = lastMsg ? lastMsg + ' · ' : '';
        if (ctx.isAI(turn)) {
          ctx.turn(turn, false);
          ctx.status(pre + '<span class="c' + turn + '">KI</span> <span class="thinking">zielt</span>');
          ctx.later(() => shoot(aiShot(ctx.level, P[human])), 550);
        } else {
          ctx.turn(turn, pre + (local ? ctx.who(turn) + ' schießt' : 'Du schießt') + (lastMsg && !lastMsg.includes('Wasser') ? ' nochmal' : ''));
        }
      }
      function battle() { turn = 1; renderBattle(); nextTurn(); }

      if (local) placeFor(1, () => passTo(2, 'Jetzt versteckst du deine Flotte. Spieler 1 schaut weg.', () => placeFor(2, () => passTo(1, 'Die Schlacht beginnt. Du schießt zuerst.', battle))));
      else { applyFleet(P[ctx.aiSide], randomPlacement()); placeFor(human, battle); }
    }
  });
})();
