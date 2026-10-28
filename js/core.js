(function () {
  'use strict';

  const V = window.V = { games: [], byId: {} };
  V.LEVELS = ['Leicht', 'Mittel', 'Schwer', 'Profi'];
  V.CATS = ['Klassiker', 'Strategie', 'Action'];
  const LEVEL_INFO = [
    'Macht oft Fehler. Gut zum Lernen.',
    'Spielt solide, übersieht aber einiges.',
    'Denkt mehrere Züge voraus.',
    'Volle Rechenpower. Viel Glück.'
  ];

  V.register = g => { V.games.push(g); V.byId[g.id] = g; };
  V.css = css => { document.getElementById('game-css').textContent += css; };

  // ---------- storage ----------
  const S = V.store = {
    get(k, d) { try { const v = localStorage.getItem('versus.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    // silent: written by the cloud sync itself, so it must not trigger another upload
    set(k, v, silent) { try { localStorage.setItem('versus.' + k, JSON.stringify(v)); } catch (e) { } if (!silent && V.cloud) V.cloud.changed(k); }
  };
  const DEFAULTS = { sound: true, vol: 80, music: true, mvol: 45, haptic: 'strong', fx: 'full', intro: true, coords: true, hints: true, aiFast: false, openCards: true };
  const settings = V.settings = Object.assign({}, DEFAULTS, S.get('settings', {}));
  // older saves stored vibration as true/false
  if (settings.haptic === true) settings.haptic = 'strong'; else if (settings.haptic === false) settings.haptic = 'off';
  const saveSettings = () => S.set('settings', settings);
  let stats = S.get('stats', {});
  let seen = S.get('seen', {});
  function stat(id) {
    if (!stats[id]) stats[id] = { ai: [0, 1, 2, 3].map(() => ({ w: 0, l: 0, d: 0 })), local: { a: 0, b: 0, d: 0 } };
    return stats[id];
  }

  // ---------- utils ----------
  V.rand = n => Math.floor(Math.random() * n);
  V.pick = a => a[Math.floor(Math.random() * a.length)];
  V.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  V.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  V.fxOn = () => settings.fx !== 'low' && !reduced;
  V.coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function applyFxClass() {
    const r = document.documentElement.classList;
    r.toggle('lowfx', !V.fxOn()); r.toggle('nocoords', settings.coords === false); r.toggle('nohints', settings.hints === false);
  }

  // ---------- sound and haptics ----------
  let actx = null;
  // one shared audio context for effects and music (js/music.js)
  V.audio = () => {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { actx = new AC(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume().catch(() => { });
    return actx;
  };
  function tone(f, d = 0.08, type = 'square', vol = 0.05, slide = 0) {
    if (!settings.sound) return;
    try {
      if (!V.audio()) return;
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
      vol *= Math.max(0, Math.min(100, settings.vol ?? 80)) / 80;
      if (vol <= 0) return;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { }
  }
  // Vibration: Android and most browsers use the Vibration API; iPhones (no API) get a short haptic tap
  // through a hidden iOS 18 switch. "light" and "strong" stretch every pulse; motors in many phones ignore pulses under ~25 ms.
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let iosSwitch = null;
  function iosTap() {
    try {
      if (!iosSwitch) { iosSwitch = document.createElement('label'); iosSwitch.setAttribute('aria-hidden', 'true'); iosSwitch.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; iosSwitch.innerHTML = '<input type="checkbox" switch tabindex="-1">'; document.body.appendChild(iosSwitch); }
      iosSwitch.click();
    } catch (e) { }
  }
  V.canVibrate = !!navigator.vibrate || IOS;
  V.isIOS = IOS;
  V.buzz = p => {
    const lvl = settings.haptic; if (!lvl || lvl === 'off') return;
    const k = lvl === 'light' ? 1.6 : 3.2;
    if (navigator.vibrate) { try { navigator.vibrate(Array.isArray(p) ? p.map((x, i) => i % 2 ? x : Math.round(x * k)) : Math.round(p * k)); } catch (e) { } }
    else if (IOS) iosTap();
  };
  V.sfx = {
    tick() { tone(1200, 0.025, 'square', 0.02); },
    move() { tone(520, 0.06, 'triangle', 0.07); V.buzz(14); },
    place() { tone(320, 0.1, 'triangle', 0.09, -140); V.buzz(22); },
    hit() { tone(200, 0.22, 'sawtooth', 0.06, -140); V.buzz([35, 45, 45]); },
    miss() { tone(760, 0.08, 'sine', 0.05, -320); },
    bad() { tone(130, 0.22, 'square', 0.04); V.buzz(60); },
    bounce() { tone(440, 0.04, 'square', 0.04); V.buzz(10); },
    goal() { tone(660, 0.12, 'triangle', 0.08, 300); V.buzz(40); },
    go() { tone(980, 0.12, 'square', 0.05); V.buzz(30); },
    ui() { tone(700, 0.035, 'triangle', 0.035); V.buzz(8); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.08), i * 110)); V.buzz([45, 70, 45, 70, 120]); V.music && V.music.duck(3200); },
    lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.07), i * 150)); V.buzz(140); V.music && V.music.duck(3200); }
  };

  // ---------- effects ----------
  const fxLayer = () => document.getElementById('fx');
  V.fx = {
    center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; },
    shake(el, small) {
      if (!el || !V.fxOn()) return;
      const c = small ? 'fx-shake-s' : 'fx-shake';
      el.classList.remove('fx-shake', 'fx-shake-s'); void el.offsetWidth; el.classList.add(c);
      setTimeout(() => el.classList.remove(c), 520);
    },
    pop(el, cls = 'fx-pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); },
    burst(x, y, color, n = 10, spread = 60) {
      if (!V.fxOn()) return;
      const L = fxLayer(); if (V.coarse) n = Math.ceil(n * 0.7);
      for (let i = 0; i < n; i++) {
        const s = document.createElement('i'); s.className = 'fx-p';
        const a = Math.random() * Math.PI * 2, d = spread * (0.45 + Math.random() * 0.75);
        s.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px;--c:${color};--s:${(0.5 + Math.random() * 0.9).toFixed(2)}`;
        L.appendChild(s); setTimeout(() => s.remove(), 750);
      }
    },
    burstAt(el, color, n, spread) { if (!el) return; const c = V.fx.center(el); V.fx.burst(c.x, c.y, color, n, spread); },
    ring(x, y, color, size = 90) {
      if (!V.fxOn()) return;
      const s = document.createElement('i'); s.className = 'fx-ring';
      s.style.cssText = `left:${x}px;top:${y}px;--c:${color};--z:${size}px`;
      fxLayer().appendChild(s); setTimeout(() => s.remove(), 650);
    },
    ringAt(el, color, size) { if (!el) return; const c = V.fx.center(el); V.fx.ring(c.x, c.y, color, size || Math.max(c.w, c.h) * 1.6); },
    float(x, y, text, color) {
      const s = document.createElement('b'); s.className = 'fx-float'; s.textContent = text;
      s.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
      fxLayer().appendChild(s); setTimeout(() => s.remove(), 1100);
    },
    floatAt(el, text, color) { if (!el) return; const c = V.fx.center(el); V.fx.float(c.x, c.y - c.h * 0.3, text, color); },
    flash(color) {
      if (!V.fxOn()) return;
      const s = document.createElement('i'); s.className = 'fx-flash'; s.style.setProperty('--c', color);
      fxLayer().appendChild(s); setTimeout(() => s.remove(), 500);
    },
    // moves `el` visually from the screen position `from` (a rect) to its current place
    slide(el, from, ms = 220) {
      if (!el || !from || !V.fxOn()) return;
      const to = el.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
      if (!dx && !dy) return;
      el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.25,.8,.3,1)' });
    },
    confetti(colors) {
      if (!V.fxOn()) return;
      const cv = document.createElement('canvas'); cv.className = 'fx-confetti';
      const dpr = Math.min(V.coarse ? 1.5 : 2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; fxLayer().appendChild(cv);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      colors = colors || ['#ff4fd8', '#ffd84f', '#6ff3ff', '#5dff9d', '#ffffff'];
      const n = V.coarse ? 90 : 160, P = [];
      for (let i = 0; i < n; i++) {
        const fromLeft = i % 2 === 0;
        P.push({ x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.35), vx: (fromLeft ? 1 : -1) * (300 + Math.random() * 520), vy: -(600 + Math.random() * 650), r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: colors[i % colors.length] });
      }
      let last = performance.now(); const t0 = last;
      (function frame(now) {
        const dt = Math.min(0.04, (now - last) / 1000); last = now;
        g.clearRect(0, 0, W, H);
        const age = (now - t0) / 1000;
        g.globalAlpha = age > 2.2 ? Math.max(0, 1 - (age - 2.2) / 0.6) : 1;
        for (const p of P) {
          p.vy += 1300 * dt; p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 0.8 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.r * 1.7));
          g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
        }
        if (age < 2.8) requestAnimationFrame(frame); else cv.remove();
      })(last);
    }
  };

  // ---------- AI helpers ----------
  // Negamax with alpha-beta and iterative deepening.
  // g.moves(s), g.play(s,m) -> new state, g.over(s,ply) -> null | score for side to move, g.eval(s) -> score for side to move.
  V.search = function (g, s, maxDepth, timeMs = 1500) {
    const deadline = performance.now() + timeMs;
    let nodes = 0, stop = false;
    function nm(s, d, a, b, ply) {
      const t = g.over(s, ply); if (t !== null) return t;
      if (d <= 0) return g.eval(s);
      if ((++nodes & 511) === 0 && performance.now() > deadline) stop = true;
      if (stop) return 0;
      let ms = g.moves(s); if (g.order) ms = g.order(s, ms);
      let best = -1e9;
      for (const m of ms) {
        const v = -nm(g.play(s, m), d - 1, -b, -a, ply + 1);
        if (v > best) best = v;
        if (v > a) a = v;
        if (a >= b) break;
      }
      return best;
    }
    let rootMoves = V.shuffle(g.moves(s).slice());
    if (g.order) rootMoves = g.order(s, rootMoves);
    let bestMove = rootMoves[0], bestScore = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
      let a = -1e9, bm = null;
      for (const m of rootMoves) {
        const v = -nm(g.play(s, m), depth - 1, -1e9, -a, 1);
        if (stop) break;
        if (v > a) { a = v; bm = m; }
      }
      if (stop && depth > 1) break;
      if (bm !== null) { bestMove = bm; bestScore = a; rootMoves = [bm, ...rootMoves.filter(x => x !== bm)]; }
      if (Math.abs(a) > 90000) break;
      if (stop) break;
    }
    return { move: bestMove, score: bestScore };
  };

  // Exact score for every root move (full window). The weaker levels use it to play like a person:
  // usually a good move, sometimes a decent one, almost never a terrible one.
  V.searchAll = function (g, s, depth, timeMs = 1200) {
    const deadline = performance.now() + timeMs;
    let nodes = 0, stop = false;
    function nm(s, d, a, b, ply) {
      const t = g.over(s, ply); if (t !== null) return t;
      if (d <= 0) return g.eval(s);
      if ((++nodes & 511) === 0 && performance.now() > deadline) stop = true;
      if (stop) return g.eval(s);
      let ms = g.moves(s); if (g.order) ms = g.order(s, ms);
      let best = -1e9;
      for (const m of ms) {
        const v = -nm(g.play(s, m), d - 1, -b, -a, ply + 1);
        if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
      }
      return best;
    }
    return g.moves(s).map(m => ({ m, v: -nm(g.play(s, m), depth - 1, -1e9, 1e9, 1) }));
  };
  // Softmax choice over scored moves; temp is in the game's own score units (0 = always the best move).
  V.pickSoft = function (scored, temp) {
    let best = scored[0];
    for (const x of scored) if (x.v > best.v) best = x;
    if (!temp) { const top = scored.filter(x => x.v === best.v); return { move: V.pick(top).m, score: best.v }; }
    const cl = v => Math.max(-3000, Math.min(3000, v));
    const w = scored.map(x => Math.exp((cl(x.v) - cl(best.v)) / temp));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < scored.length; i++) { r -= w[i]; if (r <= 0) return { move: scored[i].m, score: best.v }; }
    return { move: best.m, score: best.v };
  };
  // Beginner level: a share of plain random moves on top of a very loose soft choice,
  // so it misses threats and sometimes even its own win.
  V.weak = function (scored, temp, randomRate) {
    if (Math.random() < randomRate) { const x = V.pick(scored); return { move: x.m, score: Math.max(...scored.map(y => y.v)) }; }
    return V.pickSoft(scored, temp);
  };
  // how the AI feels about the position, -1 (lost) .. 1 (won)
  V.mood = (score, unit) => Math.abs(score) > 90000 ? Math.sign(score) : Math.tanh(score / unit);

  // Monte Carlo tree search. g.moves, g.play (immutable), g.result(s) -> null|0|1|2, g.turn(s) -> 1|2
  V.mcts = function (g, root, iters, timeMs = 2500) {
    const deadline = performance.now() + timeMs;
    const R = { s: root, kids: [], untried: null, w: 0, n: 0, p: 0, m: null, parent: null };
    for (let i = 0; i < iters; i++) {
      if ((i & 63) === 0 && performance.now() > deadline) break;
      let node = R;
      while (true) {
        if (node.untried === null) node.untried = g.result(node.s) === null ? V.shuffle(g.moves(node.s).slice()) : [];
        if (node.untried.length || !node.kids.length) break;
        let best = null, bv = -Infinity; const ln = Math.log(node.n);
        for (const k of node.kids) { const v = k.w / k.n + 1.3 * Math.sqrt(ln / k.n); if (v > bv) { bv = v; best = k; } }
        node = best;
      }
      if (node.untried.length) {
        const m = node.untried.pop();
        const k = { s: g.play(node.s, m), kids: [], untried: null, w: 0, n: 0, p: g.turn(node.s), m, parent: node };
        node.kids.push(k); node = k;
      }
      let s = node.s, r = g.result(s), guard = 0;
      while (r === null && guard++ < 300) { const ms = g.moves(s); s = g.play(s, ms[Math.floor(Math.random() * ms.length)]); r = g.result(s); }
      if (r === null) r = 0;
      for (let n = node; n; n = n.parent) { n.n++; if (r === 0) n.w += 0.5; else if (r === n.p) n.w += 1; }
    }
    let best = null;
    for (const k of R.kids) if (!best || k.n > best.n) best = k;
    return best ? { move: best.m, rate: best.w / best.n } : { move: V.pick(g.moves(root)), rate: 0.5 };
  };

  // ---------- touch pads for action games with 2-4 players at one device ----------
  // Player 1 (and 3) sit at the bottom edge, players 2 (and 4) at the top edge, so their pads are turned around.
  // o: { players, human(s) -> bool, buttons: [[id, html]], down(s, id), up(s, id) }. Returns { top, bottom, el(s), dead(s, on) }.
  V.pads = function (ctx, o) {
    const hum = o.players.filter(o.human);
    const mk = list => {
      const row = V.el('div', 'pads kb-hide' + (list.length === 1 ? ' one' : ''));
      list.forEach(s => {
        const pad = V.el('div', 'pad p' + s + (s ? '' : ' empty'), s ? `<span class="pk">${ctx.name(s)}</span>` + o.buttons.map(([id, h]) => `<button data-b="${id}" aria-label="${id}">${h}</button>`).join('') : '');
        if (s) pad.dataset.s = s;
        row.appendChild(pad);
      });
      return row;
    };
    const bottom = hum.filter(s => s % 2), top = hum.filter(s => !(s % 2));
    if (bottom.length && top.length && bottom.length !== top.length) (bottom.length < top.length ? bottom : top).push(0);
    const res = { top: top.length ? mk(top) : null, bottom: bottom.length ? mk(bottom) : null };
    if (res.top) res.top.classList.add('far');
    const held = new Map();
    [res.top, res.bottom].forEach(row => row && row.querySelectorAll('.pad button').forEach(b => {
      const s = +b.closest('.pad').dataset.s, id = b.dataset.b;
      b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } held.set(e.pointerId, b); b.classList.add('dn'); o.down(s, id); });
      const up = e => { if (held.get(e.pointerId) !== b) return; held.delete(e.pointerId); b.classList.remove('dn'); if (o.up) o.up(s, id); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    }));
    res.el = s => document.querySelector(`.pad[data-s="${s}"]`);
    res.dead = (s, on) => { const p = res.el(s); if (p) p.classList.toggle('dead', on); };
    return res;
  };

  // ---------- mini boards for tutorials ----------
  const MINI_BASE = {
    '.': { c: '' }, ' ': { c: 'nb' }, a: { c: 'd1' }, b: { c: 'd2' }, A: { c: 'd1 rg' }, B: { c: 'd2 rg' },
    '*': { c: 'tg' }, x: { c: 'x', t: 'X' }, o: { c: 'o', t: 'O' }, X: { c: 'x hl', t: 'X' }, O: { c: 'o hl', t: 'O' },
    h: { c: 'hl' }, m: { c: 'ms' }, s: { c: 'sh' }, '#': { c: 'ht', t: '✕' }, '%': { c: 'sk', t: '✕' }, k: { c: 'k1' }, K: { c: 'k2' }
  };
  V.mini = function (rows, map = {}, o = {}) {
    const cols = rows[0].length, M = Object.assign({}, MINI_BASE, map);
    let h = `<div class="mini" style="grid-template-columns:repeat(${cols},1fr);max-width:${o.w || Math.min(300, cols * 40)}px">`;
    let n = 0;
    rows.forEach((r, ri) => [...r].forEach((ch, ci) => {
      const m = M[ch] || { c: '', t: ch };
      const sq = o.checker ? ((ri + ci) % 2 ? ' dk' : ' lt') : '';
      const filled = ch !== '.' && ch !== ' ' && !o.checker ? ` style="--d:${(n++ * 40)}ms"` : (o.checker && ch !== '.' ? ` style="--d:${(n++ * 30)}ms"` : '');
      h += `<div class="mc ${m.c || ''}${sq}"${filled}>${m.t || ''}</div>`;
    }));
    return h + '</div>';
  };

  // ---------- icons ----------
  const svg = (p, fill) => `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${p}</svg>`;
  const IC = V.IC = {
    back: svg('<path d="M15 6l-6 6 6 6"/>'),
    help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.1-2.4 3.6"/><path d="M12 17h.01"/>'),
    redo: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    sound: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>'),
    mute: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
    play: svg('<path d="M7 4.5v15l13-7.5z"/>', true),
    book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M8 7h7"/>'),
    kbd: svg('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
    grid: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    robot: svg('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3.5" r="1"/>'),
    users: svg('<circle cx="8" cy="8" r="3.2"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M14.5 14.6A4.6 4.6 0 0 1 21.5 19"/>'),
    trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    shake: svg('<path d="M3 12l4-4 4 3 3-2 4 3 3-3"/><path d="M7 8l3 8M14 9l3 8"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    vib: svg('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 9v6M21 9v6"/>'),
    spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>'),
    dl: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
    sync: svg('<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>'),
    bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    hash: svg('<path d="M5 9h15M4 15h15M10 3L8 21M16 3l-2 18"/>'),
    eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    film: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
    share: svg('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/>'),
    phone: svg('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>'),
    music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    smile: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    qr: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 18.5h1.5M18.5 14H20"/>'),
    wifioff: svg('<path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 5.2-2.7M16.3 10.4A10 10 0 0 1 19 12.5M8.5 16.1a5 5 0 0 1 7 0"/><path d="M3 3l18 18"/><circle cx="12" cy="19.5" r=".8"/>'),
  };

  // ---------- player colours ----------
  // You are always pink and on the left, the AI is always yellow and on the right, no matter who moves first.
  // Games paint "side 1" with --p1; when the AI plays side 1 the two colours are swapped on the root element.
  let swapped = false;
  function setSwap(on) { swapped = !!on; document.documentElement.classList.toggle('swap', swapped); }
  // party games (up to 4 players) add cyan and green as sides 3 and 4
  V.hex = s => s === 3 ? '#62f0ff' : s === 4 ? '#5dff9d' : ((s === 1) !== swapped) ? '#ff4fd8' : '#ffd84f';
  V.colorName = s => s === 3 ? 'Cyan' : s === 4 ? 'Grün' : ((s === 1) !== swapped) ? 'Pink' : 'Gelb';

  // ---------- app shell ----------
  const app = document.getElementById('app');
  const wideMQ = window.matchMedia('(min-width: 960px)');
  const wide = () => wideMQ.matches;
  let current = null, view = 'home', homeTab = 'games', homeFilter = 'Alle', selected = null;
  function destroyCurrent() { if (current) { current.destroy(); current = null; } nav.reset(); closeModal(); setSwap(false); }
  const musicFor = g => g.cat === 'Action' ? 'action' : g.cat === 'Strategie' ? 'think' : 'play';
  function mount(html) {
    app.innerHTML = html;
    const v = app.firstElementChild;
    if (v && V.fxOn()) { v.classList.add('enter'); setTimeout(() => v.classList.remove('enter'), 900); }
    window.scrollTo(0, 0);
    queueGuard();
    if (V.music) V.music.play(view === 'play' && lastGame ? musicFor(lastGame) : 'menu');
    return v;
  }
  function totals() {
    let total = 0, aiWins = 0, aiGames = 0, proWins = 0, draws = 0, onWins = 0, onGames = 0;
    for (const id in stats) {
      const s = stats[id];
      if (s.on) { onWins += s.on.w; onGames += s.on.w + s.on.l + s.on.d; }
      s.ai.forEach((r, i) => { aiWins += r.w; aiGames += r.w + r.l + r.d; draws += r.d; if (i === 3) proWins += r.w; });
      total += s.local.a + s.local.b + s.local.d;
    }
    total += aiGames + onGames;
    const rated = aiGames + onGames;
    return { total, aiWins, aiGames, proWins, draws, onWins, onGames, rate: rated ? Math.round((aiWins + onWins) / rated * 100) : 0 };
  }
  const TABS = [['games', 'Spiele', IC.grid], ['online', 'Online', IC.globe], ['stats', 'Bilanz', IC.chart], ['profile', 'Konto', IC.user], ['opts', 'Optionen', IC.gear]];
  const logo = '<button class="logo" id="logo" aria-label="Versus Startseite"><span class="l1">VER</span><i class="slash"></i><span class="l2">SUS</span></button>';
  function header(extra = '') {
    return `<header class="top">${logo}${extra}
      <div class="top-r">${acctChip()}<button class="iconbtn only-fine" id="kbd" aria-label="Tastenkürzel" title="Tastenkürzel (?)">${IC.kbd}</button>
      <button class="iconbtn" id="snd" aria-label="Ton an oder aus" title="Ton (M)">${settings.sound ? IC.sound : IC.mute}</button></div></header>`;
  }
  function wireHeader(root) {
    const s = root.querySelector('#snd'); if (s) s.onclick = toggleSound;
    const k = root.querySelector('#kbd'); if (k) k.onclick = showKeys;
    const a = root.querySelector('#acct'); if (a) a.onclick = () => { V.sfx.ui(); home('profile'); };
    const l = root.querySelector('#logo'); if (l) l.onclick = () => home('games');
  }
  // Guests (accounts exist, but nobody is logged in) can play these games against the AI and on one device.
  // Everything else, plus online matches and the rankings, needs a free account.
  const GUEST_GAMES = ['c4', 'ttt', 'ships', 'dots', 'reaction', 'pong'];
  const guest = () => !!(V.cloud && V.cloud.available() && !V.cloud.user());
  const locked = g => !!g && guest() && !GUEST_GAMES.includes(g.id);
  V.guest = guest; V.locked = locked;
  // account button in the header: name when logged in, otherwise "Gast · Anmelden"
  function acctChip() {
    if (!V.cloud || !V.cloud.available()) return '';
    const u = V.cloud.user();
    return `<button class="acct${u ? ' in' : ' guest'}" id="acct" title="Konto">${IC.user}<span>${u ? u.username : 'Gast'}</span>${u ? '' : '<em>Anmelden</em>'}</button>`;
  }
  function refreshAcct() {
    const a = document.getElementById('acct'); if (!a) return;
    const t = document.createElement('div'); t.innerHTML = acctChip(); const n = t.firstElementChild;
    if (n) { a.replaceWith(n); n.onclick = () => { V.sfx.ui(); home('profile'); }; }
  }
  function toggleSound() {
    settings.sound = !settings.sound; saveSettings(); V.sfx.ui();
    if (V.music) V.music.apply();
    const s = document.getElementById('snd'); if (s) s.innerHTML = settings.sound ? IC.sound : IC.mute;
    toast(settings.sound ? 'Ton an' : 'Ton aus');
  }

  // ---------- home ----------
  // The home shell (header + tab bar) stays on screen; switching tabs only swaps the content below it.
  function home(tab, sel) {
    if (sel) selected = sel;
    if (!selected) selected = V.byId[S.get('recent')] || V.games[0];
    const prev = homeTab; if (tab) homeTab = tab;
    const shell = view === 'home' && !current && app.querySelector('.view.home');
    if (shell) return swapTab(shell, prev);
    destroyCurrent(); view = 'home';
    if (V.cloud) V.cloud.touch(null);
    const tabs = `<nav class="tabs" aria-label="Bereiche"><i class="tab-ind"></i>${TABS.map(([id, l, ic]) => `<button data-tab="${id}" class="${homeTab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`).join('')}</nav>`;
    const v = mount(`<div class="view home">${header(tabs.replace('class="tabs"', 'class="tabs desk"'))}<div class="hbody">${tabBody()}</div>${tabs.replace('class="tabs"', 'class="tabs bar"')}</div>`);
    wireHeader(v);
    v.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== homeTab) { V.sfx.ui(); home(b.dataset.tab); } });
    placeInd(v, false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(v, false));
    wireBody(v.querySelector('.hbody'));
  }
  function offlineTab() {
    return `<section class="page"><div class="empty">${IC.wifioff}<b>Du bist offline</b><p>Freunde, Herausforderungen und Ranglisten brauchen Internet. Gegen die KI oder zu zweit an einem Gerät kannst du trotzdem spielen.</p><button class="btn primary" data-tab="games"><span>Zu den Spielen</span></button></div></section>`;
  }
  function tabBody() { return homeTab === 'online' && navigator.onLine === false ? offlineTab() : homeTab === 'stats' ? statsTab() : homeTab === 'opts' ? optsTab() : homeTab === 'profile' ? (V.account ? V.account.tab() : '') : homeTab === 'online' ? (V.online ? V.online.tab() : '') : gamesTab(); }
  function wireBody(b) {
    wireInstall(b);
    if (homeTab === 'games') wireGames(b);
    if (homeTab === 'opts') wireOpts(b);
    if (homeTab === 'profile' && V.account) V.account.wire(b);
    if (homeTab === 'online' && V.online) V.online.wire(b);
    b.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { V.sfx.ui(); home(x.dataset.tab); });
  }
  // slide the highlight of the active tab to its new place
  function placeInd(root, anim) {
    root.querySelectorAll('.tabs').forEach(n => {
      const ind = n.querySelector('.tab-ind'), on = n.querySelector('button.on');
      if (!ind || !on || !on.offsetWidth) return;
      ind.style.transition = anim && V.fxOn() ? '' : 'none';
      ind.style.width = on.offsetWidth + 'px';
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
    });
  }
  function swapTab(shell, prev) {
    const body = shell.querySelector('.hbody');
    const order = id => TABS.findIndex(t => t[0] === id);
    const dir = Math.sign(order(homeTab) - order(prev));
    shell.querySelectorAll('.tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === homeTab));
    placeInd(shell, true);
    const put = () => {
      body.innerHTML = tabBody();
      queueGuard();
      body.classList.remove('leave');
      if (dir && V.fxOn()) { body.style.setProperty('--dir', dir); V.fx.pop(body, 'tab-in'); }
      wireBody(body);
    };
    if (!dir || !V.fxOn()) return put();
    body.style.setProperty('--dir', dir);
    body.classList.remove('tab-in'); body.classList.add('leave');
    setTimeout(() => { window.scrollTo(0, 0); put(); }, 130);
  }

  function gamesTab() {
    const recent = S.get('recent', null), rg = recent && V.byId[recent];
    const rc = rg && loadCfg(rg);
    const list = V.games.filter(g => homeFilter === 'Alle' || g.cat === homeFilter);
    return `<div class="select">
      <section class="sel-main">
        <div class="sel-head">
          <h1 class="title"><span>Wähl dein</span> Duell</h1>
          <p class="tagline">${V.games.length} Spiele für zwei bis vier an einem Gerät. Oder du gegen die KI in vier Stufen.</p>
        </div>
        ${installCard()}
        ${rg && !locked(rg) ? `<button class="cont" id="cont" style="--acc:${rg.accent || 'var(--pink)'}"><div class="ic">${rg.icon}</div><div class="ct"><small>Weiterspielen</small><b>${rg.name}</b><span>${rc.mode === 'local' ? 'Zu zweit' : 'Gegen KI · ' + V.LEVELS[rc.level]}</span></div><span class="go">${IC.play}</span></button>` : ''}
        <div class="chips" role="tablist">${['Alle', ...V.CATS].map(c => `<button role="tab" data-f="${c}" class="${homeFilter === c ? 'on' : ''}">${c}</button>`).join('')}</div>
        <div class="tiles">${list.map(tile).join('')}</div>
      </section>
      <aside class="sel-panel" id="panel"></aside>
    </div>`;
  }
  function wireGames(v) {
    wireTiles(v.querySelector('.tiles'));
    v.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
      homeFilter = b.dataset.f; V.sfx.ui();
      v.querySelectorAll('.chips button').forEach(x => x.classList.toggle('on', x === b));
      const tl = v.querySelector('.tiles');
      tl.innerHTML = V.games.filter(g => homeFilter === 'Alle' || g.cat === homeFilter).map(tile).join('');
      wireTiles(tl);
    });
    const c = v.querySelector('#cont');
    if (c) c.onclick = () => { const g = V.byId[S.get('recent')]; V.sfx.ui(); play(g, loadCfg(g)); };
    if (wide()) renderPanel(v.querySelector('#panel'), selected, false);
  }
  function selectTile(g) {
    selected = g;
    app.querySelectorAll('.tile').forEach(t => t.classList.toggle('sel', t.dataset.id === g.id));
    const p = app.querySelector('#panel'); if (p) renderPanel(p, g, false);
  }
  function wireTiles(root) {
    root.querySelectorAll('.tile').forEach(t => {
      const g = V.byId[t.dataset.id];
      // Laptop: a click only selects the game; the round starts with the Spielen button or Enter.
      t.onclick = () => {
        if (!wide()) { V.sfx.ui(); return setup(g); }
        if (selected === g && t.classList.contains('sel')) return;
        V.sfx.ui(); selectTile(g);
      };
      t.addEventListener('focus', () => { if (wide() && selected !== g) selectTile(g); });
    });
  }
  function tile(g, i) {
    const s = stats[g.id];
    const w = s ? s.ai.reduce((a, r) => a + r.w, 0) : 0, l = s ? s.ai.reduce((a, r) => a + r.l, 0) : 0;
    const loc = s ? s.local.a + s.local.b + s.local.d : 0;
    const played = s && (s.ai.reduce((a, r) => a + r.w + r.l + r.d, 0) + loc) > 0;
    const isSel = wide() && selected && selected.id === g.id;
    const lock = locked(g);
    return `<button class="tile${isSel ? ' sel' : ''}${lock ? ' locked' : ''}" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'};--i:${i}">
      <span class="art"><span class="ic">${g.icon}</span>${lock ? `<span class="lk">${IC.lock}</span>` : ''}</span>
      <span class="tx"><b>${g.name}</b><small>${g.short}</small></span>
      <span class="meta">${lock ? '<em class="lock">Mit Konto</em>' : played ? `<em>${g.cat}</em>` : '<em class="new">Neu</em>'}${played && g.noAI ? `<em class="rec">${loc}× gespielt</em>` : played && w + l ? `<em class="rec">KI ${w}:${l}</em>` : ''}</span></button>`;
  }

  // ---------- game panel (desktop side panel and phone setup screen) ----------
  function loadCfg(g) {
    const saved = S.get('setup', {})[g.id] || {};
    const cfg = { mode: g.noAI ? 'local' : (saved.mode === 'online' || saved.mode === 'open') && !g.online ? 'ai' : (saved.mode || 'ai'), level: saved.level ?? 1, first: saved.first || 'me', opts: {} };
    (g.options || []).forEach(o => { cfg.opts[o.id] = saved.opts && saved.opts[o.id] !== undefined ? saved.opts[o.id] : o.def; });
    return cfg;
  }
  function saveCfg(g, cfg) { const all = S.get('setup', {}); all[g.id] = cfg; S.set('setup', all); }
  let panelApi = null;
  function renderPanel(root, g, full) {
    const cfg = loadCfg(g), s = stat(g.id);
    // options can be limited to some modes (e.g. the chess clock makes no sense against the AI)
    const optsHere = (g.options || []).filter(o => !o.modes || o.modes.includes(cfg.mode));
    const firstLabel = g.firstLabels || ['Du', 'KI', 'Zufall'];
    const chipRow = (id, label, items, val) => `<div class="crow"><span>${label}</span><div class="mini-seg" id="${id}">${items.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
    const lvl = cfg.level;
    // Same game: only the settings part is redrawn, the card, icon and text stay as they are.
    // Other game: the card stays too, only icon and text change with a short crossfade.
    let gp = root.querySelector('.gp');
    if (!gp || root.dataset.gid !== g.id) {
      const fresh = !gp;
      if (fresh) { root.innerHTML = '<div class="gp"><div class="gp-art"><span class="cat"></span><span class="icw"><span class="ic"></span></span></div><div class="gp-txt"><h2></h2><p></p></div><div class="gp-body"></div></div>'; gp = root.firstElementChild; }
      root.dataset.gid = g.id;
      gp.style.setProperty('--acc', g.accent || 'var(--pink)');
      gp.querySelector('.cat').textContent = g.cat;
      gp.querySelector('.ic').innerHTML = g.icon;
      gp.querySelector('h2').textContent = g.name;
      gp.querySelector('.gp-txt p').textContent = g.desc;
      if (V.fxOn()) { V.fx.pop(gp, fresh ? 'gp-new' : 'gp-sw'); clearTimeout(gp._t); gp._t = setTimeout(() => gp.classList.remove('gp-new', 'gp-sw'), 450); }
    }
    if (locked(g)) {
      const ok = GUEST_GAMES.map(id => V.byId[id] && V.byId[id].name).filter(Boolean);
      gp.querySelector('.gp-body').innerHTML = `<div class="gp-lock"><span class="lki">${IC.lock}</span><div><b>Mit Konto spielbar</b>
        <p>Als Gast kannst du ${ok.slice(0, -1).join(', ')} und ${ok[ok.length - 1]} spielen. Mit einem kostenlosen Konto sind alle ${V.games.length} Spiele frei, dazu Online-Partien, Freunde und die Rangliste.</p></div></div>
        <div class="gp-go"><button class="btn primary big" id="acc"><span>${IC.user}Konto erstellen</span></button><button class="btn ghost" id="tut"><span>${IC.book}Regeln</span></button></div>`;
      const rer = () => renderPanel(root, g, full);
      root.querySelector('#acc').onclick = () => { V.sfx.ui(); home('profile'); };
      root.querySelector('#tut').onclick = () => tutorial(g, rer);
      panelApi = { g, go() { home('profile'); }, tut() { tutorial(g, rer); }, level() { }, step() { }, mode() { } };
      return;
    }
    gp.querySelector('.gp-body').innerHTML = `
      <div class="gp-mode${g.online && V.cloud && V.cloud.available() ? ' four' : ''}" id="mode">
        ${g.noAI ? '' : `<button data-v="ai" class="${cfg.mode === 'ai' ? 'on' : ''}">${IC.robot}<span>Gegen KI</span></button>`}
        <button data-v="local" class="${cfg.mode === 'local' ? 'on' : ''}">${IC.users}<span>Zu zweit</span></button>
        ${g.online && V.cloud && V.cloud.available() ? `<button data-v="online" class="${cfg.mode === 'online' ? 'on' : ''}${guest() ? ' lockd' : ''}">${guest() ? IC.lock : IC.user}<span>Freund</span></button>
        <button data-v="open" class="${cfg.mode === 'open' ? 'on' : ''}${guest() ? ' lockd' : ''}">${guest() ? IC.lock : IC.globe}<span>Online</span></button>` : ''}
      </div>
      ${cfg.mode === 'ai' ? `<div class="gp-lvl">
        <div class="lv-top"><span>Stärke</span><b class="l${lvl}">${V.LEVELS[lvl]}</b><em>Bilanz ${s.ai[lvl].w}:${s.ai[lvl].l}</em></div>
        <div class="lv-bar" id="level">${V.LEVELS.map((l, i) => `<button data-v="${i}" class="${i <= lvl ? 'fill' : ''} ${i === lvl ? 'on' : ''}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
        <p class="hint">${(g.levelInfo || LEVEL_INFO)[lvl]}</p></div>` : cfg.mode === 'online' || cfg.mode === 'open' ? '<div class="gp-online" id="ofr"></div>' :`<p class="hint local">${g.localHint || `Ihr spielt abwechselnd am selben Gerät${g.cat === 'Action' ? ', jeder auf seiner Hälfte' : ''}.`}</p>`}
      ${(cfg.mode === 'ai' && !g.noFirst) || optsHere.length ? `<div class="gp-more">
        ${cfg.mode === 'ai' && !g.noFirst ? chipRow('first', g.firstTitle || 'Beginn', [['me', firstLabel[0]], ['ai', firstLabel[1]], ['rand', firstLabel[2]]], cfg.first) : ''}
        ${optsHere.map(o => chipRow('o_' + o.id, o.label, o.choices, cfg.opts[o.id])).join('')}
      </div>` : ''}
      <div class="gp-go">${cfg.mode === 'online' || cfg.mode === 'open' ? '' : `<button class="btn primary big" id="go"><span>${IC.play}Spielen</span><kbd class="only-fine">Enter</kbd></button>`}
        <button class="btn ghost" id="tut"><span>${IC.book}Regeln${seen[g.id] ? '' : '<i class="dot"></i>'}</span></button></div>`;
    const rer = () => renderPanel(root, g, full);
    const on = (id, fn) => { const e = root.querySelector('#' + id); if (e) e.querySelectorAll('button').forEach(b => b.onclick = () => { fn(b.dataset.v); saveCfg(g, cfg); V.sfx.ui(); rer(); }); };
    on('mode', x => cfg.mode = x);
    on('level', x => cfg.level = +x);
    on('first', x => cfg.first = x);
    (g.options || []).forEach(o => on('o_' + o.id, x => cfg.opts[o.id] = isNaN(+x) ? x : +x));
    const goBtn = root.querySelector('#go'); if (goBtn) goBtn.onclick = () => { saveCfg(g, cfg); play(g, cfg); };
    if (cfg.mode === 'online' && V.online) V.online.picker(root.querySelector('#ofr'), g, cfg.opts);
    if (cfg.mode === 'open' && V.online) V.online.openPanel(root.querySelector('#ofr'), g, cfg.opts);
    root.querySelector('#tut').onclick = () => tutorial(g, rer);
    panelApi = {
      g,
      go() { if (cfg.mode === 'online') return; if (cfg.mode === 'open') return V.online && V.online.seek(g, cfg.opts); saveCfg(g, cfg); play(g, cfg); },
      tut() { tutorial(g, rer); },
      level(i) { if (cfg.mode !== 'ai') return; cfg.level = Math.max(0, Math.min(3, i)); saveCfg(g, cfg); V.sfx.tick(); rer(); },
      step(d) { this.level(cfg.level + d); },
      mode() { if (g.noAI) return; cfg.mode = cfg.mode === 'ai' ? 'local' : 'ai'; saveCfg(g, cfg); V.sfx.tick(); rer(); }
    };
  }

  // phone: own setup screen with the same panel. Desktop: the panel lives next to the game grid.
  function setup(g) {
    lastGame = g;
    if (wide()) return home('games', g);
    destroyCurrent(); view = 'setup'; selected = g;
    const v = mount(`<div class="view setup" style="--acc:${g.accent || 'var(--pink)'}">
      <div class="sbar"><button class="iconbtn" id="bk" aria-label="Zurück">${IC.back}</button>${logo}<button class="iconbtn" id="snd" aria-label="Ton">${settings.sound ? IC.sound : IC.mute}</button></div>
      <div id="panel" class="sel-panel solo"></div></div>`);
    wireHeader(v);
    v.querySelector('#bk').onclick = () => home('games');
    renderPanel(v.querySelector('#panel'), g, true);
  }

  // ---------- stats and options ----------
  function statsTab() {
    const t = totals();
    const rows = V.games.map(g => {
      const s = stats[g.id]; if (!s) return '';
      const on = s.on || { w: 0, l: 0, d: 0 }, onN = on.w + on.l + on.d;
      const w = s.ai.reduce((a, r) => a + r.w, on.w), l = s.ai.reduce((a, r) => a + r.l, on.l), d = s.ai.reduce((a, r) => a + r.d, on.d), n = w + l + d;
      const loc = s.local.a + s.local.b + s.local.d;
      if (!n && !loc) return '';
      return `<div class="srow" style="--acc:${g.accent || 'var(--pink)'}"><div class="ic">${g.icon}</div>
        <div class="sm"><b>${g.name}</b>
          <div class="wbar">${n ? `<i class="w" style="flex:${w}"></i><i class="d" style="flex:${d}"></i><i class="l" style="flex:${l}"></i>` : '<i class="e"></i>'}</div>
          <div class="lv">${onN ? `<span class="lon">Online ${on.w}:${on.l}</span>` : ''}${V.LEVELS.map((lv, k) => s.ai[k].w + s.ai[k].l + s.ai[k].d ? `<span>${lv} ${s.ai[k].w}:${s.ai[k].l}</span>` : '').join('')}${loc ? `<span>Zu zweit ${loc}</span>` : ''}</div>
        </div><div class="sn"><b>${w}:${l}</b><small>${n ? Math.round(w / n * 100) + ' %' : '–'}</small></div></div>`;
    }).join('');
    return `<section class="stats page">
      <h1 class="title"><span>Deine</span> Bilanz</h1>
      <div class="kpis">
        <div class="kpi"><b>${t.total}</b><span>Partien</span></div>
        <div class="kpi"><b>${t.aiWins}</b><span>Siege gegen KI</span></div>
        <div class="kpi"><b>${t.onWins}</b><span>Online-Siege</span></div>
        <div class="kpi"><b>${t.rate} %</b><span>Siegquote</span></div>
      </div>
      <div class="slist">${rows || `<div class="empty">${IC.trophy}<b>Noch keine Partien</b><p>Spiel eine Runde, dann steht hier deine Bilanz pro Spiel: gegen die KI, online und zu zweit.</p><button class="btn primary" data-tab="games"><span>Spiel aussuchen</span></button></div>`}</div>
      ${rows ? '<div class="legend"><span><i class="w"></i>Siege</span><span><i class="d"></i>Remis</span><span><i class="l"></i>Niederlagen</span></div>' : ''}
    </section>`;
  }

  function optsTab() {
    const sw = (id, on, label, sub, ic) => `<button class="opt" id="${id}" role="switch" aria-checked="${on}">${ic}<span><b>${label}</b><small>${sub}</small></span><i class="sw ${on ? 'on' : ''}"></i></button>`;
    const slider = (k, label, val, off) => `<div class="opt ovol${off ? ' off' : ''}" data-vol="${k}"><i class="ospc"></i><span><b>Lautstärke ${label}</b><input type="range" min="0" max="100" step="5" value="${val}" style="--p:${val}%" aria-label="Lautstärke ${label}"></span><em>${val} %</em></div>`;
    const seg = (key, cur, list) => `<div class="oseg" data-k="${key}" role="radiogroup">${list.map(([v, l]) => `<button role="radio" data-v="${v}" aria-checked="${cur === v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const vibSub = !V.canVibrate ? 'Dieser Browser kann nicht vibrieren' : IOS ? 'iPhone ab iOS 18: kurzes Tippen statt Ruckeln' : 'Bei Zügen, Treffern und am Ende';
    const showVib = V.canVibrate || V.coarse;
    const u = V.cloud && V.cloud.available() && V.cloud.user();
    const appRow = standalone()
      ? `<div class="opt">${IC.phone}<span><b>Läuft als App</b><small>Versus ist auf diesem Gerät installiert</small></span></div>`
      : `<button class="opt" id="o_inst">${IC.dl}<span><b>Als App installieren</b><small>Eigenes Symbol, startet schneller, ohne Browserleiste</small></span></button>`;
    return `<section class="opts page">
      <h1 class="title"><span>Deine</span> Optionen</h1>
      <div class="ogroups">
      <div class="ogroup"><h2 class="oh">Ton und Vibration</h2>
      <div class="optlist">
        ${sw('o_snd', settings.sound, 'Ton', 'Schaltet Effekte und Musik zusammen an und aus', IC.sound)}
        ${slider('vol', 'Effekte', settings.vol, !settings.sound)}
        ${sw('o_mus', settings.music !== false, 'Musik', 'Eigene Stücke für Menü, Klassiker, Strategie und Action', IC.music)}
        ${slider('mvol', 'Musik', settings.mvol, !settings.sound || settings.music === false)}
        ${showVib ? `<div class="opt orow${V.canVibrate ? '' : ' off'}">${IC.vib}<span><b>Vibration</b><small>${vibSub}</small></span>${V.canVibrate ? `<div class="ovib">${seg('haptic', settings.haptic, [['off', 'Aus'], ['light', 'Leicht'], ['strong', 'Stark']])}<button class="btn ghost sm" id="o_vtest"><span>Testen</span></button></div>` : ''}</div>
        <p class="ohint" id="o_vhint" hidden></p>` : ''}
      </div></div>
      <div class="ogroup"><h2 class="oh">Anzeige</h2>
      <div class="optlist">
        ${sw('o_fx', settings.fx !== 'low', 'Effekte', 'Konfetti, Partikel, Animationen. Aus spart Akku.', IC.spark)}
        ${sw('o_intro', settings.intro !== false, 'Intros', 'Start-Animation und VS-Einblendung vor jeder Partie', IC.film)}
        ${sw('o_coords', settings.coords !== false, 'Koordinaten', 'Buchstaben und Zahlen am Schachbrett', IC.hash)}
        ${sw('o_hints', settings.hints !== false, 'Zughilfen', 'Zeigt, wohin du ziehen kannst (Schach, Dame, Reversi, Mühle)', IC.bulb)}
      </div></div>
      <div class="ogroup"><h2 class="oh">Spiel</h2>
      <div class="optlist">
        ${sw('o_fast', !!settings.aiFast, 'Schnelle KI', 'Die KI zieht sofort, ohne Nachdenken und Zielen', IC.bolt)}
      </div></div>
      ${V.cloud && V.cloud.available() ? `<div class="ogroup"><h2 class="oh">Online</h2>
      <div class="optlist">
        ${sw('o_open', settings.openCards !== false, 'Offene Herausforderungen', 'Einblenden, wenn jemand einen Gegner sucht', IC.globe)}
        ${u ? sw('o_stealth', !!settings.stealth, 'Online-Status verbergen', 'Freunde sehen nicht, ob und was du gerade spielst', IC.eye) : ''}
      </div></div>` : ''}
      <div class="ogroup"><h2 class="oh">App</h2>
      <div class="optlist small">
        ${appRow}
        <button class="opt" id="o_upd">${IC.sync}<span><b>Nach Updates suchen</b><small>Version ${V.VERSION || ''}</small></span></button>
      </div></div>
      <div class="ogroup"><h2 class="oh">Daten</h2>
      <div class="optlist small">
        <button class="opt" id="o_tut">${IC.book}<span><b>Tutorials wieder als neu zeigen</b></span></button>
        <button class="opt" id="o_def">${IC.redo}<span><b>Einstellungen zurücksetzen</b></span></button>
        <button class="opt danger" id="o_rst">${IC.x}<span><b>Bilanz löschen</b></span></button>
      </div></div>
      </div>
      <p class="about">Versus ${V.VERSION || ''} · ohne Werbung. KI und Spiele zu zweit laufen auch offline.<span class="only-fine"> Taste <kbd>?</kbd> zeigt alle Kürzel.</span></p>
    </section>`;
  }
  function wireOpts(v) {
    const flip = (id, fn) => { const b = v.querySelector('#' + id); if (b) b.onclick = () => { const on = fn(); b.setAttribute('aria-checked', on); b.querySelector('.sw').classList.toggle('on', on); saveSettings(); V.sfx.ui(); }; };
    const dimSliders = () => {
      v.querySelector('[data-vol=vol]').classList.toggle('off', !settings.sound);
      v.querySelector('[data-vol=mvol]').classList.toggle('off', !settings.sound || settings.music === false);
    };
    flip('o_snd', () => {
      settings.sound = !settings.sound; const s = document.getElementById('snd'); if (s) s.innerHTML = settings.sound ? IC.sound : IC.mute;
      dimSliders(); V.music.apply();
      return settings.sound;
    });
    flip('o_mus', () => { settings.music = settings.music === false; dimSliders(); setTimeout(() => V.music.apply(), 0); return settings.music; });
    v.querySelectorAll('[data-vol]').forEach(row => {
      const k = row.dataset.vol, r = row.querySelector('input'), out = row.querySelector('em');
      r.oninput = () => { settings[k] = +r.value; r.style.setProperty('--p', r.value + '%'); out.textContent = r.value + ' %'; if (k === 'mvol') V.music.apply(); };
      r.onchange = () => { saveSettings(); if (k === 'vol') V.sfx.place(); };
    });
    v.querySelectorAll('.oseg').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      settings[g.dataset.k] = b.dataset.v; saveSettings();
      g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      V.sfx.ui();
      if (g.dataset.k === 'haptic') V.buzz([40, 60, 40]);
    }));
    // a long test pulse; if nothing is felt, the phone itself is muting web vibration (silent mode, do not disturb, intensity 0)
    const vt = v.querySelector('#o_vtest');
    if (vt) vt.onclick = () => {
      let ok = true;
      if (navigator.vibrate) { try { ok = navigator.vibrate([350, 120, 350]); } catch (e) { ok = false; } } else V.buzz(20);
      const h = v.querySelector('#o_vhint'); h.hidden = false;
      h.innerHTML = !ok ? 'Der Browser hat die Vibration blockiert. Tipp einmal irgendwo auf die Seite und versuch es nochmal.'
        : IOS ? 'Nichts gespürt? Auf dem iPhone geht das erst ab iOS 18 und nur, wenn unter Einstellungen → Töne & Haptik die <b>Systemhaptik</b> an ist.'
        : 'Nichts gespürt? Android schluckt Vibrationen von Webseiten, wenn das Handy auf <b>Lautlos</b> oder <b>Nicht stören</b> steht. Stell auf Ton oder Vibrieren und schau unter Einstellungen → Töne und Vibration → <b>Vibrationsintensität</b>, dass <b>Berührung</b> und <b>Benachrichtigungen</b> nicht auf 0 stehen.';
    };
    flip('o_fx', () => { settings.fx = settings.fx === 'low' ? 'full' : 'low'; applyFxClass(); return settings.fx !== 'low'; });
    flip('o_intro', () => (settings.intro = settings.intro === false));
    flip('o_coords', () => { settings.coords = settings.coords === false; applyFxClass(); return settings.coords; });
    flip('o_hints', () => { settings.hints = settings.hints === false; applyFxClass(); return settings.hints; });
    flip('o_fast', () => (settings.aiFast = !settings.aiFast));
    flip('o_open', () => (settings.openCards = settings.openCards === false));
    // hiding the online status is stored on the server, so friends see it too
    const st = v.querySelector('#o_stealth');
    if (st) st.onclick = async () => {
      const on = !settings.stealth;
      try { await V.cloud.rpc('set_stealth', { hide: on }); }
      catch (e) { toast('Geht erst nach dem nächsten Server-Update'); return; }
      settings.stealth = on; saveSettings(); V.sfx.ui();
      st.setAttribute('aria-checked', on); st.querySelector('.sw').classList.toggle('on', on);
    };
    const inst = v.querySelector('#o_inst'); if (inst) inst.onclick = () => { V.sfx.ui(); install(); };
    v.querySelector('#o_upd').onclick = () => { V.sfx.ui(); checkUpdate(); };
    v.querySelector('#o_tut').onclick = () => { seen = {}; S.set('seen', seen); toast('Alle Tutorials sind wieder neu'); };
    const sure = (b, fn) => b.onclick = () => {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.querySelector('b').textContent = 'Sicher? Nochmal tippen'; return; }
      fn();
    };
    sure(v.querySelector('#o_def'), () => {
      const keep = settings.stealth;
      Object.keys(settings).forEach(k => delete settings[k]); Object.assign(settings, DEFAULTS, { stealth: keep }); saveSettings(); applyFxClass(); V.music.apply();
      const s = document.getElementById('snd'); if (s) s.innerHTML = IC.sound;
      toast('Einstellungen zurückgesetzt'); home('opts');
    });
    sure(v.querySelector('#o_rst'), () => { stats = {}; S.set('stats', stats); toast('Bilanz gelöscht'); home('opts'); });
  }

  // ---------- modal ----------
  let modalEl = null, modalClose = null, modalKeys = null;
  function openModal(html, cls = '', onClose = null, reuse = false, keys = null) {
    modalKeys = keys;
    if (reuse && modalEl) {
      modalClose = onClose;
      const m = modalEl.firstElementChild; m.style.animation = 'none'; m.className = 'modal ' + cls; m.innerHTML = html;
      return m;
    }
    modalClose = null; closeModal(); modalKeys = keys;
    modalClose = onClose;
    modalEl = V.el('div', 'modal-back' + (cls ? ' mb-' + cls : ''));
    modalEl.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    modalEl.addEventListener('pointerdown', e => { if (e.target === modalEl && cls !== 'endm') closeModal(); });
    document.body.appendChild(modalEl);
    nav.hide();
    queueGuard();
    return modalEl.firstElementChild;
  }
  function closeModal() {
    if (!modalEl) return;
    const el = modalEl; modalEl = null; modalKeys = null;
    queueGuard();
    el.classList.add('out'); setTimeout(() => el.remove(), V.fxOn() ? 160 : 0);
    const f = modalClose; modalClose = null; if (f) f();
  }
  V.openModal = openModal; V.closeModal = closeModal;

  function toast(text) {
    const t = V.el('div', 'toast', text);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 1500); setTimeout(() => t.remove(), 1900);
  }
  V.toast = toast;
  // grey placeholder bars while something loads from the server
  V.skel = (n = 3) => `<div class="skel" aria-label="Lädt">${'<i></i>'.repeat(n)}</div>`;

  // offline: a small note at the top; AI and two-player games keep working, online parts wait
  function netState(fromEvent) {
    const off = navigator.onLine === false;
    document.documentElement.classList.toggle('offline', off);
    let p = document.getElementById('offpill');
    if (off && !p) { p = V.el('div', 'offpill', `${IC.wifioff}<span><b>Offline</b> · KI und Spiele zu zweit gehen weiter</span>`); p.id = 'offpill'; document.body.appendChild(p); }
    if (!off && p) { p.classList.add('out'); setTimeout(() => p.remove(), 250); }
    if (fromEvent && view === 'home' && homeTab === 'online') home('online');
    if (fromEvent && !off) toast('Wieder online');
  }
  addEventListener('offline', () => netState(true));
  addEventListener('online', () => netState(true));

  function tutorial(g, onDone) {
    let i = 0;
    const steps = g.tutorial;
    let done = false;
    function finish() {
      if (done) return; done = true;
      seen[g.id] = 1; S.set('seen', seen); closeModal(); onDone && onDone();
    }
    function render(dir) {
      const st = steps[i];
      const m = openModal(`<div class="tut ${dir ? 'go' + dir : ''}">
        <div class="tk"><span>${g.name}</span><b>${i + 1}/${steps.length}</b></div>
        <h3>${st.t}</h3>
        ${st.demo ? `<div class="demo">${st.demo}</div>` : ''}
        <p class="txt">${st.d}</p>
        <div class="nav"><button class="btn ghost sm" id="tp"><span>${i ? 'Zurück' : 'Schließen'}</span></button>
          <div class="dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('')}</div>
          <button class="btn sm ${i === steps.length - 1 ? 'primary' : ''}" id="tn"><span>${i === steps.length - 1 ? 'Verstanden' : 'Weiter'}</span></button></div></div>`, 'tutm', () => finish(), true, e => {
        if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { next(); return true; }
        if (e.key === 'ArrowLeft') { prev(); return true; }
        return false;
      });
      m.querySelector('#tp').onclick = prev;
      m.querySelector('#tn').onclick = next;
      let sx = null;
      m.onpointerdown = e => { sx = e.clientX; };
      m.onpointerup = e => { if (sx != null && Math.abs(e.clientX - sx) > 60 && !e.target.closest('button')) { e.clientX < sx ? next() : prev(); } sx = null; };
    }
    function next() { V.sfx.tick(); if (i < steps.length - 1) { i++; render('r'); } else finish(); }
    function prev() { V.sfx.tick(); if (i) { i--; render('l'); } else finish(); }
    render();
  }

  // first start: three short slides about what Versus is (shown once, like a tutorial)
  V.welcomeDue = () => !seen._welcome;
  function welcome() {
    if (seen._welcome) return;
    const icons = ['c4', 'chess', 'ships', 'ttt', 'pong', 'reversi'].map(id => V.byId[id] ? `<i style="--k:${'c4,chess,ships,ttt,pong,reversi'.split(',').indexOf(id)}">${V.byId[id].icon}</i>` : '').join('');
    const mode = (ic, b, s) => `<div class="wmode">${ic}<b>${b}</b><small>${s}</small></div>`;
    tutorial({
      id: '_welcome', name: 'Willkommen',
      tutorial: [
        { t: 'Willkommen bei Versus', demo: `<div class="wicons">${icons}</div>`, d: `<b>${V.games.length} Spiele für zwei</b>: Klassiker wie 4 Gewinnt und Schach, Strategie und schnelle Action-Duelle. Gemacht für eine schnelle Runde zwischendurch mit Freunden.` },
        { t: 'Drei Arten zu spielen', demo: `<div class="wmodes">${mode(IC.robot, 'KI', '4 Stufen')}${mode(IC.users, 'Zu zweit', 'ein Gerät')}${mode(IC.globe, 'Online', 'mit Freunden')}</div>`, d: '<b>Gegen die KI</b> von Anfänger bis Profi, <b>zu zweit</b> an einem Handy, oder <b>online</b> gegen Freunde. Die Rangliste startet jeden Montag neu.' },
        { t: 'Leg los', demo: `<div class="wmodes">${mode(IC.help, 'Tutorial', 'in jedem Spiel')}${mode(IC.user, 'Konto', 'kostenlos')}${mode(IC.dl, 'App', 'installierbar')}</div>`, d: 'Jedes Spiel erklärt sich beim ersten Mal selbst. Als Gast spielst du sofort los; mit einem Konto sind alle Spiele, Freunde und Online-Partien dabei.' }
      ]
    });
  }

  // ---------- keyboard board cursor ----------
  // A glowing frame that jumps between the items of a board with the arrow keys; Enter/Space clicks the item.
  const nav = (function () {
    let getItems = null, idx = -1, active = false, opts = {};
    let cur = null;
    function frame() {
      if (!cur) { cur = V.el('div', 'kcur'); document.body.appendChild(cur); }
      return cur;
    }
    function items() { return getItems ? getItems().filter(Boolean) : []; }
    function rect(el) { return el.getBoundingClientRect(); }
    function apply(anim = true) {
      const c = frame();
      const it = items();
      if (!active || !it.length || modalEl) { c.classList.remove('on'); return; }
      if (idx < 0 || idx >= it.length) idx = Math.floor(it.length / 2);
      const r = rect(it[idx]), pad = opts.pad ?? 3;
      c.classList.toggle('round', !!opts.round);
      c.style.transition = anim ? '' : 'none';
      c.style.transform = `translate(${r.left - pad}px,${r.top - pad}px)`;
      c.style.width = r.width + pad * 2 + 'px'; c.style.height = r.height + pad * 2 + 'px';
      c.classList.add('on');
      if (opts.onFocus) opts.onFocus(it[idx], idx);
    }
    function move(dx, dy) {
      const it = items(); if (!it.length) return false;
      if (!active) { active = true; if (idx < 0) idx = opts.start ? opts.start(it) : Math.floor(it.length / 2); apply(false); return true; }
      const r0 = rect(it[idx]), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
      let best = -1, bs = Infinity;
      it.forEach((el, i) => {
        if (i === idx) return;
        const r = rect(el), vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy;
        const along = vx * dx + vy * dy; if (along <= 2) return;
        const perp = Math.abs(vx * dy - vy * dx), sc = along + perp * 2.2;
        if (sc < bs) { bs = sc; best = i; }
      });
      if (best >= 0) { idx = best; apply(); V.sfx.tick(); }
      return true;
    }
    function activate() {
      const it = items(); if (!active || !it[idx]) return false;
      it[idx].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      setTimeout(() => apply(), 0); setTimeout(() => apply(), 380);
      return true;
    }
    window.addEventListener('pointerdown', () => { if (active) { active = false; apply(); } }, true);
    window.addEventListener('resize', () => apply(false));
    window.addEventListener('scroll', () => apply(false), { passive: true });
    return {
      set(fn, o = {}) { getItems = fn; opts = o; idx = -1; apply(); },
      reset() { getItems = null; active = false; idx = -1; opts = {}; if (cur) cur.classList.remove('on'); },
      hide() { if (cur) cur.classList.remove('on'); },
      refresh() { if (active) requestAnimationFrame(() => apply()); },
      move, activate, get active() { return active; }, get has() { return items().length > 0; }
    };
  })();
  V.nav = nav;

  // ---------- AI crosshair ----------
  const aim = (function () {
    let el = null;
    const get = () => { if (!el) { el = V.el('div', 'aim'); document.body.appendChild(el); } return el; };
    return {
      to(target, real, label) {
        const e = get();
        e.dataset.label = label || 'KI';
        const r = target.getBoundingClientRect(), p = 4, fresh = !e.classList.contains('on');
        if (fresh) e.style.transition = 'none';
        e.style.transform = `translate(${r.left - p}px,${r.top - p}px)`;
        e.style.width = r.width + p * 2 + 'px'; e.style.height = r.height + p * 2 + 'px';
        e.classList.toggle('real', !!real); e.classList.remove('lock');
        if (fresh) { void e.offsetWidth; e.style.transition = ''; }
        e.classList.add('on');
      },
      lock() { const e = get(); e.classList.remove('lock'); void e.offsetWidth; e.classList.add('lock'); },
      hide() { if (el) el.classList.remove('on', 'real', 'lock'); }
    };
  })();

  // ---------- VS intro before each match ----------
  function vsIntro(left, right, quick) {
    if (!V.fxOn() || settings.intro === false) return;
    const el = V.el('div', 'vsi' + (quick ? ' quick' : ''), `
      <div class="vsi-l"><div class="vsi-n"><small>${left.sub}</small><b>${left.name}</b></div></div>
      <div class="vsi-r"><div class="vsi-n"><small>${right.sub}</small><b>${right.name}</b></div></div>
      <div class="vsi-vs">VS</div><div class="vsi-flash"></div>`);
    document.body.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    el.addEventListener('pointerdown', kill);
    setTimeout(() => V.sfx.place(), quick ? 120 : 260);
    setTimeout(kill, quick ? 650 : 1150);
  }

  // ---------- play ----------
  let playApi = null;
  let rematchCarry = null;
  // quick reactions in online matches (ids are checked by the server)
  const EMO = { gg: 'GG', wow: '😮', haha: '😂', oops: '🙈', think: '🤔', fire: '🔥', clap: '👏', sweat: '😅' };
  // Modes: 'ai' (vs. computer), 'local' (two players, one device), 'online' (vs. a friend over the server),
  // 'watch' (admins follow or replay a match). A remote player is handled like the AI: the game calls
  // ctx.aiTurn() and gets the move from the network instead of from a search.
  function play(g, cfg, series) {
    let rematch = !!series;
    const clockMin = g.id === 'chess' && cfg.mode !== 'ai' && [3, 5, 10].includes(+(cfg.opts && cfg.opts.clock)) ? +cfg.opts.clock : 0;
    if (cfg.mode !== 'watch' && (locked(g) || (guest() && (cfg.mode === 'online' || cfg.mode === 'open')))) { toast('Dafür brauchst du ein Konto'); return home('profile'); }
    destroyCurrent(); view = 'play'; lastGame = g; selected = g;
    const online = cfg.mode === 'online', watch = cfg.mode === 'watch', M = cfg.match || {};
    if (!watch) S.set('recent', g.id);
    if (V.cloud) V.cloud.touch(g.id);
    // an online rematch keeps the score between the same two players (sides may have swapped)
    if (online && !series && rematchCarry && rematchCarry.opp === M.opp) { series = { [M.side]: rematchCarry.me, [3 - M.side]: rematchCarry.them, d: rematchCarry.d }; rematch = true; }
    rematchCarry = null;
    series = series || { 1: 0, 2: 0, d: 0 };
    const ai = cfg.mode === 'ai';
    // Party games (g.party): 2-4 players (option "n"). You are always player 1; every other seat is
    // a computer player against the AI, or a person at the same device.
    const party = !!g.party, N = party ? Math.max(2, Math.min(4, +(cfg.opts && cfg.opts.n) || 2)) : 2, SIDES = [1, 2, 3, 4].slice(0, N);
    if (party) SIDES.forEach(s => { if (series[s] == null) series[s] = 0; });
    const aiSide = party ? 0 : ai ? (cfg.first === 'me' ? 2 : cfg.first === 'ai' ? 1 : (Math.random() < 0.5 ? 1 : 2)) : 0;
    const mySide = online ? M.side : 0;
    const oppSide = ai ? aiSide : online ? 3 - mySide : 0;
    setSwap(oppSide === 1);
    const L = oppSide ? 3 - oppSide : 1, R = 3 - L;
    const sideLabel = s => g.sides ? g.sides[s] : V.colorName(s);
    const names = { 1: 'Spieler 1', 2: 'Spieler 2', 3: 'Spieler 3', 4: 'Spieler 4' };
    if (ai && party) SIDES.forEach(s => { names[s] = s === 1 ? 'Du' : N > 2 ? 'KI ' + (s - 1) : 'KI'; });
    else if (ai) { names[aiSide] = 'KI'; names[3 - aiSide] = 'Du'; }
    const me = ai ? (party ? 1 : 3 - aiSide) : online ? mySide : 0;
    const botSide = s => ai && (party ? s !== 1 : s === aiSide);
    if (online) { names[mySide] = 'Du'; names[oppSide] = M.opp; }
    if (watch) { names[M.aSide] = M.aName; names[3 - M.aSide] = M.bName; }
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const sub = s => sideLabel(s) + (s === 1 && g.cat !== 'Action' ? ' · beginnt' : '');
    const av = s => ai ? (botSide(s) ? IC.robot : '<span>DU</span>') : online ? (s === mySide ? '<span>DU</span>' : `<span>${esc(names[s].slice(0, 2).toUpperCase())}</span>`) : watch ? `<span>${esc(names[s].slice(0, 2).toUpperCase())}</span>` : `<span>P${s}</span>`;
    const thinker = s => botSide(s) || (online && s === oppSide) || watch;
    const card = (s, pos) => `<div class="pcard pcard-${pos} ps${s}" id="pl${s}"><span class="av">${av(s)}</span>
      <span class="nm"><b>${esc(names[s])}</b><small>${sub(s)}${botSide(s) ? ' · ' + V.LEVELS[cfg.level] : ''}</small></span>
      ${clockMin ? `<span class="clk" id="ck${s}"></span>` : ''}<span class="wins"><b>${series[s]}</b><small>Siege</small></span><em class="tag">am Zug</em>
      ${thinker(s) ? '<span class="tdots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}${ai && s === aiSide ? '<div class="bubble" aria-live="polite"></div>' : ''}</div>`;
    const sublabel = party ? (ai ? `Gegen ${N > 2 ? N - 1 + ' KIs' : 'KI'} · ` + V.LEVELS[cfg.level] : N + ' Spieler') : ai ? 'Gegen KI · ' + V.LEVELS[cfg.level] : online ? 'Online gegen ' + esc(M.opp) : watch ? 'Zuschauen · ' + esc(M.aName) + ' gegen ' + esc(M.bName) : 'Zu zweit';
    const v = mount(`<div class="view play${online ? ' net' : ''}${watch ? ' watch' : ''}" style="--acc:${g.accent || 'var(--pink)'}">
      <div class="pbar"><button class="iconbtn" id="pb" aria-label="Zurück">${IC.back}</button><div class="ttl"><b>${g.name}</b><small>${sublabel}</small></div>
        <button class="iconbtn" id="ph" aria-label="Regeln" title="Regeln (T)">${IC.help}</button>
        ${online ? `<button class="iconbtn" id="pe" aria-label="Reaktion senden" title="Reaktion">${IC.smile}</button>` : ''}
        ${online ? `<button class="iconbtn" id="pr" aria-label="Aufgeben" title="Aufgeben">${IC.flag}</button>` : watch ? '' : `<button class="iconbtn" id="pr" aria-label="Neu starten" title="Neue Partie (N)">${IC.redo}</button>`}</div>
      <div class="duel${party ? ' party n' + N : ''}">
        ${party ? `<div class="pcol pcol-l">${SIDES.filter(s => s % 2).map(s => card(s, 'l')).join('')}</div><div class="pcol pcol-r">${SIDES.filter(s => !(s % 2)).map(s => card(s, 'r')).join('')}</div>` : `${card(L, 'l')}
        <div class="score" id="sc"><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b></div>
        ${card(R, 'r')}`}
        <div class="center"><div class="status" id="st" aria-live="polite"></div><div class="stage" id="stage"></div></div>
      </div></div>`);
    const stEl = v.querySelector('#st'), pls = {};
    SIDES.forEach(s => { pls[s] = v.querySelector('#pl' + s); });
    const timers = new Set(), cleanups = [];
    let alive = true, ended = false, keyFn = null, lastTurn = 0, lastNote = '', moodBand = 0, bubbleT = null;
    const LINES = {
      3: ['Ich sehe den Sieg.', 'Gleich ist es vorbei.', 'Das war’s wohl.'],
      2: ['Läuft für mich.', 'Gefällt mir.', 'Nicht schlecht, oder?'],
      0: ['Mal sehen.', 'Interessant.', 'Okay.', 'Hm.', 'Dein Zug.'],
      '-2': ['Hmm, knifflig.', 'Du spielst gut.', 'Das wird eng.'],
      '-3': ['Oh nein.', 'Das sieht übel aus.', 'Respekt.']
    };
    function speak(note, mood) {
      const b = ai && pls[aiSide] && pls[aiSide].querySelector('.bubble'); if (!b) return;
      let line = '';
      if (typeof mood === 'number') {
        const band = mood >= 0.97 ? 3 : mood > 0.45 ? 2 : mood <= -0.97 ? -3 : mood < -0.45 ? -2 : 0;
        if (band !== moodBand || Math.random() < (band ? 0.35 : 0.18)) line = V.pick(LINES[band]);
        moodBand = band;
      } else if (Math.random() < 0.2) line = V.pick(LINES[0]);
      if (!note && !line) { b.classList.remove('on'); return; }
      b.innerHTML = (note ? `<b>${note}</b>` : '') + (line ? `<span>${line}</span>` : '');
      b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
      clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.remove('on'), 3000);
    }
    cleanups.push(() => { clearTimeout(bubbleT); aim.hide(); });
    const setStatus = html => {
      if (stEl.innerHTML === html) return;
      stEl.innerHTML = html; if (V.fxOn()) V.fx.pop(stEl, 'st-in');
    };
    let net = null;
    let clock = null;
    const remote = s => watch || (online && (s === oppSide || (net && net.queue.length > 0)));
    const ctx = {
      stage: v.querySelector('#stage'), mode: cfg.mode, level: cfg.level, aiSide, opts: cfg.opts, sides: g.sides, n: N, players: SIDES,
      mySide, watchSides: watch ? { a: M.aSide } : null,
      isAI: s => botSide(s) || remote(s),
      name: s => names[s],
      who(s) { return `<span class="c${s}">${esc(names[s])}</span>`; },
      alive: () => alive,
      later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; },
      onCleanup(fn) { cleanups.push(fn); },
      status: setStatus,
      turn(s, html) {
        if (clock) clock.turn(s);
        SIDES.forEach(k => pls[k].classList.toggle('on', s === k));
        if (s && s !== lastTurn && V.fxOn()) V.fx.pop(pls[s], 'pcard-in');
        lastTurn = s;
        const note = s && oppSide && s !== oppSide && lastNote ? `${ctx.who(oppSide)}: ${lastNote} · ` : '';
        if (html !== false) setStatus(note + (html || (names[s] === 'Du' ? '<span class="c' + s + '">Du</span> bist dran' : `${ctx.who(s)} ist dran`)));
        nav.refresh();
      },
      // Every move goes through here (all modes). Online, your own moves are sent to the server.
      moved(s, m) { if (net) net.moved(s, m); },
      // One AI move with a bit of theatre: think (min. time per level), let the crosshair hover over
      // a couple of alternatives, lock on the real target(s), then move and comment in the bubble.
      // o.think() -> { move, mood? }, o.targets(move) -> [elements], o.decoys(move) -> [elements],
      // o.apply(move), o.say(move) -> short text, o.quick -> follow-up move (e.g. extra turn) with less delay,
      // o.decode(raw) -> legal move or null (online: turns the received move back into the game's own form)
      aiTurn(o) {
        if (net) return net.take(o);
        const s = o.side || aiSide, card = pls[s];
        card.classList.add('thinking');
        setStatus(`<span class="c${s}">${esc(names[s])}</span> <span class="thinking">${o.quick ? 'macht weiter' : 'denkt'}</span>`);
        const minT = settings.aiFast ? 160 : o.quick ? 380 : [650, 850, 1050, 1250][cfg.level] + Math.random() * 450;
        const t0 = performance.now();
        ctx.later(() => {
          const res = o.think();
          ctx.later(() => aimAt(o, res, card, true, false, party ? s : 0), Math.max(0, minT - (performance.now() - t0)));
        }, 70);
      },
      think(fn, ms = 380) { setStatus(`<span class="c${aiSide}">KI</span> <span class="thinking">denkt</span>`); ctx.later(fn, ms); },
      nav(fn, o) { nav.set(fn, o); },
      keys(fn) { keyFn = fn; },
      end(winner, note, fromServer) {
        if (ended || !alive) return; ended = true;
        SIDES.forEach(k => pls[k].classList.remove('on'));
        nav.hide();
        if (net && online && !fromServer) net.finish(winner);
        if (net) { if (online) net.after = true; else net.stop(); }
        if (!watch) {
          const s = stat(g.id);
          if (ai) { const r = s.ai[cfg.level]; if (winner === 0) r.d++; else if (winner === me) r.w++; else r.l++; }
          else if (online) { s.on = s.on || { w: 0, l: 0, d: 0 }; if (winner === 0) s.on.d++; else if (winner === mySide) s.on.w++; else s.on.l++; }
          else { if (winner === 0) s.local.d++; else if (winner === 1) s.local.a++; else s.local.b++; }
          S.set('stats', stats);
        }
        if (winner === 0) series.d++; else series[winner]++;
        const sc = v.querySelector('#sc'); if (sc) { sc.innerHTML = `<b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b>`; V.fx.pop(sc, 'fx-pop'); }
        SIDES.forEach(k => { const b = pls[k].querySelector('.wins b'); if (b.textContent !== String(series[k])) { b.textContent = series[k]; V.fx.pop(b, 'fx-pop'); } });
        const meWon = me && winner === me;
        const good = winner && (!me || meWon);
        if (good) { V.sfx.win(); setTimeout(() => V.fx.confetti(), 250); }
        else if (winner) { V.sfx.lose(); V.fx.shake(ctx.stage); }
        const big = winner === 0 ? 'Remis' : me ? (meWon ? 'Sieg!' : 'Niederlage') : `${names[winner]} gewinnt`;
        setStatus(winner === 0 ? 'Unentschieden' : me ? (meWon ? '<span class="c' + winner + '">Du hast gewonnen</span>' : `${ctx.who(winner)} hat gewonnen`) : `${ctx.who(winner)} gewinnt`);
        const tone = winner === 0 ? 'draw' : me ? (meWon ? 'win' : 'lose') : party ? 'w' + winner : (winner === L ? 'left' : 'right');
        const again = () => online ? net.rematch(series) : play(g, cfg, series);
        const menu = () => watch ? V.account.admin('matches') : setup(g);
        ctx.later(() => {
          const m = openModal(`<div class="ko ${tone}">
            <div class="band"><div class="band-in"><span class="kicker">${esc(note || sublabel)}${online && net && net.last && net.last.ranked === false ? ' · zählt nicht für die Rangliste' : ''}</span>
              <h2 aria-label="${esc(big)}">${[...big].map((ch, k) => `<span aria-hidden="true" style="--k:${k}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</h2></div></div>
            ${party ? `<div class="eparty">${SIDES.map(k => `<span class="ep c${k}"><b>${series[k]}</b><small>${esc(names[k])}</small></span>`).join('')}</div>` : `<div class="eseries"><span class="nl">${esc(names[L])}</span><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b><span class="nr">${esc(names[R])}</span></div>`}
            ${series.d ? `<p class="small">${series.d}× unentschieden</p>` : ''}
            ${online ? `<div class="kemo" id="kemo"></div><div class="kquick">${['gg', 'clap', 'haha', 'sweat'].map(e => `<button data-emo="${e}">${EMO[e]}</button>`).join('')}</div>` : ''}
            ${online && V.online.friendOf(M.opp) === false ? `<button class="btn ghost sm efr" id="efr"><span>${IC.plus}${esc(M.opp)} als Freund hinzufügen</span></button>` : ''}
            <div class="actions">${watch ? '' : `<button class="btn primary" id="er"><span>${IC.redo}${online ? 'Revanche anfragen' : 'Revanche'}</span><kbd class="only-fine">Enter</kbd></button>`}<button class="btn" id="eb"><span>Brett ansehen</span></button><button class="btn ghost" id="em"><span>${watch ? 'Zurück' : 'Menü'}</span></button></div></div>`, 'endm', null, false, e => {
            if ((e.key === 'Enter' || e.key === 'n' || e.key === 'N') && !watch) { again(); return true; }
            if (e.key === 'Escape') { closeModal(); return true; }
            if (e.key === 'm' || e.key === 'M') { menu(); return true; }
            return false;
          });
          const er = m.querySelector('#er'); if (er) er.onclick = again;
          m.querySelectorAll('[data-emo]').forEach(b => b.onclick = () => sendEmote(b.dataset.emo));
          const efr = m.querySelector('#efr');
          if (efr) efr.onclick = () => V.online.request(M.opp).then(r => { efr.disabled = true; efr.querySelector('span').textContent = r === 'accepted' || r === 'friends' ? 'Ihr seid jetzt Freunde' : 'Anfrage gesendet'; }, e => toast(e.message));
          if (online && net) net.rematchUI();
          m.querySelector('#eb').onclick = closeModal;
          m.querySelector('#em').onclick = menu;
        }, g.endDelay ?? 1150);
      }
    };
    // crosshair, then the move (shared by the AI and remote players)
    function aimAt(o, res, card, isAI, fast, who) {
      const tg = (o.targets ? o.targets(res.move) : []).filter(Boolean);
      let path = [];
      if (isAI && o.decoys && !o.quick && !settings.aiFast) path = V.shuffle((o.decoys(res.move) || []).filter(x => x && !tg.includes(x))).slice(0, V.rand(3));
      path = path.concat(tg);
      const done = () => {
        aim.hide(); if (card) card.classList.remove('thinking');
        lastNote = o.say ? o.say(res.move) : '';
        if (isAI) speak(lastNote, res.mood);
        o.apply(res.move);
      };
      if (!V.fxOn() || !path.length || fast) return done();
      let i = 0;
      const step = () => {
        if (i >= path.length) { aim.lock(); return ctx.later(done, 170); }
        const real = i >= path.length - tg.length;
        aim.to(path[i], real, who ? names[who] : 'KI'); i++;
        if (!real) V.sfx.tick();
        ctx.later(step, real ? 240 : 190);
      };
      step();
    }

    // ---------- network (online and watch) ----------
    if (online || watch) {
      net = {
        queue: [], known: 0, applied: 0, waiting: null, stopped: false, last: null, chain: Promise.resolve(), offWarn: false, react: 0, fed: false, after: false, clockAt: 0, mine: null, started: false, told: null,
        feed(st) {
          if (!st) return;
          this.last = st;
          const first = st.total - st.moves.length;
          st.moves.forEach((mv, k) => {
            const idx = first + k;
            if (idx < this.known) return;
            this.known = idx + 1;
            if (idx < this.applied) return;
            this.queue.push(mv);
          });
          if (online) {
            const oppOn = st.role === 'a' ? st.b_online : st.a_online;
            pls[oppSide].classList.toggle('off', !oppOn);
            if (!oppOn && !ended && st.status === 'live' && !this.offWarn) { this.offWarn = true; toast(names[oppSide] + ' ist gerade nicht erreichbar'); }
            if (oppOn) this.offWarn = false;
          }
          if (st.clock) this.clockAt = performance.now();
          (st.reacts || []).forEach(r => { if (r.id <= this.react) return; this.react = r.id; if (this.fed && (watch || r.side !== mySide)) showEmote(r.side, r.e); });
          this.fed = true;
          if (this.after) this.rematchUI();
          if (this.readyCb && st.fleets_ready) { const f = this.readyCb; this.readyCb = null; f(st); }
          this.pump(); this.checkEnd();
        },
        // the game waits for the next move of a remote side
        take(o) { this.waiting = o; const s = this.queue.length ? this.queue[0].s : oppSide; if (pls[s]) pls[s].classList.add('thinking'); this.pump(); },
        pump() {
          if (!this.waiting || !this.queue.length) return;
          const o = this.waiting, mv = this.queue.shift(); this.waiting = null;
          const m = o.decode ? o.decode(mv.m) : mv.m;
          if (m == null || m === undefined) return this.illegal();
          const fast = this.queue.length > 0;
          ctx.later(() => aimAt(o, { move: m }, pls[mv.s], false, fast, mv.s), fast ? 120 : 60);
        },
        moved(s, m) {
          this.applied++;
          if (online && s === mySide && this.applied > this.known) this.send(m, this.applied - 1);
        },
        send(m, ply) {
          this.chain = this.chain.then(() => V.cloud.rpc('match_move', { mid: M.id, ply, mv: m }))
            .then(n => { this.known = Math.max(this.known, n); })
            .catch(e => { if (!alive) return; toast(/desync/.test(e.message) ? 'Partie wird neu geladen' : 'Zug nicht gesendet: ' + e.message); ctx.later(() => V.online.resume(M.id), 900); });
        },
        finish(w) {
          const n = this.applied;
          this.chain = this.chain.then(() => V.cloud.rpc('match_finish', { mid: M.id, ply: n, w }))
            .then(st => { if (st && st.status === 'void') toast('Die Partie wurde annulliert (Ergebnisse passten nicht zusammen).'); }, () => { });
        },
        checkEnd() {
          const st = this.last;
          if (!st || ended || st.status === 'live' || st.status === 'invited' || this.queue.length || (watch && st.total > this.applied)) return;
          const w = st.status === 'void' ? 0 : st.winner_side || 0;
          const loser = w ? names[3 - w] : '';
          const me = online && w && 3 - w === mySide;
          const note = st.status === 'void' ? 'Partie annulliert' : st.result === 'resign' ? (me ? 'Du hast aufgegeben' : loser + ' hat aufgegeben') : st.result === 'time' ? (me ? 'Deine Zeit ist abgelaufen' : loser + ': Zeit abgelaufen') : st.result === 'abandon' ? (me ? 'Du hast die Partie verlassen' : loser + ' hat die Partie verlassen') : '';
          if (st.status === 'void' || st.result === 'resign' || st.result === 'abandon' || st.result === 'time' || watch) ctx.end(w, note, true);
        },
        illegal() { if (online) V.cloud.rpc('match_report', { mid: M.id, why: 'illegal move' }).catch(() => { }); toast('Ungültiger Zug empfangen, die Partie wird annulliert.'); ctx.end(0, 'Partie annulliert', true); },
        poll() {
          if (this.stopped || !alive) return;
          V.cloud.rpc('match_state', { mid: M.id, since: this.known })
            .then(st => { if (alive) this.feed(st); }, () => { })
            .then(() => { if (!this.stopped && alive) ctx.later(() => this.poll(), watch || this.after ? 1500 : 1000); });
        },
        stop() { this.stopped = true; },
        // Rematch: whoever asks first invites, the other one accepts by asking too. Score carries over.
        async rematch(series) {
          if (this.started) return;
          rematchCarry = { opp: M.opp, me: series[mySide], them: series[oppSide], d: series.d };
          try {
            const st = await V.cloud.rpc('match_rematch', { mid: M.id });
            if (st.status === 'live') { this.started = true; closeModal(); return V.online.start(st); }
            this.mine = st.id; this.rematchUI();
          } catch (e) {
            if (/match_rematch|function/i.test(e.message)) return V.online.invite(M.opp, g, cfg.opts);
            rematchCarry = null; toast(e.message); V.sfx.bad();
          }
        },
        rematchUI() {
          const r = this.last && this.last.rematch, btn = document.querySelector('.ko #er span');
          if (!r || this.started) return;
          if (r.status === 'live' && (r.id === this.mine || r.from === M.opp)) {
            if (r.id !== this.mine) return;
            this.started = true; closeModal(); return V.online.resume(r.id);
          }
          const set = (txt, cls) => { if (!btn) return; btn.innerHTML = IC.redo + txt; btn.parentNode.classList.toggle('pulse', cls === 'pulse'); btn.parentNode.classList.toggle('waiting', cls === 'wait'); };
          if (r.status === 'invited' && r.from === M.opp) {
            set('Revanche annehmen', 'pulse');
            if (this.told !== r.id) { this.told = r.id; toast(M.opp + ' will eine Revanche!'); V.sfx.goal(); }
          } else if (r.status === 'invited' && r.id === this.mine) set('Warte auf ' + esc(M.opp) + ' …', 'wait');
          else if (r.id === this.mine && r.status !== 'invited') {
            this.mine = null; set('Revanche anfragen', '');
            toast(r.status === 'declined' ? M.opp + ' möchte keine Revanche' : 'Keine Antwort auf die Revanche');
          }
        }
      };
      // Schiffe versenken: fleets and shots are handled by the server (fleets stay secret)
      ctx.net = {
        state: () => net.last,
        fleet: f => V.cloud.rpc('match_fleet', { mid: M.id, f }).then(st => { net.feed(st); return st; }),
        whenReady(cb) { net.readyCb = cb; if (net.last && net.last.fleets_ready) { net.readyCb = null; cb(net.last); } },
        async shot(i) {
          const ply = net.applied; net.applied++;
          try { const r = await V.cloud.rpc('match_shot', { mid: M.id, ply, cell: i }); net.known = Math.max(net.known, r.n); return r; }
          catch (e) { net.applied--; throw e; }
        }
      };
      net.feed(M.init);
      ctx.later(() => net.poll(), 800);
      cleanups.push(() => {
        net.stopped = true;
        // leaving while my rematch request is still open withdraws it
        if (net.mine && !net.started) V.cloud.rpc('match_cancel', { mid: net.mine }).catch(() => { });
      });
    }

    // ---------- reactions ----------
    function showEmote(s, e) {
      if (!EMO[e] || !pls[s]) return;
      const b = V.el('span', 'emo' + (e === 'gg' ? ' txt' : ''), EMO[e]); pls[s].appendChild(b); setTimeout(() => b.remove(), 2600);
      const k = document.querySelector('.ko #kemo');
      if (k) { const t = V.el('span', 'kemo-i', `<b>${EMO[e]}</b><small>${esc(names[s])}</small>`); k.appendChild(t); setTimeout(() => t.remove(), 2600); }
      V.sfx.tick();
    }
    let emoT = 0;
    function sendEmote(e) {
      if (!online || !net || performance.now() - emoT < 1000) return;
      emoT = performance.now(); showEmote(mySide, e);
      V.cloud.rpc('match_react', { mid: M.id, e }).catch(() => { });
    }
    const pe = v.querySelector('#pe');
    if (pe) {
      let pick = null;
      const close = () => { if (pick) { pick.remove(); pick = null; } };
      pe.onclick = ev => {
        ev.stopPropagation(); V.sfx.ui();
        if (pick) return close();
        pick = V.el('div', 'emopick', Object.keys(EMO).map(e => `<button data-e="${e}">${EMO[e]}</button>`).join(''));
        v.querySelector('.pbar').appendChild(pick);
        pick.querySelectorAll('button').forEach(b => b.onclick = x => { x.stopPropagation(); sendEmote(b.dataset.e); close(); });
      };
      const outside = ev => { if (pick && !pick.contains(ev.target)) close(); };
      document.addEventListener('pointerdown', outside); cleanups.push(() => document.removeEventListener('pointerdown', outside));
    }

    // ---------- chess clock ----------
    // Local: counted here (paused while a dialog is open). Online and watching: computed from the server's move times.
    if (clockMin) {
      const left = { 1: clockMin * 60000, 2: clockMin * 60000 }, els = { 1: v.querySelector('#ck1'), 2: v.querySelector('#ck2') };
      let run = 0, lastT = performance.now(), flagT = 0;
      const fmt = ms => { ms = Math.max(0, ms); if (ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      clock = {
        turn(s) {
          if (net || ended) return;
          const t = performance.now(); if (run && !modalEl) left[run] -= t - lastT; lastT = t;
          if (run && s && s !== run) left[run] += 2000;
          run = s;
        }
      };
      const tick = () => {
        if (!alive) return;
        const now = performance.now();
        let show = left, on = run;
        if (net) {
          const c = net.last && net.last.clock;
          if (!c) return;
          const el = c.live && !ended ? now - net.clockAt : 0;
          show = { 1: c[1] - (c.turn === 1 ? el : 0), 2: c[2] - (c.turn === 2 ? el : 0) }; on = c.live && !ended ? c.turn : 0;
          if (online && on && show[on] <= 0 && now - flagT > 2500) { flagT = now; V.cloud.rpc('match_flag', { mid: M.id }).catch(() => { }); }
        } else if (!ended) {
          if (run && !modalEl) left[run] -= now - lastT;
          lastT = now;
          if (run && left[run] <= 0) { left[run] = 0; const s = run; run = 0; ctx.end(3 - s, names[s] + ': Zeit abgelaufen'); }
        } else on = 0;
        [1, 2].forEach(s => { const e = els[s]; if (!e) return; e.textContent = fmt(show[s]); e.classList.toggle('run', s === on); e.classList.toggle('low', show[s] < 20000); });
      };
      const iv = setInterval(tick, 100); cleanups.push(() => clearInterval(iv)); tick();
    }

    let inst = null;
    current = {
      destroy() {
        alive = false; timers.forEach(clearTimeout); timers.clear();
        cleanups.forEach(f => { try { f(); } catch (e) { } });
        if (inst && inst.destroy) try { inst.destroy(); } catch (e) { }
      }
    };
    function leave(to) {
      if (ended || watch) return to();
      if (inst && inst.pause) inst.pause();
      const m = openModal(online
        ? `<div class="confirm"><h3>Aufgeben?</h3><p>Wenn du die Partie verlässt, gewinnt ${esc(M.opp)}.</p>
          <div class="actions"><button class="btn primary" id="cy"><span>Weiterspielen</span></button><button class="btn ghost danger" id="cn"><span>Aufgeben</span></button></div></div>`
        : `<div class="confirm"><h3>Partie verlassen?</h3><p>Der Stand geht verloren und zählt nicht in der Bilanz.</p>
          <div class="actions"><button class="btn primary" id="cy"><span>Weiterspielen</span></button><button class="btn ghost" id="cn"><span>Verlassen</span></button></div></div>`,
        '', () => { if (inst && inst.resume && alive) inst.resume(); }, false, e => {
          if (e.key === 'Enter') { closeModal(); return true; }
          return false;
        });
      m.querySelector('#cy').onclick = closeModal;
      m.querySelector('#cn').onclick = () => {
        modalClose = null; closeModal();
        if (online) { V.cloud.rpc('match_resign', { mid: M.id }).catch(() => { }); if (to === null) return ctx.end(oppSide, 'Du hast aufgegeben', true); }
        if (to) to();
      };
    }
    const tut = () => { if (inst && inst.pause) inst.pause(); tutorial(g, () => { if (inst && inst.resume && alive) inst.resume(); }); };
    v.querySelector('#pb').onclick = () => leave(() => watch ? V.account.admin('matches') : setup(g));
    const pr = v.querySelector('#pr');
    if (pr) pr.onclick = () => online ? leave(null) : leave(() => play(g, cfg, series));
    v.querySelector('#ph').onclick = tut;
    playApi = {
      key(e) { return keyFn ? keyFn(e) : false; },
      back() { leave(() => watch ? V.account.admin('matches') : setup(g)); },
      restart() { if (!online && !watch) leave(() => play(g, cfg, series)); },
      tut
    };
    if (party && N > 2) vsIntro({ name: names[1], sub: sideLabel(1) }, { name: ai ? N - 1 + ' KIs' : 'Alle', sub: ai ? V.LEVELS[cfg.level] : N + ' Spieler' }, rematch);
    else vsIntro({ name: names[L], sub: sideLabel(L) }, { name: names[R], sub: ai ? 'KI · ' + V.LEVELS[cfg.level] : online ? 'online' : sideLabel(R) }, rematch || watch);
    inst = g.start(ctx) || {};
  }

  // ---------- keyboard ----------
  let lastGame = null;
  function showKeys() {
    const row = (k, d) => `<div class="krow"><span>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</span><p>${d}</p></div>`;
    const m = openModal(`<div class="keys"><h3>Tastenkürzel</h3>
      <h4>Überall</h4>${row('?', 'Diese Übersicht')}${row('M', 'Ton an oder aus')}${row('Esc', 'Zurück oder schließen')}
      <h4>Spielauswahl</h4>${row('← → ↑ ↓', 'Spiel wählen')}${row('Enter', 'Spielen')}${row('1 2 3 4', 'KI-Stärke')}${row('S', 'Gegen KI oder zu zweit')}${row('T', 'Regeln')}
      <h4>Im Spiel</h4>${row('← → ↑ ↓', 'Cursor über das Brett')}${row('Enter Leertaste', 'Feld wählen oder setzen')}${row('N', 'Neue Partie')}${row('T', 'Regeln')}
      ${lastGame && lastGame.keys ? `<h4>${lastGame.name}</h4>${lastGame.keys.map(k => row(k[0], k[1])).join('')}` : ''}
      <div class="actions"><button class="btn" id="kx"><span>Schließen</span></button></div></div>`, 'keysm');
    m.querySelector('#kx').onclick = closeModal;
  }

  function spatial(list, dx, dy) {
    const a = document.activeElement, i = list.indexOf(a);
    if (i < 0) { const s = list.find(t => t.classList.contains('sel')) || list[0]; if (s) s.focus(); return; }
    const r0 = a.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = Infinity;
    list.forEach(el => {
      if (el === a) return;
      const r = el.getBoundingClientRect(), vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy;
      const along = vx * dx + vy * dy; if (along <= 2) return;
      const sc = along + Math.abs(vx * dy - vy * dx) * 2.2; if (sc < bs) { bs = sc; best = el; }
    });
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', behavior: V.fxOn() ? 'smooth' : 'auto' }); V.sfx.tick(); }
  }
  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.matches && e.target.matches('input,textarea,select')) return;
    const k = e.key;
    if (modalEl) {
      if (modalKeys && modalKeys(e)) { e.preventDefault(); return; }
      if (k === 'Escape') { e.preventDefault(); closeModal(); }
      return;
    }
    if (k === '?') { e.preventDefault(); showKeys(); return; }
    if ((k === 'm' || k === 'M') && !e.repeat) { toggleSound(); return; }
    const panelKeys = () => {
      if (!panelApi || !app.querySelector('#panel .gp')) return false;
      if (/^[1-4]$/.test(k)) { panelApi.level(+k - 1); return true; }
      if (k === 's' || k === 'S') { panelApi.mode(); return true; }
      if (k === 't' || k === 'T') { panelApi.tut(); return true; }
      return false;
    };
    if (view === 'home') {
      if (homeTab !== 'games') return;
      if (DIRS[k]) { e.preventDefault(); spatial([...app.querySelectorAll('.tile')], ...DIRS[k]); return; }
      if (wide() && panelKeys()) { e.preventDefault(); return; }
      if (k === 'Enter' && wide() && panelApi) {
        const f = document.activeElement;
        if (f && f.tagName === 'BUTTON' && !f.classList.contains('tile')) return;
        e.preventDefault(); panelApi.go();
      }
      return;
    }
    if (view === 'setup') {
      if (panelKeys()) { e.preventDefault(); return; }
      const onBtn = document.activeElement && document.activeElement.tagName === 'BUTTON' && app.contains(document.activeElement);
      if (k === 'Enter' && !onBtn && panelApi) { e.preventDefault(); panelApi.go(); return; }
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); if (panelApi) panelApi.step(k === 'ArrowLeft' ? -1 : 1); return; }
      if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); home(); return; }
      return;
    }
    if (view === 'admin') { if (k === 'Escape') { e.preventDefault(); home('profile'); } return; }
    if (view === 'play' && playApi) {
      if (playApi.key(e)) { e.preventDefault(); return; }
      if (k === 'Escape') { e.preventDefault(); playApi.back(); return; }
      if ((k === 'n' || k === 'N') && !e.repeat) { playApi.restart(); return; }
      if ((k === 't' || k === 'T') && !e.repeat) { playApi.tut(); return; }
      if (DIRS[k] && nav.has) { e.preventDefault(); nav.move(...DIRS[k]); return; }
      if ((k === 'Enter' || k === ' ') && !e.repeat) {
        if (nav.active && nav.activate()) { e.preventDefault(); return; }
        const b = app.querySelector('[data-enter]'); if (b) { e.preventDefault(); b.click(); return; }
        if (nav.has) { e.preventDefault(); nav.move(0, 0); }
      }
    }
  });

  // switching between phone and laptop layout re-renders the menus
  wideMQ.addEventListener && wideMQ.addEventListener('change', () => {
    if (view === 'home') home();
    else if (view === 'setup' && wide()) home('games', selected);
  });

  // ---------- app: install, updates, back button ----------
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  let installEvt = null, swReg = null, swWaiting = null, wantReload = false;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; refreshInstall(); });
  window.addEventListener('appinstalled', () => { installEvt = null; S.set('noInstall', true); refreshInstall(); toast('Versus ist jetzt installiert'); });
  // the install card on the games tab: only where the browser offers it (or on iPhones), until dismissed
  const installOffer = () => !standalone() && !S.get('noInstall', false) && (!!installEvt || (IOS && V.coarse));
  function installCard() {
    return `<div class="instc" data-install${installOffer() ? '' : ' hidden'}><div class="ic">${IC.dl}</div>
      <div class="it"><b>Als App holen</b><small>Schneller Start, auch offline</small></div>
      <button class="btn primary sm" data-do="install"><span>Installieren</span></button><button class="x" data-do="noinst" aria-label="Nicht mehr anzeigen">${IC.x}</button></div>`;
  }
  function wireInstall(root) {
    root.querySelectorAll('[data-do=install]').forEach(b => b.onclick = () => { V.sfx.ui(); install(); });
    root.querySelectorAll('[data-do=noinst]').forEach(b => b.onclick = () => { V.sfx.ui(); S.set('noInstall', true); refreshInstall(); });
  }
  function refreshInstall() { document.querySelectorAll('[data-install]').forEach(n => { n.hidden = !installOffer(); }); }
  async function install() {
    if (installEvt) {
      const e = installEvt; installEvt = null;
      try { e.prompt(); const r = await e.userChoice; if (r && r.outcome === 'accepted') S.set('noInstall', true); } catch (x) { }
      return refreshInstall();
    }
    const step = (n, t) => `<li><b>${n}</b><span>${t}</span></li>`;
    const m = openModal(`<div class="confirm instm"><h3>Versus installieren</h3>
      ${IOS ? `<ol class="isteps">${step(1, `Tippe in Safari auf <em>Teilen</em> ${IC.share}`)}${step(2, 'Wähle <em>Zum Home-Bildschirm</em>')}${step(3, 'Tippe oben rechts auf <em>Hinzufügen</em>')}</ol>`
        : `<ol class="isteps">${step(1, 'Öffne das Menü deines Browsers (⋮ oder ☰)')}${step(2, 'Wähle <em>App installieren</em> oder <em>Zum Startbildschirm</em>')}${step(3, 'Bestätige mit <em>Installieren</em>')}</ol>`}
      <p>Danach startet Versus wie eine normale App von deinem Startbildschirm.</p>
      <div class="actions"><button class="btn primary" id="cy"><span>Alles klar</span></button></div></div>`);
    m.querySelector('#cy').onclick = closeModal;
  }
  function updateBar() {
    if (!swWaiting || document.querySelector('.upbar')) return;
    const bar = V.el('div', 'upbar', `${IC.sync}<span><b>Neue Version da</b><small>Kurz neu laden, dann ist sie aktiv</small></span><button class="btn primary sm"><span>Neu laden</span></button><button class="x" aria-label="Später">${IC.x}</button>`);
    document.body.appendChild(bar);
    bar.querySelector('.btn').onclick = () => {
      wantReload = true;
      try { swWaiting.postMessage('skip'); } catch (e) { }
      setTimeout(() => location.reload(), 1500);
    };
    bar.querySelector('.x').onclick = () => { bar.classList.add('out'); setTimeout(() => bar.remove(), 250); };
  }
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) { swWaiting = reg.waiting; updateBar(); }
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { swWaiting = w; updateBar(); } });
      });
    }).catch(() => { });
    // only reload when the player asked for it (the first install also changes the controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (wantReload) { wantReload = false; location.reload(); } });
    // apps stay open in the background for days; look for a new version whenever it comes back
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && swReg) swReg.update().catch(() => { }); });
  }
  async function checkUpdate() {
    if (!swReg) { toast('Lade neu …'); return setTimeout(() => location.reload(), 400); }
    toast('Suche nach Updates …');
    try { await swReg.update(); } catch (e) { return toast('Keine Verbindung'); }
    const w = swReg.installing;
    if (w) return w.addEventListener('statechange', () => { if (w.state === 'installed') { swWaiting = w; updateBar(); } });
    if (swReg.waiting) { swWaiting = swReg.waiting; return updateBar(); }
    toast('Du hast die neueste Version');
  }

  // Back button and back gesture (Android, browsers): one extra history entry stands in for "inside the app".
  // Back then closes a dialog, leaves a match (with confirmation) or goes one screen up instead of closing Versus.
  let guarded = false, skipPop = false, guardT = 0;
  const atRoot = () => !modalEl && view === 'home' && homeTab === 'games';
  function syncGuard() {
    try {
      if (!atRoot() && !guarded) { history.pushState({ versus: 1 }, ''); guarded = true; }
      else if (atRoot() && guarded) { guarded = false; skipPop = true; history.back(); }
    } catch (e) { }
  }
  const queueGuard = () => { clearTimeout(guardT); guardT = setTimeout(syncGuard, 60); };
  function backAction() {
    if (modalEl) { closeModal(); return true; }
    if (view === 'play' && playApi) { playApi.back(); return true; }
    if (view === 'admin') { home('profile'); return true; }
    if (view !== 'home') { home(); return true; }
    if (homeTab !== 'games') { home('games'); return true; }
    return false;
  }
  window.addEventListener('popstate', () => {
    if (skipPop) { skipPop = false; return; }
    guarded = false;
    backAction();
    queueGuard();
  });

  // ---------- boot ----------
  // ---------- hooks for the account and admin screens (js/account.js) and the cloud sync ----------
  V.reloadLocal = function () {
    stats = S.get('stats', {}); seen = S.get('seen', {});
    Object.assign(settings, DEFAULTS, S.get('settings', {}));
    if (settings.haptic === true) settings.haptic = 'strong'; else if (settings.haptic === false) settings.haptic = 'off';
    applyFxClass();
    if (view === 'home' && homeTab !== 'profile') home();
  };
  V.ui = {
    IC, toast, openModal, closeModal, header, wireHeader,
    home: (tab, sel) => home(tab, sel),
    play: (g, cfg, series) => play(g, cfg, series), setup: g => setup(g), wide: () => wide(),
    // full-screen view outside the home tabs (admin panel)
    show(name, html) { destroyCurrent(); view = name; const v = mount(html); wireHeader(v); return v; },
    view: () => view, tab: () => homeTab
  };
  let cloudUser = null;
  function onCloud() {
    refreshAcct();
    // logged in or out: locks, modes and the panel change, so the menus are drawn again
    const u = V.cloud.user(), id = u ? u.id : null;
    if (id !== cloudUser) {
      cloudUser = id;
      if (id && settings.stealth) V.cloud.rpc('set_stealth', { hide: true }).catch(() => { });
      if (view === 'home' && homeTab !== 'profile') return home();
      if (view === 'setup' && selected) return setup(selected);
    }
    if (view === 'home' && homeTab === 'profile' && V.account) {
      const b = app.querySelector('.hbody');
      if (b && !(document.activeElement && b.contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) home('profile');
    }
  }

  // The opening animation lives in index.html (#boot) so it shows on the very first frame.
  // Its CSS plays the slam on its own; here we only open the doors once the page is ready and at least ~1 s has passed.
  V.boot = function () {
    V.games.sort((a, b) => V.CATS.indexOf(a.cat) - V.CATS.indexOf(b.cat) || (a.order || 0) - (b.order || 0));
    applyFxClass();
    document.documentElement.classList.toggle('standalone', standalone());
    const q = new URLSearchParams(location.search), qt = q.get('tab');
    // friend link from a QR code or a message: handled by js/online.js once the login is known
    if (q.get('add')) try { sessionStorage.setItem('versus.add', q.get('add').slice(0, 12)); } catch (e) { }
    if (qt && TABS.some(t => t[0] === qt)) homeTab = qt;
    if (q.has('tab') || q.has('app') || q.has('add')) try { history.replaceState(null, '', location.pathname); } catch (e) { }
    registerSW();
    netState();
    if (!document.getElementById('fx')) { const f = V.el('div'); f.id = 'fx'; document.body.appendChild(f); }
    if (V.cloud && V.cloud.available()) { V.cloud.on(onCloud); V.cloud.init(); }
    const b = document.getElementById('boot');
    if (!b || !V.fxOn() || settings.intro === false || getComputedStyle(b).display === 'none') { if (b) b.remove(); home(); setTimeout(welcome, 300); return; }
    let opened = false;
    const open = skip => {
      if (opened) return; opened = true;
      window.removeEventListener('keydown', onKey, true);
      b.classList.add(skip ? 'skip' : 'open');
      home();
      setTimeout(welcome, skip ? 350 : 900);
      setTimeout(() => b.remove(), skip ? 260 : 800);
    };
    const onKey = e => { e.preventDefault(); e.stopPropagation(); open(true); };
    b.addEventListener('pointerdown', () => open(true));
    window.addEventListener('keydown', onKey, true);
    setTimeout(() => open(false), Math.max(0, 1250 - performance.now()));
  };
})();
