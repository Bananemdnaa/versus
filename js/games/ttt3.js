(function () {
  // 3D Tic Tac Toe: a cube of 4 × 4 × 4 cells shown as four layers. Four in a row in any direction wins,
  // also through the layers and across the space diagonals (76 lines). Cell index = layer * 16 + row * 4 + col.
  const LINES = [];
  {
    const at = (l, r, c) => l * 16 + r * 4 + c, ok = v => v >= 0 && v < 4;
    for (let l = 0; l < 4; l++) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
      for (let dl = -1; dl <= 1; dl++) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dl && !dr && !dc) continue;
        // each line once: only from the end where it starts (the cell before it is off the cube)
        if (ok(l - dl) && ok(r - dr) && ok(c - dc)) continue;
        const w = []; for (let k = 0; k < 4; k++) { const a = l + dl * k, b = r + dr * k, d = c + dc * k; if (!ok(a) || !ok(b) || !ok(d)) break; w.push(at(a, b, d)); }
        if (w.length === 4) { const key = w.slice().sort((x, y) => x - y).join(); if (!LINES.some(x => x.key === key)) LINES.push(Object.assign(w, { key })); }
      }
  }
  const BY = Array.from({ length: 64 }, () => []);
  LINES.forEach((w, k) => w.forEach(i => BY[i].push(k)));
  const lineAt = (b, i) => { for (const k of BY[i]) if (LINES[k].every(j => b[j] === b[i])) return LINES[k]; return null; };
  // cells on many lines (corners and the inner eight) first
  const ORDER = [...Array(64).keys()].sort((a, b) => BY[b].length - BY[a].length);

  const G = {
    moves: s => ORDER.filter(i => !s.b[i]),
    // threats first: cells that finish or block a line of three, then the strong cells
    order(s, ms) {
      const me = s.turn, op = 3 - me, v = i => { let x = 0; for (const k of BY[i]) { let a = 0, o = 0; for (const j of LINES[k]) { if (s.b[j] === me) a++; else if (s.b[j] === op) o++; } if (!o && a === 3) x += 1000; else if (!a && o === 3) x += 500; else if (!o) x += a * a; else if (!a) x += o * o * 0.8; } return x; };
      return ms.map(m => [m, v(m)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    },
    play(s, i) { const b = s.b.slice(); b[i] = s.turn; return { b, turn: 3 - s.turn, last: i, n: s.n + 1 }; },
    over(s, ply) { if (s.last >= 0 && lineAt(s.b, s.last)) return -(100000 - ply); if (s.n >= 64) return 0; return null; },
    eval(s) {
      const me = s.turn, op = 3 - me, b = s.b; let v = 0;
      for (const w of LINES) {
        let a = 0, o = 0;
        for (const i of w) { if (b[i] === me) a++; else if (b[i] === op) o++; }
        if (a && o) continue;
        v += [0, 1, 8, 60][a] - [0, 1, 9, 80][o];
      }
      return v;
    }
  };

  V.css(`
  .t3{width:min(var(--bw),640px);display:grid;grid-template-columns:repeat(4,1fr);gap:10px;touch-action:manipulation}
  @media (max-width:560px){.t3{grid-template-columns:repeat(2,1fr);gap:12px}}
  .t3-l{display:flex;flex-direction:column;gap:4px}
  .t3-l small{font:700 italic 11px/1 var(--f-d);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);text-align:center}
  .t3-g{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:5px;border-radius:10px;background:var(--panel);border:1px solid var(--line);transform:perspective(500px) rotateX(18deg);transform-origin:50% 100%}
  .t3-c{aspect-ratio:1;border-radius:6px;background:var(--panel2);display:grid;place-items:center;position:relative;transition:background .15s}
  .t3.can .t3-c.e{cursor:pointer}
  @media (hover:hover) and (pointer:fine){.t3.can .t3-c.e:hover{background:var(--panel3)}.t3.can .t3-c.e.lit{background:var(--panel3)}}
  .t3-c i{width:72%;height:72%;border-radius:50%}
  .t3-c.p1 i{background:radial-gradient(circle at 35% 30%,var(--p1hi),var(--p1) 62%);box-shadow:0 0 8px color-mix(in srgb,var(--p1) 55%,transparent)}
  .t3-c.p2 i{background:radial-gradient(circle at 35% 30%,var(--p2hi),var(--p2) 62%);box-shadow:0 0 8px color-mix(in srgb,var(--p2) 55%,transparent)}
  .t3-c.new i{animation:t3in .35s var(--spring)}
  @keyframes t3in{from{transform:scale(.2)}}
  .t3-c.last{box-shadow:0 0 0 2px rgba(255,255,255,.6)}
  .t3-c.kf{box-shadow:0 0 0 2px var(--cyan)}
  .t3-c.w{box-shadow:0 0 0 2px #fff,0 0 12px rgba(255,255,255,.7);animation:winPulse .9s ease-in-out infinite}
  .t3.done .t3-c:not(.w) i{opacity:.4;transition:opacity .5s}
  .t3-c.th::after{content:'';position:absolute;inset:2px;border-radius:5px;border:2px dashed var(--bad);opacity:.7;pointer-events:none}
  .nohints .t3-c.th::after{display:none}`);

  V.register({
    id: 'ttt3', name: '3D Tic Tac Toe', cat: 'Klassiker', order: 5, accent: '#62f0ff',
    short: 'Vier in einer Reihe, durch vier Ebenen.',
    desc: 'Tic Tac Toe im Würfel: vier Ebenen mit je 4 × 4 Feldern. Wer zuerst vier in einer Reihe hat, gewinnt, auch quer durch die Ebenen und diagonal durch den ganzen Würfel.',
    levelInfo: ['Übersieht oft Reihen durch die Ebenen.', 'Blockt Dreier, plant aber kaum.', 'Rechnet ein paar Züge voraus.', 'Rechnet tief und baut doppelte Drohungen.'],
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Stein setzen']],
    icon: `<svg viewBox="0 0 48 48">${[0, 1, 2].map(l => `<g transform="translate(${4 + l * 4} ${30 - l * 11}) skewX(-30)"><rect width="26" height="10" rx="2" fill="#1d2140" stroke="#3b4aa8"/>${[0, 1, 2, 3].map(c => `<circle cx="${4 + c * 6}" cy="5" r="2" fill="${(l === 0 && c === 0) || (l === 1 && c === 1) || (l === 2 && c === 2) ? '#62f0ff' : c === 3 && l === 0 ? '#ff4fd8' : '#0b0c15'}"/>`).join('')}</g>`).join('')}</svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Gespielt wird in einem Würfel aus <b>vier Ebenen</b> mit je 4 × 4 Feldern. Ihr setzt abwechselnd einen Stein in ein freies Feld, egal in welcher Ebene. Wer zuerst <b>vier in einer Reihe</b> hat, gewinnt.' },
      { t: 'Reihen in einer Ebene', d: 'Wie bei Tic Tac Toe zählen Reihen <b>waagerecht, senkrecht und diagonal</b> innerhalb einer Ebene.' },
      { t: 'Reihen durch die Ebenen', d: 'Auch dasselbe Feld in allen vier Ebenen ist eine Reihe, ebenso <b>Treppen</b>: ein Feld weiter pro Ebene, gerade oder schräg. Die vier langen Diagonalen gehen durch den ganzen Würfel, von Ecke zu Ecke.' },
      { t: 'Tipps', d: 'Die <b>Ecken</b> und die <b>vier Mittelfelder</b> der beiden inneren Ebenen liegen auf den meisten Reihen. Hat der Gegner drei in einer Reihe mit einem freien Feld, markiert Versus dieses Feld rot gestrichelt (abschaltbar mit den Hinweisen).' }
    ],
    start(ctx) {
      let s = { b: Array(64).fill(0), turn: 1, last: -1, n: 0 }, over = false, busy = false;
      const wrap = V.el('div', 't3'), cells = [];
      for (let l = 0; l < 4; l++) {
        const lay = V.el('div', 't3-l', `<small>Ebene ${l + 1}</small>`), g = V.el('div', 't3-g');
        for (let k = 0; k < 16; k++) { const c = V.el('div', 't3-c e', '<i></i>'); c.dataset.i = l * 16 + k; cells.push(c); g.appendChild(c); }
        lay.appendChild(g); wrap.appendChild(lay);
      }
      ctx.stage.appendChild(wrap);
      const name = i => `Ebene ${Math.floor(i / 16) + 1}, ${'abcd'[i % 4]}${Math.floor(i % 16 / 4) + 1}`;
      const human = () => !over && !busy && !ctx.isAI(s.turn);
      // the same cell in the other layers lights up, so lines through the layers are easier to see
      wrap.addEventListener('mouseover', e => { const t = e.target.closest('.t3-c'); cells.forEach(c => c.classList.toggle('lit', !!t && +c.dataset.i % 16 === +t.dataset.i % 16 && c !== t)); });
      wrap.addEventListener('mouseleave', () => cells.forEach(c => c.classList.remove('lit')));
      wrap.addEventListener('click', e => { const t = e.target.closest('.t3-c'); if (t && human() && !s.b[+t.dataset.i]) put(+t.dataset.i); });
      ctx.nav(() => human() ? cells.filter((_, i) => !s.b[i]) : [], { pad: 1 });
      function draw() {
        const op = 3 - s.turn, threat = new Set();
        if (!over) for (const w of LINES) { let o = 0, free = -1, a = 0; for (const j of w) { if (s.b[j] === op) o++; else if (!s.b[j]) free = j; else a++; } if (o === 3 && !a && free >= 0) threat.add(free); }
        cells.forEach((c, i) => {
          c.classList.toggle('e', !s.b[i]); c.classList.toggle('p1', s.b[i] === 1); c.classList.toggle('p2', s.b[i] === 2);
          c.classList.toggle('last', i === s.last && !over);
          c.classList.toggle('th', human() && threat.has(i));
        });
        wrap.classList.toggle('can', human());
      }
      function put(i) {
        if (over || s.b[i]) return;
        ctx.moved(s.turn, i);
        const who = s.turn;
        s = G.play(s, i);
        busy = true; draw();
        cells[i].classList.add('new'); setTimeout(() => cells[i].classList.remove('new'), 400);
        V.kit.placed(cells[i], V.hex(who), ctx.isAI(who));
        const line = lineAt(s.b, i);
        if (line) {
          over = true; busy = false; wrap.classList.add('done'); draw();
          line.forEach((j, n) => ctx.later(() => { cells[j].classList.add('w'); V.fx.burstAt(cells[j], '#ffffff', 6, 45); }, n * 110));
          return ctx.end(who);
        }
        if (s.n >= 64) { over = true; busy = false; draw(); return ctx.end(0); }
        ctx.later(() => { busy = false; next(); }, ctx.fast() ? 0 : 140);
      }
      function next() {
        ctx.turn(s.turn); draw();
        if (!ctx.isAI(s.turn)) return;
        ctx.aiTurn({
          think: () => {
            const L = ctx.level;
            const r = L === 0 ? V.weak(V.searchAll(G, s, 1, 400), 30, 0.3) : L === 1 ? V.pickSoft(V.searchAll(G, s, 2, 700), 10) : V.search(G, s, [3, 8][L - 2], [900, 2200][L - 2]);
            return { move: r.move, mood: V.mood(r.score, 80) };
          },
          targets: i => [cells[i]],
          decoys: () => G.order(s, G.moves(s)).slice(1, 4).map(i => cells[i]),
          apply: put,
          decode: i => (Number.isInteger(i) && i >= 0 && i < 64 && !s.b[i] ? i : null),
          say: name
        });
      }
      next();
    }
  });
})();
