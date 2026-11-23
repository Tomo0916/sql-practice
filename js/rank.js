/* =========================================================
 * rank.js — the rank tests (ランクテスト), in the manner of e-typing's level check:
 * a fixed set of problems, solved one after another against the clock;
 * the score comes from speed and accuracy, and gives a rank.
 *
 * Three tests: beginner (SELECT … LIMIT), intermediate (INSERT … functions, UNION),
 * advanced (subqueries, JOIN). Each: RK_N ordering problems with pieces of one or
 * two words, from easy to hard (the lessons in order, the lesson's level rising).
 *   - a wrong answer is a miss; the student can fix it and check again
 *   - a problem the student does not know can be passed (no points, not a miss)
 *   speed    = pieces of the solved problems per minute
 *   accuracy = solved ÷ (solved + misses)
 *   score    = 10 × speed × accuracy³
 * Pure functions (check.mjs tests them); the screen is in student.js.
 * ========================================================= */
import { bandLevel } from './lessons.js';
import { LESSON_BY_KEY } from './engine.js';

export const RK_N = 12;   // problems per test
export const RK_TIERS = ['beginner', 'intermediate', 'advanced'];
/** the lessons of each test, easy to hard */
export const RK_LESSONS = {
  beginner: ['select', 'alias', 'where', 'andor', 'between', 'like', 'null', 'orderby', 'distinct', 'limit'],
  intermediate: ['insert', 'update', 'delete', 'aggfn', 'groupby', 'having', 'wherehaving', 'case', 'calc', 'coalesce', 'strfn', 'dates', 'setops'],
  advanced: ['sub1', 'subin', 'subfrom', 'with', 'window', 'inner', 'innercols', 'innerwhere', 'left', 'antijoin', 'leftorder', 'join3']
};
/** the ranks and the score each starts at (provisional: to be tuned with real results) */
export const RK_RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
export const RK_FROM = [0, 25, 50, 90, 140, 200, 280];
export const rankOf = score => RK_RANKS[RK_FROM.filter(t => score >= t).length - 1];
export const rankToNext = score => { const i = RK_FROM.filter(t => score >= t).length; return i >= RK_FROM.length ? null : RK_FROM[i] - score; };

/** the lessons of the RK_N slots: spread over the test's lessons, in order */
export const rankSlots = tier => { const ls = RK_LESSONS[tier]; return Array.from({ length: RK_N }, (_, i) => ls[Math.floor(i * ls.length / RK_N)]); };

/**
 * The problems of one test: RK_N ordering problems (pieces of one or two words), easy to hard.
 * The lesson's level rises with the slot (basic → standard → advanced) where the lesson has levels.
 */
export function rankProblems(engine, tier, seed) {
  const slots = rankSlots(tier), out = [], seen = new Set();
  slots.forEach((key, i) => {
    const lesson = LESSON_BY_KEY[key], sets = engine.themesFor(lesson), band = 1 + Math.floor(i * 3 / RK_N), lv = bandLevel(key, band);
    for (let k = 0; k < 40; k++) {
      const ds = sets[(k + i) % sets.length], sd = `RK${seed}|${tier}|${i}|${k}`;
      const p = lv ? engine.genLevel(lesson, ds, sd, lv) || engine.genOne(lesson, ds, sd) : engine.genOne(lesson, ds, sd);
      if (!p) continue;
      const prob = engine.buildProblem(lesson, p, 'order2', 0, ds.table || ds.key);
      if (seen.has(prob.sql)) continue;
      Object.assign(prob, { id: `rank:${seed}:${i}:${prob.id}`, kind: 'practice', test: true, rank: true, rn: i });
      const task = engine.orderTask(prob);
      if (!task || !task.fine) continue;
      seen.add(prob.sql); out.push(prob); break;
    }
  });
  return out;
}

/** score of a finished test; pieces = pieces of the solved problems, ms = the time taken */
export function rankScore(pieces, solved, misses, ms) {
  const min = Math.max(ms, 1000) / 60000;
  const speed = pieces / min, acc = solved + misses ? solved / (solved + misses) : 0;
  const score = Math.round(10 * speed * acc ** 3);
  return { speed: Math.round(speed * 10) / 10, acc: Math.round(acc * 1000) / 10, score, rank: rankOf(score) };
}

/** the class log of a result (problem_id ≤ 80, reason ≤ 40): rk:<tier>:<score>:<rank> */
export const rankRow = r => ({ problem_id: `rk:${r.tier}:${r.score}:${r.rank}`, lesson: 'rank', stage: 'review', ok: true,
  reason: `${r.speed}/min ${r.acc}%`.slice(0, 40),
  sql: JSON.stringify({ t: r.tier, sp: r.speed, acc: r.acc, ok: r.solved, pass: r.passed, miss: r.misses, ms: r.ms }).slice(0, 2000) });
export const isRankRow = a => !!(a && a.problem_id && a.problem_id.startsWith('rk:'));
export function rankFromRow(a) {
  const [, tier, score, rank] = a.problem_id.split(':');
  let d = {}; try { d = JSON.parse(a.sql || '{}'); } catch (e) { /* an old row */ }
  return { tier, score: +score, rank, speed: d.sp, acc: d.acc, solved: d.ok, passed: d.pass, misses: d.miss, ms: d.ms, at: a.created_at, user: a.user_id };
}
/** the class ranking of one test: each student's best, high to low (ties: the earlier one first) */
export function classRanking(rows, tier) {
  const best = {};
  rows.filter(isRankRow).map(rankFromRow).filter(r => r.tier === tier).forEach(r => {
    const b = best[r.user];
    if (!b || r.score > b.score || (r.score === b.score && r.at < b.at)) best[r.user] = r;
  });
  return Object.values(best).sort((a, b) => b.score - a.score || (a.at < b.at ? -1 : 1));
}
