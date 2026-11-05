/* =========================================================
 * check-ui.js — the set-up form of the check test (確認テスト), shared by
 * the student app (start a test) and the teacher app (make a link for
 * the class, with the problems and answers to look at).
 * The form keeps its own state (one per app, in this browser) and
 * repaints #ck-setup by itself; clicks are handled here (data-ck-*).
 * ========================================================= */
import { th, t, esc, rubyHTML, raw } from './i18n.js';
import { FORMAT_KEYS, FORMAT_MAX, LESSON_BY_KEY, randomCode } from './engine.js';
import { CHAPTERS } from './lessons.js';
import { CHECK_MAXES, CHECK_PRESETS, checkLessons, normCheck, encodeCheck, checkCounts, buildCheck } from './check.js';
import { highlightSQL, problemHTML, lessonTitle, lessonTitleHTML, themeName, toast, copyText } from './ui.js';
import { altAnswers } from './alt.js';

const FMT_LABEL = { fill: 'tc.fmtFill', order1: 'tc.fmtOrder1', order2: 'tc.fmtOrder2', write: 'tc.fmtWrite' };
let ctx = null;   // { mode: 'student'|'teacher', lang(), engine(), assigned(), onStart(cfg) }
const KEY = () => (ctx && ctx.mode === 'teacher' ? 'sqln.checkDraftT' : 'sqln.checkDraft');
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY()) || 'null'); } catch (e) { d = null; }
  d = d || {};
  const c = normCheck({ lessons: d.lessons || [], f: d.f || CHECK_PRESETS.balance, max: d.max === undefined ? 10 : d.max, seed: d.seed });
  return Object.assign(c, { same: d.same !== false });
}
let draft = null;
const D = () => draft || (draft = load());
function save() { try { localStorage.setItem(KEY(), JSON.stringify(D())); } catch (e) { /* private window */ } }
/** the test as it will be given (teacher: a fixed seed when everyone gets the same problems) */
function cfgOf(d) {
  if (ctx.mode !== 'teacher') return normCheck(Object.assign({}, d, { seed: '' }));
  if (d.same && !d.seed) { d.seed = randomCode(4); save(); }
  return normCheck(Object.assign({}, d, { seed: d.same ? d.seed : '' }));
}

const H = (k, v) => th(k, ctx.lang(), v);
const T = (k, v) => t(k, ctx.lang(), v);

export function checkSetupHTML() { return `<div id="ck-setup">${innerHTML()}</div>`; }
function innerHTML() {
  const d = D(), L = ctx.lang(), assigned = (ctx.assigned && ctx.assigned()) || [];
  const chosen = new Set(d.lessons);
  const cnt = checkCounts(d);
  const lessonsBox = `<div class="fld"><span>${H('ck.lessons')}</span>
    <div class="row-btns left"><button class="btn btn-ghost btn-xs" data-ck="all">${H('test.all')}</button><button class="btn btn-ghost btn-xs" data-ck="none">${H('test.none')}</button>${assigned.length ? `<button class="btn btn-ghost btn-xs" data-ck="assigned">${H('ck.assigned')}</button>` : ''}</div>
    <div class="ck-pick">${CHAPTERS.map(ch => {
      const ls = checkLessons().filter(l => l.ch === ch.key);
      if (!ls.length) return '';
      const allOn = ls.every(l => chosen.has(l.key));
      return `<div class="ck-ch" style="--cc:var(--c-${ch.key})"><button class="ck-ch-name" data-ck="chapter" data-v="${ch.key}" aria-pressed="${allOn}" title="${esc(T('ck.chapterTip'))}">${rubyHTML(raw('ch.' + ch.key, L))}</button>
        ${ls.map(l => `<label class="chk"><input type="checkbox" data-ck-l="${l.key}" ${chosen.has(l.key) ? 'checked' : ''}><span>${lessonTitle(l, L).startsWith(String(l.no)) ? '' : l.no + '. '}${lessonTitleHTML(l, L)}</span></label>`).join('')}</div>`;
    }).join('')}</div></div>`;
  const fmtBox = `<div class="fld"><span>${H('ck.format')}</span>
    <div class="fmt-presets"><b class="small">${H('tc.fmtPresets')}</b>${Object.keys(CHECK_PRESETS).map(k => `<button class="btn btn-ghost btn-xs" data-ck="preset" data-v="${k}">${H(k === 'balance' ? 'ck.p.balance' : 'tc.fmtP.' + k)}</button>`).join('')}</div>
    <div class="ck-fmt">${FORMAT_KEYS.map(k => `<div class="fmt-n"><span>${H(FMT_LABEL[k])}</span><span class="stepper"><button class="btn btn-ghost btn-xs" data-ck="step" data-k="${k}" data-d="-1" aria-label="−" ${d.f[k] <= 0 ? 'disabled' : ''}>−</button><b class="ck-num">${d.f[k]}</b><button class="btn btn-ghost btn-xs" data-ck="step" data-k="${k}" data-d="1" aria-label="+" ${d.f[k] >= FORMAT_MAX ? 'disabled' : ''}>+</button></span></div>`).join('')}</div>
    <small class="muted">${H('ck.formatNote')}</small></div>`;
  const maxBox = `<div class="fld"><span>${H('ck.count')}</span><div class="seg">${CHECK_MAXES.map(m => `<button class="seg-b ${d.max === m ? 'on' : ''}" data-ck="max" data-v="${m}" aria-pressed="${d.max === m}">${m ? m : H('ck.countAll')}</button>`).join('')}</div></div>`;
  const sameBox = ctx.mode !== 'teacher' ? '' : `<div class="fld"><span>${H('ck.who')}</span><div class="seg">${[[true, 'ck.sameYes'], [false, 'ck.sameNo']].map(([v, k]) => `<button class="seg-b ${d.same === v ? 'on' : ''}" data-ck="same" data-v="${v}" aria-pressed="${d.same === v}">${H(k)}</button>`).join('')}</div></div>`;
  const total = !d.lessons.length ? `<p class="ck-total muted">${H('ck.pickLesson')}</p>`
    : `<p class="ck-total"><b>${H('ck.total', { n: cnt.n })}</b>${cnt.all > cnt.n ? ` <span class="muted small">${H('ck.fromAll', { all: cnt.all })}</span>` : ''} <span class="muted small">· ${H('ck.lessonsN', { n: d.lessons.length })}</span></p>`;
  const form = `<div class="card ck-form">${lessonsBox}${fmtBox}${maxBox}${sameBox}${total}
    ${ctx.mode === 'teacher' ? '' : `<button class="btn btn-primary btn-lg" data-ck="start" ${d.lessons.length ? '' : 'disabled'}>${H('ck.start')}</button>`}</div>`;
  return ctx.mode === 'teacher' ? `<div class="ck-layout">${form}<div class="ck-out">${teacherOutHTML()}</div></div>` : form;
}

/* ---------- teacher: the link, and the problems with their answers ---------- */
export function checkLink(cfg) {
  const base = location.origin + location.pathname.replace(/teacher\/(index\.html)?$/, '');
  return `${base}#/check/${encodeCheck(cfg)}`;
}
function teacherOutHTML() {
  const d = D();
  if (!d.lessons.length) return `<div class="card ck-empty muted">${H('ck.pickLesson')}</div>`;
  const cfg = cfgOf(d), link = checkLink(cfg);
  const items = d.same ? buildCheck(ctx.engine(), cfg, cfg.seed) : [];
  const L = ctx.lang();
  return `<section class="card ck-link"><h2>${H('ck.link')}</h2>
      <div class="inline-form"><input class="mono" readonly value="${esc(link)}" aria-label="${esc(T('ck.link'))}" data-ck-sel><button class="btn btn-primary btn-sm" data-ck="copy">${H('ck.copy')}</button></div>
      <div class="row-btns left"><a class="btn btn-ghost btn-sm" href="${esc(link)}" target="_blank" rel="noopener">${H('ck.open')}</a>${d.same ? `<button class="btn btn-ghost btn-sm" data-ck="reseed">${H('ck.newSet')}</button>` : ''}<span class="muted small">${H('ck.code')}: <b class="mono">${esc(encodeCheck(cfg))}</b></span></div>
      <p class="muted small">${H(d.same ? 'ck.sameNote' : 'ck.diffNote')}</p></section>
    ${d.same ? `<section class="card ck-prev"><h2>${H('ck.preview')} <small class="muted">(${items.length})</small></h2>
      ${items.map((p, i) => `<details class="ck-q"><summary><b>Q${i + 1}</b> <span class="tag st-${p.stage}">${esc(stageName(p))}</span> <span class="muted small">Lesson ${LESSON_BY_KEY[p.lesson].no} · ${esc(themeName(p, L))}</span></summary>
        <p class="prob-text">${problemHTML(p, L)}</p><pre class="sql">${highlightSQL(p.sql)}</pre>
        ${altAnswers(ctx.engine(), p).map(a => `<div class="alt"><p class="alt-note">${H('alt.' + a.rule)}</p><pre class="sql">${highlightSQL(a.sql)}</pre></div>`).join('')}</details>`).join('')}</section>` : ''}`;
}
export function stageName(p) {
  return p.stage === 'write' ? T('tc.fmtWrite') : p.stage === 'order' ? T(p.level === 2 ? 'tc.fmtOrder2' : 'tc.fmtOrder1') : T('stage.' + p.stage);
}

function repaint() {
  const el = document.getElementById('ck-setup');
  if (!el) return;
  const y = scrollY;
  el.innerHTML = innerHTML();
  scrollTo(0, y);
}
function change(fn) { fn(D()); Object.assign(draft, normCheck(draft), { same: draft.same, seed: draft.seed }); save(); repaint(); }

let installed = false;
export function installCheckUI(c) {
  ctx = c; draft = null;
  if (installed) return; installed = true;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ck]');
    if (!b || !ctx || !document.getElementById('ck-setup') || !document.getElementById('ck-setup').contains(b)) return;
    e.preventDefault();
    const a = b.dataset.ck, v = b.dataset.v;
    if (a === 'start') { const cfg = cfgOf(D()); if (cfg.lessons.length) ctx.onStart(cfg); return; }
    if (a === 'copy') { const link = checkLink(cfgOf(D())); copyText(link, () => toast(T('ck.copied'))); return; }
    change(d => {
      if (a === 'all') d.lessons = checkLessons().map(l => l.key);
      else if (a === 'none') d.lessons = [];
      else if (a === 'assigned') d.lessons = ((ctx.assigned && ctx.assigned()) || []).slice();
      else if (a === 'chapter') {
        const ks = checkLessons().filter(l => l.ch === v).map(l => l.key);
        const on = ks.every(k => d.lessons.includes(k));
        d.lessons = on ? d.lessons.filter(k => !ks.includes(k)) : [...d.lessons, ...ks];
      } else if (a === 'preset') d.f = Object.assign({}, CHECK_PRESETS[v]);
      else if (a === 'step') { const k = b.dataset.k; d.f[k] = Math.max(0, Math.min(FORMAT_MAX, d.f[k] + +b.dataset.d)); if (FORMAT_KEYS.every(x => !d.f[x])) d.f[k] = 1; }
      else if (a === 'max') d.max = +v;
      else if (a === 'same') d.same = v === 'true';
      else if (a === 'reseed') d.seed = randomCode(4);
      // keep the lessons in course order
      const order = checkLessons().map(l => l.key);
      d.lessons = order.filter(k => d.lessons.includes(k));
    });
  });
  document.addEventListener('change', e => {
    const x = e.target.closest('[data-ck-l]');
    if (!x || !ctx) return;
    change(d => {
      const k = x.dataset.ckL;
      d.lessons = x.checked ? [...d.lessons, k] : d.lessons.filter(y => y !== k);
      const order = checkLessons().map(l => l.key);
      d.lessons = order.filter(y => d.lessons.includes(y));
    });
  });
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('[data-ck-sel]')) e.target.select(); });
}
