import { auth } from "@/lib/firebase"; // Import auth for logging out
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BrandingState {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string;
  companyName: string;
  customDomain: string;
  loading: boolean;
}

const initialState: BrandingState = {
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  accentColor: "#0070f3",
  logo: "/logo.svg",
  companyName: "BIGTIFY PASS",
  customDomain: "",
  loading: false,
};

const updateColors = (state: BrandingState) => {
  document.documentElement.style.setProperty(
    "--primary-color",
    state.primaryColor
  );
  document.documentElement.style.setProperty(
    "--secondary-color",
    state.secondaryColor
  );
  document.documentElement.style.setProperty(
    "--accent-color",
    state.accentColor
  );
};

const brandingSlice = createSlice({
  name: "branding",
  initialState,
  reducers: {
    setBranding: (state, action: PayloadAction<Partial<BrandingState>>) => {
      try {
        const logo = action.payload.logo ? action.payload.logo : "/logo.svg";
        const newState = { ...state, ...action.payload, logo, loading: false };
        updateColors(newState);
        return newState;
      } catch (error: any) {
        console.error("Error setting branding:", error);
        if (error.code === "permission-denied") {
          auth.signOut(); // Log out the user
        }
        throw error;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setBranding, setLoading } = brandingSlice.actions;
export default brandingSlice.reducer;
