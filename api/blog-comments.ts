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
  logSafeApiError,
  readJsonBody,
  sendJson,
} from './_lib/httpHelpers.js';
import {
  type BlogCommentsJsonData,
  createInitialBlogCommentsSeed,
} from './_lib/seedDefaults.js';

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const urlPath = (req.url || '').split('?')[0];
  const pathMatch = urlPath.match(/\/api\/blog-comments\/([^/?]+)/);
  const blogId = getQueryParam(req, 'blogId') || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');

  if (!blogId) {
    sendJson(res, 400, { error: 'Parameter blogId wajib disertakan.' });
    return;
  }

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<BlogCommentsJsonData>(
        BLOB_PATHS.BLOG_COMMENTS,
        createInitialBlogCommentsSeed
      );
      const list = Array.isArray(data?.commentsByBlogId?.[blogId])
        ? data.commentsByBlogId[blogId]
        : [];
      sendJson(res, 200, { items: list, blogId });
      return;
    }

    if (method === 'POST') {
      const body = await readJsonBody(req);
      const message = String(body?.message || '').trim();
      if (!message) {
        sendJson(res, 400, { error: 'Isi komentar wajib diisi.' });
        return;
      }

      const newComment = {
        id: String(body?.id || `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
        blogId: String(blogId),
        name: String(body?.name || 'Pengunjung').trim() || 'Pengunjung',
        message,
        createdAt: String(body?.createdAt || new Date().toISOString()),
      };

      const { data } = await mutateJsonInBlob<BlogCommentsJsonData>(
        BLOB_PATHS.BLOG_COMMENTS,
        (current) => {
          const map = { ...(current.commentsByBlogId || {}) };
          const existing = Array.isArray(map[blogId]) ? map[blogId] : [];
          map[blogId] = [newComment, ...existing.filter((c: any) => String(c?.id) !== newComment.id)];
          return {
            commentsByBlogId: map,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialBlogCommentsSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        comment: newComment,
        items: data.commentsByBlogId[blogId] || [],
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'BLOG_COMMENTS_ERROR';
    logSafeApiError('API BLOG COMMENTS ERROR', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses komentar blog.',
      code,
    });
  }
}
