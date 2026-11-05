/* =========================================================
 * check.js — the "check test" (確認テスト): problems from the chosen
 * lessons, in the chosen formats, in random order.
 * A test is written as a short code that fits in a link:
 *   <lessons joined by .>~<fill><order1><order2><write>~<max>~<seed>
 *   e.g.  where.andor.between~0111~10~K7Q2
 * seed '' = every student gets their own problems; a seed = everyone the same.
 * (No DOM here: tools-next/check.mjs tests it in Node.)
 * ========================================================= */
import { LESSON_BY_KEY, FORMAT_KEYS, FORMAT_MAX, stagesFor, makeRng } from './engine.js';
import { LESSONS } from './lessons.js';

export const CHECK_MAXES = [0, 10, 20, 30];   // 0 = every problem
export const CHECK_PRESETS = {
  balance: { fill: 1, order1: 1, order2: 0, write: 1 },
  orderMain: { fill: 0, order1: 2, order2: 1, write: 1 },
  orderOnly: { fill: 0, order1: 2, order2: 2, write: 0 },
  writeMain: { fill: 0, order1: 0, order2: 0, write: 2 },
};
export const checkLessons = () => LESSONS.filter(l => l.kind !== 'quiz');

export function normCheck(c) {
  c = c || {};
  const ok = new Set(checkLessons().map(l => l.key));
  const lessons = [...new Set((c.lessons || []).filter(k => ok.has(k)))];
  const f = {};
  FORMAT_KEYS.forEach(k => { f[k] = Math.max(0, Math.min(FORMAT_MAX, parseInt((c.f || {})[k], 10) || 0)); });
  if (FORMAT_KEYS.every(k => !f[k])) f.write = 1;
  const max = CHECK_MAXES.includes(+c.max) ? +c.max : 10;
  const seed = String(c.seed || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return { lessons, f, max, seed };
}
export function encodeCheck(c) {
  c = normCheck(c);
  return `${c.lessons.join('.')}~${FORMAT_KEYS.map(k => c.f[k]).join('')}~${c.max}~${c.seed}`;
}
export function decodeCheck(code) {
  const m = /^([a-z0-9_.]+)~([0-5]{4})~(\d+)~([A-Z0-9]*)$/.exec(String(code || ''));
  if (!m) return null;
  const f = {}; FORMAT_KEYS.forEach((k, i) => { f[k] = +m[2][i]; });
  const c = normCheck({ lessons: m[1].split('.'), f, max: +m[3], seed: m[4] });
  return c.lessons.length ? c : null;
}
/** problems per lesson, and in all (before the maximum) */
export function checkCounts(c) {
  c = normCheck(c);
  const fmt = Object.assign({ demo: false }, c.f);
  const per = c.lessons.map(k => stagesFor(LESSON_BY_KEY[k], fmt).length);
  const all = per.reduce((a, b) => a + b, 0);
  return { all, n: c.max ? Math.min(c.max, all) : all };
}
/**
 * The test's problems, shuffled. Each is a copy with its own id (check:…),
 * so nothing here touches the lessons' own progress.
 */
export function buildCheck(engine, c, seed) {
  c = normCheck(c);
  seed = String(seed || c.seed || 'X');
  const fmt = Object.assign({ demo: false }, c.f);
  let items = [];
  for (const k of c.lessons) items.push(...engine.lessonProblems(LESSON_BY_KEY[k], `CK${seed}`, fmt).filter(p => p.stage !== 'demo'));
  items = makeRng(`check|${seed}|${c.lessons.join('.')}`).shuffle(items);
  if (c.max) items = items.slice(0, c.max);
  return items.map((p, i) => {
    const q = Object.assign({}, p, { id: `check:${seed}:${i}:${p.id}`, test: true, src: p.id });
    delete q.fmt;
    return q;
  });
}
