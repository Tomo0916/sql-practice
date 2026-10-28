/* =========================================================
 * student.js — the student app (index.html)
 *
 * Routes:  #/            home
 *          #/l/<lesson>/<n>   lesson, problem n (0 = example)
 *          #/review       today's spaced review      #/mix   mixed practice
 *          #/words        glossary
 * Progress is stored by language-independent problem IDs, so switching
 * language never touches progress, drafts or results.
 * ========================================================= */
import { LANGS, LANG_CODES, loadLang, hasLang, detectLang, htmlLang, t, th, esc, rubyHTML, raw } from './i18n.js';
import { SqlEngine, LESSON_BY_KEY, STAGES, grade, todayCode, randomCode, normCode, makeRng } from './engine.js';
import { LESSONS, CHAPTERS } from './lessons.js';
import { ALL_TABLES } from './datasets.js';
import { diagnose, findFix } from './diagnose.js';
import { Store, KEYS, loadSettings, saveSettings, loadProgress, saveProgress, lessonState, markLessonDone, reviewResult, dueLessons, bumpStreak, today } from './store.js';
import * as backend from './backend.js';
import { I, applySettings, langSelect, langOptions, highlightSQL, highlightDiff, gridHTML, problemHTML, lessonTitle, lessonTitleHTML, themeName, themeHTML, syntaxHint, withGloss, toast, copyText, modal, closeModal, GLOSS_KEYS } from './ui.js';
import { orderStripHTML, joinHTML, drawJoinLines, STEP_TO_KIND } from './viz.js';
import { createEditor } from './editor.js';

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
  session: null,     // review / mix session { kind, items: [prob], i, done: {id: ok} }
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
const problemsOf = lesson => S.engine.lessonProblems(lesson, setCode());
const stateOf = lesson => lessonState(S.progress, problemsOf(lesson));
function stageLabelH(p) {
  if (p.stage === 'demo') return H('stage.demo');
  if (p.stage === 'fill') return H('stage.fill');
  if (p.stage === 'order') return H('stage.order');
  if (p.kind === 'review') return H('stage.review');
  return H('stage.write', { n: p.idx - 2 });
}
function stageLabel(p) {
  if (p.stage === 'demo') return T('stage.demo');
  if (p.stage === 'fill') return T('stage.fill');
  if (p.stage === 'order') return T('stage.order');
  if (p.kind === 'review') return T('stage.review');
  return T('stage.write', { n: p.idx - 2 });
}

/* ---------- routing ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'l' && LESSON_BY_KEY[h[1]]) return { view: 'lesson', key: h[1], idx: Math.min(STAGES.length - 1, Math.max(0, parseInt(h[2], 10) || 0)) };
  if (h[0] === 'review' || h[0] === 'mix') return { view: 'session', kind: h[0] };
  if (h[0] === 'words') return { view: 'words' };
  return { view: 'home' };
}
window.addEventListener('hashchange', () => {
  saveDraft();
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
  if (r.view === 'session' && S.session && S.session.items.length) {
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
  else body = homeHTML();
  app.innerHTML = head + body + footerHTML();
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
      <a href="#/review" class="${v === 'session' ? 'on' : ''}">${I.repeat}<span>${H('nav.review')}</span>${due ? `<b class="badge">${due}</b>` : ''}</a>
      <a href="#/words" class="${v === 'words' ? 'on' : ''}">${I.globe}<span>${H('nav.words')}</span></a>
    </nav>
    <div class="topbar-right">
      ${S.klass ? `<button class="class-chip" data-act="classInfo" title="${esc(S.klass.name)}">${I.users}<span>${esc(S.klass.name)}</span></button>` : ''}
      ${langSelect(L(), T('nav.language'))}
      <button class="icon-btn" data-act="settings" aria-label="${esc(T('set.title'))}" title="${esc(T('set.title'))}">${I.gear}</button>
    </div>
  </div></header>`;
}
function footerHTML() {
  return `<footer class="foot"><span>${H('foot.saved')}</span><a href="teacher.html">${H('foot.teacher')}</a></footer>`;
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
        return `<a class="assign-item ${st.done ? 'done' : ''}" href="#/l/${k}/0"><span class="lesson-num">${st.done ? '✓' : l.index + 1}</span><span>${lessonTitleHTML(l, L())}</span><span class="muted">${st.count}/6</span></a>`;
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
              <span class="lesson-num">${st.done ? '✓' : l.index + 1}</span>
              <span class="lesson-name">${lessonTitleHTML(l, L())}</span>
              <span class="dots" aria-label="${st.count}/6">${st.solved.map((s, i) => `<i class="${i === 0 ? 'demo ' : ''}${s ? 'on' : ''}"></i>`).join('')}</span>
            </a></li>`;
          }).join('')}</ul></article>`;
      }).join('')}
    </section>
    <section class="card mixcard">
      <div>${I.shuffle}<div><b>${H('mix.title')}</b><p class="muted">${H('mix.sub')}</p></div></div>
      <a class="btn btn-ghost" href="#/mix">${H('mix.start')}</a>
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
      <div class="chap">${H('lesson.of', { a: lesson.index + 1 })} · ${rubyHTML(raw('ch.' + ch.key, L()))}</div>
      <h1>${lessonTitleHTML(lesson, L())}</h1>
      <div class="point"><b>${H('lesson.point')}</b>${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div>
    </div>
    <nav class="card plist" aria-label="${esc(T('lesson.problems'))}">
      <div class="plist-title"><span>${H('lesson.problems')}</span><span>${st.count}/6</span></div>
      ${probs.map(p => `<a class="pitem st-${p.stage} ${p.idx === prob.idx ? 'on' : ''} ${isSolved(p.id) ? 'solved' : ''}" href="#/l/${lesson.key}/${p.idx}" ${p.idx === prob.idx ? 'aria-current="page"' : ''}>
        <span class="ck"></span><span class="pt"><b>${stageLabelH(p)}</b><span>${esc(p.stage === 'demo' ? T('stage.demoSub') : themeName(p, L()))}</span></span></a>`).join('')}
      ${st.done ? `<div class="done-banner">✓ ${H('lesson.done')}</div>` : `<div class="rule">${H('lesson.rule')}</div>`}
    </nav>
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

/* ---------- review / mix session ---------- */
function startSession(kind) {
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
  if (!S.session || S.session.kind !== kind) startSession(kind);
  const ses = S.session;
  document.title = `${T(kind === 'review' ? 'nav.review' : 'mix.title')} · SQL Practice`;
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
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="chap">${H('lesson.of', { a: lesson.index + 1 })}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        <details class="point-d"><summary>${H('lesson.point')}</summary><div class="point">${withGloss(bi(`L.${lesson.key}.point`, null, 'div'))}</div></details></aside>
      <div class="main" id="ws">${workspaceHTML(prob)}</div>
    </div>
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
  return `<section class="card prob">
      <div class="prob-top">
        <span class="tag st-${prob.stage}">${stageLabelH(prob)}</span>
        ${prob.stage === 'demo' ? `<span class="tag">${H('stage.demoSub')}</span>` : `<span class="tag">${themeHTML(prob, L())}</span>`}
        ${isSolved(prob.id) ? `<span class="tag ok">✓ ${H('fb.correct')}</span>` : ''}
      </div>
      <p class="inst">${rubyHTML(raw('inst.' + (prob.stage === 'review' ? 'write' : prob.stage), L()))}</p>
      <p class="prob-text">${problemHTML(prob, L())}</p>
      ${S.settings.second && S.settings.second !== L() ? `<p class="prob-text bi" lang="${htmlLang(S.settings.second)}">${problemHTML(prob, S.settings.second)}</p>` : ''}
      <div class="tables">${prob.tables.map(n => tableBlockHTML(n, prob)).join('')}</div>
    </section>
    ${prob.stage === 'demo' ? `<div id="ws-steps">${stepsHTML(prob)}</div>` : ''}
    <div id="ws-stage">${stageHTML(prob)}</div>
    <div id="ws-fb">${feedbackHTML(prob)}</div>
    <div id="ws-res">${resultsHTML(prob)}</div>`;
}
function tableBlockHTML(name, prob) {
  const tbl = ALL_TABLES[name];
  const open = !S.hideData[name];
  const qualify = prob.tables.length > 1;
  return `<div class="tbl">
    <div class="tbl-head">
      <span class="tbl-name">${I.table}${esc(name)}</span><span class="muted small">${H('prob.rows', { n: tbl.rows.length })}</span>
      <button class="btn btn-ghost btn-xs data-toggle" data-act="toggleData" data-t="${esc(name)}" aria-expanded="${open}">${I.eye}${esc(open ? T('prob.hideData') : T('prob.showData'))}</button>
    </div>
    <div class="cols">${tbl.columns.map(([c, ty]) => `<button class="col-chip" data-act="insert" data-text="${esc(qualify ? name + '.' + c : c)}" title="${esc(T('prob.colsTip'))}">${esc(c)}<small>${ty === 'INTEGER' ? '123' : 'abc'}</small></button>`).join('')}</div>
    ${open ? `<div class="data-box">${gridHTML(S.engine.tableData(name))}</div>` : ''}
  </div>`;
}

/* ---------- example: step-by-step ---------- */
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
    <div class="data-box">${res ? gridHTML(res, { rowNums: true }) : `<div class="res-empty">${esc(err || T('res.noRows'))}</div>`}</div>
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
  if (prob.stage === 'fill') return fillHTML(prob);
  if (prob.stage === 'order') return orderHTML(prob);
  return writeHTML(prob);
}
function hintsHTML(prob) {
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
      <button class="btn btn-ghost btn-sm" data-act="useSql" data-sql="${esc(prob.sql)}">${H('hint.use')}</button></div>` : ''}</details>
  </div>`;
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
  return `<section class="card editor-card order">
      <div class="ord-label">${H('order.answer')}</div>
      <ol class="ord-ans ${run && run.grade && run.grade.ok ? 'ok' : ''}" aria-live="polite">${placed.length ? placed.map((id, i) => `<li><button class="ord-chip placed" data-act="unplace" data-id="${id}" aria-label="${esc(T('order.remove'))}"><span class="ord-n">${i + 1}</span><code>${highlightSQL(byId[id].text)}</code>${I.x}</button></li>`).join('') : `<li class="ord-empty">${H('order.empty')}</li>`}</ol>
      <div class="ord-label">${H('order.pool')}</div>
      <div class="ord-pool">${pool.map(c => `<button class="ord-chip" data-act="place" data-id="${c.id}"><code>${highlightSQL(c.text)}</code></button>`).join('') || `<span class="muted small">${H('order.allUsed')}</span>`}</div>
      <p class="muted small">${H('order.tip')}</p>
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
    else if (!isLast) next = `<a class="btn btn-ok fb-next" href="#/l/${prob.lesson}/${prob.idx + 1}">${H('btn.next')}${I.next}</a>`;
    else { const nl = LESSONS[LESSON_BY_KEY[prob.lesson].index + 1]; if (nl) next = `<a class="btn btn-ok fb-next" href="#/l/${nl.key}/0">${H('btn.nextLesson')}${I.next}</a>`; }
    return `<div class="fb ok" role="status"><div class="fb-icon">${I.check}</div><div class="fb-body"><h3>${H('fb.correct')}</h3><p>${run.lessonDone ? bi('lesson.done') : bi('fb.correctSub')}</p></div>${next}</div>`;
  }
  const title = run.error && (prob.stage === 'write' || prob.stage === 'demo') ? T('fb.error') : T('fb.notYet');
  const raw = run.error && !(run.dx || []).length ? `<pre class="errmsg">${esc(run.error.message)}</pre>` : '';
  const skip = S.route.view === 'session' ? `<button class="btn btn-ghost btn-sm fb-next" data-act="sessionNext">${H('review.skip')}</button>` : '';
  return `<div class="fb bad" role="alert"><div class="fb-icon">?</div><div class="fb-body"><h3>${esc(title)}</h3><ul class="dx">${items}</ul>${raw}${run.error && (run.dx || []).length ? `<details class="errraw"><summary>${H('fb.rawError')}</summary><pre class="errmsg">${esc(run.error.message)}</pre></details>` : ''}</div>${skip}</div>`;
}

/* ---------- results ---------- */
function resultsHTML(prob) {
  const run = S.runs[prob.id];
  const exp = S.engine.exec(prob.sql);
  const user = run && run.res;
  const tab = (k, label, res) => `<button class="res-tab ${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" role="tab" aria-selected="${S.tab === k}">${esc(label)}${res ? `<span class="count">${res.values.length}</span>` : ''}</button>`;
  let body;
  if (S.tab === 'expected') body = gridHTML(exp, { rowNums: true });
  else if (!run || run.error) body = `<div class="res-empty">${H('res.notRun')}</div>`;
  else if (!user.columns.length || !user.values.length) body = `<div class="res-empty">${H('res.noRows')}</div>`;
  else body = gridHTML(user, { rowNums: true });
  return `<section class="card results">
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
  if (parts.includes('res')) put('ws-res', resultsHTML(prob));
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
    const g = grade(res, exp, prob.ordered, sql);
    const fix = g.ok ? null : findFix(sql, s => S.engine.runUser(s), r => grade(r, exp, prob.ordered).ok);
    const d = diagnose({ sql, grade: g, prob, fix });
    run = { res, grade: g, dx: d.items, mark: d.mark, sql };
  } catch (e) {
    const err = { code: e.code || 'sql', message: e.message };
    const d = diagnose({ sql, error: err, prob });
    run = { error: err, dx: d.items, mark: d.mark, sql };
  }
  Object.assign(run, extra || {});
  const ok = !!(run.grade && run.grade.ok);
  const empty = run.error && run.error.code === 'empty';
  if (!empty) {
    if (ok) {
      if (!isSolved(prob.id)) {
        const lesson = LESSON_BY_KEY[prob.lesson];
        const before = prob.kind !== 'review' && stateOf(lesson).done;
        S.progress.solved[prob.id] = Date.now();
        if (prob.kind !== 'review' && !before && stateOf(lesson).done) { markLessonDone(S.progress, lesson.key); run.lessonDone = true; }
      }
      bumpStreak(S.progress);
    } else S.progress.wrong[prob.id] = (S.progress.wrong[prob.id] || 0) + 1;
    if (S.route.view === 'session' && S.session && S.session.done[prob.id] === undefined) {
      S.session.done[prob.id] = ok;
      if (S.session.kind === 'review') reviewResult(S.progress, prob.lesson, ok);
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
  const norm = v => String(v || '').trim().replace(/^'|'$/g, '').replace(/\s+/g, ' ').toLowerCase();
  const blanks = task.answers.map((a, i) => norm(vals[i]) === norm(a));
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
    else if (real.join() !== task.answer.join()) extra.push({ key: 'wrongOrder' });
    run.dx = extra.concat(run.dx || []).slice(0, 3);
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
  toggleData(el) { const n = el.dataset.t; S.hideData[n] = !S.hideData[n]; saveDraft(); render(); },
  stepStart() { S.step = 0; refresh(['steps']); },
  stepNext() { S.step++; refresh(['steps']); },
  stepPrev() { S.step = Math.max(0, S.step - 1); refresh(['steps']); },
  stepClose() { S.step = null; refresh(['steps']); },
  checkFill, checkOrder,
  resetFill() { const c = current(); delete S.progress.drafts['f:' + c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  place(el) { const c = current(); const k = 'o:' + c.prob.id; S.progress.drafts[k] = (S.progress.drafts[k] || []).concat(el.dataset.id); delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']); },
  unplace(el) { const c = current(); const k = 'o:' + c.prob.id; S.progress.drafts[k] = (S.progress.drafts[k] || []).filter(x => x !== el.dataset.id); delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb']); },
  resetOrder() { const c = current(); delete S.progress.drafts['o:' + c.prob.id]; delete S.runs[c.prob.id]; save(); refresh(['stage', 'fb', 'res']); },
  sessionNext() { saveDraft(); S.session.i++; S.tab = 'user'; render(); window.scrollTo(0, 0); },
  mixAgain() { S.session = null; if (location.hash === '#/mix') render(); else location.hash = '#/mix'; },
  newSet() { changeSet(randomCode()); },
  todaySet() { changeSet(null); },
  gloss(el) { openGloss(el.dataset.kw); }
};
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
  if (f.dataset.form === 'set') { e.preventDefault(); const code = normCode(new FormData(f).get('code')); if (code) changeSet(code); }
  if (f.dataset.form === 'join') { e.preventDefault(); doJoin(f); }
  if (f.dataset.form === 'rename') { e.preventDefault(); doRename(f); }
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
  S.progress = loadProgress(); Object.keys(S.progress).forEach(k => delete S.progress[k]);
  Object.assign(S.progress, { solved: {}, wrong: {}, drafts: {}, lessons: {}, last: null, streak: { day: 0, n: 0 } });
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
      <p class="err" id="join-err" role="alert"></p>
      <button class="btn btn-primary">${H('class.join')}</button>
    </form>`);
}
async function doJoin(f) {
  const fd = new FormData(f);
  const code = normCode(fd.get('code')), nick = String(fd.get('nick') || '').trim();
  const errEl = f.querySelector('#join-err');
  if (!code || !nick) return;
  const btn = f.querySelector('button.btn-primary'); btn.disabled = true; errEl.textContent = '';
  try {
    const c = await backend.joinClass(code, nick);
    Store.set('sqln.nick', nick);
    S.klass = { id: c.id, code: c.code, name: c.name, nickname: nick, set_code: c.set_code, lessons: c.lessons || [], answer_policy: c.answer_policy };
    Store.set(KEYS.klass, S.klass);
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
    closeModal(); watchKlass(); render(); toast(T('class.joined', { n: c.name }));
  } catch (e) {
    console.warn(e);
    errEl.textContent = T(e.message === 'class_not_found' ? 'class.notFound' : e.message === 'class_closed' ? 'class.closed' : e.message === 'anon_disabled' ? 'class.anonOff' : 'class.netError');
    btn.disabled = false;
  }
}
function openClassInfo() {
  const k = S.klass;
  modal(`<div class="modal-head"><h2>${I.users} ${esc(k.name)}</h2><button class="icon-btn" data-act="closeModal" aria-label="${esc(T('btn.close'))}">${I.x}</button></div>
    <div class="modal-body form">
      <p class="muted">${H('class.code')}: <b class="mono">${esc(k.code)}</b> · ${H('set.code')}: <b class="mono">${esc(k.set_code || '')}</b></p>
      <form data-form="rename" class="inline-form"><input name="nick" maxlength="30" value="${esc(k.nickname)}" aria-label="${esc(T('class.nickname'))}"><button class="btn btn-ghost btn-sm">${H('class.rename')}</button></form>
      <p class="muted small">${H('class.privacy')}</p>
      <hr><button class="btn btn-ghost" data-act="leave">${I.door}${H('class.leave')}</button>
    </div>`);
}
async function doRename(f) {
  const nick = String(new FormData(f).get('nick') || '').trim();
  if (!nick) return;
  try { await backend.renameMe(S.klass.id, nick); S.klass.nickname = nick; Store.set(KEYS.klass, S.klass); Store.set('sqln.nick', nick); closeModal(); render(); toast(T('class.renamed')); }
  catch (e) { toast(T('class.netError')); }
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
    if (unwatch) unwatch();
    unwatch = await backend.watchClass(S.klass.id, row => applyClassRow(row, true));
    backend.flushAttempts();
  } catch (e) { /* offline: keep cached class */ }
}
function applyClassRow(c, live) {
  const changed = c.set_code !== S.klass.set_code || JSON.stringify(c.lessons) !== JSON.stringify(S.klass.lessons) || c.answer_policy !== S.klass.answer_policy;
  Object.assign(S.klass, { name: c.name, set_code: c.set_code, lessons: c.lessons || [], answer_policy: c.answer_policy });
  Store.set(KEYS.klass, S.klass);
  if (changed) { saveDraft(); S.runs = {}; render(); if (live) toast(T('class.updated')); }
}

/* ---------- start ---------- */
(async function start() {
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
