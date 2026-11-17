/* =========================================================
 * basics.js — the root drill (基礎の型): the shapes every query is built on,
 * practised again and again until they can be written without thinking.
 * No DOM (tools-next/check.mjs tests it).
 *
 * Steps, in order (each a shape, with problems from the lesson that teaches it):
 *   cols  SELECT 列, 列 FROM テーブル;
 *   wnum  … WHERE 列 >= 数;
 *   wtext … WHERE 列 = '文字';
 *   order … ORDER BY 列 DESC;
 *   limit … ORDER BY 列 DESC LIMIT 数;
 *   insert INSERT INTO テーブル (列, 列) VALUES (値, 値);
 *   update UPDATE テーブル SET 列 = 値 WHERE 列 = 値;
 *   delete DELETE FROM テーブル WHERE 列 = 値;
 * Then one step for every other lesson up to JOIN (LIKE, BETWEEN / IN, IS NULL, AS, DISTINCT,
 * COUNT / SUM, GROUP BY, HAVING, the JOINs …): its shape is the lesson's own syntax line.
 * The core steps (core: true) are the path; the others can be practised any time.
 * Each step climbs fill-in → put the clauses in order → write:
 *   2 right in a row → the next format; a wrong answer → one format back;
 *   3 right in a row in writing → the step is mastered.
 * progress.basics = { <step>: { f, run, n, ok, clear } }
 *
 * stepForMistake(): a wrong answer anywhere in the app that shows the shape itself
 * is not there yet (no SELECT / FROM, a missing comma, a quote, clauses in the
 * wrong order) points to the step to go back to.
 * ========================================================= */
import { LESSON_BY_KEY, makeRng, stagesOf } from './engine.js';
import { LESSONS } from './lessons.js';
import { topicsOf } from './lecture-topics.js';
import { makeProblem } from './mastery.js';

export const BASIC_FORMATS = ['afill', 'aorder', 'awrite'];   // all in words (SELECT 列 FROM テーブル): fill a gap → put the parts in order → write it
export const BASIC_ROUND = 5;
export const BASIC_UP = 2;       // right in a row that move up a format
export const BASIC_CLEAR = 3;    // right in a row in writing that master the step
export const BASIC_STEPS = [
  { key: 'cols', core: true, lesson: 'select', shape: 'SELECT {col}, {col} FROM {table};', fits: () => true },
  { key: 'wnum', core: true, lesson: 'where', shape: 'SELECT {col}, {col} FROM {table} WHERE {col} >= {value};', fits: (p, t) => t.some(x => x.startsWith('num.')) },
  { key: 'wtext', core: true, lesson: 'where', shape: "SELECT {col}, {col} FROM {table} WHERE {col} = '{text}';", fits: (p, t) => t.some(x => x.startsWith('text.')) },
  { key: 'order', core: true, lesson: 'orderby', shape: 'SELECT {col}, {col} FROM {table} ORDER BY {col} DESC;', fits: (p, t) => !t.includes('two') },
  { key: 'limit', core: true, lesson: 'limit', shape: 'SELECT {col}, {col} FROM {table} ORDER BY {col} DESC LIMIT {n};', fits: (p, t) => !t.includes('offset') },
  // the statements that change data
  { key: 'insert', core: true, lesson: 'insert', shape: 'INSERT INTO {table} ({col}, {col}) VALUES ({value}, {value});', fits: () => true },
  { key: 'update', core: true, lesson: 'update', shape: 'UPDATE {table} SET {col} = {value} WHERE {col} = {value};', fits: () => true },
  { key: 'delete', core: true, lesson: 'delete', shape: 'DELETE FROM {table} WHERE {col} = {value};', fits: () => true }
];
// one step for every other lesson of the course (not data analysis), its shape from the lesson's syntax line
const COVERED = new Set(BASIC_STEPS.map(s => s.lesson));
LESSONS.filter(l => ['basics', 'filter', 'sort', 'change', 'agg', 'join'].includes(l.ch) && l.kind !== 'quiz' && !l.fixed && !COVERED.has(l.key) && l.syntax)
  .forEach(l => BASIC_STEPS.push({ key: l.key, core: false, lesson: l.key, ch: l.ch, shape: l.syntax.replace(/\s*--.*$/, ''), fits: () => true }));
// the formats of a step: the ones its lesson has (a lesson without ordering goes fill-in → write)
BASIC_STEPS.forEach(s => { const own = stagesOf(LESSON_BY_KEY[s.lesson]); s.formats = BASIC_FORMATS.slice(); });
export const BASIC_CORE = BASIC_STEPS.filter(s => s.core);
export const BASIC_DETAIL = BASIC_STEPS.filter(s => !s.core);
export const BASIC_BY_KEY = Object.fromEntries(BASIC_STEPS.map(s => [s.key, s]));

/* ---------- state ---------- */
export const basicStart = () => ({ f: 0, run: 0, n: 0, ok: 0, clear: false, v: 3 });
/** a stored state; one from before the shapes were all in words (v < 3) keeps "mastered", and the format as far as it goes */
export function basicNorm(st) {
  if (!st) return basicStart();
  const o = Object.assign(basicStart(), st, { v: 3 });
  if (st.v !== 3) { o.f = st.clear ? BASIC_FORMATS.length - 1 : Math.min(BASIC_FORMATS.length - 1, Math.max(0, (st.f || 0) - (st.v === 2 ? 1 : 0))); o.run = 0; }
  return o;
}
/** after the first answer to a drill problem → the new state (does not change `st`) */
export function basicResult(st, ok, top = BASIC_FORMATS.length - 1) {
  const o = basicNorm(st);
  o.n++;
  if (!ok) { o.run = 0; o.f = Math.max(0, o.f - 1); return o; }
  o.ok++; o.run++;
  if (o.f < top) { if (o.run >= BASIC_UP) { o.f++; o.run = 0; } }
  else if (o.run >= BASIC_CLEAR) o.clear = true;
  return o;
}
/** the step to practise next: the first not mastered (the last one when all are) */
export const nextStep = basics => (BASIC_CORE.find(s => !basicNorm((basics || {})[s.key]).clear) || BASIC_CORE[BASIC_CORE.length - 1]).key;

/* ---------- a problem of a step, in a format (always in words) ---------- */
export function basicProblem(engine, stepKey, f, seed) {
  const step = BASIC_BY_KEY[stepKey]; if (!step) return null;
  return absProblem(stepKey, step.formats[Math.max(0, Math.min(step.formats.length - 1, f))], seed);
}

/* ---------- a wrong answer that shows the shape is not there yet ---------- */
const SHAPE_KEYS = new Set(['missingComma', 'trailingComma', 'needVerb', 'incomplete', 'near']);
const QUOTE_KEYS = new Set(['quote', 'quoteOpen', 'doubleQuote', 'smartQuote']);
/**
 * prob: the problem, sql: what the student wrote, dx: the diagnosis keys → the step to go back to, or null.
 * Only for SELECT problems outside tests and outside the drill itself.
 */
export function stepForMistake(prob, sql, dx) {
  if (!prob || prob.basic || prob.test || prob.quick) return null;
  const l = LESSON_BY_KEY[prob.lesson]; if (!l || l.kind === 'quiz') return null;
  const s = String(sql || ''), keys = new Set((dx || []).map(d => d.key));
  if (!s.trim()) return null;
  const verb = (/^\s*(SELECT|INSERT|UPDATE|DELETE)\b/i.exec(prob.sql || '') || [])[1];
  if (!verb) return null;
  if (verb.toUpperCase() !== 'SELECT') {   // a statement that changes data: its own shape
    const k = verb.toLowerCase(), shape = { insert: /^\s*INSERT\s+INTO\s+\w+\s*(\([^)]*\))?\s*VALUES\s*\(/i, update: /^\s*UPDATE\s+\w+\s+SET\s+\w+\s*=.+\bWHERE\b/is, delete: /^\s*DELETE\s+FROM\s+\w+\s+WHERE\b/i }[k];
    return !shape.test(s) || [...keys].some(x => SHAPE_KEYS.has(x)) ? k : null;
  }
  if (!/\bSELECT\b/i.test(s) || !/\bFROM\b/i.test(s) || [...keys].some(k => SHAPE_KEYS.has(k))) return 'cols';
  if ([...keys].some(k => QUOTE_KEYS.has(k))) return 'wtext';
  // a mistake about one item: the shape of that item
  const ITEM = { likePercent: 'like', isNull: 'null', havingNoGroup: 'having', ambiguous: 'innercols', tablePrefix: 'innercols', aliasName: 'alias' };
  for (const [k, step] of Object.entries(ITEM)) if (keys.has(k) && BASIC_BY_KEY[step]) return step;
  if (keys.has('clauseOrder')) return /\bLIMIT\b/i.test(prob.sql) ? 'limit' : /\bORDER\s+BY\b/i.test(prob.sql) ? 'order' : 'wnum';
  return null;
}

/* ---------- in the chapters: the shapes at the start of each chapter ---------- */
export const CHAPTER_SHAPES = { basics: ['cols'], filter: ['wnum', 'wtext'], sort: ['order', 'limit'], change: ['insert', 'update', 'delete'], agg: ['groupby', 'having'], join: ['inner', 'left'] };

/* ---------- the shape mix (型ミックス): only shapes, mixed up ---------- */
export const MIX_RANGES = ['core', 'learned', 'all'];
export const MIX_FORMATS = ['auto', 'afill', 'aorder', 'awrite'];
export const MIX_COUNTS = [5, 10, 20];
/** the steps of a range; learned(step) says whether the student has learned / started it */
export function mixSteps(range, learned) {
  if (range === 'core') return BASIC_CORE.map(s => s.key);
  if (range === 'all') return BASIC_STEPS.map(s => s.key);
  const got = BASIC_STEPS.filter(s => learned(s)).map(s => s.key);
  return got.length ? got : [BASIC_CORE[0].key];
}
/** the format index of a step for a mix problem: its own level (auto), or the chosen format (the nearest one the step has) */
export function mixFormat(step, fmt, own) {
  if (fmt === 'auto') return Math.min(own || 0, step.formats.length - 1);
  const i = step.formats.indexOf(fmt);
  return i >= 0 ? i : step.formats.length - 1;
}
/** n problems from the steps, each step in turn (shuffled), never the same step twice in a row when there are several */
export function mixProblems(engine, steps, fmt, n, levelOf, seed) {
  const R = makeRng(`bsmix|${seed}`), out = [];
  let bag = [];
  for (let i = 0; out.length < n && i < n * 3; i++) {
    if (!bag.length) { bag = R.shuffle(steps); if (out.length && bag.length > 1 && bag[0] === out[out.length - 1].basic) bag.push(bag.shift()); }
    const key = bag.shift(), step = BASIC_BY_KEY[key];
    const p = basicProblem(engine, key, mixFormat(step, fmt, levelOf(key)), `${seed}|${i}`);
    if (p) out.push(Object.assign(p, { id: `bsmix:${seed}:${i}:${p.id}` }));
  }
  return out;
}

/* ---------- the shape in words (型をことばで): SELECT 列, 列 FROM テーブル; ----------
 * No table, no data: the shape itself, with words for the parts (列 / テーブル / 値 / 条件 / 式 / 別名
 * in the student's language) and the SQL words. Three formats, all in words:
 *   afill   one word of the shape is missing: choose it
 *   aorder  the parts of the shape (and two that do not belong): put them in order
 *   awrite  write it (chips or keyboard)
 * The core shapes come in variants (how many columns, which comparison, which direction …),
 * each with its own goal sentence, so the shape is understood, not learnt by heart.
 * Answers are compared token by token (SQL words in any case, spaces free, the last ; and ASC may be left out). */
export const ABS_SLOTS = ['col', 'table', 'val', 'cond', 'expr', 'alias'];
const SLOT_KIND = { col: 'col', group: 'col', num: 'col', key: 'col', table: 'table', value: 'val', text: 'val', number: 'val', n: 'val', min: 'val', max: 'val', skip: 'val', cond: 'cond', expr: 'expr', alias: 'alias' };
const OPS = { ge: '>=', gt: '>', le: '<=', lt: '<', eq: '=', ne: '<>' };
const cols = n => Array.from({ length: n }, () => '{col}').join(', ');
/** the variants of the core shapes: R → { shape, goal: [key, vars] } */
const VARIANTS = {
  cols: R => { const n = R.int(0, 3); return n === 0 ? { shape: 'SELECT * FROM {table};', goal: ['bs.g.colsAll'] } : { shape: `SELECT ${cols(n)} FROM {table};`, goal: ['bs.g.cols', { n }] }; },
  wnum: R => { const n = R.int(1, 2), op = R.pick(['ge', 'gt', 'le', 'lt', 'eq']); return { shape: `SELECT ${cols(n)} FROM {table} WHERE {col} ${OPS[op]} {value};`, goal: ['bs.g.wnum.' + op, { n }] }; },
  wtext: R => { const n = R.int(1, 2), op = R.pick(['eq', 'eq', 'ne']); return { shape: `SELECT ${cols(n)} FROM {table} WHERE {col} ${OPS[op]} '{text}';`, goal: ['bs.g.wtext.' + op, { n }] }; },
  order: R => { const n = R.int(1, 2), d = R.pick(['desc', 'asc']); return { shape: `SELECT ${cols(n)} FROM {table} ORDER BY {col} ${d.toUpperCase()};`, goal: ['bs.g.order.' + d, { n }] }; },
  limit: R => { const n = R.int(1, 2), d = R.pick(['desc', 'asc']); return { shape: `SELECT ${cols(n)} FROM {table} ORDER BY {col} ${d.toUpperCase()} LIMIT {n};`, goal: ['bs.g.limit.' + d, { n }] }; },
  insert: R => { const n = R.int(1, 3); return { shape: `INSERT INTO {table} (${cols(n)}) VALUES (${Array.from({ length: n }, () => '{value}').join(', ')});`, goal: ['bs.g.insert', { n }] }; },
  update: R => { const n = R.int(1, 2); return { shape: `UPDATE {table} SET ${Array.from({ length: n }, () => '{col} = {value}').join(', ')} WHERE {col} = {value};`, goal: ['bs.g.update', { n }] }; },
  delete: () => ({ shape: 'DELETE FROM {table} WHERE {col} = {value};', goal: ['bs.d.delete'] })
};
/** the shape of a step with only whole parts (the "..." of a few JOIN shapes become one column) */
export function absShape(stepKey) {
  return BASIC_BY_KEY[stepKey].shape.replace(/SELECT \.\.\. FROM/, 'SELECT {col} FROM').replace(/, \.\.\./g, '');
}
/** a shape for a problem: a variant of a core shape, or the step's own shape */
export function absVariant(stepKey, seed) {
  const v = VARIANTS[stepKey];
  if (v) return v(makeRng(`absv|${stepKey}|${seed}`));
  return { shape: absShape(stepKey), goal: ['bs.abs.goal', { lesson: BASIC_BY_KEY[stepKey].lesson }] };
}
const SYM = /^(>=|<=|<>|!=|[(),.;=<>*'%+\-])/;
/** text → tokens; words: { col: ['列', 'column'], … } the words that stand for each part */
export function absTokens(text, words) {
  const t = String(text || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/　/g, ' ').replace(/，/g, ',').replace(/；/g, ';').replace(/（/g, '(').replace(/）/g, ')');
  const list = [];
  Object.entries(words || {}).forEach(([k, ws]) => ws.forEach(w => { if (w) list.push([w, k]); }));
  list.sort((a, b) => b[0].length - a[0].length);   // longer words first (テーブル名 before テーブル)
  const out = [];
  let i = 0;
  while (i < t.length) {
    if (/\s/.test(t[i])) { i++; continue; }
    const hit = list.find(([w]) => t.slice(i, i + w.length).toLowerCase() === w.toLowerCase() && !(/\w$/.test(w) && /\w/.test(t[i + w.length] || '')));   // VALUES is not the word value + S
    if (hit) { out.push('§' + hit[1]); i += hit[0].length; continue; }
    const m = SYM.exec(t.slice(i));
    if (m) { out.push(m[1] === '!=' ? '<>' : m[1]); i += m[1].length; continue; }
    const w = /^[A-Za-z_][A-Za-z0-9_]*/.exec(t.slice(i));
    if (w) { out.push(w[0].toUpperCase()); i += w[0].length; continue; }
    const other = /^[^\s(),.;=<>*'%+\-]+/.exec(t.slice(i));   // something else (a real name, a number …)
    out.push('?' + other[0]); i += other[0].length;
  }
  while (out.length && out[out.length - 1] === ';') out.pop();
  return out;
}
/** the tokens a shape expects */
export function absExpected(shape) {
  const out = [];
  String(shape).split(/(\{[a-z]+\})/).forEach(part => {
    const m = /^\{([a-z]+)\}$/.exec(part);
    if (m) out.push('§' + (SLOT_KIND[m[1]] || 'val'));
    else out.push(...absTokens(part, {}));
  });
  while (out.length && out[out.length - 1] === ';') out.pop();
  return out;
}
const noAsc = a => a.filter(x => x !== 'ASC');   // ORDER BY 列 means ORDER BY 列 ASC
/** check a written shape → { ok, at: the first token that differs (or -1), got, want } */
export function absCheck(shape, text, words) {
  const got = noAsc(absTokens(text, words)), want = noAsc(absExpected(shape));
  let at = 0;
  while (at < got.length && at < want.length && got[at] === want[at]) at++;
  const ok = at === got.length && at === want.length;
  return { ok, at: ok ? -1 : at, got, want };
}
/** the parts of a shape for ordering: words that belong together stay together (ORDER BY, COUNT(*), '値', テーブル.列) */
const PAIRS = [['ORDER', 'BY'], ['GROUP', 'BY'], ['INSERT', 'INTO'], ['DELETE', 'FROM'], ['INNER', 'JOIN'], ['LEFT', 'JOIN'], ['IS', 'NULL']];
export function absPieces(shape) {
  const t = absExpected(shape), out = [];
  for (let i = 0; i < t.length; i++) {
    const pair = PAIRS.find(([a, b]) => t[i] === a && t[i + 1] === b);
    if (pair) { out.push([t[i], t[i + 1]]); i++; continue; }
    if (['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'].includes(t[i]) && t[i + 1] === '(') { const j = t.indexOf(')', i); out.push(t.slice(i, j + 1)); i = j; continue; }
    if (t[i] === "'") { const j = t.indexOf("'", i + 1); out.push(t.slice(i, j + 1)); i = j; continue; }
    if (t[i] === '§table' && t[i + 1] === '.') { out.push(t.slice(i, i + 3)); i += 2; continue; }
    out.push([t[i]]);
  }
  return out;
}
/** clause words, and the ones that can stand in for each other in a gap */
const CLAUSE_KW = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'INNER JOIN', 'LEFT JOIN', 'ON', 'AS', 'AND', 'LIKE', 'BETWEEN', 'IS NULL', 'DISTINCT'];
const ALL_KW = [...CLAUSE_KW, 'DESC', 'ASC', 'COUNT', 'SUM', 'AVG'];
const GAP_SETS = [['DESC', 'ASC'], Object.values(OPS)];
/** a gap: which part is missing and the choices (the right one first) */
function absGap(pieces, R) {
  const text = p => p.join(' ');
  const can = pieces.map((p, i) => i).filter(i => { const x = text(pieces[i]); return CLAUSE_KW.includes(x) || GAP_SETS.some(g => g.includes(x)); });
  const at = R.pick(can), right = text(pieces[at]), set = GAP_SETS.find(g => g.includes(right));
  const main = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'SET', 'VALUES', 'ON', 'INSERT INTO', 'UPDATE', 'DELETE FROM'];
  const others = set ? set.filter(x => x !== right) : (main.includes(right) ? main : CLAUSE_KW).filter(x => x !== right);   // the other clause words, also ones of this shape (where does each go?)
  return { at, choices: [right, ...R.shuffle(others).slice(0, 3)] };
}
/** the SQL words for the writing chips: the shape's own and two that do not belong, shuffled */
export function absChips(shape, seed) {
  const R = makeRng(`abs|${shape}|${seed}`), pieces = absPieces(shape).map(p => p.join(' '));
  const own = [...new Set(pieces.filter(x => ALL_KW.includes(x) || /^(COUNT|SUM|AVG|MAX|MIN)$/.test(x.split(' ')[0])).map(x => x.split(' (')[0]))];
  const extra = R.shuffle(ALL_KW.filter(k => !own.includes(k))).slice(0, 2);
  if (own.includes('DESC') && !extra.includes('ASC')) extra.push('ASC'); else if (own.includes('ASC') && !extra.includes('DESC')) extra.push('DESC');
  const toks = absExpected(shape), cmp = toks.some(x => Object.values(OPS).includes(x));
  const syms = [',', '(', ')', '.', "'", '%', '*', ...(cmp ? Object.values(OPS) : []), ';'].filter(x => x === ';' || x === ',' || toks.includes(x) || (cmp && Object.values(OPS).includes(x)));
  const slots = [...new Set(toks.filter(x => x[0] === '§').map(x => x.slice(1)))];
  return { kw: R.shuffle([...new Set([...own, ...extra])]), slots: ABS_SLOTS.filter(k => ['col', 'table', 'val'].includes(k) || slots.includes(k)), syms };
}
/** the clauses of a shape, each with what it does: [{ key: role key, toks }] */
const CLAUSE_ROLE = [['SELECT', 'cq.role.select'], ['FROM', 'cq.role.from'], ['WHERE', 'cq.role.where'], ['GROUP BY', 'cq.role.group'], ['HAVING', 'cq.role.having'], ['ORDER BY', 'cq.role.order'], ['LIMIT', 'cq.role.limit'],
  ['INSERT INTO', 'bs.r.insert'], ['VALUES', 'bs.r.values'], ['UPDATE', 'bs.r.update'], ['SET', 'bs.r.set'], ['DELETE FROM', 'bs.r.delete'], ['INNER JOIN', 'bs.r.join'], ['LEFT JOIN', 'bs.r.join'], ['ON', 'bs.r.on']];
export function absClauses(shape) {
  const out = [];
  absPieces(shape).forEach(p => { const r = CLAUSE_ROLE.find(([k]) => k === p.join(' ')); if (r || !out.length) out.push({ key: r ? r[1] : null, toks: [...p] }); else out[out.length - 1].toks.push(...p); });
  return out;
}
/** a problem in words (no SQL to run): { shape, goal, af, pieces, gap / pool } */
export function absProblem(stepKey, af, seed) {
  const step = BASIC_BY_KEY[stepKey], v = absVariant(stepKey, seed), R = makeRng(`absp|${stepKey}|${af}|${seed}`), pieces = absPieces(v.shape);
  const p = { id: `basic:${stepKey}:${af}:${seed}`, basic: stepKey, bf: step.formats.indexOf(af), stage: 'abs', abs: true, af, kind: 'drill', lesson: step.lesson, tables: [], sql: v.shape, shape: v.shape, goal: v.goal, p: {}, theme: 'demo' };
  if (af === 'afill') p.gap = absGap(pieces, R), p.gap.order = R.shuffle(p.gap.choices.map((x, i) => i));
  if (af === 'aorder') {   // the parts and two that do not belong, shuffled
    const extra = R.shuffle(CLAUSE_KW.filter(k => !pieces.some(x => x.join(' ') === k))).slice(0, 2).map(k => k.split(' '));
    p.pool = R.shuffle([...pieces, ...extra].map((toks, i) => ({ i, toks })));
    p.need = pieces.length;
  }
  return p;
}
