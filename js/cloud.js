// Versus: online accounts through Supabase. Login with username + password, cloud copy of stats,
// settings and tutorials, heartbeat for the online list, admin RPCs.
(function () {
  'use strict';

  // Project URL and publishable key from Supabase (Settings → API). Both are public by design;
  // the database protects itself with row level security and server-side checks.
  // (inside the Discord activity the project is reached through Discord's proxy, see js/discord.js)
  const CFG = { url: V.discord && V.discord.proxy ? location.origin + '/.proxy/supabase' : 'https://ygnngmtvncmdunsdnwtk.supabase.co', key: 'sb_publishable_DWz8MXxA0PM-rQOqnVMJGQ_FqadTjHg' };
  // Cloudflare Turnstile site key (public), widget "Versus" for bananemdnaa.github.io, localhost and the Discord activity.
  // The captcha is only enforced once it is switched on in Supabase → Attack Protection (with the secret key).
  // Switched off again (November 2026): on iPhones the check often failed ("could not verify"). Empty = no Turnstile at
  // all, the login goes straight to Supabase. To switch it back on: the key below again, and on in Supabase.
  const TURNSTILE = ''; // was '0x4AAAAAAFv4ibMzTK6UzaN3'
  // Supabase needs an e-mail address internally; this domain is ours (GitHub Pages), no mails are sent.
  const MAIL = 'bananemdnaa.github.io';
  const NAME_RE = /^[a-z0-9_-]{3,16}$/;
  const KEYS = ['stats', 'seen', 'settings', 'setup', 'recent', 'recents', 'favs', 'dailyCh', 'badges', 'aiElo'];

  let sb = null, user = null, info = null, timer = null, beat = null, busy = false, again = false, leaving = false;
  const state = { status: 'off', last: 0, error: '' };
  const listeners = new Set();
  const emit = () => listeners.forEach(f => { try { f(); } catch (e) { } });

  // The Supabase library loads in the background, so the menus do not wait for it. Until init() has asked the
  // server who is logged in, nobody counts as a guest (no locked games flashing up for logged-in players).
  // supabase-js 2.49.4, stored in the project so no third-party CDN sees the players' IP addresses
  const LIB = 'js/vendor/supabase.js';
  let failed = !(CFG.url && CFG.key), starting = !failed;
  const lib = failed ? Promise.resolve(null) : new Promise(done => {
    const s = document.createElement('script'); s.src = LIB; s.async = true;
    s.onload = () => {
      try { sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'versus-auth' } }); state.status = 'guest'; if (V.dev) V.dev.wrap(sb); }
      catch (e) { sb = null; }
      done(sb);
    };
    s.onerror = () => done(null);
    document.head.appendChild(s);
  }).then(c => { if (!c) { failed = true; starting = false; emit(); } return c; });

  const S = () => V.store;
  const meta = () => S().get('cloudmeta', {});
  const setMeta = m => S().set('cloudmeta', m, true);

  function errText(err) {
    const m = (err && (err.message || err.msg)) || String(err);
    if (/already registered|already exists|duplicate|unique/i.test(m)) return 'Diesen Benutzernamen gibt es schon.';
    if (/invalid login credentials/i.test(m)) return 'Benutzername oder Passwort falsch.';
    if (/password should be at least|weak/i.test(m)) return 'Das Passwort ist zu kurz (mindestens 6 Zeichen).';
    if (/email logins are disabled|signups not allowed|provider is not enabled/i.test(m)) return 'Registrieren ist auf dem Server gerade nicht möglich.';
    if (/email not confirmed/i.test(m)) return 'Auf dem Server ist „Confirm email“ noch an.';
    if (/database error saving new user/i.test(m)) return 'Dieser Benutzername ist nicht erlaubt.';
    if (/banned/i.test(m)) return 'Dieses Konto ist gesperrt.';
    if (/anonymous sign-ins are disabled/i.test(m)) return 'Der Gast-Zugang ist auf dem Server noch aus.';
    if (/captcha/i.test(m)) return 'Die Sicherheitsprüfung hat nicht geklappt. Versuch es nochmal.';
    if (/rate limit|too many requests/i.test(m)) return 'Zu viele Versuche. Warte kurz und versuch es dann nochmal.';
    if (/failed to fetch|network|load failed/i.test(m)) return 'Keine Verbindung zum Server.';
    if (/could not find the (function|table)|schema cache|does not exist/i.test(m)) return 'Der Server ist noch nicht fertig eingerichtet.';
    return m;
  }
  const check = r => { if (r.error) throw new Error(errText(r.error)); return r.data; };
  const clean = n => String(n || '').trim().toLowerCase();

  // ---------- local data ----------
  function collect() { const d = {}; KEYS.forEach(k => { const v = S().get(k, null); if (v != null) d[k] = v; }); return d; }
  function writeLocal(d) { KEYS.forEach(k => { if (d[k] !== undefined) S().set(k, d[k], true); }); if (V.reloadLocal) V.reloadLocal(); }

  // stats: { game: { ai: [{w,l,d} x4], local: {a,b,d} } }
  function mergeStats(a, b, add) {
    const out = {};
    const ids = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    const n = v => (typeof v === 'number' && isFinite(v) ? v : 0);
    const f = (x, y) => add ? n(x) + n(y) : Math.max(n(x), n(y));
    ids.forEach(id => {
      const x = (a || {})[id] || {}, y = (b || {})[id] || {};
      out[id] = {
        ai: [0, 1, 2, 3].map(i => { const p = (x.ai || [])[i] || {}, q = (y.ai || [])[i] || {}; return { w: f(p.w, q.w), l: f(p.l, q.l), d: f(p.d, q.d) }; }),
        local: { a: f((x.local || {}).a, (y.local || {}).a), b: f((x.local || {}).b, (y.local || {}).b), d: f((x.local || {}).d, (y.local || {}).d) },
        on: { w: f((x.on || {}).w, (y.on || {}).w), l: f((x.on || {}).l, (y.on || {}).l), d: f((x.on || {}).d, (y.on || {}).d) }
      };
    });
    return out;
  }

  // ---------- sync ----------
  async function pull() {
    if (!user) return;
    const row = check(await sb.from('user_data').select('data,rev,reset_at').eq('user_id', user.id).maybeSingle());
    const m = meta(), local = collect();
    if (!row) {
      // first login with this account: the guest progress of this browser becomes the account's start
      setMeta({ uid: user.id, rev: null, sync: 0 });
      return push(true);
    }
    const cloud = row.data || {};
    const mine = m.uid === user.id;
    const resetNewer = row.reset_at && new Date(row.reset_at).getTime() > (m.sync || 0);
    const merged = Object.assign({}, cloud);
    // Same account on this browser: keep the higher count. Guest progress from before the login: add it once.
    // An admin reset on the server wins over local numbers.
    merged.stats = resetNewer && mine ? (cloud.stats || {}) : mergeStats(local.stats, cloud.stats, !mine);
    merged.seen = Object.assign({}, cloud.seen || {}, local.seen || {});
    merged.settings = Object.assign({}, local.settings || {}, cloud.settings || {});
    merged.setup = Object.assign({}, cloud.setup || {}, mine ? local.setup || {} : {});
    merged.recent = (mine && local.recent) || cloud.recent || local.recent || null;
    merged.recents = (mine && local.recents) || cloud.recents || local.recents || [];
    merged.favs = (mine && local.favs) || cloud.favs || local.favs || [];
    // Spiel des Tages: the later day wins (on the same day the longer series), the best series is the higher one;
    // Abzeichen: all of both, each with its earlier date
    const dl = local.dailyCh || {}, dc = cloud.dailyCh || {};
    const dw = (dl.last || '') > (dc.last || '') || ((dl.last || '') === (dc.last || '') && (dl.streak || 0) >= (dc.streak || 0)) ? dl : dc;
    if (dl.last || dc.last) merged.dailyCh = Object.assign({}, dc, dw, { best: Math.max(dl.best || 0, dc.best || 0, dw.streak || 0) });
    const bl = local.badges || {}, bc = cloud.badges || {};
    merged.badges = Object.assign({}, bc);
    for (const k in bl) if (!merged.badges[k] || bl[k] < merged.badges[k]) merged.badges[k] = bl[k];
    // KI-Elo per game: the one with more rated matches (an admin reset of the Bilanz clears it too)
    const el = local.aiElo || {}, ec = cloud.aiElo || {};
    merged.aiElo = resetNewer && mine ? {} : Object.assign({}, ec);
    if (!(resetNewer && mine)) for (const k in el) if (!merged.aiElo[k] || (el[k].n || 0) > (merged.aiElo[k].n || 0)) merged.aiElo[k] = el[k];
    writeLocal(merged);
    setMeta({ uid: user.id, rev: row.rev, sync: Date.now() });
    state.status = 'ok'; state.last = Date.now(); emit();
    if (JSON.stringify(merged) !== JSON.stringify(cloud)) await push(true);
  }
  async function push(now) {
    if (!user) return;
    if (busy) { again = true; return; }
    busy = true; state.status = 'sync'; emit();
    try {
      const m = meta();
      const r = await sb.rpc('save_data', { d: collect(), base: m.rev == null ? -1 : m.rev });
      if (r.error && /conflict/i.test(r.error.message || '')) { busy = false; return pull(); }
      const rev = check(r);
      setMeta({ uid: user.id, rev, sync: Date.now() });
      state.status = 'ok'; state.last = Date.now(); state.error = '';
    } catch (e) { state.status = 'error'; state.error = e.message; }
    busy = false; emit();
    if (again) { again = false; schedule(); }
  }
  function schedule() { if (!user) return; clearTimeout(timer); timer = setTimeout(push, 2500); }
  function flush() { if (user && timer) { clearTimeout(timer); timer = null; push(); } }

  // ---------- heartbeat ----------
  let curGame = null;
  function touch(game) {
    if (game !== undefined) curGame = game;
    if (user && document.visibilityState !== 'hidden') sb.rpc('touch', { game: curGame }).then(() => { }, () => { });
  }
  function startBeat() { clearInterval(beat); beat = setInterval(() => touch(), 60000); touch(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else if (user) { touch(); pull().catch(() => { }); } });

  async function loadInfo() {
    info = null;
    try { info = check(await sb.rpc('my_info')); } catch (e) { }
    // linked Discord account (name, and whether a password is known); missing until the migration is in
    if (info && user && !info.guest) try { info.discord = check(await sb.rpc('my_discord')); } catch (e) { }
    emit();
  }
  // in the Discord activity a guest takes the Discord name instead of gast_12345: with the Discord login of the
  // activity (js/discord.js) the Edge Function "discord" asks Discord for the name and renames the guest (once per visit)
  let dcTried = false;
  async function discordName() {
    if (dcTried || !V.discord || !V.discord.on || !user || !info || !info.guest || !/^gast_/.test(info.username || '')) return;
    dcTried = true;
    try {
      const a = await V.discord.auth; if (!a) return;
      const { data, error } = await sb.functions.invoke('discord', { body: { access_token: a.token } });
      if (!error && data && data.name) await loadInfo();
    } catch (e) { console.warn('Discord name:', e); }
  }
  async function afterLogin() {
    state.status = 'sync'; emit();
    await loadInfo();
    discordName();
    try { await pull(); } catch (e) { state.status = 'error'; state.error = e.message; emit(); }
    startBeat();
  }

  async function need() { if (!(await lib)) throw new Error('Keine Verbindung zum Server.'); }
  // the team can pause new accounts or guests (spam wave); the server blocks them too, this only gives a clear message
  async function paused(k) {
    let s = null; try { s = (await sb.rpc('site_notice')).data; } catch (e) { }
    if (s && s[k] === false) throw new Error(k === 'guests' ? 'Der Gast-Zugang ist gerade pausiert. Versuch es später nochmal.' : 'Neue Konten sind gerade pausiert. Versuch es später nochmal.');
  }

  // ---------- captcha (Cloudflare Turnstile) ----------
  // Only shows something when Cloudflare wants an interaction; most of the time the token comes back silently.
  let tsLib = null;
  function captcha() {
    if (!TURNSTILE) return Promise.resolve(undefined);
    tsLib = tsLib || new Promise((res, rej) => {
      // inside the Discord activity outside addresses are blocked: the script comes through the URL mapping /cf → challenges.cloudflare.com
      const host = V.discord && V.discord.proxy ? location.origin + '/.proxy/cf' : 'https://challenges.cloudflare.com';
      const s = document.createElement('script'); s.src = host + '/turnstile/v0/api.js?render=explicit'; s.async = true;
      s.onload = () => res(); s.onerror = () => { tsLib = null; rej(new Error('Die Sicherheitsprüfung lädt gerade nicht.')); };
      document.head.appendChild(s);
    });
    // without a token the login is still tried: as long as Supabase does not ask for a captcha it goes through,
    // otherwise Supabase answers with the captcha error (shown as "Die Sicherheitsprüfung …")
    return tsLib.then(() => new Promise((res, rej) => {
      const box = V.el('div', 'tsbox'); document.body.appendChild(box);
      let id = null;
      const done = (f, v) => { try { window.turnstile.remove(id); } catch (e) { } box.remove(); f(v); };
      id = window.turnstile.render(box, {
        sitekey: TURNSTILE, appearance: 'interaction-only', language: V.lang || 'auto',
        callback: t => done(res, t),
        'error-callback': () => done(rej, new Error('Die Sicherheitsprüfung hat nicht geklappt. Versuch es nochmal.')),
        'timeout-callback': () => done(rej, new Error('Die Sicherheitsprüfung hat zu lange gedauert.'))
      });
      // a check that never answers (blocked frame) must not hold the login forever
      setTimeout(() => { if (box.isConnected) done(res, undefined); }, 30000);
    })).catch(() => undefined);
  }

  // Inside the Discord activity the captcha cannot run (Discord blocks its frame). There the login goes through the
  // Edge Function "discord-auth", which checks the player's Discord token and signs in without a captcha.
  // null: not in Discord, no Discord login, or the function is not there yet (then the normal way is tried).
  async function viaDiscord(kind, email, password) {
    if (!V.discord || !V.discord.on) return null;
    const a = await V.discord.auth.catch(() => null);
    if (!a || !a.token) return null;
    let r;
    try { r = await fetch(CFG.url + '/functions/v1/discord-auth', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, access_token: a.token, email, password }) }); }
    catch (e) { return null; }
    if (r.status === 404) return null;
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) throw new Error(errText({ message: d.error || 'Anmeldung über Discord: ' + r.status }));
    const s = check(await sb.auth.setSession({ access_token: d.access_token, refresh_token: d.refresh_token }));
    return s.user || (s.session && s.session.user) || null;
  }

  // ---------- Mit Discord anmelden (Edge Function "discord-login") ----------
  // Website: off to discord.com (scope identify) and back with ?code=…&state=…; inside the activity the Discord token
  // of the activity is the proof, no detour. Linked → a session for that account; not linked → an offer: pick a name
  // (a guest becomes that account) or log in normally and link afterwards.
  const DC_APP = '1565782186832039987';
  const dcBack = () => location.origin + location.pathname.replace(/index\.html$/, '');
  // inside another page's frame (itch.io) discord.com refuses to open
  const dcOk = () => !!(V.discord && V.discord.on) || window.top === window.self;
  let dcOffer = null;
  try { dcOffer = JSON.parse(sessionStorage.getItem('versus.dcoffer')) || null; } catch (e) { }
  const setOffer = o => { dcOffer = o; try { if (o) sessionStorage.setItem('versus.dcoffer', JSON.stringify(o)); else sessionStorage.removeItem('versus.dcoffer'); } catch (e) { } };
  async function dcCall(body) {
    await need();
    let tok = CFG.key;
    if (user) try { const s = (await sb.auth.getSession()).data.session; if (s) tok = s.access_token; } catch (e) { }
    let r;
    try { r = await fetch(CFG.url + '/functions/v1/discord-login', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error('Keine Verbindung zum Server.'); }
    if (r.status === 404) throw new Error('Die Anmeldung mit Discord kommt nach dem nächsten Server-Update.');
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(errText({ message: d.error || 'Discord: ' + r.status }));
    return d;
  }
  async function dcSession(d) {
    const s = check(await sb.auth.setSession({ access_token: d.access_token, refresh_token: d.refresh_token }));
    user = s.user || (s.session && s.session.user); setOffer(null);
    await afterLogin();
  }
  // the proof of who this is on Discord: the activity's token, or null (then the website has to go to discord.com)
  async function dcProof() {
    if (!(V.discord && V.discord.on)) return null;
    const a = await V.discord.auth.catch(() => null);
    if (!a || !a.token) throw new Error('Discord hat die Anmeldung nicht freigegeben.');
    return { access_token: a.token };
  }
  function dcRedirect(purpose) {
    const st = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { sessionStorage.setItem('versus.dcoauth', JSON.stringify({ st, purpose })); } catch (e) { }
    location.href = 'https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: DC_APP, response_type: 'code', scope: 'identify', redirect_uri: dcBack(), state: st, prompt: 'none' });
    return new Promise(() => { });
  }
  // what to do with a proof: log in (or make an offer), or link to the signed-in account
  async function dcUse(purpose, proof) {
    if (purpose === 'link') { const d = await dcCall(Object.assign({ action: 'link' }, proof)); await loadInfo(); return { linked: d.linked }; }
    const d = await dcCall(Object.assign({ action: 'login' }, proof));
    if (d.access_token) { await dcSession(d); return { in: true }; }
    setOffer({ ticket: d.ticket, suggest: d.suggest, dname: d.dname });
    emit();
    return { offer: dcOffer };
  }
  // back from discord.com: ?code=…&state=… (or ?error=… when the player said no); the address is cleaned at once
  async function dcReturn() {
    const q = new URLSearchParams(location.search);
    if (!q.has('state') || !(q.has('code') || q.has('error'))) return null;
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem('versus.dcoauth')); sessionStorage.removeItem('versus.dcoauth'); } catch (e) { }
    const code = q.get('code'), st = q.get('state');
    ['code', 'state', 'error', 'error_description'].forEach(k => q.delete(k));
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { }
    if (!saved || saved.st !== st) return null;
    if (!code) return { purpose: saved.purpose, error: 'Abgebrochen' };
    try { return Object.assign({ purpose: saved.purpose }, await dcUse(saved.purpose, { code, redirect_uri: dcBack() })); }
    catch (e) { return { purpose: saved.purpose, error: e.message }; }
  }
  // inside the activity: a linked account signs in by itself (a guest of this activity switches to it)
  async function dcAuto() {
    if (!(V.discord && V.discord.on) || (user && !(C.user() || {}).anon)) return;
    const a = await V.discord.auth.catch(() => null);
    if (!a || !a.token || (user && !(C.user() || {}).anon)) return;
    try {
      const d = await dcCall({ action: 'login', access_token: a.token });
      if (d.access_token) { await dcSession(d); if (V.ui) V.ui.toast('Mit Discord angemeldet: ' + C.user().username); }
    } catch (e) { console.warn('Discord login:', e.message); }
  }

  // ---------- realtime pokes ----------
  // After a move the other browsers get a short signal on a shared channel and fetch the new state at once,
  // instead of waiting for their next poll. No game data goes over the channel; the server stays the only source.
  // hello: also poke once as soon as the channel is connected (the other side learns that we are here).
  function channel(name, onPoke, hello) {
    let ch = null, live = false, closed = false;
    lib.then(c => {
      if (!c || closed || !c.channel) return;
      ch = c.channel('versus:' + name, { config: { broadcast: { self: false } } });
      ch.on('broadcast', { event: 'poke' }, () => { if (V.dev) V.dev.net('Poke empfangen', name); if (!closed) onPoke(); });
      ch.subscribe(st => {
        const was = live; live = st === 'SUBSCRIBED'; if (V.dev) V.dev.net('Kanal ' + st, name);
        if (live && !was && hello) send();
      });
    });
    const send = () => { if (V.dev) V.dev.net(live ? 'Poke gesendet' : 'Poke verworfen (Kanal nicht verbunden)', name); if (live && ch) ch.send({ type: 'broadcast', event: 'poke', payload: {} }).catch(() => { }); };
    return {
      live: () => live,
      poke: send,
      close() { closed = true; live = false; if (ch && sb) try { sb.removeChannel(ch); } catch (e) { } }
    };
  }

  const C = V.cloud = {
    available: () => !failed,
    // true until the first answer about the login (the menus treat that time as "not a guest")
    starting: () => starting,
    // anon: a guest without name and password (anonymous Supabase account), see signInGuest
    user: () => (user ? { id: user.id, username: (info && info.username) || (user.user_metadata && user.user_metadata.username) || '', anon: !!(user.is_anonymous || (info && info.guest)) } : null),
    info: () => info,
    role: () => (info && info.role) || null,
    state: () => state,
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    async init() {
      if (!(await lib)) return;
      try {
        const r = await sb.auth.getSession();
        user = r.data && r.data.session ? r.data.session.user : null;
      } catch (e) { user = null; }
      // The server can end a session on its own (login expired or revoked). Without this the app would keep the old
      // user and send every request without a login ("permission denied"); now it shows the signed-out state.
      sb.auth.onAuthStateChange(ev => {
        if (ev !== 'SIGNED_OUT' || !user || leaving) return;
        clearTimeout(timer); clearInterval(beat);
        user = null; info = null; state.status = 'guest'; emit();
        if (V.ui) V.ui.toast('Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.', 3500);
      });
      starting = false;
      if (user) await afterLogin(); else emit();
      // back from discord.com: the account tab shows how it went
      const back = await dcReturn();
      if (back) setTimeout(() => {
        if (!V.ui) return;
        if (back.error) V.ui.toast(back.error === 'Abgebrochen' ? 'Anmeldung mit Discord abgebrochen' : back.error, 3500);
        else if (back.in) V.ui.toast('Mit Discord angemeldet: ' + C.user().username);
        else if (back.linked) V.ui.toast('Discord verknüpft');
        V.ui.home('profile');
      }, 300);
      else dcAuto();
    },
    async signUp(name, pw) {
      await need();
      const u = clean(name);
      if (!NAME_RE.test(u)) throw new Error('Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.');
      if (String(pw).length < 6) throw new Error('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      await paused('signups');
      const du = await viaDiscord('signup', u + '@' + MAIL, pw);
      if (du) { user = du; return afterLogin(); }
      const d = check(await sb.auth.signUp({ email: u + '@' + MAIL, password: pw, options: { data: { username: u }, captchaToken: await captcha() } }));
      if (!d.session) throw new Error('Konto angelegt, aber auf dem Server ist „Confirm email“ noch an.');
      user = d.user; await afterLogin();
    },
    async signIn(name, pw) {
      await need();
      const du = await viaDiscord('login', clean(name) + '@' + MAIL, pw);
      if (du) { user = du; await afterLogin(); }
      else {
        const d = check(await sb.auth.signInWithPassword({ email: clean(name) + '@' + MAIL, password: pw, options: { captchaToken: await captcha() } }));
        user = d.user; await afterLogin();
      }
      // "Ich habe schon ein Konto" after "Mit Discord anmelden": link the Discord account from the offer right away
      if (dcOffer && dcOffer.ticket) {
        const t = dcOffer.ticket; setOffer(null);
        try { await dcCall({ action: 'link', ticket: t }); await loadInfo(); return 'linked'; } catch (e) { if (V.ui) V.ui.toast(e.message, 3500); }
      }
    },
    // Mit Discord: purpose 'login' (also a guest that wants to keep the account) or 'link' (signed in)
    discordOk: dcOk,
    discordOffer: () => dcOffer,
    discordDrop() { setOffer(null); emit(); },
    async discord(purpose) {
      const proof = await dcProof();
      if (!proof) return dcRedirect(purpose);
      return dcUse(purpose, proof);
    },
    // a new account with the name of choice (a guest becomes this account); proof: the offer's ticket or the activity
    async discordCreate(name) {
      const u = clean(name);
      if (!NAME_RE.test(u)) throw new Error('Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.');
      const proof = (dcOffer && dcOffer.ticket ? { ticket: dcOffer.ticket } : null) || await dcProof();
      if (!proof) throw new Error('Die Anmeldung über Discord ist abgelaufen. Versuch es nochmal.');
      const d = await dcCall(Object.assign({ action: 'create', name: u }, proof));
      await dcSession(d);
      return d.created;
    },
    async discordUnlink() { check(await sb.rpc('discord_unlink')); await loadInfo(); },
    async discordPassword(pw) {
      if (String(pw).length < 6) throw new Error('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      check(await sb.rpc('discord_set_password', { new_pw: pw })); await loadInfo();
    },
    // Discord activity: the one-time code from Discord becomes an access token (Edge Function "discord-token", works without a login)
    async discordToken(code) {
      await need();
      const { data, error } = await sb.functions.invoke('discord-token', { body: { code } });
      if (error || !data || !data.access_token) throw new Error((data && data.error) || (error && error.message) || 'no Discord token');
      return data.access_token;
    },
    // guest: an anonymous account with a name like gast_48213, enough for quick online matches
    async signInGuest() {
      await need();
      if (user) return;
      await paused('guests');
      const du = await viaDiscord('guest');
      if (du) { user = du; return afterLogin(); }
      const d = check(await sb.auth.signInAnonymously({ options: { captchaToken: await captcha() } }));
      user = d.user; await afterLogin();
    },
    // a guest keeps the account: own name and password, then it is a normal account
    async claimGuest(name, pw) {
      await need();
      const u = clean(name);
      if (!NAME_RE.test(u)) throw new Error('Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.');
      if (String(pw).length < 6) throw new Error('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      check(await sb.rpc('guest_claim', { new_name: u, pw }));
      // a fresh login, so the session no longer says "anonymous"
      const d = check(await sb.auth.signInWithPassword({ email: u + '@' + MAIL, password: pw, options: { captchaToken: await captcha() } }));
      user = d.user; await loadInfo();
      return u;
    },
    // forgotten password: name + recovery code (shown once when it was made) sets a new password
    async recover(name, code, pw) {
      await need();
      if (String(pw).length < 6) throw new Error('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      const r = check(await sb.rpc('recovery_reset', { name: clean(name), code, pw }));
      if (r === 'locked') throw new Error('Zu viele Versuche. Versuch es in einer Stunde nochmal.');
      if (r !== 'ok') throw new Error('Name oder Code stimmt nicht.');
      await C.signIn(name, pw);
    },
    async newRecovery() { const c = check(await sb.rpc('recovery_new')); await loadInfo(); return c; },
    async signOut() {
      clearTimeout(timer);
      if (user) { try { await push(true); } catch (e) { } }
      clearInterval(beat);
      leaving = true; try { await sb.auth.signOut(); } catch (e) { } leaving = false;
      user = null; info = null; state.status = 'guest';
      // the account keeps its data; this browser goes back to a fresh guest
      ['stats', 'seen', 'setup', 'recent', 'recents', 'favs', 'aiElo', 'cloudmeta'].forEach(k => { try { localStorage.removeItem('versus.' + k); } catch (e) { } });
      if (V.reloadLocal) V.reloadLocal();
      emit();
    },
    async rename(newName) {
      const nn = check(await sb.rpc('change_username', { new_name: clean(newName) }));
      try { await sb.auth.refreshSession(); } catch (e) { }
      await loadInfo();
      return nn;
    },
    async deleteAccount(pw) {
      const u = C.user(); if (!u) throw new Error('Nicht eingeloggt.');
      // guests have no password
      // an account made with Discord has no password the player knows (the account tab asks for the name instead)
      const noPw = info && info.discord && info.discord.pw === false;
      if (!u.anon && !noPw) check(await sb.auth.signInWithPassword({ email: u.username + '@' + MAIL, password: pw, options: { captchaToken: await captcha() } }));
      clearTimeout(timer); clearInterval(beat);
      check(await sb.rpc('delete_account'));
      leaving = true; try { await sb.auth.signOut(); } catch (e) { } leaving = false;
      user = null; info = null; state.status = 'guest';
      ['stats', 'seen', 'setup', 'recent', 'recents', 'favs', 'aiElo', 'cloudmeta'].forEach(k => { try { localStorage.removeItem('versus.' + k); } catch (e) { } });
      if (V.reloadLocal) V.reloadLocal();
      emit();
    },
    async syncNow() { if (!user) return; try { await pull(); } catch (e) { state.status = 'error'; state.error = e.message; emit(); } },
    async rpc(name, args) { await need(); return check(await sb.rpc(name, args || {})); },
    channel,
    // a single poke on a channel we do not listen to (e.g. the invitation channel of another player)
    poke(name) { const c = channel(name, () => { }, true); setTimeout(() => c.close(), 4000); },
    touch,
    changed(key) { if (KEYS.includes(key)) schedule(); }
  };
})();
