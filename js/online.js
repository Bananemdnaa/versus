// Versus: friends, invitations, online matches against friends and the rankings.
(function () {
  'use strict';
  const C = () => V.cloud, IC = () => V.ui.IC;
  const ONLINE = ['c4', 'ships', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'reversi', 'mill', 'kalaha', 'dots'];
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
  let pendT = null, pending = null, tpending = null, card = null, cardId = null, lastFriendN = -1;
  const toldReq = new Set();
  function startPolling() { if (pendT) return; pendT = setInterval(check, 5000); check(); }
  function stopPolling() { clearInterval(pendT); pendT = null; hideInvite(); pending = null; }
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
      if (JSON.stringify([p, tpending]) !== before && V.ui.view() === 'home' && V.ui.tab() === 'online') refreshTab();
      badge();
    } catch (e) { }
  }
  function badge() {
    const n = (pending ? (pending.requests || 0) + (pending.invites || []).length : 0) + (tpending ? (tpending.invites || []).length : 0);
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
      <div class="ic-tx"><small>${inv.table ? (inv.open ? `Offener Tisch · ${inv.players}/${inv.n}` : 'Einladung an den Tisch') : inv.open ? 'Sucht einen Gegner' : 'Herausforderung'}</small><b>${esc(inv.from)}</b><span>${esc(gname(inv.game))}${inv.table && !inv.open ? ` · ${inv.players}/${inv.n} Plätze` : ''}</span></div>
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
    if (!C() || !C().available()) return `<section class="page"><h1 class="title"><span>Online</span> spielen</h1><div class="acard"><p class="lead">Online-Spiele sind gleich da.</p></div></section>`;
    const loginCard = !C().user() ? `<div class="acard"><p class="lead">Mit einem Konto kannst du Freunde hinzufügen, sie zu Partien herausfordern und in die Rangliste kommen.</p>
      <button class="btn primary" data-tab="profile"><span>${IC().user}Anmelden oder Konto erstellen</span></button></div>` : '';
    return `<section class="online">
      <h1 class="title"><span>Online</span> spielen</h1>
      ${loginCard}
      <div class="ogrid${C().user() ? '' : ' solo'}">
        ${C().user() ? `<div class="ocol">
          <div id="oactive"></div>
          <div class="apanel fpanel"><div class="fhead"><h3>Freunde <small id="fcount"></small></h3><button class="btn primary sm" id="fadd"><span>${IC().plus}Hinzufügen</span></button></div>
            <div id="ofriends">${V.skel()}</div>
          </div></div>` : ''}
        <div class="ocol"><div class="apanel"><div class="rtop"><h3>Rangliste</h3><div class="oseg rper" id="oper">${[['week', 'Diese Woche'], ['all', 'Für immer']].map(([k, l]) => `<button data-p="${k}" class="${boardPeriod === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="rgames" id="obg">${[['', 'Alle Spiele'], ...ONLINE.map(id => [id, gname(id)])].map(([id, l]) => `<button data-g="${id}" class="${boardGame === id ? 'on' : ''}" title="${esc(l)}">${id && V.byId[id] ? `<span class="ic">${V.byId[id].icon}</span>` : `<span class="ic all">${IC().trophy}</span>`}<small>${esc(id ? l : 'Alle')}</small></button>`).join('')}</div>
          <div id="oboard">${V.skel()}</div></div></div>
      </div></section>`;
  }
  const onlineBody = () => { const b = document.querySelector('.hbody'); return b && V.ui.view() === 'home' && V.ui.tab() === 'online' ? b : null; };
  function refreshTab() { const b = onlineBody(); if (b) { loadFriends(b); fillActive(b); } }
  function wire(b) {
    if (!C() || !C().available()) return;
    b.querySelectorAll('#obg button').forEach(x => x.onclick = () => {
      boardGame = x.dataset.g; V.sfx.ui();
      b.querySelectorAll('#obg button').forEach(y => y.classList.toggle('on', y === x));
      loadBoard(b);
    });
    b.querySelectorAll('#oper button').forEach(x => x.onclick = () => {
      if (boardPeriod === x.dataset.p) return;
      boardPeriod = x.dataset.p; V.sfx.ui();
      b.querySelectorAll('#oper button').forEach(y => y.classList.toggle('on', y === x));
      loadBoard(b);
    });
    loadBoard(b);
    if (!C().user()) return;
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
  async function fetchFriends() {
    const d = await C().rpc('friends');
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
      (p.invites || []).map(i => `<div class="obanner inv"><div><small>Herausforderung</small><b>${esc(i.from)} · ${esc(gname(i.game))}</b></div>
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
    el.querySelectorAll('[data-join]').forEach(x => x.onclick = () => join(x.dataset.join));
    const go = el.querySelector('#ores_go'); if (go) go.onclick = () => resume(p.active.id);
    el.querySelectorAll('[data-acc]').forEach(x => x.onclick = async () => { try { start(await C().rpc('match_respond', { mid: x.dataset.acc, ok: true })); } catch (e) { V.ui.toast(e.message); check(); } });
    el.querySelectorAll('[data-dec]').forEach(x => x.onclick = () => { C().rpc('match_respond', { mid: x.dataset.dec, ok: false }).then(check, check); });
  }
  const fstatus = f => f.busy ? 'spielt gerade online' : f.online ? 'online' + (f.game && V.byId[f.game] ? ' · ' + esc(gname(f.game)) : '') : f.seen ? 'zuletzt ' + ago(f.seen) : 'offline';
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
      <button class="btn sm${f.online && !f.busy ? ' primary' : ''}" data-play="${esc(f.username)}"><span>${IC().play}Spielen</span></button></div>`).join('');
    const out = (d.outgoing || []).length ? `<div class="fout"><small>Angefragt</small>${d.outgoing.map(n => `<span class="fchip">${esc(n)}<button data-rm="${esc(n)}" aria-label="Anfrage an ${esc(n)} zurückziehen" title="Zurückziehen">${IC().x}</button></span>`).join('')}</div>` : '';
    const empty = `<div class="fempty">${IC().users}<b>Noch keine Freunde</b><p>Zeig deinen QR-Code, schick deinen Link oder such nach einem Namen. Danach könnt ihr euch mit einem Tipp herausfordern.</p>
      <div class="arow"><button class="btn primary sm" data-addt="code"><span>${IC().qr}Mein Code</span></button><button class="btn sm" data-addt="search"><span>Name suchen</span></button></div></div>`;
    el.innerHTML = (inc ? `<div class="freqs"><h4>Anfragen</h4>${inc}</div>` : '') + (rows ? `<div class="flist">${rows}</div>` : empty) + out;
    el.querySelectorAll('[data-yes]').forEach(x => x.onclick = e => { e.stopPropagation(); respond(x.dataset.yes, true); });
    el.querySelectorAll('[data-no]').forEach(x => x.onclick = e => { e.stopPropagation(); respond(x.dataset.no, false); });
    el.querySelectorAll('[data-play]').forEach(x => x.onclick = e => { e.stopPropagation(); V.sfx.ui(); challenge(x.dataset.play); });
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
    V.ui.toast({ sent: 'Anfrage an ' + name + ' gesendet', accepted: 'Du und ' + name + ' seid jetzt Freunde', friends: 'Ihr seid schon Freunde', pending: 'Schon angefragt' }[r] || r);
    if (r === 'accepted') V.sfx.goal(); else V.sfx.ui();
    changed();
    return r;
  }

  // ---------- adding friends: search by name, own code (QR and link), enter a code ----------
  let addTab = 'search', myCode = null, renewSure = false;
  const addLink = c => location.origin + location.pathname + '?add=' + c;
  const fmtCode = c => c.slice(0, 3) + ' ' + c.slice(3);
  function addFriends(t) {
    if (t) addTab = t;
    renewSure = false;
    const m = V.ui.openModal(`<div class="fadd">
      <div class="fadd-h"><h3>Freund hinzufügen</h3><button class="iconbtn" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <div class="oseg fseg" id="fseg">${[['search', 'Name suchen'], ['code', 'Mein Code'], ['enter', 'Code eingeben']].map(([k, l]) => `<button data-t="${k}" class="${addTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="fbody"></div></div>`, 'faddm');
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelectorAll('#fseg button').forEach(x => x.onclick = () => {
      if (addTab === x.dataset.t) return;
      addTab = x.dataset.t; V.sfx.ui();
      m.querySelectorAll('#fseg button').forEach(y => y.classList.toggle('on', y === x));
      draw();
    });
    function draw() {
      const body = m.querySelector('#fbody'); if (!body) return;
      if (addTab === 'search') return drawSearch(body);
      if (addTab === 'code') return drawCode(body);
      drawEnter(body);
    }
    draw();
  }
  function drawSearch(body) {
    body.innerHTML = `<input class="inp big" id="fq" placeholder="Name, z. B. blitzfuchs" autocapitalize="none" autocomplete="off" spellcheck="false" maxlength="16">
      <div id="fres" class="fres"><p class="fhint">Tipp die ersten Buchstaben. Die Liste erscheint beim Tippen.</p></div>`;
    const q = body.querySelector('#fq'), res = body.querySelector('#fres');
    let t = null, seq = 0;
    const run = async () => {
      const s = q.value.trim(), my = ++seq;
      if (s.length < 2) { res.innerHTML = `<p class="fhint">${s ? 'Noch ein Buchstabe …' : 'Tipp die ersten Buchstaben. Die Liste erscheint beim Tippen.'}</p>`; return; }
      let list;
      try { list = await C().rpc('player_search', { q: s }); } catch (e) { res.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
      if (my !== seq) return;
      if (!list.length) { res.innerHTML = `<p class="fhint">Niemand mit „${esc(s)}“ gefunden. Frag nach dem genauen Namen oder lass dir den Code geben.</p>`; return; }
      res.innerHTML = list.map(r => `<div class="frow" data-prof="${esc(r.username)}"><span class="fav">${initials(r.username)}</span><div class="ft"><b>${esc(r.username)}</b></div>
        ${r.state === 'friend' ? '<em class="rtag good">Freund</em>' : r.state === 'outgoing' ? '<em class="rtag">angefragt</em>'
          : `<button class="btn sm primary" data-req="${esc(r.username)}" data-st="${r.state || ''}"><span>${r.state === 'incoming' ? 'Annehmen' : IC().plus + 'Hinzufügen'}</span></button>`}</div>`).join('');
      res.querySelectorAll('[data-req]').forEach(x => x.onclick = async e => {
        e.stopPropagation();
        try { const r = await request(x.dataset.req); x.outerHTML = r === 'accepted' || r === 'friends' ? '<em class="rtag good">Freund</em>' : '<em class="rtag">angefragt</em>'; }
        catch (er) { V.ui.toast(er.message); }
      });
    };
    q.oninput = () => { clearTimeout(t); t = setTimeout(run, 250); };
    q.onkeydown = e => { if (e.key === 'Enter') { clearTimeout(t); run(); } };
    if (!V.coarse) setTimeout(() => q.focus(), 60);
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
        <div class="arow"><button class="btn primary sm" id="fshare"><span>${IC().share}Link teilen</span></button><button class="btn sm" id="fcopy"><span>Link kopieren</span></button></div>
        <button class="link fnew" id="fnew">Neuen Code erstellen</button></div></div>`;
    loadQR().then(() => { const q = body.querySelector('#fqr'); if (q) q.innerHTML = qrSvg(link); }, () => { const q = body.querySelector('#fqr'); if (q) q.innerHTML = '<p class="fhint">QR-Code geht gerade nicht. Teil den Link oder den Code.</p>'; });
    body.querySelector('#fshare').onclick = () => {
      V.sfx.ui();
      const text = 'Spiel mit mir Versus! Mit diesem Link sind wir sofort Freunde (Code ' + fmtCode(code) + '):';
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
  function drawEnter(body) {
    body.innerHTML = `<form class="fenter" id="fen"><p class="fhint">Gib den Code deines Freundes ein. Er steht bei ihm unter „Mein Code“.</p>
      <input class="inp code" id="fci" placeholder="ABC 123" maxlength="7" autocapitalize="characters" autocomplete="off" spellcheck="false" inputmode="text">
      <p class="aerr" id="fce"></p>
      <button class="btn primary big" type="submit"><span>Freund hinzufügen</span></button></form>`;
    const f = body.querySelector('#fen'), i = body.querySelector('#fci'), er = body.querySelector('#fce');
    i.oninput = () => { const v = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); i.value = v.length > 3 ? v.slice(0, 3) + ' ' + v.slice(3) : v; er.textContent = ''; };
    f.onsubmit = async e => {
      e.preventDefault();
      const c = i.value.replace(/\s/g, '');
      if (c.length !== 6) { er.textContent = 'Der Code hat 6 Zeichen.'; return; }
      f.classList.add('busy');
      try { const r = await C().rpc('friend_add_code', { code: c }); V.ui.closeModal(); welcomeFriend(r); }
      catch (x) { er.textContent = /friend_add_code|function/i.test(x.message) ? 'Freundescodes kommen nach dem nächsten Server-Update.' : x.message; V.sfx.bad(); }
      f.classList.remove('busy');
    };
    if (!V.coarse) setTimeout(() => i.focus(), 60);
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
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
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
    if (!ready()) return askLogin();
    if (busyScreen()) return setTimeout(consumeAdd, 1200);
    try { sessionStorage.removeItem('versus.add'); } catch (e) { }
    try { welcomeFriend(await C().rpc('friend_add_code', { code })); }
    catch (e) { V.ui.toast(/eigener/.test(e.message) ? 'Das ist dein eigener Freundes-Link' : e.message); }
  }
  function askLogin() {
    if (askedLogin || !pendingCode() || !C() || !C().available()) return;
    if (busyScreen()) return setTimeout(askLogin, 1200);
    askedLogin = true;
    const m = V.ui.openModal(`<div class="confirm"><h3>Freundes-Link</h3><p>Melde dich an oder erstell ein Konto. Danach seid ihr automatisch befreundet.</p>
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
    const head = (week ? `<p class="rweek"><b>Wochenwertung</b> · startet jeden Montag neu${left ? ` · noch <em>${left}</em>` : ''}</p>` : board.legacy ? '<p class="rweek">Wochenwertung kommt nach dem nächsten Server-Update.</p>' : '<p class="rweek"><b>Ewige Wertung</b> · alle Partien seit Beginn</p>') + lastW;
    const pct = r => (r.played ? Math.round(r.wins / r.played * 100) : 0);
    const mine = !C().user() ? '' : me
      ? `<div class="rmine"><span class="rp">#${me.pos}</span><div><small>Dein Platz in ${esc(scope)}${week ? ' diese Woche' : ''}</small><b>${me.wins} ${me.wins === 1 ? 'Sieg' : 'Siege'}</b><span>${me.played} Partien · ${me.losses || 0} verloren · ${me.draws || 0} remis · ${pct(me)} %</span></div></div>`
      : `<div class="rmine none"><div><small>Dein Platz in ${esc(scope)}</small><b>${week ? 'Diese Woche noch keine Partie' : 'Noch keine Partie'}</b><span>Spiel online gegen einen Freund oder über „Online“ im Spiel-Panel, dann stehst du hier.</span></div></div>`;
    if (!top.length) { el.innerHTML = head + mine + `<div class="empty small">${IC().trophy}<b>Noch leer</b><p>${week ? 'Diese Woche hat noch niemand' : 'Hier hat noch niemand'} eine Online-Partie in ${esc(scope)} gewonnen.${week ? ' Deine Chance auf Platz 1!' : ''}</p></div>`; return; }
    const pod = top.slice(0, 3);
    const order = [pod[1], pod[0], pod[2]].filter(Boolean);
    const podium = `<div class="podium">${order.map(r => `<div class="pod p${Math.min(r.pos, 3)}${r.username === myName ? ' me' : ''}">
        <span class="medal">${r.pos}</span><b class="plink" data-prof="${esc(r.username)}">${esc(r.username)}</b><em>${r.wins}</em><small>${r.wins === 1 ? 'Sieg' : 'Siege'} · ${pct(r)} %</small><i class="step"></i></div>`).join('')}</div>`;
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
  async function picker(el, g, opts) {
    if (!el) return;
    if (!ready()) { el.innerHTML = `<p class="hint">Für Online-Partien brauchst du ein Konto.</p><button class="btn sm" data-tab-go="profile"><span>${IC().user}Anmelden</span></button>`; el.querySelector('[data-tab-go]').onclick = () => V.ui.home('profile'); return; }
    el.innerHTML = V.skel(3);
    let d;
    try { d = await C().rpc('friends'); } catch (e) { el.innerHTML = `<p class="aerr">${esc(e.message)}</p>`; return; }
    const fr = d.friends || [];
    if (!fr.length) { el.innerHTML = `<p class="hint">Noch keine Freunde. Zeig deinen QR-Code oder such nach einem Namen.</p><button class="btn sm primary" id="pgo"><span>${IC().plus}Freund hinzufügen</span></button>`; el.querySelector('#pgo').onclick = () => { V.sfx.ui(); addFriends(); }; return; }
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
    const act = p.me ? `<button class="btn" id="pcode"><span>${IC().qr}Mein Freundescode</span></button>`
      : p.friend === 'friend' ? `<button class="btn primary" id="pch"><span>${IC().play}Herausfordern</span></button><button class="btn ghost" id="prm"><span>Freund entfernen</span></button>`
      : p.friend === 'outgoing' ? `<button class="btn" disabled><span>Anfrage gesendet</span></button><button class="btn ghost" id="pwd"><span>Zurückziehen</span></button>`
      : p.friend === 'incoming' ? `<button class="btn primary" id="pyes"><span>Anfrage annehmen</span></button><button class="btn ghost" id="pno"><span>Ablehnen</span></button>`
      : `<button class="btn primary" id="padd"><span>${IC().plus}Als Freund hinzufügen</span></button>`;
    m.innerHTML = `<div class="prof">
      <div class="phead"><span class="abig">${esc(p.username.slice(0, 2).toUpperCase())}</span>
        <div><b>${esc(p.username)}</b>${p.dev ? '<em class="rtag dev">Dev</em>' : ''}<small>${status} · dabei seit ${new Date(p.since).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</small></div>
        <button class="iconbtn" id="pc" aria-label="Schließen">${IC().x}</button></div>
      <div class="kpis pk">
        <div class="kpi"><b>${t.wins || 0}</b><span>Siege</span></div>
        <div class="kpi"><b>${t.losses || 0}</b><span>Niederlagen</span></div>
        <div class="kpi"><b>${pct(t.wins, t.played)} %</b><span>Siegquote</span></div>
        <div class="kpi"><b>${p.week ? '#' + p.week.pos : '–'}</b><span>Diese Woche</span></div>
      </div>
      ${p.streak >= 2 ? `<div class="pstreak">${IC().bolt}<b>${p.streak} Siege in Folge</b></div>` : ''}
      ${vs}
      ${games ? `<h4>Spiele</h4><div class="pgames">${games}</div>` : ''}
      <h4>Letzte Partien</h4>
      <div class="precs">${recent || '<p class="muted">Noch keine Online-Partien.</p>'}</div>
      ${act ? `<div class="actions">${act}</div>` : ''}
    </div>`;
    m.querySelector('#pc').onclick = V.ui.closeModal;
    m.querySelectorAll('[data-prof]').forEach(x => x.onclick = () => { V.sfx.ui(); profile(x.dataset.prof); });
    const on = (id, fn) => { const x = m.querySelector('#' + id); if (x) x.onclick = () => fn(x); };
    const again = () => { if (document.body.contains(m)) profile(p.username); };
    on('padd', () => request(p.username).then(again, e => V.ui.toast(e.message)));
    on('pyes', () => respond(p.username, true).then(again));
    on('pno', () => respond(p.username, false).then(again));
    on('pwd', () => C().rpc('friend_remove', { name: p.username }).then(() => { V.ui.toast('Anfrage zurückgezogen'); changed(); again(); }, e => V.ui.toast(e.message)));
    on('pch', () => { V.sfx.ui(); challenge(p.username); });
    on('pcode', () => { V.sfx.ui(); addFriends('code'); });
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
  const TABLE = ['ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf'];
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
  async function table(g, opts, lvl) {
    if (!ready()) { V.ui.toast('Dafür brauchst du ein Konto'); return V.ui.home('profile'); }
    try { lobby(await C().rpc('party_create', { gm: g.id, op: opts || optsFor(g), n: +(opts && opts.n) || 4, lvl: lvl ?? 1, pub: false })); }
    catch (e) { V.ui.toast(noServer(e)); V.sfx.bad(); }
  }
  async function joinTable(id, code) {
    if (!ready()) { V.ui.toast('Dafür brauchst du ein Konto'); return V.ui.home('profile'); }
    try { const st = await C().rpc('party_join', { tid: id || null, cd: code || null }); if (st.status === 'live') return startTable(st); lobby(st); }
    catch (e) { V.ui.toast(noServer(e)); V.sfx.bad(); check(); }
  }
  function stopLobby() { clearTimeout(lobbyT); lobbyT = null; lobbyId = null; }
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
      <div id="lbhost"></div>
      <div class="actions" id="lba"></div></div>`, 'lobm', () => {
      // closing the lobby means leaving the table (the host closes it)
      if (!starting) C().rpc('party_leave', { tid: st.id }).catch(() => { });
      stopLobby();
    });
    m.querySelector('#lbx').onclick = V.ui.closeModal;
    m.querySelector('#lbsh').onclick = () => {
      V.sfx.ui();
      const link = tableLink(cur.code), text = `Komm an meinen ${g.name}-Tisch in Versus (Code ${cur.code}):`;
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
        try { await C().rpc('party_invite', { tid: st.id, name: b.dataset.tinv }); b.disabled = true; b.querySelector('span').textContent = 'Eingeladen'; V.sfx.ui(); }
        catch (e) { V.ui.toast(e.message); }
      });
    }
    const poll = async () => {
      if (lobbyId !== st.id) return;
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
  }
  // game panel, mode "Online" for table games: open a table, join an open one or enter a code
  function tablePanel(el, g, opts, lvl) {
    if (!el) return;
    if (!ready()) { el.innerHTML = `<p class="hint">Für Online-Tische brauchst du ein Konto.</p><button class="btn sm" id="plog"><span>${IC().user}Anmelden</span></button>`; el.querySelector('#plog').onclick = () => V.ui.home('profile'); return; }
    const open = ((tpending && tpending.open) || []).filter(o => o.game === g.id);
    el.innerHTML = `<p class="hint">Eröffne einen Tisch für ${+(opts && opts.n) || 4} Spieler und lade Freunde ein. Freie Plätze spielt die KI.</p>
      ${open.map(o => `<div class="fline on"><span class="adot"></span><b>${esc(o.from)}</b><small>Tisch · ${o.players}/${o.n}</small><button class="btn sm primary" data-tjoin="${o.id}"><span>Mitspielen</span></button></div>`).join('')}
      <button class="btn primary big" id="topen"><span>${IC().users}Tisch eröffnen</span></button>
      <form class="tcode" id="tcf"><input class="inp" id="tci" placeholder="Tischcode" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn sm" type="submit"><span>Beitreten</span></button></form>`;
    el.querySelector('#topen').onclick = () => { V.sfx.ui(); table(g, opts, lvl); };
    el.querySelectorAll('[data-tjoin]').forEach(b => b.onclick = () => joinTable(b.dataset.tjoin));
    const i = el.querySelector('#tci');
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

  V.online = { tab, wire, picker, openPanel, seek, invite, resume, watch, start, check, profile, addFriends, challenge, friendOf, request, table, tablePanel, resumeTable };
  if (C()) C().on(() => { if (ready()) { startPolling(); consumeAdd(); consumeTable(); } else { stopPolling(); fstate = null; lastFriendN = -1; askLogin(); } });
})();
