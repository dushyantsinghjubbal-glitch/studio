'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';

/** Initiate anonymous sign-in. */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<UserCredential> {
  return await signInAnonymously(authInstance);
}

/** Initiate email/password sign-up. */
export async function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return await createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return await signInWithEmailAndPassword(authInstance, email, password);
}
