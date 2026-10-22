import { getOptimizedImageUrl } from './cloudinary';

/**
 * Placeholder SVG modern dan elegan sebagai fallback ketika gambar gagal dimuat (404/broken link)
 */
export const FALLBACK_IMAGE = `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20width%3D%22800%22%20height%3D%22600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2318181b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2309090b%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23bg)%22%2F%3E%3Cg%20transform%3D%22translate(340%2C%20240)%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%2240%22%20r%3D%2212%22%2F%3E%3Cpath%20d%3D%22M15%20100l35-35%2025%2025%2030-30%2015%2015%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

export const FALLBACK_BLOG_IMAGE = FALLBACK_IMAGE;

/**
 * URL Resolver:
 * 1. Jika string URL berawalan "/uploads/" atau tidak mengandung "http",
 *    secara otomatis gabungkan dengan BASE_URL domain server (window.location.origin).
 * 2. Jika URL mengarah ke /src/assets/images/, arahkan ke folder publik /images/.
 * 3. Jika URL sudah berupa absolute link (Cloudinary / Supabase / external http/https),
 *    gunakan langsung URL tersebut tanpa tambahan domain.
 * 4. Otomatis membersihkan karakter yang tidak valid dan mendukung fallback bila kosong.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return FALLBACK_IMAGE;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_IMAGE;
  }

  // Jika berupa data URI atau blob URI, gunakan langsung
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Handle Vite asset paths yang tersimpan sebagai /src/assets/images/...
  if (trimmed.includes('/src/assets/images/')) {
    const filename = trimmed.split('/src/assets/images/')[1];
    return `/images/${filename}`;
  }
  if (trimmed.startsWith('src/assets/images/')) {
    const filename = trimmed.replace('src/assets/images/', '');
    return `/images/${filename}`;
  }

  // Jika URL absolute (http:// atau https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Jika URL mengarah ke /uploads/ di host lain (misal dari preview instance sebelumnya),
    // normalisasi ke origin saat ini secara dinamis
    if (trimmed.includes('/uploads/')) {
      try {
        const parsed = new URL(trimmed);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const pathname = parsed.pathname;
        if (origin) {
          return `${origin}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
        }
        return pathname;
      } catch {
        // Abaikan parse error
      }
    }

    // Jika URL mengarah ke folder publik /images/ di host lain
    if (trimmed.includes('/images/')) {
      try {
        const parsed = new URL(trimmed);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const pathname = parsed.pathname;
        if (origin) {
          return `${origin}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
        }
        return pathname;
      } catch {
        // Abaikan parse error
      }
    }

    // Jika Cloudinary, berikan optimasi f_webp,q_auto
    if (trimmed.includes('res.cloudinary.com')) {
      return getOptimizedImageUrl(trimmed);
    }

    return trimmed;
  }

  // Relative path (misal: "/uploads/nama-file.png" atau "/images/nama-file.png")
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return path;
}

/**
 * Event handler onError untuk elemen <img />
 * Mengganti sumber gambar ke FALLBACK_IMAGE saat 404 atau link rusak tanpa loop
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.src !== FALLBACK_IMAGE) {
    target.onerror = null;
    target.src = FALLBACK_IMAGE;
  }
}
