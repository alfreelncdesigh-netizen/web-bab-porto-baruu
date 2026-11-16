import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache,
  doc,
  getDocFromServer,
  disableNetwork,
  enableNetwork,
  setLogLevel
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Matikan log warning non-fatal agar konsol bersih
if (typeof window !== 'undefined') {
  try {
    setLogLevel('error');
  } catch (e) {}
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = (firebaseConfig as any).firestoreDatabaseId;

let dbInstance;
try {
  // Gunakan memoryLocalCache + experimentalForceLongPolling agar koneksi stabil di iframe/proxy
  const firestoreSettings = { 
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true
  };

  dbInstance = dbId 
    ? initializeFirestore(app, firestoreSettings, dbId) 
    : initializeFirestore(app, firestoreSettings);
} catch (e) {
  try {
    dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  } catch (e2) {
    dbInstance = getFirestore(app);
  }
}
export const db = dbInstance;

function isLocalFirestoreBlocked(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  try {
    const unreachableUntil = Number(sessionStorage.getItem('firestore_backend_unreachable_until') || 0);
    if (unreachableUntil > Date.now()) return true;

    const val = localStorage.getItem('firestore_quota_exhausted') || sessionStorage.getItem('firestore_quota_exhausted');
    if (!val) return false;

    const savedDay = localStorage.getItem('firestore_quota_exhausted_day') || sessionStorage.getItem('firestore_quota_exhausted_day');
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (savedDay && savedDay !== todayUtc) return false;

    const time = Number(localStorage.getItem('firestore_quota_exhausted_time') || sessionStorage.getItem('firestore_quota_exhausted_time') || 0);
    return Date.now() - time <= 30 * 60 * 1000;
  } catch {
    return false;
  }
}

function setQuotaExhaustedFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const now = String(Date.now());
    localStorage.setItem('firestore_quota_exhausted', 'true');
    localStorage.setItem('firestore_quota_exhausted_time', now);
    localStorage.setItem('firestore_quota_exhausted_day', todayUtc);
    sessionStorage.setItem('firestore_quota_exhausted', 'true');
    sessionStorage.setItem('firestore_quota_exhausted_time', now);
    sessionStorage.setItem('firestore_quota_exhausted_day', todayUtc);
    window.dispatchEvent(new CustomEvent('firestore_quota_exceeded'));
  } catch {}
}

function setUnreachableCooldownFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('firestore_backend_unreachable_until', String(Date.now() + 2 * 60 * 1000));
    window.dispatchEvent(new CustomEvent('firestore_network_offline'));
  } catch {}
}

if (typeof window !== 'undefined') {
  if (isLocalFirestoreBlocked()) {
    disableNetwork(db).catch(() => {});
  }

  window.addEventListener('firestore_quota_exceeded', () => {
    disableNetwork(db).catch(() => {});
  });

  window.addEventListener('firestore_network_offline', () => {
    disableNetwork(db).catch(() => {});
  });

  window.addEventListener('offline', () => {
    disableNetwork(db).catch(() => {});
  });

  window.addEventListener('online', () => {
    if (!isLocalFirestoreBlocked()) {
      enableNetwork(db).catch(() => {});
    }
  });
}

let inFlightConnectionTest: Promise<boolean> | null = null;

/**
 * Validasi dan uji koneksi Firestore ke server cloud sesuai pedoman Firebase Skill
 */
export async function testConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (isLocalFirestoreBlocked()) {
    await disableNetwork(db).catch(() => {});
    return false;
  }

  if (inFlightConnectionTest) {
    return inFlightConnectionTest;
  }

  inFlightConnectionTest = (async () => {
    try {
      await Promise.race([
        getDocFromServer(doc(db, 'test', 'connection')),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
      ]);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error || '');
      const isQuota =
        msg.includes('Quota') ||
        msg.includes('resource-exhausted') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('429');

      if (isQuota) {
        setQuotaExhaustedFlags();
      } else {
        setUnreachableCooldownFlags();
      }

      // Hentikan loop retry 10 detik SDK Firestore agar aplikasi langsung berjalan mulus via server disk & cache lokal
      await disableNetwork(db).catch(() => {});
      console.warn('Firebase status: running in resilient local & server storage mode.');
      return false;
    } finally {
      setTimeout(() => {
        inFlightConnectionTest = null;
      }, 2000);
    }
  })();

  return inFlightConnectionTest;
}

// Uji koneksi saat startup tanpa memblokir thread
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 150);
}

let authInstance;
try {
  authInstance = initializeAuth(app, { 
    persistence: browserLocalPersistence, 
    popupRedirectResolver: browserPopupRedirectResolver 
  });
} catch (e) {
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const storage = getStorage(app, (firebaseConfig as any).storageBucket || undefined);
storage.maxUploadRetryTime = 60000;
storage.maxOperationRetryTime = 60000;

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.activity');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');
provider.addScope('https://www.googleapis.com/auth/drive.metadata');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ accessToken: string } | null> => {
  return new Promise((resolve, reject) => {
    try {
      isSigningIn = true;
      if (!(window as any).google?.accounts?.oauth2) {
        isSigningIn = false;
        reject(new Error("Google Identity Services belum siap atau diblokir"));
        return;
      }
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: (firebaseConfig as any).oAuthClientId || "661057751649-294hn0suj3rkiqqtnn6nbpcqbpij00aj.apps.googleusercontent.com",
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.activity',
        callback: (response: any) => {
          isSigningIn = false;
          if (response.error !== undefined) {
            console.warn('GSI Error:', response.error);
            reject(response.error);
          } else {
            cachedAccessToken = response.access_token;
            try {
              const credential = GoogleAuthProvider.credential(null, response.access_token);
              signInWithCredential(auth, credential).catch(() => {});
            } catch (credErr) {
              // Ignore credential conversion if not needed
            }
            resolve({ accessToken: response.access_token });
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      isSigningIn = false;
      reject(err);
    }
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const ensureFreshAuthToken = async (): Promise<string | null> => {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken(true);
    }
  } catch (err) {
    console.warn("Auth token refresh warning:", err);
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
