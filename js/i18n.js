// Versus: languages. Every screen is written in German; in English a MutationObserver translates the page on the way,
// before the browser paints it. The dictionary (js/lang/en.js) maps German text to English:
//   - whole text pieces ("Gegen KI" → "Vs. AI"),
//   - numbers as #  ("# Spiele" → "# games"; the numbers are filled back in order),
//   - elements with inline tags as {0}, {1} … ("{0} bist dran" → "{0} to move", the tags keep their colours),
//   - patterns for text with names in it (V.i18n.pat).
// Text without a translation simply stays German, so new screens never break.
(function () {
  'use strict';
  const st = V.settings;
  const auto = /^de\b/i.test(navigator.language || '') ? 'de' : 'en';
  // ?lang=de or ?lang=en in the address (embeds, links) wins over the setting for this visit, without saving it
  let ask = null; try { ask = new URLSearchParams(location.search).get('lang'); } catch (e) { }
  V.lang = ask === 'de' || ask === 'en' ? ask : st.lang === 'de' || st.lang === 'en' ? st.lang : auto;
  V.locale = () => (V.lang === 'en' ? 'en-GB' : 'de-DE');
  document.documentElement.lang = V.lang;

  const D = new Map(), PAT = [], CTX = [];
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const LETTER = /[A-Za-zÄÖÜäöüß]/;
  // numbers, but not the {0} placeholders of templates
  const NUM = /(?<!\{)\d+(?:[.,]\d+)?(?!\})/g;
  function look(s, el) {
    const n = norm(s);
    if (!n || !LETTER.test(n)) return null;
    // words that mean something else in one game ("Passen" is fold in poker, pass in Go)
    if (el && el.closest) for (const [sel, map] of CTX) if (map.has(n) && el.closest(sel)) return map.get(n);
    let r = D.get(n);
    if (r != null) return r;
    if (/\d/.test(n)) {
      const nums = n.match(NUM), k = n.replace(NUM, '#');
      r = D.get(k);
      if (r != null) { let i = 0; return r.replace(/#/g, () => (nums[i++] ?? '#')); }
    }
    for (const [re, rep] of PAT) if (re.test(n)) return n.replace(re, rep);
    if (MISS && /[a-zäöüß]{2}/.test(n)) MISS.add(n.replace(NUM, '#'));
    return null;
  }
  // for building the dictionary: localStorage versus.i18nlog = 1 collects every German text without a translation
  let MISS = null;
  try { if (localStorage.getItem('versus.i18nlog') === '1') MISS = new Set(); } catch (e) { }
  // keeps the spaces around a text piece (" bist dran" stays a piece with a leading space)
  function swap(s, el) {
    const r = look(s, el);
    if (r == null) return null;
    const lead = /^\s/.test(s) ? ' ' : '', trail = /\s$/.test(s) && !/\s$/.test(r) ? ' ' : '';
    return lead + r + trail;
  }
  const t = s => (V.lang === 'de' || s == null ? s : swap(String(s)) ?? s);
  V.t = t;
  V.i18n = {
    add(o) { for (const k in o) D.set(norm(k), o[k]); },
    // [RegExp, replacement] on the whole text; the replacement can be a function and use V.t for parts
    pat(list) { list.forEach(p => PAT.push(p)); },
    // translations that only apply inside elements matching the selector
    ctx(sel, o) { const m = new Map(); for (const k in o) m.set(norm(k), o[k]); CTX.push([sel, m]); },
    t
  };
  if (V.lang === 'de') return;

  // game names by id, because the same word can mean two things ("Dame" is checkers and the chess queen)
  const NAMES = {};
  V.i18n.names = o => Object.assign(NAMES, o);
  const reg = V.register;
  V.register = g => { if (NAMES[g.id]) g.name = NAMES[g.id]; reg(g); };

  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'svg', 'SVG', 'CANVAS']);
  const INLINE = new Set(['B', 'I', 'EM', 'STRONG', 'SPAN', 'SMALL', 'A', 'KBD', 'BR', 'SUP', 'SUB', 'U', 'S', 'MARK']);
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const skip = el => SKIP.has(el.tagName) || el.isContentEditable || (el.closest && el.closest('[translate="no"],svg'));

  // an element with text and inline tags: translate the whole sentence as one template
  function asTemplate(el) {
    const kids = el.childNodes;
    let tmpl = '', els = [], text = false;
    for (const k of kids) {
      if (k.nodeType === 3) { tmpl += k.nodeValue; if (LETTER.test(k.nodeValue)) text = true; }
      else if (k.nodeType === 1) {
        if (!INLINE.has(k.tagName)) return false;
        tmpl += '{' + els.length + '}'; els.push(k);
      }
    }
    if (!text || !els.length) return false;
    const r = look(tmpl, el);
    if (r == null || r === norm(tmpl)) return false;
    const frag = document.createDocumentFragment();
    r.split(/(\{\d+\})/).forEach(part => {
      const m = /^\{(\d+)\}$/.exec(part);
      if (m) { if (els[+m[1]]) frag.appendChild(els[+m[1]]); }
      else if (part) frag.appendChild(document.createTextNode(part));
    });
    el.textContent = '';
    el.appendChild(frag);
    return true;
  }
  function attrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) { const r = swap(v, el); if (r != null && r !== v) el.setAttribute(a, r); }
    }
  }
  function textNode(n) {
    const r = swap(n.nodeValue, n.parentElement);
    if (r != null && r !== n.nodeValue) n.nodeValue = r;
  }
  function walk(el, deep) {
    if (el.nodeType !== 1 || skip(el)) return;
    attrs(el);
    asTemplate(el);
    for (const k of [...el.childNodes]) {
      if (k.nodeType === 3) textNode(k);
      else if (deep && k.nodeType === 1) walk(k, true);
    }
  }
  const run = muts => {
    for (const m of muts) {
      if (m.type === 'attributes') { if (m.target.nodeType === 1 && !skip(m.target)) attrs(m.target); continue; }
      if (m.type === 'characterData') { const p = m.target.parentElement; if (p && !skip(p)) { if (!asTemplate(p)) textNode(m.target); } continue; }
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) walk(n, true);
        else if (n.nodeType === 3 && n.parentElement && !skip(n.parentElement)) { if (!asTemplate(n.parentElement)) textNode(n); }
      }
    }
  };
  const obs = new MutationObserver(run);
  // called at the end of the dictionary file, so the first pass already knows every word
  V.i18n.missing = () => (MISS ? [...MISS] : []);
  // renders every game's texts (names, rules, options, AI levels) once, so they show up in missing()
  V.i18n.harvest = function () {
    const box = document.createElement('div'); box.hidden = true; document.body.appendChild(box);
    const e = s => s == null ? '' : `<p>${s}</p>`;
    V.games.forEach(g => {
      box.innerHTML = [g.name, g.short, g.desc, g.cat, g.localHint, g.firstTitle].map(e).join('') +
        (g.tutorial || []).map(s => e(s.t) + e(s.demo) + e(s.d)).join('') +
        (g.options || []).map(o => e(o.label) + (o.choices || []).map(c => e(c[1])).join('')).join('') +
        (g.levelInfo || []).map(e).join('') + (g.firstLabels || []).map(e).join('') + (g.keys || []).map(k => e(k[1])).join('');
      walk(box, true);
    });
    box.remove();
    return V.i18n.missing();
  };
  V.i18n.start = function () {
    walk(document.body, true);
    const tt = look(document.title); if (tt) document.title = tt;
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
})();
