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
import { LESSONS, CHAPTERS } from './lessons.js';
import { ALL_TABLES } from './datasets.js';
import { diagnose, findFix } from './diagnose.js';
import { Store, KEYS, loadSettings, saveSettings, loadProgress, saveProgress, mergeProgress, lessonState, markLessonDone, reviewResult, dueLessons, bumpStreak, today } from './store.js';
import * as backend from './backend.js';
import { I, applySettings, langSelect, langOptions, highlightSQL, highlightDiff, gridHTML, problemHTML, lessonTitle, lessonTitleHTML, themeName, themeHTML, syntaxHint, withGloss, toast, copyText, modal, closeModal, GLOSS_KEYS } from './ui.js';
import { orderStripHTML, joinHTML, drawJoinLines, STEP_TO_KIND } from './viz.js';
import { createEditor } from './editor.js';
import { textbookPage } from './book.js';
import { syncClock, secondsLeft, fmtClock, timerState, liveOn, liveMinutesLeft } from './timer.js';
import { isAnalysis, statCardHTML, resultChartHTML, downloadCSV, toolsHTML } from './analysis-ui.js';
import { hasLecture, LECTURES } from './lectures.js';
import { lectureSteps, lectureStepHTML, paintStep } from './lecture-ui.js';
import { altAnswers } from './alt.js';
import { decodeCheck, encodeCheck, buildCheck, checkCounts } from './check.js';
import { checkSetupHTML, installCheckUI } from './check-ui.js';
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
const isSolved = id => !!S.progress.solved[id];
/** the class's own problem format applies to the lessons the class assigned */
const formatOf = lesson => (S.klass && S.klass.format && (S.klass.lessons || []).includes(lesson.key) ? S.klass.format : null);
const problemsOf = lesson => S.engine.lessonProblems(lesson, setCode(), formatOf(lesson));
const stateOf = lesson => lessonState(S.progress, problemsOf(lesson));
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
const isQuiz = prob => LESSON_BY_KEY[prob.lesson].kind === 'quiz';

/* ---------- routing ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'l' && LESSON_BY_KEY[h[1]]) return { view: 'lesson', key: h[1], idx: Math.min(29, Math.max(0, parseInt(h[2], 10) || 0)) };   // current() keeps it inside the lesson's problems
  if (h[0] === 'review' || h[0] === 'mix') return { view: 'session', kind: h[0] };
  if (h[0] === 'drill') return { view: 'session', kind: 'drill', key: LESSON_BY_KEY[h[1]] ? h[1] : null };
  if (h[0] === 'words') return { view: 'words' };
  if (h[0] === 'solved') return { view: 'solved' };
  if (h[0] === 'tables') return { view: 'tables' };
  if (h[0] === 'check') return { view: 'session', kind: 'check', code: h.slice(1).join('/') || null };
  if (h[0] === 'lecture' && hasLecture(h[1])) return { view: 'lecture', key: h[1] };
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
  const head = headerHTML();
  if (!S.engine) { app.innerHTML = head + `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`; return; }
  const r = S.route;
  let body;
  if (r.view === 'lesson') body = lessonHTML();
  else if (r.view === 'session') body = sessionHTML();
  else if (r.view === 'words') body = wordsHTML();
  else if (r.view === 'live') body = liveViewHTML();
  else if (r.view === 'solved') body = solvedHTML();
  else if (r.view === 'lecture') body = lectureHTML();
  else if (r.view === 'tables') { body = tablesPageHTML(L()); document.title = `${T('tb.title')} · SQL Practice`; }
  else body = homeHTML();
  app.innerHTML = head + liveBannerHTML() + body + footerHTML();
  mountWorkspace();
  drawJoinLines(app);
}

function headerHTML() {
  const due = S.engine ? dueLessons(S.progress).length : 0;
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
function homeHTML() {
  const allDone = LESSONS.filter(l => S.progress.lessons[l.key] && S.progress.lessons[l.key].done).length;
  const solved = Object.keys(S.progress.solved).length;
  const due = dueLessons(S.progress);
  const last = S.progress.last;
  const contHash = last && LESSON_BY_KEY[last.key] ? `#/l/${last.key}/${last.idx || 0}` : `#/l/${LESSONS[0].key}/0`;
  const streak = S.progress.streak && S.progress.streak.day >= today() - 86400000 ? S.progress.streak.n : 0;

  const assign = S.klass && S.klass.lessons && S.klass.lessons.length ? `<section class="card assign">
      <div class="assign-head">${I.users}<div><small>${H('class.today')}</small><h2>${esc(S.klass.name)}</h2></div><span class="tag">${H('class.you', { n: S.klass.nickname })}</span></div>
      <div class="assign-list">${S.klass.lessons.filter(k => LESSON_BY_KEY[k]).map(k => {
        const l = LESSON_BY_KEY[k], st = stateOf(l);
        return `<a class="assign-item ${st.done ? 'done' : ''}" href="#/l/${k}/0"><span class="lesson-num">${st.done ? '✓' : l.no}</span><span>${lessonTitleHTML(l, L())}</span><span class="muted">${st.count}/${st.solved.length}</span></a>`;
      }).join('')}</div></section>` : '';

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
          ${due.length ? `<a class="btn btn-glass" href="#/review">${I.repeat}${H('home.reviewDue', { n: due.length })}</a>` : ''}
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
    ${assign}
    <section class="chapters">
      ${CHAPTERS.map((ch, ci) => {
        const ls = LESSONS.filter(l => l.ch === ch.key);
        return `<article class="card chapter" style="--cc:var(--c-${ch.key})">
          <div class="chapter-head"><div class="chapter-icon">${esc(ch.icon)}</div><div>
            <small>${H('home.chapter', { n: ci + 1 })}</small>
            <h2>${rubyHTML(raw('ch.' + ch.key, L()))}</h2><p>${rubyHTML(raw('ch.' + ch.key + '.desc', L()))}</p></div></div>
          <ul class="lesson-list">${ls.map(l => {
            const st = stateOf(l);
            return `<li><a class="lesson-link ${st.done ? 'done' : ''}" href="#/l/${l.key}/0">
              <span class="lesson-num">${st.done ? '✓' : l.no}</span>
              <span class="lesson-name">${lessonTitleHTML(l, L())}</span>
              <span class="dots" aria-label="${st.count}/${st.solved.length}">${problemsOf(l).map((p, i) => `<i class="${p.stage === 'demo' ? 'demo ' : ''}${st.solved[i] ? 'on' : ''}"></i>`).join('')}</span>
            </a></li>`;
          }).join('')}</ul></article>`;
      }).join('')}
    </section>
    <section class="card mixcard">
      <div>${I.shuffle}<div><b>${H('mix.title')}</b><p class="muted">${H('mix.sub')}</p></div></div>
      <a class="btn btn-ghost" href="#/mix">${H('mix.start')}</a>
    </section>
    ${S.pinNeeded ? `<section class="card mixcard pincard"><div><span class="drill-ic">🔢</span><div><b>${H('pin.setTitle')}</b><p class="muted">${H('pin.setSub')}</p></div></div><button class="btn btn-ok" data-act="setPin">${H('pin.setNow')}</button></section>` : ''}
    <section class="card mixcard drillcard solvedcard"><div><span class="drill-ic">✓</span><div><b>${H('mine.title')}</b><p class="muted">${H('mine.sub')}</p></div></div><a class="btn btn-ghost" href="#/solved">${H('mine.open')}</a></section>
    <section class="card mixcard drillcard">
      <div><span class="drill-ic">📝</span><div><b>${H('ck.title')}</b><p class="muted">${H('ck.homeSub')}</p></div></div>
      <a class="btn btn-ghost" href="#/check">${H('ck.open2')}</a>
    </section>
    <section class="card mixcard drillcard">
      <div><span class="drill-ic">⇅</span><div><b>${H('drill.title')}</b><p class="muted">${H('drill.sub')}</p></div></div>
      <a class="btn btn-ghost" href="#/drill">${H('drill.start')}</a>
    </section>
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
    <nav class="card plist" aria-label="${esc(T('lesson.problems'))}">
      <div class="plist-title"><span>${H('lesson.problems')}</span><span>${st.count}/${probs.length}</span></div>
      ${probs.map(p => `<a class="pitem st-${p.stage} ${p.idx === prob.idx ? 'on' : ''} ${isSolved(p.id) ? 'solved' : ''}" href="#/l/${lesson.key}/${p.idx}" ${p.idx === prob.idx ? 'aria-current="page"' : ''}>
        <span class="ck"></span><span class="pt"><b>${stageLabelH(p)}</b><span>${esc(p.stage === 'demo' ? T('stage.demoSub') : themeName(p, L()))}</span></span></a>`).join('')}
      ${st.done ? `<div class="done-banner">✓ ${H('lesson.done')}</div>` : `<div class="rule">${H(probs.some(p => p.fmt) ? 'lesson.ruleAll' : lesson.kind === 'quiz' ? 'lesson.ruleQuiz' : stagesOf(lesson).includes('order') ? 'lesson.rule' : 'lesson.ruleNoOrder')}</div>`}
    </nav>
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
  if (kind === 'review') keys = dueLessons(S.progress);
  else {
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
  if (!S.session || S.session.kind !== kind || (kind === 'drill' && S.session.key !== S.route.key)) startSession(kind);
  const ses = S.session;
  document.title = `${T(kind === 'review' ? 'nav.review' : kind === 'drill' ? 'drill.title' : 'mix.title')} · SQL Practice`;
  if (kind === 'drill') return drillHTML(ses);
  if (!ses.items.length) {
    return `<main class="wrap narrow"><section class="card empty">
      <div class="empty-icon">${I.check}</div><h1>${H('review.none')}</h1><p class="muted">${H('review.noneSub')}</p>
      <div class="row-btns"><a class="btn btn-primary" href="#/mix">${I.shuffle}${H('mix.start')}</a><a class="btn btn-ghost" href="#/">${H('nav.home')}</a></div></section></main>`;
  }
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
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
  </main>`;
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
function lectureHTML() {
  const lesson = LESSON_BY_KEY[S.route.key];
  if (lec.key !== lesson.key) { lec.key = lesson.key; lec.i = 0; stopAuto(); }
  const steps = lectureSteps(lesson.key), st = steps[lec.i];
  document.title = `${T('lec.title')} · ${lessonTitle(lesson, L())} · SQL Practice`;
  const slides = LECTURES[lesson.key].slides;
  return `<main class="wrap lec-wrap">
    <div class="crumbs"><a href="#/l/${lesson.key}/0">Lesson ${lesson.no} · ${lessonTitleHTML(lesson, L())}</a><span>›</span><span>📽 ${H('lec.title')}</span></div>
    ${['ja', 'easy', 'en'].includes(L()) ? '' : `<p class="muted small">${H('lec.langNote')}</p>`}
    <section class="card lec-card">
      <div class="lec-top"><h1>${lessonTitleHTML(lesson, L())}</h1>
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
  const lesson = LESSON_BY_KEY[lec.key], steps = lectureSteps(lec.key);
  to = Math.max(0, Math.min(steps.length - 1, to));
  if (to === lec.i) { stopAuto(); return; }
  const from = steps[lec.i], st = steps[to];
  const same = from.slide === st.slide && LECTURES[lec.key].slides[st.slide].type === 'anim';
  lec.i = to;
  const box = document.getElementById('lec-box');
  if (!box) { render(); return; }
  const f = LECTURES[lec.key].slides[st.slide].frames;
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
  return `<section class="card prob">
      <div class="prob-top">
        <span class="tag st-${prob.stage}">${stageLabelH(prob)}</span>
        ${prob.stage === 'demo' ? `<span class="tag">${H('stage.demoSub')}</span>` : `<span class="tag">${themeHTML(prob, L())}</span>`}
        ${isSolved(prob.id) ? `<span class="tag ok">✓ ${H('fb.correct')}</span>` : ''}
      </div>
      <p class="inst">${rubyHTML(raw('inst.' + (isQuiz(prob) ? 'quiz' : prob.stage === 'review' ? 'write' : prob.stage === 'order' && S.engine.orderTask(prob) && !S.engine.orderTask(prob).chunks.some(c => c.distractor) ? 'orderNoTrap' : prob.stage), L()))}</p>
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
  const body = !a ? `<p class="muted small">${H('mine.noAnswer')}</p>` : isQuiz(prob) ? `<p class="quiz-ans">${esc(a.sql)}</p>` : `<pre class="sql">${highlightSQL(a.sql)}</pre>`;
  return `<section class="card solved-box"><div class="sb-head"><b>✓ ${H('mine.yourAnswer')}</b>${a ? `<span class="muted small">${esc(fmtWhen(a.at))}</span>` : ''}<button class="btn btn-ghost btn-sm" data-act="redo">${I.reset}${H('mine.redo')}</button></div>${body}${altsHTML(prob, true, a && a.sql)}</section>`;
}
const fmtWhen = t => { try { return new Date(t).toLocaleString(htmlLang(L()) === 'my' ? 'en' : htmlLang(L()), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

/* ---------- looking back: every solved problem with the answer that was right ---------- */
function solvedHTML() {
  document.title = `${T('mine.title')} · SQL Practice`;
  const assigned = S.klass ? (S.klass.lessons || []).filter(k => LESSON_BY_KEY[k]) : [];
  const keys = [...assigned, ...LESSONS.map(l => l.key).filter(k => !assigned.includes(k))];
  const blocks = keys.map(k => {
    const l = LESSON_BY_KEY[k], probs = problemsOf(l).filter(p => isSolved(p.id));
    if (!probs.length) return '';
    const link = p => (assigned.includes(k) ? liveHash(p) : `#/l/${k}/${p.idx}`);
    return `<section class="card mine-lesson"><h2><span class="lesson-num">${l.no}</span>${lessonTitleHTML(l, L())}${assigned.includes(k) ? `<span class="tag">${H('nav.assign')}</span>` : ''}</h2>
      ${probs.map(p => { const a = S.progress.answers[p.id]; return `<div class="mine-item"><a class="mine-what" href="${link(p)}"><b>${stageLabelH(p)}</b><span class="muted small">${esc(p.stage === 'demo' ? T('stage.demoSub') : themeName(p, L()))}</span>${I.next}</a>
        ${a ? (isQuiz(p) ? `<p class="quiz-ans">${esc(a.sql)}</p>` : `<pre class="sql">${highlightSQL(a.sql)}</pre>`) : `<p class="muted small">${H('mine.noAnswer')}</p>`}${altsHTML(p, true, a && a.sql)}</div>`; }).join('')}</section>`;
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
  const vis = answerVisible(prob);
  const wrong = S.progress.wrong[prob.id] || 0;
  return `<section class="card editor-card quiz">
      <form class="quiz-form" data-form="quiz">
        <label class="quiz-label" for="quiz-in">${H('quiz.label')}</label>
        <div class="quiz-row"><input id="quiz-in" class="quiz-in ${run ? (run.grade && run.grade.ok ? 'ok' : 'bad') : ''}" value="${esc(val)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="btn btn-primary btn-run">${I.check}${H('fill.check')}</button></div>
      </form>
      <details class="hint ${vis ? '' : 'locked'}" ${vis ? '' : 'data-locked="1"'}><summary><span class="hi">${vis ? '✓' : I.lock}</span>${H('hint.answer')}${vis ? '' : `<span class="muted small lockmsg">${esc(T('hint.locked', { n: Math.max(0, 2 - wrong) }))}</span>`}</summary>
        ${vis ? `<div class="hint-body"><p class="quiz-ans">${esc(String(prob.answer))}</p>${/^SELECT\b/i.test(prob.sql) && !/^SELECT\s+'/i.test(prob.sql) ? `<p class="muted small">${H('quiz.bySql')}</p><pre class="sql">${highlightSQL(prob.sql)}</pre>` : ''}</div>` : ''}</details>
    </section>`;
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
function writeHTML(prob) {
  const kws = LESSON_BY_KEY[prob.lesson].keywords || [];
  return `${hintsHTML(prob)}
    <section class="card editor-card">
      <div class="kwbar"><span>${H('ed.insert')}</span>${kws.map(k => `<button class="kw-chip" data-act="insertKw" data-text="${esc(k)}">${esc(k)}</button>`).join('')}</div>
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
      <div class="ord-pool">${pool.map(c => `<button class="ord-chip" data-act="place" data-id="${c.id}"><code>${highlightSQL(c.text)}</code></button>`).join('') || `<span class="muted small">${H('order.allUsed')}</span>`}</div>
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
    if (S.route.view === 'session') next = `<button class="btn btn-ok fb-next" data-act="sessionNext">${H('btn.next')}${I.next}</button>`;
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
  const tested = prob.test && S.session && S.session.done[prob.id] !== undefined;   // a check test: the first answer counted; go on
  const skip = S.route.view === 'session' ? `<button class="btn ${tested ? 'btn-primary' : 'btn-ghost btn-sm'} fb-next" data-act="sessionNext">${tested ? H('btn.next') + I.next : H('review.skip')}</button>` : '';
  return `<div class="fb bad" role="alert"><div class="fb-icon">?</div><div class="fb-body"><h3>${esc(title)}</h3><ul class="dx">${items}</ul>${raw}${run.error && !run.quiet && (run.dx || []).length ? `<details class="errraw"><summary>${H('fb.rawError')}</summary><pre class="errmsg">${esc(run.error.message)}</pre></details>` : ''}</div>${skip}</div>`;
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
  if (lesson.chart) body += resultChartHTML(lesson, prob, S.tab === 'expected' ? exp : (run && !run.error ? user : null));
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
  const prob = c.prob;
  const schema = {};
  prob.tables.forEach(n => { schema[n] = ALL_TABLES[n].columns.map(x => x[0]); });
  let timer;
  S.editor = createEditor(el, {
    doc: S.progress.drafts[prob.id] !== undefined ? S.progress.drafts[prob.id] : `SELECT * FROM ${prob.tables[0]};`,
    schema,
    placeholder: T('ed.placeholder'),
    label: T('ed.yourSql'),
    onRun: runWrite,
    onChange: v => { clearTimeout(timer); timer = setTimeout(() => { S.progress.drafts[prob.id] = v; save(); }, 400); }
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
  if (!empty && prob.test) {   // a check test: only the test keeps score; the lessons' progress is not touched
    if (ok) bumpStreak(S.progress);
    const ses = S.session;
    if (ses && ses.kind === 'check' && ses.done[prob.id] === undefined) { ses.done[prob.id] = ok; ses.ans[prob.id] = String(sql).slice(0, 2000); }
  } else if (!empty) {
    if (ok) {
      if (!isSolved(prob.id)) {
        const lesson = LESSON_BY_KEY[prob.lesson];
        const extra = prob.kind === 'review' || prob.kind === 'drill';   // not one of the lesson's own problems
        const before = !extra && stateOf(lesson).done;
        S.progress.solved[prob.id] = Date.now();
        S.progress.answers[prob.id] = { sql: String(sql).slice(0, 2000), at: Date.now() };   // the answer that was right, for looking back
        if (!extra && !before && stateOf(lesson).done) { markLessonDone(S.progress, lesson.key); run.lessonDone = true; }
      }
      bumpStreak(S.progress);
    } else S.progress.wrong[prob.id] = (S.progress.wrong[prob.id] || 0) + 1;
    if (S.route.view === 'session' && S.session && S.session.done[prob.id] === undefined) {
      S.session.done[prob.id] = ok;
      if (S.session.kind === 'review') reviewResult(S.progress, prob.lesson, ok);
      if (S.session.kind === 'drill') {
        S.session.streak = ok ? S.session.streak + 1 : 0;
        S.session.best = Math.max(S.session.best, S.session.streak);
        if (ok) { S.progress.drill = S.progress.drill || {}; S.progress.drill[prob.lesson] = (S.progress.drill[prob.lesson] || 0) + 1; }
      }
    }
    if (S.klass && backend.enabled) {
      backend.logAttempt({ class_id: S.klass.id, problem_id: prob.id.slice(0, 80), lesson: prob.lesson, stage: prob.kind === 'review' ? 'review' : prob.stage, ok, reason: ok ? null : (run.grade ? run.grade.reason : 'error'), sql: String(sql).slice(0, 2000) });
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
  checkFill, checkOrder, checkQuiz,
  resetFill() { const c = current(); delete S.progress.drafts['f:' + c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  place(el) { const c = current(); const k = 'o:' + c.prob.id; S.progress.drafts[k] = (S.progress.drafts[k] || []).concat(el.dataset.id); delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']); },
  unplace(el) { const c = current(); const k = 'o:' + c.prob.id; S.progress.drafts[k] = (S.progress.drafts[k] || []).filter(x => x !== el.dataset.id); delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']); },
  resetOrder() { const c = current(); delete S.progress.drafts['o:' + c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  sessionNext() { saveDraft(); if (S.session.kind === 'drill' && !S.session.done[S.session.items[S.session.i].id]) S.session.streak = 0; S.session.i++; S.tab = 'user'; render(); window.scrollTo(0, 0); },
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
  if (el.classList.contains('blank')) {
    document.querySelectorAll(`[data-mirror="${el.dataset.b}"]`).forEach(m => { m.textContent = el.value || '___'; });
    el.classList.remove('ok', 'bad');
    el.style.width = Math.max(6, el.value.length + 2) + 'ch';
    readFill(); save();
  }
});
document.addEventListener('keydown', e => {
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
      <hr><button class="linkbtn danger" data-act="resetProgress">${H('prog.reset')}</button>
    </div>`);
}
actions.closeModal = closeModal;
actions.resetProgress = () => {
  if (!confirm(T('prog.confirm'))) return;
  Store.del(KEYS.progress);   // a fresh start: nothing to merge with
  S.progress = loadProgress(); Object.keys(S.progress).forEach(k => delete S.progress[k]);
  Object.assign(S.progress, { solved: {}, wrong: {}, drafts: {}, answers: {}, drill: {}, lessons: {}, last: null, streak: { day: 0, n: 0 } });
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
    S.klass = { id: c.id, code: c.code, name: c.name, nickname: nick, set_code: c.set_code, lessons: c.lessons || [], answer_policy: c.answer_policy, format: c.format || null, live_until: c.live_until || null };
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
  rows.filter(a => a.ok).forEach(a => {
    if (!S.progress.solved[a.problem_id]) { S.progress.solved[a.problem_id] = new Date(a.created_at).getTime(); changed = true; }
    if (!S.progress.answers[a.problem_id] && a.sql) { S.progress.answers[a.problem_id] = { sql: a.sql, at: new Date(a.created_at).getTime() }; changed = true; }
  });
  if (!changed) return;
  LESSONS.forEach(l => { if (stateOf(l).done) markLessonDone(S.progress, l.key); });
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
  if (!S.klass || !backend.enabled) return;
  try {
    const c = await backend.getClass(S.klass.id);
    if (!c) { S.klass = null; Store.del(KEYS.klass); render(); toast(T('class.removed')); return; }
    applyClassRow(c, false);
    restoreFromServer().then(() => { if (S.route.view !== 'lesson' || !S.editor) render(); });
    backend.myPinSet(S.klass.id).then(v => { const need = v === false; if (need !== S.pinNeeded) { S.pinNeeded = need; if (S.route.view !== 'lesson') render(); } }).catch(() => {});
    if (unwatch) unwatch();
    unwatch = await backend.watchClass(S.klass.id, row => applyClassRow(row, true));
    syncClock(backend.serverNow).then(tickTimer);
    backend.flushAttempts();
  } catch (e) { /* offline: keep cached class */ }
}
function applyClassRow(c, live) {
  const changed = c.set_code !== S.klass.set_code || JSON.stringify(c.lessons) !== JSON.stringify(S.klass.lessons) || c.answer_policy !== S.klass.answer_policy || formatKey(c.format) !== formatKey(S.klass.format);
  Object.assign(S.klass, { name: c.name, set_code: c.set_code, lessons: c.lessons || [], answer_policy: c.answer_policy, timer_end: c.timer_end || null, format: c.format || null, live_until: c.live_until || null });
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
  if (!S.editor || !document.activeElement || !document.activeElement.closest('.cm-editor')) render();
});

/* ---------- start ---------- */
(async function start() {
  installTables(); setTablesLang(L);
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
  const q = new URLSearchParams(location.search).get('class');
  if (q && backend.enabled && (!S.klass || S.klass.code !== normCode(q))) openJoin(normCode(q));
  watchKlass();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
