(function () {
  // Billard (8-Ball) for two at one device. Table in its own units: 1 wide, L long; the head (where the break is played
  // from) is at y = L. Phones show the table upright, wide screens lying down (the head on the left).
  const L = 2, R = 0.025, RM = 0.085, CG = 0.062, MG = 0.046, HEAD = L * 0.75, FOOT = L * 0.25;
  const POCKETS = [[-0.012, -0.012, 0.062], [1.012, -0.012, 0.062], [-0.012, L + 0.012, 0.062], [1.012, L + 0.012, 0.062], [-0.036, L / 2, 0.056], [1.036, L / 2, 0.056]];
  const COL = ['#f4f1e6', '#f2c200', '#1f5fd6', '#d8262b', '#6b2fa0', '#f07a12', '#138a3e', '#8b1b1b', '#121318'];
  const colOf = n => COL[n > 8 ? n - 8 : n];
  const VMAX = 6.2, FRIC = 0.5, DRAG = 0.3, CUSH = 0.74, BALL = 0.96;
  const kind = n => n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solid' : 'stripe';
  const GROUP = { solid: 'Volle', stripe: 'Halbe' };

  V.css(`
  .bil{display:flex;flex-direction:column;align-items:center;gap:10px;user-select:none;-webkit-user-select:none}
  .bil .arena canvas{border-radius:16px;background:#1a1220;touch-action:none}
  .bil-tray{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);min-height:22px}
  .bil-tray>span{display:flex;align-items:center;gap:4px}
  .bil-tray i{width:15px;height:15px;border-radius:50%;background:var(--b);box-shadow:inset -2px -2px 3px rgba(0,0,0,.35);position:relative}
  .bil-tray i.st{background:linear-gradient(#f4f1e6 22%,var(--b) 22% 78%,#f4f1e6 78%)}
  .bil-tray i.gone{opacity:.18}
  .bil-tray b{font:700 italic 13px/1 var(--f-d);text-transform:uppercase;padding-right:.15em}
  .bil-ctl{display:flex;align-items:center;gap:8px;width:min(100%,520px)}
  .bil-ctl>button{flex:none;width:46px;height:46px;border-radius:12px;border:1px solid var(--line2);background:var(--panel2);color:var(--fg);font-size:22px;line-height:1;touch-action:none}
  .bil-ctl>button:active{background:var(--panel3)}
  .bil-pow{position:relative;flex:1;height:46px;border-radius:12px;border:1px solid var(--line2);background:var(--panel2);overflow:hidden;touch-action:none;cursor:ew-resize}
  .bil-pow i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,#5dff9d,#ffd84f 55%,#ff4f6d)}
  .bil-pow span{position:absolute;inset:0;display:grid;place-items:center;font:700 italic 14px/1 var(--f-d);letter-spacing:.04em;text-transform:uppercase;color:var(--muted);pointer-events:none}
  .bil-pow.on span{color:#08090f}
  .bil-ctl.off{opacity:.35;pointer-events:none}
  .bil .msg{font-size:clamp(26px,8vw,44px)}`);

  const icon = `<svg viewBox="0 0 48 48"><rect x="3" y="9" width="42" height="30" rx="6" fill="#4a2a1c"/><rect x="7" y="13" width="34" height="22" rx="2" fill="#0f6b55"/><circle cx="8" cy="14" r="2.6" fill="#07080d"/><circle cx="40" cy="14" r="2.6" fill="#07080d"/><circle cx="8" cy="34" r="2.6" fill="#07080d"/><circle cx="40" cy="34" r="2.6" fill="#07080d"/><circle cx="29" cy="22" r="3.4" fill="#f2c200"/><circle cx="34" cy="26" r="3.4" fill="#d8262b"/><circle cx="31" cy="29" r="3.4" fill="#121318"/><circle cx="16" cy="25" r="3.4" fill="#f4f1e6"/><path d="M13 27 3 33" stroke="#e8c27a" stroke-width="2" stroke-linecap="round"/></svg>`;

  V.register({
    id: 'billiard', name: 'Billard', cat: 'Action', order: 6, accent: '#0f9b73',
    short: 'Volle oder Halbe versenken, dann die 8.',
    desc: 'Klassisches 8-Ball: Versenke alle Kugeln deiner Gruppe und zum Schluss die schwarze 8.',
    noFirst: true, noAI: true,
    localHint: 'Abwechselnd am selben Gerät: einer stößt, dann der andere.',
    keys: [['← →', 'Zielen (mit Shift fein)'], ['Leertaste', 'Halten für Kraft, loslassen stößt'], ['Maus', 'Auf dem Tisch ziehen zum Zielen']],
    options: [
      { id: 'to', label: 'Frames zum Sieg', group: 'rules', inline: 'local', short: v => v > 1 ? `bis ${v} Frames` : '1 Frame', def: 2, choices: [[1, '1'], [2, '2'], [3, '3']] },
      { id: 'guide', label: 'Hilfslinie', group: 'rules', desc: 'Zeigt, wohin die getroffene Kugel rollt.', short: v => v === 'off' ? 'ohne Hilfslinie' : v === 'short' ? 'kurze Hilfslinie' : '', def: 'long', choices: [['long', 'Lang'], ['short', 'Kurz'], ['off', 'Aus']] }
    ],
    endDelay: 1200,
    icon,
    tutorial: [
      { t: 'Das Ziel', d: 'Auf dem Tisch liegen 15 Kugeln: <b>Volle</b> (1–7), <b>Halbe</b> (9–15) und die schwarze <b>8</b>. Wer zuerst eine Kugel versenkt, bekommt diese Gruppe. Versenk alle deine Kugeln und danach die 8, dann gewinnst du den Frame.' },
      { t: 'Zielen und Stoßen', d: 'Zieh den Finger über den Tisch, der Queue zeigt dorthin. Mit <b>‹ ›</b> zielst du ganz fein. Dann den Balken unten <b>nach rechts ziehen</b> und loslassen: je weiter, desto fester. Am PC geht das mit der Maus, oder mit ← → zielen und die Leertaste halten. Zurück an den Anfang ziehen bricht ab.' },
      { t: 'Weiterspielen', d: 'Versenkst du eine eigene Kugel, bist du nochmal dran. Sonst ist der andere dran.' },
      { t: 'Fouls', d: 'Ein Foul ist: die weiße Kugel fällt, du triffst gar nichts oder zuerst eine fremde Kugel (oder die 8, solange du noch eigene hast). Dann hat der andere die <b>Kugel in der Hand</b>: Er schiebt die Weiße irgendwohin und stößt von dort.' },
      { t: 'Die 8', d: 'Die 8 kommt ganz zum Schluss. Fällt sie zu früh oder mit einem Foul, hast du den Frame verloren. Fällt sie beim Anstoß, wird sie wieder aufgesetzt.' }
    ],
    start(ctx) {
      const to = +ctx.opts.to || 2, guide = ctx.opts.guide || 'long';
      const root = V.el('div', 'bil'), wrap = V.el('div', 'arena'), cv = V.el('canvas'), msg = V.el('div', 'msg');
      const tray = V.el('div', 'bil-tray');
      const ctl = V.el('div', 'bil-ctl', '<button class="rl" aria-label="Fein nach links">‹</button><div class="bil-pow" role="slider" aria-label="Stoßkraft" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i><span>Ziehen zum Stoßen</span></div><button class="rr" aria-label="Fein nach rechts">›</button>');
      wrap.append(cv, msg); root.append(tray, wrap, ctl); ctx.stage.append(root);
      const powEl = ctl.querySelector('.bil-pow'), powFill = powEl.querySelector('i');

      // ---------- size and view ----------
      const availW = Math.min(ctx.stage.clientWidth || 360, 980);
      const availH = Math.max(300, window.innerHeight - (window.innerWidth < 960 ? 330 : 270));
      const Wu = 1 + 2 * RM, Hu = L + 2 * RM;
      const sP = Math.min(availW / Wu, availH / Hu), sL = Math.min(availW / Hu, availH / Wu);
      const land = sL > sP * 1.05, s = Math.floor(land ? sL : sP);
      const cw = Math.round((land ? Hu : Wu) * s), ch = Math.round((land ? Wu : Hu) * s);
      const dpr = Math.min(V.coarse ? 2 : 2, window.devicePixelRatio || 1), k = s * dpr;
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.width = cw * dpr; cv.height = ch * dpr;
      ctl.style.width = Math.max(cw, Math.min(availW, 300)) + 'px';
      const g = cv.getContext('2d', { alpha: false });
      // table units -> device pixels
      const world = () => land ? g.setTransform(0, k, -k, 0, (L + RM) * k, RM * k) : g.setTransform(k, 0, 0, k, RM * k, RM * k);
      const scr = (x, y) => land ? [(L - y + RM) * k, (x + RM) * k] : [(x + RM) * k, (y + RM) * k];
      const toTable = e => {
        const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * cw / s, py = (e.clientY - r.top) / r.height * ch / s;
        return land ? { x: py - RM, y: L + RM - px } : { x: px - RM, y: py - RM };
      };

      // ball sprites, drawn once
      const spr = [];
      const SP = Math.ceil(R * k * 2 + 4);
      for (let n = 0; n <= 15; n++) {
        const c = document.createElement('canvas'); c.width = c.height = SP;
        const q = c.getContext('2d'), rr = R * k, m = SP / 2;
        q.save(); q.beginPath(); q.arc(m, m, rr, 0, Math.PI * 2); q.clip();
        q.fillStyle = n > 8 ? COL[0] : colOf(n); q.fillRect(0, 0, SP, SP);
        if (n > 8) { q.fillStyle = colOf(n); q.fillRect(0, m - rr * 0.55, SP, rr * 1.1); }
        if (n > 0 && rr > 6) {
          q.fillStyle = '#f7f5ec'; q.beginPath(); q.arc(m, m, rr * 0.48, 0, Math.PI * 2); q.fill();
          q.fillStyle = '#111'; q.font = `700 ${Math.round(rr * (n > 9 ? 0.55 : 0.66))}px system-ui,sans-serif`; q.textAlign = 'center'; q.textBaseline = 'middle';
          q.fillText(n, m, m + rr * 0.04);
        }
        const sh = q.createRadialGradient(m - rr * 0.35, m - rr * 0.4, rr * 0.05, m, m, rr * 1.05);
        sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.85, 'rgba(0,0,0,.12)'); sh.addColorStop(1, 'rgba(0,0,0,.45)');
        q.fillStyle = sh; q.fillRect(0, 0, SP, SP); q.restore();
        spr.push(c);
      }

      // ---------- state ----------
      let balls = [], cur = 1, breaker = 1, frames = { 1: 0, 2: 0 }, groups = { 1: null, 2: null };
      let state = 'aim', inHand = 'kitchen', isBreak = true, aim = -Math.PI / 2, power = 0, charging = null, paused = false;
      let shot = null, lastT = performance.now(), raf = 0, dirty = true, clickT = 0;
      const parts = V.arena.particles();
      const P = n => balls.find(b => b.n === n);
      const cue = () => P(0);
      const left = side => groups[side] ? balls.filter(b => b.on && kind(b.n) === groups[side]).length : 7;

      function rack() {
        balls = [{ n: 0, x: 0.5, y: L * 0.82, vx: 0, vy: 0, on: true }];
        // apex on the foot spot, the 8 in the middle of the third row, one solid and one stripe in the back corners
        const rest = V.shuffle([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
        const s1 = rest.find(n => n < 8), s2 = rest.find(n => n > 8);
        const pool = rest.filter(n => n !== s1 && n !== s2);
        const order = [];
        for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
          let n;
          if (row === 2 && i === 1) n = 8;
          else if (row === 4 && i === 0) n = Math.random() < 0.5 ? s1 : s2;
          else if (row === 4 && i === 4) n = order.includes(s1) ? s2 : s1;
          else n = pool.pop();
          order.push(n);
          const j = () => (Math.random() - 0.5) * 0.0015;
          balls.push({ n, x: 0.5 + (i - row / 2) * (2 * R + 0.0004) + j(), y: FOOT - row * (2 * R + 0.0004) * 0.866 + j(), vx: 0, vy: 0, on: true });
        }
        isBreak = true; inHand = 'kitchen'; groups = { 1: null, 2: null }; aim = -Math.PI / 2;
      }

      // ---------- physics ----------
      const inGapSide = y => y < CG || y > L - CG || Math.abs(y - L / 2) < MG;
      const inGapEnd = x => x < CG || x > 1 - CG;
      let clickCool = 0;
      function click(v) { if (clickCool > 0) return; clickCool = 0.045; if (v > 1.4) V.sfx.bounce(); else if (v > 0.25) V.sfx.tick(); }
      function pot(b) {
        b.on = false; b.vx = b.vy = 0; shot.potted.push(b.n);
        const [px, py] = scr(b.x, b.y);
        parts.emit(b.x, b.y, colOf(b.n), 14, 0.5);
        V.sfx.place();
        if (b.n !== 0 && b.n !== 8) { const r = cv.getBoundingClientRect(); V.fx.float(r.left + px / dpr, r.top + py / dpr, String(b.n), colOf(b.n)); }
      }
      function step(dt) {
        clickCool -= dt;
        let moving = false;
        for (const b of balls) {
          if (!b.on) continue;
          const v = Math.hypot(b.vx, b.vy);
          if (v > 0) {
            const nv = v - (FRIC + DRAG * v) * dt;
            if (nv <= 0.004) { b.vx = b.vy = 0; continue; }
            b.vx *= nv / v; b.vy *= nv / v; moving = true;
            b.x += b.vx * dt; b.y += b.vy * dt;
          }
          // pockets
          for (const [px, py, pr] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < pr) { pot(b); break; }
          if (!b.on) continue;
          // cushions (open at the pocket mouths)
          if (b.x < R && !inGapSide(b.y)) { b.x = R; b.vx = Math.abs(b.vx) * CUSH; b.vy *= 0.96; click(Math.abs(b.vx)); shot.rails++; }
          if (b.x > 1 - R && !inGapSide(b.y)) { b.x = 1 - R; b.vx = -Math.abs(b.vx) * CUSH; b.vy *= 0.96; click(Math.abs(b.vx)); shot.rails++; }
          if (b.y < R && !inGapEnd(b.x)) { b.y = R; b.vy = Math.abs(b.vy) * CUSH; b.vx *= 0.96; click(Math.abs(b.vy)); shot.rails++; }
          if (b.y > L - R && !inGapEnd(b.x)) { b.y = L - R; b.vy = -Math.abs(b.vy) * CUSH; b.vx *= 0.96; click(Math.abs(b.vy)); shot.rails++; }
          // through a mouth but past the pocket: it falls anyway
          if (b.x < -0.05 || b.x > 1.05 || b.y < -0.05 || b.y > L + 0.05) pot(b);
        }
        const on = balls.filter(b => b.on);
        for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
          const a = on[i], c = on[j], dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 >= 4 * R * R || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = (2 * R - d) / 2;
          a.x -= nx * over; a.y -= ny * over; c.x += nx * over; c.y += ny * over;
          const vn = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (vn <= 0) continue;
          const imp = vn * (1 + BALL) / 2;
          a.vx -= imp * nx; a.vy -= imp * ny; c.vx += imp * nx; c.vy += imp * ny;
          if (shot.first == null && (a.n === 0 || c.n === 0)) shot.first = a.n === 0 ? c.n : a.n;
          click(vn); moving = true;
        }
        return moving;
      }

      // ---------- rules ----------
      function shoot(p) {
        if (state !== 'aim' || p < 0.03) return;
        const c = cue();
        // a bit softer at the low end, so short touches stay controllable
        const v = VMAX * (p * p * 0.35 + p * 0.65); c.vx = Math.cos(aim) * v; c.vy = Math.sin(aim) * v;
        shot = { first: null, potted: [], rails: 0, owned: { 1: groups[1], 2: groups[2] }, clearBefore: left(cur) === 0 && !!groups[cur] };
        state = 'roll'; inHand = null; power = 0; showPow(0); ctl.classList.add('off');
        V.sfx.hit(); ctx.moved(cur, { a: aim, p });
        msg.textContent = '';
      }
      function settle() {
        const me = cur, op = 3 - cur, sh = shot, mine = groups[me];
        const scratch = sh.potted.includes(0), eight = sh.potted.includes(8);
        const balls8 = sh.potted.filter(n => n !== 0 && n !== 8);
        let foul = '';
        if (scratch) foul = 'Die Weiße ist gefallen';
        else if (sh.first == null) foul = 'Keine Kugel getroffen';
        else if (!isBreak) {
          if (!mine && sh.first === 8) foul = 'Zuerst die 8 getroffen';
          else if (mine && sh.first === 8 && !sh.clearBefore) foul = 'Zuerst die 8 getroffen';
          else if (mine && sh.first !== 8 && kind(sh.first) !== mine) foul = 'Zuerst eine fremde Kugel getroffen';
        }
        if (scratch) { const c = cue(); c.on = true; c.vx = c.vy = 0; }
        // the 8
        if (eight) {
          if (isBreak) { respot8(); note('Die 8 ist beim Anstoß gefallen und wird wieder aufgesetzt'); }
          else if (sh.clearBefore && !foul) return frameWon(me, 'versenkt die 8');
          else return frameWon(op, foul ? 'hat die 8 mit Foul versenkt' : 'hat die 8 zu früh versenkt', true);
        }
        let again = false, text = '';
        if (!foul && balls8.length) {
          if (!mine && !isBreak) {
            const gk = kind(balls8[0]); groups[me] = gk; groups[op] = gk === 'solid' ? 'stripe' : 'solid';
            text = `${ctx.who(me)} spielt ${GROUP[gk]}`; announce(`${GROUP[gk]}!`, V.hex(me)); again = true;
          } else if (isBreak) again = true;
          else again = balls8.some(n => kind(n) === mine);
        }
        isBreak = false;
        if (foul) {
          V.sfx.bad(); announce('Foul', '#ff5d73');
          text = [`Foul: ${foul}`, `${ctx.who(op)} hat die Kugel in der Hand`];
          cur = op; inHand = 'all';
          placeFree();
        } else if (!again) cur = op;
        if (again && !foul) V.sfx.found();
        aimAtTarget();
        state = 'aim'; ctl.classList.remove('off');
        status(text);
      }
      function respot8() {
        const e = P(8); e.on = true; e.vx = e.vy = 0; e.x = 0.5; e.y = FOOT;
        while (balls.some(b => b !== e && b.on && Math.hypot(b.x - e.x, b.y - e.y) < 2 * R)) e.y -= 0.01;
      }
      // after a foul the cue ball goes to a free spot near the head; the player may move it anywhere
      function placeFree() {
        const c = cue(); c.on = true;
        if (!free(c, c.x, c.y)) { c.x = 0.5; c.y = HEAD + 0.1; for (let t = 0; !free(c, c.x, c.y) && t < 60; t++) { c.x = 0.15 + Math.random() * 0.7; c.y = R + Math.random() * (L - 2 * R); } }
      }
      const free = (c, x, y) => x >= R && x <= 1 - R && y >= (inHand === 'kitchen' ? HEAD : R) && y <= L - R && balls.every(b => b === c || !b.on || Math.hypot(b.x - x, b.y - y) >= 2 * R + 0.002);
      function aimAtTarget() {
        const c = cue(), mine = groups[cur], clear = mine && left(cur) === 0;
        const t = balls.filter(b => b.on && b.n !== 0 && (clear ? b.n === 8 : mine ? kind(b.n) === mine : b.n !== 8)).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
        if (t) aim = Math.atan2(t.y - c.y, t.x - c.x);
      }
      function frameWon(w, why, lost) {
        frames[w]++; state = 'over'; ctl.classList.add('off');
        V.sfx.goal(); V.fx.flash(V.hex(w));
        announce(lost ? 'Frame verloren' : 'Frame!', V.hex(lost ? 3 - w : w));
        status([`${ctx.who(lost ? 3 - w : w)} ${why}`, `Frame für ${ctx.who(w)}`]);
        if (frames[w] >= to) return ctx.later(() => ctx.end(w, to > 1 ? `${frames[1]} : ${frames[2]} Frames` : ''), 900);
        ctx.later(() => {
          breaker = 3 - breaker; cur = breaker; rack(); state = 'aim'; ctl.classList.remove('off');
          announce(`Frame ${frames[1] + frames[2] + 1}`, '#fff'); status();
        }, 2200);
      }
      function announce(t, c) { msg.textContent = t; msg.style.color = c; msg.style.textShadow = `0 0 18px ${c}`; clearTimeout(clickT); clickT = setTimeout(() => { if (msg.textContent === t) msg.textContent = ''; }, 1300); }
      let noteTxt = '';
      const note = t => { noteTxt = t; };
      function status(extra) {
        const lines = [];
        if (noteTxt) { lines.push(noteTxt); noteTxt = ''; }
        if (extra) lines.push(...[].concat(extra));
        else if (state === 'aim') {
          const mine = groups[cur];
          lines.push(inHand === 'kitchen' ? `${ctx.who(cur)} stößt an · Weiße hinter der Linie verschieben` : inHand ? `${ctx.who(cur)}: Kugel in der Hand, Weiße verschieben` : mine ? (left(cur) ? `${ctx.who(cur)} spielt ${GROUP[mine]} · noch ${left(cur)}` : `${ctx.who(cur)} spielt jetzt die 8`) : `${ctx.who(cur)} ist dran · Tisch noch offen`);
        }
        if (to > 1) lines.push(`Frames ${frames[1]} : ${frames[2]}`);
        // every part in its own span, so the translation finds each sentence on its own
        ctx.turn(cur, lines.map(t => `<span>${t}</span>`).join(' · '));
        drawTray();
      }
      function drawTray() {
        const row = side => {
          const gk = groups[side];
          const ns = gk === 'solid' ? [1, 2, 3, 4, 5, 6, 7] : gk === 'stripe' ? [9, 10, 11, 12, 13, 14, 15] : [];
          return `<span><b class="c${side}">${String(ctx.name(side)).replace(/[&<>"]/g, "")}</b>${gk ? ns.map(n => `<i class="${n > 8 ? 'st' : ''}${P(n).on ? '' : ' gone'}" style="--b:${colOf(n)}"></i>`).join('') : '<small>offen</small>'}</span>`;
        };
        tray.innerHTML = row(1) + row(2);
      }

      // ---------- input ----------
      let drag = null;
      const keyAim = d => { if (state !== 'aim') return; aim += d; dirty = true; };
      cv.addEventListener('pointerdown', e => {
        if (state !== 'aim') return;
        cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
        const p = toTable(e), c = cue();
        if (inHand && Math.hypot(p.x - c.x, p.y - c.y) < R * 3.2) drag = { t: 'place' };
        else { drag = { t: 'aim' }; setAim(p); }
        dirty = true;
      });
      cv.addEventListener('pointermove', e => {
        if (state !== 'aim') return;
        const p = toTable(e);
        if (!drag) return;
        if (drag.t === 'place') { const c = cue(), x = Math.max(R, Math.min(1 - R, p.x)), y = Math.max(inHand === 'kitchen' ? HEAD : R, Math.min(L - R, p.y)); if (free(c, x, y)) { c.x = x; c.y = y; } dirty = true; }
        else if (drag.t === 'aim') setAim(p);
      });
      const up = () => {
        drag = null; dirty = true;
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { drag = null; power = 0; showPow(0); });
      function setAim(p) { const c = cue(); if (Math.hypot(p.x - c.x, p.y - c.y) > R * 0.5) { aim = Math.atan2(p.y - c.y, p.x - c.x); dirty = true; } }
      // power bar: pull to the right, release to shoot, back to the start to cancel
      let pw = null;
      powEl.addEventListener('pointerdown', e => { if (state !== 'aim') return; powEl.setPointerCapture && powEl.setPointerCapture(e.pointerId); pw = { x: e.clientX, w: powEl.clientWidth }; showPow(0); });
      // move and release are followed on the window, so a finger or mouse that slips off the bar still counts
      const pwMove = e => { if (!pw) return; power = Math.max(0, Math.min(1, (e.clientX - pw.x) / (pw.w * 0.85))); showPow(power); dirty = true; };
      const pwUp = () => { if (!pw) return; pw = null; const p = power; power = 0; showPow(0); shoot(p); };
      const pwCancel = () => { pw = null; power = 0; showPow(0); };
      window.addEventListener('pointermove', pwMove); window.addEventListener('pointerup', pwUp); window.addEventListener('pointercancel', pwCancel);
      ctx.onCleanup(() => { window.removeEventListener('pointermove', pwMove); window.removeEventListener('pointerup', pwUp); window.removeEventListener('pointercancel', pwCancel); });
      function showPow(p) {
        powFill.style.width = Math.round(p * 100) + '%'; powEl.classList.toggle('on', p > 0.3);
        powEl.setAttribute('aria-valuenow', Math.round(p * 100));
        powEl.querySelector('span').textContent = p > 0 ? Math.round(p * 100) + ' %' : 'Ziehen zum Stoßen';
        dirty = true;
      }
      // fine aim buttons: a tap turns a little, holding turns faster
      ['rl', 'rr'].forEach(c => {
        const b = ctl.querySelector('.' + c), d = c === 'rl' ? -1 : 1; let t = null, n = 0;
        const go = () => { keyAim(d * (n < 6 ? 0.0025 : n < 20 ? 0.008 : 0.02)); n++; t = setTimeout(go, n === 1 ? 260 : 45); };
        b.addEventListener('pointerdown', e => { e.preventDefault(); n = 0; go(); });
        const stop = () => { clearTimeout(t); t = null; };
        b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
        ctx.onCleanup(stop);
      });
      ctx.keys(e => {
        if (state !== 'aim') return false;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keyAim((e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 0.002 : 0.02)); return true; }
        if (e.key === ' ') { if (!e.repeat && !charging) charging = performance.now(); return true; }
        return false;
      });
      const ku = e => { if (e.key === ' ' && charging) { charging = null; const p = power; power = 0; showPow(0); shoot(p); } };
      window.addEventListener('keyup', ku);
      ctx.onCleanup(() => { cancelAnimationFrame(raf); window.removeEventListener('keyup', ku); clearTimeout(clickT); });

      // ---------- drawing ----------
      const cloth = (() => {
        const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
        const q = c.getContext('2d');
        q.fillStyle = '#07080d'; q.fillRect(0, 0, c.width, c.height);
        const T = land ? [0, k, -k, 0, (L + RM) * k, RM * k] : [k, 0, 0, k, RM * k, RM * k];
        q.setTransform(...T);
        // rails
        const wood = q.createLinearGradient(-RM, 0, 1 + RM, 0); wood.addColorStop(0, '#3a2016'); wood.addColorStop(0.5, '#5a3322'); wood.addColorStop(1, '#3a2016');
        q.fillStyle = wood; rr(q, -RM, -RM, 1 + 2 * RM, L + 2 * RM, 0.05); q.fill();
        // diamonds
        q.fillStyle = '#e8d3a0';
        for (let i = 1; i < 4; i++) { const x = i / 4; q.beginPath(); q.arc(x, -RM / 2, 0.007, 0, 7); q.arc(x, L + RM / 2, 0.007, 0, 7); q.fill(); }
        for (let i = 1; i < 8; i++) { if (i === 4) continue; const y = i * L / 8; q.beginPath(); q.arc(-RM / 2, y, 0.007, 0, 7); q.fill(); q.beginPath(); q.arc(1 + RM / 2, y, 0.007, 0, 7); q.fill(); }
        // cloth with a soft light in the middle
        const cl = q.createRadialGradient(0.5, L / 2, 0.1, 0.5, L / 2, L * 0.75); cl.addColorStop(0, '#13886a'); cl.addColorStop(1, '#0a5443');
        q.fillStyle = cl; q.fillRect(-0.022, -0.022, 1.044, L + 0.044);
        // cushions: darker strips between the pockets
        q.fillStyle = '#0a4a3a';
        const cu = 0.022;
        q.fillRect(CG, -cu, 1 - 2 * CG, cu); q.fillRect(CG, L, 1 - 2 * CG, cu);
        q.fillRect(-cu, CG, cu, L / 2 - MG - CG); q.fillRect(-cu, L / 2 + MG, cu, L / 2 - MG - CG);
        q.fillRect(1, CG, cu, L / 2 - MG - CG); q.fillRect(1, L / 2 + MG, cu, L / 2 - MG - CG);
        // head string and foot spot
        q.strokeStyle = 'rgba(255,255,255,.12)'; q.lineWidth = 0.004; q.beginPath(); q.moveTo(0, HEAD); q.lineTo(1, HEAD); q.stroke();
        q.fillStyle = 'rgba(255,255,255,.25)'; q.beginPath(); q.arc(0.5, FOOT, 0.006, 0, 7); q.fill();
        // pockets
        for (const [px, py, pr] of POCKETS) { q.fillStyle = '#020203'; q.beginPath(); q.arc(px, py, pr * 0.82, 0, 7); q.fill(); q.strokeStyle = '#9a7a4a'; q.lineWidth = 0.006; q.stroke(); }
        return c;
      })();
      function rr(q, x, y, w, h, r) { q.beginPath(); q.moveTo(x + r, y); q.arcTo(x + w, y, x + w, y + h, r); q.arcTo(x + w, y + h, x, y + h, r); q.arcTo(x, y + h, x, y, r); q.arcTo(x, y, x + w, y, r); q.closePath(); }
      // where the cue ball meets the first ball or cushion on the aim line
      function ray() {
        const c = cue(), dx = Math.cos(aim), dy = Math.sin(aim);
        let best = Infinity, hit = null;
        for (const b of balls) {
          if (!b.on || b === c) continue;
          const fx = c.x - b.x, fy = c.y - b.y, bq = fx * dx + fy * dy, cq = fx * fx + fy * fy - 4 * R * R, disc = bq * bq - cq;
          if (disc < 0) continue;
          const t = -bq - Math.sqrt(disc);
          if (t > 0 && t < best) { best = t; hit = b; }
        }
        const walls = [dx < 0 ? (R - c.x) / dx : dx > 0 ? (1 - R - c.x) / dx : Infinity, dy < 0 ? (R - c.y) / dy : dy > 0 ? (L - R - c.y) / dy : Infinity];
        const tw = Math.min(...walls);
        if (tw < best) return { t: tw, hit: null };
        return { t: best, hit };
      }
      function draw() {
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cloth, 0, 0);
        // the rail glows in the colour of the player at the table
        world();
        if (state !== 'over') { g.strokeStyle = V.hex(cur); g.globalAlpha = 0.55; g.lineWidth = 0.008; rr(g, -RM + 0.006, -RM + 0.006, 1 + 2 * RM - 0.012, L + 2 * RM - 0.012, 0.045); g.stroke(); g.globalAlpha = 1; }
        if (inHand === 'kitchen' && state === 'aim') { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, HEAD, 1, L - HEAD); }
        const c = cue();
        if (state === 'aim' && c.on) {
          const dx = Math.cos(aim), dy = Math.sin(aim), r = ray();
          if (guide !== 'off') {
            const gx = c.x + dx * r.t, gy = c.y + dy * r.t;
            g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.004; g.setLineDash([0.018, 0.012]);
            g.beginPath(); g.moveTo(c.x + dx * R, c.y + dy * R); g.lineTo(gx, gy); g.stroke(); g.setLineDash([]);
            g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(gx, gy, R, 0, 7); g.stroke();
            if (r.hit) {
              const nx = r.hit.x - gx, ny = r.hit.y - gy, nl = Math.hypot(nx, ny) || 1, len = guide === 'long' ? 0.32 : 0.12;
              const ok = !groups[cur] ? r.hit.n !== 8 : left(cur) === 0 ? r.hit.n === 8 : kind(r.hit.n) === groups[cur];
              g.strokeStyle = ok ? 'rgba(93,255,157,.85)' : 'rgba(255,93,115,.85)'; g.lineWidth = 0.005;
              g.beginPath(); g.moveTo(r.hit.x, r.hit.y); g.lineTo(r.hit.x + nx / nl * len, r.hit.y + ny / nl * len); g.stroke();
              if (guide === 'long') {
                // the cue ball glances off at a right angle
                const side = (dx * ny - dy * nx) > 0 ? 1 : -1, tx = -ny / nl * side, ty = nx / nl * side, f = Math.min(1, Math.abs(dx * ny - dy * nx) / nl) * 0.18;
                g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + tx * f, gy + ty * f); g.stroke();
              }
            }
          }
          // cue stick, pulled back with the power
          const p = charging ? power : power, back = R + 0.02 + p * 0.16, len = 0.95;
          const sx = c.x - dx * back, sy = c.y - dy * back, ex = c.x - dx * (back + len), ey = c.y - dy * (back + len);
          g.lineCap = 'round';
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.016; g.beginPath(); g.moveTo(sx + 0.008, sy + 0.01); g.lineTo(ex + 0.008, ey + 0.01); g.stroke();
          const st = g.createLinearGradient(sx, sy, ex, ey); st.addColorStop(0, '#f1e4c4'); st.addColorStop(0.03, '#f1e4c4'); st.addColorStop(0.031, '#4a8bd6'); st.addColorStop(0.05, '#4a8bd6'); st.addColorStop(0.051, '#e2c07f'); st.addColorStop(0.65, '#b3824a'); st.addColorStop(0.66, '#2b1a12'); st.addColorStop(1, '#1b100b');
          g.strokeStyle = st; g.lineWidth = 0.011; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
        }
        parts.draw(g);
        // balls in screen space (sprites stay upright when the table lies down)
        g.setTransform(1, 0, 0, 1, 0, 0);
        const half = SP / 2;
        for (const b of balls) {
          if (!b.on) continue;
          const [x, y] = scr(b.x, b.y);
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + R * k * 0.18, y + R * k * 0.24, R * k, 0, 7); g.fill();
          g.drawImage(spr[b.n], x - half, y - half);
        }
        if (inHand && state === 'aim' && c.on) {
          const [x, y] = scr(c.x, c.y), t = performance.now() / 300;
          g.strokeStyle = V.hex(cur); g.lineWidth = 2 * dpr; g.globalAlpha = 0.6 + Math.sin(t) * 0.3;
          g.beginPath(); g.arc(x, y, R * k * 1.9, 0, 7); g.stroke(); g.globalAlpha = 1;
        }
      }
      function loop(now) {
        const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
        if (!paused) {
          if (charging && state === 'aim') { const t = (now - charging) / 1300 % 2; power = t < 1 ? t : 2 - t; showPow(power); }
          if (state === 'roll') {
            let t = dt, moving = false;
            while (t > 0) { const d = Math.min(t, 1 / 480); moving = step(d) || moving; t -= d; }
            dirty = true;
            if (!moving && balls.every(b => !b.on || (!b.vx && !b.vy))) settle();
          }
          parts.step(dt);
          draw();
        }
        raf = requestAnimationFrame(loop);
      }

      cur = breaker = Math.random() < 0.5 ? 1 : 2;
      rack();
      status();
      raf = requestAnimationFrame(loop);
      return { pause() { paused = true; }, resume() { paused = false; lastT = performance.now(); } };
    }
  });
})();
