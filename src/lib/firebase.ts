import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache,
  doc,
  getDoc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, browserLocalPersistence, inMemoryPersistence, browserPopupRedirectResolver, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
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
  // Gunakan memoryLocalCache agar mutasi tidak menumpuk di storage lokal
  const firestoreSettings = { 
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true
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

/**
 * Validasi dan uji koneksi Firestore ke server cloud sesuai pedoman Firebase Skill
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      await Promise.race([
        getDocFromServer(doc(db, 'test', 'connection')),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      return true;
    }
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('the client is offline') ||
      error.message.includes('Quota') ||
      error.message.includes('resource-exhausted') ||
      error.message.includes('429')
    )) {
      console.warn('Firebase status: running in resilient offline/local cache mode.');
    }
    return false;
  }
  return false;
}

// Uji koneksi saat startup tanpa memblokir thread
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 1000);
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
