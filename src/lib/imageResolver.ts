import { getOptimizedImageUrl } from './cloudinary';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Placeholder SVG dinamis dengan spesifikasi:
 * 1. Latar belakang: Warna netral / gelap (#18181b s/d #09090b) yang pas dengan tema web.
 * 2. Di tengah latar belakang: Logo favicon Alfreelnc (AL ring) diperbesar dengan transparansi 20% (opacity: 0.2).
 * 3. Teks di tengah: Tulisan "Gambar sedang dimuat..." dengan font bersih dan mudah dibaca.
 */
export function createDynamicSvgPlaceholder(text: string = 'Gambar sedang dimuat...'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="50%" stop-color="#111114"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="logoCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>

  <!-- Latar belakang warna netral gelap sesuai tema web -->
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>

  <!-- Logo favicon Alfreelnc diperbesar di tengah dengan transparansi 20% (opacity: 0.2) -->
  <g transform="translate(400, 240) scale(1.65)" opacity="0.2">
    <!-- Cincin Donut Gradien Biru-Ungu -->
    <circle cx="0" cy="0" r="70" fill="url(#logoCircleGrad)"/>
    <!-- Lubang Tengah Hitam Netral -->
    <circle cx="0" cy="0" r="42" fill="#18181b"/>
    <!-- Teks Monogram AL -->
    <text x="0" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">AL</text>
    <!-- Aksen Dot Ungu & Biru -->
    <circle cx="-28" cy="-12" r="5" fill="#a855f7"/>
    <circle cx="28" cy="12" r="5" fill="#3b82f6"/>
  </g>

  <!-- Teks di tengah: Tulisan 'Gambar sedang dimuat...' font bersih dan mudah dibaca -->
  <text x="400" y="405" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="19" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="0.4">${text}</text>

  <!-- Indikator loading halus -->
  <rect x="360" y="430" width="80" height="3" rx="1.5" fill="#6366f1" opacity="0.35"/>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const FALLBACK_IMAGE = createDynamicSvgPlaceholder('Gambar sedang dimuat...');
export const FALLBACK_BLOG_IMAGE = FALLBACK_IMAGE;

/**
 * URL Resolver:
 * 1. Menjaga keutuhan Firebase Storage public URL (firebasestorage.googleapis.com / storage.googleapis.com),
 *    memastikan parameter autentikasi & token akses (?alt=media&token=...) TIDAK TERPUTUS.
 * 2. Jika string URL berawalan "/uploads/" atau tidak mengandung "http",
 *    secara otomatis gabungkan dengan BASE_URL domain server (window.location.origin).
 * 3. Jika URL mengarah ke /src/assets/images/, arahkan ke folder publik /images/.
 * 4. Jika URL sudah berupa absolute link (Cloudinary / Supabase / external http/https),
 *    gunakan langsung URL tersebut tanpa merusak query string.
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

  // PERLINDUNGAN KHUSUS FIREBASE STORAGE URL:
  // JANGAN PERNAH memotong query string (token akses & alt=media)
  if (
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('storage.googleapis.com')
  ) {
    // Pastikan alt=media selalu disertakan agar browser langsung merender gambar publik tanpa download paksa
    if (!trimmed.includes('alt=media')) {
      const sep = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${sep}alt=media`;
    }
    return trimmed;
  }

  // Handle Vite asset paths yang tersimpan sebagai ./src/assets/images/... atau ./assets/images/...
  if (trimmed.includes('hero-albi')) {
    return '/images/hero-albi.png';
  }
  if (trimmed.includes('assets/images/')) {
    const filename = trimmed.split('assets/images/')[1];
    return `/images/${filename}`;
  }

  // Jika URL absolute (http:// atau https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Jika URL mengarah ke /uploads/ di host lain (misal dari preview instance sebelumnya),
    // normalisasi ke origin saat ini secara dinamis tanpa merusak query params
    if (trimmed.includes('/uploads/')) {
      try {
        const parsed = new URL(trimmed);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const pathname = parsed.pathname;
        const search = parsed.search;
        if (origin) {
          return `${origin}${pathname.startsWith('/') ? '' : '/'}${pathname}${search}`;
        }
        return `${pathname}${search}`;
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
        const search = parsed.search;
        if (origin) {
          return `${origin}${pathname.startsWith('/') ? '' : '/'}${pathname}${search}`;
        }
        return `${pathname}${search}`;
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
 * Event handler global onError untuk elemen <img />: handleImageError(event)
 * 1. Mencegah broken image icon pada semua browser.
 * 2. Self-Healing: Jika gambar 404 pada URL lokal, coba pulihkan file asli dari
 *    Firebase Firestore (uploadedMedia) atau media registry browser.
 * 3. Jika gagal atau sumber eksternal rusak, gantikan src dengan dynamic SVG placeholder
 *    berisi latar gelap, logo favicon Alfreelnc 20% opacity, dan teks "Gambar sedang dimuat...".
 */
export function handleImageError(
  e?: React.SyntheticEvent<HTMLImageElement, Event> | Event | HTMLElement | any
) {
  if (!e) return;

  // Dapatkan elemen gambar target
  let target: HTMLImageElement | null = null;
  if (e instanceof HTMLImageElement) {
    target = e;
  } else if (e.currentTarget && e.currentTarget instanceof HTMLImageElement) {
    target = e.currentTarget;
  } else if (e.target && e.target instanceof HTMLImageElement) {
    target = e.target;
  }

  if (!target) return;

  // Cegah loop tak hingga jika fallback juga memicu onError
  if (target.dataset.triedFallback === 'true') {
    return;
  }
  target.dataset.triedFallback = 'true';
  target.onerror = null;

  const rawSrc = target.src || '';
  const filename = rawSrc.split('/').pop()?.split('?')[0];

  // 1. Coba pulihkan seketika dari LocalStorage media cache jika ada
  if (filename) {
    try {
      const cached = localStorage.getItem('uploaded_media_links');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const match = list.find((m: any) => m.filename === filename || (m.url && m.url.includes(filename)));
          if (match && match.dataUrl && typeof match.dataUrl === 'string' && match.dataUrl.startsWith('data:image/')) {
            target.src = match.dataUrl;
            return;
          }
        }
      }
    } catch {}

    // 2. Pulihkan dari Cloud Firestore koleksi uploadedMedia
    const safeDocId = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const mediaDocId = safeDocId.startsWith('media_') ? safeDocId : `media_${safeDocId}`;

    const tryRestore = async () => {
      try {
        let snap = await getDoc(doc(db, 'uploadedMedia', safeDocId));
        if (!snap.exists() && mediaDocId !== safeDocId) {
          snap = await getDoc(doc(db, 'uploadedMedia', mediaDocId));
        }
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.dataUrl && typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image/')) {
            if (target) {
              target.src = data.dataUrl;
            }
            try {
              const existing = localStorage.getItem('uploaded_media_links');
              let list = existing ? JSON.parse(existing) : [];
              if (!Array.isArray(list)) list = [];
              list = [{ id: safeDocId, url: rawSrc, filename, dataUrl: data.dataUrl, savedPermanently: true }, ...list];
              localStorage.setItem('uploaded_media_links', JSON.stringify(list.slice(0, 500)));
            } catch {}
            return true;
          }
        }
      } catch {}
      return false;
    };

    tryRestore().then((restored) => {
      if (!restored && target && target.src !== FALLBACK_IMAGE) {
        target.onerror = null;
        target.src = FALLBACK_IMAGE;
      }
    });
    return;
  }

  if (target.src !== FALLBACK_IMAGE) {
    target.onerror = null;
    target.src = FALLBACK_IMAGE;
  }
}

// Pasang fungsi ke window global agar inline script Firestore atau template HTML
// dapat memanggil onerror="handleImageError(event)" secara langsung
if (typeof window !== 'undefined') {
  (window as any).handleImageError = handleImageError;
  (window as any).FALLBACK_IMAGE = FALLBACK_IMAGE;
}

