// Versus in Discord: signing in without the Cloudflare captcha. Discord blocks the captcha's frame inside activities,
// but Supabase asks every login for a captcha token once it is switched on. This function checks with Discord that
// the request comes from someone in our activity (a valid Discord access token for this app, from "discord-token"),
// and then sends the login to Supabase Auth with the service role key, which Supabase lets through without a captcha.
// kind: 'guest' (anonymous account), 'login' (name + password), 'signup' (new account). Only our own login addresses.
// "Enforce JWT verification" is OFF (players call it before they have a Versus login).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set by Supabase.
const CLIENT_ID = '1565782186832039987';
const MAIL = '@bananemdnaa.github.io';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('secret missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    const b = await req.json().catch(() => ({}));
    const kind = String(b.kind || ''), token = typeof b.access_token === 'string' ? b.access_token : '';
    if (!['guest', 'login', 'signup'].includes(kind)) return json({ error: 'kind?' }, 400);
    if (!token || token.length > 200) return json({ error: 'discord token missing' }, 400);
    // 1. is this really someone in our activity? The token must belong to our app.
    const info = await fetch('https://discord.com/api/oauth2/@me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await info.json().catch(() => ({}));
    if (!info.ok || !d.application || d.application.id !== CLIENT_ID || !d.user) return json({ error: 'discord check failed' }, 401);
    // 2. only our own addresses (name@bananemdnaa.github.io), never someone else's mail
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    if (kind !== 'guest' && (!email.endsWith(MAIL) || email.length > 60 || password.length < 6 || password.length > 72)) return json({ error: 'name or password' }, 400);
    // 3. the login itself, with the service role key (no captcha)
    const path = kind === 'login' ? '/auth/v1/token?grant_type=password' : '/auth/v1/signup';
    const body = kind === 'login' ? { email, password }
      : kind === 'signup' ? { email, password, data: { username: email.slice(0, -MAIL.length) } }
      : { data: {} };
    const r = await fetch(url + path, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const s = await r.json().catch(() => ({}));
    if (!r.ok || !s.access_token) return json({ error: s.msg || s.error_description || s.message || s.error || 'auth ' + r.status }, r.status >= 400 && r.status < 500 ? r.status : 500);
    return json({ access_token: s.access_token, refresh_token: s.refresh_token });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
