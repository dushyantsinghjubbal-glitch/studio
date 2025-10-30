'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

let firebaseApp: FirebaseApp;
if (!getApps().length) {
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
} else {
    firebaseApp = getApp();
}

const firestore = getFirestore(firebaseApp);
try {
    enableIndexedDbPersistence(firestore);
} catch (error: any) {
    if (error.code == 'failed-precondition') {
        console.warn('Firestore persistence failed to enable. This is likely due to multiple tabs being open.');
    } else if (error.code == 'unimplemented') {
        console.warn('Firestore persistence is not available in this browser.');
    }
}

const auth = getAuth(firebaseApp);


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore
  };
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './auth-actions';
export * from './errors';
export * from './error-emitter';