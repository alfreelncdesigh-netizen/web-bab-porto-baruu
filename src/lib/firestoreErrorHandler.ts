import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const QUOTA_COOLDOWN_MS = 30 * 60 * 1000; // 30 menit atau hingga berganti hari UTC
const UNREACHABLE_COOLDOWN_MS = 2 * 60 * 1000; // 2 menit jeda koneksi ulang jika jaringan tidak merespons

export function markQuotaExhausted(): void {
  if (typeof window !== 'undefined') {
    try {
      const todayUtc = new Date().toISOString().slice(0, 10);
      localStorage.setItem('firestore_quota_exhausted', 'true');
      localStorage.setItem('firestore_quota_exhausted_time', String(Date.now()));
      localStorage.setItem('firestore_quota_exhausted_day', todayUtc);
      sessionStorage.setItem('firestore_quota_exhausted', 'true');
      sessionStorage.setItem('firestore_quota_exhausted_time', String(Date.now()));
      sessionStorage.setItem('firestore_quota_exhausted_day', todayUtc);
      window.dispatchEvent(new CustomEvent('firestore_quota_exceeded'));
    } catch {}
  }
}

export function markBackendUnreachable(): void {
  if (typeof window !== 'undefined') {
    try {
      const until = String(Date.now() + UNREACHABLE_COOLDOWN_MS);
      sessionStorage.setItem('firestore_backend_unreachable_until', until);
      window.dispatchEvent(new CustomEvent('firestore_network_offline'));
    } catch {}
  }
}

export function clearQuotaStatus(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('firestore_quota_exhausted');
      localStorage.removeItem('firestore_quota_exhausted_time');
      localStorage.removeItem('firestore_quota_exhausted_day');
      sessionStorage.removeItem('firestore_quota_exhausted');
      sessionStorage.removeItem('firestore_quota_exhausted_time');
      sessionStorage.removeItem('firestore_quota_exhausted_day');
      sessionStorage.removeItem('firestore_backend_unreachable_until');
    } catch {}
  }
}

export function isQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Jika backend sedang dalam masa tunggu koneksi gagal singkat, jangan paksakan koneksi baru
    const unreachableUntil = Number(sessionStorage.getItem('firestore_backend_unreachable_until') || 0);
    if (unreachableUntil > Date.now()) {
      return true;
    }

    const val = localStorage.getItem('firestore_quota_exhausted') || sessionStorage.getItem('firestore_quota_exhausted');
    if (!val) return false;

    const savedDay = localStorage.getItem('firestore_quota_exhausted_day') || sessionStorage.getItem('firestore_quota_exhausted_day');
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (savedDay && savedDay !== todayUtc) {
      clearQuotaStatus();
      return false;
    }

    const time = Number(localStorage.getItem('firestore_quota_exhausted_time') || sessionStorage.getItem('firestore_quota_exhausted_time') || 0);
    if (Date.now() - time > QUOTA_COOLDOWN_MS) {
      clearQuotaStatus();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units') ||
    msg.includes('quota metric') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('Too Many Requests') ||
    (error as any)?.code === 'resource-exhausted' ||
    (error as any)?.status === 429
  );
}

export function isConnectivityError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  const code = (error as any)?.code;
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes("Backend didn't respond") ||
    msg.includes('the client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('timeout')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaError(error)) {
    markQuotaExhausted();
  } else if (isConnectivityError(error)) {
    markBackendUnreachable();
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function logFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  if (isQuotaError(error)) {
    markQuotaExhausted();
    console.warn('Notice: Firestore Daily Quota exceeded. Operating seamlessly in local & server storage mode.');
    return;
  }

  if (isConnectivityError(error)) {
    markBackendUnreachable();
    console.warn('Notice: Cloud Firestore unreachable/offline. Operating seamlessly in local & server storage mode.');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}
