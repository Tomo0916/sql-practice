/* =========================================================
 * student.js — the student app (index.html, the top address)
 *
 * Routes:  #/            home
 *          #/l/<lesson>/<n>   lesson, problem n (0 = example)
 *          #/review       today's spaced review      #/mix   mixed practice
 *          #/words        glossary
 * Progress is stored by language-independent problem IDs, so switching
 * language never touches progress, drafts or results.
 * ========================================================= */
import { LANGS, LANG_CODES, loadLang, hasLang, detectLang, htmlLang, t, th, esc, rubyHTML, raw } from './i18n.js';
import { SqlEngine, LESSON_BY_KEY, STAGES, stagesOf, formatKey, grade, checkAnswer, todayCode, randomCode, normCode, makeRng } from './engine.js';
import { LESSONS, CHAPTERS, BOOK_CHAPTERS, levelsOf, levelInfo } from './lessons.js';
import { ALL_TABLES, JOIN_DATASETS } from './datasets.js';
import { diagnose, findFix } from './diagnose.js';
import { Store, KEYS, loadSettings, saveSettings, loadProgress, saveProgress, mergeProgress, lessonState, markLessonDone, bumpStreak, today } from './store.js';
import * as backend from './backend.js';
import { RK_N, RK_SEC, RK_TIERS, RK_CHAPTERS, RK_RANKS, RK_FROM, rankKey, rankParse, rankOf, rankToNext, rankProblems, rankScore, rankRow, rankBetter } from './rank.js';
import { pyDescHTML, highlightPy, countPickHTML, choiceHTML, answerTextHTML, I, applySettings, langSelect, langOptions, highlightSQL, highlightDiff, gridHTML, problemHTML, lessonTitle, lessonTitleHTML, themeName, themeHTML, syntaxHint, withGloss, toast, copyText, modal, closeModal, GLOSS_KEYS } from './ui.js';
import { orderStripHTML, joinHTML, drawJoinLines, STEP_TO_KIND } from './viz.js';
/* the code editor (CodeMirror, ~420 KB) is loaded when a page needs it, not on the home page */
let createEditor = null;
const loadEditor = () => import('./editor.js').then(m => { createEditor = m.createEditor; });
import { textbookPage } from './book.js';
import { syncClock, secondsLeft, fmtClock, timerState, liveOn, liveMinutesLeft, nowMs } from './timer.js';
import { isAnalysis, statCardHTML, resultChartHTML, downloadCSV, toolsHTML } from './analysis-ui.js';
import { hasLecture, lectureOf } from './lectures.js';
import { lectureSteps, lectureStepHTML, paintStep, quizPick } from './lecture-ui.js';
import { altAnswers, shortForms, sqlLines } from './alt.js';
import { decodeCheck, encodeCheck, buildCheck, checkCounts } from './check.js';
import { patWaiting, patPick, patProblem, patResult, patLabel, ladderOf, lessonLevels, REVIEW_N, tableSets, tableCourse, makeProblem } from './mastery.js';
import { LV_CHAPTERS, LV_MAX, LV_PER, LV_PASS, LV_FORMATS, LV_STREAK, buildTest, testEnds, afterTest, adaptiveStart, adaptiveNext, adaptiveAnswer, adaptiveProblem, adaptiveResult, mistakeKind, buildRound, afterRound, targetChapter, passed, levelTag, chapterLessons, isLevelRow, levelsFromLog, levelOf } from './level.js';
import { BASIC_STEPS, BASIC_CORE, BASIC_DETAIL, BASIC_BY_KEY, BASIC_FORMATS, BASIC_ROUND, BASIC_UP, BASIC_CLEAR, basicStart, basicResult, basicNorm, nextStep, basicProblem, stepForMistake, absCheck, absChips, absShape, absVariant, absPieces, absClauses, ABS_SLOTS, CHAPTER_SHAPES, MIX_RANGES, MIX_FORMATS, MIX_COUNTS, mixSteps, mixProblems } from './basics.js';
import { levelProfile } from './quick.js';
import { CLAUSES, CQ_SETS, KW, CQ_N, CQ_BASIC, CQ_EXAMPLE, BLANK, CHAPTER_QUIZ, cqQuiz, cqRecord } from './clauses.js';
import { quickOn, quickProblems, quickPhase, passOf, spanText, limitSecOf, shapeSlots, shapeCountSlots, slotProblems, kindsOf, levelFor } from './quick.js';
import { checkSetupHTML, installCheckUI } from './check-ui.js';
import { installPy, pyRoute, pyHTML, pyMount, pyActions, pyQuickHTML, pyPrepare } from './py-ui.js';
import { PD_LESSONS, PD_BY_KEY } from './pandas.js';
import { tablesPageHTML, installTables, setTablesLang, closeProjector } from './tables-ui.js';

const S = {
  settings: loadSettings(null),
  progress: loadProgress(),
  set: null,
  klass: Store.get(KEYS.klass, null),
  engine: null,
  route: { view: 'home' },
  runs: {},          // problem id → { res, grade, error, dx, sql }
  tab: 'user',
  step: null,
  hideData: {},     // table name → true when the student hid the data table
  session: null,
  redoing: new Set(),   // solved problems the student is solving again
  pinNeeded: false,     // in a class without a 4-digit number yet     // review / mix session { kind, items: [prob], i, done: {id: ok} }
  editor: null
};
S.settings.lang = detectLang(S.settings.lang);
if (new URLSearchParams(location.search).get('present') === '1') S.settings.presenter = true;
const app = document.getElementById('app');
const L = () => S.settings.lang;
const T = (k, v) => t(k, L(), v);
/** label as HTML (furigana kept, variables escaped) */
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
/** text in the main language + the second language underneath (if chosen) */
function bi(k, vHTML, tag) {
  const main = th(k, L(), vHTML);
  const sec = S.settings.second;
  if (!sec || sec === L()) return main;
  return `${main}<${tag || 'span'} class="bi" lang="${htmlLang(sec)}">${th(k, sec, vHTML)}</${tag || 'span'}>`;
}

/* ---------- set code ---------- */
function initSet() {
  const q = normCode(new URLSearchParams(location.search).get('set'));
  if (q) { Store.set(KEYS.set, { code: q }); }
  const s = Store.get(KEYS.set, null);
  S.set = s && s.code ? { code: s.code, custom: true } : { code: todayCode(), custom: false };
}
initSet();
const setCode = () => (S.klass && S.klass.set_code ? S.klass.set_code : S.set.code);
const answerPolicy = () => (S.klass && S.klass.answer_policy) || 'after2';

/* ---------- progress helpers ---------- */
const save = () => saveProgress(S.progress);
/** solved by this student anywhere (own practice, other days …) */
const solvedEver = id => !!S.progress.solved[id];
/*
 * The class assignment counts only what was solved in this class with its current set
 * (a "round": class + set code). Practice before, alone or with the same problems, does not
 * tick the assignment; a new set code starts a new round.
 */
const roundKey = () => (S.klass ? `${S.klass.id}|${S.klass.set_code || ''}` : null);
const roundMap = () => { const k = roundKey(); return (k && S.progress.klass && S.progress.klass[k]) || {}; };
const inRound = lessonKey => !!S.klass && (S.klass.lessons || []).includes(lessonKey);
function markRound(id, at) {
  const k = roundKey(); if (!k) return false;
  S.progress.klass = S.progress.klass || {};
  const m = S.progress.klass[k] = S.progress.klass[k] || {};
  if (m[id]) return false;
  m[id] = at || Date.now(); return true;
}
/** solved, as the screen shows it: an assigned lesson in a class counts this round only */
const isSolved = id => (inRound(String(id).split(':')[0]) ? !!roundMap()[id] : solvedEver(id));
/** the class's own problem format applies to the lessons the class assigned */
const formatOf = lesson => (S.klass && S.klass.format && (S.klass.lessons || []).includes(lesson.key) ? S.klass.format : null);
const problemsOf = lesson => S.engine.lessonProblems(lesson, setCode(), formatOf(lesson));
const stateOf = lesson => lessonState(inRound(lesson.key) ? { solved: roundMap() } : S.progress, problemsOf(lesson));
const ownStateOf = lesson => lessonState(S.progress, problemsOf(lesson));
function stageLabelH(p) {
  if (p.stage === 'demo') return H('stage.demo');
  if (p.stage === 'fill') return H('stage.fill');
  if (p.stage === 'order') return p.of > 1 ? H('stage.orderN', { n: p.wn }) : H('stage.order');
  if (p.kind === 'review') return H('stage.review');
  if (p.stage === 'quiz') return H('stage.quiz', { n: p.wn });
  return H('stage.write', { n: p.wn });
}
function stageLabel(p) {
  if (p.stage === 'demo') return T('stage.demo');
  if (p.stage === 'fill') return T('stage.fill');
  if (p.stage === 'order') return p.of > 1 ? T('stage.orderN', { n: p.wn }) : T('stage.order');
  if (p.kind === 'review') return T('stage.review');
  if (p.stage === 'quiz') return T('stage.quiz', { n: p.wn });
  return T('stage.write', { n: p.wn });
}
const isQuiz = prob => prob.answer !== undefined || (LESSON_BY_KEY[prob.lesson] || {}).kind === 'quiz';

/* ---------- routing ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'l' && LESSON_BY_KEY[h[1]]) return { view: 'lesson', key: h[1], idx: Math.min(29, Math.max(0, parseInt(h[2], 10) || 0)) };   // current() keeps it inside the lesson's problems
  if (h[0] === 'review' || h[0] === 'mix') return { view: 'session', kind: h[0] };
  if (h[0] === 'drill') return { view: 'session', kind: 'drill', key: LESSON_BY_KEY[h[1]] ? h[1] : null };
  if (h[0] === 'level') return { view: 'session', kind: 'level', sub: h[1] === 'test' || h[1] === 'go' ? h[1] : null };
  if (h[0] === 'rank') { const t = rankParse(`${h[1]}-${h[2]}`); return { view: 'session', kind: 'rank', test: t ? rankKey(t.ch, t.tier) : null }; }
  if (h[0] === 'basics' && h[1] === 'mix') return { view: 'session', kind: 'bsmix', go: h[2] === 'go' || h[2] === 'task', task: h[2] === 'task' };
  if (h[0] === 'basics') return { view: 'session', kind: 'basics', step: BASIC_BY_KEY[h[1]] ? h[1] : null };
  if (h[0] === 'table') return { view: 'session', kind: 'table', ds: h[1] || null };
  if (h[0] === 'practice') return { view: 'session', kind: 'prac', go: h[1] === 'go', pre: LESSON_BY_KEY[h[1]] ? h[1] : null };
  if (h[0] === 'py') return pyRoute(h);
  if (h[0] === 'words') return { view: 'words' };
  if (h[0] === 'solved') return { view: 'solved' };
  if (h[0] === 'mastery') return { view: 'mastery' };
  if (h[0] === 'clauses') return { view: 'clauses', set: CQ_SETS.includes(h[1]) ? h[1] : null };
  if (h[0] === 'tables') return { view: 'tables' };
  if (h[0] === 'check') return { view: 'session', kind: 'check', code: h.slice(1).join('/') || null };
  if (h[0] === 'lecture' && hasLecture(h[1])) return { view: 'lecture', key: h[1] };
  if (h[0] === 'quick') return { view: 'quick', idx: h[1] === 'done' ? -1 : Math.max(0, parseInt(h[1], 10) || 0), raw: h[1] || '' };
  if (h[0] === 'live') return { view: 'live', key: LESSON_BY_KEY[h[1]] ? h[1] : h[1] === 'done' ? 'done' : null, idx: Math.min(29, Math.max(0, parseInt(h[2], 10) || 0)) };
  return { view: 'home' };
}
window.addEventListener('hashchange', () => {
  saveDraft(); stopAuto(); closeProjector();
  S.route = parseRoute(); S.step = null; S.tab = 'user';
  if (S.route.view !== 'session') S.session = null;
  render(); window.scrollTo(0, 0);
});

/* ---------- current problem ---------- */
function current() {
  const r = S.route;
  if (r.view === 'lesson') {
    const lesson = LESSON_BY_KEY[r.key];
    const probs = problemsOf(lesson);
    return { lesson, probs, prob: probs[Math.min(r.idx, probs.length - 1)] };
  }
  if (r.view === 'live') {
    const p = r.key && r.key !== 'done' ? null : firstOpen();
    const lesson = LESSON_BY_KEY[r.key && r.key !== 'done' ? r.key : p ? p.lesson : ''];
    if (!lesson || r.key === 'done') return null;
    const probs = problemsOf(lesson);
    return { lesson, probs, prob: p || probs[Math.min(r.idx, probs.length - 1)] };
  }
  if (r.view === 'quick') {
    const items = qItems(); if (!items.length || qPhaseNow() !== 'run' || ((r.raw === '' || r.idx < 0) && qFinished())) return null;   // countdown, time up, or the "passed" screen
    if (r.raw === '' || r.idx < 0) {   // #/quick: the first unsolved problem, and keep it (it must not move on when solved)
      const first = items.find(p => !(qOnce() ? qTried(p) : qDone(p))) || items[0];
      Object.assign(r, { idx: first.qn, raw: String(first.qn) }); history.replaceState(null, '', `#/quick/${first.qn}`);
    }
    const prob = items[Math.min(r.idx, items.length - 1)];
    return { lesson: LESSON_BY_KEY[prob.lesson], probs: items, prob };
  }
  if (r.view === 'session' && S.session && S.session.kind === 'rank' && S.session.phase !== 'run') return null;   // a rank test: the start, countdown and result screens
  if (r.view === 'session' && S.session && S.session.i < S.session.items.length && (r.kind !== 'check' || (S.session.kind === 'check' && S.session.code === r.code))) {   // not on the finish screen
    const prob = S.session.items[S.session.i];
    return { lesson: LESSON_BY_KEY[prob.lesson], probs: S.session.items, prob };
  }
  return null;
}
function saveDraft() {
  const c = current();
  if (!c || !S.editor) return;
  S.progress.drafts[c.prob.id] = S.editor.get();
  save();
}

/* =========================================================
 * RENDER
 * ========================================================= */
function render() {
  applySettings(S.settings, htmlLang(L()));
  if (S.editor) { S.editor.destroy(); S.editor = null; }
  if (!(S.route.view === 'session' && S.route.kind === 'rank' && S.route.test) && rkTick) { rkStopTick(); if (S.session && S.session.kind === 'rank') S.session = null; }   // left a rank test
  const head = headerHTML();
  if (!S.engine) { app.innerHTML = head + `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`; return; }
  const r = S.route;
  let body;
  if (r.view === 'lesson') body = lessonHTML();
  else if (r.view === 'session') body = sessionHTML();
  else if (r.view === 'words') body = wordsHTML();
  else if (r.view === 'live') body = liveViewHTML();
  else if (r.view === 'quick') body = quickViewHTML();
  else if (r.view === 'solved') body = solvedHTML();
  else if (r.view === 'mastery') body = masteryHTML();
  else if (r.view === 'clauses') body = clausesHTML();
  else if (r.view === 'lecture') body = lectureHTML();
  else if (r.view === 'py') body = pyHTML();
  else if (r.view === 'tables') { body = tablesPageHTML(L()); document.title = `${T('tb.title')} · SQL Practice`; }
  else body = homeHTML();
  app.innerHTML = head + quickBannerHTML() + liveBannerHTML() + body + footerHTML();
  mountWorkspace();
  pyMount();
  drawJoinLines(app);
}

function headerHTML() {
  const due = S.engine ? reviewCount() : 0;
  const v = S.route.view;
  return `<header class="topbar"><div class="topbar-in">
    <a class="brand" href="#/"><span class="brand-mark">SQL</span><span class="brand-name">SQL Practice</span></a>
    <nav class="topnav">
      <a href="#/" class="${v === 'home' || v === 'lesson' ? 'on' : ''}">${I.book}<span>${H('nav.home')}</span></a>
      ${S.klass && (S.klass.lessons || []).length ? `<a href="#/live" class="${v === 'live' ? 'on' : ''}">${liveOn(S.klass) ? '<i class="live-dot"></i>' : I.users}<span>${H('nav.assign')}</span></a>` : ''}
      <a href="#/review" class="${v === 'session' && S.route.kind !== 'check' ? 'on' : ''}">${I.repeat}<span>${H('nav.review')}</span>${due ? `<b class="badge">${due}</b>` : ''}</a>
      <a href="#/words" class="${v === 'words' ? 'on' : ''}">${I.globe}<span>${H('nav.words')}</span></a>
      <a href="#/tables" class="${v === 'tables' ? 'on' : ''}">${I.table}<span>${H('nav.tables')}</span></a>
    </nav>
    <div class="topbar-right">
      ${S.klass ? `<button class="class-chip" data-act="classInfo" title="${esc(S.klass.name)}">${I.users}<span>${esc(S.klass.name)}</span></button>` : ''}
      ${langSelect(L(), T('nav.language'))}
      <button class="icon-btn" data-act="settings" aria-label="${esc(T('set.title'))}" title="${esc(T('set.title'))}">${I.gear}</button>
    </div>
  </div></header>`;
}
function footerHTML() {
  return `<footer class="foot"><span>${H('foot.saved')}</span><a href="teacher/">${H('foot.teacher')}</a></footer>`;
}

/* ---------- home ---------- */
/** one lesson in a chapter card of the home page */
function lessonLinkHTML(l) {
  const st = stateOf(l);
  return `<li><a class="lesson-link ${st.done ? 'done' : ''}" href="#/l/${l.key}/0">
    <span class="lesson-num">${st.done ? '✓' : l.no}</span>
    <span class="lesson-name">${lessonTitleHTML(l, L())}</span>
    <span class="dots" aria-label="${st.count}/${st.solved.length}">${problemsOf(l).map((p, i) => `<i class="${p.stage === 'demo' ? 'demo ' : ''}${st.solved[i] ? 'on' : ''}"></i>`).join('')}</span>
  </a></li>`;
}
/**
 * The lesson list of the home page: by the app's chapters, or in the order of the textbook
 * (スッキリわかるSQL入門 第4版, chapters 1–8, then the rest). The choice is kept in the settings (order: 'book').
 */
/** phones show a chapter's lessons only when it is open: the chapter of the last lesson, or the first one */
const chOpen = ls => { const k = (S.progress.last && S.progress.last.key) || LESSONS[0].key; return ls.some(l => l.key === k); };
function chaptersHTML() {
  const book = S.settings.order === 'book';
  const toggle = `<div class="order-bar"><span class="muted">${H('home.orderLabel')}</span><div class="seg">${['app', 'book'].map(v => `<button class="${(v === 'book') === book ? 'on' : ''}" data-act="homeOrder" data-v="${v}" aria-pressed="${(v === 'book') === book}">${H('home.order.' + v)}</button>`).join('')}</div></div>`;
  if (!book) return `${toggle}<section class="chapters">
      ${CHAPTERS.map((ch, ci) => {
        const ls = LESSONS.filter(l => l.ch === ch.key);
        return `<article class="card chapter ${chOpen(ls) ? 'open' : ''}" style="--cc:var(--c-${ch.key})">
          <div class="chapter-head" data-act="chToggle"><div class="chapter-icon">${esc(ch.icon)}</div><div>
            <small>${H('home.chapter', { n: ci + 1 })}</small>
            <h2>${rubyHTML(raw('ch.' + ch.key, L()))}</h2><p>${rubyHTML(raw('ch.' + ch.key + '.desc', L()))}</p></div></div>
          ${chShapesHTML(ch.key)}
          <ul class="lesson-list">${ls.map(lessonLinkHTML).join('')}</ul>${chQuizHTML(ch.key)}</article>`;
      }).join('')}
    </section>`;
  const inBook = new Set(BOOK_CHAPTERS.flatMap(b => b.lessons || []));
  return `${toggle}<p class="muted order-note">${H('book.note')}</p><section class="chapters">
      ${BOOK_CHAPTERS.map((b, bi) => {
        const ls = b.more ? LESSONS.filter(l => !inBook.has(l.key)) : b.lessons.map(k => LESSON_BY_KEY[k]).filter(Boolean);
        if (!ls.length) return '';
        return `<article class="card chapter book-ch ${chOpen(ls) ? 'open' : ''}" style="--cc:var(--c-${ls[0].ch})">
          <div class="chapter-head" data-act="chToggle"><div class="chapter-icon">${b.more ? '＋' : bi + 1}</div><div>
            <small>${H(b.more ? 'book.moreTag' : 'book.tag')}</small>
            <h2>${rubyHTML(raw('book.' + b.key, L()))}</h2><p>${rubyHTML(raw('book.' + b.key + '.desc', L()))}</p></div></div>
          <ul class="lesson-list">${ls.map(lessonLinkHTML).join('')}</ul></article>`;
      }).join('')}
    </section>`;
}

function homeHTML() {
  const allDone = LESSONS.filter(l => S.progress.lessons[l.key] && S.progress.lessons[l.key].done).length;
  const solved = Object.keys(S.progress.solved).length;
  const due = reviewCount();
  const last = S.progress.last;
  const contHash = last && LESSON_BY_KEY[last.key] ? `#/l/${last.key}/${last.idx || 0}` : `#/l/${LESSONS[0].key}/0`;
  const streak = S.progress.streak && S.progress.streak.day >= today() - 86400000 ? S.progress.streak.n : 0;

  const assign = S.klass && S.klass.lessons && S.klass.lessons.length ? `<section class="card assign">
      <div class="assign-head">${I.users}<div><small>${H('class.today')}</small><h2>${esc(S.klass.name)}</h2></div><span class="tag">${H('class.you', { n: S.klass.nickname })}</span></div>
      <div class="assign-list">${S.klass.lessons.filter(k => LESSON_BY_KEY[k]).map(k => {
        const l = LESSON_BY_KEY[k], st = stateOf(l);
        return `<a class="assign-item ${st.done ? 'done' : ''}" href="#/l/${k}/0"><span class="lesson-num">${st.done ? '✓' : l.no}</span><span>${lessonTitleHTML(l, L())}</span><span class="muted">${st.count}/${st.solved.length}</span></a>`;
      }).join('')}</div></section>` : '';
  const tk = taskOf(), tkOk = tk ? taskSolved(tk) : 0;
  const taskCard = tk ? `<section class="card mixcard drillcard taskcard ${tkOk >= tk.n ? 'done' : ''}">
      <div><span class="drill-ic">📌</span><div><small class="muted">${H('class.today')}</small><b>${H('task.title')} <span class="tag">${tkOk} / ${tk.n}</span></b><p class="muted">${H('task.sub', { n: tk.n })}</p></div></div>
      <a class="btn ${tkOk >= tk.n ? 'btn-ghost' : 'btn-primary'}" href="#/basics/mix/task">${H(tkOk >= tk.n ? 'task.again' : tkOk ? 'task.continue' : 'task.start')}${I.next}</a></section>` : '';

  const classBox = !backend.enabled ? '' : S.klass ? '' : `<div class="joinbox">
      <b>${I.users} ${H('class.joinTitle')}</b>
      <p class="muted">${H('class.joinSub')}</p>
      <button class="btn btn-primary btn-sm" data-act="join">${H('class.join')}</button></div>`;

  return `<main class="wrap">
    <section class="hero">
      <div class="hero-text">
        <h1>${rubyHTML(raw('home.title', L()))}</h1>
        <p>${rubyHTML(raw('home.sub', L()))}</p>
        <div class="hero-btns">
          <a class="btn btn-light" href="${contHash}">${esc(last ? T('home.continue') : T('home.start'))} ${I.next}</a>
          ${due ? `<a class="btn btn-glass" href="#/review">${I.repeat}${H('rv.today', { n: due })}</a>` : ''}
          <a class="btn btn-glass" href="#/mastery">${H('rv.map')}</a>
        </div>
        <div class="hero-deco" aria-hidden="true">SELECT *</div>
      </div>
      <div class="card stats">
        <div class="stat-row">
          <div class="stat"><b>${solved}</b><span>${H('home.solved')}</span></div>
          <div class="stat"><b>${allDone}<small> / ${LESSONS.length}</small></b><span>${H('home.lessonsDone')}</span></div>
          <div class="stat"><b>${I.fire}${streak}</b><span>${H('home.streak')}</span></div>
        </div>
        <div class="bar"><i style="width:${Math.round(allDone / LESSONS.length * 100)}%"></i></div>
        ${classBox}
        ${S.klass ? `<div class="joinbox in"><b>${I.users} ${esc(S.klass.name)}</b><p class="muted">${H('class.you', { n: S.klass.nickname })} · ${H('set.code')} <span class="mono">${esc(S.klass.set_code)}</span></p><button class="btn btn-ghost btn-sm" data-act="classInfo">${I.gear}${H('set.title')}</button></div>` : setBoxHTML()}
      </div>
    </section>
    ${assign}${taskCard}
    ${S.pinNeeded ? `<section class="card mixcard pincard"><div><span class="drill-ic">🔢</span><div><b>${H('pin.setTitle')}</b><p class="muted">${H('pin.setSub')}</p></div></div><button class="btn btn-ok" data-act="setPin">${H('pin.setNow')}</button></section>` : ''}
    <section class="home-group"><h2 class="home-h">${H('hm.learn')}</h2></section>
    ${chaptersHTML()}
    <section class="home-group"><h2 class="home-h">${H('hm.practice')}</h2><div class="home-grid">
    <section class="card mixcard drillcard">
      <div><span class="drill-ic">🧱</span><div><b>${H('bs.title')} <span class="tag">${BASIC_CORE.filter(x => bsState(x.key).clear).length} / ${BASIC_CORE.length}</span></b><p class="muted">${H('bs.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/basics">${H('bs.open')}</a>
    </section>
    <section class="card mixcard drillcard cqcard">
      <div><span class="drill-ic">🧩</span><div><b>${H('cq.title')} <span class="tag">${CQ_SETS.filter(k => cqRec(k).best === CQ_N).length} / ${CQ_SETS.length}</span></b><p class="muted">${H('cq.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/clauses">${H('cq.open')}</a>
    </section>
    <section class="card mixcard drillcard prcard">
      <div><span class="drill-ic">🎚</span><div><b>${H('pr.title')}</b><p class="muted">${H('pr.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/practice">${H('pr.open')}</a>
    </section>
    <section class="card mixcard drillcard">
      <div><span class="drill-ic">⇅</span><div><b>${H('drill.title')}</b><p class="muted">${H('drill.sub')}</p></div></div>
      <a class="btn btn-ghost" href="#/drill">${H('drill.start')}</a>
    </section>
    <section class="card mixcard">
      <div>${I.shuffle}<div><b>${H('mix.title')}</b><p class="muted">${H('mix.sub')}</p></div></div>
      <a class="btn btn-ghost" href="#/mix">${H('mix.start')}</a>
    </section>
    <section class="card mixcard drillcard solvedcard"><div><span class="drill-ic">✓</span><div><b>${H('mine.title')}</b><p class="muted">${H('mine.sub')}</p></div></div><a class="btn btn-ghost" href="#/solved">${H('mine.open')}</a></section>
    <section class="card mixcard drillcard">
      <div><span class="drill-ic">🗂</span><div><b>${H('tp.title')}</b><p class="muted">${H('tp.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/table">${H('tp.open')}</a>
    </section>
    </div></section>
    <section class="home-group"><h2 class="home-h">${H('hm.test')}</h2><div class="home-grid">
    <section class="card mixcard drillcard rkcard">
      <div><span class="drill-ic">🏅</span><div><b>${H('rk.title')}${(n => (n ? ` <span class="tag">${H('rk.taken', { n, m: RK_CHAPTERS.length * RK_TIERS.length })}</span>` : ''))(Object.entries(S.progress.rank || {}).filter(([k, r]) => rankParse(k) && r.hist && r.hist.length).length)}</b><p class="muted">${H('rk.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/rank">${H('rk.open')}</a>
    </section>
    <section class="card mixcard drillcard">
      <div><span class="drill-ic">📝</span><div><b>${H('ck.title')}</b><p class="muted">${H('ck.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/check">${H('ck.open2')}</a>
    </section>
    </div></section>
    <section class="home-group"><h2 class="home-h">${H('hm.python')}</h2><div class="home-grid">
    <section class="card mixcard drillcard pycard">
      <div><span class="drill-ic py-ic">pd</span><div><b>${H('pd.title')} <span class="tag">${PD_LESSONS.filter(l => ((S.progress.py || {})[l.key] || {}).clear).length} / ${PD_LESSONS.length}</span></b><p class="muted">${H('pd.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/py">${H('pd.open')}</a>
    </section>
    </div></section>
  </main>`;
}
function setBoxHTML() {
  const s = S.set;
  return `<details class="setbox"><summary><span class="setbox-label">${esc(s.custom ? T('set.custom') : T('set.today'))}</span><span class="setbox-code">${esc(s.code)}</span></summary>
    <p class="tip">${H('set.tip')}</p>
    <div class="setbox-actions">
      <button class="btn btn-ghost btn-sm" data-act="newSet">${I.shuffle}${H('set.new')}</button>
      ${s.custom ? `<button class="btn btn-ghost btn-sm" data-act="todaySet">${H('set.backToday')}</button>` : ''}
    </div>
    <form data-form="set" class="inline-form"><input name="code" maxlength="16" placeholder="${esc(T('set.code'))}" aria-label="${esc(T('set.code'))}" autocomplete="off"><button class="btn btn-ghost btn-sm">${H('set.apply')}</button></form>
  </details>`;
}

/* ---------- lesson ---------- */
function lessonHTML() {
  const { lesson, probs, prob } = current();
  const ch = CHAPTERS.find(c => c.key === lesson.ch);
  const st = stateOf(lesson);
  const prevL = LESSONS[lesson.index - 1], nextL = LESSONS[lesson.index + 1];
  document.title = `${lessonTitle(lesson, L())} · SQL Practice`;
  S.progress.last = { key: lesson.key, idx: prob.idx }; save();

  const side = `<aside class="side" style="--cc:var(--c-${ch.key})">
    <div class="card side-card">
      <div class="chap">${H('lesson.of', { a: lesson.no })} · ${rubyHTML(raw('ch.' + ch.key, L()))}</div>
      <h1>${lessonTitleHTML(lesson, L())}</h1>
      ${textbookPage(lesson) ? `<div class="book-ref" title="${esc(T('book.inAppTip'))}">${I.book}${H('book.inApp', { n: textbookPage(lesson) })}</div>` : ''}
      ${hasLecture(lesson.key) ? `<a class="btn btn-ghost btn-sm lec-open" href="#/lecture/${lesson.key}">📽 ${H('lec.open')}</a>` : ''}
      <div class="point"><b>${H('lesson.point')}</b>${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div>
    </div>
    ${lesson.kind === 'join' ? shortSqlHTML(lesson) : ''}
    <nav class="card plist" aria-label="${esc(T('lesson.problems'))}">
      <div class="plist-title"><span>${H('lesson.problems')}</span><span>${st.count}/${probs.length}</span></div>
      ${probs.map(p => `<a class="pitem st-${p.stage} ${p.idx === prob.idx ? 'on' : ''} ${isSolved(p.id) ? 'solved' : ''}" href="#/l/${lesson.key}/${p.idx}" ${p.idx === prob.idx ? 'aria-current="page"' : ''}>
        <span class="ck"></span><span class="pt"><b>${stageLabelH(p)}</b><span>${esc(p.stage === 'demo' ? T('stage.demoSub') : themeName(p, L()))}</span></span></a>`).join('')}
      ${st.done ? `<div class="done-banner">✓ ${H('lesson.done')}</div>` : `<div class="rule">${H(probs.some(p => p.fmt) ? 'lesson.ruleAll' : lesson.kind === 'quiz' ? 'lesson.ruleQuiz' : stagesOf(lesson).includes('order') ? 'lesson.rule' : 'lesson.ruleNoOrder')}</div>`}
    </nav>
    ${levelsOf(lesson.key).length > 1 ? `<a class="card drill-link" href="#/practice/${lesson.key}"><span class="drill-ic">🎚</span><span><b>${H('pr.btn')}</b><small class="muted">${H('pr.btnSub', { n: levelsOf(lesson.key).length })}</small></span>${I.next}</a>` : ''}
    ${S.engine.drillLessons().has(lesson.key) ? `<a class="card drill-link" href="#/drill/${lesson.key}"><span class="drill-ic">⇅</span><span><b>${H('drill.btn')}</b><small class="muted">${H('drill.count', { n: (S.progress.drill || {})[lesson.key] || 0 })}</small></span>${I.next}</a>` : ''}
    <div class="lesson-nav">
      ${prevL ? `<a class="btn btn-ghost btn-sm" href="#/l/${prevL.key}/0">${I.prev}${H('btn.prevLesson')}</a>` : '<span></span>'}
      ${nextL ? `<a class="btn btn-ghost btn-sm" href="#/l/${nextL.key}/0">${H('btn.nextLesson')}${I.next}</a>` : ''}
    </div>
  </aside>`;

  return `<main class="wrap">
    <div class="crumbs"><a href="#/">${H('nav.home')}</a><span>›</span><span>${rubyHTML(raw('ch.' + ch.key, L()))}</span><span>›</span><span>${lessonTitleHTML(lesson, L())}</span></div>
    <div class="lesson-layout">${side}<div class="main" id="ws">${workspaceHTML(prob)}</div></div>
  </main>`;
}

/* ---------- review / mix session; the ordering drill ---------- */
const DRILL_N = 10;
const drillLevel = () => Store.get('sqln.drillLevel', 'mix');   // 'mix' | '1' | '2'
/** 10 ordering problems: from one lesson (#/drill/<key>) or from the lessons the student has started */
function startDrill(key) {
  const ok = S.engine.drillLessons();
  let pool;
  if (key) pool = [key];
  else {
    const touched = LESSONS.filter(l => ok.has(l.key) && problemsOf(l).some(p => isSolved(p.id))).map(l => l.key);
    pool = touched.length ? touched : LESSONS.filter(l => ok.has(l.key)).slice(0, 6).map(l => l.key);
  }
  const R = makeRng(`drill|${Date.now()}`), lv = drillLevel();
  const items = [], seen = new Set();
  for (let i = 0; items.length < DRILL_N && i < DRILL_N * 4; i++) {
    const level = lv === 'mix' ? (items.length % 2) + 1 : +lv;
    const p = S.engine.drillProblem(LESSON_BY_KEY[R.pick(pool)], `drill|${Date.now()}|${i}`, level);
    if (p && !seen.has(p.id)) { seen.add(p.id); items.push(p); }
  }
  S.session = { kind: 'drill', key, items, i: 0, done: {}, streak: 0, best: 0 };
}
function startSession(kind) {
  if (kind === 'drill') return startDrill(S.route.key);
  const day = todayCode();
  let keys;
  if (kind === 'review') {   // by pattern: what is waiting today, each in the format of its step
    const n = (S.rvRound = (S.rvRound || 0) + 1);
    const items = patPick(S.progress, today(), S.engine).map(x => Object.assign(patProblem(S.engine, x.lesson, x.topic, x.st, `rv|${day}|${n}|${x.key}`), { fresh: !x.st }));
    S.session = { kind, items, i: 0, done: {}, moves: {} };
    return;
  } else {
    const touched = LESSONS.filter(l => problemsOf(l).some(p => isSolved(p.id))).map(l => l.key);
    const pool = touched.length ? touched : LESSONS.slice(0, 6).map(l => l.key);
    const R = makeRng(`mix|${Date.now()}`);
    keys = Array.from({ length: 5 }, () => R.pick(pool));
  }
  const items = keys.map((k, i) => S.engine.reviewProblem(LESSON_BY_KEY[k], `${kind}|${day}|${k}|${i}|${kind === 'mix' ? Date.now() : ''}`));
  S.session = { kind, items, i: 0, done: {} };
}
function sessionHTML() {
  const kind = S.route.kind;
  if (kind === 'check') return checkHTML();
  if (kind === 'table') return oneTableHTML();
  if (kind === 'prac') return pracHTML();
  if (kind === 'level') return levelHTML();
  if (kind === 'rank') return rankHTML();
  if (kind === 'basics') return basicsHTML();
  if (kind === 'bsmix') return bsMixHTML();
  if (!S.session || S.session.kind !== kind || (kind === 'drill' && S.session.key !== S.route.key)) startSession(kind);
  const ses = S.session;
  document.title = `${T(kind === 'review' ? 'nav.review' : kind === 'drill' ? 'drill.title' : 'mix.title')} · SQL Practice`;
  if (kind === 'drill') return drillHTML(ses);
  if (!ses.items.length) {
    return `<main class="wrap narrow"><section class="card empty">
      <div class="empty-icon">${I.check}</div><h1>${H('review.none')}</h1><p class="muted">${H('review.noneSub')}</p>
      <div class="row-btns"><a class="btn btn-primary" href="#/mix">${I.shuffle}${H('mix.start')}</a><a class="btn btn-ghost" href="#/mastery">${H('rv.map')}</a><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></div></section></main>`;
  }
  if (ses.i >= ses.items.length && kind === 'review') return reviewDoneHTML(ses);
  if (ses.i >= ses.items.length) {
    const ok = Object.values(ses.done).filter(Boolean).length;
    return `<main class="wrap narrow"><section class="card empty">
      <div class="empty-icon">${I.fire}</div><h1>${H('review.finished')}</h1><p class="big-score">${ok} / ${ses.items.length}</p>
      <div class="row-btns"><a class="btn btn-primary" href="#/" >${H('nav.home')}</a><button class="btn btn-ghost" data-act="mixAgain">${I.shuffle}${H('mix.again')}</button></div></section></main>`;
  }
  const prob = ses.items[ses.i];
  const lesson = LESSON_BY_KEY[prob.lesson];
  return `<main class="wrap">
    <div class="session-head">
      <h1>${I.repeat} ${H(kind === 'review' ? 'review.title' : 'mix.title')}</h1>
      <div class="session-progress"><span>${ses.i + 1} / ${ses.items.length}</span><div class="bar"><i style="width:${Math.round(ses.i / ses.items.length * 100)}%"></i></div></div>
    </div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${H('lesson.of', { a: lesson.no })}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        ${prob.pat ? patBoxHTML(prob) : ''}
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
/* ---------- level (レベル): #/level = the level and what to do, #/level/test = the placement test, #/level/go = a round of practice ---------- */
const lvState = () => (S.progress.level && Number.isInteger(S.progress.level.lv) ? S.progress.level : null);
const chName = k => rubyHTML(raw('ch.' + k, L()));
/** tell the class (the teacher's page reads the latest row); once for each change */
function levelSend() {
  const st = lvState(); if (!st || !S.klass || !backend.enabled) return;
  const tag = `${S.klass.id}|${levelTag(st)}|${st.at}`;
  if (Store.get('sqln.levelSent', '') === tag) return;
  Store.set('sqln.levelSent', tag);
  backend.logAttempt({ class_id: S.klass.id, problem_id: levelTag(st), lesson: 'level', stage: 'review', ok: true, reason: null, sql: '' });
}
function levelSet(st) { S.progress.level = st; save(); levelSend(); }
const fmtLadderHTML = at => `<div class="rv-ladder">${LV_FORMATS.map((f, i) => `<span class="${i < at ? 'done' : i === at ? 'cur' : ''}">${H(f === 'fill' ? 'stage.fill' : f === 'order2' ? 'stage.order' : 'rv.write')}</span>`).join('<i>→</i>')}</div>`;
function levelStepsHTML(st) {
  return `<ol class="lv-steps">${LV_CHAPTERS.map((k, i) => { const ok = st && (i < st.lv || passed(st.prof[i])), cur = st && i === st.lv;
    return `<li class="${ok ? 'ok' : cur ? 'cur' : ''}" style="--cc:var(--c-${k})"><b>${ok ? '✓' : i + 1}</b><span>${chName(k)}</span>${st && st.prof[i] !== null && st.prof[i] !== undefined && st.at ? `<small class="lv-sc sc${Math.min(3, st.prof[i])}">${H('lv.sc.' + Math.min(3, st.prof[i]))}</small>` : ''}</li>`; }).join('')}</ol>`;
}
function levelHubHTML() {
  const st = lvState();
  if (!st) return `<main class="wrap narrow"><section class="card empty lv-hero"><div class="empty-icon">🎯</div><h1>${H('lv.title')}</h1><p class="muted">${H('lv.intro')}</p>
      ${levelStepsHTML(null)}<p class="muted small">${H('lv.testNoteA')}</p>
      <div class="row-btns"><a class="btn btn-primary btn-lg" href="#/level/test">${H('lv.startTest')}${I.next}</a><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></div></section></main>`;
  const ch = targetChapter(st), first = ch ? chapterLessons(ch)[0] : null;
  return `<main class="wrap narrow lv-hub"><section class="card lv-card">
      <div class="lv-badge"><small>${H('lv.title')}</small><b>Lv.${st.lv}</b><span class="muted small">/ ${LV_MAX}</span></div>
      <div class="lv-now">${ch ? `<small class="muted">${H('lv.learning')}</small><h2 style="--cc:var(--c-${ch})">${chName(ch)}</h2>${fmtLadderHTML(st.fmt || 0)}
          <p class="muted small">${(st.fmt || 0) < 2 ? H('lv.ruleUp') : H('lv.rulePass', { a: st.streak || 0, b: LV_STREAK })}</p>` : `<h2>🎉 ${H('lv.allDone')}</h2><p class="muted small">${H('lv.allDoneSub')}</p>`}</div>
      <div class="row-btns left"><a class="btn btn-primary btn-lg" href="#/level/go">${I.repeat}${H('lv.practice')}</a>${first ? `<a class="btn btn-ghost" href="#/l/${first}/0">${H('lv.toLessons')}</a>` : ''}</div></section>
    <section class="card lv-card2"><h2>${H('lv.map')}</h2>${levelStepsHTML(st)}
      <div class="row-btns left"><button class="btn btn-ghost btn-sm" data-act="levelRetest">${H('lv.retest')}</button></div></section></main>`;
}
function levelHTML() {
  document.title = `${T('lv.title')} · SQL Practice`;
  const sub = S.route.sub;
  if (!sub || (sub === 'go' && !lvState())) { if (S.session && S.session.kind === 'level') S.session = null; return levelHubHTML(); }
  if (!S.session || S.session.kind !== 'level' || S.session.sub !== sub) {
    const seed = randomCode(5);
    S.session = sub === 'test' ? lvTestStart(seed) : { kind: 'level', sub, items: buildRound(S.engine, lvState(), seed), i: 0, done: {}, before: lvState() };
  }
  const ses = S.session;
  if (ses.end || ses.i >= ses.items.length) return sub === 'test' ? levelTestDoneHTML(ses) : levelRoundDoneHTML(ses);
  const prob = ses.items[ses.i], lesson = LESSON_BY_KEY[prob.lesson], st = lvState();
  const n = ses.items.length;
  return `<main class="wrap">
    <div class="session-head">
      <h1>🎯 ${H(sub === 'test' ? 'lv.testTitle' : 'lv.practice')}</h1>
      ${sub === 'test' ? '' : `<b class="qk-need">Lv.${st.lv}</b>`}
      ${sub === 'test' ? lvTestMapHTML(ses) : `<div class="session-progress"><span>${ses.i + 1} / ${n}</span><div class="bar"><i style="width:${Math.round(ses.i / n * 100)}%"></i></div></div>`}
    </div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${chName(lesson.ch)}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        ${sub === 'test' ? `${prob.lvStep ? `<p class="lv-part p-${prob.lvStep.part}">${H('lv.part.' + prob.lvStep.part)}</p>` : ''}<p class="muted small">${H('lv.testRule')}</p><p class="muted small">${H('lv.adapt')}</p><button class="btn btn-ghost btn-sm" data-act="sessionNext">${H('lv.dontKnow')}</button>`
    : `${prob.target ? `<div class="rv-pat"><small class="muted">${H('lv.learning')}</small>${fmtLadderHTML(st.fmt || 0)}</div>` : `<p class="muted small">${H('lv.keep')}</p>`}
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details>`}</aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
function levelTestDoneHTML(ses) {
  if (!ses.saved) { ses.saved = true; levelSet(ses.T ? adaptiveResult(ses.T, Date.now()) : afterTest(ses.items, ses.done, Date.now())); }
  const st = lvState(), ch = targetChapter(st), asked = ses.items.filter(p => ses.done[p.id] !== undefined);
  return `<main class="wrap narrow lv-hub"><section class="card empty lv-hero"><div class="empty-icon">🎯</div><h1>${H('lv.result')}</h1>
      <p class="lv-big">Lv.${st.lv}<small> / ${LV_MAX}</small></p>
      <p class="muted">${ch ? H('lv.resultNext', { c: T('ch.' + ch).replace(/\{([^|}]+)\|[^}]+\}/g, '$1') }) : H('lv.allDone')}</p>
      ${levelStepsHTML(st)}${ses.T ? `<p class="muted small">${H('lv.how', { n: asked.length })}</p>` : ''}
      <div class="row-btns"><a class="btn btn-primary btn-lg" href="#/level/go">${I.repeat}${H('lv.practice')}</a><a class="btn btn-ghost" href="#/level">${H('lv.title')}</a></div></section>
    ${ses.T ? `<h2 class="bs-h2">${H('lv.review')}</h2>${asked.map((p, i) => { const ok = !!ses.done[p.id], l = LESSON_BY_KEY[p.lesson], a = (S.runs[p.id] || {}).sql;
      return `<details class="card lv-rv ${ok ? 'ok' : 'ng'}"><summary><b>${ok ? '○' : '×'} Q${i + 1}</b><span style="--cc:var(--c-${l.ch})">${chName(l.ch)}</span><span class="muted small">${p.lvStep ? H('lv.part.' + p.lvStep.part) : ''}</span></summary>
        <p class="prob-text">${problemHTML(p, L())}</p>${a ? `<div class="muted small">${H('lv.yours')}</div><pre class="sql">${highlightSQL(a)}</pre>` : ''}<div class="muted small">${H('cq.good')}</div><pre class="sql">${highlightSQL(p.sql)}</pre></details>`; }).join('')}` : ''}</main>`;
}
/* the adaptive placement test (level.js): the next problem is made when the last one is answered */
function lvTestStart(seed) {
  const T = adaptiveStart(seed), it = adaptiveNext(T), p = it && adaptiveProblem(S.engine, T, it, 0, []);
  return { kind: 'level', sub: 'test', T, items: p ? [p] : [], i: 0, done: {}, ans: {} };
}
/** after a problem of the test (answered or skipped): what kind of mistake, then the next problem or the end */
function lvTestStep(ses) {
  const p = ses.items[ses.i]; if (!p || !p.lvStep || ses.end) return;
  const ok = ses.done[p.id] === true, run = S.runs[p.id];
  let why = null;
  if (!ok) {
    const keys = run && run.dx ? run.dx.map(d => d.key) : [];
    const shape = run && run.sql ? stepForMistake(Object.assign({}, p, { test: false }), run.sql, run.dx) : null;
    why = run && run.sql ? mistakeKind(p.lvStep.c, keys, shape) : 'concept';
  }
  ses.T = adaptiveAnswer(ses.T, p.lvStep, ok, why);
  const it = adaptiveNext(ses.T);
  const q = it && adaptiveProblem(S.engine, ses.T, it, ses.items.length, ses.items.map(x => x.sql));
  if (q) ses.items.push(q); else ses.end = true;
}
/** the chapters of the test: decided (with the score), the one now, the ones to come */
function lvTestMapHTML(ses) {
  const A = ses.T, cur = ses.items[ses.i] && ses.items[ses.i].lvStep;
  return `<div class="lv-map"><span class="lv-qn">Q${ses.i + 1}</span>${A.chs.map(c => { const sc = A.score[c], now = cur && cur.c === c;
    return `<span class="lv-mc ${sc !== undefined ? 'sc' + sc : ''} ${now ? 'now' : ''}" style="--cc:var(--c-${LV_CHAPTERS[c]})" title="${esc(T('ch.' + LV_CHAPTERS[c]))}">${c + 1}${sc !== undefined ? `<small>${esc(T('lv.sc.' + sc))}</small>` : ''}</span>`; }).join('')}</div>`;
}
function levelRoundDoneHTML(ses) {
  if (!ses.res) { ses.res = afterRound(ses.before, ses.items, ses.done, Date.now()); levelSet(ses.res.st); }
  const r = ses.res, st = r.st, ok = ses.items.filter(p => ses.done[p.id]).length, ch = targetChapter(st);
  const msg = r.up ? H('lv.up', { n: st.lv }) : r.move === 'up' ? H('lv.fmtUp') : r.move === 'down' ? H('lv.fmtDown') : (ses.before.fmt || 0) >= 2 && st.streak ? H('lv.rulePass', { a: st.streak, b: LV_STREAK }) : H('lv.again');
  return `<main class="wrap narrow lv-hub"><section class="card empty lv-hero ${r.up ? 'up' : ''}"><div class="empty-icon">${r.up ? '🎉' : I.fire}</div><h1>${r.up ? `Lv.${st.lv}` : H('review.finished')}</h1>
      <p class="big-score">${ok} / ${ses.items.length}</p><p class="${r.up ? 'qk-break' : 'muted'}">${msg}</p>
      ${ch ? `<div class="lv-now center"><small class="muted">${H('lv.learning')}：${chName(ch)}</small>${fmtLadderHTML(st.fmt || 0)}</div>` : ''}
      <div class="row-btns"><button class="btn btn-primary btn-lg" data-act="levelMore">${I.repeat}${H('rv.more', { n: 5 })}</button><a class="btn btn-ghost" href="#/level">${H('lv.title')}</a><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></div></section></main>`;
}
/* ---------- the root drill (基礎の型): #/basics = the steps, #/basics/<step> = practise one shape ---------- */
const bsState = k => basicNorm((S.progress.basics || {})[k]);
const SLOT = { col: 'col', group: 'col', num: 'col', key: 'col', alias: 'col', table: 'table', value: 'val', text: 'val', number: 'val', n: 'val', min: 'val', max: 'val', skip: 'val', cond: 'cond', expr: 'expr' };
const slotName = k => H(k === 'cond' ? 'bs.slot.cond' : k === 'expr' ? 'bs.slot.expr' : 'order.g.' + k);
/** the name of a step: the core ones have their own, the others are the lesson's title */
const bsName = key => (BASIC_BY_KEY[key].core ? H('bs.s.' + key) : `${LESSON_BY_KEY[BASIC_BY_KEY[key].lesson].no}. ${lessonTitleHTML(LESSON_BY_KEY[BASIC_BY_KEY[key].lesson], L())}`);
/** a shape with its slots: SELECT [列], [列] FROM [テーブル]; */
function shapeHTML(shape) {
  return `<code class="bs-shape">${String(shape).replace(/SELECT \.\.\. FROM/, 'SELECT {col} FROM').replace(/, \.\.\./g, '').split(/(\{[a-z]+\})/).map(part => { const m = /^\{([a-z]+)\}$/.exec(part); return m ? absWordH(slotWord(m[1])) : highlightSQL(part); }).join('')}</code>`;
}
const slotWord = slot => (['cond', 'expr', 'alias'].includes(slot) ? slot : SLOT[slot] === 'table' ? 'table' : SLOT[slot] === 'col' ? 'col' : 'val');
const fmtName = tok => H(tok === 'afill' ? 'stage.fill' : tok === 'awrite' ? 'rv.write' : 'stage.order');
function bsLadderHTML(st, step) {
  return `<div class="rv-ladder">${step.formats.map((f, i) => `<span class="${st.clear || i < st.f ? 'done' : i === st.f ? 'cur' : ''}">${fmtName(f)}</span>`).join('<i>→</i>')}</div>`;
}
const bsNeed = (st, step) => (st.clear ? H('bs.cleared') : st.f < step.formats.length - 1 ? H('bs.needUp', { n: BASIC_UP - st.run }) : H('bs.needClear', { n: BASIC_CLEAR - st.run }));
function basicsHubHTML() {
  const next = nextStep(S.progress.basics), done = BASIC_CORE.filter(s => bsState(s.key).clear).length;
  return `<main class="wrap narrow bs-hub"><h1 class="page-title">🧱 ${H('bs.title')}</h1><p class="muted">${H('bs.sub')}</p>
    <div class="card bs-mixcard"><div><b>🔀 ${H('bs.all.title')}</b><p class="muted small">${H('bs.all.sub', { n: 10 })}</p></div><a class="btn btn-primary" href="#/basics/mix/go">${H('bs.start')}${I.next}</a></div>
    <p class="cq-link"><a class="btn btn-ghost btn-sm" href="#/clauses">🧩 ${H('cq.title')}${I.next}</a></p>
    <div class="card bs-top"><b>${done} / ${BASIC_CORE.length}</b><span class="muted small">${H('bs.mastered')}</span><div class="bar"><i style="width:${Math.round(done / BASIC_CORE.length * 100)}%"></i></div>
      <a class="btn btn-primary" href="#/basics/${next}">${H('bs.go')}${I.next}</a></div>
    <ol class="bs-steps">${BASIC_CORE.map((st, i) => { const x = bsState(st.key), head = i === 0 ? 'bs.groupSelect' : st.key === 'insert' ? 'bs.groupChange' : null;
      return `${head ? `<li class="bs-group">${H(head)}</li>` : ''}${stepLi(st, i, x)}`; }).join('')}</ol>
    <h2 class="bs-h2">${H('bs.detail')}</h2><p class="muted small">${H('bs.detailSub')}</p>
    ${CHAPTERS.map(ch => { const ss = BASIC_DETAIL.filter(st => st.ch === ch.key); if (!ss.length) return ''; const got = ss.filter(st => bsState(st.key).clear).length, open = ss.some(st => bsState(st.key).n);
      return `<details class="bs-ch" style="--cc:var(--c-${ch.key})" ${open ? 'open' : ''}><summary><b>${rubyHTML(raw('ch.' + ch.key, L()))}</b><span class="muted small">${got} / ${ss.length}</span></summary>
        <ol class="bs-steps">${ss.map(st => stepLi(st, null, bsState(st.key))).join('')}</ol></details>`; }).join('')}</main>`;
}
function stepLi(st, i, x) {
  const next = nextStep(S.progress.basics);
  return `<li class="card bs-step ${x.clear ? 'ok' : st.key === next ? 'cur' : ''}"><div class="bs-no">${x.clear ? '✓' : i === null ? '·' : i + 1}</div>
        <div class="bs-body"><b>${bsName(st.key)}</b>${shapeHTML(st.shape)}${bsLadderHTML(x, st)}</div>
        <a class="btn ${st.key === next ? 'btn-primary' : 'btn-ghost'} btn-sm" href="#/basics/${st.key}">${H(x.n ? 'bs.again' : 'bs.start')}</a></li>`;
}
function basicsHTML() {
  document.title = `${T('bs.title')} · SQL Practice`;
  const key = S.route.step;
  if (!key) { if (S.session && S.session.kind === 'basics') S.session = null; return basicsHubHTML(); }
  if (!S.session || S.session.kind !== 'basics' || S.session.step !== key) {
    S.session = { kind: 'basics', step: key, items: [], i: 0, done: {}, seed: randomCode(5), intro: 0 };
    if (!bsState(key).n) {   // never practised: first the shape in words, what each clause does, and a real example (見本)
      S.session.items.push({ id: `bsintro:${key}`, bsIntro: true, abs: true, af: 'intro', basic: key, lesson: BASIC_BY_KEY[key].lesson, stage: 'abs', kind: 'drill', tables: [], p: {}, theme: 'demo', shape: absShape(key), sql: '' }); S.session.intro = 1;
    }
  }
  const ses = S.session, step = BASIC_BY_KEY[key];
  if (ses.i >= ses.items.length && ses.items.length < BASIC_ROUND + ses.intro) {   // the next problem, in the format the step has reached now
    const p = basicProblem(S.engine, key, bsState(key).f, `${ses.seed}|${ses.items.length}`); if (p) ses.items.push(p);
  }
  if (ses.i >= ses.items.length) {
    const ok = ses.items.filter(p => !p.bsIntro && ses.done[p.id]).length, x = bsState(key), nk = nextStep(S.progress.basics);
    return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">${x.clear ? '🎉' : '🧱'}</div><h1>${H(x.clear ? 'bs.cleared' : 'review.finished')}</h1>
      <p class="muted">${bsName(key)}</p><p class="big-score">${ok} / ${ses.items.length - ses.intro}</p>${bsLadderHTML(x, step)}<p class="muted small">${bsNeed(x, step)}</p>
      <div class="row-btns"><button class="btn ${x.clear && nk !== key ? 'btn-ghost' : 'btn-primary'}" data-act="bsMore">${I.repeat}${H('rv.more', { n: BASIC_ROUND })}</button>
        ${x.clear && nk !== key ? `<a class="btn btn-primary" href="#/basics/${nk}">${H('bs.nextStep')}${I.next}</a>` : ''}<a class="btn btn-ghost" href="#/basics">${H('bs.title')}</a></div></section></main>`;
  }
  const prob = ses.items[ses.i], x = bsState(key);
  return `<main class="wrap">
    <div class="session-head"><h1>🧱 ${prob.bsIntro || absOpen(prob) ? bsName(key) : H('bs.title')}</h1>
      <div class="session-progress"><span>${prob.bsIntro ? H('bs.intro') : `${ses.i + 1 - ses.intro} / ${BASIC_ROUND}`}</span><div class="bar"><i style="width:${Math.round(Math.max(0, ses.i - ses.intro) / BASIC_ROUND * 100)}%"></i></div></div></div>
    <div class="session-layout">
      <aside class="card side-card bs-side"><div class="chap">${H('bs.title')}</div><h2>${H('bs.shape')}</h2>${absSideHTML(prob)}
        ${bsLadderHTML(x, step)}<p class="muted small">${bsNeed(x, step)}</p><a class="btn btn-ghost btn-xs" href="#/basics">${H('bs.allSteps')}</a></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
/* ---------- the shape in words (型をことばで): SELECT 列, 列 FROM テーブル; with no real names ----------
 * three formats (basics.js): afill = choose the missing word · aorder = put the parts in order · awrite = write it;
 * the first time a shape is opened: the shape, what each clause does, and one real example (見本) */
/** the words for the parts: this language's, and English (both are understood) */
const absWords = () => Object.fromEntries(ABS_SLOTS.map(k => [k, [...new Set([T('bs.w.' + k), t('bs.w.' + k, 'en')])]]));
const absWordH = k => `<span class="bs-slot ${k === 'table' ? 'table' : k === 'col' ? 'col' : k === 'cond' ? 'cond' : k === 'expr' ? 'expr' : 'val'}">${H('bs.w.' + k)}</span>`;
const absWordT = k => T('bs.w.' + k);
/** a token / a part: a word for a slot, or SQL */
const absTokH = x => (x[0] === '§' ? absWordH(x.slice(1)) : x[0] === '?' ? esc(x.slice(1)) : `<span class="abs-sql">${highlightSQL(x)}</span>`);
const absPieceH = toks => toks.map(absTokH).join(toks.length > 1 && toks[0] !== "'" && toks[1] !== '.' && toks[1] !== '(' ? ' ' : '');
const absPieceT = toks => toks.map(x => (x[0] === '§' ? absWordT(x.slice(1)) : x)).join(' ');
/** the goal of a problem, without the shape itself */
function absGoalH(prob) {
  const [k, v] = prob.goal || ['bs.abs.goal', { lesson: prob.lesson }];
  return k === 'bs.abs.goal' ? H(k, { name: lessonTitle(LESSON_BY_KEY[v.lesson], L()) }) : H(k, v);
}
/** each clause of the shape and what it does */
const absClausesHTML = shape => `<div class="abs-cls">${absClauses(shape).map(c => `<div class="abs-cl"><code>${absPieceH(c.toks)}</code>${c.key ? `<span>${H(c.key)}</span>` : ''}</div>`).join('')}</div>`;
/** may the shape be seen (answered right, shown after mistakes, or the example) */
const absOpen = prob => !!prob && (prob.bsIntro || (S.runs[prob.id] && (S.runs[prob.id].ok || (!prob.test && (S.runs[prob.id].shown || (S.progress.wrong[prob.id] || 0) >= 2)))));
const absSideHTML = prob => (absOpen(prob) ? shapeHTML(prob.shape || BASIC_BY_KEY[prob.basic].shape) : `<p class="muted small">${H('bs.abs.hidden')}</p>`);
function absHTML(prob) {
  const run = S.runs[prob.id], open = absOpen(prob);
  const head = `<section class="card prob abs-prob">
      <div class="prob-top"><span class="tag st-abs">${H('bs.f.abs')}</span>${prob.af !== 'intro' ? `<span class="tag">${fmtName(prob.af)}</span>` : ''}${isSolved(prob.id) ? `<span class="tag ok">✓ ${H('fb.correct')}</span>` : ''}</div>
      <p class="inst">${H(prob.af === 'intro' ? 'bs.abs.introInst' : 'bs.abs.inst.' + prob.af)}</p>
      <p class="prob-text">${prob.af === 'intro' ? bsName(prob.basic) : absGoalH(prob)}</p>
    </section>`;
  const next = (run && open) || prob.af === 'intro' ? (S.route.view === 'session' ? `<div class="row-btns left"><button class="btn btn-ok fb-next" data-act="sessionNext">${H(prob.af === 'intro' ? 'bs.abs.startPractice' : 'btn.next')}${I.next}</button></div>` : '') : '';
  const good = `<div class="abs-good">${shapeHTML(prob.shape)}${absClausesHTML(prob.shape)}</div>`;
  if (prob.af === 'intro') {   // the example: the shape, its clauses, and a real query of this shape
    const l = LESSON_BY_KEY[prob.lesson], d = l.demo ? S.engine.demoProblem(l) : null;
    return `${head}<section class="card abs-card"><h3 class="abs-h">${H('bs.abs.thisShape')}</h3>${good}
      ${d ? `<h3 class="abs-h">${H('bs.abs.realEx')}</h3><p class="muted small">${problemHTML(d, L())}</p><pre class="sql">${highlightSQL(d.sql)}</pre>` : ''}
      <p class="muted small">${bi(`L.${l.key}.point`)}</p>${next}</section>`;
  }
  let body = '', fb = '';
  if (prob.af === 'afill') {   // choose the missing word
    const g = prob.gap, picked = run ? run.picks || [] : [], done = run && run.ok, reveal = done || (!prob.test && picked.length);
    const pieces = absPieces(prob.shape);
    body = `<div class="abs-line">${pieces.map((p, i) => (i === g.at ? `<span class="abs-gap ${reveal ? (done ? 'ok' : 'bad') : ''}">${reveal ? absPieceH(p) : '?'}</span>` : `<span class="abs-pc">${absPieceH(p)}</span>`)).join('')}</div>
      <div class="abs-choices">${g.order.map(i => { const c = g.choices[i], was = picked.includes(c);
        return `<button class="choice cq-choice ${was ? (i === 0 ? 'ok' : 'bad') : reveal && i === 0 ? 'ok' : reveal ? 'dim' : ''}" data-act="absPick" data-v="${esc(c)}" ${done || (reveal && !prob.test) || was ? 'disabled' : ''}><code class="cq-kw">${esc(c)}</code></button>`; }).join('')}</div>`;
    if (run) fb = run.ok ? `<div class="fb ok"><div class="fb-icon">✓</div><div class="fb-body"><h3>${H('bs.abs.ok')}</h3>${good}</div></div>` : `<div class="fb bad"><div class="fb-icon">?</div><div class="fb-body"><h3>${H('bs.abs.gapNg')}</h3>${prob.test ? '' : good}</div></div>`;
  } else if (prob.af === 'aorder') {   // put the parts in order
    const placed = S.progress.drafts['ao:' + prob.id] || [], done = run && run.ok;
    body = `<div class="abs-ans ${placed.length ? '' : 'empty'}">${placed.length ? placed.map((k, j) => `<button class="abs-piece in" data-act="absOut" data-v="${j}" ${done ? 'disabled' : ''}>${absPieceH(prob.pool[k].toks)}</button>`).join('') : `<span class="muted small">${H('bs.abs.tapHere')}</span>`}</div>
      <div class="abs-pool">${prob.pool.map((x, k) => (placed.includes(k) ? `<span class="abs-piece ghost">${absPieceH(x.toks)}</span>` : `<button class="abs-piece" data-act="absIn" data-v="${k}" ${done ? 'disabled' : ''}>${absPieceH(x.toks)}</button>`)).join('')}</div>
      <div class="actions"><button class="btn btn-primary btn-run" data-act="absRun" ${placed.length && !done ? '' : 'disabled'}>${I.check}${H('fill.check')}</button><button class="btn btn-ghost" data-act="absOrderClear" ${done ? 'disabled' : ''}>${I.reset}${H('bs.abs.clear')}</button></div>`;
  } else {   // write it
    const val = S.progress.drafts['a:' + prob.id] || '', ch = absChips(prob.shape, prob.id);
    const chip = (text, cls, label) => `<button type="button" class="kw-chip ${cls || ''}" data-act="absPut" data-text="${esc(text)}">${label || esc(text)}</button>`;
    const order = absClauses(prob.shape).filter(c => c.key).map(c => absPieceH([c.toks[0] === 'INSERT' ? 'INSERT INTO' : c.toks[0] === 'DELETE' ? 'DELETE FROM' : c.toks.slice(0, ['ORDER', 'GROUP', 'INNER', 'LEFT'].includes(c.toks[0]) ? 2 : 1).join(' ')]));
    body = `<div class="kwbar"><span>${H('order.g.kw')}</span>${ch.kw.map(k => chip(k)).join('')}</div>
      <div class="kwbar"><span>${H('bs.abs.parts')}</span>${ch.slots.map(k => chip(absWordT(k), 'part p-' + k, absWordH(k))).join('')}</div>
      <div class="kwbar"><span>${H('order.g.op')}</span>${ch.syms.map(k => chip(k, 'sym')).join('')}</div>
      <textarea id="abs-in" class="abs-in" rows="3" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="${esc(T('ed.yourSql'))}" ${run && run.ok ? 'readonly' : ''}>${esc(val)}</textarea>
      <div class="actions">
        <button class="btn btn-primary btn-run" data-act="absRun" ${run && run.ok ? 'disabled' : ''}>${I.check}${H('fill.check')}</button>
        <button class="btn btn-ghost" data-act="absBack">⌫ ${H('bs.abs.back')}</button>
        <button class="btn btn-ghost" data-act="absClear">${I.reset}${H('bs.abs.clear')}</button>
        ${prob.test ? '' : `<details class="abs-hint"><summary>${H('bs.abs.hint')}</summary><div class="abs-line">${order.join('<i class="abs-dots">…</i>')}<i class="abs-dots">…</i></div></details>`}
      </div>`;
  }
  if (run && prob.af !== 'afill') {
    if (run.ok) fb = `<div class="fb ok"><div class="fb-icon">✓</div><div class="fb-body"><h3>${H('bs.abs.ok')}</h3>${good}</div></div>`;
    else {
      const wrong = S.progress.wrong[prob.id] || 0, toks = run.got.map((x, i) => `<span class="abs-t ${i === run.at ? 'bad' : i > run.at ? 'after' : ''}">${x[0] === '§' ? H('bs.w.' + x.slice(1)) : esc(x[0] === '?' ? x.slice(1) : x)}</span>`).join('');
      fb = `<div class="fb bad"><div class="fb-icon">?</div><div class="fb-body"><h3>${H(run.got.some(x => x[0] === '?') ? 'bs.abs.real' : 'bs.abs.ng')}</h3>
        <div class="abs-toks">${toks}${run.at >= run.got.length ? '<span class="abs-t bad">…</span>' : ''}</div>
        ${open ? `<div class="muted small">${H('bs.abs.answer')}</div>${good}` : prob.test ? '' : `<p class="muted small">${H('hint.locked', { n: Math.max(0, 2 - wrong) })}</p>`}</div></div>`;
    }
  }
  return `${head}<section class="card editor-card abs-card">${body}${fb}${next}</section>`;
}
/** the answer goes the same way as any other (record): the ladder of the shape, a quick test, an assignment, the class log */
function absAnswer(prob, r, text) {
  const run = Object.assign({}, S.runs[prob.id] || {}, r, { grade: { ok: r.ok, reason: r.ok ? null : 'shape' }, dx: [], sql: text });
  record(prob, r.ok, run, text);
  S.runs[prob.id] = run;
  if (!r.ok && !prob.test && (S.progress.wrong[prob.id] || 0) >= 2) run.shown = true;
  render();
}
const absInput = () => document.getElementById('abs-in');
function absKeep() { const c = current(), el = absInput(); if (c && el) S.progress.drafts['a:' + c.prob.id] = el.value; }

/* ---------- in each chapter: the shapes first, the clause quiz last ---------- */
function chShapesHTML(ch) {
  const ks = (CHAPTER_SHAPES[ch] || []).filter(k => BASIC_BY_KEY[k]); if (!ks.length) return '';
  return `<div class="ch-extra ch-first"><span class="ch-x-h">🧱 ${H('bs.chFirst')}</span>${ks.map(k => { const x = bsState(k);
    return `<a class="ch-x ${x.clear ? 'done' : ''}" href="#/basics/${k}">${x.clear ? '✓ ' : ''}${bsName(k)}</a>`; }).join('')}</div>`;
}
function chQuizHTML(ch) {
  const ks = CHAPTER_QUIZ[ch] || []; if (!ks.length) return '';
  return `<div class="ch-extra ch-last"><span class="ch-x-h">🧩 ${H('cq.chLast')}</span>${ks.map(k => { const x = cqRec(k);
    return `<a class="ch-x ${x.best === CQ_N ? 'done' : ''}" href="#/clauses/${k}">${x.best === CQ_N ? '✓ ' : ''}${cqName(k)}${x.n ? ` <small class="muted">${x.best}/${CQ_N}</small>` : ''}</a>`; }).join('')}</div>`;
}

/* ---------- the shape mix (型ミックス): #/basics/mix = settings, #/basics/mix/go = solving ---------- */
const MIX_KEY = 'sqln.bsMix';
const mixConfig = () => ({ range: 'learned', fmt: 'auto', n: 10 });   // mixed practice: the shapes learned, each at its own stage
const mixLearned = st => bsState(st.key).n > 0 || stateOf(LESSON_BY_KEY[st.lesson]).done;
const mixFmtName = f => (f === 'auto' ? H('bs.mix.f.auto') : fmtName(f));
/* the teacher's assignment of the shape mix (課題): tasks.mix on the class row; everyone gets the same problems */
const taskOf = () => (S.klass && S.klass.tasks && S.klass.tasks.mix && Array.isArray(S.klass.tasks.mix.shapes) ? S.klass.tasks.mix : null);
const taskSolved = t => ((S.progress.tasks || {})[t.id] || []).length;
function taskMark(id, n) { S.progress.tasks = S.progress.tasks || {}; const l = S.progress.tasks[id] = S.progress.tasks[id] || []; if (!l.includes(n)) l.push(n); }
function taskProblems(t) {
  return slotProblems(S.engine, t.seed, Array.isArray(t.cnt) ? shapeCountSlots(S.engine, t.shapes, t.cnt, t.seed) : shapeSlots(S.engine, t.shapes, t.n, t.kind, t.seed), '')
    .map((p, i) => Object.assign({}, p, { id: `task:${t.id}:${i}`, test: false, quick: undefined, tn: i }));
}
function bsMixHTML() {
  document.title = `${T(S.route.task ? 'task.title' : 'bs.all.title')} · SQL Practice`;
  if (!S.route.go) { if (S.session && S.session.kind === 'bsmix') S.session = null; return basicsHubHTML(); }
  const tk = S.route.task ? taskOf() : null;
  if (S.route.task && !tk) return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">📌</div><h1>${H('task.none')}</h1><a class="btn btn-primary" href="#/">${H('nav.home')}</a></section></main>`;
  if (!S.session || S.session.kind !== 'bsmix' || (S.session.task || null) !== (tk ? tk.id : null)) {
    if (tk) {   // the assignment: the problems not solved yet first, then the solved ones
      const done = new Set((S.progress.tasks || {})[tk.id] || []), all = taskProblems(tk);
      S.session = { kind: 'bsmix', task: tk.id, items: [...all.filter(p => !done.has(p.tn)), ...all.filter(p => done.has(p.tn))], i: 0, done: {} };
    } else {
      const c = mixConfig(), seed = randomCode(6);
      S.session = { kind: 'bsmix', items: mixProblems(S.engine, mixSteps(c.range, mixLearned), c.fmt, c.n, k => bsState(k).f, seed), i: 0, done: {} };
    }
  }
  const ses = S.session, n = ses.items.length;
  if (ses.i >= n) {
    const ok = ses.items.filter(p => ses.done[p.id]).length, by = {};
    ses.items.forEach(p => { const b = by[p.basic] = by[p.basic] || { n: 0, ok: 0 }; b.n++; if (ses.done[p.id]) b.ok++; });
    const weak = Object.keys(by).filter(k => by[k].ok < by[k].n);
    return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">${ok === n ? '🎉' : '🔀'}</div><h1>${H('review.finished')}</h1>
      <p class="muted">${H(ses.task ? 'task.title' : 'bs.all.title')}</p><p class="big-score">${ok} / ${n}</p>${ses.task && tk ? `<p class="muted small">${H('task.total', { n: taskSolved(tk), m: tk.n })}</p>` : ''}
      <div class="row-btns"><button class="btn btn-primary" data-act="mixAgain">${I.repeat}${H('cq.again')}</button>${ses.task ? `<a class="btn btn-ghost" href="#/">${H('nav.home')}</a>` : ''}<a class="btn btn-ghost" href="#/basics">${H('bs.title')}</a></div></section>
      <h2 class="bs-h2">${H('bs.mix.result')}</h2>
      <ul class="mx-res">${Object.keys(by).map(k => `<li class="card ${by[k].ok === by[k].n ? 'ok' : 'ng'}"><b>${bsName(k)}</b><span>${by[k].ok} / ${by[k].n}</span>${by[k].ok < by[k].n ? `<a class="btn btn-ghost btn-sm" href="#/basics/${k}">${H('cq.toBasics')}${I.next}</a>` : '<span class="mx-ok">✓</span>'}</li>`).join('')}</ul>
      ${weak.length ? '' : `<p class="muted small center">${H('cq.perfect')}</p>`}</main>`;
  }
  const prob = ses.items[ses.i], step = BASIC_BY_KEY[prob.basic];
  return `<main class="wrap">
    <div class="session-head"><h1>${ses.task ? `📌 ${H('task.title')}` : `🔀 ${H('bs.all.title')}`}</h1>
      <div class="session-progress"><span>${ses.i + 1} / ${n}</span><div class="bar"><i style="width:${Math.round(ses.i / n * 100)}%"></i></div></div></div>
    <div class="session-layout">
      <aside class="card side-card bs-side"><div class="chap">${absOpen(prob) ? bsName(prob.basic) : H('bs.f.abs')}</div><h2>${H('bs.shape')}</h2>${absSideHTML(prob)}<a class="btn btn-ghost btn-xs" href="#/basics">${H('bs.allSteps')}</a></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}

/* ---------- the clause quiz (句ごとの基礎クイズ): #/clauses = the list, #/clauses/<clause|all> = a quiz ---------- */
const cqRec = k => Object.assign({ n: 0, best: 0, last: 0 }, (S.progress.cq || {})[k]);
const CQ_LABEL = ['A', 'B', 'C', 'D'];
/** a choice / a text of a question in the current language (values as code) */
function cqText(c) {
  if (c.kw) return `<code class="cq-kw">${esc(c.kw)}</code>`;
  if (c.sql) return `<code class="cq-sql">${highlightSQL(c.sql)}</code>`;
  if (c.code) return `<code>${esc(c.code)}</code>`;
  const inner = th(c.tx, L(), c.v && Object.fromEntries(Object.entries(c.v).map(([a, b]) => [a, `<code>${esc(b)}</code>`])));
  return `<span class="tx">${c.wrap ? th(c.wrap, L(), { cond: inner }) : inner}</span>`;
}
const cqSqlHTML = sql => `<pre class="sql cq-code">${sql.split(BLANK).map(highlightSQL).join('<span class="cq-blank">?</span>')}</pre>`;
const cqName = k => (k === 'all' ? H('cq.all') : `<code class="cq-kw">${KW[k]}</code>`);
function clausesHubHTML() {
  return `<main class="wrap narrow cq-hub"><h1 class="page-title">🧩 ${H('cq.title')}</h1><p class="muted">${H('cq.sub', { n: CQ_N })}</p>
    <ol class="cq-list">${CQ_SETS.map((k, i) => { const x = cqRec(k), full = x.best === CQ_N;
      return `<li class="card cq-item ${full ? 'ok' : ''}"><div class="bs-no">${full ? '✓' : i + 1}</div>
        <div class="cq-body"><b>${cqName(k)}</b><span class="muted small">${k === 'all' ? H('cq.allSub') : H('cq.role.' + k)}</span>${k === 'all' ? '' : `<code class="cq-ex">${highlightSQL(CQ_EXAMPLE[k])}</code>`}</div>
        <div class="cq-go"><span class="muted small">${x.n ? H('cq.best', { n: x.best, m: CQ_N }) : H('cq.notYet')}</span><a class="btn ${x.n ? 'btn-ghost' : 'btn-primary'} btn-sm" href="#/clauses/${k}">${H(x.n ? 'cq.again' : 'cq.start')}</a></div></li>`; }).join('')}</ol>
    <p class="muted small">${H('bs.homeSub')} <a href="#/basics">${H('bs.open')}</a></p></main>`;
}
function clausesHTML() {
  document.title = `${T('cq.title')} · SQL Practice`;
  const set = S.route.set;
  if (!set) { S.cq = null; return clausesHubHTML(); }
  if (!S.cq || S.cq.set !== set) S.cq = { set, items: cqQuiz(set, `${Date.now()}|${Math.random()}`), i: 0, picks: [] };
  const q = S.cq, n = q.items.length;
  if (q.i >= n) {   // the result
    const ok = q.items.filter((x, i) => q.picks[i] === x.answer).length, missed = q.items.filter((x, i) => q.picks[i] !== x.answer);
    const idx = CQ_SETS.indexOf(set), next = CQ_SETS[idx + 1];
    return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">${ok === n ? '🎉' : '🧩'}</div><h1>${H(ok === n ? 'cq.perfect' : 'cq.done')}</h1>
      <p class="muted">${cqName(set)}</p><p class="big-score">${ok} / ${n}</p>
      <div class="row-btns"><button class="btn ${ok === n && next ? 'btn-ghost' : 'btn-primary'}" data-act="cqAgain">${I.repeat}${H('cq.again')}</button>
        ${next ? `<a class="btn ${ok === n ? 'btn-primary' : 'btn-ghost'}" href="#/clauses/${next}">${cqName(next)}${I.next}</a>` : ''}<a class="btn btn-ghost" href="#/clauses">${H('cq.list')}</a></div>
      <p><a class="btn btn-ghost btn-sm" href="#/basics/${CQ_BASIC[set]}">🧱 ${H('cq.toBasics')}</a></p></section>
      ${missed.length ? `<h2 class="bs-h2">${H('cq.missed')}</h2>${missed.map(x => `<div class="card cq-miss"><p><b>${H(x.ask, x.askV)}</b></p>${x.shown ? `<p class="cq-shown">${cqText(x.shown)}</p>` : ''}${x.sql ? cqSqlHTML(x.sql) : ''}
        <p class="cq-ans">✓ ${cqText(x.choices[x.answer])}</p><p class="muted small">${H('cq.tip.' + (x.clause === 'seq' ? 'seq' : x.clause))}</p></div>`).join('')}` : ''}</main>`;
  }
  const x = q.items[q.i], picked = q.picks[q.i], shown = picked !== undefined, right = picked === x.answer;
  return `<main class="wrap narrow cq-page">
    <div class="session-head"><h1>🧩 ${cqName(set)}</h1>
      <div class="session-progress"><span>${q.i + 1} / ${n}</span><div class="bar"><i style="width:${Math.round(q.i / n * 100)}%"></i></div></div></div>
    <section class="card cq-q">
      <div class="cq-tag">${x.clause === 'seq' ? H('cq.all') : `<code class="cq-kw">${KW[x.clause]}</code>`}</div>
      <h2 class="cq-ask">${H(x.ask, x.askV)}</h2>
      ${x.shown ? `<p class="cq-shown">${cqText(x.shown)}</p>` : ''}${x.sql ? cqSqlHTML(x.sql) : ''}
      <div class="cq-choices ${x.choices.some(c => c.sql) ? 'wide' : ''}" role="group" aria-label="${esc(T('cq.label'))}">${x.choices.map((c, i) => `<button class="choice cq-choice ${shown ? (i === x.answer ? 'ok' : i === picked ? 'bad' : 'dim') : ''}" data-act="cqPick" data-v="${i}" ${shown ? 'disabled' : ''}><b class="cq-l">${CQ_LABEL[i]}</b>${cqText(c)}</button>`).join('')}</div>
      ${shown ? `<div class="cq-fb ${right ? 'ok' : 'bad'}"><b>${right ? H('cq.right') : H('cq.wrong', { n: CQ_LABEL[x.answer] })}</b>
        <p>${H('cq.tip.' + (x.clause === 'seq' ? 'seq' : x.clause))}</p>${x.full && x.kind !== 'read' ? `<div class="muted small">${H('cq.good')}</div><pre class="sql">${highlightSQL(x.full)}</pre>` : ''}
        <button class="btn btn-primary" data-act="cqNext">${H(q.i + 1 < n ? 'cq.next' : 'cq.finish')}${I.next}</button></div>` : ''}
    </section></main>`;
}
/* ---------- one table, many queries (同じテーブルで練習): #/table = choose, #/table/<name> = practise ---------- */
const TP_KEY = 'sqln.oneTable', TP_PER = [1, 2, 3, 5];   // problems per lesson (a lesson with fewer different queries on the table gives fewer)
function tpConfig() {
  const c = Store.get(TP_KEY, null) || {}, sets = tableSets(S.engine);
  const chapters = CHAPTERS.filter(ch => LESSONS.some(l => l.ch === ch.key && sets[0].lessons.includes(l.key))).map(ch => ch.key);
  const started = chapters.filter(k => LESSONS.some(l => l.ch === k && S.progress.lessons[l.key] && S.progress.lessons[l.key].done));
  let ch = Array.isArray(c.ch) ? c.ch.filter(k => chapters.includes(k)) : [];
  if (!ch.length) ch = started.length ? started : chapters.slice(0, 1);
  return { chapters, ch, fmt: ['fill', 'order2', 'write'].includes(c.fmt) ? c.fmt : 'write', per: TP_PER.includes(c.per) ? c.per : 1 };
}
const tpLessons = (set, cfg) => (set.join ? set.lessons : set.lessons.filter(k => cfg.ch.includes(LESSON_BY_KEY[k].ch)));
function startOneTable(ds) {
  const cfg = tpConfig(), set = tableSets(S.engine).find(x => x.key === ds);
  const items = set ? tableCourse(S.engine, ds, tpLessons(set, cfg), cfg.fmt, cfg.per, `tp|${ds}|${Date.now()}`) : [];
  S.session = { kind: 'table', ds, items, i: 0, done: {} };
}
const tpFmtName = f => H(f === 'fill' ? 'stage.fill' : f === 'order2' ? 'stage.order' : 'rv.write');
function oneTableSetupHTML() {
  const cfg = tpConfig(), sets = tableSets(S.engine);
  const seg = (k, vals, cur, label) => `<div class="seg">${vals.map(v => `<button class="${v === cur ? 'on' : ''}" data-act="tpSet" data-k="${k}" data-v="${v}" aria-pressed="${v === cur}">${label(v)}</button>`).join('')}</div>`;
  const card = set => { const n = tpLessons(set, cfg).length * (set.join ? 1 : cfg.per);
    return `<a class="card tp-card" href="#/table/${set.key}"><div class="tp-names">${set.tables.map(t => `<b class="mono">${esc(t)}</b>`).join('<i>+</i>')}</div>
      ${set.tables.map(t => `<div class="tb-cols">${ALL_TABLES[t].columns.map(([c, ty]) => `<span class="col-chip static">${esc(c)}<small>${ty === 'INTEGER' ? '123' : 'abc'}</small></span>`).join('')}</div>`).join('')}
      <span class="tp-go"><span class="muted small">${H('prob.rows', { n: ALL_TABLES[set.tables[0]].rows.length })}${set.join ? '' : ` · ${H('tp.perN', { n })}`}</span><span class="btn btn-primary btn-sm">${H('tp.begin')}${I.next}</span></span></a>`; };
  return `<main class="wrap tp-wrap"><h1 class="page-title">🗂 ${H('tp.title')}</h1><p class="muted">${H('tp.sub')}</p>
    <section class="card tp-set">
      <div class="fld"><span>${H('tp.range')}</span><div class="q-chapters">${cfg.chapters.map(k => { const on = cfg.ch.includes(k); return `<button class="btn btn-ghost btn-xs q-ch ${on ? 'on' : ''}" style="--cc:var(--c-${k})" data-act="tpSet" data-k="ch" data-v="${k}" aria-pressed="${on}">${rubyHTML(raw('ch.' + k, L()))}</button>`; }).join('')}</div></div>
      <div class="q-row"><div class="fld"><span>${H('tp.format')}</span>${seg('fmt', ['fill', 'order2', 'write'], cfg.fmt, tpFmtName)}</div>
        <div class="fld"><span>${H('tp.per')}</span>${seg('per', TP_PER, cfg.per, v => H('tp.perN', { n: v }))}</div></div>
    </section>
    <h2 class="tp-h">${H('tp.single')}</h2><div class="tp-grid">${sets.filter(x => !x.join).map(card).join('')}</div>
    <h2 class="tp-h">${H('tp.join')}</h2><div class="tp-grid">${sets.filter(x => x.join).map(card).join('')}</div></main>`;
}
function oneTableHTML() {
  document.title = `${T('tp.title')} · SQL Practice`;
  const ds = S.route.ds, set = ds ? tableSets(S.engine).find(x => x.key === ds) : null;
  if (!set) return oneTableSetupHTML();
  if (!S.session || S.session.kind !== 'table' || S.session.ds !== ds) startOneTable(ds);
  const ses = S.session, names = set.tables.map(t => `<span class="mono">${esc(t)}</span>`).join(' + ');
  if (!ses.items.length) return `<main class="wrap narrow"><section class="card empty"><h1>${H('tp.title')}</h1><p class="muted">${H('tp.none')}</p><a class="btn btn-primary" href="#/table">${H('tp.other')}</a></section></main>`;
  if (ses.i >= ses.items.length) {
    const ok = Object.values(ses.done).filter(Boolean).length;
    return `<main class="wrap narrow"><section class="card empty">
      <div class="empty-icon">${I.fire}</div><h1>${H('review.finished')}</h1><p class="muted">${names}</p><p class="big-score">${ok} / ${ses.items.length}</p>
      <div class="row-btns"><button class="btn btn-primary" data-act="tpAgain">${I.repeat}${H('tp.again')}</button><a class="btn btn-ghost" href="#/table">${H('tp.other')}</a><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></div></section></main>`;
  }
  const prob = ses.items[ses.i], lesson = LESSON_BY_KEY[prob.lesson];
  return `<main class="wrap">
    <div class="session-head">
      <h1>🗂 ${names}</h1>
      <div class="session-progress"><span>${ses.i + 1} / ${ses.items.length}</span><div class="bar"><i style="width:${Math.round(ses.i / ses.items.length * 100)}%"></i></div></div>
    </div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${H('lesson.of', { a: lesson.no })}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details>
        <div class="tp-steps">${[...new Set(ses.items.map(p => p.lesson))].map(k => { const ps = ses.items.filter(p => p.lesson === k), all = ps.every(p => ses.done[p.id]), cur = k === prob.lesson;
          return `<span class="${cur ? 'cur' : all ? 'ok' : ps.some(p => ses.done[p.id] === false) ? 'bad' : ''}" title="${esc(lessonTitle(LESSON_BY_KEY[k], L()))}">${LESSON_BY_KEY[k].no}</span>`; }).join('')}</div>
        <a class="btn btn-ghost btn-xs" href="#/table">${H('tp.other')}</a></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
/* ---------- practice by difficulty (難易度を選んで練習): #/practice = choose, #/practice/<lesson> = with that lesson, #/practice/go = solve ----------
 * one lesson: any of its own levels (Lv1 … Lvn, each a variant of its SQL and how many more columns);
 * several lessons: a band (基本 · 標準 · 発展) = the first, the middle or the last level of each */
const PR_KEY = 'sqln.prac', PR_N = [3, 5, 10, 15], PR_FMT = ['fill', 'order1', 'write'];
const prLessons = () => LESSONS.filter(l => levelsOf(l.key).length);
function prConfig() {
  const c = Store.get(PR_KEY, null) || {}, ok = new Set(prLessons().map(l => l.key)), lessons = (Array.isArray(c.lessons) ? c.lessons : []).filter(k => ok.has(k));
  const n = lessons.length === 1 ? levelsOf(lessons[0]).length : 0;
  return { lessons, lv: [1, 2, 3].includes(c.lv) ? c.lv : 1, fine: n ? Math.max(1, Math.min(n, +c.fine || 1)) : 0, fmt: PR_FMT.includes(c.fmt) ? c.fmt : 'write', n: Number.isInteger(c.n) && c.n >= 1 && c.n <= 20 ? c.n : 5 };
}
const prFmtName = f => H(f === 'fill' ? 'stage.fill' : f === 'order1' ? 'stage.order' : 'rv.write');
/** what a level of a lesson asks, as chips: its SQL, and + columns */
function lvInfoHTML(key, L) {
  const x = levelInfo(key, L); if (!x) return '';
  return `${x.sql ? `<code class="lv-sql">${esc(x.sql)}</code>` : ''}${x.more ? `<span class="lv-more">${H(x.agg ? 'dif.moreAgg' : 'dif.more', { n: x.more })}</span>` : ''}${!x.sql && !x.more ? `<span class="lv-more">${H('dif.base')}</span>` : ''}`;
}
/** one problem of a lesson at its level L, in a format (the nearest one the lesson has) */
function prProblem(key, L, fmt, seed) {
  const lesson = LESSON_BY_KEY[key], sets = S.engine.themesFor(lesson), R = makeRng(`pr|${seed}`);
  for (const ds of R.shuffle(sets)) {
    const p = S.engine.genLevel(lesson, ds, `${seed}|${ds.table || ds.key}`, L); if (!p) continue;
    const tok = kindsOf(key).includes(fmt) ? fmt : 'write', pr = makeProblem(S.engine, lesson, p, ds.table || ds.key, tok) || makeProblem(S.engine, lesson, p, ds.table || ds.key, 'write');
    if (pr) return Object.assign(pr, { id: `prac:${seed}`, kind: 'drill', lv: L });
  }
  return null;
}
const prLevelOf = (c, key) => (c.fine && c.lessons.length === 1 ? c.fine : levelFor(key, c.lv) || 1);
function pracSetupHTML() {
  const c = prConfig(), on = new Set(c.lessons), seg = (k, vals, label) => `<div class="seg">${vals.map(v => `<button class="${c[k] === v ? 'on' : ''}" data-act="prSet" data-k="${k}" data-v="${v}">${label(v)}</button>`).join('')}</div>`;
  const one = c.lessons.length === 1 ? c.lessons[0] : null, ex = c.lessons.length ? prProblem(c.lessons[0], prLevelOf(c, c.lessons[0]), 'write', `ex|${c.lessons[0]}|${prLevelOf(c, c.lessons[0])}`) : null;
  const lvPick = one ? `<div class="fld"><span>${H('dif.title')}</span><span class="muted small">${H('dif.fineNote', { n: levelsOf(one).length })}</span></div>
      <div class="lv-grid">${levelsOf(one).map(L => `<button class="lv-b ${c.fine === L ? 'on' : ''}" data-act="prSet" data-k="fine" data-v="${L}"><b>Lv${L}</b><span>${lvInfoHTML(one, L)}</span></button>`).join('')}</div>`
    : `<div class="fld"><span>${H('dif.title')}</span>${seg('lv', [1, 2, 3], v => `${H('dif.' + v)}`)}</div><p class="muted small">${H('dif.about.' + c.lv)} ${c.lessons.length > 1 ? H('dif.bandNote') : ''}</p>`;
  return `<main class="wrap narrow pr-hub"><h1 class="page-title">🎚 ${H('pr.title')}</h1><p class="muted">${H('pr.sub')}</p>
    <section class="card pr-set">
      <div class="fld"><span>${H('pr.lessons')}</span>${on.size ? `<button class="btn btn-ghost btn-xs" data-act="prLesson" data-v="">${H('tc.quick.none')}</button>` : ''}</div>
      <div class="qs-chs">${CHAPTERS.map(ch => { const ls = prLessons().filter(l => l.ch === ch.key); if (!ls.length) return '';
        return `<div class="qs-ch" style="--cc:var(--c-${ch.key})"><span class="qs-chn">${rubyHTML(raw('ch.' + ch.key, L()))}</span><div class="qs-ls">${ls.map(l => `<button class="qs-l ${on.has(l.key) ? 'on' : ''}" data-act="prLesson" data-v="${l.key}"><b>${l.no}</b>${lessonTitleHTML(l, L())} <small class="muted">Lv1–${levelsOf(l.key).length}</small></button>`).join('')}</div></div>`; }).join('')}</div>
      ${lvPick}
      ${ex ? `<div class="pr-ex"><small class="muted">${H('pr.example', { name: lessonTitle(LESSON_BY_KEY[ex.lesson], L()) })} · Lv${ex.lv}</small><p class="small">${problemHTML(ex, L())}</p><pre class="sql">${highlightSQL(ex.sql)}</pre></div>` : ''}
      <div class="qs-row"><div class="fld"><span>${H('tc.quick.kind')}</span>${seg('fmt', PR_FMT, prFmtName)}</div><div class="fld"><span>${H('tc.quick.count')}</span>${countPickHTML({ act: 'prSet', k: 'n', value: c.n, presets: PR_N, min: 1, max: 20, secEach: c.fmt === 'write' ? 90 : 50, lang: L() })}</div></div>
      <div class="row-btns"><a class="btn btn-primary btn-lg ${c.lessons.length ? '' : 'disabled'}" href="${c.lessons.length ? '#/practice/go' : '#/practice'}">${H('pr.start')}${I.next}</a><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></div>
      ${c.lessons.length ? '' : `<p class="muted small">${H('pr.pick')}</p>`}
    </section></main>`;
}
function pracHTML() {
  document.title = `${T('pr.title')} · SQL Practice`;
  if (S.route.pre) { const c = prConfig(); Store.set(PR_KEY, Object.assign(c, { lessons: [S.route.pre], fine: 1 })); history.replaceState(null, '', '#/practice'); S.route.pre = null; }
  if (!S.route.go) { if (S.session && S.session.kind === 'prac') S.session = null; return pracSetupHTML(); }
  const c = prConfig();
  if (!c.lessons.length) return pracSetupHTML();
  if (!S.session || S.session.kind !== 'prac') {
    const seed = randomCode(6), R = makeRng(seed), order = R.shuffle(c.lessons), items = [];
    for (let i = 0; items.length < c.n && i < c.n * 3; i++) { const k = order[i % order.length], p = prProblem(k, prLevelOf(c, k), c.fmt, `${seed}|${i}`); if (p && !items.some(x => x.sql === p.sql)) items.push(Object.assign(p, { id: `prac:${seed}:${i}` })); }
    S.session = { kind: 'prac', items, i: 0, done: {}, one: c.lessons.length === 1 ? c.lessons[0] : null, fine: c.fine, band: c.lv };
  }
  const ses = S.session, n = ses.items.length, top = ses.one ? levelsOf(ses.one).length : 3, at = ses.one ? ses.fine : ses.band;
  const what = ses.one ? `Lv${ses.fine} / ${top}` : H('dif.' + ses.band);
  if (ses.i >= n) {
    const ok = ses.items.filter(p => ses.done[p.id]).length, up = ok === n && at < top;
    return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">🎚</div><h1>${H('review.finished')}</h1><p class="muted">${what}</p><p class="big-score">${ok} / ${n}</p>
      ${up ? `<p class="qk-break">${H('pr.upNext')}</p>` : ''}
      <div class="row-btns"><button class="btn btn-primary" data-act="prAgain">${I.repeat}${H('cq.again')}</button>${up ? `<button class="btn btn-primary" data-act="prUp">${ses.one ? `Lv${at + 1}` : H('dif.' + (at + 1))}${I.next}</button>` : ''}<a class="btn btn-ghost" href="#/practice">${H('bs.mix.settings')}</a></div></section></main>`;
  }
  const prob = ses.items[ses.i], lesson = LESSON_BY_KEY[prob.lesson];
  return `<main class="wrap">
    <div class="session-head"><h1>🎚 ${H('pr.title')} <span class="tag pr-lv">${ses.one ? what : `${H('dif.' + ses.band)} · Lv${prob.lv}`}</span></h1>
      <div class="session-progress"><span>${ses.i + 1} / ${n}</span><div class="bar"><i style="width:${Math.round(ses.i / n * 100)}%"></i></div></div></div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${H('lesson.of', { a: lesson.no })}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        <div class="lv-now"><b>Lv${prob.lv}</b> ${lvInfoHTML(prob.lesson, prob.lv)}</div>
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details>
        <a class="btn btn-ghost btn-xs" href="#/practice">${H('bs.mix.settings')}</a></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
/* ---------- review by pattern: the ladder of formats, the result of a round, the mastery map ---------- */
const LV_KEYS = ['rv.lv0', 'rv.lv1', 'rv.lv2', 'rv.lv3'];
const stepName = tok => H(tok === 'fill' ? 'stage.fill' : tok.startsWith('order') ? 'stage.order' : tok === 'quiz' ? 'rv.quiz' : 'rv.write');
const patNameHTML = (key, topic) => { const l = patLabel(key, topic); return l ? rubyHTML(l[L() === 'ja' || L() === 'easy' ? L() : 'en'] || l.en) : lessonTitleHTML(LESSON_BY_KEY[key], L()); };
const ladderHTML = (lesson, at) => `<div class="rv-ladder">${ladderOf(lesson).map((tok, i) => `<span class="${i < at ? 'done' : i === at ? 'cur' : ''}">${stepName(tok)}</span>`).join('<i>→</i>')}</div>`;
function patBoxHTML(prob) {
  const lesson = LESSON_BY_KEY[prob.lesson];
  return `<div class="rv-pat"><small class="muted">${H('rv.pattern')}${prob.fresh ? ` <b class="tag">${H('rv.new')}</b>` : ''}</small><b>${patNameHTML(prob.lesson, prob.topic)}</b>${ladderOf(lesson).length > 1 ? ladderHTML(lesson, prob.step) : ''}</div>`;
}
/** patterns waiting today (those due, and new ones up to one round) */
function reviewCount() { const w = patWaiting(S.progress, today(), S.engine); return w.due.length + Math.min(w.fresh.length, REVIEW_N); }
const daysText = due => { const d = Math.round((due - today()) / 86400000); return d <= 1 ? H('rv.tomorrow') : H('rv.inDays', { n: d }); };
function reviewDoneHTML(ses) {
  const ok = Object.values(ses.done).filter(Boolean).length, more = reviewCount();
  return `<main class="wrap narrow"><section class="card empty">
      <div class="empty-icon">${I.fire}</div><h1>${H('review.finished')}</h1><p class="big-score">${ok} / ${ses.items.length}</p>
      <div class="row-btns">${more ? `<button class="btn btn-primary" data-act="reviewMore">${I.repeat}${H('rv.more', { n: Math.min(more, REVIEW_N) })}</button>` : ''}<a class="btn ${more ? 'btn-ghost' : 'btn-primary'}" href="#/">${H('nav.home')}</a><a class="btn btn-ghost" href="#/mastery">${H('rv.map')}</a></div></section>
    <section class="rv-result">${ses.items.map(p => { const lesson = LESSON_BY_KEY[p.lesson], m = ses.moves[p.id], good = ses.done[p.id];
      return `<div class="card rv-item"><b class="ck-m ${good ? 'ok' : 'bad'}">${good ? '○' : m ? '×' : '–'}</b>
        <div class="rv-what"><small class="muted">${H('lesson.of', { a: lesson.no })} · ${lessonTitleHTML(lesson, L())}</small><b>${patNameHTML(p.lesson, p.topic)}</b></div>
        ${m ? `${ladderOf(lesson).length > 1 ? ladderHTML(lesson, m.to) : ''}<span class="rv-next muted small">${daysText(m.due)}</span>` : ''}</div>`; }).join('')}</section></main>`;
}
function masteryHTML() {
  document.title = `${T('rv.map')} · SQL Practice`;
  const t = today(); let all = 0, got = 0;
  const rows = CHAPTERS.map(ch => { const ls = LESSONS.filter(l => l.ch === ch.key); if (!ls.length) return '';
    return `<section class="card rv-ch" style="--cc:var(--c-${ch.key})"><h2>${rubyHTML(raw('ch.' + ch.key, L()))}</h2>${ls.map(l => { const done = !!(S.progress.lessons[l.key] && S.progress.lessons[l.key].done), lv = lessonLevels(S.progress, l.key, S.engine);
      all += lv.length; got += lv.filter(x => x.level === 3).length;
      return `<div class="rv-row ${done ? '' : 'off'}"><a class="rv-lesson" href="#/l/${l.key}/0"><span class="lesson-num">${l.no}</span><span>${lessonTitleHTML(l, L())}</span></a>
        <div class="rv-cells">${lv.map(x => { const due = done && !!(x.st && x.st.n && x.st.due <= t), level = done ? x.level : 0;
          return `<span class="rv-cell lv${level} ${due ? 'due' : ''}" tabindex="0"><i></i><span class="rv-tip"><b>${lv.length > 1 ? patNameHTML(l.key, x.topic) : H(LV_KEYS[level])}</b>${lv.length > 1 ? `<small>${H(LV_KEYS[level])}</small>` : ''}${done && x.st && x.st.n && !due ? `<small>${daysText(x.st.due)}</small>` : ''}${done ? '' : `<small>${H('rv.notDone')}</small>`}</span></span>`; }).join('')}</div></div>`; }).join('')}</section>`; }).join('');
  const due = reviewCount();
  return `<main class="wrap rv-map"><h1 class="page-title">${H('rv.map')}</h1><p class="muted">${H('rv.mapSub')}</p>
    <div class="card rv-top"><div class="rv-total"><b>${got}<small> / ${all}</small></b><span>${H('rv.masteredN')}</span><div class="bar"><i style="width:${all ? Math.round(got / all * 100) : 0}%"></i></div></div>
      <div class="rv-legend">${[0, 1, 2, 3].map(i => `<span><span class="rv-cell lv${i}"><i></i></span>${H(LV_KEYS[i])}</span>`).join('')}<span><span class="rv-cell lv1 due"><i></i></span>${H('rv.dueNow')}</span></div>
      ${due ? `<a class="btn btn-primary" href="#/review">${I.repeat}${H('rv.today', { n: due })}</a>` : ''}</div>
    ${rows}</main>`;
}

/* ---------- check test (確認テスト): chosen lessons, chosen formats, random order ----------
 * #/check = the set-up form;  #/check/<code> = a test (from the form, or a teacher's link).
 * Only the first answer to each problem counts; hints and answers come at the end.
 * The lessons' own progress is not touched (the problems are copies with their own ids). */
const CHECK_HISTORY = 'sqln.checks';
function startCheck(code, cfg, seed, items) {
  Object.keys(S.progress.drafts).forEach(k => { if (k.startsWith('check:')) delete S.progress.drafts[k]; });
  Object.keys(S.runs).forEach(k => { if (k.startsWith('check:')) delete S.runs[k]; });
  seed = seed || cfg.seed || randomCode(4);
  S.session = { kind: 'check', code, cfg, seed, items: items || buildCheck(S.engine, cfg, seed), i: 0, done: {}, ans: {}, start: Date.now(), end: 0 };
}
function checkHistory() { const h = Store.get(CHECK_HISTORY, []); return Array.isArray(h) ? h : []; }
function checkHTML() {
  document.title = `${T('ck.title')} · SQL Practice`;
  const code = S.route.code;
  if (!code) {
    const hist = checkHistory().slice(-5).reverse();
    return `<main class="wrap ck-wrap"><h1 class="page-title">📝 ${H('ck.title')}</h1><p class="muted">${H('ck.sub')}</p>
      ${checkSetupHTML()}
      ${hist.length ? `<section class="card ck-hist"><h2>${H('ck.history')}</h2><ul>${hist.map(x => `<li><span class="muted small">${esc(fmtWhen(x.at))}</span><b>${x.ok} / ${x.n}</b><span class="muted small">${H('ck.lessonsN', { n: x.l })}</span></li>`).join('')}</ul></section>` : ''}</main>`;
  }
  const cfg = decodeCheck(code);
  if (!cfg) return `<main class="wrap narrow"><section class="card empty"><h1>${H('ck.title')}</h1><p class="muted">${H('ck.bad')}</p><a class="btn btn-primary" href="#/check">${H('ck.change')}</a></section></main>`;
  const ses = S.session && S.session.kind === 'check' && S.session.code === code ? S.session : null;
  if (!ses) {   // opened from a link: what the test is, then start
    const cnt = checkCounts(cfg);
    return `<main class="wrap narrow"><section class="card ck-intro">
      <div class="empty-icon">📝</div><h1>${H('ck.title')}</h1>
      <p class="big-score small-score">${H('ck.total', { n: cnt.n })}</p>
      <p class="muted">${H('ck.introBody')}</p>
      <ul class="ck-lessons">${cfg.lessons.map(k => `<li><span class="lesson-num">${LESSON_BY_KEY[k].no}</span>${lessonTitleHTML(LESSON_BY_KEY[k], L())}</li>`).join('')}</ul>
      <div class="row-btns"><button class="btn btn-primary btn-lg" data-act="checkBegin">${H('ck.start')}${I.next}</button><a class="btn btn-ghost" href="#/check">${H('ck.change')}</a></div></section></main>`;
  }
  if (ses.i >= ses.items.length) return checkResultHTML(ses);
  const prob = ses.items[ses.i], lesson = LESSON_BY_KEY[prob.lesson];
  const answered = Object.keys(ses.done).length;
  return `<main class="wrap">
    <div class="session-head">
      <h1>📝 ${H('ck.title')}</h1>
      <div class="session-progress"><span>${ses.i + 1} / ${ses.items.length}</span><div class="bar"><i style="width:${Math.round(answered / ses.items.length * 100)}%"></i></div></div>
      <button class="btn btn-ghost btn-sm" data-act="checkQuit">${H('ck.quit')}</button>
    </div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${H('lesson.of', { a: lesson.no })}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        <p class="muted small">${H('ck.rule')}</p>
        <div class="ck-dots">${ses.items.map((p, j) => `<i class="${ses.done[p.id] === true ? 'ok' : ses.done[p.id] === false ? 'bad' : ''}${j === ses.i ? ' cur' : ''}" title="Q${j + 1}"></i>`).join('')}</div></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
function checkResultHTML(ses) {
  if (!ses.end) {
    ses.end = Date.now();
    const h = checkHistory();
    h.push({ at: ses.end, code: ses.code, n: ses.items.length, ok: Object.values(ses.done).filter(Boolean).length, l: ses.cfg.lessons.length });
    Store.set(CHECK_HISTORY, h.slice(-30));
  }
  const n = ses.items.length, ok = ses.items.filter(p => ses.done[p.id] === true).length;
  const secs = Math.round((ses.end - ses.start) / 1000), time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const by = ses.cfg.lessons.map(k => { const ps = ses.items.filter(p => p.lesson === k); return { l: LESSON_BY_KEY[k], n: ps.length, ok: ps.filter(p => ses.done[p.id] === true).length }; }).filter(x => x.n);
  const wrong = ses.items.filter(p => ses.done[p.id] !== true).length;
  const mark = v => (v === true ? '<b class="ck-m ok">○</b>' : v === false ? '<b class="ck-m bad">×</b>' : '<b class="ck-m skip">−</b>');
  return `<main class="wrap narrow ck-result">
    <section class="card ck-score">
      <h1>📝 ${H('ck.result')}</h1>
      <p class="big-score">${ok} / ${n}</p>
      <div class="ck-meter"><i style="width:${n ? Math.round(ok / n * 100) : 0}%"></i></div>
      <p class="muted">${H('ck.time', { t: time })}</p>
      <div class="row-btns">${wrong ? `<button class="btn btn-primary" data-act="checkRetry">${I.repeat}${H('ck.retryWrong', { n: wrong })}</button>` : ''}
        <button class="btn btn-ghost" data-act="checkAgain">${I.shuffle}${H(ses.cfg.seed ? 'ck.retrySame' : 'ck.again')}</button><a class="btn btn-ghost" href="#/check">${H('ck.change')}</a></div>
    </section>
    <section class="card ck-by"><h2>${H('ck.byLesson')}</h2>
      ${by.map(x => `<div class="ck-by-row"><span><span class="lesson-num">${x.l.no}</span>${lessonTitleHTML(x.l, L())}</span><span class="ck-by-bar"><i style="width:${Math.round(x.ok / x.n * 100)}%"></i></span><b>${x.ok} / ${x.n}</b></div>`).join('')}</section>
    <section class="ck-review"><h2>${H('ck.review')}</h2>
      ${ses.items.map((p, i) => { const mine = ses.ans[p.id]; return `<details class="card ck-item" ${ses.done[p.id] === true ? '' : 'open'}>
        <summary>${mark(ses.done[p.id])}<b>Q${i + 1}</b><span class="tag st-${p.stage}">${stageLabelH(p)}</span><span class="muted small">Lesson ${LESSON_BY_KEY[p.lesson].no} · ${esc(themeName(p, L()))}</span></summary>
        <p class="prob-text">${problemHTML(p, L())}</p>
        <div class="ck-ans"><span class="muted small">${H('ck.yours')}</span>${mine ? `<pre class="sql">${highlightSQL(mine)}</pre>` : `<p class="muted">${H('ck.noAnswer')}</p>`}</div>
        <div class="ck-ans"><span class="muted small">${H('hint.answer')}</span><pre class="sql">${highlightSQL(p.sql)}</pre></div>
        ${altsHTML(p)}</details>`; }).join('')}</section>
  </main>`;
}

function drillHTML(ses) {
  const one = ses.key && LESSON_BY_KEY[ses.key];
  const lv = drillLevel();
  const seg = `<div class="seg drill-lv">${[['mix', 'drill.lvMix'], ['1', 'drill.lv1'], ['2', 'drill.lv2']].map(([v, k]) => `<button class="${lv === v ? 'on' : ''}" data-act="drillLevel" data-v="${v}">${H(k)}</button>`).join('')}</div>`;
  const back = one ? `<a class="btn btn-ghost" href="#/l/${one.key}/0">${H('drill.back')}</a>` : `<a class="btn btn-ghost" href="#/">${H('nav.home')}</a>`;
  if (!ses.items.length) return `<main class="wrap narrow"><section class="card empty"><h1>${H('drill.title')}</h1><p class="muted">${H('drill.none')}</p><div class="row-btns">${back}</div></section></main>`;
  if (ses.i >= ses.items.length) {
    const ok = Object.values(ses.done).filter(Boolean).length;
    return `<main class="wrap narrow"><section class="card empty">
      <div class="empty-icon">${I.fire}</div><h1>${H('drill.finished')}</h1><p class="big-score">${ok} / ${ses.items.length}</p>
      ${ses.best >= 3 ? `<p class="muted">🔥 ${H('drill.bestStreak', { n: ses.best })}</p>` : ''}
      <div class="row-btns"><button class="btn btn-primary" data-act="drillAgain">${I.shuffle}${H('drill.more')}</button>${back}</div></section></main>`;
  }
  const prob = ses.items[ses.i];
  const lesson = LESSON_BY_KEY[prob.lesson];
  return `<main class="wrap">
    <div class="session-head drill-head">
      <h1>⇅ ${H('drill.title')}${one ? ` <small class="muted">· ${lessonTitleHTML(one, L())}</small>` : ''}</h1>
      ${seg}
      <div class="session-progress"><span>${ses.i + 1} / ${ses.items.length}</span><div class="bar"><i style="width:${Math.round(ses.i / ses.items.length * 100)}%"></i></div>${ses.streak >= 2 ? `<span class="streak">🔥 ${H('drill.streak', { n: ses.streak })}</span>` : ''}</div>
    </div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${H('lesson.of', { a: lesson.no })}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        <p class="muted small">${H('drill.count', { n: (S.progress.drill || {})[lesson.key] || 0 })}</p>
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
}


/* ---------- quick test (クイックテスト): a few problems the teacher gives everyone at once ----------
 * A countdown, then everyone starts together. Retry until right; hints and answers stay hidden.
 * At the pass line the student may take a break (or go on with the rest). When the time is
 * over, the answers no longer count and the model answers are shown. */
const QKEY_ST = 'sqln.quick';
let qCache = { key: null, items: [] };
function qItems() {
  const q = S.klass && S.klass.quick;
  if (!quickOn(S.klass) || !S.engine) return [];
  const key = q.id + '|' + JSON.stringify(q.pick || null);
  if (qCache.key !== key) qCache = { key, items: quickProblems(S.engine, q) };
  return qCache.items;
}
const qPhaseNow = () => (quickOn(S.klass) ? quickPhase(S.klass.quick, nowMs()) : 'none');
function qState() {
  const q = S.klass && S.klass.quick, st = Store.get(QKEY_ST, null);
  const c = S.klass ? S.klass.id : null;
  return q && st && st.id === q.id ? Object.assign(st, { q, c, ans: st.ans || {} }) : { id: q ? q.id : null, done: {}, at: 0, ans: {}, q: q || null, c };
}
/** the last quick test this student saw, after it has ended (null when there is none) */
const qLast = () => { const st = Store.get(QKEY_ST, null); return st && st.id && st.q && Array.isArray(st.q.slots) && S.klass && st.c === S.klass.id ? st : null; };
/** keep the student's last answer to a problem (shown next to the model answer when the test is over) */
function qAnswer(n, sql) { const st = qState(); if (!st.id) return; st.ans[n] = String(sql || '').slice(0, 2000); Store.set(QKEY_ST, st); }
/** the answers to look back at: ○ / ×, the student's own last answer, and the model answer */
function qReviewHTML(items, st) {
  return `<section class="ck-review"><h2>${H('ck.review')}</h2>${items.map((p, i) => { const ok = !!st.done[p.qn], mine = (st.ans || {})[p.qn];
    return `<details class="card ck-item" ${ok ? '' : 'open'}><summary>${ok ? '<b class="ck-m ok">○</b>' : '<b class="ck-m bad">×</b>'}<b>Q${i + 1}</b><span class="tag st-${p.stage}">${stageLabelH(p)}</span></summary>
      <p class="prob-text">${p.py ? pyDescHTML(p, L()) : problemHTML(p, L())}</p>
      ${ok ? '' : `<div class="ck-ans qk-mine"><span class="muted small">${H('qk.yourAnswer')}</span>${mine ? `<pre class="sql wrong">${(p.py ? highlightPy : highlightSQL)(mine)}</pre>` : `<p class="muted small">${H('qk.noAnswer')}</p>`}</div>`}
      <div class="ck-ans"><span class="muted small">${H('hint.answer')}</span><pre class="sql">${p.py ? highlightPy(p.code) : highlightSQL(p.sql)}</pre></div></details>`; }).join('')}</section>`;
}
/** the teacher has ended the test: the student's result and the answers */
function quickEndedHTML(st) {
  if (st.q && st.q.once) qLevelApply(st);
  const items = quickProblems(S.engine, st.q), n = items.length, ok = items.filter(p => st.done[p.qn]).length, passed = ok >= passOf(st.q);
  return `<main class="wrap narrow ck-result"><section class="card empty quick-done ${passed ? '' : 'not'}">
      <div class="empty-icon">${passed ? '🎉' : '⚡'}</div><h1>${H('qk.endedTitle')}</h1><p class="big-score">${ok} / ${n}</p>
      <p class="${passed ? 'qk-break' : 'muted'}">${H(passed ? 'qk.passTitle' : 'qk.upSub')}</p>
      <a class="btn btn-primary" href="#/">${H('nav.home')}</a></section>${qReviewHTML(items, st)}</main>`;
}
const qDone = p => !!qState().done[p.qn];
/** a level test from the teacher: one answer per problem */
const qOnce = () => !!(S.klass && S.klass.quick && S.klass.quick.once);
const qTried = p => qDone(p) || !!(qState().tried || {})[p.qn];
function qTry(n) { const st = qState(); st.tried = st.tried || {}; st.tried[n] = Date.now(); Store.set(QKEY_ST, st); }
/** a level test is over for this student: the level from its chapters (other chapters keep the level they had) */
function qLevelApply(st) {
  const q = st && st.q; if (!q || !q.once || !Array.isArray(q.lv) || Store.get('sqln.lvQuick', '') === q.id) return;
  Store.set('sqln.lvQuick', q.id);
  const items = quickProblems(S.engine, q), prev = lvState(), prof = levelProfile(items, st.done, q.lv, prev ? prev.prof : null), now = Date.now();
  levelSet({ lv: levelOf(prof), prof, fmt: 0, streak: 0, ptr: 0, at: now, upd: now, rounds: 0 });
}
const qOk = () => qItems().filter(qDone).length;
const qAllDone = () => { const items = qItems(); return items.length > 0 && items.every(qOnce() ? qTried : qDone); };
const qPassed = () => quickOn(S.klass) && qItems().length > 0 && qOk() >= passOf(S.klass.quick);
/** the student is through: everything right, or the pass line and not going on with the rest */
const qFinished = () => qAllDone();   // reaching the pass line does not stop the test: the student goes on to the end
function qMark(n) {
  const st = qState(); if (!st.id || st.done[n]) return false;
  st.done[n] = Date.now();
  if (!st.at && Object.keys(st.done).length >= passOf(S.klass.quick)) st.at = Date.now();
  Store.set(QKEY_ST, st); return true;
}
function qNext(prob) {
  const items = qItems(), i = items.findIndex(p => p.id === prob.id);
  const open = qOnce() ? p => !qTried(p) : p => !qDone(p);
  return items.slice(i + 1).find(open) || items.slice(0, Math.max(0, i)).find(open) || null;
}
const mmss = ms => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
function qClockHTML() {
  const q = S.klass.quick, ph = qPhaseNow();
  if (ph === 'wait') return `${Math.max(1, Math.ceil((new Date(q.at).getTime() - nowMs()) / 1000))}`;
  if (ph === 'up') return H('qk.timeUp');
  return q.end ? H('qk.left', { t: mmss(new Date(q.end).getTime() - nowMs()) }) : '';
}
function quickBannerHTML() {
  if (S.klass && !quickOn(S.klass) && S.route.view !== 'quick') {   // just ended: a way back to the result and the answers
    const last = qLast();
    return last && S.qResSeen !== last.id && Date.now() - new Date(last.q.at).getTime() < 60 * 60000
      ? `<div class="live-banner quick-banner ended"><span>⚡ ${H('qk.ended')}</span><a class="btn btn-ghost btn-sm" href="#/quick">${H('qk.seeResult')}${I.next}</a></div>` : '';
  }
  if (!quickOn(S.klass) || S.route.view === 'quick' || qFinished() || qPhaseNow() === 'up') return '';
  const back = qBack !== null && qItems()[qBack] ? `#/quick/${qBack}` : '#/quick';   // back to the problem the student went to look up
  return `<div class="live-banner quick-banner"><span>⚡ ${H('qk.banner')}</span><a class="btn btn-ok btn-sm" href="${back}">${H('qk.back')}${I.next}</a></div>`;
}
/** after a wrong answer in a quick test: the problem's lesson (and its lecture) to look at, then back to this problem */
let qBack = null;   // the quick test's problem to come back to
function qRefHTML(prob) {
  if (!prob || !prob.quick || qOnce() || qPhaseNow() !== 'run') return '';
  const py = !!PD_BY_KEY[prob.lesson], lesson = py ? null : LESSON_BY_KEY[prob.lesson];
  if (!py && !lesson) return '';
  const name = py ? `Python ${PD_BY_KEY[prob.lesson].no} · ${rubyHTML(raw('pd.t.' + prob.lesson, L()))}` : `Lesson ${lesson.no} · ${lessonTitleHTML(lesson, L())}`;
  const go = (href, label) => `<a class="btn btn-ghost btn-sm" href="${href}" data-act="qRef" data-qn="${prob.qn}">${label}</a>`;
  return `<div class="qk-ref"><span>📖 ${H('qk.refTitle')}</span><span class="muted small">${name}</span>
    <span class="qk-ref-b">${go(py ? `#/py/${prob.lesson}/0` : `#/l/${prob.lesson}/0`, H('qk.refLesson'))}${hasLecture(prob.lesson) ? go(`#/lecture/${prob.lesson}`, '📽 ' + H('lec.open')) : ''}</span>
    <small class="muted">${H('qk.refNote')}</small></div>`;
}
const qRuleHTML = q => H('qk.ruleLine', { n: q.n, pass: passOf(q), t: q.end ? spanText(limitSecOf(q), n => T('qk.minutes', { n })) : T('qk.noLimit') });
function quickViewHTML() {
  document.title = `${T('qk.title')} · SQL Practice`;
  if (!quickOn(S.klass)) {
    const last = S.klass && S.engine ? qLast() : null;
    if (last) { S.qResSeen = last.id; return quickEndedHTML(last); }
    return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">⚡</div><h1>${H('qk.title')}</h1><p class="muted">${H('qk.none')}</p><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></section></main>`;
  }
  const q = S.klass.quick, items = qItems(), n = items.length, ok = qOk(), st = qState(), ph = qPhaseNow();
  if (ph === 'wait') return `<main class="wrap narrow"><section class="card empty quick-wait">
      <div class="empty-icon">⚡</div><h1>${H('qk.title')}</h1><p class="muted">${H('qk.soon')}</p>
      <p class="qk-count" data-qk-clock>${qClockHTML()}</p>
      <div class="qk-tiles"><div><b>${n}</b><span>${H('tc.quick.count')}</span></div><div><b>${passOf(q)} / ${n}</b><span>${H('tc.quick.pass')}</span></div><div><b>${q.end ? esc(spanText(limitSecOf(q), k => T('qk.minutes', { n: k }))) : '∞'}</b><span>${H('tc.quick.limit')}</span></div></div>
      <p class="muted small">${H('qk.rule')}</p>${items.some(p => p.py) ? (pyPrepare(), `<p class="muted small">🐍 ${H('qk.pyPrep')}</p>`) : ''}</section></main>`;
  if (q.once && (ph === 'up' || (qAllDone() && !current()))) {   // a level test: the new level, then the answers
    qLevelApply(st); const lv = lvState();
    return `<main class="wrap narrow ck-result"><section class="card empty lv-hero"><div class="empty-icon">🎯</div><h1>${H('lv.result')}</h1>
      <p class="lv-big">Lv.${lv ? lv.lv : 0}<small> / ${LV_MAX}</small></p><p class="big-score">${ok} / ${n}</p>
      ${levelStepsHTML(lv)}<p class="muted small">${H('qk.lvWait')}</p>
      <div class="row-btns"><a class="btn btn-primary" href="#/level">${H('lv.open')}</a></div></section>
      ${ph === 'up' ? qReviewHTML(items, st) : ''}</main>`;
  }
  if (ph === 'up') {   // the time is over: the result, and the model answers to learn from
    const passed = ok >= passOf(q);
    return `<main class="wrap narrow ck-result"><section class="card empty quick-done ${passed ? '' : 'not'}">
      <div class="empty-icon">${passed ? '🎉' : '⏱'}</div><h1>${H(passed ? 'qk.passTitle' : 'qk.upTitle')}</h1><p class="big-score">${ok} / ${n}</p>
      <p class="${passed ? 'qk-break' : 'muted'}">${H(passed ? 'qk.doneSub' : 'qk.upSub')}</p></section>
      ${qReviewHTML(items, st)}</main>`;
  }
  if (qFinished() && !current()) {
    const secs = st.at ? Math.max(0, st.at - new Date(q.at).getTime()) : null;
    const all = qAllDone();
    return `<main class="wrap narrow"><section class="card empty quick-done">
      <div class="empty-icon">🎉</div><h1>${H(all ? 'qk.doneTitle' : 'qk.passTitle')}</h1><p class="big-score">${ok} / ${n}</p>
      ${secs !== null ? `<p class="muted">${H('qk.time', { t: mmss(secs) })}</p>` : ''}
      <p class="qk-break">${H('qk.doneSub')}</p>
      <div class="ck-dots qk-dots center">${items.map(p => `<span class="${qDone(p) ? 'ok' : ''}">${p.qn + 1}</span>`).join('')}</div>
      ${all ? '' : `<button class="btn btn-ghost" data-act="quickMore">${H('qk.more', { n: n - ok })}</button>`}
      <p class="muted small">${H('qk.afterNote')}</p></section></main>`;
  }
  const c = current(), pass = passOf(q);
  const prob = c ? c.prob : items.find(p => !(q.once ? qTried(p) : qDone(p))) || items[0], lesson = LESSON_BY_KEY[prob.lesson] || { ch: 'py', no: PD_BY_KEY[prob.lesson].no, py: true };
  return `<main class="wrap">
    <div class="session-head">
      <h1>⚡ ${H('qk.title')}</h1>
      ${q.end ? `<b class="qk-left" data-qk-clock>${qClockHTML()}</b>` : ''}
      ${q.once ? `<b class="qk-need">🎯 ${H('lv.testTitle')}</b>` : `<b class="qk-need ${ok >= pass ? 'ok' : ''}">${ok >= pass ? '✓ ' + H('qk.passTitle') : H('qk.toPass', { n: pass - ok })}</b>`}
      <div class="session-progress"><span>${ok} / ${n}</span><div class="bar"><i style="width:${Math.round(ok / n * 100)}%"></i></div></div>
    </div>
    <div class="session-layout">
      <aside class="card side-card" style="--cc:${lesson.py ? '#3776ab' : `var(--c-${lesson.ch})`}"><div class="chap">${lesson.py ? `Python · ${lesson.no}` : H('lesson.of', { a: lesson.no })}</div><h2>${lesson.py ? rubyHTML(raw('pd.t.' + prob.lesson, L())) : lessonTitleHTML(lesson, L())}</h2>
        ${q.once ? '' : `<p class="qk-rule small">${qRuleHTML(q)}</p>`}
        <p class="muted small">${H(q.once ? 'qk.lvRule' : 'qk.rule')}</p>
        <div class="ck-dots qk-dots">${items.map(p => `<a href="#/quick/${p.qn}" class="${qDone(p) ? 'ok' : q.once && qTried(p) ? 'bad' : ''}${p.id === prob.id ? ' cur' : ''}" title="Q${p.qn + 1}" aria-label="Q${p.qn + 1}">${p.qn + 1}</a>`).join('')}</div></aside>
      <div class="main" id="ws">${prob.py ? pyQuickHTML(prob) : workspaceHTML(prob)}</div>
    </div>
  </main>`;
}
/* the countdown and the time left; a new phase (start, time up) redraws the page */
let qPhaseShown = null;
setInterval(() => {
  if (!S.klass || !quickOn(S.klass)) { qPhaseShown = null; return; }
  const ph = qPhaseNow();
  const q = S.klass.quick, low = ph === 'run' && q.end && new Date(q.end).getTime() - nowMs() < 60000;
  document.querySelectorAll('[data-qk-clock]').forEach(el => { const h = qClockHTML(); if (el.innerHTML !== h) el.innerHTML = h; el.classList.toggle('low', !!low); });
  if (qPhaseShown !== null && ph !== qPhaseShown && (S.route.view === 'quick' || ph === 'up')) { saveDraft(); render(); }
  qPhaseShown = ph;
}, 300);
/** the teacher started or stopped a quick test */
let quickSeen = Store.get('sqln.quickSeen', null), quickShown, quickEndShown;
function quickChanged(announce) {
  const id = quickOn(S.klass) ? S.klass.quick.id : null, end = id ? S.klass.quick.end || null : null;
  if (id === quickShown) {   // the same test: only a new end time (one more minute) matters
    if (id && end !== quickEndShown) { quickEndShown = end; if (Store.get(QKEY_ST, null)) Store.set(QKEY_ST, qState()); if (S.route.view === 'quick' && qPhaseNow() !== 'run') { saveDraft(); render(); } }
    return;
  }
  quickEndShown = end;
  const prev = quickShown; quickShown = id; S.qMore = false;
  if (id && id !== quickSeen) {   // a new quick test: open it (once)
    quickSeen = id; Store.set('sqln.quickSeen', id);
    Store.set(QKEY_ST, qState());   // kept, so the result can be shown after the test
    if (!qFinished() && qPhaseNow() !== 'up') { saveDraft(); if (S.route.view !== 'quick') { location.hash = '#/quick'; } else render(); toast(T('qk.started')); return; }
  }
  if (prev !== undefined) { if (S.route.view === 'quick') saveDraft(); render(); if (!id && prev && announce) toast(T('qk.ended')); }
}
/* ---------- the class assignment (and the class live) ----------
 * #/live shows the assigned lessons' problems one after another; the library on the side
 * lists them all. During a class live the app opens it by itself. */
const assignedGroups = () => (S.klass ? (S.klass.lessons || []).filter(k => LESSON_BY_KEY[k]).map(k => ({ lesson: LESSON_BY_KEY[k], probs: problemsOf(LESSON_BY_KEY[k]) })) : []);
const assignedSeq = () => assignedGroups().flatMap(g => g.probs);
const liveHash = p => `#/live/${p.lesson}/${p.idx}`;
/** the first unsolved assigned problem (null when everything is solved) */
function firstOpen() { return assignedSeq().find(p => !isSolved(p.id)) || null; }
/** the next unsolved assigned problem after this one; then any unsolved one before it */
function nextAssigned(prob) {
  const seq = assignedSeq(), i = seq.findIndex(p => p.id === prob.id);
  return seq.slice(i + 1).find(p => !isSolved(p.id)) || seq.slice(0, Math.max(0, i)).find(p => !isSolved(p.id)) || null;
}
const shortLabel = p => (p.stage === 'demo' ? 'Ex' : p.stage === 'fill' ? '□' : p.stage === 'order' ? '⇅' + (p.of > 1 ? p.wn : '') : (p.stage === 'quiz' ? 'Q' : 'W') + p.wn);
function liveBannerHTML() {
  if (!liveOn(S.klass) || S.route.view === 'live' || !(S.klass.lessons || []).length) return '';
  return `<div class="live-banner"><span><i class="live-dot"></i>${H('live.banner')}</span><a class="btn btn-ok btn-sm" href="#/live">${H('live.back')}${I.next}</a></div>`;
}
function liveViewHTML() {
  const groups = assignedGroups();
  const live = liveOn(S.klass);
  document.title = `${T('nav.assign')} · SQL Practice`;
  if (!S.klass || !groups.length) return `<main class="wrap narrow"><section class="card empty"><div class="empty-icon">${I.users}</div><h1>${H('nav.assign')}</h1><p class="muted">${H('live.none')}</p><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></section></main>`;
  const seq = groups.flatMap(g => g.probs), solved = seq.filter(p => isSolved(p.id)).length;
  const c = current();
  const lib = groups.map(g => {
    const st = stateOf(g.lesson);
    return `<div class="ll-lesson ${st.done ? 'done' : ''}"><div class="ll-h"><span class="lesson-num">${st.done ? '✓' : g.lesson.no}</span><span>${lessonTitleHTML(g.lesson, L())}</span></div>
      <div class="ll-items">${g.probs.map(p => `<a class="ll-p ${isSolved(p.id) ? 'solved' : ''} ${c && c.prob.id === p.id ? 'on' : ''}" href="${liveHash(p)}" title="${esc(stageLabel(p))}" ${c && c.prob.id === p.id ? 'aria-current="page"' : ''}>${esc(shortLabel(p))}</a>`).join('')}</div></div>`;
  }).join('');
  const side = `<aside class="side live-side"><div class="card live-card">
      ${live ? `<div class="live-on"><i class="live-dot"></i><b>${H('live.on')}</b><span class="muted small" data-live-left>${H('live.minLeft', { n: liveMinutesLeft(S.klass) })}</span></div>` : ''}
      <h2>${H('live.title', { name: S.klass.name })}</h2>
      <div class="live-prog"><div class="bar"><i style="width:${Math.round(solved / seq.length * 100)}%"></i></div><b>${solved}/${seq.length}</b></div>
      <a class="btn btn-ghost btn-sm" href="#/solved">✓ ${H('mine.title')}</a>
      ${S.pinNeeded ? `<button class="btn btn-ok btn-sm" data-act="setPin">🔢 ${H('pin.setNow')}</button>` : ''}
      <div class="ll-title muted small">${H('live.library')}</div>
      <div class="live-lib">${lib}</div>
    </div></aside>`;
  if (!c) {   // everything solved (or #/live/done)
    const left = seq.find(p => !isSolved(p.id));
    return `<main class="wrap"><div class="lesson-layout">${side}<div class="main"><section class="card empty">
      <div class="empty-icon">${left ? I.check : I.fire}</div><h1>${H(left ? 'live.notYet' : 'live.doneTitle')}</h1><p class="muted">${H(left ? 'live.notYetSub' : 'live.doneSub')}</p>
      <div class="row-btns">${left ? `<a class="btn btn-primary" href="${liveHash(left)}">${H('live.back')}${I.next}</a>` : groups.filter(g => S.engine.drillLessons().has(g.lesson.key)).slice(0, 3).map(g => `<a class="btn btn-ghost" href="#/drill/${g.lesson.key}">⇅ Lesson ${g.lesson.no}</a>`).join('')}</div>
    </section></div></div></main>`;
  }
  const { lesson, prob } = c;
  return `<main class="wrap">
    <div class="crumbs"><a href="#/live">${H('nav.assign')}</a><span>›</span><span>Lesson ${lesson.no} · ${lessonTitleHTML(lesson, L())}</span><span>›</span><span>${stageLabelH(prob)}</span></div>
    <div class="lesson-layout">${side}<div class="main" id="ws">${workspaceHTML(prob)}</div></div>
  </main>`;
}

/* ---------- lecture: slides with animated tables, for each lesson ---------- */
const lec = { key: null, i: 0, auto: null };
/** the lesson a lecture belongs to: an SQL lesson, or a lesson of the Python course */
const lecLesson = key => LESSON_BY_KEY[key] || (PD_BY_KEY[key] ? { key, no: PD_BY_KEY[key].no, py: true } : null);
function lectureHTML() {
  const lesson = lecLesson(S.route.key);
  if (lec.key !== lesson.key) { lec.key = lesson.key; lec.i = 0; stopAuto(); }
  const steps = lectureSteps(lesson.key), st = steps[lec.i];
  document.title = `${T('lec.title')} · ${lesson.py ? T('pd.t.' + lesson.key) : lessonTitle(lesson, L())} · SQL Practice`;
  const slides = lectureOf(lesson.key).slides, title = lesson.py ? rubyHTML(raw('pd.t.' + lesson.key, L())) : lessonTitleHTML(lesson, L());
  return `<main class="wrap lec-wrap">
    <div class="crumbs"><a href="${lesson.py ? `#/py/${lesson.key}/0` : `#/l/${lesson.key}/0`}">${lesson.py ? 'Python' : 'Lesson'} ${lesson.no} · ${title}</a><span>›</span><span>📽 ${H('lec.title')}</span></div>
    ${['ja', 'easy', 'en'].includes(L()) ? '' : `<p class="lec-lang-note">🌐 ${H('lec.langNote')}</p>`}
    <section class="card lec-card">
      <div class="lec-top"><h1>${title}</h1>
        <div class="lec-dots">${slides.map((sl, i) => `<button class="${i === st.slide ? 'on' : i < st.slide ? 'done' : ''}" data-act="lecGo" data-s="${i}" aria-label="${i + 1}"></button>`).join('')}</div></div>
      <div id="lec-box" class="lec-box">${lectureStepHTML(lesson, st, S.engine, L())}</div>
      <div class="lec-ctl">
        <button class="btn btn-ghost" data-act="lecPrev" ${lec.i === 0 ? 'disabled' : ''}>${I.prev}${H('lec.prev')}</button>
        <button class="btn btn-ghost btn-sm" data-act="lecAuto">${lec.auto ? '⏸' : '▶'} ${H('lec.auto')}</button>
        <span class="muted small lec-pos">${lec.i + 1} / ${steps.length}</span>
        <button class="btn btn-primary" data-act="lecNext" ${lec.i >= steps.length - 1 ? 'disabled' : ''}>${H('lec.next')}${I.next}</button>
      </div>
      <p class="muted small lec-keys">${H('lec.keys')}</p>
    </section>
  </main>`;
}
function lecMove(to) {
  const lesson = lecLesson(lec.key), steps = lectureSteps(lec.key);
  to = Math.max(0, Math.min(steps.length - 1, to));
  if (to === lec.i) { stopAuto(); return; }
  const from = steps[lec.i], st = steps[to];
  const f = lectureOf(lec.key).slides[st.slide].frames;
  const same = from.slide === st.slide && !!f;
  lec.i = to;
  const box = document.getElementById('lec-box');
  if (!box) { render(); return; }
  paintStep(box, lectureStepHTML(lesson, st, S.engine, L()), same, same && f[st.frame].merge ? f[st.frame].merge(S.engine) : null);
  // the controls and the dots follow
  document.querySelectorAll('.lec-dots button').forEach((b, i) => { b.className = i === st.slide ? 'on' : i < st.slide ? 'done' : ''; });
  const pos = document.querySelector('.lec-pos'); if (pos) pos.textContent = `${lec.i + 1} / ${steps.length}`;
  const pv = document.querySelector('[data-act="lecPrev"]'), nx = document.querySelector('[data-act="lecNext"]');
  if (pv) pv.disabled = lec.i === 0; if (nx) nx.disabled = lec.i >= steps.length - 1;
  if (lec.i >= steps.length - 1) stopAuto();
}
function stopAuto() { if (lec.auto) { clearInterval(lec.auto); lec.auto = null; const b = document.querySelector('[data-act="lecAuto"]'); if (b) b.innerHTML = `▶ ${H('lec.auto')}`; } }
document.addEventListener('keydown', e => {
  if (S.route.view !== 'lecture' || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') || document.getElementById('modal')) return;
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); stopAuto(); lecMove(lec.i + 1); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); stopAuto(); lecMove(lec.i - 1); }
  if (e.key === 'a' || e.key === 'A') actions.lecAuto();
});


/* ---------- rank tests (#/rank, #/rank/<subject>/<tier>): how many ordering problems within a time limit, like e-typing's level check ---------- */
/** records of the first version (one test per tier, a different score) are dropped */
const rkClean = () => { const r = S.progress.rank, old = Object.keys(r || {}).filter(k => !rankParse(k)); if (old.length) { old.forEach(k => delete r[k]); save(); } };
/** a rank badge; passes add "(with passes)": the rank is not complete */
const rkBadge = (rank, passed, size = 'sm') => `<span class="rk-badge ${size} r-${rank}">${rank}</span>${passed ? `<span class="rk-withpass">${H('rk.withPass')}</span>` : ''}`;
const rkRec = t => ((S.progress.rank = S.progress.rank || {})[t] = S.progress.rank[t] || { best: 0, hist: [] });
let rkTick = null;
function rkStopTick() { clearInterval(rkTick); rkTick = null; }
const rkMs = ses => Math.min((ses.tEnd || Date.now()) - ses.t0, ses.limit);
const rkLeft = ses => Math.max(0, ses.limit - ((ses.tEnd || Date.now()) - ses.t0));
const rkMin = tier => RK_SEC[tier] / 60;
const fmtMs = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** the counts so far: solved · misses · passed */
const rkCountsHTML = ses => { const ok = ses.items.filter(p => ses.done[p.id]).length, ms = Object.values(ses.miss).reduce((x, n) => x + n, 0), ps = ses.items.filter(p => ses.pass[p.id]).length;
  return `<div class="rk-counts"><span class="ok">○ ${H('rk.solved')} <b>${ok}</b></span><span class="ms">× ${H('rk.misses')} <b>${ms}</b></span><span>– ${H('rk.passed')} <b>${ps}</b></span></div>`; };
function rkStart(test) {
  rkStopTick();
  const { ch, tier } = rankParse(test);
  const seed = randomCode(5), seen = new Set();
  S.session = { kind: 'rank', test, ch, tier, seed, seen, limit: RK_SEC[tier] * 1000, phase: 'count', n: 3, items: rankProblems(S.engine, ch, tier, seed, RK_N, 0, seen), made: 0, i: 0, done: {}, miss: {}, pass: {}, dur: {}, t0: 0, tShow: 0, tEnd: 0 };
  S.session.made = S.session.items.length ? S.session.items[S.session.items.length - 1].rn + 1 : 0;
  render(); window.scrollTo(0, 0);
  const ses = S.session;
  const tc = Date.now();
  rkTick = setInterval(() => {
    if (S.session !== ses) return rkStopTick();
    if (ses.phase === 'count') {
      const n = 3 - Math.floor((Date.now() - tc) / 800);
      if (n > 0) { if (n !== ses.n) { ses.n = n; const c = document.getElementById('rk-count'); if (c) c.textContent = n; } return; }
      ses.phase = 'run'; ses.t0 = ses.tShow = Date.now(); render(); return;
    }
    if (ses.phase !== 'run') return;
    if (rkLeft(ses) <= 0) return rkFinish();   // time is up
    const el = document.getElementById('rk-time'); if (el) { el.textContent = fmtMs(rkLeft(ses)); el.parentNode.classList.toggle('low', rkLeft(ses) <= 15000); }
  }, 250);
}
/** to the next problem (after a right answer or a pass); more problems are made as they run out */
function rkNext() {
  const ses = S.session; if (!ses || ses.kind !== 'rank' || ses.phase !== 'run') return;
  if (rkLeft(ses) <= 0) return rkFinish();
  const p = ses.items[ses.i]; ses.dur[p.id] = Date.now() - ses.tShow;
  if (ses.i + 3 >= ses.items.length) { const more = rankProblems(S.engine, ses.ch, ses.tier, ses.seed, 5, ses.made, ses.seen); if (more.length) { ses.items.push(...more); ses.made = more[more.length - 1].rn + 1; } }
  if (ses.i + 1 >= ses.items.length) return rkFinish();
  ses.i += 1; ses.tShow = Date.now(); S.tab = 'user'; render(); window.scrollTo(0, 0);
}
/** the end: the time is up (the problem on screen counts only if it was solved) */
function rkFinish() {
  const ses = S.session; if (!ses || ses.kind !== 'rank' || ses.phase !== 'run') return;
  ses.tEnd = Date.now(); ses.phase = 'done'; rkStopTick();
  const cur = ses.items[ses.i]; if (cur && ses.dur[cur.id] === undefined) ses.dur[cur.id] = ses.tEnd - ses.tShow;
  ses.items = ses.items.slice(0, ses.i + 1);   // the problems that were shown
  const solved = ses.items.filter(p => ses.done[p.id]).length;
  const misses = Object.values(ses.miss).reduce((s, n) => s + n, 0), passed = ses.items.filter(p => ses.pass[p.id]).length;
  const r = Object.assign(rankScore(solved, misses), { test: ses.test, solved, passed, misses, ms: ses.limit, at: Date.now() });
  const rec = rkRec(ses.test), prev = rec.hist.length ? { score: rec.best, passed: rec.bestP || 0 } : null;
  r.newBest = !!prev && rankBetter(r, prev);
  if (!prev || r.newBest) { rec.best = r.score; rec.bestP = r.passed; }
  rec.hist = [{ s: r.score, r: r.rank, acc: r.acc, ok: r.solved, miss: r.misses, pass: r.passed, at: r.at }, ...rec.hist].slice(0, 10);
  save();
  if (S.klass && backend.enabled) backend.logAttempt(Object.assign({ class_id: S.klass.id }, rankRow(r)));
  ses.res = r; render(); window.scrollTo(0, 0);
}
const rkName = ses => `${chName(ses.ch)} · ${H('rk.tier.' + ses.tier)}`;
function rankHubHTML() {
  rkClean();
  return `<main class="wrap rk-page">
    <section class="card rk-head"><h1>🏅 ${H('rk.title')}</h1><p class="muted">${H('rk.sub', { n: RK_N })}</p>
      <ul class="rk-rules"><li>${H('rk.rule1')}</li><li>${H('rk.rule2')}</li><li>${H('rk.rule3')}</li><li>${H('rk.rule4')}</li></ul></section>
    <section class="card rk-grid-card"><table class="rk-grid"><thead><tr><th>${H('rk.chapter')}</th>${RK_TIERS.map((t, i) => `<th class="t${i}">${H('rk.tier.' + t)} <span class="tag">⏱ ${H('rk.limit', { m: rkMin(t) })}</span><small>${H('rk.tierDesc.' + t)}</small></th>`).join('')}</tr></thead><tbody>
      ${RK_CHAPTERS.map((ch, ci) => `<tr style="--cc:var(--c-${ch})"><th><span class="rk-chdot"></span>${H('home.chapter', { n: ci + 1 })} ${chName(ch)}</th>${RK_TIERS.map(t => { const rec = rkRec(rankKey(ch, t));
        return `<td><a class="rk-cell" href="#/rank/${ch}/${t}">${rec.hist.length ? `<span>${rkBadge(rankOf(rec.best), rec.bestP)}</span><b>${rec.best}</b>` : `<span class="muted">${H('rk.start')}</span>`}</a></td>`; }).join('')}</tr>`).join('')}
    </tbody></table></section>
    <section class="card"><h3>${H('rk.ranks')}</h3><div class="rk-scale">${RK_RANKS.map((r, i) => `<span><span class="rk-badge r-${r}">${r}</span><small>${RK_FROM[i]}${i + 1 < RK_RANKS.length ? '–' + (RK_FROM[i + 1] - 1) : '+'}</small></span>`).join('')}</div><p class="muted small">${H('rk.formula')}</p></section>
  </main>`;
}
function rankHTML() {
  const test = S.route.test;
  document.title = `${T('rk.title')} · SQL Practice`;
  if (!test) { if (S.session && S.session.kind === 'rank') { rkStopTick(); S.session = null; } return rankHubHTML(); }
  if (!S.session || S.session.kind !== 'rank' || S.session.test !== test) { rkStopTick(); S.session = Object.assign({ kind: 'rank', test, phase: 'ready', items: [], i: 0, done: {}, miss: {}, pass: {}, dur: {} }, rankParse(test)); }
  const ses = S.session, tier = ses.tier;
  const head = `<div class="session-head rk-bar"><h1>🏅 ${rkName(ses)}</h1>${ses.phase === 'run' ? `${rkCountsHTML(ses)}<span class="rk-time${rkLeft(ses) <= 15000 ? ' low' : ''}">⏱ ${H('rk.left')} <b id="rk-time">${fmtMs(rkLeft(ses))}</b></span>` : ''}</div>`;
  if (ses.phase === 'ready') return `<main class="wrap narrow">${head}<section class="card rk-ready"><p>${H('rk.readyAbout', { c: T('ch.' + ses.ch).replace(/\{([^|}]+)\|[^}]+\}/g, '$1'), m: rkMin(tier) })}</p><p class="muted">${H('rk.tierDesc.' + tier)}</p>
      <ul class="rk-rules"><li>${H('rk.rule1')}</li><li>${H('rk.rule2')}</li><li>${H('rk.rule3')}</li><li>${H('rk.rule4')}</li></ul>
      <div class="row-btns"><button class="btn btn-primary btn-lg" data-act="rkGo">${H('rk.go')}</button><a class="btn btn-ghost" href="#/rank">${H('rk.back')}</a></div></section></main>`;
  if (ses.phase === 'count') return `<main class="wrap narrow">${head}<section class="card rk-ready"><div class="rk-countdown" id="rk-count">${ses.n}</div><p class="muted center">${H('rk.readySub')}</p></section></main>`;
  if (ses.phase === 'done' && ses.res) return rankDoneHTML(ses);
  const prob = ses.items[ses.i], lesson = LESSON_BY_KEY[prob.lesson];
  return `<main class="wrap">${head}
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="rk-qn">Q${ses.i + 1}</div><div class="chap">${chName(lesson.ch)}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        ${ses.miss[prob.id] ? `<p class="rk-misscount">${H('rk.missN', { n: ses.miss[prob.id] })}</p>` : ''}
        <p class="muted small">${H('rk.passHint')}</p><button class="btn btn-ghost" data-act="rkPass">${H('rk.pass')} ⏭</button></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div></main>`;
}
function rankDoneHTML(ses) {
  const r = ses.res, next = rankToNext(r.score), rec = rkRec(ses.test);
  const byCh = {};   // by lesson (the test is one subject)
  ses.items.forEach(p => { const ch = p.lesson, b = (byCh[ch] = byCh[ch] || { n: 0, ok: 0, pass: 0, miss: 0, ms: 0 }); b.n++; if (ses.done[p.id]) b.ok++; if (ses.pass[p.id]) b.pass++; b.miss += ses.miss[p.id] || 0; b.ms += ses.dur[p.id] || 0; });
  const chs = Object.keys(byCh), good = c => byCh[c].ok === byCh[c].n && !byCh[c].miss, weak = c => byCh[c].pass || byCh[c].miss >= byCh[c].n;
  const weakLessons = [...new Set(ses.items.filter(p => ses.pass[p.id] || (ses.miss[p.id] || 0) >= 2).map(p => p.lesson))];
  return `<main class="wrap rk-page">
    <section class="card rk-result">
      <small class="muted">${rkName(ses)}</small>
      <div class="rk-main"><span class="rk-badge big r-${r.rank}">${r.rank}</span>${r.passed ? `<span class="rk-withpass big">${H('rk.withPass')}</span>` : ''}<div><small>${H('rk.score')}</small><b class="rk-score">${r.score}</b>${r.newBest ? `<span class="tag ok">${H('rk.newBest')}</span>` : ''}</div></div>
      ${r.passed ? `<p class="rk-passnote">${H('rk.passNote', { r: r.rank })}</p>` : ''}
      <p class="muted">${next === null ? H('rk.top') : H('rk.toNext', { n: next, r: RK_RANKS[RK_RANKS.indexOf(r.rank) + 1] })}</p>
      <div class="rk-figs"><span><small>${H('rk.solved')}</small><b>${r.solved}</b></span><span><small>${H('rk.acc')}</small><b>${r.acc}%</b></span><span><small>${H('rk.time')}</small><b>${fmtMs(r.ms)}</b></span><span><small>${H('rk.passed')}</small><b>${r.passed}</b></span><span><small>${H('rk.misses')}</small><b>${r.misses}</b></span></div>
      <p class="muted small">${H('rk.formula')}</p>
      <div class="row-btns"><button class="btn btn-primary" data-act="rkAgain">${I.repeat}${H('rk.again')}</button><a class="btn btn-ghost" href="#/rank">${H('rk.back')}</a></div>
      ${S.klass ? `<p class="muted small">${H('rk.sent')}</p>` : ''}
    </section>
    <div class="rk-side">
      <section class="card"><h3>${H('rk.byLesson')}</h3><table class="wtable"><thead><tr><th>${H('rk.lesson')}</th><th class="n">${H('rk.solved')}</th><th class="n">${H('rk.passed')}</th><th class="n">${H('rk.misses')}</th><th class="n">${H('rk.perQ')}</th><th></th></tr></thead><tbody>
        ${chs.map(c => { const b = byCh[c]; return `<tr><td><a href="#/lecture/${c}">${lessonTitleHTML(LESSON_BY_KEY[c], L())}</a></td><td class="n">${b.ok}/${b.n}</td><td class="n">${b.pass}</td><td class="n">${b.miss}</td><td class="n">${Math.round(b.ms / b.n / 1000)}s</td><td>${good(c) ? `<span class="tag ok">${H('rk.strong')}</span>` : weak(c) ? `<span class="tag bad">${H('rk.weak')}</span>` : ''}</td></tr>`; }).join('')}
      </tbody></table>
      ${weakLessons.length ? `<p class="small"><b>${H('rk.study')}</b> ${weakLessons.map(k => `<a href="#/lecture/${k}">${lessonTitleHTML(LESSON_BY_KEY[k], L())}</a>`).join('、')}</p>` : `<p class="muted small">${H('rk.noWeak')}</p>`}</section>
      <section class="card"><h3>${H('rk.history')}</h3>${rec.hist.length ? `<table class="wtable"><thead><tr><th>${H('rk.when')}</th><th>${H('rk.rank')}</th><th class="n">${H('rk.score')}</th><th class="n">${H('rk.solved')}</th><th class="n">${H('rk.misses')}</th></tr></thead><tbody>${rec.hist.map(h => `<tr><td class="muted small">${esc(new Date(h.at).toLocaleString(htmlLang(L())))}</td><td>${rkBadge(h.r, h.pass)}</td><td class="n"><b>${h.s}</b></td><td class="n">${h.ok ?? ''}</td><td class="n">${h.miss ?? ''}</td></tr>`).join('')}</tbody></table>` : ''}</section>
    </div>
    <h2 class="bs-h2">${H('rk.review')}</h2>
    ${ses.items.map((p, i) => { const ok = !!ses.done[p.id], l = LESSON_BY_KEY[p.lesson];
      return `<details class="card lv-rv ${ok ? 'ok' : 'ng'}"><summary><b>${ok ? '○' : '–'} Q${i + 1}</b><span style="--cc:var(--c-${l.ch})">${lessonTitleHTML(l, L())}</span><span class="muted small">${ses.pass[p.id] ? H('rk.passed') : !ok ? H('rk.timeUp') : ''} ${ses.miss[p.id] ? H('rk.missN', { n: ses.miss[p.id] }) : ''} · ${Math.round((ses.dur[p.id] || 0) / 1000)}s</span></summary>
        <p class="prob-text">${problemHTML(p, L())}</p><div class="muted small">${H('cq.good')}</div><pre class="sql">${highlightSQL(p.sql)}</pre></details>`; }).join('')}
  </main>`;
}

/* ---------- glossary ---------- */
function wordsHTML() {
  document.title = `${T('nav.words')} · SQL Practice`;
  const sec = S.settings.second && S.settings.second !== L() ? S.settings.second : (L() === 'easy' || L() === 'ja' ? 'en' : 'easy');
  if (!hasLang(sec)) { loadLang(sec).then(render); }
  const cols = [L(), sec];
  const head = cols.map(c => `<th>${esc(LANGS.find(x => x.code === c).name)}</th>`).join('');
  const kwRows = GLOSS_KEYS.filter(k => raw('kw.' + k, 'en') !== 'kw.' + k).map(k => `<tr><th class="kw"><code>${esc(k)}</code></th>${cols.map(c => `<td lang="${htmlLang(c)}">${rubyHTML(raw('kw.' + k, c))}</td>`).join('')}</tr>`).join('');
  const TERMS = ['table', 'column', 'row', 'value', 'condition', 'sort', 'asc', 'desc', 'duplicate', 'aggregate', 'group', 'join', 'null', 'result', 'error'];
  const termRows = TERMS.map(k => `<tr>${cols.map(c => `<td lang="${htmlLang(c)}">${rubyHTML(raw('term.' + k, c))}</td>`).join('')}<td><code>${esc(raw('term.' + k, 'en'))}</code></td></tr>`).join('');
  return `<main class="wrap narrow">
    <h1 class="page-title">${H('words.title')}</h1>
    <p class="muted">${H('words.sub')}</p>
    <section class="card words"><h2>${H('words.terms')}</h2>
      <table class="wtable"><thead><tr>${head}<th>English</th></tr></thead><tbody>${termRows}</tbody></table></section>
    <section class="card words"><h2>${H('words.keywords')}</h2>
      <table class="wtable"><thead><tr><th></th>${head}</tr></thead><tbody>${kwRows}</tbody></table></section>
    <section class="card words"><h2>${H('viz.orderTitle')}</h2><p class="muted">${H('viz.orderSub')}</p>
      ${orderStripHTML("SELECT category, COUNT(*) FROM products WHERE price > 1000 GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category LIMIT 3", null, L())}</section>
  </main>`;
}

/* =========================================================
 * WORKSPACE (one problem): text, steps, stage body, feedback, results
 * ========================================================= */
function workspaceHTML(prob) {
  if (prob.abs) return absHTML(prob);
  return `<section class="card prob">
      <div class="prob-top">
        <span class="tag st-${prob.stage}">${stageLabelH(prob)}</span>
        ${prob.stage === 'demo' ? `<span class="tag">${H('stage.demoSub')}</span>` : `<span class="tag">${themeHTML(prob, L())}</span>`}
        ${isSolved(prob.id) ? `<span class="tag ok">✓ ${H('fb.correct')}</span>` : ''}
      </div>
      <p class="inst">${rubyHTML(raw('inst.' + (prob.p && prob.p.choices ? 'choice' : isQuiz(prob) ? 'quiz' : prob.stage === 'review' ? 'write' : prob.stage === 'order' && S.engine.orderTask(prob) && !S.engine.orderTask(prob).chunks.some(c => c.distractor) ? 'orderNoTrap' : prob.stage), L()))}</p>
      <p class="prob-text">${problemHTML(prob, L())}</p>
      ${S.settings.second && S.settings.second !== L() ? `<p class="prob-text bi" lang="${htmlLang(S.settings.second)}">${problemHTML(prob, S.settings.second)}</p>` : ''}
      <div class="tables">${prob.tables.map(n => tableBlockHTML(n, prob)).join('')}</div>
      ${isAnalysis(LESSON_BY_KEY[prob.lesson]) ? toolsHTML(prob, L(), setCode(), formatKey(formatOf(LESSON_BY_KEY[prob.lesson]))) : ''}
    </section>
    ${isAnalysis(LESSON_BY_KEY[prob.lesson]) ? statCardHTML(LESSON_BY_KEY[prob.lesson], prob, L(), prob.stage === 'demo') : ''}
    ${prob.stage === 'demo' ? `<div id="ws-steps">${stepsHTML(prob)}</div>` : ''}
    ${solvedBoxHTML(prob)}
    <div id="ws-stage">${stageHTML(prob)}</div>
    <div id="ws-fb">${feedbackHTML(prob)}</div>
    <div id="ws-res">${isQuiz(prob) ? '' : resultsHTML(prob)}</div>`;
}
/** other correct answers (別解): a closed box under an answer; withModel adds the model answer first */
/** JOIN lessons: the shorter ways to write it, on an example of the lesson (customers and orders, not one of the student's problems) */
const shortCache = new Map();
function shortSqlHTML(lesson) {
  if (!shortCache.has(lesson.key)) {
    let steps = [];
    try { const ds = JOIN_DATASETS[0], p = S.engine.genOne(lesson, ds, 'SHORT|' + lesson.key); if (p) steps = shortForms(S.engine, lesson.sql(p), !!lesson.ordered, lesson.names); } catch (e) { steps = []; }
    shortCache.set(lesson.key, steps);
  }
  const steps = shortCache.get(lesson.key);
  if (steps.length < 2) return '';
  const left = /LEFT JOIN/.test(steps[0].sql), label = st => H(st === 'omit' && left ? 'short.omitLeft' : 'short.' + st);
  return `<details class="card short-sql" open><summary>✂ ${H('short.title')}</summary>
    <p class="muted small">${H('short.eg')}</p>
    ${steps.map((x, i) => `<div class="short-step ${x.step}"><b>${i ? `${['①', '②', '③'][i - 1]} ` : ''}${label(x.step)}</b><pre class="sql">${highlightSQL(sqlLines(x.sql))}</pre></div>`).join('')}
    <p class="small short-rule">⚠ ${H('short.rule')}</p><p class="muted small">✓ ${H('short.ok')}</p></details>`;
}
function altsHTML(prob, withModel, mine) {
  if (isQuiz(prob)) return '';
  const alts = altAnswers(S.engine, prob);
  const norm = x => String(x || '').replace(/\s+/g, ' ').replace(/;\s*$/, '').trim().toLowerCase();
  const model = withModel && norm(mine) !== norm(prob.sql);
  if (!alts.length && !model) return '';
  return `<details class="alts"><summary>${alts.length ? H('alt.more', { n: alts.length }) : H('alt.model')}</summary>
    ${model ? `<div class="alt"><p class="alt-note"><b>${H('alt.model')}</b></p><pre class="sql">${highlightSQL(prob.sql)}</pre></div>` : ''}
    ${alts.map(a => `<div class="alt"><p class="alt-note">${H('alt.' + a.rule)}</p><pre class="sql">${highlightSQL(a.sql)}</pre></div>`).join('')}</details>`;
}
/** coming back to a solved problem: the answer that was right, and “solve it again” */
function solvedBoxHTML(prob) {
  if (!isSolved(prob.id) || S.runs[prob.id] || S.redoing.has(prob.id)) return '';
  const a = S.progress.answers[prob.id];
  const body = !a ? `<p class="muted small">${H('mine.noAnswer')}</p>` : isQuiz(prob) ? `<p class="quiz-ans">${prob.p.choices ? choiceHTML(prob, a.sql, L()) : esc(a.sql)}</p>` : `<pre class="sql">${highlightSQL(a.sql)}</pre>`;
  return `<section class="card solved-box"><div class="sb-head"><b>✓ ${H('mine.yourAnswer')}</b>${a ? `<span class="muted small">${esc(fmtWhen(a.at))}</span>` : ''}<button class="btn btn-ghost btn-sm" data-act="redo">${I.reset}${H('mine.redo')}</button></div>${body}${altsHTML(prob, true, a && a.sql)}</section>`;
}
const fmtWhen = t => { try { return new Date(t).toLocaleString(htmlLang(L()) === 'my' ? 'en' : htmlLang(L()), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

/* ---------- looking back: every solved problem with the answer that was right ---------- */
function solvedHTML() {
  document.title = `${T('mine.title')} · SQL Practice`;
  const assigned = S.klass ? (S.klass.lessons || []).filter(k => LESSON_BY_KEY[k]) : [];
  const keys = [...assigned, ...LESSONS.map(l => l.key).filter(k => !assigned.includes(k))];
  const blocks = keys.map(k => {
    const l = LESSON_BY_KEY[k], probs = problemsOf(l).filter(p => solvedEver(p.id));
    if (!probs.length) return '';
    const link = p => (assigned.includes(k) ? liveHash(p) : `#/l/${k}/${p.idx}`);
    return `<section class="card mine-lesson"><h2><span class="lesson-num">${l.no}</span>${lessonTitleHTML(l, L())}${assigned.includes(k) ? `<span class="tag">${H('nav.assign')}</span>` : ''}</h2>
      ${probs.map(p => { const a = S.progress.answers[p.id]; return `<div class="mine-item"><a class="mine-what" href="${link(p)}"><b>${stageLabelH(p)}</b><span class="muted small">${esc(p.stage === 'demo' ? T('stage.demoSub') : themeName(p, L()))}</span>${I.next}</a>
        ${a ? (isQuiz(p) ? `<p class="quiz-ans">${p.p.choices ? choiceHTML(p, a.sql, L()) : esc(a.sql)}</p>` : `<pre class="sql">${highlightSQL(a.sql)}</pre>`) : `<p class="muted small">${H('mine.noAnswer')}</p>`}${altsHTML(p, true, a && a.sql)}</div>`; }).join('')}</section>`;
  }).join('');
  return `<main class="wrap narrow"><h1 class="page-title">✓ ${H('mine.title')}</h1><p class="muted">${H('mine.sub')}</p>${blocks || `<section class="card empty"><p class="muted">${H('mine.none')}</p></section>`}</main>`;
}

function tableBlockHTML(name, prob) {
  const tbl = ALL_TABLES[name];
  const open = !S.hideData[name];
  const qualify = prob.tables.length > 1;
  return `<div class="tbl">
    <div class="tbl-head">
      <span class="tbl-name">${I.table}${esc(name)}</span><span class="muted small">${H('prob.rows', { n: tbl.rows.length })}</span>
      ${tbl.analysis ? `<button class="btn btn-ghost btn-xs" data-act="csv" data-t="${esc(name)}" title="${esc(T('an.csv'))}">⤓ CSV</button>` : ''}
      <button class="btn btn-ghost btn-xs" data-tb-open="${esc(prob.tables.join(','))}" data-tb-at="${prob.tables.indexOf(name)}" title="${esc(T('tb.project'))}" aria-label="${esc(T('tb.project'))}">${I.screen}</button>
      <button class="btn btn-ghost btn-xs data-toggle" data-act="toggleData" data-t="${esc(name)}" aria-expanded="${open}">${I.eye}${esc(open ? T('prob.hideData') : T('prob.showData'))}</button>
    </div>
    <div class="cols">${tbl.columns.map(([c, ty]) => `<button class="col-chip" data-act="insert" data-text="${esc(qualify ? name + '.' + c : c)}" title="${esc(T('prob.colsTip'))}">${esc(c)}<small>${ty === 'INTEGER' ? '123' : 'abc'}</small></button>`).join('')}</div>
    ${open ? `<div class="data-box">${gridHTML(S.engine.tableData(name))}</div>` : ''}
  </div>`;
}

/* ---------- example: step-by-step ---------- */
/** the clause keywords of a statement, in written order: SELECT → FROM → WHERE …  (INSERT INTO → VALUES …) */
function clauseSeq(sql) {
  const re = /\b(SELECT|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|FROM|(?:INNER\s+|LEFT\s+)?JOIN|ON|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET)\b/gi;
  const flat = String(sql).replace(/'(?:[^']|'')*'/g, "''");
  let depth = 0, out = [], m;
  const at = []; for (let i = 0; i < flat.length; i++) { if (flat[i] === '(') depth++; else if (flat[i] === ')') depth--; at[i] = depth; }
  while ((m = re.exec(flat))) { if (at[m.index]) continue; const k = m[1].toUpperCase().replace(/\s+/g, ' '); if (out[out.length - 1] !== k) out.push(k); }
  return out.join(' → ');
}
function stepsHTML(prob) {
  if (!prob.steps.length) return '';
  if (S.step === null) {
    return `<div class="demo-box"><div><b>${I.steps} ${H('pres.steps')}</b><p>${H('pres.tip')}</p></div><button class="btn btn-warn" data-act="stepStart">${H('pres.start')}${I.next}</button></div>`;
  }
  const i = S.step, n = prob.steps.length;
  const [key, sql] = prob.steps[i];
  const prev = i > 0 ? prob.steps[i - 1][1] : '';
  let res = null, err = '';
  try { res = S.engine.exec(sql); } catch (e) { err = e.message; }
  const kind = STEP_TO_KIND[key];
  // INSERT / UPDATE / DELETE: colour the new or changed rows, and list the rows that were removed
  let gridOpts = { rowNums: true }, removed = '';
  if (res && res.dml) {
    const before = S.engine.tableData(res.dml.table), had = new Set(before.values.map(r => JSON.stringify(r))), now = new Set(res.values.map(r => JSON.stringify(r)));
    gridOpts = { rowNums: true, rowClass: r => (had.has(JSON.stringify(r)) ? '' : 'chg') };
    const gone = before.values.filter(r => !now.has(JSON.stringify(r)));
    if (gone.length && /^\s*DELETE\b/i.test(sql)) removed = `<div class="muted small strong step-gone">${H('pres.deleted')} · ${H('prob.rows', { n: gone.length })}</div><div class="data-box gone">${gridHTML({ columns: before.columns, values: gone })}</div>`;
  }
  const join = (key === 'step.join_inner' || key === 'step.join_left') ? joinHTML(S.engine, prob.p, key === 'step.join_left' ? 'left' : 'inner', L()) : '';
  return `<section class="card steps" aria-live="polite">
    <div class="steps-head">
      <b>${H('pres.step', { a: i + 1, b: n })}</b>
      <span class="step-pips">${prob.steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>
      <button class="btn btn-ghost btn-xs" data-act="stepClose">${I.x}${H('btn.close')}</button>
    </div>
    <p class="step-text">${withGloss(bi(key, null, 'span'))}</p>
    <pre class="sql step-sql">${highlightDiff(prev, sql)}</pre>
    ${orderStripHTML(prob.sql, kind, L())}
    ${join}
    <div class="muted small strong">${H('pres.result')} · ${H('prob.rows', { n: res ? res.values.length : 0 })}</div>
    <div class="data-box">${res ? gridHTML(res, gridOpts) : `<div class="res-empty">${esc(err || T('res.noRows'))}</div>`}</div>${removed}
    <div class="step-actions">
      <button class="btn btn-ghost" data-act="stepPrev" ${i === 0 ? 'disabled' : ''}>${I.prev}${H('pres.prev')}</button>
      ${i < n - 1 ? `<button class="btn btn-warn" data-act="stepNext">${H('pres.next')}${I.next}</button>`
        : `<button class="btn btn-primary" data-act="useSql" data-sql="${esc(prob.sql)}">${H('hint.use')}</button>`}
    </div>
  </section>`;
}

/* ---------- stage bodies ---------- */
function answerVisible(prob) {
  const pol = S.route.view === 'session' ? 'after2' : answerPolicy();
  if (pol === 'always' || prob.stage === 'demo') return true;
  if (pol === 'never') return false;
  if (pol === 'solved') return isSolved(prob.id);
  return isSolved(prob.id) || (S.progress.wrong[prob.id] || 0) >= 2;
}
function stageHTML(prob) {
  if (isQuiz(prob)) return quizHTML(prob);
  if (prob.stage === 'fill') return fillHTML(prob);
  if (prob.stage === 'order') return orderHTML(prob);
  return writeHTML(prob);
}
function hintsHTML(prob) {
  if (prob.test) return '';   // a check test: no hints and no answer until the end
  const lesson = LESSON_BY_KEY[prob.lesson];
  const vis = answerVisible(prob);
  const wrong = S.progress.wrong[prob.id] || 0;
  const lockMsg = answerPolicy() === 'never' ? T('hint.lockedNever') : answerPolicy() === 'solved' ? T('hint.lockedSolved') : T('hint.locked', { n: Math.max(0, 2 - wrong) });
  return `<div class="hints">
    <details class="hint"><summary><span class="hi">1</span>${H('hint.syntax')}</summary>
      <div class="hint-body"><pre class="sql">${highlightSQL(syntaxHint(lesson, L()))}</pre></div></details>
    <details class="hint"><summary><span class="hi">2</span>${H('hint.blank')}</summary>
      <div class="hint-body"><pre class="sql">${highlightSQL(prob.blank)}</pre>
      <button class="btn btn-ghost btn-sm" data-act="useSql" data-sql="${esc(prob.blank)}">${H('hint.use')}</button></div></details>
    <details class="hint ${vis ? '' : 'locked'}" ${vis ? '' : 'data-locked="1"'}><summary><span class="hi">${vis ? '✓' : I.lock}</span>${H('hint.answer')}${vis ? '' : `<span class="muted small lockmsg">${esc(lockMsg)}</span>`}</summary>
      ${vis ? `<div class="hint-body"><pre class="sql">${highlightSQL(prob.sql)}</pre>
      <button class="btn btn-ghost btn-sm" data-act="useSql" data-sql="${esc(prob.sql)}">${H('hint.use')}</button>${altsHTML(prob)}</div>` : ''}</details>
  </div>`;
}
/* Lesson 0: read the table and type the answer */
function quizHTML(prob) {
  const run = S.runs[prob.id];
  const val = S.progress.drafts['q:' + prob.id] || '';
  const vis = answerVisible(prob) && !prob.test;
  const wrong = S.progress.wrong[prob.id] || 0;
  const lesson = LESSON_BY_KEY[prob.lesson];
  const answerBox = `<details class="hint ${vis ? '' : 'locked'}" ${vis ? '' : 'data-locked="1"'}><summary><span class="hi">${vis ? '✓' : I.lock}</span>${H('hint.answer')}${vis || prob.test ? '' : `<span class="muted small lockmsg">${esc(T('hint.locked', { n: Math.max(0, 2 - wrong) }))}</span>`}</summary>
        ${vis ? `<div class="hint-body"><p class="quiz-ans">${answerTextHTML(prob, L())}</p>${prob.p.choices && raw(`L.${prob.lesson}.why_${prob.p.q || prob.p.w}`, L()) !== `L.${prob.lesson}.why_${prob.p.q || prob.p.w}` ? `<p class="why">${bi(`L.${prob.lesson}.why_${prob.p.q || prob.p.w}`, Object.fromEntries(Object.entries(prob.p).filter(([, v]) => typeof v !== 'object').map(([k, v]) => [k, `<code>${esc(v)}</code>`])), 'span')}</p>` : ''}${/^SELECT\b/i.test(prob.sql) && !/^SELECT\s+'/i.test(prob.sql) && !prob.p.choices ? `<p class="muted small">${H('quiz.bySql')}</p><pre class="sql">${highlightSQL(prob.sql)}</pre>` : ''}</div>` : ''}</details>`;
  if (prob.p.choices) {   // read a result and choose
    let res = null; try { res = S.engine.exec(prob.sql); } catch (e) { res = null; }
    const picked = run && run.sql, ok = run && run.grade && run.grade.ok;
    return `<section class="card editor-card quiz quiz-read">
      <div class="read-box"><div class="muted small strong">${H('read.result')}</div><div class="data-box">${res ? gridHTML(res, { rowNums: res.values.length > 3 }) : ''}</div>${res ? resultChartHTML(lesson, prob, res, L()) : ''}</div>
      <div class="choices" role="group" aria-label="${esc(T('quiz.label'))}">${prob.p.choices.map(k => `<button class="choice ${picked === String(k) ? (ok ? 'ok' : 'bad') : ''}" data-act="choose" data-v="${esc(String(k))}">${choiceHTML(prob, k, L())}</button>`).join('')}</div>
      ${answerBox}
    </section>`;
  }
  return `<section class="card editor-card quiz">
      <form class="quiz-form" data-form="quiz">
        <label class="quiz-label" for="quiz-in">${H('quiz.label')}</label>
        <div class="quiz-row"><input id="quiz-in" class="quiz-in ${run ? (run.grade && run.grade.ok ? 'ok' : 'bad') : ''}" value="${esc(val)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="btn btn-primary btn-run">${I.check}${H('fill.check')}</button></div>
      </form>
      ${answerBox}
    </section>`;
}
function choose(el) {   // a choice question: the choice is the answer
  const c = current(); if (!c) return;
  const v = el.dataset.v;
  S.progress.drafts['q:' + c.prob.id] = v;
  const ok = checkAnswer(c.prob, v);
  record(c.prob, ok, { grade: ok ? { ok: true } : { ok: false, reason: 'answer' }, dx: ok ? [] : [{ key: 'choiceWrong', vars: {} }], sql: v }, v);
  afterCheck(['stage']);
}
function checkQuiz() {
  const c = current(); if (!c) return;
  const inp = document.getElementById('quiz-in');
  const text = inp ? inp.value : '';
  S.progress.drafts['q:' + c.prob.id] = text;
  if (!text.trim()) { S.runs[c.prob.id] = { error: { code: 'empty' }, dx: [] }; afterCheck(['stage']); return; }
  const ok = checkAnswer(c.prob, text);
  record(c.prob, ok, { grade: ok ? { ok: true } : { ok: false, reason: 'answer' }, dx: ok ? [] : [{ key: 'quizWrong', vars: {} }], sql: text }, text);
  afterCheck(['stage']);
}
/** quick input of this problem's own names: its tables, their columns, and the values the problem mentions */
function namesBarHTML(prob) {
  const tabs = (prob.tables || []).filter(n => ALL_TABLES[n]); if (!tabs.length) return '';
  const chip = (text, cls) => `<button class="kw-chip nm ${cls}" data-act="insertKw" data-text="${esc(text)}">${esc(text)}</button>`;
  const text = String(problemHTML(prob, L())).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const vals = [];
  String(prob.sql || '').replace(/'((?:[^']|'')*)'|(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/g, (m, str, num) => { const v = str !== undefined ? str.replace(/''/g, "'") : num; if (v && !vals.includes(v) && new RegExp(`(^|[^\\w])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w])`).test(text)) vals.push(v); return m; });
  return `<div class="kwbar names"><span>${H('order.g.table')}</span>${tabs.map(n => chip(n, 'tb')).join('')}</div>
    ${tabs.map(n => `<div class="kwbar names"><span>${tabs.length > 1 ? `${esc(n)} · ` : ''}${H('order.g.col')}</span>${ALL_TABLES[n].columns.map(c => chip(c[0], 'cl')).join('')}</div>`).join('')}
    ${vals.length ? `<div class="kwbar names"><span>${H('order.g.val')}</span>${vals.map(v => chip(v, 'vl')).join('')}</div>` : ''}`;
}
function writeHTML(prob) {
  const kws = LESSON_BY_KEY[prob.lesson].keywords || [];
  return `${hintsHTML(prob)}
    <section class="card editor-card">
      <div class="kwbar"><span>${H('ed.insert')}</span>${kws.map(k => `<button class="kw-chip" data-act="insertKw" data-text="${esc(k)}">${esc(k)}</button>`).join('')}</div>
      ${namesBarHTML(prob)}
      <div class="editor" id="editor"></div>
      <div class="actions">
        <button class="btn btn-primary btn-run" data-act="run">${I.play}${H('ed.run')}</button>
        <button class="btn btn-ghost" data-act="reset">${I.reset}${H('ed.reset')}</button>
        <span class="hint-key">${H('ed.shortcut')}</span>
      </div>
    </section>`;
}
function fillHTML(prob) {
  const task = S.engine.fillTask(prob);
  const vals = S.progress.drafts['f:' + prob.id] || [];
  const run = S.runs[prob.id];
  const marks = run && run.blanks;
  const seen = new Set();
  const code = task.parts.map(x => {
    if (typeof x === 'string') return highlightSQL(x);
    const b = x.blank;
    const v = vals[b] || '';
    const cls = marks ? (marks[b] ? 'ok' : 'bad') : '';
    if (seen.has(b)) return `<span class="blank-mirror ${cls}" data-mirror="${b}">${esc(v || '___')}</span>`;
    seen.add(b);
    return `<input class="blank ${cls}" data-b="${b}" value="${esc(v)}" style="width:${Math.max(6, v.length + 2)}ch" aria-label="${esc(T('fill.blank', { n: b + 1 }))}" autocomplete="off" autocapitalize="off" spellcheck="false">`;
  }).join('');
  return `<section class="card editor-card">
      <pre class="sql fill-code">${code}</pre>
      <div class="actions">
        <button class="btn btn-primary btn-run" data-act="checkFill">${I.check}${H('fill.check')}</button>
        <button class="btn btn-ghost" data-act="resetFill">${I.reset}${H('ed.reset')}</button>
        <span class="hint-key">${H('fill.tip')}</span>
      </div>
    </section>`;
}
/* ordering pieces, grouped by what they start with: SQL words, table names, column names (and names given with AS), symbols, values */
const ORD_KW = new Set(['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'ORDER', 'GROUP', 'BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'INNER', 'LEFT', 'ON', 'AS', 'DISTINCT', 'BETWEEN', 'IN', 'LIKE', 'IS', 'NULL', 'ASC', 'DESC']);
const ORD_FN = /^(COUNT|SUM|AVG|MAX|MIN|ROUND|LENGTH|UPPER|LOWER|COALESCE)\(/i;
const ORD_GROUPS = ['kw', 'table', 'col', 'op', 'val'];
function pieceGroup(text) {
  const w = text.trim().split(/\s+/)[0], bare = w.replace(/^\(+|[,;)]+$/g, '');
  if (ORD_KW.has(w.toUpperCase())) return 'kw';
  if (ALL_TABLES[bare]) return 'table';
  if (ORD_FN.test(w) || /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_*][A-Za-z0-9_]*)?$/.test(bare)) return 'col';
  if (/^(=|<>|!=|<=|>=|<|>|\*|\+|-|\/|%|\|\|)$/.test(bare)) return 'op';
  return 'val';
}
const groupsOf = task => {
  if (!task.fine) return null;
  const gs = ORD_GROUPS.map(key => ({ key, items: task.chunks.filter(c => pieceGroup(c.text) === key) })).filter(g => g.items.length);
  return gs.length > 1 ? gs : null;
};
const chipBtn = c => `<button class="ord-chip" data-act="place" data-id="${c.id}"><code>${highlightSQL(c.text)}</code></button>`;
function orderHTML(prob) {
  const task = S.engine.orderTask(prob);
  if (!task) return writeHTML(prob);
  const placed = S.progress.drafts['o:' + prob.id] || [];
  const byId = Object.fromEntries(task.chunks.map(c => [c.id, c]));
  const pool = task.chunks.filter(c => !placed.includes(c.id));
  const run = S.runs[prob.id];
  return `<section class="card editor-card order ${task.fine ? 'fine' : ''}">
      <div class="ord-label">${H('order.answer')}</div>
      <ol class="ord-ans ${run && run.grade && run.grade.ok ? 'ok' : ''}" aria-live="polite">${placed.length ? placed.map((id, i) => `<li><button class="ord-chip placed" data-act="unplace" data-id="${id}" aria-label="${esc(T('order.remove'))}"><span class="ord-n">${i + 1}</span><code>${highlightSQL(byId[id].text)}</code>${I.x}</button></li>`).join('') : `<li class="ord-empty">${H('order.empty')}</li>`}</ol>
      <div class="ord-label">${H('order.pool')}</div>
      <div class="ord-pool ${groupsOf(task) ? 'grouped' : ''}">${groupsOf(task) ? groupsOf(task).map(g => `<div class="ord-grp"><small class="ord-grp-h">${H('order.g.' + g.key)}</small><div class="ord-grp-items">${g.items.filter(c => !placed.includes(c.id)).map(chipBtn).join('') || '<span class="muted small">—</span>'}</div></div>`).join('') : pool.map(chipBtn).join('') || `<span class="muted small">${H('order.allUsed')}</span>`}</div>
      ${task.fine ? `<p class="ord-level">${H('order.fine')}</p>` : ''}<p class="muted small">${H('order.tip')} ${H('order.dragTip')}</p>
      <div class="actions">
        <button class="btn btn-primary btn-run" data-act="checkOrder" ${placed.length ? '' : 'disabled'}>${I.check}${H('fill.check')}</button>
        <button class="btn btn-ghost" data-act="resetOrder">${I.reset}${H('ed.reset')}</button>
      </div>
    </section>`;
}

/* ---------- feedback ---------- */
function feedbackHTML(prob) {
  const run = S.runs[prob.id];
  if (!run) return '';
  if (prob.rank) return run.grade && run.grade.ok ? `<div class="fb ok rk-fb" role="status"><div class="fb-icon">○</div><div class="fb-body"><h3>${H('rk.ok')}</h3></div></div>`
    : `<div class="fb bad rk-fb" role="alert"><div class="fb-icon">×</div><div class="fb-body"><h3>${H('rk.miss')}</h3><p class="muted small">${H('rk.missSub')}</p></div></div>`;   // a rank test: no hints
  const code = v => `<code>${esc(v)}</code>`;
  const items = (run.dx || []).map(d => {
    const vars = {};
    Object.entries(d.vars || {}).forEach(([k, v]) => { if (typeof v !== 'object') vars[k] = code(v); });
    return `<li>${withGloss(bi('dx.' + d.key, vars, 'div'))}</li>`;
  }).join('');
  if (run.error && run.error.code === 'empty') return `<div class="fb bad" role="alert"><div class="fb-icon">!</div><div class="fb-body"><h3>${H('fb.notYet')}</h3><p>${bi('fb.empty')}</p></div></div>`;
  if (run.error && run.error.code === 'onlySelect') return `<div class="fb bad" role="alert"><div class="fb-icon">!</div><div class="fb-body"><h3>${H('fb.notYet')}</h3><p>${bi('fb.onlySelect')}</p></div></div>`;
  if (run.grade && run.grade.ok) {
    const c = current();
    const isLast = !c || prob.idx >= c.probs.length - 1;
    let next = '';
    if (S.route.view === 'quick') { const n = qNext(prob); next = n ? `<a class="btn btn-ok fb-next" href="#/quick/${n.qn}">${H('btn.next')}${I.next}</a>` : `<a class="btn btn-ok fb-next" href="#/quick/done">${H('qk.finish')}${I.next}</a>`; }
    else if (S.route.view === 'session') next = `<button class="btn btn-ok fb-next" data-act="sessionNext">${H('btn.next')}${I.next}</button>`;
    else if (S.route.view === 'live') {   // the assignment: on to the next unsolved assigned problem, in any lesson
      const n = nextAssigned(prob);
      next = n ? `<a class="btn btn-ok fb-next" href="${liveHash(n)}">${n.lesson !== prob.lesson ? H('live.nextLesson', { n: LESSON_BY_KEY[n.lesson].no }) : H('btn.next')}${I.next}</a>`
        : `<a class="btn btn-ok fb-next" href="#/live/done">${H('live.finish')}${I.next}</a>`;
    }
    else if (!isLast) next = `<a class="btn btn-ok fb-next" href="#/l/${prob.lesson}/${prob.idx + 1}">${H('btn.next')}${I.next}</a>`;
    else { const nl = LESSONS[LESSON_BY_KEY[prob.lesson].index + 1]; if (nl) next = `<a class="btn btn-ok fb-next" href="#/l/${nl.key}/0">${H('btn.nextLesson')}${I.next}</a>`; }
    return `<div class="fb ok" role="status"><div class="fb-icon">${I.check}</div><div class="fb-body"><h3>${H('fb.correct')}</h3><p>${run.lessonDone ? bi('lesson.done') : bi('fb.correctSub')}</p>${altsHTML(prob, true, run.sql)}</div>${next}</div>`;
  }
  const title = run.error && (prob.stage === 'write' || prob.stage === 'demo') ? T('fb.error') : T('fb.notYet');
  const raw = run.error && !(run.dx || []).length ? `<pre class="errmsg">${esc(run.error.message)}</pre>` : '';
  const tested = prob.test && !prob.quick && S.session && S.session.done[prob.id] !== undefined;   // a check test: the first answer counted; go on
  const qn = S.route.view === 'quick' ? qNext(prob) : null;
  const skip = qn ? `<a class="btn ${qOnce() ? 'btn-primary' : 'btn-ghost btn-sm'} fb-next" href="#/quick/${qn.qn}">${qOnce() ? H('btn.next') + I.next : H('qk.other')}</a>` : S.route.view === 'quick' && qOnce() ? `<a class="btn btn-primary fb-next" href="#/quick/done">${H('qk.finish')}</a>` : S.route.view === 'session' ? `<button class="btn ${tested ? 'btn-primary' : 'btn-ghost btn-sm'} fb-next" data-act="sessionNext">${tested ? H('btn.next') + I.next : H('review.skip')}</button>` : '';
  const back = stepForMistake(prob, run.sql, run.dx);
  const backHTML = back ? `<div class="bs-back"><span>🧱 ${H('bs.backTitle')}</span><span class="muted small">${bsName(back)}</span><a class="btn btn-ghost btn-sm" href="#/basics/${back}">${H('bs.backGo')}${I.next}</a></div>` : '';
  return `<div class="fb bad" role="alert"><div class="fb-icon">?</div><div class="fb-body"><h3>${esc(title)}</h3><ul class="dx">${items}</ul>${raw}${backHTML}${S.route.view === 'quick' ? qRefHTML(prob) : ''}${run.error && !run.quiet && (run.dx || []).length ? `<details class="errraw"><summary>${H('fb.rawError')}</summary><pre class="errmsg">${esc(run.error.message)}</pre></details>` : ''}</div>${skip}</div>`;
}

/* ---------- results ---------- */
function resultsHTML(prob) {
  const run = S.runs[prob.id];
  const exp = S.engine.exec(prob.sql);
  const user = run && run.res;
  const tab = (k, label, res) => `<button class="res-tab ${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" role="tab" aria-selected="${S.tab === k}">${esc(label)}${res ? `<span class="count">${res.values.length}</span>` : ''}</button>`;
  // INSERT / UPDATE / DELETE: rows that are new or changed are highlighted
  const before = exp && exp.dml ? new Set(S.engine.tableData(exp.dml.table).values.map(r => JSON.stringify(r))) : null;
  const opts = { rowNums: true, rowClass: before ? r => (before.has(JSON.stringify(r)) ? '' : 'chg') : null };
  let body;
  if (S.tab === 'expected') body = gridHTML(exp, opts);
  else if (!run || run.error) body = `<div class="res-empty">${H('res.notRun')}</div>`;
  else if (!user.columns.length || !user.values.length) body = `<div class="res-empty">${H('res.noRows')}</div>`;
  else body = gridHTML(user, user.dml ? opts : { rowNums: true });
  // data analysis: the result as a chart too
  const lesson = LESSON_BY_KEY[prob.lesson];
  if (lesson.chart) body += resultChartHTML(lesson, prob, S.tab === 'expected' ? exp : (run && !run.error ? user : null), L());
  const after = exp && exp.dml ? `<p class="res-after muted small">${H('res.after', { t: exp.dml.table })}</p>` : '';
  return `<section class="card results">${after}
    <div class="res-tabs" role="tablist">${tab('user', T('res.yours'), run && !run.error ? user : null)}${tab('expected', T('res.expected'), exp)}</div>
    <div class="res-body">${body}</div>
  </section>`;
}

/* ---------- mount editor / inputs ---------- */
function mountWorkspace() {
  const c = current();
  if (!c) return;
  const el = document.getElementById('editor');
  if (!el) return;
  if (!createEditor) { loadEditor().then(() => { if (document.getElementById('editor') === el && el.isConnected) mountWorkspace(); }); return; }
  const prob = c.prob;
  const schema = {};
  prob.tables.forEach(n => { schema[n] = ALL_TABLES[n].columns.map(x => x[0]); });
  let timer;
  S.editor = createEditor(el, {
    doc: S.progress.drafts[prob.id] !== undefined ? S.progress.drafts[prob.id] : `SELECT * FROM ${prob.tables[0]};`,
    schema,
    placeholder: T('ed.placeholder'),
    label: T('ed.yourSql'),
    onRun: runWrite, key: prob.id,
    onChange: v => { S.progress.drafts[prob.id] = v; clearTimeout(timer); timer = setTimeout(save, 400); }   // the draft at once (a redraw keeps it), stored a little later
  });
  const run = S.runs[prob.id];
  if (run && run.mark) S.editor.mark(run.mark.from, run.mark.to);
}
function refresh(parts) {
  const c = current();
  if (!c) return;
  const prob = c.prob;
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  if (parts.includes('steps')) { put('ws-steps', stepsHTML(prob)); drawJoinLines(app); }
  if (parts.includes('stage')) {
    if (S.editor) { saveDraft(); S.editor.destroy(); S.editor = null; }
    put('ws-stage', stageHTML(prob)); mountWorkspace();
  }
  if (parts.includes('hints')) { const h = document.querySelector('#ws-stage .hints'); if (h) { const open = [...h.querySelectorAll('details')].map(d => d.open); h.outerHTML = hintsHTML(prob); document.querySelectorAll('#ws-stage .hints details').forEach((d, i) => { if (open[i] && !d.dataset.locked) d.open = true; }); } }
  if (parts.includes('fb')) put('ws-fb', feedbackHTML(prob));
  if (parts.includes('res') && !isQuiz(prob)) put('ws-res', resultsHTML(prob));
  if (parts.includes('side')) { const side = document.querySelector('.plist'); if (side && S.route.view === 'lesson') { const tmp = document.createElement('div'); tmp.innerHTML = lessonHTML(); const n = tmp.querySelector('.plist'); if (n) side.replaceWith(n); } }
  if (parts.includes('side') && S.route.view === 'quick') { const tmp = document.createElement('div'); tmp.innerHTML = quickViewHTML(); ['.session-head', '.qk-dots'].forEach(sel => { const o = document.querySelector(sel), n = tmp.querySelector(sel); if (o && n) o.replaceWith(n); }); }
  if (parts.includes('side') && S.route.view === 'live') { const side = document.querySelector('.live-side'); if (side) { const tmp = document.createElement('div'); tmp.innerHTML = liveViewHTML(); const n = tmp.querySelector('.live-side'); if (n) side.replaceWith(n); } }   // the assignment's ticks and count
}

/* =========================================================
 * CHECKING ANSWERS
 * ========================================================= */
function evaluate(prob, sql, extra) {
  const exp = S.engine.exec(prob.sql);
  let run;
  try {
    const res = S.engine.runUser(sql);
    const names = LESSON_BY_KEY[prob.lesson].names;
    const g = grade(res, exp, prob.ordered, sql, names);
    const fix = g.ok ? null : findFix(sql, s => S.engine.runUser(s), r => grade(r, exp, prob.ordered, null, names).ok);
    const d = diagnose({ sql, grade: g, prob, fix });
    run = { res, grade: g, dx: d.items, mark: d.mark, sql };
  } catch (e) {
    const err = { code: e.code || 'sql', message: e.message };
    const d = diagnose({ sql, error: err, prob });
    run = { error: err, dx: d.items, mark: d.mark, sql };
  }
  Object.assign(run, extra || {});
  return record(prob, !!(run.grade && run.grade.ok), run, sql);
}
/** progress, streak, review and class log after a check */
function record(prob, ok, run, sql) {
  const empty = run.error && run.error.code === 'empty';
  if (!empty && prob.quick) {   // the quick test: retry until right; the class log tells the teacher who has finished
    if (qPhaseNow() !== 'run') { render(); return; }   // the time is over (or not started): the answer does not count
    if (qOnce() && qTried(prob)) { S.runs[prob.id] = run; render(); return run; }   // a level test: the first answer was recorded
    if (!qDone(prob)) qAnswer(prob.qn, sql);
    if (qOnce()) qTry(prob.qn);
    if (ok && !qDone(prob)) { qMark(prob.qn); bumpStreak(S.progress); }
    if (S.klass && backend.enabled) backend.logAttempt({ class_id: S.klass.id, problem_id: prob.id.slice(0, 80), lesson: prob.lesson, stage: 'quick', ok, reason: ok ? null : (run.grade ? run.grade.reason : 'error'), sql: String(sql).slice(0, 2000) });
  } else if (!empty && prob.test) {   // a check test: only the test keeps score; the lessons' progress is not touched
    if (ok) bumpStreak(S.progress);
    const ses = S.session;
    if (ses && (ses.kind === 'check' || (ses.kind === 'level' && ses.sub === 'test')) && ses.done[prob.id] === undefined) { ses.done[prob.id] = ok; ses.ans[prob.id] = String(sql).slice(0, 2000); }
    if (ses && ses.kind === 'rank' && prob.rank && ses.phase === 'run' && !ses.done[prob.id]) {   // a rank test: a wrong check is a miss; a right one moves on
      if (ok) { ses.done[prob.id] = true; setTimeout(rkNext, 450); } else { ses.miss[prob.id] = (ses.miss[prob.id] || 0) + 1; setTimeout(() => { if (S.session === ses) render(); }, 0); }   // show the miss count and the dots
    }
  } else if (!empty) {
    if (ok) {
      const lesson = LESSON_BY_KEY[prob.lesson];
      const extra = prob.kind === 'review' || prob.kind === 'drill';   // not one of the lesson's own problems
      if (!solvedEver(prob.id)) {
        const before = !extra && ownStateOf(lesson).done;
        S.progress.solved[prob.id] = Date.now();
        S.progress.answers[prob.id] = { sql: String(sql).slice(0, 2000), at: Date.now() };   // the answer that was right, for looking back
        if (!extra && !before && ownStateOf(lesson).done) { markLessonDone(S.progress, lesson.key); run.lessonDone = true; }
      }
      if (!extra && inRound(prob.lesson)) {   // the class assignment: solved in this class
        const before = stateOf(lesson).done;
        if (markRound(prob.id) && !before && stateOf(lesson).done) run.lessonDone = true;
      }
      bumpStreak(S.progress);
    } else S.progress.wrong[prob.id] = (S.progress.wrong[prob.id] || 0) + 1;
    if (ok && /^task:/.test(prob.id) && Number.isInteger(prob.tn)) taskMark(prob.id.split(':')[1], prob.tn);   // the assignment: solved (also on a second try)
    if (S.route.view === 'session' && S.session && S.session.done[prob.id] === undefined) {
      S.session.done[prob.id] = ok;
      if (S.session.kind === 'bsmix' && prob.basic && prob.bf === Math.min(bsState(prob.basic).f, BASIC_BY_KEY[prob.basic].formats.length - 1)) { S.progress.basics = S.progress.basics || {}; S.progress.basics[prob.basic] = basicResult(S.progress.basics[prob.basic], ok, BASIC_BY_KEY[prob.basic].formats.length - 1); }
      if (S.session.kind === 'basics' && prob.basic) { S.progress.basics = S.progress.basics || {}; S.progress.basics[prob.basic] = basicResult(S.progress.basics[prob.basic], ok, BASIC_BY_KEY[prob.basic].formats.length - 1); }
      if (S.session.kind === 'review' && prob.pat) {   // only this pattern moves: up a step (or a longer gap), or down a step
        S.progress.pat = S.progress.pat || {};
        const next = patResult(S.progress.pat[prob.pat], LESSON_BY_KEY[prob.lesson], ok, today());
        S.progress.pat[prob.pat] = next; S.session.moves[prob.id] = { to: next.f, due: next.due };
      }
      if (S.session.kind === 'drill') {
        S.session.streak = ok ? S.session.streak + 1 : 0;
        S.session.best = Math.max(S.session.best, S.session.streak);
        if (ok) { S.progress.drill = S.progress.drill || {}; S.progress.drill[prob.lesson] = (S.progress.drill[prob.lesson] || 0) + 1; }
      }
    }
    if (S.klass && backend.enabled) {
      backend.logAttempt({ class_id: S.klass.id, problem_id: prob.id.slice(0, 80), lesson: prob.lesson, stage: prob.abs ? 'quiz' : prob.kind === 'review' ? 'review' : prob.stage, ok, reason: ok ? null : (run.grade ? run.grade.reason : 'error'), sql: String(sql).slice(0, 2000) });
    }
  }
  S.runs[prob.id] = run;
  S.tab = 'user';
  save();
  return run;
}
function afterCheck(parts) {
  refresh(parts.concat(['fb', 'res', 'side']));
  const fb = document.getElementById('ws-fb');
  if (fb && fb.firstElementChild) {
    const r = fb.getBoundingClientRect();
    if (r.bottom > innerHeight || r.top < 70) fb.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
function runWrite() {
  const c = current(); if (!c || !S.editor) return;
  const sql = S.editor.get();
  S.progress.drafts[c.prob.id] = sql;
  const run = evaluate(c.prob, sql);
  afterCheck(['hints']);
  if (S.editor && run.mark) S.editor.mark(run.mark.from, run.mark.to);
}
function checkFill() {
  const c = current(); if (!c) return;
  const task = S.engine.fillTask(c.prob);
  const vals = readFill();
  // quotes count when they are part of the answer (Lesson 2: text needs ' ')
  const norm = (v, a) => { v = String(v || '').trim().replace(/\s+/g, ' ').toLowerCase(); return /^'.*'$/.test(a) ? v : v.replace(/^'|'$/g, ''); };
  const blanks = task.answers.map((a, i) => norm(vals[i], a) === norm(a, a));
  const run = evaluate(c.prob, S.engine.fillSql(task, vals), { blanks });
  if (run.grade && run.grade.ok) run.blanks = task.answers.map(() => true);
  else { const n = blanks.filter(x => !x).length; if (n) run.dx = [{ key: 'blanksWrong', vars: { n } }].concat((run.dx || []).filter(d => d.key !== 'values')).slice(0, 3); }
  afterCheck(['stage']);
}
function readFill() {
  const c = current();
  const vals = (S.progress.drafts['f:' + c.prob.id] || []).slice();
  document.querySelectorAll('input.blank').forEach(inp => { vals[+inp.dataset.b] = inp.value; });
  S.progress.drafts['f:' + c.prob.id] = vals;
  return vals;
}
function checkOrder() {
  const c = current(); if (!c) return;
  const task = S.engine.orderTask(c.prob);
  const placed = S.progress.drafts['o:' + c.prob.id] || [];
  const byId = Object.fromEntries(task.chunks.map(x => [x.id, x]));
  const sql = placed.map(id => byId[id].text).join(' ') + ';';
  const run = evaluate(c.prob, sql);
  if (!(run.grade && run.grade.ok)) {
    const extra = [];
    if (placed.some(id => byId[id].distractor)) extra.push({ key: 'distractor', vars: { c: byId['x'].text } });
    const real = placed.filter(id => !byId[id].distractor);
    if (real.length < task.answer.length) extra.push({ key: 'missingPiece' });
    else if (real.join() !== task.answer.join()) extra.push({ key: 'wrongOrder', vars: { seq: clauseSeq(c.prob.sql) } });
    // a piece problem (trap, missing, order) says it best; the SQL error of the half-built statement only confuses
    if (extra.length) { run.dx = extra; run.quiet = true; } else run.dx = (run.dx || []).slice(0, 3);
  }
  afterCheck(['stage']);
}

/* =========================================================
 * EVENTS
 * ========================================================= */
const actions = {
  rkGo() { rkStart(S.route.test); },
  rkPass() { const ses = S.session; if (!ses || ses.kind !== 'rank' || ses.phase !== 'run') return; const p = ses.items[ses.i]; if (!ses.done[p.id]) ses.pass[p.id] = true; saveDraft(); rkNext(); },
  rkAgain() { rkStopTick(); S.session = null; render(); window.scrollTo(0, 0); },
  homeOrder(el) { S.settings.order = el.dataset.v === 'book' ? 'book' : 'app'; saveSettings(S.settings); render(); },   // the home page: the app's chapters or the textbook's order
  qRef(el) { qBack = +el.dataset.qn; saveDraft(); location.hash = el.getAttribute('href'); },   // remember the problem, then open the lesson
  ...pyActions,
  lang: null,
  settings() { openSettings(); },
  classInfo() { openClassInfo(); },
  join() { openJoin(); },
  run: runWrite,
  redo() {   // solve a solved problem again: an empty answer; the problem stays solved
    const c = current(); if (!c) return;
    ['', 'f:', 'o:', 'q:'].forEach(k => delete S.progress.drafts[k + c.prob.id]);
    delete S.runs[c.prob.id]; S.redoing.add(c.prob.id); save(); render();
  },
  setPin() { openPin(); },
  lecNext() { stopAuto(); lecMove(lec.i + 1); },
  lecPrev() { stopAuto(); lecMove(lec.i - 1); },
  lecPick(el) { stopAuto(); const st = lectureSteps(lec.key)[lec.i]; quizPick(lec.key, st.slide, +el.dataset.i); lecMove(lec.i + 1); },
  lecGo(el) { stopAuto(); const i = lectureSteps(lec.key).findIndex(x => x.slide === +el.dataset.s); if (i >= 0) lecMove(i); },
  lecAuto() {
    if (lec.auto) { stopAuto(); return; }
    lec.auto = setInterval(() => lecMove(lec.i + 1), 2600);
    const b = document.querySelector('[data-act="lecAuto"]'); if (b) b.innerHTML = `⏸ ${H('lec.auto')}`;
  },
  reset() { const c = current(); delete S.progress.drafts[c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  insert(el) {
    const c = current();
    if (S.editor) S.editor.insert(el.dataset.text);
    else if (c && c.prob.stage === 'fill') { const inp = document.activeElement && document.activeElement.classList.contains('blank') ? document.activeElement : document.querySelector('input.blank'); if (inp) { inp.value = el.dataset.text; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); } }
  },
  insertKw(el) {
    const k = el.dataset.text;
    if (!S.editor) return;
    if (k === "'%%'") return S.editor.insert("'%%'", 2);
    if (k === "= ''") return S.editor.insert("= ''", 1);
    if (/\(\)$/.test(k)) return S.editor.insert(k, 1);
    if (k === ',') return S.editor.insert(', ');
    if (k === '.') return S.editor.insert('.');
    S.editor.insert(k + ' ');
  },
  useSql(el) {
    const c = current();
    if (c.prob.stage === 'fill' || c.prob.stage === 'order') return;
    if (S.editor) { S.editor.set(el.dataset.sql); S.editor.focus(); document.getElementById('editor').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  },
  tab(el) { S.tab = el.dataset.tab; refresh(['res']); },
  csv(el) { downloadCSV(el.dataset.t); },
  toggleData(el) { const n = el.dataset.t; S.hideData[n] = !S.hideData[n]; saveDraft(); render(); },
  stepStart() { S.step = 0; refresh(['steps']); },
  stepNext() { S.step++; refresh(['steps']); },
  stepPrev() { S.step = Math.max(0, S.step - 1); refresh(['steps']); },
  stepClose() { S.step = null; refresh(['steps']); },
  checkFill, checkOrder, checkQuiz, choose,
  resetFill() { const c = current(); delete S.progress.drafts['f:' + c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  place(el) { const c = current(); const k = 'o:' + c.prob.id; S.progress.drafts[k] = (S.progress.drafts[k] || []).concat(el.dataset.id); delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']); },
  unplace(el) { const c = current(); const k = 'o:' + c.prob.id; S.progress.drafts[k] = (S.progress.drafts[k] || []).filter(x => x !== el.dataset.id); delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']); },
  resetOrder() { const c = current(); delete S.progress.drafts['o:' + c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  tpSet(el) {
    const cfg = tpConfig(), k = el.dataset.k, v = el.dataset.v;
    if (k === 'ch') { const on = cfg.ch.includes(v); cfg.ch = on ? cfg.ch.filter(x => x !== v) : cfg.chapters.filter(x => x === v || cfg.ch.includes(x)); if (!cfg.ch.length) cfg.ch = [v]; }
    else if (k === 'fmt') cfg.fmt = v; else if (k === 'per') cfg.per = +v;
    Store.set(TP_KEY, { ch: cfg.ch, fmt: cfg.fmt, per: cfg.per }); render();
  },
  tpAgain() { S.session = null; render(); window.scrollTo(0, 0); },
  prSet(el) { const c = prConfig(), k = el.dataset.k; c[k] = k === 'fmt' ? el.dataset.v : +el.dataset.v; Store.set(PR_KEY, c); render(); },
  prLesson(el) { const c = prConfig(), v = el.dataset.v, order = prLessons().map(l => l.key); c.lessons = !v ? [] : c.lessons.includes(v) ? c.lessons.filter(x => x !== v) : order.filter(x => x === v || c.lessons.includes(x)); c.fine = 1; Store.set(PR_KEY, c); render(); },
  prAgain() { S.session = null; render(); window.scrollTo(0, 0); },
  prUp() { const c = prConfig(); if (c.fine) c.fine++; else c.lv = Math.min(3, c.lv + 1); Store.set(PR_KEY, c); S.session = null; render(); window.scrollTo(0, 0); },
  reviewMore() { S.session = null; render(); window.scrollTo(0, 0); },
  quickMore() { S.qMore = true; const f = qItems().find(p => !qDone(p)); location.hash = f ? `#/quick/${f.qn}` : '#/quick'; },
  levelRetest() { if (confirm(T('lv.retestConfirm'))) { S.session = null; location.hash = '#/level/test'; } },
  bsMore() { S.session = null; render(); window.scrollTo(0, 0); },
  absPut(el) {   // a chip: the word goes where the cursor is (at the end at first)
    const ta = absInput(); if (!ta || ta.readOnly) return;
    const k = el.dataset.text, at = ta.selectionStart ?? ta.value.length, before = ta.value.slice(0, at), after = ta.value.slice(at);
    const glue = [',', ')', ';', '.'].includes(k) || /[.(]$/.test(before) || (/'$/.test(before) && (before.match(/'/g) || []).length % 2 === 1);
    const piece = (glue || !before || /\s$/.test(before) ? '' : ' ') + k + (['.', '(', "'"].includes(k) ? '' : ' ');
    const head = before.replace(glue ? /\s+$/ : /$/, '');
    ta.value = head + piece + after; ta.focus(); ta.setSelectionRange((head + piece).length, (head + piece).length); absKeep(); save();
  },
  absBack() { const ta = absInput(); if (!ta || ta.readOnly) return; ta.value = ta.value.replace(/\s*(>=|<=|<>|[(),.;=<>*'%]|[^\s(),.;=<>*'%]+)\s*$/, ' ').replace(/^\s+$/, ''); ta.focus(); absKeep(); save(); },
  absClear() { const ta = absInput(); if (!ta || ta.readOnly) return; ta.value = ''; ta.focus(); absKeep(); save(); },
  absIn(el) { const c = current(); if (!c) return; const k = 'ao:' + c.prob.id, l = S.progress.drafts[k] || []; if (!l.includes(+el.dataset.v)) S.progress.drafts[k] = [...l, +el.dataset.v]; save(); render(); },
  absOut(el) { const c = current(); if (!c) return; const k = 'ao:' + c.prob.id, l = (S.progress.drafts[k] || []).slice(); l.splice(+el.dataset.v, 1); S.progress.drafts[k] = l; save(); render(); },
  absOrderClear() { const c = current(); if (!c) return; S.progress.drafts['ao:' + c.prob.id] = []; save(); render(); },
  absPick(el) {   // the missing word
    const c = current(); if (!c || !c.prob.gap) return;
    const prob = c.prob, v = el.dataset.v, run = S.runs[prob.id] || {}, picks = [...(run.picks || []), v], ok = v === prob.gap.choices[0];
    absAnswer(prob, { ok, picks, got: [], at: 0 }, v);
  },
  absRun() {
    const c = current(); if (!c || !c.prob.abs) return;
    const prob = c.prob;
    let text = '';
    if (prob.af === 'aorder') text = (S.progress.drafts['ao:' + prob.id] || []).map(k => absPieceT(prob.pool[k].toks)).join(' ');
    else { const ta = absInput(); if (!ta) return; absKeep(); text = ta.value; }
    if (!text.trim()) return;
    absAnswer(prob, absCheck(prob.shape, text, absWords()), text);
  },
  cqPick(el) {
    const q = S.cq; if (!q || q.picks[q.i] !== undefined) return;
    q.picks[q.i] = +el.dataset.v;
    if (q.i === q.items.length - 1) {   // the last answer: keep the score
      const ok = q.items.filter((x, i) => q.picks[i] === x.answer).length;
      S.progress.cq = S.progress.cq || {}; S.progress.cq[q.set] = cqRecord(S.progress.cq[q.set], ok); save();
    }
    render(); const fb = document.querySelector('.cq-fb'); if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
  cqNext() { if (S.cq) { S.cq.i++; render(); window.scrollTo(0, 0); } },
  cqAgain() { S.cq = null; render(); window.scrollTo(0, 0); },
  mixAgain() { S.session = null; render(); window.scrollTo(0, 0); },
  levelMore() { S.session = null; render(); window.scrollTo(0, 0); },
  sessionNext() {
    const ses = S.session;
    if (ses && ses.kind === 'level' && ses.sub === 'test' && ses.i < ses.items.length) {   // the placement test: no answer = wrong; the next problem fits the answers so far
      const p = ses.items[ses.i]; if (ses.done[p.id] === undefined) ses.done[p.id] = false;
      if (ses.T) lvTestStep(ses); else if (testEnds(ses.items, ses.done, ses.i)) ses.end = true;
      if (ses.end) { ses.i = ses.items.length - 1; saveDraft(); render(); window.scrollTo(0, 0); return; }
    }
    return actions.sessionNext2();
  },
  sessionNext2() { saveDraft(); if (S.session.kind === 'drill' && !S.session.done[S.session.items[S.session.i].id]) S.session.streak = 0; S.session.i++; S.tab = 'user'; render(); window.scrollTo(0, 0); },
  drillAgain() { S.session = null; render(); window.scrollTo(0, 0); },
  drillLevel(el) { Store.set('sqln.drillLevel', el.dataset.v); S.session = null; render(); },
  checkBegin() { const cfg = decodeCheck(S.route.code); if (!cfg) return; startCheck(S.route.code, cfg); render(); window.scrollTo(0, 0); },
  checkQuit() { const ses = S.session; if (!ses || ses.kind !== 'check') return; saveDraft(); ses.i = ses.items.length; render(); window.scrollTo(0, 0); },
  checkRetry() {   // the problems not answered right, again (new copies, so they start empty)
    const ses = S.session; if (!ses || ses.kind !== 'check') return;
    const tag = randomCode(3);
    const items = ses.items.filter(p => ses.done[p.id] !== true).map((p, i) => Object.assign({}, p, { id: `check:${tag}:${i}:${p.src}` }));
    startCheck(ses.code, ses.cfg, ses.seed, items); render(); window.scrollTo(0, 0);
  },
  checkAgain() { const ses = S.session; if (!ses || ses.kind !== 'check') return; startCheck(ses.code, ses.cfg, ses.cfg.seed || null); render(); window.scrollTo(0, 0); },
  mixAgain() { S.session = null; if (location.hash === '#/mix') render(); else location.hash = '#/mix'; },
  newSet() { changeSet(randomCode()); },
  todaySet() { changeSet(null); },
  gloss(el) { openGloss(el.dataset.kw); }
};
/* ---------- ordering: pieces can also be dragged (mouse, pen and touch) ----------
 * Tap still works as before. Drag a piece into "Your SQL" to put it at that place,
 * drag a placed piece to change the order, or drag it back to the pieces. */
let drag = null, justDragged = false;
function dropSpot(x, y) {
  const ans = document.querySelector('.order .ord-ans'), pool = document.querySelector('.order .ord-pool');
  const inside = (el, pad) => { if (!el) return false; const r = el.getBoundingClientRect(); return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; };
  if (inside(ans, 16)) {
    const items = [...ans.querySelectorAll('li > .ord-chip')].filter(b => b !== drag.chip);
    // the first placed piece that the pointer is before (rows wrap in level 2)
    const i = items.findIndex(b => { const r = b.getBoundingClientRect(); return y < r.top || (y <= r.bottom && x < r.left + r.width / 2); });
    return { where: 'ans', before: i < 0 ? null : items[i] };
  }
  if (inside(pool, 16)) return { where: 'pool' };
  return null;
}
function showSpot(spot) {
  document.querySelectorAll('.drop-before, .drop-end, .drop-pool').forEach(el => el.classList.remove('drop-before', 'drop-end', 'drop-pool'));
  if (!spot) return;
  if (spot.where === 'pool') document.querySelector('.order .ord-pool').classList.add('drop-pool');
  else if (spot.before) spot.before.parentNode.classList.add('drop-before');
  else document.querySelector('.order .ord-ans').classList.add('drop-end');
}
function endDrag(apply) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.ghost) d.ghost.remove();
  d.chip.classList.remove('dragging');
  document.body.classList.remove('ord-dragging');
  showSpot(null);
  if (!d.on) return;
  justDragged = true; setTimeout(() => { justDragged = false; }, 0);
  if (!apply || !d.spot) return;
  const c = current(); if (!c) return;
  const k = 'o:' + c.prob.id;
  const list = (S.progress.drafts[k] || []).filter(x => x !== d.id);
  if (d.spot.where === 'ans') {
    const at = d.spot.before ? list.indexOf(d.spot.before.dataset.id) : -1;
    if (at < 0) list.push(d.id); else list.splice(at, 0, d.id);
  }
  S.progress.drafts[k] = list; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']);
}
document.addEventListener('pointerdown', e => {
  const chip = e.target.closest('.order .ord-chip');
  if (!chip || e.button > 0 || drag) return;
  drag = { chip, id: chip.dataset.id, x: e.clientX, y: e.clientY, on: false, pid: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.on) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;   // a small move is still a tap
    drag.on = true;
    const r = drag.chip.getBoundingClientRect();
    drag.dx = drag.x - r.left; drag.dy = drag.y - r.top;
    drag.ghost = drag.chip.cloneNode(true);
    drag.ghost.className += ' ord-ghost';
    drag.ghost.style.width = r.width + 'px';
    document.body.appendChild(drag.ghost);
    drag.chip.classList.add('dragging');
    document.body.classList.add('ord-dragging');
  }
  e.preventDefault();
  drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
  drag.spot = dropSpot(e.clientX, e.clientY);
  showSpot(drag.spot);
}, { passive: false });
document.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.pid) endDrag(true); });
document.addEventListener('pointercancel', () => endDrag(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drag) endDrag(false); });
// the click that ends a drag must not also place / remove the piece
document.addEventListener('click', e => { if (justDragged && e.target.closest('.order')) { e.stopPropagation(); e.preventDefault(); justDragged = false; } }, true);

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT') return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
  if (e.target.closest('details[data-locked] > summary')) e.preventDefault();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-act="lang"]')) { setLang(el.value); return; }
  if (el.dataset.file === 'backup') { backupLoad(el); return; }
  if (el.dataset.setting) {
    const k = el.dataset.setting;
    S.settings[k] = el.type === 'checkbox' ? el.checked : el.value === '' ? null : el.value;
    saveSettings(S.settings);
    if (k === 'second' && S.settings.second) loadLang(S.settings.second).then(() => { saveDraft(); render(); openSettings(); });
    else { saveDraft(); render(); openSettings(); }
  }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'abs-in') { absKeep(); clearTimeout(absTimer); absTimer = setTimeout(save, 400); return; }
  if (el.classList.contains('blank')) {
    document.querySelectorAll(`[data-mirror="${el.dataset.b}"]`).forEach(m => { m.textContent = el.value || '___'; });
    el.classList.remove('ok', 'bad');
    el.style.width = Math.max(6, el.value.length + 2) + 'ch';
    readFill(); save();
  }
});
let absTimer = null;
document.addEventListener('keydown', e => {
  if (e.target.id === 'abs-in' && e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); actions.absRun(); return; }
  if (e.target.classList && e.target.classList.contains('blank') && e.key === 'Enter') { e.preventDefault(); checkFill(); }
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.dataset.form === 'quiz') { e.preventDefault(); checkQuiz(); return; }
  if (f.dataset.form === 'set') { e.preventDefault(); const code = normCode(new FormData(f).get('code')); if (code) changeSet(code); }
  if (f.dataset.form === 'join') { e.preventDefault(); doJoin(f); }
  if (f.dataset.form === 'rename') { e.preventDefault(); doRename(f); }
  if (f.dataset.form === 'pin') { e.preventDefault(); doSetPin(f); }
});

async function setLang(code) {
  saveDraft();
  await loadLang(code);
  S.settings.lang = code; saveSettings(S.settings);
  render();
}
function changeSet(code) {
  if (code) { S.set = { code, custom: true }; Store.set(KEYS.set, { code }); }
  else { S.set = { code: todayCode(), custom: false }; Store.del(KEYS.set); }
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  S.runs = {}; S.step = null;
  render();
  toast(`${S.set.custom ? T('set.custom') : T('set.today')}: ${S.set.code}`);
}

/* ---------- modals ---------- */
function openSettings() {
  const s = S.settings;
  const radio = (k, v, label) => `<label class="seg-i"><input type="radio" name="${k}" data-setting="${k}" value="${v}" ${String(s[k]) === v ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  modal(`<div class="modal-head"><h2>${I.gear} ${H('set.title')}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <div class="modal-body form">
      <label class="fld"><span>${H('nav.language')}</span><select data-act="lang">${langOptions(L())}</select></label>
      <label class="fld"><span>${H('set.second')}</span><select data-setting="second"><option value="">${esc(T('set.secondNone'))}</option>${LANGS.filter(l => l.code !== L()).map(l => `<option value="${l.code}" ${s.second === l.code ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select><small class="muted">${H('set.secondTip')}</small></label>
      <div class="fld"><span>${H('set.theme')}</span><div class="seg">${radio('theme', 'auto', T('set.themeAuto'))}${radio('theme', 'light', T('set.themeLight'))}${radio('theme', 'dark', T('set.themeDark'))}</div></div>
      <div class="fld"><span>${H('set.size')}</span><div class="seg">${radio('size', 's', 'A')}${radio('size', 'm', 'A+')}${radio('size', 'l', 'A++')}</div></div>
      <label class="chk"><input type="checkbox" data-setting="presenter" ${s.presenter ? 'checked' : ''}><span>${H('pres.on')}<small class="muted"> — ${H('pres.onTip')}</small></span></label>
      <hr><div class="fld"><span>${H('bk.title')}</span><small class="muted">${H('bk.sub')}</small>
        <div class="row-btns"><button class="btn btn-ghost btn-sm" data-act="backupSave">⬇ ${H('bk.save')}</button><label class="btn btn-ghost btn-sm">⬆ ${H('bk.load')}<input type="file" accept=".json,application/json" data-file="backup" hidden></label></div></div>
      <hr><button class="linkbtn danger" data-act="resetProgress">${H('prog.reset')}</button>
    </div>`);
}
actions.closeModal = closeModal;
actions.chToggle = el => { if (matchMedia('(max-width: 720px)').matches) el.closest('.chapter').classList.toggle('open'); };
/* ---------- backup: the records of this browser as a file, to move to another device ---------- */
const BK_SKIP = new Set(['sqln.auth', 'sqln.teacher', 'sqln.tcView']);   // sign-ins and the teacher page stay on this device
actions.backupSave = () => {
  save();
  const data = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('sqln.') && !BK_SKIP.has(k)) data[k] = localStorage.getItem(k); }
  const blob = new Blob([JSON.stringify({ app: 'sql-practice', v: 1, at: new Date().toISOString(), data })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sql-practice-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(T('bk.saved'));
};
const backupLoad = el => {
  const f = el.files && el.files[0]; if (!f) return;
  f.text().then(txt => {
    let j; try { j = JSON.parse(txt); } catch (e) { j = null; }
    if (!j || j.app !== 'sql-practice' || !j.data) { alert(T('bk.bad')); return; }
    if (!confirm(T('bk.confirm'))) return;
    const mine = loadProgress(), theirs = (() => { try { return JSON.parse(j.data['sqln.progress'] || '{}'); } catch (e) { return {}; } })();
    Object.entries(j.data).forEach(([k, v]) => { if (k.startsWith('sqln.') && !BK_SKIP.has(k) && k !== 'sqln.progress') localStorage.setItem(k, v); });
    Store.set(KEYS.progress, mergeProgress(theirs, mine));   // nothing solved on this device is lost
    location.reload();
  });
};
actions.resetProgress = () => {
  if (!confirm(T('prog.confirm'))) return;
  Store.del(KEYS.progress);   // a fresh start: nothing to merge with
  S.progress = loadProgress(); Object.keys(S.progress).forEach(k => delete S.progress[k]);
  Object.assign(S.progress, { solved: {}, wrong: {}, drafts: {}, answers: {}, drill: {}, lessons: {}, klass: {}, last: null, streak: { day: 0, n: 0 } });
  S.runs = {}; save(); closeModal(); render();
};
function openGloss(kw) {
  const sec = S.settings.second && S.settings.second !== L() ? S.settings.second : null;
  modal(`<div class="modal-head"><h2><code>${esc(kw)}</code></h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <div class="modal-body"><p class="gloss-main">${rubyHTML(raw('kw.' + kw, L()))}</p>${sec ? `<p class="bi" lang="${htmlLang(sec)}">${rubyHTML(raw('kw.' + kw, sec))}</p>` : ''}
    <p><a href="#/words" data-act="closeModal">${H('nav.words')} →</a></p></div>`);
}
function openJoin(prefill) {
  if (!backend.enabled) { toast(T('class.unavailable')); return; }
  modal(`<div class="modal-head"><h2>${I.users} ${H('class.joinTitle')}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <form class="modal-body form" data-form="join">
      <label class="fld"><span>${H('class.code')}</span><input name="code" class="mono big-input" maxlength="8" required value="${esc(prefill || '')}" autocomplete="off" autocapitalize="characters" placeholder="ABC234"></label>
      <label class="fld"><span>${H('class.nickname')}</span><input name="nick" maxlength="30" required autocomplete="nickname" value="${esc(Store.get('sqln.nick', ''))}"><small class="muted">${H('class.nickTip')}</small></label>
      <label class="fld"><span>${H('pin.label')}</span>${pinInputHTML()}<small class="muted">${H('pin.tip')}</small></label>
      <p class="err" id="join-err" role="alert"></p>
      <button class="btn btn-primary">${H('class.join')}</button>
    </form>`);
}
const pinInputHTML = (name = 'pin') => `<input name="${name}" class="mono big-input pin-input" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" minlength="4" autocomplete="off" placeholder="0915">`;
/** join with a nickname and a 4-digit number; a nickname already in the class + the right number = go on as that student */
async function doJoin(f) {
  const fd = new FormData(f);
  const code = normCode(fd.get('code')), nick = String(fd.get('nick') || '').trim(), pin = String(fd.get('pin') || '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).trim();
  const errEl = f.querySelector('#join-err');
  if (!code || !nick) return;
  if (!/^[0-9]{4}$/.test(pin)) { errEl.textContent = T('pin.bad'); return; }
  const btn = f.querySelector('button.btn-primary'); btn.disabled = true; errEl.textContent = '';
  try {
    let c, resumed = false;
    try { const r = await backend.joinClass(code, nick, pin); c = r.klass; S.pinNeeded = !r.pinSet; }
    catch (e) {
      if (e.message !== 'nickname_taken') throw e;
      c = await backend.resumeMember(code, nick, pin); resumed = true; S.pinNeeded = false;   // the same student on another device
    }
    Store.set('sqln.nick', nick);
    S.klass = { id: c.id, code: c.code, name: c.name, nickname: nick, set_code: c.set_code, lessons: c.lessons || [], answer_policy: c.answer_policy, format: c.format || null, live_until: c.live_until || null, quick: c.quick || null, tasks: c.tasks || null };
    Store.set(KEYS.klass, S.klass);
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
    closeModal(); await restoreFromServer(); watchKlass(); render(); toast(resumed ? T('pin.resumed', { n: c.name }) : T('class.joined', { n: c.name }));
  } catch (e) {
    console.warn(e);
    const m = e.message;
    errEl.textContent = m === 'pin_wrong' ? T('pin.wrong', { n: e.left }) : m === 'pin_locked' ? T('pin.locked', { n: e.minutes || 10 }) : m === 'no_pin' ? T('pin.noPin') : m === 'pin_missing' ? T('pin.taken')
      : T(m === 'class_not_found' ? 'class.notFound' : m === 'class_closed' ? 'class.closed' : m === 'anon_disabled' ? 'class.anonOff' : m === 'bad_pin' ? 'pin.bad' : m === 'not_found' ? 'class.notFound' : 'class.netError');
    btn.disabled = false;
  }
}
/** set or change the 4-digit number */
function openPin() {
  if (!S.klass) return;
  modal(`<div class="modal-head"><h2>🔢 ${H('pin.setTitle')}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <form class="modal-body form" data-form="pin"><p class="muted">${H('pin.setSub')}</p>
      <label class="fld"><span>${H('pin.label')}</span>${pinInputHTML()}<small class="muted">${H('pin.tip')}</small></label>
      <p class="err" id="pin-err" role="alert"></p><button class="btn btn-primary">${H('pin.save')}</button></form>`);
}
async function doSetPin(f) {
  const pin = String(new FormData(f).get('pin') || '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).trim();
  const err = f.querySelector('#pin-err');
  if (!/^[0-9]{4}$/.test(pin)) { err.textContent = T('pin.bad'); return; }
  try { await backend.setMyPin(S.klass.id, pin); S.pinNeeded = false; closeModal(); render(); toast(T('pin.saved')); }
  catch (e) { err.textContent = T(e.message === 'pin_missing' ? 'pin.notReady' : 'class.netError'); }
}
/** bring back this student's record from the class's server log (solved problems and the answers that were right) */
async function restoreFromServer() {
  if (!S.klass || !backend.enabled) return;
  let rows;
  try { rows = await backend.myAttempts(S.klass.id); } catch (e) { return; }
  let changed = false;
  const q = S.klass.quick, qpre = q && q.id ? `quick:${q.id}:` : null;
  rows.filter(a => a.ok && qpre && a.problem_id.startsWith(qpre)).forEach(a => { if (qMark(+a.problem_id.slice(qpre.length))) changed = true; });
  const tk = taskOf(), tpre = tk ? `task:${tk.id}:` : null;   // the shape-mix assignment solved on another device
  rows.filter(a => a.ok && tpre && a.problem_id.startsWith(tpre)).forEach(a => { const n = +a.problem_id.slice(tpre.length), had = taskSolved(tk); taskMark(tk.id, n); if (taskSolved(tk) !== had) changed = true; });
  const mine = new Set(assignedSeq().map(p => p.id));   // this class's problems now: solved in this class counts for the assignment
  if (!lvState()) {   // the level from another device (the latest row the student's pages wrote)
    const x = [...levelsFromLog(rows).values()][0];
    if (x) { const at = new Date(x.at).getTime(); S.progress.level = { lv: x.lv, prof: LV_CHAPTERS.map((c, i) => (x.prof[i] === undefined ? null : x.prof[i])), fmt: 0, streak: 0, ptr: 0, at, upd: at, rounds: 0 }; Store.set('sqln.levelSent', `${S.klass.id}|${levelTag(S.progress.level)}|${at}`); changed = true; }
  }
  rows.filter(a => a.ok && !isLevelRow(a)).forEach(a => {
    if (mine.has(a.problem_id) && markRound(a.problem_id, new Date(a.created_at).getTime())) changed = true;
    if (!S.progress.solved[a.problem_id]) { S.progress.solved[a.problem_id] = new Date(a.created_at).getTime(); changed = true; }
    if (!S.progress.answers[a.problem_id] && a.sql) { S.progress.answers[a.problem_id] = { sql: a.sql, at: new Date(a.created_at).getTime() }; changed = true; }
  });
  if (!changed) return;
  LESSONS.forEach(l => { if (ownStateOf(l).done) markLessonDone(S.progress, l.key); });
  save();
}
function openClassInfo() {
  const k = S.klass;
  modal(`<div class="modal-head"><h2>${I.users} ${esc(k.name)}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <div class="modal-body form">
      <p class="muted">${H('class.code')}: <b class="mono">${esc(k.code)}</b> · ${H('set.code')}: <b class="mono">${esc(k.set_code || '')}</b></p>
      <button class="btn btn-ghost btn-sm" data-act="setPin">🔢 ${H(S.pinNeeded ? 'pin.setNow' : 'pin.change')}</button>
      <form data-form="rename" class="inline-form"><input name="nick" maxlength="30" value="${esc(k.nickname)}" aria-label="${esc(T('class.nickname'))}"><button class="btn btn-ghost btn-sm">${H('class.rename')}</button></form>
      <p class="muted small">${H('class.privacy')}</p>
      <hr><button class="btn btn-ghost" data-act="leave">${I.door}${H('class.leave')}</button>
    </div>`);
}
async function doRename(f) {
  const nick = String(new FormData(f).get('nick') || '').trim();
  if (!nick) return;
  try { await backend.renameMe(S.klass.id, nick); S.klass.nickname = nick; Store.set(KEYS.klass, S.klass); Store.set('sqln.nick', nick); closeModal(); render(); toast(T('class.renamed')); }
  catch (e) { toast(T(/nickname_taken/.test(e.message) ? 'pin.nameTaken' : 'class.netError')); }
}
actions.leave = async () => {
  if (!confirm(T('class.leaveConfirm'))) return;
  try { await backend.leaveClass(S.klass.id); } catch (e) { /* ignore */ }
  if (unwatch) unwatch();
  S.klass = null; Store.del(KEYS.klass); closeModal(); render();
};
let unwatch = null;
async function watchKlass() {
  levelSend();   // the class's teacher sees the level (a row in the class log)
  if (!S.klass || !backend.enabled) return;
  try {
    const c = await backend.getClass(S.klass.id);
    if (!c) { S.klass = null; Store.del(KEYS.klass); render(); toast(T('class.removed')); return; }
    applyClassRow(c, false);
    restoreFromServer().then(() => { if (S.route.view !== 'lesson' || !S.editor) render(); });
    backend.myPinSet(S.klass.id).then(v => { const need = v === false; if (need !== S.pinNeeded) { S.pinNeeded = need; if (S.route.view !== 'lesson') render(); } }).catch(() => {});
    if (unwatch) unwatch();
    unwatch = await backend.watchClass(S.klass.id, row => applyClassRow(row, true), () => pulseClass());
    syncClock(backend.serverNow).then(tickTimer);
    backend.flushAttempts();
  } catch (e) { /* offline: keep cached class */ }
}
// A change of the class reaches the student in three ways: the database's change event, the teacher's page
// saying "changed" (both over the live connection), and asking again here, in case the connection is down.
let pulsing = false;
async function pulseClass() {
  if (!S.klass || !backend.enabled || pulsing || document.hidden || !navigator.onLine) return;
  pulsing = true;
  try { const c = await backend.classPulse(S.klass.id); if (c && S.klass) applyClassRow(c, true); } catch (e) { /* offline */ }
  pulsing = false;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pulseClass(); });
setInterval(pulseClass, 5000);   // every 5 seconds while the page is in front: a start is never missed for long
function applyClassRow(c, live) {
  const taskId = k => (k && k.tasks && k.tasks.mix ? k.tasks.mix.id : null), hasTasks = Object.prototype.hasOwnProperty.call(c, 'tasks');
  const changed = c.set_code !== S.klass.set_code || JSON.stringify(c.lessons) !== JSON.stringify(S.klass.lessons) || c.answer_policy !== S.klass.answer_policy || formatKey(c.format) !== formatKey(S.klass.format) || (hasTasks && taskId(c) !== taskId(S.klass));
  if (hasTasks) S.klass.tasks = c.tasks || null;   // the teacher's assignment of the shape mix (an older database has no such column)
  Object.assign(S.klass, { name: c.name, set_code: c.set_code, lessons: c.lessons || [], answer_policy: c.answer_policy, timer_end: c.timer_end || null, format: c.format || null, live_until: c.live_until || null, quick: c.quick || null });
  quickChanged(live);
  tickTimer();
  const isLive = liveOn(S.klass);
  if (liveShown === null ? isLive : isLive !== liveShown) liveChanged(isLive, live);   // the first time: open the assignment if the class is live now
  liveShown = isLive;
  Store.set(KEYS.klass, S.klass);
  if (changed) { saveDraft(); S.runs = {}; render(); if (live) toast(T('class.updated')); }
}

/** the class live started or ended: open the assignment, or say it has ended */
let liveShown = null;
function liveChanged(isLive, announce) {
  liveShown = isLive;
  if (isLive && (S.klass.lessons || []).length) {
    if (S.route.view !== 'live') { saveDraft(); location.hash = '#/live'; toast(T('live.started')); }
    else { render(); if (announce) toast(T('live.started')); }
  } else if (!isLive) { render(); if (announce) toast(T('live.ended')); }
}
// the end time passes without a message from the server: notice it here
setInterval(() => {
  if (!S.klass) return;
  const on = liveOn(S.klass);
  if (liveShown !== null && on !== liveShown) { liveShown = on; liveChanged(on, true); }
  const el = document.querySelector('[data-live-left]');
  if (el && on) el.innerHTML = H('live.minLeft', { n: liveMinutesLeft(S.klass) });
}, 15000);

/* ---------- class timer: the teacher's countdown, shown on every screen ---------- */
let upSince = 0;
function tickTimer() {
  let el = document.getElementById('ctimer');
  const left = S.klass ? secondsLeft(S.klass) : null;
  const st = timerState(left);
  if (!st) { if (el) el.remove(); upSince = 0; return; }
  if (!el) { el = document.createElement('div'); el.id = 'ctimer'; el.setAttribute('role', 'timer'); el.setAttribute('aria-live', 'off'); document.body.appendChild(el); }
  if (st === 'up' && !upSince) upSince = Date.now();
  if (st !== 'up') upSince = 0;
  const flash = st === 'up' && Date.now() - upSince < 8000;   // flashes for 8 seconds, then stays red
  el.className = `ctimer ${st}${flash ? ' flash' : ''}`;
  const html = st === 'up' ? `<b>${H('timer.up')}</b>` : `<span class="ct-ic">⏱</span><b class="mono">${fmtClock(left)}</b>`;
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; el.title = T('timer.title'); }
}
setInterval(tickTimer, 250);

/* ---------- another tab of this app saved the record: take its changes (nothing is lost) ---------- */
window.addEventListener('storage', e => {
  if (e.key !== KEYS.progress || !e.newValue) return;
  S.progress = mergeProgress(loadProgress(), S.progress);
  if (!document.activeElement || !document.activeElement.closest('.cm-editor')) render();
});

/* ---------- start ---------- */
(async function start() {
  installTables(); setTablesLang(L);
  installPy({ S, L, save, render,
    // a Python problem of a quick test: recorded like the SQL ones (false = it did not count: the time is over)
    quickAnswer: (prob, ok, code, reason) => { if (qPhaseNow() !== 'run') { render(); return false; } record(prob, ok, { grade: { reason } }, code); return true; },
    quickRef: prob => qRefHTML(prob),
    quickNext: prob => { const n = qNext(prob); return n ? `<a class="btn btn-ok fb-next" href="#/quick/${n.qn}">${H('btn.next')}${I.next}</a>` : `<a class="btn btn-ok fb-next" href="#/quick/done">${H('qk.finish')}${I.next}</a>`; } });
  installCheckUI({ mode: 'student', lang: L, engine: () => S.engine, assigned: () => (S.klass ? (S.klass.lessons || []).filter(k => LESSON_BY_KEY[k] && LESSON_BY_KEY[k].kind !== 'quiz') : []),
    onStart(cfg) { const code = encodeCheck(cfg); startCheck(code, cfg); if (location.hash === '#/check/' + code) render(); else location.hash = '#/check/' + code; } });
  S.route = parseRoute();
  await Promise.all([loadLang('en'), loadLang(L()), S.settings.second ? loadLang(S.settings.second) : null]);
  render();
  try {
    const SQL = await window.initSqlJs({ locateFile: f => 'vendor/' + f });
    S.engine = new SqlEngine(SQL);
  } catch (e) {
    console.error(e);
    app.innerHTML = headerHTML() + `<div class="loading"><div>${H('misc.loadError')}</div></div>`;
    return;
  }
  render();
  setTimeout(() => loadEditor().catch(() => {}), 1500);   // ready before the first lesson is opened
  const q = new URLSearchParams(location.search).get('class');
  if (q && backend.enabled && (!S.klass || S.klass.code !== normCode(q))) openJoin(normCode(q));
  watchKlass();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
