/* =========================================================
 * explain-tc.js — 説明モード on the teacher page (the class's 説明 tab).
 * The teacher picks lectures across lessons (SQL and Python) into 今日の流れ, shows them
 * big (full screen on a projector), and with 同期 on the students' screens follow.
 * The flow and the saved plans stay in this browser (localStorage).
 * ========================================================= */
import { t, th, esc } from './i18n.js';
import { lectureSteps, lectureStepHTML, paintStep } from './lecture-ui.js';
import { lectureOf } from './lectures.js';
import { exCatalog, exLesson, exTitleHTML, exMatches } from './explain.js';
import * as backend from './backend.js';

/** from teacher.js: { S, toast, chName } */
let C = null;
export function installExplain(ctx) { C = ctx; }
const L = () => C.S.settings.lang;
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;

/* ---------- the flow (今日の流れ) of a class, and saved plans ---------- */
const KEY = id => 'sqln.tcExplain.' + id, PLANS = 'sqln.tcPlans';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full */ } };
let X = null;   // { id, queue: [keys], qi, i, sync, q (search) }
function state() {
  const id = C.S.klass.id;
  if (!X || X.id !== id) X = Object.assign({ id, queue: [], qi: 0, i: 0, sync: false, q: '', pres: null, seen: [] }, load(KEY(id), {}), { id, sync: false, pres: null, seen: [] });
  X.queue = X.queue.filter(k => exLesson(k) && lectureOf(k));
  X.qi = Math.max(0, Math.min(X.qi, X.queue.length - 1));
  return X;
}
const save = () => keep(KEY(X.id), { queue: X.queue, qi: X.qi, i: X.i });
const cur = () => (X.queue.length ? X.queue[X.qi] : null);

/* ---------- sending the state to the class (同期) ---------- */
let sendT = null;
function send(now) {
  clearTimeout(sendT);
  const go = () => {
    const c = C.S.klass; if (!c) return;
    const explain = X.sync && cur() ? { on: true, key: cur(), i: X.i, at: Date.now() } : { on: false, at: Date.now() };
    backend.updateClass(c.id, { tasks: Object.assign({}, c.tasks || {}, { explain }) }).then(k => { if (C.S.klass && k && k.id === c.id) C.S.klass.tasks = k.tasks; }).catch(e => { console.error(e); C.toast(T('class.netError')); });
  };
  if (now) go(); else sendT = setTimeout(go, 250);
}
function presence(on) {
  if (!on) { if (X.pres) { X.pres.then(p => p && p.leave()); X.pres = null; } X.seen = []; return; }
  if (X.pres) return;
  X.pres = backend.explainPresence(C.S.klass.id, 'teacher', list => { X.seen = list; const el = document.getElementById('ex-who'); if (el) el.innerHTML = whoHTML(); }).catch(() => null);
}
const whoHTML = () => { const f = X.seen.filter(x => x.f).length; return X.sync ? H('ex.tc.who', { f, o: X.seen.length - f }) : ''; };
/** leaving the tab or the page: the students stop following */
export function explainStop() { if (X && X.sync) { X.sync = false; send(true); presence(false); } }
window.addEventListener('pagehide', explainStop);

/* ---------- the page ---------- */
export function explainTcHTML() {
  const x = state(), key = cur(), steps = key ? lectureSteps(key) : [], st = steps[Math.min(x.i, steps.length - 1)];
  const list = exCatalog().filter(l => exMatches(l.key, x.q, L()));
  const plans = load(PLANS, []);
  return `<section class="card ex-tc">
    <div class="ex-tc-top"><h2>📽 ${H('ex.tc.title')}</h2>
      <label class="ex-sync"><input type="checkbox" data-ex="sync" ${x.sync ? 'checked' : ''} ${key ? '' : 'disabled'}> ${H('ex.tc.sync')}</label>
      <span class="muted small" id="ex-who">${whoHTML()}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-act="exFull" ${key ? '' : 'disabled'}>⛶ ${H('ex.tc.full')}</button></div>
    <p class="muted small">${H('ex.tc.sub')}</p>
    <div class="ex-tc-grid">
      <aside class="ex-side">
        <h3>${H('ex.tc.flow')}</h3>
        ${x.queue.length ? `<ol class="ex-flow">${x.queue.map((k, n) => `<li class="${n === x.qi ? 'on' : ''}"><button type="button" class="linkbtn" data-act="exPick" data-n="${n}">${exTitleHTML(k, L())}</button>
          <span class="ex-flow-btn"><button type="button" class="icon-btn" data-act="exUp" data-n="${n}" ${n ? '' : 'disabled'} aria-label="up">↑</button><button type="button" class="icon-btn" data-act="exDel" data-n="${n}" aria-label="remove">✕</button></span></li>`).join('')}</ol>`
          : `<p class="muted small">${H('ex.tc.flowNone')}</p>`}
        <div class="ex-plans">${x.queue.length ? `<button type="button" class="btn btn-ghost btn-sm" data-act="exSave">💾 ${H('ex.tc.save')}</button><button type="button" class="btn btn-ghost btn-sm" data-act="exClear">${H('ex.tc.clear')}</button>` : ''}
          ${plans.length ? `<select data-ex="plan"><option value="">📂 ${esc(T('ex.tc.load'))}</option>${plans.map((p, n) => `<option value="${n}">${esc(p.name)} (${p.queue.length})</option>`).join('')}</select>` : ''}</div>
        <h3>${H('ex.tc.add')}</h3>
        <input type="search" class="ex-q" data-ex="q" value="${esc(x.q)}" placeholder="${esc(T('ex.tc.search'))}">
        <ul class="ex-cat">${list.map(l => `<li><button type="button" class="linkbtn" data-act="exAdd" data-k="${esc(l.key)}">＋ ${exTitleHTML(l.key, L())}</button></li>`).join('') || `<li class="muted small">${H('ex.tc.noHit')}</li>`}</ul>
      </aside>
      <div class="ex-stage" id="ex-stage">${key && st ? `
        <div class="ex-stage-top"><b>${exTitleHTML(key, L())}</b><span class="muted small" id="ex-pos">${H('ex.tc.pos', { a: x.qi + 1, b: x.queue.length })} · ${x.i + 1} / ${steps.length}</span></div>
        <div class="lec-dots">${lectureOf(key).slides.map((s, n) => `<button class="${n === st.slide ? 'on' : n < st.slide ? 'done' : ''}" data-act="exSlide" data-s="${n}" aria-label="${n + 1}"></button>`).join('')}</div>
        <div id="ex-box" class="lec-box">${lectureStepHTML(exLesson(key), st, C.S.engine, L())}</div>
        <div class="lec-ctl"><button type="button" class="btn btn-ghost" data-act="exPrev">← ${H('lec.prev')}</button>
          <span class="muted small">${H('ex.tc.keys')}</span>
          <button type="button" class="btn btn-primary" data-act="exNext">${H('lec.next')} →</button></div>` : `<div class="empty"><div class="empty-icon">📽</div><p class="muted">${H('ex.tc.empty')}</p></div>`}
      </div>
    </div></section>`;
}
const redraw = () => { const el = document.querySelector('.ex-tc'); if (el) el.outerHTML = explainTcHTML(); };

/** to step i of the current lecture; past its end → the next lecture in the flow */
function move(i) {
  const key = cur(); if (!key) return;
  const steps = lectureSteps(key);
  if (i >= steps.length) { if (X.qi + 1 < X.queue.length) { X.qi++; X.i = 0; save(); send(); redraw(); } return; }
  if (i < 0) { if (X.qi > 0) { X.qi--; X.i = lectureSteps(cur()).length - 1; save(); send(); redraw(); } return; }
  const from = steps[X.i], st = steps[i], f = lectureOf(key).slides[st.slide].frames, same = from && from.slide === st.slide && !!f;
  X.i = i; save(); send();
  const box = document.getElementById('ex-box');
  if (!box) { redraw(); return; }
  paintStep(box, lectureStepHTML(exLesson(key), st, C.S.engine, L()), same, same && f[st.frame].merge ? f[st.frame].merge(C.S.engine) : null);
  document.querySelectorAll('.ex-stage .lec-dots button').forEach((b, n) => { b.className = n === st.slide ? 'on' : n < st.slide ? 'done' : ''; });
  const pos = document.getElementById('ex-pos'); if (pos) pos.innerHTML = `${H('ex.tc.pos', { a: X.qi + 1, b: X.queue.length })} · ${i + 1} / ${steps.length}`;
}

export const explainActions = {
  exAdd(el) { state(); X.queue.push(el.dataset.k); if (X.queue.length === 1) { X.qi = 0; X.i = 0; } save(); redraw(); },
  exPick(el) { X.qi = +el.dataset.n; X.i = 0; save(); send(); redraw(); },
  exUp(el) { const n = +el.dataset.n; if (!n) return; [X.queue[n - 1], X.queue[n]] = [X.queue[n], X.queue[n - 1]]; if (X.qi === n) X.qi--; else if (X.qi === n - 1) X.qi++; save(); redraw(); },
  exDel(el) { const n = +el.dataset.n; X.queue.splice(n, 1); if (X.qi > n || X.qi >= X.queue.length) { X.qi = Math.max(0, X.qi - 1); X.i = 0; } if (!X.queue.length && X.sync) { X.sync = false; send(true); presence(false); } save(); redraw(); },
  exClear() { if (!confirm(T('ex.tc.clearConfirm'))) return; X.queue = []; X.qi = 0; X.i = 0; if (X.sync) { X.sync = false; send(true); presence(false); } save(); redraw(); },
  exSave() { const name = prompt(T('ex.tc.saveName'), new Date().toLocaleDateString()); if (!name) return; const plans = load(PLANS, []); plans.unshift({ name: name.slice(0, 60), queue: X.queue.slice() }); keep(PLANS, plans.slice(0, 50)); C.toast(T('ex.tc.saved')); redraw(); },
  exSlide(el) { const key = cur(), s = +el.dataset.s, n = lectureSteps(key).findIndex(x => x.slide === s); if (n >= 0) move(n); },
  exPrev() { move(X.i - 1); },
  exNext() { move(X.i + 1); },
  exFull() { const el = document.getElementById('ex-stage'); if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); },
};
/** inputs of the tab: the sync switch, the search box, loading a plan */
export function explainInput(el) {
  const k = el.dataset.ex; if (!k) return false;
  state();
  if (k === 'sync') { X.sync = el.checked && !!cur(); send(true); presence(X.sync); const w = document.getElementById('ex-who'); if (w) w.innerHTML = whoHTML(); C.toast(T(X.sync ? 'ex.tc.syncOn' : 'ex.tc.syncOff')); }
  else if (k === 'q') { X.q = el.value; const box = document.querySelector('.ex-cat'); if (box) { const list = exCatalog().filter(l => exMatches(l.key, X.q, L())); box.innerHTML = list.map(l => `<li><button type="button" class="linkbtn" data-act="exAdd" data-k="${esc(l.key)}">＋ ${exTitleHTML(l.key, L())}</button></li>`).join('') || `<li class="muted small">${H('ex.tc.noHit')}</li>`; } }
  else if (k === 'plan' && el.value !== '') { const p = load(PLANS, [])[+el.value]; if (p && confirm(T('ex.tc.loadConfirm', { n: p.name }))) { X.queue = p.queue.filter(x => exLesson(x)); X.qi = 0; X.i = 0; save(); send(); } redraw(); }
  return true;
}
/** ← → space on the tab */
export function explainKey(e) {
  if (!X || !cur() || (e.target && e.target.matches && e.target.matches('input:not([type=checkbox]), textarea, select'))) return false;
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); move(X.i + 1); return true; }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); move(X.i - 1); return true; }
  return false;
}
