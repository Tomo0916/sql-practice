/* =========================================================
 * quick.js — the quick test (クイックテスト): a few problems for the whole
 * class at once. Students who reach the pass line may take a break; the
 * teacher sees who has passed. Kept on the class row as
 *   quick = { id, code, at, n, pass, end, pick }   (null = no quick test running)
 *   id   — this round (a new id each time the teacher starts one)
 *   code — the check-test code of the pool (lessons ~ formats ~ 0 ~ seed): every problem, shuffled
 *   pick — which problems of the pool are the test (the teacher can swap one before starting)
 *   n    — number of problems;  pass — right answers needed to pass (≤ n)
 *   at   — start time (server time, ISO): a few seconds after the teacher presses start,
 *          so everyone begins together after a countdown
 *   end  — time limit (ISO) or null
 * Answers go to the class log as stage 'quick' with problem_id quick:<id>:<n>.
 * Retrying is allowed: a problem counts when it is answered right before the end.
 * (No DOM here: tools-next/check.mjs tests it in Node.)
 * ========================================================= */
import { normCheck, encodeCheck, decodeCheck, buildCheck, checkCounts } from './check.js';
import { randomCode } from './engine.js';

export const QUICK_COUNTS = [1, 2, 3, 4, 5];
export const QUICK_LIMITS = [0, 3, 5, 10, 15];   // minutes; 0 = no limit
export const QUICK_COUNTDOWN = 5;                 // seconds before everyone starts
export const QUICK_GRACE = 5000;                  // ms after the end an answer still counts (it was on its way)
export const QUICK_PRESETS = {
  write: { fill: 0, order1: 0, order2: 0, write: 3 },   // per lesson; the test takes n of the shuffled pool
  mix: { fill: 1, order1: 1, order2: 0, write: 2 },
  order: { fill: 0, order1: 2, order2: 1, write: 0 },
};
export const quickOn = c => !!(c && c.quick && c.quick.id && decodeCheck(c.quick.code));
export const quickPid = (id, i) => `quick:${id}:${i}`;
export const passOf = q => Math.max(1, Math.min(q.n, +q.pass || q.n));

/** the pool of a draft: all the problems of the chosen lessons and kind, shuffled by the seed */
export function poolCode(cfg, seed) { return encodeCheck(normCheck(Object.assign({}, cfg, { max: 0, seed }))); }
export function poolSize(cfg) { return checkCounts(normCheck(Object.assign({}, cfg, { max: 0 }))).all; }
/** how many problems a quick test with these settings has */
export const quickCount = cfg => Math.min(Math.max(1, +cfg.max || 3), poolSize(cfg));

/**
 * A new quick test from the teacher's draft { cfg, seed, pick, pass, limit }.
 * nowMs = the server's time now; the test starts QUICK_COUNTDOWN seconds later.
 */
export function newQuick(d, nowMs) {
  const code = poolCode(d.cfg, d.seed || randomCode(4));
  const size = checkCounts(decodeCheck(code)).all;
  const n = Math.min(Math.max(1, +d.cfg.max || 3), size);
  const pick = fixPick(d.pick, n, size);
  const at = (nowMs || Date.now()) + QUICK_COUNTDOWN * 1000;
  const limit = Math.max(0, +d.limit || 0);
  return { id: randomCode(5), code, at: new Date(at).toISOString(), n, pass: Math.max(1, Math.min(n, +d.pass || n)), end: limit ? new Date(at + limit * 60000).toISOString() : null, pick };
}
/** n different pool positions: the ones given (when valid), then the first free ones */
export function fixPick(pick, n, size) {
  const out = [];
  (Array.isArray(pick) ? pick : []).forEach(i => { if (Number.isInteger(i) && i >= 0 && i < size && !out.includes(i) && out.length < n) out.push(i); });
  for (let i = 0; out.length < n && i < size; i++) if (!out.includes(i)) out.push(i);
  return out;
}
/** swap the problem in slot k for the next one of the pool that is not used yet */
export function swapPick(pick, k, size) {
  const used = new Set(pick);
  for (let step = 1; step <= size; step++) {
    const i = (pick[k] + step) % size;
    if (!used.has(i)) { const out = pick.slice(); out[k] = i; return out; }
  }
  return pick;
}
/** the problems of a pool (draft preview) */
export function poolProblems(engine, code) {
  const cfg = decodeCheck(code);
  return cfg ? buildCheck(engine, cfg, cfg.seed) : [];
}
/** the problems of a quick test, with their quick ids (answers hidden until it is over) */
export function quickProblems(engine, q) {
  const pool = q ? poolProblems(engine, q.code) : [];
  if (!pool.length) return [];
  const pick = q.pick ? fixPick(q.pick, q.n, pool.length) : pool.slice(0, q.n).map((p, i) => i);
  return pick.map((j, i) => Object.assign({}, pool[j], { id: quickPid(q.id, i), quick: q.id, qn: i }));
}
/** 'wait' (countdown) | 'run' | 'up' (time is over) at this moment (ms, server time) */
export function quickPhase(q, nowMs) {
  if (!q) return 'none';
  if (nowMs < new Date(q.at).getTime()) return 'wait';
  if (q.end && nowMs > new Date(q.end).getTime()) return 'up';
  return 'run';
}
/**
 * Who has passed: from the class log (rows with stage 'quick'). Answers after the end
 * (plus a few seconds on the way) do not count.
 * → Map user_id → { ok: Set of problem numbers solved, tries, first, last, done (time the pass line was reached), all (time all were solved) }
 */
export function quickProgress(attempts, q) {
  const out = new Map();
  if (!q) return out;
  const pre = `quick:${q.id}:`, pass = passOf(q);
  const stop = q.end ? new Date(q.end).getTime() + QUICK_GRACE : Infinity;
  attempts.filter(a => a.problem_id && a.problem_id.startsWith(pre) && new Date(a.created_at).getTime() <= stop)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : (a.id || 0) - (b.id || 0)))
    .forEach(a => {
      const i = +a.problem_id.slice(pre.length);
      const s = out.get(a.user_id) || { ok: new Set(), tries: 0, first: a.created_at, done: null, all: null, last: a.created_at };
      s.tries++; s.last = a.created_at;
      if (a.ok) s.ok.add(i);
      if (!s.done && s.ok.size >= pass) s.done = a.created_at;
      if (!s.all && s.ok.size >= q.n) s.all = a.created_at;
      out.set(a.user_id, s);
    });
  return out;
}
