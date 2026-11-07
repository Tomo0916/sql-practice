/* =========================================================
 * analysis-ui.js — parts of the screen for the data-analysis lessons:
 * the "statistics basics" card with a figure drawn from the problem's data,
 * a chart of the result, CSV download and the links to the Excel / Python guides.
 * ========================================================= */
import { t, th, esc, rubyHTML } from './i18n.js';
import { ALL_TABLES } from './datasets.js';
import { STAT } from './analysis-content.js';
import { barChart, histChart, boxChart, normalChart, fillChart, lineChart, scatterChart } from './charts.js';

export const isAnalysis = lesson => lesson && lesson.themes === 'analysis';
/** language for course texts: English, Japanese, Easy Japanese; others read English */
export const contentLang = lang => (['ja', 'easy', 'en'].includes(lang) ? lang : 'en');

/** blocks → HTML (furigana kept, {x} filled with code from vars) */
export function blocksHTML(blocks, vars = {}) {
  const fill = s => rubyHTML(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? `<code>${esc(vars[k])}</code>` : m));
  return blocks.map(([k, x]) => {
    if (k === 'h') return `<h4>${fill(x)}</h4>`;
    if (k === 'p') return `<p>${fill(x)}</p>`;
    if (k === 'f') return `<div class="formula">${fill(x)}</div>`;
    if (k === 'li') return `<ul>${x.map(i => `<li>${fill(i)}</li>`).join('')}</ul>`;
    return '';
  }).join('');
}

function col(name, c) { const tb = ALL_TABLES[name]; const i = tb.columns.findIndex(x => x[0] === c); return tb.rows.map(r => r[i]); }
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function bins(values, step) {
  const m = new Map();
  values.forEach(v => { const b = Math.floor(v / step) * step; m.set(b, (m.get(b) || 0) + 1); });
  return [...m.entries()].map(([start, n]) => ({ start, n })).sort((a, b) => a.start - b.start);
}

/** the figure of the statistics card, drawn from the table of the problem */
function figureHTML(lesson, prob, lang) {
  const tb = ALL_TABLES[prob.p.t], r = tb.roles;
  const T = k => t(k, lang);
  if (lesson.key === 'an_overview') {
    const kind = (c, ty) => (c === r.id ? 'id' : c === r.dt ? 'date' : ty === 'INTEGER' ? 'quant' : 'qual');
    return `<div class="col-kinds">${tb.columns.map(([c, ty]) => `<span class="ck ck-${kind(c, ty)}"><code>${esc(c)}</code><small>${esc(T('an.k.' + kind(c, ty)))}</small></span>`).join('')}</div>`;
  }
  if (lesson.key === 'an_missing') {
    return fillChart(tb.columns.map(([c], i) => ({ name: c, total: tb.rows.length, filled: tb.rows.filter(x => x[i] !== null).length })), { label: T('an.stat') });
  }
  if (lesson.key === 'an_center' && prob.p.w === 'mode') {
    const b = bins(col(prob.p.t, r.v2), 1);
    return barChart(b.map(x => String(x.start)), b.map(x => x.n), { label: r.v2 });
  }
  if (lesson.key === 'an_center' || lesson.key === 'an_hist') {
    const v = col(prob.p.t, r.v).slice().sort((a, b) => a - b);
    // a few huge values would squash the picture: draw up to the 99th percentile and say how many are beyond
    const cut = Math.ceil(v[Math.floor(v.length * 0.99)] / tb.binStep) * tb.binStep, shown = v.filter(x => x < cut), beyond = v.length - shown.length;
    const fig = histChart(bins(shown, tb.binStep), tb.binStep, { label: r.v, marks: [{ x: mean(v), label: `${T('an.mean')} ${Math.round(mean(v) * 10) / 10}`, cls: 'mean' }, { x: v[(v.length - 1) / 2], label: `${T('an.median')} ${v[(v.length - 1) / 2]}`, cls: 'median' }] });
    return fig + (beyond ? `<p class="muted small fig-note">${th('an.beyond', lang, { n: `<b>${beyond}</b>`, x: `<code>${esc(cut)}</code>`, max: `<code>${esc(v[v.length - 1])}</code>` })}</p>` : '');
  }
  if (lesson.key === 'an_spread') {
    const g = col(prob.p.t, r.g), v = col(prob.p.t, r.v);
    const groups = [...new Set(g)].sort().map(label => ({ label, values: v.filter((_, i) => g[i] === label) }));
    return boxChart(groups, { label: r.v });
  }
  if (lesson.key === 'an_cross') {   // rows with and without a value, per group
    const g = col(prob.p.t, r.g), o = col(prob.p.t, r.opt), labels = [...new Set(g)].sort();
    return barChart(labels, [labels.map(l => g.filter((x, i) => x === l && o[i] !== null).length), labels.map(l => g.filter((x, i) => x === l && o[i] === null).length)], { names: [`${r.opt}: ${T('an.with')}`, `${r.opt}: ${T('an.without')}`] });
  }
  if (lesson.key === 'an_trend') {   // monthly totals and the 3-month moving average
    const d = col(prob.p.t, r.dt), v = col(prob.p.t, r.v), m = new Map();
    d.forEach((x, i) => { const k = String(x).slice(0, 7); m.set(k, (m.get(k) || 0) + v[i]); });
    const months = [...m.keys()].sort(), tot = months.map(k => m.get(k));
    const ma = tot.map((_, i) => { const w = tot.slice(Math.max(0, i - 2), i + 1); return Math.round(w.reduce((a, b) => a + b, 0) / w.length * 10) / 10; });
    return lineChart(months, [tot, ma], { names: [`${T('an.total')} ${r.v}`, T('an.ma3')] });
  }
  if (lesson.key === 'an_corr') {
    const x = col(prob.p.t, r.v), y = col(prob.p.t, r.v3);
    return scatterChart(x.map((v, i) => ({ x: v, y: y[i] })), { xLabel: r.v, yLabel: r.v3 });
  }
  if (lesson.key === 'an_compare') {
    const g = col(prob.p.t, r.g), v = col(prob.p.t, r.v);
    return boxChart([...new Set(g)].sort().map(label => ({ label, values: v.filter((_, i) => g[i] === label) })), { label: r.v });
  }
  if (lesson.key === 'an_join' || lesson.key === 'an_clean') {
    const pp = ALL_TABLES[prob.p.t2 || (tb.peopleOf ? prob.p.t : tb.people)] || ALL_TABLES[tb.people];
    if (!pp) return '';
    const q = pp.roles, key = lesson.key === 'an_clean' && prob.p.w !== 'band' ? q.pref : q.g;
    if (lesson.key === 'an_clean' && prob.p.w === 'fill') {   // the empty cells of the main table
      const o = col(prob.p.t, r.opt), vals = [...new Set(o.map(x => (x === null ? 'NULL' : x)))];
      return barChart(vals, vals.map(k => o.filter(x => (x === null ? 'NULL' : x) === k).length), { label: r.opt });
    }
    const c = col(pp.table, key), vals = [...new Set(c)].sort((a, b) => String(a).trim().toLowerCase().localeCompare(String(b).trim().toLowerCase()) || String(a).localeCompare(String(b)));
    if (key === q.pref) {   // the spellings, with the spaces made visible (␣)
      return `<div class="raw-vals">${vals.map(k => `<span class="rv"><code>${esc(String(k).replace(/ /g, '␣'))}</code><b>${c.filter(x => x === k).length}</b></span>`).join('')}</div>`;
    }
    return barChart(vals, vals.map(k => c.filter(x => x === k).length), { label: key });
  }
  if (lesson.key === 'an_zscore') {
    const v = col(prob.p.t, r.v), ids = col(prob.p.t, r.id);
    const m = +prob.p.m, s = +prob.p.s;
    const top = v.map((x, i) => ({ label: `${r.id} ${ids[i]}`, z: Math.round((x - m) / s * 100) / 100 })).sort((a, b) => b.z - a.z).slice(0, 5);
    return normalChart(top, { label: 'z' });
  }
  return '';
}

/** "statistics basics" card */
export function statCardHTML(lesson, prob, lang, open) {
  const c = STAT[lesson.key];
  if (!c) return '';
  const L = contentLang(lang);
  return `<details class="card stat-card" ${open ? 'open' : ''}><summary><span class="stat-ic">Σ</span>${th('an.stat', lang)}</summary>
    <div class="stat-body">${blocksHTML(c[L] || c.en)}</div>
    <div class="stat-fig">${figureHTML(lesson, prob, lang)}</div>
  </details>`;
}

/** chart of a result (from lesson.chart): bars, a histogram or lines; value can be one column or several */
export function resultChartHTML(lesson, prob, res, lang) {
  const svg = resultChartSVG(lesson, prob, res);
  if (!svg) return '';
  const save = lang ? `<button class="btn btn-ghost btn-xs chart-save" data-chart-png="${esc(lesson.key)}" title="${esc(t('an.savePngTip', lang))}">${th('an.savePng', lang)}</button>` : '';
  return `<div class="res-chart">${save}${svg}</div>`;
}
function resultChartSVG(lesson, prob, res) {
  if (!lesson.chart || !res || !res.values || !res.values.length) return '';
  const c = lesson.chart(prob.p);
  if (!c) return '';
  const idx = Array.isArray(c.value) ? c.value : [c.value];
  if (idx.some(i => res.columns[i] === undefined)) return '';
  const labels = res.values.map(r => String(r[c.label]));
  const series = idx.map(i => res.values.map(r => (r[i] === null ? null : Number(r[i]))));
  if (series.some(s => s.some(v => v !== null && !Number.isFinite(v)))) return '';
  const names = idx.length > 1 ? idx.map(i => res.columns[i]) : null;
  if (c.type === 'hist') return histChart(res.values.map(r => ({ start: Number(r[c.label]), n: Number(r[c.value]) })), c.step);
  if (c.type === 'line') return lineChart(labels, idx.length > 1 ? series : series[0], { names });
  if (series.some(s => s.some(v => v === null))) return '';
  return barChart(labels, idx.length > 1 ? series : series[0], { names });
}

/**
 * Save a chart (an <svg class="chart">) as a PNG: the page's CSS is copied
 * onto the elements, so the picture looks the same outside the app.
 */
const KEEP = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'opacity', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline'];
export function chartPNG(svg, filename) {
  const copy = svg.cloneNode(true);
  const src = [svg, ...svg.querySelectorAll('*')], dst = [copy, ...copy.querySelectorAll('*')];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    dst[i].setAttribute('style', KEEP.map(k => `${k}:${cs.getPropertyValue(k)}`).join(';'));
  });
  const vb = svg.viewBox.baseVal, w = vb && vb.width ? vb.width : svg.clientWidth, h = vb && vb.height ? vb.height : svg.clientHeight;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', w); copy.setAttribute('height', h);
  const img = new Image(), k = 3;
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = w * k; cv.height = h * k;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-chart-png]');
    if (!b) return;
    const svg = b.parentElement && b.parentElement.querySelector('svg.chart');
    if (!svg) return;
    e.preventDefault();
    chartPNG(svg, `chart-${b.dataset.chartPng}.png`);
  });
}

/** CSV of a table (UTF-8 with BOM, so Excel shows it correctly) */
export function downloadCSV(name) {
  const tb = ALL_TABLES[name];
  const q = v => (v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const text = '﻿' + [tb.columns.map(c => c[0]).join(','), ...tb.rows.map(r => r.map(q).join(','))].join('\r\n') + '\r\n';
  saveFile(`${name}.csv`, text, 'text/csv');
}
export function saveFile(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** buttons under the problem: the same question in Excel / Python */
export function toolsHTML(prob, lang, setCode, fmtKey) {
  if (prob.kind === 'review' || prob.answer !== undefined) return '';   // a question to read and choose: no Excel / Python steps
  const q = tool => `guide/?l=${encodeURIComponent(prob.lesson)}&i=${prob.idx}&set=${encodeURIComponent(setCode)}&tool=${tool}&lang=${encodeURIComponent(lang)}${fmtKey ? '&f=' + fmtKey : ''}`;
  return `<div class="an-tools"><span class="muted small">${th('an.toolsTip', lang)}</span>
    <a class="btn btn-ghost btn-sm" href="${q('excel')}" target="_blank" rel="noopener"><span class="tool-ic xl">X</span>${th('an.excel', lang)}</a>
    <a class="btn btn-ghost btn-sm" href="${q('python')}" target="_blank" rel="noopener"><span class="tool-ic py">Py</span>${th('an.python', lang)}</a></div>`;
}
