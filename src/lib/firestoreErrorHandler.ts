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

export function markQuotaExhausted(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('firestore_quota_exhausted', 'true');
      localStorage.setItem('firestore_quota_exhausted_time', String(Date.now()));
      sessionStorage.setItem('firestore_quota_exhausted', 'true');
      sessionStorage.setItem('firestore_quota_exhausted_time', String(Date.now()));
      window.dispatchEvent(new CustomEvent('firestore_quota_exceeded'));
    } catch {}
  }
}

export function isQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem('firestore_quota_exhausted') || sessionStorage.getItem('firestore_quota_exhausted');
    if (!val) return false;
    const time = Number(localStorage.getItem('firestore_quota_exhausted_time') || sessionStorage.getItem('firestore_quota_exhausted_time') || 0);
    // Quota resets daily (~12 to 24 jam)
    if (Date.now() - time > 12 * 3600 * 1000) {
      localStorage.removeItem('firestore_quota_exhausted');
      localStorage.removeItem('firestore_quota_exhausted_time');
      sessionStorage.removeItem('firestore_quota_exhausted');
      sessionStorage.removeItem('firestore_quota_exhausted_time');
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
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units') ||
    msg.includes('quota metric') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    (error as any)?.code === 'resource-exhausted'
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaError(error)) {
    markQuotaExhausted();
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
    console.warn('Notice: Firestore Daily Write Quota exceeded. Operating seamlessly in resilient local & server storage mode.');
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
