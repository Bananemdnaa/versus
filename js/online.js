// Versus: friends, invitations, online matches against friends and the rankings.
(function () {
  'use strict';
  const C = () => V.cloud, IC = () => V.ui.IC;
  const ONLINE = ['c4', 'ships', 'ttt', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots'];
  ONLINE.forEach(id => { if (V.byId[id]) V.byId[id].online = true; });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gname = id => (V.byId[id] ? V.byId[id].name : id || '');
  function ago(t) {
    if (!t) return 'nie';
    const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
    if (s < 3600) return `vor ${Math.max(1, Math.round(s / 60))} Min.`;
    if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
    return `vor ${Math.round(s / 86400)} Tagen`;
  }
  const ready = () => C() && C().available() && C().user();
  const optsFor = g => { const s = (V.store.get('setup', {})[g.id] || {}).opts || {}; const o = {}; (g.options || []).forEach(x => { o[x.id] = s[x.id] !== undefined ? s[x.id] : x.def; }); return o; };

  // ---------- starting a match ----------
  function start(st) {
    const g = V.byId[st.game]; if (!g) return V.ui.toast('Unbekanntes Spiel');
    const side = st.role === 'a' ? st.a_side : 3 - st.a_side;
    const opp = st.role === 'a' ? st.b_name : st.a_name;
    hideInvite();
    V.ui.play(g, { mode: 'online', opts: st.opts || {}, match: { id: st.id, side, opp, init: st } });
  }
  async function resume(id) {
    try {
      const st = await C().rpc('match_state', { mid: id, since: 0 });
      if (st.status === 'live') return start(st);
      V.ui.toast('Diese Partie ist schon vorbei.'); V.ui.home('online');
    } catch (e) { V.ui.toast(e.message); V.ui.home('online'); }
  }
  async function watch(id) {
    try {
      const st = await C().rpc('match_state', { mid: id, since: 0 });
      if (!st.a_side) return V.ui.toast('Die Partie hat noch nicht angefangen.');
      const g = V.byId[st.game];
      V.ui.play(g, { mode: 'watch', opts: st.opts || {}, match: { id: st.id, aSide: st.a_side, aName: st.a_name, bName: st.b_name, init: st } });
    } catch (e) { V.ui.toast(e.message); }
  }

  // invite a friend and wait for the answer
  async function invite(name, g, opts) {
    let mid;
    try { mid = await C().rpc('match_invite', { opp: name, gm: g.id, op: opts || optsFor(g) }); }
    catch (e) { V.ui.toast(e.message); V.sfx.bad(); return; }
    let done = false, t = null;
    const stop = () => { done = true; clearTimeout(t); };
    const m = V.ui.openModal(`<div class="confirm wait"><div class="spin"><i></i><i></i></div>
      <h3>${name ? 'Warte auf ' + esc(name) : 'Suche Gegner'}</h3><p>${esc(g.name)} · ${name ? 'die Einladung läuft, solange dieses Fenster offen ist.' : 'alle eingeloggten Spieler sehen deine Herausforderung. Wer zuerst beitritt, spielt gegen dich.'}</p>
      <div class="actions"><button class="btn ghost" id="wc"><span>Abbrechen</span></button></div></div>`, '', () => {
      if (!done) { stop(); C().rpc('match_cancel', { mid }).catch(() => { }); }
    });
    m.querySelector('#wc').onclick = () => V.ui.closeModal();
    const poll = async () => {
      if (done) return;
      try {
        const st = await C().rpc('match_state', { mid, since: 0 });
        if (done) return;
        if (st.status === 'live') { stop(); V.ui.closeModal(); V.sfx.goal(); return start(st); }
        if (st.status !== 'invited') {
          stop(); V.ui.closeModal();
          V.ui.toast(st.status === 'declined' ? name + ' hat abgelehnt' : name ? 'Die Einladung ist abgelaufen' : 'Niemand ist beigetreten');
          return;
        }
      } catch (e) { }
      t = setTimeout(poll, 1500);
    };
    t = setTimeout(poll, 1200);
  }

  // ---------- incoming invitations (polled while logged in) ----------
  let pendT = null, pending = null, card = null, cardId = null;
  function startPolling() { if (pendT) return; pendT = setInterval(check, 5000); check(); }
  function stopPolling() { clearInterval(pendT); pendT = null; hideInvite(); pending = null; }
  async function check() {
    if (!ready()) return stopPolling();
    if (document.querySelector('.view.play.net, .view.play.watch')) return;
    try {
      const p = await C().rpc('my_pending');
      const before = JSON.stringify(pending);
      pending = p;
      const openList = (p.open || []).filter(o => !dismissed.has(o.id));
      if (p.invites && p.invites.length) showInvite(p.invites[0]); else if (openList.length && !p.active) showInvite(Object.assign({ open: true }, openList[0])); else hideInvite();
      if (JSON.stringify(p) !== before && V.ui.view() === 'home' && V.ui.tab() === 'online') refreshTab();
      badge();
    } catch (e) { }
  }
  function badge() {
    const n = pending ? (pending.requests || 0) + (pending.invites || []).length : 0;
    document.querySelectorAll('.tabs [data-tab="online"]').forEach(b => {
      let i = b.querySelector('.nb'); if (!n) { if (i) i.remove(); return; }
      if (!i) { i = document.createElement('i'); i.className = 'nb'; b.appendChild(i); }
      i.textContent = n;
    });
  }
  const dismissed = new Set();
  async function join(id) {
    try { const st = await C().rpc('match_join', { mid: id }); hideInvite(); start(st); }
    catch (e) { V.ui.toast(e.message); hideInvite(); check(); }
  }
  function showInvite(inv) {
    if (cardId === inv.id) return;
    hideInvite(); cardId = inv.id;
    card = V.el('div', 'icard', `<div class="ic-ico">${V.byId[inv.game] ? V.byId[inv.game].icon : ''}</div>
      <div class="ic-tx"><small>${inv.open ? 'Sucht einen Gegner' : 'Herausforderung'}</small><b>${esc(inv.from)}</b><span>${esc(gname(inv.game))}</span></div>
      <div class="ic-act"><button class="btn primary sm" data-a="ok"><span>${inv.open ? 'Mitspielen' : 'Annehmen'}</span></button><button class="btn ghost sm" data-a="no"><span>${inv.open ? 'Nein danke' : 'Ablehnen'}</span></button></div>`);
    if (inv.open) card.classList.add('open');
    document.body.appendChild(card);
    V.sfx.go(); V.buzz([40, 60, 40]);
    card.querySelector('[data-a=ok]').onclick = async () => {
      if (inv.open) return join(inv.id);
      try { const st = await C().rpc('match_respond', { mid: inv.id, ok: true }); hideInvite(); start(st); }
      catch (e) { V.ui.toast(e.message); hideInvite(); }
    };
    card.querySelector('[data-a=no]').onclick = () => { if (inv.open) { dismissed.add(inv.id); return hideInvite(); } C().rpc('match_respond', { mid: inv.id, ok: false }).catch(() => { }); hideInvite(); };
  }
  function hideInvite() { if (card) { card.classList.add('out'); const c = card; setTimeout(() => c.remove(), 250); } card = null; cardId = null; }

  // ---------- Online tab ----------
  let friendsData = null, board = null, boardGame = '', searchRes = null, searchQ = '', sureRemove = null;
  function tab() {
    if (!C() || !C().available()) return `<section class="page"><h1 class="title"><span>Online</span> spielen</h1><div class="acard"><p class="lead">Online-Spiele sind gleich da.</p></div></section>`;
    const loginCard = !C().user() ? `<div class="acard"><p class="lead">Mit einem Konto kannst du Freunde hinzufügen, sie zu Partien herausfordern und in die Rangliste kommen.</p>
      <button class="btn primary" data-tab="profile"><span>${IC().user}Anmelden oder Konto erstellen</span></button></div>` : '';
    return `<section class="online">
      <h1 class="title"><span>Online</span> spielen</h1>
      ${loginCard}
      <div class="ogrid">
        ${C().user() ? `<div class="ocol">
          <div id="oactive"></div>
          <div class="apanel"><h3>Freunde</h3>
            <form class="asearch" id="ofind"><input class="inp" id="oq" placeholder="Spieler suchen und hinzufügen" autocapitalize="none" spellcheck="false" value="${esc(searchQ)}"><button class="btn sm" type="submit"><span>Suchen</span></button></form>
            <div id="ores"></div>
            <div id="ofriends"><p class="muted">Lädt …</p></div>
          </div></div>` : ''}
        <div class="ocol"><div class="apanel"><h3>Rangliste <small>gewonnene Partien gegen Spieler</small></h3>
          <div class="chips mini" id="obg">${[['', 'Gesamt'], ...ONLINE.map(id => [id, gname(id)])].map(([id, l]) => `<button data-g="${id}" class="${boardGame === id ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
          <div id="oboard"><p class="muted">Lädt …</p></div></div></div>
      </div></section>`;
  }
  function refreshTab() { const b = document.querySelector('.hbody'); if (b && V.ui.tab() === 'online' && !(document.activeElement && document.activeElement.id === 'oq')) { fillFriends(b); fillActive(b); } }
  function wire(b) {
    if (!C() || !C().available()) return;
    b.querySelectorAll('#obg button').forEach(x => x.onclick = () => {
      boardGame = x.dataset.g; V.sfx.ui();
      b.querySelectorAll('#obg button').forEach(y => y.classList.toggle('on', y === x));
      loadBoard(b);
    });
    loadBoard(b);
    if (!C().user()) return;
    const f = b.querySelector('#ofind');
    f.onsubmit = async e => {
      e.preventDefault(); searchQ = b.querySelector('#oq').value.trim();
      if (searchQ.length < 2) { searchRes = []; return fillSearch(b, 'Mindestens 2 Zeichen.'); }
      try { searchRes = await C().rpc('player_search', { q: searchQ }); fillSearch(b); } catch (x) { fillSearch(b, x.message); }
    };
    loadFriends(b); fillActive(b);
  }
  async function loadFriends(b) {
    try { friendsData = await C().rpc('friends'); } catch (e) { friendsData = { error: e.message }; }
    fillFriends(b);
  }
  function fillActive(b) {
    const el = b.querySelector('#oactive'); if (!el) return;
    const p = pending || {};
    el.innerHTML = (p.active ? `<div class="obanner"><div><small>Laufende Partie</small><b>${esc(gname(p.active.game))} gegen ${esc(p.active.opponent)}</b></div><button class="btn primary sm" id="ores_go"><span>${IC().play}Weiterspielen</span></button></div>` : '') +
      (p.invites || []).map(i => `<div class="obanner inv"><div><small>Herausforderung</small><b>${esc(i.from)} · ${esc(gname(i.game))}</b></div>
        <div class="arow"><button class="btn primary sm" data-acc="${i.id}"><span>Annehmen</span></button><button class="btn ghost sm" data-dec="${i.id}"><span>Ablehnen</span></button></div></div>`).join('');
    el.innerHTML += (p.open || []).map(o => `<div class="obanner open"><div><small>Sucht einen Gegner</small><b>${esc(o.from)} · ${esc(gname(o.game))}</b></div><button class="btn primary sm" data-join="${o.id}"><span>Mitspielen</span></button></div>`).join('');
    el.querySelectorAll('[data-join]').forEach(x => x.onclick = () => join(x.dataset.join));
    const go = el.querySelector('#ores_go'); if (go) go.onclick = () => resume(p.active.id);
    el.querySelectorAll('[data-acc]').forEach(x => x.onclick = async () => { try { start(await C().rpc('match_respond', { mid: x.dataset.acc, ok: true })); } catch (e) { V.ui.toast(e.message); check(); } });
    el.querySelectorAll('[data-dec]').forEach(x => x.onclick = () => { C().rpc('match_respond', { mid: x.dataset.dec, ok: false }).then(check, check); });
  }
  function fillSearch(b, msg) {
    const el = b.querySelector('#ores'); if (!el) return;
    if (msg) { el.innerHTML = `<p class="aerr">${esc(msg)}</p>`; return; }
    if (!searchRes || !searchRes.length) { el.innerHTML = searchRes ? '<p class="muted">Niemand gefunden.</p>' : ''; return; }
    el.innerHTML = searchRes.map(r => `<div class="fline"><span class="adot"></span><b>${esc(r.username)}</b>
      ${r.state === 'friend' ? '<em class="rtag">Freund</em>' : r.state === 'outgoing' ? '<em class="rtag">angefragt</em>' : `<button class="btn sm${r.state === 'incoming' ? ' primary' : ''}" data-req="${esc(r.username)}"><span>${r.state === 'incoming' ? 'Annehmen' : 'Anfrage senden'}</span></button>`}</div>`).join('');
    el.querySelectorAll('[data-req]').forEach(x => x.onclick = async () => {
      try {
        const r = await C().rpc('friend_request', { name: x.dataset.req });
        V.ui.toast({ sent: 'Anfrage gesendet', accepted: 'Ihr seid jetzt Freunde', friends: 'Ihr seid schon Freunde', pending: 'Schon angefragt' }[r] || r);
        searchRes = await C().rpc('player_search', { q: searchQ }); fillSearch(b); loadFriends(b);
      } catch (e) { V.ui.toast(e.message); }
    });
  }
  function fillFriends(b) {
    const el = b.querySelector('#ofriends'); if (!el || !friendsData) return;
    if (friendsData.error) { el.innerHTML = `<p class="aerr">${esc(friendsData.error)}</p>`; return; }
    const d = friendsData;
    const inc = (d.incoming || []).map(n => `<div class="fline req"><span class="adot"></span><b>${esc(n)}</b><small>möchte dein Freund sein</small>
      <button class="btn primary sm" data-yes="${esc(n)}"><span>Annehmen</span></button><button class="btn ghost sm" data-no="${esc(n)}"><span>Nein</span></button></div>`).join('');
    const out = (d.outgoing || []).map(n => `<div class="fline"><span class="adot"></span><b>${esc(n)}</b><small>Anfrage gesendet</small><button class="btn ghost sm" data-rm="${esc(n)}"><span>Zurückziehen</span></button></div>`).join('');
    const fr = (d.friends || []).map(f => `<div class="fline${f.online ? ' on' : ''}"><span class="adot"></span><b>${esc(f.username)}</b>
      <small>${f.busy ? 'spielt gerade online' : f.online ? 'online' + (f.game && V.byId[f.game] ? ' · ' + esc(gname(f.game)) : '') : 'zuletzt ' + ago(f.seen)}</small>
      ${sureRemove === f.username ? `<button class="btn ghost sm danger" data-rm="${esc(f.username)}"><span>Wirklich?</span></button>` : `<button class="iconbtn sm" data-sure="${esc(f.username)}" aria-label="Freund entfernen">${IC().x}</button>`}</div>`).join('');
    el.innerHTML = (inc ? `<h4>Anfragen</h4>${inc}` : '') + (fr ? `<h4>Deine Freunde</h4>${fr}` : '<p class="muted">Noch keine Freunde. Such oben nach einem Namen und schick eine Anfrage.</p>') + (out ? `<h4>Gesendet</h4>${out}` : '');
    el.querySelectorAll('[data-yes]').forEach(x => x.onclick = () => C().rpc('friend_respond', { name: x.dataset.yes, ok: true }).then(() => { V.ui.toast('Ihr seid jetzt Freunde'); V.sfx.goal(); loadFriends(b); check(); }, e => V.ui.toast(e.message)));
    el.querySelectorAll('[data-no]').forEach(x => x.onclick = () => C().rpc('friend_respond', { name: x.dataset.no, ok: false }).then(() => { loadFriends(b); check(); }));
    el.querySelectorAll('[data-rm]').forEach(x => x.onclick = () => C().rpc('friend_remove', { name: x.dataset.rm }).then(() => { sureRemove = null; loadFriends(b); }));
    el.querySelectorAll('[data-sure]').forEach(x => x.onclick = () => { sureRemove = x.dataset.sure; fillFriends(b); });
  }
  async function loadBoard(b) {
    const el = b.querySelector('#oboard'); if (!el) return;
    try { board = await C().rpc('leaderboard', { gm: boardGame || null, lim: 50 }); } catch (e) { el.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
    const top = board.top || [], me = board.me;
    if (!top.length) { el.innerHTML = '<p class="muted">Noch keine Online-Partien gespielt. Fordere einen Freund heraus!</p>'; return; }
    const row = (r, cls = '') => `<div class="brow ${cls}"><span class="pos">${r.pos}</span><b>${esc(r.username)}</b><span class="w">${r.wins}</span><span class="p">${r.played}</span><span class="q">${r.played ? Math.round(r.wins / r.played * 100) + ' %' : '–'}</span></div>`;
    const myName = C().user() && C().user().username;
    el.innerHTML = `<div class="brow head"><span class="pos">#</span><b>Spieler</b><span class="w">Siege</span><span class="p">Partien</span><span class="q">Quote</span></div>
      ${top.map(r => row(r, r.username === myName ? 'me' : '')).join('')}
      ${me && !top.some(r => r.username === me.username) ? '<div class="brow gap">…</div>' + row(me, 'me') : ''}`;
  }

  // ---------- game panel: pick a friend to invite ----------
  async function picker(el, g, opts) {
    if (!el) return;
    if (!ready()) { el.innerHTML = `<p class="hint">Für Online-Partien brauchst du ein Konto.</p><button class="btn sm" data-tab-go="profile"><span>${IC().user}Anmelden</span></button>`; el.querySelector('[data-tab-go]').onclick = () => V.ui.home('profile'); return; }
    el.innerHTML = '<p class="hint">Freunde werden geladen …</p>';
    let d;
    try { d = await C().rpc('friends'); } catch (e) { el.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
    const fr = d.friends || [];
    if (!fr.length) { el.innerHTML = `<p class="hint">Noch keine Freunde. Im Reiter Online findest du Spieler und schickst Anfragen.</p><button class="btn sm" id="pgo"><span>${IC().globe}Zum Reiter Online</span></button>`; el.querySelector('#pgo').onclick = () => V.ui.home('online'); return; }
    el.innerHTML = `<p class="hint">Wen willst du herausfordern? Am besten jemanden, der gerade online ist.</p>` + fr.map(f => `<div class="fline${f.online ? ' on' : ''}"><span class="adot"></span><b>${esc(f.username)}</b><small>${f.busy ? 'spielt gerade' : f.online ? 'online' : ago(f.seen)}</small><button class="btn sm${f.online ? ' primary' : ''}" data-inv="${esc(f.username)}"><span>Einladen</span></button></div>`).join('');
    el.querySelectorAll('[data-inv]').forEach(x => x.onclick = () => invite(x.dataset.inv, g, opts));
  }

  // game panel, mode "Online": open challenge for everybody, plus open challenges of others for this game
  function openPanel(el, g, opts) {
    if (!el) return;
    if (!ready()) { el.innerHTML = `<p class="hint">Für Online-Partien brauchst du ein Konto.</p><button class="btn sm" id="plog"><span>${IC().user}Anmelden</span></button>`; el.querySelector('#plog').onclick = () => V.ui.home('profile'); return; }
    const others = ((pending && pending.open) || []).filter(o => o.game === g.id);
    el.innerHTML = `<p class="hint">Deine Herausforderung erscheint bei allen eingeloggten Spielern. Wer zuerst beitritt, spielt gegen dich.</p>
      ${others.map(o => `<div class="fline on"><span class="adot"></span><b>${esc(o.from)}</b><small>sucht gerade einen Gegner</small><button class="btn sm primary" data-join="${o.id}"><span>Mitspielen</span></button></div>`).join('')}
      <button class="btn primary big" id="seek"><span>${IC().globe}Gegner suchen</span></button>`;
    el.querySelector('#seek').onclick = () => seek(g, opts);
    el.querySelectorAll('[data-join]').forEach(x => x.onclick = () => join(x.dataset.join));
  }
  const seek = (g, opts) => invite(null, g, opts);

  V.online = { tab, wire, picker, openPanel, seek, invite, resume, watch, start, check };
  if (C()) C().on(() => { if (ready()) startPolling(); else stopPolling(); });
})();
