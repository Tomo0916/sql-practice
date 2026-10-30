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
  { key: 'filter', icon: 'W' },
  { key: 'sort', icon: '↕' },
  { key: 'change', icon: '✎' },
  { key: 'agg', icon: 'Σ' },
  { key: 'join', icon: '⋈' },
  { key: 'analysis', icon: 'x̄' }
];

/* stages without the clause-ordering exercise (for SQL with only one clause) */
const NO_ORDER = ['demo', 'fill', 'write', 'write', 'write', 'write'];
const OPS = ['>=', '>', '<=', '<', '=', '<>'];
export const OP_KEY = { '=': 'eq', '<>': 'ne', '>': 'gt', '>=': 'ge', '<': 'lt', '<=': 'le' };
const cmpOk = (v, op, x) => (op === '=' ? v === x : op === '<>' ? v !== x : op === '>' ? v > x : op === '>=' ? v >= x : op === '<' ? v < x : v <= x);
/** a comparison on a numeric column that keeps some rows but not all */
function pickCmp(ds, R, cols, ops) {
  const c = R.pick(cols);
  const vals = colVals(ds, c), n = vals.length;
  const op = R.pick(ops || OPS);
  const x = op === '=' || op === '<>' ? R.pick(vals) : R.pick(vals.slice().sort((a, b) => a - b).slice(1, -1));
  const k = vals.filter(v => cmpOk(v, op, x)).length;
  if (k < 1 || k > n - 2) return null;
  return { c, op, x };
}
/** "price >= 4800" as a phrase in the reader's language */
/** analysis lessons: the example asks for one variant (want.w), practice picks one */
const pickW = (want, R, opts) => (want && want.w) || R.pick(opts);
const cmpPhrase = (c, op, v) => ['cmp.' + OP_KEY[op], { c, v }];

export const LESSONS = [
  /* =================== BASICS (Lesson 0–3) =================== */
  {
    key: 'intro', no: 0, ch: 'basics', kind: 'quiz',
    stages: ['demo', 'quiz', 'quiz', 'quiz', 'quiz', 'quiz'],
    syntax: '',
    keywords: [],
    demo: { ds: 'products', p: { t: 'products', q: 'cols', ans: 6 } },
    /* questions answered by reading the table: a value, a name, a column, the number of rows */
    gen(ds, R) {
      const r = ds.roles, i = R.int(0, ds.rows.length - 1), row = ds.rows[i];
      const at = col => row[colIndex(ds, col)];
      const q = R.pick(['value', 'value', 'which', 'col', 'rows']);
      if (q === 'value') { const c = R.pick([r.n1, r.n2]); return { t: ds.table, q, name: r.name, v: at(r.name), c, ans: at(c) }; }
      if (q === 'which') { const c = R.pick([r.n1, r.n2]); return { t: ds.table, q, name: r.name, c, x: at(c), ans: at(r.name) }; }
      if (q === 'col') { const c = R.pick([r.name, r.cat]); return { t: ds.table, q, v: at(c), ans: c }; }
      return { t: ds.table, q, ans: ds.rows.length };
    },
    descKey: p => `L.intro.q_${p.q}`,
    sql: p => p.q === 'value' ? `SELECT ${p.c} FROM ${p.t} WHERE ${p.name} = ${lit(p.v)};`
      : p.q === 'which' ? `SELECT ${p.name} FROM ${p.t} WHERE ${p.c} = ${p.x};`
      : p.q === 'rows' ? `SELECT COUNT(*) FROM ${p.t};`
      : `SELECT ${lit(p.ans)};`,
    blanks: []
  },
  {
    key: 'select', no: 1, ch: 'basics', kind: 'single',
    syntax: 'SELECT {col}, {col} FROM {table};',
    keywords: ['SELECT', 'FROM', '*', ','],
    demo: { ds: 'products', p: { t: 'products', c1: 'name', c2: 'price' } },
    gen(ds, R) { const r = ds.roles; return { t: ds.table, c1: r.name, c2: R.pick([r.n1, r.n2, r.cat, r.yr]) }; },
    sql: p => `SELECT ${p.c1}, ${p.c2} FROM ${p.t};`,
    blanks: ['c1', 'c2'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.select', `SELECT ${p.c1}, ${p.c2} FROM ${p.t};`]]
  },
  {
    key: 'types', no: 2, ch: 'basics', kind: 'single', stages: NO_ORDER,
    syntax: "SELECT '{text}', {number};",
    keywords: ['SELECT', "''", ','],
    demo: { ds: 'products', p: { t: 'products', v: 'Tokyo', q: "'Tokyo'", n: 2024 } },
    /* a text value from the table and a number: text needs ' ', numbers do not */
    gen(ds, R) {
      const row = R.pick(ds.rows), r = ds.roles;
      const v = row[colIndex(ds, R.pick([r.cat, r.name]))], n = row[colIndex(ds, R.pick([r.n1, r.yr]))];
      return { t: ds.table, v, q: lit(v), n };
    },
    view: p => ({ q: p.v }),
    sql: p => `SELECT ${p.q}, ${p.n};`,
    blanks: ['q']
  },
  {
    key: 'alias', no: 3, ch: 'basics', kind: 'single', names: true,
    syntax: 'SELECT {col}, {expr} AS {alias} FROM {table};',
    keywords: ['SELECT', 'AS', '*', '+', '-', 'FROM', ','],
    demo: { ds: 'products', p: { t: 'products', name: 'name', expr: 'price * stock', a: 'stock_value' } },
    gen(ds, R) {
      const r = ds.roles, c = R.pick([r.n1, r.n2]);
      const [expr, a] = R.pick([[`${c} * 2`, `double_${c}`], [`${c} * 10`, `${c}_x10`], [`${c} + 100`, `${c}_plus_100`], [`${r.n1} * ${r.n2}`, `${r.n1}_x_${r.n2}`]]);
      return { t: ds.table, name: r.name, expr, a };
    },
    sql: p => `SELECT ${p.name}, ${p.expr} AS ${p.a} FROM ${p.t};`,
    blanks: ['a'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.calc', `SELECT ${p.name}, ${p.expr} FROM ${p.t};`], ['step.alias', `SELECT ${p.name}, ${p.expr} AS ${p.a} FROM ${p.t};`]]
  },

  /* =================== FILTER ROWS (Lesson 4–8) =================== */
  {
    key: 'where', no: 4, ch: 'filter', kind: 'single',
    syntax: 'SELECT {col}, {col} FROM {table} WHERE {col} >= {value};',
    keywords: ['SELECT', 'FROM', 'WHERE', '=', '<>', '>', '>=', '<', '<=', "''"],
    demo: { ds: 'products', p: { t: 'products', name: 'name', c: 'price', op: '>=', v: 4800, vs: '4800' } },
    gen(ds, R) {
      const r = ds.roles;
      if (R.next() < 0.3) {   // text: = or <> on the category
        const g = groupsOf(ds, r.cat).filter(x => x.size < ds.rows.length - 1);
        const v = R.pick(g).value, op = R.pick(['=', '<>']);
        return { t: ds.table, name: r.name, c: r.cat, op, v, vs: lit(v) };
      }
      const m = pickCmp(ds, R, [r.n1, r.n2, r.yr]);
      return m && { t: ds.table, name: r.name, c: m.c, op: m.op, v: m.x, vs: String(m.x) };
    },
    phrases: p => ({ cond: cmpPhrase(p.c, p.op, p.v) }),
    sql: p => `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.c} ${p.op} ${p.vs};`,
    blanks: ['op', 'vs'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.c} ${p.op} ${p.vs};`], ['step.select', `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.c} ${p.op} ${p.vs};`]]
  },
  {
    key: 'andor', no: 5, ch: 'filter', kind: 'single',
    syntax: "SELECT {col} FROM {table} WHERE {cond} AND {cond};   -- OR / NOT",
    keywords: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', '=', "''"],
    demo: { ds: 'products', p: { t: 'products', w: 'and', name: 'name', cat: 'category', a: 'Electronics', c: 'price', op: '<', x: 5000, lg: 'AND' } },
    gen(ds, R) {
      const r = ds.roles, n = ds.rows.length;
      const g = groupsOf(ds, r.cat);
      const w = R.pick(['and', 'and', 'or', 'not']);
      if (w === 'and') {
        const grp = R.pick(g.filter(x => x.size >= 2));
        const m = pickCmp(ds, R, [r.n1, r.n2, r.yr], ['>=', '<', '>', '<=']);
        if (!m) return null;
        const k = ds.rows.filter(row => row[colIndex(ds, r.cat)] === grp.value && cmpOk(row[colIndex(ds, m.c)], m.op, m.x)).length;
        if (k < 1 || k >= grp.size) return null;
        return { t: ds.table, w, name: r.name, cat: r.cat, a: grp.value, c: m.c, op: m.op, x: m.x, lg: 'AND' };
      }
      if (w === 'or') {
        if (g.length < 3) return null;
        const [a, b] = R.shuffle(g).slice(0, 2);
        if (a.size + b.size > n - 1) return null;
        return { t: ds.table, w, name: r.name, cat: r.cat, a: a.value, b: b.value, lg: 'OR' };
      }
      return { t: ds.table, w, name: r.name, cat: r.cat, a: R.pick(g).value, lg: 'NOT' };
    },
    descKey: p => `L.andor.desc_${p.w}`,
    phrases: p => (p.w === 'and' ? { cond: cmpPhrase(p.c, p.op, p.x) } : {}),
    sql: p => p.w === 'and' ? `SELECT ${p.name}, ${p.cat}, ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.a)} ${p.lg} ${p.c} ${p.op} ${p.x};`
      : p.w === 'or' ? `SELECT ${p.name}, ${p.cat} FROM ${p.t} WHERE ${p.cat} = ${lit(p.a)} ${p.lg} ${p.cat} = ${lit(p.b)};`
      : `SELECT ${p.name}, ${p.cat} FROM ${p.t} WHERE ${p.lg} ${p.cat} = ${lit(p.a)};`,
    blanks: ['lg'],
    steps: p => {
      const where = p.w === 'and' ? `${p.cat} = ${lit(p.a)} ${p.lg} ${p.c} ${p.op} ${p.x}` : p.w === 'or' ? `${p.cat} = ${lit(p.a)} ${p.lg} ${p.cat} = ${lit(p.b)}` : `${p.lg} ${p.cat} = ${lit(p.a)}`;
      return [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${where};`], ['step.select', LESSON_SQL.andor(p)]];
    }
  },
  {
    key: 'between', no: 6, ch: 'filter', kind: 'single',
    syntax: 'SELECT * FROM {table} WHERE {col} BETWEEN {min} AND {max};   -- IN (…)',
    keywords: ['SELECT', '*', 'FROM', 'WHERE', 'BETWEEN', 'AND', 'IN', '()', "''"],
    demo: { ds: 'products', p: { t: 'products', c: 'price', lo: 2000, hi: 4000 } },
    gen(ds, R) {
      if (IN_THEMES.has(ds.table)) {   // a list of candidates: IN (…)
        const g = groupsOf(ds, ds.roles.cat);
        if (g.length < 3) return null;
        const [a, b] = R.shuffle(g).slice(0, 2);
        return { t: ds.table, c: ds.roles.cat, a: a.value, b: b.value, list: `${lit(a.value)}, ${lit(b.value)}` };
      }
      const c = R.pick([ds.roles.n1, ds.roles.n2]);
      const v = colVals(ds, c).slice().sort((a, b) => a - b), n = v.length;
      const i = R.int(1, Math.max(1, n - 5)), j = Math.min(n - 2, i + R.int(2, 4));
      const lo = niceFloor(v[i]), hi = niceCeil(v[j]);
      if (!(lo < hi)) return null;
      const cnt = v.filter(x => x >= lo && x <= hi).length;
      if (cnt < 2 || cnt > n - 2) return null;
      return { t: ds.table, c, lo, hi };
    },
    descKey: p => (p.list ? 'L.between.desc_in' : 'L.between.desc'),
    sql: p => (p.list ? `SELECT * FROM ${p.t} WHERE ${p.c} IN (${p.list});` : `SELECT * FROM ${p.t} WHERE ${p.c} BETWEEN ${p.lo} AND ${p.hi};`),
    blanks: p => (p.list ? ['list'] : ['lo', 'hi']),
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', LESSON_SQL.between(p)]]
  },
  {
    key: 'like', no: 7, ch: 'filter', kind: 'single',
    syntax: "SELECT {col}, {col} FROM {table} WHERE {col} LIKE '%{text}%';",
    keywords: ['SELECT', 'FROM', 'WHERE', 'LIKE', "'%%'"],
    demo: { ds: 'products', p: { t: 'products', c1: 'name', c2: 'price', like: 'Pro' } },
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
    key: 'null', no: 8, ch: 'filter', kind: 'single', themes: 'null',
    syntax: 'SELECT {col} FROM {table} WHERE {col} IS NULL;   -- IS NOT NULL',
    keywords: ['SELECT', 'FROM', 'WHERE', 'IS NULL', 'IS NOT NULL'],
    demo: { ds: 'contacts', p: { t: 'contacts', name: 'name', cat: 'email', opt: 'email', isn: 'IS NULL' } },
    gen(ds, R) { const r = ds.roles; return { t: ds.table, name: r.name, cat: r.cat, opt: r.opt, isn: R.pick(['IS NULL', 'IS NOT NULL']) }; },
    descKey: p => (p.isn === 'IS NULL' ? 'L.null.desc' : 'L.null.desc_not'),
    sql: p => `SELECT ${p.name}, ${p.cat} FROM ${p.t} WHERE ${p.opt} ${p.isn};`,
    blanks: ['isn'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.opt} ${p.isn};`], ['step.select', `SELECT ${p.name}, ${p.cat} FROM ${p.t} WHERE ${p.opt} ${p.isn};`]]
  },

  /* =================== SORT, DISTINCT, LIMIT (Lesson 9–11) =================== */
  {
    key: 'orderby', no: 9, ch: 'sort', kind: 'single',
    syntax: 'SELECT {col}, {col} FROM {table} ORDER BY {col} DESC;   -- ASC',
    keywords: ['SELECT', 'FROM', 'ORDER BY', 'ASC', 'DESC', ','],
    demo: { ds: 'products', p: { t: 'products', name: 'name', two: 'category', c: 'price', ord: 'desc' } },
    gen(ds, R) {
      const r = ds.roles, c = R.pick([r.n1, r.n2]);
      return { t: ds.table, name: r.name, two: R.next() < 0.3 ? r.cat : null, c, ord: R.pick(['asc', 'desc']) };
    },
    descKey: p => (p.two ? 'L.orderby.desc_two' : 'L.orderby.desc'),
    sql: p => (p.two ? `SELECT ${p.name}, ${p.two}, ${p.c} FROM ${p.t} ORDER BY ${p.two} ASC, ${p.c} ${dir(p.ord)};` : `SELECT ${p.name}, ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`),
    tie: p => `SELECT ${p.c} FROM ${p.t};`,
    blanks: ['ord'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.order', `SELECT * FROM ${p.t} ORDER BY ${p.two ? p.two + ' ASC, ' : ''}${p.c} ${dir(p.ord)};`], ['step.select', LESSON_SQL.orderby(p)]]
  },
  {
    key: 'distinct', no: 10, ch: 'sort', kind: 'single',
    syntax: 'SELECT DISTINCT {col} FROM {table} ORDER BY {col} ASC;',
    keywords: ['SELECT', 'DISTINCT', 'FROM', 'ORDER BY', 'ASC', 'DESC'],
    demo: { ds: 'products', p: { t: 'products', c: 'category', ord: 'az' } },
    gen(ds, R) { return { t: ds.table, c: ds.roles.cat, ord: R.pick(['az', 'za']) }; },
    sql: p => `SELECT DISTINCT ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`,
    blanks: ['ord'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.select', `SELECT ${p.c} FROM ${p.t};`], ['step.distinct', `SELECT DISTINCT ${p.c} FROM ${p.t};`], ['step.order', `SELECT DISTINCT ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`]]
  },
  {
    key: 'limit', no: 11, ch: 'sort', kind: 'single',
    syntax: 'SELECT {col}, {col} FROM {table} ORDER BY {col} DESC LIMIT {n};   -- OFFSET {skip}',
    keywords: ['SELECT', 'FROM', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET'],
    demo: { ds: 'products', p: { t: 'products', name: 'name', c: 'price', ord: 'desc', k: 3, skip: 0 } },
    gen(ds, R) {
      const r = ds.roles, skip = R.next() < 0.35 ? R.int(2, 4) : 0;
      return { t: ds.table, name: r.name, c: R.pick([r.n1, r.n2]), ord: R.pick(['desc', 'asc']), k: R.int(2, 4), skip, a: skip + 1 };
    },
    descKey: p => (p.skip ? 'L.limit.desc_offset' : 'L.limit.desc'),
    sql: p => `SELECT ${p.name}, ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k}${p.skip ? ` OFFSET ${p.skip}` : ''};`,
    tie: p => `SELECT ${p.c} FROM ${p.t};`,
    blanks: p => (p.skip ? ['k', 'skip'] : ['k']),
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.order', `SELECT * FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`],
      [p.skip ? 'step.offset' : 'step.limit', `SELECT * FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k}${p.skip ? ` OFFSET ${p.skip}` : ''};`], ['step.select', LESSON_SQL.limit(p)]]
  },

  /* =================== CHANGE DATA (Lesson 12–14) =================== */
  {
    key: 'insert', no: 12, ch: 'change', kind: 'dml',
    syntax: 'INSERT INTO {table} ({col}, {col}) VALUES ({value}, {value});',
    keywords: ['INSERT INTO', 'VALUES', '()', ',', "''"],
    demo: { ds: 'products', p: { t: 'products', cols: '(id, name, category, price, stock, release_year)', vals: "(11, 'USB Cable', 'Electronics', 800, 100, 2024)", show: "id = 11, name = 'USB Cable', category = 'Electronics', price = 800, stock = 100, release_year = 2024" } },
    gen(ds, R) {
      if (!ds.newRows) return null;
      const row = R.pick(ds.newRows), r = ds.roles;
      const all = ds.columns.map(c => c[0]);
      const use = R.next() < 0.5 ? all : ['id', r.name, r.cat, r.n1];
      const v = use.map(c => row[all.indexOf(c)]);
      return { t: ds.table, cols: `(${use.join(', ')})`, vals: `(${v.map(lit).join(', ')})`, show: use.map((c, i) => `${c} = ${lit(v[i])}`).join(', ') };
    },
    view: p => ({ vals: p.show }),
    sql: p => `INSERT INTO ${p.t} ${p.cols} VALUES ${p.vals};`,
    blanks: ['cols'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.insert', `INSERT INTO ${p.t} ${p.cols} VALUES ${p.vals};`]]
  },
  {
    key: 'update', no: 13, ch: 'change', kind: 'dml',
    syntax: 'UPDATE {table} SET {col} = {value} WHERE {cond};',
    keywords: ['UPDATE', 'SET', 'WHERE', '=', '+', "''"],
    demo: { ds: 'products', p: { t: 'products', w: 'one', id: 1, who: 'Wireless Mouse', c: 'price', x: 1200, set: 'price = 1200', where: 'id = 1' } },
    gen(ds, R) {
      const r = ds.roles;
      if (R.next() < 0.6) {   // one row, chosen by id
        const row = R.pick(ds.rows), c = R.pick([r.n1, r.n2]);
        const old = row[colIndex(ds, c)], x = old + niceStep(old) * R.pick([1, 2, -1]);
        if (x <= 0) return null;
        return { t: ds.table, w: 'one', id: row[0], who: row[colIndex(ds, r.name)], c, x, set: `${c} = ${x}`, where: `id = ${row[0]}` };
      }
      const grp = R.pick(groupsOf(ds, r.cat).filter(g => g.size >= 2)), c = r.n1;
      const k = niceStep(Math.min(...colVals(ds, c)));
      return { t: ds.table, w: 'many', cat: r.cat, v: grp.value, c, k, set: `${c} = ${c} + ${k}`, where: `${r.cat} = ${lit(grp.value)}` };
    },
    descKey: p => `L.update.desc_${p.w}`,
    sql: p => `UPDATE ${p.t} SET ${p.set} WHERE ${p.where};`,
    blanks: ['set'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.where};`], ['step.update', `UPDATE ${p.t} SET ${p.set} WHERE ${p.where};`]]
  },
  {
    key: 'delete', no: 14, ch: 'change', kind: 'dml',
    syntax: 'DELETE FROM {table} WHERE {cond};',
    keywords: ['DELETE FROM', 'WHERE', '=', '<', '>=', "''"],
    demo: { ds: 'products', p: { t: 'products', c: 'stock', op: '<', v: 15, vs: '15' } },
    gen(ds, R) {
      const r = ds.roles, w = R.pick(['id', 'cmp', 'cmp', 'cat']);
      if (w === 'id') { const row = R.pick(ds.rows); return { t: ds.table, c: 'id', op: '=', v: row[0], vs: String(row[0]) }; }
      if (w === 'cat') { const g = R.pick(groupsOf(ds, r.cat).filter(x => x.size <= 4)); return g && { t: ds.table, c: r.cat, op: '=', v: g.value, vs: lit(g.value) }; }
      const m = pickCmp(ds, R, [r.n1, r.n2, r.yr], ['<', '>=', '<=', '>']);
      return m && { t: ds.table, c: m.c, op: m.op, v: m.x, vs: String(m.x) };
    },
    phrases: p => ({ cond: cmpPhrase(p.c, p.op, p.v) }),
    sql: p => `DELETE FROM ${p.t} WHERE ${p.c} ${p.op} ${p.vs};`,
    blanks: ['vs'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.c} ${p.op} ${p.vs};`], ['step.delete', `DELETE FROM ${p.t} WHERE ${p.c} ${p.op} ${p.vs};`]]
  },

  /* =================== AGGREGATION (Lesson 15–18) =================== */
  {
    key: 'aggfn', no: 15, ch: 'agg', kind: 'single',
    syntax: 'SELECT COUNT(*), SUM({col}) FROM {table};   -- SUM / AVG / MAX / MIN',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM'],
    demo: { ds: 'products', p: { t: 'products', f: 'AVG', c: 'price' } },
    gen(ds, R) { return { t: ds.table, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]) }; },
    sql: p => `SELECT COUNT(*), ${fn(p.f, p.c)} FROM ${p.t};`,
    blanks: ['f'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.agg', `SELECT COUNT(*), ${fn(p.f, p.c)} FROM ${p.t};`]]
  },
  {
    key: 'groupby', no: 16, ch: 'agg', kind: 'single',
    syntax: 'SELECT {group}, COUNT(*), AVG({num}) FROM {table} GROUP BY {group};',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY'],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', f: 'AVG', c: 'price' } },
    gen(ds, R) { return { t: ds.table, cat: ds.roles.cat, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]) }; },
    sql: p => `SELECT ${p.cat}, COUNT(*), ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`,
    blanks: ['cat'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} GROUP BY ${p.cat};`], ['step.agg', `SELECT ${p.cat}, COUNT(*), ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`]]
  },
  {
    key: 'having', no: 17, ch: 'agg', kind: 'single',
    syntax: 'SELECT {group}, AVG({num}) FROM {table} GROUP BY {group} HAVING AVG({num}) >= {value};',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY', 'HAVING', '>='],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', f: 'COUNT', c: 'price', x: 2 } },
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
    key: 'wherehaving', no: 18, ch: 'agg', kind: 'single',
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
    key: 'inner', no: 29, ch: 'join', kind: 'join',
    syntax: 'SELECT * FROM {table} INNER JOIN {table} ON {table}.{key} = {table}.{key};',
    keywords: ['SELECT', '*', 'FROM', 'INNER JOIN', 'ON', '='],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    sql: p => `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['id', 'key'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'innercols', no: 30, ch: 'join', kind: 'join',
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
    key: 'innerwhere', no: 31, ch: 'join', kind: 'join',
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
    key: 'left', no: 32, ch: 'join', kind: 'join',
    syntax: 'SELECT * FROM {table} LEFT JOIN {table} ON {table}.{key} = {table}.{key};',
    keywords: ['SELECT', '*', 'FROM', 'LEFT JOIN', 'ON', '='],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    sql: p => `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['id', 'key'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'antijoin', no: 33, ch: 'join', kind: 'join',
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
    key: 'leftorder', no: 34, ch: 'join', kind: 'join',
    syntax: 'SELECT ... FROM {table} LEFT JOIN {table} ON {cond} ORDER BY {table}.{col} DESC LIMIT {n};',
    keywords: ['SELECT', 'FROM', 'LEFT JOIN', 'ON', 'ORDER BY', 'DESC', 'LIMIT', '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { ord: 'desc', k: 3 }) },
    gen(pair, R) { const p = joinParams(pair); p.ord = 'desc'; p.k = R.int(2, 3); return p; },
    view: p => ({ c1: `${p.L}.${p.name}`, c2: `${p.R}.${p.num}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.R}.${p.num} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`,
    tie: p => `SELECT ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['ord', 'k'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`], ['step.order', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)};`], ['step.limit', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.R}.${p.num} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`]]
  },

  /* =================== DATA ANALYSIS (course A, units 1–6) ===================
   * Examples use Kumo Mart (kumo_*); practice uses other businesses (analysis-data.js).
   * The answer SQL is also what the Excel / Python guides must reproduce. */
  {
    key: 'an_overview', no: 'A1', ch: 'analysis', kind: 'single', themes: 'analysis', stages: NO_ORDER,
    syntax: 'SELECT COUNT(*), MIN({col}), MAX({col}) FROM {table};',
    keywords: ['SELECT', 'COUNT(*)', 'MIN()', 'MAX()', 'FROM', 'AS'],
    demo: { ds: 'kumo_orders' },
    gen(ds, R, ctx, want) { const r = ds.roles; return { t: ds.table, v: r.v, dt: r.dt, f1: 'MIN', f2: 'MAX' }; },
    sql: p => `SELECT COUNT(*) AS n_rows, ${p.f1}(${p.v}) AS min_${p.v}, ${p.f2}(${p.v}) AS max_${p.v}, MIN(${p.dt}) AS first_date, MAX(${p.dt}) AS last_date FROM ${p.t};`,
    blanks: ['f1', 'f2'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.agg', LESSON_SQL.an_overview(p)]]
  },
  {
    key: 'an_missing', no: 'A2', ch: 'analysis', kind: 'single', themes: 'analysis', stages: NO_ORDER,
    syntax: 'SELECT COUNT(*), COUNT({col}), COUNT(DISTINCT {col}) FROM {table};',
    keywords: ['SELECT', 'COUNT(*)', 'COUNT()', 'DISTINCT', 'ROUND()', 'FROM', 'AS'],
    demo: { ds: 'kumo_customers', p: { w: 'null' } },
    gen(ds, R, ctx, want) { const r = ds.roles; return { t: ds.table, w: pickW(want, R, ['null', 'null', 'dup']), opt: r.opt, name: r.name, k: '100.0', dist: 'DISTINCT' }; },
    descKey: p => `L.an_missing.desc_${p.w}`,
    sql: p => p.w === 'null'
      ? `SELECT COUNT(*) AS n_rows, COUNT(${p.opt}) AS filled, COUNT(*) - COUNT(${p.opt}) AS missing, ROUND(${p.k} * (COUNT(*) - COUNT(${p.opt})) / COUNT(*), 1) AS missing_pct FROM ${p.t};`
      : `SELECT COUNT(${p.name}) AS n_rows, COUNT(${p.dist} ${p.name}) AS unique_${p.name} FROM ${p.t};`,
    blanks: p => (p.w === 'null' ? ['k'] : ['dist']),
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.agg', LESSON_SQL.an_missing(p)]]
  },
  {
    key: 'an_center', no: 'A3', ch: 'analysis', kind: 'single', themes: 'analysis', stages: NO_ORDER,
    syntax: 'SELECT AVG({col}), (SELECT {col} FROM {table} ORDER BY {col} LIMIT 1 OFFSET {n}) FROM {table};',
    keywords: ['SELECT', 'AVG()', 'ROUND()', 'FROM', 'ORDER BY', 'LIMIT', 'OFFSET', 'GROUP BY', 'COUNT(*)', 'DESC', '()', 'AS'],
    demo: { ds: 'kumo_orders', p: { w: 'mid' } },
    gen(ds, R, ctx, want) {
      const r = ds.roles, n = ds.rows.length, w = pickW(want, R, ['mid', 'mid', 'mode']);
      if (w === 'mode') {   // the most common value must be one value only
        const top = ctx.values(`SELECT COUNT(*) AS c FROM ${ds.table} GROUP BY ${r.v2} ORDER BY c DESC LIMIT 2;`);
        if (top.length > 1 && top[0][0] === top[1][0]) return null;
        return { t: ds.table, w, v2: r.v2, ord: 'DESC' };
      }
      return { t: ds.table, w, v: r.v, n, k: (n - 1) / 2, pos: (n + 1) / 2 };
    },
    descKey: p => `L.an_center.desc_${p.w}`,
    sql: p => p.w === 'mode'
      ? `SELECT ${p.v2}, COUNT(*) AS n FROM ${p.t} GROUP BY ${p.v2} ORDER BY n ${p.ord} LIMIT 1;`
      : `SELECT ROUND(AVG(${p.v}), 1) AS mean_${p.v}, (SELECT ${p.v} FROM ${p.t} ORDER BY ${p.v} LIMIT 1 OFFSET ${p.k}) AS median_${p.v} FROM ${p.t};`,
    blanks: p => (p.w === 'mode' ? ['ord'] : ['k']),
    steps: p => p.w === 'mode'
      ? [['step.from', `SELECT * FROM ${p.t};`], ['step.group', `SELECT ${p.v2}, COUNT(*) AS n FROM ${p.t} GROUP BY ${p.v2};`], ['step.order', LESSON_SQL.an_center(p)]]
      : [['step.from', `SELECT * FROM ${p.t};`], ['step.order', `SELECT ${p.v} FROM ${p.t} ORDER BY ${p.v};`], ['step.sub', LESSON_SQL.an_center(p)]],
    stat: 'center'
  },
  {
    key: 'an_spread', no: 'A4', ch: 'analysis', kind: 'single', themes: 'analysis', stages: NO_ORDER,
    syntax: 'SELECT {group}, SQRT((SUM({col} * {col}) - 1.0 * SUM({col}) * SUM({col}) / COUNT(*)) / (COUNT(*) - 1)) FROM {table} GROUP BY {group};',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MIN()', 'MAX()', 'SQRT()', 'ROUND()', 'FROM', 'GROUP BY', 'ORDER BY', 'AS', '()'],
    demo: { ds: 'kumo_orders', p: { w: 'sd' } },
    gen(ds, R, ctx, want) {
      const r = ds.roles, w = pickW(want, R, ['sd', 'sd', 'range']);
      const p = { t: ds.table, w, g: r.g, v: r.v, dn: 'COUNT(*) - 1', rg: `MAX(${r.v}) - MIN(${r.v})` };
      const vals = ctx.values(LESSON_SQL.an_spread(p)).map(x => x[x.length - 1]);
      return new Set(vals).size === vals.length ? p : null;   // no ties in the sorted column
    },
    descKey: p => `L.an_spread.desc_${p.w}`,
    sql: p => p.w === 'range'
      ? `SELECT ${p.g}, MIN(${p.v}) AS min_${p.v}, MAX(${p.v}) AS max_${p.v}, ${p.rg} AS range_${p.v} FROM ${p.t} GROUP BY ${p.g} ORDER BY range_${p.v};`
      : `SELECT ${p.g}, COUNT(*) AS n, ROUND(AVG(${p.v}), 1) AS mean_${p.v}, ROUND(SQRT((SUM(${p.v} * ${p.v}) - 1.0 * SUM(${p.v}) * SUM(${p.v}) / COUNT(*)) / (${p.dn})), 1) AS sd_${p.v} FROM ${p.t} GROUP BY ${p.g} ORDER BY sd_${p.v};`,
    blanks: p => (p.w === 'range' ? ['rg'] : ['dn']),
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.g};`], ['step.group', `SELECT ${p.g}, COUNT(*) AS n, ROUND(AVG(${p.v}), 1) AS mean_${p.v} FROM ${p.t} GROUP BY ${p.g};`], ['step.agg', LESSON_SQL.an_spread(p)]],
    chart: p => ({ type: 'bar', label: 0, value: p.w === 'range' ? 3 : 3 }),
    stat: 'spread'
  },
  {
    key: 'an_hist', no: 'A5', ch: 'analysis', kind: 'single', themes: 'analysis', stages: NO_ORDER,
    syntax: 'SELECT FLOOR(1.0 * {col} / {width}) * {width} AS bin, COUNT(*) FROM {table} GROUP BY bin ORDER BY bin;',
    keywords: ['SELECT', 'FLOOR()', 'COUNT(*)', 'ROUND()', 'FROM', 'GROUP BY', 'ORDER BY', 'AS', '()'],
    demo: { ds: 'kumo_orders', p: { w: 'bin' } },
    gen(ds, R, ctx, want) {
      const r = ds.roles, w = pickW(want, R, ['bin', 'bin', 'freq']);
      return w === 'bin' ? { t: ds.table, w, v: r.v, step: ds.binStep, fl: 'FLOOR' } : { t: ds.table, w, v2: r.v2, sub: `(SELECT COUNT(*) FROM ${ds.table})` };
    },
    descKey: p => `L.an_hist.desc_${p.w}`,
    sql: p => p.w === 'freq'
      ? `SELECT ${p.v2}, COUNT(*) AS n, ROUND(100.0 * COUNT(*) / ${p.sub}, 1) AS pct FROM ${p.t} GROUP BY ${p.v2} ORDER BY ${p.v2};`
      : `SELECT ${p.fl}(1.0 * ${p.v} / ${p.step}) * ${p.step} AS bin, COUNT(*) AS n FROM ${p.t} GROUP BY bin ORDER BY bin;`,
    blanks: p => (p.w === 'freq' ? ['sub'] : ['fl']),
    steps: p => p.w === 'freq'
      ? [['step.from', `SELECT * FROM ${p.t};`], ['step.group', `SELECT ${p.v2}, COUNT(*) AS n FROM ${p.t} GROUP BY ${p.v2} ORDER BY ${p.v2};`], ['step.sub', LESSON_SQL.an_hist(p)]]
      : [['step.from', `SELECT * FROM ${p.t};`], ['step.calc', `SELECT ${p.v}, ${p.fl}(1.0 * ${p.v} / ${p.step}) * ${p.step} AS bin FROM ${p.t};`], ['step.group', LESSON_SQL.an_hist(p)]],
    chart: p => ({ type: 'hist', label: 0, value: 1, step: p.step || 1 }),
    stat: 'hist'
  },
  {
    key: 'an_zscore', no: 'A6', ch: 'analysis', kind: 'single', themes: 'analysis', stages: NO_ORDER,
    syntax: 'SELECT {col}, ROUND(({col} - {mean}) / {sd}, 2) AS z FROM {table} ORDER BY z DESC LIMIT 5;',
    keywords: ['SELECT', 'ROUND()', 'ABS()', 'COUNT(*)', 'FROM', 'WHERE', 'ORDER BY', 'DESC', 'LIMIT', 'AS', '()', '>='],
    demo: { ds: 'kumo_orders', p: { w: 'top' } },
    gen(ds, R, ctx, want) {
      const r = ds.roles, w = pickW(want, R, ['top', 'top', 'count']);
      const [m, s] = ctx.values(`SELECT ROUND(AVG(${r.v}), 1), ROUND(SQRT((SUM(${r.v} * ${r.v}) - 1.0 * SUM(${r.v}) * SUM(${r.v}) / COUNT(*)) / (COUNT(*) - 1)), 1) FROM ${ds.table};`)[0];
      const p = { t: ds.table, w, id: r.id, v: r.v, m: Number(m).toFixed(1), s: Number(s).toFixed(1), ab: 'ABS' };   // always with a decimal point, so the division is not an integer division
      if (w === 'top') { const z = ctx.values(`SELECT ${r.v} FROM ${ds.table} ORDER BY ${r.v} DESC LIMIT 6;`).map(x => x[0]); if (z[4] === z[5]) return null; }
      return p;
    },
    descKey: p => `L.an_zscore.desc_${p.w}`,
    sql: p => p.w === 'count'
      ? `SELECT COUNT(*) AS outliers FROM ${p.t} WHERE ${p.ab}(${p.v} - ${p.m}) / ${p.s} >= 2;`
      : `SELECT ${p.id}, ${p.v}, ROUND((${p.v} - ${p.m}) / ${p.s}, 2) AS z FROM ${p.t} ORDER BY z DESC LIMIT 5;`,
    blanks: p => (p.w === 'count' ? ['ab'] : ['m', 's']),
    steps: p => p.w === 'count'
      ? [['step.from', `SELECT * FROM ${p.t};`], ['step.calc', `SELECT ${p.id}, ${p.v}, ROUND((${p.v} - ${p.m}) / ${p.s}, 2) AS z FROM ${p.t};`], ['step.where', LESSON_SQL.an_zscore(p)]]
      : [['step.from', `SELECT * FROM ${p.t};`], ['step.calc', `SELECT ${p.id}, ${p.v}, ROUND((${p.v} - ${p.m}) / ${p.s}, 2) AS z FROM ${p.t};`], ['step.order', LESSON_SQL.an_zscore(p)]],
    stat: 'z'
  }
];

/** themes where Lesson 6 asks for IN (…) instead of BETWEEN */
const IN_THEMES = new Set(['menu', 'hotels', 'courses']);
/** the answer SQL of a lesson by key (used inside steps) */
const LESSON_SQL = Object.fromEntries(LESSONS.map(l => [l.key, l.sql]));
