/* =========================================================
 * teacher.js — the teacher page (teacher/index.html, address /teacher/)
 *   #/            sign in · my classes
 *   #/c/<id>/<tab>  class: assign | live | mistakes | members
 *   #/present     open an example in presenter mode
 *   #/test        paper test maker (A/B versions)
 *   #/book        printable textbook (syntax list + way of thinking)
 * Class features need Supabase (config.js). Presenter and paper tests work without it.
 * ========================================================= */
import { LANGS, loadLang, detectLang, htmlLang, t, th, esc, rubyHTML, raw } from './i18n.js';
import { PD_LESSONS, PD_BY_KEY } from './pandas.js';
import { SqlEngine, LESSON_BY_KEY, grade, todayCode, randomCode, normCode, normFormat, formatKey, stagesFor, FORMAT_KEYS, FORMAT_MAX, STANDARD_FORMAT } from './engine.js';
import { LESSONS, CHAPTERS } from './lessons.js';
import { TEXTBOOKS } from './book.js';
import { hasLecture } from './lectures.js';
import { altAnswers } from './alt.js';
import { checkSetupHTML, installCheckUI, currentCheck } from './check-ui.js';
import { ASG_TYPES, ASG_TEST, ASG_ICON, asgList, asgLabelHTML, asgLimit, isAsRow, asgResults, ruResults, newAsgId, READ_PRESETS, okUrl, asgReadUrl, asParse } from './assign.js';
import { CQ_SETS, KW } from './clauses.js';
import { installExplain, explainTcHTML, explainActions, explainInput, explainKey, explainStop } from './explain-tc.js';
import { checkLessons } from './check.js';
import { tableSets } from './mastery.js';
import { LV_CHAPTERS, LV_MAX, LV_PER, isLevelRow, levelsFromLog, passed, testLessons } from './level.js';
import { heroSVG } from './hero.js';
import { RK_TIERS, RK_CHAPTERS, RK_RANKS, rankKey, rankParse, isRankRow, rankFromRow, classRanking, totalBoardHTML, classTotals } from './rank.js';
import { QUICK_COUNTS, QUICK_LIMITS, QUICK_PRESETS, KINDS, kindsOf, quickOn, newQuick, quickProblems, quickProgress, quickPhase, passOf, simpleSlots, detailSlots, applySwaps, nextFree, slotProblems, levelSlots, tableLessons, spanText, limitSecOf, QUICK_MAX_SEC, QUICK_COUNTDOWN, logPut, logDrop, quickStats, quickCSV, slotsShape, shapeSlots, SHAPE_KINDS, SHAPE_COUNTS, DIF_RATIOS, KIND_RATIOS, QK, splitBy, spreadGrid, gridSlots, shapeCountSlots, shapeCountsOf } from './quick.js';
import { BASIC_STEPS, BASIC_CORE, BASIC_BY_KEY } from './basics.js';
import { tablesPageHTML, installTables, setTablesLang, openProjector, closeProjector } from './tables-ui.js';
import { syncClock, secondsLeft, fmtClock, timerState, liveOn, liveMinutesLeft, nowMs } from './timer.js';
import { drawJoinLines } from './viz.js';
import { diagnose } from './diagnose.js';
import { Store, KEYS, loadSettings, saveSettings } from './store.js';
import * as backend from './backend.js';
import { navFoldHTML, modeBtnHTML, lessonPickHTML, lessonGroups, pyDescHTML, highlightPy, composeHTML, countPickHTML, answerTextHTML, I, startIconizer, applySettings, langSelect, langOptions, highlightSQL, gridHTML, problemHTML, lessonTitle, lessonTitleHTML, themeName, themeHTML, toast, copyText, modal, closeModal } from './ui.js';

const S = {
  settings: loadSettings(null),
  engine: null,
  route: { view: 'home' },
  session: null,
  classes: [],
  klass: null,
  members: [],
  attempts: [],
  liveOnlyToday: true,
  rankWindow: 'now',   // ranking of problems: 'now' = last 10 minutes, 'all' = everything shown
  rankSort: 'stuck',   // 'stuck' | 'wrong' | 'now'
  liveSort: 'name',    // rows of the live grid: 'name' (join order) | 'progress'
  boardBy: 'solved',   // progress ranking: 'solved' | 'first' | 'recent'
  boardTop: '10',      // projector: how many students ('all' | '10' | '5' | '3')
  boardHide: false,    // projector: hide nicknames
  rankOpen: true,      // the "stuck problems" card of the live tab is open
  conn: 'off',         // live connection: 'off' | 'connecting' | 'ok' | 'lost'
  viewStudent: null,   // user id shown in the student detail window
  unwatch: null,
  mistakeProb: null,
  busy: false,
  isTeacher: null,   // null = not checked yet
  test: Object.assign({ title: '', tlang: null, bilingual: null, lessons: LESSONS.map(l => l.key), per: 1, type: 'write', types: null, band: 0, pts: 0, key: true, results: true, code: randomCode(), ab: false }, Store.get(KEYS.test, {}))
};
S.settings.lang = detectLang(S.settings.lang);
// the teacher's view choices (sorting, ranking options, open cards) are remembered on this computer
const VIEW_KEY = 'sqln.tcView', VIEW_FIELDS = ['liveSort', 'boardBy', 'boardTop', 'boardHide', 'rankOpen', 'rankWindow', 'rankSort'];
Object.assign(S, Object.fromEntries(Object.entries(Store.get(VIEW_KEY, {})).filter(([k]) => VIEW_FIELDS.includes(k))));
const saveView = () => Store.set(VIEW_KEY, Object.fromEntries(VIEW_FIELDS.map(k => [k, S[k]])));
S.settings.presenter = false;
if (!S.test.tlang) S.test.tlang = S.settings.lang;
const app = document.getElementById('app');
const L = () => S.settings.lang;
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
const studentURL = () => new URL('../', location.href).toString();   // the student app is one level up
const joinURL = code => `${studentURL()}?class=${encodeURIComponent(code)}`;

/* ---------- routing ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'c' && h[1]) return { view: 'class', id: h[1], tab: ['send', 'assign', 'live', 'quick', 'board', 'mistakes', 'members', 'explain'].includes(h[2]) ? h[2] : 'live' };
  if (h[0] === 'present') return { view: 'present' };
  if (h[0] === 'test') return { view: 'test' };
  if (h[0] === 'book') return { view: 'book' };
  if (h[0] === 'tables') return { view: 'tables' };
  if (h[0] === 'check') return { view: 'check' };
  return { view: 'home' };
}
window.addEventListener('hashchange', () => { closeProjector(); const prev = S.route; S.route = parseRoute(); if (prev.tab === 'explain' && (S.route.tab !== 'explain' || S.route.id !== prev.id)) explainStop(); if (prev.view === 'class' && (S.route.view !== 'class' || S.route.id !== prev.id)) stopWatch(); load(); });

/* =========================================================
 * RENDER
 * ========================================================= */
startIconizer();
function render() {
  applySettings(S.settings, htmlLang(L()));
  const v = S.route.view;
  let body;
  if (!S.engine) body = `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`;
  else if (v === 'present') body = presentHTML();
  else if (v === 'test') body = testHTML();
  else if (v === 'book') body = bookPanelHTML();
  else if (v === 'tables') body = tablesPageHTML(L());
  else if (v === 'check') body = `<main class="wrap"><h1 class="page-title">📝 ${H('ck.title')}</h1><p class="muted">${H('ck.subT')}</p>${checkSetupHTML()}</main>`;
  else if (!backend.enabled) body = noBackendHTML();
  else if (!S.session) body = loginHTML();
  else if (S.isTeacher === false) body = notTeacherHTML();
  else if (S.isTeacher === null) body = `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`;
  else if (v === 'class') body = classHTML();
  else body = classesHTML();
  document.body.classList.remove('nav-open');
  keepView(() => { app.innerHTML = frame(body); });
  if (v === 'book') document.title = `${T('book.nav')} · SQL Practice`;
  if (v === 'tables') document.title = `${T('tb.title')} · SQL Practice`;
  if (v === 'check') document.title = `${T('ck.title')} · SQL Practice`;
  if (v === 'test' && S.engine) document.title = `${S.test.title || t('test.headingDefault', S.test.tlang)} (${S.test.code})`;
}
/* ---------- the frame: a side menu (the pages; the open class and its tabs), a top bar on phones ---------- */
const CLASS_TABS = [['live', I.bolt, 'tc.tabLive'], ['send', I.inbox, 'tc.tabSend'], ['quick', I.timer, 'tc.tabQuick'], ['board', I.check, 'tc.tabBoard'], ['assign', I.gear, 'tc.tabSettings'], ['explain', I.present, 'ex.tc.tab'], ['mistakes', I.eye, 'tc.tabMistakes'], ['members', I.users, 'tc.tabMembers']];
function headerHTML() {
  const v = S.route.view, c = v === 'class' ? S.klass : null;
  const item = (href, on, ic, label) => `<a href="${href}" class="nav-i ${on ? 'on' : ''}" title="${esc(T(label))}">${ic}<span>${H(label)}</span></a>`;
  const side = `<aside class="side-nav" aria-label="menu">
    <a class="brand" href="#/"><span class="brand-mark">SQL</span><span class="brand-name">SQL Practice</span><span class="brand-tag">${H('tc.badge')}</span></a>
    <nav>
      ${item('#/', v === 'home', I.users, 'tc.classes')}
      ${c ? `<div class="side-sub"><b>${esc(c.name)}</b>${CLASS_TABS.map(([k, ic, lab]) => item(`#/c/${c.id}/${k}`, S.route.tab === k, ic, lab)).join('')}</div>` : ''}
      <hr>
      ${item('#/present', v === 'present', I.screen, 'tc.present')}
      ${item('#/test', v === 'test', I.paper, 'tc.test')}
      ${item('#/check', v === 'check', I.clip, 'ck.title')}
      ${item('#/book', v === 'book', I.words, 'book.nav')}
      ${item('#/tables', v === 'tables', I.table, 'nav.tables')}
    </nav>
    ${modeBtnHTML(L())}${navFoldHTML(L())}
    <div class="side-foot">
      <div class="side-tools">${langSelect(L(), T('nav.language'))}${S.session ? `<button class="icon-btn" data-act="signOut" title="${esc(T('tc.signOut'))}" aria-label="${esc(T('tc.signOut'))}">${I.door}</button>` : ''}</div>
      <a class="side-teacher" href="../">${H('tc.toStudent')}</a>
    </div></aside>`;
  const top = `<header class="m-top"><button class="icon-btn" data-act="navMenu" aria-label="menu">${I.menu}</button><a class="brand" href="#/"><span class="brand-mark">SQL</span><span class="brand-name">${c ? esc(c.name) : 'SQL Practice'}</span></a><span></span></header>`;
  return side + `<div class="nav-scrim" data-act="navMenu"></div>` + top;
}
const frame = body => `<div class="shell tc-shell">${headerHTML()}<div class="shell-main">${body}</div></div>`;
function noBackendHTML() {
  return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">${I.users}</div>
    <h1>${H('tc.noBackend')}</h1><p class="muted">${H('tc.noBackendSub')}</p>
    <div class="row-btns"><a class="btn btn-primary" href="#/present">${I.screen}${H('tc.present')}</a><a class="btn btn-ghost" href="#/test">${I.paper}${H('tc.test')}</a></div></section></main>`;
}

/* ---------- sign in ---------- */
function loginHTML() {
  const mode = S.loginMode === 'reset' ? 'reset' : 'in';
  return `<main class="wrap narrow"><section class="card login">
    <h1>${I.lock} ${H(mode === 'reset' ? 'tc.resetTitle' : 'tc.signInTitle')}</h1>
    <p class="muted">${H('tc.signInSub')}</p>
    <form class="form" data-form="login">
      <label class="fld"><span>${H('tc.email')}</span><input type="email" name="email" required autocomplete="email"></label>
      ${mode !== 'reset' ? `<label class="fld"><span>${H('tc.password')}</span><input type="password" name="pw" required autocomplete="current-password"></label>` : ''}
      <p class="err" id="login-err" role="alert"></p>
      <button class="btn btn-primary">${H(mode === 'reset' ? 'tc.sendReset' : 'tc.signIn')}</button>
    </form>
    <div class="login-links">
      ${mode === 'reset' ? `<button class="linkbtn" data-act="loginMode" data-m="in">${H('tc.backToSignIn')}</button>` : `<button class="linkbtn" data-act="loginMode" data-m="reset">${H('tc.forgot')}</button>`}
    </div>
  </section></main>`;
}
/* signed in, but this e-mail address is not on the teacher list */
function notTeacherHTML() {
  return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon" style="background:var(--bad-soft);color:var(--bad)">${I.lock}</div>
    <h1>${H('tc.notTeacher')}</h1><p class="muted">${H('tc.notTeacherSub', { e: (S.session.user && S.session.user.email) || '' })}</p>
    <div class="row-btns"><button class="btn btn-ghost" data-act="signOut">${I.door}${H('tc.signOut')}</button></div></section></main>`;
}

/* ---------- class list ---------- */
function classesHTML() {
  document.title = `${T('tc.classes')} · SQL Practice`;
  return `<main class="wrap">
    <div class="page-head"><h1 class="page-title">${H('tc.myClasses')}</h1><span class="muted small">${esc(S.session.user.email || '')}</span></div>
    <div class="class-grid">
      ${S.classes.map(c => `<a class="card class-card" href="#/c/${c.id}/live">
        <div class="cc-top"><b>${esc(c.name)}</b>${c.open ? '' : `<span class="tag">${I.lock}${H('tc.closed')}</span>`}</div>
        <div class="cc-code mono">${esc(c.code)}</div>
        <div class="muted small">${H('tc.lessonsAssigned', { n: (c.lessons || []).length })} · ${H('set.code')} ${esc(c.set_code)}</div>
      </a>`).join('')}
      <form class="card class-card new" data-form="newClass">
        <b>${I.plus} ${H('tc.newClass')}</b>
        <input name="name" maxlength="80" required placeholder="${esc(T('tc.classNamePh'))}" aria-label="${esc(T('tc.className'))}">
        <button class="btn btn-primary btn-sm">${H('tc.create')}</button>
      </form>
    </div>
    <section class="card howto"><h2>${H('tc.howTitle')}</h2><ol>${[1, 2, 3, 4].map(i => `<li>${rubyHTML(raw('tc.how' + i, L()))}</li>`).join('')}</ol></section>
  </main>`;
}

/* ---------- one class ---------- */
function classHTML() {
  const c = S.klass;
  if (!c) return `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`;
  document.title = `${c.name} · SQL Practice`;
  const tab = S.route.tab;
  const tabs = CLASS_TABS;
  let body = '';
  if (tab === 'assign') body = assignHTML(c);
  else if (tab === 'send') body = sendHTML(c);
  else if (tab === 'explain') body = explainTcHTML();
  else if (tab === 'mistakes') body = mistakesHTML(c);
  else if (tab === 'members') body = membersHTML(c);
  else if (tab === 'board') body = boardHTML(c);
  else if (tab === 'quick') body = quickHTML(c);
  else body = liveHTML(c);
  return `<main class="wrap">
    <div class="crumbs"><a href="#/">${H('tc.myClasses')}</a><span>›</span><span>${esc(c.name)}</span></div>
    <section class="card class-head">
      <div><h1>${esc(c.name)}</h1>
        <div class="muted small">${H('tc.members', { n: S.members.length })} · ${H('set.code')} <b class="mono">${esc(c.set_code)}</b> · ${H('tc.policy.' + c.answer_policy)}</div>
        ${connHTML()}</div>
      <button class="code-big" data-act="showQR" title="${esc(T('tc.showQR'))}"><small>${H('class.code')}</small><b class="mono">${esc(c.code)}</b><span>${I.qr} ${H('tc.showQR')}</span></button>
      <div class="lbox ${liveOn(c) ? 'on' : ''}" id="lbox">${liveBoxHTML(c)}</div>
      <div class="tbox" id="tbox">${timerBoxHTML(c)}</div>
      <div class="class-actions">
        <button class="btn btn-ghost btn-sm" data-act="copyJoin">${I.link}${H('tc.copyJoin')}</button>
        <button class="btn btn-ghost btn-sm" data-act="toggleOpen">${I.lock}${H(c.open ? 'tc.close' : 'tc.reopen')}</button>
      </div>
    </section>
    <nav class="tabs" role="tablist">${tabs.map(([k, ic, lab]) => `<a role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" href="#/c/${c.id}/${k}">${ic}${H(lab)}${k === 'quick' && quickOn(c) ? '<i class="live-dot"></i>' : ''}</a>`).join('')}</nav>
    <div id="tab-body">${body}</div>
  </main>`;
}


/* ---------- quick test: a few problems for everyone; who reaches the pass line may take a break ----------
 * Set up (lessons, count, kind, pass line, time limit), look at the problems and swap any of them,
 * then start: the students see a countdown and begin together. */
const QDRAFT = 'sqln.quickDraft';
const KIND_LABEL = { fill: 'tc.fmtFill', order1: 'tc.fmtOrder1', order2: 'tc.fmtOrder2', write: 'tc.fmtWrite' };
const CMP_CELL = 10, CMP_CELL_L = 5, CMP_TOTAL = 20;   // the most problems in one cell (all lessons / one lesson), in a test
const cnt3 = (a, max) => (Array.isArray(a) && a.length === 3 && a.every(x => Number.isInteger(x) && x >= 0 && x <= max) ? a.slice() : null);
const sum3 = a => a.reduce((x, y) => x + y, 0);
/** the difficulty columns of the count tables, and the presets */
const difCols = () => [1, 2, 3].map(b => ({ id: b, label: H('dif.' + b), sub: H(`dif.${b}s`), tone: 'd' + b, text: T('dif.' + b) }));
const DIF_PRESETS = ['basic', 'easy', 'even', 'hard'];
const presetOf = (rows, ps) => ps.find(v => rows.every(r => sum3(r) === 0 || splitBy(sum3(r), DIF_RATIOS[v]).every((x, i) => x === r[i]))) || null;
/** the counts of a whole quick test (by difficulty) */
const KIND_SEC = { fill: 60, order1: 70, order2: 70, write: 120 };   // seconds a problem, for the estimate
const kindCnt = (o, max) => Object.fromEntries(QK.map(st => [st, cnt3((o || {})[st], max) || [0, 0, 0]]));
/** the kinds the chosen lessons have (the rows of the table when all lessons are set together) */
const kindsIn = d => QK.filter(st => d.lessons.some(k => kindsOf(k, S.engine, d.tb).includes(st)));
/** every row of the table as [基本, 標準, 発展]: per kind (together), or per lesson and kind */
const quickRows = d => (d.mode === 'detail' ? d.lessons.flatMap(k => kindsOf(k, S.engine, d.tb).map(st => d.grid[k][st])) : kindsIn(d).map(st => d.cnt[st]));
const quickTotal = d => quickRows(d).reduce((a, r) => a + sum3(r), 0);
/** the per-lesson table added up per kind */
const gridToCnt = d => { const c = kindCnt({}, 99); d.lessons.forEach(k => kindsOf(k, S.engine, d.tb).forEach(st => { c[st] = c[st].map((x, i) => Math.min(CMP_CELL, x + d.grid[k][st][i])); })); return c; };
/** the lessons a quick test can use, in order: the SQL lessons, then the Python course */
const qOrder = () => [...checkLessons().map(l => l.key), ...PD_LESSONS.map(l => l.key)];
/** a lesson's number and title (SQL or Python) */
const qLessonH = k => (PD_BY_KEY[k] ? `<b>Py${PD_BY_KEY[k].no}</b> ${rubyHTML(raw('pd.t.' + k, L()))}` : `<b>${LESSON_BY_KEY[k].no}</b> ${lessonTitleHTML(LESSON_BY_KEY[k], L())}`);
function quickDraft(c) {
  const d = Store.get(QDRAFT, null) || {};
  if (!d.seed) { d.seed = randomCode(4); Store.set(QDRAFT, d); }   // the preview stays the same until the teacher asks for new problems
  const ok = new Set(qOrder());
  const lessons = (Array.isArray(d.lessons) ? d.lessons : (c.lessons || [])).filter(k => ok.has(k));   // first time: the assigned lessons
  const tb = d.tb && S.engine && tableSets(S.engine).some(x => x.key === d.tb) ? d.tb : '';
  const per = {};
  lessons.forEach(k => { const o = (d.per || {})[k] || { write: 1 }; per[k] = {}; KINDS.forEach(st => { per[k][st] = kindsOf(k).includes(st) ? Math.max(0, Math.min(FORMAT_MAX, +o[st] || 0)) : 0; }); });
  // counts by difficulty [基本, 標準, 発展]: all lessons together (cnt), or per lesson (grid); older drafts: n problems of one difficulty
  const n0 = Number.isInteger(d.n) && d.n >= 1 && d.n <= 10 ? d.n : 3, dif0 = [1, 2, 3].includes(d.dif) ? d.dif : 0;
  // counts per kind (fill, order1, order2, write) and difficulty; older drafts: one row of difficulties for the kind preset
  let cnt;
  if (d.cnt && typeof d.cnt === 'object' && !Array.isArray(d.cnt)) cnt = kindCnt(d.cnt, CMP_CELL);
  else { cnt = kindCnt({}, CMP_CELL); cnt[d.kind === 'order' ? 'order1' : 'write'] = cnt3(d.cnt, CMP_CELL) || (dif0 ? [0, 0, 0].map((x, i) => (i === dif0 - 1 ? n0 : 0)) : splitBy(n0, [1, 1, 1])); }
  const newGrid = d.grid && Object.values(d.grid).every(o => o && !Array.isArray(o)), spread = newGrid ? null : spreadGrid(S.engine, lessons, cnt, tb), grid = {};
  lessons.forEach(k => { const o = newGrid ? d.grid[k] : null; grid[k] = o ? kindCnt(o, CMP_CELL_L) : spread ? spread[k] : Object.assign(kindCnt({}, 1), { write: [1, 0, 0] }); });
  const sn0 = Number.isInteger(d.sn) && d.sn >= 1 && d.sn <= 20 ? d.sn : 5;
  return { mode: d.mode === 'detail' ? 'detail' : 'simple', lessons, cnt, grid, sc: cnt3(d.sc, CMP_CELL) || shapeCountsOf(sn0, SHAPE_KINDS.includes(d.sk) ? d.sk : 'mix'), n: Number.isInteger(d.n) && d.n >= 1 && d.n <= 10 ? d.n : 3, kind: QUICK_PRESETS.includes(d.kind) ? d.kind : 'write', per,
    pass: Number.isInteger(d.pass) && d.pass >= 1 ? d.pass : null, limitSec: Number.isInteger(d.limitSec) && d.limitSec >= 0 && d.limitSec <= QUICK_MAX_SEC ? d.limitSec : Number.isInteger(d.limit) && d.limit >= 0 && d.limit <= 120 ? d.limit * 60 : 300,
    goal: d.goal === 'level' || d.goal === 'shape' ? d.goal : 'quick',   // 'level' = a level test: chosen chapters, first answer only; 'shape' = the shape mix (型ミックス)
    dif: [0, 1, 2, 3].includes(d.dif) ? d.dif : 0,   // difficulty: 0 = any (the lessons' own mix), 1 基本 · 2 標準 · 3 発展
    shapes: Array.isArray(d.shapes) ? d.shapes.filter(k => BASIC_BY_KEY[k]) : BASIC_CORE.map(x => x.key), sk: SHAPE_KINDS.includes(d.sk) ? d.sk : 'mix', sn: Number.isInteger(d.sn) && d.sn >= 1 && d.sn <= 20 ? d.sn : 5,
    lv: Array.isArray(d.lv) ? d.lv.filter(i => Number.isInteger(i) && i >= 0 && i < LV_MAX) : [0, 1, 2],
    tb,   // one table for every problem ('' = the usual mix of tables)
    limitBy: d.limitBy === 'end' ? 'end' : 'len', limitEnd: /^\d{1,2}:\d{2}$/.test(d.limitEnd || '') ? d.limitEnd : '', seed: d.seed, swaps: d.swaps || {}, perm: Array.isArray(d.perm) ? d.perm : null, permKey: typeof d.permKey === 'string' ? d.permKey : null,
    fixed: d.fixed && Array.isArray(d.fixed.slots) && d.fixed.slots.length ? d.fixed : null };   // fixed: the problems of an earlier test, to give them again
}
/** keepFixed: the change does not touch the problems (pass line, time limit, a swap) */
const minText = n => T('tc.timerMin', { n });
/** the time limit the draft gives a test started now: seconds (0 = none), or null when the end time has passed */
function draftLimit(d) {
  if (d.limitBy !== 'end') return d.limitSec;
  const m = /^(\d{1,2}):(\d{2})$/.exec(d.limitEnd); if (!m) return null;
  const now = new Date(nowMs()), end = new Date(now); end.setHours(+m[1], +m[2], 0, 0);
  const sec = Math.round((end.getTime() - now.getTime()) / 1000) - QUICK_COUNTDOWN;
  return sec >= 10 && sec <= QUICK_MAX_SEC ? sec : null;
}
const limitText = d => { const sec = draftLimit(d); return d.limitBy === 'end' ? (sec === null ? T('tc.quick.endPast') : `${T('tc.live.until', { t: d.limitEnd })} (≈ ${minText(Math.max(1, Math.round(sec / 60)))})`) : sec ? spanText(sec, minText) : T('tc.quick.noLimit'); };
const saveQDraft = (d, keepFixed) => { if (!keepFixed) d.fixed = null; Store.set(QDRAFT, d); };
const QLAST = id => `sqln.quickLast.${id}`;
/* the class's quick tests so far (newest first): in the class row (quick_log), or in this browser until schema.sql has been run again */
const QLOG = id => `sqln.quickLog.${id}`;
const logInDb = c => Object.prototype.hasOwnProperty.call(c, 'quick_log');
function quickLog(c) {
  const log = logInDb(c) ? (Array.isArray(c.quick_log) ? c.quick_log : []) : Store.get(QLOG(c.id), []);
  const last = Store.get(QLAST(c.id), null);   // a test from before the list existed
  return last && last.id && !log.length ? [last] : log;
}
/** save the running test (or null) and the list together */
async function saveQuick(quick, log) {
  const c = S.klass;
  if (logInDb(c)) S.klass = await backend.updateClass(c.id, { quick, quick_log: log });
  else { S.klass = await backend.updateClass(c.id, { quick }); Store.set(QLOG(c.id), log); }
  Store.del(QLAST(c.id));
}
const mmssOf = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** the draft's test: one slot per problem (easy or detailed set-up), with the teacher's swaps */
/** the order the teacher dragged the problems into (indexes into the base list), kept while the base list has the same lessons, kinds and levels */
const slotSig = slots => slots.map(x => `${x.b || x.k}:${x.st}:${x.bd || 0}`).join(',');
function draftPerm(d, base) {
  const p = d.perm, ok = Array.isArray(p) && d.permKey === slotSig(base) && p.length === base.length && new Set(p).size === p.length && p.every(i => Number.isInteger(i) && i >= 0 && i < base.length);
  return ok ? p : base.map((x, i) => i);
}
function draftSlots(d) {
  const base = draftBase(d);
  return d.goal === 'level' && !d.fixed ? base : draftPerm(d, base).map(i => base[i]);
}
function draftBase(d) {
  if (d.goal === 'level' && !d.fixed) return d.lv.length ? levelSlots(S.engine, d.lv, d.seed, d.tb) : [];
  if (d.goal === 'shape') return applySwaps(S.engine, d.fixed ? d.fixed.slots : shapeCountSlots(S.engine, d.shapes, d.sc, d.seed), d.swaps, d.seed, '');
  if (!d.lessons.length && !d.fixed) return [];
  const usable = d.lessons.filter(k => kindsOf(k, S.engine, d.tb).length);
  const base = d.fixed ? d.fixed.slots : gridSlots(S.engine, d.mode === 'detail' ? d.grid : spreadGrid(S.engine, usable, d.cnt, d.tb), d.lessons, d.seed, d.tb);
  return applySwaps(S.engine, base, d.swaps, d.seed, d.tb);
}
/* ---------- the basic shapes (基礎の型): names and a picker, for the shape-mix quick test and assignment ---------- */
const shapeNameH = k => { const st = BASIC_BY_KEY[k]; return st.core ? H('bs.s.' + k) : `${LESSON_BY_KEY[st.lesson].no}. ${lessonTitleHTML(LESSON_BY_KEY[st.lesson], L())}`; };
const shapeKindH = v => H(v === 'mix' ? 'tc.shape.k.mix' : v === 'afill' ? 'stage.fill' : v === 'aorder' ? 'stage.order' : 'rv.write');
/* a problem of a shape in words (basics.js absProblem): its goal and the shape with words for the parts */
const ABS_W = { col: 'col', group: 'col', num: 'col', key: 'col', table: 'table', cond: 'cond', expr: 'expr', alias: 'alias' };
const absShapeTH = shape => `<code class="bs-shape">${String(shape).split(/(\{[a-z]+\})/).map(part => { const m = /^\{([a-z]+)\}$/.exec(part); return m ? `<span class="bs-slot ${ABS_W[m[1]] || 'val'}">${H('bs.w.' + (ABS_W[m[1]] || 'val'))}</span>` : highlightSQL(part); }).join('')}</code>`;
const absGoalTH = p => { const [k, v] = p.goal || []; return k === 'bs.abs.goal' ? H(k, { name: lessonTitle(LESSON_BY_KEY[v.lesson], L()) }) : H(k, v); };
const probTextH = p => (p.abs ? absGoalTH(p) : p.py ? pyDescHTML(p, L()) : problemHTML(p, L()));
const probAnsH = p => (p.abs ? absShapeTH(p.shape) : p.py ? `<pre class="sql py">${highlightPy(p.code)}</pre>` : `<pre class="sql">${highlightSQL(p.sql)}</pre>`);
const shapeCh = st => (st.core ? (st.lesson === 'select' ? 'basics' : LESSON_BY_KEY[st.lesson].ch) : st.ch);
/** chosen shapes as chips, quick buttons (the 8 basic ones, a chapter, none) and every shape to tick; act = the action of the clicks */
function shapePickHTML(chosen, act) {
  const on = new Set(chosen), core = BASIC_CORE.map(x => x.key), coreOn = core.every(k => on.has(k));
  return `<div class="fld"><span>${H('tc.shape.which')}</span>
    <div class="q-chapters"><button class="btn btn-ghost btn-xs q-ch ${coreOn ? 'on' : ''}" data-act="${act}" data-v="@core" aria-pressed="${coreOn}">${H('bs.mix.r.core')}</button>
      ${CHAPTERS.map(ch => { const ks = BASIC_STEPS.filter(st => shapeCh(st) === ch.key).map(st => st.key); if (!ks.length) return ''; const all = ks.every(k => on.has(k)), some = !all && ks.some(k => on.has(k));
        return `<button class="btn btn-ghost btn-xs q-ch ${all ? 'on' : some ? 'some' : ''}" style="--cc:var(--c-${ch.key})" data-act="${act}" data-v="@${ch.key}" aria-pressed="${all}">${rubyHTML(raw('ch.' + ch.key, L()))} <span class="muted">${ks.filter(k => on.has(k)).length}/${ks.length}</span></button>`; }).join('')}
      ${on.size ? `<button class="btn btn-ghost btn-xs" data-act="${act}" data-v="">${H('tc.quick.none')}</button>` : ''}</div>
    ${on.size ? `<div class="q-chips">${BASIC_STEPS.filter(st => on.has(st.key)).map(st => `<button class="q-chip" style="--cc:var(--c-${shapeCh(st)})" data-act="${act}" data-v="${st.key}" title="${esc(T('tc.remove'))}">${shapeNameH(st.key)}<i>×</i></button>`).join('')}</div>` : ''}
    <details class="q-more"><summary>${H('tc.shape.pickOne')}</summary><div class="q-lessons">${BASIC_STEPS.filter(st => !on.has(st.key)).map(st => `<button class="btn btn-ghost btn-xs" data-act="${act}" data-v="${st.key}">＋ ${shapeNameH(st.key)}</button>`).join('')}</div></details></div>`;
}
/** a click on the picker → the new list of shapes */
function shapeToggle(list, v) {
  const order = BASIC_STEPS.map(st => st.key), set = new Set(list);
  if (!v) return [];
  const ks = v === '@core' ? BASIC_CORE.map(x => x.key) : v[0] === '@' ? BASIC_STEPS.filter(st => shapeCh(st) === v.slice(1)).map(st => st.key) : [v];
  const all = ks.every(k => set.has(k));
  ks.forEach(k => (all ? set.delete(k) : set.add(k)));
  return order.filter(k => set.has(k));
}
/* the set-up of a test, in four steps on the left (what · range · problems · pass line and time) and
 * the test as it will be on the right (always in view): its numbers, the start button, the problems to look at and swap */
function quickHTML(c) {
  if (quickOn(c)) return quickRunHTML(c, c.quick, true);
  const d = quickDraft(c), chosen = new Set(d.lessons), assigned = new Set(c.lessons || []);
  const slots = draftSlots(d), probs = slotProblems(S.engine, d.seed, slots, d.goal === 'shape' ? '' : d.tb), n = probs.length;
  const pass = d.pass && d.pass < n ? d.pass : null, lvMode = d.goal === 'level', shMode = d.goal === 'shape';
  const seg = (k, vals, cur, label) => `<div class="seg">${vals.map(v => `<button class="seg-b ${cur === v ? 'on' : ''}" data-act="quickSet" data-k="${k}" data-v="${v === null ? '' : v}" aria-pressed="${cur === v}">${label(v)}</button>`).join('')}</div>`;
  const step = (no, title, body, extra) => `<section class="card qs-step"><h3><i>${no}</i>${title}${extra || ''}</h3>${body}</section>`;
  // 1. what to give
  const goals = [['quick', '⚡', 'tc.quick.title', 'tc.qs.goalQuick'], ['level', '🎯', 'lv.testTitle', 'tc.qs.goalLevel'], ['shape', '🧱', 'bs.title', 'tc.qs.goalShape']];
  const s1 = `<div class="qs-goals">${goals.map(([k, ic, t, sub]) => `<button class="qs-goal ${d.goal === k ? 'on' : ''}" data-act="quickSet" data-k="goal" data-v="${k}" aria-pressed="${d.goal === k}"><span class="qs-ic">${ic}</span><b>${H(t)}</b><small>${H(sub)}</small></button>`).join('')}</div>`;
  // 2. the range: every lesson in view, a chapter at a time
  const asg = checkLessons().filter(l => assigned.has(l.key));
  const lessonsPick = lessonPickHTML({ id: 'quick', lang: L(), chosen: d.lessons, badge: k => (chosen.has(k) && d.lessons.length > 1 ? String(d.lessons.indexOf(k) + 1) : ''),
    tools: asg.length ? [{ label: `${I.book}${H('tc.quick.fromAssign')} <span class="muted">${asg.length}</span>`, keys: asg.map(l => l.key) }] : [],
    groups: [...lessonGroups(checkLessons(), L()), { key: 'py', cc: '#3776ab', label: `🐍 ${H('pd.title')}`, items: PD_LESSONS.map(l => ({ key: l.key, no: 'Py' + l.no, label: rubyHTML(raw('pd.t.' + l.key, L())) })) }] })
    + (d.lessons.length > 1 ? `<p class="muted small">${H('lp.orderNote')}</p>` : '');
  const lvPick = `<div class="qs-quickbtns"><button class="btn btn-ghost btn-xs" data-act="quickLv" data-v="all">${H('tc.quick.lvAll')}</button><span class="muted small">${H('tc.quick.lvNote')}</span></div>
    <div class="qs-chs">${LV_CHAPTERS.map((k, i) => { const on = d.lv.includes(i); return `<button class="qs-chb wide ${on ? 'on' : ''}" style="--cc:var(--c-${k})" data-act="quickLv" data-v="${i}" aria-pressed="${on}">${i + 1}. ${rubyHTML(raw('ch.' + k, L()))}</button>`; }).join('')}</div>`;
  const s2 = lvMode ? lvPick : shMode ? shapePickHTML(d.shapes, 'quickShape') : lessonsPick;
  // 3. how many problems of each difficulty (all lessons together, or per lesson), and of which kind
  const detail = d.mode === 'detail';
  const modeSeg = `<div class="seg">${['simple', 'detail'].map(v => `<button class="seg-b ${d.mode === v ? 'on' : ''}" data-act="quickSet" data-k="mode" data-v="${v}" aria-pressed="${d.mode === v}">${H(v === 'simple' ? 'cmp.together' : 'cmp.perLesson')}</button>`).join('')}</div>`;
  const kindH = st => `<span class="kd k-${st}">${H(KIND_LABEL[st])}</span>`;
  const qRows = detail ? d.lessons.flatMap(k => kindsOf(k, S.engine, d.tb).map(st => ({ id: `${k}|${st}`, group: qLessonH(k), label: kindH(st), st, text: `${PD_BY_KEY[k] ? 'Py' + PD_BY_KEY[k].no : LESSON_BY_KEY[k].no} ${T(KIND_LABEL[st])}` })))
    : kindsIn(d).map(st => ({ id: st, label: kindH(st), st, text: T(KIND_LABEL[st]) }));
  const rowOf = id => (detail ? d.grid[id.split('|')[0]][id.split('|')[1]] : d.cnt[id]);
  const kindOn = detail ? null : Object.keys(KIND_RATIOS).find(v => { const ks = kindsIn(d), tot = ks.map(st => sum3(d.cnt[st])), n = tot.reduce((a, b) => a + b, 0), r = ks.map(st => KIND_RATIOS[v][QK.indexOf(st)]);
    return n && r.some(Boolean) && splitBy(n, r).every((x, i) => x === tot[i]); }) || null;
  const difTable = !d.lessons.length ? `<p class="muted small">${H('tc.qs.pickHint')}</p>` : composeHTML({ act: 'quickCmp', rows: qRows, cols: difCols(), get: (r, b) => rowOf(r)[b - 1],
    max: detail ? CMP_CELL_L : CMP_CELL, totalMax: CMP_TOTAL, secFor: r => KIND_SEC[r.st], lang: L(), corner: H('tc.qs.kindCol'),
    groups: [{ label: H('tc.qs.kpLabel'), act: 'quickKindP', on: kindOn, items: Object.keys(KIND_RATIOS).map(v => ({ v, label: H('tc.qs.kp.' + v) })) },
      { label: H('tc.qs.dpLabel'), act: 'quickDifP', on: presetOf(quickRows(d), DIF_PRESETS), items: DIF_PRESETS.map(v => ({ v, label: H('dif.p.' + v) })) }],
    note: H('dif.note') + (d.lessons.some(k => PD_BY_KEY[k]) ? ' ' + H('tc.qs.pyNoDif') : '') });
  const shCols = [['stage.fill', 's1'], ['stage.order', 's2'], ['rv.write', 's3']].map(([k, tone], i) => ({ id: i, label: H(k), tone, text: T(k) }));
  const shTable = (act, pAct, sc) => composeHTML({ act, rows: [{ id: '@all', label: H('tc.shape.row'), text: '' }], cols: shCols, get: (r, i) => sc[i], max: CMP_CELL, totalMax: 30, secEach: 40, lang: L(),
    presets: ['easy', 'even', 'hard'].map(v => ({ v, label: H('dif.p.' + v) })), presetAct: pAct, presetOn: presetOf([sc], ['easy', 'even', 'hard']), note: H('tc.shape.cmpNote') });
  const s3 = lvMode ? `<p class="muted small">${H('tc.qs.levelFixed', { n })}</p>`
    : shMode ? shTable('quickShCmp', 'quickShP', d.sc)
    : `<div class="fld"><div class="cmp-head"><span>${H('tc.qs.byKindDif')}</span>${d.lessons.length > 1 ? modeSeg : ''}</div>${difTable}</div>`;
  // 4. pass line and time
  const passSel = `<select class="select" data-qsel="pass" aria-label="${esc(T('tc.quick.pass'))}">${[null, ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => n - 1 - i)].map(v => `<option value="${v === null ? '' : v}" ${pass === v ? 'selected' : ''}>${esc(v === null ? T('tc.quick.passAll') : T('tc.quick.passN', { n: v }))}</option>`).join('')}</select>`;
  const time = `<div class="q-limit">${seg('limitBy', ['len', 'end'], d.limitBy, v => H(v === 'len' ? 'tc.live.byLen' : 'tc.live.byEnd'))}
      ${d.limitBy === 'end'
    ? `<label class="q-min"><input type="time" data-qnum="end" value="${esc(d.limitEnd)}" aria-label="${esc(T('tc.live.byEnd'))}"></label><span class="muted small">${draftLimit(d) === null ? (d.limitEnd ? H('tc.quick.endPast') : '') : '≈ ' + esc(minText(Math.max(1, Math.round(draftLimit(d) / 60))))}</span>`
    : `${seg('limit', QUICK_LIMITS, d.limitSec % 60 ? -1 : d.limitSec / 60, v => (v ? H('tc.timerMin', { n: v }) : H('tc.quick.noLimit')))}
        <label class="q-min"><input type="number" min="0" max="180" inputmode="numeric" data-qnum="min" value="${Math.floor(d.limitSec / 60) || ''}" placeholder="0" aria-label="${esc(T('tc.live.minUnit'))}"><span>${H('tc.live.minUnit')}</span></label>
        <label class="q-min"><input type="number" min="0" max="59" step="5" inputmode="numeric" data-qnum="sec" value="${d.limitSec % 60 || ''}" placeholder="0" aria-label="${esc(T('tc.quick.secUnit'))}"><span>${H('tc.quick.secUnit')}</span></label>`}</div>`;
  const tableSel = d.goal !== 'quick' ? '' : `<div class="fld"><span>${H('tc.quick.table')}</span><select class="select" data-qsel="tb" aria-label="${esc(T('tc.quick.table'))}">
      <option value="">${esc(T('tc.quick.tableAny'))}</option>
      <optgroup label="${esc(T('tp.single'))}">${tableSets(S.engine).filter(x => !x.join).map(x => `<option value="${x.key}" ${d.tb === x.key ? 'selected' : ''}>${esc(x.tables.join(' + '))}</option>`).join('')}</optgroup>
      <optgroup label="${esc(T('tp.join'))}">${tableSets(S.engine).filter(x => x.join).map(x => `<option value="${x.key}" ${d.tb === x.key ? 'selected' : ''}>${esc(x.tables.join(' + '))}</option>`).join('')}</optgroup></select>
      ${d.tb && d.lessons.some(k => LESSON_BY_KEY[k] && !tableLessons(S.engine, d.tb).includes(k)) ? `<span class="muted small">${H('tc.quick.tableSkip', { l: d.lessons.filter(k => LESSON_BY_KEY[k] && !tableLessons(S.engine, d.tb).includes(k)).map(k => LESSON_BY_KEY[k].no).join(', ') })}</span>` : ''}</div>`;
  const s4 = `<div class="qs-row">${lvMode ? '' : `<div class="fld"><span>${H('tc.quick.pass')}</span>${passSel}</div>`}<div class="fld"><span>${H('tc.quick.limit')}</span>${time}</div></div>
    ${tableSel ? `<details class="qs-more" ${d.tb ? 'open' : ''}><summary>${H('tc.qs.more')}</summary>${tableSel}</details>` : ''}`;
  // the test as it will be
  const wanted = d.goal === 'quick' ? quickTotal(d) : shMode ? sum3(d.sc) : n;
  const short = h => { const t = String(h).replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return esc(t.length > 54 ? t.slice(0, 52) + '…' : t); };
  const canMove = !lvMode && probs.length > 1;
  const pv = probs.map((p, j) => `<details class="qs-pv" data-j="${j}"><summary>${canMove ? `<button class="qs-grip" data-grip="${j}" aria-label="${esc(T('tc.qs.dragTip'))} Q${j + 1}" title="${esc(T('tc.qs.dragTip'))}">⋮⋮</button>` : ''}<b>Q${j + 1}</b><span class="tag st-${p.stage}">${stageNameH(p)}</span>${slots[j] && slots[j].bd ? `<span class="bd d${slots[j].bd}">${H('dif.' + slots[j].bd)}</span>` : ''}<span class="qs-pv-t"><small class="muted">${p.basic ? '🧱' : p.py ? `🐍${PD_BY_KEY[p.lesson].no}` : `L${LESSON_BY_KEY[p.lesson].no}`}</small> ${short(probTextH(p))}</span>
      <button class="btn btn-ghost btn-xs" data-act="quickSwap" data-k="${j}" ${nextFree(S.engine, slots, j, d.seed, d.goal === 'shape' ? '' : d.tb) === null ? 'disabled' : ''} title="${esc(T('tc.quick.swapTip'))}">${I.repeat}</button></summary>
      <div class="qs-pv-b"><p class="prob-text">${probTextH(p)}</p><div class="muted small">${H('hint.answer')}</div>${probAnsH(p)}</div></details>`).join('');
  const ready = n && draftLimit(d) !== null;
  const side = `<aside class="card qs-side">
      <div class="qs-nums"><div><b>${n}</b><small>${H('tc.qs.problems')}</small></div>${lvMode ? '' : `<div><b>${pass || n}</b><small>${H('tc.quick.pass')}</small></div>`}<div><b>${esc(limitText(d))}</b><small>${H('tc.quick.limit')}</small></div></div>
      <button class="btn btn-primary btn-lg qs-start" data-act="quickStart" ${ready ? '' : 'disabled'}>${lvMode ? '🎯' : shMode ? '🧱' : '⚡'} ${H(lvMode ? 'tc.quick.lvStart' : 'tc.quick.start')}</button>
      ${d.fixed ? `<p class="small"><b>${H('tc.quick.sameAs', { t: esc(fmtTime(d.fixed.at)) })}</b></p>` : ''}
      ${!n ? `<p class="muted small">${H('tc.qs.none')}</p>` : ''}${n && n < wanted && !d.fixed ? `<p class="muted small">${H('tc.quick.fewer')}</p>` : ''}${d.limitBy === 'end' && draftLimit(d) === null && d.limitEnd ? `<p class="err small">${H('tc.quick.endPast')}</p>` : ''}
      ${n ? `<div class="qs-pv-h"><b>${H('tc.quick.preview')}</b><span class="qs-pv-btns"><button class="btn btn-ghost btn-xs" data-act="quickReshuffle">${I.shuffle}${H('tc.quick.reshuffle')}</button><button class="btn btn-ghost btn-xs qs-clear" data-act="quickClearAll">🗑 ${H('tc.qs.clearAll')}</button></span></div><div class="qs-pvs">${pv}</div><p class="muted small">${H('tc.qs.pvTip')}${canMove ? ' ' + H('tc.qs.dragNote') : ''}</p>` : ''}
      ${!lvMode && !shMode && probs.some(p => p.py) ? `<p class="small qs-pynote">🐍 ${H('tc.quick.pyNote')}</p>` : ''}
      <p class="muted small">${H(lvMode ? 'tc.quick.lvAfter' : 'tc.quick.note')}</p>
    </aside>`;
  return `<div class="qs-wrap"><div class="qs-main">
      ${step(1, H('tc.qs.s1'), s1)}
      ${step(2, H('tc.qs.s2'), s2)}
      ${step(3, H(lvMode ? 'tc.qs.s3' : shMode ? 'tc.qs.s3dif' : 'tc.qs.s3kind'), s3)}
      ${step(4, H('tc.qs.s4'), s4)}
    </div>${side}</div>
    ${quickHistoryHTML(c)}`;
}
/* ---------- results: each problem (how many got it, the common wrong answers) and each student ---------- */
function quickPerQHTML(q, st, probs) {
  return `<div class="q-perq">${probs.map((p, i) => { const x = st.perQ[i] || { rate: 0, solved: 0, wrong: [] }, pct = Math.round(x.rate * 100);
    return `<details class="q-pq"><summary><b>Q${i + 1}</b><span class="tag st-${p.stage}">${stageNameH(p)}</span><span class="muted small">${p.basic && BASIC_BY_KEY[p.basic] ? `🧱 ${shapeNameH(p.basic)}` : p.py ? `🐍 Python ${PD_BY_KEY[p.lesson].no}` : `Lesson ${LESSON_BY_KEY[p.lesson].no}`}</span>
        <span class="q-bar ${st.started && pct < 50 ? 'low' : ''}"><i style="width:${st.started ? pct : 0}%"></i></span><b class="q-pct">${st.started ? pct + '%' : '—'}</b><span class="muted small">${x.solved} / ${st.started}</span></summary>
      <p class="prob-text">${probTextH(p)}</p>${probAnsH(p)}
      ${x.wrong.length ? `<div class="q-wrong"><b class="small">${H('tc.quick.wrongTop')}</b>${x.wrong.map(w => `<div class="q-w"><span class="q-wn" title="${esc(T('tc.quick.wrongN', { n: w.n }))}">${w.n}</span><pre class="sql wrong">${(p.py ? highlightPy : highlightSQL)(w.sql)}</pre></div>`).join('')}</div>` : ''}</details>`; }).join('')}</div>`;
}
function quickTableHTML(q, st) {
  const rank = r => (r.passed ? 0 : r.started ? 1 : 2);
  const rows = [...st.rows].sort((a, b) => rank(a) - rank(b) || (a.passed ? (a.ms || 0) - (b.ms || 0) : b.score - a.score) || a.nickname.localeCompare(b.nickname));
  const cell = (r, i) => (r.ok[i] ? `<td class="ok">○${r.tries[i] > 1 ? `<small>${r.tries[i]}</small>` : ''}</td>` : r.tries[i] ? `<td class="bad">×<small>${r.tries[i]}</small></td>` : '<td class="muted">–</td>');
  return `<div class="q-table-wrap"><table class="q-table q-res"><thead><tr><th>${H('class.nickname')}</th>${Array.from({ length: q.n }, (_, i) => `<th class="center">Q${i + 1}</th>`).join('')}<th class="n">${H('tc.quick.colScore')}</th><th class="n">${H('tc.quick.colTime')}</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.passed ? 'pass' : r.started ? '' : 'none'}"><th title="${esc(r.nickname)}">${esc(r.nickname)}</th>${Array.from({ length: q.n }, (_, i) => cell(r, i)).join('')}<td class="n">${r.started ? `<b>${r.score}</b> / ${q.n}` : `<span class="muted">${H('tc.quick.notStarted')}</span>`}</td><td class="n">${r.ms === null ? '' : '✓ ' + mmssOf(r.ms)}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted small">${H('tc.quick.tableNote')}</p>`;
}
function quickResultHTML(c, q) {
  const st = quickStats(S.qAtt || [], q, S.members), probs = quickProblems(S.engine, q);
  const btn = (act, label, extra = '') => `<button class="btn btn-ghost btn-sm" data-act="${act}" data-id="${q.id}" ${extra}>${label}</button>`;
  return `<div class="q-result">
      ${st.started ? `<div class="q-tiles"><div><b>${st.passed} / ${S.members.length}</b><span>${H('tc.quick.passedN')}</span></div><div><b>${st.avg.toFixed(1)} / ${q.n}</b><span>${H('tc.quick.avg')}</span></div><div><b>${st.started}</b><span>${H('tc.quick.took')}</span></div></div>` : `<p class="muted">${H('tc.quick.noAnswers')}</p>`}
      <h3>${H('tc.quick.perQ')}</h3>${quickPerQHTML(q, st, probs)}
      ${st.started ? `<h3>${H('tc.quick.perStudent')}</h3>${quickTableHTML(q, st)}` : ''}
      <div class="row-btns left">${st.started ? btn('quickCsv', '⬇ ' + H('tc.quick.csv')) : ''}${Array.isArray(q.slots) ? btn('quickAgain', I.shuffle + H('tc.quick.againNew')) + btn('quickAgain', I.repeat + H('tc.quick.againSame'), 'data-same="1"') : ''}${btn('quickDel', I.trash + H('tc.quick.del'))}</div></div>`;
}
function quickHistoryHTML(c) {
  const log = quickLog(c).filter(q => q && q.id && !(quickOn(c) && q.id === c.quick.id));
  if (!log.length) return '';
  return `<section class="card quick-hist"><h2>${H('tc.quick.hist')}</h2>${logInDb(c) ? '' : `<p class="muted small">${H('tc.quick.localOnly')}</p>`}
    ${log.map(q => { const open = S.qOpen === q.id, prog = quickProgress(S.qAtt || [], q), passed = S.members.filter(m => (prog.get(m.user_id) || {}).done).length;
      const ls = [...new Set((q.slots || []).map(x => x.k))].filter(k => LESSON_BY_KEY[k]).map(k => LESSON_BY_KEY[k].no);
      return `<div class="q-hist ${open ? 'open' : ''}"><button class="q-hist-h" data-act="quickOpen" data-id="${q.id}" aria-expanded="${open}"><b>${esc(fmtTime(q.at))}</b><span>${H('tc.quick.histLine', { n: q.n, a: passed, b: S.members.length })}</span>${ls.length ? `<span class="muted small">Lesson ${ls.join(', ')}</span>` : ''}<i class="q-caret">${open ? '▾' : '▸'}</i></button>${open ? quickResultHTML(c, q) : ''}</div>`; }).join('')}</section>`;
}
/** the clock of a quick test: the countdown, the time left, or "time is up" */
function quickClock(q) {
  const ph = quickPhase(q, nowMs());
  if (ph === 'wait') return `<b class="q-clock wait">${H('tc.quick.startsIn', { n: Math.ceil((new Date(q.at).getTime() - nowMs()) / 1000) })}</b>`;
  if (ph === 'up') return `<b class="q-clock up">${H('tc.quick.timeUp')}</b>`;
  return q.end ? `<b class="q-clock run">${H('tc.quick.left', { t: mmssOf(new Date(q.end).getTime() - nowMs()) })}</b>` : `<b class="q-clock run">${mmssOf(nowMs() - new Date(q.at).getTime())}</b>`;
}
/** the roster: who has passed (and when), who is on the way, who has not started */
function quickRunHTML(c, q, running) {
  const prog = quickProgress(S.qAtt || [], q), t0 = new Date(q.at).getTime(), pass = passOf(q);
  const rows = S.members.map(m => ({ m, s: prog.get(m.user_id) || null }));
  const done = rows.filter(r => r.s && r.s.done).sort((a, b) => (a.s.done < b.s.done ? -1 : 1));
  const going = rows.filter(r => r.s && !r.s.done).sort((a, b) => b.s.ok.size - a.s.ok.size || a.m.nickname.localeCompare(b.m.nickname));
  const none = rows.filter(r => !r.s).sort((a, b) => a.m.nickname.localeCompare(b.m.nickname));
  const st = quickStats(S.qAtt || [], q, S.members), byU = new Map(st.rows.map(r => [r.user_id, r]));
  // one square per problem: green = right, red = tried and not right yet, grey = not tried
  const cells = r => { const x = byU.get(r.m.user_id); return `<span class="q-cells">${Array.from({ length: q.n }, (_, i) => `<i class="${x && x.ok[i] ? 'ok' : x && x.tries[i] ? 'bad' : ''}" title="Q${i + 1}"></i>`).join('')}</span>`; };
  const bar = r => `<span class="q-pbar"><i style="width:${Math.round((r.s ? r.s.ok.size : 0) / q.n * 100)}%"></i><i class="q-pline" style="left:${Math.round(pass / q.n * 100)}%"></i></span>`;
  const chip = r => !r.s ? `<li class="q-st none" title="${esc(r.m.nickname)}"><div class="q-st-h"><b>${esc(r.m.nickname)}</b><span>${H('tc.quick.notStarted')}</span></div>${cells(r)}</li>`
    : r.s.done ? `<li class="q-st done" title="${esc(r.m.nickname)}"><div class="q-st-h"><b>${esc(r.m.nickname)}</b><span>✓ ${mmssOf(new Date(r.s.done).getTime() - t0)} · ${r.s.ok.size}/${q.n}</span></div>${cells(r)}${bar(r)}</li>`
    : `<li class="q-st going" title="${esc(r.m.nickname)}"><div class="q-st-h"><b>${esc(r.m.nickname)}</b><span>${r.s.ok.size} / ${q.n}</span></div>${cells(r)}${bar(r)}</li>`;
  const tot = S.members.length || 1, pct = n => Math.round(n / tot * 100);
  const classBar = `<div class="q-classbar" role="img" aria-label="${esc(`${done.length} / ${going.length} / ${none.length}`)}">
      <i class="done" style="width:${pct(done.length)}%"></i><i class="going" style="width:${pct(going.length)}%"></i><i class="none" style="width:${pct(none.length)}%"></i></div>
    <div class="q-legend"><span><i class="done"></i>${H('tc.quick.lgPass')} <b>${done.length}</b></span><span><i class="going"></i>${H('tc.quick.going')} <b>${going.length}</b></span><span><i class="none"></i>${H('tc.quick.notStarted')} <b>${none.length}</b></span></div>`;
  const probs = quickProblems(S.engine, q);
  const rule = H('tc.quick.meta', { n: q.n, pass, t: fmtTime(q.at) });
  const head = running
    ? `<div class="q-head"><span class="live-st"><i class="live-dot"></i><b>${H('tc.quick.on')}</b></span><span data-qclock>${quickClock(q)}</span><span class="muted small">${rule}</span>
        <span class="row-btns">${q.end ? [-1, 1, 5].map(m => `<button class="btn btn-ghost btn-sm" data-act="quickMore" data-m="${m}">${m > 0 ? '+' : '−'}${Math.abs(m)} ${H('tc.live.minUnit')}</button>`).join('') : ''}<button class="btn btn-ghost btn-sm" data-act="quickBig">${I.screen}${H('tc.quick.big')}</button><button class="btn btn-ghost btn-sm" data-act="quickStop">${H('tc.quick.stop')}</button></span></div>`
    : `<div class="q-head"><b>${H('tc.quick.last')}</b><span class="muted small">${rule}</span></div>`;
  return `<section class="card quick-run ${running ? 'on' : ''}">${head}
      <div class="q-count"><b class="q-big">${done.length}</b><span>/ ${S.members.length} ${H(pass < q.n ? 'tc.quick.passedN' : 'tc.quick.passed')}</span></div>
      ${classBar}
      <ul class="q-roster" id="q-roster">${done.map(chip).join('')}${going.map(chip).join('')}${none.map(chip).join('')}</ul>
      <h3 class="q-h3">${H('tc.quick.perQ')}</h3>${quickPerQHTML(q, st, probs)}
    </section>`;
}
function quickBigHTML() {   // for the projector: the time only (no names, no count of who has passed)
  const q = S.klass && S.klass.quick;
  if (!q) return '';
  return `<div class="q-bigview"><h2>⚡ ${H('tc.quick.title')}</h2><div class="q-bigclock">${quickClock(q)}</div></div>`;
}
let qPhaseShown = null;
setInterval(() => {
  const q = S.klass && quickOn(S.klass) ? S.klass.quick : null;
  if (!q) return;
  const ph = quickPhase(q, nowMs());
  document.querySelectorAll('[data-qclock]').forEach(el => { el.innerHTML = quickClock(q); });
  if (ph !== qPhaseShown) { const was = qPhaseShown; qPhaseShown = ph; if (was && S.route.view === 'class' && S.route.tab === 'quick') refreshTab(); }
  const big = document.querySelector('#modal .q-bigview'); if (big) big.outerHTML = quickBigHTML();
}, 1000);
function quickError(e) {
  if (/quick/i.test(e.message || '') && /column|schema cache/i.test(e.message || '')) return T('tc.quick.needsDb');
  if (!navigator.onLine || e instanceof TypeError) return T('class.netError');
  return `${T('tc.quick.failed')} ${e.message}`;
}

/* ---------- class live: the students work on the assignment until it ends ---------- */
/* the class live's length: any number of minutes, or until a time of day (the server allows 5–240 minutes) */
const LIVE_MIN = [45, 50, 90, 120], LIVE_MAX = 240;
const clockHM = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
function liveBoxHTML(c) {
  if (!liveOn(c)) {
    const mode = Store.get('sqln.liveMode', 'len'), len = Store.get('sqln.liveLen', 50);
    const saved = Store.get('sqln.liveEnd', ''), sm = /^(\d{1,2}):(\d{2})$/.exec(saved || '');
    const later = sm && (+sm[1] * 60 + +sm[2]) > new Date().getHours() * 60 + new Date().getMinutes();   // a saved end time still ahead today
    const end = later ? saved : clockHM(new Date(Date.now() + len * 60000));
    return `<button class="btn btn-primary btn-sm" data-act="liveStart" title="${esc(T('tc.live.tip'))}" ${(c.lessons || []).length ? '' : 'disabled'}>▶ ${H('tc.live.start')}</button>
    <div class="live-len">
      <div class="seg seg-xs" role="group" aria-label="${esc(T('tc.live.len'))}">${[['len', 'tc.live.byLen'], ['end', 'tc.live.byEnd']].map(([m, k]) => `<button class="seg-b ${mode === m ? 'on' : ''}" data-act="liveMode" data-v="${m}" aria-pressed="${mode === m}">${H(k)}</button>`).join('')}</div>
      ${mode === 'end'
        ? `<label class="live-in"><input type="time" id="live-end" value="${esc(end)}" step="60" aria-label="${esc(T('tc.live.byEnd'))}"><span class="muted small">${H('tc.live.untilWord')}</span></label>`
        : `<label class="live-in"><input type="number" id="live-len" inputmode="numeric" min="5" max="${LIVE_MAX}" step="5" value="${esc(len)}" list="live-len-list" aria-label="${esc(T('tc.live.len'))}"><span class="muted small">${H('tc.live.minUnit')}</span></label>
          <datalist id="live-len-list">${LIVE_MIN.map(m => `<option value="${m}"></option>`).join('')}</datalist>
          <span class="live-quick">${LIVE_MIN.map(m => `<button class="btn btn-ghost btn-xs" data-act="liveLen" data-v="${m}">${esc(T('tc.live.min', { n: m }))}</button>`).join('')}</span>`}
    </div>
    ${(c.lessons || []).length ? '' : `<small class="muted">${H('tc.live.noLessons')}</small>`}`;
  }
  const until = c.live_until ? clockHM(new Date(c.live_until)) : '';
  return `<span class="live-st"><i class="live-dot"></i><b>${H('tc.live.on')}</b><span class="muted small" data-tlive>${H('tc.live.left', { n: liveMinutesLeft(c) })}</span>${until ? `<span class="muted small">· ${H('tc.live.until', { t: until })}</span>` : ''}</span>
    <span class="row-btns"><button class="btn btn-ghost btn-xs" data-act="liveMore">${H('tc.live.more')}</button><button class="btn btn-ghost btn-xs" data-act="liveStop">${H('tc.live.stop')}</button></span>`;
}
/** minutes for the class live from the form, or an error message */
function liveMinutes() {
  if (Store.get('sqln.liveMode', 'len') === 'end') {
    const v = (document.getElementById('live-end') || {}).value || '';
    const m = /^(\d{1,2}):(\d{2})$/.exec(v);
    if (!m) return { err: T('tc.live.endBad') };
    Store.set('sqln.liveEnd', v);
    const end = new Date(); end.setHours(+m[1], +m[2], 0, 0);
    const min = Math.ceil((end.getTime() - Date.now()) / 60000);
    if (min < 1) return { err: T('tc.live.endPast') };
    if (min > LIVE_MAX) return { err: T('tc.live.tooLong', { n: LIVE_MAX }) };
    return { min: Math.max(5, min) };
  }
  const n = parseInt(String((document.getElementById('live-len') || {}).value || '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)), 10);
  if (!(n >= 1)) return { err: T('tc.live.lenBad') };
  if (n > LIVE_MAX) return { err: T('tc.live.tooLong', { n: LIVE_MAX }) };
  Store.set('sqln.liveLen', Math.max(5, n));
  return { min: Math.max(5, n) };
}
let liveShownT = null;
function tickTeacherLive() {
  const c = S.klass, box = document.getElementById('lbox');
  if (!c || !box) return;
  const on = liveOn(c);
  if (on !== liveShownT) { liveShownT = on; box.innerHTML = liveBoxHTML(c); box.classList.toggle('on', on); return; }
  const el = box.querySelector('[data-tlive]');
  if (el) { const h = H('tc.live.left', { n: liveMinutesLeft(c) }); if (el.innerHTML !== h) el.innerHTML = h; }
}
setInterval(tickTeacherLive, 1000);
function liveError(e) {
  if (e.message === 'live_missing') return T('tc.live.needsDb');
  if (!navigator.onLine || e instanceof TypeError) return T('class.netError');
  return `${T('tc.live.failed')} ${e.message}`;
}

/* ---------- class timer: shown on every student's screen; answers after the end are marked late ---------- */
const TIMER_MIN = [1, 3, 5, 10];
function timerBoxHTML(c) {
  const left = secondsLeft(c), st = timerState(left);
  if (!st) return `<span class="tb-lab">⏱ ${H('tc.timer')}</span><div class="tb-presets">${TIMER_MIN.map(m => `<button class="btn btn-ghost btn-xs" data-act="timerStart" data-sec="${m * 60}" title="${esc(T('tc.timerNote'))}">${H('tc.timerMin', { n: m })}</button>`).join('')}
    <span class="tb-free"><input type="number" id="timer-min" inputmode="numeric" min="1" max="120" value="${esc(Store.get('sqln.timerMin', 15))}" aria-label="${esc(T('tc.timer'))}"><span class="muted small">${H('tc.live.minUnit')}</span><button class="btn btn-ghost btn-xs" data-act="timerStart" data-free="1" title="${esc(T('tc.timerNote'))}">▶</button></span></div>`;
  return `<b class="tb-time mono ${st}" data-timer>${st === 'up' ? H('timer.up') : fmtClock(left)}</b>
    <div class="tb-presets"><button class="btn btn-ghost btn-xs" data-act="timerBig">${H('tc.timerBig')}</button><button class="btn btn-ghost btn-xs" data-act="timerStop">${H('tc.timerStop')}</button></div>`;
}
let shownState = null;
function tickTeacherTimer() {
  const c = S.klass;
  const box = document.getElementById('tbox');
  if (!c || !box) return;
  const left = secondsLeft(c), st = timerState(left);
  if (st !== shownState) { shownState = st; box.innerHTML = timerBoxHTML(c); }
  const text = st === 'up' ? T('timer.up') : st ? fmtClock(left) : '';
  document.querySelectorAll('[data-timer]').forEach(el => { el.className = el.className.replace(/\b(run|warn|up)\b/g, '').trim() + ' ' + st; if (el.textContent !== text) el.textContent = text; });
  const big = document.getElementById('timer-big');
  if (big && !st) big.remove();
}
setInterval(tickTeacherTimer, 250);

function assignHTML(c) {
  const sel = new Set(c.lessons || []);
  const pol = c.answer_policy;
  return `<form class="card assign-form" data-form="assign">
    <div class="fld"><span>${H('tc.setCode')}</span>
      <div class="inline-form"><input name="set_code" class="mono" maxlength="16" value="${esc(c.set_code)}" required>
      <button type="button" class="btn btn-ghost btn-sm" data-act="setToday">${H('set.today')}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="setRandom">${I.shuffle}${H('set.new')}</button></div>
      <small class="muted">${H('tc.setCodeTip')}</small><small class="muted">✓ ${H('tc.roundNote')}</small></div>
    <div class="fld"><span>${H('tc.policy')}</span>
      ${['after2', 'solved', 'always', 'never'].map(p => `<label class="chk"><input type="radio" name="policy" value="${p}" ${pol === p ? 'checked' : ''}><span><b>${H('tc.policy.' + p)}</b> <small class="muted">${H('tc.policyTip.' + p)}</small></span></label>`).join('')}</div>
    ${formatFieldHTML(c)}
    <div class="actions"><button class="btn btn-primary">${I.check}${H('tc.saveAssign')}</button><span class="muted small">${H('tc.liveTip')}</span></div>
    <hr>
    <div class="fld"><span>${H('tc.previewTitle')}</span><small class="muted">${H('tc.previewTip')}</small>
      <div class="preview-list">${(c.lessons || []).filter(k => LESSON_BY_KEY[k]).map(k => {
        const l = LESSON_BY_KEY[k];
        return `<details class="pv"><summary>${lessonTitleHTML(l, L())}</summary>${S.engine.lessonProblems(l, c.set_code, c.format).map(p => `<div class="pv-item"><span class="tag st-${p.stage}">${stageNameH(p)}</span>${p.bd ? `<span class="bd d${p.bd}">${H('dif.' + p.bd)}</span>` : ''} ${problemHTML(p, L())}${answerHTML(p)}</div>`).join('')}</details>`;
      }).join('') || `<p class="muted">${H('tc.noLessons')}</p>`}</div></div>
  </form>`;
}

/* ---------- 配信: everything sent to the class in one place: the live lessons, the shape mix, tests, practice,
 * documents and certification practice; who has done what in one table ---------- */
const SEND_GROUPS = [['g.read', ['read']], ['g.prac', ['lessons', 'mix', 'basics', 'clauses', 'drill', 'practice', 'table', 'lecture', 'py']], ['g.test', ['rankup', 'rank', 'check', 'level']], ['g.cert', ['hr', 'pz']]];
const SEND_ICON = Object.assign({ lessons: '📚', mix: '🧱' }, ASG_ICON);
const typeName = t => plainT(t === 'lessons' ? 'tc.send.lessons' : t === 'mix' ? 'tc.task.title' : 'as.type.' + t);
function sendTypeHTML() {
  return `<select data-as="type" class="snd-type">${SEND_GROUPS.map(([g, ts]) => `<optgroup label="${esc(plainT('tc.send.' + g))}">${ts.map(t => `<option value="${t}" ${t === asD.type ? 'selected' : ''}>${SEND_ICON[t] || '•'} ${esc(typeName(t))}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
function lessonsFormHTML(c) {
  const sel = new Set(c.lessons || []);
  return `<form class="assign-form snd-lessons" data-form="lessons">
    <div class="fld"><span>${H('tc.assignLessons')}</span><small class="muted">${H('tc.send.lessonsNote')}</small>
      ${lessonPickHTML({ id: 'class', lang: L(), name: 'lesson', chosen: [...sel], groups: lessonGroups(LESSONS, L()) })}</div>
    <div class="actions"><button class="btn btn-primary">📬 ${H('tc.send.lessonsSave')}</button><a class="small" href="#/c/${c.id}/assign">${H('tc.send.toSettings')} →</a></div></form>`;
}
/** the "make" card: the type, then what it needs */
function sendMakeHTML(c) {
  let what;
  if (asD.type === 'lessons') what = `<div class="as-form">${sendTypeHTML()}</div>${lessonsFormHTML(c)}`;
  else if (asD.type === 'mix') what = `<div class="as-form">${sendTypeHTML()}</div>${taskHTML(c)}`;
  else if (asD.type === 'check' && tasksInDb(c)) what = `<div class="as-form">${sendTypeHTML()}</div><p class="muted small">${H('tc.send.checkHere')}</p>${checkSetupHTML({ sendBar: ready => `<div class="snd-ckbar">
      <label class="fld"><span>${H('as.tc.limitMin')}</span><input type="number" min="0" max="180" value="${asD.limit || 0}" data-as="limit"></label>
      <label class="fld"><span>${H('as.tc.note')}</span><input type="text" maxlength="120" value="${esc(asD.note)}" data-as="note" placeholder="${esc(plainT('as.tc.notePh'))}"></label>
      <button type="button" class="btn btn-primary btn-lg qs-start" data-act="asSend" ${ready ? '' : 'disabled'}>📬 ${H('as.tc.send')}</button>
      <p class="muted small">${H('as.tc.testNote')}</p></div>` })}`;
  else what = tasksInDb(c) ? asgFormHTML() : `<div class="as-form">${sendTypeHTML()}</div><p class="muted small">${H('tc.task.schema')}</p>`;
  return `<section class="card snd-make"><h2>📬 ${H('tc.send.make')}</h2>${what}</section>`;
}
/** each member's progress in the live lessons: user → [solved, of] */
function lessonProgress(c) {
  const all = classProblems(c).flatMap(g => g.probs), ok = new Set();
  countable(visibleAttempts()).forEach(a => { if (a.ok) ok.add(a.user_id + '|' + a.problem_id); });
  return { n: all.length, of: m => all.filter(p => ok.has(m.user_id + '|' + p.id)).length };
}
/** one cell of the table: [text, state] state = done | mid | none */
function sendCell(it, m) {
  if (it.type === 'rankup') { const r = ruResults(S.asAtt || [], [m], it)[0]; const n = RK_TIERS.filter(t => r.tiers[t] && r.tiers[t].clear).length; return [n === RK_TIERS.length ? '✓' : `${n}/${RK_TIERS.length}`, n === RK_TIERS.length ? 'done' : r.n ? 'mid' : 'none']; }
  const r = asgResults(S.asAtt || [], [m], it)[0];
  if (r.done) return [r.reason || '✓', 'done'];
  if (it.type === 'hr' || it.type === 'pz') { const pr = hrProgress(it)[m.user_id]; if (pr) return [pr.replace(/\s/g, ''), 'mid']; }
  if (r.started) return [plainT(it.type === 'read' ? 'as.tc.st.opened' : 'as.tc.st.started'), 'mid'];
  return ['—', 'none'];
}
function sendMatrixHTML(c) {
  const items = asgList(c).filter(it => it.open !== false).reverse(), lp = (c.lessons || []).length ? lessonProgress(c) : null, mix = c.tasks && c.tasks.mix;
  const mixRows = mix ? Object.fromEntries(taskRows(mix).map(r => [r.m.user_id, r])) : {};
  const cols = [...(lp && lp.n ? [{ k: 'lessons', ic: SEND_ICON.lessons, name: plainT('tc.send.lessons') }] : []), ...(mix ? [{ k: 'mix', ic: SEND_ICON.mix, name: plainT('tc.task.title') }] : []),
    ...items.map(it => ({ k: it.id, ic: SEND_ICON[it.type], name: asgLabelHTML(it, L()).replace(/<small[\s\S]*$/, '').replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, ''), it }))];
  if (!cols.length) return `<section class="card snd-matrix"><h2>📊 ${H('tc.send.matrix')}</h2><p class="muted small">${H('as.tc.none')}</p></section>`;
  const cell = (col, m) => {
    if (col.k === 'lessons') { const d = lp.of(m); return [`${d}/${lp.n}`, d >= lp.n ? 'done' : d ? 'mid' : 'none']; }
    if (col.k === 'mix') { const r = mixRows[m.user_id] || { ok: 0, tried: 0 }; return [`${r.ok}/${mix.n}`, r.ok >= mix.n ? 'done' : r.tried ? 'mid' : 'none']; }
    return sendCell(col.it, m);
  };
  const rows = S.members.map(m => { const cs = cols.map(col => cell(col, m)), d = cs.filter(x => x[1] === 'done').length;
    return `<tr><th>${esc(m.nickname)}</th><td class="n sum">${d}/${cols.length}</td>${cs.map(([t, st]) => `<td class="sc ${st}">${st === 'done' && t !== '✓' ? `✓ ${esc(t)}` : esc(t)}</td>`).join('')}</tr>`; }).join('');
  const doneBy = col => S.members.filter(m => cell(col, m)[1] === 'done').length;
  return `<section class="card snd-matrix"><h2>📊 ${H('tc.send.matrix')}</h2><p class="muted small">${H('tc.send.matrixSub')}</p>
    <div class="q-table-wrap"><table class="q-table snd-tbl"><thead><tr><th></th><th>${H('tc.send.done')}</th>${cols.map(col => `<th title="${esc(col.name)}"><span class="snd-ic">${col.ic || '•'}</span><span class="snd-name">${esc(col.name)}</span></th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${cols.length + 2}" class="muted">${H('as.tc.noMembers')}</td></tr>`}</tbody>
    ${S.members.length ? `<tfoot><tr><th>${H('tc.send.total')}</th><td></td>${cols.map(col => `<td class="n">${doneBy(col)}/${S.members.length}</td>`).join('')}</tr></tfoot>` : ''}</table></div></section>`;
}
/** the buttons on a sent item's row (seen without opening it): end / reopen, take back */
const asActsHTML = it => `<span class="as-acts"><button type="button" class="btn btn-ghost btn-xs" data-act="asOpen" data-id="${esc(it.id)}" title="${esc(plainT(it.open === false ? 'as.tc.reopenTip' : 'as.tc.closeTip'))}">${H(it.open === false ? 'as.tc.reopen' : 'as.tc.close')}</button><button type="button" class="btn btn-ghost btn-xs danger" data-act="asDel" data-id="${esc(it.id)}">${H('as.tc.del')}</button></span>`;
/** what is set on the class outside tasks.items: the lessons of the live class, the 基礎の型 task */
function sendFixedHTML(c) {
  const out = [], mix = c.tasks && c.tasks.mix;
  if ((c.lessons || []).length) out.push(`<li class="as-item fixed"><div class="as-row"><span class="as-ic">📚</span>
      <span class="as-what"><small class="muted">${H('tc.send.t.lessons')}</small><b>${c.lessons.filter(k => LESSON_BY_KEY[k]).map(k => esc(LESSON_BY_KEY[k].no)).join(', ')}</b></span>
      <span class="as-acts"><button type="button" class="btn btn-ghost btn-xs" data-act="sendEdit" data-v="lessons">${H('tc.send.edit')}</button><button type="button" class="btn btn-ghost btn-xs danger" data-act="lessonsClear">${H('as.tc.del')}</button></span></div></li>`);
  if (mix) out.push(`<li class="as-item fixed"><div class="as-row"><span class="as-ic">🧱</span>
      <span class="as-what"><small class="muted">${H('tc.task.title')} · ${esc(fmtTime(mix.at))}</small><b>${H('tc.task.what', { n: mix.n })}</b></span>
      <span class="as-acts"><button type="button" class="btn btn-ghost btn-xs" data-act="sendEdit" data-v="mix">${H('tc.send.edit')}</button><button type="button" class="btn btn-ghost btn-xs danger" data-act="taskClear">${H('as.tc.del')}</button></span></div></li>`);
  return out.join('');
}
function sendListHTML(c) {
  const items = asgList(c), open = items.filter(it => it.open !== false), closed = items.filter(it => it.open === false), fixed = sendFixedHTML(c);
  return `<section class="card snd-list"><h2>🗂 ${H('tc.send.list')}</h2><p class="muted small">${H('tc.send.listNote')}</p>
    ${open.length || fixed ? `<ul class="as-list">${fixed}${open.map(asgItemTcHTML).join('')}</ul>` : `<p class="muted small">${H('as.tc.none')}</p>`}
    ${closed.length ? `<details class="snd-closed"><summary>${H('tc.send.closed', { n: closed.length })}</summary><ul class="as-list">${closed.map(asgItemTcHTML).join('')}</ul></details>` : ''}</section>`;
}
function sendHTML(c) {
  return `<div class="as-tc snd">${sendMakeHTML(c)}${sendMatrixHTML(c)}${sendListHTML(c)}</div>`;
}
/** after new results: the table and the list (the "make" card keeps what the teacher is typing) */
function sendRefresh() {
  if (!S.klass) return;
  const m = document.querySelector('.snd-matrix'), l = document.querySelector('.snd-list');
  if (m) m.outerHTML = sendMatrixHTML(S.klass);
  if (l) { const was = !!(l.querySelector('.snd-closed') || {}).open; l.outerHTML = sendListHTML(S.klass); if (was) { const d = document.querySelector('.snd-list .snd-closed'); if (d) d.open = true; } }
}
/* ---------- sending things to the class (配信, assign.js): tests each student starts when ready, practice, lectures ----------
 * In the class row: tasks.items. The students' records come in as as:<id>:start / as:<id>:done (S.asAtt). */
const asD = { type: 'read', ref: '', limit: 0, pass: 'B', url: '', title: '', note: '' };
const redrawAs = () => { const el = document.querySelector('.as-tc'); if (el && S.klass) el.outerHTML = el.classList.contains('snd') ? sendHTML(S.klass) : asgPanelHTML(S.klass); };
const plainT = k => String(T(k)).replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
const lessonOpt = k => `${LESSON_BY_KEY[k].no}. ${plainT(`L.${k}.title`)}`;
/** the choices for one type: [[ref, label]] */
function asgChoices(type) {
  switch (type) {
    case 'rankup': return RK_CHAPTERS.map(ch => [ch, plainT('ch.' + ch)]);
    case 'rank': return RK_CHAPTERS.flatMap(ch => RK_TIERS.map(t => [rankKey(ch, t), `${plainT('ch.' + ch)} · ${plainT('rk.tier.' + t)}`]));
    case 'basics': return BASIC_STEPS.map(b => [b.key, b.core ? plainT('bs.s.' + b.key) : lessonOpt(b.lesson)]);
    case 'clauses': return CQ_SETS.map(k => [k, k === 'all' ? plainT('cq.all') : KW[k] || k]);
    case 'drill': return [...S.engine.drillLessons()].filter(k => LESSON_BY_KEY[k]).map(k => [k, lessonOpt(k)]);
    case 'practice': return LESSONS.filter(l => l.kind !== 'quiz').map(l => [l.key, lessonOpt(l.key)]);
    case 'table': return tableSets(S.engine).map(x => [x.key, x.tables.join(' + ')]);
    case 'lecture': return [...LESSONS.filter(l => hasLecture(l.key)).map(l => [l.key, lessonOpt(l.key)]), ...PD_LESSONS.filter(l => hasLecture(l.key)).map(l => [l.key, `Python ${l.no}. ${plainT('pd.t.' + l.key)}`])];
    case 'py': return PD_LESSONS.map(l => [l.key, `${l.no}. ${plainT('pd.t.' + l.key)}`]);
    case 'read': return READ_PRESETS.map(k => [k, plainT('as.rd.' + k)]);
    case 'hr': return [...['sel', 'rel', 'agg'].map(a => [a, plainT('hr.area.' + a)]), ['mock', plainT('hr.mockH')]];
    case 'pz': return [1, 2, 3, 4, 5].map(n => [String(n), `Lv.${n} ${plainT('pz.lv.' + n)}`]);
    default: return [];
  }
}
function asgFormHTML() {
  const ch = asgChoices(asD.type);
  if (ch.length && !ch.some(x => x[0] === asD.ref)) asD.ref = ch[0][0];
  const ck = asD.type === 'check' ? currentCheck() : null;
  let what;
  if (asD.type === 'check') what = ck ? `<p class="small">${H('as.tc.checkNow', { l: ck.lessons, n: ck.n })} <a href="#/check">${H('as.tc.checkEdit')}</a></p>
      <label class="as-lim"><span>${H('as.tc.limitMin')}</span><input type="number" min="0" max="180" value="${asD.limit || 0}" data-as="limit"></label>` : `<p class="small muted">${H('as.tc.checkNone')} <a href="#/check">${H('ck.title')}</a></p>`;
  else if (asD.type === 'level') what = `<p class="small muted">${H('as.noLimit')}</p>`;
  else what = `<select data-as="ref">${ch.map(([v, lab]) => `<option value="${esc(v)}" ${v === asD.ref ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>${asD.type === 'rankup'
      ? ` <label class="as-lim"><span>${H('as.ru.passLabel')}</span><select data-as="pass">${RK_RANKS.slice(1).map(r => `<option value="${r}" ${r === asD.pass ? 'selected' : ''}>${r}</option>`).join('')}</select></label>` : ''}`;
  if (asD.type === 'read') {
    const u = asD.ref === 'url' ? '' : asgReadUrl({ ref: asD.ref }, L());
    what += asD.ref === 'url' ? `<label class="as-lim as-wide"><span>${H('as.tc.rdTitle')}</span><input type="text" maxlength="80" value="${esc(asD.title)}" data-as="title" placeholder="${esc(plainT('as.tc.rdTitlePh'))}"></label>
      <label class="as-lim as-wide"><span>${H('as.tc.rdUrl')}</span><input type="url" value="${esc(asD.url)}" data-as="url" placeholder="https://…"></label>`
      : ` <a class="small" href="${esc(u.startsWith('#') ? '../' + u : u.startsWith('http') ? u : '../' + u)}" target="_blank" rel="noopener">${H('as.tc.rdPreview')} ↗</a>`;
  }
  what += `<label class="as-lim as-wide"><span>${H('as.tc.note')}</span><input type="text" maxlength="120" value="${esc(asD.note)}" data-as="note" placeholder="${esc(plainT('as.tc.notePh'))}"></label>`;
  const lim = asD.type === 'rank' ? asgLimit({ type: 'rank', ref: asD.ref }) : 0;
  const ok = asD.type === 'check' ? !!ck : asD.type === 'level' || !!asD.ref;
  return `<div class="as-form">
      ${sendTypeHTML()}
      <div class="as-what">${what}</div>
      <button type="button" class="btn btn-primary" data-act="asSend" ${ok ? '' : 'disabled'}>📬 ${H('as.tc.send')}</button></div>
    <p class="muted small">${asD.type === 'rankup' ? H('as.ru.tcNote', { r: esc(asD.pass) }) : asD.type === 'read' ? H('as.tc.rdNote') : asD.type === 'hr' ? H('as.tc.hrNote') : asD.type === 'pz' ? H('as.tc.pzNote') : ASG_TEST.has(asD.type) ? `${H('as.tc.testNote')}${lim ? ` ${H('as.limit', { m: lim / 60 })}` : ''}` : H('as.tc.pracNote')}</p>`;
}
function ruItemTcHTML(it) {
  const rs = ruResults(S.asAtt || [], S.members || [], it), all = rs.filter(r => !r.next).length;
  const cell = (r, t) => { const v = r.tiers[t]; if (!v) return `<td class="muted">${r.next === t ? H('as.tc.st.none') : '🔒'}</td>`;
    return `<td>${v.clear ? '✓ ' : ''}${v.best ? `<span class="rk-badge sm r-${esc(v.best.rank)}">${esc(v.best.rank)}</span>${v.best.passed ? `<span class="rk-withpass">${H('rk.withPass')}</span>` : ''} <b>${v.best.score}</b>` : ''} <small class="muted">${H('as.ru.tries', { n: v.n })}</small></td>`; };
  const order = rs.slice().sort((a, b) => RK_TIERS.indexOf(b.next || 'z') - RK_TIERS.indexOf(a.next || 'z') || b.n - a.n);
  return `<li class="as-item ${it.open === false ? 'closed' : ''}"><details><summary><span class="as-ic">${ASG_ICON.rankup}</span>
      <span class="as-what"><small class="muted">${H('as.type.rankup')} · ${esc(fmtTime(it.at))} · ${H(it.open === false ? 'as.tc.closed' : 'as.tc.open')}</small><b>${asgLabelHTML(it, L())}</b></span>
      <span class="as-count">${H('as.tc.ruCount', { d: all, n: rs.length })}</span>${asActsHTML(it)}</summary>
    <table class="wtable as-tbl"><thead><tr><th></th>${RK_TIERS.map(t => `<th>${H('rk.tier.' + t)}</th>`).join('')}</tr></thead><tbody>${order.map(r => `<tr class="${r.next ? '' : 'done'}"><th>${esc(r.m.nickname)}</th>${RK_TIERS.map(t => cell(r, t)).join('')}</tr>`).join('') || `<tr><td class="muted">${H('as.tc.noMembers')}</td></tr>`}</tbody></table></details></li>`;
}
/** HackerRank practice on the way: each student's latest { n, m } → "n / m" */
function hrProgress(it) {
  const o = {};
  (S.asAtt || []).map(asParse).filter(x => x && x.id === it.id && x.kind === 'try' && x.d && x.d.m).forEach(x => { o[x.user] = `${x.d.n} / ${x.d.m}`; });
  return o;
}
function asgItemTcHTML(it) {
  if (it.type === 'rankup') return ruItemTcHTML(it);
  const rs = asgResults(S.asAtt || [], S.members || [], it), done = rs.filter(r => r.done).length, mid = rs.filter(r => r.started && !r.done).length, test = ASG_TEST.has(it.type);
  const prog = it.type === 'hr' || it.type === 'pz' ? hrProgress(it) : {};
  const res = r => { if (!r.done) return prog[r.m.user_id] ? `<span class="tag">${esc(prog[r.m.user_id])}</span>` : r.started ? `<span class="tag">${H(it.type === 'read' ? 'as.tc.st.opened' : 'as.tc.st.started')}</span>` : `<span class="muted">${H('as.tc.st.none')}</span>`;
    if (it.type === 'rank' && r.d && r.d.rank) return `<span class="rk-badge sm r-${esc(r.d.rank)}">${esc(r.d.rank)}</span>${r.d.passed ? `<span class="rk-withpass">${H('rk.withPass')}</span>` : ''} <b>${esc(String(r.d.score))}</b>`;
    return `✓ ${r.reason ? `<b>${esc(r.reason)}</b>` : H('as.done')}`; };
  const order = rs.slice().sort((a, b) => (b.done - a.done) || (((b.d && b.d.score) || 0) - ((a.d && a.d.score) || 0)));
  return `<li class="as-item ${it.open === false ? 'closed' : ''}"><details><summary><span class="as-ic">${ASG_ICON[it.type]}</span>
      <span class="as-what"><small class="muted">${H('as.type.' + it.type)} · ${esc(fmtTime(it.at))} · ${H(it.open === false ? 'as.tc.closed' : 'as.tc.open')}</small><b>${asgLabelHTML(it, L())}</b></span>
      <span class="as-count">${H('as.tc.count', { d: done, n: rs.length })}${test && mid ? ` · ${H('as.tc.mid', { n: mid })}` : ''}</span>${asActsHTML(it)}</summary>
    <table class="wtable as-tbl"><tbody>${order.map(r => `<tr class="${r.done ? 'done' : ''}"><th>${esc(r.m.nickname)}</th><td>${res(r)}</td><td class="muted small">${r.at ? esc(fmtTime(r.at)) : ''}</td></tr>`).join('') || `<tr><td class="muted">${H('as.tc.noMembers')}</td></tr>`}</tbody></table></details></li>`;
}
function asgPanelHTML(c) {
  const items = asgList(c);
  return `<section class="card as-tc"><h2>📬 ${H('as.tc.title')}</h2><p class="muted">${H('as.tc.sub')}</p>
    ${tasksInDb(c) ? asgFormHTML() : `<p class="muted small">${H('tc.task.schema')}</p>`}
    ${items.length ? `<ul class="as-list">${items.map(asgItemTcHTML).join('')}</ul>` : `<p class="muted small">${H('as.tc.none')}</p>`}</section>`;
}
async function asgSave(items, msg) {
  const c = S.klass;
  try { S.klass = await backend.updateClass(c.id, { tasks: Object.assign({}, c.tasks || {}, { items }) }); redrawAs(); if (msg) toast(T(msg)); }
  catch (e) { console.error(e); toast(T(tasksInDb(c) ? 'class.netError' : 'tc.task.schema')); }
}

/* ---------- the shape mix as an assignment (型ミックスの課題): in the class row, tasks.mix ----------
 * tasks = { mix: { id, shapes, kind, n, seed, at } } — every student gets the same problems
 * (shapeSlots with the seed); answers come in as problem_id task:<id>:<n>. */
const TDRAFT = 'sqln.taskDraft';
const redrawTask = () => { const el = document.querySelector('.task-card'); if (el && S.klass) el.outerHTML = taskHTML(S.klass); };
const isTaskRow = a => /^task:/.test(a.problem_id || '');
const tasksInDb = c => Object.prototype.hasOwnProperty.call(c, 'tasks');
function taskDraft() {
  const d = Store.get(TDRAFT, null) || {}, kind = SHAPE_KINDS.includes(d.kind) ? d.kind : 'mix', n = Number.isInteger(d.n) && d.n >= 1 && d.n <= 30 ? d.n : 10;
  return { shapes: Array.isArray(d.shapes) ? d.shapes.filter(k => BASIC_BY_KEY[k]) : BASIC_CORE.map(x => x.key), sc: cnt3(d.sc, CMP_CELL) || shapeCountsOf(n, kind) };   // sc: fill-ins, orderings, writing
}
/** what a given task asks: the counts of each kind (older tasks: n of one kind or of all in turn) */
const taskCounts = t => (cnt3(t.cnt, 30) || shapeCountsOf(t.n, t.kind));
const taskCountsH = t => { const c = taskCounts(t); return [['stage.fill', c[0]], ['stage.order', c[1]], ['rv.write', c[2]]].filter(x => x[1]).map(([k, n]) => `${H(k)} ${n}`).join(' · '); };
/** each student's result: { m, ok (problems solved), tried, last } */
function taskRows(t) {
  const pre = `task:${t.id}:`, rows = (S.tAtt || []).filter(a => a.problem_id.startsWith(pre));
  return S.members.map(m => { const mine = rows.filter(a => a.user_id === m.user_id), ok = new Set(mine.filter(a => a.ok).map(a => a.problem_id)), tried = new Set(mine.map(a => a.problem_id));
    return { m, ok: ok.size, tried: tried.size, last: mine.length ? mine[mine.length - 1].created_at : null }; }).sort((a, b) => b.ok - a.ok || b.tried - a.tried);
}
function taskHTML(c) {
  const t = c.tasks && c.tasks.mix, d = taskDraft();
    const now = t ? `<div class="task-now"><div class="task-now-h"><b>📌 ${H('tc.task.now')}</b><span class="muted small">${fmtTime(t.at)} · ${H('tc.task.what', { n: t.n })} · ${taskCountsH(t)}</span>
      <button type="button" class="btn btn-ghost btn-xs" data-act="taskClear">${H('tc.task.clear')}</button></div>
      <div class="q-chips">${t.shapes.filter(k => BASIC_BY_KEY[k]).map(k => `<span class="q-chip">${shapeNameH(k)}</span>`).join('')}</div>
      <div class="q-table-wrap"><table class="q-table task-tbl"><thead><tr><th>${H('class.nickname')}</th><th>${H('tc.task.solved')}</th><th>${H('tc.task.tried')}</th><th>${H('tc.task.last')}</th></tr></thead>
      <tbody>${taskRows(t).map(r => `<tr class="${r.ok >= t.n ? 'done' : ''}"><th>${esc(r.m.nickname)}</th><td><span class="task-bar"><i style="width:${Math.round(r.ok / t.n * 100)}%"></i></span> <b>${r.ok}</b> / ${t.n}${r.ok >= t.n ? ' ✓' : ''}</td><td>${r.tried}</td><td class="muted">${r.last ? fmtTime(r.last) : '—'}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${H('tc.task.noMembers')}</td></tr>`}</tbody></table></div></div>` : '';
  return `<section class="card task-card"><h2>🧱 ${H('tc.task.title')}</h2><p class="muted">${H('tc.task.sub')}</p>
    ${now}
    ${shapePickHTML(d.shapes, 'taskShape')}
    <div class="fld"><span>${H('tc.qs.byKind')}</span>${composeHTML({ act: 'taskCmp', rows: [{ id: '@all', label: H('tc.shape.row'), text: '' }], cols: [['stage.fill', 's1'], ['stage.order', 's2'], ['rv.write', 's3']].map(([k, tone], i) => ({ id: i, label: H(k), tone, text: T(k) })),
      get: (r, i) => d.sc[i], max: CMP_CELL, totalMax: 30, secEach: 40, lang: L(), presets: ['easy', 'even', 'hard'].map(v => ({ v, label: H('dif.p.' + v) })), presetAct: 'taskP', presetOn: presetOf([d.sc], ['easy', 'even', 'hard']), note: H('tc.shape.cmpNote') })}</div>
    <div class="actions"><button type="button" class="btn btn-primary" data-act="taskSave" ${d.shapes.length && sum3(d.sc) ? '' : 'disabled'}>📌 ${H(t ? 'tc.task.replace' : 'tc.task.give')}</button><span class="muted small">${H('tc.task.note')}</span></div>
  </section>`;
}
/* ---------- the class's problem format: how many problems of each kind per lesson ---------- */
const FORMAT_PRESETS = {
  std: STANDARD_FORMAT,
  orderMain: { demo: true, fill: 0, order1: 2, order2: 1, write: 1 },
  orderOnly: { demo: false, fill: 0, order1: 2, order2: 2, write: 0 },
  writeMain: { demo: true, fill: 0, order1: 0, order2: 0, write: 3 }
};
const FMT_LABEL = { fill: 'tc.fmtFill', order1: 'tc.fmtOrder1', order2: 'tc.fmtOrder2', write: 'tc.fmtWrite' };
/* the format being set on the assignment page (saved with the assignment): { cid, f } */
let fmtD = null;
const fmtOf = c => { if (!fmtD || fmtD.cid !== c.id) fmtD = { cid: c.id, f: Object.assign({ dif: 0 }, normFormat(c.format) || STANDARD_FORMAT) }; return fmtD.f; };
const redrawFormat = () => { const el = document.querySelector('.fmt-fld'); if (el && S.klass) el.outerHTML = formatFieldHTML(S.klass); };
const FMT_TONE = { fill: 's1', order1: 's2', order2: 's2', write: 's3' };
function formatFieldHTML(c) {
  const f = fmtOf(c), dif = f.dif || 0;
  const table = composeHTML({ act: 'fmtCmp', rows: [{ id: 'n', label: `${H('tc.fmt.perLesson')}${f.demo ? `<small>＋ ${H('tc.fmtDemo')}</small>` : ''}`, text: '' }],
    cols: FORMAT_KEYS.map(k => ({ id: k, label: H(FMT_LABEL[k]), tone: FMT_TONE[k], text: T(FMT_LABEL[k]) })), get: (r, k) => f[k], max: FORMAT_MAX, lang: L(), hideTotal: true,
    presets: Object.keys(FORMAT_PRESETS).map(k => ({ v: k, label: H('tc.fmtP.' + k) })), presetAct: 'fmtPreset',
    presetOn: Object.keys(FORMAT_PRESETS).find(k => FORMAT_KEYS.every(x => FORMAT_PRESETS[k][x] === f[x]) && FORMAT_PRESETS[k].demo === f.demo) || null });
  return `<div class="fld fmt-fld"><span>${H('tc.format')}</span><small class="muted">${H('tc.formatTip')}</small>
    <button type="button" class="fmt-demo-b ${f.demo ? 'on' : ''}" data-act="fmtDemo" aria-pressed="${f.demo}"><i>${f.demo ? '✓' : ''}</i>${H('tc.fmtDemo')}</button>
    ${table}
    <div class="fmt-dif"><b class="small">${H('dif.title')}</b><div class="seg">${[0, 1, 2, 3, 4].map(v => `<button type="button" class="seg-b ${dif === v ? 'on' : ''} ${v && v < 4 ? 'd' + v : ''}" data-act="fmtDif" data-v="${v}" aria-pressed="${dif === v}">${H(v === 4 ? 'dif.rise' : 'dif.' + (v || 'any'))}</button>`).join('')}</div>
      <small class="muted">${H(dif === 4 ? 'tc.fmt.riseNote' : dif ? 'dif.note' : 'tc.fmt.anyNote')}</small></div>
    <p class="fmt-sum" id="fmt-sum">${formatSummary(f)}</p>
    <small class="muted">${H('tc.fmtNote')}</small></div>`;
}
function readFormat() { return Object.assign({}, fmtD ? fmtD.f : STANDARD_FORMAT); }
function formatSummary(f) {
  const n = stagesFor(LESSON_BY_KEY.where, f).length;
  const parts = [f.demo ? T('tc.fmtDemo') : null, ...FORMAT_KEYS.filter(k => f[k]).map(k => `${T(FMT_LABEL[k])} ×${f[k]}`)].filter(Boolean);
  return `${H('tc.fmtTotal', { n })}<span class="muted"> = ${esc(parts.join(' ＋ '))}${f.dif ? ` · ${esc(T(f.dif === 4 ? 'dif.rise' : 'dif.' + f.dif))}` : ''}</span>`;
}

function stageName(p) { return (p.stage === 'write' || p.stage === 'quiz' ? T('stage.' + p.stage, { n: p.wn }) : p.stage === 'order' && p.of > 1 ? T('stage.orderN', { n: p.wn }) : T('stage.' + p.stage)) + (p.stage === 'order' && p.level === 2 && p.fmt ? ' · ' + T('drill.lv2') : ''); }
function stageNameH(p) { if (p.abs) return `${H('bs.f.abs')}・${shapeKindH(p.af)}`; return (p.stage === 'write' || p.stage === 'quiz' ? H('stage.' + p.stage, { n: p.wn }) : p.stage === 'order' && p.of > 1 ? H('stage.orderN', { n: p.wn }) : H('stage.' + p.stage)) + (p.stage === 'order' && p.level === 2 && p.fmt ? ' · ' + H('drill.lv2') : p.stage === 'order' && p.test && p.level ? ` · ${H(p.level === 2 ? 'drill.lv2' : 'drill.lv1')}` : ''); }
const isQuiz = p => p.answer !== undefined || (LESSON_BY_KEY[p.lesson] || {}).kind === 'quiz';
/** the answer of a problem: SQL, or the value for Lesson 0 */
const answerHTML = p => (isQuiz(p) ? `<p class="quiz-ans">${answerTextHTML(p, L())}</p>` : `<pre class="sql">${highlightSQL(p.sql)}</pre>${altsHTML(p)}`);
/** other correct answers (別解), closed */
function altsHTML(p) {
  const alts = altAnswers(S.engine, p);
  return !alts.length ? '' : `<details class="alts"><summary>${H('alt.more', { n: alts.length })}</summary>${alts.map(a => `<div class="alt"><p class="alt-note">${H('alt.' + a.rule)}</p><pre class="sql">${highlightSQL(a.sql)}</pre></div>`).join('')}</details>`;
}

/* live grid: members × problems of the assigned lessons */
function classProblems(c) {
  return (c.lessons || []).filter(k => LESSON_BY_KEY[k]).map(k => ({ lesson: LESSON_BY_KEY[k], probs: S.engine.lessonProblems(LESSON_BY_KEY[k], c.set_code, c.format) }));
}
/** a student's answers to a problem after their first right answer are “looking back”: not counted as mistakes or tries */
function isReview(a) { return reviewIds().has(a.id); }
let reviewCache = { n: -1, ids: new Set() };
function reviewIds() {
  if (reviewCache.n === S.attempts.length) return reviewCache.ids;
  const first = new Map(), ids = new Set();
  S.attempts.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : (a.id || 0) - (b.id || 0))).forEach(a => {
    const k = a.user_id + '|' + a.problem_id;
    if (first.has(k)) ids.add(a.id); else if (a.ok) first.set(k, true);
  });
  reviewCache = { n: S.attempts.length, ids };
  return ids;
}
const countable = atts => atts.filter(a => !isReview(a));
function visibleAttempts() {
  if (!S.liveOnlyToday) return S.attempts;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return S.attempts.filter(a => new Date(a.created_at) >= d);
}
const IDLE_MS = 5 * 60000;   // no answer for 5 minutes → "idle"
/** per student: time of the last answer (in the shown attempts) and the problem they are on now */
function activity(all, atts) {
  const last = new Map(), latest = new Map();
  atts.forEach(a => { const t = new Date(a.created_at).getTime(); if (!last.has(a.user_id) || t >= last.get(a.user_id)) { last.set(a.user_id, t); latest.set(a.user_id, a); } });
  const solved = new Set(atts.filter(a => a.ok).map(a => a.user_id + '|' + a.problem_id));
  const cur = new Map();
  latest.forEach((a, u) => {
    if (Date.now() - new Date(a.created_at) > NOW_MS) return;
    let i = all.findIndex(p => p.id === a.problem_id);
    if (i < 0) return;
    if (a.ok) { i = all.findIndex((p, j) => j > i && !solved.has(u + '|' + p.id)); if (i < 0) return; }   // solved it: on the next unsolved problem
    cur.set(u, all[i].id);
  });
  return { last, cur, state: (u, finished) => { const t = last.get(u); if (!t) return { kind: 'none' }; const ms = Date.now() - t; return ms < IDLE_MS ? { kind: 'active' } : finished ? { kind: 'done' } : { kind: 'idle', min: Math.floor(ms / 60000) }; } };
}
/** the name cell: active dot or idle badge; opens the student's answers */
function whoHTML(m, st) {
  const badge = st.kind === 'active' ? '<i class="live-dot" title="active"></i>' : '';
  const idle = st.kind === 'idle' && st.min < 90 ? `<span class="idle-b" title="${esc(T('tc.idleTip'))}">⏸ ${H('tc.idle', { n: st.min })}</span>` : '';
  return `<button class="who-btn ${st.kind === 'idle' && st.min < 90 ? 'idle' : ''}" data-act="openStudent" data-u="${esc(m.user_id)}" title="${esc(T('tc.stuOpen'))}">${badge}<span>${esc(m.nickname)}</span>${idle}</button>`;
}
function liveHTML(c) {
  const groups = classProblems(c);
  if (!groups.length) return `<section class="card empty"><p>${H('tc.noLessons')}</p><a class="btn btn-primary" href="#/c/${c.id}/send">${H('tc.sendLessons')}</a></section>`;
  const atts = countable(visibleAttempts());
  const cell = {}; // user|problem → {ok, n}
  atts.forEach(a => { const k = a.user_id + '|' + a.problem_id; const x = cell[k] || (cell[k] = { ok: false, n: 0, onTime: false }); if (a.ok) { x.ok = true; if (!a.late) x.onTime = true; } else x.n++; });
  const all = groups.flatMap(g => g.probs);
  const solvedBy = p => S.members.filter(m => (cell[m.user_id + '|' + p.id] || {}).ok).length;
  const act = activity(all, visibleAttempts());   // looking back also counts as being active
  const doneOf = m => all.filter(p => (cell[m.user_id + '|' + p.id] || {}).ok).length;
  const members = S.liveSort === 'progress' ? S.members.slice().sort((a, b) => doneOf(b) - doneOf(a)) : S.members;
  const rows = members.map(m => {
    const done = doneOf(m);
    const st = act.state(m.user_id, done === all.length), cur = act.cur.get(m.user_id);
    return `<tr class="${st.kind === 'idle' && st.min < 90 ? 'idle' : ''}"><th class="who">${whoHTML(m, st)}</th><td class="n sum">${done}/${all.length}</td>${groups.map(g => g.probs.map(p => {
      const x = cell[m.user_id + '|' + p.id];
      const late = x && x.ok && !x.onTime;   // solved only after the timer ended
      const cls = (!x ? '' : late ? 'ok late' : x.ok ? 'ok' : 'bad') + (cur === p.id ? ' cur' : '');
      return `<td class="lc ${cls} ${p.idx === 0 ? 'first' : ''}" title="${esc(stageName(p) + (late ? ' · ' + T('tc.late') : '') + (cur === p.id ? ' · ' + T('tc.cur') : ''))}">${!x ? '' : x.ok ? (late ? '⏱' : '✓') : x.n}</td>`;
    }).join('')).join('')}</tr>`;
  }).join('');
  const n = S.members.length || 1;
  const stats = problemStats(all, atts);
  const nowOn = new Map(stats.map(x => [x.p.id, x.now]));
  return `${rankHTML(groups, stats)}<section class="card live">
    <div class="live-bar"><label class="chk"><input type="checkbox" data-act2="today" ${S.liveOnlyToday ? 'checked' : ''}><span>${H('tc.todayOnly')}</span></label>
      <div class="seg">${segBtn('liveSort', 'name', 'tc.sortName')}${segBtn('liveSort', 'progress', 'tc.sortProgress')}</div>
      <span class="muted small">${I.bolt} ${H('tc.liveNote')}</span><button class="btn btn-ghost btn-xs" data-act="reload">${I.reset}${H('tc.reload')}</button></div>
    <div class="live-scroll" data-keep="live"><table class="live-grid">
      <thead><tr><th rowspan="2" class="corner"></th><th rowspan="2" class="n">✓</th>${groups.map(g => `<th colspan="${g.probs.length}" class="lg-h" title="${esc(lessonTitle(g.lesson, L()))}">${g.lesson.no}. ${lessonTitleHTML(g.lesson, L())}</th>`).join('')}</tr>
      <tr>${groups.map(g => g.probs.map(p => { const k = nowOn.get(p.id) || 0; return `<th class="pcol ${p.idx === 0 ? 'first' : ''}"><button data-act="openMistakes" data-p="${p.id}" title="${esc(stageName(p) + (k ? ' · ' + T('tc.colNow') + ' ' + k : ''))}">${colLabel(p)}${k ? `<i class="now-n">${k}</i>` : ''}</button></th>`; }).join('')).join('')}</tr></thead>
      <tbody>${rows || `<tr><td colspan="99" class="res-empty">${H('tc.noMembers')}</td></tr>`}</tbody>
      <tfoot><tr><th>${H('tc.rate')}</th><td></td>${all.map(p => { const r = Math.round(solvedBy(p) / n * 100); return `<td class="rate ${p.idx === 0 ? 'first' : ''}"><span style="--r:${r}%">${S.members.length ? r + '%' : ''}</span></td>`; }).join('')}</tr></tfoot>
    </table></div>
    <p class="muted small legend-line"><span class="lc ok">✓</span> ${H('tc.legendOk')} <span class="lc bad">2</span> ${H('tc.legendBad')} <span class="lc ok late">⏱</span> ${H('tc.late')} <span class="lc cur"></span> ${H('tc.cur')} <span class="idle-b">⏸</span> ${H('tc.idleTip')} · Ex = ${H('stage.demo')} · □ = ${H('stage.fill')} · ⇅ = ${H('stage.order')} · W = ${H('stage.write', { n: '' }).trim()}</p>
  </section>`;
}

const colLabel = p => (p.stage === 'demo' ? 'Ex' : p.stage === 'fill' ? '□' : p.stage === 'order' ? '⇅' + (p.of > 1 ? p.wn : '') : (p.stage === 'quiz' ? 'Q' : 'W') + p.wn);
const NOW_MS = 10 * 60000;   // "now" = the last 10 minutes
/** per problem: students stuck (wrong, not solved), wrong answers, students on it now, students who solved it */
function problemStats(all, atts) {
  const since = Date.now() - NOW_MS;
  const recent = atts.filter(a => new Date(a.created_at).getTime() >= since);
  const latest = new Map();   // each student's latest attempt in the last 10 minutes → the problem they are on now
  recent.forEach(a => { const x = latest.get(a.user_id); if (!x || a.created_at >= x.created_at) latest.set(a.user_id, a); });
  const win = S.rankWindow === 'now' ? recent : atts;
  return all.map(p => {
    const mine = atts.filter(a => a.problem_id === p.id);
    const solved = new Set(mine.filter(a => a.ok).map(a => a.user_id));
    const w = win.filter(a => a.problem_id === p.id && !a.ok);
    return { p, solved: solved.size, wrong: w.length, stuck: new Set(w.filter(a => !solved.has(a.user_id)).map(a => a.user_id)).size,
      now: [...latest.values()].filter(a => a.problem_id === p.id && !(a.ok && solved.has(a.user_id))).length };
  });
}
/* which problems students are stuck on, sorted */
function rankHTML(groups, stats) {
  const key = S.rankSort;
  const list = stats.filter(x => (key === 'now' ? x.now : x.wrong) > 0)
    .sort((a, b) => b[key] - a[key] || b.stuck - a.stuck || b.wrong - a.wrong || b.now - a.now).slice(0, 8);
  const lessonOf = p => groups.find(g => g.lesson.key === p.lesson).lesson;
  const max = Math.max(1, ...list.map(x => x[key]));
  const seg = segBtn;
  const rows = list.map((x, i) => `<li>
      <span class="rk-n">${i + 1}</span>
      <div class="rk-what"><b>Lesson ${lessonOf(x.p).no} · ${esc(stageName(x.p))}</b><small class="muted">${lessonTitleHTML(lessonOf(x.p), L())} · ${esc(x.p.stage === 'demo' ? T('stage.demoSub') : themeName(x.p, L()))}</small></div>
      <div class="rk-bar"><i style="width:${Math.round(x[key] / max * 100)}%"></i></div>
      <span class="rk-v ${key === 'stuck' ? 'on' : ''}" title="${esc(T('tc.colStuck'))}"><b>${x.stuck}</b><small>${H('tc.colStuck')}</small></span>
      <span class="rk-v ${key === 'wrong' ? 'on' : ''}" title="${esc(T('tc.colWrong'))}"><b>${x.wrong}</b><small>${H('tc.colWrong')}</small></span>
      <span class="rk-v ${key === 'now' ? 'on' : ''}" title="${esc(T('tc.nowTip'))}"><b>${x.now}</b><small>${H('tc.colNow')}</small></span>
      <span class="rk-v ok"><b>${x.solved}</b><small>${H('tc.colSolved')}</small></span>
      <button class="btn btn-ghost btn-xs" data-act="openMistakes" data-p="${x.p.id}">${I.eye}${H('tc.seeMistakes')}</button>
    </li>`).join('');
  return `<details class="card rank" ${S.rankOpen ? 'open' : ''} data-toggle="rankOpen">
    <summary><h2>${H('tc.rank')}</h2>${list.length ? `<span class="rk-count">${H('tc.rankCount', { n: list.length })}</span>` : ''}<span class="muted small rk-sub">${H('tc.rankSub')}</span></summary>
    <div class="rk-head">
      <div class="rk-ctl"><div class="seg">${seg('rankWindow', 'now', 'tc.rankNow')}${seg('rankWindow', 'all', 'tc.rankAll')}</div>
        <div class="seg">${seg('rankSort', 'stuck', 'tc.sortStuck')}${seg('rankSort', 'wrong', 'tc.sortWrong')}${seg('rankSort', 'now', 'tc.sortNow')}</div></div></div>
    ${rows ? `<ol class="rk-list">${rows}</ol>` : `<p class="res-empty">${H('tc.rankEmpty')}</p>`}
  </details>`;
}
// "now" changes as time passes: redraw the live tab every 30 seconds
setInterval(() => { if (S.route && S.route.view === 'class' && ['live', 'board'].includes(S.route.tab) && (!document.querySelector('.modal') || document.querySelector('#modal .board.big'))) refreshTab(); }, 30000);

/** a button of a segmented control that sets S[name] */
const segBtn = (name, val, label, vars) => `<button class="${S[name] === val ? 'on' : ''}" data-act="rankSet" data-k="${name}" data-v="${val}">${H(label, vars)}</button>`;

/* ---------- progress ranking: students by problems solved ---------- */
/** per student: solved, first-try, solved in the last 10 minutes, finished lessons, time of the last first solve */
function boardRows(c) {
  const groups = classProblems(c);
  const ids = new Set(groups.flatMap(g => g.probs.map(p => p.id)));
  const atts = visibleAttempts().filter(a => ids.has(a.problem_id)).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const since = Date.now() - NOW_MS;
  return S.members.map(m => {
    const mine = atts.filter(a => a.user_id === m.user_id);
    const firstSolve = new Map(), tried = new Map();
    mine.forEach(a => { if (!tried.has(a.problem_id)) tried.set(a.problem_id, a); if (a.ok && !firstSolve.has(a.problem_id)) firstSolve.set(a.problem_id, a); });
    const times = [...firstSolve.values()].map(a => new Date(a.created_at).getTime());
    return {
      m, total: ids.size, solved: firstSolve.size,
      first: [...firstSolve.keys()].filter(id => tried.get(id).ok).length,
      recent: times.filter(t => t >= since).length,
      lessons: groups.filter(g => g.probs.every(p => firstSolve.has(p.id))).length,
      last: times.length ? Math.max(...times) : null,
      active: mine.some(a => Date.now() - new Date(a.created_at) < IDLE_MS),
      idle: mine.length && firstSolve.size < ids.size ? Math.floor((Date.now() - new Date(mine[mine.length - 1].created_at)) / 60000) : null
    };
  });
}
/** sort and give ranks: with the same number, whoever reached it first is higher; only exact ties (or nothing yet) share a rank */
function rankBoard(rows, by) {
  const list = rows.slice().sort((a, b) => b[by] - a[by] || b.solved - a.solved || (a.last || Infinity) - (b.last || Infinity) || a.m.nickname.localeCompare(b.m.nickname));
  const same = (x, y) => x[by] === y[by] && x.solved === y.solved && x.last === y.last;
  let rank = 0;
  list.forEach((r, i) => { rank = i && same(list[i - 1], r) ? rank : i + 1; r.rank = rank; });
  return list;
}
const MEDAL = ['🥇', '🥈', '🥉'];
function agoHTML(t) {
  if (!t) return '—';
  const min = Math.floor((Date.now() - t) / 60000);
  return min < 1 ? H('tc.rkJustNow') : min < 60 ? H('tc.rkMinAgo', { n: min }) : esc(fmtTime(new Date(t).toISOString()));
}
/** nickname for the projector: hidden as the first letter + ＊＊ when the teacher chose so */
const shownName = (n, big) => (big && S.boardHide ? [...n][0] + '＊＊' : n);
function boardListHTML(list, by, big) {
  return `<ol class="board ${big ? 'big' : ''}">${list.map(r => {
    const pct = r.total ? Math.round(r.solved / r.total * 100) : 0;
    return `<li class="${r.rank <= 3 && r[by] > 0 ? 'top top' + r.rank : ''}">
      <span class="bd-rank">${r.rank <= 3 && r[by] > 0 ? MEDAL[r.rank - 1] : r.rank}</span>
      <span class="bd-name">${r.active ? '<i class="live-dot"></i>' : ''}${big ? esc(shownName(r.m.nickname, big)) : `<button class="who-btn" data-act="openStudent" data-u="${esc(r.m.user_id)}">${esc(r.m.nickname)}</button>${r.idle != null && r.idle >= 5 && r.idle < 90 ? `<span class="idle-b" title="${esc(T('tc.idleTip'))}">⏸ ${H('tc.idle', { n: r.idle })}</span>` : ''}`}</span>
      <span class="bd-bar" title="${r.solved}/${r.total}"><i style="width:${pct}%"></i><b>${r.solved}/${r.total}</b></span>
      <span class="bd-v ${by === 'solved' ? 'on' : ''}"><b>${r.solved}</b><small>${H('tc.rkBySolved')}</small></span>
      <span class="bd-v ${by === 'first' ? 'on' : ''}" title="${esc(T('tc.rkFirstTip'))}"><b>${r.first}</b><small>${H('tc.rkByFirst')}</small></span>
      <span class="bd-v ${by === 'recent' ? 'on' : ''}"><b>${r.recent}</b><small>${H('tc.rkByRecent')}</small></span>
      ${big ? '' : `<span class="bd-v"><b>${r.lessons}</b><small>${H('tc.rkLessons')}</small></span><span class="bd-last muted small">${agoHTML(r.last)}</span>`}
    </li>`;
  }).join('')}</ol>`;
}
function boardHTML(c) {
  if (!classProblems(c).length) return `<section class="card empty"><p>${H('tc.noLessons')}</p><a class="btn btn-primary" href="#/c/${c.id}/send">${H('tc.sendLessons')}</a></section>${rkTotalHTML(c)}`;
  const by = S.boardBy;
  const list = rankBoard(boardRows(c), by);
  return `<section class="card board-card">
    <div class="rk-head"><div><h2>${H('tc.rkTitle')}</h2><p class="muted small">${H('tc.rkSub')}</p></div>
      <div class="rk-ctl"><div class="seg">${segBtn('boardBy', 'solved', 'tc.rkBySolved')}${segBtn('boardBy', 'first', 'tc.rkByFirst')}${segBtn('boardBy', 'recent', 'tc.rkByRecent')}</div>
        <label class="chk"><input type="checkbox" data-act2="today" ${S.liveOnlyToday ? 'checked' : ''}><span>${H('tc.todayOnly')}</span></label>
      </div></div>
    <div class="bd-proj"><b class="small">${I.screen} ${H('tc.rkProjOpts')}</b>
      <div class="seg">${['all', '10', '5', '3'].map(v => segBtn('boardTop', v, v === 'all' ? 'tc.rkTopAll' : 'tc.rkTopN', v === 'all' ? null : { n: v })).join('')}</div>
      <label class="chk"><input type="checkbox" data-act2="boardHide" ${S.boardHide ? 'checked' : ''}><span>${H('tc.rkHide')}</span></label>
      <button class="btn btn-primary btn-sm" data-act="projectBoard">${I.screen}${H('tc.project')}</button></div>
    ${S.members.length ? boardListHTML(list, by, false) : `<p class="res-empty">${H('tc.noMembers')}</p>`}
  </section>${rkTotalHTML(c)}`;
}
/** 総合ランキング of the rank tests: this class (from its own rows), or every class (rank_total; others shown as M******) */
const rkTot = { scope: 'class', all: undefined, at: 0, cid: null };
function rkTotalHTML(c) {
  if (rkTot.cid !== c.id) Object.assign(rkTot, { all: undefined, at: 0, cid: c.id });
  const all = rkTot.scope === 'all';
  if (all && rkTot.all !== 'loading' && (rkTot.all === undefined || Date.now() - rkTot.at > 30000)) {
    rkTot.all = 'loading';
    backend.rankTotal(c.id, true).then(r => { rkTot.all = r; }, () => { rkTot.all = null; }).then(() => { rkTot.at = Date.now(); if (S.route.tab === 'board') refreshTab(); });
  }
  const rows = all ? rkTot.all : classTotals(S.rkAtt || [], S.members);
  if (rkTot.heroes === undefined || rkTot.heroCid !== c.id) { rkTot.heroes = null; rkTot.heroCid = c.id; backend.classHeroes(c.id).then(r => { rkTot.heroes = new Map((r || []).filter(x => x.hero && x.hero.a).map(x => [x.nickname, x.hero])); if (S.route.tab === 'board') refreshTab(); }, () => {}); }
  const avatar = nick => { const x = rkTot.heroes && rkTot.heroes.get(nick); return x ? heroSVG(x, 28, esc(nick)) : ''; };
  return `<section class="card board-card rk-tcard">${totalBoardHTML(rows === 'loading' || rows === undefined ? [] : rows, { lang: L(), all, act: 'rkScope', teacher: true, avatar, state: rows === 'loading' || rows === undefined ? 'loading' : null })}</section>`;
}

/** the projector list: ranked, cut to the chosen number */
function projected() {
  const list = rankBoard(boardRows(S.klass), S.boardBy);
  return S.boardTop === 'all' ? list : list.slice(0, +S.boardTop);
}

/* ---------- one student's answers, problem by problem ---------- */
const hhmm = iso => { try { return new Date(iso).toLocaleTimeString(htmlLang(L()) === 'my' ? 'en' : htmlLang(L()), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
function studentBodyHTML(u) {
  const groups = classProblems(S.klass);
  const all = groups.flatMap(g => g.probs.map(p => ({ p, lesson: g.lesson })));
  const mine = visibleAttempts().filter(a => a.user_id === u).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (!mine.length) return `<p class="res-empty">${H('tc.stuNone')}</p>`;
  const ids = new Set(all.map(x => x.p.id));
  const solved = all.filter(x => mine.some(a => a.problem_id === x.p.id && a.ok)).length;
  const last = mine[mine.length - 1];
  const tries = list => `<ol class="stu-tries">${list.map(a => `<li class="${a.ok ? 'ok' : 'bad'}"><span class="st-mark">${a.ok ? (a.late ? '⏱' : '✓') : '✗'}</span><span class="st-time mono">${esc(hhmm(a.created_at))}${isReview(a) ? `<small class="rv-tag">${H('tc.review')}</small>` : ''}</span>${a.sql == null ? '' : /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE)\b/i.test(a.sql) ? `<pre class="sql">${highlightSQL(a.sql)}</pre>` : `<span class="quiz-ans">${esc(a.sql)}</span>`}</li>`).join('')}</ol>`;
  const blocks = all.filter(x => mine.some(a => a.problem_id === x.p.id)).map(x => {
    const list = mine.filter(a => a.problem_id === x.p.id);
    return `<section class="stu-prob ${list.some(a => a.ok) ? 'ok' : 'bad'}"><h3>Lesson ${x.lesson.no} · ${esc(stageName(x.p))} <small class="muted">${esc(x.p.stage === 'demo' ? T('stage.demoSub') : themeName(x.p, L()))}</small></h3>
      <details class="stu-q"><summary class="muted small">${H('tc.problem')}</summary><p class="prob-text">${problemHTML(x.p, L())}</p>${answerHTML(x.p)}</details>${tries(list)}</section>`;
  }).join('');
  const other = mine.filter(a => !ids.has(a.problem_id));
  return `<div class="stu-sum"><span><b>${solved}/${all.length}</b> ${H('tc.rkBySolved')}</span><span><b>${mine.length}</b> ${H('tc.stuAnswers')}</span><span>${H('tc.lastActive')} <b>${esc(hhmm(last.created_at))}</b></span></div>
    ${blocks}${other.length ? `<section class="stu-prob"><h3>${H('tc.stuOther')}</h3>${tries(other)}</section>` : ''}`;
}

/** keep what the teacher is looking at while a part of the page is redrawn:
 *  the page scroll, the scroll of boxes marked data-keep, and which data-keep details are open */
function keepView(redraw) {
  const y = window.scrollY;
  const boxes = {}, open = {};
  document.querySelectorAll('[data-keep]').forEach(el => {
    const k = el.dataset.keep;
    if (el.tagName === 'DETAILS') open[k] = el.open;
    else boxes[k] = [el.scrollTop, el.scrollLeft];
  });
  redraw();
  document.querySelectorAll('[data-keep]').forEach(el => {
    const k = el.dataset.keep;
    if (el.tagName === 'DETAILS') { if (k in open) el.open = open[k]; }
    else if (boxes[k]) { el.scrollTop = boxes[k][0]; el.scrollLeft = boxes[k][1]; }
  });
  if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
}

/* common wrong answers, grouped */
function normSql(s) { return String(s || '').replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim(); }
function mistakesHTML(c) {
  const groups = classProblems(c);
  const all = groups.flatMap(g => g.probs);
  if (!all.length) return `<section class="card empty"><p>${H('tc.noLessons')}</p></section>`;
  const atts = countable(visibleAttempts());
  const pid = S.mistakeProb && all.some(p => p.id === S.mistakeProb) ? S.mistakeProb : (all.find(p => atts.some(a => a.problem_id === p.id && !a.ok)) || all[0]).id;
  const prob = all.find(p => p.id === pid);
  const wrong = atts.filter(a => a.problem_id === pid && !a.ok && a.sql);
  const solvedUsers = new Set(atts.filter(a => a.problem_id === pid && a.ok).map(a => a.user_id));
  const triedUsers = new Set(atts.filter(a => a.problem_id === pid).map(a => a.user_id));
  const byText = new Map();
  wrong.forEach(a => { const k = normSql(a.sql); const x = byText.get(k) || { sql: k, n: 0, users: new Set() }; x.n++; x.users.add(a.user_id); byText.set(k, x); });
  const list = [...byText.values()].sort((a, b) => b.users.size - a.users.size || b.n - a.n).slice(0, 12);
  const exp = isQuiz(prob) ? null : S.engine.exec(prob.sql);
  const why = sql => {
    if (isQuiz(prob)) return '';
    let g = null, err = null;
    try { g = grade(S.engine.runUser(sql), exp, prob.ordered, sql); } catch (e) { err = { code: e.code, message: e.message }; }
    const d = diagnose({ sql, error: err, grade: g, prob });
    return d.items.slice(0, 1).map(x => { const v = {}; Object.entries(x.vars || {}).forEach(([k, val]) => { if (typeof val !== 'object') v[k] = `<code>${esc(val)}</code>`; }); return th('dx.' + x.key, L(), v); }).join('');
  };
  return `<section class="card mistakes">
    <div class="mk-head">
      <label class="fld"><span>${H('tc.problem')}</span><select data-act2="mistakeProb">${groups.map(g => `<optgroup label="${esc(lessonTitle(g.lesson, L()))}">${g.probs.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(stageName(p))} — ${esc(p.stage === 'demo' ? T('stage.demoSub') : themeName(p, L()))}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="mk-stats"><b>${solvedUsers.size}</b> ${H('tc.solvedN')} · <b>${triedUsers.size - solvedUsers.size}</b> ${H('tc.stuckN')}</div>
      <button class="btn btn-ghost btn-sm" data-act="projectMistakes">${I.screen}${H('tc.project')}</button>
    </div>
    <div class="mk-prob"><p class="prob-text">${problemHTML(prob, L())}</p><details data-keep="mk-ans"><summary class="muted small">${H('hint.answer')}</summary>${answerHTML(prob)}</details></div>
    <div id="mk-list">${list.length ? `<ol class="mk-list">${list.map(x => `<li><div class="mk-n"><b>${x.users.size}</b><small>${H('tc.people')}</small></div><div class="mk-body">${isQuiz(prob) ? `<p class="quiz-ans bad">${esc(x.sql)}</p>` : `<pre class="sql">${highlightSQL(x.sql)}</pre>`}<p class="mk-why">${why(x.sql)}</p></div></li>`).join('')}</ol>` : `<p class="res-empty">${H('tc.noMistakes')}</p>`}</div>
    <p class="muted small">${H('tc.anonNote')}</p>
  </section>`;
}

/** the student's 4-digit number: set or not, locked after wrong tries; the teacher can give a new one */
function pinCellHTML(m) {
  const p = (S.pins || {})[m.user_id];
  const st = !p ? '' : p.locked ? `<span class="tag bad">🔒 ${H('tc.pinLocked')}</span>` : p.has_pin ? `<span class="tag ok">✓ ${H('tc.pinSet')}</span>` : `<span class="tag">— ${H('tc.pinNone')}</span>`;
  return `${st} <button class="btn btn-ghost btn-xs" data-act="teacherPin" data-u="${esc(m.user_id)}">${H('tc.pinNew')}</button>`;
}
function membersHTML(c) {
  const solved = {};
  S.attempts.filter(a => a.ok).forEach(a => { (solved[a.user_id] = solved[a.user_id] || new Set()).add(a.problem_id); });
  const last = {};
  S.attempts.forEach(a => { last[a.user_id] = a.created_at; });
  const lv = levelsFromLog(S.lvAtt || []), counts = Array.from({ length: LV_MAX + 1 }, (_, i) => S.members.filter(m => lv.has(m.user_id) && lv.get(m.user_id).lv === i).length);
  const lvCell = m => { const x = lv.get(m.user_id); if (!x) return '<span class="muted">—</span>';
    return `<span class="lv-chip">Lv.${x.lv}</span><span class="lv-dots" title="${esc(LV_CHAPTERS.map((k, i) => `${T('ch.' + k).replace(/\{([^|}]+)\|[^}]+\}/g, '$1')}: ${x.prof[i] === null || x.prof[i] === undefined ? '–' : Math.min(LV_PER, x.prof[i]) + '/' + LV_PER}`).join('\n'))}">${LV_CHAPTERS.map((k, i) => `<i class="${i < x.lv || passed(x.prof[i]) ? 'ok' : x.prof[i] === null || x.prof[i] === undefined ? '' : 'bad'}"></i>`).join('')}</span>`; };
  // the rank tests (subject × tier): the class ranking of each test taken, and each student's best ranks
  const nick = Object.fromEntries((S.members || []).map(m => [m.user_id, m.nickname]));
  const tests = RK_CHAPTERS.flatMap(ch => RK_TIERS.map(t => rankKey(ch, t))).filter(k => (S.rkAtt || []).some(a => rankFromRow(a).test === k));
  const boards = Object.fromEntries(tests.map(k => [k, classRanking(S.rkAtt || [], k)]));
  const testName = k => { const t = rankParse(k); return `${rubyHTML(raw('ch.' + t.ch, L()))} · ${H('rk.tierShort.' + t.tier)}`; };
  /** the class's best scores of one test: how many, average, median (to set the rank borders later) */
  const rkStats = rs => { const v = rs.map(r => r.score).sort((x, y) => x - y); if (!v.length) return '';
    const avg = Math.round(v.reduce((x, y) => x + y, 0) / v.length), med = v.length % 2 ? v[(v.length - 1) / 2] : Math.round((v[v.length / 2 - 1] + v[v.length / 2]) / 2);
    return `<p class="muted small rk-stats">${H('rk.statN', { n: v.length })} · ${H('rk.avg')} <b>${avg}</b> · ${H('rk.median')} <b>${med}</b></p>`; };
  const rkCell = m => { const cells = tests.map(k => { const r = boards[k].find(x => x.user === m.user_id); return r ? `<span class="rk-chip"><small>${testName(k)}</small> <span class="rk-badge sm r-${r.rank}">${r.rank}</span>${r.passed ? `<span class="rk-withpass">${H('rk.withPass')}</span>` : ''}</span>` : ''; }).filter(Boolean);
    return cells.length ? cells.join(' ') : '<span class="muted">—</span>'; };
  const board = tests.length ? `<div class="rk-board">${tests.map(k => `<div class="card"><h3>🏅 ${testName(k)}</h3>${rkStats(boards[k])}<ol>${boards[k].map(r => `<li><b>${esc(nick[r.user] || '?')}</b> <span class="rk-badge sm r-${r.rank}">${r.rank}</span>${r.passed ? `<span class="rk-withpass">${H('rk.withPass')}</span>` : ''} ${r.score} ${r.solved != null ? `<small class="muted">○${r.solved} ×${r.misses || 0}${r.passed ? ` –${r.passed}` : ''}</small>` : ''}</li>`).join('')}</ol></div>`).join('')}</div>` : '';
  return `${board ? `<section class="card rk-sec"><h2>${H('rk.board')}</h2><p class="muted small">${H('rk.boardSub')}</p>${board}</section>` : ''}<section class="card members">
    ${lv.size ? `<div class="lv-dist"><b>${H('lv.title')}</b>${counts.map((n, i) => `<span class="${n ? '' : 'zero'}"><small>Lv.${i}</small><b>${n}</b></span>`).join('')}<span class="zero"><small>${H('lv.notTaken')}</small><b>${S.members.filter(m => !lv.has(m.user_id)).length}</b></span></div>` : `<p class="muted small">${H('lv.teacherNote')}</p>`}
    <table class="wtable"><thead><tr><th>${H('class.nickname')}</th><th>${H('lv.title')}</th><th>${H('rk.title')}</th><th>${H('tc.joined')}</th><th>${H('tc.lastActive')}</th><th class="n">${H('home.solved')}</th><th>${H('tc.pin')}</th><th></th></tr></thead>
    <tbody>${S.members.map(m => `<tr><td><b>${esc(m.nickname)}</b></td><td>${lvCell(m)}</td><td class="small">${rkCell(m)}</td><td class="muted small">${esc(fmtTime(m.joined_at))}</td><td class="muted small">${last[m.user_id] ? esc(fmtTime(last[m.user_id])) : '—'}</td><td class="n">${(solved[m.user_id] || new Set()).size}</td>
      <td class="small">${pinCellHTML(m)}</td>
      <td><button class="btn btn-ghost btn-xs" data-act="removeMember" data-u="${m.user_id}">${I.trash}${H('tc.remove')}</button></td></tr>`).join('') || `<tr><td colspan="8" class="res-empty">${H('tc.noMembers')}</td></tr>`}</tbody></table>
    <p class="muted small">${H('tc.pinNote')}</p>
    <div class="danger-zone"><b>${H('tc.danger')}</b>
      <button class="btn btn-ghost btn-sm" data-act="clearAttempts">${I.trash}${H('tc.clearAttempts')}</button>
      <button class="btn btn-danger btn-sm" data-act="deleteClass">${I.trash}${H('tc.deleteClass')}</button></div>
  </section>`;
}
function fmtTime(iso) { try { return new Date(iso).toLocaleString(htmlLang(L()) === 'my' ? 'en' : htmlLang(L()), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }

/* ---------- presenter launcher ---------- */
function presentHTML() {
  document.title = `${T('tc.present')} · SQL Practice`;
  const code = S.klass ? S.klass.set_code : (Store.get(KEYS.set, null) || {}).code || todayCode();
  return `<main class="wrap">
    <h1 class="page-title">${H('tc.present')}</h1><p class="muted">${H('tc.presentSub')}</p>
    <div class="chapters">${CHAPTERS.map(ch => `<article class="card chapter" style="--cc:var(--c-${ch.key})"><div class="chapter-head"><div class="chapter-icon">${esc(ch.icon)}</div><div><h2>${rubyHTML(raw('ch.' + ch.key, L()))}</h2></div></div>
      <ul class="lesson-list">${LESSONS.filter(l => l.ch === ch.key).map(l => `<li><a class="lesson-link" target="_blank" rel="noopener" href="../?present=1&set=${encodeURIComponent(code)}#/l/${l.key}/0"><span class="lesson-num">${l.no}</span><span class="lesson-name">${lessonTitleHTML(l, L())}</span>${I.screen}</a>${hasLecture(l.key) ? `<a class="lec-link" target="_blank" rel="noopener" href="../?present=1#/lecture/${l.key}" title="${esc(T('lec.open'))}">📽</a>` : ''}</li>`).join('')}</ul></article>`).join('')}</div>
  </main>`;
}

/* ---------- paper test (A/B) ---------- */
function testHTML() {
  const o = S.test;
  const radio = (name, val, label) => `<label class="seg-i"><input type="radio" name="${name}" data-tk="${name}" value="${val}" ${String(o[name]) === String(val) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  const panel = `<aside class="card tm-panel">
    <div><h1>${H('test.title')}</h1><p class="muted small">${H('test.sub')}</p></div>
    <label class="fld"><span>${H('test.heading')}</span><input type="text" data-tk="title" value="${esc(o.title)}" placeholder="${esc(t('test.headingDefault', o.tlang))}"></label>
    <label class="fld"><span>${H('test.lang')}</span><select data-tk="tlang">${langOptions(o.tlang)}</select></label>
    <label class="fld"><span>${H('test.second')}</span><select data-tk="bilingual"><option value="">${esc(T('set.secondNone'))}</option>${LANGS.filter(l => l.code !== o.tlang).map(l => `<option value="${l.code}" ${o.bilingual === l.code ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
    <div class="fld"><span>${H('test.lessons')}</span>
      ${S.klass ? `<div class="row-btns left"><button class="btn btn-ghost btn-xs" data-act="testClass">${H('tc.fromClass')}</button></div>` : ''}
      ${lessonPickHTML({ id: 'test', lang: L(), chosen: o.lessons, groups: lessonGroups(LESSONS.filter(l => l.kind !== 'quiz' && !l.noTest), L()) })}</div>
    <div class="fld"><span>${H('test.perLesson')}</span><div class="seg">${radio('per', 1, '1')}${radio('per', 2, '2')}${radio('per', 3, '3')}</div></div>
    <div class="fld"><span>${H('test.types')}</span><div class="tt-pick">${['write', 'predict', 'order', 'fill'].map(k => `<label class="chk"><input type="checkbox" data-tt="${k}" ${testTypes().includes(k) ? 'checked' : ''}><span>${H('test.type' + k[0].toUpperCase() + k.slice(1))}</span></label>`).join('')}</div><small class="muted">${H('test.typesTip')}</small></div>
    <div class="fld"><span>${H('dif.title')}</span><div class="seg">${radio('band', 0, T('dif.any'))}${radio('band', 1, T('dif.1'))}${radio('band', 2, T('dif.2'))}${radio('band', 3, T('dif.3'))}</div></div>
    <label class="fld"><span>${H('test.pts')}</span><div class="inline-form"><input type="number" min="0" max="100" data-tk="pts" value="${o.pts || 0}" style="width:90px"><small class="muted">${H('test.ptsTip')}</small></div></label>
    <div class="fld"><span>${H('test.versions')}</span><div class="seg">${radio('ab', false, T('test.versionA'))}${radio('ab', true, T('test.versionAB'))}</div><small class="muted">${H('test.versionTip')}</small></div>
    <div class="fld"><span>${H('test.options')}</span>
      <label class="chk"><input type="checkbox" data-tk="key" ${o.key ? 'checked' : ''}><span>${H('test.withKey')}</span></label>
      <label class="chk"><input type="checkbox" data-tk="results" ${o.results ? 'checked' : ''} ${o.key ? '' : 'disabled'}><span>${H('test.withResult')}</span></label></div>
    <label class="fld"><span>${H('test.code')}</span><div class="inline-form"><input class="mono" data-tk="code" value="${esc(o.code)}" maxlength="16"><button class="btn btn-ghost btn-sm" data-act="testNewCode">${I.shuffle}${H('test.newCode')}</button></div></label>
    <div class="fld"><span>${H('test.presets')}</span><div class="row-btns left"><button class="btn btn-ghost btn-sm" data-act="testSavePreset">${I.save}${H('test.presetSave')}</button>${(Store.get(KEYS.test + '.presets', []) || []).length ? `<select data-tp="load"><option value="">${esc(T('test.presetLoad'))}</option>${Store.get(KEYS.test + '.presets', []).map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}</select>` : ''}</div></div>
    <div class="tm-print"><button class="btn btn-primary" data-act="print" ${o.lessons.length ? '' : 'disabled'}>${I.print}${H('test.print')}</button><button class="btn btn-ghost" data-act="testTables" ${o.lessons.length ? '' : 'disabled'}>${I.screen}${H('test.project')}</button><div class="muted small center" id="tm-count"></div></div>
  </aside>`;
  return `<main class="wrap"><div class="tm-layout">${panel}<div class="paper-wrap">${paperHTML()}</div></div></main>`;
}
const LETTERS = 'ABCDEFGHIJKL';
const INST = { write: 'test.qWrite', predict: 'test.qPredict', order: 'test.qOrder', fill: 'test.qFill' };
/** the question types chosen (old settings: type write / predict / mix) */
const testTypes = () => { const o = S.test; if (Array.isArray(o.types) && o.types.length) return o.types; return o.type === 'mix' ? ['write', 'predict'] : [o.type || 'write']; };
function paperHTML() {
  const o = S.test;
  if (!o.lessons.length) return `<div class="card res-empty">${H('test.nothing')}</div>`;
  const vers = o.ab ? ['A', 'B'] : ['A'];
  const tests = vers.map(v => S.engine.makeTest({ lessons: o.lessons, per: o.per, types: testTypes(), band: +o.band || 0, code: o.code || 'X', version: v }));
  S.testTables = [...new Set(tests.flatMap(x => x.tables))];
  const out = tests.map((x, k) => sheetsHTML(x, vers[k], o.ab)).join('');
  return out;
}
function sheetsHTML(test, ver, ab) {
  const o = S.test, tl = o.tlang, sec = o.bilingual && o.bilingual !== tl ? o.bilingual : null;
  const P = (k, v) => th(k, tl, v);
  const title = esc(o.title.trim()) || P('test.headingDefault');
  const tag = ab ? ` <span class="ver">${esc(t('test.version', tl, { v: ver }))}</span>` : '';
  const pts = +o.pts || 0;
  const qs = test.questions.map((q, i) => {
    const write = q.qtype === 'write';
    const lines = Math.min(5, Math.max(2, Math.ceil(q.sql.length / 58) + 1));
    const rows = q.result ? q.result.values.length : 3;
    return `<div class="q"><div class="q-head"><span class="q-num">Q${i + 1}.</span><div class="q-body">
      <div class="q-inst">${P(INST[q.qtype])}${pts ? ` <span class="q-pts">(${esc(t('test.ptsEach', tl, { n: pts }))})</span>` : ''}${sec ? ` <span class="q-sec">/ ${th(INST[q.qtype], sec)}</span>` : ''}</div>
      ${q.qtype !== 'predict' ? `<p class="q-text">${problemHTML(q, tl)}</p>${sec ? `<p class="q-en" lang="${htmlLang(sec)}">${problemHTML(q, sec)}</p>` : ''}` : `<div class="q-sql">${esc(q.sql)}</div>`}
      ${q.qtype === 'order' ? `<ol class="pieces">${q.order.chunks.map((c, k) => `<li><b>${LETTERS[k]}</b><code>${esc(c.text)}</code></li>`).join('')}</ol>` : ''}
      ${q.qtype === 'fill' ? `<div class="q-sql fill-sql">${q.fill.parts.map(x => (typeof x === 'string' ? esc(x) : `<span class="blank">(${x.blank + 1})</span>`)).join('')}</div>` : ''}
      <div class="q-meta">${esc(t('test.useTable', tl, { t: q.tables.join(', ') }))}</div>
      ${q.qtype === 'order' ? `<div class="ans order-ans">${q.order.answer.map(() => '<i></i>').join('<span>→</span>')}</div>`
        : q.qtype === 'fill' ? `<div class="ans fill-ans">${q.fill.answers.map((_, k) => `<div><b>(${k + 1})</b><i></i></div>`).join('')}</div>`
        : write ? `<div class="ans lines" style="--h:${lines * 8 + 2}mm"><span class="lab">${P('test.answerSpace')}</span></div>` : `<div class="ans grid-ans" style="--h:${(rows + 2) * 7}mm"><span class="lab">${P('test.answerSpace')}</span></div>`}
    </div></div></div>`;
  }).join('');
  const s1 = `<section class="sheet" lang="${htmlLang(tl)}"><h2>${title}${tag}</h2>
    <div class="meta"><span>${esc(t('test.count', tl, { n: test.questions.length }))}</span><span>${esc(t('set.code', tl))}: ${esc(o.code)}${ab ? '-' + ver : ''}</span></div>
    <div class="idbox"><div>${P('test.class')}</div><div>${P('test.name')}</div><div>${P('test.date')}</div><div>${P('test.score')}${pts ? `<span class="total">/ ${pts * test.questions.length}</span>` : ''}</div></div>${qs}</section>`;
  const tables = test.tables.map(n => { const d = S.engine.tableData(n); return `<div class="${d.columns.length > 4 ? 'wide' : ''}"><h4>${esc(n)}</h4>${gridHTML(d)}</div>`; }).join('');
  const s2 = `<section class="sheet" lang="${htmlLang(tl)}"><h3>${P('test.data')}${tag}</h3><p class="note">${P('test.dataNote')}</p><div class="data-tables">${tables}</div></section>`;
  const s3 = !o.key ? '' : `<section class="sheet" lang="${htmlLang(tl)}"><h3>${P('test.key')}${tag} — ${title}</h3><p class="note">${P('test.keyNote')}</p>
    ${test.questions.map((q, i) => `<div class="key-item"><span class="q-num">Q${i + 1}.</span><div class="q-body">${q.qtype === 'order' ? `<div class="key-order">${q.order.answer.map(id => LETTERS[q.order.chunks.findIndex(c => c.id === id)]).join(' → ')}${q.order.chunks.some(c => c.distractor) ? ` <small>(${esc(t('test.keyUnused', tl, { x: LETTERS[q.order.chunks.findIndex(c => c.distractor)] }))})</small>` : ''}</div>` : ''}${q.qtype === 'fill' ? `<div class="key-order">${q.fill.answers.map((a, k) => `(${k + 1}) <code>${esc(a)}</code>`).join('　')}</div>` : ''}<div class="q-sql">${esc(q.sql)}</div>${q.qtype === 'write' ? altAnswers(S.engine, q, 3).map(a => `<div class="q-alt"><span>${P('alt.title')}:</span> <span class="q-sql">${esc(a.sql)}</span></div>`).join('') : ''}${o.results || q.qtype === 'predict' ? `<div class="res">${gridHTML(q.result)}</div>` : ''}</div></div>`).join('')}</section>`;
  setTimeout(() => { const el = document.getElementById('tm-count'); if (el) el.textContent = `${t('test.count', L(), { n: test.questions.length })}${ab ? ' × 2' : ''} · ${o.code}`; });
  return s1 + s2 + s3;
}
function saveTest() { Store.set(KEYS.test, S.test); }

/* ---------- textbook (PDF) ---------- */
function bookPanelHTML() {
  const cards = TEXTBOOKS.map(b => `<article class="card tb-card ${b.ready ? '' : 'soon'}">
      <div class="tb-cover tb-${b.key}"><span>${b.mark}</span><b>${rubyHTML(raw('book.lv.' + b.key, L()))}</b></div>
      <div class="tb-body"><h2>${H('book.lv.' + b.key)}</h2><p class="muted">${b.range}</p>
        ${b.ready ? `<div class="row-btns left"><a class="btn btn-primary" href="${b.file}" target="_blank" rel="noopener">${I.book}${H('book.open')}</a><a class="btn btn-ghost" href="${b.file}" download>${H('book.download')}</a></div>`
          : `<p class="muted small">${H('book.soon')}</p>`}</div></article>`).join('');
  return `<main class="wrap"><h1 class="page-title">${H('book.panelTitle')}</h1><p class="muted">${H('book.panelSub')}</p>
    <div class="tb-grid">${cards}</div></main>`;
}
let testTimer = null;
function rerenderPaper() { saveTest(); clearTimeout(testTimer); testTimer = setTimeout(() => { const p = document.querySelector('.paper-wrap'); if (p) p.innerHTML = paperHTML(); }, 120); }

/* =========================================================
 * DATA LOADING
 * ========================================================= */
async function load() {
  render();
  if (!S.engine || !backend.enabled) return;
  try {
    S.session = await backend.teacherSession();
    if (!S.session) { S.isTeacher = null; render(); return; }
    if (S.isTeacher !== true) { S.isTeacher = await backend.amITeacher(); if (!S.isTeacher) { render(); return; } }
    const r = S.route;
    if (r.view === 'home' || r.view === 'test' || r.view === 'present') { S.classes = await backend.myClasses(); if (r.view === 'home') S.klass = null; }
    if (r.view === 'class') {
      if (!S.klass || S.klass.id !== r.id) {
        S.klass = null; render();
        const list = await backend.myClasses(); S.classes = list;
        S.klass = list.find(c => c.id === r.id) || null;
        if (!S.klass) { location.hash = '#/'; return; }
        await reloadClassData();
        startWatch();
      }
    }
  } catch (e) { console.error(e); toast(T('class.netError')); }
  render();
}
async function reloadClassData() {
  const c = S.klass;
  const [m, a, p] = await Promise.all([backend.members(c.id), backend.attempts(c.id), backend.pinStatus(c.id).catch(() => [])]);
  S.members = m; S.attempts = a.filter(x => x.stage !== 'quick' && !isLevelRow(x) && !isTaskRow(x) && !isRankRow(x) && !isAsRow(x)); S.rkAtt = a.filter(isRankRow); S.asAtt = a.filter(isAsRow); S.qAtt = a.filter(x => x.stage === 'quick'); S.tAtt = a.filter(isTaskRow); S.lvAtt = a.filter(isLevelRow); S.pins = Object.fromEntries((p || []).map(x => [x.user_id, x]));
}
/* live connection: shown in the class header; when it drops, it reconnects by itself and
 * reloads the answers so nothing sent in the meantime is missed */
let watchGen = 0, retryTimer = null, retryDelay = 3000;
function setConn(st) {
  S.conn = st;
  const el = document.getElementById('conn');
  if (el) el.outerHTML = connHTML();
}
function connHTML() {
  const k = S.conn === 'ok' ? 'ok' : S.conn === 'lost' ? 'lost' : 'connecting';
  return `<span id="conn" class="conn ${k}" title="${esc(T('tc.conn.' + k))}"><i></i>${H('tc.conn.' + k)}${k === 'lost' ? ` <button class="btn btn-ghost btn-xs" data-act="reconnect">${H('tc.conn.retry')}</button>` : ''}</span>`;
}
const soonRefresh = (() => { let pending = null; return () => { clearTimeout(pending); pending = setTimeout(() => { if (S.route.view !== 'class') return; if (['live', 'quick', 'board', 'mistakes', 'members'].includes(S.route.tab)) refreshTab();
    else if (S.route.tab === 'send') { const el = document.querySelector('.task-card'); if (el && S.klass && !el.contains(document.activeElement)) el.outerHTML = taskHTML(S.klass); sendRefresh(); } }, 300); }; })();
async function startWatch() {
  stopWatch();
  clearTimeout(retryTimer);
  syncClock(backend.serverNow);
  const id = S.klass.id, gen = ++watchGen;
  let wasLost = S.conn === 'lost';
  setConn('connecting');
  S.unwatch = await backend.watchDashboard(id, row => { const list = isAsRow(row) ? (S.asAtt = S.asAtt || []) : isRankRow(row) ? (S.rkAtt = S.rkAtt || []) : row.stage === 'quick' ? (S.qAtt = S.qAtt || []) : isTaskRow(row) ? (S.tAtt = S.tAtt || []) : isLevelRow(row) ? (S.lvAtt = S.lvAtt || []) : S.attempts; if (!list.some(a => a.id === row.id)) list.push(row); soonRefresh(); },
    async () => { try { await reloadClassData(); } catch (e) { S.members = await backend.members(id); } soonRefresh(); },   // a student who came back on another device brings their answers along
    async status => {
      if (gen !== watchGen) return;   // an old connection
      if (status === 'SUBSCRIBED') {
        retryDelay = 3000;
        if (wasLost) { try { await reloadClassData(); soonRefresh(); } catch (e) { /* the next try reloads */ } }
        wasLost = false; setConn('ok');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        wasLost = true; setConn('lost');
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => { if (gen === watchGen && S.klass && S.klass.id === id) startWatch(); }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    });
}
function stopWatch() { watchGen++; clearTimeout(retryTimer); if (S.unwatch) { S.unwatch(); S.unwatch = null; } S.conn = 'off'; }
// back online, or back to this tab after a while: reconnect and fetch what was missed
window.addEventListener('online', () => { if (S.klass && S.route.view === 'class') { S.conn = 'lost'; startWatch(); } });
let hiddenAt = 0;
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (S.klass && S.route.view === 'class' && Date.now() - hiddenAt > 60000) { try { await reloadClassData(); soonRefresh(); } catch (e) { /* ignore */ } }
});
let refreshLater = null;
function refreshTab() {
  const el = document.getElementById('tab-body');
  if (!el || !S.klass) return;
  // a menu or field in the tab is in use (for example the problem list is open): redraw when the teacher is done
  const f = document.activeElement;
  if (f && el.contains(f) && /^(SELECT|INPUT|TEXTAREA)$/.test(f.tagName) && f.type !== 'checkbox') {
    clearTimeout(refreshLater); refreshLater = setTimeout(refreshTab, 1500); return;
  }
  const tab = S.route.tab;
  keepView(() => {
    if (tab === 'live') el.innerHTML = liveHTML(S.klass);
    else if (tab === 'board') el.innerHTML = boardHTML(S.klass);
    else if (tab === 'mistakes') el.innerHTML = mistakesHTML(S.klass);
    else if (tab === 'members') el.innerHTML = membersHTML(S.klass);
    else if (tab === 'quick') el.innerHTML = quickHTML(S.klass);
  });
  const big = document.querySelector('#modal .board.big');
  if (big) big.outerHTML = boardListHTML(projected(), S.boardBy, true);
  const stu = document.querySelector('#modal .stu-body');
  if (stu) stu.innerHTML = studentBodyHTML(S.viewStudent);
  const h = document.querySelector('.class-head .muted'); if (h) h.innerHTML = `${H('tc.members', { n: S.members.length })} · ${H('set.code')} <b class="mono">${esc(S.klass.set_code)}</b> · ${H('tc.policy.' + S.klass.answer_policy)}`;
}

/* =========================================================
 * EVENTS
 * ========================================================= */
/** message for a timer error: a missing database update, the network, or the server's own reason */
function timerError(e) {
  if (e.message === 'timer_missing') return T('tc.timerNeedsDb');
  if (!navigator.onLine || e instanceof TypeError) return T('class.netError');
  return `${T('tc.timerFailed')} ${e.message}`;
}
const actions = {
  ...explainActions,
  quickSet(el) {
    const d = quickDraft(S.klass), k = el.dataset.k, v = el.dataset.v;
    if (k === 'mode' && v !== d.mode) {   // keep what was set: the totals become the rows, or the rows add up
      if (v === 'detail') d.grid = spreadGrid(S.engine, d.lessons, d.cnt, d.tb);
      else if (quickTotal(d)) d.cnt = gridToCnt(d);
    }
    if (k === 'n') d.n = +v;
    else if (k === 'sn') { d.sn = +v; d.swaps = {}; }
    else if (k === 'dif') { d.dif = +v; d.swaps = {}; }
    else if (k === 'sk') { d.sk = v; d.swaps = {}; }
    else if (k === 'kind') { d.kind = v; d.swaps = {}; }
    else if (k === 'mode') { d.mode = v; d.swaps = {}; }
    else if (k === 'goal') { d.goal = v; d.swaps = {}; }
    else if (k === 'pass') d.pass = v === '' ? null : +v;
    else if (k === 'limit') d.limitSec = +v * 60;
    else if (k === 'limitBy') { d.limitBy = v; if (v === 'end' && !d.limitEnd) d.limitEnd = clockHM(new Date(nowMs() + (d.limitSec || 300) * 1000 + 60000)); }
    if (k === 'n' || k === 'mode') d.swaps = {};
    saveQDraft(d, k === 'pass' || k === 'limit' || k === 'limitBy'); refreshTab();
  },
  taskShape(el) { const d = taskDraft(); d.shapes = shapeToggle(d.shapes, el.dataset.v); Store.set(TDRAFT, d); redrawTask(); },
  taskSet(el) { const d = taskDraft(); d[el.dataset.k] = el.dataset.k === 'n' ? +el.dataset.v : el.dataset.v; Store.set(TDRAFT, d); redrawTask(); },
  asSend() {
    const it = { id: newAsgId(), type: asD.type, ref: asD.ref, at: Date.now(), open: true };
    if (asD.type === 'check') { const ck = currentCheck(); if (!ck) { toast(T('ck.pickLesson')); return; } Object.assign(it, { ref: ck.code, n: ck.n, limit: Math.max(0, Math.min(180, Math.round(asD.limit) || 0)) }); }
    if (asD.type === 'level') it.ref = '';
    if (asD.type === 'rankup') it.pass = RK_RANKS.includes(asD.pass) ? asD.pass : 'B';
    if (asD.type === 'table') { const x = tableSets(S.engine).find(t => t.key === asD.ref); if (x) it.tables = x.tables; }
    if (asD.type === 'read' && asD.ref === 'url') {
      const u = (document.querySelector('[data-as="url"]') || {}).value || asD.url, ti = (document.querySelector('[data-as="title"]') || {}).value || asD.title;
      if (!okUrl(u)) { toast(T('as.tc.rdBad')); return; }
      Object.assign(it, { url: u.trim(), title: (ti || '').trim().slice(0, 80) || u.trim() });
    }
    { const n = ((document.querySelector('[data-as="note"]') || {}).value || asD.note || '').trim().slice(0, 120); if (n) it.note = n; }
    asD.note = ''; asD.url = ''; asD.title = '';
    asgSave([...asgList(S.klass), it], 'as.tc.sent');
  },
  asOpen(el) { asgSave(asgList(S.klass).map(it => (it.id === el.dataset.id ? Object.assign({}, it, { open: it.open === false }) : it))); },
  asDel(el) { if (!confirm(T('as.tc.delConfirm'))) return; asgSave(asgList(S.klass).filter(it => it.id !== el.dataset.id)); },
  async taskSave(el) {
    const c = S.klass, d = taskDraft(); if (!d.shapes.length) return;
    if (c.tasks && c.tasks.mix && !confirm(T('tc.task.replaceConfirm'))) return;
    el.disabled = true;
    if (!sum3(d.sc)) return;
    const mix = { id: randomCode(5), shapes: d.shapes, cnt: d.sc, kind: 'mix', n: sum3(d.sc), seed: randomCode(4), at: new Date(nowMs()).toISOString() };
    try { S.klass = await backend.updateClass(c.id, { tasks: Object.assign({}, c.tasks || {}, { mix }) }); redrawTask(); toast(T('tc.task.given')); }
    catch (e) { console.error(e); el.disabled = false; toast(T(tasksInDb(c) ? 'class.netError' : 'tc.task.schema')); }
  },
  async lessonsClear() {
    const c = S.klass; if (!(c.lessons || []).length || !confirm(T('tc.send.lessonsClear'))) return;
    try { S.klass = await backend.updateClass(c.id, { lessons: [] }); toast(T('tc.send.taken')); render(); }
    catch (e) { console.error(e); toast(T('class.netError')); }
  },
  sendEdit(el) { asD.type = el.dataset.v; render(); const m = document.querySelector('.snd-make'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  async taskClear() {
    const c = S.klass; if (!c.tasks || !c.tasks.mix || !confirm(T('tc.task.clearConfirm'))) return;
    try { const tasks = Object.assign({}, c.tasks); delete tasks.mix; S.klass = await backend.updateClass(c.id, { tasks: Object.keys(tasks).length ? tasks : null }); redrawTask(); sendRefresh(); toast(T('tc.send.taken')); }
    catch (e) { console.error(e); toast(T('class.netError')); }
  },
  quickCmp(el) {   // one more / one less in a cell of the table (a kind, or a lesson's kind; a difficulty)
    const d = quickDraft(S.klass), b = +el.dataset.c - 1, dd = +el.dataset.d, [k, st] = String(el.dataset.r).split('|');
    const row = d.mode === 'detail' ? (d.grid[k] || {})[st] : d.cnt[k];
    if (!row) return;
    if (dd > 0 && quickTotal(d) >= CMP_TOTAL) return;
    row[b] = Math.max(0, Math.min(d.mode === 'detail' ? CMP_CELL_L : CMP_CELL, row[b] + dd)); d.swaps = {}; saveQDraft(d); refreshTab();
  },
  quickDifP(el) {   // difficulty preset: each row keeps its number of problems, split by the preset
    const d = quickDraft(S.klass), r = DIF_RATIOS[el.dataset.v]; if (!r) return;
    const max = d.mode === 'detail' ? CMP_CELL_L : CMP_CELL;
    if (!quickTotal(d)) { if (d.mode === 'detail') d.lessons.forEach(k => { d.grid[k][kindsOf(k, S.engine, d.tb).includes('write') ? 'write' : kindsOf(k, S.engine, d.tb)[0]] = [1, 0, 0]; }); else d.cnt.write = [3, 0, 0]; }
    quickRows(d).forEach(row => { const n = sum3(row); if (n) splitBy(n, r).forEach((x, i) => { row[i] = Math.min(max, x); }); });
    d.swaps = {}; saveQDraft(d); refreshTab();
  },
  quickKindP(el) {   // kind preset: the same number of problems (and the same mix of difficulties), split over the kinds
    const d = quickDraft(S.klass), kr = KIND_RATIOS[el.dataset.v]; if (!kr) return;
    const fill = (obj, kinds, n, max) => {
      const cols = kinds.reduce((a, st) => a.map((x, i) => x + obj[st][i]), [0, 0, 0]), cr = sum3(cols) ? cols : [1, 1, 1];
      const r = kinds.map(st => kr[QK.indexOf(st)]); if (!r.some(Boolean)) return;
      const tot = splitBy(n, r);
      QK.forEach(st => { obj[st] = [0, 0, 0]; });
      kinds.forEach((st, i) => { obj[st] = splitBy(tot[i], cr).map(x => Math.min(max, x)); });
    };
    if (d.mode === 'detail') d.lessons.forEach(k => { const ks = kindsOf(k, S.engine, d.tb); fill(d.grid[k], ks, ks.reduce((a, st) => a + sum3(d.grid[k][st]), 0) || 1, CMP_CELL_L); });
    else fill(d.cnt, kindsIn(d), quickTotal(d) || 3, CMP_CELL);
    d.swaps = {}; saveQDraft(d); refreshTab();
  },
  quickShCmp(el) { const d = quickDraft(S.klass), i = +el.dataset.c; if (+el.dataset.d > 0 && sum3(d.sc) >= 30) return; d.sc[i] = Math.max(0, Math.min(CMP_CELL, d.sc[i] + +el.dataset.d)); d.swaps = {}; saveQDraft(d); refreshTab(); },
  quickShP(el) { const d = quickDraft(S.klass), r = DIF_RATIOS[el.dataset.v]; if (!r) return; d.sc = splitBy(sum3(d.sc) || 5, r).map(x => Math.min(CMP_CELL, x)); d.swaps = {}; saveQDraft(d); refreshTab(); },
  taskCmp(el) { const d = taskDraft(), i = +el.dataset.c; if (+el.dataset.d > 0 && sum3(d.sc) >= 30) return; d.sc[i] = Math.max(0, Math.min(CMP_CELL, d.sc[i] + +el.dataset.d)); Store.set(TDRAFT, d); redrawTask(); },
  taskP(el) { const d = taskDraft(), r = DIF_RATIOS[el.dataset.v]; if (!r) return; d.sc = splitBy(sum3(d.sc) || 10, r).map(x => Math.min(CMP_CELL, x)); Store.set(TDRAFT, d); redrawTask(); },
  quickShape(el) { const d = quickDraft(S.klass); d.shapes = shapeToggle(d.shapes, el.dataset.v); d.swaps = {}; saveQDraft(d); refreshTab(); },
  quickLv(el) {   // the chapters of a level test
    const d = quickDraft(S.klass), v = el.dataset.v;
    if (v === 'all') d.lv = d.lv.length === LV_MAX ? [] : LV_CHAPTERS.map((c, i) => i);
    else { const i = +v; d.lv = d.lv.includes(i) ? d.lv.filter(x => x !== i) : [...d.lv, i].sort((a, b) => a - b); }
    d.swaps = {}; saveQDraft(d); refreshTab();
  },
  quickChapter(el) {   // a whole chapter on or off ('' = none)
    const d = quickDraft(S.klass), v = el.dataset.v;
    if (!v) d.lessons = [];
    else if (v === '@assign') { const order = checkLessons().map(l => l.key), asg = new Set(S.klass.lessons || []); d.lessons = order.filter(k => asg.has(k)); }
    else {
      const ks = v === '@py' ? PD_LESSONS.map(l => l.key) : checkLessons().filter(l => l.ch === v).map(l => l.key), on = ks.every(k => d.lessons.includes(k));
      d.lessons = on ? d.lessons.filter(k => !ks.includes(k)) : [...d.lessons, ...ks.filter(k => !d.lessons.includes(k))];   // added at the end: the order of the clicks
    }
    d.swaps = {}; saveQDraft(d); refreshTab();
  },
  quickLesson(el) {   // one lesson on / off
    const d = quickDraft(S.klass), k = el.dataset.l;
    d.lessons = d.lessons.includes(k) ? d.lessons.filter(x => x !== k) : [...d.lessons, k]; d.swaps = {}; saveQDraft(d); refreshTab();   // in the order of the clicks
  },
  quickDrop(el) { const d = quickDraft(S.klass); d.lessons = d.lessons.filter(k => k !== el.dataset.l); d.swaps = {}; saveQDraft(d); refreshTab(); },
  quickPer(el) {
    const d = quickDraft(S.klass), row = d.per[el.dataset.l]; if (!row) return;
    row[el.dataset.st] = Math.max(0, Math.min(FORMAT_MAX, row[el.dataset.st] + +el.dataset.d)); d.swaps = {};
    saveQDraft(d); refreshTab();
  },
  quickAll(el) {   // every chosen lesson: one of this kind (or clear)
    const d = quickDraft(S.klass), st = el.dataset.st;
    d.lessons.forEach(k => { KINDS.forEach(x => { if (!st) d.per[k][x] = 0; }); if (st && kindsOf(k, S.engine, d.tb).includes(st)) d.per[k][st] = Math.max(1, d.per[k][st]); });
    d.swaps = {}; saveQDraft(d); refreshTab();
  },
  quickSwap(el) {
    const d = quickDraft(S.klass), slots = draftSlots(d), j = +el.dataset.k, i = nextFree(S.engine, slots, j, d.seed, d.goal === 'shape' ? '' : d.tb);
    if (i === null) return;
    const b = d.goal === 'level' && !d.fixed ? j : draftPerm(d, draftBase(d))[j];   // the swap belongs to the problem, wherever it was dragged
    d.swaps = Object.assign({}, d.swaps, { [b]: i }); saveQDraft(d, true); refreshTab();
  },
  quickClearAll() {   // everything out at once: the lessons (shapes, chapters) and the order
    const d = quickDraft(S.klass);
    if (!confirm(T('tc.qs.clearConfirm'))) return;
    if (d.goal === 'shape') d.shapes = []; else if (d.goal === 'level') d.lv = []; else d.lessons = [];
    Object.assign(d, { swaps: {}, perm: null, permKey: null, fixed: null }); saveQDraft(d); refreshTab();
  },
  quickReshuffle() { const d = quickDraft(S.klass); d.seed = randomCode(4); d.swaps = {}; saveQDraft(d); refreshTab(); },
  async quickStart(el) {
    const d = quickDraft(S.klass), slots = draftSlots(d);
    if (!slots.length) return;
    el.disabled = true;
    await syncClock(backend.serverNow);
    const sec = draftLimit(d);
    if (sec === null) { el.disabled = false; toast(T('tc.quick.endPast')); refreshTab(); return; }
    const lvT = d.goal === 'level';
    const q = newQuick({ seed: d.seed, tb: d.goal === 'shape' ? '' : d.tb, slots, lv: lvT ? (d.fixed && d.fixed.lv ? d.fixed.lv : d.lv) : null, pass: !lvT && d.pass && d.pass < slots.length ? d.pass : null, limitSec: sec }, nowMs());
    try {
      await saveQuick(q, logPut(quickLog(S.klass), q));
      d.seed = randomCode(4); d.swaps = {}; saveQDraft(d);   // the next quick test gets new problems
      qPhaseShown = null; render(); toast(T('tc.quick.started'));
    }
    catch (e) { console.error(e); el.disabled = false; toast(quickError(e)); }
  },
  async quickMore(el) {   // more time, or less (never less than 10 seconds from now)
    const q = S.klass.quick; if (!q || !q.end) return;
    const m = +el.dataset.m || 1, base = Math.max(new Date(q.end).getTime(), nowMs());
    const end = Math.max(nowMs() + 10000, base + m * 60000);
    const nq = Object.assign({}, q, { end: new Date(end).toISOString() });
    try { await saveQuick(nq, logPut(quickLog(S.klass), nq)); qPhaseShown = null; refreshTab(); }
    catch (e) { console.error(e); toast(quickError(e)); }
  },
  async quickStop() {
    if (!confirm(T('tc.quick.stopConfirm'))) return;
    const q = S.klass.quick;
    try { await saveQuick(null, q ? logPut(quickLog(S.klass), Object.assign({}, q, { stopped: new Date(nowMs()).toISOString() })) : quickLog(S.klass)); S.qOpen = q ? q.id : null; render(); }   // the result opens below
    catch (e) { console.error(e); toast(quickError(e)); }
  },
  quickOpen(el) { S.qOpen = S.qOpen === el.dataset.id ? null : el.dataset.id; refreshTab(); },
  quickCsv(el) {
    const q = quickLog(S.klass).find(x => x.id === el.dataset.id); if (!q) return;
    const csv = quickCSV(quickStats(S.qAtt || [], q, S.members), q, [T('class.nickname'), T('tc.quick.colScore'), T('tc.quick.csvPassed'), T('tc.quick.csvSec'), T('tc.quick.csvTries')]);
    const a = document.createElement('a'), d = new Date(q.at), two = x => String(x).padStart(2, '0');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `quick-${S.klass.code}-${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  quickAgain(el) {   // the same shape with new problems, or the very same problems
    const q = quickLog(S.klass).find(x => x.id === el.dataset.id); if (!q || !Array.isArray(q.slots)) return;
    if (q.slots.some(x => x.b)) {   // a shape mix: the same shapes, kinds and number
      const d = quickDraft(S.klass), same = !!el.dataset.same, sts = [...new Set(q.slots.map(x => x.st))];
      Object.assign(d, { goal: 'shape', shapes: BASIC_STEPS.map(st => st.key).filter(k => q.slots.some(x => x.b === k)), sn: q.slots.length >= 1 && q.slots.length <= 20 ? q.slots.length : d.sn, sk: sts.length === 1 ? sts[0] : 'mix',
        swaps: {}, pass: q.pass < q.n ? q.pass : null, limitSec: Math.min(QUICK_MAX_SEC, limitSecOf(q)), limitBy: 'len', seed: same ? q.seed : randomCode(4), fixed: same ? { seed: q.seed, slots: q.slots, at: q.at } : null });
      saveQDraft(d, true); refreshTab(); toast(T(same ? 'tc.quick.readySame' : 'tc.quick.readyNew'));
      const top = document.querySelector('.quick-setup'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const d = quickDraft(S.klass), slots = q.slots.filter(x => LESSON_BY_KEY[x.k] || PD_BY_KEY[x.k]), shape = slotsShape(slots), same = !!el.dataset.same;
    const order = qOrder(), grid = {};   // the same numbers per lesson and difficulty (problems without one count as 基本)
    slots.forEach(x => { grid[x.k] = grid[x.k] || kindCnt({}, 1); const st = QK.includes(x.st) ? x.st : 'write'; grid[x.k][st][Math.min(3, Math.max(1, x.bd || 1)) - 1]++; });
    Object.assign(d, { mode: 'detail', lessons: shape.lessons.filter(k => order.includes(k)), grid, swaps: {}, perm: null, pass: q.pass < q.n ? q.pass : null,
      limitSec: Math.min(QUICK_MAX_SEC, limitSecOf(q)), limitBy: 'len',
      seed: same ? q.seed : randomCode(4), tb: q.tb || '', goal: q.once ? 'level' : 'quick', lv: q.lv || d.lv, fixed: same ? { seed: q.seed, slots, at: q.at, lv: q.lv } : null });
    saveQDraft(d, true); refreshTab(); toast(T(same ? 'tc.quick.readySame' : 'tc.quick.readyNew'));
    const top = document.querySelector('.quick-setup'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  async quickDel(el) {
    if (!confirm(T('tc.quick.delConfirm'))) return;
    try { await saveQuick(S.klass.quick || null, logDrop(quickLog(S.klass), el.dataset.id)); refreshTab(); }
    catch (e) { console.error(e); toast(quickError(e)); }
  },
  quickBig() { modal(`<div class="modal-body">${quickBigHTML()}</div>`, { wide: true }); },
  closeModal,
  testSavePreset() { const name = prompt(T('test.presetName'), S.test.title || T('test.headingDefault')); if (!name) return; const keep = ['title', 'tlang', 'bilingual', 'lessons', 'per', 'types', 'band', 'pts', 'key', 'results', 'ab']; const o = Object.fromEntries(keep.map(k => [k, S.test[k]])); const list = Store.get(KEYS.test + '.presets', []) || []; list.unshift({ name: name.slice(0, 60), o }); Store.set(KEYS.test + '.presets', list.slice(0, 30)); toast(T('test.presetSaved')); render(); },
  navMenu() { document.body.classList.toggle('nav-open'); },
  loginMode(el) { S.loginMode = el.dataset.m; render(); },
  async signOut() { await backend.signOut(); S.session = null; S.isTeacher = null; S.classes = []; S.klass = null; stopWatch(); location.hash = '#/'; render(); },
  showQR() { openQR(S.klass); },
  copyJoin() { copyText(joinURL(S.klass.code), () => toast(T('set.copied'))); },
  async timerStart(el) {
    let sec = +el.dataset.sec;
    if (el.dataset.free) {
      const n = parseInt(String((document.getElementById('timer-min') || {}).value || '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)), 10);
      if (!(n >= 1 && n <= 120)) { toast(T('tc.timerBad')); return; }
      Store.set('sqln.timerMin', n); sec = n * 60;
    }
    try { await syncClock(backend.serverNow); S.klass = await backend.startTimer(S.klass.id, sec); shownState = null; tickTeacherTimer(); }
    catch (e) { console.error(e); toast(timerError(e)); }
  },
  async timerStop() {
    try { S.klass = await backend.stopTimer(S.klass.id); shownState = null; tickTeacherTimer(); const b = document.getElementById('timer-big'); if (b) b.remove(); }
    catch (e) { console.error(e); toast(timerError(e)); }
  },
  liveMode(el) { Store.set('sqln.liveMode', el.dataset.v === 'end' ? 'end' : 'len'); liveShownT = null; tickTeacherLive(); },
  liveLen(el) { const i = document.getElementById('live-len'); if (i) i.value = el.dataset.v; },
  async liveStart() {
    const r = liveMinutes();
    if (r.err) { toast(r.err); return; }
    const min = r.min;
    try { await syncClock(backend.serverNow); S.klass = await backend.startLive(S.klass.id, min); liveShownT = null; tickTeacherLive(); toast(T('tc.live.started')); }
    catch (e) { console.error(e); toast(liveError(e)); }
  },
  async liveMore() {
    try { S.klass = await backend.startLive(S.klass.id, liveMinutesLeft(S.klass) + 10); liveShownT = null; tickTeacherLive(); }
    catch (e) { console.error(e); toast(liveError(e)); }
  },
  async liveStop() {
    if (!confirm(T('tc.live.stopConfirm'))) return;
    try { S.klass = await backend.stopLive(S.klass.id); liveShownT = null; tickTeacherLive(); }
    catch (e) { console.error(e); toast(liveError(e)); }
  },
  timerBig() {
    if (document.getElementById('timer-big')) return;
    const d = document.createElement('div');
    d.id = 'timer-big'; d.className = 'timer-big';
    d.innerHTML = `<b class="mono" data-timer></b><small>${H('tc.timerClose')}</small>`;
    d.addEventListener('click', () => d.remove());
    document.body.appendChild(d);
    shownState = null; tickTeacherTimer();
  },
  async toggleOpen() { try { S.klass = await backend.updateClass(S.klass.id, { open: !S.klass.open }); render(); } catch (e) { toast(T('class.netError')); } },
  fmtPreset(el) { const p = FORMAT_PRESETS[el.dataset.v]; if (!p || !S.klass) return; const f = fmtOf(S.klass); Object.assign(f, p, { dif: f.dif }); redrawFormat(); },
  fmtCmp(el) {   // one more / one less of a kind per lesson
    if (!S.klass) return; const f = fmtOf(S.klass), k = el.dataset.c;
    f[k] = Math.max(0, Math.min(FORMAT_MAX, f[k] + +el.dataset.d));
    if (!f.demo && FORMAT_KEYS.every(x => !f[x])) f[k] = 1;   // never an empty lesson
    redrawFormat();
  },
  fmtDemo() { if (!S.klass) return; const f = fmtOf(S.klass); f.demo = !f.demo; if (!f.demo && FORMAT_KEYS.every(x => !f[x])) f.write = 1; redrawFormat(); },
  fmtDif(el) { if (!S.klass) return; fmtOf(S.klass).dif = +el.dataset.v; redrawFormat(); },

  setToday() { document.querySelector('[name="set_code"]').value = todayCode(); },
  setRandom() { document.querySelector('[name="set_code"]').value = randomCode(); },
  async reload() { await reloadClassData(); refreshTab(); toast(T('tc.reloaded')); },
  reconnect() { S.conn = 'lost'; startWatch(); },
  rankSet(el) { S[el.dataset.k] = el.dataset.v; saveView(); refreshTab(); },
  openStudent(el) {
    S.viewStudent = el.dataset.u;
    const m = S.members.find(x => x.user_id === S.viewStudent);
    modal(`<div class="modal-head"><h2>${I.users} ${esc(m ? m.nickname : '')}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div><div class="modal-body stu-body">${studentBodyHTML(S.viewStudent)}</div>`, { wide: true });
  },
  projectBoard() {
    const list = projected();
    modal(`<div class="modal-head"><h2>🏆 ${H('tc.rkTitle')} · ${H(S.boardBy === 'first' ? 'tc.rkByFirst' : S.boardBy === 'recent' ? 'tc.rkByRecent' : 'tc.rkBySolved')}</h2><button class="icon-btn" data-act="closeModal">${I.x}</button></div><div class="modal-body projector">${boardListHTML(list, S.boardBy, true)}</div>`, { wide: true });
    document.getElementById('modal').classList.add('full');
  },
  openMistakes(el) { S.mistakeProb = el.dataset.p; location.hash = `#/c/${S.klass.id}/mistakes`; },
  projectMistakes() {
    const list = document.getElementById('mk-list'), pr = document.querySelector('.mk-prob');
    modal(`<div class="modal-head"><h2>${I.eye} ${H('tc.tabMistakes')}</h2><button class="icon-btn" data-act="closeModal">${I.x}</button></div><div class="modal-body projector">${pr ? pr.innerHTML : ''}${list ? list.innerHTML : ''}</div>`, { wide: true });
    document.getElementById('modal').classList.add('full');
  },
  async teacherPin(el) {
    const m = S.members.find(x => x.user_id === el.dataset.u);
    const pin = (prompt(T('tc.pinPrompt', { n: m ? m.nickname : '' })) || '').trim();
    if (!pin) return;
    if (!/^[0-9]{4}$/.test(pin)) { toast(T('pin.bad')); return; }
    try { await backend.teacherSetPin(S.klass.id, el.dataset.u, pin); S.pins = Object.fromEntries(((await backend.pinStatus(S.klass.id)) || []).map(x => [x.user_id, x])); refreshTab(); toast(T('tc.pinDone', { n: m ? m.nickname : '', p: pin })); }
    catch (e) { console.error(e); toast(T(e.message === 'pin_missing' ? 'tc.pinNeedsDb' : 'class.netError')); }
  },
  async removeMember(el) {
    if (!confirm(T('tc.removeConfirm'))) return;
    try { await backend.removeMember(S.klass.id, el.dataset.u); S.members = S.members.filter(m => m.user_id !== el.dataset.u); refreshTab(); } catch (e) { toast(T('class.netError')); }
  },
  async clearAttempts() {
    if (!confirm(T('tc.clearConfirm'))) return;
    try { await backend.clearAttempts(S.klass.id); S.attempts = []; S.qAtt = []; S.lvAtt = []; S.tAtt = []; S.rkAtt = []; S.asAtt = []; refreshTab(); toast(T('tc.cleared')); } catch (e) { toast(T('class.netError')); }
  },
  async deleteClass() {
    if (prompt(T('tc.deleteConfirm', { n: S.klass.name })) !== S.klass.name) return;
    try { await backend.deleteClass(S.klass.id); stopWatch(); S.klass = null; location.hash = '#/'; } catch (e) { toast(T('class.netError')); }
  },
  testAll() { S.test.lessons = LESSONS.map(l => l.key); render(); saveTest(); },
  testNone() { S.test.lessons = []; render(); saveTest(); },
  testClass() { S.test.lessons = LESSONS.map(l => l.key).filter(k => (S.klass.lessons || []).includes(k)); S.test.code = S.klass.set_code; render(); saveTest(); },
  testNewCode() { S.test.code = randomCode(); render(); saveTest(); },
  print() { setTimeout(() => window.print(), 60); },
  rkScope(el) { rkTot.scope = el.dataset.v === 'all' ? 'all' : 'class'; refreshTab(); },
  testTables() { if (!S.testTables) paperHTML(); openProjector(S.testTables || [], L(), 0); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details[data-qpick]')) S.qPick = e.target.open; }, true);
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.ex && el.dataset.ex !== 'q') { explainInput(el); return; }
  if (el.dataset.as && ['url', 'title', 'note'].includes(el.dataset.as)) { asD[el.dataset.as] = el.value; return; }
  if (el.dataset.as) { const k = el.dataset.as; asD[k] = k === 'limit' ? Math.max(0, parseInt(el.value, 10) || 0) : el.value; if (k === 'type') asD.ref = ''; redrawAs(); return; }
  if (el.matches('[data-act="lang"]')) { await loadLang(el.value); S.settings.lang = el.value; saveSettings(Object.assign(loadSettings(el.value), { lang: el.value })); render(); return; }
  if (el.dataset.act2 === 'today') { S.liveOnlyToday = el.checked; refreshTab(); return; }
  if (el.dataset.qlesson) { const d = quickDraft(S.klass); d.lessons = el.checked ? [...new Set([...d.lessons, el.dataset.qlesson])] : d.lessons.filter(k => k !== el.dataset.qlesson); const order = checkLessons().map(l => l.key); d.lessons = order.filter(k => d.lessons.includes(k)); d.swaps = {}; saveQDraft(d); refreshTab(); return; }
  if (el.dataset.qnum === 'min' || el.dataset.qnum === 'sec') {   // minutes and seconds, any length
    const d = quickDraft(S.klass), box = el.closest('.q-limit'), num = k => Math.max(0, Math.round(+(box.querySelector(`[data-qnum="${k}"]`) || {}).value || 0));
    d.limitSec = Math.min(QUICK_MAX_SEC, num('min') * 60 + Math.min(59, num('sec'))); saveQDraft(d, true);
    setTimeout(() => { const f = document.activeElement; if (!(f && f.dataset && (f.dataset.qnum === 'min' || f.dataset.qnum === 'sec'))) refreshTab(); }, 50);   // moving from minutes to seconds: do not redraw under the cursor
    return;
  }
  if (el.dataset.qnum === 'end') { const d = quickDraft(S.klass); d.limitEnd = el.value || ''; saveQDraft(d, true); el.blur(); refreshTab(); return; }
  if (el.dataset.qsel === 'tb') { const d = quickDraft(S.klass); d.tb = el.value || ''; d.swaps = {}; saveQDraft(d); refreshTab(); return; }
  if (el.dataset.qsel === 'pass') { const d = quickDraft(S.klass); d.pass = el.value === '' ? null : +el.value; saveQDraft(d, true); refreshTab(); return; }
  if (el.dataset.act2 === 'boardHide') { S.boardHide = el.checked; saveView(); return; }
  if (el.dataset.act2 === 'mistakeProb') { S.mistakeProb = el.value; refreshTab(); return; }
  if (el.dataset.tt) { const o = S.test, set = new Set(testTypes()); if (el.checked) set.add(el.dataset.tt); else set.delete(el.dataset.tt); if (!set.size) set.add('write'); o.types = ['write', 'predict', 'order', 'fill'].filter(x => set.has(x)); saveTest(); render(); return; }
  if (el.dataset.tp === 'load' && el.value !== '') { const x = Store.get(KEYS.test + '.presets', [])[+el.value]; if (x) { Object.assign(S.test, x.o); saveTest(); render(); toast(T('test.presetLoaded', { n: x.name })); } return; }
  const k = el.dataset.tk;
  if (k) {
    const o = S.test;
    if (el.type === 'checkbox') o[k] = el.checked;
    else if (k === 'per') o.per = +el.value;
    else if (k === 'band') o.band = +el.value;
    else if (k === 'pts') o.pts = Math.max(0, Math.min(100, Math.round(+el.value) || 0));
    else if (k === 'ab') o.ab = el.value === 'true';
    else if (k === 'code') o.code = normCode(el.value) || randomCode();
    else if (k === 'bilingual') o.bilingual = el.value || null;
    else o[k] = el.value;
    if (k === 'tlang') { await loadLang(o.tlang); if (o.bilingual === o.tlang) o.bilingual = null; render(); saveTest(); return; }
    if (k === 'bilingual' && o.bilingual) await loadLang(o.bilingual);
    if (k === 'key') { const r = document.querySelector('[data-tk="results"]'); if (r) r.disabled = !o.key; }
    rerenderPaper(); return;
  }
  if (el.dataset.tl) {
    const key = el.dataset.tl;
    S.test.lessons = el.checked ? LESSONS.map(l => l.key).filter(x => x === key || S.test.lessons.includes(x)) : S.test.lessons.filter(x => x !== key);
    const b = document.querySelector('[data-act="print"]'); if (b) b.disabled = !S.test.lessons.length;
    rerenderPaper();
  }
});
// open / closed cards (details with data-toggle) are remembered
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.toggle) { S[d.dataset.toggle] = d.open; saveView(); } }, true);
document.addEventListener('input', e => {
  if (e.target.dataset.ex === 'q') { explainInput(e.target); return; }
  if (e.target.dataset.tk === 'title') { S.test.title = e.target.value; rerenderPaper(); }
});
document.addEventListener('submit', async e => {
  const f = e.target, kind = f.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const fd = new FormData(f);
  const btn = f.querySelector('button.btn-primary'); if (btn) btn.disabled = true;
  try {
    if (kind === 'login') {
      const mode = S.loginMode || 'in', email = String(fd.get('email')).trim(), pw = String(fd.get('pw') || '');
      const err = f.querySelector('#login-err');
      try {
        if (mode === 'reset') { await backend.resetPassword(email); err.textContent = ''; toast(T('tc.resetSent')); S.loginMode = 'in'; render(); return; }
        await backend.signIn(email, pw);
        S.isTeacher = null;
        await load();
      } catch (ex) { err.style.color = ''; err.textContent = /Invalid login/i.test(ex.message) ? T('tc.badLogin') : /confirm/i.test(ex.message) ? T('tc.notConfirmed') : ex.message; if (btn) btn.disabled = false; }
    } else if (kind === 'newClass') {
      const c = await backend.createClass(String(fd.get('name')).trim());
      location.hash = `#/c/${c.id}/send`;
    } else if (kind === 'lessons') {   // 配信: the lessons of the live class
      const patch = { lessons: LESSONS.map(l => l.key).filter(k => fd.getAll('lesson').includes(k)) };
      const removed = (S.klass.lessons || []).some(k => !patch.lessons.includes(k));
      if (liveOn(S.klass) && removed && !confirm(T('tc.live.changeConfirm'))) { if (btn) btn.disabled = false; return; }
      S.klass = await backend.updateClass(S.klass.id, patch);
      toast(T('as.tc.sent')); render();
    } else if (kind === 'assign') {
      const patch = { lessons: S.klass.lessons || [], set_code: normCode(fd.get('set_code')) || todayCode(), answer_policy: fd.get('policy') || 'after2' };
      const fmt = normFormat(readFormat());   // null = the usual set
      const removed = (S.klass.lessons || []).some(k => !patch.lessons.includes(k));
      if (liveOn(S.klass) && (patch.set_code !== S.klass.set_code || formatKey(fmt) !== formatKey(S.klass.format) || removed) && !confirm(T('tc.live.changeConfirm'))) { if (btn) btn.disabled = false; return; }
      if (fmt || S.klass.format) patch.format = fmt;   // old databases without the column keep working with the usual set
      S.klass = await backend.updateClass(S.klass.id, patch);
      toast(T('tc.saved')); render();
    }
  } catch (ex) { console.error(ex); toast(T(/not_teacher/.test(ex.message) ? 'tc.notTeacher' : /format/.test(ex.message) ? 'tc.formatNeedsDb' : 'class.netError')); }
  finally { if (btn) btn.disabled = false; }
});

async function openQR(c) {
  const { default: qrcode } = await import('../vendor/qrcode.js');
  const url = joinURL(c.code);
  const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
  modal(`<div class="modal-head"><h2>${I.qr} ${esc(c.name)}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <div class="modal-body qr-body"><div class="qr">${qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true })}</div>
    <div class="qr-side"><p class="muted">${rubyHTML(raw('tc.qrStep1', L()))}</p><p class="qr-code mono">${esc(c.code)}</p><p class="muted small">${rubyHTML(raw('tc.qrStep2', L()))}</p><p class="qr-url">${esc(url)}</p></div></div>`, { wide: true });
  document.getElementById('modal').classList.add('full');
}

/* ---------- a new version of the app is ready (sw.js): a small bar offers to reload ---------- */
function updateBanner() {
  if (document.getElementById('upd-bar')) return;
  const bar = document.createElement('div'); bar.id = 'upd-bar'; bar.className = 'upd-bar';
  bar.innerHTML = `<span>${esc(T('upd.ready'))}</span><button type="button" class="btn btn-primary btn-sm">${esc(T('upd.reload'))}</button><button type="button" class="icon-btn" aria-label="${esc(T('btn.close'))}">×</button>`;
  bar.querySelector('.btn').onclick = () => location.reload();
  bar.querySelector('.icon-btn').onclick = () => bar.remove();
  document.body.appendChild(bar);
}
/* ---------- start ---------- */
(async function start() {
  installTables(); setTablesLang(L);
  installExplain({ S, toast });
  installCheckUI({ mode: 'teacher', lang: L, engine: () => S.engine, assigned: () => (S.klass ? (S.klass.lessons || []).filter(k => LESSON_BY_KEY[k] && LESSON_BY_KEY[k].kind !== 'quiz') : []), onStart() {} });
  S.route = parseRoute();
  await Promise.all([loadLang('en'), loadLang(L()), loadLang(S.test.tlang), S.test.bilingual ? loadLang(S.test.bilingual) : null]);
  render();
  try { S.engine = new SqlEngine(await window.initSqlJs({ locateFile: f => '../vendor/' + f })); }
  catch (e) { console.error(e); app.innerHTML = frame(`<div class="loading"><div>${H('misc.loadError')}</div></div>`); return; }
  if (backend.enabled) {
    const sb = await backend.client();
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.session = null; render(); } if (ev === 'PASSWORD_RECOVERY') { const pw = prompt(T('tc.newPassword')); if (pw) sb.auth.updateUser({ password: pw }).then(() => toast(T('tc.saved'))); } });
  }
  load();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('../sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'updated') updateBanner(); });   // a new version is saved: offer to reload
  }
})();

/* ---------- dragging the problems of a quick test into another order (mouse, touch; ↑ ↓ on the handle) ---------- */
function quickMove(from, to) {
  const d = quickDraft(S.klass), base = draftBase(d), p = draftPerm(d, base).slice();
  if (from === to || from < 0 || to < 0 || from >= p.length || to >= p.length) return;
  const [x] = p.splice(from, 1); p.splice(to, 0, x);
  Object.assign(d, { perm: p, permKey: slotSig(base) }); saveQDraft(d, true); refreshTab();
  requestAnimationFrame(() => { const g = document.querySelector(`[data-grip="${to}"]`); if (g) g.focus(); });
}
let qDrag = null;
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('.qs-grip'); if (!g || e.button > 0) return;
  e.preventDefault();
  const row = g.closest('.qs-pv'), list = row.parentElement;
  qDrag = { from: +g.dataset.grip, row, list, pid: e.pointerId, to: +g.dataset.grip };
  row.classList.add('dragging'); document.body.classList.add('qs-dragging');
  try { g.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
});
document.addEventListener('pointermove', e => {
  if (!qDrag || e.pointerId !== qDrag.pid) return;
  e.preventDefault();
  const rows = [...qDrag.list.querySelectorAll('.qs-pv')];
  let to = rows.length - 1;
  for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { to = i > qDrag.from ? i - 1 : i; break; } }
  qDrag.to = Math.max(0, to);
  rows.forEach((r, i) => { r.classList.toggle('drop-before', i === qDrag.to && qDrag.to < qDrag.from); r.classList.toggle('drop-after', i === qDrag.to && qDrag.to > qDrag.from); });
}, { passive: false });
const qDragEnd = ok => {
  if (!qDrag) return;
  const { from, to, list } = qDrag; qDrag = null;
  document.body.classList.remove('qs-dragging');
  list.querySelectorAll('.qs-pv').forEach(r => r.classList.remove('dragging', 'drop-before', 'drop-after'));
  if (ok && to !== from) quickMove(from, to);
};
document.addEventListener('pointerup', e => { if (qDrag && e.pointerId === qDrag.pid) qDragEnd(true); });
document.addEventListener('pointercancel', () => qDragEnd(false));
document.addEventListener('click', e => { if (e.target.closest('.qs-grip')) { e.preventDefault(); e.stopPropagation(); } }, true);   // the handle does not open the problem
document.addEventListener('keydown', e => {
  if (S.route.view === 'class' && S.route.tab === 'explain' && explainKey(e)) return;
  const g = e.target.closest && e.target.closest('.qs-grip'); if (!g) return;
  const j = +g.dataset.grip, n = document.querySelectorAll('.qs-grip').length;
  if (e.key === 'ArrowUp' && j > 0) { e.preventDefault(); quickMove(j, j - 1); }
  else if (e.key === 'ArrowDown' && j < n - 1) { e.preventDefault(); quickMove(j, j + 1); }
});
// the lesson pickers (lessonPickHTML): the quick test, the paper test
document.addEventListener('lpchange', e => {
  const { id, keys } = e.detail;
  if (id === 'quick' && S.klass) { const d = quickDraft(S.klass), old = d.lessons.filter(k => keys.includes(k)); d.lessons = [...old, ...keys.filter(k => !old.includes(k))]; d.swaps = {}; saveQDraft(d); refreshTab(); }
  else if (id === 'test') { S.test.lessons = keys; const b = document.querySelector('[data-act="print"]'); if (b) b.disabled = !keys.length; for (const x of document.querySelectorAll('[data-act="testTables"]')) x.disabled = !keys.length; saveTest(); rerenderPaper(); }
});
