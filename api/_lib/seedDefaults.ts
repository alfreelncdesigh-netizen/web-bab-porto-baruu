import fs from 'fs';
import path from 'path';

export interface StatsData {
  totalViews: number;
  dailyViews: Record<string, number>;
  updatedAt?: string;
}

export interface PortfolioJsonData {
  items: any[];
  updatedAt: string;
  version: number;
}

export interface ExperienceJsonData {
  items: any[];
  updatedAt: string;
  version: number;
}

export interface CvSectionSeed {
  title: string;
  content: string;
  images: string[];
}

export interface CvJsonData {
  cvRole: string;
  cvPdfFile: string;
  cvSections: CvSectionSeed[];
  updatedAt: string;
  version: number;
}

export interface SiteSettingsJsonData {
  fullName: string;
  heroBadge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroDescription: string;
  aboutTitle1: string;
  aboutTitle2: string;
  aboutDescription1: string;
  aboutDescription2: string;
  aboutImage: string;
  heroImage: string;
  heroBanners: any[];
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  portfolioLink: string;
  promoWidgetActive: boolean;
  promoWidgetImage: string;
  promoWidgetLink: string;
  promoWidgetCtaText: string;
  deletedMessageIds: string[];
  promoPosters: any[];
  collaboration: {
    enabled: boolean;
    partnerName: string;
    partnerLogo: string;
    collaborationText: string;
    autoTagNewItems: boolean;
    collaboratorUsername: string;
    collaboratorPassword: string;
    collaboratorLoginEnabled: boolean;
    collaboratorAccounts: any[];
  };
  savedAt: number;
  updatedAt: string;
  version: number;
}

export const DEFAULT_CV_SECTIONS: CvSectionSeed[] = [
  {
    title: 'PROFESIONAL SUMMARY',
    content: 'Seorang Desainer Garis dengan pengalaman dalam menciptakan solusi visual yang fungsional dan estetis.',
    images: [],
  },
  {
    title: 'PENDIDKAN',
    content: '<b>UPT SMK NEGERI 1 Sinjai</b> - Sinjai Utara<br/>Jurusan Teknik Komputer dan Jaringan.',
    images: [],
  },
  {
    title: 'PENGALAMAN KERJA & PROYEK',
    content: '<b>Jasa Desain Grafis Freelance</b> - Sekarang<br/>Merancang materi visual, branding, dan poster.',
    images: [],
  },
  {
    title: 'KEAHLIAN',
    content: '<b>Hard Skills</b><br/>Desain Grafis : Poster, Sertifikat, Identitas Visual, Kemasan.',
    images: [],
  },
  {
    title: 'SERTIFIKASI',
    content: '<b>Workshop Video Editing</b> - 2024',
    images: [],
  },
  {
    title: 'PROYEK UNGGULAN',
    content: '<b>Branding Media Sosial</b>',
    images: [],
  },
];

export const DEFAULT_SITE_SETTINGS_SEED: SiteSettingsJsonData = {
  fullName: 'Muhammad Albiansyah',
  heroBadge: 'PORTFOLIO DESIGN',
  heroTitle1: 'WELCOME',
  heroTitle2: 'My Portfolio Design',
  heroDescription:
    'Saya membantu merek dan perusahaan mengubah ide kompleks menjadi desain antarmuka yang sederhana, indah, dan berpusat pada manusia.',
  aboutTitle1: 'Pendekatan',
  aboutTitle2: 'Desain Saya',
  aboutDescription1:
    'Desain yang baik bukan hanya tentang bagaimana ia terlihat, tetapi bagaimana ia berfungsi. Saya percaya pada pendekatan minimalis dimana setiap elemen memiliki tujuan.',
  aboutDescription2:
    'Dengan pengalaman lebih dari 5 tahun di industri kreatif, saya telah bekerja dengan berbagai klien dari startup hingga perusahaan besar untuk merancang produk digital yang tidak hanya estetis, tetapi juga memecahkan masalah pengguna secara nyata.',
  aboutImage: '',
  heroImage: '/images/hero-albi.png',
  heroBanners: [
    {
      id: 'banner-1',
      image: '/images/banner_promo_bca_1788696791480.jpg',
      title: 'Praktis Pembayaran & Konsultasi Desain Digital',
      subtitle: 'Solusi antarmuka dan visual presisi tinggi untuk pertumbuhan brand Anda',
      badge: 'PROMO SPESIAL',
      link: '#portfolio',
      linkText: 'Lihat Karya',
      active: true,
      overlayText: false,
    },
    {
      id: 'banner-2',
      image: '/images/banner_promo_crea_1788696808849.jpg',
      title: 'Paket Konten Kreatif & Visual Media Sosial',
      subtitle: 'Desain visual feeds, story, dan materi promosi menarik untuk brand Anda',
      badge: 'KONTEN KREATIF',
      link: '#portfolio',
      linkText: 'Lihat Karya',
      active: true,
      overlayText: false,
    },
    {
      id: 'banner-3',
      image: '/images/promo_poster_1789471291192.jpg',
      title: 'Diskon 30% Paket Branding & Desain UI/UX',
      subtitle: 'Tingkatkan identitas visual bisnis Anda dengan harga promo terbatas',
      badge: 'DISKON 30%',
      link: '#contact',
      linkText: 'Pesan Sekarang',
      active: true,
      overlayText: false,
    },
  ],
  contactEmail: 'alfreelnc.desigh@gmail.com',
  contactPhone: '+62 823-9454-9268',
  contactLocation: 'Kabupaten Sinjai Utara',
  portfolioLink: 'https://alfreelnc.com',
  promoWidgetActive: true,
  promoWidgetImage: '',
  promoWidgetLink: 'https://wa.me/qr/UDCAZ44OXWLGM1',
  promoWidgetCtaText: 'Ambil Diskon',
  deletedMessageIds: [],
  promoPosters: [],
  collaboration: {
    enabled: false,
    partnerName: '',
    partnerLogo: '',
    collaborationText: 'Kolaborasi Bersama',
    autoTagNewItems: false,
    collaboratorUsername: 'kolaborator',
    collaboratorPassword: 'kolaborasi123',
    collaboratorLoginEnabled: true,
    collaboratorAccounts: [
      {
        id: 'collab-1',
        username: 'kolaborator',
        password: 'kolaborasi123',
        partnerName: 'Mitra Desain',
        partnerLogo: '',
        active: true,
      },
    ],
  },
  savedAt: Date.now(),
  updatedAt: new Date().toISOString(),
  version: 1,
};

function stripBase64Deep(value: any): any {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return '';
    }
    if (trimmed.includes('/src/assets/images/')) {
      return `/images/${trimmed.split('/src/assets/images/')[1]}`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripBase64Deep);
  }
  if (value && typeof value === 'object') {
    const next: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'dataUrl' || k === 'heroImageDataUrl' || k === '_adminAuth' || k === 'updatedByAdmin') {
        continue;
      }
      next[k] = stripBase64Deep(v);
    }
    return next;
  }
  return value;
}

function readLocalSeedFile(filename: string): any | null {
  try {
    const candidate = path.resolve(process.cwd(), filename);
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // Abaikan jika file seed lokal tidak tersedia (misal pada bundel serverless)
  }
  return null;
}

export function createInitialStatsSeed(): StatsData {
  return {
    totalViews: 0,
    dailyViews: {},
    updatedAt: new Date().toISOString(),
  };
}

export function createInitialPortfolioSeed(): PortfolioJsonData {
  const raw = readLocalSeedFile('projects-storage.json');
  const rawItems = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
  const items = rawItems
    .filter((p: any) => p && (p.id !== undefined || p.title))
    .map((p: any) => {
      const clean = stripBase64Deep(p);
      const images = Array.isArray(clean.images)
        ? clean.images.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
        : (clean.image ? [clean.image] : []);
      return {
        ...clean,
        id: String(clean.id),
        image: clean.image || images[0] || '',
        images,
        isArchived: Boolean(clean.isArchived),
        archiveFolderId: clean.archiveFolderId || null,
      };
    });

  return {
    items,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

export function createInitialExperienceSeed(): ExperienceJsonData {
  const raw = readLocalSeedFile('experiences-storage.json');
  const rawItems = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
  const items = rawItems
    .filter((e: any) => e && e.id)
    .map((e: any) => {
      const clean = stripBase64Deep(e);
      let createdAt = clean.createdAt;
      if (!createdAt && clean.dateAdded?.seconds) {
        createdAt = clean.dateAdded.seconds * 1000;
      }
      const images = Array.isArray(clean.images)
        ? clean.images.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
        : (clean.image ? [clean.image] : []);
      return {
        ...clean,
        id: String(clean.id),
        image: clean.image || images[0] || '',
        images,
        createdAt: createdAt || Date.now(),
        isArchived: Boolean(clean.isArchived),
        archiveFolderId: clean.archiveFolderId || null,
      };
    });

  return {
    items,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

export function createInitialSiteSettingsSeed(): SiteSettingsJsonData {
  const raw = readLocalSeedFile('settings-storage.json');
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SITE_SETTINGS_SEED,
      savedAt: Date.now(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  const cleaned = stripBase64Deep(raw);
  delete cleaned.cvRole;
  delete cleaned.cvPdfFile;
  delete cleaned.cvSections;

  return {
    ...DEFAULT_SITE_SETTINGS_SEED,
    ...cleaned,
    collaboration: {
      ...DEFAULT_SITE_SETTINGS_SEED.collaboration,
      ...(cleaned.collaboration || {}),
      collaboratorAccounts:
        Array.isArray(cleaned.collaboration?.collaboratorAccounts) && cleaned.collaboration.collaboratorAccounts.length > 0
          ? cleaned.collaboration.collaboratorAccounts
          : DEFAULT_SITE_SETTINGS_SEED.collaboration.collaboratorAccounts,
    },
    savedAt: Number(cleaned.savedAt) || Date.now(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

export function createInitialCvSeed(): CvJsonData {
  const raw = readLocalSeedFile('settings-storage.json');
  const cleaned = raw && typeof raw === 'object' ? stripBase64Deep(raw) : {};
  const rawSections = Array.isArray(cleaned.cvSections) && cleaned.cvSections.length > 0
    ? cleaned.cvSections
    : DEFAULT_CV_SECTIONS;

  const cvSections: CvSectionSeed[] = rawSections.map((s: any) => ({
    title: String(s?.title || ''),
    content: String(s?.content || ''),
    images: Array.isArray(s?.images)
      ? s.images.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
      : (typeof s?.image === 'string' && s.image.trim() ? [s.image.trim()] : []),
  }));

  return {
    cvRole: String(cleaned.cvRole || 'Desainer Grafis'),
    cvPdfFile: String(cleaned.cvPdfFile || ''),
    cvSections,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}
