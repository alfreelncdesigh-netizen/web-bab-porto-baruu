import { QuickFilterItem } from '../types/quickFilter';
import { initialQuickFilterItems } from '../data/quickFilterData';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { logFirestoreError, OperationType, isQuotaExhausted } from './firestoreErrorHandler';

const STORAGE_KEY = 'quick_filter_items_data';

export function cleanQuickFilterItems(items: any[]): QuickFilterItem[] {
  if (!Array.isArray(items)) return initialQuickFilterItems;
  const seen = new Set<string>();
  const cleaned: QuickFilterItem[] = [];

  for (const item of items) {
    if (!item) continue;
    const id = String(item.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    cleaned.push({
      id,
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim(),
      category: String(item.category || 'Tren Desain').trim(),
      images: Array.isArray(item.images) 
        ? item.images.map((img: any) => String(img || '').trim()).filter((url: string) => url.length > 0)
        : (typeof item.image === 'string' && item.image.trim() ? [item.image.trim()] : []),
      tags: Array.isArray(item.tags) ? item.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
      order: typeof item.order === 'number' ? item.order : 0,
      published: item.published !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    });
  }

  // Sort by order ascending, then by updatedAt descending
  return cleaned.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function getStoredQuickFilterItems(): QuickFilterItem[] {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return cleanQuickFilterItems(parsed);
        }
      }
    }
  } catch (e) {
    console.warn('Error reading quick filter local storage:', e);
  }
  return initialQuickFilterItems;
}

export function saveStoredQuickFilterItems(items: QuickFilterItem[]): void {
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
    fetch('/api/quick-filter', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(cleaned)
    }).catch(() => {});
  } catch {}
}

export async function saveQuickFilterItemToFirestore(item: QuickFilterItem): Promise<boolean> {
  const cleanedItem: QuickFilterItem = {
    ...item,
    id: item.id || `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    updatedAt: new Date().toISOString(),
    createdAt: item.createdAt || new Date().toISOString()
  };

  // 1. Update local & dispatch
  const current = getStoredQuickFilterItems();
  const existingIdx = current.findIndex(q => q.id === cleanedItem.id);
  const updated = [...current];
  if (existingIdx >= 0) {
    updated[existingIdx] = cleanedItem;
  } else {
    updated.push(cleanedItem);
  }
  saveStoredQuickFilterItems(updated);

  // 2. Persist to Firestore
  if (!isQuotaExhausted()) {
    try {
      const docRef = doc(db, 'quickFilterQA', cleanedItem.id);
      await setDoc(docRef, {
        ...cleanedItem,
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      }, { merge: true });
      return true;
    } catch (err) {
      logFirestoreError(err, OperationType.UPDATE, `quickFilterQA/${cleanedItem.id}`);
      return false;
    }
  }
  return true;
}

export async function deleteQuickFilterItemFromFirestore(id: string): Promise<boolean> {
  // 1. Update local & dispatch
  const current = getStoredQuickFilterItems();
  const filtered = current.filter(q => q.id !== id);
  saveStoredQuickFilterItems(filtered);

  // 2. Delete from Firestore
  if (!isQuotaExhausted()) {
    try {
      const docRef = doc(db, 'quickFilterQA', id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      logFirestoreError(err, OperationType.DELETE, `quickFilterQA/${id}`);
      return false;
    }
  }
  return true;
}
