/* =========================================================
 * book-data.js — textbook data without any browser code
 * (used by book.js and by tools-next/check.mjs)
 * ========================================================= */
/**
 * Typical mistakes on each lesson page: [explanation id, wrong SQL, correct SQL (default: the example)].
 * check.mjs runs every pair: the wrong SQL must fail or give a different result.
 */
export const MISTAKES = {
  select: [['commaMissing', 'SELECT name price FROM products;'], ['commaBeforeFrom', 'SELECT name, price, FROM products;']],
  between: [['betweenOrder', 'SELECT * FROM products WHERE price BETWEEN 5000 AND 1000;'], ['betweenAnd', 'SELECT * FROM products WHERE price BETWEEN 1000, 5000;']],
  like: [['likeNoPercent', "SELECT name, category FROM products WHERE name LIKE 'Pro';"], ['likeEquals', "SELECT name, category FROM products WHERE name = '%Pro%';"]],
  distinct: [['distinctMissing', 'SELECT category FROM products ORDER BY category ASC;'], ['distinctPlace', 'SELECT category DISTINCT FROM products ORDER BY category ASC;']],
  topn: [['descMissing', "SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price LIMIT 3;"], ['limitBeforeOrder', "SELECT name, price FROM products WHERE category = 'Electronics' LIMIT 3 ORDER BY price DESC;"]],
  offset: [['offsetCount', 'SELECT name, price FROM products WHERE release_year >= 2020 ORDER BY price ASC LIMIT 2 OFFSET 4;'], ['offsetNoOrder', 'SELECT name, price FROM products WHERE release_year >= 2020 LIMIT 2 OFFSET 3;']],
  aggfn: [['aggWithCol', 'SELECT name, COUNT(*), AVG(price) FROM products;'], ['fullwidth', 'SELECT COUNT(*), AVG（price） FROM products;']],
  whereagg: [['quoteMissing', 'SELECT MAX(score), MIN(score) FROM students WHERE major = IT;'], ['whereAfterFrom', "SELECT MAX(score), MIN(score) WHERE major = 'IT' FROM students;"]],
  groupby: [['groupMissing', 'SELECT major, COUNT(*), AVG(score) FROM students;'], ['groupWrongCol', 'SELECT major, COUNT(*), AVG(score) FROM students GROUP BY score;']],
  grouporder: [['orderAfterGroup', 'SELECT category, AVG(price) FROM products ORDER BY AVG(price) DESC GROUP BY category;'], ['descMissing', 'SELECT category, AVG(price) FROM products GROUP BY category ORDER BY AVG(price);']],
  having: [['aggInWhere', 'SELECT category, AVG(price) FROM products WHERE AVG(price) >= 5000 GROUP BY category;'], ['groupColMissing', 'SELECT AVG(price) FROM products GROUP BY category HAVING AVG(price) >= 5000;']],
  wherehaving: [['whereBeforeGroup', 'SELECT category, COUNT(*) FROM products GROUP BY category WHERE release_year >= 2020 HAVING COUNT(*) >= 2;'], ['aggInWhere', 'SELECT category, COUNT(*) FROM products WHERE release_year >= 2020 AND COUNT(*) >= 2 GROUP BY category;']],
  inner: [['onMissing', 'SELECT * FROM table_a INNER JOIN table_b;'], ['onWrongCol', 'SELECT * FROM table_a INNER JOIN table_b ON table_a.id = table_b.column_b2;']],
  innercols: [['ambiguous', 'SELECT id, table_b.column_b1 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;', 'SELECT table_a.id, table_b.column_b1 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;'], ['columnTable', 'SELECT table_b.column_a1, table_b.column_b1 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;']],
  innerwhere: [['whereAfterJoin', "SELECT table_a.column_a1, table_a.class, table_b.column_b2 FROM table_a WHERE table_a.class = 'A' INNER JOIN table_b ON table_a.id = table_b.id;"], ['quoteMissing', 'SELECT table_a.column_a1, table_a.class, table_b.column_b2 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id WHERE table_a.class = A;']],
  left: [['innerInstead', 'SELECT * FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;'], ['leftDirection', 'SELECT * FROM table_b LEFT JOIN table_a ON table_a.id = table_b.id;']],
  antijoin: [['eqNull', 'SELECT table_a.id, table_a.column_a1 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id WHERE table_b.id = NULL;'], ['innerAnti', 'SELECT table_a.id, table_a.column_a1 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id WHERE table_b.id IS NULL;']],
  leftorder: [['descMissing', 'SELECT table_a.column_a1, table_b.column_b2 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id ORDER BY table_b.column_b2 LIMIT 3;'], ['limitBeforeOrder', 'SELECT table_a.column_a1, table_b.column_b2 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id LIMIT 3 ORDER BY table_b.column_b2 DESC;']]
};
export const MISTAKE_IDS = [...new Set(Object.values(MISTAKES).flat().map(m => m[0]))];

/** What happens when the wrong SQL runs, compared with the correct one. → [key, vars] */
export function mistakeEffect(engine, wrong, right) {
  let w;
  try { w = engine.exec(wrong); } catch (e) { return ['book.mxError', {}]; }
  const r = engine.exec(right);
  const wv = w ? w.values : [], rv = r ? r.values : [];
  if (!w || !r) return wv.length === rv.length ? null : ['book.mxRows', { a: wv.length, b: rv.length }]; // 0 rows: sql.js returns no columns
  const wc = w ? w.columns.length : 0, rc = r ? r.columns.length : 0;
  if (wc !== rc) return ['book.mxCols', { a: wc, b: rc }];
  if (wv.length !== rv.length) return ['book.mxRows', { a: wv.length, b: rv.length }];
  const key = rows => rows.map(x => JSON.stringify(x));
  if (key(wv).join() === key(rv).join()) return null; // not a mistake at all
  if (key(wv).sort().join() === key(rv).sort().join()) return ['book.mxOrder', {}];
  return ['book.mxValues', {}];
}

