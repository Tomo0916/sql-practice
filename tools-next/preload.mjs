#!/usr/bin/env node
/* tools-next/preload.mjs — writes the <link rel="modulepreload"> list of index.html (between the
 * PRELOAD markers): every module that js/student.js imports, directly or not, so the browser fetches
 * them all at once instead of one level after another.   node preload.mjs        (write)
 *                                                          node preload.mjs --check (exit 1 if stale) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export function moduleGraph(entry) {
  const seen = new Set(), out = [];
  const walk = rel => {
    if (seen.has(rel)) return; seen.add(rel);
    const src = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"`;]*?from\s*['"](\.[^'"]+)['"]/gm)) {
      const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]));
      walk(dep);
    }
    out.push(rel);
  };
  walk(entry);
  return out;
}
export function preloadBlock() {
  const mods = moduleGraph('js/student.js').filter(f => f !== 'js/student.js');
  return ['  <!-- PRELOAD (tools-next/preload.mjs) -->', ...mods.map(f => `  <link rel="modulepreload" href="${f}">`), '  <!-- /PRELOAD -->'].join('\n');
}
if (process.argv[1] && process.argv[1].endsWith('preload.mjs')) {
  const file = path.join(root, 'index.html'), html = fs.readFileSync(file, 'utf8');
  const re = /  <!-- PRELOAD[\s\S]*?<!-- \/PRELOAD -->/;
  const next = re.test(html) ? html.replace(re, preloadBlock()) : html.replace('</head>', preloadBlock() + '\n</head>');
  if (process.argv.includes('--check')) { if (next !== html) { console.log('index.html: the modulepreload list is stale — run node tools-next/preload.mjs'); process.exit(1); } }
  else { fs.writeFileSync(file, next); console.log('index.html: ' + (next.match(/modulepreload/g) || []).length + ' modules'); }
}
