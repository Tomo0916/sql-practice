"""Front matter of the Beginner volume: cover, how to use, map, contents, example tables (p.1–5)."""
from build import J, B, H, ruby, esc, table_html, run, sql, qr, APP_URL
from content_beginner import LESSONS

FIRST_LESSON_PAGE = 6

def page(body, cls=''):
    return f'<section class="fpage {cls}"><div class="fit">{body}</div></section>'

def pyramid(on='beginner'):
    bands = [
        ('goal', '{一人前|いちにんまえ}', 'Graduation project (Lesson 48)', '{卒業|そつぎょう}{制作|せいさく}'),
        ('advanced', '{上級|じょうきゅう}：{作|つく}る・{守|まも}る・{設計|せっけい}する', 'Advanced: build, protect, design (Lessons 36–47)', 'CREATE・{制約|せいやく}・{権限|けんげん}・{正規化|せいきか}'),
        ('intermediate', '{中級|ちゅうきゅう}：{組|く}み{立|た}てる', 'Intermediate: combine (Lessons 19–35)', '{関数|かんすう}・サブクエリ・{結合|けつごう}'),
        ('beginner', '{初級|しょきゅう}：{読|よ}む・{変|か}える', 'Beginner: read and change (Lessons 0–18)', 'SELECT・WHERE・{集計|しゅうけい}・INSERT'),
    ]
    out = ''
    for i, (k, ja, en, sub) in enumerate(bands):
        out += f'<div class="pyr-band {k}{" on" if k == on else ""}" style="--i:{i}"><b>{ruby(ja)}</b><span class="pyr-sub">{ruby(sub)}</span><span class="en">{esc(en)}</span></div>'
    return f'<div class="pyr">{out}<div class="pyr-band base" style="--i:4"><b>{ruby("{土台|どだい}：データベースとは")}</b><span class="en">Foundation: what a database is (Lesson 0)</span></div></div>'

def cover():
    return page(f'''<div class="cover-top"><div class="cover-mark">SQL</div><div class="cover-lv">{ruby("{初級|しょきゅう}{編|へん}")}<small>Beginner</small></div></div>
    <h1 class="cover-title">{ruby("SQL {教科書|きょうかしょ}")}</h1>
    <p class="cover-en">SQL Textbook</p>
    {B(("さわって{覚|おぼ}える、データベースの{言葉|ことば}。", "Learn the language of databases by using it."), cls="cover-sub")}
    <div class="cover-pyr">{pyramid()}</div>
    <div class="cover-name"><div><span>No.</span></div><div><span>{ruby("{名前|なまえ}")} <small>Name</small></span></div></div>''', 'cover')

def howto():
    parts1 = [('①', ('できるようになること', 'What you will be able to do'), ('この Lesson のゴール。', 'The goal of the Lesson.')),
              ('②', ('{構文|こうぶん}', 'Syntax'), ('{句|く}ごとの{書|か}き{方|かた}。{新|あたら}しい{句|く}は{色|いろ}つき。', 'How to write each clause. New clauses are coloured.')),
              ('③', ('{見|み}てみる', 'See it'), ('{例|れい}の SQL と、{実行|じっこう}の{前|まえ}と{後|あと}の{表|ひょう}。', 'An example and the table before and after it runs.'))]
    parts2 = [('④', ('ポイント', 'Points'), ('{大事|だいじ}なことを 3 つまで。', 'Up to three key points.')),
              ('⑤', ('よくある{間違|まちが}い', 'Common mistakes'), ('✕ {間違|まちが}った SQL → {実行|じっこう}するとどうなるか → ○ {正|ただ}しい SQL。', '✕ wrong SQL → what happens → ○ correct SQL.')),
              ('⑥', ('やってみよう', 'Try it'), ('{自分|じぶん}で{書|か}く{問題|もんだい}。{結果|けっか}の{行数|ぎょうすう}で{答|こた}え{合|あ}わせ。', 'Write SQL yourself; check with the number of result rows.'))]
    def col(title, parts):
        return f'<div class="how-page"><h3>{J(title[0])}<span class="en">{title[1]}</span></h3>' + ''.join(
            f'<div class="how-part"><span class="how-n">{n}</span><div><b>{J(t[0])}</b><span class="en">{t[1]}</span>{B(d)}</div></div>' for n, t, d in parts) + '</div>'
    marks = [('<span class="x">✕</span>', ('{間違|まちが}った SQL', 'wrong SQL')), ('<span class="o">○</span>', ('{正|ただ}しい SQL', 'correct SQL')),
             ('<span class="mk-lost">Wireless Mouse Pro</span>', ('{消|き}えてしまった{行|ぎょう}', 'a row that went missing')),
             ('<span class="mk-extra">Coffee Maker</span>', ('{余分|よぶん}に{入|はい}った{行|ぎょう}', 'an extra row')),
             ('<span class="dialect-tag">DB</span>', ('データベースごとのちがい', 'differences between databases'))]
    mk = ''.join(f'<li><span class="mk">{m}</span>{B(t)}</li>' for m, t in marks)
    flow = [('3', ('{先生|せんせい}が「{見|み}てみる」を{見|み}せる', 'The teacher shows “See it”')),
            ('10', ('アプリで{練習|れんしゅう}する', 'Practise in the app')),
            ('2', ('「よくある{間違|まちが}い」をみんなで{確|たし}かめる', 'Check the common mistakes together'))]
    fl = ''.join(f'<div class="how-flow-step"><span class="how-min">{m}<small>{ruby("{分|ふん}")}</small></span>{B(t)}</div>' for m, t in flow)
    return page(H('この{本|ほん}の{使|つか}い{方|かた}', 'How to use this book')
        + B(('1 つの Lesson は、{見開|みひら}き 2 ページ。{左|ひだり}のページで{見|み}て、{右|みぎ}のページで{確|たし}かめて{書|か}く。', 'Each Lesson is a two-page spread: look on the left page, check and write on the right page.'), cls='lead')
        + f'<div class="how-spread">{col(("{左|ひだり}のページ", "left page"), parts1)}{col(("{右|みぎ}のページ", "right page"), parts2)}</div>'
        + f'<div class="how-row"><div class="box"><h2>{J("{記号|きごう}の{意味|いみ}")}<small>Symbols</small></h2><ul class="marks">{mk}</ul></div>'
        + f'<div class="box"><h2>{J("{授業|じゅぎょう}の{流|なが}れ（1 Lesson）")}<small>One Lesson in class</small></h2><div class="how-flow">{fl}</div>'
        + B(('{各|かく} Lesson の{右上|みぎうえ}の QR コードから、アプリのその Lesson を{開|ひら}ける。', 'The QR code at the top right of each Lesson opens it in the app.'), cls='mt') + '</div></div>'
        + f'<div class="how-app"><div class="hqr">{qr(APP_URL)}</div>' + B(('アプリでは、この{本|ほん}と{同|おな}じ{表|ひょう}で SQL を{実行|じっこう}できる。{右|みぎ}の QR コードから{開|ひら}こう。', 'In the app you can run SQL on the same tables as in this book. Open it with this QR code.')) + '</div>')

CAN_DO = [
    ('{表|ひょう}・{行|ぎょう}・{列|れつ}・{主|しゅ}キーを{説明|せつめい}できる', 'explain table, row, column, primary key', 0),
    ('SELECT と FROM で{列|れつ}を{取|と}り{出|だ}せる', 'get columns with SELECT and FROM', 1),
    ('{数|かず}・{文字|もじ}・{日付|ひづけ}を{正|ただ}しく{書|か}ける', 'write numbers, text and dates', 2),
    ('{計算|けいさん}して、AS で{名前|なまえ}を{付|つ}けられる', 'calculate and name columns with AS', 3),
    ('WHERE と{比較|ひかく}で{行|ぎょう}を{絞|しぼ}れる', 'filter rows with WHERE and comparisons', 4),
    ('AND・OR・NOT で{条件|じょうけん}を{組|く}み{合|あ}わせられる', 'combine conditions with AND, OR, NOT', 5),
    ('BETWEEN・IN・LIKE を{使|つか}える', 'use BETWEEN, IN, LIKE', 6),
    ('NULL を IS NULL で{正|ただ}しく{扱|あつか}える', 'handle NULL correctly with IS NULL', 8),
    ('ORDER BY・DISTINCT・LIMIT を{使|つか}える', 'use ORDER BY, DISTINCT, LIMIT', 9),
    ('INSERT・UPDATE・DELETE でデータを{変|か}えられる', 'change data with INSERT, UPDATE, DELETE', 12),
    ('{集計関数|しゅうけいかんすう}と GROUP BY・HAVING を{使|つか}える', 'use aggregates, GROUP BY and HAVING', 15),
    ('SQL が{実行|じっこう}される{順番|じゅんばん}を{説明|せつめい}できる', 'explain the order in which SQL runs', 18),
]

def map_page():
    items = ''.join(f'<li><span class="cb"></span>{B((ja, en))}<span class="cd-l">Lesson {n}</span></li>' for ja, en, n in CAN_DO)
    return page(H('{学|まな}びの{地図|ちず}', 'Learning map')
        + B(('{土台|どだい}から{順|じゅん}に{積|つ}み{上|あ}げ、{最後|さいご}に{自分|じぶん}でデータベースを 1 つ{作|つく}れるようになる。この{本|ほん}は、{一番|いちばん}{下|した}の{初級|しょきゅう}{編|へん}。', 'Build up from the foundation; at the end you can make a database yourself. This book is the Beginner volume, the bottom layer.'), cls='lead')
        + f'<div class="map-big">{pyramid()}</div>'
        + f'<div class="box"><h2>{J("{初級|しょきゅう}{編|へん}でできるようになること")}<small>What you will be able to do</small></h2>'
        + B(('できるようになったら、□ にチェックを{入|い}れよう。', 'Tick each box when you can do it.'), cls='mt') + f'<ul class="cando">{items}</ul></div>')

GROUPS = [
    (('{基本|きほん}', 'Basics'), [0, 1, 2, 3]),
    (('{行|ぎょう}を{絞|しぼ}る', 'Filtering rows'), [4, 5, 6, 7, 8]),
    (('{並|なら}べる・まとめる・{件数|けんすう}', 'Sorting, distinct, limits'), [9, 10, 11]),
    (('データを{変|か}える', 'Changing data'), [12, 13, 14]),
    (('{集計|しゅうけい}', 'Aggregation'), [15, 16, 17, 18]),
]

def toc():
    by = {L['no']: L for L in LESSONS}
    out = ''
    for (ja, en), nos in GROUPS:
        out += f'<li class="toc-g">{J(ja)}<span class="en">{en}</span></li>'
        for n in nos:
            L = by[n]
            out += (f'<li><span class="toc-n">Lesson {n}</span><span class="toc-t">{ruby(L["title"][0])}<span class="en">{esc(L["title"][1])}</span></span>'
                    f'<span class="toc-dots"></span><span class="toc-p">p.{FIRST_LESSON_PAGE + 2 * n}</span></li>')
    return page(H('{目次|もくじ}', 'Contents') + f'<ol class="toc2">{out}</ol>')

def tables_page():
    def t(name, note):
        cols, rows = run(f'SELECT * FROM {name}')
        return f'<div class="bdata"><h4><code>{name}</code>{B(note)}</h4>{table_html(cols, rows)}</div>'
    return page(H('{例題|れいだい}で{使|つか}う{表|ひょう}', 'Tables used in this book')
        + B(('この{本|ほん}の SQL は、すべてこの{表|ひょう}を{使|つか}う。アプリにも{同|おな}じ{表|ひょう}がある。{結果|けっか}を{確|たし}かめるときに{見|み}よう。', 'All the SQL in this book uses these tables, which are also in the app. Look here to check results.'), cls='lead')
        + t('products', ('{商品|しょうひん}', 'products'))
        + t('students', ('{学生|がくせい}', 'students')) + t('members', ('{会員|かいいん}（Lesson 8・15 で{使|つか}う）', 'members (used in Lessons 8 and 15)')))

def front():
    return cover() + howto() + map_page() + toc() + tables_page()
