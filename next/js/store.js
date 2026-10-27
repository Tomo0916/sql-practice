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
  return Object.assign({ solved: {}, wrong: {}, drafts: {}, lessons: {}, last: null, streak: { day: 0, n: 0 } }, p);
}
export function saveProgress(p) { Store.set(KEYS.progress, p); }

/** a lesson is complete when the example, fill, order and 2 write problems are solved */
export function lessonState(progress, problems) {
  const solved = problems.map(p => !!progress.solved[p.id]);
  const by = st => problems.filter((p, i) => p.stage === st && solved[i]).length;
  const done = by('demo') >= 1 && by('fill') >= 1 && by('order') >= 1 && by('write') >= 2;
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
