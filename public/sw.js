// Service Worker for Portfolio Image Caching
// Implements Cache-First strategy for images to optimize load times and save bandwidth.

const CACHE_NAME = 'portfolio-images-cache-v1';
const STATIC_CACHE_NAME = 'portfolio-static-cache-v1';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/logo-text-hitam.png',
  '/logo-text-putih.png'
];

// 1. Install Event: pre-cache essential static assets and activate worker immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: clean up obsolete cache versions and take immediate control
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            console.log('[SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is for an image
function isImageRequest(request, url) {
  // Destination check
  if (request.destination === 'image') return true;

  // Extension check
  if (/\.(?:png|jpe?g|webp|svg|gif|avif|ico)(\?.*)?$/i.test(url.pathname)) return true;

  // Path check for local assets
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/uploads/')) return true;

  // External image CDNs
  const hostname = url.hostname.toLowerCase();
  if (
    hostname.includes('cloudinary.com') ||
    hostname.includes('unsplash.com') ||
    hostname.includes('firebasestorage.googleapis.com') ||
    hostname.includes('googleusercontent.com')
  ) {
    return true;
  }

  return false;
}

// 3. Fetch Event: Cache-First for all images
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Bypass Vite dev server internals & HMR endpoints
  if (
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.includes('vite.svg') ||
    url.pathname.includes('__vite_ping') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Handle Images with Cache-First Strategy
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. Try serving from CacheStorage first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. If not found in cache, fetch from network and store for future visits
        try {
          const networkResponse = await fetch(request);
          
          // Cache successful responses (standard 200 or opaque responses from external CDNs)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            // Clone response since stream can only be consumed once
            cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch (fetchErr) {
          // If offline and not in cache, fallback
          console.warn('[SW] Image fetch failed and not in cache:', request.url, fetchErr);
          throw fetchErr;
        }
      })
    );
    return;
  }

  // Handle Static Assets (Fonts, Favicons, CSS/JS bundles) with Stale-While-Revalidate
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
