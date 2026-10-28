(function () {
  // Backgammon. Side 1 (pink) moves from point 24 down to 1 and bears off below 1; side 2 (yellow) from 1 up to 24.
  // Board: p[1..24] signed (+ side 1, - side 2), bar and off per side. Bar index: 25 for side 1, 0 for side 2;
  // off index: 0 for side 1, 25 for side 2. A turn is one move { m: [[from, to], ...] }; dice come from ctx.rng.
  const START = { 24: 2, 13: 5, 8: 3, 6: 5, 1: -2, 12: -5, 17: -3, 19: -5 };
  const BAR = { 1: 25, 2: 0 }, OFF = { 1: 0, 2: 25 }, DIR = { 1: -1, 2: 1 };
  const clone = s => ({ p: s.p.slice(), bar: s.bar.slice(), off: s.off.slice() });
  const own = (s, side, i) => side === 1 ? Math.max(s.p[i], 0) : Math.max(-s.p[i], 0);
  const opp = (s, side, i) => own(s, 3 - side, i);
  const home = (side, i) => side === 1 ? i >= 1 && i <= 6 : i >= 19 && i <= 24;
  function allHome(s, side) { if (s.bar[side]) return false; for (let i = 1; i <= 24; i++) if (own(s, side, i) && !home(side, i)) return false; return true; }
  function steps(s, side, d) {
    const out = [];
    if (s.bar[side]) { const to = side === 1 ? 25 - d : d; if (opp(s, side, to) <= 1) out.push([BAR[side], to]); return out; }
    const canOff = allHome(s, side);
    for (let i = 1; i <= 24; i++) {
      if (!own(s, side, i)) continue;
      const to = i + DIR[side] * d;
      if (to >= 1 && to <= 24) { if (opp(s, side, to) <= 1) out.push([i, to]); continue; }
      if (!canOff) continue;
      const need = side === 1 ? i : 25 - i;
      if (need === d) out.push([i, OFF[side]]);
      else if (need < d) {
        // a higher die may bear off the farthest checker only
        let farther = false;
        for (let k = 1; k <= 24; k++) if (own(s, side, k) && home(side, k) && (side === 1 ? k > i : k < i)) farther = true;
        if (!farther) out.push([i, OFF[side]]);
      }
    }
    return out;
  }
  function apply(s0, side, [from, to]) {
    const s = clone(s0), sg = side === 1 ? 1 : -1;
    if (from === BAR[side]) s.bar[side]--; else s.p[from] -= sg;
    if (to === OFF[side]) s.off[side]++;
    else {
      if (opp(s, side, to) === 1) { s.p[to] = 0; s.bar[3 - side]++; }
      s.p[to] += sg;
    }
    return s;
  }
  const key = s => s.p.join(',') + '|' + s.bar.join(',') + '|' + s.off.join(',');
  // the most dice that can still be used from here
  function maxUse(s, side, dice, memo = new Map()) {
    if (!dice.length) return 0;
    const k = key(s) + '#' + dice.join('');
    if (memo.has(k)) return memo.get(k);
    let best = 0;
    const tried = new Set();
    for (let i = 0; i < dice.length; i++) {
      if (tried.has(dice[i])) continue; tried.add(dice[i]);
      const rest = dice.slice(0, i).concat(dice.slice(i + 1));
      for (const st of steps(s, side, dice[i])) { best = Math.max(best, 1 + maxUse(apply(s, side, st), side, rest, memo)); if (best === dice.length) break; }
      if (best === dice.length) break;
    }
    memo.set(k, best);
    return best;
  }
  // steps that keep the turn legal: they lead to using as many dice as possible (and the bigger die if only one fits)
  function okSteps(s, side, dice) {
    const need = maxUse(s, side, dice);
    if (!need) return [];
    const out = [], tried = new Set();
    for (let i = 0; i < dice.length; i++) {
      if (tried.has(dice[i])) continue; tried.add(dice[i]);
      const rest = dice.slice(0, i).concat(dice.slice(i + 1));
      for (const st of steps(s, side, dice[i])) if (1 + maxUse(apply(s, side, st), side, rest) === need) out.push({ st, d: dice[i] });
    }
    if (need === 1 && dice.length === 2 && dice[0] !== dice[1]) {
      const big = Math.max(...dice), withBig = out.filter(x => x.d === big);
      if (withBig.length) return withBig;
    }
    return out;
  }
  // every distinct end position of a legal turn, with one way to get there (for the AI)
  function turns(s, side, dice) {
    const res = new Map();
    (function rec(st, ds, path) {
      const opts = okSteps(st, side, ds);
      if (!opts.length) { const k = key(st); if (!res.has(k)) res.set(k, { s: st, path }); return; }
      const seen = new Set();
      for (const o of opts) {
        const n = apply(st, side, o.st), k = key(n) + '#' + ds.length;
        if (seen.has(k)) continue; seen.add(k);
        const i = ds.indexOf(o.d);
        rec(n, ds.slice(0, i).concat(ds.slice(i + 1)), path.concat([o.st]));
      }
    })(s, dice, []);
    return [...res.values()];
  }
  const pip = (s, side) => { let t = s.bar[side] * 25; for (let i = 1; i <= 24; i++) t += own(s, side, i) * (side === 1 ? i : 25 - i); return t; };
  // position value for side (bigger = better)
  function evalPos(s, side, L) {
    const o = 3 - side;
    if (s.off[side] === 15) return 1e6;
    let v = (pip(s, o) - pip(s, side)) * 1.0 + s.bar[o] * 9 - s.bar[side] * 9 + s.off[side] * 2;
    if (L < 2) return v;
    // contact: are there still opponent checkers behind ours?
    let oppBack = 0; for (let i = 1; i <= 24; i++) if (own(s, o, i)) oppBack = side === 1 ? Math.max(oppBack, 25 - i) : Math.max(oppBack, i);
    let run = 0;
    for (let i = 1; i <= 24; i++) {
      const n = own(s, side, i);
      const made = n >= 2;
      if (made) { v += 2 + (home(side, i) ? 3 : 0) + (home(o, i) ? 1.5 : 0); run++; if (run >= 3) v += run; } else run = 0;
      if (n === 1) {
        // a blot: count opponent checkers that hit it directly (1-6 away, coming from their side)
        let shots = s.bar[o] ? 1 : 0;
        for (let d = 1; d <= 6; d++) { const f = i - DIR[o] * d; if (f >= 1 && f <= 24 && own(s, o, f)) shots++; }
        const depth = side === 1 ? 25 - i : i;
        if (shots) v -= (4 + shots * (L === 3 ? 2.2 : 1.6)) * (0.6 + depth / 24);
      }
    }
    return v;
  }

  V.css(`
  .bg{width:min(var(--bw),680px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .bg .bg-board{width:100%}
  .bg svg{width:100%;height:auto;display:block;border-radius:12px;background:#5d3a1c;box-shadow:0 18px 40px -14px rgba(0,0,0,.8);user-select:none;touch-action:manipulation}
  .bg .fld{fill:url(#bgwood)} .bg .barz{fill:#4a2d14} .bg .tray{fill:#3a2410}
  .bg .tri.a{fill:#8f2d4f} .bg .tri.b{fill:#efe2c8}
  .bg .ck{stroke:rgba(0,0,0,.45);stroke-width:.05}
  .bg .ck.s1{fill:url(#bgp1)} .bg .ck.s2{fill:url(#bgp2)}
  .bg .cnt{font:800 .5px var(--f-b);fill:#15172a;text-anchor:middle;dominant-baseline:central;pointer-events:none}
  .bg .hit{fill:transparent;cursor:pointer}
  .bg .src{stroke:#62f0ff;stroke-width:.12;fill:none;pointer-events:none;animation:bgpulse 1.1s ease-in-out infinite}
  .bg .sel{stroke:#fff;stroke-width:.14;fill:none;pointer-events:none}
  .bg .tgt{fill:#62f0ff;opacity:.75;pointer-events:none;animation:bgpulse 1.1s ease-in-out infinite}
  @keyframes bgpulse{50%{opacity:.35}}
  .bg .off{fill:url(#bgp1);stroke:rgba(0,0,0,.4);stroke-width:.03} .bg .off.s2{fill:url(#bgp2)}
  .bg .num{font:700 .34px var(--f-b);fill:rgba(255,235,200,.55);text-anchor:middle;pointer-events:none}
  .bg-bar{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}
  .bg-bar .die3w{--ds:44px}
  .bg-bar .die3w.used{opacity:.3}
  .bg-bar .pips{font-size:13px;color:var(--muted)} .bg-bar .pips b{color:var(--fg)}`);

  V.register({
    id: 'backgammon', name: 'Backgammon', cat: 'Strategie', order: 7, accent: '#8f2d4f',
    short: 'Würfeln, ziehen, schlagen, abtragen.',
    desc: 'Einer der ältesten Klassiker der Welt: Würfle und zieh deine 15 Steine einmal ums Brett nach Hause, dann trag sie ab. Einzelne Steine kann der Gegner schlagen. Wer zuerst alle abgetragen hat, gewinnt.',
    sides: { 1: 'Pink', 2: 'Gelb' },
    levelInfo: ['Zieht irgendwie.', 'Läuft vor allem schnell nach Hause.', 'Baut Punkte, schützt seine Steine und schlägt.', 'Wägt jeden Zug genau ab.'],
    keys: [['Klicken', 'Stein wählen, dann Ziel'], ['U', 'Zug zurücknehmen']],
    endDelay: 1400,
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="5" width="42" height="38" rx="4" fill="#5d3a1c"/><rect x="6" y="8" width="17" height="32" fill="#d4a56a"/><rect x="25" y="8" width="17" height="32" fill="#d4a56a"/>${[0, 1, 2].map(k => `<path d="M${6 + k * 5.7} 8l2.85 13 2.85-13z" fill="${k % 2 ? '#efe2c8' : '#8f2d4f'}"/><path d="M${25 + k * 5.7} 40l2.85-13 2.85 13z" fill="${k % 2 ? '#8f2d4f' : '#efe2c8'}"/>`).join('')}<circle cx="11" cy="36" r="3" fill="#ff4fd8"/><circle cx="11" cy="30" r="3" fill="#ff4fd8"/><circle cx="36" cy="12" r="3" fill="#ffd84f"/><circle cx="36" cy="18" r="3" fill="#ffd84f"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat <b>15 Steine</b>. Pink zieht gegen den Uhrzeigersinn nach unten rechts, Gelb andersherum nach oben rechts. Sind alle eigenen Steine im <b>Heimfeld</b> (die sechs Zungen in deiner Ecke), darfst du sie <b>abtragen</b>. Wer zuerst alle abgetragen hat, gewinnt.' },
      { t: 'Ziehen', d: 'Du würfelst zwei Würfel und ziehst mit jeder Augenzahl einen Stein so weit, mit einem Stein auch zweimal. Bei einem <b>Pasch</b> ziehst du viermal. Tippe einen leuchtenden Stein an, dann das Ziel. Du musst so viele Würfel nutzen wie möglich.' },
      { t: 'Wohin', d: 'Du darfst auf freie Zungen, eigene Zungen oder auf eine Zunge mit <b>genau einem</b> gegnerischen Stein. Zwei oder mehr gegnerische Steine sind ein <b>Block</b>.' },
      { t: 'Schlagen', d: 'Landest du auf einem einzelnen gegnerischen Stein, wird er <b>geschlagen</b> und kommt auf die Bar in der Mitte. Wer Steine auf der Bar hat, muss diese zuerst wieder ins gegnerische Heimfeld <b>einwürfeln</b>.' },
      { t: 'Tipps', d: 'Lass möglichst keine einzelnen Steine in Reichweite des Gegners stehen. Mehrere besetzte Zungen hintereinander (eine <b>Blockade</b>) halten seine Steine auf.' }
    ],
    start(ctx) {
      const R = ctx.rng;
      let s = { p: Array(26).fill(0), bar: [0, 0, 0], off: [0, 0, 0] };
      Object.entries(START).forEach(([i, n]) => { s.p[+i] = n; });
      let turn = 1, dice = [], left = [], done = [], startS = null, over = false, sel = null;
      const wrap = V.el('div', 'bg'), host = V.el('div', 'bg-board'), bar = V.el('div', 'bg-bar');
      const d1 = V.die(), d2 = V.die(), undo = V.el('button', 'btn ghost sm', '<span>Zurück</span>'), pips = V.el('span', 'pips');
      bar.append(d1.el, d2.el, undo, pips);
      wrap.append(host, bar); ctx.stage.appendChild(wrap);
      // geometry: 12 point columns plus the bar (x 6..7), trays on the right (x 13.2..14.6)
      const X = i => { const c = i <= 12 ? 12 - i : i - 13; return c + (c >= 6 ? 1 : 0) + 0.5; };
      const top = i => i >= 13;
      function svg() {
        const myTurn = !over && !ctx.isAI(turn) && left.length;
        const opts = myTurn ? okSteps(s, turn, left) : [];
        const srcs = new Set(opts.map(o => o.st[0])), tgts = sel != null ? opts.filter(o => o.st[0] === sel).map(o => o.st[1]) : [];
        let h = `<svg viewBox="-0.3 -0.3 15.2 12.6"><defs><linearGradient id="bgwood" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e2bb83"/><stop offset="1" stop-color="#c08a4e"/></linearGradient>
          <radialGradient id="bgp1" cx=".35" cy=".3"><stop offset="0" stop-color="#ffb3ee"/><stop offset=".6" stop-color="#ff4fd8"/><stop offset="1" stop-color="#b8329b"/></radialGradient>
          <radialGradient id="bgp2" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3c0"/><stop offset=".6" stop-color="#ffd84f"/><stop offset="1" stop-color="#b9952a"/></radialGradient></defs>
          <rect class="fld" x="0" y="0" width="13" height="12" rx=".2"/><rect class="barz" x="6" y="0" width="1" height="12"/><rect class="tray" x="13.3" y="0" width="1.5" height="12" rx=".2"/>`;
        for (let i = 1; i <= 24; i++) {
          const x = X(i), t = top(i);
          h += `<path class="tri ${(i % 2) ? 'a' : 'b'}" d="M${x - 0.5} ${t ? 0 : 12}L${x} ${t ? 5 : 7}L${x + 0.5} ${t ? 0 : 12}Z"/>`;
          h += `<text class="num" x="${x}" y="${t ? 5.45 : 6.8}">${i}</text>`;
          const n = Math.abs(s.p[i]), side = s.p[i] > 0 ? 1 : 2, gap = n > 5 ? 4.1 / (n - 1) : 0.9;
          for (let k = 0; k < Math.min(n, 15); k++) { const y = t ? 0.48 + k * gap : 11.52 - k * gap; h += `<circle class="ck s${side}" cx="${x}" cy="${y}" r=".44"/>`; }
          if (srcs.has(i)) h += `<circle class="${sel === i ? 'sel' : 'src'}" cx="${x}" cy="${t ? 0.48 + (Math.min(n, 15) - 1) * (n > 5 ? 4.1 / (n - 1) : 0.9) : 11.52 - (Math.min(n, 15) - 1) * (n > 5 ? 4.1 / (n - 1) : 0.9)}" r=".5"/>`;
          if (tgts.includes(i)) h += `<circle class="tgt" cx="${x}" cy="${t ? 4.4 : 7.6}" r=".22"/>`;
          h += `<rect class="hit" data-i="${i}" x="${x - 0.5}" y="${t ? 0 : 6.5}" width="1" height="5.5"/>`;
        }
        // bar: side 1 waits in the upper half (it enters at the top right), side 2 in the lower half
        [1, 2].forEach(side => {
          for (let k = 0; k < s.bar[side]; k++) h += `<circle class="ck s${side}" cx="6.5" cy="${side === 1 ? 4.5 - k * 0.9 : 7.5 + k * 0.9}" r=".44"/>`;
          if (srcs.has(BAR[side]) && side === turn) h += `<circle class="${sel === BAR[side] ? 'sel' : 'src'}" cx="6.5" cy="${side === 1 ? 4.5 : 7.5}" r=".5"/>`;
        });
        h += `<rect class="hit" data-i="bar" x="6" y="0" width="1" height="12"/>`;
        // trays: borne off checkers as thin slabs, side 1 at the bottom, side 2 at the top
        [1, 2].forEach(side => { for (let k = 0; k < s.off[side]; k++) h += `<rect class="off s${side}" x="13.4" y="${side === 1 ? 11.75 - k * 0.32 : 0.05 + k * 0.32}" width="1.3" height=".26" rx=".06"/>`; });
        if (tgts.includes(OFF[turn])) h += `<circle class="tgt" cx="14.05" cy="${turn === 1 ? 6.8 : 5.2}" r=".3"/>`;
        h += `<rect class="hit" data-i="off" x="13.3" y="0" width="1.5" height="12"/></svg>`;
        host.innerHTML = h;
        pips.innerHTML = `Pips: <b class="c1">${pip(s, 1)}</b> · <b class="c2">${pip(s, 2)}</b>`;
        undo.disabled = over || !done.length || ctx.isAI(turn);
        // used dice fade out (a double counts two moves per die)
        const usedN = (dice[0] === dice[1] ? 4 : 2) - left.length;
        [d1, d2].forEach((d, k) => d.el.classList.toggle('used', !!dice.length && !over && (dice[0] === dice[1] ? usedN >= (k + 1) * 2 : !left.includes(dice[k]))));
      }
      function begin() {
        sel = null; done = []; startS = s;
        const a = 1 + Math.floor(R() * 6), b = 1 + Math.floor(R() * 6);
        dice = [a, b]; left = a === b ? [a, a, a, a] : [a, b];
        d1.color(V.hex(turn)); d2.color(V.hex(turn)); d1.show(a, true); d2.show(b, true); V.sfx.tick();
        ctx.turn(turn);
        svg();
        ctx.later(() => {
          if (over) return;
          if (!okSteps(s, turn, left).length) {
            ctx.status(`${ctx.who(turn)} würfelt ${a} und ${b} und kann nicht ziehen`);
            if (!ctx.isAI(turn)) return ctx.later(() => commit(), 1100);
          } else if (!ctx.isAI(turn)) ctx.status(`${ctx.who(turn)}: ${a === b ? 'Pasch ' + a + '! Viermal ziehen' : a + ' und ' + b}`);
          ask();
        }, V.fxOn() && !ctx.fast() ? 650 : 40);
      }
      function ask() {
        if (over || !ctx.isAI(turn)) return svg();
        ctx.aiTurn({
          think: () => {
            const L = ctx.level, all = turns(s, turn, left);
            if (!all.length) return { move: { m: [] } };
            let pick;
            if (L === 0) pick = V.pick(all);
            else { let bv = -1e9; for (const t of all) { const v = evalPos(t.s, turn, L) + (L === 1 ? Math.random() * 6 : Math.random() * 0.4); if (v > bv) { bv = v; pick = t; } } }
            return { move: { m: pick.path }, mood: Math.tanh((pip(s, 3 - turn) - pip(s, turn)) / 40) };
          },
          targets: () => [host],
          apply: m => animate(m.m),
          decode: raw => {
            if (!raw || !Array.isArray(raw.m)) return null;
            let t = s, l = left.slice();
            for (const st of raw.m) {
              if (!Array.isArray(st) || st.length !== 2) return null;
              const ok = okSteps(t, turn, l).find(o => o.st[0] === st[0] && o.st[1] === st[1]);
              if (!ok) return null;
              t = apply(t, turn, ok.st); l.splice(l.indexOf(ok.d), 1);
            }
            return okSteps(t, turn, l).length ? null : { m: raw.m };
          },
          say: m => m.m.length ? m.m.map(([a, b]) => `${a === BAR[turn] ? 'Bar' : a}/${b === OFF[turn] ? 'ab' : b}`).join(' ') : 'kann nicht'
        });
      }
      // play a whole turn step by step (AI and remote players)
      function animate(path) {
        let k = 0;
        const step = () => {
          if (k >= path.length) return commit(true);
          const st = path[k++], o = okSteps(s, turn, left).find(x => x.st[0] === st[0] && x.st[1] === st[1]);
          if (!o) return commit(true);
          doStep(o);
          ctx.later(step, ctx.fast() ? 20 : 380);
        };
        step();
      }
      function doStep(o) {
        const hit = o.st[1] !== OFF[turn] && opp(s, turn, o.st[1]) === 1;
        s = apply(s, turn, o.st); left.splice(left.indexOf(o.d), 1); done.push(o.st); sel = null;
        hit ? (V.sfx.hit(), V.fx.shake(host, true)) : V.sfx.place();
        if (o.st[1] === OFF[turn]) V.sfx.goal();
        svg();
      }
      // the turn is complete: send it (own turns) and pass on
      function commit() {
        if (over) return;
        ctx.moved(turn, { m: done });
        if (s.off[turn] === 15) {
          over = true; svg();
          const gammon = s.off[3 - turn] === 0;
          return ctx.end(turn, gammon ? 'Gammon! Der Gegner hat keinen Stein abgetragen' : 'Alle Steine abgetragen');
        }
        turn = 3 - turn; left = [];
        ctx.later(begin, ctx.fast() ? 20 : 350);
      }
      host.addEventListener('click', e => {
        const t = e.target.closest('[data-i]'); if (!t || over || ctx.isAI(turn) || !left.length) return;
        const opts = okSteps(s, turn, left);
        const id = t.dataset.i === 'bar' ? BAR[turn] : t.dataset.i === 'off' ? OFF[turn] : +t.dataset.i;
        if (sel != null) {
          const o = opts.find(x => x.st[0] === sel && x.st[1] === id);
          if (o) { doStep(o); return after(); }
        }
        const from = opts.filter(x => x.st[0] === id);
        if (!from.length) { sel = null; return svg(); }
        // only one place to go (or one die left): move at once
        const targets = [...new Set(from.map(x => x.st[1]))];
        if (targets.length === 1) { doStep(from[0]); return after(); }
        sel = id; V.sfx.tick(); svg();
      });
      function after() {
        if (!okSteps(s, turn, left).length) { svg(); return ctx.later(() => commit(), 250); }
        svg();
      }
      undo.onclick = () => { if (!done.length || ctx.isAI(turn)) return; s = startS; left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(); done = []; sel = null; V.sfx.ui(); svg(); };
      ctx.keys(e => { if ((e.key === 'u' || e.key === 'U') && !e.repeat) { undo.click(); return true; } return false; });
      begin();
    }
  });
})();
