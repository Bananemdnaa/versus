(function () {
  // Hex on a rhombus of N × N hexagons. Side 1 (Pink) connects top and bottom, side 2 (Gelb) left and right.
  // The board can never fill up without a winner, so there is no draw. Cell index = r * N + c.
  // AI: random fill-ups of the board (all moves as first): a cell is worth as much as the share of
  // fill-ups won while the AI owns it. Plus: take a win, block a win at once.
  const NB = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]];
  const nbs = (N, i) => { const r = Math.floor(i / N), c = i % N, out = []; for (const [dr, dc] of NB) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc); } return out; };
  // a connecting chain for side p (or null): side 1 from row 0 to row N-1, side 2 from column 0 to column N-1
  function path(b, N, p) {
    const prev = new Map(), q = [];
    for (let k = 0; k < N; k++) { const i = p === 1 ? k : k * N; if (b[i] === p) { prev.set(i, -1); q.push(i); } }
    while (q.length) {
      const i = q.shift(), r = Math.floor(i / N), c = i % N;
      if ((p === 1 && r === N - 1) || (p === 2 && c === N - 1)) { const out = []; for (let x = i; x !== -1; x = prev.get(x)) out.push(x); return out; }
      for (const j of nbs(N, i)) if (b[j] === p && !prev.has(j)) { prev.set(j, i); q.push(j); }
    }
    return null;
  }
  // on a full board exactly one side is connected; checking side 1 is enough
  function fullWinner(b, N, NBS) {
    const seen = new Uint8Array(N * N), q = [];
    for (let c = 0; c < N; c++) if (b[c] === 1) { seen[c] = 1; q.push(c); }
    while (q.length) {
      const i = q.pop(); if (i >= N * (N - 1)) return 1;
      for (const j of NBS[i]) if (!seen[j] && b[j] === 1) { seen[j] = 1; q.push(j); }
    }
    return 2;
  }

  V.css(`
  .hx{width:min(var(--bw),680px);touch-action:manipulation}
  .hx svg{width:100%;height:auto;display:block;overflow:visible}
  .hx .cl{fill:#1c1f3a;stroke:#0b0c18;stroke-width:.06;transition:fill .15s}
  .hx.can .cl.e{cursor:pointer}
  @media (hover:hover) and (pointer:fine){.hx.can .cl.e:hover{fill:#2c3160}}
  .hx .cl.p1{fill:var(--p1)} .hx .cl.p2{fill:var(--p2)}
  .hx .cl.new{animation:hxin .35s var(--spring)}
  @keyframes hxin{from{transform:scale(.3);opacity:.2}}
  .hx .cl.kf{stroke:var(--cyan);stroke-width:.14}
  .hx .last{fill:none;stroke:#fff;stroke-width:.08;opacity:.85;pointer-events:none}
  .hx .w{fill:none;stroke:#fff;stroke-width:.16;stroke-linecap:round;stroke-linejoin:round;opacity:.9;pointer-events:none;stroke-dasharray:60;stroke-dashoffset:60;animation:hxw 1.2s ease forwards}
  @keyframes hxw{to{stroke-dashoffset:0}}
  .hx .ed1{fill:var(--p1)} .hx .ed2{fill:var(--p2)}
  .hx .co{font:700 .32px var(--f-d);fill:var(--muted);text-anchor:middle;dominant-baseline:middle;pointer-events:none}
  .nocoords .hx .co{display:none}`);

  V.register({
    id: 'hex', name: 'Hex', cat: 'Strategie', order: 6, accent: '#ff4fd8',
    short: 'Verbinde deine zwei Seiten.',
    desc: 'Ein Rautenbrett aus Sechsecken: Pink will oben mit unten verbinden, Gelb links mit rechts. Wer zuerst eine durchgehende Kette hat, gewinnt. Ein Unentschieden gibt es nie.',
    levelInfo: ['Setzt ziemlich wahllos.', 'Spielt ein paar hundert Partien im Kopf durch.', 'Rechnet tausende Partien durch.', 'Rechnet so viel es geht. Sehr stark auf kleinen Brettern.'],
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Stein setzen']],
    options: [{ id: 'size', label: 'Brett', def: 9, choices: [[7, '7 × 7'], [9, '9 × 9'], [11, '11 × 11']] }],
    icon: `<svg viewBox="0 0 48 48"><path d="M6 10h24l12 28H18z" fill="#1c1f3a" stroke="#0b0c18"/><path d="M6 10h24" stroke="#ff4fd8" stroke-width="3"/><path d="M18 38h24" stroke="#ff4fd8" stroke-width="3"/><path d="M6 10l12 28" stroke="#ffd84f" stroke-width="3"/><path d="M30 10l12 28" stroke="#ffd84f" stroke-width="3"/>${[[14, 16], [19, 22], [22, 28], [27, 33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#ff4fd8"/>`).join('')}<circle cx="27" cy="20" r="3" fill="#ffd84f"/><circle cx="31" cy="26" r="3" fill="#ffd84f"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Ihr setzt abwechselnd einen Stein auf ein freies Sechseck. <b>Pink</b> will eine Kette von der <b>oberen zur unteren</b> Kante bauen, <b>Gelb</b> von der <b>linken zur rechten</b>. Die farbigen Ränder zeigen, wohin.' },
      { t: 'Ketten', d: 'Zwei Steine sind verbunden, wenn ihre Sechsecke sich an einer Kante berühren. Jedes Feld hat bis zu <b>sechs Nachbarn</b>. Die Kette darf beliebig kurvig sein.' },
      { t: 'Kein Remis', d: 'Ist das Brett voll, hat immer genau einer eine Verbindung. Wer den anderen blockiert, baut damit automatisch seine eigene Kette.' },
      { t: 'Tipps', d: 'Die <b>Mitte</b> ist am wertvollsten. Statt Steine direkt nebeneinander zu setzen, ist eine <b>Brücke</b> stark: zwei Steine mit genau zwei gemeinsamen freien Nachbarn. Setzt der Gegner in eine Lücke, nimmst du die andere.' }
    ],
    start(ctx) {
      const N = [7, 9, 11].includes(+ctx.opts.size) ? +ctx.opts.size : 9, NN = N * N;
      const NBS = Array.from({ length: NN }, (_, i) => nbs(N, i));
      let b = Array(NN).fill(0), turn = 1, last = -1, over = false, busy = false, n = 0;
      // geometry: pointy hexagons, the rhombus leans to the right
      // (neighbouring centres 1 apart, so the hexagon radius is 1/√3 and rows are 0.866 apart)
      const RAD = 1 / Math.sqrt(3), cx = i => (i % N) + Math.floor(i / N) * 0.5, cy = i => Math.floor(i / N) * 1.5 * RAD;
      const hexPath = (x, y, r = RAD) => { let d = ''; for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90); d += (k ? 'L' : 'M') + (x + r * Math.cos(a)).toFixed(3) + ' ' + (y + r * Math.sin(a)).toFixed(3); } return d + 'Z'; };
      const wrap = V.el('div', 'hx'); ctx.stage.appendChild(wrap);
      const minX = -0.9, maxX = N - 1 + (N - 1) * 0.5 + 0.9, maxY = cy(NN - 1) + 0.9;
      // coloured edges as long strips just outside the board
      const p0 = [cx(0), cy(0)], p1 = [cx(N - 1), cy(N - 1)], p2 = [cx(NN - N), cy(NN - N)], p3 = [cx(NN - 1), cy(NN - 1)];
      const strip = (a, b2, dx, dy, cls) => `<path class="${cls}" d="M${a[0]} ${a[1]}L${b2[0]} ${b2[1]}L${b2[0] + dx} ${b2[1] + dy}L${a[0] + dx} ${a[1] + dy}Z"/>`;
      let svg = `<svg viewBox="${minX} ${-0.95} ${maxX - minX} ${maxY + 1.9}">`;
      svg += strip([p0[0] - 0.5, p0[1]], [p1[0] + 0.5, p1[1]], 0, -0.62, 'ed1');
      svg += strip([p2[0] - 0.5, p2[1]], [p3[0] + 0.5, p3[1]], 0, 0.62, 'ed1');
      svg += strip([p0[0], p0[1] - 0.6], [p2[0], p2[1] + 0.6], -0.62, 0, 'ed2');
      svg += strip([p1[0], p1[1] - 0.6], [p3[0], p3[1] + 0.6], 0.62, 0, 'ed2');
      for (let i = 0; i < NN; i++) svg += `<path class="cl e" data-i="${i}" d="${hexPath(cx(i), cy(i))}" style="transform-origin:${cx(i)}px ${cy(i)}px"/>`;
      for (let c = 0; c < N; c++) svg += `<text class="co" x="${cx(c)}" y="${cy(c) - 0.95}">${'abcdefghijk'[c]}</text>`;
      for (let r = 0; r < N; r++) svg += `<text class="co" x="${cx(r * N) - 0.95}" y="${cy(r * N)}">${r + 1}</text>`;
      svg += `<g id="hxo"></g></svg>`;
      wrap.innerHTML = svg;
      const cells = [...wrap.querySelectorAll('.cl')], over_ = wrap.querySelector('#hxo');
      const name = i => 'abcdefghijk'[i % N] + (Math.floor(i / N) + 1);
      const human = () => !over && !busy && !ctx.isAI(turn);
      function draw() {
        cells.forEach((el, i) => { el.classList.toggle('e', !b[i]); el.classList.toggle('p1', b[i] === 1); el.classList.toggle('p2', b[i] === 2); });
        wrap.classList.toggle('can', human());
        over_.innerHTML = last >= 0 && !over ? `<path class="last" d="${hexPath(cx(last), cy(last), RAD * 0.55)}"/>` : '';
      }
      wrap.addEventListener('click', e => { const t = e.target.closest('.cl'); if (t && human() && !b[+t.dataset.i]) put(+t.dataset.i); });
      ctx.nav(() => human() ? cells.filter((_, i) => !b[i]) : [], { pad: 1 });
      function put(i) {
        if (over || b[i]) return;
        ctx.moved(turn, i);
        const who = turn;
        b[i] = who; last = i; n++;
        draw();
        cells[i].classList.add('new'); setTimeout(() => cells[i].classList.remove('new'), 400);
        if (ctx.isAI(who)) V.sfx.them(); else V.sfx.place();
        const p = path(b, N, who);
        if (p) {
          over = true; draw();
          over_.innerHTML = `<polyline class="w" points="${p.map(j => cx(j) + ',' + cy(j)).join(' ')}"/>`;
          p.forEach((j, k) => ctx.later(() => V.fx.burstAt(cells[j], '#ffffff', 5, 40), k * 50));
          return ctx.end(who, `${p.length} Steine in der Kette`);
        }
        turn = 3 - who;
        busy = true;
        ctx.later(() => { busy = false; next(); }, ctx.fast() ? 0 : 160);
      }
      function think() {
        const L = ctx.level, me = turn, op = 3 - me, free = [];
        for (let i = 0; i < NN; i++) if (!b[i]) free.push(i);
        // a move that wins, then a move that stops the other from winning
        if (L >= 1) for (const p of [me, op]) for (const i of free) { b[i] = p; const w = path(b, N, p); b[i] = 0; if (w) return { move: i, mood: p === me ? 1 : -0.6 }; }
        const runs = [40, 400, 2500, 9000][L], ms = [300, 700, 1600, 2600][L], deadline = performance.now() + ms;
        const won = new Float64Array(NN), cnt = new Float64Array(NN), fill = b.slice();
        const rest = free.slice(); let wins = 0, k = 0;
        // first move of the fill-up is ours, the stones then alternate
        for (; k < runs; k++) {
          if ((k & 31) === 0 && performance.now() > deadline) break;
          for (let a = rest.length - 1; a > 0; a--) { const j = Math.floor(Math.random() * (a + 1)); const t = rest[a]; rest[a] = rest[j]; rest[j] = t; }
          for (let a = 0; a < rest.length; a++) fill[rest[a]] = a % 2 ? op : me;
          const w = fullWinner(fill, N, NBS) === me;
          if (w) wins++;
          for (let a = 0; a < rest.length; a += 2) { cnt[rest[a]]++; if (w) won[rest[a]]++; }
        }
        // a small pull to the middle keeps the weak levels from playing on the rim
        const mid = (N - 1) / 2, centre = i => -Math.hypot(Math.floor(i / N) - mid, i % N - mid) * (L === 0 ? 0.08 : 0.01);
        const scored = free.map(i => ({ m: i, v: (cnt[i] ? won[i] / cnt[i] : 0) + centre(i) }));
        const pick = L === 0 ? V.weak(scored, 0.08, 0.35) : L === 1 ? V.pickSoft(scored, 0.02) : V.pickSoft(scored, 0);
        return { move: pick.move, mood: Math.max(-1, Math.min(1, (wins / Math.max(1, k) - 0.5) * 2.4)) };
      }
      function next() {
        ctx.turn(turn);
        draw();
        if (!ctx.isAI(turn)) { if (n === 0) ctx.status(`${ctx.who(turn)}: verbinde ${turn === 1 ? 'oben und unten' : 'links und rechts'}`); return; }
        ctx.aiTurn({
          think,
          targets: i => [cells[i]],
          decoys: () => cells.filter((_, i) => !b[i]).sort(() => Math.random() - 0.5).slice(0, 3),
          apply: put,
          decode: i => (Number.isInteger(i) && i >= 0 && i < NN && !b[i] ? i : null),
          say: name
        });
      }
      next();
    }
  });
})();
