// Versus: feedback from inside the app (bug, idea, something else). Works without an account; the team reads it
// in the admin panel (tab "Feedback"). Version, language, device type and the last game go along to help with bugs.
(function () {
  'use strict';
  const IC = () => V.ui.IC;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KINDS = [['bug', 'Problem'], ['idea', 'Idee'], ['other', 'Sonstiges']];

  function open(kind) {
    if (!V.cloud || !V.cloud.available()) return V.ui.toast('Feedback braucht eine Verbindung zum Server');
    if (navigator.onLine === false) return V.ui.toast('Du bist offline');
    // the game on screen, otherwise the last one played
    const cur = document.querySelector('.view.play'), gid = (cur && cur.dataset.g) || V._.S.get('recent') || '';
    const g = V.byId[gid];
    let k = kind || '';
    const m = V.ui.openModal(`<form class="fadd fbf" id="fbf">
      <div class="fadd-h"><h3>Feedback</h3><button class="iconbtn" type="button" id="fclose" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint">Ein Fehler, eine Idee oder etwas anderes? Das Team liest alles. Für Antworten schau auf Discord vorbei.</p>
      <div class="repr" id="fbk">${KINDS.map(([x, l]) => `<button type="button" data-k="${x}" class="${x === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <textarea class="inp" id="fbt" maxlength="1000" rows="5" placeholder="Was ist passiert, oder was wünschst du dir?"></textarea>
      ${g ? `<label class="repb"><input type="checkbox" id="fbg" checked> <span>Es geht um ${esc(g.name)}</span></label>` : ''}
      <p class="fine">Mit geschickt werden die Version, die Sprache und ob Handy oder Computer. Keine Namen, keine Adressen.</p>
      <p class="aerr" id="fbe"></p>
      <div class="actions"><button class="btn primary" type="submit"><span>Senden</span></button><button class="btn ghost" type="button" id="fbc"><span>Abbrechen</span></button></div></form>`, 'faddm');
    const err = t => { m.querySelector('#fbe').textContent = t; };
    m.querySelector('#fclose').onclick = V.ui.closeModal;
    m.querySelector('#fbc').onclick = V.ui.closeModal;
    m.querySelectorAll('[data-k]').forEach(x => x.onclick = () => { k = x.dataset.k; V.sfx.ui(); m.querySelectorAll('[data-k]').forEach(y => y.classList.toggle('on', y === x)); err(''); });
    m.querySelector('#fbf').onsubmit = async e => {
      e.preventDefault();
      const txt = m.querySelector('#fbt').value.trim();
      if (!k) return err('Wähl bitte, worum es geht.');
      if (txt.length < 3) return err('Schreib bitte ein paar Worte mehr.');
      const btn = m.querySelector('[type=submit]'); btn.classList.add('busy');
      const gb = m.querySelector('#fbg');
      const meta = { v: String(V.VERSION || ''), lang: V.lang || 'de', dev: V.coarse ? 'touch' : 'desktop', mode: matchMedia('(display-mode: standalone)').matches ? 'app' : 'web', discord: V.discord && V.discord.on ? '1' : '' };
      try {
        await V.cloud.rpc('send_feedback', { kind: k, txt, game: gb && gb.checked ? g.id : null, meta });
        V.ui.closeModal(); V.ui.toast('Danke! Dein Feedback ist beim Team', 2200); V.sfx.ui();
      } catch (x) { btn.classList.remove('busy'); err(/send_feedback|function/i.test(x.message) ? 'Feedback kommt nach dem nächsten Server-Update.' : x.message); V.sfx.bad(); }
    };
    setTimeout(() => { const t = m.querySelector(k ? '#fbt' : '#fbk button'); if (t && !V.coarse) t.focus(); }, 60);
  }

  V.feedback = { open };
})();
