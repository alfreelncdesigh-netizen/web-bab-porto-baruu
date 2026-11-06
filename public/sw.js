// ============================================================================
// Service Worker: Alfreelnc Design Portofolio
// Caching: Static Assets, Fonts, Images, and Firestore Data/Snapshots
// Offline Strategy: App Shell Fallback + Stale-While-Revalidate + Cache-First
// ============================================================================

const STATIC_CACHE_NAME = 'portfolio-static-v2';
const IMAGE_CACHE_NAME = 'portfolio-images-v2';
const FIRESTORE_CACHE_NAME = 'portfolio-firestore-snapshots-v2';
const FONT_CACHE_NAME = 'portfolio-fonts-v2';

const CURRENT_CACHES = [
  STATIC_CACHE_NAME,
  IMAGE_CACHE_NAME,
  FIRESTORE_CACHE_NAME,
  FONT_CACHE_NAME
];

// Essential core assets to precache during service worker installation
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/logo-text-hitam.png',
  '/logo-text-putih.png',
  '/logo-text-hitam.svg',
  '/logo-text-putih.svg',
  '/uploads/cover_web_1792581846511.png',
  '/uploads/cover_web_dejwax_1792936005852_d33cf44f.webp',
  '/api/settings',
  '/api/hero-image'
];

// ----------------------------------------------------------------------------
// 1. Install Event: Pre-cache essential static assets & activate worker
// ----------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      // Use Promise.allSettled so individual missing assets do not block SW installation
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response && response.status === 200) {
              await cache.put(assetUrl, response);
            }
          } catch (err) {
            console.warn('[SW] Pre-caching asset skipped:', assetUrl, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------------------------
// 2. Activate Event: Clean up outdated cache versions and claim clients
// ----------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!CURRENT_CACHES.includes(name)) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------------------------
// Request Classifiers
// ----------------------------------------------------------------------------
function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  if (/\.(?:png|jpe?g|webp|svg|gif|avif|ico)(\?.*)?$/i.test(url.pathname)) return true;
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/uploads/')) return true;

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

function isFontRequest(request, url) {
  if (request.destination === 'font') return true;
  if (/\.(?:woff2?|ttf|eot|otf)(\?.*)?$/i.test(url.pathname)) return true;
  const hostname = url.hostname.toLowerCase();
  if (hostname.includes('fonts.googleapis.com') || hostname.includes('fonts.gstatic.com')) {
    return true;
  }
  return false;
}

function isFirestoreOrSnapshotRequest(request, url) {
  const hostname = url.hostname.toLowerCase();
  // Firestore cloud endpoints (REST & gRPC-Web queries)
  if (hostname.includes('firestore.googleapis.com')) return true;

  // Local REST endpoints that provide portfolio/settings snapshots
  const p = url.pathname;
  if (
    p.startsWith('/api/settings') ||
    p.startsWith('/api/hero-image') ||
    p.startsWith('/api/projects') ||
    p.startsWith('/api/blogs') ||
    p.startsWith('/api/experiences') ||
    p.startsWith('/api/orders') ||
    p.startsWith('/api/messages') ||
    p.startsWith('/api/collaborator') ||
    p.startsWith('/api/stats') ||
    p.startsWith('/api/firestore-snapshot/')
  ) {
    return true;
  }
  return false;
}

function isStaticAssetRequest(request, url) {
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    /\.(?:css|js)(\?.*)?$/i.test(url.pathname)
  ) {
    return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// 3. Fetch Event Routing
// ----------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Bypass Vite internal modules & HMR sockets
  if (
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('__vite_ping') ||
    url.pathname.startsWith('/api/upload') ||
    url.pathname.startsWith('/api/auth') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // A. Navigation Requests (App Shell - Network-First with Cache Fallback)
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            cache.put('/', networkResponse.clone());
            return networkResponse;
          }
        } catch {
          // Offline fallback
        }

        const cached = (await caches.match(request)) || (await caches.match('/'));
        if (cached) return cached;

        return new Response(
          '<!doctype html><html><head><meta charset="utf-8"><title>Alfreelnc Portofolio</title></head><body><div id="root">Memuat portofolio offline...</div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // B. Firestore Snapshots & REST Data (Stale-While-Revalidate with Cache Fallback)
  if (isFirestoreOrSnapshotRequest(request, url)) {
    event.respondWith(
      caches.open(FIRESTORE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
              cache.put(request, networkRes.clone());
            }
            return networkRes;
          })
          .catch((fetchErr) => {
            console.warn('[SW] Firestore/API request offline, using cache:', url.pathname, fetchErr);
            if (cachedResponse) return cachedResponse;
            // Return safe offline payload for API endpoints
            return new Response(
              JSON.stringify({ offline: true, error: 'Koneksi offline, menampilkan data lokal.' }),
              { headers: { 'Content-Type': 'application/json' }, status: 200 }
            );
          });

        // Return cached snapshot immediately for 0ms render, update in background
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C. Images & Media (Cache-First Strategy)
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkRes = await fetch(request);
          if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch (err) {
          // Fallback to primary cover image if a cover failed while offline
          if (url.pathname.includes('cover_web')) {
            const fallback = (await cache.match('/uploads/cover_web_1792581846511.png')) ||
                             (await cache.match('/uploads/cover_web_dejwax_1792936005852_d33cf44f.webp'));
            if (fallback) return fallback;
          }
          throw err;
        }
      })
    );
    return;
  }

  // D. Fonts (Cache-First Strategy)
  if (isFontRequest(request, url)) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkRes = await fetch(request);
          if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          return cached;
        }
      })
    );
    return;
  }

  // E. Static Scripts & Stylesheets (Stale-While-Revalidate)
  if (isStaticAssetRequest(request, url)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cache.put(request, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});

// ----------------------------------------------------------------------------
// 4. Message Event: Firestore Realtime Snapshots Sync & Commands
// ----------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Menyimpan snapshot Firestore dari sisi React client langsung ke SW cache
  if (data.type === 'STORE_FIRESTORE_SNAPSHOT' && data.payload) {
    const { collectionName, items, timestamp } = data.payload;
    if (collectionName && items) {
      caches.open(FIRESTORE_CACHE_NAME).then((cache) => {
        const targetUrl = new URL(`/api/firestore-snapshot/${collectionName}`, self.location.origin).href;
        const serialized = JSON.stringify({
          collection: collectionName,
          items,
          cachedAt: timestamp || new Date().toISOString(),
          fromServiceWorker: true
        });
        const response = new Response(serialized, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Firestore-Snapshot-Cache': 'true',
            'Cache-Control': 'public, max-age=604800'
          }
        });
        cache.put(targetUrl, response);
      });
    }
    return;
  }

  // Menyimpan semua aset dan snapshot saat tombol terima cookie ditekan
  if (data.type === 'STORE_ALL_CONTENT_CACHE' && data.payload) {
    self.clients.claim();
    return;
  }

  // Membersihkan semua cache jika pengguna menekan reset data
  if (data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

