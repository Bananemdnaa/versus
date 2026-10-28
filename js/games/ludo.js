(function () {
  // Ludo on an 11x11 cross: 40 track fields, a yard of four in each corner and four home fields per colour.
  // Player 1 (you) starts at the bottom; the others follow clockwise in turn order.
  const TRACK = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
    [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10], [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]];
  // per seat (index of its start field on TRACK): home lane and yard
  const SEAT = {
    0: { home: [[1, 5], [2, 5], [3, 5], [4, 5]], yard: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    10: { home: [[5, 1], [5, 2], [5, 3], [5, 4]], yard: [[9, 0], [10, 0], [9, 1], [10, 1]] },
    20: { home: [[9, 5], [8, 5], [7, 5], [6, 5]], yard: [[9, 9], [10, 9], [9, 10], [10, 10]] },
    30: { home: [[5, 9], [5, 8], [5, 7], [5, 6]], yard: [[0, 9], [1, 9], [0, 10], [1, 10]] }
  };
  const SEATS = { 2: [30, 10], 3: [30, 0, 10], 4: [30, 0, 10, 20] };
  const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
  // piece position: -1 = yard, 0..39 = steps from its own start, 40..43 = home lane
  const abs = (start, p) => (start + p) % 40;

  V.css(`
  .ludo{width:min(var(--bw),600px);aspect-ratio:1;position:relative;display:grid;grid-template-columns:repeat(11,minmax(0,1fr));grid-template-rows:repeat(11,minmax(0,1fr));gap:2px;padding:8px;background:linear-gradient(150deg,#161a2e,#10121f);border:1px solid var(--line2);border-radius:12px;box-shadow:0 0 50px -20px var(--cyan);user-select:none}
  .ludo .f{border-radius:50%;background:#252a44;border:2px solid #343a5e;margin:6%}
  .ludo .f.st{border-color:var(--fc);background:color-mix(in srgb,var(--fc) 30%,#252a44)}
  .ludo .f.hm{border-color:color-mix(in srgb,var(--fc) 70%,transparent);background:color-mix(in srgb,var(--fc) 22%,#1b1f33)}
  .ludo .f.yd{border-color:color-mix(in srgb,var(--fc) 50%,transparent);background:color-mix(in srgb,var(--fc) 10%,#141728)}
  .ludo .f.off{opacity:.25}
  .ludo .pc{position:absolute;width:calc((100% - 36px) / 11);aspect-ratio:1;left:8px;top:8px;display:grid;place-items:center;transition:transform .14s var(--ease);z-index:2;pointer-events:none}
  .ludo .pc i{width:62%;height:62%;border-radius:50% 50% 45% 45%;background:radial-gradient(circle at 35% 30%,#fff 0,var(--pc) 45%,color-mix(in srgb,var(--pc) 55%,#000) 100%);box-shadow:0 3px 0 color-mix(in srgb,var(--pc) 40%,#000),0 0 10px color-mix(in srgb,var(--pc) 50%,transparent);transition:transform .14s}
  .ludo .pc.hop i{transform:translateY(-22%) scale(1.08)}
  .ludo .pc.can{pointer-events:auto;cursor:pointer;z-index:3}
  .ludo .pc.can::before{content:'';position:absolute;inset:4%;border-radius:50%;border:2px dashed var(--pc);animation:ldspin 3s linear infinite}
  @keyframes ldspin{to{transform:rotate(360deg)}}
  .ludo .die{grid-column:6;grid-row:6;align-self:center;justify-self:center;width:118%;height:118%;border-radius:18%;background:#f3f4ff;border:3px solid var(--dc,var(--pink));box-shadow:0 4px 0 #9ca2cc,0 0 22px -4px var(--dc,var(--pink));display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:14%;cursor:pointer;z-index:4;position:relative}
  .ludo .die b{grid-area:auto;width:70%;height:70%;border-radius:50%;background:var(--ink);place-self:center;visibility:hidden}
  .ludo .die b.on{visibility:visible}
  .ludo .die.idle b.on{opacity:.16}
  .ludo .die.roll{animation:ldroll .45s var(--ease)}
  @keyframes ldroll{0%{transform:rotate(0) scale(1)}40%{transform:rotate(200deg) scale(1.2)}to{transform:rotate(360deg) scale(1)}}
  .ludo .die.wait{animation:ldwait 1.1s ease-in-out infinite}
  @keyframes ldwait{50%{box-shadow:0 4px 0 #9ca2cc,0 0 34px 2px var(--dc)}}
  .ludo .die.off{cursor:default;opacity:.85}
  .ludo .tries{position:absolute;left:50%;top:calc(100% + 4px);transform:translateX(-50%);white-space:nowrap;font:700 italic 11px/1 var(--f-d);letter-spacing:.1em;color:var(--muted);text-transform:uppercase}`);
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  V.register({
    id: 'ludo', name: 'Ludo', cat: 'Klassiker', order: 6, accent: 'var(--cyan)', party: true, noFirst: true,
    short: 'Würfeln, rausgehen, rauswerfen. Bis zu 4.',
    desc: 'Würfle und bring deine vier Figuren einmal ums Brett ins Ziel. Landest du auf einer fremden Figur, muss sie zurück. Für 2 bis 4 Spieler, freie Plätze übernimmt die KI.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Zieht irgendeine Figur.', 'Wirft raus, wenn es geht, sonst einfach vorwärts.', 'Wirft raus, bringt Figuren in Sicherheit und meidet Gefahr.', 'Wägt jeden Zug genau ab: Risiko, Fortschritt und wen es trifft.'],
    keys: [['Leertaste', 'Würfeln'], ['1–4', 'Figur wählen'], ['Pfeile', 'Cursor über die Figuren'], ['Enter', 'Figur ziehen']],
    options: [{ id: 'n', label: 'Spieler', def: 4, choices: [[2, '2'], [3, '3'], [4, '4']] }],
    localHint: 'Ihr spielt reihum am selben Gerät, jeder mit seiner Farbe.',
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="7" fill="#161a2e" stroke="#373d66" stroke-width="2"/><path d="M19 5h10v14h14v10H29v14H19V29H5V19h14z" fill="#252a44"/><circle cx="11" cy="11" r="4" fill="#ff4fd8"/><circle cx="37" cy="11" r="4" fill="#ffd84f"/><circle cx="37" cy="37" r="4" fill="#5dff9d"/><circle cx="11" cy="37" r="4" fill="#62f0ff"/><rect x="19" y="19" width="10" height="10" rx="2.5" fill="#f3f4ff"/><circle cx="22" cy="22" r="1.3" fill="#08090f"/><circle cx="26" cy="26" r="1.3" fill="#08090f"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder hat <b>vier Figuren</b> in seiner Ecke. Bring alle vier einmal im Uhrzeigersinn ums Brett und dann in deine <b>vier Zielfelder</b> in der Mitte. Wer das zuerst schafft, gewinnt.' },
      { t: 'Würfeln und rausgehen', d: 'Tippe auf den <b>Würfel</b> in der Mitte. Nur mit einer <b>6</b> kommt eine Figur aus der Ecke auf dein Startfeld, und das musst du dann auch machen. Nach einer 6 darfst du nochmal würfeln. Steht keine Figur draußen, hast du <b>drei Versuche</b> für eine 6.' },
      { t: 'Ziehen', d: 'Danach leuchten die Figuren, die ziehen dürfen. Tippe eine an. Geht nur eine, zieht sie von selbst. Auf ein Feld mit einer <b>eigenen</b> Figur darfst du nicht.' },
      { t: 'Rauswerfen', d: 'Landest du genau auf einer <b>fremden Figur</b>, muss sie zurück in ihre Ecke. Deshalb ist es gefährlich, 1 bis 6 Felder vor einem Gegner zu stehen.' },
      { t: 'Ins Ziel', d: 'Am Ende der Runde biegst du in deine Zielfelder ab. Dort brauchst du die <b>genaue Augenzahl</b>, über das letzte Feld hinaus geht es nicht. In den Zielfeldern kann dich niemand mehr rauswerfen.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, seat = {};
      P.forEach((p, k) => { seat[p] = SEATS[N][k]; });
      const pieces = {}; P.forEach(p => { pieces[p] = [-1, -1, -1, -1]; });
      let turn = 1, die = 0, tries = 0, phase = 'roll', over = false, paused = false;
      const board = V.el('div', 'ludo');
      const cellAt = {};
      const put = (x, y, cls, fc) => { const f = V.el('div', 'f ' + cls); f.style.gridColumn = x + 1; f.style.gridRow = y + 1; if (fc) f.style.setProperty('--fc', fc); board.appendChild(f); cellAt[x + ',' + y] = f; return f; };
      const owner = {}; P.forEach(p => { owner[seat[p]] = p; });
      TRACK.forEach(([x, y], i) => { const o = owner[i]; put(x, y, o ? 'st' : '', o ? CLR[o] : ''); });
      [0, 10, 20, 30].forEach(st => {
        const o = owner[st], c = o ? CLR[o] : '#4a4f74';
        SEAT[st].home.forEach(([x, y]) => put(x, y, 'hm' + (o ? '' : ' off'), c));
        SEAT[st].yard.forEach(([x, y]) => put(x, y, 'yd' + (o ? '' : ' off'), c));
      });
      const dieEl = V.el('button', 'die', '<b></b>'.repeat(9)); dieEl.setAttribute('aria-label', 'Würfeln');
      const triesEl = V.el('span', 'tries'); dieEl.appendChild(triesEl);
      board.appendChild(dieEl);
      ctx.stage.appendChild(board);
      // piece elements
      const pel = {};
      P.forEach(p => { pel[p] = [0, 1, 2, 3].map(k => { const e = V.el('div', 'pc', '<i></i>'); e.style.setProperty('--pc', CLR[p]); e.dataset.p = p; e.dataset.k = k; board.appendChild(e); return e; }); });
      const xy = (p, k, pos) => pos < 0 ? SEAT[seat[p]].yard[k] : pos >= 40 ? SEAT[seat[p]].home[pos - 40] : TRACK[abs(seat[p], pos)];
      function place(p, k, anim) {
        const [x, y] = xy(p, k, pieces[p][k]), e = pel[p][k];
        e.style.transition = anim === false ? 'none' : '';
        e.style.transform = `translate(calc(${x} * (100% + 2px)), calc(${y} * (100% + 2px)))`;
      }
      function placeAll(anim) { P.forEach(p => [0, 1, 2, 3].forEach(k => place(p, k, anim))); }
      placeAll(false);
      function showDie(v, who) {
        [...dieEl.querySelectorAll('b')].forEach((b, i) => b.classList.toggle('on', PIPS[v || 5].includes(i)));
        dieEl.classList.toggle('idle', !v);
        dieEl.style.setProperty('--dc', CLR[who]);
      }
      // who stands on track field a (absolute)?
      function at(a) { for (const p of P) for (let k = 0; k < 4; k++) { const q = pieces[p][k]; if (q >= 0 && q < 40 && abs(seat[p], q) === a) return { p, k }; } return null; }
      function legal(p, d) {
        const me = pieces[p], out = [];
        const startFree = !(at(seat[p]) && at(seat[p]).p === p);
        if (d === 6 && startFree && me.some(q => q < 0)) return me.map((q, k) => q < 0 ? k : -1).filter(k => k >= 0).slice(0, 1).map(k => ({ k, to: 0 }));
        me.forEach((q, k) => {
          if (q < 0) return;
          const to = q + d; if (to > 43) return;
          if (to >= 40) { if (me.some((r, j) => j !== k && r === to)) return; return out.push({ k, to }); }
          const o = at(abs(seat[p], to)); if (o && o.p === p) return;
          out.push({ k, to, hit: o });
        });
        return out;
      }
      const onBoard = p => pieces[p].some(q => q >= 0 && q < 40);
      // can the player still move without a 6? (otherwise three tries)
      const stuck = p => !onBoard(p) && ![1, 2, 3, 4, 5].some(d => legal(p, d).length);
      const done = p => pieces[p].every(q => q >= 40);
      const human = () => !over && !paused && !ctx.isAI(turn);

      function begin(p) {
        turn = p; phase = 'roll'; tries = stuck(p) ? 3 : 1; die = 0;
        P.forEach(q => pel[q].forEach(e => e.classList.remove('can')));
        showDie(0, p);
        ctx.turn(p);
        triesEl.textContent = tries > 1 ? '3 Versuche' : '';
        dieEl.classList.toggle('off', ctx.isAI(p)); dieEl.classList.toggle('wait', !ctx.isAI(p));
        if (ctx.isAI(p)) ctx.later(roll, 420);
      }
      function roll() {
        if (over || paused || phase !== 'roll') return;
        phase = 'rolling'; dieEl.classList.remove('wait');
        die = 1 + V.rand(6);
        if (V.fxOn()) { V.fx.pop(dieEl, 'roll'); let n = 0; const spin = () => { if (n++ < 5) { showDie(1 + V.rand(6), turn); ctx.later(spin, 70); } }; spin(); }
        V.sfx.tick();
        ctx.later(() => {
          showDie(die, turn); V.sfx.move();
          tries--;
          const ms = legal(turn, die);
          if (!ms.length) {
            if (tries > 0) { phase = 'roll'; triesEl.textContent = tries === 1 ? 'Letzter Versuch' : tries + ' Versuche'; if (ctx.isAI(turn)) ctx.later(roll, 520); else { dieEl.classList.add('wait'); ctx.status(`${ctx.who(turn)}: keine 6, nochmal`); } return; }
            ctx.status(`${ctx.who(turn)} kann nicht ziehen`);
            return ctx.later(() => nextPlayer(), 850);
          }
          triesEl.textContent = '';
          phase = 'move';
          if (ctx.isAI(turn)) return aiMove(ms);
          if (ms.length === 1) { ctx.status(`${ctx.who(turn)} würfelt ${die}`); return ctx.later(() => move(ms[0]), 420); }
          ctx.status(`${ctx.who(turn)} würfelt ${die} · Figur wählen`);
          ms.forEach(m => pel[turn][m.k].classList.add('can'));
          ctx.nav(() => phase === 'move' && human() ? ms.map(m => pel[turn][m.k]) : [], { pad: 0, round: true });
          V.nav.refresh();
        }, V.fxOn() ? 420 : 60);
      }
      board.addEventListener('click', e => {
        if (!human()) return;
        if (e.target.closest('.die')) { if (phase === 'roll') roll(); return; }
        const pc = e.target.closest('.pc.can'); if (!pc || phase !== 'move') return;
        const m = legal(turn, die).find(x => x.k === +pc.dataset.k); if (m) move(m);
      });
      ctx.keys(e => {
        if (!human()) return false;
        if ((e.key === ' ' || e.key === 'Enter') && phase === 'roll' && !V.nav.active) { if (!e.repeat) roll(); return true; }
        if (/^[1-4]$/.test(e.key) && phase === 'move') { const m = legal(turn, die).find(x => x.k === +e.key - 1); if (m) move(m); return true; }
        return false;
      });
      function aiMove(ms) {
        ctx.aiTurn({
          side: turn,
          quick: true,
          think: () => ({ move: pickAI(ms) }),
          targets: m => [pel[turn][m.k]],
          decoys: () => ms.map(m => pel[turn][m.k]),
          apply: move,
          say: m => m.hit ? 'Raus mit dir!' : m.to === 0 ? 'Raus aus der Ecke' : m.to >= 40 ? 'Ins Ziel' : die + ' Felder'
        });
      }
      // danger: how many enemy pieces stand 1-6 fields behind track field a
      function danger(a, p) {
        let n = 0;
        for (const q of P) if (q !== p) for (const r of pieces[q]) if (r >= 0 && r < 40) { const d = (a - abs(seat[q], r) + 40) % 40; if (d >= 1 && d <= 6) n++; }
        return n;
      }
      function pickAI(ms) {
        const L = ctx.level;
        if (L === 0 || ms.length === 1) return V.pick(ms);
        if (L === 1) return ms.find(m => m.hit) || ms.find(m => m.to === 0) || ms.reduce((a, b) => (b.to > a.to ? b : a));
        const sc = ms.map(m => {
          const q = pieces[turn][m.k]; let v = m.to - Math.max(q, 0);
          if (m.hit) v += 40 + (L === 3 ? pieces[m.hit.p][m.hit.k] * 0.8 : 10);
          if (m.to === 0) v += 30;
          if (m.to >= 40 && q < 40) v += 28;
          if (q >= 0 && q < 40) v += danger(abs(seat[turn], q), turn) * (L === 3 ? 9 + q * 0.3 : 9);
          if (m.to < 40) v -= danger(abs(seat[turn], m.to), turn) * (L === 3 ? 11 + m.to * 0.35 : 10);
          if (m.to < 40 && P.some(o => o !== turn && abs(seat[o], 0) === abs(seat[turn], m.to) && pieces[o].some(r => r < 0))) v -= 14;
          return { m, v: v + Math.random() * (L === 2 ? 4 : 0.5) };
        });
        return sc.reduce((a, b) => (b.v > a.v ? b : a)).m;
      }
      function move(m) {
        if (phase !== 'move') return;
        phase = 'anim';
        P.forEach(q => pel[q].forEach(e => e.classList.remove('can')));
        ctx.nav(() => []);
        const p = turn, from = pieces[p][m.k], e = pel[p][m.k];
        const steps = from < 0 ? [0] : Array.from({ length: m.to - from }, (_, i) => from + i + 1);
        steps.forEach((pos, i) => ctx.later(() => {
          pieces[p][m.k] = pos; place(p, m.k);
          e.classList.add('hop'); ctx.later(() => e.classList.remove('hop'), 90);
          V.sfx.tick();
        }, i * 150));
        ctx.later(() => {
          if (m.hit) {
            pieces[m.hit.p][m.hit.k] = -1; place(m.hit.p, m.hit.k);
            V.sfx.hit(); V.fx.burstAt(e, V.hex(p), 16, 80); V.fx.shake(board, true);
            ctx.status(`${ctx.who(p)} wirft ${ctx.who(m.hit.p)} raus!`);
          } else V.sfx.place();
          if (m.to >= 40 && from < 40) { V.fx.ringAt(e, V.hex(p)); V.sfx.goal(); }
          if (done(p)) { over = true; return ctx.end(p, `${ctx.name(p)} hat alle Figuren im Ziel`); }
          if (die === 6) { ctx.later(() => { phase = 'roll'; tries = 1; showDie(0, p); if (ctx.isAI(p)) { ctx.status(`${ctx.who(p)} darf nochmal`); ctx.later(roll, 380); } else { dieEl.classList.add('wait'); ctx.status(`${ctx.who(p)}: 6 gewürfelt, nochmal!`); } }, 300); return; }
          ctx.later(nextPlayer, 380);
        }, steps.length * 150 + 60);
      }
      function nextPlayer() {
        const i = P.indexOf(turn);
        let n = P[(i + 1) % N];
        begin(n);
      }
      begin(1);
      return {
        pause() { paused = true; },
        resume() { paused = false; if (phase === 'roll' && ctx.isAI(turn)) ctx.later(roll, 300); }
      };
    }
  });
})();
