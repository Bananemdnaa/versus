(function () {
  // Blockade: lay polyominoes, 2-4 players. Everybody has the same 21 pieces of 1 to 5 squares. The first piece covers
  // the own start field, every further one must touch an own piece at a corner but never along an edge (other colours
  // may be touched anywhere). Who cannot lay any piece is out. Score: squares laid, +15 for all 21 pieces, +5 more if
  // the single square came last. 2 players: 14x14 with start fields near the middle; 3-4 players: 20x20 from the corners.
  // Moves: 'k.o.r.c' = piece k in orientation o with its top left square at row r, column c.
  const SHAPES = [['#'], ['##'], ['###'], ['##', '#.'], ['####'], ['###', '#..'], ['###', '.#.'], ['.##', '##.'], ['##', '##'],
    ['.##', '##.', '.#.'], ['#####'], ['####', '#...'], ['##..', '.###'], ['##', '##', '#.'], ['###', '.#.', '.#.'], ['#.#', '###'],
    ['#..', '#..', '###'], ['#..', '##.', '.##'], ['.#.', '###', '.#.'], ['####', '.#..'], ['##.', '.#.', '.##']];
  const norm = cs => { const r0 = Math.min(...cs.map(x => x[0])), c0 = Math.min(...cs.map(x => x[1])); return cs.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
  const key = cs => cs.map(x => x.join(',')).join(';');
  // PCS[k].or: every distinct orientation with its size, the orientation a turn (clockwise) or a flip leads to,
  // and the pivot (the square nearest the middle) that follows the finger or the mouse
  const PCS = SHAPES.map(rows => {
    const base = []; rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') base.push([r, c]); }));
    const all = [], seen = {};
    for (const f of [0, 1]) {
      let cs = f ? base.map(([r, c]) => [r, -c]) : base;
      for (let i = 0; i < 4; i++) {
        const n = norm(cs), k = key(n);
        if (!(k in seen)) { seen[k] = all.length; all.push(n); }
        cs = cs.map(([r, c]) => [c, -r]);
      }
    }
    const or = all.map(cs => {
      const h = Math.max(...cs.map(x => x[0])) + 1, w = Math.max(...cs.map(x => x[1])) + 1, mr = (h - 1) / 2, mc = (w - 1) / 2;
      const piv = cs.reduce((a, x) => (Math.hypot(x[0] - mr, x[1] - mc) < Math.hypot(a[0] - mr, a[1] - mc) ? x : a));
      return { cs, h, w, piv };
    });
    or.forEach(o => { o.rot = seen[key(norm(o.cs.map(([r, c]) => [c, -r])))]; o.flip = seen[key(norm(o.cs.map(([r, c]) => [r, -c])))]; });
    return { n: base.length, or };
  });
  const geo = n => n === 2 ? { S: 14, start: { 1: [9, 4], 2: [4, 9] } } : { S: 20, start: { 1: [19, 0], 2: [0, 0], 3: [0, 19], 4: [19, 19] } };
  const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]], D4 = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  // occupied, or next to an own square along an edge: p may not lay anything there
  function forbidden(b, S, p) {
    const f = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) {
      if (!b[i]) continue;
      f[i] = 1;
      if (b[i] !== p) continue;
      const r = i / S | 0, c = i % S;
      for (const [dr, dc] of N4) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < S && cc >= 0 && cc < S) f[rr * S + cc] = 1; }
    }
    return f;
  }
  // free squares that touch an own square at a corner (before the first piece: the start field)
  function anchors(b, S, p, f, st) {
    if (st >= 0) return f[st] ? [] : [st];
    const out = [];
    for (let i = 0; i < S * S; i++) {
      if (f[i]) continue;
      const r = i / S | 0, c = i % S;
      for (const [dr, dc] of D4) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < S && cc >= 0 && cc < S && b[rr * S + cc] === p) { out.push(i); break; } }
    }
    return out;
  }
  // every legal placement of p's remaining pieces (st = start field while p has not laid anything, else -1)
  function gen(b, S, p, left, st) {
    const f = forbidden(b, S, p), an = anchors(b, S, p, f, st), seen = new Set(), moves = [];
    for (const a of an) {
      const ar = a / S | 0, ac = a % S;
      for (let k = 0; k < 21; k++) {
        if (!left[k]) continue;
        PCS[k].or.forEach((o, oi) => {
          for (const [dr, dc] of o.cs) {
            const r0 = ar - dr, c0 = ac - dc;
            if (r0 < 0 || c0 < 0 || r0 + o.h > S || c0 + o.w > S) continue;
            const id = ((k * 8 + oi) * S + r0) * S + c0;
            if (seen.has(id)) continue;
            seen.add(id);
            const cells = [];
            let ok = true;
            for (const [er, ec] of o.cs) { const i = (r0 + er) * S + c0 + ec; if (f[i]) { ok = false; break; } cells.push(i); }
            if (ok) moves.push({ k, o: oi, r: r0, c: c0, cells });
          }
        });
      }
    }
    return { moves, anchors: an };
  }
  // what a placement does for p: new own corners, own corners it spoils, enemy corners it takes, distance to the middle
  function rate(b, S, p, m, myA, oppA) {
    const put = new Set(m.cells), fresh = new Set();
    const edgeOwn = j => { const r = j / S | 0, c = j % S; for (const [dr, dc] of N4) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= S || cc < 0 || cc >= S) continue; const t = rr * S + cc; if (b[t] === p || put.has(t)) return true; } return false; };
    for (const i of m.cells) {
      const r = i / S | 0, c = i % S;
      for (const [dr, dc] of D4) {
        const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= S || cc < 0 || cc >= S) continue;
        const j = rr * S + cc;
        if (b[j] || put.has(j) || myA.has(j) || fresh.has(j) || edgeOwn(j)) continue;
        fresh.add(j);
      }
    }
    let lost = 0; for (const j of myA) if (put.has(j) || edgeOwn(j)) lost++;
    let blocked = 0; for (const A of oppA) for (const i of m.cells) if (A.has(i)) blocked++;
    const mid = (S - 1) / 2; let cen = 0; for (const i of m.cells) cen += Math.abs((i / S | 0) - mid) + Math.abs(i % S - mid);
    return { n: m.cells.length, fresh: fresh.size, lost, blocked, cen: cen / m.cells.length };
  }
  const enc = m => `${m.k}.${m.o}.${m.r}.${m.c}`;

  // a piece as a small picture (tray, tutorial)
  const pic = (k, o, cls = '') => {
    const or = PCS[k].or[o];
    return `<i class="bk-pic ${cls}" style="--h:${or.h};--w:${or.w}">${or.cs.map(([r, c]) => `<b style="grid-row:${r + 1};grid-column:${c + 1}"></b>`).join('')}</i>`;
  };
  const IC = {
    rot: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
    flip: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" stroke-dasharray="2 3"/><path d="M9 7 3 17h6zM15 7l6 10h-6z"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg>'
  };

  V.css(`
  .bk{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .bk-b{--s:20;--pc:var(--p1);width:min(var(--bw),640px);aspect-ratio:1;display:grid;grid-template-columns:repeat(var(--s),minmax(0,1fr));gap:1px;padding:5px;border-radius:12px;background:#1a1d36;border:2px solid #343a6b;box-shadow:0 0 40px -16px var(--cy);user-select:none;-webkit-user-select:none;touch-action:manipulation}
  .bk-b.drag{touch-action:none}
  .bk-b .c{position:relative;background:#262a4d;border-radius:2px}
  .bk-b .c.o1{background:var(--p1)} .bk-b .c.o2{background:var(--p2)} .bk-b .c.o3{background:var(--p3)} .bk-b .c.o4{background:var(--p4)}
  .bk-b .c[class*=" o"]{box-shadow:inset 0 0 0 1px rgba(0,0,0,.28),inset 2px 2px 0 rgba(255,255,255,.28)}
  .bk-b .c.st1{--sc:var(--p1)} .bk-b .c.st2{--sc:var(--p2)} .bk-b .c.st3{--sc:var(--p3)} .bk-b .c.st4{--sc:var(--p4)}
  .bk-b .c[class*=" st"]::after{content:'';position:absolute;inset:12%;border-radius:50%;border:2px solid var(--sc);opacity:.9}
  .bk-b .c.an::before{content:'';position:absolute;inset:34%;border-radius:50%;background:var(--pc);opacity:.75}
  .bk-b .c.gh{z-index:1}
  .bk-b .c.gh.ok{background:color-mix(in srgb,var(--pc) 72%,#fff);box-shadow:0 0 0 1px #fff,0 0 10px var(--pc)}
  .bk-b .c.gh.bad{background:repeating-linear-gradient(45deg,rgba(255,80,110,.85) 0 3px,rgba(120,20,40,.85) 3px 6px);box-shadow:0 0 0 1px #ff5a7a}
  .bk-b .c.gh::before{display:none}
  .bk-b .c.lm{box-shadow:inset 0 0 0 2px rgba(255,255,255,.75)}
  .bk-b .c.new{animation:bkin .35s var(--spring)}
  @keyframes bkin{from{transform:scale(.3)}}
  .bk-side{display:flex;flex-direction:column;gap:8px;width:min(100%,640px)}
  .bk-sc{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
  .bk-sc>span{display:inline-flex;align-items:baseline;gap:5px;padding:4px 10px;border-radius:999px;background:var(--panel);border:1px solid var(--line);font-size:12px;color:var(--muted)}
  .bk-sc>span b{font:800 italic 15px/1 var(--f-d)}
  .bk-sc>span.on{border-color:var(--sc);box-shadow:0 0 0 1px var(--sc)}
  .bk-sc>span.out{opacity:.5;text-decoration:line-through}
  .bk-tray{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 8px;scroll-snap-type:x proximity;scrollbar-width:thin;min-height:62px}
  .bk-tray button{--pc:var(--p1);flex:none;min-width:54px;height:54px;padding:5px;display:grid;place-items:center;border-radius:10px;background:var(--panel);border:1px solid var(--line);scroll-snap-align:start;transition:transform .12s,border-color .15s}
  .bk-tray button.sel{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc);background:color-mix(in srgb,var(--pc) 14%,var(--panel))}
  .bk-tray button.no{opacity:.35}
  .bk-tray.wait button{opacity:.55}
  .bk-pic{display:grid;grid-template-rows:repeat(var(--h),9px);grid-template-columns:repeat(var(--w),9px);gap:1px}
  .bk-pic b{background:var(--pc);border-radius:2px;box-shadow:inset 1px 1px 0 rgba(255,255,255,.3)}
  .bk-ctl{display:flex;gap:8px;justify-content:center}
  .bk-ctl .btn{height:48px;padding:0 14px;flex:1;max-width:170px}
  .bk-ctl .btn[disabled]{opacity:.4;pointer-events:none}
  .bk-hint{font-size:12px;color:var(--muted);text-align:center;min-height:16px}
  @media (hover:hover) and (pointer:fine){.bk-tray button:hover{transform:translateY(-3px);border-color:var(--line2)} .bk-b.has .c{cursor:crosshair}}
  /* PC: board and a narrow column with the pieces side by side (the player cards already take the room left and right) */
  @media (min-width:960px){
    .bk{flex-direction:row;align-items:flex-start;justify-content:center;gap:14px}
    .bk-b{width:min(var(--bw),calc(100% - 234px),660px);flex:none}
    .bk-side{width:220px;flex:none}
    .bk-sc{justify-content:flex-start;gap:4px}
    .bk-tray{flex-wrap:wrap;overflow:visible;gap:4px;padding:5px;border-radius:12px;background:rgba(0,0,0,.18)}
    .bk-tray button{min-width:0;width:38px;height:38px;padding:2px;border-radius:8px}
    .bk-pic{grid-template-rows:repeat(var(--h),6px);grid-template-columns:repeat(var(--w),6px)}
    .bk-ctl{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .bk-ctl .btn{height:38px;padding:0 8px;font-size:14px;max-width:none}
    .bk-ctl .btn[data-a="go"]{grid-column:1/-1}
    .bk-hint{text-align:left}
  }
  .bd-neon .bk-b{background:#0d0f26;border-color:#4a52a0;box-shadow:0 0 46px -12px var(--cy)} .bd-neon .bk-b .c{background:#181c44}
  .bd-wood .bk-b{background:#5d3a1c;border-color:#3c240f;box-shadow:0 18px 40px -14px rgba(0,0,0,.8)} .bd-wood .bk-b .c{background:linear-gradient(135deg,#e2bd88,#c99a60)}
  .bd-wood .bk-b .c.lm{box-shadow:inset 0 0 0 2px rgba(60,30,10,.7)}
  .cb .bk-b .c.o2,.cb .bk-tray button.t2 .bk-pic b{background-image:radial-gradient(circle,rgba(0,0,0,.45) 22%,transparent 26%)}
  .cb .bk-b .c.o3,.cb .bk-tray button.t3 .bk-pic b{background-image:linear-gradient(45deg,transparent 40%,rgba(0,0,0,.45) 40% 60%,transparent 60%)}
  .cb .bk-b .c.o4,.cb .bk-tray button.t4 .bk-pic b{background-image:linear-gradient(transparent 40%,rgba(0,0,0,.45) 40% 60%,transparent 60%),linear-gradient(90deg,transparent 40%,rgba(0,0,0,.45) 40% 60%,transparent 60%)}
  .mc.bk1{background:var(--p1)} .mc.bk2{background:var(--p2)} .mc.bk3{background:var(--p3)} .mc.bk4{background:var(--p4)}
  .mc.bkok::after{content:'';width:34%;height:34%;border-radius:50%;background:var(--p1);animation:tgpulse 1.4s ease-in-out infinite}
  .mc.bkno{color:var(--bad)} .mc.bkst::after{content:'';position:absolute;inset:14%;border-radius:50%;border:2px solid var(--p1)}`);

  const rm = rows => V.mini(rows, { p: { c: 'bk1' }, y: { c: 'bk2' }, c: { c: 'bk3' }, g: { c: 'bk4' }, '+': { c: 'bkok' }, x: { c: 'bkno', t: '✕' }, S: { c: 'bkst' } }, { w: 230 });

  // the AI's choice as a pure function of the state, so it can think in a worker (js/aiworker.js, V.register)
  function brain(x, L) {
    const { b, S, p, P, out, laid, left, firstAt } = x, stFor = q => (laid[q] ? -1 : firstAt[q]);
    const g = gen(b, S, p, left[p], stFor(p)), ms = g.moves;
    if (ms.length === 1) return { move: ms[0] };
    if (L === 0) return { move: V.weak(ms.map(m => ({ m, v: m.cells.length * 6 })), 30, 0.45).move };
    const myA = new Set(g.anchors), others = P.filter(q => q !== p && !out[q]);
    const oppA = others.map(q => new Set(anchors(b, S, q, forbidden(b, S, q), stFor(q))));
    const early = laid[p] < (S === 20 ? 22 : 12);
    const base = m => {
      const r = rate(b, S, p, m, myA, oppA);
      if (L === 1) return r.n * 10 + r.fresh * 2;
      return r.n * 10 + (r.fresh - r.lost * 0.6) * 3 + r.blocked * 4 - (early ? r.cen * (S === 20 ? 1.3 : 0.6) : 0);
    };
    const sc = ms.map(m => ({ m, v: base(m) }));
    if (L === 1) return { move: V.pickSoft(sc, 8).move };
    if (L === 2) return { move: V.pickSoft(sc, 2).move };
    // Profi: the best dozen again with a look at the board afterwards: how many corners stay for us and for them,
    // and with two players what the opponent's best answer would be worth
    const deadline = performance.now() + V.aiMs(1500);
    const top = sc.sort((x, y) => y.v - x.v).slice(0, 12);
    for (const t of top) {
      if (performance.now() > deadline) break;
      const b2 = b.slice(); t.m.cells.forEach(i => { b2[i] = p; });
      const mine = anchors(b2, S, p, forbidden(b2, S, p), -1).length;
      let theirs = 0, reply = 0;
      others.forEach(q => { theirs += anchors(b2, S, q, forbidden(b2, S, q), stFor(q)).length; });
      if (others.length === 1) {
        const q = others[0], g2 = gen(b2, S, q, left[q], stFor(q));
        const qA = new Set(g2.anchors), pA = [new Set(anchors(b2, S, p, forbidden(b2, S, p), -1))];
        for (const m2 of g2.moves) { const r = rate(b2, S, q, m2, qA, pA); reply = Math.max(reply, r.n * 10 + r.fresh * 3 + r.blocked * 4); }
      }
      t.v += mine * 2.5 - theirs * 2 / Math.max(1, others.length) - reply * 0.5;
    }
    return { move: V.pickSoft(top, 0).move };
  }

  V.register({
    id: 'blockade', name: 'Blockade', cat: 'Strategie', order: 4, accent: '#5dff9d', party: true, noFirst: true,
    brain,
    short: 'Teile Ecke an Ecke legen, den anderen den Weg versperren.',
    desc: 'Jeder hat dieselben 21 Teile aus 1 bis 5 Kästchen. Deine Teile dürfen sich nur an den Ecken berühren, nie an einer Kante. Leg möglichst viel aufs Brett und versperr den anderen den Platz. Für 2 bis 4 Spieler, am Gerät oder gegen die KI.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Legt irgendein Teil, das passt, auch kleine viel zu früh.', 'Legt große Teile zuerst und sucht sich neue Ecken.', 'Drängt zur Mitte, hält sich Ecken offen und stellt deine zu.', 'Rechnet nach, wie viel Platz ihm und euch nach dem Zug bleibt.'],
    keys: [['Q / E', 'Teil wechseln'], ['R', 'Drehen'], ['F', 'Spiegeln'], ['Pfeile', 'Teil verschieben'], ['Enter / Klick', 'Teil legen'], ['Esc', 'Abwählen']],
    options: [{ id: 'n', label: 'Spieler', group: 'players', inline: 'local', live: false, def: 4, choices: [[2, '2'], [3, '3'], [4, '4']] }],
    localHint: 'Ihr spielt reihum am selben Gerät, jeder mit seiner Farbe.',
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="6" fill="#1a1d36"/><g stroke="#1a1d36" stroke-width="1.5"><path d="M7 7h8v8h8v8H7z" fill="#ff4fd8"/><path d="M23 7h18v8h-10v8h-8z" fill="#ffd84f"/><path d="M23 23h8v10h10v8H23z" fill="#62f0ff"/><path d="M7 31h8v-8h8v18H7z" fill="#5dff9d"/></g></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat <b>dieselben 21 Teile</b> aus 1 bis 5 Kästchen. Ihr legt reihum je ein Teil. Wer am Ende <b>die meisten Kästchen</b> auf dem Brett hat, gewinnt.' },
      { t: 'Der Start', d: 'Dein erstes Teil muss <b>dein Startfeld</b> bedecken: den Ring in deiner Farbe. Zu viert liegt es in deiner Ecke, zu zweit kurz vor der Mitte.', demo: rm(['......', '......', '......', '......', 'pp....', 'Sp....']) },
      { t: 'Ecke an Ecke', d: 'Jedes weitere Teil muss ein eigenes Teil <b>an einer Ecke</b> berühren. An einer <b>Kante</b> dürfen sich deine Teile nie berühren. Die Punkte zeigen dir, wo es weitergeht.', demo: rm(['......', '......', '..+x+.', '+xppx.', 'xppx..', 'pp+...']) },
      { t: 'Fremde Farben', d: 'Teile der anderen darfst du überall berühren, auch an Kanten. So schiebst du dich zwischen sie und <b>stellst ihre Ecken zu</b>.', demo: rm(['......', '..yy..', '.pyy..', 'pp....', 'p.....', '......']) },
      { t: 'Bedienung', d: '<b>Teil unten antippen</b>, dann aufs Brett tippen oder mit dem Finger schieben. Mit <b>Drehen</b> und <b>Spiegeln</b> passt du es an. Grün heißt: passt. Dann <b>nochmal aufs Teil tippen</b> oder Setzen. Am PC folgt das Teil der Maus, ein Klick legt es; R dreht, F spiegelt.' },
      { t: 'Ende und Punkte', d: 'Wer kein Teil mehr legen kann, ist raus, die anderen spielen weiter. Jedes gelegte Kästchen zählt einen Punkt. Alle 21 Teile gelegt: <b>+15</b>, und war das Einzelkästchen das letzte: <b>noch +5</b>.' },
      { t: 'Tipps', d: '<b>Große Teile zuerst</b>, die kleinen passen später noch in Lücken. Arbeite dich schnell <b>zur Mitte</b> vor und halte dir mehrere Ecken offen. Wer den anderen die Ecken zustellt, nimmt ihnen ganze Teile weg.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, { S, start } = geo(N);
      const b = new Int8Array(S * S), left = {}, laid = {}, out = {}, lastK = {}, firstAt = {};
      P.forEach(p => { left[p] = Array(21).fill(true); laid[p] = 0; out[p] = false; firstAt[p] = start[p][0] * S + start[p][1]; });
      let turn = 0, over = false, cur = null, last = [];
      // the person's choice: piece, orientation per piece, the ghost on the board and the square it aims at
      let sel = -1, ghost = null, aim = -1;
      const oriOf = {};
      const human = p => !ctx.isAI(p);
      const trayOf = () => (turn && human(turn) ? turn : P.find(human) || 1);
      const myTurn = () => !over && turn && human(turn) && cur;

      const wrap = V.el('div', 'bk n' + N);
      const board = V.el('div', 'bk-b'); board.style.setProperty('--s', S);
      const cells = []; for (let i = 0; i < S * S; i++) { const d = V.el('div', 'c'); cells.push(d); board.appendChild(d); }
      const side = V.el('div', 'bk-side'), scRow = V.el('div', 'bk-sc'), tray = V.el('div', 'bk-tray'), hint = V.el('div', 'bk-hint');
      const ctl = V.el('div', 'bk-ctl', `<button class="btn ghost" data-a="rot">${IC.rot}<span>Drehen</span></button><button class="btn ghost" data-a="flip">${IC.flip}<span>Spiegeln</span></button><button class="btn primary" data-a="go">${IC.ok}<span>Setzen</span></button>`);
      side.append(scRow, tray, ctl, hint);
      wrap.append(board, side);
      ctx.stage.appendChild(wrap);
      const btn = a => ctl.querySelector(`[data-a="${a}"]`);

      const stFor = p => (laid[p] ? -1 : firstAt[p]);
      const score = p => laid[p] + (left[p].every(x => !x) ? 15 + (lastK[p] === 0 ? 5 : 0) : 0);

      // ---------- drawing ----------
      const shown = new Array(S * S).fill('');
      function render() {
        const tp = trayOf();
        board.style.setProperty('--pc', `var(--p${tp})`);
        const an = new Set(myTurn() ? cur.anchors : []);
        const gh = new Map(); if (ghost) ghost.cells.forEach(i => gh.set(i, ghost.ok));
        const lm = new Set(last), starts = {};
        P.forEach(p => { if (!laid[p]) starts[firstAt[p]] = p; });
        for (let i = 0; i < S * S; i++) {
          let c = 'c';
          if (b[i]) c += ' o' + b[i]; else if (starts[i]) c += ' st' + starts[i];
          if (an.has(i) && !b[i]) c += ' an';
          if (gh.has(i)) c += ' gh ' + (gh.get(i) ? 'ok' : 'bad');
          if (lm.has(i)) c += ' lm';
          if (c !== shown[i]) { cells[i].className = c; shown[i] = c; }
        }
        board.classList.toggle('has', sel >= 0 && !!myTurn());
        board.classList.toggle('drag', sel >= 0 && !!myTurn());
        btn('rot').disabled = btn('flip').disabled = !(sel >= 0 && myTurn());
        btn('go').disabled = !(ghost && ghost.ok && myTurn());
        scRow.innerHTML = P.map(p => `<span class="${p === turn && !over ? 'on' : ''}${out[p] ? ' out' : ''}" style="--sc:var(--p${p})"><b class="c${p}">${score(p)}</b>${ctx.who(p)}</span>`).join('');
      }
      function renderTray() {
        const tp = trayOf(), can = new Set(myTurn() ? cur.moves.map(m => m.k) : []);
        tray.classList.toggle('wait', !myTurn());
        tray.innerHTML = '';
        // big pieces first: that is also the order in which you usually want to lay them
        const order = [...Array(21).keys()].sort((x, y) => PCS[y].n - PCS[x].n || x - y);
        order.forEach(k => {
          if (!left[tp][k]) return;
          const bt = V.el('button', 't' + tp + (k === sel ? ' sel' : '') + (myTurn() && !can.has(k) ? ' no' : ''), pic(k, oriOf[k] || 0));
          bt.style.setProperty('--pc', `var(--p${tp})`);
          bt.dataset.k = k;
          bt.setAttribute('aria-label', PCS[k].n + ' Kästchen');
          tray.appendChild(bt);
        });
      }
      function setHint() {
        if (!myTurn()) return (hint.textContent = '');
        hint.textContent = sel < 0 ? 'Wähl unten ein Teil' : !ghost ? 'Tipp aufs Brett, wo das Teil hin soll' : ghost.ok ? (V.coarse ? 'Nochmal aufs Teil tippen oder Setzen' : 'Klick legt das Teil') : !laid[turn] ? 'Dein erstes Teil muss dein Startfeld bedecken' : 'Passt hier nicht: Ecke an Ecke, nie Kante an Kante';
      }

      // ---------- choosing and placing ----------
      const legalOf = (k, o) => cur.moves.filter(m => m.k === k && m.o === o);
      const pivotCell = g => { const pv = PCS[g.k].or[g.o].piv; return (g.r + pv[0]) * S + g.c + pv[1]; };
      // put the ghost of the chosen piece near square t: exactly there if it fits, else a fitting spot over t,
      // else (near) the closest fitting spot within two squares, else red where it was asked for
      function snap(t, near) {
        const o = oriOf[sel] || 0, or = PCS[sel].or[o], tr = t / S | 0, tc = t % S;
        const r0 = Math.max(0, Math.min(S - or.h, tr - or.piv[0])), c0 = Math.max(0, Math.min(S - or.w, tc - or.piv[1]));
        const fit = legalOf(sel, o), exact = fit.find(m => m.r === r0 && m.c === c0);
        const dist = m => { const pv = pivotCell(m); return Math.hypot((pv / S | 0) - tr, pv % S - tc); };
        let m = exact || fit.filter(m => m.cells.includes(t)).sort((a, z) => dist(a) - dist(z))[0];
        if (!m && near) m = fit.filter(m => Math.max(Math.abs((pivotCell(m) / S | 0) - tr), Math.abs(pivotCell(m) % S - tc)) <= 2).sort((a, z) => dist(a) - dist(z))[0];
        if (m) ghost = { k: m.k, o: m.o, r: m.r, c: m.c, cells: m.cells, ok: true };
        else ghost = { k: sel, o, r: r0, c: c0, cells: or.cs.map(([r, c]) => (r0 + r) * S + c0 + c), ok: false };
        aim = t;
      }
      function choose(k) {
        if (!myTurn() || !left[turn][k]) return;
        if (sel === k) { sel = -1; ghost = null; V.sfx.ui(); return refresh(true); }
        sel = k;
        // keep the orientation the piece had; if it does not fit anywhere like that, take one that does
        if (!legalOf(k, oriOf[k] || 0).length) { const m = cur.moves.find(m => m.k === k); if (m) oriOf[k] = m.o; }
        const fit = legalOf(k, oriOf[k] || 0);
        if (aim >= 0) snap(aim, true);
        if ((!ghost || !ghost.ok) && fit.length) {
          // somewhere sensible: nearest to where you were working, else to the board's middle
          const tg = aim >= 0 ? aim : ((S / 2 | 0) * S + (S / 2 | 0)), tr = tg / S | 0, tc = tg % S;
          const m = fit.slice().sort((a, z) => { const pa = pivotCell(a), pz = pivotCell(z); return Math.hypot((pa / S | 0) - tr, pa % S - tc) - Math.hypot((pz / S | 0) - tr, pz % S - tc); })[0];
          ghost = { k, o: m.o, r: m.r, c: m.c, cells: m.cells, ok: true }; aim = pivotCell(m);
        }
        V.sfx.tick();
        refresh(true);
      }
      function turnPiece(how) {
        if (sel < 0 || !myTurn()) return;
        const o = oriOf[sel] || 0;
        oriOf[sel] = PCS[sel].or[o][how];
        snap(aim >= 0 ? aim : pivotCell(ghost || { k: sel, o, r: 0, c: 0 }), true);
        V.sfx.tick();
        refresh(true);
      }
      function placeGhost() {
        if (!ghost || !ghost.ok || !myTurn()) return;
        const m = cur.moves.find(x => x.k === ghost.k && x.o === ghost.o && x.r === ghost.r && x.c === ghost.c);
        if (m) act(m);
      }
      function refresh(trayToo) { render(); if (trayToo) renderTray(); setHint(); }

      // pointer: the mouse moves the ghost and a click (or letting go after dragging a piece in from the tray) lays it;
      // a finger taps to put the ghost there and taps it again to lay it, or drags it (it then sits two rows above the finger)
      const cellAt = (x, y, up) => {
        const a = cells[0].getBoundingClientRect(), z = cells[S * S - 1].getBoundingClientRect();
        const pitch = (z.left - a.left) / (S - 1) || 1;
        const c = Math.round((x - a.left - a.width / 2) / pitch), r = Math.round((y - a.top - a.height / 2) / pitch) - (up || 0);
        return r < 0 || r >= S || c < 0 || c >= S ? -1 : r * S + c;
      };
      let touch = null;
      board.addEventListener('pointermove', e => {
        if (sel < 0 || !myTurn()) return;
        if (e.pointerType === 'mouse') { const t = cellAt(e.clientX, e.clientY); if (t >= 0 && t !== aim) { snap(t, false); render(); setHint(); } return; }
        if (!touch) return;
        if (!touch.drag && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 8) return;
        touch.drag = true;
        const t = cellAt(e.clientX, e.clientY, 2);
        if (t >= 0 && t !== aim) { snap(t, false); render(); setHint(); }
      });
      board.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || sel < 0 || !myTurn()) return;
        touch = { x: e.clientX, y: e.clientY, drag: false, onGhost: !!(ghost && ghost.ok && ghost.cells.includes(cellAt(e.clientX, e.clientY))) };
      });
      board.addEventListener('pointerup', e => {
        if (!myTurn() || sel < 0) return;
        if (e.pointerType === 'mouse') { if (e.button === 0) { const t = cellAt(e.clientX, e.clientY); if (t >= 0 && t !== aim) snap(t, false); placeGhost(); render(); } return; }
        const t0 = touch; touch = null;
        if (!t0 || t0.drag) return refresh(false);
        const t = cellAt(e.clientX, e.clientY);
        if (t < 0) return;
        if (t0.onGhost && ghost && ghost.ok && ghost.cells.includes(t)) return placeGhost();
        snap(t, true); V.sfx.tick(); refresh(false);
      });
      board.addEventListener('pointercancel', () => { touch = null; });
      board.addEventListener('mouseleave', () => { if (ghost && !V.coarse) { ghost = null; render(); setHint(); } });
      board.addEventListener('wheel', e => { if (sel < 0 || !myTurn()) return; e.preventDefault(); turnPiece(e.shiftKey ? 'flip' : 'rot'); }, { passive: false });
      board.addEventListener('contextmenu', e => { if (sel >= 0 && myTurn()) { e.preventDefault(); turnPiece('rot'); } });
      // the mouse picks a piece on press (so it can be dragged onto the board), a finger on tap (so the row still scrolls)
      let trayPT = '';
      tray.addEventListener('pointerdown', e => { trayPT = e.pointerType; const bt = e.target.closest('button'); if (bt && trayPT === 'mouse') choose(+bt.dataset.k); });
      tray.addEventListener('click', e => { const bt = e.target.closest('button'); if (bt && trayPT !== 'mouse') choose(+bt.dataset.k); trayPT = ''; });
      ctl.addEventListener('click', e => {
        const a = e.target.closest('button'); if (!a) return;
        if (a.dataset.a === 'go') placeGhost(); else turnPiece(a.dataset.a);
      });
      ctx.keys(e => {
        if (!myTurn()) return false;
        const k = e.key.toLowerCase();
        if (k === 'r') { turnPiece('rot'); return true; }
        if (k === 'f') { turnPiece('flip'); return true; }
        if (k === 'escape' && sel >= 0) { sel = -1; ghost = null; refresh(true); return true; }
        if (k === 'q' || k === 'e') {
          const ks = [...tray.children].map(x => +x.dataset.k); if (!ks.length) return true;
          const i = ks.indexOf(sel);
          choose(ks[i < 0 ? 0 : (i + (k === 'e' ? 1 : -1) + ks.length) % ks.length]);
          return true;
        }
        if (sel < 0) return false;
        if (k === 'enter' || k === ' ') { placeGhost(); return true; }
        const d = { arrowup: [-1, 0], arrowdown: [1, 0], arrowleft: [0, -1], arrowright: [0, 1] }[k];
        if (d) {
          const t = aim >= 0 ? aim : (S / 2 | 0) * S + (S / 2 | 0), r = Math.max(0, Math.min(S - 1, (t / S | 0) + d[0])), c = Math.max(0, Math.min(S - 1, t % S + d[1]));
          snap(r * S + c, false); refresh(false);
          return true;
        }
        return false;
      });

      // ---------- the game ----------
      function act(m) {
        if (over) return;
        const p = turn;
        ctx.moved(p, enc(m));
        m.cells.forEach(i => { b[i] = p; });
        left[p][m.k] = false; laid[p] += m.cells.length; lastK[p] = m.k;
        last = m.cells; sel = -1; ghost = null; cur = null;
        render(); renderTray(); setHint();
        if (V.fxOn()) m.cells.forEach((i, j) => { cells[i].classList.remove('new'); ctx.later(() => cells[i].classList.add('new'), j * 25); });
        V.kit.placed(cells[m.cells[0]], V.hex(p), ctx.isAI(p));
        if (left[p].every(x => !x)) ctx.later(() => V.fx.floatAt(cells[m.cells[0]], '+' + (score(p) - laid[p]), V.hex(p)), 200);
        ctx.later(() => next(p), ctx.fast() ? 20 : 260);
      }
      function finish() {
        if (over) return;
        over = true; turn = 0; cur = null; render(); renderTray(); setHint();
        const best = Math.max(...P.map(score)), win = P.filter(p => score(p) === best);
        ctx.end(win.length > 1 ? 0 : win[0], P.map(score).join(' : ') + ' Punkte');
      }
      // the next player who can still lay something; who can't is out for good (the board only fills up)
      function next(from) {
        if (over) return;
        let i = P.indexOf(from), notice = '';
        for (let n = 0; n < N; n++) {
          i = (i + 1) % N;
          const p = P[i];
          if (out[p]) continue;
          const g = gen(b, S, p, left[p], stFor(p));
          if (!g.moves.length) {
            out[p] = true;
            notice = `${ctx.who(p)} ${ctx.name(p) === 'Du' ? 'kannst' : 'kann'} nichts mehr legen`;
            ctx.status(notice);
            render();
            if (P.every(q => out[q])) return ctx.later(finish, ctx.fast() ? 20 : 900);
            continue;
          }
          return begin(p, g, notice);
        }
        finish();
      }
      function begin(p, g, notice) {
        turn = p; cur = g;
        if (!human(p)) { sel = -1; ghost = null; }
        else if (sel >= 0 && !left[p][sel]) { sel = -1; ghost = null; }
        ctx.turn(p, notice || undefined);
        refresh(true);
        if (!ctx.isAI(p)) return;
        ctx.aiTurn({
          // nobody at this device is still in: the rest goes by faster
          side: p, quick: P.every(q => out[q] || ctx.isAI(q)),
          state: { b, S, p, P, out, laid, left, firstAt },
          targets: m => [cells[m.cells[0]], cells[m.cells[m.cells.length - 1]]],
          decoys: () => V.shuffle(g.anchors.slice()).slice(0, 4).map(i => cells[i]),
          apply: act,
          // raw: 'k.o.r.c' from online, or a copy of a move object (from the AI worker)
          decode: raw => { const [k, o, r, c] = (raw && typeof raw === 'object' ? enc(raw) : String(raw)).split('.').map(Number); return g.moves.find(m => m.k === k && m.o === o && m.r === r && m.c === c) || null; },
          say: m => PCS[m.k].n + ' Kästchen'
        });
      }
      next(P[N - 1]);
    }
  });
})();
