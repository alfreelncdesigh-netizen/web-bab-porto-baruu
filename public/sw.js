// ============================================================================
// Service Worker: Alfreelnc Design Portofolio (Persistent Browser Image & Static Cache)
// - Caches ALL logos, icons, static UI images, fonts, and Vercel Blob / CDN images
//   in persistent Browser Cache Storage (Cache-First).
// - Subsequent visits on the same browser & device serve images 100% from local
//   cache with ZERO data transfer from Vercel Blob.
// - Never caches dynamic /api/* JSON payloads or Firestore requests so data stays live.
// ============================================================================

const STATIC_CACHE_NAME = 'portfolio-static-v8';
const IMAGE_CACHE_NAME = 'portfolio-images-v1';
const FONT_CACHE_NAME = 'portfolio-fonts-v8';

const CURRENT_CACHES = [STATIC_CACHE_NAME, IMAGE_CACHE_NAME, FONT_CACHE_NAME];

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
  '/assets/aistudio/logo_text_hitam_b7dab56d.png',
  '/assets/aistudio/logo_text_putih_60d2d29e.png',
  '/images/hero-albi.png',
  '/images/hero-albi-og.jpg',
  '/images/banner_promo_bca_1788696791480.jpg',
  '/images/banner_promo_crea_1788696808849.jpg',
  '/images/promo_poster_1789471291192.jpg',
  '/images/minimalist_3d_illustration_1787122966121.jpg',
  '/images/editing_tools_3d_1787123977793.jpg',
  '/images/logo-text-hitam.png',
  '/images/logo-text-putih.png',
  '/logo-text-hitam.png',
  '/logo-text-putih.png',
  '/logo-text-hitam.svg',
  '/logo-text-putih.svg'
];

const IMAGE_EXT_REGEX = /\.(?:png|jpe?g|webp|svg|gif|avif|ico|bmp)$/i;

function isCorsFriendlyImageHost(url) {
  if (url.origin === self.location.origin) return true;
  const host = url.hostname.toLowerCase();
  return (
    host.endsWith('.vercel-storage.com') ||
    host.includes('res.cloudinary.com') ||
    host.includes('firebasestorage.googleapis.com') ||
    host.includes('storage.googleapis.com') ||
    host.endsWith('.firebasestorage.app')
  );
}

function isValidImageResponse(response, allowOpaque) {
  if (!response) return false;
  if (response.type === 'opaque') {
    return Boolean(allowOpaque);
  }
  if (response.status !== 200) return false;
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  // Never cache SPA HTML fallback or JSON errors as images
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    return false;
  }
  return true;
}

function isFontRequest(request, url) {
  if (request.destination === 'font') return true;
  if (/\.(?:woff2?|ttf|eot|otf)(\?.*)?$/i.test(url.pathname)) return true;
  const hostname = url.hostname.toLowerCase();
  return hostname.includes('fonts.googleapis.com') || hostname.includes('fonts.gstatic.com');
}

function isImageRequest(request, url) {
  if (url.pathname.startsWith('/api/')) return false;
  if (/\.(?:mp4|webm|mov|avi|json|html?|js|css|map|pdf)$/i.test(url.pathname)) return false;
  if (request.destination === 'image') return true;
  if (IMAGE_EXT_REGEX.test(url.pathname)) return true;
  const hostname = url.hostname.toLowerCase();
  if (hostname.endsWith('.vercel-storage.com')) {
    return true;
  }
  return false;
}

async function fetchAndCacheImage(cache, canonicalUrl, originalRequest) {
  let response = null;

  if (isCorsFriendlyImageHost(new URL(canonicalUrl))) {
    try {
      const corsReq = new Request(canonicalUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });
      const corsRes = await fetch(corsReq);
      if (isValidImageResponse(corsRes, false)) {
        await cache.put(canonicalUrl, corsRes.clone());
        return corsRes;
      }
      response = corsRes;
    } catch {
      // Fallback to original request below
    }
  }

  if (originalRequest) {
    try {
      const fallbackRes = await fetch(originalRequest);
      if (isValidImageResponse(fallbackRes, true)) {
        await cache.put(canonicalUrl, fallbackRes.clone());
      }
      return fallbackRes;
    } catch (err) {
      if (response) return response;
      throw err;
    }
  }

  if (response) return response;

  const finalRes = await fetch(canonicalUrl, { mode: 'no-cors', credentials: 'omit' });
  if (isValidImageResponse(finalRes, true)) {
    await cache.put(canonicalUrl, finalRes.clone());
  }
  return finalRes;
}

async function handleImageRequest(request, url) {
  const canonicalUrl = url.href;
  const imageCache = await caches.open(IMAGE_CACHE_NAME);

  let cached =
    (await imageCache.match(request, { ignoreVary: true })) ||
    (await imageCache.match(canonicalUrl, { ignoreVary: true }));

  if (!cached) {
    const staticCache = await caches.open(STATIC_CACHE_NAME);
    cached =
      (await staticCache.match(request, { ignoreVary: true })) ||
      (await staticCache.match(canonicalUrl, { ignoreVary: true })) ||
      (url.origin === self.location.origin
        ? await staticCache.match(url.pathname, { ignoreVary: true })
        : undefined);
  }

  if (cached && isValidImageResponse(cached, true)) {
    // Do not satisfy a CORS request with an opaque response; upgrade to CORS instead
    if (!(request.mode === 'cors' && cached.type === 'opaque')) {
      return cached;
    }
  }

  try {
    return await fetchAndCacheImage(imageCache, canonicalUrl, request);
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function precacheImageUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  const imageCache = await caches.open(IMAGE_CACHE_NAME);
  const staticCache = await caches.open(STATIC_CACHE_NAME);

  const uniqueUrls = Array.from(
    new Set(
      urls
        .filter((u) => typeof u === 'string' && u.trim().length > 0)
        .map((u) => {
          try {
            return new URL(u.trim(), self.location.origin).href;
          } catch {
            return '';
          }
        })
        .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
    )
  );

  const concurrency = 4;
  let cursor = 0;

  const worker = async () => {
    while (cursor < uniqueUrls.length) {
      const idx = cursor++;
      const targetUrl = uniqueUrls[idx];
      if (!targetUrl) continue;

      try {
        const parsed = new URL(targetUrl);
        const alreadyInImage = await imageCache.match(targetUrl, { ignoreVary: true });
        if (alreadyInImage && isValidImageResponse(alreadyInImage, false)) {
          continue;
        }
        const alreadyInStatic =
          (await staticCache.match(targetUrl, { ignoreVary: true })) ||
          (parsed.origin === self.location.origin
            ? await staticCache.match(parsed.pathname, { ignoreVary: true })
            : undefined);
        if (alreadyInStatic && isValidImageResponse(alreadyInStatic, false)) {
          continue;
        }

        await fetchAndCacheImage(imageCache, targetUrl, null);
      } catch {
        // Ignore individual precache failures so remaining images continue
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, () => worker())
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled(
          PRECACHE_ASSETS.map(async (assetUrl) => {
            try {
              const existing = await cache.match(assetUrl, { ignoreVary: true });
              if (existing && isValidImageResponse(existing, false)) return;
              const response = await fetch(assetUrl, { cache: 'default' });
              if (response && response.status === 200) {
                const ct = (response.headers.get('content-type') || '').toLowerCase();
                if (!ct.includes('text/html')) {
                  await cache.put(assetUrl, response);
                }
              }
            } catch {}
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!CURRENT_CACHES.includes(name)) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const hostname = url.hostname.toLowerCase();

  // NEVER intercept API routes, Firestore/Auth endpoints, Vite dev modules, videos, or range requests
  if (
    request.headers.has('range') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('__vite_ping') ||
    hostname.includes('firestore.googleapis.com') ||
    hostname.includes('firebaseio.com') ||
    hostname.includes('identitytoolkit.googleapis.com') ||
    hostname.includes('securetoken.googleapis.com') ||
    hostname.includes('accounts.google.com') ||
    url.searchParams.has('t') ||
    url.searchParams.has('nocache')
  ) {
    return;
  }

  // 1. All Images & Logos (same-origin /images, /uploads, /assets, icons + Vercel Blob + CDNs): Cache-First
  if (isImageRequest(request, url)) {
    event.respondWith(handleImageRequest(request, url));
    return;
  }

  // 2. Fonts: Cache-First
  if (isFontRequest(request, url)) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request, { ignoreVary: true });
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

  if (data.type === 'PRECACHE_IMAGES' && Array.isArray(data.urls)) {
    event.waitUntil(precacheImageUrls(data.urls));
    return;
  }

  if (data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
