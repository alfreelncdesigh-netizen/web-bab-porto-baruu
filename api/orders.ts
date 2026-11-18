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
  createInitialOrdersSeed,
  type ItemsJsonData,
} from './_lib/seedDefaults.js';

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const urlPath = (req.url || '').split('?')[0];
  const pathMatch = urlPath.match(/\/api\/orders\/([^/?]+)/);
  const pathOrderId = pathMatch ? decodeURIComponent(pathMatch[1]) : undefined;

  try {
    if (method === 'GET') {
      if (!isAdminAuthorized(req)) {
        sendJson(res, 401, {
          error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { data } = await readJsonFromBlob<ItemsJsonData>(
        BLOB_PATHS.ORDERS,
        createInitialOrdersSeed
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

    const body = await readJsonBody(req);

    if (method === 'POST') {
      if (!body || typeof body !== 'object') {
        sendJson(res, 400, { error: 'Payload pesanan tidak valid.' });
        return;
      }

      const orderId = String(
        body.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      );
      const newOrder = {
        ...body,
        id: orderId,
        status: body.status || 'pending',
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.ORDERS,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).filter(
            (o: any) => String(o?.id) !== orderId
          );
          items.unshift(newOrder);
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialOrdersSeed,
        3
      );

      sendJson(res, 200, { success: true, order: newOrder });
      return;
    }

    if (!isAdminAuthorized(req)) {
      sendJson(res, 401, {
        error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    if (method === 'PATCH') {
      const targetId = pathOrderId || getQueryParam(req, 'id') || (body?.id ? String(body.id) : '');
      if (!targetId) {
        sendJson(res, 400, { error: 'ID pesanan wajib disertakan.' });
        return;
      }

      let updatedOrder: any = null;
      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.ORDERS,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).map((o: any) => {
            if (String(o?.id) !== targetId) return o;
            updatedOrder = {
              ...o,
              ...(body?.status ? { status: body.status } : {}),
              updatedAt: new Date().toISOString(),
            };
            return updatedOrder;
          });
          if (!updatedOrder) {
            throw new BlobStoreError('Pesanan tidak ditemukan.', 404, 'NOT_FOUND');
          }
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialOrdersSeed,
        3
      );

      sendJson(res, 200, { success: true, order: updatedOrder, items: data.items });
      return;
    }

    if (method === 'DELETE') {
      const targetId = pathOrderId || getQueryParam(req, 'id') || (body?.id ? String(body.id) : '');
      if (!targetId) {
        sendJson(res, 400, { error: 'ID pesanan wajib disertakan.' });
        return;
      }

      const { data } = await mutateJsonInBlob<ItemsJsonData>(
        BLOB_PATHS.ORDERS,
        (current) => ({
          items: (Array.isArray(current.items) ? current.items : []).filter(
            (o: any) => String(o?.id) !== targetId
          ),
          updatedAt: new Date().toISOString(),
          version: (current.version || 1) + 1,
        }),
        createInitialOrdersSeed,
        3
      );

      sendJson(res, 200, { success: true, items: data.items });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'ORDERS_ERROR';
    logSafeApiError('API ORDERS ERROR', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data pesanan.',
      code,
    });
  }
}
