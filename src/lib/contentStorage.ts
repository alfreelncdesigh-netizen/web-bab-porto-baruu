import { SiteSettings, defaultSettings, defaultCvSections } from '../data/settings';
import { Project, projects as defaultProjects } from '../data/projects';
import { BlogPost } from '../types/blog';
import { defaultBlogPosts } from '../data/blogs';
import { TemplateProduct, defaultTemplates } from '../data/templates';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const DUMMY_PROJECT_TITLES = new Set([
  "Aplikasi Keuangan FinSmart",
  "Poster Pameran Seni Kontemporer",
  "Platform E-learning EduTech",
  "Identitas Merek Kopi Senja",
  "Poster Festival Musik Indie",
  "Website Studio Arsitektur",
  "Redesain Aplikasi Travel",
  "Aplikasi Kesehatan SehatKu"
]);

const DUMMY_BLOG_IDS = new Set([
  "filosofi-desain-minimalis",
  "beralih-ke-affinity-designer",
  "hierarki-tipografi-modern"
]);

const DUMMY_TEMPLATE_IDS = new Set([
  "affinity-brand-kit",
  "ui-ux-wireframe-system",
  "brutalist-editorial-posters",
  "minimalist-social-carousel"
]);

export function cleanProjects(projs: Project[]): Project[] {
  return (projs || []).filter((p: Project) => p && !DUMMY_PROJECT_TITLES.has(p.title));
}
export function cleanBlogs(blogs: BlogPost[]): BlogPost[] {
  return (blogs || []).filter((b: BlogPost) => b && !DUMMY_BLOG_IDS.has(b.id));
}
export function cleanTemplates(templates: TemplateProduct[]): TemplateProduct[] {
  return (templates || []).filter((t: TemplateProduct) => t && !DUMMY_TEMPLATE_IDS.has(t.id));
}

export function cleanSettings(settings: Partial<SiteSettings>): Partial<SiteSettings> {
  const cleaned = { ...settings };
  if (cleaned.aboutImage && cleaned.aboutImage.includes('photo-1499951360447')) {
    cleaned.aboutImage = "";
  }
  if (Array.isArray(cleaned.cvSections) && cleaned.cvSections.length > 0) {
    cleaned.cvSections = cleaned.cvSections.map((s: any) => {
      let imgs: string[] = [];
      if (Array.isArray(s.images) && s.images.length > 0) {
        imgs = s.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      } else if (s.image && typeof s.image === 'string' && s.image.trim().length > 0) {
        imgs = [s.image.trim()];
      }
      return {
        title: s.title || '',
        content: s.content || '',
        images: imgs
      };
    });
  } else if (!cleaned.cvSections) {
    cleaned.cvSections = defaultCvSections;
  }
  if (Array.isArray(cleaned.heroBanners)) {
    // Hilangkan 2 banner lainnya sesuai permintaan pengguna
    cleaned.heroBanners = cleaned.heroBanners.filter((b: any) => b && b.id !== 'banner-2' && b.id !== 'banner-3');
    if (cleaned.heroBanners.length > 1) {
      cleaned.heroBanners = [cleaned.heroBanners[0]];
    }
    if (cleaned.heroBanners.length === 0) {
      cleaned.heroBanners = defaultSettings.heroBanners || [];
    }
  } else {
    cleaned.heroBanners = defaultSettings.heroBanners || [];
  }
  if (!Array.isArray(cleaned.promoPosters) || cleaned.promoPosters.length === 0) {
    cleaned.promoPosters = defaultSettings.promoPosters || [];
  }
  return cleaned;
}

// 1. SETTINGS
export function getStoredSettings(): SiteSettings {
  try {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const cleaned = cleanSettings(parsed);
      const merged = { ...defaultSettings, ...cleaned };

      // Cek backup CV jika ada foto di backup yang belum sempat tersimpan di app_settings
      try {
        const backupCv = localStorage.getItem('app_cv_backup');
        if (backupCv) {
          const parsedBackup = JSON.parse(backupCv);
          if (Array.isArray(parsedBackup.cvSections) && parsedBackup.cvSections.length > 0) {
            const hasBackupImages = parsedBackup.cvSections.some((s: any) => Array.isArray(s.images) && s.images.length > 0);
            const currentHasImages = Array.isArray(merged.cvSections) && merged.cvSections.some((s: any) => Array.isArray(s.images) && s.images.length > 0);
            if (hasBackupImages && !currentHasImages) {
              merged.cvSections = parsedBackup.cvSections;
            }
          }
        }
      } catch {}

      return merged;
    }
  } catch (e) {
    console.warn("Error reading stored settings:", e);
  }
  return { ...defaultSettings };
}

export async function saveStoredSettings(newSettings: SiteSettings): Promise<boolean> {
  const cleaned = cleanSettings(newSettings);
  const merged = { ...defaultSettings, ...cleaned };
  
  // 1. Simpan ke local storage & kirim custom event untuk real-time update frontend
  try {
    localStorage.setItem('app_settings', JSON.stringify(merged));
    // Simpan salinan khusus data CV untuk proteksi reload
    if (merged.cvSections || merged.cvPdfFile || merged.cvRole) {
      localStorage.setItem('app_cv_backup', JSON.stringify({
        cvSections: merged.cvSections,
        cvRole: merged.cvRole,
        cvPdfFile: merged.cvPdfFile,
        savedAt: Date.now()
      }));
    }
  } catch (e) {
    console.warn("LocalStorage save settings error (quota check):", e);
    try {
      localStorage.removeItem('user_projects');
      localStorage.removeItem('blogPosts');
      localStorage.setItem('app_settings', JSON.stringify(merged));
    } catch (e2) {
      console.warn("LocalStorage fallback write failed:", e2);
    }
  }

  // Kirim event untuk sinkronisasi state React frontend di tab yang sama
  window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: merged }));

  // 2. Simpan ke Cloud Firestore secara paralel dengan timeout agar proses simpan super cepat
  let cloudSuccess = false;
  try {
    const firestoreTasks: Promise<any>[] = [];

    if (merged.cvSections || merged.cvPdfFile || merged.cvRole) {
      firestoreTasks.push(
        setDoc(doc(db, 'settings', 'cv'), {
          cvSections: merged.cvSections || [],
          cvPdfFile: merged.cvPdfFile || '',
          cvRole: merged.cvRole || '',
          updatedAt: new Date().toISOString()
        }, { merge: true })
      );
    }

    firestoreTasks.push(
      setDoc(doc(db, 'settings', 'global'), merged, { merge: true })
    );

    // Jalankan operasi Firestore secara paralel dengan batas waktu 4 detik
    await Promise.race([
      Promise.all(firestoreTasks),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 4000))
    ]);
    cloudSuccess = true;
  } catch (e) {
    console.warn("Firestore save settings error/timeout (data tersimpan di lokal):", e);
  }

  return cloudSuccess;
}

// 2. PROJECTS
export function getStoredProjects(): Project[] {
  return [];
}

export async function saveStoredProjects(newProjects: Project[]): Promise<void> {
  const clean = newProjects.filter((p: Project) => !DUMMY_PROJECT_TITLES.has(p.title));
  window.dispatchEvent(new CustomEvent('user_projects_updated', { detail: clean }));
  try { localStorage.removeItem('user_projects'); } catch(e) {}
}

// 3. BLOG POSTS
export function getStoredBlogs(): BlogPost[] {
  return [];
}

export async function saveStoredBlogs(newBlogs: BlogPost[]): Promise<void> {
  const clean = newBlogs.filter((b: BlogPost) => !DUMMY_BLOG_IDS.has(b.id));
  window.dispatchEvent(new CustomEvent('blog_posts_updated', { detail: clean }));
  try { localStorage.removeItem('blogPosts'); } catch(e) {}
}

// 4. EXPERIENCES
export function getStoredExperiences(): any[] {
  return [];
}

export async function saveStoredExperiences(newExps: any[]): Promise<void> {
  window.dispatchEvent(new CustomEvent('user_experiences_updated', { detail: newExps }));
  try { localStorage.removeItem('user_experiences'); } catch(e) {}
}

// 5. TEMPLATES
export function getStoredTemplates(): TemplateProduct[] {
  return [];
}

export async function saveStoredTemplates(newTemplates: TemplateProduct[]): Promise<void> {
  const clean = newTemplates.filter((t: TemplateProduct) => !DUMMY_TEMPLATE_IDS.has(t.id));
  window.dispatchEvent(new CustomEvent('templates_updated', { detail: clean }));
  try { localStorage.removeItem('templates'); } catch(e) {}
}
