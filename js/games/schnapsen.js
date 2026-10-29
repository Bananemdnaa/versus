(function () {
  // Schnapsen, the Austrian card game for two, with 20 cards: Ass, Zehner, König, Dame, Bube in four suits.
  // Card points A 11, 10 10, K 4, D 3, B 2; whoever has 66 first wins the round. Five cards each, the rest is the
  // talon with the trump card (Atout) face up underneath. While the talon is open any card may be played; once it is
  // closed (zugedreht) or empty you must follow suit, beat if you can and else trump.
  // König + Dame of one suit, shown on your lead: 20 (40 in trump), counted once you have a trick.
  // Round points: 3 if the other has no trick, 2 if they have less than 33, else 1. First to `to` wins (7 = Bummerl).
  // Moves: { c: card } play a card, { x: 1 } swap the trump Bube for the open trump card, { z: 1 } close the talon.
  const ORD = 'JQKTA', VAL = { A: 11, T: 10, K: 4, Q: 3, J: 2 };

  // ---------- rules on a plain state, shared by the game and the AI search ----------
  const left = S => S.stock.length + (S.atout ? 1 : 0);
  const open = S => !S.closed && left(S) > 0;
  const beats = (S, c, o) => c[1] === o[1] ? ORD.indexOf(c[0]) > ORD.indexOf(o[0]) : c[1] === S.trump;
  function legal(S, p) {
    const h = S.h[p];
    if (!S.trick.length || open(S)) return h.slice();
    const lc = S.trick[0].c, same = h.filter(c => c[1] === lc[1]);
    if (same.length) { const up = same.filter(c => beats(S, c, lc)); return up.length ? up : same; }
    const tr = h.filter(c => c[1] === S.trump);
    return tr.length ? tr : h.slice();
  }
  // König or Dame led while the partner is in the hand: 20, in trump 40
  const marriage = (S, p, c) => !S.trick.length && 'KQ'.includes(c[0]) && S.h[p].includes((c[0] === 'K' ? 'Q' : 'K') + c[1]) ? (c[1] === S.trump ? 40 : 20) : 0;
  const canSwap = (S, p) => !S.trick.length && S.turn === p && open(S) && left(S) >= 2 && S.atout && S.h[p].includes('J' + S.trump);
  const canClose = (S, p) => !S.trick.length && S.turn === p && open(S) && left(S) >= 4;
  function take(S, p) {
    if (S.stock.length) { const c = S.stock.pop(); S.h[p].push(c); return c; }
    if (S.atout) { const c = S.atout; S.atout = null; S.h[p].push(c); return c; }
    return null;
  }
  // returns { mar, w (trick winner), cards, drew: { side: card }, end (round winner) }
  function play(S, p, c) {
    const ev = { mar: 0, w: 0, end: 0, drew: {} };
    if (!S.trick.length) {
      const m = marriage(S, p, c);
      S.h[p].splice(S.h[p].indexOf(c), 1);
      if (m) {
        if (S.tricks[p]) S.pts[p] += m; else S.pend[p] += m;
        S.mar[p].push(c[1]); ev.mar = m;
        if (S.pts[p] >= 66) { S.done = ev.end = p; return ev; }
      }
      S.trick.push({ s: p, c }); S.turn = 3 - p;
      return ev;
    }
    S.h[p].splice(S.h[p].indexOf(c), 1);
    S.trick.push({ s: p, c });
    const [a, b] = S.trick, w = beats(S, b.c, a.c) ? b.s : a.s;
    S.pts[w] += VAL[a.c[0]] + VAL[b.c[0]]; S.tricks[w]++;
    if (S.pend[w]) { S.pts[w] += S.pend[w]; S.pend[w] = 0; }
    S.won.push(a.c, b.c);
    ev.w = w; ev.cards = [a, b]; S.trick = [];
    if (open(S)) { ev.drew[w] = take(S, w); ev.drew[3 - w] = take(S, 3 - w); }
    S.turn = w;
    if (S.pts[w] >= 66) ev.end = w;
    // all cards played: the last trick wins, but whoever closed the talon and missed 66 loses
    else if (!S.h[1].length && !S.h[2].length) ev.end = S.closed ? 3 - S.closed : w;
    if (ev.end) S.done = ev.end;
    return ev;
  }
  function swap(S, p) { const j = 'J' + S.trump; S.h[p].splice(S.h[p].indexOf(j), 1, S.atout); S.atout = j; }
  // the other side's tricks and points when the talon was closed decide what the closer gets
  function close(S, p) { S.closed = p; S.snap = { t: S.tricks[3 - p], p: S.pts[3 - p] }; }
  function result(S, w) {
    const l = 3 - w, snap = S.closed === w ? S.snap : { t: S.tricks[l], p: S.pts[l] };
    let n = snap.t === 0 ? 3 : snap.p < 33 ? 2 : 1;
    if (S.closed && S.closed !== w) n = Math.max(n, S.snap.t === 0 ? 3 : 2);
    return n;
  }
  const clone = S => ({ h: { 1: S.h[1].slice(), 2: S.h[2].slice() }, stock: [], atout: null, trump: S.trump, closed: S.closed, snap: S.snap, pts: Object.assign({}, S.pts), tricks: Object.assign({}, S.tricks), pend: Object.assign({}, S.pend), trick: S.trick.slice(), turn: S.turn, mar: { 1: [], 2: [] }, won: [], done: 0 });
  // perfect play once nothing is drawn any more: round points for `me` (+ win, - loss)
  function search(S, me) {
    if (S.done) return (S.done === me ? 1 : -1) * result(S, S.done) + (S.pts[me] - S.pts[3 - me]) / 1000;
    const p = S.turn; let best = p === me ? -99 : 99;
    for (const c of legal(S, p)) {
      const T = clone(S); play(T, p, c);
      const v = search(T, me);
      if (p === me ? v > best : v < best) best = v;
    }
    return best;
  }

  V.css(`
  .sn{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .sn-opp{display:flex;flex-direction:column;align-items:center;gap:4px}
  .sn-opp .fan{display:flex;height:50px}
  .sn-opp .fan .card{--cw:34px;margin-left:-20px} .sn-opp .fan .card:first-child{margin-left:0}
  .sn-info{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.04em}
  .sn-info b{color:var(--fg);font:800 italic 15px/1 var(--f-d)}
  .sn-info .pend{color:var(--yellow)}
  .sn-table{width:100%;min-height:clamp(150px,40vw,200px);display:flex;align-items:center;justify-content:center;gap:clamp(18px,7vw,54px);padding:16px 10px;border-radius:16px;position:relative}
  .sn-table .card{--cw:clamp(58px,15vw,80px)}
  .sn-talon{position:relative;width:calc(clamp(58px,15vw,80px) * 1.6);height:calc(clamp(58px,15vw,80px) * 1.4);display:grid;place-items:center}
  .sn-talon .atout{position:absolute;left:50%;top:50%;transform:translate(-4%,-50%) rotate(90deg)}
  .sn-talon .stk{position:relative;transform:translateX(-58%);z-index:1}
  .sn-talon .stk .card+.card{position:absolute;left:3px;top:-3px}
  .sn-talon.shut .stk{transform:translateX(-4%)}
  .sn-talon.shut .atout{transform:translate(-50%,-50%) rotate(0deg);filter:brightness(.8)}
  .sn-talon .cnt{position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);font:700 italic 11px/1 var(--f-d);color:#d9f5e2;letter-spacing:.1em;white-space:nowrap}
  .sn-trick{position:relative;width:calc(clamp(58px,15vw,80px) * 1.7);height:calc(clamp(58px,15vw,80px) * 1.55)}
  .sn-trick .card{position:absolute;left:4%;top:10%}
  .sn-trick .card.t2{left:auto;right:4%;top:0}
  .sn-trick.go .card{transition:transform .45s var(--ease),opacity .45s;opacity:0}
  .sn-trick.go.up .card{transform:translateY(-120px) scale(.6)} .sn-trick.go.dn .card{transform:translateY(120px) scale(.6)}
  .sn-badge{position:absolute;top:8px;left:10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
  .sn-badge span{padding:4px 10px;border-radius:999px;font:800 italic 13px/1 var(--f-d);background:#fff;color:#15172a;box-shadow:0 2px 6px rgba(0,0,0,.4)}
  .sn-badge .red{color:#d62b4d} .sn-badge .shut{background:var(--bad);color:#fff}
  .sn-score{position:absolute;top:8px;right:10px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font:800 italic 14px/1 var(--f-d)}
  .sn-score small{font:700 10px/1 var(--f-b,inherit);opacity:.7;margin-left:4px;letter-spacing:.06em}
  .sn-hand{display:flex;justify-content:center;padding:14px 8px 6px;min-height:120px;width:100%}
  .sn-hand .card{--cw:clamp(58px,16vw,80px);margin-left:-12px}
  .sn-hand .card:first-child{margin-left:0}
  .sn-hand .card.tr{box-shadow:0 0 0 2px var(--yellow),0 3px 8px rgba(0,0,0,.45)}
  .sn-hand .card.mr::after{content:"♛";position:absolute;top:-10px;left:-6px;z-index:2;width:20px;height:20px;border-radius:50%;background:var(--yellow);color:#15172a;font-size:12px;display:grid;place-items:center;box-shadow:0 2px 4px rgba(0,0,0,.4)}
  .sn-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;min-height:42px}
  .sn-acts .sn-info{width:100%}
  .sn-end{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(8,9,15,.82);border-radius:10px;text-align:center;padding:10px;animation:fadein .3s}
  .sn-end b{font:800 italic clamp(18px,5vw,24px)/1.1 var(--f-d);text-transform:uppercase}
  .sn-end span{font:800 italic 22px/1 var(--f-d);color:var(--yellow)}
  .sn-end small{color:var(--muted);font-size:13px}
  .sn-end em{font:800 italic 26px/1 var(--f-d);font-style:normal;margin-top:2px}
  @keyframes fadein{from{opacity:0}}
  .sn-shout{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font:800 italic 40px/1 var(--f-d);color:#fff;text-shadow:3px 3px 0 var(--pink),0 0 22px var(--pink);pointer-events:none;animation:shout 1.2s var(--spring) forwards;z-index:6;white-space:nowrap}`);

  V.register({
    id: 'schnapsen', name: 'Schnapsen', cat: 'Brettspiele', order: 7, accent: '#ffd84f',
    short: '20 Karten, 66 Punkte, Zudrehen.',
    desc: 'Der österreichische Kartenklassiker für zwei: Stiche machen, Zwanziger und Vierziger ansagen und im richtigen Moment zudrehen. Wer zuerst 66 Punkte hat, gewinnt die Runde. Am Gerät, gegen die KI oder online.',
    sides: { 1: 'Pink', 2: 'Gelb' },
    firstTitle: 'Wer spielt zuerst aus?',
    levelInfo: ['Spielt irgendeine Karte.', 'Sticht hohe Karten und sagt Zwanziger an.', 'Zählt Punkte mit und dreht zu, wenn es reicht.', 'Merkt sich jede Karte und spielt das Ende perfekt.'],
    keys: [['Pfeile + Enter', 'Karte spielen'], ['T', 'Atout tauschen'], ['Z', 'Zudrehen']],
    options: [{ id: 'to', label: 'Spiel bis', def: 4, choices: [[4, '4 Punkte'], [7, '7 (Bummerl)']] }],
    localHint: 'Ihr spielt abwechselnd am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Karten sieht.',
    endDelay: 1200,
    icon: `<svg viewBox="0 0 48 48"><g transform="rotate(-12 20 26)"><rect x="7" y="10" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="11" y="20" font-size="9" font-weight="800" fill="#d62b4d" font-family="Arial">K</text><text x="18" y="32" font-size="13" fill="#d62b4d" font-family="Arial">♥</text></g><g transform="rotate(10 30 24)"><rect x="19" y="7" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="22" y="17" font-size="9" font-weight="800" fill="#d62b4d" font-family="Arial">D</text><text x="27" y="29" font-size="13" fill="#d62b4d" font-family="Arial">♥</text></g><circle cx="38" cy="38" r="8" fill="#ffd84f"/><text x="38" y="42" text-anchor="middle" font-size="9" font-weight="800" fill="#15172a" font-family="Arial">66</text></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Gespielt wird mit <b>20 Karten</b>: Ass (11 Punkte), Zehner (10), König (4), Dame (3) und Bube (2). Wer in einer Runde zuerst <b>66 Punkte</b> aus seinen Stichen hat, gewinnt sie.' },
      { t: 'Stiche', d: 'Jeder hat 5 Karten. Einer spielt aus, der andere legt dazu. Die höhere Karte der ausgespielten Farbe gewinnt, eine <b>Atout</b>-Karte (Trumpf, offen unter dem Stapel) sticht alles. Nach dem Stich ziehen beide nach, der Gewinner zuerst und spielt wieder aus.' },
      { t: 'Zwanziger und Vierziger', d: 'Hast du <b>König und Dame</b> einer Farbe, spiel eine davon aus: Das zählt <b>20 Punkte</b>, in Atout <b>40</b>. Die Punkte zählen, sobald du einen Stich hast. Die Krone ♛ in deiner Hand zeigt solche Paare.' },
      { t: 'Tauschen und Zudrehen', d: 'Mit dem <b>Atout-Buben</b> darfst du vor dem Ausspielen die offene Atout-Karte holen. Mit <b>Zudrehen</b> schließt du den Stapel: Ab dann wird nichts mehr gezogen und jeder muss <b>Farbe geben, höher spielen wenn möglich, sonst stechen</b>. Das gilt auch, wenn der Stapel leer ist.' },
      { t: 'Punkte', d: 'Der Sieger einer Runde bekommt <b>3</b> Punkte, wenn der andere keinen Stich hat, <b>2</b>, wenn er unter 33 hat, sonst <b>1</b>. Wer zudreht und keine 66 schafft, schenkt dem anderen mindestens 2. Ohne 66 gewinnt sonst der letzte Stich.' }
    ],
    start(ctx) {
      const R = ctx.rng, local = ctx.mode === 'local';
      const TO = [4, 7].includes(+ctx.opts.to) ? +ctx.opts.to : 4;
      const gp = { 1: 0, 2: 0 };
      let S = null, round = 0, over = false, busy = false, viewer = 0, shownTrick = null, quick = false, endEl = null;
      const wrap = V.el('div', 'sn'), opp = V.el('div', 'sn-opp'), table = V.el('div', 'sn-table felt'), hand = V.el('div', 'sn-hand'), acts = V.el('div', 'sn-acts');
      wrap.append(opp, table, hand, acts); ctx.stage.appendChild(wrap);
      // whose cards are face up: online your seat, against the AI your side, at one device whoever has the phone
      const shown = () => local ? viewer : ctx.mySide || (ctx.aiSide ? 3 - ctx.aiSide : 1);
      const myTurn = () => S && !over && !S.done && !busy && !ctx.isAI(S.turn) && shown() === S.turn;
      const strict = () => !open(S);
      const sortH = h => h.slice().sort((a, b) => (a[1] === S.trump) - (b[1] === S.trump) || 'SHDC'.indexOf(a[1]) - 'SHDC'.indexOf(b[1]) || ORD.indexOf(b[0]) - ORD.indexOf(a[0]));

      function newRound() {
        round++;
        const deck = V.deck(R, ORD);
        S = { h: { 1: deck.slice(0, 5), 2: deck.slice(5, 10) }, atout: deck[10], stock: deck.slice(11), trump: deck[10][1], closed: 0, snap: null,
          pts: { 1: 0, 2: 0 }, tricks: { 1: 0, 2: 0 }, pend: { 1: 0, 2: 0 }, trick: [], turn: round % 2 ? 1 : 2, mar: { 1: [], 2: [] }, won: [], done: 0 };
        shownTrick = null; busy = false;
        if (endEl) { endEl.remove(); endEl = null; }
        if (local) ctx.handReset();
        begin(S.turn);
      }
      function info(p) {
        const pend = S.pend[p] ? ` <span class="pend">+${S.pend[p]} nach dem ersten Stich</span>` : '';
        return `<div class="sn-info"><span>Punkte <b>${S.pts[p]}</b>${pend}</span><span>Stiche <b>${S.tricks[p]}</b></span>${S.mar[p].length ? `<span>Angesagt <b>${S.mar[p].map(V.suitSym).join(' ')}</b></span>` : ''}</div>`;
      }
      function draw() {
        if (!S) return;
        const me = shown(), o = me ? 3 - me : 2;
        opp.innerHTML = `<div class="fan">${S.h[o].map(() => V.card(null)).join('')}</div>${info(o)}`;
        const tk = S.trick.length ? S.trick : shownTrick || [];
        const n = left(S);
        table.innerHTML = `<div class="sn-talon${S.closed ? ' shut' : ''}" id="snt">${S.atout ? V.card(S.atout, 'atout') : ''}${S.stock.length ? `<div class="stk">${V.card(null)}${S.stock.length > 1 ? V.card(null) : ''}</div>` : ''}<span class="cnt">${n ? n + ' Karten' : 'leer'}</span></div>
          <div class="sn-trick" id="snk">${tk.map((t, i) => V.card(t.c, 't' + (i + 1))).join('')}</div>
          <div class="sn-badge"><span class="${'HD'.includes(S.trump) ? 'red' : ''}">Atout ${V.suitSym(S.trump)}</span>${S.closed ? '<span class="shut">Zugedreht</span>' : ''}</div>
          <div class="sn-score">${gp[1]} : ${gp[2]}<small>bis ${TO}</small></div>`;
        if (endEl) table.appendChild(endEl);
        if (!me) { hand.innerHTML = ''; acts.innerHTML = ''; return; }
        const can = myTurn(), ok = can ? legal(S, me) : [];
        const pair = c => 'KQ'.includes(c[0]) && S.h[me].includes((c[0] === 'K' ? 'Q' : 'K') + c[1]);
        hand.innerHTML = sortH(S.h[me]).map(c => V.card(c, [c[1] === S.trump ? 'tr' : '', pair(c) ? 'mr' : '', can ? (ok.includes(c) ? 'can' : 'no') : ''].join(' '))).join('');
        const b = [];
        if (can && canSwap(S, me)) b.push(`<button class="btn" id="snx"><span>Atout tauschen</span></button>`);
        if (can && canClose(S, me)) b.push(`<button class="btn" id="snz"><span>Zudrehen</span></button>`);
        acts.innerHTML = b.join('');
        const x = acts.querySelector('#snx'); if (x) x.onclick = () => act({ x: 1 });
        const z = acts.querySelector('#snz'); if (z) z.onclick = () => act({ z: 1 });
        // the own info line sits under the hand
        acts.insertAdjacentHTML('beforeend', info(me));
      }
      function begin(p) {
        busy = false;
        ctx.turn(p);
        if (!ctx.isAI(p) && local) {
          if (viewer !== p) { viewer = 0; draw(); }
          return ctx.handoff(p, S.trick.length ? 'Du gibst zum Stich dazu.' : 'Du spielst aus.', () => { viewer = p; draw(); ask(); });
        }
        draw(); ask();
      }
      function ask() {
        if (over || S.done) return;
        const p = S.turn;
        if (!ctx.isAI(p)) {
          if (S.trick.length && strict()) ctx.status(`${ctx.who(p)}: Farbe geben, höher wenn möglich, sonst stechen`);
          else if (!S.trick.length && !S.tricks[1] && !S.tricks[2] && round === 1) ctx.status(`${ctx.who(p)}: spiel eine Karte aus`);
          return draw();
        }
        const s = p, q = quick; quick = false;
        ctx.aiTurn({
          side: s, quick: q,
          think: () => ({ move: think(s) }),
          targets: m => [m.c ? table.querySelector('#snk') : table.querySelector('#snt')],
          apply: act,
          decode: raw => {
            if (!raw || typeof raw !== 'object' || S.turn !== s) return null;
            if (raw.c) return S.h[s].includes(raw.c) && legal(S, s).includes(raw.c) ? { c: raw.c } : null;
            if (raw.x) return canSwap(S, s) ? { x: 1 } : null;
            if (raw.z) return canClose(S, s) ? { z: 1 } : null;
            return null;
          },
          say: m => m.x ? 'tauscht den Atout-Buben' : m.z ? 'dreht zu' : V.cardName(m.c) + (marriage(S, s, m.c) ? (marriage(S, s, m.c) === 40 ? ', Vierziger!' : ', Zwanziger!') : '')
        });
      }

      // ---------- AI ----------
      // cards the side `s` has not seen yet (in the other hand or in the stock)
      function unseen(s) {
        const known = new Set([...S.h[s], ...S.won, ...S.trick.map(t => t.c)]);
        if (S.atout) known.add(S.atout);
        return V.deck(Math.random, ORD).filter(c => !known.has(c));
      }
      const pairPart = (h, c) => 'KQ'.includes(c[0]) && h.includes((c[0] === 'K' ? 'Q' : 'K') + c[1]);
      // what it costs to give a card away: its points, more for trumps and marriage halves
      const cost = (h, c) => VAL[c[0]] + (c[1] === S.trump ? 14 + ORD.indexOf(c[0]) * 3 : 0) + (pairPart(h, c) ? 12 : 0);
      const cheapest = (h, list) => list.slice().sort((a, b) => cost(h, a) - cost(h, b))[0];
      function think(s) {
        const L = ctx.level, h = S.h[s], can = legal(S, s), o = 3 - s;
        if (L === 0) {
          if (!S.trick.length && canSwap(S, s) && Math.random() < 0.5) return { x: 1 };
          return { c: V.pick(can) };
        }
        const leading = !S.trick.length;
        if (leading && canSwap(S, s)) return { x: 1 };
        // perfect play when nothing is drawn any more (Profi; with a closed talon the hidden cards are guessed a few times)
        if (L === 3 && strict()) return { c: best(s) };
        if (leading && L >= 2 && canClose(S, s) && closeIsGood(s)) return { z: 1 };
        if (leading) {
          // a marriage first (40 before 20), else the cheapest card that does not break anything
          const mar = can.filter(c => marriage(S, s, c)).sort((a, b) => marriage(S, s, b) - marriage(S, s, a));
          if (mar.length) return { c: mar.find(c => c[0] === 'Q' && c[1] === mar[0][1]) || mar[0] };
          if (strict()) {
            // closed or empty talon: lead what surely wins (a trump nobody can beat), else the cheapest
            const un = unseen(s), sure = can.filter(c => c[1] === S.trump && !un.some(u => u[1] === S.trump && ORD.indexOf(u[0]) > ORD.indexOf(c[0])));
            if (sure.length) return { c: sure.sort((a, b) => VAL[b[0]] - VAL[a[0]])[0] };
          }
          const plain = can.filter(c => c[1] !== S.trump && !pairPart(h, c));
          return { c: cheapest(h, plain.length ? plain : can) };
        }
        const lc = S.trick[0].c, vl = VAL[lc[0]];
        const winners = can.filter(c => beats(S, c, lc));
        // a win that reaches 66 ends the round at once
        const finish = winners.find(c => S.pts[s] + (S.tricks[s] ? 0 : S.pend[s]) + vl + VAL[c[0]] >= 66);
        if (finish) return { c: finish };
        const sameUp = winners.filter(c => c[1] === lc[1]);
        // win in the same suit with Ass or Zehner: safe points
        if (sameUp.length && (vl >= 10 || 'AT'.includes(sameUp[0][0]) || L >= 2)) return { c: sameUp.sort((a, b) => VAL[b[0]] - VAL[a[0]])[0] };
        const trumps = winners.filter(c => c[1] === S.trump && lc[1] !== S.trump);
        if (trumps.length && (vl >= 10 || (L >= 2 && S.pts[o] >= 50))) return { c: cheapest(h, trumps) };
        return { c: cheapest(h, can) };
      }
      // close when the points in hand plus the surely winning trumps are enough for 66
      function closeIsGood(s) {
        if (!S.tricks[s]) return false;
        const un = unseen(s), h = S.h[s];
        const sure = h.filter(c => c[1] === S.trump && !un.some(u => u[1] === S.trump && ORD.indexOf(u[0]) > ORD.indexOf(c[0])));
        const mar = h.some(c => marriage(S, s, c)) ? Math.max(...h.map(c => marriage(S, s, c))) : 0;
        return S.pts[s] + mar + sure.reduce((a, c) => a + VAL[c[0]] + 4, 0) >= 70;
      }
      function best(s) {
        const can = legal(S, s);
        if (can.length === 1) return can[0];
        const un = unseen(s), o = 3 - s, n = S.h[o].length;
        // the other hand is known exactly once the stock is gone, else try some guesses
        const tries = un.length === n ? 1 : 16, score = {};
        can.forEach(c => { score[c] = 0; });
        for (let k = 0; k < tries; k++) {
          const g = tries === 1 ? un : V.shuffle(un.slice()).slice(0, n);
          const T = clone(S); T.h[o] = g.slice();
          can.forEach(c => { const U = clone(T); play(U, s, c); score[c] += search(U, s); });
        }
        return can.slice().sort((a, b) => score[b] - score[a] || cost(S.h[s], a) - cost(S.h[s], b))[0];
      }

      // ---------- moves ----------
      function shout(t) { const el = V.el('div', 'sn-shout', t); table.appendChild(el); setTimeout(() => el.remove(), 1200); }
      const rectOf = el => el && !ctx.fast() ? el.getBoundingClientRect() : null;
      function act(m) {
        if (over || busy || !S || S.done) return;
        const p = S.turn;
        if (m.x) {
          if (!canSwap(S, p)) return;
          ctx.moved(p, { x: 1 }); swap(S, p); V.sfx.move(); quick = true;
          ctx.status(`${ctx.who(p)} tauscht den Atout-Buben gegen ${V.cardName(S.h[p][S.h[p].length - 1])}`);
          draw(); return ask();
        }
        if (m.z) {
          if (!canClose(S, p)) return;
          ctx.moved(p, { z: 1 }); close(S, p); V.sfx.hit(); quick = true;
          shout('Zugedreht!');
          ctx.status(`${ctx.who(p)} dreht zu: ab jetzt Farbe geben und stechen`);
          draw(); return ask();
        }
        if (!m.c || !S.h[p].includes(m.c) || !legal(S, p).includes(m.c)) return;
        ctx.moved(p, { c: m.c });
        const from = rectOf(hand.querySelector(`[data-c="${m.c}"]`) || opp.querySelector('.fan'));
        const ev = play(S, p, m.c);
        if (ctx.isAI(p)) V.sfx.them(); else V.sfx.place();
        busy = true;
        if (ev.w) shownTrick = ev.cards;
        draw();
        const tc = table.querySelector(`#snk [data-c="${m.c}"]`); if (tc) { if (from) V.kit.fly(tc, from, 300); else V.fx.pop(tc, 'deal'); }
        if (ev.mar) {
          shout(ev.mar === 40 ? 'Vierziger!' : 'Zwanziger!'); V.sfx.goal();
          ctx.status(`${ctx.who(p)} sagt ${ev.mar === 40 ? 'Vierziger' : 'Zwanziger'} an (${V.suitSym(m.c[1])})${S.tricks[p] ? '' : ', zählt nach dem ersten Stich'}`);
        }
        if (ev.end && !ev.w) return ctx.later(() => roundEnd(ev.end), ctx.fast() ? 30 : 900);
        if (!ev.w) return ctx.later(() => begin(S.turn), ctx.fast() ? 30 : 380);
        // the trick stays a moment, then slides to the winner and both draw
        ctx.later(() => {
          const k = table.querySelector('#snk'), me = shown() || 1;
          if (k && !ctx.fast()) k.classList.add('go', ev.w === me ? 'dn' : 'up');
          const got = VAL[ev.cards[0].c[0]] + VAL[ev.cards[1].c[0]];
          ctx.status(`${ctx.who(ev.w)} sticht (+${got})`);
          ctx.later(() => {
            shownTrick = null;
            const tr = rectOf(table.querySelector('#snt'));
            draw();
            const mine = ev.drew[shown()];
            if (mine && tr) V.kit.fly(hand.querySelector(`[data-c="${mine}"]`), tr, 320);
            if (ev.drew[1]) V.sfx.move();
            if (ev.end) return roundEnd(ev.end);
            begin(S.turn);
          }, ctx.fast() ? 20 : 460);
        }, ctx.fast() ? 30 : 950);
      }
      function roundEnd(w) {
        busy = true;
        const n = result(S, w), l = 3 - w;
        gp[w] += n;
        const why = S.closed && S.closed !== w ? `${ctx.name(S.closed)} hat zugedreht und keine 66 geschafft`
          : S.pts[w] >= 66 ? `${S.pts[w]} Punkte` : 'letzter Stich';
        const extra = n === 3 ? (S.closed === w ? S.snap.t : S.tricks[l]) === 0 ? ' · der andere ohne Stich' : '' : n === 2 && !(S.closed && S.closed !== w) ? ' · der andere unter 33' : '';
        ctx.turn(0, false);
        endEl = V.el('div', 'sn-end', `<b class="c${w}">${ctx.name(w)} gewinnt die Runde</b><span>+${n} ${n === 1 ? 'Punkt' : 'Punkte'}</span><small>${why}${extra}</small>
          <em>${gp[1]} : ${gp[2]}</em>`);
        draw();
        // the cards the other side still held are turned over
        const o = 3 - (shown() || 1), fan = opp.querySelector('.fan');
        if (fan && S.h[o].length) fan.innerHTML = sortH(S.h[o]).map(c => V.card(c)).join('');
        if (w === (shown() || 1) || local) V.sfx.goal(); else V.sfx.bad();
        ctx.status(`${ctx.who(w)} gewinnt die Runde: ${S.pts[1]} zu ${S.pts[2]} Punkte`);
        if (gp[w] >= TO) { over = true; return ctx.later(() => ctx.end(w, `${gp[1]} : ${gp[2]} Punkte`), ctx.fast() ? 30 : 1600); }
        ctx.later(newRound, ctx.fast() ? 30 : ctx.auto ? 400 : 3200);
      }
      hand.addEventListener('click', e => { const c = e.target.closest('.card.can'); if (c && myTurn()) act({ c: c.dataset.c }); });
      ctx.nav(() => myTurn() ? [...hand.querySelectorAll('.card.can')] : [], { pad: 2 });
      ctx.keys(e => {
        if (!myTurn()) return false;
        if ((e.key === 't' || e.key === 'T') && canSwap(S, S.turn)) { act({ x: 1 }); return true; }
        if ((e.key === 'z' || e.key === 'Z') && canClose(S, S.turn)) { act({ z: 1 }); return true; }
        return false;
      });
      newRound();
    }
  });
})();
