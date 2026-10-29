(function () {
  // Schätzfragen for 2-4: everybody types a number at the same time, whoever is closest gets 3 points
  // (with 3+ players the second closest 1), a direct hit 2 more. The AI guesses with an error that shrinks per level.
  // Uses ctx.listen/ctx.submit: { g: number or null, r } one answer per round.
  // Questions: [German, English, answer, unit de, unit en, 'y' for years (exact hits, the AI is off by years)]
  const Q = [
    ['Wie hoch ist der Großglockner?', 'How high is the Grossglockner, Austria\'s highest mountain?', 3798, 'm', 'm'],
    ['Wie hoch ist der Mount Everest?', 'How high is Mount Everest?', 8849, 'm', 'm'],
    ['Wie hoch ist die Zugspitze?', 'How high is the Zugspitze?', 2962, 'm', 'm'],
    ['Wie hoch ist der Mont Blanc?', 'How high is Mont Blanc?', 4806, 'm', 'm'],
    ['Wie hoch ist das Matterhorn?', 'How high is the Matterhorn?', 4478, 'm', 'm'],
    ['Wie hoch ist der Eiffelturm mit Antennen?', 'How tall is the Eiffel Tower including its antennas?', 330, 'm', 'm'],
    ['Wie hoch ist der Burj Khalifa in Dubai?', 'How tall is the Burj Khalifa in Dubai?', 828, 'm', 'm'],
    ['Wie hoch ist der Südturm des Wiener Stephansdoms?', 'How tall is the south tower of St. Stephen\'s Cathedral in Vienna?', 136, 'm', 'm'],
    ['Wie hoch ist das Riesenrad im Wiener Prater?', 'How tall is the Ferris wheel in Vienna\'s Prater?', 65, 'm', 'm'],
    ['Wie hoch ist die Freiheitsstatue samt Sockel?', 'How tall is the Statue of Liberty including its pedestal?', 93, 'm', 'm'],
    ['Wie lang ist die Donau?', 'How long is the Danube?', 2850, 'km', 'km'],
    ['Wie lang ist der Rhein?', 'How long is the Rhine?', 1230, 'km', 'km'],
    ['Wie lang ist der Nil?', 'How long is the Nile?', 6650, 'km', 'km'],
    ['Wie lang ist der Gotthard-Basistunnel?', 'How long is the Gotthard Base Tunnel?', 57, 'km', 'km'],
    ['Wie lang ist der Eurotunnel unter dem Ärmelkanal?', 'How long is the Channel Tunnel?', 50, 'km', 'km'],
    ['Wie lang ist die Golden Gate Bridge insgesamt?', 'How long is the Golden Gate Bridge in total?', 2737, 'm', 'm'],
    ['Wie tief ist der Marianengraben an der tiefsten Stelle?', 'How deep is the Mariana Trench at its deepest point?', 10994, 'm', 'm'],
    ['Wie lang ist die Großglockner-Hochalpenstraße?', 'How long is the Grossglockner High Alpine Road?', 48, 'km', 'km'],
    ['Wie viele Meter stürzen die Krimmler Wasserfälle insgesamt hinab?', 'How many metres do the Krimml Waterfalls drop in total?', 380, 'm', 'm'],
    ['Wie groß ist der Bodensee?', 'How large is Lake Constance?', 536, 'km²', 'km²'],
    ['Wie groß ist Österreich?', 'How large is Austria?', 83879, 'km²', 'km²'],
    ['Wie viele Menschen leben in Österreich?', 'How many people live in Austria?', 9.2, 'Millionen', 'million'],
    ['Wie viele Menschen leben in Deutschland?', 'How many people live in Germany?', 84, 'Millionen', 'million'],
    ['Wie viele Menschen leben in Wien?', 'How many people live in Vienna?', 2, 'Millionen', 'million'],
    ['Wie viele Menschen leben auf der Erde?', 'How many people live on Earth?', 8.2, 'Milliarden', 'billion'],
    ['Wie viele Menschen leben in Liechtenstein?', 'How many people live in Liechtenstein?', 40000, '', ''],
    ['Wie viele Länder gehören zur EU?', 'How many countries are in the EU?', 27, '', ''],
    ['Wie viele Staaten sind Mitglied der UNO?', 'How many states are members of the UN?', 193, '', ''],
    ['Wie viele Länder gibt es in Afrika?', 'How many countries are there in Africa?', 54, '', ''],
    ['Wie viele Nachbarländer hat Österreich?', 'How many neighbouring countries does Austria have?', 8, '', ''],
    ['Wie viele Nachbarländer hat Deutschland?', 'How many neighbouring countries does Germany have?', 9, '', ''],
    ['Wie viele Sterne hat die Flagge der EU?', 'How many stars are on the EU flag?', 12, '', ''],
    ['Wie viele Sprachen gibt es auf der Welt ungefähr?', 'Roughly how many languages are spoken in the world?', 7000, '', ''],
    ['Wie weit ist der Mond im Schnitt von der Erde entfernt?', 'How far is the Moon from Earth on average?', 384400, 'km', 'km'],
    ['Wie weit ist die Sonne von der Erde entfernt?', 'How far is the Sun from Earth?', 150, 'Millionen km', 'million km'],
    ['Wie groß ist der Durchmesser der Erde?', 'What is the diameter of the Earth?', 12742, 'km', 'km'],
    ['Wie lang ist der Äquator?', 'How long is the equator?', 40075, 'km', 'km'],
    ['Wie schnell ist das Licht?', 'How fast is light?', 299792, 'km pro Sekunde', 'km per second'],
    ['Wie schnell ist der Schall in der Luft?', 'How fast is sound in air?', 343, 'm pro Sekunde', 'm per second'],
    ['Wie viele Minuten braucht das Sonnenlicht bis zur Erde?', 'How many minutes does sunlight take to reach Earth?', 8.3, 'Minuten', 'minutes'],
    ['Wie viele Tage dauert ein Jahr auf dem Mars?', 'How many days does a year on Mars last?', 687, 'Tage', 'days'],
    ['Wie viele Monde hat der Mars?', 'How many moons does Mars have?', 2, '', ''],
    ['Wie hoch fliegt die Raumstation ISS?', 'How high does the ISS space station fly?', 400, 'km', 'km'],
    ['Wie oft umkreist die ISS die Erde an einem Tag?', 'How many times a day does the ISS orbit the Earth?', 16, 'mal', 'times'],
    ['Wie heiß ist die Oberfläche der Sonne?', 'How hot is the surface of the Sun?', 5500, '°C', '°C'],
    ['Bei wie viel Grad Fahrenheit kocht Wasser?', 'At how many degrees Fahrenheit does water boil?', 212, '°F', '°F'],
    ['Wie viele Knochen hat ein erwachsener Mensch?', 'How many bones does an adult human have?', 206, '', ''],
    ['Wie viele Zähne hat ein Erwachsener mit Weisheitszähnen?', 'How many teeth does an adult have, wisdom teeth included?', 32, '', ''],
    ['Wie viele Liter Blut hat ein Erwachsener?', 'How many litres of blood does an adult have?', 5, 'Liter', 'litres'],
    ['Wie viele Muskeln hat der Mensch ungefähr?', 'Roughly how many muscles does the human body have?', 650, '', ''],
    ['Wie viele Herzen hat ein Oktopus?', 'How many hearts does an octopus have?', 3, '', ''],
    ['Wie viele Beine hat ein Hummer?', 'How many legs does a lobster have?', 10, '', ''],
    ['Wie schwer wird ein afrikanischer Elefantenbulle?', 'How heavy does an African bull elephant get?', 6000, 'kg', 'kg'],
    ['Wie viele Monate ist eine Elefantenkuh trächtig?', 'How many months is an elephant pregnant?', 22, 'Monate', 'months'],
    ['Wie viele Tasten hat ein Klavier?', 'How many keys does a piano have?', 88, '', ''],
    ['Wie viele Felder hat ein Schachbrett?', 'How many squares does a chessboard have?', 64, '', ''],
    ['Wie viele Punkte hat ein Go-Brett mit 19 × 19 Linien?', 'How many points does a 19 × 19 Go board have?', 361, '', ''],
    ['Wie viele Augen hat ein Würfel zusammen?', 'How many pips does a die have in total?', 21, '', ''],
    ['Wie viele farbige Felder hat ein 3 × 3 Zauberwürfel?', 'How many coloured squares does a 3 × 3 puzzle cube have?', 54, '', ''],
    ['Wie viele Felder hat ein Sudoku?', 'How many cells does a sudoku have?', 81, '', ''],
    ['Wie viele Minuten hat ein Tag?', 'How many minutes are in a day?', 1440, '', ''],
    ['Wie viele Sekunden hat eine Stunde?', 'How many seconds are in an hour?', 3600, '', ''],
    ['Wie viele Stunden hat eine Woche?', 'How many hours are in a week?', 168, '', ''],
    ['Wie lang ist ein Marathon?', 'How long is a marathon?', 42.195, 'km', 'km'],
    ['Wie lang ist ein Fußballfeld bei einer WM?', 'How long is a football pitch at a World Cup?', 105, 'm', 'm'],
    ['Wie hoch hängt ein Basketballkorb?', 'How high is a basketball hoop?', 305, 'cm', 'cm'],
    ['Wie hoch ist ein Tennisnetz in der Mitte?', 'How high is a tennis net in the middle?', 91.4, 'cm', 'cm'],
    ['Wie schwer ist ein Fußball?', 'How heavy is a football?', 430, 'g', 'g'],
    ['Was ist der Weltrekord über 100 m bei den Männern?', 'What is the men\'s 100 m world record?', 9.58, 'Sekunden', 'seconds'],
    ['Was ist der Weltrekord im Weitsprung der Männer?', 'What is the men\'s long jump world record?', 8.95, 'm', 'm'],
    ['Was ist der Weltrekord im Hochsprung der Männer?', 'What is the men\'s high jump world record?', 2.45, 'm', 'm'],
    ['Wie viele Stufen hat der Eiffelturm bis zur Spitze?', 'How many steps lead to the top of the Eiffel Tower?', 1665, '', ''],
    ['Wie viele Räume hat Schloss Schönbrunn?', 'How many rooms does Schönbrunn Palace have?', 1441, '', ''],
    ['Wie viele Pokémon gab es in der ersten Generation?', 'How many Pokémon were there in the first generation?', 151, '', ''],
    ['Wie alt wurde Mozart?', 'How old was Mozart when he died?', 35, 'Jahre', 'years'],
    ['In welchem Jahr landeten zum ersten Mal Menschen auf dem Mond?', 'In which year did people first land on the Moon?', 1969, '', '', 'y'],
    ['In welchem Jahr fiel die Berliner Mauer?', 'In which year did the Berlin Wall fall?', 1989, '', '', 'y'],
    ['In welchem Jahr wurde die Berliner Mauer gebaut?', 'In which year was the Berlin Wall built?', 1961, '', '', 'y'],
    ['In welchem Jahr sank die Titanic?', 'In which year did the Titanic sink?', 1912, '', '', 'y'],
    ['In welchem Jahr kam das erste iPhone heraus?', 'In which year did the first iPhone come out?', 2007, '', '', 'y'],
    ['In welchem Jahr wurde Google gegründet?', 'In which year was Google founded?', 1998, '', '', 'y'],
    ['In welchem Jahr wurde Mozart geboren?', 'In which year was Mozart born?', 1756, '', '', 'y'],
    ['In welchem Jahr wurde Beethoven geboren?', 'In which year was Beethoven born?', 1770, '', '', 'y'],
    ['In welchem Jahr wurde der Mount Everest zum ersten Mal bestiegen?', 'In which year was Mount Everest first climbed?', 1953, '', '', 'y'],
    ['In welchem Jahr wurde der Österreichische Staatsvertrag unterschrieben?', 'In which year was the Austrian State Treaty signed?', 1955, '', '', 'y'],
    ['In welchem Jahr fand die erste Fußball-WM statt?', 'In which year was the first football World Cup?', 1930, '', '', 'y'],
    ['In welchem Jahr wurde das Wiener Riesenrad eröffnet?', 'In which year did the Vienna Ferris wheel open?', 1897, '', '', 'y'],
    ['In welchem Jahr wurde der Eiffelturm eröffnet?', 'In which year did the Eiffel Tower open?', 1889, '', '', 'y'],
    ['In welchem Jahr wurde Coca-Cola erfunden?', 'In which year was Coca-Cola invented?', 1886, '', '', 'y'],
    ['In welchem Jahr wurde Tetris erfunden?', 'In which year was Tetris invented?', 1984, '', '', 'y'],
    ['In welchem Jahr erreichte Kolumbus Amerika?', 'In which year did Columbus reach America?', 1492, '', '', 'y'],
    ['In welchem Jahr kamen die Euro-Scheine und -Münzen?', 'In which year did euro notes and coins arrive?', 2002, '', '', 'y'],
    ['In welchem Jahr fanden die ersten Olympischen Spiele der Neuzeit statt?', 'In which year were the first modern Olympic Games?', 1896, '', '', 'y'],
    ['In welchem Jahr flogen die Brüder Wright zum ersten Mal?', 'In which year did the Wright brothers first fly?', 1903, '', '', 'y'],
    ['In welchem Jahr endete der Zweite Weltkrieg in Europa?', 'In which year did the Second World War end in Europe?', 1945, '', '', 'y']
  ];
  const TIME = 25;
  const en = () => V.lang === 'en';
  // German "1.441" or "3,5", English "1,441" or "3.5"
  function parse(s) {
    s = String(s || '').replace(/[\s'’]/g, '');
    if (!s) return null;
    if (en()) s = s.replace(/,/g, '');
    else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isFinite(n) && n >= 0 && n < 1e12 ? n : null;
  }
  const fmt = n => n == null ? '–' : Number(n).toLocaleString(V.locale(), { maximumFractionDigits: 3 });
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
  // AI guesses: years a few years off, other numbers off by a factor; rounded the way people guess
  function botGuess(q, L) {
    const a = q[2];
    if (q[5] === 'y') return Math.round(a + gauss() * [40, 18, 7, 2.5][L]);
    let g = a * Math.exp(gauss() * [0.7, 0.4, 0.2, 0.08][L]);
    if (a < 30 && Number.isInteger(a)) return Math.max(0, Math.round(g));
    if (!Number.isInteger(a)) return Math.round(g * (a < 10 ? 100 : 10)) / (a < 10 ? 100 : 10);
    const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(g)) - 1));
    return Math.round(g / p) * p;
  }
  // a direct hit: the exact year, else within 1 %
  const hit = (q, g) => g != null && (q[5] === 'y' ? g === q[2] : Math.abs(g - q[2]) <= Math.abs(q[2]) * 0.01);

  V.css(`
  .gq{width:min(var(--bw),600px);display:flex;flex-direction:column;gap:14px;align-items:center}
  .gq-top{display:flex;align-items:center;justify-content:space-between;width:100%;gap:12px}
  .gq-n{font:800 italic 14px/1 var(--f-d);color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
  .gq-t{font:800 italic 30px/1 var(--f-d);font-variant-numeric:tabular-nums}
  .gq-t.low{color:var(--bad);animation:clkp 1s steps(2) infinite}
  .gq-q{width:100%;padding:18px 16px;border-radius:16px;background:linear-gradient(135deg,rgba(255,79,216,.16),rgba(255,216,79,.12));border:1px solid var(--line);font:800 italic clamp(20px,5.4vw,28px)/1.2 var(--f-d);text-align:center;color:var(--fg)}
  .gq-q.in{animation:gqin .5s var(--spring)}
  @keyframes gqin{from{transform:translateY(14px) scale(.96);opacity:0}}
  .gq-form{display:flex;gap:10px;width:100%;align-items:center}
  .gq-form .inp{flex:1;height:54px;font:800 italic 26px/1 var(--f-d);text-align:center}
  .gq-form .unit{font:800 italic 18px/1 var(--f-d);color:var(--muted);min-width:24px}
  .gq-note{color:var(--muted);font-size:13px;text-align:center;margin:0;min-height:18px}
  .gq-line{position:relative;width:100%;height:96px;margin:6px 0 4px}
  .gq-line .ax{position:absolute;left:4%;right:4%;top:58px;height:4px;border-radius:2px;background:var(--line)}
  .gq-mk{position:absolute;top:58px;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;transition:left .9s var(--ease);font:800 italic 13px/1 var(--f-d);white-space:nowrap}
  .gq-mk i{width:14px;height:14px;border-radius:50%;background:var(--pc);box-shadow:0 0 10px var(--pc);margin-bottom:-5px}
  .gq-mk b{color:var(--pc)}
  .gq-mk.tr{top:62px;transform:translate(-50%,0);z-index:2}
  .gq-mk.tr i{width:4px;height:26px;border-radius:2px;background:#fff;box-shadow:0 0 12px #fff;margin:0}
  .gq-mk.tr b{color:#fff;font-size:15px}
  .gq-ans{font:800 italic clamp(26px,8vw,40px)/1 var(--f-d);color:#fff;text-shadow:3px 3px 0 var(--pink)}
  .gq-ans small{font-size:.5em;color:var(--muted);text-shadow:none;margin-left:6px}
  .gq-res{width:100%;display:flex;flex-direction:column;gap:6px}
  .gq-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:var(--panel);border:1px solid var(--line);animation:gqin .4s var(--ease) backwards}
  .gq-row b{flex:1;font:800 italic 16px/1 var(--f-d)}
  .gq-row span{color:var(--muted);font-size:13px}
  .gq-row em{font:800 italic 18px/1 var(--f-d);font-style:normal;color:var(--good);min-width:34px;text-align:right}
  .gq-row.top{border-color:var(--good);box-shadow:0 0 0 1px var(--good)}
  .gq-row .bull{color:var(--yellow);font-weight:800}`);

  V.register({
    id: 'guess', name: 'Schätzfragen', cat: 'Klassiker', order: 10, accent: '#4fe3ff', party: true, noFirst: true,
    short: 'Wer schätzt am nächsten dran? Bis zu 4.',
    desc: 'Wie hoch ist der Großglockner, wann sank die Titanic? Alle tippen gleichzeitig eine Zahl. Wer am nächsten dran ist, holt die Punkte, ein Volltreffer gibt extra. Für 2 bis 4, gegen die KI, am selben Gerät oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Rät meistens ins Blaue.', 'Liegt oft in der Nähe.', 'Weiß ziemlich viel.', 'Liegt fast immer knapp daneben oder genau richtig.'],
    keys: [['Ziffern', 'Zahl eintippen'], ['Enter', 'Abgeben']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'rounds', label: 'Fragen', def: 7, choices: [[7, '7'], [12, '12']] }],
    localHint: 'Am selben Gerät tippt jeder für sich, das Handy wird nach jedem weitergegeben.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="4" y="30" width="40" height="4" rx="2" fill="#3a3f6b"/><circle cx="14" cy="27" r="5" fill="#ff4fd8"/><circle cx="33" cy="27" r="5" fill="#ffd84f"/><rect x="25" y="20" width="3" height="20" rx="1.5" fill="#fff"/><text x="24" y="15" text-anchor="middle" font-size="14" font-weight="800" fill="#4fe3ff" font-family="Arial">?</text></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Es kommt eine Frage, deren Antwort eine <b>Zahl</b> ist: eine Höhe, ein Jahr, eine Anzahl. Tipp deine Schätzung ein, du hast <b>' + TIME + ' Sekunden</b>.' },
      { t: 'Auflösung', d: 'Danach erscheinen alle Schätzungen und die richtige Antwort auf einem <b>Zahlenstrahl</b>. Wer am nächsten dran ist, bekommt <b>3 Punkte</b>, ab drei Spielern der Zweite <b>1 Punkt</b>.' },
      { t: 'Volltreffer', d: 'Triffst du genau (bei Jahren das richtige Jahr, sonst bis 1 % daneben), gibt es <b>2 Punkte extra</b>. Nach allen Fragen gewinnt, wer die meisten Punkte hat.' },
      { t: 'Am selben Handy', d: 'Spielt ihr an einem Gerät, tippt jeder nacheinander für sich, die anderen schauen weg. Aufgelöst wird für alle gemeinsam.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng, local = ctx.mode === 'local';
      const rounds = [7, 12].includes(+ctx.opts.rounds) ? +ctx.opts.rounds : 7;
      const total = {}; P.forEach(p => { total[p] = 0; });
      // the questions of this match, the same for everybody (shared random source)
      const order = Q.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      let round = 0, q = null, ans = {}, deadline = 0, sent = false, over = false, tick = null, writer = 0, phase = '';
      const wrap = V.el('div', 'gq'); ctx.stage.appendChild(wrap);
      const me = () => local ? writer : (ctx.mySide || 1);
      const CLR = { 1: 'var(--pink)', 2: 'var(--yellow)', 3: 'var(--cyan)', 4: 'var(--good)' };
      const text = () => en() ? q[1] : q[0], unit = () => en() ? q[4] : q[3];
      ctx.onCleanup(() => clearInterval(tick));
      const scoreLine = () => ctx.status(P.map(p => `<span class="c${p}">${ctx.name(p)} ${total[p]}</span>`).join(' · ') + ` <small>· Frage ${Math.min(round, rounds)} von ${rounds}</small>`);

      function next() {
        round++;
        if (round > rounds) return finish();
        q = Q[order[(round - 1) % order.length]]; ans = {}; sent = false; phase = 'ask';
        ctx.turn(0, false); scoreLine();
        if (local) { writer = 0; ctx.handReset(); return nextWriter(); }
        deadline = Date.now() + TIME * 1000;
        askUI();
        // the computer seats answer after a short think (the host sends them at a table)
        if (ctx.amHost()) P.filter(p => ctx.isBot(p)).forEach(p => ctx.later(() => { if (phase === 'ask' && !ans[p]) ctx.submit({ g: botGuess(q, ctx.level), r: round }, p); }, ctx.auto ? 0 : 1800 + Math.random() * 6000));
      }
      // one device: everybody types in turn, the others look away
      function nextWriter() {
        const p = P.find(x => !ans[x]);
        if (!p) return;
        if (ctx.isBot(p)) return ctx.submit({ g: botGuess(q, ctx.level), r: round }, p);
        ctx.handoff(p, `Frage ${round} von ${rounds}. Du hast ${TIME} Sekunden.`, () => { writer = p; sent = false; deadline = Date.now() + TIME * 1000; askUI(); });
      }
      function askUI() {
        wrap.innerHTML = `<div class="gq-top"><span class="gq-n">${local ? ctx.name(me()) + ' · ' : ''}Frage ${round} / ${rounds}</span><b class="gq-t" id="gqt">${TIME}</b></div>
          <div class="gq-q in" translate="no">${text()}</div>
          <form class="gq-form" id="gqf"><input class="inp" id="gqi" inputmode="decimal" autocomplete="off" maxlength="16" placeholder="?" aria-label="Deine Schätzung"><span class="unit" translate="no">${unit()}</span></form>
          <button class="btn primary big" id="gqs"><span>Abgeben</span></button><p class="gq-note" id="gqn"></p>`;
        const f = wrap.querySelector('#gqf'), inp = wrap.querySelector('#gqi');
        f.onsubmit = e => { e.preventDefault(); send(); };
        inp.addEventListener('input', () => { const n = parse(inp.value); wrap.querySelector('#gqn').textContent = inp.value && n == null ? 'Bitte nur eine Zahl' : n != null && n >= 1000 ? fmt(n) + ' ' + unit() : ''; });
        wrap.querySelector('#gqs').onclick = send;
        setTimeout(() => { if (ctx.alive() && !sent) inp.focus(); }, 80);
        clearInterval(tick); tick = setInterval(timer, 250); timer();
      }
      function timer() {
        if (!ctx.alive() || phase !== 'ask') return clearInterval(tick);
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        const t = wrap.querySelector('#gqt'); if (t) { t.textContent = left; t.classList.toggle('low', left <= 5); }
        if (left <= 0 && !sent) send(true);
        // a seat that went to the computer in the middle of a question gets its answer from the host
        if (!local && ctx.amHost() && Date.now() > deadline + 3000) P.filter(p => ctx.isBot(p) && !ans[p]).forEach(p => ctx.submit({ g: botGuess(q, ctx.level), r: round }, p));
      }
      function send(late) {
        if (sent || phase !== 'ask') return;
        const inp = wrap.querySelector('#gqi'), g = inp ? parse(inp.value) : null;
        if (g == null && !late) { V.sfx.bad(); const n = wrap.querySelector('#gqn'); if (n) n.textContent = 'Tipp zuerst eine Zahl ein'; return; }
        sent = true;
        wrap.querySelectorAll('input,#gqs').forEach(x => { x.disabled = true; });
        const n = wrap.querySelector('#gqn'); if (n) n.textContent = local ? '' : 'Abgegeben. Warte auf die anderen …';
        V.sfx.place();
        ctx.submit({ g, r: round }, me());
      }
      ctx.listen((s, m) => {
        if (over || !m || m.r !== round || phase !== 'ask' || ans[s]) return;
        ans[s] = { g: typeof m.g === 'number' && isFinite(m.g) ? m.g : null };
        if (P.every(p => ans[p])) return reveal();
        if (local) return nextWriter();
        if (s !== me()) { const waiting = P.filter(p => !ans[p]).length; ctx.status(`${ctx.who(s)} hat geschätzt${waiting ? ` · noch ${waiting}` : ''}`); }
      });
      function reveal() {
        clearInterval(tick); phase = 'reveal';
        const a = q[2], diff = p => ans[p].g == null ? Infinity : Math.abs(ans[p].g - a);
        // closest 3, second closest 1 (3+ players), a direct hit 2 more; ties share the place
        const pts = {}; P.forEach(p => { pts[p] = 0; });
        const ds = [...new Set(P.map(diff).filter(isFinite))].sort((x, y) => x - y);
        P.forEach(p => {
          const d = diff(p); if (!isFinite(d)) return;
          if (d === ds[0]) pts[p] += 3; else if (N >= 3 && d === ds[1]) pts[p] += 1;
          if (hit(q, ans[p].g)) pts[p] += 2;
        });
        P.forEach(p => { total[p] += pts[p]; });
        const vals = [a, ...P.map(p => ans[p].g).filter(g => g != null)];
        let lo = Math.min(...vals), hi = Math.max(...vals);
        if (hi === lo) { lo -= 1; hi += 1; }
        const pos = v => 6 + (v - lo) / (hi - lo) * 88;
        const ranked = P.slice().sort((x, y) => diff(x) - diff(y));
        wrap.innerHTML = `<div class="gq-top"><span class="gq-n">Frage ${round} / ${rounds}</span><b class="gq-t">✓</b></div>
          <div class="gq-q" translate="no">${text()}</div>
          <div class="gq-ans">${fmt(a)}<small translate="no">${unit()}</small></div>
          <div class="gq-line"><div class="ax"></div>${P.filter(p => ans[p].g != null).map((p, i) => `<div class="gq-mk" data-p="${p}" style="--pc:${CLR[p]};left:50%;margin-top:${-(i % 2) * 20}px"><b>${fmt(ans[p].g)}</b><i></i></div>`).join('')}<div class="gq-mk tr" style="left:${pos(a)}%"><i></i></div></div>
          <div class="gq-res">${ranked.map((p, i) => `<div class="gq-row${pts[p] >= 3 ? ' top' : ''}" style="animation-delay:${300 + i * 120}ms"><b class="c${p}">${ctx.name(p)}</b><span>${ans[p].g == null ? 'keine Antwort' : fmt(ans[p].g) + (hit(q, ans[p].g) ? ' <span class="bull">Volltreffer!</span>' : '')}</span><em>+${pts[p]}</em></div>`).join('')}</div>`;
        // the guesses slide from the middle to their place on the line
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.querySelectorAll('.gq-mk[data-p]').forEach(el => { el.style.left = pos(ans[+el.dataset.p].g) + '%'; })));
        const best = ranked.find(p => pts[p] >= 3);
        if (P.some(p => hit(q, ans[p].g))) V.sfx.found(); else V.sfx.goal();
        if (best && ctx.mode === 'ai' && best === 1) V.fx.pop(wrap.querySelector('.gq-ans'), 'fx-pop');
        scoreLine();
        ctx.later(next, ctx.fast() ? 30 : ctx.auto ? 300 : 5200);
      }
      function finish() {
        over = true; clearInterval(tick);
        const top = Math.max(...P.map(p => total[p])), ws = P.filter(p => total[p] === top);
        ctx.end(ws.length > 1 ? 0 : ws[0], P.map(p => total[p]).join(' : ') + ' Punkte');
      }
      next();
    }
  });
})();
