/* =========================================================
 * lessons.js — the lesson patterns (logic only)
 * ---------------------------------------------------------
 * 1レッスン = 1つの書き方（パターン）。文章は i18n/<言語>.js の
 *   L.<key>.title / L.<key>.point / L.<key>.desc にあります。
 *   desc の {x} は gen() が返す値に置き換わります。
 *
 *   demo   : 例題（授業でみんなで解く固定の1問）
 *   gen()  : 演習の作り方（別テーマのデータに同じパターンを当てはめる）
 *   sql()  : 答えのSQL
 *   blanks : 穴うめ問題で空欄にするパラメータ
 *   steps(): ステップ解説（SQLが1句ずつ組み上がる）
 * ========================================================= */

export const BLANK = '___';
const isSentinel = v => typeof v === 'string' && /^__B\d+__$/.test(v);
const lit = v => (isSentinel(v) ? `'${v}'` : v === BLANK ? `'${BLANK}'` : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const dir = o => (isSentinel(o) || o === BLANK ? o : (o === 'desc' || o === 'za') ? 'DESC' : 'ASC');
const fn = (f, c) => (f === 'COUNT' ? 'COUNT(*)' : `${f}(${c})`);

/* ---- small helpers used by the generators ---- */
function colIndex(tbl, col) { return tbl.columns.findIndex(c => c[0] === col); }
function colVals(tbl, col) { const i = colIndex(tbl, col); return tbl.rows.map(r => r[i]); }
function groupsOf(tbl, col) {
  const m = new Map();
  colVals(tbl, col).forEach(v => m.set(v, (m.get(v) || 0) + 1));
  return [...m.entries()].map(([value, size]) => ({ value, size }));
}
/** Round to a "nice" number so that problems read naturally (1650 → 1500, 320000 → 300000). */
function niceStep(x) {
  const a = Math.abs(x);
  if (a < 10) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(a)));
  return mag >= 100 ? mag / 2 : mag / 2 >= 1 ? mag / 2 : 1;
}
const niceFloor = x => Math.floor(x / niceStep(x)) * niceStep(x);
const niceCeil = x => Math.ceil(x / niceStep(x)) * niceStep(x);
const AGG4 = ['SUM', 'AVG', 'MAX', 'MIN'];

/* ---- join helpers ---- */
export function joinParams(pair) {
  const L = pair.left, R = pair.right;
  return { L: L.table, R: R.table, id: L.roles.id, key: R.roles.key, name: L.roles.name, grp: L.roles.grp, text: R.roles.text, num: R.roles.num };
}
const onOf = p => `${p.L}.${p.id} = ${p.R}.${p.key}`;
export const joinView = p => Object.assign({}, p, { on: onOf(p) });

/** The example pair used by every JOIN demo (the original table_a / table_b). */
export const DEMO_JOIN_PAIR = {
  key: 'demo',
  left: { table: 'table_a', roles: { id: 'id', name: 'column_a1', grp: 'class' } },
  right: { table: 'table_b', roles: { key: 'id', text: 'column_b1', num: 'column_b2' } }
};

export const CHAPTERS = [
  { key: 'basics', icon: 'S' },
  { key: 'agg', icon: 'Σ' },
  { key: 'join', icon: '⋈' }
];

export const LESSONS = [
  /* =================== BASICS =================== */
  {
    key: 'select', ch: 'basics', kind: 'single',
    syntax: 'SELECT {col}, {col} FROM {table};',
    keywords: ['SELECT', 'FROM', '*', ','],
    demo: { ds: 'products', p: { t: 'products', c1: 'name', c2: 'price' } },
    gen(ds, R) { const r = ds.roles; return { t: ds.table, c1: r.name, c2: R.pick([r.n1, r.n2, r.cat, r.yr]) }; },
    sql: p => `SELECT ${p.c1}, ${p.c2} FROM ${p.t};`,
    blanks: ['c1', 'c2'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.select', `SELECT ${p.c1}, ${p.c2} FROM ${p.t};`]]
  },
  {
    key: 'between', ch: 'basics', kind: 'single',
    syntax: 'SELECT * FROM {table} WHERE {col} BETWEEN {min} AND {max};',
    keywords: ['SELECT', '*', 'FROM', 'WHERE', 'BETWEEN', 'AND'],
    demo: { ds: 'products', p: { t: 'products', c: 'price', lo: 1000, hi: 5000 } },
    gen(ds, R) {
      const c = R.pick([ds.roles.n1, ds.roles.n2]);
      const v = colVals(ds, c).slice().sort((a, b) => a - b), n = v.length;
      const i = R.int(1, Math.max(1, n - 5)), j = Math.min(n - 2, i + R.int(2, 4));
      const lo = niceFloor(v[i]), hi = niceCeil(v[j]);
      if (!(lo < hi)) return null;
      const cnt = v.filter(x => x >= lo && x <= hi).length;
      if (cnt < 2 || cnt > n - 2) return null;
      return { t: ds.table, c, lo, hi };
    },
    sql: p => `SELECT * FROM ${p.t} WHERE ${p.c} BETWEEN ${p.lo} AND ${p.hi};`,
    blanks: ['lo', 'hi'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.c} BETWEEN ${p.lo} AND ${p.hi};`]]
  },
  {
    key: 'like', ch: 'basics', kind: 'single',
    syntax: "SELECT {col}, {col} FROM {table} WHERE {col} LIKE '%{text}%';",
    keywords: ['SELECT', 'FROM', 'WHERE', 'LIKE', "'%%'"],
    demo: { ds: 'products', p: { t: 'products', c1: 'name', c2: 'category', like: 'Pro' } },
    gen(ds, R) {
      const names = colVals(ds, ds.roles.name), n = names.length;
      const ok = term => { const c = names.filter(s => s.toLowerCase().includes(term.toLowerCase())).length; return c >= 1 && c <= n - 2; };
      let terms = (ds.likeTerms || []).filter(ok);
      if (!terms.length) {
        const s = R.pick(names); const k = R.int(0, s.length - 3); const cand = s.substr(k, 3).trim();
        if (cand.length < 2 || !ok(cand)) return null; terms = [cand];
      }
      return { t: ds.table, c1: ds.roles.name, c2: ds.roles.cat, like: R.pick(terms) };
    },
    sql: p => `SELECT ${p.c1}, ${p.c2} FROM ${p.t} WHERE ${p.c1} LIKE '%${p.like}%';`,
    blanks: ['like'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.c1} LIKE '%${p.like}%';`], ['step.select', `SELECT ${p.c1}, ${p.c2} FROM ${p.t} WHERE ${p.c1} LIKE '%${p.like}%';`]]
  },
  {
    key: 'distinct', ch: 'basics', kind: 'single',
    syntax: 'SELECT DISTINCT {col} FROM {table} ORDER BY {col} ASC;',
    keywords: ['SELECT', 'DISTINCT', 'FROM', 'ORDER BY', 'ASC', 'DESC'],
    demo: { ds: 'products', p: { t: 'products', c: 'category', ord: 'az' } },
    gen(ds, R) { return { t: ds.table, c: ds.roles.cat, ord: R.pick(['az', 'za']) }; },
    sql: p => `SELECT DISTINCT ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`,
    blanks: ['ord'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.select', `SELECT ${p.c} FROM ${p.t};`], ['step.distinct', `SELECT DISTINCT ${p.c} FROM ${p.t};`], ['step.order', `SELECT DISTINCT ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`]]
  },
  {
    key: 'topn', ch: 'basics', kind: 'single',
    syntax: "SELECT {col}, {col} FROM {table} WHERE {col} = '{value}' ORDER BY {col} DESC LIMIT {n};",
    keywords: ['SELECT', 'FROM', 'WHERE', "= ''", 'ORDER BY', 'DESC', 'ASC', 'LIMIT'],
    demo: { ds: 'products', p: { t: 'products', name: 'name', c: 'price', cat: 'category', v: 'Electronics', ord: 'desc', k: 3 } },
    gen(ds, R) {
      const g = groupsOf(ds, ds.roles.cat).filter(x => x.size >= 3);
      if (!g.length) return null;
      const grp = R.pick(g);
      return { t: ds.table, name: ds.roles.name, c: R.pick([ds.roles.n1, ds.roles.n2]), cat: ds.roles.cat, v: grp.value, ord: R.pick(['desc', 'asc']), k: R.int(2, Math.min(3, grp.size - 1)) };
    },
    sql: p => `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k};`,
    tie: p => `SELECT ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`,
    blanks: ['v', 'ord', 'k'],
    steps: p => [
      ['step.from', `SELECT * FROM ${p.t};`],
      ['step.where', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`],
      ['step.order', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)};`],
      ['step.limit', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k};`],
      ['step.select', `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k};`]
    ]
  },
  {
    key: 'offset', ch: 'basics', kind: 'single',
    syntax: 'SELECT {col}, {col} FROM {table} WHERE {col} >= {value} ORDER BY {col} ASC LIMIT {n} OFFSET {skip};',
    keywords: ['SELECT', 'FROM', 'WHERE', '>=', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET'],
    demo: { ds: 'products', p: { t: 'products', name: 'name', c: 'price', yr: 'release_year', y: 2020, ord: 'asc', k: 2, skip: 3, a: 4, b: 5 } },
    gen(ds, R) {
      const yrs = colVals(ds, ds.roles.yr), n = yrs.length;
      const cands = [...new Set(yrs)].filter(y => { const c = yrs.filter(v => v >= y).length; return c >= 4 && c < n; });
      if (!cands.length) return null;
      const y = R.pick(cands), cnt = yrs.filter(v => v >= y).length;
      const skip = R.int(1, cnt - 2);
      return { t: ds.table, name: ds.roles.name, c: R.pick([ds.roles.n1, ds.roles.n2]), yr: ds.roles.yr, y, ord: R.pick(['asc', 'desc']), k: 2, skip, a: skip + 1, b: skip + 2 };
    },
    sql: p => `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k} OFFSET ${p.skip};`,
    tie: p => `SELECT ${p.c} FROM ${p.t} WHERE ${p.yr} >= ${p.y};`,
    blanks: ['ord', 'k', 'skip'],
    steps: p => [
      ['step.from', `SELECT * FROM ${p.t};`],
      ['step.where', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y};`],
      ['step.order', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)};`],
      ['step.offset', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k} OFFSET ${p.skip};`],
      ['step.select', `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k} OFFSET ${p.skip};`]
    ]
  },

  /* =================== AGGREGATION =================== */
  {
    key: 'aggfn', ch: 'agg', kind: 'single',
    syntax: 'SELECT COUNT(*), SUM({col}) FROM {table};   -- SUM / AVG / MAX / MIN',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM'],
    demo: { ds: 'products', p: { t: 'products', f: 'AVG', c: 'price' } },
    gen(ds, R) { return { t: ds.table, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]) }; },
    sql: p => `SELECT COUNT(*), ${fn(p.f, p.c)} FROM ${p.t};`,
    blanks: ['f'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.agg', `SELECT COUNT(*), ${fn(p.f, p.c)} FROM ${p.t};`]]
  },
  {
    key: 'whereagg', ch: 'agg', kind: 'single',
    syntax: "SELECT MAX({col}), MIN({col}) FROM {table} WHERE {col} = '{value}';",
    keywords: ['SELECT', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'WHERE', "= ''"],
    demo: { ds: 'students', p: { t: 'students', cat: 'major', v: 'IT', f1: 'MAX', c1: 'score', f2: 'MIN', c2: 'score' } },
    gen(ds, R) {
      const g = groupsOf(ds, ds.roles.cat).filter(x => x.size >= 2);
      const [f1, f2] = R.shuffle(AGG4).slice(0, 2);
      return { t: ds.table, cat: ds.roles.cat, v: R.pick(g).value, f1, c1: ds.roles.n1, f2, c2: R.pick([ds.roles.n1, ds.roles.n2]) };
    },
    sql: p => `SELECT ${fn(p.f1, p.c1)}, ${fn(p.f2, p.c2)} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`,
    blanks: ['v', 'f1', 'f2'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`], ['step.agg', `SELECT ${fn(p.f1, p.c1)}, ${fn(p.f2, p.c2)} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`]]
  },
  {
    key: 'groupby', ch: 'agg', kind: 'single',
    syntax: 'SELECT {group}, COUNT(*), AVG({num}) FROM {table} GROUP BY {group};',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY'],
    demo: { ds: 'students', p: { t: 'students', cat: 'major', f: 'AVG', c: 'score' } },
    gen(ds, R) { return { t: ds.table, cat: ds.roles.cat, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]) }; },
    sql: p => `SELECT ${p.cat}, COUNT(*), ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`,
    blanks: ['cat'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} GROUP BY ${p.cat};`], ['step.agg', `SELECT ${p.cat}, COUNT(*), ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`]]
  },
  {
    key: 'grouporder', ch: 'agg', kind: 'single',
    syntax: 'SELECT {group}, AVG({num}) FROM {table} GROUP BY {group} ORDER BY AVG({num}) DESC;',
    keywords: ['SELECT', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY', 'ORDER BY', 'ASC', 'DESC'],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', f: 'AVG', c: 'price', ord: 'desc' } },
    gen(ds, R) { return { t: ds.table, cat: ds.roles.cat, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]), ord: R.pick(['desc', 'asc']) }; },
    sql: p => `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} ORDER BY ${fn(p.f, p.c)} ${dir(p.ord)};`,
    tie: p => `SELECT ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`,
    blanks: ['ord'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`], ['step.order', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} ORDER BY ${fn(p.f, p.c)} ${dir(p.ord)};`]]
  },
  {
    key: 'having', ch: 'agg', kind: 'single',
    syntax: 'SELECT {group}, AVG({num}) FROM {table} GROUP BY {group} HAVING AVG({num}) >= {value};',
    keywords: ['SELECT', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY', 'HAVING', '>='],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', f: 'AVG', c: 'price', x: 5000 } },
    gen(ds, R, ctx) {
      const f = R.pick(AGG4), c = R.pick([ds.roles.n1, ds.roles.n2]);
      const vals = ctx.values(`SELECT ${fn(f, c)} FROM ${ds.table} GROUP BY ${ds.roles.cat};`).map(r => r[0]).sort((a, b) => a - b);
      if (vals.length < 2) return null;
      const i = R.int(0, vals.length - 2), lo = vals[i], hi = vals[i + 1];
      const x = [niceFloor(hi), Math.floor(hi)].find(v => v > lo && v <= hi);
      if (x === undefined) return null;
      return { t: ds.table, cat: ds.roles.cat, f, c, x };
    },
    sql: p => `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} HAVING ${fn(p.f, p.c)} >= ${p.x};`,
    blanks: ['x'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`], ['step.having', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} HAVING ${fn(p.f, p.c)} >= ${p.x};`]]
  },
  {
    key: 'wherehaving', ch: 'agg', kind: 'single',
    syntax: 'SELECT {group}, COUNT(*) FROM {table} WHERE {col} >= {value} GROUP BY {group} HAVING COUNT(*) >= {n};',
    keywords: ['SELECT', 'COUNT(*)', 'FROM', 'WHERE', '>=', 'GROUP BY', 'HAVING'],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', yr: 'release_year', y: 2020, k: 2 } },
    gen(ds, R, ctx) {
      const yrs = [...new Set(colVals(ds, ds.roles.yr))].sort((a, b) => a - b).slice(1, -1);
      const y = R.pick(yrs);
      const counts = [...new Set(ctx.values(`SELECT COUNT(*) FROM ${ds.table} WHERE ${ds.roles.yr} >= ${y} GROUP BY ${ds.roles.cat};`).map(r => r[0]))].sort((a, b) => a - b);
      if (counts.length < 2) return null;
      const k = R.pick(counts.slice(1));
      if (k < 2) return null;
      return { t: ds.table, cat: ds.roles.cat, yr: ds.roles.yr, y, k };
    },
    sql: p => `SELECT ${p.cat}, COUNT(*) FROM ${p.t} WHERE ${p.yr} >= ${p.y} GROUP BY ${p.cat} HAVING COUNT(*) >= ${p.k};`,
    blanks: ['y', 'k'],
    steps: p => [
      ['step.from', `SELECT * FROM ${p.t};`],
      ['step.where', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.cat};`],
      ['step.group', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} WHERE ${p.yr} >= ${p.y} GROUP BY ${p.cat};`],
      ['step.having', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} WHERE ${p.yr} >= ${p.y} GROUP BY ${p.cat} HAVING COUNT(*) >= ${p.k};`]
    ]
  },

  /* =================== JOIN =================== */
  {
    key: 'inner', ch: 'join', kind: 'join',
    syntax: 'SELECT * FROM {table} INNER JOIN {table} ON {table}.{key} = {table}.{key};',
    keywords: ['SELECT', '*', 'FROM', 'INNER JOIN', 'ON', '='],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    sql: p => `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['id', 'key'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'innercols', ch: 'join', kind: 'join',
    syntax: 'SELECT {table}.{col}, {table}.{col} FROM {table} INNER JOIN {table} ON {cond};',
    keywords: ['SELECT', 'FROM', 'INNER JOIN', 'ON', '=', '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { rc: 'column_b1' }) },
    gen(pair, R) { const p = joinParams(pair); p.rc = R.pick([p.text, p.num]); return p; },
    view: p => ({ c1: `${p.L}.${p.name}`, c2: `${p.R}.${p.rc}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.R}.${p.rc} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['name', 'rc'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.R}.${p.rc} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'innerwhere', ch: 'join', kind: 'join',
    syntax: "SELECT {table}.{col}, ... FROM {table} INNER JOIN {table} ON {cond} WHERE {table}.{col} = '{value}';",
    keywords: ['SELECT', 'FROM', 'INNER JOIN', 'ON', 'WHERE', "= ''", '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { v: 'A' }) },
    gen(pair, R, ctx) {
      const p = joinParams(pair);
      const rows = ctx.values(`SELECT ${p.L}.${p.grp} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`).map(r => r[0]);
      const opts = [...new Set(rows)].filter(v => rows.filter(x => x === v).length < rows.length);
      if (!opts.length) return null;
      p.v = R.pick(opts); return p;
    },
    view: p => ({ c1: `${p.L}.${p.name}`, lg: `${p.L}.${p.grp}`, c2: `${p.R}.${p.num}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.L}.${p.grp}, ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)} WHERE ${p.L}.${p.grp} = ${lit(p.v)};`,
    blanks: ['v'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`], ['step.where', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)} WHERE ${p.L}.${p.grp} = ${lit(p.v)};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.L}.${p.grp}, ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)} WHERE ${p.L}.${p.grp} = ${lit(p.v)};`]]
  },
  {
    key: 'left', ch: 'join', kind: 'join',
    syntax: 'SELECT * FROM {table} LEFT JOIN {table} ON {table}.{key} = {table}.{key};',
    keywords: ['SELECT', '*', 'FROM', 'LEFT JOIN', 'ON', '='],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    sql: p => `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['id', 'key'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'antijoin', ch: 'join', kind: 'join',
    syntax: 'SELECT ... FROM {table} LEFT JOIN {table} ON {cond} WHERE {table}.{key} IS NULL;',
    keywords: ['SELECT', 'FROM', 'LEFT JOIN', 'ON', 'WHERE', 'IS NULL', '.'],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    view: p => ({ c1: `${p.L}.${p.id}`, c2: `${p.L}.${p.name}` }),
    sql: p => `SELECT ${p.L}.${p.id}, ${p.L}.${p.name} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} WHERE ${p.R}.${p.nullcol || p.key} IS NULL;`,
    blanks: ['nullcol'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`], ['step.where', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} WHERE ${p.R}.${p.key} IS NULL;`], ['step.select', `SELECT ${p.L}.${p.id}, ${p.L}.${p.name} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} WHERE ${p.R}.${p.key} IS NULL;`]]
  },
  {
    key: 'leftorder', ch: 'join', kind: 'join',
    syntax: 'SELECT ... FROM {table} LEFT JOIN {table} ON {cond} ORDER BY {table}.{col} DESC LIMIT {n};',
    keywords: ['SELECT', 'FROM', 'LEFT JOIN', 'ON', 'ORDER BY', 'DESC', 'LIMIT', '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { ord: 'desc', k: 3 }) },
    gen(pair, R) { const p = joinParams(pair); p.ord = 'desc'; p.k = R.int(2, 3); return p; },
    view: p => ({ c1: `${p.L}.${p.name}`, c2: `${p.R}.${p.num}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.R}.${p.num} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`,
    tie: p => `SELECT ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['ord', 'k'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`], ['step.order', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)};`], ['step.limit', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.R}.${p.num} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`]]
  }
];

