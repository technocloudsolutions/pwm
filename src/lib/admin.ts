import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { hasFeature } from './subscription';
import { Team, TeamMember } from './team';
import { ActivityLog } from './activity-logs';

export interface AdminDashboardData {
  teamStats: {
    totalTeams: number;
    totalMembers: number;
    teamsCreatedThisMonth: number;
  };
  passwordStats: {
    totalPasswords: number;
    sharedPasswords: number;
    passwordsCreatedThisMonth: number;
  };
  activityStats: {
    totalActivities: number;
    activitiesThisMonth: number;
    activityBreakdown: Record<string, number>;
  };
  subscriptionStats: {
    activeSubscriptions: number;
    expiringSubscriptions: number;
    suspendedAccounts: number;
  };
  recentActivity: ActivityLog[];
}

export interface UserData {
  id: string;
  email: string;
  role: 'user' | 'admin';
  subscription: string;
  createdAt?: string;
  subscriptionExpiresAt?: string;
  isSuspended?: boolean;
  suspendedAt?: string;
  suspendedBy?: string;
}

interface ActivityLogData extends ActivityLog {
  id: string;
  timestamp: string;
}

// Get all users
export const getUsers = async (admin: User): Promise<UserData[]> => {
  const hasAccess = await hasFeature(admin, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  const usersQuery = query(collection(db, 'users'));
  const userDocs = await getDocs(usersQuery);
  
  return userDocs.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as UserData));
};

// Get a single user
export const getUser = async (admin: User, userId: string): Promise<UserData> => {
  const hasAccess = await hasFeature(admin, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  return {
    id: userDoc.id,
    ...userDoc.data()
  } as UserData;
};

// Update user subscription with expiration
export const updateUserSubscription = async (
  admin: User,
  userId: string,
  subscription: string,
  expiresAt?: string
): Promise<void> => {
  const hasAccess = await hasFeature(admin, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  const updateData: any = {
    subscription,
    subscriptionUpdatedAt: new Date().toISOString()
  };

  // Set expiration date for paid plans
  if (subscription !== 'free') {
    // Default to 30 days if not specified
    const expiration = expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    updateData.subscriptionExpiresAt = expiration;
  } else {
    // Remove expiration for free plan
    updateData.subscriptionExpiresAt = null;
  }

  await updateDoc(doc(db, 'users', userId), updateData);

  // Log the subscription update
  await addDoc(collection(db, 'activity_logs'), {
    userId,
    action: 'subscription_updated',
    details: {
      updatedBy: admin.uid,
      newSubscription: subscription,
      expiresAt: updateData.subscriptionExpiresAt
    },
    timestamp: new Date().toISOString()
  });
};

// Update user role
export const updateUserRole = async (
  admin: User,
  userId: string,
  role: 'user' | 'admin'
): Promise<void> => {
  const hasAccess = await hasFeature(admin, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  await updateDoc(doc(db, 'users', userId), {
    role
  });
};

// Toggle user account suspension
export const toggleUserSuspension = async (
  admin: User,
  userId: string,
  suspend: boolean
): Promise<void> => {
  const hasAccess = await hasFeature(admin, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  const updateData: any = {
    isSuspended: suspend
  };

  if (suspend) {
    updateData.suspendedAt = new Date().toISOString();
    updateData.suspendedBy = admin.uid;
  } else {
    updateData.suspendedAt = null;
    updateData.suspendedBy = null;
  }

  await updateDoc(doc(db, 'users', userId), updateData);

  // Log the suspension action
  await addDoc(collection(db, 'activity_logs'), {
    userId,
    action: suspend ? 'account_suspended' : 'account_unsuspended',
    details: {
      updatedBy: admin.uid
    },
    timestamp: new Date().toISOString()
  });
};

// Delete user
export const deleteUser = async (admin: User, userId: string): Promise<void> => {
  const hasAccess = await hasFeature(admin, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  // Delete user's data
  const batch = writeBatch(db);
  
  // Delete passwords
  const passwordsQuery = query(collection(db, 'passwords'), where('userId', '==', userId));
  const passwordDocs = await getDocs(passwordsQuery);
  passwordDocs.docs.forEach(doc => batch.delete(doc.ref));

  // Delete personal info
  const personalInfoQuery = query(collection(db, 'personal_info'), where('userId', '==', userId));
  const personalInfoDocs = await getDocs(personalInfoQuery);
  personalInfoDocs.docs.forEach(doc => batch.delete(doc.ref));

  // Delete user document
  batch.delete(doc(db, 'users', userId));

  await batch.commit();
};

// Get admin dashboard data with subscription stats
export const getAdminDashboardData = async (user: User): Promise<AdminDashboardData | null> => {
  // Check if user has admin dashboard access
  const hasAccess = await hasFeature(user, 'adminDashboard');
  if (!hasAccess) {
    return null;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    // Get all users
    const usersQuery = query(collection(db, 'users'));
    const userDocs = await getDocs(usersQuery);
    const users = userDocs.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as UserData));

    // Get all passwords
    const passwordsQuery = query(collection(db, 'passwords'));
    const passwordDocs = await getDocs(passwordsQuery);
    const passwords = passwordDocs.docs;

    // Get activity logs
    const activityQuery = query(
      collection(db, 'activity_logs'),
      where('timestamp', '>=', startOfMonth)
    );
    const activityDocs = await getDocs(activityQuery);
    const activities = activityDocs.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        action: data.action,
        details: data.details || {},
        timestamp: data.timestamp || new Date().toISOString()
      } as ActivityLogData;
    });

    // Calculate activity breakdown
    const activityBreakdown = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count shared passwords
    const sharedPasswordsQuery = query(collection(db, 'shared_passwords'));
    const sharedPasswordsDocs = await getDocs(sharedPasswordsQuery);

    // Calculate subscription stats
    const activeSubscriptions = users.filter(u => {
      if (u.subscription === 'free') return !u.isSuspended;
      return !u.isSuspended && u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > now;
    });

    const expiringSubscriptions = users.filter(u => {
      if (u.subscription === 'free') return false;
      if (!u.subscriptionExpiresAt) return false;
      const daysUntilExpiration = Math.ceil((new Date(u.subscriptionExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
    });

    const suspendedAccounts = users.filter(u => u.isSuspended);

    // Calculate stats
    const adminUsers = users.filter(u => u.role === 'admin');
    const newUsers = users.filter(u => u.createdAt && u.createdAt >= startOfMonth);
    const newPasswords = passwords.filter(doc => {
      const data = doc.data();
      return data.createdAt && data.createdAt >= startOfMonth;
    });

    return {
      teamStats: {
        totalTeams: adminUsers.length,
        totalMembers: users.length,
        teamsCreatedThisMonth: newUsers.length
      },
      passwordStats: {
        totalPasswords: passwords.length,
        sharedPasswords: sharedPasswordsDocs.size,
        passwordsCreatedThisMonth: newPasswords.length
      },
      activityStats: {
        totalActivities: activityDocs.size,
        activitiesThisMonth: activities.length,
        activityBreakdown
      },
      subscriptionStats: {
        activeSubscriptions: activeSubscriptions.length,
        expiringSubscriptions: expiringSubscriptions.length,
        suspendedAccounts: suspendedAccounts.length
      },
      recentActivity: activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
    };
  } catch (error) {
    console.error('Error getting admin dashboard data:', error);
    throw error;
  }
};

export const getTeamMembers = async (user: User, teamId: string): Promise<TeamMember[]> => {
  // Check if user has admin access
  const hasAccess = await hasFeature(user, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }

  const team = teamDoc.data() as Team;
  if (!team.members.find(m => m.id === user.uid && m.role === 'admin')) {
    throw new Error('Admin access required');
  }

  return team.members;
};

export const getTeamPasswords = async (user: User, teamId: string) => {
  // Check if user has admin access
  const hasAccess = await hasFeature(user, 'adminDashboard');
  if (!hasAccess) {
    throw new Error('Admin access required');
  }

  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }

  const team = teamDoc.data() as Team;
  if (!team.members.find(m => m.id === user.uid && m.role === 'admin')) {
    throw new Error('Admin access required');
  }

  const passwordsQuery = query(
    collection(db, 'passwords'),
    where('teamId', '==', teamId)
  );
  const passwordDocs = await getDocs(passwordsQuery);

  return passwordDocs.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}; 