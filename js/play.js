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
    // the slam: a deep tone and the whole picture shakes
    setTimeout(() => V.sfx.vs(), quick ? 140 : 280);
    setTimeout(kill, quick ? 650 : 1150);
  }

  // ---------- play ----------
  let rematchCarry = null;
  // quick reactions in online matches (ids are checked by the server)
  const EMO = { gg: 'GG', wow: '😮', haha: '😂', oops: '🙈', think: '🤔', fire: '🔥', clap: '👏', sweat: '😅' };
  // quick phrases: fixed sentences instead of a free chat (nothing to moderate); sent as ids, so everybody reads them
  // in their own language
  const PHR = { p_gl: 'Viel Glück!', p_nice: 'Guter Zug!', p_wp: 'Gut gespielt!', p_close: 'Das war knapp!', p_think: 'Moment, ich überlege …', p_hurry: 'Na los, du bist dran!',
    p_oops: 'Upps!', p_lucky: 'Glück gehabt!', p_ty: 'Danke!', p_sorry: 'Sorry!', p_rev: 'Revanche?', p_bye: 'Bis gleich!' };
  const say = e => EMO[e] || PHR[e];
  // duels where the turn always alternates and side 1 begins (same list as match_move on the server)
  const ALTERNATE = ['c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon', 'hex', 'ttt3', 'hardcore'];
  // games without luck where you may take a move back against the AI on Leicht and Mittel
  // the games whose matches can be replayed from their moves (no dice, cards or real time): undo and the history
  const UNDO = V.REPLAYABLE = ['c4', 'ttt', 'uttt', 'gomoku', 'dots', 'checkers', 'mill', 'chess', 'reversi', 'kalaha', 'go', 'hex', 'ttt3', 'hardcore'];
  // Modes: 'ai' (vs. computer), 'local' (two players, one device), 'online' (vs. a friend over the server),
  // 'watch' (admins follow or replay a match). A remote player is handled like the AI: the game calls
  // ctx.aiTurn() and gets the move from the network instead of from a search.
  function play(g, cfg, series) {
    let rematch = !!series;
    const clockMin = g.id === 'chess' && cfg.mode !== 'ai' && [3, 5, 10].includes(+(cfg.opts && cfg.opts.clock)) ? +cfg.opts.clock : 0;
    // guests with a guest session (quick match) may play online duels; tables and friends need an account
    const session = V.cloud && V.cloud.user();
    // (a table inside the Discord activity is open to guests: the voice channel plays together)
    const dcTable = cfg.mode === 'table' && V.discord && V.discord.on;
    // 'review': a finished match from the history (Bilanz → Letzte Partien), replayed from its moves, nothing counts
    const review = cfg.mode === 'review', RV = cfg.rv || {};
    // the team paused this game (or online play of it), or this version is too old for online play
    const blocked = cfg.mode !== 'watch' && !review && P.siteBlock ? P.siteBlock(g, cfg.mode) : null;
    if (blocked === 'update') return P.needUpdate();
    if (blocked) { toast(blocked); return; }
    if (cfg.mode !== 'watch' && !review && !dcTable && (locked(g) || (guest() && (cfg.mode === 'table' || (['online', 'open'].includes(cfg.mode) && !session))))) { toast('Dafür brauchst du ein Konto'); return home('profile'); }
    P.enterPlay(g);
    const online = cfg.mode === 'online', watch = cfg.mode === 'watch', M = cfg.match || {};
    // a match over days: no offline countdown, leaving just puts it aside (it waits for your next move)
    const slow = online && !!(M.init && M.init.async);
    // 'table': an online table with 2-4 seats (party games). Seats, names and the dice seed come from the server;
    // seats run by the AI are computed by the host's browser.
    const table = cfg.mode === 'table', T = table ? M.init : null;
    const tbots = new Set(table ? T.bots || [] : []);
    let thost = table ? T.host : 0;
    // test.html: the AI plays every seat, nothing is saved
    const auto = !!cfg.auto;
    if (!watch && !auto && !review) { S.set('recent', g.id); S.set('recents', [g.id, ...S.get('recents', []).filter(id => id !== g.id)].slice(0, 6)); }
    if (V.cloud && !auto && !review) V.cloud.touch(g.id);
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
    // undo: the match is set up again and every move but your last one (and what followed) is replayed at once
    const replay = cfg.replay && cfg.replay.length ? cfg.replay.slice() : null;
    if (cfg.replay || cfg.firstWas) cfg = Object.assign({}, cfg, { replay: null, first: cfg.firstWas || cfg.first, firstWas: null });
    // a match in which a move was taken back does not change the KI-Elo (the flag is not passed on to a rematch)
    const undone = !!cfg.undone;
    if (undone) cfg = Object.assign({}, cfg, { undone: null });
    // "Passend zu dir": the AI plays at your KI-Elo in this game (V.aiElo in core.js; daily challenges keep their level).
    // cfg.level becomes the closest level, for everything that needs one level (labels, thinking time, Bilanz).
    const fitE = ai && cfg.fit && !cfg.daily && !auto ? V.aiElo.get(g.id).e : 0;
    if (fitE) cfg = Object.assign({}, cfg, { level: V.aiElo.near(g, fitE) });
    const lvName = fitE ? 'Passend' : V.LEVELS[cfg.level];
    // the level the AI uses right now: with "Passend" picked anew for every AI turn
    let lvNow = cfg.level, eloRes = null;
    const canUndo = ai && !party && cfg.level <= 1 && UNDO.includes(g.id) && !auto && !fitE;
    const hist = [], rep = replay ? { queue: replay } : null;
    // the moves for the history (replayable games, not when watching, testing or replaying)
    const recOn = UNDO.includes(g.id) && !watch && !auto && !review && !party, recd = []; // replayed moves (undo) are recorded again as they are made
    const mySide = online ? M.side : table ? M.seat : 0;
    // you are always left and pink: against the AI, in online duels and at online tables with two seats (only the look;
    // the game keeps its own sides)
    const oppSide = ai ? aiSide : online || (table && N === 2) ? 3 - mySide : 0;
    setSwap(oppSide === 1);
    const L = oppSide ? 3 - oppSide : 1, R = 3 - L;
    // party games: odd seats on the left, at a two-seat table you on the left
    const leftCol = s => table && N === 2 ? s === mySide : s % 2 === 1;
    // colour names follow the swap; names like Weiß/Schwarz stay
    const sideLabel = s => g.sides && g.sides[s] && !/^(Pink|Gelb|Cyan|Grün)$/.test(g.sides[s]) ? g.sides[s] : V.colorName(s);
    const names = { 1: 'Spieler 1', 2: 'Spieler 2', 3: 'Spieler 3', 4: 'Spieler 4' };
    if (ai && party) SIDES.forEach(s => { names[s] = s === 1 ? 'Du' : N > 2 ? 'KI ' + (s - 1) : 'KI'; });
    else if (ai) { names[aiSide] = 'KI'; names[3 - aiSide] = 'Du'; }
    if (table) SIDES.forEach(s => { names[s] = s === mySide ? 'Du' : T.names[s - 1] && !tbots.has(s) ? T.names[s - 1] : 'KI'; });
    const me = ai ? (party ? 1 : 3 - aiSide) : online || table ? mySide : 0;
    // Dev-Konten (Tests-Tab): the AI may also play your seat against the AI, so whole games run through
    const botSide = s => auto || (ai && (party ? s !== 1 : s === aiSide)) || (ai && !review && V.dev && V.dev.autoMe) || (table && tbots.has(s));
    const amHost = () => table && thost === mySide;
    if (online) { names[mySide] = 'Du'; names[oppSide] = M.opp; }
    if (watch) { names[M.aSide] = M.aName; names[3 - M.aSide] = M.bName; }
    if (review) Object.assign(names, RV.names || {});
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // your own card shows your account name (the logic keeps calling you "Du")
    const acct = V.cloud && V.cloud.user() && !V.cloud.user().anon ? V.cloud.user().username : '';
    const shown = s => s === me && acct ? acct : names[s];
    const remoteSide = s => (online && s === oppSide) || (table && s !== mySide && !botSide(s));
    const sub = s => botSide(s) ? lvName + ' · ' + sideLabel(s) : remoteSide(s) ? 'Online · ' + sideLabel(s) : s === me && acct ? 'Du · ' + sideLabel(s) : sideLabel(s);
    const av = s => botSide(s) ? IC.robot : s === me ? (acct && V.look ? `<span class="lav">${V.look.text(acct, V.look.mine(), 1)}</span>` : `<span>${esc(acct ? acct.slice(0, 1).toUpperCase() : 'DU')}</span>`) : remoteSide(s) ? IC.user : watch ? `<span>${esc(names[s].slice(0, 2).toUpperCase())}</span>` : `<span>P${s}</span>`;
    const thinker = s => botSide(s) || (online && s === oppSide) || (table && s !== mySide) || watch;
    // the country flag (js/flag.js) for real players: you (also as a guest online or against the AI, e.g. in Discord),
    // the opponent online, both when watching
    const flagOf = s => {
      if (!V.flag || botSide(s)) return '';
      const u = V.cloud && V.cloud.user();
      if (s === me) return V.flag.tag(acct || ((online || table || ai) && u ? u.username : ''));
      return remoteSide(s) || watch ? V.flag.tag(names[s]) : '';
    };
    const card = (s, pos) => `<div class="pcard pcard-${pos} ps${s}${s === me ? ' me' : ''}" id="pl${s}"><span class="av">${av(s)}</span>
      <span class="nm"><b>${esc(shown(s))}${flagOf(s)}</b><small>${sub(s)}</small></span>
      ${clockMin ? `<span class="clk" id="ck${s}"></span>` : ''}${thinker(s) ? '<span class="tdots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}<span class="wins"><b>${series[s]}</b><small>Siege</small></span><em class="tag">am Zug</em>
      ${ai && s === aiSide ? '<div class="bubble" aria-live="polite"></div>' : ''}</div>`;
    const sublabel = review && RV.shared ? 'Geteilt von ' + esc(RV.shared) + ' · ' + new Date(RV.at || Date.now()).toLocaleDateString(V.locale(), { day: 'numeric', month: 'short' }) : review ? 'Aufzeichnung · ' + esc(RV.label || '') + ' · ' + new Date(RV.at || Date.now()).toLocaleDateString(V.locale(), { day: 'numeric', month: 'short' }) : table ? `Online-Tisch · ${N} Spieler` : party ? (ai ? `Gegen ${N > 2 ? N - 1 + ' KIs' : 'KI'} · ` + lvName : N + ' Spieler') : ai ? 'Gegen KI · ' + lvName : slow ? 'Über Tage gegen ' + esc(M.opp) : online ? 'Online gegen ' + esc(M.opp) : watch ? 'Zuschauen · ' + esc(M.aName) + ' gegen ' + esc(M.bName) : 'Am Gerät';
    // Discord status (Rich Presence, js/discord.js): the game and how it is played, never an opponent's name
    V.discord.status(g.name, table ? V.t('Online-Tisch') + ' · ' + V.t(N + ' Spieler') : ai ? V.t('Gegen die KI') + ' · ' + V.t(lvName) : online ? V.t('Online-Duell') : watch ? V.t('Zuschauen') : V.t('Am Gerät'), g.id);
    // two people at one phone, sitting opposite: player 2's card (and the status on their turn) is turned around
    const facing = cfg.mode === 'local' && settings.face && !party && g.cat !== 'Action';
    let plies = 0;
    const v = mount(`<div class="view play${online || table ? ' net' : ''}${watch ? ' watch' : ''}${review ? ' review' : ''}${facing ? ' facing' + (g.turnBoard ? ' rotboard' : '') : ''}" data-g="${g.id}" style="--acc:${g.accent || 'var(--pink)'}">
      <div class="pbar"><button class="iconbtn" id="pb" aria-label="Zurück">${IC.back}</button><div class="ttl"><b>${g.name}</b><small>${sublabel}</small></div>
        <span class="watchn" id="pw" hidden title="Zuschauer">${IC.eye}<b></b></span>
        ${online || (watch && !M.admin) ? `<button class="iconbtn" id="pe" aria-label="Reaktion senden" title="Reaktion">${IC.smile}</button>` : ''}
        ${canUndo ? `<button class="iconbtn" id="pu" aria-label="Zug zurück" title="Zug zurück (Z)" disabled>${IC.undo}</button>` : ''}
        <button class="iconbtn" id="ph" aria-label="Regeln" title="Regeln (H)">${IC.help}</button>
        ${online ? `<button class="iconbtn" id="pr" aria-label="Aufgeben" title="Aufgeben">${IC.flag}</button>` : watch || table ? '' : `<button class="iconbtn" id="pr" aria-label="Neu starten" title="Neue Partie (N)">${IC.redo}</button>`}
        <button class="iconbtn snd" aria-label="Ton an oder aus" title="Ton (M)">${settings.sound ? IC.sound : IC.mute}</button>
        ${document.fullscreenEnabled ? `<button class="iconbtn only-fine" id="pfs" aria-label="Vollbild" title="Vollbild (F11)">${IC.full}</button>` : ''}
        ${watch ? '' : `<button class="iconbtn" id="pz" aria-label="Menü" title="Menü (Esc)">${IC.menu}</button>`}</div>
      <div class="duel${party ? ' party n' + N : ''}">
        ${party ? `<div class="pcol pcol-l">${SIDES.filter(s => leftCol(s)).map(s => card(s, 'l')).join('')}</div><div class="pcol pcol-r">${SIDES.filter(s => !leftCol(s)).map(s => card(s, 'r')).join('')}</div>` : `${card(L, 'l')}
        <div class="score" id="sc"><b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b></div>
        ${card(R, 'r')}`}
        <div class="center"><div class="status" id="st" aria-live="polite"></div><div class="stage" id="stage"></div>
          <div class="tpill" id="tpill" hidden><i></i><b></b>${g.keys && g.cat !== 'Action' ? `<small>${g.keys.slice(0, 2).map(([k, d]) => `<kbd>${k}</kbd> ${V.t(d)}`).join(' · ')}</small>` : ''}</div></div>
      </div><i class="sglow t" aria-hidden="true"></i><i class="sglow b" aria-hidden="true"></i></div>`);
    const stEl = v.querySelector('#st'), pls = {};
    SIDES.forEach(s => { pls[s] = v.querySelector('#pl' + s); });
    // laptop: whose turn it is under the board, with the game's main keys
    const pill = v.querySelector('#tpill');
    function turnPill(s) {
      if (!pill) return;
      pill.hidden = !s || ended;
      if (pill.hidden) return;
      pill.style.setProperty('--c', V.hex(s));
      pill.querySelector('b').textContent = V.t(s === me ? 'Du bist dran' : names[s] === 'Du' ? 'Du bist dran' : sideLabel(s) + ' ist dran');
    }
    const timers = new Set(), cleanups = [];
    // A game with brain(state, level) -> { move, mood } thinks in a worker, so the page keeps moving meanwhile. On the
    // main thread instead when there is no worker for it, when that fails, or for the dev panel (it shows the search).
    // The move comes back as a copy: decode() turns it into the game's own move again (the same as online).
    // (on the main thread too, decode() hands back the game's own move object when the brain worked on a copy)
    function brain(o) {
      const L = lvNow, here = () => {
        const r = g.brain(o.state, L);
        if (o.decode && r && r.move != null) { const m = o.decode(r.move); if (m != null) r.move = m; }
        return r;
      };
      if (!V.aiWorker || !V.aiWorker.ok(g) || (V.dev && V.dev.active)) return here();
      return V.aiWorker.run(g, o.state, L).then(r => {
        if (!r || r.move == null) throw new Error('aiworker: no move');
        if (o.decode) { const m = o.decode(r.move); if (m == null) throw new Error('aiworker: move not legal'); r.move = m; }
        return r;
      }).catch(() => (alive && !ended ? here() : null));
    }
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
      clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.remove('on'), 1800);
    }
    cleanups.push(() => { clearTimeout(bubbleT); aim.hide(); });
    // Dev-Konten: the running match for the dev panel's "Zustand" tab
    if (V.dev) {
      const dg = { id: g.id, mode: cfg.mode, level: cfg.level, fit: fitE || 0, opts: cfg.opts, players: N, aiSide, mySide, match: M.id || null,
        get plies() { return plies; }, get ended() { return ended; }, get moves() { return recOn ? recd : null; } };
      V.dev.game = dg; cleanups.push(() => { if (V.dev.game === dg) V.dev.game = null; });
    }
    const setStatus = html => {
      if (stEl.innerHTML === html) return;
      stEl.innerHTML = html; if (V.fxOn()) V.fx.pop(stEl, 'st-in');
    };
    // "Du bist dran" / "Gelb ist dran" in the player's colour over the board; the first one waits for the VS intro
    const t0 = performance.now(), introMs = !replay && !review && V.fxOn() && settings.intro !== false ? (rematch || watch ? 650 : 1150) : 0;
    function turnBanner(s) {
      const show = () => {
        if (!alive || ended || lastTurn !== s) return;
        v.querySelectorAll('.tbanner').forEach(b => b.remove());
        const b = V.el('div', 'tbanner', esc(s === me ? 'Du bist dran' : sideLabel(s) + ' ist dran'));
        b.style.setProperty('--c', V.hex(s));
        ctx.stage.appendChild(b); setTimeout(() => b.remove(), 1200);
      };
      const wait = introMs - (performance.now() - t0);
      if (wait > 0) ctx.later(show, wait); else show();
    }
    let net = null, tnet = null;
    // realtime channel of this match or table: every change we make pokes the others, a poke makes us fetch at once
    let chan = null;
    const rpc = (name, args) => V.cloud.rpc(name, args).then(r => { if (chan) chan.poke(); return r; });
    // one state request at a time; a poke that arrives during a request asks for one more right after it
    function pollOnce(o, fetch, every) {
      if (o.stopped || !alive) return;
      clearTimeout(o.timer); o.busy = true;
      fetch().then(st => {
        conn.ok();
        if (V.dev && V.dev.active) V.dev.net('Stand geholt', { status: st && st.status, moves: st && st.moves ? st.moves.length : undefined, queue: o.queue ? o.queue.length : undefined });
        if (alive) o.feed(st);
      }, e => { if (V.dev && V.dev.active) V.dev.net('Abfrage fehlgeschlagen', String(e && e.message || e)); conn.fail(e); }).then(() => {
        o.busy = false;
        if (o.stopped || !alive) return;
        if (o.again) { o.again = false; return o.poll(); }
        // with a working channel the regular poll is only a fallback for lost pokes
        o.timer = ctx.later(() => o.poll(), chan && chan.live() ? 4000 : every());
      });
    }
    const kick = o => { if (!o || o.stopped || !alive) return; if (o.busy) o.again = true; else o.poll(); };
    // our own connection (online duels, tables, watching): a bar over the board after two failed requests in a row
    // or when the browser says it is offline, "Wieder verbunden" once it works again. Moves that could not be sent
    // wait and go out again instead of reloading the match.
    const netErr = e => navigator.onLine === false || /Keine Verbindung zum Server|failed to fetch|network|load failed/i.test(String(e && e.message));
    const conn = {
      fails: 0, since: 0, el: null, t: null,
      fail(e) {
        if (!alive || !(online || table || watch) || !netErr(e)) return;
        this.fails++;
        if (this.fails >= 2 || navigator.onLine === false) this.show();
      },
      ok() {
        this.fails = 0;
        if (!this.el || this.el.classList.contains('back')) return;
        clearInterval(this.t); this.since = 0;
        this.el.classList.add('back'); this.el.innerHTML = `${IC.globe}<span><b>Wieder verbunden</b></span>`;
        V.sfx.ui(); const el = this.el;
        setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); if (conn.el === el) conn.el = null; }, 260); }, 1600);
      },
      show() {
        if (this.el && !this.el.classList.contains('back')) return;
        if (this.el) this.el.remove();
        this.since = Date.now();
        this.el = V.el('div', 'connbar'); v.appendChild(this.el);
        const tick = () => {
          if (!this.el || this.el.classList.contains('back')) return;
          const s = Math.round((Date.now() - this.since) / 1000);
          // a live duel is called off by the server after 75 s without a sign of life
          const warn = online && !slow && !ended ? ` · nach ${OFF_AFTER} s endet die Partie ohne Sieger` : '';
          this.el.innerHTML = `<i class="cspin"></i><span><b>Verbindung unterbrochen</b><small>Versuche es wieder${s >= 3 ? ' · seit ' + s + ' s' : ''}${warn}</small></span>`;
        };
        tick(); clearInterval(this.t); this.t = setInterval(tick, 1000);
      }
    };
    if (online || table || watch) {
      const offE = () => conn.show(), onE = () => { kick(net); kick(tnet); };
      window.addEventListener('offline', offE); window.addEventListener('online', onE);
      cleanups.push(() => { window.removeEventListener('offline', offE); window.removeEventListener('online', onE); clearInterval(conn.t); });
    }
    // send an action; network errors are retried every 2 s while the match is open, other errors go to onErr
    const sendRetry = (call, onErr) => {
      const go = () => call().then(r => { conn.ok(); return r; }, e => {
        if (alive && netErr(e)) { conn.fail(e); conn.show(); return new Promise(res => ctx.later(res, 2000)).then(go); }
        throw e;
      });
      return go().catch(onErr);
    };
    // a few seconds of grace, so the poke of a last action (resign, leaving the table) still goes out
    const closeChan = () => { const c = chan; if (c) setTimeout(() => c.close(), 3000); };
    let clock = null, listener = null, handSeen = 0;
    const remote = s => (rep && rep.queue.length > 0) || watch || review || (online && (s === oppSide || (net && net.queue.length > 0))) || (table && (s !== mySide || (tnet && tnet.queue.length > 0)));
    // dice, shuffled cards and other luck: online every browser draws the same numbers from a shared seed
    // (tables get it from the server, duels derive it from the match id)
    const idSeed = id => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    let seed = table ? (T.seed >>> 0) || 1 : online || watch ? idSeed(M.id) || 1 : 0;
    const rng = seed ? () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } : Math.random;
    const ctx = {
      stage: v.querySelector('#stage'), mode: cfg.mode, get level() { return lvNow; }, fitElo: fitE, aiSide, opts: cfg.opts, sides: g.sides, n: N, players: SIDES,
      mySide: review ? RV.me || 0 : mySide, review: review ? RV : null, watchSides: watch ? { a: M.aSide } : null, rng, auto,
      // true while a table catches up on moves that were already played (after joining late or reloading)
      fast: () => !!(tnet && tnet.queue.length > 1) || !!(rep && rep.queue.length),
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
        const el = V.el('div', 'handoff', V.kit.pass(s, esc(names[s]), text || 'Die anderen schauen kurz weg.'));
        ctx.stage.appendChild(el);
        el.querySelector('.pass').onclick = () => { el.remove(); V.sfx.ui(); cb(); };
      },
      handReset() { handSeen = 0; },
      isAI: s => botSide(s) || remote(s),
      // a seat played by the computer (against the AI, or at a table for someone who left)
      isBot: s => botSide(s),
      name: s => names[s],
      who(s) { return `<span class="c${s}">${esc(names[s])}</span>`; },
      alive: () => alive,
      later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, rep && rep.queue.length ? 0 : ms); timers.add(t); return t; },
      onCleanup(fn) { cleanups.push(fn); },
      // for a think() that only sometimes uses the game's brain (chess: its own engine when Stockfish is not used)
      brain: (state, decode) => brain({ state, decode }),
      status: setStatus,
      turn(s, html) {
        if (clock) clock.turn(s);
        turnPill(s);
        SIDES.forEach(k => pls[k].classList.toggle('on', s === k));
        v.classList.toggle('turn-r', s === R); v.classList.toggle('turn-l', !!s && s === L);
        const fresh = s && s !== lastTurn;
        if (fresh && V.fxOn()) V.fx.pop(pls[s], 'pcard-in');
        lastTurn = s;
        // a person's turn: a short banner over the board (not for the AI or remote players, not in action games)
        if (fresh && !ctx.isAI(s) && g.cat !== 'Action' && !auto && !ctx.fast()) turnBanner(s);
        if (fresh && guideDue && !ctx.isAI(s) && !ctx.fast()) { guideDue = false; ctx.later(showGuide, Math.max(0, introMs - (performance.now() - t0)) + 1300); }
        // the status line is left for rule hints and the opponent's last move; whose turn it is shows the banner and the cards
        const note = s && oppSide && s !== oppSide && lastNote ? `${ctx.who(oppSide)}: ${lastNote}` : '';
        if (html !== false) setStatus(html ? (note ? note + ' · ' : '') + html : note);
        nav.refresh();
      },
      // Every move goes through here (all modes). Online, your own moves are sent to the server.
      moved(s, m) { plies++; if (net) net.moved(s, m); if (tnet) tnet.moved(s, m); if (recOn) recd.push({ s, m: JSON.parse(JSON.stringify(m ?? null)) }); if (canUndo) { hist.push({ s, m: JSON.parse(JSON.stringify(m ?? null)) }); undoBtn(); } },
      // One AI move with a bit of theatre: think (min. time per level), let the crosshair hover over
      // a couple of alternatives, lock on the real target(s), then move and comment in the bubble.
      // o.think() -> { move, mood? } (or o.state with the game's brain(state, level), see brain()), o.targets(move) -> [elements], o.decoys(move) -> [elements],
      // o.apply(move), o.say(move) -> short text, o.quick -> follow-up move (e.g. extra turn) with less delay,
      // o.decode(raw) -> legal move or null (online: turns the received move back into the game's own form)
      aiTurn(o) {
        if (rep && rep.queue.length) return replayStep(o);
        if (review) return reviewDone();
        if (net) return net.take(o);
        // at a table only the host plays the AI seats; everything else (and any backlog) comes from the server
        if (tnet && (tnet.queue.length || !(tbots.has(o.side) && amHost()))) return tnet.take(o);
        const s = o.side || aiSide, card = pls[s];
        card.classList.add('thinking');
        setStatus(`<span class="c${s}">${esc(names[s])}</span> <span class="thinking">${o.quick ? 'macht weiter' : 'denkt'}</span>`);
        const minT = auto ? 0 : settings.aiFast ? 60 : o.quick ? 380 : [650, 850, 1050, 1250][cfg.level] + Math.random() * 450;
        const t0 = performance.now();
        ctx.later(() => {
          if (fitE) lvNow = V.aiElo.pick(g, fitE);
          // Dev-Konten: the dev panel shows what this move computed (js/devtools.js)
          const dv = V.dev && V.dev.active ? V.dev.begin({ game: g.name, level: lvNow, fit: fitE ? Math.round(fitE) : 0, side: o.side || lastTurn || s, who: names[o.side || lastTurn || s], quick: !!o.quick, ply: plies }) : null;
          // think() may also answer later (a Promise, e.g. Stockfish in a worker): the match must still be running then
          // o.state instead of o.think: the game's brain(state, level) thinks in a worker (js/aiworker.js)
          let out;
          try { out = o.state !== undefined && g.brain ? brain(o) : o.think(); } catch (e) { if (dv) dv.fail(e); throw e; }
          const go = res => { if (dv) dv.done(res, o.say); ctx.later(() => aimAt(o, res, card, true, false, party ? s : 0), Math.max(0, minT - (performance.now() - t0))); };
          // (a move can be 0, e.g. the first column)
          if (out && typeof out.then === 'function') out.then(res => { if (alive && !ended && res && res.move != null) go(res); else if (dv) dv.done(res, o.say); }, e => { if (dv) dv.fail(e); });
          else go(out);
        }, 70);
      },
      think(fn, ms = 380) {
        if (settings.aiFast) ms = Math.min(ms, 60); if (fitE) lvNow = V.aiElo.pick(g, fitE);
        setStatus(`<span class="c${aiSide}">KI</span> <span class="thinking">denkt</span>`);
        ctx.later(() => {
          const dv = V.dev && V.dev.active ? V.dev.begin({ game: g.name, level: lvNow, fit: fitE ? Math.round(fitE) : 0, side: aiSide, who: names[aiSide], kind: 'ctx.think', ply: plies }) : null;
          try { fn(); } finally { if (dv) dv.done(); }
        }, ms);
      },
      nav(fn, o) { navFn = fn; nav.set(fn, o); },
      keys(fn) { keyFn = fn; },
      // off: the match was called off (opponent offline, voided) – no winner, nothing counts
      end(winner, note, fromServer, off) {
        if (ended || !alive) return; ended = true;
        // the game hears about every end (also giving up, the clock, a dropped opponent), e.g. to offer its review
        if (inst && inst.ended) try { inst.ended(winner, note, off); } catch (e) { }
        if (review) { reviewDone(note); return; }
        undoBtn();
        if (off) winner = 0;
        SIDES.forEach(k => pls[k].classList.remove('on'));
        nav.hide();
        if (net && online && !fromServer) net.finish(winner);
        if (net) { if (online) net.after = true; else net.stop(); }
        if (tnet) { if (!fromServer) tnet.finish(winner); tnet.stop(); }
        if (cfg.onEnd) cfg.onEnd(winner, note);
        if (!watch && !auto && !off) {
          const s = stat(g.id);
          if (ai) { const r = s.ai[cfg.level]; if (winner === 0) r.d++; else if (winner === me) r.w++; else r.l++; }
          // KI-Elo: only you against one AI, not after taking a move back
          if (ai && N === 2 && me && !undone) eloRes = V.aiElo.add(g.id, fitE || V.aiElo.levels(g)[cfg.level], winner === 0 ? 0.5 : winner === me ? 1 : 0);
          else if (online || table) { s.on = s.on || { w: 0, l: 0, d: 0 }; if (winner === 0) s.on.d++; else if (winner === mySide) s.on.w++; else s.on.l++; }
          else { if (winner === 0) s.local.d++; else if (winner === 1) s.local.a++; else s.local.b++; }
          S.set('stats', P.stats);
          archive(winner, note);
          // per day for the chart in Bilanz (last 60 days): wins and losses of your own games, games at one device
          const day = new Date().toLocaleDateString('sv'), daily = S.get('daily', {}), dd = daily[day] = daily[day] || { w: 0, l: 0, d: 0, n: 0 };
          if (ai || online || table) { if (winner === 0) dd.d++; else if (winner === me) dd.w++; else dd.l++; } else dd.n++;
          Object.keys(daily).sort().slice(0, -60).forEach(k => delete daily[k]);
          S.set('daily', daily);
          // inside the Discord activity: which game was played there (counted per player in the admin panel)
          if (V.discord && V.discord.on && V.cloud && V.cloud.user()) V.cloud.rpc('discord_game', { gm: g.id, md: cfg.mode }).catch(() => { });
        }
        if (off) { } else if (winner === 0) series.d++; else series[winner]++;
        turnPill(0);
        const sc = v.querySelector('#sc'); if (sc) { sc.innerHTML = `<b class="sl">${series[L]}</b><i>:</i><b class="sr">${series[R]}</b>`; V.fx.pop(sc, 'fx-pop'); }
        SIDES.forEach(k => { const b = pls[k].querySelector('.wins b'); if (b.textContent !== String(series[k])) { b.textContent = series[k]; V.fx.pop(b, 'fx-pop'); } });
        const meWon = me && winner === me;
        const good = winner && (!me || meWon);
        if (good) { V.sfx.win(); setTimeout(() => V.fx.confetti(), 250); setTimeout(() => V.fx.win(), g.endDelay ?? 1150); }
        else if (winner) { V.sfx.lose(); V.fx.shake(ctx.stage); }
        // V.t: the letters are animated one by one, so the translation has to happen before the split
        const big = V.t(off ? 'Abgebrochen' : winner === 0 ? (/^Patt/.test(note || '') ? 'Patt' : 'Remis') : me ? (meWon ? 'Sieg!' : 'Niederlage') : `${names[winner]} gewinnt`);
        setStatus(off ? esc(note || 'Partie abgebrochen') : winner === 0 ? (/^Patt/.test(note || '') ? 'Patt, unentschieden' : 'Unentschieden') :me ? (meWon ? '<span class="c' + winner + '">Du hast gewonnen</span>' : `${ctx.who(winner)} hat gewonnen`) : `${ctx.who(winner)} gewinnt`);
        const tone = winner === 0 ? 'draw' : me ? (meWon ? 'win' : 'lose') : party ? 'w' + winner : (winner === L ? 'left' : 'right');
        const again = () => online ? net.rematch(series) : table ? (closeModal(), V.online.table(g, cfg.opts, cfg.level)) : play(g, cfg, series);
        const menu = () => watch ? (M.admin ? V.account.admin('matches') : V.ui.home('online')) : setup(g);
        // what comes next (AI and one device only): after a win against the AI the next level is one tap away,
        // otherwise a game of the same kind that was not played yet (so the 35 games get found)
        // Spiel des Tages: played to the end counts once a day (no win needed); then new Abzeichen
        const dWon = ai && cfg.daily && !auto && !off ? P.dailyDone(cfg.daily) : 0;
        // wins in a row against the AI or online (a draw keeps the run, a loss ends it), for the badges
        const mine = ai ? me : (online || table) ? mySide : 0;
        if (mine && !watch && !auto && !off && winner !== 0) { const wr = S.get('winRun', {}); wr.cur = winner === mine ? (wr.cur || 0) + 1 : 0; wr.best = Math.max(wr.best || 0, wr.cur); S.set('winRun', wr); }
        const fresh = !watch && !auto && !off ? P.badgeCheck({ hour: new Date().getHours(), seats: N }) : [];
        const step = !online && !table && !watch && !auto && !off ? nextStep(winner === me && !!winner) : null;
        ctx.later(() => {
          const m = openModal(`<div class="ko ${tone}">
            <div class="band"><div class="band-in"><span class="kicker">${esc(note || sublabel)}${online && net && net.last && net.last.ranked === false ? ' · zählt nicht für die Rangliste' : ''}</span>
              <h2 class="${big.length > 11 ? 'long' : ''}" aria-label="${esc(big)}">${[...big].map((ch, k) => `<span aria-hidden="true" style="--k:${k}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</h2></div></div>
            ${party ? `<div class="eparty">${SIDES.map(k => `<span class="ep c${k}"><b>${series[k]}</b><small>${esc(names[k])}</small></span>`).join('')}</div>` : `<div class="eseries"><span class="nl">${esc(names[L])}</span><b class="sl${winner === L && !off ? ' up' : ''}" data-n="${series[L]}">${winner === L && !off ? series[L] - 1 : series[L]}</b><i>:</i><b class="sr${winner === R && !off ? ' up' : ''}" data-n="${series[R]}">${winner === R && !off ? series[R] - 1 : series[R]}</b><span class="nr">${esc(names[R])}</span></div>`}
            ${eloRes ? `<div class="kelo ${eloRes.delta >= 0 ? 'up' : 'down'}"><span>KI-Elo</span><b>${eloRes.to}</b><em>${eloRes.delta >= 0 ? '+' : '−'}${Math.abs(eloRes.delta)}</em></div>` : ''}
            ${online && !off && !watch && !(net && net.last && net.last.ranked === false) ? '<div class="kelo" id="kelo" hidden></div>' : ''}
            ${dWon ? `<div class="kdaily">${IC.bolt}<b>Spiel des Tages erledigt</b><span>Serie: ${dWon} ${dWon === 1 ? 'Tag' : 'Tage'}</span></div>` : ''}
            ${fresh.length ? `<div class="kbadges">${fresh.map(b => `<div class="kbdg bt${b.tier}" title="${esc(b.d)}"><span class="abz-ic">${b.ic}</span><span><small>${b.tier === 3 ? 'Legendäres Abzeichen' : b.tier === 2 ? 'Seltenes Abzeichen' : 'Neues Abzeichen'}</small><b>${b.t}</b></span></div>`).join('')}</div>` : ''}
            ${ai && winner && winner !== me && !off && tipFor() ? `<div class="ktip">${IC.bulb}<div><b>Tipp für die Revanche</b><p>${tipFor()}</p></div></div>` : ''}
            ${series.d ? `<p class="small">${series.d}× unentschieden</p>` : ''}
            ${online ? `<div class="kemo" id="kemo"></div><div class="kquick">${['gg', 'clap', 'haha', 'sweat'].map(e => `<button data-emo="${e}">${EMO[e]}</button>`).join('')}${['p_wp', 'p_rev'].map(e => `<button class="ph" data-emo="${e}">${PHR[e]}</button>`).join('')}</div>` : ''}
            ${online && V.online.friendOf(M.opp) === false && !(V.cloud.user() && V.cloud.user().anon) ? `<button class="btn ghost sm efr" id="efr"><span>${IC.plus}${esc(M.opp)} als Freund hinzufügen</span></button>` : ''}
            ${watch ? '' : `<button class="btn ${meWon && !off ? '' : 'ghost '}sm eshare" id="es"><span>${IC.share}${meWon && !off ? 'Freund herausfordern' : 'Ergebnis teilen'}</span></button>`}
            ${online && V.online.report ? `<button class="link erep" id="erep">${esc(M.opp)} melden</button>` : ''}
            ${step ? step.html : ''}
            ${ctx.endBtn && !off ? `<button class="btn sm ekx" id="ekx"><span>${IC.chart}${esc(ctx.endBtn.l)}</span></button>` : ''}
            <div class="actions">${watch ? '' : `<button class="btn primary" id="er"><span>${IC.redo}${online ? 'Revanche anfragen' : table ? 'Neuer Tisch' : 'Revanche'}</span><kbd class="only-fine">R</kbd></button>`}<button class="btn" id="eb"><span>Brett ansehen</span></button><button class="btn ghost" id="em"><span>${watch ? 'Zurück' : 'Menü'}</span></button></div></div>`, 'endm', null, false, e => {
            if ((e.key === 'Enter' || e.key === 'n' || e.key === 'N' || e.key === 'r' || e.key === 'R') && !watch) { again(); return true; }
            if (e.key === 'Escape') { closeModal(); return true; }
            if (e.key === 'm' || e.key === 'M') { menu(); return true; }
            return false;
          });
          // the winner's number counts up and pulses once the band is in
          m.querySelectorAll('.eseries b.up').forEach(b => ctx.later(() => { b.textContent = b.dataset.n; V.fx.pop(b, 'bump'); }, 450));
          // the Elo change of an online match, once the server has rated it (it waits for both results)
          const ke = m.querySelector('#kelo');
          if (ke) {
            let tries = 0;
            const look = () => V.cloud.rpc('match_elo', { mid: M.id }).then(r => {
              if (!ke.isConnected) return;
              if (r && r.delta != null) { ke.hidden = false; ke.className = 'kelo ' + (r.delta >= 0 ? 'up' : 'down'); ke.innerHTML = `<span>Elo</span><b>${r.elo}</b><em>${r.delta >= 0 ? '+' : '−'}${Math.abs(r.delta)}</em>`; }
              else if (++tries < 5) ctx.later(look, 1500 * tries);
            }, () => { });
            ctx.later(look, 700);
          }
          const er = m.querySelector('#er'); if (er) er.onclick = again;
          const ekx = m.querySelector('#ekx'); if (ekx) ekx.onclick = () => { V.sfx.ui(); closeModal(); ctx.endBtn.fn(); };
          const kn = m.querySelector('#knext'); if (kn) kn.onclick = () => { V.sfx.go(); V.buzz(12); closeModal(); step.go(); };
          m.querySelectorAll('[data-emo]').forEach(b => b.onclick = () => sendEmote(b.dataset.emo));
          const efr = m.querySelector('#efr');
          if (efr) efr.onclick = () => V.online.request(M.opp).then(r => { efr.disabled = true; efr.querySelector('span').textContent = r === 'accepted' || r === 'friends' ? 'Ihr seid jetzt Freunde' : 'Anfrage gesendet'; }, e => toast(e.message));
          const erep = m.querySelector('#erep'); if (erep) erep.onclick = () => V.online.report(M.opp, M.id);
          if (online && net) net.rematchUI();
          if (V.night && V.night.active() && winner && !watch && !off) V.night.endPick(m, g.id, shown(winner));
          // a new version that came in during the match may offer itself now
          P.updateBar(true);
          const es = m.querySelector('#es'); if (es) es.onclick = () => { V.sfx.ui(); shareCard(winner); };
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
      if (!V.fxOn() || !path.length || fast || (isAI && settings.aiFast)) return done();
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

    // ---------- end screen: the next step ----------
    function nextStep(won) {
      const card = (cls, kick, ic, title, sub, acc) => `<button class="knext ${cls}" id="knext" style="--acc:${acc}"><span class="kn-ic">${ic}</span>
        <span class="kn-t"><small>${kick}</small><b>${title}</b><em>${sub}</em></span><span class="kn-go">${IC.play}</span></button>`;
      // guests: after the third game, once every three days, the free account (their record lives only on this device)
      if (guest() && P.totals().total >= 3 && Date.now() - S.get('acctNudge', 0) > 3 * 864e5) {
        S.set('acctNudge', Date.now());
        const more = V.games.filter(x => locked(x)).length;
        return {
          html: card('acct', 'Bilanz sichern', IC.user, 'Kostenloses Konto', `${more} Spiele mehr, online gegen Freunde und deine Partien auf jedem Gerät`, 'var(--cyan)'),
          go() { home('profile'); }
        };
      }
      if (ai && won && cfg.level < 3 && !fitE) {
        const lv = cfg.level + 1;
        const all = S.get('setup', {}); all[g.id] = Object.assign({}, all[g.id] || {}, cfg, { level: lv }); delete all[g.id].replay; delete all[g.id].firstWas; delete all[g.id].daily;
        return {
          html: card('lvl l' + lv, `${V.LEVELS[cfg.level]} geschlagen`, IC.bolt, `Weiter auf ${V.LEVELS[lv]}`, (g.levelInfo || P.LEVEL_INFO)[lv], 'var(--yellow)'),
          go() { S.set('setup', all); play(g, Object.assign({}, cfg, { level: lv, replay: null, firstWas: null, daily: null, first: cfg.firstWas || cfg.first })); }
        };
      }
      // a few rounds in, or a win at the top: show another game for the same mode
      if (!won && ai && series[1] + series[2] + series.d < 2) return null;
      const mode = ai ? 'ai' : 'local', tried = id => !!P.stats[id];
      const ok = x => x !== g && !locked(x) && (mode === 'local' || !x.noAI) && !(V.discord && V.discord.on);
      const pool = V.games.filter(ok), score = x => (tried(x.id) ? 0 : 4) + (x.cat === g.cat ? 2 : 0) + Math.random() * 1.5;
      const x = pool.sort((a, b) => score(b) - score(a))[0];
      if (!x) return null;
      const opts = {}; (x.options || []).forEach(o => { opts[o.id] = o.def; });
      const saved = S.get('setup', {})[x.id];
      const c2 = saved && (saved.mode === mode) ? Object.assign({}, saved) : { mode, level: ai ? Math.min(cfg.level, 1) : 1, first: 'me', opts };
      return {
        html: card('disc', tried(x.id) ? 'Mal was anderes?' : 'Noch nicht gespielt', x.icon, x.name, x.short || '', x.accent || 'var(--pink)'),
        go() { play(x, c2); }
      };
    }

    // ---------- undo against the AI ----------
    // While moves are replayed every side counts as remote, so the game asks aiTurn for each of them (as online)
    function replayStep(o) {
      const mv = rep.queue.shift(), m = o.decode ? o.decode(mv.m) : mv.m;
      if (m == null) { rep.queue.length = 0; toast('Zurücknehmen ging hier nicht'); return ctx.aiTurn(o); }
      ctx.later(() => aimAt(o, { move: m }, pls[mv.s], false, true, mv.s), 0);
    }
    // ---------- the history: save a finished match, show a recorded one ----------
    function archive(winner, note) {
      try {
        const label = ai ? 'Gegen KI · ' + lvName : online ? 'Online gegen ' + (M.opp || '?') : table ? 'Online-Tisch' : party ? N + ' Spieler' : 'Am Gerät';
        const e = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), g: g.id, mode: cfg.mode, level: cfg.level, label, at: Date.now(),
          opts: cfg.opts || {}, names: Object.fromEntries(SIDES.map(s => [s, shown(s)])), me, winner, note: note || '', plies,
          moves: recOn && recd.length ? recd : null, mid: online ? M.id || null : null
        };
        // a match too big to keep whole (very long games) keeps only its result
        if (e.moves && JSON.stringify(e.moves).length > 60000) e.moves = null;
        const list = S.get('archive', []).filter(x => x && x.id); list.unshift(e);
        S.set('archive', list.slice(0, 40));
        // with an account it goes to the server too, so every device has it (online duels are there already)
        if (P.archiveUp) P.archiveUp(e);
      } catch (x) { }
    }
    let rvShown = false;
    function reviewDone(note) {
      if (rvShown && !note) return;
      rvShown = true; ended = true;
      SIDES.forEach(k => pls[k].classList.remove('on', 'thinking'));
      turnPill(0);
      const k = RV.moves ? (cfg.rvk ?? RV.moves.length) : 0, all = RV.moves ? RV.moves.length : 0;
      const result = note || RV.note || (RV.winner ? `${shown(RV.winner)} gewinnt` : RV.winner === 0 ? 'Remis' : 'Ende der Aufzeichnung');
      setStatus(k < all ? `Zug ${k} von ${all}` : esc(result));
      if (inst && inst.ended) try { inst.ended(RV.winner, RV.note, false); } catch (e) { }
    }
    function undoBtn() { const b = v.querySelector('#pu'); if (b) b.disabled = ended || !hist.some(h => h.s === me); }
    function undo() {
      const k = hist.map(h => h.s).lastIndexOf(me);
      if (k < 0 || ended) return;
      V.sfx.ui();
      play(g, Object.assign({}, cfg, { replay: hist.slice(0, k), first: aiSide === 2 ? 'me' : 'ai', firstWas: cfg.first, undone: true }), series);
    }

    // ---------- first match of a game: a hand shows where to tap ----------
    let navFn = null, guideDue = !auto && !watch && g.cat !== 'Action' && !(S.get('guided', {})[g.id]);
    function showGuide() {
      if (!alive || ended) return;
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.bottom > 0 && r.top < innerHeight; };
      let cand = [...ctx.stage.querySelectorAll('.ok, .can, .src, .tg')].filter(vis);
      if (!cand.length && navFn) cand = navFn().filter(e => e && vis(e));
      if (!cand.length) cand = [...ctx.stage.querySelectorAll('.cell, button:not(:disabled)')].filter(vis);
      if (!cand.length) return;
      // 4 Gewinnt: the middle column at the bottom; otherwise the middle candidate
      const el = g.id === 'c4' && cand.length >= 42 ? cand[38] : cand[Math.floor(cand.length / 2)];
      const seen = S.get('guided', {}); seen[g.id] = 1; S.set('guided', seen);
      const r = el.getBoundingClientRect(), h = V.el('div', 'guide', `<i class="gr"></i><span class="gh-i">${IC.hand}</span><b>Hier tippen</b>`);
      h.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px`;
      document.body.appendChild(h);
      const gone = () => { h.classList.add('out'); setTimeout(() => h.remove(), 250); window.removeEventListener('pointerdown', gone, true); };
      window.addEventListener('pointerdown', gone, true); setTimeout(gone, 6000); cleanups.push(gone);
    }
    // after a loss against the AI: the game's own tip from its tutorial
    const TIP = [/Tipp/, /Gabel|Doppeldrohung|Keine Geschenke|Profi-Trick|Taktik/, /Mühle!|Fangen|Extrazug|Rauswerfen|Schubsen|Blocken/];
    const tipFor = () => { for (const re of TIP) { const t = (g.tutorial || []).find(x => re.test(x.t)); if (t) return t.d; } return ''; };

    // ---------- coin toss when "Zufall" decides who begins ----------
    function coinToss() {
      const meFirst = aiSide === 2, el = V.el('div', 'coin', `<div class="coin-c${meFirst ? '' : ' ai'}"><b class="cf me">DU</b><b class="cf ki">KI</b></div><span>${meFirst ? 'Du beginnst' : 'Die KI beginnt'}</span>`);
      document.body.appendChild(el); V.sfx.tick();
      setTimeout(() => V.sfx.place(), 900);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 1700);
      el.addEventListener('pointerdown', () => el.remove());
    }

    // ---------- first time two people play at one phone: offer the facing seats ----------
    function offerFacing() {
      if (!alive || ended || S.get('faceAsked')) return;
      S.set('faceAsked', 1);
      const m = openModal(`<div class="confirm"><h3>Sitzt ihr euch gegenüber?</h3><p>Dann stehen Name und Hinweise für Spieler 2 auf dem Kopf, und Bretter mit oben und unten drehen sich zum, der dran ist.</p>
        <div class="actions"><button class="btn primary" id="fy"><span>Ja, umdrehen</span></button><button class="btn ghost" id="fn"><span>Nein, nebeneinander</span></button></div><p class="fine">Später unter Optionen → Gegenüber sitzen.</p></div>`);
      m.querySelector('#fn').onclick = closeModal;
      m.querySelector('#fy').onclick = () => { settings.face = true; P.saveSettings(); P.closeModalQuiet(); V.sfx.ui(); play(g, cfg, series); };
    }

    // ---------- network (online and watch) ----------
    const OFF_AFTER = 75, myName = V.cloud && V.cloud.user() ? V.cloud.user().username : '';
    // a line under the status while the opponent is offline, with the seconds until the match is called off
    function offNote(html) {
      let n = v.querySelector('.offnote');
      if (!html) { if (n) n.remove(); return; }
      if (!n) { n = V.el('div', 'offnote'); v.querySelector('.center').insertBefore(n, v.querySelector('#stage')); }
      n.innerHTML = `${IC.wifioff}<span>${html}</span>`;
    }
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
            pls[oppSide].classList.toggle('off', !oppOn && !slow);
            // the server calls the match off after 75 seconds without a sign of life (no winner, it doesn't count)
            const idle = st.role === 'a' ? st.b_idle : st.a_idle;
            offNote(!slow && !oppOn && !ended && st.status === 'live' ? `${esc(names[oppSide])} ist offline · ohne Rückkehr endet die Partie in ${Math.max(0, OFF_AFTER - (idle || 0))} s ohne Sieger · du kannst auch jetzt ohne Wertung gehen` : '');
          }
          const wn = v.querySelector('#pw');
          if (wn) { wn.hidden = !st.watchers; wn.querySelector('b').textContent = st.watchers || ''; }
          if (st.clock) this.clockAt = performance.now();
          (st.reacts || []).forEach(r => {
            if (r.id <= this.react) return; this.react = r.id;
            // side 0: a friend watching; my own reactions are already on screen
            if (!this.fed || (r.side === 0 && r.name === myName) || (!watch && r.side === mySide)) return;
            showEmote(r.side, r.e, r.name);
          });
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
          this.chain = this.chain.then(() => sendRetry(() => rpc('match_move', { mid: M.id, ply, mv: m })
            .then(n => { this.known = Math.max(this.known, n); }), e => { if (!alive) return; toast(/desync/.test(e.message) ? 'Partie wird neu geladen' : 'Zug nicht gesendet: ' + e.message); ctx.later(() => V.online.resume(M.id), 900); }));
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
          offNote('');
          // offline: whoever was gone longer is the one who dropped out
          const meOff = online && (st.role === 'a' ? st.a_idle > st.b_idle : st.b_idle > st.a_idle);
          if (st.status === 'void' && st.result === 'offline') return ctx.end(0, watch ? 'Ein Spieler war zu lange offline' : meOff ? 'Du warst zu lange offline' : names[oppSide] + ' war zu lange offline', true, true);
          if (st.status === 'void') return ctx.end(0, 'Partie annulliert', true, true);
          const note =st.result === 'resign' ? (me ? 'Du hast aufgegeben' : loser + ' hat aufgegeben') : st.result === 'time' ? (me ? 'Deine Zeit ist abgelaufen' : loser + ': Zeit abgelaufen') : st.result === 'abandon' ? (me ? 'Du hast die Partie verlassen' : loser + ' hat die Partie verlassen') : '';
          if (st.result === 'resign' || st.result === 'abandon' || st.result === 'time' || watch) ctx.end(w, note, true);
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
          this.chain = this.chain.then(() => sendRetry(() => rpc('party_move', { tid: M.id, ply: -1, s, mv: m }), e => { if (alive) toast('Nicht gesendet: ' + e.message); }));
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
          this.chain = this.chain.then(() => sendRetry(() => rpc('party_move', { tid: M.id, ply, s, mv: m })
            .then(n => { this.known = Math.max(this.known, n); }), e => { if (!alive) return; toast(/desync/.test(e.message) ? 'Tisch wird neu geladen' : 'Zug nicht gesendet: ' + e.message); ctx.later(() => V.online.resumeTable(M.id), 900); }));
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
    // the game's page on the site (same names as tools/pages.ps1 gives them), so the link shows a preview in chats
    const pageUrl = () => 'https://bananemdnaa.github.io/versus/' + (V.lang === 'en' ? 'games/' : 'de/spiele/') +
      g.name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/';
    // the words that go with the picture: after beating the AI a challenge, otherwise the score and an invitation
    function shareText(winner) {
      const en = V.lang === 'en', nm = s => V.t(names[s]), lvl = V.t(lvName);
      if (ai && !party && me) {
        const a = series[me], b = series[aiSide];
        if (winner === me) return en ? `I beat the AI at ${g.name} (${lvl}, ${a}:${b}). Can you beat it too?` : `Ich habe die KI in ${g.name} geschlagen (${lvl}, ${a}:${b}). Schaffst du das auch?`;
        return en ? `${g.name} against the AI (${lvl}): ${a}:${b}. Think you can do better?` : `${g.name} gegen die KI (${lvl}): ${a}:${b}. Kannst du es besser?`;
      }
      if (online && winner === me) return en ? `I just beat ${M.opp} at ${g.name}. Fancy a game?` : `Ich habe gerade ${M.opp} in ${g.name} geschlagen. Lust auf eine Runde?`;
      const score = party ? SIDES.slice().sort((x, y) => series[y] - series[x]).map(s => `${nm(s)} ${series[s]}`).join(', ') : `${nm(L)} ${series[L]}:${series[R]} ${nm(R)}`;
      return `${g.name}: ${score}. ` + (en ? 'Play along on Versus!' : 'Spiel mit auf Versus!');
    }
    async function shareCard(winner) {
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
      } else {
        font(300); c.fillStyle = V.hex(L); c.fillText(String(series[L]), W / 2 - 200, 690);
        c.fillStyle = '#5c5f86'; c.fillText(':', W / 2, 670);
        c.fillStyle = V.hex(R); c.fillText(String(series[R]), W / 2 + 200, 690);
        [[L, W / 2 - 200], [R, W / 2 + 200]].forEach(([s, x]) => { c.fillStyle = '#fff'; fit(V.t(names[s]).toUpperCase(), 54, 380); c.fillText(V.t(names[s]).toUpperCase(), x, 790); });
        if (series.d) { c.fillStyle = '#9a9cc4'; font(32, 700); c.fillText(V.t(series.d + '× unentschieden').toUpperCase(), W / 2, 860); }
      }
      c.fillStyle = '#6f7299'; font(30, 700);
      c.fillText(new Date().toLocaleDateString(V.locale()) + '  ·  BANANEMDNAA.GITHUB.IO/VERSUS', W / 2, W - 60);
      const text = shareText(winner) + '\n' + pageUrl();
      const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
      if (!blob) return toast('Bild ging nicht');
      const file = new File([blob], 'versus-' + g.id + '.png', { type: 'image/png' });
      // phones: picture and text with the link in one go; some apps only take text, then the link brings the preview
      try {
        if (navigator.canShare && navigator.canShare({ files: [file], text })) return await navigator.share({ files: [file], title: 'Versus', text });
        if (navigator.share && V.coarse) return await navigator.share({ title: 'Versus', text });
      } catch (e) { if (e && e.name === 'AbortError') return; }
      // computers: the text with the link goes to the clipboard, the picture is saved
      const a = V.el('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      try { await navigator.clipboard.writeText(text); toast('Text mit Link kopiert, Bild gespeichert'); } catch (e) { toast('Bild gespeichert'); }
    }

    // ---------- reactions ----------
    function showEmote(s, e, who) {
      if (!say(e)) return;
      const phr = !!PHR[e], ms = phr ? 3400 : 2600;
      // a friend watching: a chip that floats up over the board, with the name
      if (s === 0) {
        const c = v.querySelector('.center'); if (!c) return;
        const b = V.el('span', 'emo-w' + (phr ? ' phr' : ''), `<b>${say(e)}</b><small>${esc(who === myName ? 'Du' : who || 'Zuschauer')}</small>`);
        b.style.setProperty('--x', (15 + Math.random() * 70).toFixed(0) + '%');
        c.appendChild(b); setTimeout(() => b.remove(), ms); V.sfx.tick();
        return;
      }
      if (!pls[s]) return;
      // a phrase is a speech bubble on the player's card; a new one replaces the last
      if (phr) pls[s].querySelectorAll('.emo.phr').forEach(x => x.remove());
      const b = V.el('span', 'emo' + (e === 'gg' ? ' txt' : phr ? ' phr' : ''), say(e)); pls[s].appendChild(b); setTimeout(() => b.remove(), ms);
      const k = document.querySelector('.ko #kemo');
      if (k) { const t = V.el('span', 'kemo-i' + (phr ? ' phr' : ''), `<b>${say(e)}</b><small>${esc(names[s])}</small>`); k.appendChild(t); setTimeout(() => t.remove(), ms); }
      V.sfx.tick();
    }
    let emoT = 0;
    function sendEmote(e) {
      if (!(online || watch) || !net || performance.now() - emoT < (watch ? 2000 : 1000)) return;
      emoT = performance.now(); showEmote(watch ? 0 : mySide, e, myName);
      rpc('match_react', { mid: M.id, e }).catch(() => { });
    }
    const pe = v.querySelector('#pe');
    if (pe) {
      let pick = null;
      const close = () => { if (pick) { pick.remove(); pick = null; } };
      pe.onclick = ev => {
        ev.stopPropagation(); V.sfx.ui();
        if (pick) return close();
        // watching friends only send emojis; the players also get the phrases
        pick = V.el('div', 'emopick', Object.keys(EMO).map(e => `<button data-e="${e}">${EMO[e]}</button>`).join('')
          + (watch ? '' : `<div class="phr">${Object.keys(PHR).map(e => `<button data-e="${e}">${PHR[e]}</button>`).join('')}</div>`));
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
      let run = 0, lastT = performance.now(), flagT = 0, tickSec = 0;
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
        // under 10 seconds a quiet tick every second
        const sec = on && show[on] > 0 && show[on] < 10000 ? Math.ceil(show[on] / 1000) : 0;
        if (sec && sec !== tickSec) V.sfx.tick();
        tickSec = sec;
      };
      const iv = setInterval(tick, 100); cleanups.push(() => clearInterval(iv)); tick();
    }

    let inst = null;
    P.setCurrent({
      destroy() {
        alive = false; timers.forEach(clearTimeout); timers.clear();
        cleanups.forEach(f => { try { f(); } catch (e) { } });
        if (V.aiWorker) V.aiWorker.cancel();
        if (inst && inst.destroy) try { inst.destroy(); } catch (e) { }
      }
    });
    // the opponent is offline right now (their card is greyed out): leaving ends the match without a result,
    // as if they had been gone for good (server: match_drop checks it again)
    const oppGone = () => online && !slow && !ended && !!pls[oppSide] && pls[oppSide].classList.contains('off');
    function leave(to) {
      if (ended || watch) return to();
      if (slow && to !== null) return V.ui.home('online');
      if (oppGone()) return dropOut(to);
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
    function dropOut(to) {
      if (inst && inst.pause) inst.pause();
      const m = openModal(`<div class="confirm"><h3>Partie beenden?</h3><p>${esc(M.opp)} ist offline. Die Partie endet ohne Wertung, niemand gewinnt oder verliert.</p>
        <div class="actions"><button class="btn primary" id="cy"><span>Weiter warten</span></button><button class="btn ghost" id="cn"><span>Beenden</span></button></div></div>`,
        '', () => { if (inst && inst.resume && alive) inst.resume(); }, false, e => { if (e.key === 'Enter') { closeModal(); return true; } return false; });
      m.querySelector('#cy').onclick = closeModal;
      m.querySelector('#cn').onclick = async () => {
        P.closeModalQuiet();
        let ok = false, err = '';
        try { ok = await rpc('match_drop', { mid: M.id }); } catch (e) { err = e.message; }
        if (!alive) return;
        if (err) return toast(/match_drop|function/i.test(err) ? 'Das geht nach dem nächsten Server-Update. Bis dahin endet die Partie nach 75 Sekunden von selbst.' : err);
        // the opponent came back in the meantime: the normal question (giving up) instead
        if (!ok) { toast(`${M.opp} ist wieder da`); pls[oppSide].classList.remove('off'); return leave(to); }
        offNote('');
        if (to) return to();
        else ctx.end(0, `${M.opp} war offline, ohne Wertung`, true, true);
      };
    }
    const tut = () => { if (inst && inst.pause) inst.pause(); tutorial(g, () => { if (inst && inst.resume && alive) inst.resume(); }); };
    const back = () => leave(() => watch ? (M.admin ? V.account.admin('matches') : V.ui.home('online')) : setup(g));
    // all options as a popup: the game holds still while it is open (online it keeps running)
    const optsPop = () => { if (inst && inst.pause) inst.pause(); P.optsPopup(() => { if (inst && inst.resume && alive) inst.resume(); }); };
    // the settings of this match (js/app.js rulesPopup): online only to read, else they count from a new start
    const setPop = () => { if (inst && inst.pause) inst.pause(); P.rulesPopup(g, cfg, { readOnly: online || table, restart: online || table ? null : c => leave(() => play(g, c)), onClose: () => { if (inst && inst.resume && alive) inst.resume(); } }); };
    // ---------- pause menu (Esc, the back button) ----------
    // Local matches and against the AI: the game holds still (action games pause their loop). Online it keeps running,
    // so it is called "Menü" there and offers resigning instead of a new start. Leaving still asks once more.
    function pauseMenu() {
      if (watch || ended) return back();
      const netGame = online || table, title = netGame ? 'Menü' : 'Pause';
      if (inst && inst.pause) inst.pause();
      const row = (id, ic, l, k) => `<button class="pz-row" id="${id}">${ic}<span>${l}</span>${k ? `<kbd class="only-fine">${k}</kbd>` : ''}</button>`;
      const sw = (k, on, l) => `<button class="pz-sw" data-pzs="${k}" role="switch" aria-checked="${on}"><span>${l}</span><i class="sw${on ? ' on' : ''}"></i></button>`;
      const sl = (k, l, off) => `<label class="pz-sl${off ? ' off' : ''}"><span>${l}</span><input type="range" min="0" max="100" step="5" value="${settings[k]}" data-pzv="${k}" style="--p:${settings[k]}%" aria-label="${l}"></label>`;
      const score = party ? SIDES.map(s => series[s]).join(':') : series[L] + ':' + series[R];
      const hasSet = !!((g.options && g.options.length) || g.panelExtra);
      const m = openModal(`<div class="pause">
        <div class="pz-l"><span class="pz-k">${netGame ? 'Die Partie läuft weiter' : 'Partie angehalten'}</span><h2>${title}</h2>
          <p class="pz-info"><span>${esc(g.name)}</span> · <span>${sublabel}</span> · <span>Zug ${plies + 1}</span> · <span>${score}</span></p>
          <button class="btn primary big" id="pz_go"><span>${IC.play}Weiterspielen</span><kbd class="only-fine">Esc</kbd></button>
          <div class="pz-list">${canUndo ? row('pz_undo', IC.undo, 'Zug zurück', 'Z') : ''}
            ${online ? row('pz_res', IC.flag, 'Aufgeben', '') : table ? '' : row('pz_new', IC.redo, 'Neu starten', 'N')}
            ${row('pz_rules', IC.help, 'Regeln', 'H')}${hasSet ? row('pz_set', IC.sliders, netGame ? 'So wird gespielt' : 'Einstellungen der Partie', 'R') : ''}${V.coarse ? '' : row('pz_keys', IC.kbd, 'Tastenkürzel', '?')}</div>
          <button class="pz-leave" id="pz_leave">${IC.x}<span><b>${table ? 'Tisch verlassen' : 'Partie verlassen'}</b><small>${online ? (oppGone() ? 'Gegner offline, zählt nicht' : 'zählt als Niederlage') : table ? 'Die KI übernimmt deinen Platz' : 'zählt nicht in der Bilanz'}</small></span></button></div>
        <div class="pz-r"><h3>Schnell-Einstellungen</h3>
          ${sl('vol', 'Effekte', !settings.sound)}${sl('mvol', 'Musik', !settings.sound || settings.music === false)}
          ${sw('hints', settings.hints !== false, 'Zughilfen')}${ai ? sw('aiFast', !!settings.aiFast, 'Schnelle KI') : ''}${sw('cb', !!settings.cb, 'Farbenblind-Modus')}
          <button class="pz-row pz-opts" id="pz_opts">${IC.gear}<span>Alle Optionen öffnen</span></button></div></div>`,
        'pausem', () => { if (inst && inst.resume && alive) inst.resume(); }, false, e => {
          const k = e.key;
          if ((k === 'z' || k === 'Z') && canUndo) { closeModal(); undo(); return true; }
          if ((k === 'n' || k === 'N') && !netGame) { P.closeModalQuiet(); leave(() => play(g, cfg, series)); return true; }
          if (k === 'h' || k === 'H') { P.closeModalQuiet(); tut(); return true; }
          if ((k === 'r' || k === 'R') && hasSet) { P.closeModalQuiet(); setPop(); return true; }
          if (k === '?') { P.closeModalQuiet(); P.showKeys(); return true; }
          return false;
        });
      const on = (id, fn) => { const b = m.querySelector('#' + id); if (b) b.onclick = () => { V.sfx.ui(); fn(); }; };
      on('pz_go', closeModal);
      on('pz_undo', () => { closeModal(); undo(); });
      on('pz_new', () => { P.closeModalQuiet(); leave(() => play(g, cfg, series)); });
      on('pz_res', () => { P.closeModalQuiet(); leave(null); });
      on('pz_rules', () => { P.closeModalQuiet(); tut(); });
      on('pz_keys', () => { P.closeModalQuiet(); P.showKeys(); });
      on('pz_set', () => { P.closeModalQuiet(); setPop(); });
      on('pz_leave', () => { P.closeModalQuiet(); back(); });
      on('pz_opts', () => { P.closeModalQuiet(); optsPop(); });
      m.querySelectorAll('[data-pzs]').forEach(b => b.onclick = () => {
        const k = b.dataset.pzs, val = k === 'hints' ? settings.hints === false : !settings[k];
        settings[k] = val; P.saveSettings(); P.applyFxClass(); V.sfx.ui();
        b.setAttribute('aria-checked', val); b.querySelector('.sw').classList.toggle('on', val);
      });
      m.querySelectorAll('[data-pzv]').forEach(r => r.oninput = () => {
        const k = r.dataset.pzv; settings[k] = +r.value; r.style.setProperty('--p', r.value + '%'); P.saveSettings();
        if (k === 'mvol') V.music.apply(); else V.sfx.tick();
      });
    }
    v.querySelector('#pb').onclick = () => { V.sfx.ui(); pauseMenu(); };
    const pz = v.querySelector('#pz'); if (pz) pz.onclick = () => { V.sfx.ui(); pauseMenu(); };
    v.querySelectorAll('.pbar .snd').forEach(b => b.onclick = () => P.toggleSound());
    const pfs = v.querySelector('#pfs');
    if (pfs) pfs.onclick = () => { V.sfx.ui(); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); else document.documentElement.requestFullscreen().catch(() => { }); };
    const pr = v.querySelector('#pr');
    if (pr) pr.onclick = () => online ? leave(null) : leave(() => play(g, cfg, series));
    v.querySelector('#ph').onclick = tut;
    P.playApi = {
      key(e) { return keyFn ? keyFn(e) : false; },
      back,
      menu: pauseMenu,
      // the laptop sidebar during a match: leave (with the usual question), then go there
      leaveTo(fn) { leave(fn); },
      opts: optsPop,
      undo() { if (canUndo && !ended) undo(); },
      restart() { if (!online && !watch) leave(() => play(g, cfg, series)); },
      tut
    };
    const pu = v.querySelector('#pu'); if (pu) pu.onclick = undo;
    if (rep) { /* replaying after an undo: no intro */ }
    else if (party && N > 2) vsIntro({ name: names[1], sub: sideLabel(1) }, { name: ai ? N - 1 + ' KIs' : 'Alle', sub: ai ? lvName : N + ' Spieler' }, rematch);
    else vsIntro({ name: names[L], sub: sideLabel(L) }, { name: names[R], sub: ai ? 'KI · ' + lvName : online ? 'online' : sideLabel(R) }, rematch || watch);
    if (ai && V.aiWorker) V.aiWorker.warm(g);
    inst = g.start(ctx) || {};
    // a recorded match: step through it (chess has its own move list with the review)
    if (review && RV.moves && g.id !== 'chess') {
      const all = RV.moves.length, k = Math.max(0, Math.min(all, cfg.rvk ?? all));
      const bar = V.el('div', 'rvbar', `<button data-k="0" aria-label="Zum Anfang"${k ? '' : ' disabled'}>⏮</button><button data-k="${k - 1}" aria-label="Zug zurück"${k ? '' : ' disabled'}>◀</button>
        <b>${k} / ${all}</b><button data-k="${k + 1}" aria-label="Zug vor"${k < all ? '' : ' disabled'}>▶</button><button data-k="${all}" aria-label="Zum Ende"${k < all ? '' : ' disabled'}>⏭</button>`);
      ctx.stage.after(bar);
      bar.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { V.sfx.tick(); play(g, Object.assign({}, cfg, { replay: RV.moves.slice(0, +b.dataset.k), rvk: +b.dataset.k })); });
      const keyStep = e => { if (e.key === 'ArrowLeft' && k > 0) bar.querySelectorAll('button')[1].click(); else if (e.key === 'ArrowRight' && k < all) bar.querySelectorAll('button')[2].click(); };
      addEventListener('keydown', keyStep); cleanups.push(() => removeEventListener('keydown', keyStep));
    }
    if (ai && !party && cfg.first === 'rand' && !rep && !auto && V.fxOn()) ctx.later(coinToss, introMs);
    if (cfg.mode === 'local' && !party && g.cat !== 'Action' && V.coarse && !settings.face && !V.ui.wide()) ctx.later(offerFacing, introMs + 500);
    // When the match does not fit on the screen: on the phone the player cards get smaller first (up to three steps),
    // then (phone and laptop) boards that size themselves with --bw shrink by what is still missing, so the board and
    // your own card stay visible without scrolling. Checked again whenever the stage changes size.
    let fitF = 0, fitW = 0, fitH = 0, lastW = innerWidth;
    const fit = () => {
      fitF = 0;
      if (!alive) return;
      // the page scrolls on the phone, the main area (#app) on the laptop
      // parts marked .nofit (the chess move list and review below the board) may go below the screen: they don't count
      const loose = () => [...ctx.stage.querySelectorAll('.nofit')].reduce((h, e) => h + e.offsetHeight + 6, 0);
      // the height to fit into: the smallest one seen at this width, so Safari's address bar coming and going while
      // scrolling (iPad, iPhone) doesn't make the board grow and shrink again and again
      const sc = V.ui.wide() ? document.getElementById('app') : document.documentElement;
      const viewH = () => { const h = sc === document.documentElement ? innerHeight : sc.clientHeight; if (fitW !== innerWidth) { fitW = innerWidth; fitH = h; } fitH = Math.min(fitH, h); return fitH; };
      const extra = () => sc.scrollHeight - viewH() - loose();
      const was = ctx.stage.style.getPropertyValue('--bw');
      const over = () => extra() > 2;
      // the entrance animation moves everything down a little; measure once it is over
      if (v.classList.contains('enter')) { fitF = setTimeout(fit, 120); return; }
      v.classList.remove('tight', 'tight2', 'tight3');
      ctx.stage.style.removeProperty('--bw');
      if (!V.ui.wide()) {
        if (over()) v.classList.add('tight');
        if (over()) v.classList.add('tight2');
        // party games show every player on the board itself (Poker seats, Würfelblock table), so the cards may go
        if (party && over()) v.classList.add('tight3');
      }
      const b = ctx.stage.firstElementChild; if (!b) return;
      b.style.zoom = '';
      let miss = extra();
      if (miss > 2 && b.offsetWidth > 280) {
        // a few pixels more or less are not worth a jump of the board (no back and forth)
        const want = Math.max(260, b.offsetWidth - miss - 4), old = parseFloat(was);
        ctx.stage.style.setProperty('--bw', (old && Math.abs(old - want) < 10 && old <= want + 2 ? old : want) + 'px');
      }
      // boards that do not follow --bw (Poker table, Würfelblock sheet) are scaled down, at most to 72 %;
      // not Schiffe versenken, whose own fleet sits below the sea on purpose and whose ships are dragged
      miss = extra();
      for (let k = 0; k < 2 && miss > 2 && g.id !== 'ships' && b.offsetHeight > 200; k++) {
        const z = +b.style.zoom || 1, h = b.getBoundingClientRect().height;
        b.style.zoom = Math.max(0.72, z * (h - miss - 4) / h).toFixed(3);
        miss = extra();
      }
    };
    const askFit = () => { if (!fitF) fitF = setTimeout(fit, 40); };
    if (window.ResizeObserver) { const ro = new ResizeObserver(askFit); ro.observe(ctx.stage); cleanups.push(() => ro.disconnect()); }
    // only a new width (turning the device, a resized window) is a reason to fit again; a height change alone is the
    // browser's toolbar showing or hiding while scrolling
    const onResize = () => { if (Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; askFit(); };
    addEventListener('resize', onResize); cleanups.push(() => { removeEventListener('resize', onResize); clearTimeout(fitF); });
    askFit();
    // some games build part of their screen a moment later (the fleet dock in Schiffe versenken): measure again
    [700, 1600].forEach(ms => ctx.later(askFit, ms));
  }
  P.play = play;
})();
