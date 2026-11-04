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
  const KIND = [
    ['best', '★', 'Bester Zug'], ['exc', '!', 'Exzellent'], ['good', '✓', 'Gut'],
    ['inacc', '?!', 'Ungenauigkeit'], ['mist', '?', 'Fehler'], ['blun', '??', 'Patzer']
  ];
  function rateMove(d, isBest) { return isBest || d <= 1 ? 'best' : d <= 3 ? 'exc' : d <= 7 ? 'good' : d <= 14 ? 'inacc' : d <= 25 ? 'mist' : 'blun'; }
  // positions: the game from the start; cb(progress) while working; resolves with ratings per move
  function review(start, plies, prog) {
    return new Promise(done => {
      const pos = [clone(start)], res = [];
      { const P = clone(start); for (const h of plies) { make(P, h.m); pos.push(clone(P)); } }
      const evals = [];
      let i = 0;
      const step = () => {
        const P = pos[i], ms = legal(P);
        let s, best = null;
        if (!ms.length) s = inCheck(P, P.turn) ? -100000 : 0;
        else { const r = think(P, 3, 260, 0); s = r.score; best = r.move; }
        const cp = Math.max(-2000, Math.min(2000, s));
        evals.push({ w: P.turn === 'w' ? cp : -cp, best, turn: P.turn });
        i++; prog && prog(i, pos.length);
        if (i < pos.length) return setTimeout(step, 0);
        for (let k = 0; k < plies.length; k++) {
          const e = evals[k], w = e.turn === 'w';
          const bestV = w ? e.w : -e.w, played = w ? evals[k + 1].w : -evals[k + 1].w;
          const dW = Math.max(0, winP(bestV) - winP(played));
          const isBest = !!(e.best && e.best.f === plies[k].m.f && e.best.t === plies[k].m.t && (e.best.promo || '') === (plies[k].m.promo || ''));
          res.push({ kind: rateMove(dW, isBest), acc: accOf(dW), best: e.best && !isBest && dW > 7 ? san(pos[k], e.best, legal(pos[k])) : '' });
        }
        done({ moves: res, evals: evals.map(e => e.w) });
      };
      setTimeout(step, 30);
    });
  }
  V.css(`
  .chesswrap{width:min(var(--bw),620px,100%);display:flex;flex-direction:column;gap:6px;--lt:#ebecd0;--dk:#739552;--lml:#f5f682;--lmd:#b9ca43;--dot:rgba(0,0,0,.16);--col:#739552;--cod:#ebecd0}
  .chesswrap.th-neon{--lt:#272c5c;--dk:#1a1d40;--lml:#3b3474;--lmd:#2f2963;--dot:rgba(98,240,255,.5);--col:#8189d0;--cod:#6b73ba}
  .bd-wood .chesswrap{--lt:#ecd3a6;--dk:#b5835a;--lml:#e8d47c;--lmd:#c9a24f;--dot:rgba(60,30,10,.3);--col:#9a6a40;--cod:#f0d9b0}
  .capt{display:flex;gap:0;min-height:22px;align-items:center;flex-wrap:wrap}
  .capt i{display:block;width:20px;height:20px;margin-right:-6px} .capt i svg{width:100%;height:100%;display:block}
  .capt em{font-style:normal;font-size:12px;font-weight:700;color:var(--muted);margin-left:10px}
  .chess{display:grid;grid-template-columns:repeat(8,1fr);border-radius:4px;overflow:hidden;box-shadow:0 10px 30px -12px rgba(0,0,0,.7);user-select:none;-webkit-user-select:none;touch-action:none;position:relative}
  .th-neon .chess{border-radius:12px;border:2px solid #4a52a0;box-shadow:0 0 0 1px rgba(98,240,255,.18),0 0 46px -12px var(--cy)}
  .bd-wood .chess{border:6px solid #5d3a1c;box-shadow:0 18px 40px -14px rgba(0,0,0,.8)}
  .chess .sq{aspect-ratio:1;position:relative;display:grid;place-items:center;cursor:pointer;min-width:0}
  .chess .lt{background:var(--lt)} .chess .dk{background:var(--dk)}
  .chess .lastm.lt,.chess .sel.lt{background:var(--lml)} .chess .lastm.dk,.chess .sel.dk{background:var(--lmd)}
  .th-neon .chess .lastm{box-shadow:inset 0 0 0 2px rgba(255,79,216,.5)} .th-neon .chess .sel{box-shadow:inset 0 0 0 4px var(--cy)}
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
  .chx-ml{display:flex;flex-wrap:wrap;gap:2px 4px;max-height:76px;overflow-y:auto;font:600 13px/1.2 var(--f-b);scrollbar-width:thin}
  .chx-ml:empty::before{content:attr(data-empty);color:var(--dim);font-weight:500}
  .chx-ml .n{color:var(--dim);padding:4px 0 4px 4px;font-variant-numeric:tabular-nums}
  .chx-ml button{padding:4px 6px;border-radius:5px;color:var(--fg);display:inline-flex;align-items:center;gap:3px;font:inherit}
  .chx-ml button.cur{background:var(--panel3)}
  .chx-ml button i{font-style:normal;font-weight:800;font-size:11px}
  .chx-view{font:600 12px/1.2 var(--f-b);color:var(--cyan)}
  .k-best{background:#5c8bb0} .k-exc{background:#3fa463} .k-good{background:#82a75a} .k-inacc{background:#e6a22e} .k-mist{background:#e5762b} .k-blun{background:#ca3431}
  .t-best{color:#78a9d1} .t-exc{color:#4cc778} .t-good{color:#9cc46e} .t-inacc{color:#f2b543} .t-mist{color:#f08a45} .t-blun{color:#f0504c}
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
  .chr-tab .kd{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 11px/1 var(--f-b)}
  .chr-tab .c{font:800 15px/1 var(--f-d);text-align:center;min-width:24px}
  .chr-prog{height:8px;border-radius:4px;background:var(--panel3);overflow:hidden} .chr-prog i{display:block;height:100%;width:var(--w);background:var(--good);transition:width .2s}
  .chr-hint{font-size:13px;color:var(--muted);margin:0}`);

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
    options: [{ id: 'theme', label: 'Brett', group: 'board', desc: 'Grün wie im Schachverein oder im Versus-Neon.', short: v => v === 'neon' ? 'Neon-Brett' : '', def: 'green', choices: [['green', 'Grün'], ['neon', 'Neon']] },
      { id: 'flipb', label: 'Brett drehen', group: 'board', desc: 'Am Gerät nebeneinander: Das Brett dreht sich zu dem, der dran ist. Sitzt ihr euch gegenüber, drehen sich stattdessen die Figuren.', short: v => v ? 'Brett dreht mit' : '', def: 0, modes: ['local'], choices: [[0, 'Aus'], [1, 'Mitdrehen']] },
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
      const capd = { w: [], b: [] };
      const theme = ctx.opts && ctx.opts.theme === 'neon' ? 'neon' : 'green';
      const wrap = V.el('div', 'chesswrap th-' + theme), topC = V.el('div', 'capt'), botC = V.el('div', 'capt'), board = V.el('div', 'chess');
      const panel = V.el('div', 'chx', `<div class="chx-top"><span class="chx-op" id="chop"></span><span class="chx-nav">
          <button id="chf" aria-label="Zum Anfang">⏮</button><button id="chp" aria-label="Zug zurück">◀</button><button id="chn" aria-label="Zug vor">▶</button><button id="chl" aria-label="Zum aktuellen Zug">⏭</button></span></div>
        <div class="chx-ml" id="chml" data-empty="${V.t ? V.t('Hier stehen gleich die Züge.') : 'Hier stehen gleich die Züge.'}"></div>`);
      wrap.append(topC, board, botC, panel); ctx.stage.appendChild(wrap);
      for (let sq = 0; sq < 64; sq++) { const d = V.el('div', 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt')); d.dataset.sq = sq; board.appendChild(d); }
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
        order.forEach(sq => board.appendChild(cells[sq]));
      }
      layout();
      ctx.nav(() => [...board.children], { pad: 1, start: () => 52 - (flip ? 41 : 0) });

      // ---------- drawing ----------
      function render() {
        const live = view === null;
        const h = live ? null : hist[view - 1];
        const b = live ? P.b : view === 0 ? START.b : h.b;
        const lm = live ? last : h ? h.m : null;
        const chk = live ? (inCheck(P, P.turn) ? P.kings[P.turn] : -1) : h && h.chk >= 0 ? h.chk : -1;
        const targets = live && sel >= 0 ? moves.filter(m => m.f === sel) : [];
        const mark = rev && lm && !live && view > 0 ? rev.moves[view - 1] : rev && live && hist.length && last === hist[hist.length - 1].m ? rev.moves[hist.length - 1] : null;
        for (let sq = 0; sq < 64; sq++) {
          const d = cells[sq], p = b[sq];
          let cls = 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt');
          if (lm && (sq === lm.f || sq === lm.t)) cls += ' lastm';
          if (sq === sel && live) cls += ' sel';
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
        let h = '';
        hist.forEach((x, k) => {
          if (k % 2 === 0) h += `<span class="n">${k / 2 + 1}.</span>`;
          const r = rev && rev.moves[k], kd = r ? KIND.find(z => z[0] === r.kind) : null;
          h += `<button data-k="${k + 1}" class="${cur === k + 1 ? 'cur' : ''}${r ? ' t-' + r.kind : ''}">${show(x.san)}${kd && r.kind !== 'good' ? `<i>${kd[1]}</i>` : ''}</button>`;
        });
        ml.innerHTML = h;
        ml.querySelectorAll('[data-k]').forEach(b => b.onclick = () => go(+b.dataset.k));
        const c = ml.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); else ml.scrollTop = ml.scrollHeight;
        const op = opening(hist.map(x => x.san.replace(/[+#]/g, '')));
        const r = rev && view !== null && view > 0 ? rev.moves[view - 1] : null;
        const kd = r && KIND.find(z => z[0] === r.kind);
        panel.querySelector('#chop').innerHTML = r ? `<span class="t-${r.kind}"><b>${show(hist[view - 1].san)}</b> <span>${kd[2]}</span></span>${r.best ? ` · Besser: <b>${show(r.best)}</b>` : ''}`
          : view !== null ? `<span class="chx-view">Rückblick · Zug ${Math.ceil(view / 2) || 0}</span>` : op ? `<b>${op}</b>` : '';
        panel.querySelector('#chf').disabled = panel.querySelector('#chp').disabled = cur === 0;
        panel.querySelector('#chn').disabled = panel.querySelector('#chl').disabled = cur === hist.length;
      }
      // looking back through the game (the live game goes on when you move or tap ⏭)
      function go(k) {
        k = Math.max(0, Math.min(hist.length, k));
        view = k === hist.length ? null : k; sel = -1; V.sfx.tick(); render();
      }
      panel.querySelector('#chf').onclick = () => go(0);
      panel.querySelector('#chp').onclick = () => go((view === null ? hist.length : view) - 1);
      panel.querySelector('#chn').onclick = () => go((view === null ? hist.length : view) + 1);
      panel.querySelector('#chl').onclick = () => go(hist.length);

      // ---------- input: tap a piece and its target, or drag it there ----------
      const canMove = () => !over && !ctx.isAI(numOf[P.turn]);
      function tap(sq) {
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
          const p = P.b[drag.sq];
          if (view !== null || !canMove() || !p || side(p) !== P.turn || !moves.some(m => m.f === drag.sq)) { drag = null; return; }
          drag.on = true; sel = drag.sq; render();
          const src = cells[drag.sq].querySelector('.pc'); if (src) src.classList.add('dragsrc');
          const w = cells[drag.sq].getBoundingClientRect().width;
          drag.ghost = V.el('div', 'chdrag', pc(p)); drag.ghost.style.width = drag.ghost.style.height = w + 'px';
          if (facing() && P.turn === 'b') drag.ghost.style.rotate = '180deg';
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
        const cand = moves.filter(m => m.f === dg.sq && m.t === t);
        if (cand.length > 1) return promote(cand);
        if (cand.length) return doMove(cand[0], true);
        render();
      };
      board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
      // keyboard (Enter on the board cursor) sends a click
      board.addEventListener('click', e => { if (skipClick) return; const d = e.target.closest('.sq'); if (d) tap(+d.dataset.sq); });

      function promote(cand) {
        const w = P.turn === 'w';
        const pickP = pr => { V.closeModal(); doMove(cand.find(x => x.promo === pr)); };
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
      function finish() {
        over = true;
        if (hist.length < 2) return;
        ctx.endBtn = { l: 'Partie analysieren', fn: analyse };
        const nav = panel.querySelector('.chx-nav');
        if (!nav.querySelector('.chrv')) { const b = V.el('button', 'chrv', 'Analyse'); b.onclick = analyse; nav.prepend(b); }
      }
      function insufficient() {
        const rest = P.b.filter(p => p && p.toLowerCase() !== 'k');
        return rest.length === 0 || (rest.length === 1 && 'nb'.includes(rest[0].toLowerCase()));
      }

      // ---------- review (like a game review: accuracy, rated moves, the better move) ----------
      function analyse() {
        if (rev) return showReview();
        const m = V.openModal(`<div class="chr"><h3>Partie-Analyse</h3><p class="chr-hint">Versus rechnet jede Stellung durch …</p><div class="chr-prog"><i style="--w:0%"></i></div></div>`, 'chrm');
        const bar = m.querySelector('.chr-prog i');
        review(START, hist, (i, n) => { if (bar.isConnected) bar.style.setProperty('--w', Math.round(i / n * 100) + '%'); }).then(r => {
          rev = r; render();
          if (m.isConnected) showReview();
        });
      }
      function showReview() {
        const acc = s => { const l = rev.moves.filter((x, k) => hist[k].mover === s); return l.length ? (l.reduce((a, x) => a + x.acc, 0) / l.length) : 0; };
        const count = (s, kind) => rev.moves.filter((x, k) => hist[k].mover === s && x.kind === kind).length;
        const nm = s => ctx.name(numOf[s]);
        // the eval graph: white's winning chance over the game
        const pts = rev.evals.map((e, k) => [k / Math.max(1, rev.evals.length - 1) * 100, 100 - winP(e)]);
        const graph = `<svg class="chr-graph" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100 ${pts.map(p => 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ')} L100 100Z" fill="#f4f4f4"/><path d="M0 50H100" stroke="#888" stroke-width=".6"/></svg>`;
        const m = V.openModal(`<div class="chr"><h3>Partie-Analyse</h3>
          <div class="chr-acc"><div class="w"><small><span>${esc(nm('w'))}</span> · <span>Weiß</span></small><b>${acc('w').toFixed(1)}</b><small>Genauigkeit</small></div><div class="b"><small><span>${esc(nm('b'))}</span> · <span>Schwarz</span></small><b>${acc('b').toFixed(1)}</b><small>Genauigkeit</small></div></div>
          ${graph}
          <div class="chr-tab">${KIND.map(([k, sym, label]) => `<span class="kd k-${k}">${sym}</span><span>${label}</span><span class="c">${count('w', k)}</span><span class="c">${count('b', k)}</span>`).join('')}</div>
          <p class="chr-hint">Tipp: In der Zugliste unter dem Brett sind die Züge jetzt markiert. Tippe einen an, dann siehst du die Stellung und den besseren Zug.</p>
          <div class="actions"><button class="btn primary" id="chrgo"><span>Züge ansehen</span></button></div></div>`, 'chrm');
        m.querySelector('#chrgo').onclick = () => {
          V.closeModal();
          // jump to the first big mistake, otherwise to the start
          const k = rev.moves.findIndex(x => x.kind === 'blun' || x.kind === 'mist');
          go(k >= 0 ? k + 1 : 1);
        };
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
    }
  });
})();
