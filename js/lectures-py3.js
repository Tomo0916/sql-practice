/* =========================================================
 * lectures-py3.js — lectures for the Python course, Lessons 22–28 (statistics):
 * summary statistics, correlation and z-scores, confidence intervals, t-tests,
 * the chi-square test, simple and multiple regression.
 * Every number is worked out from the data with pystats.js, and check.mjs runs
 * the code with pandas / scipy / statsmodels (frames with `res` must show the same).
 * ========================================================= */
import { T3, state } from './lecture-kit.js';
import { scatterChart } from './charts.js';
import * as S from './pystats.js';

const ix = st => { st.rows.forEach(r => { if (/^\d+$/.test(r.k)) r.idx = String(+r.k - 1); }); return st; };
const R = (sql, o) => e => Object.assign(ix(state(e, sql, o)), { sig: true });
/** the numbers of one column */
const col = (e, sql) => e.exec(sql).values.map(r => r[0]);
const price = e => col(e, 'SELECT price FROM books ORDER BY id;');
const pages = e => col(e, 'SELECT pages FROM books ORDER BY id;');
const year = e => col(e, 'SELECT published_year FROM books ORDER BY id;');
const genre = (e, g, c = 'price') => col(e, `SELECT ${c} FROM books WHERE genre = '${g}' ORDER BY id;`);
/** a table of named numbers (one row per name) */
const NT = (cols, rows, hl) => ({ cols, hl: hl || cols.slice(1), dim: false, sig: true, rows: rows.map((r, i) => ({ k: 'r' + i, cells: r, cls: '' })) });
/** one value, shown as a one-cell table */
const V1 = (name, v) => NT([name], [[v]], [name]);
const BK = R('SELECT id, title, genre, price, pages, published_year FROM books;', { hl: ['price'] });
/** the cross table genre × (price ≥ 2000), as pandas' crosstab */
const cross = e => e.exec("SELECT genre, SUM(price < 2000), SUM(price >= 2000) FROM books GROUP BY genre ORDER BY genre;").values;
const CROSS = "tab = pd.crosstab(books[\"genre\"], books[\"price\"] >= 2000)";
const ANALYST = T3('Data analyst', 'データ分析の担当', 'データ ぶんせきの たんとう');
const MANAGER = T3('Shop owner', '店長', '{店長|てんちょう}');

export const PY_LECTURES_3 = {
  /* ---------- 22. summary statistics ---------- */
  pd_desc: {
    goal: T3('Sum up a column in a few numbers.', '列を少ない数でまとめて表す。', '{列|れつ}を すくない {数|かず}で まとめる。'),
    slides: [
      { type: 'scene', who: MANAGER, ask: T3('“What are our prices like? Cheap, expensive, spread out?”', '「うちの本の値段ってどんな感じ？ 安い？ 高い？ ばらばら？」', '「ねだんは どんな かんじ？」'), table: BK },
      { type: 'syntax', code: 'books["price"].describe()', notes: [
        T3('describe(): count, mean, std, min, 25%, 50%, 75%, max at once.', 'describe()：件数・平均・標準偏差・最小・25%・50%・75%・最大を一度に。', 'describe() で まとめて でる。'),
        T3('50% is the median: half the values are below it.', '50% は中央値：半分の値がそれより下。', '50% は ちゅうおうち。'),
        T3('std() and var() divide by n − 1 (a sample).', 'std()・var() は n − 1 で割る（標本の式）。', 'n − 1 で わる。')] },
      { type: 'anim', title: T3('Many numbers → a few numbers', 'たくさんの数 → いくつかの数', 'たくさんの {数|かず} → いくつかの {数|かず}'), frames: [
        { cap: T3('12 prices.', '12 冊の値段。', '12さつの ねだん。'), code: 'books["price"]', mark: '"price"', res: true, table: R('SELECT id, price FROM books;', { hide: ['id'], hl: ['price'] }) },
        { cap: T3('describe() sums them up.', 'describe() でまとめる。', 'describe() で まとめる。'), code: 'books["price"].describe()', mark: '.describe()', res: true,
          table: e => { const p = price(e); return NT(['index', 'price'], [['count', p.length], ['mean', S.mean(p)], ['std', S.sd(p)], ['min', Math.min(...p)], ['25%', S.quantile(p, 0.25)], ['50%', S.quantile(p, 0.5)], ['75%', S.quantile(p, 0.75)], ['max', Math.max(...p)]], ['price']); } }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('describe', 'describe', 'describe'), covers: ['describe'], cap: T3('pages, summed up.', 'pages をまとめて。', 'pages を まとめて。'), code: 'books["pages"].describe()', mark: '.describe()', res: true,
          table: e => { const p = pages(e); return NT(['index', 'pages'], [['count', p.length], ['mean', S.mean(p)], ['std', S.sd(p)], ['min', Math.min(...p)], ['25%', S.quantile(p, 0.25)], ['50%', S.quantile(p, 0.5)], ['75%', S.quantile(p, 0.75)], ['max', Math.max(...p)]], ['pages']); } },
        { label: T3('median', '中央値', 'ちゅうおうち'), covers: ['median'], cap: T3('The middle value when sorted.', '並べたときの真ん中の値。', 'ならべた ときの まんなか。'), code: 'books["price"].median()', mark: '.median()', res: true, table: e => V1('value', S.quantile(price(e), 0.5)) },
        { label: T3('quantile', '分位点', 'ぶんいてん'), covers: ['quantile'], cap: T3('quantile(0.9): 90% of the values are below it.', 'quantile(0.9)：値の 90% がそれより下。', '90% が それより した。'), code: 'books["price"].quantile(0.9)', mark: '.quantile(0.9)', res: true, table: e => V1('value', S.quantile(price(e), 0.9)) },
        { label: T3('std', '標準偏差', 'ひょうじゅんへんさ'), covers: ['std'], cap: T3('How far the values are from the mean, on average.', '平均からどのくらい離れているか。', 'へいきんから どのくらい はなれて いるか。'), code: 'books["price"].std()', mark: '.std()', res: true, table: e => V1('value', S.sd(price(e))) },
        { label: T3('var', '分散', 'ぶんさん'), covers: ['var'], cap: T3('The variance is the std squared.', '分散は標準偏差の 2 乗。', 'ぶんさんは ひょうじゅんへんさの 2じょう。'), code: 'books["price"].var()', mark: '.var()', res: true, table: e => V1('value', S.variance(price(e))) }
      ] },
      { type: 'mistake', title: T3('describe on the whole table', '表全体に describe', '{表|ひょう} ぜんたいに describe'), wrong: 'books.describe()', right: 'books["price"].describe()',
        why: T3('Without ["price"], every number column (id too) is summed up. Choose the column first.', '["price"] がないと、id を含むすべての数の列がまとめられる。先に列を選ぶ。', 'さきに {列|れつ}を えらぶ。') },
      { type: 'quiz', q: T3('Which number in describe() is the median?', 'describe() のどれが中央値？', 'どれが ちゅうおうち？'), code: 'books["price"].describe()', mark: '.describe()',
        choices: ['50%', 'mean', 'std'], answer: 0, why: T3('The median is the 50% point: half below, half above.', '中央値は 50% の点：半分が下、半分が上。', '50% の てん。'), before: R('SELECT id, title, price FROM books ORDER BY price;', { hide: ['id'], hl: ['price'] }) },
      { type: 'points', items: [
        T3('describe() for the overview; median(), quantile(q), std(), var() for one number.', '全体は describe()、1 つの数は median()・quantile(q)・std()・var()。', 'describe()・median()・std()'),
        T3('The mean is pulled by very big values; the median is not.', '平均はとても大きな値に引っぱられるが、中央値は引っぱられにくい。', 'へいきんは ひっぱられる。')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 23. correlation, z-scores, shares ---------- */
  pd_rel: {
    goal: T3('See how two columns move together, and put values on one scale.', '2 つの列の関係を見て、値を同じ物差しにそろえる。', '2つの {列|れつ}の かんけいを みる。'),
    slides: [
      { type: 'scene', who: ANALYST, ask: T3('“Do thicker books cost more?”', '「ページ数が多い本ほど高い？」', '「あつい {本|ほん}ほど たかい？」'), table: R('SELECT id, title, price, pages FROM books;', { hl: ['price', 'pages'] }) },
      { type: 'syntax', code: 'books["price"].corr(books["pages"])', notes: [
        T3('The correlation is between −1 and 1: near 1 = up together, near −1 = one up, one down, near 0 = no straight-line relation.', '相関係数は −1〜1：1 に近い＝一緒に増える、−1 に近い＝片方が増えると減る、0 に近い＝直線の関係がない。', '−1〜1 の {数|かず}。'),
        T3('z-score = (value − mean) ÷ std: how many std from the mean.', 'z 得点 = (値 − 平均) ÷ 標準偏差：平均から標準偏差いくつ分か。', 'z = (あたい − へいきん) ÷ ひょうじゅんへんさ'),
        T3('value_counts(normalize=True): shares that add up to 1.', 'value_counts(normalize=True)：合計 1 になる割合。', 'わりあい。')] },
      { type: 'anim', title: T3('Dots that go up', '右上がりの点', 'みぎあがりの てん'), frames: [
        { cap: T3('One dot per book: pages across, price up.', '本ごとに 1 つの点：横が pages、縦が price。', '{本|ほん}ごとに 1つの てん。'), code: 'books[["pages", "price"]]', mark: '"pages", "price"', res: true, table: R('SELECT id, pages, price FROM books;', { hide: ['id'] }),
          chart: e => scatterChart(e.exec('SELECT pages, price, title FROM books;').values.map(v => ({ x: v[0], y: v[1], label: v[2] }))) },
        { cap: T3('The correlation sums it up in one number.', '相関係数で 1 つの数にまとめる。', '1つの {数|かず}に まとめる。'), code: 'books["pages"].corr(books["price"])', mark: '.corr(', res: true, table: e => V1('value', S.corr(pages(e), price(e))) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Correlation', '相関係数', 'そうかんけいすう'), covers: ['corr'], cap: T3('price and published_year.', 'price と published_year。', 'price と published_year。'), code: 'books["price"].corr(books["published_year"])', mark: '.corr(', res: true, table: e => V1('value', S.corr(price(e), year(e))) },
        { label: T3('Matrix', '相関行列', 'そうかんぎょうれつ'), covers: ['matrix'], cap: T3('Every pair at once; the diagonal is 1.', 'すべての組み合わせを一度に。対角は 1。', 'ぜんぶの くみあわせ。'), code: 'books[["price", "pages", "published_year"]].corr()', mark: '.corr()', res: true,
          table: e => { const c = { price: price(e), pages: pages(e), published_year: year(e) }, k = Object.keys(c); return NT(['index', ...k], k.map(a => [a, ...k.map(b => S.corr(c[a], c[b]))])); } },
        { label: T3('z-score', 'z 得点', 'z とくてん'), covers: ['z'], cap: T3('0 = average, +1 = one std above.', '0＝平均、+1＝標準偏差 1 つ分上。', '0＝へいきん。'), code: 'books["z"] = (books["price"] - books["price"].mean()) / books["price"].std()\nbooks[["title", "price", "z"]]', mark: '(books["price"] - books["price"].mean()) / books["price"].std()', res: true,
          table: e => { const p = price(e), m = S.mean(p), s = S.sd(p), t = col(e, 'SELECT title FROM books ORDER BY id;'); return NT(['title', 'price', 'z'], t.map((x, i) => [x, p[i], (p[i] - m) / s]), ['z']); } },
        { label: T3('Shares', '構成比', 'こうせいひ'), covers: ['share'], cap: T3('5 of 12 are Novel: 0.4167 …', '12 冊のうち 5 冊が Novel：0.4167…', '5 ÷ 12'), code: 'books["genre"].value_counts(normalize=True)', mark: 'normalize=True', res: true,
          table: e => NT(['genre', 'proportion'], e.exec('SELECT genre, COUNT(*) FROM books GROUP BY genre ORDER BY COUNT(*) DESC;').values.map(v => [v[0], v[1] / 12])) }
      ] },
      { type: 'mistake', title: T3('corr with a list', 'corr に列名だけを渡す', 'corr に なまえだけ'), wrong: 'books["price"].corr("pages")', right: 'books["price"].corr(books["pages"])',
        why: T3('corr needs the other column itself, not its name (an error).', 'corr に渡すのは列そのもの。列名の文字だけではエラー。', '{列|れつ}そのものを わたす。') },
      { type: 'quiz', q: T3('Thicker books are …', 'ページ数が多い本は…', 'あつい {本|ほん}は…'), code: 'books["pages"].corr(books["price"])', mark: '.corr(',
        choices: [T3('usually more expensive', 'たいてい高い', 'たいてい たかい'), T3('usually cheaper', 'たいてい安い', 'たいてい やすい'), T3('no relation', '関係がない', 'かんけいが ない')],
        answer: e => { const r = S.corr(pages(e), price(e)); return r > 0.3 ? 'usually more expensive' : r < -0.3 ? 'usually cheaper' : 'no relation'; },
        why: T3('The correlation is about 0.8: strongly positive.', '相関係数は約 0.8：強い正の相関。', 'やく 0.8。'), table: e => V1('value', S.corr(pages(e), price(e))) },
      { type: 'points', items: [
        T3('a.corr(b) for two columns, table[[…]].corr() for all pairs.', '2 列は a.corr(b)、まとめては 表[[…]].corr()。', 'a.corr(b)'),
        T3('A correlation is not a cause.', '相関があっても、原因とは限らない。', 'そうかん ≠ げんいん'),
        T3('z-scores put different columns on one scale.', 'z 得点で、単位の違う列も同じ物差しで比べられる。', 'z で そろえる。')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 24. confidence intervals ---------- */
  st_ci: {
    goal: T3('Say how sure we are about a mean from a sample.', '標本の平均が、どのくらい確かかを示す。', 'へいきんが どのくらい たしかか。'),
    slides: [
      { type: 'scene', who: ANALYST, ask: T3('“These 12 books are a sample. What is the average price of all such books, probably?”', '「この 12 冊は一部（標本）。同じような本全体の平均価格は、たぶんどのくらい？」', '「ぜんたいの へいきんは どのくらい？」'), table: BK },
      { type: 'syntax', code: 'from scipy import stats\nm, se = books["price"].mean(), books["price"].sem()\nlow, high = stats.t.interval(0.95, df=len(books) - 1, loc=m, scale=se)\nlow', notes: [
        T3('sem() = std ÷ √n: how much the mean would move between samples.', 'sem() = 標準偏差 ÷ √n：標本が変わると平均がどれだけ動くか。', 'sem() = ひょうじゅんへんさ ÷ √n'),
        T3('stats.t.interval gives the low and high ends of the interval.', 'stats.t.interval が区間の下限と上限を返す。', 'したと うえを かえす。'),
        T3('95%: made this way, 95 of 100 intervals contain the true mean.', '95%：この作り方なら 100 回中 95 回は本当の平均を含む。', '100かい ちゅう 95かい。')] },
      { type: 'anim', title: T3('From the mean to an interval', '平均から区間へ', 'へいきんから くかんへ'), frames: [
        { cap: T3('The mean of the sample.', '標本の平均。', 'ひょうほんの へいきん。'), code: 'books["price"].mean()', mark: '.mean()', res: true, table: e => V1('value', S.mean(price(e))) },
        { cap: T3('Its standard error.', 'その標準誤差。', 'ひょうじゅんごさ。'), code: 'books["price"].sem()', mark: '.sem()', res: true, table: e => V1('value', S.sem(price(e))) },
        { cap: T3('The 95% interval: mean ± t × sem.', '95% 区間：平均 ± t × 標準誤差。', 'へいきん ± t × sem'), code: 'from scipy import stats\nm, se = books["price"].mean(), books["price"].sem()\nlow, high = stats.t.interval(0.95, df=len(books) - 1, loc=m, scale=se)\nhigh', mark: 'stats.t.interval(0.95', res: true, table: e => V1('value', S.tInterval(price(e), 0.95)[1]) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('sem', 'sem', 'sem'), covers: ['sem'], cap: T3('The standard error of pages.', 'pages の標準誤差。', 'pages の sem。'), code: 'books["pages"].sem()', mark: '.sem()', res: true, table: e => V1('value', S.sem(pages(e))) },
        { label: T3('Low end', '下限', 'したの はし'), covers: ['low'], cap: T3('90% interval, low end.', '90% 区間の下限。', '90% の した。'), code: 'from scipy import stats\nm, se = books["pages"].mean(), books["pages"].sem()\nlow, high = stats.t.interval(0.9, df=len(books) - 1, loc=m, scale=se)\nlow', mark: 'low', res: true, table: e => V1('value', S.tInterval(pages(e), 0.9)[0]) },
        { label: T3('High end', '上限', 'うえの はし'), covers: ['high'], cap: T3('99% interval, high end.', '99% 区間の上限。', '99% の うえ。'), code: 'from scipy import stats\nm, se = books["pages"].mean(), books["pages"].sem()\nlow, high = stats.t.interval(0.99, df=len(books) - 1, loc=m, scale=se)\nhigh', mark: 'high', res: true, table: e => V1('value', S.tInterval(pages(e), 0.99)[1]) },
        { label: T3('Width', '幅', 'はば'), covers: ['width'], cap: T3('The surer (99%), the wider.', '確かさを上げる（99%）ほど幅が広い。', '99% ほど ひろい。'), code: 'from scipy import stats\nm, se = books["pages"].mean(), books["pages"].sem()\nlow, high = stats.t.interval(0.99, df=len(books) - 1, loc=m, scale=se)\nhigh - low', mark: 'high - low', res: true, table: e => { const [a, b] = S.tInterval(pages(e), 0.99); return V1('value', b - a); } }
      ] },
      { type: 'mistake', title: T3('std instead of sem', 'sem の代わりに std', 'sem で なく std'), wrong: 'from scipy import stats\nm, sd = books["price"].mean(), books["price"].std()\nlow, high = stats.t.interval(0.95, df=len(books) - 1, loc=m, scale=sd)\nlow', right: 'from scipy import stats\nm, se = books["price"].mean(), books["price"].sem()\nlow, high = stats.t.interval(0.95, df=len(books) - 1, loc=m, scale=se)\nlow',
        why: T3('The spread of single books (std) is not the spread of the mean (sem). The interval becomes far too wide.', '1 冊ずつのばらつき（std）は平均のぶれ（sem）ではない。区間が広くなりすぎる。', 'std では ひろすぎる。') },
      { type: 'quiz', q: T3('With more books (bigger n), the interval gets …', '本の数（n）が増えると、区間は…', 'n が ふえると…'), code: 'books["price"].sem()', mark: '.sem()',
        choices: [T3('narrower', 'せまくなる', 'せまく なる'), T3('wider', '広くなる', 'ひろく なる'), T3('the same', '変わらない', 'かわらない')], answer: 0,
        why: T3('sem = std ÷ √n: a bigger n makes it smaller.', 'sem = 標準偏差 ÷ √n なので、n が大きいほど小さい。', 'n が おおきいほど ちいさい。'), table: e => V1('value', S.sem(price(e))) },
      { type: 'points', items: [
        T3('sem() = std ÷ √n.', 'sem() = 標準偏差 ÷ √n。', 'sem()'),
        T3('stats.t.interval(level, df=n − 1, loc=mean, scale=sem) → (low, high).', 'stats.t.interval(水準, df=n − 1, loc=平均, scale=sem) → (下限, 上限)。', 'stats.t.interval'),
        T3('Higher level → wider; more data → narrower.', '水準を上げると広く、データが増えるとせまく。', '99% → ひろい')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 25. t-tests ---------- */
  st_ttest: {
    goal: T3('Check whether a difference of means is more than chance.', '平均の差が偶然以上かを確かめる。', 'へいきんの さは ぐうぜん？'),
    slides: [
      { type: 'scene', who: MANAGER, ask: T3('“Are science books really more expensive than novels, or is it luck?”', '「理科の本は小説より本当に高い？ たまたま？」', '「ほんとうに たかい？」'), table: R("SELECT id, title, genre, price FROM books WHERE genre IN ('Novel', 'Science');", { hl: ['genre', 'price'] }) },
      { type: 'syntax', code: 'from scipy import stats\na = books[books["genre"] == "Novel"]["price"]\nb = books[books["genre"] == "Science"]["price"]\nstats.ttest_ind(a, b).pvalue', notes: [
        T3('The p-value: how likely a difference this big is if there were really no difference.', 'p 値：本当は差がないとしたら、これだけの差が出る確率。', 'さが ないとしたら でる かくりつ。'),
        T3('p < 0.05 → “significant”: we say there is a difference.', 'p < 0.05 なら「有意」：差があると判断する。', 'p < 0.05 なら さが ある。'),
        T3('equal_var=False (Welch) when the spreads may differ; ttest_1samp compares one mean with a number.', 'ばらつきが違うかもしれないなら equal_var=False（Welch）。ttest_1samp は 1 つの平均と数を比べる。', 'Welch・ttest_1samp')] },
      { type: 'anim', title: T3('Two groups, one p-value', '2 つのグループ、1 つの p 値', '2つの グループ'), frames: [
        { cap: T3('The two means.', '2 つの平均。', '2つの へいきん。'), code: 'books.groupby("genre")["price"].mean()', mark: '.mean()', res: true, table: e => NT(['genre', 'price'], e.exec('SELECT genre, AVG(price) FROM books GROUP BY genre ORDER BY genre;').values) },
        { cap: T3('The t-test turns the difference into a p-value.', 't 検定で差を p 値にする。', 'p ちに する。'), code: 'from scipy import stats\na = books[books["genre"] == "Novel"]["price"]\nb = books[books["genre"] == "Science"]["price"]\nstats.ttest_ind(a, b).pvalue', mark: 'stats.ttest_ind(a, b)', res: true, table: e => V1('value', S.ttestInd(genre(e, 'Novel'), genre(e, 'Science')).pvalue) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Two groups', '2 グループ', '2グループ'), covers: ['ind'], cap: T3('Novel and Comic, pages.', 'Novel と Comic の pages。', 'Novel と Comic。'), code: 'from scipy import stats\na = books[books["genre"] == "Novel"]["pages"]\nb = books[books["genre"] == "Comic"]["pages"]\nstats.ttest_ind(a, b).pvalue', mark: 'ttest_ind', res: true, table: e => V1('value', S.ttestInd(genre(e, 'Novel', 'pages'), genre(e, 'Comic', 'pages')).pvalue) },
        { label: T3('Welch', 'Welch', 'Welch'), covers: ['welch'], cap: T3('equal_var=False: does not assume the same spread.', 'equal_var=False：ばらつきが同じとは考えない。', 'equal_var=False'), code: 'from scipy import stats\na = books[books["genre"] == "Novel"]["pages"]\nb = books[books["genre"] == "Comic"]["pages"]\nstats.ttest_ind(a, b, equal_var=False).pvalue', mark: 'equal_var=False', res: true, table: e => V1('value', S.ttestInd(genre(e, 'Novel', 'pages'), genre(e, 'Comic', 'pages'), false).pvalue) },
        { label: T3('One sample', '1 標本', '1ひょうほん'), covers: ['one'], cap: T3('Is the mean price different from 1500?', '平均価格は 1500 と違う？', '1500 と ちがう？'), code: 'from scipy import stats\nstats.ttest_1samp(books["price"], 1500).pvalue', mark: 'ttest_1samp', res: true, table: e => V1('value', S.ttest1(price(e), 1500).pvalue) },
        { label: T3('Significant?', '有意？', 'ゆうい？'), covers: ['sig'], cap: T3('< 0.05 gives True or False.', '< 0.05 で True / False。', 'True / False'), code: 'from scipy import stats\na = books[books["genre"] == "Novel"]["price"]\nb = books[books["genre"] == "Science"]["price"]\nstats.ttest_ind(a, b).pvalue < 0.05', mark: '< 0.05', res: true, table: e => V1('value', S.ttestInd(genre(e, 'Novel'), genre(e, 'Science')).pvalue < 0.05) }
      ] },
      { type: 'mistake', title: T3('The whole result instead of .pvalue', '.pvalue を付けない', '.pvalue を つけない'), wrong: 'from scipy import stats\na = books[books["genre"] == "Novel"]["price"]\nb = books[books["genre"] == "Science"]["price"]\nstats.ttest_ind(a, b).statistic', right: 'from scipy import stats\na = books[books["genre"] == "Novel"]["price"]\nb = books[books["genre"] == "Science"]["price"]\nstats.ttest_ind(a, b).pvalue',
        why: T3('.statistic is the t value, not the p-value. Compare .pvalue with 0.05.', '.statistic は t 値で、p 値ではない。0.05 と比べるのは .pvalue。', '.pvalue を くらべる。') },
      { type: 'quiz', q: T3('Is the difference significant at 0.05?', '0.05 で有意？', 'ゆうい？'), code: 'from scipy import stats\na = books[books["genre"] == "Novel"]["pages"]\nb = books[books["genre"] == "Comic"]["pages"]\nstats.ttest_ind(a, b).pvalue', mark: '.pvalue',
        choices: ['True', 'False'], answer: e => String(S.ttestInd(genre(e, 'Novel', 'pages'), genre(e, 'Comic', 'pages')).pvalue < 0.05 ? 'True' : 'False'),
        why: T3('Look at the p-value: below 0.05 means significant.', 'p 値が 0.05 より小さければ有意。', '0.05 より ちいさければ ゆうい。'), table: e => V1('value', S.ttestInd(genre(e, 'Novel', 'pages'), genre(e, 'Comic', 'pages')).pvalue) },
      { type: 'points', items: [
        T3('stats.ttest_ind(a, b).pvalue: two groups; ttest_1samp(x, number): one group and a number.', '2 グループは ttest_ind、1 グループと数は ttest_1samp。', 'ttest_ind・ttest_1samp'),
        T3('p < 0.05 → significant. A big p does not prove “no difference”.', 'p < 0.05 なら有意。p が大きくても「差がない」証明ではない。', 'p < 0.05'),
        T3('With few rows, even real differences can come out non-significant.', 'データが少ないと、本当の差でも有意にならないことがある。', 'すくないと でにくい。')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 26. chi-square ---------- */
  st_chi2: {
    goal: T3('Check whether two ways of grouping are related.', '2 つの分け方に関係があるかを確かめる。', '2つの わけかたの かんけい。'),
    slides: [
      { type: 'scene', who: ANALYST, ask: T3('“Is being expensive (2000 or more) related to the genre?”', '「高い（2000 以上）かどうかは、ジャンルと関係がある？」', '「ジャンルと かんけい ある？」'), table: R('SELECT id, title, genre, price FROM books;', { hl: ['genre', 'price'] }) },
      { type: 'syntax', code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).pvalue`, notes: [
        T3('First a cross table with pd.crosstab.', 'まず pd.crosstab でクロス集計表。', 'まず crosstab。'),
        T3('chi2_contingency compares it with the counts we would expect if there were no relation.', 'chi2_contingency は「関係がなければこうなるはず」の数と比べる。', 'かんけいが なければ…'),
        T3('.pvalue, .statistic (the chi-square value), .dof (degrees of freedom = (rows − 1) × (columns − 1)).', '.pvalue・.statistic（カイ二乗値）・.dof（自由度＝(行−1)×(列−1)）。', '.pvalue・.statistic・.dof')] },
      { type: 'anim', title: T3('Observed and expected', '実際の数と、期待される数', 'じっさいと きたい'), frames: [
        { cap: T3('The cross table (observed).', 'クロス集計表（実際の数）。', 'じっさいの {数|かず}。'), code: `${CROSS}\ntab`, mark: 'pd.crosstab', res: true, table: e => NT(['genre', 'False', 'True'], cross(e)) },
        { cap: T3('If price did not depend on genre, we would expect these counts.', 'ジャンルと関係がなければ、この数になるはず（期待度数）。', 'かんけいが なければ。'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).expected_freq`, mark: '.expected_freq',
          table: e => { const c = cross(e), ex = S.chi2Contingency(c.map(r => r.slice(1))).expected; return NT(['genre', 'False', 'True'], c.map((r, i) => [r[0], ...ex[i]])); } },
        { cap: T3('The bigger the gap, the smaller the p-value.', 'ずれが大きいほど p 値は小さい。', 'ずれが おおきいほど p は ちいさい。'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).pvalue`, mark: '.pvalue', res: true, table: e => V1('value', S.chi2Contingency(cross(e).map(r => r.slice(1))).pvalue) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('p-value', 'p 値', 'p ち'), covers: ['p'], cap: T3('The p-value.', 'p 値。', 'p ち。'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).pvalue`, mark: '.pvalue', res: true, table: e => V1('value', S.chi2Contingency(cross(e).map(r => r.slice(1))).pvalue) },
        { label: T3('Chi-square value', 'カイ二乗値', 'カイにじょうち'), covers: ['stat'], cap: T3('The size of the gap.', 'ずれの大きさ。', 'ずれの おおきさ。'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).statistic`, mark: '.statistic', res: true, table: e => V1('value', S.chi2Contingency(cross(e).map(r => r.slice(1))).statistic) },
        { label: T3('Degrees of freedom', '自由度', 'じゆうど'), covers: ['dof'], cap: T3('3 rows, 2 columns: (3 − 1) × (2 − 1) = 2.', '3 行 2 列：(3 − 1) × (2 − 1) = 2。', '(3−1)×(2−1)'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).dof`, mark: '.dof', res: true, table: e => V1('value', S.chi2Contingency(cross(e).map(r => r.slice(1))).dof) },
        { label: T3('Related?', '関係がある？', 'かんけい ある？'), covers: ['sig'], cap: T3('p < 0.05 → related.', 'p < 0.05 なら関係がある。', 'p < 0.05'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).pvalue < 0.05`, mark: '< 0.05', res: true, table: e => V1('value', S.chi2Contingency(cross(e).map(r => r.slice(1))).pvalue < 0.05) }
      ] },
      { type: 'mistake', title: T3('The raw columns', '表を作らずに渡す', '{表|ひょう}を つくらない'), wrong: 'from scipy import stats\nstats.chi2_contingency(books["genre"]).pvalue', right: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).pvalue`,
        why: T3('chi2_contingency needs a table of counts. Make it with pd.crosstab first (an error otherwise).', 'chi2_contingency に渡すのは件数の表。先に pd.crosstab で作る（そうでないとエラー）。', 'さきに crosstab。') },
      { type: 'quiz', q: T3('A 4 × 3 cross table has how many degrees of freedom?', '4 行 × 3 列のクロス集計表の自由度は？', '4×3 の じゆうどは？'), code: `from scipy import stats\n${CROSS}\nstats.chi2_contingency(tab).dof`, mark: '.dof',
        choices: ['6', '12', '7'], answer: 0, why: T3('(4 − 1) × (3 − 1) = 6.', '(4 − 1) × (3 − 1) = 6。', '(4−1)×(3−1) = 6'), table: e => NT(['genre', 'False', 'True'], cross(e)) },
      { type: 'points', items: [
        T3('pd.crosstab → stats.chi2_contingency(table) → .pvalue / .statistic / .dof.', 'pd.crosstab → stats.chi2_contingency(表) → .pvalue / .statistic / .dof。', 'crosstab → chi2_contingency'),
        T3('With very few rows (expected counts below 5), the test is rough.', '件数がとても少ない（期待度数が 5 未満）と、検定は目安にしかならない。', 'すくないと めやす。')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 27. simple regression ---------- */
  st_reg: {
    goal: T3('Draw the best straight line and use it to predict.', 'いちばん合う直線を引き、予測に使う。', 'ちょくせんで よそく。'),
    slides: [
      { type: 'scene', who: MANAGER, ask: T3('“A new book has 300 pages. What price would fit?”', '「新しい本は 300 ページ。値段はいくらくらいが自然？」', '「300ページなら いくら？」'), table: R('SELECT id, title, pages, price FROM books;', { hl: ['pages', 'price'] }) },
      { type: 'syntax', code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.slope', notes: [
        T3('linregress(x, y) fits y = intercept + slope × x.', 'linregress(x, y) で y = 切片 + 傾き × x を当てはめる。', 'y = せっぺん + かたむき × x'),
        T3('slope: how much y changes when x goes up by 1.', '傾き：x が 1 増えると y がどれだけ変わるか。', 'x が 1 ふえると…'),
        T3('R² = rvalue ** 2: how much of y the line explains (0–1).', 'R² = rvalue ** 2：直線で y の何割を説明できるか（0〜1）。', 'R² は 0〜1')] },
      { type: 'anim', title: T3('A line through the dots', '点の間に直線を引く', 'てんの あいだに せん'), frames: [
        { cap: T3('pages across, price up.', '横が pages、縦が price。', 'よこが pages。'), code: 'books[["pages", "price"]]', mark: '"pages", "price"', res: true, table: R('SELECT id, pages, price FROM books;', { hide: ['id'] }),
          chart: e => scatterChart(e.exec('SELECT pages, price, title FROM books;').values.map(v => ({ x: v[0], y: v[1], label: v[2] }))) },
        { cap: T3('The line: its slope and intercept.', '直線の傾きと切片。', 'かたむきと せっぺん。'), code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\npd.Series({"slope": r.slope, "intercept": r.intercept})', mark: 'stats.linregress', res: true,
          table: e => { const r = S.linregress(pages(e), price(e)); return NT(['index', 'value'], [['slope', r.slope], ['intercept', r.intercept]], ['value']); } }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Slope', '傾き', 'かたむき'), covers: ['slope'], cap: T3('Yen per extra page.', '1 ページ増えるごとの値段の増え方。', '1ページ ふえると。'), code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.slope', mark: 'r.slope', res: true, table: e => V1('value', S.linregress(pages(e), price(e)).slope) },
        { label: T3('Intercept', '切片', 'せっぺん'), covers: ['intercept'], cap: T3('The line’s height at x = 0.', 'x = 0 のときの直線の高さ。', 'x = 0 の とき。'), code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.intercept', mark: 'r.intercept', res: true, table: e => V1('value', S.linregress(pages(e), price(e)).intercept) },
        { label: T3('R²', 'R²', 'R²'), covers: ['r2'], cap: T3('How well the line fits.', '直線の当てはまりのよさ。', 'あてはまり。'), code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.rvalue ** 2', mark: 'r.rvalue ** 2', res: true, table: e => V1('value', S.linregress(pages(e), price(e)).rvalue ** 2) },
        { label: T3('Predict', '予測', 'よそく'), covers: ['pred'], cap: T3('The price for 300 pages.', '300 ページのときの値段。', '300ページの とき。'), code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.intercept + r.slope * 300', mark: 'r.intercept + r.slope * 300', res: true, table: e => { const r = S.linregress(pages(e), price(e)); return V1('value', r.intercept + r.slope * 300); } }
      ] },
      { type: 'mistake', title: T3('x and y swapped', 'x と y が逆', 'x と y が ぎゃく'), wrong: 'from scipy import stats\nr = stats.linregress(books["price"], books["pages"])\nr.slope', right: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.slope',
        why: T3('linregress(x, y): x first (what we know), y second (what we predict). Swapped, it predicts pages from price.', 'linregress(x, y)：先に x（分かっている数）、後に y（予測したい数）。逆だと値段からページ数を予測してしまう。', 'さきに x、あとに y。') },
      { type: 'quiz', q: T3('The slope is positive. So more pages means …', '傾きは正。ページ数が多いほど…', 'かたむきは プラス。'), code: 'from scipy import stats\nr = stats.linregress(books["pages"], books["price"])\nr.slope', mark: 'r.slope',
        choices: [T3('a higher predicted price', '予測価格が高い', 'たかい'), T3('a lower predicted price', '予測価格が安い', 'やすい'), T3('the same price', '同じ価格', 'おなじ')],
        answer: e => (S.linregress(pages(e), price(e)).slope > 0 ? 'a higher predicted price' : 'a lower predicted price'),
        why: T3('A positive slope: the line goes up to the right.', '傾きが正なら、直線は右上がり。', 'みぎあがり。'), table: e => V1('value', S.linregress(pages(e), price(e)).slope) },
      { type: 'points', items: [
        T3('r = stats.linregress(x, y): r.slope, r.intercept, r.rvalue ** 2.', 'r = stats.linregress(x, y)：r.slope・r.intercept・r.rvalue ** 2。', 'linregress'),
        T3('Predict: r.intercept + r.slope * x. Far outside the data, do not trust it.', '予測は r.intercept + r.slope * x。データの範囲から遠い x では当てにならない。', 'よそく'),
        T3('R² near 1 = the line explains y well.', 'R² が 1 に近いほど、直線でよく説明できる。', 'R² ≒ 1')] },
      { type: 'practice' }
    ]
  },

  /* ---------- 28. multiple regression ---------- */
  st_mreg: {
    goal: T3('Explain one number with two or more: statsmodels ols.', '1 つの数を 2 つ以上の数で説明する：statsmodels の ols。', '2つ いじょうで せつめい。'),
    slides: [
      { type: 'scene', who: ANALYST, ask: T3('“Price depends on pages — and maybe on the year too. Can we use both?”', '「値段はページ数で決まる…出版年も関係ある？ 両方使える？」', '「りょうほう つかえる？」'), table: R('SELECT id, title, price, pages, published_year FROM books;', { hl: ['price', 'pages', 'published_year'] }) },
      { type: 'syntax', code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.params', notes: [
        T3('"y ~ x1 + x2": what to explain ~ what explains it.', '"y ~ x1 + x2"：説明したい数 ~ 説明に使う数。', '"y ~ x1 + x2"'),
        T3('.params: Intercept and one coefficient per x. .rsquared: R².', '.params：切片（Intercept）と x ごとの係数。.rsquared：R²。', '.params・.rsquared'),
        T3('A coefficient: the change in y when that x goes up by 1 and the other stays the same.', '係数：ほかの x が同じとき、その x が 1 増えると y がどれだけ変わるか。', 'ほかが おなじ とき。')] },
      { type: 'anim', title: T3('One x, then two', 'x が 1 つ、それから 2 つ', 'x が 1つ → 2つ'), frames: [
        { cap: T3('pages only: R² of the simple line.', 'pages だけ：単回帰の R²。', 'pages だけ。'), code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages", data=books).fit()\nm.rsquared', mark: '"price ~ pages"', res: true, table: e => V1('value', S.ols(price(e), [pages(e)]).rsquared) },
        { cap: T3('pages and published_year: R² can only go up.', 'pages と published_year：R² は下がらない。', 'R² は さがらない。'), code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.rsquared', mark: '+ published_year', res: true, table: e => V1('value', S.ols(price(e), [pages(e), year(e)]).rsquared) }
      ] },
      { type: 'anim', cases: true, frames: [
        { label: T3('Coefficients', '係数', 'けいすう'), covers: ['params'], cap: T3('Intercept, pages, published_year.', 'Intercept・pages・published_year。', 'けいすう。'), code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.params', mark: 'm.params', res: true,
          table: e => { const p = S.ols(price(e), [pages(e), year(e)]).params; return NT(['index', 'value'], [['Intercept', p[0]], ['pages', p[1]], ['published_year', p[2]]], ['value']); } },
        { label: T3('R²', 'R²', 'R²'), covers: ['r2'], cap: T3('How much of price the two explain.', '2 つでどれだけ説明できるか。', 'どれだけ せつめい できるか。'), code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.rsquared', mark: 'm.rsquared', res: true, table: e => V1('value', S.ols(price(e), [pages(e), year(e)]).rsquared) },
        { label: T3('One coefficient', '1 つの係数', '1つの けいすう'), covers: ['coef'], cap: T3('params["pages"]: yen per page, with the year fixed.', 'params["pages"]：出版年が同じなら、1 ページあたりいくら。', 'params["pages"]'), code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.params["pages"]', mark: 'm.params["pages"]', res: true, table: e => V1('value', S.ols(price(e), [pages(e), year(e)]).params[1]) }
      ] },
      { type: 'mistake', title: T3('Forgetting .fit()', '.fit() を忘れる', '.fit() を わすれる'), wrong: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books)\nm.params', right: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.params',
        why: T3('smf.ols(…) only sets up the model; .fit() works it out. Without it there are no params (an error).', 'smf.ols(…) は準備だけ。.fit() で計算する。ないと params がない（エラー）。', '.fit() で けいさん。') },
      { type: 'quiz', q: T3('In "price ~ pages + published_year", what is explained?', '"price ~ pages + published_year" で説明される数は？', 'せつめい される {数|かず}は？'), code: 'import statsmodels.formula.api as smf\nm = smf.ols("price ~ pages + published_year", data=books).fit()\nm.params', mark: 'price ~',
        choices: ['price', 'pages', 'published_year'], answer: 0, why: T3('The left of ~ is explained; the right explains it.', '~ の左が説明される数、右が説明に使う数。', '~ の ひだり。'), before: R('SELECT id, title, price, pages, published_year FROM books;', { hl: ['price'] }) },
      { type: 'points', items: [
        T3('smf.ols("y ~ x1 + x2", data=table).fit()', 'smf.ols("y ~ x1 + x2", data=表).fit()', 'smf.ols(…).fit()'),
        T3('.params (coefficients), .rsquared (R²), .params["x1"] (one coefficient).', '.params（係数）・.rsquared（R²）・.params["x1"]（1 つの係数）。', '.params・.rsquared'),
        T3('More x always raises R² a little — that alone does not make a model better.', 'x を増やすと R² は必ず少し上がる。それだけでよいモデルとは限らない。', 'R² だけで きめない。')] },
      { type: 'practice' }
    ]
  }
};
