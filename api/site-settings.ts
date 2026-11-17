import type { ServerResponse } from 'http';
import {
  BLOB_PATHS,
  BlobStoreError,
  mutateJsonInBlob,
  readJsonFromBlob,
} from './_lib/blobJsonStore';
import {
  type ApiRequest,
  isAdminAuthorized,
  readJsonBody,
  sendJson,
} from './_lib/httpHelpers';
import {
  createInitialSiteSettingsSeed,
  DEFAULT_SITE_SETTINGS_SEED,
  type SiteSettingsJsonData,
} from './_lib/seedDefaults';

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<SiteSettingsJsonData>(
        BLOB_PATHS.SITE_SETTINGS,
        createInitialSiteSettingsSeed
      );
      sendJson(res, 200, { settings: data, updatedAt: data.updatedAt, version: data.version || 1 });
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
      const incoming = body?.settings && typeof body.settings === 'object' ? body.settings : body;
      if (!incoming || typeof incoming !== 'object') {
        sendJson(res, 400, { error: 'Payload pengaturan situs tidak valid.' });
        return;
      }

      const sanitizedIncoming = { ...incoming };
      delete sanitizedIncoming.cvRole;
      delete sanitizedIncoming.cvPdfFile;
      delete sanitizedIncoming.cvSections;
      delete sanitizedIncoming.heroImageDataUrl;
      delete sanitizedIncoming._adminAuth;
      delete sanitizedIncoming.updatedByAdmin;

      if (sanitizedIncoming.heroImage === '__RESET_DEFAULT__') {
        sanitizedIncoming.heroImage = DEFAULT_SITE_SETTINGS_SEED.heroImage;
      }

      const { data } = await mutateJsonInBlob<SiteSettingsJsonData>(
        BLOB_PATHS.SITE_SETTINGS,
        (current) => ({
          ...DEFAULT_SITE_SETTINGS_SEED,
          ...current,
          ...sanitizedIncoming,
          collaboration: {
            ...DEFAULT_SITE_SETTINGS_SEED.collaboration,
            ...(current.collaboration || {}),
            ...(sanitizedIncoming.collaboration || {}),
          },
          savedAt: Date.now(),
          updatedAt: new Date().toISOString(),
          version: (current.version || 1) + 1,
        }),
        createInitialSiteSettingsSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        settings: data,
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'SITE_SETTINGS_ERROR';
    console.error('[API SITE SETTINGS ERROR]', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses pengaturan situs di Vercel Blob.',
      code,
    });
  }
}
