import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { compressImageToWebP, compressPortfolioImageToWebP } from './imageCompressor';
import { renderPdfFirstPageToImage } from './pdfHelper';
import { sanitizeMediaUrl } from './imageResolver';
import { cacheUploadedBlobInBrowser } from './cacheManager';

export const PORTFOLIO_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const PDF_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PORTFOLIO_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_PORTFOLIO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export interface VercelBlobUploadResult {
  url: string;
  pathname: string;
  width: number;
  height: number;
  size: number;
}

export interface StoredMediaRecord {
  id: string;
  url: string;
  filename: string;
  folder: string;
  size: number;
  uploadedAt: string;
  timestamp: number;
  savedPermanently: boolean;
}

export function normalizeStorageFolder(folder?: string): string {
  if (!folder) return 'portfolio';
  const f = folder.toLowerCase().trim().replace(/^\/+|\/+$/g, '');
  if (f === 'portfolio' || f === 'portofolio' || f === 'work' || f === 'works' || f === 'karya') {
    return 'portfolio';
  }
  if (f === 'experience' || f === 'experiences' || f === 'pengalaman') {
    return 'experiences';
  }
  if (f === 'blog' || f === 'blogs' || f === 'blog_posts') {
    return 'blogs';
  }
  if (f === 'promo' || f === 'promos' || f === 'poster' || f === 'posters') {
    return 'posters';
  }
  if (f === 'cv' || f === 'resume') {
    return 'cv';
  }
  if (f === 'about' || f === 'profile') {
    return 'about';
  }
  if (f === 'hero') {
    return 'hero';
  }
  if (f === 'banners' || f === 'banner') {
    return 'banners';
  }
  if (f === 'collaboration') {
    return 'collaboration';
  }
  if (f === 'orders') {
    return 'orders';
  }
  if (f === 'settings') {
    return 'settings';
  }
  if (f === 'insight' || f === 'insights' || f === 'quick_filter' || f === 'qfa') {
    return 'insight';
  }
  return 'portfolio';
}

export function validatePortfolioImageFile(file: File): void {
  if (!file) {
    throw new Error('Tidak ada file yang dipilih.');
  }

  const lowerName = (file.name || '').toLowerCase();
  const dotIdx = lowerName.lastIndexOf('.');
  const ext = dotIdx !== -1 ? lowerName.slice(dotIdx) : '';
  const mime = (file.type || '').toLowerCase();

  const isAllowedType =
    (mime && ALLOWED_PORTFOLIO_MIME_TYPES.has(mime)) ||
    (!mime && ALLOWED_PORTFOLIO_EXTENSIONS.has(ext));

  if (!isAllowedType || (ext && !ALLOWED_PORTFOLIO_EXTENSIONS.has(ext) && !ALLOWED_PORTFOLIO_MIME_TYPES.has(mime))) {
    throw new Error(`Format file "${file.name}" tidak didukung. Pilih file gambar JPG, JPEG, PNG, atau WebP.`);
  }

  if (file.size > PORTFOLIO_MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Ukuran file "${file.name}" (${sizeMb} MB) melebihi batas maksimal 5 MB.`);
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 30000,
  errorMessage = 'Batas waktu upload ke Vercel Blob terlampaui.'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function uploadToVercelBlob(
  fileOrBlob: Blob | File,
  filename: string,
  folder: string,
  timeoutMs = 30000
): Promise<{ url: string; pathname: string; size: number }> {
  const targetFolder = normalizeStorageFolder(folder);
  const safeName = filename || (fileOrBlob instanceof File ? fileOrBlob.name : `asset_${Date.now()}.webp`);

  const formData = new FormData();
  formData.append('file', fileOrBlob, safeName);

  const response = await withTimeout(
    fetch(`/api/blob-upload?folder=${encodeURIComponent(targetFolder)}`, {
      method: 'POST',
      headers: {
        'x-admin-token': 'alfreelnc_admin_auth_verified',
        'x-filename': safeName,
        'x-blob-folder': targetFolder,
      },
      body: formData,
    }),
    timeoutMs,
    'Batas waktu upload ke Vercel Blob terlampaui.'
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Upload ke Vercel Blob gagal (HTTP ${response.status}).`);
  }

  const rawPublicUrl = typeof data?.url === 'string' ? data.url.trim() : '';
  const isServerOrLocalUrl =
    data?.storage === 'local-fallback' ||
    data?.storage === 'server-cache' ||
    rawPublicUrl.startsWith('/api/media-cache?') ||
    rawPublicUrl.startsWith('/uploads/');
  const sanitizedUrl = sanitizeMediaUrl(rawPublicUrl);

  if (!sanitizedUrl) {
    console.error('[StorageUploader] URL hasil upload tidak valid:', rawPublicUrl);
    throw new Error('Server tidak mengembalikan URL media yang valid.');
  }

  if (!isServerOrLocalUrl && !/^https:\/\//i.test(sanitizedUrl)) {
    console.error('[StorageUploader] URL Vercel Blob produksi wajib diawali https://:', sanitizedUrl);
    throw new Error('Server Vercel Blob tidak mengembalikan URL https:// yang valid.');
  }

  // Simpan gambar hasil upload langsung ke Browser Cache & hangatkan Edge CDN secara paralel
  void cacheUploadedBlobInBrowser(sanitizedUrl, fileOrBlob, fileOrBlob.type);

  return {
    url: sanitizedUrl,
    pathname: data?.pathname || safeName,
    size: Number(data?.size || fileOrBlob.size || 0),
  };
}

export async function recordMediaPermanently(
  url: string,
  filename?: string,
  size = 0,
  folder = 'portfolio'
): Promise<void> {
  if (!url || typeof url !== 'string') return;
  const cleanUrl = url.trim();
  if (!cleanUrl || cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:')) return;

  const targetFolder = normalizeStorageFolder(folder);
  const safeFilename = filename || cleanUrl.split('/').pop()?.split('?')[0] || `img_${Date.now()}`;
  const safeDocId = safeFilename.replace(/[^a-zA-Z0-9_-]/g, '_');

  const record: StoredMediaRecord = {
    id: safeDocId,
    url: cleanUrl,
    filename: safeFilename,
    folder: targetFolder,
    size,
    uploadedAt: new Date().toISOString(),
    timestamp: Date.now(),
    savedPermanently: true,
  };

  try {
    await setDoc(
      doc(db, 'uploadedMedia', safeDocId),
      {
        ...record,
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore uploadedMedia metadata notice:', err);
  }
}

export function getStoredUploadedMedia(): StoredMediaRecord[] {
  return [];
}

export async function uploadPortfolioImageToVercelBlob(
  file: File,
  onStage?: (stageText: string) => void
): Promise<VercelBlobUploadResult> {
  validatePortfolioImageFile(file);

  onStage?.(`Mengonversi "${file.name}" ke WebP (maks. 1600px, < 300 KB)...`);
  const compressed = await compressPortfolioImageToWebP(file, 1600, 300 * 1024);

  onStage?.(`Mengunggah "${compressed.file.name}" ke Vercel Blob...`);
  const uploaded = await uploadToVercelBlob(compressed.file, compressed.file.name, 'portfolio', 30000);

  recordMediaPermanently(uploaded.url, uploaded.pathname, compressed.size, 'portfolio').catch(() => {});

  return {
    url: uploaded.url,
    pathname: uploaded.pathname,
    width: compressed.width,
    height: compressed.height,
    size: compressed.size,
  };
}

export async function uploadImageToStorage(
  fileOrBlob: Blob | File,
  filename?: string,
  _fallbackBase64Ignored?: string,
  folder = 'portfolio',
  timeoutMs = 30000
): Promise<string> {
  const targetFolder = normalizeStorageFolder(folder);
  const rawFileName = filename || (fileOrBlob instanceof File ? fileOrBlob.name : '');
  const isSvg =
    (fileOrBlob instanceof File && fileOrBlob.name.toLowerCase().endsWith('.svg')) ||
    fileOrBlob.type === 'image/svg+xml' ||
    Boolean(filename && filename.toLowerCase().endsWith('.svg'));
  const isPdf =
    (fileOrBlob instanceof File && fileOrBlob.name.toLowerCase().endsWith('.pdf')) ||
    fileOrBlob.type === 'application/pdf' ||
    Boolean(filename && filename.toLowerCase().endsWith('.pdf'));

  const ext = isSvg ? '.svg' : isPdf ? '.pdf' : '.webp';
  const baseOnly = rawFileName
    ? rawFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    : `img_${Date.now()}`;
  const cleanName = `${baseOnly}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;

  let uploadBlob: Blob = fileOrBlob;
  if (!isSvg && !isPdf && fileOrBlob.type?.startsWith('image/') && fileOrBlob.size > 200 * 1024) {
    const comp = await compressImageToWebP(fileOrBlob as File, 1600, 0.84);
    uploadBlob = comp.blob;
  }

  const uploaded = await uploadToVercelBlob(uploadBlob, cleanName, targetFolder, timeoutMs);
  recordMediaPermanently(uploaded.url, cleanName, uploadBlob.size, targetFolder).catch(() => {});
  return uploaded.url;
}

export async function compressAndUpload(
  file: File,
  folder = 'portfolio',
  maxWidth = 1400,
  quality = 0.82,
  timeoutMs = 30000,
  onFinish?: () => void
): Promise<string> {
  const targetFolder = normalizeStorageFolder(folder);

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    if (targetFolder === 'cv') {
      const url = await uploadImageToStorage(file, file.name, undefined, targetFolder, timeoutMs);
      onFinish?.();
      return url;
    }
    try {
      const rendered = await renderPdfFirstPageToImage(file);
      if (rendered) {
        const url = await uploadImageToStorage(rendered.blob, rendered.name, undefined, targetFolder, timeoutMs);
        onFinish?.();
        return url;
      }
    } catch (e) {
      console.warn('PDF rasterization skipped, uploading raw PDF:', e);
    }
    const url = await uploadImageToStorage(file, file.name, undefined, targetFolder, timeoutMs);
    onFinish?.();
    return url;
  }

  let blobToUpload: Blob = file;
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    const compressed = await compressImageToWebP(file, maxWidth, quality);
    blobToUpload = compressed.blob;
  }

  const url = await uploadImageToStorage(blobToUpload, file.name, undefined, targetFolder, timeoutMs);
  onFinish?.();
  return url;
}

export async function uploadMultipleImagesInParallel(
  files: File[],
  folder = 'portfolio',
  onProgress?: (completed: number, total: number) => void,
  maxWidth = 1400,
  quality = 0.8,
  timeoutMs = 30000
): Promise<string[]> {
  const total = files.length;
  if (total === 0) return [];
  const targetFolder = normalizeStorageFolder(folder);

  let completed = 0;
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const url = await compressAndUpload(file, targetFolder, maxWidth, quality, timeoutMs);
    if (!url || !url.trim() || url.startsWith('blob:') || url.startsWith('data:')) {
      throw new Error(`Upload file "${file.name}" tidak menghasilkan URL Vercel Blob yang valid.`);
    }
    uploadedUrls.push(url.trim());
    completed++;
    onProgress?.(completed, total);
  }

  return uploadedUrls;
}

export function base64ToBlob(base64: string): Blob {
  try {
    const parts = base64.split(';base64,');
    const contentType = parts[0]?.split(':')[1] || 'image/webp';
    const raw = window.atob(parts[1] || '');
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  } catch {
    return new Blob([], { type: 'image/webp' });
  }
}

export async function ensurePersistedAssetUrl(url: string, folder = 'portfolio'): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('blob:')) {
    throw new Error('URL blob sementara tidak dapat disimpan. Silakan upload ulang gambar ke Vercel Blob.');
  }

  const targetFolder = normalizeStorageFolder(folder);

  if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:application/pdf')) {
    const isPdf = trimmed.startsWith('data:application/pdf');
    const isPng = trimmed.startsWith('data:image/png');
    const isSvg = trimmed.startsWith('data:image/svg');
    const ext = isPdf ? '.pdf' : isSvg ? '.svg' : isPng ? '.png' : '.webp';
    const filename = `${targetFolder}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;

    const blob = base64ToBlob(trimmed);
    if (blob.size <= 0) {
      throw new Error('Data file tidak valid untuk diunggah ke Vercel Blob.');
    }
    return await uploadImageToStorage(blob, filename, undefined, targetFolder, 30000);
  }

  return sanitizeMediaUrl(trimmed);
}
