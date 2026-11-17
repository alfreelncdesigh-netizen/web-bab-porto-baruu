import type { ServerResponse } from 'http';
import {
  BLOB_PATHS,
  BlobStoreError,
  mutateJsonInBlob,
  readJsonFromBlob,
} from './_lib/blobJsonStore';
import {
  type ApiRequest,
  getQueryParam,
  isAdminAuthorized,
  readJsonBody,
  sendJson,
} from './_lib/httpHelpers';
import {
  createInitialExperienceSeed,
  type ExperienceJsonData,
} from './_lib/seedDefaults';

function normalizeExperienceRecord(raw: any, existing?: any): any {
  const id = String(raw?.id ?? existing?.id ?? Date.now()).trim();
  const imagesRaw = Array.isArray(raw?.images)
    ? raw.images
    : Array.isArray(existing?.images)
    ? existing.images
    : [];
  const images = imagesRaw
    .map((u: any) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u: string) => u.length > 0 && !u.startsWith('blob:'));

  const mainImg =
    typeof raw?.image === 'string' && raw.image.trim()
      ? raw.image.trim()
      : existing?.image || images[0] || '';

  const finalImages =
    images.length > 0
      ? mainImg && !images.includes(mainImg)
        ? [mainImg, ...images]
        : images
      : mainImg
      ? [mainImg]
      : [];

  return {
    ...(existing || {}),
    ...raw,
    id,
    header: String(raw?.header ?? existing?.header ?? '').trim(),
    subtheme: String(raw?.subtheme ?? existing?.subtheme ?? '').trim(),
    description: String(raw?.description ?? existing?.description ?? '').trim(),
    image: mainImg,
    images: finalImages,
    isCollaboration: Boolean(raw?.isCollaboration ?? existing?.isCollaboration ?? false),
    collaborationPartner: String(raw?.collaborationPartner ?? existing?.collaborationPartner ?? '').trim(),
    collaborationLogo: String(raw?.collaborationLogo ?? existing?.collaborationLogo ?? '').trim(),
    collaborationText: String(raw?.collaborationText ?? existing?.collaborationText ?? '').trim(),
    isArchived: Boolean(raw?.isArchived ?? existing?.isArchived ?? false),
    archiveFolderId:
      raw?.archiveFolderId !== undefined ? raw.archiveFolderId : existing?.archiveFolderId ?? null,
    createdAt: existing?.createdAt || raw?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<ExperienceJsonData>(
        BLOB_PATHS.EXPERIENCE,
        createInitialExperienceSeed
      );
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const includeArchived = getQueryParam(req, 'includeArchived') === 'true';

      const filtered = includeArchived
        ? rawItems
        : rawItems.filter((item: any) => item && item.isArchived !== true && item.isDeleted !== true);

      sendJson(res, 200, {
        items: filtered,
        totalCount: rawItems.length,
        updatedAt: data.updatedAt,
        version: data.version || 1,
      });
      return;
    }

    if (!isAdminAuthorized(req)) {
      sendJson(res, 401, {
        error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const body = await readJsonBody(req);

    if (method === 'POST' || method === 'PUT') {
      if (method === 'PUT' && Array.isArray(body?.items)) {
        const { data } = await mutateJsonInBlob<ExperienceJsonData>(
          BLOB_PATHS.EXPERIENCE,
          (current) => ({
            items: body.items.map((item: any) => normalizeExperienceRecord(item)),
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          }),
          createInitialExperienceSeed,
          3
        );
        sendJson(res, 200, {
          success: true,
          items: data.items.filter((e: any) => e.isArchived !== true),
          updatedAt: data.updatedAt,
          version: data.version,
        });
        return;
      }

      const incoming = body?.experience && typeof body.experience === 'object' ? body.experience : body;
      if (!incoming || typeof incoming !== 'object' || (!incoming.header && !incoming.id)) {
        sendJson(res, 400, { error: 'Data pengalaman tidak valid.' });
        return;
      }

      let savedItem: any = null;
      const { data } = await mutateJsonInBlob<ExperienceJsonData>(
        BLOB_PATHS.EXPERIENCE,
        (current) => {
          const items = Array.isArray(current.items) ? [...current.items] : [];
          const targetId = String(incoming.id ?? Date.now()).trim();
          const idx = items.findIndex((item: any) => String(item?.id) === targetId);
          savedItem = normalizeExperienceRecord(
            { ...incoming, id: targetId },
            idx >= 0 ? items[idx] : undefined
          );
          if (idx >= 0) {
            items[idx] = savedItem;
          } else {
            items.unshift(savedItem);
          }
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialExperienceSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        item: savedItem,
        items: data.items.filter((e: any) => e.isArchived !== true),
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    if (method === 'PATCH') {
      const bulkIds: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String) : null;
      const singleId = body?.id !== undefined ? String(body.id) : getQueryParam(req, 'id');
      const updates = body?.updates && typeof body.updates === 'object' ? body.updates : body;

      if (!bulkIds && !singleId) {
        sendJson(res, 400, { error: 'ID pengalaman wajib diisi untuk pembaruan.' });
        return;
      }

      const idSet = new Set(bulkIds || [String(singleId)]);
      let matched = 0;

      const { data } = await mutateJsonInBlob<ExperienceJsonData>(
        BLOB_PATHS.EXPERIENCE,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).map((item: any) => {
            if (!idSet.has(String(item?.id))) return item;
            matched++;
            const nextImages = Array.isArray(updates?.images)
              ? updates.images
              : updates?.appendImages && Array.isArray(updates.appendImages)
              ? Array.from(new Set([...(Array.isArray(item.images) ? item.images : []), ...updates.appendImages]))
              : item.images;
            return {
              ...item,
              ...(nextImages !== undefined ? { images: nextImages, image: nextImages[0] || item.image || '' } : {}),
              ...(updates?.isArchived !== undefined ? { isArchived: Boolean(updates.isArchived) } : {}),
              ...(updates?.archiveFolderId !== undefined
                ? { archiveFolderId: updates.archiveFolderId }
                : {}),
              updatedAt: Date.now(),
            };
          });
          if (matched === 0) {
            throw new BlobStoreError('Pengalaman tidak ditemukan di Vercel Blob.', 404, 'NOT_FOUND');
          }
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialExperienceSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: data.items.filter((e: any) => e.isArchived !== true),
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    if (method === 'DELETE') {
      const bulkIds: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String) : null;
      const singleId = getQueryParam(req, 'id') || (body?.id !== undefined ? String(body.id) : undefined);

      if (!bulkIds && !singleId) {
        sendJson(res, 400, { error: 'ID pengalaman yang akan dihapus wajib diisi.' });
        return;
      }

      const idSet = new Set(bulkIds || [String(singleId)]);

      const { data } = await mutateJsonInBlob<ExperienceJsonData>(
        BLOB_PATHS.EXPERIENCE,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).filter(
            (item: any) => !idSet.has(String(item?.id))
          );
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialExperienceSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: data.items.filter((e: any) => e.isArchived !== true),
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'EXPERIENCE_ERROR';
    console.error('[API EXPERIENCE ERROR]', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data pengalaman di Vercel Blob.',
      code,
    });
  }
}
