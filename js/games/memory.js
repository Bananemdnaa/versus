(function () {
  // Memory: turn two cards; a pair stays with you and you go again, otherwise the next player.
  // The pictures are the icons of the Versus games. Move: { f: index } flips one card.

  V.css(`
  .memo{--cols:6;width:min(var(--bw),600px);display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:clamp(5px,1.4vw,9px);padding:clamp(8px,2vw,14px);border-radius:16px;user-select:none}
  .memo .mc{aspect-ratio:1;perspective:500px;cursor:pointer;position:relative}
  .memo .mc .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .38s var(--ease)}
  .memo .mc.up .in{transform:rotateY(180deg)}
  .memo .mc .fr,.memo .mc .bk{position:absolute;inset:0;border-radius:12%;backface-visibility:hidden;display:grid;place-items:center}
  .memo .mc .bk{background:repeating-linear-gradient(45deg,#ff4fd8 0 5px,#c93aac 5px 10px);box-shadow:0 3px 6px rgba(0,0,0,.45),inset 0 0 0 2px rgba(255,255,255,.55)}
  .memo .mc .bk::after{content:'';width:34%;height:34%;border-radius:50%;background:#ffd84f;box-shadow:0 0 0 3px rgba(255,255,255,.6)}
  .memo .mc .fr{transform:rotateY(180deg);background:linear-gradient(160deg,#fff,#efeae0);box-shadow:0 3px 6px rgba(0,0,0,.45)}
  .memo .mc .fr svg{width:72%;height:72%}
  .memo .mc.got{cursor:default}
  .memo .mc.got .fr{box-shadow:0 0 0 3px var(--gc),0 3px 6px rgba(0,0,0,.45)}
  .memo .mc.got .in{animation:mgot .5s var(--spring)}
  .memo .mc.gone{opacity:.0;transition:opacity .4s .6s}
  @keyframes mgot{50%{transform:rotateY(180deg) scale(1.12)}}
  .memo .mc:not(.up):not(.got):hover .bk{filter:brightness(1.12)}
  .memo.lock .mc{cursor:default}
  .lowfx .memo .mc .in{transition:none}`);

  V.register({
    id: 'memory', name: 'Memory', cat: 'Brettspiele', order: 7, accent: '#ff4fd8', party: true, noFirst: true,
    short: 'Paare finden, Gedächtnis zählt.',
    desc: 'Deck zwei Karten auf. Ein Paar bekommst du und darfst nochmal, sonst ist der Nächste dran. Wer am Ende die meisten Paare hat, gewinnt. Für 2 bis 4, am Gerät, gegen die KI oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Vergisst fast alles sofort.', 'Merkt sich ungefähr die Hälfte.', 'Hat ein gutes Gedächtnis.', 'Vergisst nichts.'],
    keys: [['Pfeile + Enter', 'Karte aufdecken']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'pairs', label: 'Paare', def: 12, choices: [[8, '8'], [12, '12'], [18, '18']] }],
    localHint: 'Ihr deckt reihum am selben Gerät auf.',
    endDelay: 1100,
    icon: `<svg viewBox="0 0 48 48"><rect x="4" y="5" width="18" height="18" rx="3" fill="#fff"/><circle cx="13" cy="14" r="5" fill="#ff4fd8"/><rect x="26" y="5" width="18" height="18" rx="3" fill="#c93aac"/><circle cx="35" cy="14" r="3.5" fill="#ffd84f"/><rect x="4" y="27" width="18" height="18" rx="3" fill="#c93aac"/><circle cx="13" cy="36" r="3.5" fill="#ffd84f"/><rect x="26" y="27" width="18" height="18" rx="3" fill="#fff"/><circle cx="35" cy="36" r="5" fill="#ff4fd8"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Alle Karten liegen verdeckt. Wer dran ist, deckt <b>zwei Karten</b> auf. Zeigen sie dasselbe Bild, ist es ein <b>Paar</b>: Du bekommst es und darfst nochmal.' },
      { t: 'Kein Paar', d: 'Passen die Karten nicht zusammen, werden sie nach kurzer Zeit wieder umgedreht und der Nächste ist dran. <b>Merk dir, wo welches Bild liegt!</b>' },
      { t: 'Gewinnen', d: 'Sind alle Paare gefunden, gewinnt, wer die meisten hat. Die Zahl der Paare stellst du vor dem Spiel ein: 8, 12 oder 18.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng;
      const pairs = [8, 12, 18].includes(+ctx.opts.pairs) ? +ctx.opts.pairs : 12;
      const pics = V.games.filter(g => g.id !== 'memory').map(g => g.icon);
      while (pics.length < pairs) pics.push(...pics);
      const deck = [];
      for (let k = 0; k < pairs; k++) deck.push(k, k);
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      const got = Array(deck.length).fill(0), score = {}; P.forEach(p => { score[p] = 0; });
      let turn = 1, open = [], over = false, busy = false;
      // the AI's memory: index -> picture it remembers
      const mem = new Map();
      const keep = [0.2, 0.5, 0.82, 1][ctx.level];
      const board = V.el('div', 'memo felt');
      board.style.setProperty('--cols', pairs === 8 ? 4 : 6);
      deck.forEach((k, i) => { const c = V.el('div', 'mc', `<div class="in"><div class="bk"></div><div class="fr">${pics[k]}</div></div>`); c.dataset.i = i; board.appendChild(c); });
      ctx.stage.appendChild(board);
      const cards = [...board.children];
      const CLR = { 1: '#ff4fd8', 2: '#ffd84f', 3: '#62f0ff', 4: '#5dff9d' };
      const human = () => !over && !busy && !ctx.isAI(turn);
      const hidden = () => cards.map((c, i) => i).filter(i => !got[i] && !open.includes(i));
      const status = () => ctx.status(P.map(p => `<span class="c${p}">${ctx.name(p)} ${score[p]}</span>`).join(' · '));
      function begin(p) { turn = p; open = []; busy = false; ctx.turn(p, false); status(); ask(); }
      function ask() {
        if (over) return;
        board.classList.toggle('lock', !human());
        if (!ctx.isAI(turn)) return;
        const s = turn;
        ctx.aiTurn({
          side: s, quick: open.length > 0,
          think: () => ({ move: { f: think() } }),
          targets: m => [cards[m.f]],
          decoys: () => hidden().slice(0, 6).map(i => cards[i]),
          apply: act,
          decode: raw => raw && Number.isInteger(raw.f) && hidden().includes(raw.f) ? { f: raw.f } : null
        });
      }
      function think() {
        const free = hidden(), known = [...mem.entries()].filter(([i]) => free.includes(i));
        if (open.length === 1) {
          const a = open[0], partner = known.find(([i, k]) => i !== a && k === deck[a]);
          if (partner) return partner[0];
          const unknown = free.filter(i => !mem.has(i));
          return V.pick(unknown.length ? unknown : free);
        }
        // a known pair: take it
        for (const [i, k] of known) { const j = known.find(([x, y]) => x !== i && y === k); if (j) return i; }
        const unknown = free.filter(i => !mem.has(i));
        return V.pick(unknown.length ? unknown : free);
      }
      function remember(i) { if (Math.random() < keep) mem.set(i, deck[i]); }
      function act(m) {
        const i = m.f;
        if (over || got[i] || open.includes(i) || open.length >= 2) return;
        ctx.moved(turn, { f: i });
        open.push(i); cards[i].classList.add('up'); V.sfx.tick();
        remember(i);
        if (open.length === 1) return ask();
        busy = true; board.classList.add('lock');
        const [a, b] = open, p = turn;
        const fast = ctx.fast();
        if (deck[a] === deck[b]) {
          ctx.later(() => {
            got[a] = got[b] = p; score[p]++; mem.delete(a); mem.delete(b);
            [a, b].forEach(k => { cards[k].classList.add('got'); cards[k].style.setProperty('--gc', CLR[p]); });
            V.sfx.goal(); V.fx.burstAt(cards[b], CLR[p], 12, 60);
            status();
            if (got.every(Boolean)) {
              over = true;
              const best = Math.max(...P.map(q => score[q])), win = P.filter(q => score[q] === best);
              return ctx.end(win.length > 1 ? 0 : win[0], P.map(q => score[q]).join(' : ') + ' Paare');
            }
            open = []; busy = false;
            ctx.status(`${ctx.who(p)} findet ein Paar und darf nochmal`);
            ask();
          }, fast ? 60 : 500);
        } else {
          ctx.later(() => {
            cards[a].classList.remove('up'); cards[b].classList.remove('up');
            V.sfx.miss();
            begin(P[(P.indexOf(p) + 1) % N]);
          }, fast ? 60 : 1100);
        }
      }
      board.addEventListener('click', e => { const c = e.target.closest('.mc'); if (c && human()) act({ f: +c.dataset.i }); });
      ctx.nav(() => human() ? hidden().map(i => cards[i]) : [], { pad: 2 });
      begin(1);
    }
  });
})();
