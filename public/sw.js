// Kauā Fragrances service worker — enables install + basic offline.
// Only same-origin GETs are handled; Firebase/Google/font requests pass through
// untouched so realtime data and auth are never cached.
const CACHE = 'kaua-v1';
const CORE = [
  '/', '/index.html', '/manifest.webmanifest',
  '/logo-mark.png', '/logo-lockup.png',
  '/icon-192.png', '/icon-512.png',
  '/placeholder-men.jpg', '/placeholder-women.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Firebase/fonts/etc.

  // SPA navigations: try network, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        caches.open(CACHE).then((c) => c.put('/', res.clone())).catch(() => {});
        return res;
      }).catch(() => caches.match('/').then((r) => r || caches.match('/index.html'))),
    );
    return;
  }

  // Static assets: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
