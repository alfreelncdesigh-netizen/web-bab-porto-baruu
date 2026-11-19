import { QuickFilterItem } from '../types/quickFilter';
import { getTimestampMs } from './contentStorage';

const ADMIN_AUTH_TOKEN = 'alfreelnc_admin_auth_verified';
const QUICK_FILTER_SNAPSHOT_KEY = 'alfreelnc_json_cache_v1_quick_filter';
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

if (typeof window !== 'undefined') {
  try {
    const rawSnap = window.localStorage.getItem(QUICK_FILTER_SNAPSHOT_KEY);
    if (rawSnap) {
      const parsed = JSON.parse(rawSnap);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryQuickFilterItems = cleanQuickFilterItems(parsed);
      }
    }
  } catch {}
}

export function getStoredQuickFilterItems(): QuickFilterItem[] {
  return memoryQuickFilterItems;
}

export async function saveStoredQuickFilterItems(items: QuickFilterItem[]): Promise<void> {
  const cleaned = cleanQuickFilterItems(items);
  memoryQuickFilterItems = cleaned;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(QUICK_FILTER_SNAPSHOT_KEY, JSON.stringify(cleaned));
    } catch {}
    window.dispatchEvent(new CustomEvent('quick_filter_updated', { detail: cleaned }));
  }
}

let hasHydratedQuickFilter = false;
let quickFilterSubActive = false;
let inFlightQuickFilterFetch: Promise<QuickFilterItem[]> | null = null;
const quickFilterCallbacks = new Set<(items: QuickFilterItem[]) => void>();

export async function fetchQuickFilterFromBlob(): Promise<QuickFilterItem[]> {
  if (inFlightQuickFilterFetch) return inFlightQuickFilterFetch;

  inFlightQuickFilterFetch = (async () => {
    try {
      const res = await fetch('/api/quick-filter', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Gagal memuat Quick Filter (HTTP ${res.status})`);
      }
      const rawItems = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      const cleaned = cleanQuickFilterItems(rawItems);
      hasHydratedQuickFilter = true;
      await saveStoredQuickFilterItems(cleaned);
      quickFilterCallbacks.forEach(fn => {
        try { fn(cleaned); } catch {}
      });
      return cleaned;
    } finally {
      inFlightQuickFilterFetch = null;
    }
  })();

  return inFlightQuickFilterFetch;
}

export async function saveQuickFilterItemToFirestore(item: QuickFilterItem): Promise<boolean> {
  const cleanedItem: QuickFilterItem = {
    ...item,
    id: item.id || `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    updatedAt: new Date().toISOString(),
    createdAt: item.createdAt || new Date().toISOString()
  };

  const res = await fetch('/api/quick-filter', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify({ item: cleanedItem }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Gagal menyimpan wawasan Quick Filter (HTTP ${res.status})`);
  }

  const nextList = cleanQuickFilterItems(Array.isArray(data?.items) ? data.items : [...memoryQuickFilterItems, cleanedItem]);
  hasHydratedQuickFilter = true;
  await saveStoredQuickFilterItems(nextList);
  quickFilterCallbacks.forEach(fn => {
    try { fn(nextList); } catch {}
  });
  return true;
}

export async function deleteQuickFilterItemFromFirestore(id: string): Promise<boolean> {
  const res = await fetch('/api/quick-filter', {
    method: 'DELETE',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_AUTH_TOKEN,
    },
    body: JSON.stringify({ id }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Gagal menghapus wawasan Quick Filter (HTTP ${res.status})`);
  }

  const filtered = cleanQuickFilterItems(
    Array.isArray(data?.items) ? data.items : memoryQuickFilterItems.filter(q => q.id !== id)
  );
  hasHydratedQuickFilter = true;
  await saveStoredQuickFilterItems(filtered);
  quickFilterCallbacks.forEach(fn => {
    try { fn(filtered); } catch {}
  });
  return true;
}

export function subscribeQuickFilterRealtime(cb?: (items: QuickFilterItem[]) => void): () => void {
  if (cb) {
    quickFilterCallbacks.add(cb);
    if (hasHydratedQuickFilter) {
      try { cb(memoryQuickFilterItems); } catch {}
    }
  }

  if (!quickFilterSubActive && typeof window !== 'undefined') {
    quickFilterSubActive = true;
    fetchQuickFilterFromBlob().catch(() => {
      hasHydratedQuickFilter = true;
      quickFilterCallbacks.forEach(fn => {
        try { fn(memoryQuickFilterItems); } catch {}
      });
    });
  }

  return () => {
    if (cb) quickFilterCallbacks.delete(cb);
  };
}
