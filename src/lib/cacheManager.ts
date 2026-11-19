import {
  getStoredSettings,
  getStoredProjects,
  getStoredBlogs,
  getStoredExperiences,
  fetchSettingsFromBlob,
  fetchProjectsFromBlob,
  fetchExperiencesFromBlob,
  fetchBlogsFromBlob,
} from './contentStorage';
import {
  getStoredQuickFilterItems,
  fetchQuickFilterFromBlob,
} from './quickFilterStorage';
import { resolveImageUrl, getServerMediaCacheUrl, FALLBACK_IMAGE } from './imageResolver';

export const IMAGE_CACHE_NAME = 'portfolio-images-v1';
export const STATIC_CACHE_NAME = 'portfolio-static-v8';
const CACHED_META_STORAGE_KEY = 'alfreelnc_images_cached_meta_v1';

export const STATIC_BRAND_AND_UI_IMAGES: string[] = [
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
  '/logo-text-putih.svg',
  '/favicon.svg',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
];

export interface CacheAllOptions {
  includeAllMenus?: boolean;
  extraUrls?: string[];
  pruneOrphans?: boolean;
  onProgress?: (progress: number, statusText: string) => void;
}

export interface CacheAllResult {
  success: boolean;
  cachedImagesCount: number;
  newlyFetchedCount: number;
  alreadyCachedCount: number;
  failedCount: number;
}

let inFlightCacheRun: Promise<CacheAllResult> | null = null;
const memoryExtraUrls = new Set<string>();

function toCanonicalHttpUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  const resolved = resolveImageUrl(trimmed);
  if (!resolved || resolved === FALLBACK_IMAGE || resolved.startsWith('data:') || resolved.startsWith('blob:')) {
    return null;
  }

  try {
    const parsed = new URL(resolved, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (/\.(?:mp4|webm|mov|avi|pdf|json|html?)$/i.test(parsed.pathname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function isCorsFriendlyHost(parsed: URL): boolean {
  if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return true;
  const host = parsed.hostname.toLowerCase();
  return (
    host.endsWith('.vercel-storage.com') ||
    host.includes('res.cloudinary.com') ||
    host.includes('firebasestorage.googleapis.com') ||
    host.includes('storage.googleapis.com') ||
    host.endsWith('.firebasestorage.app')
  );
}

function isValidImageHttpResponse(response: Response | undefined | null, allowOpaque: boolean): boolean {
  if (!response) return false;
  if (response.type === 'opaque') return allowOpaque;
  if (response.status !== 200) return false;
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/json')) return false;
  return true;
}

export function collectAllWebsiteImageUrls(extraUrls: string[] = []): string[] {
  if (typeof window === 'undefined') return [];

  const urlSet = new Set<string>();
  const addUrl = (candidate?: string | null) => {
    const canonical = toCanonicalHttpUrl(candidate);
    if (canonical) urlSet.add(canonical);
  };

  STATIC_BRAND_AND_UI_IMAGES.forEach(addUrl);
  memoryExtraUrls.forEach(addUrl);
  extraUrls.forEach((u) => {
    if (typeof u === 'string' && u.trim()) {
      memoryExtraUrls.add(u.trim());
      addUrl(u);
    }
  });

  const settings = getStoredSettings();
  addUrl(settings.heroImage);
  addUrl(settings.aboutImage);
  addUrl(settings.promoWidgetImage);
  settings.heroBanners?.forEach((b: any) => addUrl(b?.image));
  settings.promoPosters?.forEach((p: any) => addUrl(p?.image));
  settings.cvSections?.forEach((s: any) => {
    if (Array.isArray(s?.images)) s.images.forEach((img: any) => addUrl(img));
    if (s?.image) addUrl(s.image);
  });
  if (settings.collaboration?.partnerLogo) {
    addUrl(settings.collaboration.partnerLogo);
  }
  settings.collaboration?.collaboratorAccounts?.forEach((acc: any) => {
    addUrl(acc?.partnerLogo);
  });

  getStoredProjects().forEach((p: any) => {
    addUrl(p?.image);
    if (Array.isArray(p?.images)) p.images.forEach((img: any) => addUrl(img));
    if (p?.collaborationLogo) addUrl(p.collaborationLogo);
  });

  getStoredExperiences().forEach((exp: any) => {
    addUrl(exp?.image);
    if (Array.isArray(exp?.images)) exp.images.forEach((img: any) => addUrl(img));
    if (exp?.collaborationLogo) addUrl(exp.collaborationLogo);
  });

  getStoredBlogs().forEach((b: any) => {
    addUrl(b?.image);
    addUrl(b?.coverImage);
    if (Array.isArray(b?.images)) b.images.forEach((img: any) => addUrl(img));
    if (b?.collaborationLogo) addUrl(b.collaborationLogo);
  });

  getStoredQuickFilterItems().forEach((q: any) => {
    if (Array.isArray(q?.images)) q.images.forEach((img: any) => addUrl(img));
    if ((q as any)?.image) addUrl((q as any).image);
  });

  return Array.from(urlSet);
}

async function isAlreadyInBrowserCache(
  imageCache: Cache,
  staticCache: Cache | null,
  url: string
): Promise<boolean> {
  const inImg = await imageCache.match(url, { ignoreVary: true });
  if (isValidImageHttpResponse(inImg, false)) return true;

  if (staticCache) {
    const parsed = new URL(url);
    const inStatic =
      (await staticCache.match(url, { ignoreVary: true })) ||
      (parsed.origin === window.location.origin
        ? await staticCache.match(parsed.pathname, { ignoreVary: true })
        : undefined);
    if (isValidImageHttpResponse(inStatic, false)) return true;
  }

  return false;
}

async function fetchAndStoreSingleImage(imageCache: Cache, url: string): Promise<boolean> {
  const parsed = new URL(url);
  const isExternalRemote = parsed.origin !== window.location.origin && isCorsFriendlyHost(parsed);

  // Untuk URL storage eksternal (mis. Vercel Blob), muat melalui /api/media-cache terlebih dahulu
  // agar Server Cache Website (Edge CDN + Memory + /tmp + Firestore) DAN Browser Cache terisi bersamaan.
  if (isExternalRemote) {
    const serverProxyUrl = getServerMediaCacheUrl(url);
    if (serverProxyUrl) {
      try {
        const proxyRes = await fetch(serverProxyUrl, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'default',
        });
        if (isValidImageHttpResponse(proxyRes, false)) {
          await imageCache.put(url, proxyRes.clone());
          return true;
        }
      } catch {
        // Fall through to direct fetch
      }
    }
  }

  if (isCorsFriendlyHost(parsed)) {
    try {
      const corsRes = await fetch(url, {
        method: 'GET',
        mode: parsed.origin === window.location.origin ? 'same-origin' : 'cors',
        credentials: parsed.origin === window.location.origin ? 'same-origin' : 'omit',
      });
      if (isValidImageHttpResponse(corsRes, false)) {
        await imageCache.put(url, corsRes.clone());
        return true;
      }
    } catch {
      // Fall through to no-cors only if non-same-origin
    }
  }

  if (parsed.origin !== window.location.origin) {
    try {
      const opaqueRes = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit',
      });
      if (isValidImageHttpResponse(opaqueRes, true)) {
        await imageCache.put(url, opaqueRes.clone());
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

export async function cacheUploadedBlobInBrowser(
  rawUrl: string,
  blob: Blob,
  mimeType?: string
): Promise<void> {
  if (typeof window === 'undefined' || !rawUrl || !blob || blob.size <= 0) return;

  const canonicalUrl = toCanonicalHttpUrl(rawUrl);
  if (!canonicalUrl) return;

  try {
    memoryExtraUrls.add(canonicalUrl);
    if ('caches' in window) {
      const imageCache = await caches.open(IMAGE_CACHE_NAME);
      const resolvedMime = (mimeType || blob.type || 'image/webp').split(';')[0].trim() || 'image/webp';
      const syntheticResponse = new Response(blob, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': resolvedMime,
          'Content-Length': String(blob.size),
          'Cache-Control': 'public, max-age=31536000',
        },
      });
      await imageCache.put(canonicalUrl, syntheticResponse);
    }

    notifyServiceWorkerPrecache([canonicalUrl]);

    // Hangatkan Vercel Edge CDN secara paralel agar pengunjung lain langsung mendapat cache tercepat
    const parsed = new URL(canonicalUrl);
    if (parsed.origin !== window.location.origin && isCorsFriendlyHost(parsed)) {
      const proxyUrl = getServerMediaCacheUrl(canonicalUrl);
      if (proxyUrl) {
        fetch(proxyUrl, { method: 'GET', credentials: 'same-origin', cache: 'default' }).catch(() => {});
      }
    }
  } catch {
    // Non-blocking browser cache hydration error
  }
}

async function runImagePreloadFallback(urls: string[]): Promise<number> {
  let okCount = 0;
  await Promise.allSettled(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const timer = setTimeout(resolve, 4000);
          img.onload = () => {
            clearTimeout(timer);
            okCount++;
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timer);
            resolve();
          };
          img.src = url;
        })
    )
  );
  return okCount;
}

function notifyServiceWorkerPrecache(urls: string[]): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || urls.length === 0) {
    return;
  }
  try {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PRECACHE_IMAGES',
        urls,
      });
    } else {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage({
            type: 'PRECACHE_IMAGES',
            urls,
          });
        })
        .catch(() => {});
    }
  } catch {}
}

/**
 * Menyimpan cache seluruh gambar website (logo, hero, banner, portofolio + galeri,
 * pengalaman + logo mitra, CV, poster promo, blog, & insight) ke Browser Cache Storage
 * agar kunjungan berikutnya pada browser & perangkat yang sama tampil 100% dari cache
 * tanpa memakan data transfer Vercel Blob.
 */
export async function cacheAllWebsiteContent(
  onProgressOrOptions?: ((progress: number, statusText: string) => void) | CacheAllOptions
): Promise<CacheAllResult> {
  if (typeof window === 'undefined') {
    return {
      success: true,
      cachedImagesCount: 0,
      newlyFetchedCount: 0,
      alreadyCachedCount: 0,
      failedCount: 0,
    };
  }

  if (inFlightCacheRun) {
    return inFlightCacheRun;
  }

  const options: CacheAllOptions =
    typeof onProgressOrOptions === 'function'
      ? { onProgress: onProgressOrOptions }
      : onProgressOrOptions || {};

  const {
    includeAllMenus = true,
    extraUrls = [],
    pruneOrphans = false,
    onProgress,
  } = options;

  inFlightCacheRun = (async () => {
    try {
      onProgress?.(10, 'Mengumpulkan daftar gambar dari seluruh menu...');

      let allMenusHydratedCleanly = false;
      if (includeAllMenus) {
        const menuTasks = [
          fetchSettingsFromBlob(),
          fetchProjectsFromBlob(),
          fetchExperiencesFromBlob(),
          fetchBlogsFromBlob(),
          fetchQuickFilterFromBlob(),
        ];
        const results = await Promise.allSettled(menuTasks);
        allMenusHydratedCleanly = results.every((r) => r.status === 'fulfilled');
      }

      const allUrls = collectAllWebsiteImageUrls(extraUrls);
      if (allUrls.length === 0) {
        onProgress?.(100, 'Selesai!');
        return {
          success: true,
          cachedImagesCount: 0,
          newlyFetchedCount: 0,
          alreadyCachedCount: 0,
          failedCount: 0,
        };
      }

      onProgress?.(30, `Menyimpan ${allUrls.length} gambar ke cache browser...`);

      // Fallback when Cache API is unavailable (e.g. restricted insecure context)
      if (!('caches' in window)) {
        const loaded = await runImagePreloadFallback(allUrls);
        onProgress?.(100, 'Selesai!');
        return {
          success: true,
          cachedImagesCount: loaded,
          newlyFetchedCount: loaded,
          alreadyCachedCount: 0,
          failedCount: Math.max(0, allUrls.length - loaded),
        };
      }

      const imageCache = await caches.open(IMAGE_CACHE_NAME);
      const staticCache = await caches.open(STATIC_CACHE_NAME).catch(() => null);

      let alreadyCachedCount = 0;
      let newlyFetchedCount = 0;
      let failedCount = 0;
      let processed = 0;

      const missingUrls: string[] = [];

      for (const url of allUrls) {
        try {
          const exists = await isAlreadyInBrowserCache(imageCache, staticCache, url);
          if (exists) {
            alreadyCachedCount++;
            processed++;
          } else {
            missingUrls.push(url);
          }
        } catch {
          missingUrls.push(url);
        }
      }

      if (missingUrls.length > 0) {
        const concurrency = 4;
        let cursor = 0;

        const worker = async () => {
          while (cursor < missingUrls.length) {
            const idx = cursor++;
            const url = missingUrls[idx];
            if (!url) continue;

            const ok = await fetchAndStoreSingleImage(imageCache, url);
            if (ok) {
              newlyFetchedCount++;
            } else {
              failedCount++;
            }

            processed++;
            const pct = Math.min(95, 30 + Math.round((processed / allUrls.length) * 65));
            onProgress?.(pct, `Menyimpan cache gambar (${processed}/${allUrls.length})...`);
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(concurrency, missingUrls.length) }, () => worker())
        );
      }

      // Notify active SW in case any static/image slots still need alignment
      notifyServiceWorkerPrecache(allUrls);

      // Optional safe orphan cleanup for deleted Vercel Blob images only when all menus loaded cleanly
      if (pruneOrphans && allMenusHydratedCleanly) {
        try {
          const activeSet = new Set(allUrls);
          const keys = await imageCache.keys();
          await Promise.all(
            keys.map(async (req) => {
              try {
                const parsed = new URL(req.url);
                const isVercelBlob = parsed.hostname.toLowerCase().endsWith('.vercel-storage.com');
                const isServerCacheUrl = parsed.pathname === '/api/media-cache';
                if ((isVercelBlob || isServerCacheUrl) && !activeSet.has(parsed.href)) {
                  await imageCache.delete(req);
                }
              } catch {}
            })
          );
        } catch {}
      }

      const cachedImagesCount = alreadyCachedCount + newlyFetchedCount;

      try {
        localStorage.setItem(
          CACHED_META_STORAGE_KEY,
          JSON.stringify({
            cachedImagesCount,
            totalDiscovered: allUrls.length,
            updatedAt: Date.now(),
          })
        );
      } catch {}

      onProgress?.(100, 'Semua gambar tersimpan di cache browser!');

      return {
        success: true,
        cachedImagesCount,
        newlyFetchedCount,
        alreadyCachedCount,
        failedCount,
      };
    } catch (err) {
      console.warn('[CacheManager] Gagal menyimpan cache gambar:', err);
      return {
        success: false,
        cachedImagesCount: 0,
        newlyFetchedCount: 0,
        alreadyCachedCount: 0,
        failedCount: 0,
      };
    } finally {
      inFlightCacheRun = null;
    }
  })();

  return inFlightCacheRun;
}

export function isWebsiteContentCached(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CACHED_META_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Number(parsed?.cachedImagesCount) > 0;
  } catch {
    return false;
  }
}

export async function getBrowserImageCacheCount(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const [imgCache, staticCache] = await Promise.all([
      caches.open(IMAGE_CACHE_NAME),
      caches.open(STATIC_CACHE_NAME),
    ]);
    const [imgKeys, staticKeys] = await Promise.all([
      imgCache.keys(),
      staticCache.keys(),
    ]);
    return new Set([...imgKeys.map((k) => k.url), ...staticKeys.map((k) => k.url)]).size;
  } catch {
    return 0;
  }
}
