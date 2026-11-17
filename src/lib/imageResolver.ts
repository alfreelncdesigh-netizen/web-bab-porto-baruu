import { getOptimizedImageUrl } from './cloudinary';

export function createLoadingSvgPlaceholder(text: string = 'Memuat gambar...'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="loadBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="50%" stop-color="#111114"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="loadLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#loadBg)"/>
  <g transform="translate(400, 240) scale(1.65)" opacity="0.2">
    <circle cx="0" cy="0" r="70" fill="url(#loadLogoGrad)"/>
    <circle cx="0" cy="0" r="42" fill="#18181b"/>
    <text x="0" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">AL</text>
    <circle cx="-28" cy="-12" r="5" fill="#a855f7"/>
    <circle cx="28" cy="12" r="5" fill="#3b82f6"/>
  </g>
  <text x="400" y="405" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="17" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="0.4">${text}</text>
  <rect x="350" y="425" width="100" height="3" rx="1.5" fill="#6366f1" opacity="0.4"/>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createDynamicSvgPlaceholder(title: string = 'Alfreelnc Design', subtitle: string = 'Portofolio Desain Grafis'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="50%" stop-color="#121215"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="cardLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#cardBg)"/>
  <g transform="translate(400, 235) scale(1.75)" opacity="0.2">
    <circle cx="0" cy="0" r="70" fill="url(#cardLogoGrad)"/>
    <circle cx="0" cy="0" r="42" fill="#18181b"/>
    <text x="0" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">AL</text>
    <circle cx="-28" cy="-12" r="5" fill="#a855f7"/>
    <circle cx="28" cy="12" r="5" fill="#3b82f6"/>
  </g>
  <text x="400" y="395" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="20" font-weight="700" fill="#e4e4e7" text-anchor="middle" letter-spacing="0.8">${title}</text>
  <text x="400" y="425" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="13" font-weight="500" fill="#71717a" text-anchor="middle" letter-spacing="0.5">${subtitle}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const LOADING_IMAGE = createLoadingSvgPlaceholder('Memuat gambar...');
export const FALLBACK_IMAGE = createDynamicSvgPlaceholder('Alfreelnc Design', 'Portofolio Desain Grafis');
export const FALLBACK_BLOG_IMAGE = FALLBACK_IMAGE;

const AI_STUDIO_PREVIEW_HOST_REGEX = /^ais-(dev|pre)-[^.]+\.[^/]*run\.app$/i;
const BLOB_LOCAL_FOLDER_PREFIX_REGEX =
  /^\/?(portfolio|portofolio|works|work|karya|posters|poster|promos|promo|banners|banner|experiences|experience|pengalaman|blogs|blog|cv|resume|about|profile|hero|collaboration|orders|insight|insights|settings)\//i;
const SAFE_SVG_DATA_URI_REGEX = /^data:image\/svg\+xml[;,]/i;

const loggedInvalidImageUrls = new Set<string>();

function logInvalidImageUrlOnce(reason: string, url: string): void {
  const key = `${reason}:${url.slice(0, 120)}`;
  if (loggedInvalidImageUrls.has(key)) return;
  loggedInvalidImageUrls.add(key);
  console.error(`[ImageResolver] ${reason}:`, url);
}

/**
 * Membersihkan parameter ?download=1 dari URL dan memastikan protokol HTTPS untuk Vercel Blob.
 */
export function sanitizeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim().replace(/&amp;/g, '&');
  if (!trimmed) return '';

  if (trimmed.startsWith('blob:')) {
    logInvalidImageUrlOnce('URL sementara blob: tidak dapat digunakan untuk menampilkan media permanen', trimmed);
    return '';
  }

  if (trimmed.startsWith('data:')) {
    if (SAFE_SVG_DATA_URI_REGEX.test(trimmed)) {
      return trimmed;
    }
    logInvalidImageUrlOnce('Data URI base64 tidak diizinkan untuk tampilan gambar (gunakan URL HTTPS Vercel Blob)', trimmed);
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (AI_STUDIO_PREVIEW_HOST_REGEX.test(parsed.hostname)) {
        logInvalidImageUrlOnce('URL preview AI Studio tidak valid untuk produksi (gunakan URL HTTPS Vercel Blob)', trimmed);
        return '';
      }

      if (parsed.hostname.endsWith('.vercel-storage.com') && parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      }

      // Hapus parameter ?download=1 agar gambar dirender inline oleh browser
      parsed.searchParams.delete('download');

      if (
        (parsed.hostname.includes('firebasestorage.googleapis.com') ||
          parsed.hostname.includes('storage.googleapis.com') ||
          parsed.hostname.includes('.firebasestorage.app')) &&
        !parsed.searchParams.has('alt')
      ) {
        parsed.searchParams.set('alt', 'media');
      }

      return parsed.toString();
    } catch {
      logInvalidImageUrlOnce('Format URL gambar tidak valid', trimmed);
      return '';
    }
  }

  if (BLOB_LOCAL_FOLDER_PREFIX_REGEX.test(trimmed)) {
    logInvalidImageUrlOnce(
      'Path lokal untuk file Vercel Blob (mis. /portfolio/...) tidak valid; harus menggunakan URL https:// lengkap dari Vercel Blob',
      trimmed
    );
    return '';
  }

  if (trimmed.includes('hero-albi')) {
    return '/images/hero-albi.png';
  }
  if (trimmed.includes('assets/images/')) {
    const filename = trimmed.split('assets/images/')[1];
    return `/images/${filename}`;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * URL Resolver:
 * - Menjaga keutuhan semua URL publik HTTPS Vercel Blob (*.vercel-storage.com) & URL remote valid.
 * - Menghapus parameter ?download=1 agar tidak memicu force-download.
 * - Menolak URL blob:, base64, URL preview AI Studio, dan path lokal folder Vercel Blob (/portfolio/...) dengan console.error + fallback rapi.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return FALLBACK_IMAGE;
  }

  const sanitized = sanitizeMediaUrl(url);
  if (!sanitized) {
    return FALLBACK_IMAGE;
  }

  if (sanitized.includes('res.cloudinary.com')) {
    return getOptimizedImageUrl(sanitized);
  }

  return sanitized;
}

export function handleImageError(
  e?: React.SyntheticEvent<HTMLImageElement, Event> | Event | HTMLElement | any
) {
  if (!e) return;

  let target: HTMLImageElement | null = null;
  if (e instanceof HTMLImageElement) {
    target = e;
  } else if (e.currentTarget && e.currentTarget instanceof HTMLImageElement) {
    target = e.currentTarget;
  } else if (e.target && e.target instanceof HTMLImageElement) {
    target = e.target;
  }

  if (!target) return;
  if (target.dataset.triedFallback === 'true') return;

  const failedSrc = target.currentSrc || target.getAttribute('src') || target.src || '';
  if (failedSrc && failedSrc !== FALLBACK_IMAGE) {
    console.error('[ImageLoader] Gagal memuat gambar dari URL:', failedSrc);
  }

  target.dataset.triedFallback = 'true';
  target.onerror = null;

  if (target.src !== FALLBACK_IMAGE) {
    target.src = FALLBACK_IMAGE;
  }
}

if (typeof window !== 'undefined') {
  (window as any).handleImageError = handleImageError;
  (window as any).FALLBACK_IMAGE = FALLBACK_IMAGE;
  (window as any).LOADING_IMAGE = LOADING_IMAGE;
}
