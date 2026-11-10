/* =========================================================
 * quick.js — the quick test (クイックテスト): a few problems for the whole
 * class at once. Students who reach the pass line may take a break; the
 * teacher sees who has passed. Kept on the class row as
 *   quick = { id, seed, slots, at, n, pass, end }   (null = no quick test running)
 *   id    — this round (a new id each time the teacher starts one)
 *   seed  — makes the problems; slots — the test, one per problem: { k: lesson, st: kind, i: which one }
 *           (kinds: fill, order1, order2, write; i = position in that lesson's shuffled problems of that kind,
 *           so the teacher can swap a problem for another of the same lesson and kind)
 *   (older tests: code + pick — the check-test code of a shuffled pool and positions in it)
 *   n    — number of problems;  pass — right answers needed to pass (≤ n)
 *   at   — start time (server time, ISO): a few seconds after the teacher presses start,
 *          so everyone begins together after a countdown
 *   end  — time limit (ISO) or null
 * Answers go to the class log as stage 'quick' with problem_id quick:<id>:<n>.
 * Retrying is allowed: a problem counts when it is answered right before the end.
 * (No DOM here: tools-next/check.mjs tests it in Node.)
 * ========================================================= */
import { normCheck, decodeCheck, buildCheck } from './check.js';
import { randomCode, stagesOf, LESSON_BY_KEY, FORMAT_KEYS, FORMAT_MAX } from './engine.js';

export const QUICK_COUNTS = [1, 2, 3, 4, 5];
export const QUICK_LIMITS = [0, 3, 5, 10, 15];   // minutes; 0 = no limit
export const QUICK_COUNTDOWN = 5;                 // seconds before everyone starts
export const QUICK_GRACE = 5000;                  // ms after the end an answer still counts (it was on its way)
export const QUICK_PRESETS = ['write', 'mix', 'order'];   // easy set-up: the kinds of problems
export const quickOn = c => !!(c && c.quick && c.quick.id && ((Array.isArray(c.quick.slots) && c.quick.slots.length) || decodeCheck(c.quick.code)));
export const quickPid = (id, i) => `quick:${id}:${i}`;
export const passOf = q => Math.max(1, Math.min(q.n, +q.pass || q.n));


/* ---------- the problems: one pool per lesson and kind, slots that point into the pools ---------- */
export const KINDS = FORMAT_KEYS;   // fill, order1, order2, write
/** the kinds a lesson has (Lesson 2 and data analysis have no fill-in / ordering) */
export function kindsOf(key) {
  const l = LESSON_BY_KEY[key]; if (!l || l.kind === 'quiz') return [];
  const own = stagesOf(l);
  return KINDS.filter(k => k === 'write' || (k === 'fill' ? own.includes('fill') : own.includes('order')));
}
const poolCache = new Map();
/** all the problems of one lesson and kind, shuffled by the seed (up to FORMAT_MAX) */
export function kindPool(engine, key, st, seed) {
  const id = `${key}|${st}|${seed}`;
  if (poolCache.has(id)) return poolCache.get(id);
  const f = { fill: 0, order1: 0, order2: 0, write: 0 }; f[st] = FORMAT_MAX;
  let out = [];
  if (kindsOf(key).includes(st)) {
    const seen = new Set();
    out = buildCheck(engine, normCheck({ lessons: [key], f, max: 0, seed }), `${seed}${st}`).filter(p => !seen.has(p.sql) && seen.add(p.sql));
  }
  if (poolCache.size > 400) poolCache.clear();
  poolCache.set(id, out);
  return out;
}
const SIMPLE_KINDS = { write: ['write'], mix: ['fill', 'order1', 'write'], order: ['order1', 'order2'] };
/** the first position of a lesson's pool of this kind that is free: not used, and not the same query as another slot (a fill-in and a write of one query would give it away) */
function freeIndex(engine, k, st, seed, slots, from = 0, skip = -1) {
  const pool = kindPool(engine, k, st, seed);
  const sqls = new Set(slots.filter((y, m) => m !== skip).map(y => (kindPool(engine, y.k, y.st, seed)[y.i] || {}).sql));
  for (let step = 0; step < pool.length; step++) {
    const i = (from + step) % pool.length;
    if (!sqls.has(pool[i].sql) && !slots.some((y, m) => m !== skip && y.k === k && y.st === st && y.i === i)) return i;
  }
  return null;
}
/** easy set-up: n problems spread over the lessons, of the kinds of a preset */
export function simpleSlots(engine, lessons, n, kind, seed) {
  const kinds = SIMPLE_KINDS[kind] || SIMPLE_KINDS.write, out = [];
  if (!lessons.length) return out;
  for (let r = 0; r < FORMAT_MAX * kinds.length && out.length < n; r++) for (let j = 0; j < lessons.length && out.length < n; j++) {
    const k = lessons[j], st0 = kinds[(j + r) % kinds.length], st = kindsOf(k).includes(st0) ? st0 : 'write';
    const i = freeIndex(engine, k, st, seed, out);
    if (i !== null) out.push({ k, st, i });
  }
  return out;
}
/** detailed set-up: per lesson, how many of each kind  { lessonKey: { fill, order1, order2, write } } */
export function detailSlots(engine, per, order, seed) {
  const out = [];
  for (const k of order) {
    const c = per[k] || {};
    for (const st of KINDS) {
      const want = kindsOf(k).includes(st) ? Math.max(0, Math.min(FORMAT_MAX, +c[st] || 0)) : 0;
      for (let w = 0; w < want; w++) { const i = freeIndex(engine, k, st, seed, out); if (i === null) break; out.push({ k, st, i }); }
    }
  }
  return out;
}
/** the slots with the teacher's swaps { slotNumber: i } (only free positions) */
export function applySwaps(engine, slots, swaps, seed) {
  const out = slots.map(x => Object.assign({}, x));
  Object.entries(swaps || {}).forEach(([j, i]) => {
    const x = out[+j]; if (!x || !Number.isInteger(i)) return;
    if (freeIndex(engine, x.k, x.st, seed, out, i, +j) === i) x.i = i;
  });
  return out;
}
/** another problem of the same lesson and kind for slot j (null when there is none) */
export function nextFree(engine, slots, j, seed) {
  const x = slots[j], i = freeIndex(engine, x.k, x.st, seed, slots, x.i + 1, j);
  return i === null || i === x.i ? null : i;
}
export function slotProblems(engine, seed, slots) {
  return relabel(slots.map(x => kindPool(engine, x.k, x.st, seed)[x.i]).filter(Boolean));
}
/** "Write 1, 2 …" counted inside the test (not the lesson's own numbers) */
function relabel(list) {
  const seen = {};
  return list.map(p => { const k = p.stage === 'order' ? 'order' + (p.level || 1) : p.stage; seen[k] = (seen[k] || 0) + 1; return Object.assign({}, p, { wn: seen[k], of: 1 }); });
}
/** a new quick test: { seed, slots, pass, limit }; nowMs = the server's time; it starts after the countdown */
export function newQuick(d, nowMs) {
  const at = (nowMs || Date.now()) + QUICK_COUNTDOWN * 1000, n = d.slots.length;
  const limit = Math.max(0, +d.limit || 0);
  return { id: randomCode(5), seed: d.seed, slots: d.slots.map(x => ({ k: x.k, st: x.st, i: x.i })), at: new Date(at).toISOString(), n,
    pass: Math.max(1, Math.min(n, +d.pass || n)), end: limit ? new Date(at + limit * 60000).toISOString() : null };
}
/** the problems of a quick test, with their quick ids (answers hidden until it is over) */
export function quickProblems(engine, q) {
  if (!q) return [];
  let list;
  if (Array.isArray(q.slots)) list = slotProblems(engine, q.seed, q.slots);
  else {   // an older test: a shuffled pool and positions in it
    const cfg = decodeCheck(q.code); if (!cfg) return [];
    const pool = buildCheck(engine, cfg, cfg.seed);
    list = relabel((q.pick || pool.slice(0, q.n).map((p, i) => i)).map(j => pool[j]).filter(Boolean));
  }
  return list.map((p, i) => Object.assign({}, p, { id: quickPid(q.id, i), quick: q.id, qn: i }));
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
  const stop = stopOf(q);
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

/* ---------- results: after (or during) a quick test ----------
 * The class keeps a list of its quick tests (quick_log, newest first; each entry is the test
 * itself plus `stopped` when the teacher ended it). The answers stay in the class log, so the
 * result of an old test can be worked out again at any time (until the log is cleared). */
export const QUICK_LOG_MAX = 30;
/** the list with this test put in (new) or replaced (same id) */
export function logPut(log, q) {
  const rest = (Array.isArray(log) ? log : []).filter(x => x && x.id && x.id !== q.id);
  return [q, ...rest].slice(0, QUICK_LOG_MAX);
}
export const logDrop = (log, id) => (Array.isArray(log) ? log : []).filter(x => x && x.id !== id);
/** the moment answers stop counting: the time limit, or when the teacher ended the test */
const stopOf = q => Math.min(q.end ? new Date(q.end).getTime() + QUICK_GRACE : Infinity, q.stopped ? new Date(q.stopped).getTime() + QUICK_GRACE : Infinity);
/**
 * The result of a quick test.
 * attempts = the class log (rows of stage 'quick'), members = [{ user_id, nickname }]
 * → { rows: one per member [{ user_id, nickname, started, ok: [true/false per problem], tries: [answers per problem], score, passed, ms (to the pass line) }],
 *     perQ: one per problem [{ solved, tried, rate (of those who started), tries (answers by everyone), wrong: [{ sql, reason, n }] the most common wrong answers }],
 *     started, passed, avg (right answers per student who started) }
 */
export function quickStats(attempts, q, members) {
  const n = q.n, pass = passOf(q), pre = `quick:${q.id}:`, stop = stopOf(q), t0 = new Date(q.at).getTime();
  const mine = attempts.filter(a => a.problem_id && a.problem_id.startsWith(pre) && new Date(a.created_at).getTime() <= stop)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : (a.id || 0) - (b.id || 0)));
  const by = new Map();
  const wrong = Array.from({ length: n }, () => new Map());
  for (const a of mine) {
    const i = +a.problem_id.slice(pre.length);
    if (!(i >= 0 && i < n)) continue;
    const s = by.get(a.user_id) || { ok: Array(n).fill(false), tries: Array(n).fill(0), at: null };
    if (s.ok[i]) continue;   // answers after the first right one are looking back
    s.tries[i]++;
    if (a.ok) { s.ok[i] = true; if (!s.at && s.ok.filter(Boolean).length >= pass) s.at = new Date(a.created_at).getTime(); }
    else if (a.sql) {
      const key = String(a.sql).replace(/\s+/g, ' ').trim();
      const w = wrong[i].get(key) || { sql: key, reason: a.reason || null, n: 0, who: new Set() };
      w.n++; w.who.add(a.user_id); wrong[i].set(key, w);
    }
    by.set(a.user_id, s);
  }
  const rows = members.map(m => {
    const s = by.get(m.user_id);
    const score = s ? s.ok.filter(Boolean).length : 0;
    return { user_id: m.user_id, nickname: m.nickname, started: !!s, ok: s ? s.ok : Array(n).fill(false), tries: s ? s.tries : Array(n).fill(0), score, passed: !!s && score >= pass, ms: s && s.at ? Math.max(0, s.at - t0) : null };
  });
  const started = rows.filter(r => r.started);
  const perQ = Array.from({ length: n }, (_, i) => {
    const tried = started.filter(r => r.tries[i] > 0).length, solved = started.filter(r => r.ok[i]).length;
    return { solved, tried, rate: started.length ? solved / started.length : 0, tries: started.reduce((a, r) => a + r.tries[i], 0),
      wrong: [...wrong[i].values()].map(w => ({ sql: w.sql, reason: w.reason, n: w.who.size })).sort((a, b) => b.n - a.n || (a.sql < b.sql ? -1 : 1)).slice(0, 3) };
  });
  return { rows, perQ, started: started.length, passed: rows.filter(r => r.passed).length, avg: started.length ? started.reduce((a, r) => a + r.score, 0) / started.length : 0 };
}
/** the result as CSV (for a spreadsheet): one row per student. head = column names [name, score, passed, time, tries] */
export function quickCSV(stats, q, head) {
  // a name that starts like a formula gets a ' in front, so a spreadsheet shows it as text
  const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const qs = Array.from({ length: q.n }, (_, i) => `Q${i + 1}`);
  const lines = [[head[0], head[1], head[2], head[3], ...qs, head[4]]];
  for (const r of stats.rows) lines.push([r.nickname, r.started ? r.score : '', r.started ? (r.passed ? 1 : 0) : '', r.ms === null ? '' : Math.round(r.ms / 1000), ...r.ok.map((o, i) => (r.started ? (o ? 1 : r.tries[i] ? 0 : '') : '')), r.started ? r.tries.reduce((a, b) => a + b, 0) : '']);
  return '﻿' + lines.map(l => l.map(cell).join(',')).join('\r\n') + '\r\n';
}
/** the shape of a test, to make another like it: { lessons: [keys in order], per: { key: { fill, order1, order2, write } } } */
export function slotsShape(slots) {
  const lessons = [], per = {};
  for (const x of slots || []) {
    if (!per[x.k]) { per[x.k] = { fill: 0, order1: 0, order2: 0, write: 0 }; lessons.push(x.k); }
    per[x.k][x.st] = (per[x.k][x.st] || 0) + 1;
  }
  return { lessons, per };
}
