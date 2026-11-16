import { resolveImageUrl } from './imageResolver';

interface CachedDims {
  width: number;
  height: number;
}

const loadedUrls = new Set<string>();
const cachedDimensions = new Map<string, CachedDims>();
const listeners = new Map<string, Set<(dims?: CachedDims) => void>>();

const DIMS_STORAGE_KEY = 'portfolio_image_dims_cache';

// Hydrate known dimensions once from sessionStorage
if (typeof window !== 'undefined') {
  try {
    const raw = sessionStorage.getItem(DIMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [url, dims] of Object.entries(parsed)) {
          if (
            dims &&
            typeof dims === 'object' &&
            Number((dims as any).width) > 0 &&
            Number((dims as any).height) > 0
          ) {
            cachedDimensions.set(url, {
              width: Number((dims as any).width),
              height: Number((dims as any).height),
            });
          }
        }
      }
    }
  } catch {}
}

function persistDimsCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, CachedDims> = {};
    let count = 0;
    for (const [k, v] of cachedDimensions.entries()) {
      obj[k] = v;
      count++;
      if (count >= 120) break;
    }
    sessionStorage.setItem(DIMS_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

export function normalizeCacheKey(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  return resolveImageUrl(url).trim();
}

export function getCachedImageDimensions(url?: string | null): CachedDims | undefined {
  const key = normalizeCacheKey(url);
  if (!key) return undefined;
  return cachedDimensions.get(key);
}

export function markImageLoaded(url?: string | null, width?: number, height?: number): void {
  const key = normalizeCacheKey(url);
  if (!key) return;

  loadedUrls.add(key);

  let dims: CachedDims | undefined = cachedDimensions.get(key);
  if (width && height && width > 0 && height > 0) {
    dims = { width, height };
    cachedDimensions.set(key, dims);
    persistDimsCache();
  }

  const cbs = listeners.get(key);
  if (cbs) {
    cbs.forEach((cb) => {
      try {
        cb(dims);
      } catch {}
    });
  }
}

/**
 * Deteksi sinkron apakah gambar sudah dimuat di cache memori atau cache HTTP browser.
 */
export function isImageAlreadyLoaded(url?: string | null): boolean {
  const key = normalizeCacheKey(url);
  if (!key) return false;
  if (key.startsWith('data:') || key.startsWith('blob:')) return true;
  if (loadedUrls.has(key)) return true;

  if (typeof window !== 'undefined') {
    try {
      const probe = new Image();
      probe.src = key;
      if (probe.complete && probe.naturalWidth > 0) {
        markImageLoaded(key, probe.naturalWidth, probe.naturalHeight);
        return true;
      }
    } catch {}
  }

  return false;
}

export function subscribeImageLoaded(
  url: string | undefined | null,
  callback: (dims?: CachedDims) => void
): () => void {
  const key = normalizeCacheKey(url);
  if (!key) return () => {};
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(callback);
  return () => {
    set?.delete(callback);
    if (set && set.size === 0) {
      listeners.delete(key);
    }
  };
}

/**
 * Pemuatan paralel berkecepatan tinggi dengan antrian berbatas (default concurrency 6)
 * agar gambar karya yang belum dimuat segera diunduh secara prioritas dari atas ke bawah.
 */
export async function preloadPortfolioImagesFast(
  rawUrls: Array<string | undefined | null>,
  concurrency = 6,
  onImageReady?: (resolvedUrl: string, dims?: CachedDims) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  const queue: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawUrls) {
    const key = normalizeCacheKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (isImageAlreadyLoaded(key)) {
      onImageReady?.(key, cachedDimensions.get(key));
      continue;
    }
    queue.push(key);
  }

  if (queue.length === 0) return;

  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const idx = cursor++;
      const url = queue[idx];
      if (!url) continue;

      if (isImageAlreadyLoaded(url)) {
        onImageReady?.(url, cachedDimensions.get(url));
        continue;
      }

      await new Promise<void>((resolve) => {
        const img = new Image();
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve();
        };

        const timer = setTimeout(done, 8000);
        img.decoding = 'async';
        img.onload = () => {
          const nw = img.naturalWidth;
          const nh = img.naturalHeight;
          markImageLoaded(url, nw > 0 ? nw : undefined, nh > 0 ? nh : undefined);
          onImageReady?.(url, nw > 0 && nh > 0 ? { width: nw, height: nh } : undefined);
          done();
        };
        img.onerror = done;
        img.src = url;
      });
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);
}
