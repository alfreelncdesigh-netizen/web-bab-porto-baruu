import fs from 'fs';
import path from 'path';
import type { ServerResponse } from 'http';
import { type ApiRequest, getQueryParam, logSafeApiError, sendJson } from './_lib/httpHelpers.js';
import {
  DEFAULT_HERO_OG_IMAGE_PATH,
  resolveHeroOgSource,
  resolveProjectOgById,
} from './_lib/ogMeta.js';
import { readMediaFromServerCache, resolveAndCacheMedia } from './_lib/serverCache.js';

const GLOBAL_OG_JPEG_CACHE_KEY = '__alfreelncOgJpegCache_v1';
const MAX_OG_JPEG_CACHE_ENTRIES = 30;
const MAX_OG_JPEG_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedOgJpeg {
  buffer: Buffer;
  mimeType: string;
  cachedAt: number;
}

function getOgJpegCache(): Map<string, CachedOgJpeg> {
  const g = globalThis as any;
  if (!g[GLOBAL_OG_JPEG_CACHE_KEY]) {
    g[GLOBAL_OG_JPEG_CACHE_KEY] = new Map<string, CachedOgJpeg>();
  }
  return g[GLOBAL_OG_JPEG_CACHE_KEY] as Map<string, CachedOgJpeg>;
}

function setOgJpegCache(key: string, value: CachedOgJpeg): void {
  const cache = getOgJpegCache();
  if (cache.has(key)) {
    cache.delete(key);
  }
  while (cache.size >= MAX_OG_JPEG_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  cache.set(key, value);
}

function readBundledPublicFile(relUrl: string): Buffer | null {
  try {
    const cleanRel = relUrl.split('?')[0].replace(/^\/+/, '');
    if (!cleanRel || cleanRel.includes('..')) return null;
    const publicDir = path.resolve(process.cwd(), 'public');
    const distDir = path.resolve(process.cwd(), 'dist');
    const candidates = [
      path.resolve(publicDir, cleanRel),
      path.resolve(distDir, cleanRel),
    ].filter((p) => p.startsWith(publicDir) || p.startsWith(distDir));

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const buf = fs.readFileSync(candidate);
        if (buf.length > 0) return buf;
      }
    }
  } catch {
    // Ignore local read failure
  }
  return null;
}

async function loadMediaBuffer(
  rawUrl: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!rawUrl) return null;

  let effectiveUrl = rawUrl.trim();
  if (effectiveUrl.startsWith('/api/media-cache') || effectiveUrl.includes('/api/media-cache?')) {
    try {
      const parsed = new URL(effectiveUrl, 'https://localhost');
      const inner = parsed.searchParams.get('url');
      if (inner && inner.trim()) {
        effectiveUrl = inner.trim();
      }
    } catch {
      // Keep original URL if parsing fails
    }
  }

  if (effectiveUrl.startsWith('/')) {
    const localBuf = readBundledPublicFile(effectiveUrl);
    if (localBuf) {
      const lower = effectiveUrl.toLowerCase();
      const mimeType = lower.endsWith('.png')
        ? 'image/png'
        : lower.endsWith('.webp')
        ? 'image/webp'
        : lower.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/jpeg';
      return { buffer: localBuf, mimeType };
    }
    const cached = await readMediaFromServerCache(effectiveUrl);
    return cached ? { buffer: cached.buffer, mimeType: cached.mimeType } : null;
  }

  const resolved = await resolveAndCacheMedia(effectiveUrl);
  return resolved ? { buffer: resolved.buffer, mimeType: resolved.mimeType } : null;
}

async function normalizeToWhatsappJpeg(
  rawBuffer: Buffer,
  sourceMimeType: string,
  sourceUrl: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const isAlreadyHeroOgJpg =
    sourceUrl === DEFAULT_HERO_OG_IMAGE_PATH &&
    sourceMimeType === 'image/jpeg' &&
    rawBuffer.length > 0 &&
    rawBuffer.length <= 300 * 1024;

  if (isAlreadyHeroOgJpg) {
    return { buffer: rawBuffer, mimeType: 'image/jpeg' };
  }

  const WHATSAPP_MAX_BYTES = 280 * 1024;

  try {
    const sharpMod: any = await import('sharp');
    const sharpFn = sharpMod.default || sharpMod;

    const inputOptions = sourceMimeType.includes('svg') ? { density: 160 } : undefined;
    const presets: Array<{ maxDim: number; quality: number }> = [
      { maxDim: 1200, quality: 82 },
      { maxDim: 1000, quality: 74 },
      { maxDim: 800, quality: 66 },
    ];

    let outBuf: Buffer | null = null;
    for (const preset of presets) {
      outBuf = await sharpFn(rawBuffer, inputOptions)
        .rotate()
        .resize({ width: preset.maxDim, height: preset.maxDim, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: preset.quality, progressive: false })
        .toBuffer();

      if (outBuf.length > 0 && outBuf.length <= WHATSAPP_MAX_BYTES) {
        break;
      }
    }

    if (outBuf && outBuf.length > 0) {
      return { buffer: outBuf, mimeType: 'image/jpeg' };
    }
  } catch (sharpErr) {
    console.warn('[API OG IMAGE] Sharp conversion fallback:', (sharpErr as Error)?.message || sharpErr);
  }

  return { buffer: rawBuffer, mimeType: sourceMimeType || 'image/jpeg' };
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end();
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method tidak diizinkan. Gunakan GET.' }, 'no-store');
    return;
  }

  try {
    const paramId = (req as any).params?.id ? String((req as any).params.id) : undefined;
    const projectId =
      getQueryParam(req, 'project') ||
      getQueryParam(req, 'p') ||
      getQueryParam(req, 'id') ||
      paramId;
    const requestedType = getQueryParam(req, 'type');

    let targetUrl = '';
    let cacheKey = '';

    if (projectId && requestedType !== 'hero') {
      const resolvedProj = await resolveProjectOgById(projectId);
      if (resolvedProj?.imageUrl) {
        targetUrl = resolvedProj.imageUrl;
        cacheKey = `proj:${resolvedProj.project.id}:${resolvedProj.version}`;
      }
    }

    if (!targetUrl) {
      const hero = await resolveHeroOgSource();
      targetUrl = hero.imageUrl;
      cacheKey = `hero:${hero.version}`;
    }

    const cache = getOgJpegCache();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < MAX_OG_JPEG_CACHE_TTL_MS) {
      res.statusCode = 200;
      res.setHeader('Content-Type', cached.mimeType);
      res.setHeader('Content-Length', String(cached.buffer.length));
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Cache-Control',
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
      );
      res.setHeader(
        'CDN-Cache-Control',
        'public, max-age=86400, stale-while-revalidate=604800'
      );
      res.setHeader(
        'Vercel-CDN-Cache-Control',
        'public, max-age=86400, stale-while-revalidate=604800'
      );
      if (method === 'HEAD') {
        res.end();
        return;
      }
      res.end(cached.buffer);
      return;
    }

    let loaded = await loadMediaBuffer(targetUrl);
    let effectiveSourceUrl = targetUrl;

    if (!loaded && targetUrl !== DEFAULT_HERO_OG_IMAGE_PATH) {
      loaded = await loadMediaBuffer(DEFAULT_HERO_OG_IMAGE_PATH);
      effectiveSourceUrl = DEFAULT_HERO_OG_IMAGE_PATH;
    }

    if (!loaded || !loaded.buffer || loaded.buffer.length === 0) {
      sendJson(res, 404, { error: 'Gambar OG thumbnail tidak ditemukan.' }, 'no-store');
      return;
    }

    const finalMedia = await normalizeToWhatsappJpeg(
      loaded.buffer,
      loaded.mimeType,
      effectiveSourceUrl
    );

    setOgJpegCache(cacheKey, {
      buffer: finalMedia.buffer,
      mimeType: finalMedia.mimeType,
      cachedAt: Date.now(),
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', finalMedia.mimeType);
    res.setHeader('Content-Length', String(finalMedia.buffer.length));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
    );
    res.setHeader(
      'CDN-Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800'
    );
    res.setHeader(
      'Vercel-CDN-Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800'
    );

    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(finalMedia.buffer);
  } catch (err: any) {
    logSafeApiError('API OG IMAGE ERROR', err);
    sendJson(
      res,
      500,
      { error: err?.message || 'Gagal memproses gambar OpenGraph.' },
      'no-store'
    );
  }
}
