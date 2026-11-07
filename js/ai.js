// Versus: AI helpers shared by the games (alpha-beta search, soft choice for the weaker levels, Monte Carlo).
(function () {
  'use strict';
  // Dev-Konten: what the helpers computed goes to the dev panel (js/devtools.js); for everyone else dv() is null
  const dv = () => (V.dev && V.dev.active ? V.dev : null);

  // "Schnelle KI" (Optionen): the AI thinks about a third as long, at most 0.9 s, so every game answers quickly
  V.aiMs = ms => (V.settings && V.settings.aiFast ? Math.min(ms, 900, Math.max(150, Math.round(ms * 0.3))) : ms);

  // Negamax with alpha-beta and iterative deepening.
  // g.moves(s), g.play(s,m) -> new state, g.over(s,ply) -> null | score for side to move, g.eval(s) -> score for side to move.
  V.search = function (g, s, maxDepth, timeMs = 1500) {
    const t0 = performance.now(), deadline = t0 + V.aiMs(timeMs), D = dv(), path = [];
    let root = null, reached = 0;
    let nodes = 0, stop = false;
    function nm(s, d, a, b, ply) {
      const t = g.over(s, ply); if (t !== null) return t;
      if (d <= 0) return g.eval(s);
      if ((++nodes & 511) === 0 && performance.now() > deadline) stop = true;
      if (stop) return 0;
      let ms = g.moves(s); if (g.order) ms = g.order(s, ms);
      let best = -1e9;
      for (const m of ms) {
        const v = -nm(g.play(s, m), d - 1, -b, -a, ply + 1);
        if (v > best) best = v;
        if (v > a) a = v;
        if (a >= b) break;
      }
      return best;
    }
    let rootMoves = V.shuffle(g.moves(s).slice());
    if (g.order) rootMoves = g.order(s, rootMoves);
    let bestMove = rootMoves[0], bestScore = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
      let a = -1e9, bm = null; const sc = D ? [] : null;
      for (const m of rootMoves) {
        const v = -nm(g.play(s, m), depth - 1, -1e9, -a, 1);
        if (stop) break;
        // with the narrowing window only a new best is exact, the others are upper bounds
        if (sc) sc.push({ m, v, exact: v > a });
        if (v > a) { a = v; bm = m; }
      }
      if (stop && depth > 1) break;
      if (bm !== null) { bestMove = bm; bestScore = a; rootMoves = [bm, ...rootMoves.filter(x => x !== bm)]; reached = depth; if (D) { root = sc; path.push({ d: depth, m: bm, v: a }); } }
      if (Math.abs(a) > 90000) break;
      if (stop) break;
    }
    if (D) D.ai('search', { depth: reached, maxDepth, nodes, ms: Math.round(performance.now() - t0), timeout: stop, score: bestScore, move: bestMove,
      root: root && root.slice().sort((x, y) => y.v - x.v).slice(0, 10), path });
    return { move: bestMove, score: bestScore };
  };

  // Exact score for every root move (full window). The weaker levels use it to play like a person:
  // usually a good move, sometimes a decent one, almost never a terrible one.
  V.searchAll = function (g, s, depth, timeMs = 1200) {
    const t0 = performance.now(), deadline = t0 + V.aiMs(timeMs);
    let nodes = 0, stop = false;
    function nm(s, d, a, b, ply) {
      const t = g.over(s, ply); if (t !== null) return t;
      if (d <= 0) return g.eval(s);
      if ((++nodes & 511) === 0 && performance.now() > deadline) stop = true;
      if (stop) return g.eval(s);
      let ms = g.moves(s); if (g.order) ms = g.order(s, ms);
      let best = -1e9;
      for (const m of ms) {
        const v = -nm(g.play(s, m), d - 1, -b, -a, ply + 1);
        if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
      }
      return best;
    }
    const out = g.moves(s).map(m => ({ m, v: -nm(g.play(s, m), depth - 1, -1e9, 1e9, 1) }));
    const D = dv(); if (D) D.ai('searchAll', { depth, count: out.length, nodes, ms: Math.round(performance.now() - t0), timeout: stop, top: out.slice().sort((x, y) => y.v - x.v).slice(0, 10) });
    return out;
  };
  // Softmax choice over scored moves; temp is in the game's own score units (0 = always the best move).
  V.pickSoft = function (scored, temp) {
    let best = scored[0];
    for (const x of scored) if (x.v > best.v) best = x;
    const D = dv();
    if (!temp) { const top = scored.filter(x => x.v === best.v); if (D) D.ai('pickSoft', { temp, best: true, chosenV: best.v, bestV: best.v }); return { move: V.pick(top).m, score: best.v }; }
    const cl = v => Math.max(-3000, Math.min(3000, v));
    const w = scored.map(x => Math.exp((cl(x.v) - cl(best.v)) / temp));
    const sum = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < scored.length; i++) {
      r -= w[i];
      if (r <= 0) { if (D) D.ai('pickSoft', { temp, best: scored[i].v === best.v, chosenV: scored[i].v, bestV: best.v, p: w[i] / sum }); return { move: scored[i].m, score: best.v }; }
    }
    return { move: best.m, score: best.v };
  };
  // Beginner level: a share of plain random moves on top of a very loose soft choice,
  // so it misses threats and sometimes even its own win.
  V.weak = function (scored, temp, randomRate) {
    const D = dv();
    if (Math.random() < randomRate) { const x = V.pick(scored); if (D) D.ai('weak', { random: true, rate: randomRate, move: x.m }); return { move: x.m, score: Math.max(...scored.map(y => y.v)) }; }
    if (D) D.ai('weak', { random: false, rate: randomRate });
    return V.pickSoft(scored, temp);
  };
  // how the AI feels about the position, -1 (lost) .. 1 (won)
  V.mood = (score, unit) => Math.abs(score) > 90000 ? Math.sign(score) : Math.tanh(score / unit);

  // Monte Carlo tree search. g.moves, g.play (immutable), g.result(s) -> null|0|1|2, g.turn(s) -> 1|2
  V.mcts = function (g, root, iters, timeMs = 2500) {
    const t0 = performance.now(), deadline = t0 + V.aiMs(timeMs);
    const R = { s: root, kids: [], untried: null, w: 0, n: 0, p: 0, m: null, parent: null };
    let done = 0, late = false;
    for (let i = 0; i < iters; i++, done++) {
      if ((i & 63) === 0 && performance.now() > deadline) { late = true; break; }
      let node = R;
      while (true) {
        if (node.untried === null) node.untried = g.result(node.s) === null ? V.shuffle(g.moves(node.s).slice()) : [];
        if (node.untried.length || !node.kids.length) break;
        let best = null, bv = -Infinity; const ln = Math.log(node.n);
        for (const k of node.kids) { const v = k.w / k.n + 1.3 * Math.sqrt(ln / k.n); if (v > bv) { bv = v; best = k; } }
        node = best;
      }
      if (node.untried.length) {
        const m = node.untried.pop();
        const k = { s: g.play(node.s, m), kids: [], untried: null, w: 0, n: 0, p: g.turn(node.s), m, parent: node };
        node.kids.push(k); node = k;
      }
      let s = node.s, r = g.result(s), guard = 0;
      while (r === null && guard++ < 300) { const ms = g.moves(s); s = g.play(s, ms[Math.floor(Math.random() * ms.length)]); r = g.result(s); }
      if (r === null) r = 0;
      for (let n = node; n; n = n.parent) { n.n++; if (r === 0) n.w += 0.5; else if (r === n.p) n.w += 1; }
    }
    let best = null;
    for (const k of R.kids) if (!best || k.n > best.n) best = k;
    const D = dv(); if (D) D.ai('mcts', { iters: done, max: iters, ms: Math.round(performance.now() - t0), timeout: late, rate: best ? best.w / best.n : 0.5,
      top: R.kids.slice().sort((a, b) => b.n - a.n).slice(0, 8).map(k => ({ m: k.m, n: k.n, r: k.w / k.n })) });
    return best ? { move: best.m, rate: best.w / best.n } : { move: V.pick(g.moves(root)), rate: 0.5 };
  };
})();
