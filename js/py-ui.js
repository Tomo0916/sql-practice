/* =========================================================
 * py-ui.js — the Python (pandas) course pages: #/py (the lessons) and #/py/<lesson>/<n>
 * (0 = the example, 1…PD_N = practice). Python runs in a worker (pyrun.js); the answer is
 * the value of the last line, compared with the reference answer's value.
 * Progress: S.progress.py[lesson] = { seed, ok: [problem ids solved], n (solved in all), clear }
 * ========================================================= */
import { th, t, esc, rubyHTML, raw } from './i18n.js';
import { gridHTML, highlightPy, pyDescHTML } from './ui.js';
import { createEditor } from './editor.js';
import { PD_LESSONS, PD_BY_KEY, PD_N, pdSet, pdTables, pdColumns, pdSame, pdDiff } from './pandas.js';
import { pyRun, pyWarm, pyState, onPyState } from './pyrun.js';
import { PE_N, PE_TYPES, peSet, peNeed, peTraceback, cleanTb } from './pyerrors.js';

let C = null;   // { S, L, save, render }
const want = new Map();   // problem id → the reference answer's result
let ed = null, unsub = null;
const L = () => C.L();
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
/** a text with `code` marks */
const P = k => rubyHTML(raw(k, L())).replace(/`([^`]+)`/g, '<code>$1</code>');

export function installPy(ctx) { C = ctx; }
export const pyRoute = h => (h[0] !== 'py' ? null
  : h[1] === 'errors' ? { view: 'py', key: null, err: true, idx: Math.min(PE_N, Math.max(0, parseInt(h[2], 10) || 0)) }
    : { view: 'py', key: PD_BY_KEY[h[1]] ? h[1] : null, idx: Math.min(PD_N, Math.max(0, parseInt(h[2], 10) || 0)) });

const rec = key => { const p = C.S.progress.py = C.S.progress.py || {}; return (p[key] = Object.assign({ seed: '1', ok: [], n: 0, clear: false }, p[key])); };
const setOf = key => pdSet(key, rec(key).seed);
const probOf = (key, i) => { const s = setOf(key); return i === 0 ? s.demo : s.items[i - 1]; };

/** the problem text: values as code, nested texts (cmp.ge …) filled the same way */
const descHTML = prob => pyDescHTML(prob, L());
/* a Python problem in a quick test (#/quick/<n>): the student page draws it with pyQuickHTML */
let qProb = null;
const isQuick = () => C.S.route.view === 'quick';
const curProb = () => (isQuick() ? qProb : probOf(C.S.route.key, C.S.route.idx));
const pyLast = new Map();   // problem id → the last result shown (kept when the page is drawn again)

/* ---------- the list of lessons ---------- */
function hubHTML() {
  const done = PD_LESSONS.filter(l => rec(l.key).clear).length;
  return `<main class="wrap narrow py-page">
    <section class="card py-hero"><div class="py-logo" aria-hidden="true">pd</div><div>
      <h1>${H('pd.title')}</h1><p class="muted">${H('pd.sub')}</p>
      <div class="bar"><i style="width:${Math.round(done / PD_LESSONS.length * 100)}%"></i></div>
      <p class="muted small">${done} / ${PD_LESSONS.length}</p></div></section>
    ${statusHTML()}
    <a class="card pe-card" href="#/py/errors/0"><span class="pe-ic" aria-hidden="true">!</span><span><b>${H('pe.title')}</b><span class="muted small">${H('pe.homeSub')}</span></span>
      <span class="tag">${peRec().ok.length} / ${PE_N}</span></a>
    <ul class="lesson-list py-list card">${PD_LESSONS.map(l => {
      const r = rec(l.key), set = setOf(l.key), n = set.items.filter(p => r.ok.includes(p.id)).length;
      return `<li><a class="lesson-link ${r.clear ? 'done' : ''}" href="#/py/${l.key}/0">
        <span class="lesson-num">${r.clear ? '✓' : l.no}</span><span class="lesson-name">${rubyHTML(raw('pd.t.' + l.key, L()))}</span>
        <span class="dots" aria-label="${n}/${PD_N}">${set.items.map(p => `<i class="${r.ok.includes(p.id) ? 'on' : ''}"></i>`).join('')}</span></a>
        <a class="lec-link" href="#/lecture/${l.key}" title="${esc(T('lec.open'))}">📽</a></li>`;
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
    <section class="card py-head"><div class="py-head-top"><small class="muted">Python · ${lesson.no}</small><a class="btn btn-ghost btn-sm lec-open" href="#/lecture/${key}">📽 ${H('lec.open')}</a></div><h1>${rubyHTML(raw('pd.t.' + key, L()))}</h1><p class="py-point">${P('pd.p.' + key)}</p></section>
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
  document.title = `${T(C.S.route.err ? 'pe.title' : 'pd.title')} · SQL Practice`;
  return C.S.route.err ? errHTML() : C.S.route.key ? lessonHTML() : hubHTML();
}
/** after render: the editor, the loading state */
export function pyMount() {
  if (unsub) { unsub(); unsub = null; }
  if (ed) { ed.destroy(); ed = null; }
  if (C.S.route.view !== 'py' && !(isQuick() && qProb && document.getElementById('py-editor'))) return;
  pyWarm();
  unsub = onPyState(() => { const el = document.getElementById('py-status'); if (el) el.outerHTML = statusHTML(); });
  const el = document.getElementById('py-editor');
  if (!el) return;
  const prob = curProb(), d = C.S.progress.drafts || {};
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
  const prob = curProb(), key = prob && prob.lesson, quick = isQuick(), out = document.getElementById('py-res');
  if (!ed || !out || !prob) return;
  const code = ed.get();
  if (!code.trim()) return;
  C.S.progress.drafts = C.S.progress.drafts || {}; C.S.progress.drafts[prob.id] = code;
  if (pyState() !== 'ready') out.innerHTML = `<section class="card py-res"><p class="muted">${H('pd.notNow')}</p></section>`;
  const need = Object.keys(pdTables(prob));
  const [got, exp] = await Promise.all([pyRun(code, need), want.has(prob.id) ? want.get(prob.id) : pyRun(prob.code, need)]);
  if (exp.ok) want.set(prob.id, exp);
  if ((C.S.route.view !== 'py' && !isQuick()) || !curProb() || curProb().id !== prob.id) return;   // moved on meanwhile
  const ok = got.ok && exp.ok && pdSame(got.result, exp.result, prob.ordered);
  let head;
  if (got.timeout) head = `<div class="py-verdict bad">${H('pd.timeout')}</div>`;
  else if (!got.ok) head = `<div class="py-verdict bad"><b>${H('pd.err')}</b>${got.line ? ` <span class="muted">(${H('pd.errLine', { n: got.line })})</span>` : ''}${tbHTML(got.full ? cleanTb(got.full, code) : got.error)}<a class="small" href="#/py/errors/0">${H('pe.howTo')} →</a></div>`;
  else head = ok ? `<div class="py-verdict ok">✓ ${H('pd.ok')}</div>` : `<div class="py-verdict bad">${H('pd.ng.' + pdDiff(got.result, exp.result, prob.ordered))}</div>`;
  const outTxt = got.ok && got.out ? `<div class="muted small strong">${H('pd.out')}</div><pre class="py-out">${esc(got.out)}</pre>` : '';
  // a quick test: the answer counts like any other (the student page records it); no correct result before the end
  const counted = quick && C.quickAnswer ? C.quickAnswer(prob, ok, code, ok ? null : got.ok ? pdDiff(got.result, exp.result, prob.ordered) : got.timeout ? 'timeout' : 'error') : true;
  const next = quick && ok && C.quickNext ? C.quickNext(prob) : '';
  const html = `<section class="card py-res">${head}${outTxt}
    <div class="py-two">${got.ok ? `<div><div class="muted small strong">${H('pd.yourResult')}</div>${resGrid(got.result)}</div>` : ''}
    ${!quick && !ok && exp.ok && (got.ok || prob.demo) ? `<div><div class="muted small strong">${H('pd.wantResult')}</div>${resGrid(exp.result)}</div>` : ''}</div>${next}</section>`;
  pyLast.set(prob.id, html);
  if (quick) { if (counted !== false) C.render(); return; }
  out.innerHTML = html;
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

/** a Python problem of a quick test: the question, the editor with quick input, and the last result */
export function pyQuickHTML(prob) {
  qProb = prob;
  return `${statusHTML()}
    <section class="card py-q"><div class="py-tag">Python · ${PD_BY_KEY[prob.lesson].no}</div><h2 class="py-desc">${descHTML(prob)}</h2>${tablesHTML(prob)}</section>
    <section class="card editor-card py-ed">${chipsHTML(prob)}<div id="py-editor" class="editor"></div>
      <div class="py-actions"><button class="btn btn-primary" data-act="pyRun">▶ ${H('pd.run')}</button><span class="muted small">${H('pd.lastLine')}</span></div></section>
    <div id="py-res">${pyLast.get(prob.id) || ''}</div>`;
}
/** start loading Python (a quick test with Python problems, during its countdown) */
export const pyPrepare = () => { pyWarm(); };
export const pyActions = {
  pyRun: () => run(),
  pyIns(el) { if (ed) ed.insert(el.dataset.text, +el.dataset.back || 0); },
  pyAnswer() {
    const box = document.getElementById('py-ans'), prob = probOf(C.S.route.key, C.S.route.idx);
    if (box) box.innerHTML = box.innerHTML ? '' : `<pre class="py-code">${highlightPy(prob.code)}</pre><button class="btn btn-ghost btn-sm" data-act="pyUse">${H('pd.useAnswer')}</button>`;
  },
  pyUse() { const prob = probOf(C.S.route.key, C.S.route.idx); if (ed) { ed.set(prob.code); ed.focus(); } },
  pyNew() {
    const r = rec(C.S.route.key);
    r.seed = String(Date.now() % 1e9); r.ok = []; C.save();
    if (C.S.route.idx === 0) C.render(); else location.hash = `#/py/${C.S.route.key}/1`;
  },
  pyRetry() { pyWarm(); const el = document.getElementById('py-status'); if (el) el.outerHTML = statusHTML(); }
};

/* ---------- reading errors: #/py/errors/<n> (0 = the example) ---------- */
const peRec = () => (C.S.progress.pyErr = Object.assign({ seed: '1', ok: [], done: [] }, C.S.progress.pyErr));
const peSetNow = () => peSet(peRec().seed);
const peProbOf = i => { const s = peSetNow(); return i === 0 ? s.demo : s.items[i - 1]; };
const peAns = new Map();   // problem id → { m: the meaning picked first, f: the fix picked first }
/** a traceback, coloured: the error line, “line n”, the ^ marks */
function tbHTML(text) {
  const lines = String(text).split('\n'), lastI = lines.length - 1;
  return `<pre class="pe-tb">${lines.map((l, i) => {
    if (i === lastI) { const m = /^([\w.]+)(:?)(.*)$/.exec(l); return m ? `<span class="pe-last"><b>${esc(m[1])}</b>${esc(m[2] + m[3])}</span>` : esc(l); }
    if (/^\s*\^+\s*$/.test(l)) return `<span class="pe-caret">${esc(l)}</span>`;
    return esc(l).replace(/line (\d+)/, '<span class="pe-line">line $1</span>');
  }).join('\n')}</pre>`;
}
const fill = (v) => Object.fromEntries(Object.entries(v || {}).map(([a, b]) => [a, `<code>${esc(b)}</code>`]));
function guideHTML(open) {
  return `<details class="card pe-guide" ${open ? 'open' : ''}><summary><b>${H('pe.guide')}</b></summary>
    <div class="pe-guide-body"><div class="pe-anno">${tbHTML('Traceback (most recent call last):\n  File "<answer>", line 2, in <module>\n    top.sort_values("prise")\n  …\nKeyError: \'prise\'')}
      <ol class="pe-steps"><li>${H('pe.g.last')}</li><li>${H('pe.g.line')}</li><li>${H('pe.g.dots')}</li><li>${H('pe.g.caret')}</li></ol></div>
      <h3>${H('pe.cheat')}</h3><dl class="pe-cheat">${PE_TYPES.map(k => `<dt><code>${k}</code></dt><dd>${H('pe.k.' + k)}</dd>`).join('')}</dl></div></details>`;
}
function errHTML() {
  const idx = C.S.route.idx, r = peRec(), set = peSetNow(), prob = peProbOf(idx), a = peAns.get(prob.id) || {};
  const pill = (j, label, p) => `<a class="py-pill ${j === idx ? 'cur' : ''} ${p && r.ok.includes(p.id) ? 'on' : p && r.done.includes(p.id) ? 'half' : ''} ${j === 0 ? 'demo' : ''}" href="#/py/errors/${j}">${label}</a>`;
  const lineNo = prob.lines.length > 1;
  const m = a.m !== undefined, f = a.f !== undefined;
  const choice = (act, i, label, picked, right, open) => `<button class="pe-choice ${open && i === right ? 'ok' : ''} ${open && picked === i && i !== right ? 'bad' : ''}" data-act="${act}" data-i="${i}" ${open ? 'disabled' : ''}>${label}${open && i === right ? ' ✓' : ''}</button>`;
  const firstOk = set.items.filter(p => r.ok.includes(p.id)).length;
  return `<main class="wrap py-page pe-page">
    <div class="py-crumb"><a href="#/py">← ${H('pd.lessons')}</a></div>
    <section class="card py-head"><small class="muted">Python</small><h1>${H('pe.title')}</h1><p class="py-point">${H('pe.sub')}</p></section>
    ${guideHTML(idx === 0)}
    <nav class="py-pills">${pill(0, `★ ${esc(T('pd.example'))}`)}<span class="py-sep">${H('pd.practice')}</span>
      ${set.items.map((p, j) => pill(j + 1, String(j + 1), p)).join('')}
      <button class="btn btn-ghost btn-sm py-new" data-act="peNew">↻ ${H('pd.newSet')}</button>
      <span class="muted small">${H('pe.score', { n: firstOk, m: PE_N })}</span></nav>
    <section class="card pe-q ${prob.demo ? 'is-demo' : ''}">
      <div class="py-tag">${prob.demo ? `★ ${H('pd.example')}` : H('pe.problem', { n: idx })}</div>
      <div class="pe-two">
        <div><div class="muted small strong">${H('pe.code')}</div>
          <ol class="pe-code ${lineNo ? 'nums' : ''}">${prob.lines.map((l, i) => `<li class="${i + 1 === prob.at ? 'at' : ''}"><code>${highlightPy(l)}</code></li>`).join('')}</ol></div>
        <div><div class="muted small strong">${H('pe.output')}</div>${tbHTML(peTraceback(prob))}</div>
      </div>
      <div class="pe-step"><h2>① ${H('pe.q1')}</h2>
        <div class="pe-choices">${prob.meanings.map((c, i) => choice('peM', i, H('pe.m.' + c), a.m, prob.meaning, m)).join('')}</div>
        ${m ? `<p class="pe-fb ${a.m === prob.meaning ? 'ok' : 'bad'}">${a.m === prob.meaning ? '✓ ' + H('pe.ok') : H('pe.ng')}</p>
          <div class="pe-why"><p>${th('pe.x.' + prob.cat, L(), fill(prob.v))}</p><p class="muted small"><code>${esc(prob.type)}</code>: ${H('pe.k.' + prob.type)}</p></div>` : ''}</div>
      ${m ? `<div class="pe-step"><h2>② ${H('pe.q2')}</h2>
        <div class="pe-choices code">${prob.fixes.map((c, i) => choice('peF', i, `<code>${highlightPy(c)}</code>`, a.f, prob.fixAt, f)).join('')}</div>
        ${f ? `<p class="pe-fb ${a.f === prob.fixAt ? 'ok' : 'bad'}">${a.f === prob.fixAt ? '✓ ' + H('pe.ok') : H('pe.ng')}</p>
          <div class="py-actions"><button class="btn btn-ghost btn-sm" data-act="peRun">▶ ${H('pe.tryRun')}</button>
          ${idx < PE_N ? `<a class="btn btn-primary" href="#/py/errors/${idx + 1}">${H('pe.next')} →</a>` : `<b class="pe-done">🎉 ${H('pe.done')}</b>`}</div>
          <div id="pe-run"></div>` : ''}</div>` : ''}
    </section>
  </main>`;
}
function peAnswer(key, i) {
  const prob = peProbOf(C.S.route.idx), a = peAns.get(prob.id) || {};
  if (a[key] !== undefined) return;
  a[key] = i; peAns.set(prob.id, a);
  if (key === 'f' && !prob.demo) {
    const r = peRec();
    if (!r.done.includes(prob.id)) r.done.push(prob.id);
    if (a.m === prob.meaning && a.f === prob.fixAt && !r.ok.includes(prob.id)) r.ok.push(prob.id);
    C.save();
  }
  const y = window.scrollY; C.render(); window.scrollTo(0, y);
}
Object.assign(pyActions, {
  peM: el => peAnswer('m', +el.dataset.i),
  peF: el => peAnswer('f', +el.dataset.i),
  peNew() { const r = peRec(); r.seed = String(Date.now() % 1e9); r.ok = []; r.done = []; C.save(); if (C.S.route.idx === 1) C.render(); else location.hash = '#/py/errors/1'; },
  async peRun() {
    const prob = peProbOf(C.S.route.idx), box = document.getElementById('pe-run');
    if (!box) return;
    box.innerHTML = `<p class="muted small">${H(pyState() === 'ready' ? 'pd.run' : 'pd.notNow')}…</p>`;
    const need = peNeed(prob), [bad, good] = [await pyRun(prob.code, need), await pyRun(prob.fixes[prob.fixAt], need)];
    if (!document.getElementById('pe-run')) return;
    box.innerHTML = `<div class="py-two"><div><div class="muted small strong">${H('pe.ranBad')}</div>${bad.ok ? resGrid(bad.result) : tbHTML(bad.full ? cleanTb(bad.full, prob.code) : bad.error)}</div>
      <div><div class="muted small strong">${H('pe.ranFix')}</div>${good.ok ? resGrid(good.result) : tbHTML(good.error)}</div></div>`;
  }
});
