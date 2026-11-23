/* =========================================================
 * rank.js — the rank tests (ランクテスト), in the manner of e-typing's level check:
 * how many ordering problems can be solved within a short time limit.
 *
 * A test for each subject (the app's 8 chapters) and tier (初級 / 中級 / 上級): 24 tests.
 * Time limit: 初級 2 min, 中級 3 min, 上級 4 min. Problems keep coming until the time is up.
 *   - a wrong answer is a miss; the student can fix it and check again
 *   - a problem the student does not know can be passed (no points, not a miss)
 *   score = 10 × solved − 3 × misses (not below 0)
 * Pure functions (check.mjs tests them); the screen is in student.js.
 * ========================================================= */
import { LESSONS, bandLevel } from './lessons.js';
import { LESSON_BY_KEY } from './engine.js';

export const RK_N = 10;   // problems made at the start (more are made as they are used)
/** the time limit of each tier, in seconds */
export const RK_SEC = { beginner: 120, intermediate: 180, advanced: 240 };
export const RK_PT = 10, RK_MISS = 3;   // points for a solved problem, minus for a miss
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
export const RK_FROM = [0, 20, 40, 60, 80, 110, 140];
export const rankOf = score => RK_RANKS[RK_FROM.filter(t => score >= t).length - 1];
export const rankToNext = score => { const i = RK_FROM.filter(t => score >= t).length; return i >= RK_FROM.length ? null : RK_FROM[i] - score; };

/** the lesson of problem i: the subject's lessons in order, round and round */
export const rankSlot = (ch, i) => { const ls = rankLessons(ch); return ls[i % ls.length]; };

/**
 * Problem i of one test (an ordering problem, pieces of one or two words); seen: the SQL already used.
 * The tier decides how hard:
 *   beginner     — the lesson's easiest level, the shortest problem of a few made, no trap piece
 *   intermediate — the middle level, a problem of middle length, a trap piece when there is one
 *   advanced     — the hardest level, the longest problem, a trap piece when there is one
 */
export function rankProblem(engine, ch, tier, seed, i, seen = new Set()) {
  const key = rankSlot(ch, i), lesson = LESSON_BY_KEY[key], sets = engine.themesFor(lesson), lv = bandLevel(key, RK_TIERS.indexOf(tier) + 1), cands = [];
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
  if (!cands.length) return null;
  const by = cands.slice().sort((a, b) => engine.orderTask(a).answer.length - engine.orderTask(b).answer.length);
  const prob = tier === 'beginner' ? by[0] : tier === 'advanced' ? by[by.length - 1] : by[Math.floor((by.length - 1) / 2)];
  if (tier === 'beginner') { const t = engine.orderTask(prob); prob._order = Object.assign({}, t, { chunks: t.chunks.filter(c => !c.distractor) }); }   // no trap piece
  seen.add(prob.sql);
  return prob;
}
/** problems from..from+n−1 of a test (skipping a lesson that makes none) */
export function rankProblems(engine, ch, tier, seed, n = RK_N, from = 0, seen = new Set()) {
  const out = [];
  for (let i = from; out.length < n && i < from + n * 3; i++) { const p = rankProblem(engine, ch, tier, seed, i, seen); if (p) out.push(p); }
  return out;
}

/** score of a finished test */
export function rankScore(solved, misses) {
  const score = Math.max(0, RK_PT * solved - RK_MISS * misses), acc = solved + misses ? solved / (solved + misses) : 0;
  return { score, rank: rankOf(score), acc: Math.round(acc * 1000) / 10 };
}

/** the class log of a result (problem_id ≤ 80, reason ≤ 40): rk:<subject-tier>:<score>:<rank> */
export const rankRow = r => ({ problem_id: `rk:${r.test}:${r.score}:${r.rank}`, lesson: 'rank', stage: 'review', ok: true,
  reason: `${r.solved} ok ${r.misses} miss`.slice(0, 40),
  sql: JSON.stringify({ t: r.test, acc: r.acc, ok: r.solved, pass: r.passed, miss: r.misses, ms: r.ms }).slice(0, 2000) });
export const isRankRow = a => !!(a && a.problem_id && a.problem_id.startsWith('rk:'));
export function rankFromRow(a) {
  const [, test, score, rank] = a.problem_id.split(':');
  let d = {}; try { d = JSON.parse(a.sql || '{}'); } catch (e) { /* an old row */ }
  return { test, score: +score, rank, acc: d.acc, solved: d.ok, passed: d.pass, misses: d.miss, ms: d.ms, at: a.created_at, user: a.user_id };
}
/** is result a better than result b? the higher score; at the same score, one without passes ("A" beats "A (with passes)") */
export const rankBetter = (a, b) => !b || a.score > b.score || (a.score === b.score && !a.passed && !!b.passed);
/** the class ranking of one test ('join-advanced'): each student's best, high to low (ties: without passes first, then the earlier one) */
export function classRanking(rows, test) {
  const best = {};
  rows.filter(isRankRow).map(rankFromRow).filter(r => r.test === test).forEach(r => {
    const b = best[r.user];
    if (rankBetter(r, b) || (!rankBetter(b, r) && r.at < b.at)) best[r.user] = r;
  });
  return Object.values(best).sort((a, b) => b.score - a.score || (!!a.passed - !!b.passed) || (a.at < b.at ? -1 : 1));
}
