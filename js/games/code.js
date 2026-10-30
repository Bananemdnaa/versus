(function () {
  // Zahlencode knacken (the old pen-and-paper game also known as Bulls and Cows): both pick a secret code of
  // four different digits, then guess the other's code in turns. Each guess gets "Treffer" (right digit, right
  // place) and "Fast" (in the code, wrong place). If side 1 cracks the code first, side 2 gets its last try
  // in the same round; both cracked = draw. No AI to choose (against a computer it is just a puzzle); only a seat
  // taken over by the computer at a table keeps guessing, with codes that can still be right.
  // Uses ctx.listen/ctx.submit: { c: '1234' } secret code, { g: '5678', n } guess number n.
  const LEN = 4, MAX = 15;
  const ALL = [];
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (let c = 0; c < 10; c++) for (let d = 0; d < 10; d++)
    if (a !== b && a !== c && a !== d && b !== c && b !== d && c !== d) ALL.push('' + a + b + c + d);
  const valid = x => typeof x === 'string' && /^\d{4}$/.test(x) && new Set(x).size === LEN;
  function score(code, g) { let t = 0, f = 0; for (let i = 0; i < LEN; i++) { if (g[i] === code[i]) t++; else if (code.includes(g[i])) f++; } return t * 10 + f; }
  const randCode = () => ALL[Math.floor(Math.random() * ALL.length)];

  V.css(`
  .cd{width:min(var(--bw),560px);display:flex;flex-direction:column;gap:12px;align-items:center}
  .cd-secret{display:flex;align-items:center;gap:10px;font:700 italic 12px/1 var(--f-d);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .cd-secret b{font:800 italic 22px/1 var(--f-d);letter-spacing:.3em;color:var(--fg)}
  .cd-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
  .cd-col{display:flex;flex-direction:column;gap:5px;min-width:0}
  .cd-col h4{margin:0 0 2px;font:800 italic 13px/1.1 var(--f-d);text-transform:uppercase;letter-spacing:.06em;text-align:center}
  .cd-row{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;border-radius:9px;background:var(--panel);border:1px solid var(--line);animation:cdin .3s var(--ease)}
  @keyframes cdin{from{transform:translateY(-6px);opacity:0}}
  .cd-row .g{font:800 italic 19px/1 var(--f-d);letter-spacing:.18em}
  .cd-row .n{color:var(--dim);font:700 11px/1 var(--f-d);min-width:14px}
  .cd-fb{display:flex;gap:3px;align-items:center}
  .cd-fb i{width:11px;height:11px;border-radius:50%;background:var(--panel3)}
  .cd-fb i.t{background:var(--good);box-shadow:0 0 6px var(--good)} .cd-fb i.f{background:var(--yellow)}
  .cd-row.win{border-color:var(--good);box-shadow:0 0 0 1px var(--good)}
  .cd-empty{color:var(--dim);font-size:12px;text-align:center;padding:8px 0}
  .cd-in{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .cd-slots{display:flex;gap:8px}
  .cd-slots span{width:48px;height:56px;border-radius:10px;background:var(--panel2);border:2px solid var(--line2);display:grid;place-items:center;font:800 italic 28px/1 var(--f-d)}
  .cd-slots span.cur{border-color:var(--cyan);box-shadow:0 0 10px color-mix(in srgb,var(--cyan) 50%,transparent)}
  .cd-pad{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;width:min(100%,380px)}
  .cd-pad button{height:46px;border-radius:10px;background:var(--panel2);border:1px solid var(--line2);font:800 italic 22px/1 var(--f-d);color:var(--fg)}
  .cd-pad button:disabled{opacity:.3}
  .cd-pad button.ok{background:var(--pink);color:var(--ink);grid-column:span 2}
  .cd-pad button.ok:disabled{background:var(--panel2);color:var(--fg)}
  .cd-note{color:var(--muted);font-size:13px;text-align:center;margin:0;min-height:18px}
  .cd-legend{display:flex;gap:14px;color:var(--muted);font-size:12px} .cd-legend span{display:flex;gap:5px;align-items:center}`);

  V.register({
    id: 'code', name: 'Zahlencode knacken', cat: 'Klassiker', order: 8, accent: '#5dff9d', noAI: true,
    short: 'Vier Ziffern, wer knackt zuerst?',
    desc: 'Jeder denkt sich einen Code aus vier verschiedenen Ziffern aus. Dann ratet ihr abwechselnd. Nach jedem Versuch erfährst du, wie viele Ziffern genau stimmen und wie viele nur an der falschen Stelle stehen. Wer zuerst knackt, gewinnt.',
    keys: [['0–9', 'Ziffer eintippen'], ['Rücktaste', 'Löschen'], ['Enter', 'Raten']],
    localHint: 'Zuerst gibt jeder geheim seinen Code ein, das Handy wird dafür weitergegeben. Danach ratet ihr abwechselnd.',
    endDelay: 1200,
    icon: `<svg viewBox="0 0 48 48"><rect x="4" y="12" width="40" height="18" rx="5" fill="#1d2140" stroke="#5dff9d" stroke-width="2"/>${['4', '7', '?', '1'].map((d, k) => `<text x="${11 + k * 9}" y="26" text-anchor="middle" font-size="12" font-weight="800" fill="${d === '?' ? '#ffd84f' : '#fff'}" font-family="Arial">${d}</text>`).join('')}<circle cx="16" cy="38" r="3" fill="#5dff9d"/><circle cx="24" cy="38" r="3" fill="#5dff9d"/><circle cx="32" cy="38" r="3" fill="#ffd84f"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Jeder wählt geheim einen <b>Code aus vier verschiedenen Ziffern</b>, zum Beispiel 4 7 0 2. Ihr ratet abwechselnd den Code des anderen. Wer ihn zuerst knackt, gewinnt.' },
      { t: 'Die Antwort', d: 'Nach jedem Versuch gibt es zwei Zahlen: <b>Treffer</b> (grün) heißt richtige Ziffer an der richtigen Stelle, <b>Fast</b> (gelb) heißt die Ziffer kommt vor, steht aber woanders. Welche Ziffern gemeint sind, verrät niemand.' },
      { t: 'Beispiel', d: 'Der Code ist <b>4 7 0 2</b>, du rätst <b>4 2 1 0</b>: Die 4 ist ein Treffer, 2 und 0 sind Fast, die 1 kommt nicht vor. Also <b>1 Treffer, 2 Fast</b>.' },
      { t: 'Fair bis zum Schluss', d: 'Knackt der Erste den Code, bekommt der Zweite in derselben Runde noch seinen Versuch. Schafft er es auch, ist es <b>unentschieden</b>.' }
    ],
    start(ctx) {
      const P = ctx.players, local = ctx.mode === 'local';
      const secret = {}, guesses = { 1: [], 2: [] };
      let phase = 'set', turn = 1, over = false, typed = '', writer = 0, thinking = false;
      const wrap = V.el('div', 'cd'); ctx.stage.appendChild(wrap);
      // the side whose screen this is: online your seat, against the AI you, at one device whoever enters a code
      const me = () => local ? writer : ctx.mySide || (ctx.aiSide ? 3 - ctx.aiSide : 1);
      const fb = r => `<span class="cd-fb">${'<i class="t"></i>'.repeat(Math.floor(r / 10))}${'<i class="f"></i>'.repeat(r % 10)}${'<i></i>'.repeat(LEN - Math.floor(r / 10) - r % 10)}</span>`;
      const canType = () => !over && (phase === 'set' ? !!me() && !secret[me()] : !ctx.isAI(turn) && !thinking && (local || me() === turn));

      // ---------- secret codes ----------
      function setPhase() {
        phase = 'set'; ctx.turn(0, false);
        ctx.status('Jeder wählt seinen geheimen Code');
        // computer seats pick theirs at once (the host sends them at a table)
        if (ctx.amHost()) P.filter(p => ctx.isBot(p)).forEach(p => ctx.submit({ c: randCode() }, p));
        if (local) return nextWriter();
        draw();
      }
      function nextWriter() {
        const p = P.find(x => !secret[x]);
        if (!p) return;
        writer = 0; typed = ''; wrap.innerHTML = '';
        ctx.handoff(p, 'Gib geheim deinen Code ein.', () => { writer = p; draw(); });
      }
      ctx.listen((s, m) => {
        if (over || !m) return;
        if (m.c && phase === 'set' && !secret[s] && valid(m.c)) {
          secret[s] = m.c;
          if (P.every(p => secret[p])) { phase = 'guess'; writer = 0; typed = ''; V.sfx.go(); return step(); }
          if (local) return nextWriter();
          if (s !== me()) ctx.status(`${ctx.who(s)} hat seinen Code gewählt`);
          return draw();
        }
        if (m.g && phase === 'guess' && s === turn && valid(m.g) && m.n === guesses[s].length + 1) guessed(s, m.g);
      });

      // ---------- guessing ----------
      function guessed(s, g) {
        const r = score(secret[3 - s], g);
        guesses[s].push({ g, r });
        thinking = false; typed = '';
        if (ctx.isAI(s)) V.sfx.them(); else V.sfx.place();
        const t = Math.floor(r / 10), f = r % 10;
        ctx.status(`${ctx.who(s)}: ${g.split('').join(' ')} · ${t} Treffer, ${f} Fast`);
        const cracked = p => guesses[p].length && guesses[p][guesses[p].length - 1].r === 40;
        // side 1 cracked: side 2 still gets its try in this round; side 2 decides the round
        if (s === 2 || (s === 1 && !cracked(1))) {
          if (cracked(1) && cracked(2)) return finish(0, 'Beide haben geknackt');
          if (cracked(1) || cracked(2)) return finish(cracked(1) ? 1 : 2, `Geknackt nach ${guesses[cracked(1) ? 1 : 2].length} Versuchen`);
          if (s === 2 && guesses[2].length >= MAX) return finish(0, `Nach ${MAX} Versuchen niemand`);
        }
        if (s === 1 && cracked(1)) { V.sfx.found(); ctx.status(`${ctx.who(1)} hat geknackt! ${ctx.who(2)} hat noch einen Versuch`); }
        turn = 3 - s;
        ctx.later(step, ctx.fast() ? 0 : 450);
      }
      function step() {
        if (over) return;
        ctx.turn(turn);
        draw();
        if (!ctx.isAI(turn)) return;
        // the computer guesses (the host does it at a table); remote people send their own guesses
        if (!ctx.isBot(turn) || !ctx.amHost()) return;
        thinking = true; draw();
        ctx.status(`${ctx.who(turn)} <span class="thinking">denkt</span>`);
        const s = turn;
        ctx.later(() => { const g = think(s); ctx.submit({ g, n: guesses[s].length + 1 }, s); }, ctx.auto ? 0 : 900 + Math.random() * 700);
      }
      function think(s) {
        const L = 2, mine = guesses[s];
        if (!mine.length) return L === 3 ? '0123' : randCode();
        const cand = ALL.filter(c => mine.every(x => score(c, x.g) === x.r));
        if (!cand.length) return randCode();
        const use = [0.35, 0.8, 1, 1][L];
        if (Math.random() > use) return randCode();
        if (L < 3 || cand.length <= 2) return V.pick(cand);
        // Profi: the guess whose worst answer leaves the fewest codes (candidates preferred on ties)
        const pool = cand.length > 160 ? V.shuffle(cand.slice()).slice(0, 160) : cand;
        const tests = cand.length > 1200 ? V.shuffle(cand.slice()).slice(0, 1200) : cand;
        let best = pool[0], bv = Infinity;
        for (const g of pool) {
          const cnt = {}; let worst = 0;
          for (const c of tests) { const k = score(c, g); cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] > worst) worst = cnt[k]; }
          if (worst < bv) { bv = worst; best = g; }
        }
        return best;
      }
      function finish(w, note) {
        over = true; phase = 'end';
        draw();
        ctx.end(w, note);
      }

      // ---------- screen ----------
      function draw() {
        const m = me();
        if (phase === 'set') {
          if (!m) { wrap.innerHTML = ''; return; }
          if (secret[m]) { wrap.innerHTML = `<div class="cd-secret">Dein Code <b>${secret[m]}</b></div><p class="cd-note">Warte auf ${P.filter(p => !secret[p]).map(p => ctx.who(p)).join(', ')} …</p>`; return; }
          wrap.innerHTML = `<p class="cd-note">${local ? ctx.who(m) + ': ' : ''}Wähle deinen geheimen Code aus vier verschiedenen Ziffern.</p>${input('Code festlegen')}`;
          return bind();
        }
        // who is shown on the left: you (or side 1 at one device)
        const left = local ? 1 : m || 1, right = 3 - left;
        const col = p => `<div class="cd-col"><h4 class="c${p}">${local ? ctx.name(p) : p === left ? 'Deine Versuche' : ctx.name(p)}</h4>${guesses[p].length ? guesses[p].map((x, k) => `<div class="cd-row${x.r === 40 ? ' win' : ''}"><span class="n">${k + 1}</span><span class="g">${x.g}</span>${fb(x.r)}</div>`).join('') : '<div class="cd-empty">noch nichts</div>'}</div>`;
        const show = over ? `<div class="cd-secret">Codes <b class="c1">${secret[1]}</b> <b class="c2">${secret[2]}</b></div>` : !local && m ? `<div class="cd-secret">Dein Code <b>${secret[m]}</b></div>` : '';
        const typing = canType();
        wrap.innerHTML = `${show}<div class="cd-legend"><span>${fb(10).replace(/<i><\/i>/g, '')} Treffer</span><span><span class="cd-fb"><i class="f"></i></span> Fast</span></div><div class="cd-cols">${col(left)}${col(right)}</div>
          ${over ? '' : typing ? input('Raten') : `<p class="cd-note">${ctx.who(turn)} ist dran …</p>`}`;
        if (typing) bind();
      }
      function input(label) {
        const used = new Set(typed);
        return `<div class="cd-in"><div class="cd-slots">${[0, 1, 2, 3].map(k => `<span class="${k === typed.length ? 'cur' : ''}">${typed[k] || ''}</span>`).join('')}</div>
          <div class="cd-pad">${'1234567890'.split('').map(d => `<button data-d="${d}"${used.has(d) || typed.length >= LEN ? ' disabled' : ''}>${d}</button>`).join('')}<button data-d="x" aria-label="Löschen"${typed ? '' : ' disabled'}>⌫</button><button class="ok" data-d="ok"${typed.length === LEN ? '' : ' disabled'}>${label}</button></div><p class="cd-note" id="cdn"></p></div>`;
      }
      function bind() { wrap.querySelectorAll('.cd-pad button').forEach(b => b.onclick = () => key(b.dataset.d)); }
      function key(d) {
        if (!canType()) return;
        if (d === 'x') typed = typed.slice(0, -1);
        else if (d === 'ok') return send();
        else if (/^\d$/.test(d) && typed.length < LEN && !typed.includes(d)) typed += d;
        else return V.sfx.bad();
        V.sfx.tick(); draw();
      }
      function send() {
        if (!valid(typed)) return;
        const t = typed; typed = '';
        if (phase === 'set') { ctx.submit({ c: t }, me()); return draw(); }
        thinking = true; draw();
        ctx.submit({ g: t, n: guesses[turn].length + 1 }, turn);
      }
      ctx.keys(e => {
        if (!canType()) return false;
        if (/^\d$/.test(e.key)) { key(e.key); return true; }
        if (e.key === 'Backspace') { key('x'); return true; }
        if (e.key === 'Enter') { key('ok'); return true; }
        return false;
      });
      setPhase();
    }
  });
})();
