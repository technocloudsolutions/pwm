"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Show success message
    toast({
      title: "Payment Successful",
      description: "Your subscription has been updated successfully.",
    });

    // Redirect back to subscription page after 3 seconds
    setTimeout(() => {
      router.push("/dashboard/subscription");
    }, 3000);
  }, [router, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-3xl font-bold text-green-600">Payment Successful!</h1>
      <p className="text-muted-foreground">
        Your subscription has been updated successfully.
      </p>
      <p className="text-sm text-muted-foreground">
        Redirecting you back to subscription page...
      </p>
    </div>
  );
} 