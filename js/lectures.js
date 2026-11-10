/* =========================================================
 * lectures.js — a short lecture for each lesson: slides with
 * step-by-step animations of what the syntax does to a table.
 *
 * A lecture is a list of slides. An animated slide has frames
 * (one click = one frame): each frame is a caption, the SQL with the part
 * being explained marked, and the state of a table. The viewer
 * (lecture-ui.js) moves the rows between frames, so you see rows being
 * kept or removed, sorted, or gathered into groups.
 *
 * Tables are computed from the app's own data (products), never typed.
 * The lessons are rewritten chapter by chapter in the new form (lectures-a.js …):
 * scene → syntax → animation → every pattern the problems use → mistakes → quiz → summary.
 * What a lesson's problems use is listed in lecture-topics.js; check.mjs fails when a
 * lecture does not cover one of them.
 * Text: English, Japanese and Easy Japanese ({漢字|かんじ} = furigana);
 * other languages show English for now.
 * ========================================================= */

import { T3, state } from './lecture-kit.js';
import { LECT_A } from './lectures-a.js';
import { LECT_B } from './lectures-b.js';
import { LECT_C } from './lectures-c.js';

/* ---------- the lectures ---------- */
const OLD = {
  /* ---------- data analysis ---------- */
  an_center: {
    goal: T3('Find the middle of the data: the mean and the median.', 'データの「真ん中」を求める：平均と中央値。', 'データの「まんなか」を {求|もと}める：{平均|へいきん}と {中央値|ちゅうおうち}。'),
    slides: [
      { type: 'syntax', notes: [
        T3('Mean: AVG(column) — add up and divide by the number of rows.', '平均：AVG(列)。全部を足して、行の数で割る。', '{平均|へいきん}：AVG({列|れつ})。ぜんぶ {足|た}して、{行|ぎょう}の {数|かず}で わる。'),
        T3('Median: sort, then take the middle row — ORDER BY … LIMIT 1 OFFSET (n − 1) ÷ 2.', '中央値：並べて、真ん中の行を取る。ORDER BY … LIMIT 1 OFFSET (n − 1) ÷ 2。', '{中央値|ちゅうおうち}：ならべて、まんなかの {行|ぎょう}を とる。ORDER BY … LIMIT 1 OFFSET (n − 1) ÷ 2。'),
        T3('Mode: the value that appears most — GROUP BY it and take the largest COUNT(*).', '最頻値：いちばん多く出てくる値。GROUP BY して COUNT(*) がいちばん大きいもの。', '{最頻値|さいひんち}：いちばん {多|おお}く {出|で}てくる {値|あたい}。GROUP BY して COUNT(*) が いちばん {大|おお}きい もの。')] },
      { type: 'anim', title: T3('How to find the median', '中央値の求め方', '{中央値|ちゅうおうち}の {求|もと}め{方|かた}'), frames: [
        { cap: T3('9 orders (a small part of kumo_orders).', '9 件の注文（kumo_orders の一部）。', '9{件|けん}の {注文|ちゅうもん}（kumo_orders の {一部|いちぶ}）。'), sql: 'SELECT order_id, amount\nFROM kumo_orders\nWHERE order_id <= 9;', mark: 'WHERE order_id <= 9',
          table: e => state(e, 'SELECT order_id, amount FROM kumo_orders WHERE order_id <= 9;') },
        { cap: T3('ORDER BY amount: smallest first.', 'ORDER BY amount：小さい順に並べる。', 'ORDER BY amount：{小|ちい}さい {順|じゅん}に ならべる。'), sql: 'SELECT order_id, amount\nFROM kumo_orders\nWHERE order_id <= 9\nORDER BY amount;', mark: 'ORDER BY amount',
          table: e => state(e, 'SELECT order_id, amount FROM kumo_orders WHERE order_id <= 9 ORDER BY amount, order_id;', { hl: ['amount'] }) },
        { cap: T3('The 5th of 9 rows is the middle: 4 rows below it, 4 above. OFFSET 4 skips the first 4.', '9 行の 5 番目が真ん中：下に 4 行、上に 4 行。OFFSET 4 で最初の 4 行をとばす。', '9{行|ぎょう}の 5{番目|ばんめ}が まんなか：{下|した}に 4{行|ぎょう}、{上|うえ}に 4{行|ぎょう}。OFFSET 4 で {最初|さいしょ}の 4{行|ぎょう}を とばす。'), sql: 'SELECT order_id, amount\nFROM kumo_orders\nWHERE order_id <= 9\nORDER BY amount\nLIMIT 1 OFFSET 4;', mark: 'LIMIT 1 OFFSET 4',
          table: e => { const med = e.exec('SELECT amount FROM kumo_orders WHERE order_id <= 9 ORDER BY amount, order_id LIMIT 1 OFFSET 4;').values[0][0]; return state(e, 'SELECT order_id, amount FROM kumo_orders WHERE order_id <= 9 ORDER BY amount, order_id;', { hl: ['amount'], cls: v => (v[1] === med ? 'pass' : '') }); } },
        { cap: T3('The result: one row — the median. Compare it with the mean (AVG) of the same rows.', '結果：1 行だけ。これが中央値。同じ行の平均（AVG）とも比べてみよう。', '{結果|けっか}：1{行|ぎょう}だけ。これが {中央値|ちゅうおうち}。{平均|へいきん}（AVG）とも くらべよう。'), sql: 'SELECT order_id, amount\nFROM kumo_orders\nWHERE order_id <= 9\nORDER BY amount\nLIMIT 1 OFFSET 4;', mark: 'LIMIT 1 OFFSET 4',
          table: e => state(e, 'SELECT order_id, amount FROM kumo_orders WHERE order_id <= 9 ORDER BY amount, order_id LIMIT 1 OFFSET 4;', { cls: () => 'pass' }) }
      ] },
      { type: 'points', items: [
        T3('A few very large values pull the mean up, but not the median.', 'とても大きな値が少しあると、平均は引っぱられるが、中央値は動かない。', 'とても {大|おお}きな {値|あたい}が {少|すこ}し あると、{平均|へいきん}は ひっぱられるが、{中央値|ちゅうおうち}は {動|うご}かない。'),
        T3('With an even number of rows, the median is the mean of the two middle values (Excel MEDIAN and pandas do this).', '行の数が偶数のときは、真ん中の 2 つの平均が中央値（Excel の MEDIAN や pandas はこうする）。', '{行|ぎょう}の {数|かず}が {偶数|ぐうすう}の ときは、まんなかの 2つの {平均|へいきん}が {中央値|ちゅうおうち}。')] },
      { type: 'mistake', wrong: 'SELECT amount\nFROM kumo_orders\nLIMIT 1 OFFSET 200;', right: 'SELECT amount\nFROM kumo_orders\nORDER BY amount\nLIMIT 1 OFFSET 200;',
        why: T3('Without ORDER BY, the 201st row is just the 201st order, not the middle value.', 'ORDER BY がないと、201 番目の行はただの 201 番目の注文で、真ん中の値ではない。', 'ORDER BY が ないと、201{番目|ばんめ}の {行|ぎょう}は ただの 201{番目|ばんめ}の {注文|ちゅうもん}で、まんなかの {値|あたい}では ない。') },
      { type: 'practice' }
    ]
  },

  an_hist: {
    goal: T3('Count how many values fall in each range (a frequency table).', '値をはばで区切り、それぞれに何個あるか数える（度数分布表）。', '{値|あたい}を はばで くぎり、それぞれに {何個|なんこ} あるか {数|かぞ}える（{度数分布表|どすうぶんぷひょう}）。'),
    slides: [
      { type: 'syntax', notes: [
        T3('FLOOR(1.0 * amount / 2000) * 2000 gives the start of the class of width 2000 (e.g. 4660 → 4000).', 'FLOOR(1.0 * amount / 2000) * 2000 で、幅 2000 の階級の始まりの値になる（4660 → 4000）。', 'FLOOR(1.0 * amount / 2000) * 2000 で、{幅|はば} 2000 の {階級|かいきゅう}の はじまりの {値|あたい}に なる（4660 → 4000）。'),
        T3('Then GROUP BY the class and COUNT(*) the rows.', 'そのあと、階級で GROUP BY して COUNT(*) で数える。', 'そのあと、{階級|かいきゅう}で GROUP BY して COUNT(*) で {数|かぞ}える。')] },
      { type: 'anim', title: T3('From values to a frequency table', '値から度数分布表へ', '{値|あたい}から {度数分布表|どすうぶんぷひょう}へ'), frames: [
        { cap: T3('12 orders and their amounts.', '12 件の注文と金額。', '12{件|けん}の {注文|ちゅうもん}と {金額|きんがく}。'), sql: 'SELECT order_id, amount\nFROM kumo_orders\nWHERE order_id <= 12;', mark: 'amount',
          table: e => state(e, 'SELECT order_id, amount FROM kumo_orders WHERE order_id <= 12;') },
        { cap: T3('Each amount gets the start of its class (bin). Same colour = same class.', 'それぞれの金額に、階級の始まり（bin）を付ける。同じ色＝同じ階級。', 'それぞれの {金額|きんがく}に、{階級|かいきゅう}の はじまり（bin）を つける。{同|おな}じ {色|いろ}＝{同|おな}じ {階級|かいきゅう}。'), sql: 'SELECT order_id, amount,\n  FLOOR(1.0 * amount / 2000) * 2000 AS bin\nFROM kumo_orders\nWHERE order_id <= 12;', mark: 'FLOOR(1.0 * amount / 2000) * 2000 AS bin',
          table: e => state(e, 'SELECT order_id, amount, FLOOR(1.0 * amount / 2000) * 2000 AS bin FROM kumo_orders WHERE order_id <= 12 ORDER BY bin, order_id;', { hl: ['bin'], cls: v => 'g' + Math.min(3, Math.floor(v[2] / 2000) - 1) }) },
        { cap: T3('GROUP BY bin: each class becomes one row, COUNT(*) is how many values it has.', 'GROUP BY bin：階級ごとに 1 行になり、COUNT(*) がその数。', 'GROUP BY bin：{階級|かいきゅう}ごとに 1{行|ぎょう}に なり、COUNT(*) が その {数|かず}。'), sql: 'SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin,\n  COUNT(*) AS n\nFROM kumo_orders\nWHERE order_id <= 12\nGROUP BY bin\nORDER BY bin;', mark: 'GROUP BY bin',
          table: e => state(e, 'SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin, COUNT(*) AS n FROM kumo_orders WHERE order_id <= 12 GROUP BY bin ORDER BY bin;', { cls: v => 'g' + Math.min(3, Math.floor(v[0] / 2000) - 1) }),
          merge: e => Object.fromEntries(e.exec('SELECT order_id, FLOOR(1.0 * amount / 2000) * 2000 FROM kumo_orders WHERE order_id <= 12;').values.map(([id, b]) => [String(id), String(b)])) }
      ] },
      { type: 'points', items: [
        T3('All classes have the same width. Choose it so that you get about 5–15 classes.', 'どの階級も同じ幅にする。階級が 5〜15 個くらいになる幅を選ぶ。', 'どの {階級|かいきゅう}も {同|おな}じ {幅|はば}に する。5〜15{個|こ}くらいに なる {幅|はば}を {選|えら}ぶ。'),
        T3('A histogram draws this table as bars: you see where values are many, and if one side has a long tail.', 'ヒストグラムは、この表を棒で描いたもの。値が多いところや、片側に長くのびたすそが見える。', 'ヒストグラムは、この {表|ひょう}を ぼうで かいた もの。{値|あたい}が {多|おお}い ところや、{長|なが}い すそが {見|み}える。')] },
      { type: 'mistake', wrong: 'SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin, COUNT(*) AS n\nFROM kumo_orders;', right: 'SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin, COUNT(*) AS n\nFROM kumo_orders\nGROUP BY bin\nORDER BY bin;',
        why: T3('Without GROUP BY, COUNT(*) counts all rows into one: there are no classes.', 'GROUP BY がないと、COUNT(*) は全部の行を 1 つに数えてしまい、階級ができない。', 'GROUP BY が ないと、COUNT(*) は ぜんぶの {行|ぎょう}を 1つに {数|かぞ}えて しまう。') },
      { type: 'practice' }
    ]
  },

  an_cross: {
    goal: T3('Count with two things at once, and compare groups in %.', '2 つのことがらで同時に数え、グループを % で比べる。', '2つの ことがらで いっしょに {数|かぞ}え、グループを % で くらべる。'),
    slides: [
      { type: 'syntax', notes: [
        T3('COUNT(column) counts only the rows where the column is filled (not NULL).', 'COUNT(列) は、その列に値が入っている（NULL でない）行だけを数える。', 'COUNT({列|れつ}) は、その {列|れつ}に {値|あたい}が {入|はい}っている {行|ぎょう}だけを {数|かぞ}える。'),
        T3('SUM(CASE WHEN … THEN 1 ELSE 0 END) counts the rows that meet a condition.', 'SUM(CASE WHEN … THEN 1 ELSE 0 END) は、条件に合う行を数える。', 'SUM(CASE WHEN … THEN 1 ELSE 0 END) は、{条件|じょうけん}に あう {行|ぎょう}を {数|かぞ}える。'),
        T3('Share (%) = 100.0 × part ÷ COUNT(*). Write 100.0, not 100.', '割合（%）= 100.0 × 部分 ÷ COUNT(*)。100 ではなく 100.0 と書く。', '{割合|わりあい}（%）= 100.0 × {部分|ぶぶん} ÷ COUNT(*)。100.0 と {書|か}く。')] },
      { type: 'anim', title: T3('Coupon share per store', '店ごとのクーポン利用率', '{店|みせ}ごとの クーポンの {割合|わりあい}'), frames: [
        { cap: T3('12 orders: the store, and the coupon (empty = no coupon).', '12 件の注文：店と、クーポン（空欄＝使っていない）。', '12{件|けん}の {注文|ちゅうもん}：{店|みせ}と、クーポン（{空|から}＝{使|つか}っていない）。'), sql: 'SELECT order_id, store, coupon\nFROM kumo_orders\nWHERE order_id <= 12;', mark: 'store, coupon',
          table: e => state(e, 'SELECT order_id, store, coupon FROM kumo_orders WHERE order_id <= 12;') },
        { cap: T3('CASE WHEN: 1 for an order with a coupon, 0 without. Same colour = same store.', 'CASE WHEN：クーポンありは 1、なしは 0。同じ色＝同じ店。', 'CASE WHEN：クーポン ありは 1、なしは 0。{同|おな}じ {色|いろ}＝{同|おな}じ {店|みせ}。'), sql: 'SELECT order_id, store,\n  CASE WHEN coupon IS NULL THEN 0 ELSE 1 END AS used\nFROM kumo_orders\nWHERE order_id <= 12;', mark: 'CASE WHEN coupon IS NULL THEN 0 ELSE 1 END AS used',
          table: e => state(e, 'SELECT order_id, store, CASE WHEN coupon IS NULL THEN 0 ELSE 1 END AS used FROM kumo_orders WHERE order_id <= 12 ORDER BY store, order_id;', { hl: ['used'], cls: v => 'g' + ['Online', 'Sakae', 'Shibuya', 'Umeda'].indexOf(v[1]) }) },
        { cap: T3('GROUP BY store: COUNT(*) orders, SUM(used) with a coupon, and the share in %.', 'GROUP BY store：COUNT(*) が注文数、SUM(used) がクーポンあり、割合は %。', 'GROUP BY store：COUNT(*) が {注文|ちゅうもん}の {数|かず}、SUM(used) が クーポン あり、{割合|わりあい}は %。'), sql: 'SELECT store, COUNT(*) AS n,\n  SUM(CASE WHEN coupon IS NULL THEN 0 ELSE 1 END) AS used,\n  ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct\nFROM kumo_orders\nWHERE order_id <= 12\nGROUP BY store;', mark: 'GROUP BY store',
          table: e => state(e, 'SELECT store, COUNT(*) AS n, SUM(CASE WHEN coupon IS NULL THEN 0 ELSE 1 END) AS used, ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct FROM kumo_orders WHERE order_id <= 12 GROUP BY store ORDER BY store;', { hl: ['pct'], cls: v => 'g' + ['Online', 'Sakae', 'Shibuya', 'Umeda'].indexOf(v[0]) }),
          merge: e => Object.fromEntries(e.exec('SELECT order_id, store FROM kumo_orders WHERE order_id <= 12;').values.map(([id, s2]) => [String(id), s2])) }
      ] },
      { type: 'points', items: [
        T3('Compare the %, not the counts: a big store has more of everything.', '数ではなく % で比べる。大きな店は何でも数が多い。', '{数|かず}では なく % で くらべる。{大|おお}きな {店|みせ}は なんでも {数|かず}が {多|おお}い。'),
        T3('A store with very few rows can have an extreme % by chance: look at n too.', '行がとても少ない店は、たまたま極端な % になることがある。n も見る。', '{行|ぎょう}が とても {少|すく}ない {店|みせ}は、たまたま % が かたよる ことが ある。n も {見|み}る。')] },
      { type: 'mistake', wrong: 'SELECT store, ROUND(100 * COUNT(coupon) / COUNT(*), 1) AS pct\nFROM kumo_orders\nGROUP BY store;', right: 'SELECT store, ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct\nFROM kumo_orders\nGROUP BY store;',
        why: T3('100 × count ÷ count is integer division: the decimals are cut off. 100.0 makes it a decimal division.', '100 × 数 ÷ 数 は整数どうしの割り算になり、小数が切り捨てられる。100.0 にすると小数で計算される。', '100 × {数|かず} ÷ {数|かず} は {整数|せいすう}の わり{算|ざん}に なり、{小数|しょうすう}が きえる。100.0 に すると {小数|しょうすう}で {計算|けいさん}される。') },
      { type: 'practice' }
    ]
  },

  an_trend: {
    goal: T3('Add up month by month, and compare each month with the one before.', '月ごとに集計し、前の月と比べる。', '{月|つき}ごとに {集計|しゅうけい}し、{前|まえ}の {月|つき}と くらべる。'),
    slides: [
      { type: 'syntax', notes: [
        T3("strftime('%Y-%m', date) turns 2025-03-14 into 2025-03.", "strftime('%Y-%m', 日付) は 2025-03-14 を 2025-03 にする。", "strftime('%Y-%m', {日付|ひづけ}) は 2025-03-14 を 2025-03 に する。"),
        T3('LAG(x) OVER (ORDER BY month) is the value of the row before.', 'LAG(x) OVER (ORDER BY month) は、1 つ前の行の値。', 'LAG(x) OVER (ORDER BY month) は、1つ {前|まえ}の {行|ぎょう}の {値|あたい}。'),
        T3('AVG(x) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) is a 3-month moving average.', 'AVG(x) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) は 3 か月移動平均。', 'AVG(x) OVER (… ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) は 3か{月|げつ} {移動平均|いどうへいきん}。')] },
      { type: 'anim', title: T3('Month by month', '月ごとに見る', '{月|つき}ごとに {見|み}る'), frames: [
        { cap: T3('Some orders from different months. strftime gives each its month.', 'いろいろな月の注文。strftime でそれぞれの月が分かる。', 'いろいろな {月|つき}の {注文|ちゅうもん}。strftime で {月|つき}が わかる。'), sql: "SELECT order_id, order_date,\n  strftime('%Y-%m', order_date) AS month, amount\nFROM kumo_orders;", mark: "strftime('%Y-%m', order_date) AS month",
          table: e => state(e, "SELECT order_id, order_date, strftime('%Y-%m', order_date) AS month, amount FROM kumo_orders WHERE order_id % 40 = 1;", { hl: ['month'] }) },
        { cap: T3('GROUP BY month: one row per month with the total.', 'GROUP BY month：月ごとに 1 行、合計が出る。', 'GROUP BY month：{月|つき}ごとに 1{行|ぎょう}、{合計|ごうけい}が {出|で}る。'), sql: "SELECT strftime('%Y-%m', order_date) AS month,\n  SUM(amount) AS total\nFROM kumo_orders\nGROUP BY month;", mark: 'GROUP BY month',
          table: e => state(e, "SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total FROM kumo_orders GROUP BY month ORDER BY month;"),
          merge: e => Object.fromEntries(e.exec("SELECT order_id, strftime('%Y-%m', order_date) FROM kumo_orders WHERE order_id % 40 = 1;").values.map(([id, m]) => [String(id), m])) },
        { cap: T3('LAG(total) brings down last month’s total; diff = this month − last month.', 'LAG(total) で先月の合計を横に持ってくる。diff = 今月 − 先月。', 'LAG(total) で {先月|せんげつ}の {合計|ごうけい}を {横|よこ}に もってくる。diff = {今月|こんげつ} − {先月|せんげつ}。'), sql: "SELECT month, total,\n  LAG(total) OVER (ORDER BY month) AS prev,\n  total - LAG(total) OVER (ORDER BY month) AS diff\nFROM (SELECT strftime('%Y-%m', order_date) AS month,\n    SUM(amount) AS total\n  FROM kumo_orders GROUP BY month);", mark: 'LAG(total) OVER (ORDER BY month) AS prev',
          table: e => state(e, "SELECT month, total, LAG(total) OVER (ORDER BY month) AS prev, total - LAG(total) OVER (ORDER BY month) AS diff FROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total FROM kumo_orders GROUP BY month) ORDER BY month;", { hl: ['prev', 'diff'] }) },
        { cap: T3('A 3-month moving average smooths the ups and downs.', '3 か月移動平均で、上がり下がりがならされる。', '3か{月|げつ} {移動平均|いどうへいきん}で、{上|あ}がり{下|さ}がりが ならされる。'), sql: "SELECT month, total,\n  ROUND(AVG(total) OVER (ORDER BY month\n    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS ma3\nFROM (SELECT strftime('%Y-%m', order_date) AS month,\n    SUM(amount) AS total\n  FROM kumo_orders GROUP BY month);", mark: 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW',
          table: e => state(e, "SELECT month, total, ROUND(AVG(total) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS ma3 FROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total FROM kumo_orders GROUP BY month) ORDER BY month;", { hl: ['ma3'] }) }
      ] },
      { type: 'points', items: [
        T3('Window functions (… OVER) do not join rows into one: every row stays and gets a new column.', 'ウィンドウ関数（… OVER）は行をまとめない。行はそのままで、新しい列が付く。', 'ウィンドウ{関数|かんすう}（… OVER）は {行|ぎょう}を まとめない。{行|ぎょう}は そのままで、{新|あたら}しい {列|れつ}が つく。'),
        T3('The first month has no month before it, so LAG gives NULL.', '最初の月には前の月がないので、LAG は NULL になる。', '{最初|さいしょ}の {月|つき}には {前|まえ}の {月|つき}が ないので、LAG は NULL。')] },
      { type: 'mistake', wrong: "SELECT month, total - LAG(total) AS diff\nFROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total FROM kumo_orders GROUP BY month);", right: "SELECT month, total - LAG(total) OVER (ORDER BY month) AS diff\nFROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total FROM kumo_orders GROUP BY month);",
        why: T3('LAG needs OVER (ORDER BY …): without an order, “the row before” has no meaning.', 'LAG には OVER (ORDER BY …) が必要。順番がないと「前の行」が決まらない。', 'LAG には OVER (ORDER BY …) が {必要|ひつよう}。{順番|じゅんばん}が ないと「{前|まえ}の {行|ぎょう}」が きまらない。') },
      { type: 'practice' }
    ]
  },

  an_compare: {
    goal: T3('Find the first in each group with ROW_NUMBER.', 'ROW_NUMBER で、グループごとの 1 位を見つける。', 'ROW_NUMBER で、グループごとの 1{位|い}を {見|み}つける。'),
    slides: [
      { type: 'syntax', notes: [
        T3('ROW_NUMBER() OVER (PARTITION BY group ORDER BY x DESC) numbers the rows 1, 2, 3 … inside each group.', 'ROW_NUMBER() OVER (PARTITION BY グループ ORDER BY x DESC) は、グループの中で行に 1, 2, 3 … と番号を付ける。', 'ROW_NUMBER() OVER (PARTITION BY グループ ORDER BY x DESC) は、グループの {中|なか}で 1, 2, 3 … と {番号|ばんごう}を つける。'),
        T3('Put it in a subquery, then keep WHERE rn = 1.', 'それを ( ) の中に入れて、外側で WHERE rn = 1 を残す。', 'それを ( ) の {中|なか}に {入|い}れて、{外側|そとがわ}で WHERE rn = 1 を のこす。')] },
      { type: 'anim', title: T3('The largest order of each store', '店ごとのいちばん大きな注文', '{店|みせ}ごとの いちばん {大|おお}きな {注文|ちゅうもん}'), frames: [
        { cap: T3('12 orders, by store.', '12 件の注文を店ごとに。', '12{件|けん}の {注文|ちゅうもん}を {店|みせ}ごとに。'), sql: 'SELECT store, order_id, amount\nFROM kumo_orders\nWHERE order_id <= 12;', mark: 'store, order_id, amount',
          table: e => state(e, 'SELECT order_id, store, amount FROM kumo_orders WHERE order_id <= 12 ORDER BY store, order_id;', { cls: v => 'g' + ['Online', 'Sakae', 'Shibuya', 'Umeda'].indexOf(v[1]) }) },
        { cap: T3('ROW_NUMBER: inside each store, 1 = the largest amount.', 'ROW_NUMBER：店の中で、金額がいちばん大きい行が 1。', 'ROW_NUMBER：{店|みせ}の {中|なか}で、{金額|きんがく}が いちばん {大|おお}きい {行|ぎょう}が 1。'), sql: 'SELECT store, order_id, amount,\n  ROW_NUMBER() OVER (PARTITION BY store\n    ORDER BY amount DESC) AS rn\nFROM kumo_orders\nWHERE order_id <= 12;', mark: 'PARTITION BY store',
          table: e => state(e, 'SELECT order_id, store, amount, ROW_NUMBER() OVER (PARTITION BY store ORDER BY amount DESC) AS rn FROM kumo_orders WHERE order_id <= 12 ORDER BY store, rn;', { hl: ['rn'], cls: v => 'g' + ['Online', 'Sakae', 'Shibuya', 'Umeda'].indexOf(v[1]) }) },
        { cap: T3('WHERE rn = 1: one row per store is left.', 'WHERE rn = 1：店ごとに 1 行だけ残る。', 'WHERE rn = 1：{店|みせ}ごとに 1{行|ぎょう}だけ のこる。'), sql: 'SELECT store, order_id, amount\nFROM (SELECT store, order_id, amount,\n    ROW_NUMBER() OVER (PARTITION BY store\n      ORDER BY amount DESC) AS rn\n  FROM kumo_orders WHERE order_id <= 12)\nWHERE rn = 1;', mark: 'WHERE rn = 1',
          table: e => state(e, 'SELECT order_id, store, amount, rn FROM (SELECT order_id, store, amount, ROW_NUMBER() OVER (PARTITION BY store ORDER BY amount DESC) AS rn FROM kumo_orders WHERE order_id <= 12) WHERE rn = 1 ORDER BY store;', { cls: v => 'g' + ['Online', 'Sakae', 'Shibuya', 'Umeda'].indexOf(v[1]) }) }
      ] },
      { type: 'points', items: [
        T3('PARTITION BY = “start counting again for each group”.', 'PARTITION BY は「グループごとに数え直す」という意味。', 'PARTITION BY は「グループごとに {数|かぞ}えなおす」と いう いみ。'),
        T3('rn <= 3 gives the top 3 of each group.', 'rn <= 3 にすれば、各グループの上位 3 つ。', 'rn <= 3 に すれば、グループごとの {上位|じょうい} 3つ。')] },
      { type: 'mistake', wrong: 'SELECT store, order_id, amount\nFROM kumo_orders\nWHERE ROW_NUMBER() OVER (PARTITION BY store ORDER BY amount DESC) = 1;', right: 'SELECT store, order_id, amount\nFROM (SELECT store, order_id, amount, ROW_NUMBER() OVER (PARTITION BY store ORDER BY amount DESC) AS rn FROM kumo_orders)\nWHERE rn = 1;',
        why: T3('Window functions cannot be used in WHERE: WHERE runs before them. Number the rows in a subquery first.', 'ウィンドウ関数は WHERE の中では使えない（WHERE のほうが先に動く）。先に ( ) の中で番号を付ける。', 'ウィンドウ{関数|かんすう}は WHERE の {中|なか}では {使|つか}えない。{先|さき}に ( ) の {中|なか}で {番号|ばんごう}を つける。') },
      { type: 'practice' }
    ]
  },

  an_clean: {
    goal: T3('Make values that mean the same thing look the same, then count.', '同じ意味の値を同じ書き方にそろえてから数える。', '{同|おな}じ いみの {値|あたい}を {同|おな}じ {書|か}き{方|かた}に そろえてから {数|かぞ}える。'),
    slides: [
      { type: 'syntax', notes: [
        T3('TRIM(x) removes the spaces at both ends.', 'TRIM(x) は前後の空白を消す。', 'TRIM(x) は {前後|ぜんご}の {空白|くうはく}を {消|け}す。'),
        T3('LOWER(x) makes every letter small (UPPER makes them capital).', 'LOWER(x) は文字を小文字にする（UPPER は大文字）。', 'LOWER(x) は {文字|もじ}を {小文字|こもじ}に する（UPPER は {大文字|おおもじ}）。'),
        T3("COALESCE(x, '(none)') shows '(none)' when x is NULL.", "COALESCE(x, '(none)') は x が NULL のとき '(none)' にする。", "COALESCE(x, '(none)') は x が NULL の とき '(none)' に する。")] },
      { type: 'anim', title: T3('Tidying a hand-typed column', '手入力の列を整える', '{手|て}で {入力|にゅうりょく}した {列|れつ}を ととのえる'), frames: [
        { cap: T3('pref was typed by hand (␣ = a space): the same place is written in several ways.', 'pref は手入力（␣ は空白）。同じ場所がいろいろな書き方になっている。', 'pref は {手|て}で {入力|にゅうりょく}（␣ は {空白|くうはく}）。{同|おな}じ {場所|ばしょ}が いろいろな {書|か}き{方|かた}。'), sql: 'SELECT customer_id, pref\nFROM kumo_accounts;', mark: 'pref',
          table: e => state(e, "SELECT customer_id, REPLACE(pref, ' ', '␣') AS pref FROM kumo_accounts WHERE customer_id <= 'C012';") },
        { cap: T3('LOWER(TRIM(pref)): the same place now looks the same.', 'LOWER(TRIM(pref))：同じ場所が同じ書き方になる。', 'LOWER(TRIM(pref))：{同|おな}じ {場所|ばしょ}が {同|おな}じ {書|か}き{方|かた}に なる。'), sql: 'SELECT customer_id, pref,\n  LOWER(TRIM(pref)) AS pref_clean\nFROM kumo_accounts;', mark: 'LOWER(TRIM(pref)) AS pref_clean',
          table: e => state(e, "SELECT customer_id, REPLACE(pref, ' ', '␣') AS pref, LOWER(TRIM(pref)) AS pref_clean FROM kumo_accounts WHERE customer_id <= 'C012' ORDER BY pref_clean, customer_id;", { hl: ['pref_clean'], cls: v => 'g' + (['aichi', 'kanagawa', 'osaka', 'saitama', 'tokyo'].indexOf(v[2]) % 4) }) },
        { cap: T3('GROUP BY pref_clean: now the count is right.', 'GROUP BY pref_clean：これで正しく数えられる。', 'GROUP BY pref_clean：これで {正|ただ}しく {数|かぞ}えられる。'), sql: 'SELECT LOWER(TRIM(pref)) AS pref_clean,\n  COUNT(*) AS n\nFROM kumo_accounts\nGROUP BY pref_clean;', mark: 'GROUP BY pref_clean',
          table: e => state(e, "SELECT LOWER(TRIM(pref)) AS pref_clean, COUNT(*) AS n FROM kumo_accounts WHERE customer_id <= 'C012' GROUP BY pref_clean ORDER BY pref_clean;", { cls: v => 'g' + (['aichi', 'kanagawa', 'osaka', 'saitama', 'tokyo'].indexOf(v[0]) % 4) }),
          merge: e => Object.fromEntries(e.exec("SELECT customer_id, LOWER(TRIM(pref)) FROM kumo_accounts WHERE customer_id <= 'C012';").values.map(([id, p2]) => [id, p2])) }
      ] },
      { type: 'points', items: [
        T3('Always look at the different values first (GROUP BY the column) before you count.', '数える前に、まずその列にどんな値があるかを見る（GROUP BY で一覧にする）。', '{数|かぞ}える {前|まえ}に、まず どんな {値|あたい}が あるか {見|み}る。'),
        T3('Keep the original column, and make a new clean one.', '元の列は残し、整えた新しい列を作る。', 'もとの {列|れつ}は のこし、ととのえた {新|あたら}しい {列|れつ}を {作|つく}る。')] },
      { type: 'mistake', wrong: 'SELECT pref, COUNT(*) AS n\nFROM kumo_accounts\nGROUP BY pref;', right: 'SELECT LOWER(TRIM(pref)) AS pref_clean, COUNT(*) AS n\nFROM kumo_accounts\nGROUP BY pref_clean;',
        why: T3("Grouping the raw column counts ' tokyo' and 'Tokyo' as different places.", "元のままの列でまとめると、' tokyo' と 'Tokyo' が別の場所として数えられる。", "もとの {列|れつ}で まとめると、' tokyo' と 'Tokyo' が べつの {場所|ばしょ}に なる。") },
      { type: 'practice' }
    ]
  }
};
/** every lecture: the new ones (lectures-a.js …) replace the old ones of the same lesson */
export const LECTURES = Object.assign({}, OLD, LECT_A, LECT_B, LECT_C);
export const hasLecture = key => !!LECTURES[key];
/** text of a lecture in a language (English, Japanese, Easy Japanese; others read English) */
export const ltext = (x, lang) => (x ? x[lang] || x.en : '');
