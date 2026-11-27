/* Offline support and a fast start. App files (pages, js, css, texts): the saved copy first, updated in the background
 * (a page is told when a new version is ready);
 * vendor libraries, icons and fonts: cache first. 
 * Supabase requests are never cached. Bump VERSION when publishing big changes. */
const VERSION = 'sqlp-97';   // fast start: saved copy first, update in the background
const CORE = ['./', 'index.html', 'teacher/', 'config.js', 'css/app.css', 'css/teacher.css', 'vendor/sql-wasm.js', 'vendor/sql-wasm.wasm', 'vendor/codemirror.js',
  'js/student.js', 'js/teacher.js', 'js/engine.js', 'js/lessons.js', 'js/datasets.js', 'js/diagnose.js', 'js/i18n.js', 'js/ui.js', 'js/viz.js', 'js/editor.js', 'js/store.js', 'js/backend.js', 'js/book.js', 'js/timer.js', 'js/analysis-data.js', 'js/analysis-content.js', 'js/analysis-ui.js', 'js/charts.js', 'js/guide.js', 'guide/', 'js/lectures.js', 'js/lectures-a.js', 'js/lectures-b.js', 'js/lectures-c.js', 'js/lectures-d.js', 'js/lecture-kit.js', 'js/lecture-topics.js', 'js/lecture-ui.js', 'js/tables-ui.js', 'js/alt.js', 'js/check.js', 'js/check-ui.js', 'js/quick.js', 'js/mastery.js', 'js/level.js', 'js/basics.js', 'js/clauses.js', 'js/pandas.js', 'js/pyrun.js', 'js/py-ui.js', 'js/py-worker.js', 'js/lectures-py.js', 'js/lectures-py2.js', 'js/lectures-py3.js', 'js/pystats.js', 'js/rank.js', 'js/rank-ui.js', 'js/features.js', 'js/assign.js', 'js/explain.js', 'js/explain-tc.js', 'js/pyerrors.js', 'js/hr.js', 'js/hr-ui.js', 'js/ordgroup.js', 'js/pz.js', 'js/pz-ui.js', 'js/dialects.js', 'js/dialects-data.js', 'js/hero.js', 'js/hero-ui.js',
  'i18n/ja.js', 'i18n/easy.js', 'i18n/en.js', 'icons/icon.svg', 'icons/icon-192.png', 'manifest.webmanifest'];
// cache: 'reload' so a new version never copies stale files from the browser's HTTP cache
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
let refreshing = null;
function refreshAll() {
  if (refreshing) return refreshing;
  refreshing = caches.open(VERSION).then(c => Promise.all(CORE.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => (r.ok ? c.put(u, r) : null)).catch(() => null))))
    .then(() => self.clients.matchAll({ type: 'window' })).then(cs => cs.forEach(c => c.postMessage({ type: 'updated' })))
    .finally(() => { setTimeout(() => { refreshing = null; }, 60000); });
  return refreshing;
}
const put = (req, r) => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;
  if (url.pathname.endsWith('.pdf')) return;   // textbooks: straight from the network
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  // big libraries and fonts rarely change: cache first
  if (!sameOrigin || url.pathname.includes('/vendor/') || url.pathname.includes('/icons/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }
  // pages, app code, styles and texts: the saved copy at once (fast start), and the newest from the network
  // behind it. When a file has changed, every app file is fetched again in the background (so the next start
  // has one whole new version, never a mix) and the open pages are told, so they can offer to reload.
  const net = fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(), tag = x => x && (x.headers.get('etag') || x.headers.get('last-modified') || x.headers.get('content-length'));
      caches.match(req).then(old => { put(req, copy); if (old && tag(old) !== tag(copy)) refreshAll(); }); }
    return r;
  });
  e.respondWith(caches.match(req).then(hit => {
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
  }));
});
