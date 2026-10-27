(function () {
  V.css(`
  .rx{width:min(100%,560px);height:min(66vh,560px);min-height:360px;display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none;touch-action:none}
  .rx .half{flex:1;border-radius:18px;border:2px solid var(--line);background:var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:12px;transition:background .08s,border-color .15s;cursor:pointer;position:relative}
  .rx .half.top{transform:rotate(180deg)}
  .rx .half b{font-family:var(--f-d);font-size:clamp(26px,7vw,44px);line-height:1}
  .rx .half span{color:var(--muted);font-size:14px}
  .rx .half .pts{position:absolute;top:10px;left:14px;font-family:var(--f-d);font-size:13px;letter-spacing:.1em}
  .rx .half.p1 .pts{color:var(--p1)} .rx .half.p2 .pts{color:var(--p2)}
  .rx.wait .half{background:#1c1530;border-color:#3b2f5e}
  .rx.go .half{background:#0f4a32;border-color:var(--good);box-shadow:0 0 40px -10px var(--good)}
  .rx.go .half b{color:var(--good);animation:gob .35s var(--spring)}
  @keyframes gob{from{transform:scale(1.6)}}
  .rx.wait .half b{animation:waitp 1.2s ease-in-out infinite}
  @keyframes waitp{50%{opacity:.55}}
  .rx .half:active{transform:scale(.985)} .rx .half.top:active{transform:rotate(180deg) scale(.985)}
  .rx.fake .half{background:#4a2610;border-color:#ff9f43}
  .rx.fake .half b{color:#ff9f43}
  .rx .half.won{background:#3a1036;border-color:var(--p1)} .rx .half.p2.won{background:#3a3110;border-color:var(--p2)}
  .rx .half.foul{background:#4a1520;border-color:var(--bad)}
  .rx .ai{flex:0 0 auto;padding:14px;cursor:default}
  .rx .ai b{font-size:22px}`);

  V.register({
    id: 'reaction', name: 'Reaktionsduell', cat: 'Action', order: 1, accent: 'var(--good)',
    short: 'Wer bei Grün zuerst tippt.',
    desc: 'Warte auf Grün und tippe so schnell du kannst. Wer zu früh tippt, schenkt dem anderen den Punkt.',
    sides: { 1: 'Unten', 2: 'Oben' },
    noFirst: true, noAI: true,
    keys: [['L', 'Spieler 1 (unten)'], ['A', 'Spieler 2 (oben)']],
    options: [{ id: 'to', label: 'Punkte zum Sieg', def: 3, choices: [[3, '3'], [5, '5'], [7, '7']] }],
    levelInfo: ['Reagiert in etwa 0,5 Sekunden.', 'Reagiert in etwa 0,38 Sekunden.', 'Reagiert in etwa 0,29 Sekunden.', 'Reagiert in etwa 0,22 Sekunden. Fällt auf Finten fast nie rein.'],
    endDelay: 900,
    icon: `<svg viewBox="0 0 48 48" fill="none"><rect x="6" y="3" width="36" height="19" rx="6" fill="#0f4a32" stroke="#5dff9d" stroke-width="2"/><rect x="6" y="26" width="36" height="19" rx="6" fill="#1c1530" stroke="#3b2f5e" stroke-width="2"/><path d="M26 7l-6 8h5l-3 6 7-9h-5z" fill="#5dff9d"/><circle cx="24" cy="35.5" r="4" fill="#ff4fd8"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Beide warten, bis das Feld <b>grün</b> wird. Wer dann zuerst tippt, bekommt den Punkt. Wer zuerst die eingestellten Punkte hat, gewinnt.' },
      { t: 'Zu zweit an einem Gerät', d: 'Legt das Handy flach zwischen euch. Spieler 1 tippt auf die <b>untere Hälfte</b>, Spieler 2 auf die <b>obere</b>, die für ihn richtig herum steht. Am PC drückt Spieler 1 die Taste <b>L</b> und Spieler 2 die Taste <b>A</b>.' },
      { t: 'Nicht zu früh', d: 'Tippst du, bevor es grün ist, bekommt der <b>Gegner den Punkt</b>. Wie lange es dauert, ist jedes Mal anders.' },
      { t: 'Finten', d: 'Manchmal leuchtet das Feld kurz <b>orange</b> und da steht „Nicht tippen!“. Das ist eine Falle. Wer da tippt, verliert den Punkt. Erst bei Grün gilt es.' },
    ],
    start(ctx) {
      const target = ctx.opts.to || 3, ai = ctx.mode === 'ai';
      const human = ai ? 3 - ctx.aiSide : 0;
      const pts = { 1: 0, 2: 0 };
      let phase = 'idle', goAt = 0, timer = null, aiTimer = null, round = 0, paused = false;
      const el = V.el('div', 'rx');
      const halves = {};
      if (ai) {
        halves[ctx.aiSide] = V.el('div', 'half ai p' + ctx.aiSide);
        halves[human] = V.el('div', 'half p' + human);
        el.append(halves[ctx.aiSide], halves[human]);
      } else {
        halves[2] = V.el('div', 'half top p2'); halves[1] = V.el('div', 'half p1');
        el.append(halves[2], halves[1]);
      }
      ctx.stage.appendChild(el);
      const set = (s, big, small) => { halves[s].innerHTML = `<span class="pts">${pts[s]} / ${target}</span><b>${big}</b><span>${small || ''}</span>`; };
      const both = (big, small) => { set(1, big, small); set(2, big, small); };
      const label = s => ai ? (s === human ? 'Du' : 'KI') : ctx.name(s);

      function clear() { clearTimeout(timer); clearTimeout(aiTimer); }
      ctx.onCleanup(clear);
      function ready() {
        if (!ctx.alive()) return;
        clear(); phase = 'ready'; el.className = 'rx';
        Object.values(halves).forEach(h => h.classList.remove('won', 'foul'));
        both('Bereit?', ai ? 'Tippe, wenn du bereit bist' : 'Tippt beide auf eure Hälfte');
        if (ai) set(ctx.aiSide, 'KI', 'wartet');
        ctx.turn(0, `Runde ${round + 1} · Erster mit ${target} Punkten gewinnt`);
        readyMask = {};
        if (ai) readyMask[ctx.aiSide] = true;
      }
      let readyMask = {};
      function arm() {
        phase = 'wait'; el.className = 'rx wait'; round++;
        both('Warten …', 'Noch nicht tippen');
        if (ai) set(ctx.aiSide, 'KI', 'lauert');
        const delay = 1400 + Math.random() * 3200;
        const fake = Math.random() < 0.3 && delay > 2200;
        if (fake) timer = ctx.later(() => {
          phase = 'fake'; el.className = 'rx fake'; both('Nicht tippen!', 'Das ist eine Finte');
          if (ai && Math.random() < [0.25, 0.12, 0.05, 0.01][ctx.level]) aiTimer = ctx.later(() => tap(ctx.aiSide), 180 + Math.random() * 200);
          timer = ctx.later(() => { if (phase === 'fake') { phase = 'wait'; el.className = 'rx wait'; both('Warten …', 'Noch nicht tippen'); timer = ctx.later(go, 700 + Math.random() * 1500); } }, 700);
        }, delay * 0.55);
        else timer = ctx.later(go, delay);
      }
      function go() {
        phase = 'go'; goAt = performance.now(); el.className = 'rx go'; both('JETZT!', 'Tippen!'); V.sfx.go();
        if (ai) {
          const base = [500, 380, 290, 220][ctx.level], rt = base + (Math.random() - 0.3) * [180, 120, 80, 50][ctx.level];
          aiTimer = ctx.later(() => tap(ctx.aiSide), Math.max(140, rt));
        }
      }
      function tap(s) {
        if (paused) return;
        if (phase === 'ready') {
          if (readyMask[s]) return;
          readyMask[s] = true; set(s, 'Bereit', 'Warte auf den anderen'); V.sfx.move();
          if (readyMask[1] && readyMask[2]) ctx.later(arm, 500);
          return;
        }
        if (phase === 'wait' || phase === 'fake') return point(3 - s, s, phase === 'fake' ? 'auf die Finte reingefallen' : 'zu früh getippt');
        if (phase === 'go') return point(s, 0, Math.round(performance.now() - goAt) + ' ms');
      }
      function point(w, fouler, info) {
        clear(); phase = 'done'; pts[w]++;
        el.className = 'rx';
        const cw = V.hex(w);
        if (fouler) { halves[fouler].classList.add('foul'); set(fouler, 'Zu früh!', `${label(fouler)} hat ${info}`); set(w, '+1', 'Punkt geschenkt'); V.sfx.bad(); V.fx.shake(halves[fouler]); }
        else { halves[w].classList.add('won'); set(w, info, `${label(w)} war schneller`); set(3 - w, 'Zu langsam', ''); V.sfx.goal(); V.fx.burstAt(halves[w], cw, 18, 120); V.fx.ringAt(halves[w], cw, 220); }
        V.fx.pop(halves[w].querySelector('b'));
        ctx.status(`<span class="c1">${pts[1]}</span> : <span class="c2">${pts[2]}</span>`);
        if (pts[w] >= target) { ctx.end(w, `${pts[1]} : ${pts[2]} Punkte`); return; }
        timer = ctx.later(ready, 1700);
      }
      Object.entries(halves).forEach(([s, h]) => h.addEventListener('pointerdown', e => { e.preventDefault(); if (!ai || +s === human) tap(+s); }));
      const key = e => {
        if (e.repeat || V.openModalOpen) return;
        if (ai && (e.code === 'Space' || e.key === 'l' || e.key === 'L' || e.key === 'Enter')) { e.preventDefault(); tap(human); }
        if (!ai && (e.key === 'l' || e.key === 'L')) tap(1);
        if (!ai && (e.key === 'a' || e.key === 'A')) tap(2);
      };
      window.addEventListener('keydown', key);
      ctx.onCleanup(() => window.removeEventListener('keydown', key));
      ready();
      return {
        pause() { paused = true; clear(); },
        resume() { paused = false; ready(); }
      };
    }
  });
})();
