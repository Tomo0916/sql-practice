/* =========================================================
 * quick.js — the quick test (クイックテスト): a few problems for the whole
 * class at once. Students who solve them all may take a break; the teacher
 * sees who has finished. Kept on the class row as
 *   quick = { id, code, at, n }   (null = no quick test running)
 *   id   — this round (a new id each time the teacher starts one)
 *   code — the check-test code (lessons ~ formats ~ count ~ seed), same problems for everyone
 *   at   — when it started (server time, ISO)
 * Answers go to the class log as stage 'quick' with problem_id quick:<id>:<n>.
 * Retrying is allowed: a problem counts when it is answered right.
 * (No DOM here: tools-next/check.mjs tests it in Node.)
 * ========================================================= */
import { normCheck, encodeCheck, decodeCheck, buildCheck, checkCounts } from './check.js';
import { randomCode } from './engine.js';

export const QUICK_COUNTS = [1, 2, 3, 4, 5];
export const QUICK_PRESETS = {
  write: { fill: 0, order1: 0, order2: 0, write: 3 },   // per lesson; the test takes the first n after shuffling
  mix: { fill: 1, order1: 1, order2: 0, write: 2 },
  order: { fill: 0, order1: 2, order2: 1, write: 0 },
};
export const quickOn = c => !!(c && c.quick && c.quick.id && decodeCheck(c.quick.code));
export const quickPid = (id, i) => `quick:${id}:${i}`;

/** a new quick test: the same problems for everyone (a fixed seed), a new round id */
export function newQuick(cfg, atIso) {
  const c = normCheck(Object.assign({}, cfg, { max: 0, seed: randomCode(4) }));   // all the problems, shuffled; the first n are the test
  const n = Math.min(Math.max(1, +cfg.max || 3), checkCounts(c).all);
  return { id: randomCode(5), code: encodeCheck(c), at: atIso || new Date().toISOString(), n };
}
/** how many problems a quick test with these settings has */
export const quickCount = cfg => Math.min(Math.max(1, +cfg.max || 3), checkCounts(normCheck(Object.assign({}, cfg, { max: 0 }))).all);
/** the problems of a quick test, with their quick ids (answers hidden until it is over) */
export function quickProblems(engine, q) {
  const cfg = q && decodeCheck(q.code);
  if (!cfg) return [];
  return buildCheck(engine, cfg, cfg.seed).slice(0, q.n).map((p, i) => Object.assign(p, { id: quickPid(q.id, i), quick: q.id, qn: i }));
}
/**
 * Who has finished: from the class log (rows with stage 'quick').
 * → Map user_id → { ok: Set of problem numbers solved, tries, first, done (time all were solved) }
 */
export function quickProgress(attempts, q) {
  const out = new Map();
  if (!q) return out;
  const pre = `quick:${q.id}:`;
  attempts.filter(a => a.problem_id && a.problem_id.startsWith(pre))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : (a.id || 0) - (b.id || 0)))
    .forEach(a => {
      const i = +a.problem_id.slice(pre.length);
      const s = out.get(a.user_id) || { ok: new Set(), tries: 0, first: a.created_at, done: null, last: a.created_at };
      s.tries++; s.last = a.created_at;
      if (a.ok) s.ok.add(i);
      if (!s.done && s.ok.size >= q.n) s.done = a.created_at;
      out.set(a.user_id, s);
    });
  return out;
}
