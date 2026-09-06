import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Construct active configuration dynamically to support environment variable injection during production build
const activeFirebaseConfig = {
  ...firebaseConfig,
  apiKey: process.env.API_KEY || process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  projectId: process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
};

// Dynamically construct authDomain and storageBucket if they aren't fully specified but we have a projectId
if (activeFirebaseConfig.projectId) {
  if (!activeFirebaseConfig.authDomain) {
    activeFirebaseConfig.authDomain = `${activeFirebaseConfig.projectId}.firebaseapp.com`;
  }
  if (!activeFirebaseConfig.storageBucket) {
    activeFirebaseConfig.storageBucket = `${activeFirebaseConfig.projectId}.firebasestorage.app`;
  }
}

const app = !getApps().length ? initializeApp(activeFirebaseConfig) : getApp();

// Mute internal firestore grpc retry noise when free tier quota is exceeded
try {
  setLogLevel('silent');
} catch {}

export const db = getFirestore(app, (activeFirebaseConfig as any).firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
