import { SiteSettings, defaultSettings, defaultCvSections } from '../types/site';
import { Project } from '../types/project';
import { BlogPost } from '../types/blog';
import { TemplateProduct } from '../types/store';
import { sanitizeMediaUrl } from './imageResolver';

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

// In-memory runtime state hydrated from Vercel Blob JSON API routes (never from localStorage or Firestore for migrated features)
let memorySettings: SiteSettings = { ...defaultSettings };
let memoryProjects: Project[] = [];
let memoryBlogs: BlogPost[] = [];
let memoryExperiences: any[] = [];
let memoryTemplates: TemplateProduct[] = [];

const ADMIN_AUTH_TOKEN = 'alfreelnc_admin_auth_verified';
const BASE64_URI_REGEX = /^data:(image|application\/pdf|video|audio)\/[a-zA-Z0-9.+_-]+;base64,/i;

export interface ContentBlobErrors {
  settings: string | null;
  cv: string | null;
  projects: string | null;
  experiences: string | null;
  blogs: string | null;
}

const contentBlobErrors: ContentBlobErrors = {
  settings: null,
  cv: null,
  projects: null,
  experiences: null,
  blogs: null,
};

const contentErrorCallbacks = new Set<(errors: ContentBlobErrors) => void>();

export function getContentBlobErrors(): ContentBlobErrors {
  return { ...contentBlobErrors };
}

export function subscribeContentBlobErrors(cb: (errors: ContentBlobErrors) => void): () => void {
  contentErrorCallbacks.add(cb);
  try {
    cb({ ...contentBlobErrors });
  } catch {}
  return () => {
    contentErrorCallbacks.delete(cb);
  };
}

function setContentBlobError(key: keyof ContentBlobErrors, msg: string | null): void {
  if (contentBlobErrors[key] === msg) return;
  contentBlobErrors[key] = msg;
  const snapshot = { ...contentBlobErrors };
  contentErrorCallbacks.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('content_blob_errors_updated', { detail: snapshot }));
  }
}

function assertNoBase64Payload(value: unknown, path = 'payload'): void {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (BASE64_URI_REGEX.test(trimmed)) {
      throw new Error(`Data base64 tidak diizinkan pada "${path}". Silakan unggah file ke Vercel Blob terlebih dahulu.`);
    }
    if (trimmed.startsWith('blob:')) {
      throw new Error(`URL sementara "blob:" tidak dapat disimpan pada "${path}".`);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertNoBase64Payload(value[i], `${path}[${i}]`);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      assertNoBase64Payload(v, `${path}.${k}`);
    }
  }
}

async function parseApiJson<T = any>(res: Response, fallbackMessage: string): Promise<T> {
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg = parsed?.error || `${fallbackMessage} (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

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
      .map((img: any) => sanitizeMediaUrl(typeof img === 'string' ? img : ''))
      .filter((img: string) => img.length > 0 && !img.startsWith('data:'));

    const rawMainImg = sanitizeMediaUrl(typeof p.image === 'string' ? p.image : '');
    const normImage =
      rawMainImg && !rawMainImg.startsWith('data:')
        ? rawMainImg
        : cleanImages[0] || '';

    if (!titleStr && !normImage) continue;

    if (idStr) seenIds.add(idStr);
    cleaned.push({
      ...p,
      id: idStr || p.id,
      title: titleStr || 'Tanpa Judul',
      image: normImage,
      images: cleanImages.length > 0 ? cleanImages : (normImage ? [normImage] : []),
      ...(p.collaborationLogo ? { collaborationLogo: sanitizeMediaUrl(p.collaborationLogo) } : {}),
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

    const rawImg = sanitizeMediaUrl(typeof b.image === 'string' ? b.image : '');
    cleaned.push({
      ...b,
      id: idStr || b.id,
      image: rawImg.startsWith('data:') ? '' : rawImg,
      ...(b.collaborationLogo ? { collaborationLogo: sanitizeMediaUrl(b.collaborationLogo) } : {}),
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
      .map((img: any) => sanitizeMediaUrl(typeof img === 'string' ? img : ''))
      .filter((img: string) => img.length > 0 && !img.startsWith('data:'));
    const rawMainImg = sanitizeMediaUrl(typeof exp.image === 'string' ? exp.image : '');
    const mainImg = rawMainImg.startsWith('data:') ? '' : rawMainImg;

    cleaned.push({
      ...exp,
      id: idStr,
      images: imgs.length > 0 ? imgs : (mainImg ? [mainImg] : []),
      image: mainImg || imgs[0] || '',
      ...(exp.collaborationLogo ? { collaborationLogo: sanitizeMediaUrl(exp.collaborationLogo) } : {}),
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
  if (cleaned.aboutImage) {
    if (cleaned.aboutImage.includes('photo-1499951360447')) {
      cleaned.aboutImage = '';
    } else {
      cleaned.aboutImage = sanitizeMediaUrl(cleaned.aboutImage);
    }
  }

  if (cleaned.heroImage === '__RESET_DEFAULT__') {
    cleaned.heroImage = defaultSettings.heroImage;
  } else if (cleaned.heroImage && typeof cleaned.heroImage === 'string' && cleaned.heroImage.trim().length > 0) {
    const rawHero = cleaned.heroImage.trim();
    if (rawHero.includes('hero-albi') || rawHero.includes('cover_web_') || rawHero.includes('editing_tools_3d')) {
      cleaned.heroImage = '/images/hero-albi.png';
    } else {
      cleaned.heroImage = sanitizeMediaUrl(rawHero) || defaultSettings.heroImage;
    }
  } else {
    cleaned.heroImage = defaultSettings.heroImage;
  }

  if (cleaned.promoWidgetImage) {
    cleaned.promoWidgetImage = sanitizeMediaUrl(cleaned.promoWidgetImage);
  }

  if (Array.isArray(cleaned.cvSections) && cleaned.cvSections.length > 0) {
    cleaned.cvSections = cleaned.cvSections.map((s: any) => {
      let imgs: string[] = [];
      if (Array.isArray(s.images) && s.images.length > 0) {
        imgs = s.images
          .map((img: any) => sanitizeMediaUrl(typeof img === 'string' ? img : ''))
          .filter((img: string) => img.length > 0 && !img.startsWith('data:'));
      } else if (s.image && typeof s.image === 'string' && s.image.trim().length > 0) {
        const single = sanitizeMediaUrl(s.image);
        if (single && !single.startsWith('data:')) {
          imgs = [single];
        }
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
        const img = sanitizeMediaUrl(typeof b.image === 'string' ? b.image : '');
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
        const cleanPosterImage = sanitizeMediaUrl(typeof p.image === 'string' ? p.image : '');
        const { dataUrl: _drop, ...restPoster } = p;
        return { ...restPoster, id: posterId, image: cleanPosterImage, link };
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
      partnerLogo: sanitizeMediaUrl(cleaned.collaboration.partnerLogo || ''),
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
let inFlightProjectsFetch: Promise<Project[]> | null = null;
let inFlightExperiencesFetch: Promise<any[]> | null = null;

/**
 * Mengambil pengaturan situs dari Vercel Blob (data/site-settings.json)
 */
export async function fetchSiteSettingsFromBlob(): Promise<Partial<SiteSettings>> {
  const res = await fetch('/api/site-settings', {
    method: 'GET',
    cache: 'no-store',
  });
  const data = await parseApiJson<{ settings?: Partial<SiteSettings> }>(
    res,
    'Gagal memuat pengaturan situs dari Vercel Blob'
  );
  setContentBlobError('settings', null);
  return data?.settings || {};
}

/**
 * Mengambil data CV dari Vercel Blob (data/cv.json)
 */
export async function fetchCvFromBlob(): Promise<{ cvRole?: string; cvPdfFile?: string; cvSections?: any[]; updatedAt?: string }> {
  const res = await fetch('/api/cv', {
    method: 'GET',
    cache: 'no-store',
  });
  const data = await parseApiJson<{ cv?: { cvRole?: string; cvPdfFile?: string; cvSections?: any[]; updatedAt?: string } }>(
    res,
    'Gagal memuat data CV dari Vercel Blob'
  );
  setContentBlobError('cv', null);
  return data?.cv || {};
}

/**
 * Mengambil gabungan pengaturan situs (data/site-settings.json) dan CV (data/cv.json) dari Vercel Blob
 * dengan deduplikasi request bersamaan.
 */
export async function fetchSettingsFromBlob(): Promise<SiteSettings> {
  if (inFlightSettingsFetch) {
    return inFlightSettingsFetch;
  }

  inFlightSettingsFetch = (async () => {
    try {
      const [siteRes, cvRes] = await Promise.allSettled([
        fetchSiteSettingsFromBlob(),
        fetchCvFromBlob(),
      ]);

      const siteErr = siteRes.status === 'rejected'
        ? (siteRes.reason?.message || 'Gagal membaca data/site-settings.json dari Vercel Blob.')
        : null;
      const cvErr = cvRes.status === 'rejected'
        ? (cvRes.reason?.message || 'Gagal membaca data/cv.json dari Vercel Blob.')
        : null;

      setContentBlobError('settings', siteErr);
      setContentBlobError('cv', cvErr);

      if (siteRes.status === 'rejected' && cvRes.status === 'rejected') {
        throw new Error(siteErr || cvErr || 'Gagal memuat data dari Vercel Blob.');
      }

      const siteData = siteRes.status === 'fulfilled' ? siteRes.value : {};
      const cvData = cvRes.status === 'fulfilled' ? cvRes.value : {};

      const combinedRaw: Record<string, any> = {
        ...memorySettings,
        ...siteData,
        ...(cvRes.status === 'fulfilled'
          ? {
              cvRole: cvData.cvRole || memorySettings.cvRole || defaultSettings.cvRole,
              cvPdfFile: cvData.cvPdfFile !== undefined ? cvData.cvPdfFile : memorySettings.cvPdfFile,
              cvSections:
                Array.isArray(cvData.cvSections) && cvData.cvSections.length > 0
                  ? cvData.cvSections
                  : memorySettings.cvSections || defaultCvSections,
            }
          : {}),
        savedAt:
          Math.max(
            getTimestampMs((siteData as any)?.savedAt || (siteData as any)?.updatedAt),
            getTimestampMs((cvData as any)?.updatedAt)
          ) || Date.now(),
      };

      const merged: SiteSettings = {
        ...defaultSettings,
        ...cleanSettings(combinedRaw),
      } as SiteSettings;

      hasHydratedSettings = true;
      if (cvRes.status === 'fulfilled') {
        hasHydratedCv = true;
      }
      const next = setLocalSettings(merged);
      notifySettingsCallbacks(next);
      return next;
    } finally {
      inFlightSettingsFetch = null;
    }
  })();

  return inFlightSettingsFetch;
}

/**
 * Alias kompatibilitas untuk memanggil fetchSettingsFromBlob()
 */
export async function fetchSettingsFromFirestore(): Promise<SiteSettings> {
  return fetchSettingsFromBlob();
}

// 1. SETTINGS (In-memory cache hydrated from Vercel Blob API + CustomEvent broadcast)
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
 * Menyimpan data CV ke Vercel Blob (data/cv.json)
 */
export async function saveCvToBlob(payload: {
  cvRole?: string;
  cvPdfFile?: string;
  cvSections?: any[];
}): Promise<any> {
  const cleanPayload = {
    cvRole: payload.cvRole ?? memorySettings.cvRole ?? 'Desainer Grafis',
    cvPdfFile: payload.cvPdfFile ?? memorySettings.cvPdfFile ?? '',
    cvSections: Array.isArray(payload.cvSections) ? payload.cvSections : memorySettings.cvSections || defaultCvSections,
  };
  assertNoBase64Payload(cleanPayload, 'cv');

  const res = await fetch('/api/cv', {
    method: 'PUT',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify({ cv: cleanPayload }),
  });

  const data = await parseApiJson<{ cv: any }>(res, 'Gagal menyimpan data CV ke Vercel Blob');
  setContentBlobError('cv', null);
  return data?.cv || cleanPayload;
}

/**
 * Menyimpan pengaturan situs ke Vercel Blob (data/site-settings.json dan data/cv.json)
 */
export async function saveStoredSettings(newSettings: SiteSettings): Promise<boolean> {
  const isResetHero = (newSettings as any).heroImage === '__RESET_DEFAULT__';
  const cleaned = cleanSettings(newSettings);
  const timestamp = Date.now();
  const heroImageVal = isResetHero ? '__RESET_DEFAULT__' : (cleaned.heroImage || defaultSettings.heroImage);
  const merged: SiteSettings = { ...defaultSettings, ...cleaned, savedAt: timestamp };

  const safePosters = Array.isArray(merged.promoPosters)
    ? merged.promoPosters.map((p: any) => {
        const { dataUrl: _drop, ...rest } = p;
        return rest;
      })
    : [];

  const sitePayload: Record<string, any> = {
    ...merged,
    heroImage: heroImageVal,
    promoPosters: safePosters,
    savedAt: timestamp,
  };
  delete sitePayload.cvRole;
  delete sitePayload.cvPdfFile;
  delete sitePayload.cvSections;
  delete sitePayload.heroImageDataUrl;

  assertNoBase64Payload(sitePayload, 'site-settings');

  const hasCvPayload =
    newSettings.cvSections !== undefined ||
    newSettings.cvPdfFile !== undefined ||
    newSettings.cvRole !== undefined;

  const cvPayload = {
    cvRole: merged.cvRole || 'Desainer Grafis',
    cvPdfFile: merged.cvPdfFile || '',
    cvSections: merged.cvSections || defaultCvSections,
  };

  if (hasCvPayload) {
    assertNoBase64Payload(cvPayload, 'cv');
  }

  const tasks: Promise<any>[] = [
    fetch('/api/site-settings', {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_AUTH_TOKEN,
      },
      body: JSON.stringify({ settings: sitePayload }),
    }).then((r) => parseApiJson<{ settings?: Partial<SiteSettings> }>(r, 'Gagal menyimpan pengaturan situs ke Vercel Blob')),
  ];

  if (hasCvPayload) {
    tasks.push(saveCvToBlob(cvPayload));
  }

  const [savedSiteResp, savedCvResp] = await Promise.all(tasks);
  const finalSettings: SiteSettings = {
    ...merged,
    ...(savedSiteResp?.settings || {}),
    ...(savedCvResp || {}),
    heroImage: savedSiteResp?.settings?.heroImage || (isResetHero ? defaultSettings.heroImage : merged.heroImage),
    savedAt: timestamp,
  };

  setContentBlobError('settings', null);
  if (hasCvPayload) setContentBlobError('cv', null);

  hasHydratedSettings = true;
  if (hasCvPayload) hasHydratedCv = true;
  const updated = setLocalSettings(finalSettings);
  notifySettingsCallbacks(updated);
  return true;
}

// 2. PROJECTS (In-memory cache hydrated from Vercel Blob data/portfolio.json)
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

export async function fetchProjectsFromBlob(options?: { includeArchived?: boolean }): Promise<Project[]> {
  const includeArchived = Boolean(options?.includeArchived);
  if (!includeArchived && inFlightProjectsFetch) {
    return inFlightProjectsFetch;
  }

  const run = (async () => {
    try {
      const url = includeArchived ? '/api/portfolio?includeArchived=true' : '/api/portfolio';
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const data = await parseApiJson<{ items?: Project[] }>(
        res,
        'Gagal memuat daftar karya dari Vercel Blob'
      );
      setContentBlobError('projects', null);
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      if (includeArchived) {
        return rawItems;
      }
      const sorted = sortProjectsByRecency(cleanProjects(rawItems));
      hasHydratedProjects = true;
      await saveStoredProjects(sorted);
      projectCallbacks.forEach((fn) => {
        try {
          fn(sorted);
        } catch {}
      });
      return sorted;
    } catch (err: any) {
      if (!includeArchived) {
        setContentBlobError('projects', err?.message || 'Gagal memuat daftar karya dari Vercel Blob.');
      }
      throw err;
    } finally {
      if (!includeArchived) {
        inFlightProjectsFetch = null;
      }
    }
  })();

  if (!includeArchived) {
    inFlightProjectsFetch = run;
  }
  return run;
}

export async function saveProjectToBlob(
  project: Project,
  options?: { baseUpdatedAt?: number }
): Promise<{ item: Project; items: Project[] }> {
  assertNoBase64Payload(project, 'portfolio');
  const res = await fetch('/api/portfolio', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify({
      project,
      ...(typeof options?.baseUpdatedAt === 'number' && options.baseUpdatedAt > 0
        ? { baseUpdatedAt: options.baseUpdatedAt }
        : {}),
    }),
  });
  const data = await parseApiJson<{ item: Project; items?: Project[] }>(
    res,
    'Gagal menyimpan karya ke Vercel Blob'
  );
  setContentBlobError('projects', null);
  const sorted = sortProjectsByRecency(cleanProjects(Array.isArray(data?.items) ? data.items : [data.item]));
  hasHydratedProjects = true;
  await saveStoredProjects(sorted);
  projectCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return { item: data.item, items: sorted };
}

export async function patchProjectInBlob(payload: {
  id?: string;
  ids?: string[];
  updates: Record<string, any>;
}): Promise<Project[]> {
  assertNoBase64Payload(payload.updates, 'portfolio');
  const res = await fetch('/api/portfolio', {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ items?: Project[] }>(
    res,
    'Gagal memperbarui status karya di Vercel Blob'
  );
  setContentBlobError('projects', null);
  const sorted = sortProjectsByRecency(cleanProjects(Array.isArray(data?.items) ? data.items : []));
  hasHydratedProjects = true;
  await saveStoredProjects(sorted);
  projectCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return sorted;
}

export async function deleteProjectFromBlob(idOrIds: string | string[]): Promise<Project[]> {
  const payload = Array.isArray(idOrIds) ? { ids: idOrIds } : { id: idOrIds };
  const res = await fetch('/api/portfolio', {
    method: 'DELETE',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ items?: Project[] }>(
    res,
    'Gagal menghapus karya dari Vercel Blob'
  );
  setContentBlobError('projects', null);
  const sorted = sortProjectsByRecency(cleanProjects(Array.isArray(data?.items) ? data.items : []));
  hasHydratedProjects = true;
  await saveStoredProjects(sorted);
  projectCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return sorted;
}

// 3. BLOG POSTS (In-memory cache hydrated from /api/blogs Vercel Blob JSON)
let inFlightBlogsFetch: Promise<BlogPost[]> | null = null;

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

export async function fetchBlogsFromBlob(options?: { includeArchived?: boolean }): Promise<BlogPost[]> {
  const includeArchived = Boolean(options?.includeArchived);
  if (!includeArchived && inFlightBlogsFetch) {
    return inFlightBlogsFetch;
  }

  const run = (async () => {
    try {
      const url = includeArchived ? '/api/blogs?includeArchived=true' : '/api/blogs';
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const data = await parseApiJson<{ items?: BlogPost[] }>(
        res,
        'Gagal memuat artikel blog dari Vercel Blob'
      );
      setContentBlobError('blogs', null);
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      if (includeArchived) {
        return rawItems;
      }
      const sorted = sortBlogsByRecency(cleanBlogs(rawItems));
      hasHydratedBlogs = true;
      await saveStoredBlogs(sorted);
      blogCallbacks.forEach((fn) => {
        try {
          fn(sorted);
        } catch {}
      });
      return sorted;
    } catch (err: any) {
      if (!includeArchived) {
        setContentBlobError('blogs', err?.message || 'Gagal memuat artikel blog dari Vercel Blob.');
      }
      throw err;
    } finally {
      if (!includeArchived) {
        inFlightBlogsFetch = null;
      }
    }
  })();

  if (!includeArchived) {
    inFlightBlogsFetch = run;
  }
  return run;
}

export async function saveBlogToBlob(post: BlogPost): Promise<{ item: BlogPost; items: BlogPost[] }> {
  assertNoBase64Payload(post, 'blog');
  const res = await fetch('/api/blogs', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify({ post }),
  });
  const data = await parseApiJson<{ item: BlogPost; items?: BlogPost[] }>(
    res,
    'Gagal menyimpan artikel blog ke Vercel Blob'
  );
  setContentBlobError('blogs', null);
  const sorted = sortBlogsByRecency(cleanBlogs(Array.isArray(data?.items) ? data.items : [data.item]));
  hasHydratedBlogs = true;
  await saveStoredBlogs(sorted);
  blogCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return { item: data.item, items: sorted };
}

export async function patchBlogInBlob(payload: {
  id?: string;
  ids?: string[];
  updates: Record<string, any>;
}): Promise<BlogPost[]> {
  assertNoBase64Payload(payload.updates, 'blog');
  const res = await fetch('/api/blogs', {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ items?: BlogPost[] }>(
    res,
    'Gagal memperbarui artikel blog di Vercel Blob'
  );
  setContentBlobError('blogs', null);
  const sorted = sortBlogsByRecency(cleanBlogs(Array.isArray(data?.items) ? data.items : []));
  hasHydratedBlogs = true;
  await saveStoredBlogs(sorted);
  blogCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return sorted;
}

export async function deleteBlogFromBlob(idOrIds: string | string[]): Promise<BlogPost[]> {
  const payload = Array.isArray(idOrIds) ? { ids: idOrIds } : { id: idOrIds };
  const res = await fetch('/api/blogs', {
    method: 'DELETE',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ items?: BlogPost[] }>(
    res,
    'Gagal menghapus artikel blog dari Vercel Blob'
  );
  setContentBlobError('blogs', null);
  const sorted = sortBlogsByRecency(cleanBlogs(Array.isArray(data?.items) ? data.items : []));
  hasHydratedBlogs = true;
  await saveStoredBlogs(sorted);
  blogCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return sorted;
}

// 4. EXPERIENCES (In-memory cache hydrated from Vercel Blob data/experience.json)
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

export async function fetchExperiencesFromBlob(options?: { includeArchived?: boolean }): Promise<any[]> {
  const includeArchived = Boolean(options?.includeArchived);
  if (!includeArchived && inFlightExperiencesFetch) {
    return inFlightExperiencesFetch;
  }

  const run = (async () => {
    try {
      const url = includeArchived ? '/api/experience?includeArchived=true' : '/api/experience';
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const data = await parseApiJson<{ items?: any[] }>(
        res,
        'Gagal memuat data pengalaman dari Vercel Blob'
      );
      setContentBlobError('experiences', null);
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      if (includeArchived) {
        return rawItems;
      }
      const sorted = sortExperiencesByRecency(cleanExperiences(rawItems));
      hasHydratedExperiences = true;
      await saveStoredExperiences(sorted);
      experienceCallbacks.forEach((fn) => {
        try {
          fn(sorted);
        } catch {}
      });
      return sorted;
    } catch (err: any) {
      if (!includeArchived) {
        setContentBlobError('experiences', err?.message || 'Gagal memuat data pengalaman dari Vercel Blob.');
      }
      throw err;
    } finally {
      if (!includeArchived) {
        inFlightExperiencesFetch = null;
      }
    }
  })();

  if (!includeArchived) {
    inFlightExperiencesFetch = run;
  }
  return run;
}

export async function saveExperienceToBlob(experience: any): Promise<{ item: any; items: any[] }> {
  assertNoBase64Payload(experience, 'experience');
  const res = await fetch('/api/experience', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify({ experience }),
  });
  const data = await parseApiJson<{ item: any; items?: any[] }>(
    res,
    'Gagal menyimpan data pengalaman ke Vercel Blob'
  );
  setContentBlobError('experiences', null);
  const sorted = sortExperiencesByRecency(cleanExperiences(Array.isArray(data?.items) ? data.items : [data.item]));
  hasHydratedExperiences = true;
  await saveStoredExperiences(sorted);
  experienceCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return { item: data.item, items: sorted };
}

export async function patchExperienceInBlob(payload: {
  id?: string;
  ids?: string[];
  updates: Record<string, any>;
}): Promise<any[]> {
  assertNoBase64Payload(payload.updates, 'experience');
  const res = await fetch('/api/experience', {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ items?: any[] }>(
    res,
    'Gagal memperbarui data pengalaman di Vercel Blob'
  );
  setContentBlobError('experiences', null);
  const sorted = sortExperiencesByRecency(cleanExperiences(Array.isArray(data?.items) ? data.items : []));
  hasHydratedExperiences = true;
  await saveStoredExperiences(sorted);
  experienceCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return sorted;
}

export async function deleteExperienceFromBlob(idOrIds: string | string[]): Promise<any[]> {
  const payload = Array.isArray(idOrIds) ? { ids: idOrIds } : { id: idOrIds };
  const res = await fetch('/api/experience', {
    method: 'DELETE',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ items?: any[] }>(
    res,
    'Gagal menghapus data pengalaman dari Vercel Blob'
  );
  setContentBlobError('experiences', null);
  const sorted = sortExperiencesByRecency(cleanExperiences(Array.isArray(data?.items) ? data.items : []));
  hasHydratedExperiences = true;
  await saveStoredExperiences(sorted);
  experienceCallbacks.forEach((fn) => {
    try {
      fn(sorted);
    } catch {}
  });
  return sorted;
}

// 5. TEMPLATES
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

// 6. SINGLETON SUBSCRIPTION HUBS (Terhubung ke Vercel Blob API — Bebas Pembacaan Firestore)
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

let lastFocusSyncAt = 0;
let focusListenerRegistered = false;

function registerCrossDeviceFocusSync(): void {
  if (focusListenerRegistered || typeof window === 'undefined') return;
  focusListenerRegistered = true;

  const maybeRefresh = () => {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - lastFocusSyncAt < 20000) return;
    lastFocusSyncAt = now;

    if (settingsCallbacks.size > 0 || cvCallbacks.size > 0) {
      fetchSettingsFromBlob().catch(() => {});
    }
    if (projectCallbacks.size > 0) {
      fetchProjectsFromBlob().catch(() => {});
    }
    if (experienceCallbacks.size > 0) {
      fetchExperiencesFromBlob().catch(() => {});
    }
    if (blogCallbacks.size > 0) {
      fetchBlogsFromBlob().catch(() => {});
    }
  };

  window.addEventListener('focus', maybeRefresh);
  document.addEventListener('visibilitychange', maybeRefresh);
}

function notifySettingsCallbacks(next: SiteSettings) {
  settingsCallbacks.forEach((cb) => {
    try {
      cb(next);
    } catch {}
  });
  cvCallbacks.forEach((cb) => {
    try {
      cb(next);
    } catch {}
  });
}

export function subscribeSettingsRealtime(cb?: (settings: SiteSettings) => void): () => void {
  if (cb) {
    settingsCallbacks.add(cb);
    if (hasHydratedSettings) {
      try {
        cb(memorySettings);
      } catch {}
    }
  }

  if (!settingsSubActive && typeof window !== 'undefined') {
    settingsSubActive = true;
    registerCrossDeviceFocusSync();

    fetchSettingsFromBlob().catch(() => {
      hasHydratedSettings = true;
      notifySettingsCallbacks(memorySettings);
    });
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
      try {
        cb(memorySettings);
      } catch {}
    }
  }

  if (!cvSubActive && typeof window !== 'undefined') {
    cvSubActive = true;
    registerCrossDeviceFocusSync();

    if (!hasHydratedCv && !inFlightSettingsFetch) {
      fetchSettingsFromBlob().catch(() => {
        hasHydratedCv = true;
        notifySettingsCallbacks(memorySettings);
      });
    }
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
      try {
        cb(memoryProjects);
      } catch {}
    }
  }

  if (!projectsSubActive && typeof window !== 'undefined') {
    projectsSubActive = true;
    registerCrossDeviceFocusSync();

    fetchProjectsFromBlob().catch(() => {
      hasHydratedProjects = true;
      projectCallbacks.forEach((fn) => {
        try {
          fn(memoryProjects);
        } catch {}
      });
    });
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
    registerCrossDeviceFocusSync();

    fetchBlogsFromBlob().catch(() => {
      hasHydratedBlogs = true;
      blogCallbacks.forEach((fn) => {
        try {
          fn(memoryBlogs);
        } catch {}
      });
    });
  }

  return () => {
    if (cb) blogCallbacks.delete(cb);
  };
}

export function subscribeExperiencesRealtime(cb?: (exps: any[]) => void): () => void {
  if (cb) {
    experienceCallbacks.add(cb);
    if (hasHydratedExperiences) {
      try {
        cb(memoryExperiences);
      } catch {}
    }
  }

  if (!experiencesSubActive && typeof window !== 'undefined') {
    experiencesSubActive = true;
    registerCrossDeviceFocusSync();

    fetchExperiencesFromBlob().catch(() => {
      hasHydratedExperiences = true;
      experienceCallbacks.forEach((fn) => {
        try {
          fn(memoryExperiences);
        } catch {}
      });
    });
  }

  return () => {
    if (cb) experienceCallbacks.delete(cb);
  };
}
