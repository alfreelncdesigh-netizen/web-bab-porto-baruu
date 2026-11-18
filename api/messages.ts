import type { ServerResponse } from 'http';
import {
  BLOB_PATHS,
  BlobStoreError,
  mutateJsonInBlob,
  readJsonFromBlob,
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
  createInitialMessagesSeed,
  type ItemsJsonData,
} from './_lib/seedDefaults.js';

const DUMMY_COMMENT_NAMES = new Set(['Rahmat Hidayat', 'Siti Nurhaliza', 'Dimas Pratama', 'Putri Ayu Lestari']);
const DUMMY_COMMENT_IDS = new Set(['msg_1730000101', 'msg_1730000102', 'msg_1730000103', 'msg_1730000104']);

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<ItemsJsonData>(
        BLOB_PATHS.MESSAGES,
        createInitialMessagesSeed
      );
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const filtered = rawItems.filter(
        (m: any) =>
          m &&
          m.isDeleted !== true &&
          m.status !== 'deleted' &&
          !DUMMY_COMMENT_IDS.has(String(m.id || '')) &&
          !DUMMY_COMMENT_NAMES.has(String(m.name || '').trim())
      );

      sendJson(res, 200, {
        items: filtered,
        totalCount: filtered.length,
        updatedAt: data.updatedAt,
        version: data.version || 1,
      });
      return;
    }

    if (method === 'POST') {
      const body = await readJsonBody(req);
      const messageText = String(body?.message || '').trim();
      if (!messageText) {
        sendJson(res, 400, { error: 'Isi pesan atau komentar wajib diisi.' });
        return;
      }

      const newMsg = {
        id: String(body?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
        name: String(body?.name || 'Pengunjung Anonim').trim() || 'Pengunjung Anonim',
        email: String(body?.email || '').trim(),
        message: messageText,
        dateAdded: String(body?.dateAdded || new Date().toISOString()),
      };

      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.MESSAGES,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).filter(
            (m: any) => String(m?.id) !== newMsg.id
          );
          items.unshift(newMsg);
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialMessagesSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        item: newMsg,
        items: data.items,
        updatedAt: data.updatedAt,
      });
      return;
    }

    if (method === 'DELETE') {
      if (!isAdminAuthorized(req)) {
        sendJson(res, 401, {
          error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const body = await readJsonBody(req);
      const targetId = getQueryParam(req, 'id') || (body?.id !== undefined ? String(body.id) : undefined);
      if (!targetId) {
        sendJson(res, 400, { error: 'ID pesan wajib disertakan.' });
        return;
      }

      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.MESSAGES,
        (current) => ({
          items: (Array.isArray(current.items) ? current.items : []).filter(
            (m: any) => String(m?.id) !== String(targetId)
          ),
          updatedAt: new Date().toISOString(),
          version: (current.version || 1) + 1,
        }),
        createInitialMessagesSeed,
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
    const code = err instanceof BlobStoreError ? err.code : 'MESSAGES_ERROR';
    logSafeApiError('API MESSAGES ERROR', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data pesan.',
      code,
    });
  }
}
