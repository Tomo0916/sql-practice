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
 * Each step climbs fill-in → put the clauses in order → write:
 *   2 right in a row → the next format; a wrong answer → one format back;
 *   3 right in a row in writing → the step is mastered.
 * progress.basics = { <step>: { f, run, n, ok, clear } }
 *
 * stepForMistake(): a wrong answer anywhere in the app that shows the shape itself
 * is not there yet (no SELECT / FROM, a missing comma, a quote, clauses in the
 * wrong order) points to the step to go back to.
 * ========================================================= */
import { LESSON_BY_KEY, makeRng } from './engine.js';
import { topicsOf } from './lecture-topics.js';
import { makeProblem } from './mastery.js';

export const BASIC_FORMATS = ['fill', 'order1', 'write'];
export const BASIC_ROUND = 5;
export const BASIC_UP = 2;       // right in a row that move up a format
export const BASIC_CLEAR = 3;    // right in a row in writing that master the step
export const BASIC_STEPS = [
  { key: 'cols', lesson: 'select', shape: 'SELECT {col}, {col} FROM {table};', fits: () => true },
  { key: 'wnum', lesson: 'where', shape: 'SELECT {col}, {col} FROM {table} WHERE {col} >= {value};', fits: (p, t) => t.some(x => x.startsWith('num.')) },
  { key: 'wtext', lesson: 'where', shape: "SELECT {col}, {col} FROM {table} WHERE {col} = '{text}';", fits: (p, t) => t.some(x => x.startsWith('text.')) },
  { key: 'order', lesson: 'orderby', shape: 'SELECT {col}, {col} FROM {table} ORDER BY {col} DESC;', fits: (p, t) => !t.includes('two') },
  { key: 'limit', lesson: 'limit', shape: 'SELECT {col}, {col} FROM {table} ORDER BY {col} DESC LIMIT {n};', fits: (p, t) => !t.includes('offset') }
];
export const BASIC_BY_KEY = Object.fromEntries(BASIC_STEPS.map(s => [s.key, s]));

/* ---------- state ---------- */
export const basicStart = () => ({ f: 0, run: 0, n: 0, ok: 0, clear: false });
/** after the first answer to a drill problem → the new state (does not change `st`) */
export function basicResult(st, ok) {
  const o = Object.assign(basicStart(), st);
  o.n++;
  if (!ok) { o.run = 0; o.f = Math.max(0, o.f - 1); return o; }
  o.ok++; o.run++;
  if (o.f < BASIC_FORMATS.length - 1) { if (o.run >= BASIC_UP) { o.f++; o.run = 0; } }
  else if (o.run >= BASIC_CLEAR) o.clear = true;
  return o;
}
/** the step to practise next: the first not mastered (the last one when all are) */
export const nextStep = basics => (BASIC_STEPS.find(s => !((basics || {})[s.key] || {}).clear) || BASIC_STEPS[BASIC_STEPS.length - 1]).key;

/* ---------- a problem of a step, in a format ---------- */
export function basicProblem(engine, stepKey, f, seed) {
  const step = BASIC_BY_KEY[stepKey], lesson = LESSON_BY_KEY[step.lesson], token = BASIC_FORMATS[Math.max(0, Math.min(2, f))];
  for (let round = 0; round < 30; round++) {
    const R = makeRng(`basic|${seed}|${round}`), ds = R.pick(engine.themesFor(lesson));
    const p = engine.genOne(lesson, ds, `basic|${seed}|${round}`);
    if (!p || !step.fits(p, topicsOf(step.lesson, p))) continue;
    const pr = makeProblem(engine, lesson, p, ds.table || ds.key, token) || makeProblem(engine, lesson, p, ds.table || ds.key, 'write');
    if (pr) return Object.assign(pr, { id: `basic:${stepKey}:${seed}:${pr.id}`, basic: stepKey, bf: BASIC_FORMATS.indexOf(token) });
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
  if (!prob || prob.basic || prob.test || prob.quick || !/^\s*SELECT\b/i.test(prob.sql || '')) return null;
  const l = LESSON_BY_KEY[prob.lesson]; if (!l || l.ch === 'change' || l.kind === 'quiz') return null;
  const s = String(sql || ''), keys = new Set((dx || []).map(d => d.key));
  if (!s.trim()) return null;
  if (!/\bSELECT\b/i.test(s) || !/\bFROM\b/i.test(s) || [...keys].some(k => SHAPE_KEYS.has(k))) return 'cols';
  if ([...keys].some(k => QUOTE_KEYS.has(k))) return 'wtext';
  if (keys.has('clauseOrder')) return /\bLIMIT\b/i.test(prob.sql) ? 'limit' : /\bORDER\s+BY\b/i.test(prob.sql) ? 'order' : 'wnum';
  return null;
}
