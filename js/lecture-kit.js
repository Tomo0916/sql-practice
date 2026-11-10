/* =========================================================
 * lecture-kit.js — small tools for writing lectures.
 * Tables are computed from the app's own data, never typed.
 * ========================================================= */

/** a text in English, Japanese and Easy Japanese ({漢字|かんじ} = furigana) */
export const T3 = (en, ja, easy) => ({ en, ja, easy });

/**
 * rows of a SELECT as {k, cells}; the key is the first column unless keyCol says which.
 * opts: hide (columns not shown), hl (highlighted columns), dim (grey the others), nohead (no column names),
 *       cls(values, columns) → 'pass' | 'fail' | 'g0'… for a row
 */
export function state(engine, sql, opts = {}) {
  const r = engine.exec(sql);
  const ki = opts.keyCol ? r.columns.indexOf(opts.keyCol) : 0;
  const hide = new Set((opts.hide || []).map(c => r.columns.indexOf(c)));
  return {
    cols: r.columns.filter((_, i) => !hide.has(i)),
    hl: opts.hl || [],
    dim: !!opts.dim,   // columns that are not highlighted are greyed out
    nohead: !!opts.nohead,   // values typed in the SQL itself: the column names would only repeat them
    rows: r.values.map(v => ({ k: String(v[ki]), cells: v.filter((_, i) => !hide.has(i)), cls: opts.cls ? opts.cls(v, r.columns) : '' }))
  };
}
export const col = (cols, name) => cols.indexOf(name);

/**
 * A table where every row is checked against a condition (✓ kept / ✕ removed):
 * all = the SELECT of every row, where = the condition (SQL), cols = columns to highlight.
 */
export function checked(engine, all, where, cols, opts = {}) {
  const base = /\bFROM\s+(\w+)/i.exec(all)[1];
  const key = engine.exec(all).columns[0];
  const hit = engine.exec(`SELECT ${key} FROM ${base} WHERE ${where};`);   // null when no row matches
  const ok = new Set((hit ? hit.values : []).map(v => String(v[0])));
  return state(engine, all, Object.assign({ hl: cols, cls: v => (ok.has(String(v[0])) ? 'pass' : 'fail') }, opts));
}

/** the right choice of a quiz slide: a number, or worked out from the data */
export function quizAnswer(s, engine) {
  if (typeof s.answer === 'number') return s.answer;
  const v = String(s.answer(engine));
  return s.choices.findIndex(c => String(typeof c === 'string' ? c : c.en) === v);
}
