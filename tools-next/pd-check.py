# Runs the Python course's reference answers with CPython + pandas (the same normalisation as py-worker.js).
# stdin: { tables: {name: {columns, rows}}, problems: [{id, code, need}] }  → stdout: { id: result | {error} }
import sys, json, math, ast, io
import pandas as pd, numpy as np
import os
os.environ['MPLBACKEND'] = 'agg'
import matplotlib
matplotlib.use('agg')
import matplotlib.pyplot as plt
data = json.load(sys.stdin)
T = {n: pd.DataFrame(t['rows'], columns=t['columns']) for n, t in data['tables'].items()}
def cell(v):
    if v is None: return None
    if isinstance(v, np.integer): return int(v)
    if isinstance(v, (np.floating, float)):
        f = float(v); return None if math.isnan(f) else round(f, 6)
    if isinstance(v, (np.bool_, bool)): return bool(v)
    if v is pd.NaT: return None
    if isinstance(v, pd.Timestamp): return v.strftime('%Y-%m-%d') if v == v.normalize() else v.isoformat(sep=' ')
    return v if isinstance(v, (int, str)) else str(v)
def norm(x):
    if isinstance(x, (np.ndarray, pd.api.extensions.ExtensionArray)) and x.ndim == 1: x = pd.Series(list(x))   # .unique() …
    if isinstance(x, pd.Series): x = x.to_frame(x.name if x.name is not None else 'value')
    if isinstance(x, pd.DataFrame):
        keep = isinstance(x.index, pd.MultiIndex) or x.index.name is not None or pd.api.types.is_object_dtype(x.index) or pd.api.types.is_string_dtype(x.index)   # labels (describe, corr, params) stay
        df = x.reset_index() if keep else x.reset_index(drop=True)
        df.columns = [str(c) for c in df.columns]
        return {'kind': 'table', 'columns': list(df.columns), 'rows': [[cell(v) for v in r] for r in df.itertuples(index=False, name=None)]}
    if x is None: return {'kind': 'none'}
    return {'kind': 'value', 'value': cell(x)}
def plot_spec(plt):
    import base64
    from matplotlib.container import BarContainer
    nums = plt.get_fignums()
    if not nums: return None
    fig = plt.figure(nums[-1])
    axes = fig.get_axes()
    if not axes:
        plt.close('all'); return None
    ax = axes[0]
    fig.canvas.draw()
    spec = {'type': 'empty', 'items': []}
    bars = [c for c in ax.containers if isinstance(c, BarContainer)]
    if bars:
        rects = [r for c in bars for r in c.patches]
        horiz = getattr(bars[0], 'orientation', 'vertical') == 'horizontal'
        xs = [float(r.get_y() if horiz else r.get_x()) for r in rects]
        ws = [float(r.get_height() if horiz else r.get_width()) for r in rects]
        hs = [float(r.get_width() if horiz else r.get_height()) for r in rects]
        order = sorted(range(len(rects)), key=lambda i: xs[i])
        tol = 1e-6 * max([abs(w) for w in ws] + [1])
        joined = len(rects) > 1 and all(abs(xs[order[i]] + ws[order[i]] - xs[order[i + 1]]) < tol for i in range(len(order) - 1))
        if joined:
            spec = {'type': 'hist', 'items': [round(hs[i], 6) for i in order]}
        else:
            ticks = list(ax.get_yticks() if horiz else ax.get_xticks())
            labels = [t.get_text() for t in (ax.get_yticklabels() if horiz else ax.get_xticklabels())]
            def lab(i):
                c = xs[i] + ws[i] / 2
                if ticks and len(labels) == len(ticks) and any(labels):
                    return labels[min(range(len(ticks)), key=lambda k: abs(ticks[k] - c))]
                return str(round(c, 6))
            spec = {'type': 'bar', 'items': sorted([[lab(i), round(hs[i], 6)] for i in range(len(rects))], key=lambda x: (x[0], x[1]))}
    elif any(len(c.get_offsets()) for c in ax.collections):
        pts = [[round(float(x), 6), round(float(y), 6)] for c in ax.collections for x, y in c.get_offsets()]
        spec = {'type': 'scatter', 'items': sorted(pts)}
    elif ax.lines:
        spec = {'type': 'line', 'items': [[round(float(y), 6) for y in l.get_ydata()] for l in ax.lines]}
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=72, bbox_inches='tight')
    plt.close('all')
    return {'kind': 'plot', 'plot': spec, 'img': base64.b64encode(buf.getvalue()).decode('ascii')}
def run(code, need):
    plt.close('all')
    ns = {'pd': pd, 'np': np, 'plt': plt}
    for n in need: ns[n] = T[n].copy()
    tree = ast.parse(code)
    last = tree.body.pop() if tree.body and isinstance(tree.body[-1], ast.Expr) else None
    exec(compile(tree, '<exec>', 'exec'), ns)
    return eval(compile(ast.Expression(last.value), '<exec>', 'eval'), ns) if last else None
out = {}
for p in data['problems']:
    try:
        v = run(p['code'], p['need']); g = plot_spec(plt)
        if g: g.pop('img')
        out[p['id']] = g or norm(v)
    except Exception as e: out[p['id']] = {'error': f'{type(e).__name__}: {e}'}
json.dump(out, sys.stdout)
