// Versus as a Discord Activity. Discord opens the site in a frame on <app id>.discordsays.com and passes
// frame_id, instance_id, channel_id, … in the address. Everything has to go through Discord's proxy there; the
// URL mappings live in the Developer Portal: / → bananemdnaa.github.io/versus, /supabase → the Supabase project.
(function () {
  'use strict';
  const CLIENT_ID = '1565782186832039987';
  const SITE = 'https://bananemdnaa.github.io/versus/';
  const q = new URLSearchParams(location.search);
  // proxy: really on Discord's domain (requests to other hosts are blocked there and go through /.proxy/…)
  const proxy = /\.discordsays\.com$/.test(location.hostname);
  const on = proxy || (q.has('frame_id') && q.has('instance_id'));
  // instance: everybody who started the activity in the same voice channel shares it
  V.discord = {
    on, proxy, instance: q.get('instance_id') || '', channel: q.get('channel_id') || '', guild: q.get('guild_id') || '', platform: q.get('platform') || '',
    sdk: null, ready: Promise.resolve(null), auth: Promise.resolve(null), status() { }
  };
  if (!on) return;
  document.documentElement.classList.add('discord');
  // the SDK (stored in the project, see js/vendor) shakes hands with the Discord client; the menus never wait for it
  V.discord.ready = import('./vendor/discord-sdk.mjs').then(async m => {
    const sdk = new m.DiscordSDK(CLIENT_ID);
    await sdk.ready();
    V.discord.sdk = sdk;
    return sdk;
  }).catch(e => { console.warn('Discord SDK:', e); return null; });

  // signing in to Discord (Discord asks the player once): for the status below and for guest names (js/cloud.js).
  // The code is swapped for a token by the Edge Function "discord-token"; the token stays in this tab.
  V.discord.auth = V.discord.ready.then(async sdk => {
    if (!sdk || !V.cloud) return null;
    const { code } = await sdk.commands.authorize({ client_id: CLIENT_ID, response_type: 'code', state: '', prompt: 'none', scope: ['identify', 'rpc.activities.write'] });
    const token = await V.cloud.discordToken(code);
    const a = await sdk.commands.authenticate({ access_token: token });
    return { token, user: a && a.user };
  }).catch(e => { console.warn('Discord login:', e); return null; });

  // what you play shows in your Discord status (Rich Presence): details = game, state = mode, picture = the game's icon
  // (icons/games/<id>.png on the site), the time counts from when the game changed. Same text twice is not sent again.
  let last = '', lastDetails = '', since = Math.floor(Date.now() / 1000);
  V.discord.status = (details, state, game, party) => {
    V.discord.auth.then(a => {
      if (!a || !V.discord.sdk) return;
      const key = JSON.stringify([details, state, game, party]);
      if (key === last) return;
      last = key;
      if (details !== lastDetails) { lastDetails = details; since = Math.floor(Date.now() / 1000); }
      const activity = {
        type: 0, details, state, timestamps: { start: since },
        assets: game ? { large_image: SITE + 'icons/games/' + game + '.png', large_text: details, small_image: SITE + 'icons/icon-192.png', small_text: 'Versus' }
          : { large_image: SITE + 'icons/icon-512.png', large_text: 'Versus' }
      };
      if (party) activity.party = { size: party };
      V.discord.sdk.commands.setActivity({ activity }).catch(e => console.warn('Discord status:', e));
    });
  };
})();
