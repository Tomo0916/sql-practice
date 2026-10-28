// Print out/<name>.html to PDF and report the pages each Lesson uses.
//   node render.mjs [beginner]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || 'beginner';
const html = path.join(here, 'out', name + '.html'), pdf = path.join(here, 'out', name + '.pdf');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Math.round((210 - 26) / 25.4 * 96), height: 1100 } });   // the printed width (A4 minus margins)
await p.goto('file://' + html);
await p.waitForTimeout(800);
await p.emulateMedia({ media: 'print' });
// each lesson: put its sections on two pages at the split that balances them best, then
// scale a page's content down only if it is still taller than the page
const fits = await p.evaluate(() => {
  // the real bottom of the content (what is visible), with a small safety margin
  const bottom = (h, f) => Math.max(0, ...[...f.children].map(e => e.getBoundingClientRect().bottom)) - h.getBoundingClientRect().top;
  const fit = (h, f) => {
    let z = 1;
    f.style.zoom = '';
    while (bottom(h, f) > h.clientHeight - 6 && z > 0.7) { z = Math.round((z - 0.01) * 100) / 100; f.style.zoom = z; }
    return z;
  };
  const out = [];
  for (const lesson of document.querySelectorAll('.lesson')) {
    const [h1, h2] = lesson.querySelectorAll('.half');
    const f1 = h1.querySelector('.fit'), f2 = h2.querySelector('.fit');
    const items = [...f1.children, ...f2.children];
    const limit = h1.clientHeight;
    const gap = 2.2 * 96 / 25.4;
    const hs = items.map(e => e.getBoundingClientRect().height);
    const fixed = items.findIndex(e => e.matches('section') && !e.matches('.see') && e.previousElementSibling && e.previousElementSibling.matches('.see'));
    let best = null;
    for (let k = 1; k < items.length; k++) {
      if (items[k - 1].matches('.marker')) continue;
      if (items.slice(0, k).some(e => e.matches('.box.try'))) continue;          // practice always on page 2
      const a = hs.slice(0, k).reduce((x, y) => x + y + gap, 0), b = hs.slice(k).reduce((x, y) => x + y + gap, 0);
      const score = Math.max(a, b);
      if (!best || score < best.score - 1 || (Math.abs(score - best.score) <= 1 && k === fixed)) best = { k, score };
    }
    items.forEach((e, i) => (i < best.k ? f1 : f2).appendChild(e));
    for (const [h, f] of [[h1, f1], [h2, f2]]) {
      const z = fit(h, f);
      out.push({ lesson: lesson.id, half: h === h1 ? 1 : 2, z });
    }
  }
  for (const h of document.querySelectorAll('.fpage')) {
    const z = fit(h, h.querySelector('.fit'));
    out.push({ lesson: 'front', half: [...document.querySelectorAll('.fpage')].indexOf(h) + 1, z });
  }
  return out;
});
const shrunk = fits.filter(f => f.z < 1);
if (shrunk.length) console.log('scaled pages:', shrunk.map(f => `${f.lesson}/${f.half}:${f.z}`).join(' '));
await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
await b.close();
console.log('✓', path.relative(here, pdf));
