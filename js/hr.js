/* =========================================================
 * hr.js — HackerRank SQL (Basic) practice: the problems and how they are checked.
 * Pure logic: no DOM, no language. Runs in the browser and in Node (tools-next/check.mjs).
 *
 * Like the real test, a problem is checked twice:
 *   sample  = the rows shown in the problem,
 *   hidden  = the sample rows + `extra` rows the student never sees (ties, NULLs, edge cases).
 * The texts are in the language files: hr.p.<id>.t (title), hr.p.<id>.d (problem),
 * hr.p.<id>.how (example only: the steps, one per line). en.js holds the original English.
 *
 * ── To add a problem ──
 *   1. add an object to HR_PROBLEMS (copy one of the same area; give it a new id)
 *   2. add hr.p.<id>.t and hr.p.<id>.d to every language file (en = the English problem)
 *   3. run  cd tools-next && node check.mjs  — it checks that the answer runs and that
 *      the hidden rows change the result (so a half-right answer can fail)
 * ========================================================= */
import { grade, topOrderBy, stripLiterals } from './engine.js';

/** the three areas of SQL (Basic) */
export const HR_AREAS = ['sel', 'rel', 'agg'];
export const HR_MOCK_SEC = 30 * 60;   // like the real test: 30 minutes, 2 problems

/* t(cols, rows, extra): a table. cols = "NAME TYPE, …" */
const t = (cols, rows, extra) => ({ cols, rows, extra: extra || [] });

export const HR_PROBLEMS = [
  /* ---------- simple queries ---------- */
  { id: 'sel0', area: 'sel', ex: true, tables: {
      PRODUCTS: t('ID INTEGER, NAME TEXT, CATEGORY TEXT, PRICE INTEGER',
        [[1, 'Desk Lamp', 'Home', 450], [2, 'Keyboard', 'PC', 980], [3, 'Mouse', 'PC', 320], [4, 'Bookshelf', 'Home', 2400], [5, 'Monitor', 'PC', 1500], [6, 'Mug', 'Kitchen', 500]],
        [[7, 'Blender', 'Kitchen', 1500], [8, 'Pen', 'Office', 499], [9, 'Chair', 'Home', 3200]]) },
    sql: 'SELECT NAME FROM PRODUCTS WHERE PRICE >= 500 ORDER BY PRICE DESC, NAME;' },
  { id: 'sel1', area: 'sel', tables: {
      CITY: t('ID INTEGER, NAME TEXT, COUNTRY TEXT, POPULATION INTEGER',
        [[1, 'Osaka', 'JPN', 2750000], [2, 'Kobe', 'JPN', 1510000], [3, 'Nara', 'JPN', 350000], [4, 'Busan', 'KOR', 3400000], [5, 'Fukuoka', 'JPN', 1610000]],
        [[6, 'Sendai', 'JPN', 1000000], [7, 'Chiba', 'JPN', 1000001], [8, 'Hanoi', 'VNM', 8000000]]) },
    sql: "SELECT NAME FROM CITY WHERE COUNTRY = 'JPN' AND POPULATION > 1000000 ORDER BY NAME;" },
  { id: 'sel2', area: 'sel', tables: {
      EMPLOYEE: t('ID INTEGER, NAME TEXT, DEPT TEXT, SALARY INTEGER',
        [[1, 'Maria', 'Sales', 3200], [2, 'Ken', 'IT', 4100], [3, 'Lina', 'IT', 3900], [4, 'Omar', 'Sales', 2800], [5, 'Mika', 'HR', 3000]],
        [[6, 'Sara', 'HR', 3100], [7, 'Tom', 'IT', 4500], [8, 'Mohan', 'Sales', 2600]]) },
    sql: "SELECT NAME FROM EMPLOYEE WHERE NAME LIKE 'M%' OR NAME LIKE '%a' ORDER BY ID;" },
  { id: 'sel3', area: 'sel', tables: {
      CUSTOMER: t('ID INTEGER, NAME TEXT, COUNTRY TEXT, AGE INTEGER',
        [[1, 'Anh', 'Vietnam', 24], [2, 'Bishal', 'Nepal', 31], [3, 'Chen', 'China', 28], [4, 'Dung', 'Vietnam', 35], [5, 'Emi', 'Japan', 22]],
        [[6, 'Farid', 'Nepal', 41], [7, 'Gita', 'Nepal', 19], [8, 'Hiro', 'Japan', 30], [9, 'Ivan', 'Bangladesh', 27]]) },
    sql: 'SELECT DISTINCT COUNTRY FROM CUSTOMER ORDER BY COUNTRY;' },
  { id: 'sel4', area: 'sel', tables: {
      STUDENT: t('ID INTEGER, NAME TEXT, SCORE INTEGER',
        [[1, 'Aung', 72], [2, 'Bina', 95], [3, 'Carlos', 88], [4, 'Devi', 64], [5, 'Eka', 91]],
        [[6, 'Fatima', 95], [7, 'Gopal', 91], [8, 'Hana', 80]]) },
    sql: 'SELECT NAME, SCORE FROM STUDENT ORDER BY SCORE DESC, ID LIMIT 3;' },

  /* ---------- relationships between tables (JOIN) ---------- */
  { id: 'rel0', area: 'rel', ex: true, tables: {
      CUSTOMERS: t('ID INTEGER, NAME TEXT, CITY TEXT',
        [[1, 'Ravi', 'Tokyo'], [2, 'Linh', 'Osaka'], [3, 'Nimal', 'Tokyo']],
        [[4, 'Zaw', 'Nagoya']]),
      ORDERS: t('ID INTEGER, CUSTOMER_ID INTEGER, AMOUNT INTEGER',
        [[101, 1, 250], [102, 2, 80], [103, 3, 120], [104, 1, 60], [105, 2, 300]],
        [[106, 4, 100], [107, 4, 101], [108, 3, 999]]) },
    sql: 'SELECT C.NAME, O.AMOUNT FROM ORDERS O INNER JOIN CUSTOMERS C ON O.CUSTOMER_ID = C.ID WHERE O.AMOUNT > 100 ORDER BY O.ID;' },
  { id: 'rel1', area: 'rel', tables: {
      ADVISOR: t('ID INTEGER, NAME TEXT',
        [[1, 'Dr. Sato'], [2, 'Dr. Khan'], [3, 'Dr. Silva']],
        [[4, 'Dr. Ito']]),
      STUDENT: t('ID INTEGER, NAME TEXT, ADVISOR_ID INTEGER',
        [[1, 'Prakash', 2], [2, 'Mai', 1], [3, 'Kasun', 2], [4, 'Wei', 3]],
        [[5, 'Ayu', null], [6, 'Bao', 4], [7, 'Arjun', 1]]) },
    sql: 'SELECT S.NAME, A.NAME FROM STUDENT S INNER JOIN ADVISOR A ON S.ADVISOR_ID = A.ID ORDER BY S.NAME;' },
  { id: 'rel2', area: 'rel', tables: {
      DEPARTMENT: t('ID INTEGER, NAME TEXT',
        [[1, 'Sales'], [2, 'IT'], [3, 'Legal'], [4, 'Design']],
        [[5, 'Audit'], [6, 'Research']]),
      EMPLOYEE: t('ID INTEGER, NAME TEXT, DEPT_ID INTEGER',
        [[1, 'Aiko', 1], [2, 'Binod', 2], [3, 'Cuong', 2], [4, 'Dewi', 1]],
        [[5, 'Elif', 6], [6, 'Faisal', null]]) },
    sql: 'SELECT D.NAME FROM DEPARTMENT D LEFT JOIN EMPLOYEE E ON E.DEPT_ID = D.ID WHERE E.ID IS NULL ORDER BY D.NAME;' },
  { id: 'rel3', area: 'rel', tables: {
      AUTHOR: t('ID INTEGER, NAME TEXT, COUNTRY TEXT',
        [[1, 'Ann Lee', 'UK'], [2, 'Raj Patel', 'India'], [3, 'Tom Hart', 'UK']],
        [[4, 'Sue Park', 'UK']]),
      BOOK: t('ID INTEGER, TITLE TEXT, AUTHOR_ID INTEGER, YEAR INTEGER',
        [[1, 'Blue Sea', 1, 1998], [2, 'Rain Song', 1, 2005], [3, 'Spice Road', 2, 2010], [4, 'Cold Hill', 3, 2003], [5, 'Night Bus', 3, 2019]],
        [[6, 'Apple Tree', 4, 2005], [7, 'Old Map', 4, 2000], [8, 'Gold Dust', 2, 2001]]) },
    sql: "SELECT B.TITLE FROM BOOK B INNER JOIN AUTHOR A ON B.AUTHOR_ID = A.ID WHERE A.COUNTRY = 'UK' AND B.YEAR > 2000 ORDER BY B.YEAR, B.TITLE;" },
  { id: 'rel4', area: 'rel', tables: {
      PRODUCT: t('ID INTEGER, NAME TEXT, PRICE INTEGER',
        [[1, 'Tea', 300], [2, 'Rice', 1200], [3, 'Noodles', 250]],
        [[4, 'Oil', 500]]),
      SALE: t('ID INTEGER, PRODUCT_ID INTEGER, QTY INTEGER',
        [[1, 1, 2], [2, 2, 1], [3, 3, 5], [4, 1, 4], [5, 2, 3]],
        [[6, 4, 2], [7, 3, 3], [8, 4, 1]]) },
    sql: 'SELECT S.ID, P.NAME, P.PRICE * S.QTY FROM SALE S INNER JOIN PRODUCT P ON S.PRODUCT_ID = P.ID WHERE P.PRICE * S.QTY >= 1000 ORDER BY S.ID;' },

  /* ---------- aggregation (GROUP BY) ---------- */
  { id: 'agg0', area: 'agg', ex: true, tables: {
      EMPLOYEE: t('ID INTEGER, NAME TEXT, DEPT TEXT, SALARY INTEGER',
        [[1, 'Asha', 'IT', 4200], [2, 'Bui', 'Sales', 3100], [3, 'Chamari', 'IT', 3900], [4, 'Dipak', 'HR', 3000], [5, 'Eiko', 'Sales', 3400], [6, 'Faruk', 'IT', 4000]],
        [[7, 'Gina', 'HR', 3333], [8, 'Hasan', 'Legal', 5000]]) },
    sql: 'SELECT DEPT, COUNT(*), ROUND(AVG(SALARY), 2) FROM EMPLOYEE GROUP BY DEPT ORDER BY DEPT;' },
  { id: 'agg1', area: 'agg', tables: {
      CITY: t('ID INTEGER, NAME TEXT, COUNTRY TEXT, POPULATION INTEGER',
        [[1, 'Tokyo', 'JPN', 14000000], [2, 'Osaka', 'JPN', 2750000], [3, 'Pokhara', 'NPL', 520000], [4, 'Kathmandu', 'NPL', 1570000], [5, 'Hue', 'VNM', 650000], [6, 'Hanoi', 'VNM', 8000000]],
        [[7, 'Biratnagar', 'NPL', 2910000], [8, 'Colombo', 'LKA', 750000], [9, 'Kandy', 'LKA', 4260000]]) },
    sql: 'SELECT COUNTRY, SUM(POPULATION) FROM CITY GROUP BY COUNTRY HAVING SUM(POPULATION) > 5000000 ORDER BY SUM(POPULATION) DESC;' },
  { id: 'agg2', area: 'agg', tables: {
      ORDERS: t('ID INTEGER, CUSTOMER_ID INTEGER, AMOUNT INTEGER',
        [[1, 7, 100], [2, 3, 250], [3, 7, 80], [4, 5, 60], [5, 7, 300], [6, 3, 40], [7, 3, 90], [8, 5, 20]],
        [[9, 5, 70], [10, 9, 10], [11, 9, 20], [12, 9, 30], [13, 9, 40]]) },
    sql: 'SELECT CUSTOMER_ID, COUNT(*) FROM ORDERS GROUP BY CUSTOMER_ID HAVING COUNT(*) >= 3 ORDER BY COUNT(*) DESC, CUSTOMER_ID;' },
  { id: 'agg3', area: 'agg', tables: {
      STUDENT: t('ID INTEGER, NAME TEXT, CLASS TEXT, SCORE INTEGER',
        [[1, 'Anil', 'A', 78], [2, 'Bella', 'B', 91], [3, 'Chris', 'A', 85], [4, 'Duc', 'B', 66], [5, 'Ema', 'A', 59]],
        [[6, 'Fahim', 'C', 70], [7, 'Gwen', 'B', 100], [8, 'Hari', 'A', null]]) },
    sql: 'SELECT CLASS, MAX(SCORE), MIN(SCORE) FROM STUDENT GROUP BY CLASS ORDER BY CLASS;' },
  { id: 'agg4', area: 'agg', tables: {
      PRODUCT: t('ID INTEGER, NAME TEXT, CATEGORY TEXT',
        [[1, 'Green Tea', 'Drink'], [2, 'Coffee', 'Drink'], [3, 'Rice', 'Food'], [4, 'Soap', 'Daily']],
        [[5, 'Bread', 'Food'], [6, 'Towel', 'Daily'], [7, 'Juice', 'Drink']]),
      SALE: t('ID INTEGER, PRODUCT_ID INTEGER, QTY INTEGER',
        [[1, 1, 3], [2, 2, 5], [3, 3, 2], [4, 1, 1]],
        [[5, 5, 7], [6, 3, 3], [7, 7, 1]]) },
    sql: 'SELECT P.CATEGORY, SUM(S.QTY) FROM SALE S INNER JOIN PRODUCT P ON S.PRODUCT_ID = P.ID GROUP BY P.CATEGORY ORDER BY SUM(S.QTY) DESC, P.CATEGORY;' },

  /* ---------- the mock test: one of m1–m3 (query / join) + one of m4–m6 (aggregation) ---------- */
  { id: 'm1', area: 'rel', mock: 1, tables: {
      COUNTRY: t('CODE TEXT, NAME TEXT',
        [['NP', 'Nepal'], ['VN', 'Vietnam'], ['LK', 'Sri Lanka'], ['MM', 'Myanmar']],
        [['BD', 'Bangladesh'], ['ID', 'Indonesia']]),
      MEMBER: t('ID INTEGER, NAME TEXT, COUNTRY_CODE TEXT',
        [[1, 'Sita', 'NP'], [2, 'Tuan', 'VN'], [3, 'Kamal', 'LK'], [4, 'Hla', 'MM']],
        [[5, 'Rahim', 'BD'], [6, 'Jo', 'XX'], [7, 'Putri', 'ID']]) },
    sql: 'SELECT M.NAME, C.NAME FROM MEMBER M INNER JOIN COUNTRY C ON M.COUNTRY_CODE = C.CODE ORDER BY M.ID;' },
  { id: 'm2', area: 'rel', mock: 1, tables: {
      STAFF: t('ID INTEGER, NAME TEXT, MANAGER_ID INTEGER',
        [[1, 'Yuki', null], [2, 'Arun', 1], [3, 'Bich', 1], [4, 'Chathura', 2]],
        [[5, 'Daw', 4], [6, 'Eko', 3], [7, 'Fumi', null]]) },
    sql: 'SELECT E.NAME, M.NAME FROM STAFF E INNER JOIN STAFF M ON E.MANAGER_ID = M.ID ORDER BY E.ID;' },
  { id: 'm3', area: 'sel', mock: 1, tables: {
      ITEM: t('ID INTEGER, NAME TEXT, PRICE INTEGER, STOCK INTEGER',
        [[1, 'Cable', 120, 10], [2, 'Charger', 480, 0], [3, 'Case', 300, 4], [4, 'Speaker', 900, 2], [5, 'Stand', 100, 7]],
        [[6, 'Adapter', 500, 1], [7, 'Battery', 300, 9], [8, 'Film', 99, 50]]) },
    sql: 'SELECT NAME, PRICE FROM ITEM WHERE PRICE BETWEEN 100 AND 500 AND STOCK > 0 ORDER BY PRICE, NAME;' },
  { id: 'm4', area: 'agg', mock: 2, tables: {
      STUDENT: t('ID INTEGER, NAME TEXT', [[1, 'Ana'], [2, 'Bikash'], [3, 'Chau']], [[4, 'Dilan']]),
      RESULT: t('STUDENT_ID INTEGER, SUBJECT TEXT, SCORE INTEGER',
        [[1, 'Math', 90], [1, 'SQL', 80], [2, 'Math', 70], [2, 'SQL', 75], [3, 'Math', 88], [3, 'SQL', 95]],
        [[4, 'Math', 80], [4, 'SQL', 79], [2, 'Python', 100]]) },
    sql: 'SELECT S.NAME, ROUND(AVG(R.SCORE), 1) FROM STUDENT S INNER JOIN RESULT R ON R.STUDENT_ID = S.ID GROUP BY S.ID, S.NAME HAVING AVG(R.SCORE) >= 80 ORDER BY AVG(R.SCORE) DESC, S.NAME;' },
  { id: 'm5', area: 'agg', mock: 2, tables: {
      ORDERS: t('ID INTEGER, CUSTOMER TEXT, CITY TEXT, AMOUNT INTEGER',
        [[1, 'A', 'Tokyo', 500], [2, 'B', 'Osaka', 300], [3, 'C', 'Tokyo', 700], [4, 'D', 'Kyoto', 1200], [5, 'E', 'Osaka', 400]],
        [[6, 'F', 'Osaka', 300], [7, 'G', 'Nara', 999], [8, 'H', 'Nara', 1]]) },
    sql: 'SELECT CITY, COUNT(*), SUM(AMOUNT) FROM ORDERS GROUP BY CITY HAVING SUM(AMOUNT) >= 1000 ORDER BY CITY;' },
  { id: 'm6', area: 'agg', mock: 2, tables: {
      TEAM: t('ID INTEGER, NAME TEXT', [[1, 'Falcons'], [2, 'Tigers'], [3, 'Wolves']], [[4, 'Eagles']]),
      PLAYER: t('ID INTEGER, NAME TEXT, TEAM_ID INTEGER, GOALS INTEGER',
        [[1, 'Kiran', 1, 5], [2, 'Leo', 2, 3], [3, 'Min', 1, 2], [4, 'Nuwan', 2, 4]],
        [[5, 'Omid', 4, 0], [6, 'Pema', 3, null]]) },
    sql: 'SELECT T.NAME, COALESCE(SUM(P.GOALS), 0) FROM TEAM T LEFT JOIN PLAYER P ON P.TEAM_ID = T.ID GROUP BY T.ID, T.NAME ORDER BY COALESCE(SUM(P.GOALS), 0) DESC, T.NAME;' }
];
export const HR_BY_ID = Object.fromEntries(HR_PROBLEMS.map(p => [p.id, p]));
/** the drill of an area: the example first, then the practice problems */
export const hrDrill = area => HR_PROBLEMS.filter(p => p.area === area && !p.mock).sort((a, b) => (b.ex ? 1 : 0) - (a.ex ? 1 : 0));
export const HR_MOCK = [HR_PROBLEMS.filter(p => p.mock === 1), HR_PROBLEMS.filter(p => p.mock === 2)];
/** a mock test: one problem from each group, picked with `rnd` (0 ≤ rnd < 1) */
export const hrMockPick = (r1, r2) => [HR_MOCK[0][Math.floor(r1 * HR_MOCK[0].length) % HR_MOCK[0].length].id, HR_MOCK[1][Math.floor(r2 * HR_MOCK[1].length) % HR_MOCK[1].length].id];

/* ---------- databases ---------- */
const lit = v => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
export function hrSetupSQL(prob, hidden) {
  return Object.entries(prob.tables).map(([name, tb]) => {
    const rows = hidden ? tb.rows.concat(tb.extra) : tb.rows;
    return `CREATE TABLE ${name} (${tb.cols});` + (rows.length ? `INSERT INTO ${name} VALUES ${rows.map(r => `(${r.map(lit).join(', ')})`).join(', ')};` : '');
  }).join('\n');
}
/** column names of each table (for the editor's autocomplete and the table view) */
export const hrSchema = prob => Object.fromEntries(Object.entries(prob.tables).map(([n, tb]) => [n, tb.cols.split(',').map(c => c.trim().split(/\s+/)[0])]));

/** MySQL functions students may write (the real test is usually MySQL), added to SQLite */
function addMySql(db) {
  const fn = (name, f, n) => { if (n === -1) Object.defineProperty(f, 'length', { value: -1 }); db.create_function(name, f); };
  fn('CONCAT', (...a) => (a.some(v => v === null) ? null : a.map(String).join('')), -1);
  fn('IF', (c, a, b) => (c && c !== '0' ? a : b));
  fn('LEFT', (s, n) => (s === null ? null : String(s).slice(0, Math.max(0, n))));
  fn('RIGHT', (s, n) => (s === null ? null : n > 0 ? String(s).slice(-n) : ''));
  fn('TRUNCATE', (x, d) => (x === null ? null : Math.trunc(x * 10 ** d) / 10 ** d));
}
const dbs = new Map();   // "<id>|s" or "<id>|h" → Database
function dbOf(SQL, prob, hidden) {
  const k = prob.id + (hidden ? '|h' : '|s');
  if (!dbs.has(k)) { const db = new SQL.Database(); addMySql(db); db.run(hrSetupSQL(prob, hidden)); dbs.set(k, db); }
  return dbs.get(k);
}
const FORBID = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|REINDEX|ANALYZE)\b/i;
/** Run a student's SELECT. Throws Error with .code 'empty' | 'onlySelect', or SQLite's message. */
export function hrRun(SQL, prob, sql, hidden) {
  const clean = stripLiterals(sql || '').replace(/--[^\n]*/g, ' ').trim();
  if (!clean.replace(/;/g, '').trim()) { const e = new Error('empty'); e.code = 'empty'; throw e; }
  if (FORBID.test(clean)) { const e = new Error('onlySelect'); e.code = 'onlySelect'; throw e; }
  const res = dbOf(SQL, prob, hidden).exec(sql);
  return res.length ? res[res.length - 1] : { columns: [], values: [] };
}
/** the reference answer's result */
export const hrExpected = (SQL, prob, hidden) => { const r = dbOf(SQL, prob, hidden).exec(prob.sql); return r.length ? r[r.length - 1] : { columns: [], values: [] }; };
/**
 * Check a student's answer on one data set. → { ok, grade, res, err }
 * Like HackerRank, only the values (and their order when the problem asks for an order) count; column names do not.
 */
export function hrCase(SQL, prob, sql, hidden) {
  let res;
  try { res = hrRun(SQL, prob, sql, hidden); } catch (e) { return { ok: false, err: e.code || e.message }; }
  const exp = hrExpected(SQL, prob, hidden);
  const g = grade(res, exp, topOrderBy(prob.sql), sql);
  return { ok: !!g.ok, grade: g, res };
}
/** both test cases: [sample, hidden] */
export const hrSubmit = (SQL, prob, sql) => [hrCase(SQL, prob, sql, false), hrCase(SQL, prob, sql, true)];

/* ---------- progress: S.progress.hr = { ok: [ids], mock: [{ at, ids, pts, ms }] } ---------- */
export const hrRec = p => (p.hr = Object.assign({ ok: [], mock: [] }, p.hr));
export function hrMerge(a, b) {
  if (!a || !b) return a || b;
  const mock = [...(a.mock || []), ...(b.mock || [])].filter((m, i, all) => all.findIndex(x => x.at === m.at) === i).sort((x, y) => x.at - y.at).slice(-30);
  return { ok: [...new Set([...(a.ok || []), ...(b.ok || [])])], mock };
}
