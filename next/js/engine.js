/* =========================================================
 * engine.js — problem generation, safe SQL execution, grading,
 *             fill-in-the-blank and clause-ordering builders, paper tests.
 * Pure logic: no DOM, no language. Runs in the browser and in Node (tools-next/check.mjs).
 * ========================================================= */
import { ALL_TABLES, SINGLE_DATASETS, NULL_DATASETS, JOIN_DATASETS, ANALYSIS_THEMES, datasetSQL } from './datasets.js';
import { LESSONS, BLANK } from './lessons.js';

export const LESSON_BY_KEY = {};
LESSONS.forEach((l, i) => { l.index = i; LESSON_BY_KEY[l.key] = l; });

/** Stage of each problem in a lesson (index 0 is the fixed example). A lesson may set its own `stages`. */
export const STAGES = ['demo', 'fill', 'order', 'write', 'write', 'write'];
export const PRACTICE_COUNT = STAGES.length - 1;
export const stagesOf = lesson => lesson.stages || STAGES;
export const blanksOf = (lesson, p) => (typeof lesson.blanks === 'function' ? lesson.blanks(p) : lesson.blanks || []);

/** Lesson 0 answers: compare loosely (full-width digits, quotes, case, spaces, thousands separators). */
export function normAnswer(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFKC').trim().replace(/^['"‘’“”「『](.*)['"‘’“”」』]$/, '$1').replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/\s+/g, ' ').toLowerCase();
}
export const checkAnswer = (prob, text) => normAnswer(text) !== '' && normAnswer(text) === normAnswer(prob.answer);

/* ---------- seeded randomness ---------- */
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function makeRng(seedText) {
  let a = hashStr(String(seedText)) || 1;
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    next,
    int: (lo, hi) => (hi < lo ? lo : lo + Math.floor(next() * (hi - lo + 1))),
    pick: arr => arr[Math.floor(next() * arr.length)],
    shuffle: arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  };
}
export function todayCode(d) {
  d = d || new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(n) {
  let s = '';
  for (let i = 0; i < (n || 4); i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}
export function normCode(s) { return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16); }

/* ---------- SQL safety ---------- */
const FORBIDDEN = /\b(DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|REINDEX|ANALYZE)\b/i;
/** INSERT / UPDATE / DELETE: the table it changes (or null) */
export function dmlTable(sql) {
  const m = /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([A-Za-z_]\w*)/i.exec(stripLiterals(sql || ''));
  return m ? m[1] : null;
}
export function stripLiterals(sql) {
  return sql.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""').replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/* ---------- clause splitting (used by ordering exercises and visualisations) ---------- */
const CLAUSE_RE = /\b(SELECT|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|FROM|(?:INNER|LEFT)\s+JOIN|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi;
/** "SELECT a FROM t WHERE x" → ["SELECT a", "FROM t", "WHERE x"] (ignores keywords inside quotes). */
export function splitClauses(sql) {
  const s = sql.trim().replace(/;\s*$/, '');
  const masked = s.replace(/'(?:[^']|'')*'/g, m => ' '.repeat(m.length));
  const cuts = [];
  let m;
  CLAUSE_RE.lastIndex = 0;
  while ((m = CLAUSE_RE.exec(masked))) cuts.push(m.index);
  if (!cuts.length || cuts[0] !== 0) cuts.unshift(0);
  return cuts.map((c, i) => s.slice(c, cuts[i + 1]).trim()).filter(Boolean);
}
export function clauseKind(chunk) {
  const u = chunk.toUpperCase();
  if (u.startsWith('SELECT')) return /^SELECT\s+DISTINCT/.test(u) ? 'select_distinct' : 'select';
  if (u.startsWith('INSERT')) return 'insert';
  if (u.startsWith('VALUES')) return 'values';
  if (u.startsWith('UPDATE')) return 'update';
  if (u.startsWith('SET')) return 'set';
  if (u.startsWith('DELETE')) return 'delete';
  if (u.startsWith('FROM')) return 'from';
  if (/^(INNER|LEFT)/.test(u)) return u.startsWith('LEFT') ? 'join_left' : 'join_inner';
  if (u.startsWith('WHERE')) return 'where';
  if (u.startsWith('GROUP')) return 'group';
  if (u.startsWith('HAVING')) return 'having';
  if (u.startsWith('ORDER')) return 'order';
  if (u.startsWith('LIMIT')) return /OFFSET/.test(u) ? 'offset' : 'limit';
  return 'other';
}
/** The order in which the database actually processes clauses. */
export const EXEC_ORDER = ['from', 'join_inner', 'join_left', 'where', 'group', 'having', 'select', 'select_distinct', 'order', 'limit', 'offset'];

/* ---------- grading ---------- */
function normVal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  return String(v);
}
const rowKey = r => JSON.stringify(r.map(normVal));
function multiset(rows) { const m = new Map(); rows.forEach(r => { const k = rowKey(r); m.set(k, (m.get(k) || 0) + 1); }); return m; }
function sameMultiset(a, b) {
  const x = a.map(rowKey).sort(), y = b.map(rowKey).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
/** is every row of `small` contained in `big` (as a multiset)? */
function subMultiset(small, big) {
  const B = multiset(big);
  for (const r of small) { const k = rowKey(r); const c = B.get(k) || 0; if (!c) return false; B.set(k, c - 1); }
  return true;
}
function alignColumns(user, exp) {
  const n = exp.columns.length;
  if (user.columns.length !== n) return null;
  const sig = rows => j => JSON.stringify(rows.map(r => JSON.stringify(normVal(r[j]))).sort());
  // match by column name first, then by contents
  const used = new Set(), map = [];
  for (let j = 0; j < n; j++) {
    let found = user.columns.findIndex((c, k) => !used.has(k) && c.toLowerCase() === exp.columns[j].toLowerCase());
    if (found < 0) {
      const s = sig(exp.values)(j);
      found = user.columns.findIndex((_, k) => !used.has(k) && sig(user.values)(k) === s);
    }
    if (found < 0) return null;
    used.add(found); map.push(found);
  }
  return user.values.map(r => map.map(k => r[k]));
}
/**
 * → { ok, reason, a, b, detail }
 * reason: 'noResult' | 'cols' | 'rows' | 'order' | 'values'
 * detail: 'tooMany' | 'tooFew' | 'reversed' | 'noOrder' | null
 */
export function grade(user, exp, ordered, userSql, names) {
  if (!user || !user.columns || !user.columns.length) return { ok: false, reason: 'noResult' };
  if (names && user.columns.length === exp.columns.length) {   // the lesson is about naming columns (AS)
    const j = exp.columns.findIndex((c, i) => c.toLowerCase() !== String(user.columns[i]).toLowerCase());
    if (j >= 0 && !user.columns.some(c => c.toLowerCase() === exp.columns[j].toLowerCase())) {
      const g = grade(user, exp, ordered, userSql);
      if (g.ok) return { ok: false, reason: 'names', a: user.columns[j], b: exp.columns[j] };
    }
  }
  if (user.columns.length !== exp.columns.length) return { ok: false, reason: 'cols', a: user.columns.length, b: exp.columns.length };
  const cands = [user.values];
  const aligned = alignColumns(user, exp);
  if (aligned) cands.push(aligned);
  if (user.values.length !== exp.values.length) {
    let detail = null;
    if (cands.some(v => v.length > exp.values.length && subMultiset(exp.values, v))) detail = 'tooMany';
    else if (cands.some(v => v.length < exp.values.length && subMultiset(v, exp.values))) detail = 'tooFew';
    return { ok: false, reason: 'rows', a: user.values.length, b: exp.values.length, detail };
  }
  for (const vals of cands) {
    if (ordered) { if (vals.every((r, i) => rowKey(r) === rowKey(exp.values[i]))) return { ok: true }; }
    else if (sameMultiset(vals, exp.values)) return { ok: true };
  }
  if (ordered && cands.some(v => sameMultiset(v, exp.values))) {
    const rev = cands.some(v => v.every((r, i) => rowKey(r) === rowKey(exp.values[exp.values.length - 1 - i])));
    const noOrder = userSql && !/\bORDER\s+BY\b/i.test(stripLiterals(userSql));
    return { ok: false, reason: 'order', detail: noOrder ? 'noOrder' : rev ? 'reversed' : null };
  }
  return { ok: false, reason: 'values' };
}

/* ---------- the engine ---------- */
export class SqlEngine {
  constructor(SQL) { this.SQL = SQL; this._cache = new Map(); this.reset(); }
  reset() {
    if (this.db) try { this.db.close(); } catch (e) { /* ignore */ }
    this.db = new this.SQL.Database();
    // CONCAT(a, b, …) as in MySQL (NULL if any argument is NULL), so students can try the MySQL way too
    const concat = (...a) => (a.some(v => v === null) ? null : a.map(String).join(''));
    Object.defineProperty(concat, 'length', { value: -1 });   // -1 = any number of arguments
    this.db.create_function('CONCAT', concat);
    this.db.run(datasetSQL(Object.values(ALL_TABLES)));
  }
  /** Run SQL. INSERT / UPDATE / DELETE never change the data: the result is the changed table, then it is put back. */
  exec(sql) {
    const t = dmlTable(sql);
    if (t) return this._dml(sql, t);
    const res = this.db.exec(sql); return res.length ? res[res.length - 1] : null;
  }
  _dml(sql, t) {
    this.db.exec('SAVEPOINT dml');
    try {
      this.db.exec(sql);
      const changed = this.db.getRowsModified();
      const after = this.db.exec(`SELECT * FROM ${t} ORDER BY 1;`);
      return Object.assign(after.length ? after[0] : { columns: ALL_TABLES[t] ? ALL_TABLES[t].columns.map(c => c[0]) : [], values: [] }, { dml: { table: t, changed } });
    } finally {
      try { this.db.exec('ROLLBACK TO dml; RELEASE dml;'); } catch (e) { this.reset(); }
    }
  }
  values(sql) { const r = this.exec(sql); return r ? r.values : []; }
  /** Run student SQL safely (SELECT, or INSERT / UPDATE / DELETE that is undone at once).
   *  Throws Error with .code 'empty' | 'onlySelect', or SQLite's message. */
  runUser(sql) {
    const clean = stripLiterals(sql || '').trim();
    if (!clean.replace(/;/g, '').trim()) { const e = new Error('empty'); e.code = 'empty'; throw e; }
    if (FORBIDDEN.test(clean)) { const e = new Error('onlySelect'); e.code = 'onlySelect'; throw e; }
    const t = dmlTable(sql);
    this.db.exec('SAVEPOINT student');
    try {
      if (t) return this._dml(sql, t);
      const res = this.db.exec(sql);
      return res.length ? res[res.length - 1] : { columns: [], values: [] };
    } finally {
      try { this.db.exec('ROLLBACK TO student; RELEASE student;'); } catch (e) { this.reset(); }
    }
  }
  tableData(name) { return this.exec(`SELECT * FROM ${name};`); }

  /* ----- problems ----- */
  buildProblem(lesson, p, kind, idx, theme) {
    const sql = lesson.sql(p);
    const blankP = Object.assign({}, p);
    blanksOf(lesson, p).forEach(k => (blankP[k] = BLANK));
    const tables = lesson.kind === 'join' ? [p.L, p.R] : [p.t];
    const stages = stagesOf(lesson);
    const stage = kind === 'demo' ? 'demo' : kind === 'practice' ? stages[idx] : kind;
    return {
      wn: stages.slice(0, idx + 1).filter(x => x === stage).length,   // "Write 1, 2, 3"
      answer: lesson.kind === 'quiz' ? p.ans : undefined,
      id: kind === 'demo' ? `${lesson.key}:demo` : `${lesson.key}:${stage}:${hashStr(sql).toString(36)}`,
      lesson: lesson.key, kind, stage, idx, tables, p, sql,
      blank: lesson.sql(blankP),
      steps: lesson.steps ? lesson.steps(p) : [],
      ordered: /\bORDER\s+BY\b/i.test(sql),
      theme: theme || (ALL_TABLES[tables[0]] && (ALL_TABLES[tables[0]].pair || ALL_TABLES[tables[0]].table))
    };
  }
  demoProblem(lesson) {
    if (lesson.themes === 'analysis') {   // the example is made from Kumo Mart's table, with the variant the lesson asks for
      const key = 'demo|' + lesson.key;
      if (!this._cache.has(key)) {
        const ds = ALL_TABLES[lesson.demo.ds];
        const p = lesson.gen(ds, makeRng(key), { values: s => this.values(s) }, lesson.demo.p || {});
        this._cache.set(key, this.buildProblem(lesson, p, 'demo', 0, 'demo'));
      }
      return this._cache.get(key);
    }
    return this.buildProblem(lesson, Object.assign({}, lesson.demo.p), 'demo', 0, 'demo');
  }
  validate(lesson, p) {
    try {
      const r = this.exec(lesson.sql(p));
      if (lesson.kind === 'quiz') return p.ans !== undefined && p.ans !== null && p.ans !== '';
      if (!r || !r.values.length) return false;
      if (r.dml && !r.dml.changed) return false;
      if (lesson.tie) {
        const v = this.values(lesson.tie(p)).map(x => x[0]);
        if (new Set(v).size !== v.length) return false;
      }
      return true;
    } catch (e) { return false; }
  }
  genOne(lesson, ds, seed) {
    const R = makeRng(seed);
    const ctx = { values: s => this.values(s) };
    for (let attempt = 0; attempt < 40; attempt++) {
      const p = lesson.gen(ds, R, ctx);
      if (p && this.validate(lesson, p)) return p;
    }
    return null;
  }
  themesFor(lesson) { return lesson.kind === 'join' ? JOIN_DATASETS : lesson.themes === 'null' ? NULL_DATASETS : lesson.themes === 'analysis' ? ANALYSIS_THEMES : SINGLE_DATASETS; }
  /** Example + 5 practice problems (fill, order, write ×3) for a lesson and set code. */
  lessonProblems(lesson, code) {
    const key = `${code}|${lesson.key}`;
    if (this._cache.has(key)) return this._cache.get(key);
    const out = [this.demoProblem(lesson)];
    const pool = makeRng(key).shuffle(this.themesFor(lesson));
    const seen = new Set([out[0].sql]);
    for (const ds of pool) {
      if (out.length >= stagesOf(lesson).length) break;
      const p = this.genOne(lesson, ds, `${key}|${ds.table || ds.key}`);
      if (!p) continue;
      const prob = this.buildProblem(lesson, p, 'practice', out.length, ds.table || ds.key);
      if (seen.has(prob.sql)) continue;
      if (prob.stage === 'order' && !this.orderTask(prob)) continue;
      seen.add(prob.sql); out.push(prob);
    }
    this._cache.set(key, out);
    return out;
  }
  /** One extra "write" problem for spaced review / mixed practice. */
  reviewProblem(lesson, seed) {
    const R = makeRng(seed);
    for (const ds of R.shuffle(this.themesFor(lesson))) {
      const p = this.genOne(lesson, ds, `${seed}|${ds.table || ds.key}`);
      if (p) { const pr = this.buildProblem(lesson, p, 'review', 0, ds.table || ds.key); pr.stage = lesson.kind === 'quiz' ? 'quiz' : 'write'; pr.id = `${lesson.key}:review:${hashStr(pr.sql).toString(36)}`; return pr; }
    }
    return this.demoProblem(lesson);
  }

  /* ----- fill in the blank ----- */
  /**
   * → { parts: [text, {blank:0}, text, ...], answers: ['Electronics', 'DESC', '3'] }
   * The same parameter appearing twice shares one blank id.
   */
  fillTask(prob) {
    const lesson = LESSON_BY_KEY[prob.lesson];
    const keys = blanksOf(lesson, prob.p);
    const sp = Object.assign({}, prob.p);
    keys.forEach((k, i) => (sp[k] = `__B${i}__`));
    const tpl = lesson.sql(sp);
    const parts = [];
    const re = /__B(\d+)__/g;
    let last = 0, m;
    const order = [];   // blank ids in order of first appearance
    while ((m = re.exec(tpl))) {
      const orig = +m[1];
      if (!order.includes(orig)) order.push(orig);
      parts.push(tpl.slice(last, m.index)); parts.push({ blank: order.indexOf(orig) }); last = re.lastIndex;
    }
    parts.push(tpl.slice(last));
    // recover the expected text of each blank from the real answer
    const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const firstSeen = new Set();
    const pattern = parts.map(x => {
      if (typeof x === 'string') return escRe(x);
      if (firstSeen.has(x.blank)) return `\\${x.blank + 1}`;
      firstSeen.add(x.blank); return '(.+?)';
    }).join('');
    const mm = new RegExp('^' + pattern + '$', 's').exec(prob.sql);
    const answers = order.map((_, i) => (mm ? mm[i + 1] : ''));
    return { parts, answers };
  }
  fillSql(task, values) {
    return task.parts.map(x => (typeof x === 'string' ? x : (values[x.blank] || ''))).join('');
  }

  /* ----- clause ordering (Parsons) ----- */
  /** → { chunks: [{id, text, distractor}], answer: [ids in order] } or null */
  orderTask(prob) {
    if (prob._order !== undefined) return prob._order;
    const chunks = splitClauses(prob.sql);
    if (chunks.length < 2) return (prob._order = null);
    const R = makeRng('order|' + prob.id);
    const exp = this.exec(prob.sql);
    // one plausible wrong piece
    const cands = [];
    chunks.forEach((c, i) => {
      const k = clauseKind(c);
      if (k === 'order') cands.push([i, /\bDESC\b/i.test(c) ? c.replace(/\bDESC\b/i, 'ASC') : c.replace(/\bASC\b/i, 'DESC')]);
      if (k === 'where' && LESSON_BY_KEY[prob.lesson].ch === 'agg' && /\(/.test(c)) cands.push([i, c.replace(/^WHERE/i, 'HAVING')]);
      if (k === 'having') cands.push([i, c.replace(/^HAVING/i, 'WHERE')]);
      if (k === 'join_inner') cands.push([i, c.replace(/^INNER JOIN/i, 'LEFT JOIN')]);
      if (k === 'join_left') cands.push([i, c.replace(/^LEFT JOIN/i, 'INNER JOIN')]);
      if (k === 'limit' || k === 'offset') cands.push([i, c.replace(/\d+/, n => String(+n + 1))]);
      if (k === 'where' && /BETWEEN/i.test(c)) cands.push([i, c.replace(/(\d+)\s*$/, n => String(+n + (+n >= 100 ? 100 : 10)))]);
      if (k === 'where' && /LIKE/i.test(c)) cands.push([i, c.replace(/'%(.*)%'/, "'$1'")]);
      if (k === 'where' && /=\s*'/.test(c)) cands.push([i, c.replace(/=\s*'([^']*)'/, '= $1')]);
      if (k === 'where' && />=/.test(c)) cands.push([i, c.replace('>=', '<=')]);
      if (k === 'where' && /IS NULL/i.test(c)) cands.push([i, c.replace(/IS NULL/i, '= NULL')]);
      if (k === 'group' && i > 0) cands.push([i, c]);
      if (k === 'set' && /=\s*\d+$/.test(c)) cands.push([i, c.replace(/(\d+)$/, n => String(+n + 1))]);
    });
    let distractor = null;
    for (const [i, text] of R.shuffle(cands)) {
      if (text === chunks[i] && clauseKind(text) !== 'group') continue;
      const wrong = chunks.slice(); wrong[i] = text;
      let ok = false;
      try { const r = this.runUser(wrong.join(' ')); ok = grade(r, exp, prob.ordered).ok; } catch (e) { ok = false; }
      if (!ok || clauseKind(text) === 'group') { if (text !== chunks[i]) { distractor = text; break; } }
    }
    const items = chunks.map((text, i) => ({ id: 'c' + i, text, distractor: false }));
    if (distractor) items.push({ id: 'x', text: distractor, distractor: true });
    return (prob._order = { chunks: R.shuffle(items), answer: chunks.map((_, i) => 'c' + i) });
  }

  /* ----- paper test ----- */
  /**
   * opts: { lessons:[keys], per, type:'write'|'predict'|'mix', code, version:'A'|'B' }
   * Version B keeps the same data sheet, lessons and question types as A, with different values.
   */
  makeTest(opts) {
    const R = makeRng(`test|${opts.code}`);
    const singles = R.shuffle(SINGLE_DATASETS).slice(0, 2);
    const joins = R.shuffle(JOIN_DATASETS).slice(0, 2);
    const ver = opts.version || 'A';
    const questions = [], seen = new Set();
    const RT = makeRng(`test-types|${opts.code}`);
    LESSONS.filter(l => opts.lessons.includes(l.key) && l.kind !== 'quiz').forEach(lesson => {
      const themes = lesson.kind === 'join' ? joins : lesson.themes === 'null' ? NULL_DATASETS.slice(0, 2) : lesson.themes === 'analysis' ? R.shuffle(ANALYSIS_THEMES).slice(0, 2) : singles;
      for (let q = 0; q < opts.per; q++) {
        const wantType = opts.type === 'mix' ? (RT.next() < 0.5 ? 'write' : 'predict') : opts.type;
        let made = null;
        for (let i = 0; i < 24 && !made; i++) {
          const shift = lesson.themes === 'analysis' && ver === 'B' ? 1 : 0;   // analysis answers depend mostly on the table: B uses the other one
          const ds = themes[(q + i + shift) % themes.length];
          const p = this.genOne(lesson, ds, `test|${opts.code}|${ver}|${lesson.key}|${q}|${i}`);
          if (!p) continue;
          const prob = this.buildProblem(lesson, p, 'test', questions.length + 1, ds.table || ds.key);
          if (seen.has(prob.sql)) continue;
          made = prob;
        }
        if (!made) continue;
        seen.add(made.sql);
        made.result = this.exec(made.sql);
        made.qtype = wantType === 'predict' && this.predictable(made) ? 'predict' : 'write';
        questions.push(made);
      }
    });
    const tables = [];
    questions.forEach(q => q.tables.forEach(t => { if (!tables.includes(t)) tables.push(t); }));
    // keep the data sheet identical between versions: list every table of the chosen themes that A or B could use
    return { questions, tables, version: ver };
  }
  predictable(prob) {
    const r = prob.result;
    if (!r || r.values.length > 6 || r.columns.length > 4) return false;
    return r.values.every(row => row.every(v => typeof v !== 'number' || Number.isInteger(v)));
  }
}
