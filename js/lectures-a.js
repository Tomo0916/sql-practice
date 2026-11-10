/* =========================================================
 * lectures-a.js — lectures in the new form, Lessons 0–11
 * (basics, filtering rows, sorting / DISTINCT / LIMIT).
 *
 * Every lecture: scene (when you need it) → syntax → animation →
 * "cases": every pattern the lesson's problems use (covers: topics of
 * lecture-topics.js) → common mistakes → a quiz to predict the result →
 * summary → to the example.
 * Tables are computed from the data (products, contacts), never typed.
 * ========================================================= */
import { T3, state, checked } from './lecture-kit.js';

const ALL = 'SELECT id, name, category, price FROM products;';
const FULL = 'SELECT * FROM products;';
/** every row of products checked against a condition (✓ / ✕) */
const W = (cond, cols) => e => checked(e, ALL, cond, cols);
/** the result of a query; the first column is the row's key (hide it with hide: ['id']) */
const R = (sql, opts) => e => state(e, sql, opts);
const pickRows = (ids, opts = {}) => e => state(e, FULL, Object.assign({ cls: v => (ids.includes(v[0]) ? 'pick' : '') }, opts));
const one = (e, sql) => e.exec(sql).values[0][0];
const CON = 'SELECT id, name, email, phone FROM contacts;';
const WC = (cond, cols) => e => checked(e, CON, cond, cols);

export const LECT_A = {
  /* ------------------------------------------------ Lesson 0 */
  intro: {
    goal: T3('Read a table: rows, columns and values.', '表の「行」「列」「値」を読み取る。', '{表|ひょう}の「{行|ぎょう}」「{列|れつ}」「{値|あたい}」を {読|よ}み{取|と}る。'),
    slides: [
      { type: 'scene', who: T3('New staff', '新入社員', '{新|あたら}しい スタッフ'),
        ask: T3('“I got the list of products. Where is everything written?”', '「商品の一覧をもらった。どこに何が書いてあるんだろう？」', '「しょうひんの いちらんを もらった。どこに {何|なに}が {書|か}いて あるんだろう？」'),
        table: R(FULL) },
      { type: 'anim', title: T3('How to read a table', '表の読み方', '{表|ひょう}の {読|よ}み{方|かた}'), frames: [
        { cap: T3('This is the products table: a list of products.', 'これが products テーブル。商品の一覧。', 'これが products テーブル。しょうひんの いちらん。'), table: R(FULL) },
        { cap: T3('One row (across) is one product.', '横の 1 行が、1 つの商品。', 'よこの 1{行|ぎょう}が、1つの しょうひん。'), table: pickRows([5]) },
        { cap: T3('One column (down) holds one kind of information: price is the price of every product.', '縦の 1 列は、同じ種類の情報。price 列には、どの商品も値段が入っている。', 'たての 1{列|れつ}は、おなじ しゅるいの じょうほう。price {列|れつ}には、どの しょうひんも ねだんが {入|はい}って いる。'), table: R(FULL, { hl: ['price'], dim: true }) },
        { cap: T3('Where a row and a column meet is one value: the price of Coffee Maker is 3500.', '行と列が交わるところが、1 つの値。Coffee Maker の price は 3500。', '{行|ぎょう}と {列|れつ}が まじわる ところが、1つの {値|あたい}。Coffee Maker の price は 3500。'), table: pickRows([5], { hl: ['price'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Read a value', '値を読む', '{値|あたい}を {読|よ}む'), covers: ['read.value'],
          cap: T3('“What is the stock of Chef Knife Pro?” Find the row, then look at the stock column: 8.', '「Chef Knife Pro の stock は？」行を見つけて、stock 列を見る：8。', '「Chef Knife Pro の stock は？」{行|ぎょう}を {見|み}つけて、stock {列|れつ}を {見|み}る：8。'), table: pickRows([7], { hl: ['stock'] }) },
        { label: T3('Find a row', '行を探す', '{行|ぎょう}を さがす'), covers: ['read.which'],
          cap: T3('“Which product has price 8500?” Find 8500 in the price column, then read the name of that row.', '「price が 8500 の商品は？」price 列で 8500 を探し、その行の name を読む。', '「price が 8500 の しょうひんは？」price {列|れつ}で 8500 を さがし、その {行|ぎょう}の name を {読|よ}む。'), table: pickRows([3], { hl: ['name', 'price'] }) },
        { label: T3('Find a column', '列を探す', '{列|れつ}を さがす'), covers: ['read.col'],
          cap: T3('“In which column is Books?” It is in the category column.', '「Books はどの列にある？」category 列にある。', '「Books は どの {列|れつ}に ある？」category {列|れつ}に ある。'), table: pickRows([8, 9], { hl: ['category'] }) },
        { label: T3('Count the rows', '行を数える', '{行|ぎょう}を {数|かぞ}える'), covers: ['read.rows'],
          cap: T3('“How many rows?” 10 rows: 10 products. (The number is under the table too.)', '「行は何行？」10 行。商品が 10 個ある。（表の下にも出ている）', '「{行|ぎょう}は {何行|なんぎょう}？」10{行|ぎょう}。しょうひんが 10こ ある。（{表|ひょう}の {下|した}にも {出|で}て いる）'), table: R(FULL) },
        { label: T3('Count the columns', '列を数える', '{列|れつ}を {数|かぞ}える'), covers: ['read.cols'],
          cap: T3('“How many columns?” 6: id, name, category, price, stock, release_year.', '「列はいくつ？」6 つ：id・name・category・price・stock・release_year。', '「{列|れつ}は いくつ？」6つ：id・name・category・price・stock・release_year。'), table: R(FULL, { hl: ['id', 'name', 'category', 'price', 'stock', 'release_year'] }) }
      ] },
      { type: 'quiz', q: T3('Which product has the largest stock?', 'stock がいちばん多い商品はどれ？', 'stock が いちばん {多|おお}い しょうひんは どれ？'),
        choices: ['Wireless Mouse', 'Graphic T-Shirt', 'SQL Beginner Guide'], answer: e => one(e, 'SELECT name FROM products ORDER BY stock DESC LIMIT 1;'),
        why: T3('Look down the stock column: 60 is the largest, and that row is Graphic T-Shirt.', 'stock 列を上から見ていくと、60 がいちばん大きい。その行は Graphic T-Shirt。', 'stock {列|れつ}を {上|うえ}から {見|み}て いくと、60 が いちばん {大|おお}きい。その {行|ぎょう}は Graphic T-Shirt。'),
        before: R(FULL, { hl: ['stock'] }), table: pickRows([10], { hl: ['name', 'stock'] }) },
      { type: 'points', items: [
        T3('Row = one thing (one product). Column = one kind of information. Value = where they meet.', '行 ＝ 1 件のデータ（1 つの商品）。列 ＝ 1 つの項目。値 ＝ 行と列が交わるところ。', '{行|ぎょう} ＝ 1つの データ（1つの しょうひん）。{列|れつ} ＝ 1つの こうもく。{値|あたい} ＝ {行|ぎょう}と {列|れつ}が まじわる ところ。'),
        T3('Every column has a name. In SQL you use these names to say what you want.', '列には名前がある。SQL では、この列の名前を使って「ほしいもの」を書く。', '{列|れつ}には {名前|なまえ}が ある。SQL では、この {列|れつ}の {名前|なまえ}を {使|つか}って「ほしい もの」を {書|か}く。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 1 */
  select: {
    goal: T3('Take out only the columns you need.', '表から、必要な列だけを取り出す。', '{表|ひょう}から、ひつような {列|れつ}だけを {取|と}り{出|だ}す。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“I only need a list of the names and prices of the products.”', '「商品の名前と値段だけの一覧がほしい。」', '「しょうひんの {名前|なまえ}と ねだんだけの いちらんが ほしい。」'), table: R(FULL) },
      { type: 'syntax', notes: [
        T3('SELECT: the columns you want, separated by commas.', 'SELECT のあとに、取り出したい列をカンマで区切って書く。', 'SELECT の あとに、{取|と}り{出|だ}したい {列|れつ}を カンマで くぎって {書|か}く。'),
        T3('FROM: the table they come from.', 'FROM のあとに、どの表から取り出すかを書く。', 'FROM の あとに、どの {表|ひょう}から {取|と}り{出|だ}すかを {書|か}く。'),
        T3('The statement ends with a semicolon ( ; ).', '文の終わりにはセミコロン（;）を書く。', '{文|ぶん}の おわりには セミコロン（;）を {書|か}く。')] },
      { type: 'anim', title: T3('What SELECT does', 'SELECT がすること', 'SELECT が すること'), frames: [
        { cap: T3('The products table: 6 columns, 10 rows.', 'products テーブル。列が 6 つ、行が 10 行ある。', 'products テーブル。{列|れつ}が 6つ、{行|ぎょう}が 10{行|ぎょう} ある。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products', table: R(FULL) },
        { cap: T3('SELECT name, price: these two columns are chosen.', 'SELECT name, price：この 2 つの列を選ぶ。', 'SELECT name, price：この 2つの {列|れつ}を えらぶ。'), sql: 'SELECT name, price\nFROM products;', mark: 'name, price', table: R(FULL, { hl: ['name', 'price'], dim: true }) },
        { cap: T3('The result: only those columns, every row.', '結果：選んだ列だけ。行は全部残る。', '{結果|けっか}：えらんだ {列|れつ}だけ。{行|ぎょう}は ぜんぶ のこる。'), sql: 'SELECT name, price\nFROM products;', mark: 'name, price', table: R('SELECT id, name, price FROM products;', { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Two columns', '2 つの列', '2つの {列|れつ}'), covers: ['columns'],
          cap: T3('Write the column names with a comma between them.', '列の名前を、カンマで区切って書く。', '{列|れつ}の {名前|なまえ}を、カンマで くぎって {書|か}く。'), sql: 'SELECT name, category\nFROM products;', mark: 'name, category', table: R('SELECT id, name, category FROM products;', { hide: ['id'] }) },
        { label: T3('Another order', '順番を変える', 'じゅんばんを かえる'),
          cap: T3('The order you write is the order you get: price comes first now.', '書いた順番が、結果の列の順番になる。今度は price が先。', '{書|か}いた じゅんばんが、{結果|けっか}の {列|れつ}の じゅんばんに なる。こんどは price が さき。'), sql: 'SELECT price, name\nFROM products;', mark: 'price, name', table: R('SELECT id, price, name FROM products;', { hide: ['id'] }) },
        { label: T3('One column', '1 つの列', '1つの {列|れつ}'),
          cap: T3('One column needs no comma.', '列が 1 つなら、カンマはいらない。', '{列|れつ}が 1つなら、カンマは いらない。'), sql: 'SELECT name\nFROM products;', mark: 'name', table: R('SELECT id, name FROM products;', { hide: ['id'] }) },
        { label: T3('Every column: *', 'すべての列：*', 'ぜんぶの {列|れつ}：*'),
          cap: T3('* means every column.', '* は「すべての列」という意味。', '* は「ぜんぶの {列|れつ}」という いみ。'), sql: 'SELECT *\nFROM products;', mark: '*', table: R(FULL) }
      ] },
      { type: 'mistake', title: T3('The comma is missing', 'カンマを忘れる', 'カンマを わすれる'), wrong: 'SELECT name price\nFROM products;', right: 'SELECT name, price\nFROM products;',
        why: T3('Without the comma, “price” becomes a new name for the name column (an alias): you get one column.', 'カンマを忘れると、price が name 列の別名になってしまい、列が 1 つしか出ない。', 'カンマを わすれると、price が name {列|れつ}の べつの {名前|なまえ}に なって、{列|れつ}が 1つしか {出|で}ない。') },
      { type: 'mistake', title: T3('A wrong column name', '列の名前がちがう', '{列|れつ}の {名前|なまえ}が ちがう'), wrong: 'SELECT nam, price\nFROM products;', right: 'SELECT name, price\nFROM products;',
        why: T3('A column name must be written exactly as in the table. “nam” does not exist: an error.', '列の名前は、表にあるとおりに書く。nam という列はないのでエラーになる。', '{列|れつ}の {名前|なまえ}は、{表|ひょう}に ある とおりに {書|か}く。nam という {列|れつ}は ないので エラーに なる。') },
      { type: 'quiz', q: T3('How many columns does the result have?', 'この結果は、何列になる？', 'この {結果|けっか}は、{何列|なんれつ}に なる？'), sql: 'SELECT category, stock\nFROM products;', mark: 'category, stock',
        choices: ['6', '2', '10'], answer: e => e.exec('SELECT category, stock FROM products;').columns.length,
        why: T3('Only the columns written in SELECT: 2 columns. The rows stay: 10 rows.', 'SELECT に書いた列だけなので 2 列。行は減らないので 10 行のまま。', 'SELECT に {書|か}いた {列|れつ}だけなので 2{列|れつ}。{行|ぎょう}は へらないので 10{行|ぎょう}の まま。'),
        before: R(FULL), table: R('SELECT id, category, stock FROM products;', { hide: ['id'] }) },
      { type: 'points', items: [
        T3('The order of the columns in SELECT is the order in the result.', 'SELECT に書いた順番が、結果の列の順番になる。', 'SELECT に {書|か}いた じゅんばんが、{結果|けっか}の {列|れつ}の じゅんばんに なる。'),
        T3('SELECT chooses columns; it never removes rows.', 'SELECT は列を選ぶだけ。行は減らない。', 'SELECT は {列|れつ}を えらぶだけ。{行|ぎょう}は へらない。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 2 */
  types: {
    goal: T3('Write text in single quotes and numbers as they are.', '文字は \' \' で囲み、数字はそのまま書く。', '{文字|もじ}は \' \' で かこみ、{数字|すうじ}は そのまま {書|か}く。'),
    slides: [
      { type: 'scene', who: T3('A colleague', '先輩', 'せんぱい'),
        ask: T3('“In SQL, text and numbers are written differently. Mix them up and you get an error.”', '「SQL では、文字と数字で書き方がちがうよ。まちがえるとエラーになる。」', '「SQL では、{文字|もじ}と {数字|すうじ}で {書|か}き{方|かた}が ちがうよ。まちがえると エラーに なる。」'),
        table: R('SELECT id, name, category, price FROM products;', { hl: ['name', 'category', 'price'] }) },
      { type: 'syntax', notes: [
        T3("Text goes in single quotes: 'Tokyo'", "文字は ' ' で囲む：'Tokyo'", "{文字|もじ}は ' ' で かこむ：'Tokyo'"),
        T3('Numbers are written as they are: 2024', '数字は囲まずに、そのまま書く：2024', '{数字|すうじ}は かこまないで、そのまま {書|か}く：2024'),
        T3('SELECT can show values directly (no FROM needed).', 'SELECT だけで、書いた値をそのまま表示できる（FROM はいらない）。', 'SELECT だけで、{書|か}いた {値|あたい}を そのまま ひょうじ できる（FROM は いらない）。')] },
      { type: 'anim', title: T3('Text and numbers', '文字と数字', '{文字|もじ}と {数字|すうじ}'), frames: [
        { cap: T3("In quotes it is text.", "' ' で囲むと「文字」になる。", "' ' で かこむと「{文字|もじ}」に なる。"), sql: "SELECT 'Tokyo';", mark: "'Tokyo'", table: R("SELECT 'Tokyo';", { nohead: true }) },
        { cap: T3('A number is written as it is.', '数字はそのまま書く。', '{数字|すうじ}は そのまま {書|か}く。'), sql: 'SELECT 2024;', mark: '2024', table: R('SELECT 2024;', { nohead: true }) },
        { cap: T3('With a comma you show two values side by side.', 'カンマで区切ると、2 つ並べて表示できる。', 'カンマで くぎると、2つ ならべて ひょうじ できる。'), sql: "SELECT 'Tokyo', 2024;", mark: "'Tokyo', 2024", table: R("SELECT 'Tokyo', 2024;", { nohead: true }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Text', '文字', '{文字|もじ}'), covers: ['text'],
          cap: T3("Text from a table (a category, a name) is written in quotes too.", "表の中の文字（category や name の値）も、' ' で囲んで書く。", "{表|ひょう}の {中|なか}の {文字|もじ}（category や name の {値|あたい}）も、' ' で かこんで {書|か}く。"), sql: "SELECT 'Books';", mark: "'Books'", table: R("SELECT 'Books';", { nohead: true }) },
        { label: T3('Number', '数字', '{数字|すうじ}'), covers: ['number'],
          cap: T3('Numbers (a price, a year) have no quotes.', '数字（値段や年）は囲まない。', '{数字|すうじ}（ねだんや {年|とし}）は かこまない。'), sql: 'SELECT 4800;', mark: '4800', table: R('SELECT 4800;', { nohead: true }) },
        { label: T3('Text with spaces', '空白のある文字', 'くうはくの ある {文字|もじ}'), covers: ['text'],
          cap: T3('Spaces inside the quotes are part of the text.', "' ' の中の空白も、文字の一部。", "' ' の {中|なか}の くうはくも、{文字|もじ}の いちぶ。"), sql: "SELECT 'Coffee Maker', 3500;", mark: "'Coffee Maker'", table: R("SELECT 'Coffee Maker', 3500;", { nohead: true }) },
        { label: T3("'2024' and 2024", "'2024' と 2024", "'2024' と 2024"),
          cap: T3("'2024' is text and 2024 is a number. They look the same but only the number can be calculated.", "'2024' は文字、2024 は数字。見た目は同じでも、計算できるのは数字だけ。", "'2024' は {文字|もじ}、2024 は {数字|すうじ}。{見|み}た{目|め}は おなじでも、けいさん できるのは {数字|すうじ}だけ。"), sql: "SELECT '2024', 2024 + 1;", mark: '2024 + 1', table: R("SELECT '2024', 2024 + 1;", { nohead: true }) }
      ] },
      { type: 'mistake', title: T3('No quotes', "' ' がない", "' ' が ない"), wrong: 'SELECT Tokyo;', right: "SELECT 'Tokyo';",
        why: T3('Without quotes, Tokyo is read as a column name: an error.', "' ' がないと、Tokyo が列の名前だと思われてエラーになる。", "' ' が ないと、Tokyo が {列|れつ}の {名前|なまえ}だと おもわれて エラーに なる。") },
      { type: 'mistake', title: T3('The quote is not closed', "' を閉じ忘れる", "' を とじるのを わすれる"), wrong: "SELECT 'Tokyo;", right: "SELECT 'Tokyo';",
        why: T3("Text starts with ' and must end with '.", "文字は ' で始めて、' で終わる。", "{文字|もじ}は ' で はじめて、' で おわる。") },
      { type: 'quiz', q: T3('Which one is text?', '次のうち、「文字」はどれ？', 'つぎの うち、「{文字|もじ}」は どれ？'),
        choices: ['2024', "'2024'", '20.24'], answer: 1,
        why: T3("What is inside ' ' is text, even when it looks like a number.", "' ' で囲んだものが文字。中身が数字に見えても、文字になる。", "' ' で かこんだ ものが {文字|もじ}。{中|なか}が {数字|すうじ}に {見|み}えても、{文字|もじ}に なる。"),
        table: R("SELECT '2024', 2024, 20.24;", { nohead: true }) },
      { type: 'points', items: [
        T3("Text: ' '. Numbers: as they are.", "文字は ' ' で囲む。数字はそのまま。", "{文字|もじ}は ' ' で かこむ。{数字|すうじ}は そのまま。"),
        T3('The same rule is used when you compare values with WHERE (Lesson 4).', 'WHERE で値を比べるときも、同じルールを使う（Lesson 4）。', 'WHERE で {値|あたい}を くらべる ときも、おなじ ルールを {使|つか}う（Lesson 4）。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 3 */
  alias: {
    goal: T3('Calculate with columns and give the result a name.', '列を使って計算し、結果の列に名前を付ける。', '{列|れつ}を {使|つか}って けいさんし、{結果|けっか}の {列|れつ}に {名前|なまえ}を つける。'),
    slides: [
      { type: 'scene', who: T3('Accounting', '経理担当', 'けいりの {人|ひと}'),
        ask: T3('“For each product, show the value of the stock: price × stock.”', '「商品ごとに、在庫の金額（値段 × 在庫数）を出して。」', '「しょうひんごとに、ざいこの {金額|きんがく}（ねだん × ざいこの {数|かず}）を {出|だ}して。」'),
        table: R('SELECT id, name, price, stock FROM products;', { hide: ['id'], hl: ['price', 'stock'] }) },
      { type: 'syntax', notes: [
        T3('You can calculate in SELECT:  +  −  *  /', 'SELECT の中で計算できる：+（足す）−（引く）*（かける）/（割る）', 'SELECT の {中|なか}で けいさん できる：+（たす）−（ひく）*（かける）/（わる）'),
        T3('AS gives the result column a name (an alias).', 'AS で、結果の列に名前（別名）を付ける。', 'AS で、{結果|けっか}の {列|れつ}に {名前|なまえ}（べつの {名前|なまえ}）を つける。'),
        T3('The table itself does not change.', '元の表は変わらない。', 'もとの {表|ひょう}は かわらない。')] },
      { type: 'anim', title: T3('Calculate, then name it', '計算して、名前を付ける', 'けいさん して、{名前|なまえ}を つける'), frames: [
        { cap: T3('Each product has a price and a stock.', 'どの商品にも price と stock がある。', 'どの しょうひんにも price と stock が ある。'), sql: 'SELECT name, price, stock\nFROM products;', mark: 'price, stock', table: R('SELECT id, name, price, stock FROM products;', { hide: ['id'], hl: ['price', 'stock'] }) },
        { cap: T3('price * stock is calculated for every row. But the column name is the formula.', 'price * stock を、行ごとに計算する。でも、列の名前が式のままになっている。', 'price * stock を、{行|ぎょう}ごとに けいさん する。でも、{列|れつ}の {名前|なまえ}が しきの ままに なって いる。'), sql: 'SELECT name, price * stock\nFROM products;', mark: 'price * stock', table: R('SELECT id, name, price * stock FROM products;', { hide: ['id'], hl: ['price * stock'] }) },
        { cap: T3('AS stock_value: now the column has a clear name.', 'AS stock_value：列に、わかりやすい名前が付いた。', 'AS stock_value：{列|れつ}に、わかりやすい {名前|なまえ}が ついた。'), sql: 'SELECT name, price * stock AS stock_value\nFROM products;', mark: 'AS stock_value', table: R('SELECT id, name, price * stock AS stock_value FROM products;', { hide: ['id'], hl: ['stock_value'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('column × number', '列 × 数字', '{列|れつ} × {数字|すうじ}'), covers: ['calc.times', 'as'],
          cap: T3('Every price is multiplied by 2.', 'どの行の price も 2 倍になる。', 'どの {行|ぎょう}の price も 2ばいに なる。'), sql: 'SELECT name, price * 2 AS double_price\nFROM products;', mark: 'price * 2 AS double_price', table: R('SELECT id, name, price * 2 AS double_price FROM products;', { hide: ['id'], hl: ['double_price'] }) },
        { label: T3('column + number', '列 + 数字', '{列|れつ} + {数字|すうじ}'), covers: ['calc.plus', 'as'],
          cap: T3('100 is added to every price.', 'どの行の price にも 100 を足す。', 'どの {行|ぎょう}の price にも 100 を たす。'), sql: 'SELECT name, price + 100 AS price_plus_100\nFROM products;', mark: 'price + 100 AS price_plus_100', table: R('SELECT id, name, price + 100 AS price_plus_100 FROM products;', { hide: ['id'], hl: ['price_plus_100'] }) },
        { label: T3('column × column', '列 × 列', '{列|れつ} × {列|れつ}'), covers: ['calc.columns', 'as'],
          cap: T3('Two columns of the same row are multiplied.', '同じ行の 2 つの列をかける。', 'おなじ {行|ぎょう}の 2つの {列|れつ}を かける。'), sql: 'SELECT name, price * stock AS price_x_stock\nFROM products;', mark: 'price * stock AS price_x_stock', table: R('SELECT id, name, price * stock AS price_x_stock FROM products;', { hide: ['id'], hl: ['price_x_stock'] }) },
        { label: T3('A name without a calculation', '計算なしで名前だけ', 'けいさん なしで {名前|なまえ}だけ'), covers: ['as'],
          cap: T3('AS can rename a plain column too.', '計算しない列にも、AS で名前を付けられる。', 'けいさん しない {列|れつ}にも、AS で {名前|なまえ}を つけられる。'), sql: 'SELECT name AS product_name, price\nFROM products;', mark: 'AS product_name', table: R('SELECT id, name AS product_name, price FROM products;', { hide: ['id'], hl: ['product_name'] }) }
      ] },
      { type: 'mistake', title: T3('A space in the name', '名前に空白がある', '{名前|なまえ}に くうはくが ある'), wrong: 'SELECT name, price * stock AS stock value\nFROM products;', right: 'SELECT name, price * stock AS stock_value\nFROM products;',
        why: T3('An alias cannot have a space. Join the words with _ .', '別名に空白は使えない。言葉は _（アンダースコア）でつなぐ。', 'べつの {名前|なまえ}に くうはくは {使|つか}えない。ことばは _ で つなぐ。') },
      { type: 'mistake', title: T3('x instead of *', 'かけ算を x と書く', 'かけざんを x と {書|か}く'), wrong: 'SELECT name, price x 2 AS double_price\nFROM products;', right: 'SELECT name, price * 2 AS double_price\nFROM products;',
        why: T3('Multiply with * and divide with / .', 'かけ算は *、わり算は / で書く。', 'かけざんは *、わりざんは / で {書|か}く。') },
      { type: 'quiz', q: T3('The price of Coffee Maker is 3500. What is its sale_price?', 'Coffee Maker の price は 3500。sale_price はいくつになる？', 'Coffee Maker の price は 3500。sale_price は いくつに なる？'),
        sql: 'SELECT name, price - 500 AS sale_price\nFROM products;', mark: 'price - 500 AS sale_price',
        choices: ['3500', '4000', '3000'], answer: e => one(e, "SELECT price - 500 FROM products WHERE name = 'Coffee Maker';"),
        why: T3('The calculation is done for each row: 3500 − 500 = 3000.', '計算は行ごとに行われる：3500 − 500 = 3000。', 'けいさんは {行|ぎょう}ごとに おこなわれる：3500 − 500 = 3000。'),
        before: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }), table: R('SELECT id, name, price - 500 AS sale_price FROM products;', { hide: ['id'], hl: ['sale_price'] }) },
      { type: 'points', items: [
        T3('A calculation in SELECT is done row by row.', 'SELECT の中の計算は、1 行ずつ行われる。', 'SELECT の {中|なか}の けいさんは、1{行|ぎょう}ずつ おこなわれる。'),
        T3('AS only names the column of the result; the table keeps its columns.', 'AS は結果の列に名前を付けるだけ。元の表の列は変わらない。', 'AS は {結果|けっか}の {列|れつ}に {名前|なまえ}を つけるだけ。もとの {表|ひょう}の {列|れつ}は かわらない。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 4 */
  where: {
    goal: T3('Keep only the rows that match a condition.', '条件に合う行だけを残す。', '{条件|じょうけん}に あう {行|ぎょう}だけを のこす。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Which products cost 4800 yen or more?”', '「4800 円以上の商品はどれ？」', '「4800{円|えん} いじょうの しょうひんは どれ？」'), table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('WHERE comes after FROM and keeps only the rows where the condition is true.', 'WHERE は FROM のあとに書く。条件が「正しい」行だけが残る。', 'WHERE は FROM の あとに {書|か}く。{条件|じょうけん}が「ただしい」{行|ぎょう}だけが のこる。'),
        T3('Comparisons: =  <>  >  >=  <  <=', '比べる記号：=（等しい）<>（等しくない）>　>=　<　<=', 'くらべる {記号|きごう}：=（おなじ）<>（ちがう）>　>=　<　<='),
        T3("Text goes in single quotes: category = 'Books'", "文字は ' ' で囲む：category = 'Books'", "{文字|もじ}は ' ' で かこむ：category = 'Books'")] },
      { type: 'anim', title: T3('What WHERE does', 'WHERE がすること', 'WHERE が すること'), frames: [
        { cap: T3('Start from every row of products.', 'まず、products の全部の行から始まる。', 'まず、products の ぜんぶの {行|ぎょう}から はじまる。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products', table: R(ALL) },
        { cap: T3('WHERE price >= 4800: each row is checked, one by one.', 'WHERE price >= 4800：1 行ずつ、条件に合うか確かめる。', 'WHERE price >= 4800：1{行|ぎょう}ずつ、{条件|じょうけん}に あうか たしかめる。'), sql: 'SELECT *\nFROM products\nWHERE price >= 4800;', mark: 'WHERE price >= 4800', table: W('price >= 4800', ['price']) },
        { cap: T3('Rows that do not match are removed.', '合わない行は消える。', 'あわない {行|ぎょう}は きえる。'), sql: 'SELECT *\nFROM products\nWHERE price >= 4800;', mark: 'WHERE price >= 4800', table: R('SELECT id, name, category, price FROM products WHERE price >= 4800;', { hl: ['price'], cls: () => 'pass' }) },
        { cap: T3('Then SELECT chooses the columns.', 'そのあと SELECT で列を選ぶ。', 'その あと SELECT で {列|れつ}を えらぶ。'), sql: 'SELECT name, price\nFROM products\nWHERE price >= 4800;', mark: 'name, price', table: R('SELECT id, name, price FROM products WHERE price >= 4800;', { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('>=', '>=（以上）', '>=（いじょう）'), covers: ['num.>='], cap: T3('4800 or more: 4800 itself is included.', '4800 以上。4800 ちょうどの行もふくむ。', '4800 いじょう。4800 ちょうどの {行|ぎょう}も ふくむ。'), sql: 'SELECT name, price\nFROM products\nWHERE price >= 4800;', mark: '>=', table: W('price >= 4800', ['price']) },
        { label: T3('>', '>（より大きい）', '>（より {大|おお}きい）'), covers: ['num.>'], cap: T3('More than 4800: 4800 itself is not included.', '4800 より大きい。4800 ちょうどの行はふくまない。', '4800 より {大|おお}きい。4800 ちょうどの {行|ぎょう}は ふくまない。'), sql: 'SELECT name, price\nFROM products\nWHERE price > 4800;', mark: '>', table: W('price > 4800', ['price']) },
        { label: T3('<=', '<=（以下）', '<=（いか）'), covers: ['num.<='], cap: T3('3000 or less: 3000 itself is included.', '3000 以下。3000 ちょうどの行もふくむ。', '3000 いか。3000 ちょうどの {行|ぎょう}も ふくむ。'), sql: 'SELECT name, price\nFROM products\nWHERE price <= 3000;', mark: '<=', table: W('price <= 3000', ['price']) },
        { label: T3('<', '<（より小さい）', '<（より {小|ちい}さい）'), covers: ['num.<'], cap: T3('Less than 3000: 3000 itself is not included.', '3000 より小さい。3000 ちょうどの行はふくまない。', '3000 より {小|ちい}さい。3000 ちょうどの {行|ぎょう}は ふくまない。'), sql: 'SELECT name, price\nFROM products\nWHERE price < 3000;', mark: '<', table: W('price < 3000', ['price']) },
        { label: T3('= (number)', '=（数字）', '=（{数字|すうじ}）'), covers: ['num.='], cap: T3('Exactly 2021.', 'ちょうど 2021 の行だけ。', 'ちょうど 2021 の {行|ぎょう}だけ。'), sql: 'SELECT name, release_year\nFROM products\nWHERE release_year = 2021;', mark: '=', table: e => checked(e, 'SELECT id, name, category, release_year FROM products;', 'release_year = 2021', ['release_year']) },
        { label: T3('<> (number)', '<>（数字）', '<>（{数字|すうじ}）'), covers: ['num.<>'], cap: T3('Everything except 2021.', '2021 ではない行。', '2021 では ない {行|ぎょう}。'), sql: 'SELECT name, release_year\nFROM products\nWHERE release_year <> 2021;', mark: '<>', table: e => checked(e, 'SELECT id, name, category, release_year FROM products;', 'release_year <> 2021', ['release_year']) },
        { label: T3('= (text)', '=（文字）', '=（{文字|もじ}）'), covers: ['text.='], cap: T3("Text is compared in quotes: the rows whose category is Books.", "文字は ' ' で囲んで比べる。category が Books の行。", "{文字|もじ}は ' ' で かこんで くらべる。category が Books の {行|ぎょう}。"), sql: "SELECT name, category\nFROM products\nWHERE category = 'Books';", mark: "= 'Books'", table: W("category = 'Books'", ['category']) },
        { label: T3('<> (text)', '<>（文字）', '<>（{文字|もじ}）'), covers: ['text.<>'], cap: T3('Every category except Books.', 'category が Books ではない行。', 'category が Books では ない {行|ぎょう}。'), sql: "SELECT name, category\nFROM products\nWHERE category <> 'Books';", mark: "<> 'Books'", table: W("category <> 'Books'", ['category']) }
      ] },
      { type: 'mistake', title: T3('Text without quotes', "文字に ' ' がない", "{文字|もじ}に ' ' が ない"), wrong: 'SELECT name\nFROM products\nWHERE category = Books;', right: "SELECT name\nFROM products\nWHERE category = 'Books';",
        why: T3('Without quotes, Books is read as a column name (an error).', "' ' がないと、Books が列の名前だと思われてエラーになる。", "' ' が ないと、Books が {列|れつ}の {名前|なまえ}だと おもわれて エラーに なる。") },
      { type: 'mistake', title: T3('=> instead of >=', '>= を => と書く', '>= を => と {書|か}く'), wrong: 'SELECT name, price\nFROM products\nWHERE price => 4800;', right: 'SELECT name, price\nFROM products\nWHERE price >= 4800;',
        why: T3('The = comes second: >= and <= .', '= はあとに書く：>= と <=。', '= は あとに {書|か}く：>= と <=。') },
      { type: 'quiz', q: T3('How many rows stay?', '何行残る？', '{何行|なんぎょう} のこる？'), sql: 'SELECT name, price\nFROM products\nWHERE price > 3000;', mark: '> 3000',
        choices: ['6', '5', '4'], answer: e => one(e, 'SELECT COUNT(*) FROM products WHERE price > 3000;'),
        why: T3('> does not include 3000 itself, so Web Development Basics (3000) is removed.', '> は 3000 ちょうどをふくまない。Web Development Basics（3000）は消える。', '> は 3000 ちょうどを ふくまない。Web Development Basics（3000）は きえる。'),
        before: R(ALL, { hl: ['price'] }), table: W('price > 3000', ['price']) },
      { type: 'points', items: [
        T3('The database runs FROM → WHERE → SELECT: rows first, then columns.', 'データベースは FROM → WHERE → SELECT の順に動く。先に行を絞り、あとで列を選ぶ。', 'データベースは FROM → WHERE → SELECT の じゅんに うごく。さきに {行|ぎょう}を しぼり、あとで {列|れつ}を えらぶ。'),
        T3('>= and <= include the value itself; > and < do not.', '>= と <= はその値をふくむ。> と < はふくまない。', '>= と <= は その {値|あたい}を ふくむ。> と < は ふくまない。'),
        T3("Numbers as they are, text in ' '.", "数字はそのまま、文字は ' ' で囲む。", "{数字|すうじ}は そのまま、{文字|もじ}は ' ' で かこむ。")] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 5 */
  andor: {
    goal: T3('Combine conditions with AND, OR and NOT.', '条件を組み合わせる：AND・OR・NOT。', '{条件|じょうけん}を くみあわせる：AND・OR・NOT。'),
    slides: [
      { type: 'scene', who: T3('A customer', 'お客さん', 'おきゃくさん'),
        ask: T3('“Do you have Electronics that cost less than 5000 yen?”', '「Electronics で、5000 円より安いものはありますか？」', '「Electronics で、5000{円|えん}より やすい ものは ありますか？」'), table: R(ALL, { hl: ['category', 'price'] }) },
      { type: 'syntax', notes: [
        T3('A AND B: only rows where both are true.', 'A AND B：両方とも正しい行だけ。', 'A AND B：りょうほうとも ただしい {行|ぎょう}だけ。'),
        T3('A OR B: rows where at least one is true.', 'A OR B：どちらかが正しい行。', 'A OR B：どちらかが ただしい {行|ぎょう}。'),
        T3('NOT A: rows where A is not true.', 'NOT A：A が正しくない行。', 'NOT A：A が ただしくない {行|ぎょう}。')] },
      { type: 'anim', title: T3('What AND does', 'AND がすること', 'AND が すること'), frames: [
        { cap: T3('Start from every row.', 'まず、全部の行から始まる。', 'まず、ぜんぶの {行|ぎょう}から はじまる。'), sql: 'SELECT name, category, price\nFROM products;', mark: 'FROM products', table: R(ALL) },
        { cap: T3("First condition: category = 'Electronics'.", "1 つめの条件：category = 'Electronics'。", "1つめの {条件|じょうけん}：category = 'Electronics'。"), sql: "SELECT name, category, price\nFROM products\nWHERE category = 'Electronics';", mark: "category = 'Electronics'", table: W("category = 'Electronics'", ['category']) },
        { cap: T3('Second condition: price < 5000.', '2 つめの条件：price < 5000。', '2つめの {条件|じょうけん}：price < 5000。'), sql: 'SELECT name, category, price\nFROM products\nWHERE price < 5000;', mark: 'price < 5000', table: W('price < 5000', ['price']) },
        { cap: T3('AND: only the rows that pass both.', 'AND：両方に合う行だけが ✓ になる。', 'AND：りょうほうに あう {行|ぎょう}だけが ✓ に なる。'), sql: "SELECT name, category, price\nFROM products\nWHERE category = 'Electronics'\n  AND price < 5000;", mark: 'AND', table: W("category = 'Electronics' AND price < 5000", ['category', 'price']) },
        { cap: T3('The result.', '結果。', '{結果|けっか}。'), sql: "SELECT name, category, price\nFROM products\nWHERE category = 'Electronics'\n  AND price < 5000;", mark: 'AND', table: R("SELECT id, name, category, price FROM products WHERE category = 'Electronics' AND price < 5000;", { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('AND', 'AND', 'AND'), covers: ['and'], cap: T3('Both must be true: AND makes the result smaller.', '両方に合う行だけ。AND を足すと、結果は減る。', 'りょうほうに あう {行|ぎょう}だけ。AND を たすと、{結果|けっか}は へる。'), sql: "SELECT name, category, price\nFROM products\nWHERE category = 'Kitchen'\n  AND price >= 3500;", mark: 'AND', table: W("category = 'Kitchen' AND price >= 3500", ['category', 'price']) },
        { label: T3('OR', 'OR', 'OR'), covers: ['or'], cap: T3('One is enough: OR makes the result larger.', 'どちらかに合えばよい。OR を足すと、結果は増える。', 'どちらかに あえば よい。OR を たすと、{結果|けっか}は ふえる。'), sql: "SELECT name, category\nFROM products\nWHERE category = 'Books'\n   OR category = 'Clothing';", mark: 'OR', table: W("category = 'Books' OR category = 'Clothing'", ['category']) },
        { label: T3('NOT', 'NOT', 'NOT'), covers: ['not'], cap: T3('NOT turns the condition round: everything that is not Electronics.', 'NOT は条件をひっくり返す。Electronics ではない行。', 'NOT は {条件|じょうけん}を ひっくりかえす。Electronics では ない {行|ぎょう}。'), sql: "SELECT name, category\nFROM products\nWHERE NOT category = 'Electronics';", mark: 'NOT', table: W("NOT category = 'Electronics'", ['category']) },
        { label: T3('AND and OR with ( )', 'AND と OR と ( )', 'AND と OR と ( )'), cap: T3('AND is calculated before OR. Use ( ) to say what belongs together.', 'AND は OR より先に計算される。まとまりは ( ) で囲む。', 'AND は OR より さきに けいさん される。まとまりは ( ) で かこむ。'), sql: "SELECT name, category, price\nFROM products\nWHERE (category = 'Books' OR category = 'Kitchen')\n  AND price < 3000;", mark: "(category = 'Books' OR category = 'Kitchen')", table: W("(category = 'Books' OR category = 'Kitchen') AND price < 3000", ['category', 'price']) }
      ] },
      { type: 'mistake', title: T3('Half a condition after OR', 'OR のあとの条件が半分', 'OR の あとの {条件|じょうけん}が はんぶん'), wrong: "SELECT name, category\nFROM products\nWHERE category = 'Books' OR 'Clothing';", right: "SELECT name, category\nFROM products\nWHERE category = 'Books' OR category = 'Clothing';",
        why: T3('Write a whole condition on both sides of OR (and AND): column, sign, value.', 'OR（や AND）の両側には、条件を全部書く：列・記号・値。', 'OR（や AND）の りょうがわには、{条件|じょうけん}を ぜんぶ {書|か}く：{列|れつ}・{記号|きごう}・{値|あたい}。') },
      { type: 'mistake', title: T3('AND where OR is meant', 'OR のつもりで AND と書く', 'OR の つもりで AND と {書|か}く'), wrong: "SELECT name, category\nFROM products\nWHERE category = 'Books' AND category = 'Clothing';", right: "SELECT name, category\nFROM products\nWHERE category = 'Books' OR category = 'Clothing';",
        why: T3('One row cannot be Books and Clothing at the same time: no rows. “Books and Clothing products” means OR.', '1 つの行の category が、同時に Books と Clothing になることはない（0 行になる）。「Books と Clothing の商品」は OR で書く。', '1つの {行|ぎょう}の category が、どうじに Books と Clothing に なる ことは ない（0{行|ぎょう}に なる）。「Books と Clothing の しょうひん」は OR で {書|か}く。') },
      { type: 'quiz', q: T3('How many rows stay?', '何行残る？', '{何行|なんぎょう} のこる？'), sql: "SELECT name, category, stock\nFROM products\nWHERE category = 'Electronics'\n  AND stock >= 20;", mark: 'AND',
        choices: ['4', '2', '6'], answer: e => one(e, "SELECT COUNT(*) FROM products WHERE category = 'Electronics' AND stock >= 20;"),
        why: T3('4 rows are Electronics; 2 of them have a stock of 20 or more.', 'Electronics は 4 行。そのうち stock が 20 以上なのは 2 行。', 'Electronics は 4{行|ぎょう}。その うち stock が 20 いじょうなのは 2{行|ぎょう}。'),
        before: R('SELECT id, name, category, stock FROM products;', { hl: ['category', 'stock'] }), table: e => checked(e, 'SELECT id, name, category, stock FROM products;', "category = 'Electronics' AND stock >= 20", ['category', 'stock']) },
      { type: 'points', items: [
        T3('AND narrows (fewer rows); OR widens (more rows).', 'AND は絞る（行が減る）。OR は広げる（行が増える）。', 'AND は しぼる（{行|ぎょう}が へる）。OR は ひろげる（{行|ぎょう}が ふえる）。'),
        T3('AND is calculated before OR. When in doubt, use ( ).', 'AND は OR より先に計算される。迷ったら ( ) で囲む。', 'AND は OR より さきに けいさん される。まよったら ( ) で かこむ。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 6 */
  between: {
    goal: T3('Filter by a range (BETWEEN) or a list of candidates (IN).', '範囲（BETWEEN）や、候補のリスト（IN）で絞る。', 'はんい（BETWEEN）や、こうほの リスト（IN）で しぼる。'),
    slides: [
      { type: 'scene', who: T3('A customer', 'お客さん', 'おきゃくさん'),
        ask: T3('“Show me the products from 2200 to 3500 yen.”', '「2200 円から 3500 円までの商品を見せてください。」', '「2200{円|えん}から 3500{円|えん}までの しょうひんを {見|み}せて ください。」'), table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('BETWEEN a AND b: from a to b, both ends included.', 'BETWEEN a AND b：a 以上 b 以下。両はしをふくむ。', 'BETWEEN a AND b：a いじょう b いか。りょうはしを ふくむ。'),
        T3('IN (…): the same as one of the values in the list.', 'IN (…)：かっこの中のどれかと同じ。', 'IN (…)：かっこの {中|なか}の どれかと おなじ。'),
        T3('Both are shorter ways to write >= AND <= , or several ORs.', 'どちらも、>= AND <= や、OR をいくつも書く代わりの、短い書き方。', 'どちらも、>= AND <= や、OR を いくつも {書|か}く かわりの、みじかい {書|か}き{方|かた}。')] },
      { type: 'anim', title: T3('What BETWEEN does', 'BETWEEN がすること', 'BETWEEN が すること'), frames: [
        { cap: T3('Start from every row.', 'まず、全部の行から始まる。', 'まず、ぜんぶの {行|ぎょう}から はじまる。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products', table: R(ALL) },
        { cap: T3('BETWEEN 2200 AND 3500: is the price in the range?', 'BETWEEN 2200 AND 3500：price が範囲に入っているか確かめる。', 'BETWEEN 2200 AND 3500：price が はんいに {入|はい}って いるか たしかめる。'), sql: 'SELECT *\nFROM products\nWHERE price BETWEEN 2200 AND 3500;', mark: 'BETWEEN 2200 AND 3500', table: W('price BETWEEN 2200 AND 3500', ['price']) },
        { cap: T3('The rows in the range stay: 2200 and 3500 themselves too.', '範囲に入る行が残る。2200 と 3500 ちょうどの行も残る。', 'はんいに {入|はい}る {行|ぎょう}が のこる。2200 と 3500 ちょうどの {行|ぎょう}も のこる。'), sql: 'SELECT *\nFROM products\nWHERE price BETWEEN 2200 AND 3500;', mark: 'BETWEEN 2200 AND 3500', table: R('SELECT id, name, category, price FROM products WHERE price BETWEEN 2200 AND 3500;', { hl: ['price'], cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('BETWEEN', 'BETWEEN', 'BETWEEN'), covers: ['between'], cap: T3('From 2200 to 3500, both ends included.', '2200 以上 3500 以下。両はしをふくむ。', '2200 いじょう 3500 いか。りょうはしを ふくむ。'), sql: 'SELECT *\nFROM products\nWHERE price BETWEEN 2200 AND 3500;', mark: 'BETWEEN 2200 AND 3500', table: W('price BETWEEN 2200 AND 3500', ['price']) },
        { label: T3('The same with >= AND <=', '>= AND <= でも同じ', '>= AND <= でも おなじ'), covers: ['between'], cap: T3('This gives exactly the same rows.', 'こう書いても、まったく同じ行になる。', 'こう {書|か}いても、まったく おなじ {行|ぎょう}に なる。'), sql: 'SELECT *\nFROM products\nWHERE price >= 2200 AND price <= 3500;', mark: 'price >= 2200 AND price <= 3500', table: W('price >= 2200 AND price <= 3500', ['price']) },
        { label: T3('IN', 'IN', 'IN'), covers: ['in'], cap: T3('The category is one of the list: Books or Clothing.', 'category が、リストのどれか（Books か Clothing）と同じ行。', 'category が、リストの どれか（Books か Clothing）と おなじ {行|ぎょう}。'), sql: "SELECT *\nFROM products\nWHERE category IN ('Books', 'Clothing');", mark: "IN ('Books', 'Clothing')", table: W("category IN ('Books', 'Clothing')", ['category']) },
        { label: T3('The same with OR', 'OR でも同じ', 'OR でも おなじ'), covers: ['in'], cap: T3('IN is a short way to write several ORs.', 'IN は、OR をいくつも書く代わりの短い書き方。', 'IN は、OR を いくつも {書|か}く かわりの みじかい {書|か}き{方|かた}。'), sql: "SELECT *\nFROM products\nWHERE category = 'Books' OR category = 'Clothing';", mark: "category = 'Books' OR category = 'Clothing'", table: W("category = 'Books' OR category = 'Clothing'", ['category']) },
        { label: T3('IN with numbers', '数字の IN', '{数字|すうじ}の IN'), covers: ['in'], cap: T3('Numbers in the list have no quotes.', '数字のリストは、囲まずに書く。', '{数字|すうじ}の リストは、かこまないで {書|か}く。'), sql: 'SELECT *\nFROM products\nWHERE release_year IN (2019, 2021);', mark: 'IN (2019, 2021)', table: e => checked(e, 'SELECT id, name, category, release_year FROM products;', 'release_year IN (2019, 2021)', ['release_year']) }
      ] },
      { type: 'mistake', title: T3('The larger value first', '大きいほうを先に書く', '{大|おお}きい ほうを さきに {書|か}く'), wrong: 'SELECT *\nFROM products\nWHERE price BETWEEN 3500 AND 2200;', right: 'SELECT *\nFROM products\nWHERE price BETWEEN 2200 AND 3500;',
        why: T3('Write the smaller value first. The other way round, no row matches.', '小さいほうを先に書く。逆にすると、1 行も合わない。', '{小|ちい}さい ほうを さきに {書|か}く。ぎゃくに すると、1{行|ぎょう}も あわない。') },
      { type: 'mistake', title: T3('IN without ( )', 'IN に ( ) がない', 'IN に ( ) が ない'), wrong: "SELECT *\nFROM products\nWHERE category IN 'Books', 'Clothing';", right: "SELECT *\nFROM products\nWHERE category IN ('Books', 'Clothing');",
        why: T3('The list after IN goes in ( ).', 'IN のあとのリストは ( ) で囲む。', 'IN の あとの リストは ( ) で かこむ。') },
      { type: 'quiz', q: T3('How many rows stay?', '何行残る？', '{何行|なんぎょう} のこる？'), sql: 'SELECT name, price\nFROM products\nWHERE price BETWEEN 3000 AND 4800;', mark: 'BETWEEN 3000 AND 4800',
        choices: ['1', '2', '3'], answer: e => one(e, 'SELECT COUNT(*) FROM products WHERE price BETWEEN 3000 AND 4800;'),
        why: T3('Both ends are included: 3000, 3500 and 4800.', '両はしをふくむので、3000・3500・4800 の 3 行。', 'りょうはしを ふくむので、3000・3500・4800 の 3{行|ぎょう}。'),
        before: R(ALL, { hl: ['price'] }), table: W('price BETWEEN 3000 AND 4800', ['price']) },
      { type: 'points', items: [
        T3('BETWEEN includes both ends. Smaller value first.', 'BETWEEN は両はしをふくむ。小さいほうを先に書く。', 'BETWEEN は りょうはしを ふくむ。{小|ちい}さい ほうを さきに {書|か}く。'),
        T3("IN (…) : text in ' ', numbers as they are, separated by commas.", "IN (…) の中は、文字は ' ' で囲み、数字はそのまま。カンマで区切る。", "IN (…) の {中|なか}は、{文字|もじ}は ' ' で かこみ、{数字|すうじ}は そのまま。カンマで くぎる。")] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 7 */
  like: {
    goal: T3('Search by a part of the text: LIKE and %.', '文字の一部で探す：LIKE と %。', '{文字|もじ}の いちぶで さがす：LIKE と %。'),
    slides: [
      { type: 'scene', who: T3('A customer', 'お客さん', 'おきゃくさん'),
        ask: T3('“Show me every product with Pro in its name.”', '「名前に Pro が付く商品を全部見せてください。」', '「{名前|なまえ}に Pro が つく しょうひんを ぜんぶ {見|み}せて ください。」'), table: R('SELECT id, name, price FROM products;', { hl: ['name'] }) },
      { type: 'syntax', notes: [
        T3('LIKE searches text by a pattern.', 'LIKE は、文字をパターンで探す。', 'LIKE は、{文字|もじ}を パターンで さがす。'),
        T3('% stands for any text of any length (also nothing).', '% は「どんな文字が、何文字あってもよい（0 文字でもよい）」という意味。', '% は「どんな {文字|もじ}が、{何文字|なんもじ} あっても よい（0{文字|もじ}でも よい）」という いみ。'),
        T3("'%Pro%' = contains Pro.", "'%Pro%' は「Pro をふくむ」。", "'%Pro%' は「Pro を ふくむ」。")] },
      { type: 'anim', title: T3('What LIKE does', 'LIKE がすること', 'LIKE が すること'), frames: [
        { cap: T3('Start from every row.', 'まず、全部の行から始まる。', 'まず、ぜんぶの {行|ぎょう}から はじまる。'), sql: 'SELECT name, price\nFROM products;', mark: 'FROM products', table: R('SELECT id, name, price FROM products;') },
        { cap: T3("LIKE '%Pro%': is Pro somewhere in the name?", "LIKE '%Pro%'：name のどこかに Pro があるか確かめる。", "LIKE '%Pro%'：name の どこかに Pro が あるか たしかめる。"), sql: "SELECT name, price\nFROM products\nWHERE name LIKE '%Pro%';", mark: "LIKE '%Pro%'", table: e => checked(e, 'SELECT id, name, price FROM products;', "name LIKE '%Pro%'", ['name']) },
        { cap: T3('The names with Pro stay.', 'Pro をふくむ行だけが残る。', 'Pro を ふくむ {行|ぎょう}だけが のこる。'), sql: "SELECT name, price\nFROM products\nWHERE name LIKE '%Pro%';", mark: "LIKE '%Pro%'", table: R("SELECT id, name, price FROM products WHERE name LIKE '%Pro%';", { hide: ['id'], hl: ['name'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('contains', 'ふくむ', 'ふくむ'), covers: ['contains'], cap: T3('% on both sides: Wireless can be anywhere in the name.', '% を両側に付ける：name のどこかに Wireless があればよい。', '% を りょうがわに つける：name の どこかに Wireless が あれば よい。'), sql: "SELECT name\nFROM products\nWHERE name LIKE '%Wireless%';", mark: "'%Wireless%'", table: e => checked(e, 'SELECT id, name, price FROM products;', "name LIKE '%Wireless%'", ['name']) },
        { label: T3('starts with', 'で始まる', 'で はじまる'), cap: T3('% only at the end: the name starts with Web.', '% をうしろだけに付ける：Web で始まる名前。', '% を うしろだけに つける：Web で はじまる {名前|なまえ}。'), sql: "SELECT name\nFROM products\nWHERE name LIKE 'Web%';", mark: "'Web%'", table: e => checked(e, 'SELECT id, name, price FROM products;', "name LIKE 'Web%'", ['name']) },
        { label: T3('ends with', 'で終わる', 'で おわる'), cap: T3('% only at the start: the name ends with Pro.', '% を前だけに付ける：Pro で終わる名前。', '% を {前|まえ}だけに つける：Pro で おわる {名前|なまえ}。'), sql: "SELECT name\nFROM products\nWHERE name LIKE '%Pro';", mark: "'%Pro'", table: e => checked(e, 'SELECT id, name, price FROM products;', "name LIKE '%Pro'", ['name']) },
        { label: T3('no %', '% なし', '% なし'), cap: T3('Without % it means exactly “Pro”: no row.', '% がないと「ぴったり Pro」という意味になる。1 行も合わない。', '% が ないと「ぴったり Pro」という いみに なる。1{行|ぎょう}も あわない。'), sql: "SELECT name\nFROM products\nWHERE name LIKE 'Pro';", mark: "'Pro'", table: e => checked(e, 'SELECT id, name, price FROM products;', "name LIKE 'Pro'", ['name']) }
      ] },
      { type: 'mistake', title: T3('= instead of LIKE', 'LIKE のつもりで = と書く', 'LIKE の つもりで = と {書|か}く'), wrong: "SELECT name\nFROM products\nWHERE name = '%Pro%';", right: "SELECT name\nFROM products\nWHERE name LIKE '%Pro%';",
        why: T3('% is special only with LIKE. With = it is just the character %.', '% が特別な意味を持つのは LIKE だけ。= では、% もただの文字になる。', '% が とくべつな いみを もつのは LIKE だけ。= では、% も ただの {文字|もじ}に なる。') },
      { type: 'mistake', title: T3('The pattern without quotes', "パターンに ' ' がない", "パターンに ' ' が ない"), wrong: 'SELECT name\nFROM products\nWHERE name LIKE %Pro%;', right: "SELECT name\nFROM products\nWHERE name LIKE '%Pro%';",
        why: T3("The pattern is text: put it in ' ' (the % inside).", "パターンは文字なので ' ' で囲む。% も ' ' の中に書く。", "パターンは {文字|もじ}なので ' ' で かこむ。% も ' ' の {中|なか}に {書|か}く。") },
      { type: 'quiz', q: T3('How many rows stay?', '何行残る？', '{何行|なんぎょう} のこる？'), sql: "SELECT name\nFROM products\nWHERE name LIKE 'Wireless%';", mark: "'Wireless%'",
        choices: ['1', '2', '3'], answer: e => one(e, "SELECT COUNT(*) FROM products WHERE name LIKE 'Wireless%';"),
        why: T3('Two names start with Wireless: Wireless Mouse and Wireless Mouse Pro.', 'Wireless で始まる名前は 2 つ：Wireless Mouse と Wireless Mouse Pro。', 'Wireless で はじまる {名前|なまえ}は 2つ：Wireless Mouse と Wireless Mouse Pro。'),
        before: R('SELECT id, name, price FROM products;', { hl: ['name'] }), table: e => checked(e, 'SELECT id, name, price FROM products;', "name LIKE 'Wireless%'", ['name']) },
      { type: 'points', items: [
        T3("'%x%' contains x · 'x%' starts with x · '%x' ends with x.", "'%x%' は x をふくむ・'x%' は x で始まる・'%x' は x で終わる。", "'%x%' は x を ふくむ・'x%' は x で はじまる・'%x' は x で おわる。"),
        T3('Here (SQLite) LIKE does not tell capital and small letters apart; some databases do.', 'この練習環境（SQLite）の LIKE は、大文字と小文字を区別しない。区別するデータベースもある。', 'ここ（SQLite）の LIKE は、{大文字|おおもじ}と {小文字|こもじ}を くべつ しない。くべつ する データベースも ある。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 8 */
  null: {
    goal: T3('Find the rows where a value is missing (NULL).', '値が入っていない（NULL の）行を探す。', '{値|あたい}が {入|はい}って いない（NULL の）{行|ぎょう}を さがす。'),
    slides: [
      { type: 'scene', who: T3('Sales', '営業担当', 'えいぎょうの {人|ひと}'),
        ask: T3('“Which customers have no e-mail address registered?”', '「メールアドレスが登録されていないお客さんはだれ？」', '「メールアドレスが とうろく されて いない おきゃくさんは だれ？」'), table: R(CON, { hl: ['email'] }) },
      { type: 'syntax', notes: [
        T3('NULL means “no value”. It is not 0 and not an empty text.', 'NULL は「値がない」こと。0 でも、空の文字でもない。', 'NULL は「{値|あたい}が ない」こと。0 でも、からの {文字|もじ}でも ない。'),
        T3('IS NULL: rows where the value is missing.', 'IS NULL：値がない行。', 'IS NULL：{値|あたい}が ない {行|ぎょう}。'),
        T3('IS NOT NULL: rows where there is a value.', 'IS NOT NULL：値がある行。', 'IS NOT NULL：{値|あたい}が ある {行|ぎょう}。')] },
      { type: 'anim', title: T3('What IS NULL does', 'IS NULL がすること', 'IS NULL が すること'), frames: [
        { cap: T3('The contacts table: some e-mails and phones are missing (NULL).', 'contacts テーブル。email や phone が入っていない行（NULL）がある。', 'contacts テーブル。email や phone が {入|はい}って いない {行|ぎょう}（NULL）が ある。'), sql: 'SELECT *\nFROM contacts;', mark: 'FROM contacts', table: R(CON) },
        { cap: T3('WHERE email IS NULL: is the e-mail missing?', 'WHERE email IS NULL：email が入っていないか確かめる。', 'WHERE email IS NULL：email が {入|はい}って いないか たしかめる。'), sql: 'SELECT *\nFROM contacts\nWHERE email IS NULL;', mark: 'email IS NULL', table: WC('email IS NULL', ['email']) },
        { cap: T3('The rows without an e-mail stay.', 'email がない行だけが残る。', 'email が ない {行|ぎょう}だけが のこる。'), sql: 'SELECT name, email\nFROM contacts\nWHERE email IS NULL;', mark: 'email IS NULL', table: R('SELECT id, name, email FROM contacts WHERE email IS NULL;', { hide: ['id'], hl: ['email'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('IS NULL', 'IS NULL', 'IS NULL'), covers: ['isnull'], cap: T3('The rows where email is missing.', 'email が入っていない行。', 'email が {入|はい}って いない {行|ぎょう}。'), sql: 'SELECT name, email\nFROM contacts\nWHERE email IS NULL;', mark: 'IS NULL', table: WC('email IS NULL', ['email']) },
        { label: T3('IS NOT NULL', 'IS NOT NULL', 'IS NOT NULL'), covers: ['notnull'], cap: T3('The rows where email has a value.', 'email が入っている行。', 'email が {入|はい}って いる {行|ぎょう}。'), sql: 'SELECT name, email\nFROM contacts\nWHERE email IS NOT NULL;', mark: 'IS NOT NULL', table: WC('email IS NOT NULL', ['email']) },
        { label: T3('Another column', '別の列', 'べつの {列|れつ}'), covers: ['isnull'], cap: T3('Each column is checked on its own: here the phone.', '列ごとに調べる。今度は phone。', '{列|れつ}ごとに しらべる。こんどは phone。'), sql: 'SELECT name, phone\nFROM contacts\nWHERE phone IS NULL;', mark: 'phone IS NULL', table: WC('phone IS NULL', ['phone']) },
        { label: T3('Both missing', '両方ない', 'りょうほう ない'), cap: T3('With AND: no e-mail and no phone.', 'AND と組み合わせる：email も phone もない行。', 'AND と くみあわせる：email も phone も ない {行|ぎょう}。'), sql: 'SELECT name\nFROM contacts\nWHERE email IS NULL\n  AND phone IS NULL;', mark: 'AND', table: WC('email IS NULL AND phone IS NULL', ['email', 'phone']) }
      ] },
      { type: 'mistake', title: T3('= NULL', '= NULL と書く', '= NULL と {書|か}く'), wrong: 'SELECT name\nFROM contacts\nWHERE email = NULL;', right: 'SELECT name\nFROM contacts\nWHERE email IS NULL;',
        why: T3('NULL cannot be compared with = : the answer is always “unknown”, so no row stays. Use IS NULL.', 'NULL は = で比べられない。答えがいつも「わからない」になり、1 行も残らない。IS NULL を使う。', 'NULL は = で くらべられない。{答|こた}えが いつも「わからない」に なり、1{行|ぎょう}も のこらない。IS NULL を {使|つか}う。') },
      { type: 'mistake', title: T3("'' is not NULL", "'' は NULL ではない", "'' は NULL では ない"), wrong: "SELECT name\nFROM contacts\nWHERE email = '';", right: 'SELECT name\nFROM contacts\nWHERE email IS NULL;',
        why: T3("An empty text '' is a value; NULL is no value. They are different.", "空の文字 '' は「値」。NULL は「値がない」。別のもの。", "からの {文字|もじ} '' は「{値|あたい}」。NULL は「{値|あたい}が ない」。べつの もの。") },
      { type: 'quiz', q: T3('How many rows stay?', '何行残る？', '{何行|なんぎょう} のこる？'), sql: 'SELECT name, phone\nFROM contacts\nWHERE phone IS NOT NULL;', mark: 'IS NOT NULL',
        choices: ['2', '3', '4'], answer: e => one(e, 'SELECT COUNT(*) FROM contacts WHERE phone IS NOT NULL;'),
        why: T3('Three customers have a phone number.', 'phone が入っているのは 3 人。', 'phone が {入|はい}って いるのは 3{人|にん}。'),
        before: R(CON, { hl: ['phone'] }), table: WC('phone IS NOT NULL', ['phone']) },
      { type: 'points', items: [
        T3('Never compare NULL with = or <> : use IS NULL / IS NOT NULL.', 'NULL は = や <> で比べない。IS NULL / IS NOT NULL を使う。', 'NULL は = や <> で くらべない。IS NULL / IS NOT NULL を {使|つか}う。'),
        T3('NULL is not 0 and not an empty text.', 'NULL は 0 でも、空の文字でもない。', 'NULL は 0 でも、からの {文字|もじ}でも ない。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 9 */
  orderby: {
    goal: T3('Sort the rows by a column.', '列の値で、行を並べかえる。', '{列|れつ}の {値|あたい}で、{行|ぎょう}を ならべかえる。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“I want to see the products from the most expensive.”', '「商品を、値段の高い順に見たい。」', '「しょうひんを、ねだんの {高|たか}い じゅんに {見|み}たい。」'), table: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('ORDER BY is written at the end.', 'ORDER BY は最後に書く。', 'ORDER BY は さいごに {書|か}く。'),
        T3('ASC = small to large (the default). DESC = large to small.', 'ASC は小さい順（書かなくても同じ）。DESC は大きい順。', 'ASC は {小|ちい}さい じゅん（{書|か}かなくても おなじ）。DESC は {大|おお}きい じゅん。'),
        T3('With two columns: sort by the first, then by the second inside it.', '列を 2 つ書くと、1 つめで並べ、同じ値の中を 2 つめで並べる。', '{列|れつ}を 2つ {書|か}くと、1つめで ならべ、おなじ {値|あたい}の {中|なか}を 2つめで ならべる。')] },
      { type: 'anim', title: T3('What ORDER BY does', 'ORDER BY がすること', 'ORDER BY が すること'), frames: [
        { cap: T3('The rows come in the order they are stored.', '行は、保存されている順に出てくる。', '{行|ぎょう}は、ほぞん されて いる じゅんに {出|で}て くる。'), sql: 'SELECT name, price\nFROM products;', mark: 'FROM products', table: R('SELECT id, name, price FROM products;', { hide: ['id'] }) },
        { cap: T3('ORDER BY price DESC: sort by price, largest first.', 'ORDER BY price DESC：price の大きい順に並べる。', 'ORDER BY price DESC：price の {大|おお}きい じゅんに ならべる。'), sql: 'SELECT name, price\nFROM products\nORDER BY price DESC;', mark: 'ORDER BY price DESC', table: R('SELECT id, name, price FROM products ORDER BY price DESC;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('ASC turns it round: smallest first.', 'ASC にすると逆になる：小さい順。', 'ASC に すると ぎゃくに なる：{小|ちい}さい じゅん。'), sql: 'SELECT name, price\nFROM products\nORDER BY price ASC;', mark: 'ORDER BY price ASC', table: R('SELECT id, name, price FROM products ORDER BY price ASC;', { hide: ['id'], hl: ['price'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('DESC', 'DESC（大きい順）', 'DESC（{大|おお}きい じゅん）'), covers: ['desc'], cap: T3('Largest stock first.', 'stock の大きい順。', 'stock の {大|おお}きい じゅん。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock DESC;', mark: 'DESC', table: R('SELECT id, name, stock FROM products ORDER BY stock DESC;', { hide: ['id'], hl: ['stock'] }) },
        { label: T3('ASC', 'ASC（小さい順）', 'ASC（{小|ちい}さい じゅん）'), covers: ['asc'], cap: T3('Smallest stock first. ASC can be left out.', 'stock の小さい順。ASC は書かなくても同じ。', 'stock の {小|ちい}さい じゅん。ASC は {書|か}かなくても おなじ。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock ASC;', mark: 'ASC', table: R('SELECT id, name, stock FROM products ORDER BY stock ASC;', { hide: ['id'], hl: ['stock'] }) },
        { label: T3('Two columns', '2 つの列', '2つの {列|れつ}'), covers: ['two', 'asc', 'desc'], cap: T3('First by category (A → Z); inside the same category, by price from the largest.', 'まず category（A → Z）で並べ、同じ category の中は price の大きい順。', 'まず category（A → Z）で ならべ、おなじ category の {中|なか}は price の {大|おお}きい じゅん。'), sql: 'SELECT name, category, price\nFROM products\nORDER BY category ASC, price DESC;', mark: 'category ASC, price DESC', table: R('SELECT id, name, category, price FROM products ORDER BY category ASC, price DESC;', { hide: ['id'], hl: ['category', 'price'] }) },
        { label: T3('Text', '文字の列', '{文字|もじ}の {列|れつ}'), covers: ['asc'], cap: T3('Text is sorted A → Z with ASC (Z → A with DESC).', '文字は、ASC で A → Z の順（DESC で Z → A）。', '{文字|もじ}は、ASC で A → Z の じゅん（DESC で Z → A）。'), sql: 'SELECT name, price\nFROM products\nORDER BY name ASC;', mark: 'ORDER BY name ASC', table: R('SELECT id, name, price FROM products ORDER BY name ASC;', { hide: ['id'], hl: ['name'] }) }
      ] },
      { type: 'mistake', title: T3('ORDER BY before FROM', 'ORDER BY を FROM の前に書く', 'ORDER BY を FROM の {前|まえ}に {書|か}く'), wrong: 'SELECT name, price\nORDER BY price DESC\nFROM products;', right: 'SELECT name, price\nFROM products\nORDER BY price DESC;',
        why: T3('ORDER BY must come after FROM (and after WHERE).', 'ORDER BY は FROM（と WHERE）のあとに書く。', 'ORDER BY は FROM（と WHERE）の あとに {書|か}く。') },
      { type: 'mistake', title: T3('DESC only once', 'DESC を 1 回しか書かない', 'DESC を 1{回|かい}しか {書|か}かない'), wrong: 'SELECT name, category, price\nFROM products\nORDER BY category, price DESC;', right: 'SELECT name, category, price\nFROM products\nORDER BY category DESC, price DESC;',
        why: T3('DESC belongs only to the column just before it. To sort both from the largest, write DESC twice.', 'DESC は、すぐ前の列だけにかかる。両方を大きい順にしたいときは、DESC を 2 回書く。', 'DESC は、すぐ {前|まえ}の {列|れつ}だけに かかる。りょうほうを {大|おお}きい じゅんに したい ときは、DESC を 2{回|かい} {書|か}く。') },
      { type: 'quiz', q: T3('Which product comes first?', '1 行目に来る商品はどれ？', '1{行目|ぎょうめ}に {来|く}る しょうひんは どれ？'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock ASC;', mark: 'ORDER BY stock ASC',
        choices: ['Graphic T-Shirt', 'Wireless Mouse', 'Chef Knife Pro'], answer: e => one(e, 'SELECT name FROM products ORDER BY stock ASC LIMIT 1;'),
        why: T3('ASC = smallest first: the smallest stock is 8 (Chef Knife Pro).', 'ASC は小さい順。stock がいちばん小さいのは 8 の Chef Knife Pro。', 'ASC は {小|ちい}さい じゅん。stock が いちばん {小|ちい}さいのは 8 の Chef Knife Pro。'),
        before: R('SELECT id, name, stock FROM products;', { hide: ['id'], hl: ['stock'] }), table: R('SELECT id, name, stock FROM products ORDER BY stock ASC;', { hide: ['id'], hl: ['stock'] }) },
      { type: 'points', items: [
        T3('Without ORDER BY the order of the rows is not guaranteed.', 'ORDER BY がないとき、行の順番は決まっていない。', 'ORDER BY が ない とき、{行|ぎょう}の じゅんばんは きまって いない。'),
        T3('ASC / DESC is written for each column.', 'ASC・DESC は、列ごとに書く。', 'ASC・DESC は、{列|れつ}ごとに {書|か}く。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 10 */
  distinct: {
    goal: T3('Remove repeated values to see which values there are.', '重複をなくして、どんな値があるかを一覧にする。', 'おなじ {値|あたい}を 1つに して、どんな {値|あたい}が あるかを いちらんに する。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Which categories do we have in our store?”', '「うちの店には、どんなカテゴリがあるの？」', '「うちの {店|みせ}には、どんな カテゴリが あるの？」'), table: R('SELECT id, name, category FROM products;', { hide: ['id'], hl: ['category'] }) },
      { type: 'syntax', notes: [
        T3('DISTINCT is written right after SELECT.', 'DISTINCT は SELECT のすぐあとに書く。', 'DISTINCT は SELECT の すぐ あとに {書|か}く。'),
        T3('The same value appears only once.', '同じ値は 1 回だけ出る。', 'おなじ {値|あたい}は 1{回|かい}だけ {出|で}る。'),
        T3('ORDER BY makes the list easy to read.', 'ORDER BY で並べると、一覧が見やすい。', 'ORDER BY で ならべると、いちらんが {見|み}やすい。')] },
      { type: 'anim', title: T3('What DISTINCT does', 'DISTINCT がすること', 'DISTINCT が すること'), frames: [
        { cap: T3('SELECT category: 10 rows, the same category many times.', 'SELECT category：10 行。同じ category が何回も出る。', 'SELECT category：10{行|ぎょう}。おなじ category が {何回|なんかい}も {出|で}る。'), sql: 'SELECT category\nFROM products;', mark: 'category', table: R('SELECT id, category FROM products;', { hide: ['id'], cls: v => 'g' + ['Books', 'Clothing', 'Electronics', 'Kitchen'].indexOf(v[1]) }) },
        { cap: T3('DISTINCT: the same values become one row.', 'DISTINCT：同じ値は 1 行にまとまる。', 'DISTINCT：おなじ {値|あたい}は 1{行|ぎょう}に まとまる。'), sql: 'SELECT DISTINCT category\nFROM products;', mark: 'DISTINCT', table: R('SELECT DISTINCT category FROM products;', { cls: v => 'g' + ['Books', 'Clothing', 'Electronics', 'Kitchen'].indexOf(v[0]) }),
          merge: e => Object.fromEntries(e.exec('SELECT id, category FROM products;').values.map(([id, c]) => [String(id), c])) },
        { cap: T3('ORDER BY category ASC: the list in A → Z order.', 'ORDER BY category ASC：A → Z の順に並べる。', 'ORDER BY category ASC：A → Z の じゅんに ならべる。'), sql: 'SELECT DISTINCT category\nFROM products\nORDER BY category ASC;', mark: 'ORDER BY category ASC', table: R('SELECT DISTINCT category FROM products ORDER BY category ASC;', { cls: v => 'g' + ['Books', 'Clothing', 'Electronics', 'Kitchen'].indexOf(v[0]) }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('A → Z', 'A → Z の順', 'A → Z の じゅん'), covers: ['distinct', 'asc'], cap: T3('The categories once each, A → Z.', 'category を 1 回ずつ、A → Z の順で。', 'category を 1{回|かい}ずつ、A → Z の じゅんで。'), sql: 'SELECT DISTINCT category\nFROM products\nORDER BY category ASC;', mark: 'ASC', table: R('SELECT DISTINCT category FROM products ORDER BY category ASC;') },
        { label: T3('Z → A', 'Z → A の順', 'Z → A の じゅん'), covers: ['distinct', 'desc'], cap: T3('The same list, Z → A.', '同じ一覧を、Z → A の順で。', 'おなじ いちらんを、Z → A の じゅんで。'), sql: 'SELECT DISTINCT category\nFROM products\nORDER BY category DESC;', mark: 'DESC', table: R('SELECT DISTINCT category FROM products ORDER BY category DESC;') },
        { label: T3('Numbers', '数字の列', '{数字|すうじ}の {列|れつ}'), covers: ['distinct'], cap: T3('Which years are there? Each year once.', 'どの年がある？ 同じ年は 1 回だけ。', 'どの {年|とし}が ある？ おなじ {年|とし}は 1{回|かい}だけ。'), sql: 'SELECT DISTINCT release_year\nFROM products\nORDER BY release_year ASC;', mark: 'DISTINCT release_year', table: R('SELECT DISTINCT release_year FROM products ORDER BY release_year ASC;') },
        { label: T3('Two columns', '2 つの列', '2つの {列|れつ}'), cap: T3('With two columns, the pair must be the same to be removed.', '列が 2 つのときは、「組み合わせ」が同じ行だけが 1 つにまとまる。', '{列|れつ}が 2つの ときは、「くみあわせ」が おなじ {行|ぎょう}だけが 1つに まとまる。'), sql: 'SELECT DISTINCT category, release_year\nFROM products\nORDER BY category ASC;', mark: 'DISTINCT category, release_year', table: e => state(e, "SELECT DISTINCT category || ' ' || release_year AS k, category, release_year FROM products ORDER BY category ASC, release_year ASC;", { hide: ['k'] }) }
      ] },
      { type: 'mistake', title: T3('DISTINCT in the wrong place', 'DISTINCT の位置がちがう', 'DISTINCT の いちが ちがう'), wrong: 'SELECT category DISTINCT\nFROM products;', right: 'SELECT DISTINCT category\nFROM products;',
        why: T3('DISTINCT comes right after SELECT, before the column.', 'DISTINCT は SELECT のすぐあと、列の名前の前に書く。', 'DISTINCT は SELECT の すぐ あと、{列|れつ}の {名前|なまえ}の {前|まえ}に {書|か}く。') },
      { type: 'mistake', title: T3('Too many columns', '列を書きすぎる', '{列|れつ}を {書|か}きすぎる'), wrong: 'SELECT DISTINCT name, category\nFROM products;', right: 'SELECT DISTINCT category\nFROM products;',
        why: T3('With name too, every row is different, so nothing is removed. Write only the column you want a list of.', 'name も書くと、どの行もちがう組み合わせになり、1 行も減らない。一覧にしたい列だけを書く。', 'name も {書|か}くと、どの {行|ぎょう}も ちがう くみあわせに なり、1{行|ぎょう}も へらない。いちらんに したい {列|れつ}だけを {書|か}く。') },
      { type: 'quiz', q: T3('How many rows does the result have?', 'この結果は何行になる？', 'この {結果|けっか}は {何行|なんぎょう}に なる？'), sql: 'SELECT DISTINCT release_year\nFROM products;', mark: 'DISTINCT release_year',
        choices: ['10', '5', '4'], answer: e => one(e, 'SELECT COUNT(DISTINCT release_year) FROM products;'),
        why: T3('There are five different years: 2018, 2019, 2020, 2021, 2022.', 'ちがう年は 5 つ：2018・2019・2020・2021・2022。', 'ちがう {年|とし}は 5つ：2018・2019・2020・2021・2022。'),
        before: R('SELECT id, name, release_year FROM products;', { hide: ['id'], hl: ['release_year'] }), table: R('SELECT DISTINCT release_year FROM products ORDER BY release_year ASC;') },
      { type: 'points', items: [
        T3('DISTINCT answers “which values are there?”.', 'DISTINCT は「どんな値があるか」を調べるときに使う。', 'DISTINCT は「どんな {値|あたい}が あるか」を しらべる ときに {使|つか}う。'),
        T3('DISTINCT works on the whole row of the result, not on one column only.', 'DISTINCT は、結果の 1 行全体が同じかどうかで決まる（1 つの列だけではない）。', 'DISTINCT は、{結果|けっか}の 1{行|ぎょう} ぜんたいが おなじか どうかで きまる（1つの {列|れつ}だけでは ない）。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 11 */
  limit: {
    goal: T3('Take only the first rows: LIMIT and OFFSET.', '上から何行かだけ取り出す：LIMIT と OFFSET。', '{上|うえ}から {何行|なんぎょう}かだけ {取|と}り{出|だ}す：LIMIT と OFFSET。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“What are our three most expensive products?”', '「値段の高い商品トップ 3 は？」', '「ねだんの {高|たか}い しょうひん トップ 3 は？」'), table: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('LIMIT n: only the first n rows.', 'LIMIT n：上から n 行だけ。', 'LIMIT n：{上|うえ}から n{行|ぎょう}だけ。'),
        T3('Use it with ORDER BY: sort first, then cut.', 'ふつう ORDER BY といっしょに使う。並べてから、切る。', 'ふつう ORDER BY と いっしょに {使|つか}う。ならべてから、きる。'),
        T3('OFFSET k: skip the first k rows.', 'OFFSET k：先頭の k 行を飛ばす。', 'OFFSET k：はじめの k{行|ぎょう}を とばす。')] },
      { type: 'anim', title: T3('What LIMIT and OFFSET do', 'LIMIT と OFFSET がすること', 'LIMIT と OFFSET が すること'), frames: [
        { cap: T3('The products, in the order they are stored.', '商品。保存されている順。', 'しょうひん。ほぞん されて いる じゅん。'), sql: 'SELECT name, price\nFROM products;', mark: 'FROM products', table: R('SELECT id, name, price FROM products;', { hide: ['id'] }) },
        { cap: T3('First sort: most expensive first.', 'まず並べる：値段の高い順。', 'まず ならべる：ねだんの {高|たか}い じゅん。'), sql: 'SELECT name, price\nFROM products\nORDER BY price DESC;', mark: 'ORDER BY price DESC', table: R('SELECT id, name, price FROM products ORDER BY price DESC;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('LIMIT 3: only the first 3 rows stay.', 'LIMIT 3：上から 3 行だけが残る。', 'LIMIT 3：{上|うえ}から 3{行|ぎょう}だけが のこる。'), sql: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;', mark: 'LIMIT 3', table: R('SELECT id, name, price FROM products ORDER BY price DESC LIMIT 3;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('OFFSET 2: skip 2 rows, then take 3 (the 3rd to the 5th).', 'OFFSET 2：2 行飛ばして、そこから 3 行（3 番目〜5 番目）。', 'OFFSET 2：2{行|ぎょう} とばして、そこから 3{行|ぎょう}（3ばんめ〜5ばんめ）。'), sql: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3 OFFSET 2;', mark: 'LIMIT 3 OFFSET 2', table: R('SELECT id, name, price FROM products ORDER BY price DESC LIMIT 3 OFFSET 2;', { hide: ['id'], hl: ['price'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Top 3', '大きい順のトップ 3', '{大|おお}きい じゅんの トップ 3'), covers: ['limit', 'desc'], cap: T3('The 3 largest stocks.', 'stock の大きい順に 3 行。', 'stock の {大|おお}きい じゅんに 3{行|ぎょう}。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock DESC\nLIMIT 3;', mark: 'DESC\nLIMIT 3', table: R('SELECT id, name, stock FROM products ORDER BY stock DESC LIMIT 3;', { hide: ['id'], hl: ['stock'] }) },
        { label: T3('Bottom 3', '小さい順のトップ 3', '{小|ちい}さい じゅんの トップ 3'), covers: ['limit', 'asc'], cap: T3('ASC: the 3 smallest stocks.', 'ASC にすると、stock の小さい順に 3 行。', 'ASC に すると、stock の {小|ちい}さい じゅんに 3{行|ぎょう}。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock ASC\nLIMIT 3;', mark: 'ASC\nLIMIT 3', table: R('SELECT id, name, stock FROM products ORDER BY stock ASC LIMIT 3;', { hide: ['id'], hl: ['stock'] }) },
        { label: T3('OFFSET', 'OFFSET（飛ばす）', 'OFFSET（とばす）'), covers: ['offset', 'limit', 'desc'], cap: T3('Skip 3 rows, then take 2: the 4th and the 5th.', '3 行飛ばして 2 行：4 番目と 5 番目。', '3{行|ぎょう} とばして 2{行|ぎょう}：4ばんめと 5ばんめ。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock DESC\nLIMIT 2 OFFSET 3;', mark: 'LIMIT 2 OFFSET 3', table: R('SELECT id, name, stock FROM products ORDER BY stock DESC LIMIT 2 OFFSET 3;', { hide: ['id'], hl: ['stock'] }) },
        { label: T3('OFFSET with ASC', 'OFFSET と ASC', 'OFFSET と ASC'), covers: ['offset', 'limit', 'asc'], cap: T3('From the smallest: skip 2, then take 3 (the 3rd to the 5th).', '小さい順で、2 行飛ばして 3 行（3 番目〜5 番目）。', '{小|ちい}さい じゅんで、2{行|ぎょう} とばして 3{行|ぎょう}（3ばんめ〜5ばんめ）。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock ASC\nLIMIT 3 OFFSET 2;', mark: 'LIMIT 3 OFFSET 2', table: R('SELECT id, name, stock FROM products ORDER BY stock ASC LIMIT 3 OFFSET 2;', { hide: ['id'], hl: ['stock'] }) },
        { label: T3('Only the 4th', '4 番目だけ', '4ばんめだけ'), cap: T3('LIMIT 1 OFFSET 3: skip 3 and take one row, the 4th.', 'LIMIT 1 OFFSET 3：3 行飛ばして 1 行。4 番目の行だけ。', 'LIMIT 1 OFFSET 3：3{行|ぎょう} とばして 1{行|ぎょう}。4ばんめの {行|ぎょう}だけ。'), sql: 'SELECT name, stock\nFROM products\nORDER BY stock DESC\nLIMIT 1 OFFSET 3;', mark: 'LIMIT 1 OFFSET 3', table: R('SELECT id, name, stock FROM products ORDER BY stock DESC LIMIT 1 OFFSET 3;', { hide: ['id'], hl: ['stock'] }) }
      ] },
      { type: 'mistake', title: T3('LIMIT before ORDER BY', 'LIMIT を ORDER BY の前に書く', 'LIMIT を ORDER BY の {前|まえ}に {書|か}く'), wrong: 'SELECT name, price\nFROM products\nLIMIT 3\nORDER BY price DESC;', right: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;',
        why: T3('LIMIT is written last, after ORDER BY.', 'LIMIT は最後に書く。ORDER BY のあと。', 'LIMIT は さいごに {書|か}く。ORDER BY の あと。') },
      { type: 'mistake', title: T3('No ORDER BY', 'ORDER BY を書かない', 'ORDER BY を {書|か}かない'), wrong: 'SELECT name, price\nFROM products\nLIMIT 3;', right: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;',
        why: T3('Without ORDER BY you get the first 3 stored rows, not the 3 most expensive.', 'ORDER BY がないと、「保存されている順の 3 行」になる。「高い順の 3 行」にはならない。', 'ORDER BY が ないと、「ほぞん されて いる じゅんの 3{行|ぎょう}」に なる。「{高|たか}い じゅんの 3{行|ぎょう}」には ならない。') },
      { type: 'quiz', q: T3('Which product comes first in the result?', '結果の 1 行目に来る商品はどれ？', '{結果|けっか}の 1{行目|ぎょうめ}に {来|く}る しょうひんは どれ？'), sql: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 2 OFFSET 1;', mark: 'LIMIT 2 OFFSET 1',
        choices: ['Noise Cancelling Headphones Pro', 'Mechanical Keyboard', 'Chef Knife Pro'], answer: e => one(e, 'SELECT name FROM products ORDER BY price DESC LIMIT 1 OFFSET 1;'),
        why: T3('OFFSET 1 skips the most expensive one, so the result starts with the 2nd: Mechanical Keyboard.', 'OFFSET 1 で、いちばん高い商品を飛ばす。結果は 2 番目の Mechanical Keyboard から始まる。', 'OFFSET 1 で、いちばん {高|たか}い しょうひんを とばす。{結果|けっか}は 2ばんめの Mechanical Keyboard から はじまる。'),
        before: R('SELECT id, name, price FROM products ORDER BY price DESC;', { hide: ['id'], hl: ['price'] }), table: R('SELECT id, name, price FROM products ORDER BY price DESC LIMIT 2 OFFSET 1;', { hide: ['id'], hl: ['price'] }) },
      { type: 'points', items: [
        T3('Sort first (ORDER BY), then cut (LIMIT).', '先に並べて（ORDER BY）、それから切る（LIMIT）。', 'さきに ならべて（ORDER BY）、それから きる（LIMIT）。'),
        T3('LIMIT n OFFSET k: skip k rows, then take n. The (k + 1)th row comes first.', 'LIMIT n OFFSET k：k 行飛ばして n 行。結果は (k + 1) 番目の行から始まる。', 'LIMIT n OFFSET k：k{行|ぎょう} とばして n{行|ぎょう}。{結果|けっか}は (k + 1)ばんめの {行|ぎょう}から はじまる。')] },
      { type: 'practice' }
    ]
  }
};
