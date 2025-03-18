import { auth, db } from "@/lib/firebase";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { AppThunk } from "./store";

interface SubscriptionState {
  currentPlan: string;
  loading: boolean;
  error: string | null;
  subscriptionStatus: {
    isActive: boolean;
    isSuspended: boolean;
    expiresAt: string | null;
    daysUntilExpiration: number | null;
  } | null;
}

const initialState: SubscriptionState = {
  currentPlan: "free",
  loading: false,
  error: null,
  subscriptionStatus: null,
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCurrentPlan: (state, action: PayloadAction<string>) => {
      state.currentPlan = action.payload;
    },
    setSubscriptionStatus: (
      state,
      action: PayloadAction<SubscriptionState["subscriptionStatus"]>
    ) => {
      state.subscriptionStatus = action.payload;
    },
  },
});

export const { setLoading, setError, setCurrentPlan, setSubscriptionStatus } =
  subscriptionSlice.actions;

export const loadSubscription =
  (user: User): AppThunk =>
  async (dispatch) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await updateDoc(doc(db, "users", user.uid), {
          email: user.email,
          subscription: "free",
          createdAt: new Date().toISOString(),
        });
        dispatch(setCurrentPlan("free"));
      } else {
        dispatch(setCurrentPlan(userDoc.data().subscription || "free"));
      }

      // Load subscription status
      const status = await getSubscriptionStatus(user);
      dispatch(setSubscriptionStatus(status));
    } catch (error: any) {
      console.error("Error loading subscription:", error);
      if (error.code === "permission-denied") {
        await auth.signOut(); // Log out the user
      }
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

export default subscriptionSlice.reducer;
