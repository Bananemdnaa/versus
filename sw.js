// Versus service worker: makes the app installable and playable offline (AI and two-player games).
// Online features (accounts, friends, matches) talk to Supabase directly and are never cached.
const CACHE = 'versus-v22';

// On install, everything index.html loads is cached, so the very first visit already works offline later.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const res = await fetch('./index.html', { cache: 'no-store' });
    const html = await res.clone().text();
    await c.put('./', res.clone());
    await c.put('./index.html', res);
    const urls = new Set(['./manifest.webmanifest', './favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png']);
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
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put('./', r.clone())); return r; })
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
