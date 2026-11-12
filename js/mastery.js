/* =========================================================
 * mastery.js — review by pattern (復習): what a student has mastered,
 * and what to practise today. No DOM (tools-next/check.mjs tests it).
 *
 * A lesson has patterns: the kinds of query its problems ask for
 * (WHERE: "= with text", ">= with a number" …; js/lecture-topics.js).
 * Each pattern is practised up a ladder of formats with fewer and fewer
 * hints — fill in → put in order → write — and, once it can be written,
 * comes back after longer and longer gaps (1, 3, 7, 14, 30, 60 days).
 *
 * progress.pat = { "<lesson>|<pattern>": { f, s, due, n, ng, last } }
 *   f    — the step on the ladder (0 = the most hints)
 *   s    — how many times in a row it was written correctly (the gaps get longer)
 *   due  — the day it comes back (local midnight, ms)
 *   n, ng — answers and wrong answers so far;  last — the day of the last answer
 * A wrong answer goes one step down the ladder and comes back tomorrow;
 * the other patterns of the lesson are not touched.
 * Only the first answer to a problem counts.
 * ========================================================= */
import { LESSONS } from './lessons.js';
import { LESSON_BY_KEY, stagesOf, makeRng, hashStr } from './engine.js';
import { topicsOf } from './lecture-topics.js';
import { LECTURES } from './lectures.js';

export const DAY = 86400000;
export const GAPS = [1, 3, 7, 14, 30, 60];   // days until a pattern that was written correctly comes back
export const REVIEW_N = 5;                   // problems in one round
export const REVIEW_NEW = 2;                 // new patterns in a round, when older ones are waiting too
export const patKey = (lesson, topic) => `${lesson}|${topic}`;

/* ---------- the patterns of a lesson (in the order the lecture teaches them: easier first) ---------- */
const patCache = new Map(), reachCache = new Map();
/** the patterns the lesson's practice problems can ask for (a pattern only the example shows is left out) */
function reach(engine, key) {
  if (reachCache.has(key)) return reachCache.get(key);
  const lesson = LESSON_BY_KEY[key], out = new Set();
  if (lesson.fixed) out.add('main');
  else for (let round = 0; round < 6; round++) for (const ds of engine.themesFor(lesson)) { const p = engine.genOne(lesson, ds, `reach|${round}|${ds.table || ds.key}`); if (p) topicsOf(key, p).forEach(t => out.add(t)); }
  reachCache.set(key, out);
  return out;
}
/** { list: [patterns], labels } — with an engine, only the patterns that can be practised */
export function patternsOf(key, engine) {
  if (engine) { const all = patternsOf(key), can = reach(engine, key), list = all.list.filter(t => can.has(t)); return { list: list.length ? list : all.list.slice(0, 1), labels: all.labels }; }
  if (patCache.has(key)) return patCache.get(key);
  const lec = LECTURES[key], out = [], labels = {};
  if (lec && lec.slides) for (const sl of lec.slides) for (const f of (sl.cases ? sl.frames : [])) for (const c of f.covers || []) {
    if (!out.includes(c)) out.push(c);
    if (!labels[c] || (f.covers[0] === c && !labels[c].own)) labels[c] = { text: f.label, own: f.covers[0] === c };
  }
  const v = { list: out.length ? out : ['main'], labels };
  patCache.set(key, v);
  return v;
}
/** the name of a pattern: { en, ja, easy } from the lecture, or null (a lesson with one pattern: use the lesson's title) */
export const patLabel = (key, topic) => { const l = patternsOf(key).labels[topic]; return l ? l.text : null; };

/* ---------- the ladder of formats of a lesson ---------- */
export function ladderOf(lesson) {
  if (lesson.kind === 'quiz') return ['quiz'];
  if (lesson.fixed) return ['write'];
  const own = stagesOf(lesson), out = [];
  if (own.includes('fill')) out.push('fill');
  if (own.includes('order')) out.push('order2');
  out.push('write');
  return out;
}
const topOf = lesson => ladderOf(lesson).length - 1;

/* ---------- state ---------- */
/** a pattern met for the first time in review: the lesson was just finished, so one step below writing */
export const patStart = lesson => ({ f: Math.max(0, topOf(lesson) - 1), s: 0, due: 0, n: 0, ng: 0, last: 0 });
/** 0 not started · 1 practising (with hints) · 2 can write it · 3 mastered (written correctly three times in a row: the last after a gap of 3 days or more) */
export function patLevel(st, lesson) {
  if (!st || !st.n) return 0;
  if (st.f < topOf(lesson)) return 1;
  return st.s >= 3 ? 3 : st.s >= 1 ? 2 : 1;
}
/** after the first answer to a review problem → the new state (does not change `st`) */
export function patResult(st, lesson, ok, t) {
  const top = topOf(lesson), o = Object.assign({}, st || patStart(lesson));
  o.n = (o.n || 0) + 1; o.last = t;
  if (!ok) { o.ng = (o.ng || 0) + 1; o.f = Math.max(0, Math.min(o.f, top) - 1); o.s = 0; o.due = t + DAY; return o; }
  if (o.f < top) { o.f++; o.s = 0; o.due = t + DAY; return o; }
  o.due = t + GAPS[Math.min(o.s, GAPS.length - 1)] * DAY; o.s++;
  return o;
}
/** lessons whose patterns are reviewed: finished on an earlier day (a lesson finished today starts tomorrow) */
const reviewable = (progress, t) => LESSONS.filter(l => { const L = (progress.lessons || {})[l.key]; return L && L.done && L.done < t; });
/**
 * What is waiting today: { due: [...], fresh: [...] } of { lesson, topic, key, st }
 * due   — patterns whose day has come (the longest-waiting first)
 * fresh — patterns never reviewed, in lesson order and the lecture's order
 */
export function patWaiting(progress, t, engine) {
  const pat = progress.pat || {}, due = [], fresh = [];
  for (const l of reviewable(progress, t)) for (const topic of patternsOf(l.key, engine).list) {
    const key = patKey(l.key, topic), st = pat[key];
    if (!st || !st.n) fresh.push({ lesson: l.key, topic, key, st: null });
    else if (st.due <= t) due.push({ lesson: l.key, topic, key, st });
  }
  due.sort((a, b) => a.st.due - b.st.due || a.st.f - b.st.f);
  return { due, fresh };
}
/** one round: up to n patterns — those waiting first, with a few new ones mixed in; `skip` = keys already done in this sitting */
export function patPick(progress, t, engine, n = REVIEW_N, skip = []) {
  const w = patWaiting(progress, t, engine), no = new Set(skip);
  const due = w.due.filter(x => !no.has(x.key)), fresh = w.fresh.filter(x => !no.has(x.key));
  const nNew = Math.min(fresh.length, Math.max(n - due.length, Math.min(REVIEW_NEW, n)));
  const out = [...due.slice(0, n - nNew), ...fresh.slice(0, nNew)];
  return makeRng(`review|${t}|${out.map(x => x.key).join(',')}`).shuffle(out);
}
/** how far a lesson has come: the level of each of its patterns */
export const lessonLevels = (progress, key, engine) => patternsOf(key, engine).list.map(topic => ({ topic, st: (progress.pat || {})[patKey(key, topic)] || null, level: patLevel((progress.pat || {})[patKey(key, topic)], LESSON_BY_KEY[key]) }));

/* ---------- a problem for a pattern, in the format of its step ---------- */
/** an extra problem (not one of the lesson's own) from parameters, in a format: 'fill' | 'order1' | 'order2' | 'write' | 'quiz'; null when it cannot be made in that format */
export function makeProblem(engine, lesson, p, theme, token) {
  const pr = engine.buildProblem(lesson, p, 'review', 0, theme);
  Object.assign(pr, { kind: 'review', stage: token.startsWith('order') ? 'order' : token, level: token === 'order2' ? 2 : token === 'order1' ? 1 : undefined, wn: 1, of: 1 });
  pr.id = `${lesson.key}:review:${token}:${hashStr(pr.sql).toString(36)}`;
  if (pr.stage === 'order' && !engine.orderTask(pr)) return null;
  if (pr.stage === 'fill' && !engine.fillTask(pr)) return null;
  return pr;
}
/**
 * A new problem of this lesson that asks for this pattern, as fill-in / ordering / writing.
 * seed changes the data and the numbers. When no problem of the pattern is found (rare),
 * any problem of the lesson is used.
 */
export function patProblem(engine, lessonKey, topic, st, seed) {
  const lesson = LESSON_BY_KEY[lessonKey], ladder = ladderOf(lesson);
  const state = st || patStart(lesson), step = Math.max(0, Math.min(state.f, ladder.length - 1));
  const mark = pr => Object.assign(pr, { pat: patKey(lessonKey, topic), topic, step, steps_n: ladder.length });
  if (lesson.fixed) return mark(engine.reviewProblem(lesson, `${seed}|${topic}`));
  const build = (p, theme, token) => makeProblem(engine, lesson, p, theme, token);
  let spare = null;
  // the format of the step first; a problem that cannot be made in that format moves towards writing
  for (let s = step; s < ladder.length; s++) {
    for (let round = 0; round < 12; round++) {
      for (const ds of makeRng(`${seed}|${round}`).shuffle(engine.themesFor(lesson))) {
        const theme = ds.table || ds.key, p = engine.genOne(lesson, ds, `${seed}|${round}|${theme}`);
        if (!p) continue;
        const fits = topicsOf(lessonKey, p).includes(topic);
        if (!fits && spare) continue;
        const pr = build(p, theme, ladder[s]);
        if (!pr) continue;
        if (fits) return mark(pr);
        spare = pr;
      }
    }
    if (spare) return mark(spare);
  }
  return mark(engine.reviewProblem(lesson, `${seed}|${topic}`));
}

/* ---------- one table, many queries (同じテーブルで練習) ----------
 * The lessons' problems move from table to table. Here the student chooses one table
 * (or one pair of tables for JOIN) and practises the lessons in order on it,
 * so only the query changes from problem to problem. */
import { SINGLE_DATASETS, JOIN_DATASETS } from './datasets.js';
/** the tables to choose from: [{ key, tables: [names], join, lessons: [keys that can use it] }] */
export function tableSets(engine) {
  const can = l => !l.fixed && l.kind !== 'quiz';
  const single = LESSONS.filter(l => can(l) && engine.themesFor(l) === SINGLE_DATASETS).map(l => l.key);
  const join = LESSONS.filter(l => can(l) && engine.themesFor(l) === JOIN_DATASETS).map(l => l.key);
  return [...SINGLE_DATASETS.map(d => ({ key: d.table, tables: [d.table], join: false, lessons: single, ds: d })),
    ...JOIN_DATASETS.map(d => ({ key: d.key, tables: [d.left.table, d.right.table], join: true, lessons: join, ds: d }))];
}
/**
 * The problems of a round on one table: `per` problems for each lesson, in lesson order,
 * in the format `token` ('fill' | 'order2' | 'write'; a lesson without that format moves towards writing).
 * A lesson's problems ask for different patterns when it has several.
 */
export function tableCourse(engine, setKey, lessonKeys, token, per, seed) {
  const set = tableSets(engine).find(x => x.key === setKey); if (!set) return [];
  const out = [], seen = new Set(), theme = set.ds.table || set.ds.key;
  for (const l of LESSONS.filter(x => lessonKeys.includes(x.key) && set.lessons.includes(x.key))) {
    const ladder = ladderOf(l), from = Math.max(0, ladder.indexOf(token)), used = new Set();
    for (let j = 0; j < per; j++) {
      let pick = null;
      for (let round = 0; round < 16 && !(pick && pick.fresh); round++) {
        const p = engine.genOne(l, set.ds, `${seed}|${l.key}|${j}|${round}`); if (!p) continue;
        const tp = topicsOf(l.key, p).join('+'), fresh = !used.has(tp);
        if (pick && !fresh) continue;
        let pr = null; for (let s = from; s < ladder.length && !pr; s++) pr = makeProblem(engine, l, p, theme, ladder[s]);
        if (pr && !seen.has(pr.sql)) pick = { pr, tp, fresh };
      }
      if (pick) { used.add(pick.tp); seen.add(pick.pr.sql); out.push(pick.pr); }
    }
  }
  return out;
}
