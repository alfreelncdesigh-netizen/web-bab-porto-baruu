import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function parseMultipartOrRaw(
  fullBuffer: Buffer,
  contentType: string,
  headerFilename: string
): { fileBuffer: Buffer | null; filename: string } {
  let filename = headerFilename || 'karya.webp';
  let fileBuffer: Buffer | null = null;

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
  } else if (fullBuffer.length > 0) {
    fileBuffer = fullBuffer;
  }

  return { fileBuffer, filename };
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
  if (
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
    const rawHeaderFn = String(req.headers['x-filename'] || req.query?.filename || 'karya.webp');

    const { fileBuffer, filename } = parseMultipartOrRaw(fullBuffer, contentType, rawHeaderFn);

    if (!fileBuffer || fileBuffer.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'File gambar kosong atau tidak diterima oleh server.' }));
      return;
    }

    if (fileBuffer.length > MAX_BYTES) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Ukuran file gambar melebihi batas maksimal 5 MB.' }));
      return;
    }

    const rawBase =
      path
        .basename(filename, path.extname(filename))
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'karya';

    const blobPathname = `portfolio/${Date.now()}-${rawBase}.webp`;

    const blob = await put(blobPathname, fileBuffer, {
      access: 'public',
      contentType: 'image/webp',
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
      })
    );
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Upload gambar ke Vercel Blob gagal.';
    console.error('[VERCEL BLOB UPLOAD ERROR]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: msg }));
  }
}
