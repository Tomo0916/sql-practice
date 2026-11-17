# Runs the Python course's reference answers with CPython + pandas (the same normalisation as py-worker.js).
# stdin: { tables: {name: {columns, rows}}, problems: [{id, code, need}] }  → stdout: { id: result | {error} }
import sys, json, math, ast, io
import pandas as pd, numpy as np
data = json.load(sys.stdin)
T = {n: pd.DataFrame(t['rows'], columns=t['columns']) for n, t in data['tables'].items()}
def cell(v):
    if v is None: return None
    if isinstance(v, np.integer): return int(v)
    if isinstance(v, (np.floating, float)):
        f = float(v); return None if math.isnan(f) else round(f, 6)
    if isinstance(v, (np.bool_, bool)): return bool(v)
    return v if isinstance(v, (int, str)) else str(v)
def norm(x):
    if isinstance(x, pd.Series): x = x.to_frame(x.name if x.name is not None else 'value')
    if isinstance(x, pd.DataFrame):
        keep = isinstance(x.index, pd.MultiIndex) or x.index.name is not None
        df = x.reset_index() if keep else x.reset_index(drop=True)
        df.columns = [str(c) for c in df.columns]
        return {'kind': 'table', 'columns': list(df.columns), 'rows': [[cell(v) for v in r] for r in df.itertuples(index=False, name=None)]}
    if x is None: return {'kind': 'none'}
    return {'kind': 'value', 'value': cell(x)}
def run(code, need):
    ns = {'pd': pd, 'np': np}
    for n in need: ns[n] = T[n].copy()
    tree = ast.parse(code)
    last = tree.body.pop() if tree.body and isinstance(tree.body[-1], ast.Expr) else None
    exec(compile(tree, '<exec>', 'exec'), ns)
    return eval(compile(ast.Expression(last.value), '<exec>', 'eval'), ns) if last else None
out = {}
for p in data['problems']:
    try: out[p['id']] = norm(run(p['code'], p['need']))
    except Exception as e: out[p['id']] = {'error': f'{type(e).__name__}: {e}'}
json.dump(out, sys.stdout)
