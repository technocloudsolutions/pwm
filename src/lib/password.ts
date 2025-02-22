import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { IPassword } from "@/app/models/password";

export async function loadPasswords(userId?: string): Promise<IPassword[]> {
  if (!userId) return [];

  try {
    const q = query(collection(db, "passwords"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const loadedPasswords: IPassword[] = [];
    querySnapshot.forEach((doc) => {
      loadedPasswords.push({ id: doc.id, ...doc.data() } as IPassword);
    });
    return loadedPasswords;
  } catch (error: any) {
    return [];
  }
}
