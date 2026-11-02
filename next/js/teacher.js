/* =========================================================
 * teacher.js — the teacher page (teacher.html)
 *   #/            sign in · my classes
 *   #/c/<id>/<tab>  class: assign | live | mistakes | members
 *   #/present     open an example in presenter mode
 *   #/test        paper test maker (A/B versions)
 *   #/book        printable textbook (syntax list + way of thinking)
 * Class features need Supabase (config.js). Presenter and paper tests work without it.
 * ========================================================= */
import { LANGS, loadLang, detectLang, htmlLang, t, th, esc, rubyHTML, raw } from './i18n.js';
import { SqlEngine, LESSON_BY_KEY, grade, todayCode, randomCode, normCode } from './engine.js';
import { LESSONS, CHAPTERS } from './lessons.js';
import { TEXTBOOKS } from './book.js';
import { syncClock, secondsLeft, fmtClock, timerState } from './timer.js';
import { drawJoinLines } from './viz.js';
import { diagnose } from './diagnose.js';
import { Store, KEYS, loadSettings, saveSettings } from './store.js';
import * as backend from './backend.js';
import { I, applySettings, langSelect, langOptions, highlightSQL, gridHTML, problemHTML, lessonTitle, lessonTitleHTML, themeName, themeHTML, toast, copyText, modal, closeModal } from './ui.js';

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
  unwatch: null,
  mistakeProb: null,
  busy: false,
  isTeacher: null,   // null = not checked yet
  test: Object.assign({ title: '', tlang: null, bilingual: null, lessons: LESSONS.map(l => l.key), per: 1, type: 'write', key: true, results: true, code: randomCode(), ab: false }, Store.get(KEYS.test, {}))
};
S.settings.lang = detectLang(S.settings.lang);
S.settings.presenter = false;
if (!S.test.tlang) S.test.tlang = S.settings.lang;
const app = document.getElementById('app');
const L = () => S.settings.lang;
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
const studentURL = () => new URL('index.html', location.href).toString();
const joinURL = code => `${studentURL()}?class=${encodeURIComponent(code)}`;

/* ---------- routing ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'c' && h[1]) return { view: 'class', id: h[1], tab: ['assign', 'live', 'mistakes', 'members'].includes(h[2]) ? h[2] : 'live' };
  if (h[0] === 'present') return { view: 'present' };
  if (h[0] === 'test') return { view: 'test' };
  if (h[0] === 'book') return { view: 'book' };
  return { view: 'home' };
}
window.addEventListener('hashchange', () => { const prev = S.route; S.route = parseRoute(); if (prev.view === 'class' && (S.route.view !== 'class' || S.route.id !== prev.id)) stopWatch(); load(); });

/* =========================================================
 * RENDER
 * ========================================================= */
function render() {
  applySettings(S.settings, htmlLang(L()));
  const v = S.route.view;
  let body;
  if (!S.engine) body = `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`;
  else if (v === 'present') body = presentHTML();
  else if (v === 'test') body = testHTML();
  else if (v === 'book') body = bookPanelHTML();
  else if (!backend.enabled) body = noBackendHTML();
  else if (!S.session) body = loginHTML();
  else if (S.isTeacher === false) body = notTeacherHTML();
  else if (S.isTeacher === null) body = `<div class="loading"><div><div class="spinner"></div>${H('misc.loading')}</div></div>`;
  else if (v === 'class') body = classHTML();
  else body = classesHTML();
  app.innerHTML = headerHTML() + body;
  if (v === 'book') document.title = `${T('book.nav')} · SQL Practice`;
  if (v === 'test' && S.engine) document.title = `${S.test.title || t('test.headingDefault', S.test.tlang)} (${S.test.code})`;
}
function headerHTML() {
  const v = S.route.view;
  return `<header class="topbar"><div class="topbar-in">
    <a class="brand" href="#/"><span class="brand-mark">SQL</span><span class="brand-name">SQL Practice</span><span class="brand-tag">${H('tc.badge')}</span></a>
    <nav class="topnav">
      <a href="#/" class="${v === 'home' || v === 'class' ? 'on' : ''}">${I.users}<span>${H('tc.classes')}</span></a>
      <a href="#/present" class="${v === 'present' ? 'on' : ''}">${I.screen}<span>${H('tc.present')}</span></a>
      <a href="#/test" class="${v === 'test' ? 'on' : ''}">${I.paper}<span>${H('tc.test')}</span></a>
      <a href="#/book" class="${v === 'book' ? 'on' : ''}">${I.book}<span>${H('book.nav')}</span></a>
    </nav>
    <div class="topbar-right">
      ${langSelect(L(), T('nav.language'))}
      ${S.session ? `<button class="icon-btn" data-act="signOut" title="${esc(T('tc.signOut'))}" aria-label="${esc(T('tc.signOut'))}">${I.door}</button>` : ''}
    </div>
  </div></header>`;
}
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
  const tabs = [['live', I.bolt, 'tc.tabLive'], ['assign', I.book, 'tc.tabAssign'], ['mistakes', I.eye, 'tc.tabMistakes'], ['members', I.users, 'tc.tabMembers']];
  let body = '';
  if (tab === 'assign') body = assignHTML(c);
  else if (tab === 'mistakes') body = mistakesHTML(c);
  else if (tab === 'members') body = membersHTML(c);
  else body = liveHTML(c);
  return `<main class="wrap">
    <div class="crumbs"><a href="#/">${H('tc.myClasses')}</a><span>›</span><span>${esc(c.name)}</span></div>
    <section class="card class-head">
      <div><h1>${esc(c.name)}</h1>
        <div class="muted small">${H('tc.members', { n: S.members.length })} · ${H('set.code')} <b class="mono">${esc(c.set_code)}</b> · ${H('tc.policy.' + c.answer_policy)}</div></div>
      <button class="code-big" data-act="showQR" title="${esc(T('tc.showQR'))}"><small>${H('class.code')}</small><b class="mono">${esc(c.code)}</b><span>${I.qr} ${H('tc.showQR')}</span></button>
      <div class="tbox" id="tbox">${timerBoxHTML(c)}</div>
      <div class="class-actions">
        <button class="btn btn-ghost btn-sm" data-act="copyJoin">${I.link}${H('tc.copyJoin')}</button>
        <button class="btn btn-ghost btn-sm" data-act="toggleOpen">${I.lock}${H(c.open ? 'tc.close' : 'tc.reopen')}</button>
      </div>
    </section>
    <nav class="tabs" role="tablist">${tabs.map(([k, ic, lab]) => `<a role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" href="#/c/${c.id}/${k}">${ic}${H(lab)}</a>`).join('')}</nav>
    <div id="tab-body">${body}</div>
  </main>`;
}

/* ---------- class timer: shown on every student's screen; answers after the end are marked late ---------- */
const TIMER_MIN = [1, 3, 5, 10];
function timerBoxHTML(c) {
  const left = secondsLeft(c), st = timerState(left);
  if (!st) return `<span class="tb-lab">⏱ ${H('tc.timer')}</span><div class="tb-presets">${TIMER_MIN.map(m => `<button class="btn btn-ghost btn-xs" data-act="timerStart" data-sec="${m * 60}" title="${esc(T('tc.timerNote'))}">${H('tc.timerMin', { n: m })}</button>`).join('')}</div>`;
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
    <div class="fld"><span>${H('tc.assignLessons')}</span>
      <div class="lesson-pick">${CHAPTERS.map(ch => `<div class="lp-ch" style="--cc:var(--c-${ch.key})"><b>${rubyHTML(raw('ch.' + ch.key, L()))}</b>
        ${LESSONS.filter(l => l.ch === ch.key).map(l => `<label class="chk"><input type="checkbox" name="lesson" value="${l.key}" ${sel.has(l.key) ? 'checked' : ''}><span>${l.no}. ${lessonTitleHTML(l, L())}</span></label>`).join('')}</div>`).join('')}</div></div>
    <div class="fld"><span>${H('tc.setCode')}</span>
      <div class="inline-form"><input name="set_code" class="mono" maxlength="16" value="${esc(c.set_code)}" required>
      <button type="button" class="btn btn-ghost btn-sm" data-act="setToday">${H('set.today')}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="setRandom">${I.shuffle}${H('set.new')}</button></div>
      <small class="muted">${H('tc.setCodeTip')}</small></div>
    <div class="fld"><span>${H('tc.policy')}</span>
      ${['after2', 'solved', 'always', 'never'].map(p => `<label class="chk"><input type="radio" name="policy" value="${p}" ${pol === p ? 'checked' : ''}><span><b>${H('tc.policy.' + p)}</b> <small class="muted">${H('tc.policyTip.' + p)}</small></span></label>`).join('')}</div>
    <div class="actions"><button class="btn btn-primary">${I.check}${H('tc.saveAssign')}</button><span class="muted small">${H('tc.liveTip')}</span></div>
    <hr>
    <div class="fld"><span>${H('tc.previewTitle')}</span><small class="muted">${H('tc.previewTip')}</small>
      <div class="preview-list">${(c.lessons || []).filter(k => LESSON_BY_KEY[k]).map(k => {
        const l = LESSON_BY_KEY[k];
        return `<details class="pv"><summary>${lessonTitleHTML(l, L())}</summary>${S.engine.lessonProblems(l, c.set_code).map(p => `<div class="pv-item"><span class="tag st-${p.stage}">${stageNameH(p)}</span> ${problemHTML(p, L())}${answerHTML(p)}</div>`).join('')}</details>`;
      }).join('') || `<p class="muted">${H('tc.noLessons')}</p>`}</div></div>
  </form>`;
}
function stageNameH(p) { return p.stage === 'write' || p.stage === 'quiz' ? H('stage.' + p.stage, { n: p.wn }) : p.stage === 'order' && p.of > 1 ? H('stage.orderN', { n: p.wn }) : H('stage.' + p.stage); }
function stageName(p) { return p.stage === 'write' || p.stage === 'quiz' ? T('stage.' + p.stage, { n: p.wn }) : p.stage === 'order' && p.of > 1 ? T('stage.orderN', { n: p.wn }) : T('stage.' + p.stage); }
const isQuiz = p => LESSON_BY_KEY[p.lesson].kind === 'quiz';
/** the answer of a problem: SQL, or the value for Lesson 0 */
const answerHTML = p => (isQuiz(p) ? `<p class="quiz-ans">${esc(String(p.answer))}</p>` : `<pre class="sql">${highlightSQL(p.sql)}</pre>`);

/* live grid: members × problems of the assigned lessons */
function classProblems(c) {
  return (c.lessons || []).filter(k => LESSON_BY_KEY[k]).map(k => ({ lesson: LESSON_BY_KEY[k], probs: S.engine.lessonProblems(LESSON_BY_KEY[k], c.set_code) }));
}
function visibleAttempts() {
  if (!S.liveOnlyToday) return S.attempts;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return S.attempts.filter(a => new Date(a.created_at) >= d);
}
function liveHTML(c) {
  const groups = classProblems(c);
  if (!groups.length) return `<section class="card empty"><p>${H('tc.noLessons')}</p><a class="btn btn-primary" href="#/c/${c.id}/assign">${H('tc.tabAssign')}</a></section>`;
  const atts = visibleAttempts();
  const cell = {}; // user|problem → {ok, n}
  atts.forEach(a => { const k = a.user_id + '|' + a.problem_id; const x = cell[k] || (cell[k] = { ok: false, n: 0, onTime: false }); if (a.ok) { x.ok = true; if (!a.late) x.onTime = true; } else x.n++; });
  const all = groups.flatMap(g => g.probs);
  const solvedBy = p => S.members.filter(m => (cell[m.user_id + '|' + p.id] || {}).ok).length;
  const active = new Set(atts.filter(a => Date.now() - new Date(a.created_at) < 5 * 60000).map(a => a.user_id));
  const rows = S.members.map(m => {
    const done = all.filter(p => (cell[m.user_id + '|' + p.id] || {}).ok).length;
    return `<tr><th class="who">${active.has(m.user_id) ? '<i class="live-dot" title="active"></i>' : ''}${esc(m.nickname)}</th><td class="n sum">${done}/${all.length}</td>${groups.map(g => g.probs.map(p => {
      const x = cell[m.user_id + '|' + p.id];
      const late = x && x.ok && !x.onTime;   // solved only after the timer ended
      const cls = !x ? '' : late ? 'ok late' : x.ok ? 'ok' : 'bad';
      return `<td class="lc ${cls} ${p.idx === 0 ? 'first' : ''}" title="${esc(stageName(p) + (late ? ' · ' + T('tc.late') : ''))}">${!x ? '' : x.ok ? (late ? '⏱' : '✓') : x.n}</td>`;
    }).join('')).join('')}</tr>`;
  }).join('');
  const n = S.members.length || 1;
  const stats = problemStats(all, atts);
  const nowOn = new Map(stats.map(x => [x.p.id, x.now]));
  return `${rankHTML(groups, stats)}<section class="card live">
    <div class="live-bar"><label class="chk"><input type="checkbox" data-act2="today" ${S.liveOnlyToday ? 'checked' : ''}><span>${H('tc.todayOnly')}</span></label>
      <span class="muted small">${I.bolt} ${H('tc.liveNote')}</span><button class="btn btn-ghost btn-xs" data-act="reload">${I.reset}${H('tc.reload')}</button></div>
    <div class="live-scroll"><table class="live-grid">
      <thead><tr><th rowspan="2"></th><th rowspan="2" class="n">✓</th>${groups.map(g => `<th colspan="${g.probs.length}" class="lg-h" title="${esc(lessonTitle(g.lesson, L()))}">${g.lesson.no}. ${lessonTitleHTML(g.lesson, L())}</th>`).join('')}</tr>
      <tr>${groups.map(g => g.probs.map(p => { const k = nowOn.get(p.id) || 0; return `<th class="pcol ${p.idx === 0 ? 'first' : ''}"><button data-act="openMistakes" data-p="${p.id}" title="${esc(stageName(p) + (k ? ' · ' + T('tc.colNow') + ' ' + k : ''))}">${colLabel(p)}${k ? `<i class="now-n">${k}</i>` : ''}</button></th>`; }).join('')).join('')}</tr></thead>
      <tbody>${rows || `<tr><td colspan="99" class="res-empty">${H('tc.noMembers')}</td></tr>`}</tbody>
      <tfoot><tr><th>${H('tc.rate')}</th><td></td>${all.map(p => { const r = Math.round(solvedBy(p) / n * 100); return `<td class="rate ${p.idx === 0 ? 'first' : ''}"><span style="--r:${r}%">${S.members.length ? r + '%' : ''}</span></td>`; }).join('')}</tr></tfoot>
    </table></div>
    <p class="muted small legend-line"><span class="lc ok">✓</span> ${H('tc.legendOk')} <span class="lc bad">2</span> ${H('tc.legendBad')} <span class="lc ok late">⏱</span> ${H('tc.late')} · Ex = ${H('stage.demo')} · □ = ${H('stage.fill')} · ⇅ = ${H('stage.order')} · W = ${H('stage.write', { n: '' }).trim()}</p>
  </section>`;
}

const colLabel = p => (p.idx === 0 ? 'Ex' : p.stage === 'fill' ? '□' : p.stage === 'order' ? '⇅' + (p.of > 1 ? p.wn : '') : (p.stage === 'quiz' ? 'Q' : 'W') + p.wn);
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
  const seg = (name, val, label) => `<button class="${S[name] === val ? 'on' : ''}" data-act="rankSet" data-k="${name}" data-v="${val}">${H(label)}</button>`;
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
  return `<section class="card rank">
    <div class="rk-head"><div><h2>${H('tc.rank')}</h2><p class="muted small">${H('tc.rankSub')}</p></div>
      <div class="rk-ctl"><div class="seg">${seg('rankWindow', 'now', 'tc.rankNow')}${seg('rankWindow', 'all', 'tc.rankAll')}</div>
        <div class="seg">${seg('rankSort', 'stuck', 'tc.sortStuck')}${seg('rankSort', 'wrong', 'tc.sortWrong')}${seg('rankSort', 'now', 'tc.sortNow')}</div></div></div>
    ${rows ? `<ol class="rk-list">${rows}</ol>` : `<p class="res-empty">${H('tc.rankEmpty')}</p>`}
  </section>`;
}
// "now" changes as time passes: redraw the live tab every 30 seconds
setInterval(() => { if (S.route && S.route.view === 'class' && S.route.tab === 'live' && !document.querySelector('.modal')) refreshTab(); }, 30000);

/* common wrong answers, grouped */
function normSql(s) { return String(s || '').replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim(); }
function mistakesHTML(c) {
  const groups = classProblems(c);
  const all = groups.flatMap(g => g.probs);
  if (!all.length) return `<section class="card empty"><p>${H('tc.noLessons')}</p></section>`;
  const atts = visibleAttempts();
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
    <div class="mk-prob"><p class="prob-text">${problemHTML(prob, L())}</p><details><summary class="muted small">${H('hint.answer')}</summary>${answerHTML(prob)}</details></div>
    <div id="mk-list">${list.length ? `<ol class="mk-list">${list.map(x => `<li><div class="mk-n"><b>${x.users.size}</b><small>${H('tc.people')}</small></div><div class="mk-body">${isQuiz(prob) ? `<p class="quiz-ans bad">${esc(x.sql)}</p>` : `<pre class="sql">${highlightSQL(x.sql)}</pre>`}<p class="mk-why">${why(x.sql)}</p></div></li>`).join('')}</ol>` : `<p class="res-empty">${H('tc.noMistakes')}</p>`}</div>
    <p class="muted small">${H('tc.anonNote')}</p>
  </section>`;
}

function membersHTML(c) {
  const solved = {};
  S.attempts.filter(a => a.ok).forEach(a => { (solved[a.user_id] = solved[a.user_id] || new Set()).add(a.problem_id); });
  const last = {};
  S.attempts.forEach(a => { last[a.user_id] = a.created_at; });
  return `<section class="card members">
    <table class="wtable"><thead><tr><th>${H('class.nickname')}</th><th>${H('tc.joined')}</th><th>${H('tc.lastActive')}</th><th class="n">${H('home.solved')}</th><th></th></tr></thead>
    <tbody>${S.members.map(m => `<tr><td><b>${esc(m.nickname)}</b></td><td class="muted small">${esc(fmtTime(m.joined_at))}</td><td class="muted small">${last[m.user_id] ? esc(fmtTime(last[m.user_id])) : '—'}</td><td class="n">${(solved[m.user_id] || new Set()).size}</td>
      <td><button class="btn btn-ghost btn-xs" data-act="removeMember" data-u="${m.user_id}">${I.trash}${H('tc.remove')}</button></td></tr>`).join('') || `<tr><td colspan="5" class="res-empty">${H('tc.noMembers')}</td></tr>`}</tbody></table>
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
      <ul class="lesson-list">${LESSONS.filter(l => l.ch === ch.key).map(l => `<li><a class="lesson-link" target="_blank" rel="noopener" href="index.html?present=1&set=${encodeURIComponent(code)}#/l/${l.key}/0"><span class="lesson-num">${l.no}</span><span class="lesson-name">${lessonTitleHTML(l, L())}</span>${I.screen}</a></li>`).join('')}</ul></article>`).join('')}</div>
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
      <div class="row-btns left"><button class="btn btn-ghost btn-xs" data-act="testAll">${H('test.all')}</button><button class="btn btn-ghost btn-xs" data-act="testNone">${H('test.none')}</button>${S.klass ? `<button class="btn btn-ghost btn-xs" data-act="testClass">${H('tc.fromClass')}</button>` : ''}</div>
      <div class="lesson-pick compact">${CHAPTERS.map(ch => `<div class="lp-ch" style="--cc:var(--c-${ch.key})"><b>${rubyHTML(raw('ch.' + ch.key, L()))}</b>${LESSONS.filter(l => l.ch === ch.key && l.kind !== 'quiz').map(l => `<label class="chk"><input type="checkbox" data-tl="${l.key}" ${o.lessons.includes(l.key) ? 'checked' : ''}><span>${l.no}. ${lessonTitleHTML(l, L())}</span></label>`).join('')}</div>`).join('')}</div></div>
    <div class="fld"><span>${H('test.perLesson')}</span><div class="seg">${radio('per', 1, '1')}${radio('per', 2, '2')}${radio('per', 3, '3')}</div></div>
    <div class="fld"><span>${H('test.type')}</span><div class="seg">${radio('type', 'write', T('test.typeWrite'))}${radio('type', 'predict', T('test.typePredict'))}${radio('type', 'mix', T('test.typeMix'))}</div></div>
    <div class="fld"><span>${H('test.versions')}</span><div class="seg">${radio('ab', false, T('test.versionA'))}${radio('ab', true, T('test.versionAB'))}</div><small class="muted">${H('test.versionTip')}</small></div>
    <div class="fld"><span>${H('test.options')}</span>
      <label class="chk"><input type="checkbox" data-tk="key" ${o.key ? 'checked' : ''}><span>${H('test.withKey')}</span></label>
      <label class="chk"><input type="checkbox" data-tk="results" ${o.results ? 'checked' : ''} ${o.key ? '' : 'disabled'}><span>${H('test.withResult')}</span></label></div>
    <label class="fld"><span>${H('test.code')}</span><div class="inline-form"><input class="mono" data-tk="code" value="${esc(o.code)}" maxlength="16"><button class="btn btn-ghost btn-sm" data-act="testNewCode">${I.shuffle}${H('test.newCode')}</button></div></label>
    <div class="tm-print"><button class="btn btn-primary" data-act="print" ${o.lessons.length ? '' : 'disabled'}>${I.print}${H('test.print')}</button><div class="muted small center" id="tm-count"></div></div>
  </aside>`;
  return `<main class="wrap"><div class="tm-layout">${panel}<div class="paper-wrap">${paperHTML()}</div></div></main>`;
}
function paperHTML() {
  const o = S.test;
  if (!o.lessons.length) return `<div class="card res-empty">${H('test.nothing')}</div>`;
  const vers = o.ab ? ['A', 'B'] : ['A'];
  const out = vers.map(v => sheetsHTML(S.engine.makeTest({ lessons: o.lessons, per: o.per, type: o.type, code: o.code || 'X', version: v }), v, o.ab)).join('');
  return out;
}
function sheetsHTML(test, ver, ab) {
  const o = S.test, tl = o.tlang, sec = o.bilingual && o.bilingual !== tl ? o.bilingual : null;
  const P = (k, v) => th(k, tl, v);
  const title = esc(o.title.trim()) || P('test.headingDefault');
  const tag = ab ? ` <span class="ver">${esc(t('test.version', tl, { v: ver }))}</span>` : '';
  const qs = test.questions.map((q, i) => {
    const write = q.qtype === 'write';
    const lines = Math.min(5, Math.max(2, Math.ceil(q.sql.length / 58) + 1));
    const rows = q.result ? q.result.values.length : 3;
    return `<div class="q"><div class="q-head"><span class="q-num">Q${i + 1}.</span><div class="q-body">
      <div class="q-inst">${P(write ? 'test.qWrite' : 'test.qPredict')}${sec ? ` <span class="q-sec">/ ${th(write ? 'test.qWrite' : 'test.qPredict', sec)}</span>` : ''}</div>
      ${write ? `<p class="q-text">${problemHTML(q, tl)}</p>${sec ? `<p class="q-en" lang="${htmlLang(sec)}">${problemHTML(q, sec)}</p>` : ''}` : `<div class="q-sql">${esc(q.sql)}</div>`}
      <div class="q-meta">${esc(t('test.useTable', tl, { t: q.tables.join(', ') }))}</div>
      ${write ? `<div class="ans lines" style="--h:${lines * 8 + 2}mm"><span class="lab">${P('test.answerSpace')}</span></div>` : `<div class="ans grid-ans" style="--h:${(rows + 2) * 7}mm"><span class="lab">${P('test.answerSpace')}</span></div>`}
    </div></div></div>`;
  }).join('');
  const s1 = `<section class="sheet" lang="${htmlLang(tl)}"><h2>${title}${tag}</h2>
    <div class="meta"><span>${esc(t('test.count', tl, { n: test.questions.length }))}</span><span>${esc(t('set.code', tl))}: ${esc(o.code)}${ab ? '-' + ver : ''}</span></div>
    <div class="idbox"><div>${P('test.class')}</div><div>${P('test.name')}</div><div>${P('test.date')}</div><div>${P('test.score')}</div></div>${qs}</section>`;
  const tables = test.tables.map(n => { const d = S.engine.tableData(n); return `<div class="${d.columns.length > 4 ? 'wide' : ''}"><h4>${esc(n)}</h4>${gridHTML(d)}</div>`; }).join('');
  const s2 = `<section class="sheet" lang="${htmlLang(tl)}"><h3>${P('test.data')}${tag}</h3><p class="note">${P('test.dataNote')}</p><div class="data-tables">${tables}</div></section>`;
  const s3 = !o.key ? '' : `<section class="sheet" lang="${htmlLang(tl)}"><h3>${P('test.key')}${tag} — ${title}</h3><p class="note">${P('test.keyNote')}</p>
    ${test.questions.map((q, i) => `<div class="key-item"><span class="q-num">Q${i + 1}.</span><div class="q-body"><div class="q-sql">${esc(q.sql)}</div>${o.results || q.qtype === 'predict' ? `<div class="res">${gridHTML(q.result)}</div>` : ''}</div></div>`).join('')}</section>`;
  setTimeout(() => { const el = document.getElementById('tm-count'); if (el) el.textContent = `${t('test.count', L(), { n: test.questions.length })}${ab ? ' × 2' : ''} · ${o.code}`; });
  return s1 + s2 + s3;
}
function saveTest() { Store.set(KEYS.test, S.test); }

/* ---------- textbook (PDF) ---------- */
function bookPanelHTML() {
  const cards = TEXTBOOKS.map(b => `<article class="card tb-card ${b.ready ? '' : 'soon'}">
      <div class="tb-cover tb-${b.key}"><span>SQL</span><b>${rubyHTML(raw('book.lv.' + b.key, L()))}</b></div>
      <div class="tb-body"><h2>${H('book.lv.' + b.key)}</h2><p class="muted">Lesson ${b.from}–${b.to}</p>
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
  const [m, a] = await Promise.all([backend.members(c.id), backend.attempts(c.id)]);
  S.members = m; S.attempts = a;
}
async function startWatch() {
  stopWatch();
  syncClock(backend.serverNow);
  const id = S.klass.id;
  let pending = null;
  const soon = () => { clearTimeout(pending); pending = setTimeout(() => { if (S.route.view === 'class' && ['live', 'mistakes', 'members'].includes(S.route.tab)) refreshTab(); }, 300); };
  S.unwatch = await backend.watchDashboard(id, row => { S.attempts.push(row); soon(); }, async () => { S.members = await backend.members(id); soon(); });
}
function stopWatch() { if (S.unwatch) { S.unwatch(); S.unwatch = null; } }
function refreshTab() {
  const el = document.getElementById('tab-body');
  if (!el || !S.klass) return;
  const tab = S.route.tab;
  if (tab === 'live') el.innerHTML = liveHTML(S.klass);
  else if (tab === 'mistakes') { const sc = document.querySelector('.mk-list'); el.innerHTML = mistakesHTML(S.klass); }
  else if (tab === 'members') el.innerHTML = membersHTML(S.klass);
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
  closeModal,
  loginMode(el) { S.loginMode = el.dataset.m; render(); },
  async signOut() { await backend.signOut(); S.session = null; S.isTeacher = null; S.classes = []; S.klass = null; stopWatch(); location.hash = '#/'; render(); },
  showQR() { openQR(S.klass); },
  copyJoin() { copyText(joinURL(S.klass.code), () => toast(T('set.copied'))); },
  async timerStart(el) {
    try { await syncClock(backend.serverNow); S.klass = await backend.startTimer(S.klass.id, +el.dataset.sec); shownState = null; tickTeacherTimer(); }
    catch (e) { console.error(e); toast(timerError(e)); }
  },
  async timerStop() {
    try { S.klass = await backend.stopTimer(S.klass.id); shownState = null; tickTeacherTimer(); const b = document.getElementById('timer-big'); if (b) b.remove(); }
    catch (e) { console.error(e); toast(timerError(e)); }
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
  setToday() { document.querySelector('[name="set_code"]').value = todayCode(); },
  setRandom() { document.querySelector('[name="set_code"]').value = randomCode(); },
  async reload() { await reloadClassData(); refreshTab(); toast(T('tc.reloaded')); },
  rankSet(el) { S[el.dataset.k] = el.dataset.v; refreshTab(); },
  openMistakes(el) { S.mistakeProb = el.dataset.p; location.hash = `#/c/${S.klass.id}/mistakes`; },
  projectMistakes() {
    const list = document.getElementById('mk-list'), pr = document.querySelector('.mk-prob');
    modal(`<div class="modal-head"><h2>${I.eye} ${H('tc.tabMistakes')}</h2><button class="icon-btn" data-act="closeModal">${I.x}</button></div><div class="modal-body projector">${pr ? pr.innerHTML : ''}${list ? list.innerHTML : ''}</div>`, { wide: true });
    document.getElementById('modal').classList.add('full');
  },
  async removeMember(el) {
    if (!confirm(T('tc.removeConfirm'))) return;
    try { await backend.removeMember(S.klass.id, el.dataset.u); S.members = S.members.filter(m => m.user_id !== el.dataset.u); refreshTab(); } catch (e) { toast(T('class.netError')); }
  },
  async clearAttempts() {
    if (!confirm(T('tc.clearConfirm'))) return;
    try { await backend.clearAttempts(S.klass.id); S.attempts = []; refreshTab(); toast(T('tc.cleared')); } catch (e) { toast(T('class.netError')); }
  },
  async deleteClass() {
    if (prompt(T('tc.deleteConfirm', { n: S.klass.name })) !== S.klass.name) return;
    try { await backend.deleteClass(S.klass.id); stopWatch(); S.klass = null; location.hash = '#/'; } catch (e) { toast(T('class.netError')); }
  },
  testAll() { S.test.lessons = LESSONS.map(l => l.key); render(); saveTest(); },
  testNone() { S.test.lessons = []; render(); saveTest(); },
  testClass() { S.test.lessons = LESSONS.map(l => l.key).filter(k => (S.klass.lessons || []).includes(k)); S.test.code = S.klass.set_code; render(); saveTest(); },
  testNewCode() { S.test.code = randomCode(); render(); saveTest(); },
  print() { setTimeout(() => window.print(), 60); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.matches('[data-act="lang"]')) { await loadLang(el.value); S.settings.lang = el.value; saveSettings(Object.assign(loadSettings(el.value), { lang: el.value })); render(); return; }
  if (el.dataset.act2 === 'today') { S.liveOnlyToday = el.checked; refreshTab(); return; }
  if (el.dataset.act2 === 'mistakeProb') { S.mistakeProb = el.value; refreshTab(); return; }
  const k = el.dataset.tk;
  if (k) {
    const o = S.test;
    if (el.type === 'checkbox') o[k] = el.checked;
    else if (k === 'per') o.per = +el.value;
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
document.addEventListener('input', e => {
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
      location.hash = `#/c/${c.id}/assign`;
    } else if (kind === 'assign') {
      const patch = { lessons: LESSONS.map(l => l.key).filter(k => fd.getAll('lesson').includes(k)), set_code: normCode(fd.get('set_code')) || todayCode(), answer_policy: fd.get('policy') || 'after2' };
      S.klass = await backend.updateClass(S.klass.id, patch);
      toast(T('tc.saved')); render();
    }
  } catch (ex) { console.error(ex); toast(T(/not_teacher/.test(ex.message) ? 'tc.notTeacher' : 'class.netError')); }
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

/* ---------- start ---------- */
(async function start() {
  S.route = parseRoute();
  await Promise.all([loadLang('en'), loadLang(L()), loadLang(S.test.tlang), S.test.bilingual ? loadLang(S.test.bilingual) : null]);
  render();
  try { S.engine = new SqlEngine(await window.initSqlJs({ locateFile: f => 'vendor/' + f })); }
  catch (e) { console.error(e); app.innerHTML = headerHTML() + `<div class="loading"><div>${H('misc.loadError')}</div></div>`; return; }
  if (backend.enabled) {
    const sb = await backend.client();
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.session = null; render(); } if (ev === 'PASSWORD_RECOVERY') { const pw = prompt(T('tc.newPassword')); if (pw) sb.auth.updateUser({ password: pw }).then(() => toast(T('tc.saved'))); } });
  }
  load();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
