/**
 * Firestore Snapshot Cache Bridge
 * Sinkronisasi snapshot realtime Firestore dengan Service Worker Cache & IndexedDB/LocalStorage
 * untuk rendering 0-milidetik dan akses penuh saat offline.
 */

export interface CachedSnapshotPayload<T> {
  collection: string;
  items: T[];
  cachedAt: string;
  fromServiceWorker?: boolean;
}

/**
 * Membersihkan cache lama di LocalStorage jika kuota browser hampir penuh
 */
export function pruneLocalStorageOnQuotaExceeded(): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Hapus snapshot duplikat lama dari LocalStorage (SW CacheStorage sudah menyimpannya)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firestore_cache_') || key.startsWith('trans_cache_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    // 2. Bersihkan payload base64 berat dari media links
    const mediaLinksRaw = localStorage.getItem('uploaded_media_links');
    if (mediaLinksRaw) {
      try {
        const list = JSON.parse(mediaLinksRaw);
        if (Array.isArray(list)) {
          const trimmed = list.slice(0, 30).map((item: any) => {
            const { dataUrl, ...rest } = item;
            return rest;
          });
          localStorage.setItem('uploaded_media_links', JSON.stringify(trimmed));
        }
      } catch {}
    }
  } catch {}
}

/**
 * Menyimpan snapshot Firestore ke Service Worker Cache dan LocalStorage secara aman tanpa melebihi kuota
 */
export function syncFirestoreSnapshotToSW<T>(collectionName: string, items: T[]): void {
  if (typeof window === 'undefined' || !collectionName || !Array.isArray(items)) return;

  // Sanitasi payload: buang string base64 raksasa agar tidak membebani batas kuota LocalStorage (5MB)
  const sanitizedItems = items.map((item: any) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    if (typeof copy.dataUrl === 'string' && copy.dataUrl.length > 5000) {
      delete copy.dataUrl;
    }
    if (typeof copy.image === 'string' && copy.image.startsWith('data:') && copy.image.length > 50000) {
      copy.image = '';
    }
    if (typeof copy.collaborationLogo === 'string' && copy.collaborationLogo.startsWith('data:') && copy.collaborationLogo.length > 50000) {
      copy.collaborationLogo = '';
    }
    if (typeof copy.heroImageDataUrl === 'string' && copy.heroImageDataUrl.length > 5000) {
      delete copy.heroImageDataUrl;
    }
    if (Array.isArray(copy.images)) {
      copy.images = copy.images.filter((u: any) => typeof u === 'string' && (!u.startsWith('data:') || u.length <= 50000));
    }
    return copy;
  });

  const payload = {
    collectionName,
    items: sanitizedItems,
    timestamp: new Date().toISOString()
  };

  // 1. Simpan ke LocalStorage untuk akses sinkron instan dengan proteksi kuota otomatis
  try {
    localStorage.setItem(`firestore_cache_${collectionName}`, JSON.stringify(payload));
  } catch (err: any) {
    const isQuotaErr = err?.name === 'QuotaExceededError' || 
                       err?.code === 22 || 
                       err?.number === -2147024882 ||
                       String(err).includes('quota') ||
                       String(err).includes('Quota');

    if (isQuotaErr) {
      pruneLocalStorageOnQuotaExceeded();
      try {
        // Coba simpan kembali subset ringkas (maks 25 item terbaru)
        localStorage.setItem(`firestore_cache_${collectionName}`, JSON.stringify({
          collectionName,
          items: sanitizedItems.slice(0, 25),
          timestamp: new Date().toISOString()
        }));
      } catch {
        // Jika LocalStorage masih penuh, abaikan secara senyap; Service Worker CacheStorage menangani cache penuh
      }
    }
  }

  // 2. Kirim pesan ke Service Worker untuk disimpan di CacheStorage 'portfolio-firestore-snapshots-v2' (Kapasitas ratusan MB)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_FIRESTORE_SNAPSHOT',
        payload
      });
    } catch {}
  }
}

/**
 * Mengambil snapshot Firestore yang tersimpan dari Service Worker Cache atau LocalStorage
 */
export async function getCachedFirestoreSnapshot<T>(collectionName: string): Promise<T[] | null> {
  if (typeof window === 'undefined' || !collectionName) return null;

  // 1. Coba ambil dari Service Worker Cache API
  if ('caches' in window) {
    try {
      const cache = await caches.open('portfolio-firestore-snapshots-v2');
      const targetUrl = new URL(`/api/firestore-snapshot/${collectionName}`, window.location.origin).href;
      const cachedResponse = await cache.match(targetUrl);
      if (cachedResponse) {
        const data: CachedSnapshotPayload<T> = await cachedResponse.json();
        if (data && Array.isArray(data.items)) {
          return data.items;
        }
      }
    } catch {
      // Fallback ke langkah berikutnya jika CacheStorage belum siap
    }
  }

  // 2. Fallback instan ke LocalStorage
  try {
    const raw = localStorage.getItem(`firestore_cache_${collectionName}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items as T[];
      }
    }
  } catch {}

  return null;
}
