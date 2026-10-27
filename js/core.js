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
    set(k, v) { try { localStorage.setItem('versus.' + k, JSON.stringify(v)); } catch (e) { } }
  };
  const settings = V.settings = Object.assign({ sound: true, haptic: true, fx: 'full' }, S.get('settings', {}));
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
  function applyFxClass() { document.documentElement.classList.toggle('lowfx', !V.fxOn()); }

  // ---------- sound and haptics ----------
  let actx = null;
  function tone(f, d = 0.08, type = 'square', vol = 0.05, slide = 0) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { }
  }
  V.buzz = p => { if (settings.haptic && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } };
  V.sfx = {
    tick() { tone(1200, 0.025, 'square', 0.02); },
    move() { tone(520, 0.06, 'triangle', 0.07); V.buzz(8); },
    place() { tone(320, 0.1, 'triangle', 0.09, -140); V.buzz(14); },
    hit() { tone(200, 0.22, 'sawtooth', 0.06, -140); V.buzz([20, 30, 30]); },
    miss() { tone(760, 0.08, 'sine', 0.05, -320); },
    bad() { tone(130, 0.22, 'square', 0.04); V.buzz(40); },
    bounce() { tone(440, 0.04, 'square', 0.04); },
    goal() { tone(660, 0.12, 'triangle', 0.08, 300); V.buzz(30); },
    go() { tone(980, 0.12, 'square', 0.05); },
    ui() { tone(700, 0.035, 'triangle', 0.035); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.08), i * 110)); V.buzz([30, 60, 30, 60, 80]); },
    lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.07), i * 150)); V.buzz(120); }
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
    spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>')
  };

  // ---------- player colours ----------
  // You are always pink and on the left, the AI is always yellow and on the right, no matter who moves first.
  // Games paint "side 1" with --p1; when the AI plays side 1 the two colours are swapped on the root element.
  let swapped = false;
  function setSwap(on) { swapped = !!on; document.documentElement.classList.toggle('swap', swapped); }
  V.hex = s => ((s === 1) !== swapped) ? '#ff4fd8' : '#ffd84f';
  V.colorName = s => ((s === 1) !== swapped) ? 'Pink' : 'Gelb';

  // ---------- app shell ----------
  const app = document.getElementById('app');
  const wideMQ = window.matchMedia('(min-width: 960px)');
  const wide = () => wideMQ.matches;
  let current = null, view = 'home', homeTab = 'games', homeFilter = 'Alle', selected = null;
  function destroyCurrent() { if (current) { current.destroy(); current = null; } nav.reset(); closeModal(); setSwap(false); }
  function mount(html) {
    app.innerHTML = html;
    const v = app.firstElementChild;
    if (v && V.fxOn()) { v.classList.add('enter'); setTimeout(() => v.classList.remove('enter'), 900); }
    window.scrollTo(0, 0);
    return v;
  }
  function totals() {
    let total = 0, aiWins = 0, aiGames = 0, proWins = 0, draws = 0;
    for (const id in stats) {
      const s = stats[id];
      s.ai.forEach((r, i) => { aiWins += r.w; aiGames += r.w + r.l + r.d; draws += r.d; if (i === 3) proWins += r.w; });
      total += s.local.a + s.local.b + s.local.d;
    }
    total += aiGames;
    return { total, aiWins, aiGames, proWins, draws, rate: aiGames ? Math.round(aiWins / aiGames * 100) : 0 };
  }
  const TABS = [['games', 'Spiele', IC.grid], ['stats', 'Bilanz', IC.chart], ['opts', 'Optionen', IC.gear]];
  const logo = '<button class="logo" id="logo" aria-label="Versus Startseite"><span class="l1">VER</span><i class="slash"></i><span class="l2">SUS</span></button>';
  function header(extra = '') {
    return `<header class="top">${logo}${extra}
      <div class="top-r"><button class="iconbtn only-fine" id="kbd" aria-label="Tastenkürzel" title="Tastenkürzel (?)">${IC.kbd}</button>
      <button class="iconbtn" id="snd" aria-label="Ton an oder aus" title="Ton (M)">${settings.sound ? IC.sound : IC.mute}</button></div></header>`;
  }
  function wireHeader(root) {
    const s = root.querySelector('#snd'); if (s) s.onclick = toggleSound;
    const k = root.querySelector('#kbd'); if (k) k.onclick = showKeys;
    const l = root.querySelector('#logo'); if (l) l.onclick = () => home('games');
  }
  function toggleSound() {
    settings.sound = !settings.sound; saveSettings(); V.sfx.ui();
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
    const tabs = `<nav class="tabs" aria-label="Bereiche"><i class="tab-ind"></i>${TABS.map(([id, l, ic]) => `<button data-tab="${id}" class="${homeTab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`).join('')}</nav>`;
    const v = mount(`<div class="view home">${header(tabs.replace('class="tabs"', 'class="tabs desk"'))}<div class="hbody">${tabBody()}</div>${tabs.replace('class="tabs"', 'class="tabs bar"')}</div>`);
    wireHeader(v);
    v.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== homeTab) { V.sfx.ui(); home(b.dataset.tab); } });
    placeInd(v, false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(v, false));
    wireBody(v.querySelector('.hbody'));
  }
  function tabBody() { return homeTab === 'stats' ? statsTab() : homeTab === 'opts' ? optsTab() : gamesTab(); }
  function wireBody(b) {
    if (homeTab === 'games') wireGames(b);
    if (homeTab === 'opts') wireOpts(b);
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
          <p class="tagline">${V.games.length} Spiele für zwei an einem Gerät. Oder du gegen die KI in vier Stufen.</p>
        </div>
        ${rg ? `<button class="cont" id="cont" style="--acc:${rg.accent || 'var(--pink)'}"><div class="ic">${rg.icon}</div><div class="ct"><small>Weiterspielen</small><b>${rg.name}</b><span>${rc.mode === 'local' ? 'Zu zweit' : 'Gegen KI · ' + V.LEVELS[rc.level]}</span></div><span class="go">${IC.play}</span></button>` : ''}
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
      t.onclick = () => {
        V.sfx.ui();
        if (!wide()) return setup(g);
        if (selected === g && t.classList.contains('sel')) return startFromCfg(g);
        selectTile(g);
      };
      t.addEventListener('dblclick', () => { if (wide()) startFromCfg(g); });
      t.addEventListener('focus', () => { if (wide() && selected !== g) selectTile(g); });
    });
  }
  function startFromCfg(g) { play(g, loadCfg(g)); }
  function tile(g, i) {
    const s = stats[g.id];
    const w = s ? s.ai.reduce((a, r) => a + r.w, 0) : 0, l = s ? s.ai.reduce((a, r) => a + r.l, 0) : 0;
    const loc = s ? s.local.a + s.local.b + s.local.d : 0;
    const played = s && (s.ai.reduce((a, r) => a + r.w + r.l + r.d, 0) + loc) > 0;
    const isSel = wide() && selected && selected.id === g.id;
    return `<button class="tile${isSel ? ' sel' : ''}" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'};--i:${i}">
      <span class="art"><span class="ic">${g.icon}</span></span>
      <span class="tx"><b>${g.name}</b><small>${g.short}</small></span>
      <span class="meta">${played ? `<em>${g.cat}</em>` : '<em class="new">Neu</em>'}${played && g.noAI ? `<em class="rec">${loc}× gespielt</em>` : played && w + l ? `<em class="rec">KI ${w}:${l}</em>` : ''}</span></button>`;
  }

  // ---------- game panel (desktop side panel and phone setup screen) ----------
  function loadCfg(g) {
    const saved = S.get('setup', {})[g.id] || {};
    const cfg = { mode: g.noAI ? 'local' : (saved.mode || 'ai'), level: saved.level ?? 1, first: saved.first || 'me', opts: {} };
    (g.options || []).forEach(o => { cfg.opts[o.id] = saved.opts && saved.opts[o.id] !== undefined ? saved.opts[o.id] : o.def; });
    return cfg;
  }
  function saveCfg(g, cfg) { const all = S.get('setup', {}); all[g.id] = cfg; S.set('setup', all); }
  let panelApi = null;
  function renderPanel(root, g, full) {
    const cfg = loadCfg(g), s = stat(g.id);
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
    gp.querySelector('.gp-body').innerHTML = `
      <div class="gp-mode" id="mode">
        ${g.noAI ? '' : `<button data-v="ai" class="${cfg.mode === 'ai' ? 'on' : ''}">${IC.robot}<span>Gegen KI</span></button>`}
        <button data-v="local" class="${cfg.mode === 'local' ? 'on' : ''}">${IC.users}<span>Zu zweit</span></button>
      </div>
      ${cfg.mode === 'ai' ? `<div class="gp-lvl">
        <div class="lv-top"><span>Stärke</span><b class="l${lvl}">${V.LEVELS[lvl]}</b><em>Bilanz ${s.ai[lvl].w}:${s.ai[lvl].l}</em></div>
        <div class="lv-bar" id="level">${V.LEVELS.map((l, i) => `<button data-v="${i}" class="${i <= lvl ? 'fill' : ''} ${i === lvl ? 'on' : ''}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
        <p class="hint">${(g.levelInfo || LEVEL_INFO)[lvl]}</p></div>` : `<p class="hint local">Ihr spielt abwechselnd am selben Gerät${g.cat === 'Action' ? ', jeder auf seiner Hälfte' : ''}.</p>`}
      ${(cfg.mode === 'ai' && !g.noFirst) || (g.options || []).length ? `<div class="gp-more">
        ${cfg.mode === 'ai' && !g.noFirst ? chipRow('first', g.firstTitle || 'Beginn', [['me', firstLabel[0]], ['ai', firstLabel[1]], ['rand', firstLabel[2]]], cfg.first) : ''}
        ${(g.options || []).map(o => chipRow('o_' + o.id, o.label, o.choices, cfg.opts[o.id])).join('')}
      </div>` : ''}
      <div class="gp-go"><button class="btn primary big" id="go"><span>${IC.play}Spielen</span><kbd class="only-fine">Enter</kbd></button>
        <button class="btn ghost" id="tut"><span>${IC.book}Regeln${seen[g.id] ? '' : '<i class="dot"></i>'}</span></button></div>`;
    const rer = () => renderPanel(root, g, full);
    const on = (id, fn) => { const e = root.querySelector('#' + id); if (e) e.querySelectorAll('button').forEach(b => b.onclick = () => { fn(b.dataset.v); saveCfg(g, cfg); V.sfx.ui(); rer(); }); };
    on('mode', x => cfg.mode = x);
    on('level', x => cfg.level = +x);
    on('first', x => cfg.first = x);
    (g.options || []).forEach(o => on('o_' + o.id, x => cfg.opts[o.id] = isNaN(+x) ? x : +x));
    root.querySelector('#go').onclick = () => { saveCfg(g, cfg); play(g, cfg); };
    root.querySelector('#tut').onclick = () => tutorial(g, rer);
    panelApi = {
      g,
      go() { saveCfg(g, cfg); play(g, cfg); },
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
      const w = s.ai.reduce((a, r) => a + r.w, 0), l = s.ai.reduce((a, r) => a + r.l, 0), d = s.ai.reduce((a, r) => a + r.d, 0), n = w + l + d;
      const loc = s.local.a + s.local.b + s.local.d;
      if (!n && !loc) return '';
      return `<div class="srow" style="--acc:${g.accent || 'var(--pink)'}"><div class="ic">${g.icon}</div>
        <div class="sm"><b>${g.name}</b>
          <div class="wbar">${n ? `<i class="w" style="flex:${w}"></i><i class="d" style="flex:${d}"></i><i class="l" style="flex:${l}"></i>` : '<i class="e"></i>'}</div>
          <div class="lv">${V.LEVELS.map((lv, k) => `<span>${lv} ${s.ai[k].w}:${s.ai[k].l}</span>`).join('')}${loc ? `<span>Zu zweit ${loc}</span>` : ''}</div>
        </div><div class="sn"><b>${w}:${l}</b><small>${n ? Math.round(w / n * 100) + ' %' : '–'}</small></div></div>`;
    }).join('');
    return `<section class="stats page">
      <h1 class="title"><span>Deine</span> Bilanz</h1>
      <div class="kpis">
        <div class="kpi"><b>${t.total}</b><span>Partien</span></div>
        <div class="kpi"><b>${t.aiWins}</b><span>Siege gegen KI</span></div>
        <div class="kpi"><b>${t.rate} %</b><span>Siegquote</span></div>
        <div class="kpi"><b>${t.proWins}</b><span>Siege gegen Profi</span></div>
      </div>
      <div class="slist">${rows || `<div class="empty">${IC.trophy}<b>Noch keine Partien</b><p>Spiel eine Runde, dann steht hier deine Bilanz pro Spiel und KI-Stufe.</p><button class="btn primary" data-tab="games"><span>Spiel aussuchen</span></button></div>`}</div>
      ${rows ? '<div class="legend"><span><i class="w"></i>Siege</span><span><i class="d"></i>Remis</span><span><i class="l"></i>Niederlagen</span></div>' : ''}
    </section>`;
  }

  function optsTab() {
    const sw = (id, on, label, sub, ic) => `<button class="opt" id="${id}" role="switch" aria-checked="${on}">${ic}<span><b>${label}</b><small>${sub}</small></span><i class="sw ${on ? 'on' : ''}"></i></button>`;
    return `<section class="opts page">
      <h1 class="title"><span>Deine</span> Optionen</h1>
      <div class="optlist">
        ${sw('o_snd', settings.sound, 'Ton', 'Klicks, Treffer und Jubel', IC.sound)}
        ${'vibrate' in navigator ? sw('o_hap', settings.haptic, 'Vibration', 'Kurzes Ruckeln am Handy', IC.vib) : ''}
        ${sw('o_fx', settings.fx !== 'low', 'Effekte', 'Konfetti, Partikel, VS-Intro. Aus spart Akku.', IC.spark)}
      </div>
      <div class="optlist small">
        <button class="opt" id="o_tut">${IC.book}<span><b>Tutorials wieder als neu zeigen</b></span></button>
        <button class="opt danger" id="o_rst">${IC.x}<span><b>Bilanz löschen</b></span></button>
      </div>
      <p class="about">Versus ${V.VERSION || ''} · läuft komplett im Browser, ohne Konto und ohne Werbung.<span class="only-fine"> Taste <kbd>?</kbd> zeigt alle Kürzel.</span></p>
    </section>`;
  }
  function wireOpts(v) {
    const flip = (id, fn) => { const b = v.querySelector('#' + id); if (b) b.onclick = () => { const on = fn(); b.setAttribute('aria-checked', on); b.querySelector('.sw').classList.toggle('on', on); saveSettings(); V.sfx.ui(); }; };
    flip('o_snd', () => { settings.sound = !settings.sound; const s = document.getElementById('snd'); if (s) s.innerHTML = settings.sound ? IC.sound : IC.mute; return settings.sound; });
    flip('o_hap', () => { settings.haptic = !settings.haptic; V.buzz(30); return settings.haptic; });
    flip('o_fx', () => { settings.fx = settings.fx === 'low' ? 'full' : 'low'; applyFxClass(); return settings.fx !== 'low'; });
    v.querySelector('#o_tut').onclick = () => { seen = {}; S.set('seen', seen); toast('Alle Tutorials sind wieder neu'); };
    const r = v.querySelector('#o_rst');
    r.onclick = () => {
      if (!r.classList.contains('sure')) { r.classList.add('sure'); r.querySelector('b').textContent = 'Wirklich löschen? Nochmal tippen'; return; }
      stats = {}; S.set('stats', stats); toast('Bilanz gelöscht'); home('opts');
    };
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
    return modalEl.firstElementChild;
  }
  function closeModal() {
    if (!modalEl) return;
    const el = modalEl; modalEl = null; modalKeys = null;
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
      to(target, real) {
        const e = get(), r = target.getBoundingClientRect(), p = 4, fresh = !e.classList.contains('on');
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
    if (!V.fxOn()) return;
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
  function play(g, cfg, series) {
    const rematch = !!series;
    destroyCurrent(); view = 'play'; lastGame = g; selected = g;
    S.set('recent', g.id);
    series = series || { 1: 0, 2: 0, d: 0 };
    const ai = cfg.mode === 'ai';
    const aiSide = ai ? (cfg.first === 'me' ? 2 : cfg.first === 'ai' ? 1 : (Math.random() < 0.5 ? 1 : 2)) : 0;
    setSwap(ai && aiSide === 1);
    const L = ai ? 3 - aiSide : 1, R = 3 - L;
    const sideLabel = s => g.sides ? g.sides[s] : V.colorName(s);
    const names = { 1: ai ? (aiSide === 1 ? 'KI' : 'Du') : 'Spieler 1', 2: ai ? (aiSide === 2 ? 'KI' : 'Du') : 'Spieler 2' };
    const sub = s => sideLabel(s) + (s === 1 && g.cat !== 'Action' ? ' · beginnt' : '');
    const av = s => ai ? (s === aiSide ? IC.robot : '<span>DU</span>') : `<span>P${s}</span>`;
    const card = (s, pos) => `<div class="pcard pcard-${pos}" id="pl${s}"><span class="av">${av(s)}</span>
      <span class="nm"><b>${names[s]}</b><small>${sub(s)}${ai && s === aiSide ? ' · ' + V.LEVELS[cfg.level] : ''}</small></span>
      <span class="wins"><b>${series[s]}</b><small>Siege</small></span><em class="tag">am Zug</em>
      ${ai && s === aiSide ? '<span class="tdots" aria-hidden="true"><i></i><i></i><i></i></span><div class="bubble" aria-live="polite"></div>' : ''}</div>`;
    const v = mount(`<div class="view play" style="--acc:${g.accent || 'var(--pink)'}">
      <div class="pbar"><button class="iconbtn" id="pb" aria-label="Zurück">${IC.back}</button><div class="ttl"><b>${g.name}</b><small>${ai ? 'Gegen KI · ' + V.LEVELS[cfg.level] : 'Zu zweit'}</small></div>
        <button class="iconbtn" id="ph" aria-label="Regeln" title="Regeln (T)">${IC.help}</button><button class="iconbtn" id="pr" aria-label="Neu starten" title="Neue Partie (N)">${IC.redo}</button></div>
      <div class="duel">
        ${card(L, 'l')}
        <div class="score" id="sc"><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b></div>
        ${card(R, 'r')}
        <div class="center"><div class="status" id="st" aria-live="polite"></div><div class="stage" id="stage"></div></div>
      </div></div>`);
    const stEl = v.querySelector('#st'), pls = { 1: v.querySelector('#pl1'), 2: v.querySelector('#pl2') };
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
      const b = ai && pls[aiSide].querySelector('.bubble'); if (!b) return;
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
    const ctx = {
      stage: v.querySelector('#stage'), mode: cfg.mode, level: cfg.level, aiSide, opts: cfg.opts, sides: g.sides,
      isAI: s => ai && s === aiSide,
      name: s => names[s],
      who(s) { return `<span class="c${s}">${names[s]}</span>`; },
      alive: () => alive,
      later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; },
      onCleanup(fn) { cleanups.push(fn); },
      status: setStatus,
      turn(s, html) {
        pls[1].classList.toggle('on', s === 1); pls[2].classList.toggle('on', s === 2);
        if (s && s !== lastTurn && V.fxOn()) V.fx.pop(pls[s], 'pcard-in');
        lastTurn = s;
        const note = s && !ctx.isAI(s) && lastNote ? `<span class="c${aiSide}">KI:</span> ${lastNote} · ` : '';
        if (html !== false) setStatus(note + (html || (names[s] === 'Du' ? '<span class="c' + s + '">Du</span> bist dran' : ctx.isAI(s) ? '<span class="c' + s + '">KI</span> ist dran' : `${ctx.who(s)} ist dran`)));
        nav.refresh();
      },
      // One AI move with a bit of theatre: think (min. time per level), let the crosshair hover over
      // a couple of alternatives, lock on the real target(s), then move and comment in the bubble.
      // o.think() -> { move, mood? }, o.targets(move) -> [elements], o.decoys(move) -> [elements],
      // o.apply(move), o.say(move) -> short text, o.quick -> follow-up move (e.g. extra turn) with less delay
      aiTurn(o) {
        const s = aiSide, card = pls[s];
        card.classList.add('thinking');
        setStatus(`<span class="c${s}">KI</span> <span class="thinking">${o.quick ? 'macht weiter' : 'denkt'}</span>`);
        const minT = o.quick ? 380 : [650, 850, 1050, 1250][cfg.level] + Math.random() * 450;
        const t0 = performance.now();
        ctx.later(() => {
          const res = o.think();
          ctx.later(() => aimAt(res), Math.max(0, minT - (performance.now() - t0)));
        }, 70);
        function aimAt(res) {
          const tg = (o.targets ? o.targets(res.move) : []).filter(Boolean);
          let path = [];
          if (o.decoys && !o.quick) path = V.shuffle((o.decoys(res.move) || []).filter(x => x && !tg.includes(x))).slice(0, V.rand(3));
          path = path.concat(tg);
          if (!V.fxOn() || !path.length) return done(res);
          let i = 0;
          const step = () => {
            if (i >= path.length) { aim.lock(); return ctx.later(() => done(res), 170); }
            const real = i >= path.length - tg.length;
            aim.to(path[i], real); i++;
            if (!real) V.sfx.tick();
            ctx.later(step, real ? 260 : 190);
          };
          step();
        }
        function done(res) {
          aim.hide(); card.classList.remove('thinking');
          lastNote = o.say ? o.say(res.move) : '';
          speak(lastNote, res.mood);
          o.apply(res.move);
        }
      },
      think(fn, ms = 380) { setStatus(`<span class="c${aiSide}">KI</span> <span class="thinking">denkt</span>`); ctx.later(fn, ms); },
      nav(fn, o) { nav.set(fn, o); },
      keys(fn) { keyFn = fn; },
      end(winner, note) {
        if (ended || !alive) return; ended = true;
        pls[1].classList.remove('on'); pls[2].classList.remove('on');
        nav.hide();
        const s = stat(g.id);
        if (ai) { const r = s.ai[cfg.level]; if (winner === 0) r.d++; else if (winner === aiSide) r.l++; else r.w++; }
        else { if (winner === 0) s.local.d++; else if (winner === 1) s.local.a++; else s.local.b++; }
        S.set('stats', stats);
        if (winner === 0) series.d++; else series[winner]++;
        const sc = v.querySelector('#sc'); sc.innerHTML = `<b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b>`; V.fx.pop(sc, 'fx-pop');
        [1, 2].forEach(k => { const b = pls[k].querySelector('.wins b'); if (b.textContent !== String(series[k])) { b.textContent = series[k]; V.fx.pop(b, 'fx-pop'); } });
        const humanWon = ai && winner && winner !== aiSide;
        const good = winner && (!ai || humanWon);
        if (good) { V.sfx.win(); setTimeout(() => V.fx.confetti(), 250); }
        else if (winner) { V.sfx.lose(); V.fx.shake(ctx.stage); }
        const big = winner === 0 ? 'Remis' : ai ? (humanWon ? 'Sieg!' : 'Niederlage') : `${names[winner]} gewinnt`;
        setStatus(winner === 0 ? 'Unentschieden' : ai ? (humanWon ? '<span class="c' + winner + '">Du hast gewonnen</span>' : '<span class="c' + winner + '">Die KI hat gewonnen</span>') : `${ctx.who(winner)} gewinnt`);
        const tone = winner === 0 ? 'draw' : ai ? (humanWon ? 'win' : 'lose') : (winner === L ? 'left' : 'right');
        ctx.later(() => {
          const m = openModal(`<div class="ko ${tone}">
            <div class="band"><div class="band-in"><span class="kicker">${note || (ai ? 'Gegen KI · ' + V.LEVELS[cfg.level] : g.name)}</span>
              <h2 aria-label="${big}">${[...big].map((ch, k) => `<span aria-hidden="true" style="--k:${k}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</h2></div></div>
            <div class="eseries"><span class="nl">${names[L]}</span><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b><span class="nr">${names[R]}</span></div>
            ${series.d ? `<p class="small">${series.d}× unentschieden</p>` : ''}
            <div class="actions"><button class="btn primary" id="er"><span>${IC.redo}Revanche</span><kbd class="only-fine">Enter</kbd></button><button class="btn" id="eb"><span>Brett ansehen</span></button><button class="btn ghost" id="em"><span>Menü</span></button></div></div>`, 'endm', null, false, e => {
            if (e.key === 'Enter' || e.key === 'n' || e.key === 'N') { play(g, cfg, series); return true; }
            if (e.key === 'Escape') { closeModal(); return true; }
            if (e.key === 'm' || e.key === 'M') { setup(g); return true; }
            return false;
          });
          m.querySelector('#er').onclick = () => play(g, cfg, series);
          m.querySelector('#eb').onclick = closeModal;
          m.querySelector('#em').onclick = () => setup(g);
        }, g.endDelay ?? 1150);
      }
    };
    let inst = null;
    current = {
      destroy() {
        alive = false; timers.forEach(clearTimeout); timers.clear();
        cleanups.forEach(f => { try { f(); } catch (e) { } });
        if (inst && inst.destroy) try { inst.destroy(); } catch (e) { }
      }
    };
    function leave(to) {
      if (ended) return to();
      if (inst && inst.pause) inst.pause();
      const m = openModal(`<div class="confirm"><h3>Partie verlassen?</h3><p>Der Stand geht verloren und zählt nicht in der Bilanz.</p>
        <div class="actions"><button class="btn primary" id="cy"><span>Weiterspielen</span></button><button class="btn ghost" id="cn"><span>Verlassen</span></button></div></div>`, '', () => { if (inst && inst.resume && alive) inst.resume(); }, false, e => {
        if (e.key === 'Enter') { closeModal(); return true; }
        return false;
      });
      m.querySelector('#cy').onclick = closeModal;
      m.querySelector('#cn').onclick = () => { modalClose = null; closeModal(); to(); };
    }
    const tut = () => { if (inst && inst.pause) inst.pause(); tutorial(g, () => { if (inst && inst.resume && alive) inst.resume(); }); };
    v.querySelector('#pb').onclick = () => leave(() => setup(g));
    v.querySelector('#pr').onclick = () => leave(() => play(g, cfg, series));
    v.querySelector('#ph').onclick = tut;
    playApi = {
      key(e) { return keyFn ? keyFn(e) : false; },
      back() { leave(() => setup(g)); },
      restart() { leave(() => play(g, cfg, series)); },
      tut
    };
    vsIntro({ name: names[L], sub: ai ? sideLabel(L) : sideLabel(L) }, { name: names[R], sub: ai ? 'KI · ' + V.LEVELS[cfg.level] : sideLabel(R) }, rematch);
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

  // ---------- boot ----------
  // The opening animation lives in index.html (#boot) so it shows on the very first frame.
  // Its CSS plays the slam on its own; here we only open the doors once the page is ready and at least ~1 s has passed.
  V.boot = function () {
    V.games.sort((a, b) => V.CATS.indexOf(a.cat) - V.CATS.indexOf(b.cat) || (a.order || 0) - (b.order || 0));
    applyFxClass();
    if (!document.getElementById('fx')) { const f = V.el('div'); f.id = 'fx'; document.body.appendChild(f); }
    const b = document.getElementById('boot');
    if (!b || !V.fxOn() || getComputedStyle(b).display === 'none') { if (b) b.remove(); home(); return; }
    let opened = false;
    const open = skip => {
      if (opened) return; opened = true;
      window.removeEventListener('keydown', onKey, true);
      b.classList.add(skip ? 'skip' : 'open');
      home();
      setTimeout(() => b.remove(), skip ? 260 : 800);
    };
    const onKey = e => { e.preventDefault(); e.stopPropagation(); open(true); };
    b.addEventListener('pointerdown', () => open(true));
    window.addEventListener('keydown', onKey, true);
    setTimeout(() => open(false), Math.max(0, 1250 - performance.now()));
  };
})();
