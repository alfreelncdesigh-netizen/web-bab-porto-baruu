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
 * Menyimpan snapshot Firestore ke Service Worker Cache dan LocalStorage
 */
export function syncFirestoreSnapshotToSW<T>(collectionName: string, items: T[]): void {
  if (typeof window === 'undefined' || !collectionName || !Array.isArray(items)) return;

  const payload = {
    collectionName,
    items,
    timestamp: new Date().toISOString()
  };

  // 1. Simpan ke LocalStorage untuk akses sinkron instan
  try {
    localStorage.setItem(`firestore_cache_${collectionName}`, JSON.stringify(payload));
  } catch (err) {
    console.warn(`[SnapshotCache] LocalStorage cache notice for ${collectionName}:`, err);
  }

  // 2. Kirim pesan ke Service Worker untuk disimpan di CacheStorage 'portfolio-firestore-snapshots-v2'
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_FIRESTORE_SNAPSHOT',
        payload
      });
    } catch (swErr) {
      console.warn(`[SnapshotCache] SW message notice for ${collectionName}:`, swErr);
    }
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
