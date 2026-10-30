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
  /* every layer has its colour, in all views: whole boards from above, stripes in the slices */
  .t3 .l0{--lc:#4f7cff} .t3 .l1{--lc:#a970ff} .t3 .l2{--lc:#2fd4b4} .t3 .l3{--lc:#ff9f43}
  .t3-c{background:color-mix(in srgb,var(--lc) 24%,var(--panel2))}
  .t3-row{display:flex;gap:4px;align-items:stretch}
  .t3-row .t3-g{flex:1}
  .t3-ax{display:grid;grid-template-rows:repeat(4,1fr);gap:3px;padding:5px 0}
  .t3 .t3-g.t3-g[class*=" l"]{border-color:color-mix(in srgb,var(--lc) 70%,transparent)}
  .t3-ax b{display:grid;place-items:center;width:16px;border-radius:4px;background:var(--lc);color:var(--ink);font:800 italic 11px/1 var(--f-d)}
  .t3.can .t3-c.e{cursor:pointer}
  @media (hover:hover) and (pointer:fine){.t3.can .t3-c.e:hover{background:color-mix(in srgb,var(--lc) 45%,var(--panel3))}.t3.can .t3-c.e.lit{background:color-mix(in srgb,var(--lc) 45%,var(--panel3))}}
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
  .nohints .t3-c.th::after{display:none}
  .t3-box{width:min(var(--bw),640px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .t3-views{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--panel);border:1px solid var(--line);flex-wrap:wrap;justify-content:center}
  .t3-views button{padding:7px 11px;border-radius:9px;font:800 italic 13px/1 var(--f-d);text-transform:uppercase;letter-spacing:.04em;color:var(--muted);background:none}
  .t3-views button.on{background:var(--cyan);color:var(--ink)}
  .t3-hint{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12.5px;text-align:center;min-height:34px;max-width:440px}
  .t3:not(.v-top) .t3-g{transform:none}
  /* 3D: the four layers stacked, tilted and turned; the stones always face the viewer */
  .t3.v-cube{display:block}
  .t3-scene{--size:clamp(150px,44vw,200px);--gap:clamp(84px,26vw,112px);perspective:1400px;height:calc(var(--gap) * 2.9 + var(--size) * 1);display:grid;place-items:center;touch-action:pan-y;cursor:grab;user-select:none}
  .t3-stack{position:relative;width:var(--size);aspect-ratio:1;transform-style:preserve-3d;transform:translateY(calc(var(--gap) * 1.35)) rotateX(68deg) rotateZ(var(--rz));transition:transform .35s var(--ease)}
  .t3-stack.drag{transition:none}
  .t3.v-cube .t3-g{position:absolute;inset:0;transform:translateZ(calc(var(--k) * var(--gap)));transform-style:preserve-3d;background:rgba(29,33,64,.5);border-color:rgba(98,240,255,.35)}
  .t3.v-cube .t3-c{background:color-mix(in srgb,var(--lc) 30%,transparent);transform-style:preserve-3d;transform:translateZ(1px)}
  .t3.v-cube .t3-c i{transform:translateZ(calc(var(--size) / 22)) rotateZ(calc(var(--rz) * -1)) rotateX(-68deg);pointer-events:none}
  .t3-lab{position:absolute;left:-26px;top:50%;font:800 italic 14px/1 var(--f-d);color:var(--lc);transform:translateY(-50%) rotateZ(calc(var(--rz) * -1)) rotateX(-68deg)}`);

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
      { t: 'Ansichten', d: 'Über dem Brett wechselst du die Ansicht. <b>Von vorne</b> und <b>Von der Seite</b> schneiden den Würfel anders in Scheiben, dann sehen Reihen durch die Ebenen ganz normal aus. <b>3D</b> stapelt die Ebenen übereinander, den Würfel kannst du drehen.' },
      { t: 'Tipps', d: 'Die <b>Ecken</b> und die <b>vier Mittelfelder</b> der beiden inneren Ebenen liegen auf den meisten Reihen. Hat der Gegner drei in einer Reihe mit einem freien Feld, markiert Versus dieses Feld rot gestrichelt (abschaltbar mit den Hinweisen).' }
    ],
    start(ctx) {
      let s = { b: Array(64).fill(0), turn: 1, last: -1, n: 0 }, over = false, busy = false, winLine = null, winShown = 0;
      // views: the four layers from above, the cube cut into slices from the front or the side, or all layers stacked in 3D
      const VIEWS = [['top', 'Ebenen'], ['front', 'Von vorne'], ['side', 'Von der Seite'], ['cube', '3D']];
      const HINT = {
        top: 'Jede Tafel ist eine Ebene von oben, jede Ebene hat ihre Farbe: 1 blau (unten), 2 lila, 3 türkis, 4 orange (oben).',
        front: 'Der Würfel von vorne in Scheiben geschnitten: Jede Zeile ist eine Ebene (Farbe und Zahl links). Reihen durch die Ebenen laufen hier senkrecht oder schräg.',
        side: 'Der Würfel von der Seite in Scheiben geschnitten: Jede Zeile ist eine Ebene (Farbe und Zahl links). Reihen durch die Ebenen laufen hier senkrecht oder schräg.',
        cube: 'Alle vier Ebenen übereinander, Ebene 1 unten. Zum Drehen wischen oder die Pfeile tippen.'
      };
      let view = V.store.get('ttt3view', 'top'), rz = V.store.get('ttt3rot', -35);
      if (!VIEWS.some(v => v[0] === view)) view = 'top';
      const box = V.el('div', 't3-box'), bar = V.el('div', 't3-views'), wrap = V.el('div', 't3'), hint = V.el('div', 't3-hint');
      box.append(bar, wrap, hint); ctx.stage.appendChild(box);
      let cells = [];
      // the cell at slice k, grid row g, grid column c (in the side views row 0 is the top layer)
      const at = (k, g, c) => view === 'front' ? (3 - g) * 16 + k * 4 + c : view === 'side' ? (3 - g) * 16 + c * 4 + k : k * 16 + g * 4 + c;
      const label = k => view === 'front' ? `Reihe ${k + 1}` : view === 'side' ? `Spalte ${'abcd'[k]}` : `Ebene ${k + 1}`;
      function grid(k) {
        // from above and in 3D a board is one layer and wears its colour on the rim
        const g = V.el('div', 't3-g' + (view === 'top' || view === 'cube' ? ' l' + k : ''));
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const i = at(k, r, c), el = V.el('div', 't3-c e l' + Math.floor(i / 16), '<i></i>'); el.dataset.i = i; cells[i] = el; g.appendChild(el); }
        return g;
      }
      function build() {
        cells = []; wrap.className = 't3 v-' + view; wrap.innerHTML = '';
        bar.innerHTML = VIEWS.map(([v, l]) => `<button class="${v === view ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
        if (view === 'cube') {
          const scene = V.el('div', 't3-scene'), stack = V.el('div', 't3-stack');
          stack.style.setProperty('--rz', rz + 'deg');
          for (let k = 0; k < 4; k++) { const g = grid(k); g.style.setProperty('--k', k); g.insertAdjacentHTML('beforeend', `<small class="t3-lab l${k}">${k + 1}</small>`); stack.appendChild(g); }
          scene.appendChild(stack); wrap.appendChild(scene);
          hint.innerHTML = `<button class="iconbtn" data-r="-1" aria-label="Nach links drehen">⟲</button><span>${HINT.cube}</span><button class="iconbtn" data-r="1" aria-label="Nach rechts drehen">⟳</button>`;
        } else {
          for (let k = 0; k < 4; k++) {
            const lay = V.el('div', 't3-l', `<small>${label(k)}</small>`);
            // in the slices every row is one layer: its number in its colour on the left
            if (view === 'top') lay.appendChild(grid(k));
            else { const row = V.el('div', 't3-row', `<div class="t3-ax">${[4, 3, 2, 1].map(n => `<b class="l${n - 1}">${n}</b>`).join('')}</div>`); row.appendChild(grid(k)); lay.appendChild(row); }
            wrap.appendChild(lay);
          }
          hint.innerHTML = `<span>${HINT[view]}</span>`;
        }
        draw();
      }
      bar.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b || b.dataset.v === view) return; view = b.dataset.v; V.store.set('ttt3view', view); V.sfx.ui(); build(); });
      // turning the cube: arrow buttons in 90° steps, or dragging sideways
      const turnTo = (deg, smooth) => { rz = deg; const st = wrap.querySelector('.t3-stack'); if (st) { st.classList.toggle('drag', !smooth); st.style.setProperty('--rz', rz + 'deg'); } };
      hint.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { turnTo(Math.round((rz + 90 * +b.dataset.r) / 45) * 45, true); V.store.set('ttt3rot', rz); V.sfx.tick(); } });
      let drag = null, dragged = false;
      wrap.addEventListener('pointerdown', e => { if (view === 'cube') { drag = { x: e.clientX, rz }; dragged = false; } });
      wrap.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) dragged = true; if (dragged) turnTo(drag.rz + dx * 0.6, false); });
      const endDrag = () => { if (drag && dragged) V.store.set('ttt3rot', rz); drag = null; };
      wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag); wrap.addEventListener('pointerleave', endDrag);
      const name = i => `Ebene ${Math.floor(i / 16) + 1}, ${'abcd'[i % 4]}${Math.floor(i % 16 / 4) + 1}`;
      const human = () => !over && !busy && !ctx.isAI(s.turn);
      // the same cell in the other layers lights up, so lines through the layers are easier to see
      wrap.addEventListener('mouseover', e => { const t = e.target.closest('.t3-c'); cells.forEach(c => c.classList.toggle('lit', !!t && +c.dataset.i % 16 === +t.dataset.i % 16 && c !== t)); });
      wrap.addEventListener('mouseleave', () => cells.forEach(c => c.classList.remove('lit')));
      wrap.addEventListener('click', e => { if (dragged) { dragged = false; return; } const t = e.target.closest('.t3-c'); if (t && human() && !s.b[+t.dataset.i]) put(+t.dataset.i); });
      ctx.nav(() => human() ? cells.filter((_, i) => !s.b[i]) : [], { pad: 1 });
      function draw() {
        const op = 3 - s.turn, threat = new Set();
        if (!over) for (const w of LINES) { let o = 0, free = -1, a = 0; for (const j of w) { if (s.b[j] === op) o++; else if (!s.b[j]) free = j; else a++; } if (o === 3 && !a && free >= 0) threat.add(free); }
        cells.forEach((c, i) => {
          c.classList.toggle('e', !s.b[i]); c.classList.toggle('p1', s.b[i] === 1); c.classList.toggle('p2', s.b[i] === 2);
          c.classList.toggle('last', i === s.last && !over);
          c.classList.toggle('th', human() && threat.has(i));
          c.classList.toggle('w', !!winLine && winLine.indexOf(i) >= 0 && winLine.indexOf(i) < winShown);
        });
        wrap.classList.toggle('can', human());
        wrap.classList.toggle('done', over && !!winLine);
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
          over = true; busy = false; winLine = line; draw();
          line.forEach((j, n) => ctx.later(() => { winShown = n + 1; cells[j].classList.add('w'); V.fx.burstAt(cells[j], '#ffffff', 6, 45); }, n * 110));
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
      build();
      next();
    }
  });
})();
