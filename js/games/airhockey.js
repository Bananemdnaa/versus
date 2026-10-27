(function () {
  const H = 1.6, PR = 0.042, MR = 0.068, GW = 0.36, MAXV = 3.4;

  V.register({
    id: 'hockey', name: 'Air Hockey', cat: 'Action', order: 3, accent: 'var(--pink)',
    short: 'Puck ins gegnerische Tor schießen.',
    desc: 'Schieß den Puck mit deinem Schläger ins gegnerische Tor und verteidige dein eigenes.',
    sides: { 1: 'Unten', 2: 'Oben' },
    noFirst: true, noAI: true,
    keys: [['Pfeile', 'Schläger unten'], ['W A S D', 'Schläger oben (zu zweit)'], ['Leertaste', 'Pause']],
    options: [{ id: 'to', label: 'Tore zum Sieg', def: 7, choices: [[5, '5'], [7, '7'], [10, '10']] }],
    levelInfo: ['Langsam und verteidigt schlecht.', 'Verteidigt ordentlich, greift selten an.', 'Schnell, greift gezielt an.', 'Blitzschnell und gnadenlos.'],
    endDelay: 900,
    icon: `<svg viewBox="0 0 48 48" fill="none"><rect x="6" y="3" width="36" height="42" rx="8" fill="#080913" stroke="#3a4070" stroke-width="2"/><path d="M18 3h12M18 45h12" stroke="#6ff3ff" stroke-width="3"/><path d="M6 24h36" stroke="#2a2f4f" stroke-width="1.5"/><circle cx="24" cy="24" r="5" stroke="#2a2f4f" stroke-width="1.5"/><circle cx="20" cy="13" r="5" fill="#ffd84f"/><circle cx="27" cy="36" r="5" fill="#ff4fd8"/><circle cx="31" cy="27" r="2.8" fill="#fff"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat einen runden Schläger in seiner Hälfte. Schieß den Puck in das <b>Tor auf der gegenüberliegenden Seite</b>. Wer zuerst die eingestellten Tore hat, gewinnt.' },
      { t: 'Steuerung', d: 'Leg den Finger auf <b>deine Hälfte</b>, der Schläger folgt ihm. Zu zweit spielt jeder auf seiner Seite gleichzeitig, also Handy flach zwischen euch. Am PC: unten mit Maus oder <b>Pfeiltasten</b>, oben mit <b>W A S D</b>.' },
      { t: 'Schießen', d: 'Je schneller du den Schläger in den Puck bewegst, desto härter der Schuss. Über die <b>Bande</b> gespielt ist der Puck für den Gegner schwer zu lesen. Die Mittellinie darfst du nicht überqueren.' },
      { t: 'Verteidigen', d: 'Bleib zwischen Puck und eigenem Tor. Nach einem Tor bekommt der Spieler, der es kassiert hat, den Puck in seiner Hälfte.' }
    ],
    start(ctx) {
      const ai = ctx.mode === 'ai', to = ctx.opts.to || 7;
      const bottomSide = ai ? 3 - ctx.aiSide : 1, topSide = 3 - bottomSide;
      const wrap = V.el('div', 'arena'), cv = V.el('canvas'), msg = V.el('div', 'msg');
      const hint = V.el('div', 'ctrlhint', ai ? 'Finger oder Maus in deiner Hälfte bewegen, am PC auch Pfeiltasten' : 'Unten: Finger oder Pfeiltasten  ·  Oben: Finger oder W A S D');
      wrap.append(cv, msg); ctx.stage.append(wrap, hint);
      const { w, h } = V.arenaSize(ctx.stage, H);
      const dpr = Math.min(V.coarse ? 1.5 : 2, window.devicePixelRatio || 1);
      cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext('2d', { alpha: false }), SC = w * dpr;
      const col = s => V.hex(s);
      const glow = { b: V.arena.glow(col(bottomSide), 0.6), t: V.arena.glow(col(topSide), 0.6), p: V.arena.glow('#6ff3ff', 0.7) };
      const parts = V.arena.particles(), trail = [];
      let shakeT = 0, userPause = false, lastCount = '', goalFlash = { b: 0, t: 0 };
      ctx.keys(e => {
        if (e.key === ' ' && !e.repeat && state !== 'over') { userPause = !userPause; msg.textContent = userPause ? 'Pause' : ''; last = performance.now(); return true; }
        return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
      });

      const M = { b: { x: 0.5, y: H - 0.16, vx: 0, vy: 0, tx: null, ty: null }, t: { x: 0.5, y: 0.16, vx: 0, vy: 0, tx: null, ty: null } };
      const puck = { x: 0.5, y: H / 2, vx: 0, vy: 0 };
      const pts = { b: 0, t: 0 };
      let state = 'serve', wait = 1.2, serveHalf = Math.random() < 0.5 ? 'b' : 't', last = performance.now(), raf = 0, paused = false, aiJit = { x: 0, y: 0 }, jitT = 0;
      const keys = {};
      const kd = e => { const k = e.key.toLowerCase(); keys[k] = true; if (k.startsWith('arrow')) e.preventDefault(); };
      const ku = e => { keys[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
      const ptrs = new Map();
      function pointer(e) {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.width;
        let who = ptrs.get(e.pointerId);
        if (!who) { who = ai || y > H / 2 ? 'b' : 't'; ptrs.set(e.pointerId, who); }
        M[who].tx = x; M[who].ty = y;
      }
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.delete(e.pointerId); pointer(e); });
      cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || ptrs.has(e.pointerId)) pointer(e); });
      const up = e => { if (e.pointerType !== 'mouse') ptrs.delete(e.pointerId); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      ctx.onCleanup(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });

      const clampM = (m, who) => {
        m.x = Math.max(MR, Math.min(1 - MR, m.x));
        if (who === 'b') m.y = Math.max(H / 2 + MR, Math.min(H - MR, m.y));
        else m.y = Math.max(MR, Math.min(H / 2 - MR, m.y));
      };
      function moveTo(m, who, tx, ty, sp, dt) {
        const ox = m.x, oy = m.y, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), s = sp * dt;
        if (d > s) { m.x += dx / d * s; m.y += dy / d * s; } else { m.x = tx; m.y = ty; }
        clampM(m, who);
        m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt;
      }
      function aiTarget(dt) {
        jitT -= dt;
        if (jitT <= 0) { const e = [0.12, 0.07, 0.035, 0.01][ctx.level]; aiJit = { x: (Math.random() - 0.5) * e * 2, y: (Math.random() - 0.5) * e }; jitT = 0.5; }
        const m = M.t;
        if (puck.y < H / 2) {
          // puck in own half: strike it toward the bottom goal, from behind
          const gx = 0.5 + (Math.random() - 0.5) * 0.1, gy = H + 0.1;
          const dx = puck.x - gx, dy = puck.y - gy, d = Math.hypot(dx, dy) || 1;
          const behindX = puck.x + dx / d * (PR + MR) * 0.6, behindY = puck.y + dy / d * (PR + MR) * 0.6;
          const aligned = m.y < puck.y - 0.02;
          if (!aligned) return { x: puck.x + (m.x < puck.x ? -1 : 1) * (PR + MR + 0.02), y: Math.max(MR, puck.y - (PR + MR) - 0.03) };
          const aggressive = ctx.level >= 2 || Math.hypot(puck.vx, puck.vy) < 0.6;
          return aggressive ? { x: behindX - dx / d * 0.25, y: behindY - dy / d * 0.25 } : { x: behindX, y: behindY };
        }
        // defend: stay between puck and own goal
        const tx = 0.5 + (puck.x - 0.5) * 0.55 + aiJit.x;
        return { x: tx, y: 0.14 + aiJit.y + (ctx.level >= 2 && puck.vy > 0 ? 0.08 : 0) };
      }
      function step(dt) {
        const ks = 2.2;
        const kmove = (who, l, r, u, d) => {
          const m = M[who]; let kx = 0, ky = 0;
          if (keys[l]) kx--; if (keys[r]) kx++; if (keys[u]) ky--; if (keys[d]) ky++;
          if (kx || ky) { m.tx = m.x + kx * 0.2; m.ty = m.y + ky * 0.2; return ks; }
          return null;
        };
        let sb = kmove('b', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown');
        if (ai && !sb) sb = kmove('b', 'a', 'd', 'w', 's');
        if (M.b.tx != null) moveTo(M.b, 'b', M.b.tx, M.b.ty, sb || 5, dt); else { M.b.vx = 0; M.b.vy = 0; }
        if (ai) { const t = aiTarget(dt); moveTo(M.t, 't', t.x, t.y, [1.1, 1.6, 2.3, 3.0][ctx.level], dt); }
        else { const st = kmove('t', 'a', 'd', 'w', 's'); if (M.t.tx != null) moveTo(M.t, 't', M.t.tx, M.t.ty, st || 5, dt); else { M.t.vx = 0; M.t.vy = 0; } }
        parts.step(dt); shakeT = Math.max(0, shakeT - dt);
        goalFlash.b = Math.max(0, goalFlash.b - dt * 1.5); goalFlash.t = Math.max(0, goalFlash.t - dt * 1.5);
        if (state !== 'play') return;
        puck.x += puck.vx * dt; puck.y += puck.vy * dt;
        const f = Math.pow(0.6, dt); puck.vx *= f; puck.vy *= f;
        const wall = () => { V.sfx.bounce(); if (Math.hypot(puck.vx, puck.vy) > 0.8) parts.emit(puck.x, puck.y, '#6ff3ff', 5, 0.5); };
        if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.9; wall(); }
        if (puck.x > 1 - PR) { puck.x = 1 - PR; puck.vx = -Math.abs(puck.vx) * 0.9; wall(); }
        const inGoal = Math.abs(puck.x - 0.5) < GW / 2 - PR * 0.3;
        if (puck.y < PR && !inGoal) { puck.y = PR; puck.vy = Math.abs(puck.vy) * 0.9; wall(); }
        if (puck.y > H - PR && !inGoal) { puck.y = H - PR; puck.vy = -Math.abs(puck.vy) * 0.9; wall(); }
        if (puck.y < -PR) return score('b');
        if (puck.y > H + PR) return score('t');
        for (const k of ['b', 't']) {
          const m = M[k], dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
          if (d < PR + MR && d > 0) {
            const nx = dx / d, ny = dy / d;
            puck.x = m.x + nx * (PR + MR); puck.y = m.y + ny * (PR + MR);
            const rvx = puck.vx - m.vx, rvy = puck.vy - m.vy, vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              puck.vx -= 1.9 * vn * nx; puck.vy -= 1.9 * vn * ny; V.sfx.bounce();
              if (-vn > 1) { parts.emit(puck.x - nx * PR, puck.y - ny * PR, col(k === 'b' ? bottomSide : topSide), Math.min(16, 4 + (-vn) * 3), 0.5 + (-vn) * 0.2); if (-vn > 2.4) shakeT = Math.max(shakeT, 0.12); }
            }
            const sp = Math.hypot(puck.vx, puck.vy); if (sp > MAXV) { puck.vx *= MAXV / sp; puck.vy *= MAXV / sp; }
          }
        }
      }
      function score(who) {
        pts[who]++; V.sfx.goal(); status();
        const s = who === 'b' ? bottomSide : topSide;
        parts.emit(puck.x, who === 'b' ? 0.01 : H - 0.01, col(s), 36, 1.5);
        goalFlash[who === 'b' ? 't' : 'b'] = 1; shakeT = 0.4; V.fx.flash(col(s));
        const r = cv.getBoundingClientRect();
        V.fx.float(r.left + r.width / 2, r.top + r.height * (who === 'b' ? 0.3 : 0.7), 'TOR!', col(s));
        trail.length = 0;
        serveHalf = who === 'b' ? 't' : 'b';
        if (pts[who] >= to) { state = 'over'; ctx.end(who === 'b' ? bottomSide : topSide, `${pts.b} : ${pts.t} Tore`); return; }
        state = 'serve'; wait = 1.2;
        puck.x = 0.5; puck.y = H / 2; puck.vx = puck.vy = 0;
      }
      function serve() {
        puck.x = 0.5; puck.y = serveHalf === 'b' ? H * 0.68 : H * 0.32; puck.vx = puck.vy = 0;
        state = 'play'; msg.textContent = '';
      }
      function status() {
        ctx.turn(0, `<span class="c${bottomSide}">${ctx.name(bottomSide)} ${pts.b}</span> : <span class="c${topSide}">${pts.t} ${ctx.name(topSide)}</span> · bis ${to}`);
      }
      function draw() {
        g.setTransform(SC, 0, 0, SC, 0, 0);
        g.fillStyle = '#080913'; g.fillRect(0, 0, 1, H);
        if (shakeT > 0 && V.fxOn()) g.translate((Math.random() - 0.5) * 0.04 * shakeT / 0.4, (Math.random() - 0.5) * 0.04 * shakeT / 0.4);
        // goal glow when a goal was just scored
        for (const k of ['t', 'b']) if (goalFlash[k] > 0) { g.globalAlpha = goalFlash[k]; const y = k === 't' ? 0 : H; g.drawImage(glow[k === 't' ? 't' : 'b'], 0.5 - 0.5, y - 0.5, 1, 1); g.globalAlpha = 1; }
        g.strokeStyle = '#232846'; g.lineWidth = 0.006;
        g.beginPath(); g.moveTo(0, H / 2); g.lineTo(1, H / 2); g.stroke();
        g.beginPath(); g.arc(0.5, H / 2, 0.13, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(0.5, 0, GW / 2 + 0.06, 0, Math.PI); g.stroke();
        g.beginPath(); g.arc(0.5, H, GW / 2 + 0.06, Math.PI, Math.PI * 2); g.stroke();
        g.drawImage(glow.t, 0.5 - GW / 2, -0.08, GW, 0.16); g.drawImage(glow.b, 0.5 - GW / 2, H - 0.08, GW, 0.16);
        g.lineWidth = 0.02; g.lineCap = 'round';
        g.strokeStyle = col(topSide); g.beginPath(); g.moveTo(0.5 - GW / 2, 0.006); g.lineTo(0.5 + GW / 2, 0.006); g.stroke();
        g.strokeStyle = col(bottomSide); g.beginPath(); g.moveTo(0.5 - GW / 2, H - 0.006); g.lineTo(0.5 + GW / 2, H - 0.006); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.07)'; g.font = `italic 800 0.2px "Saira Condensed", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(pts.t, 0.5, H * 0.25); g.fillText(pts.b, 0.5, H * 0.75);
        parts.draw(g);
        if (state === 'play') {
          const sp = Math.hypot(puck.vx, puck.vy);
          trail.push(puck.x, puck.y); if (trail.length > 14) trail.splice(0, 2);
          if (sp > 0.6) for (let i = 0; i < trail.length; i += 2) { g.globalAlpha = (i / trail.length) * Math.min(0.4, sp / 8); g.fillStyle = '#6ff3ff'; g.beginPath(); g.arc(trail[i], trail[i + 1], PR * (0.4 + i / trail.length * 0.6), 0, Math.PI * 2); g.fill(); }
          g.globalAlpha = 1;
          g.drawImage(glow.p, puck.x - PR * 3, puck.y - PR * 3, PR * 6, PR * 6);
          g.fillStyle = '#f4f6ff'; g.beginPath(); g.arc(puck.x, puck.y, PR, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#b9c0ff'; g.lineWidth = 0.004; g.beginPath(); g.arc(puck.x, puck.y, PR * 0.6, 0, Math.PI * 2); g.stroke();
        }
        for (const [k, s] of [['b', bottomSide], ['t', topSide]]) {
          const m = M[k];
          g.drawImage(glow[k], m.x - MR * 2.2, m.y - MR * 2.2, MR * 4.4, MR * 4.4);
          g.fillStyle = col(s); g.beginPath(); g.arc(m.x, m.y, MR, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(m.x, m.y, MR * 0.62, 0, Math.PI * 2); g.fill();
          g.fillStyle = col(s); g.beginPath(); g.arc(m.x, m.y, MR * 0.36, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(m.x - MR * 0.12, m.y - MR * 0.14, MR * 0.13, 0, Math.PI * 2); g.fill();
        }
      }
      function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!paused && !userPause && state !== 'over') {
          if (state === 'serve') {
            wait -= dt; const c = wait > 0.05 && wait < 1.2 ? String(Math.ceil(wait)) : '';
            if (c !== lastCount) { msg.textContent = c; lastCount = c; if (c) V.sfx.tick(); }
            if (wait <= 0) serve();
          }
          let t = dt; while (t > 0) { const d = Math.min(t, 1 / 240); step(d); t -= d; }
        } else if (state === 'over') parts.step(dt);
        draw();
        raf = requestAnimationFrame(loop);
      }
      status();
      raf = requestAnimationFrame(loop);
      return { pause() { paused = true; }, resume() { paused = false; last = performance.now(); } };
    }
  });
})();
