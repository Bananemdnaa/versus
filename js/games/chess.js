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

  V.css(`
  .chesswrap{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:6px}
  .capt{display:flex;gap:1px;min-height:22px;font-size:18px;line-height:1;align-items:center;flex-wrap:wrap}
  .capt span{opacity:.85} .capt .w{color:#f3f3ff;text-shadow:0 0 1px #000} .capt .b{color:#121225;text-shadow:0 0 1px #fff}
  .capt em{font-style:normal;font-size:12px;color:var(--muted);margin-left:6px}
  .chess{display:grid;grid-template-columns:repeat(8,1fr);border-radius:12px;overflow:hidden;border:2px solid #4a52a0;box-shadow:0 0 0 1px rgba(98,240,255,.18),0 0 46px -12px var(--cy);user-select:none;-webkit-user-select:none;touch-action:manipulation}
  .chess .sq{aspect-ratio:1;position:relative;display:grid;place-items:center;font-size:clamp(26px,9.4vw,52px);line-height:1;cursor:pointer}
  .chess .lt{background:#272c5c} .chess .dk{background:#1a1d40}
  .chess .lastm.lt{background:#3b3474} .chess .lastm.dk{background:#2f2963}
  .chess .lastm{box-shadow:inset 0 0 0 2px rgba(255,79,216,.5)}
  .chess .sel{box-shadow:inset 0 0 0 4px var(--cy)}
  .chess .chk{background:radial-gradient(circle,#ff5d73 0,#ff5d73 30%,transparent 72%)!important;animation:chk 1s ease-in-out infinite}
  @keyframes chk{50%{filter:brightness(1.35)}}
  .chess .pc{display:block;position:relative;z-index:2;transition:transform .15s}
  .chess .sel .pc{transform:scale(1.12) translateY(-2px)}
  .chess .dot::after,.chess .ring::after{animation:miniIn .25s var(--spring)}
  .chess .pw{color:#fff;text-shadow:0 0 1px #000,0 0 8px color-mix(in srgb,var(--p1) 80%,transparent),0 2px 3px rgba(0,0,0,.6)}
  .chess .pb{color:#07070f;-webkit-text-stroke:.8px var(--p2);text-shadow:0 0 8px color-mix(in srgb,var(--p2) 70%,transparent),0 2px 3px rgba(0,0,0,.6)}
  .chess .dot::after{content:'';position:absolute;width:28%;height:28%;border-radius:50%;background:rgba(98,240,255,.5);box-shadow:0 0 10px rgba(98,240,255,.6)}
  .chess .ring::after{content:'';position:absolute;inset:6%;border-radius:50%;box-shadow:inset 0 0 0 4px rgba(98,240,255,.6)}
  .chess .co{position:absolute;font-family:var(--f-d);font-size:10px;font-weight:600;opacity:.7}
  .chess .co.f{bottom:2px;right:4px} .chess .co.r{top:2px;left:4px}
  .chess .lt .co{color:#8189d0} .chess .dk .co{color:#6b73ba}
  /* Holz (Optionen → Spielbrett) */
  .bd-wood .chess{border:6px solid #5d3a1c;box-shadow:0 18px 40px -14px rgba(0,0,0,.8)}
  .bd-wood .chess .lt{background:#ecd3a6} .bd-wood .chess .dk{background:#b5835a}
  .bd-wood .chess .lastm.lt{background:#e8d47c} .bd-wood .chess .lastm.dk{background:#c9a24f} .bd-wood .chess .lastm{box-shadow:none}
  .bd-wood .chess .pw{color:#fffaf0;text-shadow:0 0 1px #000,0 0 2px #000,0 2px 2px rgba(0,0,0,.45)}
  .bd-wood .chess .pb{color:#1c120a;-webkit-text-stroke:0;text-shadow:0 0 1px rgba(255,255,255,.6),0 2px 2px rgba(0,0,0,.35)}
  .bd-wood .chess .dot::after{background:rgba(60,30,10,.35);box-shadow:none} .bd-wood .chess .ring::after{box-shadow:inset 0 0 0 4px rgba(60,30,10,.45)}
  .bd-wood .chess .lt .co{color:#9a6a40} .bd-wood .chess .dk .co{color:#f0d9b0}
  .promo{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .promo button{aspect-ratio:1;border-radius:12px;background:#b9bce6;font-size:44px;display:grid;place-items:center;border:2px solid transparent}
  .promo button:hover{border-color:var(--cy)} .promo small{display:block;font-size:11px;color:#1d1d3a;font-family:var(--f-b)}`);

  const cm = (rows, extra) => V.mini(rows, Object.assign({
    K: { c: 'pw', t: '♚︎' }, Q: { c: 'pw', t: '♛︎' }, R: { c: 'pw', t: '♜︎' }, B: { c: 'pw', t: '♝︎' }, N: { c: 'pw', t: '♞︎' }, P: { c: 'pw', t: '♟︎' },
    k: { c: 'pb', t: '♚︎' }, q: { c: 'pb', t: '♛︎' }, r: { c: 'pb', t: '♜︎' }, b: { c: 'pb', t: '♝︎' }, n: { c: 'pb', t: '♞︎' }, p: { c: 'pb', t: '♟︎' },
    '*': { c: 'tg' }, '.': { c: '' }
  }, extra || {}), { checker: true, w: 230 });

  V.register({
    id: 'chess', name: 'Schach', cat: 'Strategie', order: 1, accent: 'var(--cyan)',
    // "Gegenüber sitzen": the board turns to player 2 on their turn (it has an up and down)
    turnBoard: true,
    short: 'Der König aller Brettspiele.',
    desc: 'Setz den gegnerischen König schachmatt. Mit allen Regeln: Rochade, en passant, Umwandlung und Remis.',
    sides: { 1: 'Weiß', 2: 'Schwarz' },
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Figur nehmen, dann Zielfeld'], ['1–4', 'Bei Umwandlung: Dame, Turm, Läufer, Springer']],
    firstTitle: 'Deine Farbe', firstLabels: ['Weiß', 'Schwarz', 'Zufall'],
    options: [{ id: 'clock', label: 'Schachuhr', def: 0, modes: ['local', 'online', 'open'], choices: [[0, 'Aus'], [3, '3 Min'], [5, '5 Min'], [10, '10 Min']] }],
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
      const P = initial();
      const sideOf = { 1: 'w', 2: 'b' }, numOf = { w: 1, b: 2 };
      const flip = ctx.mode === 'ai' && ctx.aiSide === 1;
      const reps = new Map();
      const key = () => P.b.join(',') + P.turn + JSON.stringify(P.cs) + P.ep;
      const bump = () => { const k = key(); reps.set(k, (reps.get(k) || 0) + 1); return reps.get(k); };
      bump();
      let sel = -1, moves = legal(P), last = null, over = false;
      const capd = { w: [], b: [] };
      const wrap = V.el('div', 'chesswrap'), topC = V.el('div', 'capt'), botC = V.el('div', 'capt'), board = V.el('div', 'chess');
      wrap.append(topC, board, botC); ctx.stage.appendChild(wrap);
      const order = [...Array(64).keys()]; if (flip) order.reverse();
      order.forEach((sq, k) => {
        const d = V.el('div', 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt')); d.dataset.sq = sq;
        board.appendChild(d);
      });
      const cells = {}; [...board.children].forEach(d => cells[+d.dataset.sq] = d);
      board.addEventListener('click', e => { const d = e.target.closest('.sq'); if (d) tap(+d.dataset.sq); });
      const squares = [...board.children];
      ctx.nav(() => squares, { pad: 1, start: () => flip ? 11 : 52 });

      function render() {
        const chk = inCheck(P, P.turn) ? P.kings[P.turn] : -1;
        const targets = sel >= 0 ? moves.filter(m => m.f === sel) : [];
        for (let sq = 0; sq < 64; sq++) {
          const d = cells[sq], p = P.b[sq];
          const base = 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dk' : 'lt');
          let cls = base + (p ? (isW(p) ? ' pw' : ' pb') : '');
          if (last && (sq === last.f || sq === last.t)) cls += ' lastm';
          if (sq === sel) cls += ' sel';
          if (sq === chk) cls += ' chk';
          const tg = targets.find(m => m.t === sq);
          if (tg) cls += tg.cap ? ' ring' : ' dot';
          d.className = cls;
          const r = sq >> 3, c = sq & 7;
          let co = '';
          if (r === (flip ? 0 : 7)) co += `<span class="co f">${'abcdefgh'[c]}</span>`;
          if (c === (flip ? 7 : 0)) co += `<span class="co r">${8 - r}</span>`;
          d.innerHTML = (p ? `<span class="pc">${g(p)}</span>` : '') + co;
        }
        const mat = s => capd[s].reduce((a, p) => a + VAL[p.toLowerCase()], 0);
        const line = s => {
          const diff = (mat(s) - mat(s === 'w' ? 'b' : 'w')) / 100;
          return capd[s].sort((a, b) => VAL[b.toLowerCase()] - VAL[a.toLowerCase()]).map(p => `<span class="${isW(p) ? 'w' : 'b'}">${g(p)}</span>`).join('') + (diff > 0 ? `<em>+${diff}</em>` : '');
        };
        // capd.w = pieces white has captured
        topC.innerHTML = line(flip ? 'w' : 'b'); botC.innerHTML = line(flip ? 'b' : 'w');
      }
      function tap(sq) {
        if (over || ctx.isAI(numOf[P.turn])) return;
        const p = P.b[sq];
        if (sel >= 0) {
          const cand = moves.filter(m => m.f === sel && m.t === sq);
          if (cand.length) {
            if (cand.length > 1) return promote(cand);
            return doMove(cand[0]);
          }
        }
        if (p && side(p) === P.turn && moves.some(m => m.f === sq)) { sel = sq; V.sfx.move(); }
        else sel = -1;
        render();
      }
      function promote(cand) {
        const w = P.turn === 'w';
        const pickP = pr => { V.closeModal(); doMove(cand.find(x => x.promo === pr)); };
        const m = V.openModal(`<div class="confirm"><h3>Umwandlung</h3><p>In welche Figur soll der Bauer werden?</p>
          <div class="promo">${'qrbn'.split('').map((pr, k) => `<button data-p="${pr}" style="color:${w ? '#fafaff' : '#14142a'};text-shadow:0 0 2px ${w ? '#000' : '#fff'}">${g(pr)}<small>${NAME[pr]}<kbd class="only-fine">${k + 1}</kbd></small></button>`).join('')}</div></div>`, '', null, false, e => {
          const k = e.key.toLowerCase(), map = { 1: 'q', 2: 'r', 3: 'b', 4: 'n', d: 'q', q: 'q', t: 'r', r: 'r', l: 'b', b: 'b', s: 'n', n: 'n', enter: 'q' };
          if (map[k]) { pickP(map[k]); return true; }
          return k === 'escape';
        });
        m.querySelectorAll('button').forEach(b => b.onclick = () => pickP(b.dataset.p));
      }
      function doMove(m) {
        const mover = P.turn;
        ctx.moved(numOf[mover], { f: m.f, t: m.t, p: m.promo || null });
        if (m.cap) capd[mover].push(m.cap);
        const fromR = cells[m.f].getBoundingClientRect();
        const row = mover === 'w' ? 7 : 0;
        const rook = m.castle ? (m.castle === 'k' ? [row * 8 + 7, row * 8 + 5] : [row * 8, row * 8 + 3]) : null;
        const rookR = rook && cells[rook[0]].getBoundingClientRect();
        make(P, m); last = m; sel = -1;
        moves = legal(P);
        if (m.cap) V.sfx.place(); else V.sfx.move();
        const rep = bump();
        render();
        V.fx.slide(cells[m.t].querySelector('.pc'), fromR, 240);
        if (rook) V.fx.slide(cells[rook[1]].querySelector('.pc'), rookR, 300);
        if (m.cap) ctx.later(() => V.fx.burstAt(cells[m.t], m.cap === m.cap.toUpperCase() ? '#fafaff' : '#6ff3ff', 12, 60), 200);
        if (m.promo) ctx.later(() => { V.fx.ringAt(cells[m.t], '#ffd84f'); V.fx.floatAt(cells[m.t], NAME[m.promo] + '!', '#ffd84f'); }, 220);
        const chk = inCheck(P, P.turn);
        if (chk) ctx.later(() => { V.fx.ringAt(cells[P.kings[P.turn]], '#ff5d73'); V.fx.shake(board, true); }, 220);
        if (!moves.length) { over = true; if (chk) ctx.end(numOf[mover], 'Schachmatt'); else ctx.end(0, 'Patt'); return; }
        if (rep >= 3) { over = true; ctx.end(0, 'Dreifache Stellungswiederholung'); return; }
        if (P.half >= 100) { over = true; ctx.end(0, '50-Züge-Regel'); return; }
        if (insufficient()) { over = true; ctx.end(0, 'Kein Matt mehr möglich'); return; }
        next(chk);
      }
      function insufficient() {
        const rest = P.b.filter(p => p && p.toLowerCase() !== 'k');
        return rest.length === 0 || (rest.length === 1 && 'nb'.includes(rest[0].toLowerCase()));
      }
      function next(chk) {
        const s = numOf[P.turn];
        const base = ctx.isAI(s) ? ctx.who(s) + ' ist dran' : (ctx.name(s) === 'Du' ? 'Du bist dran' : ctx.who(s) + ' ist dran');
        ctx.turn(s, (chk ? '<b style="color:var(--bad)">Schach!</b> · ' : '') + base);
        const sqn = q => 'abcdefgh'[q & 7] + (8 - (q >> 3));
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
      render(); next(false);
    }
  });
})();
