import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAttDdtre_zPjXN2olmdhnCh6VTJTRek4U",
  authDomain: "pwma-98aa5.firebaseapp.com",
  projectId: "pwma-98aa5",
  storageBucket: "pwma-98aa5.firebasestorage.app",
  messagingSenderId: "496748942178",
  appId: "1:496748942178:web:fac34a8c20bdcc6f72123b",
  measurementId: "G-Q668NCZNHQ"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize analytics only in browser and production
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw new Error("Failed to initialize Firebase. Please check your configuration.");
}

export { app, auth, db, analytics }; 