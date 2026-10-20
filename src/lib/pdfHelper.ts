/**
 * PDF Helper Utility
 * Mendukung format PDF untuk gambar konten (Portofolio, Banner, Blog, Pengaturan)
 * Mengonversi halaman pertama PDF menjadi gambar WebP/PNG beresolusi tinggi di sisi client,
 * atau mengunggah dokumen PDF secara langsung dengan preview aman.
 */

export async function isPdfFile(file: File | Blob | string): Promise<boolean> {
  if (typeof file === 'string') {
    return file.toLowerCase().includes('.pdf');
  }
  return file.type === 'application/pdf' || (file instanceof File && file.name.toLowerCase().endsWith('.pdf'));
}

export async function renderPdfFirstPageToImage(file: File): Promise<{ blob: Blob; dataUrl: string; name: string } | null> {
  try {
    // 1. Muat PDF.js secara dinamis jika belum ada
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        // Cek jika sudah ada script tag
        if (document.querySelector('script[data-pdfjs]')) {
          const checkInterval = setInterval(() => {
            if ((window as any).pdfjsLib) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Timeout loading PDF.js'));
          }, 5000);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.setAttribute('data-pdfjs', 'true');
        script.onload = () => {
          if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          } else {
            reject(new Error('PDF.js not available'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js'));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Ambil halaman pertama
    const page = await pdf.getPage(1);
    const scale = 2.0; // Render tajam pada skala 2x
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const baseName = file.name.replace(/\.pdf$/i, '');
    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    
    const blob = await new Promise<Blob | null>((res) => {
      canvas.toBlob((b) => res(b), 'image/webp', 0.85);
    });

    if (!blob) return null;

    return {
      blob,
      dataUrl,
      name: `${baseName}_preview.webp`
    };
  } catch (err) {
    console.warn("Konversi PDF ke gambar otomatis dilewati (unggah file PDF langsung):", err);
    return null;
  }
}
