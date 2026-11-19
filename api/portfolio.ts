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
  createInitialPortfolioSeed,
  type PortfolioJsonData,
} from './_lib/seedDefaults.js';

function parsePortfolioTimestampMs(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d{10,15}$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) ? (trimmed.length === 10 ? n * 1000 : n) : 0;
    }
    if (/^\d{4}$/.test(trimmed)) {
      return new Date(Number(trimmed), 0, 1).getTime();
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function getPortfolioCreationRecency(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const idStr = String(item.id || '').trim();
  const epochMatch = idStr.match(/(?:^|[^0-9])(\d{12,15})(?:$|[^0-9])/);
  const idNum = epochMatch ? Number(epochMatch[1]) : 0;
  const created = parsePortfolioTimestampMs(item.createdAt);
  const added = parsePortfolioTimestampMs(item.dateAdded);
  const dateMs = parsePortfolioTimestampMs(item.date);

  if (idNum > 0) {
    return created || added || idNum;
  }
  return added || dateMs || created || 0;
}

function sortPortfolioNewestFirst(items: any[]): any[] {
  return [...(items || [])].sort((a, b) => {
    const recencyDiff = getPortfolioCreationRecency(b) - getPortfolioCreationRecency(a);
    if (recencyDiff !== 0) return recencyDiff;
    const dateDiff = String(b?.date || '').localeCompare(String(a?.date || ''));
    if (dateDiff !== 0) return dateDiff;
    return parsePortfolioTimestampMs(b?.updatedAt) - parsePortfolioTimestampMs(a?.updatedAt);
  });
}

function normalizeProjectRecord(raw: any, existing?: any, isWrite = true): any {
  const id = String(raw?.id ?? existing?.id ?? (isWrite ? Date.now() : '')).trim();
  const imagesRaw = Array.isArray(raw?.images)
    ? raw.images
    : Array.isArray(existing?.images)
    ? existing.images
    : [];
  const images = imagesRaw
    .map((u: any) => sanitizeStoredMediaUrl(u))
    .filter((u: string) => u.length > 0);

  const rawMain =
    typeof raw?.image === 'string' && raw.image.trim()
      ? sanitizeStoredMediaUrl(raw.image)
      : sanitizeStoredMediaUrl(existing?.image);
  const mainImg = rawMain || images[0] || '';

  const finalImages =
    images.length > 0
      ? mainImg && !images.includes(mainImg)
        ? [mainImg, ...images]
        : images
      : mainImg
      ? [mainImg]
      : [];

  const existingCreated = parsePortfolioTimestampMs(existing?.createdAt);
  const rawCreated = parsePortfolioTimestampMs(raw?.createdAt);
  const existingUpdated = parsePortfolioTimestampMs(existing?.updatedAt);
  const rawUpdated = parsePortfolioTimestampMs(raw?.updatedAt);

  const createdAt = isWrite
    ? existingCreated || rawCreated || Date.now()
    : existingCreated || rawCreated || undefined;
  const updatedAt = isWrite
    ? Date.now()
    : existingUpdated || rawUpdated || createdAt || undefined;

  return {
    ...(existing || {}),
    ...raw,
    id,
    title: String(raw?.title ?? existing?.title ?? 'Tanpa Judul').trim(),
    category: String(raw?.category ?? existing?.category ?? 'UI/UX').trim() || 'UI/UX',
    image: mainImg,
    images: finalImages,
    description: String(raw?.description ?? existing?.description ?? '').trim(),
    date:
      String(raw?.date ?? existing?.date ?? '').trim() ||
      (isWrite ? new Date().toISOString().split('T')[0] : ''),
    role: String(raw?.role ?? existing?.role ?? '').trim(),
    collaborationLogo: sanitizeStoredMediaUrl(
      raw?.collaborationLogo !== undefined ? raw.collaborationLogo : existing?.collaborationLogo
    ),
    aspectRatio: String(raw?.aspectRatio ?? existing?.aspectRatio ?? ''),
    draft: Boolean(raw?.draft ?? existing?.draft ?? false),
    isArchived: Boolean(raw?.isArchived ?? existing?.isArchived ?? false),
    archiveFolderId:
      raw?.archiveFolderId !== undefined ? raw.archiveFolderId : existing?.archiveFolderId ?? null,
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
  };
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { data } = await readJsonFromBlob<PortfolioJsonData>(
        BLOB_PATHS.PORTFOLIO,
        createInitialPortfolioSeed
      );
      const rawItems = sortPortfolioNewestFirst(
        (Array.isArray(data?.items) ? data.items : []).map((item: any) =>
          normalizeProjectRecord(item, item, false)
        )
      );
      const includeArchived = getQueryParam(req, 'includeArchived') === 'true';
      const targetId = getQueryParam(req, 'id');

      if (targetId) {
        const found = rawItems.find((p: any) => String(p?.id) === String(targetId));
        if (!found) {
          sendJson(res, 404, { error: `Karya dengan ID "${targetId}" tidak ditemukan.` });
          return;
        }
        sendJson(res, 200, { item: found, updatedAt: data.updatedAt, version: data.version || 1 });
        return;
      }

      const filtered = includeArchived
        ? rawItems
        : rawItems.filter((p: any) => p && p.isArchived !== true && p.isDeleted !== true);

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
        const expectedVersion =
          body?.expectedVersion !== undefined && Number.isFinite(Number(body.expectedVersion))
            ? Number(body.expectedVersion)
            : undefined;

        const { data, etag } = await mutateJsonInBlob<PortfolioJsonData>(
          BLOB_PATHS.PORTFOLIO,
          (current, ctx) => {
            const currentVersion = current.version || 1;
            if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
              console.warn('[API PORTFOLIO:VERSION_CONFLICT]', {
                expectedVersion,
                currentVersion,
                attempt: ctx.attempt,
              });
              throw new BlobStoreError(
                'Konflik versi: Daftar karya telah berubah di server sejak terakhir kali dimuat. Muat ulang daftar karya sebelum menyimpan ulang.',
                409,
                'PORTFOLIO_VERSION_CONFLICT'
              );
            }
            return {
              items: sortPortfolioNewestFirst(body.items.map((item: any) => normalizeProjectRecord(item))),
              updatedAt: new Date().toISOString(),
              version: currentVersion + 1,
            };
          },
          createInitialPortfolioSeed,
          3
        );
        sendJson(res, 200, {
          success: true,
          items: sortPortfolioNewestFirst(data.items.filter((p: any) => p.isArchived !== true)),
          updatedAt: data.updatedAt,
          version: data.version,
          etag,
        });
        return;
      }

      const rawIncoming = body?.project && typeof body.project === 'object' ? body.project : body;
      if (!rawIncoming || typeof rawIncoming !== 'object' || (!rawIncoming.title && !rawIncoming.id)) {
        sendJson(res, 400, { error: 'Data karya tidak valid.' });
        return;
      }

      const baseUpdatedAtRaw = body?.baseUpdatedAt ?? rawIncoming?.baseUpdatedAt;
      const baseUpdatedAt =
        typeof baseUpdatedAtRaw === 'number' && Number.isFinite(baseUpdatedAtRaw) && baseUpdatedAtRaw > 0
          ? baseUpdatedAtRaw
          : undefined;
      const { baseUpdatedAt: _dropBase, expectedVersion: _dropVer, ...incoming } = rawIncoming;

      let savedItem: any = null;
      const { data, etag } = await mutateJsonInBlob<PortfolioJsonData>(
        BLOB_PATHS.PORTFOLIO,
        (current, ctx) => {
          const items = Array.isArray(current.items) ? [...current.items] : [];
          const targetId = String(incoming.id ?? Date.now()).trim();
          const idx = items.findIndex((p: any) => String(p?.id) === targetId);

          if (idx >= 0 && baseUpdatedAt !== undefined) {
            const existingUpdatedAt = Number(items[idx]?.updatedAt || 0);
            if (existingUpdatedAt > baseUpdatedAt) {
              console.warn('[API PORTFOLIO:EDIT_CONFLICT]', {
                targetId,
                baseUpdatedAt,
                existingUpdatedAt,
                attempt: ctx.attempt,
              });
              throw new BlobStoreError(
                'Konflik penyimpanan: Karya ini baru saja diperbarui oleh sesi lain sejak terakhir Anda membukanya. Muat ulang data terbaru sebelum menyimpan ulang.',
                409,
                'PORTFOLIO_EDIT_CONFLICT'
              );
            }
          }

          savedItem = normalizeProjectRecord({ ...incoming, id: targetId }, idx >= 0 ? items[idx] : undefined);
          if (idx >= 0) {
            items[idx] = savedItem;
          } else {
            items.unshift(savedItem);
          }
          return {
            items: sortPortfolioNewestFirst(items),
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialPortfolioSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        item: savedItem,
        items: sortPortfolioNewestFirst(data.items.filter((p: any) => p.isArchived !== true)),
        updatedAt: data.updatedAt,
        version: data.version,
        etag,
      });
      return;
    }

    if (method === 'PATCH') {
      const bulkIds: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String) : null;
      const singleId = body?.id !== undefined ? String(body.id) : getQueryParam(req, 'id');
      const updates = body?.updates && typeof body.updates === 'object' ? body.updates : body;

      if (!bulkIds && !singleId) {
        sendJson(res, 400, { error: 'ID karya wajib disertakan untuk pembaruan.' });
        return;
      }

      const idSet = new Set(bulkIds || [String(singleId)]);
      let matched = 0;

      const { data } = await mutateJsonInBlob<PortfolioJsonData>(
        BLOB_PATHS.PORTFOLIO,
        (current) => {
          const items = (Array.isArray(current.items) ? current.items : []).map((item: any) => {
            if (!idSet.has(String(item?.id))) return item;
            matched++;
            return {
              ...item,
              ...(updates?.draft !== undefined ? { draft: Boolean(updates.draft) } : {}),
              ...(updates?.isArchived !== undefined ? { isArchived: Boolean(updates.isArchived) } : {}),
              ...(updates?.archiveFolderId !== undefined
                ? { archiveFolderId: updates.archiveFolderId }
                : {}),
              updatedAt: Date.now(),
            };
          });
          if (matched === 0) {
            throw new BlobStoreError('Karya tidak ditemukan di Vercel Blob.', 404, 'NOT_FOUND');
          }
          return {
            items,
            updatedAt: new Date().toISOString(),
            version: (current.version || 1) + 1,
          };
        },
        createInitialPortfolioSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: sortPortfolioNewestFirst(data.items.filter((p: any) => p.isArchived !== true)),
        allItems: sortPortfolioNewestFirst(data.items),
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    if (method === 'DELETE') {
      const bulkIds: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String) : null;
      const singleId = getQueryParam(req, 'id') || (body?.id !== undefined ? String(body.id) : undefined);

      if (!bulkIds && !singleId) {
        sendJson(res, 400, { error: 'ID karya yang akan dihapus wajib diisi.' });
        return;
      }

      const idSet = new Set(bulkIds || [String(singleId)]);

      const { data } = await mutateJsonInBlob<PortfolioJsonData>(
        BLOB_PATHS.PORTFOLIO,
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
        createInitialPortfolioSeed,
        3
      );

      sendJson(res, 200, {
        success: true,
        items: sortPortfolioNewestFirst(data.items.filter((p: any) => p.isArchived !== true)),
        updatedAt: data.updatedAt,
        version: data.version,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err: any) {
    const status = err instanceof BlobStoreError ? err.statusCode : 500;
    const code = err instanceof BlobStoreError ? err.code : 'PORTFOLIO_ERROR';
    logSafeApiError('API PORTFOLIO ERROR', err);
    sendJson(res, status, {
      error: err?.message || 'Gagal mengakses data portofolio di Vercel Blob.',
      code,
    });
  }
}
