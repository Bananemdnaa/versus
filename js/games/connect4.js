(function () {
  const R = 6, C = 7;
  const WIN = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const w = [];
      for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C) break; w.push(rr * C + cc); }
      if (w.length === 4) WIN.push(w);
    }
  function lineAt(b, i) {
    const p = b[i], r0 = Math.floor(i / C), c0 = i % C;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [i];
      for (const sgn of [1, -1]) {
        let r = r0 + dr * sgn, c = c0 + dc * sgn;
        while (r >= 0 && r < R && c >= 0 && c < C && b[r * C + c] === p) { cells.push(r * C + c); r += dr * sgn; c += dc * sgn; }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }
  function dropRow(b, c) { for (let r = R - 1; r >= 0; r--) if (!b[r * C + c]) return r; return -1; }

  const G = {
    moves: s => { const m = []; for (let c = 0; c < C; c++) if (!s.b[c]) m.push(c); return m; },
    order: (s, ms) => ms.slice().sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3)),
    play(s, c) { const b = s.b.slice(); const r = dropRow(b, c); b[r * C + c] = s.turn; return { b, turn: 3 - s.turn, last: r * C + c, n: s.n + 1 }; },
    over(s, ply) { if (s.last >= 0 && lineAt(s.b, s.last)) return -(100000 - ply); if (s.n >= R * C) return 0; return null; },
    eval(s) {
      const me = s.turn, op = 3 - me, b = s.b; let v = 0;
      for (const w of WIN) {
        let a = 0, o = 0;
        for (const i of w) { if (b[i] === me) a++; else if (b[i] === op) o++; }
        if (a && o) continue;
        if (a === 3) v += 40; else if (a === 2) v += 6;
        if (o === 3) v -= 45; else if (o === 2) v -= 6;
      }
      for (let r = 0; r < R; r++) { const x = b[r * C + 3]; if (x === me) v += 5; else if (x === op) v -= 5; }
      return v;
    }
  };

  V.css(`
  .c4wrap{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:6px}
  .c4ghost{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:0 11px}
  .c4ghost div{aspect-ratio:1;border-radius:50%;transform:scale(.88);opacity:0;transition:opacity .12s}
  .c4ghost div.on{opacity:.45}
  .c4b{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:10px;background:#1a1f5c;border-radius:10px;border:1px solid #3b4aa8;box-shadow:0 0 50px -16px #4f6bff;cursor:pointer;touch-action:manipulation}
  .c4b .cell{aspect-ratio:1;border-radius:50%;background:var(--bg);position:relative;box-shadow:inset 0 3px 6px rgba(0,0,0,.7)}
  .c4b .disc,.c4ghost div{position:relative}
  .c4b .disc{position:absolute;inset:5%;border-radius:50%}
  .c4b .p1,.c4ghost .p1{background:radial-gradient(circle at 35% 30%,var(--p1hi),var(--p1) 62%);box-shadow:0 0 12px color-mix(in srgb,var(--p1) 55%,transparent)}
  .c4b .p2,.c4ghost .p2{background:radial-gradient(circle at 35% 30%,var(--p2hi),var(--p2) 62%);box-shadow:0 0 12px color-mix(in srgb,var(--p2) 50%,transparent)}
  .c4b .drop{animation:c4drop calc(.18s + var(--f)*.05s) cubic-bezier(.55,0,1,.45) both}
  @keyframes c4drop{from{transform:translateY(calc(var(--f) * -120%))}75%{transform:translateY(0)}88%{transform:translateY(-7%)}to{transform:none}}
  .c4b .w .disc{box-shadow:0 0 0 3px var(--cy),0 0 22px var(--cy);animation:c4win 1s ease-in-out infinite}
  @keyframes c4win{50%{transform:scale(.86)}}
  .c4b.done .cell:not(.w) .disc{opacity:.4;transition:opacity .5s}
  .c4b .cell{transition:background .15s}
  .c4b.hov .cell.col{background:#141733}
  .c4b.lock{cursor:default}`);

  V.register({
    id: 'c4', name: '4 Gewinnt', cat: 'Klassiker', order: 1, accent: 'var(--pink)',
    // "Gegenüber sitzen": the board turns to player 2 on their turn (stones fall down, so it has an up and down)
    turnBoard: true,
    short: 'Steine fallen lassen, vier verbinden.',
    desc: 'Lass deine Steine in die Spalten fallen. Wer zuerst vier in einer Reihe hat, gewinnt.',
    levelInfo: ['Anfänger: übersieht deine Dreier oft und lässt auch mal den eigenen Sieg liegen.', 'Blockt offene Dreier, fällt aber auf doppelte Drohungen rein.', 'Rechnet fünf Züge voraus.', 'Rechnet bis zu 14 Züge tief. Fehler werden sofort bestraft.'],
    keys: [['← →', 'Spalte wählen'], ['Enter ↓', 'Stein einwerfen'], ['1–7', 'Direkt in diese Spalte']],
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="7" width="42" height="36" rx="6" fill="#1a1f5c" stroke="#3b4aa8" stroke-width="2"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<circle cx="${10 + c * 9.3}" cy="${14 + r * 8.3}" r="3.3" fill="${(r === 3 && c < 3) || (r === 2 && c === 1) ? '#ff4fd8' : (r === 3 && c === 3) || (r === 2 && c === 0) || (r === 2 && c === 2) ? '#ffd84f' : '#0b0c15'}"/>`).join('')).join('')}</svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Das Brett hat <b>7 Spalten</b> und 6 Reihen. Ihr lasst abwechselnd einen Stein in eine Spalte fallen. Er rutscht bis ganz nach unten.', demo: V.mini(['.......', '.......', '...b...', '..ab...', '.aab.b.'], {}, { w: 260 }) },
      { t: 'Vier in einer Reihe', d: 'Wer zuerst <b>vier eigene Steine</b> waagerecht, senkrecht oder diagonal verbindet, gewinnt.', demo: V.mini(['.......', '.....A.', '..b.Ab.', '..bAbb.', '.aAaba.'], {}, { w: 260 }) },
      { t: 'Spalte wählen', d: 'Tippe auf eine Spalte, um dort einzuwerfen. Am PC siehst du über dem Brett, wo dein Stein landet. Ist eine Spalte voll, geht sie nicht mehr.' },
      { t: 'Tipps', d: 'Die <b>mittlere Spalte</b> ist die wertvollste, weil sie in die meisten Vierer passt. Achte immer auf drei gegnerische Steine mit einer freien Lücke und blocke sie. Noch stärker: Baue zwei Drohungen übereinander.', demo: V.mini(['.......', '.......', '...*...', '...a...', '..bab..', '.bbaab.'], {}, { w: 260 }) },
      { t: 'Remis', d: 'Ist das ganze Brett voll und niemand hat vier verbunden, endet das Spiel unentschieden.' }
    ],
    start(ctx) {
      let s = { b: Array(R * C).fill(0), turn: 1, last: -1, n: 0 }, over = false, busy = false;
      const wrap = V.el('div', 'c4wrap'), ghost = V.el('div', 'c4ghost'), board = V.el('div', 'c4b');
      for (let c = 0; c < C; c++) ghost.appendChild(V.el('div'));
      for (let i = 0; i < R * C; i++) { const cell = V.el('div', 'cell'); cell.dataset.c = i % C; board.appendChild(cell); }
      wrap.append(ghost, board); ctx.stage.appendChild(wrap);
      const human = () => !over && !busy && !ctx.isAI(s.turn);
      function showGhost(c) {
        [...ghost.children].forEach((g, k) => { g.className = k === c && human() && !s.b[c] ? 'on p' + s.turn : ''; });
        const show = c >= 0 && human();
        board.classList.toggle('hov', show);
        [...board.children].forEach((cell, i) => cell.classList.toggle('col', show && i % C === c));
      }
      let kcol = 3;
      board.addEventListener('mousemove', e => { const t = e.target.closest('.cell'); if (t) showGhost(+t.dataset.c); });
      board.addEventListener('mouseleave', () => showGhost(-1));
      board.addEventListener('click', e => { const t = e.target.closest('.cell'); if (t && human()) drop(+t.dataset.c); });
      ctx.keys(e => {
        if (!human()) return false;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { kcol = Math.max(0, Math.min(6, kcol + (e.key === 'ArrowLeft' ? -1 : 1))); showGhost(kcol); V.sfx.tick(); return true; }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { if (!e.repeat) drop(kcol); return true; }
        if (/^[1-7]$/.test(e.key)) { kcol = +e.key - 1; drop(kcol); return true; }
        return false;
      });
      function drop(c) {
        if (over || s.b[c]) return;
        ctx.moved(s.turn, c);
        const r = dropRow(s.b, c), who = s.turn;
        s = G.play(s, c);
        const cell = board.children[r * C + c];
        const d = V.el('div', 'disc drop p' + who); d.style.setProperty('--f', r + 1); cell.appendChild(d);
        showGhost(-1); busy = true;
        ctx.later(() => {
          V.sfx.place(); busy = false;
          V.fx.ringAt(d, V.hex(who));
          if (r === R - 1 || V.fxOn()) V.fx.shake(board, true);
          after();
        }, 180 + (r + 1) * 50);
      }
      function after() {
        const line = lineAt(s.b, s.last);
        if (line) {
          over = true; board.classList.add('lock', 'done');
          line.forEach((i, n) => ctx.later(() => { board.children[i].classList.add('w'); V.fx.burstAt(board.children[i], '#6ff3ff', 8, 55); }, n * 90));
          ctx.end(3 - s.turn); return;
        }
        if (s.n >= R * C) { over = true; ctx.end(0); return; }
        next();
      }
      function next() {
        ctx.turn(s.turn);
        board.classList.toggle('lock', ctx.isAI(s.turn));
        const land = c => board.children[dropRow(s.b, c) * C + c];
        if (ctx.isAI(s.turn)) ctx.aiTurn({
          think: () => {
            const L = ctx.level;
            // Leicht: only sees its own move and plays loosely. Mittel: two moves ahead. Schwer: 5. Profi: up to 14.
            const r = L === 0 ? V.weak(V.searchAll(G, s, 1, 500), 40, 0.35) : L === 1 ? V.pickSoft(V.searchAll(G, s, 2, 700), 18) : V.search(G, s, [5, 14][L - 2], [700, 2000][L - 2]);
            return { move: r.move, mood: V.mood(r.score, 70) };
          },
          targets: c => [land(c)],
          decoys: () => G.moves(s).map(land),
          apply: drop,
          decode: c => (G.moves(s).includes(c) ? c : null),
          say: c => 'Spalte ' + (c + 1)
        });
      }
      next();
    }
  });
})();
