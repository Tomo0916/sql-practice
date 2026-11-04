"""
データ分析編（Data analysis）: Units A1–A6 as data, the same shape as content_beginner.py.
Kumo Mart (kumo_*) is the example; the practice uses other businesses (the same tables as the app).
Numbers in the text come from running the SQL, never typed by hand.
"""
import json, subprocess, os
from build import J, B, H, ruby, sql, esc, table_html, run, HERE

FIGS = json.loads(subprocess.run(['node', os.path.join(HERE, 'analysis-figs.mjs')], capture_output=True, text=True, check=True, cwd=HERE).stdout)

def one(q):
    """the single value of a SQL statement"""
    return run(q)[1][0][0]

def yen(v):
    return f'{v:,.1f}' if isinstance(v, float) and v != int(v) else f'{int(v):,}'

# ---------------------------------------------------------------- page parts
def stat_box(blocks, fig='', fig_note=None):
    """「統計の基礎」: blocks are ('p', (ja, en)) · ('f', formula) · ('li', [(ja, en), …]) · ('h', (ja, en))"""
    out = ''
    for kind, x in blocks:
        if kind == 'p':
            out += B(x, cls='st-p')
        elif kind == 'f':
            out += f'<div class="formula">{ruby(x)}</div>'
        elif kind == 'h':
            out += f'<h3 class="st-h">{J(x[0])}<span class="en">{esc(x[1])}</span></h3>'
        elif kind == 'li':
            out += '<ul class="st-li">' + ''.join(f'<li>{B(i)}</li>' for i in x) + '</ul>'
    figure = f'<div class="st-fig">{fig}{B(fig_note, cls="fig-note") if fig_note else ""}</div>' if fig else ''
    return f'<section class="box stat">{H("{統計|とうけい}の{基礎|きそ}", "Statistics basics")}<div class="st-body">{out}</div>{figure}</section>'

TOOL = {'excel': ('Excel でやってみる', 'Excel (Microsoft 365)', 'X'), 'python': ('Python でやってみる', 'Python (pandas · VS Code / Jupyter)', 'Py')}

def tool_box(tool, steps, check=None):
    """the same question in Excel or Python: steps = [((ja, en), code or None)]"""
    ja, en, ic = TOOL[tool]
    lis = ''.join(f'<li>{B(t)}{f"<pre class=code>{esc(c)}</pre>" if c else ""}</li>' for t, c in steps)
    chk = f'<div class="tool-chk">{B(check)}</div>' if check else ''
    return f'<section class="box tool tool-{tool}"><h2><span class="tool-ic">{ic}</span>{J(ja)}<small>{esc(en)}</small></h2><ol class="steps">{lis}</ol>{chk}</section>'

def sub_see(title, q, note=None):
    """a second small example: the SQL and its result"""
    cols, rows = run(q)
    return (f'<section class="box see2">{H(*title)}{sql(q)}<div class="res-only">{table_html(cols, rows)}</div>'
            f'{B(note, cls="note") if note else ""}</section>')

XL_OPEN = (('アプリの「CSV」ボタンで{表|ひょう}を{保存|ほぞん}し、Excel で{開|ひら}く。Ctrl + T でテーブルにして、{名前|なまえ}を {t} にする。',
            'Save the table with the app’s CSV button and open it in Excel. Press Ctrl + T to make a table and name it {t}.'), None)
PY_OPEN = (('CSV をノートブックと{同|おな}じフォルダに{置|お}き、pandas で{読|よ}み{込|こ}む。', 'Put the CSV in the same folder as your notebook and read it with pandas.'),
           'import pandas as pd\ndf = pd.read_csv("{t}.csv")')

def opened(step, t):
    (ja, en), code = step
    return ((ja.replace('{t}', t), en.replace('{t}', t)), code.replace('{t}', t) if code else None)

SAME = ('SQL と{同|おな}じ{数字|すうじ}になれば{正解|せいかい}。', 'If you get the same numbers as the SQL, you are right.')

UNITS = []

# ---------------------------------------------------------------- A1
def kinds_fig():
    kinds = {'order_id': ('ID', 'id'), 'order_date': ('{日付|ひづけ}', 'date'), 'store': ('{質的|しつてき}', 'qualitative'), 'customer_id': ('{質的|しつてき}', 'qualitative'),
             'amount': ('{量的|りょうてき}', 'quantitative'), 'items': ('{量的|りょうてき}', 'quantitative'), 'coupon': ('{質的|しつてき}', 'qualitative')}
    cls = {'id': 'id', 'date': 'date', 'qualitative': 'qual', 'quantitative': 'quant'}
    return '<div class="col-kinds">' + ''.join(
        f'<span class="ck ck-{cls[en]}"><code>{c}</code><b>{ruby(ja)}</b><small>{en}</small></span>' for c, (ja, en) in kinds.items()) + '</div>'

_n = one('SELECT COUNT(*) FROM kumo_orders')
UNITS.append(dict(
    no='A1', key='an_overview', kw='COUNT・MIN・MAX', tags=['sql', 'excel', 'python'],
    title=('データの{全体|ぜんたい}を{見|み}る', 'Get to know the data'),
    ask=('{店長|てんちょう}', 'Store manager', '「{最近|さいきん}、{売上|うりあげ}が{落|お}ちた{気|き}がする。」{答|こた}える{前|まえ}に、どんなデータがあるかを{確|たし}かめよう。',
         '“I feel sales have dropped lately.” Before answering, check what data we have.'),
    goal=('{行数|ぎょうすう}・{値|あたい}の{範囲|はんい}・{期間|きかん}を{調|しら}べ、{列|れつ}の{種類|しゅるい}を{言|い}える。', 'You can find the number of rows, the range of values and the period, and name the kind of each column.'),
    sections_before=[stat_box([
        ('h', ('データの{種類|しゅるい}', 'Kinds of data')),
        ('li', [('{量的|りょうてき}データ：{計算|けいさん}できる{数|かず}（{金額|きんがく}、{個数|こすう}）', 'Quantitative: numbers you can calculate with (amount, items)'),
                ('{質的|しつてき}データ：ラベル（{店|みせ}、クーポン）。{名義尺度|めいぎしゃくど}は{順番|じゅんばん}なし、{順序尺度|じゅんじょしゃくど}は{順番|じゅんばん}あり（S・M・L）', 'Qualitative: labels (store, coupon). Nominal has no order, ordinal has an order (S, M, L)'),
                ('{日付|ひづけ}：{順番|じゅんばん}があり、{日数|にっすう}を{数|かぞ}えられる', 'Dates: they have an order, and you can count days between them')]),
        ('h', ('{母集団|ぼしゅうだん}と{標本|ひょうほん}', 'Population and sample')),
        ('p', ('{母集団|ぼしゅうだん}は{知|し}りたいもの{全部|ぜんぶ}（すべての{客|きゃく}）、{標本|ひょうほん}は{手元|てもと}にある{一部|いちぶ}（{今年|ことし}の{注文|ちゅうもん}）。{統計|とうけい}は、{標本|ひょうほん}から{母集団|ぼしゅうだん}を{知|し}るための{道具|どうぐ}。',
               'The population is everything you want to know about (all customers); a sample is the part you have (this year’s orders). Statistics learns about the population from a sample.')),
    ], kinds_fig(), ('kumo_orders の{列|れつ}と、その{種類|しゅるい}。', 'The columns of kumo_orders and their kinds.'))],
    see=dict(q=('kumo_orders の{行数|ぎょうすう}、amount の{最小|さいしょう}と{最大|さいだい}、{最初|さいしょ}と{最後|さいご}の{日付|ひづけ}を{求|もと}める。', 'Find the number of rows, the smallest and largest amount, and the first and last date of kumo_orders.'),
             sql='SELECT COUNT(*) AS n_rows,\n       MIN(amount) AS min_amount, MAX(amount) AS max_amount,\n       MIN(order_date) AS first_date, MAX(order_date) AS last_date\nFROM kumo_orders;',
             viz=dict(kind='result'),
             note=(f'2025 {{年|ねん}}の 1 {{年分|ねんぶん}}、{_n} {{件|けん}}の{{注文|ちゅうもん}}。{{金額|きんがく}}の{{幅|はば}}はとても{{広|ひろ}}い。', f'One year (2025), {_n} orders. The amounts vary a lot.')),
    points=[
        (('{分析|ぶんせき}の{流|なが}れ：{問|と}う → {集|あつ}める → {整|ととの}える → {分析|ぶんせき}する → {伝|つた}える。この Unit は「{集|あつ}める」の{最初|さいしょ}の 1 {歩|ぽ}。', 'The analysis process: ask → collect → clean → analyse → share. This unit is the first step of “collect”.'),),
        (('いきなり{細|こま}かく{見|み}ない。まず{行数|ぎょうすう}・{範囲|はんい}・{期間|きかん}で{全体|ぜんたい}をつかむ。', 'Do not start with the details. First get the whole picture: rows, range, period.'),),
        (('{日付|ひづけ}は \'2025-01-31\' の{形|かたち}の{文字|もじ}なので、MIN と MAX で{最初|さいしょ}と{最後|さいご}が{分|わ}かる。', 'Dates are text like \'2025-01-31\', so MIN and MAX give the first and last.'),),
    ],
    mistakes=[
        dict(wrong='SELECT COUNT(coupon)\nFROM kumo_orders;', mark_w='COUNT(coupon)', right='SELECT COUNT(*)\nFROM kumo_orders;', mark_r='COUNT(*)',
             why=('COUNT({列|れつ}) は NULL を{数|かぞ}えない。{行数|ぎょうすう}は COUNT(*) で{数|かぞ}える。', 'COUNT(column) does not count NULL. Count rows with COUNT(*).')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('{行数|ぎょうすう}、amount の{最小|さいしょう}と{最大|さいだい}：', 'Rows, smallest and largest amount:'), '=ROWS(kumo_orders)\n=MIN(kumo_orders[amount])\n=MAX(kumo_orders[amount])'),
            (('{最初|さいしょ}と{最後|さいご}の{日付|ひづけ}。45658 のような{数|かず}が{出|で}たら、{表示形式|ひょうじけいしき}を「{日付|ひづけ}」にする。', 'First and last date. If you see a number like 45658, set the number format to Date.'), '=MIN(kumo_orders[order_date])\n=MAX(kumo_orders[order_date])')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{行数|ぎょうすう}・{範囲|はんい}・{期間|きかん}。df.info() で{列|れつ}ごとの{型|かた}も{分|わ}かる。', 'Rows, range, period. df.info() also shows the type of each column.'),
             'print(len(df))\nprint(df["amount"].min(), df["amount"].max())\nprint(df["order_date"].min(), df["order_date"].max())\ndf.info()')], SAME),
    ],
    **{'try': [
        dict(q=('cafe_sales の{行数|ぎょうすう}と、amount の{最小|さいしょう}・{最大|さいだい}を{求|もと}めよう。', 'Find the number of rows and the smallest and largest amount of cafe_sales.'),
             answer='SELECT COUNT(*) AS n_rows, MIN(amount) AS min_amount, MAX(amount) AS max_amount FROM cafe_sales;', lines=2),
        dict(q=('hotel_stays の checkin_date の{最初|さいしょ}と{最後|さいご}を{求|もと}めよう。', 'Find the first and last checkin_date of hotel_stays.'),
             answer='SELECT MIN(checkin_date) AS first_date, MAX(checkin_date) AS last_date FROM hotel_stays;', lines=2),
        dict(q=('gym_visits の{列|れつ}を、{量的|りょうてき}・{質的|しつてき}・{日付|ひづけ}・ID に{分|わ}けよう。', 'Sort the columns of gym_visits into quantitative, qualitative, date and ID.'),
             answer=None, check=('{列|れつ}は 7 つ', '7 columns'), lines=2),
    ]},
))

# ---------------------------------------------------------------- A2
_c = run('SELECT COUNT(*), COUNT(email), COUNT(DISTINCT name) FROM kumo_customers')[1][0]
UNITS.append(dict(
    no='A2', key='an_missing', kw='COUNT({列|れつ})・DISTINCT', tags=['sql', 'excel', 'python'],
    title=('{欠損値|けっそんち}と{重複|ちょうふく}を{数|かぞ}える', 'Count missing values and duplicates'),
    ask=('マーケティング{部|ぶ}', 'Marketing team', '「{会員|かいいん}にメールを{送|おく}りたい。{何人|なんにん}に{送|おく}れる？」{名簿|めいぼ}には{空欄|くうらん}と{二重|にじゅう}{登録|とうろく}がある。',
         '“We want to e-mail our members. How many can we reach?” The list has gaps and double sign-ups.'),
    goal=('{空欄|くうらん}（NULL）と{重複|ちょうふく}の{数|かず}を{数|かぞ}え、{割合|わりあい}で{報告|ほうこく}できる。', 'You can count missing values (NULL) and duplicates and report them as a percentage.'),
    sections_before=[stat_box([
        ('p', ('{実際|じっさい}のデータには{必|かなら}ず{空欄|くうらん}がある。{欠損率|けっそんりつ}は、{空欄|くうらん}の{数|かず}を{全体|ぜんたい}の{行数|ぎょうすう}で{割|わ}る。', 'Real data always has gaps. The missing rate is the number of blanks divided by all rows.')),
        ('f', '{欠損率|けっそんりつ} (%) = (COUNT(*) − COUNT({列|れつ})) ÷ COUNT(*) × 100'),
        ('p', ('どうするかは、なぜ{空欄|くうらん}かで{決|き}める。{行|ぎょう}を{除|のぞ}く・{値|あたい}を{埋|う}める・「{不明|ふめい}」として{残|のこ}す。{除|のぞ}いた{数|かず}は{必|かなら}ず{報告|ほうこく}する。',
               'What to do depends on why it is missing: drop the row, fill it in, or keep “unknown”. Always report how many you dropped.')),
        ('p', ('{同|おな}じ{人|ひと}が 2 {回|かい}{登録|とうろく}されることもある。COUNT(DISTINCT {列|れつ}) は{同|おな}じ{値|あたい}を 1 {回|かい}だけ{数|かぞ}える。', 'The same person may sign up twice. COUNT(DISTINCT column) counts each value once.')),
    ], FIGS['fill'], ('kumo_customers の{列|れつ}ごとの、{値|あたい}が{入|はい}っている{割合|わりあい}（{青|あお}）と{空欄|くうらん}（{赤|あか}、{数字|すうじ}は{件数|けんすう}）。', 'Per column of kumo_customers: filled (blue) and missing (red, with the count).'))],
    see=dict(q=('kumo_customers の email について、{入力|にゅうりょく}あり・{空欄|くうらん}・{欠損率|けっそんりつ}を{求|もと}める。', 'For email in kumo_customers, find filled, missing and the missing rate.'),
             sql='SELECT COUNT(*) AS n_rows,\n       COUNT(email) AS filled,\n       COUNT(*) - COUNT(email) AS missing,\n       ROUND(100.0 * (COUNT(*) - COUNT(email)) / COUNT(*), 1) AS missing_pct\nFROM kumo_customers;',
             mark='COUNT(email)', viz=dict(kind='result'),
             note=(f'メールを{{送|おく}}れるのは {_c[1]} {{人|にん}}…ではない。{{二重|にじゅう}}{{登録|とうろく}}があるので、{{次|つぎ}}に{{重複|ちょうふく}}を{{数|かぞ}}える。', f'We cannot simply e-mail {_c[1]} people: there are double sign-ups, so count duplicates next.')),
    after_see=[sub_see(('{重複|ちょうふく}を{数|かぞ}える', 'Count duplicates'), 'SELECT COUNT(name) AS n_rows,\n       COUNT(DISTINCT name) AS unique_name\nFROM kumo_customers;',
                            (f'{_c[0]} {{行|ぎょう}}あるのに、{{名前|なまえ}}は {_c[2]} {{種類|しゅるい}}。{{差|さ}}の {_c[0] - _c[2]} {{行|ぎょう}}は、{{同|おな}}じ{{人|ひと}}かどうか{{確|たし}}かめる。', f'{_c[0]} rows but only {_c[2]} different names. Check whether the other {_c[0] - _c[2]} rows are the same people.'))],
    points=[
        (('COUNT(*) は{全部|ぜんぶ}の{行|ぎょう}、COUNT({列|れつ}) は NULL でない{行|ぎょう}を{数|かぞ}える。{差|さ}が{空欄|くうらん}の{数|かず}。', 'COUNT(*) counts all rows, COUNT(column) the non-NULL ones. The difference is the number of blanks.'),),
        (('{割合|わりあい}は 100.0 を{掛|か}けてから{割|わ}る。{小数|しょうすう}の{計算|けいさん}になる。', 'For a percentage, multiply by 100.0 first, so the division keeps decimals.'),),
    ],
    mistakes=[
        dict(wrong='SELECT ROUND(100 * (COUNT(*) - COUNT(email)) / COUNT(*), 1)\nFROM kumo_customers;', mark_w='100 *', right='SELECT ROUND(100.0 * (COUNT(*) - COUNT(email)) / COUNT(*), 1)\nFROM kumo_customers;', mark_r='100.0 *',
             why=('{整数|せいすう}どうしの{割|わ}り{算|ざん}は、{小数|しょうすう}が{切|き}り{捨|す}てられる。', 'Dividing an integer by an integer drops the decimals.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_customers'),
            (('{行数|ぎょうすう}・{入力|にゅうりょく}あり・{空欄|くうらん}・{欠損率|けっそんりつ}：', 'Rows, filled, blank, missing rate:'), '=ROWS(kumo_customers)\n=COUNTA(kumo_customers[email])\n=COUNTBLANK(kumo_customers[email])\n=ROUND(100*COUNTBLANK(kumo_customers[email])/ROWS(kumo_customers),1)'),
            (('{重複|ちょうふく}を{除|のぞ}いた{名前|なまえ}の{数|かず}（UNIQUE は Microsoft 365）：', 'Different names (UNIQUE needs Microsoft 365):'), '=COUNTA(UNIQUE(kumo_customers[name]))')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_customers'),
            (('{空欄|くうらん}の{数|かず}（{全部|ぜんぶ}の{列|れつ}）と、{名前|なまえ}の{種類|しゅるい}：', 'Blanks in every column, and the number of different names:'),
             'print(df.isna().sum())\nmissing = df["email"].isna().sum()\nprint(round(100 * missing / len(df), 1))\nprint(df["name"].nunique())')], SAME),
    ],
    **{'try': [
        dict(q=('helpdesk_tickets の rating の{空欄|くうらん}の{数|かず}と{欠損率|けっそんりつ}（%、{小数|しょうすう}{第|だい} 1 {位|い}）を{求|もと}めよう。', 'Find the number of blanks and the missing rate (%, 1 decimal place) of rating in helpdesk_tickets.'),
             answer='SELECT COUNT(*) - COUNT(rating) AS missing, ROUND(100.0 * (COUNT(*) - COUNT(rating)) / COUNT(*), 1) AS missing_pct FROM helpdesk_tickets;', lines=2),
        dict(q=('courier_jobs の client_id は{何種類|なんしゅるい}ある？', 'How many different client_id are there in courier_jobs?'),
             answer='SELECT COUNT(DISTINCT client_id) AS clients FROM courier_jobs;'),
        dict(q=('cafe_sales で、{一度|いちど}でも{来|き}た member_id の{数|かず}と、{全部|ぜんぶ}の{行数|ぎょうすう}を{並|なら}べて{出|だ}そう。', 'Show the number of different member_id next to the number of rows in cafe_sales.'),
             answer='SELECT COUNT(DISTINCT member_id) AS members, COUNT(*) AS n_rows FROM cafe_sales;'),
    ]},
))

# ---------------------------------------------------------------- A3
_mean = one('SELECT ROUND(AVG(amount), 1) FROM kumo_orders')
_med = one(f'SELECT amount FROM kumo_orders ORDER BY amount LIMIT 1 OFFSET {(_n - 1) // 2}')
_mode = run('SELECT items, COUNT(*) AS n FROM kumo_orders GROUP BY items ORDER BY n DESC LIMIT 1')[1][0]
_bey = FIGS['center_beyond']
UNITS.append(dict(
    no='A3', key='an_center', kw='AVG・{中央値|ちゅうおうち}', tags=['sql', 'excel', 'python'],
    title=('{平均|へいきん}と{中央値|ちゅうおうち}', 'Mean, median and mode'),
    ask=('{店長|てんちょう}', 'Store manager', '「{客単価|きゃくたんか}はいくら？{高額|こうがく}の{注文|ちゅうもん}に{引|ひ}っ{張|ぱ}られていない？」', '“How much does a customer spend per order? Are a few big orders pulling the number up?”'),
    goal=('{平均|へいきん}・{中央値|ちゅうおうち}・{最頻値|さいひんち}を{求|もと}め、どれが「ふつうの{値|あたい}」に{近|ちか}いかを{説明|せつめい}できる。', 'You can find the mean, median and mode and explain which is closer to a typical value.'),
    sections_before=[stat_box([
        ('li', [('{平均|へいきん}（mean）：{合計|ごうけい} ÷ {個数|こすう}', 'Mean: the sum ÷ the number of values'),
                ('{中央値|ちゅうおうち}（median）：{小|ちい}さい{順|じゅん}に{並|なら}べた{真|ま}ん{中|なか}。n {個|こ}なら (n + 1) ÷ 2 {番目|ばんめ}', 'Median: the middle value when sorted; with n values, the (n + 1) ÷ 2-th'),
                ('{最頻値|さいひんち}（mode）：いちばん{多|おお}く{出|で}てくる{値|あたい}', 'Mode: the value that appears most often')]),
        ('f', '{平均|へいきん} x̄ = (x₁ + x₂ + … + xₙ) ÷ n'),
        ('p', ('とても{大|おお}きな{値|あたい}が{少|すこ}しあると、{平均|へいきん}は{引|ひ}っ{張|ぱ}られるが、{中央値|ちゅうおうち}は{動|うご}かない。お{金|かね}のデータは{右|みぎ}に{長|なが}いすそがあり、{平均|へいきん}が{中央値|ちゅうおうち}より{大|おお}きくなりやすい。',
               'A few very large values pull the mean up, but not the median. Money data has a long right tail, so the mean is usually larger than the median.')),
    ], FIGS['center'], (f'amount のヒストグラム。{{青|あお}}が{{平均|へいきん}}、{{緑|みどり}}が{{中央値|ちゅうおうち}}。{yen(_bey["cut"])} {{円|えん}}{{以上|いじょう}}の {_bey["n"]} {{件|けん}}（{{最大|さいだい}} {yen(_bey["max"])} {{円|えん}}）は{{図|ず}}の{{外|そと}}。',
                         f'Histogram of amount: mean (blue), median (green). {_bey["n"]} orders of {yen(_bey["cut"])} yen or more (up to {yen(_bey["max"])}) are beyond the right edge.'))],
    see=dict(q=(f'amount の{{平均|へいきん}}と{{中央値|ちゅうおうち}}を{{求|もと}}める。{_n} {{行|ぎょう}}なので、{{中央値|ちゅうおうち}}は{{小|ちい}}さい{{順|じゅん}}で {(_n + 1) // 2} {{番目|ばんめ}}。', f'Find the mean and median of amount. With {_n} rows, the median is the {(_n + 1) // 2}th value.'),
             sql=f'SELECT ROUND(AVG(amount), 1) AS mean_amount,\n       (SELECT amount FROM kumo_orders\n        ORDER BY amount LIMIT 1 OFFSET {(_n - 1) // 2}) AS median_amount\nFROM kumo_orders;',
             mark=f'OFFSET {(_n - 1) // 2}', viz=dict(kind='result'),
             note=(f'{{平均|へいきん}} {yen(_mean)} {{円|えん}}は、{{中央値|ちゅうおうち}} {yen(_med)} {{円|えん}}よりかなり{{大|おお}}きい。{{客単価|きゃくたんか}}の「ふつう」は{{中央値|ちゅうおうち}}で{{伝|つた}}える。', f'The mean ({yen(_mean)} yen) is much larger than the median ({yen(_med)} yen). Report the typical order with the median.')),
    points=[
        (('{括弧|かっこ}の{中|なか}の SELECT（サブクエリ）が、{中央値|ちゅうおうち}を 1 つの{値|あたい}として{返|かえ}す。', 'The SELECT inside the brackets (a subquery) returns the median as one value.'),),
        (('OFFSET k は「k {行|ぎょう}とばす」。{真|ま}ん{中|なか}の{前|まえ}にある (n − 1) ÷ 2 {行|ぎょう}をとばす。', 'OFFSET k skips k rows: skip the (n − 1) ÷ 2 rows before the middle one.'),),
        ((f'{{最頻値|さいひんち}}は GROUP BY で{{数|かぞ}}えて、{{多|おお}}い{{順|じゅん}}の 1 {{行目|ぎょうめ}}。items なら {_mode[0]}（{_mode[1]} {{件|けん}}）。', f'For the mode, count with GROUP BY and take the first row. For items: {_mode[0]} ({_mode[1]} orders).'),
         '<code class="ex">SELECT items, COUNT(*) AS n FROM kumo_orders GROUP BY items ORDER BY n DESC LIMIT 1;</code>'),
    ],
    mistakes=[
        dict(wrong=f'SELECT amount FROM kumo_orders\nLIMIT 1 OFFSET {(_n - 1) // 2};', mark_w='LIMIT', right=f'SELECT amount FROM kumo_orders\nORDER BY amount LIMIT 1 OFFSET {(_n - 1) // 2};', mark_r='ORDER BY amount',
             why=('ORDER BY がないと、{行|ぎょう}は{金額|きんがく}の{順|じゅん}に{並|なら}ばない（ここでは{日付|ひづけ}{順|じゅん}）。{真|ま}ん{中|なか}の{行|ぎょう}は、{並|なら}べてから{取|と}る。', 'Without ORDER BY the rows are not sorted by amount (here they are in date order). Sort first, then take the middle row.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('{平均|へいきん}（{小数|しょうすう}{第|だい} 1 {位|い}）・{中央値|ちゅうおうち}・{最頻値|さいひんち}：', 'Mean (1 decimal place), median and mode:'), '=ROUND(AVERAGE(kumo_orders[amount]),1)\n=MEDIAN(kumo_orders[amount])\n=MODE.SNGL(kumo_orders[items])')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{平均|へいきん}・{中央値|ちゅうおうち}・{最頻値|さいひんち}と、ヒストグラム：', 'Mean, median, mode and a histogram:'),
             'print(round(df["amount"].mean(), 1), df["amount"].median())\nprint(df["items"].value_counts().head(1))\ndf["amount"].plot.hist(bins=30)')], SAME),
    ],
    **{'try': [
        dict(q=(f'hotel_stays（{one("SELECT COUNT(*) FROM hotel_stays")} {{行|ぎょう}}）の charge の{{平均|へいきん}}と{{中央値|ちゅうおうち}}を{{求|もと}}めよう。', f'Find the mean and median of charge in hotel_stays ({one("SELECT COUNT(*) FROM hotel_stays")} rows).'),
             answer=f'SELECT ROUND(AVG(charge), 1) AS mean_charge, (SELECT charge FROM hotel_stays ORDER BY charge LIMIT 1 OFFSET {(one("SELECT COUNT(*) FROM hotel_stays") - 1) // 2}) AS median_charge FROM hotel_stays;', lines=3),
        dict(q=(f'gym_visits（{one("SELECT COUNT(*) FROM gym_visits")} {{行|ぎょう}}）の minutes の{{中央値|ちゅうおうち}}を{{求|もと}}めよう。', f'Find the median of minutes in gym_visits ({one("SELECT COUNT(*) FROM gym_visits")} rows).'),
             answer=f'SELECT minutes FROM gym_visits ORDER BY minutes LIMIT 1 OFFSET {(one("SELECT COUNT(*) FROM gym_visits") - 1) // 2};', lines=2),
        dict(q=('factory_lots の defects の{最頻値|さいひんち}と、その{件数|けんすう}を{求|もと}めよう。', 'Find the mode of defects in factory_lots and how many rows have it.'),
             answer='SELECT defects, COUNT(*) AS n FROM factory_lots GROUP BY defects ORDER BY n DESC LIMIT 1;', lines=2),
    ]},
))

# ---------------------------------------------------------------- A4
SD = lambda v: f'ROUND(SQRT((SUM({v} * {v}) - 1.0 * SUM({v}) * SUM({v}) / COUNT(*))\n                  / (COUNT(*) - 1)), 1)'
_sd = run(f'SELECT store, ROUND(SQRT((SUM(amount * amount) - 1.0 * SUM(amount) * SUM(amount) / COUNT(*)) / (COUNT(*) - 1)), 1) AS s FROM kumo_orders GROUP BY store ORDER BY s')[1]
UNITS.append(dict(
    no='A4', key='an_spread', kw='{標準偏差|ひょうじゅんへんさ}', tags=['sql', 'excel', 'python'],
    title=('{散|ち}らばりを{測|はか}る', 'Measure the spread'),
    ask=('エリアマネージャー', 'Area manager', '「{売上|うりあげ}が{安定|あんてい}している{店|みせ}はどこ？」{平均|へいきん}だけでは{分|わ}からない。', '“Which store has steady sales?” The mean alone cannot tell you.'),
    goal=('{範囲|はんい}・{四分位数|しぶんいすう}・{標準偏差|ひょうじゅんへんさ}で{散|ち}らばりを{比|くら}べられる。', 'You can compare spread with the range, quartiles and the standard deviation.'),
    sections_before=[stat_box([
        ('li', [('{範囲|はんい}（range）= {最大値|さいだいち} − {最小値|さいしょうち}。{極端|きょくたん}な{値|あたい} 1 つで{大|おお}きく{変|か}わる', 'Range = max − min. One extreme value changes it a lot'),
                ('{四分位数|しぶんいすう}：Q1（25%）・{中央値|ちゅうおうち}・Q3（75%）。IQR = Q3 − Q1 は{真|ま}ん{中|なか}{半分|はんぶん}の{幅|はば}', 'Quartiles: Q1 (25%), median, Q3 (75%). IQR = Q3 − Q1 is the width of the middle half'),
                ('{標準偏差|ひょうじゅんへんさ}（standard deviation）：{平均|へいきん}から、だいたいどのくらい{離|はな}れているか', 'Standard deviation: roughly how far values are from the mean')]),
        ('f', '{標本|ひょうほん}{分散|ぶんさん} s² = Σ(x − x̄)² ÷ (n − 1)　　{標準偏差|ひょうじゅんへんさ} s = √s²'),
        ('p', ('SQL では{同|おな}じ{値|あたい}を Σ(x − x̄)² = Σx² − (Σx)² ÷ n で{計算|けいさん}する。n − 1 で{割|わ}るのは、Excel の STDEV.S、pandas の .std() と{同|おな}じ。',
               'In SQL we use Σ(x − x̄)² = Σx² − (Σx)² ÷ n. Dividing by n − 1 is the same as Excel STDEV.S and pandas .std().')),
    ], FIGS['box'], ('{店|みせ}ごとの{箱|はこ}ひげ{図|ず}。{箱|はこ}が Q1〜Q3、{緑|みどり}の{線|せん}が{中央値|ちゅうおうち}、{点|てん}が{平均|へいきん}、{丸|まる}は{外|はず}れ{値|ち}。', 'Box plot per store: box = Q1–Q3, green line = median, dot = mean, circles = outliers.'))],
    see=dict(q=('{店|みせ}ごとに、{件数|けんすう}・{平均|へいきん}・{標準偏差|ひょうじゅんへんさ}を{求|もと}め、{標準偏差|ひょうじゅんへんさ}の{小|ちい}さい{順|じゅん}に{並|なら}べる。', 'For each store, find the count, mean and standard deviation, smallest standard deviation first.'),
             sql=f'SELECT store, COUNT(*) AS n,\n       ROUND(AVG(amount), 1) AS mean_amount,\n       {SD("amount")} AS sd_amount\nFROM kumo_orders\nGROUP BY store\nORDER BY sd_amount;',
             mark='COUNT(*) - 1', viz=dict(kind='result'),
             note=(f'{_sd[0][0]} は{{標準偏差|ひょうじゅんへんさ}}がいちばん{{小|ちい}}さく（{yen(_sd[0][1])}）、{{売上|うりあげ}}が{{安定|あんてい}}している。{_sd[-1][0]} はいちばん{{散|ち}}らばっている。', f'{_sd[0][0]} has the smallest standard deviation ({yen(_sd[0][1])}): the steadiest. {_sd[-1][0]} varies the most.')),
    points=[
        (('{平均|へいきん}が{違|ちが}うグループは、{変動係数|へんどうけいすう} = s ÷ x̄ で{比|くら}べるとよい。', 'For groups with different means, compare the coefficient of variation = s ÷ x̄.'),),
        (('{範囲|はんい}は MAX − MIN で{求|もと}められる。', 'The range is MAX − MIN.'), '<code class="ex">SELECT store, MAX(amount) - MIN(amount) AS range_amount FROM kumo_orders GROUP BY store;</code>'),
    ],
    mistakes=[
        dict(wrong='SELECT ROUND(SQRT((SUM(amount * amount) - 1.0 * SUM(amount) * SUM(amount) / COUNT(*))\n                  / COUNT(*)), 1) AS sd\nFROM kumo_orders;', mark_w='/ COUNT(*)), 1)',
             right='SELECT ROUND(SQRT((SUM(amount * amount) - 1.0 * SUM(amount) * SUM(amount) / COUNT(*))\n                  / (COUNT(*) - 1)), 1) AS sd\nFROM kumo_orders;', mark_r='(COUNT(*) - 1)',
             why=('n で{割|わ}ると{母集団|ぼしゅうだん}の{式|しき}（STDEV.P）になる。{標本|ひょうほん}は n − 1 で{割|わ}る。', 'Dividing by n is the population formula (STDEV.P). For a sample, divide by n − 1.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('{挿入|そうにゅう} → ピボットテーブル。store を「{行|ぎょう}」、amount を 3 {回|かい}「{値|あたい}」へ。{値|あたい}フィールドの{設定|せってい}で{個数|こすう}・{平均|へいきん}・{標本標準偏差|ひょうほんひょうじゅんへんさ}にする。', 'Insert → PivotTable. store to Rows, amount three times to Values; set them to Count, Average and StdDev.'), None),
            (('{1|ひと}つの{店|みせ}だけなら{式|しき}でもよい：', 'For one store you can also use a formula:'), '=ROUND(STDEV.S(FILTER(kumo_orders[amount],kumo_orders[store]="Sakae")),1)'),
            (('{箱|はこ}ひげ{図|ず}：{挿入|そうにゅう} → {統計|とうけい}グラフ → {箱|はこ}ひげ{図|ず}。', 'Box plot: Insert → Statistic Chart → Box and Whisker.'), None)], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{店|みせ}ごとの{件数|けんすう}・{平均|へいきん}・{標準偏差|ひょうじゅんへんさ}と、{箱|はこ}ひげ{図|ず}：', 'Count, mean and standard deviation per store, and a box plot:'),
             'df.groupby("store")["amount"].agg(["count", "mean", "std"]).round(1).sort_values("std")\ndf.boxplot(column="amount", by="store")')], SAME),
    ],
    **{'try': [
        dict(q=('helpdesk_tickets の team ごとに、minutes の{標準偏差|ひょうじゅんへんさ}を{求|もと}めよう。', 'Find the standard deviation of minutes for each team in helpdesk_tickets.'),
             answer='SELECT team, ROUND(SQRT((SUM(minutes * minutes) - 1.0 * SUM(minutes) * SUM(minutes) / COUNT(*)) / (COUNT(*) - 1)), 1) AS sd_minutes FROM helpdesk_tickets GROUP BY team;', lines=3),
        dict(q=('cafe_sales の shop ごとに、amount の{範囲|はんい}（{最大|さいだい} − {最小|さいしょう}）を{求|もと}めよう。', 'Find the range (max − min) of amount for each shop in cafe_sales.'),
             answer='SELECT shop, MAX(amount) - MIN(amount) AS range_amount FROM cafe_sales GROUP BY shop;', lines=2),
        dict(q=('factory_lots の line ごとに weight_g の{標準偏差|ひょうじゅんへんさ}を{求|もと}め、いちばん{安定|あんてい}したラインを{答|こた}えよう。', 'Find the standard deviation of weight_g per line in factory_lots. Which line is the most stable?'),
             answer='SELECT line, ROUND(SQRT((SUM(weight_g * weight_g) - 1.0 * SUM(weight_g) * SUM(weight_g) / COUNT(*)) / (COUNT(*) - 1)), 1) AS s FROM factory_lots GROUP BY line ORDER BY s;', lines=3),
    ]},
))

# ---------------------------------------------------------------- A5
UNITS.append(dict(
    no='A5', key='an_hist', kw='FLOOR・GROUP BY', tags=['sql', 'excel', 'python'],
    title=('{度数分布|どすうぶんぷ}とヒストグラム', 'Frequency tables and histograms'),
    ask=('{店長|てんちょう}', 'Store manager', '「どのくらいの{金額|きんがく}の{注文|ちゅうもん}がいちばん{多|おお}い？」{値|あたい}を{区切|くぎ}って{数|かぞ}えよう。', '“What size of order is the most common?” Split the values into ranges and count.'),
    goal=('{階級|かいきゅう}を{決|き}めて{度数分布表|どすうぶんぷひょう}を{作|つく}り、ヒストグラムの{形|かたち}を{読|よ}める。', 'You can make a frequency table with bins and read the shape of a histogram.'),
    sections_before=[stat_box([
        ('p', ('{階級|かいきゅう}（bin）の{幅|はば}を{決|き}め、{各|かく}{階級|かいきゅう}の{行数|ぎょうすう}（{度数|どすう}）を{数|かぞ}える。{全体|ぜんたい}に{対|たい}する{割合|わりあい}が{相対度数|そうたいどすう}。', 'Choose a bin width and count the rows in each bin (frequency). The share of all rows is the relative frequency.')),
        ('f', '{階級|かいきゅう}の{始|はじ}まり = FLOOR(x ÷ {幅|はば}) × {幅|はば}'),
        ('h', ('{形|かたち}の{読|よ}み{方|かた}', 'Reading the shape')),
        ('li', [('{左右|さゆう}{対称|たいしょう}で{山|やま}が 1 つ：{平均|へいきん} ≈ {中央値|ちゅうおうち}（{製品|せいひん}の{重|おも}さ）', 'Symmetric, one peak: mean ≈ median (weight of products)'),
                ('{右|みぎ}に{長|なが}いすそ：{平均|へいきん} > {中央値|ちゅうおうち}（お{金|かね}、{待|ま}ち{時間|じかん}）', 'Long right tail: mean > median (money, waiting time)'),
                ('{山|やま}が 2 つ：{違|ちが}うグループが{混|ま}ざっている。{分|わ}けてから{見|み}る', 'Two peaks: two groups are mixed — split them and look again')]),
    ], f'<div class="fig2"><div>{FIGS["shape_sym"]}<div class="fig-cap">factory_lots.weight_g</div></div><div>{FIGS["shape_right"]}<div class="fig-cap">hotel_stays.charge</div></div></div>',
       ('{左|ひだり}は{左右|さゆう}{対称|たいしょう}、{右|みぎ}は{右|みぎ}に{長|なが}いすそ。{右|みぎ}では{平均|へいきん}（{青|あお}）が{中央値|ちゅうおうち}（{緑|みどり}）より{右|みぎ}にある。', 'Left: symmetric. Right: long right tail, where the mean (blue) is to the right of the median (green).'))],
    see=dict(q=('amount を 2,000 {円|えん}ずつの{階級|かいきゅう}に{分|わ}け、{階級|かいきゅう}ごとの{件数|けんすう}を{数|かぞ}える。', 'Split amount into bins of 2,000 yen and count the orders in each bin.'),
             sql='SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin,\n       COUNT(*) AS n\nFROM kumo_orders\nGROUP BY bin\nORDER BY bin;',
             mark='FLOOR(1.0 * amount / 2000) * 2000', viz=dict(kind='html', html=''),
             note=('bin は{階級|かいきゅう}の{始|はじ}まり。2000 は「2,000 {円|えん}{以上|いじょう} 4,000 {円|えん}{未満|みまん}」。', 'bin is the start of the bin: 2000 means “2,000 to under 4,000 yen”.')),
    points=[
        (('{相対度数|そうたいどすう}（%）は、{全体|ぜんたい}の{件数|けんすう}をサブクエリで{求|もと}めて{割|わ}る。', 'For the relative frequency (%), divide by the total count from a subquery.'),
         '<code class="ex">SELECT items, COUNT(*) AS n, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM kumo_orders), 1) AS pct FROM kumo_orders GROUP BY items;</code>'),
        (('{幅|はば}が{広|ひろ}すぎると{形|かたち}が{消|き}え、{狭|せま}すぎるとギザギザになる。√n {個|こ}くらいの{階級|かいきゅう}が{目安|めやす}。', 'Too wide hides the shape, too narrow looks noisy. About √n bins is a good start.'),),
    ],
    mistakes=[
        dict(max_rows=6, wrong='SELECT amount, COUNT(*) AS n\nFROM kumo_orders\nGROUP BY amount;', mark_w='GROUP BY amount', right='SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin, COUNT(*) AS n\nFROM kumo_orders\nGROUP BY bin;', mark_r='GROUP BY bin',
             why=('{金額|きんがく}そのものでまとめると、ほとんどの{行|ぎょう}が 1 {件|けん}ずつになり、{形|かたち}が{見|み}えない。', 'Grouping by the amount itself gives almost one row per order, and you cannot see the shape.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('テーブルの{右|みぎ}に bin {列|れつ}を{足|た}し、ピボットテーブルで bin を「{行|ぎょう}」、amount の{個数|こすう}を「{値|あたい}」へ。', 'Add a bin column, then a PivotTable: bin to Rows, Count of amount to Values.'), '=FLOOR.MATH([@amount]/2000)*2000'),
            (('ヒストグラム：amount の{列|れつ}を{選|えら}び、{挿入|そうにゅう} → {統計|とうけい}グラフ → ヒストグラム。ビンの{幅|はば}を 2000 にする。', 'Histogram: select amount → Insert → Statistic Chart → Histogram; set the bin width to 2000.'), None)], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{度数分布表|どすうぶんぷひょう}とヒストグラム：', 'Frequency table and histogram:'),
             'df["bin"] = (df["amount"] // 2000) * 2000\nprint(df.groupby("bin").size())\nimport numpy as np\ndf["amount"].plot.hist(bins=np.arange(0, 70001, 2000))')], SAME),
    ],
    **{'try': [
        dict(q=('courier_jobs の fee を 500 {円|えん}ずつの{階級|かいきゅう}に{分|わ}けて{数|かぞ}えよう。', 'Count the fee of courier_jobs in bins of 500 yen.'),
             answer='SELECT FLOOR(1.0 * fee / 500) * 500 AS bin, COUNT(*) AS n FROM courier_jobs GROUP BY bin ORDER BY bin;', lines=2),
        dict(q=('hotel_stays の nights ごとの{件数|けんすう}と{相対度数|そうたいどすう}（%）を{求|もと}めよう。', 'Find the count and relative frequency (%) of each nights value in hotel_stays.'),
             answer='SELECT nights, COUNT(*) AS n, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM hotel_stays), 1) AS pct FROM hotel_stays GROUP BY nights ORDER BY nights;', lines=3),
        dict(q=('factory_lots の weight_g を 5 g ずつの{階級|かいきゅう}に{分|わ}けて{数|かぞ}え、{形|かたち}を{言葉|ことば}で{説明|せつめい}しよう。', 'Count weight_g of factory_lots in bins of 5 g and describe the shape in words.'),
             answer='SELECT FLOOR(1.0 * weight_g / 5) * 5 AS bin, COUNT(*) AS n FROM factory_lots GROUP BY bin ORDER BY bin;', lines=3),
    ]},
))

# the A5 result is long: show it as a narrow table next to the histogram of the same data
_bins = run('SELECT FLOOR(1.0 * amount / 2000) * 2000 AS bin,\n       COUNT(*) AS n\nFROM kumo_orders\nGROUP BY bin\nORDER BY bin;')
_cols, _rows = _bins
_half = (len(_rows) + 1) // 2
UNITS[-1]['see']['viz']['html'] = (f'<div class="bins-flow"><div class="res-only bins">{table_html(_cols, [[int(r[0]), r[1]] for r in _rows[:_half]])}{table_html(_cols, [[int(r[0]), r[1]] for r in _rows[_half:]])}</div>'
                                   f'<div class="bins-fig">{FIGS["hist_kumo"]}<div class="fig-cap">{ruby("30,000 {円|えん}{未満|みまん}")}</div></div></div>')

# ---------------------------------------------------------------- A6
_m = one('SELECT ROUND(AVG(amount), 1) FROM kumo_orders')
_s = one('SELECT ROUND(SQRT((SUM(amount * amount) - 1.0 * SUM(amount) * SUM(amount) / COUNT(*)) / (COUNT(*) - 1)), 1) FROM kumo_orders')
_out2 = one(f'SELECT COUNT(*) FROM kumo_orders WHERE ABS(amount - {_m}) / {_s} >= 2')
def ms(t, v):
    return (one(f'SELECT ROUND(AVG({v}), 1) FROM {t}'), one(f'SELECT ROUND(SQRT((SUM({v} * {v}) - 1.0 * SUM({v}) * SUM({v}) / COUNT(*)) / (COUNT(*) - 1)), 1) FROM {t}'))
_h = ms('helpdesk_tickets', 'minutes')
_f = ms('factory_lots', 'weight_g')
UNITS.append(dict(
    no='A6', key='an_zscore', kw='z {得点|とくてん}', tags=['sql', 'excel', 'python'],
    title=('{標準化|ひょうじゅんか}と{外|はず}れ{値|ち}', 'Standard scores and outliers'),
    ask=('{経理部|けいりぶ}', 'Accounting', '「おかしな{注文|ちゅうもん}がないか{確|たし}かめて。」{平均|へいきん}からどれだけ{離|はな}れているかで{探|さが}そう。', '“Check for strange orders.” Look for values far from the mean.'),
    goal=('z {得点|とくてん}を{計算|けいさん}し、{外|はず}れ{値|ち}の{候補|こうほ}を{見|み}つけて{確|たし}かめられる。', 'You can calculate z-scores and find outlier candidates to check.'),
    sections_before=[stat_box([
        ('f', 'z = (x − x̄) ÷ s　　　{偏差値|へんさち}（T-score）= 50 + 10z'),
        ('p', ('z は、{平均|へいきん}より{標準偏差|ひょうじゅんへんさ}いくつ{分|ぶん}{大|おお}きい（+）か{小|ちい}さい（−）か。{単位|たんい}が{違|ちが}っても{比|くら}べられる。', 'z says how many standard deviations a value is above (+) or below (−) the mean, so different units can be compared.')),
        ('p', ('およそ{正規分布|せいきぶんぷ}なら、|z| < 1 に{約|やく} 68%、|z| < 2 に{約|やく} 95%、|z| < 3 に{約|やく} 99.7% が{入|はい}る。', 'For roughly normal data, about 68% of values have |z| < 1, 95% have |z| < 2 and 99.7% have |z| < 3.')),
        ('li', [('{外|はず}れ{値|ち}の{目安|めやす}：|z| ≥ 3（{広|ひろ}めなら ≥ 2）、または Q1 − 1.5 × IQR より{下|した}・Q3 + 1.5 × IQR より{上|うえ}', 'Outlier rules: |z| ≥ 3 (or ≥ 2), or below Q1 − 1.5 × IQR / above Q3 + 1.5 × IQR'),
                ('{外|はず}れ{値|ち}は「{間違|まちが}い」ではなく「{確|たし}かめる{値|あたい}」。{入力|にゅうりょく}ミスかまとめ{買|が}いかを{確|たし}かめてから{除|のぞ}く', 'An outlier is a value to check, not a mistake: typing error or bulk order? Check before removing it')]),
    ], FIGS['normal'], ('{正規分布|せいきぶんぷ}と ±1・±2・±3 の{帯|おび}。{赤|あか}い{丸|まる}は amount の z が{大|おお}きい 5 {件|けん}（{右端|みぎはし}の{丸|まる}は z が 6 より{大|おお}きい）。', 'The normal curve with the ±1, ±2, ±3 bands. Red circles: the 5 largest z of amount (circles at the right edge have z above 6).'))],
    see=dict(q=(f'{{平均|へいきん}} {_m}、{{標準偏差|ひょうじゅんへんさ}} {_s}（A3・A4 で{{求|もと}}めた{{値|あたい}}）を{{式|しき}}に{{入|い}}れて z を{{計算|けいさん}}し、{{大|おお}}きい 5 {{件|けん}}を{{出|だ}}す。', f'Put the mean {_m} and the standard deviation {_s} (from A3 and A4) into the formula and list the 5 largest z.'),
             sql=f'SELECT order_id, amount,\n       ROUND((amount - {_m}) / {_s}, 2) AS z\nFROM kumo_orders\nORDER BY z DESC\nLIMIT 5;',
             mark=f'(amount - {_m}) / {_s}', viz=dict(kind='result'),
             note=('z が 5 を{超|こ}える{注文|ちゅうもん}がある。{入力|にゅうりょく}ミスか、{法人|ほうじん}のまとめ{買|が}いか、{伝票|でんぴょう}を{確|たし}かめる。', 'Some orders have z above 5. Check the receipts: a typing error or a bulk order by a company?')),
    points=[
        ((f'|z| ≥ 2 の{{件数|けんすう}}は WHERE で{{数|かぞ}}える。kumo_orders では {_out2} {{件|けん}}。', f'Count |z| ≥ 2 with WHERE: {_out2} orders in kumo_orders.'),
         f'<code class="ex">SELECT COUNT(*) FROM kumo_orders WHERE ABS(amount - {_m}) / {_s} >= 2;</code>'),
        (('{平均|へいきん}と{標準偏差|ひょうじゅんへんさ}を 1 つの SQL の{中|なか}で{求|もと}める{方法|ほうほう}（ウィンドウ{関数|かんすう}）は、Unit 12 で{学|まな}ぶ。', 'Getting the mean and standard deviation inside the same SQL (window functions) comes in Unit 12.'),),
    ],
    mistakes=[
        dict(wrong=f'SELECT order_id, (amount - {round(_m)}) / {round(_s)} AS z\nFROM kumo_orders ORDER BY z DESC LIMIT 5;', mark_w=f'(amount - {round(_m)}) / {round(_s)}',
             right=f'SELECT order_id, (amount - {_m}) / {_s} AS z\nFROM kumo_orders ORDER BY z DESC LIMIT 5;', mark_r=f'(amount - {_m}) / {_s}',
             why=('{整数|せいすう}だけの{式|しき}は{整数|せいすう}の{割|わ}り{算|ざん}になり、z の{小数|しょうすう}が{消|き}える。{小数点|しょうすうてん}のある{数|かず}を{入|い}れる。', 'An expression with only integers is an integer division and loses the decimals of z. Use numbers with a decimal point.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('{平均|へいきん}と{標準偏差|ひょうじゅんへんさ}を{確|たし}かめ、テーブルに z の{列|れつ}を{足|た}して、{大|おお}きい{順|じゅん}に{並|なら}べ{替|か}える。', 'Check the mean and standard deviation, add a z column and sort it from largest.'),
             f'=ROUND(AVERAGE(kumo_orders[amount]),1)\n=ROUND(STDEV.S(kumo_orders[amount]),1)\n=ROUND(STANDARDIZE([@amount],{_m},{_s}),2)')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('z {得点|とくてん}と、{大|おお}きい 5 {件|けん}・|z| ≥ 2 の{件数|けんすう}：', 'z-scores, the 5 largest and the count with |z| ≥ 2:'),
             f'm, s = {_m}, {_s}\ndf["z"] = ((df["amount"] - m) / s).round(2)\nprint(df.nlargest(5, "z")[["order_id", "amount", "z"]])\nprint((df["z"].abs() >= 2).sum())')], SAME),
    ],
    **{'try': [
        dict(q=(f'helpdesk_tickets の minutes（{{平均|へいきん}} {_h[0]}、{{標準偏差|ひょうじゅんへんさ}} {_h[1]}）で、z が{{大|おお}}きい 5 {{件|けん}}の ticket_id と z を{{出|だ}}そう。', f'For minutes in helpdesk_tickets (mean {_h[0]}, standard deviation {_h[1]}), list ticket_id and z of the 5 largest z.'),
             answer=f'SELECT ticket_id, ROUND((minutes - {_h[0]}) / {_h[1]}, 2) AS z FROM helpdesk_tickets ORDER BY z DESC LIMIT 5;', lines=3),
        dict(q=(f'factory_lots の weight_g（{{平均|へいきん}} {_f[0]}、{{標準偏差|ひょうじゅんへんさ}} {_f[1]}）で、|z| が 2 {{以上|いじょう}}の{{件数|けんすう}}を{{数|かぞ}}えよう。', f'For weight_g in factory_lots (mean {_f[0]}, standard deviation {_f[1]}), count the rows with |z| ≥ 2.'),
             answer=f'SELECT COUNT(*) AS outliers FROM factory_lots WHERE ABS(weight_g - {_f[0]}) / {_f[1]} >= 2;', lines=2),
        dict(q=('z = 1.5 の{社員|しゃいん}の{偏差値|へんさち}はいくつ？', 'What is the T-score (hensachi) of an employee with z = 1.5?'),
             answer=None, check=('{計算|けいさん}で{答|こた}える', 'answer by calculation'), lines=1),
    ]},
))

# the answer of each practice task, for the answer pages at the back
ANSWERS = []
for U in UNITS:
    for i, t in enumerate(U['try']):
        ANSWERS.append((U['no'], i + 1, t))
