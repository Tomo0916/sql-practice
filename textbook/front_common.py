"""
Parts shared by every volume (Beginner / Intermediate / Advanced):
the level colours, the cover and the learning map (a mind map of SQL).
"""
from build import J, B, H, ruby, esc

# one colour per volume; the page uses it through the CSS variables --c / --c-soft
LEVEL_INFO = {
    'beginner':     dict(ja='{初級|しょきゅう}', en='Beginner',     color='#2f5fe0', soft='#eef2fd', lessons='0–18'),
    'intermediate': dict(ja='{中級|ちゅうきゅう}', en='Intermediate', color='#0f8a6a', soft='#e6f5ef', lessons='19–35'),
    'advanced':     dict(ja='{上級|じょうきゅう}', en='Advanced',     color='#7b3fc4', soft='#f3ecfc', lessons='36–47'),
    'master':       dict(ja='マスター',          en='Master',       color='#c08400', soft='#fdf4dc', lessons='48'),
    'analysis':     dict(ja='データ{分析|ぶんせき}', en='Data analysis', color='#c2410c', soft='#fdf0e7', lessons='A1–A6'),
}
ORDER = ['beginner', 'intermediate', 'advanced']

def theme_css(level):
    i = LEVEL_INFO[level]
    lv = ''.join(f'--lv-{k}: {v["color"]}; --lv-{k}-soft: {v["soft"]};' for k, v in LEVEL_INFO.items())
    return f'<style>:root {{ --c: {i["color"]}; --c-soft: {i["soft"]}; {lv} }}</style>'

def page(body, cls=''):
    return f'<section class="fpage {cls}"><div class="fit">{body}</div></section>'

# ---------------------------------------------------------------- cover
def cover(level, query, result_cols, result_rows, total, sub):
    """an editor window with the volume's SQL and its result: what you learn in this book"""
    info = LEVEL_INFO[level]
    steps = ''.join(f'<span class="cv-lv{" on" if k == level else ""}" style="--x:{LEVEL_INFO[k]["color"]}">{ruby(LEVEL_INFO[k]["ja"])}<small>{LEVEL_INFO[k]["en"]}</small></span>' for k in ORDER)
    from build import color as sqlcolor
    lines = ''.join(f'<div class="cv-line"><span class="cv-no">{i + 1}</span><span class="cv-code">{sqlcolor(esc(l))}</span></div>' for i, l in enumerate(query.split('\n')))
    th = ''.join(f'<th>{esc(c)}</th>' for c in result_cols)
    trs = ''.join('<tr>' + ''.join(f'<td>{esc(str(v))}</td>' for v in r) + '</tr>' for r in result_rows)
    return page(f'''
    <div class="cv-top"><span class="cv-brand">SQL Textbook</span><div class="cv-steps">{steps}</div></div>
    <h1 class="cv-title">{ruby("SQL {教科書|きょうかしょ}")}</h1>
    <div class="cv-vol"><b>{ruby(info["ja"] + "{編|へん}")}</b><span>{info["en"]} · Lesson {info["lessons"]}</span></div>
    {B(sub, cls="cv-sub")}
    <div class="cv-editor">
      <div class="cv-bar"><i></i><i></i><i></i><span>{level}.sql</span></div>
      <div class="cv-body">{lines}</div>
      <div class="cv-res"><div class="cv-res-cap">{ruby("{結果|けっか}")} <b>{total} rows</b></div>
        <table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table><div class="cv-more">… {total} rows</div></div>
    </div>
    <div class="cover-name"><div><span>No.</span></div><div><span>{ruby("{名前|なまえ}")} <small>Name</small></span></div></div>''', 'cover')

# ---------------------------------------------------------------- learning map (mind map)
# branch: (key, title (ja, en), [(item ja, item en, lessons, level)], box in mm (x, y, w, h))
BRANCHES = [
    ('base', ('{土台|どだい}', 'Foundations'), [
        ('データベースと{表|ひょう}', 'databases and tables', '0', 'beginner'),
        ('データ{型|がた}・{書|か}き{方|かた}', 'data types, writing values', '2', 'beginner')], (64, 0, 56, 27)),
    ('read', ('{読|よ}む（SELECT）', 'Read (SELECT)'), [
        ('{列|れつ}を{選|えら}ぶ・{計算|けいさん}', 'columns, calculation', '1・3', 'beginner'),
        ('{行|ぎょう}を{絞|しぼ}る（WHERE）', 'filter rows (WHERE)', '4–8', 'beginner'),
        ('{並|なら}べる・{件数|けんすう}', 'sort, limit', '9–11', 'beginner'),
        ('{集計|しゅうけい}（GROUP BY）', 'aggregate (GROUP BY)', '15–18', 'beginner'),
        ('{関数|かんすう}・CASE', 'functions, CASE', '19–24', 'intermediate'),
        ('サブクエリ', 'subqueries', '25–28', 'intermediate'),
        ('{結合|けつごう}（JOIN）', 'joins (JOIN)', '29–34', 'intermediate'),
        ('{集合|しゅうごう}{演算|えんざん}', 'set operators', '35', 'intermediate'),
        ('ウィンドウ{関数|かんすう}', 'window functions', '44', 'advanced')], (0, 0, 58, 140)),
    ('change', ('{変|か}える', 'Change'), [
        ('INSERT・UPDATE・DELETE', 'add, change, delete rows', '12–14', 'beginner'),
        ('トランザクション', 'transactions', '36–37', 'advanced')], (64, 98, 56, 40)),
    ('build', ('{作|つく}る', 'Build'), [
        ('CREATE TABLE・データ{型|がた}', 'CREATE TABLE, data types', '38', 'advanced'),
        ('{制約|せいやく}・{外部|がいぶ}キー', 'constraints, foreign keys', '39–40', 'advanced'),
        ('インデックス・ビュー', 'indexes, views', '41–42', 'advanced')], (126, 0, 58, 41)),
    ('protect', ('{守|まも}る', 'Protect'), [
        ('{権限|けんげん}・{安全|あんぜん}', 'privileges, security', '43', 'advanced')], (126, 47, 58, 21)),
    ('design', ('{設計|せっけい}する', 'Design'), [
        ('ER {図|ず}・{正規化|せいきか}', 'ER diagrams, normalisation', '45–47', 'advanced')], (126, 74, 58, 21)),
    ('master', ('マスター', 'Master'), [
        ('データベースを{設計|せっけい}して{作|つく}り、{分析|ぶんせき}する', 'design, build and analyse a database', '48', 'master')], (126, 101, 58, 39)),
]
CENTER = (68, 56, 48, 34)   # x, y, w, h in mm

def mind_map(level):
    W, Hh = 184, 140
    cx, cy = CENTER[0] + CENTER[2] / 2, CENTER[1] + CENTER[3] / 2
    lines, cards = '', ''
    for key, title, items, (x, y, w, h) in BRANCHES:
        # connector: from the centre to the nearest side of the card
        tx = x + w if x + w < CENTER[0] else (x if x > CENTER[0] + CENTER[2] else x + w / 2)
        ty = y + h / 2 if (x + w < CENTER[0] or x > CENTER[0] + CENTER[2]) else (y + h if y + h < CENTER[1] else y)
        lines += f'<path d="M{cx} {cy} C {(cx + tx) / 2} {cy}, {(cx + tx) / 2} {ty}, {tx} {ty}" class="mm-line"/>'
        lis = ''.join(f'<li class="lv-{lv}{" now" if lv == level else ""}"><span class="mm-dot"></span>{B((ja, en))}<span class="mm-l">{esc(ls)}</span></li>' for ja, en, ls, lv in items)
        cards += (f'<div class="mm-card mm-{key}" style="left:{x}mm;top:{y}mm;width:{w}mm;height:{h}mm">'
                  f'<div class="mm-h">{J(title[0])}<span class="en">{esc(title[1])}</span></div><ul>{lis}</ul></div>')
    legend = ''.join(f'<span class="mm-leg lv-{k}"><span class="mm-dot"></span>{ruby(LEVEL_INFO[k]["ja"])} {LEVEL_INFO[k]["en"]} · Lesson {LEVEL_INFO[k]["lessons"]}</span>' for k in ORDER + ['master'])
    center = f'<div class="mm-center" style="left:{CENTER[0]}mm;top:{CENTER[1]}mm;width:{CENTER[2]}mm;height:{CENTER[3]}mm"><b>SQL</b>{B(("データベースと{話|はな}す{言葉|ことば}", "the language for talking to databases"))}</div>'
    return (f'<div class="mm" style="width:{W}mm;height:{Hh}mm"><svg class="mm-svg" viewBox="0 0 {W} {Hh}">{lines}</svg>{center}{cards}</div>'
            f'<div class="mm-legend">{legend}</div>')
