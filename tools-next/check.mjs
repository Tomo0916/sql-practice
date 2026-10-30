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
import { lessonState } from '../next/js/store.js';
import { SqlEngine, LESSON_BY_KEY, stagesOf, grade, todayCode, splitClauses } from '../next/js/engine.js';
import { diagnose, findFix } from '../next/js/diagnose.js';
import { LESSONS } from '../next/js/lessons.js';
import { usedKeys, ANALYSIS_KEY, ANALYSIS_LANGS } from './build-i18n.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let errors = 0, warnings = 0;
const err = (...a) => { errors++; console.log('  ✗', ...a); };
const warn = (...a) => { warnings++; console.log('  !', ...a); };

/* ---------- 1. languages ---------- */
console.log('1. Language files');
const LANGS = ['ja', 'easy', 'en', 'ne', 'fr', 'my', 'bn', 'si', 'id', 'vi', 'zh'];
const dicts = {};
for (const l of LANGS) dicts[l] = (await import(path.join(here, '../next/i18n', l + '.js'))).default;
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
          const twin = kinds.findIndex(t => t.split(' ')[0] === x.text.split(' ')[0] || (/^(INNER|LEFT)/.test(t) && /^(INNER|LEFT)/.test(x.text)) || (/^(WHERE|HAVING)/.test(t) && /^(WHERE|HAVING)/.test(x.text)));
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
const all = LESSONS.map(l => l.key);
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
  const { STAT, GUIDE } = await import('../next/js/analysis-content.js');
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

console.log(`\n${errors ? '✗' : '✓'} ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
