import { getStoredSettings, getStoredProjects, getStoredBlogs, getStoredExperiences } from './contentStorage';
import { syncFirestoreSnapshotToSW } from './firestoreSnapshotCache';
import { resolveImageUrl } from './imageResolver';

/**
 * Cache Manager: Menyimpan seluruh elemen dan konten website ke dalam cache
 * (LocalStorage, Service Worker CacheStorage 'portfolio-images-v2', 'portfolio-static-v2',
 * dan 'portfolio-firestore-snapshots-v2').
 * 
 * Memastikan saat website dibuka kembali di perangkat yang sama,
 * website dimuat instan (0 milidetik) dan semua konten tampil utuh.
 */
export async function cacheAllWebsiteContent(
  onProgress?: (progress: number, statusText: string) => void
): Promise<{ success: boolean; cachedImagesCount: number }> {
  if (typeof window === 'undefined') return { success: true, cachedImagesCount: 0 };

  try {
    if (onProgress) onProgress(10, 'Menyiapkan cache data lokal...');

    // 1. Ambil seluruh data konten terkini
    const settings = getStoredSettings();
    const projects = getStoredProjects();
    const blogs = getStoredBlogs();
    const experiences = getStoredExperiences();

    // 2. Sinkronkan snapshot data ke LocalStorage & Service Worker Snapshot Cache
    syncFirestoreSnapshotToSW('settings', [settings]);
    syncFirestoreSnapshotToSW('projects', projects);
    syncFirestoreSnapshotToSW('blogPosts', blogs);
    syncFirestoreSnapshotToSW('experiences', experiences);

    if (onProgress) onProgress(30, 'Mengumpulkan semua aset gambar...');

    // 3. Kumpulkan semua URL gambar dari seluruh bagian website
    const imageUrlSet = new Set<string>();

    const addUrl = (url?: string | null) => {
      if (!url || typeof url !== 'string' || !url.trim()) return;
      const clean = url.trim();
      // Lewati base64 raksasa agar tidak membebani cache URL, hanya ambil path / URL bersih
      if (!clean.startsWith('data:')) {
        imageUrlSet.add(resolveImageUrl(clean));
      }
    };

    // A. Pengaturan Global & Hero
    addUrl(settings.heroImage);
    addUrl(settings.aboutImage);
    if (Array.isArray(settings.heroBanners)) {
      settings.heroBanners.forEach((b: any) => addUrl(b?.image));
    }
    if (Array.isArray(settings.promoPosters)) {
      settings.promoPosters.forEach((p: any) => addUrl(p?.image));
    }
    if (Array.isArray(settings.cvSections)) {
      settings.cvSections.forEach((s: any) => {
        if (Array.isArray(s.images)) s.images.forEach((img: any) => addUrl(img));
        else if (s.image) addUrl(s.image);
      });
    }
    if (settings.collaboration?.partnerLogo) {
      addUrl(settings.collaboration.partnerLogo);
    }

    // B. Proyek Portofolio
    if (Array.isArray(projects)) {
      projects.forEach((p: any) => {
        addUrl(p.image);
        if (Array.isArray(p.gallery)) {
          p.gallery.forEach((g: any) => addUrl(g));
        }
      });
    }

    // C. Artikel Blog
    if (Array.isArray(blogs)) {
      blogs.forEach((b: any) => {
        addUrl(b.image || (b as any).coverImage);
      });
    }

    // D. Riwayat Pengalaman & Sertifikat
    if (Array.isArray(experiences)) {
      experiences.forEach((exp: any) => {
        if (Array.isArray(exp.images)) {
          exp.images.forEach((img: any) => addUrl(img));
        }
        if (exp.image) addUrl(exp.image);
        if (exp.collaborationLogo) addUrl(exp.collaborationLogo);
      });
    }

    // E. Aset UI Statis Inti
    const staticAssets = [
      '/',
      '/manifest.json',
      '/favicon.svg',
      '/favicon.png',
      '/apple-touch-icon.png',
      '/logo-text-hitam.png',
      '/logo-text-putih.png',
      '/logo-text-hitam.svg',
      '/logo-text-putih.svg',
      '/api/settings',
      '/api/projects',
      '/api/blogs',
      '/api/experiences',
      '/api/messages',
      '/api/hero-image',
      '/images/minimalist_3d_illustration_1787122966121.jpg',
      '/images/editing_tools_3d_1787123977793.jpg',
      '/images/banner_promo_bca_1788696791480.jpg',
      '/images/banner_promo_crea_1788696808849.jpg'
    ];
    staticAssets.forEach(u => addUrl(u));

    const allUrls = Array.from(imageUrlSet);
    if (onProgress) onProgress(50, `Menyimpan ${allUrls.length} elemen dan aset ke cache...`);

    // 4. Precache ke CacheStorage Service Worker (portfolio-images-v2 & portfolio-static-v2)
    if ('caches' in window) {
      try {
        const imageCache = await caches.open('portfolio-images-v2');
        const staticCache = await caches.open('portfolio-static-v2');

        const cachePromises = allUrls.map(async (url) => {
          try {
            const isStatic = staticAssets.includes(url) || url.startsWith('/api/');
            const targetCache = isStatic ? staticCache : imageCache;

            // Periksa apakah sudah ada di cache
            const existing = await targetCache.match(url);
            if (!existing) {
              const res = await fetch(url, { cache: 'no-cache' });
              if (res && (res.status === 200 || res.type === 'opaque')) {
                await targetCache.put(url, res);
              }
            }
          } catch {
            // Abaikan jika aset eksternal gagal di-fetch (misal CORS)
          }
        });

        await Promise.allSettled(cachePromises);
      } catch (cacheStorageErr) {
        console.warn('[CacheManager] CacheStorage API notice:', cacheStorageErr);
      }
    }

    // 5. Preload gambar via HTML Image objek di memory browser
    const imagePreloads = allUrls
      .filter(u => !u.startsWith('/api/') && u !== '/' && !u.endsWith('.json'))
      .map((url) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = url;
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 2000); // 2 detik timeout per gambar
        });
      });

    await Promise.allSettled(imagePreloads);

    // 6. Tandai bahwa cache website telah disimpan secara menyeluruh
    localStorage.setItem('all_content_cached', 'true');
    localStorage.setItem('all_content_cached_at', String(Date.now()));
    localStorage.setItem('alfreelnc_cache_mode', 'all');

    // Beritahukan Service Worker untuk meng-claim client
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_ALL_CONTENT_CACHE',
        payload: {
          cachedAt: new Date().toISOString(),
          urlsCount: allUrls.length
        }
      });
    }

    if (onProgress) onProgress(100, 'Seluruh website berhasil disimpan ke cache!');

    return { success: true, cachedImagesCount: allUrls.length };
  } catch (err) {
    console.warn('[CacheManager] Cache all notice:', err);
    return { success: false, cachedImagesCount: 0 };
  }
}

/**
 * Memeriksa apakah website sudah tersimpan penuh di cache perangkat
 */
export function isWebsiteContentCached(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('all_content_cached') === 'true';
  } catch {
    return false;
  }
}
