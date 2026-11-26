/* =========================================================
 * assign.js — things a teacher sends to the class (配信).
 *
 * In the class row: tasks.items = [{ id, type, ref, at, open, limit?, n?, tables? }]
 *   type: rank | check | level           — tests: one try; each student starts when ready
 *         rankup                         — a subject's rank tests in turn: 初級 → 中級 → 上級; the next opens at rank `pass` or better
 *                                          without passes; a tier can be taken again until it is cleared
 *                                          (rank: the test's own time limit; check: the teacher's limit, or none)
 *         basics | clauses | drill | practice | table | lecture | py — practice and lectures
 *         read                           — a document to read: ref = a preset (READ_PRESETS) or 'url' (+ url, title); note = the teacher's message
 *                                          start = opened, done = the student pressed "read"
 *         pz                             — paiza practice: ref = a level (1–5); done when the level is cleared
 *         hr                             — HackerRank practice: ref = an area (sel | rel | agg) or 'mock';
 *                                          done when every problem of the area is solved / a mock test is finished;
 *                                          as:<id>:try rows carry the progress { n, m } on the way
 *   ref:  what exactly (the rank test 'agg-beginner', the check code, the lesson key, ...)
 *   open: false = closed by the teacher (no new starts; a student in the middle can finish)
 * The class log (attempts, lesson 'assign', stage 'review'):
 *   as:<id>:start — a test was started (so it cannot be started again, on any device)
 *   as:<id>:done  — finished; reason = a short summary, sql = JSON details
 *   as:<id>:try   — rankup: one finished rank test; sql = { tier, score, rank, passed, clear }
 * ========================================================= */
import { raw, rubyHTML, esc } from './i18n.js';
import { LESSON_BY_KEY } from './engine.js';
import { PD_BY_KEY } from './pandas.js';
import { BASIC_BY_KEY } from './basics.js';
import { KW } from './clauses.js';
import { rankParse, RK_SEC, RK_TIERS, RK_RANKS } from './rank.js';
import { hrDrill } from './hr.js';
import { pzLevel } from './pz.js';

export const ASG_TYPES = ['read', 'hr', 'pz', 'rankup', 'rank', 'check', 'level', 'basics', 'clauses', 'drill', 'practice', 'table', 'lecture', 'py'];
export const ASG_TEST = new Set(['rank', 'check', 'level']);
export const ASG_ICON = { read: '📖', hr: '🟩', pz: '🪜', rankup: '🪜', rank: '🏅', check: '📝', level: '🎯', basics: '🧱', clauses: '🧩', drill: '⇅', practice: '🎚', table: '🗂', lecture: '📽', py: '🐍' };

/** the class's items (open and closed), newest first */
export const asgList = k => (k && k.tasks && Array.isArray(k.tasks.items) ? k.tasks.items.slice().sort((a, b) => (b.at || 0) - (a.at || 0)) : []);
export const asgOpen = k => asgList(k).filter(it => it.open !== false);
export const asgById = (k, id) => asgList(k).find(it => it.id === id) || null;

/** the time limit of a test item in seconds (0 = none) */
export function asgLimit(it) {
  if (it.type === 'rank') { const t = rankParse(it.ref); return t ? RK_SEC[t.tier] : 0; }
  if (it.type === 'check') return Math.max(0, Math.min(180, it.limit || 0)) * 60;
  return 0;
}

/* ---------- documents to read ---------- */
export const READ_PRESETS = ['certs', 'hr', 'book_sql', 'book_ana', 'url'];
export const okUrl = u => /^https?:\/\/[^\s]+$/i.test(String(u || '').trim());
/** where a document is: an address in the app (#/…), a file of the site, or a web page */
export function asgReadUrl(it, lang) {
  switch (it.ref) {
    case 'certs': return `https://tomo0916.github.io/ds/certs/?lang=${encodeURIComponent(lang || 'ja')}`;
    case 'hr': return '#/hr';
    case 'book_sql': return 'book/sql-textbook-beginner.pdf';
    case 'book_ana': return 'book/data-analysis-textbook.pdf';
    default: return okUrl(it.url) ? String(it.url).trim() : '';
  }
}
/** HackerRank practice: the problems of an area that count, and how many are solved */
export const asgHrIds = it => (it.ref === 'mock' ? [] : hrDrill(it.ref).map(p => p.id));
/** where the item's page is in the student app */
/* ---------- rankup: the tiers in turn ---------- */
/** is a rank test result enough for the next tier? (rank `pass` or better, no passes) */
export const ruClears = (it, r) => !!r && !r.passed && RK_RANKS.indexOf(r.rank) >= RK_RANKS.indexOf(it.pass || 'B');
/** the tier to take now (null = all cleared); tiers = { beginner: { clear }, ... } */
export const ruNext = tiers => RK_TIERS.find(t => !(tiers && tiers[t] && tiers[t].clear)) || null;
/** each member's tiers from the class log: { beginner: { n, best, clear }, ... } */
export function ruResults(rows, members, it) {
  const mine = rows.map(asParse).filter(x => x && x.id === it.id && x.kind === 'try' && x.d && RK_TIERS.includes(x.d.tier));
  return members.map(m => {
    const tiers = {};
    mine.filter(x => x.user === m.user_id).forEach(x => { const t = tiers[x.d.tier] = tiers[x.d.tier] || { n: 0, best: null, clear: false };
      t.n++; if (x.d.clear) t.clear = true;
      if (!t.best || x.d.score > t.best.score || (x.d.score === t.best.score && !x.d.passed && t.best.passed)) t.best = x.d; });
    return { m, tiers, next: ruNext(tiers), n: Object.values(tiers).reduce((a, t) => a + t.n, 0) };
  });
}
export function asgHash(it) {
  const r = encodeURIComponent(it.ref || '');
  switch (it.type) {
    case 'rank': { const t = rankParse(it.ref); return t ? `#/rank/${t.ch}/${t.tier}` : '#/rank'; }
    case 'rankup': return `#/rank/${it.ref}/`;
    case 'check': return `#/check/${it.ref}`;
    case 'level': return '#/level/test';
    case 'basics': return `#/basics/${r}`;
    case 'clauses': return `#/clauses/${r}`;
    case 'drill': return `#/drill/${r}`;
    case 'practice': return `#/practice/${r}`;
    case 'table': return `#/table/${r}`;
    case 'lecture': return `#/lecture/${r}`;
    case 'py': return `#/py/${r}/0`;
    case 'hr': return it.ref === 'mock' ? '#/hr/mock' : `#/hr/${asgHrIds(it)[0] || ''}`;
    case 'pz': return `#/pz/${(pzLevel(+it.ref)[0] || {}).id || ''}`;
    case 'read': return asgReadUrl(it).startsWith('#') ? asgReadUrl(it) : '#/live';
    default: return '#/';
  }
}

/** the item's name in a language (HTML), with the teacher's message if there is one */
export const asgLabelHTML = (it, lang) => labelCore(it, lang) + (it.note ? `<small class="as-note">💬 ${esc(it.note)}</small>` : '');
function labelCore(it, lang) {
  const R = k => rubyHTML(raw(k, lang)), lesson = k => (LESSON_BY_KEY[k] ? `${LESSON_BY_KEY[k].no}. ${R(`L.${k}.title`)}` : esc(k));
  switch (it.type) {
    case 'rank': { const t = rankParse(it.ref); return t ? `${R('ch.' + t.ch)} · ${R('rk.tier.' + t.tier)}` : esc(it.ref); }
    case 'rankup': return `${R('ch.' + it.ref)} <small class="muted">${RK_TIERS.map(t => R('rk.tier.' + t)).join(' → ')} · ${R('as.ru.pass').replace('{r}', esc(it.pass || 'B'))}</small>`;
    case 'check': return `${R('ck.title')}${it.n ? ` <small class="muted">(${R('as.nQ').replace('{n}', it.n)})</small>` : ''}`;
    case 'level': return R('lv.testTitle');
    case 'basics': { const b = BASIC_BY_KEY[it.ref]; return !b ? esc(it.ref) : b.core ? R('bs.s.' + it.ref) : lesson(b.lesson); }
    case 'clauses': return it.ref === 'all' ? R('cq.all') : `<code>${esc(KW[it.ref] || it.ref)}</code>`;
    case 'table': return (it.tables || [it.ref]).map(t => `<b class="mono">${esc(t)}</b>`).join(' + ');
    case 'py': return PD_BY_KEY[it.ref] ? `${PD_BY_KEY[it.ref].no}. ${R('pd.t.' + it.ref)}` : esc(it.ref);
    case 'hr': return it.ref === 'mock' ? R('hr.mockH') : `${R('hr.title')} · ${R('hr.area.' + it.ref)}`;
    case 'pz': return `${R('pz.title')} · Lv.${esc(it.ref)} ${R('pz.lv.' + it.ref)}`;
    case 'read': return it.ref === 'url' ? esc(it.title || it.url || '') : R('as.rd.' + it.ref);
    default: return lesson(it.ref);
  }
}

/* ---------- the class log ---------- */
export const isAsRow = a => /^as:/.test((a && a.problem_id) || '');
export function asgRow(it, kind, reason = '', d = null) {
  return { problem_id: `as:${it.id}:${kind}`.slice(0, 80), lesson: 'assign', stage: 'review', ok: kind === 'done', reason: String(reason).slice(0, 40), sql: d ? JSON.stringify(d).slice(0, 2000) : null };
}
export function asParse(a) {
  const m = /^as:([^:]+):(start|done|try)$/.exec(a.problem_id || ''); if (!m) return null;
  let d = null; try { d = a.sql ? JSON.parse(a.sql) : null; } catch (e) { d = null; }
  return { id: m[1], kind: m[2], reason: a.reason || '', d, user: a.user_id, at: a.created_at };
}
/** each member's state of one item: { m, started, done, reason, d, at } */
export function asgResults(rows, members, it) {
  const mine = rows.map(asParse).filter(x => x && x.id === it.id);
  return members.map(m => {
    const xs = mine.filter(x => x.user === m.user_id), done = xs.filter(x => x.kind === 'done')[0] || null;   // the first finish counts (one try)
    return { m, started: xs.some(x => x.kind === 'start') || !!done, done: !!done, reason: done ? done.reason : '', d: done ? done.d : null, at: done ? done.at : (xs[0] || {}).at };
  });
}
export const newAsgId = () => Math.random().toString(36).slice(2, 8);
