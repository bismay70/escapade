"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { travelApi } from "@/lib/travel";

type FirebaseApp = object;

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type FirebaseAuth = {
  signInWithPopup: (provider: FirebaseGoogleAuthProvider) => Promise<{ user: { getIdToken: (forceRefresh?: boolean) => Promise<string> } | null }>;
  setPersistence: (persistence: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type FirebaseGoogleAuthProvider = object;

type FirebaseNamespace = {
  apps: FirebaseApp[];
  app: () => FirebaseApp;
  initializeApp: (config: FirebaseConfig) => FirebaseApp;
  auth: {
    (app?: FirebaseApp): FirebaseAuth;
    GoogleAuthProvider: new () => FirebaseGoogleAuthProvider;
    Auth: { Persistence: { NONE: string } };
  };
};

declare global {
  interface Window {
    firebase?: FirebaseNamespace;
  }
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setLoading(true);

      if ([firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, firebaseConfig.appId].some((value) => !value)) {
        throw new Error("Firebase configuration is missing. Add your NEXT_PUBLIC_FIREBASE_* values to .env.local.");
      }

      const firebase = window.firebase;
      if (!firebase) {
        throw new Error("Firebase is still loading. Please try again.");
      }

      const app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(firebaseConfig);
      const provider = new firebase.auth.GoogleAuthProvider();
      const auth = firebase.auth(app);
      await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
      const result = await auth.signInWithPopup(provider);
      if (!result.user) throw new Error("Google did not return a user. Please try again.");
      const idToken = await result.user.getIdToken(true);
      await travelApi("auth/session", { method: "POST", body: JSON.stringify({ id_token: idToken }) });
      await auth.signOut().catch(() => undefined);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next === "/bookings" ? "/bookings" : "/planner");
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#10213E] lg:grid lg:grid-cols-2">
      <Script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js" strategy="afterInteractive" onReady={() => setAppReady(true)} onError={() => setError("The sign-in library could not load. Check your connection and reload.")} />
      {appReady && <Script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js" strategy="afterInteractive" onReady={() => setFirebaseReady(true)} onError={() => setError("The sign-in library could not load. Check your connection and reload.")} />}

      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image
          src="/about/img/italy.jpg"
          alt="Italian coastal destination"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#071A33]/45" />
        <div className="absolute inset-x-12 bottom-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-100">Vacanes</p>
          <h1 className="mt-3 max-w-md text-5xl leading-tight">Your next journey starts here.</h1>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/home" className="text-xl font-gilroy-bold tracking-wide text-[#10213E]">
            Vacanes
          </Link>

          <div className="mt-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#1D4ED8]">Welcome</p>
            <h2 className="mt-3 text-4xl leading-tight text-[#10213E] sm:text-5xl">Sign in to continue.</h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-600">
              Save your travel preferences and manage bookings with your Google account. You can explore the planner as a guest.
            </p>
          </div>

          {error && (
            <p role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !firebaseReady}
            className="mt-10 flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-5 text-base font-semibold text-[#10213E] transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "Authenticating..." : !firebaseReady ? "Loading sign-in..." : "Continue with Google"}
          </button>
          <Link href="/planner" className="mt-5 block text-center text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">Continue to the planner as a guest</Link>
        </div>
      </section>
    </main>
  );
}
