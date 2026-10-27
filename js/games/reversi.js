(function () {
  const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const W = [
    120, -20, 20, 5, 5, 20, -20, 120, -20, -40, -5, -5, -5, -5, -40, -20, 20, -5, 15, 3, 3, 15, -5, 20, 5, -5, 3, 3, 3, 3, -5, 5,
    5, -5, 3, 3, 3, 3, -5, 5, 20, -5, 15, 3, 3, 15, -5, 20, -20, -40, -5, -5, -5, -5, -40, -20, 120, -20, 20, 5, 5, 20, -20, 120];
  function flips(b, sq, me) {
    if (b[sq]) return [];
    const op = 3 - me, r = sq >> 3, c = sq & 7, out = [];
    for (const [dr, dc] of D8) {
      let rr = r + dr, cc = c + dc; const line = [];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === op) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
      if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === me) out.push(...line);
    }
    return out;
  }
  function legalFor(b, me) { const m = []; for (let i = 0; i < 64; i++) if (!b[i] && flips(b, i, me).length) m.push(i); return m; }
  const count = (b, p) => b.reduce((a, x) => a + (x === p ? 1 : 0), 0);
  const G = {
    moves(s) { const m = legalFor(s.b, s.turn); return m.length ? m : ['pass']; },
    play(s, m) {
      if (m === 'pass') return { b: s.b, turn: 3 - s.turn };
      const b = s.b.slice(); flips(b, m, s.turn).forEach(i => b[i] = s.turn); b[m] = s.turn;
      return { b, turn: 3 - s.turn };
    },
    over(s, ply) {
      if (legalFor(s.b, s.turn).length || legalFor(s.b, 3 - s.turn).length) return null;
      const d = count(s.b, s.turn) - count(s.b, 3 - s.turn);
      return d > 0 ? 100000 - ply + d : d < 0 ? -100000 + ply + d : 0;
    },
    order: (s, ms) => ms.slice().sort((a, b) => (W[b] || 0) - (W[a] || 0)),
    eval(s) {
      const me = s.turn, op = 3 - me, b = s.b;
      let v = 0, empt = 0;
      for (let i = 0; i < 64; i++) { if (b[i] === me) v += W[i]; else if (b[i] === op) v -= W[i]; else empt++; }
      // corners taken make the adjacent squares harmless
      for (const [c, adj] of [[0, [1, 8, 9]], [7, [6, 14, 15]], [56, [48, 49, 57]], [63, [54, 55, 62]]]) if (b[c]) adj.forEach(a => { if (b[a] === me) v -= W[a]; else if (b[a] === op) v += W[a]; });
      const mm = legalFor(b, me).length, om = legalFor(b, op).length;
      v += (mm - om) * 8;
      if (empt < 14) v += (count(b, me) - count(b, op)) * 6;
      return v;
    }
  };

  V.css(`
  .rv{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;padding:8px;width:min(var(--bw),600px);background:#0f3a33;border-radius:14px;border:2px solid #1d6b5c;box-shadow:0 0 40px -14px #5dffcf;touch-action:manipulation}
  .rv .sq{aspect-ratio:1;background:#14524a;border-radius:4px;display:grid;place-items:center;position:relative;perspective:300px}
  .rv .sq.ok{cursor:pointer} .rv .sq.ok::after{content:'';width:26%;height:26%;border-radius:50%;border:2px solid rgba(255,255,255,.45)}
  .rv .sq.ok:hover::after{background:rgba(255,255,255,.3)}
  .rv .st{width:82%;height:82%;border-radius:50%;transition:transform .35s;transform-style:preserve-3d}
  .rv .st.s1{background:radial-gradient(circle at 35% 30%,var(--p1hi),var(--p1) 62%);box-shadow:0 0 10px color-mix(in srgb,var(--p1) 50%,transparent)}
  .rv .st.s2{background:radial-gradient(circle at 35% 30%,var(--p2hi),var(--p2) 62%);box-shadow:0 0 10px color-mix(in srgb,var(--p2) 45%,transparent)}
  .rv .st.half{animation:rvh1 .14s ease-in forwards}
  .rv .st.half2{animation:rvh2 .18s ease-out}
  @keyframes rvh1{to{transform:scaleX(0) scaleY(1.1)}}
  @keyframes rvh2{from{transform:scaleX(0) scaleY(1.1)}}
  .rv .sq.ok::after{animation:miniIn .3s var(--spring)}
  .rv .st.new{animation:pop .25s}
  .rv .lastm{box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
  @keyframes rvflip{0%{transform:rotateY(0)}50%{transform:rotateY(90deg) scale(1.1)}100%{transform:rotateY(0)}}`);

  const rm = rows => V.mini(rows, { '.': { c: '' } }, { w: 240 });

  V.register({
    id: 'reversi', name: 'Reversi', cat: 'Strategie', order: 3, accent: '#5dffcf',
    short: 'Einkesseln und umdrehen.',
    desc: 'Schließ gegnerische Steine zwischen zwei eigenen ein und dreh sie um. Am Ende zählt, wer mehr Steine hat.',
    keys: [['Pfeile', 'Feld wählen'], ['Enter', 'Stein setzen']],
    levelInfo: ['Anfänger: setzt ziemlich wahllos und verschenkt Ecken.', 'Dreht gern viele Steine um und mag Ecken, denkt aber nicht voraus.', 'Rechnet drei Züge tief und spielt die letzten acht Felder perfekt.', 'Rechnet acht Züge tief und spielt die letzten 14 Felder perfekt.'],
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="6" fill="#14524a"/><circle cx="17" cy="17" r="6.5" fill="#ff4fd8"/><circle cx="31" cy="17" r="6.5" fill="#ffd84f"/><circle cx="17" cy="31" r="6.5" fill="#ffd84f"/><circle cx="31" cy="31" r="6.5" fill="#ff4fd8"/></svg>`,
    tutorial: [
      { t: 'Aufbau und Ziel', d: 'Am Anfang stehen vier Steine in der Mitte. Pink beginnt. Am Ende gewinnt, wer <b>mehr Steine seiner Farbe</b> auf dem Brett hat.', demo: rm(['........', '........', '........', '...ba...', '...ab...', '........', '........', '........']) },
      { t: 'Einkesseln', d: 'Du setzt einen Stein so, dass gegnerische Steine <b>in einer Linie zwischen deinem neuen und einem alten Stein</b> liegen. Waagerecht, senkrecht oder diagonal.', demo: rm(['........', '........', '........', '..*bbba.', '........', '........', '........', '........']) },
      { t: 'Umdrehen', d: 'Alle eingeschlossenen Steine werden <b>umgedreht</b> und gehören jetzt dir. Ein Zug kann in mehrere Richtungen gleichzeitig umdrehen. Du darfst nur dort setzen, wo du mindestens einen Stein umdrehst. Die Kreise zeigen dir die erlaubten Felder.', demo: rm(['........', '........', '........', '..Aaaaa.', '........', '........', '........', '........']) },
      { t: 'Aussetzen', d: 'Hast du keinen erlaubten Zug, musst du <b>aussetzen</b> und der Gegner ist nochmal dran. Können beide nicht mehr, ist das Spiel vorbei.' },
      { t: 'Tipps', d: 'Die <b>Ecken</b> sind Gold wert: Ein Stein dort kann nie mehr umgedreht werden. Die Felder direkt neben einer freien Ecke sind gefährlich, weil sie dem Gegner die Ecke schenken. Viele Steine früh im Spiel sind nicht wichtig. Wichtiger ist, dass du viele Zugmöglichkeiten hast.', demo: rm(['A*......', '**......', '........', '........', '........', '........', '........', '........']) }
    ],
    start(ctx) {
      const b0 = Array(64).fill(0); b0[27] = 2; b0[28] = 1; b0[35] = 1; b0[36] = 2;
      let s = { b: b0, turn: 1 }, over = false, last = -1;
      const animating = new Set();
      const board = V.el('div', 'rv');
      for (let i = 0; i < 64; i++) { const d = V.el('div', 'sq'); d.dataset.i = i; board.appendChild(d); }
      ctx.stage.appendChild(board);
      board.addEventListener('click', e => {
        const d = e.target.closest('.sq'); if (!d || over || ctx.isAI(s.turn)) return;
        const i = +d.dataset.i; if (flips(s.b, i, s.turn).length) move(i);
      });
      const sqs = [...board.children];
      ctx.nav(() => sqs, { pad: 1, start: () => 19 });
      function render() {
        const ok = new Set(!over && !ctx.isAI(s.turn) ? legalFor(s.b, s.turn) : []);
        sqs.forEach((d, i) => {
          d.className = 'sq' + (ok.has(i) ? ' ok' : '') + (i === last ? ' lastm' : '');
          const v = s.b[i];
          if (!v) { d.innerHTML = ''; return; }
          let st = d.firstElementChild;
          if (!st) { st = V.el('div', 'st'); d.appendChild(st); }
          if (animating.has(i)) return;
          st.className = 'st s' + v + (i === last ? ' new' : '');
        });
      }
      function move(i) {
        ctx.moved(s.turn, i);
        const who = s.turn, f = flips(s.b, i, who);
        s = G.play(s, i); last = i;
        if (V.fxOn()) f.forEach(k => animating.add(k));
        V.sfx.place(); render();
        V.fx.ringAt(sqs[i], V.hex(who));
        const r0 = i >> 3, c0 = i & 7;
        f.forEach(k => {
          const st = sqs[k].firstElementChild, dist = Math.max(Math.abs((k >> 3) - r0), Math.abs((k & 7) - c0));
          if (!V.fxOn()) { st.className = 'st s' + who; return; }
          ctx.later(() => {
            st.className = 'st s' + (3 - who) + ' half';
            ctx.later(() => { animating.delete(k); st.className = 'st s' + s.b[k] + ' half2'; V.sfx.tick(); }, 140);
          }, dist * 70);
        });
        if (f.length >= 5) ctx.later(() => V.fx.floatAt(sqs[i], '+' + f.length, V.hex(who)), 150);
        next();
      }
      function next() {
        const mine = legalFor(s.b, s.turn), theirs = legalFor(s.b, 3 - s.turn);
        const score = `<span class="c1">${count(s.b, 1)}</span> : <span class="c2">${count(s.b, 2)}</span> · `;
        if (!mine.length && !theirs.length) {
          over = true; render();
          const a = count(s.b, 1), c = count(s.b, 2);
          ctx.end(a > c ? 1 : c > a ? 2 : 0, `${a} : ${c} Steine`);
          return;
        }
        if (!mine.length) {
          ctx.status(score + `${ctx.who(s.turn)} ${ctx.name(s.turn) === 'Du' ? 'musst' : 'muss'} aussetzen`);
          s = G.play(s, 'pass'); render();
          ctx.later(next, 1300);
          return;
        }
        render();
        const base = ctx.isAI(s.turn) ? ctx.who(s.turn) + ' ist dran' : (ctx.name(s.turn) === 'Du' ? 'Du bist dran' : ctx.who(s.turn) + ' ist dran');
        ctx.turn(s.turn, score + base);
        const sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          think: () => {
            const L = ctx.level, empties = s.b.filter(x => !x).length;
            let r;
            // Leicht: random-ish beginner who likes flipping many stones. Mittel: greedy but knows corners.
            // Schwer 3 plies (endgame solved from 8 empty squares), Profi 8 plies (endgame solved from 14).
            if (L === 0) r = V.weak(mine.map(m => ({ m, v: flips(s.b, m, s.turn).length * 10 })), 25, 0.3);
            else if (L === 1) r = V.pickSoft(mine.map(m => ({ m, v: flips(s.b, m, s.turn).length * 10 + W[m] / 3 })), 12);
            else r = V.search(G, s, empties <= [8, 14][L - 2] ? 20 : [3, 8][L - 2], [900, 2400][L - 2]);
            let m = r.move; if (m === 'pass') m = mine[0];
            return { move: m, mood: L ? V.mood(r.score, 160) : undefined };
          },
          targets: m => [sqs[m]],
          decoys: () => mine.map(m => sqs[m]),
          apply: move,
          decode: i => (legalFor(s.b, s.turn).includes(i) ? i : null),
          say: m => sqn(m) + ' · ' + flips(s.b, m, s.turn).length + ' umgedreht'
        });
      }
      next();
    }
  });
})();
