// Versus: the AI search off the main thread, so the page keeps animating and reacting while the AI thinks.
// js/ai.js (V.aiWorker) sends { id, ai, src, game, s, L, fast }: the worker loads js/ai.js and the game's own file
// once, then runs that game's brain(s, L) -> { move, mood } and answers { id, r } or { id, err }.
// A game file is written for the page, so everything it touches at load time that a worker lacks (V.css, V.tutor,
// document …) is a harmless stand-in. If brain() itself reaches one of those, it throws instead of computing with
// a fake value, and the page simply thinks on the main thread as before.
'use strict';
let thinking = false;
const stub = name => {
  const f = function () { if (thinking) throw new Error('aiworker: ' + name + ' is not available in the worker'); return p; };
  const p = new Proxy(f, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub(name + '.' + String(k))) });
  return p;
};
const base = {
  settings: {}, games: [], byId: {}, dev: null, worker: true,
  register(g) { base.games.push(g); base.byId[g.id] = g; },
  css() { },
  t: x => x,
  pick: a => a[Math.floor(Math.random() * a.length)],
  shuffle: a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
};
self.V = new Proxy(base, { get: (t, k) => (k in t ? t[k] : typeof k === 'symbol' ? undefined : stub('V.' + k)), set: (t, k, v) => { t[k] = v; return true; } });
// top-level code of a game file may read these; inside brain() they throw (see above)
if (typeof self.document === 'undefined') self.document = stub('document');
if (typeof self.window === 'undefined') self.window = self;

const loaded = new Set();
self.onmessage = e => {
  const { id, ai, src, game, s, L, fast } = e.data;
  try {
    if (!loaded.has(ai)) { importScripts(ai); loaded.add(ai); }
    if (!loaded.has(src)) { importScripts(src); loaded.add(src); }
    const g = base.byId[game];
    if (!g || typeof g.brain !== 'function') throw new Error('aiworker: no brain for ' + game);
    if (!('s' in e.data)) return;   // only warming up: the files are loaded now
    base.settings.aiFast = !!fast;
    thinking = true;
    let r;
    try { r = g.brain(s, L); } finally { thinking = false; }
    self.postMessage({ id, game, r });
  } catch (err) {
    self.postMessage({ id, game, err: String(err && err.message || err) });
  }
};
