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
  getQueryParam,
  isAdminAuthorized,
  logSafeApiError,
  readJsonBody,
  sendJson,
} from './_lib/httpHelpers.js';
import {
  createInitialBlogsSeed,
  type ItemsJsonData,
} from './_lib/seedDefaults.js';

function normalizeBlogRecord(raw: any, existing?: any): any {
  const id = String(raw?.id ?? existing?.id ?? Date.now()).trim();
  const rawImg =
    typeof raw?.image === 'string' && raw.image.trim()
      ? raw.image.trim()
      : existing?.image || '';
  const cleanImg = sanitizeStoredMediaUrl(rawImg);

  return {
    ...(existing || {}),
    ...raw,
    id,
    title: String(raw?.title ?? existing?.title ?? 'Tanpa Judul').trim(),
    content: String(raw?.content ?? existing?.content ?? ''),
    image: cleanImg,
    category: String(raw?.category ?? existing?.category ?? 'Umum').trim() || 'Umum',
    date: String(raw?.date ?? existing?.date ?? new Date().toISOString()),
    published: Boolean(raw?.published ?? existing?.published ?? true),
    isCollaboration: Boolean(raw?.isCollaboration ?? existing?.isCollaboration ?? false),
    collaborationPartner: String(raw?.collaborationPartner ?? existing?.collaborationPartner ?? '').trim(),
    collaborationLogo: sanitizeStoredMediaUrl(
      raw?.collaborationLogo !== undefined ? raw.collaborationLogo : existing?.collaborationLogo
    ),
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
      const { data } = await readJsonFromBlob<ItemsJsonData>(
        BLOB_PATHS.BLOGS,
        createInitialBlogsSeed
      );
      const rawItems = (Array.isArray(data?.items) ? data.items : []).map((item: any) =>
        normalizeBlogRecord(item, item)
      );
      const includeArchived = getQueryParam(req, 'includeArchived') === 'true';

      const filtered = includeArchived
        ? rawItems
        : rawItems.filter((b: any) => b && b.isArchived !== true && b.isDeleted !== true);

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
      if (Array.isArray(body) || Array.isArray(body?.items)) {
        const list = Array.isArray(body) ? body : body.items;
        const { data } = await mutateJsonInBlob<ItemsJsonData>(
          BLOB_PATHS.BLOGS,
          (current) => ({
            items: list.map((item: any) => normalizeBlogRecord(item)),
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          }),
          createInitialBlogsSeed,
          3
        );
        sendJson(res, 200, {
          success: true,
          items: data.items.filter((b: any) => b.isArchived !== true),
          updatedAt: data.updatedAt,
          version: data.version,
        });
        return;
      }

      const incoming = body?.post && typeof body.post === 'object' ? body.post : body;
      if (!incoming || typeof incoming !== 'object' || (!incoming.title && !incoming.id)) {
        sendJson(res, 400, { error: 'Data artikel blog tidak valid.' });
        return;
      }

      let savedItem: any = null;
      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.BLOGS,
        (current) => {
          const items = Array.isArray(current.items) ? [...current.items] : [];
          const targetId = String(incoming.id ?? Date.now()).trim();
          const idx = items.findIndex((b: any) => String(b?.id) === targetId);
          savedItem = normalizeBlogRecord({ ...incoming, id: targetId }, idx >= 0 ? items[idx] : undefined);
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
        createInitialBlogsSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        item: savedItem,
        items: data.items.filter((b: any) => b.isArchived !== true),
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
        sendJson(res, 400, { error: 'ID artikel blog wajib disertakan.' });
        return;
      }

      const idSet = new Set(bulkIds || [String(singleId)]);
      let matched = 0;

      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.BLOGS,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).map((item: any) => {
            if (!idSet.has(String(item?.id))) return item;
            matched++;
            return {
              ...item,
              ...(updates?.published !== undefined ? { published: Boolean(updates.published) } : {}),
              ...(updates?.isArchived !== undefined ? { isArchived: Boolean(updates.isArchived) } : {}),
              ...(updates?.archiveFolderId !== undefined
                ? { archiveFolderId: updates.archiveFolderId }
                : {}),
              updatedAt: Date.now(),
            };
          });
          if (matched === 0) {
            throw new BlobStoreError('Artikel blog tidak ditemukan.', 404, 'NOT_FOUND');
          }
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialBlogsSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: data.items.filter((b: any) => b.isArchived !== true),
        allItems: data.items,
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    if (method === 'DELETE') {
      const bulkIds: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String) : null;
      const singleId = getQueryParam(req, 'id') || (body?.id !== undefined ? String(body.id) : undefined);

      if (!bulkIds && !singleId) {
        sendJson(res, 400, { error: 'ID artikel blog wajib diisi.' });
        return;
      }

      const idSet = new Set(bulkIds || [String(singleId)]);

      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.BLOGS,
        (current) => ({
          items: (Array.isArray(current.items) ? current.items : []).filter(
            (item: any) => !idSet.has(String(item?.id))
          ),
          updatedAt: new Date().toISOString(),
          version: (current.version || 1) + 1,
        }),
        createInitialBlogsSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: data.items.filter((b: any) => b.isArchived !== true),
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'BLOGS_ERROR';
    logSafeApiError('API BLOGS ERROR', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data blog.',
      code,
    });
  }
}
