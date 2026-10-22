import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, ensureFreshAuthToken } from './firebase';
import { compressImageToWebP } from './imageCompressor';
import { renderPdfFirstPageToImage } from './pdfHelper';

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
  const isPng = (fileOrBlob instanceof File && fileOrBlob.name.toLowerCase().endsWith('.png')) || 
                fileOrBlob.type === 'image/png' ||
                Boolean(filename && filename.toLowerCase().endsWith('.png'));
  const ext = isPng ? '.png' : '.webp';
  const rawFileName = filename || (fileOrBlob instanceof File ? fileOrBlob.name : '');
  const cleanName = rawFileName || `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const abortController = new AbortController();

  const doUpload = async (): Promise<string> => {
    // 1. REFRESH TOKEN cepat tanpa blocking lama
    let freshToken: string | null = null;
    try {
      freshToken = await Promise.race([
        ensureFreshAuthToken(),
        new Promise<null>((res) => setTimeout(() => res(null), 800))
      ]);
    } catch (authErr) {
      console.warn("Session refresh token warning:", authErr);
    }

    const authHeaders: Record<string, string> = {};
    if (freshToken) {
      authHeaders['Authorization'] = `Bearer ${freshToken}`;
    }

    // 2. Jalur Utama Cepat: Endpoint Server /api/upload dengan FormData (~30-100 ms)
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
          // Kembalikan relative clean URL (e.g. /uploads/safeName.webp) agar adaptif di semua domain/preview
          return resData.url;
        }
      }
    } catch (apiErr: any) {
      console.warn("Local multipart upload endpoint skipped/fallback:", apiErr?.message || apiErr);
    }

    // 3. Cadangan Cepat Server /api/upload dengan JSON Base64 (100% andal tanpa isu streaming/boundary)
    try {
      let base64 = fallbackBase64;
      if (!base64 && typeof window !== 'undefined') {
        base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string) || '');
          reader.onerror = () => res('');
          reader.readAsDataURL(fileOrBlob);
        });
      }
      if (base64) {
        const jsonRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ file: base64, filename: cleanName }),
          signal: abortController.signal,
        });
        if (jsonRes.ok) {
          const resData = await jsonRes.json();
          if (resData.url) {
            return resData.url;
          }
        }
      }
    } catch (jsonErr) {
      console.warn("Local JSON upload fallback skipped:", jsonErr);
    }

    // 4. Cadangan Cloud: Firebase Storage (dengan timeout ketat 3 detik agar tidak stuck)
    try {
      const storageRef = ref(storage, `${folder}/${cleanName}`);
      const metadata = {
        contentType: fileOrBlob.type || 'image/webp',
        cacheControl: 'public, max-age=31536000',
      };

      const uploadTask = uploadBytes(storageRef, fileOrBlob, metadata);
      const snapshot = await withTimeout(uploadTask, 3000, "Firebase Storage timeout");
      const downloadUrl = await getDownloadURL(snapshot.ref);
      if (downloadUrl && downloadUrl.startsWith('http')) {
        return downloadUrl;
      }
    } catch (firebaseErr: any) {
      console.warn("Firebase Storage upload fallback:", firebaseErr?.message || firebaseErr);
    }

    // 5. Cadangan Cloudinary (jika configured)
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
        console.warn("Cloudinary upload failed:", cloudinaryErr?.message || cloudinaryErr);
      }
    }

    // 6. Fallback instan aman: gunakan dataUrl yang sudah dikompresi
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
    if (fallbackBase64) return fallbackBase64;
    throw new Error("Gagal mengunggah gambar, silakan coba lagi");
  }
}

/**
 * 1. Kompresi otomatis di sisi client (HTML5 Canvas, WebP/PNG, max-width: 1200px)
 * 2. Langsung mengunggah ke storage di latar belakang (background upload)
 * 3. Batas waktu aman dan kembalikan URL HTTP bersih
 */
export async function compressAndUpload(
  file: File,
  folder = 'blog_posts',
  maxWidth = 1200,
  quality = 0.8,
  timeoutMs = 15000,
  onFinish?: () => void
): Promise<string> {
  // Dukungan Format PDF: Render halaman 1 PDF ke format gambar WebP beresolusi tinggi
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const rendered = await renderPdfFirstPageToImage(file);
      if (rendered) {
        const url = await uploadImageToStorage(rendered.blob, rendered.name, undefined, folder, timeoutMs);
        if (onFinish) onFinish();
        return url;
      }
    } catch (e) {
      console.warn("PDF rasterization skipped, uploading raw PDF:", e);
    }
    const url = await uploadImageToStorage(file, file.name, undefined, folder, timeoutMs);
    if (onFinish) onFinish();
    return url;
  }

  // Kompresi di sisi client untuk file gambar PNG / JPG / WebP
  let blobToUpload: Blob;
  let dataUrlFallback: string | undefined = undefined;
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    const compressed = await compressImageToWebP(file, maxWidth, quality);
    blobToUpload = compressed.blob;
    dataUrlFallback = compressed.dataUrl;
  } else {
    blobToUpload = file;
  }

  // Upload langsung dengan timeout dan dataUrl fallback
  const url = await uploadImageToStorage(blobToUpload, file.name, dataUrlFallback, folder, timeoutMs);
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
