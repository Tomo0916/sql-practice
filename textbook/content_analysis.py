"""
データ分析編（Data analysis）: Units A1–A14 as data, the same shape as content_beginner.py.
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
             'amount': ('{量的|りょうてき}', 'quantitative'), 'items': ('{量的|りょうてき}', 'quantitative'), 'coupon': ('{質的|しつてき}', 'qualitative'), 'stay_min': ('{量的|りょうてき}', 'quantitative')}
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
             answer=None, check=('{列|れつ}は 8 つ', '8 columns'), lines=2),
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
        (('{平均|へいきん}を{同|おな}じ SQL の{中|なか}で{求|もと}めて{使|つか}う{方法|ほうほう}（サブクエリ・ウィンドウ{関数|かんすう}）は A9・A10 で{学|まな}ぶ。', 'Using the mean inside the same SQL (subqueries, window functions) comes in A9 and A10.'),),
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

# ---------------------------------------------------------------- A7
_cr = run('SELECT store, COUNT(*) AS n, COUNT(coupon) AS with_coupon, ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct_coupon FROM kumo_orders GROUP BY store ORDER BY pct_coupon DESC')[1]
UNITS.append(dict(
    no='A7', key='an_cross', kw='クロス{集計|しゅうけい}・{割合|わりあい}', tags=['sql', 'excel', 'python'],
    title=('クロス{集計|しゅうけい}と{構成比|こうせいひ}', 'Cross tables and shares'),
    ask=('{販促|はんそく}{担当|たんとう}', 'Promotions', '「クーポンはどの{店|みせ}でよく{使|つか}われている？」{店|みせ}ごとに{数|かず}と{割合|わりあい}で{比|くら}べよう。', '“In which store are coupons used most?” Compare stores by count and by share.'),
    goal=('2 つの{列|れつ}で{同時|どうじ}に{数|かぞ}え、{大|おお}きさのちがうグループを % で{比|くら}べられる。', 'You can count by two columns at once and compare groups of different sizes in %.'),
    sections_before=[stat_box([
        ('h', ('クロス{集計|しゅうけい}', 'Cross tables')),
        ('p', ('{店|みせ} × クーポンのように、2 つのことがらで{同時|どうじ}に{行|ぎょう}を{数|かぞ}える。「グループに{違|ちが}いはあるか」の{第一歩|だいいっぽ}。', 'Count rows by two things at once, like store × coupon: the first step to “do the groups differ?”')),
        ('f', '{割合|わりあい}（%）= 100.0 × {部分|ぶぶん} ÷ {全体|ぜんたい}'),
        ('li', [('{行|ぎょう}の{割合|わりあい}：「{渋谷|しぶや}の{注文|ちゅうもん}のうち 39% がクーポン」', 'Row %: “39% of Shibuya’s orders used a coupon”'),
                ('{全体|ぜんたい}に{占|し}める{割合|わりあい}：「{売上|うりあげ}{全体|ぜんたい}の 25% が{渋谷|しぶや}」', 'Share of the whole: “25% of all sales are Shibuya”'),
                ('{大|おお}きな{店|みせ}は{何|なん}でも{数|かず}が{多|おお}い。{比|くら}べるときは %', 'Big stores have more of everything: compare in %')]),
    ], FIGS['cross'], ('{店|みせ}ごとの、クーポンあり（{青|あお}）となし（{橙|だいだい}）の{注文数|ちゅうもんすう}。', 'Orders with (blue) and without (orange) a coupon, per store.'))],
    see=dict(q=('{店|みせ}ごとに、{注文数|ちゅうもんすう}・クーポンを{使|つか}った{注文|ちゅうもん}の{数|かず}・その{割合|わりあい}を{出|だ}す。', 'For each store: orders, orders with a coupon, and that share.'),
             sql='SELECT store, COUNT(*) AS n,\n       COUNT(coupon) AS with_coupon,\n       ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct_coupon\nFROM kumo_orders\nGROUP BY store\nORDER BY pct_coupon DESC;',
             mark='COUNT(coupon)', viz=dict(kind='result'),
             note=(f'{{割合|わりあい}}がいちばん{{高|たか}}いのは {_cr[0][0]}（{_cr[0][3]}%）。{{数|かず}}だけ{{見|み}}ると{{別|べつ}}の{{店|みせ}}が{{多|おお}}く{{見|み}}える。', f'{_cr[0][0]} has the highest share ({_cr[0][3]}%). By count alone another store looks bigger.')),
    after_see=[sub_see(('{値|あたい}ごとに{列|れつ}を{分|わ}ける', 'One column per value'),
        "SELECT store,\n       SUM(CASE WHEN coupon = 'WELCOME10' THEN 1 ELSE 0 END) AS welcome10,\n       SUM(CASE WHEN coupon = 'SPRING5' THEN 1 ELSE 0 END) AS spring5\nFROM kumo_orders\nGROUP BY store;",
        ('SUM(CASE WHEN … THEN 1 ELSE 0 END) は、{条件|じょうけん}に{合|あ}う{行|ぎょう}だけを{数|かぞ}える。Excel のピボットテーブルの「{列|れつ}」と{同|おな}じ{形|かたち}。', 'SUM(CASE WHEN … THEN 1 ELSE 0 END) counts only the rows that meet the condition: the same shape as the Columns of an Excel PivotTable.'))],
    points=[
        (('COUNT({列|れつ}) は NULL でない{行|ぎょう}を{数|かぞ}える。クーポンの{有無|うむ}はこれで{数|かぞ}えられる。', 'COUNT(column) counts the non-NULL rows: that is how to count orders with a coupon.'),),
        (('{全体|ぜんたい}に{占|し}める{割合|わりあい}は、( SELECT SUM(…) FROM … ) で{全体|ぜんたい}の{合計|ごうけい}を{出|だ}して{割|わ}る。', 'For a share of the whole, divide by the grand total from ( SELECT SUM(…) FROM … ).'),
         '<code class="ex">ROUND(100.0 * SUM(amount) / (SELECT SUM(amount) FROM kumo_orders), 1)</code>'),
    ],
    mistakes=[
        dict(wrong='SELECT store, ROUND(100 * COUNT(coupon) / COUNT(*), 1) AS pct\nFROM kumo_orders GROUP BY store;', mark_w='100 *', right='SELECT store, ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct\nFROM kumo_orders GROUP BY store;', mark_r='100.0 *',
             why=('{整数|せいすう}どうしの{割|わ}り{算|ざん}は{小数|しょうすう}が{消|き}える。100.0 にする。', 'Integer division drops the decimals: use 100.0.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('{挿入|そうにゅう} → ピボットテーブル：store を「{行|ぎょう}」、store と coupon を「{値|あたい}」（{個数|こすう}）に。{横|よこ}に{割合|わりあい}を{計算|けいさん}する。', 'Insert → PivotTable: store to Rows, store and coupon to Values (Count). Add the share next to it.'), '=ROUND(100*C5/B5,1)')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{店|みせ}ごとの{数|かず}・クーポンあり・{割合|わりあい}。pd.crosstab で{値|あたい}ごとの{表|ひょう}も{作|つく}れる。', 'Count, with coupon and share per store. pd.crosstab makes the table per value.'),
             's = df.groupby("store").agg(n=("coupon", "size"), with_coupon=("coupon", "count"))\ns["pct_coupon"] = (100 * s["with_coupon"] / s["n"]).round(1)\nprint(s.sort_values("pct_coupon", ascending=False))\npd.crosstab(df["store"], df["coupon"])')], SAME),
    ],
    **{'try': [
        dict(q=('gym_visits で branch ごとに、{行数|ぎょうすう}と trainer が{入|はい}っている{割合|わりあい}（%、{小数|しょうすう}{第|だい} 1 {位|い}）を{出|だ}そう。', 'For gym_visits, per branch: rows and the share (%, 1 decimal) with a trainer.'),
             answer='SELECT branch, COUNT(*) AS n, ROUND(100.0 * COUNT(trainer) / COUNT(*), 1) AS pct_trainer FROM gym_visits GROUP BY branch ORDER BY pct_trainer DESC;', lines=3),
        dict(q=('cafe_sales で shop ごとの amount の{合計|ごうけい}と、{全体|ぜんたい}に{占|し}める{割合|わりあい}を{出|だ}そう。', 'For cafe_sales, the total amount per shop and its share of the whole.'),
             answer='SELECT shop, SUM(amount) AS total_amount, ROUND(100.0 * SUM(amount) / (SELECT SUM(amount) FROM cafe_sales), 1) AS share_pct FROM cafe_sales GROUP BY shop ORDER BY share_pct DESC;', lines=3),
        dict(q=("helpdesk_tickets で team ごとに、rating が 'good' と 'bad' の{件数|けんすう}を{別|べつ}の{列|れつ}で{出|だ}そう。", "For helpdesk_tickets, per team, count rating 'good' and 'bad' in separate columns."),
             answer="SELECT team, SUM(CASE WHEN rating = 'good' THEN 1 ELSE 0 END) AS good, SUM(CASE WHEN rating = 'bad' THEN 1 ELSE 0 END) AS bad FROM helpdesk_tickets GROUP BY team ORDER BY team;", lines=3),
    ]},
))

# ---------------------------------------------------------------- A8
_tr = run("SELECT month, total, total - LAG(total) OVER (ORDER BY month) AS diff FROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total FROM kumo_orders GROUP BY month) ORDER BY diff DESC LIMIT 1")[1][0]
UNITS.append(dict(
    no='A8', key='an_trend', kw='strftime・LAG・{移動平均|いどうへいきん}', tags=['sql', 'excel', 'python'],
    title=('{月|つき}ごとの{推移|すいい}', 'Month by month'),
    ask=('{店長|てんちょう}', 'Store manager', '「{売上|うりあげ}は{落|お}ちている？{伸|の}びている？」{月|つき}ごとに{並|なら}べて、{前|まえ}の{月|つき}と{比|くら}べよう。', '“Are sales going down or up?” Put them month by month and compare with the month before.'),
    goal=('{日付|ひづけ}を{月|つき}にまとめ、{前月|ぜんげつ}との{差|さ}と{移動平均|いどうへいきん}で{流|なが}れを{読|よ}める。', 'You can group dates into months and read the trend with the change from last month and a moving average.'),
    sections_before=[stat_box([
        ('h', ('{時系列|じけいれつ}データ', 'Time series')),
        ('li', [('{傾向|けいこう}：{長|なが}い{期間|きかん}で{上|あ}がるか{下|さ}がるか', 'Trend: up or down over a long time'),
                ('{季節性|きせつせい}：{毎年|まいとし}{同|おな}じ{形|かたち}（12 {月|がつ}に{売|う}れる など）', 'Seasonality: the same pattern every year (more sales in December…)'),
                ('ノイズ：たまたまの{上|あ}がり{下|さ}がり', 'Noise: random ups and downs')]),
        ('f', '{差|さ} = {今月|こんげつ} − {先月|せんげつ}　　3 か{月|げつ}{移動平均|いどうへいきん} = ({今月|こんげつ} + {先月|せんげつ} + {先々月|せんせんげつ}) ÷ 3'),
        ('p', ('{移動平均|いどうへいきん}はノイズをならして{傾向|けいこう}を{見|み}やすくする。{季節性|きせつせい}があるときは{前年|ぜんねん}の{同|おな}じ{月|つき}と{比|くら}べる。', 'A moving average smooths the noise so the trend shows. With seasonality, compare with the same month last year.')),
    ], FIGS['trend'], ('{月|つき}ごとの{合計|ごうけい}（{実線|じっせん}）と 3 か{月|げつ}{移動平均|いどうへいきん}（{点線|てんせん}）。', 'Monthly totals (line) and the 3-month moving average (dashed).'))],
    see=dict(q=("strftime('%Y-%m', order_date) で{月|つき}にまとめ、{月|つき}ごとの{件数|けんすう}と{売上合計|うりあげごうけい}を{出|だ}す。", "Group by month with strftime('%Y-%m', order_date): orders and total amount per month."),
             sql="SELECT strftime('%Y-%m', order_date) AS month,\n       COUNT(*) AS n, SUM(amount) AS total_amount\nFROM kumo_orders\nGROUP BY month\nORDER BY month;",
             mark="strftime('%Y-%m', order_date)", viz=dict(kind='result'),
             note=('12 {月|がつ}に{向|む}けて{伸|の}びている。{月|つき}による{上|あ}がり{下|さ}がりも{大|おお}きい。', 'Sales grow towards December, with big ups and downs from month to month.')),
    after_see=[sub_see(('{前|まえ}の{月|つき}と{比|くら}べる（LAG）', 'Compare with the month before (LAG)'),
        "SELECT month, total,\n       total - LAG(total) OVER (ORDER BY month) AS diff\nFROM (SELECT strftime('%Y-%m', order_date) AS month,\n             SUM(amount) AS total\n      FROM kumo_orders GROUP BY month)\nORDER BY diff DESC\nLIMIT 3;",
        (f'いちばん{{伸|の}}びたのは {_tr[0]}（+{_tr[2]:,}）。LAG(…) OVER (ORDER BY month) は{{月|つき}}の{{順|じゅん}}で 1 つ{{前|まえ}}の{{行|ぎょう}}の{{値|あたい}}。', f'The biggest rise was {_tr[0]} (+{_tr[2]:,}). LAG(…) OVER (ORDER BY month) is the value of the month before.'))],
    points=[
        (('ウィンドウ{関数|かんすう}（… OVER）は{行|ぎょう}をまとめない。{行|ぎょう}はそのままで{列|れつ}が{増|ふ}える。', 'Window functions (… OVER) do not join rows: every row stays and gets a new column.'),),
        (('3 か{月|げつ}{移動平均|いどうへいきん}：AVG(total) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)', '3-month moving average: AVG(total) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)'),),
    ],
    mistakes=[
        dict(wrong="SELECT strftime('%Y-%M', order_date) AS month, SUM(amount) AS total\nFROM kumo_orders GROUP BY month;", mark_w="'%Y-%M'",
             right="SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS total\nFROM kumo_orders GROUP BY month;", mark_r="'%Y-%m'", max_rows=4,
             why=('%M（{大文字|おおもじ}）は「{分|ふん}」。{月|つき}は %m（{小文字|こもじ}）。{全部|ぜんぶ}が 1 {行|ぎょう}にまとまってしまう。', '%M (capital) means minutes; the month is %m. Everything ends up in one row.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('テーブルに month の{列|れつ}を{足|た}し、ピボットテーブルで{月|つき}ごとに{合計|ごうけい}。{挿入|そうにゅう} → {折|お}れ{線|せん}グラフ。', 'Add a month column, total it per month in a PivotTable, then Insert → Line chart.'), '=TEXT([@order_date],"yyyy-mm")')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{月|つき}ごとの{合計|ごうけい}・{前月|ぜんげつ}との{差|さ}・3 か{月|げつ}{移動平均|いどうへいきん}：', 'Monthly total, change from last month, 3-month moving average:'),
             's = df.groupby(df["order_date"].str[:7])["amount"].sum().to_frame("total")\ns["diff"] = s["total"].diff()\ns["ma3"] = s["total"].rolling(3, min_periods=1).mean().round(1)\ns')], SAME),
    ],
    **{'try': [
        dict(q=('courier_jobs の ship_date の{月|つき}ごとに、{件数|けんすう}と fee の{合計|ごうけい}を{出|だ}そう。', 'For courier_jobs, per month of ship_date: jobs and total fee.'),
             answer="SELECT strftime('%Y-%m', ship_date) AS month, COUNT(*) AS n, SUM(fee) AS total_fee FROM courier_jobs GROUP BY month ORDER BY month;", lines=3),
        dict(q=('gym_visits の minutes を{月|つき}ごとに{合計|ごうけい}し、{前|まえ}の{月|つき}との{差|さ}（diff）を{出|だ}そう。', 'For gym_visits, total minutes per month and the change from the month before (diff).'),
             answer="SELECT month, total, total - LAG(total) OVER (ORDER BY month) AS diff FROM (SELECT strftime('%Y-%m', visit_date) AS month, SUM(minutes) AS total FROM gym_visits GROUP BY month) ORDER BY month;", lines=3),
        dict(q=('hotel_stays の charge の{月|つき}ごとの{合計|ごうけい}と、3 か{月|げつ}{移動平均|いどうへいきん}（{小数|しょうすう}{第|だい} 1 {位|い}）を{出|だ}そう。', 'For hotel_stays, the monthly total charge and the 3-month moving average (1 decimal).'),
             answer="SELECT month, total, ROUND(AVG(total) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS ma3 FROM (SELECT strftime('%Y-%m', checkin_date) AS month, SUM(charge) AS total FROM hotel_stays GROUP BY month) ORDER BY month;", lines=3),
    ]},
))

# ---------------------------------------------------------------- A9
_r = one('SELECT ROUND(SUM((amount - m.mx) * (stay_min - m.my)) / SQRT(SUM((amount - m.mx) * (amount - m.mx)) * SUM((stay_min - m.my) * (stay_min - m.my))), 3) FROM kumo_orders, (SELECT AVG(amount) AS mx, AVG(stay_min) AS my FROM kumo_orders) AS m')
UNITS.append(dict(
    no='A9', key='an_corr', kw='{相関係数|そうかんけいすう} r', tags=['sql', 'excel', 'python'],
    title=('2 つの{数|かず}の{関係|かんけい}（{相関|そうかん}）', 'Relationship between two numbers'),
    ask=('{店舗|てんぽ}{企画|きかく}', 'Store planning', '「{店|みせ}に{長|なが}くいるお{客|きゃく}ほど、たくさん{買|か}う？」{滞在|たいざい}{時間|じかん}と{金額|きんがく}の{関係|かんけい}を{調|しら}べよう。', '“Do customers who stay longer buy more?” Check the relationship between time in the store and amount.'),
    goal=('{散布図|さんぷず}と{相関係数|そうかんけいすう}で{関係|かんけい}の{強|つよ}さを{言|い}え、{相関|そうかん}と{因果|いんが}を{区別|くべつ}できる。', 'You can describe the strength of a relationship with a scatter plot and r, and tell correlation from causation.'),
    sections_before=[stat_box([
        ('f', 'r = Σ(x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² × Σ(y − ȳ)² )'),
        ('li', [('|r| ≥ 0.7 {強|つよ}い・0.4〜0.7 {中|ちゅう}くらい・0.2〜0.4 {弱|よわ}い・0.2 {未満|みまん} ほとんどない（{目安|めやす}）', '|r| ≥ 0.7 strong, 0.4–0.7 moderate, 0.2–0.4 weak, below 0.2 almost none (rule of thumb)'),
                ('r は{直線的|ちょくせんてき}な{関係|かんけい}だけを{見|み}る。{必|かなら}ず{散布図|さんぷず}も{見|み}る', 'r sees only straight-line relationships: always look at the scatter plot'),
                ('{相関|そうかん}は{因果|いんが}ではない：アイスの{売上|うりあげ}と{水|みず}の{事故|じこ}は、{気温|きおん}が{両方|りょうほう}を{動|うご}かす', 'Correlation is not causation: ice-cream sales and swimming accidents are both moved by the temperature')]),
    ], FIGS['scatter'], ('amount（{横|よこ}）と stay_min（{縦|たて}）の{散布図|さんぷず}。{点線|てんせん}はいちばん{合|あ}う{直線|ちょくせん}。', 'amount (x) and stay_min (y), with the best straight line (dashed).'))],
    see=dict(q=('{平均|へいきん}との{差|さ}を{掛|か}け{合|あ}わせて{足|た}し、{両方|りょうほう}の{散|ち}らばりで{割|わ}る＝{相関係数|そうかんけいすう}。', 'Multiply the differences from the mean, add them up, and divide by both spreads: that is r.'),
             sql='SELECT COUNT(*) AS n,\n  ROUND(SUM((amount - m.mx) * (stay_min - m.my))\n    / SQRT(SUM((amount - m.mx) * (amount - m.mx))\n         * SUM((stay_min - m.my) * (stay_min - m.my))), 3) AS r\nFROM kumo_orders,\n  (SELECT AVG(amount) AS mx, AVG(stay_min) AS my\n   FROM kumo_orders) AS m;',
             mark='(amount - m.mx) * (stay_min - m.my)', viz=dict(kind='result'),
             note=(f'r = {_r}：{{強|つよ}}い{{正|せい}}の{{相関|そうかん}}。ただし「{{長|なが}}くいさせれば{{売|う}}れる」とは{{言|い}}えない（たくさん{{買|か}}う{{人|ひと}}は{{選|えら}}ぶのに{{時間|じかん}}がかかる、かもしれない）。', f'r = {_r}: a strong positive correlation. But it does not show that keeping people longer sells more (people who buy a lot may need longer to choose).')),
    points=[
        (('( SELECT AVG… ) AS m を FROM に{並|なら}べると、{全部|ぜんぶ}の{行|ぎょう}で m.mx・m.my が{使|つか}える。', 'Putting ( SELECT AVG… ) AS m in FROM makes m.mx and m.my usable on every row.'),),
        (('{少|すこ}しの{外|はず}れ{値|ち}で r は{大|おお}きく{変|か}わる。{外|はず}れ{値|ち}を{除|のぞ}いた r とも{比|くら}べる。', 'A few outliers can change r a lot: compare with r without them.'),),
    ],
    mistakes=[
        dict(wrong='SELECT ROUND(SUM((amount - m.mx) * (stay_min - m.my)) / COUNT(*), 3) AS r\nFROM kumo_orders, (SELECT AVG(amount) AS mx, AVG(stay_min) AS my FROM kumo_orders) AS m;', mark_w='/ COUNT(*)',
             right='SELECT ROUND(SUM((amount - m.mx) * (stay_min - m.my)) / SQRT(SUM((amount - m.mx) * (amount - m.mx)) * SUM((stay_min - m.my) * (stay_min - m.my))), 3) AS r\nFROM kumo_orders, (SELECT AVG(amount) AS mx, AVG(stay_min) AS my FROM kumo_orders) AS m;', mark_r='SQRT(',
             why=('{行数|ぎょうすう}で{割|わ}ると「{共分散|きょうぶんさん}」。{単位|たんい}に{左右|さゆう}されるので、{両方|りょうほう}の{散|ち}らばりで{割|わ}って −1〜1 にする。', 'Dividing by the rows gives the covariance, which depends on the units. Divide by both spreads to get −1 to 1.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('{相関係数|そうかんけいすう}。{散布図|さんぷず}は 2 {列|れつ}を{選|えら}んで{挿入|そうにゅう} → {散布図|さんぷず}、グラフ{要素|ようそ} → {近似曲線|きんじきょくせん}。', 'r. For the scatter plot select both columns → Insert → Scatter, then Chart Elements → Trendline.'), '=ROUND(CORREL(kumo_orders[amount],kumo_orders[stay_min]),3)')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('{相関係数|そうかんけいすう}と{散布図|さんぷず}：', 'r and the scatter plot:'), 'print(round(df["amount"].corr(df["stay_min"]), 3))\ndf.plot.scatter(x="amount", y="stay_min")')], SAME),
    ],
    **{'try': [
        dict(q=('gym_visits の minutes と kcal の{相関係数|そうかんけいすう}（{小数|しょうすう}{第|だい} 3 {位|い}）を{出|だ}そう。', 'Find r between minutes and kcal in gym_visits (3 decimals).'),
             answer='SELECT ROUND(SUM((minutes - m.mx) * (kcal - m.my)) / SQRT(SUM((minutes - m.mx) * (minutes - m.mx)) * SUM((kcal - m.my) * (kcal - m.my))), 3) AS r FROM gym_visits, (SELECT AVG(minutes) AS mx, AVG(kcal) AS my FROM gym_visits) AS m;', lines=3),
        dict(q=('helpdesk_tickets の minutes と score の r を{出|だ}し、{符号|ふごう}（+・−）の{意味|いみ}を{言|い}おう。', 'Find r between minutes and score in helpdesk_tickets, and say what its sign means.'),
             answer='SELECT ROUND(SUM((minutes - m.mx) * (score - m.my)) / SQRT(SUM((minutes - m.mx) * (minutes - m.mx)) * SUM((score - m.my) * (score - m.my))), 3) AS r FROM helpdesk_tickets, (SELECT AVG(minutes) AS mx, AVG(score) AS my FROM helpdesk_tickets) AS m;', lines=3),
        dict(q=('「{雨|あめ}の{日|ひ}は{傘|かさ}がよく{売|う}れ、{客|きゃく}も{少|すく}ない」。{傘|かさ}の{売上|うりあげ}と{客数|きゃくすう}の{相関|そうかん}は{負|ふ}。{傘|かさ}が{客|きゃく}を{減|へ}らした？', '“On rainy days umbrellas sell well and there are fewer customers.” Umbrella sales and customers correlate negatively. Did umbrellas reduce customers?'),
             answer=None, check=('{言葉|ことば}で{答|こた}える', 'answer in words'), lines=2),
    ]},
))

# ---------------------------------------------------------------- A10
_cp = run("SELECT CASE WHEN coupon IS NULL THEN 'no' ELSE 'yes' END AS has_coupon, COUNT(*) AS n, ROUND(AVG(amount), 1) AS mean_amount FROM kumo_orders GROUP BY has_coupon ORDER BY has_coupon")[1]
UNITS.append(dict(
    no='A10', key='an_compare', kw='CASE・ROW_NUMBER', tags=['sql', 'excel', 'python'],
    title=('グループを{比|くら}べる', 'Comparing groups'),
    ask=('{販促|はんそく}{担当|たんとう}', 'Promotions', '「クーポンを{使|つか}った{注文|ちゅうもん}は{大|おお}きい？」あり・なしで{比|くら}べ、{店|みせ}ごとの{一番|いちばん}も{見|み}よう。', '“Are coupon orders bigger?” Compare with and without, and find the top order of each store.'),
    goal=('CASE で{作|つく}ったグループを{比|くら}べ、ROW_NUMBER でグループごとの{順位|じゅんい}を{付|つ}けられる。', 'You can compare groups made with CASE and rank rows inside each group with ROW_NUMBER.'),
    sections_before=[stat_box([
        ('h', ('{公平|こうへい}に{比|くら}べる', 'Comparing fairly')),
        ('li', [('{平均|へいきん}の{差|さ}だけでなく、{散|ち}らばり（{箱|はこ}ひげ{図|ず}）と{件数|けんすう}も{見|み}る', 'Look at the spread (box plot) and the counts, not only the means'),
                ('{外|はず}れ{値|ち}は{平均|へいきん}を{引|ひ}っぱる：{中央値|ちゅうおうち}も{比|くら}べる', 'Outliers pull the mean: compare medians too'),
                ('あり・なしの{比較|ひかく}（A/B）は{実験|じっけん}ではない。ほかの{点|てん}でも{違|ちが}うかもしれない', 'A with/without comparison is not an experiment: the groups may differ in other ways')]),
    ], FIGS['box'], ('{店|みせ}ごとの amount の{箱|はこ}ひげ{図|ず}。', 'Box plot of amount per store.'))],
    see=dict(q=('クーポンあり・なしで{行|ぎょう}を{分|わ}け、それぞれの{件数|けんすう}と{平均|へいきん}{金額|きんがく}を{出|だ}す。', 'Split the orders into with and without a coupon: count and mean amount.'),
             sql="SELECT CASE WHEN coupon IS NULL THEN 'no' ELSE 'yes' END AS has_coupon,\n       COUNT(*) AS n, ROUND(AVG(amount), 1) AS mean_amount\nFROM kumo_orders\nGROUP BY has_coupon\nORDER BY has_coupon;",
             mark="CASE WHEN coupon IS NULL THEN 'no' ELSE 'yes' END", viz=dict(kind='result'),
             note=(f'クーポンありの{{平均|へいきん}}は {_cp[1][2]:,}、なしは {_cp[0][2]:,}。ただし「クーポンで{{増|ふ}}えた」とまでは{{言|い}}えない。', f'With a coupon the mean is {_cp[1][2]:,}, without {_cp[0][2]:,}. That does not prove the coupon caused it.')),
    after_see=[sub_see(('{店|みせ}ごとの{一番|いちばん}（ROW_NUMBER）', 'The top of each store (ROW_NUMBER)'),
        'SELECT store, order_id, amount\nFROM (SELECT store, order_id, amount,\n        ROW_NUMBER() OVER (PARTITION BY store ORDER BY amount DESC) AS rn\n      FROM kumo_orders)\nWHERE rn = 1\nORDER BY store;',
        ('PARTITION BY store で{店|みせ}ごとに 1, 2, 3 … と{番号|ばんごう}を{付|つ}け{直|なお}し、rn = 1 を{残|のこ}す。', 'PARTITION BY store numbers the rows again in each store; keep rn = 1.'))],
    points=[
        (('ウィンドウ{関数|かんすう}は WHERE の{中|なか}では{使|つか}えない。( ) の{中|なか}で{番号|ばんごう}を{付|つ}けてから{外側|そとがわ}で{絞|しぼ}る。', 'Window functions cannot go in WHERE: number the rows in a subquery, then filter outside.'),),
        (('「{全体|ぜんたい}の{平均|へいきん}より{上|うえ}の{割合|わりあい}」も{比|くら}べ{方|かた}の 1 つ：CASE WHEN amount > (SELECT AVG(amount) …) THEN 1 ELSE 0 END', '“Share above the overall mean” is another comparison: CASE WHEN amount > (SELECT AVG(amount) …) THEN 1 ELSE 0 END'),),
    ],
    mistakes=[
        dict(wrong="SELECT CASE WHEN coupon = NULL THEN 'no' ELSE 'yes' END AS has_coupon, COUNT(*) AS n\nFROM kumo_orders GROUP BY has_coupon;", mark_w='coupon = NULL',
             right="SELECT CASE WHEN coupon IS NULL THEN 'no' ELSE 'yes' END AS has_coupon, COUNT(*) AS n\nFROM kumo_orders GROUP BY has_coupon;", mark_r='coupon IS NULL',
             why=('= NULL は{決|け}して{成|な}り{立|た}たない。NULL は IS NULL で{調|しら}べる。', '= NULL is never true. Test NULL with IS NULL.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('has_coupon の{列|れつ}を{足|た}し、ピボットテーブルで{個数|こすう}と{平均|へいきん}。{店|みせ}ごとの{最大|さいだい}は MAXIFS。', 'Add a has_coupon column; Count and Average in a PivotTable. The largest per store: MAXIFS.'), '=IF([@coupon]="","no","yes")\n=MAXIFS(kumo_orders[amount],kumo_orders[store],"Umeda")')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('あり・なしの{比較|ひかく}と、{店|みせ}ごとの{最大|さいだい}の{注文|ちゅうもん}：', 'With/without, and the largest order of each store:'),
             'df["has_coupon"] = df["coupon"].notna().map({True: "yes", False: "no"})\nprint(df.groupby("has_coupon")["amount"].agg(["count", "mean"]).round(1))\ndf.loc[df.groupby("store")["amount"].idxmax(), ["store", "order_id", "amount"]]')], SAME),
    ],
    **{'try': [
        dict(q=("courier_jobs で note のある・なし（'yes'・'no'）ごとに、{件数|けんすう}と fee の{平均|へいきん}を{出|だ}そう。", "For courier_jobs, with and without a note ('yes', 'no'): count and mean fee."),
             answer="SELECT CASE WHEN note IS NULL THEN 'no' ELSE 'yes' END AS has_note, COUNT(*) AS n, ROUND(AVG(fee), 1) AS mean_fee FROM courier_jobs GROUP BY has_note ORDER BY has_note;", lines=3),
        dict(q=('hotel_stays で hotel ごとに、charge がいちばん{大|おお}きい{宿泊|しゅくはく}の stay_id と charge を{出|だ}そう。', 'For hotel_stays, per hotel: stay_id and charge of the largest charge.'),
             answer='SELECT hotel, stay_id, charge FROM (SELECT hotel, stay_id, charge, ROW_NUMBER() OVER (PARTITION BY hotel ORDER BY charge DESC) AS rn FROM hotel_stays) WHERE rn = 1 ORDER BY hotel;', lines=3),
        dict(q=('gym_visits で branch ごとに、minutes が{全体|ぜんたい}の{平均|へいきん}より{長|なが}い{割合|わりあい}（%）を{出|だ}そう。', 'For gym_visits, per branch: the share (%) of visits longer than the overall mean.'),
             answer='SELECT branch, ROUND(100.0 * SUM(CASE WHEN minutes > (SELECT AVG(minutes) FROM gym_visits) THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_above FROM gym_visits GROUP BY branch ORDER BY pct_above DESC;', lines=3),
    ]},
))

# ---------------------------------------------------------------- A11
_jp = run('SELECT kumo_accounts.plan, COUNT(*) AS n, SUM(kumo_orders.amount) AS total_amount, ROUND(AVG(kumo_orders.amount), 1) AS mean_amount FROM kumo_orders INNER JOIN kumo_accounts ON kumo_orders.customer_id = kumo_accounts.customer_id GROUP BY kumo_accounts.plan ORDER BY total_amount DESC')[1]
UNITS.append(dict(
    no='A11', key='an_join', kw='JOIN して{集計|しゅうけい}', tags=['sql', 'excel', 'python'],
    title=('2 つの{表|ひょう}を{合|あ}わせて{分析|ぶんせき}する', 'Analysing two tables together'),
    ask=('{会員|かいいん}{担当|たんとう}', 'Membership', '「Gold {会員|かいいん}は{本当|ほんとう}にたくさん{買|か}っている？」{注文|ちゅうもん}と{会員|かいいん}の{表|ひょう}を{合|あ}わせよう。', '“Do Gold members really buy more?” Combine the orders and the member tables.'),
    goal=('{人|ひと}のコードで JOIN し、{人|ひと}の{表|ひょう}の{列|れつ}でグループにして{集計|しゅうけい}できる。', 'You can JOIN on the person’s code and group by a column of the people table.'),
    sections_before=[stat_box([
        ('p', ('{何|なに}が{起|お}きたか（{注文|ちゅうもん}）と、{誰|だれ}がしたか（{会員|かいいん}）は{別|べつ}の{表|ひょう}にある。customer_id でつなぐ。', 'What happened (orders) and who did it (members) are in different tables. Join them on customer_id.')),
        ('li', [('INNER JOIN：{両方|りょうほう}に{相手|あいて}がいる{行|ぎょう}だけ', 'INNER JOIN: only rows with a partner in both'),
                ('LEFT JOIN … WHERE {右|みぎ}.id IS NULL：{一度|いちど}も{買|か}っていない{人|ひと}', 'LEFT JOIN … WHERE right.id IS NULL: people who never bought'),
                ('JOIN の{後|あと}は{数|かぞ}え{方|かた}に{注意|ちゅうい}：{注文|ちゅうもん}の{多|おお}い{人|ひと}はたくさんの{行|ぎょう}になる', 'Count with care after a JOIN: a person with many orders becomes many rows')]),
    ], FIGS['plans'], ('kumo_accounts のプランごとの{人数|にんずう}。', 'People per plan in kumo_accounts.'))],
    see=dict(q=('kumo_orders と kumo_accounts を customer_id でつなぎ、プランごとに{注文数|ちゅうもんすう}・{合計|ごうけい}・{平均|へいきん}を{出|だ}す。', 'Join kumo_orders and kumo_accounts on customer_id: orders, total and mean per plan.'),
             sql='SELECT kumo_accounts.plan, COUNT(*) AS n,\n       SUM(kumo_orders.amount) AS total_amount,\n       ROUND(AVG(kumo_orders.amount), 1) AS mean_amount\nFROM kumo_orders\n  INNER JOIN kumo_accounts\n  ON kumo_orders.customer_id = kumo_accounts.customer_id\nGROUP BY kumo_accounts.plan\nORDER BY total_amount DESC;',
             mark='ON kumo_orders.customer_id = kumo_accounts.customer_id', viz=dict(kind='result'),
             note=(f'{{合計|ごうけい}}は {_jp[0][0]} がいちばん。でも{{平均|へいきん}}で{{見|み}}ると、プランの{{差|さ}}は{{小|ちい}}さい。{{合計|ごうけい}}の{{差|さ}}は{{人数|にんずう}}の{{差|さ}}。', f'{_jp[0][0]} has the largest total, but the means are close: the difference in totals comes from the number of people.')),
    points=[
        (('{同|おな}じ{名前|なまえ}の{列|れつ}（customer_id）が{両方|りょうほう}にあるので、{表名|ひょうめい}.{列名|れつめい} で{書|か}く。', 'customer_id is in both tables, so write table.column.'),),
        (('{人|ひと}ごとに GROUP BY すると、{購入回数|こうにゅうかいすう}や{合計|ごうけい}で{上位|じょうい}のお{客|きゃく}が{分|わ}かる（RFM {分析|ぶんせき}の{入|い}り{口|ぐち}）。', 'GROUP BY person shows the best customers by number and total of purchases (the start of RFM analysis).'),),
    ],
    mistakes=[
        dict(wrong='SELECT plan, COUNT(*) AS n\nFROM kumo_accounts GROUP BY plan;', mark_w='FROM kumo_accounts',
             right='SELECT kumo_accounts.plan, COUNT(*) AS n\nFROM kumo_orders INNER JOIN kumo_accounts\n  ON kumo_orders.customer_id = kumo_accounts.customer_id\nGROUP BY kumo_accounts.plan;', mark_r='INNER JOIN kumo_accounts',
             why=('{会員|かいいん}の{表|ひょう}だけでは「{人数|にんずう}」しか{数|かぞ}えられない。{注文|ちゅうもん}を{数|かぞ}えるには JOIN する。', 'The member table alone counts people. To count orders, JOIN.')),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('kumo_accounts もテーブルにし、{注文|ちゅうもん}にプランを{持|も}ってくる。そのあとピボットテーブル。', 'Make kumo_accounts a table too, bring the plan into the orders, then a PivotTable.'), '=XLOOKUP([@customer_id],kumo_accounts[customer_id],kumo_accounts[plan])')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('merge でつないで、プランごとに{集計|しゅうけい}：', 'merge, then aggregate per plan:'), 'acc = pd.read_csv("kumo_accounts.csv")\nm = df.merge(acc, on="customer_id")\nm.groupby("plan")["amount"].agg(["count", "sum", "mean"]).round(1)')], SAME),
    ],
    **{'try': [
        dict(q=('gym_visits と gym_members を member_id でつなぎ、plan ごとの{利用回数|りようかいすう}と minutes の{合計|ごうけい}を{出|だ}そう。', 'Join gym_visits and gym_members on member_id: visits and total minutes per plan.'),
             answer='SELECT gym_members.plan, COUNT(*) AS n, SUM(gym_visits.minutes) AS total_minutes FROM gym_visits INNER JOIN gym_members ON gym_visits.member_id = gym_members.member_id GROUP BY gym_members.plan ORDER BY total_minutes DESC;', lines=3),
        dict(q=('cafe_members のうち、cafe_sales に{一度|いちど}も{出|で}てこない{人|ひと}を plan ごとに{数|かぞ}えよう。', 'Count the cafe_members who never appear in cafe_sales, per plan.'),
             answer='SELECT cafe_members.plan, COUNT(*) AS n FROM cafe_members LEFT JOIN cafe_sales ON cafe_members.member_id = cafe_sales.member_id WHERE cafe_sales.sale_id IS NULL GROUP BY cafe_members.plan ORDER BY cafe_members.plan;', lines=3),
        dict(q=('courier_jobs で client_id ごとの{件数|けんすう}と fee の{合計|ごうけい}を{出|だ}し、{合計|ごうけい}の{大|おお}きい 3 {社|しゃ}を{出|だ}そう。', 'For courier_jobs, jobs and total fee per client_id: the top 3 by total.'),
             answer='SELECT client_id, COUNT(*) AS n, SUM(fee) AS total_fee FROM courier_jobs GROUP BY client_id ORDER BY total_fee DESC LIMIT 3;', lines=2),
    ]},
))

# ---------------------------------------------------------------- A12
_raw = run('SELECT COUNT(DISTINCT pref), COUNT(DISTINCT LOWER(TRIM(pref))) FROM kumo_accounts')[1][0]
UNITS.append(dict(
    no='A12', key='an_clean', kw='CASE・TRIM・COALESCE', tags=['sql', 'excel', 'python'],
    title=('データの{下|した}ごしらえ', 'Getting data ready'),
    ask=('{会員|かいいん}{担当|たんとう}', 'Membership', '「{都道府県|とどうふけん}ごとの{会員数|かいいんすう}を{出|だ}して。」でも{手入力|てにゅうりょく}の{列|れつ}は{書|か}き{方|かた}がばらばら。', '“Members per prefecture, please.” But the hand-typed column is written in many ways.'),
    goal=('{書|か}き{方|かた}のゆれをそろえ、{空欄|くうらん}に{名前|なまえ}を{付|つ}け、{数|かず}を{区分|くぶん}にまとめられる。', 'You can unify spellings, name the blanks and put numbers into bands.'),
    sections_before=[stat_box([
        ('p', ('{分析|ぶんせき}の{時間|じかん}の{多|おお}くは{準備|じゅんび}にかかる。まず{数|かぞ}えて、{値|あたい}を{見|み}て、それから{整|ととの}える。{元|もと}の{列|れつ}は{残|のこ}し、{新|あたら}しい{列|れつ}を{作|つく}る。', 'Most analysis time goes into preparation. Count, look at the values, then tidy. Keep the original column and make a new one.')),
        ('li', [('{書|か}き{方|かた}のゆれ：TRIM（{前後|ぜんご}の{空白|くうはく}）・LOWER／UPPER（{大文字|おおもじ}{小文字|こもじ}）・REPLACE', 'Spelling: TRIM (spaces), LOWER / UPPER (case), REPLACE'),
                ("{空欄|くうらん}：COALESCE(x, '(none)') ではっきり{見|み}せる。{数|かず}をだまって 0 にしない", "Blanks: show them with COALESCE(x, '(none)'). Never silently put 0 in numbers"),
                ('{区分|くぶん}：CASE WHEN で{年代|ねんだい}・{価格帯|かかくたい}。{区切|くぎ}りはきりのよい{数|かず}に', 'Bands: CASE WHEN for age or price bands, with round numbers as edges')]),
    ])],
    see=dict(q=('pref の{前後|ぜんご}の{空白|くうはく}を{消|け}して{小文字|こもじ}にし、{都道府県|とどうふけん}ごとに{数|かぞ}える。', 'Remove the spaces around pref, make it lower case, and count per prefecture.'),
             sql='SELECT LOWER(TRIM(pref)) AS pref_clean, COUNT(*) AS n\nFROM kumo_accounts\nGROUP BY pref_clean\nORDER BY n DESC;',
             mark='LOWER(TRIM(pref))', viz=dict(kind='result'),
             note=(f'{{元|もと}}の pref は {_raw[0]} {{通|とお}}りの{{書|か}}き{{方|かた}}があったが、{{整|ととの}}えると {_raw[1]} つになる。', f'pref was written in {_raw[0]} different ways; after tidying there are {_raw[1]}.')),
    after_see=[sub_see(('{年代|ねんだい}に{分|わ}ける（CASE WHEN）', 'Age bands (CASE WHEN)'),
        "SELECT CASE WHEN age < 30 THEN '1: < 30'\n            WHEN age < 50 THEN '2: 30-49'\n            ELSE '3: 50+' END AS band,\n       COUNT(*) AS n\nFROM kumo_accounts\nGROUP BY band\nORDER BY band;",
        ('{条件|じょうけん}は{上|うえ}から{順|じゅん}に{調|しら}べられ、{最初|さいしょ}に{合|あ}ったものになる。{名前|なまえ}の{先頭|せんとう}に{番号|ばんごう}を{付|つ}けると{順番|じゅんばん}どおりに{並|なら}ぶ。', 'The conditions are checked from the top; the first match wins. A number at the start of each name keeps the bands in order.'))],
    points=[
        (('{数|かぞ}える{前|まえ}に GROUP BY で{値|あたい}の{一覧|いちらん}を{見|み}る。おかしな{書|か}き{方|かた}はここで{見|み}つかる。', 'Before counting, list the values with GROUP BY: odd spellings show up here.'),),
        (("COALESCE(coupon, '(none)') で{空欄|くうらん}も 1 つのグループとして{数|かぞ}えられる。", "COALESCE(coupon, '(none)') counts the blanks as one group too."),),
    ],
    mistakes=[
        dict(wrong='SELECT pref, COUNT(*) AS n\nFROM kumo_accounts GROUP BY pref;', mark_w='GROUP BY pref', right='SELECT LOWER(TRIM(pref)) AS pref_clean, COUNT(*) AS n\nFROM kumo_accounts GROUP BY pref_clean;', mark_r='LOWER(TRIM(pref))',
             max_rows=6, why=("そのままでは ' tokyo' と 'Tokyo' が{別|べつ}の{県|けん}として{数|かぞ}えられる。", "As it is, ' tokyo' and 'Tokyo' are counted as different places.")),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_accounts'),
            (('{整|ととの}えた{列|れつ}と{年代|ねんだい}の{列|れつ}を{足|た}して、ピボットテーブルで{数|かぞ}える。', 'Add a tidy column and a band column, then count in a PivotTable.'), '=LOWER(TRIM([@pref]))\n=IFS([@age]<30,"1: < 30",[@age]<50,"2: 30-49",TRUE,"3: 50+")')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_accounts'),
            (('{整|ととの}える{前|まえ}と{後|あと}、{年代|ねんだい}：', 'Before and after, and the bands:'), 'print(df["pref"].value_counts())\ndf["pref_clean"] = df["pref"].str.strip().str.lower()\nprint(df["pref_clean"].value_counts())\nimport numpy as np\ndf["band"] = np.select([df["age"] < 30, df["age"] < 50], ["1: < 30", "2: 30-49"], "3: 50+")\ndf.groupby("band").size()')], SAME),
    ],
    **{'try': [
        dict(q=('gym_members の pref を{整|ととの}えて、{都道府県|とどうふけん}ごとの{人数|にんずう}を{多|おお}い{順|じゅん}に{出|だ}そう。', 'Tidy pref in gym_members and count members per prefecture, most first.'),
             answer='SELECT LOWER(TRIM(pref)) AS pref_clean, COUNT(*) AS n FROM gym_members GROUP BY pref_clean ORDER BY n DESC;', lines=2),
        dict(q=("hotel_stays の request の{空欄|くうらん}を '(none)' として、{値|あたい}ごとの{件数|けんすう}を{出|だ}そう。", "In hotel_stays, show blank request as '(none)' and count each value."),
             answer="SELECT COALESCE(request, '(none)') AS request_filled, COUNT(*) AS n FROM hotel_stays GROUP BY request_filled ORDER BY n DESC;", lines=2),
        dict(q=("courier_clients の employees を 50 {未満|みまん}・50〜99・100 {以上|いじょう}に{分|わ}けて、{社数|しゃすう}を{数|かぞ}えよう。", "Put employees in courier_clients into < 50, 50–99 and 100+, and count the clients."),
             answer="SELECT CASE WHEN employees < 50 THEN '1: < 50' WHEN employees < 100 THEN '2: 50-99' ELSE '3: 100+' END AS band, COUNT(*) AS n FROM courier_clients GROUP BY band ORDER BY band;", lines=3),
    ]},
))

# ---------------------------------------------------------------- A13
_cm = run('SELECT ROUND(AVG(amount), 1), (SELECT amount FROM kumo_orders ORDER BY amount LIMIT 1 OFFSET 200), MAX(amount) FROM kumo_orders')[1][0]
UNITS.append(dict(
    no='A13', key='an_read', kw='{結果|けっか}を{読|よ}む', tags=['sql'],
    title=('{結果|けっか}を{正|ただ}しく{読|よ}む', 'Reading results correctly'),
    ask=('{部長|ぶちょう}', 'Manager', '「この{数字|すうじ}から{何|なに}が{言|い}える？」{計算|けいさん}より{読|よ}み{取|と}りの{間違|まちが}いのほうが{危|あぶ}ない。', '“What does this number tell us?” Wrong readings are more dangerous than wrong calculations.'),
    goal=('{代表値|だいひょうち}・{相関|そうかん}の{強|つよ}さ・{数|かず}と{割合|わりあい}・{因果|いんが}・{外|はず}れ{値|ち}について、{正|ただ}しい{読|よ}み{方|かた}を{選|えら}べる。', 'You can choose the right reading of typical values, correlation strength, counts vs shares, causation and outliers.'),
    sections_before=[stat_box([
        ('h', ('{数字|すうじ}を{信|しん}じる{前|まえ}の 5 つの{問|と}い', 'Five questions before you believe a number')),
        ('li', [('ふつうの{値|あたい}：{平均|へいきん}？{中央値|ちゅうおうち}？（とても{大|おお}きな{値|あたい}はない？）', 'Typical: mean or median? (Any very large values?)'),
                ('{数|かず}？{割合|わりあい}？（グループの{大|おお}きさは{同|おな}じ？）', 'Count or share? (Same group sizes?)'),
                ('どれくらい{強|つよ}い？（r と{散布図|さんぷず}）', 'How strong? (r and the scatter plot)'),
                ('{原因|げんいん}？いっしょに{動|うご}くだけ？（{第|だい} 3 のものはない？）', 'Cause, or only together? (A third thing?)'),
                ('めずらしい？ふつう？（z はいくつ？）', 'Unusual or normal? (What is z?)')]),
    ], FIGS['center'], ('amount の{分布|ぶんぷ}。{平均|へいきん}は{大|おお}きな{値|あたい}に{引|ひ}っぱられ、{中央値|ちゅうおうち}より{右|みぎ}にある。', 'The distribution of amount. The mean is pulled right by large values.'))],
    see=dict(q=('amount の{平均|へいきん}・{中央値|ちゅうおうち}・{最大値|さいだいち}。「ふつうの{注文|ちゅうもん}」を{表|あらわ}すのはどれ？', 'The mean, median and largest amount. Which shows a “typical order”?'),
             sql='SELECT ROUND(AVG(amount), 1) AS mean_amount,\n       (SELECT amount FROM kumo_orders\n        ORDER BY amount LIMIT 1 OFFSET 200) AS median_amount,\n       MAX(amount) AS max_amount\nFROM kumo_orders;',
             viz=dict(kind='result'),
             note=(f'{{最大|さいだい}} {_cm[2]:,} のような{{大|おお}}きな{{注文|ちゅうもん}}が{{平均|へいきん}}を{{引|ひ}}っぱる。ふつうの{{注文|ちゅうもん}}は{{中央値|ちゅうおうち}} {_cm[1]:,} のほうがよく{{表|あらわ}}す。', f'Big orders like {_cm[2]:,} pull the mean up. The median {_cm[1]:,} shows a typical order better.')),
    points=[
        (('{行数|ぎょうすう}のいちばん{多|おお}いグループが、{割合|わりあい}でもいちばんとは{限|かぎ}らない。', 'The group with the most rows is not always the one with the largest share.'),),
        (('{合計|ごうけい}がいちばん{大|おお}きい{月|つき}と、いちばん{伸|の}びた{月|つき}は{別|べつ}。', 'The month with the largest total is not the month that grew the most.'),),
        (('{相関|そうかん}は「いっしょに{動|うご}く」だけ。{原因|げんいん}を{言|い}うには{実験|じっけん}などの{別|べつ}の{証拠|しょうこ}がいる。', 'Correlation only means “move together”. A cause needs other evidence such as an experiment.'),),
    ],
    **{'try_title': ('{読|よ}んでみよう', 'Read it'), 'try': [
        dict(q=('A7 の{結果|けっか}で、{件数|けんすう}がいちばん{多|おお}い{店|みせ}と、クーポンの{割合|わりあい}がいちばん{高|たか}い{店|みせ}は{同|おな}じ？', 'In the A7 result, is the store with the most orders the store with the highest coupon share?'),
             answer=None, check=('A7 の{表|ひょう}を{見|み}る', 'look at the A7 table'), lines=1),
        dict(q=('r = −0.77 のとき、「{片方|かたほう}が{大|おお}きいともう{片方|かたほう}は？」と、その{強|つよ}さを{言|い}おう。', 'r = −0.77: when one is large, what about the other, and how strong is it?'),
             answer=None, check=('{言葉|ことば}で{答|こた}える', 'answer in words'), lines=1),
        dict(q=('z が 2.4 の{注文|ちゅうもん}は、|z| ≥ 3 の{目安|めやす}で{外|はず}れ{値|ち}？', 'Is an order with z = 2.4 an outlier by the |z| ≥ 3 rule?'),
             answer=None, check=('はい／いいえと{理由|りゆう}', 'yes / no and why'), lines=1),
    ]},
))

# ---------------------------------------------------------------- A14
_dec = run("SELECT store, ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct_coupon, SUM(CASE WHEN order_date >= '2025-07-01' THEN amount ELSE 0 END) - SUM(CASE WHEN order_date < '2025-07-01' THEN amount ELSE 0 END) AS growth FROM kumo_orders GROUP BY store ORDER BY store")[1]
_best = sorted([r for r in _dec if r[2] > 0] or _dec, key=lambda r: r[1])[0]
UNITS.append(dict(
    no='A14', key='an_case', kw='{総合演習|そうごうえんしゅう}', tags=['sql', 'excel', 'python'],
    title=('{次|つぎ}のキャンペーンはどの{店|みせ}で？', 'Where should the next campaign be?'),
    ask=('{社長|しゃちょう}', 'CEO', '「クーポンを 1 つの{店|みせ}で{配|くば}る。どこがいい？」{学|まな}んだことを{使|つか}い、{数字|すうじ}を{理由|りゆう}に{決|き}めよう。', '“We will hand out coupons in one store. Which one?” Use what you learned and decide, with the numbers as your reason.'),
    goal=('{問|と}い → {全体像|ぜんたいぞう} → {比較|ひかく} → {人|ひと} → {決定|けってい} の{流|なが}れで{分析|ぶんせき}し、1 {文|ぶん}で{報告|ほうこく}できる。', 'You can go from question → overview → comparison → people → decision, and report it in one sentence.'),
    sections_before=[stat_box([
        ('li', [('1. {全体像|ぜんたいぞう}：{店|みせ}ごとの{件数|けんすう}・{合計|ごうけい}・{平均|へいきん}（A1・A3）', '1. Overview: count, total, mean per store (A1, A3)'),
                ('2. {今|いま}のクーポン{利用率|りようりつ}（A7）', '2. Coupon use now (A7)'),
                ('3. {上半期|かみはんき}と{下半期|しもはんき}の{売上|うりあげ}（A8）', '3. Sales in the first and second half (A8)'),
                ('4. クーポンあり・なしの{平均|へいきん}（A10）', '4. Mean with and without a coupon (A10)'),
                ('5. どんなお{客|きゃく}か（A11）→ 6. {決|き}める', '5. Who the customers are (A11) → 6. Decide')]),
        ('f', '{報告|ほうこく} ＝ {結論|けつろん} ＋ {数字|すうじ}の{理由|りゆう} ＋ {気|き}をつけること'),
    ], FIGS['halves'], ('{店|みせ}ごとの{上半期|かみはんき}（{青|あお}）と{下半期|しもはんき}（{橙|だいだい}）の{売上|うりあげ}。', 'Sales per store, first half (blue) and second half (orange).'))],
    see=dict(q=('{決|き}めるための{表|ひょう}：{店|みせ}ごとのクーポン{利用率|りようりつ}と、{下半期|しもはんき} − {上半期|かみはんき} の{売上|うりあげ}の{伸|の}び。', 'The table for the decision: coupon share and growth (second half − first half) per store.'),
             sql="SELECT store,\n       ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct_coupon,\n       SUM(CASE WHEN order_date >= '2025-07-01' THEN amount ELSE 0 END)\n     - SUM(CASE WHEN order_date <  '2025-07-01' THEN amount ELSE 0 END)\n       AS growth\nFROM kumo_orders\nGROUP BY store\nORDER BY store;",
             viz=dict(kind='result'),
             note=(f'{{伸|の}}びている{{店|みせ}}（growth > 0）のうち、クーポンの{{割合|わりあい}}がいちばん{{低|ひく}}いのは {_best[0]}（{_best[1]}%）。', f'Of the growing stores (growth > 0), {_best[0]} has the lowest coupon share ({_best[1]}%).')),
    points=[
        ((f'{{報告|ほうこく}}の{{例|れい}}：「クーポンは {_best[0]} で{{配|くば}}る。{{下半期|しもはんき}}に{{売上|うりあげ}}が{{伸|の}}びているのに、クーポンを{{使|つか}}う{{注文|ちゅうもん}}は {_best[1]}% しかない。{{平均|へいきん}}{{金額|きんがく}}が{{下|さ}}がらないか{{見|み}}ていく。」', f'Example report: “Hand out coupons in {_best[0]}: its sales are growing but only {_best[1]}% of orders use a coupon. We will watch whether the mean amount falls.”'),),
        (('{決|き}め{方|かた}（{基準|きじゅん}）を{先|さき}に{言|い}う。{数字|すうじ}を{見|み}てから{基準|きじゅん}を{変|か}えない。', 'State the rule for deciding first. Do not change it after seeing the numbers.'),),
    ],
    tools=[
        tool_box('excel', [opened(XL_OPEN, 'kumo_orders'),
            (('half の{列|れつ}を{足|た}し、ピボットテーブル：store を「{行|ぎょう}」、half を「{列|れつ}」、amount の{合計|ごうけい}。', 'Add a half column; PivotTable: store in Rows, half in Columns, Sum of amount.'), '=IF([@order_date]<DATE(2025,7,1),"first_half","second_half")')], SAME),
        tool_box('python', [opened(PY_OPEN, 'kumo_orders'),
            (('クーポンの{割合|わりあい}と{伸|の}び：', 'Coupon share and growth:'),
             'second = df["order_date"] >= "2025-07-01"\ns = df.groupby("store").agg(pct_coupon=("coupon", lambda x: round(100 * x.notna().mean(), 1)))\ns["growth"] = df[second].groupby("store")["amount"].sum() - df[~second].groupby("store")["amount"].sum()\ns')], SAME),
    ],
    **{'try': [
        dict(q=('cafe_sales で、shop ごとに{上半期|かみはんき}（2025-07-01 より{前|まえ}）と{下半期|しもはんき}の amount の{合計|ごうけい}を{出|だ}そう。', 'For cafe_sales, the total amount per shop in the first half (before 2025-07-01) and the second half.'),
             answer="SELECT shop, SUM(CASE WHEN sale_date < '2025-07-01' THEN amount ELSE 0 END) AS first_half, SUM(CASE WHEN sale_date >= '2025-07-01' THEN amount ELSE 0 END) AS second_half FROM cafe_sales GROUP BY shop ORDER BY shop;", lines=3),
        dict(q=('cafe_sales で、shop ごとのクーポン{利用率|りようりつ}（%）を{低|ひく}い{順|じゅん}に{出|だ}そう。', 'For cafe_sales, the coupon share (%) per shop, lowest first.'),
             answer='SELECT shop, ROUND(100.0 * COUNT(coupon) / COUNT(*), 1) AS pct_coupon FROM cafe_sales GROUP BY shop ORDER BY pct_coupon;', lines=2),
        dict(q=('1・2 の{結果|けっか}から、カフェで「{次|つぎ}にクーポンを{配|くば}る{店|みせ}」を 1 {文|ぶん}で{報告|ほうこく}しよう。', 'From 1 and 2, report in one sentence which cafe should get the coupons next.'),
             answer=None, check=('{結論|けつろん}＋{数字|すうじ}の{理由|りゆう}', 'conclusion + reason with numbers'), lines=2),
    ]},
))

# the answer of each practice task, for the answer pages at the back
ANSWERS = []
for U in UNITS:
    for i, t in enumerate(U['try']):
        ANSWERS.append((U['no'], i + 1, t))
