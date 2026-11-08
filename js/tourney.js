// Versus: tournament at one device. 3 to 8 names, one game for two, a knockout bracket. Every match is played at the
// same device with the two names on the cards; the end screen leads back to the bracket. A draw is played again.
// Byes go to the first names drawn, so with 5 players three get a free first round. Stored on this device only
// (versus.tourney); finishing or ending it clears it.
(function () {
  'use strict';
  const S = () => V._.S, IC = () => V.ui.IC;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MAX = 8;
  // a typed name inside a sentence: its own element, so js/i18n.js translates the sentence around it, never the name
  const N = n => `<b translate="no">${esc(n)}</b>`;
  const get = () => S().get('tourney', null);
  const put = t => S().set('tourney', t);
  const active = () => { const t = get(); return !!(t && t.rounds && V.byId[t.g]); };
  // games for two at one device that this player may open (guests: the guest games)
  const pool = () => V.games.filter(g => !g.party && !V._.locked(g)).sort((a, b) => (a.order || 99) - (b.order || 99) || a.name.localeCompare(b.name));

  // ---------- the bracket ----------
  // round names counted from the final
  const roundName = (k, total) => { const left = total - k; return left === 1 ? 'Finale' : left === 2 ? 'Halbfinale' : left === 3 ? 'Viertelfinale' : 'Runde ' + (k + 1); };
  function build(people) {
    const p = V.shuffle(people.slice()), size = 1 << Math.ceil(Math.log2(p.length)), rounds = [];
    // seed i meets seed size-1-i: with fewer players than places the last seeds are byes
    rounds.push(Array.from({ length: size / 2 }, (_, i) => ({ a: p[i], b: p[size - 1 - i] ?? null, w: null })));
    for (let n = size / 4; n >= 1; n /= 2) rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, w: null })));
    rounds[0].forEach((m, i) => { if (!m.b) { m.w = m.a; m.bye = true; send(rounds, 0, i); } });
    return rounds;
  }
  // the winner of match i in round r moves into the next round
  function send(rounds, r, i) {
    const nx = rounds[r + 1]; if (!nx) return;
    nx[i >> 1][i % 2 ? 'b' : 'a'] = rounds[r][i].w;
  }
  const nextMatch = t => { for (let r = 0; r < t.rounds.length; r++) for (let i = 0; i < t.rounds[r].length; i++) { const m = t.rounds[r][i]; if (m.a && m.b && !m.w) return { r, i, m }; } return null; };
  const champion = t => { const f = t.rounds[t.rounds.length - 1][0]; return f && f.w; };

  // ---------- home entry ----------
  function row() {
    const t = get();
    if (active()) {
      const nm = nextMatch(t), ch = champion(t);
      return `<button class="opt tny-on" data-tny="1">${IC().trophy}<span><b>Turnier läuft · <span translate="no">${esc(V.byId[t.g].name)}</span></b><small>${ch ? N(ch) + ' hat gewonnen' : nm ? `${N(nm.m.a)} gegen ${N(nm.m.b)} · <span>${roundName(nm.r, t.rounds.length)}</span>` : ''}</small></span><em class="rtag live">Baum</em></button>`;
    }
    return `<button class="opt" data-tny="1">${IC().trophy}<span><b>Turnier</b><small>3 bis 8 Leute, ein Spiel, K.-o.-Runden an einem Gerät</small></span></button>`;
  }
  function wire(b) { b.querySelectorAll('[data-tny]').forEach(x => x.onclick = () => { V.sfx.ui(); open(); }); }
  function refreshHome() { document.querySelectorAll('[data-tny]').forEach(x => { const d = document.createElement('div'); d.innerHTML = row(); const nx = d.firstElementChild; x.replaceWith(nx); wire(nx.parentNode); }); }
  function open() { return active() ? bracket() : setupT(); }

  // ---------- set up: names and the game ----------
  function setupT() {
    const names = S().get('tnyNames', []).slice(0, MAX);
    while (names.length < 4) names.push('');
    const games = pool();
    let pick = (V.byId[S().get('tnyGame')] && games.includes(V.byId[S().get('tnyGame')])) ? S().get('tnyGame') : (games[0] || {}).id;
    const field = (v, k) => `<div class="nt-in"><input class="inp" maxlength="12" data-i="${k}" value="${esc(v)}" placeholder="Name ${k + 1}" autocomplete="off" spellcheck="false" enterkeyhint="next"><button class="iconbtn" type="button" data-del="${k}" aria-label="Entfernen">${IC().x}</button></div>`;
    const m = V.ui.openModal(`<form class="fadd night tny" id="tyf">
      <div class="fadd-h"><h3>Turnier</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint">Alle spielen am selben Gerät. Wer verliert, ist raus, bis einer übrig ist. Bei Remis wird nochmal gespielt.</p>
      <h4 class="nt-h">Wer spielt mit?</h4>
      <div class="nt-list" id="tyl">${names.map(field).join('')}</div>
      <button class="btn ghost sm" type="button" id="tyadd"><span>${IC().plus}Person dazu</span></button>
      <h4 class="nt-h">Welches Spiel?</h4>
      <div class="rgames tny-g" id="tyg" role="radiogroup" aria-label="Spiel">${games.map(g => `<button type="button" role="radio" data-g="${g.id}" class="${g.id === pick ? 'on' : ''}" aria-checked="${g.id === pick}" title="${esc(g.name)}"><span class="ic">${g.icon}</span><small>${esc(g.name)}</small></button>`).join('')}</div>
      <p class="aerr" id="tye"></p>
      <div class="actions"><button class="btn primary" type="submit"><span>${IC().trophy}Turnier starten</span></button><button class="btn ghost" type="button" id="tyc"><span>Abbrechen</span></button></div></form>`, 'faddm');
    const list = m.querySelector('#tyl'), err = t => { m.querySelector('#tye').textContent = t; V.sfx.bad(); };
    const rewire = () => {
      list.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { if (list.children.length > 3) { x.parentNode.remove(); V.sfx.ui(); } else x.previousElementSibling.value = ''; });
      list.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') { const nx = i.parentNode.nextElementSibling; if (nx) { e.preventDefault(); nx.querySelector('input').focus(); } } });
    };
    rewire();
    m.querySelector('#tyadd').onclick = () => {
      if (list.children.length >= MAX) return err(`Höchstens ${MAX} Personen.`);
      list.insertAdjacentHTML('beforeend', field('', list.children.length)); rewire(); V.sfx.ui();
      list.lastElementChild.querySelector('input').focus();
    };
    const gl = m.querySelector('#tyg');
    gl.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { pick = x.dataset.g; gl.querySelectorAll('[data-g]').forEach(y => { y.classList.toggle('on', y === x); y.setAttribute('aria-checked', y === x); }); V.sfx.tick(); });
    setTimeout(() => { const on = gl.querySelector('.on'); if (on) gl.scrollLeft = on.offsetLeft - gl.clientWidth / 2 + on.offsetWidth / 2; }, 0);
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelector('#tyc').onclick = V.ui.closeModal;
    m.querySelector('#tyf').onsubmit = e => {
      e.preventDefault();
      const got = [...list.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean), low = got.map(x => x.toLowerCase());
      if (got.length < 3) return err('Mindestens drei Namen.');
      if (low.some((x, k) => low.indexOf(x) !== k)) return err('Jeder Name nur einmal.');
      if (!V.byId[pick]) return err('Wähl ein Spiel.');
      S().set('tnyNames', got); S().set('tnyGame', pick);
      put({ g: pick, people: got, rounds: build(got), at: Date.now() });
      V.sfx.go(); refreshHome(); bracket(true);
    };
    if (!V.coarse) setTimeout(() => { const i = list.querySelector('input'); if (i) i.focus(); }, 60);
  }

  // ---------- the bracket view ----------
  function bracket(fresh) {
    const t = get(); if (!t) return;
    const g = V.byId[t.g], nm = nextMatch(t), ch = champion(t);
    if (ch) return finale(t);
    const slot = (n, m) => `<span class="ty-p${m.w && m.w === n ? ' won' : m.w && n ? ' out' : ''}"${n ? ' translate="no"' : ''}>${n ? esc(n) : m.bye ? '<i>Freilos</i>' : '<i>?</i>'}</span>`;
    const md = (m, r, i) => `<div class="ty-m${nm && nm.r === r && nm.i === i ? ' now' : ''}${m.bye ? ' bye' : ''}" style="--k:${i}">${slot(m.a, m)}${slot(m.b, m)}</div>`;
    const m = V.ui.openModal(`<div class="fadd night tny">
      <div class="fadd-h"><h3>Turnier</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint"><span class="ty-g"><span class="ic">${g.icon}</span><b>${esc(g.name)}</b></span> · ${t.people.length} Spieler</p>
      <div class="ty-tree${fresh ? ' fresh' : ''}" style="--r:${t.rounds.length}">${t.rounds.map((rd, r) => `<div class="ty-col"><h5>${roundName(r, t.rounds.length)}</h5><div class="ty-ms">${rd.map((x, i) => md(x, r, i)).join('')}</div></div>`).join('')}</div>
      ${nm ? `<div class="ty-next"><small>${roundName(nm.r, t.rounds.length)}</small><b><span translate="no">${esc(nm.m.a)}</span> <i>gegen</i> <span translate="no">${esc(nm.m.b)}</span></b></div>` : ''}
      <div class="actions">${nm ? `<button class="btn primary" id="tygo"><span>${IC().play}Spiel starten</span></button>` : ''}<button class="btn ghost" id="tyend"><span>Turnier beenden</span></button></div></div>`, 'faddm');
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    const go = m.querySelector('#tygo'); if (go) go.onclick = () => { V.ui.closeModal(true); playNext(); };
    m.querySelector('#tyend').onclick = () => {
      const b = m.querySelector('#tyend');
      if (!b.classList.contains('danger')) { b.classList.add('danger'); b.querySelector('span').textContent = 'Wirklich beenden?'; return; }
      put(null); refreshHome(); V.ui.closeModal(); V.ui.toast('Turnier beendet');
    };
  }

  // one match: at one device with the two names; the end screen's button reports the winner back here
  function playNext() {
    const t = get(); if (!t) return;
    const nm = nextMatch(t); if (!nm) return bracket();
    const g = V.byId[t.g], opts = {};
    (g.options || []).forEach(o => { opts[o.id] = o.def; });
    // the game's own saved rules (board size, clock …) stay; a head start does not belong in a tournament
    const saved = (S().get('setup', {})[g.id] || {}).opts || {};
    Object.keys(saved).forEach(k => { if (k in opts && k !== 'hc' && k !== 'seed') opts[k] = saved[k]; });
    V._.play(g, {
      mode: 'local', level: 1, first: 'me', opts,
      names: { 1: nm.m.a, 2: nm.m.b },
      tourney: {
        label: 'Turnier · ' + roundName(nm.r, t.rounds.length),
        done(side) {
          const cur = get(); if (!cur) return;
          const x = cur.rounds[nm.r] && cur.rounds[nm.r][nm.i]; if (!x || x.w) return;
          x.w = side === 1 ? x.a : x.b; send(cur.rounds, nm.r, nm.i); put(cur); refreshHome();
        },
        back() { V.ui.home('games'); bracket(); }
      }
    });
  }

  // the champion: trophy, the path to the title, then it is cleared
  function finale(t) {
    const ch = champion(t), g = V.byId[t.g];
    const path = t.rounds.map((rd, r) => { const x = rd.find(y => y.w === ch && !y.bye); return x ? `<div><span>${roundName(r, t.rounds.length)}</span><b>gegen <span translate="no">${esc(x.a === ch ? x.b : x.a)}</span></b></div>` : ''; }).join('');
    put(null); refreshHome();
    const text = (V.lang === 'en' ? 'Tournament on Versus' : 'Turnier bei Versus') + ` (${g.name}): ${ch} 🏆\nhttps://bananemdnaa.github.io/versus/`;
    const m = V.ui.openModal(`<div class="fadd night fin tny">
      <div class="nt-crown">${IC().trophy}</div>
      <h3>${N(ch)} gewinnt das Turnier!</h3>
      <p class="fhint"><span translate="no">${esc(g.name)}</span> · ${t.people.length} Spieler</p>
      <div class="nt-log">${path}</div>
      <div class="actions"><button class="btn primary" id="tyshare"><span>${IC().share}Ergebnis teilen</span></button><button class="btn" id="tyagain"><span>${IC().redo}Neues Turnier</span></button><button class="btn ghost" id="tyok"><span>Fertig</span></button></div></div>`, 'faddm');
    V.sfx.win(); setTimeout(() => V.fx.confetti(), 200);
    m.querySelector('#tyok').onclick = V.ui.closeModal;
    m.querySelector('#tyagain').onclick = () => setupT();
    m.querySelector('#tyshare').onclick = async () => {
      try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); V.ui.toast('Kopiert'); } } catch (e) { }
    };
  }

  V.tourney = { row, wire, active, open, refreshHome };
})();
