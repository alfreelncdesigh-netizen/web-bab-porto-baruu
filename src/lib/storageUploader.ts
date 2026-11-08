import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { compressImageToWebP } from './imageCompressor';
import { renderPdfFirstPageToImage } from './pdfHelper';
import { isQuotaExhausted, markQuotaExhausted, isQuotaError } from './firestoreErrorHandler';

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

/**
 * Normalisasi nama folder penyimpanan khusus aset di Firebase Storage:
 * - /works/ untuk karya & portofolio
 * - /experiences/ untuk riwayat pengalaman & sertifikat
 * - /blogs/ untuk artikel & berita
 * - /promos/ untuk poster promosi
 * - /cv/ untuk dokumen CV & foto riwayat hidup
 * - /about/ untuk foto profil tentang saya
 */
export function normalizeStorageFolder(folder?: string): string {
  if (!folder) return 'works';
  const f = folder.toLowerCase().trim().replace(/^\/+|\/+$/g, '');
  if (f === 'portfolio' || f === 'portofolio' || f === 'work' || f === 'works' || f === 'karya') {
    return 'works';
  }
  if (f === 'experience' || f === 'experiences' || f === 'pengalaman') {
    return 'experiences';
  }
  if (f === 'blog' || f === 'blogs' || f === 'blog_posts') {
    return 'blogs';
  }
  if (f === 'promo' || f === 'promos' || f === 'poster' || f === 'posters') {
    return 'promos';
  }
  if (f === 'cv' || f === 'resume') {
    return 'cv';
  }
  if (f === 'about' || f === 'profile') {
    return 'about';
  }
  if (f === 'settings' || f === 'banners' || f === 'hero') {
    return 'settings';
  }
  return f || 'works';
}

/**
 * Menyimpan tautan publik permanen dan metadata gambar secara aman ke Cloud Firestore:
 * 1. Database Cloud Firestore (collection: uploadedMedia) dengan ID filename
 * 2. Server Disk Registry (/api/media-registry)
 * 3. LocalStorage browser (uploaded_media_links)
 * TIDAK MENYIMPAN string base64 mentah ke database agar hemat kuota dan cepat dimuat.
 */
export async function recordMediaPermanently(
  url: string, 
  filename?: string, 
  size = 0, 
  folder = 'works',
  _dataUrlIgnored?: string
): Promise<void> {
  if (!url || typeof url !== 'string') return;
  const cleanUrl = url.trim();
  // Cegah penyimpanan URL data base64 mentah atau blob lokal
  if (!cleanUrl || cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) return;

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
    savedPermanently: true
  };

  // 1. Simpan di local storage
  try {
    const existing = localStorage.getItem('uploaded_media_links');
    let list = existing ? JSON.parse(existing) : [];
    if (!Array.isArray(list)) list = [];
    // Cegah duplikasi URL yang sama
    list = [record, ...list.filter((m: any) => m?.url !== cleanUrl && m?.filename !== safeFilename)];
    if (list.length > 500) list = list.slice(0, 500);
    localStorage.setItem('uploaded_media_links', JSON.stringify(list));
  } catch {}

  // 2. Simpan di server disk registry jika tersedia (/api/media-registry)
  try {
    fetch('/api/media-registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(record)
    }).catch(() => {});
  } catch {}

  // 3. Simpan tautan permanen di Cloud Firestore (uploadedMedia)
  try {
    if (isQuotaExhausted()) return;

    const firestoreData: Record<string, any> = {
      ...record,
      _adminAuth: 'alfreelnc_admin_auth_verified',
      updatedByAdmin: true
    };
    await setDoc(doc(db, 'uploadedMedia', safeDocId), firestoreData, { merge: true });
    if (safeFilename !== safeDocId) {
      await setDoc(doc(db, 'uploadedMedia', safeFilename), firestoreData, { merge: true }).catch(() => {});
    }

    // Jika file ini adalah foto cover beranda utama, perbarui doc settings/hero
    if (targetFolder === 'settings' && (safeFilename.includes('cover_web') || safeFilename.includes('hero_main'))) {
      const heroPayload: Record<string, any> = {
        heroImage: cleanUrl,
        savedAt: Date.now(),
        updatedAt: new Date().toISOString(),
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      };
      await setDoc(doc(db, 'settings', 'hero'), heroPayload, { merge: true }).catch(() => {});
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
    }
    console.warn("Firestore media record notice:", err?.message || err);
  }
}

export function getStoredUploadedMedia(): StoredMediaRecord[] {
  try {
    const data = localStorage.getItem('uploaded_media_links');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Universal timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 25000,
  errorMessage = "Gagal mengunggah gambar ke cloud storage, batas waktu terlampaui."
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

/**
 * Mengunggah file/blob gambar secara permanen ke Firebase Storage:
 * 1. Menggunakan folder khusus aset (/works/, /experiences/, /blogs/, /promos/, /cv/, /about/)
 * 2. Mengambil URL publik permanen (download URL HTTPS) dari Firebase Storage
 * 3. Menjamin HANYA URL permanen yang dikembalikan, BUKAN Base64 atau local blob
 */
export async function uploadImageToStorage(
  fileOrBlob: Blob | File,
  filename?: string,
  _fallbackBase64Ignored?: string,
  folder = 'works',
  timeoutMs = 25000
): Promise<string> {
  const targetFolder = normalizeStorageFolder(folder);
  const rawFileName = filename || (fileOrBlob instanceof File ? fileOrBlob.name : '');
  const isSvg = (fileOrBlob instanceof File && fileOrBlob.name.toLowerCase().endsWith('.svg')) ||
                fileOrBlob.type === 'image/svg+xml' ||
                Boolean(filename && filename.toLowerCase().endsWith('.svg'));
  const isPdf = (fileOrBlob instanceof File && fileOrBlob.name.toLowerCase().endsWith('.pdf')) ||
                fileOrBlob.type === 'application/pdf' ||
                Boolean(filename && filename.toLowerCase().endsWith('.pdf'));
  
  const ext = isSvg ? '.svg' : isPdf ? '.pdf' : '.webp';
  const baseOnly = rawFileName ? rawFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : `img_${Date.now()}`;
  const cleanName = `${baseOnly}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
  const mimeType = isSvg ? 'image/svg+xml' : isPdf ? 'application/pdf' : 'image/webp';

  // 1. PRIORITAS UTAMA: Firebase Storage resmi (Folder khusus /works/, /experiences/, dll.)
  let firebaseStorageError: any = null;
  try {
    const storageRef = ref(storage, `${targetFolder}/${cleanName}`);
    const metadata = {
      contentType: fileOrBlob.type || mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    };

    const uploadTask = uploadBytes(storageRef, fileOrBlob, metadata);
    const snapshot = await withTimeout(
      uploadTask,
      timeoutMs,
      `Batas waktu upload Firebase Storage (${targetFolder}) terlampaui.`
    );
    const downloadUrl = await getDownloadURL(snapshot.ref);

    if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) {
      // Simpan catatan media permanen ke Firestore (hanya link HTTP bersih, tanpa base64)
      recordMediaPermanently(downloadUrl, cleanName, fileOrBlob.size, targetFolder).catch(() => {});
      return downloadUrl;
    }
  } catch (err: any) {
    firebaseStorageError = err;
    console.warn(`[Firebase Storage] Upload ke /${targetFolder}/ gagal:`, err?.code || err?.message || err);
  }

  // 2. CADANGAN CLOUD: Cloudinary (hanya jika sudah dikonfigurasi)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  if (cloudName && cloudName !== 'your_cloud_name') {
    try {
      const formData = new FormData();
      formData.append('file', fileOrBlob, cleanName);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', targetFolder);

      const response = await withTimeout(
        fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        }),
        8000
      );

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          recordMediaPermanently(data.secure_url, cleanName, fileOrBlob.size, targetFolder).catch(() => {});
          return data.secure_url;
        }
      }
    } catch (cloudinaryErr: any) {
      console.warn("[Cloudinary] Upload cadangan gagal:", cloudinaryErr?.message || cloudinaryErr);
    }
  }

  // Jika Firebase Storage mengembalikan error bucket belum siap
  const errMsg = firebaseStorageError?.message || '';
  if (firebaseStorageError?.code === 'storage/unknown' || errMsg.includes('404') || errMsg.includes('notFound')) {
    throw new Error(
      `Firebase Storage untuk folder /${targetFolder}/ belum aktif di Firebase Console. Pastikan Firebase Storage sudah diaktifkan di https://console.firebase.google.com/project/portofolio-c368b/storage`
    );
  }

  if (firebaseStorageError?.code === 'storage/unauthorized' || errMsg.includes('permission')) {
    throw new Error(
      `Izin Firebase Storage ditolak pada folder /${targetFolder}/. Periksa aturan keamanan (security rules) Storage di Firebase Console.`
    );
  }

  throw new Error(
    `Gagal mengunggah file ke Firebase Storage (folder /${targetFolder}/): ${errMsg || 'Koneksi jaringan terputus'}`
  );
}

/**
 * 1. Kompresi otomatis di sisi client (HTML5 Canvas, WebP/PNG, max-width: 1200px)
 * 2. Langsung mengunggah ke Firebase Storage di latar belakang
 * 3. Menghasilkan URL HTTP publik permanen bersih untuk Firestore
 */
export async function compressAndUpload(
  file: File,
  folder = 'works',
  maxWidth = 1200,
  quality = 0.8,
  timeoutMs = 25000,
  onFinish?: () => void
): Promise<string> {
  const targetFolder = normalizeStorageFolder(folder);

  // Dukungan Format PDF: Render halaman 1 PDF ke format gambar WebP beresolusi tinggi
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const rendered = await renderPdfFirstPageToImage(file);
      if (rendered) {
        const url = await uploadImageToStorage(rendered.blob, rendered.name, undefined, targetFolder, timeoutMs);
        if (onFinish) onFinish();
        return url;
      }
    } catch (e) {
      console.warn("PDF rasterization skipped, uploading raw PDF:", e);
    }
    const url = await uploadImageToStorage(file, file.name, undefined, targetFolder, timeoutMs);
    if (onFinish) onFinish();
    return url;
  }

  // Kompresi di sisi client untuk file gambar PNG / JPG / WebP
  let blobToUpload: Blob;
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    const compressed = await compressImageToWebP(file, maxWidth, quality);
    blobToUpload = compressed.blob;
  } else {
    blobToUpload = file;
  }

  // Upload langsung ke Firebase Storage dan dapatkan URL permanen
  const url = await uploadImageToStorage(blobToUpload, file.name, undefined, targetFolder, timeoutMs);
  if (onFinish) onFinish();
  return url;
}

/**
 * Mengunggah banyak gambar secara paralel (Promise.all) ke Firebase Storage
 * dengan timeout per upload dan progress callback
 */
export async function uploadMultipleImagesInParallel(
  files: File[],
  folder = 'works',
  onProgress?: (completed: number, total: number) => void,
  maxWidth = 1200,
  quality = 0.75,
  timeoutMs = 25000
): Promise<string[]> {
  const total = files.length;
  if (total === 0) return [];
  const targetFolder = normalizeStorageFolder(folder);

  let completed = 0;

  const uploadPromises = files.map(async (file) => {
    try {
      const url = await compressAndUpload(file, targetFolder, maxWidth, quality, timeoutMs);
      completed++;
      if (onProgress) onProgress(completed, total);
      return url;
    } catch (err: any) {
      console.error(`Gagal upload file ${file.name} ke /${targetFolder}/:`, err);
      throw err;
    }
  });

  return withTimeout(
    Promise.all(uploadPromises),
    timeoutMs * Math.min(files.length, 3),
    "Gagal mengunggah berkas gambar ke Firebase Storage, batas waktu terlampaui."
  );
}

/**
 * Mengubah string Base64 menjadi Blob WebP untuk diunggah
 */
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
  } catch (e) {
    return new Blob([], { type: 'image/webp' });
  }
}
