// Versus: AI helpers shared by the games (alpha-beta search, soft choice for the weaker levels, Monte Carlo).
(function () {
  'use strict';

  // Negamax with alpha-beta and iterative deepening.
  // g.moves(s), g.play(s,m) -> new state, g.over(s,ply) -> null | score for side to move, g.eval(s) -> score for side to move.
  V.search = function (g, s, maxDepth, timeMs = 1500) {
    const deadline = performance.now() + timeMs;
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
      let a = -1e9, bm = null;
      for (const m of rootMoves) {
        const v = -nm(g.play(s, m), depth - 1, -1e9, -a, 1);
        if (stop) break;
        if (v > a) { a = v; bm = m; }
      }
      if (stop && depth > 1) break;
      if (bm !== null) { bestMove = bm; bestScore = a; rootMoves = [bm, ...rootMoves.filter(x => x !== bm)]; }
      if (Math.abs(a) > 90000) break;
      if (stop) break;
    }
    return { move: bestMove, score: bestScore };
  };

  // Exact score for every root move (full window). The weaker levels use it to play like a person:
  // usually a good move, sometimes a decent one, almost never a terrible one.
  V.searchAll = function (g, s, depth, timeMs = 1200) {
    const deadline = performance.now() + timeMs;
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
    return g.moves(s).map(m => ({ m, v: -nm(g.play(s, m), depth - 1, -1e9, 1e9, 1) }));
  };
  // Softmax choice over scored moves; temp is in the game's own score units (0 = always the best move).
  V.pickSoft = function (scored, temp) {
    let best = scored[0];
    for (const x of scored) if (x.v > best.v) best = x;
    if (!temp) { const top = scored.filter(x => x.v === best.v); return { move: V.pick(top).m, score: best.v }; }
    const cl = v => Math.max(-3000, Math.min(3000, v));
    const w = scored.map(x => Math.exp((cl(x.v) - cl(best.v)) / temp));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < scored.length; i++) { r -= w[i]; if (r <= 0) return { move: scored[i].m, score: best.v }; }
    return { move: best.m, score: best.v };
  };
  // Beginner level: a share of plain random moves on top of a very loose soft choice,
  // so it misses threats and sometimes even its own win.
  V.weak = function (scored, temp, randomRate) {
    if (Math.random() < randomRate) { const x = V.pick(scored); return { move: x.m, score: Math.max(...scored.map(y => y.v)) }; }
    return V.pickSoft(scored, temp);
  };
  // how the AI feels about the position, -1 (lost) .. 1 (won)
  V.mood = (score, unit) => Math.abs(score) > 90000 ? Math.sign(score) : Math.tanh(score / unit);

  // Monte Carlo tree search. g.moves, g.play (immutable), g.result(s) -> null|0|1|2, g.turn(s) -> 1|2
  V.mcts = function (g, root, iters, timeMs = 2500) {
    const deadline = performance.now() + timeMs;
    const R = { s: root, kids: [], untried: null, w: 0, n: 0, p: 0, m: null, parent: null };
    for (let i = 0; i < iters; i++) {
      if ((i & 63) === 0 && performance.now() > deadline) break;
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
    return best ? { move: best.m, rate: best.w / best.n } : { move: V.pick(g.moves(root)), rate: 0.5 };
  };
})();
