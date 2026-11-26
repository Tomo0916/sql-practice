/* =========================================================
 * pz-ui.js — paiza SQL skill check practice (paiza 対策):
 *   #/pz         the page: the levels, the Japanese words of the problems, how paiza works
 *   #/pz/<id>    one problem: the Japanese text (+ translation), the tables, the editor,
 *                Run (sample data) and Submit (sample + hidden data)
 * A level is cleared when all its practice problems pass both test cases. Problems and data: pz.js.
 * ========================================================= */
import { th, t, esc, rubyHTML, raw, hasLang, loadLang } from './i18n.js';
import { gridHTML, highlightSQL } from './ui.js';
import { PZ_LEVELS, PZ_BY_ID, pzLevel, pzCheckIds, pzRec, pzCleared, pzReached, pzSchema, pzExpected, pzCase, pzSubmit } from './pz.js';

let C = null;   // { S, L, save, render, asgPz }
let createEditor = null, ed = null;
const L = () => C.L();
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
const para = s => rubyHTML(s).split('\n').filter(x => x.trim()).map(x => `<p>${x.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`).join('');
const JA = k => raw(k, 'ja');
const SQL = () => C.S.engine.SQL;
const rec = () => pzRec(C.S.progress);
const WORDS = ['以上', '以下', '未満', 'より大きい', '昇順', '降順', 'ごとに', '件数', '合計', '平均', '四捨五入', '同じ場合は', '除く', '割合', '累計', '前月'];

export function installPz(ctx) { C = ctx; }
export const pzRoute = h => ({ view: 'pz', id: PZ_BY_ID[h[1]] ? h[1] : null });

function tablesHTML(prob) {
  return Object.entries(prob.tables).map(([n, tb]) => `<div class="hr-tb"><div class="hr-tbname"><code>${esc(n)}</code></div>
    <table class="hr-cols"><thead><tr><th>${H('pz.col')}</th><th>${H('pz.type')}</th></tr></thead><tbody>${tb.cols.split(',').map(c => { const [f, ty] = c.trim().split(/\s+/); return `<tr><td>${esc(f)}</td><td>${esc(ty)}</td></tr>`; }).join('')}</tbody></table>
    <div class="data-box">${gridHTML({ columns: pzSchema(prob)[n], values: tb.rows })}</div></div>`).join('');
}
/** the problem in Japanese (as on paiza) and, outside Japanese, the translation */
function statementHTML(prob) {
  const k = 'pz.p.' + prob.id, own = L() !== 'ja';
  return `<h1 class="hr-title" lang="ja">${rubyHTML(JA(k + '.t'))}</h1>
    <div class="hr-text" lang="ja">${para(JA(k + '.d'))}</div>
    ${own ? `<details class="hr-tr"><summary>${H('pz.showTr')}</summary><h3>${rubyHTML(raw(k + '.t', L()))}</h3>${para(raw(k + '.d', L()))}</details>` : ''}
    <h3 class="hr-h">${H('hr.input')}</h3>${tablesHTML(prob)}
    <h3 class="hr-h">${H('hr.sampleOut')}</h3>
    <div class="data-box hr-exp">${gridHTML(pzExpected(SQL(), prob, false))}</div>`;
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
const curProb = () => { const el = document.getElementById('pz-editor'); return el ? PZ_BY_ID[el.dataset.id] : null; };

function runSample() {
  const prob = curProb(), out = document.getElementById('pz-out');
  if (!prob || !ed || !out) return;
  const r = pzCase(SQL(), prob, ed.get(), false);
  if (r.err) { out.innerHTML = `<section class="card hr-res bad">${errHTML(r.err)}</section>`; return; }
  out.innerHTML = `<section class="card hr-res ${r.ok ? 'ok' : 'bad'}">
    <p><b>${r.ok ? `✓ ${H('hr.sampleOk')}` : `✗ ${H('hr.sampleNg')}`}</b></p>${r.ok ? `<p class="muted small">${H('hr.thenSubmit')}</p>` : `<p>${reasonHTML(r.grade)}</p>`}
    <div class="hr-two"><div><div class="muted small">${H('hr.yourOut')}</div><div class="data-box">${gridHTML(r.res) || `<div class="res-empty">${H('hr.g.none')}</div>`}</div></div>
      <div><div class="muted small">${H('hr.expOut')}</div><div class="data-box">${gridHTML(pzExpected(SQL(), prob, false))}</div></div></div></section>`;
}
function submit() {
  const prob = curProb(), out = document.getElementById('pz-out');
  if (!prob || !ed || !out) return;
  const cases = pzSubmit(SQL(), prob, ed.get()), n = cases.filter(x => x.ok).length;
  let newly = null;
  if (n === 2) { const r = rec(); if (!r.ok.includes(prob.id)) { const before = pzCleared(r.ok, prob.lv); r.ok.push(prob.id); C.save(); if (!before && pzCleared(r.ok, prob.lv)) newly = prob.lv; if (C.asgPz) C.asgPz(); } }
  const row = (x, i) => `<li class="${x.ok ? 'ok' : 'bad'}"><span>${x.ok ? '✓' : '✗'}</span><span>${H('pz.case', { n: i + 1 })}</span><span class="muted small">${H(i ? 'hr.hidden' : 'hr.sample')}</span></li>`;
  const msg = cases[0].err ? errHTML(cases[0].err) : n === 2 ? `<b>🎉 ${H('hr.allOk')}</b>` : cases[0].ok ? H('hr.hiddenNg') : reasonHTML(cases[0].grade);
  const d = pzLevel(prob.lv), next = n === 2 ? d[d.indexOf(prob) + 1] || null : null;
  out.innerHTML = `<section class="card hr-res ${n === 2 ? 'ok' : 'bad'}"><p class="hr-score">${H('pz.score', { n })}</p>
    <ul class="hr-cases">${cases.map(row).join('')}</ul><p>${msg}</p>
    ${newly ? `<p class="pz-clear">🏅 ${H('pz.cleared', { n: newly })}</p>` : ''}
    ${next ? `<a class="btn btn-ok" href="#/pz/${next.id}">${H('hr.next')} →</a>` : n === 2 ? `<a class="btn btn-ok" href="#/pz">${H('hr.back')}</a>` : ''}</section>`;
}

/* ---------- pages ---------- */
function hubHTML() {
  const r = rec(), reached = pzReached(r.ok);
  const card = lv => { const d = pzLevel(lv), ids = pzCheckIds(lv), n = ids.filter(id => r.ok.includes(id)).length, clear = pzCleared(r.ok, lv);
    return `<section class="card hr-area pz-lv ${clear ? 'clear' : ''}"><div class="hr-area-top"><h2><span class="pz-badge">Lv.${lv}</span> ${H('pz.lv.' + lv)}</h2><span class="tag">${clear ? `🏅 ${H('pz.clearTag')}` : `${n} / ${ids.length}`}</span></div>
      <p class="muted small">${H('pz.lvSub.' + lv)}</p>
      <ol class="hr-list">${d.map(p => `<li><a class="${r.ok.includes(p.id) ? 'done' : ''}" href="#/pz/${p.id}"><span class="hr-mark">${r.ok.includes(p.id) ? '✓' : p.ex ? '★' : '·'}</span><span lang="ja">${rubyHTML(JA(`pz.p.${p.id}.t`))}</span>${p.ex ? `<span class="tag ex">${H('hr.example')}</span>` : ''}</a></li>`).join('')}</ol></section>`; };
  const li = (pre, n) => Array.from({ length: n }, (_, i) => `<li>${H(`${pre}${i + 1}`)}</li>`).join('');
  return `<main class="wrap narrow hr-page pz-page">
    <section class="card hr-hero"><div class="hr-logo pz-logo" aria-hidden="true">pz</div><div>
      <h1>${H('pz.title')}</h1><p class="muted">${H('pz.sub')}</p>
      <ul class="hr-facts"><li>🇯🇵 ${H('pz.fact1')}</li><li>🪜 ${H('pz.fact2')}</li><li>🔒 ${H('hr.fact3')}</li><li>💼 ${H('pz.fact3')}</li></ul>
      <p class="pz-now">${reached ? H('pz.reached', { n: reached }) : H('pz.reachedNone')}</p>
      <a class="small" href="https://paiza.jp/" target="_blank" rel="noopener">${H('pz.official')} ↗</a></div></section>
    <p class="muted small">${H('pz.howLv')}</p>
    ${PZ_LEVELS.map(card).join('')}
    <section class="card"><h2>${H('pz.wordsH')}</h2><p class="muted small">${H('pz.wordsSub')}</p>
      <table class="wtable hr-words"><tbody>${WORDS.map((w, i) => `<tr><th lang="ja">${esc(w)}</th><td>${H(`pz.w${i + 1}`)}</td></tr>`).join('')}</tbody></table></section>
    <section class="card"><h2>${H('pz.aboutH')}</h2><ul class="hr-ul">${li('pz.about', 4)}</ul>
      <p class="small"><a href="#/hr">${H('pz.toHr')} →</a></p></section>
  </main>`;
}
function problemHTML(prob) {
  const r = rec(), d = pzLevel(prob.lv), how = prob.ex ? raw(`pz.p.${prob.id}.how`, L()) : '';
  return `<main class="wrap hr-page pz-page">
    <div class="py-crumb"><a href="#/pz">← ${H('pz.title')}</a></div>
    <nav class="py-pills">${d.map((p, i) => `<a class="py-pill ${p === prob ? 'cur' : ''} ${r.ok.includes(p.id) ? 'on' : ''} ${p.ex ? 'demo' : ''}" href="#/pz/${p.id}">${p.ex ? '★' : i}</a>`).join('')}<span class="muted small"><span class="pz-badge">Lv.${prob.lv}</span> ${H('pz.lv.' + prob.lv)}</span></nav>
    <section class="card hr-q">${prob.ex ? `<div class="py-tag">★ ${H('hr.example')}</div><p class="muted small">${H('hr.exampleSub')}</p>` : ''}
      ${statementHTML(prob)}</section>
    ${prob.ex ? `<section class="card hr-how"><h3>${H('hr.howH')}</h3><ol>${how.split('\n').filter(Boolean).map(x => `<li>${rubyHTML(x).replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`).join('')}</ol></section>` : ''}
    <section class="card editor-card hr-ed">
      <div class="hr-edhead"><span class="muted small">MySQL / SQLite</span><span class="muted small">${H('hr.keys')}</span></div>
      <div id="pz-editor" class="editor" data-id="${prob.id}"></div>
      <div class="hr-actions"><button class="btn btn-ghost" data-act="pzRun">▶ ${H('hr.run')}</button><button class="btn btn-primary" data-act="pzSubmit">${H('hr.submit')}</button></div>
    </section><div id="pz-out" aria-live="polite"></div>
    <details class="card hr-ans"><summary>${H(prob.ex ? 'hr.ansEx' : 'hr.ans')}</summary><pre class="sql">${highlightSQL(prob.sql)}</pre></details>
  </main>`;
}
export function pzHTML() {
  if (!hasLang('ja')) { loadLang('ja').then(() => { if (C.S.route.view === 'pz') C.render(); }); return '<div class="loading"><div><div class="spinner"></div></div></div>'; }   // the problems are always shown in Japanese
  document.title = `${T('pz.title')} · SQL Practice`;
  return C.S.route.id ? problemHTML(PZ_BY_ID[C.S.route.id]) : hubHTML();
}
export function pzMount() {
  if (ed) { ed.destroy(); ed = null; }
  const el = document.getElementById('pz-editor');
  if (!el) return;
  if (!createEditor) { import('./editor.js').then(m => { createEditor = m.createEditor; if (el.isConnected) pzMount(); }); return; }
  const prob = PZ_BY_ID[el.dataset.id], key = 'pz:' + prob.id, d = C.S.progress.drafts = C.S.progress.drafts || {};
  let timer;
  ed = createEditor(el, {
    doc: d[key] !== undefined ? d[key] : '', schema: pzSchema(prob), label: 'SQL', placeholder: 'SELECT …', key,
    onRun: runSample,
    onChange: v => { d[key] = v; clearTimeout(timer); timer = setTimeout(() => C.save(), 400); }
  });
}
export const pzActions = { pzRun: () => runSample(), pzSubmit: () => submit() };
