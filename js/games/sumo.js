(function () {
  // Sumo-Arena: every disc has an arrow that keeps turning. Holding your button freezes the arrow and pushes
  // the disc that way. Knock the others out of the ring; the ring shrinks after a while.
  const COL = { 1: '#ff4fd8', 2: '#ffd84f', 3: '#62f0ff', 4: '#5dff9d' };
  const KEYS = { 1: 'a', 2: 'ArrowLeft', 3: 'c', 4: 'j' };
  const SPAWN = { 1: Math.PI / 2, 2: -Math.PI / 2, 3: Math.PI, 4: 0 };
  const R0 = 1, DR = 0.105, SPIN = 3.1, PUSH = 2.6, DRAG = 1.25, VMAX = 1.5;

  V.css(`
  .sumo{display:block;touch-action:none}
  .sumo-wrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
  .sumo-cd{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font:800 italic 84px/1 var(--f-d);color:var(--fg);text-shadow:0 0 30px var(--pink)}
  .sumo-cd b{animation:scd .6s var(--spring)}
  @keyframes scd{from{transform:scale(2);opacity:0}}
  .pad .push{font:800 italic 18px/1 var(--f-d);letter-spacing:.12em;text-transform:uppercase}`);

  V.register({
    id: 'sumo', name: 'Sumo-Arena', cat: 'Action', order: 5, accent: 'var(--warn)', party: true, noFirst: true,
    short: 'Ein Knopf, alle raus aus dem Ring. Bis zu 4.',
    desc: 'Dein Pfeil dreht sich ständig. Halte deinen Knopf, um in Pfeilrichtung loszustürmen, und schubs die anderen aus dem Ring. Für 2 bis 4 an einem Gerät oder gegen die KI.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Reagiert langsam und zielt grob.', 'Zielt ordentlich, achtet aber kaum auf den Rand.', 'Zielt genau und bremst vor dem Rand.', 'Wartet auf den perfekten Moment.'],
    keys: [['A', 'Spieler 1 Schub'], ['←', 'Spieler 2'], ['C', 'Spieler 3'], ['J', 'Spieler 4'], ['Leertaste', 'Schub gegen die KI']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'to', label: 'Punkte zum Sieg', def: 3, choices: [[3, '3'], [5, '5']] }],
    localHint: 'Alle spielen gleichzeitig am selben Gerät. Jeder hat einen Knopf in seiner Ecke, am PC eine eigene Taste.',
    endDelay: 900,
    icon: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#1a1426" stroke="#ff9f43" stroke-width="2.5"/><circle cx="18" cy="27" r="6" fill="#ff4fd8"/><circle cx="31" cy="19" r="6" fill="#ffd84f"/><path d="M18 27l7-6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M36 13l4-4M38 17l5-1" stroke="#ffd84f" stroke-width="2" stroke-linecap="round"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder steuert eine Scheibe im Ring. Wer über den Rand rutscht, ist raus. Wer als <b>Letzter</b> im Ring steht, bekommt den Punkt.' },
      { t: 'Ein Knopf', d: 'Der <b>Pfeil</b> an deiner Scheibe dreht sich ständig. <b>Halte</b> deinen Knopf: Der Pfeil bleibt stehen und du schiebst in diese Richtung. <b>Loslassen</b>, und er dreht weiter. Am PC: Spieler 1 <b>A</b>, Spieler 2 <b>←</b>, Spieler 3 <b>C</b>, Spieler 4 <b>J</b>.' },
      { t: 'Schubsen', d: 'Prallt ihr zusammen, fliegt der Langsamere weiter. Volle Fahrt voraus lohnt sich also. Aber Vorsicht: Wer verfehlt, rutscht selbst über den Rand.' },
      { t: 'Der Ring schrumpft', d: 'Nach ein paar Sekunden wird der Ring <b>kleiner</b>, damit niemand ewig am Rand wartet.' }
    ],
    start(ctx) {
      const P = ctx.players, target = [3, 5].includes(+ctx.opts.to) ? +ctx.opts.to : 3;
      const pts = {}; P.forEach(p => { pts[p] = 0; });
      const wrap = V.el('div', 'sumo-wrap'), cv = V.el('canvas', 'sumo'), cd = V.el('div', 'sumo-cd');
      const g = cv.getContext('2d');
      const human = s => !ctx.isAI(s);
      const hold = {};
      const pads = V.pads(ctx, {
        players: P, human, buttons: [['Schub', '<span class="push">Schub</span>']],
        down(s) { hold[s] = true; }, up(s) { hold[s] = false; }
      });
      const mid = V.el('div'); mid.style.position = 'relative'; mid.append(cv, cd);
      if (pads.top) wrap.appendChild(pads.top);
      wrap.appendChild(mid);
      if (pads.bottom) wrap.appendChild(pads.bottom);
      ctx.stage.appendChild(wrap);
      let px = 300, dpr = 1;
      function size() {
        const padH = [pads.top, pads.bottom].reduce((a, p) => a + (p && p.offsetHeight ? p.offsetHeight + 8 : 0), 0);
        const availH = Math.max(260, window.innerHeight - wrap.getBoundingClientRect().top - padH - 16);
        px = Math.floor(Math.min(wrap.clientWidth, availH, 620));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = px * dpr; cv.height = px * dpr; cv.style.width = cv.style.height = px + 'px';
      }
      const keyOf = e => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
      const key = (e, on) => {
        if (e.repeat) return;
        const k = keyOf(e);
        for (const s of P) if (human(s) && (k === KEYS[s] || (ctx.mode === 'ai' && (k === ' ' || k === 'a')))) { hold[s] = on; e.preventDefault(); return; }
      };
      const kd = e => key(e, true), ku = e => key(e, false);
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
      window.addEventListener('resize', size);
      ctx.onCleanup(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', size); });
      ctx.keys(e => /^(ArrowLeft| |[acjACJ])$/.test(e.key));

      let disc = {}, ring = R0, phase = 'idle', paused = false, raf = 0, last = 0, tRound = 0, brain = {};
      ctx.onCleanup(() => cancelAnimationFrame(raf));
      function round() {
        disc = {}; ring = R0; tRound = 0;
        P.forEach((s, k) => {
          const a = SPAWN[s];
          disc[s] = { x: Math.cos(a) * 0.58, y: Math.sin(a) * 0.58, vx: 0, vy: 0, a: a + Math.PI + (k % 2 ? 0.9 : -0.9), dir: k % 2 ? -1 : 1, alive: true, fall: 0 };
          hold[s] = false; brain[s] = { wait: 0, on: false }; pads.dead(s, false);
        });
        phase = 'count'; showScore();
        let n = 3;
        const count = () => {
          if (paused) return;
          if (n === 0) { cd.innerHTML = ''; phase = 'run'; V.sfx.go(); return; }
          cd.innerHTML = `<b>${n}</b>`; V.sfx.tick(); n--;
          cdT = ctx.later(count, 520);
        };
        resumeCount = count; count();
      }
      let resumeCount = null, cdT = 0;
      function showScore() { ctx.status(P.map(s => `<span class="c${s}">${ctx.name(s).replace("Spieler ", "P")} ${pts[s]}</span>`).join(' · ') + ` <small>· Ziel ${target}</small>`); }
      function bot(s, dt) {
        const d = disc[s], b = brain[s], L = ctx.level;
        const r = Math.hypot(d.x, d.y);
        let tx, ty;
        // near the edge: head back to the middle; otherwise go for the closest rival
        if (r > ring * [0.95, 0.9, 0.78, 0.72][L]) { tx = -d.x; ty = -d.y; }
        else {
          let best = null, bd = 1e9;
          for (const o of P) if (o !== s && disc[o].alive) { const dd = Math.hypot(disc[o].x - d.x, disc[o].y - d.y); if (dd < bd) { bd = dd; best = disc[o]; } }
          if (!best) { hold[s] = false; return; }
          const lead = L >= 2 ? 0.25 : 0;
          tx = best.x + best.vx * lead - d.x; ty = best.y + best.vy * lead - d.y;
        }
        const want = Math.atan2(ty, tx);
        let diff = Math.atan2(Math.sin(want - d.a), Math.cos(want - d.a));
        const tol = [0.55, 0.38, 0.24, 0.14][L];
        b.wait -= dt;
        if (b.wait > 0) return;
        if (!hold[s] && Math.abs(diff) < tol) { hold[s] = true; b.wait = [0.5, 0.35, 0.22, 0.15][L] * Math.random(); }
        else if (hold[s] && (Math.abs(diff) > tol * 2.4 || (L >= 2 && r > ring * 0.8 && d.vx * d.x + d.vy * d.y > 0))) { hold[s] = false; b.wait = [0.35, 0.2, 0.1, 0.05][L]; }
        if (hold[s] && Math.random() < [0.012, 0.006, 0, 0][L]) hold[s] = false;
      }
      function step(dt) {
        tRound += dt;
        if (tRound > 9) ring = Math.max(0.42, R0 - (tRound - 9) * 0.024);
        P.forEach(s => {
          const d = disc[s]; if (!d.alive) return;
          if (ctx.isAI(s)) bot(s, dt);
          if (hold[s]) { d.vx += Math.cos(d.a) * PUSH * dt; d.vy += Math.sin(d.a) * PUSH * dt; }
          else d.a += SPIN * d.dir * dt;
          const k = Math.exp(-DRAG * dt); d.vx *= k; d.vy *= k;
          const v = Math.hypot(d.vx, d.vy); if (v > VMAX) { d.vx *= VMAX / v; d.vy *= VMAX / v; }
          d.x += d.vx * dt; d.y += d.vy * dt;
        });
        // collisions: equal masses, a bit of extra bounce so hits feel strong
        for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
          const a = disc[P[i]], b = disc[P[j]]; if (!a.alive || !b.alive) continue;
          const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
          if (dist >= DR * 2 || dist === 0) continue;
          const nx = dx / dist, ny = dy / dist, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          const over = DR * 2 - dist; a.x -= nx * over / 2; a.y -= ny * over / 2; b.x += nx * over / 2; b.y += ny * over / 2;
          if (rel <= 0) continue;
          const imp = rel * 1.18;
          a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
          V.sfx.bounce(); if (rel > 0.5) V.fx.shake(cv, true);
          if (rel > 0.6) { const r = cv.getBoundingClientRect(), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; V.fx.burst(r.left + toPx(mx), r.top + toPx(my), '#fff', 8, 40); }
        }
        let out = false;
        P.forEach(s => { const d = disc[s]; if (d.alive && Math.hypot(d.x, d.y) > ring) { d.alive = false; d.fall = 0.001; out = true; hold[s] = false; pads.dead(s, true); const r = cv.getBoundingClientRect(); V.fx.burst(r.left + toPx(d.x), r.top + toPx(d.y), COL[s], 16, 70); } });
        P.forEach(s => { const d = disc[s]; if (d.fall) d.fall += dt; });
        if (out) V.sfx.hit();
        const alive = P.filter(s => disc[s].alive);
        if (alive.length <= 1) roundOver(alive[0] || 0);
      }
      const toPx = u => px / 2 + u * px * 0.44;
      function draw() {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, px, px);
        const c = px / 2, sc = px * 0.44;
        // ring
        g.fillStyle = '#140f1f'; g.beginPath(); g.arc(c, c, ring * sc, 0, Math.PI * 2); g.fill();
        g.strokeStyle = ring < R0 ? '#ff5d73' : '#ff9f43'; g.lineWidth = 4; g.shadowColor = g.strokeStyle; g.shadowBlur = V.coarse ? 8 : 16; g.stroke(); g.shadowBlur = 0;
        g.strokeStyle = 'rgba(255,159,67,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(c, c, ring * sc * 0.5, 0, Math.PI * 2); g.stroke();
        if (ring < R0) { g.strokeStyle = 'rgba(255,93,115,.18)'; g.setLineDash([6, 6]); g.beginPath(); g.arc(c, c, R0 * sc, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
        P.forEach(s => {
          const d = disc[s]; if (!d) return;
          if (!d.alive && d.fall > 0.6) return;
          const x = toPx(d.x), y = toPx(d.y), r = DR * sc * (d.alive ? 1 : Math.max(0, 1 - d.fall / 0.6));
          g.globalAlpha = d.alive ? 1 : Math.max(0, 1 - d.fall / 0.6);
          g.fillStyle = COL[s]; g.shadowColor = COL[s]; g.shadowBlur = hold[s] ? 22 : 10;
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
          g.fillStyle = 'rgba(8,9,15,.35)'; g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fill();
          if (d.alive) {
            const ax = Math.cos(d.a), ay = Math.sin(d.a), L = r * (hold[s] ? 2.3 : 1.9);
            g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
            g.beginPath(); g.moveTo(x + ax * r * 0.3, y + ay * r * 0.3); g.lineTo(x + ax * L, y + ay * L); g.stroke();
            g.fillStyle = '#fff'; g.beginPath();
            g.moveTo(x + ax * (L + 6), y + ay * (L + 6)); g.lineTo(x + ax * L - ay * 6, y + ay * L + ax * 6); g.lineTo(x + ax * L + ay * 6, y + ay * L - ax * 6); g.fill();
          }
          g.globalAlpha = 1;
        });
      }
      function loop(now) {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.033, (now - last) / 1000 || 0); last = now;
        if (!paused && phase === 'run') step(dt);
        else if (phase === 'over') P.forEach(s => { const d = disc[s]; if (d.fall) d.fall += dt; });
        draw();
      }
      function roundOver(w) {
        if (phase !== 'run') return;
        phase = 'over';
        if (w) { pts[w]++; V.sfx.goal(); cd.innerHTML = `<b style="color:${COL[w]};font-size:44px">${ctx.name(w)} +1</b>`; }
        else { V.sfx.bad(); cd.innerHTML = '<b style="font-size:44px">Alle raus!</b>'; }
        showScore();
        if (w && pts[w] >= target) { ctx.later(() => { cd.innerHTML = ''; }, 900); return ctx.end(w, P.map(s => pts[s]).join(' : ') + ' Punkte'); }
        ctx.later(() => { cd.innerHTML = ''; round(); }, 1400);
      }
      ctx.turn(0, 'Gleich geht es los');
      requestAnimationFrame(() => { size(); round(); last = performance.now(); raf = requestAnimationFrame(loop); });
      return {
        pause() { paused = true; clearTimeout(cdT); P.forEach(s => { hold[s] = false; }); },
        resume() { paused = false; last = performance.now(); if (phase === 'count') resumeCount(); }
      };
    }
  });
})();
