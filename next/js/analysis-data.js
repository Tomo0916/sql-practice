/* =========================================================
 * analysis-data.js — data for the data-analysis course
 * ---------------------------------------------------------
 * Kumo Mart (クモマート): a made-up retailer with shops and an online store.
 * Its tables are the examples every lesson starts from. The practice tables
 * come from other kinds of business, so the same method is used on new data.
 *
 * Everything is generated from fixed seeds, so the app, the CSV downloads and
 * the Excel / Python guides always show the same numbers.
 * Built in on purpose: skewed money columns, a few very large values (outliers),
 * groups that differ in average and in spread, missing values (NULL),
 * repeated customers, and an odd number of rows (so the median is one row).
 *
 * roles (what each lesson uses):
 *   id    row id            name  a person/customer code (repeats)
 *   g     group (3–5 kinds) dt    date (2025)
 *   v     main number (integer, money/time/weight)
 *   v2    small count (1–10)    opt   text with missing values (NULL)
 * ========================================================= */

function seeded(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0 || 1;
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = () => { let u = 0, w = 0; while (u === 0) u = next(); while (w === 0) w = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); };
  return { next, normal, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: arr => arr[Math.floor(next() * arr.length)] };
}
const pad = n => String(n).padStart(2, '0');
function dayOf(R, weights) {
  // a date in 2025; weights per month make busy and quiet months (seasonality)
  const tot = weights.reduce((a, b) => a + b, 0);
  let x = R.next() * tot, m = 0;
  while (x > weights[m]) { x -= weights[m]; m++; }
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  return `2025-${pad(m + 1)}-${pad(R.int(1, days))}`;
}
const FLAT = Array(12).fill(1);
const XMAS = [0.9, 0.8, 1, 1, 1, 0.9, 1.1, 1.2, 0.9, 1, 1.2, 1.6];

/**
 * One table from a recipe.
 * groups: [[name, mean, sd]] of v per group (lognormal when skew, normal otherwise)
 */
function makeTable(spec) {
  const R = seeded(spec.table);
  const rows = [];
  const pool = Array.from({ length: spec.people }, (_, i) => `${spec.idPrefix}${String(i + 1).padStart(3, '0')}`);
  for (let i = 0; i < spec.n; i++) {
    const [g, mean, sd] = spec.groups[R.int(0, spec.groups.length - 1)];
    let v;
    if (spec.skew) { const s2 = Math.log(1 + (sd * sd) / (mean * mean)); v = Math.exp(Math.log(mean) - s2 / 2 + Math.sqrt(s2) * R.normal()); }
    else v = mean + sd * R.normal();
    v = Math.max(spec.min || 1, Math.round(v / (spec.round || 1)) * (spec.round || 1));
    const v2 = Math.max(1, Math.min(spec.v2max, Math.round(spec.v2mean + spec.v2sd * R.normal())));
    const opt = R.next() < spec.nullRate ? null : R.pick(spec.optValues);
    rows.push({ dt: dayOf(R, spec.season || FLAT), g, name: R.pick(pool), v, v2, opt });
  }
  // a few very large values (data-entry mistakes or bulk orders)
  (spec.outliers || []).forEach((x, k) => { rows[(k * 37 + 11) % rows.length].v = x; });
  rows.sort((a, b) => (a.dt < b.dt ? -1 : a.dt > b.dt ? 1 : 0));
  const c = spec.cols;   // column names for: id, dt, g, name, v, v2, opt
  return {
    table: spec.table,
    analysis: true,
    columns: [[c.id, 'INTEGER'], [c.dt, 'TEXT'], [c.g, 'TEXT'], [c.name, 'TEXT'], [c.v, 'INTEGER'], [c.v2, 'INTEGER'], [c.opt, 'TEXT']],
    roles: { id: c.id, dt: c.dt, g: c.g, name: c.name, v: c.v, v2: c.v2, opt: c.opt },
    unit: spec.unit, binStep: spec.binStep,
    rows: rows.map((r, i) => [i + 1, r.dt, r.g, r.name, r.v, r.v2, r.opt])
  };
}

/* ---------- Kumo Mart (the examples) ---------- */
export const KUMO_ORDERS = makeTable({
  table: 'kumo_orders', n: 401, people: 140, idPrefix: 'C', skew: true, round: 10, min: 300,
  cols: { id: 'order_id', dt: 'order_date', g: 'store', name: 'customer_id', v: 'amount', v2: 'items', opt: 'coupon' },
  groups: [['Shibuya', 5200, 2600], ['Umeda', 4800, 2200], ['Sakae', 4300, 1500], ['Online', 6100, 4200]],
  v2mean: 3, v2sd: 1.6, v2max: 10, nullRate: 0.62, optValues: ['WELCOME10', 'SPRING5', 'APP300', 'BDAY'],
  outliers: [68400, 54200, 47800], season: XMAS, unit: 'yen', binStep: 2000
});
export const KUMO_CUSTOMERS = (() => {
  // the customer list: some people registered twice, some e-mail addresses are missing
  const R = seeded('kumo_customers');
  const first = ['Aiko', 'Ben', 'Chen', 'Dina', 'Emma', 'Farid', 'Gita', 'Hiro', 'Ivan', 'Jun', 'Kim', 'Lena', 'Mai', 'Nam', 'Omar', 'Priya', 'Raj', 'Sara', 'Tuan', 'Yui'];
  const last = ['Sato', 'Lee', 'Wang', 'Rai', 'Hill', 'Khan', 'Das', 'Mori', 'Pak', 'Ito', 'Tran', 'Ruiz', 'Abe', 'Bose', 'Ono'];
  const cities = ['Tokyo', 'Osaka', 'Nagoya', 'Fukuoka'];
  const rows = [];
  for (let i = 1; rows.length < 121; i++) {
    const name = `${R.pick(first)} ${R.pick(last)}`;
    const email = R.next() < 0.18 ? null : `${name.toLowerCase().replace(' ', '.')}@example.com`;
    rows.push([i, `2025-${pad(R.int(1, 12))}-${pad(R.int(1, 28))}`, R.pick(cities), name, R.int(0, 60) * 100, R.int(18, 70), email]);
    if (R.next() < 0.1 && rows.length < 121) rows.push([++i, `2025-${pad(R.int(1, 12))}-${pad(R.int(1, 28))}`, R.pick(cities), name, R.int(0, 60) * 100, R.int(18, 70), email && R.next() < 0.5 ? null : email]);
  }
  return {
    table: 'kumo_customers', analysis: true,
    columns: [['customer_id', 'INTEGER'], ['joined_date', 'TEXT'], ['city', 'TEXT'], ['name', 'TEXT'], ['points', 'INTEGER'], ['age', 'INTEGER'], ['email', 'TEXT']],
    roles: { id: 'customer_id', dt: 'joined_date', g: 'city', name: 'name', v: 'points', v2: 'age', opt: 'email' },
    unit: 'pt', binStep: 1000, rows
  };
})();

/* ---------- other businesses (the practice problems) ---------- */
export const ANALYSIS_THEMES = [
  makeTable({ table: 'cafe_sales', n: 151, people: 60, idPrefix: 'M', skew: true, round: 10, min: 200,
    cols: { id: 'sale_id', dt: 'sale_date', g: 'shop', name: 'member_id', v: 'amount', v2: 'cups', opt: 'coupon' },
    groups: [['Station', 980, 420], ['Park', 1240, 760], ['Campus', 760, 260]], v2mean: 2, v2sd: 1, v2max: 6, nullRate: 0.55, optValues: ['MORNING', 'APP50', 'STAMP'],
    outliers: [9800, 7600], season: FLAT, unit: 'yen', binStep: 500 }),
  makeTable({ table: 'hotel_stays', n: 131, people: 70, idPrefix: 'G', skew: true, round: 100, min: 4000,
    cols: { id: 'stay_id', dt: 'checkin_date', g: 'hotel', name: 'guest_id', v: 'charge', v2: 'nights', opt: 'request' },
    groups: [['Kyoto', 32000, 14000], ['Sapporo', 24000, 8000], ['Naha', 41000, 22000]], v2mean: 2.5, v2sd: 1.4, v2max: 9, nullRate: 0.4, optValues: ['late check-in', 'quiet room', 'extra bed', 'airport bus'],
    outliers: [312000, 268000], season: [0.8, 1.1, 1.2, 1, 1.1, 0.9, 1.3, 1.6, 1, 1, 0.9, 1.2], unit: 'yen', binStep: 20000 }),
  makeTable({ table: 'courier_jobs', n: 141, people: 50, idPrefix: 'K', skew: true, round: 10, min: 400,
    cols: { id: 'delivery_id', dt: 'ship_date', g: 'region', name: 'client_id', v: 'fee', v2: 'days', opt: 'note' },
    groups: [['Kanto', 1100, 300], ['Kansai', 1300, 450], ['Kyushu', 1700, 700], ['Tohoku', 1600, 520]], v2mean: 2.6, v2sd: 1.3, v2max: 8, nullRate: 0.7, optValues: ['fragile', 'call first', 'leave at door'],
    outliers: [8900, 7400], season: XMAS, unit: 'yen', binStep: 500 }),
  makeTable({ table: 'helpdesk_tickets', n: 121, people: 45, idPrefix: 'U', skew: true, round: 1, min: 2,
    cols: { id: 'ticket_id', dt: 'opened_date', g: 'team', name: 'user_id', v: 'minutes', v2: 'replies', opt: 'rating' },
    groups: [['Network', 95, 70], ['Accounts', 35, 18], ['Software', 60, 40]], v2mean: 3, v2sd: 1.8, v2max: 10, nullRate: 0.35, optValues: ['good', 'ok', 'bad'],
    outliers: [960, 720], season: FLAT, unit: 'min', binStep: 30 }),
  makeTable({ table: 'gym_visits', n: 161, people: 55, idPrefix: 'P', skew: false, round: 1, min: 10,
    cols: { id: 'visit_id', dt: 'visit_date', g: 'branch', name: 'member_id', v: 'minutes', v2: 'machines', opt: 'trainer' },
    groups: [['Shinjuku', 68, 18], ['Ikebukuro', 74, 22], ['Kawasaki', 58, 12]], v2mean: 5, v2sd: 2, v2max: 10, nullRate: 0.6, optValues: ['Ken', 'Mia', 'Rio'],
    outliers: [290, 260], season: [1.4, 1.2, 1.1, 1, 1, 0.9, 0.8, 0.8, 0.9, 1, 1, 0.8], unit: 'min', binStep: 15 }),
  makeTable({ table: 'factory_lots', n: 111, people: 12, idPrefix: 'W', skew: false, round: 1, min: 400,
    cols: { id: 'lot_id', dt: 'made_date', g: 'line', name: 'operator_id', v: 'weight_g', v2: 'defects', opt: 'inspector' },
    groups: [['Line A', 502, 4], ['Line B', 499, 9], ['Line C', 505, 6]], v2mean: 2, v2sd: 1.5, v2max: 9, nullRate: 0.25, optValues: ['Abe', 'Kato', 'Lin'],
    outliers: [562, 441], season: FLAT, unit: 'g', binStep: 5 })
];
export const ANALYSIS_DEMO = { kumo_orders: KUMO_ORDERS, kumo_customers: KUMO_CUSTOMERS };
