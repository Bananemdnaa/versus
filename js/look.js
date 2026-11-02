// Versus: the profile look. Only looks, no advantage in a game: avatar colour and symbol, a banner pattern, a short
// motto and a favourite game. Stored on the server (profiles.look, set_look; others read it through player_badges)
// and kept on this device (versus.look) so the own avatar shows at once. The keys match the checks in
// supabase/migrations/20261123000000_profile_look.sql.
(function () {
  'use strict';
  const S = () => V._.S, IC = () => V.ui.IC;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COLORS = { p: ['#ff4fd8', 'Pink'], y: ['#ffd84f', 'Gelb'], c: ['#62f0ff', 'Cyan'], g: ['#5dff9d', 'Grün'], o: ['#ff9f43', 'Orange'], v: ['#a78bfa', 'Violett'], r: ['#ff5d73', 'Rot'], w: ['#f3f4ff', 'Weiß'] };
  const ICONS = ['♟', '♞', '♛', '♚', '⚡', '🔥', '👑', '🎲', '🃏', '⭐', '🚀', '🐉', '🦊', '🐼', '🎯', '🏆', '🎮', '💎', '🌙', '🍀'];
  const BANNERS = { s: 'Streifen', d: 'Punkte', g: 'Gitter', w: 'Wellen', x: 'Diagonale', p: 'Schlicht' };

  const clean = l => (l && typeof l === 'object' ? l : {});
  const color = l => (COLORS[clean(l).c] || COLORS.p)[0];
  // the text in the avatar: the chosen symbol or the first letters of the name
  const text = (name, l, n = 2) => { const i = clean(l).i; const k = i && i !== 'ini' ? +i.slice(1) : -1; return k >= 0 && ICONS[k] ? ICONS[k] : esc(String(name || '?').slice(0, n).toUpperCase()); };
  const isIcon = l => { const i = clean(l).i; return !!(i && i !== 'ini'); };
  // style for an avatar box (its own CSS keeps the shape): background in the chosen colour
  const style = l => `background:${color(l)};color:#08090f`;
  const banner = l => 'lb-' + (BANNERS[clean(l).b] ? clean(l).b : 'x');

  const mine = () => clean(S().get('look', {}));
  function keep(l) { S().set('look', clean(l), true); if (V.ui && V.ui.side) V.ui.side(); document.dispatchEvent(new CustomEvent('versus-look')); }
  // after signing in: the account's look from the server
  function sync() {
    const u = V.cloud && V.cloud.user(); if (!u || u.anon) return;
    V.cloud.rpc('player_badges', { name: u.username }).then(b => { if (b && b.look) keep(b.look); }, () => { });
  }

  function editor() {
    const u = V.cloud && V.cloud.user();
    if (!u || u.anon) return V.ui.toast('Dafür brauchst du ein Konto');
    const l = Object.assign({ c: 'p', i: 'ini', b: 'x', m: '', g: '' }, mine());
    const games = V.games.slice().sort((a, b) => a.name.localeCompare(b.name));
    const m = V.ui.openModal(`<div class="lk">
      <div class="fadd-h"><h3>Dein Look</h3><button class="iconbtn" id="lkx" aria-label="Schließen">${IC().x}</button></div>
      <div class="lk-prev" id="lkp"></div>
      <h4>Farbe</h4><div class="lk-sw">${Object.entries(COLORS).map(([k, [c, n]]) => `<button data-c="${k}" style="--sw:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
      <h4>Avatar</h4><div class="lk-ic"><button data-i="ini" class="ini">${esc(u.username.slice(0, 2).toUpperCase())}</button>${ICONS.map((s, k) => `<button data-i="i${k}">${s}</button>`).join('')}</div>
      <h4>Banner</h4><div class="lk-bn">${Object.entries(BANNERS).map(([k, n]) => `<button data-b="${k}" class="lb-${k}"><span>${n}</span></button>`).join('')}</div>
      <h4>Spruch</h4><input class="inp" id="lkm" maxlength="60" placeholder="z. B. Revanche? Jederzeit." value="${esc(l.m || '')}">
      <h4>Lieblingsspiel</h4><select class="inp" id="lkg"><option value="">Keins</option>${games.map(g => `<option value="${g.id}"${l.g === g.id ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
      <p class="aerr" id="lke"></p>
      <div class="actions"><button class="btn primary" id="lks"><span>Speichern</span></button><button class="btn ghost" id="lkc"><span>Abbrechen</span></button></div></div>`, 'lkm');
    const prev = () => {
      m.querySelector('#lkp').innerHTML = `<div class="p2-top ${banner(l)}" style="--lc:${color(l)}"><i class="p2-st"></i><span class="p2-av${isIcon(l) ? ' sym' : ''}" style="${style(l)}">${text(u.username, l)}</span>
        <div class="p2-id"><b>${esc(u.username)}</b>${l.m ? `<small class="p2-m">„${esc(l.m)}“</small>` : ''}${l.g && V.byId[l.g] ? `<span class="p2-fav"><span class="ic">${V.byId[l.g].icon}</span>${esc(V.byId[l.g].name)}</span>` : ''}</div></div>`;
      m.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === l.c));
      m.querySelectorAll('[data-i]').forEach(x => x.classList.toggle('on', x.dataset.i === l.i));
      m.querySelectorAll('[data-b]').forEach(x => x.classList.toggle('on', x.dataset.b === l.b));
      m.querySelectorAll('.lk-bn button, .lk-ic button').forEach(x => x.style.setProperty('--lc', color(l)));
    };
    m.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { l.c = x.dataset.c; V.sfx.tick(); prev(); });
    m.querySelectorAll('[data-i]').forEach(x => x.onclick = () => { l.i = x.dataset.i; V.sfx.tick(); prev(); });
    m.querySelectorAll('[data-b]').forEach(x => x.onclick = () => { l.b = x.dataset.b; V.sfx.tick(); prev(); });
    m.querySelector('#lkm').oninput = e => { l.m = e.target.value; prev(); };
    m.querySelector('#lkg').onchange = e => { l.g = e.target.value; prev(); };
    m.querySelector('#lkx').onclick = V.ui.closeModal; m.querySelector('#lkc').onclick = V.ui.closeModal;
    m.querySelector('#lks').onclick = async () => {
      const b = m.querySelector('#lks'); b.classList.add('busy');
      try {
        const saved = await V.cloud.rpc('set_look', { l: { c: l.c, i: l.i, b: l.b, m: l.m.trim(), g: l.g || null } });
        keep(saved || {}); V.ui.closeModal(); V.ui.toast('Dein Look ist gespeichert'); V.sfx.ui();
      } catch (e) { b.classList.remove('busy'); m.querySelector('#lke').textContent = /set_look|function/i.test(e.message) ? 'Der Look kommt nach dem nächsten Server-Update.' : e.message; V.sfx.bad(); }
    };
    prev();
  }

  // a new login loads that account's look, signing out forgets it on this device
  addEventListener('load', () => {
    if (!V.cloud) return;
    let who = null;
    const check = () => {
      if (V.cloud.starting()) return;
      const u = V.cloud.user(), k = u && !u.anon ? u.username : '';
      if (k === who) return;
      who = k;
      if (k) sync(); else if (Object.keys(mine()).length) keep({});
    };
    V.cloud.on(check); check();
  });

  V.look = { COLORS, ICONS, BANNERS, color, text, isIcon, style, banner, mine, sync, editor };
})();
