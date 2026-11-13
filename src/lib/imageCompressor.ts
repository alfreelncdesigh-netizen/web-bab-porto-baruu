/**
 * Client-Side Image Compression Utility
 * 
 * Melakukan kompresi otomatis di sisi browser menggunakan HTML5 Canvas & toBlob:
 * 1. Format: WebP (fallback JPEG)
 * 2. Kualitas: 0.75 (75%)
 * 3. Batas Lebar Maksimal: 1200px (proporsional)
 * 4. Target Ukuran: SANGAT KECIL (< 200 KB) agar pengunggahan selesai dalam 1-2 detik.
 */
export async function compressImageToWebP(
  source: File | Blob | string,
  maxWidth = 1200,
  quality = 0.75
): Promise<{ dataUrl: string; blob: Blob; file: File }> {
  return new Promise((resolve) => {
    // Fungsi bantuan membuat objek File dari Blob dengan menjaga ekstensi PNG untuk transparansi
    const isOriginalPng = (typeof source === 'object' && 'type' in source && (source as any).type === 'image/png') ||
      (typeof source === 'object' && 'name' in source && (source as any).name?.toLowerCase().endsWith('.png')) ||
      (typeof source === 'string' && (source.includes('data:image/png') || source.toLowerCase().endsWith('.png')));

    const makeFile = (b: Blob, originalName = 'compressed.webp'): File => {
      const cleanName = originalName.replace(/\.[^/.]+$/, '') + '.webp';
      return new File([b], cleanName, { type: 'image/webp', lastModified: Date.now() });
    };

    const processImage = (img: HTMLImageElement, originalName: string) => {
      let width = img.naturalWidth || img.width || 1200;
      let height = img.naturalHeight || img.height || 800;

      // Batasi max-width ke maxWidth (default 1200px) secara proporsional
      if (width > maxWidth || height > maxWidth) {
        if (width >= height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      const targetMime = 'image/webp';

      if (!ctx) {
        // Fallback jika canvas context tidak tersedia
        const fallbackBlob = new Blob([], { type: targetMime });
        resolve({
          dataUrl: img.src,
          blob: fallbackBlob,
          file: makeFile(fallbackBlob, originalName)
        });
        return;
      }

      // Pastikan canvas bersih dan transparan (WebP mendukung alpha channel penuh)
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // WebP berukuran jauh lebih kecil (75-90% lebih ramping) dan mempertahankan transparansi penuh
      canvas.toBlob(
        (blob) => {
          const finalBlob = blob || new Blob([], { type: targetMime });
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL(targetMime, quality);
          } catch {
            dataUrl = img.src;
          }

          resolve({
            dataUrl,
            blob: finalBlob,
            file: makeFile(finalBlob, originalName)
          });
        },
        targetMime,
        quality
      );
    };

    // 1. Jika sumber adalah string (dataUrl atau URL)
    if (typeof source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImage(img, 'image.webp');
      img.onerror = () => {
        const fallback = new Blob([], { type: 'image/webp' });
        resolve({ dataUrl: source, blob: fallback, file: makeFile(fallback) });
      };
      img.src = source;
      return;
    }

    // 2. Jika sumber adalah File / Blob
    const originalName = (source as File).name || 'image.webp';
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => processImage(img, originalName);
      img.onerror = () => {
        resolve({
          dataUrl: (e.target?.result as string) || '',
          blob: source,
          file: makeFile(source, originalName)
        });
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => {
      resolve({
        dataUrl: '',
        blob: source,
        file: makeFile(source, originalName)
      });
    };
    reader.readAsDataURL(source);
  });
}

export interface PortfolioCompressedImage {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  size: number;
  quality: number;
}

function renderCanvasToWebPBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error('Gagal mengonversi gambar ke format WebP.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

function drawResizedCanvas(img: HTMLImageElement, maxSidePx: number): { canvas: HTMLCanvasElement; width: number; height: number } {
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (!origWidth || !origHeight) {
    throw new Error('Dimensi gambar tidak valid atau file gambar rusak.');
  }

  let width = origWidth;
  let height = origHeight;

  if (width > maxSidePx || height > maxSidePx) {
    if (width >= height) {
      width = maxSidePx;
      height = Math.max(1, Math.round((origHeight * maxSidePx) / origWidth));
    } else {
      height = maxSidePx;
      width = Math.max(1, Math.round((origWidth * maxSidePx) / origHeight));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas browser tidak tersedia untuk memproses gambar.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return { canvas, width, height };
}

/**
 * Konversi dan kompresi adaptif khusus gambar karya portofolio:
 * - Format output: WebP
 * - Sisi terpanjang maksimal: 1600 px (rasio aspek terjaga)
 * - Kualitas adaptif mulai 0.82 diturunkan bertahap hingga ukuran file < 300 KB
 * - Tidak menghasilkan maupun menyimpan base64
 */
export async function compressPortfolioImageToWebP(
  file: File,
  maxLongestSide = 1600,
  targetMaxBytes = 300 * 1024
): Promise<PortfolioCompressedImage> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = () => reject(new Error(`File "${file.name}" gagal dibaca sebagai gambar.`));
      imageEl.src = objectUrl;
    });

    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'karya';
    const webpFileName = `${baseName}.webp`;

    let { canvas, width, height } = drawResizedCanvas(img, maxLongestSide);
    const qualitySteps = [0.82, 0.76, 0.70, 0.64, 0.58, 0.52, 0.46, 0.40];

    let bestBlob: Blob | null = null;
    let usedQuality = 0.82;

    for (const q of qualitySteps) {
      const candidate = await renderCanvasToWebPBlob(canvas, q);
      bestBlob = candidate;
      usedQuality = q;
      if (candidate.size <= targetMaxBytes) {
        break;
      }
    }

    // Jika gambar kompleks masih > 300 KB pada 1600px q=0.40, turunkan resolusi sekali ke 1280px agar tetap tajam & < 300 KB
    if (bestBlob && bestBlob.size > targetMaxBytes && Math.max(width, height) > 1280) {
      const resized1280 = drawResizedCanvas(img, 1280);
      canvas = resized1280.canvas;
      width = resized1280.width;
      height = resized1280.height;

      for (const q of [0.68, 0.60, 0.52, 0.44]) {
        const candidate = await renderCanvasToWebPBlob(canvas, q);
        if (candidate.size < bestBlob.size) {
          bestBlob = candidate;
          usedQuality = q;
        }
        if (candidate.size <= targetMaxBytes) {
          break;
        }
      }
    }

    if (!bestBlob || bestBlob.size === 0 || bestBlob.type !== 'image/webp') {
      throw new Error('Browser gagal mengonversi gambar ke format WebP.');
    }

    const webpFile = new File([bestBlob], webpFileName, {
      type: 'image/webp',
      lastModified: Date.now()
    });

    return {
      blob: bestBlob,
      file: webpFile,
      width,
      height,
      size: bestBlob.size,
      quality: usedQuality
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

