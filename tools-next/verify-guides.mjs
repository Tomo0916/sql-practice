// Runs the Python guide of every data-analysis problem with pandas and checks that it
// prints the same numbers as the app's SQL answer.   node verify-guides.mjs  (needs python3 + pandas)
import initSqlJs from 'sql.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { SqlEngine, LESSON_BY_KEY } from '../next/js/engine.js';
import { LESSONS } from '../next/js/lessons.js';
import { ALL_TABLES } from '../next/js/datasets.js';
import { guideSteps } from '../next/js/analysis-content.js';

const eng = new SqlEngine(await initSqlJs());
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guides-'));
const cases = [], seen = new Set();
for (const L of LESSONS.filter(l => l.themes === 'analysis')) for (const code of ['TEST1', 'A7K2', 'C1', 'C2', 'C3', 'C4']) {
  for (const p of eng.lessonProblems(L, code)) {
    if (seen.has(p.sql)) continue; seen.add(p.sql);
    const fill = s => s.replace(/\{(\w+)\}/g, (m, k) => (k in p.p ? String(p.p[k]) : m));
    const cells = guideSteps(L.key, p.p.w, 'python').filter(s => s.code && !/plt\./.test(s.code)).map(s => fill(s.code));
    const res = eng.exec(p.sql);
    cases.push({ id: `${L.key}/${p.p.w || '_'}/${p.p.t}`, table: p.p.t, cells, expect: res.values.flat().filter(v => typeof v === 'number') });
  }
}
for (const t of new Set(cases.map(c => c.table))) {
  const tb = ALL_TABLES[t];
  fs.writeFileSync(path.join(dir, t + '.csv'), [tb.columns.map(c => c[0]).join(','), ...tb.rows.map(r => r.map(v => (v === null ? '' : v)).join(','))].join('\n'));
}
fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify(cases));
const py = `
import json, re, io, contextlib, ast, os
os.chdir(${JSON.stringify(dir)})
fails = 0
for c in json.load(open("cases.json")):
    ns, out = {}, io.StringIO()
    with contextlib.redirect_stdout(out):
        for cell in c["cells"]:
            tree = ast.parse(cell)
            last = tree.body[-1] if tree.body and isinstance(tree.body[-1], ast.Expr) else None
            if last: tree.body = tree.body[:-1]
            exec(compile(tree, "cell", "exec"), ns)
            if last:
                v = eval(compile(ast.Expression(last.value), "cell", "eval"), ns)
                with __import__("pandas").option_context("display.max_rows", 500, "display.max_columns", 50):
                    print(v)
    nums = [float(x) for x in re.findall(r"-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?", out.getvalue())]
    missing = [e for e in c["expect"] if not any(abs(x - e) <= 0.051 for x in nums)]
    if missing:
        fails += 1
        print("FAIL", c["id"], "missing", missing[:6])
print(len(json.load(open("cases.json"))), "cases,", fails, "failed")
`;
console.log(execFileSync('python3', ['-c', py], { encoding: 'utf8' }));
