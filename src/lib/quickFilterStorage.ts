import { QuickFilterItem } from '../types/quickFilter';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { logFirestoreError, OperationType } from './firestoreErrorHandler';
import { cleanForFirestore, getTimestampMs } from './contentStorage';

let memoryQuickFilterItems: QuickFilterItem[] = [];

export function cleanQuickFilterItems(items: any[]): QuickFilterItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const cleaned: QuickFilterItem[] = [];

  for (const item of items) {
    if (!item) continue;
    if (item.isArchived === true) continue;
    const id = String(item.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    cleaned.push({
      id,
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim(),
      category: String(item.category || 'Tren Desain').trim(),
      images: Array.isArray(item.images)
        ? item.images.map((img: any) => String(img || '').trim()).filter((url: string) => url.length > 0 && !url.startsWith('blob:') && !url.startsWith('data:'))
        : (typeof item.image === 'string' && item.image.trim() && !item.image.startsWith('blob:') && !item.image.startsWith('data:') ? [item.image.trim()] : []),
      tags: Array.isArray(item.tags) ? item.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
      order: typeof item.order === 'number' ? item.order : 0,
      published: item.published !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    });
  }

  return cleaned.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function mergeQuickFilterItems(...lists: QuickFilterItem[][]): QuickFilterItem[] {
  const map = new Map<string, QuickFilterItem>();

  for (const list of lists) {
    for (const item of list || []) {
      if (!item) continue;
      const id = String(item.id || '').trim();
      if (!id || (item as any).isArchived === true) continue;

      const prev = map.get(id);
      if (!prev) {
        map.set(id, { ...item, id });
      } else {
        const prevTime = Math.max(getTimestampMs(prev.updatedAt), getTimestampMs(prev.createdAt));
        const nextTime = Math.max(getTimestampMs(item.updatedAt), getTimestampMs(item.createdAt));
        const winner = nextTime >= prevTime ? item : prev;
        const loser = winner === item ? prev : item;
        map.set(id, { ...loser, ...winner, id });
      }
    }
  }

  return cleanQuickFilterItems(Array.from(map.values()));
}

export function getStoredQuickFilterItems(): QuickFilterItem[] {
  return memoryQuickFilterItems;
}

export async function saveStoredQuickFilterItems(items: QuickFilterItem[]): Promise<void> {
  const cleaned = cleanQuickFilterItems(items);
  memoryQuickFilterItems = cleaned;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quick_filter_updated', { detail: cleaned }));
  }
}

export async function saveQuickFilterItemToFirestore(item: QuickFilterItem): Promise<boolean> {
  const cleanedItem: QuickFilterItem = {
    ...item,
    id: item.id || `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    updatedAt: new Date().toISOString(),
    createdAt: item.createdAt || new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'quickFilterQA', cleanedItem.id);
    await setDoc(
      docRef,
      cleanForFirestore({
        ...cleanedItem,
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      }),
      { merge: true }
    );

    const existingIdx = memoryQuickFilterItems.findIndex(q => q.id === cleanedItem.id);
    const updated = [...memoryQuickFilterItems];
    if (existingIdx >= 0) {
      updated[existingIdx] = cleanedItem;
    } else {
      updated.push(cleanedItem);
    }
    await saveStoredQuickFilterItems(updated);
    return true;
  } catch (err) {
    logFirestoreError(err, OperationType.UPDATE, `quickFilterQA/${cleanedItem.id}`);
    throw err;
  }
}

export async function deleteQuickFilterItemFromFirestore(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'quickFilterQA', id);
    await deleteDoc(docRef);
    const filtered = memoryQuickFilterItems.filter(q => q.id !== id);
    await saveStoredQuickFilterItems(filtered);
    return true;
  } catch (err) {
    logFirestoreError(err, OperationType.DELETE, `quickFilterQA/${id}`);
    throw err;
  }
}

let hasHydratedQuickFilter = false;
let quickFilterSubActive = false;
const quickFilterCallbacks = new Set<(items: QuickFilterItem[]) => void>();

export function subscribeQuickFilterRealtime(cb?: (items: QuickFilterItem[]) => void): () => void {
  if (cb) {
    quickFilterCallbacks.add(cb);
    if (hasHydratedQuickFilter) {
      try { cb(memoryQuickFilterItems); } catch {}
    }
  }

  if (!quickFilterSubActive && typeof window !== 'undefined') {
    quickFilterSubActive = true;
    onSnapshot(
      collection(db, 'quickFilterQA'),
      (snapshot) => {
        const loaded: QuickFilterItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            question: data.question || '',
            answer: data.answer || '',
            category: data.category || 'Tren Desain',
            images: Array.isArray(data.images) ? data.images : (typeof data.image === 'string' && data.image ? [data.image] : []),
            tags: data.tags || [],
            order: data.order ?? 0,
            published: data.published !== false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });
        const cleaned = cleanQuickFilterItems(loaded);
        hasHydratedQuickFilter = true;
        saveStoredQuickFilterItems(cleaned);
        quickFilterCallbacks.forEach(fn => {
          try { fn(cleaned); } catch {}
        });
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'quickFilterQA');
        hasHydratedQuickFilter = true;
        quickFilterCallbacks.forEach(fn => {
          try { fn(memoryQuickFilterItems); } catch {}
        });
      }
    );
  }

  return () => {
    if (cb) quickFilterCallbacks.delete(cb);
  };
}
