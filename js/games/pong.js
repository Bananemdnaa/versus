(function () {
  const H = 1.5, PW = 0.22, PH = 0.028, BR = 0.018, YB = H - 0.07, YT = 0.07 - PH;

  V.css(`
  .arena{position:relative;user-select:none;-webkit-user-select:none;touch-action:none}
  .arena canvas{display:block;border-radius:18px;border:2px solid var(--line2);background:#080913;box-shadow:0 0 50px -18px var(--cy)}
  .arena .msg{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-family:var(--f-d);font-weight:700;font-size:clamp(34px,10vw,56px);color:var(--fg);text-shadow:0 0 18px rgba(111,243,255,.6);text-align:center}
  .arena .msg:not(:empty){animation:cnt .5s var(--spring)}
  @keyframes cnt{from{transform:scale(1.8);opacity:0}}
  .ctrlhint{font-size:12px;color:var(--dim);text-align:center}`);

  V.arenaSize = function (stage, ratio) {
    const maxW = Math.min(stage.clientWidth || 480, 480);
    const maxH = Math.max(320, window.innerHeight - 230);
    let w = maxW, h = w * ratio;
    if (h > maxH) { h = maxH; w = h / ratio; }
    return { w: Math.floor(w), h: Math.floor(h) };
  };

  // Shared canvas helpers for the arena games: pre-rendered glow sprites instead of shadowBlur (much cheaper on phones),
  // a small particle system and screen shake.
  V.arena = {
    glow(hex, alpha = 0.55) {
      const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d'), n = parseInt(hex.slice(1), 16), rgb = `${n >> 16},${(n >> 8) & 255},${n & 255}`;
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, `rgba(${rgb},${alpha})`); gr.addColorStop(0.45, `rgba(${rgb},${alpha * 0.35})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return c;
    },
    particles() {
      const P = [];
      return {
        emit(x, y, color, n = 12, speed = 0.9) {
          if (!V.fxOn()) return;
          if (V.coarse) n = Math.ceil(n * 0.6);
          for (let i = 0; i < n && P.length < 140; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random()); P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: color, s: 0.006 + Math.random() * 0.008 }); }
        },
        step(dt) { for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; p.life -= dt * 1.8; if (p.life <= 0) P.splice(i, 1); } },
        draw(g) { for (const p of P) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2); } g.globalAlpha = 1; }
      };
    }
  };

  V.register({
    id: 'pong', name: 'Pong', cat: 'Action', order: 2, accent: 'var(--cyan)',
    short: 'Schläger gegen Schläger.',
    desc: 'Halte den Ball im Spiel und spiel ihn am Gegner vorbei. Der Ball wird mit jedem Treffer schneller.',
    sides: { 1: 'Unten', 2: 'Oben' },
    noFirst: true,
    keys: [['← →', 'Schläger unten'], ['A D', 'Schläger oben (zu zweit)'], ['Leertaste', 'Pause']],
    options: [{ id: 'to', label: 'Punkte zum Sieg', def: 7, choices: [[5, '5'], [7, '7'], [11, '11']] }],
    levelInfo: ['Langsamer Schläger, zielt ungenau.', 'Kommt an die meisten Bälle.', 'Schnell und ziemlich genau.', 'Kaum zu überwinden. Spiel mit den Kanten.'],
    endDelay: 900,
    icon: `<svg viewBox="0 0 48 48"><rect x="4" y="3" width="40" height="42" rx="6" fill="#080913" stroke="#3a4070" stroke-width="2"/><path d="M8 24h32" stroke="#2a2f4f" stroke-width="1.6" stroke-dasharray="3 3"/><rect x="12" y="8" width="13" height="3.4" rx="1.7" fill="#ffd84f"/><rect x="22" y="37" width="13" height="3.4" rx="1.7" fill="#ff4fd8"/><circle cx="28" cy="20" r="2.6" fill="#fff"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat einen Schläger, einer unten, einer oben. Lass den Ball nicht an deinem Schläger vorbei. Kommt er bei deinem Gegner durch, bekommst du einen Punkt.' },
      { t: 'Steuerung', d: 'Am Handy ziehst du den Finger auf <b>deiner Hälfte</b> nach links und rechts. Zu zweit hat jeder seine Hälfte, beide gleichzeitig. Am PC: unten mit <b>← →</b> oder der Maus, oben mit <b>A</b> und <b>D</b>. Die Leertaste pausiert.' },
      { t: 'Winkel', d: 'Wo der Ball den Schläger trifft, bestimmt die Richtung. In der Mitte geht er gerade zurück, an der <b>Kante</b> fliegt er schräg weg. Schräge Bälle prallen von den Seitenwänden ab und sind schwer zu halten.' },
      { t: 'Tempo', d: 'Mit jedem Treffer wird der Ball etwas schneller. Nach einem Punkt wird er zu dem Spieler aufgeschlagen, der den Punkt verloren hat.' }
    ],
    start(ctx) {
      const ai = ctx.mode === 'ai', to = ctx.opts.to || 7;
      const bottomSide = ai ? 3 - ctx.aiSide : 1, topSide = 3 - bottomSide;
      const wrap = V.el('div', 'arena'), cv = V.el('canvas'), msg = V.el('div', 'msg');
      const hint = V.el('div', 'ctrlhint', ai ? 'Finger oder Maus bewegen, am PC auch ← →' : 'Unten: Finger unten oder ← →  ·  Oben: Finger oben oder A / D');
      wrap.append(cv, msg); ctx.stage.append(wrap, hint);
      const { w, h } = V.arenaSize(ctx.stage, H);
      const dpr = Math.min(V.coarse ? 1.5 : 2, window.devicePixelRatio || 1);
      cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext('2d', { alpha: false }), S = w * dpr;
      const col = s => V.hex(s);
      const glowB = V.arena.glow(col(bottomSide)), glowT = V.arena.glow(col(topSide)), glowBall = V.arena.glow('#6ff3ff', 0.7);
      const parts = V.arena.particles();

      const pad = { b: 0.5, t: 0.5 }, tgt = { b: null, t: null };
      const ball = { x: 0.5, y: H / 2, vx: 0, vy: 0, sp: 0.8 };
      const trail = [];
      const pts = { b: 0, t: 0 };
      let state = 'serve', serveTo = Math.random() < 0.5 ? 1 : -1, wait = 1.5, last = performance.now(), raf = 0, paused = false, aiErr = 0, shakeT = 0, hitT = { b: 0, t: 0 }, userPause = false;
      const keys = {};
      const kd = e => { const k = e.key.toLowerCase(); keys[k] = true; if (k === 'arrowleft' || k === 'arrowright') e.preventDefault(); };
      const ku = e => { keys[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
      ctx.keys(e => {
        if (e.key === ' ' && !e.repeat && state !== 'over') { userPause = !userPause; msg.textContent = userPause ? 'Pause' : ''; last = performance.now(); return true; }
        return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
      });
      function pointer(e) {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height * H;
        if (ai || y > H / 2) tgt.b = x; else tgt.t = x;
      }
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); pointer(e); });
      cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) pointer(e); });
      ctx.onCleanup(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });

      function serve() {
        ball.x = 0.5; ball.y = H / 2; ball.sp = 0.8; trail.length = 0;
        const a = (Math.random() - 0.5) * 0.9;
        ball.vx = Math.sin(a) * ball.sp; ball.vy = Math.cos(a) * ball.sp * serveTo;
        aiErr = (Math.random() - 0.5) * [0.34, 0.18, 0.09, 0.03][ctx.level];
        state = 'play'; msg.textContent = '';
      }
      function predictX() {
        let x = ball.x; const y = ball.y, vx = ball.vx, vy = ball.vy;
        if (vy >= 0) return 0.5;
        const t = (y - (YT + PH)) / -vy; x += vx * t;
        while (x < 0 || x > 1) { if (x < 0) x = -x; if (x > 1) x = 2 - x; }
        return x;
      }
      function step(dt) {
        const kb = 1.5 * dt;
        if (keys.arrowleft) { pad.b -= kb; tgt.b = null; } if (keys.arrowright) { pad.b += kb; tgt.b = null; }
        if (ai) { if (keys.a) { pad.b -= kb; tgt.b = null; } if (keys.d) { pad.b += kb; tgt.b = null; } }
        else { if (keys.a) { pad.t -= kb; tgt.t = null; } if (keys.d) { pad.t += kb; tgt.t = null; } }
        if (tgt.b != null) pad.b += Math.max(-4 * dt, Math.min(4 * dt, tgt.b - pad.b));
        if (ai) {
          const goal = ball.vy < 0 ? predictX() + aiErr : 0.5 + (ball.x - 0.5) * 0.3;
          const sp = [0.55, 0.85, 1.2, 1.7][ctx.level] * dt;
          pad.t += Math.max(-sp, Math.min(sp, goal - pad.t));
        } else if (tgt.t != null) pad.t += Math.max(-4 * dt, Math.min(4 * dt, tgt.t - pad.t));
        pad.b = Math.max(PW / 2, Math.min(1 - PW / 2, pad.b)); pad.t = Math.max(PW / 2, Math.min(1 - PW / 2, pad.t));
        parts.step(dt);
        hitT.b = Math.max(0, hitT.b - dt * 4); hitT.t = Math.max(0, hitT.t - dt * 4); shakeT = Math.max(0, shakeT - dt);
        if (state !== 'play') return;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx); V.sfx.bounce(); parts.emit(ball.x, ball.y, '#6ff3ff', 5, 0.5); }
        if (ball.x > 1 - BR) { ball.x = 1 - BR; ball.vx = -Math.abs(ball.vx); V.sfx.bounce(); parts.emit(ball.x, ball.y, '#6ff3ff', 5, 0.5); }
        const hitPad = (px, py, dir) => {
          if (Math.abs(ball.x - px) > PW / 2 + BR) return false;
          if (dir < 0 && ball.vy > 0 && ball.y + BR >= py && ball.y - BR <= py + PH) return true;
          if (dir > 0 && ball.vy < 0 && ball.y - BR <= py + PH && ball.y + BR >= py) return true;
          return false;
        };
        const bounce = (px, dir, who) => {
          const off = Math.max(-1, Math.min(1, (ball.x - px) / (PW / 2)));
          ball.sp = Math.min(2.3, ball.sp * 1.06);
          const a = off * 1.05;
          ball.vx = Math.sin(a) * ball.sp; ball.vy = Math.cos(a) * ball.sp * dir;
          V.sfx.bounce(); hitT[who] = 1;
          parts.emit(ball.x, ball.y, col(who === 'b' ? bottomSide : topSide), 12, 0.8);
        };
        if (hitPad(pad.b, YB, -1)) { ball.y = YB - BR; bounce(pad.b, -1, 'b'); }
        if (hitPad(pad.t, YT, 1)) { ball.y = YT + PH + BR; bounce(pad.t, 1, 't'); aiErr = (Math.random() - 0.5) * [0.34, 0.18, 0.09, 0.03][ctx.level]; }
        if (ball.y < -BR * 2) score('b');
        else if (ball.y > H + BR * 2) score('t');
      }
      function score(who) {
        pts[who]++; V.sfx.goal();
        const s = who === 'b' ? bottomSide : topSide;
        parts.emit(ball.x, who === 'b' ? 0.02 : H - 0.02, col(s), 30, 1.4);
        shakeT = 0.35; V.fx.flash(col(s));
        const r = cv.getBoundingClientRect();
        V.fx.float(r.left + r.width / 2, r.top + r.height * (who === 'b' ? 0.3 : 0.7), 'Punkt!', col(s));
        state = 'serve'; wait = 1.3; serveTo = who === 'b' ? -1 : 1;
        status();
        if (pts[who] >= to) { state = 'over'; msg.textContent = ''; ctx.end(s, `${pts.b} : ${pts.t}`); }
      }
      function status() {
        ctx.turn(0, `<span class="c${bottomSide}">${ctx.name(bottomSide)} ${pts.b}</span> : <span class="c${topSide}">${pts.t} ${ctx.name(topSide)}</span> · bis ${to}`);
      }
      function draw() {
        g.setTransform(S, 0, 0, S, 0, 0);
        g.fillStyle = '#080913'; g.fillRect(0, 0, 1, H);
        if (shakeT > 0 && V.fxOn()) g.translate((Math.random() - 0.5) * 0.03 * shakeT / 0.35, (Math.random() - 0.5) * 0.03 * shakeT / 0.35);
        g.strokeStyle = '#232846'; g.lineWidth = 0.006; g.setLineDash([0.02, 0.02]);
        g.beginPath(); g.moveTo(0, H / 2); g.lineTo(1, H / 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,.07)'; g.font = `italic 800 0.22px "Saira Condensed", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(pts.t, 0.5, H * 0.25); g.fillText(pts.b, 0.5, H * 0.75);
        const pd = (x, y, c, gl, ht) => {
          const gw = PW * (1.5 + ht * 0.6);
          g.drawImage(gl, x - gw / 2, y + PH / 2 - gw / 3, gw, gw * 0.66);
          g.fillStyle = ht > 0.5 ? '#fff' : c; g.beginPath();
          if (g.roundRect) g.roundRect(x - PW / 2, y, PW, PH, PH / 2); else g.rect(x - PW / 2, y, PW, PH);
          g.fill();
        };
        pd(pad.b, YB, col(bottomSide), glowB, hitT.b); pd(pad.t, YT, col(topSide), glowT, hitT.t);
        parts.draw(g);
        if (state === 'play') {
          trail.push(ball.x, ball.y); if (trail.length > 16) trail.splice(0, 2);
          for (let i = 0; i < trail.length; i += 2) { g.globalAlpha = (i / trail.length) * 0.35; g.fillStyle = '#6ff3ff'; g.beginPath(); g.arc(trail[i], trail[i + 1], BR * (0.5 + i / trail.length * 0.5), 0, Math.PI * 2); g.fill(); }
          g.globalAlpha = 1;
          g.drawImage(glowBall, ball.x - BR * 4, ball.y - BR * 4, BR * 8, BR * 8);
          g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, Math.PI * 2); g.fill();
        }
      }
      let lastCount = '';
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
