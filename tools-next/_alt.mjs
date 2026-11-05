import initSqlJs from 'sql.js';
import { SqlEngine } from '../js/engine.js';
import { LESSONS } from '../js/lessons.js';
import { altAnswers } from '../js/alt.js';
const eng = new SqlEngine(await initSqlJs());
const seen = new Set(); const stat = {};
for (const L of LESSONS) { if (L.kind === 'quiz') continue; let shown = 0;
  for (const code of ['A1','B2','C3']) for (const p of eng.lessonProblems(L, code)) {
    const alts = altAnswers(eng, p); stat[L.key] = stat[L.key] || [0,0]; stat[L.key][0]++; if (alts.length) stat[L.key][1]++;
    if (shown < 2 && alts.length && !seen.has(L.key + p.stage)) { seen.add(L.key + p.stage); shown++; console.log(`[${L.key}] ${p.sql}`); alts.forEach(a => console.log(`   ${a.rule.padEnd(13)} ${a.sql}`)); }
  } }
console.log(Object.entries(stat).map(([k,[n,h]]) => `${k}:${h}/${n}`).join('  '));
