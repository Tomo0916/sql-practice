/* =========================================================
 * typing.js — the typing test (a level test from speed and accuracy, like e-typing).
 * 60 seconds: the student types the phrases shown, exactly (capitals, spaces, symbols).
 * A wrong key does not move on; it is counted as a miss.
 *   speed    = correct keys per minute
 *   accuracy = correct ÷ (correct + misses)
 *   score    = speed × accuracy³   (mistakes cost a lot)
 * Three courses: SQL keywords, SQL statements (from the lessons' answers), pandas code.
 * Pure functions: the screen is in student.js; check.mjs tests the pools and the levels.
 * ========================================================= */
import { LESSONS } from './lessons.js';
import { PD_LESSONS, pdSet } from './pandas.js';

export const TY_SECONDS = 60;
export const TY_COURSES = ['kw', 'sql', 'py'];

/** SQL words and short pieces: what the lessons ask for most */
const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'DISTINCT', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR', 'NOT',
  'BETWEEN', 'IN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'ASC', 'DESC', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'INNER JOIN', 'LEFT JOIN', 'ON', 'CASE WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'EXCEPT', 'INTERSECT', 'WITH', 'OVER',
  'PARTITION BY', 'COUNT(*)', 'SUM(price)', 'AVG(score)', 'MAX(age)', 'MIN(stock)', 'ROUND(AVG(price), 1)', 'COALESCE(email, \'none\')',
  'SELECT *', 'SELECT name', 'FROM products', 'WHERE price >= 1000', 'ORDER BY price DESC', 'GROUP BY category', 'HAVING COUNT(*) >= 2',
  'LIMIT 3', 'LIKE \'%Pro%\'', 'BETWEEN 10 AND 20', 'IN (\'A\', \'B\')', 'price <> 0', 'stock > 10', 'c.id = o.customer_id',
  'COUNT(DISTINCT city)', 'UPPER(name)', 'LENGTH(name)', 'RANK() OVER', 'AS total', 'IS NULL;', 'SELECT name, price', 'WHERE id = 3;'
];

const ascii = s => /^[\x20-\x7e]+$/.test(s);
const uniq = a => [...new Set(a)];

/** the phrases of a course (the SQL ones come from the lessons, so they need the engine) */
export function typingPool(course, engine) {
  if (course === 'kw') return KEYWORDS.slice();
  if (course === 'py') {
    return uniq(PD_LESSONS.flatMap(l => { const s = pdSet(l.key, 'TYPING'); return [s.demo, ...s.items].map(p => p.code); }))
      .filter(c => !c.includes('\n') && ascii(c) && c.length >= 12 && c.length <= 70);
  }
  const out = [];
  LESSONS.filter(l => l.kind !== 'quiz' && !/^an_/.test(l.key)).forEach(l => {
    ['TY1', 'TY2'].forEach(code => { try { engine.lessonProblems(l, code).forEach(p => { if (p.sql) out.push(p.sql); }); } catch (e) { /* a lesson that needs more: skip */ } });
  });
  return uniq(out.map(s => s.replace(/\s+/g, ' ').trim())).filter(s => ascii(s) && s.length >= 20 && s.length <= 75);
}

/** the phrases of one test: the pool shuffled (and repeated if a fast typist runs out) */
export function typingDeck(pool, rnd = Math.random) {
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.concat(a, a);
}

/** speed, accuracy and score of a finished test */
export function typingScore(correct, misses, seconds = TY_SECONDS) {
  const kpm = seconds > 0 ? correct * 60 / seconds : 0;
  const acc = correct + misses ? correct / (correct + misses) : 0;
  return { kpm: Math.round(kpm), acc: Math.round(acc * 1000) / 10, score: Math.round(kpm * acc ** 3) };
}

/** the score each level starts at (Lv.1 … Lv.10) */
export const TY_LEVELS = [0, 40, 70, 100, 130, 160, 200, 240, 280, 330];
export const typingLevel = score => TY_LEVELS.filter(t => score >= t).length;
/** the band of a level: 1–2 beginner … 9–10 expert (i18n ty.band.1 … 5) */
export const typingBand = lv => Math.ceil(lv / 2);
/** points to the next level (null at Lv.10) */
export const typingToNext = score => { const lv = typingLevel(score); return lv >= TY_LEVELS.length ? null : TY_LEVELS[lv] - score; };

/** the keys missed most: [[key, count] …] */
export const weakKeys = (missed, n = 5) => Object.entries(missed).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);

/** the class log of a result (problem_id ≤ 80, reason ≤ 40): ty:<course>:<score>:<level> */
export const typingRow = r => ({ problem_id: `ty:${r.course}:${r.score}:${typingLevel(r.score)}`, lesson: 'typing', stage: 'review', ok: true,
  reason: `${r.kpm}kpm ${r.acc}%`.slice(0, 40), sql: JSON.stringify({ c: r.course, kpm: r.kpm, acc: r.acc, miss: r.misses, ok: r.correct, weak: r.weak }).slice(0, 2000) });
export const isTypingRow = a => !!(a && a.problem_id && a.problem_id.startsWith('ty:'));
/** a class log row back to { course, score, level } */
export const typingFromRow = a => { const [, course, score, lv] = a.problem_id.split(':'); return { course, score: +score, lv: +lv, at: a.created_at }; };
