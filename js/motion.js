// Small motion touches that work on every screen without the views knowing about them:
// light under the mouse, cards that come in while scrolling, the sliding marker in the sidebar,
// a quiet hover sound on the PC, the favourite star, the background depth, the leaning player card,
// button prompts once the keyboard is used. Motion is off with "Effekte: wenig" or reduced motion.
(function () {
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const fxOn = () => V.fxOn && V.fxOn();

  // ---------- PC: a soft light follows the mouse over cards ----------
  const LIT = '.tile,.hcard,.qtile,.mtile,.ccard,.ccard-p,.fcard,.qhero,.gp-art,.knext';
  let litEl = null, mx = 0, my = 0, raf = 0;
  const paint = () => {
    raf = 0; const el = litEl; if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    el.style.setProperty('--mx', ((mx - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--my', ((my - r.top) / r.height * 100).toFixed(1) + '%');
  };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !fine.matches || !fxOn()) return;
    const el = e.target.closest ? e.target.closest(LIT) : null;
    if (el !== litEl) {
      if (litEl) litEl.classList.remove('lit');
      litEl = el;
      if (el) {
        if (!el.querySelector(':scope>.glare')) {
          if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
          el.insertAdjacentHTML('beforeend', '<i class="glare" aria-hidden="true"></i>');
        }
        el.classList.add('lit'); hoverSound(el);
      }
    }
    mx = e.clientX; my = e.clientY;
    if (el && !raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (litEl) litEl.classList.remove('lit'); litEl = null; });

  // ---------- PC: a very quiet tick when the mouse reaches a card or menu entry (like a game menu) ----------
  const TICK = '.tile,.hcard,.qtile,.mtile,.ccard,.ccard-p,.fcard,.sd-item,.sd-game,.sd-quick,.chips button,.gp-mode button,.gp-modes button';
  let lastTick = 0, lastTickEl = null;
  function hoverSound(el) {
    const now = performance.now();
    if (el === lastTickEl || now - lastTick < 70 || !V.sfx || !V.sfx.hover) return;
    lastTick = now; lastTickEl = el; V.sfx.hover();
  }
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    const el = e.target.closest ? e.target.closest(TICK) : null;
    if (!el) { lastTickEl = null; return; }
    if (!el.matches(LIT)) hoverSound(el);
  }, { passive: true });

  // ---------- cards below the fold come in when they scroll into view ----------
  const REVEAL = '.tile,.mtile,.ccard,.fcard,.lkg,.frow,.hist-row';
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(list => {
    let k = 0;
    list.forEach(en => {
      const el = en.target;
      if (!en.isIntersecting) return;
      io.unobserve(el); pending.delete(el);
      const d = Math.min(k++, 6) * 35;
      el.style.setProperty('--rd', d + 'ms');
      el.classList.add('rv-in');
      setTimeout(() => el.classList.remove('rv', 'rv-in', 'rv-x'), 650 + d);
    });
  }, { rootMargin: '0px 0px -24px 0px', threshold: 0.12 }) : null;
  // cards scrolled past in one jump never intersect: show them right away (nobody saw them come in)
  const pending = new Set();
  let scrollPlanned = false;
  document.addEventListener('scroll', () => {
    if (!pending.size || scrollPlanned) return;
    scrollPlanned = true;
    requestAnimationFrame(() => {
      scrollPlanned = false;
      pending.forEach(el => {
        if (!el.isConnected) { pending.delete(el); io.unobserve(el); return; }
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.right < 0) { pending.delete(el); io.unobserve(el); el.classList.remove('rv', 'rv-x'); }
      });
    });
  }, { capture: true, passive: true });
  function scan(root) {
    if (!io || !fxOn() || !root.querySelectorAll) return;
    const els = root.matches && root.matches(REVEAL) ? [root] : root.querySelectorAll(REVEAL);
    if (!els.length) return;
    const H = innerHeight, W = innerWidth;
    els.forEach(el => {
      if (el.classList.contains('rv')) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const below = r.top > H - 10, right = r.left > W - 10;
      if (!below && !right) return;
      el.classList.add('rv'); if (right && !below) el.classList.add('rv-x');
      io.observe(el); pending.add(el);
    });
  }
  function watch() {
    const app = document.getElementById('app'); if (!app || !window.MutationObserver) return;
    let queued = [], planned = false;
    new MutationObserver(ms => {
      ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) queued.push(n); }));
      if (!queued.length || planned) return;
      planned = true;
      requestAnimationFrame(() => { const q = queued; queued = []; planned = false; q.forEach(n => n.isConnected && scan(n)); });
    }).observe(app, { childList: true, subtree: true });
  }

  // ---------- PC sidebar: the pink marker slides to the new entry ----------
  let lastY = null;
  function sideMarker() {
    const side = document.getElementById('side'); if (!side || !window.MutationObserver) return;
    const check = () => {
      const on = side.querySelector('.sd-item.on');
      if (!on) { lastY = null; return; }
      const y = on.getBoundingClientRect().top;
      if (lastY !== null && Math.abs(y - lastY) > 2 && fxOn() && on.animate) {
        try {
          on.animate([{ transform: `translateY(${lastY - y}px)` }, { transform: 'none' }],
            { duration: 380, easing: 'cubic-bezier(.2,1.25,.4,1)', pseudoElement: '::before' });
        } catch (e) { }
      }
      lastY = y;
    };
    let planned = false;
    new MutationObserver(() => { if (!planned) { planned = true; setTimeout(() => { planned = false; check(); }, 0); } }).observe(side, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    check();
  }

  // ---------- favourite star: a small yellow burst when it turns on ----------
  document.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('#fav') : null;
    if (!b || b.classList.contains('on') || !V.fx) return;
    const c = V.fx.center(b);
    setTimeout(() => {
      const now = document.getElementById('fav');
      if (now && !now.classList.contains('on')) return;
      V.fx.burst(c.x, c.y, '#ffd84f', 9, 34);
      if (now) V.fx.pop(now, 'fav-pop');
    }, 0);
  }, true);

  // ---------- PC: the background has depth, its layers follow the mouse a little ----------
  const wideMQ = matchMedia('(min-width:960px)');
  let bg = null, pxPlanned = false, px = 0, py = 0;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !fine.matches || !wideMQ.matches || !fxOn()) return;
    px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1;
    if (pxPlanned) return; pxPlanned = true;
    setTimeout(() => {
      pxPlanned = false; bg = bg && bg.isConnected ? bg : document.querySelector('.bgfx'); if (!bg) return;
      bg.style.setProperty('--px', px.toFixed(3)); bg.style.setProperty('--py', py.toFixed(3));
    }, 50);
  }, { passive: true });

  // ---------- PC: the player card leans towards the mouse ----------
  const CARD = '.acctp .acard.me,.p2-top';
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !fine.matches || !fxOn()) return;
    const el = e.target.closest ? e.target.closest(CARD) : null;
    document.querySelectorAll('.tilt').forEach(x => { if (x !== el) { x.classList.remove('tilt'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); } });
    if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.classList.add('tilt');
    el.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
    el.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%'); el.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%');
  }, { passive: true });

  // ---------- rank from the Elo (Start 1000): shown on the player card and in profiles ----------
  const RANKS = [[1450, 'dia', 'Diamant'], [1300, 'pla', 'Platin'], [1150, 'gold', 'Gold'], [1000, 'sil', 'Silber'], [-Infinity, 'bro', 'Bronze']];
  V.rank = elo => { const r = RANKS.find(x => elo >= x[0]); return { k: r[1], name: r[2] }; };
  // a chip with the rank of the best game, e.g. "Gold · 1210 Elo in 4 Gewinnt"
  V.rankChip = list => {
    const best = (list || []).filter(x => x && x.elo).sort((a, b) => b.elo - a.elo)[0]; if (!best) return '';
    const r = V.rank(best.elo), g = V.byId[best.game];
    return `<em class="rank r-${r.k}" title="${V.t('Beste Elo')}: ${best.elo}${g ? ' · ' + g.name : ''}"><i></i>${V.t(r.name)}<small>${best.elo}</small></em>`;
  };

  // ---------- PC: button prompts like in a console game, shown once the keyboard is used ----------
  let hintEl = null, keyMode = false, hintPlanned = false, mouseSince = 0;
  const K = s => s.split(' ').map(x => `<kbd>${x}</kbd>`).join('');
  function hintsFor() {
    if (document.querySelector('.modal-back')) return [[K('Esc'), 'Schließen']];
    if (document.querySelector('.view.play')) return [[K('Esc'), 'Menü'], [K('Z'), 'Zug zurück'], [K('N'), 'Neue Partie'], [K('?'), 'Alle Tasten']];
    if (document.querySelector('.view.setup')) return [[K('← →'), 'Modus'], [K('Enter'), 'Spielen'], [K('Esc'), 'Zurück']];
    if (document.querySelector('#panel .gp')) return [[K('← ↑ → ↓'), 'Spiel wählen'], [K('Enter'), 'Spielen'], [K('1–4'), 'Stärke'], [K('F'), 'Favorit'], [K('/'), 'Suchen']];
    return [[K('Strg K'), 'Suchen'], [K('Alt ← →'), 'Zurück / Vor'], [K('?'), 'Alle Tasten']];
  }
  function drawHints() {
    hintPlanned = false;
    if (!keyMode || !wideMQ.matches || !fine.matches) { if (hintEl) hintEl.classList.remove('on'); return; }
    if (!hintEl) { hintEl = document.createElement('div'); hintEl.className = 'khint'; hintEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(hintEl); }
    const html = hintsFor().map(([k, t]) => `<span>${k}${V.t(t)}</span>`).join('');
    if (hintEl.innerHTML !== html) hintEl.innerHTML = html;
    hintEl.classList.add('on');
  }
  const planHints = () => { if (!hintPlanned) { hintPlanned = true; setTimeout(drawHints, 60); } };
  document.addEventListener('keydown', e => {
    if (!/^(Arrow|Tab$|Enter$|Escape$)/.test(e.key) || e.ctrlKey || e.metaKey) return;
    if (e.target && e.target.matches && e.target.matches('input,textarea')) return;
    if (!keyMode) { keyMode = true; } planHints();
  });
  document.addEventListener('pointermove', e => {
    if (!keyMode || e.pointerType !== 'mouse') return;
    // a real mouse move (not a jitter) brings the mouse back; the prompts go away
    if (Math.abs(e.movementX) + Math.abs(e.movementY) < 6) return;
    if (!mouseSince) mouseSince = performance.now();
    if (performance.now() - mouseSince > 250) { keyMode = false; mouseSince = 0; planHints(); }
  }, { passive: true });
  document.addEventListener('keydown', () => { mouseSince = 0; });
  function hintWatch() {
    if (!window.MutationObserver) return;
    new MutationObserver(() => { if (keyMode) planHints(); }).observe(document.body, { childList: true });
    const app = document.getElementById('app'); if (app) new MutationObserver(() => { if (keyMode) planHints(); }).observe(app, { childList: true });
  }

  function start() { watch(); sideMarker(); hintWatch(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
