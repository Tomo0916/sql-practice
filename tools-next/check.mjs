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
    const plain = v.replace(/\{[^{}|]+\|[^{}]+\}/g, '');
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
      const bare = v.replace(/\{[^{}|]+\|[^{}]+\}/g, '').match(/[一-鿿]+/g);
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
          const res = eng.exec(f.sql) || { values: [] }, marked = st.rows.some(r => r.cls === 'pass' || r.cls === 'fail');
          const shown = marked ? st.rows.filter(r => r.cls === 'pass').length : st.rows.length;
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
console.log(`\n${errors ? '✗' : '✓'} ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
