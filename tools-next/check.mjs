#!/usr/bin/env node
/* =========================================================
 * tools-next/check.mjs — run before publishing:
 *     cd tools-next && npm install && node check.mjs
 *  1. every language file has exactly the keys of en.js, the same {placeholders},
 *     no Japanese left in other languages, furigana only in easy.js and well formed
 *  2. every lesson × 60 set codes: example + 5 practice problems, answers run,
 *     return rows, grade as correct; fill-in and ordering tasks are solvable
 *  3. diagnostics give specific advice for typical mistakes
 *  4. paper tests (A/B) can be generated
 *  5. textbook: every "common mistake" SQL really fails (error or different result)
 * ========================================================= */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { lessonState } from '../js/store.js';
import { SqlEngine, LESSON_BY_KEY, stagesOf, grade, todayCode, splitClauses } from '../js/engine.js';
import { diagnose, findFix } from '../js/diagnose.js';
import { LESSONS } from '../js/lessons.js';
import { cqQuiz, CQ_SETS, BLANK } from '../js/clauses.js';
import { mixSteps, mixProblems, MIX_RANGES, MIX_FORMATS, MIX_COUNTS, BASIC_BY_KEY } from '../js/basics.js';
import { usedKeys, ANALYSIS_KEY, ANALYSIS_LANGS } from './build-i18n.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let errors = 0, warnings = 0;
const err = (...a) => { errors++; console.log('  ✗', ...a); };
const warn = (...a) => { warnings++; console.log('  !', ...a); };

/* ---------- 1. languages ---------- */
console.log('1. Language files');
const LANGS = ['ja', 'easy', 'en', 'ne', 'fr', 'my', 'bn', 'si', 'id', 'vi', 'zh'];
const dicts = {};
for (const l of LANGS) dicts[l] = (await import(path.join(here, '../i18n', l + '.js'))).default;
const en = dicts.en;
const need = usedKeys();
need.forEach(k => { if (!(k in en)) err(`en.js is missing "${k}" (used by the app)`); });
const KANA = /[぀-ヿ]/, CJK = /[぀-ヿ一-鿿]/;
const ph = s => [...new Set([...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort().join();
for (const l of LANGS) {
  const d = dicts[l];
  Object.keys(en).forEach(k => { if (!(k in d) && !(ANALYSIS_KEY.test(k) && !ANALYSIS_LANGS.includes(l))) err(`${l}.js missing "${k}"`); });
  Object.keys(d).forEach(k => { if (!(k in en)) warn(`${l}.js has unused "${k}"`); });
  for (const [k, v] of Object.entries(d)) {
    if (typeof v !== 'string' || !v.trim()) { err(`${l}.js "${k}" is empty`); continue; }
    if (ph(v) !== ph(en[k])) err(`${l}.js "${k}" placeholders {${ph(v)}} ≠ English {${ph(en[k])}}`);
    const plain = v.replace(/\{[^{}|]+\|[^{}]+\}/g, '').replace(/`[^`]*`/g, '');   // `code` (SQL, data values) may stay as it is
    if (l !== 'ja' && l !== 'easy') {
      if (l === 'zh' ? KANA.test(plain) : CJK.test(plain)) err(`${l}.js "${k}" contains Japanese: ${v}`);
    }
    if (l !== 'easy' && /\{[^{}|]+\|[^{}]+\}/.test(v)) err(`${l}.js "${k}" uses furigana markup (only easy.js may)`);
    if (l === 'easy') {
      const open = (v.match(/\{/g) || []).length, close = (v.match(/\}/g) || []).length;
      if (open !== close) err(`easy.js "${k}" has unbalanced { }`);
      for (const m of v.matchAll(/\{([^{}|]+)\|([^{}]*)\}/g)) {
        if (!/^[ぁ-ゟー]+$/.test(m[2])) err(`easy.js "${k}": reading "${m[2]}" for ${m[1]} must be hiragana`);
      }
      // kanji outside ruby → reader may not be able to read it
      const bare = v.replace(/\{[^{}|]+\|[^{}]+\}/g, '').replace(/`[^`]*`/g, '').match(/[一-鿿]+/g);
      if (bare) err(`easy.js "${k}": kanji without furigana: ${bare.join(' ')}`);
    }
  }
}

/* ---------- 2. problems ---------- */
console.log('2. Problems (example + 5 practice) for 60 set codes');
const eng = new SqlEngine(await initSqlJs());
{ // CONCAT works as in MySQL (any number of arguments, NULL if one is NULL)
  const r = eng.runUser("SELECT CONCAT(name, ' - ', category), CONCAT('a', NULL) FROM products LIMIT 1;").values[0];
  if (r[0] !== 'Wireless Mouse - Electronics' || r[1] !== null) { console.log('✕ CONCAT:', r); errors++; }
}
const codes = [todayCode(), 'TEST', 'A7K2', 'CLASS-1'];
for (let i = 0; i < 56; i++) codes.push('C' + i);
const variety = {};
for (const L of LESSONS) {
  variety[L.key] = new Set();
  for (const code of codes) {
    const probs = eng.lessonProblems(L, code);
    if (probs.length !== 6) err(`${L.key} @${code}: ${probs.length} problems`);
    const stages = probs.map(p => p.stage).join();
    if (stages !== stagesOf(L).join()) err(`${L.key} @${code}: stages ${stages}`);
    if (!lessonState({ solved: Object.fromEntries(probs.map(p => [p.id, 1])) }, probs).done) err(`${L.key} @${code}: cannot be completed`);
    for (const p of probs) {
      variety[L.key].add(p.sql);
      const exp = eng.exec(p.sql);
      if (!exp || !exp.values.length) { err(`${L.key}: answer returns no rows: ${p.sql}`); continue; }
      if (!grade(eng.runUser(p.sql), exp, p.ordered, p.sql).ok) err(`${L.key}: answer does not grade as correct: ${p.sql}`);
      // a LEFT JOIN problem must not be solvable with INNER JOIN
      if (/\bLEFT JOIN\b/.test(p.sql)) { let ok = false; try { const s2 = p.sql.replace(/\bLEFT JOIN\b/g, 'INNER JOIN'); ok = grade(eng.runUser(s2), exp, p.ordered, s2).ok; } catch (e) { ok = false; } if (ok) err(`${L.key}: INNER JOIN also passes: ${p.sql}`); }
      p.steps.forEach(([k, s]) => { if (!(k in en)) err(`${L.key}: unknown step text ${k}`); try { eng.exec(s); } catch (e) { err(`${L.key}: step SQL fails: ${s}`); } });
      if (p.stage === 'fill') {
        const f = eng.fillTask(p);
        if (!f.answers.length || f.answers.some(a => !a)) err(`${L.key}: fill task without answers: ${p.sql}`);
        if (eng.fillSql(f, f.answers) !== p.sql) err(`${L.key}: fill task does not rebuild the answer: ${eng.fillSql(f, f.answers)} vs ${p.sql}`);
      }
      if (p.stage === 'order') {
        const o = eng.orderTask(p);
        if (!o) { err(`${L.key}: no ordering task for ${p.sql}`); continue; }
        const byId = Object.fromEntries(o.chunks.map(c => [c.id, c.text]));
        const s = o.answer.map(id => byId[id]).join(' ') + ';';
        if (!grade(eng.runUser(s), exp, p.ordered, s).ok) err(`${L.key}: ordering answer is wrong: ${s}`);
        const x = o.chunks.find(c => c.distractor);
        if (x) {
          const k = splitClauses(p.sql).length;
          // putting the trap piece in place of its twin must NOT be correct
          const kinds = o.answer.map(id => byId[id]);
          const twin = o.twin ? o.answer.indexOf(o.twin) : kinds.findIndex(t => t.split(' ')[0] === x.text.split(' ')[0] || (/^(INNER|LEFT)/.test(t) && /^(INNER|LEFT)/.test(x.text)) || (/^(WHERE|HAVING)/.test(t) && /^(WHERE|HAVING)/.test(x.text)));
          if (twin >= 0 && k) {
            const bad = kinds.slice(); bad[twin] = x.text;
            let ok = false; try { ok = grade(eng.runUser(bad.join(' ')), exp, p.ordered).ok; } catch (e) { ok = false; }
            if (ok) err(`${L.key}: trap piece also gives the right answer: ${x.text}`);
          }
        }
      }
      for (const l of LANGS) {
        const d = dicts[l];
        const L2 = LESSON_BY_KEY[p.lesson];
        const dk = L2.descKey ? L2.descKey(p.p) : `L.${p.lesson}.desc`;
        const desc = d[dk] || '';
        if (/\{(\w+)\}/.test(desc)) for (const m of desc.matchAll(/\{(\w+)\}/g)) {
          const k = m[1];
          if (/\|/.test(m[0])) continue;
          const view = Object.assign({}, p.p, L2.kind === 'join' ? { on: 1 } : {}, L2.view ? L2.view(p.p) : {}, L2.phrases ? L2.phrases(p.p) : {});
          if (!(k in view)) err(`${l}: ${dk} uses {${k}} which this lesson does not provide`);
        }
      }
    }
  }
}
for (const [k, s] of Object.entries(variety)) console.log(`   ${k.padEnd(12)} ${String(s.size).padStart(4)} different problems`);

/* ---------- 3. diagnostics ---------- */
console.log('3. Diagnostics');
const prob = Object.assign({}, eng.lessonProblems(LESSON_BY_KEY.limit, 'X')[0], { sql: "SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price DESC LIMIT 3;", ordered: true });
const exp = eng.exec(prob.sql);
const cases = [
  ["SELECT name, price FROM products WHERE category = Electronics", 'quote'],
  ['SELECT name price FROM products', 'missingComma'],
  ['SELECT nme FROM products', 'column'],
  ["SELECT name, price FROM products ORDER BY price DESC WHERE category = 'Electronics'", 'clauseOrder'],
  ['SELECT name、price FROM products', 'fullwidth'],
  ['SELECT name, price FROM product', 'table'],
  ["SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price ASC LIMIT 3", 'fix_dir'],
  ["SELECT name, price FROM products WHERE category='Electronics'", 'needOrder'],
  ['SELECT name, price, FROM products', 'trailingComma'],
  ['SELECT category FROM products WHERE COUNT(*) > 2 GROUP BY category', 'aggWhere'],
  ["SELECT name FROM products WHERE name = 'Pro", 'quoteOpen'],
  ["SELECT name, price FROM products WHERE category = \"Electronics\" ORDER BY price DESC LIMIT 3", null]
];
for (const [sql, want] of cases) {
  let g = null, e = null;
  try { g = grade(eng.runUser(sql), exp, prob.ordered, sql); } catch (x) { e = { code: x.code, message: x.message }; }
  const fix = g && !g.ok ? findFix(sql, s => eng.runUser(s), r => grade(r, exp, prob.ordered).ok) : null;
  const d = diagnose({ sql, error: e, grade: g, prob, fix });
  if (want && !d.items.some(i => i.key === want)) err(`"${sql}" → ${d.items.map(i => i.key).join(',') || '(nothing)'}, expected ${want}`);
  d.items.forEach(i => { if (!(('dx.' + i.key) in en)) err(`diagnosis key dx.${i.key} has no text`); });
}
try { eng.runUser('DROP TABLE products'); err('DROP was not blocked'); } catch (e) { if (e.code !== 'onlySelect') err('DROP gave the wrong error'); }
{ const r = eng.runUser('DELETE FROM products WHERE price < 2000;'); if (!r.dml || r.dml.changed < 1 || r.values.length >= 10) err('DELETE did not show the changed table'); }
if (eng.values('SELECT COUNT(*) FROM products')[0][0] !== 10) err('products table was modified');

/* ---------- 4. paper tests ---------- */
console.log('4. Paper tests');
const all = LESSONS.filter(l => l.kind !== 'quiz' && !l.noTest).map(l => l.key);
for (const code of ['T1', 'T2', 'T3']) for (const type of ['write', 'predict', 'mix']) {
  const a = eng.makeTest({ lessons: all, per: 2, type, code, version: 'A' });
  const b = eng.makeTest({ lessons: all, per: 2, type, code, version: 'B' });
  if (a.questions.length < all.length * 2 - 2) warn(`test ${code}/${type}: only ${a.questions.length} questions`);
  if (a.questions.length !== b.questions.length) warn(`test ${code}/${type}: A has ${a.questions.length}, B has ${b.questions.length}`);
  const same = a.questions.filter((q, i) => b.questions[i] && q.sql === b.questions[i].sql).length;
  if (same > a.questions.length / 3) warn(`test ${code}/${type}: versions A and B share ${same} identical questions`);
}

/* ---------- 5. data-analysis course texts ---------- */
console.log('5. Data-analysis texts (statistics basics, Excel / Python guides)');
{
  const { STAT, GUIDE } = await import('../js/analysis-content.js');
  const texts = [];
  for (const [k, c] of Object.entries(STAT)) for (const l of ['en', 'ja', 'easy']) { if (!c[l]) err(`STAT ${k} has no ${l}`); else c[l].forEach(([, x]) => (Array.isArray(x) ? x : [x]).forEach(s => texts.push([`STAT ${k}`, l, s]))); }
  for (const [k, vs] of Object.entries(GUIDE)) for (const [w, tools] of Object.entries(vs)) for (const [tool, steps] of Object.entries(tools)) steps.forEach((s, i) => {
    for (const l of ['en', 'ja', 'easy']) { if (!s[l]) err(`GUIDE ${k}/${w}/${tool} step ${i + 1} has no ${l}`); else texts.push([`GUIDE ${k}/${w}/${tool} ${i + 1}`, l, s[l]]); }
    // every {name} in a guide must be a parameter of that problem
    const L = LESSON_BY_KEY[k];
    for (const p of eng.lessonProblems(L, 'TEST1').filter(p => (p.p.w || '_') === w || w === '_')) {
      for (const m of [s.en, s.code || ''].join(' ').matchAll(/\{(\w+)\}/g)) if (!(m[1] in p.p)) err(`GUIDE ${k}/${w}/${tool} step ${i + 1} uses {${m[1]}}, not a parameter`);
    }
  });
  for (const [where, l, s] of texts) {
    if (l === 'easy') { const bare = s.replace(/\{[^{}|]+\|[^{}]+\}/g, '').match(/[一-鿿]+/g); if (bare) err(`${where} (easy): kanji without furigana: ${bare.join(' ')}`); }
    if (l === 'en' && /[぀-ヿ一-鿿]/.test(s.replace(/\{[^{}|]+\|[^{}]+\}/g, ''))) err(`${where} (en) contains Japanese`);
  }
}

console.log('6. Ordering drill (40 problems per lesson and level)');
{
  const ok = eng.drillLessons();
  for (const L of LESSONS.filter(l => ok.has(l.key))) {
    const ids = new Set();
    for (const level of [1, 2]) for (let i = 0; i < 40; i++) {
      const p = eng.drillProblem(L, `drill-check|${L.key}|${level}|${i}`, level);
      if (!p) { err(`drill ${L.key}: no problem for seed ${i}`); continue; }
      ids.add(p.id);
      const o = eng.orderTask(p);
      if (level === 2 && !o.fine) warn(`drill ${L.key}: level 2 fell back to clauses: ${p.sql}`);
      const byId = Object.fromEntries(o.chunks.map(c => [c.id, c.text]));
      const exp = eng.exec(p.sql), sql = o.answer.map(id => byId[id]).join(' ') + ';';
      if (!grade(eng.runUser(sql), exp, p.ordered, sql).ok) err(`drill ${L.key}: answer does not rebuild: ${sql}`);
      const x = o.chunks.find(c => c.distractor);
      if (x && o.twin) { const bad = o.answer.map(id => (id === o.twin ? x.text : byId[id])); let g = false; try { g = grade(eng.runUser(bad.join(' ')), exp, p.ordered).ok; } catch (e) { g = false; } if (g) err(`drill ${L.key}: trap also right: ${x.text}`); }
    }
    console.log(`   ${L.key.padEnd(13)} ${String(ids.size).padStart(3)} different drill problems in 80 tries`);
  }
}

console.log('7. Class problem formats');
{
  const { normFormat, stagesFor } = await import('../js/engine.js');
  const fmts = [{ demo: true, fill: 0, order1: 2, order2: 1, write: 1 }, { demo: false, fill: 0, order1: 2, order2: 2, write: 0 }, { demo: true, fill: 2, order1: 0, order2: 0, write: 3 }, { demo: false, fill: 1, order1: 5, order2: 5, write: 5 }];
  let sets = 0, short = 0;
  for (const f of fmts) for (const L of LESSONS) for (const code of ['F1', 'F2']) {
    const want = stagesFor(L, f), probs = eng.lessonProblems(L, code, f);
    sets++;
    if (probs.length < want.length) short++;
    if (!probs.length) err(`format ${JSON.stringify(f)} ${L.key}: no problems`);
    probs.forEach(p => {
      if (p.stage === 'order') {
        const o = eng.orderTask(p);
        if (!o) { err(`format ${L.key}: no ordering task`); return; }
        if (p.level === 2 && !o.fine) warn(`format ${L.key}: level 2 fell back to clauses`);
        const byId = Object.fromEntries(o.chunks.map(c => [c.id, c.text])), sql = o.answer.map(id => byId[id]).join(' ') + ';';
        if (!grade(eng.runUser(sql), eng.exec(p.sql), p.ordered, sql).ok) err(`format ${L.key}: order answer wrong: ${sql}`);
      }
    });
    // done only when every problem is solved
    const prog = { solved: Object.fromEntries(probs.slice(1).map(p => [p.id, 1])) };
    if (probs.length > 1 && lessonState(prog, probs).done) err(`format ${L.key}: done before every problem is solved`);
    prog.solved[probs[0].id] = 1;
    if (!lessonState(prog, probs).done) err(`format ${L.key}: not done after solving every problem`);
  }
  if (normFormat({ demo: true, fill: 1, order1: 1, order2: 1, write: 2 }) !== null) err('the standard format must be stored as null');
  console.log(`   ${sets} lesson sets; ${short} have fewer problems than asked (lessons with few patterns)`);
}

console.log('8. Lectures');
{
  const { LECTURES } = await import('../js/lectures.js');
  const { topicsOf } = await import('../js/lecture-topics.js');
  const { quizAnswer } = await import('../js/lecture-kit.js');
  const texts = [];
  let v2 = 0;
  for (const [key, L] of Object.entries(LECTURES)) {
    const lesson = LESSON_BY_KEY[key];
    if (!lesson) { err(`lecture ${key}: no such lesson`); continue; }
    const t3 = (where, x) => { for (const l of ['en', 'ja', 'easy']) { if (!x || !x[l]) err(`lecture ${key} ${where}: no ${l}`); else texts.push([`lecture ${key} ${where}`, l, x[l]]); } };
    const table = (where, fn) => { try { const st = fn(eng); if (!st.rows.length) err(`lecture ${key} ${where}: empty table`); return st; } catch (e) { err(`lecture ${key} ${where}: table fails: ${e.message}`); return null; } };
    t3('goal', L.goal);
    const covered = new Set();
    L.slides.forEach((sl, i) => {
      (sl.notes || []).forEach((n, j) => t3(`slide ${i + 1} note ${j + 1}`, n));
      (sl.items || []).forEach((n, j) => t3(`slide ${i + 1} point ${j + 1}`, n));
      if (sl.title) t3(`slide ${i + 1} title`, sl.title);
      if (sl.why) t3(`slide ${i + 1} why`, sl.why);
      (sl.covers || []).forEach(c => covered.add(c));
      [sl, ...(sl.frames || [])].forEach(x => (x.side || []).forEach((fn, j) => table(`slide ${i + 1} side table ${j + 1}`, fn)));
      if (sl.type === 'scene') { t3(`slide ${i + 1} who`, sl.who); t3(`slide ${i + 1} ask`, sl.ask); if (sl.table) table(`slide ${i + 1}`, sl.table); }
      if (sl.type === 'mistake') {
        let w = null, r = null;
        try { w = eng.exec(sl.wrong); } catch (e) { w = 'error'; }
        try { r = eng.exec(sl.right); } catch (e) { err(`lecture ${key}: the right SQL fails: ${sl.right}`); }
        if (w !== 'error' && r && JSON.stringify(w) === JSON.stringify(r)) err(`lecture ${key}: the wrong SQL gives the right result: ${sl.wrong}`);
      }
      if (sl.type === 'quiz') {
        t3(`slide ${i + 1} question`, sl.q);
        sl.choices.forEach((c, j) => { if (typeof c !== 'string') t3(`slide ${i + 1} choice ${j + 1}`, c); });
        if (sl.sql) { try { eng.exec(sl.sql); } catch (e) { err(`lecture ${key} quiz: the SQL fails: ${sl.sql}`); } if (sl.mark && !sl.sql.includes(sl.mark)) err(`lecture ${key} quiz: “${sl.mark}” is not in the SQL`); }
        let a = -1; try { a = quizAnswer(sl, eng); } catch (e) { err(`lecture ${key} quiz: the answer fails: ${e.message}`); }
        if (!(a >= 0 && a < sl.choices.length)) err(`lecture ${key} quiz: the answer is not one of the choices`);
        if (new Set(sl.choices.map(c => (typeof c === 'string' ? c : c.en))).size !== sl.choices.length) err(`lecture ${key} quiz: the same choice twice`);
        if (sl.table) table(`quiz`, sl.table);
        if (sl.before) table(`quiz (before)`, sl.before);
      }
      (sl.frames || []).forEach((f, j) => {
        t3(`slide ${i + 1} frame ${j + 1}`, f.cap);
        if (sl.cases) { if (!f.label) err(`lecture ${key} slide ${i + 1} case ${j + 1}: no label`); else t3(`slide ${i + 1} case ${j + 1} label`, f.label); }
        (f.covers || []).forEach(c => covered.add(c));
        if (f.sql) {
          try { eng.exec(f.sql); } catch (e) { err(`lecture ${key} frame ${j + 1}: the SQL fails: ${f.sql}`); }
          if (f.mark && !f.sql.includes(f.mark)) err(`lecture ${key} frame ${j + 1}: “${f.mark}” is not in the SQL`);
        } else if (lesson.syntax) err(`lecture ${key} slide ${i + 1} frame ${j + 1}: no SQL`);
        const st = table(`slide ${i + 1} frame ${j + 1}`, f.table);
        // a case shows what its SQL returns: the kept rows (✓), or the whole table when no row is marked
        if (st && sl.cases && f.sql && !f.sql.includes(';\n')) {
          const res = eng.exec(f.sql) || { values: [] }, marked = st.rows.some(r => ['pass', 'fail', 'take', 'skip', 'cut'].includes(r.cls));
          const shown = marked ? st.rows.filter(r => r.cls === 'pass' || r.cls === 'take').length : st.rows.length;
          if (st.rows.some(r => r.cls === 'take') && JSON.stringify(st.rows.filter(r => r.cls === 'take').map(r => r.cells.join())) !== JSON.stringify(res.values.map(v => v.filter((x, i) => res.columns[i] !== 'id').join()))) err(`lecture ${key} slide ${i + 1} case ${j + 1}: the rows taken are not the ones the SQL returns`);
          if (shown !== res.values.length) err(`lecture ${key} slide ${i + 1} case ${j + 1}: the table shows ${shown} rows, the SQL returns ${res.values.length}`);
        }
      });
    });
    /* the new form: every part is there, and every topic the lesson's problems can have is covered */
    if (L.slides.some(sl => sl.type === 'scene')) {
      v2++;
      const types = L.slides.map(sl => (sl.cases ? 'cases' : sl.type));
      for (const need of ['scene', 'anim', 'cases', 'quiz', 'points', 'practice', ...(lesson.syntax ? ['syntax', 'mistake'] : [])]) if (!types.includes(need)) err(`lecture ${key}: no “${need}” slide`);
      if (types[0] !== 'scene' || types[types.length - 1] !== 'practice') err(`lecture ${key}: starts with the scene and ends with the practice slide`);
      const used = new Set();
      const add = p => { if (p) topicsOf(key, p).forEach(t => used.add(t)); };
      if (lesson.demo) add(lesson.demo.p);
      for (let n = 0; n < 60; n++) eng.lessonProblems(lesson, 'LT' + n).forEach(pr => add(pr.p));
      for (const t of used) if (!covered.has(t)) err(`lecture ${key}: the problems use “${t}”, but no slide covers it (add a case with covers: ['${t}'])`);
      for (const t of covered) if (!used.has(t)) warn(`lecture ${key}: a slide covers “${t}”, which no problem uses`);
    }
  }
  for (const [where, l, s] of texts) {
    if (l === 'easy') { const bare = s.replace(/\{[^{}|]+\|[^{}]+\}/g, '').match(/[一-鿿]+/g); if (bare) err(`${where} (easy): kanji without furigana: ${bare.join(' ')}`); }
    if (l === 'en' && /[぀-ヿ一-鿿]/.test(s)) err(`${where} (en) contains Japanese`);
  }
  const without = LESSONS.filter(l => !LECTURES[l.key]).map(l => l.no);
  console.log(`   ${Object.keys(LECTURES).length} lectures (${v2} in the new form); lessons without one yet: ${without.join(', ') || 'none'}`);
}

console.log('9. Table library');
{
  const { ALL_TABLES, listedTables } = await import('../js/datasets.js');
  const listed = new Set(listedTables()), used = new Set();
  for (const L of LESSONS) for (const code of ['TEST1', 'X', 'ABC']) eng.lessonProblems(L, code).forEach(p => (p.tables || []).forEach(n => used.add(n)));
  for (const n of used) if (!listed.has(n)) err(`table ${n} is used by a problem but not in the table library`);
  for (const n of listed) {
    const d = eng.tableData(n), a = ALL_TABLES[n];
    if (JSON.stringify(d.values) !== JSON.stringify(a.rows) || JSON.stringify(d.columns) !== JSON.stringify(a.columns.map(c => c[0]))) err(`table ${n}: library data differs from the database`);
  }
  console.log(`   ${listed.size} tables listed; ${used.size} used by problems`);
}
console.log('10. Other answers (別解)');
{
  const { altAnswers, ALT_RULES } = await import('../js/alt.js');
  const used = new Set(); let n = 0, withAlt = 0;
  for (const L of LESSONS) {
    if (L.kind === 'quiz') continue;
    for (const code of ['TEST1', 'X', 'ABC']) for (const p of eng.lessonProblems(L, code)) {
      const alts = altAnswers(eng, p); n++; if (alts.length) withAlt++;
      for (const a of alts) {
        used.add(a.rule);
        if (!Object.values(dicts).every(d => d['alt.' + a.rule])) err(`alt rule ${a.rule}: no note text`);
        if (a.sql.replace(/\s+/g, ' ') === p.sql.replace(/\s+/g, ' ')) err(`alt ${a.rule} for ${p.id} is the model answer`);
      }
    }
  }
  const unused = ALT_RULES.filter(r => !used.has(r));
  if (unused.length) warn(`alt rules never used: ${unused.join(', ')}`);
  console.log(`   ${withAlt} of ${n} problems have other answers; ${used.size}/${ALT_RULES.length} rules used`);
}
console.log('11. Check tests (確認テスト)');
{
  const { encodeCheck, decodeCheck, buildCheck, checkCounts, checkLessons, CHECK_PRESETS, CHECK_MAXES } = await import('../js/check.js');
  let tests = 0;
  const all = checkLessons().map(l => l.key);
  for (const [pk, f] of Object.entries(CHECK_PRESETS)) for (const max of CHECK_MAXES) for (const ls of [all, ['where'], ['types', 'an_hist'], ['inner', 'left', 'antijoin']]) {
    const cfg = { lessons: ls, f, max, seed: 'AB12' };
    const code = encodeCheck(cfg), back = decodeCheck(code);
    if (!back || encodeCheck(back) !== code) err(`check test code does not round-trip: ${code}`);
    const items = buildCheck(eng, back, 'AB12'), cnt = checkCounts(back);
    if (items.length > cnt.n) err(`check test ${code}: ${items.length} problems, more than ${cnt.n}`);
    if (items.length < Math.min(cnt.n, ls.length)) warn(`check test ${code}: only ${items.length} of ${cnt.n} problems`);
    if (new Set(items.map(p => p.id)).size !== items.length) err(`check test ${code}: two problems share an id`);
    if (items.some(p => p.stage === 'demo' || !p.test || !p.id.startsWith('check:'))) err(`check test ${code}: a problem is not a test copy`);
    if (JSON.stringify(buildCheck(eng, back, 'AB12').map(p => p.id)) !== JSON.stringify(items.map(p => p.id))) err(`check test ${code}: not the same problems for the same seed`);
    tests++;
  }
  if (decodeCheck('nope~0000~5~') || decodeCheck('')) err('a bad check test code was accepted');
  console.log(`   ${tests} test settings built`);
}

// ---------- quick test: same problems for everyone, swaps, pass line, time limit ----------
{
  const { newQuick, quickProblems, quickProgress, quickPhase, simpleSlots, detailSlots, applySwaps, nextFree, slotProblems, kindsOf, KINDS, QUICK_PRESETS, QUICK_COUNTS } = await import('../js/quick.js');
  const { checkLessons } = await import('../js/check.js');
  let n = 0;
  const check = (slots, seed, label) => {
    const probs = slotProblems(eng, seed, slots);
    if (probs.length !== slots.length) err(`quick test ${label}: a slot has no problem`);
    if (new Set(probs.map(p => p.sql)).size !== probs.length) err(`quick test ${label}: the same problem twice`);
    slots.forEach((x, j) => { const p = probs[j]; if (p && p.lesson !== x.k) err(`quick test ${label}: slot ${j} is from another lesson`); if (p && x.st === 'fill' && p.stage !== 'fill') err(`quick test ${label}: a fill-in slot gave ${p.stage}`); });
    let sw = slots;
    if (slots.length) { const i = nextFree(eng, slots, 0, seed); if (i !== null) { sw = applySwaps(eng, slots, { 0: i }, seed); if (sw[0].i !== i || slotProblems(eng, seed, sw)[0].sql === probs[0].sql) err(`quick test ${label}: swapping did not give a new problem`); } }
    const q = newQuick({ seed, slots: sw, pass: 1, limit: 5 }, Date.parse('2026-01-01T00:00:00Z'));
    const a = quickProblems(eng, q), b2 = quickProblems(eng, JSON.parse(JSON.stringify(q)));
    if (a.length !== q.n || JSON.stringify(a.map(p => p.sql)) !== JSON.stringify(slotProblems(eng, seed, sw).map(p => p.sql))) err(`quick test ${label}: not the problems the teacher saw`);
    if (JSON.stringify(a.map(p => p.sql)) !== JSON.stringify(b2.map(p => p.sql))) err(`quick test ${label}: not the same problems for everyone`);
    if (a.some((p, i) => p.id !== `quick:${q.id}:${i}` || !p.test || p.stage === 'demo')) err(`quick test ${label}: bad problem ids`);
    for (const p of a) if (p.stage !== 'quiz' && !grade(eng.runUser(p.sql), eng.runUser(p.sql), p.ordered, p.sql).ok) err(`quick test ${label}: answer does not grade: ${p.sql}`);
    if (quickPhase(q, Date.parse('2026-01-01T00:00:02Z')) !== 'wait' || quickPhase(q, Date.parse('2026-01-01T00:01:00Z')) !== 'run' || quickPhase(q, Date.parse('2026-01-01T00:06:00Z')) !== 'up') err(`quick test ${label}: countdown / time limit phases are wrong`);
    n++;
  };
  const all = checkLessons().map(l => l.key);
  for (const kind of QUICK_PRESETS) for (const max of QUICK_COUNTS) {
    const ls = all.slice(n % 30, n % 30 + 2), seed = 'S' + n;
    const slots = simpleSlots(eng, ls, max, kind, seed);
    if (slots.length !== max) err(`quick test (easy ${kind} ×${max}, ${ls}): ${slots.length} problems`);
    check(slots, seed, `easy ${kind} ×${max}`);
  }
  for (const k of all) {   // detailed: every kind a lesson has, 2 each
    const per = { [k]: Object.fromEntries(KINDS.map(st => [st, 2])) }, seed = 'D' + k;
    const slots = detailSlots(eng, per, [k], seed);
    if (slots.length < 2 * kindsOf(k).length - 1) warn(`quick test (detailed ${k}): only ${slots.length} problems for ${kindsOf(k).join(', ')}`);
    check(slots, seed, `detailed ${k}`);
  }
  // pass line 1 of 2, time limit: answers after the end (+5 s) do not count
  const q = { id: 'QQ', n: 2, pass: 1, at: '2026-01-01T00:00:00Z', end: '2026-01-01T00:05:00Z' };
  const log = [{ user_id: 'u', problem_id: 'quick:QQ:0', ok: false, created_at: '2026-01-01T00:01:00Z' }, { user_id: 'u', problem_id: 'quick:QQ:0', ok: true, created_at: '2026-01-01T00:02:00Z' }, { user_id: 'u', problem_id: 'quick:QQ:1', ok: true, created_at: '2026-01-01T00:03:00Z' },
    { user_id: 'v', problem_id: 'quick:QQ:1', ok: true, created_at: '2026-01-01T00:06:00Z' }, { user_id: 'w', problem_id: 'quick:OLD:0', ok: true, created_at: '2026-01-01T00:03:00Z' }];
  const pr = quickProgress(log, q);
  if (pr.get('u').done !== '2026-01-01T00:02:00Z' || pr.get('u').all !== '2026-01-01T00:03:00Z' || pr.has('v') || pr.has('w')) err('quick test: who has passed is wrong');
  // review by pattern: the ladder, the gaps, what is picked, and a problem for every pattern in every format
  {
    const M = await import('../js/mastery.js'), { topicsOf } = await import('../js/lecture-topics.js');
    const D = M.DAY, t0 = 1000 * D, W = LESSON_BY_KEY.where, top = M.ladderOf(W).length - 1;
    if (M.ladderOf(W).join() !== 'fill,order2,write' || M.ladderOf(LESSON_BY_KEY.intro).join() !== 'quiz') err('review: the ladder of formats is wrong');
    let st = M.patResult(null, W, true, t0);                       // a new pattern starts one step below writing
    if (st.f !== top || st.due !== t0 + D || M.patLevel(st, W) !== 1) err('review: a right answer does not move up to writing');
    st = M.patResult(st, W, true, t0 + D); if (st.due !== t0 + 2 * D || M.patLevel(st, W) !== 2) err('review: the first gap is not 1 day');
    st = M.patResult(st, W, true, t0 + 2 * D); if (st.due !== t0 + 5 * D) err('review: the second gap is not 3 days');
    st = M.patResult(st, W, true, t0 + 5 * D); if (st.due !== t0 + 12 * D || M.patLevel(st, W) !== 3) err('review: the third gap is not 7 days, or the pattern is not mastered');
    const bad = M.patResult(st, W, false, t0 + 12 * D);
    if (bad.f !== top - 1 || bad.s !== 0 || bad.due !== t0 + 13 * D || bad.ng !== 1 || st.f !== top) err('review: a wrong answer does not go one step down (or changes the old state)');
    if (M.patResult({ f: 0, s: 0, n: 1 }, W, false, t0).f !== 0) err('review: the ladder goes below its first step');
    // what is waiting: lessons finished before today; due first, a few new ones mixed in
    const prog = { lessons: { where: { done: t0 - D }, select: { done: t0 - D }, orderby: { done: t0 } }, pat: {} };
    const w0 = M.patWaiting(prog, t0, eng);
    if (w0.due.length || !w0.fresh.length || w0.fresh.some(x => x.lesson === 'orderby')) err('review: a lesson finished today is reviewed today, or nothing is new');
    w0.fresh.filter(x => x.lesson === 'where').forEach((x, i) => { prog.pat[x.key] = { f: top, s: 1, n: 2, ng: 0, due: t0 - i * D, last: t0 - 5 * D }; });
    const pick = M.patPick(prog, t0, eng);
    if (pick.length !== M.REVIEW_N || pick.filter(x => !x.st).length !== 1 || new Set(pick.map(x => x.key)).size !== pick.length) err(`review: a round is not ${M.REVIEW_N} patterns with the new ones mixed in`);
    // every pattern of every lesson can be asked in every format of its ladder
    let miss = 0, total = 0;
    for (const l of LESSONS) for (const topic of M.patternsOf(l.key, eng).list) for (let f = 0; f < M.ladderOf(l).length; f++) for (const seed of ['a', 'b']) {
      const pr = M.patProblem(eng, l.key, topic, { f }, seed), tok = M.ladderOf(l)[f]; total++;
      if (pr.stage !== (tok.startsWith('order') ? 'order' : tok) || (pr.p && !l.fixed && !topicsOf(l.key, pr.p).includes(topic)) || !eng.exec(pr.sql)) { miss++; if (miss < 4) err(`review: Lesson ${l.no}, pattern "${topic}", ${tok}: no problem of that pattern and format`); }
    }
    if (!miss) console.log(`   review by pattern: ${LESSONS.reduce((a, l) => a + M.patternsOf(l.key, eng).list.length, 0)} patterns, ${total} problems made`);
    // one table, many queries: every problem uses the chosen table, in lesson order, in the chosen format
    for (const set of M.tableSets(eng)) for (const tok of ['fill', 'order2', 'write']) {
      const c = M.tableCourse(eng, set.key, set.lessons, tok, set.join ? 1 : 2, 'ck');
      const order = c.map(p => LESSONS.findIndex(l => l.key === p.lesson));
      if (c.some(p => p.tables.some(t => !set.tables.includes(t)))) err(`one table: a problem for ${set.key} uses another table`);
      if (new Set(c.map(p => p.lesson)).size !== set.lessons.length || order.some((x, i) => i && x < order[i - 1]) || new Set(c.map(p => p.sql)).size !== c.length) err(`one table: ${set.key} (${tok}) misses a lesson, is out of order, or repeats a query`);
      if (!set.join && c.length !== set.lessons.length * 2) err(`one table: ${set.key} (${tok}) does not give 2 problems per lesson`);
      if (tok === 'write' && c.some(p => p.stage !== 'write')) err(`one table: ${set.key} is not all writing`);
    }
    if (LESSONS.some(l => M.patternsOf(l.key, eng).list.length > 1 && M.patternsOf(l.key, eng).list.some(tp => !M.patLabel(l.key, tp)))) err('review: a pattern has no name (a case label in the lecture)');
  }
  // a quick test on one table: every problem uses it, lessons that cannot use it are left out, and the students get the same problems
  {
    const { tableLessons, kindPool } = await import('../js/quick.js');
    for (const tb of ['movies', 'shop']) {
      const ls = ['where', 'orderby', 'groupby', 'inner', 'left'], can = tableLessons(eng, tb);
      const slots = simpleSlots(eng, ls, 5, 'mix', 'TB', tb), probs = slotProblems(eng, 'TB', slots, tb);
      const names = tb === 'shop' ? ['customers', 'orders'] : [tb];   // (a pair of tables gives one query for each of these JOIN lessons: 2 problems)
      if (probs.length !== (tb === 'shop' ? 2 : 5) || probs.some(p => p.tables.some(t => !names.includes(t))) || slots.some(x => !can.includes(x.k)) || new Set(probs.map(p => p.sql)).size !== probs.length) err(`quick test on one table (${tb}): another table, a lesson that cannot use it, or a repeated query`);
      const qt = newQuick({ seed: 'TB', tb, slots, pass: 3, limitSec: 90 }, Date.parse('2026-01-01T00:00:00Z'));
      const qp = quickProblems(eng, JSON.parse(JSON.stringify(qt)));
      if (qt.tb !== tb || qp.map(p => p.sql).join('|') !== probs.map(p => p.sql).join('|') || qp.some(p => !p.test || p.kind !== 'practice')) err(`quick test on one table (${tb}): the students do not get the teacher's problems`);
      if (detailSlots(eng, { where: { fill: 1, order1: 1, order2: 1, write: 2 }, inner: { write: 1 } }, ['where', 'inner'], 'TB', tb).length !== (tb === 'shop' ? 1 : 5)) err(`quick test on one table (${tb}): the detailed set-up is wrong`);
    }
    if (newQuick({ seed: 'TB', slots: simpleSlots(eng, ['where'], 1, 'write', 'TB'), pass: 1 }, 0).tb !== undefined) err('quick test: a test on various tables carries a table');
  }
  // SQL level: the test, the level it gives, practice at the level, and the row the teacher's page reads
  {
    const V = await import('../js/level.js');
    const items = V.buildTest(eng, 'LV');
    if (items.length !== V.LV_MAX * V.LV_PER || items.some(p => p.stage !== 'write' || !p.test || !eng.exec(p.sql)) || new Set(items.map(p => p.id)).size !== items.length) err('level test: not 3 writing problems per chapter');
    if (items.some(p => LESSON_BY_KEY[p.lesson].ch !== V.LV_CHAPTERS[p.ch])) err('level test: a problem is in the wrong chapter');
    const mark = (pat) => { const d = {}; items.forEach(p => { const n = +pat[p.ch]; const j = +p.id.split(':')[3]; if (pat[p.ch] !== '-') d[p.id] = j < n; }); return d; };
    const run = pat => { const all = mark(pat), d = {}; for (let i = 0; i < items.length; i++) { d[items[i].id] = !!all[items[i].id]; if (V.testEnds(items, d, i)) break; } return d; };
    let st = V.afterTest(items, run('332100'), 5);
    if (st.lv !== 3 || st.prof.join() !== '3,3,2,1,0,' || V.levelTag(st) !== 'lv:3:33210-') err(`level test: wrong level or it did not stop after two failed chapters (${st.lv}, ${st.prof.join()})`);
    if (V.afterTest(items, run('313033'), 5).lv !== 1 || V.afterTest(items, run('333333'), 5).lv !== 6 || V.afterTest(items, run('000000'), 5).prof.join() !== '0,0,,,,') err('level test: the level is not the chapters passed in a row');
    // practice: 3 from the chapter being learned in its format + 2 from passed chapters; the format and the level move
    st = V.afterTest(items, run('332033'), 5);   // Lv 3; chapters 5 and 6 are known already
    const round = V.buildRound(eng, st, 'R1'), tg = round.filter(p => p.target);
    if (round.length !== V.LV_ROUND || tg.length !== 3 || tg.some(p => LESSON_BY_KEY[p.lesson].ch !== 'change' || p.stage !== 'fill') || round.filter(p => !p.target).some(p => p.stage !== 'write' || !['basics', 'filter', 'sort'].includes(LESSON_BY_KEY[p.lesson].ch))) err('level practice: a round is not 3 fill-in problems of the chapter + 2 written ones from passed chapters');
    const all = r => Object.fromEntries(r.map(p => [p.id, true]));
    let res = V.afterRound(st, round, all(round), 9);
    if (res.st.fmt !== 1 || res.up || res.move !== 'up' || st.fmt !== 0) err('level practice: all right does not move to the next format');
    res = V.afterRound(res.st, round, {}, 9); if (res.st.fmt !== 0 || res.move !== 'down') err('level practice: none right does not move a format back');
    let s2 = Object.assign({}, st, { fmt: 2 });
    res = V.afterRound(s2, round, all(round), 9); if (res.up || res.st.streak !== 1) err('level practice: one perfect writing round passes the chapter');
    res = V.afterRound(res.st, round, all(round), 9);
    if (!res.up || res.st.lv !== 6 || res.st.fmt !== 0) err(`level practice: two perfect writing rounds do not pass the chapter (and the chapters the test showed as known): Lv ${res.st.lv}`);
    if (V.buildRound(eng, res.st, 'R2').length !== V.LV_ROUND || V.buildRound(eng, { lv: 0, prof: [], fmt: 0 }, 'R3').filter(p => p.target).length !== V.LV_ROUND) err('level practice: a round at the first or the last level is wrong');
    const lg = V.levelsFromLog([{ user_id: 'u', problem_id: 'lv:2:32----', created_at: '2026-01-01T00:00:00Z' }, { user_id: 'u', problem_id: 'lv:3:322---', created_at: '2026-01-02T00:00:00Z' }, { user_id: 'v', problem_id: 'where:write:x', created_at: '2026-01-02T00:00:00Z' }]);
    if (lg.size !== 1 || lg.get('u').lv !== 3 || lg.get('u').prof.join() !== '3,2,2,,,') err('level: the teacher does not read the latest level from the class log');
  }
  // a level test sent to the class: chosen chapters, first answer only, the level from it
  {
    const Q = await import('../js/quick.js'), V = await import('../js/level.js');
    const sl = Q.levelSlots(eng, [1, 4], 'LT');
    const qt = Q.newQuick({ seed: 'LT', slots: sl, lv: [1, 4], limitSec: 600 }, Date.parse('2026-01-01T00:00:00Z'));
    const items = Q.quickProblems(eng, JSON.parse(JSON.stringify(qt)));
    if (items.length !== 6 || !qt.once || qt.pass !== 6 || items.some(p => p.stage !== 'write' || !['filter', 'agg'].includes(LESSON_BY_KEY[p.lesson].ch))) err('level test (class): not 3 writing problems for each chosen chapter');
    const t = s => new Date(Date.parse(qt.at) + s * 1000).toISOString(), row = (i, ok, s) => ({ user_id: 'u', problem_id: `quick:${qt.id}:${i}`, ok, created_at: t(s) });
    const rows = [row(0, false, 1), row(0, true, 2), row(1, true, 3), row(2, true, 4)];
    const stq = Q.quickStats(rows, qt, [{ user_id: 'u', nickname: 'A' }]);
    if (stq.rows[0].score !== 2 || stq.rows[0].ok[0]) err('level test (class): an answer after the first one counts');
    const prof = Q.levelProfile(items, { 1: 1, 2: 1, 3: 1, 4: 1 }, [1, 4], [3, 0, 2, null, null, null]);
    if (prof.join() !== '3,2,2,,2,' || V.levelOf(prof) !== 3) err(`level test (class): the profile is wrong (${prof.join()})`);
  }
  // the root drill (basic shapes): every step makes problems of its shape in every format; the ladder; the way back from a mistake
  {
    const B = await import('../js/basics.js');
    const W = { col: ['列', 'column'], table: ['テーブル', 'table'], val: ['値', 'value'], cond: ['条件', 'condition'], expr: ['式', 'expression'], alias: ['別名', 'alias'] };
    const inWords = shape => shape.replace(/\{(col|group|num|key)\}/g, '列').replace(/\{table\}/g, 'テーブル').replace(/\{cond\}/g, '条件').replace(/\{expr\}/g, 'expression').replace(/\{alias\}/g, '別名').replace(/\{[a-z]+\}/g, 'value');
    const real = shape => shape.replace(/\{table\}/g, 'products').replace(/\{[a-z]+\}/g, 'price');
    const variants = {};
    for (const st of B.BASIC_STEPS) for (let f = 0; f < st.formats.length; f++) for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const p = B.basicProblem(eng, st.key, f, seed), tok = st.formats[f];
      if (!p || p.stage !== 'abs' || p.af !== tok || !p.goal) { err(`basic shapes: ${st.key} cannot be asked as ${tok}`); continue; }
      (variants[st.key] = variants[st.key] || new Set()).add(p.shape);
      const words = inWords(p.shape);
      if (!B.absCheck(p.shape, words, W).ok || !B.absCheck(p.shape, words.toLowerCase().replace(/;$/, ''), W).ok) err(`basic shapes: ${st.key} in words is not accepted: ${words}`);
      if (B.absCheck(p.shape, real(p.shape), W).ok) err(`basic shapes: ${st.key} in words accepts real names`);
      if (tok === 'afill') { const g = p.gap; if (!g || new Set(g.choices).size !== g.choices.length || g.choices.length < 2 || B.absPieces(p.shape)[g.at].join(' ') !== g.choices[0]) err(`basic shapes: ${st.key} has a wrong gap`); }
      if (tok === 'aorder') {   // the parts in the right order make the shape; the pool has two more
        const parts = B.absPieces(p.shape).map(x => x.join(' ')), pool = p.pool.map(x => x.toks.join(' '));
        if (pool.length !== parts.length + 2 || parts.some(x => !pool.includes(x))) err(`basic shapes: ${st.key} ordering pool is wrong`);
        const text = B.absPieces(p.shape).map(x => x.map(y => (y[0] === '§' ? W[y.slice(1)][0] : y)).join(' ')).join(' ');
        if (!B.absCheck(p.shape, text, W).ok) err(`basic shapes: ${st.key} ordering in the right order is not accepted: ${text}`);
      }
      if (tok === 'awrite') { const ch = B.absChips(p.shape, seed); if (!ch.kw.length || !ch.slots.includes('col')) err(`basic shapes: ${st.key} has no chips`); }
      if (!B.absClauses(p.shape).length || !B.absClauses(p.shape)[0].key) err(`basic shapes: ${st.key} has no clauses to explain`);
    }
    ['cols', 'wnum', 'wtext', 'order', 'limit', 'insert', 'update'].forEach(k => { if ((variants[k] || new Set()).size < 2) err(`basic shapes: ${k} has only one variant`); });
    if (!B.absCheck('SELECT {col} FROM {table} ORDER BY {col} ASC;', 'SELECT 列 FROM テーブル ORDER BY 列', W).ok) err('basic shapes: ASC should be optional');
    let x = null; for (const ok of [true, true, true, false, true, true, true, true, true, true, true]) x = B.basicResult(x, ok);   // fill ×2 → order: 1 right, 1 wrong → fill ×2 → order ×2 → write ×3
    if (B.basicNorm({ f: 3, n: 4, v: 2 }).f !== 2 || B.basicNorm({ f: 1, n: 4, v: 2, clear: true }).f !== 2 || B.basicNorm({ f: 2, n: 4 }).f !== 2 || B.basicNorm(null).f !== 0) err('basic shapes: a stored state is not carried over');
    if (x.f !== 2 || !x.clear || x.n !== 11 || x.ok !== 10) err(`basic shapes: the ladder is wrong (${JSON.stringify(x)})`);
    if (B.basicResult({ f: 2, run: 2 }, false).f !== 1 || B.basicResult({ f: 0, run: 0 }, false).f !== 0) err('basic shapes: a wrong answer does not go one format back');
    if (B.BASIC_DETAIL.length < 15 || ['like', 'between', 'null', 'groupby', 'having', 'inner', 'left'].some(k => !B.BASIC_BY_KEY[k])) err('basic shapes: an item of the course has no shape');
    if (B.nextStep({ cols: { clear: true }, wnum: { clear: true } }) !== 'wtext') err('basic shapes: the next step is wrong');
    const op = { lesson: 'orderby', sql: 'SELECT a, b FROM t ORDER BY b DESC;' };
    const back = (sql, keys, prob = op) => B.stepForMistake(prob, sql, keys.map(key => ({ key })));
    if (back('a, b FROM t', []) !== 'cols' || back('SELECT a b FROM t', ['missingComma']) !== 'cols' || back("SELECT a FROM t ORDER BY b DESC", ['clauseOrder']) !== 'order'
      || back("SELECT a FROM t WHERE c = x", ['quote']) !== 'wtext' || back('SELECT a, b FROM t ORDER BY b ASC;', ['order']) !== null
      || back("SELECT a FROM t WHERE a LIKE 'x'", ['likePercent']) !== 'like' || back('SELECT a FROM t WHERE a = NULL', ['isNull']) !== 'null'
      || back('a FROM t', [], Object.assign({ test: true }, op)) !== null
      || back('INSERT t VALUES (1);', [], { lesson: 'insert', sql: 'INSERT INTO t VALUES (1);' }) !== 'insert' || back('INSERT INTO t (a) VALUES (1);', ['values'], { lesson: 'insert', sql: 'INSERT INTO t (a) VALUES (2);' }) !== null
      || back('UPDATE t price = 1 WHERE id = 1;', [], { lesson: 'update', sql: 'UPDATE t SET price = 1 WHERE id = 1;' }) !== 'update' || back('UPDATE t SET price = 1;', [], { lesson: 'update', sql: 'UPDATE t SET price = 1 WHERE id = 1;' }) !== 'update'
      || back('DELETE * FROM t WHERE id = 1;', [], { lesson: 'delete', sql: 'DELETE FROM t WHERE id = 1;' }) !== 'delete' || back('DELETE FROM t WHERE id = 2;', ['delValues'], { lesson: 'delete', sql: 'DELETE FROM t WHERE id = 1;' }) !== null) err('basic shapes: the way back from a mistake is wrong');
  }
  // results: per student and per problem, the common wrong answers, CSV, the list of tests, "the same shape again"
  {
    const { quickStats, quickCSV, logPut, logDrop, slotsShape, QUICK_LOG_MAX } = await import('../js/quick.js');
    const t = m => `2026-01-01T00:0${m}:00Z`;
    const rows = [
      { user_id: 'u', problem_id: 'quick:QQ:0', ok: false, sql: 'SELECT  1;', reason: 'rows', created_at: t(1) }, { user_id: 'u', problem_id: 'quick:QQ:0', ok: true, sql: 'SELECT 2;', created_at: t(2) },
      { user_id: 'u', problem_id: 'quick:QQ:0', ok: false, sql: 'SELECT 9;', created_at: t(3) },   // after the right answer: looking back, not counted
      { user_id: 'v', problem_id: 'quick:QQ:0', ok: false, sql: 'SELECT 1;', reason: 'rows', created_at: t(1) }, { user_id: 'v', problem_id: 'quick:QQ:1', ok: true, sql: 'x', created_at: t(6) },   // too late
      { user_id: 'gone', problem_id: 'quick:QQ:0', ok: true, sql: 'x', created_at: t(1) }];
    const members = [{ user_id: 'u', nickname: 'Aoi' }, { user_id: 'v', nickname: '=Ren, "B"' }, { user_id: 'w', nickname: 'Yui' }];
    const st = quickStats(rows, q, members);
    const [ru, rv, rw] = st.rows;
    if (!(ru.passed && ru.score === 1 && ru.tries[0] === 2 && ru.ms === 120000) || rv.passed || rv.score !== 0 || rv.tries[0] !== 1 || !rv.started || rw.started) err('quick results: a row of a student is wrong');
    if (st.started !== 2 || st.passed !== 1 || st.avg !== 0.5) err('quick results: the totals are wrong');
    if (st.perQ[0].solved !== 1 || st.perQ[0].rate !== 0.5 || st.perQ[0].tries !== 3 || st.perQ[1].solved !== 0) err('quick results: the numbers of a problem are wrong');
    if (st.perQ[0].wrong.length !== 1 || st.perQ[0].wrong[0].n !== 2 || st.perQ[0].wrong[0].sql !== 'SELECT 1;') err('quick results: the common wrong answers are wrong');
    if (quickStats(rows, Object.assign({}, q, { stopped: t(1) }), members).rows[0].score !== 0) err('quick results: answers after the teacher ended the test are counted');
    const csv = quickCSV(st, q, ['Name', 'Right', 'Passed', 'Sec', 'Answers']).replace(/^﻿/, '').trim().split('\r\n');
    const wantRen = '"' + "'=Ren, " + '""B"""' + ',0,0,,0,,1';
    if (csv.length !== 4 || csv[0] !== 'Name,Right,Passed,Sec,Q1,Q2,Answers' || csv[1] !== 'Aoi,1,1,120,1,,2' || csv[2] !== wantRen || csv[3] !== 'Yui,,,,,,') err(`quick results: the CSV is wrong: ${JSON.stringify(csv)}`);
    let lg = []; for (let i = 0; i < QUICK_LOG_MAX + 5; i++) lg = logPut(lg, { id: 'T' + i });
    lg = logPut(lg, { id: 'T' + (QUICK_LOG_MAX + 4), stopped: 'x' });
    if (lg.length !== QUICK_LOG_MAX || lg[0].stopped !== 'x' || lg[1].id !== 'T' + (QUICK_LOG_MAX + 3) || logDrop(lg, lg[0].id).length !== QUICK_LOG_MAX - 1) err('quick results: the list of tests is wrong');
    const per = { where: { fill: 1, order1: 0, order2: 0, write: 2 }, orderby: { fill: 0, order1: 1, order2: 0, write: 1 } };
    const sl = detailSlots(eng, per, ['where', 'orderby'], 'SH'), sh = slotsShape(sl);
    if (JSON.stringify(sh.lessons) !== '["where","orderby"]' || JSON.stringify(sh.per) !== JSON.stringify(per)) err('quick results: “the same shape again” does not give the same shape');
  }
  console.log(`   ${n} quick tests built`);
}
// ---------- every page script must parse as a module (a syntax error leaves the page blank) ----------
{
  const { execFileSync } = await import('child_process');
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');
  let n = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    try { execFileSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync(path.join(dir, f)), stdio: ['pipe', 'pipe', 'pipe'] }); n++; }
    catch (e) { err(`js/${f} does not parse: ${String(e.stderr || e.message).split('\n').filter(Boolean).slice(0, 4).join(' / ')}`); }
  }
  console.log(`   ${n} scripts parse`);
}
/* ---------- 12. the clause quiz ---------- */
console.log('12. Clause quiz (句ごとの基礎クイズ)');
{
  const runQ = sql => { try { return JSON.stringify(eng.runUser(sql).values); } catch (e) { return null; } };
  let made = 0;
  for (let i = 0; i < 60; i++) for (const set of CQ_SETS) for (const q of cqQuiz(set, 'chk' + i)) {
    made++;
    if (new Set(q.choices.map(c => JSON.stringify(c))).size !== 4 || !(q.answer >= 0)) err(`clause quiz ${q.id}: needs 4 different choices and an answer`);
    if (q.full && runQ(q.full) === null) err(`clause quiz ${q.id}: the right SQL fails: ${q.full}`);
    if (q.kind === 'right') q.choices.forEach((c, j) => { if (j !== q.answer && runQ(c.sql) !== null) err(`clause quiz ${q.id}: a wrong choice runs: ${c.sql}`); });
    if (q.kind === 'blank') { const good = runQ(q.full); q.choices.forEach((c, j) => { if (j !== q.answer && runQ(q.sql.replace(BLANK, c.kw)) === good) err(`clause quiz ${q.id}: ${c.kw} also fits: ${q.sql}`); }); }
    for (const c of [...q.choices, q.shown || {}]) if (c.tx && !(c.tx in en)) err(`clause quiz: missing text ${c.tx}`);
  }
  console.log(`   ${made} questions made`);
}
console.log('13. Shape mix (型ミックス)');
{
  let made = 0;
  for (const r of MIX_RANGES) for (const f of MIX_FORMATS) for (let i = 0; i < 3; i++) {
    const steps = mixSteps(r, st => st.core), ps = mixProblems(eng, steps, f, 20, () => 1, `chk${r}${f}${i}`);
    if (ps.length !== 20) err(`shape mix ${r}/${f}: ${ps.length} of 20 problems`);
    if (new Set(ps.map(p => p.id)).size !== ps.length) err(`shape mix ${r}/${f}: the same id twice`);
    ps.forEach((p, j) => { if (!steps.includes(p.basic)) err(`shape mix ${r}: ${p.basic} is outside the range`); if (j && steps.length > 1 && ps[j - 1].basic === p.basic && j % steps.length === 0) warn(`shape mix ${r}: ${p.basic} twice in a row`);
      const st = BASIC_BY_KEY[p.basic]; if (f !== 'auto' && st.formats.includes(f) && st.formats[p.bf] !== f) err(`shape mix ${r}/${f}: ${p.basic} came as ${st.formats[p.bf]}`); });
    made += ps.length;
  }
  const { shapeSlots, slotProblems, SHAPE_KINDS, SHAPE_COUNTS } = await import('../js/quick.js');   // the shape mix as a quick test / assignment
  const core = mixSteps('core', () => true), all = mixSteps('all', () => true);
  for (const shapes of [core, all, ['cols'], ['groupby', 'having']]) for (const k of SHAPE_KINDS) for (const n of SHAPE_COUNTS) {
    const slots = shapeSlots(eng, shapes, n, k, 'chk' + n), ps = slotProblems(eng, 'chk' + n, slots, '');
    if (ps.length !== slots.length || !slots.length || (slots.length < n && shapes.length > 2) || (k !== 'awrite' && shapes.length > 1 && slots.length < Math.min(n, 8))) err(`shape quick test ${shapes.length} shapes / ${k} / ${n}: ${ps.length} problems`);
    if (new Set(ps.map(p => p.dedupe)).size !== ps.length || ps.some(p => !p.abs)) err(`shape quick test ${k}/${n}: the same problem twice`);
    made += ps.length;
  }
  console.log(`   ${made} problems made`);
}

/* ---------- 14. the adaptive level test ---------- */
console.log('14. Adaptive level test (適応型レベルテスト)');
{
  const V = await import('../js/level.js');
  /** answer(it, n) → true | 'slip' | { shape } | 'concept' ; returns { T, items } */
  const sim = (answer, seed = 'S', make = false) => {
    let T = V.adaptiveStart(seed); const items = [];
    for (let n = 0; n < 40; n++) {
      const it = V.adaptiveNext(T); if (!it) break;
      if (make) { const p = V.adaptiveProblem(eng, T, it, n, items.map(x => x.sql)); if (!p) { err(`adaptive test: no problem for ${it.lesson} ${it.part}`); break; } items.push(p);
        if (LESSON_BY_KEY[p.lesson].ch !== V.LV_CHAPTERS[it.c]) err(`adaptive test: ${p.lesson} is not in chapter ${it.c}`);
        if (it.fmt === 'write' && p.stage !== 'write') err(`adaptive test: ${it.part} of ${it.lesson} is not a writing problem`);
        try { eng.exec(p.sql); } catch (e) { err(`adaptive test: the answer fails: ${p.sql}`); } }
      const a = answer(it, n); T = V.adaptiveAnswer(T, it, a === true, a === true ? null : a);
    }
    return { T, items, lv: V.adaptiveResult(T, 1).lv, prof: V.adaptiveResult(T, 1).prof };
  };
  const knows = L => it => it.c < L;   // knows the chapters before L, nothing after
  let r = sim(() => true, 'S', true);
  if (r.lv !== 6 || r.T.steps.length !== 12 || r.prof.join() !== '3,3,3,3,3,3') err(`adaptive test: all right should be Lv 6 in 12 problems (${r.lv}, ${r.T.steps.length})`);
  r = sim(knows(3), 'S2', true);
  if (r.lv !== 3 || r.prof.join() !== '3,3,3,0,,' || r.T.steps.length !== 8) err(`adaptive test: knows 3 chapters → Lv 3 after 8 problems (${r.lv}, ${r.prof.join()}, ${r.T.steps.length})`);
  r = sim(it => (it.c === 0 && it.part === 'A' ? 'slip' : it.c === 0 ? true : 'concept'));
  if (r.prof[0] !== 2 || r.T.steps.filter(x => x.c === 0).map(x => x.part).join() !== 'A,A2,C') err(`adaptive test: a slip should give another basic problem (${r.T.steps.map(x => x.part).join()})`);
  r = sim(it => (it.part === 'R' ? 'concept' : it.c === 0 ? it.part !== 'B' : it.c === 1 && it.part === 'A' ? { shape: 0 } : 'concept'));
  if (!r.T.steps.some(x => x.part === 'R') || r.prof[0] !== 1 || r.lv !== 0) err(`adaptive test: a shape mistake should check the earlier chapter again (${r.T.steps.map(x => x.c + x.part).join()}, ${r.prof.join()})`);
  r = sim(it => (it.part === 'A' ? true : it.part === 'C' ? it.c < 1 : it.c < 1));
  if (r.prof.join() !== '3,1,1,,,' || r.lv !== 1) err(`adaptive test: two chapters in a row below the pass should end it (${r.prof.join()})`);
  r = sim(it => it.part === 'P');   // reads but cannot write: 1 everywhere → stops after two
  if (r.prof.join() !== '1,1,,,,' || r.lv !== 0) err(`adaptive test: ordering only should be 'almost' (${r.prof.join()})`);
  if (V.mistakeKind(2, ['missingComma'], 'cols').shape !== 0 || V.mistakeKind(2, ['fullwidth'], null) !== 'slip' || V.mistakeKind(0, ['missingComma'], 'cols') !== 'concept') err('adaptive test: mistakeKind');
  for (let i = 0; i < 6; i++) sim((it, n) => ((n * 7 + i) % 3 !== 0), 'R' + i, true);
  console.log('   profiles, slips, second looks and stops as planned');
}

/* ---------- 15. difficulty levels of the lessons ---------- */
console.log('15. Difficulty levels (難易度)');
{
  const Ls = await import('../js/lessons.js'), Q = await import('../js/quick.js');
  let made = 0;
  for (const l of Ls.LESSONS) {
    const lvs = Ls.levelsOf(l.key);
    if (l.ch === 'analysis' || l.kind === 'quiz' || l.fixed) { if (lvs.length) err(`levels: ${l.key} should have none`); continue; }
    if (!lvs.length) { err(`levels: ${l.key} has no level`); continue; }
    const sizes = [];
    for (const L of lvs) {
      const spec = Ls.levelSpec(l.key, L), sets = eng.themesFor(l); let got = 0, cols = null;
      for (let i = 0; i < 24 && got < 6; i++) {
        const p = eng.genLevel(l, sets[i % sets.length], `chk|${l.key}|${i}`, L); if (!p) continue;
        const sql = l.sql(p), r = eng.exec(sql);
        if (Ls.variantOf(l.key, sql) !== spec.v || (p.more || []).length !== spec.more) err(`levels: ${l.key} Lv${L} gave ${sql}`);
        if (!r || (!r.dml && !r.values.length)) err(`levels: ${l.key} Lv${L} has no rows: ${sql}`);
        if (!r.dml) cols = Math.max(cols || 0, r.columns.length);
        const pr = makeProbe(l, p); if (!pr) err(`levels: ${l.key} Lv${L} cannot be made into a problem`);
        got++; made++;
      }
      if (!got) err(`levels: ${l.key} Lv${L} cannot be made`);
      sizes.push(cols);
    }
    // a level is never easier than the one before: neither a simpler variant with no more columns, nor the same pair twice
    const specs = lvs.map(L => Ls.levelSpec(l.key, L)), keys = specs.map(x => `${x.v}|${x.more}`);
    if (new Set(keys).size !== keys.length || specs.some((x, i) => i && x.v + x.more < specs[i - 1].v + specs[i - 1].more)) err(`levels: ${l.key} levels are not in order (${keys.join(' ')})`);
    if (['where', 'orderby', 'andor', 'select'].includes(l.key) && lvs.length < 4) err(`levels: ${l.key} has only ${lvs.length} levels`);
    if (!Ls.levelInfo(l.key, lvs[lvs.length - 1])) err(`levels: ${l.key} has no description of its levels`);
  }
  // a quick test at a level: every problem is of that level (or the lesson's highest)
  const slots = Q.simpleSlots(eng, ['select', 'orderby', 'groupby', 'inner'], 8, 'write', 'LVQ', '', 3), ps = Q.slotProblems(eng, 'LVQ', slots, '');
  if (ps.length < 4 || ps.some(p => p.lv !== Q.levelFor(p.lesson, 3) || p.lv !== Ls.levelsOf(p.lesson).length)) err(`levels: a quick test at Lv3 has problems of another level (${ps.map(p => p.lesson + p.lv).join()})`);
  console.log(`   ${made} problems made at their levels`);
}
function makeProbe(l, p) { try { return eng.buildProblem(l, p, 'write', 0, 'chk'); } catch (e) { return null; } }

/* ---------- 15b. the count tables: problems by difficulty, the class format's difficulty ---------- */
console.log('15b. Counts by difficulty');
{
  const Q = await import('../js/quick.js'), E = await import('../js/engine.js'), { splitBy } = Q;
  [[5, [1, 1, 1]], [7, [3, 2, 0]], [1, [1, 2, 2]], [10, [1, 0, 0]]].forEach(([n, r]) => { const x = splitBy(n, r); if (x.reduce((a, b) => a + b, 0) !== n || x.some((v, i) => !r[i] && v)) err(`splitBy(${n}, ${r}) = ${x}`); });
  const ls = ['where', 'orderby', 'groupby'];
  const K = c => Object.fromEntries(Q.QK.map(st => [st, c[st] || [0, 0, 0]]));
  for (const cnt of [{ write: [2, 1, 1] }, { order1: [0, 2, 0], write: [1, 1, 0] }, { fill: [1, 0, 0], order2: [1, 1, 0], write: [0, 0, 2] }]) {
    const g = Q.spreadGrid(eng, ls, K(cnt), ''), slots = Q.gridSlots(eng, g, ls, 'CHK', '');
    Q.QK.forEach(st => [1, 2, 3].forEach(b => { const want = (cnt[st] || [0, 0, 0])[b - 1], got = slots.filter(x => x.st === st && x.bd === b).length; if (got !== want) err(`gridSlots ${JSON.stringify(cnt)}: ${got} ${st} problems of band ${b}, not ${want}`); }));
    if (slots.some((x, i) => i && ls.indexOf(x.k) < ls.indexOf(slots[i - 1].k))) err('gridSlots: the lessons should come in the chosen order');
    if (slots.some((x, i) => i && x.k === slots[i - 1].k && x.bd < slots[i - 1].bd)) err('gridSlots: in a lesson the easier problems should come first');
    const per = ls.map(k => slots.filter(x => x.k === k).length); if (Math.max(...per) - Math.min(...per) > 1) err(`spreadGrid ${JSON.stringify(cnt)}: uneven ${per}`);
    const probs = Q.slotProblems(eng, 'CHK', slots, ''); if (probs.length !== slots.length) err('gridSlots: a slot has no problem');
    probs.forEach((p, i) => { const want = slots[i].st.startsWith('order') ? 'order' : slots[i].st; if (p.stage !== want) err(`gridSlots: slot ${slots[i].st} gives a ${p.stage} problem`); });
  }
  const { BASIC_CORE } = await import('../js/basics.js'), sh = Q.shapeCountSlots(eng, BASIC_CORE.map(x => x.key), [2, 1, 3], 'CHK');
  if (sh.length !== 6 || ['afill', 'aorder', 'awrite'].some((st, i) => sh.filter(x => x.st === st).length !== [2, 1, 3][i])) err(`shapeCountSlots: wrong counts ${sh.map(x => x.st)}`);
  for (const dif of [1, 3, 4]) {
    const f = { demo: true, fill: 1, order1: 1, order2: 0, write: 3, dif }, key = E.formatKey(f);
    if (E.formatKey(E.formatFromKey(key)) !== key) err(`format key ${key} does not come back`);
    for (const k of ['select', 'where', 'orderby', 'groupby', 'inner']) {
      const L = E.LESSON_BY_KEY[k], pr = eng.lessonProblems(L, 'CHKD', f).filter(p => p.kind !== 'demo');
      if (pr.length !== 5) err(`format dif ${dif}: ${k} has ${pr.length} problems`);
      const want = pr.map((p, j) => E.bandOf(dif, j, pr.length));
      pr.forEach((p, j) => { if (p.bd && p.bd !== want[j]) err(`format dif ${dif}: ${k} problem ${j + 1} is band ${p.bd}`); });
      if (!pr.some(p => p.bd)) warn(`format dif ${dif}: ${k} has no levels`);
    }
  }
  if (E.normFormat({ demo: true, fill: 1, order1: 1, order2: 1, write: 2, dif: 0 }) !== null) err('the usual format with no difficulty should be null');
  { // a quick test with SQL and Python lessons
    const ls = ['where', 'pd_num', 'pd_group', 'pd_merge'], slots = Q.gridSlots(eng, Q.spreadGrid(eng, ls, Object.fromEntries(Q.QK.map(st => [st, st === 'write' ? [2, 2, 2] : [0, 0, 0]])), ''), ls, 'PYQ', '');
    const q = Q.newQuick({ seed: 'PYQ', slots, limitSec: 300 }, Date.now()), probs = Q.quickProblems(eng, q), py = probs.filter(p => p.py);
    if (probs.length !== 6) err(`quick test with Python: ${probs.length} problems`);
    if (py.length !== 4 || py.some(p => !p.code || p.stage !== 'write' || !p.id.startsWith('quick:'))) err('quick test with Python: the Python problems are wrong');
    if (new Set(py.map(p => p.code)).size !== py.length) err('quick test with Python: the same Python problem twice');
    if (py.some(p => p.bd)) err('quick test with Python: Python problems have no difficulty');
  }
  console.log('   counts, order and class-format difficulty checked');
}

/* ---------- 15c. writing a join shorter (aliases) ---------- */
console.log('15c. Shorter joins');
{
  const { shortForms } = await import('../js/alt.js'), { SHORT_FORMS } = await import('../js/lectures-c.js'), { JOIN_DATASETS } = await import('../js/datasets.js');
  const same = (a, b) => { const x = eng.exec(a), y = eng.exec(b); return JSON.stringify(x.values) === JSON.stringify(y.values); };
  let n = 0;
  for (const k of ['inner', 'innercols', 'innerwhere', 'left', 'antijoin', 'leftorder']) {
    const L = LESSON_BY_KEY[k];
    for (const ds of JOIN_DATASETS) for (const seed of ['SHORT|' + k, 'a', 'b']) {
      const p = eng.genOne(L, ds, seed); if (!p) continue;
      const f = shortForms(eng, L.sql(p), !!L.ordered, L.names); n++;
      if (f.length < 3) err(`shorter join: ${k} on ${ds.key} gives only ${f.length} forms`);
      if (f.some(x => !same(x.sql, f[0].sql))) err(`shorter join: ${k} a short form gives another result`);
    }
  }
  // the lecture slides
  const { LECT_C } = await import('../js/lectures-c.js');
  Object.entries(LECT_C).forEach(([k, Lc]) => { const sl = Lc.slides.find(s => s.type === 'anim' && s.title && /短く/.test(s.title.ja));
    if (!sl) { err(`lecture ${k}: no slide on writing it shorter`); return; }
    const forms = sl.frames.map(f => f.sql);
    if (forms.length < 3) err(`lecture ${k}: only ${forms.length} short forms`);
    forms.forEach(q => { try { if (!same(q, forms[0])) err(`lecture ${k}: “${q.replace(/\s+/g, ' ')}” gives another result`); } catch (e) { err(`lecture ${k}: “${q.replace(/\s+/g, ' ')}” fails: ${e.message}`); } });
    sl.frames.forEach(f => { if (f.mark && !f.sql.includes(f.mark)) err(`lecture ${k}: the mark “${f.mark}” is not in the SQL`); }); });
  console.log(`   ${n} problems: every short form gives the same result`);
}

/* ---------- 15d. the rank tests: problems (subject × tier), scores, ranks, the class log ---------- */
{
  const RK = await import('../js/rank.js');
  for (const ch of RK.RK_CHAPTERS) {
    const avg = {};
    for (const t of RK.RK_TIERS) for (const code of ['A1', 'Z9']) {
      const seen = new Set(), ps = RK.rankProblems(eng, ch, t, code, 20, 0, seen);   // more than anyone solves in the time
      const more = RK.rankProblems(eng, ch, t, code, 5, ps[ps.length - 1].rn + 1, seen);
      if (ps.length !== 20 || more.length !== 5) err(`rank ${ch}-${t} ${code}: ${ps.length}+${more.length} problems, want 20+5`);
      const all = ps.concat(more);
      if (new Set(all.map(p => p.sql)).size !== all.length) err(`rank ${ch}-${t} ${code}: the same problem twice`);
      all.forEach(p => { const task = eng.orderTask(p); if (!task || !task.fine) { err(`rank ${ch}-${t}: no ordering task for ${p.id}`); return; }
        if (t === 'beginner' && task.chunks.some(c => c.distractor)) err(`rank ${ch}-beginner: a trap piece`);
        const byId = Object.fromEntries(task.chunks.map(c => [c.id, c])); const sql = task.answer.map(id => byId[id].text).join(' ') + ';';
        try { if (!grade(eng.runUser(sql), eng.exec(p.sql), p.ordered).ok) err(`rank ${ch}-${t}: the right order is not right: ${p.sql}`); } catch (e) { err(`rank ${ch}-${t}: the right order fails: ${p.sql}`); } });
      avg[t] = (avg[t] || 0) + ps.reduce((s, p) => s + eng.orderTask(p).answer.length, 0);
    }
    if (!(avg.beginner < avg.intermediate && avg.intermediate < avg.advanced)) err(`rank ${ch}: the tiers do not get harder (${JSON.stringify(avg)})`);
  }
  if (!RK.rankParse('join-advanced') || RK.rankParse('analysis-beginner') || RK.rankParse('join-easy')) err('rank: test keys are wrong');
  if (!(RK.RK_SEC.beginner < RK.RK_SEC.intermediate && RK.RK_SEC.intermediate < RK.RK_SEC.advanced)) err('rank: time limits are wrong');
  const a = RK.rankScore(12, 0), b = RK.rankScore(12, 4), z = RK.rankScore(0, 5);
  if (a.score !== 120 || b.score !== 108 || z.score !== 0 || a.acc !== 100 || RK.rankOf(0) !== 'E' || RK.rankOf(100000) !== 'SS') err('rank: scores / ranks are wrong');
  const row = RK.rankRow(Object.assign({}, a, { test: 'join-advanced', solved: 12, passed: 0, misses: 0, ms: 240000 }));
  if (row.problem_id.length > 80 || row.reason.length > 40 || !RK.isRankRow(row) || RK.rankFromRow(row).score !== 120 || RK.rankFromRow(row).test !== 'join-advanced' || RK.rankFromRow(row).solved !== 12) err('rank: the class log row is wrong');
  const rb = RK.rankRow(Object.assign({}, b, { test: 'join-advanced', solved: 12, misses: 4 }));
  const board = RK.classRanking([{ ...row, user_id: 'u1', created_at: '1' }, { ...rb, user_id: 'u2', created_at: '2' }, { ...rb, user_id: 'u1', created_at: '3' }], 'join-advanced');
  if (board.length !== 2 || board[0].user !== 'u1' || board[0].score !== 120) err('rank: the class ranking is wrong');
  { const pr = r => ({ problem_id: `rk:sort-basic:${r.s}:A`, sql: JSON.stringify({ pass: r.p }), user_id: r.u, created_at: r.t });
    const bd = RK.classRanking([pr({ s: 90, p: 2, u: 'a', t: '1' }), pr({ s: 90, p: 0, u: 'b', t: '2' }), pr({ s: 90, p: 0, u: 'a', t: '3' }), pr({ s: 95, p: 3, u: 'c', t: '4' })].map(r => ({ ...r, problem_id: r.problem_id.replace('sort-basic', 'sort-beginner') })), 'sort-beginner');
    if (bd.map(r => r.user + r.passed).join() !== 'c3,b0,a0' || !RK.rankBetter({ score: 9, passed: 0 }, { score: 9, passed: 1 }) || RK.rankBetter({ score: 9, passed: 1 }, { score: 9, passed: 0 })) err('rank: passes do not order ties (' + bd.map(r => r.user + r.passed).join() + ')'); }
  console.log(`   rank tests: ${RK.RK_CHAPTERS.length} subjects × ${RK.RK_TIERS.length} tiers, problems until the time is up`);
}

/* ---------- 16. the Python course (pandas) ---------- */
console.log('16. Python course (pandas)');
{
  const P = await import('../js/pandas.js'), { execFileSync } = await import('node:child_process');
  const probs = [];
  for (const l of P.PD_LESSONS) for (const seed of ['a', 'b', 'c', 'd']) {
    const set = P.pdSet(l.key, seed);
    if (set.items.length < P.PD_N) err(`python: ${l.key} has only ${set.items.length} practice problems`);
    [set.demo, ...set.items].forEach(p => probs.push({ id: p.id + '|' + seed, code: p.code, need: Object.keys(P.pdTables(p)), lesson: l.key }));
  }
  let res = null;
  try { res = JSON.parse(execFileSync('python3', [new URL('./pd-check.py', import.meta.url).pathname], { input: JSON.stringify({ tables: P.pdAllTables(), problems: probs }), maxBuffer: 64 << 20 }).toString()); }
  catch (e) { warn('python: CPython with pandas is not here, the reference answers were not run'); }
  if (res) {
    probs.forEach(p => { const r = res[p.id];
      if (!r || r.error) err(`python: ${p.code} fails: ${r && r.error}`);
      else if (r.kind === 'table' && !r.rows.length) err(`python: ${p.code} gives no rows`);
      else if (r.kind === 'none') err(`python: ${p.code} gives nothing`); });
    // the same answer written another way is right too
    const alt = [['books.loc[books["price"] >= 1500, ["title", "price"]]', 'books[books["price"] >= 1500][["title", "price"]]', false],
      ['books["genre"].value_counts()', 'books.groupby("genre").size()', false], ['books.sort_values("price", ascending=False).head(3)', 'books.nlargest(3, "price")', true]];
    const r2 = JSON.parse(execFileSync('python3', [new URL('./pd-check.py', import.meta.url).pathname], { input: JSON.stringify({ tables: P.pdAllTables(), problems: alt.flatMap(([a, b], i) => [{ id: 'a' + i, code: a, need: ['books'] }, { id: 'b' + i, code: b, need: ['books'] }]) }) }).toString());
    alt.forEach(([a, b, ord], i) => { if (!P.pdSame(r2['a' + i], r2['b' + i], ord)) err(`python: "${b}" should count as "${a}"`); });
    if (P.pdSame(r2.a0, r2.a1, false)) err('python: different results count as the same');
  }
  console.log(`   ${probs.length} reference answers run`);
}

/* ---------- 17. the Python course's lectures ---------- */
console.log('17. Python lectures');
{
  const P = await import('../js/pandas.js'), { PY_LECTURES, pyTopics } = await import('../js/lectures-py.js');
  const { quizAnswer } = await import('../js/lecture-kit.js'), { execFileSync } = await import('node:child_process');
  const runs = [], checks = [];
  const need = code => Object.keys(P.pdAllTables()).filter(t => new RegExp(`\\b${t}\\b`).test(code));
  const run = (id, code) => { runs.push({ id, code, need: need(code) }); return id; };
  for (const l of P.PD_LESSONS) {
    const key = l.key, L = PY_LECTURES[key];
    if (!L) { err(`python lecture: ${key} has none`); continue; }
    const t3 = (where, x) => { for (const g of ['en', 'ja', 'easy']) { const v = x && x[g];
      if (!v) err(`python lecture ${key} ${where}: no ${g}`);
      else if (g === 'easy' && /[一-鿿]/.test(v.replace(/\{[^{}|]+\|[^{}]+\}/g, ''))) err(`python lecture ${key} ${where} (easy): kanji without furigana`);
      else if (g === 'en' && /[぀-ヿ一-鿿]/.test(v)) err(`python lecture ${key} ${where} (en) contains Japanese`); } };
    const table = (where, fn) => { try { const st = fn(eng); if (!st.rows.length) err(`python lecture ${key} ${where}: empty table`); return st; } catch (e) { err(`python lecture ${key} ${where}: table fails: ${e.message}`); return null; } };
    t3('goal', L.goal);
    const types = L.slides.map(sl => (sl.cases ? 'cases' : sl.type)), covered = new Set();
    for (const t of ['scene', 'syntax', 'anim', 'cases', 'mistake', 'quiz', 'points', 'practice']) if (!types.includes(t)) err(`python lecture ${key}: no “${t}” slide`);
    if (types[0] !== 'scene' || types[types.length - 1] !== 'practice') err(`python lecture ${key}: starts with the scene and ends with the practice slide`);
    L.slides.forEach((sl, i) => {
      const at = `slide ${i + 1}`;
      ['notes', 'items'].forEach(k => (sl[k] || []).forEach((n, j) => t3(`${at} ${k} ${j + 1}`, n)));
      ['title', 'why', 'who', 'ask', 'q'].forEach(k => { if (sl[k]) t3(`${at} ${k}`, sl[k]); });
      [sl, ...(sl.frames || [])].forEach(x => (x.side || []).forEach((fn, j) => table(`${at} side ${j + 1}`, fn)));
      if (sl.table && sl.type !== 'quiz') table(at, sl.table);
      if (sl.code) run(`${key}|${at}|code`, sl.code);
      if (sl.type === 'mistake') checks.push({ key, at, wrong: run(`${key}|${at}|wrong`, sl.wrong), right: run(`${key}|${at}|right`, sl.right) });
      if (sl.type === 'quiz') {
        sl.choices.forEach((c, j) => { if (typeof c !== 'string') t3(`${at} choice ${j + 1}`, c); });
        let a = -1; try { a = quizAnswer(sl, eng); } catch (e) { err(`python lecture ${key} quiz: the answer fails: ${e.message}`); }
        if (!(a >= 0 && a < sl.choices.length)) err(`python lecture ${key} quiz: the answer is not one of the choices`);
        if (sl.mark && !sl.code.includes(sl.mark)) err(`python lecture ${key} quiz: “${sl.mark}” is not in the code`);
        ['table', 'before'].forEach(k => { if (sl[k]) table(`quiz ${k}`, sl[k]); });
      }
      (sl.frames || []).forEach((f, j) => {
        const fat = `${at} frame ${j + 1}`;
        t3(fat, f.cap); if (sl.cases) t3(`${fat} label`, f.label);
        (f.covers || []).forEach(c => covered.add(c));
        if (!f.code) { err(`python lecture ${key} ${fat}: no code`); return; }
        if (f.mark && !f.code.includes(f.mark)) err(`python lecture ${key} ${fat}: “${f.mark}” is not in the code`);
        if (f.chart) { try { if (!/<svg/.test(f.chart(eng))) err(`python lecture ${key} ${fat}: no chart`); } catch (e) { err(`python lecture ${key} ${fat}: the chart fails: ${e.message}`); } }
        const id = run(`${key}|${fat}`, f.code), st = f.table ? table(fat, f.table) : null;
        if (st && f.res) checks.push({ key, at: fat, id, st, pass: f.res === 'pass', ordered: true });
      });
    });
    const used = new Set();
    for (let n = 0; n < 80; n++) pyTopics(key, P.pdProblem(key, 'T' + n).p).forEach(t => used.add(t));
    for (const t of used) if (!covered.has(t)) err(`python lecture ${key}: the problems use “${t}”, but no case covers it`);
  }
  let res = null;
  try { res = JSON.parse(execFileSync('python3', [new URL('./pd-check.py', import.meta.url).pathname], { input: JSON.stringify({ tables: P.pdAllTables(), problems: runs }), maxBuffer: 64 << 20 }).toString()); }
  catch (e) { warn('python lectures: CPython with pandas is not here, the code was not run'); }
  if (res) {
    const wrongIds = new Set(checks.filter(c => c.wrong).map(c => c.wrong));
    runs.forEach(r => { if (!wrongIds.has(r.id) && res[r.id].error) err(`python lecture: ${r.code} fails: ${res[r.id].error}`); });
    checks.forEach(c => {
      if (c.wrong) { const w = res[c.wrong], r = res[c.right]; if (!w.error && P.pdSame(w, r, true)) err(`python lecture ${c.key} ${c.at}: the wrong code gives the right result`); return; }
      const got = res[c.id], rows = c.st.rows.filter(r => !c.pass || r.cls === 'pass');
      const one = got && got.kind === 'value' && rows.length === 1 && rows[0].cells.length === 1;   // a p-value … shown as one cell
      const shown = one ? { kind: 'value', value: rows[0].cells[0] } : { kind: 'table', columns: c.st.cols, rows: rows.map(r => r.cells) };
      if (!got.error && !P.pdSame(got, shown, c.ordered)) err(`python lecture ${c.key} ${c.at}: the table is not what pandas gives (${JSON.stringify(got).slice(0, 160)})`);
    });
  }
  console.log(`   ${Object.keys(PY_LECTURES).length} lectures, ${runs.length} pieces of code run`);
}

/* ---------- 18. reading Python errors ---------- */
console.log('18. Reading Python errors');
{
  const P = await import('../js/pandas.js'), E = await import('../js/pyerrors.js'), { execFileSync } = await import('node:child_process');
  const probs = [E.peProblem('key', 'demo', true)], runs = [];
  for (const k of E.PE_KINDS) for (let i = 0; i < 25; i++) probs.push(E.peProblem(k, 'c' + i));
  for (const seed of ['a', 'b', 'c']) { const set = E.peSet(seed); if (new Set(set.items.map(p => p.kind)).size !== E.PE_N) err(`python errors: set ${seed} does not have ${E.PE_N} different kinds`); }
  probs.forEach((p, n) => {
    if (new Set(p.meanings).size !== 3 || p.meanings[p.meaning] !== p.cat) err(`python errors ${p.id}: the meanings are wrong`);
    if (new Set(p.fixes).size !== 3 || p.fixes[p.fixAt] !== p.fix) err(`python errors ${p.id}: the fixes are wrong`);
    if (!E.PE_TYPES.includes(p.type)) err(`python errors ${p.id}: ${p.type} is not in the cheat sheet`);
    // a fix changes only the line with the mistake
    p.fixes.forEach(f => { const fl = f.split('\n'); if (fl.length !== p.lines.length || fl.some((l, i) => i + 1 !== p.at && l !== p.lines[i])) err(`python errors ${p.id}: a fix changes another line: ${f}`); });
    const need = E.peNeed(p);
    runs.push({ id: `${n}|bad`, code: p.code, need }, { id: `${n}|fix`, code: p.fix, need }, ...p.wrong.map((w, j) => ({ id: `${n}|w${j}`, code: w, need })));
  });
  let res = null;
  try { res = JSON.parse(execFileSync('python3', [new URL('./pd-check.py', import.meta.url).pathname], { input: JSON.stringify({ tables: P.pdAllTables(), problems: runs }), maxBuffer: 64 << 20 }).toString()); }
  catch (e) { warn('python errors: CPython with pandas is not here, the code was not run'); }
  if (res) probs.forEach((p, n) => {
    const bad = res[`${n}|bad`], fix = res[`${n}|fix`], type = e => (e && e.error ? e.error.split(':')[0].replace(/^.*\./, '') : null);
    if (type(bad) !== p.type) err(`python errors: ${p.code} gives ${bad.error || 'no error'}, not ${p.type}`);
    if (fix.error) err(`python errors: the fix ${p.fix} fails: ${fix.error}`);
    p.wrong.forEach((w, j) => { const r = res[`${n}|w${j}`]; if (!r.error && !fix.error && P.pdSame(r, fix, true)) err(`python errors: the wrong fix ${w} works`); });
  });
  console.log(`   ${probs.length} problems run (the exact messages are checked in the browser with Pyodide)`);
}

console.log('19. HackerRank practice (HackerRank 対策)');
{
  const HR = await import('../js/hr.js');
  const SQL2 = await initSqlJs();
  const langs = ['ja', 'easy', 'en', 'ne', 'fr', 'my', 'bn', 'si', 'id', 'vi', 'zh'];
  HR.HR_PROBLEMS.forEach(p => {
    const s = HR.hrExpected(SQL2, p, false), h = HR.hrExpected(SQL2, p, true);
    if (!s.values.length) err(`hr ${p.id}: the answer returns no rows on the sample`);
    if (JSON.stringify(s.values) === JSON.stringify(h.values)) warn(`hr ${p.id}: the hidden rows do not change the result`);
    if (!HR.hrSubmit(SQL2, p, p.sql).every(c => c.ok)) err(`hr ${p.id}: the answer does not pass its own test cases`);
    if (HR.hrSubmit(SQL2, p, `SELECT * FROM ${Object.keys(p.tables)[0]};`).every(c => c.ok)) err(`hr ${p.id}: SELECT * passes`);
    langs.forEach(l => ['t', 'd'].concat(p.ex ? ['how'] : []).forEach(k => { if (!dicts[l][`hr.p.${p.id}.${k}`]) err(`hr ${p.id}: ${l}.js has no hr.p.${p.id}.${k}`); }));
  });
  console.log(`   ${HR.HR_PROBLEMS.length} problems`);
}

console.log('20. paiza practice (paiza 対策)');
{
  const PZ = await import('../js/pz.js');
  const SQL3 = await initSqlJs();
  const langs = ['ja', 'easy', 'en', 'ne', 'fr', 'my', 'bn', 'si', 'id', 'vi', 'zh'];
  PZ.PZ_PROBLEMS.forEach(p => {
    const s = PZ.pzExpected(SQL3, p, false), h = PZ.pzExpected(SQL3, p, true);
    if (!s.values.length) err(`pz ${p.id}: the answer returns no rows on the sample`);
    if (JSON.stringify(s.values) === JSON.stringify(h.values)) warn(`pz ${p.id}: the hidden rows do not change the result`);
    if (!PZ.pzSubmit(SQL3, p, p.sql).every(c => c.ok)) err(`pz ${p.id}: the answer does not pass its own test cases`);
    if (PZ.pzSubmit(SQL3, p, `SELECT * FROM ${Object.keys(p.tables)[0]};`).every(c => c.ok)) err(`pz ${p.id}: SELECT * passes`);
    langs.forEach(l => ['t', 'd'].concat(p.ex ? ['how'] : []).forEach(k => { if (!dicts[l][`pz.p.${p.id}.${k}`]) err(`pz ${p.id}: ${l}.js has no pz.p.${p.id}.${k}`); }));
  });
  PZ.PZ_LEVELS.forEach(lv => { const d = PZ.pzLevel(lv); if (!d.length || !d[0].ex || PZ.pzCheckIds(lv).length < 2) err(`pz level ${lv}: needs an example and practice problems`); });
  console.log(`   ${PZ.PZ_PROBLEMS.length} problems`);
}

console.log('21. Ordering pieces in groups (並べ替えの語群)');
{
  const OG = await import('../js/ordgroup.js');
  const { ALL_TABLES: AT } = await import('../js/datasets.js');
  const KWS = /^\(*(SELECT|FROM|WHERE|AND|OR|NOT|ORDER|GROUP|BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|INNER|LEFT|ON|AS|DISTINCT|BETWEEN|IN|LIKE|IS|NULL|ASC|DESC|CASE|WHEN|THEN|ELSE|END|CROSS)\b/i;
  let n = 0;
  for (const L of LESSONS) for (let i = 0; i < 20; i++) for (const level of [1, 2]) {
    let p; try { p = eng.drillProblem(L, `og|${L.key}|${level}|${i}`, level); } catch (e) { p = null; }
    const o = p && eng.orderTask(p); if (!o || !o.fine) continue;
    const ctx = OG.ordContext(p.sql, p.tables), cols = new Set((p.tables || []).flatMap(t => (AT[t] ? AT[t].columns.map(c => c[0]) : [])));
    o.chunks.forEach(c => { n++;
      const g = OG.pieceGroup(c.text, ctx), w = c.text.trim().split(/\s+/)[0].replace(/^\(+|[,;)]+$/g, '');
      if (KWS.test(c.text.trim()) && /^[A-Za-z]+$/.test(w) && g !== 'kw') err(`order groups: "${c.text}" is a keyword piece but in ${g} ← ${p.sql}`);
      if (g === 'table' && cols.has(w) && !(p.tables || []).includes(w)) err(`order groups: column "${w}" is in the table group ← ${p.sql}`);
      if (g === 'table' && !ctx.tables.has(w)) err(`order groups: "${w}" is not a table of the problem ← ${p.sql}`);
      if (g === 'col' && /^'/.test(w)) err(`order groups: value "${c.text}" is in the column group ← ${p.sql}`); });
  }
  console.log(`   ${n} pieces checked`);
}

console.log('22. index.html loads every module at once (modulepreload)');
{
  const { preloadBlock } = await import('./preload.mjs');
  const html = fs.readFileSync(path.join(here, '../index.html'), 'utf8');
  if (!html.includes(preloadBlock())) err('index.html: the modulepreload list is stale — run  node tools-next/preload.mjs');
  else console.log('   up to date');
}

console.log(`\n${errors ? '✗' : '✓'} ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
