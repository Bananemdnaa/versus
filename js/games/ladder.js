(function () {
  // Leiterspiel (snakes and ladders): 100 fields in snake order from bottom left. Ladders lift you up, snakes
  // send you down. Exactly 100 wins; rolling too high bounces back. Every roll is a move ('r') drawn from ctx.rng.
  const LADDERS = [[3, 22], [8, 30], [21, 42], [28, 84], [50, 67], [58, 77], [71, 91], [80, 99]];
  const SNAKES = [[17, 7], [54, 34], [62, 19], [64, 60], [87, 24], [93, 73], [95, 75], [98, 79]];
  const JUMP = {}; LADDERS.forEach(([a, b]) => { JUMP[a] = b; }); SNAKES.forEach(([a, b]) => { JUMP[a] = b; });
  const CLR = { 1: '#ff3fbf', 2: '#ffc61a', 3: '#1fc8e6', 4: '#2fd673' };
  // centre of field n in board percent
  const pos = n => { const r = Math.floor((n - 1) / 10), c = r % 2 ? 9 - (n - 1) % 10 : (n - 1) % 10; return [c * 10 + 5, (9 - r) * 10 + 5]; };

  function ladderSvg(a, b) {
    const [x1, y1] = pos(a), [x2, y2] = pos(b), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len * 1.7, ny = dx / len * 1.7;
    let rungs = '';
    for (let t = 0.12; t < 0.95; t += 6 / len) rungs += `<path d="M${x1 + dx * t + nx} ${y1 + dy * t + ny}L${x1 + dx * t - nx} ${y1 + dy * t - ny}"/>`;
    return `<g class="lad"><g class="lr">${rungs}</g><path class="rail" d="M${x1 + nx} ${y1 + ny}L${x2 + nx} ${y2 + ny}M${x1 - nx} ${y1 - ny}L${x2 - nx} ${y2 - ny}"/></g>`;
  }
  function snakeSvg(a, b, i) {
    const [x1, y1] = pos(a), [x2, y2] = pos(b), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, w = Math.min(9, len * 0.22) * (i % 2 ? 1 : -1);
    const d = `M${x1} ${y1}C${x1 + dx * 0.3 + nx * w} ${y1 + dy * 0.3 + ny * w} ${x1 + dx * 0.7 - nx * w} ${y1 + dy * 0.7 - ny * w} ${x2} ${y2}`;
    const ang = Math.atan2(dy * 0.3 + ny * w, dx * 0.3 + nx * w) * 180 / Math.PI;
    return `<g class="snk s${i % 3}"><path class="sb0" d="${d}"/><path class="sb1" d="${d}"/><path class="sb2" d="${d}"/>
      <g transform="translate(${x1} ${y1}) rotate(${ang})"><ellipse class="sh" rx="3.4" ry="2.6"/><circle cx="1.4" cy="-1.1" r=".6" fill="#fff"/><circle cx="1.4" cy="1.1" r=".6" fill="#fff"/><circle cx="1.6" cy="-1.1" r=".3" fill="#000"/><circle cx="1.6" cy="1.1" r=".3" fill="#000"/><path d="M3.3 0l1.6 0M4.9 0l.8-.6M4.9 0l.8.6" stroke="#e33" stroke-width=".35"/></g></g>`;
  }

  V.css(`
  .lad-wrap{width:min(var(--bw),600px);display:flex;flex-direction:column;gap:8px;align-items:center}
  .ladb{width:100%;aspect-ratio:1;position:relative;border-radius:14px;padding:7px;user-select:none}
  .ladb .grid{position:absolute;inset:7px;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);border-radius:6px;overflow:hidden;box-shadow:0 0 0 2px #5d3a1c}
  .ladb .c{position:relative;background:#f2e3c4;box-shadow:inset 0 0 0 .5px rgba(93,58,28,.35)}
  .ladb .c.d{background:#e2c896}
  .ladb .c b{position:absolute;left:5%;top:3%;font:800 italic clamp(8px,2.2cqw,13px)/1 var(--f-d);color:rgba(93,58,28,.7)}
  .ladb .c.goal{background:radial-gradient(circle,#ffe58a,#f2b632)} .ladb .c.goal b{color:#5d3a1c}
  .ladb .c.goal::after{content:'★';position:absolute;inset:0;display:grid;place-items:center;font-size:clamp(14px,4cqw,26px);color:#fff;text-shadow:0 1px 2px rgba(93,58,28,.6)}
  .ladb{container-type:inline-size}
  .ladb svg.over{position:absolute;inset:7px;width:calc(100% - 14px);height:calc(100% - 14px);pointer-events:none;overflow:visible}
  .ladb .rail{stroke:#7a4a1f;stroke-width:1.1;stroke-linecap:round;fill:none;filter:drop-shadow(.3px .5px 0 rgba(0,0,0,.35))}
  .ladb .lr path{stroke:#b9803f;stroke-width:.8;stroke-linecap:round}
  .ladb .snk path{fill:none;stroke-linecap:round}
  .ladb .sb0{stroke:rgba(0,0,0,.25);stroke-width:3.6;transform:translate(.4px,.7px)}
  .ladb .sb1{stroke:#2a7d3a;stroke-width:3}
  .ladb .sb2{stroke:#7fd36b;stroke-width:1.1;stroke-dasharray:1.6 1.8}
  .ladb .snk.s1 .sb1{stroke:#7a3fa8} .ladb .snk.s1 .sb2{stroke:#d29bff} .ladb .snk.s1 .sh{fill:#7a3fa8}
  .ladb .snk.s2 .sb1{stroke:#c0531c} .ladb .snk.s2 .sb2{stroke:#ffc06b} .ladb .snk.s2 .sh{fill:#c0531c}
  .ladb .sh{fill:#2a7d3a}
  .ladb .tok{position:absolute;width:8.6%;transform:translate(-50%,-78%);transition:left .17s var(--ease),top .17s var(--ease);z-index:3;pointer-events:none}
  .ladb .tok.slide{transition:left .7s cubic-bezier(.45,0,.3,1),top .7s cubic-bezier(.45,0,.3,1)}
  .ladb .tok.hop .pawn{transform:translateY(-30%)}
  .ladb .tok .pawn{transition:transform .12s}
  .lad-bar{display:flex;align-items:center;gap:14px;justify-content:center;width:100%;padding:8px 12px;border-radius:12px;background:var(--panel);border:1px solid var(--line)}
  .lad-bar .die3w{--ds:46px}
  .lad-start{display:flex;gap:6px;align-items:flex-end;min-height:40px}
  .lad-start .pawn{width:24px}
  .lad-start small{font:700 italic 11px/1 var(--f-d);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-right:4px;align-self:center}`);

  V.register({
    id: 'ladder', name: 'Leiterspiel', cat: 'Brettspiele', order: 2, accent: '#7fd36b', party: true, noFirst: true,
    short: 'Leitern hoch, Schlangen runter. Bis zu 4.',
    desc: 'Würfeln und los: Wer auf einer Leiter landet, klettert hoch, wer auf einen Schlangenkopf kommt, rutscht runter. Wer zuerst genau auf 100 landet, gewinnt. Reines Glück, für 2 bis 4 Spieler am Gerät oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Hier entscheidet nur der Würfel.', 'Hier entscheidet nur der Würfel.', 'Hier entscheidet nur der Würfel.', 'Hier entscheidet nur der Würfel.'],
    keys: [['Leertaste', 'Würfeln']],
    options: [{ id: 'n', label: 'Spieler', def: 4, choices: [[2, '2'], [3, '3'], [4, '4']] }],
    localHint: 'Ihr würfelt reihum am selben Gerät, jeder mit seiner Farbe.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="7" fill="#e2c896" stroke="#5d3a1c" stroke-width="2.5"/><path d="M14 40L22 9M20 41L28 10" stroke="#7a4a1f" stroke-width="2.4" stroke-linecap="round"/><path d="M15.6 34h6M17.2 28h6M18.8 22h6M20.4 16h6" stroke="#b9803f" stroke-width="2"/><path d="M36 8c-8 4 6 10-2 15s4 10-6 17" stroke="#2a7d3a" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="36" cy="8" r="3.4" fill="#2a7d3a"/><circle cx="37" cy="7" r=".9" fill="#fff"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Würfelt reihum und zieht eure Figur so viele Felder weiter, von <b>1 unten links</b> in Schlangenlinien bis <b>100 oben links</b>. Wer zuerst genau auf 100 landet, gewinnt.' },
      { t: 'Leitern', d: 'Endet dein Zug am <b>Fuß einer Leiter</b>, kletterst du sofort bis an ihr oberes Ende.' },
      { t: 'Schlangen', d: 'Endet dein Zug auf einem <b>Schlangenkopf</b>, rutschst du bis zu ihrem Schwanz hinunter.' },
      { t: 'Genau 100', d: 'Würfelst du kurz vor dem Ziel zu viel, läufst du bis 100 und die restlichen Augen wieder <b>zurück</b>. Hier entscheidet nur das Glück, perfekt für eine schnelle Runde.' },
      { t: 'Online', d: 'Unter <b>Online</b> eröffnest du einen Tisch für bis zu vier, lädst Freunde ein oder teilst den Tischcode. Freie Plätze würfelt die KI.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, at = {};
      P.forEach(p => { at[p] = 0; });
      let turn = 1, phase = 'roll', over = false, die = 0;
      const wrap = V.el('div', 'lad-wrap'), board = V.el('div', 'ladb wood'), grid = V.el('div', 'grid');
      for (let r = 9; r >= 0; r--) for (let c = 0; c < 10; c++) {
        const n = r * 10 + (r % 2 ? 9 - c : c) + 1;
        grid.appendChild(V.el('div', 'c' + ((r + c) % 2 ? ' d' : '') + (n === 100 ? ' goal' : ''), `<b>${n}</b>`));
      }
      const over$ = `<svg class="over" viewBox="0 0 100 100">${LADDERS.map(([a, b]) => ladderSvg(a, b)).join('')}${SNAKES.map(([a, b], i) => snakeSvg(a, b, i)).join('')}</svg>`;
      board.appendChild(grid); board.insertAdjacentHTML('beforeend', over$);
      const bar = V.el('div', 'lad-bar'), dice = V.die(), start = V.el('div', 'lad-start');
      bar.append(start, dice.el);
      wrap.append(board, bar); ctx.stage.appendChild(wrap);
      const tok = {};
      P.forEach(p => { tok[p] = V.el('div', 'tok', V.pawn(CLR[p])); tok[p].dataset.p = p; board.appendChild(tok[p]); });
      function place(p, slide) {
        const t = tok[p];
        if (!at[p]) { t.style.display = 'none'; return drawStart(); }
        t.style.display = '';
        const [x, y] = pos(at[p]);
        // several pawns on one field stand side by side
        const same = P.filter(q => at[q] === at[p]), k = same.indexOf(p), off = same.length > 1 ? (k - (same.length - 1) / 2) * 2.4 : 0;
        t.classList.toggle('slide', !!slide);
        t.style.left = `calc(7px + (100% - 14px) * ${(x + off) / 100})`;
        t.style.top = `calc(7px + (100% - 14px) * ${(y + 2) / 100})`;
        t.style.zIndex = 3 + Math.round(y);
        drawStart();
      }
      function drawStart() {
        const waiting = P.filter(p => !at[p]);
        start.innerHTML = waiting.length ? '<small>Start</small>' + waiting.map(p => V.pawn(CLR[p])).join('') : '';
      }
      P.forEach(p => place(p));
      const human = () => !over && !ctx.isAI(turn);
      function begin(p) {
        turn = p; phase = 'roll';
        dice.color(CLR[p]);
        ctx.turn(p);
        ask();
      }
      function ask() {
        if (over) return;
        if (!ctx.isAI(turn)) { dice.state('wait'); return; }
        dice.state('off');
        ctx.aiTurn({
          side: turn, quick: true,
          think: () => ({ move: 'r' }),
          targets: () => [dice.el],
          apply: act,
          decode: raw => (raw === 'r' && phase === 'roll' ? 'r' : null)
        });
      }
      function act(a) {
        if (over || a !== 'r' || phase !== 'roll') return;
        ctx.moved(turn, 'r');
        phase = 'anim'; dice.state('off');
        die = 1 + Math.floor(ctx.rng() * 6);
        dice.show(die, true); V.sfx.tick();
        const p = turn;
        ctx.later(() => walk(p, die), V.fxOn() && !ctx.fast() ? 650 : 60);
      }
      function walk(p, d) {
        V.sfx.move();
        // count up to 100, then the rest back
        const path = [];
        let cur = at[p], dir = 1;
        for (let i = 0; i < d; i++) { if (cur === 100) dir = -1; cur += dir; path.push(cur); }
        const hop = V.fxOn() && !ctx.fast() ? 170 : 30;
        path.forEach((n, i) => ctx.later(() => {
          at[p] = n; place(p);
          tok[p].classList.add('hop'); ctx.later(() => tok[p].classList.remove('hop'), 90);
          V.sfx.tick();
        }, i * hop));
        ctx.later(() => {
          const end = at[p];
          ctx.status(`${ctx.who(p)} würfelt ${d}${dir < 0 ? ' und prallt zurück' : ''}`);
          if (JUMP[end]) {
            const up = JUMP[end] > end;
            ctx.later(() => {
              at[p] = JUMP[end]; place(p, true);
              if (up) { V.sfx.goal(); V.fx.floatAt(tok[p], 'Leiter!', CLR[p]); ctx.status(`${ctx.who(p)} klettert von ${end} auf ${JUMP[end]}`); }
              else { V.sfx.lose(); V.fx.shake(board, true); V.fx.floatAt(tok[p], 'Schlange!', '#ff5d73'); ctx.status(`${ctx.who(p)} rutscht von ${end} auf ${JUMP[end]}`); }
              ctx.later(() => finish(p), ctx.fast() ? 60 : 780);
            }, 160);
          } else { V.sfx.place(); finish(p); }
        }, path.length * hop + 60);
      }
      function finish(p) {
        if (at[p] === 100) { over = true; V.fx.burstAt(tok[p], CLR[p], 24, 100); return ctx.end(p, `${ctx.name(p)} ist zuerst auf 100`); }
        ctx.later(() => begin(P[(P.indexOf(p) + 1) % N]), ctx.fast() ? 30 : 420);
      }
      bar.addEventListener('click', e => { if (e.target.closest('.die3w') && human() && phase === 'roll') act('r'); });
      ctx.keys(e => {
        if (!human()) return false;
        if ((e.key === ' ' || e.key === 'Enter') && phase === 'roll') { if (!e.repeat) act('r'); return true; }
        return false;
      });
      begin(1);
    }
  });
})();
