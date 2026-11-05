/* =========================================================
 * tables-ui.js — every table the problems use, in one place.
 *  - tablesPageHTML(lang): the list page (student #/tables, teacher #/tables)
 *  - openProjector(names, lang, start): a full-screen view for a screen /
 *    projector: big letters, ← → between tables, A− A+, "all side by side".
 * The page needs no app state; clicks are handled here (data-tb-*).
 * ========================================================= */
import { th, t, esc, rubyHTML, raw } from './i18n.js';
import { gridHTML } from './ui.js';
import { ALL_TABLES, tableGroups } from './datasets.js';
export { tableGroups, listedTables } from './datasets.js';

const dataOf = n => ({ columns: ALL_TABLES[n].columns.map(c => c[0]), values: ALL_TABLES[n].rows });

function cardHTML(n, label, lang, set) {
  const d = ALL_TABLES[n];
  const words = [n, ...d.columns.map(c => c[0]), label ? t(label, lang) : ''].join(' ').toLowerCase();
  return `<div class="tb-card" data-tb-words="${esc(words)}">
    <div class="tb-head">
      <button class="tb-name" data-tb-open="${esc(set.join(','))}" data-tb-at="${set.indexOf(n)}" title="${esc(t('tb.project', lang))}"><span class="mono">${esc(n)}</span></button>
      <span class="muted small">${th('prob.rows', lang, { n: d.rows.length })}</span>
    </div>
    <div class="tb-cols">${d.columns.map(([c, ty]) => `<span class="col-chip static">${esc(c)}<small>${ty === 'INTEGER' ? '123' : 'abc'}</small></span>`).join('')}</div>
    <details class="tb-peek"><summary>${th('tb.peek', lang)}</summary><div class="data-box">${gridHTML(dataOf(n))}</div></details>
  </div>`;
}

export function tablesPageHTML(lang) {
  const groups = tableGroups();
  return `<main class="wrap tb-page">
    <section class="card tb-top">
      <div><h1>${th('tb.title', lang)}</h1><p class="muted">${th('tb.sub', lang)}</p></div>
      <input type="search" class="tb-search" data-tb-search placeholder="${esc(t('tb.search', lang))}" aria-label="${esc(t('tb.search', lang))}">
    </section>
    <nav class="tb-jump">${groups.map(g => `<a href="#" data-tb-jump="tb-g-${g.key}">${th('tb.g.' + g.key, lang)}</a>`).join('')}</nav>
    ${groups.map(g => `<section class="tb-group" id="tb-g-${g.key}">
      <h2>${th('tb.g.' + g.key, lang)}</h2>
      <div class="tb-sets${g.sets.every(s => s.tables.length > 1) ? ' pairs' : ''}">${g.sets.map(s => `<div class="tb-set${s.tables.length > 1 ? ' multi' : ''}">
        <div class="tb-set-head"><b>${s.label ? rubyHTML(raw(s.label, lang)) : th('tb.example', lang)}</b>
          <button class="btn btn-ghost btn-xs" data-tb-open="${esc(s.tables.join(','))}" data-tb-at="0">${PROJ}${th('tb.project', lang)}</button></div>
        <div class="tb-cards">${s.tables.map(n => cardHTML(n, s.label, lang, s.tables)).join('')}</div>
      </div>`).join('')}</div>
    </section>`).join('')}
    <p class="muted small tb-empty" hidden>${th('tb.noMatch', lang)}</p>
  </main>`;
}

const PROJ = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';

/* ---------- projector ---------- */
let P = null;   // { names, i, all, lang, el }
const FS_KEY = 'sqlp-tb-font';
function fontSize() { try { return Math.min(44, Math.max(14, parseInt(localStorage.getItem(FS_KEY), 10) || 24)); } catch (e) { return 24; } }
function setFont(n) { try { localStorage.setItem(FS_KEY, String(n)); } catch (e) { /* private window */ } }

function oneHTML(n) {
  const d = ALL_TABLES[n];
  return `<div class="pj-tbl"><h3><span class="mono">${esc(n)}</span><small>${th('prob.rows', P.lang, { n: d.rows.length })}</small></h3>${gridHTML(dataOf(n), { rowNums: d.rows.length > 15 })}</div>`;
}
function paintProjector() {
  const { names, i, all, lang } = P;
  const many = names.length > 1;
  P.el.innerHTML = `<div class="pj-bar">
      <div class="pj-title">${all || !many ? `<b>${esc(names.join(' · '))}</b>` : `<b class="mono">${esc(names[i])}</b><span class="pj-count">${i + 1} / ${names.length}</span>`}</div>
      <div class="pj-btns">
        ${many ? `<button class="btn btn-ghost btn-sm" data-pj="prev" ${all ? 'disabled' : ''} aria-label="${esc(t('tb.prev', lang))}">←</button>
        <button class="btn btn-ghost btn-sm" data-pj="next" ${all ? 'disabled' : ''} aria-label="${esc(t('tb.next', lang))}">→</button>
        <button class="btn btn-ghost btn-sm" data-pj="all" aria-pressed="${all}">${th(all ? 'tb.oneByOne' : 'tb.sideBySide', lang)}</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-pj="smaller" aria-label="${esc(t('tb.smaller', lang))}">A−</button>
        <button class="btn btn-ghost btn-sm" data-pj="bigger" aria-label="${esc(t('tb.bigger', lang))}">A+</button>
        <button class="btn btn-ghost btn-sm" data-pj="full">${th('tb.fullscreen', lang)}</button>
        <button class="btn btn-primary btn-sm" data-pj="close">${th('tb.close', lang)} ✕</button>
      </div></div>
    <div class="pj-body${all ? ' all' : ''}" style="--pj-fs:${fontSize()}px">${all ? names.map(oneHTML).join('') : oneHTML(names[i])}</div>
    ${many && !all ? `<div class="pj-dots">${names.map((n, k) => `<button class="${k === i ? 'on' : ''}" data-pj="go" data-k="${k}">${esc(n)}</button>`).join('')}</div>` : ''}`;
}
export function openProjector(names, lang, start) {
  names = (names || []).filter(n => ALL_TABLES[n]);
  if (!names.length) return;
  closeProjector();
  const el = document.createElement('div');
  el.className = 'projector'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('tb.title', lang));
  document.body.appendChild(el); document.body.classList.add('pj-open');
  // two or three small tables (a JOIN pair, a test's data) read best side by side
  const small = names.length <= 3 && names.every(n => ALL_TABLES[n].rows.length <= 15);
  P = { names, i: Math.min(names.length - 1, Math.max(0, start || 0)), all: names.length > 1 && small && !(start > 0), lang, el };
  paintProjector();
  el.querySelector('[data-pj="close"]').focus();
}
export function closeProjector() {
  if (!P) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  P.el.remove(); P = null; document.body.classList.remove('pj-open');
}
function pjAct(a, k) {
  if (!P) return;
  const n = P.names.length;
  if (a === 'close') return closeProjector();
  if (a === 'prev' && !P.all) P.i = (P.i - 1 + n) % n;
  else if (a === 'next' && !P.all) P.i = (P.i + 1) % n;
  else if (a === 'go') { P.i = k; P.all = false; }
  else if (a === 'all') P.all = !P.all;
  else if (a === 'bigger' || a === 'smaller') {
    setFont(Math.min(44, Math.max(14, fontSize() + (a === 'bigger' ? 4 : -4))));
    const b = P.el.querySelector('.pj-body'); if (b) b.style.setProperty('--pj-fs', fontSize() + 'px');
    return;
  } else if (a === 'full') {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (P.el.requestFullscreen) P.el.requestFullscreen().catch(() => {});
    return;
  } else return;
  paintProjector();
}

let installed = false;
/** one set of listeners for the page and the projector (safe to call often) */
export function installTables() {
  if (installed) return; installed = true;
  document.addEventListener('click', e => {
    const pj = e.target.closest('[data-pj]');
    if (pj && P && P.el.contains(pj)) { e.preventDefault(); pjAct(pj.dataset.pj, +pj.dataset.k || 0); return; }
    const op = e.target.closest('[data-tb-open]');
    if (op) { e.preventDefault(); openProjector(op.dataset.tbOpen.split(','), tbLang(), +op.dataset.tbAt || 0); return; }
    const j = e.target.closest('[data-tb-jump]');
    if (j) { e.preventDefault(); const g = document.getElementById(j.dataset.tbJump); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  document.addEventListener('input', e => {
    if (!e.target.matches('[data-tb-search]')) return;
    const q = e.target.value.trim().toLowerCase();
    let any = false;
    document.querySelectorAll('.tb-card').forEach(c => { const hit = !q || c.dataset.tbWords.includes(q); c.hidden = !hit; any = any || hit; });
    document.querySelectorAll('.tb-set').forEach(s => { s.hidden = ![...s.querySelectorAll('.tb-card')].some(c => !c.hidden); });
    document.querySelectorAll('.tb-group').forEach(g => { g.hidden = ![...g.querySelectorAll('.tb-set')].some(s => !s.hidden); });
    const em = document.querySelector('.tb-empty'); if (em) em.hidden = any;
  });
  // capture: the projector owns the keyboard while it is open
  window.addEventListener('keydown', e => {
    if (!P) return;
    const map = { ArrowLeft: 'prev', ArrowRight: 'next', Escape: 'close', '+': 'bigger', '=': 'bigger', '-': 'smaller' };
    const a = map[e.key];
    if (e.key === 'Escape' && document.fullscreenElement) return;   // the browser leaves full screen first
    if (a) { e.preventDefault(); e.stopPropagation(); pjAct(a); }
    else if (e.key === ' ' || e.key === 'a' || e.key === 'A') e.stopPropagation();
  }, true);
}
let langGetter = () => 'en';
/** the app tells this module its current language */
export function setTablesLang(fn) { langGetter = fn; }
function tbLang() { return langGetter(); }
