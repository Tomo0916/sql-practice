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

/* =========================================================
 * Part 2 (A7–A12): statistics cards and Excel / Python guides
 * ========================================================= */
Object.assign(STAT, {
  an_cross: {
    en: [
      ['h', 'Cross tables (crosstab / pivot table)'],
      ['p', 'A cross table counts rows by two things at once: store × coupon, team × rating. It is the first step to “is there a difference between the groups?”'],
      ['h', 'Shares: compare in %, not in counts'],
      ['f', 'share (%) = 100 × part ÷ whole'],
      ['p', 'A big store has more of everything. To compare groups of different sizes, divide by the size of each group (row %), or by the grand total (share of the whole).'],
      ['li', ['Row %: “of the orders in Shibuya, 39% used a coupon”', 'Share of the whole: “Shibuya made 25% of all sales”', 'Write 100.0 (not 100) so SQL does not do integer division']],
      ['p', 'The chart shows, for each group of this table, the rows with and without a value in the column that is sometimes empty.']
    ],
    ja: [
      ['h', 'クロス集計（クロス表・ピボットテーブル）'],
      ['p', 'クロス集計は、2つのことがらで同時に行を数えます（店 × クーポン、チーム × 評価）。「グループの間に違いはあるか」を調べる最初の一歩です。'],
      ['h', '構成比：数ではなく % で比べる'],
      ['f', '割合（%）= 100 × 部分 ÷ 全体'],
      ['p', '大きな店は何でも数が多くなります。大きさの違うグループを比べるときは、グループの大きさで割る（行の割合）か、全体で割り（全体に占める割合）ます。'],
      ['li', ['行の割合：「渋谷の注文のうち 39% がクーポンを使った」', '全体に占める割合：「売上全体の 25% が渋谷」', 'SQL では 100 ではなく 100.0 と書くと、整数どうしの割り算になりません']],
      ['p', '下の図は、このテーブルのグループごとに、空欄のある列に値が入っている行と、入っていない行の数です。']
    ],
    easy: [
      ['h', 'クロス{集計|しゅうけい}（クロス{表|ひょう}・ピボットテーブル）'],
      ['p', 'クロス{集計|しゅうけい}は、2つの ことがらで いっしょに {行|ぎょう}を {数|かぞ}えます（{店|みせ} × クーポン など）。「グループの {間|あいだ}に ちがいは あるか」を しらべる {最初|さいしょ}の {一歩|いっぽ}です。'],
      ['h', '{構成比|こうせいひ}：{数|かず}では なく % で くらべる'],
      ['f', '{割合|わりあい}（%）= 100 × {部分|ぶぶん} ÷ ぜんたい'],
      ['p', '{大|おお}きな {店|みせ}は なんでも {数|かず}が {多|おお}く なります。{大|おお}きさの ちがう グループは、グループの {大|おお}きさや ぜんたいで わって くらべます。'],
      ['li', ['{行|ぎょう}の {割合|わりあい}：「{渋谷|しぶや}の {注文|ちゅうもん}の うち 39% が クーポンを {使|つか}った」', 'ぜんたいの {中|なか}の {割合|わりあい}：「{売上|うりあげ} ぜんたいの 25% が {渋谷|しぶや}」', 'SQL では 100 では なく 100.0 と {書|か}きます（{整数|せいすう}の わり{算|ざん}に ならないように）']],
      ['p', '{下|した}の {図|ず}は、グループごとに、{空|から}の ある {列|れつ}に {値|あたい}が ある {行|ぎょう}と ない {行|ぎょう}の {数|かず}です。']
    ]
  },
  an_trend: {
    en: [
      ['h', 'Time series'],
      ['p', 'Data in time order. Three things to look for: the trend (going up or down over a long time), seasonality (the same pattern every year, e.g. December sales) and noise (random ups and downs).'],
      ['h', 'Change from the previous period, moving average'],
      ['f', 'diff = this month − last month        3-month moving average = (this + last + the one before) ÷ 3'],
      ['li', ['A moving average smooths the noise so the trend is easier to see', 'Compare with the same month last year when there is seasonality', 'The first months have no “previous month” (NULL): that is correct']],
      ['p', 'The chart shows this table’s monthly totals (line) and the 3-month moving average (dashed).']
    ],
    ja: [
      ['h', '時系列データ（time series）'],
      ['p', '時間の順に並んだデータです。見るポイントは3つ：傾向（長い期間で上がっているか下がっているか）、季節性（毎年同じ形、たとえば12月の売上）、ノイズ（たまたまの上がり下がり）。'],
      ['h', '前の期間との差、移動平均'],
      ['f', '差 = 今月 − 先月        3か月移動平均 = (今月 + 先月 + 先々月) ÷ 3'],
      ['li', ['移動平均はノイズをならすので、傾向が見やすくなります', '季節性があるときは、前の年の同じ月と比べます', '最初の月には「前の月」がないので NULL になります（それで正しい）']],
      ['p', '下の図は、このテーブルの月ごとの合計（線）と 3か月移動平均（点線）です。']
    ],
    easy: [
      ['h', '{時系列|じけいれつ}データ（time series）'],
      ['p', '{時間|じかん}の {順|じゅん}に ならんだ データです。{見|み}る ポイントは 3つ：{傾向|けいこう}（{長|なが}い {間|あいだ}で {上|あ}がっているか {下|さ}がっているか）、{季節性|きせつせい}（{毎年|まいとし} {同|おな}じ {形|かたち}）、ノイズ（たまたまの {上|あ}がり{下|さ}がり）。'],
      ['h', '{前|まえ}との {差|さ}、{移動平均|いどうへいきん}'],
      ['f', '{差|さ} = {今月|こんげつ} − {先月|せんげつ}        3か{月|げつ} {移動平均|いどうへいきん} = ({今月|こんげつ} + {先月|せんげつ} + その{前|まえ}) ÷ 3'],
      ['li', ['{移動平均|いどうへいきん}は ノイズを ならすので、{傾向|けいこう}が {見|み}やすく なります', '{季節性|きせつせい}が ある ときは、{前|まえ}の {年|とし}の {同|おな}じ {月|つき}と くらべます', '{最初|さいしょ}の {月|つき}には「{前|まえ}の {月|つき}」が ないので NULL です（それで {正|ただ}しい）']],
      ['p', '{下|した}の {図|ず}は、{月|つき}ごとの {合計|ごうけい}（{線|せん}）と 3か{月|げつ} {移動平均|いどうへいきん}（{点線|てんせん}）です。']
    ]
  },
  an_corr: {
    en: [
      ['h', 'Scatter plot and correlation coefficient'],
      ['p', 'Put one number on the x-axis and the other on the y-axis: each row is one point. The correlation coefficient r says how close the points are to a straight line.'],
      ['f', 'r = Σ(x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² × Σ(y − ȳ)² )'],
      ['li', ['|r| ≥ 0.7: strong   0.4–0.7: moderate   0.2–0.4: weak   below 0.2: almost none (a rule of thumb)', 'r only sees straight-line relationships. Always look at the scatter plot too', 'A few outliers can make r much larger or smaller']],
      ['h', 'Correlation is not causation'],
      ['p', 'Ice-cream sales and swimming accidents both go up in summer: they are correlated, but one does not cause the other. A third thing (temperature) moves both.'],
      ['p', 'The chart is the scatter plot of the two columns of this table, with the best straight line.']
    ],
    ja: [
      ['h', '散布図と相関係数'],
      ['p', '一方の数を横軸、もう一方を縦軸にとると、1行が1つの点になります。相関係数 r は、点がどれだけ直線に近く並んでいるかを表します。'],
      ['f', 'r = Σ(x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² × Σ(y − ȳ)² )'],
      ['li', ['目安：|r| ≥ 0.7 強い、0.4〜0.7 中くらい、0.2〜0.4 弱い、0.2 未満 ほとんどない', 'r は直線的な関係しか見ません。散布図も必ず見ましょう', '少しの外れ値で r が大きく変わることがあります']],
      ['h', '相関は因果ではない'],
      ['p', 'アイスの売上と水の事故は、どちらも夏に増えるので相関があります。でも一方が他方の原因ではありません。気温という第3のものが両方を動かしています（疑似相関）。'],
      ['p', '下の図は、このテーブルの2つの列の散布図と、いちばん合う直線です。']
    ],
    easy: [
      ['h', '{散布図|さんぷず}と {相関係数|そうかんけいすう}'],
      ['p', '{一方|いっぽう}の {数|かず}を {横|よこ}、もう{一方|いっぽう}を {縦|たて}に とると、1{行|ぎょう}が 1つの {点|てん}に なります。{相関係数|そうかんけいすう} r は、{点|てん}が どれだけ まっすぐな {線|せん}に {近|ちか}く ならんでいるかを {表|あらわ}します。'],
      ['f', 'r = Σ(x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² × Σ(y − ȳ)² )'],
      ['li', ['めやす：|r| ≥ 0.7 {強|つよ}い、0.4〜0.7 {中|ちゅう}くらい、0.2〜0.4 {弱|よわ}い、0.2 {未満|みまん} ほとんど ない', 'r は まっすぐな {関係|かんけい}しか {見|み}ません。{散布図|さんぷず}も {見|み}ましょう', '{少|すこ}しの {外|はず}れ{値|ち}で r が {大|おお}きく かわる ことが あります']],
      ['h', '{相関|そうかん}は {原因|げんいん}では ない'],
      ['p', 'アイスの {売上|うりあげ}と {水|みず}の {事故|じこ}は、どちらも {夏|なつ}に {増|ふ}えるので {相関|そうかん}が あります。でも {一方|いっぽう}が {原因|げんいん}では ありません。{気温|きおん}が {両方|りょうほう}を {動|うご}かしています。'],
      ['p', '{下|した}の {図|ず}は、2つの {列|れつ}の {散布図|さんぷず}と、いちばん あう {線|せん}です。']
    ]
  },
  an_compare: {
    en: [
      ['h', 'Comparing groups fairly'],
      ['p', 'A difference in means is a start, but look at more: how spread out each group is (box plot), how many rows are above a line, who is at the top.'],
      ['li', ['Group sizes: a mean from 10 rows moves more by chance than a mean from 100', 'Outliers pull the mean: compare medians too', 'The groups may differ in other ways (a comparison is not an experiment)']],
      ['h', 'A/B comparison'],
      ['p', 'With coupon vs without coupon is an A/B comparison. To say “the coupon raised the amount”, the two groups must be alike in everything else — in real data they rarely are, so say “orders with a coupon were larger on average” instead.'],
      ['p', 'The chart shows a box plot for each group of this table.']
    ],
    ja: [
      ['h', 'グループを公平に比べる'],
      ['p', '平均の差は出発点です。さらに、グループごとのばらつき（箱ひげ図）、ある線より上の割合、1位はだれか、も見ましょう。'],
      ['li', ['グループの大きさ：10行の平均は、100行の平均より偶然で動きやすい', '外れ値は平均を引っぱる：中央値も比べる', 'グループは他の点でも違っているかもしれない（比較は実験ではない）']],
      ['h', 'A/B の比較'],
      ['p', 'クーポンあり・なしの比較は A/B 比較です。「クーポンで金額が上がった」と言うには、2つのグループがほかの点で同じでなければなりません。実際のデータではめったにそうならないので、「クーポンありの注文は平均が大きかった」と言いましょう。'],
      ['p', '下の図は、このテーブルのグループごとの箱ひげ図です。']
    ],
    easy: [
      ['h', 'グループを {公平|こうへい}に くらべる'],
      ['p', '{平均|へいきん}の {差|さ}は スタートです。グループごとの ばらつき（{箱|はこ}ひげ{図|ず}）、ある {線|せん}より {上|うえ}の {割合|わりあい}、1{位|い}は だれか も {見|み}ましょう。'],
      ['li', ['グループの {大|おお}きさ：10{行|ぎょう}の {平均|へいきん}は、100{行|ぎょう}より たまたまで {動|うご}きやすい', '{外|はず}れ{値|ち}は {平均|へいきん}を ひっぱる：{中央値|ちゅうおうち}も くらべる', 'グループは ほかの ところでも ちがうかも しれない']],
      ['h', 'A/B の {比較|ひかく}'],
      ['p', 'クーポン あり・なしの {比較|ひかく}は A/B {比較|ひかく}です。「クーポンで お{金|かね}が {増|ふ}えた」と {言|い}うには、2つの グループが ほかの ところで {同|おな}じで ないと いけません。だから「クーポン ありの {注文|ちゅうもん}は {平均|へいきん}が {大|おお}きかった」と {言|い}いましょう。'],
      ['p', '{下|した}の {図|ず}は、グループごとの {箱|はこ}ひげ{図|ず}です。']
    ]
  },
  an_join: {
    en: [
      ['h', 'Combine tables before you analyse'],
      ['p', 'Business data is split: what happened (orders, visits) is in one table, who did it (members, customers) in another. JOIN them on the person’s code, then group by a column of the people table (plan, rank, department).'],
      ['li', ['INNER JOIN keeps only the rows that have a partner in both tables', 'LEFT JOIN keeps everyone in the first table; no partner → NULL', 'Count after a JOIN with care: one person with many orders becomes many rows']],
      ['h', 'Customer-level view'],
      ['p', 'Grouping by person gives each customer’s number of purchases and total: who are the best customers, who never came back. This is the start of customer analysis (RFM: Recency, Frequency, Monetary).'],
      ['p', 'The chart shows how many people of each kind are in the people table.']
    ],
    ja: [
      ['h', '分析の前に表を合わせる'],
      ['p', '仕事のデータは分かれています。何が起きたか（注文・来店）は1つの表に、だれがしたか（会員・顧客）は別の表にあります。人のコードで JOIN し、人の表の列（プラン・ランク・部署）でグループにします。'],
      ['li', ['INNER JOIN は、両方の表に相手がいる行だけを残します', 'LEFT JOIN は、最初の表の全員を残します（相手がいないと NULL）', 'JOIN のあとは数え方に注意：注文の多い人は、たくさんの行になります']],
      ['h', '顧客ごとに見る'],
      ['p', '人ごとにグループにすると、それぞれの購入回数や合計が分かります。いちばんのお客さんはだれか、もう来なくなったのはだれか。これが顧客分析（RFM：最終購入日・回数・金額）の始まりです。'],
      ['p', '下の図は、人の表の種類ごとの人数です。']
    ],
    easy: [
      ['h', '{分析|ぶんせき}の {前|まえ}に {表|ひょう}を あわせる'],
      ['p', '{仕事|しごと}の データは {分|わ}かれています。{何|なに}が おきたか（{注文|ちゅうもん}・{来店|らいてん}）は 1つの {表|ひょう}、だれが したか（{会員|かいいん}・お{客|きゃく}）は べつの {表|ひょう}です。{人|ひと}の コードで JOIN し、{人|ひと}の {表|ひょう}の {列|れつ}で グループに します。'],
      ['li', ['INNER JOIN は、{両方|りょうほう}に {相手|あいて}が いる {行|ぎょう}だけ のこします', 'LEFT JOIN は、{最初|さいしょ}の {表|ひょう}の ぜんいんを のこします（{相手|あいて}が いないと NULL）', 'JOIN の あとは {数|かぞ}え{方|かた}に {注意|ちゅうい}：{注文|ちゅうもん}の {多|おお}い {人|ひと}は たくさんの {行|ぎょう}に なります']],
      ['h', 'お{客|きゃく}ごとに {見|み}る'],
      ['p', '{人|ひと}ごとに グループに すると、それぞれの {回数|かいすう}や {合計|ごうけい}が わかります。いちばんの お{客|きゃく}さんは だれか、もう {来|こ}なく なったのは だれか が わかります。'],
      ['p', '{下|した}の {図|ず}は、{人|ひと}の {表|ひょう}の {種類|しゅるい}ごとの {人数|にんずう}です。']
    ]
  },
  an_clean: {
    en: [
      ['h', 'Data cleaning'],
      ['p', 'Most of the time in real analysis goes into getting the data ready. Count first, look at the values, then tidy.'],
      ['li', ['Spelling: spaces at the ends, upper/lower case, full-width letters → TRIM, LOWER, REPLACE', 'Empty cells: decide what they mean. COALESCE(x, \'(none)\') shows them clearly; never silently fill numbers with 0', 'Duplicates: the same row twice (A2)', 'Numbers into groups: CASE WHEN → age bands, price ranges']],
      ['h', 'Making bands'],
      ['p', 'Choose band edges that people understand (round numbers) and that give groups that are not too small. Every value must fall into exactly one band: use < with the next edge.'],
      ['p', 'The chart shows how the place column is written now: the same place appears in several ways.']
    ],
    ja: [
      ['h', 'データクリーニング（前処理）'],
      ['p', '実際の分析では、時間の多くがデータの準備にかかります。まず数えて、値を見て、それから整えます。'],
      ['li', ['書き方のゆれ：前後の空白、大文字・小文字、全角 → TRIM、LOWER、REPLACE', '空欄：意味を決める。COALESCE(x, \'(none)\') ではっきり見せる。数をだまって 0 にしない', '重複：同じ行が2回（A2）', '数をグループに：CASE WHEN → 年代、価格帯']],
      ['h', '区分けの作り方'],
      ['p', '区切りは、人に分かりやすい数（きりのよい数）にし、小さすぎるグループができないようにします。どの値も必ず1つの区分に入るように、次の区切りとの < で書きます。'],
      ['p', '下の図は、場所の列の今の書かれ方です。同じ場所が何通りにも書かれています。']
    ],
    easy: [
      ['h', 'データクリーニング（{前処理|まえしょり}）'],
      ['p', 'ほんとうの {分析|ぶんせき}では、{時間|じかん}の {多|おお}くが データの {準備|じゅんび}に かかります。まず {数|かぞ}えて、{値|あたい}を {見|み}て、それから ととのえます。'],
      ['li', ['{書|か}き{方|かた}の ゆれ：{前後|ぜんご}の {空白|くうはく}、{大文字|おおもじ}・{小文字|こもじ} → TRIM、LOWER', '{空|から}：{意味|いみ}を きめる。COALESCE(x, \'(none)\') で はっきり {見|み}せる。{数|かず}を だまって 0 に しない', '{重複|ちょうふく}：{同|おな}じ {行|ぎょう}が 2{回|かい}（A2）', '{数|かず}を グループに：CASE WHEN → {年代|ねんだい}、{値段|ねだん}の はば']],
      ['h', '{区分|くわ}けの {作|つく}り{方|かた}'],
      ['p', '{区切|くぎ}りは わかりやすい {数|かず}に し、{小|ちい}さすぎる グループが できないように します。どの {値|あたい}も かならず 1つに {入|はい}るように、< で {書|か}きます。'],
      ['p', '{下|した}の {図|ず}は、{場所|ばしょ}の {列|れつ}の いまの {書|か}かれ{方|かた}です。{同|おな}じ {場所|ばしょ}が いろいろな {書|か}き{方|かた}に なっています。']
    ]
  }
});

const PY_OPEN2 = [...PY_OPEN, S('Read the second table too:', '2つめのテーブルも読み込みます：', '2つめの テーブルも {読|よ}みこみます：', 'people = pd.read_csv("{t2}.csv")\nm = df.merge(people, left_on="{name}", right_on="{jk}")\nm.head()')];
const XL_OPEN2 = [...XL_OPEN, S('Download the CSV of {t2} too, and make it a table named {t2} in the same workbook.', '{t2} の CSV もダウンロードし、同じブックに {t2} という名前のテーブルにします。', '{t2} の CSV も ダウンロードし、{同|おな}じ ブックに {t2} という {名前|なまえ}の テーブルに します。'),
  S('In {t}, add a column {pg} that looks up each person in {t2}:', '{t} に、{t2} から人を探して持ってくる列 {pg} を足します：', '{t} に、{t2} から {人|ひと}を さがして もってくる {列|れつ} {pg} を {足|た}します：', '=XLOOKUP([@{name}],{t2}[{jk}],{t2}[{pg}])')];
Object.assign(GUIDE, {
  an_cross: {
    rate: {
      excel: [...XL_OPEN, PIVOT('{g}', '{g} and {opt}'),
        S('Value Field Settings: Count for both (Count of {opt} counts only the filled cells). Next to the PivotTable: = with ÷ n × 100, rounded to 1 decimal place.', '値フィールドの設定：どちらも「個数」（{opt} の個数は、入力のあるセルだけを数えます）。ピボットテーブルの横に：入力あり ÷ 行数 × 100 を小数第1位で。', 'どちらも「{個数|こすう}」に します（{opt} の {個数|こすう}は、{入|はい}っている セルだけ {数|かぞ}えます）。{横|よこ}に {入|はい}っている{数|かず} ÷ {行|ぎょう}の{数|かず} × 100 を {計算|けいさん}します。', '=ROUND(100*C5/B5,1)')],
      python: [...PY_OPEN,
        S('Rows, filled {opt} and the share per {g}:', '{g} ごとの行数・{opt} の入力あり・割合：', '{g} ごとの {行|ぎょう}の {数|かず}・{opt} の {入|はい}っている {数|かず}・{割合|わりあい}：', 's = df.groupby("{g}").agg(n=("{opt}", "size"), with_{opt}=("{opt}", "count"))\ns["pct_{opt}"] = (100 * s["with_{opt}"] / s["n"]).round(1)\ns.sort_values("pct_{opt}", ascending=False)')]
    },
    pivot: {
      excel: [...XL_OPEN, S('Insert → PivotTable: {g} to Rows, {opt} to Columns, {g} to Values (Count). The columns {a1} and {a2} and the Grand Total are the answer.', '挿入 → ピボットテーブル：{g} を「行」、{opt} を「列」、{g} を「値」（個数）に。{a1} と {a2} の列と、総計が答えです。', '{挿入|そうにゅう} → ピボットテーブル：{g} を「{行|ぎょう}」、{opt} を「{列|れつ}」、{g} を「{値|あたい}」（{個数|こすう}）に。{a1} と {a2} の {列|れつ}と {総計|そうけい}が {答|こた}えです。'),
        S('Or with formulas (put the {g} name in A2):', '式でもできます（A2 に {g} の名前を入れた場合）：', '{式|しき}でも できます（A2 に {g} の {名前|なまえ}）：', '=COUNTIFS({t}[{g}],A2,{t}[{opt}],"{a1}")\n=COUNTIFS({t}[{g}],A2,{t}[{opt}],"{a2}")\n=COUNTIF({t}[{g}],A2)')],
      python: [...PY_OPEN,
        S('A cross table, the two columns, and the number of all rows:', 'クロス表から2つの列と、全部の行数：', 'クロス{表|ひょう}から 2つの {列|れつ}と、ぜんぶの {行|ぎょう}の {数|かず}：', 't = pd.crosstab(df["{g}"], df["{opt}"])[["{a1}", "{a2}"]]\nt["total"] = df.groupby("{g}").size()\nt')]
    },
    share: {
      excel: [...XL_OPEN, PIVOT('{g}', '{v} (2 times)'),
        S('Value Field Settings: Sum for both. For the second: Show Values As → % of Grand Total. Sort by it, largest first.', '値フィールドの設定：どちらも「合計」。2つめは「計算の種類」→ 総計に対する比率。大きい順に並べ替えます。', 'どちらも「{合計|ごうけい}」。2つめは「{計算|けいさん}の {種類|しゅるい}」→ {総計|そうけい}に {対|たい}する {比率|ひりつ}。{大|おお}きい {順|じゅん}に {並|なら}べ{替|か}えます。')],
      python: [...PY_OPEN,
        S('Total of {v} per {g} and its share of the whole:', '{g} ごとの {v} の合計と、全体に占める割合：', '{g} ごとの {v} の {合計|ごうけい}と ぜんたいの {中|なか}の {割合|わりあい}：', 's = df.groupby("{g}")["{v}"].sum().to_frame("total_{v}")\ns["share_pct"] = (100 * s["total_{v}"] / df["{v}"].sum()).round(1)\ns.sort_values("share_pct", ascending=False)')]
    }
  },
  an_trend: {
    month: {
      excel: [...XL_OPEN,
        S('Add a column month to the table:', 'テーブルに month の列を足します：', 'テーブルに month の {列|れつ}を {足|た}します：', '=TEXT([@{dt}],"yyyy-mm")'),
        PIVOT('month', '{v} (2 times)'),
        S('Value Field Settings: Count and Sum. Insert → Line chart to see the change.', '値フィールドの設定：「個数」と「合計」。挿入 → 折れ線グラフで変化を見ます。', '「{個数|こすう}」と「{合計|ごうけい}」に します。{挿入|そうにゅう} → {折|お}れ{線|せん}グラフで {変化|へんか}を {見|み}ます。')],
      python: [...PY_OPEN,
        S('The month is the first 7 characters of {dt} (2025-01):', '月は {dt} の最初の 7 文字（2025-01）です：', '{月|つき}は {dt} の {最初|さいしょ}の 7{文字|もじ}（2025-01）：', 'df["month"] = df["{dt}"].str[:7]\ndf.groupby("month")["{v}"].agg(["count", "sum"])'),
        S('Line chart:', '折れ線グラフ：', '{折|お}れ{線|せん}グラフ：', 'import matplotlib.pyplot as plt\ndf.groupby("month")["{v}"].sum().plot(marker="o"); plt.show()')]
    },
    mom: {
      excel: [...XL_OPEN, S('Add a column month: =TEXT([@{dt}],"yyyy-mm"), then a PivotTable with month in Rows and Sum of {v} in Values.', 'month の列（=TEXT([@{dt}],"yyyy-mm")）を足し、month を「行」、{v} の合計を「値」にしたピボットテーブルを作ります。', 'month の {列|れつ}を {足|た}し、month を「{行|ぎょう}」、{v} の {合計|ごうけい}を「{値|あたい}」に した ピボットテーブルを {作|つく}ります。'),
        S('Next to the second month, subtract the month above (and fill down):', '2か月目の横に、上の月を引く式を入れて下までコピーします：', '2か{月|げつ}{目|め}の {横|よこ}に、{上|うえ}の {月|つき}を ひく {式|しき}を {入|い}れて {下|した}まで コピー：', '=B6-B5')],
      python: [...PY_OPEN,
        S('Monthly totals and the difference from the month before:', '月ごとの合計と、前の月との差：', '{月|つき}ごとの {合計|ごうけい}と、{前|まえ}の {月|つき}との {差|さ}：', 's = df.groupby(df["{dt}"].str[:7])["{v}"].sum().to_frame("total_{v}")\ns["diff"] = s["total_{v}"].diff()\ns')]
    },
    ma: {
      excel: [...XL_OPEN, S('Make the monthly totals as above (month column + PivotTable).', '上と同じように月ごとの合計を作ります（month の列＋ピボットテーブル）。', '{月|つき}ごとの {合計|ごうけい}を {作|つく}ります（month の {列|れつ}＋ピボットテーブル）。'),
        S('Moving average: the mean of this month and up to 2 months before (start at the third month; the first two use what there is):', '移動平均：その月と前の2か月までの平均（3か月目から。最初の2か月はあるぶんだけ）：', '{移動平均|いどうへいきん}：その {月|つき}と {前|まえ}の 2か{月|げつ}までの {平均|へいきん}：', '=ROUND(AVERAGE(B5:B7),1)')],
      python: [...PY_OPEN,
        S('Monthly totals and the 3-month moving average:', '月ごとの合計と 3か月移動平均：', '{月|つき}ごとの {合計|ごうけい}と 3か{月|げつ} {移動平均|いどうへいきん}：', 's = df.groupby(df["{dt}"].str[:7])["{v}"].sum().to_frame("total_{v}")\ns["ma3"] = s["total_{v}"].rolling(3, min_periods=1).mean().round(1)\ns'),
        S('Both lines in one chart:', '2本の線を1つのグラフに：', '2{本|ほん}の {線|せん}を 1つの グラフに：', 'import matplotlib.pyplot as plt\ns.plot(marker="o"); plt.show()')]
    }
  },
  an_corr: {
    r: {
      excel: [...XL_OPEN,
        S('The number of rows and the correlation coefficient:', '行数と相関係数：', '{行|ぎょう}の {数|かず}と {相関係数|そうかんけいすう}：', '=ROWS({t})\n=ROUND(CORREL({t}[{v}],{t}[{v3}]),3)'),
        S('Scatter plot: select the {v} and {v3} columns → Insert → Scatter. Chart Elements → Trendline shows the best straight line.', '散布図：{v} と {v3} の列を選び、挿入 → 散布図。グラフ要素 → 近似曲線で直線を出せます。', '{散布図|さんぷず}：{v} と {v3} の {列|れつ}を {選|えら}び、{挿入|そうにゅう} → {散布図|さんぷず}。{近似曲線|きんじきょくせん}で {線|せん}を {出|だ}せます。')],
      python: [...PY_OPEN,
        S('The number of rows and the correlation coefficient (Pearson):', '行数と相関係数（ピアソン）：', '{行|ぎょう}の {数|かず}と {相関係数|そうかんけいすう}：', 'print(len(df), round(df["{v}"].corr(df["{v3}"]), 3))'),
        S('Scatter plot:', '散布図：', '{散布図|さんぷず}：', 'import matplotlib.pyplot as plt\ndf.plot.scatter(x="{v}", y="{v3}"); plt.show()')]
    },
    group: {
      excel: [...XL_OPEN,
        S('For each {g} (its name in A2), with FILTER (Microsoft 365):', '{g} ごとに（A2 に名前を入れた場合）、FILTER を使って（Microsoft 365）：', '{g} ごとに（A2 に {名前|なまえ}）、FILTER を {使|つか}って：', '=COUNTIF({t}[{g}],A2)\n=ROUND(CORREL(FILTER({t}[{v}],{t}[{g}]=A2),FILTER({t}[{v3}],{t}[{g}]=A2)),3)')],
      python: [...PY_OPEN,
        S('Rows and r per {g}, the largest first:', '{g} ごとの行数と r（大きい順）：', '{g} ごとの {行|ぎょう}の {数|かず}と r：', 'rows = []\nfor name, x in df.groupby("{g}"):\n    rows.append((name, len(x), round(x["{v}"].corr(x["{v3}"]), 3)))\npd.DataFrame(rows, columns=["{g}", "n", "r"]).sort_values("r", ascending=False)')]
    }
  },
  an_compare: {
    diff: {
      excel: [...XL_OPEN,
        S('Add a column has_{opt}:', 'テーブルに has_{opt} の列を足します：', 'テーブルに has_{opt} の {列|れつ}を {足|た}します：', '=IF([@{opt}]="","no","yes")'),
        PIVOT('has_{opt}', '{v} (2 times)'),
        S('Value Field Settings: Count and Average (1 decimal place).', '値フィールドの設定：「個数」と「平均」（小数第1位）。', '「{個数|こすう}」と「{平均|へいきん}」（{小数|しょうすう} 1けた）。')],
      python: [...PY_OPEN,
        S('With and without {opt}: rows and mean of {v}:', '{opt} のあり・なしで、行数と {v} の平均：', '{opt} の あり・なしで、{行|ぎょう}の {数|かず}と {v} の {平均|へいきん}：', 'df["has_{opt}"] = df["{opt}"].notna().map({True: "yes", False: "no"})\ndf.groupby("has_{opt}")["{v}"].agg(["count", "mean"]).round(1)'),
        S('Box plot of the two groups:', '2つのグループの箱ひげ図：', '2つの グループの {箱|はこ}ひげ{図|ず}：', 'import matplotlib.pyplot as plt\ndf.boxplot(column="{v}", by="has_{opt}"); plt.show()')]
    },
    above: {
      excel: [...XL_OPEN,
        S('Add a column above (1 when {v} is larger than the mean of the whole table):', '列 above を足します（{v} が全体の平均より大きいとき 1）：', '{列|れつ} above を {足|た}します（{平均|へいきん}より {大|おお}きいと 1）：', '=IF([@{v}]>AVERAGE([{v}]),1,0)'),
        PIVOT('{g}', 'above (2 times)'),
        S('Value Field Settings: Count, and Average × 100 (as %, 1 decimal place).', '値フィールドの設定：「個数」と「平均」（% 表示、小数第1位）。', '「{個数|こすう}」と「{平均|へいきん}」（% で、{小数|しょうすう} 1けた）。')],
      python: [...PY_OPEN,
        S('Share of rows above the overall mean, per {g}:', '{g} ごとの、全体の平均より上の割合：', '{g} ごとの、ぜんたいの {平均|へいきん}より {上|うえ}の {割合|わりあい}：', 'm = df["{v}"].mean()\ns = df.groupby("{g}")["{v}"].agg(n="size", pct_above=lambda x: round(100 * (x > m).mean(), 1))\ns.sort_values("pct_above", ascending=False)')]
    },
    top1: {
      excel: [...XL_OPEN,
        S('The largest {v} of each {g} (name in A2), and its {id}:', '{g} ごと（A2 に名前）の最大の {v} と、その {id}：', '{g} ごとの いちばん {大|おお}きい {v} と、その {id}：', '=MAXIFS({t}[{v}],{t}[{g}],A2)\n=XLOOKUP(1,({t}[{g}]=A2)*({t}[{v}]=B2),{t}[{id}])')],
      python: [...PY_OPEN,
        S('The row with the largest {v} in each {g}:', '{g} ごとに {v} がいちばん大きい行：', '{g} ごとに {v} が いちばん {大|おお}きい {行|ぎょう}：', 'df.loc[df.groupby("{g}")["{v}"].idxmax(), ["{g}", "{id}", "{v}"]].sort_values("{g}")')]
    }
  },
  an_join: {
    plan: {
      excel: [...XL_OPEN2, PIVOT('{pg}', '{v} (3 times)'),
        S('Value Field Settings: Count, Sum and Average. Sort by the sum, largest first.', '値フィールドの設定：「個数」「合計」「平均」。合計の大きい順に並べ替えます。', '「{個数|こすう}」「{合計|ごうけい}」「{平均|へいきん}」。{合計|ごうけい}の {大|おお}きい {順|じゅん}に。')],
      python: [...PY_OPEN2,
        S('Rows, total and mean of {v} per {pg}:', '{pg} ごとの行数・{v} の合計・平均：', '{pg} ごとの {行|ぎょう}の {数|かず}・{合計|ごうけい}・{平均|へいきん}：', 'm.groupby("{pg}")["{v}"].agg(["count", "sum", "mean"]).round(1).sort_values("sum", ascending=False)')]
    },
    best: {
      excel: [...XL_OPEN2, PIVOT('{name} and {pg}', '{v} (2 times)'),
        S('Value Field Settings: Count and Sum. Sort by the sum, largest first, and look at the top 5. (Design → Report Layout → Tabular Form puts {pg} next to {name}.)', '値フィールドの設定：「個数」と「合計」。合計の大きい順に並べ、上の 5 人を見ます（デザイン → レポートのレイアウト → 表形式 で {pg} が横に並びます）。', '「{個数|こすう}」と「{合計|ごうけい}」。{合計|ごうけい}の {大|おお}きい {順|じゅん}に ならべ、{上|うえ}の 5{人|にん}を {見|み}ます。')],
      python: [...PY_OPEN2,
        S('Number and total per person, the 5 largest:', '人ごとの回数と合計、大きい 5 人：', '{人|ひと}ごとの {回数|かいすう}と {合計|ごうけい}、{大|おお}きい 5{人|にん}：', 'm.groupby(["{name}", "{pg}"])["{v}"].agg(["count", "sum"]).sort_values("sum", ascending=False).head(5)')]
    },
    none: {
      excel: [...XL_OPEN, S('Download the CSV of {t2} too, and make it a table named {t2}.', '{t2} の CSV もダウンロードし、{t2} という名前のテーブルにします。', '{t2} の CSV も ダウンロードし、{t2} という {名前|なまえ}の テーブルに します。'),
        S('In {t2}, add a column that counts each person in {t}:', '{t2} に、{t} に出てくる回数を数える列を足します：', '{t2} に、{t} に {出|で}てくる {回数|かいすう}を {数|かぞ}える {列|れつ}を {足|た}します：', '=COUNTIF({t}[{name}],[@{jk}])'),
        S('Filter that column to 0, then count the people of each {pg} (or use a PivotTable with the filter).', 'その列を 0 で絞り込み、{pg} ごとに人数を数えます（ピボットテーブルにフィルターを付けても OK）。', 'その {列|れつ}を 0 で しぼりこみ、{pg} ごとに {人数|にんずう}を {数|かぞ}えます。')],
      python: [...PY_OPEN,
        S('People who never appear in {t}, per {pg}:', '{t} に一度も出てこない人を {pg} ごとに：', '{t} に {一度|いちど}も {出|で}てこない {人|ひと}を {pg} ごとに：', 'people = pd.read_csv("{t2}.csv")\nnever = people[~people["{jk}"].isin(df["{name}"])]\nnever.groupby("{pg}").size()')]
    }
  },
  an_clean: {
    band: {
      excel: [...XL_OPEN,
        S('Add a column band:', 'テーブルに band の列を足します：', 'テーブルに band の {列|れつ}を {足|た}します：', '=IFS([@{a}]<{c1},"{l1}",[@{a}]<{c2},"{l2}",TRUE,"{l3}")'),
        PIVOT('band', 'band')],
      python: [...PY_OPEN,
        S('Bands with numpy.select (conditions are checked in order):', 'numpy.select で区分け（条件は上から順に調べます）：', 'numpy.select で {区分|くわ}け（{上|うえ}から {順|じゅん}に しらべます）：', 'import numpy as np\ndf["band"] = np.select([df["{a}"] < {c1}, df["{a}"] < {c2}], ["{l1}", "{l2}"], "{l3}")\ndf.groupby("band").size()')]
    },
    clean: {
      excel: [...XL_OPEN,
        S('First look: Insert → PivotTable with {pref} in Rows and Values. The same place appears several times.', 'まず見る：{pref} を「行」と「値」にしたピボットテーブル。同じ場所が何回も出てきます。', 'まず {見|み}る：{pref} の ピボットテーブル。{同|おな}じ {場所|ばしょ}が {何回|なんかい}も {出|で}てきます。'),
        S('Add a column {pref}_clean and make the PivotTable from it:', '列 {pref}_clean を足し、それでピボットテーブルを作ります：', '{列|れつ} {pref}_clean を {足|た}し、それで ピボットテーブルを {作|つく}ります：', '=LOWER(TRIM([@{pref}]))')],
      python: [...PY_OPEN,
        S('Before and after:', '整える前と後：', 'ととのえる {前|まえ}と {後|あと}：', 'print(df["{pref}"].value_counts())\ndf["{pref}_clean"] = df["{pref}"].str.strip().str.lower()\ndf["{pref}_clean"].value_counts()')]
    },
    fill: {
      excel: [...XL_OPEN,
        S('Add a column {opt}_filled, then a PivotTable with it in Rows and Values:', '列 {opt}_filled を足し、それを「行」と「値」にしたピボットテーブル：', '{列|れつ} {opt}_filled を {足|た}して、ピボットテーブルに します：', '=IF([@{opt}]="","(none)",[@{opt}])')],
      python: [...PY_OPEN,
        S('Fill the empty cells, then count:', '空欄を埋めてから数えます：', '{空|から}を うめてから {数|かぞ}えます：', 'df["{opt}"].fillna("(none)").value_counts()')]
    }
  }
});
