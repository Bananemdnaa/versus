(function () {
  // Kalaha: pits 0-5 belong to side 1 (bottom, left to right) with its store 6 on the right,
  // pits 7-12 to side 2 (top, right to left) with its store 13 on the left. Seeds are sown counter-clockwise.
  const STORE = { 1: 6, 2: 13 };
  const own = (t, i) => t === 1 ? i >= 0 && i <= 5 : i >= 7 && i <= 12;
  const pitsOf = t => t === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
  // sow from pit i; returns the new state and the drop path (for the animation)
  function sow(s, i) {
    const b = s.b.slice(), t = s.turn, skip = STORE[3 - t];
    let n = b[i], k = i; b[i] = 0;
    const path = [];
    while (n > 0) { k = (k + 1) % 14; if (k === skip) continue; b[k]++; n--; path.push(k); }
    let cap = null;
    if (own(t, k) && b[k] === 1 && b[12 - k] > 0) { cap = { at: k, from: 12 - k, n: b[12 - k] + 1 }; b[STORE[t]] += b[12 - k] + 1; b[k] = 0; b[12 - k] = 0; }
    const again = k === STORE[t];
    let next = again ? t : 3 - t, done = false;
    const e1 = pitsOf(1).every(p => !b[p]), e2 = pitsOf(2).every(p => !b[p]);
    if (e1 || e2) {
      done = true;
      for (const tt of [1, 2]) for (const p of pitsOf(tt)) { b[STORE[tt]] += b[p]; b[p] = 0; }
    }
    return { s: { b, turn: next, done }, path, cap, again, last: k };
  }
  const moves = s => pitsOf(s.turn).filter(p => s.b[p] > 0);
  // negamax that keeps the sign when a move earns an extra turn
  function search(s, depth, timeMs) {
    const deadline = performance.now() + timeMs; let nodes = 0, stop = false;
    const val = (st, me) => (st.b[STORE[me]] - st.b[STORE[3 - me]]) + (st.done ? 0 : 0.25 * (pitsOf(me).reduce((a, p) => a + st.b[p], 0) - pitsOf(3 - me).reduce((a, p) => a + st.b[p], 0)));
    function nm(st, d, a, b) {
      if (st.done) { const v = st.b[STORE[st.turn]] - st.b[STORE[3 - st.turn]]; return v > 0 ? 1000 + v : v < 0 ? -1000 + v : 0; }
      if (d <= 0) return val(st, st.turn);
      if ((++nodes & 1023) === 0 && performance.now() > deadline) stop = true;
      if (stop) return val(st, st.turn);
      let best = -1e9;
      const ms = moves(st).sort((x, y) => ((y + st.b[y]) % 14 === STORE[st.turn]) - ((x + st.b[x]) % 14 === STORE[st.turn]));
      for (const m of ms) {
        const r = sow(st, m).s;
        const v = r.turn === st.turn && !r.done ? nm(r, d - 1, a, b) : -nm(r, d - 1, -b, -a);
        if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
      }
      return best;
    }
    const scored = moves(s).map(m => {
      const r = sow(s, m).s;
      return { m, v: r.turn === s.turn && !r.done ? nm(r, depth - 1, -1e9, 1e9) : -nm(r, depth - 1, -1e9, 1e9) };
    });
    return scored;
  }

  V.css(`
  .klh{width:min(var(--bw),640px);display:grid;grid-template-columns:1.1fr repeat(6,1fr) 1.1fr;grid-template-rows:1fr 1fr;gap:7px;padding:10px;background:linear-gradient(160deg,#3a2615,#24170c);border:1px solid #6b4423;border-radius:999px/40%;box-shadow:0 0 50px -18px #ff9f43;user-select:none}
  .klh .pit,.klh .store{position:relative;border-radius:50%;background:radial-gradient(circle at 50% 40%,#170e06,#2b1a0b 70%);box-shadow:inset 0 4px 10px rgba(0,0,0,.75);display:grid;place-items:center}
  .klh .pit{aspect-ratio:1}
  .klh .store{grid-row:1/3;border-radius:999px}
  .klh .s2{grid-column:1} .klh .s1{grid-column:8}
  .klh .pit.mine{cursor:pointer}
  .klh .pit.mine:hover,.klh .pit.mine.kf{box-shadow:inset 0 4px 10px rgba(0,0,0,.75),0 0 0 2px var(--sc)}
  .klh .pit.p1{--sc:var(--p1)} .klh .pit.p2{--sc:var(--p2)} .klh .s1{--sc:var(--p1)} .klh .s2{--sc:var(--p2)}
  .klh .seeds{position:absolute;inset:14%;pointer-events:none}
  .klh .seeds i{position:absolute;width:24%;height:24%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--sd) 60%);box-shadow:0 1px 2px rgba(0,0,0,.6);transform:translate(-50%,-50%)}
  .klh .store .seeds{inset:10% 18%}
  .klh .store .seeds i{width:28%;height:auto;aspect-ratio:1}
  .klh .n{position:absolute;bottom:-3px;right:-3px;min-width:22px;padding:2px 5px;border-radius:9px;background:var(--panel2);border:1px solid var(--line2);font:800 italic 13px/1 var(--f-d);text-align:center;color:var(--fg);z-index:1}
  .klh .store .n{left:50%;right:auto;bottom:6px;transform:translateX(-50%);font-size:18px;color:var(--sc);border-color:var(--sc)}
  .klh .hit{animation:klhit .25s var(--spring)}
  @keyframes klhit{40%{transform:scale(1.12)}}
  .klh .src{box-shadow:inset 0 4px 10px rgba(0,0,0,.75),0 0 0 3px var(--sc)}
  .klh.lock .pit{cursor:default}
  .klh-lab{display:flex;justify-content:space-between;width:min(var(--bw),640px);font:700 italic 12px/1 var(--f-d);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:0 14px}`);
  const COLORS = ['#ff6fa8', '#62f0ff', '#ffd84f', '#5dff9d', '#c39bff', '#ff9f43'];

  V.register({
    id: 'kalaha', name: 'Kalaha', cat: 'Strategie', order: 5, accent: '#ff9f43',
    short: 'Steine säen, Gegner leer räumen.',
    desc: 'Nimm alle Steine aus einer Mulde und verteile sie einzeln weiter. Wer am Ende mehr Steine in seinem Speicher hat, gewinnt.',
    levelInfo: ['Anfänger: zieht fast zufällig.', 'Nimmt Extrazüge mit, übersieht aber Fänge.', 'Rechnet sechs Züge voraus.', 'Rechnet so tief wie möglich. Fast unschlagbar.'],
    keys: [['1–6', 'Mulde von links nach rechts'], ['Pfeile', 'Cursor bewegen'], ['Enter', 'Mulde spielen']],
    options: [{ id: 'seeds', label: 'Steine pro Mulde', def: 4, choices: [[3, '3'], [4, '4'], [6, '6']] }],
    icon: `<svg viewBox="0 0 48 48"><rect x="2" y="12" width="44" height="24" rx="12" fill="#3a2615" stroke="#6b4423" stroke-width="2"/><ellipse cx="8" cy="24" rx="4" ry="8" fill="#1a1007"/><ellipse cx="40" cy="24" rx="4" ry="8" fill="#1a1007"/>${[0, 1, 2, 3].map(k => `<circle cx="${16 + k * 5.4}" cy="19" r="2.4" fill="#1a1007"/><circle cx="${16 + k * 5.4}" cy="29" r="2.4" fill="#1a1007"/>`).join('')}<circle cx="40" cy="22" r="1.6" fill="#ff4fd8"/><circle cx="40" cy="26.5" r="1.6" fill="#62f0ff"/><circle cx="8" cy="24" r="1.6" fill="#ffd84f"/><circle cx="21.4" cy="29" r="1.2" fill="#5dff9d"/></svg>`,
    tutorial: [
      { t: 'Das Brett', d: 'Jeder hat <b>sechs Mulden</b> auf seiner Seite und rechts davon einen großen <b>Speicher</b>. Du spielst die untere Reihe, dein Speicher ist rechts. Am Anfang liegen in jeder Mulde gleich viele Steine.' },
      { t: 'Säen', d: 'Tippe eine eigene Mulde an. Alle Steine daraus werden <b>einzeln gegen den Uhrzeigersinn</b> verteilt: je einer in die nächsten Mulden, auch in deinen Speicher und weiter auf die Seite des Gegners. Den gegnerischen Speicher überspringst du.' },
      { t: 'Extrazug', d: 'Landet der <b>letzte Stein in deinem Speicher</b>, bist du gleich nochmal dran. Mulden, die genau bis zum Speicher reichen, sind deshalb wertvoll.' },
      { t: 'Fangen', d: 'Landet der letzte Stein in einer <b>leeren eigenen Mulde</b> und gegenüber liegen Steine, wandern dieser Stein und alle gegenüber in deinen Speicher.' },
      { t: 'Ende', d: 'Sind alle Mulden einer Seite leer, ist Schluss. Jeder bekommt die Steine, die noch auf seiner Seite liegen. <b>Mehr Steine im Speicher</b> gewinnt.' }
    ],
    start(ctx) {
      const per = [3, 4, 6].includes(+ctx.opts.seeds) ? +ctx.opts.seeds : 4;
      let s = { b: [per, per, per, per, per, per, 0, per, per, per, per, per, per, 0], turn: 1, done: false }, busy = false, over = false;
      const lab = V.el('div', 'klh-lab', `<span>${ctx.name(2)}</span><span>${ctx.name(1)}</span>`);
      const board = V.el('div', 'klh'), cells = [];
      // grid positions: top row = pits 12..7 from left to right, bottom row = 0..5
      for (let i = 0; i < 14; i++) {
        const store = i === 6 || i === 13;
        const el = V.el('div', store ? 'store ' + (i === 6 ? 's1' : 's2') : 'pit p' + (i < 6 ? 1 : 2));
        if (!store) { el.style.gridColumn = i < 6 ? i + 2 : 14 - i; el.style.gridRow = i < 6 ? 2 : 1; }
        el.innerHTML = '<div class="seeds"></div><b class="n"></b>'; el.dataset.i = i;
        cells[i] = el; board.appendChild(el);
      }
      ctx.stage.append(lab, board);
      // every seed keeps a colour and a resting spot so the pits look like real piles
      const seedPos = () => ({ x: 22 + Math.random() * 56, y: 22 + Math.random() * 56, c: V.pick(COLORS) });
      const piles = s.b.map(n => Array.from({ length: n }, seedPos));
      function draw(i) {
        const el = cells[i], pile = piles[i], max = i === 6 || i === 13 ? 40 : 14;
        el.querySelector('.seeds').innerHTML = pile.slice(0, max).map(p => `<i style="left:${p.x}%;top:${p.y}%;--sd:${p.c}"></i>`).join('');
        el.querySelector('.n').textContent = pile.length;
      }
      function drawAll() { for (let i = 0; i < 14; i++) draw(i); }
      drawAll();
      const human = () => !over && !busy && !ctx.isAI(s.turn);
      function mark() {
        cells.forEach((c, i) => c.classList.toggle('mine', human() && own(s.turn, i) && s.b[i] > 0));
        board.classList.toggle('lock', !human());
      }
      board.addEventListener('click', e => { const p = e.target.closest('.pit'); if (p && human() && own(s.turn, +p.dataset.i) && s.b[+p.dataset.i]) play(+p.dataset.i); });
      ctx.nav(() => human() ? pitsOf(s.turn).filter(p => s.b[p]).map(p => cells[p]) : [], { pad: 2, round: true });
      ctx.keys(e => {
        if (!human() || !/^[1-6]$/.test(e.key)) return false;
        const k = +e.key - 1, i = s.turn === 1 ? k : 12 - k;
        if (s.b[i]) play(i);
        return true;
      });
      function play(i) {
        if (over || busy) return;
        ctx.moved(s.turn, i);
        const who = s.turn, r = sow(s, i);
        busy = true; mark();
        cells[i].classList.add('src');
        const hand = piles[i]; piles[i] = [];
        draw(i); V.sfx.move();
        const step = Math.max(55, Math.min(150, 900 / Math.max(1, r.path.length)));
        r.path.forEach((k, n) => ctx.later(() => {
          const sd = hand.pop() || seedPos(); piles[k].push(k === 6 || k === 13 ? { x: 20 + Math.random() * 60, y: 10 + Math.random() * 80, c: sd.c } : { x: 22 + Math.random() * 56, y: 22 + Math.random() * 56, c: sd.c });
          draw(k); V.fx.pop(cells[k], 'hit'); V.sfx.tick();
        }, (n + 1) * step));
        ctx.later(() => {
          cells[i].classList.remove('src');
          if (r.cap) {
            const st = STORE[who], take = [...piles[r.cap.at], ...piles[r.cap.from]];
            piles[r.cap.at] = []; piles[r.cap.from] = [];
            take.forEach(p => piles[st].push({ x: 20 + Math.random() * 60, y: 10 + Math.random() * 80, c: p.c }));
            draw(r.cap.at); draw(r.cap.from); draw(st);
            V.sfx.hit(); V.fx.burstAt(cells[r.cap.from], V.hex(who), 14, 70); V.fx.floatAt(cells[st], '+' + r.cap.n, V.hex(who));
          } else if (r.again && !r.s.done) { V.sfx.goal(); V.fx.floatAt(cells[STORE[who]], 'Nochmal!', V.hex(who)); }
          s = r.s;
          if (s.done) {
            for (const tt of [1, 2]) for (const p of pitsOf(tt)) { piles[p].forEach(x => piles[STORE[tt]].push({ x: 20 + Math.random() * 60, y: 10 + Math.random() * 80, c: x.c })); piles[p] = []; }
            drawAll();
            over = true; busy = false; mark();
            const a = s.b[6], b = s.b[13];
            return ctx.end(a > b ? 1 : b > a ? 2 : 0, `${a} : ${b} Steine`);
          }
          busy = false;
          next(r.again);
        }, (r.path.length + 1) * step + (r.cap ? 120 : 0));
      }
      function next(again) {
        ctx.turn(s.turn, again ? (ctx.isAI(s.turn) ? false : `${ctx.who(s.turn)}: Extrazug!`) : undefined);
        mark();
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          quick: again,
          think: () => {
            const L = ctx.level, ms = moves(s);
            if (L === 0) {
              const r = Math.random() < 0.5 ? V.pick(ms) : V.pickSoft(search(s, 1, 200), 3).move;
              return { move: r };
            }
            const sc = search(s, [2, 6, 13][L - 1], [500, 900, 2200][L - 1]);
            const r = L === 1 ? V.pickSoft(sc, 1.5) : V.pickSoft(sc, 0);
            return { move: r.move, mood: Math.tanh(r.score / 8) };
          },
          targets: i => [cells[i]],
          decoys: () => moves(s).map(i => cells[i]),
          apply: play,
          decode: i => (Number.isInteger(i) && own(s.turn, i) && s.b[i] > 0 ? i : null),
          say: i => 'Mulde ' + (s.turn === 1 ? i + 1 : 13 - i)
        });
      }
      next();
    }
  });
})();
