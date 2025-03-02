import { configureStore } from "@reduxjs/toolkit";
import brandingReducer from "./brandingSlice"; // Import your reducers

export const store = configureStore({
  reducer: {
    branding: brandingReducer, // Add your slice reducers here
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;