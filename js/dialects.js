/* The SQL dialect page (#/dialects): how six databases write the same thing.
 * The table is in dialects-data.js (code is the same in every language); titles, notes and the
 * short words in the cells are i18n keys: dl.<id>.t, dl.<id>.n, dl.w.*, dl.c.<category>.
 * Searching and showing / hiding databases work on the page itself (no redraw). */
import { DL_DBS, DL_CATS, DL_ITEMS } from './dialects-data.js';
import { t, th, esc } from './i18n.js';
import { highlightSQL } from './ui.js';

export const DL_NAME = { my: 'MySQL', pg: 'PostgreSQL', lite: 'SQLite', ms: 'SQL Server', ora: 'Oracle', acc: 'Access' };
const DBS_KEY = 'sqlp.dlDbs';
function shownDbs() {
  try { const v = JSON.parse(localStorage.getItem(DBS_KEY) || 'null'); if (Array.isArray(v) && v.some(k => DL_DBS.includes(k))) return v.filter(k => DL_DBS.includes(k)); } catch (e) { /* private window */ }
  return DL_DBS.slice();
}
const has = (L, k) => t(k, L) !== k;

function cellHTML(db, c, L) {
  const o = typeof c === 'string' ? { c } : c;
  const tags = `${o.x ? `<span class="dl-tag no">${th('dl.no', L)}</span>` : ''}${o.v ? `<span class="dl-tag ver">${esc(o.v)}</span>` : ''}`;
  const word = o.w ? `<p class="dl-word">${th('dl.w.' + o.w, L)}</p>` : '';
  const code = o.c ? `${o.x ? `<small class="dl-alt">${th('dl.alt', L)}</small>` : ''}<pre class="dl-code sql">${highlightSQL(o.c)}</pre>` : '';
  return `<div class="dl-cell db-${db}${o.x ? ' none' : ''}"><div class="dl-cell-h"><b>${DL_NAME[db]}</b>${db === 'lite' ? `<span class="dl-tag app">${th('dl.this', L)}</span>` : ''}${tags}</div>${word}${code}</div>`;
}
function itemHTML(it, L) {
  const nk = `dl.${it.id}.n`, note = has(L, nk) ? `<p class="dl-note">${th(nk, L)}</p>` : '';
  const words = DL_DBS.map(db => { const c = it.c[db]; return typeof c === 'string' ? c : [c.c || '', c.w ? t('dl.w.' + c.w, L) : ''].join(' '); }).join(' ');
  const q = [t(`dl.${it.id}.t`, L), has(L, nk) ? t(nk, L) : '', t('dl.c.' + it.cat, L), words].join(' ').toLowerCase();
  return `<article class="dl-it" id="dl-${it.id}" data-q="${esc(q)}"><h3>${th(`dl.${it.id}.t`, L)}</h3>${note}
    <div class="dl-grid">${DL_DBS.map(db => cellHTML(db, it.c[db], L)).join('')}</div></article>`;
}

export function dialectsHTML(L) {
  const on = new Set(shownDbs());
  const hide = DL_DBS.filter(k => !on.has(k)).map(k => 'hide-' + k).join(' ');
  const cats = DL_CATS.map(c => ({ c, items: DL_ITEMS.filter(it => it.cat === c) })).filter(x => x.items.length);
  return `<div class="dl-page ${hide}" data-dl>
    <header class="page-head"><h1>${th('dl.title', L)}</h1><p class="muted">${th('dl.lead', L)}</p></header>
    <section class="card dl-tools">
      <input class="dl-search" type="search" data-dl-q placeholder="${esc(t('dl.search', L))}" aria-label="${esc(t('dl.search', L))}" autocomplete="off">
      <div class="dl-dbs" role="group" aria-label="${esc(t('dl.show', L))}"><span class="muted small">${th('dl.show', L)}</span>
        ${DL_DBS.map(k => `<label class="dl-db db-${k}"><input type="checkbox" data-dl-db="${k}" ${on.has(k) ? 'checked' : ''}><span>${DL_NAME[k]}</span></label>`).join('')}</div>
      <nav class="dl-cats" aria-label="${esc(t('dl.all', L))}">${cats.map(x => `<button type="button" class="chip" data-dl-cat="${x.c}">${th('dl.c.' + x.c, L)} <small>${x.items.length}</small></button>`).join('')}</nav>
      <p class="muted small dl-legend">${th('dl.legend', L)}<br>${th('dl.versions', L)}</p>
      <p class="small dl-count" data-dl-count aria-live="polite">${th('dl.count', L, { n: DL_ITEMS.length })}</p>
    </section>
    ${cats.map(x => `<section class="dl-cat" id="dlc-${x.c}" data-dl-sec><h2>${th('dl.c.' + x.c, L)}</h2>${x.items.map(it => itemHTML(it, L)).join('')}</section>`).join('')}
    <p class="muted dl-empty" data-dl-empty hidden>${th('dl.none', L)}</p>
  </div>`;
}

/* the page's own controls */
function filter(root) {
  const q = (root.querySelector('[data-dl-q]').value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  let n = 0;
  root.querySelectorAll('[data-dl-sec]').forEach(sec => {
    let any = false;
    sec.querySelectorAll('.dl-it').forEach(it => { const ok = q.every(w => it.dataset.q.includes(w)); it.hidden = !ok; if (ok) { any = true; n++; } });
    sec.hidden = !any;
  });
  root.querySelector('[data-dl-empty]').hidden = n > 0;
  const c = root.querySelector('[data-dl-count]');
  c.textContent = c.textContent.replace(/\d+/, String(n));
}
if (typeof document !== 'undefined') {
  document.addEventListener('input', e => { const x = e.target.closest && e.target.closest('[data-dl-q]'); if (x) filter(x.closest('[data-dl]')); });
  document.addEventListener('change', e => {
    const x = e.target.closest && e.target.closest('[data-dl-db]'); if (!x) return;
    const root = x.closest('[data-dl]'), boxes = [...root.querySelectorAll('[data-dl-db]')];
    if (!boxes.some(b => b.checked)) { x.checked = true; return; }   // at least one
    boxes.forEach(b => root.classList.toggle('hide-' + b.dataset.dlDb, !b.checked));
    try { localStorage.setItem(DBS_KEY, JSON.stringify(boxes.filter(b => b.checked).map(b => b.dataset.dlDb))); } catch (er) { /* private window */ }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-dl-cat]'); if (!b) return;
    const sec = document.getElementById('dlc-' + b.dataset.dlCat); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
