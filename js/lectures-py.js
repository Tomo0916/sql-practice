/* =========================================================
 * lectures-py.js — a lecture for each lesson of the Python (pandas) course.
 * The same form as the SQL lectures (scene → syntax → animation → every pattern the
 * problems use → mistakes → quiz → points → practice), with Python code (`code`) instead of SQL.
 * The tables are worked out with the app's SQL engine on the same tables (books …), so the
 * lecture needs no Python; tools-next/check.mjs runs every piece of code with real pandas
 * and checks that the tables marked `res` show what pandas gives.
 * The grey number at the left of a row is the pandas index (the row's label).
 * Text: English, Japanese and Easy Japanese; other languages read English.
 * ========================================================= */
import { T3, state, checked } from './lecture-kit.js';
import { PY_LECTURES_2 } from './lectures-py2.js';

const ALL = 'SELECT * FROM books;';
/** the pandas index of a books row: id − 1 (the DataFrame is made from the rows in order) */
const ix = st => { st.rows.forEach(r => { if (/^\d+$/.test(r.k)) r.idx = String(+r.k - 1); }); return st; };
const R = (sql, o) => e => ix(state(e, sql, o));
/** every row checked against a condition: ✓ kept, ✕ dropped */
const W = (where, hl, all = ALL) => e => ix(checked(e, all, where, hl));
const one = (e, sql) => e.exec(sql).values[0][0];
const GEN = ['Novel', 'Comic', 'Science'];
const gc = v => 'g' + GEN.indexOf(v);
/** a pandas result that is one value, shown as a one-cell table */
const V = (sql, name) => e => ({ cols: [name], hl: [name], dim: false, nohead: false, rows: [{ k: 'v', cells: [one(e, sql)], cls: 'pass' }] });

export const PY_LECTURES = {
  /* ---------- 1. head ---------- */
  pd_head: {
    goal: T3('Look at the first rows of a table with head().', 'head() で表の最初の行を見る。', 'head() で {表|ひょう}の はじめの {行|ぎょう}を {見|み}る。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“We got a list of books. What does it look like?”', '「本の一覧をもらった。どんな表なの？」', '「{本|ほん}の リストを もらった。どんな {表|ひょう}なの？」'), table: R(ALL) },
      { type: 'syntax', code: 'books.head(3)', notes: [
        T3('books is a DataFrame: a table with columns and rows, like a table in SQL.', 'books は DataFrame（データフレーム）。SQL のテーブルと同じ、列と行のある表。', 'books は DataFrame（データフレーム）。SQL の テーブルと おなじ、{列|れつ}と {行|ぎょう}の ある {表|ひょう}。'),
        T3('table.head(n) gives the first n rows. head() with nothing inside gives 5 rows.', '表.head(n) で最初の n 行。( ) の中が空なら 5 行。', '{表|ひょう}.head(n) で はじめの n {行|ぎょう}。( ) の {中|なか}が からなら 5{行|ぎょう}。'),
        T3('The grey number on the left is the index: the label of each row, counted from 0.', '左の灰色の数字は index（インデックス）。行につく番号で、0 から数える。', '{左|ひだり}の はいいろの {数字|すうじ}は index（インデックス）。{行|ぎょう}の {番号|ばんごう}で、0 から かぞえる。')] },
      { type: 'anim', title: T3('What head() does', 'head() がすること', 'head() が すること'), frames: [
        { cap: T3('books has 12 rows. Each row has an index: 0, 1, 2 …', 'books は 12 行。行には index が 0, 1, 2 … と付いている。', 'books は 12{行|ぎょう}。{行|ぎょう}には index が 0, 1, 2 … と ついている。'), code: 'books', mark: 'books', table: R(ALL) },
        { cap: T3('head(3) keeps the first 3 rows (index 0 to 2).', 'head(3) で上から 3 行（index 0〜2）だけ残る。', 'head(3) で {上|うえ}から 3{行|ぎょう}（index 0〜2）だけ のこる。'), code: 'books.head(3)', mark: '.head(3)',
          table: R(ALL, { cls: v => (v[0] <= 3 ? 'pass' : 'fail') }) },
        { cap: T3('The result: a new, smaller table. books itself does not change.', '結果は小さな新しい表。books そのものは変わらない。', '{結果|けっか}は {小|ちい}さな {新|あたら}しい {表|ひょう}。books そのものは かわらない。'), code: 'books.head(3)', mark: '.head(3)', res: true,
          table: R('SELECT * FROM books LIMIT 3;', { cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('head(2)', 'head(2)', 'head(2)'), cap: T3('The first 2 rows.', '最初の 2 行。', 'はじめの 2{行|ぎょう}。'), code: 'books.head(2)', mark: '(2)', res: true, table: R('SELECT * FROM books LIMIT 2;') },
        { label: T3('head(5)', 'head(5)', 'head(5)'), cap: T3('The first 5 rows.', '最初の 5 行。', 'はじめの 5{行|ぎょう}。'), code: 'books.head(5)', mark: '(5)', res: true, table: R('SELECT * FROM books LIMIT 5;') },
        { label: T3('head()', 'head()', 'head()'), cap: T3('Nothing inside ( ): 5 rows, the same as head(5).', '( ) が空：5 行。head(5) と同じ。', '( ) が から：5{行|ぎょう}。head(5) と おなじ。'), code: 'books.head()', mark: '()', res: true, table: R('SELECT * FROM books LIMIT 5;') }
      ] },
      { type: 'mistake', title: T3('No ( )', '( ) がない', '( ) が ない'), wrong: 'books.head', right: 'books.head(3)',
        why: T3('head is a method: without ( ) it is not run, and you only see “<bound method …>”.', 'head はメソッド（命令）。( ) がないと実行されず、「<bound method …>」と出るだけ。', 'head は メソッド（めいれい）。( ) が ないと {実行|じっこう}されず、「<bound method …>」と {出|で}るだけ。') },
      { type: 'quiz', q: T3('books.head(4): what is the index of the last row?', 'books.head(4) の最後の行の index は？', 'books.head(4) の さいごの {行|ぎょう}の index は？'), code: 'books.head(4)', mark: '(4)',
        choices: ['3', '4', '5'], answer: 0,
        why: T3('The index starts at 0: 4 rows are 0, 1, 2, 3.', 'index は 0 から始まる。4 行なら 0, 1, 2, 3。', 'index は 0 から はじまる。4{行|ぎょう}なら 0, 1, 2, 3。'),
        before: R(ALL), table: R('SELECT * FROM books LIMIT 4;', { cls: () => 'pass' }) },
      { type: 'points', items: [
        T3('First look at a new table with head(): its columns and what the values are like.', '新しい表はまず head() で見る。どんな列があり、どんな値が入っているか。', '{新|あたら}しい {表|ひょう}は まず head() で {見|み}る。どんな {列|れつ}と {値|あたい}が あるか。'),
        T3('In a notebook, the value of the last line is shown: write books.head(3) on the last line.', 'ノートブックでは最後の行の値が表示される。最後の行に books.head(3) と書く。', 'ノートブックでは さいごの {行|ぎょう}の {値|あたい}が {表示|ひょうじ}される。'),
        T3('SQL: SELECT * FROM books LIMIT 3;', 'SQL なら SELECT * FROM books LIMIT 3;', 'SQL なら SELECT * FROM books LIMIT 3;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 2. columns ---------- */
  pd_cols: {
    goal: T3('Take only the columns you need with table[[...]].', '表[[...]] で必要な列だけを取り出す。', '{表|ひょう}[[...]] で いる {列|れつ}だけを とりだす。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“I only need the title and the price for the price list.”', '「値札用に、書名と値段だけほしい」', '「ねふだ{用|よう}に、{本|ほん}の {名前|なまえ}と ねだんだけ ほしい」'), table: R(ALL, { hl: ['title', 'price'] }) },
      { type: 'syntax', code: 'books[["title", "price"]]', notes: [
        T3('Put the column names in a list [ … ], and that list inside table[ ]: two pairs of [ ].', '列名をリスト [ … ] にして、それを 表[ ] の中に入れる。だから [ ] が 2 重になる。', '{列|れつ}の {名前|なまえ}を リスト [ … ] に して、それを {表|ひょう}[ ] の {中|なか}に {入|い}れる。'),
        T3('Column names are text, so they go in " ".', '列名は文字なので " " で囲む。', '{列|れつ}の {名前|なまえ}は {文字|もじ}なので " " で かこむ。'),
        T3('The columns come in the order of the list.', '列はリストに書いた順に並ぶ。', '{列|れつ}は リストに {書|か}いた {順|じゅん}に ならぶ。')] },
      { type: 'anim', title: T3('What [[ ]] does', '[[ ]] がすること', '[[ ]] が すること'), frames: [
        { cap: T3('Start from every column of books.', 'books の全部の列から始まる。', 'books の ぜんぶの {列|れつ}から はじまる。'), code: 'books', mark: 'books', table: R(ALL) },
        { cap: T3('The list ["title", "price"] says which columns to take.', 'リスト ["title", "price"] が、取り出す列を決める。', 'リスト ["title", "price"] が、とりだす {列|れつ}を きめる。'), code: 'books[["title", "price"]]', mark: '["title", "price"]', table: R(ALL, { hl: ['title', 'price'], dim: true }) },
        { cap: T3('The result: a table with only those 2 columns. Every row stays, with the same index.', '結果：その 2 列だけの表。行はすべて残り、index もそのまま。', '{結果|けっか}：その 2{列|れつ}だけの {表|ひょう}。{行|ぎょう}は ぜんぶ のこり、index も そのまま。'), code: 'books[["title", "price"]]', mark: '[["title", "price"]]', res: true,
          table: R('SELECT id, title, price FROM books;', { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('2 columns', '2 列', '2{列|れつ}'), cap: T3('title and genre.', 'title と genre。', 'title と genre。'), code: 'books[["title", "genre"]]', mark: '"genre"', res: true, table: R('SELECT id, title, genre FROM books;', { hide: ['id'] }) },
        { label: T3('Order', '順番', '{順番|じゅんばん}'), cap: T3('Write pages first, and pages comes first.', 'pages を先に書けば、pages が先に来る。', 'pages を {先|さき}に {書|か}けば、pages が {先|さき}に くる。'), code: 'books[["pages", "title"]]', mark: '["pages", "title"]', res: true, table: R('SELECT id, pages, title FROM books;', { hide: ['id'] }) },
        { label: T3('[ ] once', '[ ] が 1 つ', '[ ] が 1つ'), cap: T3('One name with one [ ] gives a Series: one column of values, not a table.', '[ ] 1 つに列名 1 つだと Series（シリーズ）。表ではなく、値が 1 列に並んだもの。', '[ ] 1つに {列|れつ}の {名前|なまえ} 1つだと Series（シリーズ）。{値|あたい}が 1{列|れつ}に ならんだ もの。'), code: 'books["title"]', mark: '["title"]', table: R('SELECT id, title FROM books;', { hide: ['id'], nohead: true }) }
      ] },
      { type: 'mistake', title: T3('Only one [ ]', '[ ] が 1 つだけ', '[ ] が 1つだけ'), wrong: 'books["title", "price"]', right: 'books[["title", "price"]]',
        why: T3('With one [ ], pandas looks for a single column called ("title", "price") and gives KeyError.', '[ ] が 1 つだと、("title", "price") という名前の 1 つの列を探してしまい KeyError になる。', '[ ] が 1つだと、("title", "price") と いう 1つの {列|れつ}を さがして KeyError に なる。') },
      { type: 'quiz', q: T3('books[["price", "title"]]: which column comes first?', 'books[["price", "title"]] で、左に来る列は？', 'books[["price", "title"]] で、{左|ひだり}に くる {列|れつ}は？'), code: 'books[["price", "title"]]', mark: '["price", "title"]',
        choices: ['price', 'title', 'id'], answer: 0,
        why: T3('The columns come in the order of the list: price, then title.', '列はリストの順。price、そして title。', '{列|れつ}は リストの {順|じゅん}。price、そして title。'),
        before: R(ALL), table: R('SELECT id, price, title FROM books;', { hide: ['id'] }) },
      { type: 'points', items: [
        T3('Columns: table[["a", "b"]] — a list inside [ ].', '列を選ぶ：表[["a", "b"]]。[ ] の中にリスト。', '{列|れつ}を {選|えら}ぶ：{表|ひょう}[["a", "b"]]。'),
        T3('table["a"] (one [ ]) gives one column as a Series.', '表["a"]（[ ] 1 つ）は 1 列だけの Series。', '{表|ひょう}["a"]（[ ] 1つ）は 1{列|れつ}だけの Series。'),
        T3('SQL: SELECT title, price FROM books;', 'SQL なら SELECT title, price FROM books;', 'SQL なら SELECT title, price FROM books;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 3. a number condition ---------- */
  pd_num: {
    goal: T3('Keep only the rows where a number meets a condition.', '数の条件に合う行だけを残す。', '{数|かず}の {条件|じょうけん}に あう {行|ぎょう}だけを のこす。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“Which books cost 2000 yen or more?”', '「2000 円以上の本はどれ？」', '「2000{円|えん} いじょうの {本|ほん}は どれ？」'), table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', code: 'books[books["price"] >= 2000]', notes: [
        T3('Inside: books["price"] >= 2000 checks every row and gives True or False.', '内側：books["price"] >= 2000 が 1 行ずつ調べて True か False を出す。', '{内側|うちがわ}：books["price"] >= 2000 が 1{行|ぎょう}ずつ しらべて True か False を {出|だ}す。'),
        T3('Outside: books[ … ] keeps the rows that are True.', '外側：books[ … ] が True の行だけを残す。', '{外側|そとがわ}：books[ … ] が True の {行|ぎょう}だけを のこす。'),
        T3('Comparisons: >=  >  <=  <  ==  !=', '比べる記号：>=（以上）>（より大きい）<=（以下）<（より小さい）', 'くらべる {記号|きごう}：>=（いじょう）>（より {大|おお}きい）<=（いか）<（より {小|ちい}さい）')] },
      { type: 'anim', title: T3('What the condition does', '条件がすること', '{条件|じょうけん}が すること'), frames: [
        { cap: T3('Start from every row of books.', 'books の全部の行から始まる。', 'books の ぜんぶの {行|ぎょう}から はじまる。'), code: 'books', mark: 'books', table: R(ALL, { hl: ['price'] }) },
        { cap: T3('books["price"] >= 2000: True (✓) or False (✕) for each row.', 'books["price"] >= 2000：行ごとに True（✓）か False（✕）。', 'books["price"] >= 2000：{行|ぎょう}ごとに True（✓）か False（✕）。'), code: 'books["price"] >= 2000', mark: 'books["price"] >= 2000', table: W('price >= 2000', ['price']) },
        { cap: T3('books[ … ] keeps the True rows. Look at the index: 2, 9, 10, 11 — the labels stay.', 'books[ … ] で True の行が残る。index を見ると 2, 9, 10, 11：番号はそのまま。', 'books[ … ] で True の {行|ぎょう}が のこる。index は 2, 9, 10, 11 の まま。'), code: 'books[books["price"] >= 2000]', mark: 'books[', res: true,
          table: R('SELECT * FROM books WHERE price >= 2000;', { hl: ['price'], cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('>=', '>=（以上）', '>=（いじょう）'), covers: ['ge'], cap: T3('2100 or more: 2100 itself is included.', '2100 以上。2100 ちょうどもふくむ。', '2100 いじょう。2100 ちょうども ふくむ。'), code: 'books[books["price"] >= 2100]', mark: '>=', res: 'pass', table: W('price >= 2100', ['price']) },
        { label: T3('>', '>（より大きい）', '>（より {大|おお}きい）'), covers: ['gt'], cap: T3('More than 2100: 2100 itself is not included.', '2100 より大きい。2100 ちょうどはふくまない。', '2100 より {大|おお}きい。2100 ちょうどは ふくまない。'), code: 'books[books["price"] > 2100]', mark: '>', res: 'pass', table: W('price > 2100', ['price']) },
        { label: T3('<=', '<=（以下）', '<=（いか）'), covers: ['le'], cap: T3('240 pages or fewer: 240 is included.', 'pages が 240 以下。240 ちょうどもふくむ。', 'pages が 240 いか。240 ちょうども ふくむ。'), code: 'books[books["pages"] <= 240]', mark: '<=', res: 'pass', table: W('pages <= 240', ['pages']) },
        { label: T3('<', '<（より小さい）', '<（より {小|ちい}さい）'), covers: ['lt'], cap: T3('Fewer than 240 pages: 240 is not included.', 'pages が 240 より小さい。240 ちょうどはふくまない。', 'pages が 240 より {小|ちい}さい。240 ちょうどは ふくまない。'), code: 'books[books["pages"] < 240]', mark: '<', res: 'pass', table: W('pages < 240', ['pages']) }
      ] },
      { type: 'mistake', title: T3('Only the inside', '内側だけ', '{内側|うちがわ}だけ'), wrong: 'books["price"] >= 2000', right: 'books[books["price"] >= 2000]',
        why: T3('The inside alone gives a list of True / False, not the rows. Put it in books[ ].', '内側だけだと True / False の並びが出るだけで、行は出てこない。books[ ] に入れる。', '{内側|うちがわ}だけだと True / False が ならぶだけ。books[ ] に {入|い}れる。') },
      { type: 'mistake', title: T3('=> instead of >=', '>= を => と書く', '>= を => と {書|か}く'), wrong: 'books[books["price"] => 2000]', right: 'books[books["price"] >= 2000]',
        why: T3('The = comes second: >= and <= (=> is a SyntaxError).', '= はあとに書く：>= と <=（=> は SyntaxError）。', '= は あとに {書|か}く：>= と <=。') },
      { type: 'quiz', q: T3('How many rows does it give?', '何行になる？', '{何行|なんぎょう}に なる？'), code: 'books[books["price"] > 1950]', mark: '> 1950',
        choices: ['3', '4', '5'], answer: e => one(e, 'SELECT COUNT(*) FROM books WHERE price > 1950;'),
        why: T3('> does not include 1950 itself, so Ocean of Stars (1950) is dropped.', '> は 1950 ちょうどをふくまない。Ocean of Stars（1950）は消える。', '> は 1950 ちょうどを ふくまない。Ocean of Stars（1950）は きえる。'),
        before: R(ALL, { hl: ['price'] }), table: W('price > 1950', ['price']) },
      { type: 'points', items: [
        T3('table[table["col"] >= value]: the inside checks, the outside keeps.', '表[表["列"] >= 値]：内側で調べて、外側で残す。', '{表|ひょう}[{表|ひょう}["{列|れつ}"] >= {値|あたい}]：{内側|うちがわ}で しらべて、{外側|そとがわ}で のこす。'),
        T3('>= and <= include the value itself; > and < do not.', '>= と <= はその値をふくむ。> と < はふくまない。', '>= と <= は その {値|あたい}を ふくむ。> と < は ふくまない。'),
        T3('SQL: SELECT * FROM books WHERE price >= 2000;', 'SQL なら SELECT * FROM books WHERE price >= 2000;', 'SQL なら SELECT * FROM books WHERE price >= 2000;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 4. a text condition ---------- */
  pd_text: {
    goal: T3('Keep only the rows with (or without) a text value.', '文字の値が同じ（または違う）行だけを残す。', '{文字|もじ}の {値|あたい}が おなじ（または ちがう）{行|ぎょう}だけを のこす。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“Show me only the comics.”', '「コミックだけ見せて」', '「コミックだけ {見|み}せて」'), table: R(ALL, { hl: ['genre'], cls: v => gc(v[2]) }) },
      { type: 'syntax', code: 'books[books["genre"] == "Comic"]', notes: [
        T3('“Is equal to” is == (two =). One = means “put into” and is an error here.', '「等しい」は ==（= が 2 つ）。= が 1 つだと「代入」の意味になり、ここではエラー。', '「おなじ」は ==（= が 2つ）。= 1つだと エラー。'),
        T3('“Is not equal to” is !=.', '「等しくない」は !=。', '「ちがう」は !=。'),
        T3('Text values go in " ", and capitals matter: "comic" is not "Comic".', '文字の値は " " で囲む。大文字・小文字も区別する："comic" と "Comic" は別。', '{文字|もじ}は " " で かこむ。"comic" と "Comic" は べつ。')] },
      { type: 'anim', title: T3('Rows of one genre', '1 つのジャンルの行', '1つの ジャンルの {行|ぎょう}'), frames: [
        { cap: T3('Every row, with its genre.', '全部の行と、それぞれのジャンル。', 'ぜんぶの {行|ぎょう}と ジャンル。'), code: 'books', mark: 'books', table: R(ALL, { hl: ['genre'], cls: v => gc(v[2]) }) },
        { cap: T3('== "Comic": True only where genre is exactly Comic.', '== "Comic"：genre がちょうど Comic の行だけ True。', '== "Comic"：genre が Comic の {行|ぎょう}だけ True。'), code: 'books["genre"] == "Comic"', mark: '== "Comic"', table: W("genre = 'Comic'", ['genre']) },
        { cap: T3('The comics are left: index 5 to 8.', 'コミックが残る：index 5〜8。', 'コミックが のこる：index 5〜8。'), code: 'books[books["genre"] == "Comic"]', mark: 'books[', res: true, table: R("SELECT * FROM books WHERE genre = 'Comic';", { hl: ['genre'], cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('==', '==（等しい）', '==（おなじ）'), covers: ['eq'], cap: T3('genre is Science.', 'genre が Science の行。', 'genre が Science の {行|ぎょう}。'), code: 'books[books["genre"] == "Science"]', mark: '==', res: 'pass', table: W("genre = 'Science'", ['genre']) },
        { label: T3('!=', '!=（等しくない）', '!=（ちがう）'), covers: ['ne'], cap: T3('Every genre except Novel.', 'genre が Novel ではない行。', 'genre が Novel では ない {行|ぎょう}。'), code: 'books[books["genre"] != "Novel"]', mark: '!=', res: 'pass', table: W("genre <> 'Novel'", ['genre']) }
      ] },
      { type: 'mistake', title: T3('One =', '= が 1 つ', '= が 1つ'), wrong: 'books[books["genre"] = "Comic"]', right: 'books[books["genre"] == "Comic"]',
        why: T3('= puts a value into something; comparing needs ==. One = is a SyntaxError.', '= は「入れる」記号。比べるときは ==。= が 1 つだと SyntaxError。', '= は「{入|い}れる」{記号|きごう}。くらべる ときは ==。') },
      { type: 'mistake', title: T3('No " "', '" " がない', '" " が ない'), wrong: 'books[books["genre"] == Comic]', right: 'books[books["genre"] == "Comic"]',
        why: T3('Without " ", Comic is read as the name of a variable: NameError.', '" " がないと、Comic が変数の名前だと思われて NameError。', '" " が ないと、Comic が {変数|へんすう}の {名前|なまえ}だと おもわれて エラー。') },
      { type: 'quiz', q: T3('How many rows does it give?', '何行になる？', '{何行|なんぎょう}に なる？'), code: 'books[books["genre"] != "Comic"]', mark: '!= "Comic"',
        choices: ['4', '8', '12'], answer: e => one(e, "SELECT COUNT(*) FROM books WHERE genre <> 'Comic';"),
        why: T3('12 books, 4 comics: 8 are not comics.', '12 冊のうちコミックは 4 冊。コミックでないのは 8 冊。', '12{冊|さつ}の うち コミックは 4{冊|さつ}。のこりは 8{冊|さつ}。'),
        before: R(ALL, { hl: ['genre'], cls: v => gc(v[2]) }), table: W("genre <> 'Comic'", ['genre']) },
      { type: 'points', items: [
        T3('Equal: ==, not equal: !=.', '等しい：==、等しくない：!=。', 'おなじ：==、ちがう：!=。'),
        T3('Text in " ", numbers as they are.', '文字は " " で囲む。数はそのまま。', '{文字|もじ}は " " で かこむ。{数|かず}は そのまま。'),
        T3("SQL: WHERE genre = 'Comic' — SQL uses one = and ' '.", "SQL では WHERE genre = 'Comic'。SQL は = が 1 つで ' ' を使う。", "SQL では WHERE genre = 'Comic'。")] },
      { type: 'practice' }
    ]
  },

  /* ---------- 5. & and | ---------- */
  pd_andor: {
    goal: T3('Combine two conditions with & (and) or | (or).', '2 つの条件を &（かつ）と |（または）で組み合わせる。', '2つの {条件|じょうけん}を &（かつ）と |（または）で くみあわせる。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“Novels that cost 1800 yen or more, please.”', '「1800 円以上の小説を探して」', '「1800{円|えん} いじょうの {小説|しょうせつ}を さがして」'), table: R(ALL, { hl: ['genre', 'price'] }) },
      { type: 'syntax', code: 'books[(books["price"] >= 1800) & (books["genre"] == "Novel")]', notes: [
        T3('& = and: both conditions must be True.', '&＝かつ：両方の条件が True の行。', '&＝かつ：りょうほうの {条件|じょうけん}が True の {行|ぎょう}。'),
        T3('| = or: at least one condition is True.', '|＝または：どちらか 1 つでも True の行。', '|＝または：どちらか 1つでも True の {行|ぎょう}。'),
        T3('Put each condition in ( ). Not the words and / or.', 'それぞれの条件を ( ) で囲む。and / or という単語は使わない。', 'それぞれの {条件|じょうけん}を ( ) で かこむ。and / or は つかわない。')] },
      { type: 'anim', title: T3('Two checks, then &', '2 つ調べて、& でまとめる', '2つ しらべて、& で まとめる'), frames: [
        { cap: T3('First check: price >= 1800.', '1 つめ：price >= 1800。', '1つめ：price >= 1800。'), code: 'books["price"] >= 1800', mark: 'books["price"] >= 1800', table: W('price >= 1800', ['price']) },
        { cap: T3('Second check: genre == "Novel".', '2 つめ：genre == "Novel"。', '2つめ：genre == "Novel"。'), code: 'books["genre"] == "Novel"', mark: 'books["genre"] == "Novel"', table: W("genre = 'Novel'", ['genre']) },
        { cap: T3('&: only the rows where both are ✓.', '&：両方 ✓ の行だけ。', '&：りょうほう ✓ の {行|ぎょう}だけ。'), code: 'books[(books["price"] >= 1800) & (books["genre"] == "Novel")]', mark: '&', res: 'pass', table: W("price >= 1800 AND genre = 'Novel'", ['price', 'genre']) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('&', '&（かつ）', '&（かつ）'), covers: ['and'], cap: T3('Science and fewer than 300 pages.', 'Science で、しかも 300 ページより少ない。', 'Science で、しかも 300ページより {少|すく}ない。'), code: 'books[(books["genre"] == "Science") & (books["pages"] < 300)]', mark: '&', res: 'pass', table: W("genre = 'Science' AND pages < 300", ['genre', 'pages']) },
        { label: T3('|', '|（または）', '|（または）'), covers: ['or'], cap: T3('A comic, or 2400 yen or more: either one is enough.', 'コミック、または 2400 円以上。どちらか一方でよい。', 'コミック、または 2400{円|えん} いじょう。どちらか 1つで よい。'), code: 'books[(books["genre"] == "Comic") | (books["price"] >= 2400)]', mark: '|', res: 'pass', table: W("genre = 'Comic' OR price >= 2400", ['genre', 'price']) }
      ] },
      { type: 'mistake', title: T3('No ( )', '( ) がない', '( ) が ない'), wrong: 'books[books["price"] >= 1800 & books["genre"] == "Novel"]', right: 'books[(books["price"] >= 1800) & (books["genre"] == "Novel")]',
        why: T3('& is worked out before >= and ==, so Python tries 1800 & books["genre"] first: an error. Always use ( ).', '& は >= や == より先に計算されるので、1800 & books["genre"] を先にしようとしてエラーになる。必ず ( ) で囲む。', '& は >= や == より {先|さき}に {計算|けいさん}されて エラーに なる。かならず ( ) で かこむ。') },
      { type: 'mistake', title: T3('The word and', 'and と書く', 'and と {書|か}く'), wrong: 'books[(books["price"] >= 1800) and (books["genre"] == "Novel")]', right: 'books[(books["price"] >= 1800) & (books["genre"] == "Novel")]',
        why: T3('and works with one True / False, not a whole column of them: “The truth value of a Series is ambiguous”.', 'and は True / False 1 つにしか使えない。列全体には & を使う（「truth value of a Series is ambiguous」というエラー）。', 'and は 1つの True / False にしか つかえない。{列|れつ} ぜんたいには & を つかう。') },
      { type: 'quiz', q: T3('How many rows does it give?', '何行になる？', '{何行|なんぎょう}に なる？'), code: 'books[(books["genre"] == "Novel") | (books["genre"] == "Science")]', mark: '|',
        choices: ['0', '8', '12'], answer: e => one(e, "SELECT COUNT(*) FROM books WHERE genre = 'Novel' OR genre = 'Science';"),
        why: T3('| keeps a row when either is True: 5 novels + 3 science books = 8. With & it would be 0 (no book has two genres).', '| はどちらかが True なら残す：小説 5 冊＋科学 3 冊＝8。& なら 0（2 つのジャンルを持つ本はない）。', '| は どちらかが True なら のこす：5＋3＝8。& なら 0。'),
        before: R(ALL, { hl: ['genre'], cls: v => gc(v[2]) }), table: W("genre = 'Novel' OR genre = 'Science'", ['genre']) },
      { type: 'points', items: [
        T3('& = and, | = or, each condition in ( ).', '&＝かつ、|＝または。条件はそれぞれ ( ) に入れる。', '&＝かつ、|＝または。{条件|じょうけん}は ( ) に {入|い}れる。'),
        T3('& gives fewer rows, | gives more.', '& を使うと行は減り、| を使うと行は増える。', '& だと {行|ぎょう}は へり、| だと ふえる。'),
        T3('SQL: WHERE price >= 1800 AND genre = \'Novel\'', "SQL なら WHERE price >= 1800 AND genre = 'Novel'", "SQL なら WHERE price >= 1800 AND genre = 'Novel'")] },
      { type: 'practice' }
    ]
  },

  /* ---------- 6. loc ---------- */
  pd_loc: {
    goal: T3('Choose rows and columns at the same time with loc.', 'loc で行と列を同時に選ぶ。', 'loc で {行|ぎょう}と {列|れつ}を いっしょに {選|えら}ぶ。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“For the books over 2000 yen, just the title and the price.”', '「2000 円を超える本の、書名と値段だけ」', '「2000{円|えん}より {高|たか}い {本|ほん}の、{名前|なまえ}と ねだんだけ」'), table: R(ALL, { hl: ['title', 'price'] }) },
      { type: 'syntax', code: 'books.loc[books["price"] > 2000, ["title", "price"]]', notes: [
        T3('table.loc[rows, columns]: before the comma which rows, after it which columns.', '表.loc[行, 列]：カンマの前が行、後ろが列。', '{表|ひょう}.loc[{行|ぎょう}, {列|れつ}]：カンマの {前|まえ}が {行|ぎょう}、うしろが {列|れつ}。'),
        T3('Rows: a condition, like inside table[ ]. Columns: a list of names.', '行には条件（表[ ] の中と同じ）、列には列名のリスト。', '{行|ぎょう}には {条件|じょうけん}、{列|れつ}には {列|れつ}の {名前|なまえ}の リスト。'),
        T3('loc uses [ ], not ( ).', 'loc は ( ) ではなく [ ] を使う。', 'loc は ( ) では なく [ ] を つかう。')] },
      { type: 'anim', title: T3('Rows first, then columns', '先に行、次に列', '{先|さき}に {行|ぎょう}、つぎに {列|れつ}'), frames: [
        { cap: T3('Before the comma: price > 2000 chooses the rows.', 'カンマの前：price > 2000 で行を選ぶ。', 'カンマの {前|まえ}：price > 2000 で {行|ぎょう}を {選|えら}ぶ。'), code: 'books.loc[books["price"] > 2000, ["title", "price"]]', mark: 'books["price"] > 2000', table: W('price > 2000', ['price']) },
        { cap: T3('The rows that are left.', '残った行。', 'のこった {行|ぎょう}。'), code: 'books.loc[books["price"] > 2000, ["title", "price"]]', mark: 'books["price"] > 2000', table: R('SELECT * FROM books WHERE price > 2000;', { hl: ['title', 'price'], dim: true }) },
        { cap: T3('After the comma: only title and price.', 'カンマの後ろ：title と price だけ。', 'カンマの うしろ：title と price だけ。'), code: 'books.loc[books["price"] > 2000, ["title", "price"]]', mark: '["title", "price"]', res: true, table: R('SELECT id, title, price FROM books WHERE price > 2000;', { hide: ['id'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('>=', '>=（以上）', '>=（いじょう）'), covers: ['ge'], cap: T3('300 pages or more: title and pages.', '300 ページ以上の title と pages。', '300ページ いじょうの title と pages。'), code: 'books.loc[books["pages"] >= 300, ["title", "pages"]]', mark: '>=', res: true, table: R('SELECT id, title, pages FROM books WHERE pages >= 300;', { hide: ['id'] }) },
        { label: T3('<', '<（より小さい）', '<（より {小|ちい}さい）'), covers: ['lt'], cap: T3('Less than 700 yen: title and price.', '700 円より安い本の title と price。', '700{円|えん}より やすい {本|ほん}の title と price。'), code: 'books.loc[books["price"] < 700, ["title", "price"]]', mark: '<', res: true, table: R('SELECT id, title, price FROM books WHERE price < 700;', { hide: ['id'] }) },
        { label: T3('Same result', '同じ結果', 'おなじ {結果|けっか}'), cap: T3('Filter with [ ], then pick columns with [[ ]]: the same table.', '[ ] で絞ってから [[ ]] で列を選んでも、同じ表になる。', '[ ] で しぼってから [[ ]] で {列|れつ}を {選|えら}んでも おなじ。'), code: 'books[books["price"] < 700][["title", "price"]]', mark: '[["title", "price"]]', res: true, table: R('SELECT id, title, price FROM books WHERE price < 700;', { hide: ['id'] }) }
      ] },
      { type: 'mistake', title: T3('No list for the columns', '列がリストになっていない', '{列|れつ}が リストに なっていない'), wrong: 'books.loc[books["price"] > 2000, "title", "price"]', right: 'books.loc[books["price"] > 2000, ["title", "price"]]',
        why: T3('loc takes two parts only: rows, columns. Several columns must be one list [ … ].', 'loc に入るのは「行, 列」の 2 つだけ。列が複数なら 1 つのリスト [ … ] にする。', 'loc に {入|はい}るのは「{行|ぎょう}, {列|れつ}」の 2つだけ。{列|れつ}は リスト [ … ] に する。') },
      { type: 'quiz', q: T3('How many rows and columns?', '何行・何列になる？', '{何行|なんぎょう}・{何列|なんれつ}に なる？'), code: 'books.loc[books["genre"] == "Comic", ["title"]]', mark: '["title"]',
        choices: [T3('4 rows, 1 column', '4 行・1 列', '4{行|ぎょう}・1{列|れつ}'), T3('4 rows, 6 columns', '4 行・6 列', '4{行|ぎょう}・6{列|れつ}'), T3('12 rows, 1 column', '12 行・1 列', '12{行|ぎょう}・1{列|れつ}')], answer: 0,
        why: T3('4 comics (rows), and only title (column).', 'コミックが 4 冊（行）、列は title だけ。', 'コミックが 4{冊|さつ}、{列|れつ}は title だけ。'),
        before: R(ALL), table: R("SELECT id, title FROM books WHERE genre = 'Comic';", { hide: ['id'] }) },
      { type: 'points', items: [
        T3('loc[rows, columns]: a condition, then a list of columns.', 'loc[行, 列]：条件、そして列のリスト。', 'loc[{行|ぎょう}, {列|れつ}]：{条件|じょうけん}、そして {列|れつ}の リスト。'),
        T3('The index of the rows stays the same.', '行の index はそのまま。', '{行|ぎょう}の index は そのまま。'),
        T3('SQL: SELECT title, price FROM books WHERE price > 2000;', 'SQL なら SELECT title, price FROM books WHERE price > 2000;', 'SQL なら SELECT title, price FROM books WHERE price > 2000;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 7. sort ---------- */
  pd_sort: {
    goal: T3('Sort the rows by a column with sort_values.', 'sort_values で行を並べかえる。', 'sort_values で {行|ぎょう}を ならべかえる。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“Line the books up from the cheapest.”', '「安い順に並べて」', '「やすい {順|じゅん}に ならべて」'), table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', code: 'books.sort_values("price", ascending=False)', notes: [
        T3('table.sort_values("col"): smallest first (ascending).', '表.sort_values("列")：小さい順（昇順）。', '{表|ひょう}.sort_values("{列|れつ}")：{小|ちい}さい {順|じゅん}。'),
        T3('Add ascending=False for largest first (descending).', 'ascending=False を付けると大きい順（降順）。', 'ascending=False を つけると {大|おお}きい {順|じゅん}。'),
        T3('Each row keeps its index, so the index is no longer 0, 1, 2 … from the top.', '行は index を持ったまま動くので、上から 0, 1, 2 … ではなくなる。', '{行|ぎょう}は index を もったまま うごく。')] },
      { type: 'anim', title: T3('The rows move', '行が動く', '{行|ぎょう}が うごく'), frames: [
        { cap: T3('The rows as they are.', '元の順番。', 'もとの {順番|じゅんばん}。'), code: 'books', mark: 'books', table: R(ALL, { hl: ['price'] }) },
        { cap: T3('sort_values("price"): cheapest at the top. Watch the index move with each row.', 'sort_values("price")：安いものが上に。index も行といっしょに動く。', 'sort_values("price")：やすいものが {上|うえ}に。index も いっしょに うごく。'), code: 'books.sort_values("price")', mark: 'sort_values("price")', res: true, table: R('SELECT * FROM books ORDER BY price;', { hl: ['price'] }) },
        { cap: T3('ascending=False: the most expensive at the top.', 'ascending=False：高いものが上に。', 'ascending=False：{高|たか}いものが {上|うえ}に。'), code: 'books.sort_values("price", ascending=False)', mark: 'ascending=False', res: true, table: R('SELECT * FROM books ORDER BY price DESC;', { hl: ['price'] }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Small → large', '小さい順', '{小|ちい}さい {順|じゅん}'), covers: ['asc'], cap: T3('By pages, fewest first.', 'pages の少ない順。', 'pages の {少|すく}ない {順|じゅん}。'), code: 'books.sort_values("pages")', mark: '"pages"', res: true, table: R('SELECT * FROM books ORDER BY pages;', { hl: ['pages'] }) },
        { label: T3('Large → small', '大きい順', '{大|おお}きい {順|じゅん}'), covers: ['desc'], cap: T3('By pages, most first.', 'pages の多い順。', 'pages の {多|おお}い {順|じゅん}。'), code: 'books.sort_values("pages", ascending=False)', mark: 'ascending=False', res: true, table: R('SELECT * FROM books ORDER BY pages DESC;', { hl: ['pages'] }) }
      ] },
      { type: 'mistake', title: T3('No " "', '" " がない', '" " が ない'), wrong: 'books.sort_values(price)', right: 'books.sort_values("price")',
        why: T3('The column name is text: without " " it is read as a variable (NameError).', '列名は文字。" " がないと変数だと思われて NameError。', '{列|れつ}の {名前|なまえ}は {文字|もじ}。" " が ないと エラー。') },
      { type: 'mistake', title: T3('desc=True', 'desc=True と書く', 'desc=True と {書|か}く'), wrong: 'books.sort_values("price", desc=True)', right: 'books.sort_values("price", ascending=False)',
        why: T3('SQL says DESC, but pandas says ascending=False (“not ascending”).', 'SQL は DESC だが、pandas は ascending=False（「昇順ではない」）と書く。', 'SQL は DESC だが、pandas は ascending=False と {書|か}く。') },
      { type: 'quiz', q: T3('Which book is at the top?', 'いちばん上に来る本は？', 'いちばん {上|うえ}に くる {本|ほん}は？'), code: 'books.sort_values("pages", ascending=False)', mark: 'ascending=False',
        choices: ['Moonlight Station', 'Robot Kitchen', 'Data and Society'], answer: e => one(e, 'SELECT title FROM books ORDER BY pages DESC LIMIT 1;'),
        why: T3('ascending=False puts the most pages first: Moonlight Station, 410 pages.', 'ascending=False でページの多い順：Moonlight Station（410 ページ）が先頭。', 'ページの {多|おお}い {順|じゅん}：Moonlight Station（410ページ）。'),
        before: R(ALL, { hl: ['pages'] }), table: R('SELECT * FROM books ORDER BY pages DESC;', { hl: ['pages'] }) },
      { type: 'points', items: [
        T3('sort_values("col") small → large; ascending=False large → small.', 'sort_values("列") は小さい順、ascending=False で大きい順。', 'sort_values("{列|れつ}") は {小|ちい}さい {順|じゅん}、ascending=False で {大|おお}きい {順|じゅん}。'),
        T3('The rows keep their index when they move.', '行は index を持ったまま動く。', '{行|ぎょう}は index を もったまま うごく。'),
        T3('SQL: ORDER BY price DESC', 'SQL なら ORDER BY price DESC', 'SQL なら ORDER BY price DESC')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 8. top N ---------- */
  pd_top: {
    goal: T3('Sort, then take the first rows: the top N.', '並べてから最初の行を取る：上位 N 件。', 'ならべてから はじめの {行|ぎょう}を とる：{上位|じょうい} N{件|けん}。'),
    slides: [
      { type: 'scene', who: T3('Bookshop staff', '書店のスタッフ', '{本屋|ほんや}の スタッフ'),
        ask: T3('“Our 3 most expensive books?”', '「いちばん高い本を 3 冊教えて」', '「いちばん {高|たか}い {本|ほん}を 3{冊|さつ} おしえて」'), table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', code: 'books.sort_values("price", ascending=False).head(3)', notes: [
        T3('Join methods with dots: they run from left to right.', 'メソッドを . でつなげる。左から順に実行される。', 'メソッドを . で つなげる。{左|ひだり}から {順|じゅん}に {実行|じっこう}される。'),
        T3('First sort_values, then head(n) on the sorted table.', '先に sort_values、その結果に head(n)。', '{先|さき}に sort_values、その {結果|けっか}に head(n)。')] },
      { type: 'anim', title: T3('Sort, then cut', '並べて、切る', 'ならべて、きる'), frames: [
        { cap: T3('books as it is.', '元の books。', 'もとの books。'), code: 'books', mark: 'books', table: R(ALL, { hl: ['price'] }) },
        { cap: T3('sort_values(…, ascending=False): the most expensive first.', 'sort_values(…, ascending=False)：高い順に。', 'sort_values(…, ascending=False)：{高|たか}い {順|じゅん}に。'), code: 'books.sort_values("price", ascending=False)', mark: 'sort_values("price", ascending=False)', table: R('SELECT * FROM books ORDER BY price DESC;', { hl: ['price'] }) },
        { cap: T3('.head(3): the first 3 rows of the sorted table.', '.head(3)：並べた表の上から 3 行。', '.head(3)：ならべた {表|ひょう}の {上|うえ}から 3{行|ぎょう}。'), code: 'books.sort_values("price", ascending=False).head(3)', mark: '.head(3)',
          table: e => { const st = R('SELECT * FROM books ORDER BY price DESC;', { hl: ['price'] })(e); st.rows.forEach((r, i) => { r.cls = i < 3 ? 'pass' : 'fail'; }); return st; } },
        { cap: T3('The top 3.', '上位 3 冊。', '{上位|じょうい} 3{冊|さつ}。'), code: 'books.sort_values("price", ascending=False).head(3)', mark: '.head(3)', res: true, table: R('SELECT * FROM books ORDER BY price DESC LIMIT 3;', { hl: ['price'], cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Largest', '大きいほうから', '{大|おお}きい ほうから'), covers: ['desc'], cap: T3('The 2 books with the most pages.', 'ページがいちばん多い 2 冊。', 'ページが いちばん {多|おお}い 2{冊|さつ}。'), code: 'books.sort_values("pages", ascending=False).head(2)', mark: 'ascending=False', res: true, table: R('SELECT * FROM books ORDER BY pages DESC LIMIT 2;', { hl: ['pages'] }) },
        { label: T3('Smallest', '小さいほうから', '{小|ちい}さい ほうから'), covers: ['asc'], cap: T3('The 4 cheapest books.', 'いちばん安い 4 冊。', 'いちばん やすい 4{冊|さつ}。'), code: 'books.sort_values("price").head(4)', mark: '.head(4)', res: true, table: R('SELECT * FROM books ORDER BY price LIMIT 4;', { hl: ['price'] }) }
      ] },
      { type: 'mistake', title: T3('Cut, then sort', '先に切ってから並べる', '{先|さき}に きってから ならべる'), wrong: 'books.head(3).sort_values("price", ascending=False)', right: 'books.sort_values("price", ascending=False).head(3)',
        why: T3('The order matters: head(3) first takes the first 3 rows of the list, and only those are sorted.', '順番が大事。先に head(3) すると、元の表の最初の 3 行だけを並べることになる。', '{順番|じゅんばん}が だいじ。{先|さき}に head(3) だと、もとの はじめの 3{行|ぎょう}だけを ならべる。') },
      { type: 'mistake', title: T3('No ascending=False', 'ascending=False がない', 'ascending=False が ない'), wrong: 'books.sort_values("price").head(3)', right: 'books.sort_values("price", ascending=False).head(3)',
        why: T3('Without ascending=False you get the 3 cheapest, not the 3 most expensive.', 'ascending=False がないと、高い 3 冊ではなく安い 3 冊になる。', 'ascending=False が ないと、やすい 3{冊|さつ}に なる。') },
      { type: 'quiz', q: T3('Which book is the 2nd row?', '2 行目に来る本は？', '2{行目|ぎょうめ}に くる {本|ほん}は？'), code: 'books.sort_values("price").head(3)', mark: '.head(3)',
        choices: ['Ninja Cats', 'Space Pirates', 'Sun Warriors'], answer: e => one(e, 'SELECT title FROM books ORDER BY price LIMIT 1 OFFSET 1;'),
        why: T3('Cheapest first: Space Pirates 580, Ninja Cats 620, Sun Warriors 650.', '安い順：Space Pirates 580、Ninja Cats 620、Sun Warriors 650。', 'やすい {順|じゅん}：580、620、650。'),
        before: R(ALL, { hl: ['price'] }), table: R('SELECT * FROM books ORDER BY price LIMIT 3;', { hl: ['price'] }) },
      { type: 'points', items: [
        T3('sort_values(…).head(n): sort first, then cut.', 'sort_values(…).head(n)：並べてから切る。', 'sort_values(…).head(n)：ならべてから きる。'),
        T3('books.nlargest(3, "price") gives the same 3 rows.', 'books.nlargest(3, "price") でも同じ 3 行になる。', 'books.nlargest(3, "price") でも おなじ。'),
        T3('SQL: ORDER BY price DESC LIMIT 3', 'SQL なら ORDER BY price DESC LIMIT 3', 'SQL なら ORDER BY price DESC LIMIT 3')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 9. one value ---------- */
  pd_agg: {
    goal: T3('Sum up a column into one value: mean, sum, max, min.', '列を 1 つの値にまとめる：平均・合計・最大・最小。', '{列|れつ}を 1つの {値|あたい}に まとめる：{平均|へいきん}・{合計|ごうけい}・{最大|さいだい}・{最小|さいしょう}。'),
    slides: [
      { type: 'scene', who: T3('Shop owner', '店長', '{店長|てんちょう}'),
        ask: T3('“What is the average price of our books?”', '「うちの本の平均価格はいくら？」', '「うちの {本|ほん}の {平均|へいきん}の ねだんは？」'), table: R(ALL, { hl: ['price'] }) },
      { type: 'syntax', code: 'books["price"].mean()', notes: [
        T3('books["price"] takes one column; .mean() works out its average.', 'books["price"] で 1 列を取り出し、.mean() で平均を出す。', 'books["price"] で 1{列|れつ}を とりだし、.mean() で {平均|へいきん}。'),
        T3('.sum() total, .max() largest, .min() smallest.', '.sum() 合計、.max() 最大、.min() 最小。', '.sum() {合計|ごうけい}、.max() いちばん {大|おお}きい、.min() いちばん {小|ちい}さい。'),
        T3('The answer is one number, not a table.', '答えは表ではなく、1 つの数。', 'こたえは {表|ひょう}では なく、1つの {数|かず}。')] },
      { type: 'anim', title: T3('A column becomes one number', '列が 1 つの数になる', '{列|れつ}が 1つの {数|かず}に なる'), frames: [
        { cap: T3('books["price"]: the 12 prices.', 'books["price"]：12 冊の値段。', 'books["price"]：12{冊|さつ}の ねだん。'), code: 'books["price"]', mark: '["price"]', table: R('SELECT id, price FROM books;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('.mean(): add them all and divide by 12.', '.mean()：全部足して 12 で割る。', '.mean()：ぜんぶ たして 12 で わる。'), code: 'books["price"].mean()', mark: '.mean()', table: V('SELECT ROUND(AVG(price), 2) FROM books;', 'mean') }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('mean()', 'mean()（平均）', 'mean()（{平均|へいきん}）'), covers: ['mean'], cap: T3('The average number of pages.', 'ページ数の平均。', 'ページ{数|すう}の {平均|へいきん}。'), code: 'books["pages"].mean()', mark: '.mean()', table: V('SELECT ROUND(AVG(pages), 2) FROM books;', 'mean') },
        { label: T3('sum()', 'sum()（合計）', 'sum()（{合計|ごうけい}）'), covers: ['sum'], cap: T3('All the pages added up.', 'ページ数の合計。', 'ページ{数|すう}の {合計|ごうけい}。'), code: 'books["pages"].sum()', mark: '.sum()', table: V('SELECT SUM(pages) FROM books;', 'sum') },
        { label: T3('max()', 'max()（最大）', 'max()（{最大|さいだい}）'), covers: ['max'], cap: T3('The highest price.', 'いちばん高い値段。', 'いちばん {高|たか}い ねだん。'), code: 'books["price"].max()', mark: '.max()', table: V('SELECT MAX(price) FROM books;', 'max') },
        { label: T3('min()', 'min()（最小）', 'min()（{最小|さいしょう}）'), covers: ['min'], cap: T3('The lowest price.', 'いちばん安い値段。', 'いちばん やすい ねだん。'), code: 'books["price"].min()', mark: '.min()', table: V('SELECT MIN(price) FROM books;', 'min') }
      ] },
      { type: 'mistake', title: T3('average()', 'average() と書く', 'average() と {書|か}く'), wrong: 'books["price"].average()', right: 'books["price"].mean()',
        why: T3('The average is mean() in pandas (and AVG in SQL); there is no average().', 'pandas の平均は mean()（SQL では AVG）。average() はない。', 'pandas の {平均|へいきん}は mean()。average() は ない。') },
      { type: 'quiz', q: T3('What is the answer?', '答えはいくつ？', 'こたえは いくつ？'), code: 'books["pages"].max()', mark: '.max()',
        choices: ['350', '410', '3300'], answer: e => one(e, 'SELECT MAX(pages) FROM books;'),
        why: T3('max() gives the largest value in the column: 410 (Moonlight Station).', 'max() は列の中でいちばん大きい値：410（Moonlight Station）。', 'max() は いちばん {大|おお}きい {値|あたい}：410。'),
        before: R('SELECT id, title, pages FROM books;', { hide: ['id'], hl: ['pages'] }), table: V('SELECT MAX(pages) FROM books;', 'max') },
      { type: 'points', items: [
        T3('table["col"].mean() / .sum() / .max() / .min()', '表["列"].mean() / .sum() / .max() / .min()', '{表|ひょう}["{列|れつ}"].mean() / .sum() / .max() / .min()'),
        T3('len(books) is the number of rows (like COUNT(*)).', 'len(books) で行の数（COUNT(*) と同じ）。', 'len(books) で {行|ぎょう}の {数|かず}。'),
        T3('SQL: SELECT AVG(price) FROM books;', 'SQL なら SELECT AVG(price) FROM books;', 'SQL なら SELECT AVG(price) FROM books;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 10. groupby ---------- */
  pd_group: {
    goal: T3('Work out a value for each group with groupby.', 'groupby でグループごとに値を求める。', 'groupby で グループごとに {値|あたい}を {求|もと}める。'),
    slides: [
      { type: 'scene', who: T3('Shop owner', '店長', '{店長|てんちょう}'),
        ask: T3('“What is the average price in each genre?”', '「ジャンルごとの平均価格は？」', '「ジャンルごとの {平均|へいきん}の ねだんは？」'), table: R(ALL, { hl: ['genre', 'price'], cls: v => gc(v[2]) }) },
      { type: 'syntax', code: 'books.groupby("genre")["price"].mean()', notes: [
        T3('groupby("genre"): put the rows with the same genre together.', 'groupby("genre")：同じ genre の行をまとめる。', 'groupby("genre")：おなじ genre の {行|ぎょう}を まとめる。'),
        T3('["price"]: the column to work out.', '["price"]：計算する列。', '["price"]：{計算|けいさん}する {列|れつ}。'),
        T3('.mean() (or .sum(), .max(), .min()): one value for each group.', '.mean()（.sum() .max() .min() も）：グループごとに 1 つの値。', '.mean() など：グループごとに 1つの {値|あたい}。')] },
      { type: 'anim', title: T3('Groups become rows', 'グループが 1 行になる', 'グループが 1{行|ぎょう}に なる'), frames: [
        { cap: T3('Same colour = same genre.', '同じ色＝同じ genre。', 'おなじ {色|いろ}＝おなじ genre。'), code: 'books', mark: 'books', table: R('SELECT id, title, genre, price FROM books;', { hl: ['genre'], cls: v => gc(v[2]) }) },
        { cap: T3('groupby("genre"): the rows gather by genre.', 'groupby("genre")：genre ごとに集まる。', 'groupby("genre")：genre ごとに あつまる。'), code: 'books.groupby("genre")', mark: 'groupby("genre")', table: R('SELECT id, title, genre, price FROM books ORDER BY genre, id;', { hl: ['genre', 'price'], cls: v => gc(v[2]) }) },
        { cap: T3('["price"].mean(): each group becomes one row with its average.', '["price"].mean()：グループごとに 1 行になり、平均が入る。', '["price"].mean()：グループごとに 1{行|ぎょう}に なる。'), code: 'books.groupby("genre")["price"].mean()', mark: '["price"].mean()', res: true,
          table: e => state(e, 'SELECT genre, ROUND(AVG(price), 6) AS price FROM books GROUP BY genre ORDER BY genre;', { cls: v => gc(v[0]) }),
          merge: e => Object.fromEntries(e.exec('SELECT id, genre FROM books;').values.map(([id, g]) => [String(id), g])) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('mean()', 'mean()（平均）', 'mean()（{平均|へいきん}）'), covers: ['mean'], cap: T3('Average pages of each genre.', 'ジャンルごとのページ数の平均。', 'ジャンルごとの ページ{数|すう}の {平均|へいきん}。'), code: 'books.groupby("genre")["pages"].mean()', mark: '.mean()', res: true, table: e => state(e, 'SELECT genre, ROUND(AVG(pages), 6) AS pages FROM books GROUP BY genre ORDER BY genre;', { cls: v => gc(v[0]) }) },
        { label: T3('sum()', 'sum()（合計）', 'sum()（{合計|ごうけい}）'), covers: ['sum'], cap: T3('Total price of each genre.', 'ジャンルごとの値段の合計。', 'ジャンルごとの ねだんの {合計|ごうけい}。'), code: 'books.groupby("genre")["price"].sum()', mark: '.sum()', res: true, table: e => state(e, 'SELECT genre, SUM(price) AS price FROM books GROUP BY genre ORDER BY genre;', { cls: v => gc(v[0]) }) },
        { label: T3('max()', 'max()（最大）', 'max()（{最大|さいだい}）'), covers: ['max'], cap: T3('The highest price in each genre.', 'ジャンルごとのいちばん高い値段。', 'ジャンルごとの いちばん {高|たか}い ねだん。'), code: 'books.groupby("genre")["price"].max()', mark: '.max()', res: true, table: e => state(e, 'SELECT genre, MAX(price) AS price FROM books GROUP BY genre ORDER BY genre;', { cls: v => gc(v[0]) }) },
        { label: T3('min()', 'min()（最小）', 'min()（{最小|さいしょう}）'), covers: ['min'], cap: T3('The fewest pages in each genre.', 'ジャンルごとのいちばん少ないページ数。', 'ジャンルごとの いちばん {少|すく}ない ページ{数|すう}。'), code: 'books.groupby("genre")["pages"].min()', mark: '.min()', res: true, table: e => state(e, 'SELECT genre, MIN(pages) AS pages FROM books GROUP BY genre ORDER BY genre;', { cls: v => gc(v[0]) }) }
      ] },
      { type: 'mistake', title: T3('No calculation', '計算がない', '{計算|けいさん}が ない'), wrong: 'books.groupby("genre")["price"]', right: 'books.groupby("genre")["price"].mean()',
        why: T3('groupby only makes the groups. You see “<SeriesGroupBy …>” until you say what to work out.', 'groupby はグループを作るだけ。何を計算するか書かないと「<SeriesGroupBy …>」と出るだけ。', 'groupby は グループを {作|つく}るだけ。{計算|けいさん}を {書|か}かないと {結果|けっか}が {出|で}ない。') },
      { type: 'quiz', q: T3('How many rows does the result have?', '結果は何行？', '{結果|けっか}は {何行|なんぎょう}？'), code: 'books.groupby("genre")["price"].max()', mark: 'groupby("genre")',
        choices: ['1', '3', '12'], answer: e => one(e, 'SELECT COUNT(DISTINCT genre) FROM books;'),
        why: T3('One row for each genre: Comic, Novel, Science.', 'ジャンルごとに 1 行：Comic、Novel、Science の 3 行。', 'ジャンルごとに 1{行|ぎょう}：3{行|ぎょう}。'),
        before: R('SELECT id, title, genre, price FROM books;', { hl: ['genre'], cls: v => gc(v[2]) }), table: e => state(e, 'SELECT genre, MAX(price) AS price FROM books GROUP BY genre ORDER BY genre;', { cls: v => gc(v[0]) }) },
      { type: 'points', items: [
        T3('table.groupby("group col")["col"].mean()', '表.groupby("まとめる列")["計算する列"].mean()', '{表|ひょう}.groupby("まとめる {列|れつ}")["{計算|けいさん}する {列|れつ}"].mean()'),
        T3('The groups come in alphabetical order, and the group name becomes the index.', 'グループはアルファベット順に並び、グループ名が index になる。', 'グループは ABC {順|じゅん}に ならぶ。'),
        T3('SQL: SELECT genre, AVG(price) FROM books GROUP BY genre;', 'SQL なら SELECT genre, AVG(price) FROM books GROUP BY genre;', 'SQL なら SELECT genre, AVG(price) FROM books GROUP BY genre;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 11. value_counts ---------- */
  pd_count: {
    goal: T3('Count how many rows have each value with value_counts.', 'value_counts で値ごとの行の数を数える。', 'value_counts で {値|あたい}ごとの {行|ぎょう}の {数|かず}を かぞえる。'),
    slides: [
      { type: 'scene', who: T3('Shop owner', '店長', '{店長|てんちょう}'),
        ask: T3('“How many books of each genre do we have?”', '「ジャンルごとに何冊ある？」', '「ジャンルごとに {何冊|なんさつ} ある？」'), table: R(ALL, { hl: ['genre'], cls: v => gc(v[2]) }) },
      { type: 'syntax', code: 'books["genre"].value_counts()', notes: [
        T3('Take one column, then .value_counts().', '1 列を取り出して .value_counts()。', '1{列|れつ}を とりだして .value_counts()。'),
        T3('Every value gets the number of rows it appears in (count).', '値ごとに、出てくる行の数（count）が付く。', '{値|あたい}ごとに、{行|ぎょう}の {数|かず}（count）が つく。'),
        T3('The most common value comes first.', 'いちばん多い値が先頭に来る。', 'いちばん {多|おお}い {値|あたい}が いちばん {上|うえ}。')] },
      { type: 'anim', title: T3('Counting each value', '値ごとに数える', '{値|あたい}ごとに かぞえる'), frames: [
        { cap: T3('books["genre"]: 12 values.', 'books["genre"]：12 個の値。', 'books["genre"]：12{個|こ}の {値|あたい}。'), code: 'books["genre"]', mark: '["genre"]', table: R('SELECT id, genre FROM books;', { hide: ['id'], cls: v => gc(v[1]) }) },
        { cap: T3('The same values gather.', '同じ値が集まる。', 'おなじ {値|あたい}が あつまる。'), code: 'books["genre"].value_counts()', mark: '.value_counts()', table: R('SELECT id, genre FROM books ORDER BY genre, id;', { hide: ['id'], cls: v => gc(v[1]) }) },
        { cap: T3('One row for each value with its count, most first.', '値ごとに 1 行、count が多い順。', '{値|あたい}ごとに 1{行|ぎょう}、{多|おお}い {順|じゅん}。'), code: 'books["genre"].value_counts()', mark: '.value_counts()', res: true,
          table: e => state(e, 'SELECT genre, COUNT(*) AS count FROM books GROUP BY genre ORDER BY count DESC, genre;', { hl: ['count'], cls: v => gc(v[0]) }),
          merge: e => Object.fromEntries(e.exec('SELECT id, genre FROM books;').values.map(([id, g]) => [String(id), g])) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Text', '文字の列', '{文字|もじ}の {列|れつ}'), cap: T3('How many books of each genre.', 'ジャンルごとの冊数。', 'ジャンルごとの {冊数|さっすう}。'), code: 'books["genre"].value_counts()', mark: '["genre"]', res: true, table: e => state(e, 'SELECT genre, COUNT(*) AS count FROM books GROUP BY genre ORDER BY count DESC, genre;', { hl: ['count'] }) },
        { label: T3('Numbers', '数の列', '{数|かず}の {列|れつ}'), cap: T3('It works with numbers too: books per year.', '数の列でも使える：年ごとの冊数。', '{数|かず}の {列|れつ}でも つかえる：{年|とし}ごとの {冊数|さっすう}。'), code: 'books["published_year"].value_counts()', mark: '["published_year"]', res: true, table: e => state(e, 'SELECT published_year, COUNT(*) AS count FROM books GROUP BY published_year ORDER BY count DESC, published_year;', { hl: ['count'] }) },
        { label: T3('Same result', '同じ結果', 'おなじ {結果|けっか}'), cap: T3('groupby(…).size() counts too (in name order).', 'groupby(…).size() でも数えられる（名前の順に並ぶ）。', 'groupby(…).size() でも かぞえられる。'), code: 'books.groupby("genre").size()', mark: '.size()', res: true, table: e => state(e, 'SELECT genre, COUNT(*) AS "0" FROM books GROUP BY genre ORDER BY genre;') }
      ] },
      { type: 'mistake', title: T3('count()', 'count() を使う', 'count() を つかう'), wrong: 'books["genre"].count()', right: 'books["genre"].value_counts()',
        why: T3('count() gives one number: how many values the column has (12), not one for each genre.', 'count() は列にある値の数を 1 つ（12）返すだけ。ジャンルごとには数えない。', 'count() は ぜんぶの {数|かず}（12）だけ。ジャンルごとには かぞえない。') },
      { type: 'quiz', q: T3('Which row comes first?', '先頭に来るのは？', 'いちばん {上|うえ}は？'), code: 'books["genre"].value_counts()', mark: '.value_counts()',
        choices: ['Comic', 'Novel', 'Science'], answer: e => one(e, 'SELECT genre FROM books GROUP BY genre ORDER BY COUNT(*) DESC LIMIT 1;'),
        why: T3('value_counts puts the most common first: Novel (5 books).', 'value_counts は多い順：Novel（5 冊）が先頭。', '{多|おお}い {順|じゅん}：Novel（5{冊|さつ}）。'),
        before: R('SELECT id, title, genre FROM books;', { cls: v => gc(v[2]) }), table: e => state(e, 'SELECT genre, COUNT(*) AS count FROM books GROUP BY genre ORDER BY count DESC, genre;', { hl: ['count'] }) },
      { type: 'points', items: [
        T3('table["col"].value_counts(): rows for each value, most first.', '表["列"].value_counts()：値ごとの行数、多い順。', '{表|ひょう}["{列|れつ}"].value_counts()：{値|あたい}ごとの {数|かず}。'),
        T3('count() is one number for the whole column.', 'count() は列全体で 1 つの数。', 'count() は ぜんぶで 1つの {数|かず}。'),
        T3('SQL: SELECT genre, COUNT(*) FROM books GROUP BY genre;', 'SQL なら SELECT genre, COUNT(*) FROM books GROUP BY genre;', 'SQL なら SELECT genre, COUNT(*) FROM books GROUP BY genre;')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 12. merge ---------- */
  pd_merge: {
    goal: T3('Join two tables on matching values with pd.merge.', 'pd.merge で、値が同じ行どうしを 2 つの表からつなぐ。', 'pd.merge で、{値|あたい}が おなじ {行|ぎょう}どうしを つなぐ。'),
    slides: [
      { type: 'scene', who: T3('Shop owner', '店長', '{店長|てんちょう}'),
        ask: T3('“Who ordered what? Names are in customers, items in orders.”', '「誰が何を注文した？名前は customers、商品は orders にある」', '「だれが {何|なに}を {注文|ちゅうもん}した？」'),
        side: [e => state(e, 'SELECT * FROM customers;', { hl: ['id'] }), e => state(e, 'SELECT * FROM orders;', { hl: ['customer_id'] })] },
      { type: 'syntax', code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', notes: [
        T3('pd.merge(left table, right table, …) makes one table from two.', 'pd.merge(左の表, 右の表, …) で 2 つの表から 1 つの表を作る。', 'pd.merge({左|ひだり}の {表|ひょう}, {右|みぎ}の {表|ひょう}, …) で 1つの {表|ひょう}に する。'),
        T3('left_on = the column of the left table, right_on = the column of the right table.', 'left_on＝左の表の列、right_on＝右の表の列。', 'left_on＝{左|ひだり}の {列|れつ}、right_on＝{右|みぎ}の {列|れつ}。'),
        T3('Rows join where the two values are equal. Rows with no partner are left out.', '2 つの値が同じ行どうしがつながる。相手がいない行は入らない。', 'おなじ {値|あたい}の {行|ぎょう}どうしが つながる。あいてが いない {行|ぎょう}は {入|はい}らない。')] },
      { type: 'anim', title: T3('Matching rows join', '同じ値の行がつながる', 'おなじ {値|あたい}の {行|ぎょう}が つながる'), frames: [
        { cap: T3('customers.id and orders.customer_id hold the same kind of number.', 'customers.id と orders.customer_id には同じ種類の番号が入っている。', 'id と customer_id には おなじ {番号|ばんごう}が {入|はい}っている。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', mark: 'left_on="id", right_on="customer_id"',
          side: [e => state(e, 'SELECT * FROM customers;', { hl: ['id'] }), e => state(e, 'SELECT * FROM orders;', { hl: ['customer_id'] })],
          table: e => checked(e, 'SELECT * FROM customers;', 'id IN (SELECT customer_id FROM orders)', ['id']) },
        { cap: T3('Customers 2, 3 and 5 have an order: those rows join. 1 and 4 (no order) and orders 6, 7 (no customer) are left out.', '注文があるのは 2・3・5 の客：その行どうしがつながる。注文のない 1・4、客のいない注文 6・7 は入らない。', '2・3・5 の {行|ぎょう}が つながる。1・4 と 6・7 は {入|はい}らない。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', mark: 'pd.merge', res: true,
          side: [e => state(e, 'SELECT * FROM customers;', { hl: ['id'] }), e => state(e, 'SELECT * FROM orders;', { hl: ['customer_id'] })],
          table: e => state(e, 'SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c JOIN orders o ON c.id = o.customer_id ORDER BY c.id;', { hl: ['id', 'customer_id'], cls: () => 'pass' }) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('left_on / right_on', 'left_on / right_on', 'left_on / right_on'), cap: T3('The columns have different names: say both.', '列の名前が違うときは、両方を書く。', '{列|れつ}の {名前|なまえ}が ちがう ときは りょうほう {書|か}く。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', mark: 'left_on="id", right_on="customer_id"', res: true,
          table: e => state(e, 'SELECT c.id, c.name, c.city, o.customer_id, o.item, o.amount FROM customers c JOIN orders o ON c.id = o.customer_id ORDER BY c.id;', { hl: ['id', 'customer_id'] }) },
        { label: T3('Then pick columns', '続けて列を選ぶ', 'つづけて {列|れつ}を {選|えら}ぶ'), cap: T3('Add [[ ]] after merge to keep only what you need.', 'merge のあとに [[ ]] を付ければ、必要な列だけにできる。', 'merge の あとに [[ ]] を つければ、いる {列|れつ}だけに できる。'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")[["name", "item"]]', mark: '[["name", "item"]]', res: true,
          table: e => state(e, 'SELECT c.id, c.name, o.item FROM customers c JOIN orders o ON c.id = o.customer_id ORDER BY c.id;', { hide: ['id'] }) }
      ] },
      { type: 'mistake', title: T3('on= with different names', '名前が違うのに on=', '{名前|なまえ}が ちがうのに on='), wrong: 'pd.merge(customers, orders, on="id")', right: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")',
        why: T3('on= needs the same column name in both tables. orders has no id column: KeyError.', 'on= は両方の表に同じ名前の列があるときだけ使える。orders には id がないので KeyError。', 'on= は りょうほうに おなじ {名前|なまえ}の {列|れつ}が ある ときだけ。') },
      { type: 'quiz', q: T3('How many rows does the result have?', '結果は何行？', '{結果|けっか}は {何行|なんぎょう}？'), code: 'pd.merge(customers, orders, left_on="id", right_on="customer_id")', mark: 'pd.merge',
        choices: ['3', '5', '10'], answer: e => one(e, 'SELECT COUNT(*) FROM customers c JOIN orders o ON c.id = o.customer_id;'),
        why: T3('Only the matching pairs: customers 2, 3 and 5.', '値が同じ組だけ：2・3・5 の 3 行。', 'おなじ {値|あたい}の {組|くみ}だけ：3{行|ぎょう}。'),
        side: [e => state(e, 'SELECT * FROM customers;', { hl: ['id'] }), e => state(e, 'SELECT * FROM orders;', { hl: ['customer_id'] })] },
      { type: 'points', items: [
        T3('pd.merge(left, right, left_on="a", right_on="b") joins rows where a equals b.', 'pd.merge(左, 右, left_on="a", right_on="b")：a と b が同じ行どうしをつなぐ。', 'pd.merge({左|ひだり}, {右|みぎ}, left_on="a", right_on="b")。'),
        T3('Rows without a partner are left out (an inner join). how="left" keeps every left row.', '相手のいない行は入らない（内部結合）。how="left" で左の行をすべて残せる。', 'あいての いない {行|ぎょう}は {入|はい}らない。'),
        T3('SQL: FROM customers JOIN orders ON customers.id = orders.customer_id', 'SQL なら FROM customers JOIN orders ON customers.id = orders.customer_id', 'SQL なら JOIN … ON customers.id = orders.customer_id')] },
      { type: 'practice' }
    ]
  }
};

Object.assign(PY_LECTURES, PY_LECTURES_2);   // Lessons 13–21

/** what a Python problem uses, as the topics above (check.mjs: every topic has a case) */
export function pyTopics(key, p) {
  if (key === 'pd_num' || key === 'pd_text' || key === 'pd_loc') return [p.op];
  if (key === 'pd_andor') return [p.and ? 'and' : 'or'];
  if (key === 'pd_sort' || key === 'pd_top') return [p.desc ? 'desc' : 'asc'];
  if (key === 'pd_agg' || key === 'pd_group') return [p.f];
  if (['pd_na', 'pd_newcol', 'pd_str', 'pd_date', 'pd_dup', 'pd_pivot', 'pd_concat', 'pd_how', 'pd_plot'].includes(key)) return [p.v];   // Lessons 13–21: one topic per kind of problem
  return [];
}
