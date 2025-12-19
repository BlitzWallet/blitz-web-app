import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import fetchBackend from "./handleBackend";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

let initializationPromise = null;
let lastInitializedKey = null;

export async function initializeFirebase(publicKey, privateKey) {
  const cacheKey = publicKey;
  try {
    if (initializationPromise && lastInitializedKey === cacheKey) {
      console.log("Reusing existing initialization promise");
      return initializationPromise;
    }

    if (lastInitializedKey !== cacheKey) {
      initializationPromise = null;
    }

    lastInitializedKey = cacheKey;

    initializationPromise = (async () => {
      try {
        // Initialize App Check first
        // Sign in anonymously;
        if (import.meta.env.MODE === "development") {
          connectFunctionsEmulator(functions, "localhost", 5001);
        }

        const currentUser = auth.currentUser;
        console.log("current auth", {
          currentUser,
          publicKey,
        });

        if (currentUser && currentUser?.uid === publicKey) {
          return currentUser;
        }

        await signInAnonymously(auth);
        const isSignedIn = auth.currentUser;
        console.log(isSignedIn.uid, "signed in");
        const token = await fetchBackend(
          "customToken",
          { userAuth: isSignedIn?.uid },
          privateKey,
          publicKey
        );
        if (!token)
          throw new Error("Not able to get custom token from backend");
        console.log("custom sign in token from backend", token);
        await auth.signOut();

        const customSignIn = await signInWithCustomToken(auth, token);
        console.log("custom sign in user id", customSignIn.user);
        return customSignIn;
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        // Clear the cache on error so the next call can retry
        initializationPromise = null;
        lastInitializedKey = null;
        throw new Error(String(error.message));
      }
    })();
    return initializationPromise;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    throw new Error(String(error.message));
  }
}
export default app;
