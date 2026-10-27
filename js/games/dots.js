(function () {
  function geometry(R, C) {
    const H = (R + 1) * C, E = H + R * (C + 1);
    const h = (r, c) => r * C + c, v = (r, c) => H + r * (C + 1) + c;
    const boxEdges = [], edgeBoxes = Array.from({ length: E }, () => []);
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const b = r * C + c, es = [h(r, c), h(r + 1, c), v(r, c), v(r, c + 1)];
      boxEdges.push(es); es.forEach(e => edgeBoxes[e].push(b));
    }
    return { R, C, H, E, h, v, boxEdges, edgeBoxes };
  }
  function clone(s) { return { e: s.e.slice(), own: s.own.slice(), turn: s.turn, cnt: { 1: s.cnt[1], 2: s.cnt[2] }, left: s.left }; }
  function apply(G, s, e) {
    s.e[e] = s.turn; s.left--;
    let made = 0;
    for (const b of G.edgeBoxes[e]) if (G.boxEdges[b].every(x => s.e[x])) { s.own[b] = s.turn; s.cnt[s.turn]++; made++; }
    if (!made) s.turn = 3 - s.turn;
    return made;
  }
  const sides = (G, s, b) => G.boxEdges[b].reduce((a, x) => a + (s.e[x] ? 1 : 0), 0);
  const open = (G, s) => { const o = []; for (let e = 0; e < G.E; e++) if (!s.e[e]) o.push(e); return o; };
  const completing = (G, s) => open(G, s).filter(e => G.edgeBoxes[e].some(b => sides(G, s, b) === 3));
  const safe = (G, s) => open(G, s).filter(e => G.edgeBoxes[e].every(b => sides(G, s, b) < 2));
  function giveaway(G, s, e) {
    const t = clone(s); apply(G, t, e);
    let n = 0, c;
    while ((c = completing(G, t)).length) n += apply(G, t, c[0]);
    return n;
  }
  function greedy(G, s) {
    const c = completing(G, s); if (c.length) return V.pick(c);
    const sf = safe(G, s); if (sf.length) return V.pick(sf);
    let best = Infinity, list = [];
    for (const e of open(G, s)) { const g = giveaway(G, s, e); if (g < best) { best = g; list = [e]; } else if (g === best) list.push(e); }
    return V.pick(list);
  }
  function rollout(G, s, e, me) {
    const t = clone(s); apply(G, t, e);
    while (t.left > 0) apply(G, t, greedy(G, t));
    return t.cnt[me] - t.cnt[3 - me];
  }
  function aiMove(G, s, L) {
    const op = open(G, s), c = completing(G, s);
    // Leicht: beginner, often hands out boxes. Mittel: takes boxes and usually avoids gifts.
    // Schwer: never hands out a box while a safe line exists, then gives away the smallest chain.
    // Profi: full look-ahead for the whole endgame (sacrifices, double-crosses).
    if (L === 0) { if (c.length && Math.random() < 0.6) return V.pick(c); const sf = safe(G, s); return sf.length && Math.random() < 0.45 ? V.pick(sf) : V.pick(op); }
    if (L === 1) { if (c.length && Math.random() < 0.9) return V.pick(c); const sf = safe(G, s); return sf.length && Math.random() < 0.8 ? V.pick(sf) : greedy(G, s); }
    if (L === 2) return greedy(G, s);
    // Profi: once no safe moves remain, look ahead with full rollouts (finds sacrifices and double-crosses).
    const after = clone(s); let cc; while ((cc = completing(G, after)).length) apply(G, after, cc[0]);
    if (safe(G, after).length && c.length) return V.pick(c);
    if (!c.length) { const sf = safe(G, s); if (sf.length) return V.pick(sf); }
    let best = -Infinity, list = [];
    for (const e of op) { const v = rollout(G, s, e, s.turn); if (v > best) { best = v; list = [e]; } else if (v === best) list.push(e); }
    return V.pick(list);
  }

  V.css(`
  .dots{width:min(var(--bw),560px);touch-action:manipulation;user-select:none}
  .dots svg{width:100%;height:auto;display:block}
  .dots .hitl{stroke:transparent;stroke-width:22;stroke-linecap:round;cursor:pointer}
  .dots .ln{stroke:#272c4b;stroke-width:6;stroke-linecap:round;stroke-dasharray:1 12;transition:stroke .12s}
  .dots g.ed:hover .ln.free{stroke-dasharray:none}
  .dots.t1 g.ed:hover .ln.free{stroke:color-mix(in srgb,var(--p1) 55%,transparent)} .dots.t2 g.ed:hover .ln.free{stroke:color-mix(in srgb,var(--p2) 55%,transparent)}
  .dots .ln.s1{stroke:var(--p1);stroke-dasharray:none;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--p1) 70%,transparent))}
  .dots .ln.s2{stroke:var(--p2);stroke-dasharray:none;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--p2) 60%,transparent))}
  .dots .ln.last{stroke:#fff}
  .dots .bx{transition:fill .25s;transform-box:fill-box;transform-origin:center}
  .dots .bt{transform-box:fill-box;transform-origin:center}
  .dots .bx.o1{fill:color-mix(in srgb,var(--p1) 22%,transparent)} .dots .bx.o2{fill:color-mix(in srgb,var(--p2) 20%,transparent)}
  .dots .bt{font-family:var(--f-d);font-weight:700;font-size:26px;text-anchor:middle;dominant-baseline:central}
  .dots .dt{fill:#cfd2f0}
  .dots.lock .hitl{cursor:default}`);

  V.register({
    id: 'dots', name: 'Käsekästchen', cat: 'Klassiker', order: 5, accent: 'var(--yellow)',
    short: 'Linien ziehen, Kästchen schließen.',
    desc: 'Zieht abwechselnd Linien zwischen den Punkten. Wer ein Kästchen schließt, bekommt es und zieht nochmal.',
    keys: [['Pfeile', 'Zur nächsten freien Linie springen'], ['Enter', 'Linie ziehen']],
    options: [{ id: 'size', label: 'Feldgröße', def: 4, choices: [[3, '3×3'], [4, '4×4'], [5, '5×5'], [6, '6×6']] }],
    levelInfo: ['Anfänger: lässt Kästchen liegen und verschenkt oft welche.', 'Nimmt Kästchen mit und verschenkt nur selten eins.', 'Verschenkt nichts, solange es sichere Linien gibt, und gibt dann die kleinste Kette ab.', 'Rechnet das ganze Endspiel durch und opfert gezielt Kästchen, um die Ketten zu kontrollieren.'],
    icon: `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round"><rect x="8" y="8" width="16" height="16" fill="rgba(255,79,216,.25)"/><path d="M8 8h16v16H8z" stroke="#ff4fd8" stroke-width="3"/><path d="M24 8h16M40 8v16" stroke="#ffd84f" stroke-width="3"/><path d="M8 40h16" stroke="#ffd84f" stroke-width="3"/>${[8, 24, 40].map(y => [8, 24, 40].map(x => `<circle cx="${x}" cy="${y}" r="3" fill="#cfd2f0"/>`).join('')).join('')}</svg>`,
    tutorial: [
      { t: 'Punkte und Linien', d: 'Das Feld besteht aus Punkten. Ihr zieht abwechselnd <b>eine Linie</b> zwischen zwei benachbarten Punkten, waagerecht oder senkrecht. Tippe dazu auf die gestrichelte Lücke.', demo: demo([[0, 0, 'h', 1], [0, 1, 'h', 2], [1, 0, 'v', 1]], []) },
      { t: 'Kästchen schließen', d: 'Ziehst du die <b>vierte Linie</b> um ein Kästchen, gehört es dir und du musst <b>sofort nochmal</b> ziehen. Wer am Ende die meisten Kästchen hat, gewinnt.', demo: demo([[0, 0, 'h', 2], [1, 0, 'h', 1], [0, 0, 'v', 2], [0, 1, 'v', 1]], [[0, 0, 1]]) },
      { t: 'Keine Geschenke', d: 'Ziehst du die dritte Linie um ein Kästchen, kann der Gegner es sich schnappen. Solange es noch sichere Linien gibt, nimm die.' },
      { t: 'Ketten', d: 'Gegen Ende gibt es nur noch Züge, die etwas verschenken. Dann hängen oft mehrere Kästchen zu <b>Ketten</b> zusammen: Wer eine öffnet, schenkt alle auf einmal her. Gib also lieber die <b>kürzeste</b> Kette ab.' },
      { t: 'Profi-Trick', d: 'Bekommst du eine lange Kette geschenkt, nimm alle Kästchen bis auf zwei und lass die letzten zwei mit einer Linie stehen. Der Gegner muss sie nehmen und dann selbst die nächste Kette öffnen. So gewinnt man knappe Spiele.' }
    ],
    start(ctx) {
      const n = ctx.opts.size || 4, G = geometry(n, n);
      const lab = { 1: ctx.mode === 'ai' ? (ctx.isAI(1) ? 'K' : 'D') : '1', 2: ctx.mode === 'ai' ? (ctx.isAI(2) ? 'K' : 'D') : '2' };
      let s = { e: Array(G.E).fill(0), own: Array(n * n).fill(0), turn: 1, cnt: { 1: 0, 2: 0 }, left: G.E }, last = -1, over = false;
      const SP = 70, M = 22, W = n * SP + 2 * M;
      const wrap = V.el('div', 'dots');
      const pt = (r, c) => [M + c * SP, M + r * SP];
      let svg = `<svg viewBox="0 0 ${W} ${W}">`;
      for (let b = 0; b < n * n; b++) { const [x, y] = pt((b / n) | 0, b % n); svg += `<rect class="bx" data-b="${b}" x="${x + 4}" y="${y + 4}" width="${SP - 8}" height="${SP - 8}" rx="6" fill="transparent"/><text class="bt" data-t="${b}" x="${x + SP / 2}" y="${y + SP / 2}"></text>`; }
      for (let e = 0; e < G.E; e++) {
        let a, b;
        if (e < G.H) { const r = (e / n) | 0, c = e % n; a = pt(r, c); b = pt(r, c + 1); }
        else { const k = e - G.H, r = (k / (n + 1)) | 0, c = k % (n + 1); a = pt(r, c); b = pt(r + 1, c); }
        svg += `<g class="ed" data-e="${e}"><line class="ln free" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line class="hitl" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/></g>`;
      }
      for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) { const [x, y] = pt(r, c); svg += `<circle class="dt" cx="${x}" cy="${y}" r="6"/>`; }
      wrap.innerHTML = svg + '</svg>';
      ctx.stage.appendChild(wrap);
      const lines = [...wrap.querySelectorAll('.ln')], rects = [...wrap.querySelectorAll('.bx')], texts = [...wrap.querySelectorAll('.bt')];
      const groups = [...wrap.querySelectorAll('.ed')];
      ctx.nav(() => groups.filter(gp => !s.e[+gp.dataset.e]), { pad: 2 });
      wrap.addEventListener('click', e => {
        const g = e.target.closest('.ed'); if (!g || over || ctx.isAI(s.turn)) return;
        const id = +g.dataset.e; if (!s.e[id]) move(id);
      });
      function render() {
        lines.forEach((l, e) => l.setAttribute('class', 'ln ' + (s.e[e] ? 's' + s.e[e] : 'free') + (e === last ? ' last' : '')));
        rects.forEach((r, b) => r.setAttribute('class', 'bx' + (s.own[b] ? ' o' + s.own[b] : '')));
        texts.forEach((t, b) => { t.textContent = s.own[b] ? lab[s.own[b]] : ''; t.style.fill = s.own[b] === 1 ? 'var(--p1)' : 'var(--p2)'; });
        wrap.className = 'dots t' + s.turn + (ctx.isAI(s.turn) || over ? ' lock' : '');
      }
      function move(e) {
        last = e;
        const before = s.own.slice();
        const who = s.turn, made = apply(G, s, e);
        if (made) V.sfx.place(); else V.sfx.move();
        render();
        if (V.fxOn()) lines[e].animate([{ strokeDasharray: '0 200' }, { strokeDasharray: '200 0' }], { duration: 220, easing: 'ease-out' });
        s.own.forEach((o, b) => {
          if (o && !before[b]) {
            rects[b].animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' });
            texts[b].animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120, fill: 'backwards' });
            V.fx.burstAt(rects[b], V.hex(who), 10, 55);
            V.fx.floatAt(rects[b], '+1', V.hex(who));
          }
        });
        if (s.left === 0) {
          over = true; render();
          const w = s.cnt[1] > s.cnt[2] ? 1 : s.cnt[2] > s.cnt[1] ? 2 : 0;
          ctx.end(w, `${s.cnt[1]} : ${s.cnt[2]} Kästchen`);
          return;
        }
        next(made ? who : 0);
      }
      function next(again) {
        const score = `<span class="c1">${s.cnt[1]}</span> : <span class="c2">${s.cnt[2]}</span> · `;
        const base = ctx.isAI(s.turn) ? null : (ctx.name(s.turn) === 'Du' ? 'Du ziehst' : ctx.who(s.turn) + ' zieht') + (again ? ' nochmal' : '');
        ctx.turn(s.turn, score + (base || '<span class="c' + s.turn + '">KI</span> ist dran'));
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          quick: !!again,
          think: () => ({ move: aiMove(G, s, ctx.level), mood: (s.cnt[s.turn] - s.cnt[3 - s.turn]) / Math.max(3, n * n / 3) }),
          targets: e => [groups[e]],
          decoys: () => groups.filter(gp => !s.e[+gp.dataset.e]),
          apply: move,
          say: () => ''
        });
      }
      render(); next(0);
    }
  });

  // small static picture for the tutorial: a 2x2 box field
  function demo(edges, boxes) {
    const SP = 60, M = 14, n = 2, W = n * SP + 2 * M;
    let h = `<div class="dots" style="width:150px"><svg viewBox="0 0 ${W} ${W}">`;
    for (const [r, c, o] of boxes) h += `<rect class="bx o${o}" x="${M + c * SP + 4}" y="${M + r * SP + 4}" width="${SP - 8}" height="${SP - 8}" rx="5"/><text class="bt" x="${M + c * SP + SP / 2}" y="${M + r * SP + SP / 2}" style="fill:var(--p${o})">${o === 1 ? 'P' : 'G'}</text>`;
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) h += `<line class="ln" x1="${M + c * SP}" y1="${M + r * SP}" x2="${M + c * SP + SP}" y2="${M + r * SP}"/>`;
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) h += `<line class="ln" x1="${M + c * SP}" y1="${M + r * SP}" x2="${M + c * SP}" y2="${M + r * SP + SP}"/>`;
    for (const [r, c, d, o] of edges) {
      const x1 = M + c * SP, y1 = M + r * SP, x2 = d === 'h' ? x1 + SP : x1, y2 = d === 'h' ? y1 : y1 + SP;
      h += `<line class="ln s${o}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) h += `<circle class="dt" cx="${M + c * SP}" cy="${M + r * SP}" r="5"/>`;
    return h + '</svg></div>';
  }
})();
