(function () {
  // values: 0 empty, 1/2 man of side 1/2, 3/4 king of side 1/2
  const sideOf = v => v ? ((v - 1) % 2) + 1 : 0;
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  function captures(b, from) {
    const v = b[from], me = sideOf(v), king = v > 2, out = [];
    b[from] = 0;
    (function dfs(sq, caps, path) {
      const r = sq >> 3, c = sq & 7;
      let found = false;
      for (const [dr, dc] of DIAG) {
        if (!king) {
          const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
          if (!inb(r2, c2)) continue;
          const o = r1 * 8 + c1, l = r2 * 8 + c2;
          if (sideOf(b[o]) === 3 - me && !caps.includes(o) && !b[l]) { found = true; dfs(l, caps.concat(o), path.concat(l)); }
        } else {
          let rr = r + dr, cc = c + dc;
          while (inb(rr, cc) && !b[rr * 8 + cc]) { rr += dr; cc += dc; }
          if (!inb(rr, cc)) continue;
          const o = rr * 8 + cc;
          if (sideOf(b[o]) !== 3 - me || caps.includes(o)) continue;
          rr += dr; cc += dc;
          while (inb(rr, cc) && !b[rr * 8 + cc]) { found = true; dfs(rr * 8 + cc, caps.concat(o), path.concat(rr * 8 + cc)); rr += dr; cc += dc; }
        }
      }
      if (!found && caps.length) out.push({ path, caps });
    })(from, [], [from]);
    b[from] = v;
    return out;
  }
  function genMoves(s) {
    if (s._m) return s._m;
    const b = s.b, me = s.turn, caps = [], quiet = [];
    for (let sq = 0; sq < 64; sq++) {
      const v = b[sq]; if (sideOf(v) !== me) continue;
      caps.push(...captures(b, sq));
      if (caps.length) continue;
      const r = sq >> 3, c = sq & 7;
      if (v > 2) {
        for (const [dr, dc] of DIAG) { let rr = r + dr, cc = c + dc; while (inb(rr, cc) && !b[rr * 8 + cc]) { quiet.push({ path: [sq, rr * 8 + cc], caps: [] }); rr += dr; cc += dc; } }
      } else {
        const dr = me === 1 ? -1 : 1;
        for (const dc of [-1, 1]) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && !b[rr * 8 + cc]) quiet.push({ path: [sq, rr * 8 + cc], caps: [] }); }
      }
    }
    s._m = caps.length ? caps : quiet;
    return s._m;
  }
  function play(s, m) {
    const b = s.b.slice(), f = m.path[0], t = m.path[m.path.length - 1];
    let v = b[f]; b[f] = 0; m.caps.forEach(o => b[o] = 0);
    if (v <= 2 && ((v === 1 && t >> 3 === 0) || (v === 2 && t >> 3 === 7))) v += 2;
    b[t] = v;
    const man = s.b[f] <= 2;
    return { b, turn: 3 - s.turn, quiet: (m.caps.length || man) ? 0 : s.quiet + 1 };
  }
  const G = {
    moves: genMoves, play,
    order: (s, ms) => ms.slice().sort((a, b) => b.caps.length - a.caps.length),
    over(s, ply) { if (!genMoves(s).length) return -(100000 - ply); if (s.quiet >= 50) return 0; return null; },
    eval(s) {
      let v = 0;
      for (let sq = 0; sq < 64; sq++) {
        const p = s.b[sq]; if (!p) continue;
        const sd = sideOf(p), r = sq >> 3, c = sq & 7;
        let x = p > 2 ? 290 : 100 + (sd === 1 ? 7 - r : r) * 4;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) x += 4;
        if (p <= 2 && ((sd === 1 && r === 7) || (sd === 2 && r === 0))) x += 6;
        v += sd === s.turn ? x : -x;
      }
      return v;
    }
  };

  V.css(`
  .ck{display:grid;grid-template-columns:repeat(8,1fr);width:min(100%,520px);border-radius:12px;overflow:hidden;border:2px solid #3b4170;box-shadow:0 0 40px -14px var(--p1);user-select:none;touch-action:manipulation}
  .ck .sq{aspect-ratio:1;position:relative;display:grid;place-items:center}
  .ck .lt{background:#c8cae8} .ck .dk{background:#3c4177;cursor:pointer}
  .ck .pc{width:78%;height:78%;border-radius:50%;display:grid;place-items:center;font-size:clamp(14px,4.6vw,26px);line-height:1;transition:transform .15s}
  .ck .s1{background:radial-gradient(circle at 35% 30%,#ffa6ec,var(--p1) 62%);box-shadow:0 3px 0 #9c2a83,0 0 12px rgba(255,79,216,.45);color:#5a0f4a}
  .ck .s2{background:radial-gradient(circle at 35% 30%,#fff1b0,var(--p2) 62%);box-shadow:0 3px 0 #9b7f1f,0 0 12px rgba(255,216,79,.4);color:#5b4705}
  .ck .pc{position:relative;z-index:2}
  .ck .can .pc::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:3px solid var(--cy);animation:canp 1.6s ease-in-out infinite}
  @keyframes canp{50%{opacity:.25;transform:scale(1.06)}}
  .lowfx .ck .can .pc::after{animation:none}
  .ck .sel .pc{transform:scale(1.1);box-shadow:0 0 0 3px #fff,0 0 20px var(--cy)}
  .ck .gone .pc{opacity:.3}
  .ck .nx::after{content:'';position:absolute;width:30%;height:30%;border-radius:50%;background:var(--cy);opacity:.8;box-shadow:0 0 12px var(--cy)}
  .ck .lastm{background:#55497f}`);

  const cm = rows => V.mini(rows, { k: { c: 'k1', t: '' }, K: { c: 'k2', t: '' } }, { checker: true, w: 230 });

  V.register({
    id: 'checkers', name: 'Dame', cat: 'Strategie', order: 2, accent: 'var(--p1)',
    short: 'Diagonal ziehen, Steine überspringen.',
    desc: 'Zieh diagonal, spring über gegnerische Steine und mach aus deinen Steinen Damen. Mit Schlagzwang.',
    sides: { 1: 'Pink', 2: 'Gelb' },
    keys: [['Pfeile', 'Dunkles Feld wählen'], ['Enter', 'Stein nehmen, dann Ziel (bei Mehrfachsprung Feld für Feld)']],
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="6" fill="#c8cae8"/><path d="M13.5 3H24v10.5H13.5zM34.5 3H45v10.5H34.5zM3 13.5h10.5V24H3zM24 13.5h10.5V24H24zM13.5 24H24v10.5H13.5zM34.5 24H45v10.5H34.5zM3 34.5h10.5V45H3zM24 34.5h10.5V45H24z" fill="#3c4177"/><circle cx="18.75" cy="29.25" r="4.2" fill="#ff4fd8"/><circle cx="29.25" cy="18.75" r="4.2" fill="#ffd84f"/><circle cx="8.25" cy="39.75" r="4.2" fill="#ff4fd8"/></svg>`,
    tutorial: [
      { t: 'Aufbau und Ziel', d: 'Gespielt wird nur auf den <b>dunklen Feldern</b>. Jeder hat 12 Steine. Pink beginnt. Du gewinnst, wenn der Gegner <b>keine Steine mehr hat oder nicht mehr ziehen kann</b>.', demo: cm(['.b.b.b.b', 'b.b.b.b.', '.b.b.b.b', '........', '........', 'a.a.a.a.', '.a.a.a.a', 'a.a.a.a.']) },
      { t: 'Ziehen', d: 'Ein normaler Stein zieht <b>ein Feld diagonal nach vorn</b> auf ein freies Feld.', demo: cm(['........', '........', '........', '..*.*...', '...a....', '........', '........', '........']) },
      { t: 'Schlagen', d: 'Steht ein gegnerischer Stein diagonal neben dir und dahinter ist frei, <b>springst du drüber</b> und schlägst ihn. Das geht auch rückwärts. Kannst du danach nochmal springen, musst du weiterspringen.', demo: cm(['........', '.....*..', '....b...', '...*....', '..b.....', '.a......', '........', '........']) },
      { t: 'Schlagzwang', d: 'Kannst du schlagen, <b>musst du schlagen</b>. Gibt es mehrere Möglichkeiten, darfst du wählen. Leuchtende Steine zeigen dir, welche Steine gerade ziehen dürfen.' },
      { t: 'Die Dame', d: 'Erreicht ein Stein die <b>gegnerische Grundreihe</b>, wird er zur Dame (mit Ring). Die Dame zieht beliebig weit diagonal, vorwärts und rückwärts, und kann auch aus der Ferne schlagen.', demo: cm(['k.......', '.*......', '..*.....', '...*....', '....*...', '.....b..', '......*.', '.......*']) },
      { t: 'Remis und Tipps', d: 'Werden 25 Züge pro Spieler nur mit Damen ohne Schlagen gemacht, endet es remis. Tipp: Halte deine hintere Reihe lange besetzt, dann bekommt der Gegner schwer eine Dame. Biete ruhig mal einen Stein an, wenn du danach zwei zurückschlägst.' }
    ],
    start(ctx) {
      const b0 = Array(64).fill(0);
      for (let sq = 0; sq < 64; sq++) { const r = sq >> 3, c = sq & 7; if ((r + c) % 2) { if (r < 3) b0[sq] = 2; else if (r > 4) b0[sq] = 1; } }
      let s = { b: b0, turn: 1, quiet: 0 }, over = false, sel = -1, prefix = [], last = null;
      const flip = ctx.mode === 'ai' && ctx.aiSide === 1;
      const board = V.el('div', 'ck'), cells = {};
      const order = [...Array(64).keys()]; if (flip) order.reverse();
      order.forEach(sq => { const d = V.el('div', 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt')); d.dataset.sq = sq; cells[sq] = d; board.appendChild(d); });
      ctx.stage.appendChild(board);
      board.addEventListener('click', e => { const d = e.target.closest('.sq'); if (d) tap(+d.dataset.sq); });
      const darks = [...board.children].filter(d => d.classList.contains('dk'));
      ctx.nav(() => darks, { pad: 1 });
      const human = () => !over && !ctx.isAI(s.turn);

      function render() {
        const ms = genMoves(s);
        const pref = prefix.length ? ms.filter(m => prefix.every((p, i) => m.path[i] === p)) : [];
        const nexts = new Set(pref.map(m => m.path[prefix.length]).filter(x => x !== undefined));
        const gone = new Set(); if (pref.length) pref[0].caps.slice(0, prefix.length - 1).forEach(x => gone.add(x));
        const movable = new Set(human() ? ms.map(m => m.path[0]) : []);
        const showAt = prefix.length ? prefix[prefix.length - 1] : -1;
        for (let sq = 0; sq < 64; sq++) {
          const d = cells[sq];
          let v = s.b[sq];
          if (prefix.length) { if (sq === prefix[0]) v = 0; if (sq === showAt) v = s.b[prefix[0]]; }
          let cls = 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt');
          if (last && last.includes(sq) && !v) cls += ' lastm';
          if (movable.has(sq) && sel < 0) cls += ' can';
          if (sq === showAt) cls += ' sel';
          if (gone.has(sq)) cls += ' gone';
          if (nexts.has(sq)) cls += ' nx';
          d.className = cls;
          d.innerHTML = v ? `<div class="pc s${sideOf(v)}">${v > 2 ? '♛︎' : ''}</div>` : '';
        }
      }
      const slideTo = (from, to) => { const r = cells[from].getBoundingClientRect(); return () => V.fx.slide(cells[to].querySelector('.pc'), r, 200); };
      function tap(sq) {
        if (!human()) return;
        const ms = genMoves(s);
        if (prefix.length) {
          const cand = ms.filter(m => prefix.every((p, i) => m.path[i] === p) && m.path[prefix.length] === sq);
          if (cand.length) {
            const from = prefix[prefix.length - 1];
            prefix.push(sq); V.sfx.move();
            const done = cand.find(m => m.path.length === prefix.length);
            if (done) return doMove(done);
            const sl = slideTo(from, sq); render(); sl();
            return;
          }
        }
        if (ms.some(m => m.path[0] === sq)) { sel = sq; prefix = [sq]; V.sfx.move(); }
        else { sel = -1; prefix = []; }
        render();
      }
      function doMove(m) {
        const to = m.path[m.path.length - 1];
        const from = !prefix.length ? m.path[0] : prefix[prefix.length - 1] === to ? (prefix[prefix.length - 2] ?? m.path[0]) : prefix[prefix.length - 1];
        const sl = slideTo(from, to);
        const wasMan = s.b[m.path[0]] <= 2;
        s = play(s, m); last = m.path; sel = -1; prefix = [];
        if (m.caps.length) V.sfx.place(); else V.sfx.move();
        render(); sl();
        m.caps.forEach((c, n) => ctx.later(() => V.fx.burstAt(cells[c], s.turn === 1 ? '#ff4fd8' : '#ffd84f', 10, 50), 120 + n * 60));
        if (m.caps.length > 1) ctx.later(() => V.fx.floatAt(cells[to], m.caps.length + '× geschlagen', '#6ff3ff'), 200);
        if (wasMan && s.b[to] > 2) ctx.later(() => { V.fx.ringAt(cells[to], '#ffd84f'); V.fx.floatAt(cells[to], 'Dame!', '#ffd84f'); V.sfx.goal(); }, 240);
        const ms = genMoves(s);
        if (!ms.length) { over = true; render(); ctx.end(3 - s.turn, s.b.some(v => sideOf(v) === s.turn) ? 'Keine Züge mehr' : 'Alle Steine geschlagen'); return; }
        if (s.quiet >= 50) { over = true; ctx.end(0, '25 Damenzüge ohne Schlagen'); return; }
        next();
      }
      function next() {
        const n = genMoves(s), must = n[0] && n[0].caps.length;
        ctx.turn(s.turn, ctx.isAI(s.turn) ? null : ((ctx.name(s.turn) === 'Du' ? 'Du bist dran' : ctx.who(s.turn) + ' ist dran') + (must ? ' · <b style="color:var(--cy)">Schlagzwang</b>' : '')));
        if (ctx.isAI(s.turn)) ctx.think(() => {
          const L = ctx.level, ms = genMoves(s);
          const m = Math.random() < [0.3, 0.1, 0, 0][L] ? V.pick(ms) : V.search(G, s, [2, 4, 7, 10][L], [300, 600, 1100, 1900][L]).move;
          animate(m);
        }, 250);
      }
      function animate(m) {
        // show multi-jumps step by step
        let i = 1;
        prefix = [m.path[0]];
        const step = () => {
          if (i < m.path.length - 1) { const from = prefix[prefix.length - 1]; prefix.push(m.path[i++]); V.sfx.move(); const sl = slideTo(from, prefix[prefix.length - 1]); render(); sl(); ctx.later(step, 300); }
          else doMove(m);
        };
        if (m.path.length > 2) { render(); ctx.later(step, 200); } else doMove(m);
      }
      render(); next();
    }
  });
})();
