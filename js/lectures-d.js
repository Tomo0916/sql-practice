/* =========================================================
 * lectures-d.js — lectures in the new form, Lessons 19–28, 35, 36
 * (CASE, calculations, COALESCE, text and date functions,
 * subqueries, WITH, window functions, three tables, UNION …).
 *
 * Same shape as lectures-a.js: scene → syntax → animation → every
 * pattern the problems use (covers: topics of lecture-topics.js) →
 * common mistakes → a quiz → summary → to the example.
 * Tables are computed from the data, never typed.
 * ========================================================= */
import { T3, state, checked } from './lecture-kit.js';

/** the result of a query; the first column is the row's key (hide it with hide: ['id']) */
const R = (sql, opts) => e => state(e, sql, opts);
const one = (e, sql) => e.exec(sql).values[0][0];
const PR = 'SELECT id, name, category, price, stock FROM products;';
const W = (cond, cols) => e => checked(e, 'SELECT id, name, category, price FROM products;', cond, cols, { hide: ['id'] });
/** a case: the SQL and its result side by side */
const C = (label, covers, cap, sql, mark, opts) => ({ label, covers, cap, sql, mark, table: R(sql.replace(/\n/g, ' '), opts) });

export const LECT_D = {
  /* ------------------------------------------------ Lesson 19 */
  case: {
    goal: T3('Give a different value for each condition: CASE.', '条件ごとに別の値を出す：CASE。', '{条件|じょうけん}ごとに べつの {値|あたい}を {出|だ}す：CASE。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Next to each product, write high if it costs 5000 or more, low otherwise.”', '「商品ごとに、5000 円以上なら high、それ以外は low と書いてほしい」', '「しょうひんごとに、5000{円|えん} いじょうなら high、それ いがいは low と {書|か}いて ほしい」'),
        table: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('CASE WHEN condition THEN value ELSE value END makes one new column.', 'CASE WHEN 条件 THEN 値 ELSE 値 END で、新しい列が 1 つできる。', 'CASE WHEN {条件|じょうけん} THEN {値|あたい} ELSE {値|あたい} END で、あたらしい {列|れつ}が 1つ できる。'),
        T3('The WHENs are checked from the top. The first one that matches wins.', 'WHEN は上から順に調べる。最初に当てはまったものが使われる。', 'WHEN は {上|うえ}から じゅんに しらべる。さいしょに あてはまった ものが {使|つか}われる。'),
        T3('Do not forget END. Name the column with AS.', 'END を忘れない。列名は AS で付ける。', 'END を わすれない。{列|れつ}の なまえは AS で つける。')] },
      { type: 'anim', title: T3('What CASE does', 'CASE がすること', 'CASE が すること'), frames: [
        { cap: T3('Every row is checked: is price 5000 or more?', '1 行ずつ調べる：price は 5000 以上？', '1{行|ぎょう}ずつ しらべる：price は 5000 いじょう？'), sql: 'SELECT name, price\nFROM products;', mark: 'price', table: W('price >= 5000', ['price']) },
        { cap: T3('Yes → high, no → low. The answer becomes a new column.', '当てはまる → high、当てはまらない → low。答えが新しい列になる。', 'あてはまる → high、あてはまらない → low。こたえが あたらしい {列|れつ}に なる。'), sql: "SELECT name, price,\n  CASE WHEN price >= 5000 THEN 'high'\n       ELSE 'low' END AS level\nFROM products;", mark: "CASE WHEN price >= 5000 THEN 'high'", table: R("SELECT name, price, CASE WHEN price >= 5000 THEN 'high' ELSE 'low' END AS level FROM products;", { hl: ['level'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Two values', '2 つに分ける', '2つに わける'), ['two'], T3('stock 20 or more → many, otherwise few.', 'stock が 20 以上なら many、それ以外は few。', 'stock が 20 いじょうなら many、それ いがいは few。'),
          "SELECT name, stock,\n  CASE WHEN stock >= 20 THEN 'many'\n       ELSE 'few' END AS amount\nFROM products;", "CASE WHEN stock >= 20 THEN 'many'", { hl: ['amount'] }),
        C(T3('Three values', '3 つに分ける', '3つに わける'), ['three'], T3('Two WHENs: write the bigger number first.', 'WHEN を 2 つ。大きい数を先に書く。', 'WHEN を 2つ。{大|おお}きい {数|かず}を さきに {書|か}く。'),
          "SELECT name, price,\n  CASE WHEN price >= 5000 THEN 'high'\n       WHEN price >= 2500 THEN 'mid'\n       ELSE 'low' END AS level\nFROM products;", "WHEN price >= 2500 THEN 'mid'", { hl: ['level'] })
      ] },
      { type: 'mistake', title: T3('The smaller number first', '小さい数を先に書く', '{小|ちい}さい {数|かず}を さきに {書|か}く'),
        wrong: "SELECT name, price,\n  CASE WHEN price >= 2500 THEN 'mid'\n       WHEN price >= 5000 THEN 'high'\n       ELSE 'low' END AS level\nFROM products;",
        right: "SELECT name, price,\n  CASE WHEN price >= 5000 THEN 'high'\n       WHEN price >= 2500 THEN 'mid'\n       ELSE 'low' END AS level\nFROM products;",
        why: T3('18000 is also 2500 or more, so the first WHEN catches it and it becomes mid. Check the biggest first.', '18000 も 2500 以上なので、最初の WHEN で mid になってしまう。大きいほうから調べる。', '18000 も 2500 いじょう なので、さいしょの WHEN で mid に なって しまう。{大|おお}きい ほうから しらべる。') },
      { type: 'quiz', q: T3('What is the level of Coffee Maker (3500)?', 'Coffee Maker（3500）の level はどれ？', 'Coffee Maker（3500）の level は どれ？'),
        sql: "SELECT name, price,\n  CASE WHEN price >= 5000 THEN 'high'\n       WHEN price >= 3000 THEN 'mid'\n       ELSE 'low' END AS level\nFROM products;", mark: "WHEN price >= 3000 THEN 'mid'",
        choices: ['high', 'mid', 'low'], answer: e => one(e, "SELECT CASE WHEN price >= 5000 THEN 'high' WHEN price >= 3000 THEN 'mid' ELSE 'low' END FROM products WHERE name = 'Coffee Maker';"),
        why: T3('3500 is not 5000 or more, but it is 3000 or more: mid.', '3500 は 5000 以上ではないが、3000 以上なので mid。', '3500 は 5000 いじょう では ないが、3000 いじょう なので mid。'),
        table: R("SELECT name, price, CASE WHEN price >= 5000 THEN 'high' WHEN price >= 3000 THEN 'mid' ELSE 'low' END AS level FROM products;", { hl: ['level'] }) },
      { type: 'points', items: [
        T3('CASE WHEN … THEN … ELSE … END AS name: one new column.', 'CASE WHEN … THEN … ELSE … END AS 名前：新しい列が 1 つ。', 'CASE WHEN … THEN … ELSE … END AS なまえ：あたらしい {列|れつ}が 1つ。'),
        T3('The first WHEN that matches wins, so write the strictest condition first.', '最初に当てはまった WHEN が使われる。きびしい条件を先に書く。', 'さいしょに あてはまった WHEN が {使|つか}われる。きびしい {条件|じょうけん}を さきに {書|か}く。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 20 */
  calc: {
    goal: T3('Calculate with columns and round the result: ROUND.', '列で計算して、四捨五入する：ROUND。', '{列|れつ}で {計算|けいさん}して、ししゃごにゅう する：ROUND。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Show the price with 10% tax, without decimals.”', '「10% の税込み価格を、小数なしで出して」', '「10% の ぜいこみ かかくを、しょうすう なしで {出|だ}して」'), table: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('You can calculate in SELECT: price * 1.1, price / stock …', 'SELECT の中で計算できる：price * 1.1、price / stock など。', 'SELECT の なかで {計算|けいさん}できる：price * 1.1、price / stock など。'),
        T3('ROUND(value) rounds to a whole number; ROUND(value, 2) keeps 2 decimal places.', 'ROUND(値) は整数に、ROUND(値, 2) は小数第 2 位までに四捨五入。', 'ROUND({値|あたい}) は せいすうに、ROUND({値|あたい}, 2) は しょうすう 2けたまでに ししゃごにゅう。'),
        T3('Integer ÷ integer drops the decimals. Multiply by 1.0 first.', '整数 ÷ 整数は小数が消える。先に 1.0 をかける。', 'せいすう ÷ せいすうは しょうすうが きえる。さきに 1.0 を かける。')] },
      { type: 'anim', title: T3('Calculate, then round', '計算してから四捨五入', '{計算|けいさん}してから ししゃごにゅう'), frames: [
        { cap: T3('price * 1.1 can have decimals.', 'price * 1.1 は小数になることがある。', 'price * 1.1 は しょうすうに なる ことが ある。'), sql: 'SELECT name, price, price * 1.1\nFROM products;', mark: 'price * 1.1', table: R('SELECT name, price, price * 1.1 FROM products;') },
        { cap: T3('ROUND( … ) makes it a whole number.', 'ROUND( … ) で整数にする。', 'ROUND( … ) で せいすうに する。'), sql: 'SELECT name, price, ROUND(price * 1.1) AS with_tax\nFROM products;', mark: 'ROUND(price * 1.1)', table: R('SELECT name, price, ROUND(price * 1.1) AS with_tax FROM products;', { hl: ['with_tax'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('With tax', '税込み', 'ぜいこみ'), ['tax'], T3('8% tax: multiply by 1.08.', '8% なら 1.08 をかける。', '8% なら 1.08 を かける。'), 'SELECT name, price, ROUND(price * 1.08) AS with_tax\nFROM products;', 'ROUND(price * 1.08)', { hl: ['with_tax'] }),
        C(T3('Divide two columns', '列どうしの割り算', '{列|れつ}どうしの わりざん'), ['ratio'], T3('Price per item in stock, 2 decimal places.', '在庫 1 個あたりの値段。小数第 2 位まで。', 'ざいこ 1こ あたりの ねだん。しょうすう 2けたまで。'), 'SELECT name, ROUND(price * 1.0 / stock, 2) AS per_one\nFROM products;', 'ROUND(price * 1.0 / stock, 2)', { hl: ['per_one'] }),
        C(T3('Round an average', '平均を四捨五入', 'へいきんを ししゃごにゅう'), ['avg'], T3('The average price of each category, 1 decimal place.', 'カテゴリごとの平均。小数第 1 位まで。', 'カテゴリごとの へいきん。しょうすう 1けたまで。'), 'SELECT category, ROUND(AVG(price), 1) AS avg_price\nFROM products\nGROUP BY category;', 'ROUND(AVG(price), 1)', { hl: ['avg_price'] })
      ] },
      { type: 'mistake', title: T3('Integer ÷ integer', '整数 ÷ 整数', 'せいすう ÷ せいすう'), wrong: 'SELECT name, ROUND(price / stock, 2) AS per_one\nFROM products;', right: 'SELECT name, ROUND(price * 1.0 / stock, 2) AS per_one\nFROM products;',
        why: T3('price / stock divides integers, so 1500 / 50 … loses its decimals before ROUND. * 1.0 keeps them.', 'price / stock は整数どうしなので、ROUND の前に小数が消える。* 1.0 で小数が残る。', 'price / stock は せいすう どうし なので、ROUND の まえに しょうすうが きえる。* 1.0 で しょうすうが のこる。') },
      { type: 'quiz', q: T3('What does 7 / 2 give in SQLite?', 'SQLite で 7 / 2 の答えは？', 'SQLite で 7 / 2 の こたえは？'), sql: 'SELECT 7 / 2;', mark: '7 / 2',
        choices: ['3', '3.5', '4'], answer: e => one(e, 'SELECT 7 / 2;'),
        why: T3('Both are integers, so the decimals are dropped: 3. 7 * 1.0 / 2 gives 3.5.', '両方とも整数なので小数が消えて 3。7 * 1.0 / 2 なら 3.5。', 'どちらも せいすう なので しょうすうが きえて 3。7 * 1.0 / 2 なら 3.5。'),
        table: R('SELECT 7 / 2 AS a, 7 * 1.0 / 2 AS b;') },
      { type: 'points', items: [
        T3('Calculate in SELECT and name the result with AS.', 'SELECT の中で計算し、AS で名前を付ける。', 'SELECT の なかで {計算|けいさん}し、AS で なまえを つける。'),
        T3('ROUND(value, n): n decimal places (none = a whole number).', 'ROUND(値, n)：小数第 n 位まで（書かなければ整数）。', 'ROUND({値|あたい}, n)：しょうすう nけたまで（{書|か}かなければ せいすう）。'),
        T3('To divide integers, multiply by 1.0 first.', '整数どうしの割り算は、先に 1.0 をかける。', 'せいすう どうしの わりざんは、さきに 1.0 を かける。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 21 */
  coalesce: {
    goal: T3('Show something else instead of NULL: COALESCE.', 'NULL の代わりに別の値を出す：COALESCE。', 'NULL の かわりに べつの {値|あたい}を {出|だ}す：COALESCE。'),
    slides: [
      { type: 'scene', who: T3('Office worker', '事務の人', 'じむの {人|ひと}'),
        ask: T3('“Some emails are empty. Write none there instead of a blank.”', '「メールが空の人がいる。空白ではなく none と書いてほしい」', '「メールが からの {人|ひと}が いる。くうはく では なく none と {書|か}いて ほしい」'), table: R('SELECT id, name, email FROM contacts;', { hide: ['id'], hl: ['email'] }) },
      { type: 'syntax', notes: [
        T3('COALESCE(column, other) gives the other value only when the column is NULL.', 'COALESCE(列, 別の値)：列が NULL のときだけ別の値になる。', 'COALESCE({列|れつ}, べつの {値|あたい})：{列|れつ}が NULL の ときだけ べつの {値|あたい}に なる。'),
        T3('COUNT(*) counts every row. COUNT(column) counts only the rows that are not NULL.', 'COUNT(*) はすべての行、COUNT(列) は NULL でない行だけを数える。', 'COUNT(*) は すべての {行|ぎょう}、COUNT({列|れつ}) は NULL で ない {行|ぎょう}だけを かぞえる。')] },
      { type: 'anim', title: T3('What COALESCE does', 'COALESCE がすること', 'COALESCE が すること'), frames: [
        { cap: T3('Some emails are NULL.', 'email が NULL の行がある。', 'email が NULL の {行|ぎょう}が ある。'), sql: 'SELECT name, email\nFROM contacts;', mark: 'email', table: R('SELECT name, email FROM contacts;', { hl: ['email'] }) },
        { cap: T3('Only the NULLs become none.', 'NULL のところだけ none になる。', 'NULL の ところだけ none に なる。'), sql: "SELECT name, COALESCE(email, 'none') AS email\nFROM contacts;", mark: "COALESCE(email, 'none')", table: R("SELECT name, COALESCE(email, 'none') AS email FROM contacts;", { hl: ['email'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Fill the NULLs', 'NULL を埋める', 'NULL を うめる'), ['fill'], T3('Write - where there is no phone number.', '電話番号がなければ - と書く。', 'でんわ ばんごうが なければ - と {書|か}く。'), "SELECT name, COALESCE(phone, '-') AS phone\nFROM contacts;", "COALESCE(phone, '-')", { hl: ['phone'] }),
        C(T3('Count the filled ones', '入っている数を数える', 'はいって いる {数|かず}を かぞえる'), ['count'], T3('6 people, but only some have an email.', '6 人いるが、email があるのは一部。', '6{人|にん} いるが、email が あるのは いちぶ。'), 'SELECT COUNT(*) AS all_rows, COUNT(email) AS filled\nFROM contacts;', 'COUNT(email)', { hl: ['filled'] })
      ] },
      { type: 'mistake', title: T3('COUNT(*) to count the filled ones', '入っている数を COUNT(*) で数える', 'はいって いる {数|かず}を COUNT(*) で かぞえる'), wrong: 'SELECT COUNT(*) AS filled\nFROM contacts;', right: 'SELECT COUNT(email) AS filled\nFROM contacts;',
        why: T3('COUNT(*) counts the NULL rows too. COUNT(email) skips them.', 'COUNT(*) は NULL の行も数える。COUNT(email) なら NULL を数えない。', 'COUNT(*) は NULL の {行|ぎょう}も かぞえる。COUNT(email) なら NULL を かぞえない。') },
      { type: 'quiz', q: T3('What does this give?', 'この SQL の答えは？', 'この SQL の こたえは？'), sql: 'SELECT COUNT(phone)\nFROM contacts;', mark: 'COUNT(phone)',
        choices: ['3', '4', '6'], answer: e => one(e, 'SELECT COUNT(phone) FROM contacts;'),
        why: T3('3 of the 6 phones are NULL, so 3 are counted.', '6 人のうち 3 人の phone が NULL なので、数えるのは 3。', '6{人|にん}の うち 3{人|にん}の phone が NULL なので、かぞえるのは 3。'),
        table: R('SELECT name, phone FROM contacts;', { hl: ['phone'] }) },
      { type: 'points', items: [
        T3('COALESCE(column, value): the value only where the column is NULL.', 'COALESCE(列, 値)：NULL のところだけ値になる。', 'COALESCE({列|れつ}, {値|あたい})：NULL の ところだけ {値|あたい}に なる。'),
        T3('COUNT(column) does not count NULL; COUNT(*) does.', 'COUNT(列) は NULL を数えない。COUNT(*) は数える。', 'COUNT({列|れつ}) は NULL を かぞえない。COUNT(*) は かぞえる。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 22 */
  strfn: {
    goal: T3('Change and measure text: UPPER, LENGTH, SUBSTR, ||.', '文字を変える・測る：UPPER, LENGTH, SUBSTR, ||。', 'もじを かえる・はかる：UPPER, LENGTH, SUBSTR, ||。'),
    slides: [
      { type: 'scene', who: T3('Web designer', 'Web デザイナー', 'Web デザイナー'),
        ask: T3('“For the labels I need names in capitals, short names, and name / category.”', '「ラベル用に、大文字の名前・短い名前・名前 / カテゴリ が欲しい」', '「ラベルように、おおもじの なまえ・みじかい なまえ・なまえ / カテゴリ が ほしい」'), table: R('SELECT id, name, category FROM products;', { hide: ['id'], hl: ['name'] }) },
      { type: 'syntax', notes: [
        T3('UPPER(text): capital letters. LENGTH(text): the number of characters.', 'UPPER(文字)：大文字に。LENGTH(文字)：文字数。', 'UPPER(もじ)：おおもじに。LENGTH(もじ)：もじの {数|かず}。'),
        T3('SUBSTR(text, start, length): a part. The first character is 1.', 'SUBSTR(文字, 開始, 長さ)：一部を切り出す。最初の文字は 1。', 'SUBSTR(もじ, はじめ, ながさ)：いちぶを きりだす。さいしょの もじは 1。'),
        T3("a || ' / ' || b joins text.", "a || ' / ' || b で文字をつなぐ。", "a || ' / ' || b で もじを つなぐ。")] },
      { type: 'anim', title: T3('Functions work on every row', '関数は 1 行ずつ働く', 'かんすうは 1{行|ぎょう}ずつ はたらく'), frames: [
        { cap: T3('The names as they are.', 'そのままの名前。', 'そのままの なまえ。'), sql: 'SELECT name\nFROM products;', mark: 'name', table: R('SELECT name FROM products;') },
        { cap: T3('LENGTH(name) is worked out for each row.', 'LENGTH(name) が 1 行ずつ計算される。', 'LENGTH(name) が 1{行|ぎょう}ずつ {計算|けいさん}される。'), sql: 'SELECT name, LENGTH(name) AS len\nFROM products;', mark: 'LENGTH(name)', table: R('SELECT name, LENGTH(name) AS len FROM products;', { hl: ['len'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Capitals', '大文字', 'おおもじ'), ['upper'], T3('UPPER makes every letter a capital.', 'UPPER ですべて大文字に。', 'UPPER で すべて おおもじに。'), 'SELECT UPPER(name) AS upper_name\nFROM products;', 'UPPER(name)'),
        C(T3('Long names only', '長い名前だけ', 'ながい なまえだけ'), ['len'], T3('LENGTH in WHERE: names of 15 characters or more.', 'WHERE で LENGTH を使う：15 文字以上の名前。', 'WHERE で LENGTH を {使|つか}う：15もじ いじょうの なまえ。'), 'SELECT name, LENGTH(name) AS len\nFROM products\nWHERE LENGTH(name) >= 15;', 'WHERE LENGTH(name) >= 15', { hl: ['len'] }),
        C(T3('The first characters', '先頭の文字', 'さいしょの もじ'), ['substr'], T3('From the 1st character, 4 characters.', '1 文字目から 4 文字。', '1もじめから 4もじ。'), 'SELECT name, SUBSTR(name, 1, 4) AS short\nFROM products;', 'SUBSTR(name, 1, 4)', { hl: ['short'] }),
        C(T3('Join text', '文字をつなぐ', 'もじを つなぐ'), ['concat'], T3("|| joins name, ' / ' and category.", "|| で name と ' / ' と category をつなぐ。", "|| で name と ' / ' と category を つなぐ。"), "SELECT name || ' / ' || category AS label\nFROM products;", "name || ' / ' || category")
      ] },
      { type: 'mistake', title: T3('Joining text with +', '+ で文字をつなぐ', '+ で もじを つなぐ'), wrong: "SELECT name + ' / ' + category AS label\nFROM products;", right: "SELECT name || ' / ' || category AS label\nFROM products;",
        why: T3('+ is for numbers. In SQLite, text + text becomes 0. Use ||.', '+ は数の足し算。SQLite では文字 + 文字は 0 になる。|| を使う。', '+ は {数|かず}の たしざん。SQLite では もじ + もじは 0 に なる。|| を {使|つか}う。') },
      { type: 'quiz', q: T3('What does this give?', 'この SQL の答えは？', 'この SQL の こたえは？'), sql: "SELECT LENGTH('Coffee Maker');", mark: "LENGTH('Coffee Maker')",
        choices: ['11', '12', '2'], answer: e => one(e, "SELECT LENGTH('Coffee Maker');"),
        why: T3('The space counts too: 6 + 1 + 5 = 12.', '空白も 1 文字に数える：6 + 1 + 5 = 12。', 'くうはくも 1もじに かぞえる：6 + 1 + 5 = 12。'),
        table: R("SELECT name, LENGTH(name) AS len FROM products WHERE name = 'Coffee Maker';", { hl: ['len'] }) },
      { type: 'points', items: [
        T3('UPPER, LENGTH, SUBSTR work on each row, in SELECT or in WHERE.', 'UPPER・LENGTH・SUBSTR は 1 行ずつ働く。SELECT でも WHERE でも使える。', 'UPPER・LENGTH・SUBSTR は 1{行|ぎょう}ずつ はたらく。SELECT でも WHERE でも {使|つか}える。'),
        T3('Join text with ||, not +.', '文字は + ではなく || でつなぐ。', 'もじは + では なく || で つなぐ。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 23 */
  dates: {
    goal: T3('Work with dates: a period, the month, some days later.', '日付を扱う：期間・月・○日後。', 'ひづけを あつかう：きかん・つき・○{日|にち}ご。'),
    slides: [
      { type: 'scene', who: T3('Shop manager', '店長', '{店長|てんちょう}'),
        ask: T3('“What did we sell in April? And how many sales were there each month?”', '「4 月に売れたものは？ 月ごとの売上件数は？」', '「4{月|がつ}に うれた ものは？ つきごとの うりあげ けんすうは？」'), table: R('SELECT id, item, amount, sold_on FROM sales_log;', { hide: ['id'], hl: ['sold_on'] }) },
      { type: 'syntax', notes: [
        T3("Dates are text like '2025-04-01'. Put them in quotes.", "日付は '2025-04-01' の形の文字。' ' で囲む。", "ひづけは '2025-04-01' の かたちの もじ。' ' で かこむ。"),
        T3("BETWEEN '2025-04-01' AND '2025-04-30': the days of April.", "BETWEEN '2025-04-01' AND '2025-04-30'：4 月の日付。", "BETWEEN '2025-04-01' AND '2025-04-30'：4{月|がつ}の ひづけ。"),
        T3("strftime('%m', date) takes out the month; date(date, '+7 days') adds 7 days.", "strftime('%m', 日付) で月を取り出す。date(日付, '+7 days') で 7 日足す。", "strftime('%m', ひづけ) で つきを とりだす。date(ひづけ, '+7 days') で 7{日|にち} たす。")] },
      { type: 'anim', title: T3('Dates can be compared', '日付は比べられる', 'ひづけは くらべられる'), frames: [
        { cap: T3('All the sales.', 'すべての売上。', 'すべての うりあげ。'), sql: 'SELECT item, sold_on\nFROM sales_log;', mark: 'sold_on', table: R('SELECT id, item, sold_on FROM sales_log;', { hide: ['id'], hl: ['sold_on'] }) },
        { cap: T3('Only the days of April are kept.', '4 月の日付だけが残る。', '4{月|がつ}の ひづけだけが のこる。'), sql: "SELECT item, sold_on\nFROM sales_log\nWHERE sold_on BETWEEN '2025-04-01' AND '2025-04-30';", mark: "BETWEEN '2025-04-01' AND '2025-04-30'", table: e => checked(e, 'SELECT id, item, sold_on FROM sales_log;', "sold_on BETWEEN '2025-04-01' AND '2025-04-30'", ['sold_on'], { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('A period', '期間', 'きかん'), ['range'], T3('The sales of May.', '5 月の売上。', '5{月|がつ}の うりあげ。'), "SELECT item, sold_on\nFROM sales_log\nWHERE sold_on BETWEEN '2025-05-01' AND '2025-05-31';", "BETWEEN '2025-05-01' AND '2025-05-31'", { hl: ['sold_on'] }),
        C(T3('Per month', '月ごと', 'つきごと'), ['month'], T3("strftime('%m', …) gives '03', '04' … Group by it.", "strftime('%m', …) で '03'、'04' … にして、グループにする。", "strftime('%m', …) で '03'、'04' … に して、グループに する。"), "SELECT strftime('%m', sold_on) AS month, COUNT(*) AS n\nFROM sales_log\nGROUP BY month;", "strftime('%m', sold_on)", { hl: ['month'] }),
        C(T3('Days later', '○日後', '○{日|にち}ご'), ['plus'], T3('The date 7 days after each sale.', '売れた日の 7 日後。', 'うれた {日|ひ}の 7{日|にち}ご。'), "SELECT item, sold_on, date(sold_on, '+7 days') AS due\nFROM sales_log;", "date(sold_on, '+7 days')", { hl: ['due'] })
      ] },
      { type: 'mistake', title: T3('A date without quotes', '日付を \' \' で囲まない', 'ひづけを \' \' で かこまない'), wrong: 'SELECT item, sold_on\nFROM sales_log\nWHERE sold_on BETWEEN 2025-04-01 AND 2025-04-30;', right: "SELECT item, sold_on\nFROM sales_log\nWHERE sold_on BETWEEN '2025-04-01' AND '2025-04-30';",
        why: T3('Without quotes, 2025-04-01 is a subtraction (2020). No row matches.', "' ' がないと 2025-04-01 は引き算（2020）になり、どの行も当てはまらない。", "' ' が ないと 2025-04-01 は ひきざん（2020）に なり、どの {行|ぎょう}も あてはまらない。") },
      { type: 'quiz', q: T3('What does this give?', 'この SQL の答えは？', 'この SQL の こたえは？'), sql: "SELECT date('2025-04-28', '+7 days');", mark: "'+7 days'",
        choices: ['2025-04-35', '2025-05-05', '2025-05-04'], answer: e => one(e, "SELECT date('2025-04-28', '+7 days');"),
        why: T3('April has 30 days: 28 + 7 goes on to May 5.', '4 月は 30 日まで。28 日の 7 日後は 5 月 5 日。', '4{月|がつ}は 30{日|にち}まで。28{日|にち}の 7{日|にち}ごは 5{月|がつ} 5{日|か}。'),
        table: R("SELECT '2025-04-28' AS day, date('2025-04-28', '+7 days') AS later;") },
      { type: 'points', items: [
        T3("Dates are text in quotes: '2025-04-01'. Compare them with BETWEEN, <, >.", "日付は ' ' で囲んだ文字。BETWEEN や < > で比べる。", "ひづけは ' ' で かこんだ もじ。BETWEEN や < > で くらべる。"),
        T3("strftime('%m', d) = the month, date(d, '+n days') = n days later.", "strftime('%m', d) で月、date(d, '+n days') で n 日後。", "strftime('%m', d) で つき、date(d, '+n days') で n{日|にち}ご。")] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 24 */
  sub1: {
    goal: T3('Use the result of one SELECT inside another.', 'SELECT の結果を、別の SELECT の中で使う。', 'SELECT の {結果|けっか}を、べつの SELECT の なかで {使|つか}う。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Which products cost more than the average?”', '「平均より高い商品はどれ？」', '「へいきんより {高|たか}い しょうひんは どれ？」'), table: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('A SELECT in ( ) is a subquery. It runs first and gives one value.', '( ) の中の SELECT を副問い合わせという。先に実行され、値を 1 つ返す。', '( ) の なかの SELECT を ふくといあわせ という。さきに じっこう され、{値|あたい}を 1つ かえす。'),
        T3('WHERE price > (SELECT AVG(price) FROM products)', 'WHERE price > (SELECT AVG(price) FROM products)', 'WHERE price > (SELECT AVG(price) FROM products)')] },
      { type: 'anim', title: T3('Inside first, then outside', '中が先、外があと', 'なかが さき、そとが あと'), frames: [
        { cap: T3('The ( ) part gives one value: the average.', '( ) の部分が平均を 1 つ返す。', '( ) の ぶぶんが へいきんを 1つ かえす。'), sql: 'SELECT AVG(price)\nFROM products;', mark: 'AVG(price)', table: R('SELECT AVG(price) AS avg_price FROM products;') },
        { cap: T3('The outside SELECT compares each row with it.', '外の SELECT が、その値と 1 行ずつ比べる。', 'そとの SELECT が、その {値|あたい}と 1{行|ぎょう}ずつ くらべる。'), sql: 'SELECT name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products);', mark: '(SELECT AVG(price) FROM products)', table: W('price > (SELECT AVG(price) FROM products)', ['price']) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Above the average', '平均より大きい', 'へいきんより {大|おお}きい'), ['gt'], T3('stock above the average stock.', 'stock が平均より多い。', 'stock が へいきんより おおい。'), 'SELECT name, stock\nFROM products\nWHERE stock > (SELECT AVG(stock) FROM products);', '> (SELECT AVG(stock) FROM products)', { hl: ['stock'] }),
        C(T3('Below the average', '平均より小さい', 'へいきんより {小|ちい}さい'), ['lt'], T3('< instead of >.', '> を < にする。', '> を < に する。'), 'SELECT name, stock\nFROM products\nWHERE stock < (SELECT AVG(stock) FROM products);', '< (SELECT AVG(stock) FROM products)', { hl: ['stock'] }),
        C(T3('The largest', 'いちばん大きい', 'いちばん {大|おお}きい'), ['max'], T3('= MAX: the row(s) with the largest value.', '= MAX：いちばん大きい行。', '= MAX：いちばん {大|おお}きい {行|ぎょう}。'), 'SELECT name, price\nFROM products\nWHERE price = (SELECT MAX(price) FROM products);', '= (SELECT MAX(price) FROM products)', { hl: ['price'] }),
        C(T3('The smallest', 'いちばん小さい', 'いちばん {小|ちい}さい'), ['min'], T3('= MIN: the row(s) with the smallest value.', '= MIN：いちばん小さい行。', '= MIN：いちばん {小|ちい}さい {行|ぎょう}。'), 'SELECT name, price\nFROM products\nWHERE price = (SELECT MIN(price) FROM products);', '= (SELECT MIN(price) FROM products)', { hl: ['price'] })
      ] },
      { type: 'mistake', title: T3('AVG directly in WHERE', 'WHERE に AVG をそのまま書く', 'WHERE に AVG を そのまま {書|か}く'), wrong: 'SELECT name, price\nFROM products\nWHERE price > AVG(price);', right: 'SELECT name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products);',
        why: T3('WHERE looks at one row at a time, so it cannot use AVG. Work out the average in a subquery.', 'WHERE は 1 行ずつ調べるので AVG は使えない（エラー）。平均は副問い合わせで求める。', 'WHERE は 1{行|ぎょう}ずつ しらべるので AVG は {使|つか}えない（エラー）。へいきんは ふくといあわせで もとめる。') },
      { type: 'quiz', q: T3('How many rows does this give?', 'この SQL の結果は何行？', 'この SQL の {結果|けっか}は {何行|なんぎょう}？'), sql: 'SELECT name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products);', mark: '(SELECT AVG(price) FROM products)',
        choices: ['2', '3', '5'], answer: e => one(e, 'SELECT COUNT(*) FROM products WHERE price > (SELECT AVG(price) FROM products);'),
        why: T3('The average is 5230. Only 8500, 18000 and 6200 are above it.', '平均は 5230。それより高いのは 8500・18000・6200 の 3 つ。', 'へいきんは 5230。それより {高|たか}いのは 8500・18000・6200 の 3つ。'),
        before: R('SELECT id, name, price FROM products;', { hide: ['id'], hl: ['price'] }), table: R('SELECT id, name, price FROM products WHERE price > (SELECT AVG(price) FROM products);', { hide: ['id'], hl: ['price'] }) },
      { type: 'points', items: [
        T3('(SELECT …) inside a condition runs first and gives one value.', '条件の中の (SELECT …) が先に実行され、値を 1 つ返す。', '{条件|じょうけん}の なかの (SELECT …) が さきに じっこう され、{値|あたい}を 1つ かえす。'),
        T3('Aggregates such as AVG cannot go directly in WHERE.', 'AVG などの集計は WHERE に直接書けない。', 'AVG などの しゅうけいは WHERE に ちょくせつ {書|か}けない。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 25 */
  subin: {
    goal: T3('Keep the rows whose value is in another table: IN (SELECT …).', '別の表にある値の行だけ残す：IN (SELECT …)。', 'べつの {表|ひょう}に ある {値|あたい}の {行|ぎょう}だけ のこす：IN (SELECT …)。'),
    slides: [
      { type: 'scene', who: T3('Sales staff', '営業の人', 'えいぎょうの {人|ひと}'),
        ask: T3('“Which customers have ordered something? And who has never ordered?”', '「注文したことのあるお客さんは？ 一度も注文していない人は？」', '「ちゅうもん した ことの ある おきゃくさんは？ いちども ちゅうもん して いない {人|ひと}は？」'), table: R('SELECT id, name, city FROM customers;', { hl: ['id'] }), side: [R('SELECT customer_id, item, amount FROM orders;', { hl: ['customer_id'] })] },
      { type: 'syntax', notes: [
        T3('WHERE id IN (SELECT customer_id FROM orders): the ids that appear in orders.', 'WHERE id IN (SELECT customer_id FROM orders)：orders に出てくる id だけ。', 'WHERE id IN (SELECT customer_id FROM orders)：orders に でてくる id だけ。'),
        T3('NOT IN: the ids that do not appear.', 'NOT IN：出てこない id だけ。', 'NOT IN：でてこない id だけ。'),
        T3('The subquery gives a list, so it must have one column.', '副問い合わせは「一覧」を返す。列は 1 つにする。', 'ふくといあわせは「いちらん」を かえす。{列|れつ}は 1つに する。')] },
      { type: 'anim', title: T3('A list from the other table', '別の表から一覧を作る', 'べつの {表|ひょう}から いちらんを つくる'), frames: [
        { cap: T3('The subquery makes a list of customer_id.', '副問い合わせが customer_id の一覧を作る。', 'ふくといあわせが customer_id の いちらんを つくる。'), sql: 'SELECT customer_id\nFROM orders;', mark: 'customer_id', table: R('SELECT customer_id FROM orders;') },
        { cap: T3('Only customers whose id is in the list stay.', 'id が一覧にあるお客さんだけ残る。', 'id が いちらんに ある おきゃくさんだけ のこる。'), sql: 'SELECT name\nFROM customers\nWHERE id IN (SELECT customer_id FROM orders);', mark: 'IN (SELECT customer_id FROM orders)', table: e => checked(e, 'SELECT id, name FROM customers;', 'id IN (SELECT customer_id FROM orders)', ['id']) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('IN with a condition', '条件つきの IN', '{条件|じょうけん}つきの IN'), ['in'], T3('Customers with an order of 20000 or more.', '20000 以上の注文があるお客さん。', '20000 いじょうの ちゅうもんが ある おきゃくさん。'), 'SELECT name\nFROM customers\nWHERE id IN (SELECT customer_id FROM orders WHERE amount >= 20000);', 'WHERE amount >= 20000'),
        C(T3('NOT IN', 'NOT IN', 'NOT IN'), ['notin'], T3('Customers who never ordered.', '一度も注文していないお客さん。', 'いちども ちゅうもん して いない おきゃくさん。'), 'SELECT name\nFROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);', 'NOT IN')
      ] },
      { type: 'mistake', title: T3('Several columns in the subquery', '副問い合わせで列をいくつも取る', 'ふくといあわせで {列|れつ}を いくつも とる'), wrong: 'SELECT name\nFROM customers\nWHERE id IN (SELECT * FROM orders);', right: 'SELECT name\nFROM customers\nWHERE id IN (SELECT customer_id FROM orders);',
        why: T3('IN compares with one column. SELECT * gives three, so it is an error.', 'IN が比べるのは 1 列。SELECT * だと 3 列になりエラー。', 'IN が くらべるのは 1{列|れつ}。SELECT * だと 3{列|れつ}に なり エラー。') },
      { type: 'quiz', q: T3('Who is in the result?', '結果に出てくるのは誰？', '{結果|けっか}に でてくるのは だれ？'), sql: 'SELECT name\nFROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);', mark: 'NOT IN',
        choices: ['Ben', 'Dina', 'Eko'], answer: e => one(e, "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders) AND name IN ('Ben', 'Dina', 'Eko');"),
        why: T3('orders has customer_id 2, 3, 5, 6, 7. Dina (4) is not there.', 'orders の customer_id は 2・3・5・6・7。Dina（4）はない。', 'orders の customer_id は 2・3・5・6・7。Dina（4）は ない。'),
        before: R('SELECT customer_id, item FROM orders;', { hl: ['customer_id'] }), table: R('SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);') },
      { type: 'points', items: [
        T3('IN (SELECT one column …): rows whose value is in the list.', 'IN (SELECT 1 列 …)：一覧にある値の行だけ。', 'IN (SELECT 1{列|れつ} …)：いちらんに ある {値|あたい}の {行|ぎょう}だけ。'),
        T3('NOT IN: rows whose value is not in it. You do not need JOIN.', 'NOT IN：一覧にない行。JOIN を使わずに書ける。', 'NOT IN：いちらんに ない {行|ぎょう}。JOIN を {使|つか}わずに {書|か}ける。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 26 */
  subfrom: {
    goal: T3('Use the result of a SELECT as a table: FROM (SELECT …).', 'SELECT の結果を表として使う：FROM (SELECT …)。', 'SELECT の {結果|けっか}を {表|ひょう}として {使|つか}う：FROM (SELECT …)。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“How much stock is there per category on average?”', '「カテゴリごとの在庫の合計は、平均するとどのくらい？」', '「カテゴリごとの ざいこの ごうけいは、へいきん すると どのくらい？」'), table: R('SELECT id, name, category, stock FROM products ORDER BY category, id;', { hide: ['id'], hl: ['category', 'stock'] }) },
      { type: 'syntax', notes: [
        T3('FROM (SELECT …) AS g: the result of the inside SELECT is used as a table.', 'FROM (SELECT …) AS g：中の SELECT の結果を表として使う。', 'FROM (SELECT …) AS g：なかの SELECT の {結果|けっか}を {表|ひょう}として {使|つか}う。'),
        T3('Name the columns inside with AS, so the outside can use them.', '中の列に AS で名前を付けると、外から使える。', 'なかの {列|れつ}に AS で なまえを つけると、そとから {使|つか}える。')] },
      { type: 'anim', title: T3('Group first, then once more', 'まずグループ、それからもう一度', 'まず グループ、それから もう いちど'), frames: [
        { cap: T3('Inside: the total stock of each category.', '中：カテゴリごとの stock の合計。', 'なか：カテゴリごとの stock の ごうけい。'), sql: 'SELECT category, SUM(stock) AS total\nFROM products\nGROUP BY category;', mark: 'SUM(stock) AS total', table: R('SELECT category, SUM(stock) AS total FROM products GROUP BY category;', { hl: ['total'] }) },
        { cap: T3('Outside: the average of those totals.', '外：その合計の平均。', 'そと：その ごうけいの へいきん。'), sql: 'SELECT AVG(total)\nFROM (SELECT category, SUM(stock) AS total\n      FROM products GROUP BY category) AS g;', mark: 'AVG(total)', table: R('SELECT AVG(total) AS avg_total FROM (SELECT category, SUM(stock) AS total FROM products GROUP BY category) AS g;') }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Average of totals', '合計の平均', 'ごうけいの へいきん'), ['avgsum'], T3('The average of the total price of each category.', 'カテゴリごとの price 合計の平均。', 'カテゴリごとの price ごうけいの へいきん。'), 'SELECT AVG(total)\nFROM (SELECT category, SUM(price) AS total\n      FROM products GROUP BY category) AS g;', 'AVG(total)'),
        C(T3('Largest total', '合計のいちばん大きい値', 'ごうけいの いちばん {大|おお}きい {値|あたい}'), ['maxsum'], T3('MAX of the totals.', '合計の MAX。', 'ごうけいの MAX。'), 'SELECT MAX(total)\nFROM (SELECT category, SUM(price) AS total\n      FROM products GROUP BY category) AS g;', 'MAX(total)'),
        C(T3('Largest count', '件数のいちばん大きい値', 'けんすうの いちばん {大|おお}きい {値|あたい}'), ['maxcnt'], T3('How many products the biggest category has.', 'いちばん商品が多いカテゴリの件数。', 'いちばん しょうひんが おおい カテゴリの けんすう。'), 'SELECT MAX(cnt)\nFROM (SELECT category, COUNT(*) AS cnt\n      FROM products GROUP BY category) AS g;', 'MAX(cnt)'),
        C(T3('Smallest average', '平均のいちばん小さい値', 'へいきんの いちばん {小|ちい}さい {値|あたい}'), ['minavg'], T3('MIN of the averages.', '平均の MIN。', 'へいきんの MIN。'), 'SELECT MIN(avg_p)\nFROM (SELECT category, AVG(price) AS avg_p\n      FROM products GROUP BY category) AS g;', 'MIN(avg_p)')
      ] },
      { type: 'mistake', title: T3('Two aggregates inside each other', '集計関数を重ねる', 'しゅうけい かんすうを かさねる'), wrong: 'SELECT AVG(SUM(price))\nFROM products\nGROUP BY category;', right: 'SELECT AVG(total)\nFROM (SELECT category, SUM(price) AS total\n      FROM products GROUP BY category) AS g;',
        why: T3('AVG(SUM( … )) is an error. Make the totals in a subquery first.', 'AVG(SUM( … )) はエラー。先に副問い合わせで合計を作る。', 'AVG(SUM( … )) は エラー。さきに ふくといあわせで ごうけいを つくる。') },
      { type: 'quiz', q: T3('What does this give?', 'この SQL の答えは？', 'この SQL の こたえは？'), sql: 'SELECT MAX(cnt)\nFROM (SELECT category, COUNT(*) AS cnt\n      FROM products GROUP BY category) AS g;', mark: 'MAX(cnt)',
        choices: ['3', '4', '10'], answer: e => one(e, 'SELECT MAX(cnt) FROM (SELECT category, COUNT(*) AS cnt FROM products GROUP BY category) AS g;'),
        why: T3('Electronics has 4 products, the most of any category.', 'Electronics が 4 件でいちばん多い。', 'Electronics が 4けんで いちばん おおい。'),
        before: R('SELECT category, COUNT(*) AS cnt FROM products GROUP BY category;', { hl: ['cnt'] }), table: R('SELECT MAX(cnt) AS max_cnt FROM (SELECT category, COUNT(*) AS cnt FROM products GROUP BY category) AS g;') },
      { type: 'points', items: [
        T3('FROM (SELECT …) AS name: a result used as a table.', 'FROM (SELECT …) AS 名前：結果を表として使う。', 'FROM (SELECT …) AS なまえ：{結果|けっか}を {表|ひょう}として {使|つか}う。'),
        T3('To aggregate twice (the average of totals …), use a subquery.', '2 回集計する（合計の平均など）ときは副問い合わせを使う。', '2{回|かい} しゅうけい する（ごうけいの へいきん など）ときは ふくといあわせを {使|つか}う。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 27 */
  with: {
    goal: T3('Give a subquery a name first: WITH.', '副問い合わせに先に名前を付ける：WITH。', 'ふくといあわせに さきに なまえを つける：WITH。'),
    slides: [
      { type: 'scene', who: T3('Analyst', '分析担当', 'ぶんせき たんとう'),
        ask: T3('“Subqueries inside subqueries are hard to read. Can I write the steps from the top?”', '「副問い合わせが重なると読みにくい。上から順に書けない？」', '「ふくといあわせが かさなると よみにくい。{上|うえ}から じゅんに {書|か}けない？」'), table: R('SELECT id, name, category, price FROM products;', { hide: ['id'], hl: ['category', 'price'] }) },
      { type: 'syntax', notes: [
        T3('WITH g AS (SELECT …) SELECT … FROM g;', 'WITH g AS (SELECT …) SELECT … FROM g;', 'WITH g AS (SELECT …) SELECT … FROM g;'),
        T3('g is a temporary table that exists only in this SQL.', 'g はこの SQL の中だけの一時的な表。', 'g は この SQL の なかだけの いちじてきな {表|ひょう}。'),
        T3('The result is the same as FROM (SELECT …), but easier to read.', '結果は FROM (SELECT …) と同じ。読みやすくなる。', '{結果|けっか}は FROM (SELECT …) と おなじ。よみやすく なる。')] },
      { type: 'anim', title: T3('Name it, then use it', '名前を付けて、それを使う', 'なまえを つけて、それを {使|つか}う'), frames: [
        { cap: T3('Step 1: the table g (average price per category).', '手順 1：表 g（カテゴリごとの平均）。', 'てじゅん 1：{表|ひょう} g（カテゴリごとの へいきん）。'), sql: 'WITH g AS (\n  SELECT category, AVG(price) AS avg_p\n  FROM products GROUP BY category)\nSELECT * FROM g;', mark: 'WITH g AS', table: R('SELECT category, AVG(price) AS avg_p FROM products GROUP BY category;', { hl: ['avg_p'] }) },
        { cap: T3('Step 2: use g like a table.', '手順 2：g を表のように使う。', 'てじゅん 2：g を {表|ひょう}の ように {使|つか}う。'), sql: 'WITH g AS (\n  SELECT category, AVG(price) AS avg_p\n  FROM products GROUP BY category)\nSELECT category, avg_p\nFROM g\nWHERE avg_p >= 4000;', mark: 'FROM g', table: R('WITH g AS (SELECT category, AVG(price) AS avg_p FROM products GROUP BY category) SELECT category, avg_p FROM g WHERE avg_p >= 4000;', { hl: ['avg_p'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Filter the averages', '平均で絞る', 'へいきんで しぼる'), ['avg'], T3('Categories whose average stock is 30 or more.', 'stock の平均が 30 以上のカテゴリ。', 'stock の へいきんが 30 いじょうの カテゴリ。'), 'WITH g AS (\n  SELECT category, AVG(stock) AS avg_s\n  FROM products GROUP BY category)\nSELECT category, avg_s\nFROM g\nWHERE avg_s >= 30;', 'WHERE avg_s >= 30', { hl: ['avg_s'] }),
        C(T3('Count in a smaller table', '絞った表で数える', 'しぼった {表|ひょう}で かぞえる'), ['big'], T3('First keep the products of 3000 or more, then count per category.', '先に 3000 以上の商品だけにして、カテゴリごとに数える。', 'さきに 3000 いじょうの しょうひんだけに して、カテゴリごとに かぞえる。'), 'WITH big AS (\n  SELECT * FROM products WHERE price >= 3000)\nSELECT category, COUNT(*) AS n\nFROM big\nGROUP BY category;', 'FROM big', { hl: ['n'] })
      ] },
      { type: 'mistake', title: T3('A column that is not in the WITH table', 'WITH の表にない列を使う', 'WITH の {表|ひょう}に ない {列|れつ}を {使|つか}う'), wrong: 'WITH g AS (\n  SELECT category, AVG(price) AS avg_p\n  FROM products GROUP BY category)\nSELECT category, price\nFROM g;', right: 'WITH g AS (\n  SELECT category, AVG(price) AS avg_p\n  FROM products GROUP BY category)\nSELECT category, avg_p\nFROM g;',
        why: T3('g has only category and avg_p. price is not there, so it is an error.', 'g にあるのは category と avg_p だけ。price はないのでエラー。', 'g に あるのは category と avg_p だけ。price は ないので エラー。') },
      { type: 'quiz', q: T3('What does this give?', 'この SQL の答えは？', 'この SQL の こたえは？'), sql: 'WITH big AS (\n  SELECT * FROM products WHERE price >= 3000)\nSELECT COUNT(*)\nFROM big;', mark: 'FROM big',
        choices: ['5', '6', '10'], answer: e => one(e, 'WITH big AS (SELECT * FROM products WHERE price >= 3000) SELECT COUNT(*) FROM big;'),
        why: T3('6 products cost 3000 or more (3000 itself counts).', '3000 以上の商品は 6 つ（3000 ちょうども入る）。', '3000 いじょうの しょうひんは 6つ（3000 ちょうども はいる）。'),
        table: W('price >= 3000', ['price']) },
      { type: 'points', items: [
        T3('WITH name AS (SELECT …): a named, temporary table.', 'WITH 名前 AS (SELECT …)：名前つきの一時的な表。', 'WITH なまえ AS (SELECT …)：なまえ つきの いちじてきな {表|ひょう}。'),
        T3('Write the steps from the top; use only the columns the WITH table has.', '手順を上から書ける。WITH の表にある列だけ使える。', 'てじゅんを {上|うえ}から {書|か}ける。WITH の {表|ひょう}に ある {列|れつ}だけ {使|つか}える。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 28 */
  window: {
    goal: T3('Add a rank or a running total to each row: window functions.', '各行に順位や累計を付ける：ウィンドウ関数。', 'かく {行|ぎょう}に じゅんいや るいけいを つける：ウィンドウ かんすう。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“Show every product with its price rank. Keep all the rows.”', '「全商品に値段の順位を付けて見せて。行はまとめないで」', '「すべての しょうひんに ねだんの じゅんいを つけて みせて。{行|ぎょう}は まとめないで」'), table: R('SELECT id, name, category, price FROM products;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', notes: [
        T3('function() OVER ( … ): a result next to each row. The rows are not grouped.', '関数() OVER ( … )：各行の横に結果を付ける。行はまとめない。', 'かんすう() OVER ( … )：かく {行|ぎょう}の よこに {結果|けっか}を つける。{行|ぎょう}は まとめない。'),
        T3('RANK() OVER (ORDER BY price DESC): the rank by price.', 'RANK() OVER (ORDER BY price DESC)：price の順位。', 'RANK() OVER (ORDER BY price DESC)：price の じゅんい。'),
        T3('PARTITION BY category: work inside each category.', 'PARTITION BY category：カテゴリの中ごとに計算。', 'PARTITION BY category：カテゴリの なか ごとに {計算|けいさん}。')] },
      { type: 'anim', title: T3('GROUP BY vs OVER', 'GROUP BY と OVER のちがい', 'GROUP BY と OVER の ちがい'), frames: [
        { cap: T3('GROUP BY: one row per category.', 'GROUP BY：カテゴリごとに 1 行になる。', 'GROUP BY：カテゴリごとに 1{行|ぎょう}に なる。'), sql: 'SELECT category, AVG(price)\nFROM products\nGROUP BY category;', mark: 'GROUP BY category', table: R('SELECT category, AVG(price) AS avg_price FROM products GROUP BY category;') },
        { cap: T3('OVER: every row stays, with its category average next to it.', 'OVER：行はそのまま。横にカテゴリの平均が付く。', 'OVER：{行|ぎょう}は そのまま。よこに カテゴリの へいきんが つく。'), sql: 'SELECT name, category, price,\n  AVG(price) OVER (PARTITION BY category) AS cat_avg\nFROM products;', mark: 'OVER (PARTITION BY category)', table: R('SELECT name, category, price, AVG(price) OVER (PARTITION BY category) AS cat_avg FROM products;', { hl: ['cat_avg'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Rank', '順位', 'じゅんい'), ['rank'], T3('The rank by stock, largest first.', 'stock の多い順の順位。', 'stock の おおい じゅんの じゅんい。'), 'SELECT name, stock,\n  RANK() OVER (ORDER BY stock DESC) AS rnk\nFROM products;', 'RANK() OVER (ORDER BY stock DESC)', { hl: ['rnk'] }),
        C(T3('Rank in each group', 'グループの中の順位', 'グループの なかの じゅんい'), ['part'], T3('The rank starts from 1 again in each category.', 'カテゴリごとに 1 位から数え直す。', 'カテゴリごとに 1{位|い}から かぞえなおす。'), 'SELECT name, category, price,\n  RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rnk\nFROM products;', 'PARTITION BY category ORDER BY price DESC', { hl: ['rnk'] }),
        C(T3('Running total', '累計', 'るいけい'), ['run'], T3('Add stock one row after another, in order of id.', 'id の順に stock を足していく。', 'id の じゅんに stock を たして いく。'), 'SELECT id, name, stock,\n  SUM(stock) OVER (ORDER BY id) AS running\nFROM products;', 'SUM(stock) OVER (ORDER BY id)', { hl: ['running'] }),
        C(T3('Group average', 'グループの平均', 'グループの へいきん'), ['avg'], T3('Next to each row, the average stock of its category.', '各行の横に、そのカテゴリの stock の平均。', 'かく {行|ぎょう}の よこに、その カテゴリの stock の へいきん。'), 'SELECT name, category, stock,\n  AVG(stock) OVER (PARTITION BY category) AS cat_avg\nFROM products;', 'AVG(stock) OVER (PARTITION BY category)', { hl: ['cat_avg'] })
      ] },
      { type: 'mistake', title: T3('A window function in WHERE', 'WHERE でウィンドウ関数を使う', 'WHERE で ウィンドウ かんすうを {使|つか}う'), wrong: 'SELECT name, price\nFROM products\nWHERE RANK() OVER (ORDER BY price DESC) <= 3;', right: 'WITH r AS (\n  SELECT name, price,\n    RANK() OVER (ORDER BY price DESC) AS rnk\n  FROM products)\nSELECT name, price\nFROM r\nWHERE rnk <= 3;',
        why: T3('Window functions are worked out after WHERE, so they cannot be used there. Make the rank in WITH first.', 'ウィンドウ関数は WHERE のあとで計算されるので、WHERE では使えない。先に WITH で順位を作る。', 'ウィンドウ かんすうは WHERE の あとで {計算|けいさん}されるので、WHERE では {使|つか}えない。さきに WITH で じゅんいを つくる。') },
      { type: 'quiz', q: T3('What is the rank of Coffee Maker?', 'Coffee Maker の順位は？', 'Coffee Maker の じゅんいは？'), sql: 'SELECT name, price,\n  RANK() OVER (ORDER BY price DESC) AS rnk\nFROM products;', mark: 'RANK() OVER (ORDER BY price DESC)',
        choices: ['4', '5', '6'], answer: e => one(e, "SELECT rnk FROM (SELECT name, RANK() OVER (ORDER BY price DESC) AS rnk FROM products) WHERE name = 'Coffee Maker';"),
        why: T3('18000, 8500, 6200 and 4800 are higher than 3500, so it is 5th.', '3500 より高いのは 18000・8500・6200・4800 の 4 つなので 5 位。', '3500 より {高|たか}いのは 18000・8500・6200・4800 の 4つ なので 5{位|い}。'),
        table: R('SELECT name, price, RANK() OVER (ORDER BY price DESC) AS rnk FROM products ORDER BY rnk;', { hl: ['rnk'] }) },
      { type: 'points', items: [
        T3('OVER keeps every row; GROUP BY makes one row per group.', 'OVER は行をそのまま残す。GROUP BY はグループで 1 行にする。', 'OVER は {行|ぎょう}を そのまま のこす。GROUP BY は グループで 1{行|ぎょう}に する。'),
        T3('RANK for ranks, PARTITION BY for each group, SUM … OVER (ORDER BY …) for running totals.', 'RANK で順位、PARTITION BY でグループごと、SUM … OVER (ORDER BY …) で累計。', 'RANK で じゅんい、PARTITION BY で グループごと、SUM … OVER (ORDER BY …) で るいけい。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 35 */
  join3: {
    goal: T3('Join three tables, a table with itself, and every combination.', '3 つの表・自分自身・すべての組み合わせをつなぐ。', '3つの {表|ひょう}・じぶん じしん・すべての くみあわせを つなぐ。'),
    slides: [
      { type: 'scene', who: T3('Teacher', '先生', '{先生|せんせい}'),
        ask: T3('“For each student, which club are they in, and in which room does it meet?”', '「生徒ごとに、入っている部活と、その部活の部屋を知りたい」', '「せいとごとに、はいって いる ぶかつと、その ぶかつの へやを しりたい」'),
        table: R('SELECT id, name, club_id FROM learners;', { hl: ['club_id'] }), side: [R('SELECT id, club, room_id FROM club_list;', { hl: ['id', 'room_id'] }), R('SELECT id, room, floor FROM room_list;', { hl: ['id'] })] },
      { type: 'syntax', notes: [
        T3('FROM A a JOIN B b ON … JOIN C c ON …: write JOIN again for the third table.', 'FROM A a JOIN B b ON … JOIN C c ON …：3 つ目の表は JOIN をもう一度書く。', 'FROM A a JOIN B b ON … JOIN C c ON …：3つめの {表|ひょう}は JOIN を もう いちど {書|か}く。'),
        T3('Self join: the same table twice, with two aliases (e and m).', '自己結合：同じ表を 2 回。別名を 2 つ付ける（e と m）。', 'じこけつごう：おなじ {表|ひょう}を 2{回|かい}。べつめいを 2つ つける（e と m）。'),
        T3('CROSS JOIN: every row with every row (no ON).', 'CROSS JOIN：すべての行とすべての行の組み合わせ（ON は書かない）。', 'CROSS JOIN：すべての {行|ぎょう}と すべての {行|ぎょう}の くみあわせ（ON は {書|か}かない）。')] },
      { type: 'anim', title: T3('One table after another', '1 つずつつないでいく', '1つずつ つないで いく'), frames: [
        { cap: T3('learners + club_list: the club of each student.', 'learners + club_list：生徒の部活。', 'learners + club_list：せいとの ぶかつ。'), sql: 'SELECT a.name, b.club\nFROM learners a\nJOIN club_list b ON a.club_id = b.id;', mark: 'JOIN club_list b ON a.club_id = b.id', table: R('SELECT a.name, b.club FROM learners a JOIN club_list b ON a.club_id = b.id;', { hl: ['club'] }) },
        { cap: T3('+ room_list: the room of that club.', '+ room_list：その部活の部屋。', '+ room_list：その ぶかつの へや。'), sql: 'SELECT a.name, b.club, c.room\nFROM learners a\nJOIN club_list b ON a.club_id = b.id\nJOIN room_list c ON b.room_id = c.id;', mark: 'JOIN room_list c ON b.room_id = c.id', table: R('SELECT a.name, b.club, c.room FROM learners a JOIN club_list b ON a.club_id = b.id JOIN room_list c ON b.room_id = c.id;', { hl: ['room'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('Three tables', '3 つの表', '3つの {表|ひょう}'), ['three'], T3('Guest → drink → kind of drink.', '客 → 飲み物 → 飲み物の種類。', 'きゃく → のみもの → のみものの しゅるい。'), 'SELECT a.name, b.drink, c.kind\nFROM guests a\nJOIN drinks b ON a.drink_id = b.id\nJOIN drink_kinds c ON b.kind_id = c.id;', 'JOIN drink_kinds c ON b.kind_id = c.id'),
        C(T3('Three tables + WHERE', '3 つの表 + WHERE', '3つの {表|ひょう} + WHERE'), ['threeWhere'], T3('Only the guests who chose Tea.', 'Tea を選んだ客だけ。', 'Tea を えらんだ きゃくだけ。'), "SELECT a.name, b.drink, c.kind\nFROM guests a\nJOIN drinks b ON a.drink_id = b.id\nJOIN drink_kinds c ON b.kind_id = c.id\nWHERE c.kind = 'Tea';", "WHERE c.kind = 'Tea'"),
        C(T3('Self join', '自己結合', 'じこけつごう'), ['self'], T3('Each tutor and their mentor. Mori has no mentor, so Mori is not in the result.', '各先生と、その指導役。Mori には指導役がいないので出てこない。', 'かく せんせいと、その しどうやく。Mori には しどうやくが いないので でてこない。'), 'SELECT e.name, m.name AS boss\nFROM tutors e\nJOIN tutors m ON e.mentor_id = m.id;', 'JOIN tutors m ON e.mentor_id = m.id'),
        C(T3('Self join with LEFT JOIN', 'LEFT JOIN で自己結合', 'LEFT JOIN で じこけつごう'), ['selfLeft'], T3('LEFT JOIN keeps Mori, with NULL.', 'LEFT JOIN なら Mori も NULL で残る。', 'LEFT JOIN なら Mori も NULL で のこる。'), 'SELECT e.name, m.name AS boss\nFROM tutors e\nLEFT JOIN tutors m ON e.mentor_id = m.id;', 'LEFT JOIN tutors m'),
        C(T3('Every combination', 'すべての組み合わせ', 'すべての くみあわせ'), ['cross'], T3('3 sizes × 2 colors = 6 rows.', 'サイズ 3 つ × 色 2 つ = 6 行。', 'サイズ 3つ × いろ 2つ = 6{行|ぎょう}。'), 'SELECT size, color\nFROM shirt_sizes\nCROSS JOIN shirt_colors;', 'CROSS JOIN shirt_colors')
      ] },
      { type: 'mistake', title: T3('No ON for the third table', '3 つ目の表に ON を書かない', '3つめの {表|ひょう}に ON を {書|か}かない'), wrong: 'SELECT a.name, b.club, c.room\nFROM learners a\nJOIN club_list b ON a.club_id = b.id\nJOIN room_list c;', right: 'SELECT a.name, b.club, c.room\nFROM learners a\nJOIN club_list b ON a.club_id = b.id\nJOIN room_list c ON b.room_id = c.id;',
        why: T3('Without ON, every student is joined with every room (like CROSS JOIN): 24 rows instead of 8.', 'ON がないと、全生徒と全部屋の組み合わせ（CROSS JOIN と同じ）になり、8 行ではなく 24 行になる。', 'ON が ないと、すべての せいとと すべての へやの くみあわせ（CROSS JOIN と おなじ）に なり、8{行|ぎょう}では なく 24{行|ぎょう}に なる。') },
      { type: 'quiz', q: T3('How many rows does this give?', 'この SQL の結果は何行？', 'この SQL の {結果|けっか}は {何行|なんぎょう}？'), sql: 'SELECT cup, milk\nFROM cup_sizes\nCROSS JOIN milk_types;', mark: 'CROSS JOIN',
        choices: ['6', '9', '3'], answer: e => String(one(e, 'SELECT COUNT(*) FROM cup_sizes CROSS JOIN milk_types;')),
        why: T3('3 cups × 3 milks = 9 combinations.', 'カップ 3 つ × ミルク 3 つ = 9 通り。', 'カップ 3つ × ミルク 3つ = 9とおり。'),
        before: R('SELECT cup FROM cup_sizes;'), table: R('SELECT cup, milk FROM cup_sizes CROSS JOIN milk_types;') },
      { type: 'points', items: [
        T3('Three tables: JOIN … ON …, then JOIN … ON … again.', '3 つの表：JOIN … ON … をもう一度書く。', '3つの {表|ひょう}：JOIN … ON … を もう いちど {書|か}く。'),
        T3('Self join: one table, two aliases. LEFT JOIN keeps rows with no partner.', '自己結合：同じ表に別名 2 つ。相手がいない行は LEFT JOIN で残す。', 'じこけつごう：おなじ {表|ひょう}に べつめい 2つ。あいてが いない {行|ぎょう}は LEFT JOIN で のこす。'),
        T3('CROSS JOIN: rows × rows combinations.', 'CROSS JOIN：行数 × 行数 の組み合わせ。', 'CROSS JOIN：{行|ぎょう}の {数|かず} × {行|ぎょう}の {数|かず} の くみあわせ。')] },
      { type: 'practice' }
    ]
  },

  /* ------------------------------------------------ Lesson 36 */
  setops: {
    goal: T3('Combine the results of two SELECTs: UNION, INTERSECT, EXCEPT.', '2 つの SELECT の結果を合わせる：UNION・INTERSECT・EXCEPT。', '2つの SELECT の {結果|けっか}を あわせる：UNION・INTERSECT・EXCEPT。'),
    slides: [
      { type: 'scene', who: T3('Store manager', '店長', '{店長|てんちょう}'),
        ask: T3('“List the expensive products and the books together, each name once.”', '「高い商品と本を、名前が重ならないように 1 つの一覧にして」', '「{高|たか}い しょうひんと ほんを、なまえが かさならない ように 1つの いちらんに して」'), table: R('SELECT id, name, category, price FROM products;', { hide: ['id'], hl: ['category', 'price'] }) },
      { type: 'syntax', notes: [
        T3('SELECT … UNION SELECT …: both results together, without duplicates (UNION ALL keeps them).', 'SELECT … UNION SELECT …：2 つの結果を合わせる。重複は 1 つに（UNION ALL なら残す）。', 'SELECT … UNION SELECT …：2つの {結果|けっか}を あわせる。おなじ ものは 1つに（UNION ALL なら のこす）。'),
        T3('INTERSECT: only what is in both. EXCEPT: in the first but not in the second.', 'INTERSECT：両方にあるものだけ。EXCEPT：前にあって後ろにないもの。', 'INTERSECT：りょうほうに ある ものだけ。EXCEPT：まえに あって うしろに ない もの。'),
        T3('Both SELECTs need the same number of columns.', '2 つの SELECT の列の数をそろえる。', '2つの SELECT の {列|れつ}の {数|かず}を そろえる。')] },
      { type: 'anim', title: T3('Two lists become one', '2 つの一覧が 1 つに', '2つの いちらんが 1つに'), frames: [
        { cap: T3('List 1: price 5000 or more.', '一覧 1：price が 5000 以上。', 'いちらん 1：price が 5000 いじょう。'), sql: 'SELECT name FROM products WHERE price >= 5000;', mark: 'price >= 5000', table: W('price >= 5000', ['price']) },
        { cap: T3('List 2: the books.', '一覧 2：本（Books）。', 'いちらん 2：ほん（Books）。'), sql: "SELECT name FROM products WHERE category = 'Books';", mark: "category = 'Books'", table: W("category = 'Books'", ['category']) },
        { cap: T3('UNION: both lists in one.', 'UNION：2 つを 1 つに。', 'UNION：2つを 1つに。'), sql: "SELECT name FROM products WHERE price >= 5000\nUNION\nSELECT name FROM products WHERE category = 'Books';", mark: 'UNION', table: R("SELECT name FROM products WHERE price >= 5000 UNION SELECT name FROM products WHERE category = 'Books';") }
      ] },
      { type: 'anim', cases: true, frames: [
        C(T3('UNION', 'UNION（合わせる）', 'UNION（あわせる）'), ['union'], T3('3000 or more, or Electronics. Names in both lists appear once.', '3000 以上か Electronics。両方にある名前は 1 回だけ。', '3000 いじょうか Electronics。りょうほうに ある なまえは 1{回|かい}だけ。'), "SELECT name FROM products WHERE price >= 3000\nUNION\nSELECT name FROM products WHERE category = 'Electronics';", 'UNION'),
        C(T3('INTERSECT', 'INTERSECT（両方）', 'INTERSECT（りょうほう）'), ['intersect'], T3('3000 or more and also Electronics.', '3000 以上で、しかも Electronics。', '3000 いじょうで、しかも Electronics。'), "SELECT name FROM products WHERE price >= 3000\nINTERSECT\nSELECT name FROM products WHERE category = 'Electronics';", 'INTERSECT'),
        C(T3('EXCEPT', 'EXCEPT（除く）', 'EXCEPT（のぞく）'), ['except'], T3('3000 or more, but not Electronics.', '3000 以上から Electronics を除く。', '3000 いじょうから Electronics を のぞく。'), "SELECT name FROM products WHERE price >= 3000\nEXCEPT\nSELECT name FROM products WHERE category = 'Electronics';", 'EXCEPT')
      ] },
      { type: 'mistake', title: T3('Different numbers of columns', '列の数がちがう', '{列|れつ}の {数|かず}が ちがう'), wrong: "SELECT name, price FROM products WHERE price >= 5000\nUNION\nSELECT name FROM products WHERE category = 'Books';", right: "SELECT name FROM products WHERE price >= 5000\nUNION\nSELECT name FROM products WHERE category = 'Books';",
        why: T3('2 columns and 1 column cannot be put together: an error.', '2 列と 1 列は合わせられない（エラー）。', '2{列|れつ}と 1{列|れつ}は あわせられない（エラー）。') },
      { type: 'quiz', q: T3('How many rows does this give?', 'この SQL の結果は何行？', 'この SQL の {結果|けっか}は {何行|なんぎょう}？'), sql: "SELECT name FROM products WHERE price >= 3000\nUNION\nSELECT name FROM products WHERE category = 'Electronics';", mark: 'UNION',
        choices: ['7', '10', '3'], answer: e => String(one(e, "SELECT COUNT(*) FROM (SELECT name FROM products WHERE price >= 3000 UNION SELECT name FROM products WHERE category = 'Electronics');")),
        why: T3('6 + 4 = 10 names, but 3 are in both lists, so 7.', '6 + 4 = 10 だが、3 つは両方にあるので 7。', '6 + 4 = 10 だが、3つは りょうほうに あるので 7。'),
        table: R("SELECT name FROM products WHERE price >= 3000 UNION SELECT name FROM products WHERE category = 'Electronics';") },
      { type: 'points', items: [
        T3('UNION = together, INTERSECT = in both, EXCEPT = in the first only.', 'UNION＝合わせる、INTERSECT＝両方にある、EXCEPT＝前だけにある。', 'UNION＝あわせる、INTERSECT＝りょうほうに ある、EXCEPT＝まえだけに ある。'),
        T3('The two SELECTs must have the same number of columns.', '2 つの SELECT の列の数は同じにする。', '2つの SELECT の {列|れつ}の {数|かず}は おなじに する。')] },
      { type: 'practice' }
    ]
  }
};
