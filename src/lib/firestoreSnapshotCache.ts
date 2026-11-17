/**
 * Firestore Snapshot Cache Bridge (Cloud-First)
 * Penyimpanan snapshot ke localStorage/Service Worker dinonaktifkan agar seluruh
 * perangkat dan browser selalu membaca data langsung dari Cloud Firestore secara konsisten.
 */

export interface CachedSnapshotPayload<T> {
  collection: string;
  items: T[];
  cachedAt: string;
  fromServiceWorker?: boolean;
}

export function pruneLocalStorageOnQuotaExceeded(): void {
  // No-op: dynamic Firestore snapshots are no longer cached in localStorage
}

export function syncFirestoreSnapshotToSW<T>(_collectionName: string, _items: T[]): void {
  // No-op: dynamic Firestore data must come directly from Cloud Firestore
}

export async function getCachedFirestoreSnapshot<T>(_collectionName: string): Promise<T[] | null> {
  return null;
}
