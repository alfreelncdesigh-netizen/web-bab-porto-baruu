import type { ServerResponse } from 'http';
import { type ApiRequest, getQueryParam, logSafeApiError, sendJson } from './_lib/httpHelpers.js';
import {
  isAllowedMediaProxyUrl,
  normalizeCanonicalMediaUrl,
  readMediaByDocIdFromFirestore,
  resolveAndCacheMedia,
} from './_lib/serverCache.js';

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
    const rawUrl = getQueryParam(req, 'url');
    const docId = getQueryParam(req, 'id');

    let resolved: { buffer: Buffer; mimeType: string; source: string } | null = null;

    if (rawUrl) {
      const normalized = normalizeCanonicalMediaUrl(rawUrl);
      if (!isAllowedMediaProxyUrl(normalized)) {
        sendJson(
          res,
          400,
          { error: 'URL media tidak diizinkan oleh kebijakan keamanan server cache.' },
          'no-store'
        );
        return;
      }
      resolved = await resolveAndCacheMedia(normalized);
    } else if (docId) {
      resolved = await readMediaByDocIdFromFirestore(docId);
    } else {
      sendJson(
        res,
        400,
        { error: 'Parameter query "url" atau "id" wajib disertakan.' },
        'no-store'
      );
      return;
    }

    if (!resolved || !resolved.buffer || resolved.buffer.length === 0) {
      sendJson(
        res,
        404,
        { error: 'Gambar tidak ditemukan pada origin maupun server cache.' },
        'no-store'
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', resolved.mimeType || 'image/webp');
    res.setHeader('Content-Length', String(resolved.buffer.length));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Server-Cache', resolved.source);
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=2592000'
    );
    res.setHeader(
      'CDN-Cache-Control',
      'public, max-age=31536000, stale-while-revalidate=2592000'
    );
    res.setHeader(
      'Vercel-CDN-Cache-Control',
      'public, max-age=31536000, stale-while-revalidate=2592000'
    );

    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(resolved.buffer);
  } catch (err: any) {
    logSafeApiError('API MEDIA CACHE ERROR', err);
    sendJson(
      res,
      500,
      { error: err?.message || 'Gagal membaca media dari server cache.' },
      'no-store'
    );
  }
}
