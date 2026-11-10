/* =========================================================
 * lectures-c.js — lectures in the new form, Lessons 29–34 (JOIN).
 *
 * Same shape as lectures-a.js. The two tables of the join (customers,
 * orders) are shown side by side above the result (side: [...]);
 * rows that are partners have the same colour.
 * Tables are computed from the data, never typed.
 * ========================================================= */
import { T3, state } from './lecture-kit.js';

const ON = 'customers.id = orders.customer_id';
const count = (e, sql) => { const r = e.exec(sql); return r ? r.values.length : 0; };
/** ids that have a partner in the other table → a colour for each pair; lone = the look of a row with no partner */
const pairs = e => e.exec(`SELECT customers.id FROM customers INNER JOIN orders ON ${ON} ORDER BY 1;`).values.map(v => v[0]);
const look = (e, id, lone) => { const i = pairs(e).indexOf(id); return i >= 0 ? 'g' + i : lone; };
/** the two tables: plain, or with the partners coloured (lone: '' | 'fail' = dropped | 'pick' = kept) */
const TL = (lone, plain) => e => Object.assign(state(e, 'SELECT * FROM customers;', plain ? {} : { hl: ['id'], cls: v => look(e, v[0], lone || '') }), { title: 'customers' });
const TR = (lone, plain) => e => Object.assign(state(e, 'SELECT * FROM orders;', plain ? {} : { hl: ['customer_id'], cls: v => look(e, v[0], lone || '') }), { title: 'orders' });
const PLAIN = [TL('', true), TR('', true)];
const BOTH = (l, r) => [TL(l), TR(r)];
/** the result of a join: the first column is the key (customers.id, or orders.customer_id); a row without a partner is picked out */
const JR = (sql, opts) => e => state(e, sql, Object.assign({ cls: v => look(e, v[0], 'pick') }, opts || {}));
/** the rows of a join checked one by one (✓ kept / ✕ removed) */
const JW = (sql, test, opts) => e => state(e, sql, Object.assign({ cls: (v, c) => (test(v, c) ? 'pass' : 'fail') }, opts || {}));

const INNER = `SELECT *\nFROM customers\nINNER JOIN orders\nON ${ON};`;
const LEFT = `SELECT *\nFROM customers\nLEFT JOIN orders\nON ${ON};`;
const Q_INNER = `SELECT * FROM customers INNER JOIN orders ON ${ON}`;
const Q_LEFT = `SELECT * FROM customers LEFT JOIN orders ON ${ON}`;
const COLS = `SELECT customers.name, orders.item\nFROM customers\nINNER JOIN orders\nON ${ON};`;
const WHERE = `SELECT customers.name, customers.city, orders.amount\nFROM customers\nINNER JOIN orders\nON ${ON}\nWHERE customers.city = 'Osaka';`;
const ANTI = `SELECT customers.id, customers.name\nFROM customers\nLEFT JOIN orders\nON ${ON}\nWHERE orders.customer_id IS NULL;`;
const TOP = dir => `SELECT customers.name, orders.amount\nFROM customers\nLEFT JOIN orders\nON ${ON}\nORDER BY customers.id ${dir}\nLIMIT 3;`;
const who = T3('Shop staff', 'お店のスタッフ', 'お{店|みせ}の スタッフ');

export const LECT_C = {
  /* ------------------------------------------------ Lesson 29 */
  inner: {
    goal: T3('Connect the rows of two tables that belong together.', '2 つの表の、対応する行どうしをつなぐ。', '2つの {表|ひょう}の、あいてに なる {行|ぎょう}どうしを つなぐ。'),
    slides: [
      { type: 'scene', who,
        ask: T3('“I want to see who ordered what. But the names are in customers, and the orders are in orders.”', '「誰が何を注文したか見たい。でも、名前は customers に、注文は orders に入っている。」', '「だれが {何|なに}を {注文|ちゅうもん}したか {見|み}たい。でも、{名前|なまえ}は customers に、{注文|ちゅうもん}は orders に {入|はい}って いる。」'),
        side: PLAIN },
      { type: 'syntax', notes: [
        T3('FROM table1 INNER JOIN table2: put the two tables side by side.', 'FROM 表1 INNER JOIN 表2：2 つの表を横につなぐ。', 'FROM {表|ひょう}1 INNER JOIN {表|ひょう}2：2つの {表|ひょう}を よこに つなぐ。'),
        T3('ON says which rows are partners: customers.id = orders.customer_id', 'ON で「どの行とどの行が相手か」を書く：customers.id = orders.customer_id', 'ON で「どの {行|ぎょう}と どの {行|ぎょう}が あいてか」を {書|か}く：customers.id = orders.customer_id'),
        T3('table.column: the column of that table.', '表.列 ＝ その表の列、という意味。', '{表|ひょう}.{列|れつ} ＝ その {表|ひょう}の {列|れつ}、という いみ。')] },
      { type: 'anim', title: T3('What INNER JOIN does', 'INNER JOIN がすること', 'INNER JOIN が すること'), frames: [
        { cap: T3('Start from the customers table.', 'まず customers から始まる。', 'まず customers から はじまる。'), sql: INNER, mark: 'FROM customers', side: PLAIN, table: e => state(e, 'SELECT * FROM customers;') },
        { cap: T3('ON: a customer and an order are partners when id and customer_id are the same number. Aiko (1) and Dina (4) have no order.', 'ON：id と customer_id が同じ番号なら相手。Aiko（1）と Dina（4）には注文がない。', 'ON：id と customer_id が おなじ {番号|ばんごう}なら あいて。Aiko（1）と Dina（4）には {注文|ちゅうもん}が ない。'), sql: INNER, mark: `ON ${ON}`, side: BOTH('fail', 'fail'), table: e => state(e, 'SELECT * FROM customers;', { hl: ['id'], cls: v => look(e, v[0], 'fail') }) },
        { cap: T3('INNER JOIN: only rows with a partner stay, and the columns of orders are added on the right.', 'INNER JOIN：相手がいる行だけが残り、右側に orders の列がつく。', 'INNER JOIN：あいてが いる {行|ぎょう}だけが のこり、{右|みぎ}がわに orders の {列|れつ}が つく。'), sql: INNER, mark: 'INNER JOIN orders', side: BOTH('fail', 'fail'), table: JR(`${Q_INNER};`) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('INNER JOIN', 'INNER JOIN', 'INNER JOIN'), covers: ['main'],
          cap: T3('3 pairs → 3 rows. Rows without a partner in either table are not in the result.', '相手がいるのは 3 組なので 3 行。どちらの表でも、相手がいない行は結果に出ない。', 'あいてが いるのは 3くみなので 3{行|ぎょう}。どちらの {表|ひょう}でも、あいてが いない {行|ぎょう}は {結果|けっか}に {出|で}ない。'), sql: INNER, mark: 'INNER JOIN orders', side: BOTH('fail', 'fail'), table: JR(`${Q_INNER};`) },
        { label: T3('Tables the other way round', '表を逆に書くと', '{表|ひょう}を ぎゃくに {書|か}くと'),
          cap: T3('The same 3 rows. Only the order of the columns changes: orders first.', '同じ 3 行になる。変わるのは列の順番だけ（orders の列が先）。', 'おなじ 3{行|ぎょう}に なる。{変|か}わるのは {列|れつ}の じゅんばんだけ（orders の {列|れつ}が さき）。'), sql: 'SELECT *\nFROM orders\nINNER JOIN customers\nON orders.customer_id = customers.id;', mark: 'FROM orders\nINNER JOIN customers', side: [TR('fail'), TL('fail')], table: JR('SELECT * FROM orders INNER JOIN customers ON orders.customer_id = customers.id;') }
      ] },
      { type: 'mistake', title: T3('No ON', 'ON を書き忘れる', 'ON を {書|か}きわすれる'),
        wrong: 'SELECT *\nFROM customers\nINNER JOIN orders;', right: INNER,
        why: T3('Without ON every row is joined with every row: 5 × 5 = 25 rows.', 'ON がないと、全部の行どうしがつながる。5 × 5 = 25 行になってしまう。', 'ON が ないと、ぜんぶの {行|ぎょう}どうしが つながる。5 × 5 = 25{行|ぎょう}に なって しまう。') },
      { type: 'mistake', title: T3('The wrong column in ON', 'ON の列が違う', 'ON の {列|れつ}が ちがう'),
        wrong: 'SELECT *\nFROM customers\nINNER JOIN orders\nON customers.id = orders.id;', right: INNER,
        why: T3('orders has no id column. Look at the tables: the column that points to a customer is customer_id.', 'orders に id という列はない。表を見て確かめる：お客さんを指す列は customer_id。', 'orders に id という {列|れつ}は ない。{表|ひょう}を {見|み}て たしかめる：おきゃくさんを さす {列|れつ}は customer_id。') },
      { type: 'quiz', q: T3('How many rows are in the result?', '結果は何行になる？', '{結果|けっか}は {何行|なんぎょう}に なる？'), sql: INNER, mark: 'INNER JOIN orders',
        choices: ['3', '5', '7'], answer: e => count(e, `${Q_INNER};`),
        why: T3('Only the pairs: 2, 3 and 5 are in both tables. 3 rows.', '相手がいる組だけ。両方の表にある番号は 2・3・5 の 3 つなので、3 行。', 'あいてが いる くみだけ。りょうほうの {表|ひょう}に ある {番号|ばんごう}は 2・3・5 の 3つなので、3{行|ぎょう}。'),
        side: PLAIN, table: JR(`${Q_INNER};`) },
      { type: 'points', items: [
        T3('INNER JOIN puts two tables side by side; ON says which rows are partners.', 'INNER JOIN で 2 つの表を横につなぐ。ON で相手を決める。', 'INNER JOIN で 2つの {表|ひょう}を よこに つなぐ。ON で あいてを きめる。'),
        T3('Only rows that have a partner are in the result.', '結果に出るのは、相手がいる行だけ。', '{結果|けっか}に {出|で}るのは、あいてが いる {行|ぎょう}だけ。'),
        T3('First look at both tables: which columns hold the same numbers?', 'まず 2 つの表を見て、同じ番号が入っている列を探す。', 'まず 2つの {表|ひょう}を {見|み}て、おなじ {番号|ばんごう}が {入|はい}って いる {列|れつ}を さがす。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 30 */
  innercols: {
    goal: T3('Choose columns from two joined tables.', 'つないだ 2 つの表から、ほしい列を選ぶ。', 'つないだ 2つの {表|ひょう}から、ほしい {列|れつ}を えらぶ。'),
    slides: [
      { type: 'scene', who,
        ask: T3('“I only need the customer\'s name and the item.”', '「お客さんの名前と、商品の名前だけあればいい。」', '「おきゃくさんの {名前|なまえ}と、しょうひんの {名前|なまえ}だけ あれば いい。」'),
        side: PLAIN },
      { type: 'syntax', notes: [
        T3('After a join you can use the columns of both tables.', 'つないだあとは、両方の表の列が使える。', 'つないだ あとは、りょうほうの {表|ひょう}の {列|れつ}が {使|つか}える。'),
        T3('Write table.column: customers.name, orders.item', '表.列 の形で書く：customers.name、orders.item', '{表|ひょう}.{列|れつ} の かたちで {書|か}く：customers.name、orders.item'),
        T3('The table name shows where the column comes from.', '表の名前をつけると、どの表の列かがはっきりする。', '{表|ひょう}の {名前|なまえ}を つけると、どの {表|ひょう}の {列|れつ}かが はっきり する。')] },
      { type: 'anim', title: T3('Join first, then choose columns', '先につなぎ、あとで列を選ぶ', 'さきに つなぎ、あとで {列|れつ}を えらぶ'), frames: [
        { cap: T3('INNER JOIN: 3 rows with the columns of both tables.', 'INNER JOIN：両方の表の列がある 3 行ができる。', 'INNER JOIN：りょうほうの {表|ひょう}の {列|れつ}が ある 3{行|ぎょう}が できる。'), sql: COLS, mark: `INNER JOIN orders\nON ${ON}`, side: BOTH('fail', 'fail'), table: JR(`${Q_INNER};`) },
        { cap: T3('SELECT customers.name, orders.item: name from customers, item from orders.', 'SELECT customers.name, orders.item：customers の name と、orders の item。', 'SELECT customers.name, orders.item：customers の name と、orders の item。'), sql: COLS, mark: 'customers.name, orders.item', side: BOTH('fail', 'fail'), table: JR(`${Q_INNER};`, { hl: ['name', 'item'], dim: true }) },
        { cap: T3('Only the two columns stay.', 'その 2 列だけが残る。', 'その 2{列|れつ}だけが のこる。'), sql: COLS, mark: 'customers.name, orders.item', side: BOTH('fail', 'fail'), table: JR(`SELECT customers.id, customers.name, orders.item FROM customers INNER JOIN orders ON ${ON};`, { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Text of the other table', '相手の表の文字の列', 'あいての {表|ひょう}の {文字|もじ}の {列|れつ}'), covers: ['right.text'],
          cap: T3('The name (customers) and the item (orders).', '名前（customers）と、商品名（orders）。', '{名前|なまえ}（customers）と、しょうひんの {名前|なまえ}（orders）。'), sql: COLS, mark: 'orders.item', side: BOTH('fail', 'fail'), table: JR(`SELECT customers.id, customers.name, orders.item FROM customers INNER JOIN orders ON ${ON};`, { hide: ['id'], hl: ['item'] }) },
        { label: T3('Number of the other table', '相手の表の数字の列', 'あいての {表|ひょう}の {数字|すうじ}の {列|れつ}'), covers: ['right.num'],
          cap: T3('The name (customers) and the amount (orders).', '名前（customers）と、金額（orders）。', '{名前|なまえ}（customers）と、きんがく（orders）。'), sql: COLS.replace('orders.item', 'orders.amount'), mark: 'orders.amount', side: BOTH('fail', 'fail'), table: JR(`SELECT customers.id, customers.name, orders.amount FROM customers INNER JOIN orders ON ${ON};`, { hide: ['id'], hl: ['amount'] }) }
      ] },
      { type: 'mistake', title: T3('The same column name in both tables', '両方の表に同じ名前の列がある', 'りょうほうの {表|ひょう}に おなじ {名前|なまえ}の {列|れつ}が ある'),
        wrong: 'SELECT id, column_b1\nFROM table_a\nINNER JOIN table_b\nON table_a.id = table_b.id;', right: 'SELECT table_a.id, table_b.column_b1\nFROM table_a\nINNER JOIN table_b\nON table_a.id = table_b.id;',
        why: T3('table_a and table_b both have id, so “id” alone is not clear (an error). Write table_a.id.', 'table_a にも table_b にも id がある。id だけでは、どちらの列かわからずエラーになる。table_a.id と書く。', 'table_a にも table_b にも id が ある。id だけでは、どちらの {列|れつ}か わからず エラーに なる。table_a.id と {書|か}く。') },
      { type: 'mistake', title: T3('The column is in the other table', '列がある表を間違える', '{列|れつ}が ある {表|ひょう}を まちがえる'),
        wrong: `SELECT customers.name, customers.item\nFROM customers\nINNER JOIN orders\nON ${ON};`, right: COLS,
        why: T3('item is a column of orders, not customers (an error). Check the tables.', 'item は customers ではなく orders の列（エラーになる）。表を見て確かめる。', 'item は customers では なく orders の {列|れつ}（エラーに なる）。{表|ひょう}を {見|み}て たしかめる。') },
      { type: 'quiz', q: T3('You want the name and the amount. What do you write after SELECT?', 'name と amount を出したい。SELECT のあとに書くのはどれ？', 'name と amount を {出|だ}したい。SELECT の あとに {書|か}くのは どれ？'),
        choices: ['orders.name, customers.amount', 'customers.name, orders.amount', 'name.customers, amount.orders'], answer: 1,
        why: T3('table.column, and each column with its own table: name is in customers, amount is in orders.', '表.列 の順番で書く。name は customers、amount は orders にある。', '{表|ひょう}.{列|れつ} の じゅんばんで {書|か}く。name は customers、amount は orders に ある。'),
        side: PLAIN, table: JR(`SELECT customers.id, customers.name, orders.amount FROM customers INNER JOIN orders ON ${ON};`, { hide: ['id'] }) },
      { type: 'points', items: [
        T3('The database runs FROM → JOIN … ON → SELECT: join first, columns last.', 'データベースは FROM → JOIN … ON → SELECT の順に動く。先につなぎ、最後に列を選ぶ。', 'データベースは FROM → JOIN … ON → SELECT の じゅんに うごく。さきに つなぎ、さいごに {列|れつ}を えらぶ。'),
        T3('Write table.column, in SELECT and in ON.', 'SELECT でも ON でも、表.列 の形で書く。', 'SELECT でも ON でも、{表|ひょう}.{列|れつ} の かたちで {書|か}く。'),
        T3('When both tables have a column of the same name, the table name is needed.', '両方の表に同じ名前の列があるときは、表の名前がかならず必要。', 'りょうほうの {表|ひょう}に おなじ {名前|なまえ}の {列|れつ}が ある ときは、{表|ひょう}の {名前|なまえ}が かならず いる。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 31 */
  innerwhere: {
    goal: T3('Join two tables, then keep only the rows that match a condition.', '2 つの表をつないでから、条件に合う行だけを残す。', '2つの {表|ひょう}を つないでから、{条件|じょうけん}に あう {行|ぎょう}だけを のこす。'),
    slides: [
      { type: 'scene', who,
        ask: T3('“Show me the orders of the customers in Osaka only.”', '「Osaka のお客さんの注文だけ見せて。」', '「Osaka の おきゃくさんの {注文|ちゅうもん}だけ {見|み}せて。」'),
        side: [e => Object.assign(state(e, 'SELECT * FROM customers;', { hl: ['city'] }), { title: 'customers' }), TR('', true)] },
      { type: 'syntax', notes: [
        T3('WHERE comes after ON.', 'WHERE は ON のあとに書く。', 'WHERE は ON の あとに {書|か}く。'),
        T3('ON: which rows are partners. WHERE: which joined rows to keep.', 'ON は「相手を決める」条件。WHERE は「つないだ行のうち、どれを残すか」の条件。', 'ON は「あいてを きめる」{条件|じょうけん}。WHERE は「つないだ {行|ぎょう}の うち、どれを のこすか」の {条件|じょうけん}。'),
        T3("In WHERE also write table.column: customers.city = 'Osaka'", "WHERE でも 表.列 の形で書く：customers.city = 'Osaka'", "WHERE でも {表|ひょう}.{列|れつ} の かたちで {書|か}く：customers.city = 'Osaka'")] },
      { type: 'anim', title: T3('Join, then WHERE', 'つないでから WHERE', 'つないでから WHERE'), frames: [
        { cap: T3('INNER JOIN: the 3 rows that have a partner.', 'INNER JOIN：相手がいる 3 行ができる。', 'INNER JOIN：あいてが いる 3{行|ぎょう}が できる。'), sql: WHERE, mark: `INNER JOIN orders\nON ${ON}`, side: BOTH('fail', 'fail'), table: JR(`${Q_INNER};`) },
        { cap: T3("WHERE customers.city = 'Osaka': the joined rows are checked, one by one.", "WHERE customers.city = 'Osaka'：つないだ行を 1 行ずつ確かめる。", "WHERE customers.city = 'Osaka'：つないだ {行|ぎょう}を 1{行|ぎょう}ずつ たしかめる。"), sql: WHERE, mark: "WHERE customers.city = 'Osaka'", side: BOTH('fail', 'fail'), table: JW(`${Q_INNER};`, v => v[2] === 'Osaka', { hl: ['city'] }) },
        { cap: T3('Then SELECT chooses the columns.', 'そのあと SELECT で列を選ぶ。', 'その あと SELECT で {列|れつ}を えらぶ。'), sql: WHERE, mark: 'customers.name, customers.city, orders.amount', side: BOTH('fail', 'fail'), table: JR(`SELECT customers.id, customers.name, customers.city, orders.amount FROM customers INNER JOIN orders ON ${ON} WHERE customers.city = 'Osaka';`, { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('WHERE on text', '文字の条件', '{文字|もじ}の {条件|じょうけん}'), covers: ['main'],
          cap: T3('Of the 3 joined rows, the ones whose city is Osaka. (Aiko is in Osaka too, but has no order.)', 'つないだ 3 行のうち、city が Osaka の行。（Aiko も Osaka だが、注文がないので出ない）', 'つないだ 3{行|ぎょう}の うち、city が Osaka の {行|ぎょう}。（Aiko も Osaka だが、{注文|ちゅうもん}が ないので {出|で}ない）'), sql: WHERE, mark: "WHERE customers.city = 'Osaka'", side: BOTH('fail', 'fail'), table: JW(`SELECT customers.id, customers.name, customers.city, orders.amount FROM customers INNER JOIN orders ON ${ON};`, v => v[2] === 'Osaka', { hide: ['id'], hl: ['city'] }) },
        { label: T3('WHERE on the other table', '相手の表の列で絞る', 'あいての {表|ひょう}の {列|れつ}で しぼる'),
          cap: T3('You can use a column of orders too: amount 20000 or more.', 'orders の列も条件に使える：amount が 20000 以上。', 'orders の {列|れつ}も {条件|じょうけん}に {使|つか}える：amount が 20000 いじょう。'), sql: WHERE.replace("customers.city = 'Osaka'", 'orders.amount >= 20000'), mark: 'WHERE orders.amount >= 20000', side: BOTH('fail', 'fail'), table: JW(`SELECT customers.id, customers.name, customers.city, orders.amount FROM customers INNER JOIN orders ON ${ON};`, v => v[3] >= 20000, { hide: ['id'], hl: ['amount'] }) }
      ] },
      { type: 'mistake', title: T3('WHERE before the join', 'WHERE を JOIN の前に書く', 'WHERE を JOIN の まえに {書|か}く'),
        wrong: `SELECT customers.name, customers.city, orders.amount\nFROM customers\nWHERE customers.city = 'Osaka'\nINNER JOIN orders\nON ${ON};`, right: WHERE,
        why: T3('The order is fixed: FROM → INNER JOIN … ON → WHERE.', '順番は決まっている：FROM → INNER JOIN … ON → WHERE。', 'じゅんばんは きまって いる：FROM → INNER JOIN … ON → WHERE。') },
      { type: 'mistake', title: T3('Text without quotes', "文字に ' ' がない", "{文字|もじ}に ' ' が ない"),
        wrong: WHERE.replace("'Osaka'", 'Osaka'), right: WHERE,
        why: T3('Without quotes, Osaka is read as a column name (an error).', "' ' がないと、Osaka が列の名前だと思われてエラーになる。", "' ' が ないと、Osaka が {列|れつ}の {名前|なまえ}だと おもわれて エラーに なる。") },
      { type: 'quiz', q: T3('How many rows are in the result?', '結果は何行になる？', '{結果|けっか}は {何行|なんぎょう}に なる？'), sql: WHERE.replace('Osaka', 'Tokyo'), mark: "WHERE customers.city = 'Tokyo'",
        choices: ['1', '2', '3'], answer: e => count(e, `${Q_INNER} WHERE customers.city = 'Tokyo';`),
        why: T3('Two customers are in Tokyo, but Dina has no order: INNER JOIN drops her first. Only Ben is left.', 'Tokyo のお客さんは 2 人いるが、Dina には注文がない。INNER JOIN で先に消えるので、残るのは Ben だけ。', 'Tokyo の おきゃくさんは ふたり いるが、Dina には {注文|ちゅうもん}が ない。INNER JOIN で さきに {消|き}えるので、のこるのは Ben だけ。'),
        side: BOTH('fail', 'fail'), table: JW(`SELECT customers.id, customers.name, customers.city, orders.amount FROM customers INNER JOIN orders ON ${ON};`, v => v[2] === 'Tokyo', { hide: ['id'], hl: ['city'] }) },
      { type: 'points', items: [
        T3('The database runs FROM → JOIN … ON → WHERE → SELECT.', 'データベースは FROM → JOIN … ON → WHERE → SELECT の順に動く。', 'データベースは FROM → JOIN … ON → WHERE → SELECT の じゅんに うごく。'),
        T3('ON connects the tables; WHERE filters the joined rows.', 'ON は表をつなぐ条件。WHERE はつないだ行を絞る条件。', 'ON は {表|ひょう}を つなぐ {条件|じょうけん}。WHERE は つないだ {行|ぎょう}を しぼる {条件|じょうけん}。'),
        T3('WHERE can use columns of both tables.', 'WHERE には、どちらの表の列も使える。', 'WHERE には、どちらの {表|ひょう}の {列|れつ}も {使|つか}える。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 32 */
  left: {
    goal: T3('Keep every row of the left table, with or without a partner.', '左の表の行を、相手がいなくても全部残してつなぐ。', '{左|ひだり}の {表|ひょう}の {行|ぎょう}を、あいてが いなくても ぜんぶ のこして つなぐ。'),
    slides: [
      { type: 'scene', who,
        ask: T3('“I want a list of all customers with their orders. Customers without an order too.”', '「お客さん全員の一覧に、注文をつけたい。注文していない人も一覧に入れて。」', '「おきゃくさん ぜんいんの いちらんに、{注文|ちゅうもん}を つけたい。{注文|ちゅうもん}して いない {人|ひと}も いちらんに {入|い}れて。」'),
        side: BOTH('pick', '') },
      { type: 'syntax', notes: [
        T3('LEFT JOIN: every row of the left table (the one after FROM) stays.', 'LEFT JOIN：左の表（FROM のあとに書いた表）の行は全部残る。', 'LEFT JOIN：{左|ひだり}の {表|ひょう}（FROM の あとに {書|か}いた {表|ひょう}）の {行|ぎょう}は ぜんぶ のこる。'),
        T3('A row without a partner gets NULL in the columns of the right table.', '相手がいない行は、右の表の列が NULL になる。', 'あいてが いない {行|ぎょう}は、{右|みぎ}の {表|ひょう}の {列|れつ}が NULL に なる。'),
        T3('ON is written the same way as with INNER JOIN.', 'ON の書き方は INNER JOIN と同じ。', 'ON の {書|か}き{方|かた}は INNER JOIN と おなじ。')] },
      { type: 'anim', title: T3('What LEFT JOIN does', 'LEFT JOIN がすること', 'LEFT JOIN が すること'), frames: [
        { cap: T3('Start from customers: the left table.', 'まず customers（左の表）から始まる。', 'まず customers（{左|ひだり}の {表|ひょう}）から はじまる。'), sql: LEFT, mark: 'FROM customers', side: PLAIN, table: e => state(e, 'SELECT * FROM customers;') },
        { cap: T3('ON: find the partners. Aiko (1) and Dina (4) have no order.', 'ON：相手を探す。Aiko（1）と Dina（4）には注文がない。', 'ON：あいてを さがす。Aiko（1）と Dina（4）には {注文|ちゅうもん}が ない。'), sql: LEFT, mark: `ON ${ON}`, side: BOTH('pick', 'fail'), table: e => state(e, 'SELECT * FROM customers;', { hl: ['id'], cls: v => look(e, v[0], 'pick') }) },
        { cap: T3('LEFT JOIN: all 5 customers stay. Where there is no order, the columns of orders are NULL.', 'LEFT JOIN：お客さんは 5 人とも残る。注文がない行は、orders の列が NULL になる。', 'LEFT JOIN：おきゃくさんは 5{人|にん}とも のこる。{注文|ちゅうもん}が ない {行|ぎょう}は、orders の {列|れつ}が NULL に なる。'), sql: LEFT, mark: 'LEFT JOIN orders', side: BOTH('pick', 'fail'), table: JR(`${Q_LEFT};`) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('LEFT JOIN', 'LEFT JOIN', 'LEFT JOIN'), covers: ['main'],
          cap: T3('5 rows: every customer. Orders that point to no customer (6, 7) are not in the result.', '5 行：お客さん全員。お客さんがいない注文（6・7）は結果に出ない。', '5{行|ぎょう}：おきゃくさん ぜんいん。おきゃくさんが いない {注文|ちゅうもん}（6・7）は {結果|けっか}に {出|で}ない。'), sql: LEFT, mark: 'LEFT JOIN orders', side: BOTH('pick', 'fail'), table: JR(`${Q_LEFT};`) },
        { label: T3('Compare: INNER JOIN', '比べる：INNER JOIN', 'くらべる：INNER JOIN'),
          cap: T3('INNER JOIN: 3 rows. Aiko and Dina are gone.', 'INNER JOIN だと 3 行。Aiko と Dina が消える。', 'INNER JOIN だと 3{行|ぎょう}。Aiko と Dina が {消|き}える。'), sql: INNER, mark: 'INNER JOIN orders', side: BOTH('fail', 'fail'), table: JR(`${Q_INNER};`) },
        { label: T3('Tables the other way round', '表を逆に書くと', '{表|ひょう}を ぎゃくに {書|か}くと'),
          cap: T3('Now orders is the left table: every order stays, and orders 6 and 7 get NULL.', '今度は orders が左の表。注文が全部残り、6・7 の注文は customers の列が NULL になる。', 'こんどは orders が {左|ひだり}の {表|ひょう}。{注文|ちゅうもん}が ぜんぶ のこり、6・7 の {注文|ちゅうもん}は customers の {列|れつ}が NULL に なる。'), sql: 'SELECT *\nFROM orders\nLEFT JOIN customers\nON orders.customer_id = customers.id;', mark: 'FROM orders\nLEFT JOIN customers', side: [TR('pick'), TL('fail')], table: JR('SELECT * FROM orders LEFT JOIN customers ON orders.customer_id = customers.id;') }
      ] },
      { type: 'mistake', title: T3('The tables the wrong way round', '表の順番を逆に書く', '{表|ひょう}の じゅんばんを ぎゃくに {書|か}く'),
        wrong: 'SELECT *\nFROM orders\nLEFT JOIN customers\nON orders.customer_id = customers.id;', right: LEFT,
        why: T3('The table after FROM is the one that keeps all its rows. To keep every customer, write FROM customers.', '全部残るのは、FROM のあとに書いた表。お客さんを全員残したいなら FROM customers と書く。', 'ぜんぶ のこるのは、FROM の あとに {書|か}いた {表|ひょう}。おきゃくさんを ぜんいん のこしたいなら FROM customers と {書|か}く。') },
      { type: 'mistake', title: T3('INNER JOIN instead of LEFT JOIN', 'LEFT JOIN のかわりに INNER JOIN と書く', 'LEFT JOIN の かわりに INNER JOIN と {書|か}く'),
        wrong: INNER, right: LEFT,
        why: T3('INNER JOIN drops the customers without an order. “All …”, “also those without …” → LEFT JOIN.', 'INNER JOIN だと、注文のないお客さんが消える。「全員」「〜がない人も」とあったら LEFT JOIN。', 'INNER JOIN だと、{注文|ちゅうもん}の ない おきゃくさんが {消|き}える。「ぜんいん」「〜が ない {人|ひと}も」と あったら LEFT JOIN。') },
      { type: 'quiz', q: T3('How many rows are in the result?', '結果は何行になる？', '{結果|けっか}は {何行|なんぎょう}に なる？'), sql: LEFT, mark: 'LEFT JOIN orders',
        choices: ['3', '5', '7'], answer: e => count(e, `${Q_LEFT};`),
        why: T3('Every row of the left table: customers has 5 rows.', '左の表の行が全部残る。customers は 5 行。', '{左|ひだり}の {表|ひょう}の {行|ぎょう}が ぜんぶ のこる。customers は 5{行|ぎょう}。'),
        side: PLAIN, table: JR(`${Q_LEFT};`) },
      { type: 'points', items: [
        T3('LEFT JOIN keeps every row of the left table (after FROM).', 'LEFT JOIN は、左の表（FROM のあと）の行を全部残す。', 'LEFT JOIN は、{左|ひだり}の {表|ひょう}（FROM の あと）の {行|ぎょう}を ぜんぶ のこす。'),
        T3('No partner → NULL in the columns of the right table.', '相手がいない行は、右の表の列が NULL になる。', 'あいてが いない {行|ぎょう}は、{右|みぎ}の {表|ひょう}の {列|れつ}が NULL に なる。'),
        T3('INNER JOIN: only pairs. LEFT JOIN: pairs + the rest of the left table.', 'INNER JOIN は相手がいる行だけ。LEFT JOIN はそれに加えて、左の表の残りの行も出る。', 'INNER JOIN は あいてが いる {行|ぎょう}だけ。LEFT JOIN は それに くわえて、{左|ひだり}の {表|ひょう}の のこりの {行|ぎょう}も {出|で}る。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 33 */
  antijoin: {
    goal: T3('Find the rows that have no partner in the other table.', '相手の表に対応する行が「ない」行を見つける。', 'あいての {表|ひょう}に あいてが「ない」{行|ぎょう}を {見|み}つける。'),
    slides: [
      { type: 'scene', who,
        ask: T3('“Which customers have never ordered? I want to send them a coupon.”', '「まだ一度も注文していないお客さんは誰？クーポンを送りたい。」', '「まだ いちども {注文|ちゅうもん}して いない おきゃくさんは だれ？クーポンを おくりたい。」'),
        side: BOTH('pick', '') },
      { type: 'syntax', notes: [
        T3('First LEFT JOIN: rows without a partner get NULL.', 'まず LEFT JOIN でつなぐ。相手がいない行は NULL になる。', 'まず LEFT JOIN で つなぐ。あいてが いない {行|ぎょう}は NULL に なる。'),
        T3('Then WHERE … IS NULL keeps exactly those rows.', '次に WHERE … IS NULL で、その行だけを残す。', 'つぎに WHERE … IS NULL で、その {行|ぎょう}だけを のこす。'),
        T3('Check the column of the right table used in ON: orders.customer_id', 'IS NULL で確かめるのは、ON に使った右の表の列：orders.customer_id', 'IS NULL で たしかめるのは、ON に {使|つか}った {右|みぎ}の {表|ひょう}の {列|れつ}：orders.customer_id')] },
      { type: 'anim', title: T3('LEFT JOIN, then IS NULL', 'LEFT JOIN してから IS NULL', 'LEFT JOIN してから IS NULL'), frames: [
        { cap: T3('LEFT JOIN: all 5 customers. Aiko and Dina have NULL in the columns of orders.', 'LEFT JOIN：お客さん 5 人が全部残る。Aiko と Dina は orders の列が NULL。', 'LEFT JOIN：おきゃくさん 5{人|にん}が ぜんぶ のこる。Aiko と Dina は orders の {列|れつ}が NULL。'), sql: ANTI, mark: `LEFT JOIN orders\nON ${ON}`, side: BOTH('pick', 'fail'), table: JR(`${Q_LEFT};`) },
        { cap: T3('WHERE orders.customer_id IS NULL: keep the rows where it is NULL.', 'WHERE orders.customer_id IS NULL：NULL の行だけを残す。', 'WHERE orders.customer_id IS NULL：NULL の {行|ぎょう}だけを のこす。'), sql: ANTI, mark: 'WHERE orders.customer_id IS NULL', side: BOTH('pick', 'fail'), table: JW(`${Q_LEFT};`, v => v[3] === null, { hl: ['customer_id'] }) },
        { cap: T3('SELECT customers.id, customers.name: the customers with no order.', 'SELECT customers.id, customers.name：注文のないお客さんがわかる。', 'SELECT customers.id, customers.name：{注文|ちゅうもん}の ない おきゃくさんが わかる。'), sql: ANTI, mark: 'customers.id, customers.name', side: BOTH('pick', 'fail'), table: JR(`SELECT customers.id, customers.name FROM customers LEFT JOIN orders ON ${ON} WHERE orders.customer_id IS NULL;`) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('IS NULL', 'IS NULL（相手がいない）', 'IS NULL（あいてが いない）'), covers: ['main'],
          cap: T3('The rows without a partner: Aiko and Dina.', '相手がいない行：Aiko と Dina。', 'あいてが いない {行|ぎょう}：Aiko と Dina。'), sql: ANTI, mark: 'IS NULL', side: BOTH('pick', 'fail'), table: JW(`SELECT customers.id, customers.name, orders.customer_id FROM customers LEFT JOIN orders ON ${ON};`, v => v[2] === null, { hl: ['customer_id'] }) },
        { label: T3('IS NOT NULL', 'IS NOT NULL（相手がいる）', 'IS NOT NULL（あいてが いる）'),
          cap: T3('The opposite: the customers who have an order. (The same rows as INNER JOIN.)', '反対に、注文があるお客さん。（INNER JOIN と同じ行になる）', 'はんたいに、{注文|ちゅうもん}が ある おきゃくさん。（INNER JOIN と おなじ {行|ぎょう}に なる）'), sql: ANTI.replace('IS NULL', 'IS NOT NULL'), mark: 'IS NOT NULL', side: BOTH('pick', 'fail'), table: JW(`SELECT customers.id, customers.name, orders.customer_id FROM customers LEFT JOIN orders ON ${ON};`, v => v[2] !== null, { hl: ['customer_id'] }) }
      ] },
      { type: 'mistake', title: T3('= NULL', '= NULL と書く', '= NULL と {書|か}く'),
        wrong: ANTI.replace('IS NULL', '= NULL'), right: ANTI,
        why: T3('NULL cannot be compared with =. The result is empty. Write IS NULL.', 'NULL は = では比べられない。結果が 0 行になる。IS NULL と書く。', 'NULL は = では くらべられない。{結果|けっか}が 0{行|ぎょう}に なる。IS NULL と {書|か}く。') },
      { type: 'mistake', title: T3('INNER JOIN', 'INNER JOIN でつなぐ', 'INNER JOIN で つなぐ'),
        wrong: ANTI.replace('LEFT JOIN', 'INNER JOIN'), right: ANTI,
        why: T3('INNER JOIN has already dropped the rows without a partner, so no NULL is left: 0 rows.', 'INNER JOIN では、相手がいない行が先に消えている。NULL の行がないので、結果は 0 行。', 'INNER JOIN では、あいてが いない {行|ぎょう}が さきに {消|き}えて いる。NULL の {行|ぎょう}が ないので、{結果|けっか}は 0{行|ぎょう}。') },
      { type: 'quiz', q: T3('What is in the result?', '結果に出るのはどれ？', '{結果|けっか}に {出|で}るのは どれ？'), sql: 'SELECT orders.item\nFROM orders\nLEFT JOIN customers\nON orders.customer_id = customers.id\nWHERE customers.id IS NULL;', mark: 'FROM orders\nLEFT JOIN customers',
        choices: ['Aiko, Dina', 'Lamp, Monitor', 'Laptop, Desk, Chair'], answer: 1,
        why: T3('Here orders is the left table. The orders with no customer (6, 7) are Lamp and Monitor.', 'ここでは orders が左の表。お客さんがいない注文（6・7）は Lamp と Monitor。', 'ここでは orders が {左|ひだり}の {表|ひょう}。おきゃくさんが いない {注文|ちゅうもん}（6・7）は Lamp と Monitor。'),
        side: PLAIN, table: JW('SELECT * FROM orders LEFT JOIN customers ON orders.customer_id = customers.id;', v => v[3] === null, { hl: ['id'] }) },
      { type: 'points', items: [
        T3('“Has no …”, “never …” → LEFT JOIN + WHERE … IS NULL.', '「〜がない」「一度も〜していない」を探すときは、LEFT JOIN + WHERE … IS NULL。', '「〜が ない」「いちども 〜して いない」を さがす ときは、LEFT JOIN + WHERE … IS NULL。'),
        T3('The table you want rows from is the left one.', '行を取り出したい表を、左（FROM のあと）に書く。', '{行|ぎょう}を とりだしたい {表|ひょう}を、{左|ひだり}（FROM の あと）に {書|か}く。'),
        T3('IS NULL, not = NULL.', '= NULL ではなく IS NULL。', '= NULL では なく IS NULL。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 34 */
  leftorder: {
    goal: T3('Join, sort and take the first rows.', 'つないで、並べ替えて、上から何行かを取り出す。', 'つないで、ならべかえて、{上|うえ}から {何行|なんぎょう}かを とりだす。'),
    slides: [
      { type: 'scene', who,
        ask: T3('“The first 3 customers by id, with the amount of their order. Customers without an order too.”', '「id の小さい順に 3 人、注文の金額といっしょに見せて。注文がない人も入れて。」', '「id の {小|ちい}さい じゅんに 3{人|にん}、{注文|ちゅうもん}の きんがくと いっしょに {見|み}せて。{注文|ちゅうもん}が ない {人|ひと}も {入|い}れて。」'),
        side: BOTH('pick', '') },
      { type: 'syntax', notes: [
        T3('ORDER BY and LIMIT come last, after the join.', 'ORDER BY と LIMIT は、つないだあと、最後に書く。', 'ORDER BY と LIMIT は、つないだ あと、さいごに {書|か}く。'),
        T3('ORDER BY table.column ASC (small → large) or DESC (large → small).', 'ORDER BY 表.列 ASC（小さい順）／ DESC（大きい順）。', 'ORDER BY {表|ひょう}.{列|れつ} ASC（{小|ちい}さい じゅん）／ DESC（{大|おお}きい じゅん）。'),
        T3('LIMIT n: the first n rows.', 'LIMIT n：上から n 行。', 'LIMIT n：{上|うえ}から n{行|ぎょう}。')] },
      { type: 'anim', title: T3('Join → sort → first rows', 'つなぐ → 並べる → 上から取る', 'つなぐ → ならべる → {上|うえ}から とる'), frames: [
        { cap: T3('LEFT JOIN: all 5 customers.', 'LEFT JOIN：お客さん 5 人が全部残る。', 'LEFT JOIN：おきゃくさん 5{人|にん}が ぜんぶ のこる。'), sql: TOP('DESC'), mark: `LEFT JOIN orders\nON ${ON}`, side: BOTH('pick', 'fail'), table: JR(`${Q_LEFT};`) },
        { cap: T3('ORDER BY customers.id DESC: the largest id first.', 'ORDER BY customers.id DESC：id の大きい順に並べる。', 'ORDER BY customers.id DESC：id の {大|おお}きい じゅんに ならべる。'), sql: TOP('DESC'), mark: 'ORDER BY customers.id DESC', side: BOTH('pick', 'fail'), table: JR(`${Q_LEFT} ORDER BY customers.id DESC;`, { hl: ['id'] }) },
        { cap: T3('LIMIT 3: the first 3 rows stay.', 'LIMIT 3：上から 3 行だけ残る。', 'LIMIT 3：{上|うえ}から 3{行|ぎょう}だけ のこる。'), sql: TOP('DESC'), mark: 'LIMIT 3', side: BOTH('pick', 'fail'), table: JR(`${Q_LEFT} ORDER BY customers.id DESC LIMIT 3;`, { hl: ['id'] }) },
        { cap: T3('SELECT customers.name, orders.amount. Dina has no order: her amount is NULL.', 'SELECT customers.name, orders.amount。Dina は注文がないので、amount は NULL。', 'SELECT customers.name, orders.amount。Dina は {注文|ちゅうもん}が ないので、amount は NULL。'), sql: TOP('DESC'), mark: 'customers.name, orders.amount', side: BOTH('pick', 'fail'), table: JR(`SELECT customers.id, customers.name, orders.amount FROM customers LEFT JOIN orders ON ${ON} ORDER BY customers.id DESC LIMIT 3;`, { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('ASC', 'ASC（小さい順）', 'ASC（{小|ちい}さい じゅん）'), covers: ['asc', 'limit'],
          cap: T3('id 1, 2, 3. Aiko (1) has no order: NULL.', 'id が 1・2・3 の 3 人。Aiko（1）は注文がないので NULL。', 'id が 1・2・3 の 3{人|にん}。Aiko（1）は {注文|ちゅうもん}が ないので NULL。'), sql: TOP('ASC'), mark: 'ORDER BY customers.id ASC', side: BOTH('pick', 'fail'), table: JR(`SELECT customers.id, customers.name, orders.amount FROM customers LEFT JOIN orders ON ${ON} ORDER BY customers.id ASC LIMIT 3;`, { hl: ['id'] }) },
        { label: T3('DESC', 'DESC（大きい順）', 'DESC（{大|おお}きい じゅん）'), covers: ['desc', 'limit'],
          cap: T3('id 5, 4, 3. Dina (4) has no order: NULL.', 'id が 5・4・3 の 3 人。Dina（4）は注文がないので NULL。', 'id が 5・4・3 の 3{人|にん}。Dina（4）は {注文|ちゅうもん}が ないので NULL。'), sql: TOP('DESC'), mark: 'ORDER BY customers.id DESC', side: BOTH('pick', 'fail'), table: JR(`SELECT customers.id, customers.name, orders.amount FROM customers LEFT JOIN orders ON ${ON} ORDER BY customers.id DESC LIMIT 3;`, { hl: ['id'] }) }
      ] },
      { type: 'mistake', title: T3('INNER JOIN instead of LEFT JOIN', 'LEFT JOIN のかわりに INNER JOIN と書く', 'LEFT JOIN の かわりに INNER JOIN と {書|か}く'),
        wrong: TOP('ASC').replace('LEFT JOIN', 'INNER JOIN'), right: TOP('ASC'),
        why: T3('Aiko has no order, so INNER JOIN drops her: the first 3 rows become Ben, Chandra, Eko.', 'Aiko は注文がないので INNER JOIN だと消える。上から 3 行が Ben・Chandra・Eko に変わってしまう。', 'Aiko は {注文|ちゅうもん}が ないので INNER JOIN だと {消|き}える。{上|うえ}から 3{行|ぎょう}が Ben・Chandra・Eko に {変|か}わって しまう。') },
      { type: 'mistake', title: T3('LIMIT before ORDER BY', 'LIMIT を ORDER BY の前に書く', 'LIMIT を ORDER BY の まえに {書|か}く'),
        wrong: `SELECT customers.name, orders.amount\nFROM customers\nLEFT JOIN orders\nON ${ON}\nLIMIT 3\nORDER BY customers.id ASC;`, right: TOP('ASC'),
        why: T3('First sort (ORDER BY), then take the first rows (LIMIT).', '先に並べ（ORDER BY）、そのあとで上から取る（LIMIT）。', 'さきに ならべ（ORDER BY）、その あとで {上|うえ}から とる（LIMIT）。') },
      { type: 'quiz', q: T3('Whose rows are in the result?', '結果に出るのは誰の行？', '{結果|けっか}に {出|で}るのは だれの {行|ぎょう}？'), sql: TOP('DESC').replace('LIMIT 3', 'LIMIT 2'), mark: 'LIMIT 2',
        choices: ['Eko, Chandra', 'Eko, Dina', 'Aiko, Ben'], answer: e => e.exec(`SELECT customers.name FROM customers LEFT JOIN orders ON ${ON} ORDER BY customers.id DESC LIMIT 2;`).values.map(v => v[0]).join(', '),
        why: T3('LEFT JOIN keeps Dina (4), with amount NULL. Largest id first: Eko (5), Dina (4).', 'LEFT JOIN なので Dina（4）も残る（amount は NULL）。id の大きい順に Eko（5）、Dina（4）。', 'LEFT JOIN なので Dina（4）も のこる（amount は NULL）。id の {大|おお}きい じゅんに Eko（5）、Dina（4）。'),
        side: PLAIN, table: JR(`SELECT customers.id, customers.name, orders.amount FROM customers LEFT JOIN orders ON ${ON} ORDER BY customers.id DESC LIMIT 2;`, { hl: ['id'] }) },
      { type: 'points', items: [
        T3('Write: FROM → LEFT JOIN … ON → ORDER BY → LIMIT.', '書く順番：FROM → LEFT JOIN … ON → ORDER BY → LIMIT。', '{書|か}く じゅんばん：FROM → LEFT JOIN … ON → ORDER BY → LIMIT。'),
        T3('With LEFT JOIN, rows without a partner are sorted and counted too.', 'LEFT JOIN では、相手がいない行も並べ替えや LIMIT の対象になる。', 'LEFT JOIN では、あいてが いない {行|ぎょう}も ならべかえや LIMIT に {入|はい}る。'),
        T3('In ORDER BY also write table.column.', 'ORDER BY でも 表.列 の形で書く。', 'ORDER BY でも {表|ひょう}.{列|れつ} の かたちで {書|か}く。')] },
      { type: 'practice' }
    ]
  }
};
