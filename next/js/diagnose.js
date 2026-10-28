/* =========================================================
 * diagnose.js — turn errors and wrong results into specific advice
 * Returns [{ key, vars }] → shown with t('dx.<key>', vars), most specific first.
 * Also returns `mark`: {from, to} position in the student's SQL to underline.
 * ========================================================= */
import { ALL_TABLES } from './datasets.js';
import { stripLiterals, splitClauses, clauseKind } from './engine.js';

const WRITE_ORDER = ['select', 'from', 'join', 'where', 'group', 'having', 'order', 'limit'];
const KW_LABEL = { select: 'SELECT', from: 'FROM', join: 'JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING', order: 'ORDER BY', limit: 'LIMIT' };

function lev(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function closest(word, list) {
  let best = null, bd = Infinity;
  list.forEach(c => { const d = lev(word, c); if (d < bd) { bd = d; best = c; } });
  return bd <= Math.max(2, Math.floor(word.length / 3)) ? best : null;
}
function findWord(sql, word) {
  if (!word) return null;
  const re = new RegExp(`(^|[^A-Za-z0-9_])(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![A-Za-z0-9_])`, 'i');
  const m = re.exec(sql);
  return m ? { from: m.index + m[1].length, to: m.index + m[1].length + m[2].length } : null;
}

/** Clause order as written by the student, e.g. WHERE after ORDER BY. */
function clauseOrderProblem(sql) {
  const masked = stripLiterals(sql);
  const re = /\b(SELECT|FROM|(?:INNER\s+|LEFT\s+)?JOIN|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi;
  const seen = [];
  let m;
  while ((m = re.exec(masked))) {
    const u = m[1].toUpperCase();
    const k = u.startsWith('SELECT') ? 'select' : u.startsWith('FROM') ? 'from' : /JOIN/.test(u) ? 'join' : u.startsWith('WHERE') ? 'where' : u.startsWith('GROUP') ? 'group' : u.startsWith('HAVING') ? 'having' : u.startsWith('ORDER') ? 'order' : 'limit';
    seen.push({ k, at: m.index, len: m[0].length });
  }
  for (let i = 1; i < seen.length; i++) {
    const a = seen[i - 1], b = seen[i];
    if (WRITE_ORDER.indexOf(b.k) < WRITE_ORDER.indexOf(a.k)) return { a: KW_LABEL[b.k], b: KW_LABEL[a.k], mark: { from: b.at, to: b.at + b.len } };
  }
  return null;
}

/**
 * @param {object} o  { sql, error: {code, message} | null, grade: {...} | null, prob }
 */
export function diagnose(o) {
  const out = [];
  let mark = null;
  const sql = o.sql || '';
  const add = (key, vars) => { if (!out.some(x => x.key === key)) out.push({ key, vars: vars || {} }); };
  const tables = (o.prob && o.prob.tables) || [];
  const cols = [...new Set(tables.flatMap(tn => ALL_TABLES[tn].columns.map(c => c[0])))];
  const allTables = Object.keys(ALL_TABLES);
  const values = new Set(tables.flatMap(tn => ALL_TABLES[tn].rows.flat().filter(v => typeof v === 'string').map(v => v.toLowerCase())));

  // full-width characters from a Japanese/Chinese input method
  const fw = /[　，、。＝（）＊；’‘“”＜＞！０-９Ａ-Ｚａ-ｚ]/.exec(stripLiterals(sql));
  if (fw) { add('fullwidth', { c: fw[0] }); mark = { from: fw.index, to: fw.index + 1 }; }
  // smart quotes
  if (/[‘’“”]/.test(sql)) add('smartQuote');

  const msg = o.error && o.error.message ? o.error.message : '';
  if (msg) {
    let m;
    if ((m = /no such column: ([^\s]+)/i.exec(msg))) {
      const bad = m[1];
      const bare = bad.includes('.') ? bad.split('.').pop() : bad;
      if (values.has(bare.toLowerCase())) { add('quote', { v: bare }); }
      else if (/"/.test(sql) && new RegExp(`"${bare}"`, 'i').test(sql)) { add('doubleQuote', { v: bare }); }
      else {
        const good = closest(bare, cols);
        if (good && good.toLowerCase() !== bare.toLowerCase()) add('column', { bad, good });
        else if (bad.includes('.')) {
          const tbl = bad.split('.')[0];
          if (!tables.includes(tbl)) add('tablePrefix', { bad, t: tables.join(' / ') });
          else add('columnNotIn', { bad, t: tbl });
        } else add('columnUnknown', { bad, cols: cols.join(', ') });
      }
      mark = mark || findWord(sql, bad) || findWord(sql, bare);
    } else if ((m = /no such table: ([^\s]+)/i.exec(msg))) {
      const good = closest(m[1], allTables);
      add(good ? 'table' : 'tableUnknown', { bad: m[1], good, t: tables.join(', ') });
      mark = mark || findWord(sql, m[1]);
    } else if ((m = /ambiguous column name: ([^\s]+)/i.exec(msg))) {
      add('ambiguous', { c: m[1], t: tables.join(' / ') });
      mark = mark || findWord(sql, m[1]);
    } else if (/misuse of aggregate/i.test(msg)) {
      add(/\bWHERE\b[^;]*\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(stripLiterals(sql)) ? 'aggWhere' : 'aggMisuse');
    } else if (/GROUP BY clause is required before HAVING|HAVING clause on a non-aggregate/i.test(msg)) {
      add('havingNoGroup');
    } else if (/unrecognized token: "'/i.test(msg) || ((sql.match(/'/g) || []).length % 2 === 1)) {
      add('quoteOpen');
      const i = sql.lastIndexOf("'"); if (i >= 0) mark = mark || { from: i, to: i + 1 };
    } else if (/incomplete input/i.test(msg)) {
      add('incomplete');
    } else if ((m = /near "([^"]+)": syntax error/i.exec(msg))) {
      const co = clauseOrderProblem(sql);
      if (co) { add('clauseOrder', co); mark = mark || co.mark; }
      else if (/^(FROM|WHERE)$/i.test(m[1]) && /,\s*(FROM|WHERE)\b/i.test(sql)) add('trailingComma');
      else if (/\bSELECT\b\s+[A-Za-z_]+\s+[A-Za-z_]+\s+FROM/i.test(stripLiterals(sql)) && /^[A-Za-z_]+$/.test(m[1]) && !/^(FROM|WHERE|BY)$/i.test(m[1])) add('missingComma');
      else add('near', { tok: m[1] });
      mark = mark || findWord(sql, m[1]);
    }
    if (!out.length) add('sqlError', { msg });
  }

  // patterns that run but are probably not what the student meant
  const plain = stripLiterals(sql);
  if (/=\s*NULL\b|!=\s*NULL\b|<>\s*NULL\b/i.test(plain)) add('isNull');
  if (/\bLIKE\s*'[^'%_]*'/i.test(sql) && o.grade && !o.grade.ok) add('likePercent');

  // INSERT / UPDATE / DELETE lessons: the statement itself is missing
  const verb = o.prob && o.prob.sql ? /^\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.exec(o.prob.sql) : null;
  if (verb && !new RegExp('\\b' + verb[1].split(/\s+/)[0] + '\\b', 'i').test(plain)) add('needVerb', { kw: verb[1].replace(/\s+/g, ' ').toUpperCase() });

  const g = o.grade;
  if (g && !g.ok && o.prob) {
    // "SELECT name price" is valid SQL (price becomes an alias), so check it explicitly
    const sel = /\bSELECT\s+(?:DISTINCT\s+)?([\s\S]*?)\bFROM\b/i.exec(plain);
    if (sel && /[A-Za-z_][\w.]*\s+([A-Za-z_]\w*)/.test(sel[1])) {
      const w = /[A-Za-z_][\w.]*\s+([A-Za-z_]\w*)/.exec(sel[1])[1];
      if (cols.some(c => c.toLowerCase() === w.toLowerCase()) && !/^AS$/i.test(w)) { add('missingComma'); mark = mark || findWord(sql, w); }
    }
    if (o.prob.ordered && !/\bORDER\s+BY\b/i.test(plain) && g.reason !== 'order') add('needOrder');
    if (o.fix) add('fix_' + o.fix.key, o.fix.vars);
  }
  if (g && !g.ok) {
    if (g.reason === 'cols') add('cols', { a: g.a, b: g.b });
    if (g.reason === 'rows') {
      if (g.detail === 'tooMany') add('tooMany', { a: g.a, b: g.b });
      else if (g.detail === 'tooFew') add('tooFew', { a: g.a, b: g.b });
      else add('rows', { a: g.a, b: g.b });
    }
    if (g.reason === 'order') add(g.detail === 'noOrder' ? 'noOrder' : g.detail === 'reversed' ? 'reversed' : 'order');
    if (g.reason === 'values') add('values');
    if (g.reason === 'names') add('aliasName', { a: g.a, b: g.b });
    if (g.reason === 'noResult') add('noResult');
  }
  return { items: out.slice(0, 3), mark };
}

/** Which clause kinds appear in a SQL string, in written order (used by the order strip). */
export function clausesOf(sql) { return splitClauses(sql).map(clauseKind); }

/**
 * Try small edits of the student's SQL. If one of them produces the expected result,
 * we can say exactly what to change. `run(sql)` → result or throws; `ok(result)` → boolean.
 */
const MUTATIONS = [
  { key: 'dir', test: s => /\b(ASC|DESC)\b/i.test(s), apply: s => s.replace(/\b(ASC|DESC)\b/gi, m => (m.toUpperCase() === 'ASC' ? 'DESC' : 'ASC')) },
  { key: 'addDesc', test: s => /\bORDER\s+BY\b/i.test(s) && !/\b(ASC|DESC)\b/i.test(s), apply: s => s.replace(/(\bORDER\s+BY\s+[^;]*?)(\s+LIMIT\b|\s*;?\s*$)/i, '$1 DESC$2') },
  { key: 'whereHaving', test: s => /\bWHERE\b/i.test(s) && /\bGROUP\s+BY\b/i.test(s), apply: s => s.replace(/\bWHERE\b([\s\S]*?)\bGROUP\s+BY\b([^;]*)/i, 'GROUP BY$2 HAVING$1') },
  { key: 'innerLeft', test: s => /\b(INNER|LEFT)\s+JOIN\b/i.test(s), apply: s => s.replace(/\b(INNER|LEFT)\s+JOIN\b/i, m => (/^INNER/i.test(m) ? 'LEFT JOIN' : 'INNER JOIN')) },
  { key: 'joinPlain', test: s => /(^|[^A-Z])JOIN\b/i.test(s) && !/\b(INNER|LEFT)\s+JOIN\b/i.test(s), apply: s => s.replace(/\bJOIN\b/i, 'LEFT JOIN') },
  { key: 'gtGe', test: s => /[<>](?!=)/.test(s.replace(/'[^']*'/g, '')), apply: s => s.replace(/([<>])(?!=)/g, '$1=') },
  { key: 'geGt', test: s => /[<>]=/.test(s.replace(/'[^']*'/g, '')), apply: s => s.replace(/([<>])=/g, '$1') },
  { key: 'likeWild', test: s => /LIKE\s*'[^'%]+'/i.test(s), apply: s => s.replace(/LIKE\s*'([^'%]+)'/i, "LIKE '%$1%'") },
  { key: 'offsetOne', test: s => /\bOFFSET\s+\d+/i.test(s), apply: s => s.replace(/\bOFFSET\s+(\d+)/i, (m, n) => `OFFSET ${Math.max(0, +n - 1)}`) },
  { key: 'offsetOne', test: s => /\bOFFSET\s+\d+/i.test(s), apply: s => s.replace(/\bOFFSET\s+(\d+)/i, (m, n) => `OFFSET ${+n + 1}`) },
  { key: 'distinct', test: s => /^\s*SELECT\s+(?!DISTINCT)/i.test(s), apply: s => s.replace(/^\s*SELECT\s+/i, 'SELECT DISTINCT ') }
];
export function findFix(sql, run, ok) {
  for (const m of MUTATIONS) {
    try {
      if (!m.test(sql)) continue;
      const s2 = m.apply(sql);
      if (s2 === sql) continue;
      if (ok(run(s2))) return { key: m.key, vars: {} };
    } catch (e) { /* try next */ }
  }
  return null;
}
