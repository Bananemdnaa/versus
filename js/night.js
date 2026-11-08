// Versus: game night. A table just for one evening: who wins the most games, across all games and modes.
// Names are typed in once; after every game the end screen asks who gets the point (online opponents and your own
// account are matched by name automatically). Nothing counts anywhere else; ending the night clears it.
// Stored on this device only (versus.night).
(function () {
  'use strict';
  const S = () => V._.S, IC = () => V.ui.IC;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MAX = 8;
  const get = () => S().get('night', null);
  const put = n => S().set('night', n);
  // account only: guests (also guest sessions from a quick match) see the row with a lock and land on the account page
  const shut = () => !!(V.guest && V.guest());
  const active = () => { const n = get(); return !shut() && !!(n && n.people && n.people.length >= 2); };

  // points per person, best first (ties by name)
  function table(n) {
    const pts = {}; n.people.forEach(p => { pts[p] = 0; });
    n.rounds.forEach(r => { if (r.w && pts[r.w] != null) pts[r.w]++; });
    return n.people.map(p => ({ p, n: pts[p] })).sort((a, b) => b.n - a.n || a.p.localeCompare(b.p));
  }
  function leadText(n) {
    if (!n.rounds.length) return 'Noch keine Partie eingetragen';
    const t = table(n);
    return t[0].n === (t[1] && t[1].n) ? `Gleichstand mit ${t[0].n}` : `${t[0].p} führt mit ${t[0].n}`;
  }

  // ---------- home entry ----------
  function row() {
    const n = get();
    return active()
      ? `<button class="opt night-on" data-night="1">${IC().trophy}<span><b>Spieleabend läuft</b><small>${esc(leadText(n))} · ${n.rounds.length} ${n.rounds.length === 1 ? 'Partie' : 'Partien'}</small></span><em class="rtag live">Tabelle</em></button>`
      : shut() ? `<button class="opt night-lock" data-night="1">${IC().lock}<span><b>Spieleabend</b><small>Mit kostenlosem Konto: Punkte über mehrere Spiele sammeln</small></span><em class="rtag">Konto</em></button>`
      : `<button class="opt" data-night="1">${IC().trophy}<span><b>Spieleabend</b><small>Punkte über mehrere Spiele sammeln. Wer gewinnt den Abend?</small></span></button>`;
  }
  // the big card on the start page ("Zusammen spielen"): a little scoreboard as its picture, who leads when it runs
  function card() {
    const n = get(), on = active(), lock = !on && shut();
    // (the leader's name is its own element, so js/i18n.js translates the sentence and leaves the name alone)
    const t = on ? table(n) : null, games = on ? `<span>${n.rounds.length} ${n.rounds.length === 1 ? 'Partie' : 'Partien'}</span>` : '';
    const lead = !on ? '' : !n.rounds.length ? 'Noch keine Partie eingetragen' : t[0].n === (t[1] && t[1].n) ? `Gleichstand mit ${t[0].n}` : `<b translate="no">${esc(t[0].p)}</b> führt mit ${t[0].n}`;
    const sub = on ? `${lead} · ${games}` : lock ? 'Mit kostenlosem Konto: Punkte über mehrere Spiele sammeln' : 'Punkte über mehrere Spiele. Wer gewinnt den Abend?';
    return `<button class="tgc tgc-n${on ? ' live' : ''}${lock ? ' lockd' : ''}" data-night="1">
      <i class="tgc-pic" aria-hidden="true"><i></i><i></i><i></i></i>
      <span class="tgc-tx"><em class="tgc-k">${on ? 'Läuft' : lock ? 'Mit Konto' : 'Mit Freunden'}</em><b>Spieleabend</b><small>${sub}</small></span>
      <span class="tgc-go">${on ? IC().fwd : lock ? IC().lock : IC().plus}</span></button>`;
  }
  function wire(b) { b.querySelectorAll('[data-night]').forEach(x => x.onclick = () => { V.sfx.ui(); open(); }); }
  function refreshHome() { document.querySelectorAll('[data-night]').forEach(x => { const t = document.createElement('div'); t.innerHTML = x.classList.contains('tgc') ? card() : row(); const nx = t.firstElementChild; x.replaceWith(nx); wire(nx.parentNode); }); }

  // ---------- the dialog: set up, standings, end ----------
  function open() { if (shut()) { V.ui.toast('Der Spieleabend braucht ein kostenloses Konto'); return V.ui.home('profile'); } return active() ? standings() : setupNight(); }

  function setupNight(adding) {
    const n = get();
    const names = adding ? [] : S().get('nightNames', []).slice(0, MAX);
    while (names.length < 2 && !adding) names.push('');
    if (adding) names.push('');
    const field = (v, k) => `<div class="nt-in"><input class="inp" maxlength="12" data-i="${k}" value="${esc(v)}" placeholder="Name ${k + 1}" autocomplete="off" spellcheck="false" enterkeyhint="next"><button class="iconbtn" type="button" data-del="${k}" aria-label="Entfernen">${IC().x}</button></div>`;
    const m = V.ui.openModal(`<form class="fadd night" id="ntf">
      <div class="fadd-h"><h3>${adding ? 'Mitspieler dazu' : 'Spieleabend'}</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      ${adding ? '' : `<ol class="nt-how"><li><b>Namen eintragen</b><span>Alle, die heute mitspielen, 2 bis 8 Personen.</span></li><li><b>Spielen, was ihr wollt</b><span>Jedes Spiel zählt: zu zweit am Gerät, online oder gegen die KI.</span></li><li><b>Punkt vergeben</b><span>Nach jeder Partie tippt ihr auf dem Ergebnis-Bildschirm an, wer gewonnen hat. Online-Gegner mit gleichem Namen bekommen den Punkt automatisch.</span></li><li><b>Sieger des Abends</b><span>Wer am Ende die meisten Punkte hat, gewinnt. Die Tabelle bleibt nur auf diesem Gerät.</span></li></ol>`}
      <div class="nt-list" id="ntl">${names.map(field).join('')}</div>
      ${adding ? '' : `<button class="btn ghost sm" type="button" id="ntadd"><span>${IC().plus}Person dazu</span></button>`}
      <p class="aerr" id="nte"></p>
      <div class="actions"><button class="btn primary" type="submit"><span>${adding ? 'Hinzufügen' : 'Los geht’s'}</span></button><button class="btn ghost" type="button" id="ntc"><span>Abbrechen</span></button></div></form>`, 'faddm');
    const list = m.querySelector('#ntl'), err = t => { m.querySelector('#nte').textContent = t; };
    const vals = () => [...list.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
    const rewire = () => {
      list.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { if (list.children.length > (adding ? 1 : 2)) { x.parentNode.remove(); V.sfx.ui(); } else x.previousElementSibling.value = ''; });
      list.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') { const nx = i.parentNode.nextElementSibling; if (nx) { e.preventDefault(); nx.querySelector('input').focus(); } } });
    };
    rewire();
    const add = m.querySelector('#ntadd');
    if (add) add.onclick = () => {
      if (list.children.length >= MAX) return err(`Höchstens ${MAX} Personen.`);
      list.insertAdjacentHTML('beforeend', field('', list.children.length)); rewire(); V.sfx.ui();
      list.lastElementChild.querySelector('input').focus();
    };
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelector('#ntc').onclick = () => adding ? standings() : V.ui.closeModal();
    m.querySelector('#ntf').onsubmit = e => {
      e.preventDefault();
      const got = vals(), all = adding ? n.people.concat(got) : got;
      const low = all.map(x => x.toLowerCase());
      if (low.some((x, k) => low.indexOf(x) !== k)) return err('Jeder Name nur einmal.');
      if (all.length > MAX) return err(`Höchstens ${MAX} Personen.`);
      if (adding) { if (!got.length) return err('Schreib einen Namen.'); n.people = all; put(n); }
      else {
        if (got.length < 2) return err('Mindestens zwei Namen.');
        put({ people: got, rounds: [], at: Date.now() }); S().set('nightNames', got);
      }
      V.sfx.ui(); refreshHome(); standings();
    };
    if (!V.coarse) setTimeout(() => { const i = list.querySelector('input'); if (i) i.focus(); }, 60);
  }

  function standings() {
    const n = get(); if (!n) return;
    const t = table(n), top = t[0] ? t[0].n : 0, max = Math.max(1, top);
    const since = new Date(n.at).toLocaleTimeString(V.locale(), { hour: '2-digit', minute: '2-digit' });
    const m = V.ui.openModal(`<div class="fadd night">
      <div class="fadd-h"><h3>Spieleabend</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint">Seit ${since} · ${n.rounds.length} ${n.rounds.length === 1 ? 'Partie' : 'Partien'} · ${esc(leadText(n))}</p>
      <div class="nt-tab">${t.map((r, k) => `<div class="nt-row${r.n === top && top ? ' lead' : ''}"><b class="nt-rk">${k && r.n === t[k - 1].n ? '' : k + 1}</b><span class="nt-nm">${esc(r.p)}</span><i class="nt-bar" style="--w:${Math.round(r.n / max * 100)}%"></i><b class="nt-pt">${r.n}</b></div>`).join('')}</div>
      ${n.rounds.length ? `<h4 class="nt-h">Zuletzt</h4><div class="nt-log">${n.rounds.slice(-6).reverse().map(r => `<div><span>${V.byId[r.g] ? esc(V.byId[r.g].name) : 'Partie'}</span><b>${r.w ? esc(r.w) : 'kein Punkt'}</b></div>`).join('')}</div>` : '<p class="muted nt-empty">Noch kein Punkt. Spielt eine beliebige Partie. Danach erscheinen auf dem Ergebnis-Bildschirm eure Namen: einfach antippen, wer gewonnen hat. Ein zweiter Tipp nimmt den Punkt zurück.</p>'}
      <div class="nt-btns">
        ${n.rounds.length ? `<button class="btn ghost sm" id="ntundo"><span>${IC().undo}Letzte löschen</span></button>` : ''}
        ${n.people.length < MAX ? `<button class="btn ghost sm" id="ntmore"><span>${IC().plus}Mitspieler</span></button>` : ''}
        <button class="btn ghost sm" id="nthand"><span>${IC().plus}Punkt von Hand</span></button></div>
      <div class="actions"><button class="btn primary" id="ntgo"><span>${IC().play}Weiterspielen</span></button><button class="btn ghost" id="ntend"><span>Abend beenden</span></button></div></div>`, 'faddm');
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelector('#ntgo').onclick = () => { V.ui.closeModal(); if (V.ui.view() !== 'home') V.ui.home('games'); };
    const u = m.querySelector('#ntundo'); if (u) u.onclick = () => { n.rounds.pop(); put(n); V.sfx.ui(); refreshHome(); standings(); };
    const mo = m.querySelector('#ntmore'); if (mo) mo.onclick = () => setupNight(true);
    // a game played somewhere else (cards on the table, a game outside Versus)
    m.querySelector('#nthand').onclick = () => {
      const pm = V.ui.openModal(`<div class="fadd night"><div class="fadd-h"><h3>Wer bekommt den Punkt?</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
        <div class="nt-pick">${n.people.map(p => `<button class="btn sm" data-who="${esc(p)}"><span>${esc(p)}</span></button>`).join('')}</div>
        <div class="actions"><button class="btn ghost" id="ntback"><span>Zurück</span></button></div></div>`, 'faddm');
      pm.querySelector('#fclose').onclick = standings; pm.querySelector('#ntback').onclick = standings;
      pm.querySelectorAll('[data-who]').forEach(x => x.onclick = () => { n.rounds.push({ g: '', w: x.dataset.who, at: Date.now() }); put(n); V.sfx.goal(); refreshHome(); standings(); });
    };
    m.querySelector('#ntend').onclick = () => {
      const b = m.querySelector('#ntend');
      if (!b.classList.contains('danger')) { b.classList.add('danger'); b.querySelector('span').textContent = 'Wirklich beenden?'; return; }
      finale(n);
    };
  }

  // the end of the night: podium, a text to share, then the table is gone
  function finale(n) {
    const t = table(n), win = t[0] && t[0].n && t[0].n !== (t[1] && t[1].n) ? t[0] : null;
    put(null); refreshHome();
    const text = (V.lang === 'en' ? 'Game night on Versus' : 'Spieleabend bei Versus') + ':\n' + t.map((r, k) => `${k + 1}. ${r.p} ${r.n}`).join('\n') + '\nhttps://bananemdnaa.github.io/versus/';
    const m = V.ui.openModal(`<div class="fadd night fin">
      <div class="nt-crown">${IC().trophy}</div>
      <h3>${win ? esc(win.p) + ' gewinnt den Abend!' : n.rounds.length ? 'Unentschieden an der Spitze!' : 'Spieleabend beendet'}</h3>
      <div class="nt-tab">${t.map((r, k) => `<div class="nt-row${k === 0 && win ? ' lead' : ''}"><b class="nt-rk">${k + 1}</b><span class="nt-nm">${esc(r.p)}</span><b class="nt-pt">${r.n}</b></div>`).join('')}</div>
      <div class="actions">${n.rounds.length ? `<button class="btn primary" id="ntshare"><span>${IC().share}Ergebnis teilen</span></button>` : ''}<button class="btn ghost" id="ntok"><span>Fertig</span></button></div></div>`, 'faddm');
    if (win) { V.sfx.win(); setTimeout(() => V.fx.confetti(), 200); }
    m.querySelector('#ntok').onclick = V.ui.closeModal;
    const sh = m.querySelector('#ntshare');
    if (sh) sh.onclick = async () => {
      try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); V.ui.toast('Kopiert'); } } catch (e) { }
    };
  }

  // ---------- after a game: who gets the point ----------
  // A row of name buttons above the end screen's actions. winnerName (the name on the winner's card) gets the point
  // at once when it is one of the night's names (online opponents, your own account); a second tap takes it back.
  function endPick(modal, gid, winnerName) {
    const n = get(); if (!n || !modal) return;
    const auto = winnerName && n.people.find(p => p.toLowerCase() === String(winnerName).toLowerCase());
    let idx = -1;
    const set = who => {
      if (idx >= 0 && (!who || n.rounds[idx].w === who)) { n.rounds.splice(idx, 1); idx = -1; }
      else if (idx >= 0) n.rounds[idx].w = who;
      else if (who) { n.rounds.push({ g: gid, w: who, at: Date.now() }); idx = n.rounds.length - 1; }
      put(n); draw();
    };
    const box = V.el('div', 'nt-end');
    const draw = () => {
      const cur = idx >= 0 ? n.rounds[idx].w : '';
      box.innerHTML = `<span class="nt-k">${IC().trophy}Spieleabend · Punkt für</span><div class="nt-pick">${n.people.map(p => `<button class="${cur === p ? 'on' : ''}" data-who="${esc(p)}">${esc(p)}</button>`).join('')}</div>`;
      box.querySelectorAll('[data-who]').forEach(x => x.onclick = () => { V.sfx.ui(); set(x.dataset.who); refreshHome(); });
    };
    if (auto) { n.rounds.push({ g: gid, w: auto, at: Date.now() }); idx = n.rounds.length - 1; put(n); }
    draw();
    const at = modal.querySelector('.actions'); at.parentNode.insertBefore(box, at);
  }

  V.night = { active, row, card, wire, open, endPick };
})();
