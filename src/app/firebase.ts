import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.config';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

/** Shared Firestore handle (initialised once). */
export function getDb(): Firestore {
  if (!db) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
  return db;
}
