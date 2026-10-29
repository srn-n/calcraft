// Offline-first service worker.
// Bump VERSION on every release so old caches (and old hashed assets) are dropped.
const VERSION = 'bouncy-v5.1.0';
const SHELL = './index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', SHELL, './manifest.webmanifest', './icon.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const scopePath = new URL(self.registration.scope).pathname;
const isAppShell = (url) => url.pathname === scopePath || url.pathname === scopePath + 'index.html';
const isHtml = (res) => (res.headers.get('content-type') || '').includes('text/html');
const isHashed = (url) => url.pathname.startsWith(scopePath + 'assets/');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // Network first. Only a successful HTML response for the app itself may replace the cached
    // shell. Before, ANY navigation (a 404, /licenses.txt) overwrote it, so offline the app
    // opened Vercel's 404 page or the licence text instead of the calculator.
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && isHtml(res) && isAppShell(url)) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(SHELL, copy));
      }
      return res;
    }).catch(() => (isAppShell(url) ? caches.match(SHELL) : caches.match(SHELL).then((r) => r || Response.error()))));
    return;
  }

  if (isHashed(url)) {
    // Hashed build assets never change: cache first.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Everything else (manifest, icons, licences): stale-while-revalidate so they don't freeze forever.
  e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
