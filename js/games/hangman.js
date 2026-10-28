(function () {
  // Galgenmännchen for 2-4: every player gives a word once, the others guess letters in turn.
  // A right letter scores one point per hit and you go on; a wrong one adds to the gallows and the next one guesses.
  // Ten mistakes and the word giver scores. Moves: { w } the word (lightly encoded), { g: letter }, { s: word } solve.
  const WORDS = ('APFEL BANANE ZITRONE KIRSCHE ERDBEERE MELONE ANANAS KAROTTE TOMATE GURKE KARTOFFEL ZWIEBEL PAPRIKA BROKKOLI SPINAT ' +
    'HUND KATZE PFERD ELEFANT GIRAFFE PINGUIN DELFIN KROKODIL SCHILDKRÖTE HAMSTER KANINCHEN EICHHÖRNCHEN SCHMETTERLING MARIENKÄFER ' +
    'FLEDERMAUS EULE ADLER PAPAGEI KAMEL ZEBRA NASHORN NILPFERD KÄNGURU KOALA LÖWE TIGER WOLF FUCHS BÄR HIRSCH IGEL MAULWURF ' +
    'QUALLE HAI OKTOPUS SEESTERN KRABBE MUSCHEL SCHNECKE SPINNE AMEISE BIENE WESPE LIBELLE ' +
    'AUTO FAHRRAD MOTORRAD FLUGZEUG HUBSCHRAUBER RAKETE SCHIFF UBOOT STRASSENBAHN TRAKTOR BAGGER ROLLER SKATEBOARD ' +
    'HAUS SCHLOSS BURG TURM BRÜCKE KIRCHE SCHULE BAHNHOF FLUGHAFEN KRANKENHAUS BIBLIOTHEK MUSEUM STADION KINO THEATER ' +
    'FUSSBALL BASKETBALL TENNIS SCHWIMMEN TURNEN BOXEN SKIFAHREN SURFEN KLETTERN REITEN TANZEN ANGELN ' +
    'COMPUTER TASTATUR BILDSCHIRM HANDY KOPFHÖRER KAMERA FERNSEHER KONSOLE ROBOTER DRUCKER LAUTSPRECHER BATTERIE ' +
    'GITARRE KLAVIER TROMPETE GEIGE SCHLAGZEUG FLÖTE HARFE MIKROFON ' +
    'SONNE MOND STERN PLANET KOMET GALAXIE REGENBOGEN GEWITTER SCHNEEMANN LAWINE VULKAN WÜSTE DSCHUNGEL GLETSCHER INSEL ' +
    'BERG FLUSS MEER STRAND WALD WIESE HÖHLE WASSERFALL ' +
    'PIRAT RITTER PRINZESSIN ZAUBERER DRACHE GESPENST VAMPIR MUMIE HEXE EINHORN ZWERG RIESE ' +
    'ARZT LEHRER POLIZIST FEUERWEHR BÄCKER KOCH GÄRTNER PILOT ASTRONAUT DETEKTIV ' +
    'PIZZA NUDELN SPAGHETTI BURGER POMMES SCHOKOLADE KUCHEN KEKS PFANNKUCHEN BREZEL WÜRSTCHEN SALAT SUPPE MÜSLI ' +
    'TISCH STUHL SOFA BETT LAMPE SPIEGEL SCHRANK KÜHLSCHRANK WASCHMASCHINE STAUBSAUGER REGENSCHIRM KOFFER RUCKSACK ' +
    'BRILLE UHR SCHAL HANDSCHUH MÜTZE STIEFEL TURNSCHUH PULLOVER JACKE ' +
    'GEBURTSTAG WEIHNACHTEN OSTERHASE FEUERWERK KARNEVAL URLAUB ABENTEUER GEHEIMNIS SCHATZKARTE ' +
    'SCHACH DOMINO PUZZLE WÜRFEL KARTENSPIEL MURMEL TRAMPOLIN ACHTERBAHN KARUSSELL ' +
    'KAKTUS SONNENBLUME TULPE ROSE EICHE TANNE PILZ KLEEBLATT ' +
    'ZAHNBÜRSTE SEIFE HANDTUCH SCHERE KLEBSTOFF BLEISTIFT RADIERGUMMI LINEAL TAFEL KREIDE FÜLLER HEFT ' +
    'WELTRAUM SATELLIT TELESKOP MAGNET KOMPASS LANDKARTE GLOBUS ' +
    'KAFFEE LIMONADE MILCH ORANGENSAFT KAKAO ' +
    'LEUCHTTURM WINDMÜHLE ZELT LAGERFEUER HÄNGEMATTE BAUMHAUS SANDBURG').split(' ');
  const LIST = [...new Set(WORDS.filter(w => /^[A-ZÄÖÜ]{3,16}$/.test(w)))];
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split('');
  const FREQ = 'ENIRSATDHULCGMOBWFKZPVÜÄÖJYXQ';
  const MAX = 10;
  const enc = w => [...w].reverse().map(c => String.fromCharCode(c.charCodeAt(0) + 3)).join('');
  const dec = w => [...String(w)].map(c => String.fromCharCode(c.charCodeAt(0) - 3)).reverse().join('');
  const clean = s => String(s || '').toUpperCase().replace(/ß/g, 'SS').replace(/[^A-ZÄÖÜ]/g, '');

  const PARTS = [
    '<path d="M10 92h46"/>', '<path d="M24 92V8"/>', '<path d="M24 8h44"/>', '<path d="M24 24L40 8"/>', '<path d="M68 8v12"/>',
    '<circle cx="68" cy="28" r="8"/>', '<path d="M68 36v24"/>', '<path d="M68 42l-11 10M68 42l11 10"/>', '<path d="M68 60l-10 16"/>', '<path d="M68 60l10 16"/>'
  ];

  V.css(`
  .hm{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:12px;align-items:center}
  .hm-top{display:flex;gap:16px;align-items:center;width:100%;justify-content:center}
  .hm-gal{width:clamp(110px,28vw,150px);aspect-ratio:1;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:6px}
  .hm-gal svg{width:100%;height:100%;fill:none;stroke:#e7e9ff;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
  .hm-gal .part{opacity:0;transition:opacity .3s}
  .hm-gal .part.on{opacity:1;animation:hmdraw .4s var(--ease)}
  .hm-gal .part.on:nth-child(n+6){stroke:var(--bad)}
  @keyframes hmdraw{from{opacity:0;transform:translateY(-3px)}}
  .hm-info{display:flex;flex-direction:column;gap:6px;min-width:0}
  .hm-info b{font:800 italic 15px/1 var(--f-d);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .hm-info .miss{font:800 italic 30px/1 var(--f-d);color:var(--bad)}
  .hm-info .giver{font-size:13px;color:var(--muted)}
  .hm-word{display:flex;flex-wrap:wrap;gap:clamp(4px,1.2vw,8px);justify-content:center;padding:6px}
  .hm-word i{width:clamp(22px,6vw,36px);height:clamp(32px,8vw,46px);display:grid;place-items:end center;border-bottom:3px solid var(--line2);font:800 italic clamp(22px,6vw,32px)/1 var(--f-d);font-style:normal;color:var(--fg)}
  .hm-word i.on{animation:hmin .35s var(--spring);color:var(--good)} .hm-word i.lost{color:var(--bad)}
  @keyframes hmin{from{transform:scale(1.7);opacity:0}}
  .hm-keys{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;width:100%}
  .hm-keys button{height:clamp(36px,9vw,44px);border-radius:8px;background:var(--panel2);border:1px solid var(--line2);font:800 italic 18px/1 var(--f-d);color:var(--fg)}
  .hm-keys button:hover:not(:disabled){background:var(--panel3)}
  .hm-keys button.hit{background:color-mix(in srgb,var(--good) 30%,var(--panel));color:var(--good);border-color:var(--good)}
  .hm-keys button.miss{opacity:.3;text-decoration:line-through}
  .hm-keys button:disabled{cursor:default}
  .hm-solve{display:flex;gap:8px;width:100%}
  .hm-solve .inp{flex:1;text-transform:uppercase;letter-spacing:.1em}
  .hm-pick{display:flex;flex-direction:column;gap:10px;align-items:center;width:100%;padding:18px;border-radius:14px;background:var(--panel);border:1px solid var(--line)}
  .hm-pick h3{margin:0;font:800 italic 22px/1.1 var(--f-d);text-transform:uppercase}
  .hm-pick p{margin:0;color:var(--muted);text-align:center;font-size:14px}
  .hm-pick .inp{text-transform:uppercase;letter-spacing:.14em;text-align:center;font-size:20px}
  .hm-pick .row{display:flex;gap:8px;width:100%}
  .hm-pick .row .inp{flex:1}`);

  V.register({
    id: 'hangman', name: 'Galgenmännchen', cat: 'Klassiker', order: 8, accent: '#e7e9ff', party: true, noFirst: true,
    short: 'Wort ausdenken, Buchstaben raten.',
    desc: 'Reihum denkt sich einer ein Wort aus, die anderen raten Buchstabe für Buchstabe. Jeder Treffer bringt Punkte, jeder Fehler malt am Galgen weiter. Für 2 bis 4, am Gerät, gegen die KI oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    levelInfo: ['Rät ziemlich wild.', 'Rät die häufigsten Buchstaben zuerst.', 'Kennt viele Wörter und rät gezielt.', 'Kennt alle Wörter der Liste und löst früh.'],
    keys: [['A–Z, Ä Ö Ü', 'Buchstaben raten'], ['Enter', 'Wort abschicken']],
    options: [{ id: 'n', label: 'Spieler', def: 2, choices: [[2, '2'], [3, '3'], [4, '4']] }, { id: 'rounds', label: 'Wörter pro Person', def: 2, choices: [[1, '1'], [2, '2'], [3, '3']] }],
    localHint: 'Wer das Wort vorgibt, tippt es heimlich ein, die anderen raten reihum am selben Gerät.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round"><path d="M6 43h20M12 43V6h20v6M12 14l8-8" stroke="#e7e9ff" stroke-width="3"/><circle cx="32" cy="17" r="5" stroke="#ff5d73" stroke-width="2.6"/><path d="M32 22v11M32 25l-6 5M32 25l6 5M32 33l-5 8M32 33l5 8" stroke="#ff5d73" stroke-width="2.6"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Reihum denkt sich einer ein <b>Wort</b> aus. Die anderen sehen nur Striche und raten nacheinander <b>Buchstaben</b>.' },
      { t: 'Raten', d: 'Kommt dein Buchstabe vor, bekommst du <b>einen Punkt pro Treffer</b> und darfst gleich nochmal. Falsch: Am Galgen kommt ein Strich dazu und der Nächste rät.' },
      { t: 'Lösen', d: 'Glaubst du, das Wort zu kennen, tipp es unten ein und drück <b>Lösen</b>. Richtig: <b>3 Punkte plus einen für jeden fehlenden Buchstaben</b>. Falsch zählt als Fehler.' },
      { t: 'Gehängt', d: 'Nach <b>10 Fehlern</b> ist das Männchen fertig gemalt. Dann bekommt der, der sich das Wort ausgedacht hat, <b>5 Punkte</b>. Ein schweres Wort lohnt sich also!' },
      { t: 'Am selben Handy', d: 'Wer das Wort vorgibt, bekommt das Handy zuerst allein und tippt es heimlich ein. Danach raten die anderen reihum.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players;
      const per = [1, 2, 3].includes(+ctx.opts.rounds) ? +ctx.opts.rounds : 2;
      const pts = {}; P.forEach(p => { pts[p] = 0; });
      let round = 0, giver = 0, word = '', got = new Set(), wrong = new Set(), miss = 0, turn = 0, phase = 'pick', over = false;
      const wrap = V.el('div', 'hm'); ctx.stage.appendChild(wrap);
      const guessers = () => P.filter(p => p !== giver);
      const score = () => ctx.status(P.map(p => `<span class="c${p}">${ctx.name(p)} ${pts[p]}</span>`).join(' · ') + ` <small>· Wort ${round} von ${N * per}</small>`);
      const open = () => [...word].filter(c => !got.has(c)).length;
      function newRound() {
        round++;
        if (round > N * per) return finish();
        giver = P[(round - 1) % N]; word = ''; got = new Set(); wrong = new Set(); miss = 0; phase = 'pick';
        ctx.handReset();
        ctx.turn(giver, false); score();
        ctx.status(`${ctx.who(giver)} denkt sich ein Wort aus`);
        if (!ctx.isAI(giver) && ctx.mode === 'local') { wrap.innerHTML = ''; return ctx.handoff(giver, 'Du denkst dir ein Wort aus. Die anderen schauen weg.', pickUI); }
        if (!ctx.isAI(giver)) return pickUI();
        wrap.innerHTML = `<div class="hm-pick"><h3>${ctx.name(giver)} denkt nach …</h3></div>`;
        ctx.aiTurn({
          side: giver,
          think: () => ({ move: { w: enc(V.pick(LIST.filter(w => w.length >= (ctx.level >= 2 ? 6 : 4) && w.length <= 12))) } }),
          apply: act,
          decode: raw => raw && typeof raw.w === 'string' && /^[A-ZÄÖÜ]{3,16}$/.test(dec(raw.w)) && phase === 'pick' ? { w: raw.w } : null,
          say: () => 'Ich hab eins'
        });
      }
      function pickUI() {
        wrap.innerHTML = `<div class="hm-pick"><h3>Dein geheimes Wort</h3><p>3 bis 16 Buchstaben, ein einzelnes Wort. Die anderen raten es gleich.</p>
          <div class="row"><input class="inp" id="hmw" maxlength="16" autocomplete="off" spellcheck="false" autocapitalize="characters" type="password"><button class="btn sm" id="hme" type="button" aria-label="Wort zeigen">${V.ui.IC.eye}</button></div>
          <div class="row"><button class="btn ghost" id="hmr"><span>Zufallswort</span></button><button class="btn primary" id="hmo"><span>Los geht's</span></button></div><p class="aerr" id="hmx"></p></div>`;
        const i = wrap.querySelector('#hmw'), x = wrap.querySelector('#hmx');
        wrap.querySelector('#hme').onclick = () => { i.type = i.type === 'password' ? 'text' : 'password'; };
        wrap.querySelector('#hmr').onclick = () => { i.value = V.pick(LIST); i.type = 'text'; };
        const go = () => { const w = clean(i.value); if (w.length < 3) { x.textContent = 'Mindestens 3 Buchstaben.'; return V.sfx.bad(); } act({ w: enc(w) }); };
        wrap.querySelector('#hmo').onclick = go;
        i.onkeydown = e => { if (e.key === 'Enter') go(); };
        if (!V.coarse) setTimeout(() => i.focus(), 50);
      }
      function draw(reveal) {
        wrap.innerHTML = `<div class="hm-top"><div class="hm-gal"><svg viewBox="0 0 80 100">${PARTS.map((p, k) => `<g class="part${k < miss ? ' on' : ''}">${p}</g>`).join('')}</svg></div>
          <div class="hm-info"><b>Fehler</b><span class="miss">${miss} / ${MAX}</span><span class="giver">Wort von ${ctx.who(giver)}</span></div></div>
          <div class="hm-word">${[...word].map(c => `<i class="${got.has(c) ? 'on' : reveal ? 'lost' : ''}">${got.has(c) || reveal ? c : ''}</i>`).join('')}</div>
          <div class="hm-keys">${ABC.map(c => `<button data-k="${c}" class="${got.has(c) ? 'hit' : wrong.has(c) ? 'miss' : ''}" ${myGuess() && !got.has(c) && !wrong.has(c) ? '' : 'disabled'}>${c}</button>`).join('')}</div>
          ${myGuess() ? '<form class="hm-solve" id="hms"><input class="inp" id="hmi" placeholder="Ganzes Wort" maxlength="16" autocomplete="off" spellcheck="false" autocapitalize="characters"><button class="btn sm" type="submit"><span>Lösen</span></button></form>' : ''}`;
        wrap.querySelectorAll('[data-k]').forEach(b => b.onclick = () => act({ g: b.dataset.k }));
        const f = wrap.querySelector('#hms');
        if (f) f.onsubmit = e => { e.preventDefault(); const w = clean(f.querySelector('#hmi').value); if (w.length >= 3) act({ s: w }); };
      }
      const myGuess = () => phase === 'guess' && !over && !ctx.isAI(turn);
      function ask() {
        if (over || phase !== 'guess') return;
        ctx.turn(turn, false);
        ctx.status(`${ctx.who(turn)} rät · ${open()} Buchstaben fehlen`);
        draw();
        if (!ctx.isAI(turn)) return;
        const s = turn;
        ctx.aiTurn({
          side: s, quick: true,
          think: () => ({ move: think() }),
          targets: m => [m.g ? wrap.querySelector(`[data-k="${m.g}"]`) : wrap.querySelector('.hm-word')],
          apply: act,
          decode: raw => {
            if (!raw || phase !== 'guess') return null;
            if (raw.g && ABC.includes(raw.g) && !got.has(raw.g) && !wrong.has(raw.g)) return { g: raw.g };
            if (raw.s && /^[A-ZÄÖÜ]{3,16}$/.test(raw.s)) return { s: raw.s };
            return null;
          },
          say: m => m.g ? m.g + '?' : 'Ist es ' + m.s + '?'
        });
      }
      function think() {
        const L = ctx.level, used = new Set([...got, ...wrong]);
        const pattern = [...word].map(c => got.has(c) ? c : null);
        const cands = L >= 2 ? LIST.filter(w => w.length === word.length && [...w].every((c, i) => pattern[i] ? c === pattern[i] : !used.has(c))) : [];
        if (L === 3 && cands.length === 1 && open() > 1) return { s: cands[0] };
        if (L === 2 && cands.length === 1 && open() > 2 && Math.random() < 0.6) return { s: cands[0] };
        if (cands.length) {
          const f = {}; cands.forEach(w => new Set(w).forEach(c => { if (!used.has(c)) f[c] = (f[c] || 0) + 1; }));
          const best = Object.entries(f).sort((a, b) => b[1] - a[1]);
          if (best.length) return { g: best[0][0] };
        }
        const left = [...FREQ].filter(c => !used.has(c));
        if (L === 0 && Math.random() < 0.5) return { g: V.pick(left) };
        return { g: left[Math.min(left.length - 1, L === 0 ? V.rand(4) : 0)] };
      }
      function act(m) {
        if (over) return;
        if (m.w && phase === 'pick') {
          ctx.moved(giver, { w: m.w });
          word = dec(m.w); phase = 'guess'; V.sfx.go();
          turn = guessers()[0];
          return ctx.later(ask, 200);
        }
        if (phase !== 'guess') return;
        const p = turn;
        if (m.g) {
          if (got.has(m.g) || wrong.has(m.g)) return;
          ctx.moved(p, { g: m.g });
          const hits = [...word].filter(c => c === m.g).length;
          if (hits) {
            got.add(m.g); pts[p] += hits; V.sfx.goal(); draw();
            V.fx.floatAt(wrap.querySelector('.hm-word'), '+' + hits, V.hex(p));
            if (!open()) { pts[p] += 3; return roundOver(p, true); }
            return ctx.later(ask, ctx.fast() ? 30 : 450);
          }
          wrong.add(m.g); return fail(p);
        }
        if (m.s) {
          ctx.moved(p, { s: m.s });
          if (m.s === word) { const bonus = 3 + open(); pts[p] += bonus; [...word].forEach(c => got.add(c)); return roundOver(p, true, bonus); }
          return fail(p, m.s);
        }
      }
      function fail(p, guess) {
        miss++; V.sfx.bad(); draw();
        V.fx.shake(wrap.querySelector('.hm-gal'), true);
        if (guess) ctx.status(`${ctx.who(p)}: ${guess} ist falsch`);
        if (miss >= MAX) { pts[giver] += 5; return roundOver(giver, false); }
        const g = guessers(); turn = g[(g.indexOf(p) + 1) % g.length];
        ctx.later(ask, ctx.fast() ? 30 : 650);
      }
      function roundOver(w, solved, bonus) {
        phase = 'done'; draw(!solved); score();
        if (solved) { V.sfx.win(); V.fx.burstAt(wrap.querySelector('.hm-word'), V.hex(w), 20, 100); ctx.status(`${ctx.who(w)} löst <b>${word}</b>${bonus ? ' (+' + bonus + ')' : ' (+3)'}`); }
        else { V.sfx.lose(); ctx.status(`Gehängt! Das Wort war <b>${word}</b> · ${ctx.who(giver)} +5`); }
        ctx.later(newRound, ctx.fast() ? 40 : 2600);
      }
      function finish() {
        over = true; score();
        const top = Math.max(...P.map(p => pts[p])), ws = P.filter(p => pts[p] === top);
        ctx.end(ws.length > 1 ? 0 : ws[0], P.map(p => pts[p]).join(' : ') + ' Punkte');
      }
      ctx.keys(e => {
        if (!myGuess() || e.target.matches && e.target.matches('input')) return false;
        const k = e.key.toUpperCase();
        if (ABC.includes(k) && !got.has(k) && !wrong.has(k)) { act({ g: k }); return true; }
        return false;
      });
      newRound();
    }
  });
})();
