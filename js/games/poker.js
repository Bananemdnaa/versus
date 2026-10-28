(function () {
  // Texas Hold'em with play chips for 2-4. Two hole cards each, five on the table, best five of seven wins.
  // Moves: { a: 'f' } fold, { a: 'c' } check or call, { a: 'r', v } raise to v (your total bet in this round).
  const RANKS = '23456789TJQKA';
  const rv = c => RANKS.indexOf(c[0]) + 2;
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
  // all ways to pick 5 of n cards
  const CB = {};
  function combos(n) {
    if (CB[n]) return CB[n];
    const out = [];
    (function rec(start, cur) { if (cur.length === 5) return out.push(cur.slice()); for (let i = start; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); } })(0, []);
    return (CB[n] = out);
  }
  function bestOf(cs) { let b = { v: -1, cards: null }; for (const c of combos(cs.length)) { const sel = c.map(i => cs[i]), v = eval5(sel); if (v > b.v) b = { v, cards: sel }; } return b; }
  const best = cs => bestOf(cs).v;
  const digits = v => { const d = []; for (let i = 0; i < 6; i++) { d.unshift(v % 16); v = Math.floor(v / 16); } return d; };
  const PL = { 2: 'Zweier', 3: 'Dreier', 4: 'Vierer', 5: 'Fünfer', 6: 'Sechser', 7: 'Siebener', 8: 'Achter', 9: 'Neuner', 10: 'Zehner', 11: 'Buben', 12: 'Damen', 13: 'Könige', 14: 'Asse' };
  const SG = { 2: 'Zwei', 3: 'Drei', 4: 'Vier', 5: 'Fünf', 6: 'Sechs', 7: 'Sieben', 8: 'Acht', 9: 'Neun', 10: 'Zehn', 11: 'Bube', 12: 'Dame', 13: 'König', 14: 'Ass' };
  function handName(v) {
    const [c, a, b] = digits(v);
    return [`${SG[a]} hoch`, `Paar ${PL[a]}`, `Zwei Paare, ${PL[a]} und ${PL[b]}`, `Drilling ${PL[a]}`, `Straße bis ${SG[a]}`, `Flush, ${SG[a]} hoch`,
      `Full House, ${PL[a]} und ${PL[b]}`, `Vierling ${PL[a]}`, a === 14 ? 'Royal Flush' : `Straight Flush bis ${SG[a]}`][c];
  }
  // starting hands, a classic rule of thumb (Chen): about 4 = weak, 7 = playable, 10+ = strong
  function chen(h) {
    const [a, b] = h.map(rv).sort((x, y) => y - x), pts = r => r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2;
    let s = pts(a);
    if (a === b) s = Math.max(5, s * 2);
    if (h[0][1] === h[1][1]) s += 2;
    if (a !== b) { const gap = a - b - 1; s -= [0, 1, 2, 4][gap] ?? 5; if (gap <= 1 && a < 12) s += 1; }
    return Math.ceil(s);
  }

  V.css(`
  .pk{width:min(100%,760px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .pkt{position:relative;width:100%;aspect-ratio:1.75;margin:clamp(30px,7vw,48px) 0 6px}
  .pkt .rail{position:absolute;inset:12% 7% 14%;border-radius:50%;background:radial-gradient(120% 100% at 50% 35%,#24794f,#185a3a 55%,#0f3a26);border:clamp(8px,1.8vw,14px) solid #6b4423;box-shadow:inset 0 0 0 3px rgba(255,235,200,.18),inset 0 8px 40px rgba(0,0,0,.55),0 20px 40px -12px rgba(0,0,0,.8)}
  .pkt .rail::after{content:'';position:absolute;inset:7%;border-radius:50%;border:2px solid rgba(255,255,255,.08)}
  .pkt .mid{position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:6px;width:62%}
  .pkt .street{font:700 italic 11px/1 var(--f-d);letter-spacing:.16em;text-transform:uppercase;color:#cfeedd}
  .pkt .board{display:flex;gap:clamp(3px,1vw,7px)}
  .pkt .board .card{--cw:clamp(38px,8.6vw,62px)}
  .pkt .board .slot{width:clamp(38px,8.6vw,62px);aspect-ratio:5/7;border-radius:6px;border:2px dashed rgba(255,255,255,.14)}
  .pkt .board .card.dim{filter:brightness(.55) saturate(.5)}
  .pkt .board .card.win{box-shadow:0 0 0 3px #ffd84f,0 0 14px #ffd84f;transform:translateY(-4px)}
  .pkt .pot{display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.35);font:800 italic 17px/1 var(--f-d);color:#ffd84f}
  .pkt .pot small{font:700 11px/1 var(--f-b);color:#cfeedd;font-style:normal}
  .chip{display:inline-block;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle,#fff 0 20%,var(--cc,#ffd84f) 22% 58%,#fff 60% 66%,var(--cc,#ffd84f) 68%);box-shadow:0 1px 2px rgba(0,0,0,.6);flex:none}
  .stack{display:inline-flex;flex-direction:column-reverse;margin-right:2px}
  .stack .chip+.chip{margin-bottom:-11px}
  .pkt .seat{--pc:var(--yellow);position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;z-index:2;width:clamp(86px,19vw,124px)}
  .pkt .seat .cards{display:flex;gap:2px;height:clamp(34px,7vw,50px);align-items:flex-end}
  .pkt .seat .cards .card{--cw:clamp(26px,5vw,36px)}
  .pkt .seat .cards .card.win{box-shadow:0 0 0 2px #ffd84f,0 0 12px #ffd84f}
  .pkt .seat .plate{position:relative;width:100%;display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:12px;background:rgba(14,16,25,.92);border:2px solid color-mix(in srgb,var(--pc) 45%,transparent);transition:box-shadow .2s,border-color .2s}
  .pkt .seat.on .plate{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc),0 0 22px -2px var(--pc)}
  .pkt .seat.out{opacity:.5}
  .pkt .seat .av{width:28px;height:28px;flex:none;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--pc) 22%,#1b1f33);color:var(--pc);font:800 italic 12px/1 var(--f-d)}
  .pkt .seat .av svg{width:16px;height:16px}
  .pkt .seat .nm{min-width:0;display:flex;flex-direction:column;line-height:1.1}
  .pkt .seat .nm b{font:800 italic 13px/1.1 var(--f-d);text-transform:uppercase;color:var(--pc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pkt .seat .nm span{font:700 12px/1.1 var(--f-b);color:var(--fg)}
  .pkt .seat .tag{position:absolute;left:50%;bottom:-11px;transform:translateX(-50%);white-space:nowrap;padding:2px 8px;border-radius:999px;font:800 italic 11px/1.3 var(--f-d);letter-spacing:.05em;text-transform:uppercase;background:#fff;color:#15172a;box-shadow:0 2px 6px rgba(0,0,0,.5);animation:pktag .3s var(--spring)}
  .pkt .seat .tag.f{background:#555a7a;color:#dde} .pkt .seat .tag.r{background:var(--pink);color:#fff} .pkt .seat .tag.a{background:var(--bad);color:#fff} .pkt .seat .tag.w{background:#ffd84f}
  @keyframes pktag{from{transform:translateX(-50%) scale(.4)}}
  .pkt .seat .mk{position:absolute;top:-8px;right:-6px;display:flex;gap:3px}
  .pkt .seat .mk i{font:800 10px/18px var(--f-b);font-style:normal;min-width:18px;height:18px;padding:0 4px;border-radius:9px;text-align:center;background:#fff;color:#15172a;box-shadow:0 1px 3px rgba(0,0,0,.5)}
  .pkt .seat .mk i.d{background:#15172a;color:#fff;border:2px solid #fff;line-height:14px}
  .pkt .bet{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:2px;font:800 13px/1 var(--f-b);color:#fff;text-shadow:0 1px 2px #000;z-index:1;animation:pktag .25s var(--ease)}
  .pk .res{width:min(100%,460px);padding:14px 16px;border-radius:16px;background:rgba(8,9,15,.9);border:2px solid #ffd84f;box-shadow:0 10px 30px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:8px;align-items:center;animation:pkres .35s var(--spring)}
  @keyframes pkres{from{transform:scale(.85);opacity:0}}
  .pkt .wb{padding:4px 12px;border-radius:999px;background:#ffd84f;color:#15172a;font:800 italic 14px/1.2 var(--f-d);text-transform:uppercase;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.5);animation:pkres .35s var(--spring)}
  .pk .res h3{margin:0;font:800 italic clamp(18px,4vw,24px)/1.1 var(--f-d);text-transform:uppercase;color:#ffd84f;text-align:center}
  .pk .res .rl{width:100%;display:flex;flex-direction:column;gap:3px}
  .pk .res .rl div{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:3px 6px;border-radius:6px}
  .pk .res .rl div.w{background:rgba(255,216,79,.14)}
  .pk .res .rl b{font-weight:700} .pk .res .rl em{font-style:normal;color:var(--muted)} .pk .res .rl .g{color:var(--good);font-weight:800}
  .pk-me{--pc:var(--pink);width:100%;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
  .pk-me .cards{display:flex;gap:6px}
  .pk-me .cards .card{--cw:clamp(60px,15vw,78px)}
  .pk-me .cards .card.win{box-shadow:0 0 0 3px #ffd84f,0 0 16px #ffd84f;transform:translateY(-6px)}
  .pk-me .info{display:flex;flex-direction:column;gap:4px;min-width:150px}
  .pk-me .info b{font:800 italic 22px/1 var(--f-d);color:var(--fg)} .pk-me .info b small{font:700 12px var(--f-b);color:var(--muted);margin-left:4px}
  .pk-me .info .hn{font:800 italic 16px/1.1 var(--f-d);color:var(--cyan);text-transform:uppercase}
  .pk-me .info .eq{font-size:12px;color:var(--muted)}
  .pk-me .info .eq i{display:block;height:5px;margin-top:3px;border-radius:3px;background:var(--panel3);overflow:hidden}
  .pk-me .info .eq i::after{content:'';display:block;height:100%;width:var(--e);background:linear-gradient(90deg,var(--bad),var(--yellow),var(--good))}
  .pk-acts{width:100%;display:flex;flex-direction:column;gap:8px;align-items:center;min-height:52px}
  .pk-acts .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%}
  .pk-acts .row .btn{flex:1;max-width:220px}
  .pk-acts .rz{display:flex;align-items:center;gap:8px;width:100%;max-width:560px;padding:8px 10px;border-radius:12px;background:var(--panel);border:1px solid var(--line);flex-wrap:wrap}
  .pk-acts .rz input[type=range]{flex:1;min-width:140px;accent-color:var(--pink)}
  .pk-acts .rz .q{display:flex;gap:5px}
  .pk-acts .rz .q button{padding:6px 9px;border-radius:8px;background:var(--panel2);border:1px solid var(--line2);font:700 12px/1 var(--f-b)}
  .pk-acts .wait{color:var(--muted);font-size:14px}
  .pk-info{font:700 italic 12px/1 var(--f-d);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  @media (max-width:560px){.pkt{aspect-ratio:1.05}.pkt .rail{inset:16% 2% 16%}.pkt .mid{width:84%;top:52%}}
  .chipfly{position:fixed;z-index:60;pointer-events:none;transition:transform .6s var(--ease),opacity .6s}`);

  V.register({
    id: 'poker', name: 'Poker', cat: 'Brettspiele', order: 8, accent: '#5dff9d', party: true, noFirst: true,
    short: "Texas Hold'em mit Spielchips. Bis zu 4.",
    desc: "Texas Hold'em mit Spielchips, ohne echtes Geld: Zwei Karten auf der Hand, fünf in der Mitte. Setzen, erhöhen, bluffen oder aussteigen. Wer am Ende die meisten Chips hat, gewinnt. Für 2 bis 4, am Gerät, gegen die KI oder online.",
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Geht fast überall mit und erhöht selten.', 'Spielt vorsichtig, blufft nie.', 'Spielt starke Hände aggressiv und steigt mit schwachen aus.', 'Rechnet genau, nutzt seine Position und blufft gezielt.'],
    keys: [['F', 'Passen'], ['C', 'Checken / Mitgehen'], ['R', 'Erhöhen (Regler)'], ['A', 'All-in'], ['Enter', 'Nächste Hand']],
    options: [{ id: 'n', label: 'Spieler', def: 3, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'hands', label: 'Hände', def: 10, choices: [[5, '5'], [10, '10'], [0, 'Bis einer übrig']] }],
    localHint: 'Ihr spielt reihum am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Karten sieht.',
    endDelay: 900,
    icon: `<svg viewBox="0 0 48 48"><g transform="rotate(-12 18 26)"><rect x="7" y="9" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="10" y="19" font-size="9" font-weight="800" fill="#15172a" font-family="Arial">A</text><text x="15" y="32" font-size="14" fill="#15172a" font-family="Arial">♠</text></g><g transform="rotate(10 30 24)"><rect x="18" y="6" width="22" height="31" rx="3" fill="#fff" stroke="#c9c2b2"/><text x="21" y="16" font-size="9" font-weight="800" fill="#d62b4d" font-family="Arial">A</text><text x="26" y="29" font-size="14" fill="#d62b4d" font-family="Arial">♥</text></g><circle cx="36" cy="38" r="8" fill="#ffd84f" stroke="#c99a1d" stroke-width="2"/><circle cx="36" cy="38" r="4" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 2"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Alle starten mit <b>1000 Chips</b> (Spielgeld). Wer am Ende die meisten hat, gewinnt. Eine Hand gewinnt, wer die beste Hand zeigt oder als Letzter übrig bleibt, weil alle anderen gepasst haben.' },
      { t: 'Karten', d: 'Jeder bekommt <b>zwei verdeckte Karten</b>. In der Mitte kommen nacheinander <b>drei</b> (Flop), <b>eine</b> (Turn) und noch <b>eine</b> (River). Du bildest aus deinen zwei und den fünf in der Mitte die beste Hand aus fünf Karten. Unter deinen Karten steht immer, was du gerade hast.' },
      { t: 'Setzen', d: '<b>Passen</b>: aussteigen. <b>Checken</b>: nichts setzen, wenn niemand erhöht hat. <b>Mitgehen</b>: den Einsatz bezahlen. <b>Erhöhen</b>: Betrag mit dem Regler oder den Schnellknöpfen wählen, die anderen müssen mitgehen oder passen. <b>All-in</b>: alles.' },
      { t: 'Blinds', d: 'Die zwei Spieler nach dem Geber (<b>D</b>) zahlen Pflichteinsätze, den kleinen (<b>SB</b>) und großen Blind (<b>BB</b>). Alle drei Hände werden sie größer.' },
      { t: 'Rangfolge', d: 'Von schwach nach stark: Höchste Karte, Paar, Zwei Paare, Drilling, Straße (5 in Folge), Flush (5 gleiche Farbe), Full House (3 + 2), Vierling, Straight Flush.' },
      { t: 'Am selben Handy', d: 'Spielt ihr zu mehreren an einem Gerät, erscheint vor jedem Zug <b>„Gib das Gerät an …“</b>. Erst dann werden die eigenen Karten gezeigt.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng;
      const maxHands = [5, 10, 0].includes(+ctx.opts.hands) ? +ctx.opts.hands : 10;
      const chips = {}; P.forEach(p => { chips[p] = 1000; });
      let handNo = 0, dealer = 0, h = null, over = false, viewer = 0, show = false, busy = false, waitNext = false, eqCache = null;
      const wrap = V.el('div', 'pk'), info = V.el('div', 'pk-info'), table = V.el('div', 'pkt'), meEl = V.el('div', 'pk-me'), acts = V.el('div', 'pk-acts');
      wrap.append(info, table, meEl, acts); ctx.stage.appendChild(wrap);
      const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
      const blinds = () => { const lv = Math.floor((Math.max(1, handNo) - 1) / 3), bb = Math.round(20 * Math.pow(1.5, lv) / 10) * 10; return [bb / 2, bb]; };
      const pot = () => h && h.res && h.res.paid ? 0 : h ? P.reduce((a, p) => a + (h.tot[p] || 0), 0) : 0;
      const shown = () => ctx.mode === 'local' ? viewer : (ctx.mySide || 1);
      const nextIn = (list, p) => list[(list.indexOf(p) + 1) % list.length];
      const canAct = p => h.pl.includes(p) && !h.folded.has(p) && !h.allin.has(p);
      const fmt = n => n.toLocaleString('de-DE');
      // where the seats sit around the oval (percent of the table box), going clockwise from the bottom
      const narrow = () => wrap.clientWidth < 560;
      const SPOTS = () => narrow() ? { 1: [[50, 7]], 2: [[24, 9], [76, 9]], 3: [[16, 24], [50, 6], [84, 24]] } : { 1: [[50, 7]], 2: [[17, 15], [83, 15]], 3: [[7, 50], [50, 6], [93, 50]] };
      const ME_SPOT = [50, 93];
      function spots() {
        const me = shown() || P[0], i = P.indexOf(me), others = P.slice(i + 1).concat(P.slice(0, i)), pos = {};
        const sp = SPOTS(); others.forEach((p, k) => { pos[p] = sp[others.length][k]; });
        pos[me] = ME_SPOT;
        return pos;
      }

      function newHand() {
        const pl = P.filter(p => chips[p] > 0);
        handNo++;
        if (pl.length < 2 || (maxHands && handNo > maxHands)) return finish();
        let d = dealer || P[N - 1];
        do { d = P[(P.indexOf(d) + 1) % N]; } while (!chips[d]);
        dealer = d;
        h = { pl, hole: {}, board: [], deck: V.deck(R), folded: new Set(), allin: new Set(), bet: {}, tot: {}, cur: 0, minR: 0, acted: new Set(), street: 0, toAct: 0, res: null, last: {}, raises: {} };
        pl.forEach(p => { h.bet[p] = 0; h.tot[p] = 0; });
        for (let k = 0; k < 2; k++) pl.forEach(p => { (h.hole[p] = h.hole[p] || []).push(h.deck.pop()); });
        const [sb, bb] = blinds();
        h.sb = pl.length === 2 ? dealer : nextIn(pl, dealer); h.bb = nextIn(pl, h.sb);
        post(h.sb, sb); post(h.bb, bb);
        h.last[h.sb] = ['SB ' + h.bet[h.sb], '']; h.last[h.bb] = ['BB ' + h.bet[h.bb], ''];
        h.cur = Math.max(h.bet[h.sb], h.bet[h.bb]); h.minR = bb;
        h.toAct = pl.length === 2 ? h.sb : nextIn(pl, h.bb);
        show = false; eqCache = null;
        V.sfx.place();
        draw(true);
        if (!canAct(h.toAct)) return advance();
        ctx.later(ask, ctx.fast() ? 20 : 500);
      }
      function post(p, x) { const a = Math.min(x, chips[p]); chips[p] -= a; h.bet[p] += a; h.tot[p] += a; if (!chips[p]) h.allin.add(p); return a; }
      function bounds(p) {
        const maxTo = h.bet[p] + chips[p], minTo = Math.max(h.cur + h.minR, blinds()[1]);
        return { minTo: Math.min(minTo, maxTo), maxTo, toCall: Math.min(h.cur - h.bet[p], chips[p]) };
      }
      function ask() {
        if (over || !h || h.res) return;
        const p = h.toAct;
        ctx.turn(p, false);
        if (!ctx.isAI(p) && ctx.mode === 'local') {
          if (viewer !== p) { viewer = 0; draw(); }
          return ctx.handoff(p, 'Deine Karten werden gleich gezeigt.', () => { viewer = p; eqCache = null; draw(); hint(); });
        }
        draw();
        if (!ctx.isAI(p)) return hint();
        ctx.aiTurn({
          side: p, quick: true,
          think: () => ({ move: think(p) }),
          targets: () => [table.querySelector(`.seat[data-s="${p}"] .plate`)],
          apply: act,
          decode: raw => {
            if (!raw || !'fcr'.includes(raw.a)) return null;
            if (raw.a !== 'r') return { a: raw.a };
            const b = bounds(p);
            return Number.isInteger(raw.v) && raw.v > h.cur && raw.v >= b.minTo && raw.v <= b.maxTo ? { a: 'r', v: raw.v } : null;
          }
        });
      }
      function hint() { const b = bounds(h.toAct); ctx.status(`${ctx.who(h.toAct)} ist dran · ${b.toCall ? fmt(b.toCall) + ' zum Mitgehen' : 'du kannst checken'}`); }

      // ---------- AI ----------
      function equity(p, sims) {
        const known = new Set([...h.hole[p], ...h.board]);
        const rest = []; for (const s of 'SHDC') for (const r of RANKS) { const c = r + s; if (!known.has(c)) rest.push(c); }
        const opp = h.pl.filter(q => q !== p && !h.folded.has(q)).length, need = opp * 2 + 5 - h.board.length;
        let score = 0;
        for (let k = 0; k < sims; k++) {
          for (let i = rest.length - 1; i >= rest.length - need; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
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
        const L = ctx.level, b = bounds(p), pt = pot(), bb = blinds()[1];
        const opp = h.pl.filter(q => q !== p && !h.folded.has(q)).length;
        const loose = [0.45, 0.12, 0.04, 0.03][L];
        const canRaise = b.maxTo > h.cur && (h.raises[p] || 0) < (L >= 2 ? 2 : 1);
        const to = v => Math.max(b.minTo, Math.min(b.maxTo, Math.round(v / 10) * 10));
        const raise = v => { const x = to(v); return x > h.cur ? { a: 'r', v: x } : { a: 'c' }; };
        const call = () => ({ a: 'c' }), fold = () => (b.toCall ? { a: 'f' } : { a: 'c' });
        if (h.street === 0) {
          const noise = [3, 1.5, 0.8, 0.5][L];
          const c = chen(h.hole[p]) + (3 - opp) * 0.9 + (Math.random() - 0.5) * 2 * noise;
          const facing = b.toCall / bb;
          if (c >= 11 && canRaise && L >= 1) return raise(h.cur <= bb ? 3 * bb : h.cur * 2.6);
          if (c >= 9) { if (canRaise && facing <= 1 && L >= 1 && Math.random() < 0.75) return raise(3 * bb); return facing <= 10 || c >= 11 ? call() : fold(); }
          if (c >= 6.5) return facing <= (L === 0 ? 8 : 3) ? call() : (Math.random() < loose ? call() : fold());
          if (c >= 4.5 && facing <= 1) return call();
          return Math.random() < loose && facing <= 3 ? call() : fold();
        }
        let eq = equity(p, [100, 250, 500, 900][L]);
        eq = Math.max(0, Math.min(1, eq + (Math.random() - 0.5) * [0.3, 0.12, 0.05, 0.03][L]));
        const fair = 1 / (opp + 1), odds = b.toCall / (pt + b.toCall || 1);
        const lastToAct = h.pl.filter(q => canAct(q)).slice(-1)[0] === p;
        // strong: bet for value, about two thirds of the pot
        if (eq > Math.min(0.85, fair * 2 + 0.1) && canRaise && L >= 1) {
          const v = h.cur + (pt + b.toCall) * (0.55 + Math.random() * 0.25);
          if (to(v) >= b.maxTo && eq < 0.8) return call();
          return raise(v);
        }
        if (eq > Math.min(0.72, fair * 1.45)) {
          if (!b.toCall && canRaise && L >= 1 && Math.random() < 0.6) return raise(h.cur + pt * 0.5);
          return call();
        }
        if (!b.toCall) {
          const bluff = L === 3 ? (lastToAct ? 0.2 : 0.1) : L === 2 ? 0.06 : 0;
          if (canRaise && opp <= 2 && h.street >= 2 && Math.random() < bluff) return raise(pt * 0.6);
          return call();
        }
        if (eq >= odds * (L === 0 ? 0.7 : 1.08) || Math.random() < loose) return call();
        return fold();
      }

      // ---------- actions ----------
      function act(m) {
        if (over || !h || busy || h.res) return;
        const p = h.toAct;
        if (!canAct(p)) return;
        const b = bounds(p);
        if (m.a === 'r' && !(m.v > h.cur && m.v >= b.minTo && m.v <= b.maxTo)) return;
        ctx.moved(p, m.a === 'r' ? { a: 'r', v: m.v } : { a: m.a });
        if (m.a === 'f') { h.folded.add(p); h.last[p] = ['Passt', 'f']; V.sfx.miss(); }
        else if (m.a === 'c') {
          const x = post(p, b.toCall);
          h.last[p] = h.allin.has(p) ? ['All-in', 'a'] : x ? ['Mitgehen ' + fmt(x), ''] : ['Check', ''];
          x ? V.sfx.place() : V.sfx.tick();
        } else {
          const open = h.cur === 0;
          post(p, m.v - h.bet[p]);
          const by = h.bet[p] - h.cur;
          if (by >= h.minR) { h.minR = by; h.acted = new Set(); }
          h.cur = Math.max(h.cur, h.bet[p]);
          h.raises[p] = (h.raises[p] || 0) + 1;
          h.last[p] = h.allin.has(p) ? ['All-in ' + fmt(h.bet[p]), 'a'] : [(open ? 'Setzt ' : 'Erhöht auf ') + fmt(h.bet[p]), 'r'];
          V.sfx.goal();
        }
        h.acted.add(p);
        ctx.status(`${ctx.who(p)}: ${h.last[p][0]}`);
        busy = true; eqCache = null; draw();
        ctx.later(() => { busy = false; advance(); }, ctx.fast() ? 20 : 450);
      }
      function advance() {
        if (over || h.res) return;
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
          // everybody is all-in (or only one can still bet): turn the cards over and deal the rest
          show = true;
          if (h.board.length < 5) { dealStreet(); return ctx.later(advance, ctx.fast() ? 20 : 1100); }
          return award();
        }
        dealStreet();
        h.bet = {}; h.pl.forEach(p => { h.bet[p] = 0; if (h.last[p] && !'fa'.includes(h.last[p][1])) delete h.last[p]; });
        h.cur = 0; h.minR = blinds()[1]; h.acted = new Set(); h.raises = {};
        let q = dealer;
        for (let k = 0; k < h.pl.length; k++) { q = nextIn(h.pl, q); if (canAct(q)) break; }
        h.toAct = q;
        draw();
        ctx.later(ask, ctx.fast() ? 20 : 700);
      }
      function dealStreet() {
        h.street++;
        const n = h.board.length === 0 ? 3 : 1;
        for (let k = 0; k < n; k++) h.board.push(h.deck.pop());
        V.sfx.move(); eqCache = null;
        h.toAct = 0; draw();
        table.querySelectorAll('.board .card').forEach((c, i) => { if (i >= h.board.length - n) c.classList.add('deal'); });
      }
      function award() {
        if (h.res) return;
        const inHand = h.pl.filter(p => !h.folded.has(p));
        const hands = {};
        if (inHand.length > 1) { show = true; inHand.forEach(p => { hands[p] = bestOf([...h.hole[p], ...h.board]); }); }
        // pots by contribution level, each won by the best hand among those who paid into it
        const levels = [...new Set(h.pl.map(p => h.tot[p]).filter(x => x > 0))].sort((a, b) => a - b);
        let prev = 0; const won = {};
        for (const lv of levels) {
          const amount = h.pl.reduce((a, p) => a + Math.max(0, Math.min(h.tot[p], lv) - prev), 0);
          const elig = inHand.filter(p => h.tot[p] >= lv);
          prev = lv;
          if (!amount || !elig.length) continue;
          const top = inHand.length > 1 ? Math.max(...elig.map(p => hands[p].v)) : 0;
          const ws = inHand.length > 1 ? elig.filter(p => hands[p].v === top) : elig;
          const share = Math.floor(amount / ws.length);
          ws.forEach((p, i) => { won[p] = (won[p] || 0) + share + (i === 0 ? amount - share * ws.length : 0); });
        }
        const total = pot();
        h.res = { won, hands, total };
        h.toAct = 0;
        // the bets are in the pot now; tags show who won
        h.pl.forEach(p => { h.bet[p] = 0; if (h.last[p] && h.last[p][1] !== 'f') delete h.last[p]; });
        Object.keys(won).forEach(p => { h.last[+p] = ['+' + fmt(won[p]), 'w']; });
        ctx.turn(0, false);
        draw();
        flyToWinners(won);
        Object.keys(won).forEach(p => { chips[+p] += won[p]; });
        h.res.paid = true;
        const me = shown() || 1;
        if (won[me]) V.sfx.win(); else V.sfx.goal();
        ctx.later(() => { draw(); showResult(); }, ctx.fast() ? 10 : 700);
      }
      function showResult() {
        const won = h.res.won, ws = Object.keys(won).map(Number), hands = h.res.hands;
        const head = ws.length > 1 ? 'Geteilter Topf' : `${ctx.name(ws[0])} gewinnt ${fmt(won[ws[0]])}`;
        const why = ws.length === 1 && hands[ws[0]] ? 'mit ' + handName(hands[ws[0]].v) : Object.keys(hands).length ? '' : 'Alle anderen haben gepasst';
        const lines = h.pl.map(p => {
          const txt = h.folded.has(p) ? 'gepasst' : hands[p] ? handName(hands[p].v) : '';
          return `<div class="${won[p] ? 'w' : ''}"><b class="c${p}">${ctx.name(p)}</b><em>${txt}</em><span class="${won[p] ? 'g' : ''}">${won[p] ? '+' + fmt(won[p]) : h.tot[p] ? '−' + fmt(h.tot[p]) : ''}</span></div>`;
        }).join('');
        const last = maxHands && handNo >= maxHands || P.filter(p => chips[p] > 0).length < 2;
        h.res.banner = ws.length > 1 ? 'Geteilter Topf' : `${ctx.name(ws[0])} +${fmt(won[ws[0]])}${hands[ws[0]] ? ' · ' + handName(hands[ws[0]].v) : ''}`;
        h.res.panel = `<h3>${head}</h3>${why ? `<p class="small" style="margin:0;color:var(--muted)">${why}</p>` : ''}<div class="rl">${lines}</div>
          <button class="btn primary" data-enter><span>${last ? 'Zum Ergebnis' : 'Nächste Hand'}</span></button>${ctx.mode === 'table' ? '<small class="ct" style="color:var(--muted)"></small>' : ''}`;
        waitNext = true;
        draw();
        const el = acts.querySelector('.res');
        const go = () => { if (!waitNext) return; waitNext = false; newHand(); };
        if (el) el.querySelector('button').onclick = go;
        h.res.go = go;
        // online the next hand starts on its own after a few seconds, so nobody waits for one person
        if (ctx.mode === 'table' || ctx.fast()) {
          let n = ctx.fast() ? 0 : 8; const ct = el && el.querySelector('.ct');
          const tick = () => { if (!waitNext) return; if (n <= 0) return go(); if (ct) ct.textContent = `weiter in ${n} s`; n--; ctx.later(tick, 1000); };
          tick();
        }
      }
      function flyToWinners(won) {
        if (!V.fxOn() || ctx.fast()) return;
        const from = table.querySelector('.pot'); if (!from) return;
        const fr = from.getBoundingClientRect();
        Object.keys(won).forEach(p => {
          const seat = table.querySelector(`.seat[data-s="${p}"] .plate`); if (!seat) return;
          const to = seat.getBoundingClientRect();
          for (let k = 0; k < 6; k++) {
            const c = V.el('i', 'chip chipfly'); c.style.left = fr.left + fr.width / 2 + (k - 3) * 4 + 'px'; c.style.top = fr.top + fr.height / 2 + 'px';
            document.body.appendChild(c);
            setTimeout(() => { c.style.transform = `translate(${to.left + to.width / 2 - fr.left - fr.width / 2}px,${to.top + to.height / 2 - fr.top - fr.height / 2}px)`; c.style.opacity = '.2'; }, 30 + k * 60);
            setTimeout(() => c.remove(), 800 + k * 60);
          }
        });
      }
      function finish() {
        over = true; draw();
        const top = Math.max(...P.map(p => chips[p])), ws = P.filter(p => chips[p] === top);
        ctx.end(ws.length > 1 ? 0 : ws[0], P.map(p => fmt(chips[p])).join(' : ') + ' Chips');
      }

      // ---------- drawing ----------
      const chipStack = n => { const k = Math.min(5, Math.max(1, Math.ceil(Math.log10(n + 1) * 1.6))); return `<span class="stack">${'<i class="chip"></i>'.repeat(k)}</span>`; };
      function draw(deal) {
        const me = shown(), pos = spots();
        const winCards = new Set();
        if (h && h.res) Object.keys(h.res.won).forEach(p => { const hd = h.res.hands[p]; if (hd) hd.cards.forEach(c => winCards.add(c)); });
        const reveal = p => p === me || (show && h && !h.folded.has(p));
        const [sb, bb] = blinds();
        info.textContent = over ? 'Spiel vorbei' : `Hand ${handNo}${maxHands ? ' von ' + maxHands : ''} · Blinds ${sb}/${bb}`;
        let html = '<div class="rail"></div>';
        // seats (yourself sits at the bottom edge)
        P.forEach(p => {
          const [x, y] = pos[p], inHand = h && h.pl.includes(p), folded = h && h.folded.has(p);
          const bot = ctx.isBot(p), name = ctx.name(p);
          const cards = inHand && !folded && p !== me ? h.hole[p].map(c => V.card(reveal(p) ? c : null, winCards.has(c) ? 'win' : '')).join('') : '';
          const mk = h ? `${dealer === p ? '<i class="d">D</i>' : ''}${h.sb === p && h.street === 0 ? '<i>SB</i>' : ''}${h.bb === p && h.street === 0 ? '<i>BB</i>' : ''}` : '';
          const tag = h && h.last[p] ? `<span class="tag ${h.last[p][1]}">${h.last[p][0]}</span>` : !chips[p] && !inHand ? '<span class="tag f">Pleite</span>' : '';
          html += `<div class="seat${h && h.toAct === p && !busy && !h.res ? ' on' : ''}${!inHand || folded ? ' out' : ''}" data-s="${p}" style="left:${x}%;top:${y}%;--pc:${CLR[p]}">
            ${p !== me ? `<div class="cards">${cards}</div>` : ''}
            <div class="plate"><span class="av">${bot ? V.ui.IC.robot : name.slice(0, 2).toUpperCase()}</span><span class="nm"><b>${name}</b><span>${fmt(chips[p])}</span></span><span class="mk">${mk}</span>${tag}</div></div>`;
          if (h && h.bet[p]) { const bx = x + (50 - x) * 0.42, by = y + (47 - y) * 0.42; html += `<div class="bet" style="left:${bx}%;top:${by}%">${chipStack(h.bet[p])}${fmt(h.bet[p])}</div>`; }
        });
        const brd = h ? h.board : [];
        html += `<div class="mid"><span class="street">${h ? ['Vor dem Flop', 'Flop', 'Turn', 'River'][Math.min(h.street, 3)] : ''}</span>
          <div class="board">${[0, 1, 2, 3, 4].map(i => brd[i] ? V.card(brd[i], h.res && Object.keys(h.res.hands).length ? (winCards.has(brd[i]) ? 'win' : 'dim') : '') : '<div class="slot"></div>').join('')}</div>
          ${h && h.res && h.res.banner ? `<div class="wb">${h.res.banner}</div>` : `<div class="pot"><i class="chip"></i>${fmt(pot())}<small>im Topf</small></div>`}</div>`;
        const res = table.querySelector('.res');
        table.innerHTML = html;
        if (res) table.appendChild(res);
        if (deal && V.fxOn()) table.querySelectorAll('.seat .card').forEach((c, i) => { c.classList.add('deal'); c.style.animationDelay = i * 60 + 'ms'; });
        drawMe(me, winCards);
      }
      function drawMe(me, winCards) {
        if (!me) { meEl.innerHTML = '<div class="info"><b>Gerät weitergeben</b></div>'; acts.innerHTML = ''; return; }
        const myCards = h && h.hole[me] && !h.folded.has(me) ? h.hole[me] : null;
        let hn = '', eqTxt = '';
        if (myCards) {
          hn = h.board.length ? handName(bestOf([...myCards, ...h.board]).v) : rv(myCards[0]) === rv(myCards[1]) ? 'Paar ' + PL[rv(myCards[0])] : SG[Math.max(rv(myCards[0]), rv(myCards[1]))] + ' hoch';
          if (!h.res && !ctx.isAI(me)) {
            if (!eqCache || eqCache.key !== h.board.length + ':' + h.folded.size) eqCache = { key: h.board.length + ':' + h.folded.size, e: equity(me, 300) };
            eqTxt = `<span class="eq">Gewinnchance ca. ${Math.round(eqCache.e * 100)} %<i style="--e:${Math.round(eqCache.e * 100)}%"></i></span>`;
          }
        }
        meEl.style.setProperty('--pc', CLR[me]);
        meEl.innerHTML = `<div class="cards">${myCards ? myCards.map(c => V.card(c, winCards.has(c) ? 'win' : '')).join('') : h && h.hole[me] ? V.card(null, 'no') + V.card(null, 'no') : ''}</div>
          <div class="info"><b>${fmt(chips[me])}<small>Chips</small></b>${hn ? `<span class="hn">${hn}</span>` : h && h.folded.has(me) ? '<span class="hn" style="color:var(--muted)">Gepasst</span>' : ''}${eqTxt}</div>`;
        const mine = h && !over && !busy && !h.res && h.toAct === me && !ctx.isAI(me) && canAct(me);
        if (h && h.res && h.res.panel && waitNext) {
          if (!acts.querySelector('.res')) { acts.innerHTML = `<div class="res">${h.res.panel}</div>`; acts.querySelector('.res button').onclick = () => h.res.go && h.res.go(); }
          return;
        }
        if (!mine) { acts.innerHTML = h && !h.res && !over && h.toAct && h.toAct !== me ? `<span class="wait">${ctx.name(h.toAct)} ist dran …</span>` : ''; return; }
        const b = bounds(me), pt = pot(), canRaise = b.maxTo > h.cur;
        const callTxt = b.toCall ? (b.toCall >= chips[me] ? 'All-in ' : 'Mitgehen ') + fmt(b.toCall) : 'Checken';
        const preset = f => Math.max(b.minTo, Math.min(b.maxTo, Math.round((h.cur + (pt + b.toCall) * f) / 10) * 10));
        acts.innerHTML = `<div class="row"><button class="btn ghost" data-a="f"><span>Passen</span></button><button class="btn" data-a="c"><span>${callTxt}</span></button></div>
          ${canRaise ? `<div class="rz"><div class="q"><button data-p="${b.minTo}">Min</button><button data-p="${preset(0.5)}">½ Topf</button><button data-p="${preset(1)}">Topf</button><button data-p="${b.maxTo}">All-in</button></div>
            <input type="range" min="${b.minTo}" max="${b.maxTo}" step="${b.maxTo - b.minTo > 400 ? 10 : 5}" value="${b.minTo}" aria-label="Einsatz">
            <button class="btn primary sm" data-a="r"><span></span></button></div>` : ''}`;
        const rng = acts.querySelector('input[type=range]'), rb = acts.querySelector('[data-a=r]');
        const sync = () => { if (!rng) return; const v = +rng.value; rb.querySelector('span').textContent = (v >= b.maxTo ? 'All-in ' : h.cur ? 'Erhöhen auf ' : 'Setzen ') + fmt(v); };
        sync();
        if (rng) rng.oninput = sync;
        acts.querySelectorAll('[data-p]').forEach(x => x.onclick = () => { rng.value = x.dataset.p; sync(); V.sfx.tick(); });
        acts.querySelectorAll('[data-a]').forEach(x => x.onclick = () => act(x.dataset.a === 'r' ? { a: 'r', v: Math.max(b.minTo, Math.min(b.maxTo, +rng.value)) } : { a: x.dataset.a }));
      }
      ctx.keys(e => {
        if (waitNext && e.key === 'Enter') { const bt = table.querySelector('.res button'); if (bt) bt.click(); return true; }
        const me = shown();
        if (!h || over || h.res || h.toAct !== me || ctx.isAI(me) || e.repeat || (e.target.matches && e.target.matches('input[type=range]') && e.key.startsWith('Arrow'))) return false;
        const k = e.key.toLowerCase(), b = bounds(me), rng = acts.querySelector('input[type=range]');
        if (k === 'f') { act({ a: 'f' }); return true; }
        if (k === 'c') { act({ a: 'c' }); return true; }
        if (k === 'r' && rng) { act({ a: 'r', v: +rng.value }); return true; }
        if (k === 'a' && b.maxTo > h.cur) { act({ a: 'r', v: b.maxTo }); return true; }
        return false;
      });
      newHand();
    }
  });
})();
