#!/usr/bin/env node
/* =========================================================
 * tools/check.js — run before publishing:   cd tools && npm install && node check.js
 *   - every text exists in all 10 languages (no Japanese left in other languages)
 *   - every lesson generates an example + practice problems for many set codes
 *   - every answer runs, returns rows, has no ties in its sort order, and grades itself as correct
 *   - paper tests can be generated
 * ========================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const initSqlJs = require('sql.js');

const ROOT = path.join(__dirname, '..');
const ctx = vm.createContext({ console, module: undefined });
['js/i18n.js', 'js/datasets.js', 'js/lessons.js', 'js/engine.js'].forEach(f => {
  // top-level const/class are script-scoped, so expose them on the context explicitly
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const names = [...src.matchAll(/^(?:const|class|function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  vm.runInContext(src + '\n' + names.map(n => `globalThis.${n} = ${n};`).join('\n'), ctx, { filename: f });
});
const G = ctx;
let errors = 0, warnings = 0;
const err = (...a) => { errors++; console.log('  ✗', ...a); };
const warn = (...a) => { warnings++; console.log('  !', ...a); };

const KANA = /[぀-ヿ]/;           // hiragana / katakana
const CJK = /[぀-ヿ一-鿿＀-￯]/;
function leak(lang, s) { if (lang === 'ja') return false; return lang === 'zh' ? KANA.test(s) : CJK.test(s); }

(async () => {
  const SQL = await initSqlJs();
  const eng = new G.SqlEngine(SQL);

  console.log('1. Interface text');
  for (const [k, arr] of Object.entries(G.STR)) {
    if (arr.length !== 10) err(`STR['${k}'] has ${arr.length} entries (need 10)`);
    arr.forEach((s, i) => { if (!s || !String(s).trim()) err(`STR['${k}'] is empty for ${G.LANG_CODES[i]}`); else if (leak(G.LANG_CODES[i], s)) err(`STR['${k}'] (${G.LANG_CODES[i]}) contains Japanese: ${s}`); });
    const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
    arr.forEach((s, i) => { if (ph(s) !== ph(arr[1])) err(`STR['${k}'] (${G.LANG_CODES[i]}) placeholders differ from English`); });
  }
  for (const t of Object.values(G.ALL_TABLES)) {
    if (!t.label) continue;
    G.LANG_CODES.forEach(l => { if (!t.label[l]) err(`label of ${t.table} missing ${l}`); else if (leak(l, t.label[l])) err(`label of ${t.table} (${l}) contains Japanese`); });
  }

  console.log('2. Lessons');
  for (const L of G.LESSONS) {
    for (const f of ['title', 'point', 'desc']) {
      if (!Array.isArray(L[f]) || L[f].length !== 10) { err(`${L.key}.${f} needs 10 entries`); continue; }
      L[f].forEach((s, i) => { if (!s) err(`${L.key}.${f} empty for ${G.LANG_CODES[i]}`); else if (leak(G.LANG_CODES[i], s)) err(`${L.key}.${f} (${G.LANG_CODES[i]}) contains Japanese`); });
    }
    const ph = s => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort().join();
    L.desc.forEach((s, i) => { if (ph(s) !== ph(L.desc[1])) err(`${L.key}.desc (${G.LANG_CODES[i]}) placeholders differ: ${ph(s)} vs ${ph(L.desc[1])}`); });
    const ph2 = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    ph2(L.syntax).forEach(k => { if (!G.STR['ph.' + k]) err(`${L.key}.syntax uses unknown placeholder {${k}}`); });
  }

  console.log('3. Problem generation (example + practice for 60 set codes)');
  const codes = [G.todayCode(), 'TEST', 'A7K2', 'CLASS-1'];
  for (let i = 0; i < 56; i++) codes.push('C' + i);
  const variety = {};
  for (const L of G.LESSONS) {
    variety[L.key] = new Set();
    for (const code of codes) {
      const probs = eng.lessonProblems(L, code);
      if (probs.length !== G.PRACTICE_COUNT + 1) err(`${L.key} @${code}: only ${probs.length - 1} practice problems`);
      const ids = new Set();
      for (const p of probs) {
        if (ids.has(p.id)) err(`${L.key} @${code}: duplicate id ${p.id}`); ids.add(p.id);
        variety[L.key].add(p.sql);
        let r;
        try { r = eng.exec(p.sql); } catch (e) { err(`${L.key}: answer fails: ${p.sql} — ${e.message}`); continue; }
        if (!r || !r.values.length) err(`${L.key}: answer returns no rows: ${p.sql}`);
        const g = G.grade(eng.runUser(p.sql), r, p.ordered);
        if (!g.ok) err(`${L.key}: answer does not grade as correct: ${p.sql}`);
        if (p.blank === p.sql) warn(`${L.key}: hint 2 has no blanks`);
        try { const b = eng.runUser(p.blank); if (b && G.grade(b, r, p.ordered).ok) warn(`${L.key}: blank SQL already correct: ${p.blank}`); } catch (e) { /* expected */ }
        p.steps.forEach(([k, s]) => { if (!G.STR[k]) err(`${L.key}: unknown step key ${k}`); try { eng.exec(s); } catch (e) { err(`${L.key}: step fails: ${s}`); } });
        for (const lang of G.LANG_CODES) {
          const h = G.problemHTML(p, lang);
          if (/\{\w+\}/.test(h)) err(`${L.key} (${lang}): unresolved placeholder in "${h}"`);
          if (leak(lang, h.replace(/<code>[^<]*<\/code>/g, ''))) err(`${L.key} (${lang}): Japanese text in problem`);
        }
      }
    }
  }
  for (const [k, s] of Object.entries(variety)) console.log(`   ${k.padEnd(12)} ${String(s.size).padStart(4)} different problems`);

  console.log('4. Example problems (demo) — answers');
  for (const L of G.LESSONS) {
    const d = eng.demoProblem(L);
    console.log(`   ${L.key.padEnd(12)} ${d.sql}`);
  }

  console.log('5. Grading behaviour');
  const exp = eng.exec('SELECT name, price FROM products ORDER BY price DESC LIMIT 3;');
  const chk = (sql, want, ordered) => { const g = G.grade(eng.runUser(sql), exp, ordered); if ((g.ok ? 'ok' : g.reason) !== want) err(`grade(${sql}) → ${g.ok ? 'ok' : g.reason}, expected ${want}`); };
  chk('SELECT name, price FROM products ORDER BY price DESC LIMIT 3', 'ok', true);
  chk('SELECT price, name FROM products ORDER BY price DESC LIMIT 3', 'ok', true);
  chk('select name, price from products order by price asc limit 3', 'values', true);
  chk('SELECT name FROM products LIMIT 3', 'cols', true);
  chk('SELECT name, price FROM products', 'rows', true);
  chk("SELECT name, price FROM products WHERE price IN (18000, 8500, 6200) ORDER BY price", 'order', true);
  try { eng.runUser('DELETE FROM products'); err('DELETE was not blocked'); } catch (e) { if (e.code !== 'onlySelect') err('DELETE gave wrong error'); }
  try { eng.runUser("SELECT 'drop table x'"); } catch (e) { err('string literal containing DROP was blocked'); }
  if (eng.values('SELECT COUNT(*) FROM products')[0][0] !== 10) err('products table was modified');

  console.log('6. Paper tests');
  const all = G.LESSONS.map(l => l.key);
  for (const code of ['T1', 'T2', 'T3']) {
    for (const type of ['write', 'predict', 'mix']) {
      const tst = eng.makeTest({ lessons: all, per: 2, type, code });
      if (tst.questions.length < all.length * 2 - 2) warn(`test ${code}/${type}: only ${tst.questions.length} questions`);
    }
  }
  const tst = eng.makeTest({ lessons: all, per: 2, type: 'mix', code: 'T1' });
  console.log(`   T1 mix: ${tst.questions.length} questions, ${tst.questions.filter(q => q.qtype === 'predict').length} predict, tables: ${tst.tables.join(', ')}`);

  console.log(`\n${errors ? '✗' : '✓'} ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
})();
