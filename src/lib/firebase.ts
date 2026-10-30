import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  doc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, browserLocalPersistence, inMemoryPersistence, browserPopupRedirectResolver, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = (firebaseConfig as any).firestoreDatabaseId;

let dbInstance;
try {
  // Utamakan persistent local cache (IndexedDB) untuk pemuatan data instan tanpa delay jaringan
  const cacheSettings = typeof window !== 'undefined'
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache();

  dbInstance = dbId 
    ? initializeFirestore(app, { 
        localCache: cacheSettings,
        experimentalForceLongPolling: true 
      }, dbId) 
    : initializeFirestore(app, { 
        localCache: cacheSettings,
        experimentalForceLongPolling: true 
      });
} catch (e) {
  try {
    dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  } catch (e2) {
    dbInstance = getFirestore(app);
  }
}
export const db = dbInstance;

/**
 * Validasi dan uji koneksi Firestore ke server cloud dengan timeout aman
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const snap = await Promise.race([
        getDoc(doc(db, 'stats', 'views')),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      ]);
      return snap ? snap.exists() : false;
    }
  } catch (error) {
    // Berjalan aman dengan local cache tanpa melempar error unhandled
    return false;
  }
  return false;
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

export const storage = getStorage(app);
storage.maxUploadRetryTime = 5000;
storage.maxOperationRetryTime = 5000;

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
