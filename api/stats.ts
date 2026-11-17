import type { ServerResponse } from 'http';
import {
  BlobStoreError,
  incrementStatsView,
  readStatsWithCache,
} from './_lib/blobJsonStore';
import {
  type ApiRequest,
  sendJson,
} from './_lib/httpHelpers';

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data, cached, cachedUntil } = await readStatsWithCache();
      sendJson(
        res,
        200,
        {
          totalViews: data.totalViews,
          dailyViews: data.dailyViews,
          updatedAt: data.updatedAt,
          cached,
          cachedUntil,
        },
        'public, max-age=60, s-maxage=300'
      );
      return;
    }

    if (method === 'POST') {
      const { data, cachedUntil } = await incrementStatsView();
      sendJson(res, 200, {
        success: true,
        totalViews: data.totalViews,
        dailyViews: data.dailyViews,
        updatedAt: data.updatedAt,
        cachedUntil,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan. Gunakan GET atau POST.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'STATS_ERROR';
    const message = err?.message || 'Gagal memproses data statistik di Vercel Blob.';
    console.error('[API STATS ERROR]', err);
    sendJson(res, status, { error: message, code });
  }
}
