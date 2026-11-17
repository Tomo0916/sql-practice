/* =========================================================
 * clauses.js — the clause quiz (句ごとの基礎クイズ) for beginners:
 * one clause at a time (SELECT, FROM, WHERE, ORDER BY, LIMIT, GROUP BY, HAVING),
 * multiple choice, a new set of questions every time (tables and values change).
 * No DOM (tools-next/check.mjs tests it). Texts are keys (cq.*), so the language
 * can change in the middle of a quiz.
 *
 * Kinds of question:
 *   role   what does this clause do?            (choices: roles)
 *   which  which clause does this?               (choices: keywords)
 *   blank  which word goes in the blank?         (choices: keywords)
 *   right  which SQL is written correctly?       (choices: SQL, three have one mistake)
 *   read   what does this SQL get?               (choices: columns / tables / rows / order …)
 *   seq    the order the clauses are written in  (only in the mixed set)
 * A choice: { kw } keyword · { sql } · { code } · { tx: key, v: vars, wrap? } a text with values
 *   (wrap: a key with {cond} that the text goes into).
 * progress.cq = { <set>: { n, best, last } }
 * ========================================================= */
import { makeRng } from './engine.js';
import { SINGLE_DATASETS } from './datasets.js';

export const CLAUSES = ['select', 'from', 'where', 'order', 'limit', 'group', 'having'];
export const CQ_SETS = [...CLAUSES, 'all'];
export const KW = { select: 'SELECT', from: 'FROM', where: 'WHERE', order: 'ORDER BY', limit: 'LIMIT', group: 'GROUP BY', having: 'HAVING' };
export const WRITE_ORDER = ['select', 'from', 'where', 'group', 'having', 'order', 'limit'];
export const CQ_N = 8;
export const BLANK = '＿＿＿';
/** the step of the root drill (基礎の型) that practises writing the clause */
export const CQ_BASIC = { select: 'cols', from: 'cols', where: 'wnum', order: 'order', limit: 'limit', group: 'groupby', having: 'having', all: 'cols' };
/** in the chapters: the quiz at the end of each chapter */
export const CHAPTER_QUIZ = { basics: ['select', 'from'], filter: ['where'], sort: ['order', 'limit'], agg: ['group', 'having', 'all'] };
/** a short example of each clause, for the list */
export const CQ_EXAMPLE = {
  select: 'SELECT name, price FROM products;',
  from: 'SELECT * FROM products;',
  where: 'SELECT name FROM products WHERE price >= 1000;',
  order: 'SELECT name, price FROM products ORDER BY price DESC;',
  limit: 'SELECT name FROM products ORDER BY price DESC LIMIT 3;',
  group: 'SELECT category, COUNT(*) FROM products GROUP BY category;',
  having: 'SELECT category, COUNT(*) FROM products GROUP BY category HAVING COUNT(*) >= 3;'
};

const SETS = SINGLE_DATASETS.filter(d => d.roles && d.roles.name && d.roles.cat && d.roles.n1 && d.roles.n2);
const lit = v => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const colOf = (ds, c) => ds.columns.findIndex(x => x[0] === c);
const valuesOf = (ds, c) => [...new Set(ds.rows.map(r => r[colOf(ds, c)]).filter(v => v !== null && v !== undefined))];
const OPS = { ge: '>=', gt: '>', le: '<=', lt: '<' };

/** the parts of one question's SQL: a table and values from it */
function scene(R) {
  const ds = R.pick(SETS), r = ds.roles, nums = valuesOf(ds, r.n1).sort((a, b) => a - b), cats = valuesOf(ds, r.cat);
  const v = nums[R.int(1, Math.max(1, nums.length - 2))], cat = R.pick(cats);
  const counts = cats.map(c => ds.rows.filter(x => x[colOf(ds, r.cat)] === c).length);
  return { ds, t: ds.table, name: r.name, cat: r.cat, n1: r.n1, n2: r.n2, v, catv: cat, otherCat: R.pick(cats.filter(c => c !== cat)) || cat, k: R.int(2, 4), h: Math.max(2, Math.min(...counts) + R.int(0, 1)) };
}
/** the SQL of a clause in a scene (the one the questions are about) */
function sqlOf(c, s, o = {}) {
  const sel = `SELECT ${s.name}, ${s.n1} FROM ${s.t}`;
  if (c === 'select' || c === 'from') return `${sel};`;
  if (c === 'where') return o.text ? `SELECT ${s.name}, ${s.cat} FROM ${s.t} WHERE ${s.cat} = ${lit(s.catv)};` : `${sel} WHERE ${s.n1} ${OPS[o.op || 'ge']} ${s.v};`;
  if (c === 'order') return `${sel} ORDER BY ${s.n1} ${o.asc ? 'ASC' : 'DESC'};`;
  if (c === 'limit') return `${sel} ORDER BY ${s.n1} ${o.asc ? 'ASC' : 'DESC'} LIMIT ${s.k};`;
  if (c === 'group') return o.sum ? `SELECT ${s.cat}, SUM(${s.n1}) FROM ${s.t} GROUP BY ${s.cat};` : `SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP BY ${s.cat};`;
  return `SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP BY ${s.cat} HAVING COUNT(*) ${OPS[o.op || 'ge']} ${s.h};`;
}
/** SQL with one mistake each: the wrong choices of a "which is correct?" question (all of them fail when run) */
function wrongOf(c, s) {
  const sel = `SELECT ${s.name}, ${s.n1}`;
  if (c === 'select') return [`SELECT ${s.name}, ${s.n1}, FROM ${s.t};`, `FROM ${s.t} SELECT ${s.name}, ${s.n1};`, `SELECT FROM ${s.t} ${s.name}, ${s.n1};`, `${s.name}, ${s.n1} SELECT FROM ${s.t};`];
  if (c === 'from') return [`${sel} ${s.t};`, `${sel} FROM;`, `${sel} TABLE ${s.t};`, `SELECT FROM ${s.t};`];
  if (c === 'where') return [`${sel} WHERE ${s.n1} >= ${s.v} FROM ${s.t};`, `${sel} FROM ${s.t} WHERE ${s.n1} => ${s.v};`, `${sel} FROM ${s.t} WHERE ${s.n1} >=;`, `${sel} FROM ${s.t} WHERE >= ${s.v};`];
  if (c === 'order') return [`${sel} FROM ${s.t} ORDER ${s.n1} DESC;`, `${sel} FROM ${s.t} ORDER BY DESC ${s.n1};`, `${sel} ORDER BY ${s.n1} DESC FROM ${s.t};`, `${sel} FROM ${s.t} SORT BY ${s.n1} DESC;`];
  if (c === 'limit') return [`${sel} FROM ${s.t} LIMIT ${s.k} ORDER BY ${s.n1} DESC;`, `${sel} FROM ${s.t} ORDER BY ${s.n1} DESC LIMIT = ${s.k};`, `${sel} LIMIT ${s.k} FROM ${s.t} ORDER BY ${s.n1} DESC;`, `${sel} FROM ${s.t} ORDER BY ${s.n1} DESC LIMIT;`];
  if (c === 'group') return [`SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP ${s.cat};`, `SELECT ${s.cat}, COUNT(*) GROUP BY ${s.cat} FROM ${s.t};`, `SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP BY;`, `SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP BY COUNT(*);`];
  return [`SELECT ${s.cat}, COUNT(*) FROM ${s.t} WHERE COUNT(*) >= ${s.h} GROUP BY ${s.cat};`, `SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP BY ${s.cat} WHERE COUNT(*) >= ${s.h};`, `SELECT ${s.cat}, COUNT(*) FROM ${s.t} GROUP BY ${s.cat} HAVING >= ${s.h};`, `SELECT ${s.cat}, COUNT(*) FROM ${s.t} HAVING COUNT(*) >= ${s.h} GROUP ${s.cat};`];
}
/** a "what does it get?" question: the SQL, what to ask, the right choice first */
function readOf(c, s, R) {
  if (c === 'select') {
    const star = R.next() < 0.3;
    return star ? { sql: `SELECT * FROM ${s.t};`, ask: 'cq.ask.cols', choices: [{ tx: 'cq.r.all' }, { code: s.name }, { code: `${s.name}, ${s.n1}` }, { code: `${s.n1}, ${s.n2}` }] }
      : { sql: sqlOf('select', s), ask: 'cq.ask.cols', choices: [{ code: `${s.name}, ${s.n1}` }, { code: s.name }, { code: `${s.n1}, ${s.n2}` }, { tx: 'cq.r.all' }] };
  }
  if (c === 'from') { const others = R.shuffle(SETS.filter(d => d.table !== s.t)).slice(0, 3); return { sql: sqlOf('from', s), ask: 'cq.ask.table', choices: [{ code: s.t }, ...others.map(d => ({ code: d.table }))] }; }
  if (c === 'where') {
    if (R.next() < 0.4) return { sql: sqlOf('where', s, { text: true }), ask: 'cq.ask.rows', choices: [['eq', s.catv], ['ne', s.catv], ['eq', s.otherCat], ['ne', s.otherCat]].map(([o, v]) => ({ tx: 'cmp.' + o, v: { c: s.cat, v }, wrap: 'cq.r.rows' })) };
    const op = R.pick(Object.keys(OPS));
    return { sql: sqlOf('where', s, { op }), ask: 'cq.ask.rows', choices: [op, ...Object.keys(OPS).filter(x => x !== op)].map(x => ({ tx: 'cmp.' + x, v: { c: s.n1, v: s.v }, wrap: 'cq.r.rows' })) };
  }
  if (c === 'order') { const asc = R.next() < 0.5, k = asc ? 'cq.r.asc' : 'cq.r.desc', o = asc ? 'cq.r.desc' : 'cq.r.asc'; return { sql: sqlOf('order', s, { asc }), ask: 'cq.ask.sort', choices: [{ tx: k, v: { c: s.n1 } }, { tx: o, v: { c: s.n1 } }, { tx: k, v: { c: s.name } }, { tx: o, v: { c: s.name } }] }; }
  if (c === 'limit') { const asc = R.next() < 0.3, v = { c: s.n1, n: s.k }; return { sql: sqlOf('limit', s, { asc }), ask: 'cq.ask.rows', choices: [asc ? 'bottom' : 'top', asc ? 'top' : 'bottom', 'nth', 'skip'].map(k => ({ tx: 'cq.r.' + k, v })) }; }
  if (c === 'group') {
    const sum = R.next() < 0.4;
    return sum ? { sql: sqlOf('group', s, { sum }), ask: 'cq.ask.get', choices: [{ tx: 'cq.r.sumBy', v: { c: s.cat, n: s.n1 } }, { tx: 'cq.r.sumAll', v: { n: s.n1 } }, { tx: 'cq.r.countBy', v: { c: s.cat } }, { tx: 'cq.r.sumBy', v: { c: s.cat, n: s.n2 } }] }
      : { sql: sqlOf('group', s), ask: 'cq.ask.get', choices: [{ tx: 'cq.r.countBy', v: { c: s.cat } }, { tx: 'cq.r.countAll' }, { tx: 'cq.r.sumBy', v: { c: s.cat, n: s.n1 } }, { tx: 'cq.r.countBy', v: { c: s.name } }] };
  }
  const op = R.pick(Object.keys(OPS)), H = { ge: 'hge', gt: 'hgt', le: 'hle', lt: 'hlt' };
  return { sql: sqlOf('having', s, { op }), ask: 'cq.ask.groups', choices: [op, ...Object.keys(OPS).filter(x => x !== op)].map(x => ({ tx: 'cq.r.' + H[x], v: { c: s.cat, n: s.h } })) };
}
/** a clause's SQL with its keyword as the blank */
function blankOf(c, s, R) {
  const o = c === 'where' ? { text: R.next() < 0.4 } : c === 'order' || c === 'limit' ? { asc: R.next() < 0.3 } : {};
  const sql = sqlOf(c, s, o), kw = KW[c], at = sql.indexOf(c === 'select' ? 'SELECT' : ` ${kw} `) + (c === 'select' ? 0 : 1);
  return { sql: sql.slice(0, at) + BLANK + sql.slice(at + kw.length), full: sql };
}
// keywords that would also work (or nearly) in the blank are not offered
const NOT = { select: ['from'], from: ['select'], where: ['having', 'order', 'group'], order: ['group'], group: ['order', 'where', 'having'], having: ['order'] };
const keyChoices = (c, R) => [{ kw: KW[c] }, ...R.shuffle(CLAUSES.filter(x => x !== c && !(NOT[c] || []).includes(x))).slice(0, 3).map(x => ({ kw: KW[x] }))];
const roleChoices = (c, R) => [{ tx: 'cq.role.' + c }, ...R.shuffle(CLAUSES.filter(x => x !== c)).slice(0, 3).map(x => ({ tx: 'cq.role.' + x }))];
/** the order the clauses are written in: the right one first, then three with two clauses swapped */
function seqOf(R) {
  const n = R.int(4, 6), keep = WRITE_ORDER.slice(0, 2).concat(R.shuffle(WRITE_ORDER.slice(2)).slice(0, n - 2)), right = WRITE_ORDER.filter(x => keep.includes(x));
  const swaps = new Set(), out = [];
  for (let t = 0; t < 40 && out.length < 3; t++) {
    const i = R.int(0, right.length - 2), j = R.int(i + 1, right.length - 1), w = right.slice(); [w[i], w[j]] = [w[j], w[i]];
    const k = w.join(); if (!swaps.has(k)) { swaps.add(k); out.push(w); }
  }
  const txt = a => a.map(x => KW[x]).join(' → ');
  return { choices: [{ code: txt(right) }, ...out.map(w => ({ code: txt(w) }))], full: null };
}

/** one question: a clause (or 'seq'), a kind, a seed → { id, clause, kind, ask, sql, shown, choices, answer, full } */
export function cqQuestion(clause, kind, seed) {
  const R = makeRng(`cq|${clause}|${kind}|${seed}`), s = scene(R);
  let q;
  if (clause === 'seq') q = Object.assign({ ask: 'cq.ask.seq', sql: null }, seqOf(R));
  else if (kind === 'role') q = { ask: 'cq.ask.role', askV: { k: KW[clause] }, sql: null, choices: roleChoices(clause, R) };
  else if (kind === 'which') q = { ask: 'cq.ask.which', shown: { tx: 'cq.role.' + clause }, sql: null, choices: keyChoices(clause, R) };
  else if (kind === 'blank') { const b = blankOf(clause, s, R); q = { ask: 'cq.ask.blank', sql: b.sql, full: b.full, choices: keyChoices(clause, R) }; }
  else if (kind === 'right') {
    const o = clause === 'where' || clause === 'having' ? { op: 'ge' } : {};
    q = { ask: 'cq.ask.right', sql: null, full: sqlOf(clause, s, o), choices: [{ sql: sqlOf(clause, s, o) }, ...R.shuffle(wrongOf(clause, s)).slice(0, 3).map(x => ({ sql: x }))] };
  } else { q = readOf(clause, s, R); q.full = q.sql; }
  const order = R.shuffle(q.choices.map((_, i) => i));
  return Object.assign(q, { id: `cq:${clause}:${kind}:${seed}`, clause, kind: clause === 'seq' ? 'seq' : kind, choices: order.map(i => q.choices[i]), answer: order.indexOf(0) });
}
const KINDS = ['role', 'blank', 'right', 'read', 'which', 'read', 'right', 'blank'];
/** a quiz of CQ_N questions: one clause (each kind once or twice, mixed up) or all of them */
export function cqQuiz(set, seed) {
  const R = makeRng(`cqquiz|${set}|${seed}`);
  if (set !== 'all') return R.shuffle(KINDS).map((k, i) => cqQuestion(set, k, `${seed}|${i}`));
  const cl = R.shuffle([...CLAUSES, ...R.shuffle(CLAUSES).slice(0, CQ_N - CLAUSES.length - 1)]);
  const qs = cl.map((c, i) => cqQuestion(c, R.pick(['blank', 'right', 'read', 'read', 'which']), `${seed}|${i}`));
  qs.splice(R.int(2, qs.length), 0, cqQuestion('seq', 'seq', `${seed}|seq`));
  return qs;
}
/** the record after a quiz: { n: times, best, last } */
export const cqRecord = (old, score) => { const o = Object.assign({ n: 0, best: 0, last: 0 }, old); o.n++; o.last = score; o.best = Math.max(o.best, score); return o; };
