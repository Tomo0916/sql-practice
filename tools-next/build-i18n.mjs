// usedKeys(): every text key the app needs (used by check.mjs).
// The generator below was used once to create next/i18n/*.js; those files are now the ones to edit.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', 'next');
const { LESSONS, CHAPTERS } = await import(path.join(root, 'js/lessons.js'));
const { SINGLE_DATASETS, JOIN_DATASETS } = await import(path.join(root, 'js/datasets.js'));

export function usedKeys() {
  const keys = new Set();
  for (const f of fs.readdirSync(path.join(root, 'js'))) {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    for (const m of src.matchAll(/\b(?:T|t|H|th|bi|raw|P|two)\(\s*['`]([a-zA-Z0-9_.]+)['`]/g)) if (!m[1].endsWith('.') && !/\.rule$/.test(m[1])) keys.add(m[1]);
    // keys chosen with ?: e.g. T(x ? 'tc.signIn' : 'tc.signUp')
    for (const m of src.matchAll(/['`]((?:nav|foot|home|class|mix|review|words|set|stage|inst|lesson|pres|hint|fill|order|fb|viz|tc|test|prob|ed|res|btn|misc|prog|book)\.[A-Za-z0-9_.]*[A-Za-z0-9_])['`]/g)) keys.add(m[1]);
  }
  for (let i = 1; i <= 6; i++) keys.add('book.rule' + i);
  { // typical mistakes on textbook pages: MISTAKES = { lesson: [['dxKey', vars], ...] }
    const src = fs.readFileSync(path.join(root, 'js/book.js'), 'utf8');
    const block = src.slice(src.indexOf('const MISTAKES'), src.indexOf('export const MISTAKE_KEYS'));
    for (const m of block.matchAll(/\[\s*'([a-zA-Z_]+)'/g)) keys.add('dx.' + m[1]);
  }
  CHAPTERS.forEach(c => { keys.add('ch.' + c.key); keys.add('ch.' + c.key + '.desc'); });
  LESSONS.forEach(l => {
    ['title', 'point', 'desc'].forEach(f => keys.add(`L.${l.key}.${f}`));
    for (const m of l.syntax.matchAll(/\{(\w+)\}/g)) keys.add('ph.' + m[1]);
  });
  SINGLE_DATASETS.forEach(d => keys.add('ds.' + d.table));
  JOIN_DATASETS.forEach(d => keys.add('ds.' + d.key));
  ['asc', 'desc', 'az', 'za'].forEach(k => keys.add('ord.' + k));
  ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'].forEach(k => keys.add('agg.' + k));
  ['demo', 'fill', 'order', 'write'].forEach(k => keys.add('inst.' + k));
  ['step.from', 'step.join_inner', 'step.join_left', 'step.where', 'step.group', 'step.having', 'step.agg', 'step.select', 'step.distinct', 'step.order', 'step.limit', 'step.offset'].forEach(k => keys.add(k));
  for (const f of ['diagnose.js']) {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    for (const m of src.matchAll(/add\(([^;]*?)[,)]/g)) for (const q of m[1].matchAll(/'([a-zA-Z]+)'/g)) keys.add('dx.' + q[1]);
    for (const m of src.matchAll(/\{ key: '([a-zA-Z]+)', test/g)) keys.add('dx.fix_' + m[1]);
  }
  ['distractor', 'missingPiece', 'wrongOrder', 'tooMany', 'tooFew', 'rows', 'noOrder', 'reversed', 'order', 'values', 'noResult', 'cols', 'needOrder', 'missingComma'].forEach(k => keys.add('dx.' + k));
  ['SELECT', 'FROM', 'WHERE', 'BETWEEN', 'LIKE', 'DISTINCT', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP BY', 'HAVING', 'INNER JOIN', 'LEFT JOIN', 'JOIN', 'ON', 'IS NULL', 'NULL', 'AND'].forEach(k => keys.add('kw.' + k));
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
