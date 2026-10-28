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
    const s = root.querySelector('#snd'); if (s) s.onclick = toggleSound;
    const k = root.querySelector('#kbd'); if (k) k.onclick = showKeys;
    const a = root.querySelector('#acct'); if (a) a.onclick = () => { V.sfx.ui(); home('profile'); };
    const l = root.querySelector('#logo'); if (l) l.onclick = () => home('games');
  }
  // Guests (accounts exist, but nobody is logged in) can play these games against the AI and on one device.
  // Everything else, plus online matches and the rankings, needs a free account.
  const GUEST_GAMES = ['c4', 'ttt', 'ships', 'dots', 'reaction', 'pong'];
  const guest = () => !!(V.cloud && V.cloud.available() && !V.cloud.starting() && !V.cloud.user());
  const locked = g => !!g && guest() && !GUEST_GAMES.includes(g.id);
  V.guest = guest; V.locked = locked;
  // account button in the header: name when logged in, otherwise "Gast · Anmelden"
  function acctChip() {
    if (!V.cloud || !V.cloud.available()) return '';
    const u = V.cloud.user();
    return `<button class="acct${u ? ' in' : ' guest'}" id="acct" title="Konto">${IC.user}<span>${u ? u.username : 'Gast'}</span>${u ? '' : '<em>Anmelden</em>'}</button>`;
  }
  function refreshAcct() {
    const a = document.getElementById('acct'); if (!a) return;
    const t = document.createElement('div'); t.innerHTML = acctChip(); const n = t.firstElementChild;
    if (n) { a.replaceWith(n); n.onclick = () => { V.sfx.ui(); home('profile'); }; }
  }
  function toggleSound() {
    settings.sound = !settings.sound; saveSettings(); V.sfx.ui();
    if (V.music) V.music.apply();
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
    if (V.cloud) V.cloud.touch(null);
    const tabs = `<nav class="tabs" aria-label="Bereiche"><i class="tab-ind"></i>${TABS.map(([id, l, ic]) => `<button data-tab="${id}" class="${homeTab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`).join('')}</nav>`;
    const v = mount(`<div class="view home">${header(tabs.replace('class="tabs"', 'class="tabs desk"'))}<div class="hbody">${tabBody()}</div>${tabs.replace('class="tabs"', 'class="tabs bar"')}</div>`);
    wireHeader(v);
    v.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== homeTab) { V.sfx.ui(); home(b.dataset.tab); } });
    placeInd(v, false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(v, false));
    wireBody(v.querySelector('.hbody'));
  }
  function offlineTab() {
    return `<section class="page"><div class="empty">${IC.wifioff}<b>Du bist offline</b><p>Freunde, Herausforderungen und Ranglisten brauchen Internet. Gegen die KI oder zu zweit an einem Gerät kannst du trotzdem spielen.</p><button class="btn primary" data-tab="games"><span>Zu den Spielen</span></button></div></section>`;
  }
  function tabBody() { return homeTab === 'online' && navigator.onLine === false ? offlineTab() : homeTab === 'stats' ? statsTab() : homeTab === 'opts' ? optsTab() : homeTab === 'profile' ? (V.account ? V.account.tab() : '') : homeTab === 'online' ? (V.online ? V.online.tab() : '') : gamesTab(); }
  function wireBody(b) {
    wireInstall(b);
    if (homeTab === 'games') wireGames(b);
    if (homeTab === 'opts') wireOpts(b);
    if (homeTab === 'profile' && V.account) V.account.wire(b);
    if (homeTab === 'online' && V.online) V.online.wire(b);
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
    const recent = S.get('recent', null), rg = recent && V.byId[recent];
    const rc = rg && loadCfg(rg);
    // the chips count the games of a category; guests see how many of them they can play right away
    const count = c => { const l = V.games.filter(g => c === 'Alle' || g.cat === c); return guest() ? l.filter(g => !locked(g)).length + '/' + l.length : l.length; };
    return `<div class="select">
      <section class="sel-main">
        <div class="sel-head">
          <h1 class="title"><span>Wähl dein</span> Duell</h1>
          <p class="tagline">${V.games.length} Spiele für zwei bis vier an einem Gerät. Oder du gegen die KI in vier Stufen.</p>
        </div>
        ${installCard()}
        ${rg && !locked(rg) ? `<button class="cont" id="cont" style="--acc:${rg.accent || 'var(--pink)'}"><div class="ic">${rg.icon}</div><div class="ct"><small>Weiterspielen</small><b>${rg.name}</b><span>${rc.mode === 'local' ? 'Zu zweit' : 'Gegen KI · ' + V.LEVELS[rc.level]}</span></div><span class="go">${IC.play}</span></button>` : ''}
        <div class="chips" role="tablist">${['Alle', ...V.CATS].map(c => `<button role="tab" data-f="${c}" class="${homeFilter === c ? 'on' : ''}">${c}<small>${count(c)}</small></button>`).join('')}</div>
        <div id="glist">${gameList()}</div>
      </section>
      <aside class="sel-panel" id="panel"></aside>
    </div>`;
  }
  // Phone, "Alle": one row per category that you swipe sideways, so all games fit on about one and a half screens.
  // A chosen category (and the laptop) shows a grid. Guests get the free games first and the others
  // collected in one "Mit Konto" box instead of a wall of locked tiles.
  function gameList() {
    const list = V.games.filter(g => homeFilter === 'Alle' || g.cat === homeFilter);
    const free = list.filter(g => !locked(g)), shut = list.filter(g => locked(g));
    // the entrance stagger restarts in every row, so lower rows do not wait for the ones above
    let i = 0;
    const tiles = (games, cls = '') => `<div class="tiles${cls}">${games.map(g => tile(g, i++)).join('')}</div>`;
    const row = (title, games) => {
      if (!games.length) return '';
      i = Math.min(i, 2);
      return `<section class="grow"><h2 class="gh">${title}<small>${games.length}</small></h2>${tiles(games, ' row')}</section>`;
    };
    if (!wide() && homeFilter === 'Alle') return guest() ? row('Sofort spielbar', free) + lockBox(shut) : V.CATS.map(c => row(c, list.filter(g => g.cat === c))).join('');
    return (free.length ? tiles(free) : '') + lockBox(shut);
  }
  function lockBox(games) {
    if (!games.length) return '';
    return `<div class="lockc"><div class="lk-h"><span class="lki">${IC.lock}</span><div><b>Mit Konto: ${games.length} weitere Spiele</b><small>Kostenlos. Dazu Online-Partien, Freunde und die Rangliste.</small></div></div>
      <div class="lk-ics">${games.map(g => `<button class="lkg" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'}" aria-label="${g.name} (mit Konto)"><span class="ic">${g.icon}</span><small>${g.name}</small></button>`).join('')}</div>
      <button class="btn primary sm" data-tab="profile"><span>${IC.user}Konto erstellen</span></button></div>`;
  }
  function wireGames(v) {
    wireTiles(v.querySelector('#glist'));
    v.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
      homeFilter = b.dataset.f; V.sfx.ui();
      v.querySelectorAll('.chips button').forEach(x => x.classList.toggle('on', x === b));
      const tl = v.querySelector('#glist');
      tl.innerHTML = gameList();
      wireTiles(tl);
      tl.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { V.sfx.ui(); home(x.dataset.tab); });
    });
    const c = v.querySelector('#cont');
    if (c) c.onclick = () => { const g = V.byId[S.get('recent')]; V.sfx.ui(); play(g, loadCfg(g)); };
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
      t.onclick = () => {
        if (!wide()) { V.sfx.ui(); return setup(g); }
        if (selected === g && t.classList.contains('sel')) return;
        V.sfx.ui(); selectTile(g);
      };
      t.addEventListener('focus', () => { if (wide() && selected !== g) selectTile(g); });
    });
  }
  function tile(g, i) {
    const s = P.stats[g.id];
    const w = s ? s.ai.reduce((a, r) => a + r.w, 0) : 0, l = s ? s.ai.reduce((a, r) => a + r.l, 0) : 0;
    const loc = s ? s.local.a + s.local.b + s.local.d : 0;
    const played = s && (s.ai.reduce((a, r) => a + r.w + r.l + r.d, 0) + loc) > 0;
    const isSel = wide() && selected && selected.id === g.id;
    const lock = locked(g);
    return `<button class="tile${isSel ? ' sel' : ''}${lock ? ' locked' : ''}" data-id="${g.id}" style="--acc:${g.accent || 'var(--pink)'};--i:${i}">
      <span class="art"><span class="ic">${g.icon}</span>${lock ? `<span class="lk">${IC.lock}</span>` : ''}</span>
      <span class="tx"><b>${g.name}</b><small>${g.short}</small></span>
      <span class="meta">${lock ? '<em class="lock">Mit Konto</em>' : played ? `<em>${g.cat}</em>` : '<em class="new">Neu</em>'}${played && g.noAI ? `<em class="rec">${loc}× gespielt</em>` : played && w + l ? `<em class="rec">KI ${w}:${l}</em>` : ''}</span></button>`;
  }

  // ---------- game panel (desktop side panel and phone setup screen) ----------
  function loadCfg(g) {
    const saved = S.get('setup', {})[g.id] || {};
    const cfg = { mode: g.noAI ? (saved.mode === 'table' && g.table ? 'table' : 'local') : ((saved.mode === 'online' || saved.mode === 'open') && !g.online) || (saved.mode === 'table' && !g.table) ? 'ai' : (saved.mode || 'ai'), level: saved.level ?? 1, first: saved.first || 'me', opts: {} };
    (g.options || []).forEach(o => { cfg.opts[o.id] = saved.opts && saved.opts[o.id] !== undefined ? saved.opts[o.id] : o.def; });
    return cfg;
  }
  function saveCfg(g, cfg) { const all = S.get('setup', {}); all[g.id] = cfg; S.set('setup', all); }
  let panelApi = null;
  function renderPanel(root, g, full) {
    const cfg = loadCfg(g), s = stat(g.id);
    // options can be limited to some modes (e.g. the chess clock makes no sense against the AI)
    const optsHere = (g.options || []).filter(o => !o.modes || o.modes.includes(cfg.mode));
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
    if (locked(g)) {
      const ok = GUEST_GAMES.map(id => V.byId[id] && V.byId[id].name).filter(Boolean);
      gp.querySelector('.gp-body').innerHTML = `<div class="gp-lock"><span class="lki">${IC.lock}</span><div><b>Mit Konto spielbar</b>
        <p>Als Gast kannst du ${ok.slice(0, -1).join(', ')} und ${ok[ok.length - 1]} spielen. Mit einem kostenlosen Konto sind alle ${V.games.length} Spiele frei, dazu Online-Partien, Freunde und die Rangliste.</p></div></div>
        <div class="gp-go"><button class="btn primary big" id="acc"><span>${IC.user}Konto erstellen</span></button><button class="btn ghost" id="tut"><span>${IC.book}Regeln</span></button></div>`;
      const rer = () => renderPanel(root, g, full);
      root.querySelector('#acc').onclick = () => { V.sfx.ui(); home('profile'); };
      root.querySelector('#tut').onclick = () => tutorial(g, rer);
      panelApi = { g, go() { home('profile'); }, tut() { tutorial(g, rer); }, level() { }, step() { }, mode() { } };
      return;
    }
    gp.querySelector('.gp-body').innerHTML = `
      <div class="gp-mode${g.online && V.cloud && V.cloud.available() ? ' four' : g.table && V.cloud && V.cloud.available() ? ' three' : ''}" id="mode">
        ${g.noAI ? '' : `<button data-v="ai" class="${cfg.mode === 'ai' ? 'on' : ''}">${IC.robot}<span>Gegen KI</span></button>`}
        <button data-v="local" class="${cfg.mode === 'local' ? 'on' : ''}">${IC.users}<span>${g.party ? 'Am Gerät' : 'Zu zweit'}</span></button>
        ${g.online && V.cloud && V.cloud.available() ? `<button data-v="online" class="${cfg.mode === 'online' ? 'on' : ''}${guest() ? ' lockd' : ''}">${guest() ? IC.lock : IC.user}<span>Freund</span></button>
        <button data-v="open" class="${cfg.mode === 'open' ? 'on' : ''}${guest() ? ' lockd' : ''}">${guest() ? IC.lock : IC.globe}<span>Online</span></button>` : ''}
        ${g.table && V.cloud && V.cloud.available() ? `<button data-v="table" class="${cfg.mode === 'table' ? 'on' : ''}${guest() ? ' lockd' : ''}">${guest() ? IC.lock : IC.globe}<span>Online</span></button>` : ''}
      </div>
      ${cfg.mode === 'ai' || cfg.mode === 'table' ? `<div class="gp-lvl">
        <div class="lv-top"><span>Stärke</span><b class="l${lvl}">${V.LEVELS[lvl]}</b><em>Bilanz ${s.ai[lvl].w}:${s.ai[lvl].l}</em></div>
        <div class="lv-bar" id="level">${V.LEVELS.map((l, i) => `<button data-v="${i}" class="${i <= lvl ? 'fill' : ''} ${i === lvl ? 'on' : ''}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
        <p class="hint">${cfg.mode === 'table' ? 'So stark spielt die KI auf freien Plätzen.' : (g.levelInfo || LEVEL_INFO)[lvl]}</p></div>` : cfg.mode === 'online' || cfg.mode === 'open' ? '<div class="gp-online" id="ofr"></div>' :`<p class="hint local">${g.localHint || `Ihr spielt abwechselnd am selben Gerät${g.cat === 'Action' ? ', jeder auf seiner Hälfte' : ''}.`}</p>`}
      ${(cfg.mode === 'ai' && !g.noFirst) || optsHere.length ? `<div class="gp-more">
        ${cfg.mode === 'ai' && !g.noFirst ? chipRow('first', g.firstTitle || 'Beginn', [['me', firstLabel[0]], ['ai', firstLabel[1]], ['rand', firstLabel[2]]], cfg.first) : ''}
        ${optsHere.map(o => chipRow('o_' + o.id, o.label, o.choices, cfg.opts[o.id])).join('')}
      </div>` : ''}
      ${cfg.mode === 'table' ? '<div class="gp-online" id="ofr"></div>' : ''}
      <div class="gp-go">${cfg.mode === 'online' || cfg.mode === 'open' || cfg.mode === 'table' ? '' : `<button class="btn primary big" id="go"><span>${IC.play}Spielen</span><kbd class="only-fine">Enter</kbd></button>`}
        <button class="btn ghost" id="tut"><span>${IC.book}Regeln${P.seen[g.id] ? '' : '<i class="dot"></i>'}</span></button></div>`;
    const rer = () => renderPanel(root, g, full);
    const on = (id, fn) => { const e = root.querySelector('#' + id); if (e) e.querySelectorAll('button').forEach(b => b.onclick = () => { fn(b.dataset.v); saveCfg(g, cfg); V.sfx.ui(); rer(); }); };
    on('mode', x => cfg.mode = x);
    on('level', x => cfg.level = +x);
    on('first', x => cfg.first = x);
    (g.options || []).forEach(o => on('o_' + o.id, x => cfg.opts[o.id] = isNaN(+x) ? x : +x));
    const goBtn = root.querySelector('#go'); if (goBtn) goBtn.onclick = () => { saveCfg(g, cfg); play(g, cfg); };
    if (cfg.mode === 'online' && V.online) V.online.picker(root.querySelector('#ofr'), g, cfg.opts);
    if (cfg.mode === 'open' && V.online) V.online.openPanel(root.querySelector('#ofr'), g, cfg.opts);
    if (cfg.mode === 'table' && V.online) V.online.tablePanel(root.querySelector('#ofr'), g, cfg.opts, cfg.level);
    root.querySelector('#tut').onclick = () => tutorial(g, rer);
    panelApi = {
      g,
      go() { if (cfg.mode === 'online') return; if (cfg.mode === 'table') return V.online && V.online.table(g, cfg.opts, cfg.level); if (cfg.mode === 'open') return V.online && V.online.seek(g, cfg.opts); saveCfg(g, cfg); play(g, cfg); },
      tut() { tutorial(g, rer); },
      level(i) { if (cfg.mode !== 'ai' && cfg.mode !== 'table') return; cfg.level = Math.max(0, Math.min(3, i)); saveCfg(g, cfg); V.sfx.tick(); rer(); },
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
        <div class="kpi"><b>${t.total}</b><span>Partien</span></div>
        <div class="kpi"><b>${t.aiWins}</b><span>Siege gegen KI</span></div>
        <div class="kpi"><b>${t.onWins}</b><span>Online-Siege</span></div>
        <div class="kpi"><b>${t.rate} %</b><span>Siegquote</span></div>
      </div>
      <div class="slist">${rows || `<div class="empty">${IC.trophy}<b>Noch keine Partien</b><p>Spiel eine Runde, dann steht hier deine Bilanz pro Spiel: gegen die KI, online und zu zweit.</p><button class="btn primary" data-tab="games"><span>Spiel aussuchen</span></button></div>`}</div>
      ${rows ? '<div class="legend"><span><i class="w"></i>Siege</span><span><i class="d"></i>Remis</span><span><i class="l"></i>Niederlagen</span></div>' : ''}
    </section>`;
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
        ${u ? sw('o_stealth', !!settings.stealth, 'Online-Status verbergen', 'Freunde sehen nicht, ob und was du gerade spielst', IC.eye) : ''}
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
      <p class="about">Versus ${V.VERSION || ''} · ohne Werbung. KI und Spiele zu zweit laufen auch offline.<span class="only-fine"> Taste <kbd>?</kbd> zeigt alle Kürzel.</span></p>
    </section>`;
  }
  function wireOpts(v) {
    const flip = (id, fn) => { const b = v.querySelector('#' + id); if (b) b.onclick = () => { const on = fn(); b.setAttribute('aria-checked', on); b.querySelector('.sw').classList.toggle('on', on); saveSettings(); V.sfx.ui(); }; };
    const dimSliders = () => {
      v.querySelector('[data-vol=vol]').classList.toggle('off', !settings.sound);
      v.querySelector('[data-vol=mvol]').classList.toggle('off', !settings.sound || settings.music === false);
    };
    flip('o_snd', () => {
      settings.sound = !settings.sound; const s = document.getElementById('snd'); if (s) s.innerHTML = settings.sound ? IC.sound : IC.mute;
      dimSliders(); V.music.apply();
      return settings.sound;
    });
    flip('o_mus', () => { settings.music = settings.music === false; dimSliders(); setTimeout(() => V.music.apply(), 0); return settings.music; });
    v.querySelectorAll('[data-vol]').forEach(row => {
      const k = row.dataset.vol, r = row.querySelector('input'), out = row.querySelector('em');
      r.oninput = () => { settings[k] = +r.value; r.style.setProperty('--p', r.value + '%'); out.textContent = r.value + ' %'; if (k === 'mvol') V.music.apply(); };
      r.onchange = () => { saveSettings(); if (k === 'vol') V.sfx.place(); };
    });
    v.querySelectorAll('.oseg').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      settings[g.dataset.k] = b.dataset.v; saveSettings();
      g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      V.sfx.ui();
      if (g.dataset.k === 'haptic') V.buzz([40, 60, 40]);
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
    flip('o_fast', () => (settings.aiFast = !settings.aiFast));
    flip('o_face', () => (settings.face = !settings.face));
    flip('o_open', () => (settings.openCards = settings.openCards === false));
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
      const s = document.getElementById('snd'); if (s) s.innerHTML = IC.sound;
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
    document.body.appendChild(modalEl);
    nav.hide();
    queueGuard();
    return modalEl.firstElementChild;
  }
  function closeModal() {
    if (!modalEl) return;
    const el = modalEl; modalEl = null; modalKeys = null;
    queueGuard();
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
    if (view === 'home') home();
    else if (view === 'setup' && wide()) home('games', selected);
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
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) { swWaiting = reg.waiting; updateBar(); }
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { swWaiting = w; updateBar(); } });
      });
    }).catch(() => { });
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
      cloudUser = id; cloudKnown = known;
      if (id && settings.stealth) V.cloud.rpc('set_stealth', { hide: true }).catch(() => { });
      if (view === 'home' && homeTab !== 'profile') return home();
      if (view === 'setup' && selected) return setup(selected);
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
    if (qt && TABS.some(t => t[0] === qt)) homeTab = qt;
    if (q.has('tab') || q.has('app') || q.has('add') || q.has('table')) try { history.replaceState(null, '', location.pathname); } catch (e) { }
    registerSW();
    netState();
    if (!document.getElementById('fx')) { const f = V.el('div'); f.id = 'fx'; document.body.appendChild(f); }
    if (V.cloud && V.cloud.available()) { V.cloud.on(onCloud); V.cloud.init(); }
    const b = document.getElementById('boot');
    if (!b || !V.fxOn() || settings.intro === false || getComputedStyle(b).display === 'none') { if (b) b.remove(); home(); setTimeout(welcome, 300); return; }
    let opened = false;
    const open = skip => {
      if (opened) return; opened = true;
      window.removeEventListener('keydown', onKey, true);
      b.classList.add(skip ? 'skip' : 'open');
      home();
      setTimeout(welcome, skip ? 350 : 900);
      setTimeout(() => b.remove(), skip ? 260 : 800);
    };
    const onKey = e => { e.preventDefault(); e.stopPropagation(); open(true); };
    b.addEventListener('pointerdown', () => open(true));
    window.addEventListener('keydown', onKey, true);
    setTimeout(() => open(false), Math.max(0, 1250 - performance.now()));
  };
})();
