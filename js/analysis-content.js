/* =========================================================
 * analysis-content.js — "statistics basics" and the Excel / Python guides
 * of the data-analysis course, in English, Japanese and Easy Japanese
 * (other languages show English).
 *
 * Blocks: ['h', text] heading · ['p', text] paragraph · ['f', formula]
 *         ['li', [text, …]] list · ['code', text] (Python / Excel, not translated)
 * Text may use {漢字|かんじ} (furigana) and {t} {v} … (filled from the problem).
 * ========================================================= */

/* ---------- statistics basics (one per lesson) ---------- */
export const STAT = {
  an_overview: {
    en: [
      ['h', 'Kinds of data (data types)'],
      ['p', 'A column is either quantitative (numbers you can calculate with: amount, minutes) or qualitative (labels: store, team). Dates are a third kind: they have an order and you can count days between them.'],
      ['li', ['Nominal: labels with no order (store, city)', 'Ordinal: labels with an order (S / M / L, good / ok / bad)', 'Interval and ratio: numbers (temperature, amount). Ratio data has a true zero, so “twice as much” makes sense.']],
      ['h', 'Population and sample'],
      ['p', 'The population is everything you want to know about (all customers). A sample is the part you actually have (this year’s orders). Statistics is about learning about the population from a sample.'],
      ['p', 'The chart shows the columns of this table and their kind.']
    ],
    ja: [
      ['h', 'データの種類（data types）'],
      ['p', '列は、計算できる数の「量的データ（quantitative）」（金額、時間）か、ラベルの「質的データ（qualitative）」（店、チーム）のどちらかです。日付は順番があり、日数を数えられる特別な列です。'],
      ['li', ['名義尺度（nominal）：順番のないラベル（店、都市）', '順序尺度（ordinal）：順番のあるラベル（S・M・L、良い・普通・悪い）', '間隔尺度・比例尺度（interval / ratio）：数（気温、金額）。比例尺度には本当の 0 があり、「2倍」に意味がある']],
      ['h', '母集団と標本（population / sample）'],
      ['p', '母集団は知りたいもの全部（すべての客）、標本は実際に手元にある一部（今年の注文）です。統計は、標本から母集団のことを知るための道具です。'],
      ['p', '下の図は、このテーブルの列とその種類です。']
    ],
    easy: [
      ['h', 'データの {種類|しゅるい}（data types）'],
      ['p', '{列|れつ}は、{計算|けいさん}できる {数|かず}の「{量的|りょうてき}データ（quantitative）」（お{金|かね}、{時間|じかん}）か、ラベルの「{質的|しつてき}データ（qualitative）」（{店|みせ}、チーム）です。{日付|ひづけ}は {順番|じゅんばん}が あり、{日|ひ}の {数|かず}を {数|かぞ}えられます。'],
      ['li', ['{名義尺度|めいぎしゃくど}（nominal）：{順番|じゅんばん}の ない ラベル（{店|みせ}、{町|まち}）', '{順序尺度|じゅんじょしゃくど}（ordinal）：{順番|じゅんばん}の ある ラベル（S・M・L、よい・ふつう・わるい）', '{間隔|かんかく}・{比例尺度|ひれいしゃくど}（interval / ratio）：{数|かず}（{気温|きおん}、お{金|かね}）。{比例尺度|ひれいしゃくど}には ほんとうの 0 が あり、「2{倍|ばい}」に {意味|いみ}が あります']],
      ['h', '{母集団|ぼしゅうだん}と {標本|ひょうほん}（population / sample）'],
      ['p', '{母集団|ぼしゅうだん}は {知|し}りたいもの ぜんぶ（すべての {客|きゃく}）、{標本|ひょうほん}は {手|て}もとに ある {一部|いちぶ}（{今年|ことし}の {注文|ちゅうもん}）です。{統計|とうけい}は {標本|ひょうほん}から {母集団|ぼしゅうだん}を {知|し}るための {道具|どうぐ}です。'],
      ['p', '{下|した}の {図|ず}は、この テーブルの {列|れつ}と その {種類|しゅるい}です。']
    ]
  },
  an_missing: {
    en: [
      ['h', 'Missing values (NULL)'],
      ['p', 'Real data always has gaps: a customer did not give an e-mail address, a form was not finished. The missing rate = missing ÷ all rows × 100.'],
      ['f', 'missing rate (%) = (COUNT(*) − COUNT(column)) ÷ COUNT(*) × 100'],
      ['p', 'What to do depends on why the value is missing: leave the row out, fill it in (for example with the median), or keep “unknown” as its own group. Always report how many rows you left out.'],
      ['h', 'Duplicates'],
      ['p', 'The same customer may be registered twice. COUNT(DISTINCT column) counts each value once. If it is much smaller than the number of rows, check whether those rows are really different people.'],
      ['p', 'The chart shows, for each column, how many rows are filled (blue) and missing (red).']
    ],
    ja: [
      ['h', '欠損値（missing values / NULL）'],
      ['p', '実際のデータには必ず空欄があります。客がメールアドレスを書かなかった、入力の途中でやめた、など。欠損率 = 空欄の数 ÷ 全体の行数 × 100。'],
      ['f', '欠損率 (%) = (COUNT(*) − COUNT(列)) ÷ COUNT(*) × 100'],
      ['p', 'どうするかは、なぜ空欄なのかで決めます。その行を除く、値を埋める（たとえば中央値で）、「不明」というグループとして残す、など。除いた行の数は必ず報告します。'],
      ['h', '重複（duplicates）'],
      ['p', '同じ客が2回登録されていることがあります。COUNT(DISTINCT 列) は同じ値を1回だけ数えます。行数よりずっと少ないときは、本当に別の人か確かめます。'],
      ['p', '下の図は、列ごとに値が入っている数（青）と空欄の数（赤）です。']
    ],
    easy: [
      ['h', '{欠|か}けた {値|あたい}（missing values / NULL）'],
      ['p', 'ほんとうの データには かならず {空|から}の ところが あります。{客|きゃく}が メールを {書|か}かなかった、とちゅうで やめた、など。{欠損率|けっそんりつ} = {空|から}の {数|かず} ÷ ぜんぶの {行|ぎょう}の {数|かず} × 100。'],
      ['f', '{欠損率|けっそんりつ} (%) = (COUNT(*) − COUNT({列|れつ})) ÷ COUNT(*) × 100'],
      ['p', 'どうするかは、なぜ {空|から}なのかで きめます。その {行|ぎょう}を のぞく、{値|あたい}を うめる（たとえば {中央値|ちゅうおうち}で）、「わからない」グループに する、など。のぞいた {行|ぎょう}の {数|かず}は かならず つたえます。'],
      ['h', '{重複|ちょうふく}（duplicates）'],
      ['p', '{同|おな}じ {客|きゃく}が 2{回|かい} {登録|とうろく}されていることが あります。COUNT(DISTINCT {列|れつ}) は {同|おな}じ {値|あたい}を 1{回|かい}だけ {数|かぞ}えます。{行|ぎょう}の {数|かず}より ずっと {少|すく}ないときは、ほんとうに {別|べつ}の {人|ひと}か {確|たし}かめます。'],
      ['p', '{下|した}の {図|ず}は、{列|れつ}ごとに {値|あたい}が {入|はい}っている {数|かず}（{青|あお}）と {空|から}の {数|かず}（{赤|あか}）です。']
    ]
  },
  an_center: {
    en: [
      ['h', 'Measures of centre'],
      ['li', ['Mean (average): the sum ÷ the number of values', 'Median: the middle value when sorted (with n values, the (n + 1) ÷ 2-th)', 'Mode: the value that appears most often']],
      ['f', 'mean x̄ = (x₁ + x₂ + … + xₙ) ÷ n'],
      ['p', 'A few very large values pull the mean up, but not the median. Money data (sales, salaries, house prices) usually has a long tail on the right, so the mean is larger than the median. Then the median is closer to a “typical” value.'],
      ['p', 'In the chart: the histogram of the values, the mean (blue) and the median (green).']
    ],
    ja: [
      ['h', '代表値（measures of centre）'],
      ['li', ['平均（mean）：合計 ÷ 個数', '中央値（median）：小さい順に並べた真ん中の値（n 個なら (n + 1) ÷ 2 番目）', '最頻値（mode）：いちばん多く出てくる値']],
      ['f', '平均 x̄ = (x₁ + x₂ + … + xₙ) ÷ n'],
      ['p', 'とても大きな値が少しあると、平均は大きい方へ引っぱられますが、中央値は動きません。売上・給料・家の値段などのお金のデータは右に長いすそがあることが多く、平均が中央値より大きくなります。そのときは中央値の方が「ふつうの値」に近いです。'],
      ['p', '下の図：値のヒストグラムと、平均（青）・中央値（緑）。']
    ],
    easy: [
      ['h', '{代表値|だいひょうち}（measures of centre）'],
      ['li', ['{平均|へいきん}（mean）：{合計|ごうけい} ÷ {数|かず}', '{中央値|ちゅうおうち}（median）：{小|ちい}さい {順|じゅん}に ならべた まん{中|なか}の {値|あたい}（n {個|こ}なら (n + 1) ÷ 2 {番目|ばんめ}）', '{最頻値|さいひんち}（mode）：いちばん {多|おお}く {出|で}てくる {値|あたい}']],
      ['f', '{平均|へいきん} x̄ = (x₁ + x₂ + … + xₙ) ÷ n'],
      ['p', 'とても {大|おお}きな {値|あたい}が {少|すこ}し あると、{平均|へいきん}は {大|おお}きい ほうへ ひっぱられますが、{中央値|ちゅうおうち}は {動|うご}きません。お{金|かね}の データ（{売上|うりあげ}・{給料|きゅうりょう}）は {右|みぎ}に {長|なが}く のびることが {多|おお}く、{平均|へいきん}が {中央値|ちゅうおうち}より {大|おお}きく なります。そのときは {中央値|ちゅうおうち}の ほうが「ふつうの {値|あたい}」に {近|ちか}いです。'],
      ['p', '{下|した}の {図|ず}：{値|あたい}の ヒストグラムと、{平均|へいきん}（{青|あお}）・{中央値|ちゅうおうち}（{緑|みどり}）。']
    ]
  },
  an_spread: {
    en: [
      ['h', 'Measures of spread'],
      ['li', ['Range = largest − smallest (one extreme value changes it a lot)', 'Quartiles: Q1 (25%), median (50%), Q3 (75%). IQR = Q3 − Q1 is the width of the middle half.', 'Variance and standard deviation: how far values are from the mean, on average']],
      ['f', 'sample variance s² = Σ(x − x̄)² ÷ (n − 1)    standard deviation s = √s²'],
      ['p', 'In SQL we use the same value written another way: Σ(x − x̄)² = Σx² − (Σx)² ÷ n. Dividing by n − 1 (not n) is the usual choice for a sample; Excel STDEV.S and pandas .std() do the same.'],
      ['p', 'Coefficient of variation = s ÷ x̄ lets you compare the spread of groups with different averages.'],
      ['p', 'In the chart: a box plot per group. The box is Q1–Q3, the green line the median, the dot the mean, the circles are outliers (beyond 1.5 × IQR).']
    ],
    ja: [
      ['h', '散らばりの指標（measures of spread）'],
      ['li', ['範囲（range）= 最大値 − 最小値（極端な値1つで大きく変わる）', '四分位数（quartiles）：Q1（25%）、中央値（50%）、Q3（75%）。四分位範囲 IQR = Q3 − Q1 は真ん中半分の幅', '分散（variance）・標準偏差（standard deviation）：平均から平均してどのくらい離れているか']],
      ['f', '標本分散 s² = Σ(x − x̄)² ÷ (n − 1)    標準偏差 s = √s²'],
      ['p', 'SQL では同じ値を別の形で計算します：Σ(x − x̄)² = Σx² − (Σx)² ÷ n。標本では n ではなく n − 1 で割るのがふつうで、Excel の STDEV.S や pandas の .std() も同じです。'],
      ['p', '変動係数（coefficient of variation）= s ÷ x̄ を使うと、平均の違うグループの散らばりも比べられます。'],
      ['p', '下の図：グループごとの箱ひげ図。箱が Q1〜Q3、緑の線が中央値、点が平均、丸は外れ値（IQR の 1.5 倍より外）です。']
    ],
    easy: [
      ['h', 'ちらばりを {表|あらわ}す {数|かず}（measures of spread）'],
      ['li', ['{範囲|はんい}（range）= いちばん {大|おお}きい {値|あたい} − いちばん {小|ちい}さい {値|あたい}（とびぬけた {値|あたい} 1つで {大|おお}きく かわる）', '{四分位数|しぶんいすう}（quartiles）：Q1（25%）、{中央値|ちゅうおうち}（50%）、Q3（75%）。IQR = Q3 − Q1 は まん{中|なか}の {半分|はんぶん}の {幅|はば}', '{分散|ぶんさん}（variance）・{標準偏差|ひょうじゅんへんさ}（standard deviation）：{平均|へいきん}から だいたい どのくらい はなれているか']],
      ['f', '{標本分散|ひょうほんぶんさん} s² = Σ(x − x̄)² ÷ (n − 1)    {標準偏差|ひょうじゅんへんさ} s = √s²'],
      ['p', 'SQL では {同|おな}じ {値|あたい}を {別|べつ}の {形|かたち}で {計算|けいさん}します：Σ(x − x̄)² = Σx² − (Σx)² ÷ n。{標本|ひょうほん}では n − 1 で {割|わ}ります。Excel の STDEV.S や pandas の .std() も {同|おな}じです。'],
      ['p', '{変動係数|へんどうけいすう} = s ÷ x̄ を {使|つか}うと、{平均|へいきん}の ちがう グループの ちらばりも くらべられます。'],
      ['p', '{下|した}の {図|ず}：グループごとの {箱|はこ}ひげ{図|ず}。{箱|はこ}が Q1〜Q3、{緑|みどり}の {線|せん}が {中央値|ちゅうおうち}、{点|てん}が {平均|へいきん}、{丸|まる}は {外|はず}れ{値|ち}です。']
    ]
  },
  an_hist: {
    en: [
      ['h', 'Frequency table and histogram'],
      ['p', 'Choose a bin width, split the values into bins (classes) and count the rows in each bin: that is the frequency. The relative frequency is the share of all rows; adding them up from the left gives the cumulative relative frequency.'],
      ['f', 'bin start = FLOOR(x ÷ width) × width'],
      ['p', 'Too wide: details disappear. Too narrow: the shape looks noisy. A first guess is about √n bins.'],
      ['h', 'Reading the shape'],
      ['li', ['Symmetric, one peak: mean ≈ median (weights of products, test scores)', 'Long tail to the right: mean > median (money, waiting times)', 'Two peaks: two different groups are mixed — split the data and look again']]
    ],
    ja: [
      ['h', '度数分布表とヒストグラム（frequency table / histogram）'],
      ['p', '階級の幅を決め、値を階級（bin）に分けて、それぞれの行数を数えます。これが度数（frequency）です。全体に対する割合が相対度数、左から足していったものが累積相対度数です。'],
      ['f', '階級の始まり = FLOOR(x ÷ 幅) × 幅'],
      ['p', '幅が広すぎると細かい形が消え、狭すぎるとギザギザで形が見えません。最初は √n 個くらいの階級が目安です。'],
      ['h', '形の読み方'],
      ['li', ['左右対称で山が1つ：平均 ≈ 中央値（製品の重さ、テストの点）', '右に長いすそ：平均 > 中央値（お金、待ち時間）', '山が2つ：性質の違う2つのグループが混ざっている。分けてからもう一度見る']]
    ],
    easy: [
      ['h', '{度数分布表|どすうぶんぷひょう}と ヒストグラム（frequency table / histogram）'],
      ['p', '{階級|かいきゅう}の {幅|はば}を きめ、{値|あたい}を {階級|かいきゅう}（bin）に {分|わ}けて、それぞれの {行|ぎょう}の {数|かず}を {数|かぞ}えます。これが {度数|どすう}（frequency）です。ぜんぶの {中|なか}の {割合|わりあい}が {相対度数|そうたいどすう}です。'],
      ['f', '{階級|かいきゅう}の はじまり = FLOOR(x ÷ {幅|はば}) × {幅|はば}'],
      ['p', '{幅|はば}が {広|ひろ}すぎると こまかい {形|かたち}が きえ、せますぎると ギザギザで {形|かたち}が {見|み}えません。はじめは √n {個|こ}くらいの {階級|かいきゅう}が めやすです。'],
      ['h', '{形|かたち}の {読|よ}みかた'],
      ['li', ['{左右|さゆう}が {同|おな}じで {山|やま}が 1つ：{平均|へいきん} ≈ {中央値|ちゅうおうち}（{製品|せいひん}の {重|おも}さ、テストの {点|てん}）', '{右|みぎ}に {長|なが}い すそ：{平均|へいきん} > {中央値|ちゅうおうち}（お{金|かね}、{待|ま}ち{時間|じかん}）', '{山|やま}が 2つ：ちがう 2つの グループが まざっている。{分|わ}けてから もう{一度|いちど} {見|み}る']]
    ]
  },
  an_zscore: {
    en: [
      ['h', 'Standard scores (z-scores)'],
      ['f', 'z = (x − x̄) ÷ s        T-score (Japanese “hensachi”) = 50 + 10z'],
      ['p', 'z tells how many standard deviations a value is above (+) or below (−) the mean. Different units become comparable: an employee’s sales and a call-centre time can both be “z = +1.5”.'],
      ['p', 'If the data is roughly normal, about 68% of the values have |z| < 1, 95% have |z| < 2, and 99.7% have |z| < 3.'],
      ['h', 'Outliers'],
      ['li', ['Rule of thumb: |z| ≥ 3 (or ≥ 2 to look more widely)', 'Box-plot rule: below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR', 'An outlier is a question, not a mistake: check it (typing error? a bulk order?) before you remove it']],
      ['p', 'Note: very large values also make the standard deviation larger, so z can hide them. The box-plot rule uses quartiles and is less affected.']
    ],
    ja: [
      ['h', '標準化と z 得点（standard scores）'],
      ['f', 'z = (x − x̄) ÷ s        偏差値 = 50 + 10z'],
      ['p', 'z は、その値が平均より標準偏差いくつ分大きい（+）か小さい（−）かを表します。単位の違う値も比べられます。社員の売上も、コールセンターの対応時間も、「z = +1.5」なら同じくらい珍しい。'],
      ['p', 'データがおよそ正規分布なら、|z| < 1 に約 68%、|z| < 2 に約 95%、|z| < 3 に約 99.7% の値が入ります。'],
      ['h', '外れ値（outliers）'],
      ['li', ['目安：|z| ≥ 3（広めに見るなら ≥ 2）', '箱ひげ図の基準：Q1 − 1.5 × IQR より小さい、または Q3 + 1.5 × IQR より大きい', '外れ値は「間違い」ではなく「確かめるべき値」。入力ミス？まとめ買い？を確かめてから除く']],
      ['p', '注意：とても大きな値があると標準偏差も大きくなり、z が小さく出て見逃しやすくなります。四分位数を使う箱ひげ図の基準は、その影響を受けにくいです。']
    ],
    easy: [
      ['h', '{標準化|ひょうじゅんか}と z {得点|とくてん}（standard scores）'],
      ['f', 'z = (x − x̄) ÷ s        {偏差値|へんさち} = 50 + 10z'],
      ['p', 'z は、その {値|あたい}が {平均|へいきん}より {標準偏差|ひょうじゅんへんさ} いくつ{分|ぶん} {大|おお}きい（+）か {小|ちい}さい（−）かを {表|あらわ}します。{単位|たんい}の ちがう {値|あたい}も くらべられます。'],
      ['p', 'データが だいたい {正規分布|せいきぶんぷ}なら、|z| < 1 に {約|やく} 68%、|z| < 2 に {約|やく} 95%、|z| < 3 に {約|やく} 99.7% の {値|あたい}が {入|はい}ります。'],
      ['h', '{外|はず}れ{値|ち}（outliers）'],
      ['li', ['めやす：|z| ≥ 3（{広|ひろ}く {見|み}るなら ≥ 2）', '{箱|はこ}ひげ{図|ず}の きまり：Q1 − 1.5 × IQR より {小|ちい}さい、または Q3 + 1.5 × IQR より {大|おお}きい', '{外|はず}れ{値|ち}は「まちがい」ではなく「{確|たし}かめる {値|あたい}」。{入力|にゅうりょく}ミス？まとめ{買|が}い？を {確|たし}かめてから のぞく']],
      ['p', '{注意|ちゅうい}：とても {大|おお}きな {値|あたい}が あると {標準偏差|ひょうじゅんへんさ}も {大|おお}きく なり、z が {小|ちい}さく {出|で}て {見|み}おとしやすく なります。']
    ]
  }
};

/* ---------- guides: Excel (Microsoft 365) and Python (pandas) ----------
 * Each lesson variant: a list of steps. A step is [text, code?]. Text has en / ja / easy. */
const S = (en, ja, easy, code) => ({ en, ja, easy, code });
const XL_OPEN = [
  S('Download the CSV of the table (the button above) and open it in Excel.', '上のボタンでテーブルの CSV をダウンロードし、Excel で開きます。', '{上|うえ}の ボタンで テーブルの CSV を ダウンロードし、Excel で {開|ひら}きます。'),
  S('Click any cell of the data and press Ctrl + T (Insert → Table) → OK. In Table Design → Table Name, type {t}.', 'データのどこかのセルを選んで Ctrl + T（挿入 → テーブル）→ OK。テーブル デザイン → テーブル名に {t} と入力します。', 'データの どこかの セルを {選|えら}んで Ctrl + T（{挿入|そうにゅう} → テーブル）→ OK。テーブル デザイン → テーブル{名|めい}に {t} と {入力|にゅうりょく}します。'),
  S('Use an empty cell to the right of the table for each formula below.', '下の式は、テーブルの右の空いているセルに入力します。', '{下|した}の {式|しき}は、テーブルの {右|みぎ}の あいている セルに {入力|にゅうりょく}します。')
];
const PY_OPEN = [
  S('Download the CSV (the button above) into the same folder as your notebook (VS Code or Jupyter).', '上のボタンで CSV をダウンロードし、ノートブック（VS Code または Jupyter）と同じフォルダに置きます。', '{上|うえ}の ボタンで CSV を ダウンロードし、ノートブック（VS Code か Jupyter）と {同|おな}じ フォルダに おきます。'),
  S('Read the table with pandas.', 'pandas でテーブルを読み込みます。', 'pandas で テーブルを {読|よ}みこみます。', 'import pandas as pd\ndf = pd.read_csv("{t}.csv")\ndf.head()')
];
const PIVOT = (rows, values) => S(
  `Insert → PivotTable → OK. Drag ${rows} to Rows and ${values} to Values.`,
  `挿入 → ピボットテーブル → OK。${rows} を「行」に、${values} を「値」にドラッグします。`,
  `{挿入|そうにゅう} → ピボットテーブル → OK。${rows} を「{行|ぎょう}」に、${values} を「{値|あたい}」に ドラッグします。`);

export const GUIDE = {
  an_overview: {
    _: {
      excel: [...XL_OPEN,
        S('Number of rows, smallest and largest {v}:', '行数、{v} の最小値と最大値：', '{行|ぎょう}の {数|かず}、{v} の いちばん {小|ちい}さい {値|あたい}と {大|おお}きい {値|あたい}：', '=ROWS({t})\n=MIN({t}[{v}])\n=MAX({t}[{v}])'),
        S('First and last {dt}. If you see a number like 45658, set the cell format to Date.', '{dt} の最初と最後。45658 のような数が出たら、セルの表示形式を「日付」にします。', '{dt} の {最初|さいしょ}と {最後|さいご}。45658 のような {数|かず}が {出|で}たら、セルの {表示形式|ひょうじけいしき}を「{日付|ひづけ}」に します。', '=MIN({t}[{dt}])\n=MAX({t}[{dt}])')],
      python: [...PY_OPEN,
        S('Number of rows, smallest and largest {v}, first and last {dt}:', '行数、{v} の最小値と最大値、{dt} の最初と最後：', '{行|ぎょう}の {数|かず}、{v} の {最小|さいしょう}と {最大|さいだい}、{dt} の {最初|さいしょ}と {最後|さいご}：', 'print(len(df))\nprint(df["{v}"].min(), df["{v}"].max())\nprint(df["{dt}"].min(), df["{dt}"].max())'),
        S('df.info() shows each column’s type and how many values are filled.', 'df.info() で、列ごとの型と値の入っている数が分かります。', 'df.info() で、{列|れつ}ごとの {型|かた}と {値|あたい}の {入|はい}っている {数|かず}が わかります。', 'df.info()')]
    }
  },
  an_missing: {
    null: {
      excel: [...XL_OPEN,
        S('Rows, filled, missing, and missing % of {opt}:', '{opt} の行数・入力あり・空欄・空欄の割合：', '{opt} の {行|ぎょう}の {数|かず}・{入|はい}っている {数|かず}・{空|から}の {数|かず}・{空|から}の {割合|わりあい}：', '=ROWS({t})\n=COUNTA({t}[{opt}])\n=COUNTBLANK({t}[{opt}])\n=ROUND(100*COUNTBLANK({t}[{opt}])/ROWS({t}),1)')],
      python: [...PY_OPEN,
        S('Filled and missing values of {opt}:', '{opt} の入力ありと空欄：', '{opt} の {入|はい}っている {数|かず}と {空|から}の {数|かず}：', 'n = len(df)\nfilled = df["{opt}"].count()\nmissing = df["{opt}"].isna().sum()\nprint(n, filled, missing, round(100 * missing / n, 1))'),
        S('All columns at once:', '全部の列をまとめて：', 'ぜんぶの {列|れつ}を まとめて：', 'df.isna().sum()')]
    },
    dup: {
      excel: [...XL_OPEN,
        S('Rows and different {name} (UNIQUE needs Microsoft 365):', '行数と、重複を除いた {name} の数（UNIQUE は Microsoft 365 で使えます）：', '{行|ぎょう}の {数|かず}と、{同|おな}じものを 1つに した {name} の {数|かず}：', '=COUNTA({t}[{name}])\n=COUNTA(UNIQUE({t}[{name}]))'),
        S('To see the repeated ones: Home → Conditional Formatting → Highlight Cells Rules → Duplicate Values on the {name} column.', '重複を見るには：{name} 列を選び、ホーム → 条件付き書式 → セルの強調表示ルール → 重複する値。', '{重複|ちょうふく}を {見|み}るには：{name} の {列|れつ}を {選|えら}び、ホーム → {条件付|じょうけんつ}き{書式|しょしき} → {重複|ちょうふく}する {値|あたい}。')],
      python: [...PY_OPEN,
        S('Rows and different {name}:', '行数と、重複を除いた {name} の数：', '{行|ぎょう}の {数|かず}と、{同|おな}じものを 1つに した {name} の {数|かず}：', 'print(df["{name}"].count(), df["{name}"].nunique())'),
        S('The values that appear more than once:', '2回以上出てくる値：', '2{回|かい} {以上|いじょう} {出|で}てくる {値|あたい}：', 'counts = df["{name}"].value_counts()\ncounts[counts > 1].head(10)')]
    }
  },
  an_center: {
    mid: {
      excel: [...XL_OPEN,
        S('Mean (1 decimal place) and median of {v}:', '{v} の平均（小数第1位）と中央値：', '{v} の {平均|へいきん}（{小数|しょうすう} 1けた）と {中央値|ちゅうおうち}：', '=ROUND(AVERAGE({t}[{v}]),1)\n=MEDIAN({t}[{v}])'),
        S('Check: sort {v} from smallest to largest; the {pos}th value is the median.', '確かめ：{v} を小さい順に並べ替えると、{pos} 番目が中央値です。', '{確|たし}かめ：{v} を {小|ちい}さい {順|じゅん}に ならべると、{pos} {番目|ばんめ}が {中央値|ちゅうおうち}です。')],
      python: [...PY_OPEN,
        S('Mean and median of {v}:', '{v} の平均と中央値：', '{v} の {平均|へいきん}と {中央値|ちゅうおうち}：', 'print(round(df["{v}"].mean(), 1), df["{v}"].median())'),
        S('Histogram with the two values (matplotlib):', '2つの値を書き入れたヒストグラム（matplotlib）：', '2つの {値|あたい}を {書|か}きいれた ヒストグラム：', 'import matplotlib.pyplot as plt\nax = df["{v}"].plot.hist(bins=20)\nax.axvline(df["{v}"].mean(), color="blue", label="mean")\nax.axvline(df["{v}"].median(), color="green", label="median")\nax.legend(); plt.show()')]
    },
    mode: {
      excel: [...XL_OPEN,
        S('The most common value of {v2} and how many rows have it (put the first formula in E2):', '{v2} の最頻値と、その行数（1つめの式を E2 に入れた場合）：', '{v2} の {最頻値|さいひんち}と、その {行|ぎょう}の {数|かず}：', '=MODE.SNGL({t}[{v2}])\n=COUNTIF({t}[{v2}],E2)')],
      python: [...PY_OPEN,
        S('Count each value of {v2}; the first one is the mode:', '{v2} の値ごとの数。いちばん上が最頻値：', '{v2} の {値|あたい}ごとの {数|かず}。いちばん {上|うえ}が {最頻値|さいひんち}：', 'df["{v2}"].value_counts().head(1)')]
    }
  },
  an_spread: {
    sd: {
      excel: [...XL_OPEN, PIVOT('{g}', '{v} (3 times)'),
        S('Click each value field → Value Field Settings: Count, Average and StdDev (StdDev is the sample standard deviation, like STDEV.S). Number Format → 1 decimal place.', '値の各フィールド → 値フィールドの設定：個数・平均・標本標準偏差（StdDev、STDEV.S と同じ）。表示形式 → 小数第1位。', '{値|あたい}の フィールドを それぞれ {設定|せってい}：{個数|こすう}・{平均|へいきん}・{標本標準偏差|ひょうほんひょうじゅんへんさ}。{表示形式|ひょうじけいしき} → {小数|しょうすう} 1けた。'),
        S('Sort by the standard deviation: right-click a value in that column → Sort → Smallest to Largest.', '標準偏差の列の値を右クリック → 並べ替え → 昇順。', '{標準偏差|ひょうじゅんへんさ}の {列|れつ}を {右|みぎ}クリック → {並|なら}べ{替|か}え → {昇順|しょうじゅん}。'),
        S('Box plot: select the {g} and {v} columns → Insert → Statistic Chart → Box and Whisker.', '箱ひげ図：{g} と {v} の列を選び、挿入 → 統計グラフ → 箱ひげ図。', '{箱|はこ}ひげ{図|ず}：{g} と {v} の {列|れつ}を {選|えら}び、{挿入|そうにゅう} → {統計|とうけい}グラフ → {箱|はこ}ひげ{図|ず}。')],
      python: [...PY_OPEN,
        S('Count, mean and standard deviation per {g} (pandas .std() divides by n − 1):', '{g} ごとの個数・平均・標準偏差（pandas の .std() は n − 1 で割ります）：', '{g} ごとの {個数|こすう}・{平均|へいきん}・{標準偏差|ひょうじゅんへんさ}：', 'df.groupby("{g}")["{v}"].agg(["count", "mean", "std"]).round(1).sort_values("std")'),
        S('Box plot per group:', 'グループごとの箱ひげ図：', 'グループごとの {箱|はこ}ひげ{図|ず}：', 'import matplotlib.pyplot as plt\ndf.boxplot(column="{v}", by="{g}"); plt.show()')]
    },
    range: {
      excel: [...XL_OPEN, PIVOT('{g}', '{v} (2 times)'),
        S('Value Field Settings: Min and Max. Add the range next to the PivotTable (Max − Min) and sort by it.', '値フィールドの設定：最小値と最大値。ピボットテーブルの横に範囲（最大 − 最小）を計算し、その順に並べ替えます。', '{最小値|さいしょうち}と {最大値|さいだいち}を {出|だ}し、{横|よこ}に {範囲|はんい}（{最大|さいだい} − {最小|さいしょう}）を {計算|けいさん}して {並|なら}べ{替|か}えます。')],
      python: [...PY_OPEN,
        S('Smallest, largest and range per {g}:', '{g} ごとの最小・最大・範囲：', '{g} ごとの {最小|さいしょう}・{最大|さいだい}・{範囲|はんい}：', 's = df.groupby("{g}")["{v}"].agg(["min", "max"])\ns["range"] = s["max"] - s["min"]\ns.sort_values("range")')]
    }
  },
  an_hist: {
    bin: {
      excel: [...XL_OPEN,
        S('Add a column to the table (type in the first empty column header: bin), then this formula:', 'テーブルの右に列を足し（見出しに bin と入力）、次の式を入れます：', 'テーブルの {右|みぎ}に {列|れつ}を {足|た}し（{見出|みだ}しに bin）、{次|つぎ}の {式|しき}を {入|い}れます：', '=FLOOR.MATH([@{v}]/{step})*{step}'),
        S('Insert → PivotTable: bin to Rows, Count of {v} to Values. That is the frequency table.', '挿入 → ピボットテーブル：bin を「行」に、{v} の個数を「値」に。これが度数分布表です。', '{挿入|そうにゅう} → ピボットテーブル：bin を「{行|ぎょう}」に、{v} の {個数|こすう}を「{値|あたい}」に。これが {度数分布表|どすうぶんぷひょう}です。'),
        S('Histogram: select the {v} column → Insert → Statistic Chart → Histogram. Format Axis → Bin width: {step}.', 'ヒストグラム：{v} の列を選び、挿入 → 統計グラフ → ヒストグラム。軸の書式設定 → ビンの幅：{step}。', 'ヒストグラム：{v} の {列|れつ}を {選|えら}び、{挿入|そうにゅう} → {統計|とうけい}グラフ → ヒストグラム。ビンの {幅|はば}：{step}。')],
      python: [...PY_OPEN,
        S('Frequency table with bins of {step}:', '幅 {step} の度数分布表：', '{幅|はば} {step} の {度数分布表|どすうぶんぷひょう}：', 'df["bin"] = (df["{v}"] // {step}) * {step}\ndf.groupby("bin").size()'),
        S('Histogram with the same bins:', '同じ階級のヒストグラム：', '{同|おな}じ {階級|かいきゅう}の ヒストグラム：', 'import matplotlib.pyplot as plt\nimport numpy as np\nbins = np.arange(0, df["{v}"].max() + {step}, {step})\ndf["{v}"].plot.hist(bins=bins); plt.show()')]
    },
    freq: {
      excel: [...XL_OPEN, PIVOT('{v2}', '{v2} (2 times)'),
        S('Value Field Settings: Count for both. For the second: Show Values As → % of Grand Total.', '値フィールドの設定：どちらも個数。2つめは「計算の種類」→ 総計に対する比率。', 'どちらも {個数|こすう}。2つめは「{計算|けいさん}の {種類|しゅるい}」→ {総計|そうけい}に {対|たい}する {比率|ひりつ}。')],
      python: [...PY_OPEN,
        S('Count and share (%) of each value of {v2}:', '{v2} の値ごとの数と割合（%）：', '{v2} の {値|あたい}ごとの {数|かず}と {割合|わりあい}：', 'n = df["{v2}"].value_counts().sort_index()\npct = (100 * df["{v2}"].value_counts(normalize=True).sort_index()).round(1)\npd.DataFrame({"n": n, "pct": pct})')]
    }
  },
  an_zscore: {
    top: {
      excel: [...XL_OPEN,
        S('Check the mean and the standard deviation:', '平均と標準偏差を確かめます：', '{平均|へいきん}と {標準偏差|ひょうじゅんへんさ}を {確|たし}かめます：', '=ROUND(AVERAGE({t}[{v}]),1)\n=ROUND(STDEV.S({t}[{v}]),1)'),
        S('Add a column z to the table:', 'テーブルに z の列を足します：', 'テーブルに z の {列|れつ}を {足|た}します：', '=ROUND(([@{v}]-{m})/{s},2)'),
        S('Sort the z column from largest to smallest and look at the top 5 rows. (STANDARDIZE([@{v}],{m},{s}) gives the same z.)', 'z の列を大きい順に並べ替え、上の 5 行を見ます（STANDARDIZE([@{v}],{m},{s}) でも同じ z が出ます）。', 'z の {列|れつ}を {大|おお}きい {順|じゅん}に {並|なら}べ{替|か}え、{上|うえ}の 5 {行|ぎょう}を {見|み}ます。')],
      python: [...PY_OPEN,
        S('z-scores and the 5 largest:', 'z 得点と、大きい 5 行：', 'z {得点|とくてん}と、{大|おお}きい 5 {行|ぎょう}：', 'm, s = {m}, {s}   # = round(df["{v}"].mean(), 1), round(df["{v}"].std(), 1)\ndf["z"] = ((df["{v}"] - m) / s).round(2)\ndf.nlargest(5, "z")[["{id}", "{v}", "z"]]')]
    },
    count: {
      excel: [...XL_OPEN,
        S('Add a column z to the table, then count the rows with |z| ≥ 2:', 'テーブルに z の列を足し、|z| が 2 以上の行を数えます：', 'テーブルに z の {列|れつ}を {足|た}し、|z| が 2 {以上|いじょう}の {行|ぎょう}を {数|かぞ}えます：', '=([@{v}]-{m})/{s}\n=COUNTIF({t}[z],">=2")+COUNTIF({t}[z],"<=-2")')],
      python: [...PY_OPEN,
        S('Rows 2 or more standard deviations from the mean:', '平均から標準偏差の 2 倍以上離れた行：', '{平均|へいきん}から {標準偏差|ひょうじゅんへんさ}の 2{倍|ばい} {以上|いじょう} はなれた {行|ぎょう}：', 'm, s = {m}, {s}\n((df["{v}"] - m).abs() / s >= 2).sum()')]
    }
  }
};
/** the steps for a problem (lesson key + variant) and a tool */
export function guideSteps(lessonKey, w, tool) {
  const g = GUIDE[lessonKey];
  if (!g) return [];
  return ((g[w] || g._ || {})[tool]) || [];
}
