(function () {
  // Domino (draw game) with the double-six set, 2-4 players. Deal 7 each (5 with 3-4 players), the rest is the
  // boneyard. Lay a stone with a matching number at either end of the line; can't, then draw (one per move),
  // boneyard empty, then pass. The first round starts with the highest double. Whoever goes out scores the pips
  // left in the other hands; if nobody can move, the lowest hand wins them. First to `to` points wins.
  // Moves: { t: 'ab', e: 'L'|'R' } lay a stone, { d: 1 } draw, { p: 1 } pass.
  const PIP = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const half = n => `<span class="dh">${Array.from({ length: 9 }, (_, k) => `<i${PIP[n].includes(k) ? ' class="on"' : ''}></i>`).join('')}</span>`;
  // a stone face up: left number a, right number b; v = upright
  const stone = (a, b, cls = '', t = '') => `<div class="dm ${cls}"${t ? ` data-t="${t}"` : ''}>${half(a)}${half(b)}</div>`;
  const pips = t => +t[0] + +t[1];
  const SET = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) SET.push('' + a + b);

  V.css(`
  .do{width:min(var(--bw),680px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .do-opp{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;width:100%}
  .do-o{--pc:var(--yellow);display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 10px;border-radius:10px;background:var(--panel);border:1px solid var(--line);min-width:88px;transition:border-color .2s,box-shadow .2s}
  .do-o.on{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc)}
  .do-o b{font:800 italic 14px/1 var(--f-d);text-transform:uppercase;color:var(--pc)}
  .do-o .row{display:flex;gap:2px} .do-o .row>i{width:9px;height:17px;border-radius:2px;background:#f3eee2;box-shadow:0 1px 2px rgba(0,0,0,.5)}
  .do-o small{color:var(--muted);font-size:12px}
  .do-table{width:100%;min-height:150px;border-radius:16px;padding:30px 10px 14px;position:relative;display:flex;flex-direction:column;align-items:center;gap:6px}
  .do-line{display:flex;flex-direction:column;gap:6px;align-items:center}
  .do-line .r{display:flex;gap:3px}
  .dm{--dw:clamp(40px,10.5vw,58px);width:var(--dw);height:calc(var(--dw) / 2);display:flex;border-radius:calc(var(--dw) * .1);background:linear-gradient(160deg,#fffdf6,#ebe4d2);box-shadow:0 2px 0 #c9bfa6,0 4px 8px rgba(0,0,0,.45);position:relative;flex:none;user-select:none}
  .dm::after{content:'';position:absolute;left:50%;top:12%;bottom:12%;width:1.5px;background:#b9ad90;transform:translateX(-50%)}
  .dh{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:12%;gap:4%}
  .dh i{border-radius:50%} .dh i.on{background:#1b1d2e}
  .dm.v{width:calc(var(--dw) / 2);height:var(--dw);flex-direction:column} .dm.v::after{left:12%;right:12%;top:50%;bottom:auto;width:auto;height:1.5px;transform:translateY(-50%)}
  .dm.new{animation:dmin .4s var(--spring)}
  @keyframes dmin{from{transform:scale(.4) rotate(-20deg);opacity:0}}
  .dm.end{box-shadow:0 2px 0 #c9bfa6,0 0 0 2px rgba(255,255,255,.5),0 4px 8px rgba(0,0,0,.45)}
  .dm.end.ok{box-shadow:0 2px 0 #c9bfa6,0 0 0 3px var(--cyan),0 0 14px var(--cyan);cursor:pointer;animation:dmend 1.1s ease-in-out infinite}
  @keyframes dmend{50%{transform:translateY(-3px)}}
  .do-bone{position:absolute;top:8px;left:10px;font:700 italic 12px/1 var(--f-d);color:#d9f5e2;letter-spacing:.08em}
  .do-score{position:absolute;top:8px;right:10px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font:800 italic 13px/1 var(--f-d)}
  .do-hand{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px 4px;min-height:70px;width:100%}
  .do-hand .dm{--dw:clamp(52px,14vw,70px)}
  .do-hand .dm.v{cursor:default}
  .do-hand .dm.can{cursor:pointer}
  @media (hover:hover) and (pointer:fine){.do-hand .dm.can:hover{transform:translateY(-5px)}}
  .do-hand .dm.no{filter:brightness(.6) saturate(.6)}
  .do-hand .dm.sel{transform:translateY(-10px);box-shadow:0 2px 0 #c9bfa6,0 0 0 3px var(--cyan),0 8px 16px rgba(0,0,0,.5)}
  .do-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;min-height:42px}
  .do-end{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(8,9,15,.85);border-radius:10px;text-align:center;padding:10px;animation:fadein .3s}
  .do-end b{font:800 italic clamp(18px,5vw,24px)/1.1 var(--f-d);text-transform:uppercase}
  .do-end span{font:800 italic 22px/1 var(--f-d);color:var(--yellow)}
  .do-end small{color:var(--muted);font-size:13px}
  @keyframes fadein{from{opacity:0}}`);

  V.register({
    id: 'domino', name: 'Domino', cat: 'Brettspiele', order: 8, accent: '#f3eee2', party: true, noFirst: true,
    short: 'Passende Zahl anlegen, zuerst leer.',
    desc: 'Leg deine Steine an die Enden der Schlange: Die Augenzahl muss passen. Wer nicht kann, zieht. Wer zuerst alle Steine los ist, bekommt die Augen der anderen. Für 2 bis 4, am Gerät, gegen die KI oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Legt irgendeinen Stein, der passt.', 'Wird zuerst die schweren Steine los.', 'Hält sich Zahlen offen, die es noch hat.', 'Merkt sich, welche Zahlen dir fehlen, und sperrt dich aus.'],
    keys: [['Pfeile + Enter', 'Stein wählen'], ['L / R', 'Links oder rechts anlegen'], ['Leertaste', 'Ziehen oder passen']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'to', label: 'Spiel bis', def: 50, choices: [[50, '50 Punkte'], [100, '100 Punkte']] }],
    localHint: 'Ihr spielt reihum am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Steine sieht.',
    endDelay: 1200,
    icon: `<svg viewBox="0 0 48 48"><g transform="rotate(-18 24 24)"><rect x="6" y="15" width="30" height="15" rx="3" fill="#f6f1e4" stroke="#c9bfa6"/><path d="M21 17v11" stroke="#b9ad90"/>${[[11, 19], [16, 26], [26, 19], [26, 26], [31, 19], [31, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#1b1d2e"/>`).join('')}</g><g transform="rotate(14 30 32)"><rect x="18" y="28" width="26" height="13" rx="3" fill="#f6f1e4" stroke="#c9bfa6"/><path d="M31 30v9" stroke="#b9ad90"/><circle cx="24.5" cy="34.5" r="1.7" fill="#ff4fd8"/><circle cx="35" cy="32" r="1.6" fill="#1b1d2e"/><circle cx="39" cy="37" r="1.6" fill="#1b1d2e"/></g></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Gespielt wird mit den <b>28 Steinen</b> von 0-0 bis 6-6. Zu zweit bekommt jeder 7 Steine, zu dritt oder viert 5. Wer zuerst <b>alle Steine los</b> ist, gewinnt die Runde.' },
      { t: 'Anlegen', d: 'Die Steine bilden eine Schlange mit <b>zwei offenen Enden</b>. Du legst einen Stein an, dessen eine Hälfte die <b>gleiche Augenzahl</b> wie ein Ende hat. Tippe den Stein an; passt er an beide Enden, wählst du die Seite.' },
      { t: 'Ziehen und Passen', d: 'Kannst du nicht anlegen, <b>ziehst</b> du einen Stein vom Stapel, bis einer passt. Ist der Stapel leer, musst du <b>passen</b>.' },
      { t: 'Punkte', d: 'Die erste Runde beginnt, wer den <b>höchsten Pasch</b> hat (zum Beispiel 6-6), danach der Sieger der letzten Runde. Wer leer ist, bekommt die <b>Augen aller anderen Hände</b>. Kann niemand mehr legen, gewinnt die kleinste Hand. Wer zuerst die Zielpunkte hat, gewinnt.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng, local = ctx.mode === 'local';
      const TO = [50, 100].includes(+ctx.opts.to) ? +ctx.opts.to : 50, HAND = N === 2 ? 7 : 5;
      const total = {}; P.forEach(p => { total[p] = 0; });
      let hands, bone, line, turn, passes, missing, starter = 0, round = 0, over = false, busy = false, viewer = 0, sel = null, endEl = null, fresh = null;
      const wrap = V.el('div', 'do'), opp = V.el('div', 'do-opp'), table = V.el('div', 'do-table felt'), hand = V.el('div', 'do-hand'), acts = V.el('div', 'do-acts');
      wrap.append(opp, table, hand, acts); ctx.stage.appendChild(wrap);
      const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
      const shown = () => local ? viewer : (ctx.mySide || 1);
      const myTurn = () => !over && !busy && !ctx.isAI(turn) && shown() === turn;
      const ends = () => line.length ? [line[0].a, line[line.length - 1].b] : null;
      // where a stone fits: 'L', 'R', both, or the first stone
      function fits(t) {
        const e = ends(); if (!e) return ['R'];
        const a = +t[0], b = +t[1], out = [];
        if (a === e[0] || b === e[0]) out.push('L');
        if ((a === e[1] || b === e[1]) && !(e[0] === e[1] && out.length)) out.push('R');
        return out;
      }
      // the first stone of the first round must be the highest double (or the heaviest stone)
      let forced = null;
      const legal = p => hands[p].filter(t => fits(t).length && (!forced || t === forced));

      function newRound() {
        round++;
        const deck = SET.slice();
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        hands = {}; P.forEach(p => { hands[p] = deck.splice(0, HAND); });
        bone = deck; line = []; passes = 0; sel = null; forced = null;
        missing = {}; P.forEach(p => { missing[p] = new Set(); });
        if (endEl) { endEl.remove(); endEl = null; }
        if (!starter) {
          let best = null;
          P.forEach(p => hands[p].forEach(t => { const v = (t[0] === t[1] ? 100 : 0) + pips(t); if (!best || v > best.v) best = { p, t, v }; }));
          starter = best.p; forced = best.t;
        }
        if (local) ctx.handReset();
        begin(starter);
      }
      function begin(p) {
        turn = p; busy = false; sel = null;
        ctx.turn(p);
        if (!ctx.isAI(p) && local) {
          if (viewer !== p) { viewer = 0; draw(); }
          return ctx.handoff(p, `${hands[p].length} Steine warten auf dich.`, () => { viewer = p; draw(); ask(); });
        }
        draw(); ask();
      }
      function ask() {
        if (over) return;
        const p = turn;
        if (!ctx.isAI(p)) {
          if (forced) ctx.status(`${ctx.who(p)}: du beginnst mit dem höchsten Stein ${forced[0]}-${forced[1]}`);
          else if (!legal(p).length) ctx.status(bone.length ? `${ctx.who(p)}: nichts passt, zieh einen Stein` : `${ctx.who(p)}: nichts passt und der Stapel ist leer, du musst passen`);
          return draw();
        }
        ctx.aiTurn({
          side: p, quick: !!fresh,
          think: () => ({ move: think(p) }),
          targets: m => [m.t ? table.querySelector(m.e === 'L' ? '.dm.end.l' : '.dm.end.r') || table : table.querySelector('.do-bone')],
          apply: act,
          decode: raw => {
            if (!raw || typeof raw !== 'object') return null;
            if (raw.t) return typeof raw.t === 'string' && legal(p).includes(raw.t) && fits(raw.t).includes(raw.e) ? { t: raw.t, e: raw.e } : null;
            if (raw.d) return !legal(p).length && bone.length ? { d: 1 } : null;
            if (raw.p) return !legal(p).length && !bone.length ? { p: 1 } : null;
            return null;
          },
          say: m => m.t ? `${m.t[0]}-${m.t[1]} ${m.e === 'L' ? 'links' : 'rechts'}` : m.d ? 'zieht' : 'passt'
        });
      }

      // ---------- AI ----------
      function think(s) {
        const L = ctx.level, can = legal(s);
        if (!can.length) return bone.length ? { d: 1 } : { p: 1 };
        const opts = []; can.forEach(t => fits(t).forEach(e => opts.push({ t, e })));
        if (L === 0) return V.pick(opts);
        const rest = t => hands[s].filter(x => x !== t);
        const others = P.filter(p => p !== s), nxt = P[(P.indexOf(s) + 1) % N];
        const val = o => {
          const a = +o.t[0], b = +o.t[1], e = ends();
          // the end that stays open after laying the stone
          const newEnds = !e ? [a, b] : o.e === 'L' ? [a === e[0] ? b : a, e[1]] : [e[0], b === e[1] ? a : b];
          let v = pips(o.t);
          if (L >= 2) {
            if (a === b) v += 4;
            // keep numbers open that the own hand can still serve
            newEnds.forEach(n => { v += rest(o.t).filter(x => x.includes(n)).length * 2.5; });
          }
          if (L >= 3) {
            // numbers the next player (and the others) had to draw or pass on: shut them out
            newEnds.forEach(n => { if (missing[nxt].has(n)) v += 7; others.forEach(p => { if (missing[p].has(n)) v += 1.5; }); });
            if (hands[nxt].length <= 2) v += newEnds.filter(n => missing[nxt].has(n)).length * 6;
          }
          return v;
        };
        let best = opts[0], bv = -1e9;
        opts.forEach(o => { const v = val(o) + Math.random() * (L === 1 ? 2 : 0.3); if (v > bv) { bv = v; best = o; } });
        return best;
      }

      // ---------- moves ----------
      function act(m) {
        if (over || busy) return;
        const p = turn;
        if (m.t) {
          if (!legal(p).includes(m.t) || !fits(m.t).includes(m.e)) return;
          ctx.moved(p, { t: m.t, e: m.e });
          const a = +m.t[0], b = +m.t[1], e = ends();
          let piece;
          if (!e) piece = { t: m.t, a, b };
          else if (m.e === 'L') piece = a === e[0] ? { t: m.t, a: b, b: a } : { t: m.t, a, b };
          else piece = a === e[1] ? { t: m.t, a, b } : { t: m.t, a: b, b: a };
          if (m.e === 'L') line.unshift(piece); else line.push(piece);
          hands[p].splice(hands[p].indexOf(m.t), 1);
          forced = null; passes = 0; sel = null; fresh = null;
          if (ctx.isAI(p)) V.sfx.them(); else V.sfx.place();
          busy = true; draw(m.t);
          if (!hands[p].length) return ctx.later(() => roundEnd(p, false), ctx.fast() ? 20 : 700);
          ctx.status(`${ctx.who(p)} legt ${m.t[0]}-${m.t[1]}`);
          return ctx.later(nextPlayer, ctx.fast() ? 20 : 480);
        }
        if (m.d) {
          if (legal(p).length || !bone.length) return;
          ctx.moved(p, { d: 1 });
          ends().forEach(n => missing[p].add(n));
          const t = bone.pop(); hands[p].push(t); fresh = t;
          V.sfx.move();
          ctx.status(`${ctx.who(p)} zieht einen Stein`);
          draw();
          return ask();
        }
        if (m.p) {
          if (legal(p).length || bone.length) return;
          ctx.moved(p, { p: 1 });
          ends().forEach(n => missing[p].add(n));
          passes++; fresh = null;
          ctx.status(`${ctx.who(p)} passt`); V.sfx.miss();
          busy = true; draw();
          // nobody can lay a stone any more: the round is blocked
          if (passes >= N) return ctx.later(() => roundEnd(0, true), ctx.fast() ? 20 : 700);
          return ctx.later(nextPlayer, ctx.fast() ? 20 : 420);
        }
      }
      function nextPlayer() { fresh = null; begin(P[(P.indexOf(turn) + 1) % N]); }
      function roundEnd(w, blocked) {
        busy = true; ctx.turn(0, false);
        const sum = p => hands[p].reduce((a, t) => a + pips(t), 0);
        if (blocked) {
          const low = Math.min(...P.map(sum)), ws = P.filter(p => sum(p) === low);
          w = ws.length === 1 ? ws[0] : 0;
        }
        const pts = w ? P.filter(p => p !== w).reduce((a, p) => a + sum(p), 0) : 0;
        if (w) { total[w] += pts; starter = w; }
        endEl = V.el('div', 'do-end', w ? `<b class="c${w}">${ctx.name(w)} gewinnt die Runde</b><span>+${pts}</span><small>${blocked ? 'Niemand kann mehr legen, die kleinste Hand gewinnt' : 'Alle Steine gelegt'}</small><small>${P.map(p => `<span class="c${p}">${ctx.name(p)} ${total[p]}</span>`).join(' · ')}</small>`
          : `<b>Gleichstand</b><small>Niemand kann mehr legen, die kleinsten Hände sind gleich</small>`);
        viewer = local ? 0 : viewer;
        draw(); table.appendChild(endEl);
        // all hands are turned over
        opp.querySelectorAll('.do-o').forEach(o => { const p = +o.dataset.p; o.querySelector('.row').innerHTML = hands[p].map(t => stone(+t[0], +t[1], 'v')).join('').replace(/class="dm v"/g, 'class="dm v" style="--dw:30px"'); });
        if (w) V.sfx.goal();
        const lead = Math.max(...P.map(p => total[p]));
        if (lead >= TO) {
          over = true;
          const ws = P.filter(p => total[p] === lead);
          return ctx.later(() => ctx.end(ws.length > 1 ? 0 : ws[0], P.map(p => total[p]).join(' : ') + ' Punkte'), ctx.fast() ? 20 : 1800);
        }
        ctx.later(newRound, ctx.fast() ? 20 : ctx.auto ? 300 : 3600);
      }

      // ---------- screen ----------
      function draw(laid) {
        const me = shown();
        opp.innerHTML = P.filter(p => p !== me).map(p => `<div class="do-o${p === turn && !over && !endEl ? ' on' : ''}" data-p="${p}" style="--pc:${CLR[p]}"><b>${ctx.name(p)}</b><div class="row">${hands[p].map(() => '<i></i>').join('')}</div><small>${hands[p].length} ${hands[p].length === 1 ? 'Stein' : 'Steine'} · ${total[p]} P.</small></div>`).join('');
        // the line as a snake: rows left to right, then right to left, stones turned so the numbers touch
        const per = Math.max(4, Math.floor((table.clientWidth || 340) / 62)), rows = [];
        for (let i = 0; i < line.length; i += per) rows.push(line.slice(i, i + per));
        const okEnds = sel ? fits(sel) : [];
        const can = myTurn();
        table.innerHTML = `<span class="do-bone">Stapel: ${bone.length}</span><span class="do-score">${P.map(p => `<span class="c${p}">${total[p]}</span>`).join(' : ')} · bis ${TO}</span>
          <div class="do-line">${line.length ? rows.map((r, k) => `<div class="r">${(k % 2 ? r.slice().reverse() : r).map(x => {
            const idx = line.indexOf(x), isL = idx === 0, isR = idx === line.length - 1;
            const cls = [x.t === laid ? 'new' : '', isL || isR ? 'end' : '', isL ? 'l' : '', isR ? 'r' : '', (isL && okEnds.includes('L')) || (isR && okEnds.includes('R')) ? 'ok' : ''].join(' ');
            return k % 2 ? stone(x.b, x.a, cls) : stone(x.a, x.b, cls);
          }).join('')}</div>`).join('') : '<small style="color:#d9f5e2">Noch kein Stein gelegt</small>'}</div>`;
        if (endEl) table.appendChild(endEl);
        if (!me) { hand.innerHTML = ''; acts.innerHTML = ''; return; }
        const ok = can ? legal(me) : [];
        hand.innerHTML = hands[me].slice().sort((a, b) => pips(b) - pips(a)).map(t => stone(+t[0], +t[1], [can ? (ok.includes(t) ? 'can' : 'no') : '', t === sel ? 'sel' : '', t === fresh ? 'new' : ''].join(' '), t)).join('') || '<small style="color:var(--muted)">keine Steine</small>';
        const b = [];
        if (can && !ok.length) b.push(bone.length ? `<button class="btn primary" id="dod"><span>Stein ziehen (${bone.length})</span></button>` : `<button class="btn" id="dop"><span>Passen</span></button>`);
        if (can && sel && okEnds.length > 1) b.push(`<button class="btn" id="dol"><span>◀ Links anlegen</span></button><button class="btn" id="dor"><span>Rechts anlegen ▶</span></button>`);
        acts.innerHTML = b.join('');
        const on = (id, f) => { const x = acts.querySelector(id); if (x) x.onclick = f; };
        on('#dod', () => act({ d: 1 })); on('#dop', () => act({ p: 1 }));
        on('#dol', () => act({ t: sel, e: 'L' })); on('#dor', () => act({ t: sel, e: 'R' }));
      }
      function pick(t) {
        if (!myTurn() || !legal(turn).includes(t)) return;
        const f = fits(t);
        if (f.length === 1) return act({ t, e: f[0] });
        sel = sel === t ? null : t; V.sfx.tick(); draw();
      }
      hand.addEventListener('click', e => { const d = e.target.closest('.dm.can'); if (d) pick(d.dataset.t); });
      table.addEventListener('click', e => { const d = e.target.closest('.dm.end.ok'); if (d && sel && myTurn()) act({ t: sel, e: d.classList.contains('l') ? 'L' : 'R' }); });
      ctx.nav(() => myTurn() ? [...hand.querySelectorAll('.dm.can')] : [], { pad: 2 });
      ctx.keys(e => {
        if (!myTurn()) return false;
        if ((e.key === 'l' || e.key === 'L') && sel && fits(sel).includes('L')) { act({ t: sel, e: 'L' }); return true; }
        if ((e.key === 'r' || e.key === 'R') && sel && fits(sel).includes('R')) { act({ t: sel, e: 'R' }); return true; }
        if (e.key === ' ' && !e.repeat && !V.nav.active && !legal(turn).length) { act(bone.length ? { d: 1 } : { p: 1 }); return true; }
        return false;
      });
      newRound();
    }
  });
})();
