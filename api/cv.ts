import type { ServerResponse } from 'http';
import {
  BLOB_PATHS,
  BlobStoreError,
  mutateJsonInBlob,
  readJsonFromBlob,
  sanitizeStoredMediaUrl,
} from './_lib/blobJsonStore.js';
import {
  type ApiRequest,
  isAdminAuthorized,
  logSafeApiError,
  readJsonBody,
  sendJson,
} from './_lib/httpHelpers.js';
import {
  createInitialCvSeed,
  type CvJsonData,
  type CvSectionSeed,
  DEFAULT_CV_SECTIONS,
} from './_lib/seedDefaults.js';

function normalizeCvSections(rawSections: any[]): CvSectionSeed[] {
  return rawSections.map((sec: any) => ({
    title: String(sec?.title || ''),
    content: String(sec?.content || ''),
    images: Array.isArray(sec?.images)
      ? sec.images
          .map((u: any) => sanitizeStoredMediaUrl(u))
          .filter((u: string) => u.length > 0)
      : typeof sec?.image === 'string' && sec.image.trim()
      ? [sanitizeStoredMediaUrl(sec.image)].filter(Boolean)
      : [],
  }));
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<CvJsonData>(BLOB_PATHS.CV, createInitialCvSeed);
      const cleanCv: CvJsonData = {
        ...data,
        cvPdfFile: sanitizeStoredMediaUrl(data?.cvPdfFile),
        cvSections: Array.isArray(data?.cvSections)
          ? normalizeCvSections(data.cvSections)
          : DEFAULT_CV_SECTIONS,
      };
      sendJson(res, 200, { cv: cleanCv, updatedAt: data.updatedAt, version: data.version || 1 });
      return;
    }

    if (method === 'PUT' || method === 'POST' || method === 'PATCH') {
      if (!isAdminAuthorized(req)) {
        sendJson(res, 401, {
          error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const body = await readJsonBody(req);
      const incoming = body?.cv && typeof body.cv === 'object' ? body.cv : body;
      if (!incoming || typeof incoming !== 'object') {
        sendJson(res, 400, { error: 'Payload data CV tidak valid.' });
        return;
      }

      const { data } = await mutateJsonInBlob<CvJsonData>(
        BLOB_PATHS.CV,
        (current) => ({
          cvRole:
            incoming.cvRole !== undefined
              ? String(incoming.cvRole)
              : current.cvRole || 'Desainer Grafis',
          cvPdfFile:
            incoming.cvPdfFile !== undefined
              ? sanitizeStoredMediaUrl(incoming.cvPdfFile)
              : current.cvPdfFile || '',
          cvSections: Array.isArray(incoming.cvSections)
            ? normalizeCvSections(incoming.cvSections)
            : Array.isArray(current.cvSections) && current.cvSections.length > 0
            ? current.cvSections
            : DEFAULT_CV_SECTIONS,
          updatedAt: new Date().toISOString(),
          version: (current.version || 1) + 1,
        }),
        createInitialCvSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        cv: data,
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'CV_ERROR';
    logSafeApiError('API CV ERROR', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data CV di Vercel Blob.',
      code,
    });
  }
}
