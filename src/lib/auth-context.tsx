"use client";

import {
  User,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(true);

      if (user) {
        // Subscribe to user document changes
        const userRef = doc(db, "users", user.uid);
        const unsubscribeDoc = onSnapshot(
          userRef,
          (doc) => {
            if (doc.exists()) {
              const userData = doc.data();
              console.log("User data updated:", userData);
              setIsAdmin(userData.role === "admin");
              setIsSuperAdmin(userData.role === "superAdmin");
            } else {
              console.log("User document does not exist");
              setIsAdmin(false);
              setIsSuperAdmin(false);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error listening to user document:", error);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setLoading(false);
          }
        );

        return () => {
          unsubscribeDoc();
        };
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, isSuperAdmin, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
