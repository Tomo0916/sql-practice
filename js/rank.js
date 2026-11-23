/* =========================================================
 * rank.js — the rank tests (ランクテスト), in the manner of e-typing's level check:
 * a fixed set of problems, solved one after another against the clock;
 * the score comes from speed and accuracy, and gives a rank.
 *
 * A test for each subject (the app's 8 chapters) and tier (beginner, intermediate, advanced):
 * 24 tests. Each: RK_N ordering problems with pieces of one or two words, in lesson order.
 *   - a wrong answer is a miss; the student can fix it and check again
 *   - a problem the student does not know can be passed (no points, not a miss)
 *   speed    = pieces of the solved problems per minute
 *   accuracy = solved ÷ (solved + misses)
 *   score    = 10 × speed × accuracy³
 * Pure functions (check.mjs tests them); the screen is in student.js.
 * ========================================================= */
import { LESSONS, bandLevel } from './lessons.js';
import { LESSON_BY_KEY } from './engine.js';

export const RK_N = 12;   // problems per test
export const RK_TIERS = ['beginner', 'intermediate', 'advanced'];
/** the subjects (the app's chapters; data analysis has no ordering problems) */
export const RK_CHAPTERS = ['basics', 'filter', 'sort', 'change', 'agg', 'func', 'sub', 'join'];
/** a test = a subject and a tier: 'join-advanced' */
export const rankKey = (ch, tier) => `${ch}-${tier}`;
export const rankParse = key => { const m = /^([a-z]+)-(beginner|intermediate|advanced)$/.exec(key || ''); return m && RK_CHAPTERS.includes(m[1]) ? { ch: m[1], tier: m[2] } : null; };
/** the lessons of a subject, in order (not the question-only ones) */
export const rankLessons = ch => LESSONS.filter(l => l.ch === ch && l.kind !== 'quiz' && l.key !== 'types').map(l => l.key);
/** the ranks and the score each starts at (provisional: to be tuned with real results) */
export const RK_RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
export const RK_FROM = [0, 25, 50, 90, 140, 200, 280];
export const rankOf = score => RK_RANKS[RK_FROM.filter(t => score >= t).length - 1];
export const rankToNext = score => { const i = RK_FROM.filter(t => score >= t).length; return i >= RK_FROM.length ? null : RK_FROM[i] - score; };

/** the lessons of the RK_N slots: spread over the subject's lessons, in order */
export const rankSlots = ch => { const ls = rankLessons(ch); return Array.from({ length: RK_N }, (_, i) => ls[Math.floor(i * ls.length / RK_N)]); };

/**
 * The problems of one test: RK_N ordering problems (pieces of one or two words), in lesson order.
 * The tier decides how hard:
 *   beginner     — the lesson's easiest level, the shortest problem of a few made, no trap piece
 *   intermediate — the middle level, a problem of middle length, a trap piece when there is one
 *   advanced     — the hardest level, the longest problem, a trap piece when there is one
 */
export function rankProblems(engine, ch, tier, seed) {
  const slots = rankSlots(ch), out = [], seen = new Set(), band = RK_TIERS.indexOf(tier) + 1;
  slots.forEach((key, i) => {
    const lesson = LESSON_BY_KEY[key], sets = engine.themesFor(lesson), lv = bandLevel(key, band), cands = [];
    for (let k = 0; k < 60 && cands.length < 5; k++) {
      const ds = sets[(k + i) % sets.length], sd = `RK${seed}|${ch}|${tier}|${i}|${k}`;
      const p = lv ? engine.genLevel(lesson, ds, sd, lv) || engine.genOne(lesson, ds, sd) : engine.genOne(lesson, ds, sd);
      if (!p) continue;
      const prob = engine.buildProblem(lesson, p, 'order2', 0, ds.table || ds.key);
      if (seen.has(prob.sql) || cands.some(c => c.sql === prob.sql)) continue;
      Object.assign(prob, { id: `rank:${seed}:${ch}:${tier}:${i}:${prob.id}`, kind: 'practice', test: true, rank: true, rn: i });
      const task = engine.orderTask(prob);
      if (task && task.fine) cands.push(prob);
    }
    if (!cands.length) return;
    const by = cands.slice().sort((a, b) => engine.orderTask(a).answer.length - engine.orderTask(b).answer.length);
    const prob = tier === 'beginner' ? by[0] : tier === 'advanced' ? by[by.length - 1] : by[Math.floor((by.length - 1) / 2)];
    if (tier === 'beginner') { const t = engine.orderTask(prob); prob._order = Object.assign({}, t, { chunks: t.chunks.filter(c => !c.distractor) }); }   // no trap piece
    seen.add(prob.sql); out.push(prob);
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

/** the class log of a result (problem_id ≤ 80, reason ≤ 40): rk:<subject-tier>:<score>:<rank> */
export const rankRow = r => ({ problem_id: `rk:${r.test}:${r.score}:${r.rank}`, lesson: 'rank', stage: 'review', ok: true,
  reason: `${r.speed}/min ${r.acc}%`.slice(0, 40),
  sql: JSON.stringify({ t: r.test, sp: r.speed, acc: r.acc, ok: r.solved, pass: r.passed, miss: r.misses, ms: r.ms }).slice(0, 2000) });
export const isRankRow = a => !!(a && a.problem_id && a.problem_id.startsWith('rk:'));
export function rankFromRow(a) {
  const [, test, score, rank] = a.problem_id.split(':');
  let d = {}; try { d = JSON.parse(a.sql || '{}'); } catch (e) { /* an old row */ }
  return { test, score: +score, rank, speed: d.sp, acc: d.acc, solved: d.ok, passed: d.pass, misses: d.miss, ms: d.ms, at: a.created_at, user: a.user_id };
}
/** the class ranking of one test ('join-advanced'): each student's best, high to low (ties: the earlier one first) */
export function classRanking(rows, test) {
  const best = {};
  rows.filter(isRankRow).map(rankFromRow).filter(r => r.test === test).forEach(r => {
    const b = best[r.user];
    if (!b || r.score > b.score || (r.score === b.score && r.at < b.at)) best[r.user] = r;
  });
  return Object.values(best).sort((a, b) => b.score - a.score || (a.at < b.at ? -1 : 1));
}
