import { Action, configureStore, ThunkAction } from "@reduxjs/toolkit";
import brandingReducer from "./brandingSlice";
import subscriptionReducer from "./subscriptionSlice";

export const store = configureStore({
  reducer: {
    branding: brandingReducer,
    subscription: subscriptionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
