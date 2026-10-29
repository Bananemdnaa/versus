(function () {
  // Mau-Mau with 32 cards (7 to Ass). Same suit or same rank on top. 7: the next one draws two (7s stack),
  // 8: the next one sits out, Bube: fits on everything and wishes a suit. First one without cards wins.
  // Moves: { p: card, w?: suit } play, { d: 1 } draw (or take the 7 penalty), { n: 1 } keep the drawn card and pass.
  const HAND = 5;

  V.css(`
  .mm{width:min(var(--bw),660px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .mm-opp{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;width:100%}
  .mm-o{--pc:var(--yellow);display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 10px;border-radius:10px;background:var(--panel);border:1px solid var(--line);min-width:90px;transition:border-color .2s,box-shadow .2s}
  .mm-o.on{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc)}
  .mm-o b{font:800 italic 14px/1 var(--f-d);text-transform:uppercase;color:var(--pc)}
  .mm-o .fan{display:flex;height:44px}
  .mm-o .fan .card{--cw:30px;margin-left:-20px} .mm-o .fan .card:first-child{margin-left:0}
  .mm-o small{color:var(--muted);font-size:12px}
  .mm-o .mau{font:800 italic 13px/1 var(--f-d);color:var(--bad);animation:mau 1s ease-in-out infinite}
  @keyframes mau{50%{transform:scale(1.15)}}
  .mm-table{width:100%;display:flex;align-items:center;justify-content:center;gap:clamp(14px,5vw,40px);padding:16px 10px;border-radius:16px;position:relative}
  .mm-table .card{--cw:clamp(64px,17vw,88px)}
  .mm-pile{position:relative;cursor:pointer}
  .mm-pile .card+.card{position:absolute;left:3px;top:-3px}
  .mm-pile .cnt{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font:700 italic 11px/1 var(--f-d);color:#d9f5e2;letter-spacing:.1em;white-space:nowrap}
  .mm-pile.can .card:last-child{box-shadow:0 0 0 3px var(--cyan),0 0 18px var(--cyan);animation:mmpile 1.2s ease-in-out infinite}
  @keyframes mmpile{50%{transform:translateY(-4px)}}
  .mm-disc{position:relative;width:calc(clamp(64px,17vw,88px) + 16px);aspect-ratio:5/7.4}
  .mm-disc .card{position:absolute;left:8px;top:2px}
  .mm-badge{position:absolute;top:8px;right:10px;display:flex;flex-direction:column;gap:6px;align-items:flex-end}
  .mm-badge span{padding:4px 10px;border-radius:999px;font:800 italic 14px/1 var(--f-d);background:#fff;color:#15172a;box-shadow:0 2px 6px rgba(0,0,0,.4)}
  .mm-badge .wish.red{color:#d62b4d} .mm-badge .pen{background:var(--bad);color:#fff}
  .mm-hand{display:flex;justify-content:center;padding:14px 8px 6px;min-height:120px;width:100%;overflow-x:auto;overflow-y:visible}
  .mm-hand .card{--cw:clamp(56px,15vw,78px);margin-left:calc(var(--ov,-18px))}
  .mm-hand .card:first-child{margin-left:0}
  .mm-acts{display:flex;gap:10px;justify-content:center;min-height:42px}
  .mm-wish{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(8,9,15,.8);border-radius:16px}
  .mm-wish div{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .mm-wish p{margin:0 0 10px;text-align:center;font:800 italic 18px/1 var(--f-d);text-transform:uppercase}
  .mm-wish button{width:64px;height:64px;border-radius:12px;background:#fff;font-size:36px;line-height:1;color:#15172a;box-shadow:0 3px 8px rgba(0,0,0,.5)}
  .mm-wish button.red{color:#d62b4d}
  .mm-wish button:hover{transform:translateY(-3px)}
  .mm-shout{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:800 italic 46px/1 var(--f-d);color:#fff;text-shadow:3px 3px 0 var(--pink),0 0 22px var(--pink);pointer-events:none;animation:shout 1.1s var(--spring) forwards;z-index:6;white-space:nowrap}
  @keyframes shout{from{transform:translate(-50%,-50%) scale(.3) rotate(-8deg);opacity:0}25%{transform:translate(-50%,-50%) scale(1.1) rotate(-4deg);opacity:1}80%{opacity:1}to{opacity:0;transform:translate(-50%,-70%) scale(1)}}`);

  V.register({
    id: 'maumau', name: 'Mau-Mau', cat: 'Brettspiele', order: 6, accent: '#ff5d73', party: true, noFirst: true,
    short: 'Farbe oder Zahl, wer zuerst leer ist.',
    desc: 'Der Kartenklassiker: Leg eine Karte mit gleicher Farbe oder gleichem Wert. 7 heißt zwei ziehen, 8 aussetzen, mit dem Buben wünschst du dir eine Farbe. Wer zuerst alle Karten los ist, gewinnt. Für 2 bis 4, am Gerät, gegen die KI oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Legt irgendeine Karte, die passt.', 'Legt passende Karten, plant aber nicht.', 'Hebt Buben auf, wünscht klug und ärgert dich mit 7 und 8.', 'Zählt Farben mit und spielt seine Sonderkarten im besten Moment.'],
    keys: [['Pfeile + Enter', 'Karte legen'], ['Leertaste', 'Karte ziehen'], ['W', 'Weiter nach dem Ziehen']],
    options: [{ id: 'n', label: 'Spieler', def: 3, choices: [[2, '2'], [3, '3'], [4, '4']] }],
    localHint: 'Ihr spielt reihum am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Karten sieht.',
    endDelay: 1200,
    icon: `<svg viewBox="0 0 48 48"><g transform="rotate(-14 20 26)"><rect x="8" y="10" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="12" y="20" font-size="9" font-weight="800" fill="#d62b4d" font-family="Arial">7</text><text x="19" y="32" font-size="13" fill="#d62b4d" font-family="Arial">♥</text></g><g transform="rotate(10 30 24)"><rect x="19" y="7" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="22" y="17" font-size="9" font-weight="800" fill="#15172a" font-family="Arial">B</text><text x="27" y="29" font-size="13" fill="#15172a" font-family="Arial">♣</text></g></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder bekommt <b>5 Karten</b>. Wer zuerst keine Karten mehr hat, gewinnt. Gespielt wird mit 32 Karten von 7 bis Ass.' },
      { t: 'Legen', d: 'Du darfst eine Karte legen, die zur obersten Karte in der Mitte passt: <b>gleiche Farbe</b> (♠ ♥ ♦ ♣) oder <b>gleicher Wert</b>. Tippe die Karte in deiner Hand an.' },
      { t: 'Ziehen', d: 'Kannst oder willst du nicht legen, tippe auf den <b>Stapel</b> und zieh eine Karte. Passt sie, darfst du sie gleich legen, sonst tippst du auf <b>Weiter</b>.' },
      { t: 'Sonderkarten', d: '<b>7</b>: Der Nächste muss zwei Karten ziehen, außer er legt selbst eine 7, dann muss der Übernächste vier ziehen usw. <b>8</b>: Der Nächste setzt aus. <b>Bube</b>: passt immer, und du <b>wünschst dir eine Farbe</b>.' },
      { t: 'Am selben Handy', d: 'Spielt ihr zu mehreren an einem Gerät, erscheint vor jedem Zug <b>„Gib das Gerät an …“</b>. Erst wenn der Richtige tippt, werden seine Karten gezeigt.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng;
      const hands = {}; P.forEach(p => { hands[p] = []; });
      let pile = V.deck(R, '789TJQKA'), disc = [], wish = null, pen = 0, skip = false, turn = 1, drew = null, over = false, viewer = 0;
      for (let k = 0; k < HAND; k++) P.forEach(p => hands[p].push(pile.pop()));
      // the first card on the table is never a special card
      let first = pile.findIndex(c => !'78J'.includes(c[0])); disc.push(pile.splice(first, 1)[0]);
      const top = () => disc[disc.length - 1];
      const wrap = V.el('div', 'mm'), opp = V.el('div', 'mm-opp'), table = V.el('div', 'mm-table felt'), hand = V.el('div', 'mm-hand'), acts = V.el('div', 'mm-acts');
      wrap.append(opp, table, hand, acts); ctx.stage.appendChild(wrap);
      const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
      const ok = (p, c) => {
        if (pen) return c[0] === '7';
        if (c[0] === 'J') return true;
        if (wish) return c[1] === wish;
        return c[1] === top()[1] || c[0] === top()[0];
      };
      const playable = p => hands[p].filter(c => ok(p, c));
      // whose cards are shown face up: online / against the AI your own, at one device the person on turn after the handoff
      const shown = () => ctx.mode === 'local' ? viewer : (ctx.mySide || 1);
      function draw() {
        const me = shown();
        opp.innerHTML = P.filter(p => p !== me).map(p => `<div class="mm-o${p === turn && !over ? ' on' : ''}" data-p="${p}" style="--pc:${CLR[p]}"><b>${ctx.name(p)}</b><div class="fan">${hands[p].slice(0, 8).map(() => V.card(null)).join('')}</div><small>${hands[p].length} Karten</small>${hands[p].length === 1 && !over ? '<span class="mau">Mau!</span>' : ''}</div>`).join('');
        const t = top();
        table.innerHTML = `<div class="mm-pile${myTurn() && !drew ? ' can' : ''}" id="mmp">${pile.length ? V.card(null) + (pile.length > 1 ? V.card(null) : '') : '<div class="card back no"><i></i></div>'}<span class="cnt">${pile.length} Karten</span></div>
          <div class="mm-disc">${disc.slice(-3).map((c, i, a) => V.card(c, i === a.length - 1 ? 'tp' : '').replace('class="card', `style="transform:rotate(${(i - a.length + 1) * 7 + (c.charCodeAt(0) % 5) - 2}deg)" class="card`)).join('')}</div>
          <div class="mm-badge">${wish ? `<span class="wish${'HD'.includes(wish) ? ' red' : ''}">Wunsch ${V.suitSym(wish)}</span>` : ''}${pen ? `<span class="pen">+${pen} ziehen</span>` : ''}</div>`;
        if (!me) { hand.innerHTML = ''; acts.innerHTML = ''; return; }
        const can = myTurn() && !busy;
        const list = hands[me].slice().sort((a, b) => 'SHDC'.indexOf(a[1]) - 'SHDC'.indexOf(b[1]) || '789TJQKA'.indexOf(a[0]) - '789TJQKA'.indexOf(b[0]));
        hand.style.setProperty('--ov', list.length > 7 ? `-${Math.min(44, 18 + (list.length - 7) * 4)}px` : '-14px');
        hand.innerHTML = list.map(c => V.card(c, can ? (ok(me, c) && (!drew || drew === c) ? 'can' : 'no') : '')).join('');
        acts.innerHTML = can && drew ? '<button class="btn" id="mmn"><span>Weiter</span></button>' : can && pen && !playable(turn).length ? `<button class="btn primary" id="mmd"><span>${pen} Karten ziehen</span></button>` : '';
        const n = acts.querySelector('#mmn'); if (n) n.onclick = () => act({ n: 1 });
        const d = acts.querySelector('#mmd'); if (d) d.onclick = () => act({ d: 1 });
      }
      let busy = false;
      const myTurn = () => !over && !ctx.isAI(turn) && shown() === turn;
      function begin(p) {
        turn = p; drew = null; busy = false;
        ctx.turn(p);
        if (!ctx.isAI(p) && ctx.mode === 'local') {
          if (viewer !== p) { viewer = 0; draw(); }
          return ctx.handoff(p, `${hands[p].length} Karten warten auf dich.`, () => { viewer = p; draw(); ask(); });
        }
        draw(); ask();
      }
      function ask() {
        if (over) return;
        if (!ctx.isAI(turn)) {
          if (pen && !playable(turn).length) ctx.status(`${ctx.who(turn)}: keine 7, du musst ${pen} ziehen`);
          else if (drew) ctx.status(`${ctx.who(turn)}: gezogen. Legen oder weiter`);
          else if (!playable(turn).length) ctx.status(`${ctx.who(turn)}: keine passende Karte, zieh vom Stapel`);
          return draw();
        }
        const s = turn;
        ctx.aiTurn({
          side: s, quick: !!drew,
          think: () => ({ move: think(s) }),
          targets: m => [m.p ? table.querySelector('.mm-disc') : table.querySelector('#mmp')],
          apply: act,
          decode: raw => {
            if (!raw || typeof raw !== 'object') return null;
            if (raw.p) return hands[s].includes(raw.p) && ok(s, raw.p) && (!drew || drew === raw.p) && (raw.p[0] !== 'J' || 'SHDC'.includes(raw.w)) ? { p: raw.p, w: raw.p[0] === 'J' ? raw.w : undefined } : null;
            if (raw.d) return !drew ? { d: 1 } : null;
            if (raw.n) return drew ? { n: 1 } : null;
            return null;
          },
          say: m => m.p ? V.cardName(m.p) + (m.w ? ', wünscht ' + V.suitName(m.w) : '') : m.d ? (pen ? pen + ' gezogen' : 'zieht') : ''
        });
      }
      function think(s) {
        const L = ctx.level, h = hands[s], can = playable(s).filter(c => !drew || c === drew);
        if (!can.length) return drew ? { n: 1 } : { d: 1 };
        const next = P[(P.indexOf(s) + 1) % N], nextFew = hands[next].length <= 2;
        let pick;
        if (L === 0) pick = V.pick(can);
        else if (L === 1) pick = can.find(c => c[0] !== 'J') || can[0];
        else {
          const bySuit = c => h.filter(x => x[1] === c[1] && x !== c).length;
          pick = can.slice().sort((a, b) => val(b) - val(a))[0];
          function val(c) {
            let v = bySuit(c) * 2 + '789TJQKA'.indexOf(c[0]) * 0.1;
            if (c[0] === 'J') v -= h.length > 2 ? 8 : -5;
            if (c[0] === '7') v += nextFew ? 6 : 1 + (L === 3 ? pen : 0);
            if (c[0] === '8') v += nextFew ? 5 : 0.5;
            return v;
          }
        }
        const m = { p: pick };
        if (pick[0] === 'J') {
          const left = h.filter(c => c !== pick && c[0] !== 'J');
          const cnt = s => left.filter(c => c[1] === s).length;
          m.w = L === 0 ? V.pick(['S', 'H', 'D', 'C']) : ['S', 'H', 'D', 'C'].sort((a, b) => cnt(b) - cnt(a))[0];
        }
        return m;
      }
      function refill() {
        if (pile.length) return;
        const keepTop = disc.pop(); pile = disc; disc = [keepTop];
        for (let i = pile.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pile[i], pile[j]] = [pile[j], pile[i]]; }
      }
      function take(p, n) { const got = []; for (let k = 0; k < n; k++) { refill(); if (!pile.length) break; const c = pile.pop(); hands[p].push(c); got.push(c); } return got; }
      function shout(t) { const s = V.el('div', 'mm-shout', t); table.appendChild(s); setTimeout(() => s.remove(), 1200); }
      function act(m) {
        if (over || busy) return;
        const p = turn;
        if (m.p) {
          if (!hands[p].includes(m.p) || !ok(p, m.p) || (drew && drew !== m.p)) return;
          if (m.p[0] === 'J' && !m.w) return askWish(m.p);
          ctx.moved(p, m.w ? { p: m.p, w: m.w } : { p: m.p });
          hands[p].splice(hands[p].indexOf(m.p), 1); disc.push(m.p);
          wish = m.p[0] === 'J' ? m.w : null;
          if (m.p[0] === '7') pen += 2;
          skip = m.p[0] === '8';
          // the card flies from the hand (or the other player's fan) onto the pile
          const src = hand.querySelector(`[data-c="${m.p}"]`) || opp.querySelector(`[data-p="${p}"] .fan`);
          const from = src && !ctx.fast() ? src.getBoundingClientRect() : null;
          if (ctx.isAI(p)) V.sfx.them(); else V.sfx.place();
          busy = true; draw();
          const tc = table.querySelector('.tp'); if (tc) { if (from) V.kit.fly(tc, from, 320); else V.fx.pop(tc, 'deal'); }
          if (!hands[p].length) { shout('Mau-Mau!'); over = true; draw(); return ctx.end(p, `${ctx.name(p)} hat keine Karten mehr`); }
          if (hands[p].length === 1) { shout('Mau!'); V.sfx.goal(); }
          if (m.p[0] === '8') ctx.status(`${ctx.who(p)} legt eine 8, ${ctx.who(P[(P.indexOf(p) + 1) % N])} setzt aus`);
          else if (m.p[0] === '7') ctx.status(`${ctx.who(p)} legt eine 7: +${pen}`);
          else if (wish) ctx.status(`${ctx.who(p)} wünscht sich ${V.suitSym(wish)} ${V.suitName(wish)}`);
          return ctx.later(nextPlayer, ctx.fast() ? 30 : 520);
        }
        if (m.d && !drew) {
          ctx.moved(p, { d: 1 });
          if (pen) {
            const n = pen, pr = pileRect(), got = take(p, n); pen = 0; V.sfx.hit();
            ctx.status(`${ctx.who(p)} zieht ${n} Karten`);
            busy = true; draw(); flyIn(got, pr); return ctx.later(nextPlayer, ctx.fast() ? 30 : 600);
          }
          const pr = pileRect(), got = take(p, 1); V.sfx.move();
          drew = got[0] || null;
          if (!drew || !ok(p, drew)) { ctx.status(`${ctx.who(p)} zieht und kann nicht legen`); busy = true; draw(); flyIn(got, pr); return ctx.later(nextPlayer, ctx.fast() ? 30 : 600); }
          draw(); flyIn(got, pr); return ask();
        }
        if (m.n && drew) { ctx.moved(p, { n: 1 }); busy = true; draw(); return ctx.later(nextPlayer, ctx.fast() ? 30 : 300); }
      }
      // drawn cards fly from the pile into the hand that is shown, the hand fans out again
      const pileRect = () => { const e = table.querySelector('#mmp'); return e && !ctx.fast() ? e.getBoundingClientRect() : null; };
      const flyIn = (cards, from) => { if (from) cards.forEach(c => V.kit.fly(hand.querySelector(`[data-c="${c}"]`), from, 300)); };
      function askWish(card) {
        const el = V.el('div', 'mm-wish', `<div><p>Welche Farbe wünschst du dir?</p><div>${['S', 'H', 'D', 'C'].map(s => `<button data-w="${s}" class="${'HD'.includes(s) ? 'red' : ''}" aria-label="${V.suitName(s)}">${V.suitSym(s)}</button>`).join('')}</div></div>`);
        table.appendChild(el); V.sfx.ui();
        el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { el.remove(); act({ p: card, w: b.dataset.w }); });
      }
      function nextPlayer() {
        let i = P.indexOf(turn);
        i = (i + 1) % N;
        if (skip) { skip = false; i = (i + 1) % N; }
        begin(P[i]);
      }
      hand.addEventListener('click', e => { const c = e.target.closest('.card.can'); if (c && myTurn()) act({ p: c.dataset.c }); });
      table.addEventListener('click', e => { if (e.target.closest('#mmp') && myTurn() && !drew) act({ d: 1 }); });
      ctx.nav(() => myTurn() ? [...hand.querySelectorAll('.card.can')] : [], { pad: 2 });
      ctx.keys(e => {
        if (!myTurn()) return false;
        if (e.key === ' ' && !e.repeat && !V.nav.active && !drew) { act({ d: 1 }); return true; }
        if ((e.key === 'w' || e.key === 'W') && drew) { act({ n: 1 }); return true; }
        return false;
      });
      begin(1);
    }
  });
})();
