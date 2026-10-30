// Versus: building blocks for the games: touch pads, die, pawn, playing cards and the mini boards of the tutorials.
(function () {
  'use strict';

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
      b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } held.set(e.pointerId, b); b.classList.add('dn'); V.buzz(5); o.down(s, id); });
      const up = e => { if (held.get(e.pointerId) !== b) return; held.delete(e.pointerId); b.classList.remove('dn'); if (o.up) o.up(s, id); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    }));
    res.el = s => document.querySelector(`.pad[data-s="${s}"]`);
    res.dead = (s, on) => { const p = res.el(s); if (p) p.classList.toggle('dead', on); };
    return res;
  };

  // ---------- feedback when a piece lands, the hand-over screen ----------
  V.kit = {
    // ring pulse around the piece, a sound and a short buzz (own move 12 ms, the other side's move 6 ms)
    placed(el, color, them) {
      if (!el) return;
      if (V.fxOn()) { const r = V.el('i', 'kring'); r.style.setProperty('--c', color); el.appendChild(r); setTimeout(() => r.remove(), 600); }
      if (them) V.sfx.them(); else V.sfx.place();
    },
    // a card (or piece) flies from the screen rect `from` to where it is now and keeps its own rotation
    fly(el, from, ms = 300) {
      if (!el || !from || !V.fxOn()) return;
      const to = el.getBoundingClientRect(), end = getComputedStyle(el).transform;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
      if (!dx && !dy) return;
      const base = end === 'none' ? '' : end;
      el.animate([{ transform: `translate(${dx}px,${dy}px) ${base} scale(.85)` }, { transform: base || 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
    },
    // full screen in the colour of the player who gets the device; the whole screen is the button
    pass(s, name, text, extra = '') {
      return `<div class="pass" style="--hc:${V.hex(s)}" data-enter role="button" tabindex="0"><small class="ps-k">Gib das Gerät an</small><h3>${name}</h3>${text ? `<p>${text}</p>` : ''}${extra}<span class="ps-tap">Tippen zum Weiter</span></div>`;
    }
  };

  // ---------- board game pieces: a 3D die and a pawn (Ludo, Leiterspiel) ----------
  const PIP = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // rotation that brings face n to the front
  const FACE = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
  V.die = function () {
    const el = V.el('button', 'die3w', `<span class="die3">${[1, 2, 3, 4, 5, 6].map(n => `<i class="df f${n}">${Array.from({ length: 9 }, (_, k) => `<b class="${PIP[n].includes(k) ? 'on' : ''}"></b>`).join('')}</i>`).join('')}</span>`);
    el.setAttribute('aria-label', 'Würfeln');
    const cube = el.firstElementChild;
    let spinX = 0, spinY = 0, val = 5;
    const put = () => { cube.style.transform = `rotateX(${spinX + FACE[val][0]}deg) rotateY(${spinY + FACE[val][1]}deg)`; };
    put();
    return {
      el,
      // roll: tumble a few times and land on n
      show(n, roll) {
        val = n;
        if (roll && V.fxOn()) { spinX += 360 * (1 + V.rand(2)); spinY += 360 * (1 + V.rand(2)); cube.classList.add('rolling'); setTimeout(() => cube.classList.remove('rolling'), 650); }
        put(); el.dataset.v = n;
      },
      color(c) { el.style.setProperty('--dc', c); },
      state(cls) { el.classList.remove('wait', 'off'); if (cls) el.classList.add(cls); }
    };
  };
  V.pawn = c => `<svg class="pawn" viewBox="0 0 40 54" aria-hidden="true" style="color:${c}"><ellipse cx="20" cy="49" rx="15" ry="4.5" fill="rgba(0,0,0,.35)"/>
    <path d="M7 47c0-6 4-10 8-12l2-10c-5-2-7-6-6-10 1-6 5-9 9-9s8 3 9 9c1 4-1 8-6 10l2 10c4 2 8 6 8 12z" fill="currentColor"/>
    <path d="M7 47c0-6 4-10 8-12l2-10c-5-2-7-6-6-10 1-6 5-9 9-9s8 3 9 9c1 4-1 8-6 10l2 10c4 2 8 6 8 12z" fill="url(#pwShade)"/>
    <ellipse cx="16" cy="12" rx="3.2" ry="4.2" fill="#fff" opacity=".55"/><path d="M12 44c1-4 3-6 5-7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35" fill="none"/></svg>`;
  // shared gradient for the pawns (once per page)
  (function () {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
    s.innerHTML = '<defs><linearGradient id="pwShade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient></defs>';
    document.body.appendChild(s);
  })();

  // ---------- playing cards (Mau-Mau, Poker, Memory) ----------
  // a card is a code: rank '23456789TJQKA' + suit 'SHDC' (Pik, Herz, Karo, Kreuz), e.g. 'TH' = Herz 10
  const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' }, SUIT_NAME = { S: 'Pik', H: 'Herz', D: 'Karo', C: 'Kreuz' };
  // English cards say J and Q for Bube and Dame
  const RANK = V.lang === 'en' ? { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' } : { T: '10', J: 'B', Q: 'D', K: 'K', A: 'A' }, RANK_NAME = { J: 'Bube', Q: 'Dame', K: 'König', A: 'Ass', T: '10' };
  V.cardName = c => SUIT_NAME[c[1]] + ' ' + (RANK_NAME[c[0]] || c[0]);
  V.suitName = s => SUIT_NAME[s];
  V.suitSym = s => SUIT[s];
  V.card = (c, cls = '') => {
    if (!c) return `<div class="card back ${cls}"><i></i></div>`;
    const r = RANK[c[0]] || c[0], s = SUIT[c[1]], red = c[1] === 'H' || c[1] === 'D';
    const face = 'JQK'.includes(c[0]) ? `<em class="fc">${r}</em>` : `<em>${s}</em>`;
    return `<div class="card ${red ? 'red' : 'blk'} ${cls}" data-c="${c}"><b class="tl">${r}<small>${s}</small></b>${face}<b class="br">${r}<small>${s}</small></b></div>`;
  };
  // a shuffled deck from a random source (ctx.rng keeps it the same for everybody online)
  V.deck = (rng, ranks = '23456789TJQKA') => {
    const d = []; for (const s of 'SHDC') for (const r of ranks) d.push(r + s);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
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
})();
