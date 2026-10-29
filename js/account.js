// Versus: account tab (login, register, profile) and the admin panel.
(function () {
  'use strict';
  const C = () => V.cloud, IC = () => V.ui.IC;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = t => t ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const when = t => t ? new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
  function ago(t) {
    if (!t) return 'nie';
    const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
    if (s < 90) return 'gerade eben';
    if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
    if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
    return `vor ${Math.round(s / 86400)} Tagen`;
  }
  const gameName = id => (id && V.byId[id] ? V.byId[id].name : id ? id : 'Menü');
  const ROLE = { owner: 'Owner', admin: 'Admin' };

  // ---------- account tab ----------
  let mode = 'login', err = '', busyForm = false, openBox = null;
  function tab() {
    const c = C();
    if (!c || !c.available()) return `<section class="page acctp"><h1 class="title"><span>Dein</span> Konto</h1>
      <div class="acard"><p class="lead">Online-Konten sind gleich da. Der Server wird gerade eingerichtet.</p></div></section>`;
    const u = c.user();
    if (u && u.anon) return guestTab(u);
    if (!u && mode === 'recover') return `<section class="page acctp"><h1 class="title"><span>Passwort</span> vergessen</h1>
      <div class="acard">
        <p class="lead">Mit deinem Wiederherstellungscode setzt du ein neues Passwort. Den Code hast du beim Erstellen des Kontos bekommen (oder später unter Konto).</p>
        <form class="aform" id="rform" autocomplete="on">
          <label for="r_n">Benutzername</label>
          <input class="inp" id="r_n" name="username" autocomplete="username" maxlength="16" autocapitalize="none" spellcheck="false">
          <label for="r_c">Wiederherstellungscode</label>
          <input class="inp code" id="r_c" maxlength="14" placeholder="ABCD-EFGH-JKLM" autocapitalize="characters" autocomplete="off" spellcheck="false">
          <label for="r_p">Neues Passwort</label>
          <input class="inp" id="r_p" type="password" autocomplete="new-password" placeholder="mindestens 6 Zeichen">
          <p class="aerr" id="rerr" role="alert"></p>
          <button class="btn primary big" type="submit"><span>Passwort neu setzen</span></button>
        </form>
        <p class="fine">Kein Code? Dann lässt sich das Konto leider nicht zurückholen, weil Versus keine E-Mail-Adressen speichert. Erstell einfach ein neues.</p>
        <button class="btn ghost sm" id="r_back"><span>${IC().back}Zurück zum Login</span></button>
      </div></section>`;
    if (!u) return `<section class="page acctp"><h1 class="title"><span>Dein</span> Konto</h1>
      <div class="acard">
        <p class="lead">Mit einem Konto liegt deine Bilanz sicher auf dem Server und ist auf jedem Gerät dabei. Freunde und Online-Duelle bauen darauf auf.</p>
        <div class="gp-mode amode" id="amode"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">${IC().user}<span>Einloggen</span></button><button data-m="new" class="${mode === 'new' ? 'on' : ''}">${IC().spark}<span>Konto erstellen</span></button></div>
        <form class="aform" id="aform" autocomplete="on">
          <label for="a_name">Benutzername</label>
          <input class="inp" id="a_name" name="username" autocomplete="username" maxlength="16" placeholder="z. B. blitzfuchs" autocapitalize="none" spellcheck="false">
          <label for="a_pw">Passwort</label>
          <input class="inp" id="a_pw" name="password" type="password" autocomplete="${mode === 'new' ? 'new-password' : 'current-password'}" placeholder="mindestens 6 Zeichen">
          ${mode === 'new' ? '<label for="a_pw2">Passwort wiederholen</label><input class="inp" id="a_pw2" type="password" autocomplete="new-password">' : ''}
          <p class="aerr" id="aerr" role="alert">${esc(err)}</p>
          <button class="btn primary big" type="submit"><span>${mode === 'new' ? 'Konto erstellen' : 'Einloggen'}</span></button>
          ${mode === 'new' ? '<p class="fine">Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -. Es gibt keine E-Mail. Nach dem Erstellen bekommst du einen Wiederherstellungscode für ein vergessenes Passwort.</p><p class="fine">Konten ab 14 Jahren, jünger nur mit Erlaubnis der Eltern. Was gespeichert wird: <a href="rechtliches.html" target="_blank">Datenschutz</a>.</p>' : '<button class="link aforgot" type="button" id="a_forgot">Passwort vergessen?</button>'}
        </form>
        ${guestNote()}
      </div></section>`;
    const info = c.info() || {}, st = c.state(), role = c.role();
    const sync = st.status === 'sync' ? ['sync', 'Wird abgeglichen …'] : st.status === 'error' ? ['bad', 'Abgleich fehlgeschlagen: ' + esc(st.error)] : ['ok', 'Gespeichert ' + ago(st.last)];
    const next = info.next_rename && new Date(info.next_rename) > new Date() ? info.next_rename : null;
    return `<section class="page acctp">
      <h1 class="title"><span>Dein</span> Konto</h1>
      <div class="acard me">
        <div class="ahead"><span class="abig">${esc(u.username.slice(0, 2).toUpperCase())}</span>
          <div><b>${esc(u.username)}</b>${role ? `<em class="rtag ${role}">${ROLE[role]}</em>` : ''}${info.dev ? '<em class="rtag dev">Dev</em>' : ''}<small>Dabei seit ${day(info.joined)}</small></div></div>
        <div class="sync ${sync[0]}"><i></i><span>${sync[1]}</span><button class="btn ghost sm" id="a_sync"><span>${IC().redo}Abgleichen</span></button></div>
        <div class="arow">
          ${role ? `<button class="btn primary" id="a_admin"><span>${IC().shield}Admin-Panel</span></button>` : ''}
          <button class="btn" id="a_prof"><span>${IC().trophy}Profil und Verlauf</span></button>
          <button class="btn" id="a_out"><span>Abmelden</span></button>
        </div>
      </div>
      <div class="optlist small">
        <button class="opt" data-box="rename">${IC().user}<span><b>Benutzernamen ändern</b><small>${next ? 'Wieder möglich ab ' + day(next) : 'Einmal pro Woche möglich'}</small></span></button>
        ${openBox === 'rename' ? `<form class="abox" id="f_rename"><input class="inp" id="r_name" maxlength="16" placeholder="Neuer Name" autocapitalize="none" spellcheck="false" value="${esc(u.username)}"><button class="btn sm" type="submit"><span>Ändern</span></button><p class="aerr" id="r_err"></p></form>` : ''}
        <button class="opt" id="a_rec">${IC().shield}<span><b>Wiederherstellungscode</b><small>${info.recovery ? 'Du hast einen. Neu erstellen macht den alten ungültig.' : '<b class="bad">Noch keiner.</b> Ohne Code ist ein vergessenes Passwort weg.'}</small></span></button>
        <button class="opt" id="a_inv">${IC().share}<span><b>Freunde einladen</b><small id="a_invs">Wer über deinen Link ein Konto erstellt, ist sofort dein Freund</small></span></button>
        <button class="opt" data-box="blocks">${IC().eye}<span><b>Blockierte Spieler</b><small>${blockSub()}</small></span></button>
        ${openBox === 'blocks' ? `<div class="abox" id="blist">${blockList()}</div>` : ''}
        <a class="opt" href="rechtliches.html">${IC().shield}<span><b>Datenschutz und Impressum</b><small>Welche Daten Versus speichert und wer dahintersteht</small></span></a>
        <button class="opt danger" data-box="delete">${IC().x}<span><b>Konto löschen</b><small>Löscht dein Konto und alle Daten auf dem Server</small></span></button>
        ${openBox === 'delete' ? `<form class="abox" id="f_delete"><input class="inp" id="d_pw" type="password" autocomplete="current-password" placeholder="Passwort zur Bestätigung"><button class="btn sm danger" type="submit"><span>Endgültig löschen</span></button><p class="aerr" id="d_err"></p></form>` : ''}
      </div>
    </section>`;
  }
  function guestNote() {
    const s = V.store.get('stats', {});
    const n = Object.values(s).reduce((a, g) => a + (g.ai || []).reduce((x, r) => x + (r.w || 0) + (r.l || 0) + (r.d || 0), 0) + ((g.local || {}).a || 0) + ((g.local || {}).b || 0) + ((g.local || {}).d || 0), 0);
    return n ? `<p class="fine">Deine ${n} Partien aus diesem Browser wandern beim Einloggen mit ins Konto.</p>` : '';
  }
  // a guest session (from a quick match): keep it as a real account, or leave it
  function guestTab(u) {
    return `<section class="page acctp">
      <h1 class="title"><span>Dein</span> Konto</h1>
      <div class="acard me">
        <div class="ahead"><span class="abig">${IC().user}</span>
          <div><b>${esc(u.username)}</b><em class="rtag muted">Gast</em><small>Gilt nur in diesem Browser</small></div></div>
        <p class="lead">Du spielst als Gast. Wähl einen Namen und ein Passwort, dann wird daraus ein richtiges Konto: alle ${V.games.length} Spiele, Freunde, Rangliste und deine Bilanz auf jedem Gerät.</p>
        <form class="aform" id="gform" autocomplete="on">
          <label for="g_name">Benutzername</label>
          <input class="inp" id="g_name" name="username" autocomplete="username" maxlength="16" placeholder="z. B. blitzfuchs" autocapitalize="none" spellcheck="false">
          <label for="g_pw">Passwort</label>
          <input class="inp" id="g_pw" type="password" autocomplete="new-password" placeholder="mindestens 6 Zeichen">
          <label for="g_pw2">Passwort wiederholen</label>
          <input class="inp" id="g_pw2" type="password" autocomplete="new-password">
          <p class="aerr" id="gerr" role="alert"></p>
          <button class="btn primary big" type="submit"><span>${IC().spark}Konto behalten</span></button>
        </form>
      </div>
      <div class="optlist small">
        <button class="opt" id="g_login">${IC().user}<span><b>Ich habe schon ein Konto</b><small>Beendet die Gast-Sitzung und öffnet den Login</small></span></button>
        <button class="opt danger" id="g_out">${IC().x}<span><b>${sureOut ? 'Sicher? Der Gast ist dann weg. Nochmal tippen' : 'Gast-Sitzung beenden'}</b><small>Name und Online-Partien des Gasts sind danach weg</small></span></button>
      </div></section>`;
  }
  let sureOut = false;
  const blockSub = () => { const b = V.online && V.online.blocks(); return b && b.size ? `${b.size} blockiert` : 'Niemand blockiert. Geht im Profil eines Spielers.'; };
  function blockList() {
    const b = V.online && V.online.blocks();
    if (!b) return V.skel(2);
    if (!b.size) return '<p class="fhint">Niemand blockiert. Blockierte Spieler können dich nicht einladen, nicht anfragen und landen nie im Schnellen Spiel bei dir.</p>';
    return [...b].map(n => `<div class="fline"><b>${esc(n)}</b><button class="btn ghost sm" data-unb="${esc(n)}"><span>Freigeben</span></button></div>`).join('');
  }
  // the recovery code is shown exactly once; afterwards only its hash is on the server
  async function showRecovery(first) {
    let code;
    try { code = await C().newRecovery(); }
    catch (e) { if (!first) V.ui.toast(/recovery_new|function/i.test(e.message) ? 'Wiederherstellungscodes kommen nach dem nächsten Server-Update.' : e.message); return; }
    const m = V.ui.openModal(`<div class="confirm recm"><h3>Dein Wiederherstellungscode</h3>
      <p>Damit setzt du ein neues Passwort, falls du es vergisst. Er wird nur dieses eine Mal angezeigt. Mach am besten einen Screenshot oder schreib ihn auf.</p>
      <div class="rcode">${esc(code)}</div>
      <div class="actions"><button class="btn primary" id="rcopy"><span>Kopieren</span></button><button class="btn ghost" id="rok"><span>Hab ich gespeichert</span></button></div></div>`, 'recmb');
    m.querySelector('#rok').onclick = () => { V.ui.closeModal(); V.ui.home('profile'); };
    m.querySelector('#rcopy').onclick = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => V.ui.toast('Code kopiert'), () => { });
    };
  }
  function wire(b) {
    const c = C(); if (!c || !c.available()) return;
    addEyes(b);
    const am = b.querySelector('#amode');
    if (am) am.querySelectorAll('button').forEach(x => x.onclick = () => { mode = x.dataset.m; err = ''; V.sfx.ui(); V.ui.home('profile'); });
    const f = b.querySelector('#aform');
    if (f) {
      const name = b.querySelector('#a_name'), pw = b.querySelector('#a_pw');
      const keep = sessionStorage.getItem('versus.aname'); if (keep && !name.value) name.value = keep;
      name.oninput = () => { try { sessionStorage.setItem('versus.aname', name.value); } catch (e) { } };
      f.onsubmit = async e => {
        e.preventDefault(); if (busyForm) return;
        const errEl = b.querySelector('#aerr');
        if (mode === 'new' && pw.value !== b.querySelector('#a_pw2').value) { errEl.textContent = 'Die Passwörter sind nicht gleich.'; return; }
        busyForm = true; f.classList.add('busy'); errEl.textContent = '';
        try {
          const made = mode === 'new';
          if (made) await c.signUp(name.value, pw.value); else await c.signIn(name.value, pw.value);
          err = ''; V.sfx.goal(); V.ui.toast(made ? 'Konto erstellt' : 'Eingeloggt');
          V.ui.home('profile');
          if (made) showRecovery(true);
        } catch (x) { errEl.textContent = x.message; V.sfx.bad(); V.fx.shake(f, true); }
        busyForm = false; f.classList.remove('busy');
      };
      if (!V.coarse) setTimeout(() => name.focus(), 50);
    }
    const q = s => b.querySelector(s);
    if (q('#a_forgot')) q('#a_forgot').onclick = () => { mode = 'recover'; V.sfx.ui(); V.ui.home('profile'); };
    if (q('#r_back')) q('#r_back').onclick = () => { mode = 'login'; V.sfx.ui(); V.ui.home('profile'); };
    const rf = q('#rform');
    if (rf) {
      const keep = sessionStorage.getItem('versus.aname'); if (keep) q('#r_n').value = keep;
      rf.onsubmit = async e => {
        e.preventDefault(); if (busyForm) return;
        busyForm = true; rf.classList.add('busy'); q('#rerr').textContent = '';
        try { await c.recover(q('#r_n').value, q('#r_c').value, q('#r_p').value); mode = 'login'; V.sfx.goal(); V.ui.toast('Neues Passwort gesetzt'); V.ui.home('profile'); showRecovery(true); }
        catch (x) { q('#rerr').textContent = /recovery_reset|function/i.test(x.message) ? 'Das kommt nach dem nächsten Server-Update.' : x.message; V.sfx.bad(); V.fx.shake(rf, true); }
        busyForm = false; rf.classList.remove('busy');
      };
    }
    // guest: keep the account, switch to an existing one, or leave
    const gf = q('#gform');
    if (gf) gf.onsubmit = async e => {
      e.preventDefault(); if (busyForm) return;
      const er = q('#gerr');
      if (q('#g_pw').value !== q('#g_pw2').value) { er.textContent = 'Die Passwörter sind nicht gleich.'; return; }
      busyForm = true; gf.classList.add('busy'); er.textContent = '';
      try { const nn = await c.claimGuest(q('#g_name').value, q('#g_pw').value); V.sfx.win(); V.fx.confetti(); V.ui.toast('Willkommen, ' + nn); V.ui.home('profile'); showRecovery(true); }
      catch (x) { er.textContent = /guest_claim|function/i.test(x.message) ? 'Das kommt nach dem nächsten Server-Update.' : x.message; V.sfx.bad(); V.fx.shake(gf, true); }
      busyForm = false; gf.classList.remove('busy');
    };
    if (q('#g_login')) q('#g_login').onclick = async () => { V.sfx.ui(); mode = 'login'; await c.signOut(); V.ui.home('profile'); };
    if (q('#g_out')) q('#g_out').onclick = async () => {
      if (!sureOut) { sureOut = true; return V.ui.home('profile'); }
      sureOut = false; V.sfx.ui();
      try { await c.deleteAccount(''); } catch (x) { await c.signOut(); }
      V.ui.toast('Gast-Sitzung beendet'); V.ui.home('profile');
    };
    if (q('#a_rec')) q('#a_rec').onclick = () => { V.sfx.ui(); showRecovery(false); };
    // invite: the friend link (QR, share); the count is the inviter badge in the profile
    if (q('#a_inv')) {
      q('#a_inv').onclick = () => { V.sfx.ui(); V.online.addFriends('code'); };
      c.rpc('player_badges', { name: c.user().username }).then(r => {
        const s = document.getElementById('a_invs');
        if (s && r && r.invited) s.textContent = `Du hast schon ${r.invited} Spieler eingeladen · Werber-Abzeichen im Profil`;
      }, () => { });
    }
    b.querySelectorAll('[data-unb]').forEach(x => x.onclick = async () => { if (await V.online.block(x.dataset.unb, false)) V.ui.home('profile'); });
    if (openBox === 'blocks' && V.online && !V.online.blocks()) V.online.loadBlocks().then(() => { const l = document.getElementById('blist'); if (l) { l.innerHTML = blockList(); l.querySelectorAll('[data-unb]').forEach(x => x.onclick = async () => { if (await V.online.block(x.dataset.unb, false)) V.ui.home('profile'); }); } });
    if (q('#a_sync')) q('#a_sync').onclick = () => { V.sfx.ui(); c.syncNow(); };
    if (q('#a_out')) q('#a_out').onclick = async () => { V.sfx.ui(); await c.signOut(); V.ui.toast('Abgemeldet'); V.ui.home('profile'); };
    if (q('#a_admin')) q('#a_admin').onclick = () => { V.sfx.ui(); admin(); };
    if (q('#a_prof')) q('#a_prof').onclick = () => { V.sfx.ui(); V.online.profile(c.user().username); };
    b.querySelectorAll('[data-box]').forEach(x => x.onclick = () => { openBox = openBox === x.dataset.box ? null : x.dataset.box; V.sfx.ui(); V.ui.home('profile'); });
    if (q('#f_rename')) q('#f_rename').onsubmit = async e => {
      e.preventDefault();
      try { const nn = await c.rename(q('#r_name').value); openBox = null; V.ui.toast('Du heißt jetzt ' + nn); V.ui.home('profile'); }
      catch (x) { q('#r_err').textContent = x.message; }
    };
    if (q('#f_delete')) q('#f_delete').onsubmit = async e => {
      e.preventDefault();
      try { await c.deleteAccount(q('#d_pw').value); openBox = null; V.ui.toast('Konto gelöscht'); V.ui.home('profile'); }
      catch (x) { q('#d_err').textContent = x.message; }
    };
  }

  // eye button in every password field: show or hide what you typed
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function addEyes(root) {
    root.querySelectorAll('input[type="password"]').forEach(inp => {
      if (inp.parentElement.classList.contains('pw')) return;
      const w = document.createElement('div'); w.className = 'pw';
      inp.replaceWith(w); w.appendChild(inp);
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'eye'; btn.innerHTML = EYE;
      btn.setAttribute('aria-label', 'Passwort anzeigen');
      btn.onclick = () => {
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.innerHTML = show ? EYE_OFF : EYE;
        btn.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
        inp.focus({ preventScroll: true });
      };
      w.appendChild(btn);
    });
  }

  // ---------- admin panel ----------
  let aTab = 'overview', mFilter = 'live', mQuery = '', matches = null, stats = null, online = null, players = null, logs = null, query = '', aErr = '', box = null, sure = null, liveT = null, busy = false, reports = null, rFilter = 'open';
  function admin(t) {
    if (t) aTab = t;
    const v = V.ui.show('admin', `<div class="view admin">
      <div class="sbar"><button class="iconbtn" id="bk" aria-label="Zurück">${IC().back}</button><span class="crumb">Admin-Panel</span>
        ${C().role() ? `<em class="rtag ${C().role()}">${ROLE[C().role()]}</em>` : ''}</div>
      <div class="chips" id="atabs">${[['overview', 'Übersicht'], ['matches', 'Partien'], ['players', 'Spieler'], ['reports', 'Meldungen'], ['log', 'Protokoll']].map(([k, l]) => `<button data-t="${k}" class="${aTab === k ? 'on' : ''}">${l}${k === 'reports' && reports && reports.open ? ` <small class="nb">${reports.open}</small>` : ''}</button>`).join('')}</div>
      <div id="abody" class="abody"></div></div>`);
    v.querySelector('#bk').onclick = () => { stopLive(); V.ui.home('profile'); };
    v.querySelectorAll('#atabs button').forEach(x => x.onclick = () => { aTab = x.dataset.t; aErr = ''; box = null; sure = null; V.sfx.ui(); v.querySelectorAll('#atabs button').forEach(y => y.classList.toggle('on', y === x)); draw(); load(); });
    draw(); load();
    // number of open reports on the tab, whichever tab is open
    if (aTab !== 'reports') C().rpc('admin_reports', { st: 'open', lim: 1 }).then(r => {
      const b = v.querySelector('#atabs [data-t=reports]');
      if (b && r && r.open && !b.querySelector('.nb')) b.insertAdjacentHTML('beforeend', ` <small class="nb">${r.open}</small>`);
    }, () => { });
    stopLive();
    liveT = setInterval(() => {
      if (V.ui.view() !== 'admin') return stopLive();
      if (aTab === 'overview') C().rpc('admin_online').then(o => { online = o || []; draw(); }, () => { });
      if (aTab === 'matches' && mFilter === 'live') C().rpc('admin_matches', { st: 'live', q: mQuery, lim: 60 }).then(m => { matches = m || []; draw(); }, () => { });
    }, 20000);
  }
  function stopLive() { clearInterval(liveT); liveT = null; }
  async function load() {
    try {
      if (aTab === 'overview') { const [s, o] = await Promise.all([C().rpc('admin_stats'), C().rpc('admin_online')]); stats = s; online = o || []; }
      if (aTab === 'players') players = await C().rpc('admin_players', { q: query, lim: 40 });
      if (aTab === 'log') logs = await C().rpc('admin_log_list', { lim: 80 });
      if (aTab === 'reports') reports = await C().rpc('admin_reports', { st: rFilter, lim: 80 });
      if (aTab === 'matches') matches = await C().rpc('admin_matches', { st: mFilter, q: mQuery, lim: 80 });
      aErr = '';
    } catch (e) { aErr = e.message; }
    draw();
  }
  async function act(name, args, ok) {
    if (busy) return; busy = true; draw();
    try { await C().rpc(name, args); V.ui.toast(ok); box = null; sure = null; await load(); }
    catch (e) { aErr = e.message; V.sfx.bad(); }
    busy = false; draw();
  }
  function draw(force) {
    const host = document.getElementById('abody'); if (!host) return;
    const keep = document.activeElement && host.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (keep && !force) return;
    host.innerHTML = (aErr ? `<p class="aerr big">${esc(aErr)}</p>` : '') + (aTab === 'overview' ? overview() : aTab === 'matches' ? matchList() : aTab === 'players' ? playerList() : aTab === 'reports' ? reportList() : logList());
    wireAdmin(host);
  }
  function overview() {
    if (!stats) return V.skel();
    const S = stats;
    const tile = (l, v, s) => `<div class="kpi"><b>${v}</b><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>`;
    const games = Object.entries(S.games || {}).sort((a, b) => b[1] - a[1]);
    const max = games.length ? games[0][1] : 1;
    return `<div class="kpis">${tile('Spieler', S.players, '+' + S.new7 + ' in 7 Tagen')}${tile('Online', S.online)}${tile('Aktiv heute', S.active1, S.active7 + ' in 7 Tagen')}${tile('Partien', S.matches, (S.online_matches || 0) + ' online')}${tile('Live', S.live_matches || 0, (S.friendships || 0) + ' Freundschaften')}</div>
      <div class="agrid">
        <div class="apanel"><h3>Gerade online <small>${(online || []).length}</small></h3>
          ${(online || []).length ? (online || []).map(o => `<div class="aline"><button class="link" data-p="${esc(o.username)}">${esc(o.username)}</button><span>${esc(gameName(o.game))}</span><small>${ago(o.seen)}</small></div>`).join('') : '<p class="muted">Gerade niemand.</p>'}
          <p class="fine">Aktualisiert sich alle 20 Sekunden.</p></div>
        <div class="apanel"><h3>Beliebte Spiele</h3>
          ${games.length ? games.map(([id, n]) => `<div class="abar"><span>${esc(gameName(id))}</span><i style="--w:${Math.round(n / max * 100)}%"></i><b>${n}</b></div>`).join('') : '<p class="muted">Noch keine Partien.</p>'}</div>
        <div class="apanel"><h3>Neue Spieler</h3>
          ${(S.recent || []).map(p => `<div class="aline"><button class="link" data-p="${esc(p.username)}">${esc(p.username)}</button><small>${day(p.joined)}</small></div>`).join('') || '<p class="muted">Noch niemand.</p>'}</div>
        <div class="apanel"><h3>Team</h3>
          ${(S.team || []).map(t => `<div class="aline"><button class="link" data-p="${esc(t.username)}">${esc(t.username)}</button><em class="rtag ${t.role}">${ROLE[t.role]}</em></div>`).join('')}
          <p class="fine">${S.banned} gesperrt · ${S.hidden} ausgeblendet</p></div>
      </div>
      <div class="arow"><button class="btn ghost sm" id="reload"><span>${IC().redo}Neu laden</span></button></div>`;
  }
  function playerList() {
    const owner = C().role() === 'owner';
    const cards = (players || []).map(p => {
      const n = esc(p.username), st = p.stats || {};
      const canEdit = owner || !p.role || p.me;
      const tags = [p.role ? `<em class="rtag ${p.role}">${ROLE[p.role]}</em>` : '', p.dev ? '<em class="rtag dev">Dev</em>' : '',
        p.hidden ? '<em class="rtag muted">Ausgeblendet</em>' : '', p.banned_until ? `<em class="rtag bad">Gesperrt bis ${day(p.banned_until)}</em>` : ''].join('');
      const online = p.seen && Date.now() - new Date(p.seen).getTime() < 120000;
      const btn = (a, l, cls = '') => `<button class="btn ghost sm ${cls}" data-a="${a}" data-n="${n}"${busy ? ' disabled' : ''}><span>${l}</span></button>`;
      const confirmBtn = (key, l, l2, a) => sure === key + n ? btn(a, l2, 'danger') : `<button class="btn ghost sm" data-sure="${key + n}"><span>${l}</span></button>`;
      let boxHtml = '';
      if (box === 'ban:' + n) boxHtml = `<div class="abox"><input class="inp" id="ban_r" maxlength="200" placeholder="Grund (optional, nur für Admins sichtbar)">
        <div class="arow">${[[1, '1 Tag'], [7, '7 Tage'], [30, '30 Tage'], [0, 'Dauerhaft']].map(([d, l]) => `<button class="btn sm danger" data-ban="${d}" data-n="${n}"><span>${l}</span></button>`).join('')}</div></div>`;
      if (box === 'note:' + n) boxHtml = `<div class="abox"><textarea class="inp" id="note_t" maxlength="500" rows="3" placeholder="Private Notiz für das Team">${esc(p.note || '')}</textarea><button class="btn sm" data-a="note_save" data-n="${n}"><span>Speichern</span></button></div>`;
      if (box === 'ren:' + n) boxHtml = `<div class="abox"><input class="inp" id="ren_n" maxlength="16" value="${n}" autocapitalize="none" spellcheck="false"><button class="btn sm" data-a="ren_save" data-n="${n}"><span>Umbenennen</span></button></div>`;
      return `<div class="pcard-a${online ? ' on' : ''}">
        <div class="pa-top"><span class="adot"></span><b>${n}</b>${tags}</div>
        <div class="pa-info">Dabei seit ${day(p.joined)} · ${online ? '<b class="good">online</b> · ' + esc(gameName(p.game)) : 'zuletzt ' + ago(p.seen)} · ${st.played || 0} Partien · KI ${st.ai_wins || 0}:${(st.ai_games || 0) - (st.ai_wins || 0)}</div>
        ${p.ban_reason ? `<div class="pa-note bad">Sperrgrund: ${esc(p.ban_reason)}</div>` : ''}
        ${p.note ? `<div class="pa-note">Notiz${p.note_by ? ' von ' + esc(p.note_by) : ''}: ${esc(p.note)}</div>` : ''}
        ${canEdit ? `<div class="arow wrap">
          ${btn(p.hidden ? 'show' : 'hide', p.hidden ? 'Einblenden' : 'Ausblenden')}
          ${p.banned_until ? btn('unban', 'Entsperren') : p.role === 'owner' || p.me ? '' : `<button class="btn ghost sm" data-box="ban:${n}"><span>Sperren …</span></button>`}
          <button class="btn ghost sm" data-box="note:${n}"><span>${p.note ? 'Notiz ändern' : 'Notiz'}</span></button>
          <button class="btn ghost sm" data-box="ren:${n}"><span>Umbenennen</span></button>
          ${confirmBtn('reset:', 'Bilanz zurücksetzen', 'Wirklich alles auf 0?', 'reset')}
          ${owner && !p.me && p.role !== 'owner' ? confirmBtn('adm:', p.role ? 'Admin entziehen' : 'Zum Admin machen', p.role ? 'Wirklich entziehen?' : 'Wirklich Admin?', p.role ? 'admin_off' : 'admin_on') : ''}
          ${owner ? confirmBtn('dev:', p.dev ? 'Dev aufheben' : 'Zum Dev-Konto', 'Wirklich?', p.dev ? 'dev_off' : 'dev_on') : ''}
        </div>${boxHtml}` : '<div class="pa-info muted">Nur der Owner kann Admins bearbeiten.</div>'}
      </div>`;
    }).join('');
    return `<div class="asearch"><input class="inp" id="aq" placeholder="Spieler suchen (Namensanfang)" value="${esc(query)}" autocapitalize="none" spellcheck="false"><button class="btn ghost sm" id="reload"><span>${IC().redo}</span></button></div>
      ${players ? cards || '<p class="muted">Niemand gefunden.</p>' : V.skel()}`;
  }
  // match log: running and finished online matches; each one can be watched live or replayed move by move
  function matchList() {
    const ST = { invited: 'wartet auf Antwort', live: 'läuft', done: 'beendet', void: 'annulliert' };
    const RES = { win: 'gewonnen', draw: 'remis', resign: 'aufgegeben', abandon: 'verlassen', time: 'Zeit abgelaufen', mismatch: 'Ergebnis strittig' };
    const rows = (matches || []).map(m => {
      const a = esc(m.a), b = esc(m.b);
      const res = m.status === 'done' ? (m.winner ? `<b class="good">${esc(m.winner)}</b> ${RES[m.result] === 'gewonnen' ? 'gewinnt' : 'gewinnt (' + (m.result === 'resign' ? 'Aufgabe' : m.result === 'abandon' ? 'Gegner weg' : esc(m.result)) + ')'}` : 'Remis')
        : m.status === 'void' ? `annulliert${m.result ? ' · ' + esc(m.result) : ''}` : ST[m.status] || m.status;
      const live = m.status === 'live';
      return `<div class="mrow${live ? ' live' : ''}">
        <div class="m-g">${V.byId[m.game] ? V.byId[m.game].icon : ''}</div>
        <div class="m-t"><b><button class="link" data-p="${a}">${a}</button> <i>gegen</i> <button class="link" data-p="${b}">${b}</button></b>
          <small>${esc(gameName(m.game))} · ${m.moves} Züge · ${when(m.finished_at || m.started_at || m.created_at)}${live ? ` · ${m.a_online ? '' : esc(m.a) + ' offline · '}${m.b_online ? '' : esc(m.b) + ' offline'}` : ''}</small>
          <span class="m-r">${live ? '<em class="rtag live">Live</em> ' : ''}${res}</span></div>
        <div class="m-a">${m.a_side ? `<button class="btn sm${live ? ' primary' : ''}" data-watch="${m.id}"><span>${live ? 'Zuschauen' : 'Abspielen'}</span></button>` : ''}
          ${m.status === 'live' || m.status === 'done' ? (sure === 'void:' + m.id ? `<button class="btn ghost sm danger" data-void="${m.id}"><span>Wirklich annullieren?</span></button>` : `<button class="btn ghost sm" data-sure="void:${m.id}"><span>Annullieren</span></button>`) : ''}</div>
      </div>`;
    }).join('');
    return `<div class="asearch"><div class="chips mini" id="mf">${[['live', 'Laufend'], ['done', 'Beendet'], ['all', 'Alle']].map(([k, l]) => `<button data-mf="${k}" class="${mFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <input class="inp" id="mq" placeholder="Spieler" value="${esc(mQuery)}" autocapitalize="none" spellcheck="false"><button class="btn ghost sm" id="reload"><span>${IC().redo}</span></button></div>
      ${mFilter === 'live' ? '<p class="fine">Laufende Partien aktualisieren sich alle 20 Sekunden. „Zuschauen“ zeigt das Brett live, „Abspielen“ spielt eine beendete Partie Zug für Zug nach.</p>' : ''}
      ${matches ? rows || '<p class="muted">Keine Partien.</p>' : V.skel()}`;
  }
  function logList() {
    const L = { hide: 'ausgeblendet', show: 'eingeblendet', ban: 'gesperrt', unban: 'entsperrt', note: 'Notiz', rename: 'umbenannt', reset_stats: 'Bilanz zurückgesetzt', admin_on: 'zum Admin gemacht', admin_off: 'Admin entzogen', dev_on: 'Dev-Konto an', dev_off: 'Dev-Konto aus', void_match: 'Partie annulliert', report_done: 'Meldung erledigt', report_open: 'Meldung wieder offen' };
    if (!logs) return V.skel();
    if (!logs.length) return '<p class="muted">Noch keine Admin-Aktionen.</p>';
    return `<div class="apanel">${logs.map(l => `<div class="aline log"><small>${when(l.created_at)}</small><b>${esc(l.admin_name || '?')}</b><span>${esc(L[l.action] || l.action)} <button class="link" data-p="${esc(l.target || '')}">${esc(l.target || '')}</button>${l.detail ? ' · ' + esc(l.detail) : ''}</span></div>`).join('')}</div>`;
  }
  // reports from players: who, why, the match if there was one; the name opens the player card (ban, hide, rename)
  function reportList() {
    const WHY = { name: 'Beleidigender Name', abuse: 'Beleidigung oder Spam', cheat: 'Schummeln oder Abbrechen', other: 'Etwas anderes' };
    const rows = ((reports && reports.list) || []).map(r => `<div class="mrow rep${r.status === 'open' ? ' live' : ''}">
        <div class="m-t"><b><button class="link" data-p="${esc(r.target)}">${esc(r.target)}</button> <em class="rtag${r.status === 'open' ? ' bad' : ''}">${esc(WHY[r.reason] || r.reason)}</em>${r.count > 1 ? ` <em class="rtag">${r.count}× gemeldet</em>` : ''}${r.banned ? ' <em class="rtag bad">gesperrt</em>' : ''}</b>
          <small>von ${r.reporter ? `<button class="link" data-p="${esc(r.reporter)}">${esc(r.reporter)}</button>` : '?'} · ${when(r.at)}${r.game ? ' · ' + esc(gameName(r.game)) : ''}${r.status === 'done' ? ' · erledigt' + (r.by ? ' von ' + esc(r.by) : '') : ''}</small>
          ${r.note ? `<span class="m-r">„${esc(r.note)}“</span>` : ''}</div>
        <div class="m-a">${r.match ? `<button class="btn sm" data-watch="${r.match}"><span>Partie</span></button>` : ''}
          <button class="btn ghost sm" data-rdone="${r.id}" data-v="${r.status === 'open' ? 1 : 0}"><span>${r.status === 'open' ? 'Erledigt' : 'Wieder öffnen'}</span></button></div></div>`).join('');
    return `<div class="asearch"><div class="chips mini" id="rf">${[['open', 'Offen'], ['all', 'Alle']].map(([k, l]) => `<button data-rf="${k}" class="${rFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div><button class="btn ghost sm" id="reload"><span>${IC().redo}</span></button></div>
      <p class="fine">Tipp auf den Namen, um den Spieler zu sperren, auszublenden oder umzubenennen. Danach die Meldung auf „Erledigt“ setzen.</p>
      ${reports ? rows || `<p class="muted">${rFilter === 'open' ? 'Keine offenen Meldungen.' : 'Noch keine Meldungen.'}</p>` : V.skel()}`;
  }
  let qTimer = null;
  function wireAdmin(h) {
    const r = h.querySelector('#reload'); if (r) r.onclick = () => { V.sfx.ui(); load(); };
    h.querySelectorAll('[data-rf]').forEach(x => x.onclick = () => { rFilter = x.dataset.rf; reports = null; V.sfx.ui(); draw(); load(); });
    h.querySelectorAll('[data-rdone]').forEach(x => x.onclick = () => act('admin_report_done', { rid: +x.dataset.rdone, done: x.dataset.v === '1' }, x.dataset.v === '1' ? 'Meldung erledigt.' : 'Meldung wieder offen.'));
    h.querySelectorAll('[data-p]').forEach(x => x.onclick = () => { if (!x.dataset.p) return; query = x.dataset.p; players = null; aTab = 'players'; admin(); });
    const q = h.querySelector('#aq');
    if (q) {
      q.oninput = () => { clearTimeout(qTimer); qTimer = setTimeout(() => { query = q.value.trim(); load().then(() => { draw(true); const n = document.getElementById('aq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350); };
      q.onblur = () => setTimeout(draw, 0);
    }
    h.querySelectorAll('[data-mf]').forEach(x => x.onclick = () => { mFilter = x.dataset.mf; matches = null; sure = null; V.sfx.ui(); draw(); load(); });
    const mq = h.querySelector('#mq');
    if (mq) { mq.onchange = () => { mQuery = mq.value.trim(); matches = null; load(); }; mq.onkeydown = e => { if (e.key === 'Enter') mq.blur(); }; }
    h.querySelectorAll('[data-watch]').forEach(x => x.onclick = () => { stopLive(); V.online.watch(x.dataset.watch, true); });
    h.querySelectorAll('[data-void]').forEach(x => x.onclick = () => act('admin_void_match', { mid: x.dataset.void, why: null }, 'Partie annulliert.'));
    h.querySelectorAll('[data-box]').forEach(x => x.onclick = () => { box = box === x.dataset.box ? null : x.dataset.box; sure = null; draw(); });
    h.querySelectorAll('[data-sure]').forEach(x => x.onclick = () => { sure = x.dataset.sure; draw(); });
    h.querySelectorAll('[data-ban]').forEach(x => x.onclick = () => {
      const d = +x.dataset.ban, n = x.dataset.n, reason = (h.querySelector('#ban_r') || {}).value || null;
      act('admin_ban', { name: n, days: d || null, reason }, `${n} ist ${d ? 'für ' + x.textContent.trim() : 'dauerhaft'} gesperrt.`);
    });
    h.querySelectorAll('[data-a]').forEach(x => x.onclick = () => {
      const n = x.dataset.n;
      const A = {
        hide: () => act('admin_set_hidden', { name: n, hide: true }, n + ' ist ausgeblendet.'),
        show: () => act('admin_set_hidden', { name: n, hide: false }, n + ' ist wieder sichtbar.'),
        unban: () => act('admin_unban', { name: n }, n + ' ist entsperrt.'),
        reset: () => act('admin_reset_stats', { name: n }, 'Bilanz von ' + n + ' ist zurückgesetzt.'),
        admin_on: () => act('admin_set_admin', { name: n, make: true }, n + ' ist jetzt Admin.'),
        admin_off: () => act('admin_set_admin', { name: n, make: false }, n + ' ist kein Admin mehr.'),
        dev_on: () => act('admin_set_dev', { name: n, make: true }, n + ' ist jetzt ein Dev-Konto.'),
        dev_off: () => act('admin_set_dev', { name: n, make: false }, n + ' ist kein Dev-Konto mehr.'),
        note_save: () => act('admin_set_note', { name: n, txt: h.querySelector('#note_t').value }, 'Notiz gespeichert.'),
        ren_save: () => { const nn = h.querySelector('#ren_n').value.trim().toLowerCase(); act('admin_rename_user', { name: n, new_name: nn }, n + ' heißt jetzt ' + nn + '.'); query = nn; }
      };
      if (A[x.dataset.a]) A[x.dataset.a]();
    });
  }

  V.account = { tab, wire, admin };
})();
