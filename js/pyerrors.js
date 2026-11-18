/* =========================================================
 * pyerrors.js — reading Python errors (the Python course). No DOM.
 * A problem: a short piece of pandas code with one common mistake, and the error Python shows
 * (the traceback as CPython / the in-browser Python print it). Two steps:
 *   1. what does the error say? (meanings: pe.m.<cat>)   2. which code fixes it? (3 pieces of code)
 * The messages are the ones Pyodide 0.27 (Python 3.12, pandas 2.2) gives: tools-next/check.mjs runs
 * every piece of code with CPython + pandas (the type of error, the fixes), and the browser test
 * compares every traceback with the real one.
 * ========================================================= */
import { makeRng } from './engine.js';
import { SINGLE_DATASETS, JOIN_DATASETS } from './datasets.js';

const q = s => JSON.stringify(String(s));
const colIdx = (ds, c) => ds.columns.findIndex(x => x[0] === c);
const values = (ds, c) => [...new Set(ds.rows.map(r => r[colIdx(ds, c)]).filter(v => v !== null && v !== undefined))];
const mid = (ds, c, R) => { const v = values(ds, c).sort((a, b) => a - b); return v[R.int(1, Math.max(1, v.length - 2))]; };
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** values for which Python adds an unrelated hint (“Did you mean: 'None'?”): not used for the missing-quotes problems */
const HINTED = new Set(['Novel', 'Drink', 'Zen']);
const PY_WORDS = new Set(['True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'if', 'else', 'for', 'id', 'type', 'list', 'max', 'min', 'sum', 'len', 'pd', 'np', 'print', 'input', 'open', 'set', 'map', 'str', 'int']);
/** a misspelt column name: two letters swapped, or one left out (never another real column) */
function typo(name, cols, R) {
  for (let n = 0; n < 20; n++) {
    const i = R.int(1, name.length - 2);
    const t = R.next() < 0.5 ? name.slice(0, i) + name[i + 1] + name[i] + name.slice(i + 2) : name.slice(0, i) + name.slice(i + 1);
    if (t !== name && !cols.includes(t) && !cols.includes(t.toLowerCase())) return t;
  }
  return name + 'x';
}

/**
 * The kinds of mistake. gen(ds, R) → { lines (the code), at (1-based line of the error), last (the last line of the error),
 * lib (raised inside pandas: the traceback has “…”), caret ([start, length] for a SyntaxError), fix (the right code),
 * wrong (two codes that do not fix it), cat (the meaning), v (values for the explanation) }
 */
const KINDS = {
  key: { cat: 'key', gen(ds, R) {
    const r = ds.roles, cols = ds.columns.map(c => c[0]), t = ds.table, c = R.pick([r.n1, r.n2]), bad = typo(c, cols, R), v = mid(ds, c, R);
    const form = R.int(0, 2), o = r.n1 === c ? r.n2 : r.n1, ov = mid(ds, o, R);   // drawn once: the fixes differ only where the mistake is
    const mk = x => (form === 0 ? [`${t}[${t}[${q(x)}] >= ${v}]`]
      : form === 1 ? [`top = ${t}[${t}[${q(o)}] >= ${ov}]`, `top.sort_values(${q(x)})`]
        : [`${t}.groupby(${q(r.cat)})[${q(x)}].mean()`]);
    const lines = mk(bad), fixL = mk(c);
    const wrongA = lines.map(l => l.replace(q(bad), bad)), wrongB = lines.map(l => l.replace(q(bad), q(c[0].toUpperCase() + c.slice(1))));
    return { lines, at: lines.length, last: form === 2 ? `KeyError: 'Column not found: ${bad}'` : `KeyError: '${bad}'`, lib: true, fix: fixL.join('\n'), wrong: [wrongA.join('\n'), wrongB.join('\n')], v: { bad, good: c } };
  } },
  keylist: { cat: 'list', gen(ds, R) {
    const r = ds.roles, t = ds.table, b = R.pick([r.cat, r.n1, r.n2]);
    return { lines: [`${t}[${q(r.name)}, ${q(b)}]`], at: 1, last: `KeyError: (${`'${r.name}', '${b}'`})`, lib: true,
      fix: `${t}[[${q(r.name)}, ${q(b)}]]`, wrong: [`${t}[${q(r.name)}][${q(b)}]`, `${t}([${q(r.name)}, ${q(b)}])`], v: { a: r.name, b } };
  } },
  name_tab: { cat: 'name', gen(ds, R) {
    const t = ds.table, bad = t.endsWith('s') ? t.slice(0, -1) : t + 's', n = R.int(2, 5);
    return { lines: [`${bad}.head(${n})`], at: 1, last: `NameError: name '${bad}' is not defined. Did you mean: '${t}'?`, lib: false,
      fix: `${t}.head(${n})`, wrong: [`${q(bad)}.head(${n})`, `${t[0].toUpperCase() + t.slice(1)}.head(${n})`], v: { bad, good: t } };
  } },
  name_str: { cat: 'str', ok: ds => values(ds, ds.roles.cat).some(v => IDENT.test(v) && !PY_WORDS.has(v) && !HINTED.has(v)), gen(ds, R) {
    const r = ds.roles, t = ds.table, w = R.pick(values(ds, r.cat).filter(v => IDENT.test(v) && !PY_WORDS.has(v) && !HINTED.has(v)));
    const mk = x => `${t}[${t}[${q(r.cat)}] == ${x}]`;
    return { lines: [mk(w)], at: 1, last: `NameError: name '${w}' is not defined`, lib: false,
      fix: mk(q(w)), wrong: [`${t}[${t}[${q(r.cat)}] = ${q(w)}]`, mk(q(w.toLowerCase()))], v: { bad: w, good: q(w) } };
  } },
  name_bool: { cat: 'name', gen(ds, R) {
    const t = ds.table, c = R.pick([ds.roles.n1, ds.roles.n2]), mk = x => `${t}.sort_values(${q(c)}, ascending=${x})`;
    return { lines: [mk('false')], at: 1, last: "NameError: name 'false' is not defined. Did you mean: 'False'?", lib: false,
      fix: mk('False'), wrong: [mk('"false"'), `${t}.sort_values(${q(c)}, desc=True)`], v: { bad: 'false', good: 'False' } };
  } },
  attr: { cat: 'attr', gen(ds, R) {
    const r = ds.roles, t = ds.table, c = R.pick([r.n1, r.n2]);
    const forms = [
      { bad: `${t}[${q(c)}].average()`, good: `${t}[${q(c)}].mean()`, obj: 'Series', m: 'average', hint: '', w: [`${t}.mean(${q(c)})`, `${t}[${q(c)}].Mean()`] },
      { bad: `${t}.sort(${q(c)})`, good: `${t}.sort_values(${q(c)})`, obj: 'DataFrame', m: 'sort', hint: '', w: [`${t}.sort_values[${q(c)}]`, `${t}.order(${q(c)})`] },
      { bad: `${t}[${q(r.cat)}].value_count()`, good: `${t}[${q(r.cat)}].value_counts()`, obj: 'Series', m: 'value_count', hint: 'value_counts', w: [`${t}[${q(r.cat)}].count()`, `${t}.value_count(${q(r.cat)})`] },
      { bad: `${t}.Head(3)`, good: `${t}.head(3)`, obj: 'DataFrame', m: 'Head', hint: 'head', w: [`${t}.HEAD(3)`, `${t}.Head[3]`] },
      { bad: `${t}.groupby(${q(r.cat)})[${q(c)}].avg()`, good: `${t}.groupby(${q(r.cat)})[${q(c)}].mean()`, obj: 'SeriesGroupBy', m: 'avg', hint: 'agg', w: [`${t}.groupby(${q(r.cat)})[${q(c)}].average()`, `${t}.groupby(${q(r.cat)}).avg(${q(c)})`] }
    ];
    const f = R.pick(forms);
    return { lines: [f.bad], at: 1, last: `AttributeError: '${f.obj}' object has no attribute '${f.m}'${f.hint ? `. Did you mean: '${f.hint}'?` : ''}`, lib: true,
      fix: f.good, wrong: f.w, v: { bad: f.m, obj: f.obj, good: /\.(\w+)[([]?[^.]*$/.exec(f.good)[1] } };
  } },
  syn_eq: { cat: 'eq', gen(ds, R) {
    const r = ds.roles, t = ds.table, w = R.pick(values(ds, r.cat)), mk = op => `${t}[${t}[${q(r.cat)}] ${op} ${q(w)}]`, line = mk('=');
    return { lines: [line], at: 1, last: "SyntaxError: cannot assign to subscript here. Maybe you meant '==' instead of '='?", caret: [t.length + 1, `${t}[${q(r.cat)}]`.length],
      fix: mk('=='), wrong: [mk('==='), `${t}[${t}[${q(r.cat)}]] == ${q(w)}`], v: {} };
  } },
  syn_close: { cat: 'close', gen(ds, R) {
    const t = ds.table, c = R.pick([ds.roles.n1, ds.roles.n2]), v = mid(ds, c, R);
    if (R.next() < 0.5) {
      const line = `${t}[${t}[${q(c)}] >= ${v}`;
      return { lines: [line], at: 1, last: "SyntaxError: '[' was never closed", caret: [t.length, 1], fix: line + ']', wrong: [line + ')', line + ']]'], v: { b: '[' } };
    }
    const line = `${t}.sort_values(${q(c)}`;
    return { lines: [line], at: 1, last: "SyntaxError: '(' was never closed", caret: [t.length + 12, 1], fix: line + ')', wrong: [line + ']', line + '))'], v: { b: '(' } };
  } },
  syn_quote: { cat: 'quote', gen(ds, R) {
    const r = ds.roles, t = ds.table, b = R.pick([r.cat, r.n1, r.n2]), head = `${t}[[${q(r.name)}, `, line = `${head}"${b}]]`;
    return { lines: [line], at: 1, last: 'SyntaxError: unterminated string literal (detected at line 1)', caret: [head.length, 1],
      fix: `${head}${q(b)}]]`, wrong: [`${head}"${b}']]`, `${head}${b}"]]`], v: {} };
  } },
  syn_op: { cat: 'op', gen(ds, R) {
    const t = ds.table, c = R.pick([ds.roles.n1, ds.roles.n2]), v = mid(ds, c, R), head = `${t}[${t}[${q(c)}] =`, line = `${head}> ${v}]`;
    return { lines: [line], at: 1, last: 'SyntaxError: invalid syntax', caret: [head.length - 1, 1],
      fix: `${t}[${t}[${q(c)}] >= ${v}]`, wrong: [`${t}[${t}[${q(c)}] = > ${v}]`, `${t}[${t}[${q(c)}] >== ${v}]`], v: { bad: '=>', good: '>=' } };
  } },
  val_and: { cat: 'and', gen(ds, R) {
    const r = ds.roles, t = ds.table, v = mid(ds, r.n1, R), w = R.pick(values(ds, r.cat));
    const a = `${t}[${q(r.n1)}] >= ${v}`, b = `${t}[${q(r.cat)}] == ${q(w)}`;
    return { lines: [`${t}[(${a}) and (${b})]`], at: 1, last: 'ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().', lib: true,
      fix: `${t}[(${a}) & (${b})]`, wrong: [`${t}[${a} & ${b}]`, `${t}[(${a}) && (${b})]`], v: {} };
  } },
  key_merge: { cat: 'merge', join: true, gen(ds) {
    const l = ds.left.table, rt = ds.right.table, a = ds.left.roles.id, b = ds.right.roles.key;
    return { lines: [`pd.merge(${l}, ${rt}, on=${q(a)})`], at: 1, last: `KeyError: '${a}'`, lib: true,
      fix: `pd.merge(${l}, ${rt}, left_on=${q(a)}, right_on=${q(b)})`, wrong: [`pd.merge(${l}, ${rt}, on=${q(b)})`, `pd.merge(${l}, ${rt}, left_on=${q(b)}, right_on=${q(a)})`], v: { bad: a, l, r: rt, b } };
  } }
};
export const PE_KINDS = Object.keys(KINDS);
/** the meanings (step 1) */
export const PE_CATS = ['key', 'list', 'name', 'str', 'attr', 'eq', 'close', 'quote', 'op', 'and', 'merge'];
/** meanings that are easy to mix up with each one: the wrong choices come from these first */
const NEAR = { key: ['name', 'attr', 'quote'], list: ['close', 'attr', 'eq'], name: ['key', 'attr', 'quote'], str: ['key', 'quote', 'attr'], attr: ['name', 'key', 'op'],
  eq: ['op', 'and', 'close'], close: ['quote', 'op', 'eq'], quote: ['close', 'op', 'eq'], op: ['eq', 'close', 'and'], and: ['eq', 'op', 'close'], merge: ['name', 'attr', 'close'] };
/** the error types in the cheat sheet */
export const PE_TYPES = ['KeyError', 'NameError', 'AttributeError', 'SyntaxError', 'ValueError', 'TypeError'];
export const PE_N = 8;

const setKey = ds => ds.key || ds.table;
/** one problem; the example is always the same (a misspelt column on the first table) */
export function peProblem(kind, seed, demo) {
  const K = KINDS[kind], R = makeRng(`pe|${kind}|${seed}`);
  const sets = (K.join ? JOIN_DATASETS : SINGLE_DATASETS).filter(d => !K.ok || K.ok(d));
  const ds = demo ? sets[0] : R.pick(sets), g = K.gen(ds, R);
  const meanings = R.shuffle([K.cat, ...R.shuffle(NEAR[K.cat]).slice(0, 2)]);
  const fixes = R.shuffle([g.fix, ...g.wrong]);
  return Object.assign(g, { id: `pe:${kind}:${demo ? 'demo' : seed}`, kind, cat: K.cat, ds: setKey(ds), demo: !!demo, code: g.lines.join('\n'),
    meanings, meaning: meanings.indexOf(K.cat), fixes, fixAt: fixes.indexOf(g.fix), type: g.last.split(':')[0].replace(/^.*\./, '') });
}
/** a set: the example and PE_N problems of different kinds */
export function peSet(seed) {
  const R = makeRng(`peset|${seed}`), kinds = R.shuffle(PE_KINDS.slice()).slice(0, PE_N);
  return { demo: peProblem('key', 'demo', true), items: kinds.map((k, i) => peProblem(k, `${seed}|${i}`)) };
}
/** the tables a problem's code may use */
export function peNeed(prob) {
  const K = KINDS[prob.kind], ds = (K.join ? JOIN_DATASETS : SINGLE_DATASETS).find(d => setKey(d) === prob.ds);
  return K.join ? [ds.left.table, ds.right.table] : [ds.table];
}

/** the traceback as Python prints it: the line of the student's code, “…” for pandas' own lines, the error */
export function peTraceback(prob) {
  const src = prob.lines[prob.at - 1];
  if (prob.caret) return `  File "<answer>", line ${prob.at}\n    ${src}\n    ${' '.repeat(prob.caret[0])}${'^'.repeat(prob.caret[1])}\n${prob.last}`;
  return `Traceback (most recent call last):\n  File "<answer>", line ${prob.at}, in <module>\n    ${src}\n${prob.lib ? '  …\n' : ''}${prob.last}`;
}

/**
 * A traceback from the in-browser Python, made short like peTraceback: the lines of the student's code
 * (with the source line, which Pyodide leaves out), “…” for pandas' own lines, and the error.
 */
export function cleanTb(raw, code) {
  if (!raw) return '';
  const src = String(code).split('\n'), out = [], lines = raw.split('\n');
  let skip = false, syntax = !/, in <module>/.test(lines[0]);
  for (const l of lines) {
    const own = /^\s*File "<answer>", line (\d+)/.exec(l);
    if (own) { out.push('  ' + l.trim()); if (!syntax) out.push('    ' + (src[+own[1] - 1] || '').trim()); skip = false; continue; }
    if (/^\s*File "/.test(l)) { if (out[out.length - 1] !== '  …') out.push('  …'); skip = true; continue; }
    if (/^\s/.test(l)) { if (!skip && syntax) out.push(l); continue; }
    skip = false; out.push(l);
  }
  return (syntax ? '' : 'Traceback (most recent call last):\n') + out.join('\n');
}
