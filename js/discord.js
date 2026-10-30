// Versus as a Discord Activity. Discord opens the site in a frame on <app id>.discordsays.com and passes
// frame_id, instance_id, channel_id, … in the address. Everything has to go through Discord's proxy there; the
// URL mappings live in the Developer Portal: / → bananemdnaa.github.io/versus, /supabase → the Supabase project.
(function () {
  'use strict';
  const CLIENT_ID = '1565782186832039987';
  const q = new URLSearchParams(location.search);
  // proxy: really on Discord's domain (requests to other hosts are blocked there and go through /.proxy/…)
  const proxy = /\.discordsays\.com$/.test(location.hostname);
  const on = proxy || (q.has('frame_id') && q.has('instance_id'));
  // instance: everybody who started the activity in the same voice channel shares it
  V.discord = { on, proxy, instance: q.get('instance_id') || '', channel: q.get('channel_id') || '', guild: q.get('guild_id') || '', platform: q.get('platform') || '', sdk: null, ready: Promise.resolve(null) };
  if (!on) return;
  document.documentElement.classList.add('discord');
  // the SDK (stored in the project, see js/vendor) shakes hands with the Discord client; the menus never wait for it
  V.discord.ready = import('./vendor/discord-sdk.mjs').then(async m => {
    const sdk = new m.DiscordSDK(CLIENT_ID);
    await sdk.ready();
    V.discord.sdk = sdk;
    // a one-time code for the Discord name (js/cloud.js swaps it on the server); Discord asks the player once
    V.discord.authorize = async () => (await sdk.commands.authorize({ client_id: CLIENT_ID, response_type: 'code', state: '', prompt: 'none', scope: ['identify'] })).code;
    return sdk;
  }).catch(e => { console.warn('Discord SDK:', e); return null; });
})();
