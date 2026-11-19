/* =========================================================
 * py-worker.js — Python (Pyodide + pandas) in a worker, so a long or endless
 * program never freezes the page (pyrun.js stops the worker after a time limit).
 *   { type: 'init', base, tables }  → load Pyodide from `base`, pandas, and the tables
 *   { type: 'plot', id }            → load matplotlib (once; Lesson 21), reply { id, ok }
 *   { type: 'run', id, code, need } → run the code in a fresh namespace with copies of the tables;
 *                                      reply { id, ok, result, out, error }
 * result: { kind: 'table', columns, rows } | { kind: 'value', value } | { kind: 'none' }
 *       | { kind: 'plot', plot: { type: 'bar' | 'hist' | 'scatter' | 'line', items }, img: PNG in base64 } (a chart was drawn)
 * ========================================================= */
let py = null, ready = null;

const PRELUDE = `
import sys, io, json, math
import pandas as pd
import numpy as np
_T = {}
def _load(tables):
    for name, t in json.loads(tables).items():
        _T[name] = pd.DataFrame(t['rows'], columns=t['columns'])
def _cell(v):
    if v is None: return None
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.floating, float)):
        f = float(v)
        return None if math.isnan(f) else round(f, 6)
    if isinstance(v, (np.bool_, bool)): return bool(v)
    if v is pd.NA or v is pd.NaT: return None
    if isinstance(v, pd.Timestamp): return v.strftime('%Y-%m-%d') if v == v.normalize() else v.isoformat(sep=' ')
    return v if isinstance(v, (int, str)) else str(v)
def _norm(x):
    if isinstance(x, (np.ndarray, pd.api.extensions.ExtensionArray)) and x.ndim == 1: x = pd.Series(list(x))   # .unique() …
    if isinstance(x, pd.Series):
        x = x.to_frame(x.name if x.name is not None else 'value')
    if isinstance(x, pd.DataFrame):
        keep = isinstance(x.index, pd.MultiIndex) or x.index.name is not None
        df = x.reset_index() if keep else x.reset_index(drop=True)
        df.columns = [str(c) for c in df.columns]
        return {'kind': 'table', 'columns': list(df.columns), 'rows': [[_cell(v) for v in row] for row in df.itertuples(index=False, name=None)][:500]}
    if x is None: return {'kind': 'none'}
    if isinstance(x, (np.generic, int, float, str, bool)): return {'kind': 'value', 'value': _cell(x)}
    return {'kind': 'value', 'value': str(x)}
def _plot_spec(plt):
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
_plt = None
def _plot_init():
    global _plt
    import os
    os.environ['MPLBACKEND'] = 'agg'
    import matplotlib
    matplotlib.use('agg')
    import matplotlib.pyplot as plt
    _plt = plt
def _run(code, need):
    from pyodide.code import eval_code
    ns = {'pd': pd, 'np': np}
    if _plt is not None:
        ns['plt'] = _plt
        _plt.close('all')
    for name in json.loads(need):
        ns[name] = _T[name].copy()
    out = io.StringIO()
    old = sys.stdout
    sys.stdout = out
    try:
        val = eval_code(code, ns, filename='<answer>')
    finally:
        sys.stdout = old
    res = _plot_spec(_plt) if _plt is not None else None   # a chart was drawn: that is the answer
    return json.dumps({'result': res or _norm(val), 'out': out.getvalue()[:4000]})
`;

self.onmessage = async e => {
  const m = e.data;
  if (m.type === 'init') {
    ready = (async () => {
      importScripts(m.base + 'pyodide.js');
      py = await loadPyodide({ indexURL: m.base });
      self.postMessage({ type: 'progress', step: 'pandas' });
      await py.loadPackage(['pandas']);
      py.runPython(PRELUDE);
      py.globals.get('_load')(JSON.stringify(m.tables));
    })();
    try { await ready; self.postMessage({ type: 'ready' }); } catch (err) { self.postMessage({ type: 'failed', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'plot') {
    try {
      await ready;
      await py.loadPackage(['matplotlib']);
      py.globals.get('_plot_init')();
      self.postMessage({ id: m.id, ok: true });
    } catch (err) { self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'run') {
    try {
      await ready;
      const r = JSON.parse(py.globals.get('_run')(m.code, JSON.stringify(m.need || [])));
      self.postMessage({ id: m.id, ok: true, result: r.result, out: r.out });
    } catch (err) {
      const msg = String(err && err.message || err), lines = msg.trim().split('\n');
      // the last line of a Python error is the useful one: "KeyError: 'prise'"
      const last = lines.filter(l => /^\w+(Error|Exception|Warning)\b|^\w+:/.test(l)).pop() || lines.pop();
      const line = (/File "<answer>", line (\d+)/.exec(msg) || [])[1];
      // the traceback from the student's code on (pyerrors.js cleanTb makes it short)
      const at = msg.indexOf('  File "<answer>"'), full = at < 0 ? null : msg.slice(at).trim();
      self.postMessage({ id: m.id, ok: false, error: last, line: line ? +line : null, full });
    }
  }
};
