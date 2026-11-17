import { useState, useMemo, useCallback } from 'react';

const VOLATILE_KEYS = new Set([
  'savedAt',
  'updatedAt',
  'createdAt',
  'dateAdded',
  '_adminAuth',
  'updatedByAdmin',
  'isNew',
  'imageWidth',
  'imageHeight',
]);

function normalizeValue(val: any): any {
  if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
    return null;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (Array.isArray(val)) {
    return val.map(normalizeValue);
  }
  const sorted: Record<string, any> = {};
  const keys = Object.keys(val).sort();
  for (const key of keys) {
    if (VOLATILE_KEYS.has(key)) continue;
    const normalized = normalizeValue(val[key]);
    if (val[key] !== undefined) {
      sorted[key] = normalized;
    }
  }
  return sorted;
}

export function stableSerialize(value: any): string {
  try {
    return JSON.stringify(normalizeValue(value));
  } catch {
    return String(Date.now());
  }
}

/**
 * Hook untuk mengontrol status tombol "Simpan Perubahan" pada seluruh menu Admin:
 * - Saat tombol diklik dan berhasil menyimpan -> panggil markSaved(savedData) -> isSaved = true (tombol disable & bertuliskan "Tersimpan").
 * - Saat ada perubahan apapun (tambah/hapus gambar, ubah teks, toggle, dll) -> currentSerialized !== savedSnapshot -> isSaved = false (tombol aktif kembali).
 */
export function useAdminSaveState<T>(currentState: T) {
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  const currentSerialized = useMemo(
    () => stableSerialize(currentState),
    [currentState]
  );

  const isSaved = savedSnapshot !== null && currentSerialized === savedSnapshot;

  const markSaved = useCallback(
    (overrideState?: T) => {
      const target = overrideState !== undefined ? overrideState : currentState;
      setSavedSnapshot(stableSerialize(target));
    },
    [currentState]
  );

  const resetSaveState = useCallback(() => {
    setSavedSnapshot(null);
  }, []);

  return { isSaved, markSaved, resetSaveState };
}
