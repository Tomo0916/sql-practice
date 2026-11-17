/* =========================================================
 * level.js — a student's SQL level (レベル): a placement test, the level
 * it gives, and practice that fits the level. No DOM (check.mjs tests it).
 *
 * Levels follow the chapters, in order:
 *   Lv 0 nothing yet · 1 SELECT · 2 WHERE · 3 ORDER BY / LIMIT ·
 *   4 INSERT / UPDATE / DELETE · 5 GROUP BY · 6 JOIN
 * Lv n = the first n chapters are passed.
 *
 * The test a student takes alone is adaptive (adaptiveStart … below): the next
 * problem depends on the answers and the kind of mistake; a chapter gets a
 * score 0 まだ · 1 あと少し · 2 合格 · 3 得意. The test sent to the whole class
 * (quick.js levelSlots) is the fixed one: 3 writing problems from each chapter
 * (its first, middle and last lesson), the score = right answers.
 * Either way only the first answer counts, no hints, and 2 or more passes a chapter.
 *
 * Practice at a level (a round of 5): 3 problems from the chapter being
 * learned (the first one not passed) and 2 from chapters already passed.
 * The 3 start as fill-in; a round with all 3 right moves to ordering,
 * then to writing; two such rounds of writing in a row pass the chapter:
 * the level goes up (past chapters the test already showed as known).
 *
 * progress.level = { lv, prof, fmt, streak, ptr, at, upd, rounds }
 *   prof   — right answers per chapter in the test (null = not reached)
 *   fmt    — 0 fill-in · 1 ordering · 2 writing, in the chapter being learned
 *   streak — perfect writing rounds in a row;  ptr — which lessons come next
 * ========================================================= */
import { LESSONS } from './lessons.js';
import { LESSON_BY_KEY, makeRng } from './engine.js';
import { patternsOf, patProblem, ladderOf } from './mastery.js';

export const LV_CHAPTERS = ['basics', 'filter', 'sort', 'change', 'agg', 'join'];
export const LV_MAX = LV_CHAPTERS.length;
export const LV_PER = 3;       // test problems per chapter
export const LV_PASS = 2;      // right answers that pass a chapter
export const LV_ROUND = 5;     // problems in a round of practice
export const LV_FORMATS = ['fill', 'order2', 'write'];
export const LV_STREAK = 2;    // perfect writing rounds that pass a chapter

/** the lessons of a chapter that have problems to write */
export const chapterLessons = ch => LESSONS.filter(l => l.ch === ch && l.kind !== 'quiz' && !l.fixed).map(l => l.key);
/** the lessons the test asks about: the first, the middle and the last of the chapter */
export function testLessons(ch) {
  const ls = chapterLessons(ch);
  if (ls.length <= LV_PER) return ls;
  return [ls[0], ls[Math.floor((ls.length - 1) / 2)], ls[ls.length - 1]];
}
/** a problem of a lesson in a format (the nearest format the lesson has, towards writing) */
function lessonProblem(engine, key, token, seed) {
  const lesson = LESSON_BY_KEY[key], ladder = ladderOf(lesson), pats = patternsOf(key, engine).list;
  const f = Math.max(0, ladder.indexOf(token) >= 0 ? ladder.indexOf(token) : token === 'order2' ? ladder.length - 1 : 0);
  return patProblem(engine, key, makeRng(`${seed}|pat`).pick(pats), { f: token === 'write' ? ladder.length - 1 : f }, seed);
}

/* ---------- the placement test ---------- */
/** the problems of a test: writing, first answer only (test: true), ch = the chapter's number */
export function buildTest(engine, seed) {
  const out = [];
  LV_CHAPTERS.forEach((ch, c) => testLessons(ch).forEach((key, j) => {
    const p = lessonProblem(engine, key, 'write', `lvtest|${seed}|${key}`);
    out.push(Object.assign({}, p, { id: `level:${seed}:${c}:${j}`, kind: 'practice', test: true, ch: c, src: p.id }));
  }));
  return out;
}
/** right answers per chapter (null = no problem of the chapter was reached) */
export function testProfile(items, done) {
  return LV_CHAPTERS.map((ch, c) => { const ps = items.filter(p => p.ch === c && done[p.id] !== undefined); return ps.length ? ps.filter(p => done[p.id]).length : null; });
}
export const passed = n => n !== null && n !== undefined && n >= LV_PASS;
/** the level a profile gives: the chapters passed in a row from the first */
export function levelOf(prof) { let lv = 0; while (lv < LV_MAX && passed(prof[lv])) lv++; return lv; }
/** after the problem at position i: true = the test ends here (two chapters in a row failed, or no problems left) */
export function testEnds(items, done, i) {
  if (i + 1 >= items.length) return true;
  const c = items[i].ch;
  if (items[i + 1].ch === c) return false;   // the chapter is not finished
  const right = k => items.filter(p => p.ch === k && done[p.id]).length;
  return c >= 1 && right(c) < LV_PASS && right(c - 1) < LV_PASS;
}
/** the state after a test */
export function afterTest(items, done, now) {
  const prof = testProfile(items, done);
  return { lv: levelOf(prof), prof, fmt: 0, streak: 0, ptr: 0, at: now, upd: now, rounds: 0 };
}

/* ---------- the adaptive placement test (適応型レベルテスト) ----------
 * The next problem depends on the answers so far, and on the kind of mistake.
 * In each chapter (2 or 3 problems):
 *   A  basic (the chapter's first lesson, its first pattern), to write
 *      right → B  advanced (the last lesson, a harder pattern): right → 3 得意 (done)
 *                                                         wrong → C  standard (the middle lesson): right → 2 合格 · wrong → 1 あと少し
 *      wrong, a slip (a typo, full-width or curly quotes, a misspelt column)
 *            → A2 another basic one to write: right → C (2 合格 / 1 あと少し) · wrong → P
 *      wrong otherwise → P  the basic one again as ordering (読めるか): right → 1 あと少し · wrong → 0 まだ
 * A mistake that shows the shape of an earlier chapter is not there yet (no FROM, a missing comma,
 * quotes …) puts that chapter back on the list: one more basic problem of it (再確認);
 * wrong → it is not passed after all (at most 1).
 * Chapters go in order; the test ends after a chapter with 0, or two chapters in a row below 2.
 * Score 2 or more passes a chapter (as LV_PASS), so the level and the teacher's view read it as before.
 *
 * state = { seed, chs: [chapter numbers to test], c (index in chs), steps: [{ c, part, lesson, fmt, ok, why }],
 *           score: { chapter: n }, recheck: [chapter], checked: [chapter], end }
 * ========================================================= */
export const LV_SLIPS = new Set(['fullwidth', 'smartQuote', 'doubleQuote', 'column', 'columnUnknown', 'values']);
const SHAPE_CH = { cols: 0, wnum: 1, wtext: 1, order: 2, limit: 2, insert: 3, update: 3, delete: 3, alias: 0, like: 1, null: 1, having: 4, innercols: 5 };
/** a wrong answer → 'slip' | { shape: an earlier chapter } | 'concept'  (shapeStep: the basic shape the mistake points to, from basics.js) */
export function mistakeKind(c, dxKeys, shapeStep) {
  const sc = shapeStep && SHAPE_CH[shapeStep] !== undefined ? SHAPE_CH[shapeStep] : null;
  if (sc !== null && sc < c) return { shape: sc };
  if ((dxKeys || []).length && dxKeys.every(k => LV_SLIPS.has(k))) return 'slip';
  return 'concept';
}
export function adaptiveStart(seed, chapters) {
  const chs = (Array.isArray(chapters) && chapters.length ? chapters.slice().sort((a, b) => a - b) : LV_CHAPTERS.map((x, i) => i));
  return { seed, chs, c: 0, steps: [], score: {}, recheck: [], checked: [], end: false };
}
/** the part of a chapter to ask next (null = the chapter is decided), from its steps so far */
function nextPart(steps) {
  const by = Object.fromEntries(steps.map(x => [x.part, x]));
  if (!by.A) return 'A';
  if (by.A.ok) return !by.B ? 'B' : by.B.ok ? null : !by.C ? 'C' : null;
  if (by.A.why === 'slip' && !by.A2) return 'A2';
  if (by.A2 && by.A2.ok) return !by.C ? 'C' : null;
  return !by.P ? 'P' : null;
}
/** the score of a decided chapter */
function scoreOf(steps) {
  const by = Object.fromEntries(steps.map(x => [x.part, x]));
  if (by.B && by.B.ok) return 3;
  if (by.C) return by.C.ok ? 2 : 1;
  if (by.P) return by.P.ok ? 1 : 0;
  return 0;
}
/** where the next problem comes from: { c: chapter, part, lesson, fmt, tier } or null (the test is over) */
export function adaptiveNext(T) {
  if (T.end) return null;
  if (T.recheck.length) { const k = T.recheck[0]; const ls = chapterLessons(LV_CHAPTERS[k]); return { c: k, part: 'R', lesson: ls[0], fmt: 'write', tier: 0 }; }
  const c = T.chs[T.c]; if (c === undefined) return null;
  const part = nextPart(T.steps.filter(x => x.c === c && x.part !== 'R'));
  if (!part) return null;
  const ls = chapterLessons(LV_CHAPTERS[c]);
  const lesson = part === 'B' ? ls[ls.length - 1] : part === 'C' ? ls[Math.floor((ls.length - 1) / 2)] || ls[0] : ls[0];
  return { c, part, lesson, fmt: part === 'P' ? 'order2' : 'write', tier: part === 'B' ? 2 : part === 'C' ? 1 : 0 };
}
/** the state after an answer to `it` (the result of adaptiveNext): ok, and for a wrong answer its kind (mistakeKind) */
export function adaptiveAnswer(T, it, ok, why) {
  const o = Object.assign({}, T, { steps: [...T.steps, { c: it.c, part: it.part, lesson: it.lesson, fmt: it.fmt, ok: !!ok, why: ok ? null : typeof why === 'object' && why ? 'shape' : why || 'concept' }], score: Object.assign({}, T.score), recheck: T.recheck.slice(), checked: T.checked.slice() });
  if (it.part === 'R') {   // the second look at an earlier chapter
    o.recheck.shift(); o.checked.push(it.c);
    if (!ok) o.score[it.c] = Math.min(1, o.score[it.c]);
  } else if (!ok && why && typeof why === 'object' && why.shape !== undefined) {
    const k = why.shape;
    if (o.score[k] >= LV_PASS && !o.checked.includes(k) && !o.recheck.includes(k)) o.recheck.push(k);
  }
  if (it.part !== 'R') {
    const c = it.c, steps = o.steps.filter(x => x.c === c && x.part !== 'R');
    if (!nextPart(steps)) {   // the chapter is decided
      o.score[c] = scoreOf(steps); o.c++;
      const done = o.chs.slice(0, o.c), last = done[done.length - 1], prev = done[done.length - 2];
      if (o.score[last] === 0 || (prev !== undefined && o.score[last] < LV_PASS && o.score[prev] < LV_PASS)) o.stop = true;
    }
  }
  if ((o.stop || o.c >= o.chs.length) && !o.recheck.length) o.end = true;
  return o;
}
/** the profile (score per chapter, null = not reached) and the level; chapters not in the test keep `prev` */
export function adaptiveProfile(T, prev) {
  const prof = LV_CHAPTERS.map((x, i) => (prev && prev[i] !== undefined && !T.chs.includes(i) ? prev[i] : null));
  Object.entries(T.score).forEach(([c, n]) => { prof[+c] = n; });
  return prof;
}
export function adaptiveResult(T, now, prev) {
  const prof = adaptiveProfile(T, prev);
  return { lv: levelOf(prof), prof, fmt: 0, streak: 0, ptr: 0, at: now, upd: now, rounds: 0 };
}
/** the problem for a step of the test (patterns: basic = the lesson's first, advanced = its later ones) */
export function adaptiveProblem(engine, T, it, n, used) {
  const pats = patternsOf(it.lesson, engine).list, R = makeRng(`${T.seed}|${n}|pat`);
  const topic = it.tier === 0 ? pats[0] : it.tier === 2 ? pats[Math.max(0, pats.length - 1 - R.int(0, Math.min(1, pats.length - 1)))] : R.pick(pats);
  const lesson = LESSON_BY_KEY[it.lesson], ladder = ladderOf(lesson);
  const f = it.fmt === 'write' ? ladder.length - 1 : Math.max(0, ladder.indexOf('order2') >= 0 ? ladder.indexOf('order2') : ladder.length - 1);
  const seen = new Set(used || []);
  let p = null;
  for (let k = 0; k < 6; k++) { p = patProblem(engine, it.lesson, topic, { f }, `lvA|${T.seed}|${n}|${k}`); if (p && !seen.has(p.sql)) break; }
  return p && Object.assign({}, p, { id: `level:${T.seed}:${n}`, kind: 'practice', test: true, ch: it.c, src: p.id, lvStep: it });
}

/* ---------- practice at the level ---------- */
/** the chapter being learned (null when every chapter is passed) */
export const targetChapter = st => (st && st.lv < LV_MAX ? LV_CHAPTERS[st.lv] : null);
/** a round: `target: true` marks the problems of the chapter being learned */
export function buildRound(engine, st, seed) {
  const out = [], seen = new Set(), R = makeRng(`lvround|${seed}`);
  const add = (key, token, target, tag) => {
    for (let k = 0; k < 6; k++) {
      const p = lessonProblem(engine, key, token, `lv|${seed}|${tag}|${k}`);
      if (p && !seen.has(p.sql)) { seen.add(p.sql); out.push(Object.assign(p, { target })); return; }
    }
  };
  const ch = targetChapter(st), known = LV_CHAPTERS.slice(0, st.lv).flatMap(chapterLessons);
  if (ch) {
    const ls = chapterLessons(ch), nT = known.length ? 3 : LV_ROUND;
    for (let j = 0; j < nT; j++) add(ls[((st.ptr || 0) + j) % ls.length], LV_FORMATS[Math.max(0, Math.min(2, st.fmt || 0))], true, `t${j}`);
  }
  const rest = R.shuffle(known);
  for (let j = 0; out.length < LV_ROUND && rest.length && j < LV_ROUND * 2; j++) add(rest[j % rest.length], 'write', false, `k${j}`);
  return out;
}
/**
 * the state after a round → { st, up (the level went up), move: 'up' | 'same' | 'down' (the format) }
 * All target problems right: the next format; at writing, the streak grows and at LV_STREAK the chapter is passed.
 * None right: one format back. Otherwise the same again.
 */
export function afterRound(st, items, done, now) {
  const o = Object.assign({}, st, { prof: (st.prof || []).slice(), upd: now, rounds: (st.rounds || 0) + 1 });
  const tg = items.filter(p => p.target);
  if (!tg.length) return { st: o, up: false, move: 'same' };
  const right = tg.filter(p => done[p.id]).length;
  o.ptr = (o.ptr || 0) + tg.length;
  if (right === tg.length) {
    if ((o.fmt || 0) < 2) { o.fmt = (o.fmt || 0) + 1; o.streak = 0; return { st: o, up: false, move: 'up' }; }
    o.streak = (o.streak || 0) + 1;
    if (o.streak >= LV_STREAK) {
      o.prof[o.lv] = Math.max(LV_PASS, o.prof[o.lv] || 0);
      o.lv = levelOf(o.prof); o.fmt = 0; o.streak = 0; o.ptr = 0;
      return { st: o, up: true, move: 'up' };
    }
    return { st: o, up: false, move: 'same' };
  }
  o.streak = 0;
  if (right === 0 && (o.fmt || 0) > 0) { o.fmt--; return { st: o, up: false, move: 'down' }; }
  return { st: o, up: false, move: 'same' };
}

/* ---------- for the teacher: the level travels in the class log as one row ---------- */
/** problem_id of the row a student's page writes when the level is set or goes up: lv:<level>:<profile> (profile: one character per chapter, - = not reached) */
export const levelTag = st => `lv:${st.lv}:${LV_CHAPTERS.map((c, i) => (st.prof && st.prof[i] !== null && st.prof[i] !== undefined ? Math.min(9, st.prof[i]) : '-')).join('')}`;
export const isLevelRow = a => !!(a && a.problem_id && a.problem_id.startsWith('lv:'));
/** the latest level of each student from the class log → Map user_id → { lv, prof, at } */
export function levelsFromLog(rows) {
  const out = new Map();
  rows.filter(isLevelRow).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).forEach(a => {
    const m = /^lv:(\d):([0-9-]{1,8})/.exec(a.problem_id); if (!m) return;
    out.set(a.user_id, { lv: Math.min(LV_MAX, +m[1]), prof: m[2].split('').map(x => (x === '-' ? null : +x)), at: a.created_at });
  });
  return out;
}
