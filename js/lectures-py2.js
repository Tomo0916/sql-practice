/* =========================================================
 * lectures-py2.js — lectures for the Python course, Lessons 13–21
 * (missing values, new columns, text, dates, duplicates, pivot tables,
 * concat, merge how, charts). Same form as lectures-py.js; the tables
 * are worked out with the SQL engine on the same data, and check.mjs runs
 * every piece of code with real pandas (frames with `res` must show what pandas gives).
 * ========================================================= */
import { T3, state, checked } from './lecture-kit.js';
import { barChart, histChart, scatterChart } from './charts.js';

/** the pandas index of a row: id − 1 (the DataFrame is made from the rows in order) */
const ix = st => { st.rows.forEach(r => { if (/^\d+$/.test(r.k)) r.idx = String(+r.k - 1); }); return st; };
const R = (sql, o) => e => ix(state(e, sql, o));
const W = (all, where, hl) => e => ix(checked(e, all, where, hl));
const one = (e, sql) => e.exec(sql).values[0][0];
/** a pandas result that is one value, shown as a one-cell table */
const V = (sql, name) => e => ({ cols: [name], hl: [name], dim: false, nohead: false, rows: [{ k: 'v', cells: [one(e, sql)], cls: 'pass' }] });
const APP = 'SELECT * FROM applicants;';
const BK = 'SELECT * FROM books;';
const SL = 'SELECT * FROM sales_log;';
const SCENE = T3('Shop owner', '店長', '{店長|てんちょう}');
const ANALYST = T3('Data analyst', 'データ分析の担当', 'データ ぶんせきの たんとう');

export const PY_LECTURES_2 = {
  /* ---------- 13. missing values ---------- */
  pd_na: {
    goal: T3('Find, count and fill empty cells (missing values).', '空のセル（欠損値）を見つける・数える・埋める。', 'からの セル（けっそんち）を みつける・かぞえる・うめる。'),
    slides: [
      { type: 'scene', who: T3('School office', '学校の事務', 'がっこうの じむ'), ask: T3('“Some applicants have no phone number. Who are they, and how many?”', '「電話番号がない申込者がいる。誰で、何人？」', '「でんわ ばんごうが ない {人|ひと}が いる。だれで、{何人|なんにん}？」'), table: R(APP, { hl: ['phone'] }) },
      { type: 'syntax', code: 'applicants[applicants["phone"].isna()]', notes: [
        T3('An empty cell is NaN or None. .isna() is True there.', '空のセルは NaN / None。.isna() はそこで True になる。', 'からの セルは NaN / None。.isna() は そこで True に なる。'),
        T3('.notna() is the opposite. .isna().sum() counts the empty cells.', '.notna() はその逆。.isna().sum() で空の数を数える。', '.notna() は その ぎゃく。.isna().sum() で からの {数|かず}を かぞえる。'),
        T3('.fillna({"phone": "none"}) fills the empty cells of phone.', '.fillna({"phone": "none"}) で phone の空を埋める。', '.fillna({"phone": "none"}) で phone の からを うめる。')] },
      { type: 'anim', title: T3('True where it is empty', '空のところが True', 'からの ところが True'), frames: [
        { cap: T3('applicants["phone"].isna(): True for every empty phone.', 'applicants["phone"].isna()：電話が空の行は True。', 'でんわが からの {行|ぎょう}は True。'), code: 'applicants["phone"].isna()', mark: '.isna()', table: W(APP, 'phone IS NULL', ['phone']) },
        { cap: T3('Put it in [ ]: only the True rows stay.', '[ ] に入れると、True の行だけが残る。', '[ ] に いれると、True の {行|ぎょう}だけが のこる。'), code: 'applicants[applicants["phone"].isna()]', mark: 'applicants[applicants["phone"].isna()]', res: true, table: R('SELECT * FROM applicants WHERE phone IS NULL;', { hl: ['phone'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Empty rows', '空の行', 'からの {行|ぎょう}'), covers: ['rows'], cap: T3('The rows with no phone.', '電話がない行。', 'でんわが ない {行|ぎょう}。'), code: 'applicants[applicants["phone"].isna()]', mark: '.isna()', res: true, table: R('SELECT * FROM applicants WHERE phone IS NULL;', { hl: ['phone'] }) },
        { label: T3('Filled rows', '入っている行', 'はいって いる {行|ぎょう}'), covers: ['notna'], cap: T3('.notna(): the rows that have a phone.', '.notna()：電話がある行。', '.notna()：でんわが ある {行|ぎょう}。'), code: 'applicants[applicants["phone"].notna()]', mark: '.notna()', res: true, table: R('SELECT * FROM applicants WHERE phone IS NOT NULL;', { hl: ['phone'] }) },
        { label: T3('How many', 'いくつ', 'いくつ'), covers: ['count'], cap: T3('True counts as 1, so .sum() gives the number of empty cells.', 'True は 1 として足されるので、.sum() で空の数になる。', 'True は 1 と して たされるので、.sum() で からの {数|かず}に なる。'), code: 'applicants["phone"].isna().sum()', mark: '.sum()', table: V('SELECT COUNT(*) FROM applicants WHERE phone IS NULL;', 'value') },
        { label: T3('Fill', '埋める', 'うめる'), covers: ['fill'], cap: T3('.fillna(): "none" goes into the empty cells only.', '.fillna()：空のところだけ "none" になる。', '.fillna()：からの ところだけ "none" に なる。'), code: 'applicants.fillna({"phone": "none"})', mark: '.fillna({"phone": "none"})', res: true, table: R("SELECT id, name, course, COALESCE(phone, 'none') AS phone FROM applicants;", { hl: ['phone'] }) }
      ] },
      { type: 'mistake', title: T3('== None', '== None で比べる', '== None で くらべる'), wrong: 'applicants[applicants["phone"] == None]', right: 'applicants[applicants["phone"].isna()]',
        why: T3('== None is never True in pandas, so you get no rows. Use .isna().', 'pandas では == None は True にならず、1 行も出ない。.isna() を使う。', 'pandas では == None は True に ならない。.isna() を {使|つか}う。') },
      { type: 'quiz', q: T3('What does this give?', 'この答えは？', 'この こたえは？'), code: 'applicants["phone"].isna().sum()', mark: '.isna().sum()',
        choices: ['4', '8', '0'], answer: e => one(e, 'SELECT COUNT(*) FROM applicants WHERE phone IS NULL;'),
        why: T3('4 of the 8 phones are empty.', '8 人のうち 4 人の phone が空。', '8{人|にん}の うち 4{人|にん}の phone が から。'), before: R(APP, { hl: ['phone'] }) },
      { type: 'points', items: [
        T3('.isna() / .notna(): True where empty / filled. Use them inside [ ].', '.isna() / .notna()：空 / 入っているところが True。[ ] の中で使う。', '.isna() / .notna()：から / はいって いる ところが True。'),
        T3('.isna().sum() counts; .fillna({"col": value}) fills.', '.isna().sum() で数え、.fillna({"列": 値}) で埋める。', '.isna().sum() で かぞえ、.fillna() で うめる。'),
        T3('SQL: WHERE phone IS NULL, COALESCE(phone, \'none\')', 'SQL なら WHERE phone IS NULL、COALESCE(phone, \'none\')', 'SQL なら WHERE phone IS NULL')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 14. new columns ---------- */
  pd_newcol: {
    goal: T3('Add a new column made from other columns.', 'ほかの列から新しい列を作る。', 'ほかの {列|れつ}から あたらしい {列|れつ}を つくる。'),
    slides: [
      { type: 'scene', who: SCENE, ask: T3('“Show each price with 10% tax next to it.”', '「税込み（10%）の値段を横に並べて見せて」', '「ぜいこみ（10%）の ねだんを よこに ならべて」'), table: R('SELECT id, title, price FROM books;', { hide: ['id'], hl: ['price'] }) },
      { type: 'syntax', code: 'books["with_tax"] = books["price"] * 1.1\nbooks[["title", "price", "with_tax"]]', notes: [
        T3('table["new"] = calculation adds a column to every row.', '表["新しい列"] = 計算 で、すべての行に列が増える。', '{表|ひょう}["あたらしい {列|れつ}"] = {計算|けいさん} で {列|れつ}が ふえる。'),
        T3('.apply(lambda x: …) runs your own rule on each value.', '.apply(lambda x: …) で、1 つずつの値に自分の決まりを当てる。', '.apply(lambda x: …) で 1つずつの {値|あたい}に きまりを あてる。'),
        T3('The last line decides what is shown.', '最後の行が、表示される答えになる。', 'さいごの {行|ぎょう}が こたえに なる。')] },
      { type: 'anim', title: T3('A column is calculated for every row', '列の計算は全部の行に', '{列|れつ}の {計算|けいさん}は ぜんぶの {行|ぎょう}に'), frames: [
        { cap: T3('The price column.', 'price の列。', 'price の {列|れつ}。'), code: 'books[["title", "price"]]', mark: '"price"', table: R('SELECT id, title, price FROM books;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('price * 1.1 is worked out row by row into with_tax.', 'price * 1.1 が 1 行ずつ計算され、with_tax に入る。', 'price * 1.1 が 1{行|ぎょう}ずつ {計算|けいさん}されて with_tax に はいる。'), code: 'books["with_tax"] = books["price"] * 1.1\nbooks[["title", "price", "with_tax"]]', mark: 'books["with_tax"] = books["price"] * 1.1', res: true, table: R('SELECT id, title, price, price * 1.1 AS with_tax FROM books;', { hide: ['id'], hl: ['with_tax'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('× a number', '数をかける', '{数|かず}を かける'), covers: ['tax'], cap: T3('price × 1.1.', 'price × 1.1。', 'price × 1.1。'), code: 'books["with_tax"] = books["price"] * 1.1\nbooks[["title", "price", "with_tax"]]', mark: '* 1.1', res: true, table: R('SELECT id, title, price, price * 1.1 AS with_tax FROM books;', { hide: ['id'], hl: ['with_tax'] }) },
        { label: T3('Two columns', '列どうし', '{列|れつ}どうし'), covers: ['ratio'], cap: T3('price ÷ pages: the price of one page.', 'price ÷ pages：1 ページあたりの値段。', 'price ÷ pages：1ページ あたりの ねだん。'), code: 'books["per"] = books["price"] / books["pages"]\nbooks[["title", "per"]]', mark: 'books["price"] / books["pages"]', res: true, table: R('SELECT id, title, price * 1.0 / pages AS per FROM books;', { hide: ['id'], hl: ['per'] }) },
        { label: T3('Your own rule', '自分の決まり', 'じぶんの きまり'), covers: ['apply'], cap: T3('apply: "high" for 2000 or more, otherwise "low".', 'apply：2000 以上なら "high"、それ以外は "low"。', 'apply：2000 いじょうなら "high"、ちがえば "low"。'), code: 'books["level"] = books["price"].apply(lambda x: "high" if x >= 2000 else "low")\nbooks[["title", "price", "level"]]', mark: '.apply(lambda x: "high" if x >= 2000 else "low")', res: true, table: R("SELECT id, title, price, CASE WHEN price >= 2000 THEN 'high' ELSE 'low' END AS level FROM books;", { hide: ['id'], hl: ['level'] }) }
      ] },
      { type: 'mistake', title: T3('Nothing on the last line', '最後の行に何も書かない', 'さいごの {行|ぎょう}に {何|なに}も {書|か}かない'), wrong: 'books["with_tax"] = books["price"] * 1.1', right: 'books["with_tax"] = books["price"] * 1.1\nbooks[["title", "price", "with_tax"]]',
        why: T3('An assignment shows nothing. Write the table (or the columns) on the last line.', '代入（=）だけでは何も表示されない。最後の行に表や列を書く。', '= だけでは {何|なに}も でない。さいごの {行|ぎょう}に {表|ひょう}を {書|か}く。') },
      { type: 'quiz', q: T3('What is the level of Rain in Tokyo (1500)?', 'Rain in Tokyo（1500）の level は？', 'Rain in Tokyo（1500）の level は？'), code: 'books["level"] = books["price"].apply(lambda x: "high" if x >= 1800 else "low")\nbooks[["title", "level"]]', mark: 'x >= 1800',
        choices: ['high', 'low', 'NaN'], answer: e => one(e, "SELECT CASE WHEN price >= 1800 THEN 'high' ELSE 'low' END FROM books WHERE title = 'Rain in Tokyo';"),
        why: T3('1500 is less than 1800, so it is "low".', '1500 は 1800 より小さいので "low"。', '1500 は 1800 より {小|ちい}さいので "low"。'), before: R('SELECT id, title, price FROM books;', { hide: ['id'], hl: ['price'] }) },
      { type: 'points', items: [
        T3('table["new"] = calculation (with other columns: + − * /).', '表["新しい列"] = 計算（ほかの列と + − * /）。', '{表|ひょう}["あたらしい {列|れつ}"] = {計算|けいさん}。'),
        T3('.apply(lambda x: A if condition else B) for your own rule.', '自分の決まりは .apply(lambda x: A if 条件 else B)。', 'きまりは .apply(lambda x: A if じょうけん else B)。'),
        T3('Show the result on the last line.', '結果は最後の行に書いて表示する。', '{結果|けっか}は さいごの {行|ぎょう}に {書|か}く。')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 15. text ---------- */
  pd_str: {
    goal: T3('Search and change text with .str.', '.str で文字を探す・変える。', '.str で もじを さがす・かえる。'),
    slides: [
      { type: 'scene', who: SCENE, ask: T3('“Which titles have the word Sun in them?”', '「タイトルに Sun が入っている本は？」', '「タイトルに Sun が はいって いる {本|ほん}は？」'), table: R('SELECT id, title, genre FROM books;', { hl: ['title'] }) },
      { type: 'syntax', code: 'books[books["title"].str.contains("Sun")]', notes: [
        T3('Add .str to a text column, then the text method.', '文字の列に .str を付けてから、文字の操作を書く。', 'もじの {列|れつ}に .str を つけてから そうさを {書|か}く。'),
        T3('.str.contains("Sun") / .str.startswith("S") give True or False → use them in [ ].', '.str.contains("Sun") / .str.startswith("S") は True / False → [ ] の中で使う。', 'True / False に なるので [ ] の なかで {使|つか}う。'),
        T3('.str.len() gives the length, .str.upper() capital letters. Upper and lower case are different.', '.str.len() は文字数、.str.upper() は大文字。大文字と小文字は区別される。', '.str.len() は もじの {数|かず}、.str.upper() は おおもじ。')] },
      { type: 'anim', title: T3('True for each row', '1 行ずつ True / False', '1{行|ぎょう}ずつ True / False'), frames: [
        { cap: T3('.str.contains("Sun") checks every title.', '.str.contains("Sun") がタイトルを 1 つずつ調べる。', 'タイトルを 1つずつ しらべる。'), code: 'books["title"].str.contains("Sun")', mark: '.str.contains("Sun")', table: W('SELECT id, title FROM books;', "instr(title, 'Sun') > 0", ['title']) },
        { cap: T3('In [ ]: only the True rows stay.', '[ ] に入れると True の行だけ残る。', 'True の {行|ぎょう}だけ のこる。'), code: 'books[books["title"].str.contains("Sun")]', mark: 'books[', res: true, table: R("SELECT * FROM books WHERE instr(title, 'Sun') > 0;", { hl: ['title'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('contains', 'contains（含む）', 'contains（ふくむ）'), covers: ['contains'], cap: T3('Titles with "Sea".', '"Sea" を含むタイトル。', '"Sea" を ふくむ タイトル。'), code: 'books[books["title"].str.contains("Sea")]', mark: '.str.contains("Sea")', res: true, table: R("SELECT * FROM books WHERE instr(title, 'Sea') > 0;", { hl: ['title'] }) },
        { label: T3('startswith', 'startswith（で始まる）', 'startswith（で はじまる）'), covers: ['starts'], cap: T3('Titles that start with R.', 'R で始まるタイトル。', 'R で はじまる タイトル。'), code: 'books[books["title"].str.startswith("R")]', mark: '.str.startswith("R")', res: true, table: R("SELECT * FROM books WHERE substr(title, 1, 1) = 'R';", { hl: ['title'] }) },
        { label: T3('len', 'len（文字数）', 'len（もじの {数|かず}）'), covers: ['len'], cap: T3('Titles of 15 characters or more.', '15 文字以上のタイトル。', '15もじ いじょうの タイトル。'), code: 'books[books["title"].str.len() >= 15]', mark: '.str.len() >= 15', res: true, table: R('SELECT * FROM books WHERE length(title) >= 15;', { hl: ['title'] }) },
        { label: T3('upper', 'upper（大文字）', 'upper（おおもじ）'), covers: ['upper'], cap: T3('Every title in capital letters.', 'すべて大文字にしたタイトル。', 'ぜんぶ おおもじに した タイトル。'), code: 'books["title"].str.upper()', mark: '.str.upper()', res: true, table: R('SELECT id, UPPER(title) AS title FROM books;', { hide: ['id'] }) }
      ] },
      { type: 'mistake', title: T3('No .str', '.str を付けない', '.str を つけない'), wrong: 'books[books["title"].contains("Sun")]', right: 'books[books["title"].str.contains("Sun")]',
        why: T3('A column has no contains(). Text methods are behind .str: AttributeError.', '列そのものに contains() はない。文字の操作は .str の後ろ（AttributeError になる）。', '.str が ないと エラー（AttributeError）。') },
      { type: 'quiz', q: T3('How many rows does this give?', '結果は何行？', '{結果|けっか}は {何行|なんぎょう}？'), code: 'books[books["title"].str.contains("Sun")]', mark: '"Sun"',
        choices: ['1', '2', '3'], answer: e => String(one(e, "SELECT COUNT(*) FROM books WHERE instr(title, 'Sun') > 0;")),
        why: T3('Sunflower Days and Sun Warriors. Upper and lower case count, so “sun” in other words does not.', 'Sunflower Days と Sun Warriors の 2 つ。大文字・小文字は区別される。', 'Sunflower Days と Sun Warriors の 2つ。'), before: R('SELECT id, title FROM books;', { hl: ['title'] }) },
      { type: 'points', items: [
        T3('table["col"].str.… for text: contains, startswith, len, upper.', '文字の列は 表["列"].str.…：contains・startswith・len・upper。', 'もじの {列|れつ}は .str.…'),
        T3('True / False results go inside [ ] to choose rows.', 'True / False になるものは [ ] に入れて行を選ぶ。', 'True / False は [ ] に いれる。'),
        T3('SQL: LIKE \'%Sun%\', LENGTH(title), UPPER(title)', 'SQL なら LIKE \'%Sun%\'、LENGTH(title)、UPPER(title)', 'SQL なら LIKE、LENGTH、UPPER')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 16. dates ---------- */
  pd_date: {
    goal: T3('Turn text into dates, then use the month or group by month.', '文字を日付にして、月で選んだり月ごとにまとめたりする。', 'もじを ひづけに して、つきで えらんだり まとめたり する。'),
    slides: [
      { type: 'scene', who: SCENE, ask: T3('“How much did we sell each month?”', '「月ごとの売上はいくら？」', '「つきごとの うりあげは いくら？」'), table: R(SL, { hl: ['sold_on'] }) },
      { type: 'syntax', code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log.groupby(sales_log["sold_on"].dt.month)["amount"].sum()', notes: [
        T3('pd.to_datetime(…) turns "2025-04-02" (text) into a date.', 'pd.to_datetime(…) で "2025-04-02"（文字）を日付にする。', 'pd.to_datetime(…) で もじを ひづけに する。'),
        T3('Then .dt.month is the month (3, 4 …), .dt.day the day.', 'すると .dt.month で月（3, 4 …）、.dt.day で日が取れる。', '.dt.month で つき（3, 4 …）が とれる。'),
        T3('resample("MS", on="sold_on") makes one group per month (MS = month start).', 'resample("MS", on="sold_on") で月ごとのグループ（MS＝月の初め）。', 'resample("MS", …) で つきごとの グループ。')] },
      { type: 'anim', title: T3('From dates to months', '日付から月へ', 'ひづけから つきへ'), frames: [
        { cap: T3('.dt.month takes the month out of each date.', '.dt.month で、それぞれの日付から月を取り出す。', 'それぞれの ひづけから つきを とりだす。'), code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log["sold_on"].dt.month', mark: '.dt.month', table: R("SELECT id, sold_on, CAST(strftime('%m', sold_on) AS INTEGER) AS month FROM sales_log;", { hide: ['id'], hl: ['month'] }) },
        { cap: T3('Group by that month and add up amount.', 'その月でグループにして amount を合計する。', 'その つきで グループに して ごうけい する。'), code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log.groupby(sales_log["sold_on"].dt.month)["amount"].sum()', mark: '.groupby(sales_log["sold_on"].dt.month)', res: true, table: R("SELECT CAST(strftime('%m', sold_on) AS INTEGER) AS sold_on, SUM(amount) AS amount FROM sales_log GROUP BY 1 ORDER BY 1;", { hl: ['amount'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('One month', '1 つの月', '1つの つき'), covers: ['month'], cap: T3('The rows of May.', '5 月の行。', '5{月|がつ}の {行|ぎょう}。'), code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log[sales_log["sold_on"].dt.month == 5]', mark: '.dt.month == 5', res: true, table: R("SELECT * FROM sales_log WHERE strftime('%m', sold_on) = '05';", { hl: ['sold_on'] }) },
        { label: T3('Per month (number)', '月ごと（数）', 'つきごと（{数|かず}）'), covers: ['bymonth'], cap: T3('groupby the month number.', '月の数で groupby。', 'つきの {数|かず}で groupby。'), code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log.groupby(sales_log["sold_on"].dt.month)["amount"].sum()', mark: '.dt.month', res: true, table: R("SELECT CAST(strftime('%m', sold_on) AS INTEGER) AS sold_on, SUM(amount) AS amount FROM sales_log GROUP BY 1 ORDER BY 1;", { hl: ['amount'] }) },
        { label: T3('resample', 'resample', 'resample'), covers: ['resample'], cap: T3('resample("MS"): each month is labelled with its first day.', 'resample("MS")：月の初めの日付が付く。', 'つきの はじめの ひづけが つく。'), code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log.resample("MS", on="sold_on")["amount"].sum()', mark: 'resample("MS", on="sold_on")', res: true, table: R("SELECT strftime('%Y-%m-01', sold_on) AS sold_on, SUM(amount) AS amount FROM sales_log GROUP BY 1 ORDER BY 1;", { hl: ['amount'] }) }
      ] },
      { type: 'mistake', title: T3('.dt on text', '文字のまま .dt', 'もじの まま .dt'), wrong: 'sales_log[sales_log["sold_on"].dt.month == 4]', right: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log[sales_log["sold_on"].dt.month == 4]',
        why: T3('"2025-04-02" is still text, so .dt does not work (AttributeError). Use pd.to_datetime first.', '"2025-04-02" はまだ文字なので .dt は使えない（AttributeError）。先に pd.to_datetime。', 'まだ もじ なので .dt は つかえない。さきに pd.to_datetime。') },
      { type: 'quiz', q: T3('How many rows does the result have?', '結果は何行？', '{結果|けっか}は {何行|なんぎょう}？'), code: 'sales_log["sold_on"] = pd.to_datetime(sales_log["sold_on"])\nsales_log.resample("MS", on="sold_on")["amount"].sum()', mark: 'resample("MS"',
        choices: ['4', '14', '12'], answer: e => String(one(e, "SELECT COUNT(DISTINCT strftime('%m', sold_on)) FROM sales_log;")),
        why: T3('The sales are from March to June: 4 months, one row each.', '売上は 3 月〜6 月：4 か月で 4 行。', '3{月|がつ}〜6{月|がつ}：4{行|ぎょう}。'), before: R(SL, { hl: ['sold_on'] }) },
      { type: 'points', items: [
        T3('pd.to_datetime(…) first, then .dt.month, .dt.day …', 'まず pd.to_datetime(…)、それから .dt.month など。', 'まず pd.to_datetime(…)。'),
        T3('groupby(… .dt.month) or resample("MS", on="col") for each month.', '月ごとは groupby(… .dt.month) か resample("MS", on="列")。', 'つきごとは groupby か resample。'),
        T3('SQL: strftime(\'%m\', sold_on)', 'SQL なら strftime(\'%m\', sold_on)', 'SQL なら strftime')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 17. duplicates ---------- */
  pd_dup: {
    goal: T3('Remove repeated values or rows.', '重なった値や行を取り除く。', 'かさなった {値|あたい}や {行|ぎょう}を とりのぞく。'),
    slides: [
      { type: 'scene', who: SCENE, ask: T3('“Which genres do we have? Just one book from each genre, please.”', '「どのジャンルがある？ ジャンルごとに 1 冊だけ見せて」', '「どの ジャンルが ある？ 1さつずつ みせて」'), table: R('SELECT id, title, genre FROM books;', { hl: ['genre'] }) },
      { type: 'syntax', code: 'books.drop_duplicates(subset=["genre"])', notes: [
        T3('.drop_duplicates() keeps the first of the same rows.', '.drop_duplicates() は同じものの最初の 1 つを残す。', 'おなじ ものの さいしょの 1つを のこす。'),
        T3('subset=["genre"]: same genre = the same. keep="last" keeps the last one.', 'subset=["genre"]：genre が同じなら同じとみなす。keep="last" で最後を残す。', 'keep="last" で さいごを のこす。'),
        T3('.nunique() counts the different values.', '.nunique() は種類の数。', '.nunique() は しゅるいの {数|かず}。')] },
      { type: 'anim', title: T3('Only the first of each', 'それぞれ最初の 1 つだけ', 'それぞれ さいしょの 1つだけ'), frames: [
        { cap: T3('The first book of each genre is kept.', 'ジャンルごとに最初の本が残る。', 'さいしょの {本|ほん}が のこる。'), code: 'books.drop_duplicates(subset=["genre"])', mark: 'subset=["genre"]', table: W('SELECT id, title, genre FROM books;', 'id IN (SELECT MIN(id) FROM books GROUP BY genre)', ['genre']) },
        { cap: T3('3 rows are left: one for each genre.', '3 行が残る：ジャンルごとに 1 行。', '3{行|ぎょう} のこる。'), code: 'books.drop_duplicates(subset=["genre"])', mark: 'drop_duplicates', res: true, table: R('SELECT * FROM books WHERE id IN (SELECT MIN(id) FROM books GROUP BY genre) ORDER BY id;', { hl: ['genre'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('The values', '値だけ', '{値|あたい}だけ'), covers: ['unique'], cap: T3('One column: each genre once.', '1 列だけ：ジャンルを 1 回ずつ。', 'ジャンルを 1{回|かい}ずつ。'), code: 'books["genre"].drop_duplicates()', mark: '["genre"].drop_duplicates()', res: true, table: R('SELECT MIN(id) AS id, genre FROM books GROUP BY genre ORDER BY MIN(id);', { hide: ['id'] }) },
        { label: T3('First row', '最初の行', 'さいしょの {行|ぎょう}'), covers: ['first'], cap: T3('The first row of each genre.', 'ジャンルごとの最初の行。', 'さいしょの {行|ぎょう}。'), code: 'books.drop_duplicates(subset=["genre"])', mark: 'subset=["genre"]', res: true, table: R('SELECT * FROM books WHERE id IN (SELECT MIN(id) FROM books GROUP BY genre) ORDER BY id;') },
        { label: T3('Last row', '最後の行', 'さいごの {行|ぎょう}'), covers: ['last'], cap: T3('keep="last": the last row of each genre.', 'keep="last"：ジャンルごとの最後の行。', 'keep="last"：さいごの {行|ぎょう}。'), code: 'books.drop_duplicates(subset=["genre"], keep="last")', mark: 'keep="last"', res: true, table: R('SELECT * FROM books WHERE id IN (SELECT MAX(id) FROM books GROUP BY genre) ORDER BY id;') },
        { label: T3('How many kinds', '何種類', 'なんしゅるい'), covers: ['nunique'], cap: T3('.nunique(): the number of different genres.', '.nunique()：ジャンルの種類の数。', 'しゅるいの {数|かず}。'), code: 'books["genre"].nunique()', mark: '.nunique()', table: V('SELECT COUNT(DISTINCT genre) FROM books;', 'value') }
      ] },
      { type: 'mistake', title: T3('No subset', 'subset を書かない', 'subset を {書|か}かない'), wrong: 'books.drop_duplicates()', right: 'books.drop_duplicates(subset=["genre"])',
        why: T3('Without subset, a row is a repeat only when every column is the same. No two books are the same, so nothing goes.', 'subset がないと「すべての列が同じ行」だけが重複になる。同じ本はないので 1 行も消えない。', 'subset が ないと {何|なに}も きえない。') },
      { type: 'quiz', q: T3('What does this give?', 'この答えは？', 'この こたえは？'), code: 'books["genre"].nunique()', mark: '.nunique()',
        choices: ['3', '12', '4'], answer: e => String(one(e, 'SELECT COUNT(DISTINCT genre) FROM books;')),
        why: T3('Novel, Comic, Science: 3 kinds.', 'Novel・Comic・Science の 3 種類。', '3しゅるい。'), before: R('SELECT id, title, genre FROM books;', { hl: ['genre'] }) },
      { type: 'points', items: [
        T3('.drop_duplicates(subset=["col"]) keeps the first row of each value (keep="last" for the last).', '.drop_duplicates(subset=["列"]) で値ごとに最初の行（keep="last" で最後）。', '.drop_duplicates(subset=["{列|れつ}"])'),
        T3('table["col"].drop_duplicates() lists each value once; .nunique() counts them.', '表["列"].drop_duplicates() で値の一覧、.nunique() でその数。', '.nunique() で しゅるいの {数|かず}。'),
        T3('SQL: SELECT DISTINCT genre FROM books;', 'SQL なら SELECT DISTINCT genre FROM books;', 'SQL なら DISTINCT')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 18. pivot tables ---------- */
  pd_pivot: {
    goal: T3('Make summary tables with pivot_table and crosstab.', 'pivot_table と crosstab で集計表を作る。', 'pivot_table と crosstab で しゅうけいひょうを つくる。'),
    slides: [
      { type: 'scene', who: ANALYST, ask: T3('“For each genre: the average price and pages, and how many books cost 2000 or more.”', '「ジャンルごとに、値段とページ数の平均、それに 2000 円以上の本の数が知りたい」', '「ジャンルごとの へいきんと、2000{円|えん} いじょうの {数|かず}が しりたい」'), table: R('SELECT id, title, genre, price, pages FROM books;', { hl: ['genre'] }) },
      { type: 'syntax', code: 'pd.pivot_table(books, index="genre", values="price", aggfunc="mean")', notes: [
        T3('index = the rows of the summary, values = what to work out, aggfunc = how ("mean", "sum", "max", "min").', 'index＝表の行になる列、values＝計算する列、aggfunc＝計算のしかた（"mean" "sum" "max" "min"）。', 'index＝{行|ぎょう}、values＝{計算|けいさん}する {列|れつ}、aggfunc＝しかた。'),
        T3('values=["price", "pages"] works out two columns at once.', 'values=["price", "pages"] で 2 つの列を一度に。', '2つの {列|れつ}を いちどに。'),
        T3('pd.crosstab(col1, col2) counts every pair of values.', 'pd.crosstab(列1, 列2) は値の組み合わせごとの件数。', 'くみあわせごとの {数|かず}。')] },
      { type: 'anim', title: T3('From rows to a summary', '行から集計表へ', '{行|ぎょう}から しゅうけいひょうへ'), frames: [
        { cap: T3('Rows grouped by genre.', 'genre ごとに分ける。', 'genre ごとに わける。'), code: 'books[["genre", "price"]]', mark: '"genre"', table: R('SELECT id, genre, price FROM books ORDER BY genre, id;', { hl: ['genre'] }) },
        { cap: T3('One row per genre with the mean price.', 'genre ごとに 1 行、price の平均。', '1{行|ぎょう}ずつ、へいきん。'), code: 'pd.pivot_table(books, index="genre", values="price", aggfunc="mean")', mark: 'aggfunc="mean"', res: true, table: R('SELECT genre, AVG(price) AS price FROM books GROUP BY genre ORDER BY genre;', { hl: ['price'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('One column', '1 つの列', '1つの {列|れつ}'), covers: ['pivot'], cap: T3('The highest pages of each genre.', 'ジャンルごとの pages の最大。', 'pages の さいだい。'), code: 'pd.pivot_table(books, index="genre", values="pages", aggfunc="max")', mark: 'aggfunc="max"', res: true, table: R('SELECT genre, MAX(pages) AS pages FROM books GROUP BY genre ORDER BY genre;', { hl: ['pages'] }) },
        { label: T3('Two columns', '2 つの列', '2つの {列|れつ}'), covers: ['two'], cap: T3('Averages of price and pages (the columns come in name order).', 'price と pages の平均（列は名前の順に並ぶ）。', 'price と pages の へいきん。'), code: 'pd.pivot_table(books, index="genre", values=["price", "pages"], aggfunc="mean")', mark: 'values=["price", "pages"]', res: true, table: R('SELECT genre, AVG(pages) AS pages, AVG(price) AS price FROM books GROUP BY genre ORDER BY genre;') },
        { label: T3('crosstab', 'crosstab（件数）', 'crosstab（けんすう）'), covers: ['cross'], cap: T3('For each genre: how many are 2000 or more (True) and not (False).', 'ジャンルごとに、2000 以上（True）とそうでない（False）の数。', '2000 いじょう（True）と そうでない（False）の {数|かず}。'), code: 'pd.crosstab(books["genre"], books["price"] >= 2000)', mark: 'pd.crosstab', res: true, table: R('SELECT genre, SUM(price < 2000) AS "False", SUM(price >= 2000) AS "True" FROM books GROUP BY genre ORDER BY genre;') }
      ] },
      { type: 'mistake', title: T3('Averaging text', '文字の列の平均', 'もじの {列|れつ}の へいきん'), wrong: 'pd.pivot_table(books, index="genre", values="title", aggfunc="mean")', right: 'pd.pivot_table(books, index="genre", values="price", aggfunc="mean")',
        why: T3('A title has no average. values must be a number column (TypeError).', 'タイトルに平均はない。values は数の列にする（TypeError）。', 'values は {数|かず}の {列|れつ}に する。') },
      { type: 'quiz', q: T3('In the Science row, what is True?', 'Science の行の True はいくつ？', 'Science の True は いくつ？'), code: 'pd.crosstab(books["genre"], books["price"] >= 2000)', mark: '>= 2000',
        choices: ['0', '1', '3'], answer: e => String(one(e, "SELECT COUNT(*) FROM books WHERE genre = 'Science' AND price >= 2000;")),
        why: T3('All 3 science books cost 2000 or more.', '理科の本 3 冊はすべて 2000 以上。', '3さつ ぜんぶ 2000 いじょう。'), before: R("SELECT id, title, genre, price FROM books WHERE genre = 'Science';", { hl: ['price'] }) },
      { type: 'points', items: [
        T3('pd.pivot_table(table, index=…, values=…, aggfunc=…)', 'pd.pivot_table(表, index=…, values=…, aggfunc=…)', 'pd.pivot_table({表|ひょう}, index=…, values=…, aggfunc=…)'),
        T3('pd.crosstab(col1, col2): counts for every pair.', 'pd.crosstab(列1, 列2)：組み合わせごとの件数。', 'pd.crosstab：くみあわせの {数|かず}。'),
        T3('SQL: GROUP BY genre with AVG, COUNT …', 'SQL なら GROUP BY genre と AVG・COUNT など。', 'SQL なら GROUP BY')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 19. concat ---------- */
  pd_concat: {
    goal: T3('Stack tables on top of each other with pd.concat.', 'pd.concat で表を縦につなぐ。', 'pd.concat で {表|ひょう}を たてに つなぐ。'),
    slides: [
      { type: 'scene', who: SCENE, ask: T3('“One list: the books of 2000 or more, and the science books.”', '「2000 円以上の本と、理科の本を 1 つの一覧にして」', '「2000{円|えん} いじょうと りかの {本|ほん}を 1つに して」'), table: R('SELECT id, title, genre, price FROM books;', { hl: ['genre', 'price'] }) },
      { type: 'syntax', code: 'pd.concat([books.head(2), books.tail(2)])', notes: [
        T3('Put the tables in a list [ ] and pass it to pd.concat.', '表をリスト [ ] に入れて pd.concat に渡す。', '{表|ひょう}を [ ] に いれて わたす。'),
        T3('The rows of table2 come under the rows of table1.', 'table1 の行の下に table2 の行が続く。', 'table1 の したに table2 が つづく。'),
        T3('A row in both appears twice. .drop_duplicates() keeps it once.', '両方にある行は 2 回出る。.drop_duplicates() で 1 回に。', '2{回|かい} でる。.drop_duplicates() で 1{回|かい}に。')] },
      { type: 'anim', title: T3('Two tables become one', '2 つの表が 1 つに', '2つの {表|ひょう}が 1つに'), frames: [
        { cap: T3('Table 1: price 2000 or more.', '表 1：price が 2000 以上。', '{表|ひょう}1：2000 いじょう。'), code: 'books[books["price"] >= 2000]', mark: '>= 2000', res: true, table: R('SELECT * FROM books WHERE price >= 2000;', { hl: ['price'] }) },
        { cap: T3('Table 2 goes under it. Books 10–12 are in both, so they appear twice.', '表 2 がその下に続く。10〜12 は両方にあるので 2 回出る。', '10〜12 は 2{回|かい} でる。'), code: 'pd.concat([books[books["price"] >= 2000], books[books["genre"] == "Science"]])', mark: 'pd.concat', res: true, table: e => { const st = ix(state(e, "SELECT * FROM books WHERE price >= 2000 UNION ALL SELECT * FROM books WHERE genre = 'Science';", { hl: ['genre', 'price'] })); st.rows.forEach((r, i) => { r.k = r.k + '#' + i; }); return st; } }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Stack', 'そのままつなぐ', 'そのまま つなぐ'), covers: ['all'], cap: T3('7 rows: the same book can appear twice.', '7 行：同じ本が 2 回出ることもある。', '7{行|ぎょう}。'), code: 'pd.concat([books[books["price"] >= 2000], books[books["genre"] == "Science"]])', mark: 'pd.concat', res: true, table: R("SELECT * FROM books WHERE price >= 2000 UNION ALL SELECT * FROM books WHERE genre = 'Science';") },
        { label: T3('Once each', '1 回ずつ', '1{回|かい}ずつ'), covers: ['union'], cap: T3('.drop_duplicates(): 4 rows.', '.drop_duplicates()：4 行。', '4{行|ぎょう}。'), code: 'pd.concat([books[books["price"] >= 2000], books[books["genre"] == "Science"]]).drop_duplicates()', mark: '.drop_duplicates()', res: true, table: R("SELECT * FROM books WHERE price >= 2000 OR genre = 'Science' ORDER BY id;") },
        { label: T3('First and last', '最初と最後', 'さいしょと さいご'), covers: ['headtail'], cap: T3('The first 2 and the last 2 rows.', '最初の 2 行と最後の 2 行。', 'さいしょの 2{行|ぎょう}と さいごの 2{行|ぎょう}。'), code: 'pd.concat([books.head(2), books.tail(2)])', mark: 'books.head(2), books.tail(2)', res: true, table: R('SELECT * FROM books WHERE id IN (1, 2, 11, 12) ORDER BY id;') }
      ] },
      { type: 'mistake', title: T3('No [ ]', '[ ] を付けない', '[ ] を つけない'), wrong: 'pd.concat(books.head(2), books.tail(2))', right: 'pd.concat([books.head(2), books.tail(2)])',
        why: T3('pd.concat takes one list of tables. Without [ ] it is an error (TypeError).', 'pd.concat に渡すのは表の「リスト」1 つ。[ ] がないとエラー（TypeError）。', '[ ] が ないと エラー。') },
      { type: 'quiz', q: T3('How many rows does this give?', '結果は何行？', '{結果|けっか}は {何行|なんぎょう}？'), code: 'pd.concat([books.head(3), books.head(3)])', mark: 'pd.concat',
        choices: ['3', '6', '12'], answer: 1,
        why: T3('concat does not remove anything: 3 + 3 = 6 rows.', 'concat は何も消さない：3 + 3 = 6 行。', '3 + 3 = 6{行|ぎょう}。'), before: R('SELECT * FROM books WHERE id <= 3;') },
      { type: 'points', items: [
        T3('pd.concat([table1, table2]): one under the other.', 'pd.concat([表1, 表2])：縦につなぐ。', 'pd.concat([{表|ひょう}1, {表|ひょう}2])'),
        T3('Add .drop_duplicates() to keep each row once.', '同じ行を 1 回にするなら .drop_duplicates()。', '1{回|かい}に するなら .drop_duplicates()。'),
        T3('SQL: UNION ALL / UNION', 'SQL なら UNION ALL / UNION', 'SQL なら UNION')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 20. merge how ---------- */
  pd_how: {
    goal: T3('Choose which rows stay when joining: how="left", "outer".', 'つなぐときに残す行を選ぶ：how="left"・"outer"。', 'つなぐ ときに のこす {行|ぎょう}を えらぶ。'),
    slides: [
      { type: 'scene', who: SCENE, ask: T3('“Show every customer, even those who never ordered.”', '「注文していないお客さんも含めて、全員を見せて」', '「ちゅうもん して いない {人|ひと}も ぜんいん みせて」'), side: [e => state(e, 'SELECT * FROM customers;', { hl: ['id'] }), e => state(e, 'SELECT * FROM orders;', { hl: ['customer_id'] })] },
      { type: 'syntax', code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id", how="left")', notes: [
        T3('how="inner" (the default): only rows with a partner.', 'how="inner"（書かないとき）：相手がいる行だけ。', 'inner：あいてが いる {行|ぎょう}だけ。'),
        T3('how="left": every row of the left table; no partner → NaN.', 'how="left"：左の表の行はすべて。相手がいなければ NaN。', 'left：ひだりは ぜんぶ。あいてが なければ NaN。'),
        T3('how="outer": every row of both tables.', 'how="outer"：両方の表の行をすべて。', 'outer：りょうほう ぜんぶ。')] },
      { type: 'anim', title: T3('inner and left', 'inner と left', 'inner と left'), frames: [
        { cap: T3('inner: only customers 2, 3 and 5 have orders.', 'inner：注文があるのは 2・3・5 だけ。', '2・3・5 だけ。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', mark: 'pd.merge', res: true, table: R('SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c JOIN orders o ON c.id = o.customer_id ORDER BY c.id;', { hl: ['customer_id'] }) },
        { cap: T3('left: customers 1 and 4 stay too, with NaN.', 'left：1 と 4 も NaN で残る。', '1 と 4 も NaN で のこる。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id", how="left")', mark: 'how="left"', res: true, table: R('SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c LEFT JOIN orders o ON c.id = o.customer_id ORDER BY c.id;', { hl: ['customer_id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('left', 'left', 'left'), covers: ['left'], cap: T3('Every customer.', 'お客さん全員。', 'ぜんいん。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id", how="left")', mark: 'how="left"', res: true, table: R('SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c LEFT JOIN orders o ON c.id = o.customer_id ORDER BY c.id;') },
        { label: T3('outer', 'outer', 'outer'), covers: ['outer'], cap: T3('Every customer and every order: orders 6 and 7 have no customer, so name is NaN.', 'お客さん全員と注文全部：6・7 の注文はお客さんがいないので name が NaN。', '6・7 は name が NaN。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id", how="outer")', mark: 'how="outer"',
          table: R('SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c LEFT JOIN orders o ON c.id = o.customer_id UNION ALL SELECT NULL, NULL, NULL, o.customer_id, o.item, o.amount FROM orders o WHERE o.customer_id NOT IN (SELECT id FROM customers);') },
        { label: T3('No partner', '相手がいない', 'あいてが いない'), covers: ['anti'], cap: T3('After a left join, the rows where customer_id is NaN are the customers with no order.', '左結合のあと customer_id が NaN の行＝注文のないお客さん。', 'customer_id が NaN の {行|ぎょう}。'), code: 'm = pd.merge(customers, orders, left_on="id", right_on="customer_id", how="left")\nm[m["customer_id"].isna()]', mark: 'm[m["customer_id"].isna()]', res: true, table: R('SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.customer_id IS NULL ORDER BY c.id;') }
      ] },
      { type: 'mistake', title: T3('Forgetting how', 'how を書かない', 'how を {書|か}かない'), wrong: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', right: 'pd.merge(customers, orders, left_on="id", right_on="customer_id", how="left")',
        why: T3('Without how, it is an inner join: customers 1 and 4 disappear.', 'how がないと inner：1 と 4 のお客さんが消える。', 'how が ないと 1 と 4 が きえる。') },
      { type: 'quiz', q: T3('How many rows does this give?', '結果は何行？', '{結果|けっか}は {何行|なんぎょう}？'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id", how="left")', mark: 'how="left"',
        choices: ['3', '5', '7'], answer: e => String(one(e, 'SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON c.id = o.customer_id;')),
        why: T3('Each of the 5 customers has at most one order: 5 rows.', 'お客さん 5 人、それぞれ注文は 1 つまで：5 行。', '5{行|ぎょう}。'), side: [e => state(e, 'SELECT * FROM customers;', { hl: ['id'] }), e => state(e, 'SELECT * FROM orders;', { hl: ['customer_id'] })] },
      { type: 'points', items: [
        T3('how="left": keep every left row; how="outer": keep every row.', 'how="left"：左をすべて残す、how="outer"：両方すべて残す。', 'left：ひだり ぜんぶ、outer：りょうほう ぜんぶ。'),
        T3('No partner → NaN. .isna() finds those rows.', '相手がいないと NaN。.isna() でその行が見つかる。', 'あいてが いないと NaN。'),
        T3('SQL: LEFT JOIN / FULL OUTER JOIN', 'SQL なら LEFT JOIN / FULL OUTER JOIN', 'SQL なら LEFT JOIN')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 21. charts ---------- */
  pd_plot: {
    goal: T3('Draw bar charts, histograms and scatter plots with .plot.', '.plot で棒グラフ・ヒストグラム・散布図を描く。', '.plot で グラフを かく。'),
    slides: [
      { type: 'scene', who: ANALYST, ask: T3('“Numbers are hard to compare. Can you show them as a chart?”', '「数字だけだと比べにくい。グラフで見せて」', '「グラフで みせて」'), table: R('SELECT id, title, genre, price, pages FROM books;', { hl: ['price', 'pages'] }) },
      { type: 'syntax', code: 'books.plot.bar(x="title", y="price")', notes: [
        T3('.plot.bar(x=…, y=…): a bar chart. x = the labels, y = the heights.', '.plot.bar(x=…, y=…)：棒グラフ。x＝ラベル、y＝高さ。', 'x＝ラベル、y＝たかさ。'),
        T3('.plot.hist(bins=n): how the values spread, in n bins.', '.plot.hist(bins=n)：値の散らばり（n 個の区間）。', '.plot.hist：ちらばり。'),
        T3('.plot.scatter(x=…, y=…): one dot for each row.', '.plot.scatter(x=…, y=…)：1 行に 1 つの点。', '.plot.scatter：1{行|ぎょう}に 1つの てん。')] },
      { type: 'anim', title: T3('From a table to a chart', '表からグラフへ', '{表|ひょう}から グラフへ'), frames: [
        { cap: T3('The average price of each genre (a Series).', 'ジャンルごとの平均価格（Series）。', 'ジャンルごとの へいきん。'), code: 'books.groupby("genre")["price"].mean()', mark: '.mean()', res: true, table: R('SELECT genre, AVG(price) AS price FROM books GROUP BY genre ORDER BY genre;', { hl: ['price'] }) },
        { cap: T3('Add .plot.bar(): each row becomes a bar.', '.plot.bar() を付けると、1 行が 1 本の棒になる。', '1{行|ぎょう}が 1ぽんの ぼうに なる。'), code: 'books.groupby("genre")["price"].mean().plot.bar()', mark: '.plot.bar()',
          chart: e => { const r = e.exec('SELECT genre, ROUND(AVG(price), 1) FROM books GROUP BY genre ORDER BY genre;').values; return barChart(r.map(v => v[0]), r.map(v => v[1])); } }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Bar', '棒グラフ', 'ぼうグラフ'), covers: ['bar'], cap: T3('One bar for each book.', '本ごとに 1 本。', '{本|ほん}ごとに 1ぽん。'), code: 'books.plot.bar(x="title", y="pages")', mark: '.plot.bar(x="title", y="pages")',
          chart: e => { const r = e.exec('SELECT title, pages FROM books;').values; return barChart(r.map(v => v[0].split(' ')[0]), r.map(v => v[1])); } },
        { label: T3('Group, then bar', 'まとめて棒グラフ', 'まとめて ぼうグラフ'), covers: ['group'], cap: T3('groupby first, then .plot.bar().', '先に groupby して .plot.bar()。', 'さきに groupby。'), code: 'books.groupby("genre")["pages"].sum().plot.bar()', mark: '.sum().plot.bar()',
          chart: e => { const r = e.exec('SELECT genre, SUM(pages) FROM books GROUP BY genre ORDER BY genre;').values; return barChart(r.map(v => v[0]), r.map(v => v[1])); } },
        { label: T3('Histogram', 'ヒストグラム', 'ヒストグラム'), covers: ['hist'], cap: T3('How pages spread: 4 bins from the smallest to the largest.', 'pages の散らばり：最小から最大までを 4 つの区間に。', '4つの くかん。'), code: 'books["pages"].plot.hist(bins=4)', mark: 'bins=4',
          chart: e => { const v = e.exec('SELECT pages FROM books;').values.map(x => x[0]), lo = Math.min(...v), hi = Math.max(...v), st = (hi - lo) / 4;
            const bins = [0, 1, 2, 3].map(i => ({ start: lo + i * st, n: v.filter(x => (i === 3 ? x >= lo + i * st && x <= hi : x >= lo + i * st && x < lo + (i + 1) * st)).length })); return histChart(bins, st); } },
        { label: T3('Scatter', '散布図', 'さんぷず'), covers: ['scatter'], cap: T3('price across, pages up: one dot per book.', '横に price、縦に pages：本ごとに 1 つの点。', '{本|ほん}ごとに 1つの てん。'), code: 'books.plot.scatter(x="price", y="pages")', mark: '.plot.scatter(x="price", y="pages")',
          chart: e => scatterChart(e.exec('SELECT price, pages, title FROM books;').values.map(v => ({ x: v[0], y: v[1], label: v[2] }))) }
      ] },
      { type: 'mistake', title: T3('Text on y', 'y に文字の列', 'y に もじの {列|れつ}'), wrong: 'books.plot.bar(x="price", y="title")', right: 'books.plot.bar(x="title", y="price")',
        why: T3('The height of a bar must be a number. y="title" is text, so there is nothing to draw (TypeError).', '棒の高さは数。y に文字の列を書くと描けない（TypeError）。', 'たかさは {数|かず}。y に もじは だめ。') },
      { type: 'quiz', q: T3('Which chart does this draw?', 'どのグラフが描かれる？', 'どの グラフ？'), code: 'books.plot.scatter(x="price", y="pages")', mark: '.plot.scatter',
        choices: [T3('Bars', '棒グラフ', 'ぼうグラフ'), T3('Dots', '点（散布図）', 'てん（さんぷず）'), T3('Bins', 'ヒストグラム', 'ヒストグラム')], answer: 1,
        why: T3('scatter puts one dot for each row: price across, pages up.', 'scatter は 1 行に 1 つの点：横が price、縦が pages。', '1{行|ぎょう}に 1つの てん。'), before: R('SELECT id, title, price, pages FROM books;', { hl: ['price', 'pages'] }) },
      { type: 'points', items: [
        T3('.plot.bar(x=…, y=…) bars, .plot.hist(bins=n) spread, .plot.scatter(x=…, y=…) dots.', '.plot.bar で棒、.plot.hist で散らばり、.plot.scatter で点。', '.plot.bar・.plot.hist・.plot.scatter'),
        T3('Make the numbers first (groupby …), then add .plot.', '先に数を作って（groupby など）、最後に .plot。', 'さきに {数|かず}を つくって、さいごに .plot。'),
        T3('The chart you draw is your answer; colours and titles do not matter.', '描いたグラフが答え。色やタイトルは問わない。', 'かいた グラフが こたえ。')] },
      { type: 'practice' }
    ]
  }
};
