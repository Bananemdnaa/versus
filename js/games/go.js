(function () {
  // Go on 9x9 or 13x13. Black (side 1) starts, White gets 6.5 points komi. Stones without liberties are captured,
  // suicide is not allowed, simple ko. Two passes in a row end the game; area scoring (stones + surrounded empty points).
  // Moves: point index, or 'p' to pass. The AI runs random playouts (Monte Carlo) and picks the best move.
  const KOMI = 6.5;
  const geo = {};
  function G(n) {
    if (geo[n]) return geo[n];
    const nb = [];
    for (let i = 0; i < n * n; i++) { const r = Math.floor(i / n), c = i % n, a = []; if (r) a.push(i - n); if (r < n - 1) a.push(i + n); if (c) a.push(i - 1); if (c < n - 1) a.push(i + 1); nb.push(a); }
    return (geo[n] = { nb });
  }
  // place a stone of colour col at i on board b (mutates). Returns -1 if illegal, else the number of captured stones;
  // st.ko is set when the move creates a ko.
  function place(n, b, i, col, st) {
    if (b[i] || i === st.ko) return -1;
    const nb = G(n).nb, opp = 3 - col;
    b[i] = col;
    let cap = 0, capAt = -1;
    for (const j of nb[i]) if (b[j] === opp) { const g = group(n, b, j); if (!g.lib) { for (const k of g.st) b[k] = 0; cap += g.st.length; capAt = j; } }
    const mine = group(n, b, i);
    if (!mine.lib) { b[i] = 0; return -1; }
    st.ko = cap === 1 && mine.st.length === 1 && mine.lib === 1 ? capAt : -1;
    return cap;
  }
  const seenBuf = {};
  function group(n, b, i) {
    const col = b[i], nb = G(n).nb, seen = seenBuf[n] || (seenBuf[n] = new Int32Array(n * n)), stamp = ++group.t;
    const stack = [i], st = []; let lib = 0;
    seen[i] = stamp;
    while (stack.length) {
      const k = stack.pop(); st.push(k);
      for (const j of nb[k]) {
        if (seen[j] === stamp) continue;
        if (b[j] === col) { seen[j] = stamp; stack.push(j); }
        else if (!b[j]) { seen[j] = stamp; lib++; }
      }
    }
    return { st, lib };
  }
  group.t = 0;
  // a point surrounded only by own stones: filling it in a playout would be silly
  const eye = (n, b, i, col) => G(n).nb[i].every(j => b[j] === col);
  // area score: black minus white (without komi)
  function area(n, b) {
    const own = new Int8Array(n * n), nb = G(n).nb;
    let s = 0;
    for (let i = 0; i < n * n; i++) if (b[i]) s += b[i] === 1 ? 1 : -1;
    const done = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) {
      if (b[i] || done[i]) continue;
      const reg = [], stack = [i]; let touch = 0; done[i] = 1;
      while (stack.length) { const k = stack.pop(); reg.push(k); for (const j of nb[k]) { if (!b[j] && !done[j]) { done[j] = 1; stack.push(j); } else if (b[j]) touch |= b[j]; } }
      if (touch === 1 || touch === 2) { s += (touch === 1 ? 1 : -1) * reg.length; reg.forEach(k => { own[k] = touch; }); }
    }
    return { s, own };
  }
  function playout(n, b0, col, ko) {
    const b = b0.slice(), st = { ko }, N2 = n * n; let passes = 0, moves = 0;
    const order = new Int32Array(N2); for (let i = 0; i < N2; i++) order[i] = i;
    while (passes < 2 && moves < N2 * 2) {
      let played = false;
      for (let k = N2 - 1; k >= 0; k--) {
        const r = Math.floor(Math.random() * (k + 1)), i = order[r]; order[r] = order[k]; order[k] = i;
        if (b[i] || eye(n, b, i, col)) continue;
        if (place(n, b, i, col, st) >= 0) { played = true; break; }
      }
      if (played) passes = 0; else { passes++; st.ko = -1; }
      col = 3 - col; moves++;
    }
    return area(n, b).s - KOMI;
  }
  function legal(n, b, col, ko) {
    const out = [];
    for (let i = 0; i < n * n; i++) { if (b[i] || i === ko) continue; const t = b.slice(); if (place(n, t, i, col, { ko }) >= 0) out.push(i); }
    return out;
  }
  // flat Monte Carlo with UCB over the candidate moves; returns { move, rate }
  function think(n, b, col, ko, ms, maxIt) {
    const cand = legal(n, b, col, ko).filter(i => !eye(n, b, i, col));
    if (!cand.length) return { move: 'p', rate: 0.5 };
    const w = new Float64Array(cand.length), c = new Float64Array(cand.length);
    const kids = cand.map(i => { const t = b.slice(), s = { ko }; place(n, t, i, col, s); return { t, ko: s.ko }; });
    const t0 = performance.now(); let it = 0;
    while (it < maxIt && (it & 31 || performance.now() - t0 < ms)) {
      let k = -1, bv = -1;
      const ln = Math.log(it + 1);
      for (let j = 0; j < cand.length; j++) { const v = c[j] ? w[j] / c[j] + 0.9 * Math.sqrt(ln / c[j]) : 1e9 + Math.random(); if (v > bv) { bv = v; k = j; } }
      const r = playout(n, kids[k].t, 3 - col, kids[k].ko);
      const win = col === 1 ? r > 0 : r < 0;
      w[k] += win ? 1 : 0; c[k]++; it++;
    }
    let best = 0; for (let j = 1; j < cand.length; j++) if (c[j] > c[best] || (c[j] === c[best] && w[j] > w[best])) best = j;
    const rate = c[best] ? w[best] / c[best] : 0.5;
    // hopeless or done: pass instead of filling own territory
    return rate < 0.04 || (rate > 0.97 && it > 200) ? { move: 'p', rate, alt: cand[best] } : { move: cand[best], rate };
  }

  V.css(`
  .go{--n:9;width:min(var(--bw),600px);aspect-ratio:1;display:grid;grid-template-columns:repeat(var(--n),1fr);padding:calc(min(var(--bw),600px) / var(--n) / 2.2);border-radius:10px;touch-action:manipulation;cursor:pointer;background:radial-gradient(120% 90% at 30% 20%,rgba(255,255,255,.18),transparent 60%),linear-gradient(135deg,#e6bf7d,#d2a35c 55%,#bd8c48);border:7px solid #5d3a1c;box-shadow:inset 0 0 30px rgba(70,35,8,.4),0 18px 40px -14px rgba(0,0,0,.8)}
  .go .pt{position:relative;aspect-ratio:1}
  .go .pt::before,.go .pt::after{content:'';position:absolute;background:#5d3a1c;pointer-events:none}
  .go .pt::before{left:0;right:0;top:50%;height:1.4px;transform:translateY(-50%)} .go .pt::after{top:0;bottom:0;left:50%;width:1.4px;transform:translateX(-50%)}
  .go .pt.l::before{left:50%} .go .pt.r::before{right:50%} .go .pt.t::after{top:50%} .go .pt.b::after{bottom:50%}
  .go .sd{position:absolute;left:50%;top:50%;width:20%;height:20%;border-radius:50%;background:#5d3a1c;transform:translate(-50%,-50%)}
  .go .st{position:absolute;inset:4%;border-radius:50%;z-index:1;animation:gmin .2s var(--spring)}
  .go .st.b1{background:radial-gradient(circle at 35% 30%,#666,#111 60%,#000);box-shadow:0 2px 3px rgba(0,0,0,.55)}
  .go .st.b2{background:radial-gradient(circle at 35% 30%,#fff,#e8e4da 60%,#c9c3b5);box-shadow:0 2px 3px rgba(0,0,0,.45)}
  .go .st.gh{opacity:.45;animation:none}
  .go .st.last::after{content:'';position:absolute;inset:32%;border-radius:50%;border:2px solid var(--pink)}
  .go .st.cap{animation:gocap .45s ease-in forwards}
  @keyframes gocap{to{transform:scale(0);opacity:0}}
  .go .ow{position:absolute;inset:34%;z-index:1;border-radius:2px}
  .go .ow.o1{background:#111} .go .ow.o2{background:#fff;box-shadow:0 0 0 1px #888}
  .go.lock{cursor:default}
  .go-bar{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;width:min(var(--bw),600px)}
  .go-bar .cap{font-size:13px;color:var(--muted)} .go-bar .cap b{color:var(--fg)}`);

  V.register({
    id: 'go', name: 'Go', cat: 'Strategie', order: 6, accent: '#e6bf7d',
    short: 'Gebiet umzingeln, Steine fangen.',
    desc: 'Das uralte Strategiespiel: Setzt abwechselnd Steine, umzingelt Gebiet und fangt gegnerische Steine, denen alle Freiheiten fehlen. Wer am Ende mehr Fläche hat, gewinnt.',
    sides: { 1: 'Schwarz', 2: 'Weiß' }, firstLabels: ['Du (Schwarz)', 'KI (Schwarz)', 'Zufall'],
    levelInfo: ['Spielt fast zufällig.', 'Denkt kurz nach, macht aber viele Fehler.', 'Simuliert tausende Partien pro Zug.', 'Rechnet so lange wie möglich. Stark auf 9×9.'],
    keys: [['Pfeile + Enter', 'Stein setzen'], ['P', 'Passen']],
    options: [{ id: 'size', label: 'Brett', def: 9, choices: [[9, '9×9'], [13, '13×13']] }],
    endDelay: 1600,
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="6" fill="#d9ad66" stroke="#5d3a1c" stroke-width="2.5"/>${[0, 1, 2, 3, 4].map(k => `<path d="M${9 + k * 7.5} 9v30M9 ${9 + k * 7.5}h30" stroke="#5d3a1c" stroke-width="1"/>`).join('')}<circle cx="16.5" cy="16.5" r="3.4" fill="#111"/><circle cx="24" cy="16.5" r="3.4" fill="#111"/><circle cx="24" cy="24" r="3.4" fill="#fff" stroke="#999" stroke-width=".6"/><circle cx="31.5" cy="24" r="3.4" fill="#fff" stroke="#999" stroke-width=".6"/><circle cx="16.5" cy="31.5" r="3.4" fill="#111"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Schwarz und Weiß setzen abwechselnd einen Stein auf eine <b>Kreuzung</b>. Steine bewegen sich nie. Am Ende zählt, wer mehr <b>Fläche</b> hat: eigene Steine plus leere Punkte, die nur von eigenen Steinen umgeben sind. Weiß bekommt 6,5 Punkte dazu, weil Schwarz anfängt.' },
      { t: 'Freiheiten', d: 'Die leeren Nachbarpunkte (oben, unten, links, rechts) einer Steingruppe sind ihre <b>Freiheiten</b>. Nimmst du einer gegnerischen Gruppe die letzte Freiheit, ist sie <b>gefangen</b> und verschwindet.' },
      { t: 'Verboten', d: 'Du darfst nicht auf einen Punkt setzen, auf dem dein Stein sofort keine Freiheit hätte, außer du fängst damit etwas. Und du darfst einen einzelnen Stein nicht <b>sofort zurückschlagen</b> (Ko), erst einen Zug später.' },
      { t: 'Ende', d: 'Wer nichts Sinnvolles mehr findet, tippt <b>Passen</b>. Passen beide nacheinander, wird gezählt. Steine, die eh verloren sind, solltest du vorher <b>fangen</b>, sonst zählen sie mit.' },
      { t: 'Tipps', d: 'Ecken sind am leichtesten zu sichern, dann die Ränder, dann die Mitte. Eine Gruppe mit <b>zwei getrennten Augen</b> (leeren Punkten innen) kann nie gefangen werden.' }
    ],
    start(ctx) {
      const n = [9, 13].includes(+ctx.opts.size) ? +ctx.opts.size : 9;
      let b = new Int8Array(n * n), turn = 1, ko = -1, passes = 0, last = -1, over = false, ghost = -1;
      const caps = { 1: 0, 2: 0 };
      const board = V.el('div', 'go'); board.style.setProperty('--n', n);
      const stars = n === 9 ? [20, 24, 40, 56, 60] : [42, 48, 84, 120, 126];
      for (let i = 0; i < n * n; i++) {
        const r = Math.floor(i / n), c = i % n;
        const pt = V.el('div', 'pt' + (c === 0 ? ' l' : '') + (c === n - 1 ? ' r' : '') + (r === 0 ? ' t' : '') + (r === n - 1 ? ' b' : ''));
        pt.dataset.i = i; if (stars.includes(i)) pt.appendChild(V.el('i', 'sd'));
        board.appendChild(pt);
      }
      const bar = V.el('div', 'go-bar', '<span class="cap" id="goc"></span><button class="btn" id="gop"><span>Passen</span></button>');
      ctx.stage.append(board, bar);
      const pts = [...board.children], passBtn = bar.querySelector('#gop');
      const human = () => !over && !ctx.isAI(turn);
      const tapTwice = V.coarse && n > 9;
      function render(capt) {
        pts.forEach((pt, i) => {
          let s = pt.querySelector('.st'), want = b[i];
          if (s && (!want || !s.classList.contains('b' + want))) { if (capt && capt.includes(i)) { const gone = s; gone.classList.add('cap'); setTimeout(() => gone.remove(), 450); s = null; } else { s.remove(); s = null; } }
          if (want && !s) { s = V.el('i', 'st b' + want); pt.appendChild(s); }
          if (s) s.classList.toggle('last', i === last);
        });
        bar.querySelector('#goc').innerHTML = `Gefangen: <b>${caps[1]}</b> Schwarz · <b>${caps[2]}</b> Weiß`;
        passBtn.disabled = !human();
        board.classList.toggle('lock', !human());
      }
      function showGhost(i) {
        const o = board.querySelector('.st.gh'); if (o) o.remove();
        ghost = i;
        if (i >= 0 && human() && !b[i]) pts[i].appendChild(V.el('i', 'st gh b' + turn));
      }
      board.addEventListener('click', e => {
        const t = e.target.closest('.pt'); if (!t || !human()) return;
        const i = +t.dataset.i; if (b[i]) return;
        if (tapTwice && ghost !== i) { showGhost(i); return V.sfx.tick(); }
        play(i);
      });
      if (!V.coarse) {
        board.addEventListener('mousemove', e => { const t = e.target.closest('.pt'); if (t && +t.dataset.i !== ghost) showGhost(+t.dataset.i); });
        board.addEventListener('mouseleave', () => showGhost(-1));
      }
      passBtn.onclick = () => { if (human()) play('p'); };
      ctx.nav(() => human() ? pts.filter((p, i) => !b[i]) : [], { pad: 0, round: true });
      ctx.keys(e => { if ((e.key === 'p' || e.key === 'P') && human() && !e.repeat) { play('p'); return true; } return false; });
      function play(m) {
        if (over) return;
        if (m === 'p') {
          ctx.moved(turn, 'p');
          passes++; ko = -1; V.sfx.tick(); showGhost(-1);
          ctx.status(`${ctx.who(turn)} passt`);
          if (passes >= 2) return finish();
          turn = 3 - turn; return next(true);
        }
        const t = b.slice(), st = { ko };
        const before = [...b.keys()].filter(i => b[i] === 3 - turn);
        const cap = place(n, t, m, turn, st);
        if (cap < 0) { V.sfx.bad(); V.fx.shake(pts[m], true); return ctx.status('Da darfst du nicht setzen'); }
        ctx.moved(turn, m);
        b = t; ko = st.ko; passes = 0; last = m; caps[turn] += cap;
        showGhost(-1);
        const gone = before.filter(i => !b[i]);
        render(gone);
        V.sfx.place();
        if (cap) { V.sfx.hit(); V.fx.burstAt(pts[m], turn === 1 ? '#888' : '#fff', 8 + cap * 2, 50); ctx.status(`${ctx.who(turn)} fängt ${cap} ${cap === 1 ? 'Stein' : 'Steine'}`); }
        turn = 3 - turn; next();
      }
      function next(afterPass) {
        ctx.turn(turn, afterPass ? false : undefined);
        render();
        if (!ctx.isAI(turn)) return;
        ctx.aiTurn({
          think: () => {
            const L = ctx.level, budget = n === 9 ? [60, 500, 1400, 2800][L] : [60, 600, 1600, 3000][L];
            const r = think(n, b, turn, ko, budget, [150, 2500, 1e9, 1e9][L]);
            // pass only when counting the board as it is would win (dead stones are not removed at the end),
            // otherwise keep playing and capture them first
            const now = area(n, b).s - KOMI, ahead = turn === 1 ? now > 0 : now < 0;
            const free = legal(n, b, turn, ko).filter(i => !eye(n, b, i, turn)).length;
            if (!free || (ahead && (r.move === 'p' || (passes && r.rate > 0.6 && L >= 1)))) return { move: 'p', mood: (r.rate - 0.5) * 2 };
            return { move: r.move === 'p' && r.alt != null && r.rate > 0.5 ? r.alt : r.move, mood: (r.rate - 0.5) * 2 };
          },
          targets: m => [m === 'p' ? passBtn : pts[m]],
          apply: play,
          decode: m => m === 'p' ? 'p' : Number.isInteger(m) && m >= 0 && m < n * n && !b[m] && m !== ko && place(n, b.slice(), m, turn, { ko }) >= 0 ? m : null,
          say: m => m === 'p' ? 'Ich passe' : String.fromCharCode(65 + (m % n) + (m % n >= 8 ? 1 : 0)) + (n - Math.floor(m / n))
        });
      }
      function finish() {
        over = true;
        const { s, own } = area(n, b);
        pts.forEach((pt, i) => { if (!b[i] && own[i]) pt.appendChild(V.el('i', 'ow o' + own[i])); });
        const black = [...b].filter(x => x === 1).length + [...own].filter((x, i) => x === 1 && !b[i]).length;
        const white = [...b].filter(x => x === 2).length + [...own].filter((x, i) => x === 2 && !b[i]).length + KOMI;
        render();
        ctx.end(s - KOMI > 0 ? 1 : 2, `Schwarz ${black} : ${white} Weiß`);
      }
      next();
    }
  });
})();
