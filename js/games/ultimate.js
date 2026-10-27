(function () {
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function small(c, bi) {
    const o = bi * 9;
    for (const l of LINES) { const v = c[o + l[0]]; if (v && v === c[o + l[1]] && v === c[o + l[2]]) return v; }
    for (let k = 0; k < 9; k++) if (!c[o + k]) return 0;
    return 3;
  }
  function bigRes(big) {
    for (const l of LINES) { const v = big[l[0]]; if ((v === 1 || v === 2) && v === big[l[1]] && v === big[l[2]]) return { w: v, line: l }; }
    return big.every(x => x) ? { w: 0 } : null;
  }
  const G = {
    turn: s => s.turn,
    result: s => s.res,
    moves(s) {
      const m = [];
      if (s.next >= 0) { for (let k = 0; k < 9; k++) if (!s.c[s.next * 9 + k]) m.push(s.next * 9 + k); return m; }
      for (let bi = 0; bi < 9; bi++) if (!s.big[bi]) for (let k = 0; k < 9; k++) if (!s.c[bi * 9 + k]) m.push(bi * 9 + k);
      return m;
    },
    play(s, m) {
      const c = s.c.slice(), big = s.big.slice();
      c[m] = s.turn;
      const bi = (m / 9) | 0, ci = m % 9;
      if (!big[bi]) big[bi] = small(c, bi);
      const r = bigRes(big);
      return { c, big, next: big[ci] ? -1 : ci, turn: 3 - s.turn, res: r ? r.w : null, last: m };
    }
  };

  V.css(`
  .ut{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:8px;width:min(var(--bw),600px);aspect-ratio:1}
  .ut .sb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));min-height:0;gap:3px;padding:5px;border-radius:8px;background:var(--panel);border:1px solid var(--line);position:relative;transition:opacity .2s,border-color .2s,box-shadow .2s}
  .ut .sb.act{border-color:var(--cy);box-shadow:0 0 0 1px var(--cy),0 0 22px -6px var(--cy)}
  .ut .sb.dim{opacity:.5}
  .ut .cl{min-width:0;min-height:0;border-radius:6px;background:var(--panel2);display:grid;place-items:center;font-family:var(--f-d);font-weight:700;font-size:clamp(14px,4.2vw,26px);line-height:1}
  .ut .sb.act .cl:empty:hover{background:#24355a;cursor:pointer}
  .ut .cl.x{color:var(--p1)} .ut .cl.o{color:var(--p2)}
  .ut .cl.last{box-shadow:inset 0 0 0 2px rgba(255,255,255,.4)}
  .ut .won{position:absolute;inset:0;display:grid;place-items:center;border-radius:8px;background:rgba(11,12,21,.74);font-family:var(--f-d);font-weight:700;font-size:clamp(54px,17vw,120px);line-height:1;animation:pop .3s}
  .ut .won.x{color:var(--p1);text-shadow:0 0 24px color-mix(in srgb,var(--p1) 70%,transparent)} .ut .won.o{color:var(--p2);text-shadow:0 0 24px color-mix(in srgb,var(--p2) 60%,transparent)} .ut .won.d{color:var(--dim);font-size:clamp(30px,8vw,56px)}
  .ut .sb.wl{border-color:var(--cy)}`);

  const g9 = rows => V.mini(rows, {}, { w: 270 });

  V.register({
    id: 'uttt', name: 'Ultimate Tic Tac Toe', cat: 'Klassiker', order: 4, accent: 'var(--cyan)',
    short: 'Tic Tac Toe in Tic Tac Toe.',
    desc: 'Neun kleine Bretter in einem großen. Dein Zug bestimmt, wo der Gegner als Nächstes spielen muss.',
    sides: { 1: 'X', 2: 'O' },
    keys: [['Pfeile', 'Cursor über die 81 Felder bewegen'], ['Enter', 'Setzen']],
    icon: `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${3 + c * 14.6}" y="${3 + r * 14.6}" width="12.6" height="12.6" rx="3" fill="#1e2238" stroke="${r === 1 && c === 1 ? '#6ff3ff' : '#2a2f4f'}" stroke-width="1.5"/>`).join('')).join('')}<path d="M6 6l6.6 6.6M12.6 6L6 12.6" stroke="#ff4fd8" stroke-width="2.6"/><circle cx="24" cy="24" r="3.2" stroke="#ffd84f" stroke-width="2.4"/><path d="M35.4 35.4l6.6 6.6M42 35.4l-6.6 6.6" stroke="#ff4fd8" stroke-width="2.6"/></svg>`,
    levelInfo: ['Anfänger: spielt pro Zug nur 80 Partien im Kopf durch und achtet kaum darauf, wohin sie dich schickt.', 'Spielt pro Zug 500 Partien durch.', 'Spielt pro Zug 3.000 Partien durch.', 'Nutzt die volle Bedenkzeit, oft über 20.000 Partien pro Zug.'],
    tutorial: [
      { t: 'Neun Bretter', d: 'Das große Brett besteht aus <b>neun kleinen Tic-Tac-Toe-Brettern</b>. Gewinnst du ein kleines Brett, gehört dir dieses Feld im großen Brett.', demo: g9(['xo.......', '.x.......', 'o.x......', '.........', '.........', '.........', '.........', '.........', '.........']) },
      { t: 'Du schickst den Gegner', d: 'Das ist der Clou: Das Feld, auf das du <b>innerhalb</b> eines kleinen Bretts setzt, bestimmt das kleine Brett, in dem der Gegner spielen muss. X setzt hier oben rechts im mittleren Brett, also muss O im Brett oben rechts spielen.', demo: g9(['......hhh', '......hhh', '......hhh', '.....X...', '.........', '.........', '.........', '.........', '.........']) },
      { t: 'Freie Wahl', d: 'Wirst du in ein Brett geschickt, das schon gewonnen oder voll ist, darfst du <b>auf jedem freien Feld</b> irgendwo spielen. Das ist ein großer Vorteil, also schick den Gegner möglichst nicht dorthin.' },
      { t: 'Das große Ziel', d: 'Wer drei kleine Bretter in einer Reihe gewinnt, waagerecht, senkrecht oder diagonal, gewinnt das ganze Spiel. Ein kleines Brett, das remis endet, zählt für niemanden.' },
      { t: 'Tipps', d: 'Denk bei jedem Zug an zwei Dinge: Was bringt mir das Feld hier, und wohin schicke ich damit den Gegner? Wer nur aufs eigene Brett schaut, schenkt dem Gegner oft den Sieg woanders. Das leuchtende Brett zeigt immer, wo gespielt werden muss.' }
    ],
    start(ctx) {
      let s = { c: Array(81).fill(0), big: Array(9).fill(0), next: -1, turn: 1, res: null, last: -1 };
      const el = V.el('div', 'ut');
      for (let bi = 0; bi < 9; bi++) {
        const sb = V.el('div', 'sb');
        for (let k = 0; k < 9; k++) { const c = V.el('div', 'cl'); c.dataset.m = bi * 9 + k; sb.appendChild(c); }
        el.appendChild(sb);
      }
      ctx.stage.appendChild(el);
      const allCells = [...el.querySelectorAll('.cl')];
      ctx.nav(() => allCells, { start: () => 40 });
      el.addEventListener('click', e => {
        const t = e.target.closest('.cl'); if (!t || s.res !== null || ctx.isAI(s.turn)) return;
        const m = +t.dataset.m; if (G.moves(s).includes(m)) move(m);
      });
      function render() {
        const legal = new Set(s.res === null ? G.moves(s).map(m => (m / 9) | 0) : []);
        [...el.children].forEach((sb, bi) => {
          sb.classList.toggle('act', legal.has(bi) && !ctx.isAI(s.turn));
          sb.classList.toggle('dim', s.res === null && !legal.has(bi) && !s.big[bi]);
          [...sb.children].forEach((c, k) => {
            if (!c.classList.contains('won')) {
              const v = s.c[bi * 9 + k];
              c.textContent = v === 1 ? 'X' : v === 2 ? 'O' : '';
              c.className = 'cl' + (v === 1 ? ' x' : v === 2 ? ' o' : '') + (s.last === bi * 9 + k ? ' last' : '');
            }
          });
          if (s.big[bi] && !sb.querySelector('.won')) {
            const w = s.big[bi];
            sb.appendChild(V.el('div', 'won ' + (w === 1 ? 'x' : w === 2 ? 'o' : 'd'), w === 1 ? 'X' : w === 2 ? 'O' : 'remis'));
          }
        });
      }
      function move(m) {
        ctx.moved(s.turn, m);
        const before = s.big.slice();
        s = G.play(s, m);
        V.sfx.move();
        render();
        s.big.forEach((v, i) => {
          if (v === before[i]) return;
          if (v < 3) { V.sfx.place(); V.fx.burstAt(el.children[i], V.hex(v), 14, 90); V.fx.shake(el, true); }
        });
        const lc = el.querySelector('.cl.last'); if (lc) V.fx.pop(lc);
        if (s.res !== null) {
          const r = bigRes(s.big);
          if (r && r.line) r.line.forEach(i => el.children[i].classList.add('wl'));
          ctx.end(s.res);
          return;
        }
        next();
      }
      function next() {
        const free = s.next < 0 && G.moves(s).length > 9;
        ctx.turn(s.turn, (ctx.isAI(s.turn) ? null : undefined));
        if (!ctx.isAI(s.turn) && free) ctx.status((ctx.name(s.turn) === 'Du' ? 'Du darfst' : ctx.who(s.turn) + ' darf') + ' überall spielen');
        const BOARD = ['oben links', 'oben', 'oben rechts', 'links', 'Mitte', 'rechts', 'unten links', 'unten', 'unten rechts'];
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          // more simulated games per move = stronger: about 80 / 500 / 3.000 / as many as fit in 2,5 s
          think: () => { const L = ctx.level, r = V.mcts(G, s, [80, 500, 3000, 60000][L], [300, 700, 1200, 2500][L]); return { move: r.move, mood: (r.rate - 0.5) * 2.4 }; },
          targets: m => [allCells[m]],
          decoys: () => G.moves(s).map(m => allCells[m]),
          apply: move,
          decode: m => (G.moves(s).includes(m) ? m : null),
          say: m => 'Brett ' + BOARD[(m / 9) | 0]
        });
      }
      render(); next();
    }
  });
})();
