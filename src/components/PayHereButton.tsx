import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

interface PayHereButtonProps {
  plan: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PayHereButton({
  plan,
  amount,
  onSuccess,
  onError,
}: PayHereButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to upgrade your subscription",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Create order ID using user ID and timestamp for uniqueness
      const orderId = `ORDER_${user.uid}_${Date.now()}`;

      // Get payment data from our API
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          plan,
          amount,
          firstName: user.displayName?.split(" ")[0] || "User",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "Name",
          email: user.email,
          origin: window.location.origin,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to prepare payment");
      }

      const formData = await response.json();

      // Log the form data for debugging
      console.log("Payment form data:", formData);

      // Create and submit form to PayHere
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://www.payhere.lk/pay/checkout";
      form.style.display = "none"; // Hide the form

      // Add all form fields in the correct order
      const requiredFields = [
        "merchant_id",
        "return_url",
        "cancel_url",
        "notify_url",
        "order_id",
        "items",
        "currency",
        "amount",
        "first_name",
        "last_name",
        "email",
        "phone",
        "address",
        "city",
        "country",
        "business_category",
        "platform",
        "custom_1",
        "custom_2",
        "hash",
      ];

      requiredFields.forEach((fieldName) => {
        if (formData[fieldName] !== undefined && formData[fieldName] !== null) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = fieldName;
          input.value = formData[fieldName].toString();
          form.appendChild(input);
          // Log each field for debugging
          console.log(
            `Form field - ${fieldName}:`,
            formData[fieldName].toString()
          );
        }
      });

      document.body.appendChild(form);
      form.submit();

      onSuccess?.();
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Payment failed";
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handlePayment} disabled={isLoading} className="w-full">
      {isLoading ? "Processing..." : "Pay Now"}
    </Button>
  );
}
