import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type ServerCacheSource =
  | 'vercel-blob'
  | 'memory-cache'
  | 'tmp-cache'
  | 'firestore-cache'
  | 'bundled-fallback'
  | 'seed-fallback';

interface MemoryJsonEntry<T = any> {
  data: T;
  etag: string;
  cachedAt: number;
  sha1: string;
}

interface MemoryMediaEntry {
  buffer: Buffer;
  mimeType: string;
  cachedAt: number;
  size: number;
  url: string;
  filename?: string;
}

interface ServerCacheRuntimeState {
  jsonCache: Map<string, MemoryJsonEntry>;
  mediaCache: Map<string, MemoryMediaEntry>;
  mediaBytesTotal: number;
  lastFirestoreJsonSyncSha1: Map<string, string>;
  lastFirestoreMediaSyncKey: Set<string>;
}

const GLOBAL_CACHE_KEY = '__alfreelncServerCacheState_v1';
const MAX_MEMORY_MEDIA_BYTES = 40 * 1024 * 1024; // 40 MB bounded LRU in warm serverless instance
const MAX_MEDIA_BYTES_FOR_MEMORY_ENTRY = 5 * 1024 * 1024;
const MAX_FIRESTORE_BINARY_BYTES = 640 * 1024; // ~875 KB base64 + metadata stays safely under 1 MiB Firestore limit
const SERVER_CACHE_TMP_ROOT = path.join(os.tmpdir(), 'alfreelnc-server-cache');
const SERVER_CACHE_TMP_JSON_DIR = path.join(SERVER_CACHE_TMP_ROOT, 'json');
const SERVER_CACHE_TMP_MEDIA_DIR = path.join(SERVER_CACHE_TMP_ROOT, 'media');

function getRuntimeState(): ServerCacheRuntimeState {
  const g = globalThis as any;
  if (!g[GLOBAL_CACHE_KEY]) {
    g[GLOBAL_CACHE_KEY] = {
      jsonCache: new Map<string, MemoryJsonEntry>(),
      mediaCache: new Map<string, MemoryMediaEntry>(),
      mediaBytesTotal: 0,
      lastFirestoreJsonSyncSha1: new Map<string, string>(),
      lastFirestoreMediaSyncKey: new Set<string>(),
    } satisfies ServerCacheRuntimeState;
  }
  return g[GLOBAL_CACHE_KEY] as ServerCacheRuntimeState;
}

let cachedFirebaseCfg: { projectId: string; firestoreDatabaseId: string; apiKey: string } | null = null;

function getFirebaseRestConfig(): { projectId: string; firestoreDatabaseId: string; apiKey: string } {
  if (cachedFirebaseCfg) return cachedFirebaseCfg;

  const fallback = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'portofolio-c368b',
    firestoreDatabaseId:
      process.env.FIRESTORE_DATABASE_ID ||
      'ai-studio-portofoliodesain-16b96d08-efff-4e76-af75-1c33dc5adab7',
    apiKey: process.env.FIREBASE_API_KEY || '',
  };

  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      cachedFirebaseCfg = {
        projectId: String(parsed?.projectId || fallback.projectId),
        firestoreDatabaseId: String(parsed?.firestoreDatabaseId || fallback.firestoreDatabaseId),
        apiKey: String(parsed?.apiKey || fallback.apiKey),
      };
      return cachedFirebaseCfg;
    }
  } catch {
    // Use env/fallback config if file not readable
  }

  cachedFirebaseCfg = fallback;
  return cachedFirebaseCfg;
}

function getFirestoreDocUrl(collection: string, docId: string): string {
  const cfg = getFirebaseRestConfig();
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
  return cfg.apiKey ? `${base}?key=${encodeURIComponent(cfg.apiKey)}` : base;
}

export function normalizeCanonicalMediaUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim().replace(/&amp;/g, '&');
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
    return trimmed;
  }
}

export function computeUrlSha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function sanitizeDocKey(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function getJsonCacheSlug(pathname: string): string {
  return sanitizeDocKey(
    pathname
      .replace(/^\/+/, '')
      .replace(/\.json$/i, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
  );
}

function getFirestoreJsonDocId(pathname: string): string {
  return `server_cache_${getJsonCacheSlug(pathname)}`;
}

function getFirestoreMediaDocId(canonicalUrl: string): string {
  return `cache_url_${computeUrlSha1(canonicalUrl).slice(0, 28)}`;
}

export function isQuotaOrOriginFailure(err: unknown): boolean {
  if (!err) return false;
  const name = err instanceof Error ? err.name.toLowerCase() : '';
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const status = Number((err as any)?.status || (err as any)?.statusCode || 0);

  if (
    status === 402 ||
    status === 403 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }

  return (
    name.includes('blobsuspended') ||
    name.includes('blobaccess') ||
    name.includes('blobstorenotfound') ||
    msg.includes('suspended') ||
    msg.includes('quota') ||
    msg.includes('limit') ||
    msg.includes('bandwidth') ||
    msg.includes('transfer') ||
    msg.includes('exceeded') ||
    msg.includes('payment') ||
    msg.includes('blob_token_missing') ||
    msg.includes('blob_access_error') ||
    msg.includes('blob_stale_read') ||
    msg.includes('blob_io_error') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound')
  );
}

const TRUSTED_MEDIA_HOSTS_EXACT = new Set([
  'res.cloudinary.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

export function isAllowedMediaProxyUrl(rawUrl: string): boolean {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return false;

  // Reject local-only schemes or traversal
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('file:') ||
    trimmed.includes('..')
  ) {
    return false;
  }

  // Allow relative static paths within public/
  if (trimmed.startsWith('/')) {
    return (
      trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('/images/') ||
      trimmed.startsWith('/assets/')
    );
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();

    // Block loopback and private IP ranges strictly (SSRF protection)
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }

    if (
      host.endsWith('.vercel-storage.com') ||
      host.endsWith('.firebasestorage.app') ||
      TRUSTED_MEDIA_HOSTS_EXACT.has(host)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function stripSensitiveSettingsForPublicCache<T>(pathname: string, data: T): T {
  // Never store collaborator passwords inside public Firestore mirror doc if unnecessary;
  // keep structure identical for fallback while leaving collaboratorAccounts/settings intact in memory/tmp.
  // Actually site-settings expects normal fields — keep clean clone without internal admin flags.
  if (!data || typeof data !== 'object') return data;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

function writeTmpFileAtomic(filePath: string, content: string | Buffer): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(tmpFile, content);
    } else {
      fs.writeFileSync(tmpFile, content, 'utf-8');
    }
    try {
      fs.renameSync(tmpFile, filePath);
    } catch {
      if (Buffer.isBuffer(content)) {
        fs.writeFileSync(filePath, content);
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
    }
  } catch {
    // Ignore /tmp write issues cleanly
  }
}

// ============================================================================
// JSON SERVER CACHE (L1 Memory + L2 /tmp + L3 Cloud Firestore)
// ============================================================================
export async function syncJsonToServerCache<T>(
  pathname: string,
  data: T,
  etag: string,
  options?: { awaitFirestore?: boolean }
): Promise<void> {
  const state = getRuntimeState();
  const cleanClone = stripSensitiveSettingsForPublicCache(pathname, data);
  const serialized = JSON.stringify(cleanClone);
  const sha1 = computeUrlSha1(serialized);

  // L1 Memory
  state.jsonCache.set(pathname, {
    data: cleanClone,
    etag: etag || `"srv-${sha1.slice(0, 16)}"`,
    cachedAt: Date.now(),
    sha1,
  });

  // L2 /tmp disk container cache
  const tmpFile = path.join(SERVER_CACHE_TMP_JSON_DIR, `${getJsonCacheSlug(pathname)}.json`);
  writeTmpFileAtomic(
    tmpFile,
    JSON.stringify({
      pathname,
      etag: etag || `"srv-${sha1.slice(0, 16)}"`,
      sha1,
      cachedAt: Date.now(),
      data: cleanClone,
    })
  );

  // L3 Cloud Firestore persistent server cache (survives Vercel cold starts & deployments)
  const docId = getFirestoreJsonDocId(pathname);
  const prevSyncedSha1 = state.lastFirestoreJsonSyncSha1.get(pathname);
  if (prevSyncedSha1 === sha1 && !options?.awaitFirestore) {
    return;
  }

  // Respect Firestore 1 MiB document size cap
  if (Buffer.byteLength(serialized, 'utf-8') > 750 * 1024) {
    return;
  }

  const syncTask = (async () => {
    try {
      const firestoreUrl = getFirestoreDocUrl('settings', docId);
      const res = await fetch(firestoreUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            pathname: { stringValue: pathname },
            etag: { stringValue: etag || `"srv-${sha1.slice(0, 16)}"` },
            sha1: { stringValue: sha1 },
            payloadJson: { stringValue: serialized },
            cachedAt: { integerValue: String(Date.now()) },
            _adminAuth: { stringValue: 'alfreelnc_admin_auth_verified' },
            updatedByAdmin: { booleanValue: true },
          },
        }),
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        state.lastFirestoreJsonSyncSha1.set(pathname, sha1);
      }
    } catch {
      // Non-fatal server cache mirror error
    }
  })();

  if (options?.awaitFirestore) {
    await syncTask;
  } else {
    void syncTask;
  }
}

export async function readJsonFromServerCache<T>(
  pathname: string
): Promise<{ data: T; etag: string; source: ServerCacheSource } | null> {
  const state = getRuntimeState();

  // 1. L1 Memory Cache
  const mem = state.jsonCache.get(pathname);
  if (mem) {
    return {
      data: structuredClone(mem.data) as T,
      etag: mem.etag,
      source: 'memory-cache',
    };
  }

  // 2. L2 /tmp Cache
  try {
    const tmpFile = path.join(SERVER_CACHE_TMP_JSON_DIR, `${getJsonCacheSlug(pathname)}.json`);
    if (fs.existsSync(tmpFile)) {
      const parsed = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
      if (parsed && parsed.data !== undefined) {
        const entry: MemoryJsonEntry<T> = {
          data: parsed.data as T,
          etag: String(parsed.etag || `"tmp-${Date.now()}"`),
          cachedAt: Number(parsed.cachedAt || Date.now()),
          sha1: String(parsed.sha1 || ''),
        };
        state.jsonCache.set(pathname, entry);
        return {
          data: structuredClone(entry.data),
          etag: entry.etag,
          source: 'tmp-cache',
        };
      }
    }
  } catch {
    // Continue to Firestore L3
  }

  // 3. L3 Cloud Firestore Server Cache
  try {
    const docId = getFirestoreJsonDocId(pathname);
    const firestoreUrl = getFirestoreDocUrl('settings', docId);
    const res = await fetch(firestoreUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const json: any = await res.json();
      const rawPayload = json?.fields?.payloadJson?.stringValue;
      if (rawPayload) {
        const data = JSON.parse(rawPayload) as T;
        const etag = String(json?.fields?.etag?.stringValue || `"fs-${Date.now()}"`);
        const sha1 = String(json?.fields?.sha1?.stringValue || computeUrlSha1(rawPayload));
        state.jsonCache.set(pathname, {
          data,
          etag,
          cachedAt: Number(json?.fields?.cachedAt?.integerValue || Date.now()),
          sha1,
        });
        state.lastFirestoreJsonSyncSha1.set(pathname, sha1);
        writeTmpFileAtomic(
          path.join(SERVER_CACHE_TMP_JSON_DIR, `${getJsonCacheSlug(pathname)}.json`),
          JSON.stringify({ pathname, etag, sha1, cachedAt: Date.now(), data })
        );
        return { data: structuredClone(data), etag, source: 'firestore-cache' };
      }
    }
  } catch {
    // Continue to caller's seed fallback
  }

  return null;
}

// ============================================================================
// MEDIA BINARY SERVER CACHE (L1 Memory + L2 /tmp + L3 Firestore + L4 Bundle)
// ============================================================================
function storeMediaInMemory(canonicalUrl: string, buffer: Buffer, mimeType: string, filename?: string): void {
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES_FOR_MEMORY_ENTRY) return;
  const state = getRuntimeState();
  const shaKey = computeUrlSha1(canonicalUrl);

  const existing = state.mediaCache.get(shaKey);
  if (existing) {
    state.mediaBytesTotal = Math.max(0, state.mediaBytesTotal - existing.size);
    state.mediaCache.delete(shaKey);
  }

  // Evict oldest LRU entries until under budget
  while (
    state.mediaBytesTotal + buffer.length > MAX_MEMORY_MEDIA_BYTES &&
    state.mediaCache.size > 0
  ) {
    const oldestKey = state.mediaCache.keys().next().value;
    if (!oldestKey) break;
    const evicted = state.mediaCache.get(oldestKey);
    state.mediaCache.delete(oldestKey);
    if (evicted) {
      state.mediaBytesTotal = Math.max(0, state.mediaBytesTotal - evicted.size);
    }
  }

  state.mediaCache.set(shaKey, {
    buffer,
    mimeType,
    cachedAt: Date.now(),
    size: buffer.length,
    url: canonicalUrl,
    filename,
  });
  state.mediaBytesTotal += buffer.length;
}

async function prepareFirestoreSafeMediaBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; compressed: boolean } | null> {
  if (buffer.length <= MAX_FIRESTORE_BINARY_BYTES) {
    return { buffer, mimeType, compressed: false };
  }

  if (!mimeType.startsWith('image/') || mimeType.includes('svg')) {
    return null;
  }

  try {
    const sharpMod: any = await import('sharp');
    const sharpFn = sharpMod.default || sharpMod;

    let candidate = await sharpFn(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    if (candidate.length > MAX_FIRESTORE_BINARY_BYTES) {
      candidate = await sharpFn(buffer)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 64 })
        .toBuffer();
    }

    if (candidate.length > 0 && candidate.length <= MAX_FIRESTORE_BINARY_BYTES) {
      return { buffer: candidate, mimeType: 'image/webp', compressed: true };
    }
  } catch {
    // sharp unavailable or unsupported input
  }

  return null;
}

export async function saveMediaToServerCache(
  rawUrl: string,
  buffer: Buffer,
  mimeType: string,
  filename?: string,
  options?: { awaitFirestore?: boolean }
): Promise<boolean> {
  const canonicalUrl = normalizeCanonicalMediaUrl(rawUrl);
  if (!canonicalUrl || !buffer || buffer.length === 0) return false;

  const cleanMime = (mimeType || 'image/webp').split(';')[0].trim().toLowerCase();
  const shaKey = computeUrlSha1(canonicalUrl);
  const derivedName =
    filename ||
    (() => {
      try {
        return path.basename(new URL(canonicalUrl).pathname) || `asset_${shaKey.slice(0, 8)}`;
      } catch {
        return path.basename(canonicalUrl.split('?')[0]) || `asset_${shaKey.slice(0, 8)}`;
      }
    })();

  // 1. L1 Memory Cache
  storeMediaInMemory(canonicalUrl, buffer, cleanMime, derivedName);

  // 2. L2 /tmp Disk Cache
  const binPath = path.join(SERVER_CACHE_TMP_MEDIA_DIR, `${shaKey}.bin`);
  const metaPath = path.join(SERVER_CACHE_TMP_MEDIA_DIR, `${shaKey}.meta.json`);
  writeTmpFileAtomic(binPath, buffer);
  writeTmpFileAtomic(
    metaPath,
    JSON.stringify({
      url: canonicalUrl,
      mimeType: cleanMime,
      size: buffer.length,
      filename: derivedName,
      cachedAt: Date.now(),
    })
  );

  // 3. L3 Cloud Firestore Persistent Server Cache
  const state = getRuntimeState();
  const docId = getFirestoreMediaDocId(canonicalUrl);
  if (state.lastFirestoreMediaSyncKey.has(docId) && !options?.awaitFirestore) {
    return true;
  }

  const persistFirestoreTask = (async (): Promise<boolean> => {
    try {
      const prepared = await prepareFirestoreSafeMediaBuffer(buffer, cleanMime);
      if (!prepared) return false;

      const dataUrl = `data:${prepared.mimeType};base64,${prepared.buffer.toString('base64')}`;
      const firestoreUrl = getFirestoreDocUrl('uploadedMedia', docId);
      const res = await fetch(firestoreUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: docId },
            url: { stringValue: canonicalUrl },
            filename: { stringValue: derivedName },
            mimeType: { stringValue: prepared.mimeType },
            size: { integerValue: String(prepared.buffer.length) },
            dataUrl: { stringValue: dataUrl },
            compressedBackup: { booleanValue: prepared.compressed },
            uploadedAt: { stringValue: new Date().toISOString() },
            timestamp: { integerValue: String(Date.now()) },
            savedPermanently: { booleanValue: true },
            _adminAuth: { stringValue: 'alfreelnc_admin_auth_verified' },
            updatedByAdmin: { booleanValue: true },
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        state.lastFirestoreMediaSyncKey.add(docId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  })();

  if (options?.awaitFirestore) {
    await persistFirestoreTask;
  } else {
    void persistFirestoreTask;
  }

  return true;
}

function guessMimeFromName(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'image/webp';
}

function decodeFirestoreDataUrl(dataUrl: string, fallbackMime: string): { buffer: Buffer; mimeType: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
  const mimeType = mimeMatch?.[1] || fallbackMime;
  const cleanB64 = dataUrl.replace(/^data:[^;]+;base64,/i, '');
  if (!cleanB64) return null;
  const buffer = Buffer.from(cleanB64, 'base64');
  if (buffer.length === 0) return null;
  return { buffer, mimeType };
}

export async function readMediaFromServerCache(
  rawUrl: string
): Promise<{ buffer: Buffer; mimeType: string; source: ServerCacheSource } | null> {
  const canonicalUrl = normalizeCanonicalMediaUrl(rawUrl);
  if (!canonicalUrl) return null;

  const state = getRuntimeState();
  const shaKey = computeUrlSha1(canonicalUrl);

  // 1. L1 Memory Cache
  const mem = state.mediaCache.get(shaKey);
  if (mem && mem.buffer.length > 0) {
    return {
      buffer: mem.buffer,
      mimeType: mem.mimeType,
      source: 'memory-cache',
    };
  }

  // 2. L2 /tmp Disk Cache
  try {
    const binPath = path.join(SERVER_CACHE_TMP_MEDIA_DIR, `${shaKey}.bin`);
    const metaPath = path.join(SERVER_CACHE_TMP_MEDIA_DIR, `${shaKey}.meta.json`);
    if (fs.existsSync(binPath) && fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const buffer = fs.readFileSync(binPath);
      if (buffer.length > 0) {
        const mimeType = String(meta?.mimeType || guessMimeFromName(String(meta?.filename || canonicalUrl)));
        storeMediaInMemory(canonicalUrl, buffer, mimeType, meta?.filename);
        return { buffer, mimeType, source: 'tmp-cache' };
      }
    }
  } catch {
    // Continue to L3 Firestore
  }

  // Extract basename for compatibility fallback lookup in Firestore and bundled public files
  const urlPath = (() => {
    try {
      return canonicalUrl.startsWith('http') ? new URL(canonicalUrl).pathname : canonicalUrl.split('?')[0];
    } catch {
      return canonicalUrl.split('?')[0];
    }
  })();
  const basename = path.basename(urlPath);
  const safeBase = basename.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 3. L3 Cloud Firestore Server Cache (url hash doc + legacy basename doc candidates)
  const docCandidates = Array.from(
    new Set(
      [
        getFirestoreMediaDocId(canonicalUrl),
        basename ? `media_${safeBase}` : '',
        basename ? safeBase : '',
      ].filter(Boolean)
    )
  );

  for (const docId of docCandidates) {
    try {
      const firestoreUrl = getFirestoreDocUrl('uploadedMedia', docId);
      const res = await fetch(firestoreUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) continue;
      const docJson: any = await res.json();
      const fields = docJson?.fields;
      const rawDataUrl = fields?.dataUrl?.stringValue;
      const storedMime = fields?.mimeType?.stringValue || guessMimeFromName(basename);
      if (rawDataUrl) {
        const decoded = decodeFirestoreDataUrl(rawDataUrl, storedMime);
        if (decoded) {
          storeMediaInMemory(canonicalUrl, decoded.buffer, decoded.mimeType, basename);
          writeTmpFileAtomic(path.join(SERVER_CACHE_TMP_MEDIA_DIR, `${shaKey}.bin`), decoded.buffer);
          writeTmpFileAtomic(
            path.join(SERVER_CACHE_TMP_MEDIA_DIR, `${shaKey}.meta.json`),
            JSON.stringify({
              url: canonicalUrl,
              mimeType: decoded.mimeType,
              size: decoded.buffer.length,
              filename: basename,
              cachedAt: Date.now(),
            })
          );
          return {
            buffer: decoded.buffer,
            mimeType: decoded.mimeType,
            source: 'firestore-cache',
          };
        }
      }
    } catch {
      // Try next candidate
    }
  }

  // 4. L4 Bundled local public/ files (uploads, images, assets)
  if (basename && !basename.includes('..')) {
    const publicDir = path.resolve(process.cwd(), 'public');
    const localCandidates = [
      urlPath.startsWith('/') ? path.resolve(publicDir, urlPath.replace(/^\/+/, '')) : '',
      path.resolve(publicDir, 'uploads', basename),
      path.resolve(publicDir, 'images', basename),
      path.resolve(publicDir, 'assets', 'experiences', basename),
    ].filter((p) => p && p.startsWith(publicDir));

    for (const candidatePath of localCandidates) {
      try {
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
          const buffer = fs.readFileSync(candidatePath);
          if (buffer.length > 0) {
            const mimeType = guessMimeFromName(candidatePath);
            void saveMediaToServerCache(canonicalUrl, buffer, mimeType, basename, {
              awaitFirestore: false,
            });
            return { buffer, mimeType, source: 'bundled-fallback' };
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return null;
}

export async function readMediaByDocIdFromFirestore(
  docId: string
): Promise<{ buffer: Buffer; mimeType: string; source: ServerCacheSource } | null> {
  const cleanId = sanitizeDocKey(docId);
  if (!cleanId) return null;

  try {
    const firestoreUrl = getFirestoreDocUrl('uploadedMedia', cleanId);
    const res = await fetch(firestoreUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    const docJson: any = await res.json();
    const fields = docJson?.fields;
    const rawDataUrl = fields?.dataUrl?.stringValue;
    const storedMime = fields?.mimeType?.stringValue || 'image/webp';
    if (!rawDataUrl) return null;
    const decoded = decodeFirestoreDataUrl(rawDataUrl, storedMime);
    if (!decoded) return null;
    return {
      buffer: decoded.buffer,
      mimeType: decoded.mimeType,
      source: 'firestore-cache',
    };
  } catch {
    return null;
  }
}

export async function resolveAndCacheMedia(
  rawUrl: string
): Promise<{ buffer: Buffer; mimeType: string; source: ServerCacheSource } | null> {
  const canonicalUrl = normalizeCanonicalMediaUrl(rawUrl);
  if (!canonicalUrl || !isAllowedMediaProxyUrl(canonicalUrl)) {
    return null;
  }

  // 1. Always check persistent & fast server caches first (Memory -> /tmp -> Firestore -> Bundle)
  const cached = await readMediaFromServerCache(canonicalUrl);
  if (cached) {
    return cached;
  }

  // 2. Relative URLs should already resolve from bundle above; avoid loopback self-fetch
  if (!/^https?:\/\//i.test(canonicalUrl)) {
    return null;
  }

  // 3. Origin fetch (only when healthy!) -> immediately persist into L1 + L2 + L3 Firestore
  try {
    const originRes = await fetch(canonicalUrl, {
      method: 'GET',
      headers: { Accept: 'image/*,application/pdf,*/*' },
      signal: AbortSignal.timeout(8000),
    });

    if (!originRes.ok) {
      return null;
    }

    const contentType = (originRes.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return null;
    }

    const arrBuf = await originRes.arrayBuffer();
    const buffer = Buffer.from(arrBuf);
    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      return null;
    }

    const mimeType =
      contentType && (contentType.startsWith('image/') || contentType.includes('pdf'))
        ? contentType.split(';')[0].trim()
        : guessMimeFromName(canonicalUrl);

    await saveMediaToServerCache(canonicalUrl, buffer, mimeType, undefined, {
      awaitFirestore: true,
    });

    return {
      buffer,
      mimeType,
      source: 'vercel-blob',
    };
  } catch {
    return null;
  }
}
