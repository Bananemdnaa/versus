// Versus: friends, invitations, online matches against friends and the rankings.
(function () {
  'use strict';
  const C = () => V.cloud, IC = () => V.ui.IC;
  const ONLINE = ['c4', 'ships', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'reversi', 'mill', 'kalaha', 'go', 'backgammon', 'dots', 'hex', 'ttt3', 'hardcore'];
  ONLINE.forEach(id => { if (V.byId[id]) V.byId[id].online = true; });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gname = id => (V.byId[id] ? V.byId[id].name : id || '');
  function ago(t) {
    if (!t) return 'nie';
    const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
    if (s < 3600) return `vor ${Math.max(1, Math.round(s / 60))} Min.`;
    if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
    const d = Math.round(s / 86400);
    return d === 1 ? 'gestern' : `vor ${d} Tagen`;
  }
  const ready = () => C() && C().available() && C().user();
  const optsFor = g => { const s = (V.store.get('setup', {})[g.id] || {}).opts || {}; const o = {}; (g.options || []).forEach(x => { o[x.id] = s[x.id] !== undefined ? s[x.id] : x.def; }); return o; };

  // ---------- starting a match ----------
  function start(st) {
    if (!fstate) fetchFriends().catch(() => { });   // the result screen offers "add as friend" for strangers
    const g = V.byId[st.game]; if (!g) return V.ui.toast('Unbekanntes Spiel');
    const side = st.role === 'a' ? st.a_side : 3 - st.a_side;
    const opp = st.role === 'a' ? st.b_name : st.a_name;
    hideInvite();
    V.ui.play(g, { mode: 'online', opts: st.opts || {}, match: { id: st.id, side, opp, init: st } });
  }
  // a running match shown in the Online tab is fetched ahead, so "Weiterspielen" opens the board at once
  const pre = new Map();
  function prefetch(id) {
    const c = pre.get(id); if (!id || (c && Date.now() - c.at < 8000)) return;
    const p = C().rpc('match_state', { mid: id, since: 0 }); p.catch(() => { }); pre.set(id, { at: Date.now(), p });
  }
  async function resume(id) {
    try {
      const c = pre.get(id); pre.delete(id);
      const st = c && Date.now() - c.at < 8000 ? await c.p : await C().rpc('match_state', { mid: id, since: 0 });
      if (st.status === 'live') return start(st);
      V.ui.toast('Diese Partie ist schon vorbei.'); V.ui.home('online');
    } catch (e) { V.ui.toast(e.message); V.ui.home('online'); }
  }
  // watch a running match: admins any (and replays), friends the live matches of their friends
  async function watch(id, admin) {
    try {
      const st = await C().rpc('match_state', { mid: id, since: 0 });
      if (!st.a_side) return V.ui.toast('Die Partie hat noch nicht angefangen.');
      if (!admin && st.status !== 'live') { V.ui.toast('Diese Partie ist schon vorbei.'); return refreshTab(); }
      const g = V.byId[st.game];
      V.ui.play(g, { mode: 'watch', opts: st.opts || {}, match: { id: st.id, aSide: st.a_side, aName: st.a_name, bName: st.b_name, init: st, admin: !!admin } });
    } catch (e) { V.ui.toast(e.message); }
  }

  // invite a friend and wait for the answer
  async function invite(name, g, opts, asy) {
    let mid;
    try { mid = await C().rpc('match_invite', asy ? { opp: name, gm: g.id, op: opts || optsFor(g), asy: true } : { opp: name, gm: g.id, op: opts || optsFor(g) }); }
    catch (e) { V.ui.toast(/asy|function/i.test(e.message) && asy ? 'Partien über Tage kommen nach dem nächsten Server-Update.' : e.message); V.sfx.bad(); return; }
    // a match over days does not wait here: the friend accepts whenever, and both get a note when it is their turn
    if (asy) { C().poke('u:' + name); V.sfx.goal(); V.ui.toast('Einladung an ' + name + ' verschickt', 2600); check(); return; }
    let done = false, t = null, ch = null;
    const stop = () => { done = true; clearTimeout(t); if (ch) ch.close(); };
    const m = V.ui.openModal(`<div class="confirm wait"><div class="spin"><i></i><i></i></div>
      <h3>${name ? 'Warte auf ' + esc(name) : 'Suche Gegner'}</h3><p>${esc(g.name)} · ${name ? 'die Einladung läuft, solange dieses Fenster offen ist.' : 'alle eingeloggten Spieler sehen deine Herausforderung. Wer zuerst beitritt, spielt gegen dich.'}</p>
      <div class="actions"><button class="btn ghost" id="wc"><span>Abbrechen</span></button></div></div>`, '', () => {
      if (!done) { stop(); C().rpc('match_cancel', { mid }).catch(() => { }); }
    });
    m.querySelector('#wc').onclick = () => V.ui.closeModal();
    const poll = async () => {
      if (done) return;
      clearTimeout(t);
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
    // the invited player pokes the match channel when the match starts, and the invitation channel of their name gets a poke now
    ch = C().channel('m:' + mid, () => { if (!done) poll(); });
    if (name) C().poke('u:' + name);
  }

  // ---------- incoming invitations (polled while logged in) ----------
  let pendT = null, pending = null, tpending = null, card = null, cardId = null, lastFriendN = -1;
  const toldReq = new Set();
  // invitations and friend requests to me also arrive as a poke on the channel of my name, then we look at once
  let meChan = null, meName = null;
  function listenMe() {
    const u = C().user(), n = u && u.username;
    if (n === meName) return;
    if (meChan) meChan.close();
    meName = n; meChan = n ? C().channel('u:' + n, () => check()) : null;
  }
  function startPolling() { listenMe(); if (pendT) return; pendT = setInterval(check, 5000); check(); }
  function stopPolling() { clearInterval(pendT); pendT = null; hideInvite(); pending = null; listenMe(); }
  async function check() {
    if (!ready()) return stopPolling();
    if (document.querySelector('.view.play.net, .view.play.watch')) return;
    try {
      const p = await C().rpc('my_pending');
      // tables for 2-4 players (older servers without them just have none)
      try { tpending = await C().rpc('party_pending'); } catch (e) { tpending = null; }
      const tp = tpending || {};
      const before = JSON.stringify([pending, tpending]);
      pending = p;
      const openList = (p.open || []).filter(o => !dismissed.has(o.id));
      const tInv = (tp.invites || []).filter(o => !dismissed.has(o.id)), tOpen = (tp.open || []).filter(o => !dismissed.has(o.id));
      // one card at a time: challenge first, then table invitations, a new friend request, then open challenges and tables
      const frName = p.req_from && (cardId === 'fr:' + p.req_from || !toldReq.has(p.req_from)) ? p.req_from : null;
      const busy = p.active || tp.mine;
      if (lobbyId) hideInvite();
      else if (p.invites && p.invites.length) showInvite(p.invites[0]);
      else if (tInv.length && !busy) showInvite(Object.assign({ table: true }, tInv[0]));
      else if (frName) { toldReq.add(frName); showFriendCard(frName); }
      else if (openList.length && !busy && V.settings.openCards !== false) showInvite(Object.assign({ open: true }, openList[0]));
      else if (tOpen.length && !busy && V.settings.openCards !== false) showInvite(Object.assign({ table: true, open: true }, tOpen[0]));
      else hideInvite();
      if (typeof p.friend_n === 'number') { if (lastFriendN >= 0 && p.friend_n > lastFriendN) newFriends(); lastFriendN = p.friend_n; }
      if (JSON.stringify([p, tpending]) !== before && V.ui.view() === 'home') { if (V.ui.tab() === 'online') refreshTab(); else if (V.ui.tab() === 'games' && V.ui.cont) V.ui.cont(); }
      badge();
    } catch (e) { }
  }
  function badge() {
    const n = (pending ? (pending.requests || 0) + (pending.invites || []).length + (pending.async || []).filter(a => a.my_turn).length : 0) + (tpending ? (tpending.invites || []).length : 0);
    document.querySelectorAll('.tabs [data-tab="online"], .side [data-go="online"]').forEach(b => {
      let i = b.querySelector('.nb'); if (!n) { if (i) i.remove(); return; }
      if (!i) { i = document.createElement('i'); i.className = 'nb'; b.appendChild(i); }
      i.textContent = n;
    });
    // laptop app bar: a pink dot on the bell
    const d = document.querySelector('#hbell .pdot'); if (d) d.hidden = !n;
  }
  // "Weiterspielen" on the home screen: the running match, my table and matches over days (yours to move first)
  function resumables() {
    const p = pending || {}, tp = tpending || {}, out = [];
    if (p.active) out.push({ id: p.active.id, game: p.active.game, opp: p.active.opponent, turn: true, live: true });
    if (tp.mine) out.push({ id: tp.mine.id, game: tp.mine.game, table: true, turn: tp.mine.status === 'live', live: true });
    (p.async || []).slice().sort((a, b) => b.my_turn - a.my_turn).forEach(a => out.push({ id: a.id, game: a.game, opp: a.opponent, turn: !!a.my_turn, moves: a.moves, at: a.at }));
    return out.filter(r => V.byId[r.game]);
  }
  function resumeAny(r) { return r.table ? resumeTable(r.id) : resume(r.id); }
  // friends for the laptop sidebar: the last loaded list, refreshed in the background at most once a minute
  let sideAt = 0;
  function sideFriends() {
    if (ready() && !isAnon() && Date.now() - sideAt > 60000) {
      sideAt = Date.now();
      fetchFriends().then(() => V.ui.side && V.ui.side(), () => { });
    }
    if (!friendsData || !friendsData.friends) return [];
    return friendsData.friends.map(f => ({ name: f.username, online: !!(f.online || f.busy), busy: !!f.busy, status: fstatus(f), match: f.watchable && f.match ? f.match : null }));
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
      <div class="ic-tx"><small>${inv.table ? (inv.open ? `Offener Tisch · ${inv.players}/${inv.n}` : 'Einladung an den Tisch') : inv.open ? 'Sucht einen Gegner' : inv.async ? 'Partie über Tage' : 'Herausforderung'}</small><b>${esc(inv.from)}</b><span>${esc(gname(inv.game))}${inv.table && !inv.open ? ` · ${inv.players}/${inv.n} Plätze` : ''}</span></div>
      <div class="ic-act"><button class="btn primary sm" data-a="ok"><span>${inv.table ? 'Hinsetzen' : inv.open ? 'Mitspielen' : 'Annehmen'}</span></button><button class="btn ghost sm" data-a="no"><span>${inv.open ? 'Nein danke' : 'Ablehnen'}</span></button></div>`);
    if (inv.open) card.classList.add('open');
    document.body.appendChild(card);
    V.sfx.go(); V.buzz([40, 60, 40]);
    if (inv.table) {
      card.querySelector('[data-a=ok]').onclick = () => { hideInvite(); joinTable(inv.id); };
      card.querySelector('[data-a=no]').onclick = () => { dismissed.add(inv.id); if (!inv.open) C().rpc('party_decline', { tid: inv.id }).catch(() => { }); hideInvite(); };
      return;
    }
    card.querySelector('[data-a=ok]').onclick = async () => {
      if (inv.open) return join(inv.id);
      try { const st = await C().rpc('match_respond', { mid: inv.id, ok: true }); hideInvite(); start(st); }
      catch (e) { V.ui.toast(e.message); hideInvite(); }
    };
    card.querySelector('[data-a=no]').onclick = () => { if (inv.open) { dismissed.add(inv.id); return hideInvite(); } C().rpc('match_respond', { mid: inv.id, ok: false }).catch(() => { }); hideInvite(); };
  }
  function hideInvite() { if (card) { card.classList.add('out'); const c = card; setTimeout(() => c.remove(), 250); } card = null; cardId = null; }

  // ---------- Online tab ----------
  let friendsData = null, board = null, boardGame = '', boardPeriod = 'week';
  // who is a friend: name -> 'friend' | 'outgoing' | 'incoming' (null until loaded once)
  let fstate = null;
  const initials = n => esc(String(n).slice(0, 2).toUpperCase());
  function tab() {
    // no server: a real empty page with a retry
    if (!C() || !C().available()) return `<section class="page"><div class="empty ooff">${IC().wifioff}<b>Online ist gerade nicht erreichbar</b><p>KI und Spiele am Gerät gehen weiter. Versuch es gleich nochmal.</p>
      <div class="arow"><button class="btn primary sm" id="oretry"><span>${IC().redo}Erneut versuchen</span></button><button class="btn sm" data-tab="games"><span>Zu den Spielen</span></button></div></div></section>`;
    const full = C().user() && !isAnon();
    const loginCard = !full ? `<div class="acard oacc"><b>Mit Konto: Freunde, Herausforderungen, Rangliste</b><p class="lead">${C().user() ? 'Du spielst als Gast. ' : ''}Mit einem kostenlosen Konto kannst du Freunde hinzufügen, sie herausfordern und in die Rangliste kommen.</p>
      <button class="btn primary" data-tab="profile"><span>${IC().user}${C().user() ? 'Konto behalten' : 'Anmelden oder Konto erstellen'}</span></button></div>` : '';
    const st = C().starting() ? ['wait', 'Verbinde …'] : navigator.onLine === false ? ['off', 'Offline'] : ['on', 'Verbunden'];
    return `<section class="online">
      <div class="ohead"><h1 class="title"><span>Live spielen</span> Online</h1><em class="ostat ${st[0]}"><i></i>${st[1]}</em>
        ${full ? `<form class="ocode" id="ocode"><input class="inp" id="ocodei" maxlength="8" placeholder="Raum-Code eingeben" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Raum-Code eingeben"><button class="btn sm" type="submit"><span>Beitreten</span></button></form>` : ''}</div>
      ${C().user() ? '<div id="oactive" class="obanners"></div>' : ''}
      <div class="ogrid${full ? '' : ' solo'}">
        <div class="ocol">${quickCard()}${full ? '<div id="oasync"></div>' : ''}<div class="apanel osec orank"><div class="rtop"><h3>Rangliste <em class="chip c rleft" id="rleft" hidden></em></h3><div class="oseg rper" id="oper">${[['week', 'Diese Woche'], ['all', 'Für immer']].map(([k, l]) => `<button data-p="${k}" class="${boardPeriod === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <label class="rsel">${IC().trophy}<select class="inp" id="obgs" aria-label="Spiel für die Rangliste">${[['', 'Alle Spiele'], ...ONLINE.concat(TABLE).filter(id => V.byId[id]).map(id => [id, gname(id)])].map(([id, l]) => `<option value="${id}"${boardGame === id ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
          <div id="oboard">${V.skel()}</div></div></div>
        <div class="ocol">${full ? `<div class="apanel osec fpanel"><div class="fhead"><h3>Freunde <small id="fcount"></small></h3><button class="btn primary sm" id="fadd"><span>${IC().plus}Hinzufügen</span></button></div>
            <div id="ofriends">${V.skel()}</div></div>` : loginCard}</div>
      </div></section>`;
  }
  const onlineBody = () => { const b = document.querySelector('.hbody'); return b && V.ui.view() === 'home' && V.ui.tab() === 'online' ? b : null; };
  function refreshTab() { const b = onlineBody(); if (b) { loadFriends(b); fillActive(b); } }
  function wire(b) {
    const rt = b.querySelector('#oretry'); if (rt) rt.onclick = () => { V.sfx.ui(); location.reload(); };
    if (!C() || !C().available()) return;
    const sel = b.querySelector('#obgs'); if (sel) sel.onchange = () => { boardGame = sel.value; V.sfx.ui(); loadBoard(b); };
    // a table code (from a friend): straight to that table
    const cf = b.querySelector('#ocode');
    if (cf) cf.onsubmit = e => { e.preventDefault(); const c = b.querySelector('#ocodei').value.trim().toUpperCase(); if (!c) return; V.sfx.ui(); joinTable(null, c); };
    b.querySelectorAll('#oper button').forEach(x => x.onclick = () => {
      if (boardPeriod === x.dataset.p) return;
      boardPeriod = x.dataset.p; V.sfx.ui();
      b.querySelectorAll('#oper button').forEach(y => y.classList.toggle('on', y === x));
      loadBoard(b);
    });
    loadBoard(b);
    wireQuick(b);
    if (!C().user()) return;
    if (isAnon()) return fillActive(b);
    b.querySelector('#fadd').onclick = () => { V.sfx.ui(); addFriends(); };
    if (friendsData) fillFriends(b);
    loadFriends(b); fillActive(b);
  }
  function remember(d) {
    if (!d || d.error) return;
    fstate = new Map();
    (d.friends || []).forEach(f => fstate.set(f.username, 'friend'));
    (d.outgoing || []).forEach(n => fstate.set(n, 'outgoing'));
    (d.incoming || []).forEach(n => fstate.set(n, 'incoming'));
  }
  async function fetchFriends(again) {
    let d;
    // while the login is being renewed one request can go out without it: try once more a moment later
    try { d = await C().rpc('friends'); }
    catch (e) { if (again || !/permission denied|jwt/i.test(e.message)) throw e; await new Promise(r => setTimeout(r, 1500)); if (!ready()) throw e; return fetchFriends(true); }
    friendsData = d; remember(d);
    return d;
  }
  async function loadFriends(b) {
    try { await fetchFriends(); } catch (e) { friendsData = { error: e.message }; }
    if (b && b.isConnected) fillFriends(b);
  }
  // after any change: friends list in the Online tab and the badge
  function changed() { const b = onlineBody(); if (b) loadFriends(b); else fetchFriends().catch(() => { }); check(); }
  function fillActive(b) {
    const el = b.querySelector('#oactive'); if (!el) return;
    const p = pending || {};
    el.innerHTML = (p.active ? `<div class="obanner"><div><small>Laufende Partie</small><b>${esc(gname(p.active.game))} gegen ${esc(p.active.opponent)}</b></div><button class="btn primary sm" id="ores_go"><span>${IC().play}Weiterspielen</span></button></div>` : '') +
      (p.invites || []).map(i => `<div class="obanner inv"><div><small>${i.async ? 'Partie über Tage' : 'Herausforderung'}</small><b>${esc(i.from)} · ${esc(gname(i.game))}</b></div>
        <div class="arow"><button class="btn primary sm" data-acc="${i.id}"><span>Annehmen</span></button><button class="btn ghost sm" data-dec="${i.id}"><span>Ablehnen</span></button></div></div>`).join('');
    el.innerHTML += (p.open || []).map(o => `<div class="obanner open"><div><small>Sucht einen Gegner</small><b>${esc(o.from)} · ${esc(gname(o.game))}</b></div><button class="btn primary sm" data-join="${o.id}"><span>Mitspielen</span></button></div>`).join('');
    const tp = tpending || {};
    el.innerHTML += (tp.mine ? `<div class="obanner"><div><small>${tp.mine.status === 'live' ? 'Dein Tisch läuft' : 'Dein Tisch wartet'}</small><b>${esc(gname(tp.mine.game))}</b></div><button class="btn primary sm" data-tres="${tp.mine.id}"><span>${IC().play}Zurück an den Tisch</span></button></div>` : '') +
      (tp.invites || []).map(i => `<div class="obanner inv"><div><small>Einladung an den Tisch · ${i.players}/${i.n}</small><b>${esc(i.from)} · ${esc(gname(i.game))}</b></div>
        <div class="arow"><button class="btn primary sm" data-tjoin="${i.id}"><span>Hinsetzen</span></button><button class="btn ghost sm" data-tdec="${i.id}"><span>Ablehnen</span></button></div></div>`).join('') +
      (tp.open || []).map(o => `<div class="obanner open"><div><small>Offener Tisch · ${o.players}/${o.n}</small><b>${esc(o.from)} · ${esc(gname(o.game))}</b></div><button class="btn primary sm" data-tjoin="${o.id}"><span>Mitspielen</span></button></div>`).join('');
    el.querySelectorAll('[data-tres]').forEach(x => x.onclick = () => resumeTable(x.dataset.tres));
    el.querySelectorAll('[data-tjoin]').forEach(x => x.onclick = () => joinTable(x.dataset.tjoin));
    el.querySelectorAll('[data-tdec]').forEach(x => x.onclick = () => { C().rpc('party_decline', { tid: x.dataset.tdec }).then(check, check); });
    el.querySelectorAll('[data-join]').forEach(x => x.onclick = () => { x.classList.add('busy'); join(x.dataset.join); });
    if (p.active) prefetch(p.active.id);
    const go = el.querySelector('#ores_go'); if (go) go.onclick = () => { go.classList.add('busy'); resume(p.active.id); };
    // matches over days: whose turn it is, open with one tap
    const ae = b.querySelector('#oasync'), as = p.async || [];
    if (ae) {
      ae.innerHTML = as.length ? `<div class="apanel osec"><div class="fhead"><h3>Über Tage <small>${as.filter(a => a.my_turn).length ? as.filter(a => a.my_turn).length + ' dran' : ''}</small></h3></div><div class="alist">${as.map(a => `<div class="mrow${a.my_turn ? ' live' : ''}"><span class="m-g">${V.byId[a.game] ? V.byId[a.game].icon : ''}</span>
        <div class="m-t"><b>${esc(gname(a.game))} <i>gegen ${esc(a.opponent)}</i></b><small>${a.my_turn ? '<span class="good">Du bist dran</span>' : 'Wartet auf ' + esc(a.opponent)} · ${a.moves} Züge · ${ago(a.at)}</small></div>
        <button class="btn sm${a.my_turn ? ' primary' : ''}" data-ares="${a.id}"><span>${a.my_turn ? 'Ziehen' : 'Ansehen'}</span></button></div>`).join('')}</div></div>` : '';
      ae.querySelectorAll('[data-ares]').forEach(x => x.onclick = () => { x.classList.add('busy'); resume(x.dataset.ares); });
      as.filter(a => a.my_turn).slice(0, 2).forEach(a => prefetch(a.id));
    }
    el.querySelectorAll('[data-acc]').forEach(x => x.onclick = async () => { x.classList.add('busy'); try { start(await C().rpc('match_respond', { mid: x.dataset.acc, ok: true })); } catch (e) { V.ui.toast(e.message); check(); } });
    el.querySelectorAll('[data-dec]').forEach(x => x.onclick = () => { C().rpc('match_respond', { mid: x.dataset.dec, ok: false }).then(check, check); });
  }
  const fstatus = f => f.busy && f.match_opp ? `spielt ${esc(gname(f.match_game))} gegen ${esc(f.match_opp)}` : f.busy ? 'spielt gerade online' :f.online ? 'online' + (f.game && V.byId[f.game] ? ' · ' + esc(gname(f.game)) : '') : f.seen ? 'zuletzt ' + ago(f.seen) : 'offline';
  function fillFriends(b) {
    const el = b.querySelector('#ofriends'); if (!el || !friendsData) return;
    if (friendsData.error) { el.innerHTML = `<p class="aerr">${esc(friendsData.error)}</p>`; return; }
    const d = friendsData, fr = d.friends || [];
    const cnt = b.querySelector('#fcount'); if (cnt) cnt.textContent = fr.length ? `${fr.length} · ${fr.filter(f => f.online).length} online` : '';
    const inc = (d.incoming || []).map(n => `<div class="frow req" data-prof="${esc(n)}"><span class="fav">${initials(n)}</span>
      <div class="ft"><b>${esc(n)}</b><small>möchte dein Freund sein</small></div>
      <button class="btn primary sm" data-yes="${esc(n)}"><span>Annehmen</span></button><button class="iconbtn sm" data-no="${esc(n)}" aria-label="Anfrage von ${esc(n)} ablehnen" title="Ablehnen">${IC().x}</button></div>`).join('');
    const rows = fr.map(f => `<div class="frow${f.online ? ' on' : ''}" data-prof="${esc(f.username)}"><span class="fav">${initials(f.username)}<i></i></span>
      <div class="ft"><b>${esc(f.username)}</b><small>${fstatus(f)}</small></div>
      ${f.watchable && f.match ? `<button class="btn sm primary" data-watchf="${esc(f.match)}"><span>${IC().eye}Zuschauen</span></button>`
        : `<button class="btn sm${f.online && !f.busy ? ' primary' : ''}" data-play="${esc(f.username)}"><span>${IC().play}Spielen</span></button>`}</div>`).join('');
    const out = (d.outgoing || []).length ? `<div class="fout"><small>Angefragt</small>${d.outgoing.map(n => `<span class="fchip">${esc(n)}<button data-rm="${esc(n)}" aria-label="Anfrage an ${esc(n)} zurückziehen" title="Zurückziehen">${IC().x}</button></span>`).join('')}</div>` : '';
    const empty = `<div class="fempty">${IC().users}<b>Noch keine Freunde</b><p>Zeig deinen QR-Code, schick deinen Link oder such nach einem Namen. Danach könnt ihr euch mit einem Tipp herausfordern.</p>
      <div class="arow"><button class="btn primary sm" data-addt="code"><span>${IC().qr}Mein Code</span></button><button class="btn sm" data-addt="search"><span>Name suchen</span></button></div></div>`;
    // friends online right now as a row of big avatar cards above the full list
    const onl = fr.filter(f => f.online || f.busy);
    const orow = onl.length ? `<div class="fon">${onl.map((f, k) => `<button class="fcard on" data-prof="${esc(f.username)}" style="--fc:${['var(--pink)', 'var(--yellow)', 'var(--cyan)', 'var(--good)'][k % 4]}"><span class="fav">${initials(f.username).slice(0, 1)}<i></i></span><b>${esc(f.username)}</b><small>${f.busy && f.match_game ? 'spielt ' + esc(gname(f.match_game)) : f.game && V.byId[f.game] ? 'spielt ' + esc(gname(f.game)) : 'online'}</small></button>`).join('')}</div>` : '';
    el.innerHTML = orow + (inc ? `<div class="freqs"><h4>Anfragen</h4>${inc}</div>` : '') + (rows ? `<div class="flist">${rows}</div>` : empty) + out;
    el.querySelectorAll('[data-yes]').forEach(x => x.onclick = e => { e.stopPropagation(); respond(x.dataset.yes, true); });
    el.querySelectorAll('[data-no]').forEach(x => x.onclick = e => { e.stopPropagation(); respond(x.dataset.no, false); });
    el.querySelectorAll('[data-play]').forEach(x => x.onclick = e => { e.stopPropagation(); V.sfx.ui(); challenge(x.dataset.play); });
    el.querySelectorAll('[data-watchf]').forEach(x => x.onclick = e => { e.stopPropagation(); V.sfx.ui(); watch(x.dataset.watchf); });
    el.querySelectorAll('[data-rm]').forEach(x => x.onclick = e => { e.stopPropagation(); C().rpc('friend_remove', { name: x.dataset.rm }).then(() => { V.ui.toast('Anfrage zurückgezogen'); changed(); }, er => V.ui.toast(er.message)); });
    el.querySelectorAll('[data-addt]').forEach(x => x.onclick = () => { V.sfx.ui(); addFriends(x.dataset.addt); });
  }
  function respond(name, ok) {
    return C().rpc('friend_respond', { name, ok }).then(() => {
      if (ok) { V.ui.toast('Du und ' + name + ' seid jetzt Freunde'); V.sfx.goal(); }
      changed();
    }, e => V.ui.toast(e.message));
  }
  async function request(name) {
    const r = await C().rpc('friend_request', { name });
    C().poke('u:' + name);
    V.ui.toast({ sent: 'Anfrage an ' + name + ' gesendet', accepted: 'Du und ' + name + ' seid jetzt Freunde', friends: 'Ihr seid schon Freunde', pending: 'Schon angefragt' }[r] || r);
    if (r === 'accepted') V.sfx.goal(); else V.sfx.ui();
    changed();
    return r;
  }

  // ---------- adding friends: search by name, own code (QR and link), enter a code ----------
  let myCode = null, renewSure = false;
  const addLink = c => location.origin + location.pathname + '?add=' + c;
  const fmtCode = c => c.slice(0, 3) + ' ' + c.slice(3);
  // Adding friends on one page: one field for a name or a friend code (names show while typing, a code can be redeemed
  // right there), requests to you, the people you played lately, and your own code with QR and link at the bottom.
  // t === 'code' scrolls to your own code.
  function addFriends(t) {
    renewSure = false;
    const m = V.ui.openModal(`<div class="fadd fadd2">
      <div class="fadd-h"><h3>Freunde finden</h3><button class="iconbtn" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <label class="fq2">${IC().search}<input id="fq" placeholder="Name oder Freundescode" autocapitalize="none" autocomplete="off" spellcheck="false" maxlength="16" aria-label="Name oder Freundescode"></label>
      <div id="fres" class="fres"></div>
      <div id="freq"></div>
      <section class="fsec"><h4>Zuletzt gegen dich gespielt</h4><div id="frecent">${V.skel(2)}</div></section>
      <section class="fsec" id="fmine"><h4>Dein Code</h4><div id="fcodebox"></div></section></div>`, 'faddm');
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    const q = m.querySelector('#fq'), res = m.querySelector('#fres');
    const row = (name, st) => `<div class="frow" data-prof="${esc(name)}"><span class="fav">${initials(name)}</span><div class="ft"><b>${esc(name)}</b></div>${stateBtn(name, st)}</div>`;
    const wireRows = el => {
      el.querySelectorAll('[data-prof]').forEach(x => x.onclick = () => { V.sfx.ui(); profile(x.dataset.prof); });
      el.querySelectorAll('[data-req]').forEach(x => x.onclick = async e => {
        e.stopPropagation();
        try { const r = await request(x.dataset.req); x.outerHTML = r === 'accepted' || r === 'friends' ? '<em class="rtag good">Freund</em>' : '<em class="rtag">angefragt</em>'; }
        catch (er) { V.ui.toast(er.message); }
      });
    };
    // a friend code: three letters and three digits/letters, e.g. "ABC 123" (names are never 6 characters with a space)
    const asCode = s => { const c = s.toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 6 && /[0-9]/.test(c) && s.replace(/\s/g, '').length === 6 ? c : ''; };
    let tm = null, seq = 0;
    const run = async () => {
      const s = q.value.trim(), my = ++seq, code = asCode(s);
      const codeRow = code ? `<div class="fcodehit"><span>Freundescode <b>${fmtCode(code)}</b></span><button class="btn primary sm" id="fredeem"><span>Code einlösen</span></button></div><p class="aerr" id="fce"></p>` : '';
      if (s.length < 2) { res.innerHTML = ''; return; }
      let list = [];
      try { list = await C().rpc('player_search', { q: s.toLowerCase() }); } catch (e) { if (!code) { res.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; } }
      if (my !== seq) return;
      res.innerHTML = codeRow + (list.length ? list.map(r => row(r.username, r.state)).join('') : code ? '' : `<p class="fhint">Niemand mit „${esc(s)}“ gefunden. Frag nach dem genauen Namen oder lass dir den Code geben.</p>`);
      wireRows(res);
      const rd = res.querySelector('#fredeem');
      if (rd) rd.onclick = async () => {
        rd.classList.add('busy');
        try { const r = await C().rpc('friend_add_code', { code }); V.ui.closeModal(); welcomeFriend(r); }
        catch (x) { res.querySelector('#fce').textContent = /friend_add_code|function/i.test(x.message) ? 'Freundescodes kommen nach dem nächsten Server-Update.' : x.message; V.sfx.bad(); rd.classList.remove('busy'); }
      };
    };
    q.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 250); };
    q.onkeydown = e => { if (e.key === 'Enter') { clearTimeout(tm); run(); } };
    // requests to you, from the last loaded friends list
    const inc = friendsData && friendsData.incoming || [];
    if (inc.length) {
      const fr = m.querySelector('#freq');
      fr.innerHTML = `<section class="fsec"><h4>Anfragen an dich</h4>${inc.map(n => `<div class="frow req" data-prof="${esc(n)}"><span class="fav">${initials(n)}</span><div class="ft"><b>${esc(n)}</b><small>möchte dein Freund sein</small></div>
        <button class="btn primary sm" data-yes="${esc(n)}"><span>Annehmen</span></button><button class="iconbtn sm" data-no="${esc(n)}" aria-label="Ablehnen">${IC().x}</button></div>`).join('')}</section>`;
      fr.querySelectorAll('[data-yes]').forEach(x => x.onclick = e => { e.stopPropagation(); respond(x.dataset.yes, true); x.closest('.frow').remove(); });
      fr.querySelectorAll('[data-no]').forEach(x => x.onclick = e => { e.stopPropagation(); respond(x.dataset.no, false); x.closest('.frow').remove(); });
    }
    // people you played lately (online), who are not friends yet
    C().rpc('player_profile', { name: C().user().username }).then(p => {
      const el = m.querySelector('#frecent'); if (!el) return;
      const seen = new Set(), list = (p.recent || []).map(r => r.opp).filter(n => n && !seen.has(n) && seen.add(n) && !(fstate && fstate[n] === 'friend')).slice(0, 5);
      el.innerHTML = list.length ? list.map(n => row(n)).join('') : '<p class="fhint">Spielt ihr online gegeneinander, steht der Gegner hier und du kannst ihn mit einem Tipp hinzufügen.</p>';
      wireRows(el);
    }, () => { const el = m.querySelector('#frecent'); if (el) el.innerHTML = '<p class="fhint">Gerade nicht erreichbar.</p>'; });
    drawCode(m.querySelector('#fcodebox'));
    if (t === 'code') setTimeout(() => m.querySelector('#fmine').scrollIntoView({ block: 'start' }), 120);
    else if (!V.coarse) setTimeout(() => q.focus(), 60);
  }
  // the button next to a name: friend, asked, accept or add
  function stateBtn(name, known) {
    const st = known !== undefined ? known : fstate && fstate[name];
    return st === 'friend' ? '<em class="rtag good">Freund</em>' : st === 'outgoing' ? '<em class="rtag">angefragt</em>'
      : `<button class="btn sm primary" data-req="${esc(name)}"><span>${st === 'incoming' ? 'Annehmen' : IC().plus + 'Hinzufügen'}</span></button>`;
  }
  async function drawCode(body) {
    body.innerHTML = `<div class="fcode">${V.skel(2)}</div>`;
    let code;
    try { code = myCode || (myCode = await C().rpc('my_friend_code', { renew: false })); }
    catch (e) { body.innerHTML = `<p class="aerr">${esc(/my_friend_code|function/i.test(e.message) ? 'Freundescodes kommen nach dem nächsten Server-Update.' : e.message)}</p>`; return; }
    if (!body.isConnected) return;
    const link = addLink(code);
    body.innerHTML = `<div class="fcode">
      <div class="fqr" id="fqr"><span class="fqr-load">${V.skel(1)}</span></div>
      <div class="fcode-t"><small>Dein Freundescode</small><b>${fmtCode(code)}</b>
        <p>Lass deinen Freund den QR-Code mit der Handykamera scannen oder den Code eingeben. Dann seid ihr sofort befreundet.</p>
        <p class="fhint">Wer über deinen Link neu ein Konto erstellt, zählt für dein Werber-Abzeichen im Profil.</p>
        <div class="arow"><button class="btn primary sm" id="fshare"><span>${IC().share}Link teilen</span></button><button class="btn sm" id="fcopy"><span>Link kopieren</span></button></div>
        <button class="link fnew" id="fnew">Neuen Code erstellen</button></div></div>`;
    loadQR().then(() => { const q = body.querySelector('#fqr'); if (q) q.innerHTML = qrSvg(link); }, () => { const q = body.querySelector('#fqr'); if (q) q.innerHTML = '<p class="fhint">QR-Code geht gerade nicht. Teil den Link oder den Code.</p>'; });
    body.querySelector('#fshare').onclick = () => {
      V.sfx.ui();
      const text = V.t('Spiel mit mir Versus! Mit diesem Link sind wir sofort Freunde (Code ' + fmtCode(code) + '):');
      if (navigator.share) navigator.share({ title: 'Versus', text, url: link }).catch(() => { });
      else copy(link);
    };
    body.querySelector('#fcopy').onclick = () => { V.sfx.ui(); copy(link); };
    const nb = body.querySelector('#fnew');
    nb.onclick = async () => {
      if (!renewSure) { renewSure = true; nb.textContent = 'Alte Links und QR-Codes gelten dann nicht mehr. Nochmal tippen'; return; }
      renewSure = false;
      try { myCode = await C().rpc('my_friend_code', { renew: true }); V.ui.toast('Neuer Code: ' + fmtCode(myCode)); drawCode(body); }
      catch (e) { V.ui.toast(e.message); }
    };
  }
  // new friend via code or link: a small celebration with the obvious next step
  function welcomeFriend(r) {
    changed();
    if (r.status === 'friends') return V.ui.toast('Du und ' + r.username + ' seid schon Freunde');
    V.sfx.win(); V.fx.confetti();
    const m = V.ui.openModal(`<div class="confirm fnewf"><span class="abig">${initials(r.username)}</span>
      <h3>Ihr seid jetzt Freunde</h3><p>Du und <b>${esc(r.username)}</b> könnt euch jetzt direkt herausfordern.</p>
      <div class="actions"><button class="btn primary" id="fgo"><span>${IC().play}Gleich herausfordern</span></button><button class="btn ghost" id="fok"><span>Später</span></button></div></div>`);
    m.querySelector('#fok').onclick = V.ui.closeModal;
    m.querySelector('#fgo').onclick = () => challenge(r.username);
  }
  function copy(t) {
    const done = () => V.ui.toast('Link kopiert');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => V.ui.toast(t));
    else V.ui.toast(t);
  }
  // QR code: small library, loaded only when needed (and then cached for offline)
  let qrLib = null;
  function loadQR() {
    if (window.qrcode) return Promise.resolve();
    return qrLib || (qrLib = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/qrcode.js';   // qrcode-generator 1.4.4, stored in the project
      s.onload = () => res(); s.onerror = () => { qrLib = null; s.remove(); rej(new Error('qr')); };
      document.head.appendChild(s);
    }));
  }
  function qrSvg(text) {
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-3 -3 ${n + 6} ${n + 6}" shape-rendering="crispEdges" role="img" aria-label="QR-Code mit deinem Freundes-Link"><rect x="-3" y="-3" width="${n + 6}" height="${n + 6}" fill="#fff"/><path d="${d}" fill="#08090f"/></svg>`;
  }

  // challenge a friend: pick the game
  function challenge(name) {
    const m = V.ui.openModal(`<div class="fadd">
      <div class="fadd-h"><h3>${esc(name)} herausfordern</h3><button class="iconbtn" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint">Welches Spiel? ${esc(name)} bekommt eine Einladung.</p>
      <div class="pchoose">${ONLINE.filter(id => V.byId[id]).map(id => `<button data-g="${id}"><span class="ic">${V.byId[id].icon}</span><small>${esc(gname(id))}</small></button>`).join('')}</div></div>`, 'faddm');
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { const g = V.byId[x.dataset.g]; V.ui.closeModal(); invite(name, g, optsFor(g)); });
  }

  // friend link (?add=CODE): after logging in you are friends right away
  let askedLogin = false;
  // wait while a dialog is open or the first-start slides are still to come
  const busyScreen = () => !!document.querySelector('.modal-back') || (V.welcomeDue && V.welcomeDue());
  function pendingCode() { try { return sessionStorage.getItem('versus.add'); } catch (e) { return null; } }
  async function consumeAdd() {
    const code = pendingCode(); if (!code) return;
    if (!ready() || isAnon()) return askLogin();
    if (busyScreen()) return setTimeout(consumeAdd, 1200);
    try { sessionStorage.removeItem('versus.add'); } catch (e) { }
    try { welcomeFriend(await C().rpc('friend_add_code', { code })); }
    catch (e) { V.ui.toast(/eigener/.test(e.message) ? 'Das ist dein eigener Freundes-Link' : e.message); }
  }
  function askLogin() {
    if (askedLogin || !pendingCode() || !C() || !C().available() || (C().user() && !isAnon())) return;
    if (busyScreen()) return setTimeout(askLogin, 1200);
    askedLogin = true;
    const m = V.ui.openModal(`<div class="confirm"><h3>Du wurdest eingeladen</h3><p>Erstell ein kostenloses Konto oder melde dich an. Danach seid ihr automatisch befreundet und könnt gleich gegeneinander spielen.</p>
      <div class="actions"><button class="btn primary" id="fl"><span>${IC().user}Zum Konto</span></button><button class="btn ghost" id="fn"><span>Später</span></button></div></div>`);
    m.querySelector('#fl').onclick = () => { V.ui.closeModal(); V.ui.home('profile'); };
    m.querySelector('#fn').onclick = V.ui.closeModal;
  }

  // a new friend request while using the app: a card like for challenges
  function showFriendCard(name) {
    if (cardId === 'fr:' + name) return;
    hideInvite(); cardId = 'fr:' + name;
    card = V.el('div', 'icard fcard', `<div class="ic-ico"><span class="fav">${initials(name)}</span></div>
      <div class="ic-tx"><small>Freundschaftsanfrage</small><b>${esc(name)}</b><span>möchte dein Freund sein</span></div>
      <div class="ic-act"><button class="btn primary sm" data-a="ok"><span>Annehmen</span></button><button class="btn ghost sm" data-a="no"><span>Später</span></button></div>`);
    document.body.appendChild(card);
    V.sfx.goal(); V.buzz([30, 50, 30]);
    card.querySelector('[data-a=ok]').onclick = () => { hideInvite(); respond(name, true); };
    card.querySelector('[data-a=no]').onclick = () => hideInvite();
  }
  // someone used my code: tell me who
  async function newFriends() {
    const before = fstate;
    try { await fetchFriends(); } catch (e) { return; }
    if (!before) return;
    (friendsData.friends || []).forEach(f => { if (before.get(f.username) !== 'friend') { V.ui.toast(f.username + ' ist jetzt dein Freund'); V.sfx.goal(); } });
    const b = onlineBody(); if (b) fillFriends(b);
  }
  const friendOf = name => (fstate ? fstate.get(name) || false : null);

  // "2 Tage 5 Std" until the weekly ranking starts over
  function untilText(iso) {
    const ms = new Date(iso) - Date.now(); if (!(ms > 0)) return '';
    const h = Math.floor(ms / 3600000), d = Math.floor(h / 24);
    return d ? `${d} ${d === 1 ? 'Tag' : 'Tage'} ${h % 24} Std` : h ? `${h} Std` : `${Math.max(1, Math.round(ms / 60000))} Min`;
  }
  async function loadBoard(b) {
    const el = b.querySelector('#oboard'); if (!el) return;
    el.classList.add('loading');
    try { board = await C().rpc('leaderboard', { gm: boardGame || null, lim: 50, period: boardPeriod }); }
    catch (e) {
      // server without the weekly ranking yet: fall back to the all-time list
      try { board = await C().rpc('leaderboard', { gm: boardGame || null, lim: 50 }); board.period = 'all'; board.legacy = true; }
      catch (e2) { el.classList.remove('loading'); el.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
    }
    el.classList.remove('loading');
    const top = board.top || [], me = board.me, myName = C().user() && C().user().username;
    const scope = boardGame ? gname(boardGame) : 'allen Spielen';
    const week = board.period === 'week';
    const left = week && board.until ? untilText(board.until) : '';
    const lastW = week && (board.last || []).length ? `<div class="rlast">${IC().trophy}<span><small>Sieger letzte Woche</small>${board.last.map(r => `<b class="l${r.pos}">${r.pos}. ${esc(r.username)}</b>`).join('')}</span></div>` : '';
    // the countdown sits as a chip next to the title
    const chip = b.querySelector('#rleft'); if (chip) { chip.hidden = !left; chip.textContent = left ? 'noch ' + left : ''; }
    const head = (week ? `<p class="rweek"><b>Wochenwertung</b> · startet jeden Montag neu</p>` : board.legacy ? '<p class="rweek">Wochenwertung kommt nach dem nächsten Server-Update.</p>' : '<p class="rweek"><b>Ewige Wertung</b> · alle Partien seit Beginn</p>') + lastW;
    const pct = r => (r.played ? Math.round(r.wins / r.played * 100) : 0);
    const mine = !C().user() ? '' : me
      ? `<div class="rmine"><span class="rp">#${me.pos}</span><div><small>Dein Platz in ${esc(scope)}${week ? ' diese Woche' : ''}</small><b>${me.wins} ${me.wins === 1 ? 'Sieg' : 'Siege'}</b><span>${me.played} Partien · ${me.losses || 0} verloren · ${me.draws || 0} remis · ${pct(me)} %</span></div></div>`
      : `<div class="rmine none"><div><small>Dein Platz in ${esc(scope)}</small><b>${week ? 'Diese Woche noch keine Partie' : 'Noch keine Partie'}</b><span>Spiel online gegen einen Freund oder über „Online“ im Spiel-Panel, dann stehst du hier.</span></div></div>`;
    if (!top.length) { el.innerHTML = head + mine + `<div class="empty small">${IC().trophy}<b>Noch leer</b><p>${week ? 'Diese Woche hat noch niemand' : 'Hier hat noch niemand'} eine Online-Partie in ${esc(scope)} gewonnen.${week ? ' Deine Chance auf Platz 1!' : ''}</p></div>`; return; }
    const pod = top.slice(0, 3);
    const order = [pod[1], pod[0], pod[2]].filter(Boolean);
    const podium = `<div class="podium">${order.map(r => `<div class="pod p${Math.min(r.pos, 3)}${r.username === myName ? ' me' : ''}">
        <span class="pav" data-prof="${esc(r.username)}">${initials(r.username).slice(0, 1)}</span><b class="plink" data-prof="${esc(r.username)}">${esc(r.username)}</b><small>${r.wins === 1 ? '1 Sieg' : r.wins + ' Siege'} · ${pct(r)} %</small><i class="step"><span class="medal">${r.pos}</span></i></div>`).join('')}</div>`;
    const row = (r, cls = '') => `<div class="rrow ${cls}"><span class="pos">${r.pos}</span>
        <span class="who"><b class="plink" data-prof="${esc(r.username)}">${esc(r.username)}</b>${r.username === myName ? '<em class="rtag">Du</em>' : ''}<small>${r.played} Partien</small></span>
        <span class="rate"><i style="--w:${pct(r)}%"></i><small>${pct(r)} %</small></span><span class="w">${r.wins}</span></div>`;
    const rest = top.slice(3);
    el.innerHTML = head + mine + podium +
      (rest.length ? `<div class="rhead"><span>#</span><span>Spieler</span><span>Siegquote</span><span>Siege</span></div>${rest.map(r => row(r, r.username === myName ? 'me' : '')).join('')}` : '') +
      (me && me.pos > top[top.length - 1].pos ? '<div class="rgap">…</div>' + row(me, 'me') : '') +
      `<p class="fine">${board.players || top.length} Spieler in ${esc(scope)}. Gezählt werden gewonnene Online-Partien gegen andere Spieler, gleiche Siege sortiert nach weniger Partien.</p>`;
  }

  // ---------- game panel: pick a friend to invite ----------
  // games where a match can go over days (the turn always alternates, so the server knows who is to move)
  const ASYNC = ['c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon', 'hex', 'ttt3', 'hardcore'];
  let pickAsync = V.store.get('async', false);
  // The online parts of the game panel (js/app.js renderPanel). The main action of each mode (link, search, open a table)
  // is the big button at the bottom of the panel; these lists stay short so nothing has to scroll.
  const AVC = ['var(--pink)', 'var(--yellow)', 'var(--cyan)', 'var(--good)', 'var(--warn)'];
  const pAv = name => `<span class="pav" style="--c:${AVC[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVC.length]}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
  const pLine = (name, status, cls, btn) => `<div class="pline${cls ? ' ' + cls : ''}">${pAv(name)}<span class="pl-t"><b>${esc(name)}</b><small>${status}</small></span>${btn}</div>`;
  const pLogin = (el, text) => { el.innerHTML = `<p class="gp-note">${text}</p><button class="link" id="plog">Anmelden</button>`; el.querySelector('#plog').onclick = () => V.ui.home('profile'); };
  const pLink = (el, g, opts) => { const b = el.querySelector('#plink'); if (b) b.onclick = () => { V.sfx.ui(); linkInvite(g, opts); }; };
  async function picker(el, g, opts, all) {
    if (!el) return;
    if (!ready() || isAnon()) return pLogin(el, `Für Partien gegen Freunde brauchst du ein Konto.${guestOk(g.id) ? ' Per Link geht es auch ohne.' : ''}`);
    if (!el.querySelector('.pline')) el.innerHTML = V.skel(3);
    let d;
    try { d = await C().rpc('friends'); } catch (e) { el.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
    if (!el.isConnected) return;
    const canAsync = ASYNC.includes(g.id), asy = canAsync && pickAsync;
    // who is online comes first, then who was there last
    const fr = (d.friends || []).slice().sort((a, b) => (b.online - a.online) || String(b.seen || '').localeCompare(String(a.seen || '')));
    if (!fr.length) { el.innerHTML = `<p class="gp-note">Noch keine Freunde. Such nach einem Namen, zeig deinen QR-Code oder lade unten per Link ein.</p><button class="btn sm primary" id="pgo"><span>${IC().plus}Freund hinzufügen</span></button>`; el.querySelector('#pgo').onclick = () => { V.sfx.ui(); addFriends(); }; return; }
    // three friends, two when the "Wann spielt ihr?" row takes the room
    const shown = all ? fr : fr.slice(0, canAsync ? 2 : 3);
    el.innerHTML = (canAsync ? `<div class="gp-inl"><span>Wann spielt ihr?</span><div class="mini-seg" role="radiogroup" aria-label="Wann spielt ihr?" id="pasy"><button type="button" role="radio" data-v="0" aria-checked="${!asy}" class="${asy ? '' : 'on'}">Jetzt</button><button type="button" role="radio" data-v="1" aria-checked="${asy}" class="${asy ? 'on' : ''}">Über Tage</button></div></div>` : '')
      + shown.map((f, i) => pLine(f.username, f.busy ? 'spielt gerade' : f.online ? 'online' : ago(f.seen), f.busy ? 'busy' : f.online ? 'on' : '',
        `<button class="btn sm${i === 0 && (f.online || asy) ? ' primary' : ''}" data-inv="${esc(f.username)}"><span>Einladen</span></button>`)).join('')
      + (fr.length > shown.length ? `<button class="link pmore" id="pall">Alle anzeigen (${fr.length})</button>` : '');
    el.querySelectorAll('[data-inv]').forEach(x => x.onclick = () => invite(x.dataset.inv, g, opts, asy));
    el.querySelectorAll('#pasy button').forEach(x => x.onclick = () => { pickAsync = x.dataset.v === '1'; V.store.set('async', pickAsync); V.sfx.ui(); picker(el, g, opts, all); });
    const pa = el.querySelector('#pall'); if (pa) pa.onclick = () => { V.sfx.ui(); picker(el, g, opts, true); };
  }

  // game panel, mode "Online": open challenges of others for this game (searching is the button at the bottom)
  function openPanel(el, g, opts) {
    if (!el) return;
    if (!ready()) {
      if (!guestOk(g.id)) return pLogin(el, `Für Online-Partien in ${esc(g.name)} brauchst du ein Konto.`);
      el.innerHTML = '<p class="gp-note">Ohne Konto spielst du als Gast. Mit Konto zählt die Partie für die Rangliste.</p><button class="link" id="plog">Anmelden</button>';
      el.querySelector('#plog').onclick = () => V.ui.home('profile');
      return;
    }
    const others = ((pending && pending.open) || []).filter(o => o.game === g.id);
    el.innerHTML = (others.length ? `<h4 class="gp-h">Warten auf Gegner</h4>${others.slice(0, 2).map(o => pLine(o.from, 'sucht gerade einen Gegner', 'on', `<button class="btn sm primary" data-join="${o.id}"><span>Mitspielen</span></button>`)).join('')}`
      : '<p class="gp-note">Wer gerade wartet, spielt gegen dich. Ist niemand frei, geht es gegen die KI.</p>')
      + '<button class="link" id="plink">Freund per Link einladen</button>';
    pLink(el, g, opts);
    el.querySelectorAll('[data-join]').forEach(x => x.onclick = () => { x.classList.add('busy'); join(x.dataset.join); });
  }
  const seek = g => quick(g);

  // ---------- quick match: one tap, the server pairs you with whoever is waiting ----------
  // Nobody there after ~25 seconds: the search keeps running, and you can play the AI instead.
  // Without an account you play as a guest (anonymous account, only the guest games).
  const GUEST_ONLINE = ['c4', 'ttt', 'ships', 'dots'];
  const QUICK_GIVEUP = 25;
  const isAnon = () => !!(C().user() && C().user().anon);
  const guestOk = id => !id || GUEST_ONLINE.includes(id);
  let quickBusy = false;
  async function quick(g) {
    if (quickBusy || !C() || !C().available()) return;
    if (g && !g.online) return V.ui.toast('Dieses Spiel gibt es online noch nicht.');
    quickBusy = true;
    try {
      if (!C().user()) {
        if (!guestOk(g && g.id)) { V.ui.toast('Dafür brauchst du ein Konto'); return V.ui.home('profile'); }
        V.ui.toast('Du spielst als Gast');
        await C().signInGuest();
      } else if (isAnon() && !guestOk(g && g.id)) { V.ui.toast('Dafür brauchst du ein Konto'); return V.ui.home('profile'); }
      const fb = g ? g.id : (V.store.get('recent') && guestOk(V.store.get('recent')) && V.byId[V.store.get('recent')] && V.byId[V.store.get('recent')].online ? V.store.get('recent') : 'c4');
      const r = await C().rpc('quick_match', { gm: g ? g.id : null, fb, op: g ? optsFor(g) : {} });
      if (r.status === 'live') { V.sfx.goal(); return start(r); }
      waitQuick(r, g);
    } catch (e) { V.ui.toast(/quick_match|function/i.test(e.message) ? 'Schnelles Spiel kommt nach dem nächsten Server-Update.' : e.message); V.sfx.bad(); }
    finally { quickBusy = false; }
  }
  // Search screen: a radar runs while Versus looks for an opponent, the seconds count up; once someone is found
  // the name springs in and the match starts a second later. After 25 s you may play the AI instead.
  function waitQuick(r, chosen) {
    const mid = r.id, g = V.byId[r.game] || chosen;
    let done = false, t = null, tick = null, ch = null, secs = 0;
    const stop = () => { done = true; clearTimeout(t); clearInterval(tick); if (ch) ch.close(); };
    const cancel = () => C().rpc('match_cancel', { mid }).catch(() => { });
    const u = C().user(), me = u && !u.anon ? u.username.slice(0, 1).toUpperCase() : '+';
    const m = V.ui.openModal(`<div class="radar-v">
      <div class="radar"><i class="rr"></i><i class="rr"></i><i class="rr"></i><i class="rc"></i><span class="r-av">${esc(me)}</span></div>
      <h3 id="qwh">Gegner suchen</h3><p class="qw-g">${g ? `<span class="ic">${g.icon}</span>${esc(g.name)} · ` : 'Beliebiges Spiel · '}<span id="qws">0 s</span></p>
      <p class="qw-t" id="qwt">Wer jetzt auch sucht, landet bei dir.</p>
      <div class="actions" id="qwa"><button class="btn ghost" id="wc"><span>Abbrechen</span></button></div></div>`, 'radarm', () => { if (!done) { stop(); cancel(); } });
    m.querySelector('#wc').onclick = () => V.ui.closeModal();
    const vsAI = () => {
      stop(); cancel(); V.ui.closeModal();
      if (g) V.ui.play(g, { mode: 'ai', level: 1, first: 'rand', opts: optsFor(g) });
    };
    tick = setInterval(() => {
      secs++;
      const s = m.querySelector('#qws'); if (s) s.textContent = secs + ' s';
      const el = m.querySelector('#qwt'); if (!el) return;
      if (secs < QUICK_GIVEUP) { el.textContent = secs < 8 ? 'Wer jetzt auch sucht, landet bei dir.' : 'Noch niemand da'; return; }
      if (secs === QUICK_GIVEUP) {
        el.textContent = 'Gerade ist niemand frei. Spiel solange gegen die KI, oder warte weiter.';
        m.querySelector('#qwa').innerHTML = `<button class="btn primary" id="wai"><span>${IC().robot}Gegen die KI</span></button><button class="btn ghost" id="wc"><span>Abbrechen</span></button>`;
        m.querySelector('#wai').onclick = vsAI;
        m.querySelector('#wc').onclick = () => V.ui.closeModal();
        V.sfx.ui();
      }
    }, 1000);
    const found = st => {
      stop();
      const opp = st.role === 'a' ? st.b_name : st.a_name;
      m.classList.add('found');
      m.querySelector('#qwh').textContent = 'Gegner gefunden';
      m.querySelector('#qwt').innerHTML = `<b class="qw-n">${esc(opp || '')}</b>`;
      m.querySelector('#qwa').innerHTML = '';
      V.sfx.found();
      setTimeout(() => { V.ui.closeModal(); start(st); }, V.fxOn() ? 1000 : 300);
    };
    const poll = async () => {
      if (done) return;
      clearTimeout(t);
      try {
        const st = await C().rpc('match_state', { mid, since: 0 });
        if (done) return;
        if (st.status === 'live') return found(st);
        if (st.status !== 'invited') { stop(); V.ui.closeModal(); V.ui.toast('Die Suche ist abgelaufen'); return; }
      } catch (e) { }
      t = setTimeout(poll, 1500);
    };
    t = setTimeout(poll, 1200);
    ch = C().channel('m:' + mid, () => { if (!done) poll(); });
  }

  // the quick match card at the top of the Online tab; a tap opens a sheet with the choice of game
  let qGame = V.store.get('quick', '');
  function quickCard() {
    return `<button class="qhero" id="qopen"><i class="qh-st"></i><i class="qh-sh"></i>
      <span class="qh-t"><small>Ein Tipp, ein Gegner</small><b>Schnelles Spiel</b><em id="qstat"></em></span>
      <span class="qh-go">${IC().boltf}</span></button>`;
  }
  // the game of the quick match as text (sidebar, search button): "4 Gewinnt" or "Beliebiges Spiel"
  const quickName = () => qGame && V.byId[qGame] ? gname(qGame) : 'Beliebiges Spiel';
  const goLabel = () => (C().user() ? 'Suchen' : 'Als Gast suchen') + ' · ' + quickName();
  function quickSheet() {
    if (!C() || !C().available()) return V.ui.toast('Online-Spiele sind gleich da');
    const anon = !C().user() || isAnon();
    const ids = ONLINE.filter(id => V.byId[id]).sort((a, b) => guestOk(b) - guestOk(a));
    if (anon && !guestOk(qGame)) qGame = '';
    const m = V.ui.openModal(`<div class="qsheet"><h3>Schnelles Spiel</h3><p class="fhint">Welches Spiel? Bei „Egal“ nimmt Versus das, wofür gerade jemand wartet.</p>
      <div class="rgames qgames" id="qg">${[''].concat(ids).map(id => {
        const lock = anon && !guestOk(id);
        return `<button data-q="${id}" class="${qGame === id ? 'on' : ''}${lock ? ' lockd' : ''}" title="${esc(id ? gname(id) : 'Egal')}">${id ? `<span class="ic">${V.byId[id].icon}</span>` : `<span class="ic all">${IC().spark}</span>`}<small>${esc(id ? gname(id) : 'Egal')}</small>${lock ? `<i class="ql">${IC().lock}</i>` : ''}</button>`;
      }).join('')}</div>
      <div class="actions"><button class="btn primary big" id="qgo"><span>${IC().globe}<b id="qgol">${goLabel()}</b></span></button></div>
      ${C().user() ? '' : '<button class="btn ghost sm" data-tab-go="profile"><span>Konto erstellen</span></button>'}
      <p class="fine">${anon ? 'Als Gast gehen 4 Spiele. Mit Konto alle, dazu Freunde und Rangliste.' : 'Ist gerade niemand frei, kannst du solange gegen die KI spielen.'}</p></div>`, 'qsm');
    m.querySelectorAll('#qg [data-q]').forEach(x => x.onclick = () => {
      const id = x.dataset.q;
      if (x.classList.contains('lockd')) { V.sfx.bad(); return V.ui.toast('Dafür brauchst du ein Konto'); }
      qGame = id; V.store.set('quick', id); V.sfx.ui();
      m.querySelectorAll('#qg [data-q]').forEach(y => y.classList.toggle('on', y === x));
      m.querySelector('#qgol').textContent = goLabel();
      if (V.ui.side) V.ui.side();
    });
    m.querySelector('#qgo').onclick = () => { V.sfx.ui(); V.ui.closeModal(); quick(qGame ? V.byId[qGame] : null); };
    const tg = m.querySelector('[data-tab-go]'); if (tg) tg.onclick = () => { V.ui.closeModal(); V.ui.home('profile'); };
  }
  function wireQuick(b) {
    const o = b.querySelector('#qopen'); if (o) o.onclick = () => { V.sfx.ui(); quickSheet(); };
    C().rpc('quick_stats').then(s => {
      const el = b.querySelector('#qstat'); if (!el || !s) return;
      const parts = [s.online ? `${s.online} online` : '', s.waiting ? `${s.waiting} ${s.waiting === 1 ? 'sucht' : 'suchen'} gerade` : '', s.playing ? `${s.playing} spielen` : ''].filter(Boolean);
      if (parts.length) el.textContent = parts.join(' · ');
    }, () => { });
  }

  // ---------- blocking and reporting ----------
  let blocked = null;
  async function loadBlocks() { try { blocked = new Set((await C().rpc('my_blocks')).map(r => r.username)); } catch (e) { blocked = blocked || new Set(); } return blocked; }
  const isBlocked = n => !!(blocked && blocked.has(n));
  async function block(name, on) {
    try {
      await C().rpc('block_player', { name, on_: on });
      await loadBlocks(); changed();
      V.ui.toast(on ? name + ' ist blockiert' : name + ' ist nicht mehr blockiert');
      return true;
    } catch (e) { V.ui.toast(/block_player|function/i.test(e.message) ? 'Blockieren kommt nach dem nächsten Server-Update.' : e.message); return false; }
  }
  const REASONS = [['name', 'Beleidigender Name'], ['abuse', 'Beleidigung oder Spam'], ['cheat', 'Schummeln oder Abbrechen'], ['other', 'Etwas anderes']];
  function report(name, mid) {
    if (!ready()) return V.ui.toast('Dafür brauchst du ein Konto');
    let why = '';
    const m = V.ui.openModal(`<form class="fadd repf" id="repf">
      <div class="fadd-h"><h3>${esc(name)} melden</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint">Das Team sieht die Meldung und kümmert sich darum. Missbrauch der Meldefunktion kann zur Sperre führen.</p>
      <div class="repr" id="repr">${REASONS.map(([k, l]) => `<button type="button" data-r="${k}">${l}</button>`).join('')}</div>
      <textarea class="inp" id="repn" maxlength="300" rows="3" placeholder="Was ist passiert? (freiwillig)"></textarea>
      <label class="repb"><input type="checkbox" id="repb" checked> <span>${esc(name)} auch blockieren</span></label>
      <p class="aerr" id="repe"></p>
      <div class="actions"><button class="btn primary" type="submit"><span>Melden</span></button><button class="btn ghost" type="button" id="repc"><span>Abbrechen</span></button></div></form>`, 'faddm');
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelector('#repc').onclick = V.ui.closeModal;
    m.querySelectorAll('[data-r]').forEach(x => x.onclick = () => { why = x.dataset.r; V.sfx.ui(); m.querySelectorAll('[data-r]').forEach(y => y.classList.toggle('on', y === x)); m.querySelector('#repe').textContent = ''; });
    m.querySelector('#repf').onsubmit = async e => {
      e.preventDefault();
      if (!why) { m.querySelector('#repe').textContent = 'Wähl bitte einen Grund.'; return; }
      try {
        await C().rpc('report_player', { name, why, note: m.querySelector('#repn').value, mid: mid || null });
        const alsoBlock = m.querySelector('#repb').checked;
        V.ui.closeModal(); V.ui.toast('Danke, die Meldung ist beim Team');
        if (alsoBlock && !isBlocked(name)) block(name, true);
      } catch (x) { m.querySelector('#repe').textContent = /report_player|function/i.test(x.message) ? 'Melden kommt nach dem nächsten Server-Update.' : x.message; V.sfx.bad(); }
    };
  }

  // ---------- player profile: numbers, per game, head-to-head and the latest matches ----------
  async function profile(name) {
    if (!ready()) return V.ui.toast('Dafür brauchst du ein Konto');
    const m = V.ui.openModal(`<div class="prof">${V.skel(4)}</div>`, 'profm');
    let p;
    try { p = await C().rpc('player_profile', { name }); }
    catch (e) { m.innerHTML = `<div class="prof"><p class="aerr">${esc(/player_profile|function/i.test(e.message) ? 'Profile kommen nach dem nächsten Server-Update.' : e.message)}</p><div class="actions"><button class="btn" id="pc"><span>Schließen</span></button></div></div>`; m.querySelector('#pc').onclick = V.ui.closeModal; return; }
    if (!document.body.contains(m)) return;
    const t = p.total || {}, pct = (w, n) => (n ? Math.round(w / n * 100) : 0);
    const RES = { win: ['S', 'Sieg'], loss: ['N', 'Niederlage'], draw: ['R', 'Remis'], void: ['–', 'annulliert'] };
    const status = p.me ? 'Das bist du' : p.online ? '<b class="good">online</b>' : p.seen ? 'zuletzt ' + ago(p.seen) : 'Status verborgen';
    const games = (p.games || []).map(g => `<div class="pgame"><span class="ic">${V.byId[g.game] ? V.byId[g.game].icon : ''}</span><span class="pg-n"><b>${esc(gname(g.game))}</b><small>${g.played} Partien</small></span>
      <span class="pg-bar"><i class="w" style="flex:${g.wins}"></i><i class="d" style="flex:${g.played - g.wins - g.losses}"></i><i class="l" style="flex:${g.losses}"></i></span><em>${g.wins}:${g.losses}</em></div>`).join('');
    const recent = (p.recent || []).map(r => `<div class="prec ${r.res}"><span class="pr-r" title="${RES[r.res][1]}">${RES[r.res][0]}</span>
      <span class="ic">${V.byId[r.game] ? V.byId[r.game].icon : ''}</span><span class="pr-t"><b>${esc(gname(r.game))}</b><small>gegen ${r.opp ? `<button class="link" data-prof="${esc(r.opp)}">${esc(r.opp)}</button>` : '?'}${r.result === 'resign' ? ' · aufgegeben' : r.result === 'abandon' ? ' · verlassen' : r.result === 'time' ? ' · Zeit' : ''}${r.ranked ? '' : ' · nicht gewertet'}</small></span>
      <span class="pr-d">${ago(r.at)}</span></div>`).join('');
    const vs = p.vs && p.vs.played ? `<div class="pvs"><small>Ihr beide</small><b><span class="me">${p.vs.wins}</span><i>:</i><span>${p.vs.losses}</span></b><small>${p.vs.played} Partien${p.vs.draws ? ' · ' + p.vs.draws + ' remis' : ''}</small></div>` : '';
    const blk = isBlocked(p.username);
    const act = p.me ? (isAnon() ? '' : `<button class="btn primary" id="plook"><span>${IC().spark}Look ändern</span></button><button class="btn" id="pcode"><span>${IC().qr}Mein Freundescode</span></button>`)
      : blk ? `<button class="btn" id="punb"><span>Nicht mehr blockieren</span></button>`
      : isAnon() ? ''
      : p.friend === 'friend' ? `<button class="btn primary" id="pch"><span>${IC().play}Herausfordern</span></button><button class="btn ghost" id="prm"><span>Freund entfernen</span></button>`
      : p.friend === 'outgoing' ? `<button class="btn" disabled><span>Anfrage gesendet</span></button><button class="btn ghost" id="pwd"><span>Zurückziehen</span></button>`
      : p.friend === 'incoming' ? `<button class="btn primary" id="pyes"><span>Anfrage annehmen</span></button><button class="btn ghost" id="pno"><span>Ablehnen</span></button>`
      : `<button class="btn primary" id="padd"><span>${IC().plus}Als Freund hinzufügen</span></button>`;
    const stat = (v, l, c) => `<div class="p2-s ${c}"><b>${v}</b><span>${l}</span></div>`;
    m.innerHTML = `<div class="prof p2">
      <div class="p2-top"><i class="p2-st" aria-hidden="true"></i>
        <span class="p2-av">${esc(p.username.slice(0, 2).toUpperCase())}</span>
        <div class="p2-id"><b>${esc(p.username)}</b><div class="p2-tags" id="ptags">${p.dev ? '<em class="p2-b r-dev">Dev</em>' : ''}</div>
          <small>${status} · dabei seit ${new Date(p.since).toLocaleDateString(V.locale(), { month: 'long', year: 'numeric' })}</small></div>
        <button class="iconbtn p2-x" id="pc" aria-label="Schließen">${IC().x}</button></div>
      <div class="p2-stats">${stat(t.wins || 0, 'Siege', 'p')}${stat(t.losses || 0, 'Niederlagen', 'y')}${stat(pct(t.wins, t.played) + ' %', 'Siegquote', 'c')}${stat(p.week ? '#' + p.week.pos : '–', 'Diese Woche', 'g')}</div>
      ${p.streak >= 2 || vs ? `<div class="p2-row">${p.streak >= 2 ? `<div class="pstreak">${IC().bolt}<b>${p.streak} Siege in Folge</b></div>` : ''}${vs}</div>` : ''}
      <section class="p2-aw" id="paw" hidden><h4>Abzeichen<small id="pawn"></small></h4><div id="pawl"></div></section>
      <div class="p2-cols">
        <section><h4>Spiele</h4>${games ? `<div class="pgames">${games}</div>` : '<p class="muted">Noch keine Online-Partien.</p>'}</section>
        <section><h4>Letzte Partien</h4><div class="precs">${recent || '<p class="muted">Noch keine Online-Partien.</p>'}</div></section>
      </div>
      ${act || !p.me ? `<div class="p2-foot">${act ? `<div class="actions">${act}</div>` : ''}
        ${p.me ? '' : `<div class="psafe">${blk ? '' : `<button class="link" id="pblk">Blockieren</button>`}<button class="link" id="prep">Melden</button></div>`}</div>` : ''}
    </div>`;
    m.querySelector('#pc').onclick = V.ui.closeModal;
    // badges next to the name: the team role (Owner, Admin), Dev, and how many players joined through this player's link
    C().rpc('player_badges', { name: p.username }).then(b => {
      const h = m.querySelector('#ptags'); if (!h || !b) return;
      const ROLE = { owner: 'Owner', admin: 'Admin' };
      h.insertAdjacentHTML('afterbegin', b.role && ROLE[b.role] ? `<em class="p2-b r-${b.role}">${IC().shield}${ROLE[b.role]}</em>` : '');
      if (b.invited) h.insertAdjacentHTML('beforeend', `<em class="p2-b inv" title="Hat ${b.invited} Spieler zu Versus eingeladen">${IC().users}Werber · ${b.invited}</em>`);
      // the badges they earned (set_awards); legendary ones first
      const aw = b.awards || (p.me ? V.store.get('badges', {}) : null), pw = m.querySelector('#paw');
      if (pw && V.badges && aw && Object.keys(aw).length) { const html = V.badges.profile(aw); if (html) { pw.hidden = false; m.querySelector('#pawl').innerHTML = html; m.querySelector('#pawn').textContent = (html.match(/class="pb /g) || []).length + ' / ' + V.badges.count; } }
      // the player's look: avatar, banner, motto, favourite game
      const l = b.look || {}, top = m.querySelector('.p2-top'), av = m.querySelector('.p2-av'), id = m.querySelector('.p2-id');
      if (!top || !V.look) return;
      top.classList.add(V.look.banner(l)); top.style.setProperty('--lc', V.look.color(l));
      av.setAttribute('style', V.look.style(l)); av.classList.toggle('sym', V.look.isIcon(l)); av.innerHTML = V.look.text(p.username, l);
      if (l.m) { const s = document.createElement('small'); s.className = 'p2-m'; s.textContent = '„' + l.m + '“'; s.setAttribute('translate', 'no'); id.querySelector('b').after(s); }
      if (l.g && V.byId[l.g]) id.insertAdjacentHTML('beforeend', `<span class="p2-fav"><span class="ic">${V.byId[l.g].icon}</span>${esc(gname(l.g))}</span>`);
    }, () => { });
    m.querySelectorAll('[data-prof]').forEach(x => x.onclick = () => { V.sfx.ui(); profile(x.dataset.prof); });
    const on = (id, fn) => { const x = m.querySelector('#' + id); if (x) x.onclick = () => fn(x); };
    const again = () => { if (document.body.contains(m)) profile(p.username); };
    on('padd', () => request(p.username).then(again, e => V.ui.toast(e.message)));
    on('pyes', () => respond(p.username, true).then(again));
    on('pno', () => respond(p.username, false).then(again));
    on('pwd', () => C().rpc('friend_remove', { name: p.username }).then(() => { V.ui.toast('Anfrage zurückgezogen'); changed(); again(); }, e => V.ui.toast(e.message)));
    on('pch', () => { V.sfx.ui(); challenge(p.username); });
    on('pcode', () => { V.sfx.ui(); addFriends('code'); });
    on('plook', () => { V.sfx.ui(); V.ui.closeModal(); V.look.editor(); });
    on('prep', () => { V.sfx.ui(); report(p.username); });
    on('punb', () => block(p.username, false).then(again));
    // blocking needs a second tap
    on('pblk', x => {
      if (!x.classList.contains('bad')) { x.classList.add('bad'); x.textContent = 'Wirklich blockieren?'; return; }
      block(p.username, true).then(again);
    });
    // removing a friend needs a second tap
    on('prm', x => {
      if (!x.classList.contains('danger')) { x.classList.add('danger'); x.querySelector('span').textContent = 'Wirklich entfernen?'; return; }
      C().rpc('friend_remove', { name: p.username }).then(() => { V.ui.toast(p.username + ' ist nicht mehr dein Freund'); changed(); again(); }, e => V.ui.toast(e.message));
    });
  }

  // any player name with data-prof opens that profile (friends, search, ranking)
  document.addEventListener('click', e => {
    const x = e.target.closest && e.target.closest('[data-prof]');
    if (!x || x.closest('.prof') || !ready()) return;
    const btn = e.target.closest('button, input'); if (btn && btn !== x && x.contains(btn)) return;
    e.stopPropagation(); V.sfx.ui(); profile(x.dataset.prof);
  });

  // ---------- tables for 2-4 players (party games) ----------
  // Someone opens a table (seat 1, host), invites friends, shares the code or makes it visible for everybody.
  // The host starts; empty seats are played by the AI. Server: supabase/migrations/20261107000000_party_tables.sql
  const TABLE = ['ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess', 'code', 'domino', 'draw'];
  TABLE.forEach(id => { if (V.byId[id]) V.byId[id].table = true; });
  let lobbyT = null, lobbyId = null;
  const tableLink = c => location.origin + location.pathname + '?table=' + c;
  const noServer = e => /party_|function/i.test(e.message) ? 'Online-Tische kommen nach dem nächsten Server-Update.' : e.message;
  function startTable(st) {
    const g = V.byId[st.game]; if (!g) return V.ui.toast('Unbekanntes Spiel');
    stopLobby(); hideInvite();
    V.ui.play(g, { mode: 'table', level: st.lvl, opts: Object.assign({}, st.opts, { n: st.n }), match: { id: st.id, seat: st.seat, init: st } });
  }
  async function resumeTable(id) {
    try {
      const st = await C().rpc('party_state', { tid: id, since: 0 });
      if (st.status === 'live') return startTable(st);
      if (st.status === 'lobby') { V.ui.home('online'); return lobby(st); }
      V.ui.toast('Das Spiel an diesem Tisch ist vorbei.'); V.ui.home('online');
    } catch (e) { V.ui.toast(e.message); V.ui.home('online'); }
  }
  // tables need an account, except in the Discord activity: there the voice channel sits down together, guests too
  async function tableAccess() {
    if (inDiscord() && C() && C().available()) {
      if (!C().user()) { V.ui.toast('Du spielst als Gast'); await C().signInGuest(); }
      return true;
    }
    if (!ready() || isAnon()) { V.ui.toast('Dafür brauchst du ein Konto'); V.ui.home('profile'); return false; }
    return true;
  }
  // pub: a public table everybody can join (mode "Online"), otherwise only friends and whoever has the code
  async function table(g, opts, lvl, pub) {
    try {
      if (!(await tableAccess())) return;
      const st = await C().rpc('party_create', { gm: g.id, op: opts || optsFor(g), n: g.party ? +(opts && opts.n) || 4 : 2, lvl: lvl ?? 1, pub: !!pub });
      lobby(st);
      showRoom('table', st.id);
    }
    catch (e) { V.ui.toast(noServer(e)); V.sfx.bad(); }
  }
  async function joinTable(id, code) {
    try {
      if (!(await tableAccess())) return;
      const st = await C().rpc('party_join', { tid: id || null, cd: code || null }); if (st.status === 'live') return startTable(st); lobby(st);
    }
    catch (e) { V.ui.toast(noServer(e)); V.sfx.bad(); check(); }
  }
  let lobbyChan = null;
  function stopLobby() { clearTimeout(lobbyT); lobbyT = null; lobbyId = null; if (lobbyChan) { lobbyChan.close(); lobbyChan = null; } }
  function lobby(st) {
    stopLobby(); hideInvite();
    lobbyId = st.id;
    let cur = st, starting = false, sure = false, friendsShown = false;
    const g = V.byId[st.game] || { name: st.game, icon: '' };
    const isHost = () => cur.seat === cur.host;
    const m = V.ui.openModal(`<div class="lobby">
      <div class="fadd-h"><span class="lb-ic">${g.icon}</span><div class="lb-t"><small>Online-Tisch · ${cur.n} Plätze</small><h3>${esc(g.name)}</h3></div><button class="iconbtn" id="lbx" aria-label="Schließen">${IC().x}</button></div>
      <div class="lb-seats" id="lbs"></div>
      <div class="lb-code"><div><small>Tischcode</small><b>${esc(cur.code)}</b></div><button class="btn sm" id="lbsh"><span>${IC().share}Link teilen</span></button></div>
      ${inDiscord() ? '<p class="fhint">Alle in diesem Sprachkanal sehen den Tisch und kommen mit einem Tipp dazu.</p>' : ''}
      <div id="lbhost"></div>
      <div class="actions" id="lba"></div></div>`, 'lobm', () => {
      // closing the lobby means leaving the table (the host closes it)
      if (!starting) C().rpc('party_leave', { tid: st.id }).then(() => C().poke('t:' + st.id), () => { });
      stopLobby();
    });
    m.querySelector('#lbx').onclick = V.ui.closeModal;
    m.querySelector('#lbsh').onclick = () => {
      V.sfx.ui();
      const link = tableLink(cur.code), text = V.t(`Komm an meinen ${g.name}-Tisch in Versus (Code ${cur.code}):`);
      if (navigator.share) navigator.share({ title: 'Versus', text, url: link }).catch(() => { }); else copy(link);
    };
    const SEAT = ['Pink', 'Gelb', 'Cyan', 'Grün'];
    function draw() {
      const humans = cur.names.slice(0, cur.n).filter(Boolean).length;
      m.querySelector('#lbs').innerHTML = Array.from({ length: cur.n }, (_, i) => {
        const nm = cur.names[i], s = i + 1;
        return `<div class="lb-seat s${s}${nm ? '' : ' free'}"><span class="lb-dot"></span><b>${nm ? esc(nm) : 'Frei'}</b>
          <small>${nm ? (s === cur.host ? 'Gastgeber' : '') + (s === cur.seat ? (s === cur.host ? ' · du' : 'du') : '') + (nm && cur.online && cur.online[i] === false ? ' · offline' : '') : 'spielt sonst die KI'}</small><em>${SEAT[i]}</em></div>`;
      }).join('');
      const act = m.querySelector('#lba');
      if (isHost()) {
        act.innerHTML = `<button class="btn primary big" id="lbgo"${humans < 2 ? ' disabled' : ''}><span>${IC().play}${humans < 2 ? 'Warte auf Mitspieler' : 'Spiel starten'}</span></button>`;
        act.querySelector('#lbgo').onclick = async () => {
          try { const s = await C().rpc('party_start', { tid: st.id }); starting = true; V.ui.closeModal(); V.sfx.goal(); startTable(s); }
          catch (e) { V.ui.toast(e.message); V.sfx.bad(); }
        };
        if (!friendsShown) { friendsShown = true; hostTools(); }
        m.querySelectorAll('[data-tinv]').forEach(b => { if (cur.names.includes(b.dataset.tinv)) { b.disabled = true; b.querySelector('span').textContent = 'Am Tisch'; } });
      } else {
        const hn = cur.names[cur.host - 1];
        act.innerHTML = `<p class="fhint lb-wait"><span class="spin"><i></i><i></i></span>Warte, bis ${esc(hn || 'der Gastgeber')} startet …</p>`;
        m.querySelector('#lbhost').innerHTML = '';
        friendsShown = false;
      }
    }
    async function hostTools() {
      const el = m.querySelector('#lbhost');
      el.innerHTML = `<button class="opt" id="lbpub" role="switch" aria-checked="${!!cur.open}">${IC().globe}<span><b>Für alle sichtbar</b><small>Jeder eingeloggte Spieler kann sich dazusetzen</small></span><i class="sw ${cur.open ? 'on' : ''}"></i></button>
        <h4>Freunde einladen</h4><div id="lbf">${V.skel(2)}</div>`;
      el.querySelector('#lbpub').onclick = async () => {
        const on = !cur.open;
        try { await C().rpc('party_open', { tid: st.id, pub: on }); cur.open = on; const b = el.querySelector('#lbpub'); b.setAttribute('aria-checked', on); b.querySelector('.sw').classList.toggle('on', on); V.sfx.ui(); }
        catch (e) { V.ui.toast(e.message); }
      };
      let d; try { d = await fetchFriends(); } catch (e) { el.querySelector('#lbf').innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
      const f = el.querySelector('#lbf'); if (!f) return;
      const fr = (d.friends || []).slice().sort((a, b) => (b.online && !b.busy) - (a.online && !a.busy));
      if (!fr.length) { f.innerHTML = '<p class="fhint">Noch keine Freunde. Teil einfach den Link oder den Tischcode.</p>'; return; }
      f.innerHTML = fr.map(x => `<div class="fline${x.online ? ' on' : ''}"><span class="adot"></span><b>${esc(x.username)}</b><small>${x.busy ? 'spielt gerade' : x.online ? 'online' : ago(x.seen)}</small><button class="btn sm${x.online ? ' primary' : ''}" data-tinv="${esc(x.username)}"><span>Einladen</span></button></div>`).join('');
      f.querySelectorAll('[data-tinv]').forEach(b => { if (cur.names.includes(b.dataset.tinv)) { b.disabled = true; b.querySelector('span').textContent = 'Am Tisch'; } });
      f.querySelectorAll('[data-tinv]').forEach(b => b.onclick = async () => {
        try { await C().rpc('party_invite', { tid: st.id, name: b.dataset.tinv }); C().poke('u:' + b.dataset.tinv); b.disabled = true; b.querySelector('span').textContent = 'Eingeladen'; V.sfx.ui(); }
        catch (e) { V.ui.toast(e.message); }
      });
    }
    const poll = async () => {
      if (lobbyId !== st.id) return;
      clearTimeout(lobbyT);
      try {
        const s = await C().rpc('party_state', { tid: st.id, since: 0 });
        if (lobbyId !== st.id) return;
        const before = JSON.stringify([cur.names, cur.host, cur.online]);
        cur = s;
        if (s.status === 'live' && s.seat) { starting = true; V.ui.closeModal(); V.sfx.goal(); return startTable(s); }
        if (s.status !== 'lobby' || !s.seat) { starting = true; V.ui.closeModal(); return V.ui.toast(s.status === 'canceled' ? 'Der Tisch wurde geschlossen' : 'Du sitzt nicht mehr an diesem Tisch'); }
        if (JSON.stringify([s.names, s.host, s.online]) !== before) { const joined = s.names.filter(Boolean).length > JSON.parse(before)[0].filter(Boolean).length; draw(); if (joined) V.sfx.goal(); }
      } catch (e) { }
      lobbyT = setTimeout(poll, 1500);
    };
    draw();
    lobbyT = setTimeout(poll, 1200);
    // joining, leaving and the start poke the table channel (hello: the others see me sitting down at once)
    lobbyChan = C().channel('t:' + st.id, poll, true);
  }
  // game panel for table games: "Freund" (pub false) shows the tables you were invited to and a code field,
  // "Online" (pub true) the public tables of everybody; opening a table is the button at the bottom of the panel
  function tablePanel(el, g, opts, lvl, pub) {
    if (!el) return;
    if (!inDiscord() && (!ready() || isAnon())) return pLogin(el, 'Für Online-Tische brauchst du ein Konto.');
    const list = ((tpending && tpending[pub ? 'open' : 'invites']) || []).filter(o => o.game === g.id);
    const rows = list.slice(0, 2).map(o => pLine(o.from, `Tisch · ${o.players}/${o.n}`, 'on', `<button class="btn sm primary" data-tjoin="${o.id}"><span>Mitspielen</span></button>`)).join('');
    el.innerHTML = pub
      ? (list.length ? `<h4 class="gp-h">Offene Tische</h4>${rows}` : '<p class="gp-note">Gerade ist kein offener Tisch frei. Eröffne einen, dann kann sich jeder dazusetzen.</p>')
      : (list.length ? `<h4 class="gp-h">Einladungen</h4>${rows}` : '')
        + '<form class="tcode" id="tcf"><input class="inp" id="tci" placeholder="Tischcode" aria-label="Tischcode" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn sm" type="submit"><span>Beitreten</span></button></form>';
    el.querySelectorAll('[data-tjoin]').forEach(b => b.onclick = () => joinTable(b.dataset.tjoin));
    const i = el.querySelector('#tci');
    if (!i) return;
    i.oninput = () => { i.value = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); };
    el.querySelector('#tcf').onsubmit = e => { e.preventDefault(); if (i.value.length === 5) joinTable(null, i.value); else V.ui.toast('Der Tischcode hat 5 Zeichen'); };
  }
  // table link (?table=CODE)
  function consumeTable() {
    let code = null; try { code = sessionStorage.getItem('versus.table'); } catch (e) { }
    if (!code || !ready()) return;
    if (busyScreen()) return setTimeout(consumeTable, 1200);
    try { sessionStorage.removeItem('versus.table'); } catch (e) { }
    joinTable(null, code);
  }

  // ---------- game link: a match for one friend, without being friends (server: match_link, match_peek) ----------
  const joinLink = id => location.origin + location.pathname + '?join=' + id;
  async function linkInvite(g, opts) {
    if (!C() || !C().available()) return;
    let mid;
    try {
      if (!C().user()) { if (!guestOk(g.id)) { V.ui.toast('Dafür brauchst du ein Konto'); return V.ui.home('profile'); } await C().signInGuest(); }
      mid = await C().rpc('match_link', { gm: g.id, op: opts || optsFor(g) });
      showRoom('match', mid);
    } catch (e) { V.sfx.bad(); return V.ui.toast(/match_link|function/i.test(e.message) ? 'Spiel-Links kommen nach dem nächsten Server-Update.' : e.message); }
    const url = joinLink(mid);
    let done = false, t = null, ch = null;
    const stop = () => { done = true; clearTimeout(t); if (ch) ch.close(); };
    // in Discord nobody needs the link: the others in the voice channel get the join bar (discordRoom)
    const dc = inDiscord();
    const m = V.ui.openModal(`<div class="linkw"><h3>Spiel mit mir</h3>${dc ? `<p class="fhint"><b>${esc(g.name)}</b> · alle in diesem Sprachkanal sehen deine Einladung unten als Balken. Wer zuerst auf „Mitspielen“ tippt, spielt auf seinem eigenen Gerät gegen dich.</p>` : `<p class="fhint">${esc(g.name)} · schick den Link oder lass den Code scannen. Wer ihn öffnet, spielt sofort gegen dich, auch ohne Freundschaft und ohne Konto (bei den Gast-Spielen).</p>
      <div class="fqr" id="lqr">${V.skel(1)}</div>
      <div class="arow"><button class="btn primary" id="lsh"><span>${IC().share}Link teilen</span></button><button class="btn" id="lcp"><span>${IC().link}Kopieren</span></button></div>`}
      <p class="lb-wait"><span class="spin"><i></i><i></i></span>Warte, bis jemand beitritt …</p>${dc ? '' : '<p class="fine">Du kannst den Link in Ruhe verschicken, er gilt 15 Minuten.</p>'}
      <div class="actions"><button class="btn ghost" id="lx"><span>Abbrechen</span></button></div></div>`, 'linkm', () => { if (!done) { stop(); C().rpc('match_cancel', { mid }).catch(() => { }); } });
    if (!dc) loadQR().then(() => { const q = m.querySelector('#lqr'); if (q) q.innerHTML = qrSvg(url); }, () => { const q = m.querySelector('#lqr'); if (q) q.innerHTML = `<p class="fhint">${esc(url)}</p>`; });
    m.querySelector('#lx').onclick = () => V.ui.closeModal();
    if (!dc) {
      m.querySelector('#lcp').onclick = () => copy(url);
      m.querySelector('#lsh').onclick = async () => {
        try { if (navigator.share) return await navigator.share({ title: 'Versus', text: `Spiel ${g.name} mit mir`, url }); } catch (e) { if (e && e.name === 'AbortError') return; }
        copy(url);
      };
    }
    const poll = async () => {
      if (done) return;
      try {
        const st = await C().rpc('match_state', { mid, since: 0 });
        if (done) return;
        if (st.status === 'live') { stop(); V.ui.closeModal(); V.sfx.found(); return start(st); }
        if (st.status !== 'invited') { stop(); V.ui.closeModal(); return V.ui.toast('Der Link ist abgelaufen'); }
      } catch (e) { }
      t = setTimeout(poll, 1500);
    };
    t = setTimeout(poll, 1200);
    ch = C().channel('m:' + mid, () => { if (!done) poll(); });
  }
  // somebody opened a game link: see what it is, then join (as a guest if the game allows it)
  async function consumeJoin() {
    let id = null; try { id = sessionStorage.getItem('versus.join'); } catch (e) { }
    if (!id || !C() || !C().available() || C().starting()) return;
    if (busyScreen()) return setTimeout(consumeJoin, 1200);
    let p = null;
    try { p = await C().rpc('match_peek', { mid: id }); } catch (e) { }
    const drop = () => { try { sessionStorage.removeItem('versus.join'); } catch (e) { } };
    if (!p || !p.open) { drop(); return V.ui.toast('Dieser Spiel-Link gilt nicht mehr'); }
    const g = V.byId[p.game];
    if (!C().user() && !guestOk(p.game)) {
      const m = V.ui.openModal(`<div class="confirm"><h3>${esc(p.from)} lädt dich ein</h3><p>${esc(g ? g.name : p.game)} braucht ein kostenloses Konto. Melde dich an, dann geht es direkt los.</p>
        <div class="actions"><button class="btn primary" id="jl"><span>${IC().user}Zum Konto</span></button><button class="btn ghost" id="jn"><span>Später</span></button></div></div>`);
      m.querySelector('#jl').onclick = () => { V.ui.closeModal(); V.ui.home('profile'); };
      m.querySelector('#jn').onclick = () => { drop(); V.ui.closeModal(); };
      return;
    }
    drop();
    try {
      if (!C().user()) { V.ui.toast('Du spielst als Gast'); await C().signInGuest(); }
      const st = await C().rpc('match_join', { mid: id });
      V.sfx.found(); start(st);
    } catch (e) { V.ui.toast(e.message); }
  }
  // a notification about a match over days was tapped
  function consumeMatch() {
    let id = null; try { id = sessionStorage.getItem('versus.match'); } catch (e) { }
    if (!id || !ready()) return;
    if (busyScreen()) return setTimeout(consumeMatch, 1200);
    try { sessionStorage.removeItem('versus.match'); } catch (e) { }
    resume(id);
  }

  // ---------- Discord activity: what is open in this voice channel (server: discord_room_set, discord_room_peek) ----------
  function inDiscord() { return !!(V.discord && V.discord.on && V.discord.instance); }
  // a new table or game link is shown to everybody else who has Versus open in the same voice channel
  function showRoom(kind, ref) {
    if (inDiscord()) C().rpc('discord_room_set', { inst: V.discord.instance, kind, ref }).catch(() => { });
  }
  let roomT = null, roomKey = '';
  async function discordRoom() {
    clearTimeout(roomT);
    if (!inDiscord()) return;
    roomT = setTimeout(discordRoom, 5000);
    if (document.hidden || !C() || !C().available() || C().starting()) return;
    let r = null;
    try { r = await C().rpc('discord_room_peek', { inst: V.discord.instance }); } catch (e) { }
    const g = r && V.byId[r.game];
    // not while playing or while a window is open (the lobby of that very table, for example)
    const show = g && !r.mine && !busyScreen() && !document.querySelector('.view.play');
    const key = show ? r.kind + ':' + (r.code || r.id) + ':' + (r.players || 0) : '';
    const old = document.querySelector('.upbar.dc');
    if (key === roomKey && !!old === !!key) return;
    roomKey = key;
    if (old) old.remove();
    if (!key) return;
    const bar = V.el('div', 'upbar dc', `<i class="dcic">${g.icon}</i><span><b><em class="dn" translate="no"></em> wartet in diesem Sprachkanal</b><small></small></span><button class="btn sm primary"><span>Mitspielen</span></button>`);
    bar.querySelector('.dn').textContent = r.from || 'Jemand';
    bar.querySelector('small').textContent = g.name + (r.kind === 'table' ? ' · ' + r.players + '/' + r.n : '');
    document.body.appendChild(bar);
    bar.querySelector('button').onclick = () => {
      V.sfx.ui(); bar.remove(); roomKey = '';
      if (r.kind === 'table') return joinTable(null, r.code);
      // a game link: the same way as an opened ?join= link (as a guest where the game allows it)
      try { sessionStorage.setItem('versus.join', r.id); } catch (e) { }
      consumeJoin();
    };
  }
  if (inDiscord()) setTimeout(discordRoom, 2500);

  // ---------- push notifications ----------
  const PUSH_KEY = 'BI91bCDLWF_XqePjImRog1IEmr80m6ssBOq6vw9n_Z_sBKwiNKt9IVknChF7sZBx0nErbQ37Ft6w-m2d1eDByUk';
  const pushable = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const b64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  async function pushState() {
    if (!pushable()) return 'none';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return 'none';
    return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
  }
  async function pushOn() {
    if (!pushable()) throw new Error(V.isIOS ? 'Auf dem iPhone geht das erst, wenn Versus als App installiert ist.' : 'Dieser Browser kann keine Benachrichtigungen.');
    if (!ready() || isAnon()) throw new Error('Dafür brauchst du ein Konto');
    if (await Notification.requestPermission() !== 'granted') throw new Error('Benachrichtigungen sind im Browser blockiert');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(PUSH_KEY) });
    const j = sub.toJSON();
    try { await C().rpc('push_save', { ep: j.endpoint, key: j.keys.p256dh, au: j.keys.auth }); }
    catch (e) { await sub.unsubscribe().catch(() => { }); throw new Error(/push_save|function/i.test(e.message) ? 'Benachrichtigungen kommen nach dem nächsten Server-Update.' : e.message); }
  }
  async function pushOff() {
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return;
    const sub = await reg.pushManager.getSubscription(); if (!sub) return;
    C().rpc('push_remove', { ep: sub.endpoint }).catch(() => { });
    await sub.unsubscribe();
  }

  // own weekly place and win streak for the profile head (one request every two minutes at most)
  let meCache = null, meAt = 0, meWho = null;
  function meStats() {
    if (!ready() || isAnon()) return Promise.resolve(null);
    const who = C().user().username;
    if (meCache && meWho === who && Date.now() - meAt < 120000) return meCache;
    meWho = who; meAt = Date.now();
    meCache = C().rpc('player_profile', { name: who }).then(p => ({ week: p.week ? p.week.pos : 0, streak: p.streak || 0 }), () => null);
    return meCache;
  }
  const quickGo = () => quick(qGame ? V.byId[qGame] : null);
  V.online = { badge, sideFriends, resumables, resumeAny, quickSheet, quickName, tab, wire, picker, openPanel, seek, quick, quickGo, meStats, invite, linkInvite, pushState, pushOn, pushOff, consumeJoin, consumeMatch, resume, watch, start, check, profile, addFriends, challenge, friendOf, request, table, tablePanel, resumeTable, report, block, isBlocked, loadBlocks, blocks: () => blocked };
  let blocksFor = null;
  if (C()) C().on(() => {
    if (ready()) {
      const id = C().user().id; if (blocksFor !== id) { blocksFor = id; loadBlocks(); }
      startPolling(); consumeAdd(); consumeTable(); consumeJoin(); consumeMatch();
    } else { stopPolling(); fstate = null; lastFriendN = -1; blocked = null; blocksFor = null; askLogin(); consumeJoin(); }
  });
})();
