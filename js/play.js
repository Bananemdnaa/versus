// Versus: playing a match. Player cards, the AI's theatre, online sync (duels and tables), reactions, chess clock.
(function () {
  'use strict';

  const P = V._, { S, settings, stat, IC, setSwap, mount, locked, guest, toast, home, setup, openModal, closeModal, nav, tutorial } = P;

  // ---------- AI crosshair ----------
  const aim = (function () {
    let el = null;
    const get = () => { if (!el) { el = V.el('div', 'aim'); document.body.appendChild(el); } return el; };
    return {
      to(target, real, label) {
        const e = get();
        e.dataset.label = label || 'KI';
        const r = target.getBoundingClientRect(), p = 4, fresh = !e.classList.contains('on');
        if (fresh) e.style.transition = 'none';
        e.style.transform = `translate(${r.left - p}px,${r.top - p}px)`;
        e.style.width = r.width + p * 2 + 'px'; e.style.height = r.height + p * 2 + 'px';
        e.classList.toggle('real', !!real); e.classList.remove('lock');
        if (fresh) { void e.offsetWidth; e.style.transition = ''; }
        e.classList.add('on');
      },
      lock() { const e = get(); e.classList.remove('lock'); void e.offsetWidth; e.classList.add('lock'); },
      hide() { if (el) el.classList.remove('on', 'real', 'lock'); }
    };
  })();

  // ---------- VS intro before each match ----------
  function vsIntro(left, right, quick) {
    if (!V.fxOn() || settings.intro === false) return;
    const el = V.el('div', 'vsi' + (quick ? ' quick' : ''), `
      <div class="vsi-l"><div class="vsi-n"><small>${left.sub}</small><b>${left.name}</b></div></div>
      <div class="vsi-r"><div class="vsi-n"><small>${right.sub}</small><b>${right.name}</b></div></div>
      <div class="vsi-vs">VS</div><div class="vsi-flash"></div>`);
    document.body.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    el.addEventListener('pointerdown', kill);
    setTimeout(() => V.sfx.place(), quick ? 120 : 260);
    setTimeout(kill, quick ? 650 : 1150);
  }

  // ---------- play ----------
  let rematchCarry = null;
  // quick reactions in online matches (ids are checked by the server)
  const EMO = { gg: 'GG', wow: '😮', haha: '😂', oops: '🙈', think: '🤔', fire: '🔥', clap: '👏', sweat: '😅' };
  // duels where the turn always alternates and side 1 begins (same list as match_move on the server)
  const ALTERNATE = ['c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon'];
  // Modes: 'ai' (vs. computer), 'local' (two players, one device), 'online' (vs. a friend over the server),
  // 'watch' (admins follow or replay a match). A remote player is handled like the AI: the game calls
  // ctx.aiTurn() and gets the move from the network instead of from a search.
  function play(g, cfg, series) {
    let rematch = !!series;
    const clockMin = g.id === 'chess' && cfg.mode !== 'ai' && [3, 5, 10].includes(+(cfg.opts && cfg.opts.clock)) ? +cfg.opts.clock : 0;
    // guests with a guest session (quick match) may play online duels; tables and friends need an account
    const session = V.cloud && V.cloud.user();
    if (cfg.mode !== 'watch' && (locked(g) || (guest() && (cfg.mode === 'table' || (['online', 'open'].includes(cfg.mode) && !session))))) { toast('Dafür brauchst du ein Konto'); return home('profile'); }
    P.enterPlay(g);
    const online = cfg.mode === 'online', watch = cfg.mode === 'watch', M = cfg.match || {};
    // 'table': an online table with 2-4 seats (party games). Seats, names and the dice seed come from the server;
    // seats run by the AI are computed by the host's browser.
    const table = cfg.mode === 'table', T = table ? M.init : null;
    const tbots = new Set(table ? T.bots || [] : []);
    let thost = table ? T.host : 0;
    // test.html: the AI plays every seat, nothing is saved
    const auto = !!cfg.auto;
    if (!watch && !auto) S.set('recent', g.id);
    if (V.cloud && !auto) V.cloud.touch(g.id);
    // an online rematch keeps the score between the same two players (sides may have swapped)
    if (online && !series && rematchCarry && rematchCarry.opp === M.opp) { series = { [M.side]: rematchCarry.me, [3 - M.side]: rematchCarry.them, d: rematchCarry.d }; rematch = true; }
    rematchCarry = null;
    series = series || { 1: 0, 2: 0, d: 0 };
    const ai = cfg.mode === 'ai';
    // Party games (g.party): 2-4 players (option "n"). You are always player 1; every other seat is
    // a computer player against the AI, or a person at the same device.
    const party = !!g.party, N = party ? Math.max(2, Math.min(4, +(table ? T.n : cfg.opts && cfg.opts.n) || 2)) : 2, SIDES = [1, 2, 3, 4].slice(0, N);
    if (party) SIDES.forEach(s => { if (series[s] == null) series[s] = 0; });
    const aiSide = party ? 0 : ai ? (cfg.first === 'me' ? 2 : cfg.first === 'ai' ? 1 : (Math.random() < 0.5 ? 1 : 2)) : 0;
    const mySide = online ? M.side : table ? M.seat : 0;
    const oppSide = ai ? aiSide : online ? 3 - mySide : 0;
    setSwap(oppSide === 1);
    const L = oppSide ? 3 - oppSide : 1, R = 3 - L;
    const sideLabel = s => g.sides ? g.sides[s] : V.colorName(s);
    const names = { 1: 'Spieler 1', 2: 'Spieler 2', 3: 'Spieler 3', 4: 'Spieler 4' };
    if (ai && party) SIDES.forEach(s => { names[s] = s === 1 ? 'Du' : N > 2 ? 'KI ' + (s - 1) : 'KI'; });
    else if (ai) { names[aiSide] = 'KI'; names[3 - aiSide] = 'Du'; }
    if (table) SIDES.forEach(s => { names[s] = s === mySide ? 'Du' : T.names[s - 1] && !tbots.has(s) ? T.names[s - 1] : 'KI'; });
    const me = ai ? (party ? 1 : 3 - aiSide) : online || table ? mySide : 0;
    const botSide = s => auto || (ai && (party ? s !== 1 : s === aiSide)) || (table && tbots.has(s));
    const amHost = () => table && thost === mySide;
    if (online) { names[mySide] = 'Du'; names[oppSide] = M.opp; }
    if (watch) { names[M.aSide] = M.aName; names[3 - M.aSide] = M.bName; }
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const sub = s => sideLabel(s) + (s === 1 && g.cat !== 'Action' ? ' · beginnt' : '');
    const av = s => ai || table ? (botSide(s) ? IC.robot : s === me ? '<span>DU</span>' : `<span>${esc(names[s].slice(0, 2).toUpperCase())}</span>`) : online ? (s === mySide ? '<span>DU</span>' : `<span>${esc(names[s].slice(0, 2).toUpperCase())}</span>`) : watch ? `<span>${esc(names[s].slice(0, 2).toUpperCase())}</span>` : `<span>P${s}</span>`;
    const thinker = s => botSide(s) || (online && s === oppSide) || (table && s !== mySide) || watch;
    const card = (s, pos) => `<div class="pcard pcard-${pos} ps${s}" id="pl${s}"><span class="av">${av(s)}</span>
      <span class="nm"><b>${esc(names[s])}</b><small>${sub(s)}${botSide(s) ? ' · ' + V.LEVELS[cfg.level] : ''}</small></span>
      ${clockMin ? `<span class="clk" id="ck${s}"></span>` : ''}<span class="wins"><b>${series[s]}</b><small>Siege</small></span><em class="tag">am Zug</em>
      ${thinker(s) ? '<span class="tdots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}${ai && s === aiSide ? '<div class="bubble" aria-live="polite"></div>' : ''}</div>`;
    const sublabel = table ? `Online-Tisch · ${N} Spieler` : party ? (ai ? `Gegen ${N > 2 ? N - 1 + ' KIs' : 'KI'} · ` + V.LEVELS[cfg.level] : N + ' Spieler') : ai ? 'Gegen KI · ' + V.LEVELS[cfg.level] : online ? 'Online gegen ' + esc(M.opp) : watch ? 'Zuschauen · ' + esc(M.aName) + ' gegen ' + esc(M.bName) : 'Zu zweit';
    // two people at one phone, sitting opposite: player 2's card (and the status on their turn) is turned around
    const facing = cfg.mode === 'local' && settings.face && !party && g.cat !== 'Action';
    const v = mount(`<div class="view play${online || table ? ' net' : ''}${watch ? ' watch' : ''}${facing ? ' facing' + (g.turnBoard ? ' rotboard' : '') : ''}" data-g="${g.id}" style="--acc:${g.accent || 'var(--pink)'}">
      <div class="pbar"><button class="iconbtn" id="pb" aria-label="Zurück">${IC.back}</button><div class="ttl"><b>${g.name}</b><small>${sublabel}</small></div>
        <button class="iconbtn" id="ph" aria-label="Regeln" title="Regeln (T)">${IC.help}</button>
        ${online ? `<button class="iconbtn" id="pe" aria-label="Reaktion senden" title="Reaktion">${IC.smile}</button>` : ''}
        ${online ? `<button class="iconbtn" id="pr" aria-label="Aufgeben" title="Aufgeben">${IC.flag}</button>` : watch || table ? '' : `<button class="iconbtn" id="pr" aria-label="Neu starten" title="Neue Partie (N)">${IC.redo}</button>`}</div>
      <div class="duel${party ? ' party n' + N : ''}">
        ${party ? `<div class="pcol pcol-l">${SIDES.filter(s => s % 2).map(s => card(s, 'l')).join('')}</div><div class="pcol pcol-r">${SIDES.filter(s => !(s % 2)).map(s => card(s, 'r')).join('')}</div>` : `${card(L, 'l')}
        <div class="score" id="sc"><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b></div>
        ${card(R, 'r')}`}
        <div class="center"><div class="status" id="st" aria-live="polite"></div><div class="stage" id="stage"></div></div>
      </div></div>`);
    const stEl = v.querySelector('#st'), pls = {};
    SIDES.forEach(s => { pls[s] = v.querySelector('#pl' + s); });
    const timers = new Set(), cleanups = [];
    let alive = true, ended = false, keyFn = null, lastTurn = 0, lastNote = '', moodBand = 0, bubbleT = null;
    const LINES = {
      3: ['Ich sehe den Sieg.', 'Gleich ist es vorbei.', 'Das war’s wohl.'],
      2: ['Läuft für mich.', 'Gefällt mir.', 'Nicht schlecht, oder?'],
      0: ['Mal sehen.', 'Interessant.', 'Okay.', 'Hm.', 'Dein Zug.'],
      '-2': ['Hmm, knifflig.', 'Du spielst gut.', 'Das wird eng.'],
      '-3': ['Oh nein.', 'Das sieht übel aus.', 'Respekt.']
    };
    function speak(note, mood) {
      const b = ai && pls[aiSide] && pls[aiSide].querySelector('.bubble'); if (!b) return;
      let line = '';
      if (typeof mood === 'number') {
        const band = mood >= 0.97 ? 3 : mood > 0.45 ? 2 : mood <= -0.97 ? -3 : mood < -0.45 ? -2 : 0;
        if (band !== moodBand || Math.random() < (band ? 0.35 : 0.18)) line = V.pick(LINES[band]);
        moodBand = band;
      } else if (Math.random() < 0.2) line = V.pick(LINES[0]);
      if (!note && !line) { b.classList.remove('on'); return; }
      b.innerHTML = (note ? `<b>${note}</b>` : '') + (line ? `<span>${line}</span>` : '');
      b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
      clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.remove('on'), 3000);
    }
    cleanups.push(() => { clearTimeout(bubbleT); aim.hide(); });
    const setStatus = html => {
      if (stEl.innerHTML === html) return;
      stEl.innerHTML = html; if (V.fxOn()) V.fx.pop(stEl, 'st-in');
    };
    let net = null, tnet = null;
    // realtime channel of this match or table: every change we make pokes the others, a poke makes us fetch at once
    let chan = null;
    const rpc = (name, args) => V.cloud.rpc(name, args).then(r => { if (chan) chan.poke(); return r; });
    // one state request at a time; a poke that arrives during a request asks for one more right after it
    function pollOnce(o, fetch, every) {
      if (o.stopped || !alive) return;
      clearTimeout(o.timer); o.busy = true;
      fetch().then(st => { if (alive) o.feed(st); }, () => { }).then(() => {
        o.busy = false;
        if (o.stopped || !alive) return;
        if (o.again) { o.again = false; return o.poll(); }
        // with a working channel the regular poll is only a fallback for lost pokes
        o.timer = ctx.later(() => o.poll(), chan && chan.live() ? 4000 : every());
      });
    }
    const kick = o => { if (!o || o.stopped || !alive) return; if (o.busy) o.again = true; else o.poll(); };
    // a few seconds of grace, so the poke of a last action (resign, leaving the table) still goes out
    const closeChan = () => { const c = chan; if (c) setTimeout(() => c.close(), 3000); };
    let clock = null, listener = null, handSeen = 0;
    const remote = s => watch || (online && (s === oppSide || (net && net.queue.length > 0))) || (table && (s !== mySide || (tnet && tnet.queue.length > 0)));
    // dice, shuffled cards and other luck: online every browser draws the same numbers from a shared seed
    // (tables get it from the server, duels derive it from the match id)
    const idSeed = id => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    let seed = table ? (T.seed >>> 0) || 1 : online || watch ? idSeed(M.id) || 1 : 0;
    const rng = seed ? () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } : Math.random;
    const ctx = {
      stage: v.querySelector('#stage'), mode: cfg.mode, level: cfg.level, aiSide, opts: cfg.opts, sides: g.sides, n: N, players: SIDES,
      mySide, watchSides: watch ? { a: M.aSide } : null, rng, auto,
      // true while a table catches up on moves that were already played (after joining late or reloading)
      fast: () => !!(tnet && tnet.queue.length > 1),
      // games where everybody acts at the same time (Stadt Land Fluss): listen(fn) gets every action (s, m) in
      // one order for all browsers; submit(m, s) sends an action (s defaults to your own seat, the host may act for AI seats)
      listen(fn) { listener = fn; if (tnet) tnet.pump(); },
      submit(m, s) {
        s = s || mySide || 1;
        if (tnet) return tnet.submit(s, m);
        ctx.later(() => listener && listener(s, m), 0);
      },
      amHost: () => !table || amHost(),
      // hidden cards at one device: before a person's turn, ask the others to look away (only when 2+ people share it)
      handoff(s, text, cb) {
        const people = SIDES.filter(k => !ctx.isAI(k));
        if (cfg.mode !== 'local' || people.length < 2 || handSeen === s) return cb();
        handSeen = s;
        const el = V.el('div', 'handoff', `<div class="ho-in"><span class="ho-av c${s}">${esc(names[s].slice(0, 2).toUpperCase())}</span><h3>Gib das Gerät an <span class="c${s}">${esc(names[s])}</span></h3><p>${text || 'Die anderen schauen kurz weg.'}</p><button class="btn primary big" data-enter><span>Ich bin ${esc(names[s])}</span></button></div>`);
        ctx.stage.appendChild(el);
        el.querySelector('button').onclick = () => { el.remove(); V.sfx.ui(); cb(); };
      },
      handReset() { handSeen = 0; },
      isAI: s => botSide(s) || remote(s),
      // a seat played by the computer (against the AI, or at a table for someone who left)
      isBot: s => botSide(s),
      name: s => names[s],
      who(s) { return `<span class="c${s}">${esc(names[s])}</span>`; },
      alive: () => alive,
      later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; },
      onCleanup(fn) { cleanups.push(fn); },
      status: setStatus,
      turn(s, html) {
        if (clock) clock.turn(s);
        SIDES.forEach(k => pls[k].classList.toggle('on', s === k));
        v.classList.toggle('turn-r', s === R);
        if (s && s !== lastTurn && V.fxOn()) V.fx.pop(pls[s], 'pcard-in');
        lastTurn = s;
        const note = s && oppSide && s !== oppSide && lastNote ? `${ctx.who(oppSide)}: ${lastNote} · ` : '';
        if (html !== false) setStatus(note + (html || (names[s] === 'Du' ? '<span class="c' + s + '">Du</span> bist dran' : `${ctx.who(s)} ist dran`)));
        nav.refresh();
      },
      // Every move goes through here (all modes). Online, your own moves are sent to the server.
      moved(s, m) { if (net) net.moved(s, m); if (tnet) tnet.moved(s, m); },
      // One AI move with a bit of theatre: think (min. time per level), let the crosshair hover over
      // a couple of alternatives, lock on the real target(s), then move and comment in the bubble.
      // o.think() -> { move, mood? }, o.targets(move) -> [elements], o.decoys(move) -> [elements],
      // o.apply(move), o.say(move) -> short text, o.quick -> follow-up move (e.g. extra turn) with less delay,
      // o.decode(raw) -> legal move or null (online: turns the received move back into the game's own form)
      aiTurn(o) {
        if (net) return net.take(o);
        // at a table only the host plays the AI seats; everything else (and any backlog) comes from the server
        if (tnet && (tnet.queue.length || !(tbots.has(o.side) && amHost()))) return tnet.take(o);
        const s = o.side || aiSide, card = pls[s];
        card.classList.add('thinking');
        setStatus(`<span class="c${s}">${esc(names[s])}</span> <span class="thinking">${o.quick ? 'macht weiter' : 'denkt'}</span>`);
        const minT = auto ? 0 : settings.aiFast ? 160 : o.quick ? 380 : [650, 850, 1050, 1250][cfg.level] + Math.random() * 450;
        const t0 = performance.now();
        ctx.later(() => {
          const res = o.think();
          ctx.later(() => aimAt(o, res, card, true, false, party ? s : 0), Math.max(0, minT - (performance.now() - t0)));
        }, 70);
      },
      think(fn, ms = 380) { setStatus(`<span class="c${aiSide}">KI</span> <span class="thinking">denkt</span>`); ctx.later(fn, ms); },
      nav(fn, o) { nav.set(fn, o); },
      keys(fn) { keyFn = fn; },
      end(winner, note, fromServer) {
        if (ended || !alive) return; ended = true;
        SIDES.forEach(k => pls[k].classList.remove('on'));
        nav.hide();
        if (net && online && !fromServer) net.finish(winner);
        if (net) { if (online) net.after = true; else net.stop(); }
        if (tnet) { if (!fromServer) tnet.finish(winner); tnet.stop(); }
        if (cfg.onEnd) cfg.onEnd(winner, note);
        if (!watch && !auto) {
          const s = stat(g.id);
          if (ai) { const r = s.ai[cfg.level]; if (winner === 0) r.d++; else if (winner === me) r.w++; else r.l++; }
          else if (online || table) { s.on = s.on || { w: 0, l: 0, d: 0 }; if (winner === 0) s.on.d++; else if (winner === mySide) s.on.w++; else s.on.l++; }
          else { if (winner === 0) s.local.d++; else if (winner === 1) s.local.a++; else s.local.b++; }
          S.set('stats', P.stats);
        }
        if (winner === 0) series.d++; else series[winner]++;
        const sc = v.querySelector('#sc'); if (sc) { sc.innerHTML = `<b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b>`; V.fx.pop(sc, 'fx-pop'); }
        SIDES.forEach(k => { const b = pls[k].querySelector('.wins b'); if (b.textContent !== String(series[k])) { b.textContent = series[k]; V.fx.pop(b, 'fx-pop'); } });
        const meWon = me && winner === me;
        const good = winner && (!me || meWon);
        if (good) { V.sfx.win(); setTimeout(() => V.fx.confetti(), 250); }
        else if (winner) { V.sfx.lose(); V.fx.shake(ctx.stage); }
        // V.t: the letters are animated one by one, so the translation has to happen before the split
        const big = V.t(winner === 0 ? 'Remis' : me ? (meWon ? 'Sieg!' : 'Niederlage') : `${names[winner]} gewinnt`);
        setStatus(winner === 0 ? 'Unentschieden' : me ? (meWon ? '<span class="c' + winner + '">Du hast gewonnen</span>' : `${ctx.who(winner)} hat gewonnen`) : `${ctx.who(winner)} gewinnt`);
        const tone = winner === 0 ? 'draw' : me ? (meWon ? 'win' : 'lose') : party ? 'w' + winner : (winner === L ? 'left' : 'right');
        const again = () => online ? net.rematch(series) : table ? (closeModal(), V.online.table(g, cfg.opts, cfg.level)) : play(g, cfg, series);
        const menu = () => watch ? V.account.admin('matches') : setup(g);
        ctx.later(() => {
          const m = openModal(`<div class="ko ${tone}">
            <div class="band"><div class="band-in"><span class="kicker">${esc(note || sublabel)}${online && net && net.last && net.last.ranked === false ? ' · zählt nicht für die Rangliste' : ''}</span>
              <h2 aria-label="${esc(big)}">${[...big].map((ch, k) => `<span aria-hidden="true" style="--k:${k}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</h2></div></div>
            ${party ? `<div class="eparty">${SIDES.map(k => `<span class="ep c${k}"><b>${series[k]}</b><small>${esc(names[k])}</small></span>`).join('')}</div>` : `<div class="eseries"><span class="nl">${esc(names[L])}</span><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b><span class="nr">${esc(names[R])}</span></div>`}
            ${series.d ? `<p class="small">${series.d}× unentschieden</p>` : ''}
            ${online ? `<div class="kemo" id="kemo"></div><div class="kquick">${['gg', 'clap', 'haha', 'sweat'].map(e => `<button data-emo="${e}">${EMO[e]}</button>`).join('')}</div>` : ''}
            ${online && V.online.friendOf(M.opp) === false && !(V.cloud.user() && V.cloud.user().anon) ? `<button class="btn ghost sm efr" id="efr"><span>${IC.plus}${esc(M.opp)} als Freund hinzufügen</span></button>` : ''}
            ${watch ? '' : `<button class="btn ghost sm eshare" id="es"><span>${IC.share}Ergebnis teilen</span></button>`}
            ${online && V.online.report ? `<button class="link erep" id="erep">${esc(M.opp)} melden</button>` : ''}
            <div class="actions">${watch ? '' : `<button class="btn primary" id="er"><span>${IC.redo}${online ? 'Revanche anfragen' : table ? 'Neuer Tisch' : 'Revanche'}</span><kbd class="only-fine">Enter</kbd></button>`}<button class="btn" id="eb"><span>Brett ansehen</span></button><button class="btn ghost" id="em"><span>${watch ? 'Zurück' : 'Menü'}</span></button></div></div>`, 'endm', null, false, e => {
            if ((e.key === 'Enter' || e.key === 'n' || e.key === 'N') && !watch) { again(); return true; }
            if (e.key === 'Escape') { closeModal(); return true; }
            if (e.key === 'm' || e.key === 'M') { menu(); return true; }
            return false;
          });
          const er = m.querySelector('#er'); if (er) er.onclick = again;
          m.querySelectorAll('[data-emo]').forEach(b => b.onclick = () => sendEmote(b.dataset.emo));
          const efr = m.querySelector('#efr');
          if (efr) efr.onclick = () => V.online.request(M.opp).then(r => { efr.disabled = true; efr.querySelector('span').textContent = r === 'accepted' || r === 'friends' ? 'Ihr seid jetzt Freunde' : 'Anfrage gesendet'; }, e => toast(e.message));
          const erep = m.querySelector('#erep'); if (erep) erep.onclick = () => V.online.report(M.opp, M.id);
          if (online && net) net.rematchUI();
          const es = m.querySelector('#es'); if (es) es.onclick = () => { V.sfx.ui(); shareCard(); };
          m.querySelector('#eb').onclick = closeModal;
          m.querySelector('#em').onclick = menu;
        }, g.endDelay ?? 1150);
      }
    };
    // crosshair, then the move (shared by the AI and remote players)
    function aimAt(o, res, card, isAI, fast, who) {
      const tg = (o.targets ? o.targets(res.move) : []).filter(Boolean);
      let path = [];
      if (isAI && o.decoys && !o.quick && !settings.aiFast) path = V.shuffle((o.decoys(res.move) || []).filter(x => x && !tg.includes(x))).slice(0, V.rand(3));
      path = path.concat(tg);
      const done = () => {
        aim.hide(); if (card) card.classList.remove('thinking');
        lastNote = o.say ? o.say(res.move) : '';
        if (isAI) speak(lastNote, res.mood);
        o.apply(res.move);
      };
      if (!V.fxOn() || !path.length || fast) return done();
      let i = 0;
      const step = () => {
        if (i >= path.length) { aim.lock(); return ctx.later(done, 170); }
        const real = i >= path.length - tg.length;
        aim.to(path[i], real, who ? names[who] : 'KI'); i++;
        if (!real) V.sfx.tick();
        ctx.later(step, real ? 240 : 190);
      };
      step();
    }

    // ---------- network (online and watch) ----------
    if (online || watch) {
      net = {
        queue: [], known: 0, applied: 0, waiting: null, stopped: false, last: null, chain: Promise.resolve(), offWarn: false, react: 0, fed: false, after: false, clockAt: 0, mine: null, started: false, told: null,
        feed(st) {
          if (!st) return;
          this.last = st;
          const first = st.total - st.moves.length;
          st.moves.forEach((mv, k) => {
            const idx = first + k;
            if (idx < this.known) return;
            this.known = idx + 1;
            if (idx < this.applied) return;
            this.queue.push(mv);
          });
          if (online) {
            const oppOn = st.role === 'a' ? st.b_online : st.a_online;
            pls[oppSide].classList.toggle('off', !oppOn);
            if (!oppOn && !ended && st.status === 'live' && !this.offWarn) { this.offWarn = true; toast(names[oppSide] + ' ist gerade nicht erreichbar'); }
            if (oppOn) this.offWarn = false;
          }
          if (st.clock) this.clockAt = performance.now();
          (st.reacts || []).forEach(r => { if (r.id <= this.react) return; this.react = r.id; if (this.fed && (watch || r.side !== mySide)) showEmote(r.side, r.e); });
          this.fed = true;
          if (this.after) this.rematchUI();
          if (this.readyCb && st.fleets_ready) { const f = this.readyCb; this.readyCb = null; f(st); }
          this.pump(); this.checkEnd();
        },
        // the game waits for the next move of a remote side
        take(o) { this.waiting = o; const s = this.queue.length ? this.queue[0].s : oppSide; if (pls[s]) pls[s].classList.add('thinking'); this.pump(); },
        pump() {
          if (!this.waiting || !this.queue.length) return;
          const o = this.waiting, mv = this.queue.shift(); this.waiting = null;
          // games where the turn always alternates: a move from the wrong side is cheating (the server checks it too)
          if (ALTERNATE.includes(g.id) && mv.s !== 1 + this.applied % 2) return this.illegal();
          const m = o.decode ? o.decode(mv.m) : mv.m;
          if (m == null || m === undefined) return this.illegal();
          const fast = this.queue.length > 0;
          ctx.later(() => aimAt(o, { move: m }, pls[mv.s], false, fast, mv.s), fast ? 120 : 60);
        },
        moved(s, m) {
          this.applied++;
          if (online && s === mySide && this.applied > this.known) this.send(m, this.applied - 1);
        },
        send(m, ply) {
          this.chain = this.chain.then(() => rpc('match_move', { mid: M.id, ply, mv: m }))
            .then(n => { this.known = Math.max(this.known, n); })
            .catch(e => { if (!alive) return; toast(/desync/.test(e.message) ? 'Partie wird neu geladen' : 'Zug nicht gesendet: ' + e.message); ctx.later(() => V.online.resume(M.id), 900); });
        },
        finish(w) {
          const n = this.applied;
          this.chain = this.chain.then(() => rpc('match_finish', { mid: M.id, ply: n, w }))
            .then(st => { if (st && st.status === 'void') toast('Die Partie wurde annulliert (Ergebnisse passten nicht zusammen).'); }, () => { });
        },
        checkEnd() {
          const st = this.last;
          if (!st || ended || st.status === 'live' || st.status === 'invited' || this.queue.length || (watch && st.total > this.applied)) return;
          const w = st.status === 'void' ? 0 : st.winner_side || 0;
          const loser = w ? names[3 - w] : '';
          const me = online && w && 3 - w === mySide;
          const note = st.status === 'void' ? 'Partie annulliert' : st.result === 'resign' ? (me ? 'Du hast aufgegeben' : loser + ' hat aufgegeben') : st.result === 'time' ? (me ? 'Deine Zeit ist abgelaufen' : loser + ': Zeit abgelaufen') : st.result === 'abandon' ? (me ? 'Du hast die Partie verlassen' : loser + ' hat die Partie verlassen') : '';
          if (st.status === 'void' || st.result === 'resign' || st.result === 'abandon' || st.result === 'time' || watch) ctx.end(w, note, true);
        },
        illegal() { if (online) rpc('match_report', { mid: M.id, why: 'illegal move' }).catch(() => { }); toast('Ungültiger Zug empfangen, die Partie wird annulliert.'); ctx.end(0, 'Partie annulliert', true); },
        poll() { pollOnce(this, () => V.cloud.rpc('match_state', { mid: M.id, since: this.known }), () => (watch || this.after ? 1500 : 1000)); },
        stop() { this.stopped = true; },
        // Rematch: whoever asks first invites, the other one accepts by asking too. Score carries over.
        async rematch(series) {
          if (this.started) return;
          rematchCarry = { opp: M.opp, me: series[mySide], them: series[oppSide], d: series.d };
          try {
            const st = await rpc('match_rematch', { mid: M.id });
            if (st.status === 'live') { this.started = true; closeModal(); return V.online.start(st); }
            this.mine = st.id; this.rematchUI();
          } catch (e) {
            if (/match_rematch|function/i.test(e.message)) return V.online.invite(M.opp, g, cfg.opts);
            rematchCarry = null; toast(e.message); V.sfx.bad();
          }
        },
        rematchUI() {
          const r = this.last && this.last.rematch, btn = document.querySelector('.ko #er span');
          if (!r || this.started) return;
          if (r.status === 'live' && (r.id === this.mine || r.from === M.opp)) {
            if (r.id !== this.mine) return;
            this.started = true; closeModal(); return V.online.resume(r.id);
          }
          const set = (txt, cls) => { if (!btn) return; btn.innerHTML = IC.redo + txt; btn.parentNode.classList.toggle('pulse', cls === 'pulse'); btn.parentNode.classList.toggle('waiting', cls === 'wait'); };
          if (r.status === 'invited' && r.from === M.opp) {
            set('Revanche annehmen', 'pulse');
            if (this.told !== r.id) { this.told = r.id; toast(M.opp + ' will eine Revanche!'); V.sfx.goal(); }
          } else if (r.status === 'invited' && r.id === this.mine) set('Warte auf ' + esc(M.opp) + ' …', 'wait');
          else if (r.id === this.mine && r.status !== 'invited') {
            this.mine = null; set('Revanche anfragen', '');
            toast(r.status === 'declined' ? M.opp + ' möchte keine Revanche' : 'Keine Antwort auf die Revanche');
          }
        }
      };
      // Schiffe versenken: fleets and shots are handled by the server (fleets stay secret)
      ctx.net = {
        state: () => net.last,
        fleet: f => rpc('match_fleet', { mid: M.id, f }).then(st => { net.feed(st); return st; }),
        whenReady(cb) { net.readyCb = cb; if (net.last && net.last.fleets_ready) { net.readyCb = null; cb(net.last); } },
        async shot(i) {
          const ply = net.applied; net.applied++;
          try { const r = await rpc('match_shot', { mid: M.id, ply, cell: i }); net.known = Math.max(net.known, r.n); return r; }
          catch (e) { net.applied--; throw e; }
        }
      };
      net.feed(M.init);
      chan = V.cloud.channel('m:' + M.id, () => kick(net), online);
      ctx.later(() => net.poll(), 800);
      cleanups.push(() => {
        net.stopped = true; closeChan();
        // leaving while my rematch request is still open withdraws it
        if (net.mine && !net.started) V.cloud.rpc('match_cancel', { mid: net.mine }).catch(() => { });
      });
    }

    // ---------- online table (2-4 seats) ----------
    // Every action (rolling, moving a piece) is a move in one shared list. Each browser applies the list in order,
    // so all see the same game. Own moves and, for the host, the AI seats' moves are sent to the server.
    if (table) {
      tnet = {
        queue: [], known: 0, applied: 0, waiting: null, stopped: false, chain: Promise.resolve(), told: new Set(),
        feed(st) {
          if (!st) return;
          thost = st.host;
          (st.bots || []).forEach(b => {
            if (tbots.has(b)) return;
            tbots.add(b);
            if (b !== mySide && pls[b]) {
              const nm = pls[b].querySelector('.nm small'); if (nm) nm.textContent = sideLabel(b) + ' · KI übernimmt';
              pls[b].querySelector('.av').innerHTML = IC.robot;
              toast(names[b] + ' ist weg, die KI spielt weiter');
            }
          });
          SIDES.forEach(s => { if (pls[s]) pls[s].classList.toggle('off', s !== mySide && !tbots.has(s) && st.online && st.online[s - 1] === false); });
          const first = st.total - st.moves.length;
          st.moves.forEach((mv, k) => {
            const idx = first + k;
            if (idx < this.known) return;
            this.known = idx + 1;
            if (idx < this.applied) return;
            this.queue.push(mv);
          });
          this.pump();
          // a seat we wait for was handed to the AI and I am (now) the host: play it here
          const w = this.waiting;
          if (w && !this.queue.length && tbots.has(w.side) && amHost()) { this.waiting = null; ctx.aiTurn(w); }
          if (st.status === 'void' && !ended) ctx.end(0, 'Der Tisch wurde aufgelöst', true);
          // someone reported the end: our own game normally ends by itself a moment later and confirms the result
          // (two matching reports make the table count for the ranking); if not, end it with the server's result
          else if (st.status === 'done' && !ended && !this.queue.length && this.applied >= st.total && !this.doneT)
            this.doneT = ctx.later(() => { ctx.end(st.winner || 0, '', true); }, 4000);
        },
        take(o) { this.waiting = o; if (pls[o.side]) pls[o.side].classList.add('thinking'); this.pump(); },
        // simultaneous games: actions are only applied once they come back from the server, so all see one order
        submit(s, m) {
          this.chain = this.chain.then(() => rpc('party_move', { tid: M.id, ply: -1, s, mv: m }))
            .catch(e => { if (alive) toast('Nicht gesendet: ' + e.message); });
        },
        pump() {
          if (listener) {
            while (this.queue.length) { const mv = this.queue.shift(); this.applied++; listener(mv.s, mv.m); }
            return;
          }
          if (!this.waiting || !this.queue.length) return;
          const o = this.waiting, mv = this.queue.shift(); this.waiting = null;
          const m = mv.s === o.side ? (o.decode ? o.decode(mv.m) : mv.m) : null;
          if (m == null) return this.broken();
          const fast = this.queue.length > 0;
          ctx.later(() => aimAt(o, { move: m }, pls[mv.s], false, fast, mv.s), fast ? 90 : 60);
        },
        moved(s, m) {
          this.applied++;
          if ((s === mySide || (tbots.has(s) && amHost())) && this.applied > this.known) this.send(s, m, this.applied - 1);
        },
        send(s, m, ply) {
          this.chain = this.chain.then(() => rpc('party_move', { tid: M.id, ply, s, mv: m }))
            .then(n => { this.known = Math.max(this.known, n); })
            .catch(e => { if (!alive) return; toast(/desync/.test(e.message) ? 'Tisch wird neu geladen' : 'Zug nicht gesendet: ' + e.message); ctx.later(() => V.online.resumeTable(M.id), 900); });
        },
        finish(w) { const n = this.applied; this.chain = this.chain.then(() => rpc('party_finish', { tid: M.id, ply: n, w })).catch(() => { }); },
        broken() { toast('Der Spielstand passt nicht zusammen, lade neu …'); ctx.later(() => V.online.resumeTable(M.id), 600); },
        poll() { pollOnce(this, () => V.cloud.rpc('party_state', { tid: M.id, since: this.known }), () => 1000); },
        stop() { this.stopped = true; }
      };
      tnet.feed(T);
      chan = V.cloud.channel('t:' + M.id, () => kick(tnet), true);
      ctx.later(() => tnet.poll(), 800);
      cleanups.push(() => { tnet.stopped = true; closeChan(); });
    }

    // ---------- result picture ----------
    // A square picture of the series (game, names, score) for the group chat. Phones share it directly,
    // elsewhere it is saved as a PNG.
    async function shareCard() {
      const W = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = W;
      const c = cv.getContext('2d'), D = '"Saira Condensed", "Arial Narrow", sans-serif';
      try { await document.fonts.load(`800 italic 100px ${D}`); } catch (e) { }
      const font = (px, w = 800) => { c.font = `italic ${w} ${px}px ${D}`; };
      const fit = (text, px, max) => { font(px); while (px > 20 && c.measureText(text).width > max) font(px -= 4); };
      c.fillStyle = '#08090f'; c.fillRect(0, 0, W, W);
      const bg = c.createLinearGradient(0, 0, W, 0);
      bg.addColorStop(0, 'rgba(255,79,216,.24)'); bg.addColorStop(0.5, 'rgba(255,79,216,.03)'); bg.addColorStop(0.5, 'rgba(255,216,79,.03)'); bg.addColorStop(1, 'rgba(255,216,79,.2)');
      c.fillStyle = bg; c.fillRect(0, 0, W, W);
      c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2 + 150, 0); c.lineTo(W / 2 - 150, W); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      font(70); c.fillStyle = '#ff4fd8'; c.fillText('VER', W / 2 - 70, 130); c.fillStyle = '#ffd84f'; c.fillText('SUS', W / 2 + 72, 130);
      c.fillStyle = '#fff'; c.fillRect(W / 2 - 4, 76, 8, 62);
      c.fillStyle = '#fff'; fit(g.name.toUpperCase(), 104, W - 140); c.fillText(g.name.toUpperCase(), W / 2, 280);
      c.fillStyle = '#9a9cc4'; font(34, 700); c.fillText(v.querySelector('.pbar .ttl small').textContent.toUpperCase(), W / 2, 336);
      let text;
      if (party) {
        const order = SIDES.slice().sort((a, b) => series[b] - series[a]);
        order.forEach((s, k) => {
          const y = 470 + k * 120;
          c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(150, y - 80, W - 300, 100);
          c.fillStyle = V.hex(s); c.fillRect(150, y - 80, 10, 100);
          c.textAlign = 'left'; fit(V.t(names[s]).toUpperCase(), 60, 560); c.fillText(V.t(names[s]).toUpperCase(), 196, y - 8);
          c.textAlign = 'right'; font(76); c.fillText(String(series[s]), W - 190, y - 4);
        });
        c.textAlign = 'center';
        text = `${g.name}: ` + order.map(s => `${names[s]} ${series[s]}`).join(', ');
      } else {
        font(300); c.fillStyle = V.hex(L); c.fillText(String(series[L]), W / 2 - 200, 690);
        c.fillStyle = '#5c5f86'; c.fillText(':', W / 2, 670);
        c.fillStyle = V.hex(R); c.fillText(String(series[R]), W / 2 + 200, 690);
        [[L, W / 2 - 200], [R, W / 2 + 200]].forEach(([s, x]) => { c.fillStyle = '#fff'; fit(V.t(names[s]).toUpperCase(), 54, 380); c.fillText(V.t(names[s]).toUpperCase(), x, 790); });
        if (series.d) { c.fillStyle = '#9a9cc4'; font(32, 700); c.fillText(V.t(series.d + '× unentschieden').toUpperCase(), W / 2, 860); }
        text = `${g.name}: ${names[L]} ${series[L]}:${series[R]} ${names[R]}`;
      }
      c.fillStyle = '#6f7299'; font(30, 700);
      c.fillText(new Date().toLocaleDateString('de-DE') + '  ·  BANANEMDNAA.GITHUB.IO/VERSUS', W / 2, W - 60);
      const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
      if (!blob) return toast('Bild ging nicht');
      const file = new File([blob], 'versus-' + g.id + '.png', { type: 'image/png' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], title: 'Versus', text });
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = V.el('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Bild gespeichert');
    }

    // ---------- reactions ----------
    function showEmote(s, e) {
      if (!EMO[e] || !pls[s]) return;
      const b = V.el('span', 'emo' + (e === 'gg' ? ' txt' : ''), EMO[e]); pls[s].appendChild(b); setTimeout(() => b.remove(), 2600);
      const k = document.querySelector('.ko #kemo');
      if (k) { const t = V.el('span', 'kemo-i', `<b>${EMO[e]}</b><small>${esc(names[s])}</small>`); k.appendChild(t); setTimeout(() => t.remove(), 2600); }
      V.sfx.tick();
    }
    let emoT = 0;
    function sendEmote(e) {
      if (!online || !net || performance.now() - emoT < 1000) return;
      emoT = performance.now(); showEmote(mySide, e);
      rpc('match_react', { mid: M.id, e }).catch(() => { });
    }
    const pe = v.querySelector('#pe');
    if (pe) {
      let pick = null;
      const close = () => { if (pick) { pick.remove(); pick = null; } };
      pe.onclick = ev => {
        ev.stopPropagation(); V.sfx.ui();
        if (pick) return close();
        pick = V.el('div', 'emopick', Object.keys(EMO).map(e => `<button data-e="${e}">${EMO[e]}</button>`).join(''));
        v.querySelector('.pbar').appendChild(pick);
        pick.querySelectorAll('button').forEach(b => b.onclick = x => { x.stopPropagation(); sendEmote(b.dataset.e); close(); });
      };
      const outside = ev => { if (pick && !pick.contains(ev.target)) close(); };
      document.addEventListener('pointerdown', outside); cleanups.push(() => document.removeEventListener('pointerdown', outside));
    }

    // ---------- chess clock ----------
    // Local: counted here (paused while a dialog is open). Online and watching: computed from the server's move times.
    if (clockMin) {
      const left = { 1: clockMin * 60000, 2: clockMin * 60000 }, els = { 1: v.querySelector('#ck1'), 2: v.querySelector('#ck2') };
      let run = 0, lastT = performance.now(), flagT = 0;
      const fmt = ms => { ms = Math.max(0, ms); if (ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      clock = {
        turn(s) {
          if (net || ended) return;
          const t = performance.now(); if (run && !P.modalOpen()) left[run] -= t - lastT; lastT = t;
          if (run && s && s !== run) left[run] += 2000;
          run = s;
        }
      };
      const tick = () => {
        if (!alive) return;
        const now = performance.now();
        let show = left, on = run;
        if (net) {
          const c = net.last && net.last.clock;
          if (!c) return;
          const el = c.live && !ended ? now - net.clockAt : 0;
          show = { 1: c[1] - (c.turn === 1 ? el : 0), 2: c[2] - (c.turn === 2 ? el : 0) }; on = c.live && !ended ? c.turn : 0;
          if (online && on && show[on] <= 0 && now - flagT > 2500) { flagT = now; rpc('match_flag', { mid: M.id }).catch(() => { }); }
        } else if (!ended) {
          if (run && !P.modalOpen()) left[run] -= now - lastT;
          lastT = now;
          if (run && left[run] <= 0) { left[run] = 0; const s = run; run = 0; ctx.end(3 - s, names[s] + ': Zeit abgelaufen'); }
        } else on = 0;
        [1, 2].forEach(s => { const e = els[s]; if (!e) return; e.textContent = fmt(show[s]); e.classList.toggle('run', s === on); e.classList.toggle('low', show[s] < 20000); });
      };
      const iv = setInterval(tick, 100); cleanups.push(() => clearInterval(iv)); tick();
    }

    let inst = null;
    P.setCurrent({
      destroy() {
        alive = false; timers.forEach(clearTimeout); timers.clear();
        cleanups.forEach(f => { try { f(); } catch (e) { } });
        if (inst && inst.destroy) try { inst.destroy(); } catch (e) { }
      }
    });
    function leave(to) {
      if (ended || watch) return to();
      if (inst && inst.pause) inst.pause();
      const m = openModal(online
        ? `<div class="confirm"><h3>Aufgeben?</h3><p>Wenn du die Partie verlässt, gewinnt ${esc(M.opp)}.</p>
          <div class="actions"><button class="btn primary" id="cy"><span>Weiterspielen</span></button><button class="btn ghost danger" id="cn"><span>Aufgeben</span></button></div></div>`
        : table ? `<div class="confirm"><h3>Tisch verlassen?</h3><p>Die anderen spielen weiter, die KI übernimmt deinen Platz. Zurück an den Tisch kommst du dann nicht mehr.</p>
          <div class="actions"><button class="btn primary" id="cy"><span>Weiterspielen</span></button><button class="btn ghost danger" id="cn"><span>Verlassen</span></button></div></div>`
        : `<div class="confirm"><h3>Partie verlassen?</h3><p>Der Stand geht verloren und zählt nicht in der Bilanz.</p>
          <div class="actions"><button class="btn primary" id="cy"><span>Weiterspielen</span></button><button class="btn ghost" id="cn"><span>Verlassen</span></button></div></div>`,
        '', () => { if (inst && inst.resume && alive) inst.resume(); }, false, e => {
          if (e.key === 'Enter') { closeModal(); return true; }
          return false;
        });
      m.querySelector('#cy').onclick = closeModal;
      m.querySelector('#cn').onclick = () => {
        P.closeModalQuiet();
        if (online) { rpc('match_resign', { mid: M.id }).catch(() => { }); if (to === null) return ctx.end(oppSide, 'Du hast aufgegeben', true); }
        if (table) rpc('party_leave', { tid: M.id }).catch(() => { });
        if (to) to();
      };
    }
    const tut = () => { if (inst && inst.pause) inst.pause(); tutorial(g, () => { if (inst && inst.resume && alive) inst.resume(); }); };
    v.querySelector('#pb').onclick = () => leave(() => watch ? V.account.admin('matches') : setup(g));
    const pr = v.querySelector('#pr');
    if (pr) pr.onclick = () => online ? leave(null) : leave(() => play(g, cfg, series));
    v.querySelector('#ph').onclick = tut;
    P.playApi = {
      key(e) { return keyFn ? keyFn(e) : false; },
      back() { leave(() => watch ? V.account.admin('matches') : setup(g)); },
      restart() { if (!online && !watch) leave(() => play(g, cfg, series)); },
      tut
    };
    if (party && N > 2) vsIntro({ name: names[1], sub: sideLabel(1) }, { name: ai ? N - 1 + ' KIs' : 'Alle', sub: ai ? V.LEVELS[cfg.level] : N + ' Spieler' }, rematch);
    else vsIntro({ name: names[L], sub: sideLabel(L) }, { name: names[R], sub: ai ? 'KI · ' + V.LEVELS[cfg.level] : online ? 'online' : sideLabel(R) }, rematch || watch);
    inst = g.start(ctx) || {};
  }
  P.play = play;
})();
