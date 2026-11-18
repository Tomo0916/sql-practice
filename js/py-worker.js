/* =========================================================
 * py-worker.js — Python (Pyodide + pandas) in a worker, so a long or endless
 * program never freezes the page (pyrun.js stops the worker after a time limit).
 *   { type: 'init', base, tables }  → load Pyodide from `base`, pandas, and the tables
 *   { type: 'run', id, code, need } → run the code in a fresh namespace with copies of the tables;
 *                                      reply { id, ok, result, out, error }
 * result: { kind: 'table', columns, rows } | { kind: 'value', value } | { kind: 'none' }
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
    return v if isinstance(v, (int, str)) else str(v)
def _norm(x):
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
def _run(code, need):
    from pyodide.code import eval_code
    ns = {'pd': pd, 'np': np}
    for name in json.loads(need):
        ns[name] = _T[name].copy()
    out = io.StringIO()
    old = sys.stdout
    sys.stdout = out
    try:
        val = eval_code(code, ns, filename='<answer>')
    finally:
        sys.stdout = old
    return json.dumps({'result': _norm(val), 'out': out.getvalue()[:4000]})
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
      self.postMessage({ id: m.id, ok: false, error: last, line: line ? +line : null });
    }
  }
};
