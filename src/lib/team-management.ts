import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { getUserSubscription } from './subscription';
import { logActivity } from './activity-logs';

export interface TeamMember {
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: { [userId: string]: TeamMember };
  createdAt: string;
  updatedAt: string;
}

export interface SharedPassword {
  id: string;
  teamId: string;
  passwordId: string;
  sharedBy: string;
  sharedAt: string;
  permissions: 'read' | 'write';
}

export async function createTeam(user: User, teamName: string): Promise<string> {
  if (!user) throw new Error('User not authenticated');

  const subscription = await getUserSubscription(user);
  if (subscription !== 'business') {
    throw new Error('Team creation requires a Business subscription');
  }

  const teamId = `team_${Date.now()}`;
  const teamRef = doc(db, 'teams', teamId);

  const team: Omit<Team, 'id'> = {
    name: teamName,
    ownerId: user.uid,
    members: {
      [user.uid]: {
        email: user.email!,
        role: 'owner',
        joinedAt: new Date().toISOString()
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(teamRef, team);
  return teamId;
}

export async function getUserTeams(user: User): Promise<Team[]> {
  if (!user) return [];

  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where(`members.${user.uid}`, '!=', null));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

export async function addTeamMember(user: User, teamId: string, memberEmail: string, role: 'admin' | 'member' = 'member') {
  if (!user) throw new Error('User not authenticated');

  // Check user's subscription
  const subscription = await getUserSubscription(user);
  if (subscription !== 'business') {
    throw new Error('Team management requires a Business subscription');
  }

  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);

  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }

  const team = teamDoc.data() as Team;
  
  // Check if user has permission to add members
  const userRole = team.members[user.uid]?.role;
  if (team.ownerId !== user.uid && userRole !== 'admin') {
    throw new Error('Unauthorized to add team members');
  }

  // Check if user exists
  const usersRef = collection(db, 'users');
  const userQuery = query(usersRef, where('email', '==', memberEmail));
  const userSnapshot = await getDocs(userQuery);

  if (userSnapshot.empty) {
    throw new Error('User not found');
  }

  const newMember = userSnapshot.docs[0];
  const newMemberId = newMember.id;

  // Check if user is already a member
  if (team.members[newMemberId]) {
    throw new Error('User is already a team member');
  }

  // Add new member
  const updatedMembers = {
    ...team.members,
    [newMemberId]: {
      email: memberEmail,
      role,
      joinedAt: new Date().toISOString()
    }
  };

  await updateDoc(teamRef, {
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  });

  // Log activity
  await addDoc(collection(db, 'activity_logs'), {
    userId: user.uid,
    action: 'member_add',
    details: {
      teamId,
      teamName: team.name,
      addedMemberId: newMemberId,
      addedMemberEmail: memberEmail,
      addedByUserId: user.uid,
      role
    },
    timestamp: serverTimestamp()
  });
}

export async function sharePasswordWithTeam(
  user: User,
  teamId: string,
  passwordId: string,
  permissions: 'read' | 'write' = 'read'
): Promise<string> {
  if (!user) throw new Error('User not authenticated');

  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);

  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }

  const team = teamDoc.data() as Team;
  if (!team.members[user.uid]) {
    throw new Error('Not a member of this team');
  }

  const shareId = `share_${Date.now()}`;
  const shareRef = doc(db, 'shared_passwords', shareId);

  const sharedPassword: SharedPassword = {
    id: shareId,
    teamId,
    passwordId,
    sharedBy: user.uid,
    sharedAt: new Date().toISOString(),
    permissions
  };

  await setDoc(shareRef, sharedPassword);
  return shareId;
}

export async function getTeamSharedPasswords(user: User, teamId: string): Promise<SharedPassword[]> {
  if (!user) return [];

  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);

  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }

  const team = teamDoc.data() as Team;
  if (!team.members[user.uid]) {
    throw new Error('Not a member of this team');
  }

  const sharesRef = collection(db, 'shared_passwords');
  const q = query(sharesRef, where('teamId', '==', teamId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SharedPassword));
}

export async function removeTeamMember(user: User, teamId: string, memberId: string) {
  if (!user) throw new Error('User not authenticated');

  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);

  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }

  const team = teamDoc.data() as Team;
  if (team.ownerId !== user.uid && team.members[user.uid]?.role !== 'admin') {
    throw new Error('Unauthorized to remove team members');
  }

  if (team.ownerId === memberId) {
    throw new Error('Cannot remove team owner');
  }

  const { [memberId]: removedMember, ...remainingMembers } = team.members;

  await updateDoc(teamRef, {
    members: remainingMembers,
    updatedAt: new Date().toISOString()
  });
} 