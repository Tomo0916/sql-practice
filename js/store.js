/* =========================================================
 * store.js — everything kept in this browser
 * ========================================================= */
export const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
export const KEYS = { settings: 'sqln.settings', progress: 'sqln.progress', set: 'sqln.set', klass: 'sqln.class', test: 'sqln.test', teacher: 'sqln.teacher' };

const DAY = 86400000;
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ---------- settings ---------- */
export function loadSettings(detected) {
  return Object.assign({ lang: detected, second: null, theme: 'auto', size: 'm', presenter: false }, Store.get(KEYS.settings, {}));
}
export function saveSettings(s) { Store.set(KEYS.settings, s); }

/* ---------- progress ----------
 * solved:  problemId → time (ids do not depend on language)
 * wrong:   problemId → number of wrong runs
 * drafts:  problemId → text in editor / blanks / order
 * lessons: lessonKey → { done, due, ivl }   (spaced review)
 */
export function loadProgress() {
  const p = Store.get(KEYS.progress, null) || {};
  return Object.assign({ solved: {}, wrong: {}, drafts: {}, answers: {}, lessons: {}, drill: {}, last: null, streak: { day: 0, n: 0 } }, p);
}
/**
 * Two tabs (or windows) of the app share one record: before saving, take what the other one saved,
 * so neither overwrites the other. Solved problems and right answers are kept from both (the earliest wins);
 * counts take the larger number; drafts and the current place are this tab's.
 */
export function mergeProgress(stored, mine) {
  const out = Object.assign({}, stored, mine);
  const earliest = (a, b) => { const o = Object.assign({}, b, a); Object.keys(b || {}).forEach(k => { if (a && a[k] && b[k] && (a[k].at || a[k]) > (b[k].at || b[k])) o[k] = b[k]; }); return o; };
  out.solved = earliest(stored.solved || {}, mine.solved || {});
  out.answers = earliest(stored.answers || {}, mine.answers || {});
  const max = (a, b) => { const o = Object.assign({}, a); Object.entries(b || {}).forEach(([k, v]) => { o[k] = Math.max(o[k] || 0, v); }); return o; };
  out.wrong = max(stored.wrong, mine.wrong);
  out.drill = max(stored.drill, mine.drill);
  out.lessons = Object.assign({}, stored.lessons, mine.lessons);
  out.streak = (stored.streak || {}).day > (mine.streak || {}).day || ((stored.streak || {}).day === (mine.streak || {}).day && (stored.streak || {}).n > (mine.streak || {}).n) ? stored.streak : mine.streak;
  out.drafts = mine.drafts || {};   // drafts belong to the tab (a removed draft must not come back)
  return out;
}
export function saveProgress(p) {
  const stored = Store.get(KEYS.progress, null);
  const merged = stored ? mergeProgress(Object.assign({ solved: {}, wrong: {}, drafts: {}, answers: {}, lessons: {}, drill: {} }, stored), p) : p;
  Object.assign(p, merged);   // this tab sees the other tab's work too
  Store.set(KEYS.progress, p);
}

/** a lesson is complete when the example, fill, order and 2 write problems are solved */
export function lessonState(progress, problems) {
  const solved = problems.map(p => !!progress.solved[p.id]);
  const by = st => problems.filter((p, i) => p.stage === st && solved[i]).length;
  // each kind of problem the lesson has must be solved: example, fill-in, ordering, 2 writing (or 3 questions in Lesson 0)
  const has = st => problems.some(p => p.stage === st);
  const need = { demo: 1, fill: 1, order: 1, write: 2, quiz: 3 };
  // a class's own format: every problem it gives must be solved
  const done = problems.some(p => p.fmt) ? solved.every(Boolean) : Object.entries(need).every(([st, n]) => !has(st) || by(st) >= n);
  return { solved, count: solved.filter(Boolean).length, done };
}
export function markLessonDone(progress, key) {
  const L = progress.lessons[key] || {};
  if (!L.done) progress.lessons[key] = { done: Date.now(), ivl: 1, due: today() + DAY };
}
/** after a review problem: success doubles the interval, failure brings it back to tomorrow */
export function reviewResult(progress, key, ok) {
  const L = progress.lessons[key];
  if (!L) return;
  if (ok) { L.ivl = Math.min(60, Math.round((L.ivl || 1) * 2.5)); L.due = today() + L.ivl * DAY; }
  else { L.ivl = 1; L.due = today() + DAY; }
}
export function dueLessons(progress) {
  const t = today();
  return Object.entries(progress.lessons).filter(([, L]) => L.done && L.due <= t).map(([k]) => k);
}
export function bumpStreak(progress) {
  const t = today();
  const s = progress.streak || { day: 0, n: 0 };
  if (s.day === t) return;
  s.n = s.day === t - DAY ? s.n + 1 : 1;
  s.day = t;
  progress.streak = s;
}
