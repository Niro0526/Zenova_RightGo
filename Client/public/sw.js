// RightGo Service Worker - App Shell Caching Only
// Version: 1.0.0
// IMPORTANT: This SW caches ONLY static app shell assets.
// All operational/delivery data continues to use IndexedDB via DriverConnectivityContext.
// No live API responses are cached here.

const CACHE_NAME = 'rightgo-app-shell-v1';

// Static app shell assets to cache on install
// These are Next.js static files, fonts, and the offline fallback page
const APP_SHELL_URLS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install: Pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[RightGo SW] Installing, pre-caching app shell...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache what we can; ignore failures for individual assets
      return Promise.allSettled(
        APP_SHELL_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[RightGo SW] Failed to pre-cache:', url, err.message);
          })
        )
      );
    }).then(() => {
      console.log('[RightGo SW] Pre-cache complete. Activating immediately.');
      return self.skipWaiting();
    })
  );
});

// ─── Activate: Clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[RightGo SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[RightGo SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[RightGo SW] Activated. Claiming clients.');
      return self.clients.claim();
    })
  );
});

// ─── Fetch: Network-first with offline fallback ────────────────────────────────
// Strategy:
//   - API calls (/api/*): always network-only. Never cache. If offline, let fail naturally.
//   - Next.js static assets (_next/static/*): cache-first (immutable hashed files).
//   - Navigation requests (HTML pages): network-first, fallback to /offline page.
//   - Fonts/images from CDN: stale-while-revalidate.

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin or known CDN requests
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isMapbox = url.hostname.includes('mapbox.com') || url.hostname.includes('mapbox.cn');

  // 1. Skip non-GET requests entirely
  if (request.method !== 'GET') return;

  // 2. Skip Mapbox tile/API requests entirely — never cache map tiles
  if (isMapbox) return;

  // 3. API routes — always network-only, no caching
  if (isSameOrigin && url.pathname.startsWith('/api/')) return;

  // 4. Next.js static assets — cache-first (they have content hashes)
  if (isSameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 5. Google Fonts — stale-while-revalidate
  if (isGoogleFont) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // 6. Same-origin navigation requests (HTML pages) — network-first, fallback to /offline
  if (isSameOrigin && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of successful navigations
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed — try cached version of this page, then fallback to /offline
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline');
          });
        })
    );
    return;
  }

  // 7. Other same-origin static resources (icons, manifest, images)
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('Not found', { status: 404 }));
      })
    );
  }
});
