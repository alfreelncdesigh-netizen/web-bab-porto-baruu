import { getStoredSettings, getStoredProjects, getStoredBlogs, getStoredExperiences } from './contentStorage';
import { resolveImageUrl } from './imageResolver';

/**
 * Memory-only image prefetcher:
 * Preloads active images in memory without writing dynamic data into localStorage or SW API caches.
 */
export async function cacheAllWebsiteContent(
  onProgress?: (progress: number, statusText: string) => void
): Promise<{ success: boolean; cachedImagesCount: number }> {
  if (typeof window === 'undefined') return { success: true, cachedImagesCount: 0 };

  try {
    onProgress?.(20, 'Mengumpulkan aset gambar aktif...');

    const settings = getStoredSettings();
    const projects = getStoredProjects();
    const blogs = getStoredBlogs();
    const experiences = getStoredExperiences();

    const imageUrlSet = new Set<string>();
    const addUrl = (url?: string | null) => {
      if (!url || typeof url !== 'string' || !url.trim()) return;
      const clean = url.trim();
      if (!clean.startsWith('data:') && !clean.startsWith('blob:')) {
        imageUrlSet.add(resolveImageUrl(clean));
      }
    };

    addUrl(settings.heroImage);
    addUrl(settings.aboutImage);
    settings.heroBanners?.forEach((b: any) => addUrl(b?.image));
    settings.promoPosters?.forEach((p: any) => addUrl(p?.image));
    settings.cvSections?.forEach((s: any) => {
      if (Array.isArray(s.images)) s.images.forEach((img: any) => addUrl(img));
      else if (s.image) addUrl(s.image);
    });
    if (settings.collaboration?.partnerLogo) addUrl(settings.collaboration.partnerLogo);

    projects.forEach((p: any) => {
      addUrl(p.image);
      if (Array.isArray(p.images)) p.images.forEach((g: any) => addUrl(g));
    });

    blogs.forEach((b: any) => addUrl(b.image || (b as any).coverImage));

    experiences.forEach((exp: any) => {
      if (Array.isArray(exp.images)) exp.images.forEach((img: any) => addUrl(img));
      if (exp.image) addUrl(exp.image);
      if (exp.collaborationLogo) addUrl(exp.collaborationLogo);
    });

    const allUrls = Array.from(imageUrlSet);
    onProgress?.(60, `Memuat ${allUrls.length} gambar di memori...`);

    const imagePreloads = allUrls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = url;
        if (img.complete && img.naturalWidth > 0) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
    });

    await Promise.allSettled(imagePreloads);
    onProgress?.(100, 'Selesai!');

    return { success: true, cachedImagesCount: allUrls.length };
  } catch (err) {
    console.warn('[CacheManager] Preload notice:', err);
    return { success: false, cachedImagesCount: 0 };
  }
}

export function isWebsiteContentCached(): boolean {
  return false;
}
