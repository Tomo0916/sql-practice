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

export const BASIC_FORMATS = ['fill', 'order1', 'write'];
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
BASIC_STEPS.forEach(s => { const own = stagesOf(LESSON_BY_KEY[s.lesson]); s.formats = BASIC_FORMATS.filter(f => f === 'write' || (f === 'fill' ? own.includes('fill') : own.includes('order'))); });
export const BASIC_CORE = BASIC_STEPS.filter(s => s.core);
export const BASIC_DETAIL = BASIC_STEPS.filter(s => !s.core);
export const BASIC_BY_KEY = Object.fromEntries(BASIC_STEPS.map(s => [s.key, s]));

/* ---------- state ---------- */
export const basicStart = () => ({ f: 0, run: 0, n: 0, ok: 0, clear: false });
/** after the first answer to a drill problem → the new state (does not change `st`) */
export function basicResult(st, ok, top = BASIC_FORMATS.length - 1) {
  const o = Object.assign(basicStart(), st);
  o.n++;
  if (!ok) { o.run = 0; o.f = Math.max(0, o.f - 1); return o; }
  o.ok++; o.run++;
  if (o.f < top) { if (o.run >= BASIC_UP) { o.f++; o.run = 0; } }
  else if (o.run >= BASIC_CLEAR) o.clear = true;
  return o;
}
/** the step to practise next: the first not mastered (the last one when all are) */
export const nextStep = basics => (BASIC_CORE.find(s => !((basics || {})[s.key] || {}).clear) || BASIC_CORE[BASIC_CORE.length - 1]).key;

/* ---------- a problem of a step, in a format ---------- */
export function basicProblem(engine, stepKey, f, seed) {
  const step = BASIC_BY_KEY[stepKey], lesson = LESSON_BY_KEY[step.lesson], token = step.formats[Math.max(0, Math.min(step.formats.length - 1, f))];
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
