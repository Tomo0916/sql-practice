/* =========================================================
 * test.js — paper test maker (test.html)
 * Settings on the left, live A4 preview on the right.
 * "Print / Save PDF" uses the browser's print dialog (choose "Save as PDF").
 * ========================================================= */

const ui = { lang: detectLang(), engine: null };
const saved = Store.get(KEYS.test, {}) || {};
const opt = Object.assign({
  title: '', tlang: ui.lang, bilingual: false, lessons: LESSONS.map(l => l.key),
  per: 1, type: 'write', key: true, results: true, code: randomCode()
}, saved);
if (!LANG_CODES.includes(opt.tlang)) opt.tlang = ui.lang;
opt.lessons = opt.lessons.filter(k => LESSON_BY_KEY[k]);

const root = document.getElementById('app');
const U = (k, v) => t(k, ui.lang, v);

function save() { Store.set(KEYS.test, opt); }

function header() {
  return `<header class="topbar no-print"><div class="topbar-in">
    <a class="brand" href="index.html"><span class="brand-mark">SQL</span><span>SQL Practice</span></a>
    <nav class="topnav"><a href="index.html#/">${esc(U('nav.home'))}</a><a href="test.html" class="on">${esc(U('nav.test'))}</a></nav>
    <div class="topbar-right">${langSelectHTML(ui.lang)}</div>
  </div></header>`;
}

function panel() {
  const radio = (name, val, label, cur) => `<label><input type="radio" name="${name}" value="${val}" ${String(cur) === String(val) ? 'checked' : ''}>${esc(label)}</label>`;
  return `<aside class="card tm-panel">
    <div><h1>${esc(U('test.title'))}</h1><p class="sub">${esc(U('test.sub'))}</p></div>

    <div class="fld"><label for="f-title">${esc(U('test.heading'))}</label>
      <input type="text" id="f-title" data-k="title" value="${esc(opt.title)}" placeholder="${esc(t('test.headingDefault', opt.tlang))}"></div>

    <div class="fld"><label for="f-tlang">${esc(U('test.lang'))}</label>
      <select id="f-tlang" data-k="tlang">${LANGS.map(l => `<option value="${l.code}" ${l.code === opt.tlang ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
      ${opt.tlang !== 'en' ? `<label class="chk" style="margin-top:8px"><input type="checkbox" data-k="bilingual" ${opt.bilingual ? 'checked' : ''}>${esc(U('test.bilingual'))}</label>` : ''}
    </div>

    <div class="fld"><span class="lbl">${esc(U('test.lessons'))}</span>
      <div class="row2" style="margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" data-act="all">${esc(U('test.all'))}</button>
        <button class="btn btn-ghost btn-sm" data-act="none">${esc(U('test.none'))}</button>
      </div>
      <div class="lsel">${CHAPTERS.map(ch => `<div style="--cc:var(--c-${ch.key})"><div class="lsel-ch">
          <input type="checkbox" data-ch="${ch.key}" ${LESSONS.filter(l => l.ch === ch.key).every(l => opt.lessons.includes(l.key)) ? 'checked' : ''} aria-label="${esc(U(ch.title))}">${esc(U(ch.title))}</div>
        ${LESSONS.filter(l => l.ch === ch.key).map(l => `<label><input type="checkbox" data-lesson="${l.key}" ${opt.lessons.includes(l.key) ? 'checked' : ''}><span>${l.index + 1}. ${esc(L10(l.title, ui.lang))}</span></label>`).join('')}
      </div>`).join('')}</div>
    </div>

    <div class="fld"><span class="lbl">${esc(U('test.perLesson'))}</span>
      <div class="seg">${[1, 2, 3].map(n => radio('per', n, String(n), opt.per)).join('')}</div></div>

    <div class="fld"><span class="lbl">${esc(U('test.type'))}</span>
      <div class="seg">${radio('type', 'write', U('test.typeWrite'), opt.type)}${radio('type', 'predict', U('test.typePredict'), opt.type)}${radio('type', 'mix', U('test.typeMix'), opt.type)}</div></div>

    <div class="fld"><span class="lbl">${esc(U('test.options'))}</span>
      <label class="chk"><input type="checkbox" data-k="key" ${opt.key ? 'checked' : ''}>${esc(U('test.withKey'))}</label>
      <label class="chk"><input type="checkbox" data-k="results" ${opt.results ? 'checked' : ''} ${opt.key ? '' : 'disabled'}>${esc(U('test.withResult'))}</label>
    </div>

    <div class="fld"><label for="f-code">${esc(U('test.code'))}</label>
      <div class="code-row"><input type="text" id="f-code" data-k="code" value="${esc(opt.code)}" maxlength="16">
      <button class="btn btn-ghost btn-sm" data-act="newCode">${ICONS.shuffle}${esc(U('test.newCode'))}</button></div></div>

    <div class="tm-print">
      <button class="btn btn-primary" data-act="print" ${opt.lessons.length ? '' : 'disabled'}>${ICONS.print}${esc(U('test.print'))}</button>
      <div class="tm-count" id="tm-count"></div>
    </div>
  </aside>`;
}

function paper() {
  if (!opt.lessons.length) return `<div class="card empty-paper">${esc(U('test.nothing'))}</div>`;
  const tl = opt.tlang, T2 = (k, v) => t(k, tl, v);
  const test = ui.engine.makeTest({ lessons: opt.lessons, per: opt.per, type: opt.type, code: opt.code || 'X' });
  const title = opt.title.trim() || T2('test.headingDefault');
  const date = new Date().toLocaleDateString(tl === 'my' ? 'en' : tl);
  document.title = `${title} (${opt.code})`;
  const bi = opt.bilingual && tl !== 'en';

  const qs = test.questions.map((q, i) => {
    const write = q.qtype === 'write';
    const lines = Math.min(5, Math.max(2, Math.ceil(q.sql.length / 58) + 1));
    const rows = q.result ? q.result.values.length : 3;
    return `<div class="q"><div class="q-head"><span class="q-num">Q${i + 1}.</span><div class="q-body">
      <div class="q-inst">${esc(T2(write ? 'test.qWrite' : 'test.qPredict'))}${bi ? ` <span style="font-weight:400">/ ${esc(t(write ? 'test.qWrite' : 'test.qPredict', 'en'))}</span>` : ''}</div>
      ${write ? `<p class="q-text">${problemHTML(q, tl)}</p>${bi ? `<p class="q-en">${problemHTML(q, 'en')}</p>` : ''}`
        : `<div class="q-sql">${esc(q.sql)}</div>`}
      <div class="q-meta">${esc(T2('test.useTable', { t: q.tables.join(', ') }))}</div>
      ${write ? `<div class="ans lines" style="--h:${lines * 8 + 2}mm"><span class="lab">${esc(T2('test.answerSpace'))}</span></div>`
        : `<div class="ans grid-ans" style="--h:${(rows + 2) * 7}mm"><span class="lab">${esc(T2('test.answerSpace'))}</span></div>`}
    </div></div></div>`;
  }).join('');

  const sheet1 = `<section class="sheet" lang="${tl}">
    <h2>${esc(title)}</h2>
    <div class="meta"><span>${esc(T2('test.count', { n: test.questions.length }))}</span><span>${esc(T2('set.code'))}: ${esc(opt.code)}</span></div>
    <div class="idbox"><div>${esc(T2('test.class'))}</div><div>${esc(T2('test.name'))}</div><div>${esc(T2('test.date'))}</div><div>${esc(T2('test.score'))}</div></div>
    ${qs}
  </section>`;

  const tables = test.tables.map(n => {
    const d = ui.engine.tableData(n);
    return `<div class="${d.columns.length > 4 ? 'wide' : ''}"><h4>${esc(n)}</h4>${gridHTML(d)}</div>`;
  }).join('');
  const sheet2 = `<section class="sheet" lang="${tl}">
    <h3>${esc(T2('test.data'))}</h3><p class="note">${esc(T2('test.dataNote'))} · ${esc(title)} (${esc(opt.code)})</p>
    <div class="data-tables">${tables}</div>
  </section>`;

  const sheet3 = !opt.key ? '' : `<section class="sheet" lang="${tl}">
    <h3>${esc(T2('test.key'))} — ${esc(title)} (${esc(opt.code)})</h3><p class="note">${esc(T2('test.keyNote'))}</p>
    ${test.questions.map((q, i) => `<div class="key-item"><span class="q-num">Q${i + 1}.</span><div class="q-body">
      <div class="q-sql">${esc(q.sql)}</div>
      ${opt.results || q.qtype === 'predict' ? `<div class="res">${gridHTML(q.result)}</div>` : ''}
    </div></div>`).join('')}
  </section>`;

  setTimeout(() => { const c = document.getElementById('tm-count'); if (c) c.textContent = `${T2('test.count', { n: test.questions.length })} · ${opt.code}`; });
  return sheet1 + sheet2 + sheet3;
}

function render() {
  document.documentElement.lang = ui.lang;
  if (!ui.engine) { root.innerHTML = header() + `<div class="loading"><div><div class="spinner"></div>${esc(U('misc.loading'))}</div></div>`; return; }
  const scroll = document.querySelector('.tm-panel') ? document.querySelector('.tm-panel').scrollTop : 0;
  root.innerHTML = header() + `<main class="wrap"><div class="tm-layout">${panel()}<div class="paper-wrap" aria-label="${esc(U('test.preview'))}">${paper()}</div></div></main>`;
  const p = document.querySelector('.tm-panel'); if (p) p.scrollTop = scroll;
}
let renderTimer = null;
function update() { save(); clearTimeout(renderTimer); renderTimer = setTimeout(render, 120); }

document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-act="lang"]')) { ui.lang = el.value; applyLang(ui.lang); render(); return; }
  if (el.dataset.k) {
    const k = el.dataset.k;
    if (el.type === 'checkbox') opt[k] = el.checked;
    else if (k === 'code') opt.code = normCode(el.value) || randomCode();
    else opt[k] = el.value;
    update(); return;
  }
  if (el.name === 'per') { opt.per = +el.value; update(); return; }
  if (el.name === 'type') { opt.type = el.value; update(); return; }
  if (el.dataset.lesson) {
    const k = el.dataset.lesson;
    opt.lessons = el.checked ? LESSONS.map(l => l.key).filter(x => x === k || opt.lessons.includes(x)) : opt.lessons.filter(x => x !== k);
    update(); return;
  }
  if (el.dataset.ch) {
    const keys = LESSONS.filter(l => l.ch === el.dataset.ch).map(l => l.key);
    opt.lessons = el.checked ? LESSONS.map(l => l.key).filter(x => keys.includes(x) || opt.lessons.includes(x)) : opt.lessons.filter(x => !keys.includes(x));
    update();
  }
});
document.addEventListener('input', e => { if (e.target.dataset.k === 'title') { opt.title = e.target.value; save(); clearTimeout(renderTimer); renderTimer = setTimeout(() => { const h = document.querySelector('.sheet h2'); if (h) h.textContent = opt.title.trim() || t('test.headingDefault', opt.tlang); }, 100); } });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT') return;
  const a = el.dataset.act;
  if (a === 'all') { opt.lessons = LESSONS.map(l => l.key); update(); }
  else if (a === 'none') { opt.lessons = []; update(); }
  else if (a === 'newCode') { opt.code = randomCode(); update(); }
  else if (a === 'print') { render(); setTimeout(() => window.print(), 50); }
});

applyLang(ui.lang);
render();
loadEngine().then(engine => { ui.engine = engine; render(); }).catch(err => {
  console.error(err);
  root.innerHTML = header() + `<div class="loading"><div>${esc(U('misc.loadError'))}</div></div>`;
});
