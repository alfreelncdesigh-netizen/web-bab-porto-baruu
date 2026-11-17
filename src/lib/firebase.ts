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

function isBrowserOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    disableNetwork(db).catch(() => {});
  });

  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {});
  });
}

let inFlightConnectionTest: Promise<boolean> | null = null;

/**
 * Validasi dan uji koneksi Firestore ke server cloud tanpa memblokir SDK dengan disableNetwork
 */
export async function testConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isBrowserOffline()) return false;

  if (inFlightConnectionTest) {
    return inFlightConnectionTest;
  }

  inFlightConnectionTest = (async () => {
    try {
      await enableNetwork(db).catch(() => {});
      await Promise.race([
        getDocFromServer(doc(db, 'test', 'connection')),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Koneksi Firestore timeout')), 6000))
      ]);
      return true;
    } catch (error) {
      console.warn('Firestore connection check notice:', error instanceof Error ? error.message : String(error || ''));
      return false;
    } finally {
      setTimeout(() => {
        inFlightConnectionTest = null;
      }, 2000);
    }
  })();

  return inFlightConnectionTest;
}

// Uji koneksi hanya dipanggil secara eksplisit saat diperlukan agar tidak menambah pembacaan Firestore saat startup

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
      const clientId = (firebaseConfig as any).oAuthClientId;
      if (!clientId) {
        isSigningIn = false;
        reject(new Error("oAuthClientId belum dikonfigurasi pada firebase-applet-config.json"));
        return;
      }
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
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
