(function () {
  // Minenjagd: minesweeper for 2 to 4. Tap a hidden field: a mine is yours (+1) and you go again,
  // a safe field shows its number and the next player is on. Everybody has one bomb (opens 3x3, takes its mines).
  // An opening is revealed at the start, so nobody has to guess blindly. Odd mine counts: no draws between two.
  // The bomb works like a tap: with at least one mine in it you go again.
  // Move: index of the field, or 1000 + index for a bomb on that field.
  const SIZES = { s: [8, 8, 13], m: [9, 10, 19], l: [9, 13, 25] };
  const BOMB = 1000;

  function nbrs(R, C) {
    const out = [];
    for (let i = 0; i < R * C; i++) {
      const r = i / C | 0, c = i % C, l = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < R && cc >= 0 && cc < C) l.push(rr * C + cc);
      }
      out.push(l);
    }
    return out;
  }
  const area = (R, C, i) => { const r = i / C | 0, c = i % C, l = []; for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) if (rr >= 0 && rr < R && cc >= 0 && cc < C) l.push(rr * C + cc); return l; };

  // lay the mines and pick a starting opening (a field without neighbouring mines that opens a decent area)
  function deal(R, C, M, rng, NB) {
    for (let tries = 0; ; tries++) {
      const mine = new Uint8Array(R * C), idx = [...Array(R * C).keys()];
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      for (let k = 0; k < M; k++) mine[idx[k]] = 1;
      const num = new Uint8Array(R * C);
      for (let i = 0; i < R * C; i++) num[i] = NB[i].reduce((a, j) => a + mine[j], 0);
      const zeros = [];
      for (let i = 0; i < R * C; i++) if (!mine[i] && !num[i]) zeros.push(i);
      // prefer an opening of about a tenth of the board up to 30 fields: enough to start thinking, not half the board; and one that shows
      // no certain mine yet, or the first player would simply collect them
      const fair = z => {
        const f = flood(R * C, NB, mine, num, new Int8Array(R * C), z);
        if (f.length < Math.max(8, R * C / 10 | 0) - (tries > 30 ? 3 : 0) || f.length > 30) return false;
        const st = new Int8Array(R * C); f.forEach(i => { st[i] = -1; });
        const p = analyze(R * C, NB, num, st, M, true);
        return tries > 20 || !p.some(x => x > 0.999);
      };
      const good = zeros.filter(fair);
      const pool = good.length ? good : tries > 40 ? zeros : [];
      if (pool.length) return { mine, num, start: pool[Math.floor(rng() * pool.length)] };
    }
  }
  // fields a tap on i reveals: i itself, and around every 0 its neighbours (st 0 = hidden)
  function flood(N, NB, mine, num, st, i) {
    const seen = new Uint8Array(N), out = [], q = [i]; seen[i] = 1;
    while (q.length) {
      const x = q.pop(); if (st[x] || mine[x]) continue;
      out.push(x);
      if (!num[x]) for (const y of NB[x]) if (!seen[y]) { seen[y] = 1; q.push(y); }
    }
    return out;
  }

  // ---------- the AI: what can be known about the hidden fields ----------
  // st: 0 hidden, -1 revealed, p > 0 mine found by p. left: mines still hidden.
  // Returns per hidden field the chance that it is a mine (exact over all consistent boards when that is small enough).
  const binom = (() => { const m = new Map(); return (n, k) => { if (k < 0 || k > n) return 0; const key = n * 512 + k; if (m.has(key)) return m.get(key); let v = 1; for (let j = 1; j <= k; j++) v = v * (n - k + j) / j; m.set(key, v); return v; }; })();
  function analyze(N, NB, num, st, left, exact) {
    const p = new Float64Array(N).fill(-1), hidden = [];
    for (let i = 0; i < N; i++) if (!st[i]) hidden.push(i);
    const cons = [];
    for (let i = 0; i < N; i++) {
      if (st[i] !== -1 || !num[i]) continue;
      const vars = NB[i].filter(j => !st[j]);
      if (!vars.length) continue;
      cons.push({ vars, need: num[i] - NB[i].filter(j => st[j] > 0).length });
    }
    const inFront = new Map();
    cons.forEach(c => c.vars.forEach(v => { if (!inFront.has(v)) inFront.set(v, []); inFront.get(v).push(c); }));
    const interior = hidden.filter(i => !inFront.has(i));
    // the simple rules everybody sees: a number whose fields are all mines, or already satisfied
    const local = () => {
      for (const i of hidden) p[i] = left / hidden.length;
      for (const [v, cs] of inFront) {
        let lo = 0, hi = 0;
        for (const c of cs) { const q = c.need / c.vars.length; hi = Math.max(hi, q); if (q === 0) lo = 1; }
        p[v] = lo ? 0 : hi;
      }
      return p;
    };
    if (!exact) return local();
    // connected groups of the border, each solved by backtracking
    const comps = [], done = new Set();
    for (const v of inFront.keys()) {
      if (done.has(v)) continue;
      const vars = [], cset = new Set(), q = [v]; done.add(v);
      while (q.length) { const x = q.shift(); vars.push(x); for (const c of inFront.get(x)) { cset.add(c); for (const y of c.vars) if (!done.has(y)) { done.add(y); q.push(y); } } }
      comps.push({ vars, cons: [...cset] });
    }
    let budget = 400000;
    for (const cp of comps) {
      const n = cp.vars.length, at = new Map(cp.vars.map((v, k) => [v, k]));
      const cs = cp.cons.map(c => ({ vs: c.vars.map(v => at.get(v)), need: c.need, sum: 0, open: c.vars.length }));
      const ofVar = cp.vars.map(() => []);
      cs.forEach(c => c.vs.forEach(k => ofVar[k].push(c)));
      const cnt = [], cell = [], asg = new Uint8Array(n);
      let mines = 0;
      const rec = k => {
        if (--budget < 0) return;
        if (k === n) { if (!cnt[mines]) { cnt[mines] = 0; cell[mines] = new Float64Array(n); } cnt[mines]++; for (let j = 0; j < n; j++) if (asg[j]) cell[mines][j]++; return; }
        for (const val of [0, 1]) {
          let ok = true;
          for (const c of ofVar[k]) { c.open--; c.sum += val; if (c.sum > c.need || c.sum + c.open < c.need) ok = false; }
          if (ok && mines + val <= left) { asg[k] = val; mines += val; rec(k + 1); mines -= val; asg[k] = 0; }
          for (const c of ofVar[k]) { c.open++; c.sum -= val; }
        }
      };
      rec(0);
      cp.cnt = cnt; cp.cell = cell;
    }
    if (budget < 0) return local();
    // combine the groups with the number of mines left for the fields away from the border
    const I = interior.length;
    const conv = list => { let d = [1]; for (const cp of list) { const nd = []; d.forEach((a, x) => { if (!a) return; cp.cnt.forEach((b, y) => { if (b) nd[x + y] = (nd[x + y] || 0) + a * b; }); }); d = nd; } return d; };
    const all = conv(comps);
    let total = 0, intE = 0;
    all.forEach((w, K) => { if (!w) return; const f = w * binom(I, left - K); total += f; if (I) intE += f * (left - K) / I; });
    if (!total) return local();
    p.total = total;
    for (const i of interior) p[i] = intE / total;
    comps.forEach((cp, ci) => {
      const rest = conv(comps.filter((_, k) => k !== ci)), acc = new Float64Array(cp.vars.length);
      cp.cnt.forEach((_, k) => {
        if (!cp.cnt[k]) return;
        let w = 0; rest.forEach((a, K) => { if (a) w += a * binom(I, left - k - K); });
        if (w) for (let j = 0; j < cp.vars.length; j++) acc[j] += cp.cell[k][j] * w;
      });
      cp.vars.forEach((v, j) => { p[v] = acc[j] / total; });
    });
    return p;
  }

  // Profi: what a miss on x would hand to the next player. For every number x could show, count the mines that
  // would then be certain (weighted by how likely that number is), so the tap with the best trade-off wins.
  function gift(N, NB, num, st, left, x, W) {
    const n2 = Uint8Array.from(num), s2 = Int8Array.from(st), known = NB[x].filter(j => st[j] > 0).length;
    s2[x] = -1;
    let tot = 0, acc = 0;
    for (let v = known; v <= known + NB[x].filter(j => !st[j]).length; v++) {
      n2[x] = v;
      const q = analyze(N, NB, n2, s2, left, true);
      if (!q.total) continue;
      let sure = 0;
      for (let i = 0; i < N; i++) if (!s2[i] && q[i] > 0.999) sure++;
      // a 0 also opens the area around it: some extra information for the next player
      tot += q.total; acc += q.total * (sure + (v === known ? 0.4 : 0));
    }
    return tot ? acc / tot * W : 0;
  }

  function aiMove(L, R, C, NB, num, st, left, bombs, lead, W) {
    const N = R * C, hidden = [];
    for (let i = 0; i < N; i++) if (!st[i]) hidden.push(i);
    const p = analyze(N, NB, num, st, left, L >= 2);
    const sure = hidden.filter(i => p[i] > 0.999);
    // Leicht: often misses even obvious mines and taps around at random
    if (L === 0) {
      if (sure.length && Math.random() < 0.5) return V.pick(sure);
      if (bombs && Math.random() < 0.12) return BOMB + V.pick(hidden);
      if (Math.random() < 0.55) return V.pick(hidden);
    } else if (sure.length && (L > 1 || Math.random() < 0.9)) return V.pick(sure);
    // the best 3x3 for a bomb: expected mines in it that are not certain anyway
    if (bombs && L > 0) {
      let best = -1, at = -1;
      for (let i = 0; i < N; i++) {
        let e = 0, h = 0;
        for (const j of area(R, C, i)) if (!st[j]) { h++; if (p[j] < 0.999) e += p[j]; }
        if (h && e > best) { best = e; at = i; }
      }
      // tuned in self-play: Profi's thresholds win clearly more often than waiting for a big blast
      const need = L === 1 ? 2.6 : L === 2 ? 2.2 : lead < 0 ? 1.4 : left <= 5 ? 1.1 : 1.6;
      if (best >= need) return BOMB + at;
    }
    // otherwise: the field most likely to be a mine; Profi also weighs what a miss would give away
    const top = Math.max(...hidden.map(i => p[i]));
    // Profi looks closer at the promising fields (fields with the same chance away from the border are alike)
    let look = null;
    if (L === 3 && p.total) {
      const seen = new Set();
      look = hidden.filter(i => p[i] >= top - 0.3).sort((a, b) => p[b] - p[a]).filter(i => {
        const k = NB[i].some(j => st[j] === -1) ? i : 'in'; if (seen.has(k)) return false; seen.add(k); return true;
      }).slice(0, 10);
    }
    // the most promising first, and only as long as there is time (large open borders take longer to count)
    const gifts = new Map(), t0 = performance.now();
    if (look) for (const i of look) { if (gifts.size && performance.now() - t0 > V.aiMs(900)) break; gifts.set(i, gift(R * C, NB, num, st, left, i, W == null ? 1 : W)); }
    const score = i => p[i] + (L === 1 ? Math.random() * 0.12 : Math.random() * 0.001) - (look ? (gifts.has(i) ? (1 - p[i]) * gifts.get(i) : 9) : 0);
    let best = -Infinity, list = [];
    for (const i of hidden) { const s = score(i); if (s > best + 1e-9) { best = s; list = [i]; } else if (Math.abs(s - best) <= 1e-9) list.push(i); }
    return V.pick(list);
  }

  const FLAG = '<svg viewBox="0 0 24 24"><path d="M7 3v18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 4h11l-3 4.5 3 4.5H8z" fill="currentColor"/></svg>';
  const MINE = '<svg viewBox="0 0 24 24"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7"/></g><circle cx="12" cy="12" r="6.2" fill="currentColor"/><circle cx="10" cy="10" r="1.8" fill="#fff" opacity=".8"/></svg>';
  const BOMBIC = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="14" r="7" fill="currentColor"/><path d="M15 9l2.5-2.5M17 4.5c1.5-.5 2.5 0 3 1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="8" cy="11.5" r="1.6" fill="#fff" opacity=".7"/></svg>';

  V.css(`
  .mj{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .mj-b{--cols:9;width:min(var(--bw),calc(var(--cols) * 52px),560px);display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:3px;padding:6px;border-radius:14px;background:#151834;border:2px solid #343a6b;box-shadow:0 0 44px -18px var(--cy);user-select:none;-webkit-user-select:none;touch-action:manipulation}
  .mj-b .f{aspect-ratio:1;border-radius:6px;display:grid;place-items:center;position:relative;font:800 clamp(15px,4.6vw,22px)/1 var(--f-d);cursor:pointer;
    background:linear-gradient(160deg,#4a5196,#363c78);box-shadow:inset 0 2px 0 rgba(255,255,255,.18),inset 0 -3px 0 rgba(0,0,0,.3);transition:background .15s,transform .1s}
  .mj-b .f:active{transform:scale(.92)}
  .mj-b .f.o{background:#0e1029;box-shadow:inset 0 0 0 1px #20244a;cursor:default}
  .mj-b .f.o:active{transform:none}
  .mj-b .f svg{width:66%;height:66%}
  .mj-b .f.n1{color:#62f0ff} .mj-b .f.n2{color:#5dff9d} .mj-b .f.n3{color:#ff6b8b} .mj-b .f.n4{color:#b18cff}
  .mj-b .f.n5{color:#ffa94d} .mj-b .f.n6{color:#4fd1c5} .mj-b .f.n7{color:#fff} .mj-b .f.n8{color:#9aa0c8}
  .mj-b .f.g1,.mj-b .f.g2,.mj-b .f.g3,.mj-b .f.g4{cursor:default}
  .mj-b .f.g1{--gc:var(--p1)} .mj-b .f.g2{--gc:var(--p2)} .mj-b .f.g3{--gc:var(--p3)} .mj-b .f.g4{--gc:var(--p4)}
  .mj-b .f[class*=" g"]{background:color-mix(in srgb,var(--gc) 26%,#0e1029);color:var(--gc);box-shadow:inset 0 0 0 2px var(--gc)}
  .mj-b .f.rest{background:#0e1029;color:#7d83b8;box-shadow:inset 0 0 0 1px #20244a}
  .mj-b .f.new{animation:mjin .3s var(--spring) backwards;animation-delay:var(--d,0ms)}
  @keyframes mjin{from{transform:scale(.5);opacity:.2}}
  .mj-b .f.last{outline:2px solid rgba(255,255,255,.85);outline-offset:-2px}
  .mj-b .f.zone{background:color-mix(in srgb,#ff6b3d 55%,#363c78);box-shadow:inset 0 0 0 2px #ff6b3d}
  .mj-b .f.o.zone{background:color-mix(in srgb,#ff6b3d 22%,#0e1029)}
  .mj-b.lock .f{cursor:default}
  .mj-side{display:flex;flex-direction:column;gap:8px;width:min(100%,560px)}
  .mj-sc{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
  .mj-sc>span{display:inline-flex;align-items:baseline;gap:5px;padding:4px 10px;border-radius:999px;background:var(--panel);border:1px solid var(--line);font-size:12px;color:var(--muted)}
  .mj-sc>span b{font:800 italic 16px/1 var(--f-d)}
  .mj-sc>span.on{border-color:var(--sc);box-shadow:0 0 0 1px var(--sc)}
  .mj-sc>span i{font-style:normal;opacity:.85;color:#ff6b3d;display:inline-flex;align-self:center} .mj-sc>span i svg{width:14px;height:14px}
  .mj-sc>span i.used{opacity:.25}
  .mj-ctl{display:flex;gap:8px;justify-content:center;align-items:center}
  .mj-left{display:inline-flex;align-items:center;gap:6px;height:48px;padding:0 14px;border-radius:12px;background:var(--panel);border:1px solid var(--line);font:800 italic 18px/1 var(--f-d)}
  .mj-left svg{width:20px;height:20px;color:#9aa0c8}
  .mj-ctl .btn{height:48px;padding:0 16px;flex:1;max-width:220px;gap:8px}
  .mj-ctl .btn svg{width:22px;height:22px}
  .mj-ctl .btn.arm{border-color:#ff6b3d;background:rgba(255,107,61,.16);color:#ffb08f;box-shadow:0 0 0 1px #ff6b3d}
  .mj-ctl .btn[disabled]{opacity:.4;pointer-events:none}
  .mj-hint{font-size:12px;color:var(--muted);text-align:center;min-height:16px}
  @media (hover:hover) and (pointer:fine){
    .mj-b:not(.lock) .f:not(.o):not([class*=" g"]):hover{background:linear-gradient(160deg,#5a62b0,#424892)}
    .mj-b.armed .f{cursor:crosshair}
  }
  /* wide PC: the side column next to the board; between 960 and 1279 px the player cards leave too little room, so it stays below */
  @media (min-width:1280px){
    .mj{flex-direction:row;align-items:flex-start;justify-content:center;gap:16px}
    .mj-b{width:min(var(--bw),calc(100% - 236px),calc(var(--cols) * 60px),620px);flex:none}
    .mj-side{width:220px;flex:none}
    .mj-sc{flex-direction:column;align-items:stretch;gap:4px}
    .mj-sc>span{padding:8px 12px;font-size:13px;border-radius:10px}
    .mj-sc>span b{order:3;margin-left:auto}
    .mj-ctl{flex-direction:column;align-items:stretch}
    .mj-ctl .btn,.mj-left{height:42px;max-width:none}
    .mj-left{justify-content:center}
    .mj-hint{text-align:left}
  }
  .bd-neon .mj-b{background:#0a0c22;border-color:#4a52a0} .bd-neon .mj-b .f:not(.o):not(.rest):not([class*=" g"]){background:#1c2160;box-shadow:inset 0 0 0 1px #5c66d6,0 0 8px -2px #5c66d6}
  .bd-wood .mj-b{background:#5d3a1c;border-color:#3c240f;box-shadow:0 18px 40px -14px rgba(0,0,0,.8)}
  .bd-wood .mj-b .f:not(.o):not(.rest):not([class*=" g"]){background:linear-gradient(135deg,#e2bd88,#c99a60);box-shadow:inset 0 2px 0 rgba(255,255,255,.3),inset 0 -3px 0 rgba(60,30,10,.35)}
  .bd-wood .mj-b .f.o,.bd-wood .mj-b .f.rest{background:#3a240f;box-shadow:inset 0 0 0 1px #2a1808}
  .cb .mj-b .f.g2::after,.cb .mc.mjg2::after{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 80% 80%,currentColor 12%,transparent 14%)}
  .cb .mj-b .f.g3::after,.cb .mc.mjg3::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(45deg,transparent 44%,currentColor 44% 50%,transparent 50%);opacity:.6}
  .cb .mj-b .f.g4::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(transparent 46%,currentColor 46% 54%,transparent 54%);opacity:.6}
  .mc.mjh{background:linear-gradient(160deg,#4a5196,#363c78);box-shadow:inset 0 2px 0 rgba(255,255,255,.18)}
  .mc.mjo{background:#0e1029}
  .mc.mjn1{color:#62f0ff} .mc.mjn2{color:#5dff9d} .mc.mjn3{color:#ff6b8b} .mc.mjn4{color:#b18cff}
  .mc.mjg1{background:color-mix(in srgb,var(--p1) 26%,#0e1029);color:var(--p1);box-shadow:inset 0 0 0 2px var(--p1)}
  .mc.mjg2{background:color-mix(in srgb,var(--p2) 26%,#0e1029);color:var(--p2);box-shadow:inset 0 0 0 2px var(--p2)}
  .mc.mjbm{background:color-mix(in srgb,#ff6b3d 40%,#363c78);box-shadow:inset 0 0 0 2px #ff6b3d}
  .mc svg{width:66%;height:66%}
  /* a flag drawn by CSS, for the tutorial tasks (they can only set a class on the tapped field) */
  .mc.mjflag::before{content:'';width:62%;height:62%;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 2h2.4v20H6zM8 4h11l-3 4.5 3 4.5H8z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 2h2.4v20H6zM8 4h11l-3 4.5 3 4.5H8z'/%3E%3C/svg%3E") center/contain no-repeat}`);

  // tutorial boards: . hidden, 0-4 numbers, a/b flags of pink/yellow, * a field in the bomb's 3x3
  const MAP = { '.': { c: 'mjh' }, '0': { c: 'mjo' }, a: { c: 'mjg1', t: FLAG }, b: { c: 'mjg2', t: FLAG }, '*': { c: 'mjbm' } };
  for (let k = 1; k <= 4; k++) MAP[k] = { c: 'mjo mjn' + k, t: '' + k };
  const mm = (rows, w) => V.mini(rows, MAP, { w: w || 200 });

  V.register({
    id: 'mines', name: 'Minenjagd', cat: 'Klassiker', order: 8, accent: '#ff6b3d', party: true, noFirst: true,
    short: 'Minen aufspüren, wer die meisten findet, gewinnt.',
    desc: 'Minesweeper für 2 bis 4: Ihr deckt abwechselnd Felder auf. Die Zahlen verraten, wie viele Minen daneben liegen. Findest du eine Mine, gehört sie dir und du bist nochmal dran. Wer die meisten Minen findet, gewinnt. Jeder hat eine Bombe, die 3×3 Felder auf einmal aufdeckt.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Anfänger: tippt oft einfach irgendwo hin und lässt sichere Minen liegen.', 'Kennt die einfachen Regeln an den Zahlen und nimmt sichere Minen mit.', 'Rechnet für jedes Feld genau aus, wie wahrscheinlich dort eine Mine liegt.', 'Rechnet genau und achtet zusätzlich darauf, dir mit einem Fehlgriff nichts zu verraten.'],
    keys: [['Pfeile + Enter', 'Feld aufdecken'], ['B', 'Bombe scharf machen'], ['Esc', 'Bombe abbrechen']],
    options: [
      { id: 'n', label: 'Spieler', group: 'players', inline: 'local', live: false, def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] },
      { id: 'size', label: 'Feld', group: 'board', short: v => ({ s: '8×8', m: '9×10', l: '9×13' })[v] || '9×10', def: 'm', choices: [['s', 'Klein · 13 Minen'], ['m', 'Mittel · 19 Minen'], ['l', 'Groß · 25 Minen']] }
    ],
    localHint: 'Ihr tippt reihum am selben Gerät, jeder mit seiner Farbe.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="7" fill="#151834"/>${[0, 1, 2].map(r => [0, 1, 2].map(c => { const x = 7 + c * 12.3, y = 7 + r * 12.3, o = (r + c) % 3 === 0 && !(r === 2 && c === 2); return `<rect x="${x}" y="${y}" width="10.5" height="10.5" rx="2.4" fill="${o ? '#0e1029' : '#3f4688'}"/>`; }).join('')).join('')}<text x="12.3" y="16.2" font-size="9" font-weight="800" fill="#62f0ff" text-anchor="middle" font-family="sans-serif">1</text><text x="24.5" y="28.5" font-size="9" font-weight="800" fill="#5dff9d" text-anchor="middle" font-family="sans-serif">2</text><rect x="31.6" y="31.6" width="10.5" height="10.5" rx="2.4" fill="#4a1f2a" stroke="#ff4fd8" stroke-width="1.4"/><path d="M34.6 33.8v6.4M35.2 34.2h4.6l-1.3 1.8 1.3 1.8h-4.6z" stroke="#ff4fd8" stroke-width="1.1" fill="#ff4fd8" stroke-linejoin="round"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Unter den Feldern liegen Minen versteckt. Ihr deckt <b>abwechselnd</b> je ein Feld auf. Hier ist eine Mine etwas Gutes: <b>Wer die meisten Minen findet, gewinnt.</b>', demo: mm(['0001.', '0112.', '01a..', '011..']) },
      { t: 'Die Zahlen', d: 'Ein aufgedecktes Feld zeigt, wie viele Minen in den <b>8 Feldern rundherum</b> liegen, auch schräg. Eine 2 heißt: genau zwei Minen in ihrer Nachbarschaft. Leere Felder haben keine Mine daneben und decken ihre Nachbarn gleich mit auf.', demo: mm(['00000', '01110', '01.10', '01110'], 170) },
      { t: 'Mine gefunden', d: 'Tippst du auf eine Mine, <b>gehört sie dir</b> (sie bekommt deine Farbe) und du bist <b>sofort nochmal dran</b>. Triffst du ein sicheres Feld, zeigt es seine Zahl und der Nächste ist dran.', demo: mm(['0000', '1111', 'a..b']) },
      { t: 'Der Start', d: 'Damit niemand blind raten muss, ist zu Beginn schon <b>ein Bereich aufgedeckt</b>. Von dort aus geht es mit Nachdenken weiter.' },
      { t: 'Die Bombe', d: 'Jeder hat <b>eine Bombe</b> pro Spiel. Sie deckt <b>3×3 Felder</b> auf einmal auf, alle Minen darin gehören dir. War mindestens eine Mine dabei, bist du nochmal dran, sonst der Nächste. Tippe auf <b>Bombe</b> und dann aufs Mittelfeld; auf dem Handy zur Sicherheit zweimal. Am PC: B drücken, dann klicken.', demo: mm(['01...', '01***', '12***', '.1***']) },
      { t: 'Spielende', d: 'Das Spiel endet, sobald alle Minen gefunden sind oder <b>niemand mehr den Führenden einholen</b> kann. Zu zweit gibt es eine ungerade Zahl Minen, also immer einen Sieger.' },
      { t: 'Tipps', d: 'Sichere Minen zuerst holen, du darfst ja nochmal. Ohne sichere Mine nimm das Feld, auf dem eine Mine <b>am wahrscheinlichsten</b> ist. Aber Vorsicht: Jede Zahl, die du aufdeckst, hilft auch dem Nächsten. Die Bombe lohnt sich dort, wo mehrere unsichere Minen dicht beieinander liegen.' }
    ],
    start(ctx) {
      const N0 = ctx.n, P = ctx.players;
      const [C, R, M] = SIZES[ctx.opts.size] || SIZES.m, N = R * C, NB = nbrs(R, C);
      const { mine, num, start } = deal(R, C, M, ctx.rng, NB);
      const st = new Int8Array(N), score = {}, bombs = {};
      P.forEach(p => { score[p] = 0; bombs[p] = 1; });
      let turn = P[0], left = M, over = false, busy = false, armed = false, aim = -1, last = -1;
      const fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;

      const wrap = V.el('div', 'mj');
      const board = V.el('div', 'mj-b'); board.style.setProperty('--cols', C);
      const cells = [];
      for (let i = 0; i < N; i++) { const d = V.el('div', 'f'); d.dataset.i = i; cells.push(d); board.appendChild(d); }
      const side = V.el('div', 'mj-side'), sc = V.el('div', 'mj-sc'), hint = V.el('div', 'mj-hint');
      const ctl = V.el('div', 'mj-ctl', `<span class="mj-left" title="Minen übrig">${MINE}<b></b></span><button class="btn ghost" data-a="bomb">${BOMBIC}<span>Bombe</span></button>`);
      side.append(sc, ctl, hint);
      wrap.append(board, side);
      ctx.stage.appendChild(wrap);
      const bombBtn = ctl.querySelector('[data-a="bomb"]'), leftEl = ctl.querySelector('.mj-left b');

      const human = () => !over && !busy && !ctx.isAI(turn);
      const shown = new Array(N).fill('');
      function paint(i, extra) {
        const s = st[i];
        let c = 'f', h = '';
        if (s === -1) { c += ' o'; if (num[i]) { c += ' n' + num[i]; h = '' + num[i]; } }
        else if (s > 0) { c += ' g' + s; h = FLAG; }
        else if (over && mine[i]) { c += ' rest'; h = MINE; }
        if (i === last) c += ' last';
        if (armed && aim >= 0 && area(R, C, aim).includes(i)) c += ' zone';
        if (extra) c += ' ' + extra;
        const key = c + h;
        if (key !== shown[i]) { cells[i].className = c; cells[i].innerHTML = h; shown[i] = key; }
      }
      function render() {
        for (let i = 0; i < N; i++) paint(i);
        board.classList.toggle('lock', !human());
        board.classList.toggle('armed', armed);
        sc.innerHTML = P.map(p => `<span class="${p === turn && !over ? 'on' : ''}" style="--sc:var(--p${p})"><b class="c${p}">${score[p]}</b>${ctx.who(p)}<i class="${bombs[p] ? '' : 'used'}" title="Bombe">${BOMBIC}</i></span>`).join('');
        leftEl.textContent = left;
        bombBtn.disabled = !human() || !bombs[turn];
        bombBtn.classList.toggle('arm', armed);
        bombBtn.querySelector('span').textContent = armed ? 'Abbrechen' : 'Bombe';
        hint.textContent = !human() ? '' : armed ? (fine ? 'Klick aufs Mittelfeld der 3×3 Felder' : (aim >= 0 ? 'Nochmal tippen zum Zünden' : 'Tippe aufs Mittelfeld der 3×3 Felder')) : 'Mine gefunden = Punkt und nochmal';
      }
      // reveal a list of fields with a little wave from the tapped one
      function show(list, from) {
        const r0 = from / C | 0, c0 = from % C;
        list.forEach(i => { st[i] = -1; });
        list.forEach(i => { const d = Math.max(Math.abs((i / C | 0) - r0), Math.abs(i % C - c0)); cells[i].style.setProperty('--d', Math.min(d, 8) * 35 + 'ms'); shown[i] = ''; paint(i, V.fxOn() ? 'new' : ''); });
      }
      function take(i, p) {
        st[i] = p; score[p]++; left--;
        shown[i] = ''; paint(i, 'new');
        V.fx.burstAt(cells[i], V.hex(p), 10, 55);
        V.fx.floatAt(cells[i], '+1', V.hex(p));
      }
      function decided() {
        const sorted = P.map(p => score[p]).sort((a, b) => b - a);
        return left === 0 || sorted[0] > sorted[1] + left;
      }
      function finish() {
        over = true; armed = false; aim = -1;
        const best = Math.max(...P.map(p => score[p])), win = P.filter(p => score[p] === best);
        render();
        ctx.end(win.length > 1 ? 0 : win[0], P.map(p => score[p]).join(' : ') + ' Minen');
      }
      function act(m) {
        if (over) return;
        const bomb = m >= BOMB, i = bomb ? m - BOMB : m, p = turn;
        ctx.moved(p, m);
        armed = false; aim = -1; last = i;
        let again = false, msg;
        if (bomb) {
          bombs[p] = 0;
          let got = 0;
          for (const j of area(R, C, i)) {
            if (st[j]) continue;
            if (mine[j]) { take(j, p); got++; } else show(flood(N, NB, mine, num, st, j), i);
          }
          V.sfx.hit();
          if (V.fxOn()) V.fx.shake(board, true);
          V.fx.burstAt(cells[i], '#ff6b3d', 18, 80);
          again = got > 0;
          msg = `${ctx.who(p)}: Bombe, ${got === 1 ? 'eine Mine' : got + ' Minen'}`;
        } else if (mine[i]) {
          take(i, p); again = true;
          V.sfx.found();
        } else {
          show(flood(N, NB, mine, num, st, i), i);
          if (ctx.isAI(p)) V.sfx.them(); else V.sfx.move();
        }
        render();
        if (decided()) { busy = true; return ctx.later(finish, 350); }
        if (again) { next(true, msg); return; }
        turn = P[(P.indexOf(p) + 1) % N0];
        next(false, msg);
      }
      function next(again, msg) {
        busy = false;
        ctx.turn(turn, again ? (msg ? msg + ', nochmal dran' : `${ctx.who(turn)}: Mine gefunden, nochmal dran`) : msg);
        render();
        if (!ctx.isAI(turn)) return;
        const s = turn;
        ctx.aiTurn({
          side: s, quick: again,
          think: () => {
            const others = P.filter(q => q !== s).map(q => score[q]);
            const lead = score[s] - Math.max(...others);
            return { move: aiMove(ctx.level, R, C, NB, num, st, left, bombs[s], lead), mood: lead / Math.max(3, M / 4) };
          },
          targets: m => (m >= BOMB ? area(R, C, m - BOMB) : [m]).map(i => cells[i]),
          decoys: () => { const h = []; for (let i = 0; i < N; i++) if (!st[i]) h.push(cells[i]); return h.sort(() => Math.random() - 0.5).slice(0, 4); },
          apply: act,
          decode: m => { if (!Number.isInteger(m)) return null; const b = m >= BOMB, i = b ? m - BOMB : m; if (i < 0 || i >= N || (b && !bombs[s]) || (!b && st[i])) return null; return m; },
          say: m => (m >= BOMB ? 'Bombe!' : '')
        });
      }
      function tap(i) {
        if (!human()) return;
        if (armed) {
          if (fine || aim === i) return act(BOMB + i);
          aim = i; V.sfx.tick(); return render();
        }
        if (st[i]) return;
        act(i);
      }
      function arm(on) {
        if (!human() || !bombs[turn]) return;
        armed = on; aim = -1; V.sfx.ui(); render();
      }
      board.addEventListener('click', e => { const f = e.target.closest('.f'); if (f) tap(+f.dataset.i); });
      board.addEventListener('mousemove', e => {
        if (!armed || !fine) return;
        const f = e.target.closest('.f'); const i = f ? +f.dataset.i : -1;
        if (i !== aim) { aim = i; render(); }
      });
      board.addEventListener('mouseleave', () => { if (armed && fine && aim >= 0) { aim = -1; render(); } });
      bombBtn.addEventListener('click', () => arm(!armed));
      ctx.keys(e => {
        if (!human()) return false;
        if (e.key === 'b' || e.key === 'B') { arm(!armed); return true; }
        if (e.key === 'Escape' && armed) { arm(false); return true; }
        return false;
      });
      ctx.nav(() => human() ? cells.filter((c, i) => armed || !st[i]) : [], { pad: 2 });

      show(flood(N, NB, mine, num, st, start), start);
      next(false);
    }
  });
})();
