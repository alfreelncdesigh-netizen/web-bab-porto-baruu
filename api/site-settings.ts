import type { ServerResponse } from 'http';
import {
  BLOB_PATHS,
  BlobStoreError,
  mutateJsonInBlob,
  readJsonFromBlob,
  sanitizeStoredMediaUrl,
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
      const cleanSettings: SiteSettingsJsonData = {
        ...data,
        heroImage: sanitizeStoredMediaUrl(data?.heroImage) || DEFAULT_SITE_SETTINGS_SEED.heroImage,
        aboutImage: sanitizeStoredMediaUrl(data?.aboutImage),
        promoWidgetImage: sanitizeStoredMediaUrl(data?.promoWidgetImage),
        heroBanners: Array.isArray(data?.heroBanners)
          ? data.heroBanners.map((b: any) => ({
              ...b,
              image: sanitizeStoredMediaUrl(b?.image) || b?.image || '',
            }))
          : DEFAULT_SITE_SETTINGS_SEED.heroBanners,
        promoPosters: Array.isArray(data?.promoPosters)
          ? data.promoPosters.map((p: any) => ({
              ...p,
              image: sanitizeStoredMediaUrl(p?.image),
            }))
          : [],
        collaboration: {
          ...DEFAULT_SITE_SETTINGS_SEED.collaboration,
          ...(data?.collaboration || {}),
          partnerLogo: sanitizeStoredMediaUrl(data?.collaboration?.partnerLogo),
          collaboratorAccounts: Array.isArray(data?.collaboration?.collaboratorAccounts)
            ? data.collaboration.collaboratorAccounts.map((acc: any) => ({
                ...acc,
                partnerLogo: sanitizeStoredMediaUrl(acc?.partnerLogo),
              }))
            : DEFAULT_SITE_SETTINGS_SEED.collaboration.collaboratorAccounts,
        },
      };
      sendJson(res, 200, { settings: cleanSettings, updatedAt: data.updatedAt, version: data.version || 1 });
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
      } else if (sanitizedIncoming.heroImage !== undefined) {
        sanitizedIncoming.heroImage =
          sanitizeStoredMediaUrl(sanitizedIncoming.heroImage) || DEFAULT_SITE_SETTINGS_SEED.heroImage;
      }
      if (sanitizedIncoming.aboutImage !== undefined) {
        sanitizedIncoming.aboutImage = sanitizeStoredMediaUrl(sanitizedIncoming.aboutImage);
      }
      if (sanitizedIncoming.promoWidgetImage !== undefined) {
        sanitizedIncoming.promoWidgetImage = sanitizeStoredMediaUrl(sanitizedIncoming.promoWidgetImage);
      }
      if (Array.isArray(sanitizedIncoming.heroBanners)) {
        sanitizedIncoming.heroBanners = sanitizedIncoming.heroBanners.map((b: any) => ({
          ...b,
          image: sanitizeStoredMediaUrl(b?.image) || b?.image || '',
        }));
      }
      if (Array.isArray(sanitizedIncoming.promoPosters)) {
        sanitizedIncoming.promoPosters = sanitizedIncoming.promoPosters.map((p: any) => ({
          ...p,
          image: sanitizeStoredMediaUrl(p?.image),
        }));
      }
      if (sanitizedIncoming.collaboration && typeof sanitizedIncoming.collaboration === 'object') {
        sanitizedIncoming.collaboration = {
          ...sanitizedIncoming.collaboration,
          ...(sanitizedIncoming.collaboration.partnerLogo !== undefined
            ? { partnerLogo: sanitizeStoredMediaUrl(sanitizedIncoming.collaboration.partnerLogo) }
            : {}),
          ...(Array.isArray(sanitizedIncoming.collaboration.collaboratorAccounts)
            ? {
                collaboratorAccounts: sanitizedIncoming.collaboration.collaboratorAccounts.map((acc: any) => ({
                  ...acc,
                  partnerLogo: sanitizeStoredMediaUrl(acc?.partnerLogo),
                })),
              }
            : {}),
        };
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
