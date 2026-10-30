// Versus in Discord: swaps the one-time code from the activity (sdk.commands.authorize, js/discord.js) for an access
// token, so the activity can sign in to Discord (sdk.commands.authenticate) and show what you play in your Discord status.
// Every player in the activity calls this, also before they have a Versus login, so "Enforce JWT verification" is OFF.
// The code only works once and only for this app; the token goes back to the player and is never stored here.
// Secret: DISCORD_CLIENT_SECRET (the same as for the function "discord").
const CLIENT_ID = '1565782186832039987';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const secret = Deno.env.get('DISCORD_CLIENT_SECRET');
    if (!secret) throw new Error('secret missing: DISCORD_CLIENT_SECRET');
    const { code } = await req.json().catch(() => ({}));
    if (!code || typeof code !== 'string' || code.length > 200) return json({ error: 'code missing' }, 400);
    const tok = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: secret, grant_type: 'authorization_code', code })
    });
    const t = await tok.json().catch(() => ({}));
    if (!tok.ok || !t.access_token) return json({ error: 'discord token: ' + (t.error_description || t.error || tok.status) }, 400);
    return json({ access_token: t.access_token });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
