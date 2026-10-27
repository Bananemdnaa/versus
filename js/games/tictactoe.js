(function () {
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function winner(b) {
    for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { w: b[l[0]], line: l };
    return b.every(x => x) ? { w: 0 } : null;
  }
  const memo = new Map();
  // score from perspective of `turn`
  function minimax(b, turn) {
    const key = b.join('') + turn;
    if (memo.has(key)) return memo.get(key);
    const r = winner(b);
    let res;
    if (r) res = { s: r.w === 0 ? 0 : (r.w === turn ? 10 : -10), m: -1 };
    else {
      res = { s: -99, m: -1 };
      for (let i = 0; i < 9; i++) if (!b[i]) {
        b[i] = turn; const v = -minimax(b, 3 - turn).s * 0.9; b[i] = 0;
        if (v > res.s) res = { s: v, m: i };
      }
    }
    memo.set(key, res);
    return res;
  }

  V.css(`
  .ttt{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:10px;width:min(var(--bw),560px);aspect-ratio:1}
  .ttt button{min-width:0;min-height:0;background:var(--panel);border:1px solid var(--line);border-radius:8px;display:grid;place-items:center;transition:background .15s,border-color .15s,transform .12s}
  .ttt button:not(:disabled):hover{border-color:var(--line2);background:var(--panel2)}
  .ttt button:not(:disabled):active{transform:scale(.94)}
  .ttt button.w{border-color:var(--cy);background:#13303a;animation:tttw .6s var(--spring)}
  @keyframes tttw{40%{transform:scale(1.08)}}
  .ttt.dim button:not(.w){opacity:.45;transition:opacity .4s}
  .ttt svg{width:62%;height:62%;overflow:visible}
  .ttt .mx path{stroke:var(--p1);stroke-width:11;stroke-linecap:round;fill:none;stroke-dasharray:80;stroke-dashoffset:80;animation:drawx .26s ease-out forwards;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--p1) 60%,transparent))}
  .ttt .mx path+path{animation-delay:.11s}
  .ttt .mo circle{stroke:var(--p2);stroke-width:11;fill:none;stroke-dasharray:170;stroke-dashoffset:170;animation:drawx .34s ease-out forwards;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--p2) 55%,transparent))}
  .ttt .strike{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .ttt .strike line{stroke:#fff;stroke-width:.09;stroke-linecap:round;stroke-dasharray:5;stroke-dashoffset:5;animation:drawx .45s .1s ease-out forwards;filter:drop-shadow(0 0 .08px var(--cy))}
  @keyframes drawx{to{stroke-dashoffset:0}}`);

  const X = '<svg class="mx" viewBox="0 0 60 60"><path d="M8 8L52 52"/><path d="M52 8L8 52"/></svg>';
  const O = '<svg class="mo" viewBox="0 0 60 60"><circle cx="30" cy="30" r="24"/></svg>';
  const NUMPAD = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };

  V.register({
    id: 'ttt', name: 'Tic Tac Toe', cat: 'Klassiker', order: 3, accent: 'var(--pink)',
    short: 'Drei in einer Reihe auf 3×3.',
    desc: 'Der Klassiker in einer Minute: Wer zuerst drei Zeichen in eine Reihe bringt, gewinnt.',
    sides: { 1: 'X', 2: 'O' },
    keys: [['1–9', 'Feld setzen, angeordnet wie der Ziffernblock'], ['Pfeile', 'Cursor bewegen'], ['Enter', 'Setzen']],
    levelInfo: ['Setzt fast zufällig.', 'Sieht einfache Drohungen.', 'Patzt nur selten.', 'Spielt perfekt. Mehr als ein Remis ist nicht drin.'],
    icon: `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round"><path d="M17 4v40M31 4v40M4 17h40M4 31h40" stroke="#3a4070" stroke-width="3"/><path d="M6 6l7 7M13 6l-7 7" stroke="#ff4fd8" stroke-width="3.4"/><circle cx="24" cy="24" r="4" stroke="#ffd84f" stroke-width="3.4"/><path d="M35 35l7 7M42 35l-7 7" stroke="#ff4fd8" stroke-width="3.4"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Zwei Spieler setzen abwechselnd ihr Zeichen auf ein Feld des 3×3-Bretts: <b>X</b> fängt an, dann <b>O</b>. Wer zuerst drei eigene Zeichen in eine Reihe bringt, gewinnt.', demo: V.mini(['x.o', '.x.', 'o..']) },
      { t: 'Drei in einer Reihe', d: 'Die Reihe darf waagerecht, senkrecht oder diagonal sein. Hier hat X die Diagonale geschafft.', demo: V.mini(['Xo.', 'oX.', '..X']) },
      { t: 'Blocken', d: 'Hat der Gegner schon zwei in einer Reihe, setz dein Zeichen in die Lücke. Sonst gewinnt er im nächsten Zug.', demo: V.mini(['oo*', '.x.', 'x..']) },
      { t: 'Gabel stellen', d: 'Der stärkste Trick: Erzeuge zwei Drohungen auf einmal. Der Gegner kann nur eine blocken. Die Mitte und die Ecken sind dafür die besten Felder.', demo: V.mini(['x.*', '.o.', 'x.x'], { '*': { c: 'tg' } }) },
      { t: 'Unentschieden', d: 'Ist das Brett voll und niemand hat drei in einer Reihe, endet es remis. Wer fehlerfrei spielt, verliert nie. Die Profi-KI spielt genau so. Am PC kannst du mit den Zifferntasten 1 bis 9 setzen.' }
    ],
    start(ctx) {
      const b = Array(9).fill(0);
      let turn = 1, over = false;
      const el = V.el('div', 'ttt');
      for (let i = 0; i < 9; i++) { const c = V.el('button'); c.setAttribute('aria-label', 'Feld ' + (i + 1)); c.onclick = () => { if (!ctx.isAI(turn)) move(i); }; el.appendChild(c); }
      ctx.stage.appendChild(el);
      const cells = [...el.children].slice(0, 9);
      ctx.nav(() => cells);
      ctx.keys(e => { if (NUMPAD[e.key] !== undefined && !ctx.isAI(turn)) { move(NUMPAD[e.key]); return true; } return false; });
      function move(i) {
        if (over || b[i]) return;
        b[i] = turn;
        cells[i].innerHTML = turn === 1 ? X : O; cells[i].disabled = true;
        V.sfx.move(); V.fx.burstAt(cells[i], V.hex(turn), 6, 40);
        const r = winner(b);
        if (r) {
          over = true;
          cells.forEach(c => c.disabled = true);
          if (r.line) {
            const [a, , c] = r.line, pa = [a % 3 + 0.5, ((a / 3) | 0) + 0.5], pc = [c % 3 + 0.5, ((c / 3) | 0) + 0.5];
            const dx = (pc[0] - pa[0]) * 0.18, dy = (pc[1] - pa[1]) * 0.18;
            el.insertAdjacentHTML('beforeend', `<svg class="strike" viewBox="0 0 3 3"><line x1="${pa[0] - dx}" y1="${pa[1] - dy}" x2="${pc[0] + dx}" y2="${pc[1] + dy}" pathLength="5"/></svg>`);
            r.line.forEach((k, n) => ctx.later(() => { cells[k].classList.add('w'); V.fx.burstAt(cells[k], '#6ff3ff', 8, 60); }, 120 + n * 110));
            el.classList.add('dim');
          }
          ctx.end(r.w);
          return;
        }
        turn = 3 - turn; next();
      }
      function aiMove() {
        const free = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
        const p = [0.2, 0.6, 0.88, 1][ctx.level];
        if (Math.random() < p) { const r = minimax(b.slice(), turn); if (r.m >= 0) return r.m; }
        return V.pick(free);
      }
      function next() { ctx.turn(turn); if (ctx.isAI(turn)) ctx.think(() => move(aiMove())); }
      next();
    }
  });
})();
