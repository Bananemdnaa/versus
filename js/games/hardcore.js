(function () {
  // Hardcore Tic Tac Toe: Ultimate Tic Tac Toe one level deeper. 9 areas, each an Ultimate board (9 boards of 9 cells),
  // 729 cells. Cell m: area a = m/81, board b = m/9 % 9, cell c = m % 9. Playing (a, b, c) sends the other player to
  // area b, board c. A decided board there: anywhere in area b; a decided area: anywhere at all.
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  // result of 9 values from offset o: 1 or 2 won, 3 decided without winner, 0 open (3 counts for nobody in a line)
  function res9(v, o) {
    for (const l of LINES) { const x = v[o + l[0]]; if ((x === 1 || x === 2) && x === v[o + l[1]] && x === v[o + l[2]]) return x; }
    for (let k = 0; k < 9; k++) if (!v[o + k]) return 0;
    return 3;
  }
  const lineOf = v => LINES.find(l => (v[l[0]] === 1 || v[l[0]] === 2) && v[l[0]] === v[l[1]] && v[l[0]] === v[l[2]]);
  const G = {
    turn: s => s.turn,
    result: s => s.res,
    moves(s) {
      const m = [];
      const board = b => { for (let k = 0; k < 9; k++) if (!s.c[b * 9 + k]) m.push(b * 9 + k); };
      const area = a => { for (let b = 0; b < 9; b++) if (!s.mid[a * 9 + b]) board(a * 9 + b); };
      if (s.na >= 0 && s.nb >= 0) board(s.na * 9 + s.nb);
      else if (s.na >= 0) area(s.na);
      else for (let a = 0; a < 9; a++) if (!s.top[a]) area(a);
      return m;
    },
    play(s, m) {
      const c = s.c.slice(), mid = s.mid.slice(), top = s.top.slice();
      c[m] = s.turn;
      const a = (m / 81) | 0, bi = (m / 9) | 0, b = bi % 9, ci = m % 9;
      if (!mid[bi]) { mid[bi] = res9(c, bi * 9); if (mid[bi] && !top[a]) top[a] = res9(mid, a * 9); }
      const t = res9(top, 0);
      const na = top[b] ? -1 : b, nb = na < 0 || mid[b * 9 + ci] ? -1 : ci;
      return { c, mid, top, na, nb, turn: 3 - s.turn, res: t === 0 ? null : t === 3 ? 0 : t, last: m };
    }
  };

  V.css(`
  .hc{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .hc-top{display:flex;align-items:center;gap:12px;width:min(var(--bw),600px)}
  .hc-map{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:118px;aspect-ratio:1;padding:4px;border-radius:10px;background:var(--panel);border:1px solid var(--line)}
  .hc-map button{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;padding:2px;border-radius:5px;background:var(--panel2);border:1px solid transparent;min-width:0}
  .hc-map button i{border-radius:2px;background:var(--panel3)}
  .hc-map button i.x{background:var(--p1)} .hc-map button i.o{background:var(--p2)} .hc-map button i.d{background:#555b7a}
  .hc-map button.view{border-color:var(--fg)}
  .hc-map button.act{box-shadow:0 0 0 2px var(--cy),0 0 12px -2px var(--cy)}
  .hc-map button.dim{opacity:.45}
  .hc-map button b{position:absolute;inset:0;display:grid;place-items:center;font:800 24px/1 var(--f-d);background:rgba(11,12,21,.65);border-radius:5px}
  .hc-map button b.x{color:var(--p1)} .hc-map button b.o{color:var(--p2)} .hc-map button b.d{color:var(--dim);font-size:13px}
  .hc-info{flex:1;min-width:0;font-size:13px;color:var(--muted);line-height:1.35}
  .hc-info b{display:block;font:800 italic 22px/1.05 var(--f-d);text-transform:uppercase;color:var(--fg);padding-right:.15em}
  .hc .ut{width:min(var(--bw),600px)}`);

  const AREA = ['oben links', 'oben', 'oben rechts', 'links', 'Mitte', 'rechts', 'unten links', 'unten', 'unten rechts'];

  V.register({
    id: 'hardcore', name: 'Hardcore Tic Tac Toe', cat: 'Klassiker', order: 5, accent: '#ff5d73',
    short: 'Ultimate Tic Tac Toe, nochmal verschachtelt.',
    desc: 'Neun Ultimate-Bretter in einem großen, 729 Felder. Dein Feld schickt den Gegner in ein Brett, dein Brett in einen Bereich.',
    sides: { 1: 'X', 2: 'O' },
    keys: [['Pfeile', 'Cursor im Bereich bewegen'], ['Enter', 'Setzen'], ['1–9', 'Bereich ansehen (Ziffernblock)']],
    icon: `<svg viewBox="0 0 48 48">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<g transform="translate(${3 + c * 14.6} ${3 + r * 14.6})"><rect width="12.6" height="12.6" rx="2.4" fill="#1e2238" stroke="${r === 1 && c === 1 ? '#ff5d73' : '#2a2f4f'}" stroke-width="1.2"/>${[0, 1, 2].map(y => [0, 1, 2].map(x => `<rect x="${1.6 + x * 3.3}" y="${1.6 + y * 3.3}" width="2.6" height="2.6" rx=".6" fill="${(r * 3 + c + y * 3 + x) % 5 === 0 ? '#ff4fd8' : (r * 3 + c + y + x) % 7 === 0 ? '#ffd84f' : '#2f3556'}"/>`).join('')).join('')}</g>`).join('')).join('')}</svg>`,
    levelInfo: ['Anfänger: rechnet kaum und schickt dich oft, wohin du willst.', 'Spielt pro Zug ein paar hundert Partien durch.', 'Spielt pro Zug tausende Partien durch.', 'Nutzt die volle Bedenkzeit.'],
    tutorial: [
      { t: 'Drei Ebenen', d: 'Das Spielfeld hat <b>9 Bereiche</b>. Jeder Bereich ist ein ganzes Ultimate-Tic-Tac-Toe-Brett mit 9 kleinen Brettern, also 729 Felder.' },
      { t: 'Gewinnen von unten nach oben', d: 'Drei in einer Reihe gewinnt ein <b>kleines Brett</b>. Drei kleine Bretter in einer Reihe gewinnen einen <b>Bereich</b>. Drei Bereiche in einer Reihe gewinnen das <b>ganze Spiel</b>.' },
      { t: 'Du schickst den Gegner', d: 'Setzt du im kleinen Brett zum Beispiel <b>oben rechts</b>, muss der Gegner im Brett oben rechts weiterspielen. Und weil dein kleines Brett selbst eine Position im Bereich hat, bestimmt es den <b>Bereich</b>: Liegt es in der Mitte, geht es im mittleren Bereich weiter.' },
      { t: 'Freie Wahl', d: 'Ist das Ziel-Brett schon entschieden, darfst du überall in diesem Bereich spielen. Ist der ganze Bereich entschieden, darfst du <b>überall</b> spielen.' },
      { t: 'Die Karte', d: 'Groß siehst du immer einen Bereich. Die <b>Karte</b> daneben zeigt alle neun, der leuchtende ist der, in dem gespielt werden muss. Tipp auf einen Bereich der Karte, um ihn anzusehen. Am PC gehen dafür die Ziffern 1–9 wie auf dem Ziffernblock.' }
    ],
    start(ctx) {
      let s = { c: Array(729).fill(0), mid: Array(81).fill(0), top: Array(9).fill(0), na: -1, nb: -1, turn: 1, res: null, last: -1 };
      let view = 4;
      const root = V.el('div', 'hc'), top = V.el('div', 'hc-top'), map = V.el('div', 'hc-map'), info = V.el('div', 'hc-info'), el = V.el('div', 'ut');
      for (let a = 0; a < 9; a++) { const b = V.el('button'); b.type = 'button'; b.dataset.a = a; b.setAttribute('aria-label', 'Bereich ' + AREA[a]); for (let k = 0; k < 9; k++) b.appendChild(V.el('i')); map.appendChild(b); }
      for (let b = 0; b < 9; b++) {
        const sb = V.el('div', 'sb');
        for (let k = 0; k < 9; k++) { const c = V.el('div', 'cl'); c.dataset.k = b * 9 + k; sb.appendChild(c); }
        el.appendChild(sb);
      }
      top.append(map, info); root.append(top, el); ctx.stage.appendChild(root);
      const cells = [...el.querySelectorAll('.cl')];
      ctx.nav(() => cells, { start: () => 40 });
      const human = () => s.res === null && !ctx.isAI(s.turn);
      map.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view = +b.dataset.a; V.sfx.tick(); render(); });
      el.addEventListener('click', e => {
        const t = e.target.closest('.cl'); if (!t || !human()) return;
        const m = view * 81 + +t.dataset.k; if (G.moves(s).includes(m)) move(m);
      });
      // number keys pick an area like the number pad (7 8 9 on top)
      ctx.keys(e => {
        if (!/^[1-9]$/.test(e.key)) return false;
        const n = +e.key, a = (2 - (((n - 1) / 3) | 0)) * 3 + (n - 1) % 3;
        view = a; V.sfx.tick(); render(); return true;
      });
      const mk = v => v === 1 ? 'x' : v === 2 ? 'o' : v === 3 ? 'd' : '';
      function render() {
        const legal = s.res === null ? G.moves(s) : [];
        const areas = new Set(legal.map(m => (m / 81) | 0)), boards = new Set(legal.filter(m => ((m / 81) | 0) === view).map(m => ((m / 9) | 0) % 9));
        [...map.children].forEach((b, a) => {
          [...b.querySelectorAll('i')].forEach((x, k) => { x.className = mk(s.mid[a * 9 + k]); });
          b.classList.toggle('view', a === view);
          b.classList.toggle('act', areas.has(a) && human() && areas.size < 9);
          b.classList.toggle('dim', !!s.top[a]);
          let w = b.querySelector('b');
          if (s.top[a] && !w) { w = V.el('b', mk(s.top[a]), s.top[a] === 3 ? 'remis' : s.top[a] === 1 ? 'X' : 'O'); b.appendChild(w); }
        });
        [...el.children].forEach((sb, b) => {
          const bi = view * 9 + b;
          sb.classList.toggle('act', boards.has(b) && human());
          sb.classList.toggle('dim', s.res === null && !boards.has(b) && !s.mid[bi]);
          sb.classList.remove('wl');
          [...sb.querySelectorAll('.cl')].forEach((c, k) => {
            const m = bi * 9 + k, v = s.c[m];
            c.textContent = v === 1 ? 'X' : v === 2 ? 'O' : '';
            c.className = 'cl' + (v === 1 ? ' x' : v === 2 ? ' o' : '') + (s.last === m ? ' last' : '');
          });
          const old = sb.querySelector('.won'); if (old) old.remove();
          const w = s.mid[bi];
          if (w) sb.appendChild(V.el('div', 'won ' + (w === 1 ? 'x' : w === 2 ? 'o' : 'd'), w === 1 ? 'X' : w === 2 ? 'O' : 'remis'));
        });
        const ln = s.top[view] && s.top[view] < 3 && lineOf(s.mid.slice(view * 9, view * 9 + 9));
        if (ln) ln.forEach(i => el.children[i].classList.add('wl'));
        const here = areas.has(view);
        info.innerHTML = `<b>Bereich ${AREA[view]}</b>${s.res !== null ? '' : !human() ? '' : areas.size > 1 ? (here ? 'Freie Wahl: du darfst in jedem offenen Bereich spielen. Andere Bereiche tippst du auf der Karte an.' : 'Freie Wahl: tipp auf der Karte einen offenen Bereich an.') : here ? (boards.size > 1 ? 'Freie Wahl in diesem Bereich.' : 'Hier musst du spielen.') : `Gespielt wird im Bereich ${AREA[[...areas][0]]}.`}`;
      }
      function move(m) {
        ctx.moved(s.turn, m);
        const before = s.mid.slice(), beforeTop = s.top.slice();
        s = G.play(s, m);
        view = (m / 81) | 0;
        if (ctx.isAI(3 - s.turn)) V.sfx.them(); else V.sfx.move();
        render();
        const lc = el.querySelector('.cl.last'); if (lc) V.fx.pop(lc);
        s.mid.forEach((v, i) => {
          if (v === before[i] || v === 3 || ((i / 9) | 0) !== view) return;
          V.sfx.place(); V.fx.burstAt(el.children[i % 9], V.hex(v), 14, 90); V.fx.shake(el, true);
        });
        s.top.forEach((v, a) => { if (v !== beforeTop[a] && v < 3) { V.sfx.goal(); V.fx.burstAt(map.children[a], V.hex(v), 18, 70); V.fx.flash(V.hex(v)); } });
        if (s.res !== null) { const ln = lineOf(s.top); if (ln) ln.forEach(a => map.children[a].classList.add('act')); return ctx.end(s.res); }
        // the next player looks at the area they have to play in
        ctx.later(() => { if (s.na >= 0) { view = s.na; render(); } next(); }, ctx.isAI(s.turn) ? 0 : 380);
      }
      function next() {
        ctx.turn(s.turn, ctx.isAI(s.turn) ? null : undefined);
        render();
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          // random playouts on 729 cells are long, so fewer per move than in Ultimate
          think: () => { const L = ctx.level, r = V.mcts(G, s, [40, 220, 900, 40000][L], [300, 800, 1400, 2800][L]); return { move: r.move, mood: (r.rate - 0.5) * 2.4 }; },
          targets: m => { view = (m / 81) | 0; render(); return [cells[m % 81]]; },
          decoys: () => G.moves(s).filter(m => ((m / 81) | 0) === view).map(m => cells[m % 81]),
          apply: move,
          decode: m => (G.moves(s).includes(m) ? m : null),
          say: m => `Bereich ${AREA[(m / 81) | 0]}, Brett ${AREA[((m / 9) | 0) % 9]}`
        });
      }
      render(); next();
    }
  });
})();
