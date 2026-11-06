// Versus: voluntary surveys. The team writes one in the admin panel (tab "Umfragen") and starts it; players then get
// a bar like the announcement bar and can take part or not. Every question may stay empty. One answer per account,
// or per device without an account (a random device id). The team sees only the totals and the texts, no names.
// Server side: supabase/migrations/20261129000000_flags_surveys.sql.
(function () {
  'use strict';
  const IC = () => V.ui.IC, S = () => V.store;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TYPES = { one: 'Eine Antwort', many: 'Mehrere Antworten', scale: 'Skala 1 bis 5', text: 'Freier Text' };

  // a random id for this browser, so a player without an account answers only once
  function dev() {
    let d = S().get('dev', '');
    if (!/^[a-z0-9-]{8,40}$/.test(d)) { d = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)).toLowerCase(); S().set('dev', d, true); }
    return d;
  }
  // skipped surveys: "later" hides one for three days, "no thanks" for good
  const later = () => S().get('surveyLater', {}), never = () => S().get('surveyNo', []);
  const hidden = id => never().includes(id) || (later()[id] || 0) > Date.now();
  function skip(id, forGood) {
    if (forGood) S().set('surveyNo', never().concat(id).slice(-30), true);
    else { const l = later(); l[id] = Date.now() + 3 * 864e5; S().set('surveyLater', l, true); }
  }

  // ---------- the bar ----------
  let at = 0, cur = null;
  function check(force) {
    if (!V.cloud || !V.cloud.available() || V.cloud.starting() || navigator.onLine === false) return;
    if (!force && Date.now() - at < 600000) return;
    at = Date.now();
    V.cloud.rpc('survey_current', { l: V.lang || 'de', dev: dev() }).then(s => { cur = s && s.id ? s : null; bar(); }, () => { at = 0; });
  }
  function bar() {
    const old = document.querySelector('.upbar.svb');
    if (!cur || hidden(cur.id)) { if (old) old.remove(); return; }
    // one bar at a time: an update or an announcement goes first, the survey waits for the next look
    if (old || document.querySelector('.upbar') || (V.ui.view && V.ui.view() === 'play')) return;
    const b = V.el('div', 'upbar svb', `${IC().chart}<span><b>Kurze Umfrage</b><small class="svt"></small></span><button class="btn primary sm" id="svgo"><span>Mitmachen</span></button><button class="x" aria-label="Später">${IC().x}</button>`);
    const t = b.querySelector('.svt'); t.textContent = cur.title; t.setAttribute('translate', 'no');
    document.body.appendChild(b);
    const out = () => { b.classList.add('out'); setTimeout(() => b.remove(), 250); };
    b.querySelector('#svgo').onclick = () => { const s = cur; cur = null; out(); open(s); };
    b.querySelector('.x').onclick = () => { skip(cur.id); out(); V.ui.toast('Die Umfrage kommt in ein paar Tagen nochmal'); };
  }

  // ---------- taking part ----------
  function open(s) {
    const ans = s.questions.map(q => q.t === 'many' ? [] : null);
    const q1 = (q, i) => {
      const head = `<h4><span class="svn">${i + 1}</span><span class="svq"></span></h4>`;
      if (q.t === 'text') return `<div class="svi" data-i="${i}">${head}<textarea class="inp" data-tx="${i}" rows="3" maxlength="500" placeholder="Deine Antwort (freiwillig)"></textarea></div>`;
      if (q.t === 'scale') return `<div class="svi" data-i="${i}">${head}<div class="svs">${[1, 2, 3, 4, 5].map(k => `<button type="button" data-v="${k}" aria-label="${k} von 5">${k}</button>`).join('')}</div><div class="svsl"><small>gar nicht</small><small>sehr</small></div></div>`;
      return `<div class="svi" data-i="${i}">${head}${q.t === 'many' ? '<small class="svh">Mehrere möglich</small>' : ''}<div class="svo">${q.o.map((o, k) => `<button type="button" data-v="${k}"><i></i><span class="svot"></span></button>`).join('')}</div></div>`;
    };
    const m = V.ui.openModal(`<form class="svf" id="svf">
      <div class="fadd-h"><h3 class="svtt"></h3><button class="iconbtn" type="button" id="svx" aria-label="Schließen">${IC().x}</button></div>
      ${s.intro ? '<p class="fhint svin"></p>' : ''}
      ${s.questions.map(q1).join('')}
      <p class="fine">Freiwillig: Jede Frage darf leer bleiben. Die Antworten sieht nur das Team, ohne deinen Namen.</p>
      <p class="aerr" id="sve"></p>
      <div class="actions"><button class="btn primary" type="submit"><span>Absenden</span></button><button class="btn ghost" type="button" id="svno"><span>Nicht teilnehmen</span></button></div></form>`, 'svm');
    // the team's own words: never HTML, never translated
    const put = (el, t) => { if (el) { el.textContent = t; el.setAttribute('translate', 'no'); } };
    put(m.querySelector('.svtt'), s.title); put(m.querySelector('.svin'), s.intro || '');
    s.questions.forEach((q, i) => {
      const box = m.querySelector(`.svi[data-i="${i}"]`);
      put(box.querySelector('.svq'), q.q);
      box.querySelectorAll('.svot').forEach((el, k) => put(el, q.o[k]));
      box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        const k = +b.dataset.v;
        if (q.t === 'many') { const a = ans[i]; a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k); }
        else ans[i] = ans[i] === k ? null : k;   // a second tap takes the answer back
        box.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', q.t === 'many' ? ans[i].includes(+x.dataset.v) : ans[i] === +x.dataset.v));
        V.sfx.tick(); m.querySelector('#sve').textContent = '';
      });
    });
    m.querySelectorAll('[data-tx]').forEach(t => t.oninput = () => { ans[+t.dataset.tx] = t.value.trim() || null; });
    m.querySelector('#svx').onclick = () => { skip(s.id); V.ui.closeModal(); };
    m.querySelector('#svno').onclick = () => { skip(s.id, true); cur = null; V.ui.closeModal(); V.ui.toast('Alles klar, keine Umfrage'); };
    m.querySelector('#svf').onsubmit = async e => {
      e.preventDefault();
      const a = ans.map(x => Array.isArray(x) ? (x.length ? x.slice().sort((p, q) => p - q) : null) : x);
      if (!a.some(x => x != null)) { m.querySelector('#sve').textContent = 'Beantworte mindestens eine Frage.'; return V.sfx.bad(); }
      const btn = m.querySelector('[type=submit]'); btn.classList.add('busy');
      try {
        await V.cloud.rpc('survey_answer', { sid: s.id, dev: dev(), a });
        cur = null; V.ui.closeModal(); V.ui.toast('Danke fürs Mitmachen!', 2200); V.sfx.ui();
        setTimeout(() => check(true), 1500);   // maybe there is another one
      } catch (x) { btn.classList.remove('busy'); m.querySelector('#sve').textContent = x.message; V.sfx.bad(); }
    };
  }

  // ---------- admin tab ----------
  let list = null, err = '', edit = null, res = {}, open1 = null, sure = '', host = null, busy = false;
  const LANGS = [['', 'Alle'], ['de', 'Deutsch'], ['en', 'Englisch']];
  const ST = { draft: ['Entwurf', ''], live: ['Läuft', 'good'], closed: ['Beendet', 'muted'] };
  const day = d => d ? new Date(d).toLocaleDateString(V.locale(), { day: 'numeric', month: 'short' }) : '';
  async function load() {
    try { list = await V.cloud.rpc('admin_surveys'); err = ''; }
    catch (e) { err = /admin_surveys|function/i.test(e.message) ? 'Umfragen kommen nach dem nächsten Server-Update (Migration 20261129000000_flags_surveys.sql).' : e.message; list = list || []; }
    draw();
  }
  async function results(id) {
    try { res[id] = await V.cloud.rpc('admin_survey_results', { sid: id }); } catch (e) { err = e.message; }
    draw();
  }
  async function act(fn, ok) {
    if (busy) return; busy = true;
    try { await fn(); if (ok) V.ui.toast(ok); sure = ''; err = ''; await load(); }
    catch (e) { err = e.message; V.sfx.bad(); draw(); }
    busy = false;
  }
  function admin(el) {
    host = el; if (!el) return;
    if (!list) { el.innerHTML = V.skel(); load(); return; }
    draw();
  }
  function bars(q, r) {
    const tot = r.n || 0;
    if (q.t === 'text') return (r.r || []).length ? `<div class="svtx">${r.r.map(t => `<p translate="no">${esc(t)}</p>`).join('')}</div>` : '<p class="muted">Noch keine Texte.</p>';
    const labels = q.t === 'scale' ? ['1', '2', '3', '4', '5'] : q.o;
    const max = Math.max(1, ...(r.r || []));
    const avg = q.t === 'scale' && tot ? (r.r.reduce((s, c, k) => s + c * (k + 1), 0) / tot).toFixed(1).replace('.', V.lang === 'en' ? '.' : ',') : '';
    return `<div class="svbar">${labels.map((l, k) => { const c = (r.r || [])[k] || 0; return `<div class="svb-r"><span class="svb-l" translate="no">${esc(l)}</span><span class="svb-t"><i style="width:${c / max * 100}%"></i></span><b>${c}</b><small>${tot ? Math.round(c / tot * 100) : 0} %</small></div>`; }).join('')}</div>${avg ? `<p class="fine">Schnitt ${avg} von 5</p>` : ''}`;
  }
  function editor() {
    const e = edit;
    return `<div class="acard sved">
      <h3>${e.id ? 'Umfrage bearbeiten' : 'Neue Umfrage'}</h3>
      <label>Titel</label><input class="inp" id="sv_t" maxlength="80" placeholder="z. B. Wie gefällt dir Versus?" value="${esc(e.title)}">
      <label>Einleitung (freiwillig)</label><textarea class="inp" id="sv_i" maxlength="300" rows="2" placeholder="Ein Satz, worum es geht">${esc(e.intro)}</textarea>
      <label>Für</label><div class="chips mini">${LANGS.map(([k, l]) => `<button data-svl="${k}" class="${e.lang === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <p class="fine">Die Texte werden nicht übersetzt. Für Englisch am besten eine eigene Umfrage nur für Englisch anlegen.</p>
      ${e.qs.map((q, i) => `<div class="svq-e">
        <div class="svq-h"><b>Frage ${i + 1}</b><button class="iconbtn sm" data-svdel="${i}" aria-label="Frage ${i + 1} entfernen" title="Entfernen">${IC().x}</button></div>
        <input class="inp" data-svq="${i}" maxlength="200" placeholder="Frage" value="${esc(q.q)}">
        <div class="chips mini">${Object.entries(TYPES).map(([k, l]) => `<button data-svt="${i}" data-k="${k}" class="${q.t === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${q.t === 'one' || q.t === 'many' ? `<textarea class="inp" data-svo="${i}" rows="3" placeholder="Antworten, eine pro Zeile (2 bis 8)">${esc((q.o || []).join('\n'))}</textarea>` : ''}</div>`).join('')}
      ${e.qs.length < 10 ? `<button class="btn ghost sm" id="sv_add"><span>${IC().plus}Frage hinzufügen</span></button>` : ''}
      <div class="actions"><button class="btn primary" id="sv_go"><span>Speichern und starten</span></button><button class="btn" id="sv_save"><span>Als Entwurf speichern</span></button><button class="btn ghost" id="sv_x"><span>Abbrechen</span></button></div></div>`;
  }
  function draw() {
    const el = host; if (!el || !el.isConnected) return;
    const rows = (list || []).map(s => {
      const [stl, stc] = ST[s.status] || [s.status, ''];
      const r = open1 === s.id ? res[s.id] : null;
      const b = (k, l, cls = '') => `<button class="btn sm ${cls}" data-sv="${k}" data-id="${s.id}"><span>${l}</span></button>`;
      const btns = [
        s.status !== 'draft' ? b('res', open1 === s.id ? 'Ergebnisse zu' : 'Ergebnisse', open1 === s.id ? '' : 'primary') : '',
        s.status === 'draft' ? b('edit', 'Bearbeiten') : '',
        s.status === 'draft' ? b('live', 'Starten', 'primary') : s.status === 'closed' ? b('live', 'Wieder starten', 'ghost') : b('closed', 'Beenden'),
        s.status !== 'live' ? (sure === 'del:' + s.id ? b('del', 'Wirklich löschen?', 'ghost danger') : b('sure', 'Löschen', 'ghost')) : ''
      ].join('');
      return `<div class="mrow svrow${s.status === 'live' ? ' live' : ''}">
        <div class="m-t"><b><span translate="no">${esc(s.title)}</span> <em class="rtag ${stc}">${stl}</em>${s.lang ? ` <em class="rtag">${s.lang.toUpperCase()}</em>` : ''}</b>
          <small>${s.n === 1 ? '1 Antwort' : s.n + ' Antworten'} · ${s.questions.length === 1 ? '1 Frage' : s.questions.length + ' Fragen'}${s.started ? ' · seit ' + day(s.started) : ' · angelegt ' + day(s.at)}${s.closed && s.status === 'closed' ? ' · bis ' + day(s.closed) : ''}${s.by ? ' · von ' + esc(s.by) : ''}</small></div>
        <div class="m-a">${btns}</div>
        ${open1 === s.id ? `<div class="svres">${r ? `<p class="fine">${r.n} Antworten, davon ${r.accounts} mit Konto oder als Gast.</p>` + s.questions.map((q, i) => `<section><h4 translate="no">${i + 1}. ${esc(q.q)}</h4><small class="muted">${TYPES[q.t]} · ${r.questions[i].n} beantwortet</small>${bars(q, r.questions[i])}</section>`).join('') : V.skel(2)}</div>` : ''}</div>`;
    }).join('');
    el.innerHTML = (err ? `<p class="aerr big">${esc(err)}</p>` : '') +
      (edit ? editor() : `<div class="asearch"><button class="btn primary sm" id="sv_new"><span>${IC().plus}Neue Umfrage</span></button><button class="btn ghost sm" id="sv_rl"><span>${IC().redo}</span></button></div>
      <p class="fine">Eine laufende Umfrage erscheint als Banner. Mitmachen ist freiwillig, jede Frage darf leer bleiben. Du siehst nur die Summen und die Texte, keine Namen.</p>`) +
      (list ? rows || '<p class="muted">Noch keine Umfrage.</p>' : V.skel());
    wire(el);
  }
  function fromInputs(el) {
    if (!edit) return;
    const v = id => (el.querySelector(id) || {}).value;
    if (v('#sv_t') != null) edit.title = v('#sv_t');
    if (v('#sv_i') != null) edit.intro = v('#sv_i');
    el.querySelectorAll('[data-svq]').forEach(x => { edit.qs[+x.dataset.svq].q = x.value; });
    el.querySelectorAll('[data-svo]').forEach(x => { edit.qs[+x.dataset.svo].o = x.value.split('\n').map(t => t.trim()).filter(Boolean); });
  }
  function wire(el) {
    const on = (sel, fn) => el.querySelectorAll(sel).forEach(x => x.onclick = e => { e.preventDefault(); fn(x); });
    on('#sv_new', () => { edit = { id: null, title: '', intro: '', lang: V.lang === 'en' ? 'en' : 'de', qs: [{ q: '', t: 'scale', o: [] }] }; V.sfx.ui(); draw(); });
    on('#sv_rl', () => { V.sfx.ui(); load(); if (open1) results(open1); });
    on('[data-sv]', x => {
      const id = +x.dataset.id, s = list.find(y => y.id === id); V.sfx.ui();
      if (x.dataset.sv === 'res') { open1 = open1 === id ? null : id; if (open1) results(id); draw(); }
      if (x.dataset.sv === 'edit') { edit = { id, title: s.title, intro: s.intro || '', lang: s.lang, qs: s.questions.map(q => ({ q: q.q, t: q.t, o: (q.o || []).slice() })) }; draw(); }
      if (x.dataset.sv === 'live') act(() => V.cloud.rpc('admin_survey_status', { sid: id, st: 'live' }), 'Die Umfrage läuft. Spieler sehen jetzt das Banner.');
      if (x.dataset.sv === 'closed') act(() => V.cloud.rpc('admin_survey_status', { sid: id, st: 'closed' }), 'Die Umfrage ist beendet.');
      if (x.dataset.sv === 'sure') { sure = 'del:' + id; draw(); }
      if (x.dataset.sv === 'del') act(() => V.cloud.rpc('admin_survey_delete', { sid: id }), 'Umfrage gelöscht.');
    });
    if (!edit) return;
    el.querySelectorAll('.sved input, .sved textarea').forEach(x => x.addEventListener('input', () => fromInputs(el)));
    // structure changes redraw the editor; the typed text is read first so nothing gets lost
    on('[data-svl]', x => { fromInputs(el); edit.lang = x.dataset.svl; V.sfx.ui(); draw(); });
    on('[data-svt]', x => { fromInputs(el); const q = edit.qs[+x.dataset.svt]; q.t = x.dataset.k; if ((q.t === 'one' || q.t === 'many') && !q.o.length) q.o = []; V.sfx.ui(); draw(); });
    on('[data-svdel]', x => { fromInputs(el); edit.qs.splice(+x.dataset.svdel, 1); if (!edit.qs.length) edit.qs.push({ q: '', t: 'one', o: [] }); V.sfx.ui(); draw(); });
    on('#sv_add', () => { fromInputs(el); edit.qs.push({ q: '', t: 'one', o: [] }); V.sfx.ui(); draw(); const l = el.querySelectorAll('[data-svq]'); if (l.length) l[l.length - 1].focus(); });
    on('#sv_x', () => { edit = null; err = ''; V.sfx.ui(); draw(); });
    const save = start => {
      fromInputs(el);
      const e = edit, qs = e.qs.map(q => q.t === 'one' || q.t === 'many' ? { q: q.q.trim(), t: q.t, o: q.o } : { q: q.q.trim(), t: q.t });
      act(async () => {
        const id = await V.cloud.rpc('admin_survey_save', { sid: e.id, title: e.title.trim(), intro: e.intro.trim(), l: e.lang, qs });
        if (start) await V.cloud.rpc('admin_survey_status', { sid: id, st: 'live' });
        edit = null;
      }, start ? 'Die Umfrage läuft. Spieler sehen jetzt das Banner.' : 'Entwurf gespeichert.');
    };
    on('#sv_go', () => save(true));
    on('#sv_save', () => save(false));
  }

  // first look a little after the start (after the announcement), then whenever the app comes back to the front
  addEventListener('load', () => {
    if (!V.cloud) return;
    setTimeout(() => check(), 6000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    // a menu after a match: the bar may show now
    setInterval(() => { if (cur && !document.querySelector('.upbar')) bar(); }, 30000);
  });

  V.survey = { check, open, admin };
})();
