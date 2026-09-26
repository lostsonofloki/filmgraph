const APP_SHELL_CACHE = 'filmgraph-shell-v2';
const API_CACHE = 'filmgraph-api-v2';
const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.json'];

// Exact hosts, never a substring test: `hostname.includes('themoviedb.org')` also matched
// hostnames like `themoviedb.org.attacker.example`, which would have let an unrelated origin
// write into the cache the app reads its metadata back from.
const METADATA_API_HOSTS = new Set([
  'api.themoviedb.org',
  'www.themoviedb.org',
  'www.omdbapi.com',
  'omdbapi.com',
]);

// Built per call: a Response body can only be consumed once, so handing the same instance to
// two `respondWith()` calls would fail on the second one.
const offlineResponse = () =>
  new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

const offlineJsonResponse = () =>
  new Response(JSON.stringify({ offline: true }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });

// Cache Storage rejects a put outright once the origin is over quota, and a rejection there has
// no bearing on the response the page already holds, so it is swallowed rather than left to
// surface as an unhandled rejection. Callers hand the returned promise to `event.waitUntil()`
// so the write is not cut short when the worker is terminated.
const putInCache = (cacheName, request, response) =>
  caches
    .open(cacheName)
    .then((cache) => cache.put(request, response))
    .catch(() => {});

// 206 (range) and opaque (status 0) responses make `cache.put` reject, and a redirect is not
// worth persisting, so only a plain 200 is stored.
const isCacheable = (response) => Boolean(response) && response.status === 200;

const openCache = (cacheName) => caches.open(cacheName).catch(() => null);

const matchInCache = async (cacheName, ...requests) => {
  const cache = await openCache(cacheName);
  if (!cache) return undefined;

  for (const request of requests) {
    const match = await cache.match(request);
    if (match) return match;
  }
  return undefined;
};

/** Resolves to the network Response, or `null` when the network is unreachable. Never rejects. */
const fetchAndCache = async (request, cacheName) => {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await putInCache(cacheName, request, response.clone());
    }
    return response;
  } catch {
    return null;
  }
};

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
    // Serverless responses own their own freshness. `/api/upc-lookup?upc=...` is a same-origin
    // GET, so caching it here pinned a barcode lookup to the device for as long as the cache
    // version stayed put and made the proxy's 14-day server-side TTL unreachable.
    if (url.pathname.startsWith('/api/')) return;

    // Navigation stays network-first: index.html must be fresh or the app boots against asset
    // URLs that no longer exist. The cached shell is only reached when the network is gone.
    if (request.mode === 'navigate') {
      const navigation = fetchAndCache(request, APP_SHELL_CACHE);
      event.waitUntil(navigation);
      event.respondWith(
        navigation.then(
          async (response) =>
            response ||
            (await matchInCache(APP_SHELL_CACHE, request, '/index.html')) ||
            offlineResponse()
        )
      );
      return;
    }

    // Stale-while-revalidate for everything else the shell needs. The previous branch was
    // cache-first with no TTL and no size bound, so an asset written once was served until the
    // cache version changed. Offline behaviour is unchanged: a cached copy is still answered
    // without waiting on the network, and a failed revalidation is a no-op.
    const revalidation = fetchAndCache(request, APP_SHELL_CACHE);
    event.waitUntil(revalidation);
    event.respondWith(
      (async () => {
        const cached = await matchInCache(APP_SHELL_CACHE, request);
        if (cached) return cached;
        return (await revalidation) || offlineResponse();
      })()
    );
    return;
  }

  if (METADATA_API_HOSTS.has(url.hostname)) {
    const lookup = fetchAndCache(request, API_CACHE);
    event.waitUntil(lookup);
    event.respondWith(
      lookup.then(
        async (response) =>
          response || (await matchInCache(API_CACHE, request)) || offlineJsonResponse()
      )
    );
  }
});
