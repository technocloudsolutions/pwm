"use client";

import { AppDispatch, RootState } from "@/app/store/store";
import {
  loadSubscription,
  setCurrentPlan,
  setLoading,
} from "@/app/store/subscriptionSlice";
import PayHereButton from "@/components/PayHereButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SubscriptionWarnings from "../../../components/SubscriptionWarnings";

interface Plan {
  name: string;
  price: string;
  features: string[];
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0/month",
    features: [
      "Store up to 3 passwords",
      "Store 1 personal info entry",
      "Basic encryption",
      "Access from one device",
    ],
  },
  {
    name: "Premium",
    price: "$4.99/month",
    features: [
      "Unlimited passwords",
      "Store up to 50 personal info entries",
      "Advanced encryption",
      "Access from multiple devices",
      "Secure password sharing",
      "Priority support",
    ],
  },
  {
    name: "Business",
    price: "$9.99/month",
    features: [
      "Everything in Premium",
      "Unlimited personal info entries",
      "Team password sharing",
      "Admin dashboard",
      "Activity logs",
      "24/7 support",
      "Custom branding",
    ],
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const { currentPlan, loading, subscriptionStatus } = useSelector(
    (state: RootState) => state.subscription
  );
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      dispatch(loadSubscription(user));
    }
  }, [user, dispatch]);

  const handleUpgrade = async (planName: string) => {
    if (!user) return;

    try {
      if (planName.toLowerCase() === "free") {
        setLoading(true);
        await updateDoc(doc(db, "users", user.uid), {
          subscription: planName.toLowerCase(),
          updatedAt: new Date().toISOString(),
        });

        setCurrentPlan(planName.toLowerCase());
        toast({
          title: "Success",
          description: `Successfully switched to ${planName} plan`,
        });
        setLoading(false);
        return;
      }

      // For paid plans, show the payment button
      setSelectedPlan(planName);
      setShowPayment(true);
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({
        title: "Error",
        description: "Failed to process upgrade. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getAmount = (planName: string) => {
    // Convert USD to LKR (approximate conversion rate)
    const usdAmount =
      planName.toLowerCase() === "premium"
        ? 4.99
        : planName.toLowerCase() === "business"
        ? 9.99
        : 0;
    // Convert to LKR and ensure it's a whole number (PayHere doesn't accept decimals)
    const lkrAmount = Math.ceil(usdAmount * 325); // Round up to nearest rupee
    return lkrAmount.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SubscriptionWarnings subscriptionStatus={subscriptionStatus} />
      <div className="text-center">
        <h2 className="text-3xl font-bold">Subscription Plans</h2>
        <p className="text-muted-foreground mt-2">
          Choose the perfect plan for your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative overflow-hidden ${
              currentPlan === plan.name.toLowerCase()
                ? "border-primary ring-2 ring-primary"
                : ""
            }`}
          >
            {currentPlan === plan.name.toLowerCase() && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm">
                Current Plan
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-primary">
                    {plan.price}
                  </p>
                  {plan.name !== "Free" && (
                    <p className="text-sm text-muted-foreground">
                      Rs. {getAmount(plan.name)} LKR/month
                    </p>
                  )}
                </div>
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 space-y-2">
                {showPayment && selectedPlan === plan.name ? (
                  <>
                    <PayHereButton
                      plan={plan.name}
                      amount={parseInt(getAmount(plan.name))}
                      onSuccess={() => {
                        toast({
                          title: "Success",
                          description: "Payment processed successfully",
                        });
                        setShowPayment(false);
                        if (user) {
                          dispatch(loadSubscription(user));
                        }
                      }}
                      onError={(error) => {
                        toast({
                          title: "Error",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowPayment(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    variant={
                      currentPlan === plan.name.toLowerCase()
                        ? "outline"
                        : "default"
                    }
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={currentPlan === plan.name.toLowerCase()}
                  >
                    {currentPlan === plan.name.toLowerCase()
                      ? "Current Plan"
                      : "Upgrade"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
