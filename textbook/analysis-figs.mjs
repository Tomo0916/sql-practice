// Print the figures of the data-analysis textbook as JSON {name: svg}.
// The same chart code as the app (next/js/charts.js), drawn from the same data.
import { ALL_TABLES } from '../next/js/datasets.js';
import { barChart, histChart, boxChart, normalChart, fillChart } from '../next/js/charts.js';

const col = (t, c) => { const tb = ALL_TABLES[t]; const i = tb.columns.findIndex(x => x[0] === c); return tb.rows.map(r => r[i]); };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const bins = (v, step) => { const m = new Map(); v.forEach(x => { const b = Math.floor(x / step) * step; m.set(b, (m.get(b) || 0) + 1); }); return [...m].map(([start, n]) => ({ start, n })).sort((a, b) => a.start - b.start); };
const fmt = x => Math.round(x).toLocaleString('en');
const out = {};

// A2: filled and missing values per column of the customer list
{ const tb = ALL_TABLES.kumo_customers;
  out.fill = fillChart(tb.columns.map(([c], i) => ({ name: c, total: tb.rows.length, filled: tb.rows.filter(r => r[i] !== null).length })), { label: 'filled / missing' }); }

// A3: histogram of the order amount with mean and median (drawn up to the 99th percentile)
{ const v = col('kumo_orders', 'amount').slice().sort((a, b) => a - b), step = 2000;
  const cut = Math.ceil(v[Math.floor(v.length * 0.99)] / step) * step, shown = v.filter(x => x < cut);
  out.center = histChart(bins(shown, step), step, { label: 'amount', marks: [{ x: mean(v), label: `mean ${fmt(mean(v))}`, cls: 'mean' }, { x: v[(v.length - 1) / 2], label: `median ${fmt(v[(v.length - 1) / 2])}`, cls: 'median' }] });
  out.center_beyond = { n: v.length - shown.length, cut, max: v[v.length - 1] }; }

// A4: box plot per store
{ const g = col('kumo_orders', 'store'), v = col('kumo_orders', 'amount');
  out.box = boxChart([...new Set(g)].sort().map(label => ({ label, values: v.filter((_, i) => g[i] === label) })), { label: 'amount by store' }); }

// A5: three shapes (symmetric, long right tail, two groups mixed)
{ const shape = (t, c, step, clip) => { const all = col(t, c), srt = all.slice().sort((a, b) => a - b), v = clip ? all.filter(x => x < srt[Math.floor(srt.length * clip)]) : all; return histChart(bins(v, step), step, { label: c, marks: [{ x: mean(all), label: 'mean', cls: 'mean' }, { x: srt[(srt.length - 1) / 2], label: 'median', cls: 'median' }] }); };
  out.shape_sym = shape('factory_lots', 'weight_g', 4);
  out.shape_right = shape('hotel_stays', 'charge', 10000, 0.99);
  out.hist_kumo = histChart(bins(col('kumo_orders', 'amount').filter(x => x < 30000), 2000), 2000, { label: 'amount' }); }

// A6: the normal curve and the 5 largest z-scores of the order amount
{ const v = col('kumo_orders', 'amount'), ids = col('kumo_orders', 'order_id');
  const m = Math.round(mean(v) * 10) / 10, s = Math.round(sd(v) * 10) / 10;
  // very large z would squash the curve: draw them at the right edge (z = 6)
  out.normal = normalChart(v.map((x, i) => ({ label: `order ${ids[i]}`, z: Math.round((x - m) / s * 100) / 100 })).sort((a, b) => b.z - a.z).slice(0, 5).map(p => ({ ...p, z: Math.min(p.z, 6) })), { label: 'z' }); }

process.stdout.write(JSON.stringify(out));
