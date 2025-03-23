import { IPayment } from "@/app/models/payments";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

export type SubscriptionTier = "free" | "premium" | "business";

export interface SubscriptionFeatures {
  maxPasswords: number;
  maxPersonalInfos: number;
  canSharePasswords: boolean;
  hasTeamFeatures: boolean;
  hasActivityLogs: boolean;
  hasCustomFields: boolean;
  hasExport: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  hasPrioritySupport: boolean;
  adminDashboard: boolean;
  hasAdvancedEncryption: boolean;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isSuspended: boolean;
  expiresAt: string | null;
  daysUntilExpiration: number | null;
}

export async function getUserSubscription(
  user: User
): Promise<SubscriptionTier> {
  if (!user) return "free";

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return "free";
    return (userDoc.data().subscription as SubscriptionTier) || "free";
  } catch (error) {
    console.error("Error getting user subscription:", error);
    return "free";
  }
}

export async function getSubscriptionStatus(
  user: User
): Promise<SubscriptionStatus> {
  if (!user) {
    return {
      isActive: true,
      isSuspended: false,
      expiresAt: null,
      daysUntilExpiration: null,
    };
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      return {
        isActive: true,
        isSuspended: false,
        expiresAt: null,
        daysUntilExpiration: null,
      };
    }

    const data = userDoc.data();
    const expiresAt = data.subscriptionExpiresAt;
    const isSuspended = data.isSuspended || false;

    if (!expiresAt) {
      return {
        isActive: !isSuspended,
        isSuspended,
        expiresAt: null,
        daysUntilExpiration: null,
      };
    }

    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isActive = daysUntilExpiration > 0 && !isSuspended;

    return {
      isActive,
      isSuspended,
      expiresAt,
      daysUntilExpiration,
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return {
      isActive: true,
      isSuspended: false,
      expiresAt: null,
      daysUntilExpiration: null,
    };
  }
}

export async function isUserAdmin(user: User): Promise<boolean> {
  if (!user) return false;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return false;
    return userDoc.data().role === "admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export function getSubscriptionFeatures(
  tier: SubscriptionTier
): SubscriptionFeatures {
  switch (tier) {
    case "premium":
      return {
        maxPasswords: Infinity,
        maxPersonalInfos: 50,
        canSharePasswords: true,
        hasTeamFeatures: false,
        hasActivityLogs: true,
        hasCustomFields: true,
        hasExport: true,
        hasApiAccess: false,
        hasCustomBranding: false,
        hasPrioritySupport: true,
        adminDashboard: false,
        hasAdvancedEncryption: true,
      };
    case "business":
      return {
        maxPasswords: Infinity,
        maxPersonalInfos: Infinity,
        canSharePasswords: true,
        hasTeamFeatures: true,
        hasActivityLogs: true,
        hasCustomFields: true,
        hasExport: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        hasPrioritySupport: true,
        adminDashboard: true,
        hasAdvancedEncryption: true,
      };
    default:
      return {
        maxPasswords: 3,
        maxPersonalInfos: 1,
        canSharePasswords: false,
        hasTeamFeatures: false,
        hasActivityLogs: false,
        hasCustomFields: false,
        hasExport: false,
        hasApiAccess: false,
        hasCustomBranding: false,
        hasPrioritySupport: false,
        adminDashboard: false,
        hasAdvancedEncryption: false,
      };
  }
}

export async function canAddPassword(
  userId: string,
  currentCount: number
): Promise<boolean> {
  const subscription = await getUserSubscription({ uid: userId } as User);
  const features = getSubscriptionFeatures(subscription);
  return currentCount < features.maxPasswords;
}

export async function canAddPersonalInfo(
  userId: string,
  currentCount: number
): Promise<boolean> {
  const subscription = await getUserSubscription({ uid: userId } as User);
  const features = getSubscriptionFeatures(subscription);
  return currentCount < features.maxPersonalInfos;
}

export type BooleanFeatures = Exclude<
  keyof SubscriptionFeatures,
  "maxPasswords" | "maxPersonalInfos"
>;

export async function hasFeature(
  user: User,
  feature: BooleanFeatures
): Promise<boolean> {
  // Always allow access if user is admin
  const isAdmin = await isUserAdmin(user);
  if (isAdmin) return true;

  // Check if account is suspended
  const status = await getSubscriptionStatus(user);
  if (status.isSuspended) return false;

  // Otherwise check subscription features
  const subscription = await getUserSubscription(user);
  const features = getSubscriptionFeatures(subscription);
  return features[feature];
}

export async function getSubscriptionHistory(
  userId?: string
): Promise<IPayment[]> {
  if (!userId) return [];

  try {
    const historyQuery = query(
      collection(db, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const historyDocs = await getDocs(historyQuery);
    return historyDocs.docs.map((doc) => {
      return {
        id: doc.id,
        ...(doc.data() as IPayment),
      };
    });
  } catch (error) {
    console.error("Error fetching subscription history:", error);
    return [];
  }
}
