import { getOptimizedImageUrl } from './cloudinary';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * 1. LOADING_SVG: Ditampilkan hanya selama proses pemuatan / pemulihan async gambar (maksimal 2 detik).
 *    Dilengkapi animasi pulse halus dan monogram AL dengan transparansi 20%.
 */
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

  <!-- Latar belakang gelap netral sesuai tema web -->
  <rect width="100%" height="100%" fill="url(#loadBg)"/>

  <!-- Logo favicon Alfreelnc diperbesar di tengah dengan transparansi 20% (opacity: 0.2) -->
  <g transform="translate(400, 240) scale(1.65)" opacity="0.2">
    <circle cx="0" cy="0" r="70" fill="url(#loadLogoGrad)"/>
    <circle cx="0" cy="0" r="42" fill="#18181b"/>
    <text x="0" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">AL</text>
    <circle cx="-28" cy="-12" r="5" fill="#a855f7"/>
    <circle cx="28" cy="12" r="5" fill="#3b82f6"/>
  </g>

  <!-- Teks indikator loading dinamis -->
  <text x="400" y="405" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="17" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="0.4">${text}</text>

  <!-- Garis indikator pemuatan -->
  <rect x="350" y="425" width="100" height="3" rx="1.5" fill="#6366f1" opacity="0.4"/>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * 2. FALLBACK_IMAGE: Kartu fallback definitif saat gambar tidak tersedia atau gagal dimuat.
 *    Menampilkan kartu estetik Alfreelnc Design yang bersih, rapi, dan TIDAK membuat pengunjung
 *    mengira gambar sedang macet/stuck.
 */
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

  <!-- Latar belakang gelap netral sesuai tema web -->
  <rect width="100%" height="100%" fill="url(#cardBg)"/>

  <!-- Logo favicon Alfreelnc diperbesar di tengah dengan transparansi 20% (opacity: 0.2) -->
  <g transform="translate(400, 235) scale(1.75)" opacity="0.2">
    <circle cx="0" cy="0" r="70" fill="url(#cardLogoGrad)"/>
    <circle cx="0" cy="0" r="42" fill="#18181b"/>
    <text x="0" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">AL</text>
    <circle cx="-28" cy="-12" r="5" fill="#a855f7"/>
    <circle cx="28" cy="12" r="5" fill="#3b82f6"/>
  </g>

  <!-- Judul Brand Alfreelnc -->
  <text x="400" y="395" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="20" font-weight="700" fill="#e4e4e7" text-anchor="middle" letter-spacing="0.8">${title}</text>
  
  <!-- Subtitle Deskriptif -->
  <text x="400" y="425" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="13" font-weight="500" fill="#71717a" text-anchor="middle" letter-spacing="0.5">${subtitle}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const LOADING_IMAGE = createLoadingSvgPlaceholder('Memuat gambar...');
export const FALLBACK_IMAGE = createDynamicSvgPlaceholder('Alfreelnc Design', 'Portofolio Desain Grafis');
export const FALLBACK_BLOG_IMAGE = FALLBACK_IMAGE;

/**
 * URL Resolver:
 * 1. Menjaga keutuhan Firebase Storage public URL (firebasestorage.googleapis.com, storage.googleapis.com, *.firebasestorage.app),
 *    memastikan query string autentikasi & token akses (?alt=media&token=...) TIDAK TERPUTUS dan tanpa CORS header blocking.
 * 2. Mengambil gambar seketika dari cache browser/localStorage jika URL lokal (/uploads/...) belum ter-deploy ke Vercel disk.
 * 3. Memastikan path lokal hero (/src/assets/images/hero-albi.png) selalu mengarah ke folder publik (/images/hero-albi.png).
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return FALLBACK_IMAGE;
  }

  let trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_IMAGE;
  }

  // Normalisasi karakter encoded XML/HTML yang mungkin tersimpan di database
  trimmed = trimmed.replace(/&amp;/g, '&');

  // Jika berupa data URI atau blob URI, gunakan langsung tanpa modifikasi
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 1. PERLINDUNGAN KHUSUS FIREBASE STORAGE URL:
  // JANGAN PERNAH memotong query string (token akses & alt=media)
  if (
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('storage.googleapis.com') ||
    trimmed.includes('.firebasestorage.app')
  ) {
    // Pastikan alt=media selalu disertakan agar browser langsung merender gambar publik
    if (!trimmed.includes('alt=media')) {
      const sep = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${sep}alt=media`;
    }
    return trimmed;
  }

  // 2. Handle aset Hero & gambar statis proyek
  if (trimmed.includes('hero-albi')) {
    return '/images/hero-albi.png';
  }
  if (trimmed.includes('assets/images/')) {
    const filename = trimmed.split('assets/images/')[1];
    return `/images/${filename}`;
  }

  // 3. Cek cache lokal seketika jika URL mengarah ke /uploads/... agar tidak 404 di domain Vercel
  const filename = trimmed.split('/').pop()?.split('?')[0];
  if (typeof window !== 'undefined' && filename && (trimmed.includes('/uploads/') || !trimmed.startsWith('http'))) {
    try {
      const cached = localStorage.getItem('uploaded_media_links');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const match = list.find((m: any) => m.filename === filename || (m.url && m.url.includes(filename)));
          if (match && match.dataUrl && typeof match.dataUrl === 'string' && match.dataUrl.startsWith('data:image/')) {
            return match.dataUrl;
          }
        }
      }
    } catch {}
  }

  // 4. Jika URL absolute (http:// atau https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Jika URL mengarah ke /uploads/ di host lain, normalisasi ke origin saat ini secara dinamis
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
      } catch {}
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
      } catch {}
    }

    // Jika Cloudinary, berikan optimasi format otomatis
    if (trimmed.includes('res.cloudinary.com')) {
      return getOptimizedImageUrl(trimmed);
    }

    return trimmed;
  }

  // 5. Relative path (misal: "/uploads/nama-file.png" atau "/images/nama-file.png")
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return path;
}

/**
 * Event handler global onError untuk elemen <img />: handleImageError(event)
 * 1. Mencegah broken image icon pada semua browser tanpa infinite loop.
 * 2. Self-Healing Cepat: Periksa LocalStorage browser seketika.
 * 3. Timeout Ketat (2.000ms): Jika gambar berasal dari Firestore (uploadedMedia),
 *    batasi proses restore maksimal 2 detik. Jika melebihi timeout atau gagal,
 *    segera gantikan dengan FALLBACK_IMAGE definitif bertema gelap Alfreelnc,
 *    sehingga UI TIDAK PERNAH terjebak selamanya di status loading "Gambar sedang dimuat...".
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

    // Pasang placeholder loading sementara selama pencarian async berlangsung (maks 2 detik)
    target.src = LOADING_IMAGE;

    // 2. Pulihkan dari Cloud Firestore koleksi uploadedMedia dengan timeout ketat 2000ms
    const safeDocId = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const mediaDocId = safeDocId.startsWith('media_') ? safeDocId : `media_${safeDocId}`;

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2000);
    });

    const restorePromise = (async (): Promise<string | null> => {
      try {
        let snap = await getDoc(doc(db, 'uploadedMedia', safeDocId));
        if (!snap.exists() && mediaDocId !== safeDocId) {
          snap = await getDoc(doc(db, 'uploadedMedia', mediaDocId));
        }
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.dataUrl && typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image/')) {
            return data.dataUrl;
          }
        }
      } catch (err) {
        console.warn('Firestore restore image notice:', err);
      }
      return null;
    })();

    Promise.race([restorePromise, timeoutPromise]).then((restoredUrl) => {
      if (!target) return;
      target.onerror = null;
      if (restoredUrl) {
        target.src = restoredUrl;
        try {
          const existing = localStorage.getItem('uploaded_media_links');
          let list = existing ? JSON.parse(existing) : [];
          if (!Array.isArray(list)) list = [];
          list = [{ id: safeDocId, url: rawSrc, filename, dataUrl: restoredUrl, savedPermanently: true }, ...list];
          localStorage.setItem('uploaded_media_links', JSON.stringify(list.slice(0, 500)));
        } catch {}
      } else {
        target.src = FALLBACK_IMAGE;
      }
    });
    return;
  }

  // Jika bukan nama file yang dapat dipulihkan, langsung beralih ke FALLBACK_IMAGE
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
  (window as any).LOADING_IMAGE = LOADING_IMAGE;
}
