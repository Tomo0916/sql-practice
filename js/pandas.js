/* =========================================================
 * pandas.js — the Python course (データ編): the same tables as the SQL lessons,
 * handled with pandas. No DOM (tools-next/check.mjs runs every reference answer with CPython + pandas).
 *
 * A lesson: { key, no, sql (the SQL lesson it matches), gen(ds, R) → p, code(p) → the reference answer,
 *             desc(p) → [i18n key, vars], ordered (row order matters), join (two tables),
 *             data ('null' | 'date': the tables with missing values / dates), plot (the answer is a chart),
 *             vary (p.v is the kind of problem: a set mixes the kinds), vals(p) (the values for the quick-input chips),
 *             pkgs (extra Pyodide packages: 'scipy', 'statsmodels' — loaded only for these lessons) }
 * vars in desc: plain values are shown as code; { k: key, v: vars } is a text of its own (cmp.ge …).
 * A problem: { id, lesson, ds (table name / join key), p, code, demo }
 * The answer is the value of the last line (as in a notebook); results are compared as tables
 * (pyrun.js / py-worker.js normalise them the same way).
 * ========================================================= */
import { makeRng } from './engine.js';
import { SINGLE_DATASETS, JOIN_DATASETS, NULL_DATASETS, DATE_DATASETS } from './datasets.js';

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
    desc: p => ['pd.d.merge', { l: p.l, r: p.r, a: p.a, b: p.b }] },
  /* ---------- Lessons 13–21: the data scientist's everyday tools ---------- */
  { key: 'pd_na', no: 13, sql: 'null', data: 'null',
    vary: true, vals: p => (p.v === 'fill' ? [p.w] : []),
    gen: (ds, R) => ({ t: ds.table, c: ds.roles.opt, v: R.pick(['rows', 'notna', 'count', 'fill']), w: R.pick(['none', 'unknown', '-']) }),
    code: p => (p.v === 'rows' ? `${p.t}[${p.t}[${q(p.c)}].isna()]` : p.v === 'notna' ? `${p.t}[${p.t}[${q(p.c)}].notna()]`
      : p.v === 'count' ? `${p.t}[${q(p.c)}].isna().sum()` : `${p.t}.fillna({${q(p.c)}: ${q(p.w)}})`),
    desc: p => ['pd.d.na_' + p.v, { t: p.t, c: p.c, w: p.w }] },
  { key: 'pd_newcol', no: 14, sql: 'alias',
    vary: true, vals: p => (p.v === 'apply' ? [p.n] : []),
    gen: (ds, R) => { const r = ds.roles, v = R.pick(['tax', 'ratio', 'apply']); return { t: ds.table, a: r.name, c: r.n1, c2: r.n2, v, n: v === 'apply' ? midValue(ds, r.n1, R) : undefined }; },
    code: p => (p.v === 'tax' ? `${p.t}["with_tax"] = ${p.t}[${q(p.c)}] * 1.1\n${p.t}[[${q(p.a)}, ${q(p.c)}, "with_tax"]]`
      : p.v === 'ratio' ? `${p.t}["per"] = ${p.t}[${q(p.c)}] / ${p.t}[${q(p.c2)}]\n${p.t}[[${q(p.a)}, "per"]]`
        : `${p.t}["level"] = ${p.t}[${q(p.c)}].apply(lambda x: "high" if x >= ${p.n} else "low")\n${p.t}[[${q(p.a)}, ${q(p.c)}, "level"]]`),
    desc: p => ['pd.d.new_' + p.v, { t: p.t, a: p.a, c: p.c, c2: p.c2, n: p.n }] },
  { key: 'pd_str', no: 15, sql: 'like',
    vary: true, vals: p => (p.v === 'len' ? [p.n] : p.v === 'upper' ? [] : [p.w]),
    gen: (ds, R) => {
      const c = ds.roles.name, names = values(ds, c).map(String), v = R.pick(['contains', 'upper', 'len', 'starts']);
      if (v === 'contains') { const words = [...new Set(names.flatMap(x => x.split(/\s+/)).filter(w => w.length >= 3))]; return { t: ds.table, c, v, w: R.pick(words) }; }
      if (v === 'starts') return { t: ds.table, c, v, w: R.pick(names)[0] };
      if (v === 'len') { const ls = [...new Set(names.map(x => x.length))].sort((a, b) => a - b); return { t: ds.table, c, v, n: ls[R.int(1, ls.length - 2)] }; }
      return { t: ds.table, c, v };
    },
    code: p => (p.v === 'contains' ? `${p.t}[${p.t}[${q(p.c)}].str.contains(${q(p.w)})]` : p.v === 'starts' ? `${p.t}[${p.t}[${q(p.c)}].str.startswith(${q(p.w)})]`
      : p.v === 'len' ? `${p.t}[${p.t}[${q(p.c)}].str.len() >= ${p.n}]` : `${p.t}[${q(p.c)}].str.upper()`),
    desc: p => ['pd.d.str_' + p.v, { t: p.t, c: p.c, w: p.w, n: p.n }] },
  { key: 'pd_date', no: 16, sql: 'dates', data: 'date',
    vary: true, vals: p => (p.v === 'month' ? [p.n] : []),
    gen: (ds, R) => { const r = ds.roles; return { t: ds.table, d: r.d, a: r.name, c: r.n1, v: R.pick(['month', 'bymonth', 'resample']), n: R.int(3, 6) }; },
    code: p => (p.v === 'month' ? `${p.t}[${q(p.d)}] = pd.to_datetime(${p.t}[${q(p.d)}])\n${p.t}[${p.t}[${q(p.d)}].dt.month == ${p.n}]`
      : p.v === 'bymonth' ? `${p.t}[${q(p.d)}] = pd.to_datetime(${p.t}[${q(p.d)}])\n${p.t}.groupby(${p.t}[${q(p.d)}].dt.month)[${q(p.c)}].sum()`
        : `${p.t}[${q(p.d)}] = pd.to_datetime(${p.t}[${q(p.d)}])\n${p.t}.resample("MS", on=${q(p.d)})[${q(p.c)}].sum()`),
    desc: p => ['pd.d.date_' + p.v, { t: p.t, d: p.d, c: p.c, n: p.n }] },
  { key: 'pd_dup', no: 17, sql: 'distinct',
    vary: true, vals: () => [],
    gen: (ds, R) => ({ t: ds.table, c: ds.roles.cat, v: R.pick(['unique', 'first', 'last', 'nunique']) }),
    code: p => (p.v === 'unique' ? `${p.t}[${q(p.c)}].drop_duplicates()` : p.v === 'first' ? `${p.t}.drop_duplicates(subset=[${q(p.c)}])`
      : p.v === 'last' ? `${p.t}.drop_duplicates(subset=[${q(p.c)}], keep="last")` : `${p.t}[${q(p.c)}].nunique()`),
    desc: p => ['pd.d.dup_' + p.v, { t: p.t, c: p.c }] },
  { key: 'pd_pivot', no: 18, sql: 'groupby',
    vary: true, vals: p => (p.v === 'cross' ? [p.n] : []),
    gen: (ds, R) => { const r = ds.roles, v = R.pick(['pivot', 'pivot', 'two', 'cross']); return { t: ds.table, g: r.cat, c: R.pick([r.n1, r.n2]), c2: r.n2, a: r.n1, v, f: R.pick(['mean', 'sum', 'max', 'min']), n: midValue(ds, r.n1, R) }; },
    code: p => (p.v === 'pivot' ? `pd.pivot_table(${p.t}, index=${q(p.g)}, values=${q(p.c)}, aggfunc=${q(p.f)})`
      : p.v === 'two' ? `pd.pivot_table(${p.t}, index=${q(p.g)}, values=[${q(p.a)}, ${q(p.c2)}], aggfunc="mean")`
        : `pd.crosstab(${p.t}[${q(p.g)}], ${p.t}[${q(p.a)}] >= ${p.n})`),
    desc: p => [p.v === 'pivot' ? 'pd.d.pivot' : 'pd.d.pivot_' + p.v, { t: p.t, g: p.g, c: p.c, a: p.a, c2: p.c2, n: p.n, f: { k: 'agg.' + FUN[p.f] } }] },
  { key: 'pd_concat', no: 19, sql: 'setops',
    vary: true, vals: p => (p.v === 'headtail' ? [p.k] : [p.n, p.w]),
    gen: (ds, R) => { const r = ds.roles; return { t: ds.table, c: r.n1, n: midValue(ds, r.n1, R), g: r.cat, w: R.pick(values(ds, r.cat)), v: R.pick(['all', 'union', 'headtail']), k: R.int(2, 3) }; },
    code: p => (p.v === 'headtail' ? `pd.concat([${p.t}.head(${p.k}), ${p.t}.tail(${p.k})])`
      : `pd.concat([${p.t}[${p.t}[${q(p.c)}] >= ${p.n}], ${p.t}[${p.t}[${q(p.g)}] == ${q(p.w)}]])${p.v === 'union' ? '.drop_duplicates()' : ''}`),
    desc: p => ['pd.d.concat_' + p.v, { t: p.t, a: cmpV('ge', p.c, p.n), b: cmpV('eq', p.g, p.w), k: p.k }] },
  { key: 'pd_how', no: 20, sql: 'left', join: true,
    vary: true, vals: () => [],
    gen: (ds, R) => ({ l: ds.left.table, r: ds.right.table, a: ds.left.roles.id, b: ds.right.roles.key, v: R.pick(['left', 'outer', 'anti']) }),
    code: p => (p.v === 'anti' ? `m = pd.merge(${p.l}, ${p.r}, left_on=${q(p.a)}, right_on=${q(p.b)}, how="left")\nm[m[${q(p.b)}].isna()]`
      : `pd.merge(${p.l}, ${p.r}, left_on=${q(p.a)}, right_on=${q(p.b)}, how=${q(p.v)})`),
    desc: p => ['pd.d.how_' + p.v, { l: p.l, r: p.r, a: p.a, b: p.b }] },
  { key: 'pd_plot', no: 21, sql: 'groupby', plot: true,
    vary: true, vals: p => (p.v === 'hist' ? [p.n] : []),
    gen: (ds, R) => { const r = ds.roles; return { t: ds.table, a: r.name, g: r.cat, c: R.pick([r.n1, r.n2]), c2: r.n2, x: r.n1, v: R.pick(['bar', 'group', 'hist', 'scatter']), f: R.pick(['mean', 'sum', 'max']), n: R.int(3, 5) }; },
    code: p => (p.v === 'bar' ? `${p.t}.plot.bar(x=${q(p.a)}, y=${q(p.c)})` : p.v === 'group' ? `${p.t}.groupby(${q(p.g)})[${q(p.c)}].${p.f}().plot.bar()`
      : p.v === 'hist' ? `${p.t}[${q(p.c)}].plot.hist(bins=${p.n})` : `${p.t}.plot.scatter(x=${q(p.x)}, y=${q(p.c2)})`),
    desc: p => ['pd.d.plot_' + p.v, { t: p.t, a: p.a, g: p.g, c: p.c, x: p.x, c2: p.c2, n: p.n, f: { k: 'agg.' + FUN[p.f] } }] },
  /* ---------- Lessons 22–28: statistics (scipy, statsmodels are loaded for these: pkgs) ---------- */
  { key: 'pd_desc', no: 22, sql: 'an_center',
    vary: true, vals: p => (p.v === 'quantile' ? [p.n] : []),
    gen: (ds, R) => ({ t: ds.table, c: R.pick([ds.roles.n1, ds.roles.n2]), v: R.pick(['describe', 'median', 'quantile', 'std', 'var']), n: R.pick([0.25, 0.75, 0.9]) }),
    code: p => `${p.t}[${q(p.c)}].${p.v === 'quantile' ? `quantile(${p.n})` : p.v + '()'}`,
    desc: p => ['pd.d.desc_' + p.v, { t: p.t, c: p.c, n: p.n }] },
  { key: 'pd_rel', no: 23, sql: 'an_corr',
    vary: true, vals: () => [],
    gen: (ds, R) => { const r = ds.roles; return { t: ds.table, a: r.name, g: r.cat, x: r.n1, y: r.n2, z: r.yr, c: R.pick([r.n1, r.n2]), v: R.pick(['corr', 'matrix', 'z', 'share']) }; },
    code: p => (p.v === 'corr' ? `${p.t}[${q(p.x)}].corr(${p.t}[${q(p.y)}])` : p.v === 'matrix' ? `${p.t}[[${q(p.x)}, ${q(p.y)}, ${q(p.z)}]].corr()`
      : p.v === 'z' ? `${p.t}["z"] = (${p.t}[${q(p.c)}] - ${p.t}[${q(p.c)}].mean()) / ${p.t}[${q(p.c)}].std()\n${p.t}[[${q(p.a)}, ${q(p.c)}, "z"]]`
        : `${p.t}[${q(p.g)}].value_counts(normalize=True)`),
    desc: p => ['pd.d.rel_' + p.v, { t: p.t, a: p.a, g: p.g, x: p.x, y: p.y, z: p.z, c: p.c }] },
  { key: 'st_ci', no: 24, sql: 'an_spread', pkgs: ['scipy'],
    vary: true, vals: p => (p.v === 'sem' ? [] : [p.n]),
    gen: (ds, R) => ({ t: ds.table, c: R.pick([ds.roles.n1, ds.roles.n2]), v: R.pick(['sem', 'low', 'high', 'width']), n: R.pick([0.9, 0.95, 0.99]) }),
    code: p => (p.v === 'sem' ? `${p.t}[${q(p.c)}].sem()`
      : `from scipy import stats\nm, se = ${p.t}[${q(p.c)}].mean(), ${p.t}[${q(p.c)}].sem()\nlow, high = stats.t.interval(${p.n}, df=len(${p.t}) - 1, loc=m, scale=se)\n${p.v === 'width' ? 'high - low' : p.v}`),
    desc: p => ['pd.d.ci_' + p.v, { t: p.t, c: p.c, pc: Math.round(p.n * 100) }] },
  { key: 'st_ttest', no: 25, sql: 'an_compare', pkgs: ['scipy'],
    vary: true, vals: p => (p.v === 'one' ? [p.n] : [p.ga, p.gb]),
    gen: (ds, R) => {
      const r = ds.roles, c = R.pick([r.n1, r.n2]), v = R.pick(['ind', 'welch', 'one', 'sig']);
      const gi = colIdx(ds, r.cat), ci = colIdx(ds, c), by = {};
      ds.rows.forEach(row => { (by[row[gi]] = by[row[gi]] || []).push(row[ci]); });
      const ok = Object.keys(by).filter(k => by[k].length >= 2 && new Set(by[k]).size > 1);
      if (ok.length < 2) return { t: ds.table, c, v: 'one', n: midValue(ds, c, R) };
      const ga = R.pick(ok), gb = R.pick(ok.filter(k => k !== ga));
      return { t: ds.table, g: r.cat, c, v, ga, gb, n: midValue(ds, c, R) };
    },
    code: p => (p.v === 'one' ? `from scipy import stats\nstats.ttest_1samp(${p.t}[${q(p.c)}], ${p.n}).pvalue`
      : `from scipy import stats\na = ${p.t}[${p.t}[${q(p.g)}] == ${q(p.ga)}][${q(p.c)}]\nb = ${p.t}[${p.t}[${q(p.g)}] == ${q(p.gb)}][${q(p.c)}]\nstats.ttest_ind(a, b${p.v === 'welch' ? ', equal_var=False' : ''}).pvalue${p.v === 'sig' ? ' < 0.05' : ''}`),
    desc: p => ['pd.d.t_' + p.v, { t: p.t, g: p.g, c: p.c, ga: p.ga, gb: p.gb, n: p.n }] },
  { key: 'st_chi2', no: 26, sql: 'an_cross', pkgs: ['scipy'],
    vary: true, vals: p => [p.n],
    gen: (ds, R) => { const r = ds.roles, c = R.pick([r.n1, r.n2]); return { t: ds.table, g: r.cat, c, n: midValue(ds, c, R), v: R.pick(['p', 'stat', 'dof', 'sig']) }; },
    code: p => `from scipy import stats\ntab = pd.crosstab(${p.t}[${q(p.g)}], ${p.t}[${q(p.c)}] >= ${p.n})\nstats.chi2_contingency(tab).${{ p: 'pvalue', stat: 'statistic', dof: 'dof', sig: 'pvalue' }[p.v]}${p.v === 'sig' ? ' < 0.05' : ''}`,
    desc: p => ['pd.d.chi_' + p.v, { t: p.t, g: p.g, c: p.c, n: p.n }] },
  { key: 'st_reg', no: 27, sql: 'an_corr', pkgs: ['scipy'],
    vary: true, vals: p => (p.v === 'pred' ? [p.n] : []),
    gen: (ds, R) => { const r = ds.roles, [x, y] = R.pick([[r.n2, r.n1], [r.n1, r.n2]]); return { t: ds.table, x, y, v: R.pick(['slope', 'intercept', 'r2', 'pred']), n: midValue(ds, x, R) }; },
    code: p => `from scipy import stats\nr = stats.linregress(${p.t}[${q(p.x)}], ${p.t}[${q(p.y)}])\n${{ slope: 'r.slope', intercept: 'r.intercept', r2: 'r.rvalue ** 2', pred: `r.intercept + r.slope * ${p.n}` }[p.v]}`,
    desc: p => ['pd.d.reg_' + p.v, { t: p.t, x: p.x, y: p.y, n: p.n }] },
  { key: 'st_mreg', no: 28, sql: 'an_corr', pkgs: ['scipy', 'statsmodels'],
    vary: true, vals: () => [],
    gen: (ds, R) => { const r = ds.roles; return { t: ds.table, y: r.n1, x1: r.n2, x2: r.yr, v: R.pick(['params', 'r2', 'coef']) }; },
    code: p => `import statsmodels.formula.api as smf\nm = smf.ols("${p.y} ~ ${p.x1} + ${p.x2}", data=${p.t}).fit()\n${{ params: 'm.params', r2: 'm.rsquared', coef: `m.params[${q(p.x1)}]` }[p.v]}`,
    desc: p => ['pd.d.mreg_' + p.v, { t: p.t, y: p.y, x1: p.x1, x2: p.x2 }] }
];
export const PD_BY_KEY = Object.fromEntries(PD_LESSONS.map(l => [l.key, l]));
export const PD_N = 5;   // practice problems per set

/** the tables a lesson can use */
export const pdSets = lesson => (lesson.join ? JOIN_DATASETS : lesson.data === 'null' ? NULL_DATASETS : lesson.data === 'date' ? DATE_DATASETS : SINGLE_DATASETS);
const setKey = ds => ds.key || ds.table;
/** one problem: the example (demo) is always on the first table, with a fixed seed */
export function pdProblem(key, seed, demo) {
  const lesson = PD_BY_KEY[key], sets = pdSets(lesson), R = makeRng(`pd|${key}|${seed}`);
  const ds = demo ? sets[0] : sets[R.int(0, sets.length - 1)];
  const p = lesson.gen(ds, R);
  return { id: `py:${key}:${demo ? 'demo' : seed}`, lesson: key, ds: setKey(ds), p, code: lesson.code(p), demo: !!demo, ordered: !!lesson.ordered, plot: !!lesson.plot, pkgs: lesson.pkgs || [] };
}
/** a set: the example and PD_N practice problems (no two the same) */
export function pdSet(key, seed) {
  const demo = pdProblem(key, 'demo', true), out = [], seen = new Set([demo.code]), vary = PD_BY_KEY[key].vary, kinds = new Set();
  for (let i = 0; out.length < PD_N && i < PD_N * 12; i++) {
    const p = pdProblem(key, `${seed}|${i}`);
    if (seen.has(p.code)) continue;
    if (vary && kinds.has(p.p.v) && i < PD_N * 6) continue;   // the kinds of problem first, each once, then any
    if (vary && kinds.size >= new Set(out.map(x => x.p.v)).size && kinds.has(p.p.v) && i < PD_N * 6) continue;
    seen.add(p.code); kinds.add(p.p.v); out.push(p);
  }
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
  [...SINGLE_DATASETS, ...NULL_DATASETS, ...DATE_DATASETS].forEach(d => { out[d.table] = { columns: d.columns.map(c => c[0]), rows: d.rows }; });
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
  if (a.kind === 'plot') return samePlot(a.plot, b.plot);
  if (a.kind === 'value') return typeof a.value === 'number' && typeof b.value === 'number' ? Math.abs(a.value - b.value) < 1e-6 : String(a.value) === String(b.value);
  if (a.columns.length !== b.columns.length || a.rows.length !== b.rows.length) return false;
  let idx = b.columns.map(c => a.columns.indexOf(c));
  if (idx.some(i => i < 0)) idx = b.columns.map((c, i) => i);   // other names (size() instead of value_counts() …): by position
  const ra = a.rows.map(r => JSON.stringify(idx.map(i => num(r[i])))), rb = b.rows.map(r => JSON.stringify(r.map(num)));
  if (ordered) return ra.every((x, i) => x === rb[i]);
  return JSON.stringify(ra.slice().sort()) === JSON.stringify(rb.slice().sort());
}
/**
 * Two charts the same? Same type (bar, hist, scatter, line) and the same numbers: bars as (label, height) pairs in any order,
 * a histogram's heights from left to right, scatter points in any order, line heights in order. Colours and titles do not count.
 */
function samePlot(a, b) {
  if (!a || !b || a.type !== b.type || a.items.length !== b.items.length) return false;
  const r = x => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : Array.isArray(x) ? x.map(r) : x);
  return JSON.stringify(r(a.items)) === JSON.stringify(r(b.items));
}
/** what is different, for the feedback: 'kind' | 'columns' | 'rows' | 'order' | 'values' | 'noplot' | 'plot' */
export function pdDiff(got, want, ordered) {
  if (want && want.kind === 'plot') return got && got.kind === 'plot' ? 'plot' : 'noplot';
  if (!got || got.kind !== want.kind) return 'kind';
  if (got.kind === 'value') return 'values';
  if (got.columns.length !== want.columns.length) return 'columns';
  if (got.rows.length !== want.rows.length) return 'rows';
  if (ordered && pdSame(got, want, false)) return 'order';
  return 'values';
}
