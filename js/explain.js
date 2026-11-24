/* =========================================================
 * explain.js — 説明モード: the teacher shows lectures to the class, across lessons
 * (SQL and Python), and can sync the students' screens.
 *
 * In the class row: tasks.explain = { on, key, i, at }
 *   on: the students follow (同期); key: the lecture (a lesson key); i: the step; at: when it was sent.
 *   A state older than EX_STALE is ignored (a teacher who closed the page without stopping).
 * The teacher's own list (今日の流れ) and saved plans stay in the teacher's browser.
 * ========================================================= */
import { raw, rubyHTML } from './i18n.js';
import { LESSONS, CHAPTERS } from './lessons.js';
import { LESSON_BY_KEY } from './engine.js';
import { PD_LESSONS, PD_BY_KEY } from './pandas.js';
import { lectureOf, hasLecture } from './lectures.js';

export const EX_STALE = 3 * 3600 * 1000;

/** the lesson object a lecture belongs to (SQL lesson, or a Python lesson) */
export const exLesson = key => LESSON_BY_KEY[key] || (PD_BY_KEY[key] ? { key, no: PD_BY_KEY[key].no, py: true } : null);

/** every lecture: [{ key, py, no, ch }] — SQL in the chapters' order, then Python */
export function exCatalog() {
  const sql = CHAPTERS.flatMap(ch => LESSONS.filter(l => l.ch === ch.key && hasLecture(l.key)).map(l => ({ key: l.key, py: false, no: l.no, ch: ch.key })));
  const py = PD_LESSONS.filter(l => hasLecture(l.key)).map(l => ({ key: l.key, py: true, no: l.no, ch: 'py' }));
  return [...sql, ...py];
}
/** a lecture's name (HTML) in a language */
export const exTitleHTML = (key, lang) => { const x = exLesson(key); if (!x) return ''; return `${x.py ? 'Python ' : ''}${x.no}. ${rubyHTML(raw(x.py ? 'pd.t.' + key : `L.${key}.title`, lang))}`; };

/** text to search a lecture by: its names in the language and in English, and the code on its slides */
const searchText = new Map();
export function exMatches(key, q, lang) {
  if (!q) return true;
  const k = key + '|' + lang;
  if (!searchText.has(k)) {
    const x = exLesson(key), L = lectureOf(key), name = x.py ? 'pd.t.' + key : `L.${key}.title`;
    const codes = L ? L.slides.flatMap(s => [s.code, s.sql, ...(s.frames || []).flatMap(f => [f.sql, f.code])]).filter(v => typeof v === 'string') : [];
    searchText.set(k, [raw(name, lang), raw(name, 'en'), x.py ? 'python pandas' : 'sql', ...codes].join(' ').replace(/\{([^|}]+)\|[^}]+\}/g, '$1').toLowerCase());
  }
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => searchText.get(k).includes(w));
}

/** the class's explain state now, or null */
export function exOf(klass) {
  const e = klass && klass.tasks && klass.tasks.explain;
  if (!e || !e.on || !e.key || !exLesson(e.key) || !hasLecture(e.key)) return null;
  if (e.at && Date.now() - e.at > EX_STALE) return null;
  return e;
}
