// Versus: online accounts through Supabase. Login with username + password, cloud copy of stats,
// settings and tutorials, heartbeat for the online list, admin RPCs.
(function () {
  'use strict';

  // Project URL and publishable key from Supabase (Settings → API). Both are public by design;
  // the database protects itself with row level security and server-side checks.
  const CFG = { url: 'https://ygnngmtvncmdunsdnwtk.supabase.co', key: 'sb_publishable_DWz8MXxA0PM-rQOqnVMJGQ_FqadTjHg' };
  // Cloudflare Turnstile site key (public). Empty = no captcha. Set it together with Supabase → Attack Protection → Captcha,
  // because once the captcha is on there, every sign-up, login and guest login needs a token.
  const TURNSTILE = '';
  // Supabase needs an e-mail address internally; this domain is ours (GitHub Pages), no mails are sent.
  const MAIL = 'bananemdnaa.github.io';
  const NAME_RE = /^[a-z0-9_-]{3,16}$/;
  const KEYS = ['stats', 'seen', 'settings', 'setup', 'recent', 'recents', 'favs'];

  let sb = null, user = null, info = null, timer = null, beat = null, busy = false, again = false;
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
      try { sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'versus-auth' } }); state.status = 'guest'; }
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
    emit();
  }
  async function afterLogin() {
    state.status = 'sync'; emit();
    await loadInfo();
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
      const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
      s.onload = () => res(); s.onerror = () => { tsLib = null; rej(new Error('Die Sicherheitsprüfung lädt gerade nicht.')); };
      document.head.appendChild(s);
    });
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
    }));
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
      ch.on('broadcast', { event: 'poke' }, () => { if (!closed) onPoke(); });
      ch.subscribe(st => {
        const was = live; live = st === 'SUBSCRIBED';
        if (live && !was && hello) send();
      });
    });
    const send = () => { if (live && ch) ch.send({ type: 'broadcast', event: 'poke', payload: {} }).catch(() => { }); };
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
      starting = false;
      if (user) await afterLogin(); else emit();
    },
    async signUp(name, pw) {
      await need();
      const u = clean(name);
      if (!NAME_RE.test(u)) throw new Error('Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.');
      if (String(pw).length < 6) throw new Error('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      await paused('signups');
      const d = check(await sb.auth.signUp({ email: u + '@' + MAIL, password: pw, options: { data: { username: u }, captchaToken: await captcha() } }));
      if (!d.session) throw new Error('Konto angelegt, aber auf dem Server ist „Confirm email“ noch an.');
      user = d.user; await afterLogin();
    },
    async signIn(name, pw) {
      await need();
      const d = check(await sb.auth.signInWithPassword({ email: clean(name) + '@' + MAIL, password: pw, options: { captchaToken: await captcha() } }));
      user = d.user; await afterLogin();
    },
    // guest: an anonymous account with a name like gast_48213, enough for quick online matches
    async signInGuest() {
      await need();
      if (user) return;
      await paused('guests');
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
      try { await sb.auth.signOut(); } catch (e) { }
      user = null; info = null; state.status = 'guest';
      // the account keeps its data; this browser goes back to a fresh guest
      ['stats', 'seen', 'setup', 'recent', 'recents', 'favs', 'cloudmeta'].forEach(k => { try { localStorage.removeItem('versus.' + k); } catch (e) { } });
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
      if (!u.anon) check(await sb.auth.signInWithPassword({ email: u.username + '@' + MAIL, password: pw, options: { captchaToken: await captcha() } }));
      clearTimeout(timer); clearInterval(beat);
      check(await sb.rpc('delete_account'));
      try { await sb.auth.signOut(); } catch (e) { }
      user = null; info = null; state.status = 'guest';
      ['stats', 'seen', 'setup', 'recent', 'recents', 'favs', 'cloudmeta'].forEach(k => { try { localStorage.removeItem('versus.' + k); } catch (e) { } });
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
