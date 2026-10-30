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
    window.scrollTo(0, 0);
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
  const logo = '<button class="logo" id="logo" aria-label="Versus Startseite"><span class="l1">VER</span><i class="slash"></i><span class="l2">SUS</span></button>';
  function header(extra = '') {
    return `<header class="top">${logo}${extra}
      <div class="top-r">${acctChip()}<button class="iconbtn only-fine" id="kbd" aria-label="Tastenkürzel" title="Tastenkürzel (?)">${IC.kbd}</button>
      <button class="iconbtn" id="snd" aria-label="Ton an oder aus" title="Ton (M)">${settings.sound ? IC.sound : IC.mute}</button></div></header>`;
  }
  function wireHeader(root) {
    root.querySelectorAll('#snd, .snd').forEach(s => s.onclick = toggleSound);
    const k = root.querySelector('#kbd'); if (k) k.onclick = showKeys;
    const a = root.querySelector('#acct'); if (a) a.onclick = () => { V.sfx.ui(); home('profile'); };
    const l = root.querySelector('#logo'); if (l) l.onclick = () => home('games');
    wireHead(root);
  }
  // phone: profile head instead of the logo bar (avatar, name, weekly place and win streak, sound and options)
  function appHead() {
    const u = V.cloud && V.cloud.available() ? V.cloud.user() : null, full = u && !u.anon;
    const name = u ? u.username : 'Gast';
    return `<header class="ahd"><button class="ah-av${full ? '' : ' guest'}" id="ahav" aria-label="Konto"><span>${full ? escA(name.slice(0, 1).toUpperCase()) : '+'}</span></button>
      <div class="ah-t"><b>${escA(name)}</b><div class="ah-c" id="ahc"></div></div>
      <button class="iconbtn snd" aria-label="Ton an oder aus">${settings.sound ? IC.sound : IC.mute}</button><button class="iconbtn" id="ahopt" aria-label="Optionen">${IC.gear}</button></header>`;
  }
  function wireHead(root) {
    const h = root.querySelector('.ahd'); if (!h) return;
    h.querySelector('#ahav').onclick = () => { V.sfx.ui(); home('profile'); };
    h.querySelector('#ahopt').onclick = () => { V.sfx.ui(); home('opts'); };
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
  function refreshAcct() {
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
    const tb = ([id, l, ic]) => `<button data-tab="${id}" class="${homeTab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`;
    const desk = `<nav class="tabs desk" aria-label="Bereiche"><i class="tab-ind"></i>${TABS.map(tb).join('')}</nav>`;
    // phone: a floating bar with four tabs and the raised quick match button in the middle (options sit in the head)
    const bar = TABS.filter(t => t[0] !== 'opts').map(tb);
    bar.splice(2, 0, `<button class="qbtn" id="qbtn" aria-label="Schnelles Spiel"><span>${IC.boltf}</span></button>`);
    const v = mount(`<div class="view home">${appHead()}${header(desk)}<div class="hbody">${tabBody()}</div><nav class="tabs bar" aria-label="Bereiche"><i class="tab-ind"></i>${bar.join('')}</nav><i class="fade-t" aria-hidden="true"></i><i class="fade-b" aria-hidden="true"></i></div>`);
    wireHeader(v);
    v.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== homeTab) { V.sfx.ui(); home(b.dataset.tab); } });
    v.querySelector('#qbtn').onclick = () => { V.sfx.ui(); quickGo(); };
    placeInd(v, false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(v, false));
    wireBody(v.querySelector('.hbody'));
  }
  // the raised button in the tab bar: same search as "Schnelles Spiel" in the Online tab
  function quickGo() {
    if (!V.cloud || !V.cloud.available() || !V.online) return toast('Online-Spiele sind gleich da');
    if (navigator.onLine === false) return toast('Du bist offline');
    V.online.quickGo();
  }
  function offlineTab() {
    return `<section class="page"><div class="empty">${IC.wifioff}<b>Du bist offline</b><p>Freunde, Herausforderungen und Ranglisten brauchen Internet. Gegen die KI oder zu zweit an einem Gerät kannst du trotzdem spielen.</p><button class="btn primary" data-tab="games"><span>Zu den Spielen</span></button></div></section>`;
  }
  function tabBody() { return homeTab === 'online' && navigator.onLine === false ? offlineTab() : homeTab === 'stats' ? statsTab() : homeTab === 'opts' ? optsTab() : homeTab === 'profile' ? (V.account ? V.account.tab() : '') : homeTab === 'online' ? (V.online ? V.online.tab() : '') : gamesTab(); }
  function wireBody(b) {
    wireInstall(b);
    if (homeTab === 'games') wireGames(b);
    if (homeTab === 'opts') wireOpts(b);
    if (homeTab === 'stats') countUp(b);
    if (homeTab === 'profile' && V.account) V.account.wire(b);
    if (homeTab === 'online' && V.online) V.online.wire(b);
    b.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { V.sfx.ui(); home(x.dataset.tab); });
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
    setTimeout(() => { window.scrollTo(0, 0); put(); }, 130);
  }

  function gamesTab() {
    const count = c => V.games.filter(g => c === 'Alle' || g.cat === c).length;
    const W = wide();
    return `<div class="select">
      <section class="sel-main">
        ${W ? `<div class="sel-head">
          <h1 class="title"><span>Wähl dein</span> Duell</h1>
          <p class="tagline">${V.games.length} Spiele für zwei bis vier an einem Gerät. Oder du gegen die KI in vier Stufen.</p>
        </div>
        ${installCard()}` : heroCarousel() + quickTiles()}
        <div class="gfind">
          <div class="gsrow">
            <label class="gsearch">${IC.search}<input id="gq" type="search" placeholder="Spiel suchen" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Spiel suchen" value="${escA(homeQuery)}"><kbd class="only-fine">/</kbd><button class="gclear" id="gqx" aria-label="Suche löschen"${homeQuery ? '' : ' hidden'}>${IC.x}</button></label><button class="iconbtn gsurp" id="gsurp" aria-label="Überrasch mich" title="Überrasch mich">${IC.dice}</button></div>
          <div class="chips" role="tablist">${['Alle', ...V.CATS].map(c => `<button role="tab" data-f="${c}" class="${homeFilter === c && !homeQuery ? 'on' : ''}">${c}<small>${count(c)}</small></button>`).join('')}</div>
        </div>
        <div id="glist">${gameList()}</div>
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
      const how = c.mode === 'local' ? (rg.party ? 'Am Gerät' : 'Zu zweit') : c.mode === 'ai' ? 'Gegen KI · ' + V.LEVELS[c.level] : c.mode === 'voice' ? 'Mit dem Sprachkanal' : 'Online';
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
    return `<div class="qtiles">${qt('qt_quick', 'c', IC.boltf, 'Schnelles Spiel', true)}${inDiscord() ? qt('qt_voice', 'y', IC.users, 'Sprachkanal') : qt('qt_local', 'y', IC.users, 'Zu zweit')}${qt('qt_ai', 'p', IC.robot, 'Gegen KI')}</div>`;
  }
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
    if (!h) return;
    const tr = h.querySelector('.hero-tr'), cards = [...h.querySelectorAll('.hcard')], dots = [...h.querySelectorAll('.hero-dots i')];
    const go = (k, sound) => {
      homeHero = (k + cards.length) % cards.length;
      tr.style.setProperty('--i', homeHero);
      cards.forEach((c, j) => { c.classList.toggle('on', j === homeHero); c.tabIndex = j === homeHero ? 0 : -1; });
      dots.forEach((d, j) => d.classList.toggle('on', j === homeHero));
      if (sound) V.sfx.tick();
    };
    cards.forEach(c => c.onclick = () => {
      if (+c.dataset.k !== homeHero) return go(+c.dataset.k, true);
      if (c.dataset.do === 'install') { V.sfx.ui(); return install(); }
      const g = V.byId[c.dataset.id]; V.sfx.ui();
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
    // turns on its own every 4.3 s, but not while a sheet is open, in a match, in another tab or with reduced effects
    clearInterval(heroT);
    if (cards.length > 1) heroT = setInterval(() => {
      if (!h.isConnected) return clearInterval(heroT);
      if (modalEl || view !== 'home' || homeTab !== 'games' || !V.fxOn() || document.hidden || h.classList.contains('drag')) return;
      go(homeHero + 1);
    }, 4300);
  }

  // ---------- favourites, recently played, search ----------
  const favs = () => S.get('favs', []).filter(id => V.byId[id]);
  const isFav = g => favs().includes(g.id);
  function toggleFav(g) {
    const on = !isFav(g);
    S.set('favs', on ? [...favs(), g.id] : favs().filter(id => id !== g.id));
    V.sfx.ui(); toast(on ? g.name + ' ist jetzt ein Favorit' : g.name + ' aus Favoriten entfernt');
    refreshList();
  }
  const escA = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // other names people search for
  const ALIAS = {
    c4: 'vier gewinnt connect four', yacht: 'kniffel yahtzee würfel', ludo: 'mensch ärgere dich nicht', ladder: 'schlangen und leitern snakes ladders',
    ships: 'battleship', checkers: 'draughts', mill: 'nine mens morris', kalaha: 'mancala bohnen', reversi: 'othello', maumau: 'uno karten',
    poker: 'texas holdem karten chips', memory: 'paare karten', dots: 'dots and boxes', gomoku: 'gomoku', hangman: 'hangman wörter raten',
    slf: 'wörter kategorien', schnapsen: 'sechsundsechzig 66 karten bummerl', guess: 'quiz schätzen wissen zahlen',
    hex: 'verbinden sechseck', ttt3: 'tic tac toe 3d würfel vier in einer reihe qubic', code: 'bulls and cows zahlen raten geheimcode', domino: 'dominosteine', tron: 'snake lightcycle', hockey: 'airhockey', reaction: 'reaktion schnell', go: 'baduk weiqi', uttt: 'tic tac toe'
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
    const W = wide(), cmp = W ? ' cmp' : '';
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
  const lockBanner = n => n ? `<div class="lockb"><span class="lki">${IC.lock}</span><span class="lb-t"><b>Kostenloses Konto: ${n} Spiele mehr</b><small>Dazu Online-Partien, Freunde und die Rangliste</small></span><button class="btn primary sm" data-tab="profile"><span>Konto erstellen</span></button></div>` : '';
  let homeQuery = '';
  function refreshList() {
    const tl = app.querySelector('#glist'); if (!tl || view !== 'home' || homeTab !== 'games') return;
    tl.innerHTML = gameList();
    wireList(tl);
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
      <div class="lk-ics">${games.map(g => `<button class="lkg" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'}" aria-label="${g.name} (mit Konto)"><span class="ic">${g.icon}</span><small>${g.name}</small></button>`).join('')}</div>
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
    const q = v.querySelector('#gq'), qx = v.querySelector('#gqx');
    v.querySelectorAll('.chips button').forEach(b => b.onclick = () => { V.sfx.ui(); pickFilter(b.dataset.f); });
    // a search looks through all categories; Enter picks the first hit, Esc clears
    q.oninput = () => {
      homeQuery = q.value; qx.hidden = !q.value;
      v.querySelectorAll('.chips button').forEach(x => x.classList.toggle('on', !homeQuery.trim() && x.dataset.f === homeFilter));
      refreshList();
    };
    qx.onclick = e => { e.preventDefault(); V.sfx.ui(); q.value = ''; q.oninput(); q.focus(); };
    v.querySelector('#gsurp').onclick = () => surprise();
    q.onkeydown = e => {
      const first = v.querySelector('#glist .tile, #glist .lkg');
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (q.value) { q.value = ''; q.oninput(); } else q.blur(); }
      else if (e.key === 'Enter' && first) { e.preventDefault(); q.blur(); if (wide()) { first.focus(); first.click(); } else first.click(); }
      else if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
    };
    wireHero(v);
    if (wide()) renderPanel(v.querySelector('#panel'), selected, false);
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
        if (!wide()) { V.sfx.ui(); return setup(g); }
        if (selected === g && t.classList.contains('sel')) return;
        V.sfx.ui(); selectTile(g);
      };
      t.addEventListener('focus', () => { if (wide() && selected !== g) selectTile(g); });
      holdToPlay(t, g);
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
      <span class="tx"><b>${g.name}</b><small>${g.short}</small></span>
      <span class="meta">${news && !lock ? '<em class="new">Neu</em>' : ''}</span></button>`;
  }

  // ---------- game panel (desktop side panel and phone setup screen) ----------
  function loadCfg(g) {
    const saved = S.get('setup', {})[g.id] || {};
    const cfg = { mode: g.noAI ? (saved.mode === 'table' && g.table ? 'table' : 'local') : ((saved.mode === 'online' || saved.mode === 'open') && !g.online) || (saved.mode === 'table' && !g.table) ? 'ai' : (saved.mode || 'ai'), level: saved.level ?? 1, first: saved.first || 'me', opts: {} };
    // inside the Discord activity there are only two modes: against the AI (only you see it) or with the voice channel
    if (inDiscord()) { if (cfg.mode !== 'ai' && cfg.mode !== 'voice') cfg.mode = g.noAI ? 'voice' : 'ai'; if (cfg.mode === 'voice' && !(g.table || g.online)) cfg.mode = 'ai'; }
    else if (cfg.mode === 'voice') cfg.mode = g.noAI ? 'local' : 'ai';
    (g.options || []).forEach(o => { cfg.opts[o.id] = saved.opts && saved.opts[o.id] !== undefined ? saved.opts[o.id] : o.def; });
    return cfg;
  }
  function saveCfg(g, cfg) { const all = S.get('setup', {}); all[g.id] = cfg; S.set('setup', all); }
  let panelApi = null;
  function renderPanel(root, g, full) {
    const cfg = loadCfg(g), s = stat(g.id);
    // options can be limited to some modes (e.g. the chess clock makes no sense against the AI)
    // (the voice channel in Discord plays like a table or an online duel)
    const optMode = cfg.mode === 'voice' ? (g.table ? 'table' : 'online') : cfg.mode;
    const optsHere = (g.options || []).filter(o => !o.modes || o.modes.includes(optMode));
    const firstLabel = g.firstLabels || ['Du', 'KI', 'Zufall'];
    const chipRow = (id, label, items, val) => `<div class="crow"><span>${label}</span><div class="mini-seg" id="${id}">${items.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
    const lvl = cfg.level, cloudOk = !!(V.cloud && V.cloud.available());
    // Same game: only the settings part is redrawn, the card, icon and text stay as they are.
    // Other game: the card stays too, only icon and text change with a short crossfade.
    let gp = root.querySelector('.gp');
    if (!gp || root.dataset.gid !== g.id) {
      const fresh = !gp;
      if (fresh) { root.innerHTML = '<div class="gp"><div class="gp-art"><span class="cat"></span><span class="icw"><span class="ic"></span></span></div><div class="gp-txt"><h2></h2><p></p><div class="gp-tags"></div></div><div class="gp-body"></div></div>'; gp = root.firstElementChild; }
      root.dataset.gid = g.id; root._mi = null;
      gp.style.setProperty('--acc', g.accent || 'var(--pink)');
      gp.querySelector('.cat').textContent = g.cat;
      gp.querySelector('.ic').innerHTML = g.icon;
      gp.querySelector('h2').textContent = g.name;
      gp.querySelector('.gp-txt p').textContent = g.desc;
      gp.querySelector('.gp-tags').innerHTML = [g.party ? '2–4 Spieler' : '2 Spieler', g.online || g.table ? 'Online' : '', g.noAI ? 'Ohne KI' : 'KI · 4 Stufen'].filter(Boolean).map((t, k) => `<em style="--k:${k}">${t}</em>`).join('');
      if (V.fxOn()) { V.fx.pop(gp, fresh ? 'gp-new' : 'gp-sw'); clearTimeout(gp._t); gp._t = setTimeout(() => gp.classList.remove('gp-new', 'gp-sw'), 450); }
    }
    const rer = () => renderPanel(root, g, full);
    // in the sheet the rules close it and open it again afterwards
    const tut = () => tutorial(g, full ? () => setup(g) : rer);
    const close = full ? `<button class="iconbtn gpx" id="gpx" aria-label="Schließen">${IC.x}</button>` : '';
    if (locked(g)) {
      const ok = GUEST_GAMES.map(id => V.byId[id] && V.byId[id].name).filter(Boolean);
      gp.querySelector('.gp-body').innerHTML = `${close}<div class="gp-lock"><span class="lki">${IC.lock}</span><div><b>Mit Konto spielbar</b>
        <p>Als Gast kannst du ${ok.slice(0, -1).join(', ')} und ${ok[ok.length - 1]} spielen. Mit einem kostenlosen Konto sind alle ${V.games.length} Spiele frei, dazu Online-Partien, Freunde und die Rangliste.</p></div></div>
        <div class="gp-go"><button class="btn primary big" id="acc"><span>${IC.user}Konto erstellen</span></button><button class="btn ghost" id="tut"><span>${IC.book}Regeln</span></button></div>`;
      root.querySelector('#acc').onclick = () => { V.sfx.ui(); closeModal(); home('profile'); };
      root.querySelector('#tut').onclick = tut;
      if (full) root.querySelector('#gpx').onclick = () => { V.sfx.ui(); closeModal(); };
      panelApi = { g, go() { closeModal(); home('profile'); }, tut, level() { }, step() { }, mode() { } };
      return;
    }
    // modes as a segment with a sliding indicator; modes that do not fit stay visible but dimmed and say why when tapped
    const dc = inDiscord();
    const modes = [{ v: 'ai', ic: IC.robot, l: 'KI', off: g.noAI ? (dc ? 'Nur gemeinsam spielbar' : 'Nur zu zweit') : '' }];
    if (dc) modes.push({ v: 'voice', ic: IC.users, l: 'Sprachkanal', off: !(g.table || g.online) ? 'In Discord nur gegen die KI' : !cloudOk ? 'Online kommt gleich' : '' });
    else {
      modes.push({ v: 'local', ic: IC.users, l: g.party ? 'Am Gerät' : 'Zu zweit' });
      if (g.online && cloudOk) modes.push({ v: 'online', ic: IC.user, l: 'Freund', off: guest() ? 'Mit Konto' : '' }, { v: 'open', ic: IC.globe, l: 'Online' });
      else if (g.table && cloudOk) modes.push({ v: 'table', ic: IC.globe, l: 'Online', off: guest() ? 'Mit Konto' : '' });
      else modes.push({ v: 'open', ic: IC.globe, l: 'Online', off: cloudOk ? 'Nicht online spielbar' : 'Online kommt gleich' });
    }
    // voice channel: a table (2-4 seats, the AI fills free ones) or a game link for one opponent
    const voice = cfg.mode === 'voice', vTable = voice && g.table;
    // game links for guests only work in the guest games (server: match_link)
    const vNeedAcc = voice && !g.table && guest() && !GUEST_GAMES.includes(g.id);
    // games only for two people at one device (Pong, Air Hockey, Reaktionsduell) have nothing to offer in Discord
    const dcNone = dc && g.noAI && !(g.table || g.online);
    const mi = Math.max(0, modes.findIndex(m => m.v === cfg.mode));
    gp.querySelector('.gp-body').innerHTML = `${close}<button class="iconbtn fav${isFav(g) ? ' on' : ''}" id="fav" aria-pressed="${isFav(g)}" aria-label="Favorit" title="${isFav(g) ? 'Aus Favoriten entfernen' : 'Zu Favoriten (F)'}">${IC.star}</button>
      <div class="gp-mode" id="mode" style="--n:${modes.length};--i:${root._mi ?? mi}"><i class="seg-ind"></i>
        ${modes.map(m => `<button data-v="${m.v}" class="${cfg.mode === m.v ? 'on' : ''}${m.off ? ' lockd' : ''}"${m.off ? ` data-why="${m.off}" aria-disabled="true"` : ''}>${m.off === 'Mit Konto' ? IC.lock : m.ic}<span>${m.l}</span></button>`).join('')}
      </div>
      ${cfg.mode === 'ai' || cfg.mode === 'table' ? `<div class="gp-lvl">
        <div class="lv-top"><span>KI-Stärke</span><b class="l${lvl}">${V.LEVELS[lvl]}</b><em>Bilanz ${s.ai[lvl].w}:${s.ai[lvl].l}</em></div>
        <div class="lv-bar l${lvl}" id="level">${V.LEVELS.map((l, i) => `<button data-v="${i}" class="${i <= lvl ? 'fill' : ''} ${i === lvl ? 'on' : ''}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
        <p class="hint">${cfg.mode === 'table' || vTable ? 'So stark spielt die KI auf freien Plätzen.' : (g.levelInfo || LEVEL_INFO)[lvl]}</p></div>` : cfg.mode === 'online' || cfg.mode === 'open' ? '<div class="gp-online" id="ofr"></div>' : voice ? '' : `<p class="hint local">${g.localHint || `Ihr spielt abwechselnd am selben Gerät${g.cat === 'Action' ? ', jeder auf seiner Hälfte' : ''}.`}</p>`}
      ${(cfg.mode === 'ai' && !g.noFirst) || optsHere.length ? `<div class="gp-more">
        ${cfg.mode === 'ai' && !g.noFirst ? chipRow('first', g.firstTitle || 'Wer fängt an?', [['me', firstLabel[0]], ['ai', firstLabel[1]], ['rand', firstLabel[2]]], cfg.first) : ''}
        ${optsHere.map(o => chipRow('o_' + o.id, o.label, o.choices, cfg.opts[o.id])).join('')}
      </div>` : ''}
      ${cfg.mode === 'table' ? '<div class="gp-online" id="ofr"></div>' : ''}
      ${dcNone ? '<p class="hint dch">Dieses Spiel spielt ihr zu zweit am selben Gerät. In Discord hat jeder sein eigenes, darum geht es hier nicht.</p>' : dc && cfg.mode === 'ai' ? '<p class="hint dch">Nur du siehst dieses Spiel. Zum Mitspielen mit den anderen wähl oben „Sprachkanal“.</p>' : ''}
      ${voice ? `<p class="hint dch">${vNeedAcc ? 'Für dieses Spiel braucht ihr beide ein kostenloses Versus-Konto. Als Gast gehen 4 Gewinnt, Tic Tac Toe, Schiffe versenken und Käsekästchen.' : g.table ? 'Du eröffnest einen Tisch. Alle in diesem Sprachkanal sehen ihn unten als Balken und spielen auf ihrem eigenen Gerät mit.' : 'Du lädst ein. Wer in diesem Sprachkanal zuerst auf „Mitspielen“ tippt, spielt auf seinem eigenen Gerät gegen dich.'}</p>` : ''}
      <div class="gp-go">${cfg.mode === 'online' || cfg.mode === 'open' || cfg.mode === 'table' || dcNone ? '' : vNeedAcc ? `<button class="btn primary big" id="acc"><span>${IC.user}Konto erstellen</span></button>` : `<button class="btn primary big" id="go"><span>${voice ? IC.users + (g.table ? 'Tisch eröffnen' : 'Einladen') : IC.play + 'Spielen'}</span><kbd class="only-fine">Enter</kbd></button>`}
        <button class="btn ghost" id="tut"><span>${IC.book}Regeln${P.seen[g.id] ? '' : '<i class="dot"></i>'}</span></button></div>`;
    // the indicator glides from the old mode to the new one
    const seg = root.querySelector('#mode');
    if (root._mi != null && root._mi !== mi && V.fxOn()) void seg.offsetWidth;
    seg.style.setProperty('--i', mi);
    root._mi = mi;
    root.querySelector('#fav').onclick = () => { toggleFav(g); rer(); const f = root.querySelector('#fav'); if (f && V.fxOn()) V.fx.pop(f, 'fx-pop'); };
    if (full) root.querySelector('#gpx').onclick = () => { V.sfx.ui(); closeModal(); };
    const on = (id, fn) => { const e = root.querySelector('#' + id); if (e) e.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (b.dataset.why) { V.sfx.bad(); return toast(b.dataset.why); }
      fn(b.dataset.v); saveCfg(g, cfg); V.sfx.ui(); rer();
    }); };
    on('mode', x => cfg.mode = x);
    on('level', x => cfg.level = +x);
    on('first', x => cfg.first = x);
    (g.options || []).forEach(o => on('o_' + o.id, x => cfg.opts[o.id] = isNaN(+x) ? x : +x));
    const voiceGo = () => { saveCfg(g, cfg); if (!V.online) return; if (full) closeModal(); return g.table ? V.online.table(g, cfg.opts, cfg.level) : V.online.linkInvite(g, cfg.opts); };
    const goBtn = root.querySelector('#go'); if (goBtn) goBtn.onclick = () => { if (voice) return voiceGo(); saveCfg(g, cfg); play(g, cfg); };
    const accBtn = root.querySelector('#acc'); if (accBtn) accBtn.onclick = () => { V.sfx.ui(); closeModal(); home('profile'); };
    if (cfg.mode === 'online' && V.online) V.online.picker(root.querySelector('#ofr'), g, cfg.opts);
    if (cfg.mode === 'open' && V.online) V.online.openPanel(root.querySelector('#ofr'), g, cfg.opts);
    if (cfg.mode === 'table' && V.online) V.online.tablePanel(root.querySelector('#ofr'), g, cfg.opts, cfg.level);
    root.querySelector('#tut').onclick = tut;
    panelApi = {
      g,
      go() { if (cfg.mode === 'online' || vNeedAcc || dcNone) return; if (voice) return voiceGo(); if (cfg.mode === 'table') return V.online && V.online.table(g, cfg.opts, cfg.level); if (cfg.mode === 'open') return V.online && V.online.seek(g, cfg.opts); saveCfg(g, cfg); play(g, cfg); },
      tut,
      level(i) { if (cfg.mode !== 'ai' && cfg.mode !== 'table' && !vTable) return; cfg.level = Math.max(0, Math.min(3, i)); saveCfg(g, cfg); V.sfx.tick(); rer(); },
      step(d) { this.level(cfg.level + d); },
      mode() { if (g.noAI) return; cfg.mode = cfg.mode !== 'ai' ? 'ai' : !dc ? 'local' : g.table || g.online ? 'voice' : 'ai'; saveCfg(g, cfg); V.sfx.tick(); rer(); },
      fav() { toggleFav(g); rer(); }
    };
  }

  // Phone: the panel opens as a bottom sheet over the home screen. Laptop: the panel lives next to the game grid.
  let sheetRoot = null;
  const sheetKeys = e => {
    const k = e.key; if (!panelApi) return false;
    if (/^[1-4]$/.test(k)) { panelApi.level(+k - 1); return true; }
    if (k === 's' || k === 'S') { panelApi.mode(); return true; }
    if ((k === 'f' || k === 'F') && panelApi.fav) { panelApi.fav(); return true; }
    if (k === 't' || k === 'T') { panelApi.tut(); return true; }
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
  function statsTab() {
    const t = totals();
    const rows = V.games.map(g => {
      const s = P.stats[g.id]; if (!s) return '';
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
        <div class="kpi"><b data-v="${t.total}">${t.total}</b><span>Partien</span></div>
        <div class="kpi"><b data-v="${t.aiWins}">${t.aiWins}</b><span>Siege gegen KI</span></div>
        <div class="kpi"><b data-v="${t.onWins}">${t.onWins}</b><span>Online-Siege</span></div>
        <div class="kpi"><b data-v="${t.rate}" data-s=" %">${t.rate} %</b><span>Siegquote</span></div>
      </div>
      <div class="slist">${rows || `<div class="empty">${IC.trophy}<b>Noch keine Partien</b><p>Spiel eine Runde, dann steht hier deine Bilanz pro Spiel: gegen die KI, online und zu zweit.</p><button class="btn primary" data-tab="games"><span>Spiel aussuchen</span></button></div>`}</div>
      ${rows ? '<div class="legend"><span><i class="w"></i>Siege</span><span><i class="d"></i>Remis</span><span><i class="l"></i>Niederlagen</span></div>' : ''}
    </section>`;
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
        ${sw('o_cb', !!settings.cb, 'Farbenblind-Modus', 'Muster auf den Steinen, Nummern auf den Figuren', IC.eye)}
        <div class="opt orow">${IC.globe}<span><b>Sprache</b><small>Language · Deutsch oder Englisch</small></span>${seg('lang', V.lang, [['de', 'Deutsch'], ['en', 'English']])}</div>
        <div class="opt orow">${IC.grid}<span><b>Spielbrett</b><small>Schach, Dame und Reversi</small></span>${seg('board', settings.board || 'std', [['std', 'Standard'], ['neon', 'Neon'], ['wood', 'Holz']])}</div>
      </div></div>
      <div class="ogroup"><h2 class="oh">Spiel</h2>
      <div class="optlist">
        ${sw('o_fast', !!settings.aiFast, 'Schnelle KI', 'Die KI zieht sofort, ohne Nachdenken und Zielen', IC.bolt)}
        ${sw('o_face', !!settings.face, 'Gegenüber sitzen', 'Zu zweit am Handy: Name und Hinweise für Spieler 2 stehen auf dem Kopf', IC.users)}
      </div></div>
      ${V.cloud && V.cloud.available() ? `<div class="ogroup"><h2 class="oh">Online</h2>
      <div class="optlist">
        ${sw('o_open', settings.openCards !== false, 'Offene Herausforderungen', 'Einblenden, wenn jemand einen Gegner sucht', IC.globe)}
        ${u && !u.anon ? `<button class="opt" id="o_push" role="switch" aria-checked="false">${IC.bell}<span><b>Benachrichtigungen</b><small id="o_pushs">Herausforderungen, Freundschaftsanfragen und wenn du in einer Partie über Tage dran bist</small></span><i class="sw"></i></button>` : ''}
        ${u ? sw('o_stealth', !!settings.stealth, 'Online-Status verbergen', 'Freunde sehen nicht, ob und was du gerade spielst, und können nicht zuschauen', IC.eye) : ''}
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
      <p class="about">Versus ${V.VERSION || ''} · ohne Werbung. KI und Spiele zu zweit laufen auch offline.<span class="only-fine"> Taste <kbd>?</kbd> zeigt alle Kürzel.</span><br><a href="rechtliches.html">Impressum und Datenschutz</a> · <a href="terms.html">Nutzungsbedingungen</a></p>
    </section>`;
  }
  function wireOpts(v) {
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
      if (g.dataset.k === 'lang' && b.dataset.v !== V.lang) setTimeout(() => location.reload(), 150);
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
    flip('o_fx', () => { settings.fx = settings.fx === 'low' ? 'full' : 'low'; applyFxClass(); return settings.fx !== 'low'; });
    flip('o_intro', () => (settings.intro = settings.intro === false));
    flip('o_coords', () => { settings.coords = settings.coords === false; applyFxClass(); return settings.coords; });
    flip('o_hints', () => { settings.hints = settings.hints === false; applyFxClass(); return settings.hints; });
    flip('o_cb', () => { settings.cb = !settings.cb; applyFxClass(); return settings.cb; });
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
    v.querySelector('#o_upd').onclick = () => { V.sfx.ui(); checkUpdate(); };
    v.querySelector('#o_tut').onclick = () => { P.seen = {}; S.set('seen', P.seen); toast('Alle Tutorials sind wieder neu'); };
    const sure = (b, fn) => b.onclick = () => {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.querySelector('b').textContent = 'Sicher? Nochmal tippen'; return; }
      fn();
    };
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
  addEventListener('scroll', () => document.documentElement.classList.toggle('scrolled', scrollY > 8), { passive: true });
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

  // first start: three short slides about what Versus is (shown once, like a tutorial)
  V.welcomeDue = () => !P.seen._welcome;
  function welcome() {
    if (P.seen._welcome) return;
    const icons = ['c4', 'chess', 'ships', 'ttt', 'pong', 'reversi'].map(id => V.byId[id] ? `<i style="--k:${'c4,chess,ships,ttt,pong,reversi'.split(',').indexOf(id)}">${V.byId[id].icon}</i>` : '').join('');
    const mode = (ic, b, s) => `<div class="wmode">${ic}<b>${b}</b><small>${s}</small></div>`;
    tutorial({
      id: '_welcome', name: 'Willkommen',
      tutorial: [
        { t: 'Willkommen bei Versus', demo: `<div class="wicons">${icons}</div>`, d: `<b>${V.games.length} Spiele für zwei bis vier</b>: Klassiker wie 4 Gewinnt und Schach, Strategie und schnelle Action-Duelle. Gemacht für eine schnelle Runde zwischendurch mit Freunden.` },
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

  // ---------- keyboard ----------
  let lastGame = null;
  function showKeys() {
    const row = (k, d) => `<div class="krow"><span>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</span><p>${d}</p></div>`;
    const m = openModal(`<div class="keys"><h3>Tastenkürzel</h3>
      <h4>Überall</h4>${row('?', 'Diese Übersicht')}${row('M', 'Ton an oder aus')}${row('Esc', 'Zurück oder schließen')}
      <h4>Spielauswahl</h4>${row('← → ↑ ↓', 'Spiel wählen')}${row('Enter', 'Spielen')}${row('1 2 3 4', 'KI-Stärke')}${row('/', 'Spiel suchen')}${row('S', 'Gegen KI oder zu zweit')}${row('F', 'Favorit an oder aus')}${row('T', 'Regeln')}
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
      if ((k === 'f' || k === 'F') && panelApi.fav) { panelApi.fav(); return true; }
      if (k === 't' || k === 'T') { panelApi.tut(); return true; }
      return false;
    };
    if (view === 'home') {
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
      if (k === 'Escape') { e.preventDefault(); P.playApi.back(); return; }
      if ((k === 'n' || k === 'N') && !e.repeat) { P.playApi.restart(); return; }
      if ((k === 't' || k === 'T') && !e.repeat) { P.playApi.tut(); return; }
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
    if (view === 'home') home();
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
  // announcement from the team (maintenance, news): a bar like the update bar; closed it stays closed until the text changes
  let noticeAt = 0;
  function noticeBar() {
    if (!V.cloud || !V.cloud.available() || navigator.onLine === false || Date.now() - noticeAt < 300000) return;
    noticeAt = Date.now();
    V.cloud.rpc('site_notice').then(n => {
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
    if (view === 'play' && P.playApi) { P.playApi.back(); return true; }
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
    view: () => view, tab: () => homeTab
  };
  // what js/play.js needs from the shell
  Object.assign(P, {
    mount, locked, guest, toast, home, setup, openModal, closeModal, nav, tutorial,
    enterPlay(g) { destroyCurrent(); view = 'play'; lastGame = g; selected = g; },
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
