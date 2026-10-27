/* =========================================================
 * engine.js — problem generation, SQL execution and grading
 * Works in the browser and in Node (tools/check.js).
 * ========================================================= */

const PRACTICE_COUNT = 5;

/* ---------- seeded randomness ---------- */
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function makeRng(seedText) {
  let a = hashStr(String(seedText)) || 1;
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const R = {
    next,
    int: (lo, hi) => (hi < lo ? lo : lo + Math.floor(next() * (hi - lo + 1))),
    pick: arr => arr[Math.floor(next() * arr.length)],
    shuffle: arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  };
  return R;
}
/** Today's set code, e.g. "20261028" (local time) — changes every day. */
function todayCode(d) {
  d = d || new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
/** A short random code that is easy to read aloud / write on the board (no 0/O/1/I). */
function randomCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}
function normCode(s) { return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16); }

/* ---------- SQL safety ---------- */
const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|REINDEX|ANALYZE)\b/i;
function stripLiterals(sql) {
  return sql.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""').replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/* ---------- the engine ---------- */
class SqlEngine {
  constructor(SQL) { this.SQL = SQL; this.reset(); this._cache = new Map(); }
  reset() {
    if (this.db) try { this.db.close(); } catch (e) { /* ignore */ }
    this.db = new this.SQL.Database();
    this.db.run(datasetSQL(Object.values(ALL_TABLES)));
  }
  /** Run trusted SQL (answers, steps) → {columns, values} of the last statement, or null. */
  exec(sql) {
    const res = this.db.exec(sql);
    return res.length ? res[res.length - 1] : null;
  }
  values(sql) { const r = this.exec(sql); return r ? r.values : []; }
  /** Run student SQL safely. Throws Error with .code = 'empty' | 'onlySelect' or the SQLite message. */
  runUser(sql) {
    const clean = stripLiterals(sql || '').trim();
    if (!clean.replace(/;/g, '').trim()) { const e = new Error('empty'); e.code = 'empty'; throw e; }
    if (FORBIDDEN.test(clean)) { const e = new Error('onlySelect'); e.code = 'onlySelect'; throw e; }
    this.db.exec('SAVEPOINT student');
    try {
      const res = this.db.exec(sql);
      return res.length ? res[res.length - 1] : { columns: [], values: [] };
    } finally {
      try { this.db.exec('ROLLBACK TO student; RELEASE student;'); } catch (e) { this.reset(); }
    }
  }
  tableData(name) { return this.exec(`SELECT * FROM ${name};`); }

  /* ----- problem generation ----- */
  buildProblem(lesson, p, kind, idx, dsLabel) {
    const sql = lesson.sql(p);
    const blankP = Object.assign({}, p);
    (lesson.blanks || []).forEach(k => (blankP[k] = BLANK));
    const tables = lesson.kind === 'join' ? [p.L, p.R] : [p.t];
    return {
      id: kind === 'demo' ? `${lesson.key}:demo` : `${lesson.key}:${hashStr(sql).toString(36)}`,
      lesson: lesson.key, kind, idx, tables, p, sql,
      blank: lesson.sql(blankP),
      steps: lesson.steps ? lesson.steps(p) : [],
      ordered: /\bORDER\s+BY\b/i.test(sql),
      label: dsLabel || (ALL_TABLES[tables[0]] && ALL_TABLES[tables[0]].label) || null
    };
  }
  demoProblem(lesson) {
    return this.buildProblem(lesson, Object.assign({}, lesson.demo.p), 'demo', 0);
  }
  /** Is this generated problem usable? (runs, has rows, no ties in sort keys) */
  validate(lesson, p) {
    try {
      const r = this.exec(lesson.sql(p));
      if (!r || !r.values.length) return false;
      if (lesson.tie) {
        const v = this.values(lesson.tie(p)).map(x => x[0]);
        if (new Set(v).size !== v.length) return false;
      }
      return true;
    } catch (e) { return false; }
  }
  /** Generate one problem for a lesson from one dataset. */
  genOne(lesson, ds, seed) {
    const R = makeRng(seed);
    const ctx = { values: s => this.values(s) };
    for (let attempt = 0; attempt < 40; attempt++) {
      const p = lesson.gen(ds, R, ctx);
      if (p && this.validate(lesson, p)) return p;
    }
    return null;
  }
  /** Example + practice problems for a lesson, decided by the set code. */
  lessonProblems(lesson, code, count) {
    count = count || PRACTICE_COUNT;
    const key = `${code}|${lesson.key}`;
    if (this._cache.has(key)) return this._cache.get(key);
    const out = [this.demoProblem(lesson)];
    const pool = makeRng(key).shuffle(lesson.kind === 'join' ? JOIN_DATASETS : SINGLE_DATASETS);
    const seen = new Set([out[0].sql]);
    for (const ds of pool) {
      if (out.length > count) break;
      const p = this.genOne(lesson, ds, `${key}|${ds.table || ds.key}`);
      if (!p) continue;
      const prob = this.buildProblem(lesson, p, 'practice', out.length, ds.label);
      if (seen.has(prob.sql)) continue;
      seen.add(prob.sql); out.push(prob);
    }
    this._cache.set(key, out);
    return out;
  }

  /* ----- paper test ----- */
  /**
   * opts: { lessons:[keys], per, type:'write'|'predict'|'mix', code }
   * Uses a small set of themes for the whole test so the data sheet stays short.
   */
  makeTest(opts) {
    const R = makeRng(`test|${opts.code}`);
    const singles = R.shuffle(SINGLE_DATASETS).slice(0, 2);
    const joins = R.shuffle(JOIN_DATASETS).slice(0, 2);
    const questions = [];
    const seen = new Set();
    LESSONS.filter(l => opts.lessons.includes(l.key)).forEach(lesson => {
      const themes = lesson.kind === 'join' ? joins : singles;
      let made = 0;
      for (let i = 0; made < opts.per && i < opts.per * 12; i++) {
        const ds = themes[i % themes.length];
        const p = this.genOne(lesson, ds, `test|${opts.code}|${lesson.key}|${i}`);
        if (!p) continue;
        const prob = this.buildProblem(lesson, p, 'test', questions.length + 1, ds.label);
        if (seen.has(prob.sql)) continue;
        seen.add(prob.sql);
        prob.result = this.exec(prob.sql);
        let type = opts.type === 'mix' ? (R.next() < 0.5 ? 'write' : 'predict') : opts.type;
        if (type === 'predict' && !this.predictable(prob)) type = 'write';
        prob.qtype = type;
        questions.push(prob); made++;
      }
    });
    const tables = [];
    questions.forEach(q => q.tables.forEach(t => { if (!tables.includes(t)) tables.push(t); }));
    return { questions, tables };
  }
  /** Results that are reasonable to write by hand. */
  predictable(prob) {
    const r = prob.result;
    if (!r || r.values.length > 6 || r.columns.length > 4) return false;
    return r.values.every(row => row.every(v => typeof v !== 'number' || Number.isInteger(v)));
  }
}

/* ---------- grading ---------- */
function normVal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  return String(v);
}
const rowKey = r => JSON.stringify(r.map(normVal));
function sameMultiset(a, b) {
  const x = a.map(rowKey).sort(), y = b.map(rowKey).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
/** Try to reorder the student's columns so they line up with the expected ones. */
function alignColumns(user, exp) {
  const n = exp.columns.length;
  const sig = (rows, j) => JSON.stringify(rows.map(r => normVal(r[j])).map(v => JSON.stringify(v)).sort());
  const used = new Set(), map = [];
  for (let j = 0; j < n; j++) {
    const s = sig(exp.values, j);
    let found = -1;
    for (let k = 0; k < n; k++) if (!used.has(k) && sig(user.values, k) === s) { found = k; break; }
    if (found < 0) return null;
    used.add(found); map.push(found);
  }
  return user.values.map(r => map.map(k => r[k]));
}
/** → { ok, reason, a, b }  reason: 'cols' | 'rows' | 'order' | 'values' | 'noResult' */
function grade(user, exp, ordered) {
  if (!user || !user.columns || !user.columns.length) return { ok: false, reason: 'noResult' };
  if (user.columns.length !== exp.columns.length) return { ok: false, reason: 'cols', a: user.columns.length, b: exp.columns.length };
  if (user.values.length !== exp.values.length) return { ok: false, reason: 'rows', a: user.values.length, b: exp.values.length };
  const candidates = [user.values];
  const aligned = alignColumns(user, exp);
  if (aligned) candidates.push(aligned);
  for (const vals of candidates) {
    if (ordered) {
      if (vals.every((r, i) => rowKey(r) === rowKey(exp.values[i]))) return { ok: true };
    } else if (sameMultiset(vals, exp.values)) return { ok: true };
  }
  if (ordered && candidates.some(v => sameMultiset(v, exp.values))) return { ok: false, reason: 'order' };
  return { ok: false, reason: 'values' };
}

/* ---------- text helpers ---------- */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function langIdx(lang) { const i = LANG_CODES.indexOf(lang); return i < 0 ? 1 : i; }
function L10(arr, lang) { return (arr && (arr[langIdx(lang)] || arr[1])) || ''; }

/** Problem statement as HTML in the given language. */
function problemHTML(prob, lang) {
  const lesson = LESSON_BY_KEY[prob.lesson];
  const p = prob.p;
  const view = Object.assign({}, p, lesson.kind === 'join' ? joinView(p) : {}, lesson.view ? lesson.view(p) : {});
  return esc(L10(lesson.desc, lang)).replace(/\{(\w+)\}/g, (m, k) => {
    if (k === 'ord') return esc(t('ord.' + p.ord, lang));
    if (k === 'f' || k === 'f1' || k === 'f2') return `<b class="agg">${esc(t('agg.' + p[k], lang))}</b>`;
    if (view[k] === undefined) return m;
    return `<code>${esc(view[k])}</code>`;
  });
}
/** Hint 1: the syntax pattern with translated placeholders. */
function syntaxHint(lesson, lang) {
  return lesson.syntax.replace(/\{(\w+)\}/g, (m, k) => `‹${t('ph.' + k, lang)}›`);
}

const LESSON_BY_KEY = {};
LESSONS.forEach((l, i) => { l.index = i; LESSON_BY_KEY[l.key] = l; });

if (typeof module !== 'undefined') module.exports = { SqlEngine, grade, makeRng, hashStr, todayCode, randomCode, normCode, problemHTML, syntaxHint, L10, esc, LESSON_BY_KEY, PRACTICE_COUNT };
