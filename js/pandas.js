/* =========================================================
 * pandas.js — the Python course (データ編): the same tables as the SQL lessons,
 * handled with pandas. No DOM (tools-next/check.mjs runs every reference answer with CPython + pandas).
 *
 * A lesson: { key, no, sql (the SQL lesson it matches), gen(ds, R) → p, code(p) → the reference answer,
 *             desc(p) → [i18n key, vars], ordered (row order matters), join (two tables) }
 * vars in desc: plain values are shown as code; { k: key, v: vars } is a text of its own (cmp.ge …).
 * A problem: { id, lesson, ds (table name / join key), p, code, demo }
 * The answer is the value of the last line (as in a notebook); results are compared as tables
 * (pyrun.js / py-worker.js normalise them the same way).
 * ========================================================= */
import { makeRng } from './engine.js';
import { SINGLE_DATASETS, JOIN_DATASETS } from './datasets.js';

const q = s => JSON.stringify(String(s));   // a Python string literal: "Comic"
const lit = v => (typeof v === 'number' ? String(v) : q(v));
const colIdx = (ds, c) => ds.columns.findIndex(x => x[0] === c);
const values = (ds, c) => [...new Set(ds.rows.map(r => r[colIdx(ds, c)]).filter(v => v !== null && v !== undefined))];
const midValue = (ds, c, R) => { const v = values(ds, c).sort((a, b) => a - b); return v[R.int(1, Math.max(1, v.length - 2))]; };
const OPS = { ge: '>=', gt: '>', le: '<=', lt: '<', eq: '==', ne: '!=' };
const FUN = { mean: 'AVG', sum: 'SUM', max: 'MAX', min: 'MIN', count: 'COUNT' };
const cmpV = (op, c, v) => ({ k: 'cmp.' + op, v: { c, v } });

export const PD_LESSONS = [
  { key: 'pd_head', no: 1, sql: 'select', ordered: true,
    gen: (ds, R) => ({ t: ds.table, n: R.int(2, 5) }),
    code: p => `${p.t}.head(${p.n})`,
    desc: p => ['pd.d.head', { t: p.t, n: p.n }] },
  { key: 'pd_cols', no: 2, sql: 'select',
    gen: (ds, R) => { const r = ds.roles; return { t: ds.table, a: r.name, b: R.pick([r.cat, r.n1, r.n2]) }; },
    code: p => `${p.t}[[${q(p.a)}, ${q(p.b)}]]`,
    desc: p => ['pd.d.cols', { t: p.t, a: p.a, b: p.b }] },
  { key: 'pd_num', no: 3, sql: 'where',
    gen: (ds, R) => { const c = R.pick([ds.roles.n1, ds.roles.n2]); return { t: ds.table, c, op: R.pick(['ge', 'gt', 'le', 'lt']), v: midValue(ds, c, R) }; },
    code: p => `${p.t}[${p.t}[${q(p.c)}] ${OPS[p.op]} ${p.v}]`,
    desc: p => ['pd.d.filter', { t: p.t, cond: cmpV(p.op, p.c, p.v) }] },
  { key: 'pd_text', no: 4, sql: 'where',
    gen: (ds, R) => ({ t: ds.table, c: ds.roles.cat, op: R.pick(['eq', 'eq', 'ne']), v: R.pick(values(ds, ds.roles.cat)) }),
    code: p => `${p.t}[${p.t}[${q(p.c)}] ${OPS[p.op]} ${q(p.v)}]`,
    desc: p => ['pd.d.filter', { t: p.t, cond: cmpV(p.op, p.c, p.v) }] },
  { key: 'pd_andor', no: 5, sql: 'andor',
    gen: (ds, R) => {   // with &, the text value comes from a row that meets the number condition (never an empty answer)
      const r = ds.roles, op = R.pick(['ge', 'le']), v = midValue(ds, r.n1, R), and = R.next() < 0.6;
      const ok = ds.rows.filter(x => (op === 'ge' ? x[colIdx(ds, r.n1)] >= v : x[colIdx(ds, r.n1)] <= v)).map(x => x[colIdx(ds, r.cat)]);
      return { t: ds.table, n: r.n1, op, v, c: r.cat, w: R.pick(and && ok.length ? ok : values(ds, r.cat)), and };
    },
    code: p => `${p.t}[(${p.t}[${q(p.n)}] ${OPS[p.op]} ${p.v}) ${p.and ? '&' : '|'} (${p.t}[${q(p.c)}] == ${q(p.w)})]`,
    desc: p => [p.and ? 'pd.d.and' : 'pd.d.or', { t: p.t, a: cmpV(p.op, p.n, p.v), b: cmpV('eq', p.c, p.w) }] },
  { key: 'pd_loc', no: 6, sql: 'where',
    gen: (ds, R) => { const r = ds.roles, c = R.pick([r.n1, r.n2]); return { t: ds.table, c, op: R.pick(['ge', 'lt']), v: midValue(ds, c, R), a: r.name }; },
    code: p => `${p.t}.loc[${p.t}[${q(p.c)}] ${OPS[p.op]} ${p.v}, [${q(p.a)}, ${q(p.c)}]]`,
    desc: p => ['pd.d.loc', { t: p.t, cond: cmpV(p.op, p.c, p.v), a: p.a, b: p.c }] },
  { key: 'pd_sort', no: 7, sql: 'orderby', ordered: true,
    gen: (ds, R) => ({ t: ds.table, c: R.pick([ds.roles.n1, ds.roles.n2]), desc: R.next() < 0.5 }),
    code: p => `${p.t}.sort_values(${q(p.c)}${p.desc ? ', ascending=False' : ''})`,
    desc: p => [p.desc ? 'pd.d.sortDesc' : 'pd.d.sortAsc', { t: p.t, c: p.c }] },
  { key: 'pd_top', no: 8, sql: 'limit', ordered: true,
    gen: (ds, R) => ({ t: ds.table, c: R.pick([ds.roles.n1, ds.roles.n2]), n: R.int(2, 4), desc: R.next() < 0.7 }),
    code: p => `${p.t}.sort_values(${q(p.c)}${p.desc ? ', ascending=False' : ''}).head(${p.n})`,
    desc: p => [p.desc ? 'pd.d.topDesc' : 'pd.d.topAsc', { t: p.t, c: p.c, n: p.n }] },
  { key: 'pd_agg', no: 9, sql: 'aggfn',
    gen: (ds, R) => ({ t: ds.table, c: R.pick([ds.roles.n1, ds.roles.n2]), f: R.pick(['mean', 'sum', 'max', 'min']) }),
    code: p => `${p.t}[${q(p.c)}].${p.f}()`,
    desc: p => ['pd.d.agg', { t: p.t, c: p.c, f: { k: 'agg.' + FUN[p.f] } }] },
  { key: 'pd_group', no: 10, sql: 'groupby',
    gen: (ds, R) => ({ t: ds.table, g: ds.roles.cat, c: R.pick([ds.roles.n1, ds.roles.n2]), f: R.pick(['mean', 'sum', 'max', 'min']) }),
    code: p => `${p.t}.groupby(${q(p.g)})[${q(p.c)}].${p.f}()`,
    desc: p => ['pd.d.group', { t: p.t, g: p.g, c: p.c, f: { k: 'agg.' + FUN[p.f] } }] },
  { key: 'pd_count', no: 11, sql: 'groupby',
    gen: ds => ({ t: ds.table, c: ds.roles.cat }),
    code: p => `${p.t}[${q(p.c)}].value_counts()`,
    desc: p => ['pd.d.count', { t: p.t, c: p.c }] },
  { key: 'pd_merge', no: 12, sql: 'inner', join: true,
    gen: ds => ({ l: ds.left.table, r: ds.right.table, a: ds.left.roles.id, b: ds.right.roles.key }),
    code: p => `pd.merge(${p.l}, ${p.r}, left_on=${q(p.a)}, right_on=${q(p.b)})`,
    desc: p => ['pd.d.merge', { l: p.l, r: p.r, a: p.a, b: p.b }] }
];
export const PD_BY_KEY = Object.fromEntries(PD_LESSONS.map(l => [l.key, l]));
export const PD_N = 5;   // practice problems per set

/** the tables a lesson can use */
export const pdSets = lesson => (lesson.join ? JOIN_DATASETS : SINGLE_DATASETS);
const setKey = ds => ds.key || ds.table;
/** one problem: the example (demo) is always on the first table, with a fixed seed */
export function pdProblem(key, seed, demo) {
  const lesson = PD_BY_KEY[key], sets = pdSets(lesson), R = makeRng(`pd|${key}|${seed}`);
  const ds = demo ? sets[0] : sets[R.int(0, sets.length - 1)];
  const p = lesson.gen(ds, R);
  return { id: `py:${key}:${demo ? 'demo' : seed}`, lesson: key, ds: setKey(ds), p, code: lesson.code(p), demo: !!demo, ordered: !!lesson.ordered };
}
/** a set: the example and PD_N practice problems (no two the same) */
export function pdSet(key, seed) {
  const demo = pdProblem(key, 'demo', true), out = [], seen = new Set([demo.code]);
  for (let i = 0; out.length < PD_N && i < PD_N * 6; i++) { const p = pdProblem(key, `${seed}|${i}`); if (!seen.has(p.code)) { seen.add(p.code); out.push(p); } }
  return { demo, items: out };
}
/** up to 12 different problems of a lesson for a quick test (seed = the test's) */
export function pdPool(key, seed) {
  const out = [], seen = new Set();
  for (let n = 0; n < 60 && out.length < 12; n++) { const p = pdProblem(key, `QT${seed}|${n}`); if (!seen.has(p.code)) { seen.add(p.code); out.push(p); } }
  return out;
}
/** the tables a problem needs, as { name: { columns, rows } } (for the Python side) */
export function pdTables(prob) {
  const lesson = PD_BY_KEY[prob.lesson], ds = pdSets(lesson).find(d => setKey(d) === prob.ds);
  const one = t => ({ columns: t.columns.map(c => c[0]), rows: t.rows });
  return lesson.join ? { [ds.left.table]: one(ds.left), [ds.right.table]: one(ds.right) } : { [ds.table]: one(ds) };
}
/** every table the course uses (loaded once into Python) */
export function pdAllTables() {
  const out = {};
  SINGLE_DATASETS.forEach(d => { out[d.table] = { columns: d.columns.map(c => c[0]), rows: d.rows }; });
  JOIN_DATASETS.forEach(d => [d.left, d.right].forEach(t => { out[t.table] = { columns: t.columns.map(c => c[0]), rows: t.rows }; }));
  return out;
}
/** the columns of the problem's tables (for the quick-input chips) */
export function pdColumns(prob) {
  return Object.entries(pdTables(prob)).map(([t, x]) => ({ t, cols: x.columns }));
}

/**
 * Two normalised results the same? (see py-worker.js: { kind: 'table', columns, rows } or { kind: 'value', value })
 * Columns are matched by name (any order); rows in order when it matters, otherwise as a multiset; numbers to 6 places.
 */
export function pdSame(a, b, ordered) {
  if (!a || !b || a.kind !== b.kind) return false;
  const num = x => (typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x);
  if (a.kind === 'value') return typeof a.value === 'number' && typeof b.value === 'number' ? Math.abs(a.value - b.value) < 1e-6 : String(a.value) === String(b.value);
  if (a.columns.length !== b.columns.length || a.rows.length !== b.rows.length) return false;
  let idx = b.columns.map(c => a.columns.indexOf(c));
  if (idx.some(i => i < 0)) idx = b.columns.map((c, i) => i);   // other names (size() instead of value_counts() …): by position
  const ra = a.rows.map(r => JSON.stringify(idx.map(i => num(r[i])))), rb = b.rows.map(r => JSON.stringify(r.map(num)));
  if (ordered) return ra.every((x, i) => x === rb[i]);
  return JSON.stringify(ra.slice().sort()) === JSON.stringify(rb.slice().sort());
}
/** what is different, for the feedback: 'kind' | 'columns' | 'rows' | 'order' | 'values' */
export function pdDiff(got, want, ordered) {
  if (!got || got.kind !== want.kind) return 'kind';
  if (got.kind === 'value') return 'values';
  if (got.columns.length !== want.columns.length) return 'columns';
  if (got.rows.length !== want.rows.length) return 'rows';
  if (ordered && pdSame(got, want, false)) return 'order';
  return 'values';
}
