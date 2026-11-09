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
  if (out.at(-1) < hi - step * 1e-9) out.push(+(out.at(-1) + step).toFixed(10));   // the top tick is never below the largest value
  return out;
}
function frame(inner, opts = {}) {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || '')}">${inner}</svg>`;
}
function yAxis(max, y, f = fmt) {
  return niceTicks(0, max).map(t => `<g class="ch-grid"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${f(t)}</text></g>`).join('');
}

/** bars: labels[] and values[] (negative values go below the zero line) */
export function barChart(labels, values, opts = {}) {
  const series = Array.isArray(values[0]) ? values : [values];   // several series: bars side by side
  const all = series.flat();
  const maxV = Math.max(...all, 0), minV = Math.min(...all, 0);
  const ticks = niceTicks(minV, maxV || 1), top = ticks.at(-1), bot = Math.min(0, ticks[0]), lt = opts.names && opts.names.length > 1 ? 18 : 0;
  const y = v => H - PAD.b - ((v - bot) / (top - bot)) * (H - PAD.t - lt - PAD.b);
  const bw = (W - PAD.l - PAD.r) / labels.length, k = series.length, sw = (bw * 0.7) / k;
  const bars = labels.map((lab, i) => series.map((vals, j) => {
    const v = vals[i], x0 = PAD.l + i * bw + bw * 0.15 + j * sw, yt = Math.min(y(v), y(0)), h = Math.abs(y(0) - y(v));
    return `<rect class="ch-bar s${j}" x="${x0}" y="${yt}" width="${sw * 0.94}" height="${h}"><title>${esc(lab)}${opts.names ? ' · ' + esc(opts.names[j]) : ''}: ${fmt(v)}</title></rect>
    <text class="ch-val" x="${x0 + sw / 2}" y="${v >= 0 ? y(v) - 4 : y(v) + 12}" text-anchor="middle">${fmt(v)}</text>`;
  }).join('') + `<text class="ch-lab" x="${PAD.l + i * bw + bw / 2}" y="${H - PAD.b + 16}" text-anchor="middle">${esc(lab)}</text>`).join('');
  const grid = ticks.map(t => `<g class="ch-grid"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text></g>`).join('');
  return frame(grid + `<line class="ch-axis" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(0)}" y2="${y(0)}"/>` + bars + legend(opts.names), opts);
}
function legend(names) {
  if (!names || names.length < 2) return '';
  return names.map((n, j) => `<g class="ch-legend"><rect class="ch-key s${j}" x="${PAD.l + 8 + j * 170}" y="${PAD.t - 8}" width="10" height="10"/><text x="${PAD.l + 22 + j * 170}" y="${PAD.t + 1}">${esc(n)}</text></g>`).join('');
}

/** lines: labels[] (x, in order) and one or more series of values (null = no point) */
export function lineChart(labels, series, opts = {}) {
  series = Array.isArray(series[0]) ? series : [series];
  const all = series.flat().filter(v => v !== null && Number.isFinite(v));
  if (!all.length) return '';
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all)), top = ticks.at(-1), bot = ticks[0], lt = opts.names && opts.names.length > 1 ? 18 : 0;
  const y = v => H - PAD.b - ((v - bot) / (top - bot)) * (H - PAD.t - lt - PAD.b);
  const n = labels.length, x = i => PAD.l + 14 + (n === 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r - 28));
  const grid = ticks.map(t => `<g class="ch-grid"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text></g>`).join('');
  const every = Math.ceil(n / 12);
  const labs = labels.map((l, i) => (i % every ? '' : `<text class="ch-lab" x="${x(i)}" y="${H - PAD.b + 16}" text-anchor="middle">${esc(String(l).replace(/^\d{4}-/, ''))}</text>`)).join('');
  const lines = series.map((vals, j) => {
    let d = '';
    vals.forEach((v, i) => { if (v === null || !Number.isFinite(v)) return; d += `${d ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; });
    const dots = vals.map((v, i) => (v === null || !Number.isFinite(v) ? '' : `<circle class="ch-dot s${j}" cx="${x(i)}" cy="${y(v)}" r="3"><title>${esc(labels[i])}${opts.names ? ' · ' + esc(opts.names[j]) : ''}: ${fmt(v)}</title></circle>`)).join('');
    return `<path class="ch-line s${j}" d="${d}"/>${dots}`;
  }).join('');
  return frame(grid + labs + lines + legend(opts.names), opts);
}

/** scatter: points [{x, y, label}], with the straight line that fits best (least squares) */
export function scatterChart(points, opts = {}) {
  if (!points.length) return '';
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const tx = niceTicks(Math.min(...xs), Math.max(...xs), 6), ty = niceTicks(Math.min(...ys), Math.max(...ys));
  const X = v => PAD.l + ((v - tx[0]) / (tx.at(-1) - tx[0])) * (W - PAD.l - PAD.r);
  const Y = v => H - PAD.b - ((v - ty[0]) / (ty.at(-1) - ty[0])) * (H - PAD.t - PAD.b);
  const grid = ty.map(t => `<g class="ch-grid"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${PAD.l - 6}" y="${Y(t) + 4}" text-anchor="end">${fmt(t)}</text></g>`).join('')
    + tx.map(t => `<text class="ch-lab" x="${X(t)}" y="${H - PAD.b + 16}" text-anchor="middle">${fmt(t)}</text>`).join('');
  const dots = points.map(p => `<circle class="ch-pt" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.6"><title>${esc(p.label || '')} ${fmt(p.x)}, ${fmt(p.y)}</title></circle>`).join('');
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  xs.forEach((v, i) => { sxy += (v - mx) * (ys[i] - my); sxx += (v - mx) * (v - mx); });
  const b = sxx ? sxy / sxx : 0, a = my - b * mx;
  const x0 = tx[0], x1 = tx.at(-1);
  const fit = `<line class="ch-fit" x1="${X(x0)}" y1="${Y(Math.max(ty[0], Math.min(ty.at(-1), a + b * x0)))}" x2="${X(x1)}" y2="${Y(Math.max(ty[0], Math.min(ty.at(-1), a + b * x1)))}"/>`;
  const axes = `<text class="ch-axlab" x="${W - PAD.r}" y="${H - 4}" text-anchor="end">${esc(opts.xLabel || '')} →</text><text class="ch-axlab" x="${PAD.l - 44}" y="${PAD.t + 2}">↑ ${esc(opts.yLabel || '')}</text>`;
  return frame(grid + dots + fit + axes, opts);
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
