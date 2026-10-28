(function () {
  // Lichtrenner: light bikes on a grid that leave a wall behind them. Last one riding wins the round.
  const W = 40, H = 52;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const SPAWN = { 1: [Math.round(W * 0.3), H - 6, 0], 2: [Math.round(W * 0.7) - 1, 5, 2], 3: [5, Math.round(H * 0.38), 1], 4: [W - 6, Math.round(H * 0.62), 3] };
  const COL = { 1: '#ff4fd8', 2: '#ffd84f', 3: '#62f0ff', 4: '#5dff9d' };
  const KEYS = { 1: ['a', 'd'], 2: ['ArrowLeft', 'ArrowRight'], 3: ['c', 'b'], 4: ['j', 'l'] };
  const turnL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h9a6 6 0 0 1 6 6v5"/></svg>';
  const turnR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9h-9a6 6 0 0 0-6 6v5"/></svg>';

  V.css(`
  .tron{display:block;border-radius:10px;border:1px solid var(--line2);background:#07080e;box-shadow:0 0 50px -20px var(--cyan);touch-action:none}
  .tron-wrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
  .tron-cd{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font:800 italic 84px/1 var(--f-d);color:var(--fg);text-shadow:0 0 30px var(--cyan)}
  .tron-cd b{animation:tcd .6s var(--spring)}
  @keyframes tcd{from{transform:scale(2);opacity:0}}`);

  V.register({
    id: 'tron', name: 'Lichtrenner', cat: 'Action', order: 4, accent: 'var(--cyan)', party: true, noFirst: true,
    short: 'Nicht in die Lichtwand fahren. Bis zu 4.',
    desc: 'Jeder steuert ein Lichtrad, das eine leuchtende Wand hinter sich herzieht. Wer gegen eine Wand fährt, ist raus. Wer als Letzter fährt, holt den Punkt. Für 2 bis 4 an einem Gerät oder gegen die KI.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Fährt oft ohne zu schauen.', 'Weicht Wänden aus, plant aber nicht.', 'Sucht sich immer den größten freien Raum.', 'Plant Raum und schneidet dir den Weg ab.'],
    keys: [['A D', 'Spieler 1 links / rechts'], ['← →', 'Spieler 2'], ['C B', 'Spieler 3'], ['J L', 'Spieler 4']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'to', label: 'Punkte zum Sieg', def: 3, choices: [[3, '3'], [5, '5']] }],
    localHint: 'Alle spielen gleichzeitig am selben Gerät. Jeder hat zwei Knöpfe in seiner Ecke, am PC eigene Tasten.',
    endDelay: 900,
    icon: `<svg viewBox="0 0 48 48" fill="none"><rect x="3" y="3" width="42" height="42" rx="6" fill="#07080e" stroke="#373d66" stroke-width="2"/><path d="M10 40V24h12V12h14" stroke="#ff4fd8" stroke-width="3.5" stroke-linejoin="round"/><path d="M38 8v14H28v12h-8" stroke="#62f0ff" stroke-width="3.5" stroke-linejoin="round"/><circle cx="36" cy="12" r="3" fill="#fff"/><circle cx="20" cy="34" r="3" fill="#fff"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Euer Lichtrad fährt <b>von selbst geradeaus</b> und zieht eine Wand hinter sich her. Fahr nicht gegen den Rand, deine eigene Wand oder die der anderen. Wer als <b>Letzter</b> noch fährt, bekommt den Punkt.' },
      { t: 'Lenken', d: 'Jeder hat <b>zwei Knöpfe</b>: links abbiegen und rechts abbiegen, immer aus Sicht deines Rads. Am PC: Spieler 1 <b>A</b> und <b>D</b>, Spieler 2 <b>←</b> und <b>→</b>, Spieler 3 <b>C</b> und <b>B</b>, Spieler 4 <b>J</b> und <b>L</b>.' },
      { t: 'Zu dritt oder viert', d: 'Legt das Handy flach in die Mitte. Spieler 1 und 3 sitzen unten, 2 und 4 oben, ihre Knöpfe stehen für sie richtig herum. Gegen die KI fährst du gegen 1 bis 3 Computer-Räder.' },
      { t: 'Taktik', d: 'Mit der Zeit wird es schneller. Versuch, den anderen den Raum abzuschneiden, statt nur auszuweichen. Fahren zwei frontal ineinander, sind beide raus.' }
    ],
    start(ctx) {
      const P = ctx.players, target = [3, 5].includes(+ctx.opts.to) ? +ctx.opts.to : 3;
      const pts = {}; P.forEach(p => { pts[p] = 0; });
      const wrap = V.el('div', 'tron-wrap'), cv = V.el('canvas', 'tron'), cd = V.el('div', 'tron-cd');
      const g = cv.getContext('2d');
      const human = s => !ctx.isAI(s);
      const queue = {};
      const pads = V.pads(ctx, {
        players: P, human, buttons: [['links', turnL], ['rechts', turnR]],
        down(s, id) { steer(s, id === 'links' ? -1 : 1); }
      });
      const mid = V.el('div'); mid.style.position = 'relative'; mid.append(cv, cd);
      if (pads.top) wrap.appendChild(pads.top);
      wrap.appendChild(mid);
      if (pads.bottom) wrap.appendChild(pads.bottom);
      ctx.stage.appendChild(wrap);
      let cell = 10, dpr = 1;
      function size() {
        const padH = [pads.top, pads.bottom].reduce((a, p) => a + (p && p.offsetHeight ? p.offsetHeight + 8 : 0), 0);
        const availH = Math.max(260, window.innerHeight - wrap.getBoundingClientRect().top - padH - 16);
        const availW = wrap.clientWidth;
        cell = Math.max(5, Math.floor(Math.min(availW / W, availH / H, 16)));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * cell * dpr; cv.height = H * cell * dpr;
        cv.style.width = W * cell + 'px'; cv.style.height = H * cell + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
      }
      let grid, bikes, timer = null, phase = 'idle', paused = false, stepMs = 110, t0 = 0;
      function steer(s, d) {
        if (!bikes || !bikes[s] || !bikes[s].alive || phase === 'over') return;
        const q = queue[s] || (queue[s] = []);
        if (q.length < 2) q.push(d);
      }
      const keyDown = e => {
        if (e.repeat) return;
        for (const s of P) {
          if (!human(s)) continue;
          const k = KEYS[ctx.mode === 'ai' ? 1 : s];
          const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
          if (key === k[0] || (ctx.mode === 'ai' && key === 'ArrowLeft')) { steer(s, -1); e.preventDefault(); return; }
          if (key === k[1] || (ctx.mode === 'ai' && key === 'ArrowRight')) { steer(s, 1); e.preventDefault(); return; }
        }
      };
      window.addEventListener('keydown', keyDown);
      ctx.onCleanup(() => window.removeEventListener('keydown', keyDown));
      ctx.keys(e => /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|[adcbjlADCBJL])$/.test(e.key));
      window.addEventListener('resize', size);
      ctx.onCleanup(() => window.removeEventListener('resize', size));
      ctx.onCleanup(() => clearTimeout(timer));

      function redraw() {
        g.fillStyle = '#07080e'; g.fillRect(0, 0, W * cell, H * cell);
        g.strokeStyle = 'rgba(98,240,255,.06)'; g.lineWidth = 1;
        g.beginPath();
        for (let x = 0; x <= W; x += 4) { g.moveTo(x * cell + 0.5, 0); g.lineTo(x * cell + 0.5, H * cell); }
        for (let y = 0; y <= H; y += 4) { g.moveTo(0, y * cell + 0.5); g.lineTo(W * cell, y * cell + 0.5); }
        g.stroke();
        if (!grid) return;
        for (let i = 0; i < W * H; i++) if (grid[i]) paint(i % W, Math.floor(i / W), grid[i], false);
        if (bikes) P.forEach(s => { const b = bikes[s]; if (b.alive) paint(b.x, b.y, s, true); });
      }
      function paint(x, y, s, head) {
        const c = COL[s], d = bikes && bikes[s] && !bikes[s].alive;
        g.fillStyle = d ? c + '55' : c;
        g.fillRect(x * cell, y * cell, cell, cell);
        if (head) { g.fillStyle = '#fff'; const m = Math.max(1, cell * 0.22); g.fillRect(x * cell + m, y * cell + m, cell - 2 * m, cell - 2 * m); }
      }
      const free = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !grid[y * W + x];
      // size of the free area reachable from (x, y), capped
      function room(x, y, cap) {
        if (!free(x, y)) return 0;
        const seen = new Uint8Array(W * H), st = [y * W + x]; seen[y * W + x] = 1; let n = 0;
        while (st.length && n < cap) {
          const i = st.pop(); n++;
          const cx = i % W, cy = (i - cx) / W;
          for (let d = 0; d < 4; d++) { const nx = cx + DX[d], ny = cy + DY[d], j = ny * W + nx; if (free(nx, ny) && !seen[j]) { seen[j] = 1; st.push(j); } }
        }
        return n;
      }
      function bot(s) {
        const b = bikes[s], L = ctx.level;
        const opts = [b.d, (b.d + 3) % 4, (b.d + 1) % 4];
        if (L === 0 && Math.random() < 0.8 && free(b.x + DX[b.d], b.y + DY[b.d])) return;
        if (L === 0 && Math.random() < 0.3) return;
        let best = b.d, bv = -1e9;
        for (const d of opts) {
          const nx = b.x + DX[d], ny = b.y + DY[d];
          if (!free(nx, ny)) continue;
          let v = L === 1 ? 10 + Math.random() * 4 : room(nx, ny, L === 3 ? 600 : 300);
          if (d === b.d) v += L === 1 ? 3 : 2;
          if (L >= 2) for (const o of P) if (o !== s && bikes[o].alive) {
            const ob = bikes[o], dist = Math.abs(ob.x + DX[ob.d] - nx) + Math.abs(ob.y + DY[ob.d] - ny);
            if (dist === 0) v -= 400;
            if (L === 3) v -= dist * 0.15;
          }
          if (L === 1 && Math.random() < 0.06) v += 6;
          if (v > bv) { bv = v; best = d; }
        }
        b.d = best;
      }
      function round() {
        grid = new Uint8Array(W * H); bikes = {};
        P.forEach(s => { const [x, y, d] = SPAWN[s]; bikes[s] = { x, y, d, alive: true }; grid[y * W + x] = s; queue[s] = []; pads.dead(s, false); });
        stepMs = 112; phase = 'count'; redraw();
        let n = 3;
        const count = () => {
          if (paused) return;
          if (n === 0) { cd.innerHTML = ''; phase = 'run'; t0 = performance.now(); V.sfx.go(); return tick(); }
          cd.innerHTML = `<b>${n}</b>`; V.sfx.tick(); n--;
          timer = ctx.later(count, 520);
        };
        resumeFn = count;
        showScore();
        count();
      }
      let resumeFn = null;
      function showScore() { ctx.status(P.map(s => `<span class="c${s}">${ctx.name(s).replace("Spieler ", "P")} ${pts[s]}</span>`).join(' · ') + ` <small>· Ziel ${target}</small>`); }
      function tick() {
        if (paused || phase !== 'run') return;
        P.forEach(s => {
          const b = bikes[s]; if (!b.alive) return;
          if (ctx.isAI(s)) bot(s);
          else { const q = queue[s]; if (q && q.length) b.d = (b.d + (q.shift() === -1 ? 3 : 1)) % 4; }
        });
        const next = {};
        P.forEach(s => { const b = bikes[s]; if (b.alive) next[s] = [b.x + DX[b.d], b.y + DY[b.d]]; });
        const crash = new Set();
        Object.keys(next).forEach(s => { const [x, y] = next[s]; if (!free(x, y)) crash.add(+s); });
        const keys = Object.keys(next);
        for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
          const a = next[keys[i]], c = next[keys[j]];
          if (a[0] === c[0] && a[1] === c[1]) { crash.add(+keys[i]); crash.add(+keys[j]); }
        }
        // old heads become trail
        P.forEach(s => { const b = bikes[s]; if (b.alive) paint(b.x, b.y, s, false); });
        Object.keys(next).forEach(k => {
          const s = +k, b = bikes[s];
          if (crash.has(s)) { b.alive = false; return; }
          [b.x, b.y] = next[k]; grid[b.y * W + b.x] = s; paint(b.x, b.y, s, true);
        });
        if (crash.size) {
          redraw();
          const r = cv.getBoundingClientRect();
          crash.forEach(s => { const b = bikes[s]; V.fx.burst(r.left + (b.x + 0.5) * cell, r.top + (b.y + 0.5) * cell, COL[s], 18, 70); pads.dead(s, true); });
          V.sfx.hit(); V.fx.shake(cv, true);
        }
        const alive = P.filter(s => bikes[s].alive);
        if (alive.length <= 1) return roundOver(alive[0] || 0);
        const el = (performance.now() - t0) / 1000;
        stepMs = Math.max(58, 112 - el * 2.2);
        timer = ctx.later(tick, stepMs);
      }
      function roundOver(w) {
        phase = 'over';
        if (w) { pts[w]++; V.sfx.goal(); cd.innerHTML = `<b style="color:${COL[w]};font-size:44px">${ctx.name(w)} +1</b>`; }
        else { V.sfx.bad(); cd.innerHTML = '<b style="font-size:44px">Alle raus!</b>'; }
        showScore();
        if (w && pts[w] >= target) { ctx.later(() => { cd.innerHTML = ''; }, 900); return ctx.end(w, P.map(s => pts[s]).join(' : ') + ' Punkte'); }
        timer = ctx.later(() => { cd.innerHTML = ''; round(); }, 1400);
      }
      ctx.turn(0, 'Gleich geht es los');
      requestAnimationFrame(() => { size(); round(); });
      return {
        pause() { paused = true; clearTimeout(timer); },
        resume() { paused = false; if (phase === 'run') tick(); else if (phase === 'count') resumeFn(); }
      };
    }
  });
})();
