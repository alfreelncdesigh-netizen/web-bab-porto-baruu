import { SiteSettings, defaultSettings, defaultCvSections } from '../data/settings';
import { Project, projects as defaultProjects } from '../data/projects';
import { BlogPost } from '../types/blog';
import { defaultBlogPosts } from '../data/blogs';
import { TemplateProduct, defaultTemplates } from '../data/templates';
import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType } from './firestoreErrorHandler';

const DUMMY_PROJECT_IDS = new Set(['2', '3', '4', '5', '6', '7', 'poster-lks-smkn1-sinjai', 'branding-kemasan-teh-hijau', 'poster-promosi-diskon-kreatif', 'showcase-visual-3d-minimalis', 'banner-informasi-bca-finansial', 'visual-sosial-media-konten-kreatif', 'workspace-editing-tools-3d']);

const DUMMY_PROJECT_TITLES = new Set([
  "Aplikasi Keuangan FinSmart",
  "Poster Pameran Seni Kontemporer",
  "Platform E-learning EduTech",
  "Identitas Merek Kopi Senja",
  "Poster Festival Musik Indie",
  "Website Studio Arsitektur",
  "Redesain Aplikasi Travel",
  "Aplikasi Kesehatan SehatKu",
  "Poster LKS Desain Grafis SMKN 1 Sinjai",
  "Desain Kemasan & Identitas Visual Teh Hijau",
  "Poster Promosi & Diskon Branding Digital",
  "Eksplorasi Antarmuka Digital & 3D Minimalis",
  "Banner Layanan Transaksi Finansial Digital",
  "Koleksi Visual Kreatif Media Sosial",
  "Suite Kreatif & Workspace Tools 3D"
]);

const DUMMY_BLOG_IDS = new Set([
  "filosofi-desain-minimalis",
  "beralih-ke-affinity-designer",
  "hierarki-tipografi-modern",
  "proses-desain-kemasan-teh-hijau"
]);

const DUMMY_BLOG_TITLES = new Set([
  "Filosofi Desain Minimalis & Fungsional",
  "Filosofi Desain Minimalis: Ketika Kurang Berarti Lebih",
  "Studi Kasus: Desain Kemasan & Identitas Visual Teh Hijau",
  "Pengalaman & Efisiensi Menggunakan Affinity Suite untuk Desain Digital",
  "Beralih ke Affinity Designer: Workflow Vektor Masa Depan",
  "Hierarki Tipografi Modern untuk Poster dan Desain Antarmuka",
  "Hierarki Tipografi dalam Desain Antarmuka Modern"
]);

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (value === undefined) return null;
    return value;
  }));
}

export function cleanProjects(projs: Project[]): Project[] {
  return (projs || []).filter((p: Project) => {
    if (!p) return false;
    const idStr = String(p.id || '').trim();
    const titleStr = (p.title || '').trim();
    if (!titleStr && !idStr) return false;
    if (DUMMY_PROJECT_IDS.has(idStr)) return false;
    if (DUMMY_PROJECT_TITLES.has(titleStr)) return false;
    // Hanya muat konten gambar yang ditambahkan pengguna
    if (!p.image || typeof p.image !== 'string' || !p.image.trim()) return false;
    return true;
  });
}

export function cleanBlogs(blogs: BlogPost[]): BlogPost[] {
  return (blogs || []).filter((b: BlogPost) => {
    if (!b) return false;
    const idStr = String(b.id || '').trim();
    const titleStr = (b.title || '').trim();
    if (!titleStr && !idStr) return false;
    if (DUMMY_BLOG_IDS.has(idStr)) return false;
    if (DUMMY_BLOG_TITLES.has(titleStr)) return false;
    const rawImg = b.image || (b as any).coverImage;
    if (!rawImg || typeof rawImg !== 'string' || !rawImg.trim()) return false;
    return true;
  });
}
export function cleanTemplates(_templates: TemplateProduct[]): TemplateProduct[] {
  return [];
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
    // Pertahankan semua banner yang ada atau kosong jika dihapus oleh pengguna
    cleaned.heroBanners = cleaned.heroBanners.filter((b: any) => b && typeof b === 'object');
  } else if (cleaned.heroBanners === undefined) {
    cleaned.heroBanners = defaultSettings.heroBanners || [];
  }
  if (Array.isArray(cleaned.promoPosters)) {
    cleaned.promoPosters = cleaned.promoPosters
      .filter((p: any) => p && !p.title?.toLowerCase().includes('template'))
      .map((p: any) => {
        if (p.link && p.link.includes('628112345678')) {
          p.link = p.link.replace('628112345678', '6282394549268');
        }
        return p;
      });
  } else if (cleaned.promoPosters === undefined) {
    cleaned.promoPosters = defaultSettings.promoPosters || [];
  }
  if (cleaned.promoWidgetLink && cleaned.promoWidgetLink.includes('628112345678')) {
    cleaned.promoWidgetLink = cleaned.promoWidgetLink.replace('628112345678', '6282394549268');
  }
  if (cleaned.heroBadge) {
    cleaned.heroBadge = cleaned.heroBadge
      .replace(/portofolio desigh/gi, 'PORTFOLIO DESIGN')
      .replace(/portofolio design/gi, 'PORTFOLIO DESIGN')
      .replace(/my portofolio design/gi, 'PORTFOLIO DESIGN')
      .replace(/portfolio desigh/gi, 'PORTFOLIO DESIGN');
  }
  if (cleaned.heroTitle2) {
    cleaned.heroTitle2 = cleaned.heroTitle2
      .replace(/my portofolio desigh/gi, 'My Portfolio Design')
      .replace(/my portofolio design/gi, 'My Portfolio Design')
      .replace(/portofolio desigh/gi, 'Portfolio Design')
      .replace(/portfolio desigh/gi, 'Portfolio Design');
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

export function setLocalSettings(newSettings: Partial<SiteSettings>): SiteSettings {
  const cleaned = cleanSettings(newSettings);
  const timestamp = Date.now();
  const merged: SiteSettings = { ...defaultSettings, ...cleaned, savedAt: timestamp };
  try {
    localStorage.setItem('app_settings', JSON.stringify(merged));
    if (merged.cvSections || merged.cvPdfFile || merged.cvRole) {
      localStorage.setItem('app_cv_backup', JSON.stringify({
        cvSections: merged.cvSections,
        cvRole: merged.cvRole,
        cvPdfFile: merged.cvPdfFile,
        savedAt: timestamp
      }));
    }
  } catch (e) {
    console.warn("LocalStorage save settings error:", e);
    try {
      localStorage.removeItem('user_projects');
      localStorage.removeItem('blogPosts');
      localStorage.setItem('app_settings', JSON.stringify(merged));
    } catch (e2) {
      console.warn("LocalStorage fallback write failed:", e2);
    }
  }
  window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: merged }));
  return merged;
}

export async function saveStoredSettings(newSettings: SiteSettings): Promise<boolean> {
  // 1. Simpan ke local storage & kirim custom event untuk sinkronisasi antarmuka pengguna
  const merged = setLocalSettings(newSettings);

  // 2. Simpan redundansi ke server disk via /api/settings secara instan
  try {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    }).catch(() => {});
  } catch {}

  // 3. Simpan ke Cloud Firestore (sanitasi undefined value agar tidak ditolak Firestore SDK)
  try {
    const firestoreTasks: Promise<any>[] = [];

    if (merged.cvSections || merged.cvPdfFile || merged.cvRole) {
      firestoreTasks.push(
        setDoc(doc(db, 'settings', 'cv'), cleanForFirestore({
          cvSections: merged.cvSections || [],
          cvPdfFile: merged.cvPdfFile || '',
          cvRole: merged.cvRole || '',
          savedAt: merged.savedAt || Date.now(),
          updatedAt: new Date().toISOString()
        }), { merge: true })
      );
    }

    firestoreTasks.push(
      setDoc(doc(db, 'settings', 'global'), cleanForFirestore(merged), { merge: true })
    );

    // Menunggu operasi Firestore selesai dengan timeout aman
    await Promise.race([
      Promise.all(firestoreTasks),
      new Promise((res) => setTimeout(res, 6000))
    ]);
    return true;
  } catch (e) {
    logFirestoreError(e, OperationType.WRITE, 'settings');
    // Data tetap aman tersimpan di penyimpanan lokal dan server disk
    return true;
  }
}

// 2. PROJECTS
export function getStoredProjects(): Project[] {
  try {
    const saved = localStorage.getItem('user_projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return cleanProjects(parsed);
      }
    }
  } catch(e) {}
  return [];
}

export async function saveStoredProjects(newProjects: Project[]): Promise<void> {
  const clean = cleanProjects(newProjects || []);
  window.dispatchEvent(new CustomEvent('user_projects_updated', { detail: clean }));
  try { localStorage.setItem('user_projects', JSON.stringify(clean)); } catch(e) {}
  try {
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean)
    }).catch(() => {});
  } catch {}
}

// 3. BLOG POSTS
export function getStoredBlogs(): BlogPost[] {
  try {
    const saved = localStorage.getItem('blogPosts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return cleanBlogs(parsed);
      }
    }
  } catch(e) {}
  return [];
}

export async function saveStoredBlogs(newBlogs: BlogPost[]): Promise<void> {
  const clean = (newBlogs || []).filter((b: BlogPost) => b && (b.title || b.id));
  window.dispatchEvent(new CustomEvent('blog_posts_updated', { detail: clean }));
  try { localStorage.setItem('blogPosts', JSON.stringify(clean)); } catch(e) {}
  try {
    fetch('/api/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean)
    }).catch(() => {});
  } catch {}
}

// 4. EXPERIENCES
export function getStoredExperiences(): any[] {
  try {
    const saved = localStorage.getItem('user_experiences');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [];
}

export async function saveStoredExperiences(newExps: any[]): Promise<void> {
  window.dispatchEvent(new CustomEvent('user_experiences_updated', { detail: newExps }));
  try { localStorage.setItem('user_experiences', JSON.stringify(newExps)); } catch(e) {}
  try {
    fetch('/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExps)
    }).catch(() => {});
  } catch {}
}

// 5. TEMPLATES
export function getStoredTemplates(): TemplateProduct[] {
  try {
    const saved = localStorage.getItem('templates');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [];
}

export async function saveStoredTemplates(newTemplates: TemplateProduct[]): Promise<void> {
  const clean = (newTemplates || []).filter((t: TemplateProduct) => t && t.title);
  window.dispatchEvent(new CustomEvent('templates_updated', { detail: clean }));
  try { localStorage.setItem('templates', JSON.stringify(clean)); } catch(e) {}
}
