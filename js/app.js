// Versus: the app shell. Home tabs, game panel, stats, options, dialogs, tutorials, keyboard, install, updates, boot.
(function () {
  'use strict';

  const P = V._, { S, settings, DEFAULTS, saveSettings, stat, IC, IOS, LEVEL_INFO, applyFxClass, setSwap } = P;
  // the match screen lives in js/play.js
  const play = (g, cfg, series) => P.play(g, cfg, series);

  // ---------- app shell ----------
  const app = document.getElementById('app');
  const wideMQ = window.matchMedia('(min-width: 960px)');
  const wide = () => wideMQ.matches;
  let current = null, view = 'home', homeTab = 'games', homeFilter = 'Alle', selected = null;
  function destroyCurrent() { if (current) { current.destroy(); current = null; } nav.reset(); closeModal(); setSwap(false); }
  const musicFor = g => g.cat === 'Action' ? 'action' : g.cat === 'Strategie' || g.cat === 'Brettspiele' ? 'think' : 'play';
  function mount(html) {
    app.innerHTML = html;
    const v = app.firstElementChild;
    if (v && V.fxOn()) { v.classList.add('enter'); setTimeout(() => v.classList.remove('enter'), 900); }
    toTop();
    side.render();
    queueGuard();
    if (V.music) V.music.play(view === 'play' && lastGame ? musicFor(lastGame) : 'menu');
    return v;
  }
  function totals() {
    let total = 0, aiWins = 0, aiGames = 0, proWins = 0, draws = 0, onWins = 0, onGames = 0;
    for (const id in P.stats) {
      const s = P.stats[id];
      if (s.on) { onWins += s.on.w; onGames += s.on.w + s.on.l + s.on.d; }
      s.ai.forEach((r, i) => { aiWins += r.w; aiGames += r.w + r.l + r.d; draws += r.d; if (i === 3) proWins += r.w; });
      total += s.local.a + s.local.b + s.local.d;
    }
    total += aiGames + onGames;
    const rated = aiGames + onGames;
    return { total, aiWins, aiGames, proWins, draws, onWins, onGames, rate: rated ? Math.round((aiWins + onWins) / rated * 100) : 0 };
  }
  const TABS = [['games', 'Spiele', IC.grid], ['online', 'Online', IC.globe], ['stats', 'Bilanz', IC.chart], ['profile', 'Konto', IC.user], ['opts', 'Optionen', IC.gear]];
  // Laptop: the app bar above the main area (back/forward through the areas, the game search, lobby, alerts, sound,
  // keys). The areas themselves are in the sidebar (#side). Phone: no bar, the profile head (.ahd) is used instead.
  function header() {
    if (!wide()) return '';
    const net = V.cloud && V.cloud.available();
    return `<header class="top abar">
      <div class="ab-nav"><button class="iconbtn" id="hback" aria-label="Zurück" title="Zurück (Alt ←)">${IC.back}</button><button class="iconbtn" id="hfwd" aria-label="Vor" title="Vor (Alt →)">${IC.fwd}</button></div>
      <label class="ab-search">${IC.search}<input id="gq" type="search" placeholder="Spiel suchen" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Spiel suchen" value="${escA(homeQuery)}"><kbd>Strg K</kbd><button class="gclear" id="gqx" aria-label="Suche löschen"${homeQuery ? '' : ' hidden'}>${IC.x}</button></label>
      <div class="top-r">${net ? `<button class="ab-lobby" id="hlobby"><i class="ldot"></i><span>Online-Lobby</span></button>
        <button class="iconbtn" id="hbell" aria-label="Einladungen und Züge" title="Einladungen und Züge">${IC.bell}<i class="pdot" hidden></i></button>` : ''}
        <button class="iconbtn" id="snd" aria-label="Ton an oder aus" title="Ton (M)">${settings.sound ? IC.sound : IC.mute}</button>
        <button class="iconbtn only-fine" id="kbd" aria-label="Tastenkürzel" title="Tastenkürzel (?)">${IC.kbd}</button></div></header>`;
  }
  function wireHeader(root) {
    root.querySelectorAll('#snd, .snd').forEach(s => s.onclick = toggleSound);
    const k = root.querySelector('#kbd'); if (k) k.onclick = showKeys;
    const on = (id, fn) => { const b = root.querySelector('#' + id); if (b) b.onclick = () => { V.sfx.ui(); fn(); }; };
    on('hback', () => histGo(-1)); on('hfwd', () => histGo(1));
    on('hlobby', () => home('online')); on('hbell', () => home('online'));
    if (root.querySelector('.abar #gq')) wireSearch(root);
    navBtns();
    if (V.online && V.online.badge) V.online.badge();
    wireHead(root);
  }
  // back and forward through the areas (laptop app bar, Alt + arrows)
  const hist = { back: [], fwd: [], moving: false };
  function histGo(d) {
    const from = d < 0 ? hist.back : hist.fwd, to = d < 0 ? hist.fwd : hist.back;
    if (!from.length) return;
    to.push([homeTab, homeSpot]);
    const [t, s] = from.pop();
    hist.moving = true; homeSpot = s; home(t); hist.moving = false;
  }
  function navBtns() {
    const b = app.querySelector('#hback'), f = app.querySelector('#hfwd');
    if (b) b.disabled = !hist.back.length; if (f) f.disabled = !hist.fwd.length;
  }
  // scrolling: the window on the phone, the main area (#app) on the laptop
  function toTop() { window.scrollTo(0, 0); app.scrollTop = 0; }
  function scrollToEl(el) {
    if (!el) return;
    const behavior = V.fxOn() ? 'smooth' : 'auto';
    if (wide()) app.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top - app.getBoundingClientRect().top + app.scrollTop - 84), behavior });
    else window.scrollTo({ top: Math.max(0, el.offsetTop - 70), behavior });
  }
  // phone: profile head instead of the logo bar (avatar, name, weekly place and win streak, sound and options)
  function appHead() {
    const u = V.cloud && V.cloud.available() ? V.cloud.user() : null, full = u && !u.anon;
    const name = u ? u.username : 'Gast';
    const hr = new Date().getHours(), greet = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Guten Tag' : 'Guten Abend';
    return `<header class="ahd"><button class="ah-av${full ? (V.look.isIcon(V.look.mine()) ? ' sym' : '') : ' guest'}" id="ahav" aria-label="Konto"${full ? ` style="${V.look.style(V.look.mine())}"` : ''}><span>${full ? V.look.text(name, V.look.mine(), 1) : '+'}</span></button>
      <div class="ah-t"><small class="ah-g">${greet}</small><b>${escA(name)}</b><div class="ah-c" id="ahc"></div></div>
      <button class="iconbtn" id="ahq" aria-label="Spiel suchen">${IC.search}</button>
      <button class="iconbtn snd" aria-label="Ton an oder aus">${settings.sound ? IC.sound : IC.mute}</button><button class="iconbtn" id="ahopt" aria-label="Optionen">${IC.gear}</button></header>`;
  }
  function wireHead(root) {
    const h = root.querySelector('.ahd'); if (!h) return;
    h.querySelector('#ahav').onclick = () => { V.sfx.ui(); home('profile'); };
    h.querySelector('#ahopt').onclick = () => { V.sfx.ui(); home('opts'); };
    // the search: jump to the games and put the cursor in the search field
    h.querySelector('#ahq').onclick = () => {
      V.sfx.ui();
      const fx = () => { const q = app.querySelector('#gq'); if (!q) return; scrollToEl(q.closest('.gfind')); setTimeout(() => q.focus(), 250); };
      if (homeTab !== 'games') { home('games'); setTimeout(fx, 200); } else fx();
    };
    h.querySelectorAll('.snd').forEach(s => s.onclick = toggleSound);
    // weekly place and streak come from the own profile (cached for a while in js/online.js)
    if (V.online && V.online.meStats) V.online.meStats().then(st => {
      const c = h.querySelector('#ahc'); if (!c || !st) return;
      c.innerHTML = (st.week ? `<em class="chip y">${IC.trophy}Woche #${st.week}</em>` : '') + (st.streak >= 2 ? `<em class="chip c">${IC.bolt}Serie ${st.streak}</em>` : '');
    });
  }
  // Guests (accounts exist, but nobody is logged in) can play these games against the AI and on one device.
  // Everything else, plus online matches and the rankings, needs a free account.
  const GUEST_GAMES = ['c4', 'ttt', 'ships', 'dots', 'reaction', 'pong'];
  // a guest session (quick match without an account) still counts as guest here
  const guest = () => !!(V.cloud && V.cloud.available() && !V.cloud.starting() && (!V.cloud.user() || V.cloud.user().anon));
  // Versus as a Discord activity (js/discord.js): everybody runs it on their own device, so "two players on one device" is gone there
  const inDiscord = () => !!(V.discord && V.discord.on);
  // inside the Discord activity the table games are open to guests too (the voice channel plays them together)
  const locked = g => !!g && guest() && !GUEST_GAMES.includes(g.id) && !(g.table && V.discord && V.discord.on);
  V.guest = guest; V.locked = locked;
  // account button in the header: name when logged in, otherwise "Gast · Anmelden"
  function acctChip() {
    if (!V.cloud || !V.cloud.available()) return '';
    const u = V.cloud.user();
    return `<button class="acct${u && !u.anon ? ' in' : ' guest'}" id="acct" title="Konto">${IC.user}<span>${u ? u.username : 'Gast'}</span>${u && !u.anon ? '' : `<em>${u ? 'Konto behalten' : 'Anmelden'}</em>`}</button>`;
  }
  // after a new look: avatars in the sidebar, the phone head and on the account page
  document.addEventListener('versus-look', () => { refreshAcct(); if (view === 'home' && homeTab === 'profile') home('profile'); });
  function refreshAcct() {
    side.render();
    const h = app.querySelector('.ahd');
    if (h) { const t = document.createElement('div'); t.innerHTML = appHead(); h.replaceWith(t.firstElementChild); wireHead(app); }
    const a = document.getElementById('acct'); if (!a) return;
    const t = document.createElement('div'); t.innerHTML = acctChip(); const n = t.firstElementChild;
    if (n) { a.replaceWith(n); n.onclick = () => { V.sfx.ui(); home('profile'); }; }
  }
  const sndIcons = () => document.querySelectorAll('#snd, .snd').forEach(s => { s.innerHTML = settings.sound ? IC.sound : IC.mute; });
  function toggleSound() {
    settings.sound = !settings.sound; saveSettings(); V.sfx.ui();
    if (V.music) V.music.apply();
    sndIcons();
    toast(settings.sound ? 'Ton an' : 'Ton aus');
  }

  // ---------- laptop sidebar (#side) ----------
  // One block next to every view: logo with the collapse button, quick match, the areas, favourites, friends and the
  // profile card. Collapsed (setting side 'rail', Ctrl B) it is a strip of icons; during a match it collapses by itself
  // and comes back as it was afterwards. Start and Bibliothek are the same screen (top / the game list).
  let homeSpot = 'start';
  const side = (() => {
    const el = document.createElement('nav');
    el.className = 'side'; el.id = 'side'; el.setAttribute('aria-label', 'Seitenleiste');
    document.body.insertBefore(el, app);
    // small laptop screens (under 1100 px) always get the icon strip, so the library and the panel keep their room
    const narrowMQ = window.matchMedia('(max-width: 1099px)');
    narrowMQ.addEventListener && narrowMQ.addEventListener('change', () => render());
    const forced = () => view === 'play' || narrowMQ.matches;
    const rail = () => settings.side === 'rail' || forced();
    const active = () => view === 'play' || view === 'setup' ? 'lib' : view === 'admin' ? 'profile' : view !== 'home' ? '' : homeTab === 'games' ? homeSpot : homeTab;
    // wins and losses against the AI and online, for the favourites
    function rec(id) {
      const s = P.stats[id]; if (!s) return '';
      let w = s.on ? s.on.w : 0, l = s.on ? s.on.l : 0;
      s.ai.forEach(r => { w += r.w; l += r.l; });
      return w + l ? w + ':' + l : '';
    }
    function render() {
      document.documentElement.classList.toggle('side-rail', rail());
      if (!wide()) { el.innerHTML = ''; friendsRefresh(); return; }
      const a = active(), u = V.cloud && V.cloud.available() ? V.cloud.user() : null, full = !!(u && !u.anon);
      const qn = V.online && V.online.quickName ? V.online.quickName() : '';
      const item = (id, label, ic, count) => `<button class="sd-item${a === id ? ' on' : ''}" data-go="${id}" title="${label}"${a === id ? ' aria-current="page"' : ''}>${ic}<span>${label}</span>${count ? `<small>${count}</small>` : ''}</button>`;
      const fav = favs().map(id => V.byId[id]);
      const fr = full && V.online && V.online.sideFriends ? V.online.sideFriends() : null;
      const onl = fr ? fr.filter(f => f.online) : [];
      const frRows = fr ? fr.slice().sort((x, y) => y.online - x.online).slice(0, 6).map(f => `<div class="sd-fr${f.online ? ' on' : ''}">
          <button class="sd-fav" data-prof="${escA(f.name)}" aria-label="Profil von ${escA(f.name)}"><span>${escA(f.name.slice(0, 2).toUpperCase())}</span><i></i></button>
          <span class="sd-ft"><b>${escA(f.name)}</b><small>${f.status}</small></span>
          ${f.match ? `<button class="sd-mini" data-watchf="${escA(f.match)}">Zuschauen</button>` : f.online && !f.busy ? `<button class="sd-mini" data-play="${escA(f.name)}">Einladen</button>` : ''}</div>`).join('') : '';
      el.innerHTML = `<div class="sd-top">
          <button class="sd-logo" data-go="start" aria-label="Versus Startseite"><span class="l1">VER</span><i class="slash"></i><span class="l2">SUS</span><b class="sd-vs">VS</b></button>
          <button class="iconbtn sd-tog" id="sdtog" aria-label="${rail() ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}" title="Seitenleiste (Strg B)"${forced() ? ' disabled' : ''}>${IC.panel}</button></div>
        <button class="sd-quick" data-go="quick" title="Schnell spielen: ${escA(qn)}">${IC.boltf}<span>Schnell spielen<small>${escA(qn)}</small></span></button>
        <div class="sd-nav" role="list">
          ${item('start', 'Start', IC.home)}${item('lib', 'Bibliothek', IC.grid, V.games.length)}${item('online', 'Online', IC.globe)}${item('stats', 'Bilanz', IC.chart)}${item('profile', 'Konto', IC.user)}</div>
        <section class="sd-sec"><h4>Favoriten</h4>
          ${fav.length ? fav.map(g => `<button class="sd-game" data-game="${g.id}" title="${g.name}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span><small>${rec(g.id)}</small></button>`).join('') : '<p class="sd-hint">Spiel auswählen und mit <kbd>F</kbd> markieren</p>'}</section>
        ${fr ? `<section class="sd-sec"><h4>Freunde${onl.length ? `<em>${onl.length} online</em>` : ''}</h4>${frRows || '<p class="sd-hint">Noch keine Freunde. Füg sie unter Online hinzu.</p>'}</section>` : ''}
        <div class="sd-bot">
          ${installOffer() ? `<button class="sd-item sd-inst" data-go="install" title="Als App installieren">${IC.dl}<span>Als App installieren</span></button>` : ''}
          ${item('opts', 'Optionen', IC.gear)}
          <div class="sd-me"><button class="sd-av${full ? (V.look.isIcon(V.look.mine()) ? ' sym' : '') : ' guest'}" data-go="profile" aria-label="Konto"${full ? ` style="${V.look.style(V.look.mine())}"` : ''}><span>${full ? V.look.text(u.username, V.look.mine(), 1) : '+'}</span></button>
            <span class="sd-mt"><b>${full ? escA(u.username) : 'Gast'}</b>${full ? '<small>Konto</small>' : `<button class="sd-login" data-go="profile">${u ? 'Konto behalten' : 'Anmelden'}</button>`}</span>
            <button class="iconbtn sd-gear" data-go="opts" aria-label="Optionen" title="Optionen">${IC.gear}</button></div></div>`;
      if (V.online && V.online.badge) V.online.badge();
      wire();
    }
    function go(id, left) {
      V.sfx.ui();
      // during a match the areas are reached through the usual "leave the match?" question
      if (view === 'play' && !left) { if (!P.playApi) return; if (id === 'opts') return P.playApi.opts(); P.playApi.leaveTo(() => go(id, true)); return; }
      if (id === 'quick') return quickGo();
      if (id === 'install') return install();
      if (id === 'start' || id === 'lib') {
        const before = view === 'home' && homeTab === 'games';
        homeSpot = id; home('games');
        const spot = () => id === 'lib' ? scrollToEl(app.querySelector('.gfind')) : app.scrollTo({ top: 0, behavior: V.fxOn() ? 'smooth' : 'auto' });
        before ? spot() : setTimeout(spot, 180);
        return;
      }
      home(id);
    }
    function wire() {
      el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
      el.querySelector('#sdtog').onclick = () => toggle();
      el.querySelectorAll('[data-game]').forEach(b => b.onclick = () => {
        const g = V.byId[b.dataset.game]; V.sfx.ui();
        if (view === 'play') { if (P.playApi) P.playApi.leaveTo(() => { homeSpot = 'lib'; home('games', g); }); return; }
        homeSpot = 'lib'; home('games', g);
        setTimeout(() => { selectTile(g); const t = app.querySelector(`.tile[data-id="${g.id}"]`); if (t) t.scrollIntoView({ block: 'nearest', behavior: V.fxOn() ? 'smooth' : 'auto' }); }, 180);
      });
      el.querySelectorAll('[data-prof]').forEach(b => b.onclick = () => { V.sfx.ui(); V.online.profile(b.dataset.prof); });
      el.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { V.sfx.ui(); V.online.challenge(b.dataset.play); });
      el.querySelectorAll('[data-watchf]').forEach(b => b.onclick = () => { V.sfx.ui(); V.online.watch(b.dataset.watchf); });
    }
    function toggle() {
      if (!wide() || forced()) return;
      settings.side = settings.side === 'rail' ? 'open' : 'rail'; saveSettings(); V.sfx.ui();
      render();
    }
    return { render, toggle };
  })();

  // ---------- home ----------
  // The home shell (header + tab bar) stays on screen; switching tabs only swaps the content below it.
  function home(tab, sel) {
    V.discord.status(V.t('Im Menü'), V.t('Sucht ein Spiel aus'), null);
    if (sel) selected = sel;
    if (!selected) selected = V.byId[S.get('recent')] || V.games[0];
    const prev = homeTab;
    if (tab && tab !== homeTab && view === 'home' && !hist.moving) { hist.back.push([homeTab, homeSpot]); hist.back.splice(0, hist.back.length - 30); hist.fwd.length = 0; }
    if (tab) homeTab = tab;
    const shell = view === 'home' && !current && app.querySelector('.view.home');
    if (shell) { swapTab(shell, prev); navBtns(); side.render(); return; }
    destroyCurrent(); view = 'home';
    if (V.cloud) V.cloud.touch(null);
    const tb = ([id, l, ic]) => `<button data-tab="${id}" class="${homeTab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`;
    // phone: a floating bar with four tabs and the raised quick match button in the middle (options sit in the head);
    // laptop: the areas are in the sidebar
    const bar = TABS.filter(t => t[0] !== 'opts').map(tb);
    bar.splice(2, 0, `<button class="qbtn" id="qbtn" aria-label="Schnelles Spiel"><span>${IC.boltf}</span></button>`);
    const v = mount(`<div class="view home">${appHead()}${header()}<div class="hbody">${tabBody()}</div><nav class="tabs bar" aria-label="Bereiche"><i class="tab-ind"></i>${bar.join('')}</nav><i class="fade-t" aria-hidden="true"></i><i class="fade-b" aria-hidden="true"></i></div>`);
    wireHeader(v);
    v.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== homeTab) { V.sfx.ui(); home(b.dataset.tab); } });
    v.querySelector('#qbtn').onclick = () => { V.sfx.ui(); quickGo(); };
    placeInd(v, false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(v, false));
    wireBody(v.querySelector('.hbody'));
    updateBar();
  }
  // the raised button in the tab bar: same search as "Schnelles Spiel" in the Online tab
  function quickGo() {
    if (!V.cloud || !V.cloud.available() || !V.online) return toast('Online-Spiele sind gleich da');
    if (navigator.onLine === false) return toast('Du bist offline');
    // first the choice of game (with the last one picked), then the search
    V.online.quickSheet();
  }
  function offlineTab() {
    return `<section class="page"><div class="empty">${IC.wifioff}<b>Du bist offline</b><p>Freunde, Herausforderungen und Ranglisten brauchen Internet. Gegen die KI oder zu zweit an einem Gerät kannst du trotzdem spielen.</p><button class="btn primary" data-tab="games"><span>Zu den Spielen</span></button></div></section>`;
  }
  function tabBody() { return homeTab === 'online' && navigator.onLine === false ? offlineTab() : homeTab === 'stats' ? statsTab() : homeTab === 'opts' ? optsTab() : homeTab === 'profile' ? (V.account ? V.account.tab() : '') : homeTab === 'online' ? (V.online ? V.online.tab() : '') : gamesTab(); }
  function wireBody(b) {
    wireInstall(b);
    if (homeTab === 'games') wireGames(b);
    if (homeTab === 'opts') wireOpts(b);
    if (homeTab === 'stats') { countUp(b); wireStats(b); }
    if (homeTab === 'profile' && V.account) V.account.wire(b);
    if (homeTab === 'online' && V.online) V.online.wire(b);
    b.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { V.sfx.ui(); home(x.dataset.tab); });
    b.querySelectorAll('[data-fb]').forEach(x => x.onclick = () => { V.sfx.ui(); V.feedback.open(); });
    if (V.night) V.night.wire(b);
  }
  // slide the highlight of the active tab to its new place
  function placeInd(root, anim) {
    root.querySelectorAll('.tabs').forEach(n => {
      const ind = n.querySelector('.tab-ind'), on = n.querySelector('button.on');
      // the options tab has no button in the phone bar
      if (ind) ind.style.opacity = on ? '' : '0';
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
    setTimeout(() => { toTop(); put(); }, 130);
  }

  function gamesTab() {
    const count = c => V.games.filter(g => c === 'Alle' || g.cat === c).length;
    const W = wide();
    // laptop: hero, mode tiles and "Weiterspielen" above the library; a search hides them and shows the hits
    return `<div class="select">
      <section class="sel-main">
        ${W ? `<div id="gtop"${homeQuery.trim() ? ' hidden' : ''}>${heroCarousel()}${modeTiles()}${dailyCard()}<div id="gcont">${contRow()}</div>${installCard()}</div>
        <div class="lhead"><h2 class="lh">Bibliothek<small>${V.games.length}</small></h2>
          <div class="lview" role="group" aria-label="Ansicht">${[['grid', 'Kacheln', IC.grid], ['list', 'Liste', IC.book]].map(([k, l, ic]) => `<button data-lv="${k}" class="${libView() === k ? 'on' : ''}" aria-pressed="${libView() === k}" title="${l}" aria-label="${l}">${ic}</button>`).join('')}</div></div>`
        : `<h1 class="ah-big">Bereit fürs Duell?</h1>${heroCarousel()}<div id="gcont">${contPhone()}</div>${dailyCard()}${quickTiles()}<div id="gfr">${friendsRow()}</div>`}
        <div class="gfind">
          <div class="gsrow">
            ${W ? '' : `<label class="gsearch">${IC.search}<input id="gq" type="search" placeholder="Spiel suchen" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Spiel suchen" value="${escA(homeQuery)}"><kbd class="only-fine">/</kbd><button class="gclear" id="gqx" aria-label="Suche löschen"${homeQuery ? '' : ' hidden'}>${IC.x}</button></label>`}<button class="iconbtn gsurp" id="gsurp" aria-label="Überrasch mich" title="Überrasch mich">${IC.dice}</button></div>
          <div class="chips" role="tablist">${['Alle', ...V.CATS].map(c => `<button role="tab" data-f="${c}" class="${homeFilter === c && !homeQuery ? 'on' : ''}">${c}<small>${count(c)}</small></button>`).join('')}</div>
        </div>
        <div id="glist">${gameList()}</div>
        <div class="optlist small dcom">${V.night ? V.night.row() : ''}
          ${inDiscord() ? '' : `<a class="opt" href="${V.DISCORD}" target="_blank" rel="noopener">${IC.chat}<span><b>Community auf Discord</b><small>Mitspieler finden, Ideen teilen und Bugs melden</small></span></a>`}
          <button class="opt" data-fb="1">${IC.bulb}<span><b>Feedback senden</b><small>Fehler gefunden oder eine Idee? Direkt ans Team</small></span></button></div>
      </section>
      <aside class="sel-panel" id="panel"></aside>
    </div>`;
  }
  // ---------- phone home: hero carousel and quick buttons ----------
  // Cards: continue the last game, the most played online game (or 4 Gewinnt), a game for up to four (Ludo).
  // Guests only get games they can play. An install card joins when the browser offers it.
  let homeHero = 0, heroT = null;
  function heroCards() {
    const cards = [], ok = g => g && !locked(g);
    const rg = V.byId[S.get('recent')];
    if (ok(rg)) {
      const c = loadCfg(rg), s = P.stats[rg.id], r = s && c.mode === 'ai' ? s.ai[c.level] : null;
      const how = c.mode === 'local' ? 'Am Gerät' : c.mode === 'ai' ? 'Gegen KI · ' + V.LEVELS[c.level] : c.mode === 'voice' ? 'Mit dem Sprachkanal' : 'Online';
      cards.push({ g: rg, kick: 'Weiterspielen', sub: how + (r && r.w + r.l ? ` · ${r.w}:${r.l}` : ''), act: 'cont' });
    }
    let pop = null, most = 0;
    for (const id in P.stats) { const o = P.stats[id].on, n = o ? o.w + o.l + o.d : 0; if (n > most && V.byId[id] && V.byId[id].online) { most = n; pop = V.byId[id]; } }
    if (!ok(pop)) pop = V.byId.c4;
    if (ok(pop) && pop !== rg) cards.push(inDiscord() ? { g: pop, kick: 'Mit dem Sprachkanal', sub: 'Gegen jemanden im Kanal', act: 'open' } : { g: pop, kick: 'Beliebt online', sub: 'Gegen echte Gegner', act: 'open' });
    const four = ok(V.byId.ludo) ? V.byId.ludo : V.byId.pong;
    if (inDiscord() && ok(V.byId.ludo) && !cards.some(c => c.g === V.byId.ludo)) cards.push({ g: V.byId.ludo, kick: 'Mit dem Sprachkanal', sub: 'Jeder auf seinem Gerät', act: 'voice' });
    else if (!inDiscord() && ok(four) && !cards.some(c => c.g === four)) cards.push(four.party ?{ g: four, kick: 'Bis zu vier', sub: 'Ein Handy, vier Spieler', act: 'local' } : { g: four, kick: 'Zu zweit', sub: 'Jeder auf seiner Hälfte', act: 'local' });
    if (installOffer()) cards.push({ inst: true, kick: 'App', name: 'Als App holen', sub: 'Schneller Start, auch offline' });
    return cards;
  }
  function heroCarousel() {
    const cards = heroCards(); if (!cards.length) return '';
    homeHero = Math.min(homeHero, cards.length - 1);
    // laptop: a wide card with its own buttons (Spielen, Online suchen), the game picture turned a bit on the right
    const wideCard = (c, k) => {
      const name = c.inst ? c.name : c.g.name, net = !c.inst && (c.g.online || c.g.table) && V.cloud && V.cloud.available() && !inDiscord();
      return `<div class="hcard hw${k === homeHero ? ' on' : ''}" data-k="${k}" ${c.inst ? 'data-do="install"' : `data-id="${c.g.id}" data-act="${c.act}"`} style="--acc:${c.inst ? 'var(--cyan)' : c.g.accent || 'var(--pink)'}" role="group" aria-roledescription="Karte" aria-label="${escA(name)}">
        <i class="hc-st"></i>
        <span class="hc-tx"><em class="hc-k">${c.kick}</em><b>${name}</b><small>${c.inst ? c.sub : c.g.short}</small>
          <span class="hc-btns"><button class="hb-play" data-hb="play" tabindex="${k === homeHero ? 0 : -1}">${c.inst ? IC.dl + 'Installieren' : IC.play + 'Spielen'}<kbd>Enter</kbd></button>${net ? `<button class="hb-on" data-hb="online" tabindex="${k === homeHero ? 0 : -1}">${IC.globe}Online suchen</button>` : ''}</span></span>
        <span class="hc-ic">${c.inst ? IC.dl : c.g.icon}</span></div>`;
    };
    if (wide()) return `<div class="hero hwide" id="hero" tabindex="0" aria-label="Empfehlungen, Pfeiltasten wechseln"><div class="hero-tr" style="--i:${homeHero}">${cards.map(wideCard).join('')}</div>
      ${cards.length > 1 ? `<div class="hero-dots">${cards.map((_, k) => `<button class="${k === homeHero ? 'on' : ''}" data-dot="${k}" aria-label="Karte ${k + 1}"></button>`).join('')}</div>` : ''}</div>`;
    const card = (c, k) => {
      const acc = c.inst ? 'var(--cyan)' : c.g.accent || 'var(--pink)', name = c.inst ? c.name : c.g.name;
      return `<button class="hcard${k === homeHero ? ' on' : ''}" data-k="${k}" ${c.inst ? 'data-do="install"' : `data-id="${c.g.id}" data-act="${c.act}"`} style="--acc:${acc}" tabindex="${k === homeHero ? 0 : -1}">
        <i class="hc-st"></i><i class="hc-dk"></i><i class="hc-gl"></i><i class="hc-sh"></i>
        <span class="hc-ic">${c.inst ? IC.dl : c.g.icon}</span>
        <span class="hc-tx"><em class="hc-k">${c.kick}</em><b class="${name.length > 11 ? 'long' : name.length > 8 ? 'mid' : ''}">${name}</b><small>${c.sub}</small>
          <span class="hc-go"><i>${c.inst ? IC.dl : IC.play}</i>${c.inst ? 'Installieren' : 'Spielen'}</span></span></button>`;
    };
    return `<div class="hero" id="hero"><div class="hero-tr" style="--i:${homeHero}">${cards.map(card).join('')}</div>
      ${cards.length > 1 ? `<div class="hero-dots">${cards.map((_, k) => `<i class="${k === homeHero ? 'on' : ''}"></i>`).join('')}</div>` : ''}</div>`;
  }
  function quickTiles() {
    const qt = (id, cls, ic, label, live) => `<button class="qtile ${cls}" id="${id}"><span class="qt-ic">${ic}</span>${live ? '<i class="live"></i>' : ''}<b>${label}</b></button>`;
    // in Discord the middle tile plays with the voice channel instead of two players on one device
    return `<div class="qtiles">${qt('qt_quick', 'c', IC.boltf, 'Schnelles Spiel', true)}${inDiscord() ? qt('qt_voice', 'y', IC.users, 'Sprachkanal') : qt('qt_local', 'y', IC.users, 'Am Gerät')}${qt('qt_ai', 'p', IC.robot, 'Gegen KI')}</div>`;
  }
  // laptop: four mode tiles under the hero (same actions as the phone tiles, plus a game link to share)
  function modeTiles() {
    const mt = (id, cls, ic, label, sub) => `<button class="mtile ${cls}" id="${id}"><span class="mt-ic">${ic}</span><span class="mt-tx"><b>${label}</b><small>${sub}</small></span></button>`;
    const net = V.cloud && V.cloud.available();
    // every tile says which game it starts (the last one played that fits, otherwise 4 Gewinnt)
    const roomG = (r => r && r.online && !locked(r) ? r : V.byId.c4)(V.byId[S.get('recent')]);
    return `<div class="mtiles">${mt('qt_quick', 'c', IC.boltf, 'Schnelles Spiel', net && V.online && V.online.quickName ? V.online.quickName() : 'Gleich da')}
      ${inDiscord() ? mt('qt_voice', 'y', IC.users, 'Sprachkanal', 'Mit allen im Kanal') : mt('qt_local', 'y', IC.users, 'Am Gerät', lastFor('local').name + ' an einem Gerät')}
      ${mt('qt_ai', 'p', IC.robot, 'Gegen KI', lastFor('ai').name)}
      ${net && !inDiscord() ? mt('qt_room', 'g', IC.link, 'Raum erstellen', 'Link für ' + roomG.name) : ''}</div>`;
  }
  // laptop: the running match, my table and matches over days, with a bar for how far it is
  let contList = [];
  function contRow() {
    const list = V.online && V.online.resumables ? V.online.resumables() : [];
    const q = norm(homeQuery.trim());
    const rows = contList = list.filter(r => !q || norm(V.byId[r.game].name).includes(q)).slice(0, 4);
    if (!rows.length) return '';
    return `<section class="cont-w"><h2 class="gh">Weiterspielen<small>${rows.length}</small></h2><div class="crow-w">${rows.map((r, k) => {
      const g = V.byId[r.game], st = r.table ? (r.turn ? 'Tisch läuft' : 'Tisch wartet') : r.live ? 'online · läuft' : r.turn ? 'online · du bist dran' : 'online · wartet auf ' + escA(r.opp);
      return `<button class="ccard${r.turn ? ' turn' : ''}" data-cont="${k}" style="--acc:${g.accent || 'var(--pink)'}"><span class="cc-ic">${g.icon}</span>
        <span class="cc-tx"><b>${g.name}${r.opp ? ` <i>gegen ${escA(r.opp)}</i>` : ''}</b><small>${st}${r.moves ? ' · Zug ' + r.moves : ''}</small>
          <i class="cc-bar"><i style="--w:${Math.min(100, Math.round(((r.moves || 0) + 4) / 44 * 100))}%"></i></i></span></button>`;
    }).join('')}</div></section>`;
  }
  function contRefresh() {
    const c = app.querySelector('#gcont'); if (!c) return;
    c.innerHTML = wide() ? contRow() : contPhone(); wireCont(c);
  }
  // phone: one big card for the most urgent open match (diagonal yellow and dark)
  function contPhone() {
    contList = (V.online && V.online.resumables ? V.online.resumables() : []).slice(0, 1);
    const r = contList[0]; if (!r) return '';
    const g = V.byId[r.game], st = r.table ? (r.turn ? 'Tisch läuft' : 'Tisch wartet') : r.live ? 'Läuft gerade' : r.turn ? 'Du bist dran' : 'Wartet auf ' + escA(r.opp);
    return `<button class="ccard-p" data-cont="0" style="--acc:${g.accent || 'var(--pink)'}"><span class="cp-tx"><em class="hc-k">Weiterspielen</em><b>${g.name}</b><small>${r.opp ? 'gegen ' + escA(r.opp) + ' · ' : ''}${st}</small></span><span class="cp-ic">${g.icon}</span></button>`;
  }
  // phone: friends as round avatars (online first), then a dashed circle to add more
  function friendsRow() {
    const u = V.cloud && V.cloud.available() && V.cloud.user();
    if (!u || u.anon || !V.online || !V.online.sideFriends) return '';
    const fr = V.online.sideFriends().slice().sort((a, b) => b.online - a.online).slice(0, 8);
    const ring = ['var(--pink)', 'var(--yellow)', 'var(--cyan)', 'var(--good)'];
    return `<section class="frs"><h2 class="gh">Freunde${fr.some(f => f.online) ? `<small class="good">${fr.filter(f => f.online).length} online</small>` : ''}</h2><div class="frs-l">
      ${fr.map((f, k) => `<button class="frs-a${f.online ? ' on' : ''}" data-prof="${escA(f.name)}" style="--fc:${ring[k % 4]}"><span>${escA(f.name.slice(0, 2).toUpperCase())}<i></i></span><small>${escA(f.name)}</small></button>`).join('')}
      <button class="frs-a add" id="frsadd"><span>${IC.plus}</span><small>Einladen</small></button></div></section>`;
  }
  function friendsRefresh() {
    const c = app.querySelector('#gfr'); if (!c || wide() || view !== 'home' || homeTab !== 'games') return;
    c.innerHTML = friendsRow(); wireFriends(c);
  }
  function wireFriends(c) {
    c.querySelectorAll('[data-prof]').forEach(b => b.onclick = () => { V.sfx.ui(); V.online.profile(b.dataset.prof); });
    const a = c.querySelector('#frsadd'); if (a) a.onclick = () => { V.sfx.ui(); V.online.addFriends(); };
  }
  // ---------- Spiel des Tages ----------
  // No competition: the game comes from your own games (favourites, recently and often played) when you have some,
  // otherwise from a few classics; it runs at your own level for that game and can be swapped. Playing it to the end
  // counts (winning is not needed). Days in a row make a series; one missed day a week is forgiven (Serienschutz).
  // Kept in versus.dailyCh and synced with the account (js/cloud.js).
  const DAILY_POOL = ['c4', 'dots', 'ships', 'reversi', 'kalaha', 'mill', 'checkers', 'gomoku', 'hex', 'uttt', 'ttt3', 'backgammon'];
  const dkey = d => d.toLocaleDateString('sv');
  const dayAgo = n => dkey(new Date(Date.now() - n * 864e5));
  const playable = g => g && !g.noAI && !locked(g);
  function dailyPool() {
    const n = id => { const s = P.stats[id]; return s ? s.ai.reduce((a, r) => a + r.w + r.l + r.d, 0) : 0; };
    const often = Object.keys(P.stats).filter(id => n(id) >= 2).sort((a, b) => n(b) - n(a));
    const own = [...new Set([...favs(), ...S.get('recents', []), ...often])].map(id => V.byId[id]).filter(playable);
    // fewer than three own games: a few classics join behind them, so there is always something to swap to
    const list = own.length >= 3 ? own : [...new Set([...own, ...DAILY_POOL.map(id => V.byId[id]).filter(playable)])];
    return { own, list };
  }
  // the series is still alive when the last counted day was yesterday, or the day before with the weekly protection free
  const freeOk = st => !st.freeAt || st.freeAt < dayAgo(7);
  function daily() {
    const key = dkey(new Date()), pool = dailyPool();
    if (!pool.list.length) return null;
    let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const st = S.get('dailyCh', {}), sw = st.swapDay === key ? st.swap || 0 : 0;
    const g = pool.list[(h + sw) % pool.list.length];
    const alive = st.last === key || st.last === dayAgo(1) || (st.last === dayAgo(2) && freeOk(st));
    return { key, g, own: pool.own.includes(g), many: pool.list.length > 1, level: loadCfg(g).level, done: st.last === key, streak: alive ? st.streak || 0 : 0, best: st.best || 0 };
  }
  function dailySwap() {
    const st = S.get('dailyCh', {}), key = dkey(new Date());
    st.swap = st.swapDay === key ? (st.swap || 0) + 1 : 1; st.swapDay = key; S.set('dailyCh', st);
  }
  // the game of the day was played to the end: counts once a day, returns the series (0 if it was already counted)
  function dailyDone(key) {
    const st = S.get('dailyCh', {});
    if (key !== dkey(new Date()) || st.last === key) return 0;
    if (st.last === dayAgo(1)) st.streak = (st.streak || 0) + 1;
    else if (st.last === dayAgo(2) && freeOk(st)) { st.streak = (st.streak || 0) + 1; st.freeAt = key; }
    else st.streak = 1;
    st.last = key; st.best = Math.max(st.best || 0, st.streak);
    S.set('dailyCh', st);
    return st.streak;
  }
  function playDaily() {
    const t = daily(); if (!t) return;
    const cfg = loadCfg(t.g); cfg.mode = 'ai'; cfg.daily = t.key;
    V.sfx.go(); V.buzz(12); play(t.g, cfg);
  }
  function dailyCard() {
    const t = daily(); if (!t || inDiscord()) return '';
    const day = new Date().toLocaleDateString(V.locale(), { weekday: 'short' });
    const flame = `<span class="dc-st${t.streak ? ' on' : ''}" title="Serie">${IC.bolt}<b>${t.streak}</b><small>${t.streak === 1 ? 'Tag' : 'Tage'}</small></span>`;
    return `<section class="dch-w"><div class="dch${t.done ? ' done' : ''}" style="--acc:${t.g.accent || 'var(--pink)'}">
      <button class="dc-main" id="dch"><span class="dc-ic">${t.g.icon}${t.done ? `<i class="dc-ok">${IC.check}</i>` : ''}</span>
        <span class="dc-tx"><em>Spiel des Tages · ${day}</em><b>${t.done ? 'Erledigt' : t.g.name}</b>
          <small>${t.done ? 'Morgen geht es weiter' : `<i class="lvt l${t.level}">${V.LEVELS[t.level]}</i>${t.own ? 'Aus deinen Spielen' : 'Einmal durchspielen'}`}</small></span></button>
      ${t.many && !t.done ? `<button class="dc-sw" id="dcsw" aria-label="Anderes Spiel" title="Anderes Spiel">${IC.dice}</button>` : ''}
      ${flame}</div></section>`;
  }
  const wireDaily = v => {
    const b = v.querySelector('#dch'); if (b) b.onclick = playDaily;
    const sw = v.querySelector('#dcsw');
    if (sw) sw.onclick = () => { dailySwap(); V.sfx.tick(); const w = v.querySelector('.dch-w'); w.outerHTML = dailyCard(); wireDaily(v); const n = v.querySelector('.dch'); if (n && V.fxOn()) V.fx.pop(n, 'fx-pop'); };
  };

  // ---------- Abzeichen ----------
  // A collection to look at, not a race: each one can be reached in many ways, none needs a win or a certain game.
  // Earned ones keep their date (versus.badges, synced with the account).
  const BADGES = [
    ['first', 'play', 'Los geht’s', 'Deine erste Partie', c => c.total >= 1],
    ['duo', 'users', 'Zu zweit', '5 Partien an einem Gerät', c => c.local >= 5],
    ['ai10', 'robot', 'Maschinenflüsterer', '10 Partien gegen die KI', c => c.ai >= 10],
    ['online', 'globe', 'Online dabei', 'Eine Online-Partie', c => c.on >= 1],
    ['curious', 'spark', 'Neugierig', '5 verschiedene Spiele ausprobiert', c => c.tried >= 5],
    ['fav', 'star', 'Lieblingsspiel', 'Ein Spiel 25-mal gespielt', c => c.most >= 25],
    ['draw', 'flag', 'Gleichstand', '5 Unentschieden', c => c.draws >= 5],
    ['d3', 'bolt', 'Dranbleiben', 'Spiel des Tages 3 Tage in Folge', c => c.best >= 3],
    ['d7', 'bolt', 'Eine Woche', 'Spiel des Tages 7 Tage in Folge', c => c.best >= 7],
    ['d30', 'trophy', 'Ein Monat', 'Spiel des Tages 30 Tage in Folge', c => c.best >= 30],
    ['owl', 'clock', 'Nachteule', 'Eine Partie zwischen 0 und 4 Uhr', c => c.hour >= 0 && c.hour < 4],
    ['early', 'clock', 'Frühaufsteher', 'Eine Partie zwischen 5 und 7 Uhr', c => c.hour >= 5 && c.hour < 7]
  ];
  function badgeCtx(hour = -1) {
    const c = { total: 0, local: 0, ai: 0, on: 0, tried: 0, most: 0, draws: 0, best: (S.get('dailyCh', {}).best || 0), hour };
    for (const id in P.stats) {
      const s = P.stats[id], on = s.on || { w: 0, l: 0, d: 0 };
      const ai = s.ai.reduce((a, r) => a + r.w + r.l + r.d, 0), lo = s.local.a + s.local.b + s.local.d, o = on.w + on.l + on.d, n = ai + lo + o;
      c.ai += ai; c.local += lo; c.on += o; c.total += n; if (n) c.tried++; c.most = Math.max(c.most, n);
      c.draws += s.ai.reduce((a, r) => a + r.d, 0) + s.local.d + on.d;
    }
    return c;
  }
  // checks after a match (hour: when it ended) and on the Bilanz page; returns the newly earned ones
  function badgeCheck(hour) {
    const have = S.get('badges', {}), c = badgeCtx(hour), fresh = [];
    BADGES.forEach(b => { if (!have[b[0]] && b[4](c)) { have[b[0]] = dkey(new Date()); fresh.push(b); } });
    if (fresh.length) S.set('badges', have);
    return fresh.map(b => ({ id: b[0], ic: IC[b[1]], t: b[2], d: b[3] }));
  }
  function badgePanel() {
    badgeCheck();
    const have = S.get('badges', {}), n = BADGES.filter(b => have[b[0]]).length;
    return `<div class="apanel sbadges"><h3>Abzeichen<small>${n} von ${BADGES.length}</small></h3>
      <div class="bdg-grid">${BADGES.map(([id, ic, t, d]) => `<div class="bdg${have[id] ? ' on' : ''}" title="${escA(d)}"><span class="bdg-ic">${IC[ic]}</span><b>${t}</b><small>${have[id] ? new Date(have[id]).toLocaleDateString(V.locale(), { day: 'numeric', month: 'short' }) : d}</small></div>`).join('')}</div>
      ${guest() || !(V.cloud && V.cloud.user()) ? '<p class="fine">Mit einem kostenlosen Konto sind Abzeichen und Serie auf jedem Gerät dabei.</p>' : ''}</div>`;
  }
  function wireCont(c) {
    c.querySelectorAll('[data-cont]').forEach(b => b.onclick = () => { const r = contList[+b.dataset.cont]; if (!r) return; V.sfx.ui(); b.classList.add('busy'); V.online.resumeAny(r); });
  }
  // library view on the laptop: big cards or the compact list
  const libView = () => S.get('libView', 'grid');
  // the game for "Zu zweit" and "Gegen KI": the last one played if it fits, otherwise 4 Gewinnt
  function lastFor(mode) {
    const g = V.byId[S.get('recent')];
    return g && !locked(g) && !(mode === 'ai' && g.noAI) ? g : V.byId.c4;
  }
  function setMode(g, mode) { const c = loadCfg(g); c.mode = mode; saveCfg(g, c); }
  function wireHero(v) {
    const h = v.querySelector('#hero');
    v.querySelector('#qt_quick') && (v.querySelector('#qt_quick').onclick = () => { V.sfx.ui(); quickGo(); });
    v.querySelector('#qt_local') && (v.querySelector('#qt_local').onclick = () => { const g = lastFor('local'); V.sfx.ui(); setMode(g, 'local'); setup(g); });
    v.querySelector('#qt_ai') && (v.querySelector('#qt_ai').onclick = () => { const g = lastFor('ai'); V.sfx.ui(); setMode(g, 'ai'); setup(g); });
    v.querySelector('#qt_voice') && (v.querySelector('#qt_voice').onclick = () => { const r = lastFor('voice'), g = r.table || r.online ? r : V.byId.ludo; V.sfx.ui(); setMode(g, 'voice'); setup(g); });
    // a game link for the last online game (or 4 Gewinnt): whoever opens it plays against you
    v.querySelector('#qt_room') && (v.querySelector('#qt_room').onclick = () => { const r = V.byId[S.get('recent')], g = r && r.online && !locked(r) ? r : V.byId.c4; V.sfx.ui(); if (V.online) V.online.linkInvite(g, loadCfg(g).opts); });
    const gc = v.querySelector('#gcont'); if (gc) wireCont(gc);
    if (!h) return;
    const tr = h.querySelector('.hero-tr'), cards = [...h.querySelectorAll('.hcard')], dots = [...h.querySelectorAll('.hero-dots > *')];
    const go = (k, sound) => {
      homeHero = (k + cards.length) % cards.length;
      tr.style.setProperty('--i', homeHero);
      cards.forEach((c, j) => { c.classList.toggle('on', j === homeHero); if (c.tagName === 'BUTTON') c.tabIndex = j === homeHero ? 0 : -1; c.querySelectorAll('[data-hb]').forEach(b => b.tabIndex = j === homeHero ? 0 : -1); });
      dots.forEach((d, j) => d.classList.toggle('on', j === homeHero));
      if (sound) V.sfx.tick();
    };
    cards.forEach(c => c.onclick = e => {
      if (+c.dataset.k !== homeHero) return go(+c.dataset.k, true);
      // the wide laptop card acts only through its buttons
      const hb = e.target.closest('[data-hb]');
      if (c.classList.contains('hw') && !hb) return;
      if (c.dataset.do === 'install') { V.sfx.ui(); return install(); }
      const g = V.byId[c.dataset.id]; V.sfx.ui();
      if (hb && hb.dataset.hb === 'online') { setMode(g, 'open'); return setup(g); }
      if (c.dataset.act === 'cont') { const cf = loadCfg(g); if (cf.mode !== 'voice' && !(cf.mode === 'ai' && g.noAI)) return play(g, cf); }
      if (c.dataset.act === 'open' && g.online && V.cloud && V.cloud.available()) setMode(g, inDiscord() ? 'voice' : 'open');
      if (c.dataset.act === 'local' || c.dataset.act === 'voice') setMode(g, c.dataset.act);
      setup(g);
    });
    // swipe: from 40 px the card changes, and the click at the end of the swipe is swallowed
    let x0 = null, y0 = 0, dx = 0, id = null, swiped = 0;
    h.addEventListener('pointerdown', e => { if (e.button > 0 || cards.length < 2) return; x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; });
    h.addEventListener('pointermove', e => {
      if (e.pointerId !== id || x0 == null) return;
      dx = e.clientX - x0;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - y0)) { h.classList.add('drag'); tr.style.setProperty('--dx', dx + 'px'); }
    });
    const up = e => {
      if (e.pointerId !== id) return;
      id = null; x0 = null; h.classList.remove('drag'); tr.style.setProperty('--dx', '0px');
      if (Math.abs(dx) > 40) { swiped = performance.now(); go(homeHero + (dx < 0 ? 1 : -1), true); }
    };
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    h.addEventListener('click', e => { if (performance.now() - swiped < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
    // laptop: dots to click, arrow keys and Enter while the hero has the focus
    h.querySelectorAll('[data-dot]').forEach(d => d.onclick = e => { e.stopPropagation(); go(+d.dataset.dot, true); });
    h.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); go(homeHero + (e.key === 'ArrowLeft' ? -1 : 1), true); }
      else if (e.key === 'Enter' && e.target === h) { e.preventDefault(); e.stopPropagation(); const b = cards[homeHero].querySelector('[data-hb]'); (b || cards[homeHero]).click(); }
    });
    // turns on its own (phone every 4.3 s, laptop every 6 s), but not while a sheet is open, in a match, in another tab,
    // with reduced effects or while the mouse is over it
    clearInterval(heroT);
    if (cards.length > 1) heroT = setInterval(() => {
      if (!h.isConnected) return clearInterval(heroT);
      if (modalEl || view !== 'home' || homeTab !== 'games' || !V.fxOn() || document.hidden || h.classList.contains('drag') || h.matches(':hover') || h.contains(document.activeElement)) return;
      go(homeHero + 1);
    }, wide() ? 6000 : 4300);
  }

  // ---------- favourites, recently played, search ----------
  const favs = () => S.get('favs', []).filter(id => V.byId[id]);
  const isFav = g => favs().includes(g.id);
  function toggleFav(g) {
    const on = !isFav(g);
    S.set('favs', on ? [...favs(), g.id] : favs().filter(id => id !== g.id));
    V.sfx.ui(); toast(on ? g.name + ' ist jetzt ein Favorit' : g.name + ' aus Favoriten entfernt');
    refreshList(); side.render();
  }
  const escA = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // other names people search for
  const ALIAS = {
    c4: 'vier gewinnt connect four', yacht: 'kniffel yahtzee würfel', ludo: 'mensch ärgere dich nicht', ladder: 'schlangen und leitern snakes ladders',
    ships: 'battleship', checkers: 'draughts', mill: 'nine mens morris', kalaha: 'mancala bohnen', reversi: 'othello', maumau: 'uno karten',
    poker: 'texas holdem karten chips', memory: 'paare karten', dots: 'dots and boxes', gomoku: 'gomoku', hangman: 'hangman wörter raten',
    slf: 'wörter kategorien', schnapsen: 'sechsundsechzig 66 karten bummerl', guess: 'quiz schätzen wissen zahlen',
    hex: 'verbinden sechseck', ttt3: 'tic tac toe 3d würfel vier in einer reihe qubic', code: 'bulls and cows zahlen raten geheimcode', domino: 'dominosteine', tron: 'snake lightcycle', hockey: 'airhockey', billiard: 'pool 8 ball snooker queue kugeln', draw: 'malen pictionary montagsmaler skribbl zeichnen raten', hardcore: 'ultimate ultimate tic tac toe 729 schwer', reaction: 'reaktion schnell', go: 'baduk weiqi', uttt: 'tic tac toe'
  };
  const norm = s => String(s).toLowerCase().replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]+/g, ' ');
  // every word of the query has to appear somewhere; name hits come first
  function search(q) {
    const words = norm(q).split(' ').filter(Boolean);
    return V.games.map(g => {
      const name = norm(g.name), hay = [name, norm(g.short), norm(g.cat), norm(ALIAS[g.id] || ''), g.party ? 'party bis zu vier 4 spieler' : 'zu zweit duell', g.online ? 'online' : ''].join(' ');
      if (!words.every(w => hay.includes(w))) return null;
      return { g, rank: name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2 };
    }).filter(Boolean).sort((a, b) => a.rank - b.rank).map(x => x.g);
  }

  // Phone, "Alle": one row per category that you swipe sideways, so all games fit on about one and a half screens;
  // "Alle ›" next to a row title opens that category as a grid. Guests see the locked games in the rows too
  // (greyed, with a lock) and one banner for a free account under the first row.
  // Laptop, "Alle": compact tiles in sections (favourites, recently played, then each category); guests get the free
  // games first and the others collected in one "Mit Konto" box.
  // A chosen category shows a grid, a search shows the hits from all categories.
  function gameList() {
    const W = wide(), cmp = W ? (libView() === 'list' ? ' cmp' : ' cards') : '';
    // the entrance stagger restarts in every section, so lower ones do not wait for the ones above
    let i = 0;
    const tiles = (games, cls = cmp) => `<div class="tiles${cls}">${games.map(g => tile(g, i++)).join('')}</div>`;
    const section = (title, games, cls = W ? cmp : ' row', cat) => {
      if (!games.length) return '';
      i = 0;
      return `<section class="grow"><h2 class="gh">${title}<small>${games.length}</small>${cat && !W ? `<button class="gall" data-cat="${cat}">Alle<i>›</i></button>` : ''}</h2>${tiles(games, cls)}</section>`;
    };
    const split = list => [list.filter(g => !locked(g)), list.filter(g => locked(g))];
    const shutAll = V.games.filter(g => locked(g)).length;
    if (homeQuery.trim()) {
      const hits = search(homeQuery), [free, shut] = split(hits);
      if (!hits.length) return `<div class="empty gnone">${IC.search}<b>Kein Spiel gefunden</b><p>Versuch einen anderen Namen oder schau unter Alle.</p><button class="btn sm" data-clear><span>Suche löschen</span></button></div>`;
      return W ? section('Treffer', free, cmp) + lockBox(shut) : section('Treffer', free.concat(shut), cmp) + lockBanner(shut.length);
    }
    const list = V.games.filter(g => homeFilter === 'Alle' || g.cat === homeFilter), [free, shut] = split(list);
    if (homeFilter !== 'Alle') return W ? (free.length ? tiles(free) : '') + lockBox(shut) : tiles(free.concat(shut)) + lockBanner(shut.length);
    if (guest() && W) return section('Sofort spielbar', free) + lockBox(shut);
    if (guest()) return V.CATS.map((c, k) => { const [f, s] = split(list.filter(g => g.cat === c)); return section(c, f.concat(s), undefined, c) + (k ? '' : lockBanner(shutAll)); }).join('');
    const fav = favs().map(id => V.byId[id]);
    const recent = W ? S.get('recents', []).map(id => V.byId[id]).filter(g => g && !locked(g)).slice(0, 3) : [];
    return section(`${IC.star}Favoriten`, fav) + section('Zuletzt gespielt', recent) + V.CATS.map(c => section(c, list.filter(g => g.cat === c), undefined, c)).join('');
  }
  // phone, guests: one banner instead of a box of locked games
  // (new visitors see the games first; the banner comes once a game was played)
  const lockBanner = n => n && totals().total ? `<div class="lockb"><span class="lki">${IC.lock}</span><span class="lb-t"><b>Kostenloses Konto: ${n} Spiele mehr</b><small>Dazu Online-Partien, Freunde und die Rangliste</small></span><button class="btn primary sm" data-tab="profile"><span>Konto erstellen</span></button></div>` : '';
  let homeQuery = '';
  function refreshList() {
    const tl = app.querySelector('#glist'); if (!tl || view !== 'home' || homeTab !== 'games') return;
    tl.innerHTML = gameList();
    wireList(tl);
    // laptop: a search hides the hero and the mode tiles, "Weiterspielen" follows the search
    const top = app.querySelector('#gtop'); if (top) { top.hidden = !!homeQuery.trim(); if (!top.hidden) contRefresh(); }
  }
  function wireList(tl) {
    wireTiles(tl);
    tl.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { V.sfx.ui(); home(x.dataset.tab); });
    const c = tl.querySelector('[data-clear]'); if (c) c.onclick = () => { homeQuery = ''; const q = app.querySelector('#gq'); if (q) { q.value = ''; q.focus(); } const x = app.querySelector('#gqx'); if (x) x.hidden = true; refreshList(); };
    tl.querySelectorAll('.gall').forEach(x => x.onclick = () => { V.sfx.ui(); pickFilter(x.dataset.cat); window.scrollTo({ top: Math.max(0, app.querySelector('.gfind').offsetTop - 70), behavior: V.fxOn() ? 'smooth' : 'auto' }); });
    if (selected) app.querySelectorAll('.tile, .lkg').forEach(t => t.classList.toggle('sel', wide() && t.dataset.id === selected.id));
  }
  function lockBox(games) {
    if (!games.length) return '';
    return `<div class="lockc"><div class="lk-h"><span class="lki">${IC.lock}</span><div><b>Mit Konto: ${games.length} weitere Spiele</b><small>Kostenlos. Dazu Online-Partien, Freunde und die Rangliste.</small></div></div>
      ${wide() && libView() !== 'list' ? `<div class="tiles cards">${games.map((g, k) => tile(g, k)).join('')}</div>` : `<div class="lk-ics">${games.map(g => `<button class="lkg" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'}" aria-label="${g.name} (mit Konto)"><span class="ic">${g.icon}</span><small>${g.name}</small></button>`).join('')}</div>`}
      <button class="btn primary sm" data-tab="profile"><span>${IC.user}Konto erstellen</span></button></div>`;
  }
  function pickFilter(f) {
    homeFilter = f; homeQuery = '';
    const q = app.querySelector('#gq'); if (q) q.value = '';
    const x = app.querySelector('#gqx'); if (x) x.hidden = true;
    app.querySelectorAll('.chips button').forEach(b => b.classList.toggle('on', b.dataset.f === f));
    refreshList();
  }
  function wireGames(v) {
    wireList(v.querySelector('#glist'));
    v.querySelectorAll('.chips button').forEach(b => b.onclick = () => { V.sfx.ui(); pickFilter(b.dataset.f); });
    v.querySelector('#gsurp').onclick = () => surprise();
    v.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
      S.set('libView', b.dataset.lv); V.sfx.ui();
      v.querySelectorAll('[data-lv]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      refreshList();
    });
    if (!wide()) wireSearch(v);
    wireDaily(v);
    const fr = v.querySelector('#gfr'); if (fr) wireFriends(fr);
    wireHero(v);
    if (wide()) renderPanel(v.querySelector('#panel'), selected, false);
  }
  // the game search: in the Spiele tab on the phone, in the app bar on the laptop (typing there from another area
  // jumps to the games). It looks through all categories; Enter picks the first hit, Esc clears.
  function wireSearch(root) {
    const q = root.querySelector('#gq'), qx = root.querySelector('#gqx');
    if (!q) return;
    q.oninput = () => {
      homeQuery = q.value; qx.hidden = !q.value;
      if (view === 'home' && homeTab !== 'games') { homeSpot = 'lib'; return home('games'); }
      app.querySelectorAll('.gfind .chips button').forEach(x => x.classList.toggle('on', !homeQuery.trim() && x.dataset.f === homeFilter));
      refreshList();
    };
    qx.onclick = e => { e.preventDefault(); V.sfx.ui(); q.value = ''; q.oninput(); q.focus(); };
    q.onkeydown = e => {
      const first = app.querySelector('#glist .tile, #glist .lkg');
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (q.value) { q.value = ''; q.oninput(); } else q.blur(); }
      else if (e.key === 'Enter' && first) { e.preventDefault(); q.blur(); if (wide()) { first.focus(); first.click(); } else first.click(); }
      else if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
    };
  }
  function selectTile(g) {
    selected = g;
    app.querySelectorAll('.tile, .lkg').forEach(t => t.classList.toggle('sel', t.dataset.id === g.id));
    const p = app.querySelector('#panel'); if (p) renderPanel(p, g, false);
  }
  function wireTiles(root) {
    root.querySelectorAll('.tile, .lkg').forEach(t => {
      const g = V.byId[t.dataset.id];
      // Laptop: a click only selects the game; the round starts with the Spielen button or Enter.
      t.onclick = e => {
        if (t._held) { t._held = false; e.preventDefault(); return; }
        if (!wide()) { V.sfx.ui(); V.buzz(8); return morph(t, () => setup(g)); }
        if (selected === g && t.classList.contains('sel')) return;
        V.sfx.ui(); morph(t, () => selectTile(g));
      };
      t.addEventListener('focus', () => { if (wide() && selected !== g) selectTile(g); });
      holdToPlay(t, g);
      // laptop: right click for a small menu
      t.addEventListener('contextmenu', e => { if (!wide() || V.coarse) return; e.preventDefault(); ctxMenu(g, e.clientX, e.clientY); });
    });
  }
  // The card's picture grows into the panel (laptop) or the sheet (phone): View Transitions API where the
  // browser has it, otherwise the usual fade. Not with reduced effects.
  function morph(t, fn) {
    const art = t.querySelector('.art');
    if (!document.startViewTransition || !V.fxOn() || !art) return fn();
    art.style.viewTransitionName = 'gart';
    const vt = document.startViewTransition(() => {
      art.style.viewTransitionName = '';
      fn();
      const to = document.querySelector('.gp-art'); if (to) to.style.viewTransitionName = 'gart';
    });
    vt.finished.finally(() => { const to = document.querySelector('.gp-art'); if (to) to.style.viewTransitionName = ''; });
  }
  // right-click menu on a game card (laptop)
  function ctxMenu(g, x, y) {
    document.querySelectorAll('.ctxm').forEach(m => m.remove());
    const net = (g.online || g.table) && V.cloud && V.cloud.available() && !locked(g);
    const items = [['play', IC.play, 'Spielen'], ['fav', IC.star, isFav(g) ? 'Aus Favoriten entfernen' : 'Zu Favoriten'], ['rules', IC.book, 'Regeln'],
      net && g.online ? ['room', IC.globe, 'Online-Raum öffnen'] : null, ['link', IC.link, 'Link kopieren']].filter(Boolean);
    const m = V.el('div', 'ctxm', items.map(([k, ic, l]) => `<button data-c="${k}" role="menuitem">${ic}<span>${l}</span></button>`).join(''));
    m.setAttribute('role', 'menu');
    document.body.appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
    const close = () => { m.remove(); removeEventListener('pointerdown', out, true); removeEventListener('keydown', esc, true); };
    const out = e => { if (!m.contains(e.target)) close(); };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('pointerdown', out, true); addEventListener('keydown', esc, true);
    m.querySelector('button').focus();
    m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      close(); V.sfx.ui();
      const k = b.dataset.c;
      if (k === 'play') { if (locked(g)) return selectTile(g); const c = loadCfg(g); if (c.mode === 'ai' || c.mode === 'local') return play(g, c); return selectTile(g); }
      if (k === 'fav') return toggleFav(g);
      if (k === 'rules') return tutorial(g);
      if (k === 'room') return V.online.linkInvite(g, loadCfg(g).opts);
      if (k === 'link') {
        const url = location.origin + location.pathname + '?game=' + g.id;
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link kopiert'), () => toast(url, 3000));
      }
    });
  }
  // Holding a tile for half a second starts the game at once with its last settings (against the AI or at one
  // device); online modes still open the sheet, because there you pick an opponent first.
  function holdToPlay(t, g) {
    let timer = null, x0 = 0, y0 = 0;
    const stop = () => { clearTimeout(timer); timer = null; t.classList.remove('hold'); };
    t.addEventListener('pointerdown', e => {
      if (e.button > 0 || locked(g)) return;
      x0 = e.clientX; y0 = e.clientY; t.classList.add('hold');
      timer = setTimeout(() => {
        timer = null; t.classList.remove('hold'); t._held = true;
        const cfg = loadCfg(g);
        V.buzz(20);
        if ((cfg.mode === 'ai' && !g.noAI) || cfg.mode === 'local') { V.sfx.go(); play(g, cfg); } else setup(g);
      }, 480);
    });
    t.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) stop(); });
    t.addEventListener('pointerup', stop); t.addEventListener('pointercancel', stop); t.addEventListener('pointerleave', stop);
    t.addEventListener('contextmenu', e => e.preventDefault());
  }
  // "Überrasch mich": a random game that is not the last one played
  function surprise() {
    const pool = V.games.filter(g => !locked(g) && g.id !== S.get('recent'));
    const g = V.pick(pool); if (!g) return;
    V.sfx.go(); toast('Wie wär’s mit ' + g.name + '?');
    if (wide()) { selectTile(g); const t = app.querySelector(`.tile[data-id="${g.id}"]`); if (t) t.scrollIntoView({ block: 'nearest', behavior: V.fxOn() ? 'smooth' : 'auto' }); }
    else setup(g);
  }
  function tile(g, i) {
    const isSel = wide() && selected && selected.id === g.id;
    const lock = locked(g), news = V.NEW_GAMES.includes(g.id);
    // badges: "2–4" for party games, a globe for games you can play online; the record lives in the sheet
    return `<button class="tile${isSel ? ' sel' : ''}${lock ? ' locked' : ''}" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'};--i:${i}">
      <span class="art"><span class="ic">${g.icon}</span>${g.party ? `<em class="bdg n">${IC.users}2–4</em>` : ''}${g.online || g.table ? `<em class="bdg on" title="Online">${IC.globe}</em>` : ''}${lock ? `<span class="lk">${IC.lock}</span>` : ''}</span>
      <span class="tx"><b>${g.name}</b><small>${g.short}</small><small class="pc">${g.party ? '2–4 Spieler' : '2 Spieler'}${g.noAI ? '' : ' · KI'}</small></span>
      <span class="meta">${news && !lock ? '<em class="new">Neu</em>' : ''}</span></button>`;
  }

  // ---------- game panel (desktop side panel and phone setup screen) ----------
  function loadCfg(g) {
    const saved = S.get('setup', {})[g.id] || {};
    // tables: 'table' is a private table for friends ("Freund"), 'tpub' a public one ("Online")
    const tbl = saved.mode === 'table' || saved.mode === 'tpub';
    const cfg = { mode: g.noAI ? (tbl && g.table ? saved.mode : 'local') : ((saved.mode === 'online' || saved.mode === 'open') && !g.online) || (tbl && !g.table) ? 'ai' : (saved.mode || 'ai'), level: saved.level ?? 1, first: saved.first || 'me', opts: {} };
    // inside the Discord activity there are only two modes: against the AI (only you see it) or with the voice channel
    if (inDiscord()) { if (cfg.mode !== 'ai' && cfg.mode !== 'voice') cfg.mode = g.noAI ? 'voice' : 'ai'; if (cfg.mode === 'voice' && !(g.table || g.online)) cfg.mode = 'ai'; }
    else if (cfg.mode === 'voice') cfg.mode = g.noAI ? 'local' : 'ai';
    (g.options || []).forEach(o => { cfg.opts[o.id] = saved.opts && saved.opts[o.id] !== undefined ? saved.opts[o.id] : o.def; });
    // options with their own editor in the panel (g.panelExtra, e.g. the categories of Stadt Land Fluss)
    (g.extraOpts || []).forEach(k => { if (saved.opts && saved.opts[k] !== undefined) cfg.opts[k] = saved.opts[k]; });
    return cfg;
  }
  function saveCfg(g, cfg) { const all = S.get('setup', {}); all[g.id] = cfg; S.set('setup', all); }
  let panelApi = null;

  // ---------- rules: a game's settings as groups (g.options, g.panelExtra, g.presets) ----------
  // The same view lives in the laptop panel, in the phone sheet and in the pause menu (rulesPopup).
  // Option fields: group (players, board, rules, content, time), type 'switch', desc, inline (the mode in which it stands
  // directly in the panel), short(v) for the summary line, modes (the modes it applies to).
  const GROUPS = [['players', 'Spieler'], ['board', 'Spielfeld'], ['rules', 'Regeln'], ['content', 'Inhalte'], ['time', 'Zeit']];
  const netMode = m => m === 'online' || m === 'open';
  // the voice channel in Discord plays like a table or an online duel
  const optMode = (g, mode) => mode === 'voice' ? (g.table ? 'table' : 'online') : mode === 'tpub' ? 'table' : mode;
  const optsIn = (g, mode) => (g.options || []).filter(o => !o.modes || o.modes.includes(optMode(g, mode)));
  const inlineOpt = (g, mode) => optsIn(g, mode).find(o => o.inline === mode);
  const extraIn = (g, mode) => g.panelExtra && !netMode(optMode(g, mode)) ? g.panelExtra : null;
  const valLabel = (o, v) => o.type === 'switch' ? (+v ? 'An' : 'Aus') : ((o.choices || []).find(c => String(c[0]) === String(v)) || [0, String(v)])[1];
  const changedOpt = (o, opts) => String(opts[o.id]) !== String(o.def);
  const presetOf = (g, opts) => (g.presets || []).find(p => Object.entries(p.opts).every(([k, v]) => String(opts[k]) === String(v)));
  const tableMode = (g, mode) => mode === 'table' || mode === 'tpub' || (mode === 'voice' && !!g.table);
  // the options the rules view shows in this mode (the inline one stays in the panel, except in the pause menu)
  const rulesList = (g, mode, all) => { const inl = all ? null : inlineOpt(g, mode); return optsIn(g, mode).filter(o => o !== inl); };
  const hasRules = (g, mode) => tableMode(g, mode) || rulesList(g, mode).length > 0 || !!extraIn(g, mode);
  // "3 Spieler · 7 Karten · 7 zieht zwei aus": the player count first, then what differs from the default (at most 3 parts)
  function summary(g, cfg) {
    const opts = cfg.opts, list = rulesList(g, cfg.mode), parts = [];
    if (tableMode(g, cfg.mode)) parts.push(`Freie Plätze: KI ${V.LEVELS[cfg.level]}`);
    const n = list.find(o => o.id === 'n'); if (n) parts.push(`${opts.n} Spieler`);
    const pre = presetOf(g, opts), changed = [];
    GROUPS.forEach(([k]) => {
      list.filter(o => o.id !== 'n' && (o.group || 'rules') === k && changedOpt(o, opts) && !(pre && o.id in pre.opts))
        .forEach(o => { const t = o.short ? o.short(opts[o.id]) : `${o.label}: ${valLabel(o, opts[o.id])}`; if (t) changed.push(t); });
      const ex = k === 'content' && extraIn(g, cfg.mode); if (ex) { const t = ex.short(opts); if (t) changed.push(t); }
    });
    if (pre) changed.unshift(pre.label);
    if (!changed.length) changed.push('Standard');
    return [...parts, ...changed].slice(0, 3);
  }

  // tiles to pick several things (categories, topics), shared by the games' editors
  const MULTI = {
    html({ items, on, count, add, all }) {
      return `<div class="rm-mh"><span class="rm-cnt">${count}</span>${all ? '<button type="button" class="link" data-all>Alle</button>' : ''}</div>
        <div class="rm-tiles">${items.map(([k, l, own]) => `<button type="button" class="rm-tile${on.includes(k) ? ' on' : ''}" data-c="${escA(k)}" aria-pressed="${on.includes(k)}">${IC.check}<span>${escA(l)}</span>${own ? `<i data-x="${escA(k)}" role="button" tabindex="0" aria-label="${escA(l)} löschen">${IC.x}</i>` : ''}</button>`).join('')}</div>
        ${add ? `<form class="rm-add"><input class="inp" maxlength="${add.max}" placeholder="${add.ph}" aria-label="${add.ph}" autocomplete="off"><button class="btn sm" type="submit"><span>Hinzufügen</span></button></form>` : ''}
        <p class="rm-limit" role="status" hidden></p>`;
    },
    wire(el, h) {
      el.querySelectorAll('[data-x]').forEach(x => {
        const del = e => { e.stopPropagation(); e.preventDefault(); h.remove(x.dataset.x); };
        x.onclick = del; x.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') del(e); };
      });
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => h.toggle(b.dataset.c));
      const a = el.querySelector('[data-all]'); if (a && h.all) a.onclick = h.all;
      const f = el.querySelector('.rm-add'); if (f) f.onsubmit = e => { e.preventDefault(); h.add(f.querySelector('input').value); };
    }
  };
  // topics for a random word or question: none picked means all of them
  function topicsPicker(TOPICS, title, topicsOf) {
    const keys = TOPICS.map(t => t[0]);
    const shown = opts => { const on = topicsOf(opts.topics); return on.length ? on : keys; };
    return {
      title,
      changed: opts => topicsOf(opts.topics).length > 0,
      reset: () => ({ topics: [] }),
      short: opts => { const on = topicsOf(opts.topics); return on.length ? (on.length === 1 ? '1 Thema' : `${on.length} Themen`) : ''; },
      html(opts) {
        const on = topicsOf(opts.topics);
        return MULTI.html({ items: TOPICS, on: shown(opts), count: on.length ? `${on.length} von ${keys.length}` : 'Alle', all: on.length > 0 });
      },
      wire(el, opts, save, warn) {
        const on = shown(opts);
        MULTI.wire(el, {
          toggle(k) {
            if (on.includes(k) && on.length <= 1) return warn('Mindestens 1 Thema');
            const next = on.includes(k) ? on.filter(x => x !== k) : [...on, k];
            save({ topics: next.length === keys.length ? [] : next });
          },
          all() { save({ topics: [] }); }
        });
      }
    };
  }

  // radio groups (modes, levels, choices): the arrow keys move inside the group
  function arrowGroup(group) {
    group.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const bs = [...group.querySelectorAll('[role=radio]')], i = bs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      const n = bs[(i + (e.key === 'ArrowLeft' ? -1 : 1) + bs.length) % bs.length]; n.focus(); n.click();
    });
  }
  const segHtml = (id, o, val, ro) => ro ? `<span class="rv-val">${valLabel(o, val)}</span>`
    : `<div class="mini-seg" role="radiogroup" aria-label="${escA(o.label)}" data-o="${id}">${o.choices.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${String(v) === String(val)}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;

  // o: { mode, back (the arrow at the top), pause (in a match), readOnly (online: the inviter's rules), all (also the inline
  // option), save() after every change, foot (html for the bottom bar), wireFoot(el) }
  function renderRules(el, g, cfg, o) {
    const opts = cfg.opts, ro = !!o.readOnly, list = rulesList(g, o.mode, o.all), ex = extraIn(g, o.mode), tbl = tableMode(g, o.mode);
    const pre = presetOf(g, opts);
    const anyChanged = list.some(x => changedOpt(x, opts)) || (ex && ex.changed(opts));
    const row = x => {
      const v = opts[x.id], ch = changedOpt(x, opts);
      const name = `<b>${x.label}${ch && !ro ? '<i class="rv-dot" role="img" aria-label="geändert"></i>' : ''}</b>${x.desc ? `<small>${x.desc}</small>` : ''}`;
      if (x.type === 'switch' && !ro) return `<button type="button" class="rv-row rv-sw" role="switch" aria-checked="${!!+v}" data-sw="${x.id}"><span class="rv-l">${name}</span><i class="sw${+v ? ' on' : ''}"></i></button>`;
      const wide = !ro && (x.choices.length > 3 || x.choices.reduce((a, c) => a + String(c[1]).length, 0) > 14);
      return `<div class="rv-row${wide ? ' wide' : ''}"><span class="rv-l">${name}</span>${segHtml(x.id, x, v, ro)}</div>`;
    };
    const groups = GROUPS.map(([k, t]) => {
      const rows = list.filter(x => (x.group || 'rules') === k);
      const exHere = k === 'content' && ex;
      if (!rows.length && !exHere) return '';
      const title = k === 'rules' && g.rulesTitle ? g.rulesTitle : exHere && !rows.length ? ex.title : t;
      const gch = rows.some(x => changedOpt(x, opts)) || (exHere && ex.changed(opts));
      return `<section class="rv-g"><div class="rv-gh"><h4 class="gp-h">${title}</h4>${gch && !ro ? `<button type="button" class="link rv-gr" data-gr="${k}">Zurücksetzen</button>` : ''}</div>
        ${rows.length ? `<div class="rv-card">${rows.map(row).join('')}</div>` : ''}
        ${exHere ? (ro ? `<div class="rv-card"><div class="rv-row"><span class="rv-l"><b>${ex.title}</b></span><span class="rv-val">${ex.short(opts) || 'Standard'}</span></div></div>` : `<div class="rv-multi" id="rvx">${rows.length ? `<h5>${ex.title}</h5>` : ''}${ex.html(opts)}</div>`) : ''}</section>`;
    }).join('');
    const level = tbl ? `<section class="rv-g"><div class="rv-gh"><h4 class="gp-h">KI auf freien Plätzen</h4></div>
      ${ro ? `<div class="rv-card"><div class="rv-row"><span class="rv-l"><b>KI-Stärke</b></span><span class="rv-val">${V.LEVELS[cfg.level]}</span></div></div>`
        : `<div class="lv-row" role="radiogroup" aria-label="KI-Stärke" id="rvlvl">${V.LEVELS.map((l, i) => `<button type="button" role="radio" data-v="${i}" class="lvb l${i}${i === cfg.level ? ' on' : ''}" aria-checked="${i === cfg.level}"><b>${l}</b></button>`).join('')}</div>`}</section>` : '';
    const presets = g.presets && !ro ? `<div class="rv-pre" role="radiogroup" aria-label="Vorlagen" style="--n:${g.presets.length + 1}">
      ${g.presets.map(p => `<button type="button" role="radio" data-pre="${p.id}" aria-checked="${pre === p}" class="${pre === p ? 'on' : ''}">${p.label}</button>`).join('')}
      <button type="button" role="radio" aria-checked="${!pre}" aria-disabled="true" class="${pre ? '' : 'on'}" tabindex="-1">Eigene</button></div>` : '';
    // redrawn after every change: the scroll position and the focused control stay where they were
    const focusSel = a => {
      if (!a || !el.contains(a)) return null;
      for (const k of ['sw', 'pre', 'c', 'gr']) if (a.dataset[k] != null) return `[data-${k}="${CSS.escape(a.dataset[k])}"]`;
      const p = a.parentElement;
      if (a.dataset.v != null && p) return p.dataset.o ? `[data-o="${p.dataset.o}"] [data-v="${a.dataset.v}"]` : p.id ? `#${p.id} [data-v="${a.dataset.v}"]` : null;
      return a.id ? '#' + a.id : null;
    };
    const sc = el.querySelector('.rv-body'), top = sc ? sc.scrollTop : 0, keep = focusSel(document.activeElement);
    el.innerHTML = `<div class="rvw${o.pause ? ' pz' : ''}">
      <div class="rv-head">${o.pause ? `<span class="rv-pzm">${IC.sliders}</span>` : `<button type="button" class="iconbtn rv-back" id="rvback" aria-label="Zurück">${IC.back}</button>`}
        <div class="rv-t"><h3>${ro ? 'So wird gespielt' : 'Regeln'}</h3><small>${escA(g.name)}</small></div>
        ${ro ? '' : `<button type="button" class="btn sm ghost" id="rvstd"${anyChanged ? '' : ' disabled'}><span>Standard</span></button>`}</div>
      <div class="rv-body">${o.pause && !ro ? '<p class="rv-note">Änderungen gelten ab dem nächsten Start.</p>' : ''}${ro ? '<p class="rv-note">Die Regeln hat festgelegt, wer eingeladen hat.</p>' : ''}${presets}${level}${groups}</div>
      ${o.foot ? `<div class="gp-go rv-foot">${o.foot}</div>` : ''}</div>`;
    const body = el.querySelector('.rv-body'); if (top) body.scrollTop = top;
    if (keep) { const k = el.querySelector(keep); if (k) k.focus({ preventScroll: true }); }
    const done = () => { o.save(); V.sfx.ui(); renderRules(el, g, cfg, o); };
    const b = el.querySelector('#rvback'); if (b) b.onclick = () => { V.sfx.ui(); o.back(); };
    if (o.wireFoot) o.wireFoot(el);
    if (ro) return;
    el.querySelector('#rvstd').onclick = () => { list.forEach(x => opts[x.id] = x.def); if (ex) Object.assign(opts, ex.reset()); done(); };
    el.querySelectorAll('[data-gr]').forEach(x => x.onclick = () => {
      const k = x.dataset.gr; list.filter(y => (y.group || 'rules') === k).forEach(y => opts[y.id] = y.def);
      if (k === 'content' && ex) Object.assign(opts, ex.reset()); done();
    });
    el.querySelectorAll('[data-o]').forEach(grp => {
      arrowGroup(grp);
      grp.querySelectorAll('button').forEach(x => x.onclick = () => { const v = x.dataset.v; opts[grp.dataset.o] = isNaN(+v) ? v : +v; done(); });
    });
    el.querySelectorAll('[data-sw]').forEach(x => x.onclick = () => { const k = x.dataset.sw; opts[k] = +opts[k] ? 0 : 1; done(); });
    el.querySelectorAll('[data-pre]').forEach(x => x.onclick = () => { Object.assign(opts, g.presets.find(p => p.id === x.dataset.pre).opts); done(); });
    const pg = el.querySelector('.rv-pre'); if (pg) arrowGroup(pg);
    const lv = el.querySelector('#rvlvl');
    if (lv) { arrowGroup(lv); lv.querySelectorAll('button').forEach(x => x.onclick = () => { cfg.level = +x.dataset.v; done(); }); }
    const xe = el.querySelector('#rvx');
    if (xe) ex.wire(xe, opts, v => { Object.assign(opts, v); done(); }, msg => {
      V.sfx.bad();
      const p = xe.querySelector('.rm-limit'), c = xe.querySelector('.rm-cnt');
      p.textContent = msg; p.hidden = false; if (c) c.classList.add('warn');
      clearTimeout(xe._t); xe._t = setTimeout(() => { p.hidden = true; if (c) c.classList.remove('warn'); }, 3000);
    });
  }

  // the rules of the running match as a popup (pause menu): changes count from the next start; online only to read
  function rulesPopup(g, cfg, { readOnly, restart, onClose }) {
    const c = { mode: cfg.mode, level: cfg.level, first: cfg.first, opts: Object.assign({}, cfg.opts) };
    const changed = () => JSON.stringify(c.opts) !== JSON.stringify(cfg.opts) || c.level !== cfg.level;
    const m = openModal('<div class="rvp"></div>', 'rvm', onClose, false, e => {
      if (e.key === 'Enter' && !(document.activeElement && document.activeElement.closest('.rv-body'))) { closeModal(); return true; }
      return false;
    });
    m.style.setProperty('--acc', g.accent || 'var(--pink)');
    const o = {
      mode: cfg.mode, pause: true, readOnly, all: true,
      save() { const sv = loadCfg(g); sv.opts = Object.assign(sv.opts, c.opts); if (tableMode(g, c.mode)) sv.level = c.level; saveCfg(g, sv); },
      foot: `<button class="btn primary big" id="rvgo"><span>${IC.play}Weiter</span></button>${!readOnly && restart ? `<button class="btn ghost" id="rvnew"><span>${IC.redo}Neu starten</span></button>` : ''}`,
      wireFoot(el) {
        el.querySelector('#rvgo').onclick = () => { V.sfx.ui(); closeModal(); };
        const n = el.querySelector('#rvnew');
        if (n) { n.classList.toggle('hot', changed()); n.onclick = () => { V.sfx.ui(); modalClose = null; closeModal(); restart(Object.assign({}, cfg, { opts: c.opts, level: c.level })); }; }
      }
    };
    renderRules(m.firstElementChild, g, c, o);
  }

  // the AI levels in one line each
  const modeSay = (g, cfg, voiceTxt) => ({
    ai: g.party && +cfg.opts.n > 2 ? `Du gegen ${+cfg.opts.n - 1} Computer-Gegner.` : 'Du gegen den Computer.',
    local: g.localHint || (g.party ? 'Reihum an diesem Gerät, jeder ist mal dran.' : `Abwechselnd am selben Gerät${g.cat === 'Action' ? ', jeder auf seiner Hälfte' : ''}.`),
    online: 'Fordere einen Freund heraus.',
    open: 'Ein zufälliger Gegner wird zugelost.',
    table: `Ein privater Tisch${g.party ? ' für 2 bis 4' : ''}: deine Freunde sehen ihn, andere kommen per Code oder Link.${g.noAI ? '' : ' Freie Plätze übernimmt die KI.'}`,
    tpub: `Ein offener Tisch${g.party ? ' für 2 bis 4' : ''}: jeder kann sich dazusetzen.${g.noAI ? '' : ' Freie Plätze übernimmt die KI.'}`,
    voice: voiceTxt
  })[cfg.mode] || '';

  function renderPanel(root, g, full) {
    const cfg = loadCfg(g), s = stat(g.id);
    const firstLabel = g.firstLabels || ['Du', 'KI', 'Zufall'];
    const lvl = cfg.level, cloudOk = !!(V.cloud && V.cloud.available());
    // Same game: only the lower part is redrawn, the picture and the text stay as they are.
    // Other game: the card stays too, only icon and text change with a short crossfade.
    let gp = root.querySelector('.gp');
    if (!gp || root.dataset.gid !== g.id) {
      const fresh = !gp;
      if (fresh) { root.innerHTML = '<div class="gp"><div class="gp-art"><span class="cat"></span><span class="icw"><span class="ic"></span></span></div><div class="gp-txt"><h2></h2><p></p><div class="gp-tags"></div></div><div class="gp-body"></div></div>'; gp = root.firstElementChild; }
      root.dataset.gid = g.id; root._rules = false;
      gp.style.setProperty('--acc', g.accent || 'var(--pink)');
      gp.querySelector('.cat').textContent = g.cat;
      gp.querySelector('.ic').innerHTML = g.icon;
      gp.querySelector('h2').textContent = g.name;
      // laptop: the short line (the long description is in the rules), phone sheet: the full description
      gp.querySelector('.gp-txt p').textContent = full ? g.desc : g.short;
      gp.querySelector('.gp-tags').innerHTML = [g.party ? '2–4 Spieler' : '2 Spieler', g.online || g.table ? 'Online' : '', g.noAI ? 'Ohne KI' : 'KI · 4 Stufen'].filter(Boolean).map((t, k) => `<em style="--k:${k}">${t}</em>`).join('');
      if (V.fxOn()) { V.fx.pop(gp, fresh ? 'gp-new' : 'gp-sw'); clearTimeout(gp._t); gp._t = setTimeout(() => gp.classList.remove('gp-new', 'gp-sw'), 450); }
    }
    const rer = () => renderPanel(root, g, full);
    const body = gp.querySelector('.gp-body');
    // in the sheet the rules close it and open it again afterwards
    const tut = () => tutorial(g, full ? () => setup(g) : rer);
    const head = (full ? `<button class="iconbtn gpx" id="gpx" aria-label="Schließen">${IC.x}</button>` : '')
      + `<button class="iconbtn fav${isFav(g) ? ' on' : ''}" id="fav" aria-pressed="${isFav(g)}" aria-label="Favorit" title="${isFav(g) ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}">${IC.star}</button>`;
    // the help button shows only its icon on the phone and next to a long main button
    const tutBtn = icon => `<button class="btn ghost gp-tut${icon ? ' ico' : ''}" id="tut"${icon ? ' aria-label="Regeln lesen" title="Regeln lesen"' : ''}><span>${IC.book}${icon ? '' : 'Regeln'}${P.seen[g.id] ? '' : '<i class="dot"></i>'}</span></button>`;
    const goBtn = (id, ic, label) => `<button class="btn primary big${label.length > 12 ? ' long' : ''}" id="${id}"><span>${ic}${label}</span></button>`;
    const wireHead = () => {
      root.querySelector('#fav').onclick = () => { toggleFav(g); rer(); const f = root.querySelector('#fav'); if (f && V.fxOn()) V.fx.pop(f, 'fx-pop'); };
      if (full) root.querySelector('#gpx').onclick = () => { V.sfx.ui(); closeModal(); };
    };
    gp.classList.toggle('rv-on', !!root._rules);
    if (locked(g)) {
      root._rules = false; gp.classList.remove('rv-on');
      const ok = GUEST_GAMES.map(id => V.byId[id] && V.byId[id].name).filter(Boolean);
      body.innerHTML = `${head}<div class="gp-main"><div class="gp-lock"><span class="lki">${IC.lock}</span><div><b>Mit Konto spielbar</b>
        <p>Mit einem kostenlosen Konto sind alle ${V.games.length} Spiele frei, dazu Online-Partien, Freunde und die Rangliste.</p>
        <p>Als Gast gehen ${ok.slice(0, -1).join(', ')} und ${ok[ok.length - 1]}.</p></div></div></div>
        <div class="gp-go">${goBtn('acc', IC.user, 'Konto erstellen')}${tutBtn(true)}</div>`;
      wireHead();
      root.querySelector('#acc').onclick = () => { V.sfx.ui(); closeModal(); home('profile'); };
      root.querySelector('#tut').onclick = tut;
      panelApi = { g, go() { closeModal(); home('profile'); }, tut, level() { }, step() { }, mode() { }, rules() { return false; }, open: () => false, fav() { toggleFav(g); rer(); } };
      return;
    }
    // the rules view replaces the lower part (laptop) or the sheet's content (phone); the arrow brings the panel back
    const rules = on => {
      if (on === undefined) on = !root._rules;
      if (on && !hasRules(g, cfg.mode)) return false;
      root._rules = on; V.sfx.ui(); rer();
      const f = root.querySelector(on ? '#rvback' : '#gprules'); if (f) f.focus({ preventScroll: true });
      return true;
    };
    // modes: always the same four (KI, Am Gerät, Freund, Online; in Discord KI and Sprachkanal); modes that do not fit
    // stay visible but dimmed and say why when tapped
    const dc = inDiscord();
    const modes = [{ v: 'ai', ic: IC.robot, l: 'KI', off: g.noAI ? (dc ? 'Nur gemeinsam spielbar' : 'Dieses Spiel hat keine KI') : '' }];
    if (dc) modes.push({ v: 'voice', ic: IC.users, l: 'Sprachkanal', off: !(g.table || g.online) ? 'In Discord nur gegen die KI' : !cloudOk ? 'Online kommt gleich' : '' });
    else {
      modes.push({ v: 'local', ic: IC.users, l: 'Am Gerät' });
      const no = cloudOk ? 'Nicht online spielbar' : 'Online kommt gleich', acc = guest() ? 'Mit Konto' : '';
      // tables: "Freund" opens a private table for friends, "Online" a public one everybody can join
      if (g.online && cloudOk) modes.push({ v: 'online', ic: IC.user, l: 'Freund', off: acc }, { v: 'open', ic: IC.globe, l: 'Online' });
      else if (g.table && cloudOk) modes.push({ v: 'table', ic: IC.user, l: 'Freund', off: acc }, { v: 'tpub', ic: IC.globe, l: 'Online', off: acc });
      else modes.push({ v: 'online', ic: IC.user, l: 'Freund', off: no }, { v: 'open', ic: IC.globe, l: 'Online', off: no });
    }
    // voice channel: a table (2-4 seats, the AI fills free ones) or a game link for one opponent
    const voice = cfg.mode === 'voice';
    // game links for guests only work in the guest games (server: match_link)
    const vNeedAcc = voice && !g.table && guest() && !GUEST_GAMES.includes(g.id);
    // games only for two people at one device (Pong, Air Hockey, Reaktionsduell) have nothing to offer in Discord
    const dcNone = dc && g.noAI && !(g.table || g.online);
    const voiceGo = () => { saveCfg(g, cfg); if (!V.online) return; if (full) closeModal(); return g.table ? V.online.table(g, cfg.opts, cfg.level) : V.online.linkInvite(g, cfg.opts); };
    const anon = !V.cloud || !V.cloud.user();
    // the main button does what the mode is about, so the bar at the bottom is never empty
    const act = dcNone ? null
      : vNeedAcc ? { id: 'acc', ic: IC.user, l: 'Konto erstellen', fn() { V.sfx.ui(); closeModal(); home('profile'); } }
      : voice ? { id: 'go', ic: IC.users, l: g.table ? 'Tisch eröffnen' : 'Einladen', fn: voiceGo }
      : cfg.mode === 'online' ? { id: 'go', ic: IC.link, l: 'Per Link einladen', fn() { V.sfx.ui(); saveCfg(g, cfg); if (full) closeModal(); V.online.linkInvite(g, cfg.opts); } }
      : cfg.mode === 'open' ? { id: 'go', ic: IC.globe, l: anon ? 'Als Gast spielen' : 'Gegner suchen', fn() { saveCfg(g, cfg); if (full) closeModal(); V.online.seek(g, cfg.opts); } }
      : tableMode(g, cfg.mode) ? { id: 'go', ic: IC.plus, l: 'Tisch eröffnen', fn() { V.sfx.ui(); saveCfg(g, cfg); if (full) closeModal(); V.online.table(g, cfg.opts, cfg.level, cfg.mode === 'tpub'); } }
      : { id: 'go', ic: IC.play, l: 'Spielen', fn() { saveCfg(g, cfg); play(g, cfg); } };
    const finv = full && g.online && cloudOk && !dc && (cfg.mode === 'ai' || cfg.mode === 'local')
      ? `<button class="btn ghost gp-inv" id="finv" aria-label="Freund einladen" title="Freund einladen"><span>${IC.link}</span></button>` : '';
    const foot = `${act ? goBtn(act.id, act.ic, act.l) : ''}${finv}${tutBtn(full || !act || act.l.length > 12)}`;
    const go = () => { if (act) act.fn(); };
    const wireFoot = el => {
      const a = act && el.querySelector('#' + act.id); if (a) a.onclick = go;
      el.querySelector('#tut').onclick = tut;
      const fi = el.querySelector('#finv'); if (fi) fi.onclick = () => { V.sfx.ui(); saveCfg(g, cfg); closeModal(); V.online.linkInvite(g, cfg.opts); };
    };
    panelApi = {
      g, go, tut,
      level(i) { if (cfg.mode !== 'ai' || root._rules) return; cfg.level = Math.max(0, Math.min(3, i)); saveCfg(g, cfg); V.sfx.tick(); rer(); },
      step(d) { this.level(cfg.level + d); },
      mode() { if (g.noAI || root._rules) return; cfg.mode = cfg.mode !== 'ai' ? 'ai' : !dc ? 'local' : g.table || g.online ? 'voice' : 'ai'; saveCfg(g, cfg); V.sfx.tick(); rer(); },
      fav() { toggleFav(g); rer(); },
      rules, open: () => !!root._rules
    };
    if (root._rules && hasRules(g, cfg.mode)) {
      body.innerHTML = `${head}<div class="gp-rv"></div>`;
      wireHead();
      renderRules(body.querySelector('.gp-rv'), g, cfg, { mode: cfg.mode, back: () => rules(false), save: () => saveCfg(g, cfg), foot, wireFoot });
      return;
    }
    root._rules = false; gp.classList.remove('rv-on');
    const say = modeSay(g, cfg, vNeedAcc ? 'Für dieses Spiel braucht ihr beide ein kostenloses Versus-Konto. Als Gast gehen 4 Gewinnt, Tic Tac Toe, Schiffe versenken und Käsekästchen.'
      : g.table ? 'Du eröffnest einen Tisch. Alle in diesem Sprachkanal sehen ihn unten als Balken und spielen auf ihrem eigenen Gerät mit.'
        : 'Du lädst ein. Wer in diesem Sprachkanal zuerst auf „Mitspielen“ tippt, spielt auf seinem eigenen Gerät gegen dich.');
    const inl = inlineOpt(g, cfg.mode);
    let content = '';
    if (cfg.mode === 'ai' && !dcNone) {
      content = `<div class="gp-lvl"><div class="lv-top"><span>KI-Stärke</span><b class="l${lvl}">${V.LEVELS[lvl]}</b><em>Bilanz ${s.ai[lvl].w}:${s.ai[lvl].l}</em></div>
        <div class="lv-row" role="radiogroup" aria-label="KI-Stärke" id="level">${V.LEVELS.map((l, i) => `<button type="button" role="radio" data-v="${i}" class="lvb l${i}${i === lvl ? ' on' : ''}" aria-checked="${i === lvl}"><b>${l}</b></button>`).join('')}</div>
        <p class="gp-sub">${(g.levelInfo || LEVEL_INFO)[lvl]}</p></div>
        ${g.noFirst ? '' : `<div class="gp-inl dash"><span>${g.firstTitle || 'Wer fängt an?'}</span><div class="mini-seg" role="radiogroup" aria-label="${g.firstTitle || 'Wer fängt an?'}" id="first">${[['me', firstLabel[0]], ['ai', firstLabel[1]], ['rand', firstLabel[2]]].map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${cfg.first === v}" class="${cfg.first === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`}`;
    } else if (netMode(cfg.mode) || cfg.mode === 'table' || cfg.mode === 'tpub') content = '<div class="gp-online" id="ofr"></div>';
    if (inl) content += `<div class="gp-inl"><span>${inl.label}</span>${segHtml(inl.id, inl, cfg.opts[inl.id])}</div>`;
    if (dcNone) content += '<p class="hint dch">Dieses Spiel spielt ihr zu zweit am selben Gerät. In Discord hat jeder sein eigenes, darum geht es hier nicht.</p>';
    else if (dc && cfg.mode === 'ai') content += '<p class="hint dch">Nur du siehst dieses Spiel. Zum Mitspielen mit den anderen wähl oben „Sprachkanal“.</p>';
    // a game that cannot be played here (Pong in Discord) shows only the note why
    const sum = !dcNone && hasRules(g, cfg.mode) ? summary(g, cfg) : null;
    body.innerHTML = `${head}<div class="gp-main">
      <div class="gp-mode2" role="radiogroup" aria-label="Wie spielst du?" id="mode" style="--n:${modes.length}">
        ${modes.map(m => `<button type="button" role="radio" data-v="${m.v}" aria-checked="${cfg.mode === m.v}" class="${cfg.mode === m.v ? 'on' : ''}${m.off ? ' lockd' : ''}"${m.off ? ` data-why="${m.off}" aria-disabled="true"` : ''}>${m.off === 'Mit Konto' ? IC.lock : m.ic}<span>${m.v === 'ai' && modes.length < 4 ? 'Gegen KI' : m.l}</span></button>`).join('')}
      </div>
      ${dcNone ? '' : `<p class="gp-say">${say}</p>`}
      ${content}
      ${sum ? `<button type="button" class="gp-rules" id="gprules" aria-haspopup="dialog"><span class="gr-ic">${IC.sliders}</span><span class="gr-t"><b>Regeln</b>${sum.map(t => `<i>·</i><span>${escA(t)}</span>`).join('')}</span>${IC.fwd}</button>` : ''}
    </div>
    <div class="gp-go">${foot}</div>`;
    wireHead(); wireFoot(body);
    const on = (id, fn) => { const e = root.querySelector('#' + id); if (!e) return; arrowGroup(e); e.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (b.dataset.why) { V.sfx.bad(); return toast(b.dataset.why); }
      // the group is drawn again: the focus moves to the same choice in the new one
      const had = e.contains(document.activeElement);
      fn(b.dataset.v); saveCfg(g, cfg); V.sfx.ui(); rer();
      const f = root.querySelector(`#${id} [data-v="${b.dataset.v}"]`); if (f && had) f.focus({ preventScroll: true });
    }); };
    on('mode', x => cfg.mode = x);
    on('level', x => cfg.level = +x);
    on('first', x => cfg.first = x);
    const ie = inl && root.querySelector(`[data-o="${inl.id}"]`);
    if (ie) { arrowGroup(ie); ie.querySelectorAll('button').forEach(b => b.onclick = () => { const v = b.dataset.v; cfg.opts[inl.id] = isNaN(+v) ? v : +v; saveCfg(g, cfg); V.sfx.ui(); rer(); }); }
    const gr = root.querySelector('#gprules'); if (gr) gr.onclick = () => rules(true);
    if (cfg.mode === 'online' && V.online) V.online.picker(root.querySelector('#ofr'), g, cfg.opts);
    if (cfg.mode === 'open' && V.online) V.online.openPanel(root.querySelector('#ofr'), g, cfg.opts);
    if (tableMode(g, cfg.mode) && cfg.mode !== 'voice' && V.online) V.online.tablePanel(root.querySelector('#ofr'), g, cfg.opts, cfg.level, cfg.mode === 'tpub');
  }
  // Phone: the panel opens as a bottom sheet over the home screen. Laptop: the panel lives next to the game grid.
  let sheetRoot = null;
  const sheetKeys = e => {
    const k = e.key; if (!panelApi) return false;
    if (/^[1-4]$/.test(k)) { panelApi.level(+k - 1); return true; }
    if (k === 's' || k === 'S') { panelApi.mode(); return true; }
    if ((k === 'f' || k === 'F') && panelApi.fav) { panelApi.fav(); return true; }
    if (k === 't' || k === 'T') { panelApi.tut(); return true; }
    if (k === 'r' || k === 'R') { panelApi.rules(); return true; }
    // Esc in the rules view goes back to the panel, otherwise it closes the sheet
    if (k === 'Escape' && panelApi.open()) { panelApi.rules(false); return true; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') { panelApi.step(k === 'ArrowLeft' ? -1 : 1); return true; }
    if (k === 'Enter') { const f = document.activeElement; if (f && f.tagName === 'BUTTON' && modalEl && modalEl.contains(f)) return false; panelApi.go(); return true; }
    return false;
  };
  function setup(g) {
    lastGame = g; selected = g;
    if (wide()) return home('games', g);
    if (view !== 'home' || current) home('games');
    const m = openModal('<div class="sel-panel solo"></div>', 'gpm', () => { sheetRoot = null; }, false, sheetKeys);
    m.style.setProperty('--acc', g.accent || 'var(--pink)');
    sheetRoot = m.firstElementChild;
    renderPanel(sheetRoot, g, true);
  }

  // ---------- stats and options ----------
  // ---------- Bilanz ----------
  // Laptop: filter, numbers with this week's change, the last 14 days, a sortable table per game and milestones.
  // Phone: the same parts in one column. Days are counted locally since this version (js/play.js, versus.daily).
  let statMode = 'all', statSort = { k: 'n', d: -1 };
  // win, loss, draw as one letter each (in English W L D)
  const SNU = V.lang === 'en' ? ['W', 'L', 'D'] : ['S', 'N', 'U'];
  const STAT_MODES = [['all', 'Alle'], ['ai', 'Gegen KI'], ['on', 'Online'], ['local', 'Am Gerät']];
  const LVL_CLS = ['l0', 'l1', 'l2', 'l3'];
  function gameRec(g, mode) {
    const s = P.stats[g.id]; if (!s) return null;
    const on = s.on || { w: 0, l: 0, d: 0 }, ai = s.ai.reduce((a, r) => ({ w: a.w + r.w, l: a.l + r.l, d: a.d + r.d }), { w: 0, l: 0, d: 0 });
    const loc = { w: s.local.a, l: s.local.b, d: s.local.d };
    const r = mode === 'ai' ? ai : mode === 'on' ? on : mode === 'local' ? loc : { w: ai.w + on.w, l: ai.l + on.l, d: ai.d + on.d };
    const n = r.w + r.l + r.d, best = [3, 2, 1, 0].find(k => s.ai[k].w > 0);
    return { g, w: r.w, l: r.l, d: r.d, n, rate: n ? Math.round(r.w / n * 100) : -1, best: best ?? -1, all: ai.w + ai.l + ai.d + on.w + on.l + on.d + loc.w + loc.l + loc.d };
  }
  function lastDays(k) {
    const daily = S.get('daily', {}), out = [];
    for (let i = k - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5), key = d.toLocaleDateString('sv'); out.push(Object.assign({ key, date: d }, daily[key] || { w: 0, l: 0, d: 0, n: 0 })); }
    return out;
  }
  function statsTab() {
    const t = totals();
    const recs = V.games.map(g => gameRec(g, statMode)).filter(r => r && r.all);
    const week = lastDays(7).reduce((a, x) => ({ n: a.n + x.w + x.l + x.d + x.n, w: a.w + x.w }), { n: 0, w: 0 });
    const days = lastDays(14), dmax = Math.max(1, ...days.map(x => x.w + x.l + x.d + x.n));
    const kpi = (v, l, sub, s = '') => `<div class="kpi"><b data-v="${v}"${s ? ` data-s="${s}"` : ''}>${v}${s}</b><span>${l}</span>${sub ? `<small class="up">${sub}</small>` : ''}</div>`;
    if (!recs.length && statMode === 'all') return `<section class="stats page"><h1 class="title"><span>Deine</span> Bilanz</h1>
      <div class="empty sempty">${IC.trophy}<b>Noch keine Partien</b><p>Spiel eine Runde, dann steht hier deine Bilanz pro Spiel: gegen die KI, online und zu zweit.</p><button class="btn primary" data-tab="games"><span>Spiel aussuchen</span></button></div></section>`;
    const sorted = recs.slice().sort((a, b) => {
      const k = statSort.k, x = k === 'name' ? a.g.name.localeCompare(b.g.name) : (a[k] - b[k]);
      return x * statSort.d || b.n - a.n;
    });
    const th = (k, l) => `<button class="st-h${statSort.k === k ? ' on' : ''}" data-sort="${k}" aria-sort="${statSort.k === k ? (statSort.d > 0 ? 'ascending' : 'descending') : 'none'}">${l}${statSort.k === k ? (statSort.d > 0 ? ' ↑' : ' ↓') : ''}</button>`;
    return `<section class="stats page sx">
      <div class="shead"><h1 class="title"><span>Deine</span> Bilanz</h1>
        <div class="chips mini" id="smode">${STAT_MODES.map(([k, l]) => `<button data-sm="${k}" class="${statMode === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="kpis">${kpi(t.total, 'Partien', week.n ? '+' + week.n + ' diese Woche' : '')}${kpi(t.aiWins, 'Siege gegen KI')}${kpi(t.onWins, 'Online-Siege')}${kpi(t.rate, 'Siegquote', '', ' %')}</div>
      <div class="sgrid">
        <div class="scol">
          <div class="apanel schart"><h3>Letzte 14 Tage</h3>
            ${days.some(x => x.w + x.l + x.d + x.n) ? `<div class="sbars">${days.map(x => `<div class="sb" title="${x.date.toLocaleDateString(V.locale())}: ${x.w} Siege, ${x.l} Niederlagen${x.n ? ', ' + x.n + ' zu zweit' : ''}">
              <i class="n" style="--h:${(x.l + x.d + x.n) / dmax * 100}%"></i><i class="w" style="--h:${x.w / dmax * 100}%"></i><small>${x.date.getDate()}</small></div>`).join('')}</div>
              <p class="fine"><i class="lg w"></i> Siege · <i class="lg n"></i> Niederlagen, Remis und zu zweit</p>` : '<p class="muted">Ab jetzt zählt Versus deine Partien pro Tag. Spiel eine Runde, dann wächst hier das Diagramm.</p>'}</div>
          <div class="apanel stable"><div class="st-row st-head">${th('name', 'Spiel')}${th('w', SNU[0])}${th('l', SNU[1])}${th('d', SNU[2])}${th('rate', 'Quote')}${statMode === 'local' ? '' : th('best', 'Beste KI')}</div>
            ${sorted.length ? sorted.map(r => `<button class="st-row" data-sg="${r.g.id}" style="--acc:${r.g.accent || 'var(--pink)'}"><span class="st-g"><span class="ic">${r.g.icon}</span><b>${r.g.name}</b></span>
              <span class="good">${r.w}</span><span class="bad">${r.l}</span><span class="dim">${r.d}</span>
              <span class="st-q">${r.n ? `<i class="qbar"><i style="--w:${r.rate}%"></i></i>${r.rate} %` : '–'}</span>
              ${statMode === 'local' ? '' : `<span>${r.best >= 0 ? `<em class="lvt ${LVL_CLS[r.best]}">${V.LEVELS[r.best]}</em>` : '–'}</span>`}</button>`).join('') : '<p class="muted st-none">In diesem Modus noch keine Partie.</p>'}
            ${statMode === 'local' ? '<p class="fine">Am Gerät: S = Spieler 1 gewinnt, N = Spieler 2 gewinnt.</p>' : ''}</div>
        </div>
        <div class="scol side-col">${badgePanel()}</div>
      </div>
    </section>`;
  }
  function wireStats(b) {
    b.querySelectorAll('[data-sm]').forEach(x => x.onclick = () => { statMode = x.dataset.sm; V.sfx.ui(); home('stats'); });
    b.querySelectorAll('[data-sort]').forEach(x => x.onclick = () => { const k = x.dataset.sort; statSort = { k, d: statSort.k === k ? -statSort.d : k === 'name' ? 1 : -1 }; V.sfx.tick(); home('stats'); });
    b.querySelectorAll('[data-sg]').forEach(x => x.onclick = () => { const g = V.byId[x.dataset.sg]; V.sfx.ui(); homeSpot = 'lib'; if (wide()) { home('games', g); setTimeout(() => selectTile(g), 180); } else setup(g); });
  }
  // the big numbers count up from 0 when the tab opens (.6 s)
  function countUp(root) {
    if (!V.fxOn()) return;
    const els = [...root.querySelectorAll('[data-v]')], t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3);
      els.forEach(b => { b.textContent = Math.round(+b.dataset.v * e) + (b.dataset.s || ''); });
      if (k < 1 && els[0] && els[0].isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // pop: the options as a popup during a match, without language, app and data (they reload or end the match)
  function optsTab(pop) {
    const sw = (id, on, label, sub, ic) => `<button class="opt" id="${id}" role="switch" aria-checked="${on}">${ic}<span><b>${label}</b><small>${sub}</small></span><i class="sw ${on ? 'on' : ''}"></i></button>`;
    const slider = (k, label, val, off) => `<div class="opt ovol${off ? ' off' : ''}" data-vol="${k}"><i class="ospc"></i><span><b>Lautstärke ${label}</b><input type="range" min="0" max="100" step="5" value="${val}" style="--p:${val}%" aria-label="Lautstärke ${label}"></span><em>${val} %</em></div>`;
    const seg = (key, cur, list) => `<div class="oseg" data-k="${key}" role="radiogroup">${list.map(([v, l]) => `<button role="radio" data-v="${v}" aria-checked="${cur === v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const vibSub = !V.canVibrate ? 'Dieser Browser kann nicht vibrieren' : IOS ? 'iPhone ab iOS 18: kurzes Tippen statt Ruckeln' : 'Bei Zügen, Treffern und am Ende';
    const showVib = V.canVibrate || V.coarse;
    const u = V.cloud && V.cloud.available() && V.cloud.user();
    const appRow = standalone()
      ? `<div class="opt">${IC.phone}<span><b>Läuft als App</b><small>Versus ist auf diesem Gerät installiert</small></span></div>`
      : `<button class="opt" id="o_inst">${IC.dl}<span><b>Als App installieren</b><small>Eigenes Symbol, startet schneller, ohne Browserleiste</small></span></button>`;
    // categories: a list on the left on the laptop (one group at a time), a jump bar on the phone
    const cats = [['sound', 'Ton und Vibration'], ['look', 'Anzeige'], ['game', 'Spiel'], V.coarse ? null : ['keys', 'Tastatur'], V.cloud && V.cloud.available() ? ['net', 'Online'] : null, pop ? null : ['app', 'App'], pop ? null : ['data', 'Daten']].filter(Boolean);
    if (!cats.some(c => c[0] === optCat)) optCat = 'sound';
    return `<section class="opts page oset${pop ? ' opop' : ''}">
      <nav class="onav" aria-label="Kategorien"><h1 class="title"><span>Deine</span> Optionen</h1>
        <label class="osearch">${IC.search}<input id="oq" type="search" placeholder="Option suchen" autocomplete="off" spellcheck="false" aria-label="Option suchen"></label>
        <div class="onav-l">${cats.map(([k, l]) => `<button data-oj="${k}" class="${optCat === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <p class="onav-v">Versus ${V.VERSION || ''}<br><a href="rechtliches.html">Impressum und Datenschutz</a><br><a href="terms.html">Nutzungsbedingungen</a></p></nav>
      <div class="omain"><p class="onow">Änderungen gelten sofort</p>
      <div class="ogroups">
      <div class="ogroup" data-oc="sound"><h2 class="oh"><button class="oh-b" data-ot="sound" aria-expanded="true">Ton und Vibration</button></h2>
      <div class="optlist">
        ${sw('o_snd', settings.sound, 'Ton', 'Schaltet Effekte und Musik zusammen an und aus', IC.sound)}
        ${slider('vol', 'Effekte', settings.vol, !settings.sound)}
        ${sw('o_mus', settings.music !== false, 'Musik', 'Eigene Stücke für Menü, Klassiker, Strategie und Action', IC.music)}
        ${slider('mvol', 'Musik', settings.mvol, !settings.sound || settings.music === false)}
        ${showVib ? `<div class="opt orow${V.canVibrate ? '' : ' off'}">${IC.vib}<span><b>Vibration</b><small>${vibSub}</small></span>${V.canVibrate ? `<div class="ovib">${seg('haptic', settings.haptic, [['off', 'Aus'], ['light', 'Leicht'], ['strong', 'Stark']])}<button class="btn ghost sm" id="o_vtest"><span>Testen</span></button></div>` : ''}</div>
        <p class="ohint" id="o_vhint" hidden></p>` : ''}
      </div></div>
      <div class="ogroup" data-oc="look"><h2 class="oh"><button class="oh-b" data-ot="look" aria-expanded="true">Anzeige</button></h2>
      <div class="optlist">
        ${sw('o_fx', settings.fx !== 'low', 'Effekte', 'Konfetti, Partikel, Animationen. Aus spart Akku.', IC.spark)}
        ${sw('o_intro', settings.intro !== false, 'Intros', 'Start-Animation und VS-Einblendung vor jeder Partie', IC.film)}
        ${sw('o_coords', settings.coords !== false, 'Koordinaten', 'Buchstaben und Zahlen am Schachbrett', IC.hash)}
        ${sw('o_hints', settings.hints !== false, 'Zughilfen', 'Zeigt, wohin du ziehen kannst (Schach, Dame, Reversi, Mühle)', IC.bulb)}
        ${sw('o_cb', !!settings.cb, 'Farbenblind-Modus', 'Muster auf den Steinen, Formen an den Namen, Nummern auf den Figuren', IC.eye)}
        ${pop ? '' : `<div class="opt orow">${IC.globe}<span><b>Sprache</b><small>Language · Deutsch oder Englisch</small></span>${seg('lang', V.lang, [['de', 'Deutsch'], ['en', 'English']])}</div>`}
        <div class="opt orow">${IC.grid}<span><b>Spielbrett</b><small>Schach, Dame und Reversi</small></span>${seg('board', settings.board || 'std', [['std', 'Standard'], ['neon', 'Neon'], ['wood', 'Holz']])}</div>
        ${sw('o_season', settings.seasonOn !== false, 'Saison-Look', V.season && V.season.active() ? 'Gerade: ' + ({ halloween: 'Halloween', winter: 'Winter' })[V.season.active()] + ' · Deko für die ganze App' : 'Gerade ist kein Saison-Look aktiv', IC.star)}
        <div class="bprev" aria-hidden="true">${[['std', 'Standard'], ['neon', 'Neon'], ['wood', 'Holz']].map(([k, l]) => `<button tabindex="-1" data-bp="${k}" class="bp bp-${k}${(settings.board || 'std') === k ? ' on' : ''}"><i></i><span>${l}</span></button>`).join('')}</div>
      </div></div>
      <div class="ogroup" data-oc="game"><h2 class="oh"><button class="oh-b" data-ot="game" aria-expanded="true">Spiel</button></h2>
      <div class="optlist">
        ${sw('o_fast', !!settings.aiFast, 'Schnelle KI', 'Die KI zieht sofort, ohne Nachdenken und Zielen', IC.bolt)}
        ${sw('o_face', !!settings.face, 'Gegenüber sitzen', 'Zu zweit am Handy: Name und Hinweise für Spieler 2 stehen auf dem Kopf', IC.users)}
      </div></div>
      ${V.coarse ? '' : `<div class="ogroup" data-oc="keys"><h2 class="oh"><button class="oh-b" data-ot="keys" aria-expanded="true">Tastatur</button></h2>
      <div class="optlist small">${keyRows()}</div></div>`}
      ${V.cloud && V.cloud.available() ? `<div class="ogroup" data-oc="net"><h2 class="oh"><button class="oh-b" data-ot="net" aria-expanded="true">Online</button></h2>
      <div class="optlist">
        ${sw('o_open', settings.openCards !== false, 'Offene Herausforderungen', 'Einblenden, wenn jemand einen Gegner sucht', IC.globe)}
        ${u && !u.anon ? `<button class="opt" id="o_push" role="switch" aria-checked="false">${IC.bell}<span><b>Benachrichtigungen</b><small id="o_pushs">Herausforderungen, Freundschaftsanfragen und wenn du in einer Partie über Tage dran bist</small></span><i class="sw"></i></button>` : ''}
        ${u ? sw('o_stealth', !!settings.stealth, 'Online-Status verbergen', 'Freunde sehen nicht, ob und was du gerade spielst, und können nicht zuschauen', IC.eye) : ''}
      </div></div>` : ''}
      ${pop ? '' : `<div class="ogroup" data-oc="app"><h2 class="oh"><button class="oh-b" data-ot="app" aria-expanded="true">App</button></h2>
      <div class="optlist small">
        ${appRow}
        <button class="opt" id="o_upd">${IC.sync}<span><b>Nach Updates suchen</b><small>Version ${V.VERSION || ''}</small></span></button>
        <button class="opt" data-fb="1">${IC.bulb}<span><b>Feedback senden</b><small>Fehler melden oder eine Idee schicken</small></span></button>
      </div></div>
      <div class="ogroup" data-oc="data"><h2 class="oh"><button class="oh-b" data-ot="data" aria-expanded="true">Daten</button></h2>
      <div class="optlist small">
        <button class="opt" id="o_tut">${IC.book}<span><b>Tutorials wieder als neu zeigen</b></span></button>
        <button class="opt" id="o_def">${IC.redo}<span><b>Einstellungen zurücksetzen</b></span></button>
        <button class="opt danger" id="o_rst">${IC.x}<span><b>Bilanz löschen</b></span></button>
      </div></div>`}
      </div>
      <p class="onone" id="onone" hidden>Keine Option gefunden.</p>
      <p class="about">Versus ${V.VERSION || ''} · ohne Werbung. KI und Spiele zu zweit laufen auch offline.<span class="only-fine"> Taste <kbd>?</kbd> zeigt alle Kürzel.</span><br><a href="rechtliches.html">Impressum und Datenschutz</a> · <a href="terms.html">Nutzungsbedingungen</a> · <a href="${V.DISCORD}" target="_blank" rel="noopener">Discord</a></p>
    </div></section>`;
  }
  // the options as a popup (during a match): same rows and categories, the match stays where it is
  function optsPopup(onClose) {
    const m = openModal(`<div class="optpop"><button class="iconbtn opx" id="opx" aria-label="Schließen">${IC.x}</button>${optsTab(true)}</div>`, 'optm', onClose);
    m.querySelector('#opx').onclick = () => { V.sfx.ui(); closeModal(); };
    wireOpts(m);
    return m;
  }
  let optCat = 'sound';
  // laptop: only the chosen group is shown (class oc-<cat> on the section); a search shows matching rows of all groups.
  // Phone: the bar jumps to a group, a group title folds it.
  function wireOptNav(v) {
    const sec = v.querySelector('.oset'); if (!sec) return;
    const show = c => { optCat = c; sec.dataset.cat = c; sec.querySelectorAll('[data-oj]').forEach(b => b.classList.toggle('on', b.dataset.oj === c)); };
    show(optCat);
    sec.querySelectorAll('[data-oj]').forEach(b => b.onclick = () => {
      V.sfx.ui(); show(b.dataset.oj);
      const q = sec.querySelector('#oq'); if (q.value) { q.value = ''; q.oninput(); }
      if (!wide()) scrollToEl(sec.querySelector(`[data-oc="${b.dataset.oj}"]`));
    });
    sec.querySelectorAll('[data-ot]').forEach(b => b.onclick = () => {
      if (wide()) return;
      const grp = b.closest('.ogroup'), shut = grp.classList.toggle('shut'); b.setAttribute('aria-expanded', !shut); V.sfx.tick();
    });
    const q = sec.querySelector('#oq'), none = sec.querySelector('#onone');
    q.oninput = () => {
      const t = norm(q.value.trim());
      sec.classList.toggle('osearching', !!t);
      let hits = 0;
      sec.querySelectorAll('.ogroup').forEach(gr => {
        let n = 0;
        gr.querySelectorAll('.opt, .krow').forEach(r => { const ok = !t || norm(r.textContent).includes(t); r.classList.toggle('ohide', !ok); if (ok) n++; });
        gr.classList.toggle('ohide', !!t && !n); hits += n;
      });
      none.hidden = !t || hits > 0;
    };
  }
  function wireOpts(v) {
    wireOptNav(v);
    // the board previews pick the board like the segment above them
    v.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => { const s = v.querySelector(`[data-k=board] [data-v=${b.dataset.bp}]`); if (s) s.click(); v.querySelectorAll('[data-bp]').forEach(x => x.classList.toggle('on', x === b)); });
    const flip = (id, fn) => { const b = v.querySelector('#' + id); if (b) b.onclick = () => { const on = fn(); b.setAttribute('aria-checked', on); b.querySelector('.sw').classList.toggle('on', on); saveSettings(); V.sfx.ui(); }; };
    const dimSliders = () => {
      v.querySelector('[data-vol=vol]').classList.toggle('off', !settings.sound);
      v.querySelector('[data-vol=mvol]').classList.toggle('off', !settings.sound || settings.music === false);
    };
    flip('o_snd', () => {
      settings.sound = !settings.sound; sndIcons();
      dimSliders(); V.music.apply();
      return settings.sound;
    });
    flip('o_mus', () => { settings.music = settings.music === false; dimSliders(); setTimeout(() => V.music.apply(), 0); return settings.music; });
    v.querySelectorAll('[data-vol]').forEach(row => {
      const k = row.dataset.vol, r = row.querySelector('input'), out = row.querySelector('em');
      r.oninput = () => { if (Math.floor(+r.value / 10) !== Math.floor(settings[k] / 10)) V.sfx.tick(); settings[k] = +r.value; r.style.setProperty('--p', r.value + '%'); out.textContent = r.value + ' %'; if (k === 'mvol') V.music.apply(); };
      r.onchange = () => { saveSettings(); if (k === 'vol') V.sfx.place(); };
    });
    v.querySelectorAll('.oseg').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      settings[g.dataset.k] = b.dataset.v; saveSettings();
      g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      V.sfx.ui();
      if (g.dataset.k === 'haptic') V.buzz([40, 60, 40]);
      // every screen is drawn in German and translated on the way (js/i18n.js), so a reload switches everything at once
      if (g.dataset.k === 'lang' && b.dataset.v !== V.lang) { S.set('lang', b.dataset.v); setTimeout(() => location.reload(), 150); }
      if (g.dataset.k === 'board') applyFxClass();
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
    flip('o_fx', () => { settings.fx = settings.fx === 'low' ? 'full' : 'low'; applyFxClass(); if (V.season) V.season.apply(); return settings.fx !== 'low'; });
    flip('o_intro', () => (settings.intro = settings.intro === false));
    flip('o_coords', () => { settings.coords = settings.coords === false; applyFxClass(); return settings.coords; });
    flip('o_hints', () => { settings.hints = settings.hints === false; applyFxClass(); return settings.hints; });
    flip('o_cb', () => { settings.cb = !settings.cb; applyFxClass(); return settings.cb; });
    flip('o_season', () => { settings.seasonOn = settings.seasonOn === false; if (V.season) V.season.apply(); return settings.seasonOn; });
    flip('o_fast', () => (settings.aiFast = !settings.aiFast));
    flip('o_face', () => (settings.face = !settings.face));
    flip('o_open', () => (settings.openCards = settings.openCards === false));
    // push notifications: the switch shows the state of this device's subscription
    const pb = v.querySelector('#o_push');
    if (pb && V.online) {
      const show = st => { pb.setAttribute('aria-checked', st === 'on'); pb.querySelector('.sw').classList.toggle('on', st === 'on'); pb.classList.toggle('off', st === 'none' || st === 'denied');
        if (st === 'denied') v.querySelector('#o_pushs').textContent = 'Im Browser blockiert. Erlaube Benachrichtigungen in den Website-Einstellungen.';
        if (st === 'none') v.querySelector('#o_pushs').textContent = V.isIOS ? 'Auf dem iPhone erst, wenn Versus als App installiert ist' : 'Dieser Browser kann keine Benachrichtigungen'; };
      V.online.pushState().then(show, () => show('none'));
      pb.onclick = async () => {
        V.sfx.ui();
        try { const st = await V.online.pushState(); if (st === 'on') await V.online.pushOff(); else { await V.online.pushOn(); toast('Benachrichtigungen an'); } }
        catch (e) { toast(e.message, 3000); }
        V.online.pushState().then(show, () => show('none'));
      };
    }
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
    const upd = v.querySelector('#o_upd'); if (upd) upd.onclick = () => { V.sfx.ui(); checkUpdate(); };
    const tu = v.querySelector('#o_tut'); if (tu) tu.onclick = () => { P.seen = {}; S.set('seen', P.seen); toast('Alle Tutorials sind wieder neu'); };
    const sure = (b, fn) => b && (b.onclick = () => {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.querySelector('b').textContent = 'Sicher? Nochmal tippen'; return; }
      fn();
    });
    sure(v.querySelector('#o_def'), () => {
      const keep = settings.stealth;
      Object.keys(settings).forEach(k => delete settings[k]); Object.assign(settings, DEFAULTS, { stealth: keep }); saveSettings(); applyFxClass(); V.music.apply();
      sndIcons();
      toast('Einstellungen zurückgesetzt'); home('opts');
    });
    sure(v.querySelector('#o_rst'), () => { P.stats = {}; S.set('stats', P.stats); toast('Bilanz gelöscht'); home('opts'); });
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
    if (!['endm', 'radarm', 'profm'].includes(cls)) swipeSheet(modalEl, modalEl.firstElementChild);
    document.body.appendChild(modalEl);
    nav.hide();
    queueGuard();
    return modalEl.firstElementChild;
  }
  // Phone: every dialog is a bottom sheet. Pulling the grip or the top of the sheet down closes it
  // (from 90 px or with a quick flick), otherwise it springs back.
  const sheetMode = () => !wide();
  function swipeSheet(back, m) {
    let y0 = 0, t0 = 0, dy = 0, id = null, dragEnd = 0;
    // the click that ends a drag must not press a button under the finger
    m.addEventListener('click', x => { if (performance.now() - dragEnd < 350) { x.stopPropagation(); x.preventDefault(); } }, true);
    m.addEventListener('pointerdown', e => {
      if (!sheetMode() || e.button > 0 || e.target.closest('input,textarea,select,.oseg,.lv-bar,.qgames,.rgames')) return;
      if (e.clientY - m.getBoundingClientRect().top > 64 || m.scrollTop > 0) return;
      id = e.pointerId; y0 = e.clientY; t0 = performance.now(); dy = 0;
    });
    m.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      dy = Math.max(0, e.clientY - y0);
      if (dy > 6) { try { m.setPointerCapture(id); } catch (x) { } m.classList.add('drag'); m.style.transform = `translateY(${dy}px)`; }
    });
    const up = e => {
      if (e.pointerId !== id) return;
      id = null; m.classList.remove('drag');
      if (dy < 6) { m.style.transform = ''; return; }
      dragEnd = performance.now();
      if (dy > 90 || dy / (performance.now() - t0) > 0.6) { if (modalEl === back) closeModal(); }
      else m.style.transform = '';
    };
    m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up);
  }
  function closeModal() {
    if (!modalEl) return;
    const el = modalEl; modalEl = null; modalKeys = null;
    queueGuard();
    // a sheet slides down first (.28 s), a centred dialog just fades
    const sheet = sheetMode() && !el.classList.contains('mb-endm') && V.fxOn();
    el.classList.add('out'); setTimeout(() => el.remove(), !V.fxOn() ? 0 : sheet ? 280 : 160);
    const f = modalClose; modalClose = null; if (f) f();
  }
  V.openModal = openModal; V.closeModal = closeModal;

  function toast(text, ms = 1500) {
    const t = V.el('div', 'toast' + (ms > 1500 ? ' long' : ''), text);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
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
  // the soft edge at the top of the phone screen only shows once the page has moved
  const onScroll = () => document.documentElement.classList.toggle('scrolled', (wide() ? app.scrollTop : scrollY) > 8);
  addEventListener('scroll', onScroll, { passive: true }); if (app) app.addEventListener('scroll', onScroll, { passive: true });
  // phone: a quick sideways swipe over the page moves to the next or previous tab (not over rows that scroll sideways)
  // (pages without the app, like the page builder in tools/pages.ps1, have no #app)
  if (app) {
    const ORDER = ['games', 'online', 'stats', 'profile'];
    let sw = null;
    // touch events (pointer events get cancelled as soon as the browser starts panning)
    app.addEventListener('touchstart', e => {
      sw = null;
      if (e.touches.length !== 1 || wide() || view !== 'home' || modalEl) return;
      if (e.target.closest('.tiles.row, .hero, .chips, .frs-l, .onav-l, .qtiles, input, textarea, select, .tabs')) return;
      const p = e.touches[0]; sw = { x: p.clientX, y: p.clientY, t: performance.now() };
    }, { passive: true });
    app.addEventListener('touchend', e => {
      if (!sw) return;
      const p = e.changedTouches[0], dx = p.clientX - sw.x, dy = p.clientY - sw.y, quick = performance.now() - sw.t < 600; sw = null;
      if (!quick || Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
      const k = ORDER.indexOf(homeTab), next = ORDER[k + (dx < 0 ? 1 : -1)];
      if (k < 0 || !next) return;
      V.sfx.tick(); V.buzz(6); home(next);
    }, { passive: true });
  }
  addEventListener('online', () => netState(true));

  function tutorial(g, onDone) {
    let i = 0;
    const steps = g.tutorial;
    let done = false;
    function finish() {
      if (done) return; done = true;
      P.seen[g.id] = 1; S.set('seen', P.seen); closeModal(); onDone && onDone();
    }
    function render(dir) {
      const st = steps[i];
      const m = openModal(`<div class="tut ${dir ? 'go' + dir : ''}" data-g="${g.id}">
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

  // First start: no tour to click through, but a quick start. "Wer spielt?" (alone, two at this device, a friend by link)
  // shows three short games for that choice; one tap closes it and starts the match right away (against the AI on
  // Leicht, so the first round feels good). Every game still shows its own tutorial and the "Hier tippen" hand.
  V.welcomeDue = () => !P.seen._welcome;
  const QS = {
    ai: { ic: 'robot', l: 'Ich allein', s: 'gegen die KI', games: ['c4', 'ttt', 'dots'], hint: 'Die KI startet auf Leicht. Stärker wird sie, wann du willst.' },
    local: { ic: 'users', l: 'Wir zu zweit', s: 'an diesem Gerät', games: ['reaction', 'pong', 'c4'], hint: 'Legt das Handy zwischen euch. Jeder spielt von seiner Seite.' },
    link: { ic: 'globe', l: 'Mit Freund', s: 'per Link', games: ['c4', 'ttt', 'ships'], hint: 'Du bekommst einen Link. Wer ihn öffnet, spielt sofort gegen dich, ohne Konto.' }
  };
  function welcome() {
    if (P.seen._welcome) return;
    const linkOk = !!(V.online && V.cloud && V.cloud.available() && !inDiscord());
    const who = Object.keys(QS).filter(k => k === 'ai' || (k === 'local' ? !inDiscord() : linkOk));
    let pick = 'ai', done = false;
    const finish = () => { if (done) return; done = true; P.seen._welcome = 1; S.set('seen', P.seen); };
    const games = k => QS[k].games.map(id => V.byId[id]).filter(g => g && !locked(g) && (k !== 'link' || g.online) && (k !== 'ai' || !g.noAI));
    const row = () => games(pick).map((g, i) => `<button class="qs-g" data-g="${g.id}" style="--acc:${g.accent || 'var(--pink)'};--k:${i}">
        <span class="ic">${g.icon}</span><span class="qs-gt"><b>${g.name}</b><small>${g.short || ''}</small></span><span class="qs-play">${pick === 'link' ? IC.link : IC.play}</span></button>`).join('');
    const m = openModal(`<div class="qs">
      <div class="qs-k"><span>Versus</span><b>${V.games.length} Spiele · kostenlos · ohne Werbung</b></div>
      <h3>Wer spielt?</h3>
      <div class="qs-who" role="radiogroup" aria-label="Wer spielt?" style="--n:${who.length}">${who.map(k => `<button type="button" role="radio" data-w="${k}" aria-checked="${k === pick}" class="${k === pick ? 'on' : ''}">${IC[QS[k].ic]}<b>${QS[k].l}</b><small>${QS[k].s}</small></button>`).join('')}</div>
      <div class="qs-list" aria-live="polite"><p class="qs-hint">${QS[pick].hint}</p><div class="qs-games">${row()}</div></div>
      <button class="qs-skip" id="qsx">Erst mal umschauen</button>
    </div>`, 'qsm', finish, false, e => {
      if (/^[1-3]$/.test(e.key)) { const b = m.querySelectorAll('.qs-g')[+e.key - 1]; if (b) b.click(); return true; }
      return false;
    });
    const list = m.querySelector('.qs-list');
    const wire = () => list.querySelectorAll('.qs-g').forEach(b => b.onclick = () => {
      const g = V.byId[b.dataset.g], cfg = loadCfg(g);
      finish(); closeModal(); V.buzz(12);
      if (pick === 'link') { V.sfx.ui(); return V.online.linkInvite(g, cfg.opts); }
      cfg.mode = pick; if (pick === 'ai') { cfg.level = 0; cfg.first = 'me'; }
      saveCfg(g, cfg); V.sfx.go(); play(g, cfg);
    });
    wire();
    arrowGroup(m.querySelector('.qs-who'));
    m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
      if (b.dataset.w === pick) return;
      pick = b.dataset.w; V.sfx.tick();
      m.querySelectorAll('[data-w]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      list.innerHTML = `<p class="qs-hint">${QS[pick].hint}</p><div class="qs-games">${row()}</div>`; wire();
    });
    m.querySelector('#qsx').onclick = () => { V.sfx.tick(); closeModal(); };
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
    app.addEventListener('scroll', () => apply(false), { passive: true });
    return {
      set(fn, o = {}) { getItems = fn; opts = o; idx = -1; apply(); },
      reset() { getItems = null; active = false; idx = -1; opts = {}; if (cur) cur.classList.remove('on'); },
      hide() { if (cur) cur.classList.remove('on'); },
      refresh() { if (active) requestAnimationFrame(() => apply()); },
      move, activate, get active() { return active; }, get has() { return items().length > 0; }
    };
  })();
  V.nav = nav;

  // ---------- keyboard ----------
  let lastGame = null;
  // all shortcuts, grouped: the ? overlay and the Tastatur group in the options
  const KEYS = [
    ['Überall', [['?', 'Diese Übersicht'], ['M', 'Ton an oder aus'], ['Esc', 'Zurück oder schließen'], ['Strg K', 'Spiel suchen'], ['Strg B', 'Seitenleiste ein- oder ausklappen'], ['Alt ← →', 'Zurück und vor zwischen den Bereichen']]],
    ['Spielauswahl', [['← → ↑ ↓', 'Spiel wählen'], ['Enter', 'Spielen'], ['1 2 3 4', 'KI-Stärke'], ['/', 'Spiel suchen'], ['S', 'Gegen KI oder zu zweit'], ['F', 'Favorit an oder aus'], ['T', 'Regeln']]],
    ['Im Spiel', [['← → ↑ ↓', 'Cursor über das Brett'], ['Enter Leertaste', 'Feld wählen oder setzen'], ['Esc', 'Pause-Menü'], ['Z', 'Zug zurück'], ['N', 'Neue Partie'], ['H', 'Regeln'], ['R', 'Revanche nach der Partie'], ['F11', 'Vollbild']]]
  ];
  const keyRow = (k, d) => `<div class="krow"><span>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</span><p>${d}</p></div>`;
  const keyRows = () => KEYS.map(([h, list]) => `<h4 class="kh">${h}</h4>${list.map(([k, d]) => keyRow(k, d)).join('')}`).join('') +
    '<p class="fine">In den Action-Spielen hat jeder Spieler seine eigenen Tasten, sie stehen in den Regeln des Spiels.</p>';
  function showKeys() {
    const m = openModal(`<div class="keys"><h3>Tastenkürzel</h3>
      ${KEYS.map(([h, list]) => `<h4>${h}</h4>${list.map(([k, d]) => keyRow(k, d)).join('')}`).join('')}
      ${lastGame && lastGame.keys ? `<h4>${lastGame.name}</h4>${lastGame.keys.map(k => keyRow(k[0], k[1])).join('')}` : ''}
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

  // laptop: focus the search in the app bar (from any area)
  function focusSearch() {
    if (view !== 'home') home('games');
    const q = app.querySelector('#gq'); if (q) { q.focus(); q.select(); }
  }
  document.addEventListener('keydown', e => {
    // laptop shell: Ctrl K search, Ctrl B sidebar, Alt ← → back and forward through the areas
    if (wide() && !modalEl && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      if (e.key === 'k' || e.key === 'K') { if (view !== 'play') { e.preventDefault(); focusSearch(); } return; }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); side.toggle(); return; }
    }
    if (wide() && e.altKey && !e.ctrlKey && view === 'home' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); histGo(e.key === 'ArrowLeft' ? -1 : 1); return; }
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
      if ((k === 'f' || k === 'F') && panelApi.fav) { panelApi.fav(); return true; }
      if (k === 't' || k === 'T') { panelApi.tut(); return true; }
      if (k === 'r' || k === 'R') return panelApi.rules();
      if (k === 'Escape' && panelApi.open()) { panelApi.rules(false); return true; }
      return false;
    };
    if (view === 'home') {
      if (k === '/' && wide()) { e.preventDefault(); focusSearch(); return; }
      if (homeTab !== 'games') return;
      if (k === '/') { const q = app.querySelector('#gq'); if (q) { e.preventDefault(); q.focus(); q.select(); } return; }
      if (DIRS[k]) { e.preventDefault(); spatial([...app.querySelectorAll('.tile, .lkg')], ...DIRS[k]); return; }
      if (wide() && panelKeys()) { e.preventDefault(); return; }
      if (k === 'Enter' && wide() && panelApi) {
        const f = document.activeElement;
        if (f && f.tagName === 'BUTTON' && !f.classList.contains('tile') && !f.classList.contains('lkg')) return;
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
    if (view === 'play' && P.playApi) {
      if (P.playApi.key(e)) { e.preventDefault(); return; }
      if (k === 'Escape') { e.preventDefault(); P.playApi.menu(); return; }
      if ((k === 'n' || k === 'N') && !e.repeat) { P.playApi.restart(); return; }
      if ((k === 't' || k === 'T' || k === 'h' || k === 'H') && !e.repeat) { P.playApi.tut(); return; }
      if ((k === 'z' || k === 'Z') && !e.repeat) { P.playApi.undo(); return; }
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
    if (sheetRoot && wide()) closeModal();
    // (a full rebuild: the header differs between the two layouts)
    if (view === 'home') { view = ''; home(); } else side.render();
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
  // never during a match (a tap would reload and drop it): it waits for the menu or the result screen (atEnd)
  function updateBar(atEnd) {
    if (!swWaiting || document.querySelector('.upbar') || (view === 'play' && !atEnd)) return;
    const bar = V.el('div', 'upbar', `${IC.sync}<span><b>Neue Version da</b><small>Kurz neu laden, dann ist sie aktiv</small></span><button class="btn primary sm"><span>Neu laden</span></button><button class="x" aria-label="Später">${IC.x}</button>`);
    document.body.appendChild(bar);
    bar.querySelector('.btn').onclick = () => {
      wantReload = true;
      try { swWaiting.postMessage('skip'); } catch (e) { }
      setTimeout(() => location.reload(), 1500);
    };
    bar.querySelector('.x').onclick = () => { bar.classList.add('out'); setTimeout(() => bar.remove(), 250); };
  }
  // announcement from the team (maintenance, news): a bar like the update bar; closed it stays closed until the text changes
  let noticeAt = 0;
  function noticeBar() {
    if (!V.cloud || !V.cloud.available() || navigator.onLine === false || Date.now() - noticeAt < 300000) return;
    noticeAt = Date.now();
    V.cloud.rpc('site_notice').then(n => {
      if (n && 'season' in n && V.season) V.season.fromSite(n.season);
      const txt = n && (V.lang === 'en' && n.txt_en ? n.txt_en : n.txt), key = n && n.at;
      const old = document.querySelector('.upbar.note');
      if (old && old.dataset.k !== key) old.remove();
      if (!txt || S.get('noticeSeen') === key || document.querySelector('.upbar')) return;
      const bar = V.el('div', 'upbar note' + (n.kind === 'warn' ? ' warn' : ''), `${IC.bell || IC.help}<span><b class="nt"></b></span><button class="x" aria-label="Schließen">${IC.x}</button>`);
      bar.dataset.k = key;
      // the team's own words: never translated, never HTML
      const b = bar.querySelector('.nt'); b.textContent = txt; b.setAttribute('translate', 'no');
      document.body.appendChild(bar);
      bar.querySelector('.x').onclick = () => { S.set('noticeSeen', key); bar.classList.add('out'); setTimeout(() => bar.remove(), 250); };
    }, () => { noticeAt = 0; });
  }
  // a warning from the team: shown once, the player confirms it
  const WARN = {
    '@name': 'Dein Benutzername verstößt gegen die Regeln. Bitte ändere ihn, sonst wird das Konto gesperrt.',
    '@abuse': 'Bitte bleib fair und freundlich. Beleidigungen und Spam führen zu einer Sperre.',
    '@cheat': 'Bitte brich Partien nicht absichtlich ab und schummle nicht. Beim nächsten Mal wird das Konto gesperrt.',
    '@spam': 'Bitte schick keine Spam-Einladungen und keine falschen Meldungen.'
  };
  function checkWarnings() {
    V.cloud.rpc('my_warnings').then(list => {
      if (!list || !list.length) return;
      const show = () => {
        if (modalEl) return setTimeout(show, 3000);
        const m = openModal(`<div class="confirm"><span class="abig bad">!</span><h2>Verwarnung vom Team</h2>
          ${list.map(w => WARN[w.txt] ? `<p>${WARN[w.txt]}</p>` : `<p class="wtxt"></p>`).join('')}
          <div class="actions"><button class="btn primary" id="wok"><span>Verstanden</span></button></div></div>`, '', () => V.cloud.rpc('warnings_seen').catch(() => { }));
        // own text from the team as plain text
        const own = list.filter(w => !WARN[w.txt]);
        m.querySelectorAll('.wtxt').forEach((p, i) => { p.textContent = own[i].txt; p.setAttribute('translate', 'no'); });
        m.querySelector('#wok').onclick = closeModal;
      };
      show();
    }, () => { });
  }
  function registerSW() {
    // (not inside the Discord activity: the frame there is Discord's, and offline play makes no sense in a voice channel)
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || (V.discord && V.discord.on)) return;
    // on localhost only with ?sw=1, so edits show up after a plain reload
    if (/^(localhost|127.0.0.1)$/.test(location.hostname) && !/[?&]sw=1/.test(location.search)) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => { }); return; }
    navigator.serviceWorker.register('sw.js').then(reg => {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) { swWaiting = reg.waiting; updateBar(); }
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { swWaiting = w; updateBar(); } });
      });
    }).catch(() => { });
    // a tapped notification while Versus is open: go to the match or the Online tab
    navigator.serviceWorker.addEventListener('message', e => {
      const to = e.data && e.data.open; if (!to) return;
      try {
        const u = new URL(to), mid = u.searchParams.get('match');
        if (mid && V.online && view !== 'play') V.online.resume(mid);
        else if (u.searchParams.get('tab') && view !== 'play') home(u.searchParams.get('tab'));
      } catch (x) { }
    });
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
    if (view === 'play' && P.playApi) { P.playApi.menu(); return true; }
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
    P.stats = S.get('stats', {}); P.seen = S.get('seen', {});
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
    view: () => view, tab: () => homeTab, side: () => side.render(), cont: () => contRefresh(),
    // for the games' editors in the rules view (js/games/slf.js, hangman.js, guess.js)
    multi: MULTI, topics: topicsPicker,
    // the account tab (js/account.js): series of the game of the day and the badges, both kept with the account
    acctBadges() {
      const t = daily(), st = S.get('dailyCh', {});
      return `<div class="aserie apanel"><span class="dc-st${t && t.streak ? ' on' : ''}">${IC.bolt}<b>${t ? t.streak : 0}</b><small>${t && t.streak === 1 ? 'Tag' : 'Tage'}</small></span>
        <div><b>Spiel des Tages</b><small>${t && t.done ? 'Heute erledigt' : 'Heute noch offen'} · längste Serie ${st.best || 0}</small></div></div>${badgePanel()}`;
    }
  };
  // what js/play.js needs from the shell
  Object.assign(P, {
    mount, locked, guest, toast, home, setup, openModal, closeModal, nav, tutorial, showKeys, optsPopup, toggleSound, rulesPopup,
    enterPlay(g) { destroyCurrent(); view = 'play'; lastGame = g; selected = g; document.querySelectorAll('.upbar:not(.note)').forEach(b => b.remove()); },
    updateBar, daily, dailyDone, badgeCheck, totals,
    setCurrent(c) { current = c; },
    modalOpen: () => !!modalEl,
    // closes the dialog without running its onClose callback
    closeModalQuiet() { modalClose = null; closeModal(); }
  });
  let cloudUser = null, cloudKnown = false;
  function onCloud() {
    refreshAcct();
    // logged in or out (or the first answer about it): locks, modes and the panel change, so the menus are drawn again
    const u = V.cloud.user(), id = u ? u.id : null, known = !V.cloud.starting();
    if (id !== cloudUser || known !== cloudKnown) {
      const who = id !== cloudUser;
      cloudUser = id; cloudKnown = known;
      if (id && settings.stealth) V.cloud.rpc('set_stealth', { hide: true }).catch(() => { });
      // the team sees which language a player reads, and warnings from the team show up once
      if (id) { V.cloud.rpc('set_lang', { l: V.lang }).catch(() => { }); checkWarnings(); }
      // an open game sheet shows the new locks and modes too
      if (sheetRoot && sheetRoot.isConnected && selected) renderPanel(sheetRoot, selected, true);
      // the account tab is drawn again too when the login changed (a restored session must not leave the login form up)
      if (view === 'home' && (homeTab !== 'profile' || who)) return home();
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
    if (q.get('table')) try { sessionStorage.setItem('versus.table', q.get('table').slice(0, 12)); } catch (e) { }
    // a game link (?join=) and a tapped notification about a match over days (?match=)
    for (const k of ['join', 'match']) if (/^[0-9a-f-]{36}$/.test(q.get(k) || '')) try { sessionStorage.setItem('versus.' + k, q.get(k)); } catch (e) { }
    if (qt && TABS.some(t => t[0] === qt)) homeTab = qt;
    // ?game=chess (from the game pages in /games/ and /de/spiele/): open that game's setup instead of the welcome
    const qg = V.byId[q.get('game')] || null;
    const start = () => { home(qg ? 'games' : undefined); if (qg) setup(qg); };
    const greet = () => { if (!qg) welcome(); };
    if (['tab', 'app', 'add', 'table', 'join', 'match', 'game'].some(k => q.has(k))) try { history.replaceState(null, '', location.pathname); } catch (e) { }
    registerSW();
    netState();
    if (!document.getElementById('fx')) { const f = V.el('div'); f.id = 'fx'; document.body.appendChild(f); }
    if (V.cloud && V.cloud.available()) {
      V.cloud.on(onCloud); V.cloud.init();
      setTimeout(noticeBar, 2500);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') noticeBar(); });
    }
    const b = document.getElementById('boot');
    if (!b || !V.fxOn() || settings.intro === false || getComputedStyle(b).display === 'none') { if (b) b.remove(); start(); setTimeout(greet, 300); return; }
    let opened = false;
    const open = skip => {
      if (opened) return; opened = true;
      window.removeEventListener('keydown', onKey, true);
      b.classList.add(skip ? 'skip' : 'open');
      start();
      setTimeout(greet, skip ? 350 : 900);
      setTimeout(() => b.remove(), skip ? 260 : 800);
    };
    const onKey = e => { e.preventDefault(); e.stopPropagation(); open(true); };
    b.addEventListener('pointerdown', () => open(true));
    window.addEventListener('keydown', onKey, true);
    setTimeout(() => open(false), Math.max(0, 1250 - performance.now()));
  };
})();
