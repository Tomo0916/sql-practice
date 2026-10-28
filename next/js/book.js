/* =========================================================
 * book.js — printable SQL textbook, generated from the lesson data
 *
 * Fixed page numbers (the app shows "textbook p.N" on each lesson):
 *   p.1 cover · p.2 contents · p.3 basic rules + writing/running order
 *   p.4 example tables · p.5–22 one page per lesson · p.23– glossary
 * Every lesson page has a fixed height, so the numbers stay correct even
 * when only one chapter is printed.
 * ========================================================= */
import { LESSONS, CHAPTERS } from './lessons.js';
import { DEMO_DATASETS } from './datasets.js';
import { th, t, raw, esc, rubyHTML, htmlLang } from './i18n.js';
import { highlightSQL, highlightDiff, gridHTML, problemHTML, syntaxHint, GLOSS_KEYS } from './ui.js';
import { orderStripHTML, joinHTML } from './viz.js';

export const FIRST_LESSON_PAGE = 5;
export const lessonPage = lesson => FIRST_LESSON_PAGE + lesson.index;
const GLOSSARY_PAGE = FIRST_LESSON_PAGE + LESSONS.length;
const RULES = 6;
const TERMS = ['table', 'column', 'row', 'value', 'condition', 'sort', 'asc', 'desc', 'duplicate', 'aggregate', 'group', 'join', 'null', 'result', 'error'];

/** Typical mistakes shown on each lesson page (texts come from the diagnosis messages). */
const MISTAKES = {
  select: [['missingComma'], ['trailingComma']],
  between: [['fix_gtGe'], ['tooFew', { a: 3, b: 5 }]],
  like: [['likePercent'], ['quote', { v: 'Pro' }]],
  distinct: [['fix_distinct'], ['reversed']],
  topn: [['clauseOrder', { a: 'WHERE', b: 'ORDER BY' }], ['fix_dir']],
  offset: [['fix_offsetOne'], ['needOrder']],
  aggfn: [['cols', { a: 1, b: 2 }], ['fullwidth', { c: '（' }]],
  whereagg: [['quote', { v: 'IT' }], ['aggWhere']],
  groupby: [['tooFew', { a: 1, b: 4 }], ['cols', { a: 2, b: 3 }]],
  grouporder: [['needOrder'], ['reversed']],
  having: [['aggWhere'], ['fix_whereHaving']],
  wherehaving: [['clauseOrder', { a: 'WHERE', b: 'GROUP BY' }], ['havingNoGroup']],
  inner: [['ambiguous', { c: 'id', t: 'table_a / table_b' }], ['fix_innerLeft']],
  innercols: [['ambiguous', { c: 'id', t: 'table_a / table_b' }], ['tablePrefix', { bad: 'table_c.id', t: 'table_a / table_b' }]],
  innerwhere: [['clauseOrder', { a: 'JOIN', b: 'WHERE' }], ['quote', { v: 'A' }]],
  left: [['tooFew', { a: 3, b: 4 }], ['fix_innerLeft']],
  antijoin: [['isNull'], ['fix_innerLeft']],
  leftorder: [['fix_dir'], ['ambiguous', { c: 'id', t: 'table_a / table_b' }]]
};
export const MISTAKE_KEYS = [...new Set(Object.values(MISTAKES).flat().map(m => 'dx.' + m[0]))];

/** text in language + optional second language underneath */
function two(key, o, vars, cls) {
  const v = vars || {};
  const main = th(key, o.lang, v);
  if (!o.second) return main;
  return `${main}<span class="b2 ${cls || ''}" lang="${htmlLang(o.second)}">${th(key, o.second, v)}</span>`;
}
const codeVars = vars => Object.fromEntries(Object.entries(vars || {}).map(([k, v]) => [k, `<code>${esc(v)}</code>`]));
const foot = (n, o) => `<div class="bfoot"><span>${esc(o.title)}</span><span>p.${n}</span></div>`;

/* ---------- pages ---------- */
function coverPage(o) {
  return `<section class="bpage cover" data-page="1">
    <div class="cover-mark">SQL</div>
    <h1>${esc(o.title)}</h1>
    <p class="cover-sub">${two('book.coverSub', o)}</p>
    <div class="cover-order">${orderStripHTML("SELECT category, COUNT(*) FROM products WHERE price > 1000 GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category LIMIT 3", null, o.lang)}</div>
    <div class="cover-name"><span>${th('test.class', o.lang)}</span><span>${th('test.name', o.lang)}</span></div>
    ${foot(1, o)}
  </section>`;
}
function tocPage(o) {
  const rows = [
    [3, two('book.rulesTitle', o)], [4, two('book.dataTitle', o)],
    ...CHAPTERS.flatMap(ch => [[null, `<b>${two('ch.' + ch.key, o)}</b>`, true],
      ...LESSONS.filter(l => l.ch === ch.key).map(l => [lessonPage(l), `<span class="tl-n">${l.index + 1}</span>${two(`L.${l.key}.title`, o)}`])]),
    [GLOSSARY_PAGE, two('book.glossary', o)]
  ];
  return `<section class="bpage" data-page="2"><h2 class="bh">${two('book.toc', o)}</h2>
    <ol class="toc">${rows.map(([p, label, head]) => `<li class="${head ? 'toc-ch' : ''}"><span class="toc-l">${label}</span>${p ? `<span class="toc-dots"></span><span class="toc-p">p.${p}</span>` : ''}</li>`).join('')}</ol>
    ${foot(2, o)}</section>`;
}
function rulesPage(o) {
  return `<section class="bpage" data-page="3"><h2 class="bh">${two('book.rulesTitle', o)}</h2>
    <ol class="rules">${Array.from({ length: RULES }, (_, i) => `<li>${two(`book.rule${i + 1}`, o)}<pre class="sql small">${highlightSQL(RULE_EXAMPLES[i])}</pre></li>`).join('')}</ol>
    <h3 class="bh3">${two('viz.orderTitle', o)}</h3>
    <p class="bp">${two('viz.orderSub', o)}</p>
    ${orderStripHTML("SELECT category, COUNT(*) FROM products WHERE price > 1000 GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category LIMIT 3", null, o.lang)}
    ${foot(3, o)}</section>`;
}
const RULE_EXAMPLES = [
  'SELECT name FROM products;',
  "WHERE category = 'Books' AND price >= 2000",
  'SELECT name, price, stock FROM products',
  'SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT …',
  'select name from products;  -- = SELECT name FROM products;',
  'WHERE table_b.id IS NULL'
];
function dataPage(engine, o) {
  const tbl = n => `<div class="bdata"><h4>${esc(n)}</h4>${gridHTML(engine.tableData(n))}</div>`;
  return `<section class="bpage" data-page="4"><h2 class="bh">${two('book.dataTitle', o)}</h2>
    <p class="bp">${two('book.dataNote', o)}</p>
    <div class="bdata-grid">${tbl('products')}${tbl('students')}<div class="bdata-pair">${tbl('table_a')}${tbl('table_b')}</div></div>
    ${foot(4, o)}</section>`;
}
function lessonPageHTML(engine, lesson, o) {
  const ch = CHAPTERS.find(c => c.key === lesson.ch);
  const prob = engine.demoProblem(lesson);
  const res = engine.exec(prob.sql);
  const shown = res ? { columns: res.columns, values: res.values.slice(0, 6) } : null;
  const more = res && res.values.length > 6 ? `<div class="more">… ${esc(t('prob.rows', o.lang, { n: res.values.length }))}</div>` : '';
  const steps = prob.steps.map(([k, s], i) => `<li><div class="st-t">${two(k, o)}</div><pre class="sql small">${highlightDiff(i ? prob.steps[i - 1][1] : '', s)}</pre></li>`).join('');
  const join = lesson.key === 'inner' || lesson.key === 'left' ? joinHTML(engine, prob.p, lesson.key === 'left' ? 'left' : 'inner', o.lang) : '';
  const n = lessonPage(lesson);
  return `<section class="bpage lesson" data-page="${n}" style="--cc:var(--c-${ch.key})">
    <div class="bl-head"><span class="bl-num">${lesson.index + 1}</span><div><small>${th('ch.' + ch.key, o.lang)}</small><h2>${two(`L.${lesson.key}.title`, o, null, 'h')}</h2></div></div>
    <div class="bl-point"><b>${th('lesson.point', o.lang)}</b>${two(`L.${lesson.key}.point`, o)}</div>
    <div class="bl-row">
      <div class="bl-syntax"><b>${th('book.syntax', o.lang)}</b><pre class="sql">${highlightSQL(syntaxHint(lesson, o.lang))}</pre></div>
    </div>
    <div class="bl-ex"><b>${th('book.example', o.lang)}</b>
      <p class="bl-q">${problemHTML(prob, o.lang)}${o.second ? `<span class="b2" lang="${htmlLang(o.second)}">${problemHTML(prob, o.second)}</span>` : ''}</p>
      <pre class="sql">${highlightSQL(prob.sql)}</pre>
    </div>
    <div class="bl-cols">
      <div class="bl-steps"><b>${th('book.thinking', o.lang)}</b><ol>${steps}</ol></div>
      <div class="bl-res"><b>${th('book.result', o.lang)}</b>${join}${gridHTML(shown)}${more}</div>
    </div>
    <div class="bl-mis"><b>${th('book.mistakes', o.lang)}</b><ul>${(MISTAKES[lesson.key] || []).map(([k, v]) => `<li>${two('dx.' + k, o, codeVars(v))}</li>`).join('')}</ul></div>
    ${o.memo ? `<div class="bl-memo"><b>${th('book.memo', o.lang)}</b></div>` : ''}
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
  if (o.parts.front) out.push(rulesPage(o), dataPage(engine, o));
  LESSONS.filter(l => o.parts.lessons.includes(l.key)).forEach(l => out.push(lessonPageHTML(engine, l, o)));
  if (o.parts.glossary) out.push(glossaryPage(o));
  return out.join('');
}
export const BOOK_STRINGS = ['book.defaultTitle', 'book.coverSub', 'book.toc', 'book.rulesTitle', 'book.dataTitle', 'book.dataNote', 'book.syntax', 'book.example', 'book.thinking', 'book.result', 'book.mistakes', 'book.memo', 'book.glossary', ...Array.from({ length: RULES }, (_, i) => `book.rule${i + 1}`)];
