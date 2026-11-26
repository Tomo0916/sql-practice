/* =========================================================
 * check-ui.js — the set-up form of the check test (確認テスト), shared by
 * the student app (start a test) and the teacher app (make a link for
 * the class, with the problems and answers to look at).
 * The form keeps its own state (one per app, in this browser) and
 * repaints #ck-setup by itself; clicks are handled here (data-ck-*).
 * ========================================================= */
import { th, t, esc, rubyHTML, raw } from './i18n.js';
import { FORMAT_KEYS, FORMAT_MAX, LESSON_BY_KEY, randomCode } from './engine.js';
import { CHECK_MAXES, CHECK_PRESETS, checkLessons, normCheck, encodeCheck, checkCounts, buildCheck } from './check.js';
import { highlightSQL, problemHTML, toast, copyText, composeHTML, lessonPickHTML, lessonGroups } from './ui.js';
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

/** the test set up on this page now, to send to a class: { code, n, lessons } or null */
export function currentCheck() {
  const d = D(); if (!d.lessons.length) return null;
  const cfg = cfgOf(d);
  return { code: encodeCheck(cfg), n: buildCheck(ctx.engine(), cfg, cfg.seed).length, lessons: d.lessons.length };
}
/** opts (teacher, 配信): { sendBar(ready) → html: the time limit, the note and the send button } */
let sendBar = null;
export function checkSetupHTML(opts) { sendBar = (opts && opts.sendBar) || null; return `<div id="ck-setup">${innerHTML()}</div>`; }
const FMT_TONE = { fill: 's1', order1: 's2', order2: 's2', write: 's3' };
const FMT_SEC = { fill: 40, order1: 50, order2: 60, write: 90 };
function innerHTML() {
  const d = D(), L = ctx.lang(), assigned = (ctx.assigned && ctx.assigned()) || [], teacher = ctx.mode === 'teacher';
  const cnt = checkCounts(d), n = d.lessons.length ? cnt.n : 0;
  const step = (no, title, body) => `<section class="card qs-step"><h3><i>${no}</i>${title}</h3>${body}</section>`;
  // 1. the lessons
  const s1 = lessonPickHTML({ id: 'ck', lang: L, chosen: d.lessons, groups: lessonGroups(checkLessons(), L),
    tools: assigned.length ? [{ label: `${H('ck.assigned')} <span class="muted">${assigned.length}</span>`, keys: assigned }] : [] });
  // 2. the kinds of problem, for each lesson
  const presetOn = Object.keys(CHECK_PRESETS).find(k => FORMAT_KEYS.every(x => CHECK_PRESETS[k][x] === d.f[x])) || null;
  const s2 = composeHTML({ act: 'ckCmp', rows: FORMAT_KEYS.map(k => ({ id: k, label: `<span class="kd ck-${FMT_TONE[k]}">${H(FMT_LABEL[k])}</span>`, text: T(FMT_LABEL[k]) })), cols: [{ id: 'n', label: H('ck.perLesson'), text: '' }],
    get: k => d.f[k], max: FORMAT_MAX, lang: L, hideTotal: true,
    presets: Object.keys(CHECK_PRESETS).map(k => ({ v: k, label: H(k === 'balance' ? 'ck.p.balance' : 'tc.fmtP.' + k) })), presetAct: 'ckPreset', presetOn, note: H('ck.formatNote') });
  // 3. how many problems at most
  const per = FORMAT_KEYS.reduce((a, k) => a + d.f[k], 0);
  const s3 = `<div class="seg ck-max">${CHECK_MAXES.map(m => `<button type="button" class="seg-b ${d.max === m ? 'on' : ''}" data-ck="max" data-v="${m}" aria-pressed="${d.max === m}">${m ? H('ck.upTo', { n: m }) : H('ck.countAll')}</button>`).join('')}</div>
    <p class="ck-calc">${d.lessons.length ? H(cnt.all > cnt.n ? 'ck.calcSome' : 'ck.calcAll', { l: d.lessons.length, per, all: cnt.all, n: cnt.n }) : `<span class="muted">${H('ck.pickLesson')}</span>`}</p>`;
  const s4 = !teacher ? '' : `<div class="seg">${[[true, 'ck.sameYes'], [false, 'ck.sameNo']].map(([v, k]) => `<button type="button" class="seg-b ${d.same === v ? 'on' : ''}" data-ck="same" data-v="${v}" aria-pressed="${d.same === v}">${H(k)}</button>`).join('')}</div>
    <p class="muted small">${H(d.same ? 'ck.sameNoteR' : 'ck.diffNote')}</p>`;
  // the side: the numbers, then start / send / the link, then the problems
  const secEach = per ? FORMAT_KEYS.reduce((a, k) => a + d.f[k] * FMT_SEC[k], 0) / per : 60, mins = n ? Math.max(1, Math.round(n * secEach / 60)) : 0;
  const nums = `<div class="qs-nums"><div><b>${n}</b><small>${H('tc.qs.problems')}</small></div><div><b>${d.lessons.length}</b><small>${H('ck.lessonsCol')}</small></div><div><b>${n ? H('ck.min', { n: mins }) : '—'}</b><small>${H('ck.aim')}</small></div></div>`;
  const act = !teacher ? `<button type="button" class="btn btn-primary btn-lg qs-start" data-ck="start" ${n ? '' : 'disabled'}>${H('ck.start')}</button>`
    : sendBar ? sendBar(!!n) : linkHTML();
  const side = `<aside class="card qs-side ck-side">${nums}${act}${!n ? `<p class="muted small">${H('ck.pickLesson')}</p>` : ''}${teacher ? previewHTML() : `<p class="muted small">${H('ck.introBody')}</p>`}</aside>`;
  return `<div class="qs-wrap"><div class="qs-main">
      ${step(1, H('ck.lessons'), s1)}
      ${step(2, H('ck.format'), s2)}
      ${step(3, H('ck.count'), s3)}
      ${teacher ? step(4, H('ck.who'), s4) : ''}
    </div>${side}</div>`;
}

/* ---------- teacher: the link, and the problems with their answers ---------- */
export function checkLink(cfg) {
  const base = location.origin + location.pathname.replace(/teacher\/(index\.html)?$/, '');
  return `${base}#/check/${encodeCheck(cfg)}`;
}
function linkHTML() {
  const d = D();
  if (!d.lessons.length) return '';
  const cfg = cfgOf(d), link = checkLink(cfg);
  return `<div class="ck-link"><b class="small">${H('ck.link')}</b>
      <div class="inline-form"><input class="mono" readonly value="${esc(link)}" aria-label="${esc(T('ck.link'))}" data-ck-sel><button type="button" class="btn btn-primary btn-sm" data-ck="copy">${H('ck.copy')}</button></div>
      <div class="row-btns left"><a class="btn btn-ghost btn-sm" href="${esc(link)}" target="_blank" rel="noopener">${H('ck.open')}</a><span class="muted small">${H('ck.code')}: <b class="mono">${esc(encodeCheck(cfg))}</b></span></div></div>`;
}
function previewHTML() {
  const d = D();
  if (!d.lessons.length) return '';
  if (!d.same) return '';
  const cfg = cfgOf(d), items = buildCheck(ctx.engine(), cfg, cfg.seed), L = ctx.lang();
  const short = h => { const x = String(h).replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return esc(x.length > 54 ? x.slice(0, 52) + '…' : x); };
  return `<div class="qs-pv-h"><b>${H('ck.preview')} <small class="muted">(${items.length})</small></b><span class="qs-pv-btns"><button type="button" class="btn btn-ghost btn-xs" data-ck="reseed">${H('ck.newSet')}</button></span></div>
    <div class="qs-pvs">${items.map((p, i) => `<details class="qs-pv"><summary><b>Q${i + 1}</b><span class="tag st-${p.stage}">${esc(stageName(p))}</span><span class="qs-pv-t"><small class="muted">L${LESSON_BY_KEY[p.lesson].no}</small> ${short(problemHTML(p, L))}</span></summary>
      <div class="qs-pv-b"><p class="prob-text">${problemHTML(p, L)}</p><pre class="sql">${highlightSQL(p.sql)}</pre>
      ${altAnswers(ctx.engine(), p).map(a => `<div class="alt"><p class="alt-note">${H('alt.' + a.rule)}</p><pre class="sql">${highlightSQL(a.sql)}</pre></div>`).join('')}</div></details>`).join('')}</div>`;
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
    const b = e.target.closest('[data-ck], [data-act="ckCmp"], [data-act="ckPreset"]');
    if (!b || !ctx || !document.getElementById('ck-setup') || !document.getElementById('ck-setup').contains(b)) return;
    e.preventDefault();
    const a = b.dataset.ck || b.dataset.act, v = b.dataset.v;
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
      } else if (a === 'preset' || a === 'ckPreset') d.f = Object.assign({}, CHECK_PRESETS[v]);
      else if (a === 'step' || a === 'ckCmp') { const k = b.dataset.k || b.dataset.r; d.f[k] = Math.max(0, Math.min(FORMAT_MAX, d.f[k] + +b.dataset.d)); if (FORMAT_KEYS.every(x => !d.f[x])) d.f[k] = 1; }
      else if (a === 'max') d.max = +v;
      else if (a === 'same') d.same = v === 'true';
      else if (a === 'reseed') d.seed = randomCode(4);
      // keep the lessons in course order
      const order = checkLessons().map(l => l.key);
      d.lessons = order.filter(k => d.lessons.includes(k));
    });
  });
  document.addEventListener('lpchange', e => { if (e.detail.id === 'ck' && ctx) change(d => { d.lessons = e.detail.keys; }); });
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('[data-ck-sel]')) e.target.select(); });
}
