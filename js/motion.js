// Small motion touches that work on every screen without the views knowing about them:
// light under the mouse, cards that come in while scrolling, the sliding marker in the sidebar,
// a quiet hover sound on the PC, the favourite star. All off with "Effekte: wenig" or reduced motion.
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

  function start() { watch(); sideMarker(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
