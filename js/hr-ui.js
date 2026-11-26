/* =========================================================
 * hr-ui.js — HackerRank SQL (Basic) practice (HackerRank 対策):
 *   #/hr            the page: the areas, the mock test, how the app differs from the real test
 *   #/hr/<id>       one problem: the English text (+ translation), the tables, the editor,
 *                   Run (sample data) and Submit (sample + hidden data)
 *   #/hr/mock       the mock test: 30 minutes, 2 problems, like the real one
 * The problems and the checking are in hr.js. student.js calls installHr(), hrRoute(), hrHTML(), hrMount().
 * ========================================================= */
import { th, t, esc, rubyHTML, raw } from './i18n.js';
import { gridHTML, highlightSQL } from './ui.js';
import { HR_AREAS, HR_BY_ID, HR_MOCK_SEC, hrDrill, hrMockPick, hrSchema, hrExpected, hrCase, hrSubmit, hrRec } from './hr.js';

let C = null;   // { S, L, save, render }
let createEditor = null, ed = null, tick = null;
const L = () => C.L();
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
/** a problem text: paragraphs (one per line) with `code` marks */
const para = s => rubyHTML(s).split('\n').filter(x => x.trim()).map(x => `<p>${x.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`).join('');
const EN = k => raw(k, 'en');
const SQL = () => C.S.engine.SQL;
const MKEY = 'sqlp-hr-mock';

export function installHr(ctx) { C = ctx; }
export const hrRoute = h => ({ view: 'hr', id: h[1] === 'mock' ? null : HR_BY_ID[h[1]] ? h[1] : null, mock: h[1] === 'mock' });
const rec = () => hrRec(C.S.progress);

/* ---------- the mock test (kept in sessionStorage: a reload does not lose it) ---------- */
let mock = null;
try { mock = JSON.parse(sessionStorage.getItem(MKEY) || 'null'); } catch (e) { mock = null; }
const keepMock = () => { try { sessionStorage.setItem(MKEY, JSON.stringify(mock)); } catch (e) { /* private mode */ } };
const leftMs = () => (mock ? Math.max(0, mock.t0 + HR_MOCK_SEC * 1000 - Date.now()) : 0);
const fmt = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const mockPts = m => m.ids.reduce((a, id) => a + (m.best[id] || 0), 0);   // passed test cases, of 4
function startMock(tr) {
  const ids = hrMockPick(Math.random(), Math.random());
  const d = C.S.progress.drafts = C.S.progress.drafts || {};
  ids.forEach(id => delete d['hrm:' + id]);
  mock = { ids, cur: 0, t0: Date.now(), tr: !!tr, best: {}, done: false, ms: 0 };
  keepMock(); C.render(); window.scrollTo(0, 0);
}
function endMock() {
  if (!mock || mock.done) return;
  mock.done = true; mock.ms = Math.min(Date.now() - mock.t0, HR_MOCK_SEC * 1000);
  const r = rec();
  r.mock.push({ at: Date.now(), ids: mock.ids, pts: mockPts(mock), ms: mock.ms });
  r.mock = r.mock.slice(-30);
  keepMock(); C.save(); stopTick(); C.render(); window.scrollTo(0, 0);
}
function stopTick() { clearInterval(tick); tick = null; }
function startTick() {
  if (tick) return;
  tick = setInterval(() => {
    if (!mock || mock.done) return stopTick();
    if (leftMs() <= 0) return endMock();
    const el = document.getElementById('hr-clock');
    if (el) { el.textContent = fmt(leftMs()); el.classList.toggle('low', leftMs() < 5 * 60 * 1000); }
  }, 500);
}

/* ---------- pieces ---------- */
const areaName = a => H('hr.area.' + a);
function tablesHTML(prob) {
  return Object.entries(prob.tables).map(([n, tb]) => `<div class="hr-tb"><div class="hr-tbname"><code>${esc(n)}</code></div>
    <table class="hr-cols"><thead><tr><th>Field</th><th>Type</th></tr></thead><tbody>${tb.cols.split(',').map(c => { const [f, ty] = c.trim().split(/\s+/); return `<tr><td>${esc(f)}</td><td>${esc(ty)}</td></tr>`; }).join('')}</tbody></table>
    <div class="data-box">${gridHTML({ columns: hrSchema(prob)[n], values: tb.rows })}</div></div>`).join('');
}
/** the problem: English (as in the real test) and, if allowed, the translation */
function statementHTML(prob, tr) {
  const k = 'hr.p.' + prob.id;
  return `<h1 class="hr-title" lang="en">${esc(EN(k + '.t'))}</h1>
    <div class="hr-text" lang="en">${para(EN(k + '.d'))}</div>
    ${tr && L() !== 'en' ? `<details class="hr-tr"><summary>${H('hr.showTr')}</summary><h3>${rubyHTML(raw(k + '.t', L()))}</h3>${para(raw(k + '.d', L()))}</details>` : ''}
    <h3 class="hr-h">${H('hr.input')} <small class="muted" lang="en">Input Format</small></h3>${tablesHTML(prob)}
    <h3 class="hr-h">${H('hr.sampleOut')} <small class="muted" lang="en">Sample Output</small></h3>
    <div class="data-box hr-exp">${gridHTML(hrExpected(SQL(), prob, false))}</div>`;
}
function workHTML(prob, inMock) {
  return `<section class="card editor-card hr-ed">
      <div class="hr-edhead"><span class="muted small">MySQL / SQLite</span><span class="muted small">${H('hr.keys')}</span></div>
      <div id="hr-editor" class="editor" data-id="${prob.id}" data-mock="${inMock ? 1 : 0}"></div>
      <div class="hr-actions"><button class="btn btn-ghost" data-act="hrRun">▶ ${H('hr.run')}</button><button class="btn btn-primary" data-act="hrSubmit">${H('hr.submit')}</button></div>
    </section><div id="hr-out" aria-live="polite"></div>`;
}
const reasonHTML = g => {
  if (!g) return '';
  if (g.reason === 'cols') return H('hr.g.cols', { a: g.a, b: g.b });
  if (g.reason === 'rows') return H('hr.g.rows', { a: g.a, b: g.b });
  if (g.reason === 'order') return H('hr.g.order');
  if (g.reason === 'noResult') return H('hr.g.none');
  return H('hr.g.values');
};
const errHTML = e => (e === 'empty' ? H('hr.e.empty') : e === 'onlySelect' ? H('hr.e.only') : `${H('hr.e.sql')}<pre class="hr-err" lang="en">${esc(e)}</pre>`);

/* ---------- running ---------- */
function current() {
  const el = document.getElementById('hr-editor');
  return el ? { prob: HR_BY_ID[el.dataset.id], inMock: el.dataset.mock === '1' } : null;
}
function runSample() {
  const c = current(), out = document.getElementById('hr-out');
  if (!c || !ed || !out) return;
  const r = hrCase(SQL(), c.prob, ed.get(), false);
  if (r.err) { out.innerHTML = `<section class="card hr-res bad">${errHTML(r.err)}</section>`; return; }
  out.innerHTML = `<section class="card hr-res ${r.ok ? 'ok' : 'bad'}">
    <p><b>${r.ok ? `✓ ${H('hr.sampleOk')}` : `✗ ${H('hr.sampleNg')}`}</b></p>${r.ok ? `<p class="muted small">${H('hr.thenSubmit')}</p>` : `<p>${reasonHTML(r.grade)}</p>`}
    <div class="hr-two"><div><div class="muted small">${H('hr.yourOut')}</div><div class="data-box">${gridHTML(r.res) || `<div class="res-empty">${H('hr.g.none')}</div>`}</div></div>
      <div><div class="muted small">${H('hr.expOut')}</div><div class="data-box">${gridHTML(hrExpected(SQL(), c.prob, false))}</div></div></div></section>`;
}
function submit() {
  const c = current(), out = document.getElementById('hr-out');
  if (!c || !ed || !out) return;
  if (c.inMock && (!mock || mock.done || leftMs() <= 0)) return;
  const cases = hrSubmit(SQL(), c.prob, ed.get()), n = cases.filter(x => x.ok).length;
  if (c.inMock) { mock.best[c.prob.id] = Math.max(mock.best[c.prob.id] || 0, n); keepMock(); const tab = document.querySelector(`.hr-qtab[data-i="${mock.ids.indexOf(c.prob.id)}"] .hr-qst`); if (tab) tab.textContent = `${mock.best[c.prob.id]}/2`; }
  else if (n === 2) { const r = rec(); if (!r.ok.includes(c.prob.id)) { r.ok.push(c.prob.id); C.save(); } }
  const err = cases[0].err;
  const row = (x, i) => `<li class="${x.ok ? 'ok' : 'bad'}"><span>${x.ok ? '✓' : '✗'}</span><span lang="en">Test case ${i}</span><span class="muted small">${H(i ? 'hr.hidden' : 'hr.sample')}</span></li>`;
  let msg = '';
  if (err) msg = errHTML(err);
  else if (n === 2) msg = `<b>🎉 ${H('hr.allOk')}</b>`;
  else if (cases[0].ok) msg = H('hr.hiddenNg');
  else msg = reasonHTML(cases[0].grade);
  const next = !c.inMock && n === 2 ? nextOf(c.prob) : null;
  out.innerHTML = `<section class="card hr-res ${n === 2 ? 'ok' : 'bad'}"><p class="hr-score" lang="en">${n} / 2 test cases passed</p>
    <ul class="hr-cases">${cases.map(row).join('')}</ul><p>${msg}</p>
    ${next ? `<a class="btn btn-ok" href="#/hr/${next.id}">${H('hr.next')} →</a>` : !c.inMock && n === 2 ? `<a class="btn btn-ok" href="#/hr">${H('hr.back')}</a>` : ''}</section>`;
}
function nextOf(prob) { const d = hrDrill(prob.area), i = d.indexOf(prob); return d[i + 1] || null; }

/* ---------- pages ---------- */
function hubHTML() {
  const r = rec(), best = r.mock.length ? Math.max(...r.mock.map(m => m.pts)) : null;
  const card = a => { const d = hrDrill(a), n = d.filter(p => r.ok.includes(p.id)).length;
    return `<section class="card hr-area"><div class="hr-area-top"><h2>${areaName(a)}</h2><span class="tag">${n} / ${d.length}</span></div>
      <p class="muted small">${H('hr.areaSub.' + a)}</p>
      <ol class="hr-list">${d.map(p => `<li><a class="${r.ok.includes(p.id) ? 'done' : ''}" href="#/hr/${p.id}"><span class="hr-mark">${r.ok.includes(p.id) ? '✓' : p.ex ? '★' : '·'}</span><span lang="en">${esc(EN(`hr.p.${p.id}.t`))}</span>${p.ex ? `<span class="tag ex">${H('hr.example')}</span>` : ''}</a></li>`).join('')}</ol></section>`; };
  const li = (pre, n) => Array.from({ length: n }, (_, i) => `<li>${H(`${pre}${i + 1}`)}</li>`).join('');
  return `<main class="wrap narrow hr-page">
    <section class="card hr-hero"><div class="hr-logo" aria-hidden="true">HR</div><div>
      <h1>${H('hr.title')}</h1><p class="muted">${H('hr.sub')}</p>
      <ul class="hr-facts"><li>⏱ ${H('hr.fact1')}</li><li>✍️ ${H('hr.fact2')}</li><li>🔒 ${H('hr.fact3')}</li><li>🇬🇧 ${H('hr.fact4')}</li></ul>
      <a class="small" href="https://www.hackerrank.com/skills-verification/sql_basic" target="_blank" rel="noopener">${H('hr.official')} ↗</a></div></section>
    <h2 class="home-h">${H('hr.drillH')}</h2><p class="muted small">${H('hr.drillSub')}</p>
    ${HR_AREAS.map(card).join('')}
    <section class="card hr-mockcard"><div><h2>⏱ ${H('hr.mockH')}</h2><p class="muted">${H('hr.mockSub')}</p>
      ${best !== null ? `<p class="small">${H('hr.mockBest', { n: best, m: r.mock.length })}</p>` : ''}</div>
      <a class="btn btn-primary" href="#/hr/mock">${H('hr.mockOpen')}</a></section>
    <section class="card"><h2>${H('hr.diffH')}</h2><p class="muted small">${H('hr.diffSub')}</p><ul class="hr-ul">${li('hr.diff', 5)}</ul></section>
    <section class="card"><h2>${H('hr.wordsH')}</h2><p class="muted small">${H('hr.wordsSub')}</p>
      <table class="wtable hr-words"><tbody>${['ascending', 'descending', 'respectively', 'distinct', 'at least', 'greater than', 'exclusive', 'inclusive', 'round', 'in case of a tie', 'omit', 'aggregate'].map((w, i) => `<tr><th lang="en">${esc(w)}</th><td>${H(`hr.w${i + 1}`)}</td></tr>`).join('')}</tbody></table></section>
    <section class="card"><h2>${H('hr.flowH')}</h2><ol class="hr-ul">${li('hr.flow', 5)}</ol>
      <p class="small"><a href="https://tomo0916.github.io/ds/certs/?lang=${encodeURIComponent(L())}" target="_blank" rel="noopener">${H('hr.badgeLink')} ↗</a></p></section>
  </main>`;
}
function problemHTML(prob) {
  const r = rec(), d = hrDrill(prob.area), how = prob.ex ? raw(`hr.p.${prob.id}.how`, L()) : '';
  return `<main class="wrap hr-page">
    <div class="py-crumb"><a href="#/hr">← ${H('hr.title')}</a></div>
    <nav class="py-pills">${d.map((p, i) => `<a class="py-pill ${p === prob ? 'cur' : ''} ${r.ok.includes(p.id) ? 'on' : ''} ${p.ex ? 'demo' : ''}" href="#/hr/${p.id}">${p.ex ? '★' : i}</a>`).join('')}<span class="muted small">${areaName(prob.area)}</span></nav>
    <section class="card hr-q">${prob.ex ? `<div class="py-tag">★ ${H('hr.example')}</div><p class="muted small">${H('hr.exampleSub')}</p>` : ''}
      ${statementHTML(prob, true)}</section>
    ${prob.ex ? `<section class="card hr-how"><h3>${H('hr.howH')}</h3><ol>${how.split('\n').filter(Boolean).map(x => `<li>${rubyHTML(x).replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`).join('')}</ol></section>` : ''}
    ${workHTML(prob, false)}
    <details class="card hr-ans"><summary>${H(prob.ex ? 'hr.ansEx' : 'hr.ans')}</summary><pre class="sql">${highlightSQL(prob.sql)}</pre></details>
  </main>`;
}
function mockHTML() {
  if (!mock) {
    return `<main class="wrap narrow hr-page"><div class="py-crumb"><a href="#/hr">← ${H('hr.title')}</a></div>
      <section class="card"><h1>⏱ ${H('hr.mockH')}</h1><ul class="hr-ul">${[1, 2, 3, 4].map(i => `<li>${H(`hr.rule${i}`)}</li>`).join('')}</ul>
      <div class="row-btns"><button class="btn btn-primary" data-act="hrMock" data-tr="0">${H('hr.startEn')}</button><button class="btn btn-ghost" data-act="hrMock" data-tr="1">${H('hr.startTr')}</button></div>
      <p class="muted small">${H('hr.startNote')}</p></section></main>`;
  }
  if (mock.done) {
    const pts = mockPts(mock), pass = pts === 4;
    return `<main class="wrap narrow hr-page"><div class="py-crumb"><a href="#/hr">← ${H('hr.title')}</a></div>
      <section class="card hr-result ${pass ? 'ok' : ''}"><h1>${H('hr.resH')}</h1>
        <div class="hr-big">${pts} / 4 <small lang="en">test cases</small></div>
        <ul class="hr-cases">${mock.ids.map((id, i) => `<li class="${mock.best[id] === 2 ? 'ok' : 'bad'}"><span>${mock.best[id] === 2 ? '✓' : '✗'}</span><span lang="en">Q${i + 1}. ${esc(EN(`hr.p.${id}.t`))}</span><span>${mock.best[id] || 0} / 2</span></li>`).join('')}</ul>
        <p>${H('hr.timeUsed', { t: fmt(mock.ms) })}</p>
        <p><b>${H(pass ? 'hr.resPass' : 'hr.resMore')}</b></p><p class="muted small">${H('hr.resNote')}</p>
        <div class="row-btns">${mock.ids.map((id, i) => `<a class="btn btn-ghost" href="#/hr/${id}">Q${i + 1} ${H('hr.review')}</a>`).join('')}<button class="btn btn-primary" data-act="hrMockAgain">${H('hr.again')}</button></div></section></main>`;
  }
  startTick();
  const prob = HR_BY_ID[mock.ids[mock.cur]];
  return `<main class="wrap hr-page hr-mock">
    <div class="hr-bar"><span class="hr-clock-wrap">⏱ <b id="hr-clock">${fmt(leftMs())}</b></span>
      <span class="hr-qtabs">${mock.ids.map((id, i) => `<button class="hr-qtab ${i === mock.cur ? 'on' : ''}" data-act="hrQ" data-i="${i}"><span lang="en">Q${i + 1}</span> <span class="hr-qst">${mock.best[id] || 0}/2</span></button>`).join('')}</span>
      <button class="btn btn-ghost btn-sm" data-act="hrEnd">${H('hr.finish')}</button></div>
    <section class="card hr-q">${statementHTML(prob, mock.tr)}</section>
    ${workHTML(prob, true)}
  </main>`;
}
export function hrHTML() {
  const r = C.S.route;
  document.title = `${T('hr.title')} · SQL Practice`;
  if (!(r.mock && mock && !mock.done)) stopTick();
  return r.mock ? mockHTML() : r.id ? problemHTML(HR_BY_ID[r.id]) : hubHTML();
}
/** after render: the editor */
export function hrMount() {
  if (ed) { ed.destroy(); ed = null; }
  const el = document.getElementById('hr-editor');
  if (!el) return;
  if (!createEditor) { import('./editor.js').then(m => { createEditor = m.createEditor; if (el.isConnected) hrMount(); }); return; }
  const prob = HR_BY_ID[el.dataset.id], key = (el.dataset.mock === '1' ? 'hrm:' : 'hr:') + prob.id, d = C.S.progress.drafts = C.S.progress.drafts || {};
  let timer;
  ed = createEditor(el, {
    doc: d[key] !== undefined ? d[key] : '', schema: hrSchema(prob), label: 'SQL', placeholder: 'SELECT …', key,
    onRun: runSample,
    onChange: v => { d[key] = v; clearTimeout(timer); timer = setTimeout(() => C.save(), 400); }
  });
}
export const hrActions = {
  hrRun: () => runSample(),
  hrSubmit: () => submit(),
  hrMock(el) { startMock(el.dataset.tr === '1'); },
  hrQ(el) { if (!mock) return; mock.cur = +el.dataset.i; keepMock(); C.render(); window.scrollTo(0, 0); },
  hrEnd() { if (window.confirm(T('hr.endAsk'))) endMock(); },
  hrMockAgain() { mock = null; keepMock(); C.render(); window.scrollTo(0, 0); }
};
