import { SubscriptionTier } from "@/lib/subscription";

export interface IPayment {
  id?: string;
  amount: number;
  createdAt: string;
  plan: SubscriptionTier;
  status: "succeeded" | "pending" | "failed";
  userId: string;
  currency: string;
}
