import { SiteSettings, defaultSettings, defaultCvSections } from '../data/settings';
import { Project, projects as defaultProjects } from '../data/projects';
import { BlogPost } from '../types/blog';
import { defaultBlogPosts } from '../data/blogs';
import { TemplateProduct, defaultTemplates } from '../data/templates';
import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType, isQuotaExhausted } from './firestoreErrorHandler';

const DUMMY_PROJECT_IDS = new Set(['poster-lks-smkn1-sinjai', 'branding-kemasan-teh-hijau', 'poster-promosi-diskon-kreatif', 'showcase-visual-3d-minimalis', 'banner-informasi-bca-finansial', 'visual-sosial-media-konten-kreatif', 'workspace-editing-tools-3d']);

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

const DELETED_RECORDS_STORAGE_KEY = 'deleted_record_ids';

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

function readAllDeletedRecordsMap(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return {};
}

export function getDeletedIds(type: string): Set<string> {
  const map = readAllDeletedRecordsMap();
  const list = Array.isArray(map[type]) ? map[type] : [];
  const result = new Set<string>(list.map(String));
  if (type === 'messages' && typeof window !== 'undefined') {
    try {
      const legacy = JSON.parse(localStorage.getItem('deleted_message_ids') || '[]');
      if (Array.isArray(legacy)) legacy.forEach((id: any) => result.add(String(id)));
    } catch {}
  }
  return result;
}

export async function markDeletedIds(type: string, ids: (string | number)[]): Promise<void> {
  const strIds = ids.map(id => String(id || '').trim()).filter(Boolean);
  if (strIds.length === 0) return;

  if (typeof window !== 'undefined') {
    try {
      const map = readAllDeletedRecordsMap();
      const set = new Set<string>(Array.isArray(map[type]) ? map[type].map(String) : []);
      strIds.forEach(id => set.add(id));
      map[type] = Array.from(set);
      localStorage.setItem(DELETED_RECORDS_STORAGE_KEY, JSON.stringify(map));
      if (type === 'messages') {
        const legacy = JSON.parse(localStorage.getItem('deleted_message_ids') || '[]');
        const legacySet = new Set<string>([...(Array.isArray(legacy) ? legacy.map(String) : []), ...strIds]);
        localStorage.setItem('deleted_message_ids', JSON.stringify(Array.from(legacySet)));
      }
    } catch {}
  }

  try {
    await fetch('/api/deleted-ids', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify({ action: 'mark', type, ids: strIds })
    });
  } catch {}
}

export async function unmarkDeletedIds(type: string, ids: (string | number)[]): Promise<void> {
  const strIds = ids.map(id => String(id || '').trim()).filter(Boolean);
  if (strIds.length === 0) return;

  if (typeof window !== 'undefined') {
    try {
      const map = readAllDeletedRecordsMap();
      const set = new Set<string>(Array.isArray(map[type]) ? map[type].map(String) : []);
      strIds.forEach(id => set.delete(id));
      map[type] = Array.from(set);
      localStorage.setItem(DELETED_RECORDS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
  }

  try {
    await fetch('/api/deleted-ids', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify({ action: 'unmark', type, ids: strIds })
    });
  } catch {}
}

export async function syncDeletedIdsFromServer(): Promise<Record<string, string[]>> {
  const localMap = readAllDeletedRecordsMap();
  try {
    const res = await fetch('/api/deleted-ids');
    if (res.ok) {
      const serverMap = await res.json();
      if (serverMap && typeof serverMap === 'object' && !Array.isArray(serverMap)) {
        const merged: Record<string, string[]> = { ...localMap };
        for (const [k, v] of Object.entries(serverMap)) {
          if (Array.isArray(v)) {
            const set = new Set<string>([...(Array.isArray(merged[k]) ? merged[k].map(String) : []), ...v.map(String)]);
            merged[k] = Array.from(set);
          }
        }
        if (typeof window !== 'undefined') {
          try { localStorage.setItem(DELETED_RECORDS_STORAGE_KEY, JSON.stringify(merged)); } catch {}
        }
        return merged;
      }
    }
  } catch {}
  return localMap;
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
  const deletedIds = getDeletedIds('projects');
  const cleaned: Project[] = [];

  for (const p of projs || []) {
    if (!p) continue;
    if ((p as any).isArchived === true) continue;
    const idStr = String(p.id || '').trim();
    const titleStr = (p.title || '').trim();
    if (!titleStr && !idStr) continue;
    if (idStr && deletedIds.has(idStr)) continue;
    if (DUMMY_PROJECT_IDS.has(idStr)) continue;
    if (DUMMY_PROJECT_TITLES.has(titleStr)) continue;
    if (idStr && seenIds.has(idStr)) continue;

    const rawImages = Array.isArray(p.images) ? p.images : [];
    const cleanImages = rawImages
      .map((img: any) => (typeof img === 'string' ? img.trim() : ''))
      .filter((img: string) => img.length > 0 && !img.startsWith('blob:'));

    const rawMainImg = typeof p.image === 'string' ? p.image.trim() : '';
    const normImage = rawMainImg && !rawMainImg.startsWith('blob:')
      ? rawMainImg
      : (cleanImages[0] || '');

    // Pastikan item tetap valid jika memiliki judul karya atau gambar valid
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
  const deletedIds = getDeletedIds('projects');
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
      if (deletedIds.has(id) || archivedIds.has(id)) continue;

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
  const deletedIds = getDeletedIds('blogPosts');
  const cleaned: BlogPost[] = [];

  for (const b of blogs || []) {
    if (!b) continue;
    if ((b as any).isArchived === true) continue;
    const idStr = String(b.id || '').trim();
    const titleStr = (b.title || '').trim();
    if (!titleStr && !idStr) continue;
    if (idStr && deletedIds.has(idStr)) continue;
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
  const deletedIds = getDeletedIds('blogPosts');
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
      if (deletedIds.has(id) || archivedIds.has(id)) continue;

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
  const deletedIds = getDeletedIds('experiences');
  const cleaned: any[] = [];

  for (const exp of exps || []) {
    if (!exp) continue;
    if (exp.isArchived === true) continue;
    const idStr = String(exp.id || '').trim();
    if (!idStr) continue;
    if (deletedIds.has(idStr)) continue;
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
  const deletedIds = getDeletedIds('experiences');
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
      if (deletedIds.has(id) || archivedIds.has(id)) continue;

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
    cleaned.aboutImage = "";
  }
  // Dapatkan hero image tersimpan yang pernah disetel admin agar tidak pernah hilang atau terganti sendiri
  const userHero = typeof window !== 'undefined' 
    ? (localStorage.getItem('app_custom_hero_image') || '') 
    : '';

  if (cleaned.heroImage === '__RESET_DEFAULT__') {
    cleaned.heroImage = defaultSettings.heroImage;
    if (typeof window !== 'undefined') {
      try { 
        localStorage.removeItem('app_custom_hero_image');
        localStorage.removeItem('app_custom_hero_image_backup');
      } catch {}
    }
  } else if (cleaned.heroImage && typeof cleaned.heroImage === 'string' && cleaned.heroImage.trim().length > 0) {
    let hero = cleaned.heroImage.trim();
    if (hero.includes('hero-albi')) {
      hero = '/images/hero-albi.png';
    } else if (hero.includes('cover_web_') || hero.includes('editing_tools_3d')) {
      hero = '/images/hero-albi.png';
    } else if (hero.includes('/src/assets/images/')) {
      const filename = hero.split('/src/assets/images/')[1];
      hero = `/images/${filename}`;
    } else if (hero.startsWith('src/assets/images/')) {
      hero = `/images/${hero.replace('src/assets/images/', '')}`;
    } else if (hero.startsWith('./assets/images/')) {
      hero = `/images/${hero.replace('./assets/images/', '')}`;
    }
    cleaned.heroImage = hero;
    if (typeof window !== 'undefined' && hero && !hero.includes('editing_tools_3d_1787123977793.jpg')) {
      try { localStorage.setItem('app_custom_hero_image', hero); } catch {}
    }
  } else if (userHero && !userHero.includes('cover_web_') && !userHero.includes('editing_tools_3d')) {
    // Pertahankan hero image pilihan admin sebelumnya, jangan pernah timpa dengan gambar bawaan
    cleaned.heroImage = userHero;
  } else {
    try {
      const prev = localStorage.getItem('app_settings');
      if (prev) {
        const parsed = JSON.parse(prev);
        if (parsed.heroImage && typeof parsed.heroImage === 'string' && parsed.heroImage.trim().length > 0 && !parsed.heroImage.includes('cover_web_') && !parsed.heroImage.includes('editing_tools_3d')) {
          cleaned.heroImage = parsed.heroImage.trim();
        }
      }
    } catch {}
    if (!cleaned.heroImage || cleaned.heroImage.includes('cover_web_') || cleaned.heroImage.includes('editing_tools_3d')) {
      cleaned.heroImage = defaultSettings.heroImage;
    }
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
    // Normalisasi format path gambar banner dan filter banner valid
    const seenBannerIds = new Set<string>();
    cleaned.heroBanners = cleaned.heroBanners
      .filter((b: any) => b && typeof b === 'object')
      .map((b: any, bIdx: number) => {
        let img = b.image || '';
        if (typeof img === 'string') {
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
        if (p.link && p.link.includes('628112345678')) {
          p.link = p.link.replace('628112345678', '6282394549268');
        }
        return { ...p, id: posterId };
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
      autoTagNewItems: Boolean(cleaned.collaboration.autoTagNewItems)
    };
  } else if (cleaned.collaboration === undefined) {
    cleaned.collaboration = defaultSettings.collaboration;
  }
  if (Array.isArray(cleaned.deletedMessageIds)) {
    cleaned.deletedMessageIds = Array.from(new Set(cleaned.deletedMessageIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)));
  } else {
    try {
      const localDel = typeof window !== 'undefined' ? localStorage.getItem('deleted_message_ids') : null;
      if (localDel) {
        cleaned.deletedMessageIds = JSON.parse(localDel);
      } else {
        cleaned.deletedMessageIds = [];
      }
    } catch {
      cleaned.deletedMessageIds = [];
    }
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
  const timestamp = newSettings.savedAt || Date.now();
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

  // 2. Simpan redundansi ke server disk via /api/settings secara instan dengan otorisasi admin
  try {
    await fetch('/api/settings', {
      method: 'POST',
      keepalive: true,
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(merged)
    });
  } catch {}

  // 3. Simpan ke Cloud Firestore (sanitasi undefined value agar tidak ditolak Firestore SDK)
  if (isQuotaExhausted()) {
    // Mode ketahanan kuota aktif: data telah tersimpan aman di disk server & localStorage
    return true;
  }

  try {
    const firestoreTasks: Promise<any>[] = [];

    // Simpan dokumen khusus settings/hero ke Firestore agar link gambar hero tersimpan mandiri di Firebase
    if ((newSettings as any).heroImage === '__RESET_DEFAULT__') {
      firestoreTasks.push(
        setDoc(doc(db, 'settings', 'hero'), cleanForFirestore({
          heroImage: defaultSettings.heroImage,
          savedAt: Date.now(),
          updatedAt: new Date().toISOString(),
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true
        }), { merge: true })
      );
      try {
        fetch('/api/hero-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heroImage: '' })
        }).catch(() => {});
      } catch {}
    } else if (merged.heroImage && typeof merged.heroImage === 'string' && merged.heroImage.trim().length > 0) {
      try {
        if (typeof window !== 'undefined' && !merged.heroImage.includes('editing_tools_3d_1787123977793.jpg')) {
          localStorage.setItem('app_custom_hero_image', merged.heroImage.trim());
        }
      } catch {}

      const heroPayload: Record<string, any> = {
        heroImage: merged.heroImage.trim(),
        savedAt: merged.savedAt || Date.now(),
        updatedAt: new Date().toISOString(),
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      };

      firestoreTasks.push(
        setDoc(doc(db, 'settings', 'hero'), cleanForFirestore(heroPayload), { merge: true })
      );
    }

    if (merged.cvSections || merged.cvPdfFile || merged.cvRole) {
      firestoreTasks.push(
        setDoc(doc(db, 'settings', 'cv'), cleanForFirestore({
          cvSections: merged.cvSections || [],
          cvPdfFile: merged.cvPdfFile || '',
          cvRole: merged.cvRole || '',
          savedAt: merged.savedAt || Date.now(),
          updatedAt: new Date().toISOString(),
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true
        }), { merge: true })
      );
    }

    if (Array.isArray(merged.promoPosters)) {
      const safePosters = merged.promoPosters.map((p: any) => {
        // Hapus dataUrl raksasa agar ukuran dokumen Firestore sangat ringan (~500 byte)
        const { dataUrl, ...rest } = p;
        return rest;
      });
      firestoreTasks.push(
        setDoc(doc(db, 'settings', 'promoPosters'), cleanForFirestore({
          posters: safePosters,
          active: merged.promoWidgetActive !== false,
          updatedAt: new Date().toISOString(),
          savedAt: Date.now(),
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true
        }), { merge: true })
      );
    }

    const safeGlobalPayload: Record<string, any> = {
      ...merged,
      _adminAuth: 'alfreelnc_admin_auth_verified',
      updatedByAdmin: true
    };
    if (Array.isArray(safeGlobalPayload.promoPosters)) {
      safeGlobalPayload.promoPosters = safeGlobalPayload.promoPosters.map((p: any) => {
        const { dataUrl, ...rest } = p;
        return rest;
      });
    }
    if (safeGlobalPayload.heroImageDataUrl && safeGlobalPayload.heroImageDataUrl.length > 500000) {
      delete safeGlobalPayload.heroImageDataUrl;
    }

    firestoreTasks.push(
      setDoc(doc(db, 'settings', 'global'), cleanForFirestore(safeGlobalPayload), { merge: true })
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
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return sortProjectsByRecency(cleanProjects(parsed));
      }
    }
  } catch(e) {}
  return sortProjectsByRecency(cleanProjects(defaultProjects));
}

function stripOversizedDataUrlsForLocalStorage<T>(items: T[]): T[] {
  return items.map((item: any) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    if (typeof copy.image === 'string' && copy.image.startsWith('data:') && copy.image.length > 100000) {
      copy.image = '';
    }
    if (Array.isArray(copy.images)) {
      copy.images = copy.images.filter((u: any) => typeof u === 'string' && (!u.startsWith('data:') || u.length <= 100000));
    }
    if (typeof copy.collaborationLogo === 'string' && copy.collaborationLogo.startsWith('data:') && copy.collaborationLogo.length > 100000) {
      copy.collaborationLogo = '';
    }
    return copy;
  });
}

export async function saveStoredProjects(newProjects: Project[]): Promise<void> {
  const clean = sortProjectsByRecency(cleanProjects(newProjects || []));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_projects_updated', { detail: clean }));
    try {
      localStorage.setItem('user_projects', JSON.stringify(clean));
    } catch {
      try {
        localStorage.setItem('user_projects', JSON.stringify(stripOversizedDataUrlsForLocalStorage(clean)));
      } catch {}
    }
  }
  try {
    await fetch('/api/projects', {
      method: 'POST',
      keepalive: true,
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(clean)
    });
  } catch {}
}

// 3. BLOG POSTS
export function getStoredBlogs(): BlogPost[] {
  try {
    const saved = localStorage.getItem('blogPosts');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return sortBlogsByRecency(cleanBlogs(parsed));
      }
    }
  } catch(e) {}
  return [];
}

export async function saveStoredBlogs(newBlogs: BlogPost[]): Promise<void> {
  const clean = sortBlogsByRecency(cleanBlogs(newBlogs || []));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('blog_posts_updated', { detail: clean }));
    try {
      localStorage.setItem('blogPosts', JSON.stringify(clean));
    } catch {
      try {
        localStorage.setItem('blogPosts', JSON.stringify(stripOversizedDataUrlsForLocalStorage(clean)));
      } catch {}
    }
  }
  try {
    await fetch('/api/blogs', {
      method: 'POST',
      keepalive: true,
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(clean)
    });
  } catch {}
}

// 4. EXPERIENCES
export function getStoredExperiences(): any[] {
  try {
    const saved = localStorage.getItem('user_experiences');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return sortExperiencesByRecency(cleanExperiences(parsed));
    }
  } catch(e) {}
  return [];
}

export async function saveStoredExperiences(newExps: any[]): Promise<void> {
  const clean = sortExperiencesByRecency(cleanExperiences(newExps || []));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_experiences_updated', { detail: clean }));
    try {
      localStorage.setItem('user_experiences', JSON.stringify(clean));
    } catch {
      try {
        localStorage.setItem('user_experiences', JSON.stringify(stripOversizedDataUrlsForLocalStorage(clean)));
      } catch {}
    }
  }
  try {
    await fetch('/api/experiences', {
      method: 'POST',
      keepalive: true,
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(clean)
    });
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
