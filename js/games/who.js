(function () {
  // Wer bin ich? A face-guessing duel: both get a secret figure out of the same 24, then ask yes/no questions about the
  // other's figure in turns. The answers are given by the game itself, and every figure that doesn't fit is flipped
  // down at once. Own twists: a question may join two features with "oder", a wrong guess costs one of two hearts (and
  // the turn) instead of the match, and if the first player guesses right the second still gets one last guess (draw).
  // Board order and both secrets come from ctx.rng (the same in every browser at a table).
  // Uses ctx.listen/ctx.submit: { q: [key] or [key, key], n } question, { g: figure, n } guess; n counts the actions.
  const SKIN = ['#f6d3b3', '#e9b98f', '#c98f62', '#9a6440', '#6b4329'];
  const HAIR = { k: '#23232c', n: '#6b3f22', y: '#f2c94c', r: '#d9531e', g: '#c3c6cf', p: '#ff4fd8' };
  const SHIRT = { r: '#ff5d5d', b: '#4f8bff', g: '#3ccf6e', y: '#ffd84f' };
  const SHIRT_CB = { r: 'R', b: 'B', g: 'G', y: 'Ge' };
  // name, skin, hair colour (- = none), hair (s short, l long, x bald), glasses, beard, hat, earrings, freckles, laughs, shirt
  const RAW = [
    'Ali 3 k s 0 1 0 0 0 1 b', 'Bea 1 y l 1 0 0 1 0 1 r', 'Carl 0 g s 1 1 0 0 0 0 g', 'Dana 4 k l 0 0 1 1 0 0 y',
    'Emil 1 r s 0 0 0 0 1 1 g', 'Finn 0 y s 0 0 1 0 1 0 b', 'Gina 2 n l 1 0 0 0 0 1 g', 'Hugo 2 - x 1 0 0 0 0 0 r',
    'Ida 0 r l 0 0 0 1 1 0 b', 'Jonas 3 n s 0 1 1 0 0 1 r', 'Kim 2 p s 1 0 0 1 0 1 y', 'Lea 1 n l 0 0 1 0 0 0 r',
    'Max 0 n s 0 1 0 0 0 0 y', 'Nora 4 k l 1 0 0 0 0 1 b', 'Ole 1 - x 0 0 0 0 1 1 y', 'Paula 0 g l 1 0 0 1 0 0 g',
    'Rosa 3 p l 0 0 0 0 0 1 r', 'Sam 4 y s 0 0 1 0 0 0 g', 'Tara 2 r l 0 0 1 0 1 0 y', 'Udo 3 g s 0 1 0 0 0 1 b',
    'Vera 1 k s 1 0 0 1 0 0 y', 'Willi 4 - x 1 0 0 0 0 1 g', 'Yara 2 y s 0 0 0 1 0 0 r', 'Zoe 0 y s 0 0 0 0 1 1 b'
  ];
  const FIG = RAW.map((r, id) => {
    const [name, sk, hc, len, gl, bd, hat, ear, fr, la, sh] = r.split(' ');
    return { id, name, sk: +sk, hc, len, gl: gl === '1', bd: bd === '1', hat: hat === '1', ear: ear === '1', fr: fr === '1', la: la === '1', sh };
  });
  const NF = FIG.length;
  // the features you can ask about: key, chip text, the words after "Hat deine Figur …", row
  const Q = [
    ['gl', 'Brille', 'eine Brille', 0], ['bd', 'Bart', 'einen Bart', 0], ['hat', 'Mütze oder Cap', 'etwas auf dem Kopf', 0],
    ['ear', 'Ohrringe', 'Ohrringe', 0], ['fr', 'Sommersprossen', 'Sommersprossen', 0], ['la', 'Lacht mit Zähnen', 'ein breites Lachen', 0],
    ['h:k', 'Schwarz', 'schwarze Haare', 1], ['h:n', 'Braun', 'braune Haare', 1], ['h:y', 'Blond', 'blonde Haare', 1],
    ['h:r', 'Rot', 'rote Haare', 1], ['h:g', 'Grau', 'graue Haare', 1], ['h:p', 'Bunt', 'bunte Haare', 1],
    ['l:l', 'Lang', 'lange Haare', 2], ['l:s', 'Kurz', 'kurze Haare', 2], ['l:x', 'Glatze', 'eine Glatze', 2],
    ['s:r', 'Rot', 'ein rotes Shirt', 3], ['s:b', 'Blau', 'ein blaues Shirt', 3], ['s:g', 'Grün', 'ein grünes Shirt', 3], ['s:y', 'Gelb', 'ein gelbes Shirt', 3]
  ];
  const QK = Object.fromEntries(Q.map(q => [q[0], q]));
  const ROWS = ['Gesicht', 'Haarfarbe', 'Frisur', 'Shirt'];
  function has(f, k) {
    const [a, b] = k.split(':');
    if (a === 'h') return f.hc === b;
    if (a === 'l') return f.len === b;
    if (a === 's') return f.sh === b;
    return !!f[k];
  }
  const fits = (f, q) => q.some(k => has(f, k));
  const validQ = q => Array.isArray(q) && (q.length === 1 || q.length === 2) && q.every(k => QK[k]) && q[0] !== q[1];
  const qText = q => `<span>Hat deine Figur ${q.map(k => `<b>${QK[k][2]}</b>`).join(' oder ')}?</span>`;
  const qShort = q => `<span>${q.map(k => `<b>${QK[k][3] === 1 ? QK[k][2] : QK[k][3] === 3 ? QK[k][2].replace(/^ein /, '') : QK[k][1]}</b>`).join(' oder ')}?</span>`;

  // ---------- the faces (own drawings, 64×64) ----------
  function face(f) {
    const skin = SKIN[f.sk], hair = HAIR[f.hc] || '#000', dark = '#2a1d1a';
    const capStyle = f.id % 2;
    let s = `<svg viewBox="0 0 64 64" aria-hidden="true">`;
    s += `<path d="M5 64C7 51 19 46 32 46S57 51 59 64Z" fill="${SHIRT[f.sh]}"/><text class="wb-cbt" x="32" y="61" text-anchor="middle">${SHIRT_CB[f.sh]}</text>`;
    s += `<rect x="27" y="38" width="10" height="10" rx="3" fill="${skin}" filter="brightness(.9)"/>`;
    if (f.len === 'l') s += `<path d="M15 30C14 12 50 12 49 30L51 52C45 55 19 55 13 52Z" fill="${hair}"/>`;
    s += `<circle cx="19.5" cy="31" r="3.2" fill="${skin}"/><circle cx="44.5" cy="31" r="3.2" fill="${skin}"/>`;
    s += `<ellipse cx="32" cy="30" rx="12.8" ry="15" fill="${skin}"/>`;
    if (f.ear) s += `<circle cx="19.5" cy="36" r="1.9" fill="#ffd84f" stroke="#a88a1c" stroke-width=".5"/><circle cx="44.5" cy="36" r="1.9" fill="#ffd84f" stroke="#a88a1c" stroke-width=".5"/>`;
    if (f.bd) s += `<path d="M19.5 30C19 45 26 47.5 32 47.5S45 45 44.5 30C43 38 39 40.5 32 40.5S21 38 19.5 30Z" fill="${hair}"/>`;
    if (f.len === 's') s += `<path d="M19 28C17 13 47 13 45 28C43 22 37 19.5 32 19.5S21 22 19 28Z" fill="${hair}"/>`;
    if (f.len === 'l') s += `<path d="M19 30C17 13 47 13 45 30C42 21 35 19 30 20C27 23 23 26 19 30Z" fill="${hair}"/>`;
    if (f.len === 'x') s += `<ellipse cx="27" cy="19" rx="4" ry="1.6" fill="#fff" opacity=".25"/>`;
    if (f.fr) s += `<g fill="#a5583f" opacity=".75"><circle cx="24" cy="34" r=".8"/><circle cx="26.5" cy="35.2" r=".8"/><circle cx="23.5" cy="36.4" r=".8"/><circle cx="40" cy="34" r=".8"/><circle cx="37.5" cy="35.2" r=".8"/><circle cx="40.5" cy="36.4" r=".8"/></g>`;
    s += `<circle cx="27" cy="29.5" r="1.7" fill="${dark}"/><circle cx="37" cy="29.5" r="1.7" fill="${dark}"/>`;
    s += `<path d="M24 25.5Q27 24 30 25.5M34 25.5Q37 24 40 25.5" stroke="${f.len === 'x' ? dark : hair === HAIR.y || hair === HAIR.g ? '#8a6a3a' : hair}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    if (f.gl) s += `<g fill="rgba(255,255,255,.18)" stroke="#1b1f33" stroke-width="1.5"><circle cx="27" cy="29.5" r="4.4"/><circle cx="37" cy="29.5" r="4.4"/></g><path d="M31.4 29.5h1.2M22.6 29l-2.6-1M41.4 29l2.6-1" stroke="#1b1f33" stroke-width="1.5"/>`;
    s += f.la ? `<path d="M26.5 36.5Q32 44.5 37.5 36.5Z" fill="#5a1f22"/><path d="M27.3 36.9h9.4l-.8 1.6h-7.8Z" fill="#fff"/>`
      : `<path d="M28 37.5Q32 40.5 36 37.5" stroke="#6e2a2a" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    if (f.hat) {
      s += capStyle
        ? `<path d="M19 25C19 10 45 10 45 25Z" fill="#8a5cff"/><path d="M33 23.5L55 25.5L54 27.5L33 26Z" fill="#6a3fe0"/><circle cx="32" cy="12" r="1.6" fill="#6a3fe0"/>`
        : `<path d="M18.5 24C18.5 7 45.5 7 45.5 24Z" fill="#2f3550"/><rect x="17.5" y="20" width="29" height="6" rx="3" fill="#454d72"/><circle cx="32" cy="7.5" r="3" fill="#e7e9ff"/>`;
    }
    return s + '</svg>';
  }

  // ---------- AI ----------
  // how well a question splits the figures that are still possible (0 = perfect half)
  const allQs = (() => {
    const out = Q.map(q => [q[0]]);
    for (let i = 0; i < Q.length; i++) for (let j = i + 1; j < Q.length; j++) out.push([Q[i][0], Q[j][0]]);
    return out;
  })();
  function split(cand, q) { let y = 0; for (const f of cand) if (fits(FIG[f], q)) y++; return { y, n: cand.length - y }; }
  function aiQuestion(level, cand) {
    const pool = level <= 1 ? allQs.filter(q => q.length === 1) : allQs;
    const scored = [];
    for (const q of pool) {
      const { y, n } = split(cand, q);
      if (!y || !n) continue;
      // a bit less good with two features, so the AI asks simple questions when they split as well
      scored.push({ m: q, v: -Math.abs(y - n) * 10 - (q.length - 1) });
    }
    if (!scored.length) return null;
    // Leicht: often a random question, sometimes one that tells it nothing new
    if (level === 0) {
      if (Math.random() < 0.3) return [V.pick(Q)[0]];
      return V.weak(scored, 30, 0.5).move;
    }
    if (level === 1) return V.pickSoft(scored, 12).move;
    if (level === 2) return V.pickSoft(scored, 4).move;
    return V.pickSoft(scored, 0).move;
  }

  V.css(`
  .wb{width:min(var(--bw),620px);display:flex;flex-direction:column;gap:10px;align-items:stretch}
  .wb-top{display:flex;align-items:center;gap:10px;justify-content:space-between}
  .wb-me{display:flex;align-items:center;gap:8px;min-width:0}
  .wb-me .wb-face{width:46px;flex:none;border-radius:10px;background:var(--panel2);border:2px solid var(--yellow);padding:2px}
  .wb-me small{display:block;color:var(--muted);font:700 italic 11px/1.1 var(--f-d);letter-spacing:.08em;text-transform:uppercase}
  .wb-me b{font:800 italic 17px/1.1 var(--f-d)}
  .wb-me.hide .wb-face{background:var(--panel3);border-color:var(--line2)}
  .wb-st{display:flex;flex-direction:column;gap:3px;align-items:flex-end;font-size:12px;color:var(--muted);text-align:right}
  .wb-st span{display:flex;gap:6px;align-items:center;white-space:nowrap}
  .wb-st i{font-style:normal;letter-spacing:1px;color:var(--bad)} .wb-st i s{color:var(--dim);text-decoration:none}
  .wb-board{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}
  .wb-c{position:relative;display:flex;flex-direction:column;align-items:center;padding:3px 2px 2px;border-radius:9px;background:var(--panel);border:1px solid var(--line);color:var(--fg);font:700 10px/1.1 var(--f-b,inherit);transition:transform .35s var(--ease),opacity .35s,filter .35s,border-color .15s;min-width:0}
  .wb-c svg{width:100%;height:auto;display:block}
  .wb-c span{margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .wb-c.out{opacity:.22;filter:grayscale(1);transform:scale(.9) rotateX(25deg)}
  .wb-c.out::after{content:'';position:absolute;inset:18% 14%;background:linear-gradient(45deg,transparent 46%,var(--bad) 46% 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,var(--bad) 46% 54%,transparent 54%);opacity:.8}
  .wb-c.sel{border-color:var(--pink);box-shadow:0 0 0 2px var(--pink),0 0 14px color-mix(in srgb,var(--pink) 60%,transparent);transform:translateY(-2px)}
  .wb-c.flip{animation:wbflip .45s var(--ease)}
  @keyframes wbflip{0%{transform:none;opacity:1;filter:none}50%{transform:scale(.95) rotateY(90deg)}}
  .wb-c.win{border-color:var(--good);box-shadow:0 0 0 2px var(--good)}
  .wb-cbt{display:none;font:800 9px Arial;fill:#08090f}
  .cb .wb-cbt{display:block}
  .wb-ask{display:flex;flex-direction:column;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px}
  .wb-q{display:flex;align-items:center;gap:10px;min-height:44px}
  .wb-q p{flex:1;margin:0;font-size:14px;line-height:1.3;min-height:36px}
  .wb-q p.ph{color:var(--muted)}
  .wb-q .btn{flex:none;min-width:96px;height:44px}
  .wb-rows{display:flex;flex-direction:column;gap:6px}
  .wb-row{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none;padding:1px 0}
  .wb-row::-webkit-scrollbar{display:none}
  .wb-row>small{flex:none;width:62px;color:var(--dim);font:700 italic 10px/1.1 var(--f-d);letter-spacing:.06em;text-transform:uppercase}
  .wb-chip{flex:none;height:40px;padding:0 12px;border-radius:20px;background:var(--panel2);border:1px solid var(--line2);color:var(--fg);font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
  .wb-chip i{width:14px;height:14px;border-radius:50%;border:1px solid rgba(255,255,255,.35)}
  .wb-chip.on{background:var(--cyan);color:var(--ink);border-color:var(--cyan)}
  .wb-chip.on2{background:var(--yellow);color:var(--ink);border-color:var(--yellow)}
  .wb-chip.asked{opacity:.5}
  .wb-chip:disabled{opacity:.3}
  .wb-tip{margin:0;color:var(--muted);font-size:12px;text-align:center}
  .wb-log{display:flex;flex-direction:column;gap:4px;font-size:13px}
  .wb-log h4{margin:0 0 2px;font:700 italic 11px/1 var(--f-d);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .wb-log div{display:flex;gap:8px;align-items:baseline;padding:5px 8px;border-radius:8px;background:var(--panel);border:1px solid var(--line)}
  .wb-log div>span{flex:1;min-width:0}
  .wb-log em{font-style:normal;font:800 italic 13px/1 var(--f-d);flex:none}
  .wb-log em.y{color:var(--good)} .wb-log em.n{color:var(--bad)}
  .wb-ans{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:30;font:800 italic 72px/1 var(--f-d);pointer-events:none;animation:shout 1.2s var(--spring) forwards;text-shadow:4px 4px 0 var(--ink)}
  .wb-ans.y{color:var(--good)} .wb-ans.n{color:var(--bad)}
  @media (hover:hover) and (pointer:fine){
    .wb-c.can:hover{border-color:var(--pink);transform:translateY(-2px);cursor:pointer}
    .wb-chip:not(:disabled):hover{border-color:var(--cyan)}
  }
  @media (min-width:960px){
    .wb-c{font-size:12px;padding:5px 3px 4px}
    .wb-chip{height:36px;padding:0 11px}
    .wb-row{scrollbar-width:thin;padding-bottom:3px}
    .wb-row::-webkit-scrollbar{display:block;height:6px}
  }
  @media (min-width:1280px){
    .wb-row{flex-wrap:wrap;overflow:visible}
    .wb{width:100%;max-width:980px;display:grid;grid-template-columns:minmax(0,1fr) clamp(240px,34%,320px);grid-template-rows:auto 1fr;grid-template-areas:'top side' 'board side';align-items:start;gap:12px 22px}
    .wb-top{grid-area:top} .wb-board{grid-area:board;gap:8px;align-self:start} .wb-side{grid-area:side;display:flex;flex-direction:column;gap:12px}
    .wb-row>small{width:100%}
    .wb-log{max-height:300px;overflow:auto}
  }
  @media (max-width:1279px){ .wb-side{display:contents} .wb-ask{order:2} .wb-log{order:3} .wb-board{order:1} .wb-top{order:0} }`);

  const demoFaces = ids => `<div class="wb-board" style="grid-template-columns:repeat(${ids.length},1fr);max-width:${ids.length * 64}px;margin:0 auto">${ids.map(i => `<div class="wb-c${i < 0 ? ' out' : ''}">${face(FIG[Math.abs(i)])}<span translate="no">${FIG[Math.abs(i)].name}</span></div>`).join('')}</div>`;

  V.register({
    id: 'who', name: 'Wer bin ich?', cat: 'Klassiker', order: 8, accent: '#ff9fd8',
    short: 'Fragen, Figuren umklappen, raten.',
    desc: 'Jeder hat eine geheime Figur aus denselben 24 Gesichtern. Stellt abwechselnd Ja-Nein-Fragen, auch zwei Merkmale mit „oder“. Was nicht passt, klappt um. Wer zuerst richtig rät, gewinnt, aber ein Fehlversuch kostet ein Herz.',
    levelInfo: ['Fragt oft ins Blaue und manchmal etwas, das nichts Neues bringt.', 'Fragt nach einzelnen Merkmalen, die meistens gut teilen.', 'Nutzt auch „oder“-Fragen und rät, sobald es sich lohnt.', 'Teilt mit jeder Frage so genau wie möglich in zwei Hälften.'],
    keys: [['Pfeile', 'Figur wählen'], ['Enter', 'Figur zum Raten auswählen'], ['F', 'Frage stellen oder raten'], ['Rücktaste', 'Auswahl löschen']],
    localHint: 'Vor jedem Zug wird das Handy weitergegeben, damit niemand die geheime Figur des anderen sieht.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="3" y="6" width="19" height="25" rx="4" fill="#1d2140" stroke="#ff9fd8" stroke-width="2"/><circle cx="12.5" cy="16" r="5" fill="#e9b98f"/><path d="M7 27c1-5 10-5 11 0z" fill="#4f8bff"/><path d="M7.5 15c0-7 10-7 10 0-2-3-8-3-10 0z" fill="#d9531e"/><rect x="26" y="6" width="19" height="25" rx="4" fill="#1d2140" stroke="#3a3f66" stroke-width="2" transform="rotate(8 35 18)" opacity=".55"/><path d="M29 10l13 15M42 10L29 25" stroke="#ff5d73" stroke-width="2.5" opacity=".8"/><text x="24" y="45" text-anchor="middle" font-size="15" font-weight="800" fill="#ffd84f" font-family="Arial">?</text></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Ihr beide habt dieselben <b>24 Figuren</b> vor euch. Jeder bekommt geheim eine davon als <b>seine Figur</b>. Findet heraus, welche Figur der andere hat. Wer sie zuerst <b>richtig rät</b>, gewinnt.', demo: demoFaces([1, 9, 13, 21]) },
      { t: 'Fragen stellen', d: 'Bist du dran, tippe unten ein <b>Merkmal</b> an, zum Beispiel <b>Brille</b>, und dann <b>Fragen</b>. Das Spiel beantwortet die Frage ehrlich mit <b>Ja</b> oder <b>Nein</b>. Am PC klickst du die Merkmale rechts an, F stellt die Frage.' },
      { t: 'Umklappen', d: 'Nach der Antwort klappen alle Figuren um, die <b>nicht mehr passen</b>. Lautet die Antwort „Nein, keine Brille“, fallen alle mit Brille weg. Danach ist der andere dran.', demo: demoFaces([-1, 0, -2, 4]) },
      { t: 'Zwei Merkmale mit „oder“', d: 'Tippst du <b>zwei Merkmale</b> an, fragst du mit <b>oder</b>: „Hat deine Figur eine Brille oder einen Bart?“ Ja heißt: mindestens eins davon. So kannst du die Figuren geschickter in zwei Hälften teilen.' },
      { t: 'Raten und Herzen', d: 'Glaubst du, du weißt es, <b>tippe die Figur an</b> und dann <b>Raten</b>. Richtig: gewonnen. Falsch: Du verlierst <b>ein Herz</b>, die Figur klappt um, und der andere ist dran. Jeder hat <b>zwei Herzen</b>. Ist das letzte weg, hast du verloren.' },
      { t: 'Fair bis zum Schluss', d: 'Rät der Spieler, der angefangen hat, richtig, bekommt der andere noch <b>einen letzten Rateversuch</b>. Trifft er auch, ist es <b>unentschieden</b>.' },
      { t: 'Tipps', d: 'Gute Fragen teilen die übrigen Figuren in <b>zwei gleich große Hälften</b>, egal ob Ja oder Nein kommt. Bei nur noch <b>zwei</b> Figuren und zwei Herzen lohnt sich Raten fast immer: Liegst du falsch, weißt du die Lösung sicher.' }
    ],
    start(ctx) {
      const P = ctx.players, R = ctx.rng, local = ctx.mode === 'local';
      // the same order and the same two secrets in every browser
      const order = FIG.map(f => f.id);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const s1 = Math.floor(R() * NF); let s2 = Math.floor(R() * (NF - 1)); if (s2 >= s1) s2++;
      const secret = { 1: s1, 2: s2 };
      const out = { 1: new Set(), 2: new Set() }, hearts = { 1: 2, 2: 2 }, asked = { 1: [], 2: [] };
      const log = [];
      let turn = 1, phase = 'play', over = false, acts = 0, viewer = 0, busy = false;
      let pick = [], guess = -1;
      const wrap = V.el('div', 'wb'); ctx.stage.appendChild(wrap);
      // whose screen this is: online your seat, against the AI you, at one device whoever has the phone
      const me = () => local ? viewer : ctx.mySide || (ctx.aiSide ? 3 - ctx.aiSide : 1);
      const left = s => NF - out[s].size;
      const myTurn = () => !over && !busy && turn === me() && !ctx.isAI(turn);
      const heartsHtml = s => `<i>${'♥'.repeat(hearts[s])}<s>${'♥'.repeat(2 - hearts[s])}</s></i>`;

      ctx.listen((s, m) => {
        if (over || !m || s !== turn || m.n !== acts + 1) return;
        if (m.q && phase === 'play' && validQ(m.q)) { acts++; return asked_(s, m.q); }
        if (Number.isInteger(m.g) && m.g >= 0 && m.g < NF && !out[s].has(m.g)) { acts++; return guessed(s, m.g); }
      });

      function asked_(s, q) {
        const yes = fits(FIG[secret[3 - s]], q);
        const gone = [];
        FIG.forEach(f => { if (!out[s].has(f.id) && fits(f, q) !== yes) { out[s].add(f.id); gone.push(f.id); } });
        asked[s].push(q.join('|'));
        log.unshift({ s, q, yes });
        busy = false; pick = []; guess = -1;
        if (ctx.isAI(s)) V.sfx.them(); else V.sfx.place();
        ctx.status(`${ctx.who(s)}: ${qText(q)} <b class="${yes ? 'good' : 'bad'}">${yes ? 'Ja' : 'Nein'}</b>`);
        const showsHere = s === me() || (local && s === viewer);
        if (showsHere && !ctx.fast()) {
          const a = V.el('div', 'wb-ans ' + (yes ? 'y' : 'n'), yes ? 'Ja!' : 'Nein!'); document.body.appendChild(a); setTimeout(() => a.remove(), 1300);
        }
        turn = 3 - s;
        draw(showsHere ? gone : []);
        next(showsHere ? 1500 : 700);
      }
      function guessed(s, g) {
        const ok = g === secret[3 - s];
        log.unshift({ s, g, ok });
        busy = false; pick = []; guess = -1;
        if (ok) {
          V.sfx.found();
          if (s === 1 && phase === 'play') {
            phase = 'last'; turn = 2;
            ctx.status(`${ctx.who(1)} hat <b translate="no">${FIG[g].name}</b> richtig geraten! ${ctx.who(2)} hat noch einen letzten Versuch`);
            draw();
            return ctx.later(step, ctx.fast() ? 0 : 1200);
          }
          return finish(phase === 'last' ? 0 : s, phase === 'last' ? 'Beide haben richtig geraten' : `${FIG[g].name} richtig geraten`);
        }
        V.sfx.bad();
        out[s].add(g); hearts[s]--;
        if (phase === 'last') return finish(1, `${FIG[g].name} war falsch`);
        if (hearts[s] <= 0) return finish(3 - s, `${ctx.name(s)} hat keine Herzen mehr`);
        ctx.status(`${ctx.who(s)}: <b translate="no">${FIG[g].name}</b>? <b class="bad">Falsch</b>, <span>ein Herz weniger</span>`);
        turn = 3 - s;
        draw([g]);
        next(1100);
      }
      function next(ms) {
        ctx.later(step, ctx.fast() ? 0 : ms);
      }
      function step() {
        if (over) return;
        if (local) {
          viewer = 0; wrap.innerHTML = '';
          return ctx.handoff(turn, phase === 'last' ? 'Dein letzter Rateversuch.' : 'Du bist dran. Der andere schaut weg.', () => { viewer = turn; go(); });
        }
        go();
      }
      function go() {
        ctx.turn(turn, phase === 'last' ? (turn === me() ? 'Letzte Chance: Tippe eine Figur an und rate' : `${ctx.who(turn)} hat einen letzten Versuch`) : false);
        draw();
        if (!ctx.isBot(turn) || !ctx.amHost()) return;
        // the computer asks (the host does it for computer seats at a table)
        const s = turn;
        busy = true;
        ctx.later(() => { busy = false; ctx.submit(think(s), s); }, ctx.auto ? 0 : V.aiMs(900 + Math.random() * 700));
      }
      function think(s) {
        const n = acts + 1, L = ctx.level || 0;
        const cand = FIG.map(f => f.id).filter(id => !out[s].has(id));
        const pickG = () => ({ g: V.pick(cand), n });
        if (phase === 'last' || cand.length === 1) return pickG();
        const theirs = left(3 - s);
        // two left and a heart to spare: guessing wins now or next time for sure, asking only next time
        if (L >= 2 && cand.length === 2 && hearts[s] >= 2) return pickG();
        // Profi: the other one will guess right next turn and there is no last chance for side 1, so try it now
        if (L === 3 && s === 1 && theirs === 1) return pickG();
        if (L === 3 && hearts[s] >= 2 && cand.length <= 3 && theirs <= 2) return pickG();
        if (L === 0 && cand.length <= 3 && Math.random() < 0.5) return pickG();
        const q = aiQuestion(L, cand);
        return q ? { q, n } : pickG();
      }
      function finish(w, note) {
        over = true; phase = 'end';
        draw();
        ctx.end(w, note);
      }

      // ---------- screen ----------
      function draw(gone) {
        const m = me();
        if (!m && local) { wrap.innerHTML = ''; return; }
        const v = m || 1, o = 3 - v;
        const mine = FIG[secret[v]];
        const can = myTurn();
        const reveal = over;
        // left: your secret figure (the other one has to find it); right: hearts and how many are left on both boards
        const top = `<div class="wb-top"><div class="wb-me"><div class="wb-face">${face(mine)}</div><div><small>${local ? ctx.name(v) + ': deine Figur' : 'Deine Figur'}</small><b translate="no">${mine.name}</b></div></div>
          <div class="wb-st"><span><b>${local ? ctx.name(v) : 'Du'}</b> ${heartsHtml(v)} <small>noch ${left(v)}</small></span><span><b>${ctx.name(o)}</b> ${heartsHtml(o)} <small>noch ${left(o)}</small></span></div></div>`;
        const board = `<div class="wb-board">${order.map(id => { const f = FIG[id], isOut = out[v].has(id); return `<button class="wb-c${isOut ? ' out' : can ? ' can' : ''}${guess === id ? ' sel' : ''}${reveal && id === secret[o] ? ' win' : ''}${gone && gone.includes(id) ? ' flip' : ''}" data-f="${id}" aria-label="${f.name}"${isOut || !can ? ' tabindex="-1"' : ''}>${face(f)}<span translate="no">${f.name}</span></button>`; }).join('')}</div>`;
        let ask = '';
        if (!over) {
          if (can) {
            const last = phase === 'last';
            const text = guess >= 0 ? `Ist es <b translate="no">${FIG[guess].name}</b>?` : pick.length ? qText(pick) : last ? 'Tippe oben die Figur an, die du rätst.' : 'Wähl ein oder zwei Merkmale, oder tippe oben eine Figur an, um zu raten.';
            const btn = guess >= 0 ? `<button class="btn primary" data-a="go"><span>Raten</span></button>` : `<button class="btn primary" data-a="go"${pick.length && !last ? '' : ' disabled'}><span>Fragen</span></button>`;
            const used = new Set(asked[v]);
            const rows = ROWS.map((r, ri) => `<div class="wb-row"><small>${r}</small>${Q.filter(q => q[3] === ri).map(q => {
              const k = pick.indexOf(q[0]);
              const sw = ri === 1 ? HAIR[q[0][2]] : ri === 3 ? SHIRT[q[0][2]] : '';
              return `<button class="wb-chip${k === 0 ? ' on' : k === 1 ? ' on2' : ''}${used.has(q[0]) ? ' asked' : ''}" data-q="${q[0]}"${last ? ' disabled' : ''}>${sw ? `<i style="background:${sw}"></i>` : ''}<span>${q[1]}</span></button>`;
            }).join('')}</div>`).join('');
            ask = `<div class="wb-ask"><div class="wb-q"><p class="${pick.length || guess >= 0 ? '' : 'ph'}">${text}</p>${btn}</div>${last ? '' : `<div class="wb-rows">${rows}</div>`}</div>`;
          } else {
            ask = `<div class="wb-ask"><p class="wb-tip">${ctx.who(turn)} ${phase === 'last' ? 'hat den letzten Rateversuch' : 'ist dran'} …</p></div>`;
          }
        } else {
          ask = `<div class="wb-ask"><p class="wb-tip">Die Figur von ${ctx.who(o)} war <b translate="no">${FIG[secret[o]].name}</b>.</p></div>`;
        }
        const entries = log.slice(0, V.ui && V.ui.wide && V.ui.wide() ? 40 : 4).map(e => `<div><span>${ctx.who(e.s)}: ${e.q ? qShort(e.q) : `<b translate="no">${FIG[e.g].name}</b>?`}</span><em class="${(e.q ? e.yes : e.ok) ? 'y' : 'n'}">${e.q ? (e.yes ? 'Ja' : 'Nein') : e.ok ? 'Richtig' : 'Falsch'}</em></div>`).join('');
        const logEl = log.length ? `<div class="wb-log nofit"><h4>Verlauf</h4>${entries}</div>` : '';
        wrap.innerHTML = `${top}${board}<div class="wb-side">${ask}${logEl}</div>`;
        bind();
      }
      function bind() {
        wrap.querySelectorAll('.wb-c').forEach(b => b.onclick = () => {
          if (!myTurn()) return;
          const id = +b.dataset.f; if (out[me()].has(id)) return;
          guess = guess === id ? -1 : id; pick = [];
          V.sfx.tick(); draw();
        });
        wrap.querySelectorAll('.wb-chip').forEach(b => b.onclick = () => {
          if (!myTurn() || phase !== 'play') return;
          const k = b.dataset.q, i = pick.indexOf(k);
          if (i >= 0) pick.splice(i, 1); else if (pick.length < 2) pick.push(k); else pick[1] = k;
          guess = -1; V.sfx.tick(); draw();
        });
        const go = wrap.querySelector('[data-a=go]'); if (go) go.onclick = send;
        ctx.nav(() => [...wrap.querySelectorAll('.wb-c.can')], {});
      }
      function send() {
        if (!myTurn()) return;
        if (guess >= 0) { busy = true; draw(); return ctx.submit({ g: guess, n: acts + 1 }, turn); }
        if (pick.length && phase === 'play') { busy = true; const q = pick.slice(); draw(); return ctx.submit({ q, n: acts + 1 }, turn); }
        V.sfx.bad();
      }
      ctx.keys(e => {
        if (!myTurn()) return false;
        const k = e.key.toLowerCase();
        if (k === 'f') { send(); return true; }
        if (e.key === 'Backspace') { pick = []; guess = -1; draw(); return true; }
        return false;
      });
      step();
    }
  });
})();