(function () {
  // Stadt Land Fluss for 2-4 people (no AI). Everybody writes at the same time; the first one done calls "Stopp",
  // the others get 10 more seconds. Then everybody can strike answers that don't count, and points are given:
  // 20 if you're the only one with an answer, 10 for a unique answer, 5 if someone has the same.
  // Uses ctx.listen/ctx.submit: { a: answers, r } written answers, { v: struck keys, r } votes.
  const CATS = ['Stadt', 'Land', 'Fluss', 'Tier', 'Name', 'Beruf'];
  const LETTERS = 'ABCDEFGHIKLMNOPRSTUWZ';
  const WRITE = 90, STOP = 10;
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  V.css(`
  .slf{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:12px;align-items:center}
  .slf-head{display:flex;align-items:center;gap:16px;justify-content:center}
  .slf-letter{width:clamp(70px,18vw,92px);aspect-ratio:1;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,var(--pink),var(--yellow));color:var(--ink);font:800 italic clamp(44px,12vw,62px)/1 var(--f-d);box-shadow:4px 4px 0 var(--cyan)}
  .slf-letter.spin{animation:slfspin .9s var(--ease)}
  @keyframes slfspin{0%{transform:rotate(-200deg) scale(.3)}70%{transform:rotate(10deg) scale(1.1)}}
  .slf-time{display:flex;flex-direction:column;gap:4px}
  .slf-time b{font:800 italic 34px/1 var(--f-d);font-variant-numeric:tabular-nums}
  .slf-time b.low{color:var(--bad);animation:clkp 1s steps(2) infinite}
  .slf-time small{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
  .slf-form{display:grid;grid-template-columns:auto 1fr;gap:8px 10px;width:100%;align-items:center}
  .slf-form label{font:800 italic 16px/1 var(--f-d);text-transform:uppercase;color:var(--muted)}
  .slf-form .inp{height:42px}
  .slf-stop{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%);z-index:30;font:800 italic 64px/1 var(--f-d);color:#fff;text-shadow:4px 4px 0 var(--bad),0 0 30px var(--bad);pointer-events:none;animation:shout 1.3s var(--spring) forwards}
  .slf-tab{width:100%;border-collapse:separate;border-spacing:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:14px}
  .slf-tab th,.slf-tab td{padding:6px 6px;border-bottom:1px solid var(--line);text-align:left}
  .slf-tab th{font:700 italic 12px/1.1 var(--f-d);letter-spacing:.08em;text-transform:uppercase}
  .slf-tab td.c{font:800 italic 13px/1 var(--f-d);text-transform:uppercase;color:var(--muted)}
  .slf-tab td.a{cursor:pointer;word-break:break-word}
  .slf-tab td.a.empty{color:var(--dim);cursor:default}
  .slf-tab td.a.bad{text-decoration:line-through;color:var(--bad)}
  .slf-tab td.a.mine{cursor:default}
  .slf-tab td.a em{font-style:normal;font:800 italic 13px/1 var(--f-d);margin-left:6px;color:var(--good)}
  .slf-tab td.a.bad em{color:var(--bad)}
  .slf-tab tr.tot td{background:var(--panel2);font:800 italic 18px/1 var(--f-d)}
  .slf-note{color:var(--muted);font-size:13px;text-align:center;margin:0}`);

  V.register({
    id: 'slf', name: 'Stadt Land Fluss', cat: 'Klassiker', order: 9, accent: '#ffd84f', party: true, noAI: true, noFirst: true,
    short: 'Buchstabe, Stopp, Punkte. Bis zu 4.',
    desc: 'Ein Buchstabe wird ausgelost, alle schreiben gleichzeitig eine Stadt, ein Land, einen Fluss und mehr damit. Wer fertig ist, ruft Stopp. Danach streicht ihr gemeinsam, was nicht zählt. Für 2 bis 4, online oder reihum am selben Gerät.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    keys: [['Tab', 'Nächstes Feld'], ['Enter', 'Fertig']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'rounds', label: 'Runden', def: 3, choices: [[3, '3'], [5, '5']] }],
    localHint: 'Am selben Gerät schreibt jeder für sich, das Handy wird nach jedem weitergegeben (je 60 Sekunden).',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="6" y="5" width="36" height="38" rx="5" fill="#f3e6cc" stroke="#b9952a" stroke-width="2"/><path d="M12 15h24M12 23h24M12 31h24" stroke="#b9952a" stroke-width="1.6"/><rect x="26" y="26" width="18" height="18" rx="5" fill="#ff4fd8"/><text x="35" y="40" text-anchor="middle" font-size="14" font-weight="800" fill="#08090f" font-family="Arial">B</text><text x="12" y="13" font-size="6" fill="#5d3a1c" font-family="Arial" font-weight="700">STADT LAND</text></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Ein <b>Buchstabe</b> wird ausgelost. Schreib zu jeder Spalte etwas, das damit anfängt: <b>Stadt, Land, Fluss, Tier, Name, Beruf</b>.' },
      { t: 'Stopp!', d: 'Bist du fertig, tippe <b>Stopp</b>. Die anderen haben dann noch <b>10 Sekunden</b>. Spätestens nach 90 Sekunden ist die Runde vorbei.' },
      { t: 'Streichen', d: 'Danach seht ihr alle Antworten. <b>Tippe auf eine Antwort</b>, die nicht zählt (gibt es nicht, falscher Buchstabe). Sie wird gestrichen, wenn genug Mitspieler sie streichen. Dann <b>Weiter</b>.' },
      { t: 'Punkte', d: '<b>20</b>: nur du hast in der Spalte etwas. <b>10</b>: deine Antwort hat sonst niemand. <b>5</b>: jemand hat dasselbe. Nach allen Runden gewinnt, wer die meisten Punkte hat.' },
      { t: 'Am selben Handy', d: 'Spielt ihr an einem Gerät, schreibt jeder nacheinander für sich (60 Sekunden), dann wird gemeinsam gestrichen.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng, local = ctx.mode === 'local';
      const rounds = [3, 5].includes(+ctx.opts.rounds) ? +ctx.opts.rounds : 3;
      const total = {}; P.forEach(p => { total[p] = 0; });
      let round = 0, letter = '', phase = '', ans = {}, votes = {}, deadline = 0, stopAt = 0, sent = false, voted = false, over = false, tick = null, writer = 0;
      const used = new Set();
      const wrap = V.el('div', 'slf'); ctx.stage.appendChild(wrap);
      const me = () => local ? writer : (ctx.mySide || 1);
      const people = () => P.filter(p => !ctx.isBot(p));
      ctx.onCleanup(() => clearInterval(tick));
      const scoreLine = () => ctx.status(P.map(p => `<span class="c${p}">${ctx.name(p)} ${total[p]}</span>`).join(' · ') + ` <small>· Runde ${round} von ${rounds}</small>`);

      function newRound() {
        round++;
        if (round > rounds) return finish();
        let l; do { l = LETTERS[Math.floor(R() * LETTERS.length)]; } while (used.has(l) && used.size < LETTERS.length);
        used.add(l); letter = l; ans = {}; votes = {}; sent = false; voted = false; stopAt = 0; phase = 'write';
        scoreLine(); ctx.turn(0, false); scoreLine();
        if (local) { writer = 0; ctx.handReset(); return nextWriter(); }
        deadline = Date.now() + WRITE * 1000;
        writeUI();
        // seats played by the computer (someone left) hand in empty answers, sent by the host
        if (ctx.amHost()) P.filter(p => ctx.isBot(p)).forEach(p => ctx.submit({ a: [], r: round, bot: 1 }, p));
      }
      // one device: everybody writes in turn
      function nextWriter() {
        const p = P.find(q => !ans[q]);
        if (!p) return;
        // the answers of the one before disappear before the phone is passed on
        wrap.innerHTML = '';
        ctx.handoff(p, `Buchstabe der Runde: gleich siehst du ihn. Du hast 60 Sekunden.`, () => {
          writer = p; sent = false; deadline = Date.now() + 60000; stopAt = 0;
          writeUI();
        });
      }
      function writeUI() {
        const p = me();
        wrap.innerHTML = `<div class="slf-head"><div class="slf-letter spin">${letter}</div><div class="slf-time"><small>${local ? ctx.name(p) + ' schreibt' : 'Zeit'}</small><b id="slft">${WRITE}</b></div></div>
          <form class="slf-form" id="slff">${CATS.map((c, i) => `<label for="slf${i}">${c}</label><input class="inp" id="slf${i}" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${letter} …">`).join('')}</form>
          <button class="btn primary big" id="slfs"><span>Stopp! Fertig</span></button><p class="slf-note" id="slfn"></p>`;
        const f = wrap.querySelector('#slff');
        f.onsubmit = e => e.preventDefault();
        f.querySelectorAll('input').forEach((x, i, all) => x.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); else send(); } }));
        wrap.querySelector('#slfs').onclick = send;
        if (!V.coarse) setTimeout(() => { const x = f.querySelector('input'); if (x) x.focus(); }, 80);
        clearInterval(tick); tick = setInterval(timer, 250); timer();
      }
      function timer() {
        if (!ctx.alive() || phase !== 'write') return clearInterval(tick);
        const end = stopAt ? Math.min(deadline, stopAt) : deadline, left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        const t = wrap.querySelector('#slft'); if (t) { t.textContent = left; t.classList.toggle('low', left <= 10); }
        if (left <= 0 && !sent) send();
      }
      function send() {
        if (sent || phase !== 'write') return;
        sent = true;
        const a = CATS.map((_, i) => { const x = wrap.querySelector('#slf' + i); return x ? x.value.trim().slice(0, 40) : ''; });
        const n = wrap.querySelector('#slfn'); if (n) n.textContent = local ? '' : 'Abgegeben. Warte auf die anderen …';
        wrap.querySelectorAll('input,#slfs').forEach(x => { x.disabled = true; });
        V.sfx.place();
        ctx.submit({ a, r: round }, me());
      }
      ctx.listen((s, m) => {
        if (over || !m || m.r !== round) return;
        if (m.a && phase === 'write' && !ans[s]) {
          ans[s] = m.a.map(x => String(x || '').slice(0, 40));
          if (!m.bot && !stopAt && !local) {
            stopAt = Date.now() + STOP * 1000;
            if (s !== me()) { const el = V.el('div', 'slf-stop', 'Stopp!'); document.body.appendChild(el); setTimeout(() => el.remove(), 1400); V.sfx.go(); ctx.status(`${ctx.who(s)} ruft Stopp! Noch ${STOP} Sekunden`); }
          }
          if (P.every(p => ans[p])) return voteUI();
          if (local) nextWriter();
          return;
        }
        if (m.v && phase === 'vote' && !votes[s]) {
          votes[s] = m.v.filter(k => typeof k === 'string').slice(0, 30);
          const need = local ? [P[0]] : people();
          if (need.every(p => votes[p])) scoreRound();
          else drawVote();
        }
      });
      // an answer counts if it starts with the letter, is not empty, and not enough others struck it
      const starts = a => norm(a).startsWith(letter.toLowerCase()) || (letter === 'A' && /^ä/.test(norm(a))) || (letter === 'O' && /^ö/.test(norm(a))) || (letter === 'U' && /^ü/.test(norm(a)));
      const mine = new Set();
      function voteUI() {
        clearInterval(tick); phase = 'vote'; mine.clear();
        P.forEach(p => CATS.forEach((_, c) => { const a = ans[p][c]; if (norm(a) && !starts(a)) mine.add(p + ':' + c); }));
        V.sfx.goal(); drawVote();
      }
      function drawVote() {
        const viewer = local ? 0 : me();
        const waiting = !local && voted;
        wrap.innerHTML = `<div class="slf-head"><div class="slf-letter">${letter}</div><div class="slf-time"><small>Runde ${round}</small><b>Streichen</b></div></div>
          <table class="slf-tab"><tr><th></th>${P.map(p => `<th class="c${p}">${ctx.name(p)}</th>`).join('')}</tr>
          ${CATS.map((c, ci) => `<tr><td class="c">${c}</td>${P.map(p => { const a = ans[p][ci], k = p + ':' + ci; return `<td class="a${!norm(a) ? ' empty' : ''}${mine.has(k) ? ' bad' : ''}${p === viewer ? ' mine' : ''}" data-k="${k}">${norm(a) ? esc(a) : '–'}</td>`; }).join('')}</tr>`).join('')}</table>
          <p class="slf-note">${waiting ? 'Warte auf die anderen …' : 'Tippe auf Antworten, die nicht zählen. Falscher Anfangsbuchstabe ist schon gestrichen.'}</p>
          ${waiting ? '' : '<button class="btn primary big" id="slfv"><span>Weiter</span></button>'}`;
        wrap.querySelectorAll('td.a').forEach(td => td.onclick = () => {
          if (waiting || td.classList.contains('empty') || td.classList.contains('mine')) return;
          const k = td.dataset.k; mine.has(k) ? mine.delete(k) : mine.add(k); td.classList.toggle('bad'); V.sfx.tick();
        });
        const b = wrap.querySelector('#slfv'); if (b) b.onclick = () => { if (voted) return; voted = true; ctx.submit({ v: [...mine], r: round }, local ? P[0] : me()); if (!local) drawVote(); };
      }
      const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      function scoreRound() {
        phase = 'score';
        const voters = local ? [P[0]] : people();
        // one device: what was struck there counts; online: at least half of the others have to strike it
        const bad = k => { if (local) return votes[P[0]].includes(k); const p = +k.split(':')[0], others = voters.filter(v => v !== p), n = others.filter(v => votes[v].includes(k)).length; return others.length > 0 && n * 2 >= others.length; };
        const pts = {}; P.forEach(p => { pts[p] = [0, 0, 0, 0, 0, 0]; });
        CATS.forEach((_, c) => {
          const ok = P.filter(p => norm(ans[p][c]) && starts(ans[p][c]) && !bad(p + ':' + c));
          ok.forEach(p => { const same = ok.filter(q => q !== p && norm(ans[q][c]) === norm(ans[p][c])).length; pts[p][c] = ok.length === 1 ? 20 : same ? 5 : 10; });
        });
        P.forEach(p => { total[p] += pts[p].reduce((a, b) => a + b, 0); });
        wrap.innerHTML = `<div class="slf-head"><div class="slf-letter">${letter}</div><div class="slf-time"><small>Runde ${round}</small><b>Punkte</b></div></div>
          <table class="slf-tab"><tr><th></th>${P.map(p => `<th class="c${p}">${ctx.name(p)}</th>`).join('')}</tr>
          ${CATS.map((c, ci) => `<tr><td class="c">${c}</td>${P.map(p => { const a = ans[p][ci]; return `<td class="a mine${!norm(a) ? ' empty' : !pts[p][ci] ? ' bad' : ''}">${norm(a) ? esc(a) : '–'}<em>${norm(a) ? pts[p][ci] : ''}</em></td>`; }).join('')}</tr>`).join('')}
          <tr class="tot"><td class="c">Gesamt</td>${P.map(p => `<td class="c${p}">${total[p]}</td>`).join('')}</tr></table>`;
        scoreLine(); V.sfx.win();
        ctx.later(newRound, 5200);
      }
      function finish() {
        over = true; clearInterval(tick);
        const top = Math.max(...P.map(p => total[p])), ws = P.filter(p => total[p] === top);
        ctx.end(ws.length > 1 ? 0 : ws[0], P.map(p => total[p]).join(' : ') + ' Punkte');
      }
      newRound();
    }
  });
})();
