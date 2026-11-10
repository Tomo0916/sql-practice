/* =========================================================
 * lectures-b.js — lectures in the new form, Lessons 12–18
 * (INSERT / UPDATE / DELETE, aggregate functions, GROUP BY, HAVING).
 *
 * Same shape as lectures-a.js: scene → syntax → animation → every
 * pattern the problems use (covers: topics of lecture-topics.js) →
 * common mistakes → a quiz → summary → to the example.
 * Tables are computed from the data (products), never typed.
 * ========================================================= */
import { T3, state, checked, after, removed } from './lecture-kit.js';

const ALL = 'SELECT id, name, category, price FROM products;';
const FULL = 'SELECT * FROM products;';
const R = (sql, opts) => e => state(e, sql, opts);
const pickRows = (ids, opts = {}) => e => state(e, FULL, Object.assign({ cls: v => (ids.includes(v[0]) ? 'pick' : '') }, opts));
const one = (e, sql) => e.exec(sql).values[0][0];
const rowsLeft = (e, sql) => { const r = e.exec(sql); return r ? r.values.length : 0; };
/** the table after INSERT / UPDATE (new and changed rows are picked out), and before DELETE (✕ = the rows that go) */
const AF = (dml, hl) => e => after(e, dml, 'products', { hl: hl || [] });
const RM = (dml, hl) => e => removed(e, dml, 'products', { hl: hl || [] });

/* ---- groups: one colour per category ---- */
const CATS = ['Books', 'Clothing', 'Electronics', 'Kitchen'];
const byCat = (cols, where) => e => state(e, `SELECT id, name, category, ${cols} FROM products${where ? ` WHERE ${where}` : ''} ORDER BY category, id;`,
  { hide: ['id'], hl: ['category'], cls: v => 'g' + CATS.indexOf(v[2]) });
const idToCat = e => Object.fromEntries(e.exec('SELECT id, category FROM products;').values.map(([id, c]) => [String(id), c]));
/**
 * one row per category with its aggregates (AVG is rounded to 1 place on the screen);
 * with a HAVING condition every group is checked (✓ kept / ✕ removed); where = rows kept before grouping
 */
const G = (aggs, having, where) => e => {
  const w = where ? ` WHERE ${where}` : '';
  const sel = aggs.map(a => (/^AVG/.test(a) ? `ROUND(${a}, 1) AS "${a}"` : a)).join(', ');
  const hit = having ? e.exec(`SELECT category FROM products${w} GROUP BY category HAVING ${having};`) : null;
  const ok = new Set((hit ? hit.values : []).map(v => v[0]));
  return state(e, `SELECT category, ${sel} FROM products${w} GROUP BY category ORDER BY category;`,
    { hl: having ? aggs : [], cls: v => (having ? (ok.has(v[0]) ? 'pass' : 'fail') : 'g' + CATS.indexOf(v[0])) });
};
/** every row moves into the single row of a total */
const toOne = sql => e => { const k = String(one(e, sql)); return Object.fromEntries(e.exec('SELECT id FROM products;').values.map(([id]) => [String(id), k])); };

const INS_ALL = "INSERT INTO products (id, name, category, price, stock, release_year)\nVALUES (11, 'USB Cable', 'Electronics', 800, 100, 2024);";
const INS_SOME = "INSERT INTO products (id, name, category, price)\nVALUES (11, 'USB Cable', 'Electronics', 800);";
const UPD_ONE = 'UPDATE products\nSET price = 1200\nWHERE id = 1;';
const UPD_MANY = "UPDATE products\nSET price = price + 500\nWHERE category = 'Books';";
const DEL = 'DELETE FROM products\nWHERE stock < 15;';
const WH = 'SELECT category, COUNT(*)\nFROM products\nWHERE release_year >= 2020\nGROUP BY category\nHAVING COUNT(*) >= 2;';

export const LECT_B = {
  /* ------------------------------------------------ Lesson 12 */
  insert: {
    goal: T3('Add a new row to a table.', '表に新しい行を追加する。', '{表|ひょう}に {新|あたら}しい {行|ぎょう}を {追加|ついか}する。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“A new product arrived: USB Cable. Please add it to the list.”', '「新商品の USB Cable が入った。一覧に追加しておいて。」', '「{新|あたら}しい しょうひんの USB Cable が {入|はい}った。いちらんに {追加|ついか}して おいて。」'),
        table: R(FULL) },
      { type: 'syntax', notes: [
        T3('INSERT INTO table (columns) VALUES (values): one new row.', 'INSERT INTO テーブル (列) VALUES (値)：新しい行を 1 行追加する。', 'INSERT INTO テーブル ({列|れつ}) VALUES ({値|あたい})：{新|あたら}しい {行|ぎょう}を 1{行|ぎょう} {追加|ついか}する。'),
        T3('The values are in the same order as the columns: 1st value → 1st column.', '値は、列と同じ順番で書く。1 番目の値は 1 番目の列に入る。', '{値|あたい}は、{列|れつ}と おなじ じゅんばんで {書|か}く。1ばんめの {値|あたい}は 1ばんめの {列|れつ}に {入|はい}る。'),
        T3("Numbers as they are, text in ' '.", "数字はそのまま、文字は ' ' で囲む。", "{数字|すうじ}は そのまま、{文字|もじ}は ' ' で かこむ。")] },
      { type: 'anim', title: T3('What INSERT does', 'INSERT がすること', 'INSERT が すること'), frames: [
        { cap: T3('products has 10 rows now.', 'いま、products には 10 行ある。', 'いま、products には 10{行|ぎょう} ある。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products', table: R(FULL) },
        { cap: T3('First say where each value goes: the names of the columns.', 'まず、どの列に入れるかを書く：列の名前。', 'まず、どの {列|れつ}に {入|い}れるかを {書|か}く：{列|れつ}の {名前|なまえ}。'), sql: INS_ALL, mark: '(id, name, category, price, stock, release_year)',
          table: R(FULL, { hl: ['id', 'name', 'category', 'price', 'stock', 'release_year'] }) },
        { cap: T3('Then the values, in the same order. A new row appears at the end.', '次に、同じ順番で値を書く。新しい行がいちばん下に増える。', 'つぎに、おなじ じゅんばんで {値|あたい}を {書|か}く。{新|あたら}しい {行|ぎょう}が いちばん {下|した}に ふえる。'), sql: INS_ALL, mark: "VALUES (11, 'USB Cable', 'Electronics', 800, 100, 2024)", table: AF(INS_ALL) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('All columns', '全部の列', 'ぜんぶの {列|れつ}'), covers: ['cols.all'],
          cap: T3('6 columns, 6 values: every column of the new row has a value.', '列が 6 つ、値も 6 つ。新しい行の全部の列に値が入る。', '{列|れつ}が 6つ、{値|あたい}も 6つ。{新|あたら}しい {行|ぎょう}の ぜんぶの {列|れつ}に {値|あたい}が {入|はい}る。'), sql: INS_ALL, mark: '(id, name, category, price, stock, release_year)', table: AF(INS_ALL) },
        { label: T3('Some columns', '一部の列だけ', 'いくつかの {列|れつ}だけ'), covers: ['cols.some'],
          cap: T3('4 columns, 4 values. The columns you did not write (stock, release_year) become NULL: no value.', '列が 4 つ、値も 4 つ。書かなかった列（stock・release_year）は NULL（値がない）になる。', '{列|れつ}が 4つ、{値|あたい}も 4つ。{書|か}かなかった {列|れつ}（stock・release_year）は NULL（{値|あたい}が ない）に なる。'), sql: INS_SOME, mark: '(id, name, category, price)', table: AF(INS_SOME, ['stock', 'release_year']) }
      ] },
      { type: 'mistake', title: T3('The numbers of columns and values differ', '列の数と値の数が違う', '{列|れつ}の {数|かず}と {値|あたい}の {数|かず}が ちがう'),
        wrong: "INSERT INTO products (id, name, category, price)\nVALUES (11, 'USB Cable', 'Electronics');", right: INS_SOME,
        why: T3('4 columns need 4 values. Here price has no value, so it is an error.', '列が 4 つなら、値も 4 つ必要。price に入れる値がないのでエラーになる。', '{列|れつ}が 4つなら、{値|あたい}も 4つ いる。price に {入|い}れる {値|あたい}が ないので エラーに なる。') },
      { type: 'mistake', title: T3('The order of the values is wrong', '値の順番が違う', '{値|あたい}の じゅんばんが ちがう'),
        wrong: "INSERT INTO products (id, name, category, price)\nVALUES (11, 'Electronics', 'USB Cable', 800);", right: INS_SOME,
        why: T3('No error, but the name becomes Electronics and the category USB Cable. Check the order with the columns.', 'エラーにはならないが、name が Electronics、category が USB Cable になってしまう。列の順番と見比べる。', 'エラーには ならないが、name が Electronics、category が USB Cable に なって しまう。{列|れつ}の じゅんばんと {見|み}くらべる。') },
      { type: 'quiz', q: T3('What is in stock of the new row?', '新しい行の stock には何が入る？', '{新|あたら}しい {行|ぎょう}の stock には {何|なに}が {入|はい}る？'), sql: INS_SOME, mark: '(id, name, category, price)',
        choices: ['0', 'NULL', '800'], answer: 1,
        why: T3('stock is not in the list of columns, so it gets no value: NULL (not 0).', 'stock は列のリストにないので、値が入らない。0 ではなく NULL になる。', 'stock は {列|れつ}の リストに ないので、{値|あたい}が {入|はい}らない。0 では なく NULL に なる。'),
        before: R(FULL, { hl: ['stock'] }), table: AF(INS_SOME, ['stock']) },
      { type: 'points', items: [
        T3('INSERT INTO table (columns) VALUES (values); adds one row.', 'INSERT INTO テーブル (列) VALUES (値); で 1 行増える。', 'INSERT INTO テーブル ({列|れつ}) VALUES ({値|あたい}); で 1{行|ぎょう} ふえる。'),
        T3('Same number, same order: columns and values.', '列と値は、同じ数・同じ順番。', '{列|れつ}と {値|あたい}は、おなじ {数|かず}・おなじ じゅんばん。'),
        T3('A column you leave out becomes NULL.', '書かなかった列は NULL になる。', '{書|か}かなかった {列|れつ}は NULL に なる。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 13 */
  update: {
    goal: T3('Change values in rows that are already in the table.', 'すでにある行の値を変える。', 'すでに ある {行|ぎょう}の {値|あたい}を {変|か}える。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“From today, Wireless Mouse costs 1200 yen. Please change the price.”', '「Wireless Mouse を今日から 1200 円にする。値段を直しておいて。」', '「Wireless Mouse を {今日|きょう}から 1200{円|えん}に する。ねだんを なおして おいて。」'),
        table: pickRows([1], { hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('UPDATE table SET column = new value WHERE condition', 'UPDATE テーブル SET 列 = 新しい値 WHERE 条件', 'UPDATE テーブル SET {列|れつ} = {新|あたら}しい {値|あたい} WHERE {条件|じょうけん}'),
        T3('WHERE chooses the rows to change. SET says which column and what value.', 'WHERE で「どの行を」変えるかを選び、SET で「どの列を、何に」変えるかを書く。', 'WHERE で「どの {行|ぎょう}を」{変|か}えるかを えらび、SET で「どの {列|れつ}を、{何|なに}に」{変|か}えるかを {書|か}く。'),
        T3('The new value can be a calculation: price = price + 500', '新しい値には計算も書ける：price = price + 500', '{新|あたら}しい {値|あたい}には {計算|けいさん}も {書|か}ける：price = price + 500')] },
      { type: 'anim', title: T3('What UPDATE does', 'UPDATE がすること', 'UPDATE が すること'), frames: [
        { cap: T3('The products table before the change.', '変える前の products。', '{変|か}える まえの products。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products', table: R(FULL) },
        { cap: T3('WHERE id = 1: only this row will change.', 'WHERE id = 1：変わるのはこの行だけ。', 'WHERE id = 1：{変|か}わるのは この {行|ぎょう}だけ。'), sql: UPD_ONE, mark: 'WHERE id = 1', table: pickRows([1], { hl: ['id'] }) },
        { cap: T3('SET price = 1200: the price of that row becomes 1200. The other rows stay the same.', 'SET price = 1200：その行の price が 1200 になる。ほかの行は変わらない。', 'SET price = 1200：その {行|ぎょう}の price が 1200 に なる。ほかの {行|ぎょう}は {変|か}わらない。'), sql: UPD_ONE, mark: 'SET price = 1200', table: AF(UPD_ONE, ['price']) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('One row, a new value', '1 行を、決まった値に', '1{行|ぎょう}を、きまった {値|あたい}に'), covers: ['one'],
          cap: T3('Choose one row by its id and write the new value.', 'id で 1 行を選び、新しい値を書く。', 'id で 1{行|ぎょう}を えらび、{新|あたら}しい {値|あたい}を {書|か}く。'), sql: UPD_ONE, mark: 'SET price = 1200', table: AF(UPD_ONE, ['price']) },
        { label: T3('Several rows, a calculation', '複数の行を、計算で', 'いくつかの {行|ぎょう}を、{計算|けいさん}で'), covers: ['many'],
          cap: T3('Every Books row: price + 500. Each row is calculated from its own price (2200 → 2700, 3000 → 3500).', 'Books の行すべてで price + 500。行ごとに、自分の price から計算する（2200 → 2700、3000 → 3500）。', 'Books の {行|ぎょう} ぜんぶで price + 500。{行|ぎょう}ごとに、じぶんの price から {計算|けいさん}する（2200 → 2700、3000 → 3500）。'), sql: UPD_MANY, mark: 'SET price = price + 500', table: AF(UPD_MANY, ['price']) }
      ] },
      { type: 'mistake', title: T3('No WHERE', 'WHERE を書き忘れる', 'WHERE を {書|か}きわすれる'),
        wrong: 'UPDATE products\nSET price = 1200;', right: UPD_ONE,
        why: T3('Without WHERE, every row changes: all 10 products cost 1200.', 'WHERE がないと、全部の行が変わる。10 個の商品がすべて 1200 円になってしまう。', 'WHERE が ないと、ぜんぶの {行|ぎょう}が {変|か}わる。10この しょうひんが ぜんぶ 1200{円|えん}に なって しまう。') },
      { type: 'mistake', title: T3('No SET', 'SET がない', 'SET が ない'),
        wrong: 'UPDATE products\nprice = 1200\nWHERE id = 1;', right: UPD_ONE,
        why: T3('The new value is written after SET.', '新しい値は SET のあとに書く。', '{新|あたら}しい {値|あたい}は SET の あとに {書|か}く。') },
      { type: 'quiz', q: T3('How many rows change?', '何行変わる？', '{何行|なんぎょう} {変|か}わる？'), sql: "UPDATE products\nSET stock = stock + 10\nWHERE category = 'Kitchen';", mark: "WHERE category = 'Kitchen'",
        choices: ['1', '3', '10'], answer: e => one(e, "SELECT COUNT(*) FROM products WHERE category = 'Kitchen';"),
        why: T3('WHERE chooses the 3 Kitchen rows. Only they get + 10.', 'WHERE で選ばれるのは Kitchen の 3 行。その 3 行だけ stock が 10 増える。', 'WHERE で えらばれるのは Kitchen の 3{行|ぎょう}。その 3{行|ぎょう}だけ stock が 10 ふえる。'),
        before: R(FULL, { hl: ['category', 'stock'] }), table: AF("UPDATE products SET stock = stock + 10 WHERE category = 'Kitchen';", ['stock']) },
      { type: 'points', items: [
        T3('UPDATE … SET column = value WHERE condition;', 'UPDATE … SET 列 = 値 WHERE 条件;', 'UPDATE … SET {列|れつ} = {値|あたい} WHERE {条件|じょうけん};'),
        T3('Always write WHERE. Without it every row changes.', 'WHERE をかならず書く。ないと全部の行が変わる。', 'WHERE を かならず {書|か}く。ないと ぜんぶの {行|ぎょう}が {変|か}わる。'),
        T3('Before UPDATE, look at the rows with SELECT … WHERE (the same condition).', 'UPDATE の前に、同じ条件の SELECT … WHERE で、変わる行を確かめるとよい。', 'UPDATE の まえに、おなじ {条件|じょうけん}の SELECT … WHERE で、{変|か}わる {行|ぎょう}を たしかめると よい。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 14 */
  delete: {
    goal: T3('Remove rows from a table.', '表から行を消す。', '{表|ひょう}から {行|ぎょう}を {消|け}す。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“We stop selling products with stock under 15. Please remove them from the list.”', '「在庫が 15 より少ない商品は、販売をやめる。一覧から消しておいて。」', '「ざいこが 15 より {少|すく}ない しょうひんは、うるのを やめる。いちらんから {消|け}して おいて。」'),
        table: R(FULL, { hl: ['stock'] }) },
      { type: 'syntax', notes: [
        T3('DELETE FROM table WHERE condition: the rows that match are removed.', 'DELETE FROM テーブル WHERE 条件：条件に合う行が消える。', 'DELETE FROM テーブル WHERE {条件|じょうけん}：{条件|じょうけん}に あう {行|ぎょう}が {消|き}える。'),
        T3('A whole row is removed, so there is no column name (and no *) after DELETE.', '行をまるごと消すので、DELETE のあとに列の名前や * は書かない。', '{行|ぎょう}を まるごと {消|け}すので、DELETE の あとに {列|れつ}の {名前|なまえ}や * は {書|か}かない。'),
        T3('The condition is written like in SELECT … WHERE.', '条件の書き方は SELECT … WHERE と同じ。', '{条件|じょうけん}の {書|か}き{方|かた}は SELECT … WHERE と おなじ。')] },
      { type: 'anim', title: T3('What DELETE does', 'DELETE がすること', 'DELETE が すること'), frames: [
        { cap: T3('The products table before: 10 rows.', '消す前の products。10 行ある。', '{消|け}す まえの products。10{行|ぎょう} ある。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products', table: R(FULL) },
        { cap: T3('WHERE stock < 15: each row is checked. The rows that match (✕) will go.', 'WHERE stock < 15：1 行ずつ確かめる。条件に合う行（✕）が消える。', 'WHERE stock < 15：1{行|ぎょう}ずつ たしかめる。{条件|じょうけん}に あう {行|ぎょう}（✕）が {消|き}える。'), sql: DEL, mark: 'WHERE stock < 15', table: RM(DEL, ['stock']) },
        { cap: T3('3 rows are removed. 7 rows are left.', '3 行が消えて、7 行が残る。', '3{行|ぎょう}が {消|き}えて、7{行|ぎょう}が のこる。'), sql: DEL, mark: 'DELETE FROM products', table: AF(DEL, ['stock']) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('One row (id)', 'id で 1 行', 'id で 1{行|ぎょう}'), covers: ['id'],
          cap: T3('id = 3: exactly one row is removed.', 'id = 3：ちょうど 1 行だけ消える。', 'id = 3：ちょうど 1{行|ぎょう}だけ {消|き}える。'), sql: 'DELETE FROM products\nWHERE id = 3;', mark: 'id = 3', table: RM('DELETE FROM products WHERE id = 3;', ['id']) },
        { label: T3('= (text)', '=（文字）', '=（{文字|もじ}）'), covers: ['text'],
          cap: T3("Text in quotes: every row whose category is Books is removed.", "文字は ' ' で囲む。category が Books の行が全部消える。", "{文字|もじ}は ' ' で かこむ。category が Books の {行|ぎょう}が ぜんぶ {消|き}える。"), sql: "DELETE FROM products\nWHERE category = 'Books';", mark: "= 'Books'", table: RM("DELETE FROM products WHERE category = 'Books';", ['category']) },
        { label: T3('<', '<（より小さい）', '<（より {小|ちい}さい）'), covers: ['cmp.<'],
          cap: T3('Less than 15: a row with exactly 15 stays.', '15 より小さい。15 ちょうどの行は残る。', '15 より {小|ちい}さい。15 ちょうどの {行|ぎょう}は のこる。'), sql: DEL, mark: '<', table: RM(DEL, ['stock']) },
        { label: T3('<=', '<=（以下）', '<=（いか）'), covers: ['cmp.<='],
          cap: T3('15 or less: the row with exactly 15 is removed too.', '15 以下。15 ちょうどの行も消える。', '15 いか。15 ちょうどの {行|ぎょう}も {消|き}える。'), sql: 'DELETE FROM products\nWHERE stock <= 15;', mark: '<=', table: RM('DELETE FROM products WHERE stock <= 15;', ['stock']) },
        { label: T3('>=', '>=（以上）', '>=（いじょう）'), covers: ['cmp.>='],
          cap: T3('6200 or more: the row with exactly 6200 is removed too.', '6200 以上。6200 ちょうどの行も消える。', '6200 いじょう。6200 ちょうどの {行|ぎょう}も {消|き}える。'), sql: 'DELETE FROM products\nWHERE price >= 6200;', mark: '>=', table: RM('DELETE FROM products WHERE price >= 6200;', ['price']) },
        { label: T3('>', '>（より大きい）', '>（より {大|おお}きい）'), covers: ['cmp.>'],
          cap: T3('More than 6200: the row with exactly 6200 stays.', '6200 より大きい。6200 ちょうどの行は残る。', '6200 より {大|おお}きい。6200 ちょうどの {行|ぎょう}は のこる。'), sql: 'DELETE FROM products\nWHERE price > 6200;', mark: '>', table: RM('DELETE FROM products WHERE price > 6200;', ['price']) }
      ] },
      { type: 'mistake', title: T3('No WHERE', 'WHERE を書き忘れる', 'WHERE を {書|か}きわすれる'),
        wrong: 'DELETE FROM products;', right: DEL,
        why: T3('Without WHERE, every row is removed: the table is empty.', 'WHERE がないと、全部の行が消える。表が空になってしまう。', 'WHERE が ないと、ぜんぶの {行|ぎょう}が {消|き}える。{表|ひょう}が からに なって しまう。') },
      { type: 'mistake', title: T3('DELETE *', 'DELETE * と書く', 'DELETE * と {書|か}く'),
        wrong: 'DELETE * FROM products\nWHERE stock < 15;', right: DEL,
        why: T3('DELETE removes whole rows, so you do not choose columns. Write DELETE FROM.', 'DELETE は行をまるごと消すので、列は選ばない。DELETE FROM と書く。', 'DELETE は {行|ぎょう}を まるごと {消|け}すので、{列|れつ}は えらばない。DELETE FROM と {書|か}く。') },
      { type: 'quiz', q: T3('How many rows are left?', '何行残る？', '{何行|なんぎょう} のこる？'), sql: 'DELETE FROM products\nWHERE price <= 1800;', mark: '<= 1800',
        choices: ['9', '8', '2'], answer: e => rowsLeft(e, 'DELETE FROM products WHERE price <= 1800;'),
        why: T3('<= includes 1800 itself: Wireless Mouse (1500) and Graphic T-Shirt (1800) are removed. 10 − 2 = 8.', '<= は 1800 ちょうどもふくむ。Wireless Mouse（1500）と Graphic T-Shirt（1800）が消える。10 − 2 = 8 行。', '<= は 1800 ちょうども ふくむ。Wireless Mouse（1500）と Graphic T-Shirt（1800）が {消|き}える。10 − 2 = 8{行|ぎょう}。'),
        before: R(FULL, { hl: ['price'] }), table: RM('DELETE FROM products WHERE price <= 1800;', ['price']) },
      { type: 'points', items: [
        T3('DELETE FROM table WHERE condition; removes the rows that match.', 'DELETE FROM テーブル WHERE 条件; で、条件に合う行が消える。', 'DELETE FROM テーブル WHERE {条件|じょうけん}; で、{条件|じょうけん}に あう {行|ぎょう}が {消|き}える。'),
        T3('SELECT … WHERE keeps the rows that match; DELETE … WHERE removes them.', 'SELECT … WHERE は合う行を「残す」。DELETE … WHERE は合う行を「消す」。', 'SELECT … WHERE は あう {行|ぎょう}を「のこす」。DELETE … WHERE は あう {行|ぎょう}を「{消|け}す」。'),
        T3('Always write WHERE. A removed row does not come back.', 'WHERE をかならず書く。消した行は元に戻らない。', 'WHERE を かならず {書|か}く。{消|け}した {行|ぎょう}は もとに もどらない。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 15 */
  aggfn: {
    goal: T3('Count the rows, and get the total, average, largest and smallest value.', '行を数える。合計・平均・最大・最小を求める。', '{行|ぎょう}を {数|かぞ}える。{合計|ごうけい}・{平均|へいきん}・{最大|さいだい}・{最小|さいしょう}を {求|もと}める。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“How many products do we have? And what is the average price?”', '「うちの商品は全部でいくつ？平均の値段はいくら？」', '「うちの しょうひんは ぜんぶで いくつ？{平均|へいきん}の ねだんは いくら？」'),
        table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('COUNT(*) counts the rows.', 'COUNT(*)：行の数を数える。', 'COUNT(*)：{行|ぎょう}の {数|かず}を {数|かぞ}える。'),
        T3('SUM(column) total, AVG(column) average, MAX(column) largest, MIN(column) smallest.', 'SUM(列) 合計、AVG(列) 平均、MAX(列) 最大、MIN(列) 最小。', 'SUM({列|れつ}) {合計|ごうけい}、AVG({列|れつ}) {平均|へいきん}、MAX({列|れつ}) {最大|さいだい}、MIN({列|れつ}) {最小|さいしょう}。'),
        T3('Many rows become one row: the result is a single row.', 'たくさんの行が 1 行にまとまる。結果は 1 行だけ。', 'たくさんの {行|ぎょう}が 1{行|ぎょう}に まとまる。{結果|けっか}は 1{行|ぎょう}だけ。')] },
      { type: 'anim', title: T3('What an aggregate function does', '集計関数がすること', '{集計|しゅうけい}{関数|かんすう}が すること'), frames: [
        { cap: T3('10 products, each with a price.', '10 個の商品。それぞれに price がある。', '10この しょうひん。それぞれに price が ある。'), sql: 'SELECT name, price\nFROM products;', mark: 'FROM products', table: R(ALL, { hide: ['category'], hl: ['price'] }) },
        { cap: T3('COUNT(*): the rows are counted and become one row. 10 rows.', 'COUNT(*)：行を数えて、1 行にまとめる。10 行ある。', 'COUNT(*)：{行|ぎょう}を {数|かぞ}えて、1{行|ぎょう}に まとめる。10{行|ぎょう} ある。'), sql: 'SELECT COUNT(*)\nFROM products;', mark: 'COUNT(*)', table: R('SELECT COUNT(*) FROM products;'), merge: toOne('SELECT COUNT(*) FROM products;') },
        { cap: T3('AVG(price): all prices are added and divided by 10. You can write several in one SELECT.', 'AVG(price)：price を全部足して、10 で割る。1 つの SELECT にいくつも書ける。', 'AVG(price)：price を ぜんぶ {足|た}して、10 で わる。1つの SELECT に いくつも {書|か}ける。'), sql: 'SELECT COUNT(*), AVG(price)\nFROM products;', mark: 'AVG(price)', table: R('SELECT COUNT(*), AVG(price) FROM products;', { hl: ['AVG(price)'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('COUNT(*)', 'COUNT(*)（行の数）', 'COUNT(*)（{行|ぎょう}の {数|かず}）'), covers: ['count'],
          cap: T3('The number of rows. No column name: * means “rows”.', '行の数。列の名前は書かず、* を書く。', '{行|ぎょう}の {数|かず}。{列|れつ}の {名前|なまえ}は {書|か}かず、* を {書|か}く。'), sql: 'SELECT COUNT(*)\nFROM products;', mark: 'COUNT(*)', table: R('SELECT COUNT(*) FROM products;') },
        { label: T3('SUM', 'SUM（合計）', 'SUM（{合計|ごうけい}）'), covers: ['SUM'],
          cap: T3('The total: 50 + 20 + 15 + … = 270 items in stock.', '合計。50 + 20 + 15 + … = 270。在庫は全部で 270 個。', '{合計|ごうけい}。50 + 20 + 15 + … = 270。ざいこは ぜんぶで 270こ。'), sql: 'SELECT COUNT(*), SUM(stock)\nFROM products;', mark: 'SUM(stock)', table: R('SELECT COUNT(*), SUM(stock) FROM products;', { hl: ['SUM(stock)'] }) },
        { label: T3('AVG', 'AVG（平均）', 'AVG（{平均|へいきん}）'), covers: ['AVG'],
          cap: T3('The average: total ÷ number of rows = 52300 ÷ 10.', '平均。合計 ÷ 行の数 = 52300 ÷ 10。', '{平均|へいきん}。{合計|ごうけい} ÷ {行|ぎょう}の {数|かず} = 52300 ÷ 10。'), sql: 'SELECT COUNT(*), AVG(price)\nFROM products;', mark: 'AVG(price)', table: R('SELECT COUNT(*), AVG(price) FROM products;', { hl: ['AVG(price)'] }) },
        { label: T3('MAX', 'MAX（最大）', 'MAX（{最大|さいだい}）'), covers: ['MAX'],
          cap: T3('The largest value: the highest price.', 'いちばん大きい値。いちばん高い値段。', 'いちばん {大|おお}きい {値|あたい}。いちばん {高|たか}い ねだん。'), sql: 'SELECT COUNT(*), MAX(price)\nFROM products;', mark: 'MAX(price)', table: R('SELECT COUNT(*), MAX(price) FROM products;', { hl: ['MAX(price)'] }) },
        { label: T3('MIN', 'MIN（最小）', 'MIN（{最小|さいしょう}）'), covers: ['MIN'],
          cap: T3('The smallest value: the lowest price.', 'いちばん小さい値。いちばん安い値段。', 'いちばん {小|ちい}さい {値|あたい}。いちばん {安|やす}い ねだん。'), sql: 'SELECT COUNT(*), MIN(price)\nFROM products;', mark: 'MIN(price)', table: R('SELECT COUNT(*), MIN(price) FROM products;', { hl: ['MIN(price)'] }) }
      ] },
      { type: 'mistake', title: T3('COUNT without (*)', 'COUNT に (*) がない', 'COUNT に (*) が ない'),
        wrong: 'SELECT COUNT\nFROM products;', right: 'SELECT COUNT(*)\nFROM products;',
        why: T3('A function needs ( ). Without it, COUNT is read as a column name (an error).', '関数には ( ) が必要。ないと、COUNT が列の名前だと思われてエラーになる。', '{関数|かんすう}には ( ) が いる。ないと、COUNT が {列|れつ}の {名前|なまえ}だと おもわれて エラーに なる。') },
      { type: 'mistake', title: T3('SUM of a text column', '文字の列を SUM する', '{文字|もじ}の {列|れつ}を SUM する'),
        wrong: 'SELECT SUM(name)\nFROM products;', right: 'SELECT SUM(price)\nFROM products;',
        why: T3('Text cannot be added. Use SUM and AVG with number columns.', '文字は足せない。SUM と AVG は数字の列に使う。', '{文字|もじ}は {足|た}せない。SUM と AVG は {数字|すうじ}の {列|れつ}に {使|つか}う。') },
      { type: 'quiz', q: T3('What is the result?', '結果はどれ？', '{結果|けっか}は どれ？'), sql: 'SELECT MIN(stock)\nFROM products;', mark: 'MIN(stock)',
        choices: ['8', '10', '60'], answer: e => one(e, 'SELECT MIN(stock) FROM products;'),
        why: T3('MIN is the smallest value of the column: 8 (Chef Knife Pro). 10 is the number of rows, 60 the largest.', 'MIN は列の中でいちばん小さい値：8（Chef Knife Pro）。10 は行の数、60 はいちばん大きい値。', 'MIN は {列|れつ}の {中|なか}で いちばん {小|ちい}さい {値|あたい}：8（Chef Knife Pro）。10 は {行|ぎょう}の {数|かず}、60 は いちばん {大|おお}きい {値|あたい}。'),
        before: R(FULL, { hl: ['stock'] }), table: pickRows([7], { hl: ['stock'] }) },
      { type: 'points', items: [
        T3('COUNT(*) counts rows. SUM, AVG, MAX, MIN need a column in ( ).', 'COUNT(*) は行を数える。SUM・AVG・MAX・MIN は ( ) の中に列を書く。', 'COUNT(*) は {行|ぎょう}を {数|かぞ}える。SUM・AVG・MAX・MIN は ( ) の {中|なか}に {列|れつ}を {書|か}く。'),
        T3('The result is one row, however many rows the table has.', '表が何行あっても、結果は 1 行になる。', '{表|ひょう}が {何行|なんぎょう} あっても、{結果|けっか}は 1{行|ぎょう}に なる。'),
        T3('SUM and AVG are for numbers.', 'SUM と AVG は数字の列に使う。', 'SUM と AVG は {数字|すうじ}の {列|れつ}に {使|つか}う。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 16 */
  groupby: {
    goal: T3('Make groups of rows and calculate per group.', '行をグループに分けて、グループごとに集計する。', '{行|ぎょう}を グループに わけて、グループごとに {集計|しゅうけい}する。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“How many products are there in each category? And the highest price in each?”', '「カテゴリごとに、商品はいくつある？それぞれ、いちばん高いのはいくら？」', '「カテゴリごとに、しょうひんは いくつ ある？それぞれ、いちばん {高|たか}いのは いくら？」'),
        table: R(ALL, { hl: ['category'] }) },
      { type: 'syntax', notes: [
        T3('GROUP BY column: rows with the same value become one group.', 'GROUP BY 列：同じ値の行が 1 つのグループになる。', 'GROUP BY {列|れつ}：おなじ {値|あたい}の {行|ぎょう}が 1つの グループに なる。'),
        T3('COUNT, SUM, AVG, MAX, MIN are calculated for each group.', 'COUNT・SUM・AVG・MAX・MIN は、グループごとに計算される。', 'COUNT・SUM・AVG・MAX・MIN は、グループごとに {計算|けいさん}される。'),
        T3('GROUP BY comes after FROM (and after WHERE).', 'GROUP BY は FROM のあと（WHERE があればそのあと）に書く。', 'GROUP BY は FROM の あと（WHERE が あれば その あと）に {書|か}く。')] },
      { type: 'anim', title: T3('What GROUP BY does', 'GROUP BY がすること', 'GROUP BY が すること'), frames: [
        { cap: T3('Every product has a category.', 'どの商品にも category がある。', 'どの しょうひんにも category が ある。'), sql: 'SELECT name, category, price\nFROM products;', mark: 'category', table: R(ALL, { hide: ['id'], hl: ['category'] }) },
        { cap: T3('GROUP BY category: the rows of the same category go together. 4 groups.', 'GROUP BY category：同じ category の行が集まる。グループは 4 つ。', 'GROUP BY category：おなじ category の {行|ぎょう}が あつまる。グループは 4つ。'), sql: 'SELECT category\nFROM products\nGROUP BY category;', mark: 'GROUP BY category', table: byCat('price') },
        { cap: T3('Each group becomes one row. COUNT(*) counts the rows of the group.', 'グループは 1 行になる。COUNT(*) は、そのグループの行の数。', 'グループは 1{行|ぎょう}に なる。COUNT(*) は、その グループの {行|ぎょう}の {数|かず}。'), sql: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category;', mark: 'COUNT(*)', table: G(['COUNT(*)']), merge: idToCat },
        { cap: T3('MAX(price): the highest price inside each group.', 'MAX(price)：グループの中で、いちばん高い price。', 'MAX(price)：グループの {中|なか}で、いちばん {高|たか}い price。'), sql: 'SELECT category, COUNT(*), MAX(price)\nFROM products\nGROUP BY category;', mark: 'MAX(price)', table: G(['COUNT(*)', 'MAX(price)']) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('COUNT(*) per group', 'グループごとの行の数', 'グループごとの {行|ぎょう}の {数|かず}'), covers: ['group'],
          cap: T3('One row per category: how many products each has.', 'category ごとに 1 行。それぞれ商品がいくつあるか。', 'category ごとに 1{行|ぎょう}。それぞれ しょうひんが いくつ あるか。'), sql: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category;', mark: 'GROUP BY category', table: G(['COUNT(*)']) },
        { label: T3('SUM', 'SUM（合計）', 'SUM（{合計|ごうけい}）'), covers: ['SUM'],
          cap: T3('The total stock of each category.', 'category ごとの stock の合計。', 'category ごとの stock の {合計|ごうけい}。'), sql: 'SELECT category, COUNT(*), SUM(stock)\nFROM products\nGROUP BY category;', mark: 'SUM(stock)', table: G(['COUNT(*)', 'SUM(stock)']) },
        { label: T3('AVG', 'AVG（平均）', 'AVG（{平均|へいきん}）'), covers: ['AVG'],
          cap: T3('The average price of each category. (Rounded here: Kitchen is 4166.666…)', 'category ごとの price の平均。（ここでは丸めて表示。Kitchen は 4166.666…）', 'category ごとの price の {平均|へいきん}。（ここでは まるめて ひょうじ。Kitchen は 4166.666…）'), sql: 'SELECT category, COUNT(*), AVG(price)\nFROM products\nGROUP BY category;', mark: 'AVG(price)', table: G(['COUNT(*)', 'AVG(price)']) },
        { label: T3('MAX', 'MAX（最大）', 'MAX（{最大|さいだい}）'), covers: ['MAX'],
          cap: T3('The highest price of each category.', 'category ごとの、いちばん高い price。', 'category ごとの、いちばん {高|たか}い price。'), sql: 'SELECT category, COUNT(*), MAX(price)\nFROM products\nGROUP BY category;', mark: 'MAX(price)', table: G(['COUNT(*)', 'MAX(price)']) },
        { label: T3('MIN', 'MIN（最小）', 'MIN（{最小|さいしょう}）'), covers: ['MIN'],
          cap: T3('The lowest price of each category. A group of one row (Clothing): MAX and MIN are the same.', 'category ごとの、いちばん安い price。1 行だけのグループ（Clothing）は、MAX も MIN も同じ値。', 'category ごとの、いちばん {安|やす}い price。1{行|ぎょう}だけの グループ（Clothing）は、MAX も MIN も おなじ {値|あたい}。'), sql: 'SELECT category, COUNT(*), MIN(price)\nFROM products\nGROUP BY category;', mark: 'MIN(price)', table: G(['COUNT(*)', 'MIN(price)']) }
      ] },
      { type: 'mistake', title: T3('A column that is not grouped', 'グループにしていない列を書く', 'グループに して いない {列|れつ}を {書|か}く'),
        wrong: 'SELECT category, name, COUNT(*)\nFROM products\nGROUP BY category;', right: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category;',
        why: T3('A group has several names: which one should it show? Most databases give an error.', '1 つのグループには name がいくつもあり、どれを出すか決まらない。多くのデータベースではエラーになる。', '1つの グループには name が いくつも あり、どれを {出|だ}すか きまらない。おおくの データベースでは エラーに なる。') },
      { type: 'mistake', title: T3('No GROUP BY', 'GROUP BY を書き忘れる', 'GROUP BY を {書|か}きわすれる'),
        wrong: 'SELECT category, COUNT(*)\nFROM products;', right: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category;',
        why: T3('Without GROUP BY the whole table is one group: you get one row (10), not one per category.', 'GROUP BY がないと、表全体が 1 つのグループになる。category ごとではなく、全体で 1 行（10）になる。', 'GROUP BY が ないと、{表|ひょう} ぜんたいが 1つの グループに なる。category ごとでは なく、ぜんたいで 1{行|ぎょう}（10）に なる。') },
      { type: 'quiz', q: T3('How many rows are in the result?', '結果は何行になる？', '{結果|けっか}は {何行|なんぎょう}に なる？'), sql: 'SELECT category, SUM(stock)\nFROM products\nGROUP BY category;', mark: 'GROUP BY category',
        choices: ['10', '4', '1'], answer: e => rowsLeft(e, 'SELECT category FROM products GROUP BY category;'),
        why: T3('One row per group. There are 4 categories, so 4 rows.', 'グループ 1 つが 1 行になる。category は 4 種類あるので、4 行。', 'グループ 1つが 1{行|ぎょう}に なる。category は 4しゅるい あるので、4{行|ぎょう}。'),
        before: byCat('stock'), table: G(['SUM(stock)']) },
      { type: 'points', items: [
        T3('GROUP BY makes one row per group.', 'GROUP BY は、グループ 1 つを 1 行にする。', 'GROUP BY は、グループ 1つを 1{行|ぎょう}に する。'),
        T3('In SELECT you can write the GROUP BY column and aggregates (COUNT, SUM …).', 'SELECT に書けるのは、GROUP BY の列と、集計（COUNT・SUM など）。', 'SELECT に {書|か}けるのは、GROUP BY の {列|れつ}と、{集計|しゅうけい}（COUNT・SUM など）。'),
        T3('“per …”, “for each …” in a question → GROUP BY.', '問題文に「〜ごと」「〜別」とあったら GROUP BY。', 'もんだいに「〜ごと」「〜べつ」と あったら GROUP BY。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 17 */
  having: {
    goal: T3('Keep only the groups that match a condition.', '条件に合うグループだけを残す。', '{条件|じょうけん}に あう グループだけを のこす。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Which categories have 2 or more products?”', '「商品が 2 つ以上あるカテゴリはどれ？」', '「しょうひんが 2つ いじょう ある カテゴリは どれ？」'),
        table: byCat('price') },
      { type: 'syntax', notes: [
        T3('HAVING comes after GROUP BY and keeps only the groups where the condition is true.', 'HAVING は GROUP BY のあとに書く。条件に合うグループだけが残る。', 'HAVING は GROUP BY の あとに {書|か}く。{条件|じょうけん}に あう グループだけが のこる。'),
        T3('The condition uses an aggregate: HAVING COUNT(*) >= 2, HAVING AVG(price) >= 4000 …', '条件には集計を使う：HAVING COUNT(*) >= 2、HAVING AVG(price) >= 4000 など。', '{条件|じょうけん}には {集計|しゅうけい}を {使|つか}う：HAVING COUNT(*) >= 2、HAVING AVG(price) >= 4000 など。'),
        T3('WHERE checks rows. HAVING checks groups.', 'WHERE は「行」を確かめる。HAVING は「グループ」を確かめる。', 'WHERE は「{行|ぎょう}」を たしかめる。HAVING は「グループ」を たしかめる。')] },
      { type: 'anim', title: T3('What HAVING does', 'HAVING がすること', 'HAVING が すること'), frames: [
        { cap: T3('GROUP BY category: the rows are gathered into 4 groups.', 'GROUP BY category：行が 4 つのグループに集まる。', 'GROUP BY category：{行|ぎょう}が 4つの グループに あつまる。'), sql: 'SELECT category\nFROM products\nGROUP BY category;', mark: 'GROUP BY category', table: byCat('price') },
        { cap: T3('COUNT(*) is calculated for each group.', 'グループごとに COUNT(*) を計算する。', 'グループごとに COUNT(*) を {計算|けいさん}する。'), sql: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category;', mark: 'COUNT(*)', table: G(['COUNT(*)']), merge: idToCat },
        { cap: T3('HAVING COUNT(*) >= 2: each group is checked, one by one.', 'HAVING COUNT(*) >= 2：グループを 1 つずつ確かめる。', 'HAVING COUNT(*) >= 2：グループを 1つずつ たしかめる。'), sql: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 2;', mark: 'HAVING COUNT(*) >= 2', table: G(['COUNT(*)'], 'COUNT(*) >= 2') },
        { cap: T3('Groups that do not match are removed. Clothing (1 product) is gone.', '合わないグループは消える。Clothing（1 つ）がなくなった。', 'あわない グループは {消|き}える。Clothing（1つ）が なくなった。'), sql: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 2;', mark: 'HAVING COUNT(*) >= 2', table: R('SELECT category, COUNT(*) FROM products GROUP BY category HAVING COUNT(*) >= 2;', { hl: ['COUNT(*)'], cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('COUNT(*)', 'COUNT(*)（行の数）', 'COUNT(*)（{行|ぎょう}の {数|かず}）'), covers: ['having.COUNT'],
          cap: T3('Groups with 3 or more rows.', '行が 3 つ以上あるグループ。', '{行|ぎょう}が 3つ いじょう ある グループ。'), sql: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 3;', mark: 'HAVING COUNT(*) >= 3', table: G(['COUNT(*)'], 'COUNT(*) >= 3') },
        { label: T3('SUM', 'SUM（合計）', 'SUM（{合計|ごうけい}）'), covers: ['having.SUM'],
          cap: T3('Groups whose total stock is 60 or more: exactly 60 (Clothing) is included.', 'stock の合計が 60 以上のグループ。ちょうど 60（Clothing）もふくむ。', 'stock の {合計|ごうけい}が 60 いじょうの グループ。ちょうど 60（Clothing）も ふくむ。'), sql: 'SELECT category, SUM(stock)\nFROM products\nGROUP BY category\nHAVING SUM(stock) >= 60;', mark: 'HAVING SUM(stock) >= 60', table: G(['SUM(stock)'], 'SUM(stock) >= 60') },
        { label: T3('AVG', 'AVG（平均）', 'AVG（{平均|へいきん}）'), covers: ['having.AVG'],
          cap: T3('Groups whose average price is 4000 or more.', 'price の平均が 4000 以上のグループ。', 'price の {平均|へいきん}が 4000 いじょうの グループ。'), sql: 'SELECT category, AVG(price)\nFROM products\nGROUP BY category\nHAVING AVG(price) >= 4000;', mark: 'HAVING AVG(price) >= 4000', table: G(['AVG(price)'], 'AVG(price) >= 4000') },
        { label: T3('MAX', 'MAX（最大）', 'MAX（{最大|さいだい}）'), covers: ['having.MAX'],
          cap: T3('Groups whose highest price is 6000 or more: groups that have at least one such product.', 'いちばん高い price が 6000 以上のグループ。つまり、6000 以上の商品が 1 つでもあるグループ。', 'いちばん {高|たか}い price が 6000 いじょうの グループ。つまり、6000 いじょうの しょうひんが 1つでも ある グループ。'), sql: 'SELECT category, MAX(price)\nFROM products\nGROUP BY category\nHAVING MAX(price) >= 6000;', mark: 'HAVING MAX(price) >= 6000', table: G(['MAX(price)'], 'MAX(price) >= 6000') },
        { label: T3('MIN', 'MIN（最小）', 'MIN（{最小|さいしょう}）'), covers: ['having.MIN'],
          cap: T3('Groups whose smallest stock is 12 or more: groups where every product has 12 or more.', 'いちばん少ない stock が 12 以上のグループ。つまり、全部の商品が 12 以上あるグループ。', 'いちばん {少|すく}ない stock が 12 いじょうの グループ。つまり、ぜんぶの しょうひんが 12 いじょう ある グループ。'), sql: 'SELECT category, MIN(stock)\nFROM products\nGROUP BY category\nHAVING MIN(stock) >= 12;', mark: 'HAVING MIN(stock) >= 12', table: G(['MIN(stock)'], 'MIN(stock) >= 12') }
      ] },
      { type: 'mistake', title: T3('An aggregate in WHERE', '集計の条件を WHERE に書く', '{集計|しゅうけい}の {条件|じょうけん}を WHERE に {書|か}く'),
        wrong: 'SELECT category, COUNT(*)\nFROM products\nWHERE COUNT(*) >= 2\nGROUP BY category;', right: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 2;',
        why: T3('WHERE runs before the groups are made, so COUNT(*) is not known yet (an error). Use HAVING.', 'WHERE はグループを作る前に動くので、まだ COUNT(*) がわからない（エラー）。HAVING に書く。', 'WHERE は グループを つくる まえに うごくので、まだ COUNT(*) が わからない（エラー）。HAVING に {書|か}く。') },
      { type: 'mistake', title: T3('HAVING before GROUP BY', 'HAVING を GROUP BY の前に書く', 'HAVING を GROUP BY の まえに {書|か}く'),
        wrong: 'SELECT category, COUNT(*)\nFROM products\nHAVING COUNT(*) >= 2\nGROUP BY category;', right: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 2;',
        why: T3('First make the groups (GROUP BY), then choose groups (HAVING).', '先にグループを作り（GROUP BY）、そのあとでグループを選ぶ（HAVING）。', 'さきに グループを つくり（GROUP BY）、その あとで グループを えらぶ（HAVING）。') },
      { type: 'quiz', q: T3('How many rows are in the result?', '結果は何行になる？', '{結果|けっか}は {何行|なんぎょう}に なる？'), sql: 'SELECT category, MAX(price)\nFROM products\nGROUP BY category\nHAVING MAX(price) >= 3000;', mark: 'HAVING MAX(price) >= 3000',
        choices: ['2', '3', '4'], answer: e => rowsLeft(e, 'SELECT category FROM products GROUP BY category HAVING MAX(price) >= 3000;'),
        why: T3('>= includes 3000 itself, so Books (highest price 3000) stays. Only Clothing (1800) is removed.', '>= は 3000 ちょうどもふくむので、Books（いちばん高い price が 3000）も残る。消えるのは Clothing（1800）だけ。', '>= は 3000 ちょうども ふくむので、Books（いちばん {高|たか}い price が 3000）も のこる。{消|き}えるのは Clothing（1800）だけ。'),
        before: G(['MAX(price)']), table: G(['MAX(price)'], 'MAX(price) >= 3000') },
      { type: 'points', items: [
        T3('GROUP BY makes the groups; HAVING keeps the groups that match.', 'GROUP BY でグループを作り、HAVING で条件に合うグループを残す。', 'GROUP BY で グループを つくり、HAVING で {条件|じょうけん}に あう グループを のこす。'),
        T3('Write the same aggregate in SELECT and in HAVING, and you can see the value that was checked.', 'SELECT と HAVING に同じ集計を書くと、確かめた値が結果に出る。', 'SELECT と HAVING に おなじ {集計|しゅうけい}を {書|か}くと、たしかめた {値|あたい}が {結果|けっか}に {出|で}る。'),
        T3('Conditions on COUNT, SUM, AVG, MAX, MIN go in HAVING, not WHERE.', 'COUNT・SUM・AVG・MAX・MIN の条件は、WHERE ではなく HAVING に書く。', 'COUNT・SUM・AVG・MAX・MIN の {条件|じょうけん}は、WHERE では なく HAVING に {書|か}く。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 18 */
  wherehaving: {
    goal: T3('Use WHERE (rows) and HAVING (groups) in one query.', 'WHERE（行の条件）と HAVING（グループの条件）を 1 つの文で使う。', 'WHERE（{行|ぎょう}の {条件|じょうけん}）と HAVING（グループの {条件|じょうけん}）を 1つの {文|ぶん}で {使|つか}う。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Look only at products released in 2020 or later. Which categories have 2 or more of them?”', '「2020 年以降に発売した商品だけを見たい。それが 2 つ以上あるカテゴリはどれ？」', '「2020{年|ねん}から あとに {発売|はつばい}した しょうひんだけを {見|み}たい。それが 2つ いじょう ある カテゴリは どれ？」'),
        table: R('SELECT id, name, category, release_year FROM products;', { hl: ['category', 'release_year'] }) },
      { type: 'syntax', notes: [
        T3('Write in this order: FROM → WHERE → GROUP BY → HAVING.', '書く順番：FROM → WHERE → GROUP BY → HAVING。', '{書|か}く じゅんばん：FROM → WHERE → GROUP BY → HAVING。'),
        T3('WHERE: a condition on rows, before the groups are made.', 'WHERE：行の条件。グループを作る「前」に行を絞る。', 'WHERE：{行|ぎょう}の {条件|じょうけん}。グループを つくる「まえ」に {行|ぎょう}を しぼる。'),
        T3('HAVING: a condition on groups, after the calculation.', 'HAVING：グループの条件。集計した「あと」にグループを絞る。', 'HAVING：グループの {条件|じょうけん}。{集計|しゅうけい}した「あと」に グループを しぼる。')] },
      { type: 'anim', title: T3('WHERE first, HAVING later', 'WHERE が先、HAVING があと', 'WHERE が さき、HAVING が あと'), frames: [
        { cap: T3('Start from every row of products.', 'まず、products の全部の行から始まる。', 'まず、products の ぜんぶの {行|ぎょう}から はじまる。'), sql: WH, mark: 'FROM products', table: R('SELECT id, name, category, release_year FROM products;') },
        { cap: T3('WHERE release_year >= 2020: rows are checked. 3 rows are removed.', 'WHERE release_year >= 2020：行を確かめる。3 行が消える。', 'WHERE release_year >= 2020：{行|ぎょう}を たしかめる。3{行|ぎょう}が {消|き}える。'), sql: WH, mark: 'WHERE release_year >= 2020', table: e => checked(e, 'SELECT id, name, category, release_year FROM products;', 'release_year >= 2020', ['release_year']) },
        { cap: T3('GROUP BY category: only the 7 rows that are left are grouped.', 'GROUP BY category：残った 7 行だけをグループにする。', 'GROUP BY category：のこった 7{行|ぎょう}だけを グループに する。'), sql: WH, mark: 'GROUP BY category', table: byCat('release_year', 'release_year >= 2020') },
        { cap: T3('COUNT(*) is calculated for each group.', 'グループごとに COUNT(*) を計算する。', 'グループごとに COUNT(*) を {計算|けいさん}する。'), sql: WH, mark: 'COUNT(*)', table: G(['COUNT(*)'], null, 'release_year >= 2020'), merge: idToCat },
        { cap: T3('HAVING COUNT(*) >= 2: groups are checked. Electronics and Kitchen stay.', 'HAVING COUNT(*) >= 2：グループを確かめる。Electronics と Kitchen が残る。', 'HAVING COUNT(*) >= 2：グループを たしかめる。Electronics と Kitchen が のこる。'), sql: WH, mark: 'HAVING COUNT(*) >= 2', table: G(['COUNT(*)'], 'COUNT(*) >= 2', 'release_year >= 2020') }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('WHERE + HAVING', 'WHERE + HAVING', 'WHERE + HAVING'), covers: ['where+having'],
          cap: T3('Rows from 2020 or later → count per category → 2 or more.', '2020 年以降の行 → category ごとに数える → 2 つ以上。', '2020{年|ねん}から あとの {行|ぎょう} → category ごとに {数|かぞ}える → 2つ いじょう。'), sql: WH, mark: 'HAVING COUNT(*) >= 2', table: G(['COUNT(*)'], 'COUNT(*) >= 2', 'release_year >= 2020') },
        { label: T3('Change WHERE', 'WHERE を変えると', 'WHERE を {変|か}えると'),
          cap: T3('2021 or later: fewer rows are counted, so the counts change. Kitchen now has 1 and is removed.', '2021 年以降にすると、数える行が減り、COUNT(*) が変わる。Kitchen は 1 つになって消える。', '2021{年|ねん}から あとに すると、{数|かぞ}える {行|ぎょう}が へり、COUNT(*) が {変|か}わる。Kitchen は 1つに なって {消|き}える。'), sql: WH.replace('2020', '2021'), mark: 'WHERE release_year >= 2021', table: G(['COUNT(*)'], 'COUNT(*) >= 2', 'release_year >= 2021') },
        { label: T3('Change HAVING', 'HAVING を変えると', 'HAVING を {変|か}えると'),
          cap: T3('3 or more: the counts are the same, but fewer groups pass.', '3 つ以上にすると、COUNT(*) は同じだが、残るグループが減る。', '3つ いじょうに すると、COUNT(*) は おなじだが、のこる グループが へる。'), sql: WH.replace('>= 2;', '>= 3;'), mark: 'HAVING COUNT(*) >= 3', table: G(['COUNT(*)'], 'COUNT(*) >= 3', 'release_year >= 2020') }
      ] },
      { type: 'mistake', title: T3('The count condition in WHERE', '数の条件を WHERE に書く', '{数|かず}の {条件|じょうけん}を WHERE に {書|か}く'),
        wrong: 'SELECT category, COUNT(*)\nFROM products\nWHERE release_year >= 2020 AND COUNT(*) >= 2\nGROUP BY category;', right: WH,
        why: T3('release_year is a value of a row → WHERE. COUNT(*) is a value of a group → HAVING.', 'release_year は「行」の値なので WHERE。COUNT(*) は「グループ」の値なので HAVING。', 'release_year は「{行|ぎょう}」の {値|あたい}なので WHERE。COUNT(*) は「グループ」の {値|あたい}なので HAVING。') },
      { type: 'mistake', title: T3('WHERE after GROUP BY', 'WHERE を GROUP BY のあとに書く', 'WHERE を GROUP BY の あとに {書|か}く'),
        wrong: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nWHERE release_year >= 2020\nHAVING COUNT(*) >= 2;', right: WH,
        why: T3('The order is fixed: WHERE → GROUP BY → HAVING.', '順番は決まっている：WHERE → GROUP BY → HAVING。', 'じゅんばんは きまって いる：WHERE → GROUP BY → HAVING。') },
      { type: 'quiz', q: T3('How many rows are in the result?', '結果は何行になる？', '{結果|けっか}は {何行|なんぎょう}に なる？'), sql: 'SELECT category, COUNT(*)\nFROM products\nWHERE price >= 3000\nGROUP BY category\nHAVING COUNT(*) >= 2;', mark: 'WHERE price >= 3000',
        choices: ['1', '2', '3'], answer: e => rowsLeft(e, 'SELECT category FROM products WHERE price >= 3000 GROUP BY category HAVING COUNT(*) >= 2;'),
        why: T3('Rows with price >= 3000: Electronics 3, Kitchen 2, Books 1. Two groups have 2 or more.', 'price が 3000 以上の行は、Electronics 3 つ、Kitchen 2 つ、Books 1 つ。2 つ以上あるのは 2 グループ。', 'price が 3000 いじょうの {行|ぎょう}は、Electronics 3つ、Kitchen 2つ、Books 1つ。2つ いじょう あるのは 2グループ。'),
        before: e => checked(e, ALL, 'price >= 3000', ['price']), table: G(['COUNT(*)'], 'COUNT(*) >= 2', 'price >= 3000') },
      { type: 'points', items: [
        T3('The database runs FROM → WHERE → GROUP BY → HAVING → SELECT.', 'データベースは FROM → WHERE → GROUP BY → HAVING → SELECT の順に動く。', 'データベースは FROM → WHERE → GROUP BY → HAVING → SELECT の じゅんに うごく。'),
        T3('A condition on a column of a row → WHERE. A condition on COUNT, SUM … → HAVING.', '行の列についての条件は WHERE。COUNT・SUM などの条件は HAVING。', '{行|ぎょう}の {列|れつ}に ついての {条件|じょうけん}は WHERE。COUNT・SUM などの {条件|じょうけん}は HAVING。'),
        T3('Rows removed by WHERE are not counted.', 'WHERE で消えた行は、集計に入らない。', 'WHERE で {消|き}えた {行|ぎょう}は、{集計|しゅうけい}に {入|はい}らない。')] },
      { type: 'practice' }
    ]
  }
};
