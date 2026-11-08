// Versus: the country flag next to a player's name. Set once by itself from the device (time zone, language), a player
// can change or remove it in the account tab or the own profile; it is stored on the server (profiles.flag, set_flag)
// and read in batches with flags_of. The pictures are the real flags from flag-icons (MIT licence, icons/flags/, one
// SVG per country, loaded only when shown; Windows has no flag emoji). They wave with CSS (.vflag in app.css).
// Anywhere a name is shown, V.flag.tag(name) leaves an empty <i class="vflag">; an observer fills it.
// Server side: supabase/migrations/20261129000000_flags_surveys.sql.
(function () {
  'use strict';
  const IC = () => V.ui.IC;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // the countries with a picture in icons/flags (ISO codes; EU and UN as extra choices)
  const F = {};
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CP CR CU CV CW CX CY CZ DE DG DJ DK DM DO DZ EC EE EG EH ER ES ET EU FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU IC ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PC PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM UN US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ').forEach(c => { F[c] = 1; });
  const svg = c => F[c] ? `<img src="icons/flags/${c.toLowerCase()}.svg" alt="" draggable="false" decoding="async">` : '';
  // country names in the player's language (the browser knows them); "UN" is our own "world" choice
  let dn = null, dnLang = '';
  const cname = c => {
    if (c === 'UN') return V.lang === 'en' ? 'World' : 'Welt';
    try { if (!dn || dnLang !== V.lang) { dn = new Intl.DisplayNames([V.lang === 'en' ? 'en' : 'de'], { type: 'region' }); dnLang = V.lang; } return dn.of(c) || c; } catch (e) { return c; }
  };

  // ---------- who has which flag ----------
  const cache = new Map();    // name -> code ('' = none), for this visit
  // guests get a small "Gast" badge after the flag (same batch request, server: guests_of); everybody sees it,
  // so nobody wonders why a friend request to them does not work
  const guests = new Set();
  const want = new Set();
  let timer = null;
  const me = () => { const u = V.cloud && V.cloud.user(); return u ? u.username : ''; };
  function paint(el) {
    const c = cache.get(el.dataset.fl);
    if (c === undefined) return false;
    el.dataset.ok = c;
    el.innerHTML = svg(c);
    if (c && F[c]) { el.title = cname(c); el.setAttribute('role', 'img'); el.setAttribute('aria-label', cname(c)); }
    else { el.removeAttribute('title'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
    // every flag starts its wave at a different moment, so a list of names does not flap in step
    el.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
    const nx = el.nextElementSibling, has = nx && nx.classList.contains('gtag');
    if (guests.has(el.dataset.fl) && !has) el.insertAdjacentHTML('afterend', `<em class="gtag" title="${V.t('Spielt noch ohne Konto')}">${V.t('Gast')}</em>`);
    else if (!guests.has(el.dataset.fl) && has) nx.remove();
    return true;
  }
  function scan(root) {
    (root || document).querySelectorAll('.vflag[data-fl]:not([data-ok])').forEach(el => { if (!paint(el)) want.add(el.dataset.fl); });
    if (want.size && !timer) timer = setTimeout(fetchSome, 120);
  }
  async function fetchSome() {
    timer = null;
    const names = [...want].slice(0, 100); names.forEach(x => want.delete(x));
    if (!names.length) return;
    let got = {};
    if (V.cloud && V.cloud.available() && navigator.onLine !== false) {
      try { got = (await V.cloud.rpc('flags_of', { names })) || {}; } catch (e) { names.forEach(x => cache.delete(x)); return; }
      // (missing until the migration 20261209000000_guest_friends.sql is in: then simply no badges)
      try { ((await V.cloud.rpc('guests_of', { names })) || []).forEach(n => guests.add(n)); } catch (e) { }
    }
    names.forEach(x => cache.set(x, got[x] || ''));
    document.querySelectorAll('.vflag[data-fl]:not([data-ok])').forEach(paint);
    if (want.size) scan();
  }
  // the placeholder: <i class="vflag" data-fl="name"></i>; empty until the flag is known (and stays empty without one)
  const isGuest = name => guests.has(String(name || '').trim().toLowerCase());
  const tag = name => name ? `<i class="vflag" data-fl="${esc(String(name).trim().toLowerCase())}"></i>` : '';
  function set(name, c) {
    const k = String(name).trim().toLowerCase();
    cache.set(k, c || '');
    document.querySelectorAll(`.vflag[data-fl="${CSS.escape(k)}"]`).forEach(el => { el.removeAttribute('data-ok'); paint(el); });
  }
  const mine = () => { const k = me(); return k && cache.has(k) ? cache.get(k) : V.store.get('flag', ''); };

  // ---------- picker ----------
  function picker() {
    const u = V.cloud && V.cloud.user();
    if (!u) return V.ui.toast('Dafür brauchst du ein Konto');
    let cur = mine() || '';
    // the device's country first, then the rest by name
    const reg = guess();
    const all = Object.keys(F).filter(c => c !== 'UN' && cname(c) !== c).sort((a, b) => cname(a).localeCompare(cname(b), V.lang === 'en' ? 'en' : 'de'));
    const m = V.ui.openModal(`<div class="flp">
      <div class="fadd-h"><h3>Deine Flagge</h3><button class="iconbtn" id="flx" aria-label="Schließen">${IC().x}</button></div>
      <p class="fhint">Sie weht neben deinem Namen, in Partien, bei Freunden und in der Rangliste. Am Anfang passend zu deinem Gerät, hier kannst du sie ändern oder entfernen.</p>
      <input class="inp" id="flq" placeholder="Land suchen" autocomplete="off" spellcheck="false">
      <div class="flg" id="flg"></div>
      <p class="aerr" id="fle"></p>
      <div class="actions"><button class="btn ghost" id="fln"><span>Keine Flagge</span></button></div></div>`, 'flm');
    const grid = m.querySelector('#flg');
    const row = c => `<button data-c="${c}" class="${c === cur ? 'on' : ''}"><i class="vflag still">${svg(c)}</i><span>${esc(cname(c))}</span></button>`;
    const draw = q => {
      const s = (q || '').trim().toLowerCase();
      const list = all.filter(c => !s || cname(c).toLowerCase().includes(s) || c.toLowerCase() === s);
      const top = !s ? [reg, cur].filter((c, i, a) => c && a.indexOf(c) === i) : [];
      grid.innerHTML = (top.length ? top.map(row).join('') + '<hr>' : '') + list.filter(c => !top.includes(c)).map(row).join('') + (!s || 'welt world'.includes(s) ? row('UN') : '') || '<p class="muted">Kein Land gefunden.</p>';
      grid.querySelectorAll('[data-c]').forEach(b => b.onclick = () => save(b.dataset.c));
    };
    async function save(c) {
      m.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        const r = await V.cloud.rpc('set_flag', { f: c || null });
        V.store.set('flag', r || '', true); set(u.username, r || '');
        V.ui.closeModal(); V.ui.toast(r ? 'Deine Flagge weht jetzt' : 'Flagge entfernt'); V.sfx.ui();
        document.dispatchEvent(new CustomEvent('versus-look'));
      } catch (e) {
        m.querySelectorAll('button').forEach(b => b.disabled = false);
        m.querySelector('#fle').textContent = /set_flag|function/i.test(e.message) ? 'Flaggen kommen nach dem nächsten Server-Update.' : e.message; V.sfx.bad();
      }
    }
    m.querySelector('#flq').oninput = e => draw(e.target.value);
    m.querySelector('#flx').onclick = V.ui.closeModal;
    m.querySelector('#fln').onclick = () => save('');
    draw('');
    if (!V.coarse) setTimeout(() => { const q = m.querySelector('#flq'); if (q) q.focus(); }, 60);
  }

  // the country this device is in: its time zone first (where someone lives), else the region of the browser language
  // (de-AT -> AT). Nothing leaves the device for this, no location, no IP lookup.
  const TZ = { Berlin: 'DE', Busingen: 'DE', Vienna: 'AT', Zurich: 'CH', Amsterdam: 'NL', Brussels: 'BE', Luxembourg: 'LU', Paris: 'FR', Rome: 'IT', Madrid: 'ES', Canary: 'ES',
    Lisbon: 'PT', Dublin: 'IE', London: 'GB', Warsaw: 'PL', Prague: 'CZ', Bratislava: 'SK', Budapest: 'HU', Bucharest: 'RO', Sofia: 'BG', Zagreb: 'HR', Ljubljana: 'SI',
    Belgrade: 'RS', Sarajevo: 'BA', Athens: 'GR', Istanbul: 'TR', Kyiv: 'UA', Kiev: 'UA', Moscow: 'RU', Vilnius: 'LT', Riga: 'LV', Tallinn: 'EE', Copenhagen: 'DK',
    Stockholm: 'SE', Oslo: 'NO', Helsinki: 'FI', Reykjavik: 'IS', Tirane: 'AL', Skopje: 'MK', Podgorica: 'ME', Chisinau: 'MD', Minsk: 'BY', Nicosia: 'CY', Malta: 'MT',
    Tbilisi: 'GE', Yerevan: 'AM', Baku: 'AZ', Almaty: 'KZ', Kabul: 'AF', Riyadh: 'SA', Dubai: 'AE', Tehran: 'IR', Baghdad: 'IQ', Damascus: 'SY', Jerusalem: 'IL',
    Cairo: 'EG', Casablanca: 'MA', Tunis: 'TN', Algiers: 'DZ', Lagos: 'NG', Accra: 'GH', Johannesburg: 'ZA', Karachi: 'PK', Kolkata: 'IN', Calcutta: 'IN',
    Bangkok: 'TH', Jakarta: 'ID', Manila: 'PH', Shanghai: 'CN', Tokyo: 'JP', Seoul: 'KR', Mexico_City: 'MX', Sao_Paulo: 'BR', Buenos_Aires: 'AR', Bogota: 'CO',
    Lima: 'PE', Santiago: 'CL', Toronto: 'CA', Vancouver: 'CA', Montreal: 'CA', Halifax: 'CA', Winnipeg: 'CA', Edmonton: 'CA', Auckland: 'NZ',
    Sydney: 'AU', Melbourne: 'AU', Brisbane: 'AU', Perth: 'AU', Adelaide: 'AU', Ho_Chi_Minh: 'VN', Saigon: 'VN' };
  function guess() {
    let z = ''; try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }
    const city = z.split('/').pop();
    if (TZ[city]) return TZ[city];
    if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana)/.test(z) || z === 'Pacific/Honolulu') return 'US';
    return ((navigator.languages || [navigator.language || '']).map(l => (String(l).split('-')[1] || '').toUpperCase()).find(r => F[r] && r !== 'UN')) || '';
  }
  // first login on this device: set the guessed flag. The server keeps a flag the player picked (or removed) themself.
  function auto() {
    const k = me(), c = guess(), done = V.store.get('flagAuto', []);
    if (!k || !c || done.includes(k) || !V.cloud.available()) return;
    V.cloud.rpc('set_flag', { f: c, auto: true }).then(r => {
      V.store.set('flagAuto', done.concat(k).slice(-10), true);
      if (r) { V.store.set('flag', r, true); set(k, r); }
    }, () => { });
  }

  // new names on screen: fill their flags (one batched request for all of them)
  addEventListener('load', () => {
    new MutationObserver(ms => { for (const x of ms) if (x.addedNodes.length) { scan(); break; } }).observe(document.body, { childList: true, subtree: true });
    scan();
    // a new login: forget what we knew about the own flag so it is read again, and set one if there is none yet
    if (V.cloud) { let who = null; V.cloud.on(() => { if (V.cloud.starting()) return; const k = me(); if (k !== who) { who = k; if (k) { cache.delete(k); scan(); auto(); } } }); }
  });

  V.flag = { F, svg, tag, set, mine, name: cname, picker, guess, auto, isGuest };
})();
