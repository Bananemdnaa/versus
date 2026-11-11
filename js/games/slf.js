(function () {
  // Stadt Land Fluss for 2-4 people (no AI). Everybody writes at the same time; the first one done calls "Stopp",
  // the others get 10 more seconds. Then everybody can strike answers that don't count, and points are given:
  // 20 if you're the only one with an answer, 10 for a unique answer, 5 if someone has the same.
  // Before the letter shows there is a short countdown, so everybody starts at the same moment.
  // The computer looks over the answers first: wrong letter is out, gibberish is suggested for striking, and answers
  // it knows from its lists (cities, countries, rivers, animals, names, jobs, brands, food) are marked as known.
  // Uses ctx.listen/ctx.submit: { a: answers, r } written answers, { v: struck keys, r } votes.
  const DEF_CATS = ['Stadt', 'Land', 'Fluss', 'Tier', 'Name', 'Beruf'];
  const LETTERS = 'ABCDEFGHIKLMNOPRSTUWZ';
  const WRITE = 90, STOP = 10, COUNT = 3;
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Categories are chosen in the game panel (option "cats", 3 to 8 of them, own ones up to 16 letters). They travel with
  // the table's options to everyone at the table, so the server limit of 500 bytes for options must hold.
  const POOL = [...DEF_CATS, 'Pflanze', 'Essen', 'Marke', 'Sport', 'Körperteil', 'Farbe', 'Film oder Serie', 'Promi', 'Spiel', 'Getränk'];
  const MINC = 3, MAXC = 8, LEN = 16;
  const clean = c => String(c || '').replace(/\s+/g, ' ').trim().slice(0, LEN);
  const pickCats = v => { const a = Array.isArray(v) ? [...new Set(v.map(clean).filter(Boolean))].slice(0, MAXC) : []; return a.length >= MINC ? a : DEF_CATS.slice(); };
  const own = () => V.store.get('slfCustom', []);
  // the category editor in the rules view (js/app.js puts it in the group "Inhalte")
  const isDef = cur => cur.join() === DEF_CATS.join();
  const panelExtra = {
    title: 'Kategorien',
    changed: opts => !isDef(pickCats(opts.cats)),
    reset: () => ({ cats: DEF_CATS.slice() }),
    short: opts => { const cur = pickCats(opts.cats); return isDef(cur) ? '' : `${cur.length} Kategorien`; },
    html(opts) {
      const cur = pickCats(opts.cats), mine = own(), pool = [...new Set([...POOL, ...mine, ...cur])];
      return V.ui.multi.html({ items: pool.map(c => [c, c, mine.includes(c)]), on: cur, count: `${cur.length} von max. ${MAXC}`, add: { ph: 'Eigene Kategorie', max: LEN } });
    },
    wire(el, opts, save, warn) {
      const cur = pickCats(opts.cats);
      V.ui.multi.wire(el, {
        toggle(c) {
          const on = cur.includes(c);
          if (on && cur.length <= MINC) return warn(`Mindestens ${MINC} Kategorien`);
          if (!on && cur.length >= MAXC) return warn(`Höchstens ${MAXC} Kategorien`);
          save({ cats: on ? cur.filter(k => k !== c) : [...cur, c] });
        },
        remove(c) {
          V.store.set('slfCustom', own().filter(k => k !== c));
          save({ cats: cur.filter(k => k !== c).length >= MINC ? cur.filter(k => k !== c) : DEF_CATS.slice() });
        },
        add(text) {
          const c = clean(text); if (!c) return;
          if (!POOL.includes(c) && !own().includes(c)) V.store.set('slfCustom', [...own(), c].slice(-20));
          if (!cur.includes(c) && cur.length >= MAXC) { save({ cats: cur }); return warn(`Höchstens ${MAXC} Kategorien, sie ist jetzt in der Liste`); }
          save({ cats: cur.includes(c) ? cur : [...cur, c] });
        }
      });
    }
  };

  // which built-in list a category is checked against (the lists of the Alphabet-Spiel, js/games/abc.js, plus rivers)
  const LISTS = { stadt: 'staedte', staedte: 'staedte', städte: 'staedte', land: 'laender', laender: 'laender', länder: 'laender', fluss: 'fluss', flüsse: 'fluss', tier: 'tiere', tiere: 'tiere', name: 'namen', vorname: 'namen', vornamen: 'namen', beruf: 'berufe', berufe: 'berufe', marke: 'marken', marken: 'marken', essen: 'essen', getränk: 'essen', 'essen & trinken': 'essen' };
  const RIVERS = 'Aare,Ahr,Aller,Alster,Altmühl,Amazonas,Ammer,Amper,Amu Darja,Amur,Angara,Arkansas,Arno,Bode,Brahmaputra,Bug,Chemnitz,Colorado,Columbia,Dahme,Diemel,Dnepr,Dnjestr,Don,Donau,Dordogne,Douro,Drau,Eder,Eger,Eider,Elbe,Ems,Enns,Enz,Erft,Etsch,Euphrat,Fils,Fulda,Ganges,Garonne,Gelber Fluss,Glatt,Hase,Havel,Huang He,Hudson,Ijssel,Iller,Ilm,Indus,Inn,Irrawaddy,Isar,Itz,Jagst,Jangtse,Jenissei,Jordan,Kinzig,Kocher,Kongo,Kyll,Lahn,Lauter,Lech,Leine,Lena,Limpopo,Lippe,Loire,Maas,Main,March,Mekong,Mississippi,Missouri,Möhne,Moldau,Mosel,Mulde,Mur,Murg,Naab,Nagold,Nahe,Neckar,Neiße,Newa,Nidda,Niger,Nil,Nogat,Ob,Oder,Ohio,Oise,Oker,Orinoco,Paraguay,Paraná,Peene,Pegnitz,Po,Pruth,Rednitz,Regen,Regnitz,Rems,Rhein,Rhône,Rio Grande,Ruhr,Rur,Ruwer,Saale,Saar,Salzach,Sambesi,Sauer,Save,Schelde,Seine,Severn,Shannon,Sieg,Spree,Tajo,Tauber,Tejo,Themse,Theiß,Tiber,Tigris,Traun,Trave,Uecker,Ulster,Unstrut,Ural,Warthe,Weichsel,Werra,Wertach,Weser,Wiese,Wolga,Wörnitz,Wümme,Wupper,Würm,Yukon,Zschopau'.split(',');
  // compare answers without case, umlauts, spaces or dashes: "Weißrussland" = "weissrussland"
  const key = s => norm(s).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  const RIV = new Set(RIVERS.map(key));
  function known(cat, a) {
    const l = LISTS[norm(cat)]; if (!l) return null;
    if (l === 'fluss') return RIV.has(key(a));
    return V.words ? V.words.known(l, a) : null;
  }
  // the same answer, or one typo apart in a longer word ("Wolfgang" / "Wolfgagn")
  function same(a, b) {
    a = key(a); b = key(b);
    if (a === b) return true;
    if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; for (let j = 1; j <= b.length; j++) d[i][j] = i ? 0 : j; }
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length] <= 1;
  }
  // no real word: one letter, no vowel at all, or the same letter again and again
  const junk = a => { const k = key(a); return k.length < 2 || !/[aeiouy]/.test(k) || /(.)\1\1/.test(k); };

  V.css(`
  .slf{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:12px;align-items:center}
  .slf-head{display:flex;align-items:center;gap:16px;justify-content:center}
  .slf-letter{width:clamp(70px,18vw,92px);aspect-ratio:1;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,var(--pink),var(--yellow));color:var(--ink);font:800 italic clamp(44px,12vw,62px)/1 var(--f-d);box-shadow:4px 4px 0 var(--cyan)}
  .slf-letter.spin{animation:slfspin .9s var(--ease)}
  .slf-letter.wait{background:var(--panel2);color:var(--fg);box-shadow:4px 4px 0 var(--line2)}
  .slf-letter.wait.tk{animation:slfcount .9s var(--ease)}
  @keyframes slfspin{0%{transform:rotate(-200deg) scale(.3)}70%{transform:rotate(10deg) scale(1.1)}}
  @keyframes slfcount{0%{transform:scale(1.35);opacity:.2}100%{transform:scale(1);opacity:1}}
  .slf-time{display:flex;flex-direction:column;gap:4px}
  .slf-time b{font:800 italic 34px/1 var(--f-d);font-variant-numeric:tabular-nums}
  .slf-time b.low{color:var(--bad);animation:clkp 1s steps(2) infinite}
  .slf-time small{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
  .slf-form{display:grid;grid-template-columns:auto 1fr;gap:8px 10px;width:100%;align-items:center}
  .slf-form label{font:800 italic 16px/1 var(--f-d);text-transform:uppercase;color:var(--muted)}
  .slf-form .inp{height:42px;min-width:0}
  .slf-form.off{opacity:.45}
  .slf-stop{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%);z-index:30;font:800 italic 64px/1 var(--f-d);color:#fff;text-shadow:4px 4px 0 var(--bad),0 0 30px var(--bad);pointer-events:none;animation:shout 1.3s var(--spring) forwards}
  .slf-tab{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:14px}
  .slf-tab th,.slf-tab td{padding:7px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
  .slf-tab tr:last-child td{border-bottom:0}
  .slf-tab th{font:700 italic 12px/1.1 var(--f-d);letter-spacing:.06em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .slf-tab th:first-child{width:24%}
  .slf-tab td.c{font:800 italic 12px/1.1 var(--f-d);text-transform:uppercase;color:var(--muted);overflow-wrap:anywhere;hyphens:auto}
  .slf-tab td.a{cursor:var(--cur-p,pointer);overflow-wrap:break-word;hyphens:auto;line-height:1.25}
  .slf-tab td.a.nil{color:var(--dim);cursor:default}
  .slf-tab td.a.x{text-decoration:line-through;color:var(--bad)}
  .slf-tab td.a.own{cursor:default}
  .slf-tab td.a i{font-style:normal;font-size:11px;font-weight:800;margin-left:4px;text-decoration:none;display:inline-block}
  .slf-tab td.a i.ok{color:var(--good)} .slf-tab td.a i.q{color:var(--yellow)}
  .slf-tab td.a em{font-style:normal;font:800 italic 13px/1 var(--f-d);margin-left:6px;color:var(--good);display:inline-block;text-decoration:none}
  .slf-tab td.a.x em{color:var(--bad)}
  .slf-tab tr.sum td{background:var(--panel2);font:800 italic 15px/1 var(--f-d);color:var(--muted)}
  .slf-tab tr.tot td{background:var(--panel2);font:800 italic 18px/1 var(--f-d)}
  .slf-note{color:var(--muted);font-size:13px;text-align:center;margin:0}
  .slf-note i{font-style:normal;font-weight:800} .slf-note i.ok{color:var(--good)} .slf-note i.q{color:var(--yellow)}
  @media (max-width:480px){
    .slf-tab{font-size:13px} .slf-tab th,.slf-tab td{padding:6px 4px} .slf-tab th{font-size:11px;letter-spacing:.02em}
    .slf-tab td.c{font-size:10.5px} .slf-tab th:first-child{width:22%}
    .slf-tab td.a em{display:block;margin:3px 0 0}
  }`);

  V.register({
    id: 'slf', name: 'Stadt Land Fluss', cat: 'Klassiker', order: 9, accent: '#ffd84f', party: true, noAI: true, noFirst: true,
    short: 'Buchstabe, Stopp, Punkte. Bis zu 4.',
    desc: 'Ein Buchstabe wird ausgelost, alle schreiben gleichzeitig eine Stadt, ein Land, einen Fluss und mehr damit. Wer fertig ist, ruft Stopp. Danach streicht ihr gemeinsam, was nicht zählt. Für 2 bis 4, online oder reihum am selben Gerät.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    keys: [['Tab', 'Nächstes Feld'], ['Enter', 'Fertig']],
    options: [{ id: 'n', label: 'Mitspieler', group: 'players', inline: 'local', live: false, def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] },
      { id: 'rounds', label: 'Runden', group: 'rules', short: v => `${v} Runden`, def: 3, choices: [[1, '1'], [3, '3'], [5, '5'], [7, '7'], [10, '10']] },
      { id: 'stop', label: 'Nach Stopp', group: 'rules', desc: 'So lange dürfen die anderen noch schreiben, wenn jemand fertig ist. Bei „Kein Stopp“ läuft die Zeit für alle bis zum Ende.', short: v => +v === 10 ? '' : +v ? `Stopp ${v} s` : 'Kein Stopp', def: 10, choices: [[5, '5 s'], [10, '10 s'], [20, '20 s'], [0, 'Kein Stopp']] },
      { id: 'time', label: 'Zeit pro Runde', group: 'time', short: v => v >= 120 ? `${v / 60} Min.` : `${v} s`, def: 90, choices: [[45, '45 s'], [60, '60 s'], [90, '90 s'], [120, '2 Min.'], [180, '3 Min.']] }],
    extraOpts: ['cats'], panelExtra,
    localHint: 'Am selben Gerät schreibt jeder für sich, das Handy wird nach jedem weitergegeben.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="6" y="5" width="36" height="38" rx="5" fill="#f3e6cc" stroke="#b9952a" stroke-width="2"/><path d="M12 15h24M12 23h24M12 31h24" stroke="#b9952a" stroke-width="1.6"/><rect x="26" y="26" width="18" height="18" rx="5" fill="#ff4fd8"/><text x="35" y="40" text-anchor="middle" font-size="14" font-weight="800" fill="#08090f" font-family="Arial">B</text><text x="12" y="13" font-size="6" fill="#5d3a1c" font-family="Arial" font-weight="700">STADT LAND</text></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Ein <b>Buchstabe</b> wird ausgelost: erst zählt es <b>3, 2, 1</b> herunter, dann seht ihr ihn alle gleichzeitig. Schreib zu jeder Spalte etwas, das damit anfängt, zum Beispiel <b>Stadt, Land, Fluss, Tier, Name, Beruf</b>. Welche Spalten es gibt, legt ihr vorher im Spiel-Panel fest, auch eigene.' },
      { t: 'Stopp!', d: 'Bist du fertig, tippe <b>Stopp</b>. Die anderen haben dann noch ein paar Sekunden (im Spiel-Panel: 5, 10, 20 oder kein Stopp). Spätestens wenn die Zeit abläuft, ist die Runde vorbei.' },
      { t: 'Der Computer prüft', d: 'Vor dem Streichen schaut der Computer drüber: Falscher Anfangsbuchstabe ist raus, Buchstabensalat wie „wxyz“ ist schon zum Streichen markiert. Antworten aus seinen Listen (Städte, Länder, Flüsse, Tiere, Namen, Berufe …) bekommen ein grünes <b>✓</b>, unbekannte ein gelbes <b>?</b>. Die schaut ihr euch genauer an.' },
      { t: 'Streichen', d: 'Danach seht ihr alle Antworten. <b>Tippe auf eine Antwort</b>, die nicht zählt. Gestrichen wird sie, wenn <b>mehr als die Hälfte</b> der anderen sie streicht, eine Antwort mit ✓ nur, wenn <b>alle</b> anderen sie streichen. Dann <b>Weiter</b>.' },
      { t: 'Punkte', d: '<b>20</b>: nur du hast in der Spalte eine gültige Antwort. <b>10</b>: deine Antwort hat sonst niemand. <b>5</b>: jemand hat dasselbe (auch mit anderer Schreibweise oder einem Tippfehler). Nach allen Runden gewinnt, wer die meisten Punkte hat.' },
      { t: 'Am selben Handy', d: 'Spielt ihr an einem Gerät, schreibt jeder nacheinander für sich, dann wird gemeinsam gestrichen. Die Zeit pro Runde stellt ihr im Spiel-Panel ein.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng, local = ctx.mode === 'local';
      const CATS = pickCats(ctx.opts.cats);
      // seconds to write (older tables without the option: 90 online, 60 per person at one device)
      const T = [45, 60, 90, 120, 180].includes(+ctx.opts.time) ? +ctx.opts.time : local ? 60 : WRITE;
      const rounds = [1, 3, 5, 7, 10].includes(+ctx.opts.rounds) ? +ctx.opts.rounds : 3;
      const STOPS = ctx.opts.stop == null || ![0, 5, 10, 20].includes(+ctx.opts.stop) ? STOP : +ctx.opts.stop;
      const total = {}; P.forEach(p => { total[p] = 0; });
      let round = 0, letter = '', phase = '', ans = {}, votes = {}, deadline = 0, stopAt = 0, startAt = 0, shown = -1, sent = false, voted = false, over = false, tick = null, writer = 0;
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
        // a short countdown first, so nobody sees the letter before the others
        startAt = Date.now() + COUNT * 1000; deadline = startAt + T * 1000;
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
        ctx.handoff(p, `Gleich zählt es herunter, dann siehst du den Buchstaben. Du hast ${T} Sekunden.`, () => {
          writer = p; sent = false; stopAt = 0; startAt = Date.now() + COUNT * 1000; deadline = startAt + T * 1000;
          writeUI();
        });
      }
      function writeUI() {
        const p = me();
        shown = -1;
        wrap.innerHTML = `<div class="slf-head"><div class="slf-letter wait" id="slfl">${COUNT}</div><div class="slf-time"><small id="slfw">Gleich geht's los</small><b id="slft">${T}</b></div></div>
          <form class="slf-form off" id="slff">${CATS.map((c, i) => `<label for="slf${i}">${esc(c)}</label><input class="inp" id="slf${i}" maxlength="40" autocomplete="off" autocapitalize="words" spellcheck="false" disabled placeholder="…">`).join('')}</form>
          <button class="btn primary big" id="slfs" disabled><span>Stopp! Fertig</span></button><p class="slf-note" id="slfn"></p>`;
        const f = wrap.querySelector('#slff');
        f.onsubmit = e => e.preventDefault();
        f.querySelectorAll('input').forEach((x, i, all) => x.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); else send(); } }));
        wrap.querySelector('#slfs').onclick = send;
        clearInterval(tick); tick = setInterval(timer, 100); timer();
      }
      // the letter shows when the countdown is over: inputs open, the clock starts
      function reveal() {
        const p = me(), l = wrap.querySelector('#slfl'), f = wrap.querySelector('#slff');
        if (!l || !f) return;
        l.className = 'slf-letter spin'; l.textContent = letter;
        const w = wrap.querySelector('#slfw'); if (w) w.textContent = local ? ctx.name(p) + ' schreibt' : 'Zeit';
        f.classList.remove('off');
        f.querySelectorAll('input').forEach(x => { x.disabled = false; x.placeholder = letter + ' …'; });
        wrap.querySelector('#slfs').disabled = false;
        V.sfx.go();
        if (!V.coarse) { const x = f.querySelector('input'); if (x) x.focus(); }
      }
      function timer() {
        if (!ctx.alive() || phase !== 'write') return clearInterval(tick);
        const now = Date.now();
        if (now < startAt) {
          const n = Math.ceil((startAt - now) / 1000);
          if (n !== shown) { shown = n; const l = wrap.querySelector('#slfl'); if (l) { l.textContent = n; l.classList.remove('tk'); void l.offsetWidth; l.classList.add('tk'); } V.sfx.tick(); }
          return;
        }
        if (shown !== 0) { shown = 0; reveal(); }
        const end = stopAt ? Math.min(deadline, stopAt) : deadline, left = Math.max(0, Math.ceil((end - now) / 1000));
        const t = wrap.querySelector('#slft'); if (t) { t.textContent = left; t.classList.toggle('low', left <= 10); }
        if (left <= 0 && !sent) send();
      }
      function send() {
        if (sent || phase !== 'write' || Date.now() < startAt) return;
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
          if (!m.bot && !stopAt && !local && s !== me()) {
            if (STOPS) {
              stopAt = Date.now() + STOPS * 1000;
              const el = V.el('div', 'slf-stop', 'Stopp!'); document.body.appendChild(el); setTimeout(() => el.remove(), 1400); V.sfx.go(); ctx.status(`${ctx.who(s)} ruft Stopp! Noch ${STOPS} Sekunden`);
            } else ctx.status(`${ctx.who(s)} ist fertig`);
          } else if (!m.bot && !stopAt && !local && STOPS) stopAt = Date.now() + STOPS * 1000;
          if (P.every(p => ans[p])) return voteUI();
          if (local) nextWriter();
          return;
        }
        if (m.v && phase === 'vote' && !votes[s]) {
          votes[s] = m.v.filter(k => typeof k === 'string').slice(0, 40);
          const need = local ? [P[0]] : people();
          if (need.every(p => votes[p])) scoreRound();
          else drawVote();
        }
      });
      // an answer counts if it starts with the letter, is not empty, and not enough others struck it
      const starts = a => norm(a).startsWith(letter.toLowerCase()) || (letter === 'A' && /^ä/.test(norm(a))) || (letter === 'O' && /^ö/.test(norm(a))) || (letter === 'U' && /^ü/.test(norm(a)));
      const mine = new Set();
      // what the computer says about each answer: 'x' wrong letter (always out), 'j' gibberish (suggested for striking),
      // 'ok' in its lists, 'q' a category it has a list for but doesn't know the answer, '' no list for the category
      let check = {};
      function voteUI() {
        clearInterval(tick); phase = 'vote'; mine.clear(); check = {};
        P.forEach(p => CATS.forEach((c, ci) => {
          const a = ans[p][ci], k = p + ':' + ci; if (!norm(a)) return;
          const kn = known(c, a);
          check[k] = !starts(a) ? 'x' : junk(a) ? 'j' : kn ? 'ok' : kn === false ? 'q' : '';
          if (check[k] === 'x' || check[k] === 'j') mine.add(k);
        }));
        V.sfx.goal(); drawVote();
      }
      const mark = k => check[k] === 'ok' ? '<i class="ok" title="Kennt der Computer">✓</i>' : check[k] === 'q' ? '<i class="q" title="Kennt der Computer nicht">?</i>' : '';
      function drawVote() {
        const viewer = local ? 0 : me();
        const waiting = !local && voted;
        wrap.innerHTML = `<div class="slf-head"><div class="slf-letter">${letter}</div><div class="slf-time"><small>Runde ${round}</small><b>Streichen</b></div></div>
          <table class="slf-tab" lang="de"><tr><th></th>${P.map(p => `<th class="c${p}">${p === viewer ? 'Du' : ctx.name(p)}</th>`).join('')}</tr>
          ${CATS.map((c, ci) => `<tr><td class="c">${esc(c)}</td>${P.map(p => { const a = ans[p][ci], k = p + ':' + ci; return `<td class="a${!norm(a) ? ' nil' : ''}${mine.has(k) ? ' x' : ''}${p === viewer || check[k] === 'x' ? ' own' : ''}" data-k="${k}">${norm(a) ? esc(a) + mark(k) : '–'}</td>`; }).join('')}</tr>`).join('')}</table>
          <p class="slf-note">${waiting ? 'Warte auf die anderen …' : `Tippe auf Antworten, die nicht zählen. <i class="ok">✓</i> kennt der Computer, <i class="q">?</i> kennt er nicht. Falscher Anfangsbuchstabe ist schon gestrichen.`}</p>
          ${waiting ? '' : '<button class="btn primary big" id="slfv"><span>Weiter</span></button>'}`;
        wrap.querySelectorAll('td.a').forEach(td => td.onclick = () => {
          if (waiting || td.classList.contains('nil') || td.classList.contains('own')) return;
          const k = td.dataset.k; mine.has(k) ? mine.delete(k) : mine.add(k); td.classList.toggle('x'); V.sfx.tick();
        });
        const b = wrap.querySelector('#slfv'); if (b) b.onclick = () => { if (voted) return; voted = true; ctx.submit({ v: [...mine], r: round }, local ? P[0] : me()); if (!local) drawVote(); };
      }

      function scoreRound() {
        phase = 'score';
        const voters = local ? [P[0]] : people();
        // one device: what was struck there counts. Online the others decide: more than half of them have to strike an
        // answer (2 players: the other one, 3: both others, 4: two of three); one the computer knows only goes if all do
        const bad = k => {
          if (local) return votes[P[0]].includes(k);
          const p = +k.split(':')[0], others = voters.filter(v => v !== p), n = others.filter(v => votes[v].includes(k)).length;
          if (!others.length) return check[k] === 'j';
          return check[k] === 'ok' ? n === others.length : n * 2 > others.length;
        };
        const pts = {}; P.forEach(p => { pts[p] = CATS.map(() => 0); });
        CATS.forEach((_, c) => {
          const ok = P.filter(p => norm(ans[p][c]) && starts(ans[p][c]) && !bad(p + ':' + c));
          ok.forEach(p => { const dup = ok.some(q => q !== p && same(ans[q][c], ans[p][c])); pts[p][c] = ok.length === 1 ? 20 : dup ? 5 : 10; });
        });
        const sum = {}; P.forEach(p => { sum[p] = pts[p].reduce((a, b) => a + b, 0); total[p] += sum[p]; });
        const viewer = local ? 0 : me();
        wrap.innerHTML = `<div class="slf-head"><div class="slf-letter">${letter}</div><div class="slf-time"><small>Runde ${round}</small><b>Punkte</b></div></div>
          <table class="slf-tab" lang="de"><tr><th></th>${P.map(p => `<th class="c${p}">${p === viewer ? 'Du' : ctx.name(p)}</th>`).join('')}</tr>
          ${CATS.map((c, ci) => `<tr><td class="c">${esc(c)}</td>${P.map(p => { const a = ans[p][ci]; return `<td class="a own${!norm(a) ? ' nil' : !pts[p][ci] ? ' x' : ''}">${norm(a) ? esc(a) : '–'}<em>${norm(a) ? pts[p][ci] : ''}</em></td>`; }).join('')}</tr>`).join('')}
          <tr class="sum"><td class="c">Runde</td>${P.map(p => `<td class="c${p}">+${sum[p]}</td>`).join('')}</tr>
          <tr class="tot"><td class="c">Gesamt</td>${P.map(p => `<td class="c${p}">${total[p]}</td>`).join('')}</tr></table>
          <p class="slf-note">20 nur du · 10 eigene Antwort · 5 doppelt</p>`;
        scoreLine(); V.sfx.win();
        ctx.later(newRound, round >= rounds ? 4000 : 8000);
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
