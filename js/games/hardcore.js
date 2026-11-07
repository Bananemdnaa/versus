(function () {
  // Hardcore Tic Tac Toe: Ultimate Tic Tac Toe one level deeper. 9 areas, each an Ultimate board (9 boards of 9 cells),
  // 729 cells. Cell m: area a = m/81, board b = m/9 % 9, cell c = m % 9. Inside an area it is plain Ultimate (cell c sends
  // the other player to board c of the same area). When a move wins a small board, play jumps to the area at that board's
  // place (board b), and cell c picks the board there. The first to win three areas (anywhere) wins.
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  // result of 9 values from offset o: 1 or 2 won, 3 decided without winner, 0 open (3 counts for nobody in a line)
  function res9(v, o) {
    for (const l of LINES) { const x = v[o + l[0]]; if ((x === 1 || x === 2) && x === v[o + l[1]] && x === v[o + l[2]]) return x; }
    for (let k = 0; k < 9; k++) if (!v[o + k]) return 0;
    return 3;
  }
  const lineOf = v => LINES.find(l => (v[l[0]] === 1 || v[l[0]] === 2) && v[l[0]] === v[l[1]] && v[l[0]] === v[l[2]]);
  // na: the area in play (-1: the player picks one), nb: the board the player was sent to (-1: any in the area)
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
      const a = (m / 81) | 0, bi = (m / 9) | 0, ci = m % 9;
      const was = mid[bi];
      if (!mid[bi]) { mid[bi] = res9(c, bi * 9); if (mid[bi] && !top[a]) top[a] = res9(mid, a * 9); }
      // the first to win three areas (anywhere) wins; all areas decided without that: more areas wins, else a draw
      const n1 = top.filter(v => v === 1).length, n2 = top.filter(v => v === 2).length;
      const t = n1 >= 3 ? 1 : n2 >= 3 ? 2 : top.every(v => v) ? (n1 > n2 ? 1 : n2 > n1 ? 2 : 3) : 0;
      // a small board just won: play jumps to the area at that board's place (board b), else it stays in area a;
      // there the cell c of this move picks the board
      const won = !was && (mid[bi] === 1 || mid[bi] === 2), to = won ? bi % 9 : a;
      const na = top[to] ? -1 : to, nb = na < 0 || mid[na * 9 + ci] ? -1 : ci;
      return { c, mid, top, na, nb, turn: 3 - s.turn, res: t === 0 ? null : t === 3 ? 0 : t, last: m };
    }
  };

  V.css(`
  .hc{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .hc-top{display:flex;align-items:center;gap:14px;width:min(var(--bw),600px)}
  /* the overview: all nine areas with their boards, only to look at; while picking it turns into the big choice */
  .hc-ov{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;width:150px;aspect-ratio:1;padding:5px;border-radius:12px;background:var(--panel);border:1px solid var(--line)}
  .hc-ov .ar,.hc-pick .ar{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:3px;border-radius:7px;background:var(--panel2);border:1px solid transparent;min-width:0}
  .hc-ov .ar i,.hc-pick .ar i{border-radius:2px;background:var(--panel3)}
  .hc .ar i.x{background:var(--p1)} .hc .ar i.o{background:var(--p2)} .hc .ar i.d{background:#555b7a}
  .hc .ar.now{border-color:var(--cy);box-shadow:0 0 0 1px var(--cy),0 0 14px -2px var(--cy)}
  .hc .ar.done{opacity:.5}
  .hc .ar b{position:absolute;inset:0;display:grid;place-items:center;font:800 26px/1 var(--f-d);background:rgba(11,12,21,.62);border-radius:7px}
  .hc .ar b.x{color:var(--p1)} .hc .ar b.o{color:var(--p2)} .hc .ar b.d{color:var(--dim);font-size:13px}
  .hc .ar.wl{opacity:1;box-shadow:0 0 0 2px #fff,0 0 16px rgba(255,255,255,.6)}
  .hc-info{flex:1;min-width:0;font-size:13.5px;color:var(--muted);line-height:1.4}
  .hc-info b{display:block;font:800 italic 22px/1.05 var(--f-d);text-transform:uppercase;color:var(--fg);padding-right:.15em;margin-bottom:3px}
  .hc-info .sc{display:inline-flex;gap:6px;margin-top:6px;font:800 italic 15px/1 var(--f-d)}
  .hc-info .btn{margin-top:8px}
  .hc .ut{width:min(var(--bw),600px)}
  .hc-pick{width:min(var(--bw),600px);display:grid;grid-template-columns:repeat(3,1fr);gap:10px;aspect-ratio:1}
  .hc-pick .ar{gap:4px;padding:8px;border-radius:12px;border:2px solid var(--line2)}
  .hc-pick .ar.open{cursor:pointer;border-color:color-mix(in srgb,var(--cy) 55%,var(--line2))}
  .hc-pick .ar.open:hover,.hc-pick .ar.open.kf{border-color:var(--cy);box-shadow:0 0 16px -4px var(--cy)}
  .hc-pick .ar.done{cursor:default}
  .hc-pick .ar b{font-size:54px;border-radius:12px}
  .hc [hidden]{display:none!important}
  /* wide screens: overview and text left of the board, so the board gets the full height */
  @media (min-width:960px){.hc{flex-direction:row;align-items:flex-start;justify-content:center;gap:22px}.hc-top{flex-direction:column;align-items:flex-start;width:200px}.hc-ov{width:200px}}`);

  const AREA = ['oben links', 'oben', 'oben rechts', 'links', 'Mitte', 'rechts', 'unten links', 'unten', 'unten rechts'];

  // the AI's choice as a pure function of the state, so it can think in a worker (js/aiworker.js, V.register)
  function brain(s, L) { const r = V.mcts(G, s, [40, 220, 900, 40000][L], [300, 800, 1400, 2800][L]); return { move: r.move, mood: (r.rate - 0.5) * 2.4 }; }

  V.register({
    brain,
    id: 'hardcore', name: 'Hardcore Tic Tac Toe', cat: 'Klassiker', order: 5, accent: '#ff5d73', G,
    short: 'Ultimate Tic Tac Toe, nochmal verschachtelt.',
    desc: 'Neun Ultimate-Bretter in einem großen, 729 Felder. Wer ein kleines Brett gewinnt, schickt das Spiel in den Bereich an dessen Stelle. Wer zuerst drei Bereiche gewinnt, gewinnt das Spiel.',
    sides: { 1: 'X', 2: 'O' },
    keys: [['Pfeile', 'Cursor bewegen'], ['Enter', 'Setzen'], ['1–9', 'Bereich wählen (Ziffernblock)']],
    icon: `<svg viewBox="0 0 48 48">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<g transform="translate(${3 + c * 14.6} ${3 + r * 14.6})"><rect width="12.6" height="12.6" rx="2.4" fill="#1e2238" stroke="${r === 1 && c === 1 ? '#ff5d73' : '#2a2f4f'}" stroke-width="1.2"/>${[0, 1, 2].map(y => [0, 1, 2].map(x => `<rect x="${1.6 + x * 3.3}" y="${1.6 + y * 3.3}" width="2.6" height="2.6" rx=".6" fill="${(r * 3 + c + y * 3 + x) % 5 === 0 ? '#ff4fd8' : (r * 3 + c + y + x) % 7 === 0 ? '#ffd84f' : '#2f3556'}"/>`).join('')).join('')}</g>`).join('')).join('')}</svg>`,
    levelInfo: ['Anfänger: rechnet kaum und schickt dich oft, wohin du willst.', 'Spielt pro Zug ein paar hundert Partien durch.', 'Spielt pro Zug tausende Partien durch.', 'Nutzt die volle Bedenkzeit.'],
    tutorial: [
      { t: 'Drei Ebenen', d: 'Das Spielfeld hat <b>9 Bereiche</b>. Jeder Bereich ist ein ganzes Ultimate-Tic-Tac-Toe-Brett mit 9 kleinen Brettern, also 729 Felder.' },
      { t: 'Gewinnen von unten nach oben', d: 'Drei in einer Reihe gewinnt ein <b>kleines Brett</b>. Drei kleine Bretter in einer Reihe gewinnen einen <b>Bereich</b>. Wer zuerst <b>drei Bereiche</b> gewinnt, egal wo, gewinnt das ganze Spiel.' },
      { t: 'Im Bereich', d: 'Im Bereich spielt ihr ganz normales Ultimate: Setzt du im kleinen Brett <b>oben rechts</b>, muss der Gegner im Brett oben rechts weiterspielen. Ist dieses Brett schon entschieden, darf er überall im Bereich setzen.' },
      { t: 'Der Sprung', d: 'Gewinnt ein Zug ein kleines Brett, geht es im <b>Bereich an dessen Stelle</b> weiter: Wer das Brett oben rechts gewinnt, schickt den Gegner in den Bereich oben rechts. Das <b>Feld des letzten Zugs</b> bestimmt dort das Brett. Ist der Bereich schon entschieden, sucht sich der Gegner einen offenen aus. Zu Beginn wählt der Erste.' },
      { t: 'Die Übersicht', d: 'Oben siehst du alle neun Bereiche mit ihren Brettern und wer sie gewonnen hat. Der leuchtende ist der, in dem gerade gespielt wird.' }
    ],
    start(ctx) {
      let s = { c: Array(729).fill(0), mid: Array(81).fill(0), top: Array(9).fill(0), na: -1, nb: -1, turn: 1, res: null, last: -1 };
      // the area on screen; while a player picks (na < 0), picking shows the big choice until an area is chosen
      let view = 4, picking = false, jumped = '';
      const root = V.el('div', 'hc'), top = V.el('div', 'hc-top'), ov = V.el('div', 'hc-ov'), info = V.el('div', 'hc-info'), el = V.el('div', 'ut'), pick = V.el('div', 'hc-pick');
      const tile = a => { const t = V.el('div', 'ar'); t.dataset.a = a; for (let k = 0; k < 9; k++) t.appendChild(V.el('i')); return t; };
      for (let a = 0; a < 9; a++) { ov.appendChild(tile(a)); const p = tile(a); p.setAttribute('role', 'button'); p.setAttribute('aria-label', 'Bereich ' + AREA[a]); pick.appendChild(p); }
      for (let b = 0; b < 9; b++) {
        const sb = V.el('div', 'sb');
        for (let k = 0; k < 9; k++) { const c = V.el('div', 'cl'); c.dataset.k = b * 9 + k; sb.appendChild(c); }
        el.appendChild(sb);
      }
      top.append(ov, info); root.append(top, el, pick); ctx.stage.appendChild(root);
      const cells = [...el.querySelectorAll('.cl')], picks = [...pick.children];
      ctx.nav(() => picking ? picks.filter(p => p.classList.contains('open')) : cells, { start: () => 40 });
      const human = () => s.res === null && !ctx.isAI(s.turn);
      const choose = a => { if (!picking || s.top[a]) return; view = a; picking = false; V.sfx.ui(); render(); };
      pick.addEventListener('click', e => { const t = e.target.closest('.ar'); if (t) choose(+t.dataset.a); });
      el.addEventListener('click', e => {
        const t = e.target.closest('.cl'); if (!t || !human()) return;
        const m = view * 81 + +t.dataset.k; if (G.moves(s).includes(m)) move(m);
      });
      // number keys pick an area like the number pad (7 8 9 on top)
      ctx.keys(e => {
        if (!picking || !/^[1-9]$/.test(e.key)) return false;
        const n = +e.key; choose((2 - (((n - 1) / 3) | 0)) * 3 + (n - 1) % 3); return true;
      });
      const mk = v => v === 1 ? 'x' : v === 2 ? 'o' : v === 3 ? 'd' : '';
      function paintTile(t, a) {
        [...t.querySelectorAll('i')].forEach((x, k) => { x.className = mk(s.mid[a * 9 + k]); });
        t.classList.toggle('done', !!s.top[a]);
        let w = t.querySelector('b');
        if (s.top[a] && !w) t.appendChild(V.el('b', mk(s.top[a]), s.top[a] === 3 ? 'remis' : s.top[a] === 1 ? 'X' : 'O'));
      }
      function render() {
        const legal = s.res === null ? G.moves(s) : [];
        const boards = new Set(legal.filter(m => ((m / 81) | 0) === view).map(m => ((m / 9) | 0) % 9));
        [...ov.children].forEach((t, a) => { paintTile(t, a); t.classList.toggle('now', s.res === null && !picking && a === view); });
        picks.forEach((t, a) => { paintTile(t, a); t.classList.toggle('open', !s.top[a]); });
        el.hidden = picking; pick.hidden = !picking; ov.hidden = picking;
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
        const won = k => s.top.filter(v => v === k).length;
        const sc = `<span class="sc"><span class="c1">X ${won(1)}</span><span>:</span><span class="c2">${won(2)} O</span></span>`;
        const first = s.c.every(v => !v);
        info.innerHTML = picking ? `<b>${first ? 'Wo geht es los?' : 'Neuer Bereich'}</b>${first ? 'Such dir einen Bereich aus.' : 'Dieser Bereich ist schon entschieden. Such dir einen offenen aus.'}${sc}`
          : `<b>Bereich ${AREA[view]}</b>${s.res !== null || !human() ? '' : jumped ? jumped : s.na < 0 || boards.size > 1 ? 'Freie Wahl in diesem Bereich.' : 'Gewinnst du ein Brett, geht es im Bereich an dessen Stelle weiter.'}${sc}`
          + (!picking && human() && s.na < 0 ? '<br><button class="btn ghost sm" id="hcp"><span>Anderen Bereich wählen</span></button>' : '');
        const bp = info.querySelector('#hcp'); if (bp) bp.onclick = () => { picking = true; V.sfx.ui(); render(); };
      }
      function move(m) {
        ctx.moved(s.turn, m);
        const before = s.mid.slice(), beforeTop = s.top.slice();
        s = G.play(s, m);
        view = (m / 81) | 0; picking = false;
        if (ctx.isAI(3 - s.turn)) V.sfx.them(); else V.sfx.move();
        render();
        const lc = el.querySelector('.cl.last'); if (lc) V.fx.pop(lc);
        s.mid.forEach((v, i) => {
          if (v === before[i] || v === 3 || ((i / 9) | 0) !== view) return;
          V.sfx.place(); V.fx.burstAt(el.children[i % 9], V.hex(v), 14, 90); V.fx.shake(el, true);
        });
        // a board was won and play jumps to another area: say so on the next turn and give a moment to see the win
        const wonBoard = s.mid.some((v, i) => v !== before[i] && v < 3), from = (m / 81) | 0;
        jumped = wonBoard && s.na >= 0 && s.na !== from ? `Brett gewonnen: weiter im Bereich ${AREA[s.na]}.` : '';
        const doneNow = s.top.some((v, a) => v !== beforeTop[a]) || !!jumped;
        s.top.forEach((v, a) => { if (v !== beforeTop[a] && v < 3) { V.sfx.goal(); V.fx.burstAt(ov.children[a], V.hex(v), 18, 70); V.fx.flash(V.hex(v)); } });
        if (s.res !== null) { s.top.forEach((v, a) => { if (s.res && v === s.res) ov.children[a].classList.add('wl'); }); return ctx.end(s.res, `${s.top.filter(v => v === 1).length} : ${s.top.filter(v => v === 2).length} Bereiche`); }
        // an area was decided or play jumps: a moment to see it, then the next turn
        ctx.later(next, doneNow ? 1100 : ctx.isAI(s.turn) ? 0 : 200);
      }
      function next() {
        picking = s.na < 0 && !ctx.isAI(s.turn);
        if (s.na >= 0) view = s.na;
        ctx.turn(s.turn, ctx.isAI(s.turn) ? null : undefined);
        render();
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          // random playouts on 729 cells are long, so fewer per move than in Ultimate
          state: s,
          targets: m => { view = (m / 81) | 0; picking = false; render(); return [cells[m % 81]]; },
          decoys: () => G.moves(s).filter(m => ((m / 81) | 0) === view).map(m => cells[m % 81]),
          apply: move,
          decode: m => (G.moves(s).includes(m) ? m : null),
          say: m => `Bereich ${AREA[(m / 81) | 0]}, Brett ${AREA[((m / 9) | 0) % 9]}`
        });
      }
      next();
    }
  });
})();
