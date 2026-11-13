import { QuickFilterItem } from '../types/quickFilter';
import { initialQuickFilterItems } from '../data/quickFilterData';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { logFirestoreError, OperationType, isQuotaExhausted, isQuotaError, markQuotaExhausted } from './firestoreErrorHandler';
import { cleanForFirestore, getDeletedIds, markDeletedIds, unmarkDeletedIds, getTimestampMs } from './contentStorage';

const STORAGE_KEY = 'quick_filter_items_data';

export function cleanQuickFilterItems(items: any[]): QuickFilterItem[] {
  if (!Array.isArray(items)) return initialQuickFilterItems;
  const seen = new Set<string>();
  const deletedIds = getDeletedIds('quickFilterQA');
  const cleaned: QuickFilterItem[] = [];

  for (const item of items) {
    if (!item) continue;
    if (item.isArchived === true) continue;
    const id = String(item.id || '').trim();
    if (!id || seen.has(id) || deletedIds.has(id)) continue;
    seen.add(id);

    cleaned.push({
      id,
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim(),
      category: String(item.category || 'Tren Desain').trim(),
      images: Array.isArray(item.images) 
        ? item.images.map((img: any) => String(img || '').trim()).filter((url: string) => url.length > 0 && !url.startsWith('blob:'))
        : (typeof item.image === 'string' && item.image.trim() && !item.image.startsWith('blob:') ? [item.image.trim()] : []),
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
  const deletedIds = getDeletedIds('quickFilterQA');
  const map = new Map<string, QuickFilterItem>();

  for (const list of lists) {
    for (const item of list || []) {
      if (!item) continue;
      const id = String(item.id || '').trim();
      if (!id || deletedIds.has(id) || (item as any).isArchived === true) continue;

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
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return cleanQuickFilterItems(parsed);
        }
      }
    }
  } catch (e) {
    console.warn('Error reading quick filter local storage:', e);
  }
  return cleanQuickFilterItems(initialQuickFilterItems);
}

export async function saveStoredQuickFilterItems(items: QuickFilterItem[]): Promise<void> {
  const cleaned = cleanQuickFilterItems(items);
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      window.dispatchEvent(new CustomEvent('quick_filter_updated', { detail: cleaned }));
    }
  } catch (e) {
    console.warn('Error saving quick filter local storage:', e);
  }

  // Sync to server disk storage as backup
  try {
    await fetch('/api/quick-filter', {
      method: 'POST',
      keepalive: true,
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(cleaned)
    });
  } catch {}
}

export async function saveQuickFilterItemToFirestore(item: QuickFilterItem): Promise<boolean> {
  const cleanedItem: QuickFilterItem = {
    ...item,
    id: item.id || `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    updatedAt: new Date().toISOString(),
    createdAt: item.createdAt || new Date().toISOString()
  };

  await unmarkDeletedIds('quickFilterQA', [cleanedItem.id]);

  // 1. Update local & dispatch
  const current = getStoredQuickFilterItems();
  const existingIdx = current.findIndex(q => q.id === cleanedItem.id);
  const updated = [...current];
  if (existingIdx >= 0) {
    updated[existingIdx] = cleanedItem;
  } else {
    updated.push(cleanedItem);
  }
  await saveStoredQuickFilterItems(updated);

  // 2. Persist to Firestore
  if (!isQuotaExhausted()) {
    try {
      const docRef = doc(db, 'quickFilterQA', cleanedItem.id);
      await setDoc(docRef, cleanForFirestore({
        ...cleanedItem,
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      }), { merge: true });
      return true;
    } catch (err) {
      if (isQuotaError(err)) markQuotaExhausted();
      logFirestoreError(err, OperationType.UPDATE, `quickFilterQA/${cleanedItem.id}`);
      return true;
    }
  }
  return true;
}

export async function deleteQuickFilterItemFromFirestore(id: string): Promise<boolean> {
  await markDeletedIds('quickFilterQA', [id]);

  // 1. Update local & dispatch
  const current = getStoredQuickFilterItems();
  const filtered = current.filter(q => q.id !== id);
  await saveStoredQuickFilterItems(filtered);

  // 2. Delete from Firestore
  if (!isQuotaExhausted()) {
    try {
      const docRef = doc(db, 'quickFilterQA', id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      if (isQuotaError(err)) markQuotaExhausted();
      logFirestoreError(err, OperationType.DELETE, `quickFilterQA/${id}`);
      return true;
    }
  }
  return true;
}

