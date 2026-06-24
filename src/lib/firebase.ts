import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

/**
 * Firebase init. Reads config from public env vars (NEXT_PUBLIC_*) so it runs
 * client + server. When keys are missing we surface a sentinel so the UI can
 * show a friendly "connect Firebase" notice instead of crashing.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

/** True when every required config value is present. */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain,
);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let rtdb: Database | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  rtdb = getDatabase(app);
  storage = getStorage(app);

  if (process.env.NEXT_PUBLIC_USE_EMULATOR === "true") {
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
}

export { app, firestore as db, rtdb, storage };
