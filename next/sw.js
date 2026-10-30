/* Offline support. App files (pages, js, css, texts): network first, so an update shows at once;
 * vendor libraries, icons and fonts: cache first. 
 * Supabase requests are never cached. Bump VERSION when publishing big changes. */
const VERSION = 'sqlp-next-11';
const CORE = ['./', 'index.html', 'teacher.html', 'config.js', 'css/app.css', 'css/teacher.css', 'vendor/sql-wasm.js', 'vendor/sql-wasm.wasm', 'vendor/codemirror.js',
  'js/student.js', 'js/teacher.js', 'js/engine.js', 'js/lessons.js', 'js/datasets.js', 'js/diagnose.js', 'js/i18n.js', 'js/ui.js', 'js/viz.js', 'js/editor.js', 'js/store.js', 'js/backend.js', 'js/book.js', 'js/timer.js', 'js/analysis-data.js', 'js/analysis-content.js', 'js/analysis-ui.js', 'js/charts.js', 'js/guide.js', 'guide.html',
  'i18n/ja.js', 'i18n/easy.js', 'i18n/en.js', 'icons/icon.svg', 'icons/icon-192.png', 'manifest.webmanifest'];
// cache: 'reload' so a new version never copies stale files from the browser's HTTP cache
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const put = (req, r) => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  // big libraries and fonts rarely change: cache first
  if (!sameOrigin || url.pathname.includes('/vendor/') || url.pathname.includes('/icons/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }
  // pages, app code, styles and texts: always the newest when online, cached copy when offline
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => put(req, r))
    .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
