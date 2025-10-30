'use client';

import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from './non-blocking-login';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const publicPaths = ['/login'];

// A component to handle the authentication logic and conditional rendering
function AuthGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) return; // Wait for user to be loaded

    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      // If no user and not a public path, it might be the initial anonymous sign-in process.
      // The provider will show a loader until a user (even anonymous) is available.
      // If the user is truly logged out and trying to access a protected page, they will be redirected.
      router.push('/login');
    } else if (user && !user.isAnonymous && isPublicPath) {
      // If logged in user (not anon) is on a public path (like login), redirect to dashboard
      router.push('/');
    }
  }, [user, isUserLoading, router, pathname]);
  
  const isPublicPath = publicPaths.includes(pathname);

  // Show a global loader while the auth state is being determined.
  // Or if we are on a protected route and don't have a user yet (including anonymous).
  if (isUserLoading || (!user && !isPublicPath)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  // If a logged-in user hits a public page, show a redirecting message.
  if (user && !user.isAnonymous && isPublicPath) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Once a user (anonymous or authenticated) is available, render the children.
  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []);

  useEffect(() => {
    const auth = getAuth(firebaseServices.firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // If there's no user, sign in anonymously. This allows public read access.
        initiateAnonymousSignIn(auth);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [firebaseServices.firebaseApp]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthGate>{children}</AuthGate>
    </FirebaseProvider>
  );
}
