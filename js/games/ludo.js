(function () {
  // Ludo on an 11x11 cross: 40 track fields, a yard of four in each corner and four home fields per colour.
  // Player 1 (you) starts at the bottom; the others follow clockwise in turn order.
  // Every action is a move: 'r' = roll the die, 0-3 = move that piece. The die draws from ctx.rng, so at an
  // online table all browsers see the same numbers.
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
  const CLR = { 1: '#ff3fbf', 2: '#ffc61a', 3: '#1fc8e6', 4: '#2fd673' };
  // piece position: -1 = yard, 0..39 = steps from its own start, 40..43 = home lane
  const abs = (start, p) => (start + p) % 40;

  V.css(`
  .ludo{width:min(var(--bw),600px);aspect-ratio:1;position:relative;display:grid;grid-template-columns:repeat(11,minmax(0,1fr));grid-template-rows:repeat(11,minmax(0,1fr));gap:2px;padding:8px;border-radius:14px;user-select:none}
  .ludo .zone{position:absolute;border-radius:16%;background:color-mix(in srgb,var(--fc) 34%,transparent);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--fc) 70%,#5d3a1c),inset 0 2px 8px rgba(0,0,0,.25);pointer-events:none}
  .ludo .zone.off{--fc:#8a6a45!important;opacity:.45}
  .ludo .f{position:relative;border-radius:50%;margin:7%;background:radial-gradient(circle at 40% 35%,#fffaf0,#efe2c8 70%);box-shadow:inset 0 -2px 3px rgba(90,52,20,.35),0 1px 0 rgba(255,255,255,.5),0 0 0 2px #7b532c}
  .ludo .f.st{background:radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--fc) 55%,#fff),var(--fc) 75%);box-shadow:inset 0 -2px 3px rgba(0,0,0,.3),0 0 0 2px color-mix(in srgb,var(--fc) 60%,#3a2410)}
  .ludo .f.st::after{content:'';position:absolute;inset:30%;border-radius:50%;border:2px solid rgba(255,255,255,.75);border-top-color:transparent;transform:rotate(45deg)}
  .ludo .f.hm{background:radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--fc) 35%,#fff),color-mix(in srgb,var(--fc) 75%,#fff) 80%);box-shadow:inset 0 -2px 3px rgba(0,0,0,.25),0 0 0 2px color-mix(in srgb,var(--fc) 70%,#3a2410)}
  .ludo .f.yd{background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.55),color-mix(in srgb,var(--fc) 40%,#fff) 80%);box-shadow:inset 0 2px 4px rgba(0,0,0,.3),0 0 0 2px color-mix(in srgb,var(--fc) 60%,#3a2410)}
  .ludo .f.off{opacity:.45;filter:grayscale(.8)}
  .ludo .mid{grid-column:6;grid-row:6;position:relative;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 50% 45%,#2f6b45,#1d4a2f 70%);box-shadow:inset 0 3px 10px rgba(0,0,0,.55),0 0 0 3px #5d3a1c;z-index:2;margin:-14%}
  .ludo .mid .die3w{--ds:clamp(22px,6.4cqw,40px)}
  .ludo{container-type:inline-size}
  .ludo .tries{position:absolute;left:50%;top:calc(100% + 3px);transform:translateX(-50%);white-space:nowrap;font:800 italic 10px/1 var(--f-d);letter-spacing:.1em;color:#fff;text-transform:uppercase;padding:2px 5px;border-radius:4px;background:#5d3a1c;z-index:5}
  .ludo .tries:empty{display:none}
  .ludo .pc{position:absolute;width:calc((100% - 36px) / 11);aspect-ratio:1;left:8px;top:8px;display:grid;place-items:center;transition:transform .16s var(--ease);z-index:3;pointer-events:none}
  .ludo .pc .pawn{width:66%;transform:translateY(-20%);transition:transform .15s}
  .ludo .pc.hop .pawn{transform:translateY(-48%) scale(1.08)}
  .ludo .pc.can{pointer-events:auto;cursor:pointer;z-index:4}
  .ludo .pc.can::before{content:'';position:absolute;inset:2%;border-radius:50%;border:3px dashed #fff;box-shadow:0 0 12px #fff;animation:ldspin 3s linear infinite}
  .ludo .pc.can .pawn{animation:ldbob .8s ease-in-out infinite}
  @keyframes ldspin{to{transform:rotate(360deg)}}
  @keyframes ldbob{50%{transform:translateY(-34%)}}`);

  V.register({
    id: 'ludo', name: 'Ludo', cat: 'Brettspiele', order: 1, accent: '#e0a458', party: true, noFirst: true,
    short: 'Wie Mensch ärgere dich nicht. Bis zu 4.',
    desc: 'Der Klassiker wie Mensch ärgere dich nicht: Würfle und bring deine vier Figuren einmal ums Brett ins Ziel. Landest du auf einer fremden Figur, muss sie zurück. Für 2 bis 4 Spieler am Gerät oder online, freie Plätze übernimmt die KI.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Zieht irgendeine Figur.', 'Wirft raus, wenn es geht, sonst einfach vorwärts.', 'Wirft raus, bringt Figuren in Sicherheit und meidet Gefahr.', 'Wägt jeden Zug genau ab: Risiko, Fortschritt und wen es trifft.'],
    keys: [['Leertaste', 'Würfeln'], ['1–4', 'Figur wählen'], ['Pfeile', 'Cursor über die Figuren'], ['Enter', 'Figur ziehen']],
    options: [{ id: 'n', label: 'Spieler', def: 4, choices: [[2, '2'], [3, '3'], [4, '4']] }],
    localHint: 'Ihr spielt reihum am selben Gerät, jeder mit seiner Farbe.',
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="7" fill="#d4a56a" stroke="#5d3a1c" stroke-width="2.5"/><path d="M19 6h10v13h13v10H29v13H19V29H6V19h13z" fill="#f3e6cc"/><rect x="5" y="5" width="11" height="11" rx="3" fill="#ff3fbf" opacity=".8"/><rect x="32" y="5" width="11" height="11" rx="3" fill="#ffc61a" opacity=".85"/><rect x="32" y="32" width="11" height="11" rx="3" fill="#2fd673" opacity=".8"/><rect x="5" y="32" width="11" height="11" rx="3" fill="#1fc8e6" opacity=".8"/><circle cx="24" cy="24" r="6" fill="#1d4a2f"/><rect x="21" y="21" width="6" height="6" rx="1.4" fill="#fff"/><path d="M12 26c0-2 1.3-3 2.6-3.6l.7-3c-1.6-.7-2.2-2-1.9-3.2.3-1.8 1.5-2.8 2.8-2.8s2.5 1 2.8 2.8c.3 1.2-.3 2.5-1.9 3.2l.7 3c1.3.6 2.6 1.6 2.6 3.6z" fill="#ff3fbf" stroke="#5a0f4a" stroke-width=".8"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Wie bei Mensch ärgere dich nicht hat jeder <b>vier Figuren</b> in seiner Ecke. Bring alle vier einmal im Uhrzeigersinn ums Brett und dann in deine <b>vier Zielfelder</b> zur Mitte hin. Wer das zuerst schafft, gewinnt.' },
      { t: 'Würfeln und rausgehen', d: 'Tippe auf den <b>Würfel</b> in der Mitte. Nur mit einer <b>6</b> kommt eine Figur aus der Ecke auf dein Startfeld, und das musst du dann auch machen. Nach einer 6 darfst du nochmal würfeln. Steht keine Figur draußen, hast du <b>drei Versuche</b> für eine 6.' },
      { t: 'Ziehen', d: 'Danach hüpfen die Figuren, die ziehen dürfen. Tippe eine an. Geht nur eine, zieht sie von selbst. Auf ein Feld mit einer <b>eigenen</b> Figur darfst du nicht.' },
      { t: 'Rauswerfen', d: 'Landest du genau auf einer <b>fremden Figur</b>, muss sie zurück in ihre Ecke. Deshalb ist es gefährlich, 1 bis 6 Felder vor einem Gegner zu stehen.' },
      { t: 'Ins Ziel', d: 'Am Ende der Runde biegst du in deine Zielfelder ab. Dort brauchst du die <b>genaue Augenzahl</b>, über das letzte Feld hinaus geht es nicht. In den Zielfeldern kann dich niemand mehr rauswerfen.' },
      { t: 'Online', d: 'Unter <b>Online</b> eröffnest du einen Tisch, lädst Freunde ein oder teilst den Tischcode. Freie Plätze spielt die KI. Geht jemand mitten im Spiel, übernimmt die KI seine Figuren.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, seat = {};
      P.forEach((p, k) => { seat[p] = SEATS[N][k]; });
      const pieces = {}; P.forEach(p => { pieces[p] = [-1, -1, -1, -1]; });
      let turn = 1, die = 0, tries = 0, phase = 'roll', over = false, moves = [];
      const board = V.el('div', 'ludo wood');
      const owner = {}; P.forEach(p => { owner[seat[p]] = p; });
      const put = (x, y, cls, fc) => { const f = V.el('div', 'f ' + cls); f.style.gridColumn = x + 1; f.style.gridRow = y + 1; if (fc) f.style.setProperty('--fc', fc); board.appendChild(f); return f; };
      // coloured corner zones behind the yards
      const cell = 'calc((100% - 36px) / 11)';
      [[0, 0, 0], [10, 9, 0], [20, 9, 9], [30, 0, 9]].forEach(([st, x, y]) => {
        const z = V.el('div', 'zone' + (owner[st] ? '' : ' off'));
        z.style.cssText = `--fc:${owner[st] ? CLR[owner[st]] : '#8a6a45'};left:calc(8px + ${x} * (${cell} + 2px) - 3px);top:calc(8px + ${y} * (${cell} + 2px) - 3px);width:calc(2 * ${cell} + 8px);height:calc(2 * ${cell} + 8px)`;
        board.appendChild(z);
      });
      TRACK.forEach(([x, y], i) => { const o = owner[i]; put(x, y, o ? 'st' : '', o ? CLR[o] : ''); });
      [0, 10, 20, 30].forEach(st => {
        const o = owner[st], c = o ? CLR[o] : '#8a6a45';
        SEAT[st].home.forEach(([x, y]) => put(x, y, 'hm' + (o ? '' : ' off'), c));
        SEAT[st].yard.forEach(([x, y]) => put(x, y, 'yd' + (o ? '' : ' off'), c));
      });
      const mid = V.el('div', 'mid'), dice = V.die(), triesEl = V.el('span', 'tries');
      mid.append(dice.el, triesEl); board.appendChild(mid);
      ctx.stage.appendChild(board);
      const pel = {};
      P.forEach(p => { pel[p] = [0, 1, 2, 3].map(k => { const e = V.el('div', 'pc', V.pawn(CLR[p])); e.dataset.k = k; e.dataset.p = p; board.appendChild(e); return e; }); });
      const xy = (p, k, pos) => pos < 0 ? SEAT[seat[p]].yard[k] : pos >= 40 ? SEAT[seat[p]].home[pos - 40] : TRACK[abs(seat[p], pos)];
      function place(p, k, anim) {
        const [x, y] = xy(p, k, pieces[p][k]), e = pel[p][k];
        e.style.transition = anim === false ? 'none' : '';
        e.style.transform = `translate(calc(${x} * (100% + 2px)), calc(${y} * (100% + 2px)))`;
        e.style.zIndex = 3 + y;
      }
      P.forEach(p => [0, 1, 2, 3].forEach(k => place(p, k, false)));
      // who stands on track field a (absolute)?
      function at(a) { for (const p of P) for (let k = 0; k < 4; k++) { const q = pieces[p][k]; if (q >= 0 && q < 40 && abs(seat[p], q) === a) return { p, k }; } return null; }
      function legal(p, d) {
        const me = pieces[p], out = [];
        const onStart = at(seat[p]);
        // a 6 with pieces in the yard and a free start field: one of them must come out
        if (d === 6 && !(onStart && onStart.p === p) && me.some(q => q < 0)) {
          const k = me.indexOf(-1);
          return [{ k, to: 0, hit: onStart }];
        }
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
      // without a piece on the track (and none that could move in the home lane): three tries for a 6
      const stuck = p => !onBoard(p) && ![1, 2, 3, 4, 5].some(d => legal(p, d).length);
      const done = p => pieces[p].every(q => q >= 40);
      const human = () => !over && !ctx.isAI(turn);

      function begin(p) {
        turn = p; phase = 'roll'; tries = stuck(p) ? 3 : 1;
        P.forEach(q => pel[q].forEach(e => e.classList.remove('can')));
        dice.color(CLR[p]);
        triesEl.textContent = tries > 1 ? '3 Versuche' : '';
        ctx.turn(p);
        ask();
      }
      // next action of the player on turn: the human taps, the AI and remote players go through ctx.aiTurn
      function ask() {
        if (over) return;
        if (!ctx.isAI(turn)) {
          dice.state(phase === 'roll' ? 'wait' : 'off');
          if (phase === 'move') {
            if (moves.length === 1) { ctx.status(`${ctx.who(turn)} würfelt ${die}`); return ctx.later(() => { if (phase === 'move' && human()) act(moves[0]); }, 450); }
            ctx.status(`${ctx.who(turn)} würfelt ${die} · Figur wählen`);
            moves.forEach(m => pel[turn][m.k].classList.add('can'));
          }
          V.nav.refresh();
          return;
        }
        dice.state('off');
        const s = turn;
        ctx.aiTurn({
          side: s, quick: true,
          think: () => ({ move: phase === 'roll' ? 'r' : pickAI(moves) }),
          targets: m => [m === 'r' ? dice.el : pel[s][m.k]],
          decoys: () => phase === 'move' ? moves.map(m => pel[s][m.k]) : [],
          apply: act,
          decode: raw => phase === 'roll' ? (raw === 'r' ? 'r' : null) : (moves.find(m => m.k === raw) || null),
          say: m => m === 'r' ? '' : m.hit ? 'Raus mit dir!' : m.to === 0 ? 'Raus aus der Ecke' : m.to >= 40 ? 'Ins Ziel' : die + ' Felder'
        });
      }
      function act(a) {
        if (over) return;
        if (a === 'r') { if (phase !== 'roll') return; ctx.moved(turn, 'r'); return roll(); }
        if (phase !== 'move') return;
        ctx.moved(turn, a.k); move(a);
      }
      function roll() {
        phase = 'rolling'; dice.state('off');
        die = 1 + Math.floor(ctx.rng() * 6);
        dice.show(die, true); V.sfx.tick();
        ctx.later(() => {
          V.sfx.move();
          tries--;
          moves = legal(turn, die);
          if (!moves.length) {
            if (tries > 0) {
              phase = 'roll'; triesEl.textContent = tries === 1 ? 'Letzter Versuch' : tries + ' Versuche';
              ctx.status(`${ctx.who(turn)}: ${die}, keine 6`);
              return ctx.later(ask, ctx.isAI(turn) ? 300 : 0);
            }
            ctx.status(`${ctx.who(turn)} würfelt ${die} und kann nicht ziehen`);
            return ctx.later(nextPlayer, ctx.fast() ? 60 : 800);
          }
          triesEl.textContent = '';
          phase = 'move';
          ask();
        }, V.fxOn() && !ctx.fast() ? 650 : 60);
      }
      board.addEventListener('click', e => {
        if (!human()) return;
        if (e.target.closest('.die3w')) { if (phase === 'roll') act('r'); return; }
        const pc = e.target.closest('.pc.can'); if (!pc || phase !== 'move') return;
        const m = moves.find(x => x.k === +pc.dataset.k); if (m) act(m);
      });
      ctx.nav(() => human() && phase === 'move' ? moves.map(m => pel[turn][m.k]) : [], { pad: 0, round: true });
      ctx.keys(e => {
        if (!human()) return false;
        if ((e.key === ' ' || e.key === 'Enter') && phase === 'roll' && !V.nav.active) { if (!e.repeat) act('r'); return true; }
        if (/^[1-4]$/.test(e.key) && phase === 'move') { const m = moves.find(x => x.k === +e.key - 1); if (m) act(m); return true; }
        return false;
      });
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
        phase = 'anim';
        P.forEach(q => pel[q].forEach(e => e.classList.remove('can')));
        const p = turn, from = pieces[p][m.k], e = pel[p][m.k];
        const steps = from < 0 ? [0] : Array.from({ length: m.to - from }, (_, i) => from + i + 1);
        const hop = V.fxOn() && !ctx.fast() ? 150 : 30;
        steps.forEach((pos, i) => ctx.later(() => {
          pieces[p][m.k] = pos; place(p, m.k);
          e.classList.add('hop'); ctx.later(() => e.classList.remove('hop'), 90);
          V.sfx.tick();
        }, i * hop));
        ctx.later(() => {
          if (m.hit) {
            pieces[m.hit.p][m.hit.k] = -1; place(m.hit.p, m.hit.k);
            V.sfx.hit(); V.fx.burstAt(e, CLR[p], 16, 80); V.fx.shake(board, true);
            ctx.status(`${ctx.who(p)} wirft ${ctx.who(m.hit.p)} raus!`);
          } else V.sfx.place();
          if (m.to >= 40 && from < 40) { V.fx.ringAt(e, CLR[p]); V.sfx.goal(); }
          if (done(p)) { over = true; return ctx.end(p, `${ctx.name(p)} hat alle Figuren im Ziel`); }
          if (die === 6) {
            return ctx.later(() => {
              phase = 'roll'; tries = 1;
              ctx.status(ctx.isAI(p) ? `${ctx.who(p)} darf nochmal` : `${ctx.who(p)}: 6 gewürfelt, nochmal!`);
              ask();
            }, ctx.fast() ? 30 : 300);
          }
          ctx.later(nextPlayer, ctx.fast() ? 30 : 380);
        }, steps.length * hop + 60);
      }
      function nextPlayer() { begin(P[(P.indexOf(turn) + 1) % N]); }
      begin(1);
    }
  });
})();
