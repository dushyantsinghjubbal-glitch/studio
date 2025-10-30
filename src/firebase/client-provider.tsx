'use client';

import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
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
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (isUserLoading) return; // Wait for user to be loaded

    if (!user && !isPublicPath) {
      // If no user and not a public path, redirect to login.
      router.push('/login');
    } else if (user && isPublicPath) {
      // If logged in user is on a public path (like login), redirect to dashboard
      router.push('/');
    }
  }, [user, isUserLoading, router, pathname, isPublicPath]);

  // Show a global loader while auth state is being determined.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  // If we are on a private page and have no user, we are about to redirect.
  // Render a loading state to prevent the page from flashing.
  if (!user && !isPublicPath) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // If a logged-in user hits a public page, show a redirecting message.
  if (user && isPublicPath) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Redirecting...</p>
        </div>
    );
  }

  // Once checks are passed, render the children.
  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []);

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
