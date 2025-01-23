import { db } from './firebase';
import { doc, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { hasFeature, BooleanFeatures } from './subscription';
import { User } from 'firebase/auth';
import { logActivity } from './activity-logs';

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'member';
  addedAt: string;
  addedBy: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members: TeamMember[];
}

export const createTeam = async (userId: string, teamName: string): Promise<Team | null> => {
  // Check if user has business plan
  const userObj = { uid: userId } as User;
  const canCreateTeam = await hasFeature(userObj, 'hasTeamFeatures' as BooleanFeatures);
  if (!canCreateTeam) {
    throw new Error('Business plan required to create teams');
  }

  const teamData = {
    name: teamName,
    ownerId: userId,
    createdAt: new Date().toISOString(),
    members: [{
      id: userId,
      email: (await getDoc(doc(db, 'users', userId))).data()?.email,
      role: 'admin' as const,
      addedAt: new Date().toISOString(),
      addedBy: userId
    }]
  };

  const teamRef = await addDoc(collection(db, 'teams'), teamData);
  return { id: teamRef.id, ...teamData };
};

export const addTeamMember = async (
  userId: string,
  teamId: string,
  memberEmail: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) throw new Error('Team not found');

  const team = teamDoc.data() as Team;
  if (team.ownerId !== userId && !team.members.find(m => m.id === userId && m.role === 'admin')) {
    throw new Error('Only team admins can add members');
  }

  // Check if email already exists in team
  if (team.members.find(m => m.email === memberEmail)) {
    throw new Error('Member already exists in team');
  }

  // Get user by email
  const userQuery = query(collection(db, 'users'), where('email', '==', memberEmail));
  const userDocs = await getDocs(userQuery);
  if (userDocs.empty) throw new Error('User not found');

  const newMember = {
    id: userDocs.docs[0].id,
    email: memberEmail,
    role,
    addedAt: new Date().toISOString(),
    addedBy: userId
  };

  await updateDoc(doc(db, 'teams', teamId), {
    members: [...team.members, newMember]
  });
};

export const removeTeamMember = async (
  userId: string,
  teamId: string,
  memberId: string
): Promise<void> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) throw new Error('Team not found');

  const team = teamDoc.data() as Team;
  if (team.ownerId !== userId && !team.members.find(m => m.id === userId && m.role === 'admin')) {
    throw new Error('Only team admins can remove members');
  }

  if (team.ownerId === memberId) {
    throw new Error('Cannot remove team owner');
  }

  await updateDoc(doc(db, 'teams', teamId), {
    members: team.members.filter(m => m.id !== memberId)
  });
};

export const deleteTeam = async (userId: string, teamId: string): Promise<void> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) throw new Error('Team not found');

  const team = teamDoc.data() as Team;
  if (team.ownerId !== userId) {
    throw new Error('Only team owner can delete team');
  }

  await deleteDoc(doc(db, 'teams', teamId));
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const teamsQuery = query(
    collection(db, 'teams'),
    where('members', 'array-contains', { id: userId })
  );
  
  const teamDocs = await getDocs(teamsQuery);
  return teamDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
};

export const getTeamMembers = async (userId: string, teamId: string): Promise<TeamMember[]> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) throw new Error('Team not found');

  const team = teamDoc.data() as Team;
  if (!team.members.find(m => m.id === userId)) {
    throw new Error('Not a team member');
  }

  return team.members;
}; 