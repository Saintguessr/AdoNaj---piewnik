const CACHE_NAME = 'spiewnik-cache-v4';
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

// Network-first for our OWN app files only (falls back to the cached copy
// when actually offline). Every other request - anything cross-origin
// (Firebase Auth, Firestore's realtime channel, etc.) or non-GET - is left
// completely untouched and passed straight through to the network as if
// this service worker didn't exist. Two concrete reasons this matters:
//   1) The Cache API only supports GET requests; Firestore's realtime
//      "Listen" channel and Firebase Auth calls use POST, so trying to
//      cache.put() them throws and corrupts that request/response cycle.
//   2) Firebase's long-lived streaming connection cannot be meaningfully
//      proxied through a service worker fetch handler at all - intercepting
//      it breaks the realtime sync connection outright, which then retries
//      in a loop and can make the whole page feel sluggish/unresponsive.
self.addEventListener('fetch', event => {
  const req = event.request;
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) {}
  if (req.method !== 'GET' || !sameOrigin) {
    return; // do not call respondWith - let the browser handle it normally
  }
  event.respondWith(
    fetch(req)
      .then(resp => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
        return resp;
      })
      .catch(() => caches.match(req))
  );
});
