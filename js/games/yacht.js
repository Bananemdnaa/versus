(function () {
  // Würfelblock (like Kniffel): 5 dice, up to 3 rolls a turn, keep the dice you like, then fill one of 13 boxes.
  // Moves: { r: mask } rolls every die whose bit is not set in mask (bit i = keep die i), { c: box } scores a box.
  const BOX = [
    ['Einser', '1er'], ['Zweier', '2er'], ['Dreier', '3er'], ['Vierer', '4er'], ['Fünfer', '5er'], ['Sechser', '6er'],
    ['Dreierpasch', '3er-Pasch'], ['Viererpasch', '4er-Pasch'], ['Full House', 'Full House'], ['Kleine Straße', 'Kl. Straße'],
    ['Große Straße', 'Gr. Straße'], ['Fünferpasch', 'Fünfer'], ['Chance', 'Chance']
  ];
  const sum = d => d.reduce((a, b) => a + b, 0);
  const counts = d => { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(x => c[x]++); return c; };
  const run = (d, len) => { const h = new Set(d); for (let s = 1; s + len - 1 <= 6; s++) { let ok = true; for (let k = 0; k < len; k++) if (!h.has(s + k)) ok = false; if (ok) return true; } return false; };
  function score(box, d) {
    const c = counts(d), mx = Math.max(...c);
    if (box < 6) return c[box + 1] * (box + 1);
    switch (box) {
      case 6: return mx >= 3 ? sum(d) : 0;
      case 7: return mx >= 4 ? sum(d) : 0;
      case 8: return (c.includes(3) && c.includes(2)) || mx === 5 ? 25 : 0;
      case 9: return run(d, 4) ? 30 : 0;
      case 10: return run(d, 5) ? 40 : 0;
      case 11: return mx === 5 ? 50 : 0;
      default: return sum(d);
    }
  }
  const upper = sheet => sheet.slice(0, 6).reduce((a, b) => a + (b ?? 0), 0);
  const bonus = sheet => upper(sheet) >= 63 ? 35 : 0;
  const total = sheet => sheet.reduce((a, b) => a + (b ?? 0), 0) + bonus(sheet);
  // what a box is "worth" to the AI: the score minus what that box usually brings, plus the upper bonus chase
  const AVG = [2.1, 5.3, 8.6, 12.2, 15.7, 19.2, 15, 6, 9, 13, 8, 3, 22];
  function worth(sheet, box, d) {
    const s = score(box, d);
    let v = s - AVG[box];
    if (box < 6) { const par = (box + 1) * 3, left = 63 - upper(sheet); if (left > 0) v += (s - par) * 0.6 + (upper(sheet) + s >= 63 ? 20 : 0); }
    if (box === 11 && s) v += 20;
    if (box === 12) v -= 4;
    return v;
  }
  function bestBox(sheet, d) {
    let best = -1, bv = -1e9;
    for (let b = 0; b < 13; b++) if (sheet[b] == null) { const v = worth(sheet, b, d); if (v > bv) { bv = v; best = b; } }
    return { box: best, v: bv };
  }
  // AI: try every keep pattern, simulate the remaining rolls, keep what scores best on average
  function bestKeep(sheet, d, rollsLeft, sims) {
    let best = 0, bv = -1e9;
    for (let mask = 0; mask < 32; mask++) {
      let acc = 0;
      for (let k = 0; k < sims; k++) {
        let x = d.map((v, i) => (mask >> i) & 1 ? v : 1 + Math.floor(Math.random() * 6));
        if (rollsLeft > 1) { const m2 = greedyKeep(sheet, x); x = x.map((v, i) => (m2 >> i) & 1 ? v : 1 + Math.floor(Math.random() * 6)); }
        acc += bestBox(sheet, x).v;
      }
      const v = acc / sims;
      if (v > bv) { bv = v; best = mask; }
    }
    return { mask: best, v: bv };
  }
  // quick rule of thumb used inside the simulation and by the weaker levels
  function greedyKeep(sheet, d) {
    const c = counts(d);
    if (sheet[10] == null || sheet[9] == null) {
      for (const st of [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]]) {
        const have = st.filter(v => c[v] > 0).length;
        if (have >= st.length - 1 && have >= 3) { let m = 0; const used = new Set(); d.forEach((v, i) => { if (st.includes(v) && !used.has(v)) { used.add(v); m |= 1 << i; } }); return m; }
      }
    }
    let face = 6; for (let v = 6; v >= 1; v--) if (c[v] > c[face]) face = v;
    let m = 0; d.forEach((v, i) => { if (v === face) m |= 1 << i; });
    return m;
  }

  V.css(`
  .yz{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:10px;align-items:center}
  .yz-tray{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 10px;border-radius:16px}
  .yz-dice{display:flex;gap:clamp(8px,2.6vw,16px);justify-content:center}
  .yz-dice .die3w{--ds:clamp(38px,11vw,54px);transition:transform .18s var(--spring)}
  .yz-dice .die3w.keep{transform:translateY(-8px)}
  .yz-dice .die3w.keep::after{opacity:1;border-color:#fff;box-shadow:0 0 14px #fff;animation:none}
  .yz-dice .die3w.fresh{opacity:.35}
  .yz-row{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
  .yz-row .hint{margin:0;color:#d9f5e2;font-size:13px}
  .yz-tab{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .yz-tab th,.yz-tab td{padding:4px 6px;text-align:center;border-bottom:1px solid var(--line)}
  .yz-tab th{font:700 italic 12px/1.1 var(--f-d);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .yz-tab th.p{color:var(--pc)} .yz-tab th.p.on{background:color-mix(in srgb,var(--pc) 22%,transparent);color:#fff}
  .yz-tab td.l{text-align:left;color:var(--fg);white-space:nowrap;font-weight:600}
  .yz-tab td.v{font:800 italic 16px/1 var(--f-d);font-variant-numeric:tabular-nums;min-width:36px}
  .yz-tab td.opt{color:var(--cyan);opacity:.55;cursor:pointer;font-weight:600}
  .yz-tab td.opt.zero{color:var(--muted);opacity:.4}
  .yz-tab td.opt:hover,.yz-tab td.opt.kf{opacity:1;background:rgba(98,240,255,.12)}
  .yz-tab td.new{animation:yznew .5s var(--spring);color:var(--good)}
  @keyframes yznew{from{transform:scale(1.8)}}
  .yz-tab tr.sum td{background:var(--panel2);font-weight:700} .yz-tab tr.sum td.l{color:var(--muted)}
  .yz-tab tr.tot td{background:var(--panel3)} .yz-tab tr.tot td.v{font-size:20px}
  .yz-tab tr.gap td{border-bottom:2px solid var(--line2)}
  @media (max-width:520px){.yz-tab{font-size:12px}.yz-tab td,.yz-tab th{padding:3px 3px}.yz-tab td.v{font-size:14px;min-width:28px}}`);

  V.register({
    id: 'yacht', name: 'Würfelblock', cat: 'Brettspiele', order: 5, accent: '#ffd84f', party: true, noFirst: true,
    short: 'Wie Kniffel: würfeln, behalten, eintragen.',
    desc: 'Der Würfelklassiker wie Kniffel: Würfle bis zu dreimal, behalte die passenden Würfel und trag dein Ergebnis in eines von 13 Feldern ein. Wer am Ende die meisten Punkte hat, gewinnt. Für 1 bis 4, am Gerät, gegen die KI oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Behält, was ihm gerade gefällt.', 'Sammelt gleiche Augen und Straßen, plant aber kaum.', 'Rechnet aus, welche Würfel sich zu behalten lohnen.', 'Rechnet gründlich und spielt auf den Bonus.'],
    keys: [['Leertaste', 'Würfeln'], ['1–5', 'Würfel behalten oder freigeben'], ['Pfeile + Enter', 'Feld eintragen']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }],
    localHint: 'Ihr würfelt reihum am selben Gerät, jeder hat seine Spalte auf dem Block.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="4" y="9" width="22" height="22" rx="5" fill="#fff" stroke="#c9c2b2" transform="rotate(-10 15 20)"/><g fill="#15172a" transform="rotate(-10 15 20)"><circle cx="9.5" cy="14.5" r="2"/><circle cx="15" cy="20" r="2"/><circle cx="20.5" cy="25.5" r="2"/></g><rect x="22" y="18" width="22" height="22" rx="5" fill="#ffd84f" stroke="#b9952a" transform="rotate(12 33 29)"/><g fill="#15172a" transform="rotate(12 33 29)"><circle cx="27.5" cy="23.5" r="2"/><circle cx="38.5" cy="23.5" r="2"/><circle cx="27.5" cy="34.5" r="2"/><circle cx="38.5" cy="34.5" r="2"/><circle cx="33" cy="29" r="2"/></g></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Wie bei Kniffel: Jeder hat <b>13 Runden</b>. In jeder Runde würfelst du bis zu dreimal und trägst das Ergebnis in ein freies Feld deiner Spalte ein. Wer am Ende die meisten Punkte hat, gewinnt.' },
      { t: 'Würfeln und behalten', d: 'Tippe auf <b>Würfeln</b>. Danach kannst du Würfel <b>antippen, um sie zu behalten</b>, sie heben sich an. Beim nächsten Wurf rollen nur die anderen. Nach dem dritten Wurf musst du eintragen, du darfst aber auch früher.' },
      { t: 'Oben: Einser bis Sechser', d: 'Hier zählen nur die Augen der passenden Zahl, z. B. drei Vierer = 12 bei Vierer. Kommst du oben auf <b>63 oder mehr</b>, gibt es <b>35 Bonuspunkte</b>. Das sind drei gleiche pro Zahl.' },
      { t: 'Unten', d: '<b>Dreierpasch/Viererpasch</b>: drei bzw. vier gleiche, zählt alle Augen. <b>Full House</b> (3 + 2 gleiche): 25. <b>Kleine Straße</b> (4 in Folge): 30. <b>Große Straße</b> (5 in Folge): 40. <b>Fünferpasch</b> (5 gleiche): 50. <b>Chance</b>: alle Augen, passt immer.' },
      { t: 'Streichen', d: 'Passt nichts, musst du trotzdem ein Feld wählen, dann gibt es dort <b>0 Punkte</b>. Tipp: lieber den Fünferpasch oder die Einser streichen als die Chance zu früh verbrauchen.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players;
      const sheets = {}; P.forEach(p => { sheets[p] = Array(13).fill(null); });
      let turn = 1, dice = [1, 2, 3, 4, 5], keep = 0, rolls = 0, phase = 'roll', over = false, lastNew = null;
      const wrap = V.el('div', 'yz'), tray = V.el('div', 'yz-tray felt'), dz = V.el('div', 'yz-dice'), row = V.el('div', 'yz-row');
      const dies = [0, 1, 2, 3, 4].map(i => { const d = V.die(); d.el.dataset.i = i; d.el.setAttribute('aria-label', 'Würfel ' + (i + 1)); dz.appendChild(d.el); d.show(i + 1); return d; });
      const rollBtn = V.el('button', 'btn primary', ''), info = V.el('p', 'hint');
      row.append(rollBtn, info); tray.append(dz, row);
      const tab = V.el('table', 'yz-tab');
      wrap.append(tray, tab); ctx.stage.appendChild(wrap);
      const human = () => !over && !ctx.isAI(turn);
      const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
      function drawTable() {
        const can = human() && rolls > 0 && phase !== 'anim';
        const head = `<tr><th></th>${P.map(p => `<th class="p${p === turn && !over ? ' on' : ''}" style="--pc:${CLR[p]}">${ctx.name(p)}</th>`).join('')}</tr>`;
        const cell = (p, b) => {
          const v = sheets[p][b];
          if (v != null) return `<td class="v${lastNew && lastNew[0] === p && lastNew[1] === b ? ' new' : ''}">${v}</td>`;
          if (p === turn && can) { const s = score(b, dice); return `<td class="v opt${s ? '' : ' zero'}" data-b="${b}">${s}</td>`; }
          return '<td class="v"></td>';
        };
        const rowsH = BOX.map(([, short], b) => `<tr class="${b === 5 ? 'gap' : ''}"><td class="l">${short}</td>${P.map(p => cell(p, b)).join('')}</tr>`);
        rowsH.splice(6, 0, `<tr class="sum gap"><td class="l">Oben (Bonus ab 63)</td>${P.map(p => `<td class="v">${upper(sheets[p])}${bonus(sheets[p]) ? ' +35' : ''}</td>`).join('')}</tr>`);
        tab.innerHTML = head + rowsH.join('') + `<tr class="sum tot"><td class="l">Gesamt</td>${P.map(p => `<td class="v" style="color:${CLR[p]}">${total(sheets[p])}</td>`).join('')}</tr>`;
      }
      function drawDice() {
        dies.forEach((d, i) => { d.el.classList.toggle('keep', !!((keep >> i) & 1) && rolls > 0); d.el.classList.toggle('fresh', rolls === 0); d.state(human() && rolls > 0 && rolls < 3 && phase === 'pick' ? '' : 'off'); });
        rollBtn.disabled = !human() || rolls >= 3 || phase === 'anim';
        rollBtn.innerHTML = `<span>${rolls === 0 ? 'Würfeln' : rolls < 3 ? `Nochmal (${3 - rolls})` : 'Eintragen!'}</span>`;
        info.textContent = !human() ? '' : rolls === 0 ? 'Würfle zuerst' : rolls < 3 ? 'Würfel antippen zum Behalten, dann nochmal würfeln oder eintragen' : 'Wähle ein Feld in deiner Spalte';
      }
      function begin(p) {
        turn = p; rolls = 0; keep = 0; phase = 'roll';
        ctx.turn(p);
        drawTable(); drawDice();
        ask();
      }
      function ask() {
        if (over) return;
        if (!ctx.isAI(turn)) { drawTable(); drawDice(); return; }
        drawDice();
        const s = turn;
        ctx.aiTurn({
          side: s, quick: rolls > 0,
          think: () => ({ move: think() }),
          targets: m => m.c != null ? [tab.querySelector(`tr:nth-child(${m.c + (m.c >= 6 ? 3 : 2)}) td:nth-child(${P.indexOf(s) + 2})`)] : [rollBtn],
          apply: act,
          decode: raw => {
            if (!raw || typeof raw !== 'object') return null;
            if (raw.r != null) return Number.isInteger(raw.r) && raw.r >= 0 && raw.r < 32 && rolls < 3 && (rolls > 0 || raw.r === 0) ? { r: raw.r } : null;
            if (raw.c != null) return Number.isInteger(raw.c) && raw.c >= 0 && raw.c < 13 && sheets[s][raw.c] == null && rolls > 0 ? { c: raw.c } : null;
            return null;
          },
          say: m => m.c != null ? `${BOX[m.c][0]}: ${score(m.c, dice)}` : ''
        });
      }
      function think() {
        const L = ctx.level, sh = sheets[turn];
        if (rolls === 0) return { r: 0 };
        const bb = bestBox(sh, dice);
        if (rolls >= 3) return { c: L === 0 && Math.random() < 0.4 ? V.pick(sh.map((v, i) => v == null ? i : -1).filter(i => i >= 0)) : bb.box };
        if (L === 0) return Math.random() < 0.3 ? { c: bb.box } : { r: Math.random() < 0.5 ? greedyKeep(sh, dice) : V.rand(32) };
        if (L === 1) { if (bb.v > 12) return { c: bb.box }; return { r: greedyKeep(sh, dice) }; }
        const k = bestKeep(sh, dice, 3 - rolls, L === 2 ? 40 : 140);
        // standing pat beats rolling again: score now
        if (bb.v >= k.v - (L === 3 ? 0.5 : 2)) return { c: bb.box };
        return { r: k.mask };
      }
      function act(m) {
        if (over) return;
        if (m.r != null) {
          if (rolls >= 3) return;
          ctx.moved(turn, { r: m.r });
          keep = rolls === 0 ? 0 : m.r;
          rolls++; phase = 'anim';
          dice = dice.map((v, i) => (keep >> i) & 1 ? v : 1 + Math.floor(ctx.rng() * 6));
          dies.forEach((d, i) => { if (!((keep >> i) & 1)) d.show(dice[i], true); });
          drawDice(); V.sfx.tick();
          ctx.later(() => { V.sfx.move(); phase = 'pick'; ctx.status(`${ctx.who(turn)} würfelt ${[...dice].sort().join(' ')}`); ask(); }, V.fxOn() && !ctx.fast() ? 650 : 60);
          return;
        }
        if (m.c != null && rolls > 0 && sheets[turn][m.c] == null) {
          ctx.moved(turn, { c: m.c });
          const s = score(m.c, dice), p = turn;
          sheets[p][m.c] = s; lastNew = [p, m.c];
          phase = 'anim'; drawTable(); drawDice();
          if (s >= 25) { V.sfx.goal(); V.fx.burstAt(tab.querySelector('td.new'), '#ffd84f', 14, 70); } else if (s) V.sfx.place(); else V.sfx.bad();
          if (m.c === 11 && s) { V.fx.confetti(); ctx.status(`${ctx.who(p)}: Fünferpasch!`); }
          else ctx.status(`${ctx.who(p)}: ${BOX[m.c][0]} ${s}`);
          if (P.every(q => sheets[q].every(v => v != null))) {
            over = true; drawTable();
            const best = Math.max(...P.map(q => total(sheets[q]))), win = P.filter(q => total(sheets[q]) === best);
            return ctx.end(win.length > 1 ? 0 : win[0], P.map(q => total(sheets[q])).join(' : ') + ' Punkte');
          }
          ctx.later(() => begin(P[(P.indexOf(p) + 1) % N]), ctx.fast() ? 30 : 700);
        }
      }
      rollBtn.onclick = () => { if (human() && rolls < 3 && phase !== 'anim') act({ r: keep }); };
      dz.addEventListener('click', e => {
        const d = e.target.closest('.die3w'); if (!d || !human() || rolls === 0 || rolls >= 3 || phase !== 'pick') return;
        keep ^= 1 << +d.dataset.i; V.sfx.tick(); drawDice();
      });
      tab.addEventListener('click', e => { const td = e.target.closest('td.opt'); if (td && human() && phase === 'pick') act({ c: +td.dataset.b }); });
      ctx.nav(() => human() && phase === 'pick' ? [...tab.querySelectorAll('td.opt')] : [], { pad: 0 });
      ctx.keys(e => {
        if (!human()) return false;
        if (e.key === ' ' && !e.repeat && !V.nav.active) { rollBtn.click(); return true; }
        if (/^[1-5]$/.test(e.key) && rolls > 0 && rolls < 3 && phase === 'pick') { keep ^= 1 << (+e.key - 1); V.sfx.tick(); drawDice(); return true; }
        return false;
      });
      begin(1);
    }
  });
})();
