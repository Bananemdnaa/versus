(function () {
  'use strict';

  const V = window.V = { games: [], byId: {} };
  V.LEVELS = ['Leicht', 'Mittel', 'Schwer', 'Profi'];
  V.CATS = ['Klassiker', 'Brettspiele', 'Strategie', 'Action'];
  // games that came with the last update; only these get the "Neu" badge on their tile
  V.NEW_GAMES = ['hex', 'ttt3', 'code', 'domino'];
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
  const DEFAULTS = { sound: true, vol: 80, music: true, mvol: 45, haptic: 'strong', fx: 'full', intro: true, coords: true, hints: true, aiFast: false, openCards: true, board: 'std', face: false, cb: false };
  const settings = V.settings = Object.assign({}, DEFAULTS, S.get('settings', {}));
  // older saves stored vibration as true/false
  if (settings.haptic === true) settings.haptic = 'strong'; else if (settings.haptic === false) settings.haptic = 'off';
  const saveSettings = () => S.set('settings', settings);
  // shared with the other core files (kit, app, play); stats and seen are replaced as a whole on reset and cloud sync
  const P = V._ = { S, settings, DEFAULTS, saveSettings, stats: S.get('stats', {}), seen: S.get('seen', {}) };
  P.stat = id => {
    if (!P.stats[id]) P.stats[id] = { ai: [0, 1, 2, 3].map(() => ({ w: 0, l: 0, d: 0 })), local: { a: 0, b: 0, d: 0 } };
    return P.stats[id];
  };

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
    // board style for Schach, Dame and Reversi: standard (each its own), all neon or all wood
    r.toggle('bd-neon', settings.board === 'neon'); r.toggle('bd-wood', settings.board === 'wood');
    // colour-blind mode: patterns on the pieces, numbers on the pawns
    r.toggle('cb', !!settings.cb);
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
  // fixed pulses (stretched by the strength setting): tap 5, own move 10-12, opponent's move 6, win 40, loss 30-40-30
  V.sfx = {
    tick() { tone(1200, 0.025, 'square', 0.02); },
    move() { tone(520, 0.06, 'triangle', 0.07); V.buzz(10); },
    place() { tone(320, 0.1, 'triangle', 0.09, -140); V.buzz(12); },
    // a piece of the other side (AI or remote) lands
    them() { tone(280, 0.09, 'triangle', 0.07, -110); V.buzz(6); },
    found() { tone(660, 0.1, 'triangle', 0.08, 220); setTimeout(() => tone(990, 0.14, 'triangle', 0.08), 110); V.buzz(20); },
    // the VS slam: a deep saw with a square on top
    vs() { tone(90, 0.4, 'sawtooth', 0.09); setTimeout(() => tone(180, 0.3, 'square', 0.05), 280); V.buzz(25); },
    hit() { tone(200, 0.22, 'sawtooth', 0.06, -140); V.buzz([35, 45, 45]); },
    miss() { tone(760, 0.08, 'sine', 0.05, -320); },
    bad() { tone(130, 0.22, 'square', 0.04); V.buzz(60); },
    bounce() { tone(440, 0.04, 'square', 0.04); V.buzz(10); },
    goal() { tone(660, 0.12, 'triangle', 0.08, 300); V.buzz(40); },
    go() { tone(980, 0.12, 'square', 0.05); V.buzz(30); },
    ui() { tone(700, 0.035, 'triangle', 0.035); V.buzz(5); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.08), i * 110)); V.buzz(40); V.music && V.music.duck(3200); },
    lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.07), i * 150)); V.buzz([30, 40, 30]); V.music && V.music.duck(3200); }
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
      let dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
      if (!dx && !dy) return;
      // on a board turned around for the other player ("Gegenüber sitzen") screen directions are mirrored
      const st = el.closest('.stage');
      if (st && getComputedStyle(st).rotate === '180deg') { dx = -dx; dy = -dy; }
      el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.25,.8,.3,1)' });
    },
    // a win: 46 pieces fly out of the middle of the screen (round or square, pink, yellow, cyan, white)
    win() {
      if (!V.fxOn()) return;
      const L = fxLayer(), W = window.innerWidth, H = window.innerHeight, C = ['#ff4fd8', '#ffd84f', '#62f0ff', '#ffffff'];
      for (let i = 0; i < 46; i++) {
        const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * Math.min(W, H) * 0.45, z = 6 + Math.random() * 7;
        s.className = 'fx-w';
        s.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:${z.toFixed(1)}px;height:${z.toFixed(1)}px;background:${C[i % 4]};border-radius:${i % 3 ? '2px' : '50%'};--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px;animation-duration:${(0.8 + Math.random() * 0.7).toFixed(2)}s;animation-delay:${(0.15 + Math.random() * 0.2).toFixed(2)}s`;
        L.appendChild(s); setTimeout(() => s.remove(), 1900);
      }
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
    boltf: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', true),
    dice: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" stroke-width="2.6"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    hand: svg('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L4.2 15a1.5 1.5 0 0 1 2.4-1.8L9 15.5"/>'),
    bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    hash: svg('<path d="M5 9h15M4 15h15M10 3L8 21M16 3l-2 18"/>'),
    eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    film: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
    share: svg('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/>'),
    phone: svg('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>'),
    music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    smile: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
    star: svg('<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'),
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

  Object.assign(P, { IC, IOS, LEVEL_INFO, applyFxClass, setSwap });
})();
