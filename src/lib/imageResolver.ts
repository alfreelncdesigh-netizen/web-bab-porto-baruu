import { getOptimizedImageUrl } from './cloudinary';

/**
 * Placeholder SVG modern dan elegan sebagai fallback ketika gambar gagal dimuat (404/broken link)
 */
export const FALLBACK_BLOG_IMAGE = `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20500%22%20width%3D%22800%22%20height%3D%22500%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2318181b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2309090b%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23bg)%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22210%22%20r%3D%2248%22%20fill%3D%22none%22%20stroke%3D%22%233f3f46%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M385%20195h30v30h-30z%22%20fill%3D%22none%22%20stroke%3D%22%2352525b%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M320%20330%20l60-60%2045%2040%2055-50%2060%2070H320z%22%20fill%3D%22%2327272a%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22390%22%20font-family%3D%22system-ui%2C%20-apple-system%2C%20sans-serif%22%20font-size%3D%2214%22%20letter-spacing%3D%222%22%20font-weight%3D%22600%22%20fill%3D%22%2371717a%22%20text-anchor%3D%22middle%22%3EGAMBAR%20BLOG%3C%2Ftext%3E%3C%2Fsvg%3E`;

/**
 * URL Resolver:
 * 1. Jika string URL berawalan "/uploads/" atau tidak mengandung "http",
 *    secara otomatis gabungkan dengan BASE_URL domain server (window.location.origin).
 * 2. Jika URL sudah berupa absolute link (Cloudinary / Supabase / external http/https),
 *    gunakan langsung URL tersebut tanpa tambahan domain.
 * 3. Otomatis membersihkan karakter yang tidak valid dan mendukung fallback bila kosong.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return FALLBACK_BLOG_IMAGE;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_BLOG_IMAGE;
  }

  // Jika berupa data URI atau blob URI, gunakan langsung
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Jika URL absolute (http:// atau https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Jika URL mengarah ke /uploads/ di host lain (misal dari dev instance sebelumnya),
    // redirect ke origin saat ini jika berbeda
    if (trimmed.includes('/uploads/')) {
      try {
        const parsed = new URL(trimmed);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        if (origin && parsed.origin !== origin) {
          const pathname = parsed.pathname;
          return `${origin}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
        }
      } catch {
        // Abaikan parse error, lanjutkan
      }
    }

    // Jika Cloudinary, berikan optimasi f_webp,q_auto
    if (trimmed.includes('res.cloudinary.com')) {
      return getOptimizedImageUrl(trimmed);
    }

    return trimmed;
  }

  // Relative path (misal: "/uploads/nama-file.png" atau "uploads/nama-file.png")
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return path;
}

/**
 * Event handler onError untuk elemen <img />
 * Mengganti sumber gambar ke FALLBACK_BLOG_IMAGE saat 404 atau link rusak
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  // Hindari loop tak berujung jika fallback juga gagal
  if (target.src !== FALLBACK_BLOG_IMAGE) {
    target.onerror = null;
    target.src = FALLBACK_BLOG_IMAGE;
  }
}
