// ============================================================================
// Service Worker: Alfreelnc Design Portofolio (Static Assets Only)
// Never caches Firestore requests or dynamic /api/* payloads so all devices stay in sync.
// ============================================================================

const STATIC_CACHE_NAME = 'portfolio-static-v7';
const FONT_CACHE_NAME = 'portfolio-fonts-v7';

const CURRENT_CACHES = [STATIC_CACHE_NAME, FONT_CACHE_NAME];

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/images/hero-albi.png',
  '/logo-text-hitam.png',
  '/logo-text-putih.png',
  '/logo-text-hitam.svg',
  '/logo-text-putih.svg',
  '/assets/aistudio/animasi_logo_cafcdb69.mp4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response && response.status === 200) {
              await cache.put(assetUrl, response);
            }
          } catch {}
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!CURRENT_CACHES.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

function isFontRequest(request, url) {
  if (request.destination === 'font') return true;
  if (/\.(?:woff2?|ttf|eot|otf)(\?.*)?$/i.test(url.pathname)) return true;
  const hostname = url.hostname.toLowerCase();
  return hostname.includes('fonts.googleapis.com') || hostname.includes('fonts.gstatic.com');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  // NEVER intercept API routes, Firestore, Vercel Blob, Vite dev modules, or media ranges
  if (
    request.headers.has('range') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('__vite_ping') ||
    hostname.includes('firestore.googleapis.com') ||
    hostname.includes('firebase') ||
    hostname.includes('vercel-storage.com') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // Fonts: Cache-First
  if (isFontRequest(request, url)) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const networkRes = await fetch(request);
        if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
          cache.put(request, networkRes.clone());
        }
        return networkRes;
      })
    );
  }
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
