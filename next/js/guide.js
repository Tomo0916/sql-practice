/* =========================================================
 * guide.js — the same problem in Excel or Python (opens in its own window).
 * guide.html?l=<lesson>&i=<problem index>&set=<set code>&tool=excel|python&lang=<code>
 * The steps use the problem's real table and column names, and the answer
 * comes from the app's SQL engine, so the numbers can be compared.
 * ========================================================= */
import { loadLang, detectLang, htmlLang, t, th, esc, rubyHTML } from './i18n.js';
import { SqlEngine, LESSON_BY_KEY } from './engine.js';
import { loadSettings } from './store.js';
import { applySettings, gridHTML, problemHTML, lessonTitleHTML, themeHTML } from './ui.js';
import { guideSteps } from './analysis-content.js';
import { blocksHTML, contentLang, downloadCSV, saveFile } from './analysis-ui.js';

const q = new URLSearchParams(location.search);
const settings = loadSettings(null);
const lang = detectLang(q.get('lang') || settings.lang);
let tool = q.get('tool') === 'python' ? 'python' : 'excel';
const app = document.getElementById('app');
const H = k => th(k, lang);
let engine, prob;

function fillVars(s, vars) { return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)); }
function render() {
  applySettings(settings, htmlLang(lang));
  const lesson = LESSON_BY_KEY[prob.lesson];
  const vars = Object.assign({}, prob.p);
  const steps = guideSteps(prob.lesson, prob.p.w, tool);
  const L = contentLang(lang);
  const res = engine.exec(prob.sql);
  const stepHTML = steps.map((s, i) => `<li><div class="g-text">${blocksHTML([['p', s[L] || s.en]], vars)}</div>${s.code ? `<pre class="g-code"><code>${esc(fillVars(s.code, vars))}</code><button class="btn btn-ghost btn-xs" data-copy="${i}">${H('an.g.copy')}</button></pre>` : ''}</li>`).join('');
  document.title = `${t(`L.${prob.lesson}.title`, lang)} · ${tool === 'excel' ? 'Excel' : 'Python'}`;
  app.innerHTML = `<main class="wrap guide">
    <div class="g-head"><div><small class="muted">${lessonTitleHTML(lesson, lang)}</small>
      <h1>${tool === 'excel' ? '<span class="tool-ic xl">X</span>' : '<span class="tool-ic py">Py</span>'}${H(tool === 'excel' ? 'an.excel' : 'an.python')}</h1></div>
      <div class="seg g-seg"><button class="${tool === 'excel' ? 'on' : ''}" data-tool="excel">Excel</button><button class="${tool === 'python' ? 'on' : ''}" data-tool="python">Python</button></div></div>
    <section class="card g-prob"><span class="tag">${prob.stage === 'demo' ? H('stage.demoSub') : themeHTML(prob, lang)}</span><p class="prob-text">${problemHTML(prob, lang)}</p>
      <div class="row-btns left"><button class="btn btn-primary btn-sm" data-act="csv">⤓ ${esc(prob.p.t)}.csv</button>
      ${tool === 'python' ? `<button class="btn btn-ghost btn-sm" data-act="nb">⤓ ${H('an.g.notebook')}</button>` : ''}</div></section>
    <section class="card g-steps"><ol>${stepHTML}</ol></section>
    <section class="card g-answer"><h2>${H('an.g.answer')}</h2>${gridHTML(res, { rowNums: false })}
      <p class="muted small">${H('an.g.sqlNote')}</p><pre class="sql">${esc(prob.sql)}</pre></section>
  </main>`;
  app.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const code = fillVars(steps[+b.dataset.copy].code, vars);
    navigator.clipboard && navigator.clipboard.writeText(code).then(() => { b.textContent = '✓'; setTimeout(() => (b.innerHTML = H('an.g.copy')), 1200); });
  }));
  app.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { tool = b.dataset.tool; q.set('tool', tool); history.replaceState(null, '', '?' + q); render(); }));
  const csv = app.querySelector('[data-act=csv]'); if (csv) csv.addEventListener('click', () => downloadCSV(prob.p.t));
  const nb = app.querySelector('[data-act=nb]'); if (nb) nb.addEventListener('click', () => saveFile(`${prob.lesson}_${prob.p.t}.ipynb`, notebook(steps, vars, L), 'application/x-ipynb+json'));
}
/** a Jupyter notebook with the steps: text as Markdown cells, code as code cells */
function notebook(steps, vars, L) {
  const md = text => ({ cell_type: 'markdown', metadata: {}, source: [text] });
  const cells = [md(`# ${t(`L.${prob.lesson}.title`, lang)}\n\n${t(LESSON_BY_KEY[prob.lesson].descKey ? LESSON_BY_KEY[prob.lesson].descKey(prob.p) : `L.${prob.lesson}.desc`, lang, vars)}`)];
  steps.forEach(s => {
    cells.push(md(fillVars((s[L] || s.en).replace(/\{([^{}|]+)\|([^{}]+)\}/g, '$1'), vars)));
    if (s.code) cells.push({ cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: fillVars(s.code, vars).split('\n').map((l, i, a) => (i < a.length - 1 ? l + '\n' : l)) });
  });
  return JSON.stringify({ cells, metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python' } }, nbformat: 4, nbformat_minor: 5 }, null, 1);
}

(async function start() {
  await Promise.all([loadLang('en'), loadLang(lang)]);
  app.innerHTML = `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`;
  engine = new SqlEngine(await window.initSqlJs({ locateFile: f => 'vendor/' + f }));
  const lesson = LESSON_BY_KEY[q.get('l')] || LESSON_BY_KEY.an_overview;
  const probs = engine.lessonProblems(lesson, q.get('set') || 'demo');
  prob = probs[Math.max(0, Math.min(probs.length - 1, parseInt(q.get('i'), 10) || 0))];
  render();
})();
