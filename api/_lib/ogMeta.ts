import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import {
  BLOB_PATHS,
  readJsonFromBlob,
  sanitizeStoredMediaUrl,
} from './blobJsonStore.js';
import { getQueryParam, type ApiRequest } from './httpHelpers.js';
import {
  createInitialPortfolioSeed,
  createInitialSiteSettingsSeed,
  type PortfolioJsonData,
  type SiteSettingsJsonData,
} from './seedDefaults.js';

export const DEFAULT_PUBLIC_ORIGIN = 'https://alfreelncdesign.vercel.app';
export const DEFAULT_HERO_OG_IMAGE_PATH = '/images/hero-albi-og.jpg';
export const DEFAULT_SITE_TITLE =
  'Alfreelnc Design Portofolio – Jasa Desain Grafis & Poster Kreatif';
export const DEFAULT_SITE_DESC =
  'Alfreelnc Design Portofolio karya Albian (Muhammad Albiansyah) – Jasa desain grafis profesional, portofolio design graphic, jasa buat poster, jasa mengedit poster, jasa tugas, agensi desain grafis, agensi joki tugas, dan freelance desain grafis.';
export const DEFAULT_HERO_ALT =
  'Muhammad Albiansyah - Graphic Designer & UI/UX Specialist Portfolio';

const SHORT_CACHE_TTL_MS = 20_000;
const GLOBAL_OG_CACHE_KEY = '__alfreelncOgMetaCache_v1';

interface OgMetaRuntimeCache {
  portfolio?: { items: any[]; updatedAt?: string; expiresAt: number };
  settings?: { data: SiteSettingsJsonData; expiresAt: number };
}

function getOgRuntimeCache(): OgMetaRuntimeCache {
  const g = globalThis as any;
  if (!g[GLOBAL_OG_CACHE_KEY]) {
    g[GLOBAL_OG_CACHE_KEY] = {} satisfies OgMetaRuntimeCache;
  }
  return g[GLOBAL_OG_CACHE_KEY] as OgMetaRuntimeCache;
}

export function clearOgMetaCache(): void {
  const cache = getOgRuntimeCache();
  delete cache.portfolio;
  delete cache.settings;
}

function isPrivateOrLocalHost(host: string): boolean {
  const bare = host.split(':')[0].trim().toLowerCase();
  return (
    !bare ||
    bare === 'localhost' ||
    bare === '127.0.0.1' ||
    bare === '0.0.0.0' ||
    bare.startsWith('10.') ||
    bare.startsWith('192.168.') ||
    bare.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(bare)
  );
}

function normalizeOriginCandidate(raw?: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    if (isPrivateOrLocalHost(parsed.hostname)) return '';
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

export function resolveSeoOrigin(req: IncomingMessage): string {
  const forwardedHostHeader = req.headers['x-forwarded-host'];
  const hostHeader = req.headers['host'];
  const forwardedProtoHeader = req.headers['x-forwarded-proto'];

  const forwardedHost = (Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader || '')
    .split(',')[0]
    .trim();
  const rawHost = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || '')
    .split(',')[0]
    .trim();
  const candidateHost = forwardedHost || rawHost;

  if (candidateHost && !isPrivateOrLocalHost(candidateHost)) {
    const rawProto = (Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const proto = rawProto === 'http' || rawProto === 'https' ? rawProto : 'https';
    return `${proto}://${candidateHost}`;
  }

  return (
    normalizeOriginCandidate(process.env.PUBLIC_URL) ||
    normalizeOriginCandidate(process.env.VITE_APP_URL) ||
    normalizeOriginCandidate(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    DEFAULT_PUBLIC_ORIGIN
  );
}

export async function getCachedPortfolioItems(): Promise<{
  items: any[];
  updatedAt?: string;
}> {
  const cache = getOgRuntimeCache();
  const now = Date.now();
  if (cache.portfolio && now < cache.portfolio.expiresAt) {
    return { items: cache.portfolio.items, updatedAt: cache.portfolio.updatedAt };
  }

  const { data } = await readJsonFromBlob<PortfolioJsonData>(
    BLOB_PATHS.PORTFOLIO,
    createInitialPortfolioSeed
  );
  const items = Array.isArray(data?.items) ? data.items : [];
  cache.portfolio = {
    items,
    updatedAt: data?.updatedAt,
    expiresAt: now + SHORT_CACHE_TTL_MS,
  };
  return { items, updatedAt: data?.updatedAt };
}

export async function getCachedSiteSettings(): Promise<SiteSettingsJsonData> {
  const cache = getOgRuntimeCache();
  const now = Date.now();
  if (cache.settings && now < cache.settings.expiresAt) {
    return cache.settings.data;
  }

  const { data } = await readJsonFromBlob<SiteSettingsJsonData>(
    BLOB_PATHS.SITE_SETTINGS,
    createInitialSiteSettingsSeed
  );
  cache.settings = {
    data,
    expiresAt: now + SHORT_CACHE_TTL_MS,
  };
  return data;
}

export function extractProjectIdFromRequest(req: ApiRequest): string | null {
  const fromQuery =
    getQueryParam(req, 'project') ||
    getQueryParam(req, 'p') ||
    getQueryParam(req, 'id');
  if (fromQuery && fromQuery.trim()) {
    return fromQuery.trim();
  }

  const candidatePaths = [
    (req as any).path,
    typeof req.url === 'string' ? req.url.split('?')[0] : '',
    typeof req.headers['x-invoke-path'] === 'string' ? req.headers['x-invoke-path'] : '',
    typeof req.headers['x-matched-path'] === 'string' ? req.headers['x-matched-path'] : '',
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);

  for (const rawPath of candidatePaths) {
    const idx = rawPath.indexOf('/project/');
    if (idx !== -1) {
      const rest = rawPath.slice(idx + '/project/'.length);
      const seg = rest.split('/')[0]?.trim();
      if (seg && !seg.startsWith(':')) {
        try {
          return decodeURIComponent(seg);
        } catch {
          return seg;
        }
      }
    }
  }

  return null;
}

export function stripHtmlAndCollapse(raw?: string | null, maxLen = 240): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trimEnd()}…`;
}

export function shortHash(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 10);
}

export interface HeroOgSource {
  imageUrl: string;
  isDefaultHero: boolean;
  version: string;
}

export async function resolveHeroOgSource(): Promise<HeroOgSource> {
  try {
    const settings = await getCachedSiteSettings();
    const rawHero = typeof settings?.heroImage === 'string' ? settings.heroImage.trim() : '';
    const sanitized = sanitizeStoredMediaUrl(rawHero);
    const isDefaultOrLegacy =
      !sanitized ||
      sanitized.includes('cover_web_') ||
      sanitized.includes('editing_tools_3d') ||
      sanitized.includes('hero-albi');

    if (!isDefaultOrLegacy) {
      const version = shortHash(`${sanitized}|${settings?.updatedAt || ''}`);
      return {
        imageUrl: sanitized,
        isDefaultHero: false,
        version,
      };
    }
  } catch {
    // Fallback ke hero default
  }

  return {
    imageUrl: DEFAULT_HERO_OG_IMAGE_PATH,
    isDefaultHero: true,
    version: 'hero_albi_v1',
  };
}

export interface ResolvedProjectOg {
  project: any;
  imageUrl: string;
  version: string;
}

export async function resolveProjectOgById(
  projectId: string
): Promise<ResolvedProjectOg | null> {
  try {
    const { items } = await getCachedPortfolioItems();
    const found = items.find((p: any) => String(p?.id) === String(projectId));
    if (!found) return null;

    const candidatePrimary = sanitizeStoredMediaUrl(found.image);
    const candidateGallery = Array.isArray(found.images)
      ? found.images
          .map((u: unknown) => sanitizeStoredMediaUrl(u))
          .find((u: string) => u.length > 0) || ''
      : '';
    const imageUrl = candidatePrimary || candidateGallery;
    const version = shortHash(
      `${found.id}|${imageUrl}|${found.updatedAt || ''}|${found.title || ''}`
    );

    return {
      project: found,
      imageUrl,
      version,
    };
  } catch {
    return null;
  }
}

export interface OgPageMetadata {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  pageUrl: string;
  isProject: boolean;
}

function computeScaledOgDimensions(
  rawWidth?: unknown,
  rawHeight?: unknown,
  maxBox = 1200
): { width: number; height: number } | null {
  const w = Number(rawWidth);
  const h = Number(rawHeight);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  const scale = Math.min(1, maxBox / w, maxBox / h);
  const outW = Math.max(200, Math.round(w * scale));
  const outH = Math.max(200, Math.round(h * scale));
  return { width: outW, height: outH };
}

export async function buildOgMetadata(req: ApiRequest): Promise<OgPageMetadata> {
  const origin = resolveSeoOrigin(req);
  const projectId = extractProjectIdFromRequest(req);

  if (projectId) {
    const resolvedProject = await resolveProjectOgById(projectId);
    if (resolvedProject) {
      const { project, imageUrl, version } = resolvedProject;
      const cleanProjectTitle = stripHtmlAndCollapse(project.title, 90) || 'Karya Desain';
      const title = `${cleanProjectTitle} – Alfreelnc Design Portofolio`;
      const desc =
        stripHtmlAndCollapse(project.description, 240) ||
        `Karya desain grafis ${stripHtmlAndCollapse(project.category, 40) || 'kreatif'} profesional oleh Alfreelnc Design (Muhammad Albiansyah).`;
      const encodedId = encodeURIComponent(String(project.id));
      const ogImageUrl = imageUrl
        ? `${origin}/og/project/${encodedId}/${version}.jpg`
        : `${origin}${DEFAULT_HERO_OG_IMAGE_PATH}`;
      const scaledDims = imageUrl
        ? computeScaledOgDimensions(project.imageWidth, project.imageHeight, 1200)
        : { width: 1200, height: 630 };

      return {
        title,
        description: desc,
        imageUrl: ogImageUrl,
        imageAlt: `${cleanProjectTitle} – Portofolio Desain Grafis Alfreelnc`,
        mimeType: 'image/jpeg',
        width: scaledDims ? scaledDims.width : null,
        height: scaledDims ? scaledDims.height : null,
        pageUrl: `${origin}/project/${encodedId}`,
        isProject: true,
      };
    }
  }

  const hero = await resolveHeroOgSource();
  const rawReqUrl = typeof req.url === 'string' ? req.url : '/';
  const rawPath = rawReqUrl.split('?')[0] || '/';
  const cleanPath =
    rawPath === '/api/og-html' || rawPath === '/index.html' || rawPath === '/_app.html'
      ? '/'
      : rawPath;
  const pageUrl = `${origin}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;

  const heroOgImageUrl = hero.isDefaultHero
    ? `${origin}${DEFAULT_HERO_OG_IMAGE_PATH}`
    : `${origin}/og/hero/${hero.version}.jpg`;

  return {
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESC,
    imageUrl: heroOgImageUrl,
    imageAlt: DEFAULT_HERO_ALT,
    mimeType: 'image/jpeg',
    width: hero.isDefaultHero ? 1200 : null,
    height: hero.isDefaultHero ? 630 : null,
    pageUrl,
    isProject: false,
  };
}

export function escapeHtmlAttr(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function upsertMetaTag(
  html: string,
  attrKey: 'name' | 'property',
  attrVal: string,
  content: string,
  idAttr?: string
): string {
  const escapedContent = escapeHtmlAttr(content);
  const idPart = idAttr ? ` id="${escapeHtmlAttr(idAttr)}"` : '';
  const tag = `<meta ${attrKey}="${attrVal}" content="${escapedContent}"${idPart} />`;
  const regex = new RegExp(`<meta\\s+${attrKey}=["']${attrVal}["'][^>]*>`, 'i');
  if (regex.test(html)) {
    return html.replace(regex, () => tag);
  }
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function removeMetaTag(html: string, attrKey: 'name' | 'property', attrVal: string): string {
  const regex = new RegExp(`\\s*<meta\\s+${attrKey}=["']${attrVal}["'][^>]*>\\r?\\n?`, 'gi');
  return html.replace(regex, '\n');
}

function upsertLinkTag(html: string, relVal: string, hrefVal: string, idAttr?: string): string {
  const escapedHref = escapeHtmlAttr(hrefVal);
  const idPart = idAttr ? ` id="${escapeHtmlAttr(idAttr)}"` : '';
  const tag = `<link rel="${relVal}" href="${escapedHref}"${idPart} />`;
  const regex = new RegExp(`<link\\s+rel=["']${relVal}["'][^>]*>`, 'i');
  if (regex.test(html)) {
    return html.replace(regex, () => tag);
  }
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

export async function injectOgMetaIntoHtml(html: string, req: ApiRequest): Promise<string> {
  const meta = await buildOgMetadata(req);
  let modified = html;

  const escapedTitleText = escapeHtmlText(meta.title);
  if (/<title>[^<]*<\/title>/i.test(modified)) {
    modified = modified.replace(/<title>[^<]*<\/title>/i, () => `<title>${escapedTitleText}</title>`);
  } else {
    modified = modified.replace('</head>', `    <title>${escapedTitleText}</title>\n  </head>`);
  }

  modified = upsertMetaTag(modified, 'name', 'title', meta.title);
  modified = upsertMetaTag(modified, 'name', 'description', meta.description);

  modified = upsertMetaTag(modified, 'property', 'og:title', meta.title, 'og-title');
  modified = upsertMetaTag(modified, 'property', 'og:description', meta.description, 'og-desc');
  modified = upsertMetaTag(modified, 'property', 'og:url', meta.pageUrl, 'og-url');
  modified = upsertMetaTag(modified, 'property', 'og:image', meta.imageUrl, 'og-image');
  modified = upsertMetaTag(
    modified,
    'property',
    'og:image:secure_url',
    meta.imageUrl,
    'og-image-secure'
  );
  modified = upsertMetaTag(modified, 'property', 'og:image:type', meta.mimeType);
  modified = upsertMetaTag(modified, 'property', 'og:image:alt', meta.imageAlt, 'og-image-alt');

  if (meta.width && meta.height) {
    modified = upsertMetaTag(modified, 'property', 'og:image:width', String(meta.width));
    modified = upsertMetaTag(modified, 'property', 'og:image:height', String(meta.height));
  } else {
    modified = removeMetaTag(modified, 'property', 'og:image:width');
    modified = removeMetaTag(modified, 'property', 'og:image:height');
  }

  modified = upsertMetaTag(modified, 'name', 'twitter:title', meta.title, 'twitter-title');
  modified = upsertMetaTag(
    modified,
    'name',
    'twitter:description',
    meta.description,
    'twitter-desc'
  );
  modified = upsertMetaTag(modified, 'name', 'twitter:image', meta.imageUrl, 'twitter-image');
  modified = upsertMetaTag(
    modified,
    'name',
    'twitter:image:alt',
    meta.imageAlt,
    'twitter-image-alt'
  );

  modified = upsertLinkTag(modified, 'canonical', meta.pageUrl, 'canonical-url');
  modified = upsertLinkTag(modified, 'image_src', meta.imageUrl, 'link-image-src');

  return modified;
}
