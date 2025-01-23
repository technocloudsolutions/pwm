import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { hasFeature, BooleanFeatures } from './subscription';
import { User } from 'firebase/auth';

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
  teamId?: string;
}

export type LogAction = 
  | 'password_create'
  | 'password_update'
  | 'password_delete'
  | 'password_share'
  | 'team_create'
  | 'team_update'
  | 'team_delete'
  | 'member_add'
  | 'member_remove'
  | 'login'
  | 'logout'
  | 'settings_update';

export const logActivity = async (
  userId: string,
  action: LogAction,
  details: Record<string, any> = {},
  teamId?: string
): Promise<void> => {
  // Only log if user has activity logging feature
  const userObj = { uid: userId } as User;
  const hasLogging = await hasFeature(userObj, 'hasActivityLogs' as BooleanFeatures);
  if (!hasLogging) return;

  const logData = {
    userId,
    action,
    details,
    teamId,
    timestamp: new Date().toISOString()
  };

  await addDoc(collection(db, 'activity_logs'), logData);
};

export const getUserLogs = async (
  userId: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    actions?: LogAction[];
    teamId?: string;
  } = {}
): Promise<ActivityLog[]> => {
  // Check if user has access to logs
  const userObj = { uid: userId } as User;
  const hasLogging = await hasFeature(userObj, 'hasActivityLogs' as BooleanFeatures);
  if (!hasLogging) return [];

  const { limit: resultLimit = 100, startDate, endDate, actions, teamId } = options;

  let baseQuery = query(
    collection(db, 'activity_logs'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(resultLimit)
  );

  // Add date filters if provided
  if (startDate) {
    baseQuery = query(baseQuery, where('timestamp', '>=', startDate.toISOString()));
  }
  if (endDate) {
    baseQuery = query(baseQuery, where('timestamp', '<=', endDate.toISOString()));
  }

  // Add action filter if provided
  if (actions && actions.length > 0) {
    baseQuery = query(baseQuery, where('action', 'in', actions));
  }

  // Add team filter if provided
  if (teamId) {
    baseQuery = query(baseQuery, where('teamId', '==', teamId));
  }

  const logs = await getDocs(baseQuery);
  return logs.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ActivityLog));
};

export const getTeamLogs = async (
  userId: string,
  teamId: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    actions?: LogAction[];
  } = {}
): Promise<ActivityLog[]> => {
  // Check if user has access to logs
  const userObj = { uid: userId } as User;
  const hasLogging = await hasFeature(userObj, 'hasActivityLogs' as BooleanFeatures);
  if (!hasLogging) return [];

  const { limit: resultLimit = 100, startDate, endDate, actions } = options;

  let baseQuery = query(
    collection(db, 'activity_logs'),
    where('teamId', '==', teamId),
    orderBy('timestamp', 'desc'),
    limit(resultLimit)
  );

  // Add date filters if provided
  if (startDate) {
    baseQuery = query(baseQuery, where('timestamp', '>=', startDate.toISOString()));
  }
  if (endDate) {
    baseQuery = query(baseQuery, where('timestamp', '<=', endDate.toISOString()));
  }

  // Add action filter if provided
  if (actions && actions.length > 0) {
    baseQuery = query(baseQuery, where('action', 'in', actions));
  }

  const logs = await getDocs(baseQuery);
  return logs.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ActivityLog));
}; 