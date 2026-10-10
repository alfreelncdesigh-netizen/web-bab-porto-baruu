import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, ensureFreshAuthToken } from './firebase';
import { compressImageToWebP } from './imageCompressor';

/**
 * Universal timeout wrapper
 * Membatalkan proses jika melebihi batas waktu (default: 15 detik)
 * Mencegah halaman stuck loading selamanya
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 15000,
  errorMessage = "Gagal mengunggah gambar, silakan coba lagi"
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
 * Mengunggah file/blob gambar ke Cloud Storage (Local API, Firebase Storage, atau Cloudinary)
 * untuk menghasilkan URL HTTP publik yang bersih.
 * Menjamin HANYA URL teks yang dikembalikan, BUKAN string Base64 raksasa.
 */
export async function uploadImageToStorage(
  fileOrBlob: Blob | File,
  filename?: string,
  fallbackBase64?: string,
  folder = 'blog_posts',
  timeoutMs = 15000
): Promise<string> {
  const cleanName = filename || `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
  const abortController = new AbortController();

  const doUpload = async (): Promise<string> => {
    // 1. REFRESH TOKEN sebelum request upload dikirim untuk menghindari session timeout
    let freshToken: string | null = null;
    try {
      freshToken = await ensureFreshAuthToken();
    } catch (authErr) {
      console.warn("Session refresh token warning:", authErr);
    }

    const authHeaders: Record<string, string> = {};
    if (freshToken) {
      authHeaders['Authorization'] = `Bearer ${freshToken}`;
    }

    // 2. Jalur Utama Cepat: Endpoint Server /api/upload (Waktu proses ~50-200 ms untuk file < 200 KB)
    try {
      const formData = new FormData();
      formData.append('file', fileOrBlob, cleanName);

      const serverRes = await fetch('/api/upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
        signal: abortController.signal,
      });

      if (serverRes.ok) {
        const resData = await serverRes.json();
        if (resData.url) {
          const fullUrl = resData.url.startsWith('http')
            ? resData.url
            : (typeof window !== 'undefined' && window.location?.origin
                ? `${window.location.origin}${resData.url.startsWith('/') ? '' : '/'}${resData.url}`
                : resData.url);
          return fullUrl;
        }
      }
    } catch (apiErr: any) {
      if (apiErr.name === 'AbortError') {
        throw new Error("Gagal mengunggah gambar, silakan coba lagi");
      }
      console.warn("Local upload endpoint skipped/fallback:", apiErr?.message || apiErr);
    }

    // 3. Cadangan Cloud: Firebase Storage (dengan timeout ketat 4 detik agar tidak stuck)
    try {
      const storageRef = ref(storage, `${folder}/${cleanName}`);
      const metadata = {
        contentType: fileOrBlob.type || 'image/webp',
        cacheControl: 'public, max-age=31536000',
      };

      const uploadTask = uploadBytes(storageRef, fileOrBlob, metadata);
      const snapshot = await withTimeout(uploadTask, 4000, "Firebase Storage timeout");
      const downloadUrl = await getDownloadURL(snapshot.ref);
      if (downloadUrl && downloadUrl.startsWith('http')) {
        return downloadUrl;
      }
    } catch (firebaseErr: any) {
      console.warn("Firebase Storage upload fallback:", firebaseErr?.message || firebaseErr);
    }

    // 4. Cadangan Cloudinary (jika configured)
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

    if (cloudName && cloudName !== 'your_cloud_name') {
      try {
        const formData = new FormData();
        formData.append('file', fileOrBlob, cleanName);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
          signal: abortController.signal,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.secure_url) {
            return data.secure_url;
          }
        }
      } catch (cloudinaryErr: any) {
        if (cloudinaryErr.name === 'AbortError') {
          throw new Error("Gagal mengunggah gambar, silakan coba lagi");
        }
        console.warn("Cloudinary upload failed:", cloudinaryErr?.message || cloudinaryErr);
      }
    }

    // 5. Fallback terakhir jika tersedia
    if (fallbackBase64) {
      return fallbackBase64;
    }

    throw new Error("Gagal mengunggah gambar, silakan coba lagi");
  };

  try {
    return await withTimeout(
      doUpload(),
      timeoutMs,
      "Gagal mengunggah gambar, silakan coba lagi"
    );
  } catch (err: any) {
    abortController.abort();
    throw new Error("Gagal mengunggah gambar, silakan coba lagi");
  }
}

/**
 * 1. Kompresi otomatis di sisi client (HTML5 Canvas, WebP/JPEG, max-width: 1200px, quality: 0.75, target < 200 KB)
 * 2. Langsung mengunggah ke storage di latar belakang (background upload)
 * 3. Batas waktu maksimal 15 detik (batal otomatis jika melebihi)
 * 4. Mengembalikan HANYA string URL gambar
 */
export async function compressAndUpload(
  file: File,
  folder = 'blog_posts',
  maxWidth = 1200,
  quality = 0.75,
  timeoutMs = 15000,
  onFinish?: () => void
): Promise<string> {
  // Kompresi di sisi client
  let blobToUpload: Blob;
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    const compressed = await compressImageToWebP(file, maxWidth, quality);
    blobToUpload = compressed.blob;
  } else {
    blobToUpload = file;
  }

  // Upload langsung dengan timeout 15 detik
  const url = await uploadImageToStorage(blobToUpload, file.name, undefined, folder, timeoutMs);
  if (onFinish) onFinish();
  return url;
}

/**
 * Mengunggah banyak gambar secara paralel (Promise.all)
 * dengan timeout 15 detik per upload dan progress callback
 */
export async function uploadMultipleImagesInParallel(
  files: File[],
  folder = 'blog_posts',
  onProgress?: (completed: number, total: number) => void,
  maxWidth = 1200,
  quality = 0.75,
  timeoutMs = 15000
): Promise<string[]> {
  const total = files.length;
  if (total === 0) return [];

  let completed = 0;

  const uploadPromises = files.map(async (file) => {
    try {
      const url = await compressAndUpload(file, folder, maxWidth, quality, timeoutMs);
      completed++;
      if (onProgress) onProgress(completed, total);
      return url;
    } catch (err) {
      console.error(`Gagal upload file ${file.name}:`, err);
      throw new Error("Gagal mengunggah gambar, silakan coba lagi");
    }
  });

  return withTimeout(
    Promise.all(uploadPromises),
    timeoutMs,
    "Gagal mengunggah gambar, silakan coba lagi"
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
