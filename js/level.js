/* =========================================================
 * level.js — a student's SQL level (レベル): a placement test, the level
 * it gives, and practice that fits the level. No DOM (check.mjs tests it).
 *
 * Levels follow the chapters, in order:
 *   Lv 0 nothing yet · 1 SELECT · 2 WHERE · 3 ORDER BY / LIMIT ·
 *   4 INSERT / UPDATE / DELETE · 5 GROUP BY · 6 JOIN
 * Lv n = the first n chapters are passed.
 *
 * The test: 3 writing problems from each chapter (its first, middle and
 * last lesson), only the first answer counts, no hints. 2 of 3 right
 * passes a chapter. It stops early after two chapters in a row are failed.
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
