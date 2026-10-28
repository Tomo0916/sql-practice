/* Offline support. Pages: network first (so updates show at once), everything else: cache, then refresh in the background.
 * Supabase requests are never cached. Bump VERSION when publishing big changes. */
const VERSION = 'sqlp-next-4';
const CORE = ['./', 'index.html', 'teacher.html', 'config.js', 'css/app.css', 'css/teacher.css', 'vendor/sql-wasm.js', 'vendor/sql-wasm.wasm', 'vendor/codemirror.js',
  'js/student.js', 'js/teacher.js', 'js/engine.js', 'js/lessons.js', 'js/datasets.js', 'js/diagnose.js', 'js/i18n.js', 'js/ui.js', 'js/viz.js', 'js/editor.js', 'js/store.js', 'js/backend.js', 'js/book.js',
  'i18n/ja.js', 'i18n/easy.js', 'i18n/en.js', 'icons/icon.svg', 'icons/icon-192.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
