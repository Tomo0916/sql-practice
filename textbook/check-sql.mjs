// Run every SQL statement of the textbook in the app's own engine (sql.js) and compare
// with what the build saw.   node check-sql.mjs [beginner]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const initSqlJs = require('../tools-next/node_modules/sql.js');
const name = process.argv[2] || 'beginner';
const { tables, statements } = JSON.parse(fs.readFileSync(`out/${name}-sql.json`, 'utf8'));
const SQL = await initSqlJs();
const fresh = () => {
  const db = new SQL.Database();
  for (const t of Object.values(tables)) {
    db.run(`CREATE TABLE ${t.table} (${t.columns.map(c => c.join(' ')).join(', ')})`);
    const st = db.prepare(`INSERT INTO ${t.table} VALUES (${t.columns.map(() => '?').join(',')})`);
    t.rows.forEach(r => st.run(r));
    st.free();
  }
  return db;
};
const norm = v => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
const same = (a, b) => JSON.stringify(a.map(r => r.map(norm))) === JSON.stringify(b.map(r => r.map(norm)));
let bad = 0, n = 0;
const seen = new Set();
for (const s of statements) {
  const key = JSON.stringify(s);
  if (seen.has(key)) continue;
  seen.add(key); n++;
  const db = fresh();
  let got, err = false;
  try {
    const res = db.exec(s.sql);
    if (s.table) got = (db.exec(`SELECT * FROM ${s.table}`)[0] || { values: [] }).values;
    else got = res.length ? res[res.length - 1].values : [];
  } catch (e) { err = e.message; }
  if (s.error) { if (!err) { bad++; console.log('✗ the app runs this, the book says error:', s.sql); } continue; }
  if (err) { bad++; console.log('✗ the app gives an error:', s.sql, '→', err); continue; }
  const want = s.table ? s.after : s.rows;
  if (!same(got, want)) { bad++; console.log('✗ different result in the app:', s.sql, '\n   book:', JSON.stringify(want).slice(0, 200), '\n   app: ', JSON.stringify(got).slice(0, 200)); }
}
console.log(`${bad ? '✗' : '✓'} ${n} statements checked in sql.js (the app's engine), ${bad} difference(s)`);
process.exit(bad ? 1 : 0);
