import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

function getApp(): FirebaseApp {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getDb(): Firestore {
  if (!db) db = initializeFirestore(getApp(), { ignoreUndefinedProperties: true });
  return db;
}

export function getAuthInstance(): Auth {
  if (!auth) auth = getAuth(getApp());
  return auth;
}
