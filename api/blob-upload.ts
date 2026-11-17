import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

const FOLDER_MAP: Record<string, string> = {
  portfolio: 'portfolio',
  portofolio: 'portfolio',
  works: 'portfolio',
  work: 'portfolio',
  karya: 'portfolio',
  cv: 'cv',
  resume: 'cv',
  hero: 'hero',
  about: 'about',
  profile: 'about',
  banners: 'banners',
  banner: 'banners',
  posters: 'posters',
  poster: 'posters',
  promos: 'posters',
  promo: 'posters',
  experiences: 'experiences',
  experience: 'experiences',
  pengalaman: 'experiences',
  blogs: 'blogs',
  blog: 'blogs',
  collaboration: 'collaboration',
  insight: 'insight',
  insights: 'insight',
  orders: 'orders',
  settings: 'settings',
};

function sanitizeFolder(raw?: string | string[]): string {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const key = String(val || 'portfolio')
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '');
  return FOLDER_MAP[key] || 'portfolio';
}

function getExtAndMime(filename: string, rawMime?: string): { ext: string; mime: string } | null {
  const lower = filename.toLowerCase();
  const ext = path.extname(lower);
  const mimeLower = (rawMime || '').toLowerCase();

  if (ext === '.pdf' || mimeLower === 'application/pdf') {
    return { ext: '.pdf', mime: 'application/pdf' };
  }
  if (ext === '.svg' || mimeLower === 'image/svg+xml') {
    return { ext: '.svg', mime: 'image/svg+xml' };
  }
  if (ext === '.png' || mimeLower === 'image/png') {
    return { ext: '.png', mime: 'image/png' };
  }
  if (ext === '.jpg' || ext === '.jpeg' || mimeLower === 'image/jpeg' || mimeLower === 'image/jpg') {
    return { ext: ext === '.jpeg' ? '.jpeg' : '.jpg', mime: 'image/jpeg' };
  }
  if (ext === '.webp' || mimeLower === 'image/webp' || !ext) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  return null;
}

function parseMultipartOrRaw(
  fullBuffer: Buffer,
  contentType: string,
  headerFilename: string
): { fileBuffer: Buffer | null; filename: string; partContentType?: string } {
  let filename = headerFilename || 'asset.webp';
  let fileBuffer: Buffer | null = null;
  let partContentType = '';

  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : '';
    if (boundary) {
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      let startIdx = fullBuffer.indexOf(boundaryBuffer);
      while (startIdx !== -1) {
        const nextIdx = fullBuffer.indexOf(boundaryBuffer, startIdx + boundaryBuffer.length);
        if (nextIdx === -1) break;

        const part = fullBuffer.slice(startIdx, nextIdx);
        let headerEndIdx = part.indexOf(Buffer.from('\r\n\r\n'));
        let headerOffset = 4;
        if (headerEndIdx === -1) {
          headerEndIdx = part.indexOf(Buffer.from('\n\n'));
          headerOffset = 2;
        }

        if (headerEndIdx !== -1) {
          const headerStr = part.slice(0, headerEndIdx).toString('utf-8');
          if (headerStr.includes('filename="')) {
            const fnMatch = headerStr.match(/filename="([^"]+)"/);
            if (fnMatch) filename = fnMatch[1];
            const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
            if (ctMatch) partContentType = ctMatch[1].trim();
            const dataStart = headerEndIdx + headerOffset;
            let dataEnd = part.length;
            if (part.slice(dataEnd - 2).equals(Buffer.from('\r\n'))) {
              dataEnd -= 2;
            } else if (part.slice(dataEnd - 1).equals(Buffer.from('\n'))) {
              dataEnd -= 1;
            }
            fileBuffer = part.slice(dataStart, dataEnd);
            break;
          }
        }
        startIdx = nextIdx;
      }
    }
  } else if (contentType.includes('application/json')) {
    try {
      const json = JSON.parse(fullBuffer.toString('utf-8'));
      if (json && (json.data || json.file)) {
        if (json.filename) filename = String(json.filename);
        const rawData = String(json.data || json.file);
        const mimeMatch = rawData.match(/^data:([^;]+);base64,/);
        if (mimeMatch) partContentType = mimeMatch[1];
        const base64Data = rawData.replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
      }
    } catch {}
  } else if (fullBuffer.length > 0) {
    fileBuffer = fullBuffer;
  }

  return { fileBuffer, filename, partContentType };
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse
) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method tidak diizinkan. Gunakan POST.' }));
    return;
  }

  const adminToken = req.headers['x-admin-token'] || req.headers['authorization'];
  const requestedFolder = sanitizeFolder(
    (req.headers['x-blob-folder'] as string | undefined) || req.query?.folder
  );

  // Public store order reference uploads may use folder=orders without admin login
  if (
    requestedFolder !== 'orders' &&
    adminToken !== 'alfreelnc_admin_auth_verified' &&
    adminToken !== 'Bearer alfreelnc_admin_auth_verified'
  ) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.' }));
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Konfigurasi Vercel Blob belum diatur: environment variable BLOB_READ_WRITE_TOKEN tidak ditemukan di server.',
      })
    );
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const fullBuffer = Buffer.concat(chunks);
    const contentType = String(req.headers['content-type'] || '');
    const rawHeaderFn = String(req.headers['x-filename'] || req.query?.filename || 'asset.webp');

    const { fileBuffer, filename, partContentType } = parseMultipartOrRaw(fullBuffer, contentType, rawHeaderFn);

    if (!fileBuffer || fileBuffer.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'File kosong atau tidak diterima oleh server.' }));
      return;
    }

    const typeInfo = getExtAndMime(filename, partContentType || (contentType.startsWith('image/') || contentType === 'application/pdf' ? contentType : ''));
    if (!typeInfo) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Format file "${filename}" tidak didukung. Gunakan JPG, PNG, WebP, SVG, atau PDF.` }));
      return;
    }

    const maxBytes = typeInfo.ext === '.pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (fileBuffer.length > maxBytes) {
      const maxMb = maxBytes / (1024 * 1024);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Ukuran file melebihi batas maksimal ${maxMb} MB.` }));
      return;
    }

    const rawBase =
      path
        .basename(filename, path.extname(filename))
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'asset';

    const blobPathname = `${requestedFolder}/${Date.now()}-${rawBase}${typeInfo.ext}`;

    const blob = await put(blobPathname, fileBuffer, {
      access: 'public',
      contentType: typeInfo.mime,
      addRandomSuffix: false,
      token,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        url: blob.url,
        pathname: blob.pathname,
        size: fileBuffer.length,
        storage: 'vercel-blob',
      })
    );
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Upload ke Vercel Blob gagal.';
    console.error('[VERCEL BLOB UPLOAD ERROR]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: msg }));
  }
}
