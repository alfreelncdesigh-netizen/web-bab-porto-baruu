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
  getQueryParam,
  isAdminAuthorized,
  readJsonBody,
  sendJson,
} from './_lib/httpHelpers';
import {
  createInitialQuickFilterSeed,
  type ItemsJsonData,
} from './_lib/seedDefaults';

function normalizeQuickFilterRecord(raw: any, existing?: any): any {
  const id = String(raw?.id ?? existing?.id ?? `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`).trim();
  const imagesRaw = Array.isArray(raw?.images)
    ? raw.images
    : Array.isArray(existing?.images)
    ? existing.images
    : [];
  const images = imagesRaw
    .map((u: any) => sanitizeStoredMediaUrl(u))
    .filter((u: string) => u.length > 0);

  return {
    ...(existing || {}),
    ...raw,
    id,
    question: String(raw?.question ?? existing?.question ?? '').trim(),
    answer: String(raw?.answer ?? existing?.answer ?? '').trim(),
    category: String(raw?.category ?? existing?.category ?? 'Tren Desain').trim() || 'Tren Desain',
    images,
    tags: Array.isArray(raw?.tags)
      ? raw.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : Array.isArray(existing?.tags)
      ? existing.tags
      : [],
    order: typeof raw?.order === 'number' ? raw.order : existing?.order ?? 0,
    published: raw?.published !== undefined ? raw.published !== false : existing?.published !== false,
    createdAt: existing?.createdAt || raw?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<ItemsJsonData>(
        BLOB_PATHS.QUICK_FILTER,
        createInitialQuickFilterSeed
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      sendJson(res, 200, {
        items,
        totalCount: items.length,
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
      if (Array.isArray(body) || Array.isArray(body?.items)) {
        const list = Array.isArray(body) ? body : body.items;
        const { data } = await mutateJsonInBlob<ItemsJsonData>(
          BLOB_PATHS.QUICK_FILTER,
          (current) => ({
            items: list.map((item: any) => normalizeQuickFilterRecord(item)),
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          }),
          createInitialQuickFilterSeed,
          3
        );
        sendJson(res, 200, { success: true, items: data.items, updatedAt: data.updatedAt });
        return;
      }

      const incoming = body?.item && typeof body.item === 'object' ? body.item : body;
      if (!incoming || typeof incoming !== 'object' || (!incoming.question && !incoming.id)) {
        sendJson(res, 400, { error: 'Data wawasan Quick Filter tidak valid.' });
        return;
      }

      let savedItem: any = null;
      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.QUICK_FILTER,
        (current) => {
          const items = Array.isArray(current.items) ? [...current.items] : [];
          const targetId = String(
            incoming.id ?? `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
          ).trim();
          const idx = items.findIndex((q: any) => String(q?.id) === targetId);
          savedItem = normalizeQuickFilterRecord(
            { ...incoming, id: targetId },
            idx >= 0 ? items[idx] : undefined
          );
          if (idx >= 0) {
            items[idx] = savedItem;
          } else {
            items.push(savedItem);
          }
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialQuickFilterSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        item: savedItem,
        items: data.items,
        updatedAt: data.updatedAt,
      });
      return;
    }

    if (method === 'DELETE') {
      const targetId = getQueryParam(req, 'id') || (body?.id !== undefined ? String(body.id) : undefined);
      if (!targetId) {
        sendJson(res, 400, { error: 'ID item wawasan wajib disertakan.' });
        return;
      }

      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.QUICK_FILTER,
        (current) => ({
          items: (Array.isArray(current.items) ? current.items : []).filter(
            (q: any) => String(q?.id) !== String(targetId)
          ),
          updatedAt: new Date().toISOString(),
          version: (current.version || 1) + 1,
        }),
        createInitialQuickFilterSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: data.items,
        updatedAt: data.updatedAt,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'QUICK_FILTER_ERROR';
    console.error('[API QUICK FILTER ERROR]', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data Quick Filter.',
      code,
    });
  }
}
