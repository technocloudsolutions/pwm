import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import serviceAccount from "../../serviceAccount.json";

if (
  !process.env.FIREBASE_PRIVATE_KEY ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PROJECT_ID
) {
  throw new Error("Missing Firebase Admin environment variables");
}

if (!getApps().length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const db = admin.firestore();

export default admin;
