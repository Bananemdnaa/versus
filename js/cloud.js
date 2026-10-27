// Versus: online accounts through Supabase. Login with username + password, cloud copy of stats,
// settings and tutorials, heartbeat for the online list, admin RPCs.
(function () {
  'use strict';

  // Project URL and publishable key from Supabase (Settings → API). Both are public by design;
  // the database protects itself with row level security and server-side checks.
  const CFG = { url: 'https://ygnngmtvncmdunsdnwtk.supabase.co', key: 'sb_publishable_DWz8MXxA0PM-rQOqnVMJGQ_FqadTjHg' };
  // Supabase needs an e-mail address internally; this domain is ours (GitHub Pages), no mails are sent.
  const MAIL = 'bananemdnaa.github.io';
  const NAME_RE = /^[a-z0-9_-]{3,16}$/;
  const KEYS = ['stats', 'seen', 'settings', 'setup', 'recent'];

  let sb = null, user = null, info = null, timer = null, beat = null, busy = false, again = false;
  const state = { status: 'off', last: 0, error: '' };
  const listeners = new Set();
  const emit = () => listeners.forEach(f => { try { f(); } catch (e) { } });

  try {
    if (CFG.url && CFG.key && window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'versus-auth' } });
      state.status = 'guest';
    }
  } catch (e) { sb = null; }

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
        local: { a: f((x.local || {}).a, (y.local || {}).a), b: f((x.local || {}).b, (y.local || {}).b), d: f((x.local || {}).d, (y.local || {}).d) }
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

  const C = V.cloud = {
    available: () => !!sb,
    user: () => (user ? { id: user.id, username: (info && info.username) || (user.user_metadata && user.user_metadata.username) || '' } : null),
    info: () => info,
    role: () => (info && info.role) || null,
    state: () => state,
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    async init() {
      if (!sb) return;
      try {
        const r = await sb.auth.getSession();
        user = r.data && r.data.session ? r.data.session.user : null;
      } catch (e) { user = null; }
      if (user) await afterLogin(); else emit();
    },
    async signUp(name, pw) {
      const u = clean(name);
      if (!NAME_RE.test(u)) throw new Error('Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.');
      if (String(pw).length < 6) throw new Error('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      const d = check(await sb.auth.signUp({ email: u + '@' + MAIL, password: pw, options: { data: { username: u } } }));
      if (!d.session) throw new Error('Konto angelegt, aber auf dem Server ist „Confirm email“ noch an.');
      user = d.user; await afterLogin();
    },
    async signIn(name, pw) {
      const d = check(await sb.auth.signInWithPassword({ email: clean(name) + '@' + MAIL, password: pw }));
      user = d.user; await afterLogin();
    },
    async signOut() {
      clearTimeout(timer);
      if (user) { try { await push(true); } catch (e) { } }
      clearInterval(beat);
      try { await sb.auth.signOut(); } catch (e) { }
      user = null; info = null; state.status = 'guest';
      // the account keeps its data; this browser goes back to a fresh guest
      ['stats', 'seen', 'setup', 'recent', 'cloudmeta'].forEach(k => { try { localStorage.removeItem('versus.' + k); } catch (e) { } });
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
      check(await sb.auth.signInWithPassword({ email: u.username + '@' + MAIL, password: pw }));
      clearTimeout(timer); clearInterval(beat);
      check(await sb.rpc('delete_account'));
      try { await sb.auth.signOut(); } catch (e) { }
      user = null; info = null; state.status = 'guest';
      ['stats', 'seen', 'setup', 'recent', 'cloudmeta'].forEach(k => { try { localStorage.removeItem('versus.' + k); } catch (e) { } });
      if (V.reloadLocal) V.reloadLocal();
      emit();
    },
    async syncNow() { if (!user) return; try { await pull(); } catch (e) { state.status = 'error'; state.error = e.message; emit(); } },
    async rpc(name, args) { return check(await sb.rpc(name, args || {})); },
    touch,
    changed(key) { if (KEYS.includes(key)) schedule(); }
  };
})();
