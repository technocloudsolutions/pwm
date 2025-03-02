import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface SubscriptionWarningsProps {
  subscriptionStatus: {
    isActive: boolean;
    isSuspended: boolean;
    expiresAt: string | null;
    daysUntilExpiration: number | null;
  } | null;
}

export default function SubscriptionWarnings({
  subscriptionStatus,
}: SubscriptionWarningsProps) {
  if (!subscriptionStatus) return null;

  return (
    <>
      {!subscriptionStatus.isActive && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Subscription Expired</h3>
          </div>
          <p className="mt-2 text-sm">
            Your subscription has expired. Please renew to continue using
            premium features.
          </p>
        </Card>
      )}

      {subscriptionStatus.daysUntilExpiration !== null &&
        subscriptionStatus.daysUntilExpiration <= 7 &&
        subscriptionStatus.daysUntilExpiration > 0 && (
          <Card className="p-4 bg-warning/10 border-warning">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">Subscription Expiring Soon</h3>
            </div>
            <p className="mt-2 text-sm">
              Your subscription will expire in{" "}
              {subscriptionStatus.daysUntilExpiration} days. Please renew to
              avoid service interruption.
            </p>
          </Card>
        )}

      {subscriptionStatus.isSuspended && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Account Suspended</h3>
          </div>
          <p className="mt-2 text-sm">
            Your account has been suspended. Please contact support for
            assistance.
          </p>
        </Card>
      )}
    </>
  );
}
