/* =========================================================
 * book.js — printable SQL textbook, generated from the lesson data
 *
 * Fixed page numbers (the app shows "textbook p.N" on each lesson):
 *   p.1 cover · p.2 contents · p.3 basic rules · p.4 running order (data flow)
 *   p.5 example tables · p.6–23 one page per lesson · p.24– glossary
 * Every page has a fixed A4 height, so the numbers stay correct even
 * when only one chapter is printed. Pages whose text is too long for the
 * chosen language are shrunk to fit (fitPages).
 * ========================================================= */
import { LESSONS, CHAPTERS } from './lessons.js';
import { th, t, raw, esc, rubyHTML, htmlLang } from './i18n.js';
import { highlightSQL, highlightDiff, gridHTML, problemHTML, syntaxHint, GLOSS_KEYS, fmtCell } from './ui.js';
import { orderStripHTML, joinHTML } from './viz.js';
import { MISTAKES, mistakeEffect } from './book-data.js';

export const FIRST_LESSON_PAGE = 6;
export const lessonPage = lesson => FIRST_LESSON_PAGE + lesson.index;
const GLOSSARY_PAGE = FIRST_LESSON_PAGE + LESSONS.length;
const RULES = 6;
const TERMS = ['table', 'column', 'row', 'value', 'condition', 'sort', 'asc', 'desc', 'duplicate', 'aggregate', 'group', 'join', 'null', 'result', 'error'];

/** text in language + optional second language underneath */
function two(key, o, vars, cls) {
  const v = vars || {};
  const main = th(key, o.lang, v);
  if (!o.second) return main;
  return `${main}<span class="b2 ${cls || ''}" lang="${htmlLang(o.second)}">${th(key, o.second, v)}</span>`;
}
const foot = (n, o) => `<div class="bfoot"><span>${esc(o.title)}</span><span>p.${n}</span></div>`;

/* the query used on the cover and the running-order page */
const FLOW = {
  sql: "SELECT category, COUNT(*) FROM products WHERE price >= 2500 GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category DESC LIMIT 1;",
  where: 'price >= 2500', having: 'COUNT(*) >= 2'
};

/* ---------- pages ---------- */
function coverPage(o) {
  return `<section class="bpage cover" data-page="1">
    <div class="cover-mark">SQL</div>
    <h1>${esc(o.title)}</h1>
    <p class="cover-sub">${two('book.coverSub', o)}</p>
    <div class="cover-order">${orderStripHTML(FLOW.sql, null, o.lang)}</div>
    <div class="cover-name"><span>No.</span><span>${th('test.name', o.lang)}</span></div>
    ${foot(1, o)}
  </section>`;
}
function tocPage(o) {
  const rows = [
    [3, two('book.rulesTitle', o)], [4, two('book.flowTitle', o)], [5, two('book.dataTitle', o)],
    ...CHAPTERS.flatMap(ch => [[null, `<b>${two('ch.' + ch.key, o)}</b>`, true],
      ...LESSONS.filter(l => l.ch === ch.key).map(l => [lessonPage(l), `<span class="tl-n">${l.index + 1}</span>${two(`L.${l.key}.title`, o)}`])]),
    [GLOSSARY_PAGE, two('book.glossary', o)]
  ];
  return `<section class="bpage" data-page="2"><div class="bfit"><h2 class="bh">${two('book.toc', o)}</h2>
    <ol class="toc">${rows.map(([p, label, head]) => `<li class="${head ? 'toc-ch' : ''}"><span class="toc-l">${label}</span>${p ? `<span class="toc-dots"></span><span class="toc-p">p.${p}</span>` : ''}</li>`).join('')}</ol></div>
    ${foot(2, o)}</section>`;
}
const RULE_EXAMPLES = [
  'SELECT name FROM products;',
  "WHERE category = 'Books' AND price >= 2000",
  'SELECT name, price, stock FROM products',
  'SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT …',
  'select name from products;  -- = SELECT name FROM products;',
  'WHERE table_b.id IS NULL'
];
function rulesPage(o) {
  return `<section class="bpage" data-page="3"><div class="bfit"><h2 class="bh">${two('book.rulesTitle', o)}</h2>
    <ol class="rules">${Array.from({ length: RULES }, (_, i) => `<li>${two(`book.rule${i + 1}`, o)}<pre class="sql small">${highlightSQL(RULE_EXAMPLES[i])}</pre></li>`).join('')}</ol>
    <h3 class="bh3">${two('viz.orderTitle', o)}</h3>
    ${orderStripHTML(FLOW.sql, null, o.lang)}
    <p class="bp">${two('book.flowSee', o)}</p></div>
    ${foot(3, o)}</section>`;
}

/** p.4: how the data is narrowed down, step by step, in running order */
function flowPage(engine, o) {
  const all = engine.exec('SELECT name, category, price FROM products;');
  const kept = new Set(engine.values(`SELECT name FROM products WHERE ${FLOW.where};`).map(r => r[0]));
  const rows = engine.exec(`SELECT name, category, price FROM products WHERE ${FLOW.where} ORDER BY category, id;`);
  const groups = engine.exec(`SELECT category, COUNT(*) FROM products WHERE ${FLOW.where} GROUP BY category ORDER BY category;`);
  const keptG = new Set(engine.values(`SELECT category FROM products WHERE ${FLOW.where} GROUP BY category HAVING ${FLOW.having};`).map(r => r[0]));
  const base = `SELECT category, COUNT(*) FROM products WHERE ${FLOW.where} GROUP BY category HAVING ${FLOW.having}`;
  const sel = engine.exec(base + ';'), ord = engine.exec(base + ' ORDER BY category DESC;'), lim = engine.exec(FLOW.sql);
  const tbl = (cols, trs) => `<table class="fl-t"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table>`;
  const tr = (r, cls) => `<tr class="${cls || ''}">${r.map(v => `<td>${fmtCell(v)}</td>`).join('')}</tr>`;
  const cat = {};
  groups.values.forEach((g, i) => { cat[g[0]] = i % 3; });
  const count = (n, k) => `<span class="fl-n">${th(k || 'book.flowRows', o.lang, { n })}</span>`;
  const step = (i, kw, key, body, n, unit) => `<div class="fl-step"><div class="fl-h"><span class="fl-i">${i}</span><code class="fl-kw">${kw}</code>${count(n, unit)}</div><p class="fl-d">${two(key, o)}</p>${body}</div>`;
  const s1 = step(1, 'FROM products', 'book.flow.from', tbl(all.columns, all.values.map(r => tr(r)).join('')), all.values.length);
  const s2 = step(2, 'WHERE ' + esc(FLOW.where), 'book.flow.where', tbl(all.columns, all.values.map(r => tr(r, kept.has(r[0]) ? '' : 'gone')).join('')), kept.size);
  const s3 = step(3, 'GROUP BY category', 'book.flow.group', tbl(rows.columns, rows.values.map(r => tr(r, 'g' + cat[r[1]])).join('')), groups.values.length, 'book.flowGroups');
  const s4 = step(4, 'HAVING ' + esc(FLOW.having), 'book.flow.having', tbl(['category', 'COUNT(*)'], groups.values.map(r => tr(r, (keptG.has(r[0]) ? '' : 'gone ') + 'g' + cat[r[0]])).join('')), keptG.size, 'book.flowGroups');
  const s5 = step(5, 'SELECT category, COUNT(*)', 'book.flow.select', tbl(sel.columns, sel.values.map(r => tr(r)).join('')), sel.values.length);
  const s6 = step(6, 'ORDER BY category DESC', 'book.flow.order', tbl(ord.columns, ord.values.map(r => tr(r)).join('')), ord.values.length);
  const s7 = step(7, 'LIMIT 1', 'book.flow.limit', tbl(lim.columns, lim.values.map(r => tr(r, 'final')).join('')), lim.values.length);
  return `<section class="bpage flow" data-page="4"><div class="bfit"><h2 class="bh">${two('book.flowTitle', o)}</h2>
    <p class="bp">${two('book.flowSub', o)}</p>
    <pre class="sql">${highlightSQL(FLOW.sql.replace(/ (FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT) /g, '\n$1 '))}</pre>
    <div class="fl-row two">${s1}${s2}</div><div class="fl-row two">${s3}${s4}</div><div class="fl-row three">${s5}${s6}${s7}</div></div>
    ${foot(4, o)}</section>`;
}
function dataPage(engine, o) {
  const tbl = n => `<div class="bdata"><h4>${esc(n)}</h4>${gridHTML(engine.tableData(n))}</div>`;
  return `<section class="bpage" data-page="5"><div class="bfit"><h2 class="bh">${two('book.dataTitle', o)}</h2>
    <p class="bp">${two('book.dataNote', o)}</p>
    <div class="bdata-grid">${tbl('products')}${tbl('students')}<div class="bdata-pair">${tbl('table_a')}${tbl('table_b')}</div></div></div>
    ${foot(5, o)}</section>`;
}
function mistakeHTML(engine, lesson, prob, [id, wrong, right], o) {
  right = right || prob.sql;
  const eff = mistakeEffect(engine, wrong, right);
  return `<li><div class="mx-sql"><span class="mx-x">✕</span><pre class="sql small wrong">${highlightDiff(right, wrong)}</pre>${eff ? `<span class="mx-eff">${th(eff[0], o.lang, eff[1])}</span>` : ''}</div>
    <div class="mx-why">${two('book.mx.' + id, o)}</div>
    <div class="mx-sql"><span class="mx-o">○</span><pre class="sql small right">${highlightDiff(wrong, right)}</pre></div></li>`;
}
function lessonPageHTML(engine, lesson, o) {
  const ch = CHAPTERS.find(c => c.key === lesson.ch);
  const prob = engine.demoProblem(lesson);
  const res = engine.exec(prob.sql);
  const shown = res ? { columns: res.columns, values: res.values.slice(0, 5) } : null;
  const more = res && res.values.length > 5 ? `<div class="more">… ${esc(t('prob.rows', o.lang, { n: res.values.length }))}</div>` : '';
  const steps = prob.steps.map(([k, s], i) => `<li><div class="st-t">${two(k, o)}</div><pre class="sql small">${highlightDiff(i ? prob.steps[i - 1][1] : '', s)}</pre></li>`).join('');
  const join = lesson.key === 'inner' || lesson.key === 'left' ? joinHTML(engine, prob.p, lesson.key === 'left' ? 'left' : 'inner', o.lang) : '';
  const n = lessonPage(lesson);
  return `<section class="bpage lesson" data-page="${n}" style="--cc:var(--c-${ch.key})"><div class="bfit">
    <div class="bl-head"><span class="bl-num">${lesson.index + 1}</span><div><small>${th('ch.' + ch.key, o.lang)}</small><h2>${two(`L.${lesson.key}.title`, o, null, 'h')}</h2></div></div>
    <div class="bl-point"><b>${th('lesson.point', o.lang)}</b>${two(`L.${lesson.key}.point`, o)}</div>
    <div class="bl-syntax"><b>${th('book.syntax', o.lang)}</b><pre class="sql">${highlightSQL(syntaxHint(lesson, o.lang))}</pre></div>
    <div class="bl-ex"><b>${th('book.example', o.lang)}</b>
      <p class="bl-q">${problemHTML(prob, o.lang)}${o.second ? `<span class="b2" lang="${htmlLang(o.second)}">${problemHTML(prob, o.second)}</span>` : ''}</p>
      <pre class="sql">${highlightSQL(prob.sql)}</pre>
    </div>
    <div class="bl-cols">
      <div class="bl-steps"><b>${th('book.thinking', o.lang)}</b><ol>${steps}</ol></div>
      <div class="bl-res"><b>${th('book.result', o.lang)}</b>${join}${gridHTML(shown)}${more}</div>
    </div>
    <div class="bl-mis"><b>${th('book.mistakes', o.lang)}</b><ul>${(MISTAKES[lesson.key] || []).map(m => mistakeHTML(engine, lesson, prob, m, o)).join('')}</ul></div>
    ${o.memo ? `<div class="bl-memo"><b>${th('book.memo', o.lang)}</b></div>` : ''}</div>
    ${foot(n, o)}
  </section>`;
}
function glossaryPage(o) {
  const cols = [o.lang, ...(o.second ? [o.second] : []), ...(o.lang !== 'en' && o.second !== 'en' ? ['en'] : [])];
  const cell = (key, c) => `<td lang="${htmlLang(c)}">${rubyHTML(raw(key, c))}</td>`;
  return `<section class="bpage gloss" data-page="${GLOSSARY_PAGE}"><h2 class="bh">${two('book.glossary', o)}</h2>
    <h3 class="bh3">${th('words.terms', o.lang)}</h3>
    <table class="gtable"><tbody>${TERMS.map(k => `<tr>${cols.map(c => cell('term.' + k, c)).join('')}</tr>`).join('')}</tbody></table>
    <h3 class="bh3">${th('words.keywords', o.lang)}</h3>
    <table class="gtable kw"><tbody>${GLOSS_KEYS.map(k => `<tr><th><code>${esc(k)}</code></th>${cols.filter(c => c !== 'en' || o.lang === 'en').map(c => cell('kw.' + k, c)).join('')}</tr>`).join('')}</tbody></table>
    <div class="bfoot"><span>${esc(o.title)}</span><span>p.${GLOSSARY_PAGE}–</span></div></section>`;
}

/**
 * o: { lang, second, title, parts: {cover, front, lessons:[keys], glossary}, memo }
 */
export function bookHTML(engine, o) {
  o = Object.assign({ memo: true }, o);
  o.title = (o.title || '').trim() || t('book.defaultTitle', o.lang);
  const out = [];
  if (o.parts.cover) out.push(coverPage(o), tocPage(o));
  if (o.parts.front) out.push(rulesPage(o), flowPage(engine, o), dataPage(engine, o));
  LESSONS.filter(l => o.parts.lessons.includes(l.key)).forEach(l => out.push(lessonPageHTML(engine, l, o)));
  if (o.parts.glossary) out.push(glossaryPage(o));
  return out.join('');
}

/**
 * Shrink the contents of any page that is taller than A4 (long languages,
 * a second language, other fonts on the printing computer). Call after the
 * pages are in the document; measured in the reader's own browser.
 */
export function fitPages(root) {
  root.querySelectorAll('.bpage .bfit').forEach(box => {
    // scrollHeight and clientHeight are both in the box's own (zoomed) units
    let z = 1;
    box.style.zoom = '';
    while (box.scrollHeight > box.clientHeight + 1 && z > 0.62) { z = Math.round((z - 0.02) * 100) / 100; box.style.zoom = z; }
    box.closest('.bpage').classList.toggle('shrunk', z < 1);
  });
}
