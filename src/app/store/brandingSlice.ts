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
  loading: true,
};

const brandingSlice = createSlice({
  name: "branding",
  initialState,
  reducers: {
    setBranding: (state, action: PayloadAction<Partial<BrandingState>>) => {
      const logo = action.payload.logo ? action.payload.logo : "/logo.svg";
      return { ...state, ...action.payload, logo, loading: false };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setBranding, setLoading } = brandingSlice.actions;
export default brandingSlice.reducer;
