(function () {
  // Zeichnen & Raten for 2-4 players. One device: the drawer sees the word, the others call out, the drawer taps who got it.
  // Online table: the strokes go to everybody as table moves, guesses are typed and checked against a hash of the word
  // (the word itself is only sent at the end of the round).
  const AR = 0.75, Q = 4095, B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const PENS = ['#14151f', '#ff3b5c', '#2f7bff', '#1fbf6a', '#ffb800', '#9b5cff', '#8a5a2b', '#ffffff'];
  const WORDS = {
    de: ['Haus', 'Baum', 'Sonne', 'Mond', 'Auto', 'Fahrrad', 'Katze', 'Hund', 'Fisch', 'Vogel', 'Blume', 'Apfel', 'Banane', 'Pizza', 'Eis', 'Kuchen', 'Brille', 'Hut', 'Schuh', 'Uhr',
      'Schlüssel', 'Buch', 'Stuhl', 'Tisch', 'Bett', 'Lampe', 'Fenster', 'Tür', 'Brücke', 'Schiff', 'Flugzeug', 'Rakete', 'Zug', 'Ball', 'Gitarre', 'Trommel', 'Kerze', 'Geschenk', 'Herz', 'Stern',
      'Wolke', 'Regen', 'Blitz', 'Schneemann', 'Regenbogen', 'Berg', 'Insel', 'Burg', 'Krone', 'Schwert', 'Drache', 'Geist', 'Roboter', 'Pirat', 'Zauberer', 'König', 'Schlange', 'Spinne', 'Biene', 'Schmetterling',
      'Elefant', 'Giraffe', 'Pinguin', 'Hase', 'Maus', 'Schwein', 'Kuh', 'Pferd', 'Ente', 'Frosch', 'Schildkröte', 'Krokodil', 'Löwe', 'Affe', 'Eule', 'Wal', 'Hai', 'Krake', 'Igel', 'Fuchs',
      'Handy', 'Computer', 'Fernseher', 'Kamera', 'Kopfhörer', 'Rucksack', 'Regenschirm', 'Zahnbürste', 'Schere', 'Hammer', 'Leiter', 'Zelt', 'Lagerfeuer', 'Angel', 'Anker', 'Leuchtturm', 'Ampel', 'Bagger', 'Traktor', 'Hubschrauber',
      'Fußball', 'Tennis', 'Skateboard', 'Ski', 'Schwimmbad', 'Kino', 'Zirkus', 'Kürbis', 'Weihnachtsbaum', 'Osterei', 'Hexe', 'Vampir', 'Mumie', 'Zahn', 'Auge', 'Nase', 'Hand', 'Fuß', 'Bart', 'Pommes',
      'Burger', 'Hotdog', 'Popcorn', 'Erdbeere', 'Karotte', 'Ananas', 'Zitrone', 'Ei', 'Käse', 'Brot', 'Kaffee', 'Flasche', 'Glas', 'Gabel', 'Löffel', 'Topf', 'Kühlschrank', 'Toilette', 'Dusche', 'Badewanne'],
    en: ['House', 'Tree', 'Sun', 'Moon', 'Car', 'Bicycle', 'Cat', 'Dog', 'Fish', 'Bird', 'Flower', 'Apple', 'Banana', 'Pizza', 'Ice cream', 'Cake', 'Glasses', 'Hat', 'Shoe', 'Clock',
      'Key', 'Book', 'Chair', 'Table', 'Bed', 'Lamp', 'Window', 'Door', 'Bridge', 'Ship', 'Plane', 'Rocket', 'Train', 'Ball', 'Guitar', 'Drum', 'Candle', 'Present', 'Heart', 'Star',
      'Cloud', 'Rain', 'Lightning', 'Snowman', 'Rainbow', 'Mountain', 'Island', 'Castle', 'Crown', 'Sword', 'Dragon', 'Ghost', 'Robot', 'Pirate', 'Wizard', 'King', 'Snake', 'Spider', 'Bee', 'Butterfly',
      'Elephant', 'Giraffe', 'Penguin', 'Rabbit', 'Mouse', 'Pig', 'Cow', 'Horse', 'Duck', 'Frog', 'Turtle', 'Crocodile', 'Lion', 'Monkey', 'Owl', 'Whale', 'Shark', 'Octopus', 'Hedgehog', 'Fox',
      'Phone', 'Computer', 'TV', 'Camera', 'Headphones', 'Backpack', 'Umbrella', 'Toothbrush', 'Scissors', 'Hammer', 'Ladder', 'Tent', 'Campfire', 'Fishing rod', 'Anchor', 'Lighthouse', 'Traffic light', 'Digger', 'Tractor', 'Helicopter',
      'Football', 'Tennis', 'Skateboard', 'Ski', 'Pool', 'Cinema', 'Circus', 'Pumpkin', 'Christmas tree', 'Easter egg', 'Witch', 'Vampire', 'Mummy', 'Tooth', 'Eye', 'Nose', 'Hand', 'Foot', 'Beard', 'Fries',
      'Burger', 'Hot dog', 'Popcorn', 'Strawberry', 'Carrot', 'Pineapple', 'Lemon', 'Egg', 'Cheese', 'Bread', 'Coffee', 'Bottle', 'Glass', 'Fork', 'Spoon', 'Pot', 'Fridge', 'Toilet', 'Shower', 'Bathtub']
  };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // guesses count without case, spaces, dashes and with ae/oe/ue/ss for umlauts
  const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  const hash = s => { let h = 0x811c9dc5; for (const c of 'versus:' + norm(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const enc = pts => pts.map(v => { const n = Math.max(0, Math.min(Q, Math.round(v * Q))); return B64[n >> 6] + B64[n & 63]; }).join('');
  const dec = s => { const o = []; for (let i = 0; i + 1 < s.length; i += 2) o.push(((B64.indexOf(s[i]) << 6) | B64.indexOf(s[i + 1])) / Q); return o; };

  V.css(`
  .drw{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:600px;margin:0 auto}
  .drw-head{display:flex;align-items:center;gap:12px;width:100%}
  .drw-word{flex:1;min-width:0;font:800 italic 26px/1.1 var(--f-d);letter-spacing:.06em;text-transform:uppercase;padding-right:.15em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .drw-word small{display:block;font:600 12px/1.3 var(--f-b);letter-spacing:0;text-transform:none;color:var(--muted)}
  .drw-word.hid{letter-spacing:.3em}
  .drw-time{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font:800 22px/1 var(--f-d);background:conic-gradient(var(--acc,var(--cyan)) calc(var(--p,1)*360deg),var(--panel3) 0);position:relative}
  .drw-time::before{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--panel)}
  .drw-time b{position:relative}
  .drw-time.low{--acc:var(--bad)}
  .drw-pad{position:relative;width:100%;border-radius:14px;overflow:hidden;background:#fbfaf6;box-shadow:0 0 0 2px var(--line2),0 12px 30px -16px #000;touch-action:none}
  .drw-pad canvas{display:block;width:100%;height:100%;cursor:crosshair}
  .drw-pad .drw-over{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;background:rgba(10,11,20,.78);color:var(--fg);font-size:15px}
  .drw-over b{display:block;font:800 italic 34px/1.1 var(--f-d);text-transform:uppercase;color:var(--yellow);margin:6px 0;padding-right:.15em}
  .drw-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center}
  .drw-tools .pen{width:30px;height:30px;border-radius:50%;background:var(--c);border:2px solid var(--line2)}
  .drw-tools .pen.on{outline:3px solid var(--fg);outline-offset:2px}
  .drw-tools .sz{width:36px;height:34px;border-radius:9px;border:1px solid var(--line2);background:var(--panel2);display:grid;place-items:center}
  .drw-tools .sz i{display:block;border-radius:50%;background:var(--fg);width:var(--d);height:var(--d)}
  .drw-tools .sz.on{border-color:var(--fg)}
  .drw-tools .btn{height:34px}
  .drw-tools .br{flex-basis:100%;height:0}
  .drw-pick{display:grid;gap:10px;width:100%}
  .drw-pick button{height:56px;font:800 italic 22px/1 var(--f-d);text-transform:uppercase;padding-right:.4em}
  .drw-guess{display:flex;gap:8px;width:100%}
  .drw-guess .inp{flex:1;min-width:0}
  .drw-feed{width:100%;display:flex;flex-direction:column;gap:3px;font-size:14px;min-height:20px}
  .drw-feed p{margin:0;color:var(--muted)}
  .drw-feed p.ok{color:var(--good);font-weight:700}
  .drw-who{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;width:100%}
  .drw-who .btn{flex:1 1 120px}
  .drw-note{margin:0;color:var(--muted);font-size:13px;text-align:center}
  .drw-hold{user-select:none;-webkit-user-select:none}`);

  V.register({
    id: 'draw', name: 'Zeichnen & Raten', cat: 'Klassiker', order: 10, accent: '#ff9f43', party: true, noAI: true, noFirst: true,
    short: 'Einer zeichnet, die anderen raten.',
    desc: 'Reihum zeichnet einer ein geheimes Wort, die anderen raten. Wer schnell errät, holt die meisten Punkte, der Zeichner bekommt Punkte für jeden Treffer. Für 2 bis 4, online oder an einem Gerät.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    keys: [['Enter', 'Antwort schicken'], ['Strg Z', 'Strich zurück']],
    options: [{ id: 'n', label: 'Mitspieler', group: 'players', inline: 'local', live: false, def: 3, choices: [[2, '2'], [3, '3'], [4, '4']] },
      { id: 'rounds', label: 'Runden', group: 'rules', desc: 'So oft zeichnet jeder.', short: v => `${v}× zeichnen`, def: 2, choices: [[1, '1'], [2, '2'], [3, '3']] },
      { id: 'time', label: 'Zeit pro Bild', group: 'time', short: v => `${v} s`, def: 80, choices: [[60, '60 s'], [80, '80 s'], [100, '100 s']] }],
    localHint: 'Einer zeichnet am Gerät, die anderen rufen ihre Antworten.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="30" rx="4" fill="#fbfaf6" stroke="#c9b48a" stroke-width="2"/><path d="M11 29c4-10 8-12 11-6s7 4 9-3" fill="none" stroke="#2f7bff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="16" r="3.2" fill="#ffb800"/><path d="m30 43 11-17 4 2.6-11 17-5.2 1.6z" fill="#ff9f43"/><path d="m29 43.2 5.2-1.6-4-2.6z" fill="#3a2a1a"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Reihum ist einer der <b>Zeichner</b>. Er sucht sich eins von drei Wörtern aus und zeichnet es, ohne Buchstaben oder Zahlen. Die anderen raten so schnell wie möglich.' },
      { t: 'An einem Gerät', d: 'Die anderen schauen kurz weg, während der Zeichner sein Wort wählt. Dann zeichnet er, alle rufen ihre Antworten. Wer es hat, wird unten <b>angetippt</b>: 10 Punkte für ihn, 5 für den Zeichner. Das Wort kann der Zeichner mit <b>Gedrückt halten</b> nochmal ansehen.' },
      { t: 'Online', d: 'Alle sehen die Zeichnung live auf ihrem Gerät und <b>tippen</b> ihre Antworten. Groß- und Kleinschreibung ist egal. Der Erste bekommt 10 Punkte, der Zweite 8, dann 6. Der Zeichner bekommt 4 für jeden, der es errät.' },
      { t: 'Zeichnen', d: 'Unten wählst du Farbe und Stiftstärke, <b>Rückgängig</b> nimmt den letzten Strich weg, <b>Leeren</b> wischt alles. Weiß ist der Radiergummi.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, local = ctx.mode === 'local';
      const T = [60, 80, 100].includes(+ctx.opts.time) ? +ctx.opts.time : 80;
      const rounds = [1, 2, 3].includes(+ctx.opts.rounds) ? +ctx.opts.rounds : 2;
      const total = {}; P.forEach(p => { total[p] = 0; });
      const words = WORDS[V.lang === 'en' ? 'en' : 'de'];
      const used = new Set();
      let r = -1, drawer = 0, phase = '', word = '', wlen = 0, whash = '', deadline = 0, tick = null, over = false;
      let strokes = [], got = [], feed = [], pen = PENS[0], size = 0.008, sid = 0, cur = null, sentUpTo = 0, sendT = 0, pickT = 0;
      const me = () => local ? drawer : (ctx.mySide || 1);
      const amDrawer = () => local || me() === drawer;
      const root = V.el('div', 'drw'); ctx.stage.appendChild(root);
      ctx.onCleanup(() => { clearInterval(tick); clearTimeout(pickT); });
      const scoreLine = () => ctx.status(P.map(p => `<span class="c${p}">${esc(ctx.name(p))} ${total[p]}</span>`).join(' · ') + ` <small>· Bild ${r + 1} von ${N * rounds}</small>`);

      // ---------- rounds ----------
      function newRound() {
        r++;
        if (r >= N * rounds) return finish();
        drawer = P[r % N]; phase = 'pick'; word = ''; wlen = 0; whash = ''; strokes = []; got = []; feed = []; cur = null;
        ctx.turn(drawer, false); scoreLine();
        if (local) { ctx.handReset(); return ctx.handoff(drawer, 'Die anderen schauen weg. Du suchst dir gleich ein Wort aus.', pickUI); }
        // a seat the computer took over (someone left) does not draw: the host skips it
        if (ctx.isBot(drawer)) { if (ctx.amHost()) ctx.submit({ r, skip: 1 }, drawer); return waitUI(`${ctx.who(drawer)} ist nicht mehr da`); }
        if (amDrawer()) pickUI(); else waitUI(`${ctx.who(drawer)} sucht sich ein Wort aus …`);
      }
      function three() {
        const left = words.filter(w => !used.has(w)), pool = left.length >= 3 ? left : words;
        const out = []; while (out.length < 3) { const w = pool[Math.floor(Math.random() * pool.length)]; if (!out.includes(w)) out.push(w); }
        return out;
      }
      function pickUI() {
        const opts = three();
        root.innerHTML = `<div class="drw-head"><div class="drw-word"><small>${local ? esc(ctx.name(drawer)) + ', du zeichnest' : 'Du zeichnest'}</small>Wähl ein Wort</div></div>
          <div class="drw-pick">${opts.map((w, i) => `<button class="btn${i ? '' : ' primary'}" data-w="${i}"><span>${esc(w)}</span></button>`).join('')}</div>
          <p class="drw-note">Ohne Buchstaben und Zahlen zeichnen. Nach 15 Sekunden wird das erste genommen.</p>`;
        const take = i => { clearTimeout(pickT); if (phase !== 'pick') return; word = opts[i]; used.add(word); V.sfx.ui(); ctx.submit({ r, pick: 1, len: word.length, h: hash(word) }, drawer); };
        root.querySelectorAll('[data-w]').forEach(b => b.onclick = () => take(+b.dataset.w));
        clearTimeout(pickT); pickT = setTimeout(() => { if (ctx.alive()) take(0); }, 15000);
      }
      function waitUI(text) { root.innerHTML = `<div class="drw-head"><div class="drw-word"><small>Bild ${r + 1}</small>Gleich geht's los</div></div><div class="drw-pad" style="aspect-ratio:${1 / AR}"><div class="drw-over"><div>${text}</div></div></div>`; }

      // ---------- drawing ----------
      let cv = null, g = null, W = 0, H = 0;
      function drawUI() {
        const drawing = amDrawer();
        const others = P.filter(p => p !== drawer);
        root.innerHTML = `<div class="drw-head"><div class="drw-word${drawing ? '' : ' hid'}" id="dww"></div><div class="drw-time" id="dwt"><b></b></div></div>
          <div class="drw-pad" id="dwp"><canvas></canvas></div>
          ${drawing ? `<div class="drw-tools">${PENS.map(c => `<button class="pen${c === pen ? ' on' : ''}" style="--c:${c}" data-c="${c}" aria-label="${c === '#ffffff' ? 'Radiergummi' : 'Farbe'}"></button>`).join('')}<i class="br"></i>
            ${[[0.005, 6], [0.008, 10], [0.016, 16]].map(([s, d]) => `<button class="sz${s === size ? ' on' : ''}" data-s="${s}" aria-label="Stiftstärke"><i style="--d:${d}px"></i></button>`).join('')}
            <button class="btn sm" id="dwu"><span>Rückgängig</span></button><button class="btn sm" id="dwc"><span>Leeren</span></button></div>` : ''}
          ${local ? `<p class="drw-note">Wer hat es erraten?</p><div class="drw-who">${others.map(p => `<button class="btn" data-ok="${p}"><span class="c${p}">${esc(ctx.name(p))}</span></button>`).join('')}<button class="btn ghost" id="dwn"><span>Keiner</span></button></div>
              <button class="btn ghost sm drw-hold" id="dwh"><span>Wort ansehen (gedrückt halten)</span></button>`
            : drawing ? '<p class="drw-note">Die anderen tippen ihre Antworten.</p>' : `<form class="drw-guess" id="dwg"><input class="inp" id="dwi" maxlength="30" autocomplete="off" spellcheck="false" placeholder="Deine Antwort …"><button class="btn primary" type="submit"><span>Raten</span></button></form>`}
          <div class="drw-feed" id="dwf"></div>`;
        const pad = root.querySelector('#dwp');
        cv = pad.querySelector('canvas'); g = cv.getContext('2d');
        // the pad fits the width and leaves room for the tools below
        const maxW = Math.min(root.clientWidth || 360, 600), maxH = Math.max(200, window.innerHeight - (window.innerWidth < 960 ? 400 : 330));
        W = Math.floor(Math.min(maxW, maxH / AR)); H = Math.floor(W * AR);
        pad.style.width = W + 'px'; pad.style.height = H + 'px';
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr * W, 0, 0, dpr * W, 0, 0);
        wordLine(); redraw(); showFeed();
        if (drawing) {
          root.querySelectorAll('.pen').forEach(b => b.onclick = () => { pen = b.dataset.c; root.querySelectorAll('.pen').forEach(x => x.classList.toggle('on', x === b)); V.sfx.tick(); });
          root.querySelectorAll('.sz').forEach(b => b.onclick = () => { size = +b.dataset.s; root.querySelectorAll('.sz').forEach(x => x.classList.toggle('on', x === b)); V.sfx.tick(); });
          root.querySelector('#dwu').onclick = undo;
          root.querySelector('#dwc').onclick = () => { if (!strokes.length) return; strokes = []; redraw(); V.sfx.ui(); if (!local) ctx.submit({ r, clr: 1 }, drawer); };
          const pos = e => { const b = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), Math.max(0, Math.min(AR, (e.clientY - b.top) / b.width))]; };
          cv.addEventListener('pointerdown', e => {
            if (phase !== 'draw') return;
            cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
            const [x, y] = pos(e);
            cur = { id: ++sid, c: pen, w: size, p: [x, y] }; sentUpTo = 0; strokes.push(cur); redraw();
          });
          cv.addEventListener('pointermove', e => {
            if (!cur) return;
            const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
            for (const ev of evs) {
              const [x, y] = pos(ev), n = cur.p.length;
              if (Math.hypot(x - cur.p[n - 2], y - cur.p[n - 1]) < 0.004) continue;
              cur.p.push(x, y);
            }
            redraw();
            if (!local && performance.now() - sendT > 900) flush();
          });
          const end = e => { if (!cur) return; const [x, y] = pos(e), n = cur.p.length; if (x !== cur.p[n - 2] || y !== cur.p[n - 1]) { cur.p.push(x, y); redraw(); } if (!local) flush(); cur = null; };
          cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
        }
        if (local) {
          root.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { if (phase === 'draw') ctx.submit({ r, ok: +b.dataset.ok }, drawer); });
          root.querySelector('#dwn').onclick = () => { if (phase === 'draw') ctx.submit({ r, end: 1, w: word }, drawer); };
          const h = root.querySelector('#dwh'), ww = root.querySelector('#dww');
          const show = on => { ww.classList.toggle('hid', !on); wordLine(on); };
          h.addEventListener('pointerdown', e => { e.preventDefault(); show(true); });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => h.addEventListener(k, () => show(false)));
          show(false);
        }
        const f = root.querySelector('#dwg');
        if (f) {
          const i = f.querySelector('#dwi');
          f.onsubmit = e => { e.preventDefault(); const v = i.value.trim().slice(0, 30); if (!v || phase !== 'draw' || got.includes(me())) return; i.value = ''; ctx.submit({ r, g: v }, me()); };
          if (!V.coarse) setTimeout(() => i.focus(), 60);
        }
      }
      // the strokes of the drawer go out in pieces (each table move is small); a long stroke is continued under its id
      function flush() {
        sendT = performance.now();
        if (!cur || cur.p.length <= sentUpTo) return;
        // the first piece starts at the beginning, later ones repeat the last point so the line stays closed
        const from = sentUpTo ? sentUpTo - 2 : 0, pts = cur.p.slice(from, from + 480);
        ctx.submit({ r, d: [cur.id, PENS.indexOf(cur.c), Math.round(cur.w * 1000), enc(pts.map((v, i) => i % 2 ? v / AR : v)), sentUpTo ? 1 : 0] }, drawer);
        sentUpTo = from + pts.length;
        if (sentUpTo < cur.p.length) flush();
      }
      function undo() {
        if (!amDrawer() || phase !== 'draw' || !strokes.length) return;
        const s = strokes.pop(); redraw(); V.sfx.tick();
        if (!local) ctx.submit({ r, u: s.id }, drawer);
      }
      ctx.keys(e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { undo(); return true; }
        return false;
      });
      function redraw() {
        if (!g) return;
        g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 1, AR);
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const s of strokes) {
          const p = s.p; g.strokeStyle = s.c; g.fillStyle = s.c; g.lineWidth = s.w;
          if (p.length <= 2) { g.beginPath(); g.arc(p[0], p[1], s.w / 2, 0, 7); g.fill(); continue; }
          g.beginPath(); g.moveTo(p[0], p[1]);
          for (let i = 2; i < p.length - 2; i += 2) g.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
          g.lineTo(p[p.length - 2], p[p.length - 1]); g.stroke();
        }
      }
      function wordLine(show) {
        const el = root.querySelector('#dww'); if (!el) return;
        const drawing = amDrawer() && (!local || show);
        el.innerHTML = drawing ? `<small>${local ? 'Das Wort' : 'Du zeichnest'}</small>${esc(word)}`
          : `<small>${ctx.who(drawer)} zeichnet · ${wlen} Buchstaben</small>${'_ '.repeat(wlen).trim()}`;
      }
      function showFeed() {
        const f = root.querySelector('#dwf'); if (!f) return;
        f.innerHTML = feed.slice(-4).map(x => `<p class="${x.ok ? 'ok' : ''}">${x.html}</p>`).join('');
      }
      function timer() {
        if (!ctx.alive() || phase !== 'draw') return clearInterval(tick);
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        const t = root.querySelector('#dwt');
        if (t) { t.querySelector('b').textContent = left; t.style.setProperty('--p', Math.max(0, (deadline - Date.now()) / (T * 1000))); t.classList.toggle('low', left <= 10); }
        // the drawer ends the round when the time is up; for a drawer who left, the host does it a bit later
        if (left <= 0 && amDrawer()) { if (cur && !local) flush(); ctx.submit({ r, end: 1, w: word }, drawer); clearInterval(tick); }
        else if (!local && left <= 0 && ctx.isBot(drawer) && ctx.amHost() && Date.now() > deadline + 4000) { ctx.submit({ r, end: 1, w: '' }, drawer); clearInterval(tick); }
      }

      // ---------- everything that happens, in the same order on every device ----------
      ctx.listen((s, m) => {
        if (over || !m || m.r !== r) return;
        if (m.skip && s === drawer && phase === 'pick') { phase = 'reveal'; return ctx.later(newRound, 1500); }
        if (m.pick && s === drawer && phase === 'pick') {
          wlen = Math.max(1, Math.min(30, +m.len || 1)); whash = String(m.h || '');
          phase = 'draw'; deadline = Date.now() + T * 1000;
          drawUI(); V.sfx.go();
          clearInterval(tick); tick = setInterval(timer, 250); timer();
          return;
        }
        if (phase !== 'draw') return;
        if (s === drawer && !local && s !== me()) {
          if (m.d) {
            const [id, ci, w, pts, more] = m.d, p = dec(String(pts || '')).map((v, i) => i % 2 ? v * AR : v);
            let st = more && strokes.find(x => x.id === id);
            if (st) st.p.push(...p); else strokes.push({ id, c: PENS[ci] || PENS[0], w: Math.max(0.002, Math.min(0.03, (+w || 8) / 1000)), p });
            return redraw();
          }
          if (m.u) { strokes = strokes.filter(x => x.id !== m.u); return redraw(); }
          if (m.clr) { strokes = []; return redraw(); }
        }
        if (m.g && s !== drawer && !got.includes(s)) {
          const txt = String(m.g).slice(0, 30);
          if (hash(txt) === whash) {
            got.push(s);
            const pts = [10, 8, 6][got.length - 1] || 4;
            total[s] += pts; total[drawer] += 4;
            feed.push({ ok: 1, html: `${ctx.who(s)} hat es erraten! +${pts}` });
            V.sfx.found(); if (s === me()) V.fx.flash(V.hex(s));
            if (s === me()) { const f = root.querySelector('#dwg'); if (f) f.innerHTML = '<p class="drw-note">Du hast es! Warte auf die anderen …</p>'; }
            scoreLine();
            // everybody has it: the drawer ends the round
            if (amDrawer() && P.filter(p => p !== drawer && !ctx.isBot(p)).every(p => got.includes(p))) ctx.submit({ r, end: 1, w: word }, drawer);
          } else feed.push({ html: `${ctx.who(s)}: ${esc(txt)}` });
          return showFeed();
        }
        if (m.ok && local && s === drawer) {
          const p = +m.ok; if (!P.includes(p) || p === drawer) return;
          total[p] += 10; total[drawer] += 5; got.push(p);
          V.sfx.found(); V.fx.flash(V.hex(p));
          return reveal(word, `${ctx.who(p)} hat es erraten!`);
        }
        if (m.end && s === drawer) {
          const w = String(m.w || '').slice(0, 40);
          return reveal(w, got.length ? '' : 'Keiner hat es erraten.');
        }
      });
      function reveal(w, line) {
        phase = 'reveal'; clearInterval(tick); scoreLine();
        const pad = root.querySelector('#dwp');
        if (pad) { const o = V.el('div', 'drw-over', `<div>${line ? line + '<br>' : ''}${w ? `Das Wort war<b>${esc(w)}</b>` : ''}</div>`); pad.appendChild(o); }
        if (!got.length) V.sfx.bad();
        ctx.later(newRound, 3800);
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
