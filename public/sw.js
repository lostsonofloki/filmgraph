const APP_SHELL_CACHE = 'filmgraph-shell-v2';
const API_CACHE = 'filmgraph-api-v2';
const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.json'];
const OFFLINE_FALLBACK_RESPONSE = new Response('Offline', {
  status: 503,
  statusText: 'Offline',
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        } catch (_error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          const appShell = await caches.match('/index.html');
          return appShell || OFFLINE_FALLBACK_RESPONSE;
        }
      })());
      return;
    }

    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const responseClone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, responseClone));
        }
        return response;
      } catch (_error) {
        return OFFLINE_FALLBACK_RESPONSE;
      }
    })());
    return;
  }

  if (url.hostname.includes('themoviedb.org') || url.hostname.includes('omdbapi.com')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (_error) {
          const cached = await cache.match(request);
          return cached || new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
  }
});
