import { IPayment } from "@/app/models/payments";
import { useAuth } from "@/lib/auth-context";
import { getSubscriptionHistory } from "@/lib/subscription";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const ITEMS_PER_PAGE = 5;

const SubscriptionHistory = () => {
  const { user } = useAuth();
  const [subscriptionHistory, setSubscriptionHistory] = useState<IPayment[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptionHistory = async () => {
      if (user) {
        setLoading(true);
        const history = await getSubscriptionHistory(user?.uid);
        setSubscriptionHistory(history);
        setLoading(false);
      }
    };

    fetchSubscriptionHistory();
  }, [user]);

  // Calculate pagination values
  const totalPages = Math.ceil(subscriptionHistory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = subscriptionHistory.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Subscription History</h2>
        </div>
      </div>

      <div className="py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : currentItems.length > 0 ? (
          <>
            {currentItems.map((history) => (
              <div
                key={history.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors mb-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {formatDate(history.createdAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {history.plan.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Price: {history.amount} {history.currency}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        history.status === "succeeded"
                          ? "bg-green-100 text-green-800"
                          : history.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {history.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, subscriptionHistory.length)} of{" "}
                  {subscriptionHistory.length} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
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
