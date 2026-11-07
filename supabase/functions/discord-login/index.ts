// Versus: "Mit Discord anmelden" on the website and in the Discord activity, plus linking Discord to an account.
// The player proves who they are on Discord with
//   - code + redirect_uri (website: back from discord.com/oauth2/authorize, scope identify), or
//   - access_token (activity: the token from "discord-token"), or
//   - ticket (handed out by this function a few minutes earlier, so the one-time code is not needed twice).
// action
//   'login'  → linked: a Versus session { access_token, refresh_token }; not linked: { ticket, suggest, dname }
//   'create' → new account (or the signed-in guest becomes one) with the chosen name, linked, plus a session
//   'link'   → links Discord to the signed-in account (Authorization: the player's Versus login)
// The session is made like a magic link (generateLink + verifyOtp); no mail is ever sent, the addresses are internal.
// Database side: supabase/migrations/20261208000000_discord_login.sql.
// "Enforce JWT verification" is OFF (players call it before they have a Versus login); the function checks logins itself.
// Secrets: DISCORD_CLIENT_SECRET (as for "discord-token"); SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are set by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CLIENT_ID = '1565782186832039987';
const MAIL = '@bananemdnaa.github.io';
// where discord.com may send players back to (must also be listed in the Developer Portal → OAuth2 → Redirects)
const REDIRECTS = ['https://bananemdnaa.github.io/versus/', 'http://localhost:8771/', 'http://localhost:8772/', 'http://localhost:8773/'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Fail extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(s: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(Deno.env.get('DISCORD_CLIENT_SECRET')! + ':versus-ticket'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(s))));
}
// a ticket: who this is on Discord, valid for 15 minutes, signed so nobody can make one up
async function makeTicket(d: { id: string, name: string }) {
  const body = b64(enc.encode(JSON.stringify({ id: d.id, name: d.name, exp: Date.now() + 15 * 60000 })));
  return body + '.' + await hmac(body);
}
async function readTicket(t: string) {
  const [body, sig] = String(t).split('.');
  if (!body || !sig || sig !== await hmac(body)) throw new Fail('Die Anmeldung über Discord ist abgelaufen. Versuch es nochmal.', 401);
  const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
  if (!d.id || d.exp < Date.now()) throw new Fail('Die Anmeldung über Discord ist abgelaufen. Versuch es nochmal.', 401);
  return { id: String(d.id), name: String(d.name || '') };
}

// who is this on Discord? (id and a display name; never stored beyond the link itself)
async function discordUser(b: Record<string, unknown>): Promise<{ id: string, name: string }> {
  if (typeof b.ticket === 'string' && b.ticket) return readTicket(b.ticket);
  let token = typeof b.access_token === 'string' ? b.access_token : '';
  if (!token) {
    const code = typeof b.code === 'string' ? b.code : '', redirect = typeof b.redirect_uri === 'string' ? b.redirect_uri : '';
    if (!code || code.length > 200) throw new Fail('Discord-Code fehlt.');
    if (!REDIRECTS.includes(redirect)) throw new Fail('Diese Adresse ist für die Anmeldung über Discord nicht freigegeben.');
    const tok = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: Deno.env.get('DISCORD_CLIENT_SECRET')!, grant_type: 'authorization_code', code, redirect_uri: redirect })
    });
    const t = await tok.json().catch(() => ({}));
    if (!tok.ok || !t.access_token) throw new Fail('Discord hat die Anmeldung nicht bestätigt. Versuch es nochmal.', 401);
    token = t.access_token;
  }
  if (token.length > 200) throw new Fail('Discord-Token ungültig.', 401);
  // the token must belong to our app (a token of another app must not log in here)
  const r = await fetch('https://discord.com/api/oauth2/@me', { headers: { Authorization: 'Bearer ' + token } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.application || d.application.id !== CLIENT_ID || !d.user || !d.user.id) throw new Fail('Discord hat die Anmeldung nicht bestätigt.', 401);
  return { id: String(d.user.id), name: String(d.user.global_name || d.user.username || '') };
}

// a Versus name from the Discord name: a–z, 0–9, _ and -, 3 to 16 characters
const suggest = (n: string) => {
  let s = n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 16);
  if (s.length < 3) s = (s + '_dc').slice(0, 16);
  return s;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    for (const k of ['DISCORD_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) if (!Deno.env.get(k)) throw new Error('secret missing: ' + k);
    const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(b.action || 'login');
    if (!['login', 'create', 'link'].includes(action)) throw new Fail('action?');

    // the signed-in Versus player, if any (needed for 'link'; for 'create' a guest becomes the new account)
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const me = async () => { if (!jwt) return null; const { data } = await sb.auth.getUser(jwt); return data && data.user ? data.user : null; };
    const rpc = async (fn: string, args: Record<string, unknown>) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Fail(error.message); return data; };

    // a session for an account, without a password (as if a magic link had been opened)
    const session = async (email: string) => {
      const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email });
      if (error || !data || !data.properties) throw new Error('link: ' + (error && error.message));
      // a client of its own: verifyOtp puts the new session into the client, the service client must stay the service
      const v = await createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.verifyOtp({ type: 'magiclink', token_hash: data.properties.hashed_token });
      if (v.error || !v.data.session) throw new Fail(/banned/i.test((v.error && v.error.message) || '') ? 'Dieses Konto ist gesperrt.' : 'Anmelden hat nicht geklappt: ' + (v.error && v.error.message), 403);
      return { access_token: v.data.session.access_token, refresh_token: v.data.session.refresh_token };
    };

    const dc = await discordUser(b);

    if (action === 'link') {
      const u = await me();
      if (!u) throw new Fail('Nicht eingeloggt.', 401);
      await rpc('discord_link', { u: u.id, did: dc.id, dname: dc.name, known: true });
      return json({ linked: dc.name });
    }

    const found = await rpc('discord_lookup', { did: dc.id }) as { id: string, email: string } | null;

    if (action === 'login') {
      if (found && found.email) return json(await session(found.email));
      // not linked yet: the player picks a name (or logs in and links); the ticket saves a second trip to Discord
      return json({ ticket: await makeTicket(dc), suggest: suggest(dc.name), dname: dc.name });
    }

    // create
    if (found) throw new Fail('Dieses Discord-Konto ist schon mit einem anderen Versus-Konto verknüpft.');
    const name = String(b.name || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,16}$/.test(name)) throw new Fail('Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.');
    const u = await me();
    // guests: anonymous accounts, also those the activity renamed after the Discord name (profiles.guest)
    const guest = u && (u.is_anonymous || !!(await sb.from('profiles').select('guest').eq('id', u.id).maybeSingle()).data?.guest);
    if (u && guest) {
      // the guest keeps everything and becomes a real account
      const nn = await rpc('discord_claim_guest', { u: u.id, new_name: name, did: dc.id, dname: dc.name }) as string;
      return json({ ...(await session(nn + MAIL)), created: nn });
    }
    const taken = await sb.from('profiles').select('id').eq('username', name).maybeSingle();
    if (taken.data) throw new Fail('Diesen Benutzernamen gibt es schon.');
    const made = await sb.auth.admin.createUser({ email: name + MAIL, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true, user_metadata: { username: name } });
    if (made.error || !made.data.user) {
      const m = (made.error && made.error.message) || '';
      throw new Fail(/database error/i.test(m) ? 'Dieser Benutzername ist nicht erlaubt, oder neue Konten sind gerade pausiert.' : /already/i.test(m) ? 'Diesen Benutzernamen gibt es schon.' : m || 'Konto anlegen hat nicht geklappt.');
    }
    await rpc('discord_link', { u: made.data.user.id, did: dc.id, dname: dc.name, known: false });
    return json({ ...(await session(name + MAIL)), created: name });
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
