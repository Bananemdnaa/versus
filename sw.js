// Versus service worker: makes the app installable and playable offline (AI and two-player games).
// Online features (accounts, friends, matches) talk to Supabase directly and are never cached.
const CACHE = 'versus-v66';

// On install, everything index.html loads is cached, so the very first visit already works offline later.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const res = await fetch('./index.html', { cache: 'no-store' });
    const html = await res.clone().text();
    await c.put('./', res.clone());
    await c.put('./index.html', res);
    const urls = new Set(['./manifest.webmanifest', './favicon.svg', './fonts/saira.woff2', './fonts/saira-condensed-600.woff2', './fonts/saira-condensed-700.woff2', './fonts/saira-condensed-800.woff2', './js/vendor/supabase.js', './js/vendor/qrcode.js', './rechtliches.html', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png']);
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const u = m[1];
      if (/^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com)/.test(u) || !/^(https?:|data:|#)/.test(u)) urls.add(u);
    }
    await Promise.all([...urls].map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// the page asks the waiting worker to take over when the player taps "Neu laden"
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/supabase\.co$/.test(url.hostname)) return;
  // pages: network first (so updates arrive), cached copy when offline
  // (only the app itself is stored as './', not other pages like test.html)
  if (req.mode === 'navigate') {
    // (the game pages in games/ and de/spiele/ end in / too, so compare with the app folder itself)
    const home = new URL('./', self.registration.scope).pathname;
    const app = url.pathname === home || url.pathname === home + 'index.html';
    e.respondWith(fetch(req).then(r => { if (app && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); } return r; })
      .catch(async () => (await caches.match('./')) || (await caches.match('./index.html'))));
    return;
  }
  const own = url.origin === self.location.origin;
  const cdn = /^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!own && !cdn) return;
  // files: cache first (they carry a ?v= version), fill the cache on the way
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});

// push notifications (challenges, your turn in a match over days, friend requests); sent by supabase/functions/push
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Versus', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Versus', {
    body: d.body || '', tag: d.tag || 'versus', renotify: true, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: d.url || '' }
  }));
});
// a tap opens Versus (or brings it to the front) at the match or the Online tab
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url ? e.notification.data.url : './', self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(self.registration.scope)) { await c.focus(); c.postMessage({ open: url }); return; }
    await self.clients.openWindow(url);
  })());
});
