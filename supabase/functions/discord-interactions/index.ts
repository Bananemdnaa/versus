// Versus: Discord slash commands. Developer Portal → General Information → Interactions Endpoint URL points here.
// /versus starts the activity, /rules <game> shows a game's short rules (German or English after the Discord language).
// The rules come from games/rules.json on the site (written by tools/pages.ps1), the commands are registered with
// tools/discord-commands.ps1. Discord signs every request; it is checked with the app's public key (public by design).
// In the dashboard turn "Enforce JWT verification" OFF for this function: Discord sends no Supabase login.
import nacl from 'npm:tweetnacl@1.0.3';

const PUBLIC_KEY = 'f3467330598b37d14ddcca64c7d68065beb959526fca4c254fd9f70b7b0825ea';
const RULES_URL = 'https://bananemdnaa.github.io/versus/games/rules.json';

type Game = { id: string, name: string, short: string, desc: string, cat: string, players: string, url: string, tut: { t: string, d: string }[] };
type Option = { name: string, value?: string, focused?: boolean };

const hex = (s: string) => new Uint8Array((s.match(/../g) || []).map(h => parseInt(h, 16)));
const reply = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// the rules change rarely: keep them for ten minutes
let cache: { at: number, data: Record<string, Game[]> } | null = null;
async function rules(lang: string): Promise<Game[]> {
  if (!cache || Date.now() - cache.at > 600000) {
    try { const r = await fetch(RULES_URL); if (r.ok) cache = { at: Date.now(), data: await r.json() }; } catch { /* keep the old copy */ }
  }
  return (cache && cache.data[lang]) || [];
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const sig = req.headers.get('X-Signature-Ed25519') || '', ts = req.headers.get('X-Signature-Timestamp') || '';
  const body = await req.text();
  let ok = false;
  try { ok = nacl.sign.detached.verify(new TextEncoder().encode(ts + body), hex(sig), hex(PUBLIC_KEY)); } catch { ok = false; }
  if (!ok) return new Response('bad signature', { status: 401 });

  const i = JSON.parse(body);
  if (i.type === 1) return reply({ type: 1 }); // PING when the URL is saved in the portal
  const de = String(i.locale || '').startsWith('de'), lang = de ? 'de' : 'en';
  const name = i.data && i.data.name, opts: Option[] = (i.data && i.data.options) || [];

  // /versus: open the activity (LAUNCH_ACTIVITY)
  if (i.type === 2 && name === 'versus') return reply({ type: 12 });

  // /rules: suggestions while typing the game (Discord allows 25)
  if (i.type === 4 && name === 'rules') {
    const q = String((opts.find(o => o.focused) || {}).value || '').toLowerCase();
    const list = (await rules(lang)).filter(g => !q || g.name.toLowerCase().includes(q)).slice(0, 25);
    return reply({ type: 8, data: { choices: list.map(g => ({ name: g.name, value: g.id })) } });
  }

  // /rules <game>: name, short text and the first steps of the game's tutorial, with a link to the full page
  if (i.type === 2 && name === 'rules') {
    const want = String((opts.find(o => o.name === 'game') || {}).value || '').toLowerCase();
    const g = (await rules(lang)).find(x => x.id === want || x.name.toLowerCase() === want);
    if (!g) return reply({ type: 4, data: { flags: 64, content: de ? 'Dieses Spiel kenne ich nicht.' : "I don't know that game." } });
    const players = g.players === '2' ? (de ? '2 Spieler' : '2 players') : (de ? '2–4 Spieler' : '2–4 players');
    return reply({
      type: 4, data: {
        embeds: [{
          title: g.name, url: g.url, color: 0xff4fd8, description: cut(g.short + '\n' + g.desc, 1000),
          fields: g.tut.slice(0, 4).map(s => ({ name: cut(s.t, 256), value: cut(s.d, 1024) })),
          footer: { text: players + ' · ' + g.cat + ' · Versus' }
        }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: de ? 'Alle Regeln' : 'Full rules', url: g.url }] }]
      }
    });
  }
  return reply({ type: 4, data: { flags: 64, content: de ? 'Diesen Befehl kenne ich nicht.' : "I don't know that command." } });
});
