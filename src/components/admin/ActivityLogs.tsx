import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivityLog } from '@/lib/activity-logs';
import { Calendar } from "lucide-react";

interface ActivityLogsProps {
  activities: ActivityLog[];
}

export function ActivityLogs({ activities }: ActivityLogsProps) {
  const [dateFilter, setDateFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const uniqueActions = Array.from(new Set(activities.map(a => a.action)));

  const filteredActivities = activities.filter(activity => {
    const matchesDate = !dateFilter || activity.timestamp.startsWith(dateFilter);
    const matchesAction = actionFilter === "all" || activity.action === actionFilter;
    const matchesSearch = !searchTerm || 
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.details && JSON.stringify(activity.details).toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesDate && matchesAction && matchesSearch;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'password_create':
      case 'team_create':
        return 'text-green-600 dark:text-green-400';
      case 'password_delete':
      case 'team_delete':
        return 'text-red-600 dark:text-red-400';
      case 'password_update':
      case 'team_update':
        return 'text-blue-600 dark:text-blue-400';
      case 'password_share':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />
            <select
              className="border rounded px-2 py-1"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-60"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-medium ${getActionColor(activity.action)}`}>
                      {activity.action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
            ))
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