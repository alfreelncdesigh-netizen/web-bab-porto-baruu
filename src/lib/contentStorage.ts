import { SiteSettings, defaultSettings, defaultCvSections } from '../data/settings';
import { Project } from '../data/projects';
import { BlogPost } from '../types/blog';
import { TemplateProduct } from '../data/templates';
import { db } from './firebase';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType } from './firestoreErrorHandler';

const DUMMY_PROJECT_IDS = new Set([
  'poster-lks-smkn1-sinjai',
  'branding-kemasan-teh-hijau',
  'poster-promosi-diskon-kreatif',
  'showcase-visual-3d-minimalis',
  'banner-informasi-bca-finansial',
  'visual-sosial-media-konten-kreatif',
  'workspace-editing-tools-3d'
]);

const DUMMY_PROJECT_TITLES = new Set([
  'Aplikasi Keuangan FinSmart',
  'Poster Pameran Seni Kontemporer',
  'Platform E-learning EduTech',
  'Identitas Merek Kopi Senja',
  'Poster Festival Musik Indie',
  'Website Studio Arsitektur',
  'Redesain Aplikasi Travel',
  'Aplikasi Kesehatan SehatKu',
  'Poster LKS Desain Grafis SMKN 1 Sinjai',
  'Desain Kemasan & Identitas Visual Teh Hijau',
  'Poster Promosi & Diskon Branding Digital',
  'Eksplorasi Antarmuka Digital & 3D Minimalis',
  'Banner Layanan Transaksi Finansial Digital',
  'Koleksi Visual Kreatif Media Sosial',
  'Suite Kreatif & Workspace Tools 3D'
]);

const DUMMY_BLOG_IDS = new Set([
  'filosofi-desain-minimalis',
  'beralih-ke-affinity-designer',
  'hierarki-tipografi-modern',
  'proses-desain-kemasan-teh-hijau'
]);

const DUMMY_BLOG_TITLES = new Set([
  'Filosofi Desain Minimalis & Fungsional',
  'Filosofi Desain Minimalis: Ketika Kurang Berarti Lebih',
  'Studi Kasus: Desain Kemasan & Identitas Visual Teh Hijau',
  'Pengalaman & Efisiensi Menggunakan Affinity Suite untuk Desain Digital',
  'Beralih ke Affinity Designer: Workflow Vektor Masa Depan',
  'Hierarki Tipografi Modern untuk Poster dan Desain Antarmuka',
  'Hierarki Tipografi dalam Desain Antarmuka Modern'
]);

const ID_MONTH_MAP: Record<string, number> = {
  januari: 0, jan: 0, january: 0,
  februari: 1, feb: 1, february: 1,
  maret: 2, mar: 2, march: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5, june: 5,
  juli: 6, jul: 6, july: 6,
  agustus: 7, agu: 7, agust: 7, aug: 7, august: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, oct: 9, october: 9,
  november: 10, nov: 10, nopember: 10,
  desember: 11, des: 11, dec: 11, december: 11,
};

// In-memory runtime state hydrated exclusively from Cloud Firestore (never from localStorage or mock arrays)
let memorySettings: SiteSettings = { ...defaultSettings };
let memoryProjects: Project[] = [];
let memoryBlogs: BlogPost[] = [];
let memoryExperiences: any[] = [];
let memoryTemplates: TemplateProduct[] = [];

export function getTimestampMs(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val?.toMillis === 'function') {
    try { return val.toMillis(); } catch { return 0; }
  }
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  if (typeof val?._seconds === 'number') return val._seconds * 1000;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d{10,15}$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) ? (trimmed.length === 10 ? n * 1000 : n) : 0;
    }
    if (/^\d{4}$/.test(trimmed)) {
      return new Date(Number(trimmed), 0, 1).getTime();
    }
    const idMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
    if (idMatch) {
      const day = Math.min(31, Math.max(1, Number(idMatch[1])));
      const monthName = idMatch[2].toLowerCase();
      const year = Number(idMatch[3]);
      if (monthName in ID_MONTH_MAP) {
        const month = ID_MONTH_MAP[monthName];
        const maxDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(day, maxDay)).getTime();
      }
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export function getRecencyTimestamp(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const updated = getTimestampMs(item.updatedAt);
  const created = getTimestampMs(item.createdAt);
  const added = getTimestampMs(item.dateAdded);
  const saved = getTimestampMs(item.savedAt);
  const idStr = String(item.id || '').trim();
  const idNum = /^\d{12,15}$/.test(idStr) ? Number(idStr) : 0;
  const dateMs = getTimestampMs(item.date);
  return Math.max(updated, created, added, saved, idNum, dateMs);
}

// Deleted records live directly in Firestore (docs deleted cleanly on Firestore)
export function getDeletedIds(_type: string): Set<string> {
  return new Set<string>();
}

export async function markDeletedIds(_type: string, _ids: (string | number)[]): Promise<void> {
  // No-op: Deletions are performed directly on Firestore collections
}

export async function unmarkDeletedIds(_type: string, _ids: (string | number)[]): Promise<void> {
  // No-op
}

export async function syncDeletedIdsFromServer(): Promise<Record<string, string[]>> {
  return {};
}

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (value === undefined) return null;
    return value;
  }));
}

export function cleanProjects(projs: Project[]): Project[] {
  const seenIds = new Set<string>();
  const cleaned: Project[] = [];

  for (const p of projs || []) {
    if (!p) continue;
    if ((p as any).isArchived === true) continue;
    const idStr = String(p.id || '').trim();
    const titleStr = (p.title || '').trim();
    if (!titleStr && !idStr) continue;
    if (DUMMY_PROJECT_IDS.has(idStr)) continue;
    if (DUMMY_PROJECT_TITLES.has(titleStr)) continue;
    if (idStr && seenIds.has(idStr)) continue;

    const rawImages = Array.isArray(p.images) ? p.images : [];
    const cleanImages = rawImages
      .map((img: any) => (typeof img === 'string' ? img.trim() : ''))
      .filter((img: string) => img.length > 0 && !img.startsWith('blob:') && !img.startsWith('data:'));

    const rawMainImg = typeof p.image === 'string' ? p.image.trim() : '';
    const normImage = rawMainImg && !rawMainImg.startsWith('blob:') && !rawMainImg.startsWith('data:')
      ? rawMainImg
      : (cleanImages[0] || '');

    if (!titleStr && !normImage) continue;

    if (idStr) seenIds.add(idStr);
    cleaned.push({
      ...p,
      id: idStr || p.id,
      title: titleStr || 'Tanpa Judul',
      image: normImage,
      images: cleanImages.length > 0 ? cleanImages : (normImage ? [normImage] : []),
    });
  }

  return cleaned;
}

export function sortProjectsByRecency(projs: Project[]): Project[] {
  return [...(projs || [])].sort((a, b) => {
    const tA = getRecencyTimestamp(a);
    const tB = getRecencyTimestamp(b);
    if (tB !== tA) return tB - tA;
    return (b.date || '').localeCompare(a.date || '');
  });
}

export function mergeProjects(...lists: Project[][]): Project[] {
  const archivedIds = new Set<string>();
  const map = new Map<string, Project>();

  for (const list of lists) {
    for (const item of list || []) {
      if (!item) continue;
      const id = String(item.id || '').trim();
      if (!id) continue;
      if (item.isArchived === true) {
        archivedIds.add(id);
        map.delete(id);
        continue;
      }
      if (archivedIds.has(id)) continue;

      const prev = map.get(id);
      if (!prev) {
        map.set(id, { ...item, id });
      } else {
        const prevTime = Math.max(getTimestampMs(prev.updatedAt), getTimestampMs(prev.createdAt));
        const nextTime = Math.max(getTimestampMs(item.updatedAt), getTimestampMs(item.createdAt));
        const winner = nextTime >= prevTime ? item : prev;
        const loser = winner === item ? prev : item;

        const winnerImgs = Array.isArray(winner.images) ? winner.images.filter(Boolean) : [];
        const loserImgs = Array.isArray(loser.images) ? loser.images.filter(Boolean) : [];
        const combinedImgs = winnerImgs.length >= loserImgs.length
          ? winnerImgs
          : Array.from(new Set([...winnerImgs, ...loserImgs]));

        map.set(id, {
          ...loser,
          ...winner,
          id,
          image: winner.image || combinedImgs[0] || loser.image || '',
          images: combinedImgs,
        });
      }
    }
  }

  return sortProjectsByRecency(cleanProjects(Array.from(map.values())));
}

export function cleanBlogs(blogs: BlogPost[]): BlogPost[] {
  const seenIds = new Set<string>();
  const cleaned: BlogPost[] = [];

  for (const b of blogs || []) {
    if (!b) continue;
    if ((b as any).isArchived === true) continue;
    const idStr = String(b.id || '').trim();
    const titleStr = (b.title || '').trim();
    if (!titleStr && !idStr) continue;
    if (DUMMY_BLOG_IDS.has(idStr)) continue;
    if (DUMMY_BLOG_TITLES.has(titleStr)) continue;
    if (idStr && seenIds.has(idStr)) continue;
    if (idStr) seenIds.add(idStr);

    const rawImg = typeof b.image === 'string' ? b.image.trim() : '';
    cleaned.push({
      ...b,
      id: idStr || b.id,
      image: rawImg.startsWith('blob:') ? '' : rawImg,
    });
  }

  return cleaned;
}

export function sortBlogsByRecency(blogs: BlogPost[]): BlogPost[] {
  return [...(blogs || [])].sort((a, b) => {
    const tA = getRecencyTimestamp(a);
    const tB = getRecencyTimestamp(b);
    if (tB !== tA) return tB - tA;
    return (b.date || '').localeCompare(a.date || '');
  });
}

export function mergeBlogs(...lists: BlogPost[][]): BlogPost[] {
  const archivedIds = new Set<string>();
  const map = new Map<string, BlogPost>();

  for (const list of lists) {
    for (const item of list || []) {
      if (!item) continue;
      const id = String(item.id || '').trim();
      if (!id) continue;
      if (item.isArchived === true) {
        archivedIds.add(id);
        map.delete(id);
        continue;
      }
      if (archivedIds.has(id)) continue;

      const prev = map.get(id);
      if (!prev) {
        map.set(id, { ...item, id });
      } else {
        const prevTime = Math.max(getTimestampMs(prev.updatedAt), getTimestampMs(prev.createdAt));
        const nextTime = Math.max(getTimestampMs(item.updatedAt), getTimestampMs(item.createdAt));
        const winner = nextTime >= prevTime ? item : prev;
        const loser = winner === item ? prev : item;
        map.set(id, { ...loser, ...winner, id });
      }
    }
  }

  return sortBlogsByRecency(cleanBlogs(Array.from(map.values())));
}

export function cleanExperiences(exps: any[]): any[] {
  const seenIds = new Set<string>();
  const cleaned: any[] = [];

  for (const exp of exps || []) {
    if (!exp) continue;
    if (exp.isArchived === true) continue;
    const idStr = String(exp.id || '').trim();
    if (!idStr) continue;
    if (seenIds.has(idStr)) continue;
    seenIds.add(idStr);

    const imgs = (Array.isArray(exp.images) ? exp.images : [])
      .map((img: any) => (typeof img === 'string' ? img.trim() : ''))
      .filter((img: string) => img.length > 0 && !img.startsWith('blob:'));
    const mainImg = typeof exp.image === 'string' && !exp.image.startsWith('blob:') ? exp.image.trim() : '';

    cleaned.push({
      ...exp,
      id: idStr,
      images: imgs.length > 0 ? imgs : (mainImg ? [mainImg] : []),
      image: mainImg || imgs[0] || '',
    });
  }

  return cleaned;
}

export function sortExperiencesByRecency(exps: any[]): any[] {
  return [...(exps || [])].sort((a, b) => getRecencyTimestamp(b) - getRecencyTimestamp(a));
}

export function mergeExperiences(...lists: any[][]): any[] {
  const archivedIds = new Set<string>();
  const map = new Map<string, any>();

  for (const list of lists) {
    for (const item of list || []) {
      if (!item) continue;
      const id = String(item.id || '').trim();
      if (!id) continue;
      if (item.isArchived === true) {
        archivedIds.add(id);
        map.delete(id);
        continue;
      }
      if (archivedIds.has(id)) continue;

      const prev = map.get(id);
      if (!prev) {
        map.set(id, { ...item, id });
      } else {
        const prevTime = getRecencyTimestamp(prev);
        const nextTime = getRecencyTimestamp(item);
        const winner = nextTime >= prevTime ? item : prev;
        const loser = winner === item ? prev : item;

        const winnerImgs = Array.isArray(winner.images) ? winner.images.filter(Boolean) : [];
        const loserImgs = Array.isArray(loser.images) ? loser.images.filter(Boolean) : [];
        const combinedImgs = winnerImgs.length >= loserImgs.length
          ? winnerImgs
          : Array.from(new Set([...winnerImgs, ...loserImgs]));

        map.set(id, {
          ...loser,
          ...winner,
          id,
          images: combinedImgs,
          image: winner.image || combinedImgs[0] || loser.image || '',
        });
      }
    }
  }

  return sortExperiencesByRecency(cleanExperiences(Array.from(map.values())));
}

export function mergeSettingsByTimestamp(current: Partial<SiteSettings>, incoming: Partial<SiteSettings>): SiteSettings {
  const currentTime = getTimestampMs(current?.savedAt || (current as any)?.updatedAt);
  const incomingTime = getTimestampMs(incoming?.savedAt || (incoming as any)?.updatedAt);

  if (currentTime > 0 && incomingTime > 0 && incomingTime < currentTime) {
    return { ...defaultSettings, ...cleanSettings({ ...incoming, ...current, savedAt: currentTime }) } as SiteSettings;
  }

  const cleaned = cleanSettings({
    ...current,
    ...incoming,
    savedAt: Math.max(currentTime, incomingTime) || Date.now()
  });
  return { ...defaultSettings, ...cleaned } as SiteSettings;
}

export function cleanTemplates(_templates: TemplateProduct[]): TemplateProduct[] {
  return [];
}

export function cleanSettings(settings: Partial<SiteSettings>): Partial<SiteSettings> {
  const cleaned = { ...settings };
  if (cleaned.aboutImage && cleaned.aboutImage.includes('photo-1499951360447')) {
    cleaned.aboutImage = '';
  }

  if (cleaned.heroImage === '__RESET_DEFAULT__') {
    cleaned.heroImage = defaultSettings.heroImage;
  } else if (cleaned.heroImage && typeof cleaned.heroImage === 'string' && cleaned.heroImage.trim().length > 0) {
    let hero = cleaned.heroImage.trim();
    const isRemoteHttp = /^https?:\/\//i.test(hero);
    if (!isRemoteHttp) {
      if (hero.includes('hero-albi') || hero.includes('cover_web_') || hero.includes('editing_tools_3d')) {
        hero = '/images/hero-albi.png';
      } else if (hero.includes('/src/assets/images/')) {
        const filename = hero.split('/src/assets/images/')[1];
        hero = `/images/${filename}`;
      } else if (hero.startsWith('src/assets/images/')) {
        hero = `/images/${hero.replace('src/assets/images/', '')}`;
      } else if (hero.startsWith('./assets/images/')) {
        hero = `/images/${hero.replace('./assets/images/', '')}`;
      }
    }
    cleaned.heroImage = hero;
  } else {
    cleaned.heroImage = defaultSettings.heroImage;
  }

  if (Array.isArray(cleaned.cvSections) && cleaned.cvSections.length > 0) {
    cleaned.cvSections = cleaned.cvSections.map((s: any) => {
      let imgs: string[] = [];
      if (Array.isArray(s.images) && s.images.length > 0) {
        imgs = s.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0 && !img.startsWith('blob:'));
      } else if (s.image && typeof s.image === 'string' && s.image.trim().length > 0 && !s.image.startsWith('blob:')) {
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
    const seenBannerIds = new Set<string>();
    cleaned.heroBanners = cleaned.heroBanners
      .filter((b: any) => b && typeof b === 'object')
      .map((b: any, bIdx: number) => {
        let img = b.image || '';
        if (typeof img === 'string' && !/^https?:\/\//i.test(img)) {
          if (img.includes('/src/assets/images/')) {
            img = `/images/${img.split('/src/assets/images/')[1]}`;
          } else if (img.startsWith('src/assets/images/')) {
            img = `/images/${img.replace('src/assets/images/', '')}`;
          }
        }
        let bannerId = (b.id || '').toString().trim();
        if (!bannerId || seenBannerIds.has(bannerId)) {
          bannerId = `banner-${bIdx + 1}`;
          if (seenBannerIds.has(bannerId)) {
            bannerId = `banner-${bIdx + 1}-${Date.now()}`;
          }
        }
        seenBannerIds.add(bannerId);
        return { ...b, id: bannerId, image: img || '/images/banner_promo_bca_1788696791480.jpg' };
      });
    if (cleaned.heroBanners.length === 0) {
      cleaned.heroBanners = defaultSettings.heroBanners || [];
    }
  } else if (cleaned.heroBanners === undefined) {
    cleaned.heroBanners = defaultSettings.heroBanners || [];
  }

  if (Array.isArray(cleaned.promoPosters)) {
    const seenPosterIds = new Set<string>();
    cleaned.promoPosters = cleaned.promoPosters
      .filter((p: any) => p && typeof p === 'object')
      .map((p: any, pIdx: number) => {
        let posterId = (p.id || '').toString().trim();
        if (!posterId || seenPosterIds.has(posterId)) {
          posterId = `poster-${pIdx + 1}`;
          if (seenPosterIds.has(posterId)) {
            posterId = `poster-${pIdx + 1}-${Date.now()}`;
          }
        }
        seenPosterIds.add(posterId);
        const link = p.link && p.link.includes('628112345678')
          ? p.link.replace('628112345678', '6282394549268')
          : p.link;
        return { ...p, id: posterId, link };
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

  if (cleaned.collaboration && typeof cleaned.collaboration === 'object') {
    cleaned.collaboration = {
      enabled: Boolean(cleaned.collaboration.enabled),
      partnerName: (cleaned.collaboration.partnerName || '').trim(),
      partnerLogo: (cleaned.collaboration.partnerLogo || '').trim(),
      collaborationText: (cleaned.collaboration.collaborationText || 'Kolaborasi Bersama').trim(),
      autoTagNewItems: Boolean(cleaned.collaboration.autoTagNewItems),
      collaboratorUsername: cleaned.collaboration.collaboratorUsername,
      collaboratorPassword: cleaned.collaboration.collaboratorPassword,
      collaboratorLoginEnabled: cleaned.collaboration.collaboratorLoginEnabled,
      collaboratorAccounts: cleaned.collaboration.collaboratorAccounts
    };
  } else if (cleaned.collaboration === undefined) {
    cleaned.collaboration = defaultSettings.collaboration;
  }

  if (Array.isArray(cleaned.deletedMessageIds)) {
    cleaned.deletedMessageIds = Array.from(
      new Set(cleaned.deletedMessageIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0))
    );
  } else {
    cleaned.deletedMessageIds = [];
  }

  return cleaned;
}

let inFlightSettingsFetch: Promise<SiteSettings> | null = null;

/**
 * Mengambil seluruh dokumen settings langsung dari Cloud Firestore (settings/global, settings/cv, settings/hero, settings/promoPosters)
 * dengan deduplikasi request bersamaan.
 */
export async function fetchSettingsFromFirestore(): Promise<SiteSettings> {
  if (inFlightSettingsFetch) {
    return inFlightSettingsFetch;
  }

  inFlightSettingsFetch = (async () => {
    try {
      const [snapGlobal, snapCv, snapHero, snapPromo] = await Promise.all([
        getDoc(doc(db, 'settings', 'global')),
        getDoc(doc(db, 'settings', 'cv')).catch(() => null),
        getDoc(doc(db, 'settings', 'hero')).catch(() => null),
        getDoc(doc(db, 'settings', 'promoPosters')).catch(() => null),
      ]);

      const globalData = snapGlobal.exists() ? (snapGlobal.data() as Record<string, any>) : {};
      const cvData = snapCv && snapCv.exists() ? (snapCv.data() as Record<string, any>) : null;
      const heroData = snapHero && snapHero.exists() ? (snapHero.data() as Record<string, any>) : null;
      const promoData = snapPromo && snapPromo.exists() ? (snapPromo.data() as Record<string, any>) : null;

      const combinedRaw: Record<string, any> = {
        ...globalData,
        ...(cvData ? {
          cvSections: (Array.isArray(cvData.cvSections) && cvData.cvSections.length > 0)
            ? cvData.cvSections
            : globalData.cvSections,
          cvRole: cvData.cvRole || globalData.cvRole,
          cvPdfFile: cvData.cvPdfFile !== undefined ? cvData.cvPdfFile : globalData.cvPdfFile,
        } : {}),
        ...(heroData?.heroImage ? { heroImage: heroData.heroImage } : {}),
        ...(promoData ? {
          promoPosters: Array.isArray(promoData.posters) ? promoData.posters : globalData.promoPosters,
          promoWidgetActive: promoData.active !== undefined ? promoData.active : globalData.promoWidgetActive,
        } : {}),
        savedAt: Math.max(
          getTimestampMs(globalData?.savedAt || globalData?.updatedAt),
          getTimestampMs(cvData?.savedAt || cvData?.updatedAt),
          getTimestampMs(heroData?.savedAt || heroData?.updatedAt),
          getTimestampMs(promoData?.savedAt || promoData?.updatedAt)
        ) || Date.now(),
      };

      const merged: SiteSettings = {
        ...defaultSettings,
        ...cleanSettings(combinedRaw),
      } as SiteSettings;

      hasHydratedSettings = true;
      return setLocalSettings(merged);
    } finally {
      inFlightSettingsFetch = null;
    }
  })();

  return inFlightSettingsFetch;
}

// 1. SETTINGS (In-memory cache hydrated from Firestore + CustomEvent broadcast)
export function getStoredSettings(): SiteSettings {
  return memorySettings;
}

export function setLocalSettings(newSettings: Partial<SiteSettings>): SiteSettings {
  const cleaned = cleanSettings(newSettings);
  const timestamp = newSettings.savedAt || Date.now();
  const merged: SiteSettings = { ...defaultSettings, ...cleaned, savedAt: timestamp };
  memorySettings = merged;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: merged }));
  }
  return merged;
}

/**
 * Menyimpan pengaturan situs ke Cloud Firestore dan menunggu hingga seluruh operasi benar-benar selesai.
 * Melempar error asli jika penulisan ke Firestore gagal (tidak pernah memberi status sukses palsu).
 */
export async function saveStoredSettings(newSettings: SiteSettings): Promise<boolean> {
  const cleaned = cleanSettings(newSettings);
  const timestamp = Date.now();
  const merged: SiteSettings = { ...defaultSettings, ...cleaned, savedAt: timestamp };

  try {
    const firestoreTasks: Promise<any>[] = [];

    // 1. settings/hero
    const heroImageVal = (newSettings as any).heroImage === '__RESET_DEFAULT__'
      ? defaultSettings.heroImage
      : (merged.heroImage || defaultSettings.heroImage);

    firestoreTasks.push(
      setDoc(
        doc(db, 'settings', 'hero'),
        cleanForFirestore({
          heroImage: heroImageVal,
          savedAt: timestamp,
          updatedAt: new Date().toISOString(),
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true
        }),
        { merge: true }
      )
    );

    // 2. settings/cv
    if (merged.cvSections || merged.cvPdfFile !== undefined || merged.cvRole) {
      firestoreTasks.push(
        setDoc(
          doc(db, 'settings', 'cv'),
          cleanForFirestore({
            cvSections: merged.cvSections || [],
            cvPdfFile: merged.cvPdfFile || '',
            cvRole: merged.cvRole || '',
            savedAt: timestamp,
            updatedAt: new Date().toISOString(),
            _adminAuth: 'alfreelnc_admin_auth_verified',
            updatedByAdmin: true
          }),
          { merge: true }
        )
      );
    }

    // 3. settings/promoPosters
    if (Array.isArray(merged.promoPosters)) {
      const safePosters = merged.promoPosters.map((p: any) => {
        const { dataUrl: _drop, ...rest } = p;
        return rest;
      });
      firestoreTasks.push(
        setDoc(
          doc(db, 'settings', 'promoPosters'),
          cleanForFirestore({
            posters: safePosters,
            active: merged.promoWidgetActive !== false,
            updatedAt: new Date().toISOString(),
            savedAt: timestamp,
            _adminAuth: 'alfreelnc_admin_auth_verified',
            updatedByAdmin: true
          }),
          { merge: true }
        )
      );
    }

    // 4. settings/global
    const safeGlobalPayload: Record<string, any> = {
      ...merged,
      heroImage: heroImageVal,
      savedAt: timestamp,
      updatedAt: new Date().toISOString(),
      _adminAuth: 'alfreelnc_admin_auth_verified',
      updatedByAdmin: true
    };
    delete safeGlobalPayload.heroImageDataUrl;
    if (Array.isArray(safeGlobalPayload.promoPosters)) {
      safeGlobalPayload.promoPosters = safeGlobalPayload.promoPosters.map((p: any) => {
        const { dataUrl: _drop, ...rest } = p;
        return rest;
      });
    }

    firestoreTasks.push(
      setDoc(doc(db, 'settings', 'global'), cleanForFirestore(safeGlobalPayload), { merge: true })
    );

    await Promise.all(firestoreTasks);

    // Hanya update state in-memory & broadcast setelah Firestore benar-benar selesai
    setLocalSettings({ ...merged, heroImage: heroImageVal });
    return true;
  } catch (e) {
    logFirestoreError(e, OperationType.WRITE, 'settings');
    throw e;
  }
}

// 2. PROJECTS (In-memory cache hydrated ONLY from Cloud Firestore)
export function getStoredProjects(): Project[] {
  return memoryProjects;
}

export async function saveStoredProjects(newProjects: Project[]): Promise<void> {
  const clean = sortProjectsByRecency(cleanProjects(newProjects || []));
  memoryProjects = clean;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_projects_updated', { detail: clean }));
  }
}

// 3. BLOG POSTS (In-memory cache hydrated ONLY from Cloud Firestore)
export function getStoredBlogs(): BlogPost[] {
  return memoryBlogs;
}

export async function saveStoredBlogs(newBlogs: BlogPost[]): Promise<void> {
  const clean = sortBlogsByRecency(cleanBlogs(newBlogs || []));
  memoryBlogs = clean;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('blog_posts_updated', { detail: clean }));
  }
}

// 4. EXPERIENCES (In-memory cache hydrated ONLY from Cloud Firestore)
export function getStoredExperiences(): any[] {
  return memoryExperiences;
}

export async function saveStoredExperiences(newExps: any[]): Promise<void> {
  const clean = sortExperiencesByRecency(cleanExperiences(newExps || []));
  memoryExperiences = clean;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_experiences_updated', { detail: clean }));
  }
}

// 5. TEMPLATES (In-memory cache hydrated ONLY from Cloud Firestore)
export function getStoredTemplates(): TemplateProduct[] {
  return memoryTemplates;
}

export async function saveStoredTemplates(newTemplates: TemplateProduct[]): Promise<void> {
  const clean = (newTemplates || []).filter((t: TemplateProduct) => t && t.title);
  memoryTemplates = clean;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('templates_updated', { detail: clean }));
  }
}

// 6. SINGLETON REAL-TIME SUBSCRIPTION HUBS (Mencegah pembacaan & onSnapshot duplikat antar komponen)
let hasHydratedSettings = false;
let settingsSubActive = false;
const settingsCallbacks = new Set<(settings: SiteSettings) => void>();

let hasHydratedCv = false;
let cvSubActive = false;
const cvCallbacks = new Set<(settings: SiteSettings) => void>();

let hasHydratedProjects = false;
let projectsSubActive = false;
const projectCallbacks = new Set<(projects: Project[]) => void>();

let hasHydratedBlogs = false;
let blogsSubActive = false;
const blogCallbacks = new Set<(blogs: BlogPost[]) => void>();

let hasHydratedExperiences = false;
let experiencesSubActive = false;
const experienceCallbacks = new Set<(exps: any[]) => void>();

function notifySettingsCallbacks(next: SiteSettings) {
  settingsCallbacks.forEach(cb => {
    try { cb(next); } catch {}
  });
  cvCallbacks.forEach(cb => {
    try { cb(next); } catch {}
  });
}

export function subscribeSettingsRealtime(cb?: (settings: SiteSettings) => void): () => void {
  if (cb) {
    settingsCallbacks.add(cb);
    if (hasHydratedSettings) {
      try { cb(memorySettings); } catch {}
    }
  }

  if (!settingsSubActive && typeof window !== 'undefined') {
    settingsSubActive = true;

    onSnapshot(
      doc(db, 'settings', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as Partial<SiteSettings>;
          if (cloudData && Object.keys(cloudData).length > 0) {
            const currentSaved = getTimestampMs(memorySettings?.savedAt);
            const incomingSaved = getTimestampMs(cloudData?.savedAt || (cloudData as any)?.updatedAt);
            const merged = (!hasHydratedSettings || incomingSaved >= currentSaved)
              ? setLocalSettings({ ...memorySettings, ...cloudData, savedAt: incomingSaved || Date.now() })
              : memorySettings;
            hasHydratedSettings = true;
            notifySettingsCallbacks(merged);
            return;
          }
        }
        hasHydratedSettings = true;
        notifySettingsCallbacks(memorySettings);
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/global');
        hasHydratedSettings = true;
        notifySettingsCallbacks(memorySettings);
      }
    );
  }

  return () => {
    if (cb) settingsCallbacks.delete(cb);
  };
}

export function subscribeCvRealtime(cb?: (settings: SiteSettings) => void): () => void {
  const unsubBase = subscribeSettingsRealtime();
  if (cb) {
    cvCallbacks.add(cb);
    if (hasHydratedCv || hasHydratedSettings) {
      try { cb(memorySettings); } catch {}
    }
  }

  if (!cvSubActive && typeof window !== 'undefined') {
    cvSubActive = true;
    onSnapshot(
      doc(db, 'settings', 'cv'),
      (cvSnap) => {
        if (cvSnap.exists()) {
          const cvData = cvSnap.data();
          const cleanedCvSections = Array.isArray(cvData.cvSections)
            ? cvData.cvSections.map((s: any) => ({
                title: s.title || '',
                content: s.content || '',
                images: Array.isArray(s.images)
                  ? s.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0 && !img.startsWith('blob:'))
                  : (s.image && !s.image.startsWith('blob:') ? [s.image.trim()] : [])
              }))
            : undefined;
          const updated = setLocalSettings({
            ...memorySettings,
            cvRole: cvData.cvRole || memorySettings.cvRole,
            cvPdfFile: cvData.cvPdfFile !== undefined ? cvData.cvPdfFile : memorySettings.cvPdfFile,
            ...(cleanedCvSections && cleanedCvSections.length > 0 ? { cvSections: cleanedCvSections } : {}),
            savedAt: Math.max(getTimestampMs(memorySettings.savedAt), getTimestampMs(cvData.savedAt || cvData.updatedAt)) || Date.now(),
          });
          hasHydratedCv = true;
          notifySettingsCallbacks(updated);
          return;
        }
        hasHydratedCv = true;
        notifySettingsCallbacks(memorySettings);
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/cv');
        hasHydratedCv = true;
        notifySettingsCallbacks(memorySettings);
      }
    );
  }

  return () => {
    unsubBase();
    if (cb) cvCallbacks.delete(cb);
  };
}

export function subscribeProjectsRealtime(cb?: (projects: Project[]) => void): () => void {
  if (cb) {
    projectCallbacks.add(cb);
    if (hasHydratedProjects) {
      try { cb(memoryProjects); } catch {}
    }
  }

  if (!projectsSubActive && typeof window !== 'undefined') {
    projectsSubActive = true;
    onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const projData: Project[] = [];
        snapshot.forEach((docSnap) => {
          projData.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        const sorted = sortProjectsByRecency(cleanProjects(projData));
        hasHydratedProjects = true;
        saveStoredProjects(sorted);
        projectCallbacks.forEach(fn => {
          try { fn(sorted); } catch {}
        });
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'projects');
        hasHydratedProjects = true;
        projectCallbacks.forEach(fn => {
          try { fn(memoryProjects); } catch {}
        });
      }
    );
  }

  return () => {
    if (cb) projectCallbacks.delete(cb);
  };
}

export function subscribeBlogsRealtime(cb?: (blogs: BlogPost[]) => void): () => void {
  if (cb) {
    blogCallbacks.add(cb);
    if (hasHydratedBlogs) {
      try { cb(memoryBlogs); } catch {}
    }
  }

  if (!blogsSubActive && typeof window !== 'undefined') {
    blogsSubActive = true;
    onSnapshot(
      collection(db, 'blogPosts'),
      (snapshot) => {
        const loadedPosts: BlogPost[] = [];
        snapshot.forEach((docSnap) => {
          loadedPosts.push({ id: docSnap.id, ...(docSnap.data() as any) } as BlogPost);
        });
        const sorted = sortBlogsByRecency(cleanBlogs(loadedPosts));
        hasHydratedBlogs = true;
        saveStoredBlogs(sorted);
        blogCallbacks.forEach(fn => {
          try { fn(sorted); } catch {}
        });
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'blogPosts');
        hasHydratedBlogs = true;
        blogCallbacks.forEach(fn => {
          try { fn(memoryBlogs); } catch {}
        });
      }
    );
  }

  return () => {
    if (cb) blogCallbacks.delete(cb);
  };
}

export function subscribeExperiencesRealtime(cb?: (exps: any[]) => void): () => void {
  if (cb) {
    experienceCallbacks.add(cb);
    if (hasHydratedExperiences) {
      try { cb(memoryExperiences); } catch {}
    }
  }

  if (!experiencesSubActive && typeof window !== 'undefined') {
    experiencesSubActive = true;
    onSnapshot(
      collection(db, 'experiences'),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((d) => {
          data.push({ id: d.id, ...(d.data() as any) });
        });
        const sorted = sortExperiencesByRecency(cleanExperiences(data));
        hasHydratedExperiences = true;
        saveStoredExperiences(sorted);
        experienceCallbacks.forEach(fn => {
          try { fn(sorted); } catch {}
        });
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'experiences');
        hasHydratedExperiences = true;
        experienceCallbacks.forEach(fn => {
          try { fn(memoryExperiences); } catch {}
        });
      }
    );
  }

  return () => {
    if (cb) experienceCallbacks.delete(cb);
  };
}
