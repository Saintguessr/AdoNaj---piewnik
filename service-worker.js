const CACHE_NAME = 'spiewnik-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-190.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always fetch the freshest version when online (this is
// what index.html itself needs, since ALL app logic and song data lives
// there - a cache-first strategy previously meant new deploys could go
// completely unnoticed by already-installed devices). Falls back to the
// last cached copy only when the network request actually fails
// (genuinely offline use).
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
