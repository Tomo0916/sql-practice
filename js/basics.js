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

export const BASIC_FORMATS = ['abs', 'fill', 'order1', 'write'];   // abs = the shape in words (SELECT 列 FROM テーブル), before any real table
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
BASIC_STEPS.forEach(s => { const own = stagesOf(LESSON_BY_KEY[s.lesson]); s.formats = BASIC_FORMATS.filter(f => f === 'write' || f === 'abs' || (f === 'fill' ? own.includes('fill') : own.includes('order'))); });
export const BASIC_CORE = BASIC_STEPS.filter(s => s.core);
export const BASIC_DETAIL = BASIC_STEPS.filter(s => !s.core);
export const BASIC_BY_KEY = Object.fromEntries(BASIC_STEPS.map(s => [s.key, s]));

/* ---------- state ---------- */
export const basicStart = () => ({ f: 0, run: 0, n: 0, ok: 0, clear: false, v: 2 });
/** a stored state; one from before the shape-in-words format (v < 2) moves one format up, so it stays where it was */
export function basicNorm(st) {
  if (!st) return basicStart();
  const o = Object.assign(basicStart(), st, { v: 2 });
  if (st.v !== 2 && st.n) o.f = (st.f || 0) + 1;
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

/* ---------- a problem of a step, in a format ---------- */
export function basicProblem(engine, stepKey, f, seed) {
  const step = BASIC_BY_KEY[stepKey], lesson = LESSON_BY_KEY[step.lesson], token = step.formats[Math.max(0, Math.min(step.formats.length - 1, f))];
  if (token === 'abs') return absProblem(stepKey, seed);
  for (let round = 0; round < 30; round++) {
    const R = makeRng(`basic|${seed}|${round}`), ds = R.pick(engine.themesFor(lesson));
    const p = engine.genOne(lesson, ds, `basic|${seed}|${round}`);
    if (!p || !step.fits(p, topicsOf(step.lesson, p))) continue;
    const pr = makeProblem(engine, lesson, p, ds.table || ds.key, token) || makeProblem(engine, lesson, p, ds.table || ds.key, 'write');
    if (pr) return Object.assign(pr, { id: `basic:${stepKey}:${seed}:${pr.id}`, basic: stepKey, bf: step.formats.indexOf(token) });
  }
  return null;
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
export const MIX_FORMATS = ['auto', 'abs', 'fill', 'order1', 'write'];
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
 * No table, no data: the student writes the shape itself with words for the parts
 * (列 / テーブル / 値 / 条件 / 式 / 別名 in the student's language) and the SQL words and symbols.
 * The answer is compared token by token (SQL words in any case, spaces free, the last ; may be left out). */
export const ABS_SLOTS = ['col', 'table', 'val', 'cond', 'expr', 'alias'];
const SLOT_KIND = { col: 'col', group: 'col', num: 'col', key: 'col', table: 'table', value: 'val', text: 'val', number: 'val', n: 'val', min: 'val', max: 'val', skip: 'val', cond: 'cond', expr: 'expr', alias: 'alias' };
/** the shape of a step with only whole parts (the "..." of a few JOIN shapes become one column) */
export function absShape(stepKey) {
  return BASIC_BY_KEY[stepKey].shape.replace(/SELECT \.\.\. FROM/, 'SELECT {col} FROM').replace(/, \.\.\./g, '');
}
const SYM = /^(>=|<=|<>|!=|[(),.;=<>*'%+\-])/;
/** text → tokens; words: { col: ['列', 'column'], … } the words that stand for each part */
export function absTokens(text, words) {
  let t = String(text || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\u3000/g, ' ');
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
    if (m) { out.push(m[1]); i += m[1].length; continue; }
    const w = /^[A-Za-z_][A-Za-z0-9_]*/.exec(t.slice(i));
    if (w) { out.push(w[0].toUpperCase()); i += w[0].length; continue; }
    const other = /^[^\s(),.;=<>*'%+\-]+/.exec(t.slice(i));   // something else (a real name, a number …)
    out.push('?' + other[0]); i += other[0].length;
  }
  while (out.length && out[out.length - 1] === ';') out.pop();
  return out;
}
/** the tokens the shape expects */
export function absExpected(stepKey) {
  const out = [];
  absShape(stepKey).split(/(\{[a-z]+\})/).forEach(part => {
    const m = /^\{([a-z]+)\}$/.exec(part);
    if (m) out.push('§' + (SLOT_KIND[m[1]] || 'val'));
    else out.push(...absTokens(part, {}));
  });
  while (out.length && out[out.length - 1] === ';') out.pop();
  return out;
}
/** check a written shape → { ok, at: the first token that differs (or -1), got, want } */
export function absCheck(stepKey, text, words) {
  const got = absTokens(text, words), want = absExpected(stepKey);
  let at = 0;
  while (at < got.length && at < want.length && got[at] === want[at]) at++;
  const ok = at === got.length && at === want.length;
  return { ok, at: ok ? -1 : at, got, want };
}
/** the SQL words of a shape, and a few more that do not belong (so the order has to be known) */
const ALL_KW = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'DESC', 'ASC', 'AND', 'OR', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'LIKE', 'BETWEEN', 'IS NULL', 'DISTINCT', 'AS', 'COUNT', 'SUM', 'AVG', 'INNER JOIN', 'LEFT JOIN', 'ON'];
export function absChips(stepKey, seed) {
  const shape = absShape(stepKey).replace(/\{[a-z]+\}/g, ' ');
  const has = ALL_KW.filter(k => new RegExp(`\\b${k.replace(' ', '\\s+')}\\b`).test(shape));
  const own = has.filter(k => !has.some(o => o !== k && o.includes(k) && new RegExp(`\\b${o.replace(' ', '\\s+')}\\b`).test(shape) && !new RegExp(`\\b${k}\\b`).test(shape.replace(new RegExp(o.replace(' ', '\\s+'), 'g'), ''))));
  const R = makeRng(`abs|${stepKey}|${seed}`), extra = R.shuffle(ALL_KW.filter(k => !own.includes(k) && !own.some(o => o.includes(k) || k.includes(o)))).slice(0, 2);
  const syms = [',', '(', ')', '.', '=', '>=', "'", '%', '*', ';'].filter(x => x === ';' || x === ',' || shape.includes(x));
  const slots = [...new Set(absExpected(stepKey).filter(x => x[0] === '§').map(x => x.slice(1)))];
  return { kw: R.shuffle([...own, ...extra]), slots: ABS_SLOTS.filter(k => ['col', 'table', 'val'].includes(k) || slots.includes(k)), syms };
}
/** a problem of the shape in words (it has no SQL to run) */
export function absProblem(stepKey, seed) {
  const step = BASIC_BY_KEY[stepKey];
  return { id: `basic:${stepKey}:abs:${seed}`, basic: stepKey, bf: 0, stage: 'abs', abs: true, lesson: step.lesson, kind: 'practice', tables: [], sql: absShape(stepKey), p: {}, theme: 'demo' };
}
