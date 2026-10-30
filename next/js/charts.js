/* =========================================================
 * charts.js — small SVG charts for the data-analysis lessons
 * (no library: bars, histograms, box plots, a normal curve).
 * Colours come from CSS variables, so dark mode works.
 * ========================================================= */
const W = 560, H = 240, PAD = { l: 52, r: 16, t: 14, b: 34 };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = v => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en') : Number.isInteger(v) ? String(v) : v.toFixed(1));

/** round "nice" axis steps: 1, 2, 5 × 10^k */
function niceTicks(lo, hi, n = 5) {
  if (hi === lo) hi = lo + 1;
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
  const out = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
function frame(inner, opts = {}) {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || '')}">${inner}</svg>`;
}
function yAxis(max, y, f = fmt) {
  return niceTicks(0, max).map(t => `<g class="ch-grid"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${f(t)}</text></g>`).join('');
}

/** bars: labels[] and values[] */
export function barChart(labels, values, opts = {}) {
  const max = Math.max(...values, 0) || 1, top = niceTicks(0, max).at(-1);
  const y = v => H - PAD.b - (v / top) * (H - PAD.t - PAD.b);
  const bw = (W - PAD.l - PAD.r) / labels.length;
  const bars = values.map((v, i) => `<rect class="ch-bar" x="${PAD.l + i * bw + bw * 0.15}" y="${y(v)}" width="${bw * 0.7}" height="${y(0) - y(v)}"><title>${esc(labels[i])}: ${fmt(v)}</title></rect>
    <text class="ch-val" x="${PAD.l + i * bw + bw / 2}" y="${y(v) - 4}" text-anchor="middle">${fmt(v)}</text>
    <text class="ch-lab" x="${PAD.l + i * bw + bw / 2}" y="${H - PAD.b + 16}" text-anchor="middle">${esc(labels[i])}</text>`).join('');
  return frame(yAxis(top, y) + bars, opts);
}

/**
 * histogram: bins = [{start, n}], step = bin width. Empty bins between are drawn as 0.
 * marks = [{x, label, cls}] vertical lines (e.g. mean, median).
 */
export function histChart(bins, step, opts = {}) {
  if (!bins.length) return '';
  const lo = Math.min(...bins.map(b => b.start)), hi = Math.max(...bins.map(b => b.start)) + step;
  const all = [];
  for (let s = lo; s < hi - step / 2; s += step) { const b = bins.find(x => Math.abs(x.start - s) < step / 1000); all.push({ start: s, n: b ? b.n : 0 }); }
  const max = Math.max(...all.map(b => b.n)) || 1, top = niceTicks(0, max).at(-1);
  const x = v => PAD.l + ((v - lo) / (hi - lo)) * (W - PAD.l - PAD.r);
  const y = v => H - PAD.b - (v / top) * (H - PAD.t - PAD.b);
  const bars = all.map(b => `<rect class="ch-bar" x="${x(b.start) + 0.5}" y="${y(b.n)}" width="${Math.max(0, x(b.start + step) - x(b.start) - 1)}" height="${y(0) - y(b.n)}"><title>${fmt(b.start)}–${fmt(b.start + step)}: ${b.n}</title></rect>`).join('');
  const ticks = niceTicks(lo, hi, 6).filter(t => t >= lo && t <= hi).map(t => `<text class="ch-lab" x="${x(t)}" y="${H - PAD.b + 16}" text-anchor="middle">${fmt(t)}</text>`).join('');
    // the larger mark is labelled on its right, the smaller on its left, so labels never cross
  const ms = (opts.marks || []).slice().sort((a, b) => a.x - b.x);
  const marks = ms.map((m, i) => { const right = i === ms.length - 1; return `<g class="ch-mark ${m.cls || ''}"><line x1="${x(m.x)}" x2="${x(m.x)}" y1="${PAD.t}" y2="${y(0)}"/><text x="${x(m.x) + (right ? 5 : -5)}" y="${PAD.t + 12}" text-anchor="${right ? 'start' : 'end'}">${esc(m.label)}</text></g>`; }).join('');
  return frame(yAxis(top, y) + bars + ticks + marks, opts);
}

/** quantiles like Excel QUARTILE.INC / pandas (linear interpolation) */
export function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
/** box plots: groups = [{label, values[]}]. Whiskers to the last value within 1.5 × IQR; points beyond are outliers. */
export function boxChart(groups, opts = {}) {
  const all = groups.flatMap(g => g.values);
  const lo = Math.min(...all), hi = Math.max(...all);
  const ticks = niceTicks(lo, hi, 6);
  const x0 = ticks[0], x1 = ticks.at(-1);
  const x = v => PAD.l + 40 + ((v - x0) / (x1 - x0)) * (W - PAD.l - 40 - PAD.r);
  const rowH = (H - PAD.t - PAD.b) / groups.length;
  let out = ticks.map(t => `<g class="ch-grid"><line x1="${x(t)}" x2="${x(t)}" y1="${PAD.t}" y2="${H - PAD.b}"/><text x="${x(t)}" y="${H - PAD.b + 16}" text-anchor="middle">${fmt(t)}</text></g>`).join('');
  groups.forEach((g, i) => {
    const s = g.values.slice().sort((a, b) => a - b);
    const q1 = quantile(s, 0.25), q2 = quantile(s, 0.5), q3 = quantile(s, 0.75), iqr = q3 - q1;
    const wl = s.find(v => v >= q1 - 1.5 * iqr), wh = s.slice().reverse().find(v => v <= q3 + 1.5 * iqr);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const cy = PAD.t + rowH * (i + 0.5), bh = Math.min(26, rowH * 0.55);
    out += `<g class="ch-box"><text class="ch-lab" x="${PAD.l + 34}" y="${cy + 4}" text-anchor="end">${esc(g.label)}</text>
      <line x1="${x(wl)}" x2="${x(wh)}" y1="${cy}" y2="${cy}"/><line x1="${x(wl)}" x2="${x(wl)}" y1="${cy - bh / 3}" y2="${cy + bh / 3}"/><line x1="${x(wh)}" x2="${x(wh)}" y1="${cy - bh / 3}" y2="${cy + bh / 3}"/>
      <rect x="${x(q1)}" y="${cy - bh / 2}" width="${x(q3) - x(q1)}" height="${bh}"><title>Q1 ${fmt(q1)} · median ${fmt(q2)} · Q3 ${fmt(q3)}</title></rect>
      <line class="ch-med" x1="${x(q2)}" x2="${x(q2)}" y1="${cy - bh / 2}" y2="${cy + bh / 2}"/>
      <circle class="ch-mean" cx="${x(mean)}" cy="${cy}" r="3.5"><title>mean ${fmt(mean)}</title></circle>
      ${s.filter(v => v < wl || v > wh).map(v => `<circle class="ch-out" cx="${x(v)}" cy="${cy}" r="3"><title>${fmt(v)}</title></circle>`).join('')}</g>`;
  });
  return frame(out, opts);
}

/** the normal curve with ±1, ±2, ±3 standard deviations, and points at the given z-scores */
export function normalChart(points, opts = {}) {
  const lo = -4, hi = Math.max(4, Math.ceil(Math.max(0, ...points.map(p => p.z)) + 0.5));
  const x = z => PAD.l + ((z - lo) / (hi - lo)) * (W - PAD.l - PAD.r);
  const pdf = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const y = v => H - PAD.b - (v / 0.42) * (H - PAD.t - PAD.b);
  let d = '';
  for (let z = lo; z <= hi; z += 0.05) d += `${d ? 'L' : 'M'}${x(z).toFixed(1)} ${y(pdf(z)).toFixed(1)}`;
  const bands = [[3, 'b3'], [2, 'b2'], [1, 'b1']].map(([k, c]) => `<rect class="ch-band ${c}" x="${x(-k)}" y="${PAD.t}" width="${x(k) - x(-k)}" height="${y(0) - PAD.t}"/>`).join('');
  const ticks = [];
  for (let z = lo; z <= hi; z++) ticks.push(`<text class="ch-lab" x="${x(z)}" y="${H - PAD.b + 16}" text-anchor="middle">${z > 0 ? '+' : ''}${z}</text>`);
  const pts = points.map(p => `<circle class="ch-out" cx="${x(p.z)}" cy="${y(0) - 6}" r="4"><title>${esc(p.label)}: z = ${p.z}</title></circle>`).join('');
  const pct = [['68%', 1], ['95%', 2], ['99.7%', 3]].map(([t, k], i) => `<text class="ch-pct" x="${W - PAD.r - 4}" y="${PAD.t + 14 + i * 16}" text-anchor="end">|z| &lt; ${k}: ${t}</text>`).join('');
  return frame(bands + `<path class="ch-curve" d="${d}"/>` + `<line class="ch-axis" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(0)}" y2="${y(0)}"/>` + ticks.join('') + pts + pct, opts);
}

/** stacked bars per column: filled vs missing */
export function fillChart(cols, opts = {}) {
  const bw = (W - PAD.l - PAD.r) / cols.length;
  const y = v => H - PAD.b - v * (H - PAD.t - PAD.b);
  const out = cols.map((c, i) => {
    const share = c.filled / c.total, xx = PAD.l + i * bw + bw * 0.15;
    return `<rect class="ch-bar" x="${xx}" y="${y(share)}" width="${bw * 0.7}" height="${y(0) - y(share)}"><title>${esc(c.name)}: ${c.filled}/${c.total}</title></rect>
      <rect class="ch-miss" x="${xx}" y="${y(1)}" width="${bw * 0.7}" height="${y(share) - y(1)}"/>
      ${c.total - c.filled ? `<text class="ch-val miss" x="${xx + bw * 0.35}" y="${y(1) + 14}" text-anchor="middle">${c.total - c.filled}</text>` : ''}
      <text class="ch-lab" x="${xx + bw * 0.35}" y="${H - PAD.b + 16}" text-anchor="middle">${esc(c.name)}</text>`;
  }).join('');
  return frame(yAxis(1, y, v => Math.round(v * 100) + '%') + out, opts);
}
