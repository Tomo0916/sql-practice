// usedKeys(): every text key the app needs (used by check.mjs).
// The generator below was used once to create i18n/*.js; those files are now the ones to edit.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const { LESSONS, CHAPTERS } = await import(path.join(root, 'js/lessons.js'));
const { SINGLE_DATASETS, NULL_DATASETS, JOIN_DATASETS, ANALYSIS_THEMES } = await import(path.join(root, 'js/datasets.js'));

/** keys every language must have now include the data-analysis course (kept so check.mjs can list them separately) */
export const ANALYSIS_KEY = /^(L\.an_|ch\.analysis|ph\.(width|mean|sd)$|step\.(sub|case|month|window|mean|dev|coalesce|clean)$|an\.)/;
export const ANALYSIS_LANGS = ['en', 'ja', 'easy', 'fr', 'id', 'vi', 'zh', 'ne', 'bn', 'my', 'si'];
// the shape mix: names of ranges and formats
const MIX_KEYS = ['bs.mix.r.core', 'bs.mix.r.learned', 'bs.mix.r.all', 'bs.mix.f.auto', 'task.again', 'task.continue', 'task.start', 'tc.task.replace', 'tc.task.give', 'tc.task.schema', 'class.netError'];
export function usedKeys() {
  const keys = new Set();
  for (const f of fs.readdirSync(path.join(root, 'js'))) {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    for (const m of src.matchAll(/\b(?:T|t|H|th|bi|raw|P|two)\(\s*['`]([a-zA-Z0-9_.]+)['`]/g)) if (!m[1].endsWith('.') && !/\.rule$/.test(m[1])) keys.add(m[1]);
    // keys chosen with ?: e.g. T(x ? 'tc.signIn' : 'tc.signUp')
    for (const m of src.matchAll(/['`]((?:nav|foot|home|class|mix|review|words|set|stage|inst|lesson|pres|hint|fill|order|fb|viz|tc|test|prob|ed|res|btn|misc|prog|book)\.[A-Za-z0-9_.]*[A-Za-z0-9_])['`]/g)) keys.add(m[1]);
  }
  CHAPTERS.forEach(c => { keys.add('ch.' + c.key); keys.add('ch.' + c.key + '.desc'); });
  // problem texts that change with the problem (descKey in lessons.js)
  ['q_value', 'q_which', 'q_col', 'q_rows', 'q_cols'].forEach(k => keys.add('L.intro.' + k));
  ['desc_and', 'desc_or', 'desc_not'].forEach(k => keys.add('L.andor.' + k));
  ['desc_one', 'desc_many'].forEach(k => keys.add('L.update.' + k));
  for (const [l, k] of [['between', 'desc_in'], ['null', 'desc_not'], ['orderby', 'desc_two'], ['limit', 'desc_offset']]) keys.add(`L.${l}.${k}`);
  ['eq', 'ne', 'gt', 'ge', 'lt', 'le'].forEach(k => keys.add('cmp.' + k));
  for (const [l, ks] of [['an_missing', ['null', 'dup']], ['an_center', ['mid', 'mode']], ['an_spread', ['sd', 'range']], ['an_hist', ['bin', 'freq']], ['an_zscore', ['top', 'count']]]) ks.forEach(k => keys.add(`L.${l}.desc_${k}`));
  ['beginner', 'intermediate', 'advanced'].forEach(k => keys.add('book.lv.' + k));
  // Lessons 19–28, 35, 36: the problem texts of each variant
  for (const [l, ks] of [['case', ['desc3']], ['calc', ['tax', 'ratio', 'avg']], ['coalesce', ['fill', 'count']], ['strfn', ['upper', 'len', 'substr', 'concat']], ['dates', ['range', 'month', 'plus']],
    ['sub1', ['gt', 'lt', 'max', 'min']], ['subin', ['not']], ['subfrom', ['avgsum', 'maxsum', 'maxcnt', 'minavg']], ['with', ['avg', 'big']], ['window', ['rank', 'part', 'run', 'avg']],
    ['join3', ['three', 'threeWhere', 'self', 'selfLeft', 'cross']], ['setops', ['union', 'intersect', 'except']]]) ks.forEach(k => keys.add(k.startsWith('desc') ? `L.${l}.${k}` : `L.${l}.desc_${k}`));
  ['date', 'join3'].forEach(k => keys.add('tb.g.' + k));
  keys.add('dx.quizWrong');
  // the clause quiz (clauses.js): roles, tips, questions and the texts of the choices
  ['select', 'from', 'where', 'order', 'limit', 'group', 'having'].forEach(k => { keys.add('cq.role.' + k); keys.add('cq.tip.' + k); });
  keys.add('cq.tip.seq');
  MIX_KEYS.forEach(k => keys.add(k));
  ['L.more', 'L.moreAgg', 'list.two', 'dif.any', 'dif.1', 'dif.2', 'dif.3', 'dif.about.1', 'dif.about.2', 'dif.about.3', 'bs.all.title', 'dif.more', 'dif.moreAgg', 'cnt.sum'].forEach(k => keys.add(k));
  ['goalQuick', 'goalLevel', 'goalShape'].forEach(k => keys.add('tc.qs.' + k));
  // the Python course (pandas.js): lesson titles, points, problem texts and the feedback
  ['pd_head', 'pd_cols', 'pd_num', 'pd_text', 'pd_andor', 'pd_loc', 'pd_sort', 'pd_top', 'pd_agg', 'pd_group', 'pd_count', 'pd_merge',
    'pd_na', 'pd_newcol', 'pd_str', 'pd_date', 'pd_dup', 'pd_pivot', 'pd_concat', 'pd_how', 'pd_plot',
    'pd_desc', 'pd_rel', 'st_ci', 'st_ttest', 'st_chi2', 'st_reg', 'st_mreg'].forEach(k => { keys.add('pd.t.' + k); keys.add('pd.p.' + k); });
  keys.add('pd.loadingStats');
  ['app', 'book'].forEach(k => keys.add('home.order.' + k));
  ['Write', 'Predict', 'Order', 'Fill'].forEach(t => keys.add('test.type' + t));   // paper test question types
  ['rankup', 'rank', 'check', 'level', 'basics', 'clauses', 'drill', 'practice', 'table', 'lecture', 'py'].forEach(t => keys.add('as.type.' + t));   // sent items (assign.js)
  ['beginner', 'intermediate', 'advanced'].forEach(t => ['rk.tier.', 'rk.tierDesc.', 'rk.tierShort.'].forEach(k => keys.add(k + t)));   // the rank tests   // the home page: textbook order
  ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'more'].forEach(k => { keys.add('book.' + k); keys.add(`book.${k}.desc`); });
  ['desc_describe', 'desc_median', 'desc_quantile', 'desc_std', 'desc_var', 'rel_corr', 'rel_matrix', 'rel_z', 'rel_share', 'ci_sem', 'ci_low', 'ci_high', 'ci_width',
    't_ind', 't_welch', 't_one', 't_sig', 'chi_p', 'chi_stat', 'chi_dof', 'chi_sig', 'reg_slope', 'reg_intercept', 'reg_r2', 'reg_pred', 'mreg_params', 'mreg_r2', 'mreg_coef'].forEach(k => keys.add('pd.d.' + k));
  ['head', 'cols', 'filter', 'and', 'or', 'loc', 'sortAsc', 'sortDesc', 'topAsc', 'topDesc', 'agg', 'group', 'count', 'merge',
    'na_rows', 'na_notna', 'na_count', 'na_fill', 'new_tax', 'new_ratio', 'new_apply', 'str_contains', 'str_upper', 'str_len', 'str_starts',
    'date_month', 'date_bymonth', 'date_resample', 'dup_unique', 'dup_first', 'dup_last', 'dup_nunique', 'pivot', 'pivot_two', 'pivot_cross',
    'concat_all', 'concat_union', 'concat_headtail', 'how_left', 'how_outer', 'how_anti', 'plot_bar', 'plot_group', 'plot_hist', 'plot_scatter'].forEach(k => keys.add('pd.d.' + k));
  ['kind', 'columns', 'rows', 'order', 'values', 'noplot', 'plot'].forEach(k => keys.add('pd.ng.' + k));
  // the count tables (問題の組み立て): difficulty notes and presets
  [1, 2, 3].forEach(b => keys.add(`dif.${b}s`)); ['long', 'alias', 'omit', 'omitLeft', 'bare'].forEach(k => keys.add('short.' + k)); ['write', 'order', 'ow', 'all'].forEach(v => keys.add('tc.qs.kp.' + v)); ['basic', 'easy', 'even', 'hard'].forEach(v => keys.add('dif.p.' + v));
  // reading Python errors (pyerrors.js): meanings, explanations, the error types of the cheat sheet
  ['key', 'list', 'name', 'str', 'attr', 'eq', 'close', 'quote', 'op', 'and', 'merge'].forEach(k => { keys.add('pe.m.' + k); keys.add('pe.x.' + k); });
  ['KeyError', 'NameError', 'AttributeError', 'SyntaxError', 'ValueError', 'TypeError'].forEach(k => keys.add('pe.k.' + k));
  ['A', 'A2', 'B', 'C', 'P', 'R'].forEach(k => keys.add('lv.part.' + k)); [0, 1, 2, 3].forEach(k => keys.add('lv.sc.' + k));
  ['col', 'table', 'val', 'cond', 'expr', 'alias'].forEach(k => keys.add('bs.w.' + k)); ['cols', 'wnum', 'wtext', 'order', 'limit', 'insert', 'update', 'delete'].forEach(k => keys.add('bs.d.' + k)); ['bs.abs.real', 'bs.abs.ng', 'bs.f.abs', 'bs.abs.startPractice', 'bs.abs.introInst'].forEach(k => keys.add(k));
  ['afill', 'aorder', 'awrite'].forEach(k => keys.add('bs.abs.inst.' + k)); ['insert', 'values', 'update', 'set', 'delete', 'join', 'on'].forEach(k => keys.add('bs.r.' + k));
  ['bs.g.cols', 'bs.g.colsAll', 'bs.g.insert', 'bs.g.update', ...['ge', 'gt', 'le', 'lt', 'eq'].map(k => 'bs.g.wnum.' + k), 'bs.g.wtext.eq', 'bs.g.wtext.ne', ...['order', 'limit'].flatMap(k => [`bs.g.${k}.desc`, `bs.g.${k}.asc`])].forEach(k => keys.add(k));
  ['role', 'which', 'blank', 'right', 'cols', 'table', 'rows', 'sort', 'get', 'groups', 'seq'].forEach(k => keys.add('cq.ask.' + k));
  ['all', 'desc', 'asc', 'top', 'bottom', 'nth', 'skip', 'countBy', 'countAll', 'sumBy', 'sumAll', 'hge', 'hgt', 'hle', 'hlt', 'rows'].forEach(k => keys.add('cq.r.' + k));
  ['stat', 'excel', 'python', 'csv', 'toolsTip', 'mean', 'median', 'k.id', 'k.quant', 'k.qual', 'k.date', 'g.copy', 'g.notebook', 'g.answer', 'g.sqlNote', 'beyond'].forEach(k => keys.add('an.' + k));
  ANALYSIS_THEMES.forEach(d => keys.add('ds.' + d.table));
  LESSONS.forEach(l => {
    ['title', 'point', 'desc'].forEach(f => keys.add(`L.${l.key}.${f}`));
    for (const m of l.syntax.matchAll(/\{(\w+)\}/g)) keys.add('ph.' + m[1]);
  });
  SINGLE_DATASETS.forEach(d => keys.add('ds.' + d.table));
  NULL_DATASETS.forEach(d => keys.add('ds.' + d.table));
  JOIN_DATASETS.forEach(d => keys.add('ds.' + d.key));
  ['asc', 'desc', 'az', 'za'].forEach(k => keys.add('ord.' + k));
  ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'].forEach(k => keys.add('agg.' + k));
  ['demo', 'fill', 'order', 'write', 'quiz'].forEach(k => keys.add('inst.' + k));
  ['step.calc', 'step.alias', 'step.insert', 'step.update', 'step.delete', 'step.from', 'step.join_inner', 'step.join_left', 'step.where', 'step.group', 'step.having', 'step.agg', 'step.select', 'step.distinct', 'step.order', 'step.limit', 'step.offset', 'step.sub'].forEach(k => keys.add(k));
  for (const f of ['diagnose.js']) {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    for (const m of src.matchAll(/add\(([^;]*?)[,)]/g)) for (const q of m[1].matchAll(/'([a-zA-Z]+)'/g)) keys.add('dx.' + q[1]);
    for (const m of src.matchAll(/\{ key: '([a-zA-Z]+)', test/g)) keys.add('dx.fix_' + m[1]);
  }
  ['distractor', 'missingPiece', 'wrongOrder', 'tooMany', 'tooFew', 'rows', 'noOrder', 'reversed', 'order', 'values', 'noResult', 'cols', 'needOrder', 'missingComma'].forEach(k => keys.add('dx.' + k));
  ['SELECT', 'FROM', 'AS', 'WHERE', 'AND', 'OR', 'NOT', 'BETWEEN', 'IN', 'LIKE', 'IS NULL', 'NULL', 'DISTINCT', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP BY', 'HAVING', 'INNER JOIN', 'LEFT JOIN', 'JOIN', 'ON'].forEach(k => keys.add('kw.' + k));
  ['table', 'column', 'row', 'value', 'condition', 'sort', 'asc', 'desc', 'duplicate', 'aggregate', 'group', 'join', 'null', 'result', 'error'].forEach(k => keys.add('term.' + k));
  ['after2', 'solved', 'always', 'never'].forEach(p => { keys.add('tc.policy.' + p); keys.add('tc.policyTip.' + p); });
  [1, 2, 3, 4].forEach(i => keys.add('tc.how' + i));
  keys.delete('tc.how'); keys.add('dx.aggWhere'); keys.add('dx.blanksWrong'); keys.add('dx.aggMisuse');
  return [...keys].sort();
}

const MAP = { 'dx.cols': 'fb.cols', 'dx.rows': 'fb.rows', 'dx.order': 'fb.order', 'dx.noResult': 'fb.noResult', 'lesson.done': 'lesson.lessonDone' };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const keys = usedKeys();
  const langs = process.argv.slice(2);
  for (const lang of langs) {
    const ported = fs.existsSync(path.join(here, `ported-${lang}.json`)) ? JSON.parse(fs.readFileSync(path.join(here, `ported-${lang}.json`), 'utf8')) : {};
    const fresh = JSON.parse(fs.readFileSync(path.join(here, 'i18n-src', `${lang}.json`), 'utf8'));
    const out = {}, missing = [];
    for (const k of keys) {
      let v = fresh[k];
      if (v === undefined) v = ported[k];
      if (v === undefined && MAP[k]) v = ported[MAP[k]];
      if (v === undefined && k === 'dx.values' && ported['fb.values']) v = ported['fb.values'] + ' ' + ported['fb.compare'];
      if (v === undefined) { missing.push(k); continue; }
      out[k] = v;
    }
    const unknown = Object.keys(fresh).filter(k => !keys.includes(k));
    const groups = {};
    for (const k of Object.keys(out)) { const g = k.split('.')[0]; (groups[g] = groups[g] || []).push(k); }
    let js = `/* ${lang} — SQL Practice interface and lesson text.\n * Edit freely; run  node tools-next/check.mjs  afterwards.\n * {name} = a value inserted by the app. {漢字|かんじ} = furigana (only in easy.js). */\nexport default {\n`;
    for (const [g, ks] of Object.entries(groups)) {
      js += `  /* ---- ${g} ---- */\n`;
      for (const k of ks) js += `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])},\n`;
    }
    js = js.replace(/,\n$/, '\n') + '};\n';
    fs.writeFileSync(path.join(root, 'i18n', `${lang}.js`), js);
    console.log(lang, Object.keys(out).length, 'keys', missing.length ? 'MISSING: ' + missing.join(' ') : '', unknown.length ? 'UNUSED: ' + unknown.join(' ') : '');
  }
}
