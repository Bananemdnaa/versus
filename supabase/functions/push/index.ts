// Versus: sends push notifications (Web Push with VAPID). Called by the database (public.push_notify) via pg_net.
// Secrets: VAPID_PUBLIC, VAPID_PRIVATE, PUSH_SECRET (same value as the vault entry push_secret).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set by Supabase itself.
// In the dashboard turn "Enforce JWT verification" off for this function: the database sends the shared secret instead.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GAMES: Record<string, string> = {
  c4: '4 Gewinnt', ttt: 'Tic Tac Toe', uttt: 'Ultimate Tic Tac Toe', chess: 'Schach', checkers: 'Dame', reversi: 'Reversi',
  mill: 'Mühle', dots: 'Käsekästchen', ships: 'Schiffe versenken', gomoku: 'Fünf in einer Reihe', kalaha: 'Kalaha', go: 'Go', backgammon: 'Backgammon'
};

Deno.serve(async req => {
  if (req.method !== 'POST' || req.headers.get('x-push-secret') !== Deno.env.get('PUSH_SECRET')) return new Response('no', { status: 401 });
  // with the right secret the reason of a failure comes back as text (missing secret, bad key …)
  try { return await send(await req.json()); }
  catch (e) { return new Response('error: ' + (e instanceof Error ? e.message : String(e)), { status: 500 }); }
});

async function send({ uid, kind, from, game, match }: { uid?: string, kind?: string, from?: string, game?: string, match?: string }) {
  for (const k of ['VAPID_PUBLIC', 'VAPID_PRIVATE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) if (!Deno.env.get(k)) throw new Error('secret missing: ' + k);
  const g = GAMES[game] || game || '';
  const text = {
    invite: { title: `${from} fordert dich heraus`, body: `${g} · öffne Versus, um anzunehmen`, url: '?tab=online' },
    invite_async: { title: `${from} will eine Partie über Tage`, body: `${g} · jeder zieht, wann er Zeit hat`, url: '?tab=online' },
    accepted: { title: `${from} spielt mit`, body: `${g} über Tage hat begonnen`, url: match ? `?match=${match}` : '?tab=online' },
    turn: { title: 'Du bist dran', body: `${g} gegen ${from}`, url: match ? `?match=${match}` : '?tab=online' },
    friend: { title: `${from} möchte dein Freund sein`, body: 'In Versus annehmen oder ablehnen', url: '?tab=online' }
  }[kind as string];
  if (!uid || !text) return new Response('bad', { status: 400 });

  webpush.setVapidDetails('https://bananemdnaa.github.io/versus/', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: subs } = await sb.from('push_subs').select('endpoint, p256dh, auth').eq('uid', uid);
  const payload = JSON.stringify({ ...text, tag: kind === 'turn' && match ? 'turn-' + match : kind });
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      // the browser dropped the subscription: forget it
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from('push_subs').delete().eq('endpoint', s.endpoint);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
}
