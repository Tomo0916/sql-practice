/* =========================================================
 * alt.js — other correct answers (別解) for a problem.
 * Each rule rewrites the model answer into a form that means the same
 * thing in SQL (never one that only happens to match this data), and
 * every rewrite is then run and graded like a student's answer, so
 * only answers the app itself would mark correct are shown.
 * ========================================================= */
import { grade, LESSON_BY_KEY } from './engine.js';
import { ALL_TABLES } from './datasets.js';

/* string literals are hidden while rewriting, so 'a AND b' is never touched */
function mask(sql) {
  const lits = [];
  const s = sql.replace(/'(?:[^']|'')*'/g, m => { lits.push(m); return `\u0001${lits.length - 1}\u0001`; });
  return { s, unmask: x => x.replace(/\u0001(\d+)\u0001/g, (_, i) => lits[+i]) };
}
const VAL = '(?:\\u0001\\d+\\u0001|-?\\d+(?:\\.\\d+)?)';
const COL = '[A-Za-z_][\\w]*(?:\\.[A-Za-z_][\\w]*)?';

/** split at commas that are not inside ( ) */
function splitTop(s) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') d++; else if (ch === ')') d--;
    if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
/** index of a keyword at paren depth 0 (after `from`), or -1 */
function topIndex(s, re, from) {
  let d = 0;
  for (let i = from || 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') d++; else if (ch === ')') d--;
    else if (d === 0 && (i === 0 || /\W/.test(s[i - 1]))) { const m = s.slice(i).match(re); if (m && m.index === 0) return i; }
  }
  return -1;
}
const CLAUSE_END = /^(GROUP BY|HAVING|ORDER BY|LIMIT|;)/;
/** the WHERE condition at depth 0: {start, end} (end before GROUP/ORDER/LIMIT/;) */
function whereSpan(s) {
  const w = topIndex(s, /^WHERE\b/);
  if (w < 0) return null;
  const start = w + 6;
  let end = topIndex(s, CLAUSE_END, start);
  if (end < 0) end = s.length;
  return { start, end: s.slice(start, end).trimEnd().length + start };
}
function joinInfo(s) {
  const m = s.match(/FROM (\w+) (INNER |LEFT )?JOIN (\w+) ON (\w+)\.(\w+) = (\w+)\.(\w+)/);
  if (!m || !ALL_TABLES[m[1]] || !ALL_TABLES[m[3]]) return null;
  return { m, a: m[1], kind: (m[2] || '').trim(), b: m[3], cols: t => ALL_TABLES[t].columns.map(c => c[0]) };
}

/** the select list (text between SELECT and the FROM at depth 0) */
function selectList(s) {
  const m = s.match(/^SELECT (DISTINCT )?/);
  const f = topIndex(s, /^FROM\b/);
  return m && f > 0 ? s.slice(m[0].length, f).trim() : null;
}
const short = e => e.replace(/^(COUNT)\(\*\)$/, 'n').replace(/^(\w+)\((\w+)\)$/, (_, f, c) => `${f.toLowerCase()}_${c}`);

/* ---------- the rules, most useful first ---------- */
const RULES = [
  ['between', s => {
    const re = new RegExp(`(${COL}) BETWEEN (${VAL}) AND (${VAL})`);
    if (/NOT BETWEEN/.test(s) || !re.test(s)) return null;
    return s.replace(re, '$1 >= $2 AND $1 <= $3');
  }],
  ['inToOr', s => {
    const re = new RegExp(`(${COL}) IN \\(((?:${VAL}, )+${VAL})\\)`);
    const m = s.match(re);
    if (!m || /NOT IN/.test(s)) return null;
    const ors = m[2].split(', ').map(v => `${m[1]} = ${v}`).join(' OR ');
    const w = whereSpan(s), whole = w && s.slice(w.start, w.end) === m[0];
    return s.replace(m[0], whole ? ors : `(${ors})`);
  }],
  ['orToIn', s => {
    const w = whereSpan(s);
    if (!w) return null;
    let cond = s.slice(w.start, w.end), paren = false;
    if (/^\(.*\)$/.test(cond) && !/\)\s.*\(/.test(cond)) { cond = cond.slice(1, -1); paren = true; }
    const m = cond.match(new RegExp(`^(${COL}) = (${VAL})((?: OR \\1 = ${VAL})+)$`));
    if (!m) return null;
    const vals = [m[2], ...m[3].split(' OR ').slice(1).map(x => x.split(' = ')[1])];
    return s.slice(0, w.start) + `${m[1]} IN (${vals.join(', ')})` + s.slice(w.end);
  }],
  ['notEq', s => {
    const re = new RegExp(`\\bNOT (${COL}) = (${VAL})`);
    return re.test(s) ? s.replace(re, '$1 <> $2') : null;
  }],
  ['distinctGroup', s => {
    const m = s.match(/^SELECT DISTINCT (.+?) FROM /);
    if (!m || /\b(GROUP BY|COUNT|SUM|AVG|MIN|MAX)\b/.test(s)) return null;
    const at = topIndex(s, /^(ORDER BY|LIMIT|;)/, m[0].length);
    const cut = at < 0 ? s.length : at;
    return s.slice(0, cut).replace('SELECT DISTINCT ', 'SELECT ').trimEnd() + ` GROUP BY ${m[1]}` + (at < 0 ? '' : (s[cut] === ';' ? '' : ' ') + s.slice(cut));
  }],
  ['insertNoCols', s => {
    const m = s.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES/);
    if (!m || !ALL_TABLES[m[1]]) return null;
    const cols = ALL_TABLES[m[1]].columns.map(c => c[0]);
    return m[2].split(', ').join() === cols.join() ? s.replace(` (${m[2]}) VALUES`, ' VALUES') : null;
  }],
  ['notExists', s => {
    const j = joinInfo(s);
    if (!j || j.kind !== 'LEFT') return null;
    const [, a, , b, l1, c1, l2, c2] = j.m;
    const lk = l1 === a ? c1 : c2, rk = l1 === a ? c2 : c1;
    const sel = s.match(/^SELECT (.+?) FROM /);
    const tail = s.slice(s.indexOf(j.m[0]) + j.m[0].length);
    const w = tail.match(new RegExp(`^ WHERE ${b}\\.${rk} IS NULL(.*)$`));
    if (!sel || !w || splitTop(sel[1]).some(x => !x.startsWith(a + '.'))) return null;
    return `SELECT ${sel[1]} FROM ${a} WHERE NOT EXISTS (SELECT * FROM ${b} WHERE ${b}.${rk} = ${a}.${lk})${w[1]}`;
  }],
  ['havingSub', s => {
    const h = topIndex(s, /^HAVING\b/), list = selectList(s);
    if (h < 0 || !list) return null;
    let end = topIndex(s, /^(ORDER BY|LIMIT|;)/, h);
    if (end < 0) end = s.length;
    let cond = s.slice(h + 7, end).trim();
    const items = splitTop(list), names = {};
    for (const it of items) {
      if (/ AS /.test(it) || !/\(/.test(it)) continue;
      const nm = short(it);
      if (!/^\w+$/.test(nm)) return null;
      names[it] = nm;
    }
    let ok = true;
    cond = cond.replace(/\b(COUNT|SUM|AVG|MIN|MAX)\((\*|\w+)\)/g, m => (names[m] ? names[m] : ((ok = false), m)));
    if (!ok) return null;
    const inner = s.slice(0, h).trimEnd().replace(list, items.map(it => (names[it] ? `${it} AS ${names[it]}` : it)).join(', '));
    return `SELECT * FROM (${inner}) AS t WHERE ${cond}` + (s[end] === ';' ? ';' : ' ' + s.slice(end).trim());
  }],
  ['avgSum', s => {
    const re = /\bAVG\((\w+)\)/g;
    return re.test(s) ? s.replace(re, 'SUM($1) * 1.0 / COUNT($1)') : null;
  }],
  ['caseCount', s => {
    const re = /COUNT\(\*\) - COUNT\((\w+)\)/g;
    return re.test(s) ? s.replace(re, 'SUM(CASE WHEN $1 IS NULL THEN 1 ELSE 0 END)') : null;
  }],
  ['aliasExpand', s => {
    const list = selectList(s);
    if (!list) return null;
    const alias = {};
    splitTop(list).forEach(x => { const m = x.match(/^(.+) AS (\w+)$/); if (m && m[1].length <= 40) alias[m[2]] = m[1]; });
    let out = s, hit = false;
    for (const kw of ['GROUP BY', 'ORDER BY']) {
      const at = topIndex(out, new RegExp('^' + kw));
      if (at < 0) continue;
      const start = at + kw.length + 1;
      let end = topIndex(out, /^(HAVING|ORDER BY|LIMIT|;)/, start);
      if (end < 0) end = out.length;
      const part = out.slice(start, end).replace(/\b\w+\b/g, w => (alias[w] ? ((hit = true), alias[w]) : w));
      out = out.slice(0, start) + part + out.slice(end);
    }
    return hit ? out : null;
  }],
  ['limitComma', s => {
    const re = /LIMIT (\d+) OFFSET (\d+)/;
    return re.test(s) ? s.replace(re, 'LIMIT $2, $1') : null;
  }],
  ['commaJoin', s => {
    const j = joinInfo(s);
    if (!j || j.kind !== 'INNER') return null;
    const [all, a, , b, l1, c1, l2, c2] = j.m;
    const on = `${l1}.${c1} = ${l2}.${c2}`;
    let out = s.replace(all, `FROM ${a}, ${b}`);
    const w = whereSpan(out);
    if (w) { const c = out.slice(w.start, w.end); return out.slice(0, w.start) + `${on} AND ${/\bOR\b/.test(c) ? `(${c})` : c}` + out.slice(w.end); }
    const at = topIndex(out, /^(GROUP BY|ORDER BY|LIMIT|;)/, out.indexOf(`${a}, ${b}`));
    const cut = at < 0 ? out.length : at;
    return out.slice(0, cut).trimEnd() + ` WHERE ${on}` + (at < 0 ? '' : (out[cut] === ';' ? '' : ' ') + out.slice(cut));
  }],
  ['tableAlias', s => {
    const j = joinInfo(s);
    if (!j) return null;
    let x = j.a[0], y = j.b[0];
    if (x === y) { x = j.a.slice(0, 2); y = j.b.slice(0, 2); }
    if (x === y) return null;
    return s.replace(new RegExp(`\\b${j.a}\\.`, 'g'), x + '.').replace(new RegExp(`\\b${j.b}\\.`, 'g'), y + '.')
      .replace(`FROM ${j.a} `, `FROM ${j.a} ${x} `).replace(new RegExp(`JOIN ${j.b} ON`), `JOIN ${j.b} ${y} ON`);
  }],
  ['unqualify', s => {
    const j = joinInfo(s);
    if (!j || / IS NULL\b/.test(s)) return null;
    const ca = j.cols(j.a), cb = j.cols(j.b);
    const onAt = s.indexOf(' ON '), onEnd = s.indexOf(j.m[0]) + j.m[0].length;
    let hit = false;
    const fix = part => part.replace(new RegExp(`\\b(${j.a}|${j.b})\\.(\\w+)`, 'g'), (m, t, c) => ((ca.includes(c) !== cb.includes(c)) ? ((hit = true), c) : m));
    const out = fix(s.slice(0, onAt)) + s.slice(onAt, onEnd) + fix(s.slice(onEnd));
    return hit ? out : null;
  }],
  ['star', s => {
    const m = s.match(/^SELECT \* FROM (\w+)(?=[ ;]|$)/);
    if (!m || /\bJOIN\b/.test(s) || !ALL_TABLES[m[1]]) return null;
    return s.replace('SELECT *', 'SELECT ' + ALL_TABLES[m[1]].columns.map(c => c[0]).join(', '));
  }],
  ['innerOmit', s => (/INNER JOIN/.test(s) ? s.replace('INNER JOIN', 'JOIN') : null)],
  ['leftOuter', s => (/LEFT JOIN/.test(s) ? s.replace('LEFT JOIN', 'LEFT OUTER JOIN') : null)],
  ['asOmit', s => {
    const list = selectList(s);
    if (!list || !/ AS \w+/.test(list)) return null;
    return s.replace(list, list.replace(/ AS (\w+)/g, ' $1'));
  }],
  ['ascOmit', s => (/ ASC\b/.test(s) ? s.replace(/ ASC\b/g, '') : null)],
  ['neq', s => (/<>/.test(s) ? s.replace(/<>/g, '!=') : null)],
];
export const ALT_RULES = RULES.map(r => r[0]);

const cache = new Map();
/**
 * other answers the app would also mark correct: [{ sql, rule }] (at most `max`)
 * engine: SqlEngine; prob: a problem ({ sql, lesson, ordered })
 */
export function altAnswers(engine, prob, max) {
  if (!prob || !prob.sql || prob.answer !== undefined) return [];
  max = max || 3;
  const key = prob.sql + '|' + max;
  if (cache.has(key)) return cache.get(key);
  const out = [];
  const lesson = LESSON_BY_KEY[prob.lesson];
  const names = lesson && lesson.names;
  let exp = null;
  try { exp = engine.exec(prob.sql); } catch (e) { exp = null; }
  if (exp && !/^SELECT\s+'/i.test(prob.sql)) {
    const { s, unmask } = mask(prob.sql.replace(/\s+/g, ' ').trim());
    const seen = new Set([prob.sql.replace(/\s+/g, ' ').trim()]);
    for (const [rule, fn] of RULES) {
      if (out.length >= max) break;
      let r = null;
      try { r = fn(s); } catch (e) { r = null; }
      if (!r) continue;
      const sql = unmask(r).trim();
      if (seen.has(sql)) continue;
      seen.add(sql);
      try { if (grade(engine.runUser(sql), exp, prob.ordered, sql, names).ok) out.push({ sql, rule }); } catch (e) { /* not valid: not shown */ }
    }
  }
  cache.set(key, out);
  return out;
}
