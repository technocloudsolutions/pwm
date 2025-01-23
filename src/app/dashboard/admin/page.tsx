"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUsers, updateUserSubscription, updateUserRole, deleteUser, AdminDashboardData, getAdminDashboardData } from "@/lib/admin";
import { redirect } from "next/navigation";
import { Search, ArrowUpDown, AlertTriangle, Calendar } from "lucide-react";
import { ActivityLogs } from '@/components/admin/ActivityLogs';
import { getSubscriptionStatus } from "@/lib/subscription";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

type SortField = 'email' | 'role' | 'subscription' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface UserData {
  id: string;
  email: string;
  role: 'user' | 'admin';
  subscription: string;
  createdAt?: string;
  subscriptionStatus?: {
    isActive: boolean;
    isSuspended: boolean;
    expiresAt: string | null;
    daysUntilExpiration: number | null;
  };
}

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | "free" | "premium" | "business">("all");
  const [sortField, setSortField] = useState<SortField>("email");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  useEffect(() => {
    if (!user) {
      redirect("/auth/login");
      return;
    }

    if (!isAdmin) {
      redirect("/dashboard");
      return;
    }

    loadData();
  }, [user, isAdmin]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, roleFilter, subscriptionFilter, sortField, sortOrder]);

  const filterAndSortUsers = () => {
    let filtered = [...users] as UserData[];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply subscription filter
    if (subscriptionFilter !== "all") {
      filtered = filtered.filter(user => user.subscription === subscriptionFilter);
    }

    // Filter expiring subscriptions
    if (showExpiringOnly) {
      filtered = filtered.filter(user => {
        const status = user.subscriptionStatus ?? {
          isActive: true,
          isSuspended: false,
          expiresAt: null,
          daysUntilExpiration: null
        };
        return status.daysUntilExpiration !== null && 
          status.daysUntilExpiration <= 7 && 
          status.daysUntilExpiration > 0;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      } else {
        comparison = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Load users first
      const loadedUsers = await getUsers(user);
      
      // Load subscription status for each user
      const usersWithStatus = await Promise.all(
        loadedUsers.map(async (user) => {
          const status = await getSubscriptionStatus({ uid: user.id } as User);
          return { ...user, subscriptionStatus: status };
        })
      );
      
      setUsers(usersWithStatus);

      // Then load dashboard data
      const loadedDashboard = await getAdminDashboardData(user);
      if (!loadedDashboard) {
        throw new Error('Failed to load dashboard data - Access Denied');
      }
      setDashboardData(loadedDashboard);
    } catch (error: any) {
      console.error("Error loading admin data:", error);
      setError(error.message || "Failed to load admin dashboard data");
      toast({
        title: "Error",
        description: error.message || "Failed to load admin dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async (userId: string, subscription: string) => {
    if (!user) return;

    try {
      await updateUserSubscription(user, userId, subscription);
      toast({
        title: "Success",
        description: "User subscription updated successfully",
      });
      loadData();
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user subscription",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (userId: string, role: "user" | "admin") => {
    if (!user) return;

    try {
      await updateUserRole(user, userId, role);
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      loadData();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user || !confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      await deleteUser(user, userId);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      loadData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleToggleSuspension = async (userId: string, isSuspended: boolean) => {
    if (!user) return;

    try {
      const updateData = {
        isSuspended,
        suspendedAt: isSuspended ? new Date().toISOString() : null,
        suspendedBy: isSuspended ? user.uid : null
      };

      await updateDoc(doc(db, 'users', userId), updateData);

      // Log the activity
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: isSuspended ? 'account_suspended' : 'account_unsuspended',
        details: {
          targetUserId: userId,
          updatedBy: user.uid,
          timestamp: new Date().toISOString()
        },
        timestamp: serverTimestamp()
      });

      toast({
        title: "Success",
        description: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`
      });

      await loadData();
    } catch (error) {
      console.error('Error toggling suspension:', error);
      toast({
        title: "Error",
        description: "Failed to update suspension status",
        variant: "destructive"
      });
    }
  };

  const exportData = () => {
    const data = {
      users: users,
      stats: dashboardData,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-dashboard-export-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Helper function to format expiration date
  const formatExpirationDate = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    return date.toLocaleDateString();
  };

  // Helper function to log activity
  const logActivity = async (action: string, details: any) => {
    try {
      await addDoc(collection(db, 'activity_logs'), {
        userId: user?.uid,
        action,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Update user subscription with expiration
  const handleSubscriptionChange = async (userId: string, subscription: string) => {
    try {
      // Calculate expiration date based on subscription type
      let expiresAt = null;
      if (subscription !== 'free') {
        // Set expiration to 30 days from now for premium/business
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      // Update user subscription and expiration
      const updateData = {
        subscription,
        subscriptionExpiresAt: expiresAt ? expiresAt.toISOString() : null,
        isSuspended: false, // Reset suspension when changing subscription
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', userId), updateData);

      // Log the activity
      await addDoc(collection(db, 'activity_logs'), {
        userId: user?.uid,
        action: 'subscription_updated',
        details: {
          updatedUserId: userId,
          subscription,
          expiresAt: expiresAt ? expiresAt.toISOString() : null
        },
        timestamp: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Subscription updated successfully"
      });

      // Reload data to refresh the view
      await loadData();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p>You do not have permission to view the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Error Loading Dashboard</h2>
          <p>{error}</p>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">No Data Available</h2>
          <p>Failed to load dashboard data. Please try again.</p>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={loadData}>Refresh Data</Button>
          <Button onClick={exportData} variant="outline">Export Data</Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">User Stats</h3>
          <div className="space-y-2">
            <p>Total Users: {dashboardData.teamStats.totalMembers}</p>
            <p>Admin Users: {dashboardData.teamStats.totalTeams}</p>
            <p>New Users This Month: {dashboardData.teamStats.teamsCreatedThisMonth}</p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Password Stats</h3>
          <div className="space-y-2">
            <p>Total Passwords: {dashboardData.passwordStats.totalPasswords}</p>
            <p>Shared Passwords: {dashboardData.passwordStats.sharedPasswords}</p>
            <p>Created This Month: {dashboardData.passwordStats.passwordsCreatedThisMonth}</p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Stats</h3>
          <div className="space-y-2">
            <p>Total Activities: {dashboardData.activityStats.totalActivities}</p>
            <p>Activities This Month: {dashboardData.activityStats.activitiesThisMonth}</p>
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Activity Breakdown</h4>
              {Object.entries(dashboardData.activityStats.activityBreakdown).map(([action, count]) => (
                <div key={action} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{action}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription Alerts */}
      {filteredUsers.some(user => 
        user.subscriptionStatus?.daysUntilExpiration !== null && 
        user.subscriptionStatus.daysUntilExpiration <= 7 && 
        user.subscriptionStatus.daysUntilExpiration > 0
      ) && (
        <Card className="p-4 bg-warning/10 border-warning">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Expiring Subscriptions</h3>
          </div>
          <p className="mt-2 text-sm">
            Some users have subscriptions expiring within 7 days. Review the list below.
          </p>
        </Card>
      )}

      {/* User Management */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">User Management</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                className="border rounded px-2 py-1"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <select
                className="border rounded px-2 py-1"
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value as any)}
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="business">Business</option>
              </select>
              <Button
                variant={showExpiringOnly ? "secondary" : "outline"}
                onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                {showExpiringOnly ? "Show All" : "Show Expiring"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-[25%]">Email</th>
                  <th className="text-left p-2 w-[12%]">Role</th>
                  <th className="text-left p-2 w-[12%]">Subscription</th>
                  <th className="text-left p-2 w-[12%]">Status</th>
                  <th className="text-left p-2 w-[14%]">Expires In</th>
                  <th className="text-right p-2 w-[25%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((userData: UserData) => (
                  <tr key={userData.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 truncate">{userData.email}</td>
                    <td className="p-2">{userData.role}</td>
                    <td className="p-2">{userData.subscription}</td>
                    <td className="p-2">
                      <span className={userData.subscriptionStatus?.isSuspended ? "text-red-500" : "text-green-500"}>
                        {userData.subscriptionStatus?.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-2">{formatExpirationDate(userData.subscriptionStatus?.expiresAt)}</td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <select
                          className="bg-background border rounded px-2 py-1 text-sm"
                          value={userData.subscription}
                          onChange={(e) => handleSubscriptionChange(userData.id, e.target.value)}
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="business">Business</option>
                        </select>
                        <select
                          className="bg-background border rounded px-2 py-1 text-sm"
                          value={userData.role}
                          onChange={(e) => handleUpdateRole(userData.id, e.target.value as "user" | "admin")}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          variant={userData.subscriptionStatus?.isSuspended ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleSuspension(userData.id, !userData.subscriptionStatus?.isSuspended)}
                        >
                          {userData.subscriptionStatus?.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(userData.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      {dashboardData && <ActivityLogs activities={dashboardData.recentActivity} />}
    </div>
  );
} 