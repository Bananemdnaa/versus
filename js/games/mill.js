(function () {
  const PTS = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
  const ADJ = [[1, 9], [0, 2, 4], [1, 14], [4, 10], [1, 3, 5, 7], [4, 13], [7, 11], [4, 6, 8], [7, 12], [0, 10, 21], [3, 9, 11, 18], [6, 10, 15], [8, 13, 17], [5, 12, 14, 20], [2, 13, 23], [11, 16], [15, 17, 19], [12, 16], [10, 19], [16, 18, 20, 22], [13, 19], [9, 22], [19, 21, 23], [14, 22]];
  const MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23], [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
  const MILLS_OF = PTS.map((_, i) => MILLS.filter(m => m.includes(i)));
  const inMill = (b, i) => b[i] && MILLS_OF[i].some(m => m.every(x => b[x] === b[i]));
  function removable(b, op) {
    const all = []; for (let i = 0; i < 24; i++) if (b[i] === op) all.push(i);
    const free = all.filter(i => !inMill(b, i));
    return free.length ? free : all;
  }
  const phase = (s, p) => s.hand[p] > 0 ? 'place' : s.on[p] === 3 ? 'fly' : 'move';
  function baseMoves(s) {
    const p = s.turn, b = s.b, out = [], ph = phase(s, p);
    if (ph === 'place') { for (let i = 0; i < 24; i++) if (!b[i]) out.push([-1, i]); return out; }
    for (let f = 0; f < 24; f++) if (b[f] === p) {
      if (ph === 'fly') { for (let t = 0; t < 24; t++) if (!b[t]) out.push([f, t]); }
      else for (const t of ADJ[f]) if (!b[t]) out.push([f, t]);
    }
    return out;
  }
  function genMoves(s) {
    if (s._m) return s._m;
    const out = [], p = s.turn;
    for (const [f, t] of baseMoves(s)) {
      const b = s.b.slice(); if (f >= 0) b[f] = 0; b[t] = p;
      if (inMill(b, t)) for (const r of removable(b, 3 - p)) out.push({ f, t, r });
      else out.push({ f, t, r: -1 });
    }
    return s._m = out;
  }
  function play(s, m) {
    const b = s.b.slice(), p = s.turn, hand = { 1: s.hand[1], 2: s.hand[2] }, on = { 1: s.on[1], 2: s.on[2] };
    if (m.f >= 0) b[m.f] = 0; else { hand[p]--; on[p]++; }
    b[m.t] = p;
    if (m.r >= 0) { b[m.r] = 0; on[3 - p]--; }
    const moving = !hand[1] && !hand[2];
    return { b, turn: 3 - p, hand, on, quiet: m.r >= 0 || !moving ? 0 : s.quiet + 1 };
  }
  function lost(s) { const p = s.turn; return s.hand[p] + s.on[p] < 3 || !genMoves(s).length; }
  const G = {
    moves: genMoves, play,
    order: (s, ms) => ms.slice().sort((a, b) => (b.r >= 0) - (a.r >= 0)),
    over(s, ply) { if (lost(s)) return -(100000 - ply); if (s.quiet >= 60) return 0; return null; },
    eval(s) {
      const me = s.turn, op = 3 - me, b = s.b;
      let v = (s.hand[me] + s.on[me] - s.hand[op] - s.on[op]) * 120;
      for (const m of MILLS) {
        let a = 0, o = 0, e = 0; for (const x of m) { if (b[x] === me) a++; else if (b[x] === op) o++; else e++; }
        if (a === 2 && e === 1) v += 14; if (o === 2 && e === 1) v -= 16; if (a === 3) v += 8; if (o === 3) v -= 8;
      }
      if (phase(s, me) === 'move' || phase(s, op) === 'move') {
        let mm = 0, om = 0;
        for (let i = 0; i < 24; i++) { if (b[i]) { const f = ADJ[i].filter(t => !b[t]).length; if (b[i] === me) mm += f; else om += f; } }
        v += (mm - om) * 4;
      }
      return v;
    }
  };

  V.css(`
  .mill{width:min(100%,500px);display:flex;flex-direction:column;gap:8px;user-select:none;touch-action:manipulation}
  .mill svg{width:100%;height:auto;display:block}
  .mill .bd{fill:none;stroke:#3a4070;stroke-width:.09;stroke-linecap:round}
  .mill .pt{fill:#2a2f4f}
  .mill .hit{fill:transparent;cursor:pointer}
  .mill .tg{fill:var(--cy);opacity:.85}
  .mill .stn{transform-box:fill-box;transform-origin:center}
  .mill .stn.nw{animation:mnw .35s var(--spring)}
  .mill .stn.mv{animation:mmv .28s cubic-bezier(.25,.8,.3,1)}
  .mill .stn.gone{animation:mgone .4s ease-in forwards;pointer-events:none}
  .mill .mil.fresh{stroke-dasharray:1;stroke-dashoffset:1;animation:mdraw .4s ease-out forwards}
  @keyframes mnw{from{transform:scale(1.8);opacity:0}}
  @keyframes mmv{from{transform:translate(var(--dx),var(--dy))}}
  @keyframes mgone{to{transform:scale(0);opacity:0}}
  @keyframes mdraw{to{stroke-dashoffset:0}}
  .mill .tg{animation:tgpulse 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  .mill .s1{fill:var(--p1);filter:drop-shadow(0 0 .12px rgba(255,79,216,.9))} .mill .s2{fill:var(--p2);filter:drop-shadow(0 0 .12px rgba(255,216,79,.8))}
  .mill .sel{stroke:#fff;stroke-width:.07}
  .mill .rem{stroke:var(--bad);stroke-width:.08;stroke-dasharray:.12 .08;animation:spin 1.2s linear infinite;cursor:pointer}
  .mill .lastm{stroke:rgba(255,255,255,.6);stroke-width:.05}
  .mill .mil{stroke:var(--cy);stroke-width:.14;stroke-linecap:round;opacity:.8}
  @keyframes spin{to{stroke-dashoffset:-.4}}
  .hands{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted)}
  .hands div{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
  .hands i{width:12px;height:12px;border-radius:50%;display:inline-block}
  .hands .h1 i{background:var(--p1)} .hands .h2 i{background:var(--p2)} .hands .h2{justify-content:flex-end}`);

  function demo(pieces, opts = {}) {
    let h = `<div class="mill" style="width:200px"><svg viewBox="-0.6 -0.6 7.2 7.2">`;
    h += `<path class="bd" d="M0 0H6V6H0Z M1 1H5V5H1Z M2 2H4V4H2Z M3 0V2 M3 4V6 M0 3H2 M4 3H6"/>`;
    (opts.mills || []).forEach(m => { const a = PTS[m[0]], c = PTS[m[2]]; h += `<line class="mil" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/>`; });
    PTS.forEach(([x, y], i) => { h += `<circle class="pt" cx="${x}" cy="${y}" r=".14"/>`; });
    (opts.tg || []).forEach(i => h += `<circle class="tg" cx="${PTS[i][0]}" cy="${PTS[i][1]}" r=".14"/>`);
    Object.entries(pieces).forEach(([i, p]) => h += `<circle class="s${p}${(opts.rem || []).includes(+i) ? ' rem' : ''}" cx="${PTS[i][0]}" cy="${PTS[i][1]}" r=".36"/>`);
    return h + '</svg></div>';
  }

  V.register({
    id: 'mill', name: 'Mühle', cat: 'Strategie', order: 4, accent: 'var(--p2)',
    short: 'Drei in einer Linie, dann Stein weg.',
    desc: 'Setz und zieh deine neun Steine. Drei in einer Linie sind eine Mühle, dann darfst du einen gegnerischen Stein nehmen.',
    sides: { 1: 'Pink', 2: 'Gelb' },
    keys: [['Pfeile', 'Punkt wählen'], ['Enter', 'Setzen, Stein nehmen oder ziehen']],
    icon: `<svg viewBox="0 0 48 48" fill="none"><path d="M5 5h38v38H5zM13 13h22v22H13zM20 20h8v8h-8zM24 5v15M24 28v15M5 24h15M28 24h15" stroke="#3a4070" stroke-width="2.4"/><circle cx="5" cy="5" r="4" fill="#ff4fd8"/><circle cx="24" cy="5" r="4" fill="#ff4fd8"/><circle cx="43" cy="5" r="4" fill="#ff4fd8"/><circle cx="35" cy="35" r="4" fill="#ffd84f"/><circle cx="13" cy="24" r="4" fill="#ffd84f"/></svg>`,
    tutorial: [
      { t: 'Das Brett', d: 'Das Brett hat <b>24 Punkte</b> auf drei Quadraten, verbunden durch Linien. Jeder hat <b>9 Steine</b>. Pink beginnt.', demo: demo({}) },
      { t: 'Phase 1: Setzen', d: 'Zuerst setzt ihr abwechselnd je einen Stein auf einen <b>freien Punkt</b>, bis alle 18 Steine auf dem Brett sind. Unter dem Brett siehst du, wie viele Steine noch übrig sind.', demo: demo({ 0: 1, 4: 2, 10: 1, 13: 2 }) },
      { t: 'Mühle!', d: 'Bringst du <b>drei Steine in eine Linie</b>, hast du eine Mühle. Dann nimmst du dem Gegner einen Stein weg. Steine, die selbst in einer Mühle stehen, sind geschützt, außer der Gegner hat nur noch Mühlen-Steine.', demo: demo({ 0: 1, 1: 1, 2: 1, 13: 2, 19: 2 }, { mills: [[0, 1, 2]], rem: [13, 19] }) },
      { t: 'Phase 2: Ziehen', d: 'Sind alle Steine gesetzt, ziehst du einen eigenen Stein <b>entlang einer Linie</b> auf einen freien Nachbarpunkt. Tippe erst den Stein an, dann das Ziel. Öffnest und schließt du eine Mühle immer wieder, nimmst du jedes Mal einen Stein.', demo: demo({ 4: 1, 9: 2 }, { tg: [1, 3, 5, 7] }) },
      { t: 'Phase 3: Springen', d: 'Hat ein Spieler nur noch <b>drei Steine</b>, darf er mit ihnen auf jeden freien Punkt springen.' },
      { t: 'Gewinnen', d: 'Du gewinnst, wenn der Gegner <b>nur noch zwei Steine</b> hat oder <b>sich nicht mehr bewegen kann</b>. Nach 30 Zügen pro Spieler ohne Mühle gibt es Remis. Tipp: Eine Zwickmühle, also zwei Mühlen nebeneinander, die du abwechselnd schließt, ist kaum zu stoppen.' }
    ],
    start(ctx) {
      let s = { b: Array(24).fill(0), turn: 1, hand: { 1: 9, 2: 9 }, on: { 1: 0, 2: 0 }, quiet: 0 }, over = false;
      let sel = -1, pending = null, last = null, anim = null;
      const wrap = V.el('div', 'mill'), hands = V.el('div', 'hands'), svgBox = V.el('div');
      wrap.append(svgBox, hands); ctx.stage.appendChild(wrap);
      svgBox.addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t) tap(+t.dataset.i); });
      ctx.nav(() => [...svgBox.querySelectorAll('.hit')], { round: true, pad: -4, start: () => 4 });
      const human = () => !over && !ctx.isAI(s.turn);

      function render() {
        const p = s.turn, ph = phase(s, p);
        const ms = human() ? genMoves(s) : [];
        const tg = new Set();
        if (human() && !pending) {
          if (ph === 'place') ms.forEach(m => tg.add(m.t));
          else if (sel >= 0) ms.filter(m => m.f === sel).forEach(m => tg.add(m.t));
        }
        const b = pending ? pending.b : s.b;
        const rem = new Set(pending ? removable(b, 3 - p) : []);
        let h = `<svg viewBox="-0.6 -0.6 7.2 7.2"><path class="bd" d="M0 0H6V6H0Z M1 1H5V5H1Z M2 2H4V4H2Z M3 0V2 M3 4V6 M0 3H2 M4 3H6"/>`;
        // the same move may be rendered twice in one tick (doMove + next); both renders keep its animation
        if (anim && !anim.at) anim.at = performance.now();
        const A = anim && performance.now() - anim.at < 80 ? anim : {};
        MILLS.forEach(m => {
          if (b[m[0]] && m.every(x => b[x] === b[m[0]])) {
            const a = PTS[m[0]], c = PTS[m[2]], fresh = A.t !== undefined && m.includes(A.t);
            h += `<line class="mil${fresh ? ' fresh' : ''}" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" pathLength="1"/>`;
          }
        });
        PTS.forEach(([x, y], i) => {
          h += `<circle class="pt" cx="${x}" cy="${y}" r=".14"/>`;
          if (tg.has(i)) h += `<circle class="tg" cx="${x}" cy="${y}" r=".16"/>`;
          if (b[i]) {
            let extra = '', style = '';
            if (i === A.t && A.f >= 0) { extra = ' mv'; style = ` style="--dx:${PTS[A.f][0] - x}px;--dy:${PTS[A.f][1] - y}px"`; }
            else if (i === A.t) extra = ' nw';
            h += `<circle class="stn s${b[i]}${i === sel ? ' sel' : ''}${rem.has(i) ? ' rem' : ''}${last && last.includes(i) && !rem.has(i) && i !== sel ? ' lastm' : ''}${extra}"${style} cx="${x}" cy="${y}" r=".36"/>`;
          }
          if (A.r === i) h += `<circle class="stn s${A.rs} gone" cx="${x}" cy="${y}" r=".36"/>`;
          h += `<circle class="hit" data-i="${i}" cx="${x}" cy="${y}" r=".48"/>`;
        });
        svgBox.innerHTML = h + '</svg>';
        if (!A.fired && A.at) {
          A.fired = true;
          if (A.r >= 0) { const hit = svgBox.querySelector(`[data-i="${A.r}"]`); V.fx.burstAt(hit, A.rs === 1 ? '#ff4fd8' : '#ffd84f', 14, 60); V.fx.shake(wrap, true); }
          if (svgBox.querySelector('.mil.fresh')) { const hit = svgBox.querySelector(`[data-i="${A.t}"]`); V.fx.ringAt(hit, '#6ff3ff', 90); }
        }
        const pile = (k) => '<i></i>'.repeat(s.hand[k]);
        hands.innerHTML = `<div class="h1">${pile(1)} ${s.hand[1] ? '' : `${s.on[1]} auf dem Brett`}</div><div class="h2">${s.hand[2] ? '' : `${s.on[2]} auf dem Brett`} ${pile(2)}</div>`;
      }
      function tap(i) {
        if (!human()) return;
        const p = s.turn, ms = genMoves(s);
        if (pending) {
          const m = ms.find(m => m.f === pending.f && m.t === pending.t && m.r === i);
          if (m) { pending = null; return doMove(m, true); }
          V.sfx.bad(); return;
        }
        const ph = phase(s, p);
        let f = -1, t = -1;
        if (ph === 'place') { if (s.b[i]) return; t = i; }
        else {
          if (s.b[i] === p) { sel = ms.some(m => m.f === i) ? i : -1; V.sfx.move(); render(); return; }
          if (sel < 0 || s.b[i]) return;
          f = sel; t = i;
        }
        const cand = ms.filter(m => m.f === f && m.t === t);
        if (!cand.length) { V.sfx.bad(); return; }
        if (cand[0].r < 0) return doMove(cand[0]);
        const b = s.b.slice(); if (f >= 0) b[f] = 0; b[t] = p;
        pending = { f, t, b }; sel = -1; V.sfx.place();
        anim = { f, t, r: -1 };
        render();
        ctx.status('<b style="color:var(--cy)">Mühle!</b> Tippe auf einen gegnerischen Stein, um ihn zu nehmen.');
      }
      function doMove(m, noSlide) {
        anim = { f: noSlide ? -1 : m.f, t: noSlide ? -2 : m.t, r: m.r, rs: 3 - s.turn };
        if (noSlide && m.r < 0) anim = null;
        s = play(s, m); sel = -1; last = [m.f, m.t];
        if (m.r >= 0) V.sfx.hit(); else V.sfx.place();
        render();
        if (lost(s)) { over = true; render(); ctx.end(3 - s.turn, s.hand[s.turn] + s.on[s.turn] < 3 ? 'Nur noch zwei Steine' : 'Keine Züge mehr'); return; }
        if (s.quiet >= 60) { over = true; ctx.end(0, '30 Züge ohne Mühle'); return; }
        next();
      }
      function next() {
        const p = s.turn, ph = phase(s, p);
        const hint = { place: 'setzt', move: 'zieht', fly: 'springt' }[ph];
        const who = ctx.isAI(p) ? '<span class="c' + p + '">KI</span>' : ctx.name(p) === 'Du' ? '<span class="c' + p + '">Du</span>' : ctx.who(p);
        const verb = ctx.name(p) === 'Du' ? { place: 'setzt', move: 'ziehst', fly: 'springst' }[ph].replace(/^setzt$/, 'setzt') : hint;
        ctx.turn(p, `${who} ${ctx.name(p) === 'Du' && ph === 'place' ? 'setzt' : verb}${ph === 'fly' ? ' (nur noch 3 Steine)' : ''}`);
        render();
        if (ctx.isAI(p)) ctx.think(() => {
          const L = ctx.level, ms = genMoves(s);
          const m = Math.random() < [0.35, 0.12, 0.02, 0][L] ? V.pick(ms) : V.search(G, s, [1, 3, 4, 6][L], [250, 600, 1100, 1900][L]).move;
          if (m.r >= 0) {
            // show the mill first, then take the stone
            const b = s.b.slice(); if (m.f >= 0) b[m.f] = 0; b[m.t] = p;
            pending = { f: m.f, t: m.t, b }; anim = { f: m.f, t: m.t, r: -1 }; render(); V.sfx.place();
            ctx.status('<span class="c' + p + '">KI</span> hat eine <b style="color:var(--cy)">Mühle</b>');
            ctx.later(() => { pending = null; doMove(m, true); }, 850);
          } else doMove(m);
        }, 300);
      }
      next();
    }
  });
})();
