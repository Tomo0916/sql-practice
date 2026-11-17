/* =========================================================
 * py-ui.js — the Python (pandas) course pages: #/py (the lessons) and #/py/<lesson>/<n>
 * (0 = the example, 1…PD_N = practice). Python runs in a worker (pyrun.js); the answer is
 * the value of the last line, compared with the reference answer's value.
 * Progress: S.progress.py[lesson] = { seed, ok: [problem ids solved], n (solved in all), clear }
 * ========================================================= */
import { th, t, esc, rubyHTML, raw } from './i18n.js';
import { gridHTML } from './ui.js';
import { createEditor } from './editor.js';
import { PD_LESSONS, PD_BY_KEY, PD_N, pdSet, pdTables, pdColumns, pdSame, pdDiff } from './pandas.js';
import { pyRun, pyWarm, pyState, onPyState } from './pyrun.js';

let C = null;   // { S, L, save, render }
const want = new Map();   // problem id → the reference answer's result
let ed = null, unsub = null;
const L = () => C.L();
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
/** a text with `code` marks */
const P = k => rubyHTML(raw(k, L())).replace(/`([^`]+)`/g, '<code>$1</code>');

export function installPy(ctx) { C = ctx; }
export const pyRoute = h => (h[0] === 'py' ? { view: 'py', key: PD_BY_KEY[h[1]] ? h[1] : null, idx: Math.min(PD_N, Math.max(0, parseInt(h[2], 10) || 0)) } : null);

const rec = key => { const p = C.S.progress.py = C.S.progress.py || {}; return (p[key] = Object.assign({ seed: '1', ok: [], n: 0, clear: false }, p[key])); };
const setOf = key => pdSet(key, rec(key).seed);
const probOf = (key, i) => { const s = setOf(key); return i === 0 ? s.demo : s.items[i - 1]; };

/** the problem text: values as code, nested texts (cmp.ge …) filled the same way */
function descHTML(prob) {
  const [k, v] = PD_BY_KEY[prob.lesson].desc(prob.p);
  const fill = vars => Object.fromEntries(Object.entries(vars).map(([a, b]) => [a, b && typeof b === 'object' ? th(b.k, L(), b.v ? fill(b.v) : undefined) : `<code>${esc(b)}</code>`]));
  return th(k, L(), fill(v));
}

/* ---------- the list of lessons ---------- */
function hubHTML() {
  const done = PD_LESSONS.filter(l => rec(l.key).clear).length;
  return `<main class="wrap narrow py-page">
    <section class="card py-hero"><div class="py-logo" aria-hidden="true">pd</div><div>
      <h1>${H('pd.title')}</h1><p class="muted">${H('pd.sub')}</p>
      <div class="bar"><i style="width:${Math.round(done / PD_LESSONS.length * 100)}%"></i></div>
      <p class="muted small">${done} / ${PD_LESSONS.length}</p></div></section>
    ${statusHTML()}
    <ul class="lesson-list py-list card">${PD_LESSONS.map(l => {
      const r = rec(l.key), set = setOf(l.key), n = set.items.filter(p => r.ok.includes(p.id)).length;
      return `<li><a class="lesson-link ${r.clear ? 'done' : ''}" href="#/py/${l.key}/0">
        <span class="lesson-num">${r.clear ? '✓' : l.no}</span><span class="lesson-name">${rubyHTML(raw('pd.t.' + l.key, L()))}</span>
        <span class="dots" aria-label="${n}/${PD_N}">${set.items.map(p => `<i class="${r.ok.includes(p.id) ? 'on' : ''}"></i>`).join('')}</span></a></li>`;
    }).join('')}</ul></main>`;
}
function statusHTML() {
  const s = pyState();
  if (s === 'ready' || s === 'idle') return '<div id="py-status"></div>';
  if (s === 'failed') return `<div id="py-status" class="py-status bad">${H('pd.failed')} <button class="btn btn-ghost btn-sm" data-act="pyRetry">${H('pd.retry')}</button></div>`;
  return `<div id="py-status" class="py-status"><i class="spin" aria-hidden="true"></i>${H(s === 'pandas' ? 'pd.loadingPandas' : 'pd.loading')}</div>`;
}

/* ---------- a lesson ---------- */
const SNIPS = {
  pd_head: [['.head()', 1]], pd_cols: [['[[]]', 2]],
  pd_num: [['[]', 1], ['>='], ['>'], ['<='], ['<']], pd_text: [['[]', 1], ['=='], ['!=']],
  pd_andor: [['[]', 1], ['()', 1], ['&'], ['|'], ['>='], ['<='], ['==']],
  pd_loc: [['.loc[]', 1], ['[]', 1], [', '], ['>='], ['<']],
  pd_sort: [['.sort_values()', 1], [', ascending=False']], pd_top: [['.sort_values()', 1], [', ascending=False'], ['.head()', 1]],
  pd_agg: [['[]', 1], ['.mean()'], ['.sum()'], ['.max()'], ['.min()']],
  pd_group: [['.groupby()', 1], ['[]', 1], ['.mean()'], ['.sum()'], ['.max()'], ['.min()']],
  pd_count: [['[]', 1], ['.value_counts()']], pd_merge: [['pd.merge()', 1], [', '], ['left_on='], ['right_on=']]
};
const chip = (text, back, cls) => `<button class="kw-chip ${cls || ''}" data-act="pyIns" data-text="${esc(text)}" data-back="${back || 0}">${esc(text)}</button>`;
function chipsHTML(prob) {
  const tabs = pdColumns(prob), vals = [];
  ['v', 'w', 'n'].forEach(k => { const v = prob.p[k]; if (v !== undefined && typeof v !== 'boolean') vals.push(typeof v === 'number' ? String(v) : JSON.stringify(v)); });
  return `<div class="kwbar"><span>${H('pd.kw')}</span>${(SNIPS[prob.lesson] || []).map(([s, b]) => chip(s, b)).join('')}</div>
    <div class="kwbar names"><span>${H('order.g.table')}</span>${tabs.map(x => chip(x.t, 0, 'nm tb')).join('')}</div>
    ${tabs.map(x => `<div class="kwbar names"><span>${tabs.length > 1 ? `${esc(x.t)} · ` : ''}${H('order.g.col')}</span>${x.cols.map(c => chip(JSON.stringify(c), 0, 'nm cl')).join('')}</div>`).join('')}
    ${prob.lesson === 'pd_head' || prob.lesson === 'pd_top' || !vals.length ? '' : `<div class="kwbar names"><span>${H('order.g.val')}</span>${vals.map(v => chip(v, 0, 'nm vl')).join('')}</div>`}`;
}
function tablesHTML(prob) {
  const ts = pdTables(prob);
  return `<details class="py-tables" ${prob.demo ? 'open' : ''}><summary>${H('pd.tables')}: ${Object.keys(ts).map(n => `<code>${esc(n)}</code>`).join(', ')}</summary>
    ${Object.entries(ts).map(([n, x]) => `<div class="muted small strong">${esc(n)}</div><div class="data-box">${gridHTML({ columns: x.columns, values: x.rows })}</div>`).join('')}</details>`;
}
function lessonHTML() {
  const { key, idx } = C.S.route, lesson = PD_BY_KEY[key], r = rec(key), set = setOf(key), prob = probOf(key, idx);
  const solved = set.items.filter(p => r.ok.includes(p.id)).length, i = PD_LESSONS.indexOf(lesson), next = PD_LESSONS[i + 1];
  const pill = (j, label, on) => `<a class="py-pill ${j === idx ? 'cur' : ''} ${on ? 'on' : ''} ${j === 0 ? 'demo' : ''}" href="#/py/${key}/${j}">${label}</a>`;
  return `<main class="wrap py-page">
    <div class="py-crumb"><a href="#/py">← ${H('pd.lessons')}</a></div>
    <section class="card py-head"><small class="muted">Python · ${lesson.no}</small><h1>${rubyHTML(raw('pd.t.' + key, L()))}</h1><p class="py-point">${P('pd.p.' + key)}</p></section>
    ${statusHTML()}
    <nav class="py-pills" aria-label="${esc(T('pd.practice'))}">${pill(0, `★ ${esc(T('pd.example'))}`, false)}<span class="py-sep">${H('pd.practice')}</span>
      ${set.items.map((p, j) => pill(j + 1, String(j + 1), r.ok.includes(p.id))).join('')}
      <button class="btn btn-ghost btn-sm py-new" data-act="pyNew">↻ ${H('pd.newSet')}</button>
      <span class="muted small">${H('pd.progress', { n: solved, m: PD_N })}</span></nav>
    <section class="card py-q ${prob.demo ? 'is-demo' : ''}">
      <div class="py-tag">${prob.demo ? `★ ${H('pd.example')}` : `${H('pd.practice')} ${idx}`}</div>
      ${prob.demo ? `<p class="muted small">${H('pd.exampleSub')}</p>` : ''}
      <h2 class="py-desc">${descHTML(prob)}</h2>
      ${tablesHTML(prob)}
    </section>
    <section class="card editor-card py-ed">
      ${chipsHTML(prob)}
      <div id="py-editor" class="editor"></div>
      <div class="py-actions"><button class="btn btn-primary" data-act="pyRun">▶ ${H('pd.run')}</button>
        <span class="muted small">${H('pd.lastLine')}</span>
        <button class="btn btn-ghost btn-sm" data-act="pyAnswer">${H('pd.answer')}</button></div>
      <div id="py-ans"></div>
    </section>
    <div id="py-res"></div>
    ${solved === PD_N ? `<section class="card py-done"><b>🎉 ${H('pd.done')}</b>${next ? `<a class="btn btn-primary" href="#/py/${next.key}/0">${H('pd.nextLesson')}: ${rubyHTML(raw('pd.t.' + next.key, L()))}</a>` : ''}</section>` : ''}
  </main>`;
}

export function pyHTML() {
  document.title = `${T('pd.title')} · SQL Practice`;
  return C.S.route.key ? lessonHTML() : hubHTML();
}
/** after render: the editor, the loading state */
export function pyMount() {
  if (unsub) { unsub(); unsub = null; }
  if (ed) { ed.destroy(); ed = null; }
  if (C.S.route.view !== 'py') return;
  pyWarm();
  unsub = onPyState(() => { const el = document.getElementById('py-status'); if (el) el.outerHTML = statusHTML(); });
  const el = document.getElementById('py-editor');
  if (!el) return;
  const prob = probOf(C.S.route.key, C.S.route.idx), d = C.S.progress.drafts || {};
  let timer;
  ed = createEditor(el, {
    lang: 'python', doc: d[prob.id] !== undefined ? d[prob.id] : '', label: 'Python', placeholder: '# Python',
    schema: Object.fromEntries(pdColumns(prob).map(x => [x.t, x.cols])),
    onRun: () => run(),
    onChange: v => { clearTimeout(timer); timer = setTimeout(() => { C.S.progress.drafts = C.S.progress.drafts || {}; C.S.progress.drafts[prob.id] = v; C.save(); }, 400); }
  });
}

/* ---------- running ---------- */
const resGrid = r => (r.kind === 'table' ? `<div class="data-box">${gridHTML({ columns: r.columns, values: r.rows }, { rowNums: r.rows.length > 3 })}</div>` : r.kind === 'value' ? `<div class="py-value">${esc(r.value)}</div>` : `<div class="res-empty">${H('pd.none')}</div>`);
async function run() {
  const { key, idx } = C.S.route, prob = probOf(key, idx), out = document.getElementById('py-res');
  if (!ed || !out) return;
  const code = ed.get();
  if (!code.trim()) return;
  if (pyState() !== 'ready') out.innerHTML = `<section class="card py-res"><p class="muted">${H('pd.notNow')}</p></section>`;
  const need = Object.keys(pdTables(prob));
  const [got, exp] = await Promise.all([pyRun(code, need), want.has(prob.id) ? want.get(prob.id) : pyRun(prob.code, need)]);
  if (exp.ok) want.set(prob.id, exp);
  if (C.S.route.view !== 'py' || probOf(C.S.route.key, C.S.route.idx).id !== prob.id) return;   // moved on meanwhile
  const ok = got.ok && exp.ok && pdSame(got.result, exp.result, prob.ordered);
  let head;
  if (got.timeout) head = `<div class="py-verdict bad">${H('pd.timeout')}</div>`;
  else if (!got.ok) head = `<div class="py-verdict bad"><b>${H('pd.err')}</b>${got.line ? ` <span class="muted">(${H('pd.errLine', { n: got.line })})</span>` : ''}<pre class="py-err">${esc(got.error)}</pre></div>`;
  else head = ok ? `<div class="py-verdict ok">✓ ${H('pd.ok')}</div>` : `<div class="py-verdict bad">${H('pd.ng.' + pdDiff(got.result, exp.result, prob.ordered))}</div>`;
  const outTxt = got.ok && got.out ? `<div class="muted small strong">${H('pd.out')}</div><pre class="py-out">${esc(got.out)}</pre>` : '';
  out.innerHTML = `<section class="card py-res">${head}${outTxt}
    <div class="py-two">${got.ok ? `<div><div class="muted small strong">${H('pd.yourResult')}</div>${resGrid(got.result)}</div>` : ''}
    ${!ok && exp.ok && (got.ok || prob.demo) ? `<div><div class="muted small strong">${H('pd.wantResult')}</div>${resGrid(exp.result)}</div>` : ''}</div></section>`;
  if (ok && !prob.demo) {
    const r = rec(key);
    if (!r.ok.includes(prob.id)) {
      r.ok.push(prob.id); r.n++;
      if (setOf(key).items.every(p => r.ok.includes(p.id))) r.clear = true;
      C.save();
      const pills = document.querySelector('.py-pills'), tmp = document.createElement('div');
      tmp.innerHTML = lessonHTML();
      if (pills) pills.replaceWith(tmp.querySelector('.py-pills'));
      const done = tmp.querySelector('.py-done'); if (done && !document.querySelector('.py-done')) document.querySelector('.py-page').appendChild(done);
    }
  }
}

export const pyActions = {
  pyRun: () => run(),
  pyIns(el) { if (ed) ed.insert(el.dataset.text, +el.dataset.back || 0); },
  pyAnswer() {
    const box = document.getElementById('py-ans'), prob = probOf(C.S.route.key, C.S.route.idx);
    if (box) box.innerHTML = box.innerHTML ? '' : `<pre class="py-code">${esc(prob.code)}</pre><button class="btn btn-ghost btn-sm" data-act="pyUse">${H('pd.useAnswer')}</button>`;
  },
  pyUse() { const prob = probOf(C.S.route.key, C.S.route.idx); if (ed) { ed.set(prob.code); ed.focus(); } },
  pyNew() {
    const r = rec(C.S.route.key);
    r.seed = String(Date.now() % 1e9); r.ok = []; C.save();
    if (C.S.route.idx === 0) C.render(); else location.hash = `#/py/${C.S.route.key}/1`;
  },
  pyRetry() { pyWarm(); const el = document.getElementById('py-status'); if (el) el.outerHTML = statusHTML(); }
};
