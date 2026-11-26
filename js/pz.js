/* =========================================================
 * pz.js — practice for the paiza SQL skill check (paiza 対策): Japanese problems from everyday
 * business, in 5 levels of this app (Lv.1 basic queries … Lv.5 analysis with window functions).
 * Checked like hr.js: the sample rows, then the sample + `extra` rows the student never sees.
 * Texts: pz.p.<id>.t (title), pz.p.<id>.d (problem), pz.p.<id>.how (examples only). ja.js holds the original.
 *
 * ── To add a problem ── copy one of the same level, give it a new id (pz<level><letter>),
 *    add pz.p.<id>.t / .d to every language file, run  cd tools-next && node check.mjs
 * ========================================================= */
import { hrCase, hrSubmit, hrExpected, hrSchema } from './hr.js';
export { hrCase as pzCase, hrSubmit as pzSubmit, hrExpected as pzExpected, hrSchema as pzSchema };

export const PZ_LEVELS = [1, 2, 3, 4, 5];
const t = (cols, rows, extra) => ({ cols, rows, extra: extra || [] });

export const PZ_PROBLEMS = [
  /* ---------- Lv.1 basic queries ---------- */
  { id: 'pz1e', lv: 1, ex: true, tables: {
      menu: t('id INTEGER, name TEXT, category TEXT, price INTEGER',
        [[1, 'ブレンドコーヒー', 'drink', 380], [2, 'カフェラテ', 'drink', 450], [3, 'チーズケーキ', 'food', 420], [4, '紅茶', 'drink', 350], [5, 'サンドイッチ', 'food', 500]],
        [[6, 'オレンジジュース', 'drink', 400], [7, 'ほうじ茶', 'drink', 350], [8, 'クッキー', 'food', 200]]) },
    sql: "SELECT name, price FROM menu WHERE category = 'drink' AND price <= 400 ORDER BY price, id;" },
  { id: 'pz1a', lv: 1, tables: {
      members: t('id INTEGER, name TEXT, pref TEXT, age INTEGER',
        [[1, 'リン', '東京都', 24], [2, 'アマル', '大阪府', 31], [3, 'ソー', '東京都', 35], [4, 'ハナ', '神奈川県', 22], [5, 'ビカシュ', '東京都', 28]],
        [[6, 'ミン', '東京都', 35], [7, 'トゥアン', '東京都府', 40], [8, 'サラ', '大阪府', 50]]) },
    sql: "SELECT name, age FROM members WHERE pref = '東京都' ORDER BY age DESC, id;" },
  { id: 'pz1b', lv: 1, tables: {
      products: t('id INTEGER, name TEXT, stock INTEGER',
        [[1, 'ノート', 12], [2, 'ボールペン', 0], [3, '消しゴム', 5], [4, 'はさみ', 0], [5, 'のり', 3]],
        [[6, 'ホチキス', 0], [7, '定規', null], [8, 'ふせん', 1]]) },
    sql: 'SELECT id, name FROM products WHERE stock = 0 ORDER BY id;' },
  { id: 'pz1c', lv: 1, tables: {
      sales: t('id INTEGER, item TEXT, amount INTEGER, sold_on TEXT',
        [[1, 'テレビ', 52000, '2026-10-30'], [2, '冷蔵庫', 88000, '2026-11-02'], [3, '電子レンジ', 23000, '2026-11-05'], [4, '洗濯機', 64000, '2026-11-11'], [5, '掃除機', 31000, '2026-11-20']],
        [[6, 'エアコン', 99000, '2026-12-01'], [7, 'ドライヤー', 64000, '2026-11-30'], [8, 'ケトル', 4000, '2026-11-01']]) },
    sql: "SELECT item, amount FROM sales WHERE sold_on BETWEEN '2026-11-01' AND '2026-11-30' ORDER BY amount DESC, id LIMIT 3;" },

  /* ---------- Lv.2 conditions and aggregation ---------- */
  { id: 'pz2e', lv: 2, ex: true, tables: {
      orders: t('id INTEGER, customer TEXT, store TEXT, amount INTEGER',
        [[1, 'A', 'シンジュク', 1200], [2, 'B', 'シブヤ', 800], [3, 'C', 'シンジュク', 1500], [4, 'D', 'イケブクロ', 2000], [5, 'E', 'シブヤ', 900]],
        [[6, 'F', 'ウエノ', 300], [7, 'G', 'イケブクロ', 700], [8, 'H', 'ウエノ', 2400]]) },
    sql: 'SELECT store, COUNT(*), SUM(amount) FROM orders GROUP BY store ORDER BY SUM(amount) DESC, store;' },
  { id: 'pz2a', lv: 2, tables: {
      survey: t('id INTEGER, age_group TEXT, score INTEGER',
        [[1, '20代', 4], [2, '30代', 5], [3, '20代', 3], [4, '20代', 5], [5, '30代', 2], [6, '40代', 4], [7, '30代', 4]],
        [[8, '40代', 5], [9, '50代', 3], [10, '40代', 3], [11, '20代', 4]]) },
    sql: 'SELECT age_group, ROUND(AVG(score), 1) FROM survey GROUP BY age_group HAVING COUNT(*) >= 3 ORDER BY age_group;' },
  { id: 'pz2b', lv: 2, tables: {
      attendance: t('student TEXT, day TEXT, status TEXT',
        [['マイ', '11-04', '欠席'], ['マイ', '11-05', '出席'], ['ラフル', '11-04', '欠席'], ['ラフル', '11-05', '欠席'], ['ラフル', '11-06', '遅刻'], ['ケン', '11-04', '出席'], ['マイ', '11-06', '欠席']],
        [['ケン', '11-05', '遅刻'], ['ケン', '11-06', '遅刻'], ['ジョン', '11-04', '欠席'], ['ジョン', '11-05', '欠席']]) },
    sql: "SELECT student, COUNT(*) FROM attendance WHERE status = '欠席' GROUP BY student HAVING COUNT(*) >= 2 ORDER BY COUNT(*) DESC, student;" },
  { id: 'pz2c', lv: 2, tables: {
      products: t('id INTEGER, name TEXT, category TEXT, price INTEGER',
        [[1, '米 5kg', '食品', 2400], [2, 'みそ', '食品', 400], [3, '洗剤', '日用品', 380], [4, 'タオル', '日用品', 900], [5, 'しょうゆ', '食品', 300]],
        [[6, '電池', '電気', 600], [7, 'ティッシュ', '日用品', 380]]) },
    sql: 'SELECT category, MAX(price) - MIN(price) FROM products GROUP BY category ORDER BY MAX(price) - MIN(price) DESC;' },

  /* ---------- Lv.3 joining tables ---------- */
  { id: 'pz3e', lv: 3, ex: true, tables: {
      rooms: t('id INTEGER, room_type TEXT, price INTEGER',
        [[1, 'シングル', 6000], [2, 'ツイン', 10000], [3, 'スイート', 30000]], []),
      bookings: t('id INTEGER, room_id INTEGER, guest TEXT, nights INTEGER',
        [[1, 2, 'ナム', 2], [2, 1, 'リサ', 3], [3, 3, 'アジト', 1], [4, 1, 'ホア', 1]],
        [[5, 2, 'カマル', 4], [6, 9, 'ゆうき', 2]]) },
    sql: 'SELECT b.id, b.guest, r.room_type, r.price * b.nights FROM bookings b INNER JOIN rooms r ON b.room_id = r.id ORDER BY b.id;' },
  { id: 'pz3a', lv: 3, tables: {
      departments: t('id INTEGER, name TEXT', [[1, '営業部'], [2, '開発部'], [3, '総務部']], [[4, '広報部']]),
      employees: t('id INTEGER, name TEXT, dept_id INTEGER',
        [[1, 'サト', 1], [2, 'グエン', 2], [3, 'シン', 2], [4, 'タパ', 1], [5, 'リー', 3]],
        [[6, 'ペレラ', 2], [7, 'ハン', null]]) },
    sql: 'SELECT d.name, COUNT(e.id) FROM departments d LEFT JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY d.id;' },
  { id: 'pz3b', lv: 3, tables: {
      customers: t('id INTEGER, name TEXT', [[1, 'アン'], [2, 'ビン'], [3, 'チャン'], [4, 'デビ']], [[5, 'エマ'], [6, 'ファハド']]),
      orders: t('id INTEGER, customer_id INTEGER, amount INTEGER',
        [[1, 1, 500], [2, 3, 1200], [3, 1, 800]],
        [[4, 5, 300], [5, null, 100]]) },
    sql: 'SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.id;' },
  { id: 'pz3c', lv: 3, tables: {
      students: t('id INTEGER, name TEXT', [[1, 'アイ'], [2, 'ボル'], [3, 'チー'], [4, 'ディン']], [[5, 'エカ']]),
      courses: t('id INTEGER, title TEXT', [[1, 'SQL入門'], [2, 'Python入門'], [3, '統計']], []),
      enrollments: t('student_id INTEGER, course_id INTEGER',
        [[1, 1], [1, 2], [2, 2], [3, 1], [4, 3]],
        [[5, 1], [2, 3]]) },
    sql: "SELECT s.name FROM students s INNER JOIN enrollments e ON e.student_id = s.id INNER JOIN courses c ON e.course_id = c.id WHERE c.title = 'SQL入門' ORDER BY s.name;" },

  /* ---------- Lv.4 subqueries and CASE ---------- */
  { id: 'pz4e', lv: 4, ex: true, tables: {
      products: t('id INTEGER, name TEXT, price INTEGER',
        [[1, 'イヤホン', 3000], [2, 'マウス', 2000], [3, 'キーボード', 5000], [4, 'モニター', 22000], [5, 'USBメモリ', 1000]],
        [[6, 'Webカメラ', 6000], [7, 'ケーブル', 600]]) },
    sql: 'SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products) ORDER BY price DESC, id;' },
  { id: 'pz4a', lv: 4, tables: {
      scores: t('id INTEGER, name TEXT, score INTEGER',
        [[1, 'ラム', 92], [2, 'リン', 61], [3, 'ゴック', 45], [4, 'アキ', 78], [5, 'ニマル', 80]],
        [[6, 'サンジャ', 60], [7, 'トム', 59], [8, 'ユウ', 100]]) },
    sql: "SELECT name, CASE WHEN score >= 80 THEN 'A' WHEN score >= 60 THEN 'B' ELSE 'C' END FROM scores ORDER BY id;" },
  { id: 'pz4b', lv: 4, tables: {
      orders: t('id INTEGER, customer TEXT, amount INTEGER',
        [[1, 'ヤマダ', 3000], [2, 'グリーン', 5000], [3, 'ヤマダ', 4000], [4, 'アオゾラ', 2000], [5, 'グリーン', 1000]],
        [[6, 'アオゾラ', 5000], [7, 'ミナト', 6999]]) },
    sql: 'SELECT customer, SUM(amount) FROM orders GROUP BY customer HAVING SUM(amount) = (SELECT MAX(s) FROM (SELECT SUM(amount) AS s FROM orders GROUP BY customer) x) ORDER BY customer;' },
  { id: 'pz4c', lv: 4, tables: {
      employees: t('id INTEGER, name TEXT, dept TEXT, salary INTEGER',
        [[1, 'アヤ', '営業', 300], [2, 'ビン', '営業', 260], [3, 'チャマリ', '開発', 420], [4, 'ディル', '開発', 380], [5, 'エミ', '営業', 280]],
        [[6, 'フオン', '総務', 250], [7, 'ゴパル', '開発', 400], [8, 'ハルカ', '総務', 270]]) },
    sql: 'SELECT name, dept FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees x WHERE x.dept = e.dept) ORDER BY id;' },

  /* ---------- Lv.5 analysis (window functions) ---------- */
  { id: 'pz5e', lv: 5, ex: true, tables: {
      monthly: t('month TEXT, amount INTEGER',
        [['2026-06', 120], ['2026-07', 150], ['2026-08', 90], ['2026-09', 200]],
        [['2026-10', 160], ['2026-05', 100]]) },
    sql: 'SELECT month, amount, SUM(amount) OVER (ORDER BY month) FROM monthly ORDER BY month;' },
  { id: 'pz5a', lv: 5, tables: {
      scores: t('id INTEGER, name TEXT, class TEXT, score INTEGER',
        [[1, 'アン', 'A', 80], [2, 'ボビ', 'A', 92], [3, 'チャ', 'B', 75], [4, 'ダン', 'B', 88], [5, 'エル', 'A', 70]],
        [[6, 'ファ', 'A', 92], [7, 'ギタ', 'B', 75], [8, 'ハオ', 'C', 60]]) },
    sql: 'SELECT class, name, RANK() OVER (PARTITION BY class ORDER BY score DESC) AS r FROM scores ORDER BY class, r, name;' },
  { id: 'pz5b', lv: 5, tables: {
      monthly: t('month TEXT, amount INTEGER',
        [['2026-07', 150], ['2026-08', 90], ['2026-09', 200], ['2026-10', 160]],
        [['2026-06', 120], ['2026-11', 160]]) },
    sql: 'SELECT month, amount - LAG(amount) OVER (ORDER BY month) FROM monthly ORDER BY month;' },
  { id: 'pz5c', lv: 5, tables: {
      sales: t('id INTEGER, category TEXT, amount INTEGER',
        [[1, '食品', 300], [2, '飲料', 200], [3, '食品', 200], [4, '日用品', 300]],
        [[5, '飲料', 100], [6, '雑貨', 50], [7, '日用品', 150]]) },
    sql: 'SELECT category, SUM(amount), ROUND(SUM(amount) * 100.0 / (SELECT SUM(amount) FROM sales), 1) FROM sales GROUP BY category ORDER BY SUM(amount) DESC, category;' }
];
export const PZ_BY_ID = Object.fromEntries(PZ_PROBLEMS.map(p => [p.id, p]));
/** a level: the example first, then the practice problems */
export const pzLevel = lv => PZ_PROBLEMS.filter(p => p.lv === lv).sort((a, b) => (b.ex ? 1 : 0) - (a.ex ? 1 : 0));
/** the practice problems of a level (they decide whether the level is cleared) */
export const pzCheckIds = lv => pzLevel(lv).filter(p => !p.ex).map(p => p.id);

/* ---------- progress: S.progress.pz = { ok: [ids] } ---------- */
export const pzRec = p => (p.pz = Object.assign({ ok: [] }, p.pz));
export const pzCleared = (ok, lv) => pzCheckIds(lv).every(id => ok.includes(id));
/** the level reached: the highest level with every level up to it cleared (0 = none yet) */
export const pzReached = ok => { let n = 0; for (const lv of PZ_LEVELS) { if (!pzCleared(ok, lv)) break; n = lv; } return n; };
