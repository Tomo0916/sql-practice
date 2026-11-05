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
 * Text: English, Japanese and Easy Japanese ({漢字|かんじ} = furigana);
 * other languages show English for now.
 * ========================================================= */

const T3 = (en, ja, easy) => ({ en, ja, easy });

/* ---------- table states from SQL ---------- */
/** rows of a SELECT as {k, cells}; the key is the first column unless keyCol says which */
function state(engine, sql, opts = {}) {
  const r = engine.exec(sql);
  const ki = opts.keyCol ? r.columns.indexOf(opts.keyCol) : 0;
  const hide = new Set((opts.hide || []).map(c => r.columns.indexOf(c)));
  return {
    cols: r.columns.filter((_, i) => !hide.has(i)),
    hl: opts.hl || [],
    dim: !!opts.dim,   // columns that are not highlighted are greyed out
    rows: r.values.map(v => ({ k: String(v[ki]), cells: v.filter((_, i) => !hide.has(i)), cls: opts.cls ? opts.cls(v, r.columns) : '' }))
  };
}
const col = (cols, name) => cols.indexOf(name);

/* ---------- the lectures ---------- */
export const LECTURES = {
  select: {
    goal: T3('Take out only the columns you need.', '表から、必要な列だけを取り出す。', '{表|ひょう}から、ひつような {列|れつ}だけを {取|と}り{出|だ}す。'),
    slides: [
      { type: 'syntax', notes: [
        T3('SELECT: the columns you want, separated by commas.', 'SELECT のあとに、取り出したい列をカンマで区切って書く。', 'SELECT の あとに、{取|と}り{出|だ}したい {列|れつ}を カンマで くぎって {書|か}く。'),
        T3('FROM: the table they come from.', 'FROM のあとに、どの表から取り出すかを書く。', 'FROM の あとに、どの {表|ひょう}から {取|と}り{出|だ}すかを {書|か}く。'),
        T3('* means every column.', '* は「すべての列」という意味。', '* は「ぜんぶの {列|れつ}」という いみ。')] },
      { type: 'anim', title: T3('What SELECT does', 'SELECT がすること', 'SELECT が すること'), frames: [
        { cap: T3('The products table: 6 columns, 10 rows.', 'products テーブル。列が 6 つ、行が 10 行ある。', 'products テーブル。{列|れつ}が 6つ、{行|ぎょう}が 10{行|ぎょう} ある。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products',
          table: e => state(e, 'SELECT * FROM products;') },
        { cap: T3('SELECT name, price: these two columns are chosen.', 'SELECT name, price：この 2 つの列を選ぶ。', 'SELECT name, price：この 2つの {列|れつ}を えらぶ。'), sql: 'SELECT name, price\nFROM products;', mark: 'name, price',
          table: e => state(e, 'SELECT * FROM products;', { hl: ['name', 'price'], dim: true }) },
        { cap: T3('The result: only those columns, every row.', '結果：選んだ列だけ。行は全部残る。', '{結果|けっか}：えらんだ {列|れつ}だけ。{行|ぎょう}は ぜんぶ のこる。'), sql: 'SELECT name, price\nFROM products;', mark: 'name, price',
          table: e => state(e, 'SELECT id, name, price FROM products;', { hide: ['id'] }) }
      ] },
      { type: 'points', items: [
        T3('The order of the columns in SELECT is the order in the result.', 'SELECT に書いた順番が、結果の列の順番になる。', 'SELECT に {書|か}いた じゅんばんが、{結果|けっか}の {列|れつ}の じゅんばんに なる。'),
        T3('SELECT chooses columns; it never removes rows.', 'SELECT は列を選ぶだけ。行は減らない。', 'SELECT は {列|れつ}を えらぶだけ。{行|ぎょう}は へらない。')] },
      { type: 'mistake', wrong: 'SELECT name price\nFROM products;', right: 'SELECT name, price\nFROM products;',
        why: T3('Without the comma, “price” becomes a new name for the name column (an alias).', 'カンマを忘れると、price が name 列の別名（AS）になってしまう。', 'カンマを わすれると、price が name {列|れつ}の べつの {名前|なまえ}に なって しまう。') },
      { type: 'practice' }
    ]
  },

  where: {
    goal: T3('Keep only the rows that match a condition.', '条件に合う行だけを残す。', '{条件|じょうけん}に あう {行|ぎょう}だけを のこす。'),
    slides: [
      { type: 'syntax', notes: [
        T3('WHERE comes after FROM and keeps only the rows where the condition is true.', 'WHERE は FROM のあとに書く。条件が「正しい」行だけが残る。', 'WHERE は FROM の あとに {書|か}く。{条件|じょうけん}が「ただしい」{行|ぎょう}だけが のこる。'),
        T3('Comparisons: =  <>  >  >=  <  <=', '比べる記号：=（等しい）<>（等しくない）>　>=　<　<=', 'くらべる {記号|きごう}：=（おなじ）<>（ちがう）>　>=　<　<='),
        T3('Text goes in single quotes: category = \'Books\'', '文字は \' \' で囲む：category = \'Books\'', '{文字|もじ}は \' \' で かこむ：category = \'Books\'')] },
      { type: 'anim', title: T3('What WHERE does', 'WHERE がすること', 'WHERE が すること'), frames: [
        { cap: T3('Start from every row of products.', 'まず、products の全部の行から始まる。', 'まず、products の ぜんぶの {行|ぎょう}から はじまる。'), sql: 'SELECT *\nFROM products;', mark: 'FROM products',
          table: e => state(e, 'SELECT id, name, category, price FROM products;') },
        { cap: T3('WHERE price >= 4000: each row is checked, one by one.', 'WHERE price >= 4000：1 行ずつ、条件に合うか確かめる。', 'WHERE price >= 4000：1{行|ぎょう}ずつ、{条件|じょうけん}に あうか たしかめる。'), sql: 'SELECT *\nFROM products\nWHERE price >= 4000;', mark: 'WHERE price >= 4000',
          table: e => state(e, 'SELECT id, name, category, price FROM products;', { hl: ['price'], cls: (v, c) => (v[col(c, 'price')] >= 4000 ? 'pass' : 'fail') }) },
        { cap: T3('Rows that do not match are removed.', '合わない行は消える。', 'あわない {行|ぎょう}は きえる。'), sql: 'SELECT *\nFROM products\nWHERE price >= 4000;', mark: 'WHERE price >= 4000',
          table: e => state(e, 'SELECT id, name, category, price FROM products WHERE price >= 4000;', { hl: ['price'], cls: () => 'pass' }) },
        { cap: T3('Then SELECT chooses the columns.', 'そのあと SELECT で列を選ぶ。', 'その あと SELECT で {列|れつ}を えらぶ。'), sql: 'SELECT name, price\nFROM products\nWHERE price >= 4000;', mark: 'name, price',
          table: e => state(e, 'SELECT id, name, price FROM products WHERE price >= 4000;', { hide: ['id'] }) }
      ] },
      { type: 'points', items: [
        T3('The database runs FROM → WHERE → SELECT: rows first, then columns.', 'データベースは FROM → WHERE → SELECT の順に動く。先に行を絞り、あとで列を選ぶ。', 'データベースは FROM → WHERE → SELECT の じゅんに うごく。さきに {行|ぎょう}を しぼり、あとで {列|れつ}を えらぶ。'),
        T3('>= includes the value itself; > does not.', '>= はその値をふくむ。> はふくまない。', '>= は その {値|あたい}を ふくむ。> は ふくまない。')] },
      { type: 'mistake', wrong: "SELECT name\nFROM products\nWHERE category = Books;", right: "SELECT name\nFROM products\nWHERE category = 'Books';",
        why: T3('Without quotes, Books is read as a column name (an error).', '\' \' がないと、Books が列の名前だと思われてエラーになる。', '\' \' が ないと、Books が {列|れつ}の {名前|なまえ}だと おもわれて エラーに なる。') },
      { type: 'practice' }
    ]
  },

  orderby: {
    goal: T3('Sort the rows by a column.', '列の値で、行を並べかえる。', '{列|れつ}の {値|あたい}で、{行|ぎょう}を ならべかえる。'),
    slides: [
      { type: 'syntax', notes: [
        T3('ORDER BY is written at the end.', 'ORDER BY は最後に書く。', 'ORDER BY は さいごに {書|か}く。'),
        T3('ASC = small to large (the default). DESC = large to small.', 'ASC は小さい順（書かなくても同じ）。DESC は大きい順。', 'ASC は {小|ちい}さい じゅん（{書|か}かなくても おなじ）。DESC は {大|おお}きい じゅん。')] },
      { type: 'anim', title: T3('What ORDER BY does', 'ORDER BY がすること', 'ORDER BY が すること'), frames: [
        { cap: T3('The rows come in the order they are stored.', '行は、保存されている順に出てくる。', '{行|ぎょう}は、ほぞん されている じゅんに {出|で}てくる。'), sql: 'SELECT name, price\nFROM products;', mark: 'FROM products',
          table: e => state(e, 'SELECT id, name, price FROM products;', { hide: ['id'] }) },
        { cap: T3('ORDER BY price DESC: sort by price, largest first.', 'ORDER BY price DESC：price の大きい順に並べる。', 'ORDER BY price DESC：price の {大|おお}きい じゅんに ならべる。'), sql: 'SELECT name, price\nFROM products\nORDER BY price DESC;', mark: 'ORDER BY price DESC',
          table: e => state(e, 'SELECT id, name, price FROM products ORDER BY price DESC;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('ASC turns it round: smallest first.', 'ASC にすると逆になる：小さい順。', 'ASC に すると ぎゃくに なる：{小|ちい}さい じゅん。'), sql: 'SELECT name, price\nFROM products\nORDER BY price ASC;', mark: 'ORDER BY price ASC',
          table: e => state(e, 'SELECT id, name, price FROM products ORDER BY price ASC;', { hide: ['id'], hl: ['price'] }) }
      ] },
      { type: 'points', items: [
        T3('Without ORDER BY the order of the rows is not guaranteed.', 'ORDER BY がないとき、行の順番は決まっていない。', 'ORDER BY が ない とき、{行|ぎょう}の じゅんばんは きまって いない。'),
        T3('Text is sorted A → Z with ASC.', '文字は ASC で A → Z の順。', '{文字|もじ}は ASC で A → Z の じゅん。')] },
      { type: 'mistake', wrong: 'SELECT name, price\nORDER BY price DESC\nFROM products;', right: 'SELECT name, price\nFROM products\nORDER BY price DESC;',
        why: T3('ORDER BY must come after FROM (and after WHERE).', 'ORDER BY は FROM（と WHERE）のあとに書く。', 'ORDER BY は FROM（と WHERE）の あとに {書|か}く。') },
      { type: 'practice' }
    ]
  },

  groupby: {
    goal: T3('Make groups of rows and calculate per group.', '行をグループに分けて、グループごとに集計する。', '{行|ぎょう}を グループに わけて、グループごとに {集計|しゅうけい}する。'),
    slides: [
      { type: 'syntax', notes: [
        T3('GROUP BY: rows with the same value become one group.', 'GROUP BY：同じ値の行が 1 つのグループになる。', 'GROUP BY：おなじ {値|あたい}の {行|ぎょう}が 1つの グループに なる。'),
        T3('COUNT, SUM, AVG, MAX, MIN are calculated for each group.', 'COUNT・SUM・AVG・MAX・MIN は、グループごとに計算される。', 'COUNT・SUM・AVG・MAX・MIN は、グループごとに {計算|けいさん}される。')] },
      { type: 'anim', title: T3('What GROUP BY does', 'GROUP BY がすること', 'GROUP BY が すること'), frames: [
        { cap: T3('Every product has a category.', 'どの商品にも category がある。', 'どの しょうひんにも category が ある。'), sql: 'SELECT name, category, price\nFROM products;', mark: 'category',
          table: e => state(e, 'SELECT id, name, category, price FROM products;', { hide: ['id'] }) },
        { cap: T3('GROUP BY category: the same category goes together.', 'GROUP BY category：同じ category の行が集まる。', 'GROUP BY category：おなじ category の {行|ぎょう}が あつまる。'), sql: 'SELECT category\nFROM products\nGROUP BY category;', mark: 'GROUP BY category',
          table: e => state(e, 'SELECT id, name, category, price FROM products ORDER BY category, id;', { hide: ['id'], hl: ['category'], cls: (v, c) => 'g' + ['Books', 'Clothing', 'Electronics', 'Kitchen'].indexOf(v[col(c, 'category')]) }) },
        { cap: T3('Each group becomes one row; COUNT(*) counts its rows, AVG(price) averages them.', 'グループは 1 行になる。COUNT(*) は行の数、AVG(price) は平均。', 'グループは 1{行|ぎょう}に なる。COUNT(*) は {行|ぎょう}の {数|かず}、AVG(price) は へいきん。'), sql: 'SELECT category, COUNT(*), AVG(price)\nFROM products\nGROUP BY category;', mark: 'COUNT(*), AVG(price)',
          table: e => state(e, 'SELECT category, COUNT(*), ROUND(AVG(price)) AS "AVG(price)" FROM products GROUP BY category ORDER BY category;', { cls: (v) => 'g' + ['Books', 'Clothing', 'Electronics', 'Kitchen'].indexOf(v[0]) }),
          merge: e => Object.fromEntries(e.exec('SELECT id, category FROM products;').values.map(([id, c]) => [String(id), c])) }
      ] },
      { type: 'points', items: [
        T3('In SELECT you can write the GROUP BY column and aggregates (COUNT, SUM …).', 'SELECT に書けるのは、GROUP BY の列と、集計（COUNT・SUM など）。', 'SELECT に {書|か}けるのは、GROUP BY の {列|れつ}と、{集計|しゅうけい}（COUNT・SUM など）。'),
        T3('You get one row per group.', '結果は、グループの数だけの行になる。', '{結果|けっか}は、グループの {数|かず}だけの {行|ぎょう}に なる。')] },
      { type: 'mistake', wrong: 'SELECT category, name, COUNT(*)\nFROM products\nGROUP BY category;', right: 'SELECT category, COUNT(*)\nFROM products\nGROUP BY category;',
        why: T3('name is not grouped: which name should a group show? Most databases give an error.', 'name はグループにしていないので、どの name を出すか決まらない。多くのデータベースではエラー。', 'name は グループに して いないので、どの name を {出|だ}すか きまらない。おおくの データベースでは エラー。') },
      { type: 'practice' }
    ]
  }
};
export const hasLecture = key => !!LECTURES[key];
/** text of a lecture in a language (English, Japanese, Easy Japanese; others read English) */
export const ltext = (x, lang) => (x ? x[lang] || x.en : '');
