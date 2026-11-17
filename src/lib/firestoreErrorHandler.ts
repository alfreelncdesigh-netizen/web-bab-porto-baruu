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
    window.dispatchEvent(new CustomEvent('firestore_quota_exceeded'));
  }
}

export function markBackendUnreachable(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore_network_offline'));
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
  return false;
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

export function getReadableFirestoreError(error: unknown, fallback = 'Operasi Cloud Firestore gagal.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error.trim();
  const code = (error as any)?.code;
  if (code) return `Firestore error (${code})`;
  return fallback;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  throw new Error(error instanceof Error ? error.message : String(error));
}

const loggedQuotaErrorKeys = new Set<string>();

export function logFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  const quotaHit = isQuotaError(error);
  if (quotaHit) {
    markQuotaExhausted();
    const dedupKey = `${operationType}:${path || ''}`;
    if (loggedQuotaErrorKeys.has(dedupKey)) {
      return;
    }
    loggedQuotaErrorKeys.add(dedupKey);
  } else if (isConnectivityError(error)) {
    markBackendUnreachable();
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
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
  console.error('Firestore Operation Error:', JSON.stringify(errInfo));
}
