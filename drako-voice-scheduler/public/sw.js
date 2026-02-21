// DRAKO Service Worker — auto-update on deploy
const CACHE = 'drako-v4';
const STATIC = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

// Install: cache static assets
self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});

// Activate: wipe old caches, claim all clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - /api/*  → network-first (always fresh schedule data)
// - images  → cache-first
// - pages   → network-first with cache fallback
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, cross-origin, chrome-extension
  if (e.request.method !== 'GET' || !url.origin.includes(self.location.origin)) return;

  // API: always network
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Pages + assets: network-first, cache fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// Force update when triggered by PWAUpdater
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
