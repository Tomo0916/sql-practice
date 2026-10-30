"""Front and back matter of the data-analysis volume: cover, how to use, course map, contents, data, answers."""
from build import J, B, H, ruby, esc, table_html, run, sql, qr, APP_URL, color
from front_common import page, LEVEL_INFO
from content_analysis import UNITS, ANSWERS

FIRST_UNIT_PAGE = 6

# ---------------------------------------------------------------- cover
def cover():
    q = "-- How much does a typical order cost?\nSELECT ROUND(AVG(amount), 1) AS mean,\n       (SELECT amount FROM kumo_orders\n        ORDER BY amount LIMIT 1 OFFSET 200) AS median\nFROM kumo_orders;"
    cols, rows = run(q)
    lines = ''.join(f'<div class="cv-line"><span class="cv-no">{i + 1}</span><span class="cv-code">{color(esc(l))}</span></div>' for i, l in enumerate(q.split('\n')))
    tools = ''.join(f'<span class="cv-lv on" style="--x:{c}">{t}<small>{s}</small></span>' for t, s, c in
                    [('SQL', 'app', '#c2410c'), ('Excel', 'Microsoft 365', '#1d7a46'), ('Python', 'pandas', '#2f5fe0')])
    th = ''.join(f'<th>{esc(c)}</th>' for c in cols)
    trs = ''.join('<tr>' + ''.join(f'<td>{esc(str(v))}</td>' for v in r) + '</tr>' for r in rows)
    return page(f'''
    <div class="cv-top"><span class="cv-brand">Data Analysis Textbook</span><div class="cv-steps">{tools}</div></div>
    <h1 class="cv-title">{ruby("データ{分析|ぶんせき}の{教科書|きょうかしょ}")}</h1>
    <div class="cv-vol"><b>{ruby("{第|だい} 1 {部|ぶ}・{第|だい} 2 {部|ぶ}")}</b><span>Part 1–2 · Unit A1–A6</span></div>
    {B(("{数字|すうじ}の{裏|うら}にある{事実|じじつ}を、3 つの{道具|どうぐ}で{確|たし}かめる。", "Find the facts behind the numbers, and check them with three tools."), cls="cv-sub")}
    <div class="cv-editor">
      <div class="cv-bar"><i></i><i></i><i></i><span>kumo_mart.sql</span></div>
      <div class="cv-body">{lines}</div>
      <div class="cv-res"><div class="cv-res-cap">{ruby("{結果|けっか}")} <b>1 row</b></div>
        <table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>
    </div>
    <div class="cover-name"><div><span>No.</span></div><div><span>{ruby("{名前|なまえ}")} <small>Name</small></span></div></div>''', 'cover')

# ---------------------------------------------------------------- how to use
def howto():
    parts1 = [('①', ('{依頼|いらい}とゴール', 'Request and goal'), ('クモマートの{誰|だれ}かからの{依頼|いらい}と、この Unit でできるようになること。', 'A request from someone at Kumo Mart, and what you will be able to do.')),
              ('②', ('{統計|とうけい}の{基礎|きそ}', 'Statistics basics'), ('{式|しき}の{意味|いみ}を、{本当|ほんとう}のデータで{描|か}いた{図|ず}で{見|み}る。', 'The meaning of the formula, with a figure drawn from the real data.')),
              ('③', ('{見|み}てみる', 'See it'), ('クモマートのデータで SQL を{実行|じっこう}した{結果|けっか}。', 'The SQL run on the Kumo Mart data, and its result.'))]
    parts2 = [('④', ('ポイント・よくある{間違|まちが}い', 'Points, common mistakes'), ('✕ の SQL を{実行|じっこう}するとどうなるか。', 'What happens when the ✕ SQL runs.')),
              ('⑤', ('Excel・Python', 'Excel, Python'), ('{同|おな}じ{問|と}いを Excel と Python でも{解|と}く。{同|おな}じ{数字|すうじ}が{出|で}れば{正解|せいかい}。', 'Solve the same question in Excel and Python. The same numbers mean you are right.')),
              ('⑥', ('やってみよう', 'Try it'), ('{別|べつ}の{業種|ぎょうしゅ}のデータで{練習|れんしゅう}。{答|こた}えは{巻末|かんまつ}。', 'Practise on data from other businesses. Answers are at the back.'))]
    def col(title, parts):
        return f'<div class="how-page"><h3>{J(title[0])}<span class="en">{title[1]}</span></h3>' + ''.join(
            f'<div class="how-part"><span class="how-n">{n}</span><div><b>{J(t[0])}</b><span class="en">{t[1]}</span>{B(d)}</div></div>' for n, t, d in parts) + '</div>'
    flow = ''.join(f'<li><b>{ruby(ja)}</b><span class="en">{en}</span></li>' for ja, en in
                   [('{問|と}う', 'Ask'), ('{集|あつ}める', 'Collect'), ('{整|ととの}える', 'Clean'), ('{分析|ぶんせき}する', 'Analyse'), ('{伝|つた}える', 'Share')])
    return page(H('この{本|ほん}の{使|つか}い{方|かた}', 'How to use this book')
        + B(('1 つの Unit は{見開|みひら}き 2 ページ。アプリで SQL を{書|か}き、{同|おな}じ{問|と}いを Excel と Python でも{解|と}く。', 'Each unit is a two-page spread. Write the SQL in the app, then solve the same question in Excel and Python.'), cls='lead')
        + f'<div class="how-spread">{col(("{左|ひだり}のページ", "left page"), parts1)}{col(("{右|みぎ}のページ", "right page"), parts2)}</div>'
        + f'<div class="box">{H("{分析|ぶんせき}の{流|なが}れ", "The analysis process")}<ol class="aflow">{flow}</ol>'
        + B(('どの Unit も、この{流|なが}れのどこかを{練習|れんしゅう}している。{用語|ようご}は{英語|えいご}も{一緒|いっしょ}に{覚|おぼ}えると、{英語|えいご}の{資格試験|しかくしけん}もそのまま{読|よ}める。', 'Every unit practises part of this process. Learn the English terms too, so you can read English certification exams.'), cls='mt') + '</div>'
        + f'<div class="how-row"><div class="box">{H("CSV と{道具|どうぐ}", "CSV and tools")}<ul class="marks">'
        + ''.join(f'<li><span class="mk"><span class="tool-ic {c}">{i}</span></span>{B(t)}</li>' for i, c, t in [
            ('SQL', 'sq', ('アプリの「データ{分析|ぶんせき}」の{章|しょう}。{問題|もんだい}の{下|した}のボタンで Excel・Python のガイドが{開|ひら}く。', 'The “Data analysis” chapter of the app. The buttons under each problem open the Excel and Python guides.')),
            ('X', 'xl', ('Excel は Microsoft 365。{表|ひょう}の「CSV」ボタンで{保存|ほぞん}したファイルを{開|ひら}く。', 'Excel is Microsoft 365. Open the file saved with the CSV button of the table.')),
            ('Py', 'py', ('Python は VS Code か Jupyter。pandas・matplotlib を{使|つか}う。ガイドからノートブックも{保存|ほぞん}できる。', 'Python runs in VS Code or Jupyter with pandas and matplotlib. The guide can also save a notebook.'))])
        + f'</ul></div><div class="how-app"><div class="hqr">{qr(APP_URL)}</div><div>'
        + B(('{各|かく} Unit のページの QR コードで、アプリのその Unit が{開|ひら}く。', 'The QR code on each unit opens that unit in the app.')) + '</div></div></div>')

# ---------------------------------------------------------------- course map
PARTS = [
    (('データと{向|む}き{合|あ}う{準備|じゅんび}', 'Getting ready'), [('1', 'データの{全体|ぜんたい}を{見|み}る', 'Get to know the data'), ('2', '{欠損値|けっそんち}と{重複|ちょうふく}', 'Missing values, duplicates')]),
    (('1 つの{数値|すうち}を{要約|ようやく}する', 'Summarise one number'), [('3', '{平均|へいきん}と{中央値|ちゅうおうち}', 'Mean, median, mode'), ('4', '{散|ち}らばり', 'Spread'), ('5', '{度数分布|どすうぶんぷ}', 'Histograms'), ('6', '{標準化|ひょうじゅんか}と{外|はず}れ{値|ち}', 'z-scores, outliers')]),
    (('{比|くら}べる・{組|く}み{合|あ}わせる', 'Compare and combine'), [('7', 'グループの{比較|ひかく}', 'Compare groups'), ('8', '{構成比|こうせいひ}とパレート{図|ず}', 'Shares, Pareto'), ('9', 'クロス{集計|しゅうけい}', 'Cross tables'), ('10', '{表|ひょう}を{結合|けつごう}する', 'Joining tables')]),
    (('{時間|じかん}で{見|み}る', 'Over time'), [('11', '{月|つき}ごとの{動|うご}き', 'Monthly trends'), ('12', '{前年比|ぜんねんひ}と{移動平均|いどうへいきん}', 'Growth, moving averages'), ('13', '{順位|じゅんい}', 'Ranking'), ('14', 'リピート{率|りつ}', 'Retention')]),
    (('{関係|かんけい}を{調|しら}べる', 'Relationships'), [('15', '{相関|そうかん}', 'Correlation'), ('16', '{回帰|かいき}と{予測|よそく}', 'Regression')]),
    (('{確|たし}からしさを{判断|はんだん}する', 'Inference'), [('17', '{確率分布|かくりつぶんぷ}', 'Distributions'), ('18', '{推定|すいてい}', 'Estimation'), ('19', 'A/B テスト', 'A/B tests'), ('20', 'カイ{二乗|にじょう}{検定|けんてい}', 'Chi-square test')]),
    (('{伝|つた}える・{総合|そうごう}', 'Share, project'), [('21', 'グラフを{正|ただ}しく{読|よ}む', 'Reading charts'), ('22', '{総合|そうごう}プロジェクト', 'Final project')]),
]

CAN_DO = [
    ('{列|れつ}の{種類|しゅるい}（{量的|りょうてき}・{質的|しつてき}）を{言|い}える', 'name the kind of each column', 'A1'),
    ('{欠損率|けっそんりつ}と{重複|ちょうふく}を{数|かぞ}えて{報告|ほうこく}できる', 'report missing values and duplicates', 'A2'),
    ('{平均|へいきん}・{中央値|ちゅうおうち}・{最頻値|さいひんち}を{使|つか}い{分|わ}けられる', 'choose between mean, median and mode', 'A3'),
    ('{標準偏差|ひょうじゅんへんさ}で{散|ち}らばりを{比|くら}べられる', 'compare spread with the standard deviation', 'A4'),
    ('{度数分布表|どすうぶんぷひょう}を{作|つく}り、{形|かたち}を{読|よ}める', 'make a frequency table and read its shape', 'A5'),
    ('z {得点|とくてん}で{外|はず}れ{値|ち}の{候補|こうほ}を{見|み}つけられる', 'find outlier candidates with z-scores', 'A6'),
]

def map_page():
    cards = ''
    for i, ((ja, en), units) in enumerate(PARTS):
        lis = ''.join(f'<li class="{"now" if int(n) <= 6 else ""}"><span class="cm-n">A{n}</span>{B((t, e))}</li>' for n, t, e in units)
        cards += f'<div class="cm-card{" now" if i < 2 else ""}"><div class="cm-h"><b>{ruby(f"{{第|だい}} {i + 1} {{部|ぶ}}")}</b>{J(ja)}<span class="en">Part {i + 1} · {esc(en)}</span></div><ol>{lis}</ol></div>'
    items = ''.join(f'<li><span class="cb"></span>{B((ja, en))}<span class="cd-l">{n}</span></li>' for ja, en, n in CAN_DO)
    return page(H('{講座|こうざ}の{地図|ちず}', 'Course map')
        + B(('{全|ぜん} 22 Unit・7 {部|ぶ}で、{基礎統計|きそとうけい}を{一通|ひととお}り{学|まな}ぶ。この{本|ほん}は{色|いろ}のついた{第|だい} 1 {部|ぶ}・{第|だい} 2 {部|ぶ}。', '22 units in 7 parts cover basic statistics. This book is the coloured Parts 1 and 2.'), cls='lead')
        + f'<div class="cmap">{cards}</div>'
        + f'<div class="box"><h2>{J("この{本|ほん}でできるようになること")}<small>What you will be able to do</small></h2>'
        + B(('できるようになったら、□ にチェックを{入|い}れよう。', 'Tick each box when you can do it.'), cls='mt') + f'<ul class="cando">{items}</ul></div>')

def toc():
    out = ''
    for (ja, en), nos in [(('データと{向|む}き{合|あ}う{準備|じゅんび}', 'Part 1 · Getting ready'), [0, 1]), (('1 つの{数値|すうち}を{要約|ようやく}する（{記述統計|きじゅつとうけい}）', 'Part 2 · Summarise one number (descriptive statistics)'), [2, 3, 4, 5])]:
        out += f'<li class="toc-g">{J(ja)}<span class="en">{en}</span></li>'
        for i in nos:
            U = UNITS[i]
            out += (f'<li><span class="toc-n">Unit {U["no"]}</span><span class="toc-t">{ruby(U["title"][0])}<span class="en">{esc(U["title"][1])}</span></span>'
                    f'<span class="toc-dots"></span><span class="toc-p">p.{FIRST_UNIT_PAGE + 2 * i}</span></li>')
    out += f'<li class="toc-g">{J("{答|こた}え")}<span class="en">Answers</span></li><li><span class="toc-n"></span><span class="toc-t">{ruby("やってみようの{答|こた}え")}<span class="en">Answers to “Try it”</span></span><span class="toc-dots"></span><span class="toc-p">p.{FIRST_UNIT_PAGE + 2 * len(UNITS)}</span></li>'
    return page(H('{目次|もくじ}', 'Contents') + f'<ol class="toc2">{out}</ol>')

# ---------------------------------------------------------------- data
COLS = [('order_id', ('{注文|ちゅうもん}{番号|ばんごう}', 'order number')), ('order_date', ('{注文日|ちゅうもんび}（2025 {年|ねん}）', 'order date (2025)')),
        ('store', ('{店|みせ}（Shibuya・Umeda・Sakae・Online）', 'store')), ('customer_id', ('{客|きゃく}の{番号|ばんごう}（{同|おな}じ{客|きゃく}が{何度|なんど}も{買|か}う）', 'customer (repeats)')),
        ('amount', ('{金額|きんがく}（{円|えん}）', 'amount (yen)')), ('items', ('{買|か}った{点数|てんすう}', 'number of items')), ('coupon', ('{使|つか}ったクーポン（{空欄|くうらん}あり）', 'coupon used (may be blank)'))]
PRACTICE = [('cafe_sales', ('カフェの{売上|うりあげ}', 'cafe sales')), ('hotel_stays', ('ホテルの{宿泊|しゅくはく}', 'hotel stays')), ('courier_jobs', ('{宅配|たくはい}の{料金|りょうきん}', 'courier jobs')),
            ('helpdesk_tickets', ('IT ヘルプデスクの{対応|たいおう}', 'IT help desk tickets')), ('gym_visits', ('ジムの{利用|りよう}', 'gym visits')), ('factory_lots', ('{工場|こうじょう}の{製品|せいひん}{検査|けんさ}', 'factory quality checks'))]

def data_page():
    cols, rows = run('SELECT * FROM kumo_orders LIMIT 8')
    n = run('SELECT COUNT(*) FROM kumo_orders')[1][0][0]
    desc = ''.join(f'<tr><td class="code">{c}</td><td>{B(t)}</td></tr>' for c, t in COLS)
    pr = ''.join(f'<tr><td class="code">{t}</td><td>{B(d)}</td><td class="r">{run(f"SELECT COUNT(*) FROM {t}")[1][0][0]}</td><td class="cols">{esc(", ".join(run(f"SELECT * FROM {t} LIMIT 0")[0]))}</td></tr>' for t, d in PRACTICE)
    return page(H('クモマートのデータ', 'The Kumo Mart data')
        + B(('クモマート（Kumo Mart）は、3 つの{店|みせ}とネット{通販|つうはん}を{持|も}つ{架空|かくう}の{会社|かいしゃ}。{例題|れいだい}はすべてこのデータを{使|つか}う。アプリと{同|おな}じデータなので、{結果|けっか}を{確|たし}かめられる。', 'Kumo Mart is a made-up company with three stores and an online shop. All examples use its data, which is the same as in the app.'), cls='lead')
        + f'<div class="bdata"><h4><code>kumo_orders</code>{B(("{注文|ちゅうもん}（{全部|ぜんぶ}で " + str(n) + " {行|ぎょう}、{最初|さいしょ}の 8 {行|ぎょう}）", f"orders ({n} rows, the first 8)"))}</h4>{table_html(cols, rows)}</div>'
        + f'<table class="minitable coldesc"><tbody>{desc}</tbody></table>'
        + B(('{顧客名簿|こきゃくめいぼ} kumo_customers（customer_id・joined_date・city・name・points・age・email）は A2 で{使|つか}う。', 'The customer list kumo_customers is used in A2.'), cls='mt')
        + f'<h3 class="sub-h">{J("{練習|れんしゅう}で{使|つか}う{表|ひょう}")}<span class="en">Tables for practice</span></h3>'
        + B(('「やってみよう」とアプリの{演習|えんしゅう}では、{別|べつ}の{業種|ぎょうしゅ}のデータで{同|おな}じ{方法|ほうほう}を{使|つか}う。', 'In “Try it” and in the app, the same methods are used on data from other businesses.'))
        + f'<table class="minitable practice"><thead><tr><th>{J("{表|ひょう}")}<span class="en">table</span></th><th>{J("{内容|ないよう}")}<span class="en">about</span></th><th>{J("{行数|ぎょうすう}")}<span class="en">rows</span></th><th>{J("{列|れつ}")}<span class="en">columns</span></th></tr></thead><tbody>{pr}</tbody></table>')

def front():
    return cover() + howto() + map_page() + toc() + data_page()

# ---------------------------------------------------------------- answers
def back():
    def item(no, i, t):
        if t.get('answer'):
            cols, rows = run(t['answer'])
            more = f'<div class="more">… {J(f"{{全部|ぜんぶ}}で {len(rows)} {{行|ぎょう}}")}</div>' if len(rows) > 6 else ''
            body = sql(t['answer']) + f'<div class="ans-res">{table_html(cols, rows[:6])}{more}</div>'
        else:
            body = B(MANUAL[(no, i)])
        return f'<div class="ans-item"><div class="ans-no">{no}-{i}</div><div class="ans-body">{body}</div></div>'
    half = [a for a in ANSWERS if a[0] in ('A1', 'A2', 'A3')], [a for a in ANSWERS if a[0] not in ('A1', 'A2', 'A3')]   # one page each
    head = H('やってみようの{答|こた}え', 'Answers to “Try it”') + B(('{結果|けっか}は{上|うえ}の 6 {行|ぎょう}まで。{別|べつ}の{書|か}き{方|かた}でも、{同|おな}じ{結果|けっか}なら{正解|せいかい}。', 'Results show up to 6 rows. A different SQL with the same result is also right.'), cls='lead')
    return (page('<span class="marker">@@LESSONEND@@</span>' + head + f'<div class="answers">{"".join(item(*a) for a in half[0])}</div>', 'answers')
            + page(f'<div class="answers">{"".join(item(*a) for a in half[1])}</div>', 'answers'))

MANUAL = {
    ('A1', 3): ('ID：visit_id ／ {日付|ひづけ}：visit_date ／ {質的|しつてき}：branch・member_id・trainer ／ {量的|りょうてき}：minutes・machines', 'ID: visit_id / date: visit_date / qualitative: branch, member_id, trainer / quantitative: minutes, machines'),
    ('A6', 3): ('{偏差値|へんさち} = 50 + 10 × 1.5 = 65', 'T-score = 50 + 10 × 1.5 = 65'),
}
