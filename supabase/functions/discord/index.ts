// Versus in Discord: swaps the one-time code from the activity (sdk.commands.authorize, js/discord.js) for the
// player's Discord name and gives the signed-in guest that name instead of gast_12345 (public.discord_guest_name).
// Secret: DISCORD_CLIENT_SECRET (Developer Portal → OAuth2). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set by Supabase.
// "Enforce JWT verification" stays on: only signed-in Versus players (guests) may call it.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CLIENT_ID = '1565782186832039987';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    for (const k of ['DISCORD_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) if (!Deno.env.get(k)) throw new Error('secret missing: ' + k);
    const { code } = await req.json().catch(() => ({}));
    if (!code || typeof code !== 'string') return json({ error: 'code missing' }, 400);
    // who is asking: the Versus player from the Authorization header
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error } = await sb.auth.getUser(jwt);
    if (error || !user) return json({ error: 'not signed in' }, 401);
    // code → access token → Discord user (the token is only used here and never stored)
    const tok = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: Deno.env.get('DISCORD_CLIENT_SECRET')!, grant_type: 'authorization_code', code })
    });
    const t = await tok.json().catch(() => ({}));
    if (!tok.ok || !t.access_token) return json({ error: 'discord token: ' + (t.error_description || t.error || tok.status) }, 400);
    const me = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + t.access_token } });
    const d = await me.json().catch(() => ({}));
    if (!me.ok || !d.username) return json({ error: 'discord user: ' + me.status }, 400);
    const { data: name, error: e2 } = await sb.rpc('discord_guest_name', { u: user.id, wanted: d.username });
    if (e2) throw new Error(e2.message);
    return json({ name });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
