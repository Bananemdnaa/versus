(function () {
  // Texas Hold'em with play chips for 2-4. Two hole cards each, five on the table, best five of seven wins.
  // Moves: { a: 'f' } fold, { a: 'c' } check or call, { a: 'r', v } raise to v (your total bet in this round).
  const RANKS = '23456789TJQKA';
  const rv = c => RANKS.indexOf(c[0]) + 2;
  const CAT = ['Höchste Karte', 'Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];
  function eval5(cs) {
    const r = cs.map(rv).sort((a, b) => b - a), fl = cs.every(c => c[1] === cs[0][1]);
    const cnt = {}; r.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
    const gr = Object.entries(cnt).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    let st = 0;
    if (gr.length === 5) { if (r[0] - r[4] === 4) st = r[0]; else if (r[0] === 14 && r[1] === 5) st = 5; }
    let cat, k;
    if (st && fl) { cat = 8; k = [st]; }
    else if (gr[0][0] === 4) { cat = 7; k = [gr[0][1], gr[1][1]]; }
    else if (gr[0][0] === 3 && gr[1][0] === 2) { cat = 6; k = [gr[0][1], gr[1][1]]; }
    else if (fl) { cat = 5; k = r; }
    else if (st) { cat = 4; k = [st]; }
    else if (gr[0][0] === 3) { cat = 3; k = gr.map(g => g[1]); }
    else if (gr[0][0] === 2 && gr[1][0] === 2) { cat = 2; k = gr.map(g => g[1]); }
    else if (gr[0][0] === 2) { cat = 1; k = gr.map(g => g[1]); }
    else { cat = 0; k = r; }
    let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (k[i] || 0);
    return s;
  }
  const COMB = []; for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) COMB.push([0, 1, 2, 3, 4, 5, 6].filter(i => i !== a && i !== b));
  function best(cs) { let b = 0; for (const cb of COMB) { const v = eval5(cb.map(i => cs[i])); if (v > b) b = v; } return b; }
  const catOf = s => Math.floor(s / 1048576);

  V.css(`
  .pk{width:min(var(--bw),680px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .pk-opp{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;width:100%}
  .pk-seat{--pc:var(--yellow);position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 10px 8px;border-radius:12px;background:var(--panel);border:1px solid var(--line);min-width:104px;transition:border-color .2s,box-shadow .2s,opacity .2s}
  .pk-seat.on{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc),0 0 18px -4px var(--pc)}
  .pk-seat.out{opacity:.45}
  .pk-seat b{font:800 italic 14px/1 var(--f-d);text-transform:uppercase;color:var(--pc)}
  .pk-seat .ch{font:700 13px/1 var(--f-b);color:var(--fg)}
  .pk-seat .cards{display:flex;gap:3px;min-height:44px}
  .pk-seat .cards .card{--cw:31px}
  .pk-seat .st{font:700 italic 11px/1 var(--f-d);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);min-height:11px}
  .pk-seat .bt,.pk-me .bt{position:absolute;top:-9px;right:-6px;padding:2px 7px;border-radius:999px;background:#ffd84f;color:#15172a;font:800 12px/1.2 var(--f-b);box-shadow:0 2px 4px rgba(0,0,0,.4)}
  .pk-seat .dl,.pk-me .dl{position:absolute;top:-9px;left:-6px;width:20px;height:20px;border-radius:50%;background:#fff;color:#15172a;font:800 11px/20px var(--f-b);text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.4)}
  .pk-table{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 10px 12px;border-radius:999px/60%}
  .pk-board{display:flex;gap:clamp(4px,1.4vw,8px)}
  .pk-board .card{--cw:clamp(46px,11.5vw,64px)}
  .pk-board .slot{width:clamp(46px,11.5vw,64px);aspect-ratio:5/7;border-radius:6px;border:2px dashed rgba(255,255,255,.18)}
  .pk-pot{font:800 italic 18px/1 var(--f-d);color:#ffd84f;text-shadow:0 2px 0 rgba(0,0,0,.4)}
  .pk-pot small{font:700 italic 11px/1 var(--f-d);letter-spacing:.12em;color:#d9f5e2;margin-left:6px;text-transform:uppercase}
  .pk-me{--pc:var(--pink);position:relative;display:flex;align-items:center;gap:14px;padding:10px 14px;border-radius:14px;background:var(--panel);border:1px solid var(--line)}
  .pk-me.on{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc)}
  .pk-me .cards{display:flex;gap:6px}
  .pk-me .cards .card{--cw:clamp(58px,15vw,74px)}
  .pk-me .info{display:flex;flex-direction:column;gap:4px}
  .pk-me .info b{font:800 italic 16px/1 var(--f-d);text-transform:uppercase;color:var(--pc)}
  .pk-me .info span{font:700 15px/1 var(--f-b)}
  .pk-me .info small{color:var(--cyan);font-size:12px;font-weight:600}
  .pk-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;min-height:42px}
  .pk-acts .btn{min-width:84px}
  .pk-acts .rz{display:flex;gap:6px}
  .card.win{box-shadow:0 0 0 3px #ffd84f,0 0 16px #ffd84f}
  .chipfly{position:fixed;z-index:60;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,#fff 0 22%,#ffd84f 24% 60%,#c99a1d 62%);box-shadow:0 2px 4px rgba(0,0,0,.5);pointer-events:none;transition:transform .55s var(--ease),opacity .55s}`);

  V.register({
    id: 'poker', name: 'Poker', cat: 'Brettspiele', order: 8, accent: '#5dff9d', party: true, noFirst: true,
    short: "Texas Hold'em mit Spielchips. Bis zu 4.",
    desc: "Texas Hold'em mit Spielchips, ohne echtes Geld: Zwei Karten auf der Hand, fünf in der Mitte. Setzen, erhöhen, bluffen oder aussteigen. Wer am Ende die meisten Chips hat, gewinnt. Für 2 bis 4, am Gerät, gegen die KI oder online.",
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Spielt nach Bauchgefühl.', 'Schätzt seine Hand grob ein.', 'Rechnet seine Chancen aus und spielt solide.', 'Rechnet genau und blufft auch mal.'],
    keys: [['F', 'Passen'], ['C', 'Checken / Mitgehen'], ['R', 'Erhöhen (Minimum)'], ['A', 'All-in']],
    options: [{ id: 'n', label: 'Spieler', def: 3, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'hands', label: 'Hände', def: 6, choices: [[6, '6'], [12, '12'], [0, 'Bis einer übrig']] }],
    localHint: 'Ihr spielt reihum am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Karten sieht.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><g transform="rotate(-12 18 26)"><rect x="7" y="9" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="10" y="19" font-size="9" font-weight="800" fill="#15172a" font-family="Arial">A</text><text x="15" y="32" font-size="14" fill="#15172a" font-family="Arial">♠</text></g><g transform="rotate(10 30 24)"><rect x="18" y="6" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="21" y="16" font-size="9" font-weight="800" fill="#d62b4d" font-family="Arial">A</text><text x="26" y="29" font-size="14" fill="#d62b4d" font-family="Arial">♥</text></g><circle cx="36" cy="38" r="8" fill="#ffd84f" stroke="#c99a1d" stroke-width="2"/><circle cx="36" cy="38" r="4" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 2"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Alle starten mit <b>1000 Chips</b> (Spielgeld). Wer am Ende die meisten hat, gewinnt. Pro Hand gewinnt den Topf, wer die beste Hand zeigt oder wer als Letzter übrig bleibt, weil alle anderen gepasst haben.' },
      { t: 'Karten', d: 'Jeder bekommt <b>zwei verdeckte Karten</b>. In der Mitte kommen nacheinander <b>drei</b> (Flop), <b>eine</b> (Turn) und noch <b>eine</b> (River). Du bildest aus deinen zwei und den fünf in der Mitte die beste Hand aus fünf Karten.' },
      { t: 'Setzen', d: 'Vor jeder neuen Karte wird gesetzt. <b>Passen</b>: aussteigen. <b>Checken</b>: nichts setzen, wenn niemand erhöht hat. <b>Mitgehen</b>: den Einsatz bezahlen. <b>Erhöhen</b>: mehr setzen, die anderen müssen mitgehen oder passen. <b>All-in</b>: alles.' },
      { t: 'Blinds', d: 'Zwei Spieler links vom Geber (<b>D</b>) zahlen Pflichteinsätze, den kleinen und großen Blind. Alle drei Hände werden sie größer, damit das Spiel nicht ewig dauert.' },
      { t: 'Rangfolge', d: 'Von schwach nach stark: Höchste Karte, Paar, Zwei Paare, Drilling, Straße (5 in Folge), Flush (5 gleiche Farbe), Full House (3 + 2), Vierling, Straight Flush.' },
      { t: 'Am selben Handy', d: 'Spielt ihr zu mehreren an einem Gerät, erscheint vor jedem Zug <b>„Gib das Gerät an …“</b>. Erst dann werden die eigenen Karten gezeigt.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng;
      const maxHands = [6, 12, 0].includes(+ctx.opts.hands) ? +ctx.opts.hands : 6;
      const chips = {}; P.forEach(p => { chips[p] = 1000; });
      let handNo = 0, dealer = 0, h = null, over = false, viewer = 0, show = false, busy = false;
      const wrap = V.el('div', 'pk'), oppEl = V.el('div', 'pk-opp'), table = V.el('div', 'pk-table felt'), meEl = V.el('div', 'pk-me'), acts = V.el('div', 'pk-acts');
      wrap.append(oppEl, table, meEl, acts); ctx.stage.appendChild(wrap);
      const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
      const blinds = () => { const lv = Math.floor((handNo - 1) / 3), bb = Math.round(20 * Math.pow(1.5, lv) / 10) * 10; return [bb / 2, bb]; };
      const pot = () => h ? P.reduce((a, p) => a + (h.tot[p] || 0), 0) : 0;
      const shown = () => ctx.mode === 'local' ? viewer : (ctx.mySide || 1);
      const nextIn = (list, p) => list[(list.indexOf(p) + 1) % list.length];
      const canAct = p => h.pl.includes(p) && !h.folded.has(p) && !h.allin.has(p);

      function newHand() {
        const pl = P.filter(p => chips[p] > 0);
        handNo++;
        if (pl.length < 2 || (maxHands && handNo > maxHands)) return finish();
        // the dealer button moves on to the next player who still has chips
        const order = pl;
        let d = dealer || P[N - 1];
        do { d = P[(P.indexOf(d) + 1) % N]; } while (!chips[d]);
        dealer = d;
        h = { pl: order, hole: {}, board: [], deck: V.deck(R), folded: new Set(), allin: new Set(), bet: {}, tot: {}, cur: 0, minR: 0, acted: new Set(), street: 0, toAct: 0, res: null };
        order.forEach(p => { h.bet[p] = 0; h.tot[p] = 0; });
        for (let k = 0; k < 2; k++) order.forEach(p => { (h.hole[p] = h.hole[p] || []).push(h.deck.pop()); });
        const [sb, bb] = blinds();
        const sbP = order.length === 2 ? dealer : nextIn(order, dealer), bbP = nextIn(order, sbP);
        post(sbP, sb); post(bbP, bb);
        h.cur = Math.max(h.bet[sbP], h.bet[bbP]); h.minR = bb;
        h.toAct = order.length === 2 ? sbP : nextIn(order, bbP);
        show = false;
        ctx.status(`Hand ${handNo}${maxHands ? ' von ' + maxHands : ''} · Blinds ${sb}/${bb}`);
        V.sfx.place();
        if (!canAct(h.toAct)) return advance();
        ask();
      }
      function post(p, x) { const a = Math.min(x, chips[p]); chips[p] -= a; h.bet[p] += a; h.tot[p] += a; if (!chips[p]) h.allin.add(p); return a; }
      function bounds(p) {
        const maxTo = h.bet[p] + chips[p], minTo = Math.max(h.cur + h.minR, blinds()[1]);
        return { minTo: Math.min(minTo, maxTo), maxTo, toCall: Math.min(h.cur - h.bet[p], chips[p]) };
      }
      function ask() {
        if (over) return;
        const p = h.toAct;
        ctx.turn(p, false);
        if (!ctx.isAI(p) && ctx.mode === 'local') {
          if (viewer !== p) { viewer = 0; draw(); }
          return ctx.handoff(p, 'Deine Karten werden gleich gezeigt.', () => { viewer = p; draw(); hint(); });
        }
        draw();
        if (!ctx.isAI(p)) return hint();
        ctx.aiTurn({
          side: p, quick: true,
          think: () => ({ move: think(p) }),
          targets: () => [oppEl.querySelector(`[data-s="${p}"]`) || meEl],
          apply: act,
          decode: raw => {
            if (!raw || !'fcr'.includes(raw.a)) return null;
            if (raw.a !== 'r') return { a: raw.a };
            const b = bounds(p);
            return Number.isInteger(raw.v) && raw.v > h.cur && raw.v >= b.minTo && raw.v <= b.maxTo ? { a: 'r', v: raw.v } : null;
          },
          say: m => say(p, m)
        });
      }
      function hint() { const b = bounds(h.toAct); ctx.status(`${ctx.who(h.toAct)}: ${b.toCall ? b.toCall + ' zum Mitgehen' : 'du kannst checken'} · Topf ${pot()}`); }
      function say(p, m) { const b = bounds(p); return m.a === 'f' ? 'passt' : m.a === 'c' ? (b.toCall ? 'geht mit' : 'checkt') : m.v >= b.maxTo ? 'All-in!' : 'erhöht auf ' + m.v; }
      // the AI: estimated winning chance against random hands, compared with the price
      function equity(p, sims) {
        const known = new Set([...h.hole[p], ...h.board]);
        const rest = []; for (const s of 'SHDC') for (const r of RANKS) { const c = r + s; if (!known.has(c)) rest.push(c); }
        const opp = h.pl.filter(q => q !== p && !h.folded.has(q)).length;
        let score = 0;
        for (let k = 0; k < sims; k++) {
          for (let i = rest.length - 1; i > rest.length - 1 - (opp * 2 + 5 - h.board.length) && i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
          let at = rest.length - 1;
          const board = h.board.slice(); while (board.length < 5) board.push(rest[at--]);
          const mine = best([...h.hole[p], ...board]);
          let win = 1, tie = 0;
          for (let o = 0; o < opp; o++) { const v = best([rest[at--], rest[at--], ...board]); if (v > mine) { win = 0; break; } if (v === mine) tie++; }
          score += win ? 1 / (1 + tie) : 0;
        }
        return score / sims;
      }
      function think(p) {
        const L = ctx.level, b = bounds(p), pt = pot();
        const opp = h.pl.filter(q => q !== p && !h.folded.has(q)).length;
        let eq = equity(p, [40, 150, 400, 900][L]);
        eq = Math.max(0, Math.min(1, eq + (Math.random() - 0.5) * [0.5, 0.24, 0.08, 0.03][L]));
        const strength = eq * (opp + 1), odds = b.toCall / (pt + b.toCall || 1);
        const canRaise = b.maxTo > h.cur;
        const raiseTo = f => Math.max(b.minTo, Math.min(b.maxTo, Math.round((h.cur + (pt + b.toCall) * f) / 10) * 10));
        if (canRaise && strength > [2.4, 2.0, 1.75, 1.65][L] && Math.random() < 0.85) return { a: 'r', v: raiseTo(strength > 2.6 ? 1 : 0.6) };
        if (!b.toCall) {
          if (canRaise && L === 3 && Math.random() < 0.1) return { a: 'r', v: raiseTo(0.5) };
          return { a: 'c' };
        }
        if (eq >= odds * [0.7, 1, 1.12, 1.2][L] || (L === 0 && Math.random() < 0.35)) return { a: 'c' };
        return { a: 'f' };
      }
      function act(m) {
        if (over || !h || busy || h.res) return;
        const p = h.toAct;
        if (!canAct(p)) return;
        const b = bounds(p);
        if (m.a === 'r' && !(m.v > h.cur && m.v >= b.minTo && m.v <= b.maxTo)) return;
        ctx.moved(p, m.a === 'r' ? { a: 'r', v: m.v } : { a: m.a });
        const before = h.bet[p];
        if (m.a === 'f') { h.folded.add(p); V.sfx.miss(); }
        else if (m.a === 'c') { const x = post(p, b.toCall); x ? V.sfx.place() : V.sfx.tick(); if (x) fly(p); }
        else {
          post(p, m.v - before);
          const by = h.bet[p] - h.cur;
          if (by >= h.minR) { h.minR = by; h.acted = new Set(); }
          h.cur = Math.max(h.cur, h.bet[p]); V.sfx.goal(); fly(p);
        }
        h.acted.add(p);
        ctx.status(`${ctx.who(p)} ${m.a === 'f' ? 'passt' : m.a === 'c' ? (b.toCall ? 'geht mit' : 'checkt') : h.allin.has(p) ? 'geht All-in' : 'erhöht auf ' + h.bet[p]}`);
        busy = true; draw();
        ctx.later(() => { busy = false; advance(); }, ctx.fast() ? 20 : 420);
      }
      function fly(p) {
        if (!V.fxOn() || ctx.fast()) return;
        const from = (oppEl.querySelector(`[data-s="${p}"]`) || meEl).getBoundingClientRect(), to = table.querySelector('.pk-pot').getBoundingClientRect();
        const c = V.el('i', 'chipfly'); c.style.left = from.left + from.width / 2 + 'px'; c.style.top = from.top + from.height / 2 + 'px';
        document.body.appendChild(c);
        requestAnimationFrame(() => { c.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height / 2 - from.top - from.height / 2}px)`; c.style.opacity = '.3'; });
        setTimeout(() => c.remove(), 600);
      }
      function advance() {
        if (over) return;
        const inHand = h.pl.filter(p => !h.folded.has(p));
        if (inHand.length === 1) return award();
        const active = inHand.filter(p => !h.allin.has(p));
        const done = active.every(p => h.acted.has(p) && h.bet[p] === h.cur);
        if (!done) {
          let q = h.toAct;
          for (let k = 0; k < h.pl.length; k++) { q = nextIn(h.pl, q); if (canAct(q) && !(h.acted.has(q) && h.bet[q] === h.cur)) break; }
          h.toAct = q;
          return ask();
        }
        if (h.street === 3 || active.length <= 1) {
          // everybody is all-in (or only one can still bet): deal the rest and show down
          if (h.board.length < 5) { show = true; dealStreet(); return ctx.later(advance, ctx.fast() ? 20 : 900); }
          return award();
        }
        dealStreet();
        h.bet = {}; h.pl.forEach(p => { h.bet[p] = 0; }); h.cur = 0; h.minR = blinds()[1]; h.acted = new Set();
        let q = dealer;
        for (let k = 0; k < h.pl.length; k++) { q = nextIn(h.pl, q); if (canAct(q)) break; }
        h.toAct = q;
        draw();
        ctx.later(ask, ctx.fast() ? 20 : 500);
      }
      function dealStreet() {
        h.street++;
        const n = h.board.length === 0 ? 3 : 1;
        for (let k = 0; k < n; k++) h.board.push(h.deck.pop());
        V.sfx.move(); draw();
        table.querySelectorAll('.pk-board .card').forEach((c, i) => { if (i >= h.board.length - n) c.classList.add('deal'); });
      }
      function award() {
        if (h.res) return;
        const inHand = h.pl.filter(p => !h.folded.has(p));
        const vals = {};
        const lines = [];
        if (inHand.length > 1) { show = true; inHand.forEach(p => { vals[p] = best([...h.hole[p], ...h.board]); }); }
        // pots by contribution level, each won by the best hand among those who paid into it
        const levels = [...new Set(h.pl.map(p => h.tot[p]).filter(x => x > 0))].sort((a, b) => a - b);
        let prev = 0; const won = {};
        for (const lv of levels) {
          const amount = h.pl.reduce((a, p) => a + Math.max(0, Math.min(h.tot[p], lv) - prev), 0);
          const elig = inHand.filter(p => h.tot[p] >= lv);
          prev = lv;
          if (!amount || !elig.length) continue;
          const top = inHand.length > 1 ? Math.max(...elig.map(p => vals[p])) : 0;
          const ws = inHand.length > 1 ? elig.filter(p => vals[p] === top) : elig;
          const share = Math.floor(amount / ws.length);
          ws.forEach((p, i) => { const x = share + (i === 0 ? amount - share * ws.length : 0); chips[p] += x; won[p] = (won[p] || 0) + x; });
        }
        h.res = { won, vals };
        Object.keys(won).forEach(p => lines.push(`${ctx.who(+p)} gewinnt ${won[p]}${inHand.length > 1 ? ' mit ' + CAT[catOf(vals[p])] : ''}`));
        ctx.status(lines.join(' · '));
        V.sfx.goal();
        ctx.turn(0, false);
        draw();
        ctx.later(newHand, ctx.fast() ? 30 : inHand.length > 1 ? 3600 : 1800);
      }
      function finish() {
        over = true; draw();
        const top = Math.max(...P.map(p => chips[p])), ws = P.filter(p => chips[p] === top);
        ctx.end(ws.length > 1 ? 0 : ws[0], P.map(p => chips[p]).join(' : ') + ' Chips');
      }
      function seatState(p) {
        if (!h || !h.pl.includes(p)) return chips[p] ? '' : 'pleite';
        if (h.folded.has(p)) return 'gepasst';
        if (h.allin.has(p)) return 'all-in';
        if (h.res && h.res.won[p]) return '+' + h.res.won[p];
        return h.res && h.res.vals[p] ? CAT[catOf(h.res.vals[p])] : '';
      }
      function draw() {
        const me = shown();
        const reveal = p => p === me || (show && h && !h.folded.has(p));
        const winCards = new Set();
        oppEl.innerHTML = P.filter(p => p !== me).map(p => `<div class="pk-seat${h && h.toAct === p && !over && !h.res ? ' on' : ''}${!h || !h.pl.includes(p) || h.folded.has(p) ? ' out' : ''}" data-s="${p}" style="--pc:${CLR[p]}">
          ${h && dealer === p ? '<span class="dl">D</span>' : ''}${h && h.bet[p] ? `<span class="bt">${h.bet[p]}</span>` : ''}
          <b>${ctx.name(p)}</b><span class="ch">${chips[p]}</span>
          <div class="cards">${h && h.hole[p] && !h.folded.has(p) ? h.hole[p].map(c => V.card(reveal(p) ? c : null)).join('') : ''}</div>
          <span class="st">${seatState(p)}</span></div>`).join('');
        const brd = h ? h.board : [];
        table.innerHTML = `<div class="pk-board">${[0, 1, 2, 3, 4].map(i => brd[i] ? V.card(brd[i]) : '<div class="slot"></div>').join('')}</div>
          <div class="pk-pot">Topf ${pot()}<small>${h ? ['Vor dem Flop', 'Flop', 'Turn', 'River'][Math.min(h.street, 3)] : ''}</small></div>`;
        if (!me) { meEl.innerHTML = '<div class="info"><b>Gerät weitergeben</b></div>'; acts.innerHTML = ''; return; }
        const myCards = h && h.hole[me] && !h.folded.has(me) ? h.hole[me] : null;
        const myVal = myCards && h.board.length >= 3 ? CAT[catOf(best7or(myCards, h.board))] : '';
        meEl.style.setProperty('--pc', CLR[me]);
        meEl.classList.toggle('on', !!(h && h.toAct === me && !over && !h.res));
        meEl.innerHTML = `${h && dealer === me ? '<span class="dl">D</span>' : ''}${h && h.bet[me] ? `<span class="bt">${h.bet[me]}</span>` : ''}
          <div class="cards">${myCards ? myCards.map(c => V.card(c)).join('') : V.card(null, 'no') + V.card(null, 'no')}</div>
          <div class="info"><b>${ctx.name(me)}</b><span>${chips[me]} Chips</span><small>${seatState(me) || myVal}</small></div>`;
        const mine = h && !over && !busy && !h.res && h.toAct === me && !ctx.isAI(me) && canAct(me);
        if (!mine) { acts.innerHTML = ''; return; }
        const b = bounds(me), pt = pot(), canRaise = b.maxTo > h.cur;
        const to = f => Math.max(b.minTo, Math.min(b.maxTo, Math.round((h.cur + (pt + b.toCall) * f) / 10) * 10));
        const opts = canRaise ? [...new Map([[b.minTo, 'Min ' + b.minTo], [to(0.5), '½ Topf'], [to(1), 'Topf'], [b.maxTo, 'All-in']]).entries()].filter(([v], i, a) => a.findIndex(x => x[0] === v) === i) : [];
        acts.innerHTML = `<button class="btn ghost" data-a="f"><span>Passen</span></button>
          <button class="btn" data-a="c"><span>${b.toCall ? (b.toCall >= chips[me] ? 'All-in ' : 'Mitgehen ') + b.toCall : 'Checken'}</span></button>
          ${opts.length ? `<div class="rz">${opts.map(([v, l]) => `<button class="btn primary sm" data-a="r" data-v="${v}"><span>${l}</span></button>`).join('')}</div>` : ''}`;
        acts.querySelectorAll('[data-a]').forEach(x => x.onclick = () => act(x.dataset.a === 'r' ? { a: 'r', v: +x.dataset.v } : { a: x.dataset.a }));
      }
      // best hand value from 2 hole cards and 3-5 board cards
      function best7or(hole, board) {
        const cs = [...hole, ...board];
        if (cs.length === 7) return best(cs);
        let b = 0;
        const idx = [...cs.keys()];
        const pick = (start, chosen) => { if (chosen.length === 5) { const v = eval5(chosen.map(i => cs[i])); if (v > b) b = v; return; } for (let i = start; i < idx.length; i++) pick(i + 1, [...chosen, i]); };
        pick(0, []);
        return b;
      }
      ctx.keys(e => {
        const me = shown();
        if (!h || over || h.toAct !== me || ctx.isAI(me) || e.repeat) return false;
        const k = e.key.toLowerCase(), b = bounds(me);
        if (k === 'f') { act({ a: 'f' }); return true; }
        if (k === 'c') { act({ a: 'c' }); return true; }
        if (k === 'r' && b.maxTo > h.cur) { act({ a: 'r', v: b.minTo }); return true; }
        if (k === 'a' && b.maxTo > h.cur) { act({ a: 'r', v: b.maxTo }); return true; }
        return false;
      });
      newHand();
    }
  });
})();
