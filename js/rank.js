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
import { th, esc } from './i18n.js';
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

/* ---------- 総合ランキング: each rank test's best, added up (rows from rank_total) ---------- */
export const RK_TESTS = RK_CHAPTERS.length * RK_TIERS.length;   // 24
/** places: the same total and the same number of tests with passes share a place */
export function totalPlaces(rows) { const p = []; rows.forEach((r, i) => { p[i] = i && rows[i - 1].total === r.total && rows[i - 1].passed === r.passed ? p[i - 1] : i + 1; }); return p; }
/**
 * The board. o = { lang, all (every class), top (show the first n, and me), act (data-act of the class / all switch), state ('loading' | null) }
 * rows: null = the database has no rank_total yet.
 */
export function totalBoardHTML(rows, o) {
  const L = o.lang, H = (k, v) => th(k, L, v);
  const seg = `<div class="seg rk-tscope">${[[false, 'rk.total.class'], [true, 'rk.total.all']].map(([v, k]) => `<button type="button" class="seg-b ${!!o.all === v ? 'on' : ''}" data-act="${o.act}" data-v="${v ? 'all' : 'class'}" aria-pressed="${!!o.all === v}">${H(k)}</button>`).join('')}</div>`;
  let body;
  if (o.state === 'loading') body = `<p class="muted small">${H('rk.loading')}</p>`;
  else if (rows === null) body = `<p class="muted small">${H(o.teacher ? 'rk.total.needT' : 'rk.total.need')}</p>`;
  else if (!rows.length) body = `<p class="muted small">${H('rk.total.none')}</p>`;
  else {
    const place = totalPlaces(rows), mi = rows.findIndex(r => r.me), top = o.top || rows.length;
    const show = rows.map((r, i) => i).filter(i => i < top || i === mi), max = Math.max(1, rows[0].total);
    body = `${mi >= 0 ? `<p class="rk-myplace">${H(o.all ? 'rk.total.myPlaceAll' : 'rk.myPlace', { n: place[mi], m: rows.length })}</p>` : ''}
      <ol class="rk-total">${show.map(i => { const r = rows[i];
        return `${i === mi && i >= top ? '<li class="gap" aria-hidden="true">⋯</li>' : ''}<li class="${r.me ? 'me' : ''} ${r.same ? '' : 'other'} ${place[i] <= 3 ? 'top top' + place[i] : ''}">
          <span class="rt-place">${place[i] <= 3 ? ['🥇', '🥈', '🥉'][place[i] - 1] : place[i]}</span>
          <span class="rt-name">${esc(r.nickname)}${r.me ? ` <span class="tag">${H('rk.you')}</span>` : ''}</span>
          <span class="rt-bar"><i style="width:${Math.round(r.total / max * 100)}%"></i></span>
          <span class="rt-pts"><b>${r.total}</b><small>${H('rk.total.pt')}</small></span>
          <span class="rt-tests muted small">${H('rk.total.tests', { n: r.tests, m: RK_TESTS })}${r.passed ? ` · ${H('rk.total.withPass', { n: r.passed })}` : ''}</span></li>`; }).join('')}</ol>`;
  }
  return `<div class="rk-tboard"><div class="rk-thead"><div><h3>${H('rk.total.title')}</h3><p class="muted small">${H('rk.total.sub', { m: RK_TESTS })}</p></div>${seg}</div>
    ${o.all ? `<p class="muted small rk-tnote">🔒 ${H('rk.total.allNote')}</p>` : ''}${body}</div>`;
}
/** the class's 総合ランキング from its own rows (the teacher has them): the same as rank_total(class) */
export function classTotals(rows, members) {
  const best = {};
  rows.filter(isRankRow).map(rankFromRow).filter(r => rankParse(r.test)).forEach(r => { const k = r.user + '|' + r.test, b = best[k]; if (rankBetter(r, b) || (!rankBetter(b, r) && r.at < b.at)) best[k] = r; });
  const tot = {};
  Object.values(best).forEach(r => { const t = (tot[r.user] = tot[r.user] || { user: r.user, total: 0, tests: 0, passed: 0, last_at: r.at }); t.total += r.score; t.tests++; if (r.passed) t.passed++; if (r.at > t.last_at) t.last_at = r.at; });
  const nick = u => (members.find(m => m.user_id === u) || {}).nickname;
  return Object.values(tot).filter(t => nick(t.user)).sort((a, b) => b.total - a.total || a.passed - b.passed || (a.last_at < b.last_at ? -1 : 1))
    .map(t => ({ nickname: nick(t.user), total: t.total, tests: t.tests, passed: t.passed, last_at: t.last_at, me: false, same: true }));
}
