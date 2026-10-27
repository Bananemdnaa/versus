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
    return best ? best.m : V.pick(g.moves(root));
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

  // ---------- app shell ----------
  const app = document.getElementById('app');
  let current = null, view = 'home', homeTab = 'games', homeFilter = 'Alle';
  function destroyCurrent() { if (current) { current.destroy(); current = null; } nav.reset(); closeModal(); }
  function mount(html) {
    app.innerHTML = html;
    const v = app.firstElementChild; if (v && V.fxOn()) v.classList.add('enter');
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
  const TABS = [['games', 'Spiele', IC.grid], ['stats', 'Statistik', IC.chart], ['opts', 'Optionen', IC.gear]];
  function header(extra = '') {
    return `<header class="top">
      <button class="logo" id="logo" aria-label="Versus Startseite"><span class="l1">VER</span><span class="l2">SUS</span></button>
      ${extra}
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

  function home(tab) {
    destroyCurrent(); view = 'home'; if (tab) homeTab = tab;
    const tabs = `<nav class="tabs" aria-label="Bereiche">${TABS.map(([id, l, ic]) => `<button data-tab="${id}" class="${homeTab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`).join('')}</nav>`;
    const body = homeTab === 'stats' ? statsTab() : homeTab === 'opts' ? optsTab() : gamesTab();
    const v = mount(`<div class="view home">${header(tabs.replace('class="tabs"', 'class="tabs desk"'))}${body}${tabs.replace('class="tabs"', 'class="tabs bar"')}</div>`);
    wireHeader(v);
    v.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== homeTab) { V.sfx.ui(); home(b.dataset.tab); } });
    if (homeTab === 'games') wireGames(v);
    if (homeTab === 'stats') wireStats(v);
    if (homeTab === 'opts') wireOpts(v);
  }

  function gamesTab() {
    const t = totals();
    const recent = S.get('recent', null), rg = recent && V.byId[recent];
    const cfgAll = S.get('setup', {}), rc = rg && cfgAll[rg.id];
    const list = V.games.filter(g => homeFilter === 'Alle' || g.cat === homeFilter);
    return `
      <section class="hero">
        <div class="hero-txt">
          <h1>Zwei Spieler.<br>Ein Gerät.<br><em>Oder du gegen die KI.</em></h1>
          <p>${V.games.length} Spiele vom Tic Tac Toe bis zum Schach, jedes mit Tutorial und KI in vier Stufen.</p>
          <div class="hero-stats"><span><b>${t.total}</b> Partien</span><span><b>${t.aiWins}</b> Siege gegen KI</span><span><b>${V.games.filter(g => seen[g.id]).length}/${V.games.length}</b> Tutorials</span></div>
        </div>
        <div class="vsfx" aria-hidden="true"><i class="vs-a"></i><i class="vs-b"></i><span>VS</span></div>
      </section>
      ${rg ? `<button class="cont" id="cont" style="--acc:${rg.accent || 'var(--p1)'}"><div class="ic">${rg.icon}</div><div class="ct"><small>Weiterspielen</small><b>${rg.name}</b><span>${rc && rc.mode === 'local' ? '2 Spieler, ein Gerät' : 'Gegen KI · ' + V.LEVELS[rc ? rc.level : 1]}</span></div><span class="go">${IC.play}</span></button>` : ''}
      <div class="chips" role="tablist">${['Alle', ...V.CATS].map(c => `<button role="tab" data-f="${c}" class="${homeFilter === c ? 'on' : ''}">${c}<i>${c === 'Alle' ? V.games.length : V.games.filter(g => g.cat === c).length}</i></button>`).join('')}</div>
      <div class="tiles">${list.map(tile).join('')}</div>
      <footer class="foot">Statistik und Einstellungen liegen nur in diesem Browser. Konten, Freunde und Online-Duelle kommen als Nächstes.</footer>`;
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
    if (c) c.onclick = () => { const g = V.byId[S.get('recent')]; const cfg = loadCfg(g); V.sfx.ui(); play(g, cfg); };
  }
  function wireTiles(root) {
    root.querySelectorAll('.tile').forEach(t => {
      t.onclick = () => { V.sfx.ui(); setup(V.byId[t.dataset.id]); };
      if (!V.coarse) {
        t.addEventListener('pointermove', e => {
          const r = t.getBoundingClientRect();
          t.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -8 + 'deg');
          t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 10 + 'deg');
          t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        });
        t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
      }
    });
  }
  function tile(g, i) {
    const s = stats[g.id];
    let rec = 'Noch nicht gespielt';
    if (s) {
      const w = s.ai.reduce((a, r) => a + r.w, 0), l = s.ai.reduce((a, r) => a + r.l, 0), loc = s.local.a + s.local.b + s.local.d;
      rec = `KI ${w}:${l}` + (loc ? ` · ${loc}× zu zweit` : '');
    }
    return `<button class="tile" data-id="${g.id}" style="--acc:${g.accent || 'var(--p1)'};--i:${i}">
      ${seen[g.id] ? '' : '<span class="chip">Neu</span>'}
      <div class="ic">${g.icon}</div><b>${g.name}</b><small>${g.short}</small><span class="rec">${rec}</span></button>`;
  }

  function statsTab() {
    const t = totals();
    const rows = V.games.map(g => {
      const s = stats[g.id]; if (!s) return '';
      const w = s.ai.reduce((a, r) => a + r.w, 0), l = s.ai.reduce((a, r) => a + r.l, 0), d = s.ai.reduce((a, r) => a + r.d, 0), n = w + l + d;
      const loc = s.local.a + s.local.b + s.local.d;
      return `<div class="srow" style="--acc:${g.accent || 'var(--p1)'}"><div class="ic">${g.icon}</div>
        <div class="sm"><b>${g.name}</b>
          <div class="wbar">${n ? `<i class="w" style="flex:${w}"></i><i class="d" style="flex:${d}"></i><i class="l" style="flex:${l}"></i>` : '<i class="e"></i>'}</div>
          <div class="lv">${V.LEVELS.map((lv, k) => `<span title="${lv}">${lv[0]} ${s.ai[k].w}:${s.ai[k].l}</span>`).join('')}${loc ? `<span>2P ${loc}</span>` : ''}</div>
        </div><div class="sn"><b>${w}:${l}</b><small>${n ? Math.round(w / n * 100) + ' %' : '–'}</small></div></div>`;
    }).join('');
    return `<section class="stats">
      <h2 class="h2">Deine Bilanz</h2>
      <div class="kpis">
        <div class="kpi"><b>${t.total}</b><span>Partien</span></div>
        <div class="kpi"><b>${t.aiWins}</b><span>Siege gegen KI</span></div>
        <div class="kpi"><b>${t.rate} %</b><span>Siegquote</span></div>
        <div class="kpi"><b>${t.proWins}</b><span>Siege gegen Profi</span></div>
      </div>
      <div class="slist">${rows || `<div class="empty">${IC.trophy}<b>Noch keine Partien</b><p>Spiel eine Runde, dann siehst du hier deine Bilanz pro Spiel und KI-Stufe.</p><button class="btn primary" data-tab="games">Spiel aussuchen</button></div>`}</div>
      ${rows ? '<div class="legend"><span><i class="w"></i>Siege</span><span><i class="d"></i>Remis</span><span><i class="l"></i>Niederlagen</span></div>' : ''}
    </section>`;
  }
  function wireStats() { }

  function optsTab() {
    const sw = (id, on, label, sub, ic) => `<button class="opt" id="${id}" role="switch" aria-checked="${on}">${ic}<span><b>${label}</b><small>${sub}</small></span><i class="sw ${on ? 'on' : ''}"></i></button>`;
    return `<section class="opts">
      <h2 class="h2">Optionen</h2>
      <div class="optlist">
        ${sw('o_snd', settings.sound, 'Ton', 'Klicks, Treffer und Jubel', IC.sound)}
        ${'vibrate' in navigator ? sw('o_hap', settings.haptic, 'Vibration', 'Kurzes Feedback am Handy', IC.vib) : ''}
        ${sw('o_fx', settings.fx !== 'low', 'Effekte', 'Konfetti, Partikel und Wackeln. Aus spart Akku.', IC.spark)}
      </div>
      <h2 class="h2">Daten</h2>
      <div class="optlist">
        <button class="opt" id="o_tut">${IC.book}<span><b>Tutorials zurücksetzen</b><small>Alle Spiele zeigen wieder den Hinweis „Neu“</small></span></button>
        <button class="opt danger" id="o_rst">${IC.x}<span><b>Statistik löschen</b><small>Setzt alle Siege und Niederlagen auf null</small></span></button>
      </div>
      <p class="about">Versus · Version ${V.VERSION || 1}. Alles läuft lokal im Browser, es gibt keine Werbung und kein Konto. Am PC zeigt die Taste <kbd>?</kbd> alle Tastenkürzel.</p>
    </section>`;
  }
  function wireOpts(v) {
    const flip = (id, fn) => { const b = v.querySelector('#' + id); if (b) b.onclick = () => { const on = fn(); b.setAttribute('aria-checked', on); b.querySelector('.sw').classList.toggle('on', on); saveSettings(); V.sfx.ui(); }; };
    flip('o_snd', () => { settings.sound = !settings.sound; const s = document.getElementById('snd'); if (s) s.innerHTML = settings.sound ? IC.sound : IC.mute; return settings.sound; });
    flip('o_hap', () => { settings.haptic = !settings.haptic; V.buzz(30); return settings.haptic; });
    flip('o_fx', () => { settings.fx = settings.fx === 'low' ? 'full' : 'low'; applyFxClass(); return settings.fx !== 'low'; });
    v.querySelector('#o_tut').onclick = () => { seen = {}; S.set('seen', seen); toast('Tutorials zurückgesetzt'); };
    const r = v.querySelector('#o_rst');
    r.onclick = () => {
      if (!r.classList.contains('sure')) { r.classList.add('sure'); r.querySelector('b').textContent = 'Wirklich löschen? Nochmal tippen'; return; }
      stats = {}; S.set('stats', stats); toast('Statistik gelöscht'); home('opts');
    };
  }

  // ---------- setup ----------
  function loadCfg(g) {
    const saved = S.get('setup', {})[g.id] || {};
    const cfg = { mode: g.noAI ? 'local' : (saved.mode || 'ai'), level: saved.level ?? 1, first: saved.first || 'me', opts: {} };
    (g.options || []).forEach(o => { cfg.opts[o.id] = saved.opts && saved.opts[o.id] !== undefined ? saved.opts[o.id] : o.def; });
    return cfg;
  }
  let setupApi = null;
  function setup(g) {
    destroyCurrent(); view = 'setup';
    const all = S.get('setup', {}), cfg = loadCfg(g);
    const save = () => { all[g.id] = cfg; S.set('setup', all); };
    function seg(id, items, val) {
      return `<div class="seg" id="${id}">${items.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    }
    let first = true;
    function render() {
      const s = stat(g.id);
      const firstLabel = g.firstLabels || ['Ich', 'KI', 'Zufall'];
      const html = `<div class="view setup" style="--acc:${g.accent || 'var(--p1)'}">
        <div class="sbar"><button class="iconbtn" id="bk" aria-label="Zurück">${IC.back}</button><span class="crumb">${g.cat}</span>
          <button class="iconbtn only-fine" id="kbd" aria-label="Tastenkürzel">${IC.kbd}</button><button class="iconbtn" id="snd" aria-label="Ton">${settings.sound ? IC.sound : IC.mute}</button></div>
        <section class="shero"><div class="sicon">${g.icon}</div><div><h1>${g.name}</h1><p>${g.desc}</p></div></section>
        ${seen[g.id] ? '' : `<div class="newbie">${IC.book}<p>Kennst du ${g.name} noch nicht? Das Tutorial erklärt alles in ein paar Schritten.</p><button class="btn sm" id="tut2">Ansehen</button></div>`}
        <div class="field"><label>Modus</label><div class="modes" id="mode">
          ${g.noAI ? '' : `<button data-v="ai" class="mode ${cfg.mode === 'ai' ? 'on' : ''}">${IC.robot}<b>Gegen KI</b><small>4 Stufen</small></button>`}
          <button data-v="local" class="mode ${cfg.mode === 'local' ? 'on' : ''}">${IC.users}<b>2 Spieler</b><small>an einem Gerät</small></button></div></div>
        ${cfg.mode === 'ai' ? `
          <div class="field"><label>Schwierigkeit</label><div class="levels" id="level">${V.LEVELS.map((l, i) => `<button data-v="${i}" class="lvl l${i} ${cfg.level === i ? 'on' : ''}"><i class="pips">${'<em></em>'.repeat(4)}</i><b>${l}</b><small>${s.ai[i].w}:${s.ai[i].l}</small></button>`).join('')}</div><p class="hint">${(g.levelInfo || LEVEL_INFO)[cfg.level]}</p></div>
          ${g.noFirst ? '' : `<div class="field"><label>${g.firstTitle || 'Wer fängt an?'}</label>${seg('first', [['me', firstLabel[0]], ['ai', firstLabel[1]], ['rand', firstLabel[2]]], cfg.first)}</div>`}` : ''}
        ${(g.options || []).map(o => `<div class="field"><label>${o.label}</label>${seg('o_' + o.id, o.choices, cfg.opts[o.id])}</div>`).join('')}
        ${g.keys ? `<div class="keyhint only-fine">${IC.kbd}<span>${g.keys.map(k => `<kbd>${k[0]}</kbd> ${k[1]}`).join(' · ')}</span></div>` : ''}
        <div class="sactions"><button class="btn primary big" id="go">${IC.play}Spielen<kbd class="only-fine">Enter</kbd></button><button class="btn" id="tut">${IC.book}Tutorial</button></div>
      </div>`;
      let v;
      if (first) { v = mount(html); first = false; }
      else { const y = window.scrollY; app.innerHTML = html; v = app.firstElementChild; window.scrollTo(0, y); }
      wireHeader(v);
      const on = (id, fn) => { const e = v.querySelector('#' + id); if (e) e.querySelectorAll('button').forEach(b => b.onclick = () => { fn(b.dataset.v); save(); V.sfx.ui(); render(); }); };
      on('mode', x => cfg.mode = x);
      on('level', x => cfg.level = +x);
      on('first', x => cfg.first = x);
      (g.options || []).forEach(o => on('o_' + o.id, x => cfg.opts[o.id] = isNaN(+x) ? x : +x));
      v.querySelector('#bk').onclick = () => home();
      v.querySelector('#go').onclick = () => { save(); play(g, cfg); };
      v.querySelector('#tut').onclick = () => tutorial(g, render);
      const t2 = v.querySelector('#tut2'); if (t2) t2.onclick = () => tutorial(g, render);
    }
    setupApi = {
      go() { save(); play(g, cfg); },
      tut() { tutorial(g, render); },
      level(d) { if (cfg.mode !== 'ai') return; cfg.level = Math.max(0, Math.min(3, cfg.level + d)); save(); V.sfx.tick(); render(); },
      mode() { if (g.noAI) return; cfg.mode = cfg.mode === 'ai' ? 'local' : 'ai'; save(); V.sfx.tick(); render(); }
    };
    render();
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
    modalEl = V.el('div', 'modal-back');
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
        <div class="tk">${g.name} · Schritt ${i + 1} von ${steps.length}</div>
        <h3>${st.t}</h3>
        ${st.demo ? `<div class="demo">${st.demo}</div>` : ''}
        <p class="txt">${st.d}</p>
        <div class="nav"><button class="btn ghost" id="tp">${i ? 'Zurück' : 'Schließen'}</button>
          <div class="dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn ${i === steps.length - 1 ? 'primary' : ''}" id="tn">${i === steps.length - 1 ? 'Verstanden' : 'Weiter'}</button></div></div>`, 'tutm', () => finish(), true, e => {
        if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { next(); return true; }
        if (e.key === 'ArrowLeft') { prev(); return true; }
        return false;
      });
      m.querySelector('#tp').onclick = prev;
      m.querySelector('#tn').onclick = next;
      // swipe between steps
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

  // ---------- play ----------
  let playApi = null;
  function play(g, cfg, series) {
    destroyCurrent(); view = 'play';
    S.set('recent', g.id);
    series = series || { 1: 0, 2: 0, d: 0 };
    const ai = cfg.mode === 'ai';
    const aiSide = ai ? (cfg.first === 'me' ? 2 : cfg.first === 'ai' ? 1 : (Math.random() < 0.5 ? 1 : 2)) : 0;
    const sides = g.sides || { 1: 'Pink', 2: 'Gelb' };
    const names = { 1: ai ? (aiSide === 1 ? 'KI' : 'Du') : 'Spieler 1', 2: ai ? (aiSide === 2 ? 'KI' : 'Du') : 'Spieler 2' };
    const av = s => ai ? (s === aiSide ? IC.robot : '<span>DU</span>') : `<span>P${s}</span>`;
    const v = mount(`<div class="view play" style="--acc:${g.accent || 'var(--p1)'}">
      <div class="pbar"><button class="iconbtn" id="pb" aria-label="Zurück">${IC.back}</button><div class="ttl"><b>${g.name}</b>${ai ? `<small>KI · ${V.LEVELS[cfg.level]}</small>` : '<small>2 Spieler</small>'}</div>
        <button class="iconbtn" id="ph" aria-label="Tutorial" title="Tutorial (T)">${IC.help}</button><button class="iconbtn" id="pr" aria-label="Neu starten" title="Neue Partie (N)">${IC.redo}</button></div>
      <div class="players">
        <div class="pl s1" id="pl1"><span class="av">${av(1)}</span><span class="nm">${names[1]}<small>${sides[1]}</small></span><em class="tag">am Zug</em></div>
        <div class="score" id="sc"><b>${series[1]}</b><i>:</i><b>${series[2]}</b></div>
        <div class="pl s2" id="pl2"><span class="av">${av(2)}</span><span class="nm">${names[2]}<small>${sides[2]}</small></span><em class="tag">am Zug</em></div>
      </div>
      <div class="status" id="st" aria-live="polite"></div>
      <div class="stage" id="stage"></div></div>`);
    const stEl = v.querySelector('#st'), pl1 = v.querySelector('#pl1'), pl2 = v.querySelector('#pl2');
    const timers = new Set(), cleanups = [];
    let alive = true, ended = false, keyFn = null, lastTurn = 0;
    const setStatus = html => {
      if (stEl.innerHTML === html) return;
      stEl.innerHTML = html; if (V.fxOn()) V.fx.pop(stEl, 'st-in');
    };
    const ctx = {
      stage: v.querySelector('#stage'), mode: cfg.mode, level: cfg.level, aiSide, opts: cfg.opts, sides,
      isAI: s => ai && s === aiSide,
      name: s => names[s],
      who(s) { return `<span class="c${s}">${names[s]}</span>`; },
      alive: () => alive,
      later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; },
      onCleanup(fn) { cleanups.push(fn); },
      status: setStatus,
      turn(s, html) {
        pl1.classList.toggle('on', s === 1); pl2.classList.toggle('on', s === 2);
        if (s && s !== lastTurn && V.fxOn()) V.fx.pop(s === 1 ? pl1 : pl2, 'pl-in');
        lastTurn = s;
        if (html !== false) setStatus(html || (names[s] === 'Du' ? '<span class="c' + s + '">Du</span> bist dran' : ctx.isAI(s) ? '<span class="c' + s + '">KI</span> ist dran' : `${ctx.who(s)} ist dran`));
        nav.refresh();
      },
      think(fn, ms = 380) { setStatus(`<span class="c${aiSide}">KI</span> <span class="thinking">denkt</span>`); ctx.later(fn, ms); },
      nav(fn, o) { nav.set(fn, o); },
      keys(fn) { keyFn = fn; },
      boardEl: null,
      end(winner, note) {
        if (ended || !alive) return; ended = true;
        pl1.classList.remove('on'); pl2.classList.remove('on');
        nav.hide();
        const s = stat(g.id);
        if (ai) { const r = s.ai[cfg.level]; if (winner === 0) r.d++; else if (winner === aiSide) r.l++; else r.w++; }
        else { if (winner === 0) s.local.d++; else if (winner === 1) s.local.a++; else s.local.b++; }
        S.set('stats', stats);
        if (winner === 0) series.d++; else series[winner]++;
        const sc = v.querySelector('#sc'); sc.innerHTML = `<b>${series[1]}</b><i>:</i><b>${series[2]}</b>`; V.fx.pop(sc, 'fx-pop');
        const humanWon = ai && winner && winner !== aiSide;
        const good = winner && (!ai || humanWon);
        if (good) { V.sfx.win(); setTimeout(() => V.fx.confetti(), 250); }
        else if (winner) { V.sfx.lose(); V.fx.shake(ctx.stage); }
        const title = winner === 0 ? 'Unentschieden' : ai ? (humanWon ? 'Gewonnen!' : 'Verloren') : `${names[winner]} gewinnt!`;
        setStatus(winner === 0 ? 'Unentschieden' : ai ? (humanWon ? '<span class="c' + winner + '">Du hast gewonnen</span>' : '<span class="c' + winner + '">Die KI hat gewonnen</span>') : `${ctx.who(winner)} gewinnt`);
        ctx.later(() => {
          const icon = winner === 0 ? IC.flag : good ? IC.trophy : IC.robot;
          const m = openModal(`<div class="end ${winner === 0 ? 'draw' : good ? 'win' : 'lose'} w${winner}">
            <div class="eic">${icon}</div>
            <h2 aria-label="${title}">${[...title].map((ch, k) => `<span aria-hidden="true" style="--k:${k}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</h2>
            <p>${note ? note : (ai ? `gegen KI · ${V.LEVELS[cfg.level]}` : g.name)}</p>
            <div class="eseries"><span class="c1">${names[1]}</span><b>${series[1]}</b><i>:</i><b>${series[2]}</b><span class="c2">${names[2]}</span></div>
            ${series.d ? `<p class="small">${series.d}× unentschieden</p>` : ''}
            <div class="actions"><button class="btn primary" id="er">${IC.redo}Revanche<kbd class="only-fine">Enter</kbd></button><button class="btn" id="eb">Brett ansehen</button><button class="btn ghost" id="em">Menü</button></div></div>`, 'endm', null, false, e => {
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
      const m = openModal(`<div class="confirm"><h3>Partie verlassen?</h3><p>Der aktuelle Stand geht verloren und zählt nicht in der Statistik.</p>
        <div class="actions"><button class="btn primary" id="cy">Weiterspielen</button><button class="btn ghost" id="cn">Verlassen</button></div></div>`, '', () => { if (inst && inst.resume && alive) inst.resume(); }, false, e => {
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
    inst = g.start(ctx) || {};
  }

  // ---------- keyboard ----------
  function showKeys() {
    const row = (k, d) => `<div class="krow"><span>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</span><p>${d}</p></div>`;
    openModal(`<div class="keys"><h3>Tastenkürzel</h3>
      <h4>Überall</h4>${row('?', 'Diese Übersicht')}${row('M', 'Ton an oder aus')}${row('Esc', 'Zurück oder Fenster schließen')}
      <h4>Startseite</h4>${row('← → ↑ ↓', 'Spiel auswählen')}${row('Enter', 'Spiel öffnen')}${row('1 2 3', 'Spiele, Statistik, Optionen')}
      <h4>Vor dem Spiel</h4>${row('Enter', 'Spielen')}${row('← →', 'Schwierigkeit ändern')}${row('S', 'Modus wechseln')}${row('T', 'Tutorial')}
      <h4>Im Spiel</h4>${row('← → ↑ ↓', 'Cursor über das Brett bewegen')}${row('Enter Leertaste', 'Feld wählen oder setzen')}${row('N', 'Neue Partie')}${row('T', 'Tutorial')}
      ${view === 'play' || view === 'setup' ? (lastGame && lastGame.keys ? `<h4>${lastGame.name}</h4>${lastGame.keys.map(k => row(k[0], k[1])).join('')}` : '') : ''}
      <div class="actions"><button class="btn" id="kx">Schließen</button></div></div>`, 'keysm');
    document.getElementById('kx').onclick = closeModal;
  }
  let lastGame = null;
  const _setup = setup, _play = play;
  setup = function (g) { lastGame = g; return _setup(g); };
  play = function (g, c, s) { lastGame = g; return _play(g, c, s); };

  function spatial(list, dx, dy) {
    const a = document.activeElement, i = list.indexOf(a);
    if (i < 0) { list[0] && list[0].focus(); return; }
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
    if (view === 'home') {
      if (DIRS[k]) { e.preventDefault(); spatial([...app.querySelectorAll('.tile, #cont')], ...DIRS[k]); return; }
      if (['1', '2', '3'].includes(k)) { home(TABS[+k - 1][0]); return; }
      return;
    }
    if (view === 'setup' && setupApi) {
      const onBtn = document.activeElement && document.activeElement.tagName === 'BUTTON' && app.contains(document.activeElement);
      if (k === 'Enter' && !onBtn) { e.preventDefault(); setupApi.go(); return; }
      if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); home(); return; }
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); setupApi.level(k === 'ArrowLeft' ? -1 : 1); return; }
      if (k === 's' || k === 'S') { setupApi.mode(); return; }
      if (k === 't' || k === 'T') { setupApi.tut(); return; }
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

  // ---------- boot ----------
  function intro() {
    if (!V.fxOn() || S.get('introSeen', 0) > Date.now() - 6 * 3600e3) return;
    S.set('introSeen', Date.now());
    const el = V.el('div', 'intro', '<div class="in-logo"><span class="l1">VER</span><span class="l2">SUS</span></div><div class="in-bolt"></div>');
    document.body.appendChild(el);
    el.addEventListener('pointerdown', () => el.remove());
    setTimeout(() => el.classList.add('out'), 1250); setTimeout(() => el.remove(), 1700);
  }
  V.boot = function () {
    V.games.sort((a, b) => V.CATS.indexOf(a.cat) - V.CATS.indexOf(b.cat) || (a.order || 0) - (b.order || 0));
    applyFxClass();
    if (!document.getElementById('fx')) document.body.appendChild(V.el('div', '', '')).id = 'fx';
    intro();
    home();
  };
})();
