"""
初級編（Beginner）: Lesson 0–18 as data. Furigana markup {漢字|かんじ}; every Japanese
text is a pair (ja, en). SQL results are never typed here: build.py runs the SQL.
"""
from build import J, B, H, ruby, sql, esc, table_html, run, slot_sql

def minitable(head, rows):
    """small reference table: rows of (code, (ja, en)) or (code, (ja, en), example)"""
    th = ''.join(f'<th>{J(h[0])}<span class="en">{esc(h[1])}</span></th>' for h in head)
    trs = ''
    for r in rows:
        tds = f'<td class="code">{esc(r[0])}</td><td>{B(r[1])}</td>'
        if len(r) > 2:
            tds += f'<td><code>{esc(r[2])}</code></td>'
        trs += f'<tr>{tds}</tr>'
    return f'<table class="minitable"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>'

def defbox(title, body):
    return f'<div class="defbox"><h4>{J(title[0])}<span class="en">{esc(title[1])}</span></h4>{body}</div>'

def section(title, body):
    return f'<section class="box">{H(*title)}{body}</section>'

def numline(op, filled, t):
    dot = f'<circle cx="40" cy="12" r="5" class="{"dot-on" if filled else "dot-off"}"/>'
    return f'''<div class="nl"><code>price {esc(op)} 4800</code>
      <svg viewBox="0 0 150 24" aria-hidden="true"><line x1="4" y1="12" x2="146" y2="12" class="axis"/><line x1="40" y1="12" x2="140" y2="12" class="span"/><path d="M140 7 L148 12 L140 17 z" class="head"/>{dot}<text x="40" y="23.5" text-anchor="middle">4800</text></svg>
      {B(t)}</div>'''

LESSONS = []

# ---------------------------------------------------------------- Lesson 0
def anatomy():
    """the parts of a table; each number sits on the part it names"""
    cols, rows = run('SELECT * FROM products LIMIT 4')
    COL, PK, ROW, VAL = 1, 0, 1, (1, 3)          # name column, id column, 2nd row, its price
    C = {'tbl': '#4353e0', 'col': '#e08a1e', 'row': '#1d8a57', 'val': '#c8374a', 'pk': '#c99a00'}
    n = len(rows)
    def frame(j, i):
        """box-shadows that draw a vertical frame around a column and a horizontal frame around the row"""
        sh = []
        for cj, c in ((COL, C['col']), (PK, C['pk'])):
            if j == cj:
                sh += [f'inset 2.5px 0 {c}', f'inset -2.5px 0 {c}']
                if i == -1: sh.append(f'inset 0 2.5px {c}')
                if i == n - 1: sh.append(f'inset 0 -2.5px {c}')
        if i == ROW:
            sh += [f'inset 0 2.5px {C["row"]}', f'inset 0 -2.5px {C["row"]}']
            if j == 0: sh.append(f'inset 2.5px 0 {C["row"]}')
            if j == len(cols) - 1: sh.append(f'inset -2.5px 0 {C["row"]}')
        return f' style="box-shadow:{", ".join(sh)}"' if sh else ''
    badge = lambda k, no: f'<span class="anat-no" style="background:{C[k]}">{no}</span>'
    th = ''.join(f'<th class="{"pk" if j == PK else ""}"{frame(j, -1)}>{esc(c)}'
                 + (badge('col', '②') if j == COL else badge('pk', '⑤') if j == PK else '') + '</th>' for j, c in enumerate(cols))
    trs = ''.join('<tr>' + ''.join(
        f'<td class="{"pk" if j == PK else ""}{" valhl" if (i, j) == VAL else ""}"{frame(j, i)}>{esc(str(v))}'
        + (badge('val', '④') if (i, j) == VAL else badge('row', '③') if (i == ROW and j == len(cols) - 1) else '') + '</td>'
        for j, v in enumerate(r)) + '</tr>' for i, r in enumerate(rows))
    labels = [
        ('tbl', '①', ('{表|ひょう}（テーブル）', 'table'), ('データを{入|い}れる{入|い}れ{物|もの}。この{表|ひょう}の{名前|なまえ}は products。', 'A container for data. This table is called products.')),
        ('col', '②', ('{列|れつ}', 'column'), ('{縦|たて}の{並|なら}び。{見出|みだ}しが{列|れつ}の{名前|なまえ}。{図|ず}は name {列|れつ}。', 'A vertical line. The heading is its name. The frame shows the name column.')),
        ('row', '③', ('{行|ぎょう}', 'row'), ('{横|よこ}の{並|なら}び。1つの{商品|しょうひん}が1{行|ぎょう}。{図|ず}は 2 {行|ぎょう}{目|め}。', 'A horizontal line. One product is one row. The frame shows the 2nd row.')),
        ('val', '④', ('{値|あたい}', 'value'), ('{行|ぎょう}と{列|れつ}が{交|まじ}わるところのデータ。{図|ず}は 4800。', 'The data where a row and a column meet. Here: 4800.')),
        ('pk', '⑤', ('{主|しゅ}キー', 'primary key'), ('{行|ぎょう}を1つに{決|き}める{列|れつ}。{同|おな}じ{値|あたい}は{入|はい}らない。{図|ず}は id {列|れつ}。', 'The column that identifies one row; no two rows share a value. Here: the id column.')),
    ]
    li = ''.join(f'<li class="lab-{k}"><b>{badge(k, no)}{J(nm[0])}<span class="en">{nm[1]}</span></b>{B(d)}</li>' for k, no, nm, d in labels)
    return f'''<div class="anat"><div class="anat-t"><div class="anat-name">{badge('tbl', '①')}products</div><table class="t anat-tbl"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>
      <div class="anat-more">… {J("{全部|ぜんぶ}で 10 {行|ぎょう}")}</div></div><ul class="anat-l">{li}</ul></div>'''

DBMS = [
    ('Oracle Database', ('{企業|きぎょう}の{大|おお}きなシステム。Oracle {資格|しかく}の{対象|たいしょう}', 'large business systems; the Oracle exams')),
    ('MySQL', ('Web サービス', 'web services')),
    ('PostgreSQL', ('Web サービス・データ{分析|ぶんせき}', 'web services, data analysis')),
    ('Microsoft SQL Server', ('Windows の{企業|きぎょう}システム', 'business systems on Windows')),
    ('SQLite', ('スマホやアプリの{中|なか}（このアプリも）', 'inside phones and apps (this app too)')),
]
def dbms_table():
    head = ''.join(f'<th>{J(h[0])}<span class="en">{h[1]}</span></th>' for h in [('{正式|せいしき}{名称|めいしょう}', 'official name'), ('よく{使|つか}われるところ', 'typical use')])
    rows = ''.join(f'<tr{" class=\"me\"" if n == "SQLite" else ""}><td class="code">{esc(n)}</td><td>{B(u)}</td></tr>' for n, u in DBMS)
    return f'<table class="minitable dbms"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>'

KINDS = [
    ('SELECT', ('{読|よ}む', 'read'), ('データを{取|と}り{出|だ}す', 'get data'), ('{初級|しょきゅう}', 'Beginner')),
    ('INSERT / UPDATE / DELETE', ('{書|か}き{換|か}える', 'change'), ('{行|ぎょう}を{追加|ついか}・{変更|へんこう}・{削除|さくじょ}する', 'add, change, delete rows'), ('{初級|しょきゅう}', 'Beginner')),
    ('CREATE / ALTER / DROP', ('{作|つく}る', 'build'), ('{表|ひょう}などを{作|つく}る・{変|か}える・{消|け}す', 'create, change, remove tables'), ('{上級|じょうきゅう}', 'Advanced')),
    ('GRANT / REVOKE', ('{守|まも}る', 'protect'), ('{使|つか}ってよい{人|ひと}を{決|き}める', 'decide who may use what'), ('{上級|じょうきゅう}', 'Advanced')),
    ('COMMIT / ROLLBACK', ('{確定|かくてい}・{取|と}り{消|け}し', 'confirm, undo'), ('{変更|へんこう}を{確定|かくてい}する・{元|もと}に{戻|もど}す', 'keep or undo changes'), ('{上級|じょうきゅう}', 'Advanced')),
]
def kinds_table():
    rows = ''.join(f'<tr><td class="code">{esc(k)}</td><td>{B(a)}</td><td>{B(b)}</td><td>{B(c)}</td></tr>' for k, a, b, c in KINDS)
    head = ''.join(f'<th>{J(h[0])}<span class="en">{h[1]}</span></th>' for h in [('SQL', 'SQL'), ('{種類|しゅるい}', 'kind'), ('できること', 'what it does'), ('{学|まな}ぶところ', 'where you learn it')])
    return f'<table class="minitable"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>'

LESSONS.append(dict(
    no=0, key='intro', tags=['fe', 'silver'],
    title=('データベースとは', 'What is a database?'),
    goal=('{表|ひょう}・{行|ぎょう}・{列|れつ}・{主|しゅ}キーを、{自分|じぶん}の{言葉|ことば}で{説明|せつめい}できる。', 'You can explain table, row, column and primary key in your own words.'),
    sections_before=[
        section(('{表|ひょう}のしくみ', 'Parts of a table'), anatomy()),
        section(('データベースと SQL', 'Databases and SQL'),
                B(('データベースは、たくさんのデータを{表|ひょう}にまとめて{保存|ほぞん}し、すばやく{取|と}り{出|だ}せるようにしたもの。データベースを{動|うご}かすソフトを DBMS という。', 'A database stores a lot of data in tables so it can be found quickly. The software that runs it is called a DBMS.'))
                + B(('DBMS は Database Management System（データベース{管理|かんり}システム）の{略|りゃく}。{代表的|だいひょうてき}な DBMS は{次|つぎ}の 5 つ。', 'DBMS stands for Database Management System. Five well-known DBMSs:'), cls='mt')
                + dbms_table()
                + B(('SQL は、DBMS に「こうしてほしい」と{伝|つた}えるための{言葉|ことば}。どの DBMS でも、ほぼ{同|おな}じ SQL が{使|つか}える。', 'SQL is the language you use to tell a DBMS what to do. Almost the same SQL works on every DBMS.'), cls='mt')
                + kinds_table()),
    ],
    points=[
        (('{表|ひょう}は、{行|ぎょう}（{横|よこ}）と{列|れつ}（{縦|たて}）でできている。', 'A table is made of rows (across) and columns (down).'),),
        (('{主|しゅ}キーは、{行|ぎょう}を1つに{決|き}める{列|れつ}。{同|おな}じ{値|あたい}や、{空|から}っぽ（NULL）は{入|はい}らない。', 'A primary key identifies one row. It never has the same value twice and is never empty (NULL).'),),
        (('この{教科書|きょうかしょ}の{表|ひょう}は、アプリで{実際|じっさい}に{使|つか}える。{例題|れいだい}の{表|ひょう}は p.5 にある。', 'The tables in this book are the ones in the app. The example tables are on p.5.'),),
    ],
    try_title=('{確|たし}かめよう', 'Check'),
    **{'try': [
        dict(q=('products の{表|ひょう}には、{列|れつ}がいくつある？', 'How many columns does the table products have?'), check=('{答|こた}え：6', 'Answer: 6')),
        dict(q=('products の{主|しゅ}キーは、どの{列|れつ}？', 'Which column is the primary key of products?'), check=('{答|こた}え：id', 'Answer: id')),
        dict(q=('{商品|しょうひん}「Coffee Maker」の{値段|ねだん}（price）はいくら？（p.5 を{見|み}よう）', 'What is the price of “Coffee Maker”? (see p.5)'), check=('{答|こた}え：3500', 'Answer: 3500')),
    ]},
))

# ---------------------------------------------------------------- Lesson 1
LESSONS.append(dict(
    no=1, key='select', kw='SELECT・FROM',
    title=('{列|れつ}を{選|えら}んで{取|と}り{出|だ}す', 'Get the columns you need: SELECT and FROM'),
    goal=('SELECT と FROM で、{表|ひょう}から{好|す}きな{列|れつ}を{取|と}り{出|だ}せる。', 'You can get the columns you want from a table with SELECT and FROM.'),
    syntax=[
        ('SELECT «{列|れつ}|column», …', 'SELECT {句|く}：{取|と}り{出|だ}す{列|れつ}を{書|か}く。', 'SELECT clause: the columns to get.', True),
        ('FROM «{表|ひょう}|table»;', 'FROM {句|く}：どの{表|ひょう}から{取|と}り{出|だ}すかを{書|か}く。', 'FROM clause: the table to get them from.', True),
    ],
    syntax_extra=defbox(('{句|く}と{構文|こうぶん}', 'Clause and syntax'),
        B(('SQL の{文|ぶん}は、いくつかの「{句|く}」でできている。{句|く}は、SELECT や FROM などのキーワードで{始|はじ}まるひとまとまり。', 'A SQL statement is made of clauses. A clause is one part that starts with a keyword such as SELECT or FROM.'))
        + B(('{句|く}をどう{書|か}くかの{決|き}まりを、「{構文|こうぶん}」という。この{教科書|きょうかしょ}では、Lesson ごとに{新|あたら}しい{句|く}を1 つずつ{覚|おぼ}えていく。', 'The rules for writing clauses are called syntax. In this book you learn new clauses one Lesson at a time.'), cls='mt')),
    see=dict(q=('products {表|ひょう}から、name と price の{列|れつ}を{取|と}り{出|だ}す。', 'Get the columns name and price from the table products.'),
             sql='SELECT name, price\nFROM products;',
             viz=dict(kind='columns', table='products', arrow='<span>SELECT name, price</span>'),
             note=('{選|えら}んだ{列|れつ}だけが、{選|えら}んだ{順番|じゅんばん}で{出|で}てくる。{行|ぎょう}は{全部|ぜんぶ}（10 {行|ぎょう}）{出|で}る。', 'Only the chosen columns appear, in the order you wrote them. All rows (10) appear.')),
    points=[
        (('{列|れつ}を2 つ{以上|いじょう}{書|か}くときは、カンマ（,）で{区切|くぎ}る。', 'Separate two or more columns with commas (,).'),),
        (('すべての{列|れつ}を{取|と}り{出|だ}すときは、* を{使|つか}う。', 'Use * to get all the columns.'), '<code class="ex">SELECT * FROM products;</code>'),
        (('{文|ぶん}の{最後|さいご}には ; を{付|つ}ける。キーワードは{大文字|おおもじ}でも{小文字|こもじ}でも{同|おな}じ（この{本|ほん}では{大文字|おおもじ}で{書|か}く）。', 'End a statement with ;. Keywords work in upper or lower case (this book uses upper case).'),),
    ],
    mistakes=[
        dict(wrong='SELECT name price\nFROM products;', mark_w='name price', right='SELECT name, price\nFROM products;', mark_r='name, price',
             why=('カンマがないと、price は{列|れつ}ではなく、name の{別名|べつめい}（Lesson 3）になってしまう。', 'Without a comma, price is not a column: it becomes another name (alias) for name (Lesson 3).'),
             note=('{列|れつ}が 1 つしか{出|で}てこない。{見出|みだ}しも price になっている。', 'Only one column comes out, and its heading is price.')),
        dict(wrong='SELECT name, price,\nFROM products;', mark_w='price,', right='SELECT name, price\nFROM products;', mark_r='price',
             why=('{最後|さいご}の{列|れつ}の{後|うし}ろ（FROM の{直前|ちょくぜん}）には、カンマを{付|つ}けない。', 'Do not put a comma after the last column (right before FROM).')),
    ],
    **{'try': [
        dict(q=('students {表|ひょう}から、name と major を{取|と}り{出|だ}そう。', 'Get name and major from the table students.'), answer='SELECT name, major FROM students;'),
        dict(q=('products {表|ひょう}から、すべての{列|れつ}を{取|と}り{出|だ}そう。', 'Get all the columns from the table products.'), answer='SELECT * FROM products;'),
        dict(q=('students {表|ひょう}から、name・score・age を、この{順番|じゅんばん}で{取|と}り{出|だ}そう。', 'Get name, score and age from students, in this order.'), answer='SELECT name, score, age FROM students;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 2
TYPES = [
    ('INTEGER', ('{整数|せいすう}', 'whole number'), '100'),
    ('DECIMAL / REAL', ('{小数|しょうすう}のある{数|かず}', 'number with decimals'), '3.14'),
    ('VARCHAR / TEXT', ('{文字|もじ}', 'text'), "'Tokyo'"),
    ('DATE', ('{日付|ひづけ}', 'date'), "DATE '2024-04-01'"),
]
LESSONS.append(dict(
    no=2, key='types', kw="' ' ・ {数|かず}",
    title=('データの{種類|しゅるい}と{書|か}き{方|かた}のルール', 'Kinds of data and how to write values'),
    goal=('{数|かず}・{文字|もじ}・{日付|ひづけ}を、SQL の{中|なか}で{正|ただ}しく{書|か}ける。', 'You can write numbers, text and dates correctly in SQL.'),
    sections_before=[section(('データの{種類|しゅるい}（データ{型|がた}）', 'Kinds of data (data types)'),
        B(('{表|ひょう}の{列|れつ}には、それぞれ{入|い}れられるデータの{種類|しゅるい}が{決|き}まっている。これを「データ{型|がた}」という。', 'Each column of a table holds one kind of data. This is called its data type.'))
        + minitable([('データ{型|がた}', 'data type'), ('{入|はい}るもの', 'holds'), ('SQL での{書|か}き{方|かた}', 'written in SQL as')], TYPES)
        + B(('データ{型|がた}の{名前|なまえ}は DBMS によって{少|すこ}しちがう（{例|れい}：Oracle の{文字|もじ}は VARCHAR2）。くわしくは{上級|じょうきゅう}の Lesson 38 で{学|まな}ぶ。', 'Type names differ a little between DBMSs (e.g. VARCHAR2 for text in Oracle). More in Advanced Lesson 38.'), cls='mt small'))],
    see=dict(q=('{文字|もじ}・{数|かず}・{日付|ひづけ}を、そのまま{取|と}り{出|だ}してみる。', 'Get a text, a number and a date as they are.'),
             sql="SELECT 'Tokyo', 2024, 3.14, '2024-04-01';",
             viz=dict(kind='result'),
             note=('{表|ひょう}を{使|つか}わなくても、SELECT の{後|うし}ろに{値|あたい}を{書|か}けば、その{値|あたい}が 1 {行|ぎょう}で{出|で}てくる。', 'Even without a table, SELECT with values returns those values in one row.')),
    points=[
        (("{文字|もじ}の{値|あたい}は、' '（シングルクォート）で{囲|かこ}む。{数|かず}は{囲|かこ}まない。' ' の{中|なか}は{日本語|にほんご}でもよい。", "Put text values in ' ' (single quotes). Numbers need no quotes. Japanese is fine inside ' '."),),
        (('" "（ダブルクォート）は、{列|れつ}や{表|ひょう}の{名前|なまえ}に{使|つか}う{記号|きごう}。{文字|もじ}の{値|あたい}に{使|つか}うと、エラーになるデータベースが{多|おお}い。', '" " (double quotes) are for column and table names. For text values they cause errors in most databases.'),),
        (("キーワードや{記号|きごう}は、{半角|はんかく}で{書|か}く。{全角|ぜんかく}の（ ）や ，は、エラーになる。-- から{行|ぎょう}の{終|お}わりまでは、メモ（コメント）として{無視|むし}される。", "Write keywords and symbols in half-width characters. Full-width （ ） or ， cause errors. Text from -- to the end of the line is a comment and is ignored."), '<code class="ex">SELECT name FROM products;  -- メモ</code>'),
    ],
    notes=[("Oracle では、FROM のない SELECT は{書|か}けない。SELECT 'Tokyo' FROM DUAL; のように、DUAL という{特別|とくべつ}な{表|ひょう}を{使|つか}う。", "In Oracle, SELECT needs FROM. Use the special table DUAL: SELECT 'Tokyo' FROM DUAL;")],
    mistakes=[
        dict(wrong="SELECT 'Tokyo;", mark_w="'Tokyo;", right="SELECT 'Tokyo';", mark_r="'Tokyo'",
             why=("' ' は{必|かなら}ず2 つで 1 {組|くみ}。{閉|と}じる ' がないと、{文|ぶん}の{終|お}わりが{分|わ}からない。", "' ' always come in pairs. Without the closing ', the statement never ends.")),
        dict(wrong='SELECT name， price\nFROM products;', mark_w='，', right='SELECT name, price\nFROM products;', mark_r=',',
             why=('{全角|ぜんかく}のカンマ「，」が{入|はい}っている。キーボードを{半角|はんかく}（{英数|えいすう}）{入力|にゅうりょく}にして{書|か}き{直|なお}す。', 'A full-width comma “，” is used. Switch the keyboard to half-width (English) mode and type it again.')),
    ],
    **{'try': [
        dict(q=("{文字|もじ} 'SQL' と、{数|かず} 100 を{取|と}り{出|だ}そう。", "Get the text 'SQL' and the number 100."), answer="SELECT 'SQL', 100;"),
        dict(q=("{文字|もじ} 'こんにちは' を{取|と}り{出|だ}そう（{日本語|にほんご}も ' ' で{囲|かこ}む）。", "Get the text 'こんにちは' (Japanese also goes in ' ')."), answer="SELECT 'こんにちは';"),
        dict(q=('products {表|ひょう}から、name と release_year を{取|と}り{出|だ}そう。', 'Get name and release_year from products.'), answer='SELECT name, release_year FROM products;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 3
LESSONS.append(dict(
    no=3, key='alias', kw='AS・{計算|けいさん}',
    title=('{列|れつ}に{名前|なまえ}を{付|つ}ける・{計算|けいさん}する', 'Name and calculate columns: AS'),
    goal=('{計算|けいさん}した{値|あたい}を、わかりやすい{名前|なまえ}を{付|つ}けて{取|と}り{出|だ}せる。', 'You can get calculated values and give them clear names.'),
    syntax=[
        ('SELECT «{式|しき}|expression» AS «{別名|べつめい}|alias», …', 'SELECT {句|く}：{列|れつ}や{計算|けいさん}{式|しき}に、AS で{名前|なまえ}を{付|つ}ける。', 'SELECT clause: name a column or calculation with AS.', True),
        ('FROM «{表|ひょう}|table»;', 'FROM {句|く}：どの{表|ひょう}から{取|と}り{出|だ}すか。', 'FROM clause: which table.', False),
    ],
    syntax_extra=minitable([('{記号|きごう}', 'symbol'), ('{意味|いみ}', 'meaning'), ('{例|れい}', 'example')], [
        ('+  -', ('{足|た}し{算|ざん}・{引|ひ}き{算|ざん}', 'add, subtract'), 'price + 100'),
        ('*  /', ('かけ{算|ざん}・{割|わ}り{算|ざん}', 'multiply, divide'), 'price * stock'),
        ('||', ('{文字|もじ}をつなぐ', 'join text'), "name || ' (' || category || ')'"),
    ]),
    see=dict(q=('{商品|しょうひん}ごとに、{在庫|ざいこ}の{金額|きんがく}（price × stock）を{計算|けいさん}し、stock_value という{名前|なまえ}を{付|つ}ける。', 'For each product, calculate the stock value (price × stock) and name it stock_value.'),
             sql='SELECT name, price * stock AS stock_value\nFROM products;', mark='price * stock AS stock_value',
             viz=dict(kind='before_after', table='products', base='SELECT name, price, stock FROM products', arrow='<span>price * stock</span>'),
             note=('{計算|けいさん}は{行|ぎょう}ごとに{行|おこな}われる。{表|ひょう}の{中|なか}のデータは{変|か}わらない。', 'The calculation is done for each row. The data in the table does not change.')),
    points=[
        (('AS の{後|うし}ろに、{結果|けっか}の{列|れつ}の{名前|なまえ}（{別名|べつめい}）を{書|か}く。AS は{省略|しょうりゃく}できるが、{書|か}いたほうが{読|よ}みやすい。', 'Write the name (alias) of the result column after AS. AS can be left out, but it is easier to read with it.'),),
        (('{別名|べつめい}にスペースは{使|つか}えない。stock_value のように _ でつなぐ。', 'An alias cannot contain spaces. Join words with _, like stock_value.'),),
        (('|| で{文字|もじ}をつなげられる。', 'Use || to join text.'), "<code class=\"ex\">SELECT name || ' (' || category || ')' AS label FROM products;</code>"),
    ],
    notes=[('{文字|もじ}をつなぐ || は、MySQL では{使|つか}えない。MySQL では CONCAT(name, category) と{書|か}く。', 'MySQL does not use || to join text. In MySQL write CONCAT(name, category).')],
    mistakes=[
        dict(wrong='SELECT 7 / 2;', mark_w='7 / 2', right='SELECT 7.0 / 2;', mark_r='7.0',
             why=('このアプリ（SQLite）や PostgreSQL では、{整数|せいすう}どうしの{割|わ}り{算|ざん}は、{小数点|しょうすうてん}{以下|いか}が{切|き}り{捨|す}てられる。7.0 のように{小数|しょうすう}で{書|か}く。Oracle や MySQL では 3.5 になる。', 'In SQLite (this app) and PostgreSQL, dividing two integers drops the decimals. Write one as 7.0. Oracle and MySQL give 3.5.'),
             note=('3.5 ではなく、3 になってしまう。', 'You get 3 instead of 3.5.')),
        dict(wrong='SELECT name, price * stock AS stock value\nFROM products;', mark_w='stock value', right='SELECT name, price * stock AS stock_value\nFROM products;', mark_r='stock_value',
             why=('{別名|べつめい}の{途中|とちゅう}にスペースがあると、どこまでが{名前|なまえ}か{分|わ}からない。', 'With a space inside the alias, the DBMS cannot tell where the name ends.')),
    ],
    **{'try': [
        dict(q=('products の name と、price を 2 {倍|ばい}にした{値|あたい}を double_price という{名前|なまえ}で{取|と}り{出|だ}そう。', 'Get name and price × 2 named double_price from products.'), answer='SELECT name, price * 2 AS double_price FROM products;'),
        dict(q=('students の name と、score に 10 を{足|た}した{値|あたい}を new_score という{名前|なまえ}で{取|と}り{出|だ}そう。', 'Get name and score + 10 named new_score from students.'), answer='SELECT name, score + 10 AS new_score FROM students;'),
        dict(q=("products の name と category を ' - ' でつないで、label という{名前|なまえ}で{取|と}り{出|だ}そう。", "Join name and category with ' - ' and name it label."), answer="SELECT name || ' - ' || category AS label FROM products;"),
    ]},
))

# ---------------------------------------------------------------- Lesson 4
OPS = [("=", ("{等|ひと}しい", "equal to")), ("<>", ("{等|ひと}しくない", "not equal to")), (">", ("より{大|おお}きい", "greater than")),
       (">=", ("{以上|いじょう}", "greater than or equal to")), ("<", ("より{小|ちい}さい（{未満|みまん}）", "less than")), ("<=", ("{以下|いか}", "less than or equal to"))]
OPS_HTML = '<div class="ops">' + ''.join(f'<div class="opc"><span class="op">{esc(o)}</span><span class="opt"><span class="ja">{ruby(t[0])}</span><span class="en">{t[1]}</span></span><code>price {esc(o)} 4800</code></div>' for o, t in OPS) + '</div>'

LESSONS.append(dict(
    no=4, key='where', kw='WHERE・{比較|ひかく}',
    title=('{条件|じょうけん}で{行|ぎょう}を{絞|しぼ}る', 'Filter rows with a condition: WHERE and comparison'),
    goal=('{条件|じょうけん}に{合|あ}う{行|ぎょう}だけを{取|と}り{出|だ}せる。', 'You can pick out only the rows that meet a condition.'),
    syntax=[
        ('SELECT «{列|れつ}|column», …', 'SELECT {句|く}：{取|と}り{出|だ}す{列|れつ}を{書|か}く。', 'SELECT clause: the columns to get.', False),
        ('FROM «{表|ひょう}|table»', 'FROM {句|く}：どの{表|ひょう}から{取|と}り{出|だ}すかを{書|か}く。', 'FROM clause: the table to get them from.', False),
        ('WHERE «{列|れつ}|column» «{比較|ひかく}|operator» «{値|あたい}|value»;', 'WHERE {句|く}：どの{行|ぎょう}を{残|のこ}すかを{書|か}く。この Lesson で{学|まな}ぶ{句|く}。', 'WHERE clause: which rows to keep. New in this Lesson.', True),
    ],
    syntax_extra=OPS_HTML + B(('どの{比較|ひかく}も、{文字|もじ}にも{使|つか}える。{文字|もじ}の > や < は、{辞書|じしょ}の{順番|じゅんばん}（A→Z）で{比|くら}べる。', 'Every comparison also works with text. With > and <, text is compared in dictionary order (A→Z).'), cls='ops-note'),
    syntax_notes=[('{比較|ひかく}の「{等|ひと}しくない」は、<> が{標準|ひょうじゅん}の{書|か}き{方|かた}。!= も、Oracle・MySQL・SQLite などで{使|つか}える。', 'For “not equal to”, <> is the standard way to write it. != also works in Oracle, MySQL, SQLite and others.')],
    see=dict(q=('{価格|かかく}（price）が 4800 {以上|いじょう}の{商品|しょうひん}を、{取|と}り{出|だ}す。', 'Get the products whose price is 4800 or more.'),
             sql='SELECT name, price\nFROM products\nWHERE price >= 4800;', mark='WHERE price >= 4800',
             viz=dict(kind='filter', table='products', base='SELECT name, price FROM products', arrow='<span>WHERE<br>price &gt;= 4800</span>'),
             note=('{条件|じょうけん}に{合|あ}わない{行|ぎょう}は{消|き}える。>= で{指定|してい}しているので、4800 ちょうどの{行|ぎょう}は{残|のこ}る。', 'Rows that do not meet the condition disappear. Because we used >=, the row with exactly 4800 stays.')),
    points=[
        (('WHERE {句|く}は、FROM {句|く}の{後|うし}ろに{書|か}く。', 'Write the WHERE clause after the FROM clause.'),),
        (('「{以上|いじょう}」「{以下|いか}」には、{境目|さかいめ}の{値|あたい}も{入|はい}る（>= と <=）。「より{大|おお}きい」「{未満|みまん}」には、{境目|さかいめ}の{値|あたい}は{入|はい}らない（> と <）。', '“Or more” and “or less” include the boundary value (>= and <=). “Greater than” and “less than” do not (> and <).'),
         '<div class="nls">' + numline('>=', True, ('4800 も{入|はい}る。', '4800 is included.')) + numline('>', False, ('4800 は{入|はい}らない。', '4800 is not included.')) + '</div>'),
        (("{文字|もじ}の{値|あたい}は、' '（シングルクォート）で{囲|かこ}む。{数|かず}は{囲|かこ}まない（くわしくは Lesson 2）。", "Put text values in ' ' (single quotes). Numbers need no quotes (more in Lesson 2)."), "<code class=\"ex\">WHERE category = 'Books'</code>"),
    ],
    mistakes=[
        dict(wrong='SELECT name, price FROM products\nWHERE price > 4800;', mark_w='price > 4800', right='SELECT name, price FROM products\nWHERE price >= 4800;', mark_r='price >= 4800',
             why=('「4800 {以上|いじょう}」には 4800 も{入|はい}る。> を{使|つか}うと、4800 ちょうどの{商品|しょうひん}が{結果|けっか}から{消|き}えてしまう。', '“4800 or more” includes 4800. If you use >, the product priced exactly 4800 disappears from the result.'),
             note=('4800 ちょうどの{行|ぎょう}が、{消|き}えている。', 'The row with exactly 4800 is missing.')),
        dict(wrong='SELECT name FROM products\nWHERE category = Books;', mark_w='Books', right="SELECT name FROM products\nWHERE category = 'Books';", mark_r="'Books'",
             why=("' ' で{囲|かこ}まないと、Books は{列|れつ}の{名前|なまえ}だと{思|おも}われて、エラーになる。", "Without ' ', Books is read as a column name, which causes an error.")),
    ],
    **{'try': [
        dict(q=("category が 'Kitchen' の{商品|しょうひん}の、name を{取|と}り{出|だ}そう。", "Get the name of the products whose category is 'Kitchen'."), answer="SELECT name FROM products WHERE category = 'Kitchen';"),
        dict(q=('stock（{在庫|ざいこ}）が 20 {未満|みまん}の{商品|しょうひん}の、name と stock を{取|と}り{出|だ}そう。', 'Get name and stock of the products whose stock is less than 20.'), answer='SELECT name, stock FROM products WHERE stock < 20;'),
        dict(q=('release_year（{発売年|はつばいねん}）が 2021 ではない{商品|しょうひん}の、name を{取|と}り{出|だ}そう。', 'Get the name of the products whose release_year is not 2021.'), answer='SELECT name FROM products WHERE release_year <> 2021;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 5
TRUTH = '''<table class="truth"><thead><tr><th></th><th>AND</th><th>OR</th></tr></thead><tbody>
<tr><td>○ ○</td><td class="y">○</td><td class="y">○</td></tr><tr><td>○ ✕</td><td class="n">✕</td><td class="y">○</td></tr>
<tr><td>✕ ○</td><td class="n">✕</td><td class="y">○</td></tr><tr><td>✕ ✕</td><td class="n">✕</td><td class="n">✕</td></tr></tbody></table>'''
LESSONS.append(dict(
    no=5, key='andor', kw='AND・OR・NOT',
    title=('{条件|じょうけん}を{組|く}み{合|あ}わせる', 'Combine conditions: AND, OR, NOT'),
    goal=('AND・OR・NOT で、2 つ{以上|いじょう}の{条件|じょうけん}を{組|く}み{合|あ}わせられる。', 'You can combine two or more conditions with AND, OR and NOT.'),
    syntax=[
        ('WHERE «{条件|じょうけん}1|condition 1» AND «{条件|じょうけん}2|condition 2»', 'AND：{両方|りょうほう}に{合|あ}う{行|ぎょう}を{残|のこ}す。', 'AND: keep rows that meet both.', True),
        ('WHERE «{条件|じょうけん}1|condition 1» OR «{条件|じょうけん}2|condition 2»', 'OR：どちらか{一方|いっぽう}にでも{合|あ}う{行|ぎょう}を{残|のこ}す。', 'OR: keep rows that meet either one.', True),
        ('WHERE NOT «{条件|じょうけん}|condition»', 'NOT：{条件|じょうけん}に{合|あ}わない{行|ぎょう}を{残|のこ}す。', 'NOT: keep rows that do not meet it.', True),
    ],
    syntax_extra=f'<div class="truth-wrap">{TRUTH}' + B(('○ は{条件|じょうけん}に{合|あ}う、✕ は{合|あ}わない。AND は{両方|りょうほう}が ○ のときだけ ○。OR はどちらかが ○ なら ○。', '○ means the condition is met, ✕ means not. AND is ○ only when both are ○. OR is ○ when either is ○.')) + '</div>',
    see=dict(q=("category が 'Electronics' で、しかも price が 5000 {未満|みまん}の{商品|しょうひん}を{取|と}り{出|だ}す。", "Get the products in 'Electronics' that also cost less than 5000."),
             sql="SELECT name, category, price\nFROM products\nWHERE category = 'Electronics' AND price < 5000;", mark="category = 'Electronics' AND price < 5000",
             viz=dict(kind='filter', table='products', base='SELECT name, category, price FROM products', arrow='<span>AND</span>'),
             note=('Electronics でも 5000 {以上|いじょう}の{商品|しょうひん}や、5000 {未満|みまん}でも{別|べつ}の category の{商品|しょうひん}は、{残|のこ}らない。', 'Electronics items costing 5000 or more, and cheap items in other categories, do not stay.')),
    points=[
        (('AND は「{両方|りょうほう}」、OR は「どちらか」。{日本語|にほんご}の「かつ」「または」と{同|おな}じ。', 'AND means “both”, OR means “either”.'),),
        (('AND は OR より{先|さき}に{計算|けいさん}される。{迷|まよ}ったら ( ) で{囲|かこ}んで、{先|さき}に{計算|けいさん}したい{部分|ぶぶん}をはっきりさせる。', 'AND is evaluated before OR. When in doubt, use ( ) around the part to evaluate first.'),),
        (("NOT は{条件|じょうけん}を{逆|ぎゃく}にする。NOT category = 'Books' は、category <> 'Books' と{同|おな}じ。", "NOT reverses a condition. NOT category = 'Books' is the same as category <> 'Books'."),),
    ],
    mistakes=[
        dict(wrong="SELECT name, category, price FROM products\nWHERE category = 'Kitchen' OR category = 'Books' AND price < 3000;", mark_w="category = 'Kitchen' OR category = 'Books' AND price < 3000",
             right="SELECT name, category, price FROM products\nWHERE (category = 'Kitchen' OR category = 'Books') AND price < 3000;", mark_r="(category = 'Kitchen' OR category = 'Books')",
             why=('AND が{先|さき}に{計算|けいさん}されるので、「Kitchen の{全部|ぜんぶ}」または「3000 {未満|みまん}の Books」という{意味|いみ}になってしまう。', 'AND is evaluated first, so this means “all Kitchen items” or “Books under 3000”.'),
             note=('3000 {以上|いじょう}の Kitchen の{商品|しょうひん}が、{余分|よぶん}に{入|はい}っている。', 'Kitchen items costing 3000 or more are extra.')),
        dict(wrong="SELECT name, category FROM products\nWHERE category = 'Kitchen' OR 'Books';", mark_w="OR 'Books'",
             right="SELECT name, category FROM products\nWHERE category = 'Kitchen' OR category = 'Books';", mark_r="OR category = 'Books'",
             why=('OR の{後|うし}ろにも、「{列|れつ} = {値|あたい}」の{形|かたち}で{条件|じょうけん}を{書|か}く。{値|あたい}だけでは{条件|じょうけん}にならない。', 'After OR, write a full condition “column = value” again. A value alone is not a condition.'),
             note=('Books の{商品|しょうひん}が、{入|はい}っていない。', 'The Books items are missing.')),
    ],
    **{'try': [
        dict(q=("students で、major が 'IT' かつ score が 80 {以上|いじょう}の{学生|がくせい}の name を{取|と}り{出|だ}そう。", "From students, get the name of IT students with a score of 80 or more."), answer="SELECT name FROM students WHERE major = 'IT' AND score >= 80;"),
        dict(q=("products で、category が 'Books' または 'Clothing' の{商品|しょうひん}の name を{取|と}り{出|だ}そう。", "From products, get the name of items in 'Books' or 'Clothing'."), answer="SELECT name FROM products WHERE category = 'Books' OR category = 'Clothing';"),
        dict(q=("products で、category が 'Electronics' ではない{商品|しょうひん}の name を、NOT を{使|つか}って{取|と}り{出|だ}そう。", "From products, get the name of items not in 'Electronics', using NOT."), answer="SELECT name FROM products WHERE NOT category = 'Electronics';"),
    ]},
))

# ---------------------------------------------------------------- Lesson 6
LESSONS.append(dict(
    no=6, key='between', kw='BETWEEN・IN',
    title=('{範囲|はんい}と{候補|こうほ}で{絞|しぼ}る', 'Ranges and lists: BETWEEN and IN'),
    goal=('「○から△まで」「○か△のどれか」という{条件|じょうけん}を、{短|みじか}く{書|か}ける。', 'You can write “from … to …” and “one of …” conditions in a short way.'),
    syntax=[
        ('WHERE «{列|れつ}|column» BETWEEN «{値|あたい}A|value A» AND «{値|あたい}B|value B»', 'BETWEEN：A {以上|いじょう} B {以下|いか}の{行|ぎょう}を{残|のこ}す。', 'BETWEEN: keep rows from A to B (both included).', True),
        ('WHERE «{列|れつ}|column» IN («{値|あたい}|value», «{値|あたい}|value», …)', 'IN：( ) の{中|なか}のどれかに{等|ひと}しい{行|ぎょう}を{残|のこ}す。', 'IN: keep rows equal to one of the values in ( ).', True),
    ],
    see=dict(q=('price が 2000 {以上|いじょう} 4000 {以下|いか}の{商品|しょうひん}を、{取|と}り{出|だ}す。', 'Get the products priced from 2000 to 4000.'),
             sql='SELECT name, price\nFROM products\nWHERE price BETWEEN 2000 AND 4000;', mark='price BETWEEN 2000 AND 4000',
             viz=dict(kind='filter', table='products', base='SELECT name, price FROM products', arrow='<span>BETWEEN<br>2000 AND 4000</span>'),
             note=('price >= 2000 AND price <= 4000 と{同|おな}じ{意味|いみ}。{短|みじか}く{書|か}けて、{読|よ}みやすい。', 'This means the same as price >= 2000 AND price <= 4000, but is shorter and easier to read.')),
    points=[
        (('BETWEEN A AND B は、A と B もふくむ。{小|ちい}さい{値|あたい}を{先|さき}に{書|か}く。', 'BETWEEN A AND B includes A and B. Write the smaller value first.'),),
        (('IN は、OR をたくさん{並|なら}べるかわりに{使|つか}える。', 'IN can replace a long chain of ORs.'), "<code class=\"ex\">WHERE category IN ('Kitchen', 'Books')</code>"),
        (('NOT BETWEEN・NOT IN で、「{範囲|はんい}の{外|そと}」「どれでもない」を{表|あらわ}せる。', 'NOT BETWEEN and NOT IN mean “outside the range” and “none of these”.'),),
    ],
    mistakes=[
        dict(wrong='SELECT name, price FROM products\nWHERE price BETWEEN 4000 AND 2000;', mark_w='4000 AND 2000', right='SELECT name, price FROM products\nWHERE price BETWEEN 2000 AND 4000;', mark_r='2000 AND 4000',
             why=('BETWEEN は「{小|ちい}さい{値|あたい} AND {大|おお}きい{値|あたい}」の{順|じゅん}に{書|か}く。{逆|ぎゃく}にすると、4000 {以上|いじょう}かつ 2000 {以下|いか}になり、1 {行|ぎょう}も{残|のこ}らない。', 'Write BETWEEN as “small value AND large value”. The other way round means “4000 or more and 2000 or less”, and no row stays.'),
             note=('{本当|ほんとう}は 4 {行|ぎょう}あるはずの{行|ぎょう}が、{全部|ぜんぶ}{消|き}えている。', 'All 4 rows that should be there are missing.')),
        dict(wrong="SELECT name FROM products\nWHERE category IN 'Kitchen', 'Books';", mark_w="'Kitchen', 'Books'", right="SELECT name FROM products\nWHERE category IN ('Kitchen', 'Books');", mark_r="('Kitchen', 'Books')",
             why=('IN の{値|あたい}は、{必|かなら}ず ( ) で{囲|かこ}む。', 'The values for IN always go inside ( ).')),
    ],
    **{'try': [
        dict(q=('students で、score が 70 {以上|いじょう} 85 {以下|いか}の{学生|がくせい}の name と score を{取|と}り{出|だ}そう。', 'From students, get name and score where the score is from 70 to 85.'), answer='SELECT name, score FROM students WHERE score BETWEEN 70 AND 85;'),
        dict(q=("products で、category が 'Kitchen' か 'Books' の{商品|しょうひん}の name を、IN で{取|と}り{出|だ}そう。", "From products, get the name of items in 'Kitchen' or 'Books', using IN."), answer="SELECT name FROM products WHERE category IN ('Kitchen', 'Books');"),
        dict(q=("students で、major が 'IT' でも 'Business' でもない{学生|がくせい}の name を{取|と}り{出|だ}そう。", "From students, get the name of students whose major is neither 'IT' nor 'Business'."), answer="SELECT name FROM students WHERE major NOT IN ('IT', 'Business');"),
    ]},
))


# ---------------------------------------------------------------- Lesson 7
LESSONS.append(dict(
    no=7, key='like', kw='LIKE',
    title=('パターンで{探|さが}す', 'Search with patterns: LIKE'),
    goal=('「〜を{含|ふく}む」「〜で{始|はじ}まる」という{条件|じょうけん}で、{文字|もじ}を{探|さが}せる。', 'You can search text that contains, starts with or ends with something.'),
    syntax=[
        ("WHERE «{列|れつ}|column» LIKE «'パターン'|'pattern'»", 'LIKE：パターンに{合|あ}う{文字|もじ}の{行|ぎょう}を{残|のこ}す。', 'LIKE: keep rows whose text matches the pattern.', True),
    ],
    syntax_extra=minitable([('パターン', 'pattern'), ('{意味|いみ}', 'meaning'), ('{合|あ}う{例|れい}', 'matches')], [
        ("'%Pro%'", ('Pro をどこかに{含|ふく}む', 'contains Pro'), 'Wireless Mouse Pro'),
        ("'Pro%'", ('Pro で{始|はじ}まる', 'starts with Pro'), 'Pro Camera'),
        ("'%Pro'", ('Pro で{終|お}わる', 'ends with Pro'), 'Chef Knife Pro'),
        ("'_ouse'", ('{何|なに}か 1 {文字|もじ}＋ouse', 'any one character + ouse'), 'Mouse, House'),
    ]) + B(('% は「0 {文字|もじ}{以上|いじょう}の{何|なん}でも」、_ は「ちょうど 1 {文字|もじ}の{何|なん}でも」。', '% means “anything, any length (even none)”. _ means “exactly one character”.'), cls='ops-note'),
    see=dict(q=('name に Pro を{含|ふく}む{商品|しょうひん}を、{取|と}り{出|だ}す。', 'Get the products whose name contains Pro.'),
             sql="SELECT name, price\nFROM products\nWHERE name LIKE '%Pro%';", mark="name LIKE '%Pro%'",
             viz=dict(kind='filter', table='products', base='SELECT name, price FROM products', arrow="<span>LIKE<br>'%Pro%'</span>"),
             note=('Pro の{前後|ぜんご}に{何|なに}があってもよいので、{最後|さいご}が Pro の{商品|しょうひん}も{残|のこ}る。', 'Anything may come before or after Pro, so names ending in Pro stay too.')),
    points=[
        (('% や _ が{特別|とくべつ}な{意味|いみ}を{持|も}つのは、LIKE のときだけ。', '% and _ are special only with LIKE.'),),
        (("NOT LIKE で、「パターンに{合|あ}わない」{行|ぎょう}を{残|のこ}せる。", 'NOT LIKE keeps the rows that do not match.'), "<code class=\"ex\">WHERE name NOT LIKE '%Pro%'</code>"),
        (('LIKE で{英字|えいじ}の{大文字|おおもじ}・{小文字|こもじ}を{区別|くべつ}するかは、データベースによってちがう。', 'Whether LIKE tells upper case from lower case depends on the database.'),),
    ],
    notes=[("このアプリ（SQLite）や MySQL では、'%pro%' でも Pro に{合|あ}う（{区別|くべつ}しない）。Oracle や PostgreSQL では{区別|くべつ}するので、{合|あ}わない。", "In SQLite (this app) and MySQL, '%pro%' also matches Pro. Oracle and PostgreSQL tell the cases apart, so it does not match.")],
    mistakes=[
        dict(wrong="SELECT name FROM products\nWHERE name LIKE 'Pro';", mark_w="'Pro'", right="SELECT name FROM products\nWHERE name LIKE '%Pro%';", mark_r="'%Pro%'",
             why=('% がないと、「ぴったり Pro」という{意味|いみ}になる。「Pro を{含|ふく}む」なら、{両側|りょうがわ}に % を{付|つ}ける。', 'Without %, it means “exactly Pro”. For “contains Pro”, put % on both sides.'),
             note=('Pro を{含|ふく}む 3 {行|ぎょう}が、{全部|ぜんぶ}{消|き}えている。', 'All 3 rows containing Pro are missing.')),
        dict(wrong="SELECT name FROM products\nWHERE name = '%Pro%';", mark_w="= '%Pro%'", right="SELECT name FROM products\nWHERE name LIKE '%Pro%';", mark_r="LIKE '%Pro%'",
             why=('= では、% もただの{文字|もじ}として{比|くら}べられる。パターンで{探|さが}すときは LIKE を{使|つか}う。', 'With =, % is just a normal character. Use LIKE to search with a pattern.'),
             note=('「%Pro%」という{名前|なまえ}の{商品|しょうひん}はないので、0 {行|ぎょう}になる。', 'No product is named “%Pro%”, so you get 0 rows.')),
    ],
    **{'try': [
        dict(q=("products で、name が 'Wireless' で{始|はじ}まる{商品|しょうひん}の name を{取|と}り{出|だ}そう。", "From products, get the names that start with 'Wireless'."), answer="SELECT name FROM products WHERE name LIKE 'Wireless%';"),
        dict(q=("products で、name が 'Pro' で{終|お}わる{商品|しょうひん}の name を{取|と}り{出|だ}そう。", "From products, get the names that end with 'Pro'."), answer="SELECT name FROM products WHERE name LIKE '%Pro';"),
        dict(q=("students で、name に 'an' を{含|ふく}む{学生|がくせい}の name を{取|と}り{出|だ}そう。", "From students, get the names that contain 'an'."), answer="SELECT name FROM students WHERE name LIKE '%an%';"),
    ]},
))

# ---------------------------------------------------------------- Lesson 8
LESSONS.append(dict(
    no=8, key='null', kw='IS NULL',
    title=('{値|あたい}がないデータ：NULL', 'Missing values: NULL'),
    goal=('{値|あたい}が{入|はい}っていない{行|ぎょう}を、IS NULL で{正|ただ}しく{探|さが}せる。', 'You can find rows with no value correctly with IS NULL.'),
    syntax=[
        ('WHERE «{列|れつ}|column» IS NULL', 'IS NULL：{値|あたい}がない{行|ぎょう}を{残|のこ}す。', 'IS NULL: keep rows with no value.', True),
        ('WHERE «{列|れつ}|column» IS NOT NULL', 'IS NOT NULL：{値|あたい}がある{行|ぎょう}を{残|のこ}す。', 'IS NOT NULL: keep rows that have a value.', True),
    ],
    syntax_extra=defbox(('NULL とは', 'What is NULL?'),
        B(("NULL は「{値|あたい}がない（わからない）」という{意味|いみ}。0 や、{空|から}の{文字|もじ} '' とはちがう。この Lesson では、{会員|かいいん}の{表|ひょう} members を{使|つか}う（p.5）。", "NULL means “no value (unknown)”. It is not 0 and not the empty text ''. This Lesson uses the table members (p.5)."))),
    see=dict(q=('メールアドレス（email）が{登録|とうろく}されていない{会員|かいいん}を、{取|と}り{出|だ}す。', 'Get the members with no email address.'),
             sql='SELECT name, email\nFROM members\nWHERE email IS NULL;', mark='email IS NULL',
             viz=dict(kind='filter', table='members', base='SELECT name, email FROM members', arrow='<span>IS NULL</span>'),
             note=('email が NULL の{行|ぎょう}だけが{残|のこ}る。', 'Only the rows whose email is NULL stay.')),
    points=[
        (('NULL は、= や <> では{調|しら}べられない。{必|かなら}ず IS NULL・IS NOT NULL を{使|つか}う。', 'You cannot test NULL with = or <>. Always use IS NULL or IS NOT NULL.'),),
        (('NULL と{比|くら}べた{結果|けっか}は、「{正|ただ}しい」でも「{正|ただ}しくない」でもなく「わからない」になる。WHERE では、「わからない」{行|ぎょう}は{残|のこ}らない。', 'A comparison with NULL is neither true nor false but “unknown”. WHERE does not keep “unknown” rows.'),),
        (('NULL の{行|ぎょう}も{残|のこ}したいときは、OR … IS NULL を{足|た}す。', 'To keep the NULL rows as well, add OR … IS NULL.'),),
    ],
    mistakes=[
        dict(wrong='SELECT name, email FROM members\nWHERE email = NULL;', mark_w='= NULL', right='SELECT name, email FROM members\nWHERE email IS NULL;', mark_r='IS NULL',
             why=('= NULL の{結果|けっか}は、いつも「わからない」になる。だから 1 {行|ぎょう}も{残|のこ}らない。', 'The result of = NULL is always “unknown”, so no row stays.'),
             note=('NULL の 2 {行|ぎょう}が、{消|き}えている。', 'The 2 NULL rows are missing.')),
        dict(wrong="SELECT name, phone FROM members\nWHERE phone <> '090-1111-2222';", mark_w="phone <> '090-1111-2222'",
             right="SELECT name, phone FROM members\nWHERE phone <> '090-1111-2222' OR phone IS NULL;", mark_r='OR phone IS NULL',
             why=('「Aiko {以外|いがい}の{全員|ぜんいん}」のつもりでも、phone が NULL の{人|ひと}は <> でも「わからない」になって{消|き}える。', 'You want everyone except Aiko, but people whose phone is NULL give “unknown” with <> and disappear.'),
             note=('phone が NULL の 3 {人|にん}が、{消|き}えている。', 'The 3 people whose phone is NULL are missing.')),
    ],
    **{'try': [
        dict(q=('members で、phone が NULL の{会員|かいいん}の name を{取|と}り{出|だ}そう。', 'From members, get the names whose phone is NULL.'), answer='SELECT name FROM members WHERE phone IS NULL;'),
        dict(q=('members で、email が NULL ではない{会員|かいいん}の name と email を{取|と}り{出|だ}そう。', 'From members, get name and email where email is not NULL.'), answer='SELECT name, email FROM members WHERE email IS NOT NULL;'),
        dict(q=('members で、email も phone も NULL の{会員|かいいん}の name を{取|と}り{出|だ}そう。', 'From members, get the names whose email and phone are both NULL.'), answer='SELECT name FROM members WHERE email IS NULL AND phone IS NULL;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 9
LESSONS.append(dict(
    no=9, key='orderby', kw='ORDER BY',
    title=('{並|なら}べかえる', 'Sort rows: ORDER BY'),
    goal=('{好|す}きな{列|れつ}の{順番|じゅんばん}で、{行|ぎょう}を{並|なら}べかえられる。', 'You can sort rows by the columns you choose.'),
    syntax=[
        ('SELECT … FROM … WHERE …', 'ここまでは、{今|いま}までと{同|おな}じ。', 'Same as before.', False),
        ('ORDER BY «{列|れつ}1|column 1» ASC|DESC, «{列|れつ}2|column 2» …;', 'ORDER BY {句|く}：{並|なら}べる{順番|じゅんばん}を{書|か}く。この Lesson で{学|まな}ぶ{句|く}。', 'ORDER BY clause: the sort order. New in this Lesson.', True),
    ],
    syntax_extra=minitable([('{書|か}き{方|かた}', 'keyword'), ('{意味|いみ}', 'meaning')], [
        ('ASC', ('{小|ちい}さい{順|じゅん}（{昇順|しょうじゅん}）：1→9、A→Z。{書|か}かないと ASC になる。', 'ascending: 1→9, A→Z. This is the default.')),
        ('DESC', ('{大|おお}きい{順|じゅん}（{降順|こうじゅん}）：9→1、Z→A。', 'descending: 9→1, Z→A.')),
    ]),
    see=dict(q=('category の A→Z {順|じゅん}に{並|なら}べ、{同|おな}じ category の{中|なか}では price の{高|たか}い{順|じゅん}にする。', 'Sort by category A→Z, and inside each category by price from high to low.'),
             sql='SELECT name, category, price\nFROM products\nORDER BY category ASC, price DESC;', mark='ORDER BY category ASC, price DESC',
             viz=dict(kind='before_after', table='products', base='SELECT name, category, price FROM products', arrow='<span>ORDER BY</span>'),
             note=('まず category で{並|なら}べ、category が{同|おな}じ{行|ぎょう}の{中|なか}だけを price で{並|なら}べる。', 'First sort by category; only rows with the same category are then sorted by price.')),
    points=[
        (('ORDER BY は、SELECT {文|ぶん}のほぼ{最後|さいご}（WHERE の{後|うし}ろ）に{書|か}く。', 'Write ORDER BY near the end of the statement, after WHERE.'),),
        (('ASC・DESC は、{列|れつ}ごとに{付|つ}ける。DESC は、{直前|ちょくぜん}の 1 つの{列|れつ}にしかかからない。', 'Put ASC or DESC after each column. DESC applies only to the column right before it.'),),
        (('ORDER BY がないと、{行|ぎょう}の{順番|じゅんばん}は{決|き}まらない（たまたまの{順番|じゅんばん}になる）。', 'Without ORDER BY, the row order is not fixed (it is whatever happens).'),),
    ],
    notes=[('NULL の{位置|いち}は DBMS によってちがう。ASC のとき、SQLite・MySQL は{先頭|せんとう}、Oracle・PostgreSQL は{最後|さいご}になる。', 'Where NULL goes differs: with ASC it comes first in SQLite and MySQL, last in Oracle and PostgreSQL.')],
    mistakes=[
        dict(wrong='SELECT name, category, price FROM products\nORDER BY category, price DESC;', mark_w='category, price DESC',
             right='SELECT name, category, price FROM products\nORDER BY category DESC, price DESC;', mark_r='category DESC',
             why=('「category も price も{大|おお}きい{順|じゅん}」のつもりでも、DESC は price にしかかからない。category は ASC になる。', 'You want both in descending order, but DESC applies only to price. category is sorted ASC.'),
             note=('category が A→Z の{順|じゅん}になっている。', 'category is in A→Z order.')),
        dict(wrong='SELECT name, price FROM products\nORDER BY price WHERE price > 3000;', mark_w='ORDER BY price WHERE price > 3000',
             right='SELECT name, price FROM products\nWHERE price > 3000 ORDER BY price;', mark_r='WHERE price > 3000 ORDER BY price',
             why=('{句|く}の{順番|じゅんばん}が{逆|ぎゃく}。WHERE {句|く}を{先|さき}に、ORDER BY {句|く}を{後|あと}に{書|か}く。', 'The clauses are in the wrong order. Write WHERE first, then ORDER BY.')),
    ],
    **{'try': [
        dict(q=('students を score の{高|たか}い{順|じゅん}に{並|なら}べて、name と score を{取|と}り{出|だ}そう。', 'Sort students by score from high to low and get name and score.'), answer='SELECT name, score FROM students ORDER BY score DESC;'),
        dict(q=('products を release_year の{新|あたら}しい{順|じゅん}に、{同|おな}じ{年|とし}なら name の A→Z {順|じゅん}に{並|なら}べよう。', 'Sort products by release_year (newest first), then by name A→Z.'), answer='SELECT name, release_year FROM products ORDER BY release_year DESC, name ASC;'),
        dict(q=('students を major の A→Z {順|じゅん}に、{同|おな}じ major なら age の{若|わか}い{順|じゅん}に{並|なら}べよう。', 'Sort students by major A→Z, then by age from youngest.'), answer='SELECT name, major, age FROM students ORDER BY major, age;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 10
_cat_rows = run('SELECT category FROM products')[1]
def first_seen(i):
    return 'keep' if _cat_rows[i] not in _cat_rows[:i] else 'gone'
LESSONS.append(dict(
    no=10, key='distinct', kw='DISTINCT',
    title=('{重複|ちょうふく}を{除|のぞ}く', 'Remove duplicates: DISTINCT'),
    goal=('{同|おな}じ{値|あたい}を 1 つにまとめて、{種類|しゅるい}の{一覧|いちらん}を{作|つく}れる。', 'You can merge equal values into one and make a list of kinds.'),
    syntax=[
        ('SELECT DISTINCT «{列|れつ}|column», …', 'SELECT DISTINCT：{同|おな}じ{行|ぎょう}を 1 つにまとめる。この Lesson で{学|まな}ぶ{書|か}き{方|かた}。', 'SELECT DISTINCT: merge identical rows into one. New in this Lesson.', True),
        ('FROM «{表|ひょう}|table»;', 'FROM {句|く}：どの{表|ひょう}から{取|と}り{出|だ}すか。', 'FROM clause: which table.', False),
    ],
    see=dict(q=('{商品|しょうひん}の category に、どんな{種類|しゅるい}があるかを{調|しら}べる。', 'Find out which categories the products have.'),
             sql='SELECT DISTINCT category\nFROM products;', mark='DISTINCT',
             viz=dict(kind='before_after', table='products', base='SELECT category FROM products', base_cls=lambda r, i: first_seen(i), arrow='<span>DISTINCT</span>'),
             note=('2 {回目|かいめ}{以降|いこう}に{出|で}てくる{同|おな}じ{値|あたい}は、{消|き}える。', 'Values that appear a second time or later disappear.')),
    points=[
        (('DISTINCT は、SELECT のすぐ{後|うし}ろに{書|か}く。', 'Write DISTINCT right after SELECT.'),),
        (('{列|れつ}が2 つ{以上|いじょう}のときは、「{列|れつ}の{組|く}み{合|あ}わせ」が{同|おな}じ{行|ぎょう}をまとめる。', 'With two or more columns, rows whose combination of values is the same are merged.'),),
        (('DISTINCT の{結果|けっか}の{順番|じゅんばん}は{決|き}まらない。{順番|じゅんばん}が{必要|ひつよう}なら ORDER BY を{付|つ}ける。', 'The order of DISTINCT results is not fixed. Add ORDER BY if you need an order.'),),
    ],
    mistakes=[
        dict(wrong='SELECT category DISTINCT\nFROM products;', mark_w='category DISTINCT', right='SELECT DISTINCT category\nFROM products;', mark_r='DISTINCT category',
             why=('DISTINCT は、{列|れつ}の{前|まえ}（SELECT のすぐ{後|うし}ろ）に{書|か}く。', 'DISTINCT goes before the columns, right after SELECT.')),
        dict(wrong='SELECT DISTINCT category, name\nFROM products;', mark_w='category, name', right='SELECT DISTINCT category\nFROM products;', mark_r='category',
             why=('name も{一緒|いっしょ}に{書|か}くと、「category と name の{組|く}み{合|あ}わせ」がちがえば{別|べつ}の{行|ぎょう}になる。{種類|しゅるい}だけ{知|し}りたいときは、その{列|れつ}だけを{書|か}く。', 'With name as well, each different category–name pair is a separate row. To list the kinds only, write just that column.'),
             note=('{商品|しょうひん}ごとの 10 {行|ぎょう}になり、まとまらない。', 'You get 10 rows, one per product. Nothing is merged.')),
    ],
    **{'try': [
        dict(q=('students の major に、どんな{種類|しゅるい}があるかを{取|と}り{出|だ}そう。', 'List the kinds of major in students.'), answer='SELECT DISTINCT major FROM students;'),
        dict(q=('products の release_year の{種類|しゅるい}を、{新|あたら}しい{順|じゅん}に{取|と}り{出|だ}そう。', 'List the kinds of release_year in products, newest first.'), answer='SELECT DISTINCT release_year FROM products ORDER BY release_year DESC;'),
        dict(q=('students の major と enrollment_year の{組|く}み{合|あ}わせの{種類|しゅるい}を{取|と}り{出|だ}そう。', 'List the kinds of major–enrollment_year combinations in students.'), answer='SELECT DISTINCT major, enrollment_year FROM students;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 11
COMPARE = ('<div class="compare"><div><h4>' + J('このアプリ・MySQL・PostgreSQL') + '<span class="en">this app, MySQL, PostgreSQL</span></h4>'
           + sql('ORDER BY price DESC\nLIMIT 3 OFFSET 3;') + '</div><div><h4>' + J('{標準|ひょうじゅん} SQL・Oracle・SQL Server') + '<span class="en">standard SQL, Oracle, SQL Server</span></h4>'
           + sql('ORDER BY price DESC\nOFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY;') + '</div></div>'
           + B(('{右|みぎ}の{書|か}き{方|かた}は、『スッキリわかる SQL {入門|にゅうもん}』や Oracle の{資格|しかく}{試験|しけん}で{使|つか}われる。{意味|いみ}はどちらも「4 {番目|ばんめ}から 3 {件|けん}」。', 'The right-hand form is used in the school book and the Oracle exams. Both mean “3 rows from the 4th”.'), cls='ops-note'))
LESSONS.append(dict(
    no=11, key='limit', kw='LIMIT・OFFSET',
    title=('{件数|けんすう}を{決|き}める', 'Limit the number of rows: LIMIT and OFFSET'),
    goal=('「{上|うえ}から 3 {件|けん}」「4 {番目|ばんめ}から 3 {件|けん}」のように、{取|と}り{出|だ}す{行|ぎょう}の{数|かず}を{決|き}められる。', 'You can choose how many rows to get, like “the top 3” or “3 rows from the 4th”.'),
    syntax=[
        ('ORDER BY «{列|れつ}|column» …', 'ORDER BY {句|く}：{先|さき}に{順番|じゅんばん}を{決|き}める。', 'ORDER BY clause: decide the order first.', False),
        ('LIMIT «{件数|けんすう}|count» OFFSET «とばす{件数|けんすう}|rows to skip»;', 'LIMIT {句|く}：{何|なん}{件|けん}{取|と}り{出|だ}すか。OFFSET で、{先頭|せんとう}を{何|なん}{件|けん}とばすか。', 'LIMIT clause: how many rows. OFFSET: how many to skip first.', True),
    ],
    syntax_extra=COMPARE,
    see=dict(q=('price の{高|たか}い{順|じゅん}に{並|なら}べて、{上|うえ}から 3 {件|けん}を{取|と}り{出|だ}す。', 'Sort by price from high to low and get the top 3.'),
             sql='SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;', mark='LIMIT 3',
             viz=dict(kind='before_after', table='products', label='ORDER BY price DESC', base='SELECT name, price FROM products ORDER BY price DESC', base_cls=lambda r, i: 'keep' if i < 3 else 'gone', arrow='<span>LIMIT 3</span>'),
             note=('{並|なら}べかえた{後|あと}の、{上|うえ}から 3 {行|ぎょう}だけが{残|のこ}る。', 'Only the first 3 rows after sorting stay.')),
    points=[
        (('OFFSET は「とばす{行|ぎょう}の{数|かず}」。4 {番目|ばんめ}から{取|と}り{出|だ}すときは、3 {行|ぎょう}とばすので OFFSET 3。', 'OFFSET is the number of rows to skip. To start from the 4th row, skip 3: OFFSET 3.'), '<code class="ex">ORDER BY price DESC LIMIT 3 OFFSET 3</code>'),
        (('LIMIT は、ORDER BY と{一緒|いっしょ}に{使|つか}う。{順番|じゅんばん}が{決|き}まっていないと、「{上|うえ}から」も{決|き}まらない。', 'Use LIMIT together with ORDER BY. Without a fixed order, “the top” is not fixed either.'),),
        (('LIMIT・OFFSET は、{文|ぶん}の{一番|いちばん}{最後|さいご}に{書|か}く。', 'Write LIMIT and OFFSET at the very end of the statement.'),),
    ],
    mistakes=[
        dict(wrong='SELECT name, price FROM products\nORDER BY price DESC LIMIT 3 OFFSET 4;', mark_w='OFFSET 4', right='SELECT name, price FROM products\nORDER BY price DESC LIMIT 3 OFFSET 3;', mark_r='OFFSET 3',
             why=('「4 {番目|ばんめ}から」のつもりで OFFSET 4 と{書|か}くと、4 {行|ぎょう}とばして 5 {番目|ばんめ}からになる。', 'Writing OFFSET 4 for “from the 4th” skips 4 rows and starts from the 5th.'),
             note=('4 {番目|ばんめ}の{行|ぎょう}が{消|き}え、7 {番目|ばんめ}の{行|ぎょう}が{余分|よぶん}に{入|はい}っている。', 'The 4th row is missing and the 7th row is extra.')),
        dict(wrong='SELECT name, price FROM products\nLIMIT 3;', mark_w='LIMIT 3', right='SELECT name, price FROM products\nORDER BY price DESC LIMIT 3;', mark_r='ORDER BY price DESC',
             why=('「{高|たか}い{順|じゅん}に 3 {件|けん}」のつもりでも、ORDER BY がないと、{表|ひょう}にたまたま{入|はい}っている{順|じゅん}の 3 {件|けん}になる。', 'You want the 3 most expensive, but without ORDER BY you get whatever 3 rows come first in the table.'),
             note=('{一番|いちばん}{高|たか}い{商品|しょうひん}が、{入|はい}っていない。', 'The most expensive product is missing.')),
    ],
    **{'try': [
        dict(q=('students を score の{高|たか}い{順|じゅん}に{並|なら}べて、{上位|じょうい} 3 {人|にん}の name と score を{取|と}り{出|だ}そう。', 'Get name and score of the top 3 students by score.'), answer='SELECT name, score FROM students ORDER BY score DESC LIMIT 3;'),
        dict(q=('products を price の{安|やす}い{順|じゅん}に{並|なら}べて、4〜6 {番目|ばんめ}の name と price を{取|と}り{出|だ}そう。', 'Sort products by price from low to high and get the 4th to 6th.'), answer='SELECT name, price FROM products ORDER BY price ASC LIMIT 3 OFFSET 3;'),
        dict(q=('students を age の{若|わか}い{順|じゅん}に{並|なら}べて、{先頭|せんとう}の 2 {人|にん}の name と age を{取|と}り{出|だ}そう。', 'Get name and age of the 2 youngest students.'), answer='SELECT name, age FROM students ORDER BY age ASC LIMIT 2;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 12
LESSONS.append(dict(
    no=12, key='insert', kw='INSERT', dml_table='products', dml_verb=('{追加|ついか}される', 'added'),
    title=('{行|ぎょう}を{追加|ついか}する', 'Add rows: INSERT'),
    goal=('{表|ひょう}に、{新|あたら}しい{行|ぎょう}を{追加|ついか}できる。', 'You can add a new row to a table.'),
    syntax=[
        ('INSERT INTO «{表|ひょう}|table» («{列|れつ}|column», …)', 'INSERT INTO：どの{表|ひょう}の、どの{列|れつ}に{入|い}れるか。', 'INSERT INTO: which table and columns.', True),
        ('VALUES («{値|あたい}|value», …);', 'VALUES：{入|い}れる{値|あたい}を、{列|れつ}と{同|おな}じ{順番|じゅんばん}で{書|か}く。', 'VALUES: the values, in the same order as the columns.', True),
    ],
    see=dict(q=('products に、{新|あたら}しい{商品|しょうひん}「USB Cable」を{追加|ついか}する。', 'Add a new product “USB Cable” to products.'),
             sql="INSERT INTO products (id, name, category, price, stock, release_year)\nVALUES (11, 'USB Cable', 'Electronics', 800, 100, 2024);",
             viz=dict(kind='dml', table='products', ids=[8, 9, 10, 11], layout='stack', changed=('1 {行|ぎょう}が{追加|ついか}された（{表|ひょう}の{下|した}の{方|ほう}だけを{表示|ひょうじ}）。', '1 row was added (only the bottom of the table is shown).')),
             note=('{列|れつ}の{並|なら}びと{値|あたい}の{並|なら}びが、1 つずつ{対応|たいおう}している。', 'Each value matches the column in the same position.')),
    points=[
        (('{列|れつ}の{数|かず}と{値|あたい}の{数|かず}は、{同|おな}じにする。{順番|じゅんばん}も{合|あ}わせる。', 'Use the same number of columns and values, in the same order.'),),
        (('{書|か}かなかった{列|れつ}には、NULL（または{決|き}められた{初期値|しょきち}）が{入|はい}る。', 'Columns you leave out get NULL (or their default value).'), "<code class=\"ex\">INSERT INTO products (id, name) VALUES (12, 'Notebook');</code>"),
        (('{列|れつ}の{名前|なまえ}を{省略|しょうりゃく}すると、{表|ひょう}のすべての{列|れつ}に、{表|ひょう}の{順番|じゅんばん}どおりに{入|い}れる。', 'If you leave out the column names, values go into every column in table order.'),),
    ],
    mistakes=[
        dict(wrong="INSERT INTO products (id, name, price)\nVALUES (11, 'USB Cable');", mark_w="(11, 'USB Cable')", right="INSERT INTO products (id, name, price)\nVALUES (11, 'USB Cable', 800);", mark_r='800',
             why=('{列|れつ}は 3 つなのに、{値|あたい}が 2 つしかない。{数|かず}が{合|あ}わないと、エラーになる。', 'There are 3 columns but only 2 values. If the numbers differ, you get an error.')),
        dict(wrong="INSERT INTO products (id, name, price)\nVALUES (11, 800, 'USB Cable');", mark_w="800, 'USB Cable'", right="INSERT INTO products (id, name, price)\nVALUES (11, 'USB Cable', 800);", mark_r="'USB Cable', 800",
             why=('{値|あたい}の{順番|じゅんばん}が、{列|れつ}とちがう。このアプリ（SQLite）ではエラーにならず、name に 800 が{入|はい}ってしまう。{多|おお}くのデータベースでは、エラーになる。', 'The values are in a different order from the columns. SQLite (this app) gives no error and puts 800 into name. Most databases give an error.'),
             note=('name と price が、{入|い}れかわっている。', 'name and price are swapped.')),
    ],
    **{'try': [
        dict(q=("products に、id 12・name 'Notebook'・category 'Books'・price 500・stock 80・release_year 2024 の{行|ぎょう}を{追加|ついか}しよう。", "Add a row to products: id 12, name 'Notebook', category 'Books', price 500, stock 80, release_year 2024."), answer="INSERT INTO products (id, name, category, price, stock, release_year) VALUES (12, 'Notebook', 'Books', 500, 80, 2024);", lines=2),
        dict(q=("products に、id 13・name 'Desk Lamp'・price 2500 だけを{入|い}れた{行|ぎょう}を{追加|ついか}しよう。", "Add a row to products with only id 13, name 'Desk Lamp' and price 2500."), answer="INSERT INTO products (id, name, price) VALUES (13, 'Desk Lamp', 2500);"),
        dict(q=("{列|れつ}の{名前|なまえ}を{省略|しょうりゃく}して、products に (14, 'Mug', 'Kitchen', 900, 30, 2023) を{追加|ついか}しよう。", "Without column names, add (14, 'Mug', 'Kitchen', 900, 30, 2023) to products."), answer="INSERT INTO products VALUES (14, 'Mug', 'Kitchen', 900, 30, 2023);"),
    ]},
))

# ---------------------------------------------------------------- Lesson 13
LESSONS.append(dict(
    no=13, key='update', kw='UPDATE', dml_table='products', dml_verb=('{変更|へんこう}される', 'changed'),
    title=('{行|ぎょう}を{変更|へんこう}する', 'Change rows: UPDATE'),
    goal=('{条件|じょうけん}に{合|あ}う{行|ぎょう}の{値|あたい}だけを、{安全|あんぜん}に{書|か}き{換|か}えられる。', 'You can safely change values only in the rows that meet a condition.'),
    syntax=[
        ('UPDATE «{表|ひょう}|table»', 'UPDATE：どの{表|ひょう}を{変|か}えるか。', 'UPDATE: which table to change.', True),
        ('SET «{列|れつ}|column» = «{値|あたい}|value», …', 'SET {句|く}：どの{列|れつ}を、どんな{値|あたい}にするか。', 'SET clause: which column gets which value.', True),
        ('WHERE «{条件|じょうけん}|condition»;', 'WHERE {句|く}：どの{行|ぎょう}を{変|か}えるか。{忘|わす}れると{全部|ぜんぶ}の{行|ぎょう}が{変|か}わる。', 'WHERE clause: which rows to change. Without it, every row changes.', False),
    ],
    see=dict(q=('id が 1 の{商品|しょうひん}の price を、1200 に{変|か}える。', 'Change the price of the product with id 1 to 1200.'),
             sql='UPDATE products\nSET price = 1200\nWHERE id = 1;', mark=['SET price = 1200', 'WHERE id = 1'],
             viz=dict(kind='dml', table='products', ids=[1, 2, 3], cols=['id', 'name', 'price'], changed=('1 {行|ぎょう}の price が{変更|へんこう}された（{上|うえ}の 3 {行|ぎょう}だけを{表示|ひょうじ}）。', 'The price of 1 row was changed (only the top 3 rows are shown).')),
             note=('WHERE に{合|あ}う{行|ぎょう}の、SET に{書|か}いた{列|れつ}だけが{変|か}わる。ほかの{列|れつ}や{行|ぎょう}はそのまま。', 'Only the SET columns of the rows that match WHERE change. Everything else stays.')),
    points=[
        (('{変|か}える{前|まえ}に、{同|おな}じ WHERE で SELECT して、{変|か}わる{行|ぎょう}を{確|たし}かめる{習慣|しゅうかん}をつける。', 'Before changing, run SELECT with the same WHERE to check which rows will change.'), '<code class="ex">SELECT * FROM products WHERE id = 1;</code>'),
        (('{複数|ふくすう}の{列|れつ}を{変|か}えるときは、SET の{後|うし}ろをカンマで{区切|くぎ}る。', 'To change several columns, separate them with commas after SET.'), '<code class="ex">SET price = 1200, stock = 60</code>'),
        (('{今|いま}の{値|あたい}を{使|つか}った{計算|けいさん}もできる。', 'You can calculate from the current value.'), '<code class="ex">SET price = price + 100</code>'),
    ],
    mistakes=[
        dict(wrong='UPDATE products\nSET stock = 0;', mark_w='SET stock = 0;', right='UPDATE products\nSET stock = 0\nWHERE id = 5;', mark_r='WHERE id = 5',
             why=('WHERE を{忘|わす}れると、{表|ひょう}のすべての{行|ぎょう}が{変|か}わってしまう。{元|もと}に{戻|もど}すのは{大変|たいへん}。', 'Without WHERE, every row of the table changes. It is hard to undo.'),
             note=('10 {行|ぎょう}すべての stock が 0 になった。', 'The stock of all 10 rows became 0.')),
        dict(wrong='UPDATE products\nSET price = 1200 AND stock = 60\nWHERE id = 1;', mark_w='AND', right='UPDATE products\nSET price = 1200, stock = 60\nWHERE id = 1;', mark_r=',',
             why=('SET の{区切|くぎ}りは AND ではなくカンマ。AND で{書|か}くと、price に「1200 AND stock = 60」の{結果|けっか}（0）が{入|はい}ってしまう。', 'Separate SET items with commas, not AND. With AND, price gets the result of “1200 AND stock = 60” (0).'),
             note=('price が 0 になり、stock は{変|か}わっていない。', 'price became 0 and stock did not change.')),
    ],
    **{'try': [
        dict(q=('id が 5 の{商品|しょうひん}の stock を、0 に{変|か}えよう。', 'Change the stock of the product with id 5 to 0.'), answer='UPDATE products SET stock = 0 WHERE id = 5;'),
        dict(q=("category が 'Books' の{商品|しょうひん}の price を、100 {上|あ}げよう。", "Raise the price of the 'Books' products by 100."), answer="UPDATE products SET price = price + 100 WHERE category = 'Books';"),
        dict(q=('id が 3 の{商品|しょうひん}の price を 9000 に、stock を 20 に、{同時|どうじ}に{変|か}えよう。', 'Change price to 9000 and stock to 20 of the product with id 3 at the same time.'), answer='UPDATE products SET price = 9000, stock = 20 WHERE id = 3;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 14
LESSONS.append(dict(
    no=14, key='delete', kw='DELETE', dml_table='products', dml_verb=('{削除|さくじょ}される', 'deleted'),
    title=('{行|ぎょう}を{削除|さくじょ}する', 'Delete rows: DELETE'),
    goal=('{条件|じょうけん}に{合|あ}う{行|ぎょう}だけを、{安全|あんぜん}に{削除|さくじょ}できる。', 'You can safely delete only the rows that meet a condition.'),
    syntax=[
        ('DELETE FROM «{表|ひょう}|table»', 'DELETE FROM：どの{表|ひょう}から{削除|さくじょ}するか。', 'DELETE FROM: which table to delete from.', True),
        ('WHERE «{条件|じょうけん}|condition»;', 'WHERE {句|く}：どの{行|ぎょう}を{削除|さくじょ}するか。{忘|わす}れると{全部|ぜんぶ}{消|き}える。', 'WHERE clause: which rows to delete. Without it, everything is deleted.', False),
    ],
    see=dict(q=('stock が 15 {未満|みまん}の{商品|しょうひん}を、{削除|さくじょ}する。', 'Delete the products whose stock is less than 15.'),
             sql='DELETE FROM products\nWHERE stock < 15;', mark='WHERE stock < 15',
             viz=dict(kind='dml', table='products', cols=['id', 'name', 'stock'], changed=('3 {行|ぎょう}が{削除|さくじょ}された。', '3 rows were deleted.')),
             note=('WHERE に{合|あ}う{行|ぎょう}が、{行|ぎょう}ごと{消|き}える。', 'The rows that match WHERE disappear as whole rows.')),
    points=[
        (('{消|け}す{前|まえ}に、{同|おな}じ WHERE で SELECT して、{消|き}える{行|ぎょう}を{確|たし}かめる。', 'Before deleting, run SELECT with the same WHERE to see which rows will go.'), '<code class="ex">SELECT * FROM products WHERE stock &lt; 15;</code>'),
        (('DELETE は{行|ぎょう}ごと{消|け}す。{一部|いちぶ}の{列|れつ}だけを{空|から}にしたいときは、UPDATE … SET {列|れつ} = NULL を{使|つか}う。', 'DELETE removes whole rows. To empty only some columns, use UPDATE … SET column = NULL.'),),
        (('{消|け}したデータを{戻|もど}す{方法|ほうほう}（ROLLBACK）は、{上級|じょうきゅう}の Lesson 36 で{学|まな}ぶ。', 'How to undo a delete (ROLLBACK) is in Advanced Lesson 36.'),),
    ],
    mistakes=[
        dict(wrong='DELETE FROM products;', mark_w='DELETE FROM products;', right='DELETE FROM products\nWHERE id = 10;', mark_r='WHERE id = 10',
             why=('WHERE を{忘|わす}れると、{表|ひょう}の{行|ぎょう}がすべて{消|き}えてしまう。', 'Without WHERE, every row of the table is deleted.'),
             note=('{本当|ほんとう}は 1 {行|ぎょう}だけ{消|け}すはずが、{表|ひょう}が{空|から}になった。', 'Only 1 row should go, but the table is now empty.')),
        dict(wrong='DELETE name FROM products\nWHERE id = 10;', mark_w='name', right='DELETE FROM products\nWHERE id = 10;', mark_r='DELETE FROM',
             why=('DELETE の{後|うし}ろに{列|れつ}は{書|か}かない。DELETE は、いつも{行|ぎょう}ごと{消|け}す。', 'Do not write columns after DELETE. DELETE always removes whole rows.')),
    ],
    **{'try': [
        dict(q=('id が 10 の{商品|しょうひん}を{削除|さくじょ}しよう。', 'Delete the product with id 10.'), answer='DELETE FROM products WHERE id = 10;'),
        dict(q=("category が 'Kitchen' の{商品|しょうひん}を{削除|さくじょ}しよう。", "Delete the products in 'Kitchen'."), answer="DELETE FROM products WHERE category = 'Kitchen';"),
        dict(q=('release_year が 2019 {以前|いぜん}の{商品|しょうひん}を{削除|さくじょ}しよう。', 'Delete the products released in 2019 or earlier.'), answer='DELETE FROM products WHERE release_year <= 2019;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 15
AGG = minitable([('{関数|かんすう}', 'function'), ('{意味|いみ}', 'meaning'), ('{例|れい}', 'example')], [
    ('COUNT(*)', ('{行|ぎょう}の{数|かず}', 'number of rows'), 'COUNT(*)'),
    ('SUM', ('{合計|ごうけい}', 'total'), 'SUM(stock)'),
    ('AVG', ('{平均|へいきん}', 'average'), 'AVG(price)'),
    ('MAX / MIN', ('{一番|いちばん}{大|おお}きい{値|あたい} / {小|ちい}さい{値|あたい}', 'largest / smallest value'), 'MAX(price)'),
])
LESSONS.append(dict(
    no=15, key='aggregate', kw='COUNT・SUM・AVG',
    title=('{集計|しゅうけい}する', 'Count, total, average: aggregate functions'),
    goal=('{行|ぎょう}の{数|かず}・{合計|ごうけい}・{平均|へいきん}・{最大|さいだい}・{最小|さいしょう}を{求|もと}められる。', 'You can find the number of rows, total, average, maximum and minimum.'),
    syntax=[
        ('SELECT «{集計関数|しゅうけいかんすう}|aggregate»(«{列|れつ}|column»), …', 'SELECT {句|く}：{集計関数|しゅうけいかんすう}で、たくさんの{行|ぎょう}を 1 つの{値|あたい}にまとめる。この Lesson で{学|まな}ぶ{書|か}き{方|かた}。', 'SELECT clause: aggregate functions turn many rows into one value. New in this Lesson.', True),
        ('FROM «{表|ひょう}|table»;', 'FROM {句|く}：どの{表|ひょう}を{集計|しゅうけい}するか。', 'FROM clause: which table to aggregate.', False),
    ],
    syntax_extra=AGG,
    see=dict(q=('{商品|しょうひん}の{数|かず}、{在庫|ざいこ}の{合計|ごうけい}、price の{平均|へいきん}・{最大|さいだい}・{最小|さいしょう}を{求|もと}める。', 'Find the number of products, the total stock, and the average, highest and lowest price.'),
             sql='SELECT COUNT(*), SUM(stock), AVG(price), MAX(price), MIN(price)\nFROM products;',
             viz=dict(kind='before_after', table='products', base='SELECT name, price, stock FROM products', arrow='<span>COUNT・SUM<br>AVG・MAX・MIN</span>'),
             note=('10 {行|ぎょう}が、{集計|しゅうけい}された 1 {行|ぎょう}にまとまる。', 'The 10 rows become one row of totals.')),
    points=[
        (('{集計関数|しゅうけいかんすう}を{使|つか}うと、{結果|けっか}は 1 {行|ぎょう}になる。WHERE を{付|つ}けると、{残|のこ}った{行|ぎょう}だけで{集計|しゅうけい}する。', 'With aggregate functions the result is one row. With WHERE, only the remaining rows are aggregated.'), "<code class=\"ex\">SELECT AVG(score) FROM students WHERE major = 'IT';</code>"),
        (('COUNT(*) は{行|ぎょう}の{数|かず}、COUNT({列|れつ}) は、その{列|れつ}が NULL ではない{行|ぎょう}の{数|かず}。', 'COUNT(*) counts rows; COUNT(column) counts rows where that column is not NULL.'),),
        (('SUM・AVG・MAX・MIN も、NULL を{無視|むし}して{計算|けいさん}する。', 'SUM, AVG, MAX and MIN also ignore NULL.'),),
    ],
    mistakes=[
        dict(wrong='SELECT COUNT(email)\nFROM members;', mark_w='COUNT(email)', right='SELECT COUNT(*)\nFROM members;', mark_r='COUNT(*)',
             why=('「{会員|かいいん}の{人数|にんずう}」のつもりでも、COUNT(email) は email が NULL の{人|ひと}を{数|かぞ}えない。{人数|にんずう}は COUNT(*) で{数|かぞ}える。', 'You want the number of members, but COUNT(email) skips people whose email is NULL. Count people with COUNT(*).'),
             note=('6 {人|にん}ではなく、4 {人|にん}になってしまう。', 'You get 4 instead of 6.')),
        dict(wrong='SELECT name, MAX(price)\nFROM products;', mark_w='name,', right='SELECT MAX(price)\nFROM products;', mark_r='MAX(price)',
             why=('{集計|しゅうけい}すると{結果|けっか}は 1 {行|ぎょう}なので、name のようなふつうの{列|れつ}は{一緒|いっしょ}に{書|か}けない。{多|おお}くのデータベースではエラー。このアプリ（SQLite）では、たまたま{動|うご}いてしまう。', 'An aggregate gives one row, so a normal column like name cannot go with it. Most databases give an error; SQLite (this app) happens to run it.'),
             note=('{列|れつ}が 1 つ{多|おお}い。{他|ほか}のデータベースでは、ここでエラーになる。', 'There is one column too many. Other databases stop with an error here.')),
    ],
    **{'try': [
        dict(q=('students の{人数|にんずう}を{数|かぞ}えよう。', 'Count the students.'), answer='SELECT COUNT(*) FROM students;'),
        dict(q=("students で、major が 'IT' の{学生|がくせい}の score の{平均|へいきん}を{求|もと}めよう。", "Find the average score of the IT students."), answer="SELECT AVG(score) FROM students WHERE major = 'IT';"),
        dict(q=('products の stock の{合計|ごうけい}と、price の{最大|さいだい}を{求|もと}めよう。', 'Find the total stock and the highest price of products.'), answer='SELECT SUM(stock), MAX(price) FROM products;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 16
LESSONS.append(dict(
    no=16, key='groupby', kw='GROUP BY',
    title=('グループごとに{集計|しゅうけい}する', 'Aggregate by group: GROUP BY'),
    goal=('「category ごと」「major ごと」のように、グループに{分|わ}けて{集計|しゅうけい}できる。', 'You can aggregate per group, like “per category” or “per major”.'),
    syntax=[
        ('SELECT «{列|れつ}|column», «{集計関数|しゅうけいかんすう}|aggregate»(…)', 'SELECT {句|く}：グループの{列|れつ}と、{集計|しゅうけい}した{値|あたい}を{書|か}く。', 'SELECT clause: the group column and the aggregate.', False),
        ('FROM «{表|ひょう}|table»', 'FROM {句|く}：どの{表|ひょう}か。', 'FROM clause: which table.', False),
        ('GROUP BY «{列|れつ}|column»;', 'GROUP BY {句|く}：どの{列|れつ}の{値|あたい}ごとにまとめるか。この Lesson で{学|まな}ぶ{句|く}。', 'GROUP BY clause: the column to group by. New in this Lesson.', True),
    ],
    see=dict(q=('category ごとに、{商品|しょうひん}の{数|かず}と price の{平均|へいきん}を{求|もと}める。', 'For each category, find the number of products and the average price.'),
             sql='SELECT category, COUNT(*), AVG(price)\nFROM products\nGROUP BY category;', mark='GROUP BY category',
             viz=dict(kind='group', table='products', by='category', base='SELECT name, category, price FROM products ORDER BY category, id', arrow='<span>GROUP BY<br>category</span>'),
             note=('{同|おな}じ{色|いろ}の{行|ぎょう}が、{右|みぎ}の 1 {行|ぎょう}にまとまる。グループの{数|かず}（4 つ）だけ{行|ぎょう}ができる。', 'Rows of the same colour become one row on the right. You get one row per group (4).')),
    points=[
        (('GROUP BY は、{列|れつ}の{値|あたい}が{同|おな}じ{行|ぎょう}を、1 つのグループにする。{集計関数|しゅうけいかんすう}は、グループごとに{計算|けいさん}される。', 'GROUP BY puts rows with the same value into one group. Aggregates are calculated per group.'),),
        (('SELECT に{書|か}けるふつうの{列|れつ}は、GROUP BY に{書|か}いた{列|れつ}だけ。', 'The only normal columns you can put in SELECT are the GROUP BY columns.'),),
        (('{並|なら}べかえるときは、GROUP BY の{後|うし}ろに ORDER BY を{書|か}く。{集計|しゅうけい}した{値|あたい}でも{並|なら}べられる。', 'To sort, write ORDER BY after GROUP BY. You can sort by an aggregate too.'), '<code class="ex">GROUP BY category ORDER BY AVG(price) DESC</code>'),
    ],
    mistakes=[
        dict(wrong='SELECT category, COUNT(*)\nFROM products;', mark_w='FROM products;', right='SELECT category, COUNT(*)\nFROM products\nGROUP BY category;', mark_r='GROUP BY category',
             why=('GROUP BY がないと、{表|ひょう}{全体|ぜんたい}が 1 つのグループになり、{結果|けっか}は 1 {行|ぎょう}だけになる。', 'Without GROUP BY, the whole table is one group and the result has only one row.'),
             note=('4 {行|ぎょう}あるはずが、1 {行|ぎょう}になっている。', 'There should be 4 rows, but there is only 1.')),
        dict(wrong='SELECT category, name, COUNT(*)\nFROM products\nGROUP BY category;', mark_w='name,', right='SELECT category, COUNT(*)\nFROM products\nGROUP BY category;', mark_r='category, COUNT(*)',
             why=('name は GROUP BY していないので、グループの{中|なか}のどの name を{出|だ}すか{決|き}まらない。{多|おお}くのデータベースではエラー。このアプリ（SQLite）では、どれか 1 つが{出|で}てしまう。', 'name is not grouped, so which name to show is not defined. Most databases give an error; SQLite (this app) shows one of them.'),
             note=('name の{列|れつ}は、グループの{中|なか}のたまたま 1 つ。', 'The name column shows just one of the names in each group.')),
    ],
    **{'try': [
        dict(q=('students の major ごとに、{人数|にんずう}を{数|かぞ}えよう。', 'Count the students per major.'), answer='SELECT major, COUNT(*) FROM students GROUP BY major;'),
        dict(q=('students の major ごとに、score の{平均|へいきん}を{求|もと}めよう。', 'Find the average score per major.'), answer='SELECT major, AVG(score) FROM students GROUP BY major;'),
        dict(q=('products の release_year ごとに{商品|しょうひん}の{数|かず}を{数|かぞ}え、{新|あたら}しい{年|とし}から{並|なら}べよう。', 'Count the products per release_year, newest year first.'), answer='SELECT release_year, COUNT(*) FROM products GROUP BY release_year ORDER BY release_year DESC;'),
    ]},
))

# ---------------------------------------------------------------- Lesson 17
_groups = run('SELECT category, COUNT(*) FROM products GROUP BY category')[1]
LESSONS.append(dict(
    no=17, key='having', kw='HAVING',
    title=('グループを{絞|しぼ}る', 'Filter groups: HAVING'),
    goal=('{集計|しゅうけい}した{結果|けっか}に{条件|じょうけん}を{付|つ}けて、グループを{絞|しぼ}れる。', 'You can filter groups by a condition on their aggregates.'),
    syntax=[
        ('SELECT … FROM … WHERE …', '（WHERE は{集計|しゅうけい}の{前|まえ}に{行|ぎょう}を{絞|しぼ}る）', '(WHERE filters rows before grouping)', False),
        ('GROUP BY «{列|れつ}|column»', 'GROUP BY {句|く}：グループにまとめる。', 'GROUP BY clause: make groups.', False),
        ('HAVING «{集計|しゅうけい}の{条件|じょうけん}|condition on aggregate»;', 'HAVING {句|く}：{条件|じょうけん}に{合|あ}うグループだけを{残|のこ}す。この Lesson で{学|まな}ぶ{句|く}。', 'HAVING clause: keep the groups that meet the condition. New in this Lesson.', True),
    ],
    see=dict(q=('{商品|しょうひん}が 2 つ{以上|いじょう}ある category だけを{取|と}り{出|だ}す。', 'Get only the categories that have 2 or more products.'),
             sql='SELECT category, COUNT(*)\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 2;', mark='HAVING COUNT(*) >= 2',
             viz=dict(kind='before_after', table='products', label='GROUP BY category', base='SELECT category, COUNT(*) FROM products GROUP BY category', base_cls=lambda r, i: 'keep' if _groups[i][1] >= 2 else 'gone', arrow='<span>HAVING<br>COUNT(*) &gt;= 2</span>'),
             note=('{商品|しょうひん}が 1 つしかない Clothing のグループが、{消|き}える。', 'The Clothing group, which has only one product, disappears.')),
    points=[
        (('WHERE は{集計|しゅうけい}する{前|まえ}の「{行|ぎょう}」を{絞|しぼ}り、HAVING は{集計|しゅうけい}した{後|あと}の「グループ」を{絞|しぼ}る。', 'WHERE filters rows before grouping; HAVING filters groups after grouping.'),),
        (('{両方|りょうほう}{使|つか}うときは、WHERE → GROUP BY → HAVING の{順|じゅん}に{書|か}く。', 'When using both, write WHERE → GROUP BY → HAVING.'), "<code class=\"ex\">WHERE price > 2000 GROUP BY category HAVING COUNT(*) >= 2</code>"),
        (('HAVING には、COUNT(*) や AVG(price) のような{集計|しゅうけい}の{条件|じょうけん}を{書|か}く。', 'In HAVING, write conditions on aggregates such as COUNT(*) or AVG(price).'),),
    ],
    mistakes=[
        dict(wrong='SELECT category, COUNT(*) FROM products\nWHERE COUNT(*) >= 2\nGROUP BY category;', mark_w='WHERE COUNT(*) >= 2',
             right='SELECT category, COUNT(*) FROM products\nGROUP BY category\nHAVING COUNT(*) >= 2;', mark_r='HAVING COUNT(*) >= 2',
             why=('WHERE は{集計|しゅうけい}の{前|まえ}に{働|はたら}くので、COUNT(*) などの{集計|しゅうけい}は{使|つか}えない。{集計|しゅうけい}の{条件|じょうけん}は HAVING に{書|か}く。', 'WHERE works before grouping, so aggregates like COUNT(*) cannot be used there. Put conditions on aggregates in HAVING.')),
        dict(wrong='SELECT category, COUNT(*) FROM products\nGROUP BY category\nWHERE price > 2000;', mark_w='WHERE price > 2000',
             right='SELECT category, COUNT(*) FROM products\nWHERE price > 2000\nGROUP BY category;', mark_r='WHERE price > 2000',
             why=('WHERE は、GROUP BY の{前|まえ}に{書|か}く。{先|さき}に{行|ぎょう}を{絞|しぼ}ってから、グループにまとめる。', 'Write WHERE before GROUP BY: first filter the rows, then group them.')),
    ],
    **{'try': [
        dict(q=('students の major ごとの{人数|にんずう}を{数|かぞ}え、3 {人|にん}{以上|いじょう}の major だけを{取|と}り{出|だ}そう。', 'Count students per major and keep only majors with 3 or more students.'), answer='SELECT major, COUNT(*) FROM students GROUP BY major HAVING COUNT(*) >= 3;'),
        dict(q=('products の category ごとの price の{平均|へいきん}を{求|もと}め、5000 {以上|いじょう}の category だけを{取|と}り{出|だ}そう。', 'Find the average price per category and keep only those of 5000 or more.'), answer='SELECT category, AVG(price) FROM products GROUP BY category HAVING AVG(price) >= 5000;'),
        dict(q=('students のうち enrollment_year が 2021 {以降|いこう}の{学生|がくせい}だけで major ごとの{人数|にんずう}を{数|かぞ}え、2 {人|にん}{以上|いじょう}の major を{取|と}り{出|だ}そう。', 'Using only students enrolled in 2021 or later, count per major and keep majors with 2 or more.'), answer='SELECT major, COUNT(*) FROM students WHERE enrollment_year >= 2021 GROUP BY major HAVING COUNT(*) >= 2;', lines=2),
    ]},
))

# ---------------------------------------------------------------- Lesson 18
FLOW_SQL = "SELECT category, COUNT(*) FROM products WHERE price >= 2500 GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category DESC LIMIT 1;"
def flow_steps():
    from build import table_html as T, cap
    all_cols, allr = run('SELECT name, category, price FROM products')
    kept = {r[0] for r in run('SELECT name FROM products WHERE price >= 2500')[1]}
    gcols, grows = run('SELECT name, category, price FROM products WHERE price >= 2500 ORDER BY category, id')
    cats = list(dict.fromkeys(r[1] for r in grows))
    groups = run('SELECT category, COUNT(*) FROM products WHERE price >= 2500 GROUP BY category ORDER BY category')[1]
    base = 'SELECT category, COUNT(*) FROM products WHERE price >= 2500 GROUP BY category HAVING COUNT(*) >= 2'
    sel, ordd, lim = run(base), run(base + ' ORDER BY category DESC'), run(FLOW_SQL)
    def step(i, kw, t, body, n, unit=('{行|ぎょう}', 'rows')):
        en_unit = unit[1][:-1] if n == 1 else unit[1]
        return f'<div class="fl-step"><div class="fl-h"><span class="fl-i">{i}</span><code class="fl-kw">{esc(kw)}</code><span class="fl-n">{ruby(f"{n} {unit[0]}")} <small>{n} {en_unit}</small></span></div>{B(t, cls="fl-d")}{body}</div>'
    g = lambda c: f'g{cats.index(c) % 4}' if c in cats else ''
    s1 = step(1, 'FROM products', ('{表|ひょう}の{行|ぎょう}を、すべて{用意|ようい}する（p.5 の{表|ひょう}と{同|おな}じ 10 {行|ぎょう}）。', 'Take all the rows of the table (the same 10 rows as on p.5).'), '', len(allr))
    s2 = step(2, 'WHERE price >= 2500', ('{条件|じょうけん}に{合|あ}わない{行|ぎょう}を{消|け}す。', 'Remove the rows that do not meet the condition.'), T(all_cols, allr, ['keep' if r[0] in kept else 'gone' for r in allr]), len(kept))
    s3 = step(3, 'GROUP BY category', ('{同|おな}じ category の{行|ぎょう}を、グループにまとめる。', 'Put rows with the same category into groups.'), T(gcols, grows, [g(r[1]) for r in grows]), len(groups), ('グループ', 'groups'))
    s4 = step(4, 'HAVING COUNT(*) >= 2', ('{条件|じょうけん}に{合|あ}わないグループを{消|け}す。', 'Remove the groups that do not meet the condition.'), T(['category', 'COUNT(*)'], groups, [g(r[0]) + ('' if r[1] >= 2 else ' gone') for r in groups]), len(sel[1]), ('グループ', 'groups'))
    s5 = step(5, 'SELECT category, COUNT(*)', ('{表示|ひょうじ}する{列|れつ}を{作|つく}る。', 'Make the columns to show.'), T(*sel), len(sel[1]))
    s6 = step(6, 'ORDER BY category DESC', ('{並|なら}べかえる（Z→A）。', 'Sort (Z→A).'), T(*ordd), len(ordd[1]))
    s7 = step(7, 'LIMIT 1', ('{上|うえ}から 1 {行|ぎょう}だけを{残|のこ}す。これが{結果|けっか}。', 'Keep only the first row. This is the result.'), T(lim[0], lim[1], ['final']), len(lim[1]))
    return f'<div class="fl-row two">{s1}{s2}</div><div class="fl-row two">{s3}{s4}</div><div class="fl-row three">{s5}{s6}{s7}</div>'

LESSONS.append(dict(
    no=18, key='order', kw='{実行|じっこう}{順|じゅん}',
    title=('SQL が{実行|じっこう}される{順番|じゅんばん}', 'The order in which SQL runs'),
    goal=('{書|か}く{順番|じゅんばん}と{実行|じっこう}される{順番|じゅんばん}のちがいを{説明|せつめい}でき、{句|く}を{正|ただ}しい{順|じゅん}に{書|か}ける。', 'You can explain how the writing order differs from the running order, and write clauses in the right order.'),
    see=dict(q=('データベースは、FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT の{順|じゅん}に{処理|しょり}する。{次|つぎ}の SQL で、データが 1 {段|だん}ずつ{絞|しぼ}られていく{様子|ようす}を{見|み}よう。', 'The database works in the order FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Watch the data get narrowed down one step at a time.'),
             sql=FLOW_SQL.replace(' FROM', '\nFROM').replace(' WHERE', '\nWHERE').replace(' GROUP', '\nGROUP').replace(' HAVING', '\nHAVING').replace(' ORDER', '\nORDER').replace(' LIMIT', '\nLIMIT'),
             viz=dict(kind='html', html=flow_steps())),
    points=[
        (('WHERE で COUNT(*) などが{使|つか}えないのは、WHERE がグループを{作|つく}る{前|まえ}に{実行|じっこう}されるから。', 'You cannot use COUNT(*) in WHERE because WHERE runs before the groups are made.'),),
        (('ORDER BY で SELECT の{別名|べつめい}が{使|つか}えるのは、ORDER BY が SELECT の{後|あと}に{実行|じっこう}されるから。', 'You can use a SELECT alias in ORDER BY because ORDER BY runs after SELECT.'), '<code class="ex">SELECT name, price * stock AS stock_value FROM products ORDER BY stock_value DESC;</code>'),
        (('{迷|まよ}ったら、「どの{段階|だんかい}で、{何|なに}が{残|のこ}っているか」を{考|かんが}える。', 'When in doubt, think: at this step, what is left?'),),
    ],
    mistakes=[
        dict(wrong='SELECT category, COUNT(*) FROM products\nGROUP BY category\nHAVING price > 2000;', mark_w='HAVING price > 2000',
             right='SELECT category, COUNT(*) FROM products\nWHERE price > 2000\nGROUP BY category;', mark_r='WHERE price > 2000',
             why=('「price > 2000」は 1 {行|ぎょう}ずつの{条件|じょうけん}なので、グループを{作|つく}る{前|まえ}の WHERE に{書|か}く。HAVING に{書|か}くと、グループの{中|なか}のどれか 1 {行|ぎょう}の price で{判断|はんだん}されてしまう（{多|おお}くのデータベースではエラー）。', '“price > 2000” is a condition on each row, so it belongs in WHERE, before grouping. In HAVING it is judged on just one row of each group (an error in most databases).'),
             note=('Electronics のグループが、{消|き}えている。', 'The Electronics group is missing.')),
        dict(wrong='SELECT category, COUNT(*) FROM products\nGROUP BY category\nORDER BY category\nHAVING COUNT(*) >= 2;', mark_w='ORDER BY category\nHAVING COUNT(*) >= 2',
             right='SELECT category, COUNT(*) FROM products\nGROUP BY category\nHAVING COUNT(*) >= 2\nORDER BY category;', mark_r='HAVING COUNT(*) >= 2\nORDER BY category',
             why=('HAVING は、ORDER BY より{前|まえ}に{書|か}く。{書|か}く{順番|じゅんばん}は、いつも SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT。', 'Write HAVING before ORDER BY. The writing order is always SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.')),
    ],
    **{'try': [
        dict(q=('students で、score が 70 {以上|いじょう}の{学生|がくせい}だけを major ごとに{数|かぞ}え、{人数|にんずう}の{多|おお}い{順|じゅん}に{並|なら}べよう。', 'Count students with a score of 70 or more per major, most students first.'), answer='SELECT major, COUNT(*) FROM students WHERE score >= 70 GROUP BY major ORDER BY COUNT(*) DESC;'),
        dict(q=('products で、category ごとの stock の{合計|ごうけい}を total_stock という{名前|なまえ}で{求|もと}め、{多|おお}い{順|じゅん}に 2 つだけ{取|と}り{出|だ}そう。', 'Find the total stock per category as total_stock and get the top 2.'), answer='SELECT category, SUM(stock) AS total_stock FROM products GROUP BY category ORDER BY total_stock DESC LIMIT 2;'),
        dict(q=('products で、2020 {年|ねん}{以降|いこう}に{発売|はつばい}された{商品|しょうひん}が 2 つ{以上|いじょう}ある category を、A→Z {順|じゅん}に{取|と}り{出|だ}そう。', 'Get the categories with 2 or more products released in 2020 or later, A→Z.'), answer='SELECT category, COUNT(*) FROM products WHERE release_year >= 2020 GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category;', lines=2),
    ]},
))
