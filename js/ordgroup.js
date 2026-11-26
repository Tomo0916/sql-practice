/* =========================================================
 * ordgroup.js — which group a piece of an ordering problem goes in (word-by-word ordering):
 * kw (keywords) · table · col (columns, names made with AS, expressions) · op (symbols) · val (values).
 * A piece is grouped by its first word, read in the problem's context: a word is a table only if
 * it is a table (or a table's short name) of this problem — `rooms` is a column of hotels, not the
 * rooms table — and a column if it is a column of the problem's tables or a name made with AS.
 * ========================================================= */
import { ALL_TABLES } from './datasets.js';

export const ORD_GROUPS = ['kw', 'table', 'col', 'op', 'val'];
const KW = new Set(['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'ORDER', 'GROUP', 'BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'INNER', 'LEFT', 'OUTER', 'ON', 'AS', 'DISTINCT', 'BETWEEN', 'IN', 'LIKE', 'IS', 'NULL', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'UNION', 'ALL', 'CROSS', 'RIGHT', 'FULL', 'NATURAL', 'USING', 'WITH', 'OVER', 'PARTITION']);
const FN = /^[A-Za-z_][A-Za-z0-9_]*\(/;
const OP = /^(=|<>|!=|<=|>=|<|>|\*|\+|-|\/|%|\|\|)$/;
const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** the problem's names: { tables, cols, made } (made = names made with AS) */
export function ordContext(sql, tables) {
  const t = new Set(tables || []), cols = new Set(), made = new Set();
  [...t].forEach(n => (ALL_TABLES[n] ? ALL_TABLES[n].columns : []).forEach(c => cols.add(c[0])));
  const s = String(sql || '').replace(/'(?:[^']|'')*'/g, "''");
  for (const m of s.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)\s+(?:AS\s+)?([A-Za-z_]\w*)/gi)) if (t.has(m[1]) && !KW.has(m[2].toUpperCase())) t.add(m[2]);   // a table's short name
  for (const m of s.matchAll(/\bAS\s+([A-Za-z_]\w*)/gi)) if (!t.has(m[1])) made.add(m[1]);
  return { tables: t, cols, made };
}
/** the group of one word */
export function wordGroup(word, ctx) {
  const w = String(word).replace(/^\(+|[,;)]+$/g, '');
  if (!w) return 'op';
  if (KW.has(w.toUpperCase())) return 'kw';
  if (OP.test(w)) return 'op';
  if (/^'/.test(w) || /^-?\d/.test(w)) return 'val';
  if (FN.test(w) || /^[A-Za-z_]\w*\.[A-Za-z_*]/.test(w)) return 'col';
  if (ID.test(w)) {
    if (ctx && ctx.cols.has(w) && !(ctx.tables.has(w) && !ctx.cols.has(w))) return ctx.tables.has(w) && !ctx.cols.has(w) ? 'table' : 'col';
    if (ctx && ctx.tables.has(w)) return 'table';
    if (ctx && ctx.made.has(w)) return 'col';
    if (!ctx && ALL_TABLES[w]) return 'table';
    return 'col';
  }
  return 'val';
}
/** the group of a piece: its first word */
export const pieceGroup = (text, ctx) => wordGroup(String(text).trim().split(/\s+/)[0], ctx);
