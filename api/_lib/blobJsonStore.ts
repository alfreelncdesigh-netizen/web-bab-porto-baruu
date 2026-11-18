import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  get,
  head,
  put,
  BlobNotFoundError,
  BlobPreconditionFailedError,
  BlobAccessError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
} from '@vercel/blob';
import {
  createInitialStatsSeed,
  type StatsData,
} from './seedDefaults.js';
import {
  isQuotaOrOriginFailure,
  readJsonFromServerCache,
  syncJsonToServerCache,
} from './serverCache.js';

export const BLOB_PATHS = {
  STATS: 'data/stats.json',
  PORTFOLIO: 'data/portfolio.json',
  EXPERIENCE: 'data/experience.json',
  SITE_SETTINGS: 'data/site-settings.json',
  CV: 'data/cv.json',
  BLOGS: 'data/blogs.json',
  MESSAGES: 'data/messages.json',
  QUICK_FILTER: 'data/quick-filter.json',
  BLOG_COMMENTS: 'data/blog-comments.json',
  ORDERS: 'data/orders.json',
} as const;

export const STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

export class BlobStoreError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'BLOB_ERROR') {
    super(message);
    this.name = 'BlobStoreError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isVercelProduction(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV === 'production' ||
      process.env.VERCEL_ENV === 'preview'
  );
}

export const DEFAULT_BLOB_STORE_ID = 'store_seRRfYn4tAact1K9';

function stripSurroundingQuotes(val?: string | null): string {
  const trimmed = (val || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getBlobStoreId(): string {
  const raw = stripSurroundingQuotes(process.env.BLOB_STORE_ID);
  return raw || DEFAULT_BLOB_STORE_ID;
}

export function isValidVercelBlobToken(raw?: string | null): boolean {
  const token = stripSurroundingQuotes(raw);
  if (!token || /^[*•]+$/.test(token)) return false;
  // Format token Vercel Blob resmi: vercel_blob_rw_<storeId>_<secret>
  const parts = token.split('_');
  return (
    parts.length >= 4 &&
    parts[0] === 'vercel' &&
    parts[1] === 'blob' &&
    parts[2] === 'rw' &&
    Boolean(parts[3]) &&
    Boolean(parts.slice(3).join('_'))
  );
}

export function getOptionalBlobToken(): string | null {
  const token = stripSurroundingQuotes(process.env.BLOB_READ_WRITE_TOKEN);
  if (!token) return null;
  if (/^[*•]+$/.test(token)) {
    if (!loggedInvalidTokenNotice) {
      loggedInvalidTokenNotice = true;
      console.warn(
        `[BlobJsonStore] BLOB_READ_WRITE_TOKEN untuk store "${getBlobStoreId()}" masih tersensor (****). Masukkan token asli (vercel_blob_rw_...) untuk mengaktifkan koneksi Vercel Blob.`
      );
    }
    return null;
  }
  if (!isValidVercelBlobToken(token)) {
    if (!loggedInvalidTokenNotice) {
      loggedInvalidTokenNotice = true;
      console.warn(
        `[BlobJsonStore] BLOB_READ_WRITE_TOKEN untuk store "${getBlobStoreId()}" ditemukan tetapi formatnya tidak valid (harus diawali vercel_blob_rw_).`
      );
    }
    return null;
  }
  return token;
}

let loggedInvalidTokenNotice = false;

export function getBlobToken(): string {
  const token = getOptionalBlobToken();
  if (!token) {
    throw new BlobStoreError(
      `Konfigurasi Vercel Blob belum aktif untuk store ${getBlobStoreId()}: environment variable BLOB_READ_WRITE_TOKEN belum diisi token asli (vercel_blob_rw_...) di server.`,
      503,
      'BLOB_TOKEN_MISSING'
    );
  }
  return token;
}

const AI_STUDIO_PREVIEW_HOST_REGEX = /^ais-(dev|pre)-[^.]+\.[^/]*run\.app$/i;
const BLOB_LOCAL_FOLDER_PREFIX_REGEX =
  /^\/?(portfolio|portofolio|works|work|karya|posters|poster|promos|promo|banners|banner|experiences|experience|pengalaman|blogs|blog|cv|resume|about|profile|hero|collaboration|orders|insight|insights|settings)\//i;

export function stripDownloadQueryParam(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.endsWith('.vercel-storage.com') && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    parsed.searchParams.delete('download');
    return parsed.toString();
  } catch {
    return trimmed
      .replace(/([?&])download=1(&|$)/i, (_m, sep, trailing) => (trailing === '&' ? sep : ''))
      .replace(/[?&]$/, '');
  }
}

export function sanitizeStoredMediaUrl(rawUrl: unknown, allowRelativeStatic = true): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim().replace(/&amp;/g, '&');
  if (!trimmed) return '';
  if (trimmed.startsWith('blob:') || DATA_URI_BASE64_REGEX.test(trimmed) || trimmed.startsWith('data:')) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (AI_STUDIO_PREVIEW_HOST_REGEX.test(parsed.hostname)) {
        // Jika URL berasal dari preview AI Studio menuju /uploads/, konversi ke path statis /uploads/ jika ada, selain itu kosongkan
        if (parsed.pathname.startsWith('/uploads/')) {
          return parsed.pathname;
        }
        return '';
      }
      if (parsed.hostname.endsWith('.vercel-storage.com') && parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      }
      parsed.searchParams.delete('download');
      return parsed.toString();
    } catch {
      return '';
    }
  }

  if (!allowRelativeStatic) {
    return '';
  }

  if (BLOB_LOCAL_FOLDER_PREFIX_REGEX.test(trimmed)) {
    // Path relatif seperti /portfolio/nama-file.webp tidak valid untuk aset Vercel Blob
    return '';
  }

  if (trimmed.includes('/src/assets/images/')) {
    return `/images/${trimmed.split('/src/assets/images/')[1]}`;
  }
  if (trimmed.startsWith('src/assets/images/')) {
    return `/images/${trimmed.replace('src/assets/images/', '')}`;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

const DATA_URI_BASE64_REGEX = /^data:(image|application\/pdf|video|audio)\/[a-zA-Z0-9.+_-]+;base64,/i;

/**
 * Validasi ketat: larang menyimpan file gambar/PDF base64 ke file JSON Vercel Blob.
 */
export function assertNoBase64InJson(value: unknown, fieldPath = 'root'): void {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATA_URI_BASE64_REGEX.test(trimmed)) {
      throw new BlobStoreError(
        `Penyimpanan base64 ke JSON tidak diizinkan pada field "${fieldPath}". Unggah file ke Vercel Blob terlebih dahulu dan simpan URL publiknya.`,
        400,
        'BASE64_NOT_ALLOWED'
      );
    }
    if (trimmed.startsWith('blob:')) {
      throw new BlobStoreError(
        `URL sementara "blob:" tidak dapat disimpan pada field "${fieldPath}".`,
        400,
        'TEMP_BLOB_URL_NOT_ALLOWED'
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertNoBase64InJson(value[i], `${fieldPath}[${i}]`);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      assertNoBase64InJson(v, `${fieldPath}.${k}`);
    }
  }
}

/**
 * Hapus properti sementara/legacy yang tidak boleh masuk ke JSON Vercel Blob.
 */
export function stripTransientFields<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripTransientFields(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const next: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (
        k === 'dataUrl' ||
        k === 'heroImageDataUrl' ||
        k === '_adminAuth' ||
        k === 'updatedByAdmin' ||
        v === undefined
      ) {
        continue;
      }
      next[k] = stripTransientFields(v);
    }
    return next as T;
  }
  return value;
}

// Mutex in-process per pathname untuk mencegah race condition antar request bersamaan dalam instance yang sama
const inProcessLocks = new Map<string, Promise<void>>();

async function withPathLock<T>(pathname: string, fn: () => Promise<T>): Promise<T> {
  const prev = inProcessLocks.get(pathname) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => current);
  inProcessLocks.set(pathname, chained);

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (inProcessLocks.get(pathname) === chained) {
      inProcessLocks.delete(pathname);
    }
  }
}

function normalizeStrongEtag(etag?: string | null): string {
  const trimmed = String(etag || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('W/') ? trimmed.slice(2).trim() : trimmed;
}

function safeEtagSummary(etag?: string | null): string {
  const trimmed = String(etag || '').trim();
  if (!trimmed) return 'none';
  return trimmed.length > 18 ? `${trimmed.slice(0, 6)}...${trimmed.slice(-8)}` : trimmed;
}

function isConflictBlobError(err: unknown): boolean {
  if (err instanceof BlobPreconditionFailedError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
  const status = (err as any)?.status || (err as any)?.statusCode;
  return (
    status === 409 ||
    status === 412 ||
    msg.includes('precondition') ||
    msg.includes('etag mismatch') ||
    msg.includes('ifmatch') ||
    msg.includes('already exists') ||
    msg.includes('conflict')
  );
}

function isRetryableBlobError(err: unknown): boolean {
  if (isConflictBlobError(err)) return true;
  if (err instanceof BlobStoreError && err.code === 'BLOB_STALE_READ') return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
  const status = (err as any)?.status || (err as any)?.statusCode;
  return (
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes('rate limit') ||
    msg.includes('timed out') ||
    msg.includes('econnreset')
  );
}

function normalizeBlobFailure(err: unknown, context: string): BlobStoreError {
  if (err instanceof BlobStoreError) return err;
  if (isConflictBlobError(err)) {
    const msg = err instanceof Error ? err.message : String(err || 'ETag conflict');
    return new BlobStoreError(`${context}: ${msg}`, 409, 'BLOB_ETAG_CONFLICT');
  }
  if (err instanceof BlobAccessError || err instanceof BlobStoreNotFoundError || err instanceof BlobStoreSuspendedError) {
    return new BlobStoreError(`${context}: ${err.message}`, 503, 'BLOB_ACCESS_ERROR');
  }
  const msg = err instanceof Error ? err.message : String(err || 'Kesalahan Vercel Blob tidak diketahui');
  return new BlobStoreError(`${context}: ${msg}`, 500, 'BLOB_IO_ERROR');
}

// ============================================================================
// LOCAL JSON FALLBACK (Saat BLOB_READ_WRITE_TOKEN tidak diatur di preview/dev)
// ============================================================================
let loggedLocalFallbackNotice = false;

function logLocalFallbackOnce(): void {
  if (!loggedLocalFallbackNotice) {
    loggedLocalFallbackNotice = true;
    console.info(
      '[BlobJsonStore] BLOB_READ_WRITE_TOKEN tidak ditemukan di environment. Menggunakan penyimpanan JSON lokal (data/*.json) untuk mode preview/lokal.'
    );
  }
}

function computeLocalEtag(rawText: string): string {
  return `"local-${crypto.createHash('sha1').update(rawText).digest('hex').slice(0, 16)}"`;
}

function getLocalCandidatePaths(pathname: string): string[] {
  const safeRelative = pathname.replace(/^\/+/, '');
  return [
    path.join(os.tmpdir(), 'alfreelnc-blob-data', safeRelative),
    path.join('/tmp/alfreelnc-blob-data', safeRelative),
  ];
}

function resolveWritableLocalPath(pathname: string): string {
  const candidates = getLocalCandidatePaths(pathname);
  for (const candidate of candidates) {
    try {
      const dir = path.dirname(candidate);
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return candidate;
    } catch {
      // Coba kandidat berikutnya
    }
  }
  throw new BlobStoreError(
    `Tidak ada direktori lokal yang dapat ditulis untuk menyimpan ${pathname}.`,
    500,
    'LOCAL_STORE_UNWRITABLE'
  );
}

function readLocalJsonDirect<T>(pathname: string): { data: T; etag: string } | null {
  for (const candidate of getLocalCandidatePaths(pathname)) {
    if (!fs.existsSync(candidate)) continue;
    const rawText = fs.readFileSync(candidate, 'utf-8');
    if (!rawText || !rawText.trim()) {
      continue;
    }
    try {
      const parsed = JSON.parse(rawText) as T;
      return { data: parsed, etag: computeLocalEtag(rawText) };
    } catch (parseErr: any) {
      throw new BlobStoreError(
        `Gagal mengurai file JSON lokal (${pathname}): ${parseErr?.message || 'Format JSON rusak'}`,
        500,
        'INVALID_LOCAL_JSON'
      );
    }
  }
  return null;
}

function writeLocalJsonAtomic(targetPath: string, data: unknown): { etag: string } {
  const serialized = JSON.stringify(data, null, 2);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, serialized, 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  } catch {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    fs.writeFileSync(targetPath, serialized, 'utf-8');
  }
  return { etag: computeLocalEtag(serialized) };
}

async function readJsonFromLocal<T>(
  pathname: string,
  seedFactory: () => T
): Promise<{ data: T; etag: string }> {
  logLocalFallbackOnce();
  return await withPathLock(pathname, async () => {
    const existing = readLocalJsonDirect<T>(pathname);
    if (existing) {
      return existing;
    }

    const initialData = stripTransientFields(seedFactory());
    assertNoBase64InJson(initialData, pathname);
    const targetPath = resolveWritableLocalPath(pathname);
    const { etag } = writeLocalJsonAtomic(targetPath, initialData);
    return { data: initialData, etag };
  });
}

async function mutateJsonInLocal<T>(
  pathname: string,
  mutator: (current: T) => T | Promise<T>,
  seedFactory: () => T
): Promise<{ data: T; etag: string }> {
  logLocalFallbackOnce();
  return await withPathLock(pathname, async () => {
    const latest = readLocalJsonDirect<T>(pathname);
    const currentData: T = latest ? latest.data : stripTransientFields(seedFactory());

    const mutatedRaw = await mutator(structuredClone(currentData));
    const nextData = stripTransientFields(mutatedRaw);
    assertNoBase64InJson(nextData, pathname);

    const targetPath = resolveWritableLocalPath(pathname);
    const { etag } = writeLocalJsonAtomic(targetPath, nextData);
    return { data: nextData, etag };
  });
}

async function fetchBlobJsonDirect<T>(
  pathname: string,
  token: string
): Promise<{ data: T; etag: string } | null> {
  const maxReadSyncAttempts = 3;
  let lastStaleInfo: Record<string, any> | null = null;

  for (let readAttempt = 0; readAttempt < maxReadSyncAttempts; readAttempt++) {
    let headMeta: Awaited<ReturnType<typeof head>>;
    try {
      headMeta = await head(pathname, { token });
    } catch (headErr: any) {
      if (
        headErr instanceof BlobNotFoundError ||
        headErr?.status === 404 ||
        headErr?.statusCode === 404
      ) {
        return null;
      }
      throw headErr;
    }

    const expectedStrongEtag = normalizeStrongEtag(headMeta.etag);
    const targetUrl =
      readAttempt % 2 === 0
        ? headMeta.downloadUrl || headMeta.url || pathname
        : headMeta.url || headMeta.downloadUrl || pathname;

    const result = await get(targetUrl, {
      access: 'public',
      useCache: false,
      headers: {
        'accept-encoding': 'identity',
        'cache-control': 'no-cache, no-store, max-age=0',
        pragma: 'no-cache',
      },
      token,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      if (readAttempt < maxReadSyncAttempts - 1) {
        await new Promise((r) => setTimeout(r, 80 * (readAttempt + 1)));
        continue;
      }
      return null;
    }

    const fetchedEtag = normalizeStrongEtag(result.blob?.etag);
    const rawText = await new Response(result.stream).text();
    const byteLen = Buffer.byteLength(rawText, 'utf-8');

    const etagMismatch =
      Boolean(expectedStrongEtag) &&
      Boolean(fetchedEtag) &&
      fetchedEtag !== expectedStrongEtag;
    const sizeMismatchWithoutEtag =
      !fetchedEtag && typeof headMeta.size === 'number' && headMeta.size > 0 && byteLen !== headMeta.size;

    if (etagMismatch || sizeMismatchWithoutEtag) {
      lastStaleInfo = {
        pathname,
        readAttempt,
        headEtag: safeEtagSummary(expectedStrongEtag),
        bodyEtag: safeEtagSummary(fetchedEtag),
        xVercelCache: result.headers?.get?.('x-vercel-cache') || 'unknown',
        age: result.headers?.get?.('age') || 'none',
      };
      if (readAttempt < maxReadSyncAttempts - 1) {
        await new Promise((r) => setTimeout(r, 100 * (readAttempt + 1)));
        continue;
      }
      console.warn('[BlobJsonStore:STALE_READ]', lastStaleInfo);
      throw new BlobStoreError(
        `Data "${pathname}" yang diterima dari CDN belum sinkron dengan versi terbaru di Vercel Blob. Silakan coba lagi.`,
        503,
        'BLOB_STALE_READ'
      );
    }

    if (!rawText || !rawText.trim()) {
      throw new BlobStoreError(`File JSON "${pathname}" di Vercel Blob kosong atau tidak valid.`, 500, 'INVALID_BLOB_JSON');
    }

    let parsed: T;
    try {
      parsed = JSON.parse(rawText) as T;
    } catch (parseErr: any) {
      throw new BlobStoreError(
        `Gagal mengurai JSON dari Vercel Blob (${pathname}): ${parseErr?.message || 'Format JSON rusak'}`,
        500,
        'INVALID_BLOB_JSON'
      );
    }

    return {
      data: parsed,
      etag: expectedStrongEtag || fetchedEtag,
    };
  }

  throw new BlobStoreError(
    `Gagal menyinkronkan pembacaan terbaru "${pathname}" dari Vercel Blob.`,
    503,
    'BLOB_STALE_READ'
  );
}

/**
 * Membaca file JSON terbaru dari Vercel Blob (atau JSON lokal jika BLOB_READ_WRITE_TOKEN belum diset).
 * Jika file belum pernah dibuat, inisialisasi satu kali dengan seed yang bersih.
 */
export async function readJsonFromBlob<T>(
  pathname: string,
  seedFactory: () => T
): Promise<{ data: T; etag: string }> {
  const token = getOptionalBlobToken();
  if (!token) {
    if (!isVercelProduction()) {
      try {
        const localRes = await readJsonFromLocal<T>(pathname, seedFactory);
        void syncJsonToServerCache(pathname, localRes.data, localRes.etag);
        return localRes;
      } catch {
        // Continue to server cache fallback
      }
    }

    const serverCached = await readJsonFromServerCache<T>(pathname);
    if (serverCached) {
      console.warn(`[BlobJsonStore:SERVER_CACHE_FALLBACK] Token Blob tidak aktif, menyajikan ${pathname} dari ${serverCached.source}.`);
      return { data: serverCached.data, etag: serverCached.etag };
    }

    const seedData = stripTransientFields(seedFactory());
    const seedEtag = computeLocalEtag(JSON.stringify(seedData));
    console.warn(`[BlobJsonStore:SEED_FALLBACK] Menyajikan fallback awal untuk ${pathname}.`);
    return { data: seedData, etag: seedEtag };
  }

  try {
    const existing = await fetchBlobJsonDirect<T>(pathname, token);
    if (existing) {
      void syncJsonToServerCache(pathname, existing.data, existing.etag);
      return existing;
    }

    // Inisialisasi file JSON pertama kali jika belum ada di Vercel Blob
    return await withPathLock(pathname, async () => {
      const doubleCheck = await fetchBlobJsonDirect<T>(pathname, token);
      if (doubleCheck) {
        void syncJsonToServerCache(pathname, doubleCheck.data, doubleCheck.etag);
        return doubleCheck;
      }

      const initialData = stripTransientFields(seedFactory());
      assertNoBase64InJson(initialData, pathname);

      try {
        const created = await put(pathname, JSON.stringify(initialData, null, 2), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60,
          token,
        });
        await syncJsonToServerCache(pathname, initialData, created.etag, { awaitFirestore: true });
        return { data: initialData, etag: created.etag };
      } catch (putErr) {
        // Jika request paralel lain lebih dulu membuat blob ini, baca hasilnya
        if (isRetryableBlobError(putErr)) {
          const raceRead = await fetchBlobJsonDirect<T>(pathname, token);
          if (raceRead) {
            void syncJsonToServerCache(pathname, raceRead.data, raceRead.etag);
            return raceRead;
          }
        }
        throw putErr;
      }
    });
  } catch (err) {
    if (isQuotaOrOriginFailure(err) || (err instanceof BlobStoreError && err.statusCode >= 500)) {
      const serverCached = await readJsonFromServerCache<T>(pathname);
      if (serverCached) {
        console.warn(`[BlobJsonStore:SERVER_CACHE_FALLBACK] Vercel Blob gagal/limit habis untuk ${pathname}, menyajikan dari ${serverCached.source}.`);
        return { data: serverCached.data, etag: serverCached.etag };
      }
      if (!isVercelProduction()) {
        try {
          const localRes = readLocalJsonDirect<T>(pathname);
          if (localRes) return localRes;
        } catch {}
      }
      const fallbackData = stripTransientFields(seedFactory());
      const fallbackEtag = computeLocalEtag(JSON.stringify(fallbackData));
      console.warn(`[BlobJsonStore:SEED_FALLBACK] Menyajikan seed fallback untuk ${pathname} setelah error Blob.`);
      return { data: fallbackData, etag: fallbackEtag };
    }
    throw normalizeBlobFailure(err, `Gagal membaca ${pathname} dari Vercel Blob`);
  }
}

export interface MutateContext {
  attempt: number;
  conflictRetry: boolean;
  etag?: string;
}

/**
 * Mekanisme anti-race-condition:
 * Mutex lokal + Baca JSON & strong ETag terbaru -> Terapkan mutator pada data terbaru ->
 * Validasi bebas base64 -> Tulis dengan ifMatch strong ETag.
 * Jika terjadi BlobPreconditionFailedError, baca ulang data & ETag terbaru lalu terapkan ulang mutator.
 * Jika BLOB_READ_WRITE_TOKEN tidak diset, gunakan file JSON lokal terproteksi mutex.
 */
export async function mutateJsonInBlob<T>(
  pathname: string,
  mutator: (current: T, ctx: MutateContext) => T | Promise<T>,
  seedFactory: () => T,
  maxRetries = 3
): Promise<{ data: T; etag: string }> {
  const token = isVercelProduction() ? getBlobToken() : getOptionalBlobToken();
  if (!token) {
    try {
      return await mutateJsonInLocal<T>(pathname, (curr) => mutator(curr, { attempt: 0, conflictRetry: false }), seedFactory);
    } catch (err) {
      throw normalizeBlobFailure(err, `Gagal menyimpan ${pathname} ke penyimpanan JSON lokal`);
    }
  }

  return await withPathLock(pathname, async () => {
    let lastError: unknown = null;
    let lastAttemptedEtag: string | undefined;
    let hadConflict = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let currentEtag: string | undefined;
      try {
        const latest = await fetchBlobJsonDirect<T>(pathname, token);
        const currentData: T = latest ? latest.data : stripTransientFields(seedFactory());
        currentEtag = latest?.etag ? normalizeStrongEtag(latest.etag) : undefined;
        lastAttemptedEtag = currentEtag;

        const mutatedRaw = await mutator(structuredClone(currentData), {
          attempt,
          conflictRetry: attempt > 0 && hadConflict,
          etag: currentEtag,
        });
        const nextData = stripTransientFields(mutatedRaw);
        assertNoBase64InJson(nextData, pathname);

        const putRes = await put(pathname, JSON.stringify(nextData, null, 2), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: Boolean(currentEtag),
          ...(currentEtag ? { ifMatch: currentEtag } : {}),
          cacheControlMaxAge: 60,
          token,
        });

        if (attempt > 0) {
          console.info('[BlobJsonStore:RETRY_RESOLVED]', {
            pathname,
            attempt,
            hadConflict,
            newEtag: safeEtagSummary(putRes.etag),
          });
        }

        const finalEtag = normalizeStrongEtag(putRes.etag) || putRes.etag;
        await syncJsonToServerCache(pathname, nextData, finalEtag, { awaitFirestore: true });

        return { data: nextData, etag: finalEtag };
      } catch (err) {
        lastError = err;
        if (err instanceof BlobStoreError && (err.statusCode === 400 || err.statusCode === 404 || err.statusCode === 409)) {
          throw err;
        }
        const conflict = isConflictBlobError(err);
        if (conflict) {
          hadConflict = true;
          console.warn('[BlobJsonStore:ETAG_CONFLICT]', {
            pathname,
            attempt,
            maxRetries,
            attemptedEtag: safeEtagSummary(currentEtag),
            errorName: err instanceof Error ? err.name : typeof err,
            message: err instanceof Error ? err.message : String(err),
          });
        }
        if (attempt < maxRetries && isRetryableBlobError(err)) {
          const delayMs = 80 * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        break;
      }
    }

    if (isConflictBlobError(lastError)) {
      console.error('[BlobJsonStore:CONFLICT_EXHAUSTED]', {
        pathname,
        attempts: maxRetries + 1,
        lastAttemptedEtag: safeEtagSummary(lastAttemptedEtag),
      });
      throw new BlobStoreError(
        `Konflik penyimpanan pada ${pathname} setelah ${maxRetries}x percobaan ulang karena data berubah bersamaan di server. Silakan coba simpan lagi.`,
        409,
        'BLOB_ETAG_CONFLICT'
      );
    }

    throw normalizeBlobFailure(
      lastError,
      `Gagal menyimpan ${pathname} ke Vercel Blob setelah ${maxRetries}x percobaan ulang`
    );
  });
}

// ============================================================================
// SERVER-SIDE CACHE 5 MENIT UNTUK data/stats.json
// ============================================================================
let statsMemoryCache: {
  data: StatsData;
  expiresAt: number;
} | null = null;

let statsReadInFlight: Promise<{ data: StatsData; cached: boolean; cachedUntil: number }> | null = null;

function normalizeStatsPayload(raw: any): StatsData {
  const totalViews =
    typeof raw?.totalViews === 'number' && Number.isFinite(raw.totalViews) && raw.totalViews >= 0
      ? raw.totalViews
      : 0;
  const dailyViews: Record<string, number> = {};
  if (raw?.dailyViews && typeof raw.dailyViews === 'object' && !Array.isArray(raw.dailyViews)) {
    for (const [dateKey, count] of Object.entries(raw.dailyViews)) {
      if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        dailyViews[dateKey] = count;
      }
    }
  }
  return {
    totalViews,
    dailyViews,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function getTodayDateKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function readStatsWithCache(): Promise<{
  data: StatsData;
  cached: boolean;
  cachedUntil: number;
}> {
  const now = Date.now();
  if (statsMemoryCache && now < statsMemoryCache.expiresAt) {
    return {
      data: statsMemoryCache.data,
      cached: true,
      cachedUntil: statsMemoryCache.expiresAt,
    };
  }

  if (statsReadInFlight) {
    return statsReadInFlight;
  }

  statsReadInFlight = (async () => {
    try {
      const { data } = await readJsonFromBlob<StatsData>(BLOB_PATHS.STATS, createInitialStatsSeed);
      const normalized = normalizeStatsPayload(data);
      const expiresAt = Date.now() + STATS_CACHE_TTL_MS;
      statsMemoryCache = { data: normalized, expiresAt };
      return { data: normalized, cached: false, cachedUntil: expiresAt };
    } catch (err) {
      if (statsMemoryCache) {
        return {
          data: statsMemoryCache.data,
          cached: true,
          cachedUntil: Date.now() + 60_000,
        };
      }
      const cached = await readJsonFromServerCache<StatsData>(BLOB_PATHS.STATS);
      const normalized = normalizeStatsPayload(cached?.data || createInitialStatsSeed());
      const expiresAt = Date.now() + 60_000;
      statsMemoryCache = { data: normalized, expiresAt };
      if (cached) {
        return { data: normalized, cached: true, cachedUntil: expiresAt };
      }
      if (isQuotaOrOriginFailure(err)) {
        return { data: normalized, cached: true, cachedUntil: expiresAt };
      }
      throw err;
    } finally {
      statsReadInFlight = null;
    }
  })();

  return statsReadInFlight;
}

export async function incrementStatsView(): Promise<{
  data: StatsData;
  cachedUntil: number;
}> {
  const todayKey = getTodayDateKey();
  try {
    const { data } = await mutateJsonInBlob<StatsData>(
      BLOB_PATHS.STATS,
      (current) => {
        const norm = normalizeStatsPayload(current);
        const nextDaily = { ...norm.dailyViews };
        nextDaily[todayKey] = (nextDaily[todayKey] || 0) + 1;
        return {
          totalViews: norm.totalViews + 1,
          dailyViews: nextDaily,
          updatedAt: new Date().toISOString(),
        };
      },
      createInitialStatsSeed,
      3
    );

    const normalized = normalizeStatsPayload(data);
    const expiresAt = Date.now() + STATS_CACHE_TTL_MS;
    statsMemoryCache = { data: normalized, expiresAt };
    return { data: normalized, cachedUntil: expiresAt };
  } catch (err) {
    if (isQuotaOrOriginFailure(err)) {
      const base = statsMemoryCache?.data || (await readJsonFromServerCache<StatsData>(BLOB_PATHS.STATS))?.data || createInitialStatsSeed();
      const norm = normalizeStatsPayload(base);
      const nextDaily = { ...norm.dailyViews };
      nextDaily[todayKey] = (nextDaily[todayKey] || 0) + 1;
      const nextStats: StatsData = {
        totalViews: norm.totalViews + 1,
        dailyViews: nextDaily,
        updatedAt: new Date().toISOString(),
      };
      const expiresAt = Date.now() + STATS_CACHE_TTL_MS;
      statsMemoryCache = { data: nextStats, expiresAt };
      void syncJsonToServerCache(BLOB_PATHS.STATS, nextStats, computeLocalEtag(JSON.stringify(nextStats)));
      return { data: nextStats, cachedUntil: expiresAt };
    }
    throw err;
  }
}
