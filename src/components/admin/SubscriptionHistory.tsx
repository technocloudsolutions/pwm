import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { IPayment } from "@/app/models/payments";
import { getSubscriptionHistory } from "@/lib/subscription";
import { useAuth } from "@/lib/auth-context";

const SubscriptionHistory = () => {
  const { user } = useAuth();
  const [subscriptionHistory, setSubscriptionHistory] = useState<IPayment[]>(
    []
  );

  useEffect(() => {
    const fetchSubscriptionHistory = async () => {
      if (user) {
        setSubscriptionHistory(await getSubscriptionHistory(user?.uid));
      }
    };

    fetchSubscriptionHistory();
  }, [user]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Subscription History</h2>
        </div>
      </div>

      <div className="py-4">
        {subscriptionHistory.length > 0 ? (
          subscriptionHistory.map((history) => (
            <div
              key={history.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-medium`}>
                    {new Date(history.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {history.plan.toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Price: {history.amount}
                  </p>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  {/* <Calendar className="h-4 w-4 mr-1" />
                    {formatTimestamp(activity.timestamp)} */}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No subscription history found.
          </div>
        )}
      </div>
    </Card>
  );
};

export default SubscriptionHistory;
