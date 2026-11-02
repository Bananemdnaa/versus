// Versus: seasonal looks for the whole app (moon and bats at Halloween, snow and fairy lights in winter) plus tinted
// background lights; nothing changes in the games. Which look runs, the team decides in the admin panel (site_state.season,
// read with site_notice); players can only switch it off (setting seasonOn). The last known look is kept on the device,
// so it shows at once on the next start and offline. Effects off: the decoration stands still, no snow falls.
(function () {
  'use strict';
  const st = V.settings, S = V.store;
  const LOOKS = ['halloween', 'winter'];
  let site = S.get('season', '');
  const active = () => (LOOKS.includes(site) ? site : '');
  const current = () => (st.seasonOn === false ? '' : active());
  // the look from the server (site_notice); called by js/app.js whenever it loads the site state
  function fromSite(s) { s = LOOKS.includes(s) ? s : ''; if (s === site) return; site = s; S.set('season', s, true); apply(); }

  const bat = `<svg viewBox="0 0 64 28"><path d="M32 9c2-5 5-6 6-3 3-4 9-6 14-3 4 2 8 1 12-2-2 6-6 10-11 10 1 3 0 6-3 8-2-3-5-4-8-3-2 1-5 4-6 8-1-4-4-7-6-8-3-1-6 0-8 3-3-2-4-5-3-8C8 11 4 7 2 1c4 3 8 4 12 2 5-3 11-1 14 3 1-3 4-2 6 3z"/></svg>`;
  const web = `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1"><path d="M0 0 120 120M0 0 60 120M0 0 120 60M0 0 0 120M0 0 120 0"/><path d="M0 24c8-2 16 2 21-4 3 6 2 0 9 3M0 48c14-3 26 2 36-8 8 10 12 4 18 6 0 0 1 7 6 8M0 76c18-4 34 4 50-12 12 14 22 6 30 9 2 6 1 12 8 14M0 104c24-6 44 6 66-18 16 18 30 8 40 12M24 0c-2 8 2 16-4 21M48 0c-3 14 2 26-8 36M76 0c-4 18 4 34-12 50M104 0c-6 24 6 44-18 66"/></svg>`;

  // two layers: one behind the content (moon, fog, snow drift) and one over it that lets every tap through
  // (bats, cobweb, fairy lights, snow), below dialogs and toasts
  let layer = null, back = null, snow = null, raf = 0, on = '';
  function build(look) {
    if (layer) layer.remove();
    if (back) back.remove();
    stopSnow();
    layer = back = null; on = look;
    const r = document.documentElement.classList;
    LOOKS.forEach(l => r.toggle('ss-' + l, l === look));
    if (!look) return;
    const mk = cls => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); return d; };
    back = mk('season ' + look); layer = mk('season front ' + look);
    if (look === 'halloween') {
      back.innerHTML = '<i class="moon"></i><i class="fog"></i>';
      layer.innerHTML = `<i class="web">${web}</i><i class="spider"><b></b></i>${[0, 1, 2, 3, 4].map(k => `<i class="bat b${k}">${bat}</i>`).join('')}`;
    } else {
      back.innerHTML = '<i class="drift"></i>';
      // fairy lights along the top edge, the bulbs take turns glowing
      const n = Math.max(12, Math.min(40, Math.round(innerWidth / 42)));
      layer.innerHTML = `<i class="lights">${Array.from({ length: n }, (_, k) => `<b style="--k:${k % 4};--x:${((k + 0.5) / n * 100).toFixed(2)}%"></b>`).join('')}</i><canvas class="snow"></canvas>`;
    }
    (document.querySelector('.bgfx') || document.body).appendChild(back);
    document.body.appendChild(layer);
    if (look === 'winter') startSnow();
  }

  // ---------- snow: one small canvas, few flakes, paused in the background and with effects off ----------
  function startSnow() {
    const cv = layer.querySelector('.snow'); if (!cv || !V.fxOn()) return;
    const g = cv.getContext('2d'), dpr = Math.min(1.5, devicePixelRatio || 1);
    let W = 0, H = 0, flakes = [], last = performance.now();
    const size = () => {
      W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, W * H / 14000) * (V.coarse ? 0.6 : 1));
      flakes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.2, v: 14 + Math.random() * 30, w: Math.random() * 6.28, a: 0.35 + Math.random() * 0.5 }));
    };
    size(); addEventListener('resize', size);
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      g.clearRect(0, 0, W, H); g.fillStyle = '#fff';
      for (const f of flakes) {
        f.y += f.v * dt; f.w += dt * 0.9; f.x += Math.sin(f.w) * 12 * dt;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        g.globalAlpha = f.a; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.28); g.fill();
      }
      g.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', vis);
    snow = () => { cancelAnimationFrame(raf); removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis); };
    vis();
  }
  function stopSnow() { if (snow) { snow(); snow = null; } }

  // again after a change of the setting or of the effects switch
  function apply() { const l = current(); if (l !== on || (l && !layer)) build(l); else if (l === 'winter') { stopSnow(); startSnow(); } }
  V.season = { apply, current, active, fromSite };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
