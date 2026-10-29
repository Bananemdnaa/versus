(function () {
  // Fünf in einer Reihe (Gomoku) on a 13x13 or 15x15 board; five or more in a row wins.
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const cache = {};
  // all windows of five cells for one board size (used by the evaluation)
  function geo(N) {
    if (cache[N]) return cache[N];
    const W = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
      for (const [dr, dc] of DIRS) {
        const rr = r + dr * 4, cc = c + dc * 4;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        W.push([0, 1, 2, 3, 4].map(k => (r + dr * k) * N + c + dc * k));
      }
    return (cache[N] = { W });
  }
  function lineAt(b, N, i) {
    const p = b[i], r0 = Math.floor(i / N), c0 = i % N;
    if (!p) return null;
    for (const [dr, dc] of DIRS) {
      const cells = [i];
      for (const sg of [1, -1]) {
        let r = r0 + dr * sg, c = c0 + dc * sg;
        while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) { cells.push(r * N + c); r += dr * sg; c += dc * sg; }
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }
  // value of putting a stone of p on the empty cell i: runs it would build, with open ends
  const RUN = [0, 1, 12, 160, 2600, 100000];
  function cellScore(b, N, i, p) {
    const r0 = Math.floor(i / N), c0 = i % N; let v = 0, fours = 0, threes = 0;
    for (const [dr, dc] of DIRS) {
      let len = 1, open = 0;
      for (const sg of [1, -1]) {
        let r = r0 + dr * sg, c = c0 + dc * sg;
        while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) { len++; r += dr * sg; c += dc * sg; }
        if (r >= 0 && r < N && c >= 0 && c < N && !b[r * N + c]) open++;
      }
      if (len >= 5) { v += RUN[5]; continue; }
      if (!open) continue;
      let x = RUN[len] * (open === 2 ? 1 : 0.22);
      if (len === 4 && open === 2) x = 30000;
      if (len === 4) fours++; if (len === 3 && open === 2) threes++;
      v += x;
    }
    if (fours >= 2 || (fours && threes)) v += 20000; // double threat
    else if (threes >= 2) v += 6000;
    return v;
  }
  function candidates(s, limit) {
    const N = s.N, b = s.b, me = s.turn, op = 3 - me;
    if (!s.n) return [Math.floor(N * N / 2)];
    const near = new Set();
    for (let i = 0; i < N * N; i++) if (b[i]) {
      const r = Math.floor(i / N), c = i % N;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && !b[rr * N + cc]) near.add(rr * N + cc);
      }
    }
    const sc = [...near].map(i => ({ i, a: cellScore(b, N, i, me), d: cellScore(b, N, i, op) }));
    // a five ends everything: take it, or block the opponent's
    const win = sc.filter(x => x.a >= RUN[5]); if (win.length) return [win[0].i];
    const block = sc.filter(x => x.d >= RUN[5]); if (block.length) return block.map(x => x.i);
    sc.forEach(x => { x.v = x.a * 1.1 + x.d; });
    sc.sort((x, y) => y.v - x.v);
    return sc.slice(0, limit).map(x => x.i);
  }
  function makeG(limit) {
    return {
      moves: s => candidates(s, limit),
      play(s, i) { const b = s.b.slice(); b[i] = s.turn; return { N: s.N, b, turn: 3 - s.turn, last: i, n: s.n + 1 }; },
      over(s, ply) { if (s.last >= 0 && lineAt(s.b, s.N, s.last)) return -(100000 - ply); if (s.n >= s.N * s.N) return 0; return null; },
      eval(s) {
        const me = s.turn, op = 3 - me, b = s.b; let v = 0;
        for (const w of geo(s.N).W) {
          let a = 0, o = 0;
          for (const i of w) { const x = b[i]; if (x === me) a++; else if (x === op) o++; }
          if (a && o) continue;
          if (a) v += [0, 1, 8, 70, 900][a]; else if (o) v -= [0, 1, 9, 90, 2400][o];
        }
        return v;
      }
    };
  }

  V.css(`
  .gmk{--n:15;width:min(var(--bw),620px);aspect-ratio:1;display:grid;grid-template-columns:repeat(var(--n),1fr);padding:calc(var(--bw) / var(--n) / 2.4);background:linear-gradient(145deg,#2a2240,#1b1730);border:1px solid #4a3d73;border-radius:10px;box-shadow:0 0 50px -18px #8f6bff;touch-action:manipulation;cursor:pointer}
  .gmk .pt{position:relative;aspect-ratio:1}
  .gmk .pt::before,.gmk .pt::after{content:'';position:absolute;background:#4d4377;pointer-events:none}
  .gmk .pt::before{left:0;right:0;top:50%;height:1px}
  .gmk .pt::after{top:0;bottom:0;left:50%;width:1px}
  .gmk .pt.l::before{left:50%} .gmk .pt.r::before{right:50%} .gmk .pt.t::after{top:50%} .gmk .pt.b::after{bottom:50%}
  .gmk .pt .sd{position:absolute;left:50%;top:50%;width:18%;height:18%;border-radius:50%;background:#6a5ea0;transform:translate(-50%,-50%)}
  .gmk .st{position:absolute;inset:7%;border-radius:50%;z-index:1;animation:gmin .22s var(--spring)}
  @keyframes gmin{from{transform:scale(.3);opacity:0}}
  .gmk .st.p1{background:radial-gradient(circle at 35% 30%,var(--p1hi),var(--p1) 62%);box-shadow:0 0 8px color-mix(in srgb,var(--p1) 55%,transparent)}
  .gmk .st.p2{background:radial-gradient(circle at 35% 30%,var(--p2hi),var(--p2) 62%);box-shadow:0 0 8px color-mix(in srgb,var(--p2) 50%,transparent)}
  .gmk .st.gh{opacity:.45;animation:none}
  .gmk .st.last::after{content:'';position:absolute;inset:34%;border-radius:50%;background:rgba(8,9,15,.55)}
  .gmk .pt.w .st{box-shadow:0 0 0 2px #fff,0 0 12px rgba(255,255,255,.6);animation:winPulse .9s ease-in-out infinite}
  .gmk.done .pt:not(.w) .st{opacity:.45;transition:opacity .5s}
  .gmk.lock{cursor:default}`);

  V.register({
    id: 'gomoku', name: 'Fünf in einer Reihe', cat: 'Klassiker', order: 3, accent: '#8f6bff',
    short: 'Fünf Steine in eine Linie bringen.',
    desc: 'Setzt abwechselnd Steine auf die Kreuzungen. Wer zuerst fünf in einer Reihe hat, waagerecht, senkrecht oder diagonal, gewinnt.',
    levelInfo: ['Anfänger: blockt deine Dreier oft nicht.', 'Blockt Drohungen, baut aber selten eigene Fallen.', 'Rechnet drei Züge voraus und sieht Doppeldrohungen.', 'Rechnet so tief wie möglich. Offene Dreier musst du sofort blocken.'],
    keys: [['Pfeile', 'Cursor bewegen'], ['Enter', 'Stein setzen']],
    options: [{ id: 'size', label: 'Brett', def: 15, choices: [[13, '13×13'], [15, '15×15']] }],
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="6" fill="#231d38" stroke="#4a3d73" stroke-width="2"/>${[0, 1, 2, 3, 4].map(k => `<path d="M${9 + k * 7.5} 6v36M6 ${9 + k * 7.5}h36" stroke="#4d4377" stroke-width="1"/>`).join('')}${[0, 1, 2, 3].map(k => `<circle cx="${9 + k * 7.5}" cy="${39 - k * 7.5}" r="3.3" fill="#ff4fd8"/>`).join('')}<circle cx="16.5" cy="16.5" r="3.3" fill="#ffd84f"/><circle cx="31.5" cy="31.5" r="3.3" fill="#ffd84f"/><circle cx="24" cy="9" r="3.3" fill="#ffd84f"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Ihr setzt abwechselnd einen Stein auf eine <b>freie Kreuzung</b>. Wer zuerst <b>fünf eigene Steine</b> lückenlos in einer Reihe hat, gewinnt. Waagerecht, senkrecht und diagonal zählen.', demo: V.mini(['.......', '.b...A.', '..b.A..', '...A...', '..Ab...', '.A.....'], {}, { w: 240 }) },
      { t: 'Offene Dreier', d: 'Drei Steine in einer Reihe mit <b>freien Enden</b> sind gefährlich: Daraus wird im nächsten Zug ein offener Vierer, und den kann man nicht mehr an beiden Seiten blocken. Blocke offene Dreier sofort.', demo: V.mini(['.......', '.*aaa*.', '.......', '..bb...'], {}, { w: 240 }) },
      { t: 'Doppeldrohung', d: 'Der stärkste Zug baut <b>zwei Drohungen</b> auf einmal, zum Beispiel einen Vierer und einen offenen Dreier. Der Gegner kann nur eine davon blocken.' },
      { t: 'Am Handy', d: 'Das Brett ist eng. Der erste Tipp zeigt deinen Stein als <b>Vorschau</b>, ein zweiter Tipp auf dieselbe Stelle setzt ihn. Am PC reicht ein Klick.' },
      { t: 'Remis', d: 'Ist das Brett voll und niemand hat fünf in einer Reihe, endet die Partie unentschieden. Das passiert so gut wie nie.' }
    ],
    start(ctx) {
      const N = [13, 15].includes(+ctx.opts.size) ? +ctx.opts.size : 15;
      let s = { N, b: Array(N * N).fill(0), turn: 1, last: -1, n: 0 }, over = false, ghost = -1;
      const board = V.el('div', 'gmk'); board.style.setProperty('--n', N);
      const mid = Math.floor(N / 2), star = new Set([mid * N + mid, 3 * N + 3, 3 * N + N - 4, (N - 4) * N + 3, (N - 4) * N + N - 4]);
      for (let i = 0; i < N * N; i++) {
        const r = Math.floor(i / N), c = i % N;
        const pt = V.el('div', 'pt' + (c === 0 ? ' l' : '') + (c === N - 1 ? ' r' : '') + (r === 0 ? ' t' : '') + (r === N - 1 ? ' b' : ''));
        pt.dataset.i = i; if (star.has(i)) pt.appendChild(V.el('i', 'sd'));
        board.appendChild(pt);
      }
      ctx.stage.appendChild(board);
      const pts = [...board.children];
      const human = () => !over && !ctx.isAI(s.turn);
      // touch: first tap previews the stone, a second tap on the same point places it
      function showGhost(i) {
        const old = board.querySelector('.st.gh'); if (old) old.remove();
        ghost = i;
        if (i >= 0 && human() && !s.b[i]) pts[i].appendChild(V.el('i', 'st gh p' + s.turn));
      }
      board.addEventListener('click', e => {
        const t = e.target.closest('.pt'); if (!t || !human()) return;
        const i = +t.dataset.i; if (s.b[i]) return;
        if (V.coarse && ghost !== i) { showGhost(i); V.sfx.tick(); return; }
        place(i);
      });
      if (!V.coarse) {
        board.addEventListener('mousemove', e => { const t = e.target.closest('.pt'); if (t && +t.dataset.i !== ghost) showGhost(+t.dataset.i); });
        board.addEventListener('mouseleave', () => showGhost(-1));
      }
      ctx.nav(() => pts.filter((p, i) => !s.b[i]), { pad: 0, round: true, start: it => it.indexOf(pts[mid * N + mid]) >= 0 ? it.indexOf(pts[mid * N + mid]) : 0 });
      function place(i) {
        if (over || s.b[i]) return;
        showGhost(-1);
        ctx.moved(s.turn, i);
        const who = s.turn;
        s = makeG(10).play(s, i);
        board.querySelectorAll('.st.last').forEach(x => x.classList.remove('last'));
        const st = V.el('i', 'st last p' + who); pts[i].appendChild(st);
        V.kit.placed(pts[i], V.hex(who), ctx.isAI(who));
        const line = lineAt(s.b, N, i);
        if (line) {
          over = true; board.classList.add('lock', 'done');
          line.forEach((k, n) => ctx.later(() => { pts[k].classList.add('w'); V.fx.burstAt(pts[k], '#ffffff', 6, 40); }, n * 80));
          return ctx.end(who);
        }
        if (s.n >= N * N) { over = true; return ctx.end(0); }
        next();
      }
      function next() {
        ctx.turn(s.turn);
        board.classList.toggle('lock', ctx.isAI(s.turn));
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          think: () => {
            const L = ctx.level;
            // Leicht: own heuristics with plenty of noise. Mittel: looks one reply ahead. Schwer: 3 plies. Profi: as deep as time allows.
            let r;
            if (L === 0) {
              const ms = candidates(s, 8), b = s.b;
              r = Math.random() < 0.3 ? { move: V.pick(ms), score: 0 } : V.pickSoft(ms.map(m => ({ m, v: cellScore(b, N, m, s.turn) * 0.002 + cellScore(b, N, m, 3 - s.turn) * 0.0008 })), 6);
            }
            else if (L === 1) r = V.pickSoft(V.searchAll(makeG(8), s, 2, 700), 60);
            else r = V.search(makeG(L === 2 ? 9 : 12), s, L === 2 ? 3 : 8, L === 2 ? 900 : 2200);
            return { move: r.move, mood: V.mood(r.score || 0, 900) };
          },
          targets: i => [pts[i]],
          decoys: () => candidates(s, 6).map(i => pts[i]),
          apply: place,
          decode: i => (Number.isInteger(i) && i >= 0 && i < N * N && !s.b[i] ? i : null),
          say: i => String.fromCharCode(65 + (i % N)) + (N - Math.floor(i / N))
        });
      }
      next();
    }
  });
})();
