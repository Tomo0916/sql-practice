#!/usr/bin/env python3
"""
textbook/build.py — builds the printable SQL textbook (Japanese with furigana + English).

    cd textbook && python3 build.py && node render.mjs        # → out/beginner.html, out/beginner.pdf

Content lives in content_*.py as data. This script:
  - runs every SQL statement on the sample tables (the same data as the app) and draws
    the tables, results and "what happens" of each common mistake from the real output
  - stops if a kanji has no furigana, if a "wrong" SQL gives the right result, or if
    a statement that should work fails
Writing rules (see the design doc): furigana on every kanji, English under every
Japanese sentence, Japanese wraps only at 、/。 or between phrases, a sentence that
says a result changes always shows that result, "Lesson" (not 課), 構文 / 句.
"""
import re, html, json, sqlite3, subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
APP_URL = 'https://tomo0916.github.io/sql-practice/next/'

# ------------------------------------------------------------------ text helpers
KANJI = re.compile(r'[一-鿿々]')
RUBY = re.compile(r'\{([^|}]+)\|([^}]+)\}')
esc = html.escape

def ruby(s):
    bare = KANJI.findall(RUBY.sub('', s))
    if bare:
        sys.exit(f'✗ kanji without furigana: {"".join(bare)}  in: {s}')
    out, pos = '', 0
    for m in RUBY.finditer(s):
        out += esc(s[pos:m.start()]) + f'<span class="rb">{esc(m.group(1))}<span class="rt" aria-hidden="true">{esc(m.group(2))}</span></span>'
        pos = m.end()
    return out + esc(s[pos:])

def J(s):
    """Japanese: furigana + segments ending at 、/。 — wraps only there or between phrases."""
    return ''.join(f'<span class="seg">{ruby(p)}</span>' for p in re.split(r'(?<=[、。])', s) if p)

def B(t, tag='div', cls='', extra=''):
    """bilingual block from (ja, en)"""
    ja, en = t
    return f'<{tag} class="bi {cls}"><span class="ja">{J(ja)}{extra}</span><span class="en">{esc(en)}</span></{tag}>'

def H(ja, en):
    return f'<h2>{J(ja)}<small>{esc(en)}</small></h2>'

# ------------------------------------------------------------------ SQL colouring
KW = (r'\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|ASC|DESC|DISTINCT|LIMIT|OFFSET|FETCH|FIRST|NEXT|ROWS|ONLY|'
      r'INSERT|INTO|VALUES|UPDATE|SET|DELETE|GROUP|HAVING|COUNT|SUM|AVG|MAX|MIN|CREATE|TABLE|INTEGER|TEXT|DATE)\b')
FN = {'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'}

def color(t):
    """t is already HTML-escaped"""
    parts = re.split(r"(&#x27;(?:[^&]|&(?!#x27;))*&#x27;|--[^\n]*)", t)
    out = ''
    for i, p in enumerate(parts):
        if i % 2:
            out += f'<span class="cmt">{p}</span>' if p.startswith('--') else f'<span class="str">{p}</span>'
            continue
        p = re.sub(KW, lambda m: f'<b class="{"fn" if m.group(1) in FN else "kw"}">{m.group(1)}</b>', p)
        p = re.sub(r'(?<![\w.#])(\d+(?:\.\d+)?)(?![\w])', r'<span class="num">\1</span>', p)
        out += p
    return out

def sql(s, mark=None, cls=''):
    t = color(esc(s))
    if mark:
        for mk in ([mark] if isinstance(mark, str) else mark):
            m = color(esc(mk))
            assert m in t, f'mark not found: {mk} in {s}'
            t = t.replace(m, f'<mark>{m}</mark>', 1)
    return f'<pre class="sql {cls}">{t}</pre>'

def slot_sql(markup):
    """syntax line: SQL with «{列|れつ}|column» placeholders (English after the last |)"""
    out, pos = '', 0
    for m in re.finditer(r'«([^»]+)»', markup):
        ja, en = m.group(1).rsplit('|', 1)
        out += color(esc(markup[pos:m.start()]))
        out += f'<span class="slot"><span class="slot-ja">{ruby(ja)}</span><span class="slot-en">{esc(en)}</span></span>'
        pos = m.end()
    return out + color(esc(markup[pos:]))

# ------------------------------------------------------------------ sample database
def load_tables():
    data = json.loads(subprocess.run(['node', os.path.join(HERE, 'export-data.mjs')], capture_output=True, text=True, check=True, cwd=HERE).stdout)
    data['members'] = {'table': 'members', 'columns': [['id', 'INTEGER'], ['name', 'TEXT'], ['email', 'TEXT'], ['phone', 'TEXT']], 'rows': [
        [1, 'Aiko Sato', 'aiko@example.com', '090-1111-2222'],
        [2, 'Ben Clark', None, '080-3333-4444'],
        [3, 'Chen Li', 'chen@example.com', None],
        [4, 'Dina Rai', None, None],
        [5, 'Emma Hill', 'emma@example.com', '070-5555-6666'],
        [6, 'Farid Khan', 'farid@example.com', None]]}
    return data

TABLES = load_tables()

def fresh_db():
    db = sqlite3.connect(':memory:')
    for t in TABLES.values():
        db.execute(f'CREATE TABLE {t["table"]} ({", ".join(f"{c} {ty}" for c, ty in t["columns"])})')
        db.executemany(f'INSERT INTO {t["table"]} VALUES ({",".join("?" * len(t["columns"]))})', t['rows'])
    db.commit()
    return db

DB = fresh_db()
MANIFEST = []

def run(s, db=None):
    try:
        cur = (db or DB).execute(s)
    except sqlite3.Error as e:
        if db is None: MANIFEST.append({'sql': s, 'error': True})
        raise
    cols = [d[0] for d in cur.description] if cur.description else []
    rows = [list(r) for r in cur.fetchall()]
    if db is None: MANIFEST.append({'sql': s, 'rows': rows})
    return cols, rows

def run_dml(s, table):
    """apply a data-changing statement to a fresh copy → (before, after, changed row count)"""
    db = fresh_db()
    before = run(f'SELECT * FROM {table}', db)
    try:
        cur = db.execute(s)
    except sqlite3.Error:
        MANIFEST.append({'sql': s, 'table': table, 'error': True})
        raise
    n = cur.rowcount
    after = run(f'SELECT * FROM {table}', db)
    MANIFEST.append({'sql': s, 'table': table, 'after': after[1]})
    return before, after, n

def fmt(v):
    if v is None:
        return '<span class="null">NULL</span>'
    if isinstance(v, float):
        v = round(v, 2)
        return str(int(v)) if v == int(v) else str(v)
    return esc(str(v))

def num_col(rows, i):
    vals = [r[i] for r in rows if r[i] is not None]
    return vals and all(isinstance(v, (int, float)) for v in vals)

def table_html(cols, rows, row_cls=None, col_cls=None, cls='t'):
    row_cls = row_cls or [''] * len(rows)
    col_cls = col_cls or [''] * len(cols)
    right = [num_col(rows, i) for i in range(len(cols))]
    th = ''.join(f'<th class="{"r " if right[i] else ""}{col_cls[i]}">{esc(c)}</th>' for i, c in enumerate(cols))
    trs = ''.join(f'<tr class="{rc}">' + ''.join(f'<td class="{"r " if right[i] else ""}{col_cls[i]}">{fmt(v)}</td>' for i, v in enumerate(r)) + '</tr>' for r, rc in zip(rows, row_cls))
    return f'<table class="{cls}"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>'

def count_badge(n, unit='{行|ぎょう}', en='rows', cls=''):
    if n == 1 and en.endswith('s'):
        en = en[:-1]
    return f'<span class="cnt {cls}">{ruby(f"{n} {unit}")}</span><span class="en cnt-en">{n} {en}</span>'

def cap(label, n=None, cls='', unit='{行|ぎょう}', en_unit='rows'):
    label_html = ruby(label) if '{' in label or KANJI.search(label) else f'<code class="tname">{esc(label)}</code>'
    return f'<div class="fl-cap"><span>{label_html}</span>{count_badge(n, unit, en_unit, cls) if n is not None else ""}</div>'

# ------------------------------------------------------------------ "see it" visuals
def viz(v, q):
    kind = v['kind']
    if kind == 'filter':      # rows that stay are highlighted, the rest struck through
        base_cols, base = run(v['base'])
        cols, res = run(q)
        left = [tuple(r) for r in res]
        keep = []
        for r in base:
            t = tuple(r)
            if t in left:
                left.remove(t); keep.append('keep')
            else:
                keep.append('gone')
        assert not left, 'filter: result rows not found in base'
        return flow(cap(v.get('label', v['table']), len(base)) + table_html(base_cols, base, keep),
                    v.get('arrow', ''), cap('{結果|けっか}', len(res), 'hot') + table_html(cols, res, ['keep'] * len(res)))
    if kind == 'columns':     # chosen columns highlighted in the whole table
        bcols, base = run(f'SELECT * FROM {v["table"]}')
        cols, res = run(q)
        cc = ['pick' if c in cols else 'dim' for c in bcols]
        return flow(cap(v['table'], len(base)) + table_html(bcols, base, col_cls=cc),
                    v.get('arrow', ''), cap('{結果|けっか}', len(res), 'hot') + table_html(cols, res[:4]) + (f'<div class="more">… {J(f"{{全部|ぜんぶ}}で {len(res)} {{行|ぎょう}}")}</div>' if len(res) > 4 else ''), cls='stack')
    if kind == 'before_after':  # e.g. ORDER BY, DISTINCT: the same data before and after
        bcols, base = run(v['base'])
        cols, res = run(q)
        return flow(cap(v.get('label', v['table']), len(base)) + table_html(bcols, base, [v.get('base_cls', lambda r, i: '')(r, i) for i, r in enumerate(base)]),
                    v.get('arrow', ''), cap('{結果|けっか}', len(res), 'hot') + table_html(cols, res, [v.get('res_cls', lambda r, i: 'keep')(r, i) for i, r in enumerate(res)]))
    if kind == 'dml':         # INSERT / UPDATE / DELETE: the table before and after
        (bc, before), (ac, after), n = run_dml(q, v['table'])
        bset = [tuple(r) for r in before]
        aset = [tuple(r) for r in after]
        b_cls = ['gone' if tuple(r) not in aset else '' for r in before]
        a_cls = ['new' if tuple(r) not in bset else '' for r in after]
        if v.get('ids'):      # show only some rows to keep it short
            keep_b = [i for i, r in enumerate(before) if r[0] in v['ids']]
            keep_a = [i for i, r in enumerate(after) if r[0] in v['ids']]
            before, b_cls = [before[i] for i in keep_b], [b_cls[i] for i in keep_b]
            after, a_cls = [after[i] for i in keep_a], [a_cls[i] for i in keep_a]
        if v.get('cols'):     # show only the columns that matter
            ix = [bc.index(c) for c in v['cols']]
            bc, before, after = v['cols'], [[r[i] for i in ix] for r in before], [[r[i] for i in ix] for r in after]
            ac = bc
        return flow(cap(v.get('before_label', '{実行|じっこう}{前|まえ}'), None) + table_html(bc, before, b_cls), '',
                    cap(v.get('after_label', '{実行|じっこう}{後|ご}'), None) + table_html(ac, after, a_cls), cls=v.get('layout', '')) + \
            f'<div class="dml-n">{B(v["changed"])}</div>'
    if kind == 'group':       # rows coloured by group → one row per group
        bcols, base = run(v['base'])
        gi = bcols.index(v['by'])
        groups = list(dict.fromkeys(r[gi] for r in base))
        cols, res = run(q)
        rg = [r[cols.index(v['by'])] if v['by'] in cols else None for r in res]
        return flow(cap(v.get('label', v['table']), len(base)) + table_html(bcols, base, [f'g{groups.index(r[gi]) % 4}' for r in base]),
                    v.get('arrow', ''), cap('{結果|けっか}', len(res), 'hot') + table_html(cols, res, [(f'g{groups.index(g) % 4}' if g in groups else 'keep') + (' gone' if v.get('gone') and g in v['gone'] else '') for g in rg]))
    if kind == 'result':      # just the result of the SQL
        cols, res = run(q)
        return f'<div class="res-only">{cap("{結果|けっか}", len(res), "hot") + table_html(cols, res)}</div>'
    if kind == 'html':
        return v['html']
    raise ValueError(kind)

def flow(left, arrow, right, cls=''):
    return f'<div class="flow {cls}"><div class="fl-col">{left}</div><div class="fl-arrow">{arrow}<b>→</b></div><div class="fl-col">{right}</div></div>'

# ------------------------------------------------------------------ common mistakes
def effect(wrong, right, dml_table=None):
    """what happens when the wrong SQL runs → (ja, en, visual html)"""
    if dml_table:
        try:
            _, (cols, after_w), nw = run_dml(wrong, dml_table)
        except sqlite3.Error:
            return ('→ エラーになる', '→ error'), ''
        _, (_, after_r), nr = run_dml(right, dml_table)
        W = {r[0]: r for r in after_w}; R = {r[0]: r for r in after_r}
        ids = [i for i in dict.fromkeys(list(R) + list(W)) if W.get(i) != R.get(i)]
        if not ids:
            sys.exit(f'✗ wrong DML gives the correct table: {wrong}')
        diff_cols = [j for j in range(2, len(cols)) if any(i in W and i in R and W[i][j] != R[i][j] for i in ids)]
        show = [0, 1] + diff_cols
        rows, cls = [], []
        for i in ids:
            r, c = (W[i], 'bad') if i in W else (R[i], 'lost')
            rows.append([r[j] for j in show]); cls.append(c)
        more = ''
        if len(rows) > 6:
            more = f'<div class="more">… {J(f"{{全部|ぜんぶ}}で {len(rows)} {{行|ぎょう}}")}</div>'
            rows, cls = rows[:6], cls[:6]
        if nw != nr:
            t = (f'→ {nw} {{行|ぎょう}}が{{変|か}}わってしまう（{{正|ただ}}しくは {nr} {{行|ぎょう}}）', f'→ {nw} rows change (correct: {nr} row{"s" if nr != 1 else ""})')
        else:
            t = ('→ ちがう{値|あたい}が{入|はい}ってしまう', '→ wrong values are written')
        return t, cap('{実行|じっこう}{後|ご}', None) + table_html([cols[j] for j in show], rows, cls) + more

    try:
        wc, wr = run(wrong)
    except sqlite3.Error:
        return ('→ エラーになる', '→ error'), ''
    rc, rr = run(right)
    if len(wc) != len(rc):
        return (f'→ {len(wc)} {{列|れつ}}になる（{{正|ただ}}しくは {len(rc)} {{列|れつ}}）', f'→ {len(wc)} columns (correct: {len(rc)})'), \
            cap('{実行|じっこう}{結果|けっか}', len(wr), 'bad') + table_html(wc, wr)
    if [tuple(r) for r in wr] == [tuple(r) for r in rr]:
        sys.exit(f'✗ "wrong" SQL gives the correct result: {wrong}')
    if sorted(map(repr, wr)) == sorted(map(repr, rr)):
        return ('→ {行|ぎょう}の{順番|じゅんばん}がちがう', '→ rows in a different order'), \
            cap('{実行|じっこう}{結果|けっか}', len(wr), 'bad') + table_html(wc, wr)
    # same columns: show the correct rows; rows missing from the wrong output stay visible (dashed)
    left = [tuple(r) for r in wr]
    rows, cls = [], []
    for r in rr:
        if tuple(r) in left:
            left.remove(tuple(r)); rows.append(r); cls.append('')
        else:
            rows.append(r); cls.append('lost')
    for r in left:
        rows.append(list(r)); cls.append('extra')
    if len(wr) != len(rr):
        t = (f'→ {len(wr)} {{行|ぎょう}}になる（{{正|ただ}}しくは {len(rr)} {{行|ぎょう}}）', f'→ {len(wr)} rows (correct: {len(rr)} rows)')
    else:
        t = ('→ {結果|けっか}の{値|あたい}がちがう', '→ different values in the result')
    return t, cap('{実行|じっこう}{結果|けっか}', len(wr), 'bad') + table_html(wc, rows, cls)

def mistake(m, dml_table=None):
    (eja, een), out = effect(m['wrong'], m['right'], dml_table)
    eff = f'<div class="eff">{B((eja, een))}</div>'
    if out:
        side = eff + (f'<div class="lost-note">{B(m["note"])}</div>' if m.get('note') else '')
        body = f'<div class="mx-out"><div class="mx-tbl">{out}</div><div class="mx-side">{side}</div></div>'
        head = f'<div class="mx-line"><span class="x">✕</span>{sql(m["wrong"], m.get("mark_w"), "wrong")}</div>'
    else:
        body = ''
        head = f'<div class="mx-line"><span class="x">✕</span>{sql(m["wrong"], m.get("mark_w"), "wrong")}{eff}</div>'
    # the correct SQL must work
    if dml_table:
        run_dml(m['right'], dml_table)
    else:
        run(m['right'])
    return f'''<div class="mx">{head}{body}{B(m["why"], cls="why")}
      <div class="mx-line"><span class="o">○</span>{sql(m["right"], m.get("mark_r"), "right")}</div></div>'''

# ------------------------------------------------------------------ practice
def task(i, t, dml_table=None, verb=None):
    if t.get('check'):
        chk = t['check']
    elif dml_table:
        _, _, n = run_dml(t['answer'], dml_table)
        chk = (f'{{結果|けっか}}：{n} {{行|ぎょう}}が{verb[0]}', f'{n} row{"s" if n != 1 else ""} {verb[1]}')
    else:
        _, rows = run(t['answer'])
        chk = (f'{{結果|けっか}}：{len(rows)} {{行|ぎょう}}', f'{len(rows)} row{"s" if len(rows) != 1 else ""}')
    lines = '<span class="line"></span>' * t.get('lines', 1)
    return f'''<li><span class="tn">{i}</span><div class="tb"><div class="tq-top">{B(t["q"])}<div class="chk">{J(chk[0])}<span class="en">{chk[1]}</span></div></div>
      <div class="ans">{lines}</div></div></li>'''

# ------------------------------------------------------------------ page parts
QR_CACHE = {}
def qr(url):
    if url not in QR_CACHE:
        QR_CACHE[url] = subprocess.run(['node', os.path.join(HERE, 'qr.mjs'), url], capture_output=True, text=True, check=True, cwd=HERE).stdout
    return QR_CACHE[url]

LEVELS = {'beginner': ('{初級|しょきゅう}', 'Beginner', 3), 'intermediate': ('{中級|ちゅうきゅう}', 'Intermediate', 2), 'advanced': ('{上級|じょうきゅう}', 'Advanced', 1)}

def mini_map(level):
    """three steps, one per volume; this volume's step is filled in its colour"""
    from front_common import LEVEL_INFO, ORDER
    out = ''
    for i, k in enumerate(ORDER):
        c, h = LEVEL_INFO[k]['color'], 26 + i * 22
        fill = c if k == level else '#fff'
        out += f'<rect x="{6 + i * 38}" y="{80 - h}" width="32" height="{h}" rx="4" fill="{fill}" stroke="{c}" stroke-width="3"/>'
    return f'<svg class="map" viewBox="0 0 120 84" aria-hidden="true">{out}</svg>'

TAGS = {'fe': ('{基本|きほん}{情報|じょうほう}', 'FE exam'), 'silver': ('Silver SQL', '')}

def lesson_html(L, level='beginner'):
    lv_ja, lv_en, _ = LEVELS[level]
    dml = L.get('dml_table')
    tags = ''.join(f'<span class="tag">{ruby(TAGS[t][0])}{f"<small>{TAGS[t][1]}</small>" if TAGS[t][1] else ""}</span>' for t in L.get('tags', ['fe', 'silver']))
    parts = [f'''<span class="marker">@@LESSON{L["no"]}@@</span><header class="head">
  <div class="lvl"><span class="lvl-name">{ruby(lv_ja)}</span><span class="lvl-en">Lesson</span><span class="lvl-no">{L["no"]}</span></div>
  <div class="title"><h1><span>{ruby(L["title"][0])}</span>{f'<span class="kwt">{ruby(L["kw"])}</span>' if L.get("kw") else ""}</h1><p class="h1en">{esc(L["title"][1])}</p></div>
  <div class="hqr">{qr(APP_URL + "#/l/" + L["key"])}<div>{ruby("アプリで{練習|れんしゅう}")}</div><div class="en">Practice in the app</div></div>
  <div class="where-am-i">{mini_map(level)}<div class="tags">{tags}</div></div>
</header>
<div class="goal">{B(L["goal"])}</div>''']
    if L.get('syntax'):
        rows = ''.join(f'<div class="syn-row{" new" if r[3] else ""}"><div class="syn-sql">{slot_sql(r[0])}</div>{B((r[1], r[2]), cls="syn-lab")}</div>' for r in L['syntax'])
        notes = ''.join(f'<div class="dialect">{B(n)}</div>' for n in L.get('syntax_notes', []))
        parts.append(f'<section class="box">{H("{構文|こうぶん}", "Syntax")}<div class="syn">{rows}</div>{L.get("syntax_extra", "")}{notes}</section>')
    for extra in L.get('sections_before', []):
        parts.append(extra)
    if L.get('see'):
        S = L['see']
        parts.append(f'''<section class="box see">{H("{見|み}てみる", "See it")}
  {B(S["q"], "p", "q")}{sql(S["sql"], S.get("mark"), "big")}{viz(S["viz"], S["sql"]) if S.get("viz") else ""}{B(S["note"], cls="note") if S.get("note") else ""}</section>''')
    if L.get('points'):
        lis = ''.join(f'<li>{B(p[0])}{p[1] if len(p) > 1 else ""}</li>' for p in L['points'])
        notes = ''.join(f'<div class="dialect">{B(n)}</div>' for n in L.get('notes', []))
        parts.append('<section class="box">' + H("ポイント", "Points") + f'<ol class="pts">{lis}</ol>{notes}</section>')
    for extra in L.get('sections_after', []):
        parts.append(extra)
    if L.get('mistakes'):
        parts.append(f'<section class="box">{H("よくある{間違|まちが}い", "Common mistakes")}{"".join(mistake(m, dml) for m in L["mistakes"])}</section>')
    if L.get('try'):
        tt = L.get('try_title', ('やってみよう', 'Try it'))
        parts.append(f'<section class="box try">{H(*tt)}<ol class="tq">{"".join(task(i + 1, t, dml, L.get("dml_verb")) for i, t in enumerate(L["try"]))}</ol></section>')
    # page 1: header … see it; page 2: points … try it (each exactly one printed page)
    split = next((i for i, p in enumerate(parts) if p.startswith('<section class="box">' + H("ポイント", "Points"))), None)
    if split is None:
        split = next((i for i, p in enumerate(parts) if 'class="box try"' in p or H("よくある{間違|まちが}い", "Common mistakes") in p), len(parts))
    p1, p2 = parts[:split], parts[split:]
    return (f'<article class="lesson" id="L{L["no"]}"><div class="half"><div class="fit">' + '\n'.join(p1) +
            '</div></div><div class="half"><div class="fit">' + '\n'.join(p2) + '</div></div></article>')

def build(name, front, lessons, level):
    from front_common import theme_css
    body = front + '\n'.join(lesson_html(L, level) for L in lessons)
    doc = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>SQL Textbook</title>
<link rel="stylesheet" href="../page.css">{theme_css(level)}</head><body><main class="doc">{body}</main></body></html>'''
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + '.html'), 'w') as f:
        f.write(doc)
    with open(os.path.join(OUT, name + '-sql.json'), 'w') as f:
        json.dump({'tables': TABLES, 'statements': MANIFEST}, f, ensure_ascii=False)
    print(f'✓ {name}: {len(lessons)} lessons, {len(MANIFEST)} SQL statements run')

if __name__ == '__main__':
    import content_beginner as C
    import front_beginner as F
    build('beginner', F.front(), C.LESSONS, 'beginner')
