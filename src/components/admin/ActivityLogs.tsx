import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActivityLog } from "@/lib/activity-logs";
import { Calendar } from "lucide-react";
import { useState } from "react";

const ITEMS_PER_PAGE = 5;

interface ActivityLogsProps {
  activities: ActivityLog[];
}

export function ActivityLogs({ activities }: ActivityLogsProps) {
  const [dateFilter, setDateFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const uniqueActions = Array.from(new Set(activities.map((a) => a.action)));

  const filteredActivities = activities.filter((activity) => {
    const matchesDate =
      !dateFilter || activity.timestamp.startsWith(dateFilter);
    const matchesAction =
      actionFilter === "all" || activity.action === actionFilter;
    const matchesSearch =
      !searchTerm ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.details &&
        JSON.stringify(activity.details)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    return matchesDate && matchesAction && matchesSearch;
  });

  // Calculate pagination values
  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredActivities.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "password_create":
      case "team_create":
        return "text-green-600 dark:text-green-400";
      case "password_delete":
      case "team_delete":
        return "text-red-600 dark:text-red-400";
      case "password_update":
      case "team_update":
        return "text-blue-600 dark:text-blue-400";
      case "password_share":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const { start, end } = getCurrentMonthRange();

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="w-40"
              min={start}
              max={end}
            />
            <select
              className="border rounded px-2 py-1"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </option>
              ))}
            </select>
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when search changes
              }}
              className="w-60"
            />
          </div>
        </div>

        <div className="space-y-4">
          {currentItems.length > 0 ? (
            <>
              {currentItems.map((activity) => (
                <div
                  key={activity.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className={`font-medium ${getActionColor(
                          activity.action
                        )}`}
                      >
                        {activity.action
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </p>
                      {activity.details && (
                        <pre className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredActivities.length)} of{" "}
                    {filteredActivities.length} entries
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
              No activities found matching the current filters.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
