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
    // Fungsi bantuan membuat objek File dari Blob
    const makeFile = (b: Blob, originalName = 'compressed.webp'): File => {
      const cleanName = originalName.replace(/\.[^/.]+$/, '') + '.webp';
      return new File([b], cleanName, { type: 'image/webp', lastModified: Date.now() });
    };

    const processImage = (img: HTMLImageElement, originalName: string) => {
      let width = img.naturalWidth || img.width || 1200;
      let height = img.naturalHeight || img.height || 800;

      // Batasi max-width ke 1200px secara proporsional
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

      if (!ctx) {
        // Fallback jika canvas context tidak tersedia
        const fallbackBlob = new Blob([], { type: 'image/webp' });
        resolve({
          dataUrl: img.src,
          blob: fallbackBlob,
          file: makeFile(fallbackBlob, originalName)
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Ekspor ke WebP format dengan kualitas 0.75
      const generateBlob = (targetQuality: number): Promise<{ blob: Blob; dataUrl: string }> => {
        return new Promise((blobResolve) => {
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/webp', targetQuality);
          } catch {
            dataUrl = canvas.toDataURL('image/jpeg', targetQuality);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                blobResolve({ blob, dataUrl });
              } else {
                const fallback = new Blob([], { type: 'image/webp' });
                blobResolve({ blob: fallback, dataUrl });
              }
            },
            'image/webp',
            targetQuality
          );
        });
      };

      // Target di bawah 200 KB (< 204,800 bytes)
      generateBlob(quality).then(async ({ blob, dataUrl }) => {
        const MAX_BYTES = 200 * 1024; // 200 KB

        // Jika ukuran file masih melebihi 200 KB, lakukan optimasi tambahan
        if (blob.size > MAX_BYTES && quality > 0.4) {
          const secondPass = await generateBlob(0.55);
          if (secondPass.blob.size < blob.size) {
            resolve({
              dataUrl: secondPass.dataUrl,
              blob: secondPass.blob,
              file: makeFile(secondPass.blob, originalName)
            });
            return;
          }
        }

        resolve({
          dataUrl,
          blob,
          file: makeFile(blob, originalName)
        });
      });
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
