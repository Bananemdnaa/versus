(function () {
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function winner(b) {
    for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { w: b[l[0]], line: l };
    return b.every(x => x) ? { w: 0 } : null;
  }
  const memo = new Map();
  // score from perspective of `turn`
  function minimax(b, turn) {
    const key = b.join('') + turn;
    if (memo.has(key)) return memo.get(key);
    const r = winner(b);
    let res;
    if (r) res = { s: r.w === 0 ? 0 : (r.w === turn ? 10 : -10), m: -1 };
    else {
      res = { s: -99, m: -1 };
      for (let i = 0; i < 9; i++) if (!b[i]) {
        b[i] = turn; const v = -minimax(b, 3 - turn).s * 0.9; b[i] = 0;
        if (v > res.s) res = { s: v, m: i };
      }
    }
    memo.set(key, res);
    return res;
  }

  // chaos "Verschwinden": everybody keeps at most three marks; placing a fourth wipes out the oldest one first.
  // The board never fills up, so the search looks a few moves ahead instead of to the end. q: the marks in order per side.
  function vanishPlay(b, q, p, i) {
    const gone = q[p].length >= 3 ? q[p][0] : -1;
    if (gone >= 0) { b[gone] = 0; q[p] = q[p].slice(1); }
    b[i] = p; q[p] = q[p].concat(i);
    return gone;
  }
  function vanishSearch(b, q, turn, depth, ply) {
    let best = { s: -1e9, m: -1 };
    for (let i = 0; i < 9; i++) if (!b[i]) {
      const b2 = b.slice(), q2 = { 1: q[1], 2: q[2] };
      vanishPlay(b2, q2, turn, i);
      const w = winner(b2);
      const s = w && w.w === turn ? 100 - ply : depth > 1 ? -vanishSearch(b2, q2, 3 - turn, depth - 1, ply + 1).s * 0.95 : 0;
      if (s > best.s || (s === best.s && Math.random() < 0.35)) best = { s, m: i };
    }
    return best;
  }

  V.css(`
  .ttt{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:10px;width:min(var(--bw),560px);aspect-ratio:1}
  .ttt button{position:relative;min-width:0;min-height:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;display:grid;place-items:center;transition:background .15s,border-color .15s,transform .12s}
  .ttt button:not(:disabled):hover{border-color:var(--line2);background:var(--panel2)}
  .ttt button:not(:disabled):active{transform:scale(.94)}
  .ttt button.w{border-color:var(--cy);background:#13303a;animation:tttw .6s var(--spring)}
  @keyframes tttw{40%{transform:scale(1.08)}}
  .ttt.dim button:not(.w){opacity:.45;transition:opacity .4s}
  .ttt svg{width:62%;height:62%;overflow:visible}
  .ttt .mx path{stroke:var(--p1);stroke-width:11;stroke-linecap:round;fill:none;stroke-dasharray:80;stroke-dashoffset:80;animation:drawx .16s ease-out forwards;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--p1) 60%,transparent))}
  .ttt .mx path+path{animation-delay:.16s}
  .ttt svg.mx,.ttt svg.mo{animation:popIn .4s var(--spring)}
  .ttt .mo circle{stroke:var(--p2);stroke-width:11;fill:none;stroke-dasharray:170;stroke-dashoffset:170;animation:drawx .3s ease-out forwards;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--p2) 55%,transparent))}
  .ttt .strike{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .ttt .strike{filter:drop-shadow(0 0 10px #fff)}
  .ttt .strike line{stroke:#fff;stroke-width:.09;stroke-linecap:round;stroke-dasharray:5;stroke-dashoffset:5;animation:drawx .35s .1s ease-out forwards}
  @keyframes drawx{to{stroke-dashoffset:0}}
  .ttt button.old svg{opacity:.32;transition:opacity .3s}
  .ttt button.old::after{content:'';position:absolute;inset:8px;border-radius:10px;border:2px dashed rgba(255,255,255,.18)}
  .ttt button.gone svg{animation:tttGone .35s ease-in forwards}
  @keyframes tttGone{to{opacity:0;transform:scale(.4) rotate(-20deg)}}`);

  const X = '<svg class="mx" viewBox="0 0 60 60"><path d="M8 8L52 52"/><path d="M52 8L8 52"/></svg>';
  const O = '<svg class="mo" viewBox="0 0 60 60"><circle cx="30" cy="30" r="24"/></svg>';
  const NUMPAD = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };

  V.register({
    id: 'ttt', name: 'Tic Tac Toe', cat: 'Klassiker', order: 3, accent: 'var(--pink)',
    short: 'Drei in einer Reihe auf 3×3.',
    desc: 'Der Klassiker in einer Minute: Wer zuerst drei Zeichen in eine Reihe bringt, gewinnt.',
    sides: { 1: 'X', 2: 'O' },
    options: [
      { id: 'chaos', label: 'Chaos-Regel', group: 'rules', modes: ['ai', 'local'], desc: 'Verschwinden: Jeder hat höchstens drei Zeichen. Setzt du ein viertes, verschwindet dein ältestes (es ist blass markiert). Remis gibt es erst nach 40 Zügen.', short: v => +v ? 'Verschwinden' : '', def: 0, choices: [[0, 'Aus'], [1, 'Verschwinden']] }
    ],
    keys: [['1–9', 'Feld setzen, angeordnet wie der Ziffernblock'], ['Pfeile', 'Cursor bewegen'], ['Enter', 'Setzen']],
    levelInfo: ['Blutiger Anfänger: setzt oft irgendwo hin und übersieht deine Drohungen meistens.', 'Nimmt gern Mitte und Ecken, blockt aber nicht immer.', 'Gewinnt und blockt immer, macht aber ab und zu einen harmlosen Nebenzug.', 'Perfekt und gemein: wählt immer den Zug, bei dem du am leichtesten danebengreifst.'],
    icon: `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round"><path d="M17 4v40M31 4v40M4 17h40M4 31h40" stroke="#3a4070" stroke-width="3"/><path d="M6 6l7 7M13 6l-7 7" stroke="#ff4fd8" stroke-width="3.4"/><circle cx="24" cy="24" r="4" stroke="#ffd84f" stroke-width="3.4"/><path d="M35 35l7 7M42 35l-7 7" stroke="#ff4fd8" stroke-width="3.4"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Zwei Spieler setzen abwechselnd ihr Zeichen auf ein Feld des 3×3-Bretts: <b>X</b> fängt an, dann <b>O</b>. Wer zuerst drei eigene Zeichen in eine Reihe bringt, gewinnt.', demo: V.mini(['x.o', '.x.', 'o..']) },
      { t: 'Drei in einer Reihe', d: 'Die Reihe darf waagerecht, senkrecht oder diagonal sein. Hier hat X die Diagonale geschafft.', demo: V.mini(['Xo.', 'oX.', '..X']) },
      { t: 'Blocken', d: 'Hat der Gegner schon zwei in einer Reihe, setz dein Zeichen in die Lücke. Sonst gewinnt er im nächsten Zug.', demo: V.mini(['oo*', '.x.', 'x..']) },
      { t: 'Gabel stellen', d: 'Der stärkste Trick: Erzeuge zwei Drohungen auf einmal. Der Gegner kann nur eine blocken. Die Mitte und die Ecken sind dafür die besten Felder.', demo: V.mini(['x.*', '.o.', 'x.x'], { '*': { c: 'tg' } }) },
      { t: 'Unentschieden', d: 'Ist das Brett voll und niemand hat drei in einer Reihe, endet es remis. Wer fehlerfrei spielt, verliert nie. Die Profi-KI spielt genau so. Am PC kannst du mit den Zifferntasten 1 bis 9 setzen.' }
    ],
    start(ctx) {
      const b = Array(9).fill(0);
      let turn = 1, over = false, plies = 0;
      const vanish = +(ctx.opts && ctx.opts.chaos) === 1 && ['ai', 'local', 'review'].includes(ctx.mode);
      let q = { 1: [], 2: [] };
      const el = V.el('div', 'ttt');
      for (let i = 0; i < 9; i++) { const c = V.el('button'); c.setAttribute('aria-label', 'Feld ' + (i + 1)); c.onclick = () => { if (!ctx.isAI(turn)) move(i); }; el.appendChild(c); }
      ctx.stage.appendChild(el);
      const cells = [...el.children].slice(0, 9);
      ctx.nav(() => cells);
      ctx.keys(e => { if (NUMPAD[e.key] !== undefined && !ctx.isAI(turn)) { move(NUMPAD[e.key]); return true; } return false; });
      function move(i) {
        if (over || b[i]) return;
        ctx.moved(turn, i);
        if (vanish) {
          const gone = vanishPlay(b, q, turn, i);
          if (gone >= 0) {
            const gc = cells[gone]; gc.classList.remove('old'); gc.classList.add('gone'); gc.disabled = false;
            ctx.later(() => { if (!b[gone]) { gc.innerHTML = ''; gc.classList.remove('gone'); } }, 340);
          }
        } else b[i] = turn;
        plies++;
        cells[i].classList.remove('gone', 'old');
        cells[i].innerHTML = turn === 1 ? X : O; cells[i].disabled = true;
        V.kit.placed(cells[i], V.hex(turn), ctx.isAI(turn)); V.fx.burstAt(cells[i], V.hex(turn), 6, 40);
        const r = winner(b);
        if (r) {
          over = true;
          cells.forEach(c => c.disabled = true);
          if (r.line) {
            const [a, , c] = r.line, pa = [a % 3 + 0.5, ((a / 3) | 0) + 0.5], pc = [c % 3 + 0.5, ((c / 3) | 0) + 0.5];
            const dx = (pc[0] - pa[0]) * 0.18, dy = (pc[1] - pa[1]) * 0.18;
            el.insertAdjacentHTML('beforeend', `<svg class="strike" viewBox="0 0 3 3"><line x1="${pa[0] - dx}" y1="${pa[1] - dy}" x2="${pc[0] + dx}" y2="${pc[1] + dy}" pathLength="5"/></svg>`);
            r.line.forEach((k, n) => ctx.later(() => { cells[k].classList.add('w'); V.fx.burstAt(cells[k], '#6ff3ff', 8, 60); }, 120 + n * 110));
            el.classList.add('dim');
          }
          ctx.end(r.w);
          return;
        }
        // "Verschwinden" has no full board: after 40 moves it is a draw
        if (vanish && plies >= 40) { over = true; cells.forEach(c => c.disabled = true); ctx.end(0, 'Nach 40 Zügen'); return; }
        turn = 3 - turn;
        // the mark that goes next time is pale
        if (vanish) cells.forEach((c, k) => c.classList.toggle('old', q[turn].length >= 3 && q[turn][0] === k));
        next();
      }
      // Leicht: takes wins and blocks most of the time, otherwise plays like a beginner (centre and corners).
      // Mittel: never misses a win, rarely misses a block. Schwer: optimal, but now and then a safe second-best move.
      // Profi: optimal and, among equal moves, picks the one that sets the most traps.
      // "Verschwinden": Leicht looks one move ahead and often not even that, Mittel two, Schwer four, Profi five
      function vanishMove() {
        const L = ctx.level, free = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
        if (L === 0 && Math.random() < 0.45) return { m: V.pick(free), s: 0 };
        const r = vanishSearch(b, q, turn, [1, 2, 4, 5][L], 0);
        return r.m >= 0 ? r : { m: V.pick(free), s: 0 };
      }
      function aiMove() {
        if (vanish) return vanishMove().m;
        const L = ctx.level, me = turn, op = 3 - turn;
        const free = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
        const winsAt = (p, i) => { b[i] = p; const w = winner(b); b[i] = 0; return w && w.w === p; };
        const win = free.filter(i => winsAt(me, i)), block = free.filter(i => winsAt(op, i));
        const vals = free.map(i => { b[i] = me; const v = -minimax(b, op).s; b[i] = 0; return { i, v }; });
        const best = Math.max(...vals.map(x => x.v));
        if (L === 0) {
          if (win.length && Math.random() < 0.5) return V.pick(win);
          if (block.length && Math.random() < 0.3) return V.pick(block);
          return V.pick(free);
        }
        if (L === 1) {
          if (win.length && Math.random() < 0.9) return V.pick(win);
          if (block.length && Math.random() < 0.75) return V.pick(block);
          const pref = free.filter(i => i === 4 || [0, 2, 6, 8].includes(i));
          return V.pick(pref.length && Math.random() < 0.6 ? pref : free);
        }
        const top = vals.filter(x => x.v >= best - 0.01);
        if (L === 2) {
          if (win.length) return V.pick(win);
          if (block.length) return V.pick(block);
          if (Math.random() < 0.25) { const ok = vals.filter(x => x.v > -5); if (ok.length) return V.pick(ok).i; }
          return V.pick(top).i;
        }
        top.forEach(x => {
          b[x.i] = me; x.t = 0;
          for (const j of free) if (j !== x.i) { b[j] = op; if (minimax(b, me).s > 5) x.t++; b[j] = 0; }
          b[x.i] = 0;
        });
        const mt = Math.max(...top.map(x => x.t));
        return V.pick(top.filter(x => x.t === mt)).i;
      }
      const NAMES = ['oben links', 'oben Mitte', 'oben rechts', 'Mitte links', 'Mitte', 'Mitte rechts', 'unten links', 'unten Mitte', 'unten rechts'];
      function next() {
        ctx.turn(turn);
        if (ctx.isAI(turn)) ctx.aiTurn({
          think: () => {
            if (vanish) { const r = vanishMove(); return { move: r.m, mood: Math.max(-1, Math.min(1, r.s / 90)) }; }
            const m = aiMove(); b[m] = turn; const v = -minimax(b, 3 - turn).s; b[m] = 0; return { move: m, mood: v / 9 };
          },
          targets: m => [cells[m]],
          decoys: () => cells.filter((c, i) => !b[i]),
          apply: move,
          decode: r => (Number.isInteger(r) && r >= 0 && r < 9 && !b[r] ? r : null),
          say: m => NAMES[m]
        });
      }
      next();
    }
  });
})();
