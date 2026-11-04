(function () {
  // Board: 64 squares, index = row*8 + col, row 0 = rank 8. Uppercase = white, lowercase = black.
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };
  const isW = p => p && p === p.toUpperCase();
  const side = p => p ? (isW(p) ? 'w' : 'b') : null;
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function initial() {
    const rows = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
    const b = []; rows.forEach(r => [...r].forEach(ch => b.push(ch === '.' ? '' : ch)));
    return { b, turn: 'w', cs: { K: 1, Q: 1, k: 1, q: 1 }, ep: -1, half: 0, kings: { w: 60, b: 4 } };
  }
  function attacked(P, sq, by) {
    const b = P.b, r = sq >> 3, c = sq & 7;
    const pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p';
    if (pr >= 0 && pr < 8) { if (c > 0 && b[pr * 8 + c - 1] === pawn) return true; if (c < 7 && b[pr * 8 + c + 1] === pawn) return true; }
    const kn = by === 'w' ? 'N' : 'n', kg = by === 'w' ? 'K' : 'k';
    for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === kn) return true; }
    for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === kg) return true; }
    const bq = by === 'w' ? 'BQ' : 'bq', rq = by === 'w' ? 'RQ' : 'rq';
    for (const [dirs, set] of [[DIAG, bq], [ORTH, rq]]) for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (set.includes(p)) return true; break; } rr += dr; cc += dc; }
    }
    return false;
  }
  const inCheck = (P, s) => attacked(P, P.kings[s], s === 'w' ? 'b' : 'w');

  function pseudo(P, capsOnly) {
    const b = P.b, me = P.turn, op = me === 'w' ? 'b' : 'w', out = [];
    const add = (f, t, extra) => out.push(Object.assign({ f, t, cap: b[t] }, extra));
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq]; if (!p || side(p) !== me) continue;
      const t = p.toLowerCase(), r = sq >> 3, c = sq & 7;
      if (t === 'p') {
        const dir = me === 'w' ? -1 : 1, start = me === 'w' ? 6 : 1, last = me === 'w' ? 0 : 7, r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        const pushP = (to, ex) => { if ((to >> 3) === last) for (const pr of 'qrbn') add(sq, to, Object.assign({ promo: pr }, ex)); else add(sq, to, ex); };
        if (!capsOnly && !b[r1 * 8 + c]) { pushP(r1 * 8 + c); if (r === start && !b[(r + 2 * dir) * 8 + c]) add(sq, (r + 2 * dir) * 8 + c, { dbl: 1 }); }
        if (capsOnly && !b[r1 * 8 + c] && r1 === last) pushP(r1 * 8 + c);
        for (const dc of [-1, 1]) {
          const cc = c + dc; if (cc < 0 || cc > 7) continue;
          const to = r1 * 8 + cc;
          if (b[to] && side(b[to]) === op) pushP(to);
          else if (to === P.ep) add(sq, to, { epc: 1, cap: me === 'w' ? 'p' : 'P' });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of (t === 'n' ? KN : KG)) {
          const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const to = rr * 8 + cc; if (b[to] && side(b[to]) === me) continue;
          if (capsOnly && !b[to]) continue;
          add(sq, to);
        }
        if (t === 'k' && !capsOnly) {
          const row = me === 'w' ? 7 : 0, K = me === 'w' ? 'K' : 'k', Q = me === 'w' ? 'Q' : 'q';
          if (sq === row * 8 + 4 && !attacked(P, sq, op)) {
            if (P.cs[K] && !b[row * 8 + 5] && !b[row * 8 + 6] && b[row * 8 + 7] === (me === 'w' ? 'R' : 'r') && !attacked(P, row * 8 + 5, op) && !attacked(P, row * 8 + 6, op)) add(sq, row * 8 + 6, { castle: 'k' });
            if (P.cs[Q] && !b[row * 8 + 3] && !b[row * 8 + 2] && !b[row * 8 + 1] && b[row * 8] === (me === 'w' ? 'R' : 'r') && !attacked(P, row * 8 + 3, op) && !attacked(P, row * 8 + 2, op)) add(sq, row * 8 + 2, { castle: 'q' });
          }
        }
      } else {
        const dirs = t === 'b' ? DIAG : t === 'r' ? ORTH : DIAG.concat(ORTH);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const to = rr * 8 + cc;
            if (b[to]) { if (side(b[to]) === op) add(sq, to); break; }
            if (!capsOnly) add(sq, to);
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }
  function make(P, m) {
    const b = P.b, me = P.turn, p = b[m.f];
    const u = { m, cs: Object.assign({}, P.cs), ep: P.ep, half: P.half, cap: b[m.t], k: P.kings[me] };
    b[m.t] = m.promo ? (me === 'w' ? m.promo.toUpperCase() : m.promo) : p; b[m.f] = '';
    if (m.epc) { const cs = m.t + (me === 'w' ? 8 : -8); u.epSq = cs; b[cs] = ''; }
    if (m.castle) { const row = me === 'w' ? 7 : 0; if (m.castle === 'k') { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = ''; } else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = ''; } }
    if (p.toLowerCase() === 'k') { P.kings[me] = m.t; if (me === 'w') { P.cs.K = 0; P.cs.Q = 0; } else { P.cs.k = 0; P.cs.q = 0; } }
    for (const sq of [m.f, m.t]) { if (sq === 63) P.cs.K = 0; if (sq === 56) P.cs.Q = 0; if (sq === 7) P.cs.k = 0; if (sq === 0) P.cs.q = 0; }
    P.ep = m.dbl ? (m.f + m.t) / 2 : -1;
    P.half = (p.toLowerCase() === 'p' || u.cap) ? 0 : P.half + 1;
    P.turn = me === 'w' ? 'b' : 'w';
    return u;
  }
  function unmake(P, u) {
    const m = u.m, b = P.b; P.turn = P.turn === 'w' ? 'b' : 'w'; const me = P.turn;
    b[m.f] = m.promo ? (me === 'w' ? 'P' : 'p') : b[m.t]; b[m.t] = u.cap;
    if (m.epc) b[u.epSq] = me === 'w' ? 'p' : 'P';
    if (m.castle) { const row = me === 'w' ? 7 : 0; if (m.castle === 'k') { b[row * 8 + 7] = b[row * 8 + 5]; b[row * 8 + 5] = ''; } else { b[row * 8] = b[row * 8 + 3]; b[row * 8 + 3] = ''; } }
    P.cs = u.cs; P.ep = u.ep; P.half = u.half; P.kings[me] = u.k;
  }
  function legal(P, capsOnly) {
    const me = P.turn, out = [];
    for (const m of pseudo(P, capsOnly)) { const u = make(P, m); if (!inCheck(P, me)) out.push(m); unmake(P, u); }
    return out;
  }
  function evaluate(P) {
    let s = 0, mat = 0;
    for (const p of P.b) if (p && p.toLowerCase() !== 'p' && p.toLowerCase() !== 'k') mat += VAL[p.toLowerCase()];
    const end = mat < 2600;
    for (let i = 0; i < 64; i++) {
      const p = P.b[i]; if (!p) continue;
      const t = p.toLowerCase(), w = isW(p);
      const tab = t === 'k' && end ? PST.ke : PST[t];
      const v = VAL[t] + tab[w ? i : (7 - (i >> 3)) * 8 + (i & 7)];
      s += w ? v : -v;
    }
    return P.turn === 'w' ? s : -s;
  }
  const mvv = m => (m.cap ? VAL[m.cap.toLowerCase()] * 10 - VAL[(m.promo || 'p')] / 10 : 0) + (m.promo ? 800 : 0);

  function think(P, depth, timeMs, noise) {
    const deadline = performance.now() + timeMs;
    let stop = false, nodes = 0;
    function qs(a, b, d) {
      const sp = evaluate(P);
      if (sp >= b) return sp;
      if (sp > a) a = sp;
      if (d > 6) return sp;
      const ms = legal(P, true).sort((x, y) => mvv(y) - mvv(x));
      for (const m of ms) {
        const u = make(P, m); const v = -qs(-b, -a, d + 1); unmake(P, u);
        if (v >= b) return v; if (v > a) a = v;
      }
      return a;
    }
    function nm(d, a, b, ply) {
      if ((++nodes & 1023) === 0 && performance.now() > deadline) stop = true;
      if (stop) return 0;
      if (P.half >= 100) return 0;
      const ms = legal(P, false);
      if (!ms.length) return inCheck(P, P.turn) ? -100000 + ply : 0;
      if (d <= 0) return qs(a, b, 0);
      ms.sort((x, y) => mvv(y) - mvv(x));
      let best = -1e9;
      for (const m of ms) {
        const u = make(P, m); const v = -nm(d - 1, -b, -a, ply + 1); unmake(P, u);
        if (stop) return 0;
        if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
      }
      return best;
    }
    let root = V.shuffle(legal(P, false)).sort((x, y) => mvv(y) - mvv(x));
    let best = root[0], score = 0;
    if (noise) {
      // weak levels: exact score for every move at a shallow depth, then a human-like soft choice
      const scored = root.map(m => { const u = make(P, m); const v = -nm(depth - 1, -1e9, 1e9, 1); unmake(P, u); return { m, v }; });
      stop = false;
      const r = V.pickSoft(scored, noise);
      return { move: r.move, score: r.score };
    }
    for (let d = 1; d <= depth; d++) {
      let a = -1e9, bm = null;
      for (const m of root) {
        const u = make(P, m); const v = -nm(d - 1, -1e9, -a, 1); unmake(P, u);
        if (stop) break;
        if (v > a) { a = v; bm = m; }
      }
      if (bm) { best = bm; score = a; root = [bm, ...root.filter(x => x !== bm)]; }
      if (stop || a > 90000) break;
    }
    return { move: best, score };
  }

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const NAME = { q: 'Dame', r: 'Turm', b: 'Läufer', n: 'Springer' };
  const g = p => GLYPH[p.toLowerCase()] + '︎';
  // Pieces: the "cburnett" set by Colin M.L. Burnett (CC BY-SA 3.0, via lichess.org), see rechtliches.html
  const PSVG = {
    b: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#ececec" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>',
    k: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.6V6"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M11.5 37a22.3 22.3 0 0 0 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z"/><path stroke-linejoin="miter" d="M20 8h5"/><path stroke="#ececec" d="M32 29.5s8.5-4 6-9.7C34.1 14 25 18 22.5 24.6v2.1-2.1C20 18 9.9 14 7 19.9c-2.5 5.6 4.8 9 4.8 9"/><path stroke="#ececec" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
    n: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"/><path fill="#ececec" stroke="#ececec" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5"/><path fill="#ececec" stroke="none" d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34s-5.79-6.64-9.19-7.16z"/></g></svg>',
    p: '<svg viewBox="0 0 45 45" aria-hidden="true"><path stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z"/></svg>',
    q: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke-linecap="butt" d="M11 38.5a35 35 1 0 0 23 0"/><path fill="none" stroke="#ececec" d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0"/></g></svg>',
    r: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9zm3.5-7 1.5-2.5h17l1.5 2.5zm-.5 4v-4h21v4z"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13z"/><path stroke-linecap="butt" d="M14 16.5 11 14h23l-3 2.5zM11 14V9h4v2h5V9h5v2h5V9h4v5z"/><path fill="none" stroke="#ececec" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23"/></g></svg>',
    B: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>',
    K: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
    N: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5"/></g></svg>',
    P: '<svg viewBox="0 0 45 45" aria-hidden="true"><path fill="#fff" stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>',
    Q: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0m16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0M16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>',
    R: '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9zm3-3v-4h21v4zm-1-22V9h4v2h5V9h5v2h5V9h4v5"/><path d="m34 14-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="m31 29.5 1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>'
  };
  const pc = p => PSVG[p] || '';
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sqn = q => 'abcdefgh'[q & 7] + (8 - (q >> 3));
  const clone = P => ({ b: P.b.slice(), turn: P.turn, cs: Object.assign({}, P.cs), ep: P.ep, half: P.half, kings: Object.assign({}, P.kings) });

  // ---------- notation: SAN with English letters inside, German letters on screen (K D T L S) ----------
  function san(P, m, list) {
    const p = P.b[m.f], t = p.toLowerCase();
    let s;
    if (m.castle) s = m.castle === 'k' ? 'O-O' : 'O-O-O';
    else if (t === 'p') s = (m.cap ? 'abcdefgh'[m.f & 7] + 'x' : '') + sqn(m.t) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    else {
      const others = list.filter(x => x.f !== m.f && x.t === m.t && P.b[x.f] === p);
      let dis = '';
      if (others.length) {
        const sameF = others.some(x => (x.f & 7) === (m.f & 7)), sameR = others.some(x => (x.f >> 3) === (m.f >> 3));
        dis = !sameF ? 'abcdefgh'[m.f & 7] : !sameR ? String(8 - (m.f >> 3)) : sqn(m.f);
      }
      s = t.toUpperCase() + dis + (m.cap ? 'x' : '') + sqn(m.t);
    }
    const u = make(P, m), chk = inCheck(P, P.turn), mate = chk && !legal(P).length; unmake(P, u);
    return s + (mate ? '#' : chk ? '+' : '');
  }
  const DE_L = { N: 'S', B: 'L', R: 'T', Q: 'D' };
  const show = s => (V.lang === 'en' ? s : s.replace(/[NBRQ]/g, c => DE_L[c]));

  // ---------- openings: the longest known start of the game gives the name ----------
  const BOOK = [
    ['e4', 'Königsbauernspiel'], ['d4', 'Damenbauernspiel'], ['c4', 'Englische Eröffnung'], ['Nf3', 'Réti-Eröffnung'], ['f4', 'Bird-Eröffnung'],
    ['e4 e5', 'Offene Partie'], ['e4 e5 Nf3 Nc6', 'Königsspringerspiel'], ['e4 e5 Nf3 Nc6 Bc4', 'Italienische Partie'], ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Italienisch: Giuoco Piano'],
    ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'Zweispringerspiel im Nachzug'], ['e4 e5 Nf3 Nc6 Bb5', 'Spanische Partie'], ['e4 e5 Nf3 Nc6 Bb5 a6', 'Spanisch: Morphy-Verteidigung'],
    ['e4 e5 Nf3 Nc6 d4', 'Schottische Partie'], ['e4 e5 Nf3 Nc6 Nc3', 'Vierspringerspiel'], ['e4 e5 Nf3 Nf6', 'Russische Verteidigung'], ['e4 e5 Nf3 d6', 'Philidor-Verteidigung'],
    ['e4 e5 f4', 'Königsgambit'], ['e4 e5 Nc3', 'Wiener Partie'], ['e4 e5 Bc4', 'Läuferspiel'], ['e4 e5 Qh5', 'Damenangriff'],
    ['e4 c5', 'Sizilianische Verteidigung'], ['e4 c5 Nf3 d6', 'Sizilianisch: Hauptvariante'], ['e4 c5 Nf3 Nc6', 'Sizilianisch: Klassisch'], ['e4 c5 Nf3 e6', 'Sizilianisch: Französische Variante'],
    ['e4 c5 Nc3', 'Sizilianisch: Geschlossen'], ['e4 c5 c3', 'Sizilianisch: Alapin'], ['e4 e6', 'Französische Verteidigung'], ['e4 e6 d4 d5', 'Französisch: Hauptvariante'],
    ['e4 c6', 'Caro-Kann-Verteidigung'], ['e4 d5', 'Skandinavische Verteidigung'], ['e4 Nf6', 'Aljechin-Verteidigung'], ['e4 d6', 'Pirc-Verteidigung'], ['e4 g6', 'Moderne Verteidigung'],
    ['e4 Nc6', 'Nimzowitsch-Verteidigung'], ['d4 d5', 'Geschlossene Partie'], ['d4 d5 c4', 'Damengambit'], ['d4 d5 c4 e6', 'Abgelehntes Damengambit'], ['d4 d5 c4 dxc4', 'Angenommenes Damengambit'],
    ['d4 d5 c4 c6', 'Slawische Verteidigung'], ['d4 d5 Bf4', 'Londoner System'], ['d4 Nf6 Bf4', 'Londoner System'], ['d4 d5 Nf3 Nf6 Bf4', 'Londoner System'], ['d4 Nf6', 'Indische Verteidigung'],
    ['d4 Nf6 c4 g6', 'Königsindische Verteidigung'], ['d4 Nf6 c4 g6 Nc3 d5', 'Grünfeld-Indisch'], ['d4 Nf6 c4 e6', 'Indisch: Hauptvariante'], ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzowitsch-Indische Verteidigung'],
    ['d4 Nf6 c4 e6 Nf3 b6', 'Damenindische Verteidigung'], ['d4 Nf6 c4 c5', 'Benoni-Verteidigung'], ['d4 f5', 'Holländische Verteidigung'], ['c4 e5', 'Englisch: Umgekehrtes Sizilianisch'], ['Nf3 d5', 'Réti-Eröffnung']
  ].map(([s, n]) => [s.split(' '), n]);
  function opening(list) {
    let best = null;
    for (const [seq, n] of BOOK) if (seq.length <= list.length && seq.every((x, k) => list[k] === x) && (!best || seq.length >= best[0])) best = [seq.length, n];
    return best ? best[1] : '';
  }

  // ---------- game review: every position searched a few plies deep, every move rated by how much it lost ----------
  // win chance from the centipawns (like the common accuracy formulas), move accuracy from the lost win chance
  const winP = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  const accOf = d => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * d) - 3.1669));
  // the move kinds of a game review (like the big chess sites); "excellent" shows a thumbs-up-like mark
  const KIND = [
    ['brill', '!!', 'Brillant'], ['great', '!', 'Großartiger Zug'], ['best', '★', 'Bester Zug'], ['exc', '👍', 'Exzellent'], ['good', '✓', 'Gut'],
    ['book', '📖', 'Buchzug'], ['inacc', '?!', 'Ungenauigkeit'], ['mist', '?', 'Fehler'], ['miss', '✕', 'Verpasst'], ['blun', '??', 'Patzer']
  ];
  function rateMove(d, isBest) { return isBest || d <= 1 ? 'best' : d <= 3 ? 'exc' : d <= 7 ? 'good' : d <= 14 ? 'inacc' : d <= 25 ? 'mist' : 'blun'; }
  // positions: the game from the start; cb(progress) while working; resolves with ratings per move
  // ---------- Stockfish (js/vendor/stockfish, GPLv3) for the review: loaded only when a review starts ----------
  const fen = (P, ply) => {
    const rows = [];
    for (let r = 0; r < 8; r++) { let row = '', e = 0; for (let c = 0; c < 8; c++) { const p = P.b[r * 8 + c]; if (!p) e++; else { if (e) row += e; e = 0; row += p; } } rows.push(row + (e || '')); }
    const cs = ['K', 'Q', 'k', 'q'].filter(k => P.cs[k]).join('') || '-';
    return `${rows.join('/')} ${P.turn} ${cs} ${P.ep >= 0 ? sqn(P.ep) : '-'} ${P.half} ${Math.floor(ply / 2) + 1}`;
  };
  const sqi = s => (8 - +s[1]) * 8 + 'abcdefgh'.indexOf(s[0]);
  const fromUci = (P, u) => u && legal(P).find(m => m.f === sqi(u.slice(0, 2)) && m.t === sqi(u.slice(2, 4)) && (m.promo || '') === (u[4] || ''));
  let SF = null;
  function engine() {
    if (SF) return SF;
    SF = new Promise((ok, fail) => {
      let w;
      try { w = new Worker('js/vendor/stockfish/stockfish-19-lite-single.js'); } catch (e) { return fail(e); }
      const api = { w, fn: null, send: c => w.postMessage(c) };
      const t = setTimeout(() => fail(new Error('Stockfish lädt nicht')), 20000);
      w.onmessage = e => { const l = String(e.data); if (api.fn) api.fn(l); };
      w.onerror = e => { clearTimeout(t); fail(new Error(e.message || 'Stockfish-Fehler')); };
      api.fn = l => { if (l === 'readyok') { clearTimeout(t); api.fn = null; ok(api); } };
      api.send('uci'); api.send('setoption name MultiPV value 2'); api.send('isready');
    });
    SF.catch(() => { SF = null; });
    return SF;
  }
  // the two best lines of a position, scores for the side to move (mate as ±100000 minus the distance)
  function sfLines(api, P, ply, ms) {
    return new Promise(done => {
      const lines = [];
      api.fn = l => {
        if (l.startsWith('info') && / pv /.test(l) && / multipv /.test(l)) {
          const k = +/ multipv (\d+)/.exec(l)[1] - 1, mt = / score mate (-?\d+)/.exec(l), cp = / score cp (-?\d+)/.exec(l);
          const s = mt ? (+mt[1] > 0 ? 100000 - +mt[1] : -100000 - +mt[1]) : cp ? +cp[1] : 0;
          lines[k] = { s, pv: l.split(' pv ')[1].trim().split(' ') };
        } else if (l.startsWith('bestmove')) { api.fn = null; done(lines.filter(Boolean)); }
      };
      api.send('position fen ' + fen(P, ply)); api.send(`go depth 18 movetime ${ms}`);
    });
  }
  // a piece given up on purpose: after the move it can be taken by something cheaper (or for free) and it is worth
  // clearly more than what it took
  function sacrifice(P, m) {
    const p = P.b[m.f], t = p.toLowerCase(); if (t === 'p' || t === 'k') return false;
    const Q = clone(P); make(Q, m);
    const caps = legal(Q).filter(x => x.t === m.t);
    if (!caps.length) return false;
    const low = Math.min(...caps.map(x => VAL[Q.b[x.f].toLowerCase()]));
    const v = VAL[(m.promo || t)], got = m.cap ? VAL[m.cap.toLowerCase()] : 0;
    const guarded = attacked(Q, m.t, P.turn);
    return v - got >= 200 && (low < v || !guarded);
  }
  // the opening moves that are in the book (they are not rated)
  function bookLen(sans) {
    let n = 0;
    for (const [seq] of BOOK) if (seq.length > n && seq.length <= sans.length && seq.every((x, k) => sans[k] === x)) n = seq.length;
    return n;
  }
  // a line as notation with move numbers, e.g. "12. Sxe5 Dg5 13. Sf3"
  function lineSan(P0, ply, pv, n = 6) {
    const P = clone(P0), out = [];
    for (let i = 0; i < Math.min(n, pv.length); i++) {
      const m = fromUci(P, pv[i]); if (!m) break;
      const num = (ply + i) % 2 === 0 ? `${Math.floor((ply + i) / 2) + 1}. ` : i === 0 ? `${Math.floor((ply + i) / 2) + 1}… ` : '';
      out.push(num + show(san(P, m, legal(P)))); make(P, m);
    }
    return out.join(' ');
  }
  // review with Stockfish, rated like the big sites: lost winning chance in percent points
  // (Exzellent up to 2, Gut up to 5, Ungenauigkeit up to 10, Fehler up to 20, Patzer above)
  async function reviewSF(start, plies, prog) {
    const api = await engine();
    const pos = [clone(start)];
    { const P = clone(start); for (const h of plies) { make(P, h.m); pos.push(clone(P)); } }
    const book = bookLen(plies.map(h => h.san.replace(/[+#]/g, '')));
    const info = [];
    for (let i = 0; i < pos.length; i++) {
      const P = pos[i], ms = legal(P);
      if (!ms.length) info.push({ lines: [{ s: inCheck(P, P.turn) ? -100000 : 0, pv: [] }] });
      else info.push({ lines: await sfLines(api, P, i, plies.length > 80 ? 220 : 320) });
      prog && prog(i + 1, pos.length);
    }
    const clamp = v => Math.max(-2000, Math.min(2000, v));
    const res = [];
    for (let k = 0; k < plies.length; k++) {
      const P = pos[k], m = plies[k].m, L = info[k].lines, top = L[0] || { s: 0, pv: [] };
      const bestV = clamp(top.s), played = clamp(-((info[k + 1].lines[0] || { s: 0 }).s));
      const uci = sqn(m.f) + sqn(m.t) + (m.promo || '');
      const isBest = top.pv[0] === uci;
      const wB = winP(bestV), wP = winP(isBest ? bestV : Math.min(played, bestV)), loss = Math.max(0, wB - wP);
      const prev = res[k - 1];
      let kind;
      if (k < book) kind = 'book';
      else if (isBest || loss <= 0.6) {
        const second = L[1] ? winP(clamp(L[1].s)) : null;
        const recapture = k > 0 && plies[k - 1].m.cap && plies[k - 1].m.t === m.t;
        if (sacrifice(P, m) && wP >= 50 && wB < 97) kind = 'brill';
        else if (isBest && second !== null && wB - second >= 12 && wB < 97 && !recapture) kind = 'great';
        else kind = isBest ? 'best' : 'exc';
      }
      else if (loss <= 2) kind = 'exc';
      else if (loss <= 5) kind = 'good';
      else if (prev && (prev.kind === 'mist' || prev.kind === 'blun') && wB >= 65 && loss >= 10 && loss <= 30) kind = 'miss';
      else kind = loss <= 10 ? 'inacc' : loss <= 20 ? 'mist' : 'blun';
      const better = !isBest && top.pv[0] && ['inacc', 'mist', 'miss', 'blun', 'good'].includes(kind) ? fromUci(P, top.pv[0]) : null;
      const item = {
        kind, acc: kind === 'book' ? 100 : accOf(loss), loss, phase: phaseOf(P, k, book),
        best: better ? san(P, better, legal(P)) : '', bestM: better ? { f: better.f, t: better.t } : null,
        line: better ? lineSan(P, k, top.pv) : ''
      };
      item.why = explain(pos, info, plies, k, item, bestV);
      res.push(item);
    }
    return { moves: res, evals: info.map((x, i) => { const s = clamp((x.lines[0] || { s: 0 }).s); return pos[i].turn === 'w' ? s : -s; }), sf: true, info, pos };
  }
  // phases for the accuracy per phase: opening (book or the first 12 moves), endgame (little material left), middlegame
  function phaseOf(P, k, book) {
    if (k < Math.max(book, 24)) return 'open';
    let mat = 0; for (const p of P.b) if (p && 'nbrq'.includes(p.toLowerCase())) mat += VAL[p.toLowerCase()];
    return mat <= 2600 ? 'end' : 'mid';
  }
  // the coach: one or two sentences why a move is rated as it is (mate, material, the missed chance)
  const PNAME = { p: 'einen Bauern', n: 'einen Springer', b: 'einen Läufer', r: 'einen Turm', q: 'die Dame' };
  function explain(pos, info, plies, k, item, bestV) {
    const P = pos[k], after = pos[k + 1], me = P.turn, top = info[k].lines[0] || { s: 0, pv: [] }, reply = info[k + 1].lines[0] || { s: 0, pv: [] };
    const mat = (Q, s) => { let v = 0; for (const p of Q.b) if (p && p.toLowerCase() !== 'k') v += (side(p) === s ? 1 : -1) * VAL[p.toLowerCase()]; return v; };
    const run = (Q0, pv, n) => { const Q = clone(Q0); for (let i = 0; i < Math.min(n, pv.length); i++) { const m = fromUci(Q, pv[i]); if (!m) break; make(Q, m); } return Q; };
    const sanOf = (Q, u) => { const m = fromUci(Q, u); return m ? show(san(Q, m, legal(Q))) : ''; };
    const b = t => `<b>${t}</b>`;
    if (plies[k].san.endsWith('#')) return 'Schachmatt!';
    if (item.kind === 'book') { const op = opening(plies.slice(0, k + 1).map(h => h.san.replace(/[+#]/g, ''))); return op ? `Ein bekannter Eröffnungszug: ${b(op)}` : 'Ein bekannter Eröffnungszug.'; }
    // the answer mates
    if (reply.s >= 90000) return 100000 - reply.s === 1 ? `Danach setzt der Gegner sofort matt: ${b(sanOf(after, reply.pv[0]))}.` : `Danach setzt der Gegner in ${b(100000 - reply.s)} Zügen matt, los geht es mit ${b(sanOf(after, reply.pv[0]))}.`;
    // a mate was there
    if (top.s >= 90000 && !['best', 'great', 'brill'].includes(item.kind)) return `Hier gab es ein Matt in ${b(100000 - top.s)} mit ${b(show(item.best || sanOf(P, top.pv[0])))}.`;
    if (item.kind === 'brill') return 'Ein starkes Opfer: Die Figur darf geschlagen werden, aber das lohnt sich für den Gegner nicht.';
    if (item.kind === 'great') return 'Der einzige Zug, der die Stellung hält. Alles andere wäre deutlich schlechter.';
    if (item.kind === 'best') return 'Der stärkste Zug in dieser Stellung.';
    if (item.kind === 'exc') return 'Fast so stark wie der beste Zug.';
    if (item.kind === 'good') return 'Ein solider Zug.';
    // material, counted along the lines (so a mere exchange is not a win): the best line against the played move
    // followed by the strongest answer, five plies each
    const gainBest = mat(run(P, top.pv, 5), me) - mat(P, me);
    const lost = mat(run(P, top.pv, 5), me) - mat(run(after, reply.pv, 5), me);
    // the most valuable own piece the opponent takes in the answer line
    const takenBy = (() => { const Q = clone(after); let best = null; for (let i = 0; i < Math.min(5, reply.pv.length); i++) { const m = fromUci(Q, reply.pv[i]); if (!m) break; if (m.cap && side(m.cap) === me && (!best || VAL[m.cap.toLowerCase()] > VAL[best.toLowerCase()])) best = m.cap; make(Q, m); } return best; })();
    if (item.kind === 'miss' && gainBest >= 250 && item.best) return `Verpasst: Mit ${b(show(item.best))} hätte man Material gewonnen.`;
    if (lost >= 250 && takenBy) return `Danach verliert man ${b(PNAME[takenBy.toLowerCase()])}. Der Gegner beginnt mit ${b(sanOf(after, reply.pv[0]))}.`;
    if (lost >= 250) return `Das kostet Material. Der Gegner antwortet am besten mit ${b(sanOf(after, reply.pv[0]))}.`;
    if (gainBest >= 250 && item.best) return `Mit ${b(show(item.best))} hätte man Material gewonnen.`;
    if (item.kind === 'inacc') return `Nicht ganz genau. ${b(show(item.best))} war besser.`;
    const ans = reply.pv[0] ? `<span>Stärkste Antwort:</span> ${b(sanOf(after, reply.pv[0]))}` : '';
    if (item.kind === 'mist') return `<span>${winP(bestV) >= 60 ? 'Damit gibt man einen großen Teil des Vorteils her.' : 'Danach steht man deutlich schlechter.'}</span> ${ans}`;
    return `<span>${winP(bestV) >= 60 ? 'Damit ist der Vorteil weg.' : 'Danach ist die Stellung kaum noch zu halten.'}</span> ${ans}`;
  }

  function review(start, plies, prog) {
    // Both values of a move come from the same depth: the best move of the position (4 plies) against the move that was
    // played (that move plus 3 plies for the answer). Different depths would make most moves look like blunders.
    return new Promise(done => {
      const pos = [clone(start)], res = [], evals = [];
      { const P = clone(start); for (const h of plies) { make(P, h.m); pos.push(clone(P)); } }
      const clamp = v => Math.max(-2000, Math.min(2000, v));
      // value for the side to move in P, searched d plies deep (no moves: mate or stalemate)
      const value = (P, d) => {
        const ms = legal(P);
        if (!ms.length) return { s: inCheck(P, P.turn) ? -100000 : 0, best: null };
        const r = think(P, d, 300, 0); return { s: r.score, best: r.move };
      };
      let k = 0;
      const step = () => {
        if (k < plies.length) {
          const P = pos[k], w = P.turn === 'w', m = plies[k].m;
          const b = value(P, 4), after = value(clone(pos[k + 1]), 3);
          const bestV = clamp(b.s), played = clamp(-after.s);
          evals.push(w ? bestV : -bestV);
          const isBest = !!(b.best && b.best.f === m.f && b.best.t === m.t && (b.best.promo || '') === (m.promo || ''));
          // the played move can't be better than the best one (a deeper look at it can only find more for the answer)
          const dW = isBest ? 0 : Math.max(0, winP(bestV) - winP(Math.min(played, bestV)));
          res.push({ kind: rateMove(dW, isBest), acc: accOf(dW), best: b.best && !isBest && dW > 7 ? san(P, b.best, legal(P)) : '' });
          k++; prog && prog(k, plies.length + 1);
          return setTimeout(step, 0);
        }
        const last = pos[plies.length], f = clamp(value(clone(last), 4).s);
        evals.push(last.turn === 'w' ? f : -f);
        prog && prog(plies.length + 1, plies.length + 1);
        done({ moves: res, evals });
      };
      setTimeout(step, 30);
    });
  }

  V.css(`
  .chesswrap{width:min(var(--bw),620px,100%);display:flex;flex-direction:column;gap:6px;--lt:#ebecd0;--dk:#739552;--lml:#f5f682;--lmd:#b9ca43;--dot:rgba(0,0,0,.16);--col:#739552;--cod:#ebecd0}
  .bd-neon .chesswrap{--lt:#272c5c;--dk:#1a1d40;--lml:#3b3474;--lmd:#2f2963;--dot:rgba(98,240,255,.5);--col:#8189d0;--cod:#6b73ba}
  .bd-wood .chesswrap{--lt:#ecd3a6;--dk:#b5835a;--lml:#e8d47c;--lmd:#c9a24f;--dot:rgba(60,30,10,.3);--col:#9a6a40;--cod:#f0d9b0}
  .capt{display:flex;gap:0;min-height:22px;align-items:center;flex-wrap:wrap}
  .capt i{display:block;width:20px;height:20px;margin-right:-6px} .capt i svg{width:100%;height:100%;display:block}
  .capt em{font-style:normal;font-size:12px;font-weight:700;color:var(--muted);margin-left:10px}
  .chess{display:grid;grid-template-columns:repeat(8,1fr);border-radius:4px;overflow:hidden;box-shadow:0 10px 30px -12px rgba(0,0,0,.7);user-select:none;-webkit-user-select:none;touch-action:none;position:relative}
  .bd-neon .chess{border-radius:12px;border:2px solid #4a52a0;box-shadow:0 0 0 1px rgba(98,240,255,.18),0 0 46px -12px var(--cy)}
  .bd-wood .chess{border:6px solid #5d3a1c;box-shadow:0 18px 40px -14px rgba(0,0,0,.8)}
  .chess .sq{aspect-ratio:1;position:relative;display:grid;place-items:center;cursor:pointer;min-width:0}
  .chess .lt{background:var(--lt)} .chess .dk{background:var(--dk)}
  .chess .lastm.lt,.chess .sel.lt{background:var(--lml)} .chess .lastm.dk,.chess .sel.dk{background:var(--lmd)}
  .bd-neon .chess .lastm{box-shadow:inset 0 0 0 2px rgba(255,79,216,.5)} .bd-neon .chess .sel{box-shadow:inset 0 0 0 4px var(--cy)}
  .chess .hov{box-shadow:inset 0 0 0 4px rgba(255,255,255,.75)}
  .chess .chk{background:radial-gradient(circle,#ff2d2d 0,#e83a3a 25%,rgba(232,58,58,.5) 55%,transparent 80%)!important}
  .chess .pc{display:block;position:relative;z-index:2;width:100%;height:100%;transition:transform .15s,rotate .45s var(--ease)}
  .chess .pc svg{width:100%;height:100%;display:block;filter:drop-shadow(0 2px 1px rgba(0,0,0,.25))}
  .chess .pc.dragsrc{opacity:.35}
  .chess .dot::after{content:'';position:absolute;width:32%;height:32%;border-radius:50%;background:var(--dot);z-index:3;pointer-events:none}
  .chess .ring::after{content:'';position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 calc(var(--sq,40px) * .09) var(--dot);z-index:3;pointer-events:none}
  .chess .co{position:absolute;font:700 clamp(9px,2.4vw,13px)/1 var(--f-b);z-index:1;pointer-events:none}
  .chess .co.f{bottom:2px;right:3px} .chess .co.r{top:2px;left:3px}
  .chess .lt .co{color:var(--col)} .chess .dk .co{color:var(--cod)}
  .chess .mk{position:absolute;right:-4%;top:-4%;width:38%;height:38%;border-radius:50%;display:grid;place-items:center;font:800 clamp(9px,2.6vw,14px)/1 var(--f-b);color:#fff;z-index:4;box-shadow:0 1px 3px rgba(0,0,0,.4);pointer-events:none}
  .chdrag{position:fixed;z-index:60;pointer-events:none;transform:translate(-50%,-55%) scale(1.12);filter:drop-shadow(0 6px 6px rgba(0,0,0,.35))}
  .chdrag svg{width:100%;height:100%;display:block}
  /* "Gegenüber sitzen" at one device: on Black's move the pieces turn to the player on the other side */
  .facing.turn-r .chess .pc{rotate:180deg}
  .facing.turn-r .chess .co{rotate:180deg}
  /* move list, opening and the arrows below the board */
  .chx{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;background:var(--panel);border:1px solid var(--line)}
  .chx-top{display:flex;align-items:center;gap:6px;min-height:32px}
  .chx-top{flex-wrap:wrap}
  .chx-op{flex:1 1 160px;min-width:0;font:600 12.5px/1.25 var(--f-b);color:var(--muted)}
  .chx-op:empty{display:none}
  @media (max-width:600px){ .chx-op{flex-basis:100%;order:2} .chx-nav{margin-left:auto} }
  .chx-op b{color:var(--fg);font-weight:700}
  .chx-nav{display:flex;gap:4px}
  .chx-nav button{width:34px;height:32px;border-radius:7px;background:var(--panel2);border:1px solid var(--line);color:var(--fg);display:grid;place-items:center;font:700 14px/1 var(--f-b)}
  .chx-nav button:disabled{opacity:.35}
  .chx-nav .chrv{width:auto;padding:0 10px;font:800 italic 12px/1 var(--f-d);text-transform:uppercase;letter-spacing:.06em;background:var(--good);color:#06210f;border-color:transparent}
  .chx-ml{display:grid;grid-template-columns:auto 1fr 1fr;gap:1px 6px;align-items:center;max-height:118px;overflow-y:auto;font:600 14px/1.2 var(--f-b);scrollbar-width:thin}
  .chx-ml:empty{display:block}
  .chx-ml button{justify-content:flex-start;text-align:left}
  .chx-ml:empty::before{content:attr(data-empty);color:var(--dim);font-weight:500}
  .chx-ml .n{color:var(--dim);padding:4px 2px 4px 4px;font-variant-numeric:tabular-nums;text-align:right;min-width:2.2em}
  .chx-ml button{padding:4px 6px;border-radius:5px;color:var(--fg);display:inline-flex;align-items:center;gap:3px;font:inherit}
  .chx-ml button.cur{background:var(--panel3)}
  .chx-ml button i{font-style:normal;font-weight:800;font-size:11px}
  .chx-view{font:600 12px/1.2 var(--f-b);color:var(--cyan)}
  .chev{position:relative;height:16px;border-radius:4px;overflow:hidden;background:#403d39}
  .chev i{position:absolute;left:0;top:0;bottom:0;background:#f4f4f4;transition:width .35s var(--ease),height .35s var(--ease)}
  .chev b{position:absolute;right:6px;top:50%;transform:translateY(-50%);font:800 11px/1 var(--f-b);color:#9a9a9a;mix-blend-mode:difference}
  .charrow{position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none}
  .charrow line{stroke:rgba(129,182,76,.9);stroke-width:.22;stroke-linecap:round;marker-end:url(#charh)}
  .chx-line{display:block;margin-top:3px;font-weight:600;color:var(--fg)} .chx-line span:first-child{color:var(--muted)}
  .k-brill{background:#1baca6} .k-great{background:#5c8bb0} .k-book{background:#a88865} .k-miss{background:#ee6b55}
  .t-brill{color:#26c2bb} .t-great{color:#7aa6d4} .t-book{color:#c9a37a} .t-miss{color:#ff8a75}
  .k-best{background:#81b64c} .k-exc{background:#5aa53c} .k-good{background:#82a75a} .k-inacc{background:#e6a22e} .k-mist{background:#e5762b} .k-blun{background:#ca3431}
  .t-best{color:#95c95f} .t-exc{color:#4cc778} .t-good{color:#9cc46e} .t-inacc{color:#f2b543} .t-mist{color:#f08a45} .t-blun{color:#f0504c}
  .promo{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .promo button{aspect-ratio:1;border-radius:12px;background:#ebecd0;display:grid;place-items:center;border:2px solid transparent;padding:6px}
  .promo button svg{width:78%;height:78%}
  .promo button:hover{border-color:var(--cy)} .promo small{display:block;font-size:11px;color:#1d1d3a;font-family:var(--f-b)}
  /* the review */
  .chr{display:flex;flex-direction:column;gap:12px}
  .chr-acc{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .chr-acc div{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px;border-radius:10px;background:var(--panel2)}
  .chr-acc b{font:800 italic 34px/1 var(--f-d)} .chr-acc small{font-size:12px;color:var(--muted)}
  .chr-acc .w b{color:#f4f4f4} .chr-acc .b b{color:#9aa0b8}
  .chr-graph{width:100%;height:70px;border-radius:8px;overflow:hidden;background:#3a3a3a}
  .chr-tab{display:grid;grid-template-columns:auto 1fr auto auto;gap:4px 12px;align-items:center;font-size:14px}
  .chr .kd,.chr-tab .kd{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 11px/1 var(--f-b)}
  .chr-tab .c{font:800 15px/1 var(--f-d);text-align:center;min-width:24px}
  .chr-prog{height:8px;border-radius:4px;background:var(--panel3);overflow:hidden} .chr-prog i{display:block;height:100%;width:var(--w);background:var(--good);transition:width .2s}
  .chr-hint{font-size:13px;color:var(--muted);margin:0}
  /* the board with its eval bar: above it on phones, beside it (upright) on wide screens */
  .chbrow{display:flex;flex-direction:column;gap:6px}
  .chbrow .chess{width:100%}
  .chev i{width:var(--wp,50%)}
  @media (min-width:900px){
    .chbrow{flex-direction:row} .chbrow .chess{flex:1;min-width:0;width:auto}
    .chev{width:20px;height:auto;flex:none}
    .chev i{width:100%;top:auto;height:var(--wp,50%)} .chev.fl i{bottom:auto;top:0}
    .chev b{right:auto;left:50%;top:auto;bottom:4px;transform:translateX(-50%);font-size:9px;writing-mode:horizontal-tb}
    .chev.fl b{bottom:auto;top:4px}
  }
  /* the coach card */
  .chco{position:relative;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);animation:wpop .3s var(--spring)}
  .chco-ic{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 14px/1 var(--f-b);box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .chco-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
  .chco-h{font:800 15px/1.2 var(--f-b)} .chco-h.good{color:var(--good)} .chco-h.bad{color:#ff8a8a}
  .chco p{margin:0;font-size:13.5px;line-height:1.4;color:var(--fg)} .chco p b{font-weight:800}
  .chco-b span{color:var(--muted)} .chco-b small{display:block;color:var(--muted);font-weight:600;margin-top:2px}
  .chco-try{align-self:flex-start;margin-top:4px}
  .chco-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
  .chco-n{position:absolute;right:10px;top:10px;font:700 11px/1 var(--f-b);color:var(--muted)}
  .chco-side{position:absolute;right:10px;top:12px;width:12px;height:12px;border-radius:3px;border:1px solid var(--line2)} .chco-side.w{background:#f4f4f4} .chco-side.b{background:#222}
  .chco.retry{border-color:color-mix(in srgb,var(--cyan) 50%,var(--line))} .chco.right{border-color:var(--good)} .chco.wrong{border-color:#ca3431;animation:tqNo .45s ease}
  .k2-blun{border-color:#ca343188} .k2-mist{border-color:#e5762b88} .k2-brill{border-color:#1baca688} .k2-great{border-color:#5c8bb088}
  /* the graph in the panel */
  .chg.big{height:80px;cursor:default}
  .chg{position:relative;height:54px;border-radius:7px;overflow:hidden;background:#3a3836;cursor:pointer}
  .chg svg{position:absolute;inset:0;width:100%;height:100%}
  .chg .mid{stroke:#777;stroke-width:.6;vector-effect:non-scaling-stroke}
  .chg .cur{stroke:var(--cyan);stroke-width:2;vector-effect:non-scaling-stroke}
  .chg-dots{position:absolute;inset:0;pointer-events:none} .chg-dots i{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;border:1.5px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.4)}
  .chg circle.k-inacc{fill:#e6a22e} .chg circle.k-mist{fill:#e5762b} .chg circle.k-blun{fill:#ca3431} .chg circle.k-miss{fill:#ee6b55} .chg circle.k-brill{fill:#1baca6} .chg circle.k-great{fill:#5c8bb0}
  .chg circle{transform-box:fill-box} .chr-graph circle{stroke:#fff;stroke-width:.5}
  .chr-graph circle.k-mist{fill:#e5762b} .chr-graph circle.k-blun{fill:#ca3431} .chr-graph circle.k-miss{fill:#ee6b55}
  /* the summary */
  .chr-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px} .chr-h h3{margin:0} .chr-h small{color:var(--muted);font-size:12px}
  .chr-elo{font-style:normal;font-size:12px;color:var(--fg);margin-top:4px;padding:3px 8px;border-radius:999px;background:var(--panel3)}
  .chr-keys{display:flex;flex-direction:column;gap:6px} .chr-keys h4{margin:0;font:800 italic 14px/1 var(--f-d);text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  .chr-key{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;padding:8px 10px;border-radius:9px;background:var(--panel2);border:1px solid var(--line);text-align:left;color:var(--fg)}
  .chr-key .kd{grid-row:span 2} .chr-key .km{font-size:13.5px} .chr-key .kw{font-size:12.5px;color:var(--muted)} .chr-key .kw b{color:var(--fg)}
  .chr-ph{display:grid;grid-template-columns:1fr auto auto;gap:6px 16px;align-items:center;font-size:13.5px}
  .chr-ph b{font-size:12px;color:var(--muted);text-align:center} .chr-ph .ph{display:inline-block;min-width:34px;text-align:center;padding:3px 6px;border-radius:6px;color:#fff;font:800 13px/1 var(--f-b)}
  .chr{max-height:min(84vh,780px);overflow-y:auto} .chr>*{flex-shrink:0}
  .chr .actions{position:sticky;bottom:-1px;padding-top:8px;background:linear-gradient(transparent,var(--panel) 30%);z-index:2}`);

  const cm = (rows, extra) => V.mini(rows, Object.assign({
    K: { c: 'pw', t: '♚︎' }, Q: { c: 'pw', t: '♛︎' }, R: { c: 'pw', t: '♜︎' }, B: { c: 'pw', t: '♝︎' }, N: { c: 'pw', t: '♞︎' }, P: { c: 'pw', t: '♟︎' },
    k: { c: 'pb', t: '♚︎' }, q: { c: 'pb', t: '♛︎' }, r: { c: 'pb', t: '♜︎' }, b: { c: 'pb', t: '♝︎' }, n: { c: 'pb', t: '♞︎' }, p: { c: 'pb', t: '♟︎' },
    '*': { c: 'tg' }, '.': { c: '' }
  }, extra || {}), { checker: true, w: 230 });

  V.register({
    id: 'chess', name: 'Schach', cat: 'Strategie', order: 1, accent: 'var(--cyan)',
    short: 'Der König aller Brettspiele.',
    desc: 'Setz den gegnerischen König schachmatt. Mit allen Regeln: Rochade, en passant, Umwandlung und Remis.',
    sides: { 1: 'Weiß', 2: 'Schwarz' },
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Figur nehmen, dann Zielfeld'], ['1–4', 'Bei Umwandlung: Dame, Turm, Läufer, Springer']],
    firstTitle: 'Deine Farbe', firstLabels: ['Weiß', 'Schwarz', 'Zufall'],
    options: [{ id: 'flipb', label: 'Brett drehen', group: 'board', desc: 'Am Gerät nebeneinander: Das Brett dreht sich zu dem, der dran ist. Sitzt ihr euch gegenüber, drehen sich stattdessen die Figuren.', short: v => v ? 'Brett dreht mit' : '', def: 0, modes: ['local'], choices: [[0, 'Aus'], [1, 'Mitdrehen']] },
      { id: 'clock', label: 'Schachuhr', group: 'time', inline: 'local', desc: 'Jeder hat so viel Zeit für alle Züge.', short: v => v ? `Uhr ${v} Min.` : '', def: 0, modes: ['local', 'online', 'open'], choices: [[0, 'Aus'], [3, '3 Min'], [5, '5 Min'], [10, '10 Min']] }],
    levelInfo: ['Anfänger: zieht oft planlos und lässt Figuren hängen.', 'Schlägt, was offen herumsteht, übersieht aber Gabeln und Fesselungen.', 'Rechnet drei Halbzüge genau. Hängende Figuren verzeiht sie nicht.', 'Rechnet bis zu acht Halbzüge tief und nimmt sich Zeit dafür.'],
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="6" fill="#585e9c"/><path d="M3 3h10.5v10.5H3zM24 3h10.5v10.5H24zM13.5 13.5H24V24H13.5zM34.5 13.5H45V24H34.5zM3 24h10.5v10.5H3zM24 24h10.5v10.5H24zM13.5 34.5H24V45H13.5zM34.5 34.5H45V45H34.5z" fill="#b9bce6"/><text x="24" y="34" text-anchor="middle" font-size="30" fill="#fafaff" stroke="#14142a" stroke-width="1">♞&#xFE0E;</text></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Weiß und Schwarz haben je 16 Figuren. Weiß beginnt, dann wird abwechselnd gezogen. Du gewinnst, wenn der gegnerische König <b>angegriffen ist und nicht mehr entkommen kann</b>. Das heißt Schachmatt.', demo: cm(['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR']) },
      { t: 'Turm, Läufer, Dame', d: 'Der <b>Turm</b> zieht beliebig weit gerade, der <b>Läufer</b> beliebig weit diagonal. Die <b>Dame</b> kann beides und ist die stärkste Figur. Keine von ihnen springt über andere Figuren.', demo: cm(['...*....', '...*...*', '*..*..*.', '.*.*.*..', '..***...', '***Q****', '..***...', '.*.*.*..']) },
      { t: 'Springer und König', d: 'Der <b>Springer</b> zieht im L: zwei Felder gerade, eins zur Seite. Er darf als Einziger über Figuren springen. Der <b>König</b> zieht ein Feld in jede Richtung, aber nie auf ein angegriffenes Feld.', demo: cm(['........', '..*.*...', '.*...*..', '...N....', '.*...*..', '..*.*...', '........', '........']) },
      { t: 'Bauern', d: 'Bauern ziehen ein Feld geradeaus, vom Startfeld aus auch zwei. <b>Schlagen</b> tun sie aber schräg nach vorn. Erreicht ein Bauer die letzte Reihe, wird er <b>umgewandelt</b>, meist in eine Dame.', demo: cm(['........', '........', '........', '..*p....', '..P.....', '........', '........', '........'], { p: { c: 'pb tg', t: '♟︎' } }) },
      { t: 'Schach und Matt', d: 'Wird dein König angegriffen, stehst du im <b>Schach</b> und musst das sofort beenden: König wegziehen, dazwischenstellen oder den Angreifer schlagen. Geht nichts davon, ist es <b>Schachmatt</b>. Hier setzt der weiße Turm auf der Grundreihe matt: Die eigenen Bauern versperren dem König die Flucht.', demo: cm(['R.....k.', '.....ppp', '........', '........', '........', '........', '........', '......K.']) },
      { t: 'Sonderzüge', d: '<b>Rochade:</b> König zwei Felder Richtung Turm, der Turm springt daneben. Geht nur, wenn beide noch nicht gezogen haben und der Weg frei und nicht angegriffen ist. <b>En passant:</b> Zieht ein Bauer zwei Felder an deinem Bauern vorbei, darfst du ihn im nächsten Zug so schlagen, als wäre er nur eins gezogen.' },
      { t: 'Remis', d: 'Unentschieden gibt es bei <b>Patt</b> (wer dran ist, hat keinen Zug, steht aber nicht im Schach), bei dreimal derselben Stellung, nach 50 Zügen ohne Bauernzug oder Schlagen, und wenn keiner mehr mattsetzen kann. Tipp: Bring früh Springer und Läufer raus, sichere den König mit der Rochade und lass keine Figur ungedeckt.' }
    ],
    start(ctx) {
      const P = initial(), START = clone(P);
      const sideOf = { 1: 'w', 2: 'b' }, numOf = { w: 1, b: 2 };
      // your own pieces at the bottom: against the AI and online when you play the second side
      const baseFlip = (ctx.mode === 'ai' && ctx.aiSide === 1) || ctx.mySide === 2;
      const reps = new Map();
      const key = () => P.b.join(',') + P.turn + JSON.stringify(P.cs) + P.ep;
      const bump = () => { const k = key(); reps.set(k, (reps.get(k) || 0) + 1); return reps.get(k); };
      bump();
      let sel = -1, moves = legal(P), last = null, over = false;
      // the game so far: { m, san, mover, b (board after), last, chk }; view: null = live, else the number of plies shown
      const hist = [];
      let view = null, rev = null;
      // "Fehler üben": { list of plies, i, k, P, moves, state: 'ask' | 'check' | 'right' | 'wrong' | 'shown', tries, tried }
      let retry = null;
      const capd = { w: [], b: [] };
      // the board look comes from Optionen → Spielbrett: Standard is the green club board, Neon and Holz as for Dame and Reversi
      const wrap = V.el('div', 'chesswrap'), topC = V.el('div', 'capt'), botC = V.el('div', 'capt'), board = V.el('div', 'chess');
      const panel = V.el('div', 'chx nofit', `<div class="chx-top"><span class="chx-op" id="chop"></span><span class="chx-nav">
          <button id="chf" aria-label="Zum Anfang">⏮</button><button id="chp" aria-label="Zug zurück">◀</button><button id="chn" aria-label="Zug vor">▶</button><button id="chl" aria-label="Zum aktuellen Zug">⏭</button></span></div>
        <div class="chco" id="chco" hidden></div><div class="chg" id="chg" hidden></div>
        <div class="chx-ml" id="chml" data-empty="${V.t ? V.t('Hier stehen gleich die Züge.') : 'Hier stehen gleich die Züge.'}"></div>`);
      const evb = V.el('div', 'chev', '<i></i><b></b>'), arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      evb.hidden = true;
      arrow.setAttribute('class', 'charrow'); arrow.setAttribute('viewBox', '0 0 8 8');
      arrow.innerHTML = '<defs><marker id="charh" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0 0L3 1.5L0 3z" fill="rgba(129,182,76,.9)"/></marker></defs><line/>';
      const brow = V.el('div', 'chbrow'); brow.append(evb, board);
      wrap.append(topC, brow, botC, panel); ctx.stage.appendChild(wrap);
      for (let sq = 0; sq < 64; sq++) { const d = V.el('div', 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt')); d.dataset.sq = sq; board.appendChild(d); }
      board.appendChild(arrow);
      const cells = {}; [...board.children].forEach(d => cells[+d.dataset.sq] = d);
      // at one device, side by side: the board can turn to whoever moves (option "Brett drehen"); facing each other only the pieces turn (CSS)
      const facing = () => !!ctx.stage.closest('.facing');
      const autoFlip = () => ctx.mode === 'local' && +((ctx.opts || {}).flipb) === 1 && !facing();
      let flip = null;
      function layout() {
        const f = autoFlip() ? P.turn === 'b' : baseFlip;
        if (f === flip) return;
        flip = f;
        const order = [...Array(64).keys()]; if (flip) order.reverse();
        order.forEach(sq => board.appendChild(cells[sq])); board.appendChild(arrow);
      }
      layout();
      ctx.nav(() => [...board.querySelectorAll('.sq')], { pad: 1, start: () => 52 - (flip ? 41 : 0) });

      // ---------- drawing ----------
      function render() {
        const live = view === null && !retry;
        const h = live || retry ? null : hist[view - 1];
        const R = retry && retry.P;
        const b = R ? R.b : live ? P.b : view === 0 ? START.b : h.b;
        const lm = R ? (retry.tried || (retry.k > 0 ? hist[retry.k - 1].m : null)) : live ? last : h ? h.m : null;
        const chk = R ? (inCheck(R, R.turn) ? R.kings[R.turn] : -1) : live ? (inCheck(P, P.turn) ? P.kings[P.turn] : -1) : h && h.chk >= 0 ? h.chk : -1;
        const targets = sel >= 0 && (live || (R && retry.state === 'ask')) ? (R ? retry.moves : moves).filter(m => m.f === sel) : [];
        const mark = retry ? null : rev && lm && !live && view > 0 ? rev.moves[view - 1] : rev && live && hist.length && last === hist[hist.length - 1].m ? rev.moves[hist.length - 1] : null;
        for (let sq = 0; sq < 64; sq++) {
          const d = cells[sq], p = b[sq];
          let cls = 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt');
          if (lm && (sq === lm.f || sq === lm.t)) cls += ' lastm';
          if (sq === sel && (live || R)) cls += ' sel';
          if (sq === chk) cls += ' chk';
          const tg = targets.find(m => m.t === sq);
          if (tg) cls += tg.cap ? ' ring' : ' dot';
          d.className = cls;
          const r = sq >> 3, c = sq & 7;
          let co = '';
          if (r === (flip ? 0 : 7)) co += `<span class="co f">${'abcdefgh'[c]}</span>`;
          if (c === (flip ? 7 : 0)) co += `<span class="co r">${8 - r}</span>`;
          const mk = mark && lm && sq === lm.t ? `<span class="mk k-${mark.kind}">${KIND.find(k => k[0] === mark.kind)[1]}</span>` : '';
          d.innerHTML = (p ? `<span class="pc">${pc(p)}</span>` : '') + co + mk;
        }
        board.style.setProperty('--sq', (board.clientWidth / 8 || 40) + 'px');
        // after a review: the eval bar for the position shown and an arrow for the better move
        const at = retry ? retry.k : view === null ? hist.length : view;
        evb.hidden = !rev;
        if (rev) {
          const e = rev.evals[at] ?? 0, mate = Math.abs(e) >= 1990;
          evb.style.setProperty('--wp', winP(e).toFixed(1) + '%'); evb.classList.toggle('fl', !!flip);
          evb.querySelector('b').textContent = mate ? (e > 0 ? '+M' : '-M') : (e > 0 ? '+' : '') + (e / 100).toFixed(1);
        }
        const bm = retry ? (retry.state === 'shown' && retry.sol ? retry.sol : null) : rev && at > 0 && rev.moves[at - 1] && rev.moves[at - 1].bestM;
        arrow.style.display = bm ? '' : 'none';
        if (bm) {
          const xy = q => { let c = q & 7, r = q >> 3; if (flip) { c = 7 - c; r = 7 - r; } return [c + 0.5, r + 0.5]; };
          const [x1, y1] = xy(bm.f), [x2, y2] = xy(bm.t), ln = arrow.querySelector('line'), d = Math.hypot(x2 - x1, y2 - y1) || 1;
          ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2 - (x2 - x1) / d * 0.35); ln.setAttribute('y2', y2 - (y2 - y1) / d * 0.35);
        }
        const mat = s => capd[s].reduce((a, p) => a + VAL[p.toLowerCase()], 0);
        const line = s => {
          const diff = (mat(s) - mat(s === 'w' ? 'b' : 'w')) / 100;
          return capd[s].slice().sort((a, b) => VAL[b.toLowerCase()] - VAL[a.toLowerCase()]).map(p => `<i>${pc(p)}</i>`).join('') + (diff > 0 ? `<em>+${diff}</em>` : '');
        };
        // capd.w = pieces white has captured
        topC.innerHTML = line(flip ? 'w' : 'b'); botC.innerHTML = line(flip ? 'b' : 'w');
        moveList();
      }
      function moveList() {
        const ml = panel.querySelector('#chml'), cur = view === null ? hist.length : view;
        // one row per move number like on the big chess sites: number | White | Black
        const cellOf = k => {
          const x = hist[k]; if (!x) return '<span></span>';
          const r = rev && rev.moves[k], kd = r ? KIND.find(z => z[0] === r.kind) : null;
          return `<button data-k="${k + 1}" class="${cur === k + 1 ? 'cur' : ''}${r ? ' t-' + r.kind : ''}">${show(x.san)}${kd && r.kind !== 'good' ? `<i>${kd[1]}</i>` : ''}</button>`;
        };
        let h = '';
        for (let k = 0; k < hist.length; k += 2) h += `<span class="n">${k / 2 + 1}.</span>${cellOf(k)}${cellOf(k + 1)}`;
        ml.innerHTML = h;
        ml.querySelectorAll('[data-k]').forEach(b => b.onclick = () => go(+b.dataset.k));
        const c = ml.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); else ml.scrollTop = ml.scrollHeight;
        const op = opening(hist.map(x => x.san.replace(/[+#]/g, '')));
        const r = rev && view !== null && view > 0 ? rev.moves[view - 1] : null;
        const kd = r && KIND.find(z => z[0] === r.kind);
        panel.querySelector('#chop').innerHTML = r || retry ? ''
          : view !== null ? `<span class="chx-view">Rückblick · Zug ${Math.ceil(view / 2) || 0}</span>` : op ? `<b>${op}</b>` : '';
        coach(); graph();
        panel.querySelector('#chf').disabled = panel.querySelector('#chp').disabled = cur === 0;
        panel.querySelector('#chn').disabled = panel.querySelector('#chl').disabled = cur === hist.length;
      }
      // looking back through the game (the live game goes on when you move or tap ⏭)
      function go(k) {
        k = Math.max(0, Math.min(hist.length, k));
        retry = null;
        view = k === hist.length ? null : k; sel = -1; V.sfx.tick(); render();
      }
      // ---------- the coach card below the board (after a review) ----------
      function coach() {
        const el = panel.querySelector('#chco');
        if (retry) return retryCard(el);
        const at = view === null ? hist.length : view, r = rev && at > 0 ? rev.moves[at - 1] : null;
        el.hidden = !r; if (!r) return;
        const kd = KIND.find(z => z[0] === r.kind), mover = hist[at - 1].mover;
        const canTry = rev.sf && ['inacc', 'mist', 'miss', 'blun'].includes(r.kind);
        el.className = 'chco k2-' + r.kind;
        el.innerHTML = `<span class="chco-ic k-${r.kind}">${kd[1]}</span><div class="chco-tx">
            <b class="chco-h"><span>${show(hist[at - 1].san)}</span> <span>${kd[2]}</span></b>
            ${r.why ? `<p>${r.why}</p>` : ''}
            ${r.best ? `<p class="chco-b"><span>Besser:</span> <b>${r.line || show(r.best)}</b></p>` : ''}
            ${canTry ? '<button class="btn sm chco-try" id="chtry"><span>Besseren Zug selbst finden</span></button>' : ''}</div>
          <i class="chco-side ${mover}"></i>`;
        const t = el.querySelector('#chtry'); if (t) t.onclick = () => startRetry([at - 1]);
      }
      // ---------- the eval graph: tap to jump; dots for the weaker moves ----------
      function graph() {
        const el = panel.querySelector('#chg');
        el.hidden = !rev; if (!rev) return;
        const n = rev.evals.length - 1 || 1, at = retry ? retry.k : view === null ? hist.length : view;
        const X = i => (i / n * 100).toFixed(2), Y = e => (100 - winP(e)).toFixed(2);
        const area = `M0 100 ${rev.evals.map((e, i) => `L${X(i)} ${Y(e)}`).join(' ')} L100 100Z`;
        const dots = rev.moves.map((r, k) => ['inacc', 'mist', 'miss', 'blun', 'brill', 'great'].includes(r.kind) ? `<i class="k-${r.kind}" style="left:${X(k + 1)}%;top:${Y(rev.evals[k + 1])}%"></i>` : '').join('');
        el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${area}" fill="#f2f2f2"/><path d="M0 50H100" class="mid"/><path d="M${X(at)} 0V100" class="cur"/></svg>
          <span class="chg-dots">${dots}</span>`;
        el.onclick = e => { const r2 = el.getBoundingClientRect(); go(Math.round((e.clientX - r2.left) / r2.width * n)); };
      }

      // ---------- "Fehler üben": find a better move in the positions where a weak move was played ----------
      function startRetry(list) {
        if (!list.length) return;
        retry = { list, i: 0 }; V.closeModal && document.querySelector('.chrm') && V.closeModal();
        setRetry(0);
      }
      function setRetry(i) {
        const k = retry.list[i];
        Object.assign(retry, { i, k, P: clone(rev.pos[k]), state: 'ask', tries: 0, tried: null, sol: null, msg: '' });
        retry.moves = legal(retry.P); sel = -1; view = k; render();
      }
      function retryCard(el) {
        const k = retry.k, r = rev.moves[k], who = retry.P.turn === 'w' ? 'Weiß' : 'Schwarz';
        el.hidden = false; el.className = 'chco retry ' + retry.state;
        const head = retry.state === 'right' ? `<b class="chco-h good"><span>Richtig!</span></b>`
          : retry.state === 'wrong' ? `<b class="chco-h bad"><span>Nicht ganz.</span></b>`
          : retry.state === 'shown' ? `<b class="chco-h"><span>Die Lösung:</span> <span>${show(r.best || '')}</span></b>`
          : retry.state === 'check' ? '<b class="chco-h"><span>Stockfish prüft …</span></b>'
          : `<b class="chco-h"><span>${who} ist am Zug.</span> <span>Finde einen besseren Zug als</span> <span>${show(hist[k].san)}</span></b>`;
        const last = retry.i === retry.list.length - 1;
        el.innerHTML = `<span class="chco-ic k-${retry.state === 'right' ? 'best' : retry.state === 'wrong' ? 'blun' : 'great'}">${retry.state === 'right' ? '✓' : retry.state === 'wrong' ? '✕' : '?'}</span><div class="chco-tx">
          ${head}${retry.msg ? `<p>${retry.msg}</p>` : ''}
          <div class="chco-acts">
            ${retry.state === 'ask' || retry.state === 'wrong' ? '<button class="btn sm ghost" id="rsol"><span>Lösung zeigen</span></button>' : ''}
            ${retry.state === 'right' || retry.state === 'shown' ? `<button class="btn sm primary" id="rnext"><span>${last ? 'Fertig' : 'Nächster Fehler'}</span></button>` : ''}
            <button class="btn sm ghost" id="rend"><span>Beenden</span></button></div>
          <small class="chco-n">${retry.i + 1} / ${retry.list.length}</small></div>`;
        const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
        on('rsol', () => { const bm = r.bestM; retry.state = 'shown'; retry.sol = bm; retry.msg = r.line ? `<span>Beste Fortsetzung:</span> <span>${r.line}</span>` : ''; V.sfx.ui(); render(); });
        on('rnext', () => { V.sfx.ui(); if (last) { const k2 = retry.k; retry = null; view = k2 + 1; render(); V.ui.toast('Gut geübt!'); } else setRetry(retry.i + 1); });
        on('rend', () => { const k2 = retry.k; retry = null; view = k2 + 1; V.sfx.ui(); render(); });
      }
      async function tryMove(m) {
        if (!retry || retry.state !== 'ask') return;
        const k = retry.k, Q = clone(retry.P), uci = sqn(m.f) + sqn(m.t) + (m.promo || ''), top = (rev.info[k].lines[0] || { pv: [] });
        make(Q, m); retry.tried = m; retry.P = Q; retry.state = 'check'; sel = -1; V.sfx.move(); render();
        let ok = top.pv[0] === uci, msg = ok ? 'Genau das ist der beste Zug.' : '';
        if (!ok) {
          // other moves count when they keep (almost) as much as the best one
          let val;
          if (!legal(Q).length) val = inCheck(Q, Q.turn) ? 100000 : 0;
          else { try { const api = await engine(); val = -((await sfLines(api, Q, k + 1, 450))[0] || { s: 0 }).s; } catch (e) { val = -100000; } }
          const bestV = Math.max(-2000, Math.min(2000, top.s || 0)), v = Math.max(-2000, Math.min(2000, val));
          const loss = winP(bestV) - winP(v);
          ok = loss <= 5;
          const played = Math.max(-2000, Math.min(2000, -((rev.info[k + 1].lines[0] || { s: 0 }).s)));
          msg = ok ? `Auch gut. Stockfish mag <b>${show(rev.moves[k].best || '')}</b> noch ein bisschen mehr.` : v > played + 30 ? 'Besser als in der Partie, aber noch nicht der starke Zug.' : 'Das hilft auch nicht weiter. Probier es nochmal.';
        }
        if (!retry || retry.k !== k) return;
        retry.state = ok ? 'right' : 'wrong'; retry.msg = msg; retry.tries++;
        if (ok) { V.sfx.goal(); V.buzz(12); }
        else {
          V.sfx.bad();
          // back to the position after a moment; from the second try on a hint names the piece
          setTimeout(() => {
            if (!retry || retry.k !== k) return;
            const bm = rev.moves[k].bestM, hint = retry.tries >= 2 && bm ? `<span>Tipp: Schau dir</span> <b>${show(rev.pos[k].b[bm.f].toUpperCase() === 'P' ? 'den Bauern' : NAME_A[rev.pos[k].b[bm.f].toLowerCase()])}</b> <span>auf</span> <b>${sqn(bm.f)}</b> <span>an.</span>` : retry.msg;
            Object.assign(retry, { P: clone(rev.pos[k]), state: 'ask', tried: null, msg: hint }); retry.moves = legal(retry.P); render();
          }, 1100);
        }
        render();
      }
      const NAME_A = { n: 'den Springer', b: 'den Läufer', r: 'den Turm', q: 'die Dame', k: 'den König' };
      panel.querySelector('#chf').onclick = () => go(0);
      panel.querySelector('#chp').onclick = () => go((view === null ? hist.length : view) - 1);
      panel.querySelector('#chn').onclick = () => go((view === null ? hist.length : view) + 1);
      panel.querySelector('#chl').onclick = () => go(hist.length);

      // ---------- input: tap a piece and its target, or drag it there ----------
      const canMove = () => !over && !ctx.isAI(numOf[P.turn]);
      function tap(sq) {
        if (retry) {
          if (retry.state !== 'ask') return;
          const R = retry.P, p = R.b[sq];
          if (sel >= 0) { const cand = retry.moves.filter(m => m.f === sel && m.t === sq); if (cand.length) return cand.length > 1 ? promote(cand, tryMove) : tryMove(cand[0]); }
          if (p && side(p) === R.turn && retry.moves.some(m => m.f === sq)) { sel = sel === sq ? -1 : sq; V.sfx.move(); } else sel = -1;
          return render();
        }
        if (view !== null) { go(hist.length); return; }
        if (!canMove()) return;
        const p = P.b[sq];
        if (sel >= 0) {
          const cand = moves.filter(m => m.f === sel && m.t === sq);
          if (cand.length) { if (cand.length > 1) return promote(cand); return doMove(cand[0]); }
        }
        if (p && side(p) === P.turn && moves.some(m => m.f === sq)) { sel = sel === sq ? -1 : sq; V.sfx.move(); }
        else sel = -1;
        render();
      }
      let drag = null, skipClick = false;
      board.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        const d = e.target.closest('.sq'); if (!d) return;
        drag = { sq: +d.dataset.sq, x: e.clientX, y: e.clientY, id: e.pointerId, on: false, ghost: null, hov: null };
        try { board.setPointerCapture(e.pointerId); } catch (x) { }
      });
      board.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.on) {
          if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
          const RP = retry && retry.state === 'ask' ? retry.P : null, RM = RP ? retry.moves : moves;
          const p = (RP || P).b[drag.sq];
          if (RP ? false : (view !== null || !canMove())) { drag = null; return; }
          if (retry && !RP) { drag = null; return; }
          if (!p || side(p) !== (RP || P).turn || !RM.some(m => m.f === drag.sq)) { drag = null; return; }
          drag.on = true; sel = drag.sq; render();
          const src = cells[drag.sq].querySelector('.pc'); if (src) src.classList.add('dragsrc');
          const w = cells[drag.sq].getBoundingClientRect().width;
          drag.ghost = V.el('div', 'chdrag', pc(p)); drag.ghost.style.width = drag.ghost.style.height = w + 'px';
          if (facing() && P.turn === 'b' && !retry) drag.ghost.style.rotate = '180deg';
          document.body.appendChild(drag.ghost);
        }
        drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
        const el = document.elementFromPoint(e.clientX, e.clientY), over = el && el.closest && el.closest('.chess .sq');
        if (drag.hov && drag.hov !== over) drag.hov.classList.remove('hov');
        if (over) over.classList.add('hov'); drag.hov = over;
      });
      const endDrag = e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dg = drag; drag = null; skipClick = true; setTimeout(() => { skipClick = false; }, 400);
        if (dg.hov) dg.hov.classList.remove('hov');
        if (!dg.on) return e.type === 'pointerup' ? tap(dg.sq) : null;
        dg.ghost.remove();
        const t = dg.hov ? +dg.hov.dataset.sq : -1;
        if (retry) { const c2 = retry.moves.filter(m => m.f === dg.sq && m.t === t); if (c2.length > 1) return promote(c2, tryMove); if (c2.length) return tryMove(c2[0]); return render(); }
        const cand = moves.filter(m => m.f === dg.sq && m.t === t);
        if (cand.length > 1) return promote(cand);
        if (cand.length) return doMove(cand[0], true);
        render();
      };
      board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
      // keyboard (Enter on the board cursor) sends a click
      board.addEventListener('click', e => { if (skipClick) return; const d = e.target.closest('.sq'); if (d) tap(+d.dataset.sq); });

      function promote(cand, then = doMove) {
        const w = (retry ? retry.P : P).turn === 'w';
        const pickP = pr => { V.closeModal(); then(cand.find(x => x.promo === pr)); };
        const m = V.openModal(`<div class="confirm"><h3>Umwandlung</h3><p>In welche Figur soll der Bauer werden?</p>
          <div class="promo">${'qrbn'.split('').map((pr, k) => `<button data-p="${pr}">${pc(w ? pr.toUpperCase() : pr)}<small>${NAME[pr]}<kbd class="only-fine">${k + 1}</kbd></small></button>`).join('')}</div></div>`, '', () => render(), false, e => {
          const k = e.key.toLowerCase(), map = { 1: 'q', 2: 'r', 3: 'b', 4: 'n', d: 'q', q: 'q', t: 'r', r: 'r', l: 'b', b: 'b', s: 'n', n: 'n', enter: 'q' };
          if (map[k]) { pickP(map[k]); return true; }
          return k === 'escape';
        });
        m.querySelectorAll('button').forEach(b => b.onclick = () => pickP(b.dataset.p));
      }
      function doMove(m, dragged) {
        const mover = P.turn;
        ctx.moved(numOf[mover], { f: m.f, t: m.t, p: m.promo || null });
        const s = san(P, m, moves);
        if (m.cap) capd[mover].push(m.cap);
        const fromR = cells[m.f].getBoundingClientRect();
        const row = mover === 'w' ? 7 : 0;
        const rook = m.castle ? (m.castle === 'k' ? [row * 8 + 7, row * 8 + 5] : [row * 8, row * 8 + 3]) : null;
        const rookR = rook && cells[rook[0]].getBoundingClientRect();
        make(P, m); last = m; sel = -1; view = null;
        moves = legal(P);
        const chk = inCheck(P, P.turn);
        hist.push({ m, san: s, mover, b: P.b.slice(), chk: chk ? P.kings[P.turn] : -1 });
        // sounds like a real board: move, capture, castle, check
        if (chk) V.sfx.bad(); else if (m.cap) V.sfx.place(); else if (m.castle) { V.sfx.move(); ctx.later(() => V.sfx.move(), 90); } else V.sfx.move();
        const rep = bump();
        const flipNow = flip; layout();
        render();
        if (!dragged && flipNow === flip) V.fx.slide(cells[m.t].querySelector('.pc'), fromR, 200);
        if (rook && flipNow === flip) V.fx.slide(cells[rook[1]].querySelector('.pc'), rookR, 260);
        if (m.promo) ctx.later(() => { V.fx.ringAt(cells[m.t], '#ffd84f'); V.fx.floatAt(cells[m.t], NAME[m.promo] + '!', '#ffd84f'); }, 220);
        if (!moves.length) { finish(); if (chk) ctx.end(numOf[mover], 'Schachmatt'); else ctx.end(0, 'Patt: kein Zug möglich, aber kein Schach. Zählt als Remis'); return; }
        if (rep >= 3) { finish(); ctx.end(0, 'Dreifache Stellungswiederholung'); return; }
        if (P.half >= 100) { finish(); ctx.end(0, '50-Züge-Regel'); return; }
        if (insufficient()) { finish(); ctx.end(0, 'Kein Matt mehr möglich'); return; }
        next(chk);
      }
      // after the game: the review is offered on the end screen and below the board
      let finished = false;
      function finish() {
        over = true; sel = -1;
        if (finished || hist.length < 2) return;
        finished = true;
        ctx.endBtn = { l: 'Partie analysieren', fn: analyse };
        const nav = panel.querySelector('.chx-nav');
        if (!nav.querySelector('.chrv')) { const b = V.el('button', 'chrv', 'Analyse'); b.onclick = analyse; nav.prepend(b); }
      }
      function insufficient() {
        const rest = P.b.filter(p => p && p.toLowerCase() !== 'k');
        return rest.length === 0 || (rest.length === 1 && 'nb'.includes(rest[0].toLowerCase()));
      }

      // ---------- review (like a game review: accuracy, rated moves, the better move) ----------
      let busy = false;
      function analyse() {
        if (rev) return showReview();
        if (busy) return;
        const m = V.openModal(`<div class="chr"><h3>Partie-Analyse</h3><p class="chr-hint">Stockfish rechnet jede Stellung durch …</p><div class="chr-prog"><i style="--w:0%"></i></div></div>`, 'chrm');
        const bar = m.querySelector('.chr-prog i');
        const prog = (i, n) => { if (bar.isConnected) bar.style.setProperty('--w', Math.round(i / n * 100) + '%'); };
        busy = true;
        reviewSF(START, hist, prog).catch(() => review(START, hist, prog)).then(r => {
          busy = false; rev = r; render();
          if (m.isConnected) showReview();
        });
      }
      function showReview() {
        const sides = ['w', 'b'], nm = s => ctx.name(numOf[s]);
        const mv = s => rev.moves.map((x, k) => Object.assign({ k }, x)).filter(x => hist[x.k].mover === s);
        const avg = l => l.length ? l.reduce((a, x) => a + x.acc, 0) / l.length : null;
        const acc = s => avg(mv(s)) || 0;
        const count = (s, kind) => mv(s).filter(x => x.kind === kind).length;
        // a rough playing strength from the accuracy (only an estimate, like the "game rating" of the big sites)
        const elo = a => Math.max(250, Math.round(2900 * Math.pow(a / 100, 4.5) / 50) * 50);
        const PH = [['open', 'Eröffnung'], ['mid', 'Mittelspiel'], ['end', 'Endspiel']];
        const phase = (s, ph) => { const a = avg(mv(s).filter(x => x.phase === ph)); return a === null ? '–' : `<span class="ph ${a >= 90 ? 'k-best' : a >= 75 ? 'k-good' : a >= 60 ? 'k-inacc' : a >= 45 ? 'k-mist' : 'k-blun'}">${Math.round(a)}</span>`; };
        // key moments: the three moves that changed the game most
        const keys = rev.moves.map((x, k) => Object.assign({ k }, x)).filter(x => ['mist', 'blun', 'miss', 'brill', 'great'].includes(x.kind))
          .sort((a, b) => (b.kind === 'brill') - (a.kind === 'brill') || (b.loss || 0) - (a.loss || 0)).slice(0, 3).sort((a, b) => a.k - b.k);
        // practice: the weak moves of the human players (against the AI only your own)
        const human = s => !ctx.isAI(numOf[s]);
        const practice = rev.sf ? rev.moves.map((x, k) => ({ x, k })).filter(o => ['mist', 'blun', 'miss'].includes(o.x.kind) && human(hist[o.k].mover)).map(o => o.k) : [];
        const n1 = s => esc(nm(s));
        const pts = rev.evals.map((e, k) => [k / Math.max(1, rev.evals.length - 1) * 100, 100 - winP(e)]);
        const graphSvg = `<div class="chg big"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100 ${pts.map(p => 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ')} L100 100Z" fill="#f2f2f2"/><path d="M0 50H100" class="mid"/></svg><span class="chg-dots">${rev.moves.map((x, k) => ['mist', 'blun', 'miss', 'brill', 'great'].includes(x.kind) ? `<i class="k-${x.kind}" style="left:${pts[k + 1][0].toFixed(2)}%;top:${pts[k + 1][1].toFixed(2)}%"></i>` : '').join('')}</span></div>`;
        const m = V.openModal(`<div class="chr"><div class="chr-h"><h3>Partie-Analyse</h3><small>${rev.sf ? 'Stockfish 19' : 'Versus-Engine'}</small></div>
          <div class="chr-acc">${sides.map(s => `<div class="${s}"><small><span>${n1(s)}</span> · <span>${s === 'w' ? 'Weiß' : 'Schwarz'}</span></small><b>${acc(s).toFixed(1)}</b><small>Genauigkeit</small>
            ${rev.sf && mv(s).length >= 8 ? `<em class="chr-elo"><span>Spielstärke ca.</span> <span>${elo(acc(s))}</span></em>` : ''}</div>`).join('')}</div>
          ${graphSvg}
          ${keys.length ? `<div class="chr-keys"><h4>Schlüsselmomente</h4>${keys.map(x => { const kd = KIND.find(z => z[0] === x.kind); return `<button data-go="${x.k + 1}" class="chr-key"><span class="kd k-${x.kind}">${kd[1]}</span><span class="km"><b>${Math.floor(x.k / 2) + 1}${x.k % 2 ? '…' : '.'} ${show(hist[x.k].san)}</b> <span>${kd[2]}</span></span><span class="kw">${x.why || ''}</span></button>`; }).join('')}</div>` : ''}
          <div class="chr-tab">${KIND.map(([k, sym, label]) => `<span class="kd k-${k}">${sym}</span><span>${label}</span><span class="c">${count('w', k)}</span><span class="c">${count('b', k)}</span>`).join('')}</div>
          ${rev.sf && rev.moves.length >= 12 ? `<div class="chr-ph"><span></span><b>Weiß</b><b>Schwarz</b>${PH.map(([k, l]) => `<span>${l}</span>${phase('w', k)}${phase('b', k)}`).join('')}</div>` : ''}
          <div class="actions">${practice.length ? `<button class="btn primary" id="chrtry"><span>Fehler üben (${practice.length})</span></button>` : ''}<button class="btn ${practice.length ? '' : 'primary'}" id="chrgo"><span>Züge ansehen</span></button></div>
          <p class="chr-hint">Kostenlos und so oft du willst. Tippe auf einen Schlüsselmoment oder in der Zugliste auf einen Zug, dann erklärt dir der Coach, was dort passiert ist.</p></div>`, 'chrm');
        m.querySelector('#chrgo').onclick = () => {
          V.closeModal();
          const k = rev.moves.findIndex(x => x.kind === 'blun' || x.kind === 'mist' || x.kind === 'miss');
          go(k >= 0 ? k + 1 : 1);
        };
        const t = m.querySelector('#chrtry'); if (t) t.onclick = () => { V.closeModal(); startRetry(practice); };
        m.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { V.closeModal(); go(+b.dataset.go); });
      }

      function next(chk) {
        const s = numOf[P.turn];
        const base = ctx.isAI(s) ? ctx.who(s) + ' ist dran' : (ctx.name(s) === 'Du' ? 'Du bist dran' : ctx.who(s) + ' ist dran');
        ctx.turn(s, (chk ? '<b style="color:var(--bad)">Schach!</b> · ' : '') + base);
        const PN = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };
        if (ctx.isAI(s)) ctx.aiTurn({
          // Leicht: 1 ply + captures, soft choice (misses tactics). Mittel: 2 plies + captures, small slips.
          // Schwer: 4 plies exact. Profi: iterative deepening up to 8 plies within ~2.8 s.
          think: () => {
            const L = ctx.level;
            const r = L === 0 && Math.random() < 0.25 ? { move: V.pick(moves), score: 0 } : think(P, [1, 1, 3, 8][L], [1500, 1500, 1200, 2600][L], [220, 60, 0, 0][L]);
            return { move: r.move, mood: V.mood(r.score, 450) };
          },
          targets: m => [cells[m.f], cells[m.t]],
          decoys: m => V.shuffle(moves.filter(x => x.f !== m.f).map(x => cells[x.f])),
          apply: doMove,
          decode: r => (r && moves.find(x => x.f === r.f && x.t === r.t && (x.promo || null) === (r.p || null))) || null,
          say: m => {
            if (m.castle) return m.castle === 'k' ? 'Kurze Rochade' : 'Lange Rochade';
            const pn = PN[P.b[m.f].toLowerCase()];
            return `${pn} ${m.cap ? 'schlägt ' : ''}${sqn(m.t)}${m.promo ? ' wird ' + NAME[m.promo] : ''}`;
          }
        });
      }
      addEventListener('resize', () => board.style.setProperty('--sq', (board.clientWidth / 8 || 40) + 'px'));
      render(); next(false);
      // giving up, the clock or a dropped opponent end the game from outside: the review is offered there too
      return { ended() { finish(); render(); } };
    }
  });
})();
