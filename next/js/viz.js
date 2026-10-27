/* =========================================================
 * viz.js — teaching visualisations
 *   orderStripHTML : the order you WRITE clauses vs the order the database RUNS them
 *   joinHTML       : two tables with lines between matching rows (INNER vs LEFT)
 * ========================================================= */
import { splitClauses, clauseKind } from './engine.js';
import { t, th, esc } from './i18n.js';
import { fmtCell } from './ui.js';

const LABEL = { from: 'FROM', join_inner: 'INNER JOIN', join_left: 'LEFT JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING', select: 'SELECT', select_distinct: 'SELECT DISTINCT', order: 'ORDER BY', limit: 'LIMIT', offset: 'LIMIT … OFFSET' };
const RUN = ['from', 'join_inner', 'join_left', 'where', 'group', 'having', 'select', 'select_distinct', 'order', 'limit', 'offset'];
export const STEP_TO_KIND = { 'step.from': 'from', 'step.join_inner': 'join_inner', 'step.join_left': 'join_left', 'step.where': 'where', 'step.group': 'group', 'step.having': 'having', 'step.agg': 'select', 'step.select': 'select', 'step.distinct': 'select_distinct', 'step.order': 'order', 'step.limit': 'limit', 'step.offset': 'offset' };

/** @param current  the clause kind being explained now (or null) */
export function orderStripHTML(sql, current, lang) {
  const kinds = splitClauses(sql).map(clauseKind);
  const run = RUN.filter(k => kinds.includes(k));
  const chip = k => `<span class="os-chip ${k === current || (current === 'select' && k === 'select_distinct') ? 'on' : ''}">${LABEL[k]}</span>`;
  const row = (label, arr) => `<div class="os-row"><span class="os-lab">${label}</span><div class="os-chips">${arr.map(chip).join('<span class="os-arrow">→</span>')}</div></div>`;
  return `<div class="order-strip">${row(th('viz.written', lang), kinds)}${row(th('viz.run', lang), run)}</div>`;
}

/**
 * Two tables side by side; lines connect rows whose keys match.
 * p: join params {L, R, id, key, name, text}; type: 'inner' | 'left'
 */
export function joinHTML(engine, p, type, lang) {
  const left = engine.exec(`SELECT ${p.id}, ${p.name} FROM ${p.L};`);
  const right = engine.exec(`SELECT ${p.key}, ${p.text} FROM ${p.R};`);
  const rkeys = new Set(right.values.map(r => r[0]));
  const lkeys = new Set(left.values.map(r => r[0]));
  const tbl = (res, name, side, keyset) => `<table class="grid jv-t" data-side="${side}"><caption>${esc(name)}</caption><thead><tr>${res.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${res.values.map(r => {
    const match = keyset.has(r[0]);
    const cls = match ? 'jv-match' : side === 'L' && type === 'left' ? 'jv-keep' : 'jv-drop';
    return `<tr class="${cls}" data-k="${esc(r[0])}">${r.map(v => `<td>${fmtCell(v)}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table>`;
  return `<div class="jv" data-type="${type}">
    <div class="jv-tables">${tbl(left, p.L, 'L', rkeys)}<svg class="jv-lines" aria-hidden="true"></svg>${tbl(right, p.R, 'R', lkeys)}</div>
    <div class="jv-legend"><span class="lg match">${th('viz.match', lang)}</span>${type === 'left' ? `<span class="lg keep">${th('viz.keepNull', lang)}</span>` : ''}<span class="lg drop">${th('viz.drop', lang)}</span></div>
  </div>`;
}
/** Call after the HTML is in the page (and on resize) to draw the connecting lines. */
export function drawJoinLines(root) {
  (root || document).querySelectorAll('.jv').forEach(jv => {
    const svgEl = jv.querySelector('.jv-lines');
    const wrap = jv.querySelector('.jv-tables');
    const box = wrap.getBoundingClientRect();
    const sx = wrap.scrollLeft;
    const L = jv.querySelector('[data-side="L"]'), R = jv.querySelector('[data-side="R"]');
    if (!svgEl || !L || !R) return;
    svgEl.style.width = box.width + 'px'; svgEl.style.height = box.height + 'px';
    svgEl.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    let d = '';
    L.querySelectorAll('tbody tr.jv-match').forEach(lr => {
      R.querySelectorAll(`tbody tr[data-k="${CSS.escape(lr.dataset.k)}"]`).forEach(rr => {
        const a = lr.getBoundingClientRect(), b = rr.getBoundingClientRect();
        const x1 = a.right - box.left + sx, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left + sx, y2 = b.top + b.height / 2 - box.top;
        const mx = (x1 + x2) / 2;
        d += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/><circle cx="${x1}" cy="${y1}" r="3.5"/><circle cx="${x2}" cy="${y2}" r="3.5"/>`;
      });
    });
    svgEl.innerHTML = d;
  });
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => drawJoinLines());
